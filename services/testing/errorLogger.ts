import { type Address, type Hash } from 'viem'
import type { TestExecution, TestTransaction, TestError } from '@/types/testing'
import type { ErrorContext, ErrorAnalysis } from './errorRecovery'

export interface LogEntry {
  id: string
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical'
  category: 'test' | 'transaction' | 'network' | 'contract' | 'gas' | 'user' | 'system'
  message: string
  context?: Record<string, any>
  stackTrace?: string
  executionId?: string
  account?: Address
  txHash?: Hash
  retryCount?: number
  tags?: string[]
}

export interface ErrorLogEntry extends LogEntry {
  level: 'error' | 'critical'
  error: Error
  analysis?: ErrorAnalysis
  recoveryAttempts: RecoveryAttempt[]
  resolved: boolean
  resolution?: string
}

export interface RecoveryAttempt {
  id: string
  timestamp: Date
  actionId: string
  actionName: string
  success: boolean
  duration: number
  details?: string
  error?: string
}

export interface LogFilter {
  level?: LogEntry['level'][]
  category?: LogEntry['category'][]
  executionId?: string
  account?: Address
  timeRange?: {
    start: Date
    end: Date
  }
  search?: string
  tags?: string[]
  showResolved?: boolean
}

export interface LogExportOptions {
  format: 'json' | 'csv' | 'txt'
  filter?: LogFilter
  includeStackTraces?: boolean
  includeContext?: boolean
  anonymizeAccounts?: boolean
}

/**
 * Comprehensive Error Logging Service for Test Execution
 */
export class TestErrorLogger {
  private logs: LogEntry[] = []
  private errorLogs: Map<string, ErrorLogEntry> = new Map()
  private subscribers = new Set<(entry: LogEntry) => void>()
  private maxLogEntries = 10000
  private autoFlushThreshold = 1000

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>, category: LogEntry['category'] = 'system'): void {
    this.addLog('debug', category, message, context)
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>, category: LogEntry['category'] = 'system'): void {
    this.addLog('info', category, message, context)
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: Record<string, any>, category: LogEntry['category'] = 'system'): void {
    this.addLog('warn', category, message, context)
  }

  /**
   * Log an error
   */
  error(message: string, error?: Error, context?: Record<string, any>, category: LogEntry['category'] = 'system'): void {
    this.addLog('error', category, message, context, error?.stack)
    
    if (error) {
      this.trackError(error, context, category)
    }
  }

  /**
   * Log a critical error
   */
  critical(message: string, error?: Error, context?: Record<string, any>, category: LogEntry['category'] = 'system'): void {
    this.addLog('critical', category, message, context, error?.stack)
    
    if (error) {
      this.trackError(error, context, category)
    }
  }

  /**
   * Log test execution events
   */
  logTestEvent(
    level: LogEntry['level'],
    message: string,
    execution: TestExecution,
    context?: Record<string, any>
  ): void {
    this.addLog(level, 'test', message, {
      ...context,
      executionId: execution.id,
      executionName: execution.name,
      status: execution.status,
      currentIteration: execution.currentIteration,
      totalIterations: execution.totalIterations,
      successCount: execution.successCount,
      failureCount: execution.failureCount
    })
  }

  /**
   * Log transaction events
   */
  logTransaction(
    level: LogEntry['level'],
    message: string,
    transaction: TestTransaction,
    context?: Record<string, any>
  ): void {
    this.addLog(level, 'transaction', message, {
      ...context,
      executionId: transaction.executionId,
      txHash: transaction.txHash,
      account: transaction.account,
      status: transaction.status,
      gasUsed: transaction.gasUsed?.toString(),
      gasPrice: transaction.gasPrice?.toString(),
      confirmationTime: transaction.confirmationTime
    }, undefined, transaction.executionId, transaction.account, transaction.txHash)
  }

  /**
   * Log network events
   */
  logNetworkEvent(
    level: LogEntry['level'],
    message: string,
    context?: Record<string, any>
  ): void {
    this.addLog(level, 'network', message, {
      ...context,
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log contract interaction events
   */
  logContractEvent(
    level: LogEntry['level'],
    message: string,
    contractAddress: Address,
    functionName: string,
    context?: Record<string, any>
  ): void {
    this.addLog(level, 'contract', message, {
      ...context,
      contractAddress,
      functionName
    })
  }

  /**
   * Log gas-related events
   */
  logGasEvent(
    level: LogEntry['level'],
    message: string,
    gasUsed?: bigint,
    gasPrice?: bigint,
    context?: Record<string, any>
  ): void {
    this.addLog(level, 'gas', message, {
      ...context,
      gasUsed: gasUsed?.toString(),
      gasPrice: gasPrice?.toString(),
      gasCost: gasUsed && gasPrice ? (gasUsed * gasPrice).toString() : undefined
    })
  }

  /**
   * Track a comprehensive error with full context
   */
  trackError(
    error: Error,
    context?: Record<string, any>,
    category: LogEntry['category'] = 'system',
    analysis?: ErrorAnalysis
  ): ErrorLogEntry {
    const errorEntry: ErrorLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level: this.isCritical(error) ? 'critical' : 'error',
      category,
      message: error.message,
      context,
      stackTrace: error.stack,
      error,
      analysis,
      recoveryAttempts: [],
      resolved: false,
      executionId: context?.executionId,
      account: context?.account,
      txHash: context?.txHash,
      retryCount: context?.retryCount || 0,
      tags: this.generateErrorTags(error, context)
    }

    this.errorLogs.set(errorEntry.id, errorEntry)
    this.addLogEntry(errorEntry)
    
    return errorEntry
  }

  /**
   * Log a recovery attempt
   */
  logRecoveryAttempt(
    errorId: string,
    actionId: string,
    actionName: string,
    success: boolean,
    duration: number,
    details?: string,
    error?: string
  ): void {
    const errorEntry = this.errorLogs.get(errorId)
    if (!errorEntry) return

    const attempt: RecoveryAttempt = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      actionId,
      actionName,
      success,
      duration,
      details,
      error
    }

    errorEntry.recoveryAttempts.push(attempt)
    
    this.info(`Recovery attempt ${success ? 'succeeded' : 'failed'}: ${actionName}`, {
      errorId,
      actionId,
      duration,
      details,
      error
    }, 'system')
  }

  /**
   * Mark error as resolved
   */
  resolveError(errorId: string, resolution: string): void {
    const errorEntry = this.errorLogs.get(errorId)
    if (!errorEntry) return

    errorEntry.resolved = true
    errorEntry.resolution = resolution
    
    this.info(`Error resolved: ${resolution}`, {
      errorId,
      originalError: errorEntry.message
    }, 'system')
  }

  /**
   * Get filtered logs
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs]

    if (filter) {
      // Filter by level
      if (filter.level && filter.level.length > 0) {
        filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level))
      }

      // Filter by category
      if (filter.category && filter.category.length > 0) {
        filteredLogs = filteredLogs.filter(log => filter.category!.includes(log.category))
      }

      // Filter by execution ID
      if (filter.executionId) {
        filteredLogs = filteredLogs.filter(log => log.executionId === filter.executionId)
      }

      // Filter by account
      if (filter.account) {
        filteredLogs = filteredLogs.filter(log => log.account === filter.account)
      }

      // Filter by time range
      if (filter.timeRange) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp >= filter.timeRange!.start && 
          log.timestamp <= filter.timeRange!.end
        )
      }

      // Filter by search term
      if (filter.search) {
        const searchLower = filter.search.toLowerCase()
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(searchLower) ||
          (log.context && JSON.stringify(log.context).toLowerCase().includes(searchLower))
        )
      }

      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        filteredLogs = filteredLogs.filter(log => 
          log.tags && filter.tags!.some(tag => log.tags!.includes(tag))
        )
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get error logs with additional filtering
   */
  getErrorLogs(filter?: LogFilter & { showResolved?: boolean }): ErrorLogEntry[] {
    let errorEntries = Array.from(this.errorLogs.values())

    if (filter?.showResolved === false) {
      errorEntries = errorEntries.filter(entry => !entry.resolved)
    }

    // Apply standard filters
    if (filter) {
      const baseFilter = { ...filter }
      delete baseFilter.showResolved
      
      if (Object.keys(baseFilter).length > 0) {
        const filteredIds = new Set(this.getLogs(baseFilter).map(log => log.id))
        errorEntries = errorEntries.filter(entry => filteredIds.has(entry.id))
      }
    }

    return errorEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get log statistics
   */
  getLogStatistics(executionId?: string): {
    total: number
    byLevel: Record<LogEntry['level'], number>
    byCategory: Record<LogEntry['category'], number>
    errorRate: number
    resolvedErrors: number
    criticalErrors: number
    topErrors: { message: string; count: number }[]
  } {
    const logs = executionId 
      ? this.getLogs({ executionId })
      : this.logs

    const byLevel: Record<LogEntry['level'], number> = {
      debug: 0, info: 0, warn: 0, error: 0, critical: 0
    }
    
    const byCategory: Record<LogEntry['category'], number> = {
      test: 0, transaction: 0, network: 0, contract: 0, gas: 0, user: 0, system: 0
    }

    const errorMessages = new Map<string, number>()
    
    logs.forEach(log => {
      byLevel[log.level]++
      byCategory[log.category]++
      
      if (log.level === 'error' || log.level === 'critical') {
        const count = errorMessages.get(log.message) || 0
        errorMessages.set(log.message, count + 1)
      }
    })

    const errorEntries = executionId
      ? Array.from(this.errorLogs.values()).filter(e => e.executionId === executionId)
      : Array.from(this.errorLogs.values())

    const resolvedErrors = errorEntries.filter(e => e.resolved).length
    const criticalErrors = errorEntries.filter(e => e.level === 'critical').length

    const topErrors = Array.from(errorMessages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }))

    return {
      total: logs.length,
      byLevel,
      byCategory,
      errorRate: logs.length > 0 ? (byLevel.error + byLevel.critical) / logs.length : 0,
      resolvedErrors,
      criticalErrors,
      topErrors
    }
  }

  /**
   * Export logs
   */
  exportLogs(options: LogExportOptions): string {
    const logs = this.getLogs(options.filter)
    
    switch (options.format) {
      case 'json':
        return this.exportAsJson(logs, options)
      case 'csv':
        return this.exportAsCsv(logs, options)
      case 'txt':
        return this.exportAsText(logs, options)
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  }

  /**
   * Clear logs
   */
  clearLogs(filter?: LogFilter): void {
    if (!filter) {
      this.logs = []
      this.errorLogs.clear()
      return
    }

    const logsToKeep = this.logs.filter(log => {
      // Invert the filter logic to keep non-matching logs
      if (filter.executionId && log.executionId === filter.executionId) return false
      if (filter.level && filter.level.includes(log.level)) return false
      if (filter.category && filter.category.includes(log.category)) return false
      return true
    })

    this.logs = logsToKeep
    
    // Clean up error logs
    Array.from(this.errorLogs.entries()).forEach(([id, errorEntry]) => {
      if (!logsToKeep.find(log => log.id === id)) {
        this.errorLogs.delete(id)
      }
    })
  }

  /**
   * Subscribe to new log entries
   */
  subscribe(callback: (entry: LogEntry) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  // Private methods
  private addLog(
    level: LogEntry['level'],
    category: LogEntry['category'],
    message: string,
    context?: Record<string, any>,
    stackTrace?: string,
    executionId?: string,
    account?: Address,
    txHash?: Hash,
    retryCount?: number,
    tags?: string[]
  ): void {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      category,
      message,
      context,
      stackTrace,
      executionId,
      account,
      txHash,
      retryCount,
      tags
    }

    this.addLogEntry(entry)
  }

  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry)
    
    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(entry)
      } catch (error) {
        console.error('Error in log subscriber:', error)
      }
    })

    // Auto-flush if threshold reached
    if (this.logs.length >= this.maxLogEntries + this.autoFlushThreshold) {
      this.flushOldLogs()
    }
  }

  private flushOldLogs(): void {
    // Keep only the most recent logs
    const logsToKeep = this.logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, this.maxLogEntries)
    
    this.logs = logsToKeep
    
    // Clean up error logs
    const keepIds = new Set(logsToKeep.map(log => log.id))
    Array.from(this.errorLogs.keys()).forEach(id => {
      if (!keepIds.has(id)) {
        this.errorLogs.delete(id)
      }
    })
  }

  private isCritical(error: Error): boolean {
    const message = error.message.toLowerCase()
    return message.includes('critical') || 
           message.includes('fatal') || 
           message.includes('out of memory') ||
           message.includes('system error')
  }

  private generateErrorTags(error: Error, context?: Record<string, any>): string[] {
    const tags: string[] = []
    const message = error.message.toLowerCase()

    if (message.includes('network')) tags.push('network-issue')
    if (message.includes('gas')) tags.push('gas-issue')
    if (message.includes('timeout')) tags.push('timeout')
    if (message.includes('revert')) tags.push('contract-revert')
    if (message.includes('insufficient')) tags.push('insufficient-funds')
    if (message.includes('nonce')) tags.push('nonce-issue')
    if (message.includes('rejected')) tags.push('user-rejection')
    
    if (context?.retryCount && context.retryCount > 0) {
      tags.push('retried')
    }
    
    return tags
  }

  private exportAsJson(logs: LogEntry[], options: LogExportOptions): string {
    const exportData = logs.map(log => {
      const entry = { ...log }
      
      if (!options.includeStackTraces) {
        delete entry.stackTrace
      }
      
      if (!options.includeContext) {
        delete entry.context
      }
      
      if (options.anonymizeAccounts && entry.account) {
        entry.account = this.anonymizeAddress(entry.account)
      }
      
      return entry
    })

    return JSON.stringify(exportData, null, 2)
  }

  private exportAsCsv(logs: LogEntry[], options: LogExportOptions): string {
    if (logs.length === 0) return ''

    const headers = ['timestamp', 'level', 'category', 'message', 'executionId', 'account', 'txHash']
    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.level,
      log.category,
      `"${log.message.replace(/"/g, '""')}"`, // Escape quotes
      log.executionId || '',
      options.anonymizeAccounts && log.account ? this.anonymizeAddress(log.account) : log.account || '',
      log.txHash || ''
    ])

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  }

  private exportAsText(logs: LogEntry[], options: LogExportOptions): string {
    return logs.map(log => {
      let line = `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()} (${log.category}): ${log.message}`
      
      if (log.executionId) {
        line += ` | Execution: ${log.executionId}`
      }
      
      if (log.account) {
        const account = options.anonymizeAccounts ? this.anonymizeAddress(log.account) : log.account
        line += ` | Account: ${account}`
      }
      
      if (log.txHash) {
        line += ` | TX: ${log.txHash}`
      }
      
      return line
    }).join('\n')
  }

  private anonymizeAddress(address: Address): Address {
    return `${address.slice(0, 6)}...${address.slice(-4)}` as Address
  }
}

// Export singleton instance
export const testErrorLogger = new TestErrorLogger()

// Export convenience functions
export function logTest(level: LogEntry['level'], message: string, execution: TestExecution, context?: Record<string, any>): void {
  testErrorLogger.logTestEvent(level, message, execution, context)
}

export function logTransaction(level: LogEntry['level'], message: string, transaction: TestTransaction, context?: Record<string, any>): void {
  testErrorLogger.logTransaction(level, message, transaction, context)
}

export function logError(message: string, error: Error, context?: Record<string, any>, category: LogEntry['category'] = 'system'): ErrorLogEntry {
  return testErrorLogger.trackError(error, context, category)
}

export function logNetworkError(message: string, error?: Error, context?: Record<string, any>): void {
  if (error) {
    testErrorLogger.error(message, error, context, 'network')
  } else {
    testErrorLogger.logNetworkEvent('error', message, context)
  }
}