'use client'

import React from 'react'
import { 
  FileContract2, 
  Send, 
  Shield, 
  ArrowRightLeft, 
  GitBranch, 
  RotateCcw, 
  Clock, 
  User, 
  Users, 
  Calculator, 
  CheckCircle,
  Zap,
  Rocket
} from 'lucide-react'
import { BlockType, InputType, OutputType } from './flowBuilder'

export interface BlockDefinition {
  type: BlockType
  name: string
  description: string
  icon: React.ComponentType<any>
  category: string
  inputs: InputDefinition[]
  outputs: OutputDefinition[]
  configSchema: ConfigFieldDefinition[]
  defaultConfig: any
  examples?: string[]
  documentation?: string
}

export interface InputDefinition {
  name: string
  type: InputType
  required: boolean
  description: string
  defaultValue?: any
  validation?: ValidationRule[]
}

export interface OutputDefinition {
  name: string
  type: OutputType
  description: string
}

export interface ConfigFieldDefinition {
  name: string
  label: string
  type: 'text' | 'number' | 'address' | 'bigint' | 'boolean' | 'select' | 'multiselect' | 'textarea'
  required: boolean
  description?: string
  placeholder?: string
  options?: { label: string; value: any }[]
  validation?: ValidationRule[]
  dependsOn?: string
  showWhen?: (config: any) => boolean
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom'
  value?: any
  message: string
  validator?: (value: any, config: any) => boolean
}

// Block Definitions Registry
export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
  [BlockType.CONTRACT_CALL]: {
    type: BlockType.CONTRACT_CALL,
    name: 'Contract Call',
    description: 'Execute a function on a smart contract',
    icon: FileContract2,
    category: 'Contract Operations',
    inputs: [
      {
        name: 'execution_flow',
        type: InputType.EXECUTION_FLOW,
        required: false,
        description: 'Previous step in the execution flow'
      }
    ],
    outputs: [
      {
        name: 'success',
        type: OutputType.SUCCESS,
        description: 'Successful execution path'
      },
      {
        name: 'error',
        type: OutputType.ERROR,
        description: 'Error execution path'
      },
      {
        name: 'result',
        type: OutputType.DATA,
        description: 'Function return value'
      },
      {
        name: 'transaction_hash',
        type: OutputType.TRANSACTION_HASH,
        description: 'Transaction hash'
      }
    ],
    configSchema: [
      {
        name: 'contractAddress',
        label: 'Contract Address',
        type: 'address',
        required: true,
        description: 'The address of the contract to call',
        placeholder: '0x...',
        validation: [
          {
            type: 'required',
            message: 'Contract address is required'
          },
          {
            type: 'pattern',
            value: /^0x[a-fA-F0-9]{40}$/,
            message: 'Must be a valid Ethereum address'
          }
        ]
      },
      {
        name: 'functionName',
        label: 'Function Name',
        type: 'text',
        required: true,
        description: 'Name of the function to call',
        placeholder: 'transfer',
        validation: [
          {
            type: 'required',
            message: 'Function name is required'
          }
        ]
      },
      {
        name: 'args',
        label: 'Function Arguments',
        type: 'textarea',
        required: false,
        description: 'JSON array of function arguments',
        placeholder: '["0x...", "1000000000000000000"]'
      },
      {
        name: 'value',
        label: 'ETH Value (wei)',
        type: 'bigint',
        required: false,
        description: 'Amount of ETH to send with the transaction',
        placeholder: '0'
      },
      {
        name: 'gasLimit',
        label: 'Gas Limit',
        type: 'number',
        required: false,
        description: 'Maximum gas to use for this transaction',
        placeholder: '100000',
        validation: [
          {
            type: 'min',
            value: 21000,
            message: 'Gas limit must be at least 21,000'
          }
        ]
      }
    ],
    defaultConfig: {
      contractAddress: '',
      functionName: '',
      args: [],
      value: BigInt(0),
      gasLimit: 100000
    },
    examples: [
      'Transfer ERC20 tokens',
      'Approve token spending',
      'Mint NFTs',
      'Update contract state'
    ]
  },

  [BlockType.CONTRACT_DEPLOY]: {
    type: BlockType.CONTRACT_DEPLOY,
    name: 'Contract Deploy',
    description: 'Deploy a new smart contract',
    icon: Rocket,
    category: 'Contract Operations',
    inputs: [
      {
        name: 'execution_flow',
        type: InputType.EXECUTION_FLOW,
        required: false,
        description: 'Previous step in the execution flow'
      }
    ],
    outputs: [
      {
        name: 'success',
        type: OutputType.SUCCESS,
        description: 'Successful deployment'
      },
      {
        name: 'error',
        type: OutputType.ERROR,
        description: 'Failed deployment'
      },
      {
        name: 'contract_address',
        type: OutputType.CONTRACT_ADDRESS,
        description: 'Address of deployed contract'
      },
      {
        name: 'transaction_hash',
        type: OutputType.TRANSACTION_HASH,
        description: 'Deployment transaction hash'
      }
    ],
    configSchema: [
      {
        name: 'bytecode',
        label: 'Contract Bytecode',
        type: 'textarea',
        required: true,
        description: 'Compiled contract bytecode',
        placeholder: '0x608060405234801561001057600080fd5b50...'
      },
      {
        name: 'constructorArgs',
        label: 'Constructor Arguments',
        type: 'textarea',
        required: false,
        description: 'JSON array of constructor arguments',
        placeholder: '["MyToken", "MTK", 18]'
      },
      {
        name: 'value',
        label: 'ETH Value (wei)',
        type: 'bigint',
        required: false,
        description: 'Amount of ETH to send with deployment',
        placeholder: '0'
      },
      {
        name: 'gasLimit',
        label: 'Gas Limit',
        type: 'number',
        required: false,
        description: 'Maximum gas for deployment',
        placeholder: '2000000'
      }
    ],
    defaultConfig: {
      bytecode: '',
      constructorArgs: [],
      value: BigInt(0),
      gasLimit: 2000000
    }
  },

  [BlockType.TOKEN_TRANSFER]: {
    type: BlockType.TOKEN_TRANSFER,
    name: 'Token Transfer',
    description: 'Transfer tokens to another address',
    icon: Send,
    category: 'Token Operations',
    inputs: [
      {
        name: 'execution_flow',
        type: InputType.EXECUTION_FLOW,
        required: false,
        description: 'Previous step in the execution flow'
      }
    ],
    outputs: [
      {
        name: 'success',
        type: OutputType.SUCCESS,
        description: 'Successful transfer'
      },
      {
        name: 'error',
        type: OutputType.ERROR,
        description: 'Failed transfer'
      },
      {
        name: 'transaction_hash',
        type: OutputType.TRANSACTION_HASH,
        description: 'Transfer transaction hash'
      }
    ],
    configSchema: [
      {
        name: 'tokenAddress',
        label: 'Token Contract',
        type: 'address',
        required: true,
        description: 'Address of the token contract',
        placeholder: '0x...'
      },
      {
        name: 'recipient',
        label: 'Recipient Address',
        type: 'address',
        required: true,
        description: 'Address to receive the tokens',
        placeholder: '0x...'
      },
      {
        name: 'amount',
        label: 'Amount',
        type: 'bigint',
        required: true,
        description: 'Amount of tokens to transfer (in smallest unit)',
        placeholder: '1000000000000000000'
      }
    ],
    defaultConfig: {
      tokenAddress: '',
      recipient: '',
      amount: BigInt(0)
    },
    examples: [
      'Send USDC to user',
      'Distribute rewards',
      'Move tokens between accounts'
    ]
  },

  [BlockType.TOKEN_APPROVAL]: {
    type: BlockType.TOKEN_APPROVAL,
    name: 'Token Approval',
    description: 'Approve another address to spend tokens',
    icon: Shield,
    category: 'Token Operations',
    inputs: [
      {
        name: 'execution_flow',
        type: InputType.EXECUTION_FLOW,
        required: false,
        description: 'Previous step in the execution flow'
      }
    ],
    outputs: [
      {
        name: 'success',
        type: OutputType.SUCCESS,
        description: 'Successful approval'
      },
      {
        name: 'error',
        type: OutputType.ERROR,
        description: 'Failed approval'
      },
      {
        name: 'transaction_hash',
        type: OutputType.TRANSACTION_HASH,
        description: 'Approval transaction hash'
      }
    ],
    configSchema: [
      {
        name: 'tokenAddress',
        label: 'Token Contract',
        type: 'address',
        required: true,
        description: 'Address of the token contract'
      },
      {
        name: 'spender',
        label: 'Spender Address',
        type: 'address',
        required: true,
        description: 'Address that will be approved to spend tokens'
      },
      {
        name: 'amount',
        label: 'Allowance Amount',
        type: 'bigint',
        required: true,
        description: 'Maximum amount the spender can use'
      },
      {
        name: 'unlimited',
        label: 'Unlimited Approval',
        type: 'boolean',
        required: false,
        description: 'Grant unlimited spending approval (use with caution)'
      }
    ],
    defaultConfig: {
      tokenAddress: '',
      spender: '',
      amount: BigInt(0),
      unlimited: false
    },
    examples: [
      'Approve DEX router',
      'Allow contract to spend tokens',
      'Set up automated payments'
    ]
  },

  [BlockType.ATOMIC_SWAP]: {
    type: BlockType.ATOMIC_SWAP,
    name: 'Atomic Swap',
    description: 'Execute an atomic token swap between two parties',
    icon: ArrowRightLeft,
    category: 'Token Operations',
    inputs: [
      {
        name: 'execution_flow',
        type: InputType.EXECUTION_FLOW,
        required: false,
        description: 'Previous step in the execution flow'
      }
    ],
    outputs: [
      {
        name: 'success',
        type: OutputType.SUCCESS,
        description: 'Successful swap'
      },
      {
        name: 'error',
        type: OutputType.ERROR,
        description: 'Failed swap'
      },
      {
        name: 'transaction_hash',
        type: OutputType.TRANSACTION_HASH,
        description: 'Swap transaction hash'
      }
    ],
    configSchema: [
      {
        name: 'tokenA',
        label: 'Token A Address',
        type: 'address',
        required: true,
        description: 'First token in the swap'
      },
      {
        name: 'tokenB',
        label: 'Token B Address',
        type: 'address',
        required: true,
        description: 'Second token in the swap'
      },
      {
        name: 'amountA',
        label: 'Amount A',
        type: 'bigint',
        required: true,
        description: 'Amount of Token A to swap'
      },
      {
        name: 'amountB',
        label: 'Amount B',
        type: 'bigint',
        required: true,
        description: 'Amount of Token B to receive'
      },
      {
        name: 'participant2',
        label: 'Second Participant',
        type: 'address',
        required: true,
        description: 'Address of the other party in the swap'
      },
      {
        name: 'deadline',
        label: 'Deadline (timestamp)',
        type: 'number',
        required: true,
        description: 'Unix timestamp when the swap expires'
      },
      {
        name: 'slippageTolerance',
        label: 'Slippage Tolerance (%)',
        type: 'number',
        required: false,
        description: 'Maximum acceptable price change',
        placeholder: '5'
      }
    ],
    defaultConfig: {
      tokenA: '',
      tokenB: '',
      amountA: BigInt(0),
      amountB: BigInt(0),
      participant2: '',
      deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      slippageTolerance: 5
    }
  },

  [BlockType.CONDITIONAL]: {
    type: BlockType.CONDITIONAL,
    name: 'Conditional',
    description: 'Execute different paths based on a condition',
    icon: GitBranch,
    category: 'Control Flow',
    inputs: [
      {
        name: 'execution_flow',
        type: InputType.EXECUTION_FLOW,
        required: true,
        description: 'Execution flow to evaluate'
      },
      {
        name: 'condition_value',
        type: InputType.OBJECT,
        required: false,
        description: 'Value to evaluate in condition'
      }
    ],
    outputs: [
      {
        name: 'true_path',
        type: OutputType.EXECUTION_FLOW,
        description: 'Path taken when condition is true'
      },
      {
        name: 'false_path',
        type: OutputType.EXECUTION_FLOW,
        description: 'Path taken when condition is false'
      },
      {
        name: 'error',
        type: OutputType.ERROR,
        description: 'Error in condition evaluation'
      }
    ],
    configSchema: [
      {
        name: 'conditionType',
        label: 'Condition Type',
        type: 'select',
        required: true,
        description: 'Type of condition to evaluate',
        options: [
          { label: 'Balance Check', value: 'balance' },
          { label: 'Transaction Success', value: 'tx_success' },
          { label: 'Value Comparison', value: 'value_compare' },
          { label: 'Time Check', value: 'time_check' },
          { label: 'Custom Expression', value: 'expression' }
        ]
      },
      {
        name: 'expression',
        label: 'Condition Expression',
        type: 'text',
        required: true,
        description: 'Boolean expression to evaluate',
        placeholder: 'balance > 1000000000000000000'
      },
      {
        name: 'description',
        label: 'Description',
        type: 'text',
        required: false,
        description: 'Human readable condition description'
      }
    ],
    defaultConfig: {
      conditionType: 'balance',
      expression: '',
      description: ''
    }
  },

  [BlockType.LOOP]: {
    type: BlockType.LOOP,
    name: 'Loop',
    description: 'Repeat operations multiple times',
    icon: RotateCcw,
    category: 'Control Flow',
    inputs: [
      {
        name: 'execution_flow',
        type: InputType.EXECUTION_FLOW,
        required: true,
        description: 'Execution flow to loop'
      }
    ],
    outputs: [
      {
        name: 'iteration',
        type: OutputType.EXECUTION_FLOW,
        description: 'Each iteration of the loop'
      },
      {
        name: 'complete',
        type: OutputType.EXECUTION_FLOW,
        description: 'After all iterations complete'
      },
      {
        name: 'error',
        type: OutputType.ERROR,
        description: 'Error during loop execution'
      }
    ],
    configSchema: [
      {
        name: 'loopType',
        label: 'Loop Type',
        type: 'select',
        required: true,
        description: 'Type of loop to execute',
        options: [
          { label: 'Fixed Count', value: 'count' },
          { label: 'While Condition', value: 'while' },
          { label: 'For Each Item', value: 'foreach' }
        ]
      },
      {
        name: 'iterations',
        label: 'Number of Iterations',
        type: 'number',
        required: false,
        description: 'How many times to repeat (for count loops)',
        showWhen: (config) => config.loopType === 'count'
      },
      {
        name: 'condition',
        label: 'Continue Condition',
        type: 'text',
        required: false,
        description: 'Condition to continue looping (for while loops)',
        showWhen: (config) => config.loopType === 'while'
      },
      {
        name: 'items',
        label: 'Items to Process',
        type: 'textarea',
        required: false,
        description: 'JSON array of items to process (for foreach loops)',
        showWhen: (config) => config.loopType === 'foreach'
      }
    ],
    defaultConfig: {
      loopType: 'count',
      iterations: 1,
      condition: '',
      items: []
    }
  },

  [BlockType.DELAY]: {
    type: BlockType.DELAY,
    name: 'Delay',
    description: 'Wait for a specified amount of time',
    icon: Clock,
    category: 'Control Flow',
    inputs: [
      {
        name: 'execution_flow',
        type: InputType.EXECUTION_FLOW,
        required: true,
        description: 'Execution flow to delay'
      }
    ],
    outputs: [
      {
        name: 'continue',
        type: OutputType.EXECUTION_FLOW,
        description: 'Continue after delay'
      }
    ],
    configSchema: [
      {
        name: 'delayType',
        label: 'Delay Type',
        type: 'select',
        required: true,
        description: 'Type of delay to apply',
        options: [
          { label: 'Time Duration', value: 'duration' },
          { label: 'Block Count', value: 'blocks' },
          { label: 'Specific Time', value: 'timestamp' }
        ]
      },
      {
        name: 'duration',
        label: 'Duration (seconds)',
        type: 'number',
        required: false,
        description: 'How long to wait in seconds',
        showWhen: (config) => config.delayType === 'duration'
      },
      {
        name: 'blocks',
        label: 'Block Count',
        type: 'number',
        required: false,
        description: 'How many blocks to wait',
        showWhen: (config) => config.delayType === 'blocks'
      },
      {
        name: 'timestamp',
        label: 'Target Timestamp',
        type: 'number',
        required: false,
        description: 'Unix timestamp to wait until',
        showWhen: (config) => config.delayType === 'timestamp'
      }
    ],
    defaultConfig: {
      delayType: 'duration',
      duration: 60,
      blocks: 1,
      timestamp: Math.floor(Date.now() / 1000) + 3600
    }
  },

  [BlockType.USER_INPUT]: {
    type: BlockType.USER_INPUT,
    name: 'User Input',
    description: 'Wait for user input or approval',
    icon: User,
    category: 'User Interaction',
    inputs: [
      {
        name: 'execution_flow',
        type: InputType.EXECUTION_FLOW,
        required: true,
        description: 'Execution flow that requires user input'
      }
    ],
    outputs: [
      {
        name: 'approved',
        type: OutputType.EXECUTION_FLOW,
        description: 'User approved/provided input'
      },
      {
        name: 'rejected',
        type: OutputType.EXECUTION_FLOW,
        description: 'User rejected/cancelled'
      },
      {
        name: 'user_data',
        type: OutputType.DATA,
        description: 'Data provided by user'
      }
    ],
    configSchema: [
      {
        name: 'inputType',
        label: 'Input Type',
        type: 'select',
        required: true,
        description: 'Type of input required from user',
        options: [
          { label: 'Simple Approval', value: 'approval' },
          { label: 'Text Input', value: 'text' },
          { label: 'Number Input', value: 'number' },
          { label: 'Address Input', value: 'address' },
          { label: 'Multiple Choice', value: 'choice' }
        ]
      },
      {
        name: 'prompt',
        label: 'User Prompt',
        type: 'text',
        required: true,
        description: 'Message to display to user',
        placeholder: 'Please confirm this action'
      },
      {
        name: 'timeout',
        label: 'Timeout (seconds)',
        type: 'number',
        required: false,
        description: 'How long to wait for user input (0 = no timeout)',
        placeholder: '300'
      }
    ],
    defaultConfig: {
      inputType: 'approval',
      prompt: 'Please confirm this action',
      timeout: 300
    }
  },

  [BlockType.MULTI_SIG]: {
    type: BlockType.MULTI_SIG,
    name: 'Multi-Sig',
    description: 'Require multiple signatures for approval',
    icon: Users,
    category: 'User Interaction',
    inputs: [
      {
        name: 'execution_flow',
        type: InputType.EXECUTION_FLOW,
        required: true,
        description: 'Execution flow requiring multi-sig approval'
      }
    ],
    outputs: [
      {
        name: 'approved',
        type: OutputType.EXECUTION_FLOW,
        description: 'Required signatures obtained'
      },
      {
        name: 'rejected',
        type: OutputType.EXECUTION_FLOW,
        description: 'Insufficient signatures or timeout'
      }
    ],
    configSchema: [
      {
        name: 'signers',
        label: 'Required Signers',
        type: 'textarea',
        required: true,
        description: 'JSON array of addresses that can sign',
        placeholder: '["0x...", "0x...", "0x..."]'
      },
      {
        name: 'threshold',
        label: 'Signature Threshold',
        type: 'number',
        required: true,
        description: 'Minimum number of signatures required'
      },
      {
        name: 'timeout',
        label: 'Timeout (hours)',
        type: 'number',
        required: false,
        description: 'How long to wait for signatures',
        placeholder: '24'
      }
    ],
    defaultConfig: {
      signers: [],
      threshold: 2,
      timeout: 24
    }
  },

  [BlockType.VARIABLE]: {
    type: BlockType.VARIABLE,
    name: 'Variable',
    description: 'Store and retrieve values',
    icon: Calculator,
    category: 'Utility',
    inputs: [
      {
        name: 'value_input',
        type: InputType.OBJECT,
        required: false,
        description: 'Value to store in variable'
      }
    ],
    outputs: [
      {
        name: 'value_output',
        type: OutputType.DATA,
        description: 'Current variable value'
      }
    ],
    configSchema: [
      {
        name: 'variableName',
        label: 'Variable Name',
        type: 'text',
        required: true,
        description: 'Name of the variable'
      },
      {
        name: 'variableType',
        label: 'Variable Type',
        type: 'select',
        required: true,
        description: 'Type of data to store',
        options: [
          { label: 'String', value: 'string' },
          { label: 'Number', value: 'number' },
          { label: 'Address', value: 'address' },
          { label: 'BigInt', value: 'bigint' },
          { label: 'Boolean', value: 'boolean' },
          { label: 'Array', value: 'array' },
          { label: 'Object', value: 'object' }
        ]
      },
      {
        name: 'initialValue',
        label: 'Initial Value',
        type: 'text',
        required: false,
        description: 'Starting value for the variable'
      }
    ],
    defaultConfig: {
      variableName: '',
      variableType: 'string',
      initialValue: ''
    }
  },

  [BlockType.CALCULATION]: {
    type: BlockType.CALCULATION,
    name: 'Calculation',
    description: 'Perform mathematical operations',
    icon: Calculator,
    category: 'Utility',
    inputs: [
      {
        name: 'input_a',
        type: InputType.NUMBER,
        required: true,
        description: 'First operand'
      },
      {
        name: 'input_b',
        type: InputType.NUMBER,
        required: false,
        description: 'Second operand (if needed)'
      }
    ],
    outputs: [
      {
        name: 'result',
        type: OutputType.DATA,
        description: 'Calculation result'
      }
    ],
    configSchema: [
      {
        name: 'operation',
        label: 'Operation',
        type: 'select',
        required: true,
        description: 'Mathematical operation to perform',
        options: [
          { label: 'Add (+)', value: 'add' },
          { label: 'Subtract (-)', value: 'subtract' },
          { label: 'Multiply (×)', value: 'multiply' },
          { label: 'Divide (÷)', value: 'divide' },
          { label: 'Power (^)', value: 'power' },
          { label: 'Percentage (%)', value: 'percentage' },
          { label: 'Square Root', value: 'sqrt' },
          { label: 'Absolute Value', value: 'abs' }
        ]
      },
      {
        name: 'precision',
        label: 'Decimal Precision',
        type: 'number',
        required: false,
        description: 'Number of decimal places in result',
        placeholder: '18'
      }
    ],
    defaultConfig: {
      operation: 'add',
      precision: 18
    }
  },

  [BlockType.VALIDATION]: {
    type: BlockType.VALIDATION,
    name: 'Validation',
    description: 'Validate data and conditions',
    icon: CheckCircle,
    category: 'Utility',
    inputs: [
      {
        name: 'data_input',
        type: InputType.OBJECT,
        required: true,
        description: 'Data to validate'
      }
    ],
    outputs: [
      {
        name: 'valid',
        type: OutputType.EXECUTION_FLOW,
        description: 'Data is valid'
      },
      {
        name: 'invalid',
        type: OutputType.EXECUTION_FLOW,
        description: 'Data is invalid'
      },
      {
        name: 'validation_result',
        type: OutputType.DATA,
        description: 'Detailed validation results'
      }
    ],
    configSchema: [
      {
        name: 'validationType',
        label: 'Validation Type',
        type: 'select',
        required: true,
        description: 'Type of validation to perform',
        options: [
          { label: 'Address Format', value: 'address' },
          { label: 'Number Range', value: 'range' },
          { label: 'String Pattern', value: 'pattern' },
          { label: 'Array Length', value: 'array_length' },
          { label: 'Custom Rule', value: 'custom' }
        ]
      },
      {
        name: 'rules',
        label: 'Validation Rules',
        type: 'textarea',
        required: true,
        description: 'JSON configuration for validation rules',
        placeholder: '{"min": 0, "max": 1000}'
      }
    ],
    defaultConfig: {
      validationType: 'address',
      rules: '{}'
    }
  }
}

// Helper functions
export function getBlockDefinition(type: BlockType): BlockDefinition {
  return BLOCK_DEFINITIONS[type]
}

export function getBlocksByCategory(): Record<string, BlockDefinition[]> {
  const categories: Record<string, BlockDefinition[]> = {}
  
  Object.values(BLOCK_DEFINITIONS).forEach(blockDef => {
    if (!categories[blockDef.category]) {
      categories[blockDef.category] = []
    }
    categories[blockDef.category].push(blockDef)
  })
  
  return categories
}

export function validateBlockConfig(blockType: BlockType, config: any): ValidationResult {
  const blockDef = getBlockDefinition(blockType)
  const errors: string[] = []
  
  blockDef.configSchema.forEach(field => {
    const value = config[field.name]
    
    // Check required fields
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field.label} is required`)
      return
    }
    
    // Run field-specific validation
    if (value !== undefined && field.validation) {
      field.validation.forEach(rule => {
        switch (rule.type) {
          case 'pattern':
            if (typeof value === 'string' && rule.value instanceof RegExp && !rule.value.test(value)) {
              errors.push(rule.message)
            }
            break
            
          case 'min':
            if (typeof value === 'number' && value < rule.value) {
              errors.push(rule.message)
            }
            break
            
          case 'max':
            if (typeof value === 'number' && value > rule.value) {
              errors.push(rule.message)
            }
            break
            
          case 'custom':
            if (rule.validator && !rule.validator(value, config)) {
              errors.push(rule.message)
            }
            break
        }
      })
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors: errors.map(msg => ({ field: '', message: msg, code: 'VALIDATION_ERROR' })),
    warnings: []
  }
}

interface ValidationResult {
  isValid: boolean
  errors: { field: string; message: string; code: string }[]
  warnings: { field: string; message: string; code: string }[]
}

export const BLOCK_CATEGORIES = [
  {
    name: 'Contract Operations',
    description: 'Deploy and interact with smart contracts',
    blocks: [BlockType.CONTRACT_CALL, BlockType.CONTRACT_DEPLOY]
  },
  {
    name: 'Token Operations', 
    description: 'Handle token transfers, approvals, and swaps',
    blocks: [BlockType.TOKEN_TRANSFER, BlockType.TOKEN_APPROVAL, BlockType.ATOMIC_SWAP]
  },
  {
    name: 'Control Flow',
    description: 'Control the execution flow with conditions and loops',
    blocks: [BlockType.CONDITIONAL, BlockType.LOOP, BlockType.DELAY]
  },
  {
    name: 'User Interaction',
    description: 'Require user input or multi-party approval',
    blocks: [BlockType.USER_INPUT, BlockType.MULTI_SIG]
  },
  {
    name: 'Utility',
    description: 'Variables, calculations, and validation',
    blocks: [BlockType.VARIABLE, BlockType.CALCULATION, BlockType.VALIDATION]
  }
]