import type { Address, Hash } from 'viem'

export interface TestScenario {
  id: string
  name: string
  description: string
  type: 'sequential' | 'concurrent' | 'multi-user'
  template: boolean
  config: TestConfiguration
}

export interface TestConfiguration {
  // Basic test settings
  contractAddress: Address
  functionName: string
  functionArgs: any[]
  iterations: number
  
  // Execution mode
  mode: 'sequential' | 'concurrent' | 'multi-user'
  
  // Account settings
  accountCount: number
  useMultipleAccounts: boolean
  fundingAmount: string // ETH amount per account
  
  // Timing settings
  delayBetweenTx: number // milliseconds
  batchSize?: number // for batched operations
  concurrencyLimit?: number // max concurrent transactions
  
  // Gas settings
  gasLimit?: bigint
  gasPrice?: bigint
  gasPriceTier: 'slow' | 'normal' | 'fast'
  
  // Advanced options
  stopOnError: boolean
  retryFailedTx: boolean
  maxRetries: number
  timeoutMs: number
}

export interface TestExecution {
  id: string
  name: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  config: TestConfiguration
  
  // Progress tracking
  startTime?: Date
  endTime?: Date
  currentIteration: number
  totalIterations: number
  successCount: number
  failureCount: number
  
  // Performance metrics
  avgGasUsed?: bigint
  avgGasPrice?: bigint
  totalCost?: bigint
  avgConfirmationTime?: number
  transactionsPerSecond?: number
  
  // Error tracking
  errors: TestError[]
  lastError?: string
}

export interface TestError {
  id: string
  timestamp: Date
  iteration: number
  account?: Address
  txHash?: Hash
  error: string
  errorType: 'network' | 'gas' | 'contract' | 'user' | 'timeout'
  retryable: boolean
  retryCount: number
}

export interface TestTransaction {
  id: string
  executionId: string
  iteration: number
  account: Address
  txHash?: Hash
  status: 'pending' | 'confirmed' | 'failed' | 'timeout'
  gasUsed?: bigint
  gasPrice?: bigint
  confirmationTime?: number
  error?: string
  timestamp: Date
}

export interface AccountInfo {
  address: Address
  privateKey?: `0x${string}`
  balance: bigint
  nonce: number
  isActive: boolean
  transactionCount: number
  lastUsed?: Date
}

// Predefined scenario templates
export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'rapid-transfer',
    name: 'Rapid Transfer',
    description: 'Send 100-500 sequential token transfers to test basic throughput',
    type: 'sequential',
    template: true,
    config: {
      contractAddress: '0x' as Address,
      functionName: 'transfer',
      functionArgs: [],
      iterations: 100,
      mode: 'sequential',
      accountCount: 1,
      useMultipleAccounts: false,
      fundingAmount: '1.0',
      delayBetweenTx: 100,
      gasPriceTier: 'normal',
      stopOnError: false,
      retryFailedTx: true,
      maxRetries: 3,
      timeoutMs: 30000,
    }
  },
  {
    id: 'concurrent-users',
    name: 'Concurrent Users',
    description: 'Simulate multiple users sending transactions simultaneously',
    type: 'concurrent',
    template: true,
    config: {
      contractAddress: '0x' as Address,
      functionName: 'transfer',
      functionArgs: [],
      iterations: 50,
      mode: 'concurrent',
      accountCount: 10,
      useMultipleAccounts: true,
      fundingAmount: '0.5',
      delayBetweenTx: 0,
      concurrencyLimit: 10,
      gasPriceTier: 'normal',
      stopOnError: false,
      retryFailedTx: true,
      maxRetries: 3,
      timeoutMs: 30000,
    }
  },
  {
    id: 'multi-user-batch',
    name: 'Multi-User Batch Operations',
    description: 'Test batch operations across multiple accounts',
    type: 'multi-user',
    template: true,
    config: {
      contractAddress: '0x' as Address,
      functionName: 'batchMint',
      functionArgs: [],
      iterations: 20,
      mode: 'multi-user',
      accountCount: 5,
      useMultipleAccounts: true,
      fundingAmount: '2.0',
      delayBetweenTx: 1000,
      batchSize: 10,
      gasPriceTier: 'fast',
      stopOnError: true,
      retryFailedTx: true,
      maxRetries: 2,
      timeoutMs: 60000,
    }
  },
  {
    id: 'gas-limit-stress',
    name: 'Gas Limit Stress Test',
    description: 'Push gas limits to test network handling of complex transactions',
    type: 'sequential',
    template: true,
    config: {
      contractAddress: '0x' as Address,
      functionName: 'complexOperation',
      functionArgs: [],
      iterations: 50,
      mode: 'sequential',
      accountCount: 1,
      useMultipleAccounts: false,
      fundingAmount: '5.0',
      delayBetweenTx: 2000,
      gasLimit: BigInt(1000000),
      gasPriceTier: 'fast',
      stopOnError: false,
      retryFailedTx: true,
      maxRetries: 5,
      timeoutMs: 120000,
    }
  },
  {
    id: 'custom-scenario',
    name: 'Custom Scenario',
    description: 'Create your own test scenario with custom parameters',
    type: 'sequential',
    template: false,
    config: {
      contractAddress: '0x' as Address,
      functionName: '',
      functionArgs: [],
      iterations: 10,
      mode: 'sequential',
      accountCount: 1,
      useMultipleAccounts: false,
      fundingAmount: '1.0',
      delayBetweenTx: 1000,
      gasPriceTier: 'normal',
      stopOnError: false,
      retryFailedTx: true,
      maxRetries: 3,
      timeoutMs: 30000,
    }
  }
]

// Function parameter types for common ERC-20 functions
export const FUNCTION_TEMPLATES: Record<string, {
  args: { name: string; type: string; description: string }[]
  description: string
}> = {
  'transfer': {
    description: 'Transfer tokens to another address',
    args: [
      { name: 'to', type: 'address', description: 'Recipient address' },
      { name: 'amount', type: 'uint256', description: 'Amount to transfer' }
    ]
  },
  'approve': {
    description: 'Approve another address to spend tokens',
    args: [
      { name: 'spender', type: 'address', description: 'Address to approve' },
      { name: 'amount', type: 'uint256', description: 'Amount to approve' }
    ]
  },
  'mint': {
    description: 'Mint new tokens (owner only)',
    args: [
      { name: 'to', type: 'address', description: 'Address to mint to' },
      { name: 'amount', type: 'uint256', description: 'Amount to mint' }
    ]
  },
  'batchMint': {
    description: 'Mint tokens to multiple addresses',
    args: [
      { name: 'recipients', type: 'address[]', description: 'Array of recipient addresses' },
      { name: 'amounts', type: 'uint256[]', description: 'Array of amounts to mint' }
    ]
  },
  'burn': {
    description: 'Burn tokens from account',
    args: [
      { name: 'amount', type: 'uint256', description: 'Amount to burn' }
    ]
  }
}