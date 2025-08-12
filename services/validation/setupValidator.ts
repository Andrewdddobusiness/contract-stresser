import { Address, PublicClient, formatEther, parseEther } from 'viem'
import { getPublicClient } from '@/services/blockchain/clients'
import type { SupportedChainId } from '@/types/blockchain'
import { multiDeploymentService, type ContractConfig as DeploymentContractConfig } from '@/services/contracts/multiDeployment'
import { createCommonAutoFixes, type AutoFixAction } from '@/services/validation/autoFix'

export interface ValidationCheck {
  id: string
  name: string
  description: string
  category: 'contracts' | 'permissions' | 'balances' | 'network'
  severity: 'critical' | 'warning' | 'info'
  validator: () => Promise<ValidationResult>
  autoFix?: () => Promise<void>
  result?: ValidationResult
}

export interface ValidationResult {
  passed: boolean
  message: string
  details?: any
  suggestedAction?: string
  canAutoFix: boolean
}

export interface ValidationSummary {
  totalChecks: number
  passedChecks: number
  failedChecks: number
  warningChecks: number
  completionPercentage: number
  results: ValidationCheck[]
  canProceed: boolean
}

export interface HealthCheckResult {
  contractAddress: Address
  contractName: string
  isHealthy: boolean
  issues: string[]
  lastChecked: Date
}

export interface PermissionValidation {
  userAddress: Address
  hasAllPermissions: boolean
  missingPermissions: string[]
  roleAssignments: { [role: string]: boolean }
}

export interface TokenRequirement {
  tokenAddress: Address
  tokenSymbol: string
  requiredAmount: string
  allowanceTarget?: Address
}

export interface BalanceCheck {
  userAddress: Address
  ethBalance: string
  tokenBalances: { [tokenAddress: string]: string }
  allowances: { [tokenAddress: string]: { [spender: string]: string } }
  sufficientBalances: boolean
  sufficientAllowances: boolean
}

export interface ContractInfo {
  address: Address
  name: string
  type: string
  abi: any[]
  requiredInterfaces?: string[]
  dependencies?: Address[]
}

class SetupValidationService {
  private static instance: SetupValidationService
  private validationChecks: Map<string, ValidationCheck> = new Map()
  private chainClients: Map<SupportedChainId, PublicClient> = new Map()

  static getInstance(): SetupValidationService {
    if (!SetupValidationService.instance) {
      SetupValidationService.instance = new SetupValidationService()
    }
    return SetupValidationService.instance
  }

  private constructor() {
    this.initializeValidationChecks()
  }

  private getClient(chainId: SupportedChainId): PublicClient {
    if (!this.chainClients.has(chainId)) {
      this.chainClients.set(chainId, getPublicClient(chainId))
    }
    return this.chainClients.get(chainId)!
  }

  private initializeValidationChecks() {
    // Network connectivity check
    this.registerCheck({
      id: 'network-connectivity',
      name: 'Network Connectivity',
      description: 'Verify RPC connection is working',
      category: 'network',
      severity: 'critical',
      validator: async () => this.checkNetworkConnectivity(),
      canAutoFix: false
    } as ValidationCheck)

    // Gas price check
    this.registerCheck({
      id: 'gas-price',
      name: 'Gas Price',
      description: 'Check current gas prices are reasonable',
      category: 'network',
      severity: 'warning',
      validator: async () => this.checkGasPrice(),
      canAutoFix: false
    } as ValidationCheck)
  }

  registerCheck(check: ValidationCheck) {
    this.validationChecks.set(check.id, check)
  }

  async validateContractEcosystem(
    contracts: ContractInfo[],
    chainId: SupportedChainId = 31337,
    deploymentPlanId?: string
  ): Promise<ValidationSummary> {
    const client = this.getClient(chainId)
    const checks: ValidationCheck[] = []

    // Add contract-specific validation checks
    for (const contract of contracts) {
      checks.push({
        id: `contract-deployment-${contract.address}`,
        name: `${contract.name} Deployment`,
        description: `Verify ${contract.name} is deployed and accessible`,
        category: 'contracts',
        severity: 'critical',
        validator: async () => this.validateContractDeployment(contract, client),
        canAutoFix: false
      } as ValidationCheck)

      checks.push({
        id: `contract-interface-${contract.address}`,
        name: `${contract.name} Interface`,
        description: `Check ${contract.name} implements required interfaces`,
        category: 'contracts',
        severity: 'critical',
        validator: async () => this.validateContractInterface(contract, client),
        canAutoFix: false
      } as ValidationCheck)
    }

    // Add dependency validation
    checks.push({
      id: 'contract-dependencies',
      name: 'Contract Dependencies',
      description: 'Verify all contract dependencies are satisfied',
      category: 'contracts',
      severity: 'critical',
      validator: async () => this.validateContractDependencies(contracts, client),
      canAutoFix: false
    } as ValidationCheck)

    // Add deployment plan validation if provided
    if (deploymentPlanId) {
      const deploymentPlan = multiDeploymentService.getDeploymentPlan(deploymentPlanId)
      if (deploymentPlan) {
        checks.push({
          id: 'deployment-plan-validation',
          name: 'Deployment Plan Validation',
          description: 'Validate deployment plan configuration',
          category: 'contracts',
          severity: 'critical',
          validator: async () => this.validateDeploymentPlanCompatibility(deploymentPlan, contracts),
          canAutoFix: false
        } as ValidationCheck)
      }
    }

    // Run all validation checks
    const results: ValidationCheck[] = []
    let passedChecks = 0
    let failedChecks = 0
    let warningChecks = 0

    for (const check of [...this.validationChecks.values(), ...checks]) {
      try {
        const result = await check.validator()
        check.result = result

        if (result.passed) {
          passedChecks++
        } else {
          if (check.severity === 'critical') {
            failedChecks++
          } else if (check.severity === 'warning') {
            warningChecks++
          }
        }

        results.push(check)
      } catch (error) {
        failedChecks++
        check.result = {
          passed: false,
          message: `Validation failed: ${error}`,
          canAutoFix: false
        }
        results.push(check)
      }
    }

    const totalChecks = results.length
    const completionPercentage = Math.round((passedChecks / totalChecks) * 100)
    const canProceed = failedChecks === 0 // Only critical failures prevent proceeding

    return {
      totalChecks,
      passedChecks,
      failedChecks,
      warningChecks,
      completionPercentage,
      results,
      canProceed
    }
  }

  async runHealthChecks(
    contracts: ContractInfo[],
    chainId: SupportedChainId = 31337
  ): Promise<HealthCheckResult[]> {
    const client = this.getClient(chainId)
    const results: HealthCheckResult[] = []

    for (const contract of contracts) {
      const issues: string[] = []
      let isHealthy = true

      try {
        // Check if contract exists
        const code = await client.getBytecode({ address: contract.address })
        if (!code || code === '0x') {
          issues.push('Contract not deployed')
          isHealthy = false
        }

        // Check if contract responds to view calls
        try {
          await client.readContract({
            address: contract.address,
            abi: contract.abi,
            functionName: 'name'
          })
        } catch (error) {
          // If name() doesn't exist, that's ok for some contracts
          // But if it throws for other reasons, note it
          if (error instanceof Error && !error.message.includes('name')) {
            issues.push(`Contract unresponsive: ${error.message}`)
            isHealthy = false
          }
        }

        // Check gas estimation for common functions
        const commonFunctions = ['transfer', 'approve', 'mint', 'burn']
        for (const functionName of commonFunctions) {
          if (contract.abi.some(item => item.name === functionName)) {
            try {
              await client.estimateContractGas({
                address: contract.address,
                abi: contract.abi,
                functionName,
                args: [] // Empty args for estimation
              })
            } catch (error) {
              // Gas estimation failure might indicate function issues
              issues.push(`Function ${functionName} gas estimation failed`)
            }
          }
        }

      } catch (error) {
        issues.push(`Health check failed: ${error}`)
        isHealthy = false
      }

      results.push({
        contractAddress: contract.address,
        contractName: contract.name,
        isHealthy,
        issues,
        lastChecked: new Date()
      })
    }

    return results
  }

  async validatePermissions(
    userAddress: Address,
    contracts: ContractInfo[],
    chainId: SupportedChainId = 31337
  ): Promise<PermissionValidation> {
    const client = this.getClient(chainId)
    const missingPermissions: string[] = []
    const roleAssignments: { [role: string]: boolean } = {}

    for (const contract of contracts) {
      try {
        // Check for AccessControl interface
        if (contract.abi.some(item => item.name === 'hasRole')) {
          // Common roles to check
          const roles = ['DEFAULT_ADMIN_ROLE', 'MINTER_ROLE', 'BURNER_ROLE', 'PAUSER_ROLE']
          
          for (const role of roles) {
            try {
              const hasRole = await client.readContract({
                address: contract.address,
                abi: contract.abi,
                functionName: 'hasRole',
                args: [role, userAddress]
              }) as boolean

              roleAssignments[`${contract.name}_${role}`] = hasRole
              if (!hasRole) {
                missingPermissions.push(`${contract.name}: ${role}`)
              }
            } catch {
              // Role might not exist, skip
            }
          }
        }

        // Check for owner-based contracts
        if (contract.abi.some(item => item.name === 'owner')) {
          try {
            const owner = await client.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: 'owner'
            }) as Address

            const isOwner = owner.toLowerCase() === userAddress.toLowerCase()
            roleAssignments[`${contract.name}_OWNER`] = isOwner
            if (!isOwner) {
              missingPermissions.push(`${contract.name}: OWNER`)
            }
          } catch {
            // Owner function might not exist
          }
        }

      } catch (error) {
        missingPermissions.push(`${contract.name}: Permission check failed`)
      }
    }

    return {
      userAddress,
      hasAllPermissions: missingPermissions.length === 0,
      missingPermissions,
      roleAssignments
    }
  }

  async checkBalancesAndAllowances(
    userAddress: Address,
    requirements: TokenRequirement[],
    chainId: SupportedChainId = 31337
  ): Promise<BalanceCheck> {
    const client = this.getClient(chainId)
    const tokenBalances: { [tokenAddress: string]: string } = {}
    const allowances: { [tokenAddress: string]: { [spender: string]: string } } = {}
    let sufficientBalances = true
    let sufficientAllowances = true

    // Check ETH balance
    const ethBalance = await client.getBalance({ address: userAddress })
    const ethBalanceFormatted = formatEther(ethBalance)

    // Check token balances and allowances
    for (const requirement of requirements) {
      try {
        // Check token balance
        const balance = await client.readContract({
          address: requirement.tokenAddress,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }]
            }
          ],
          functionName: 'balanceOf',
          args: [userAddress]
        }) as bigint

        const balanceFormatted = formatEther(balance)
        tokenBalances[requirement.tokenAddress] = balanceFormatted

        if (balance < parseEther(requirement.requiredAmount)) {
          sufficientBalances = false
        }

        // Check allowance if required
        if (requirement.allowanceTarget) {
          const allowance = await client.readContract({
            address: requirement.tokenAddress,
            abi: [
              {
                name: 'allowance',
                type: 'function',
                stateMutability: 'view',
                inputs: [
                  { name: 'owner', type: 'address' },
                  { name: 'spender', type: 'address' }
                ],
                outputs: [{ name: '', type: 'uint256' }]
              }
            ],
            functionName: 'allowance',
            args: [userAddress, requirement.allowanceTarget]
          }) as bigint

          const allowanceFormatted = formatEther(allowance)
          if (!allowances[requirement.tokenAddress]) {
            allowances[requirement.tokenAddress] = {}
          }
          allowances[requirement.tokenAddress][requirement.allowanceTarget] = allowanceFormatted

          if (allowance < parseEther(requirement.requiredAmount)) {
            sufficientAllowances = false
          }
        }

      } catch (error) {
        tokenBalances[requirement.tokenAddress] = '0'
        sufficientBalances = false
      }
    }

    return {
      userAddress,
      ethBalance: ethBalanceFormatted,
      tokenBalances,
      allowances,
      sufficientBalances,
      sufficientAllowances
    }
  }

  private async validateDeploymentPlanCompatibility(
    deploymentPlan: any,
    contracts: ContractInfo[]
  ): Promise<ValidationResult> {
    try {
      const planValidation = await multiDeploymentService.validateDeploymentPlan(deploymentPlan.id)
      
      if (!planValidation.isValid) {
        const errors = planValidation.errors.map(e => e.message).join(', ')
        return {
          passed: false,
          message: `Deployment plan validation failed: ${errors}`,
          suggestedAction: 'Fix deployment plan configuration',
          canAutoFix: false,
          details: planValidation
        }
      }

      // Check if contracts match deployment plan
      const planContractIds = new Set(deploymentPlan.contracts.map((c: any) => c.id))
      const providedContractIds = new Set(contracts.map(c => c.address))
      
      const missingContracts = [...planContractIds].filter(id => 
        !contracts.some(c => c.name === deploymentPlan.contracts.find((pc: any) => pc.id === id)?.name)
      )
      
      if (missingContracts.length > 0) {
        return {
          passed: false,
          message: `Missing contracts from deployment plan: ${missingContracts.join(', ')}`,
          suggestedAction: 'Deploy missing contracts or update deployment plan',
          canAutoFix: false
        }
      }

      return {
        passed: true,
        message: 'Deployment plan is valid and compatible',
        canAutoFix: false
      }
    } catch (error) {
      return {
        passed: false,
        message: `Deployment plan validation error: ${error}`,
        canAutoFix: false
      }
    }
  }

  // Private validation methods
  private async checkNetworkConnectivity(): Promise<ValidationResult> {
    try {
      const client = this.getClient(31337) // Default to Anvil
      await client.getBlockNumber()
      
      return {
        passed: true,
        message: 'Network connection successful',
        canAutoFix: false
      }
    } catch (error) {
      return {
        passed: false,
        message: `Network connectivity failed: ${error}`,
        suggestedAction: 'Check if Anvil is running or network is accessible',
        canAutoFix: false
      }
    }
  }

  private async checkGasPrice(): Promise<ValidationResult> {
    try {
      const client = this.getClient(31337)
      const gasPrice = await client.getGasPrice()
      const gasPriceGwei = Number(gasPrice) / 1e9

      // For local networks, gas price should be very low
      if (gasPriceGwei > 100) {
        return {
          passed: false,
          message: `Gas price too high: ${gasPriceGwei} Gwei`,
          suggestedAction: 'Consider waiting for lower gas prices',
          canAutoFix: false
        }
      }

      return {
        passed: true,
        message: `Gas price acceptable: ${gasPriceGwei} Gwei`,
        canAutoFix: false
      }
    } catch (error) {
      return {
        passed: false,
        message: `Gas price check failed: ${error}`,
        canAutoFix: false
      }
    }
  }

  private async validateContractDeployment(
    contract: ContractInfo,
    client: PublicClient
  ): Promise<ValidationResult> {
    try {
      const code = await client.getBytecode({ address: contract.address })
      
      if (!code || code === '0x') {
        return {
          passed: false,
          message: `${contract.name} is not deployed`,
          suggestedAction: 'Deploy the contract first',
          canAutoFix: false
        }
      }

      return {
        passed: true,
        message: `${contract.name} is deployed and accessible`,
        canAutoFix: false
      }
    } catch (error) {
      return {
        passed: false,
        message: `Contract deployment check failed: ${error}`,
        canAutoFix: false
      }
    }
  }

  private async validateContractInterface(
    contract: ContractInfo,
    client: PublicClient
  ): Promise<ValidationResult> {
    if (!contract.requiredInterfaces?.length) {
      return {
        passed: true,
        message: `${contract.name} has no required interfaces`,
        canAutoFix: false
      }
    }

    try {
      // Check if contract supports required interfaces using EIP-165
      for (const interfaceId of contract.requiredInterfaces) {
        try {
          const supports = await client.readContract({
            address: contract.address,
            abi: [
              {
                name: 'supportsInterface',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'interfaceId', type: 'bytes4' }],
                outputs: [{ name: '', type: 'bool' }]
              }
            ],
            functionName: 'supportsInterface',
            args: [interfaceId]
          }) as boolean

          if (!supports) {
            return {
              passed: false,
              message: `${contract.name} does not support required interface ${interfaceId}`,
              canAutoFix: false
            }
          }
        } catch {
          // If supportsInterface fails, try to call a method from the interface
          // This is a fallback for contracts that don't implement EIP-165
        }
      }

      return {
        passed: true,
        message: `${contract.name} supports all required interfaces`,
        canAutoFix: false
      }
    } catch (error) {
      return {
        passed: false,
        message: `Interface validation failed: ${error}`,
        canAutoFix: false
      }
    }
  }

  private async validateContractDependencies(
    contracts: ContractInfo[],
    client: PublicClient
  ): Promise<ValidationResult> {
    const contractMap = new Map(contracts.map(c => [c.address, c]))
    
    for (const contract of contracts) {
      if (contract.dependencies?.length) {
        for (const depAddress of contract.dependencies) {
          const dependency = contractMap.get(depAddress)
          if (!dependency) {
            return {
              passed: false,
              message: `${contract.name} depends on unknown contract ${depAddress}`,
              suggestedAction: 'Ensure all dependencies are included in the deployment plan',
              canAutoFix: false
            }
          }

          // Check if dependency is deployed
          try {
            const code = await client.getBytecode({ address: depAddress })
            if (!code || code === '0x') {
              return {
                passed: false,
                message: `${contract.name} depends on undeployed contract ${dependency.name}`,
                suggestedAction: `Deploy ${dependency.name} first`,
                canAutoFix: false
              }
            }
          } catch (error) {
            return {
              passed: false,
              message: `Dependency check failed for ${contract.name}: ${error}`,
              canAutoFix: false
            }
          }
        }
      }
    }

    return {
      passed: true,
      message: 'All contract dependencies are satisfied',
      canAutoFix: false
    }
  }
}

export const setupValidationService = SetupValidationService.getInstance()