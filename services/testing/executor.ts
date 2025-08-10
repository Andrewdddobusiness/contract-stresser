import { 
  createWalletClient, 
  createPublicClient, 
  http, 
  parseEther, 
  type Address, 
  type Hash,
  type WalletClient,
  type PublicClient,
  type TransactionReceipt,
  encodeFunctionData,
  getContract
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { anvil, sepolia } from '../blockchain/chains'
import type { 
  TestConfiguration, 
  TestExecution, 
  TestTransaction, 
  TestError, 
  AccountInfo 
} from '@/types/testing'
import { gasEstimationService } from '../blockchain/gas'
import { useErrorRecovery } from '@/hooks/useErrorRecovery'

interface ExecutorOptions {
  onProgress?: (execution: TestExecution) => void
  onTransaction?: (transaction: TestTransaction) => void
  onError?: (error: TestError) => void
  onComplete?: (execution: TestExecution) => void
}

interface TransactionJob {
  id: string
  iteration: number
  account: AccountInfo
  functionName: string
  args: any[]
  gasLimit?: bigint
  gasPrice?: bigint
  retryCount: number
  maxRetries: number
  status: 'pending' | 'executing' | 'completed' | 'failed'
  txHash?: Hash
  error?: string
  createdAt: Date
  executedAt?: Date
  completedAt?: Date
}

interface NonceManager {
  nonces: Map<Address, number>
  getNextNonce(address: Address): Promise<number>
  updateNonce(address: Address, nonce: number): void
  resetNonce(address: Address): Promise<void>
}

/**
 * Core test execution engine for stress testing smart contracts
 */
export class TestExecutor {
  private execution: TestExecution | null = null
  private publicClient: PublicClient | null = null
  private walletClients: Map<Address, WalletClient> = new Map()
  private accounts: AccountInfo[] = []
  private jobQueue: TransactionJob[] = []
  private activeJobs: Map<string, TransactionJob> = new Map()
  private nonceManager: NonceManager
  private isRunning = false
  private isPaused = false
  private abortController: AbortController | null = null
  private options: ExecutorOptions

  constructor(options: ExecutorOptions = {}) {
    this.options = options
    this.nonceManager = this.createNonceManager()
  }

  /**
   * Start test execution
   */
  async startTest(config: TestConfiguration): Promise<TestExecution> {
    if (this.isRunning) {
      throw new Error('Another test is already running')
    }

    // Initialize execution
    this.execution = {
      id: crypto.randomUUID(),
      name: `${config.mode} test - ${config.iterations} iterations`,
      status: 'pending',
      config,
      currentIteration: 0,
      totalIterations: config.iterations,
      successCount: 0,
      failureCount: 0,
      errors: []
    }

    this.isRunning = true
    this.abortController = new AbortController()

    try {
      // Setup blockchain clients
      await this.setupClients(config)

      // Generate test accounts
      await this.generateAccounts(config)

      // Create transaction jobs
      await this.createJobs(config)

      // Start execution
      this.execution.status = 'running'
      this.execution.startTime = new Date()
      this.notifyProgress()

      // Execute based on mode
      switch (config.mode) {
        case 'sequential':
          await this.executeSequential(config)
          break
        case 'concurrent':
          await this.executeConcurrent(config)
          break
        case 'multi-user':
          await this.executeMultiUser(config)
          break
        default:
          throw new Error(`Unknown execution mode: ${config.mode}`)
      }

      // Complete execution
      this.execution.status = 'completed'
      this.execution.endTime = new Date()
      this.calculateMetrics()
      this.notifyProgress()
      this.options.onComplete?.(this.execution)

      return this.execution

    } catch (error) {
      this.execution.status = 'failed'
      this.execution.endTime = new Date()
      this.execution.lastError = error instanceof Error ? error.message : 'Unknown error'
      
      const testError: TestError = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        iteration: this.execution.currentIteration,
        error: this.execution.lastError,
        errorType: 'network',
        retryable: false,
        retryCount: 0
      }
      
      this.execution.errors.push(testError)
      this.notifyProgress()
      this.options.onError?.(testError)
      
      throw error
    } finally {
      this.isRunning = false
      this.cleanup()
    }
  }

  /**
   * Pause test execution
   */
  pauseTest(): void {
    if (!this.isRunning || this.isPaused) return
    
    this.isPaused = true
    if (this.execution) {
      this.execution.status = 'paused'
      this.notifyProgress()
    }
  }

  /**
   * Resume test execution
   */
  resumeTest(): void {
    if (!this.isRunning || !this.isPaused) return
    
    this.isPaused = false
    if (this.execution) {
      this.execution.status = 'running'
      this.notifyProgress()
    }
  }

  /**
   * Stop test execution
   */
  stopTest(): void {
    if (!this.isRunning) return
    
    this.abortController?.abort()
    if (this.execution) {
      this.execution.status = 'cancelled'
      this.execution.endTime = new Date()
      this.notifyProgress()
    }
    this.isRunning = false
    this.cleanup()
  }

  /**
   * Get current execution status
   */
  getStatus(): TestExecution | null {
    return this.execution
  }

  // Private methods

  private async setupClients(config: TestConfiguration): Promise<void> {
    const chain = config.network === 'local' ? anvil : sepolia
    const rpcUrl = config.network === 'local' ? 'http://localhost:8545' : sepolia.rpcUrls.default.http[0]

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl)
    })

    // Verify connection
    await this.publicClient.getBlockNumber()
  }

  private async generateAccounts(config: TestConfiguration): Promise<void> {
    if (!this.publicClient) throw new Error('Public client not initialized')

    const accountCount = config.useMultipleAccounts ? config.accountCount : 1

    for (let i = 0; i < accountCount; i++) {
      // Generate random private key for testing
      const privateKey = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}` as `0x${string}`
      
      const account = privateKeyToAccount(privateKey)
      
      const walletClient = createWalletClient({
        account,
        chain: this.publicClient.chain,
        transport: http(this.publicClient.chain?.id === anvil.id ? 'http://localhost:8545' : sepolia.rpcUrls.default.http[0])
      })

      this.walletClients.set(account.address, walletClient)

      // Get current balance and nonce
      const balance = await this.publicClient.getBalance({ address: account.address })
      const nonce = await this.publicClient.getTransactionCount({ address: account.address })

      const accountInfo: AccountInfo = {
        address: account.address,
        privateKey,
        balance,
        nonce,
        isActive: true,
        transactionCount: 0
      }

      this.accounts.push(accountInfo)

      // Fund account if needed (for local network)
      if (config.network === 'local' && balance === BigInt(0)) {
        await this.fundAccount(accountInfo, parseEther(config.fundingAmount))
      }
    }

    // Initialize nonce manager
    await Promise.all(
      this.accounts.map(account => this.nonceManager.resetNonce(account.address))
    )
  }

  private async fundAccount(account: AccountInfo, amount: bigint): Promise<void> {
    if (!this.publicClient) throw new Error('Public client not initialized')

    // For Anvil, we can use the default funded account
    const defaultPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    const defaultAccount = privateKeyToAccount(defaultPrivateKey)
    
    const funderClient = createWalletClient({
      account: defaultAccount,
      chain: this.publicClient.chain,
      transport: http('http://localhost:8545')
    })

    const hash = await funderClient.sendTransaction({
      to: account.address,
      value: amount,
      chain: this.publicClient.chain
    })

    // Wait for confirmation
    await this.publicClient.waitForTransactionReceipt({ hash })
    
    // Update account balance
    account.balance = await this.publicClient.getBalance({ address: account.address })
  }

  private async createJobs(config: TestConfiguration): Promise<void> {
    this.jobQueue = []
    
    for (let i = 0; i < config.iterations; i++) {
      const account = this.accounts[i % this.accounts.length]
      
      const job: TransactionJob = {
        id: crypto.randomUUID(),
        iteration: i + 1,
        account,
        functionName: config.functionName,
        args: config.functionArgs.map(arg => this.parseArgValue(arg.value, arg.type)),
        retryCount: 0,
        maxRetries: config.maxRetries,
        status: 'pending',
        createdAt: new Date()
      }

      this.jobQueue.push(job)
    }
  }

  private parseArgValue(value: string, type: string): any {
    switch (type) {
      case 'uint256':
      case 'uint':
        return BigInt(value || '0')
      case 'address':
        return value as Address
      case 'bool':
        return value.toLowerCase() === 'true'
      case 'string':
        return value
      default:
        return value
    }
  }

  private async executeSequential(config: TestConfiguration): Promise<void> {
    for (const job of this.jobQueue) {
      if (this.abortController?.signal.aborted) break
      
      // Wait if paused
      while (this.isPaused && !this.abortController?.signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      await this.executeJob(job, config)
      
      // Delay between transactions
      if (config.delayBetweenTx > 0) {
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenTx))
      }
    }
  }

  private async executeConcurrent(config: TestConfiguration): Promise<void> {
    const concurrencyLimit = config.concurrencyLimit || config.accountCount
    const batches: TransactionJob[][] = []
    
    // Split jobs into batches
    for (let i = 0; i < this.jobQueue.length; i += concurrencyLimit) {
      batches.push(this.jobQueue.slice(i, i + concurrencyLimit))
    }

    for (const batch of batches) {
      if (this.abortController?.signal.aborted) break
      
      // Wait if paused
      while (this.isPaused && !this.abortController?.signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Execute batch concurrently
      await Promise.allSettled(
        batch.map(job => this.executeJob(job, config))
      )
      
      // Delay between batches
      if (config.delayBetweenTx > 0) {
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenTx))
      }
    }
  }

  private async executeMultiUser(config: TestConfiguration): Promise<void> {
    // Group jobs by account
    const jobsByAccount = new Map<Address, TransactionJob[]>()
    
    for (const job of this.jobQueue) {
      const accountJobs = jobsByAccount.get(job.account.address) || []
      accountJobs.push(job)
      jobsByAccount.set(job.account.address, accountJobs)
    }

    // Execute each account's jobs concurrently
    const accountPromises = Array.from(jobsByAccount.entries()).map(async ([address, jobs]) => {
      for (const job of jobs) {
        if (this.abortController?.signal.aborted) break
        
        // Wait if paused
        while (this.isPaused && !this.abortController?.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        await this.executeJob(job, config)
        
        // Delay between transactions for this account
        if (config.delayBetweenTx > 0) {
          await new Promise(resolve => setTimeout(resolve, config.delayBetweenTx))
        }
      }
    })

    await Promise.allSettled(accountPromises)
  }

  private async executeJob(job: TransactionJob, config: TestConfiguration): Promise<void> {
    if (!this.execution || !this.publicClient) return

    job.status = 'executing'
    job.executedAt = new Date()
    this.activeJobs.set(job.id, job)

    try {
      const walletClient = this.walletClients.get(job.account.address)
      if (!walletClient) throw new Error('Wallet client not found')

      // Get gas parameters
      const gasPrice = config.gasPrice || (await gasEstimationService.getGasPrices(
        config.network === 'local' ? anvil.id : sepolia.id
      ))[config.gasPriceTier]

      const gasLimit = config.gasLimit || BigInt(200000) // Default gas limit

      // Get next nonce
      const nonce = await this.nonceManager.getNextNonce(job.account.address)

      // Create contract instance for the function call
      const hash = await walletClient.writeContract({
        address: config.contractAddress,
        abi: this.getContractABI(config.functionName),
        functionName: job.functionName,
        args: job.args,
        gas: gasLimit,
        gasPrice,
        nonce,
        account: walletClient.account || job.account.address,
        chain: this.publicClient.chain
      })

      job.txHash = hash
      job.status = 'completed'
      job.completedAt = new Date()

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: config.timeoutMs 
      })

      // Create transaction record
      const transaction: TestTransaction = {
        id: job.id,
        executionId: this.execution.id,
        iteration: job.iteration,
        account: job.account.address,
        txHash: hash,
        status: 'confirmed',
        gasUsed: receipt.gasUsed,
        gasPrice,
        confirmationTime: job.completedAt ? job.completedAt.getTime() - job.executedAt.getTime() : 0,
        timestamp: new Date()
      }

      this.execution.successCount++
      this.execution.currentIteration = job.iteration
      this.updateAccountStats(job.account.address, true)
      this.notifyProgress()
      this.options.onTransaction?.(transaction)

    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown error'
      job.completedAt = new Date()

      // Create error record
      const testError: TestError = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        iteration: job.iteration,
        account: job.account.address,
        txHash: job.txHash,
        error: job.error,
        errorType: this.categorizeError(job.error),
        retryable: this.isRetryableError(job.error),
        retryCount: job.retryCount
      }

      this.execution.errors.push(testError)
      this.execution.failureCount++
      this.updateAccountStats(job.account.address, false)
      this.notifyProgress()
      this.options.onError?.(testError)

      // Retry if configured
      if (config.retryFailedTx && job.retryCount < job.maxRetries && testError.retryable) {
        job.retryCount++
        job.status = 'pending'
        await new Promise(resolve => setTimeout(resolve, 1000 * job.retryCount)) // Exponential backoff
        await this.executeJob(job, config)
        return
      }

      // Stop on error if configured
      if (config.stopOnError) {
        this.stopTest()
        return
      }
    } finally {
      this.activeJobs.delete(job.id)
    }
  }

  private getContractABI(functionName: string): any[] {
    // This would return the appropriate ABI for the function
    // For now, return a basic ERC-20 ABI
    const erc20Abi = [
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable'
      },
      {
        name: 'approve',
        type: 'function',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable'
      },
      {
        name: 'mint',
        type: 'function',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }
    ]

    return erc20Abi.filter(item => item.name === functionName)
  }

  private categorizeError(error: string): TestError['errorType'] {
    const lowerError = error.toLowerCase()
    
    if (lowerError.includes('network') || lowerError.includes('connection')) {
      return 'network'
    }
    if (lowerError.includes('gas') || lowerError.includes('fee')) {
      return 'gas'
    }
    if (lowerError.includes('revert') || lowerError.includes('execution')) {
      return 'contract'
    }
    if (lowerError.includes('timeout')) {
      return 'timeout'
    }
    if (lowerError.includes('rejected') || lowerError.includes('denied')) {
      return 'user'
    }
    
    return 'network'
  }

  private isRetryableError(error: string): boolean {
    const lowerError = error.toLowerCase()
    
    // Don't retry user rejections or contract reverts
    if (lowerError.includes('rejected') || lowerError.includes('denied') || 
        lowerError.includes('revert') || lowerError.includes('execution reverted')) {
      return false
    }
    
    // Retry network and temporary issues
    return true
  }

  private updateAccountStats(address: Address, success: boolean): void {
    const account = this.accounts.find(a => a.address === address)
    if (account) {
      account.transactionCount++
      account.lastUsed = new Date()
    }
  }

  private calculateMetrics(): void {
    if (!this.execution || !this.execution.startTime || !this.execution.endTime) return

    const duration = this.execution.endTime.getTime() - this.execution.startTime.getTime()
    const durationSeconds = duration / 1000

    // Calculate transactions per second
    this.execution.transactionsPerSecond = this.execution.successCount / durationSeconds

    // Calculate average gas used (would need to collect from transactions)
    this.execution.avgGasUsed = BigInt(65000) // Placeholder

    // Calculate total cost (would need to sum from transactions)
    this.execution.totalCost = BigInt(0) // Placeholder
  }

  private createNonceManager(): NonceManager {
    const self = this
    return {
      nonces: new Map(),
      
      async getNextNonce(address: Address): Promise<number> {
        const currentNonce = this.nonces.get(address) ?? 0
        const nextNonce = currentNonce + 1
        this.nonces.set(address, nextNonce)
        return nextNonce
      },
      
      updateNonce(address: Address, nonce: number): void {
        this.nonces.set(address, nonce)
      },
      
      async resetNonce(address: Address): Promise<void> {
        if (!self.publicClient) return
        const nonce = await self.publicClient.getTransactionCount({ address })
        this.nonces.set(address, nonce)
      }
    }
  }

  private notifyProgress(): void {
    if (this.execution) {
      this.options.onProgress?.(this.execution)
    }
  }

  private cleanup(): void {
    this.publicClient = null
    this.walletClients.clear()
    this.accounts = []
    this.jobQueue = []
    this.activeJobs.clear()
    this.abortController = null
    this.isPaused = false
  }
}

// Convenience function to create and start a test
export async function runStressTest(
  config: TestConfiguration, 
  options: ExecutorOptions = {}
): Promise<TestExecution> {
  const executor = new TestExecutor(options)
  return await executor.startTest(config)
}

// Export singleton instance
export const testExecutor = new TestExecutor()