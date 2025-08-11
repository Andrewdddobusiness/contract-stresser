import { type Address, type Hash, type PublicClient, createPublicClient, http } from 'viem'
import { anvil, sepolia } from '../blockchain/chains'
import type { TestExecution, TestTransaction, TestError } from '@/types/testing'

export interface MonitoringOptions {
  network: 'local' | 'sepolia'
  pollInterval?: number // milliseconds
  enableWebSocket?: boolean
  onTransactionUpdate?: (transaction: TestTransaction) => void
  onError?: (error: TestError) => void
  onExecutionUpdate?: (execution: TestExecution) => void
}

export interface TransactionMonitor {
  txHash: Hash
  executionId: string
  iteration: number
  account: Address
  startTime: Date
  confirmed: boolean
  retryCount: number
}

/**
 * Real-time Test Monitoring Service
 * Provides WebSocket and polling-based monitoring of test executions
 */
export class TestMonitoringService {
  private publicClient: PublicClient | null = null
  private activeMonitors = new Map<Hash, TransactionMonitor>()
  private executionTimers = new Map<string, NodeJS.Timeout>()
  private pollInterval: NodeJS.Timeout | null = null
  private websocket: WebSocket | null = null
  private options: MonitoringOptions
  private isMonitoring = false

  constructor(options: MonitoringOptions) {
    this.options = {
      pollInterval: 2000, // 2 seconds default
      enableWebSocket: false,
      ...options
    }
    this.setupClient()
  }

  /**
   * Setup blockchain client based on network
   */
  private async setupClient(): Promise<void> {
    const chain = this.options.network === 'local' ? anvil : sepolia
    const rpcUrl = this.options.network === 'local' 
      ? 'http://localhost:8545' 
      : sepolia.rpcUrls.default.http[0]

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl)
    })

    // Verify connection
    try {
      await this.publicClient.getBlockNumber()
      console.log(`Monitoring service connected to ${this.options.network}`)
    } catch (error) {
      console.error(`Failed to connect monitoring service:`, error)
      throw error
    }
  }

  /**
   * Start monitoring a test execution
   */
  async startMonitoring(execution: TestExecution): Promise<void> {
    if (this.isMonitoring) {
      await this.stopMonitoring()
    }

    this.isMonitoring = true
    console.log(`Starting monitoring for execution: ${execution.id}`)

    // Setup WebSocket if enabled
    if (this.options.enableWebSocket && this.options.network === 'local') {
      await this.setupWebSocket()
    }

    // Start polling for transaction updates
    this.startPolling()

    // Monitor execution timeouts
    this.monitorExecutionTimeout(execution)
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false

    // Clear polling
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }

    // Close WebSocket
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }

    // Clear execution timers
    this.executionTimers.forEach(timer => clearTimeout(timer))
    this.executionTimers.clear()

    // Clear active monitors
    this.activeMonitors.clear()

    console.log('Monitoring stopped')
  }

  /**
   * Add transaction to monitoring queue
   */
  addTransactionMonitor(
    txHash: Hash, 
    executionId: string, 
    iteration: number, 
    account: Address
  ): void {
    const monitor: TransactionMonitor = {
      txHash,
      executionId,
      iteration,
      account,
      startTime: new Date(),
      confirmed: false,
      retryCount: 0
    }

    this.activeMonitors.set(txHash, monitor)
    console.log(`Added transaction monitor: ${txHash.slice(0, 10)}...`)
  }

  /**
   * Remove transaction from monitoring
   */
  removeTransactionMonitor(txHash: Hash): void {
    this.activeMonitors.delete(txHash)
  }

  /**
   * Setup WebSocket connection for real-time updates
   */
  private async setupWebSocket(): Promise<void> {
    if (this.options.network !== 'local') {
      console.warn('WebSocket only supported for local Anvil network')
      return
    }

    try {
      // Note: This is a placeholder for WebSocket implementation
      // Real implementation would depend on the specific WebSocket endpoint
      console.log('WebSocket monitoring not yet implemented - using polling fallback')
    } catch (error) {
      console.error('Failed to setup WebSocket:', error)
      // Fallback to polling
    }
  }

  /**
   * Start polling for transaction updates
   */
  private startPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }

    this.pollInterval = setInterval(async () => {
      if (!this.isMonitoring || !this.publicClient) return

      await this.checkPendingTransactions()
    }, this.options.pollInterval)

    console.log(`Started polling with ${this.options.pollInterval}ms interval`)
  }

  /**
   * Check status of all pending transactions
   */
  private async checkPendingTransactions(): Promise<void> {
    if (!this.publicClient) return

    const pendingMonitors = Array.from(this.activeMonitors.values())
      .filter(monitor => !monitor.confirmed)

    if (pendingMonitors.length === 0) return

    // Process in batches to avoid overwhelming the RPC
    const batchSize = 10
    for (let i = 0; i < pendingMonitors.length; i += batchSize) {
      const batch = pendingMonitors.slice(i, i + batchSize)
      await Promise.allSettled(
        batch.map(monitor => this.checkTransactionStatus(monitor))
      )
    }
  }

  /**
   * Check individual transaction status
   */
  private async checkTransactionStatus(monitor: TransactionMonitor): Promise<void> {
    if (!this.publicClient) return

    try {
      const receipt = await this.publicClient.getTransactionReceipt({
        hash: monitor.txHash
      })

      if (receipt) {
        // Transaction confirmed
        monitor.confirmed = true
        const confirmationTime = new Date().getTime() - monitor.startTime.getTime()

        const transaction: TestTransaction = {
          id: `${monitor.executionId}-${monitor.iteration}`,
          executionId: monitor.executionId,
          iteration: monitor.iteration,
          account: monitor.account,
          txHash: monitor.txHash,
          status: receipt.status === 'success' ? 'confirmed' : 'failed',
          gasUsed: receipt.gasUsed,
          gasPrice: receipt.effectiveGasPrice,
          confirmationTime,
          timestamp: new Date()
        }

        this.options.onTransactionUpdate?.(transaction)
        this.removeTransactionMonitor(monitor.txHash)

        console.log(`Transaction confirmed: ${monitor.txHash.slice(0, 10)}... in ${confirmationTime}ms`)
      }
    } catch (error) {
      // Transaction might still be pending or failed
      const now = new Date().getTime()
      const elapsed = now - monitor.startTime.getTime()

      // Timeout after 2 minutes
      if (elapsed > 120000) {
        monitor.confirmed = true // Mark as processed to remove from queue
        
        const testError: TestError = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          iteration: monitor.iteration,
          account: monitor.account,
          txHash: monitor.txHash,
          error: 'Transaction timeout - not confirmed within 2 minutes',
          errorType: 'timeout',
          retryable: false,
          retryCount: monitor.retryCount
        }

        this.options.onError?.(testError)
        this.removeTransactionMonitor(monitor.txHash)

        console.warn(`Transaction timeout: ${monitor.txHash.slice(0, 10)}...`)
      }
    }
  }

  /**
   * Monitor execution for overall timeout
   */
  private monitorExecutionTimeout(execution: TestExecution): void {
    const timeoutMs = execution.config.timeoutMs || 300000 // 5 minutes default
    
    const timer = setTimeout(() => {
      if (this.isMonitoring) {
        const error: TestError = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          iteration: execution.currentIteration,
          error: `Test execution timeout after ${timeoutMs}ms`,
          errorType: 'timeout',
          retryable: false,
          retryCount: 0
        }

        this.options.onError?.(error)
        console.error(`Execution timeout: ${execution.id}`)
      }
    }, timeoutMs)

    this.executionTimers.set(execution.id, timer)
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    const totalMonitored = this.activeMonitors.size
    const pendingCount = Array.from(this.activeMonitors.values())
      .filter(monitor => !monitor.confirmed).length
    
    return {
      totalMonitored,
      pendingCount,
      confirmedCount: totalMonitored - pendingCount,
      isActive: this.isMonitoring,
      network: this.options.network,
      pollInterval: this.options.pollInterval
    }
  }

  /**
   * Update monitoring configuration
   */
  updateOptions(newOptions: Partial<MonitoringOptions>): void {
    this.options = { ...this.options, ...newOptions }
    
    // Restart polling if interval changed
    if (newOptions.pollInterval && this.isMonitoring) {
      this.startPolling()
    }
  }

  /**
   * Get list of currently monitored transactions
   */
  getActiveMonitors(): TransactionMonitor[] {
    return Array.from(this.activeMonitors.values())
  }

  /**
   * Force check of specific transaction
   */
  async recheckTransaction(txHash: Hash): Promise<void> {
    const monitor = this.activeMonitors.get(txHash)
    if (monitor && !monitor.confirmed) {
      await this.checkTransactionStatus(monitor)
    }
  }
}

// Singleton instance
let monitoringService: TestMonitoringService | null = null

export function createMonitoringService(options: MonitoringOptions): TestMonitoringService {
  if (monitoringService) {
    monitoringService.stopMonitoring()
  }
  
  monitoringService = new TestMonitoringService(options)
  return monitoringService
}

export function getMonitoringService(): TestMonitoringService | null {
  return monitoringService
}

// Convenience functions
export async function startTestMonitoring(
  execution: TestExecution,
  options?: Partial<MonitoringOptions>
): Promise<TestMonitoringService> {
  const service = createMonitoringService({
    network: execution.config.network,
    ...options
  })
  
  await service.startMonitoring(execution)
  return service
}

export async function stopTestMonitoring(): Promise<void> {
  if (monitoringService) {
    await monitoringService.stopMonitoring()
  }
}