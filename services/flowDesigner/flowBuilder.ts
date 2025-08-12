'use client'

import { Address } from 'viem'
import { atomicEngine, type AtomicOperation, type TransactionStep } from '@/services/atomic/atomicEngine'
import { flowVisualizationEngine } from '@/services/visualization/flowEngine'

export enum BlockType {
  // Contract Operations
  CONTRACT_CALL = 'contract_call',
  CONTRACT_DEPLOY = 'contract_deploy',
  
  // Token Operations
  TOKEN_TRANSFER = 'token_transfer',
  TOKEN_APPROVAL = 'token_approval',
  ATOMIC_SWAP = 'atomic_swap',
  
  // Control Flow
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  DELAY = 'delay',
  
  // User Interaction
  USER_INPUT = 'user_input',
  MULTI_SIG = 'multi_sig',
  
  // Utility
  VARIABLE = 'variable',
  CALCULATION = 'calculation',
  VALIDATION = 'validation'
}

export interface FlowBlock {
  id: string
  type: BlockType
  position: { x: number; y: number }
  inputs: BlockInput[]
  outputs: BlockOutput[]
  config: BlockConfig
  validation: ValidationResult
  name?: string
  description?: string
}

export interface BlockInput {
  id: string
  name: string
  type: InputType
  required: boolean
  connected?: boolean
  value?: any
  description?: string
}

export interface BlockOutput {
  id: string
  name: string
  type: OutputType
  connections: string[]
  description?: string
}

export interface BlockConfig {
  [key: string]: any
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
}

export enum InputType {
  STRING = 'string',
  NUMBER = 'number',
  ADDRESS = 'address',
  BIGINT = 'bigint',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  EXECUTION_FLOW = 'execution_flow',
  TOKEN = 'token',
  CONTRACT = 'contract'
}

export enum OutputType {
  SUCCESS = 'success',
  ERROR = 'error',
  DATA = 'data',
  EXECUTION_FLOW = 'execution_flow',
  TRANSACTION_HASH = 'transaction_hash',
  CONTRACT_ADDRESS = 'contract_address'
}

export interface BlockConnection {
  id: string
  sourceBlock: string
  sourceOutput: string
  targetBlock: string
  targetInput: string
  condition?: ConnectionCondition
}

export interface ConnectionCondition {
  type: 'always' | 'success' | 'error' | 'value_match' | 'expression'
  expression?: string
  value?: any
}

export interface Flow {
  id: string
  name: string
  description: string
  blocks: FlowBlock[]
  connections: BlockConnection[]
  globalConfig: FlowConfig
  metadata: FlowMetadata
  version: string
  createdAt: Date
  updatedAt: Date
}

export interface FlowConfig {
  variables: FlowVariable[]
  gasSettings: GasSettings
  errorHandling: ErrorHandlingConfig
  permissions: PermissionConfig
  execution: ExecutionConfig
}

export interface FlowVariable {
  name: string
  type: InputType
  value: any
  description?: string
}

export interface GasSettings {
  maxGasPrice?: bigint
  gasLimit?: bigint
  priorityFee?: bigint
  estimationBuffer: number // percentage
}

export interface ErrorHandlingConfig {
  defaultRetryCount: number
  retryDelay: number
  failOnFirstError: boolean
  rollbackOnFailure: boolean
}

export interface PermissionConfig {
  requiredRoles: string[]
  requiredPermissions: string[]
  allowedUsers: Address[]
}

export interface ExecutionConfig {
  parallelExecution: boolean
  timeoutSeconds: number
  confirmationBlocks: number
}

export interface FlowMetadata {
  author: string
  category: string
  tags: string[]
  complexity: 'simple' | 'medium' | 'complex'
  estimatedDuration: number
  riskLevel: 'low' | 'medium' | 'high'
}

export interface FlowValidation {
  isValid: boolean
  errors: FlowValidationError[]
  warnings: FlowValidationWarning[]
  suggestions: FlowSuggestion[]
}

export interface FlowValidationError {
  blockId?: string
  connectionId?: string
  type: 'missing_connection' | 'invalid_config' | 'circular_dependency' | 'security_issue'
  message: string
  severity: 'error' | 'warning'
}

export interface FlowValidationWarning {
  blockId?: string
  message: string
  suggestion?: string
}

export interface FlowSuggestion {
  type: 'optimization' | 'security' | 'performance' | 'usability'
  message: string
  action?: string
}

export interface CompilationResult {
  success: boolean
  operation?: AtomicOperation
  errors: CompilationError[]
  warnings: string[]
}

export interface CompilationError {
  blockId: string
  message: string
  details?: string
}

class FlowBuilderService {
  private static instance: FlowBuilderService
  private flows: Map<string, Flow> = new Map()
  private blockValidators: Map<BlockType, (block: FlowBlock) => ValidationResult> = new Map()

  static getInstance(): FlowBuilderService {
    if (!FlowBuilderService.instance) {
      FlowBuilderService.instance = new FlowBuilderService()
    }
    return FlowBuilderService.instance
  }

  private constructor() {
    this.loadPersistedFlows()
    this.initializeBlockValidators()
  }

  private loadPersistedFlows() {
    try {
      const saved = localStorage.getItem('flow-designer-flows')
      if (saved) {
        const data = JSON.parse(saved)
        Object.entries(data.flows || {}).forEach(([id, flow]: [string, any]) => {
          this.flows.set(id, {
            ...flow,
            createdAt: new Date(flow.createdAt),
            updatedAt: new Date(flow.updatedAt)
          })
        })
      }
    } catch (error) {
      console.warn('Failed to load flows:', error)
    }
  }

  private savePersistedFlows() {
    try {
      const data = {
        flows: Object.fromEntries(this.flows),
        timestamp: new Date().toISOString()
      }
      localStorage.setItem('flow-designer-flows', JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save flows:', error)
    }
  }

  private initializeBlockValidators() {
    // Contract Call Block Validator
    this.blockValidators.set(BlockType.CONTRACT_CALL, (block: FlowBlock) => {
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      if (!block.config.contractAddress) {
        errors.push({
          field: 'contractAddress',
          message: 'Contract address is required',
          code: 'MISSING_CONTRACT_ADDRESS'
        })
      }

      if (!block.config.functionName) {
        errors.push({
          field: 'functionName',
          message: 'Function name is required',
          code: 'MISSING_FUNCTION_NAME'
        })
      }

      if (block.config.gasLimit && Number(block.config.gasLimit) < 21000) {
        warnings.push({
          field: 'gasLimit',
          message: 'Gas limit may be too low for contract interaction',
          code: 'LOW_GAS_LIMIT'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    })

    // Token Transfer Block Validator
    this.blockValidators.set(BlockType.TOKEN_TRANSFER, (block: FlowBlock) => {
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      if (!block.config.tokenAddress) {
        errors.push({
          field: 'tokenAddress',
          message: 'Token address is required',
          code: 'MISSING_TOKEN_ADDRESS'
        })
      }

      if (!block.config.recipient) {
        errors.push({
          field: 'recipient',
          message: 'Recipient address is required',
          code: 'MISSING_RECIPIENT'
        })
      }

      if (!block.config.amount || Number(block.config.amount) <= 0) {
        errors.push({
          field: 'amount',
          message: 'Transfer amount must be greater than 0',
          code: 'INVALID_AMOUNT'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    })

    // Atomic Swap Block Validator
    this.blockValidators.set(BlockType.ATOMIC_SWAP, (block: FlowBlock) => {
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      if (!block.config.tokenA || !block.config.tokenB) {
        errors.push({
          field: 'tokens',
          message: 'Both tokens must be specified',
          code: 'MISSING_TOKENS'
        })
      }

      if (!block.config.amountA || !block.config.amountB) {
        errors.push({
          field: 'amounts',
          message: 'Both amounts must be specified',
          code: 'MISSING_AMOUNTS'
        })
      }

      if (!block.config.participant2) {
        errors.push({
          field: 'participant2',
          message: 'Second participant address is required',
          code: 'MISSING_PARTICIPANT'
        })
      }

      if (block.config.deadline && Number(block.config.deadline) < Date.now() + 3600000) {
        warnings.push({
          field: 'deadline',
          message: 'Deadline should be at least 1 hour in the future',
          code: 'SHORT_DEADLINE'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    })
  }

  async createFlow(config: Partial<FlowConfig> = {}): Promise<Flow> {
    const flowId = `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const defaultConfig: FlowConfig = {
      variables: [],
      gasSettings: {
        estimationBuffer: 20
      },
      errorHandling: {
        defaultRetryCount: 1,
        retryDelay: 5000,
        failOnFirstError: false,
        rollbackOnFailure: true
      },
      permissions: {
        requiredRoles: [],
        requiredPermissions: [],
        allowedUsers: []
      },
      execution: {
        parallelExecution: false,
        timeoutSeconds: 300,
        confirmationBlocks: 1
      },
      ...config
    }

    const flow: Flow = {
      id: flowId,
      name: 'New Flow',
      description: '',
      blocks: [],
      connections: [],
      globalConfig: defaultConfig,
      metadata: {
        author: 'Anonymous',
        category: 'custom',
        tags: [],
        complexity: 'simple',
        estimatedDuration: 0,
        riskLevel: 'low'
      },
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.flows.set(flowId, flow)
    this.savePersistedFlows()

    return flow
  }

  async addBlock(flowId: string, blockData: Partial<FlowBlock>): Promise<FlowBlock> {
    const flow = this.flows.get(flowId)
    if (!flow) {
      throw new Error('Flow not found')
    }

    const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const block: FlowBlock = {
      id: blockId,
      type: blockData.type || BlockType.CONTRACT_CALL,
      position: blockData.position || { x: 0, y: 0 },
      inputs: this.getDefaultInputsForBlockType(blockData.type || BlockType.CONTRACT_CALL),
      outputs: this.getDefaultOutputsForBlockType(blockData.type || BlockType.CONTRACT_CALL),
      config: blockData.config || {},
      validation: { isValid: false, errors: [], warnings: [] },
      name: blockData.name,
      description: blockData.description,
      ...blockData
    }

    // Validate the new block
    block.validation = this.validateBlock(block)

    flow.blocks.push(block)
    flow.updatedAt = new Date()
    
    this.savePersistedFlows()
    
    return block
  }

  async updateBlock(flowId: string, blockId: string, updates: Partial<FlowBlock>): Promise<FlowBlock> {
    const flow = this.flows.get(flowId)
    if (!flow) {
      throw new Error('Flow not found')
    }

    const blockIndex = flow.blocks.findIndex(b => b.id === blockId)
    if (blockIndex === -1) {
      throw new Error('Block not found')
    }

    const updatedBlock = {
      ...flow.blocks[blockIndex],
      ...updates
    }

    // Re-validate the updated block
    updatedBlock.validation = this.validateBlock(updatedBlock)
    
    flow.blocks[blockIndex] = updatedBlock
    flow.updatedAt = new Date()
    
    this.savePersistedFlows()
    
    return updatedBlock
  }

  async removeBlock(flowId: string, blockId: string): Promise<void> {
    const flow = this.flows.get(flowId)
    if (!flow) {
      throw new Error('Flow not found')
    }

    // Remove block
    flow.blocks = flow.blocks.filter(b => b.id !== blockId)
    
    // Remove connections involving this block
    flow.connections = flow.connections.filter(
      conn => conn.sourceBlock !== blockId && conn.targetBlock !== blockId
    )
    
    flow.updatedAt = new Date()
    this.savePersistedFlows()
  }

  async connectBlocks(flowId: string, connection: Omit<BlockConnection, 'id'>): Promise<BlockConnection> {
    const flow = this.flows.get(flowId)
    if (!flow) {
      throw new Error('Flow not found')
    }

    const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const newConnection: BlockConnection = {
      id: connectionId,
      ...connection
    }

    // Validate connection
    const validation = this.validateConnection(flow, newConnection)
    if (!validation.isValid) {
      throw new Error(`Invalid connection: ${validation.errors.join(', ')}`)
    }

    flow.connections.push(newConnection)
    flow.updatedAt = new Date()
    
    this.savePersistedFlows()
    
    return newConnection
  }

  async removeConnection(flowId: string, connectionId: string): Promise<void> {
    const flow = this.flows.get(flowId)
    if (!flow) {
      throw new Error('Flow not found')
    }

    flow.connections = flow.connections.filter(conn => conn.id !== connectionId)
    flow.updatedAt = new Date()
    
    this.savePersistedFlows()
  }

  async validateFlow(flowId: string): Promise<FlowValidation> {
    const flow = this.flows.get(flowId)
    if (!flow) {
      throw new Error('Flow not found')
    }

    const errors: FlowValidationError[] = []
    const warnings: FlowValidationWarning[] = []
    const suggestions: FlowSuggestion[] = []

    // Validate all blocks
    flow.blocks.forEach(block => {
      block.validation = this.validateBlock(block)
      
      if (!block.validation.isValid) {
        block.validation.errors.forEach(error => {
          errors.push({
            blockId: block.id,
            type: 'invalid_config',
            message: `${block.name || block.type}: ${error.message}`,
            severity: 'error'
          })
        })
      }

      block.validation.warnings.forEach(warning => {
        warnings.push({
          blockId: block.id,
          message: `${block.name || block.type}: ${warning.message}`,
          suggestion: warning.message
        })
      })
    })

    // Check for circular dependencies
    if (this.hasCircularDependencies(flow)) {
      errors.push({
        type: 'circular_dependency',
        message: 'Flow contains circular dependencies',
        severity: 'error'
      })
    }

    // Check for disconnected blocks
    const disconnectedBlocks = this.findDisconnectedBlocks(flow)
    disconnectedBlocks.forEach(blockId => {
      const block = flow.blocks.find(b => b.id === blockId)
      warnings.push({
        blockId,
        message: `Block "${block?.name || block?.type}" is not connected to the flow`,
        suggestion: 'Connect this block to other blocks or remove it'
      })
    })

    // Performance suggestions
    if (flow.blocks.length > 10) {
      suggestions.push({
        type: 'performance',
        message: 'Large flows may take longer to execute',
        action: 'Consider breaking into smaller flows'
      })
    }

    // Security suggestions
    const hasTokenOperations = flow.blocks.some(b => 
      b.type === BlockType.TOKEN_TRANSFER || 
      b.type === BlockType.TOKEN_APPROVAL ||
      b.type === BlockType.ATOMIC_SWAP
    )
    
    if (hasTokenOperations && flow.globalConfig.permissions.requiredRoles.length === 0) {
      suggestions.push({
        type: 'security',
        message: 'Token operations detected without role restrictions',
        action: 'Consider adding role-based access control'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  async compileFlow(flowId: string): Promise<CompilationResult> {
    const flow = this.flows.get(flowId)
    if (!flow) {
      throw new Error('Flow not found')
    }

    // First validate the flow
    const validation = await this.validateFlow(flowId)
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors.map(e => ({
          blockId: e.blockId || '',
          message: e.message,
          details: e.type
        })),
        warnings: validation.warnings.map(w => w.message)
      }
    }

    try {
      const steps = await this.compileBlocksToSteps(flow)
      
      // Create atomic operation
      const operationId = `compiled-${flowId}-${Date.now()}`
      const operation: AtomicOperation = {
        id: operationId,
        type: this.determineOperationType(flow),
        steps,
        requirements: this.generateRequirements(flow),
        safeguards: this.generateSafeguards(flow),
        metadata: {
          title: flow.name,
          description: flow.description,
          category: flow.metadata.category,
          riskLevel: flow.metadata.riskLevel,
          tags: [...flow.metadata.tags, 'flow-designer'],
          estimatedGas: this.estimateFlowGas(steps),
          estimatedCost: this.estimateFlowCost(steps)
        },
        status: 'pending',
        createdAt: new Date()
      }

      return {
        success: true,
        operation,
        errors: [],
        warnings: validation.warnings.map(w => w.message)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Compilation failed'
      return {
        success: false,
        errors: [{
          blockId: '',
          message: errorMessage,
          details: 'Compilation error'
        }],
        warnings: []
      }
    }
  }

  private validateBlock(block: FlowBlock): ValidationResult {
    const validator = this.blockValidators.get(block.type)
    if (validator) {
      return validator(block)
    }

    // Default validation
    return {
      isValid: true,
      errors: [],
      warnings: []
    }
  }

  private validateConnection(flow: Flow, connection: BlockConnection): { isValid: boolean; errors: string[] } {
    const sourceBlock = flow.blocks.find(b => b.id === connection.sourceBlock)
    const targetBlock = flow.blocks.find(b => b.id === connection.targetBlock)

    const errors: string[] = []

    if (!sourceBlock) {
      errors.push('Source block not found')
    }

    if (!targetBlock) {
      errors.push('Target block not found')
    }

    if (sourceBlock && !sourceBlock.outputs.find(o => o.id === connection.sourceOutput)) {
      errors.push('Source output not found')
    }

    if (targetBlock && !targetBlock.inputs.find(i => i.id === connection.targetInput)) {
      errors.push('Target input not found')
    }

    // Check for duplicate connections
    const duplicate = flow.connections.find(conn => 
      conn.sourceBlock === connection.sourceBlock &&
      conn.sourceOutput === connection.sourceOutput &&
      conn.targetBlock === connection.targetBlock &&
      conn.targetInput === connection.targetInput
    )

    if (duplicate) {
      errors.push('Connection already exists')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private hasCircularDependencies(flow: Flow): boolean {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (blockId: string): boolean => {
      if (recursionStack.has(blockId)) {
        return true
      }
      
      if (visited.has(blockId)) {
        return false
      }

      visited.add(blockId)
      recursionStack.add(blockId)

      // Get all blocks connected from this block
      const connectedBlocks = flow.connections
        .filter(conn => conn.sourceBlock === blockId)
        .map(conn => conn.targetBlock)

      for (const connectedBlockId of connectedBlocks) {
        if (hasCycle(connectedBlockId)) {
          return true
        }
      }

      recursionStack.delete(blockId)
      return false
    }

    for (const block of flow.blocks) {
      if (!visited.has(block.id)) {
        if (hasCycle(block.id)) {
          return true
        }
      }
    }

    return false
  }

  private findDisconnectedBlocks(flow: Flow): string[] {
    const connectedBlocks = new Set<string>()
    
    flow.connections.forEach(conn => {
      connectedBlocks.add(conn.sourceBlock)
      connectedBlocks.add(conn.targetBlock)
    })

    return flow.blocks
      .filter(block => !connectedBlocks.has(block.id))
      .map(block => block.id)
  }

  private async compileBlocksToSteps(flow: Flow): Promise<TransactionStep[]> {
    const steps: TransactionStep[] = []
    const executionOrder = this.determineExecutionOrder(flow)

    for (const blockId of executionOrder) {
      const block = flow.blocks.find(b => b.id === blockId)
      if (!block) continue

      const step = await this.compileBlockToStep(block, flow)
      if (step) {
        steps.push(step)
      }
    }

    return steps
  }

  private determineExecutionOrder(flow: Flow): string[] {
    // Simple topological sort
    const inDegree = new Map<string, number>()
    const order: string[] = []

    // Initialize in-degrees
    flow.blocks.forEach(block => {
      inDegree.set(block.id, 0)
    })

    // Calculate in-degrees
    flow.connections.forEach(conn => {
      inDegree.set(conn.targetBlock, (inDegree.get(conn.targetBlock) || 0) + 1)
    })

    // Find nodes with no incoming edges
    const queue = flow.blocks
      .filter(block => inDegree.get(block.id) === 0)
      .map(block => block.id)

    while (queue.length > 0) {
      const current = queue.shift()!
      order.push(current)

      // Update in-degrees of connected blocks
      flow.connections
        .filter(conn => conn.sourceBlock === current)
        .forEach(conn => {
          const newInDegree = (inDegree.get(conn.targetBlock) || 0) - 1
          inDegree.set(conn.targetBlock, newInDegree)
          
          if (newInDegree === 0) {
            queue.push(conn.targetBlock)
          }
        })
    }

    return order
  }

  private async compileBlockToStep(block: FlowBlock, flow: Flow): Promise<TransactionStep | null> {
    switch (block.type) {
      case BlockType.CONTRACT_CALL:
        return {
          id: `step-${block.id}`,
          contract: block.config.contractAddress as Address,
          function: block.config.functionName,
          args: block.config.args || [],
          value: block.config.value ? BigInt(block.config.value) : undefined,
          gasLimit: block.config.gasLimit ? BigInt(block.config.gasLimit) : undefined
        }

      case BlockType.TOKEN_TRANSFER:
        return {
          id: `step-${block.id}`,
          contract: block.config.tokenAddress as Address,
          function: 'transfer',
          args: [
            block.config.recipient,
            BigInt(block.config.amount)
          ],
          gasLimit: BigInt(100000)
        }

      case BlockType.TOKEN_APPROVAL:
        return {
          id: `step-${block.id}`,
          contract: block.config.tokenAddress as Address,
          function: 'approve',
          args: [
            block.config.spender,
            BigInt(block.config.amount)
          ],
          gasLimit: BigInt(80000)
        }

      default:
        return null
    }
  }

  private getDefaultInputsForBlockType(type: BlockType): BlockInput[] {
    switch (type) {
      case BlockType.CONTRACT_CALL:
        return [
          {
            id: 'execution_input',
            name: 'Execution Flow',
            type: InputType.EXECUTION_FLOW,
            required: false,
            description: 'Previous step completion'
          }
        ]

      case BlockType.TOKEN_TRANSFER:
        return [
          {
            id: 'execution_input',
            name: 'Execution Flow',
            type: InputType.EXECUTION_FLOW,
            required: false,
            description: 'Previous step completion'
          }
        ]

      default:
        return []
    }
  }

  private getDefaultOutputsForBlockType(type: BlockType): BlockOutput[] {
    return [
      {
        id: 'success',
        name: 'Success',
        type: OutputType.SUCCESS,
        connections: [],
        description: 'Successful execution'
      },
      {
        id: 'error',
        name: 'Error',
        type: OutputType.ERROR,
        connections: [],
        description: 'Failed execution'
      }
    ]
  }

  private determineOperationType(flow: Flow): 'swap' | 'batch' | 'conditional' | 'timelocked' {
    const hasSwap = flow.blocks.some(b => b.type === BlockType.ATOMIC_SWAP)
    const hasConditional = flow.blocks.some(b => b.type === BlockType.CONDITIONAL)
    const hasDelay = flow.blocks.some(b => b.type === BlockType.DELAY)

    if (hasSwap) return 'swap'
    if (hasConditional) return 'conditional'
    if (hasDelay) return 'timelocked'
    return 'batch'
  }

  private generateRequirements(flow: Flow): any[] {
    // Generate requirements based on block configurations
    return []
  }

  private generateSafeguards(flow: Flow): any {
    return {
      requireAllSteps: flow.globalConfig.errorHandling.failOnFirstError,
      enableRollback: flow.globalConfig.errorHandling.rollbackOnFailure,
      maxGasPrice: flow.globalConfig.gasSettings.maxGasPrice,
      maxGasLimit: flow.globalConfig.gasSettings.gasLimit
    }
  }

  private estimateFlowGas(steps: TransactionStep[]): bigint {
    return steps.reduce((total, step) => total + (step.gasLimit || BigInt(100000)), BigInt(0))
  }

  private estimateFlowCost(steps: TransactionStep[]): bigint {
    const totalGas = this.estimateFlowGas(steps)
    const averageGasPrice = BigInt(20e9) // 20 gwei
    return totalGas * averageGasPrice
  }

  // Public API methods
  getFlow(flowId: string): Flow | null {
    return this.flows.get(flowId) || null
  }

  getAllFlows(): Flow[] {
    return Array.from(this.flows.values())
  }

  async saveFlow(flowId: string, updates: Partial<Flow>): Promise<Flow> {
    const flow = this.flows.get(flowId)
    if (!flow) {
      throw new Error('Flow not found')
    }

    const updatedFlow = {
      ...flow,
      ...updates,
      updatedAt: new Date()
    }

    this.flows.set(flowId, updatedFlow)
    this.savePersistedFlows()

    return updatedFlow
  }

  async deleteFlow(flowId: string): Promise<void> {
    this.flows.delete(flowId)
    this.savePersistedFlows()
  }

  async duplicateFlow(flowId: string, newName?: string): Promise<Flow> {
    const originalFlow = this.flows.get(flowId)
    if (!originalFlow) {
      throw new Error('Flow not found')
    }

    const newFlow = await this.createFlow(originalFlow.globalConfig)
    newFlow.name = newName || `${originalFlow.name} (Copy)`
    newFlow.description = originalFlow.description
    newFlow.blocks = originalFlow.blocks.map(block => ({
      ...block,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }))
    newFlow.connections = originalFlow.connections.map(conn => ({
      ...conn,
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }))
    newFlow.metadata = { ...originalFlow.metadata }

    this.flows.set(newFlow.id, newFlow)
    this.savePersistedFlows()

    return newFlow
  }
}

export const flowBuilderService = FlowBuilderService.getInstance()
export default flowBuilderService