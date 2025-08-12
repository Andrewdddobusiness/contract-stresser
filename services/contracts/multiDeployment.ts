import { Address, PublicClient, WalletClient, parseEther } from 'viem'
import { createPublicClientForChain, createWalletClientForChain } from '@/services/blockchain/clients'
import { SupportedChainId } from '@/lib/wagmi'
import { toast } from 'react-hot-toast'

export interface DeploymentPlan {
  id: string
  name: string
  description: string
  contracts: ContractConfig[]
  dependencies: DependencyMap
  parameters: DeploymentParameters
  status: 'draft' | 'validating' | 'deploying' | 'completed' | 'failed' | 'rolled_back'
  createdAt: Date
  updatedAt: Date
}

export interface ContractConfig {
  id: string
  type: ContractType
  name: string
  constructorArgs: ConstructorArg[]
  dependencies: string[] // IDs of contracts this depends on
  postDeployActions: PostDeployAction[]
  metadata: ContractMetadata
}

export type ContractType = 'ERC20' | 'ERC1155' | 'Settlement' | 'AccessControl' | 'Registry'

export interface ConstructorArg {
  name: string
  type: 'address' | 'uint256' | 'string' | 'bool' | 'bytes32'
  value: any
  isDependency?: boolean // If true, value will be resolved from deployed contract
  dependsOn?: string // Contract ID to get address from
}

export interface PostDeployAction {
  type: 'function_call' | 'permission_grant' | 'token_mint'
  target: string // Contract ID or address
  function: string
  args: any[]
  description: string
}

export interface DependencyMap {
  [contractId: string]: string[] // Contract ID -> list of dependency IDs
}

export interface DeploymentParameters {
  chainId: SupportedChainId
  gasPrice?: bigint
  gasLimit?: bigint
  confirmations: number
  timeoutMs: number
}

export interface ContractMetadata {
  description: string
  version: string
  tags: string[]
  bytecode?: string
  abi?: any[]
}

export interface DeploymentResult {
  planId: string
  status: 'success' | 'partial' | 'failed'
  deployedContracts: DeployedContract[]
  failedContracts: FailedDeployment[]
  gasUsed: bigint
  totalCost: bigint
  duration: number
  error?: string
}

export interface DeployedContract {
  id: string
  name: string
  type: ContractType
  address: Address
  transactionHash: string
  blockNumber: bigint
  gasUsed: bigint
  deployedAt: Date
}

export interface FailedDeployment {
  id: string
  name: string
  error: string
  gasUsed?: bigint
  attemptedAt: Date
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  contractId: string
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  contractId: string
  message: string
  suggestion?: string
}

export interface RollbackResult {
  deploymentId: string
  status: 'success' | 'partial' | 'failed'
  rollbackActions: RollbackAction[]
  errors: RollbackError[]
  totalGasUsed: bigint
  duration: number
}

export interface RollbackAction {
  contractId: string
  contractName: string
  contractAddress: Address
  actions: string[]
  gasUsed: bigint
  timestamp: Date
  transactionHashes: string[]
}

export interface RollbackError {
  contractId: string
  contractName: string
  error: string
  timestamp: Date
}

class MultiContractDeploymentService {
  private deploymentPlans: Map<string, DeploymentPlan> = new Map()
  private activeDeployments: Map<string, Promise<DeploymentResult>> = new Map()
  private clients: Map<SupportedChainId, { public: PublicClient; wallet: WalletClient }> = new Map()

  constructor() {
    this.loadPersistedPlans()
  }

  private loadPersistedPlans() {
    try {
      const saved = localStorage.getItem('deployment-plans')
      if (saved) {
        const plans = JSON.parse(saved)
        Object.values(plans).forEach((plan: any) => {
          this.deploymentPlans.set(plan.id, {
            ...plan,
            createdAt: new Date(plan.createdAt),
            updatedAt: new Date(plan.updatedAt)
          })
        })
      }
    } catch (error) {
      console.warn('Failed to load deployment plans:', error)
    }
  }

  private savePersistedPlans() {
    try {
      const plans: Record<string, any> = {}
      this.deploymentPlans.forEach((plan, id) => {
        plans[id] = plan
      })
      localStorage.setItem('deployment-plans', JSON.stringify(plans))
    } catch (error) {
      console.warn('Failed to save deployment plans:', error)
    }
  }

  async createDeploymentPlan(config: Omit<DeploymentPlan, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<DeploymentPlan> {
    const plan: DeploymentPlan = {
      ...config,
      id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Build dependency map
    plan.dependencies = this.buildDependencyMap(plan.contracts)

    this.deploymentPlans.set(plan.id, plan)
    this.savePersistedPlans()

    return plan
  }

  private buildDependencyMap(contracts: ContractConfig[]): DependencyMap {
    const dependencyMap: DependencyMap = {}
    
    contracts.forEach(contract => {
      dependencyMap[contract.id] = contract.dependencies || []
    })

    return dependencyMap
  }

  async validateDeploymentPlan(planId: string): Promise<ValidationResult> {
    const plan = this.deploymentPlans.get(planId)
    if (!plan) {
      return {
        isValid: false,
        errors: [{ contractId: '', field: 'plan', message: 'Deployment plan not found', severity: 'error' }],
        warnings: []
      }
    }

    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate dependency cycles
    const cycleCheck = this.detectDependencyCycles(plan.dependencies)
    if (cycleCheck.length > 0) {
      errors.push({
        contractId: '',
        field: 'dependencies',
        message: `Circular dependencies detected: ${cycleCheck.join(' -> ')}`,
        severity: 'error'
      })
    }

    // Validate each contract configuration
    for (const contract of plan.contracts) {
      const contractErrors = await this.validateContractConfig(contract, plan)
      errors.push(...contractErrors)
    }

    // Check for missing dependencies
    for (const contract of plan.contracts) {
      for (const depId of contract.dependencies) {
        if (!plan.contracts.find(c => c.id === depId)) {
          errors.push({
            contractId: contract.id,
            field: 'dependencies',
            message: `Dependency "${depId}" not found in deployment plan`,
            severity: 'error'
          })
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private detectDependencyCycles(dependencies: DependencyMap): string[] {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const cycle: string[] = []

    const dfs = (node: string, path: string[]): boolean => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node)
        cycle.push(...path.slice(cycleStart), node)
        return true
      }

      if (visited.has(node)) {
        return false
      }

      visited.add(node)
      recursionStack.add(node)

      const deps = dependencies[node] || []
      for (const dep of deps) {
        if (dfs(dep, [...path, node])) {
          return true
        }
      }

      recursionStack.delete(node)
      return false
    }

    for (const node of Object.keys(dependencies)) {
      if (!visited.has(node)) {
        if (dfs(node, [])) {
          break
        }
      }
    }

    return cycle
  }

  private async validateContractConfig(contract: ContractConfig, plan: DeploymentPlan): Promise<ValidationError[]> {
    const errors: ValidationError[] = []

    // Validate required fields
    if (!contract.name) {
      errors.push({
        contractId: contract.id,
        field: 'name',
        message: 'Contract name is required',
        severity: 'error'
      })
    }

    if (!contract.type) {
      errors.push({
        contractId: contract.id,
        field: 'type',
        message: 'Contract type is required',
        severity: 'error'
      })
    }

    // Validate constructor arguments
    for (const arg of contract.constructorArgs) {
      if (arg.isDependency && arg.dependsOn) {
        // Check if dependency exists in plan
        if (!plan.contracts.find(c => c.id === arg.dependsOn)) {
          errors.push({
            contractId: contract.id,
            field: 'constructorArgs',
            message: `Constructor arg "${arg.name}" depends on non-existent contract "${arg.dependsOn}"`,
            severity: 'error'
          })
        }
      } else if (!arg.value && arg.value !== 0 && arg.value !== false) {
        errors.push({
          contractId: contract.id,
          field: 'constructorArgs',
          message: `Constructor arg "${arg.name}" has no value`,
          severity: 'error'
        })
      }
    }

    return errors
  }

  async executeDeploymentPlan(planId: string): Promise<DeploymentResult> {
    const plan = this.deploymentPlans.get(planId)
    if (!plan) {
      throw new Error('Deployment plan not found')
    }

    // Check if already deploying
    if (this.activeDeployments.has(planId)) {
      throw new Error('Deployment already in progress')
    }

    // Validate plan before execution
    const validation = await this.validateDeploymentPlan(planId)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Update plan status
    plan.status = 'deploying'
    plan.updatedAt = new Date()
    this.savePersistedPlans()

    const deploymentPromise = this.executeDeployment(plan)
    this.activeDeployments.set(planId, deploymentPromise)

    try {
      const result = await deploymentPromise
      plan.status = result.status === 'success' ? 'completed' : 'failed'
      plan.updatedAt = new Date()
      this.savePersistedPlans()
      return result
    } finally {
      this.activeDeployments.delete(planId)
    }
  }

  private async executeDeployment(plan: DeploymentPlan): Promise<DeploymentResult> {
    const startTime = Date.now()
    const deployedContracts: DeployedContract[] = []
    const failedContracts: FailedDeployment[] = []
    let totalGasUsed = BigInt(0)

    try {
      // Get or create clients for the target chain
      const clients = await this.getClients(plan.parameters.chainId)

      // Resolve deployment order based on dependencies
      const deploymentOrder = this.resolveDependencyOrder(plan.contracts, plan.dependencies)
      
      toast.info(`Starting deployment of ${plan.contracts.length} contracts...`)

      // Deploy contracts in dependency order
      for (const contract of deploymentOrder) {
        try {
          toast.info(`Deploying ${contract.name}...`)
          
          const deployedContract = await this.deployContract(
            contract, 
            deployedContracts, 
            clients, 
            plan.parameters
          )
          
          deployedContracts.push(deployedContract)
          totalGasUsed += deployedContract.gasUsed

          toast.success(`${contract.name} deployed successfully`)

          // Execute post-deploy actions
          if (contract.postDeployActions.length > 0) {
            await this.executePostDeployActions(
              contract.postDeployActions,
              deployedContracts,
              clients
            )
          }

        } catch (error) {
          console.error(`Failed to deploy ${contract.name}:`, error)
          
          failedContracts.push({
            id: contract.id,
            name: contract.name,
            error: error instanceof Error ? error.message : 'Unknown error',
            attemptedAt: new Date()
          })

          // If deployment fails, we might want to continue or stop
          // For now, we'll stop on first failure
          toast.error(`Failed to deploy ${contract.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          break
        }
      }

      const duration = Date.now() - startTime
      const result: DeploymentResult = {
        planId: plan.id,
        status: failedContracts.length === 0 ? 'success' : 'partial',
        deployedContracts,
        failedContracts,
        gasUsed: totalGasUsed,
        totalCost: totalGasUsed * (plan.parameters.gasPrice || BigInt(0)),
        duration
      }

      if (result.status === 'success') {
        toast.success(`All contracts deployed successfully in ${(duration / 1000).toFixed(1)}s`)
      } else {
        toast.warning(`Deployment partially completed. ${deployedContracts.length} succeeded, ${failedContracts.length} failed`)
      }

      return result

    } catch (error) {
      const duration = Date.now() - startTime
      console.error('Deployment failed:', error)
      
      toast.error(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)

      return {
        planId: plan.id,
        status: 'failed',
        deployedContracts,
        failedContracts,
        gasUsed: totalGasUsed,
        totalCost: BigInt(0),
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private resolveDependencyOrder(contracts: ContractConfig[], dependencies: DependencyMap): ContractConfig[] {
    const resolved: ContractConfig[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (contractId: string) => {
      if (visiting.has(contractId)) {
        throw new Error(`Circular dependency detected involving ${contractId}`)
      }
      
      if (visited.has(contractId)) {
        return
      }

      visiting.add(contractId)
      
      const deps = dependencies[contractId] || []
      deps.forEach(visit)
      
      visiting.delete(contractId)
      visited.add(contractId)
      
      const contract = contracts.find(c => c.id === contractId)
      if (contract) {
        resolved.push(contract)
      }
    }

    contracts.forEach(contract => visit(contract.id))
    return resolved
  }

  private async getClients(chainId: SupportedChainId): Promise<{ public: PublicClient; wallet: WalletClient }> {
    if (!this.clients.has(chainId)) {
      const publicClient = createPublicClientForChain(chainId)
      const walletClient = createWalletClientForChain(chainId)
      
      this.clients.set(chainId, { public: publicClient, wallet: walletClient })
    }

    return this.clients.get(chainId)!
  }

  private async deployContract(
    contract: ContractConfig,
    deployedContracts: DeployedContract[],
    clients: { public: PublicClient; wallet: WalletClient },
    params: DeploymentParameters
  ): Promise<DeployedContract> {
    // Resolve constructor arguments
    const resolvedArgs = this.resolveConstructorArgs(contract.constructorArgs, deployedContracts)
    
    // Get contract template
    const template = await this.getContractTemplate(contract.type)
    
    // Deploy contract (this would integrate with actual deployment logic)
    const deployHash = await this.performDeployment(
      template.bytecode,
      template.abi,
      resolvedArgs,
      clients,
      params
    )
    
    // Wait for confirmation
    const receipt = await clients.public.waitForTransactionReceipt({ 
      hash: deployHash,
      confirmations: params.confirmations
    })

    if (!receipt.contractAddress) {
      throw new Error('Contract deployment failed - no contract address in receipt')
    }

    return {
      id: contract.id,
      name: contract.name,
      type: contract.type,
      address: receipt.contractAddress,
      transactionHash: deployHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      deployedAt: new Date()
    }
  }

  private resolveConstructorArgs(args: ConstructorArg[], deployedContracts: DeployedContract[]): any[] {
    return args.map(arg => {
      if (arg.isDependency && arg.dependsOn) {
        const deployedContract = deployedContracts.find(c => c.id === arg.dependsOn)
        if (!deployedContract) {
          throw new Error(`Dependency ${arg.dependsOn} not found in deployed contracts`)
        }
        return deployedContract.address
      }
      return arg.value
    })
  }

  private async getContractTemplate(type: ContractType): Promise<{ bytecode: string; abi: any[] }> {
    // This would integrate with the contract template system
    // For now, return placeholder
    return {
      bytecode: '0x',
      abi: []
    }
  }

  private async performDeployment(
    bytecode: string,
    abi: any[],
    args: any[],
    clients: { public: PublicClient; wallet: WalletClient },
    params: DeploymentParameters
  ): Promise<string> {
    // This would perform the actual contract deployment
    // Placeholder implementation
    throw new Error('Contract deployment not yet implemented')
  }

  private async executePostDeployActions(
    actions: PostDeployAction[],
    deployedContracts: DeployedContract[],
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<void> {
    for (const action of actions) {
      try {
        await this.executePostDeployAction(action, deployedContracts, clients)
      } catch (error) {
        console.warn(`Post-deploy action failed: ${action.description}`, error)
        // Continue with other actions even if one fails
      }
    }
  }

  private async executePostDeployAction(
    action: PostDeployAction,
    deployedContracts: DeployedContract[],
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<void> {
    // Resolve target address
    let targetAddress: Address
    const deployedContract = deployedContracts.find(c => c.id === action.target)
    if (deployedContract) {
      targetAddress = deployedContract.address
    } else if (action.target.startsWith('0x')) {
      targetAddress = action.target as Address
    } else {
      throw new Error(`Cannot resolve target address for action: ${action.description}`)
    }

    // Execute the action based on type
    switch (action.type) {
      case 'function_call':
        // Would call the specified function on the contract
        break
      case 'permission_grant':
        // Would grant permissions
        break
      case 'token_mint':
        // Would mint tokens
        break
    }
  }

  async rollbackDeployment(deploymentId: string): Promise<RollbackResult> {
    const plan = this.deploymentPlans.get(deploymentId)
    if (!plan) {
      throw new Error('Deployment plan not found')
    }

    if (plan.status !== 'completed' && plan.status !== 'failed') {
      throw new Error('Can only rollback completed or failed deployments')
    }

    // Find the deployment result
    const deploymentResult = await this.getDeploymentResult(deploymentId)
    if (!deploymentResult) {
      throw new Error('Deployment result not found')
    }

    const rollbackActions: RollbackAction[] = []
    const errors: RollbackError[] = []
    let totalGasUsed = BigInt(0)

    try {
      const clients = await this.getClients(plan.parameters.chainId)

      // Rollback in reverse order of deployment
      const contractsToRollback = [...deploymentResult.deployedContracts].reverse()

      for (const contract of contractsToRollback) {
        try {
          const rollbackAction = await this.rollbackContract(contract, clients)
          rollbackActions.push(rollbackAction)
          totalGasUsed += rollbackAction.gasUsed
          
          toast.success(`${contract.name} rollback completed`)
        } catch (error) {
          const rollbackError: RollbackError = {
            contractId: contract.id,
            contractName: contract.name,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          }
          errors.push(rollbackError)
          console.error(`Failed to rollback ${contract.name}:`, error)
          toast.error(`Failed to rollback ${contract.name}`)
        }
      }

      // Update plan status
      plan.status = 'rolled_back'
      plan.updatedAt = new Date()
      this.savePersistedPlans()

      const result: RollbackResult = {
        deploymentId,
        status: errors.length === 0 ? 'success' : 'partial',
        rollbackActions,
        errors,
        totalGasUsed,
        duration: Date.now() // This would be calculated properly
      }

      if (result.status === 'success') {
        toast.success('Deployment rollback completed successfully')
      } else {
        toast.warning(`Rollback partially completed. ${rollbackActions.length} succeeded, ${errors.length} failed`)
      }

      return result

    } catch (error) {
      console.error('Rollback failed:', error)
      toast.error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      throw new Error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async rollbackContract(
    contract: DeployedContract,
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<RollbackAction> {
    // The rollback strategy depends on the contract type and what's possible
    // Some rollback operations that might be possible:
    
    switch (contract.type) {
      case 'ERC20':
        return await this.rollbackERC20Contract(contract, clients)
      case 'ERC1155':
        return await this.rollbackERC1155Contract(contract, clients)
      case 'Settlement':
        return await this.rollbackSettlementContract(contract, clients)
      case 'AccessControl':
        return await this.rollbackAccessControlContract(contract, clients)
      case 'Registry':
        return await this.rollbackRegistryContract(contract, clients)
      default:
        return await this.rollbackGenericContract(contract, clients)
    }
  }

  private async rollbackERC20Contract(
    contract: DeployedContract,
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<RollbackAction> {
    // For ERC20 contracts, rollback might involve:
    // 1. Burning all tokens if possible
    // 2. Transferring ownership to null address
    // 3. Pausing the contract if pausable
    
    const actions: string[] = []
    let gasUsed = BigInt(0)

    try {
      // Try to pause the contract if it's pausable
      // This is a placeholder - actual implementation would call the contract
      const pauseHash = await this.callContractFunction(
        contract.address,
        'pause',
        [],
        clients
      )
      if (pauseHash) {
        actions.push('Contract paused')
        gasUsed += BigInt(50000) // Estimated gas
      }
    } catch (error) {
      // Ignore if pause function doesn't exist
    }

    try {
      // Try to renounce ownership if ownable
      const renounceHash = await this.callContractFunction(
        contract.address,
        'renounceOwnership',
        [],
        clients
      )
      if (renounceHash) {
        actions.push('Ownership renounced')
        gasUsed += BigInt(30000) // Estimated gas
      }
    } catch (error) {
      // Ignore if renounceOwnership function doesn't exist
    }

    return {
      contractId: contract.id,
      contractName: contract.name,
      contractAddress: contract.address,
      actions,
      gasUsed,
      timestamp: new Date(),
      transactionHashes: [] // Would contain actual transaction hashes
    }
  }

  private async rollbackERC1155Contract(
    contract: DeployedContract,
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<RollbackAction> {
    // Similar to ERC20, but for ERC1155 contracts
    const actions: string[] = []
    let gasUsed = BigInt(0)

    try {
      // Try to pause the contract
      const pauseHash = await this.callContractFunction(
        contract.address,
        'pause',
        [],
        clients
      )
      if (pauseHash) {
        actions.push('Contract paused')
        gasUsed += BigInt(50000)
      }
    } catch (error) {
      // Ignore if function doesn't exist
    }

    return {
      contractId: contract.id,
      contractName: contract.name,
      contractAddress: contract.address,
      actions,
      gasUsed,
      timestamp: new Date(),
      transactionHashes: []
    }
  }

  private async rollbackSettlementContract(
    contract: DeployedContract,
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<RollbackAction> {
    // For settlement contracts, rollback might involve:
    // 1. Canceling all active swaps
    // 2. Returning any escrowed funds
    // 3. Disabling new swap creation
    
    const actions: string[] = []
    let gasUsed = BigInt(0)

    try {
      // Disable new swaps
      const disableHash = await this.callContractFunction(
        contract.address,
        'emergencyDisable',
        [],
        clients
      )
      if (disableHash) {
        actions.push('Emergency disable activated')
        gasUsed += BigInt(100000)
      }
    } catch (error) {
      // Ignore if function doesn't exist
    }

    return {
      contractId: contract.id,
      contractName: contract.name,
      contractAddress: contract.address,
      actions,
      gasUsed,
      timestamp: new Date(),
      transactionHashes: []
    }
  }

  private async rollbackAccessControlContract(
    contract: DeployedContract,
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<RollbackAction> {
    // For access control contracts, rollback might involve:
    // 1. Revoking all granted roles
    // 2. Renouncing admin privileges
    
    const actions: string[] = []
    let gasUsed = BigInt(0)

    try {
      // Renounce admin role
      const renounceHash = await this.callContractFunction(
        contract.address,
        'renounceRole',
        ['0x00', /* current account address */],
        clients
      )
      if (renounceHash) {
        actions.push('Admin role renounced')
        gasUsed += BigInt(50000)
      }
    } catch (error) {
      // Ignore if function doesn't exist
    }

    return {
      contractId: contract.id,
      contractName: contract.name,
      contractAddress: contract.address,
      actions,
      gasUsed,
      timestamp: new Date(),
      transactionHashes: []
    }
  }

  private async rollbackRegistryContract(
    contract: DeployedContract,
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<RollbackAction> {
    // For registry contracts, rollback might involve:
    // 1. Clearing all registered contracts
    // 2. Disabling registration
    
    const actions: string[] = []
    let gasUsed = BigInt(0)

    try {
      // Clear all registrations if possible
      const clearHash = await this.callContractFunction(
        contract.address,
        'clearAllRegistrations',
        [],
        clients
      )
      if (clearHash) {
        actions.push('All registrations cleared')
        gasUsed += BigInt(200000)
      }
    } catch (error) {
      // Ignore if function doesn't exist
    }

    return {
      contractId: contract.id,
      contractName: contract.name,
      contractAddress: contract.address,
      actions,
      gasUsed,
      timestamp: new Date(),
      transactionHashes: []
    }
  }

  private async rollbackGenericContract(
    contract: DeployedContract,
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<RollbackAction> {
    // For generic contracts, limited rollback options
    const actions: string[] = ['Contract marked for rollback (no specific actions available)']

    return {
      contractId: contract.id,
      contractName: contract.name,
      contractAddress: contract.address,
      actions,
      gasUsed: BigInt(0),
      timestamp: new Date(),
      transactionHashes: []
    }
  }

  private async callContractFunction(
    contractAddress: Address,
    functionName: string,
    args: any[],
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<string | null> {
    // This would perform the actual contract function call
    // For now, return null to indicate the function call was skipped
    return null
  }

  private async getDeploymentResult(deploymentId: string): Promise<DeploymentResult | null> {
    // This would retrieve the deployment result from storage
    // For now, return null
    return null
  }

  // Public API methods
  getDeploymentPlan(planId: string): DeploymentPlan | null {
    return this.deploymentPlans.get(planId) || null
  }

  getAllDeploymentPlans(): DeploymentPlan[] {
    return Array.from(this.deploymentPlans.values())
  }

  async updateDeploymentPlan(planId: string, updates: Partial<DeploymentPlan>): Promise<DeploymentPlan> {
    const plan = this.deploymentPlans.get(planId)
    if (!plan) {
      throw new Error('Deployment plan not found')
    }

    const updatedPlan = {
      ...plan,
      ...updates,
      updatedAt: new Date()
    }

    // Rebuild dependency map if contracts changed
    if (updates.contracts) {
      updatedPlan.dependencies = this.buildDependencyMap(updatedPlan.contracts)
    }

    this.deploymentPlans.set(planId, updatedPlan)
    this.savePersistedPlans()

    return updatedPlan
  }

  async deleteDeploymentPlan(planId: string): Promise<void> {
    if (!this.deploymentPlans.has(planId)) {
      throw new Error('Deployment plan not found')
    }

    this.deploymentPlans.delete(planId)
    this.savePersistedPlans()
  }

  getDeploymentStatus(planId: string): string | null {
    const plan = this.deploymentPlans.get(planId)
    return plan ? plan.status : null
  }

  isDeploying(planId: string): boolean {
    return this.activeDeployments.has(planId)
  }
}

export const multiDeploymentService = new MultiContractDeploymentService()
export default multiDeploymentService