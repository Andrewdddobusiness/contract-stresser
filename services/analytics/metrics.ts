import { type Address, type Hash } from 'viem'
import type { TestExecution, TestTransaction, TestError } from '@/types/testing'

export interface TransactionMetrics {
  txHash: Hash
  executionId: string
  iteration: number
  account: Address
  functionName: string
  status: 'pending' | 'confirmed' | 'failed'
  
  // Timing metrics
  startTime: Date
  endTime?: Date
  confirmationTime?: number // ms from start to confirmation
  blockTime?: number // time to be included in block
  
  // Gas metrics
  gasLimit: bigint
  gasUsed?: bigint
  gasPrice: bigint
  gasCost?: bigint // gasUsed * gasPrice
  gasEfficiency?: number // gasUsed / gasLimit ratio
  
  // Block metrics
  blockNumber?: bigint
  blockHash?: Hash
  transactionIndex?: number
  
  // Network metrics
  networkLatency?: number // RPC call latency
  queueTime?: number // time spent waiting in queue
  
  // Error metrics
  error?: string
  retryCount: number
  retryAttempts: RetryAttempt[]
}

export interface RetryAttempt {
  attempt: number
  timestamp: Date
  error: string
  delay: number
}

export interface ExecutionMetrics {
  executionId: string
  name: string
  config: {
    mode: string
    iterations: number
    accountCount: number
    network: string
    contractAddress: Address
    functionName: string
  }
  
  // Overall timing
  startTime: Date
  endTime?: Date
  duration?: number // total execution time in ms
  
  // Transaction metrics
  totalTransactions: number
  successfulTransactions: number
  failedTransactions: number
  pendingTransactions: number
  successRate: number // percentage
  
  // Performance metrics
  transactionsPerSecond: number
  averageConfirmationTime: number
  medianConfirmationTime: number
  minConfirmationTime: number
  maxConfirmationTime: number
  
  // Gas metrics
  totalGasUsed: bigint
  totalGasCost: bigint
  averageGasUsed: bigint
  averageGasPrice: bigint
  averageGasCost: bigint
  gasEfficiency: number
  
  // Block metrics
  blocksSpanned: number
  firstBlock?: bigint
  lastBlock?: bigint
  averageTransactionsPerBlock: number
  
  // Error metrics
  errorRate: number
  totalRetries: number
  errorsByType: Record<string, number>
  
  // Network metrics
  averageNetworkLatency: number
  networkErrors: number
}

export interface PerformanceSnapshot {
  timestamp: Date
  executionId: string
  
  // Real-time metrics
  currentTPS: number
  avgResponseTime: number
  activeTransactions: number
  queuedTransactions: number
  
  // Cumulative metrics
  totalProcessed: number
  successCount: number
  errorCount: number
  avgGasUsed: bigint
  
  // Resource utilization
  memoryUsage?: number
  cpuUsage?: number
}

export interface HistoricalMetrics {
  executionId: string
  timestamp: Date
  metrics: ExecutionMetrics
  snapshots: PerformanceSnapshot[]
  transactions: TransactionMetrics[]
}

export interface MetricsFilter {
  executionIds?: string[]
  startDate?: Date
  endDate?: Date
  network?: string
  functionName?: string
  status?: TransactionMetrics['status'][]
  accountAddress?: Address
  minGasUsed?: bigint
  maxGasUsed?: bigint
  includeErrors?: boolean
}

export interface MetricsAggregation {
  groupBy: 'execution' | 'date' | 'hour' | 'function' | 'network' | 'account'
  timeRange?: {
    start: Date
    end: Date
  }
  metrics: {
    totalTransactions: number
    successRate: number
    avgTPS: number
    avgGasUsed: bigint
    avgConfirmationTime: number
    errorRate: number
  }[]
}

/**
 * Comprehensive Metrics Collection Service for Stress Testing
 */
export class TestMetricsService {
  private transactionMetrics = new Map<Hash, TransactionMetrics>()
  private executionMetrics = new Map<string, ExecutionMetrics>()
  private performanceSnapshots = new Map<string, PerformanceSnapshot[]>()
  private historicalData: HistoricalMetrics[] = []
  
  // Real-time tracking
  private activeExecutions = new Set<string>()
  private metricsSubscribers = new Set<(snapshot: PerformanceSnapshot) => void>()
  private snapshotInterval: NodeJS.Timeout | null = null
  
  /**
   * Start collecting metrics for a test execution
   */
  startExecution(execution: TestExecution): void {
    const executionMetrics: ExecutionMetrics = {
      executionId: execution.id,
      name: execution.name,
      config: {
        mode: execution.config.mode,
        iterations: execution.config.iterations,
        accountCount: execution.config.accountCount,
        network: execution.config.network,
        contractAddress: execution.config.contractAddress,
        functionName: execution.config.functionName
      },
      startTime: new Date(),
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      successRate: 0,
      transactionsPerSecond: 0,
      averageConfirmationTime: 0,
      medianConfirmationTime: 0,
      minConfirmationTime: 0,
      maxConfirmationTime: 0,
      totalGasUsed: BigInt(0),
      totalGasCost: BigInt(0),
      averageGasUsed: BigInt(0),
      averageGasPrice: BigInt(0),
      averageGasCost: BigInt(0),
      gasEfficiency: 0,
      blocksSpanned: 0,
      averageTransactionsPerBlock: 0,
      errorRate: 0,
      totalRetries: 0,
      errorsByType: {},
      averageNetworkLatency: 0,
      networkErrors: 0
    }

    this.executionMetrics.set(execution.id, executionMetrics)
    this.activeExecutions.add(execution.id)
    this.performanceSnapshots.set(execution.id, [])

    // Start real-time snapshots
    if (!this.snapshotInterval) {
      this.startSnapshotCollection()
    }
  }

  /**
   * Record transaction start
   */
  recordTransactionStart(
    executionId: string,
    txHash: Hash,
    iteration: number,
    account: Address,
    functionName: string,
    gasLimit: bigint,
    gasPrice: bigint
  ): void {
    const metrics: TransactionMetrics = {
      txHash,
      executionId,
      iteration,
      account,
      functionName,
      status: 'pending',
      startTime: new Date(),
      gasLimit,
      gasPrice,
      retryCount: 0,
      retryAttempts: []
    }

    this.transactionMetrics.set(txHash, metrics)
    this.updateExecutionMetrics(executionId)
  }

  /**
   * Record transaction confirmation
   */
  recordTransactionConfirmation(
    txHash: Hash,
    gasUsed: bigint,
    blockNumber: bigint,
    blockHash: Hash,
    transactionIndex: number,
    networkLatency?: number
  ): void {
    const metrics = this.transactionMetrics.get(txHash)
    if (!metrics) return

    const confirmationTime = new Date().getTime() - metrics.startTime.getTime()
    const gasCost = gasUsed * metrics.gasPrice
    const gasEfficiency = Number(gasUsed) / Number(metrics.gasLimit)

    // Update transaction metrics
    metrics.status = 'confirmed'
    metrics.endTime = new Date()
    metrics.confirmationTime = confirmationTime
    metrics.gasUsed = gasUsed
    metrics.gasCost = gasCost
    metrics.gasEfficiency = gasEfficiency
    metrics.blockNumber = blockNumber
    metrics.blockHash = blockHash
    metrics.transactionIndex = transactionIndex
    metrics.networkLatency = networkLatency

    this.updateExecutionMetrics(metrics.executionId)
  }

  /**
   * Record transaction failure
   */
  recordTransactionFailure(
    txHash: Hash,
    error: string,
    retryCount?: number
  ): void {
    const metrics = this.transactionMetrics.get(txHash)
    if (!metrics) return

    metrics.status = 'failed'
    metrics.endTime = new Date()
    metrics.error = error
    metrics.retryCount = retryCount || 0

    this.updateExecutionMetrics(metrics.executionId)
  }

  /**
   * Record retry attempt
   */
  recordRetryAttempt(
    txHash: Hash,
    attempt: number,
    error: string,
    delay: number
  ): void {
    const metrics = this.transactionMetrics.get(txHash)
    if (!metrics) return

    metrics.retryAttempts.push({
      attempt,
      timestamp: new Date(),
      error,
      delay
    })
  }

  /**
   * End execution and finalize metrics
   */
  endExecution(executionId: string): ExecutionMetrics | null {
    const metrics = this.executionMetrics.get(executionId)
    if (!metrics) return null

    metrics.endTime = new Date()
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime()

    // Calculate final metrics
    this.calculateFinalMetrics(metrics)

    // Store historical data
    this.storeHistoricalData(executionId)

    // Clean up active execution
    this.activeExecutions.delete(executionId)

    // Stop snapshots if no active executions
    if (this.activeExecutions.size === 0) {
      this.stopSnapshotCollection()
    }

    return metrics
  }

  /**
   * Get metrics for a specific execution
   */
  getExecutionMetrics(executionId: string): ExecutionMetrics | null {
    return this.executionMetrics.get(executionId) || null
  }

  /**
   * Get all transaction metrics for an execution
   */
  getTransactionMetrics(executionId: string): TransactionMetrics[] {
    return Array.from(this.transactionMetrics.values())
      .filter(metrics => metrics.executionId === executionId)
      .sort((a, b) => a.iteration - b.iteration)
  }

  /**
   * Get performance snapshots for an execution
   */
  getPerformanceSnapshots(executionId: string): PerformanceSnapshot[] {
    return this.performanceSnapshots.get(executionId) || []
  }

  /**
   * Get historical metrics with filtering
   */
  getHistoricalMetrics(filter?: MetricsFilter): HistoricalMetrics[] {
    let results = [...this.historicalData]

    if (filter) {
      if (filter.executionIds?.length) {
        results = results.filter(data => filter.executionIds!.includes(data.executionId))
      }

      if (filter.startDate) {
        results = results.filter(data => data.timestamp >= filter.startDate!)
      }

      if (filter.endDate) {
        results = results.filter(data => data.timestamp <= filter.endDate!)
      }

      if (filter.network) {
        results = results.filter(data => data.metrics.config.network === filter.network)
      }

      if (filter.functionName) {
        results = results.filter(data => data.metrics.config.functionName === filter.functionName)
      }
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(groupBy: MetricsAggregation['groupBy'], timeRange?: { start: Date; end: Date }): MetricsAggregation {
    let data = this.historicalData

    if (timeRange) {
      data = data.filter(item => 
        item.timestamp >= timeRange.start && 
        item.timestamp <= timeRange.end
      )
    }

    // Group data based on groupBy parameter
    const groupedData = this.groupMetricsData(data, groupBy)

    // Calculate aggregated metrics for each group
    const metrics = Array.from(groupedData.values()).map(group => {
      const totalTx = group.reduce((sum, item) => sum + item.metrics.totalTransactions, 0)
      const successfulTx = group.reduce((sum, item) => sum + item.metrics.successfulTransactions, 0)
      const totalGasUsed = group.reduce((sum, item) => sum + item.metrics.totalGasUsed, BigInt(0))
      const totalDuration = group.reduce((sum, item) => sum + (item.metrics.duration || 0), 0)
      const errorCount = group.reduce((sum, item) => sum + item.metrics.failedTransactions, 0)
      const totalConfirmationTime = group.reduce((sum, item) => sum + (item.metrics.averageConfirmationTime * item.metrics.successfulTransactions), 0)

      return {
        totalTransactions: totalTx,
        successRate: totalTx > 0 ? (successfulTx / totalTx) * 100 : 0,
        avgTPS: totalDuration > 0 ? (totalTx / (totalDuration / 1000)) : 0,
        avgGasUsed: group.length > 0 ? totalGasUsed / BigInt(group.length) : BigInt(0),
        avgConfirmationTime: successfulTx > 0 ? totalConfirmationTime / successfulTx : 0,
        errorRate: totalTx > 0 ? (errorCount / totalTx) * 100 : 0
      }
    })

    return {
      groupBy,
      timeRange,
      metrics
    }
  }

  /**
   * Export metrics data
   */
  exportMetrics(
    executionIds: string[],
    format: 'json' | 'csv'
  ): string {
    const data = this.historicalData.filter(item => 
      executionIds.includes(item.executionId)
    )

    switch (format) {
      case 'json':
        return JSON.stringify(data, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value, 2)
      
      case 'csv':
        return this.convertToCsv(data)
      
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Subscribe to real-time performance updates
   */
  subscribe(callback: (snapshot: PerformanceSnapshot) => void): () => void {
    this.metricsSubscribers.add(callback)
    return () => this.metricsSubscribers.delete(callback)
  }

  /**
   * Clear metrics data
   */
  clearMetrics(executionId?: string): void {
    if (executionId) {
      this.executionMetrics.delete(executionId)
      this.performanceSnapshots.delete(executionId)
      
      // Remove transaction metrics for this execution
      Array.from(this.transactionMetrics.entries()).forEach(([hash, metrics]) => {
        if (metrics.executionId === executionId) {
          this.transactionMetrics.delete(hash)
        }
      })
      
      // Remove from historical data
      this.historicalData = this.historicalData.filter(item => item.executionId !== executionId)
    } else {
      // Clear all metrics
      this.transactionMetrics.clear()
      this.executionMetrics.clear()
      this.performanceSnapshots.clear()
      this.historicalData = []
      this.activeExecutions.clear()
    }
  }

  // Private methods

  private updateExecutionMetrics(executionId: string): void {
    const execMetrics = this.executionMetrics.get(executionId)
    if (!execMetrics) return

    const transactions = this.getTransactionMetrics(executionId)
    
    execMetrics.totalTransactions = transactions.length
    execMetrics.successfulTransactions = transactions.filter(t => t.status === 'confirmed').length
    execMetrics.failedTransactions = transactions.filter(t => t.status === 'failed').length
    execMetrics.pendingTransactions = transactions.filter(t => t.status === 'pending').length
    execMetrics.successRate = execMetrics.totalTransactions > 0 ? 
      (execMetrics.successfulTransactions / execMetrics.totalTransactions) * 100 : 0

    // Calculate TPS (if execution has duration)
    if (execMetrics.startTime && execMetrics.successfulTransactions > 0) {
      const currentDuration = (new Date().getTime() - execMetrics.startTime.getTime()) / 1000
      execMetrics.transactionsPerSecond = execMetrics.successfulTransactions / currentDuration
    }

    // Update gas metrics
    const confirmedTxs = transactions.filter(t => t.status === 'confirmed' && t.gasUsed)
    if (confirmedTxs.length > 0) {
      execMetrics.totalGasUsed = confirmedTxs.reduce((sum, t) => sum + (t.gasUsed || BigInt(0)), BigInt(0))
      execMetrics.averageGasUsed = execMetrics.totalGasUsed / BigInt(confirmedTxs.length)
      
      execMetrics.totalGasCost = confirmedTxs.reduce((sum, t) => sum + (t.gasCost || BigInt(0)), BigInt(0))
      execMetrics.averageGasCost = execMetrics.totalGasCost / BigInt(confirmedTxs.length)
      
      const avgGasPrice = confirmedTxs.reduce((sum, t) => sum + t.gasPrice, BigInt(0)) / BigInt(confirmedTxs.length)
      execMetrics.averageGasPrice = avgGasPrice
      
      const gasEfficiencies = confirmedTxs.map(t => t.gasEfficiency || 0)
      execMetrics.gasEfficiency = gasEfficiencies.reduce((sum, eff) => sum + eff, 0) / gasEfficiencies.length
    }

    // Update timing metrics
    const confirmedWithTiming = confirmedTxs.filter(t => t.confirmationTime)
    if (confirmedWithTiming.length > 0) {
      const times = confirmedWithTiming.map(t => t.confirmationTime!).sort((a, b) => a - b)
      execMetrics.averageConfirmationTime = times.reduce((sum, t) => sum + t, 0) / times.length
      execMetrics.medianConfirmationTime = times[Math.floor(times.length / 2)]
      execMetrics.minConfirmationTime = times[0]
      execMetrics.maxConfirmationTime = times[times.length - 1]
    }

    // Update error metrics
    const errorsByType: Record<string, number> = {}
    transactions.filter(t => t.status === 'failed' && t.error).forEach(t => {
      const errorType = this.categorizeError(t.error!)
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1
    })
    execMetrics.errorsByType = errorsByType
    execMetrics.errorRate = execMetrics.totalTransactions > 0 ? 
      (execMetrics.failedTransactions / execMetrics.totalTransactions) * 100 : 0
    
    execMetrics.totalRetries = transactions.reduce((sum, t) => sum + t.retryCount, 0)

    // Update block metrics
    const txsWithBlocks = confirmedTxs.filter(t => t.blockNumber)
    if (txsWithBlocks.length > 0) {
      const blockNumbers = txsWithBlocks.map(t => t.blockNumber!).sort((a, b) => Number(a - b))
      execMetrics.firstBlock = blockNumbers[0]
      execMetrics.lastBlock = blockNumbers[blockNumbers.length - 1]
      execMetrics.blocksSpanned = Number(execMetrics.lastBlock - execMetrics.firstBlock) + 1
      execMetrics.averageTransactionsPerBlock = txsWithBlocks.length / execMetrics.blocksSpanned
    }

    // Update network metrics
    const txsWithLatency = transactions.filter(t => t.networkLatency)
    if (txsWithLatency.length > 0) {
      execMetrics.averageNetworkLatency = txsWithLatency.reduce((sum, t) => sum + (t.networkLatency || 0), 0) / txsWithLatency.length
    }
    execMetrics.networkErrors = transactions.filter(t => t.error && t.error.toLowerCase().includes('network')).length
  }

  private calculateFinalMetrics(metrics: ExecutionMetrics): void {
    if (metrics.duration && metrics.successfulTransactions > 0) {
      metrics.transactionsPerSecond = metrics.successfulTransactions / (metrics.duration / 1000)
    }
  }

  private storeHistoricalData(executionId: string): void {
    const execMetrics = this.executionMetrics.get(executionId)
    const snapshots = this.performanceSnapshots.get(executionId) || []
    const transactions = this.getTransactionMetrics(executionId)

    if (execMetrics) {
      const historicalData: HistoricalMetrics = {
        executionId,
        timestamp: new Date(),
        metrics: execMetrics,
        snapshots,
        transactions
      }

      this.historicalData.push(historicalData)

      // Keep only last 100 executions to prevent memory issues
      if (this.historicalData.length > 100) {
        this.historicalData = this.historicalData
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 100)
      }
    }
  }

  private startSnapshotCollection(): void {
    this.snapshotInterval = setInterval(() => {
      this.activeExecutions.forEach(executionId => {
        this.capturePerformanceSnapshot(executionId)
      })
    }, 5000) // Every 5 seconds
  }

  private stopSnapshotCollection(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval)
      this.snapshotInterval = null
    }
  }

  private capturePerformanceSnapshot(executionId: string): void {
    const execMetrics = this.executionMetrics.get(executionId)
    if (!execMetrics) return

    const transactions = this.getTransactionMetrics(executionId)
    const recentTxs = transactions.filter(t => 
      t.endTime && new Date().getTime() - t.endTime.getTime() < 30000 // Last 30 seconds
    )

    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      executionId,
      currentTPS: recentTxs.length / 30, // TPS over last 30 seconds
      avgResponseTime: execMetrics.averageConfirmationTime,
      activeTransactions: transactions.filter(t => t.status === 'pending').length,
      queuedTransactions: Math.max(0, execMetrics.totalTransactions - transactions.length),
      totalProcessed: transactions.filter(t => t.status !== 'pending').length,
      successCount: execMetrics.successfulTransactions,
      errorCount: execMetrics.failedTransactions,
      avgGasUsed: execMetrics.averageGasUsed
    }

    const snapshots = this.performanceSnapshots.get(executionId) || []
    snapshots.push(snapshot)
    this.performanceSnapshots.set(executionId, snapshots)

    // Notify subscribers
    this.metricsSubscribers.forEach(callback => {
      try {
        callback(snapshot)
      } catch (error) {
        console.error('Error in metrics subscriber:', error)
      }
    })
  }

  private groupMetricsData(
    data: HistoricalMetrics[], 
    groupBy: MetricsAggregation['groupBy']
  ): Map<string, HistoricalMetrics[]> {
    const groups = new Map<string, HistoricalMetrics[]>()

    data.forEach(item => {
      let key: string

      switch (groupBy) {
        case 'execution':
          key = item.executionId
          break
        case 'date':
          key = item.timestamp.toISOString().split('T')[0]
          break
        case 'hour':
          key = item.timestamp.toISOString().split('T')[0] + '-' + 
                item.timestamp.getHours().toString().padStart(2, '0')
          break
        case 'function':
          key = item.metrics.config.functionName
          break
        case 'network':
          key = item.metrics.config.network
          break
        case 'account':
          // This would need account-specific grouping logic
          key = 'all-accounts'
          break
        default:
          key = 'unknown'
      }

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(item)
    })

    return groups
  }

  private convertToCsv(data: HistoricalMetrics[]): string {
    if (data.length === 0) return ''

    const headers = [
      'executionId', 'timestamp', 'duration', 'totalTransactions',
      'successfulTransactions', 'failedTransactions', 'successRate',
      'transactionsPerSecond', 'averageConfirmationTime', 'totalGasUsed',
      'averageGasUsed', 'errorRate'
    ]

    const rows = data.map(item => [
      item.executionId,
      item.timestamp.toISOString(),
      item.metrics.duration || 0,
      item.metrics.totalTransactions,
      item.metrics.successfulTransactions,
      item.metrics.failedTransactions,
      item.metrics.successRate.toFixed(2),
      item.metrics.transactionsPerSecond.toFixed(2),
      item.metrics.averageConfirmationTime.toFixed(0),
      item.metrics.totalGasUsed.toString(),
      item.metrics.averageGasUsed.toString(),
      item.metrics.errorRate.toFixed(2)
    ])

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  }

  private categorizeError(error: string): string {
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
    
    return 'unknown'
  }
}

// Export singleton instance
export const testMetricsService = new TestMetricsService()

// Export convenience functions
export function startMetricsCollection(execution: TestExecution): void {
  testMetricsService.startExecution(execution)
}

export function recordTransactionMetrics(
  executionId: string,
  txHash: Hash,
  iteration: number,
  account: Address,
  functionName: string,
  gasLimit: bigint,
  gasPrice: bigint
): void {
  testMetricsService.recordTransactionStart(
    executionId, txHash, iteration, account, functionName, gasLimit, gasPrice
  )
}

export function recordTransactionSuccess(
  txHash: Hash,
  gasUsed: bigint,
  blockNumber: bigint,
  blockHash: Hash,
  transactionIndex: number,
  networkLatency?: number
): void {
  testMetricsService.recordTransactionConfirmation(
    txHash, gasUsed, blockNumber, blockHash, transactionIndex, networkLatency
  )
}

export function recordTransactionError(
  txHash: Hash,
  error: string,
  retryCount?: number
): void {
  testMetricsService.recordTransactionFailure(txHash, error, retryCount)
}

export function endMetricsCollection(executionId: string): ExecutionMetrics | null {
  return testMetricsService.endExecution(executionId)
}