import { ContractType, ConstructorArg, PostDeployAction } from './multiDeployment'

export interface ContractTemplate {
  type: ContractType
  name: string
  description: string
  version: string
  bytecode: string
  abi: any[]
  constructorSchema: ConstructorArgSchema[]
  defaultPostDeployActions: PostDeployAction[]
  gasEstimate: bigint
  features: string[]
  documentation: string
}

export interface ConstructorArgSchema {
  name: string
  type: 'address' | 'uint256' | 'string' | 'bool' | 'bytes32' | 'address[]' | 'uint256[]'
  description: string
  required: boolean
  defaultValue?: any
  validation?: {
    min?: bigint
    max?: bigint
    pattern?: string
    options?: string[]
  }
  dependencyType?: ContractType // If this arg should be an address of specific contract type
}

class ContractTemplateService {
  private templates: Map<ContractType, ContractTemplate> = new Map()

  constructor() {
    this.initializeBuiltInTemplates()
  }

  private initializeBuiltInTemplates() {
    // ERC20 Token Template
    this.templates.set('ERC20', {
      type: 'ERC20',
      name: 'Standard ERC20 Token',
      description: 'A standard ERC20 fungible token with mint, burn, and pause capabilities',
      version: '1.0.0',
      bytecode: ERC20_BYTECODE,
      abi: ERC20_ABI,
      constructorSchema: [
        {
          name: 'name',
          type: 'string',
          description: 'Token name (e.g., "My Token")',
          required: true,
          defaultValue: 'Test Token'
        },
        {
          name: 'symbol',
          type: 'string',
          description: 'Token symbol (e.g., "MTK")',
          required: true,
          defaultValue: 'TEST'
        },
        {
          name: 'decimals',
          type: 'uint256',
          description: 'Number of decimals',
          required: true,
          defaultValue: 18,
          validation: { min: BigInt(0), max: BigInt(18) }
        },
        {
          name: 'initialSupply',
          type: 'uint256',
          description: 'Initial token supply',
          required: true,
          defaultValue: BigInt(1000000) * BigInt(10) ** BigInt(18) // 1M tokens
        },
        {
          name: 'owner',
          type: 'address',
          description: 'Token owner address',
          required: true
        }
      ],
      defaultPostDeployActions: [],
      gasEstimate: BigInt(2500000),
      features: ['mintable', 'burnable', 'pausable', 'ownable'],
      documentation: 'Standard ERC20 token implementation with additional features for testing and development'
    })

    // ERC1155 Multi-Token Template
    this.templates.set('ERC1155', {
      type: 'ERC1155',
      name: 'Multi-Token Standard (ERC1155)',
      description: 'ERC1155 multi-token contract supporting both fungible and non-fungible tokens',
      version: '1.0.0',
      bytecode: ERC1155_BYTECODE,
      abi: ERC1155_ABI,
      constructorSchema: [
        {
          name: 'uri',
          type: 'string',
          description: 'Base URI for token metadata',
          required: true,
          defaultValue: 'https://api.example.com/token/{id}.json'
        },
        {
          name: 'owner',
          type: 'address',
          description: 'Contract owner address',
          required: true
        }
      ],
      defaultPostDeployActions: [],
      gasEstimate: BigInt(3000000),
      features: ['batch_operations', 'metadata_uri', 'mintable', 'burnable'],
      documentation: 'ERC1155 implementation supporting both fungible and non-fungible tokens in a single contract'
    })

    // Settlement Contract Template
    this.templates.set('Settlement', {
      type: 'Settlement',
      name: 'Atomic Swap Settlement',
      description: 'Contract for handling atomic swaps between different token types',
      version: '1.0.0',
      bytecode: SETTLEMENT_BYTECODE,
      abi: SETTLEMENT_ABI,
      constructorSchema: [
        {
          name: 'feeCollector',
          type: 'address',
          description: 'Address to collect settlement fees',
          required: true
        },
        {
          name: 'feeRate',
          type: 'uint256',
          description: 'Fee rate in basis points (100 = 1%)',
          required: true,
          defaultValue: BigInt(50), // 0.5%
          validation: { min: BigInt(0), max: BigInt(1000) }
        },
        {
          name: 'timelock',
          type: 'uint256',
          description: 'Default timelock period in seconds',
          required: true,
          defaultValue: BigInt(86400) // 24 hours
        }
      ],
      defaultPostDeployActions: [],
      gasEstimate: BigInt(3500000),
      features: ['atomic_swaps', 'escrow', 'timelock', 'fee_collection'],
      documentation: 'Settlement contract for atomic token swaps with escrow and timelock functionality'
    })

    // Access Control Template
    this.templates.set('AccessControl', {
      type: 'AccessControl',
      name: 'Role-Based Access Control',
      description: 'Contract for managing roles and permissions across multiple contracts',
      version: '1.0.0',
      bytecode: ACCESS_CONTROL_BYTECODE,
      abi: ACCESS_CONTROL_ABI,
      constructorSchema: [
        {
          name: 'admin',
          type: 'address',
          description: 'Initial admin address',
          required: true
        }
      ],
      defaultPostDeployActions: [
        {
          type: 'function_call',
          target: '', // Will be set to self
          function: 'setupRoles',
          args: [],
          description: 'Initialize default roles'
        }
      ],
      gasEstimate: BigInt(2000000),
      features: ['rbac', 'hierarchical_roles', 'permission_delegation'],
      documentation: 'Comprehensive access control system with role-based permissions'
    })

    // Registry Contract Template
    this.templates.set('Registry', {
      type: 'Registry',
      name: 'Contract Registry',
      description: 'Registry for tracking and discovering deployed contracts',
      version: '1.0.0',
      bytecode: REGISTRY_BYTECODE,
      abi: REGISTRY_ABI,
      constructorSchema: [
        {
          name: 'owner',
          type: 'address',
          description: 'Registry owner address',
          required: true
        }
      ],
      defaultPostDeployActions: [],
      gasEstimate: BigInt(1500000),
      features: ['contract_discovery', 'metadata_storage', 'version_tracking'],
      documentation: 'Central registry for contract discovery and metadata management'
    })
  }

  getTemplate(type: ContractType): ContractTemplate | null {
    return this.templates.get(type) || null
  }

  getAllTemplates(): ContractTemplate[] {
    return Array.from(this.templates.values())
  }

  getTemplatesByFeature(feature: string): ContractTemplate[] {
    return Array.from(this.templates.values()).filter(template =>
      template.features.includes(feature)
    )
  }

  validateConstructorArgs(type: ContractType, args: ConstructorArg[]): { valid: boolean; errors: string[] } {
    const template = this.getTemplate(type)
    if (!template) {
      return { valid: false, errors: ['Unknown contract type'] }
    }

    const errors: string[] = []
    const providedArgs = new Map(args.map(arg => [arg.name, arg]))

    // Check required arguments
    for (const schema of template.constructorSchema) {
      if (schema.required && !providedArgs.has(schema.name)) {
        errors.push(`Missing required argument: ${schema.name}`)
        continue
      }

      const arg = providedArgs.get(schema.name)
      if (!arg) continue

      // Validate argument type
      if (arg.type !== schema.type) {
        errors.push(`Argument ${schema.name} has wrong type. Expected ${schema.type}, got ${arg.type}`)
      }

      // Validate argument value based on schema
      if (schema.validation && arg.value !== undefined && !arg.isDependency) {
        const validation = schema.validation
        
        if (validation.min !== undefined && BigInt(arg.value) < validation.min) {
          errors.push(`Argument ${schema.name} is below minimum value ${validation.min}`)
        }
        
        if (validation.max !== undefined && BigInt(arg.value) > validation.max) {
          errors.push(`Argument ${schema.name} exceeds maximum value ${validation.max}`)
        }
        
        if (validation.options && !validation.options.includes(arg.value)) {
          errors.push(`Argument ${schema.name} must be one of: ${validation.options.join(', ')}`)
        }
        
        if (validation.pattern) {
          const regex = new RegExp(validation.pattern)
          if (!regex.test(arg.value)) {
            errors.push(`Argument ${schema.name} does not match required pattern`)
          }
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }

  createContractConfig(
    type: ContractType,
    name: string,
    customArgs?: Partial<ConstructorArg>[],
    dependencies?: string[]
  ): import('./multiDeployment').ContractConfig {
    const template = this.getTemplate(type)
    if (!template) {
      throw new Error(`Unknown contract type: ${type}`)
    }

    // Build constructor args from template schema and custom overrides
    const constructorArgs: ConstructorArg[] = template.constructorSchema.map(schema => {
      const custom = customArgs?.find(arg => arg.name === schema.name)
      
      return {
        name: schema.name,
        type: schema.type,
        value: custom?.value ?? schema.defaultValue,
        isDependency: custom?.isDependency ?? false,
        dependsOn: custom?.dependsOn
      }
    })

    return {
      id: `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      name,
      constructorArgs,
      dependencies: dependencies || [],
      postDeployActions: template.defaultPostDeployActions,
      metadata: {
        description: template.description,
        version: template.version,
        tags: template.features,
        bytecode: template.bytecode,
        abi: template.abi
      }
    }
  }

  estimateDeploymentGas(type: ContractType): bigint {
    const template = this.getTemplate(type)
    return template?.gasEstimate || BigInt(2000000)
  }

  getContractDocumentation(type: ContractType): string | null {
    const template = this.getTemplate(type)
    return template?.documentation || null
  }
}

// Contract bytecode and ABI constants (these would be imported from compiled contracts)
const ERC20_BYTECODE = '0x608060405234801561001057600080fd5b50...' // Placeholder
const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "name_", "type": "string"},
      {"internalType": "string", "name": "symbol_", "type": "string"},
      {"internalType": "uint8", "name": "decimals_", "type": "uint8"},
      {"internalType": "uint256", "name": "initialSupply_", "type": "uint256"},
      {"internalType": "address", "name": "owner_", "type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  // ... rest of ABI
]

const ERC1155_BYTECODE = '0x608060405234801561001057600080fd5b50...' // Placeholder
const ERC1155_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "uri_", "type": "string"},
      {"internalType": "address", "name": "owner_", "type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  // ... rest of ABI
]

const SETTLEMENT_BYTECODE = '0x608060405234801561001057600080fd5b50...' // Placeholder
const SETTLEMENT_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "feeCollector_", "type": "address"},
      {"internalType": "uint256", "name": "feeRate_", "type": "uint256"},
      {"internalType": "uint256", "name": "timelock_", "type": "uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  // ... rest of ABI
]

const ACCESS_CONTROL_BYTECODE = '0x608060405234801561001057600080fd5b50...' // Placeholder
const ACCESS_CONTROL_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "admin_", "type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  // ... rest of ABI
]

const REGISTRY_BYTECODE = '0x608060405234801561001057600080fd5b50...' // Placeholder
const REGISTRY_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "owner_", "type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  // ... rest of ABI
]

export const contractTemplateService = new ContractTemplateService()
export default contractTemplateService