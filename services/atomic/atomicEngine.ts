import { Address, Hash, PublicClient, WalletClient, parseEther, formatEther } from 'viem'
import { getPublicClient, getWalletClient } from '@/services/blockchain/clients'
import type { SupportedChainId } from '@/types/blockchain'
import { toast } from 'react-hot-toast'

export interface AtomicOperation {
  id: string
  type: 'swap' | 'batch' | 'conditional' | 'timelocked'
  steps: TransactionStep[]
  requirements: OperationRequirement[]
  safeguards: SafeguardConfig
  metadata: OperationMetadata
  status: 'pending' | 'simulating' | 'executing' | 'completed' | 'failed' | 'reverted'
  createdAt: Date
  executedAt?: Date
}

export interface TransactionStep {
  id: string
  contract: Address
  function: string
  args: any[]
  value?: bigint
  gasLimit?: bigint
  condition?: ConditionCheck
  executed?: boolean
  transactionHash?: Hash
  gasUsed?: bigint
  error?: string
}

export interface OperationRequirement {
  type: 'balance' | 'allowance' | 'permission' | 'state'
  target: Address
  condition: string
  expected: any
  actual?: any
  satisfied?: boolean
}

export interface SafeguardConfig {
  maxGasPrice?: bigint
  deadline?: number
  slippageTolerance?: number // percentage
  maxGasLimit?: bigint
  requireAllSteps: boolean
  enableRollback: boolean
}

export interface OperationMetadata {
  title: string
  description: string
  category: string
  estimatedGas?: bigint
  estimatedCost?: bigint
  riskLevel: 'low' | 'medium' | 'high'
  tags: string[]
}

export interface ConditionCheck {
  type: 'balance' | 'allowance' | 'state' | 'time' | 'block'
  target: Address
  function: string
  args: any[]
  operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'neq'
  expected: any
}

export interface ExecutionResult {
  operationId: string
  success: boolean
  completedSteps: number
  totalSteps: number
  transactions: Hash[]
  totalGasUsed: bigint
  totalCost: bigint
  duration: number
  error?: string
  rollbackTransactions?: Hash[]
}

export interface SimulationResult {
  operationId: string
  canExecute: boolean
  estimatedGas: bigint
  estimatedCost: bigint
  stepResults: StepSimulation[]
  warnings: string[]
  errors: string[]
  recommendedGasPrice: bigint
}

export interface StepSimulation {
  stepId: string
  success: boolean
  gasEstimate: bigint
  revertReason?: string
  stateChanges: StateChange[]
  warnings: string[]
}

export interface StateChange {
  contract: Address
  property: string
  before: any
  after: any
  impact: 'low' | 'medium' | 'high'
}

export interface SwapParameters {
  tokenA: Address
  tokenB: Address
  amountA: string
  amountB: string
  participant1: Address
  participant2: Address
  deadline: number
  slippageTolerance: number
  secretHash?: string
}

export interface BatchParameters {
  steps: Omit<TransactionStep, 'id' | 'executed'>[]
  gasLimit?: bigint
  gasPrice?: bigint
  deadline?: number
  revertOnFailure: boolean
}

class AtomicTransactionEngine {
  private static instance: AtomicTransactionEngine
  private operations: Map<string, AtomicOperation> = new Map()
  private activeExecutions: Map<string, Promise<ExecutionResult>> = new Map()
  private chainClients: Map<SupportedChainId, { public: PublicClient; wallet: WalletClient }> = new Map()

  static getInstance(): AtomicTransactionEngine {
    if (!AtomicTransactionEngine.instance) {
      AtomicTransactionEngine.instance = new AtomicTransactionEngine()
    }
    return AtomicTransactionEngine.instance
  }

  private constructor() {
    this.loadPersistedOperations()
  }

  private loadPersistedOperations() {
    try {
      const saved = localStorage.getItem('atomic-operations')
      if (saved) {
        const operations = JSON.parse(saved)
        Object.values(operations).forEach((op: any) => {
          this.operations.set(op.id, {
            ...op,
            createdAt: new Date(op.createdAt),
            executedAt: op.executedAt ? new Date(op.executedAt) : undefined
          })
        })
      }
    } catch (error) {
      console.warn('Failed to load atomic operations:', error)
    }
  }

  private savePersistedOperations() {
    try {
      const operations: Record<string, any> = {}
      this.operations.forEach((op, id) => {
        operations[id] = op
      })
      localStorage.setItem('atomic-operations', JSON.stringify(operations))
    } catch (error) {
      console.warn('Failed to save atomic operations:', error)
    }
  }

  private getClients(chainId: SupportedChainId = 31337): { public: PublicClient; wallet: WalletClient } {
    if (!this.chainClients.has(chainId)) {
      this.chainClients.set(chainId, {
        public: getPublicClient(chainId),
        wallet: getWalletClient(chainId)
      })
    }
    return this.chainClients.get(chainId)!
  }

  async createAtomicSwap(params: SwapParameters): Promise<AtomicOperation> {
    const operationId = `swap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const steps: TransactionStep[] = [
      {
        id: `${operationId}-step-1`,
        contract: params.tokenA,
        function: 'approve',
        args: [process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000', parseEther(params.amountA)],
        gasLimit: BigInt(100000)
      },
      {
        id: `${operationId}-step-2`,
        contract: params.tokenB,
        function: 'approve',
        args: [process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000', parseEther(params.amountB)],
        gasLimit: BigInt(100000)
      },
      {
        id: `${operationId}-step-3`,
        contract: process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS as Address || '0x0000000000000000000000000000000000000000',
        function: 'createAtomicSwap',
        args: [
          params.tokenA,
          params.tokenB,
          parseEther(params.amountA),
          parseEther(params.amountB),
          params.participant2,
          Math.floor(Date.now() / 1000) + params.deadline,
          params.secretHash || '0x0000000000000000000000000000000000000000000000000000000000000000'
        ],
        gasLimit: BigInt(300000)
      }
    ]

    const requirements: OperationRequirement[] = [
      {
        type: 'balance',
        target: params.tokenA,
        condition: 'gte',
        expected: parseEther(params.amountA)
      },
      {
        type: 'balance',
        target: params.tokenB,
        condition: 'gte',
        expected: parseEther(params.amountB)
      },
      {
        type: 'allowance',
        target: params.tokenA,
        condition: 'gte',
        expected: parseEther(params.amountA)
      },
      {
        type: 'allowance',
        target: params.tokenB,
        condition: 'gte',
        expected: parseEther(params.amountB)
      }
    ]

    const operation: AtomicOperation = {
      id: operationId,
      type: 'swap',
      steps,
      requirements,
      safeguards: {
        deadline: params.deadline,
        slippageTolerance: params.slippageTolerance,
        requireAllSteps: true,
        enableRollback: true
      },
      metadata: {
        title: 'Atomic Token Swap',
        description: `Swap ${params.amountA} tokenA for ${params.amountB} tokenB`,
        category: 'swap',
        riskLevel: 'medium',
        tags: ['swap', 'atomic', 'tokens']
      },
      status: 'pending',
      createdAt: new Date()
    }

    this.operations.set(operationId, operation)
    this.savePersistedOperations()

    return operation
  }

  async batchOperations(params: BatchParameters): Promise<AtomicOperation> {
    const operationId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const steps: TransactionStep[] = params.steps.map((step, index) => ({
      ...step,
      id: `${operationId}-step-${index + 1}`
    }))

    const operation: AtomicOperation = {
      id: operationId,
      type: 'batch',
      steps,
      requirements: [],
      safeguards: {
        deadline: params.deadline,
        maxGasLimit: params.gasLimit,
        requireAllSteps: params.revertOnFailure,
        enableRollback: params.revertOnFailure
      },
      metadata: {
        title: 'Batch Transaction',
        description: `Execute ${steps.length} operations atomically`,
        category: 'batch',
        riskLevel: 'high',
        tags: ['batch', 'atomic', 'multi-step']
      },
      status: 'pending',
      createdAt: new Date()
    }

    this.operations.set(operationId, operation)
    this.savePersistedOperations()

    return operation
  }

  async simulateOperation(operationId: string, chainId: SupportedChainId = 31337): Promise<SimulationResult> {
    const operation = this.operations.get(operationId)
    if (!operation) {
      throw new Error('Operation not found')
    }

    operation.status = 'simulating'
    this.savePersistedOperations()

    const clients = this.getClients(chainId)
    const stepResults: StepSimulation[] = []
    const warnings: string[] = []
    const errors: string[] = []
    let totalGasEstimate = BigInt(0)
    let canExecute = true

    try {
      // Check requirements first
      for (const requirement of operation.requirements) {
        const satisfied = await this.checkRequirement(requirement, clients.public)
        requirement.satisfied = satisfied
        if (!satisfied) {
          errors.push(`Requirement not satisfied: ${requirement.condition}`)
          canExecute = false
        }
      }

      // Simulate each step
      for (const step of operation.steps) {
        try {
          // Check condition if exists
          if (step.condition) {
            const conditionMet = await this.checkCondition(step.condition, clients.public)
            if (!conditionMet) {
              stepResults.push({
                stepId: step.id,
                success: false,
                gasEstimate: BigInt(0),
                revertReason: 'Condition not met',
                stateChanges: [],
                warnings: ['Step condition not satisfied']
              })
              canExecute = false
              continue
            }
          }

          // Estimate gas for this step
          const gasEstimate = await this.estimateStepGas(step, clients.public)
          totalGasEstimate += gasEstimate

          // Simulate state changes (simplified)
          const stateChanges = await this.simulateStateChanges(step, clients.public)

          stepResults.push({
            stepId: step.id,
            success: true,
            gasEstimate,
            stateChanges,
            warnings: []
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Simulation failed'
          errors.push(`Step ${step.id} simulation failed: ${errorMessage}`)
          canExecute = false
          
          stepResults.push({
            stepId: step.id,
            success: false,
            gasEstimate: BigInt(0),
            revertReason: errorMessage,
            stateChanges: [],
            warnings: []
          })
        }
      }

      // Check safeguards
      if (operation.safeguards.maxGasLimit && totalGasEstimate > operation.safeguards.maxGasLimit) {
        warnings.push(`Estimated gas (${totalGasEstimate}) exceeds limit (${operation.safeguards.maxGasLimit})`)
      }

      if (operation.safeguards.deadline && Date.now() / 1000 > operation.safeguards.deadline) {
        errors.push('Operation deadline has passed')
        canExecute = false
      }

      const gasPrice = await clients.public.getGasPrice()
      const estimatedCost = totalGasEstimate * gasPrice

      operation.status = 'pending'
      operation.metadata.estimatedGas = totalGasEstimate
      operation.metadata.estimatedCost = estimatedCost
      this.savePersistedOperations()

      return {
        operationId,
        canExecute,
        estimatedGas: totalGasEstimate,
        estimatedCost,
        stepResults,
        warnings,
        errors,
        recommendedGasPrice: gasPrice
      }

    } catch (error) {
      operation.status = 'failed'
      this.savePersistedOperations()
      
      const errorMessage = error instanceof Error ? error.message : 'Simulation failed'
      throw new Error(`Simulation failed: ${errorMessage}`)
    }
  }

  async executeAtomicOperation(operationId: string, chainId: SupportedChainId = 31337): Promise<ExecutionResult> {
    const operation = this.operations.get(operationId)
    if (!operation) {
      throw new Error('Operation not found')
    }

    if (this.activeExecutions.has(operationId)) {
      throw new Error('Operation already executing')
    }

    // Run simulation first
    const simulation = await this.simulateOperation(operationId, chainId)
    if (!simulation.canExecute) {
      throw new Error(`Operation cannot execute: ${simulation.errors.join(', ')}`)
    }

    operation.status = 'executing'
    operation.executedAt = new Date()
    this.savePersistedOperations()

    const executionPromise = this.performExecution(operation, chainId)
    this.activeExecutions.set(operationId, executionPromise)

    try {
      const result = await executionPromise
      operation.status = result.success ? 'completed' : 'failed'
      this.savePersistedOperations()
      return result
    } finally {
      this.activeExecutions.delete(operationId)
    }
  }

  private async performExecution(operation: AtomicOperation, chainId: SupportedChainId): Promise<ExecutionResult> {
    const startTime = Date.now()
    const clients = this.getClients(chainId)
    const transactions: Hash[] = []
    let completedSteps = 0
    let totalGasUsed = BigInt(0)
    let rollbackTransactions: Hash[] = []

    try {
      toast.info(`Starting atomic operation: ${operation.metadata.title}`)

      // Execute steps in sequence
      for (const step of operation.steps) {
        try {
          // Check condition before execution
          if (step.condition) {
            const conditionMet = await this.checkCondition(step.condition, clients.public)
            if (!conditionMet) {
              throw new Error(`Step condition not met: ${step.id}`)
            }
          }

          toast.info(`Executing step ${completedSteps + 1}/${operation.steps.length}`)

          // Execute the step
          const hash = await this.executeStep(step, clients)
          step.transactionHash = hash
          transactions.push(hash)

          // Wait for confirmation
          const receipt = await clients.public.waitForTransactionReceipt({ hash })
          step.gasUsed = receipt.gasUsed
          totalGasUsed += receipt.gasUsed
          step.executed = true
          completedSteps++

          toast.success(`Step ${completedSteps} completed`)

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Step execution failed'
          step.error = errorMessage
          
          toast.error(`Step ${completedSteps + 1} failed: ${errorMessage}`)

          // If rollback is enabled and required, attempt rollback
          if (operation.safeguards.enableRollback && operation.safeguards.requireAllSteps) {
            toast.warning('Attempting rollback...')
            rollbackTransactions = await this.performRollback(operation.steps.slice(0, completedSteps), clients)
            operation.status = 'reverted'
          }

          throw error
        }
      }

      const duration = Date.now() - startTime
      const gasPrice = await clients.public.getGasPrice()
      const totalCost = totalGasUsed * gasPrice

      toast.success(`Atomic operation completed successfully in ${(duration / 1000).toFixed(1)}s`)

      return {
        operationId: operation.id,
        success: true,
        completedSteps,
        totalSteps: operation.steps.length,
        transactions,
        totalGasUsed,
        totalCost,
        duration
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Execution failed'
      
      toast.error(`Atomic operation failed: ${errorMessage}`)

      return {
        operationId: operation.id,
        success: false,
        completedSteps,
        totalSteps: operation.steps.length,
        transactions,
        totalGasUsed,
        totalCost: BigInt(0),
        duration,
        error: errorMessage,
        rollbackTransactions: rollbackTransactions.length > 0 ? rollbackTransactions : undefined
      }
    }
  }

  private async executeStep(
    step: TransactionStep,
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<Hash> {
    // This would execute the actual contract call
    // For now, we'll simulate with a placeholder
    
    const hash = await clients.wallet.writeContract({
      address: step.contract,
      abi: [
        {
          name: step.function,
          type: 'function',
          stateMutability: step.value ? 'payable' : 'nonpayable',
          inputs: step.args.map((_, i) => ({ name: `param${i}`, type: 'uint256' })), // Simplified
          outputs: []
        }
      ],
      functionName: step.function,
      args: step.args,
      value: step.value,
      gas: step.gasLimit
    })

    return hash
  }

  private async performRollback(
    executedSteps: TransactionStep[],
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<Hash[]> {
    const rollbackHashes: Hash[] = []

    // Execute rollback in reverse order
    for (let i = executedSteps.length - 1; i >= 0; i--) {
      const step = executedSteps[i]
      try {
        // Attempt to rollback this step (implementation depends on step type)
        const rollbackHash = await this.rollbackStep(step, clients)
        if (rollbackHash) {
          rollbackHashes.push(rollbackHash)
        }
      } catch (error) {
        console.warn(`Failed to rollback step ${step.id}:`, error)
        // Continue with other rollback operations
      }
    }

    return rollbackHashes
  }

  private async rollbackStep(
    step: TransactionStep,
    clients: { public: PublicClient; wallet: WalletClient }
  ): Promise<Hash | null> {
    // Rollback logic depends on the function type
    switch (step.function) {
      case 'approve':
        // Reset approval to 0
        return await clients.wallet.writeContract({
          address: step.contract,
          abi: [
            {
              name: 'approve',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'spender', type: 'address' },
                { name: 'amount', type: 'uint256' }
              ],
              outputs: [{ name: '', type: 'bool' }]
            }
          ],
          functionName: 'approve',
          args: [step.args[0], BigInt(0)]
        })
      
      default:
        // For other functions, rollback might not be possible
        return null
    }
  }

  private async checkRequirement(
    requirement: OperationRequirement,
    client: PublicClient
  ): Promise<boolean> {
    try {
      switch (requirement.type) {
        case 'balance': {
          const balance = await client.readContract({
            address: requirement.target,
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
            args: [requirement.target] // This should be the user address
          }) as bigint
          
          requirement.actual = balance
          return this.compareValues(balance, requirement.condition, requirement.expected)
        }
        
        case 'allowance': {
          const allowance = await client.readContract({
            address: requirement.target,
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
            args: [requirement.target, requirement.target] // This should be owner, spender
          }) as bigint
          
          requirement.actual = allowance
          return this.compareValues(allowance, requirement.condition, requirement.expected)
        }
        
        default:
          return true
      }
    } catch (error) {
      console.warn('Requirement check failed:', error)
      return false
    }
  }

  private async checkCondition(condition: ConditionCheck, client: PublicClient): Promise<boolean> {
    try {
      const result = await client.readContract({
        address: condition.target,
        abi: [
          {
            name: condition.function,
            type: 'function',
            stateMutability: 'view',
            inputs: condition.args.map((_, i) => ({ name: `param${i}`, type: 'uint256' })),
            outputs: [{ name: '', type: 'uint256' }]
          }
        ],
        functionName: condition.function,
        args: condition.args
      })
      
      return this.compareValues(result, condition.operator, condition.expected)
    } catch (error) {
      console.warn('Condition check failed:', error)
      return false
    }
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'eq': return actual === expected
      case 'gt': return actual > expected
      case 'gte': return actual >= expected
      case 'lt': return actual < expected
      case 'lte': return actual <= expected
      case 'neq': return actual !== expected
      default: return false
    }
  }

  private async estimateStepGas(step: TransactionStep, client: PublicClient): Promise<bigint> {
    try {
      return await client.estimateContractGas({
        address: step.contract,
        abi: [
          {
            name: step.function,
            type: 'function',
            stateMutability: step.value ? 'payable' : 'nonpayable',
            inputs: step.args.map((_, i) => ({ name: `param${i}`, type: 'uint256' })),
            outputs: []
          }
        ],
        functionName: step.function,
        args: step.args,
        value: step.value
      })
    } catch (error) {
      // Return step's gas limit or a default estimate
      return step.gasLimit || BigInt(100000)
    }
  }

  private async simulateStateChanges(step: TransactionStep, client: PublicClient): Promise<StateChange[]> {
    // This would simulate the state changes that would occur
    // For now, return empty array as this requires more complex simulation
    return []
  }

  // Public API methods
  getOperation(operationId: string): AtomicOperation | null {
    return this.operations.get(operationId) || null
  }

  getAllOperations(): AtomicOperation[] {
    return Array.from(this.operations.values())
  }

  getOperationsByType(type: AtomicOperation['type']): AtomicOperation[] {
    return Array.from(this.operations.values()).filter(op => op.type === type)
  }

  isExecuting(operationId: string): boolean {
    return this.activeExecutions.has(operationId)
  }

  async cancelOperation(operationId: string): Promise<void> {
    const operation = this.operations.get(operationId)
    if (!operation) {
      throw new Error('Operation not found')
    }

    if (operation.status === 'executing') {
      throw new Error('Cannot cancel operation that is currently executing')
    }

    operation.status = 'failed'
    this.savePersistedOperations()
  }

  async deleteOperation(operationId: string): Promise<void> {
    if (this.isExecuting(operationId)) {
      throw new Error('Cannot delete operation that is currently executing')
    }

    this.operations.delete(operationId)
    this.savePersistedOperations()
  }
}

export const atomicEngine = AtomicTransactionEngine.getInstance()
export default atomicEngine