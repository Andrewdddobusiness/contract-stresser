import type { Address, Hash } from 'viem'

// Core contract metadata types
export interface ContractMetadata {
  id: string
  name: string
  symbol: string
  address: Address
  network: string
  chainId: number
  decimals: number
  totalSupply: string
  deployedAt: Date
  deployerAddress: Address
  txHash: Hash
  blockNumber?: bigint
  gasUsed?: bigint
  deploymentCost?: bigint
  verified?: boolean
  tags?: string[]
  description?: string
}

// Contract ABI types
export interface ContractFunction {
  name: string
  type: 'function'
  inputs: Array<{
    name: string
    type: string
    internalType?: string
  }>
  outputs: Array<{
    name: string
    type: string
    internalType?: string
  }>
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable'
}

export interface ContractEvent {
  name: string
  type: 'event'
  inputs: Array<{
    name: string
    type: string
    indexed: boolean
    internalType?: string
  }>
  anonymous?: boolean
}

export interface ContractError {
  name: string
  type: 'error'
  inputs: Array<{
    name: string
    type: string
    internalType?: string
  }>
}

export type ContractAbiItem = ContractFunction | ContractEvent | ContractError

// Contract deployment parameters
export interface DeploymentParams {
  name: string
  symbol: string
  decimals: number
  totalSupply: string
  network: 'local' | 'sepolia'
  deployerPrivateKey?: `0x${string}`
}

// Contract interaction types
export interface ContractCall {
  id: string
  contractAddress: Address
  functionName: string
  args: unknown[]
  result?: unknown
  error?: string
  timestamp: Date
  txHash?: Hash
  gasUsed?: bigint
}

export interface ContractTransaction {
  id: string
  contractAddress: Address
  functionName: string
  args: unknown[]
  txHash: Hash
  status: 'pending' | 'confirmed' | 'failed'
  gasUsed?: bigint
  gasPrice?: bigint
  timestamp: Date
  confirmations?: number
  error?: string
}

// Contract registry types
export interface ContractRegistry {
  contracts: ContractMetadata[]
  lastUpdated: Date
  version: string
}

// Import/Export types
export interface ImportContractParams {
  address: Address
  network: string
  name?: string
  symbol?: string
  customAbi?: ContractAbiItem[]
}

export interface ContractImportResult {
  success: boolean
  contract?: ContractMetadata
  error?: string
}

// Search and filter types
export interface ContractSearchFilters {
  network?: string
  name?: string
  symbol?: string
  deployerAddress?: Address
  dateFrom?: Date
  dateTo?: Date
  tags?: string[]
  verified?: boolean
}

export interface ContractSearchResult {
  contracts: ContractMetadata[]
  totalCount: number
  page: number
  pageSize: number
}

// Contract statistics
export interface ContractStats {
  totalContracts: number
  contractsByNetwork: Record<string, number>
  recentDeployments: number
  totalGasUsed: bigint
  totalDeploymentCost: bigint
  averageGasPrice: bigint
  mostUsedNetworks: Array<{
    network: string
    count: number
  }>
  deploymentTrends: Array<{
    date: string
    count: number
  }>
}

// Contract verification
export interface ContractVerification {
  contractAddress: Address
  isVerified: boolean
  sourceCode?: string
  compilerVersion?: string
  optimizationUsed?: boolean
  optimizationRuns?: number
  verifiedAt?: Date
  verificationSource?: 'etherscan' | 'sourcify' | 'manual'
}

// Network configuration
export interface NetworkConfig {
  id: string
  name: string
  chainId: number
  rpcUrl: string
  explorerUrl?: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  isTestnet: boolean
  color: string
  icon?: string
}

// Contract interaction history
export interface ContractInteraction {
  id: string
  contractAddress: Address
  contractName: string
  functionName: string
  functionType: 'read' | 'write'
  args: Record<string, unknown>
  result?: unknown
  txHash?: Hash
  gasUsed?: bigint
  gasPrice?: bigint
  status: 'success' | 'failed' | 'pending'
  error?: string
  timestamp: Date
  userAddress?: Address
}

// Batch operations
export interface BatchOperation {
  id: string
  type: 'deploy' | 'call' | 'transaction'
  operations: Array<{
    id: string
    status: 'pending' | 'completed' | 'failed'
    result?: unknown
    error?: string
  }>
  createdAt: Date
  completedAt?: Date
  totalOperations: number
  successfulOperations: number
  failedOperations: number
}

// Contract templates
export interface ContractTemplate {
  id: string
  name: string
  description: string
  category: 'token' | 'nft' | 'governance' | 'defi' | 'utility'
  sourceCode: string
  abi: ContractAbiItem[]
  bytecode: `0x${string}`
  constructorParams: Array<{
    name: string
    type: string
    description: string
    defaultValue?: string
  }>
  tags: string[]
  author: string
  version: string
  license: string
  createdAt: Date
  updatedAt: Date
}

// Contract monitoring
export interface ContractMonitor {
  id: string
  contractAddress: Address
  contractName: string
  events: string[]
  webhookUrl?: string
  emailNotifications?: boolean
  isActive: boolean
  createdAt: Date
  lastTriggered?: Date
  totalTriggers: number
}

// Error types
export class ContractError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ContractError'
  }
}

export class DeploymentError extends ContractError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DEPLOYMENT_ERROR', details)
    this.name = 'DeploymentError'
  }
}

export class ContractNotFoundError extends ContractError {
  constructor(address: Address) {
    super(`Contract not found at address ${address}`, 'CONTRACT_NOT_FOUND', { address })
    this.name = 'ContractNotFoundError'
  }
}