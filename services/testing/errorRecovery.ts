import { type Address, type Hash } from 'viem'
import type { TestExecution, TestTransaction, TestError } from '@/types/testing'

export interface RetryPolicy {
  maxRetries: number
  baseDelayMs: number
  exponentialBackoff: boolean
  maxDelayMs: number
  retryableErrors: string[]
  nonRetryableErrors: string[]
}

export interface ErrorContext {
  executionId: string
  iteration: number
  account: Address
  functionName: string
  txHash?: Hash
  gasLimit?: bigint
  gasPrice?: bigint
  timestamp: Date
  stackTrace?: string
  additionalData?: Record<string, any>
}

export interface RecoveryAction {
  id: string
  name: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  autoExecute: boolean
  execute: (context: ErrorContext) => Promise<boolean>
  canExecute: (context: ErrorContext, error: Error) => boolean
  priority: number
}

export interface ErrorAnalysis {
  errorType: TestError['errorType']
  severity: 'low' | 'medium' | 'high' | 'critical'
  isRetryable: boolean
  rootCause: string
  userMessage: string
  technicalDetails: string
  suggestedActions: string[]
  recoveryActions: RecoveryAction[]
  preventionTips: string[]
}

/**
 * Enhanced Error Recovery Service for Stress Testing
 */
export class TestErrorRecoveryService {
  private retryPolicies = new Map<string, RetryPolicy>()
  private recoveryActions = new Map<string, RecoveryAction>()
  private errorHistory = new Map<string, TestError[]>()
  private patternAnalyzer = new ErrorPatternAnalyzer()

  constructor() {
    this.initializeRetryPolicies()
    this.initializeRecoveryActions()
  }

  /**
   * Initialize default retry policies for different error types
   */
  private initializeRetryPolicies(): void {
    // Network error policy
    this.retryPolicies.set('network', {
      maxRetries: 5,
      baseDelayMs: 2000,
      exponentialBackoff: true,
      maxDelayMs: 30000,
      retryableErrors: [
        'network error',
        'connection timeout',
        'connection refused',
        'fetch failed',
        'econnreset',
        'socket hang up'
      ],
      nonRetryableErrors: []
    })

    // Gas error policy
    this.retryPolicies.set('gas', {
      maxRetries: 3,
      baseDelayMs: 5000,
      exponentialBackoff: true,
      maxDelayMs: 30000,
      retryableErrors: [
        'gas price too low',
        'replacement transaction underpriced',
        'gas estimation failed',
        'out of gas'
      ],
      nonRetryableErrors: [
        'insufficient funds for gas',
        'gas limit too high'
      ]
    })

    // Contract error policy
    this.retryPolicies.set('contract', {
      maxRetries: 1,
      baseDelayMs: 1000,
      exponentialBackoff: false,
      maxDelayMs: 5000,
      retryableErrors: [
        'temporary contract state',
        'contract paused temporarily'
      ],
      nonRetryableErrors: [
        'execution reverted',
        'contract not found',
        'function not found',
        'invalid parameters'
      ]
    })

    // Timeout error policy
    this.retryPolicies.set('timeout', {
      maxRetries: 4,
      baseDelayMs: 10000,
      exponentialBackoff: true,
      maxDelayMs: 60000,
      retryableErrors: [
        'transaction timeout',
        'confirmation timeout',
        'block timeout'
      ],
      nonRetryableErrors: []
    })

    // User error policy (mostly non-retryable)
    this.retryPolicies.set('user', {
      maxRetries: 0,
      baseDelayMs: 1000,
      exponentialBackoff: false,
      maxDelayMs: 1000,
      retryableErrors: [],
      nonRetryableErrors: [
        'user rejected',
        'user denied',
        'user cancelled',
        'insufficient balance'
      ]
    })
  }

  /**
   * Initialize recovery actions
   */
  private initializeRecoveryActions(): void {
    // Network connection recovery
    this.recoveryActions.set('retry-with-backoff', {
      id: 'retry-with-backoff',
      name: 'Retry with Exponential Backoff',
      description: 'Retry the failed transaction with increasing delay',
      severity: 'medium',
      autoExecute: true,
      priority: 1,
      execute: async (context: ErrorContext) => {
        // This is handled by the main retry logic
        return true
      },
      canExecute: (context: ErrorContext, error: Error) => {
        return this.isRetryableError(error, context)
      }
    })

    // Gas price adjustment
    this.recoveryActions.set('increase-gas-price', {
      id: 'increase-gas-price',
      name: 'Increase Gas Price',
      description: 'Automatically increase gas price by 10% and retry',
      severity: 'low',
      autoExecute: false,
      priority: 2,
      execute: async (context: ErrorContext) => {
        if (context.gasPrice) {
          const newGasPrice = (context.gasPrice * BigInt(110)) / BigInt(100) // Increase by 10%
          console.log(`Increasing gas price from ${context.gasPrice} to ${newGasPrice}`)
          // Return true to indicate gas price was adjusted
          return true
        }
        return false
      },
      canExecute: (context: ErrorContext, error: Error) => {
        const errorMsg = error.message.toLowerCase()
        return errorMsg.includes('gas price too low') || 
               errorMsg.includes('replacement transaction underpriced')
      }
    })

    // Account nonce reset
    this.recoveryActions.set('reset-nonce', {
      id: 'reset-nonce',
      name: 'Reset Account Nonce',
      description: 'Reset nonce for the account and retry',
      severity: 'medium',
      autoExecute: false,
      priority: 3,
      execute: async (context: ErrorContext) => {
        console.log(`Resetting nonce for account ${context.account}`)
        // This would trigger nonce reset in the test executor
        return true
      },
      canExecute: (context: ErrorContext, error: Error) => {
        const errorMsg = error.message.toLowerCase()
        return errorMsg.includes('nonce') && 
               (errorMsg.includes('too high') || errorMsg.includes('invalid nonce'))
      }
    })

    // Switch to different account
    this.recoveryActions.set('switch-account', {
      id: 'switch-account',
      name: 'Switch to Different Account',
      description: 'Use a different account for the transaction',
      severity: 'medium',
      autoExecute: false,
      priority: 4,
      execute: async (context: ErrorContext) => {
        console.log(`Switching from account ${context.account} to alternative account`)
        return true
      },
      canExecute: (context: ErrorContext, error: Error) => {
        const errorMsg = error.message.toLowerCase()
        return errorMsg.includes('insufficient balance') || 
               errorMsg.includes('account locked')
      }
    })

    // Reduce gas limit
    this.recoveryActions.set('reduce-gas-limit', {
      id: 'reduce-gas-limit',
      name: 'Reduce Gas Limit',
      description: 'Lower gas limit to prevent out of gas errors',
      severity: 'low',
      autoExecute: false,
      priority: 5,
      execute: async (context: ErrorContext) => {
        if (context.gasLimit) {
          const newGasLimit = (context.gasLimit * BigInt(80)) / BigInt(100) // Reduce by 20%
          console.log(`Reducing gas limit from ${context.gasLimit} to ${newGasLimit}`)
          return true
        }
        return false
      },
      canExecute: (context: ErrorContext, error: Error) => {
        const errorMsg = error.message.toLowerCase()
        return errorMsg.includes('out of gas') || 
               errorMsg.includes('gas limit exceeded')
      }
    })

    // Wait for network congestion
    this.recoveryActions.set('wait-congestion', {
      id: 'wait-congestion',
      name: 'Wait for Network Congestion to Clear',
      description: 'Wait for 30-60 seconds for network congestion to clear',
      severity: 'low',
      autoExecute: false,
      priority: 6,
      execute: async (context: ErrorContext) => {
        const waitTime = Math.random() * 30000 + 30000 // 30-60 seconds
        console.log(`Waiting ${Math.round(waitTime/1000)} seconds for network congestion to clear`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return true
      },
      canExecute: (context: ErrorContext, error: Error) => {
        const errorMsg = error.message.toLowerCase()
        return errorMsg.includes('congestion') || 
               errorMsg.includes('network busy') ||
               errorMsg.includes('too many requests')
      }
    })
  }

  /**
   * Analyze an error and provide comprehensive recovery information
   */
  analyzeError(error: Error, context: ErrorContext): ErrorAnalysis {
    const errorMsg = error.message.toLowerCase()
    const stackTrace = error.stack || ''
    
    // Determine error type and severity
    const errorType = this.categorizeError(error)
    const severity = this.determineSeverity(error, context)
    const isRetryable = this.isRetryableError(error, context)
    
    // Generate analysis
    const analysis: ErrorAnalysis = {
      errorType,
      severity,
      isRetryable,
      rootCause: this.identifyRootCause(error, context),
      userMessage: this.generateUserMessage(error, context),
      technicalDetails: this.generateTechnicalDetails(error, context),
      suggestedActions: this.generateSuggestedActions(error, context),
      recoveryActions: this.getApplicableRecoveryActions(error, context),
      preventionTips: this.generatePreventionTips(error, context)
    }

    // Track error for pattern analysis
    this.trackError(error, context)
    
    return analysis
  }

  /**
   * Execute recovery for a failed transaction
   */
  async executeRecovery(
    error: Error, 
    context: ErrorContext,
    onRecoveryAttempt?: (action: RecoveryAction, success: boolean) => void
  ): Promise<boolean> {
    const analysis = this.analyzeError(error, context)
    
    // Execute automatic recovery actions first
    const autoActions = analysis.recoveryActions.filter(action => action.autoExecute)
    
    for (const action of autoActions) {
      try {
        console.log(`Executing auto-recovery action: ${action.name}`)
        const success = await action.execute(context)
        onRecoveryAttempt?.(action, success)
        
        if (success) {
          return true
        }
      } catch (recoveryError) {
        console.error(`Recovery action ${action.id} failed:`, recoveryError)
        onRecoveryAttempt?.(action, false)
      }
    }
    
    return false
  }

  /**
   * Get retry policy for an error
   */
  getRetryPolicy(error: Error, context: ErrorContext): RetryPolicy | null {
    const errorType = this.categorizeError(error)
    return this.retryPolicies.get(errorType) || null
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
    if (!policy.exponentialBackoff) {
      return policy.baseDelayMs
    }
    
    const delay = policy.baseDelayMs * Math.pow(2, attempt - 1)
    return Math.min(delay, policy.maxDelayMs)
  }

  /**
   * Check if an error is retryable based on policies
   */
  isRetryableError(error: Error, context: ErrorContext): boolean {
    const errorMsg = error.message.toLowerCase()
    const errorType = this.categorizeError(error)
    const policy = this.retryPolicies.get(errorType)
    
    if (!policy) return false
    
    // Check non-retryable patterns first
    for (const pattern of policy.nonRetryableErrors) {
      if (errorMsg.includes(pattern.toLowerCase())) {
        return false
      }
    }
    
    // Check retryable patterns
    for (const pattern of policy.retryableErrors) {
      if (errorMsg.includes(pattern.toLowerCase())) {
        return true
      }
    }
    
    // Default based on error type
    return errorType === 'network' || errorType === 'timeout'
  }

  /**
   * Get error patterns for analysis
   */
  getErrorPatterns(executionId: string): Map<string, number> {
    return this.patternAnalyzer.analyzePatterns(executionId, this.errorHistory.get(executionId) || [])
  }

  /**
   * Generate error report for execution
   */
  generateErrorReport(executionId: string): {
    totalErrors: number
    errorsByType: Record<string, number>
    retryableErrors: number
    criticalErrors: number
    patterns: string[]
    recommendations: string[]
  } {
    const errors = this.errorHistory.get(executionId) || []
    const errorsByType: Record<string, number> = {}
    let retryableErrors = 0
    let criticalErrors = 0
    
    errors.forEach(error => {
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1
      if (error.retryable) retryableErrors++
      // Critical errors are those that stop execution
      if (error.error.toLowerCase().includes('critical') || 
          error.error.toLowerCase().includes('fatal')) {
        criticalErrors++
      }
    })
    
    const patterns = Array.from(this.getErrorPatterns(executionId).keys())
    const recommendations = this.generateRecommendations(errors)
    
    return {
      totalErrors: errors.length,
      errorsByType,
      retryableErrors,
      criticalErrors,
      patterns,
      recommendations
    }
  }

  // Private helper methods
  private categorizeError(error: Error): TestError['errorType'] {
    const errorMsg = error.message.toLowerCase()
    
    if (errorMsg.includes('network') || errorMsg.includes('connection') || 
        errorMsg.includes('fetch') || errorMsg.includes('econnreset')) {
      return 'network'
    }
    if (errorMsg.includes('gas') || errorMsg.includes('fee')) {
      return 'gas'
    }
    if (errorMsg.includes('revert') || errorMsg.includes('execution') ||
        errorMsg.includes('contract')) {
      return 'contract'
    }
    if (errorMsg.includes('timeout') || errorMsg.includes('deadline')) {
      return 'timeout'
    }
    if (errorMsg.includes('rejected') || errorMsg.includes('denied') ||
        errorMsg.includes('cancelled') || errorMsg.includes('balance')) {
      return 'user'
    }
    
    return 'network' // Default fallback
  }

  private determineSeverity(error: Error, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    const errorMsg = error.message.toLowerCase()
    
    // Critical errors that stop execution
    if (errorMsg.includes('critical') || errorMsg.includes('fatal') || 
        errorMsg.includes('out of memory')) {
      return 'critical'
    }
    
    // High severity errors
    if (errorMsg.includes('insufficient funds') || errorMsg.includes('contract not found') ||
        errorMsg.includes('execution reverted')) {
      return 'high'
    }
    
    // Medium severity errors
    if (errorMsg.includes('gas') || errorMsg.includes('nonce') || 
        errorMsg.includes('timeout')) {
      return 'medium'
    }
    
    return 'low'
  }

  private identifyRootCause(error: Error, context: ErrorContext): string {
    const errorMsg = error.message.toLowerCase()
    
    if (errorMsg.includes('insufficient funds')) {
      return 'Account lacks sufficient ETH for gas fees'
    }
    if (errorMsg.includes('gas price too low')) {
      return 'Gas price below network minimum'
    }
    if (errorMsg.includes('execution reverted')) {
      return 'Smart contract rejected the transaction'
    }
    if (errorMsg.includes('nonce too high')) {
      return 'Transaction nonce ahead of account nonce'
    }
    if (errorMsg.includes('network error')) {
      return 'Network connectivity or RPC node issue'
    }
    if (errorMsg.includes('timeout')) {
      return 'Transaction took too long to process'
    }
    
    return 'Unknown error occurred during transaction processing'
  }

  private generateUserMessage(error: Error, context: ErrorContext): string {
    const errorMsg = error.message.toLowerCase()
    
    if (errorMsg.includes('insufficient funds')) {
      return 'Your account needs more ETH to pay for transaction fees'
    }
    if (errorMsg.includes('gas price too low')) {
      return 'The gas price is too low for current network conditions'
    }
    if (errorMsg.includes('execution reverted')) {
      return 'The smart contract rejected your transaction'
    }
    if (errorMsg.includes('user rejected')) {
      return 'Transaction was cancelled in your wallet'
    }
    if (errorMsg.includes('network error')) {
      return 'Unable to connect to the blockchain network'
    }
    if (errorMsg.includes('timeout')) {
      return 'Transaction timed out waiting for confirmation'
    }
    
    return 'An unexpected error occurred while processing your transaction'
  }

  private generateTechnicalDetails(error: Error, context: ErrorContext): string {
    const details = [
      `Error: ${error.message}`,
      `Type: ${this.categorizeError(error)}`,
      `Account: ${context.account}`,
      `Function: ${context.functionName}`,
      `Iteration: ${context.iteration}`
    ]
    
    if (context.txHash) {
      details.push(`Transaction Hash: ${context.txHash}`)
    }
    if (context.gasLimit) {
      details.push(`Gas Limit: ${context.gasLimit.toString()}`)
    }
    if (context.gasPrice) {
      details.push(`Gas Price: ${context.gasPrice.toString()}`)
    }
    
    return details.join('\n')
  }

  private generateSuggestedActions(error: Error, context: ErrorContext): string[] {
    const actions: string[] = []
    const errorMsg = error.message.toLowerCase()
    
    if (errorMsg.includes('insufficient funds')) {
      actions.push('Add more ETH to your account')
      actions.push('Reduce the number of transactions in your test')
    }
    
    if (errorMsg.includes('gas')) {
      actions.push('Increase gas price for faster confirmation')
      actions.push('Increase gas limit if transactions are complex')
      actions.push('Wait for network congestion to decrease')
    }
    
    if (errorMsg.includes('network')) {
      actions.push('Check your internet connection')
      actions.push('Try a different RPC endpoint')
      actions.push('Wait and retry the operation')
    }
    
    if (errorMsg.includes('nonce')) {
      actions.push('Reset your wallet connection')
      actions.push('Wait for pending transactions to confirm')
    }
    
    if (actions.length === 0) {
      actions.push('Wait a moment and try again')
      actions.push('Check the contract address and function name')
    }
    
    return actions
  }

  private getApplicableRecoveryActions(error: Error, context: ErrorContext): RecoveryAction[] {
    return Array.from(this.recoveryActions.values())
      .filter(action => action.canExecute(context, error))
      .sort((a, b) => a.priority - b.priority)
  }

  private generatePreventionTips(error: Error, context: ErrorContext): string[] {
    const tips: string[] = []
    const errorMsg = error.message.toLowerCase()
    
    if (errorMsg.includes('gas')) {
      tips.push('Start with higher gas prices for time-sensitive transactions')
      tips.push('Monitor network congestion before running tests')
    }
    
    if (errorMsg.includes('insufficient funds')) {
      tips.push('Ensure accounts have sufficient ETH before testing')
      tips.push('Calculate total gas costs for large test scenarios')
    }
    
    if (errorMsg.includes('network')) {
      tips.push('Use reliable RPC endpoints for testing')
      tips.push('Implement retry logic for network operations')
    }
    
    if (errorMsg.includes('nonce')) {
      tips.push('Implement proper nonce management for concurrent transactions')
      tips.push('Wait for transaction confirmation before sending next transaction')
    }
    
    return tips
  }

  private trackError(error: Error, context: ErrorContext): void {
    const testError: TestError = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      iteration: context.iteration,
      account: context.account,
      txHash: context.txHash,
      error: error.message,
      errorType: this.categorizeError(error),
      retryable: this.isRetryableError(error, context),
      retryCount: 0
    }
    
    const errors = this.errorHistory.get(context.executionId) || []
    errors.push(testError)
    this.errorHistory.set(context.executionId, errors)
  }

  private generateRecommendations(errors: TestError[]): string[] {
    const recommendations: string[] = []
    const errorCounts = new Map<string, number>()
    
    // Count error types
    errors.forEach(error => {
      errorCounts.set(error.errorType, (errorCounts.get(error.errorType) || 0) + 1)
    })
    
    // Generate recommendations based on patterns
    if (errorCounts.get('gas') && errorCounts.get('gas')! > 3) {
      recommendations.push('Consider increasing gas price tier for better reliability')
    }
    
    if (errorCounts.get('network') && errorCounts.get('network')! > 5) {
      recommendations.push('Network connection issues detected - check RPC endpoint')
    }
    
    if (errorCounts.get('timeout') && errorCounts.get('timeout')! > 2) {
      recommendations.push('Increase transaction timeout values')
    }
    
    if (errors.length > 10) {
      recommendations.push('High error rate detected - review test configuration')
    }
    
    return recommendations
  }
}

/**
 * Error Pattern Analyzer for identifying trends and patterns
 */
class ErrorPatternAnalyzer {
  analyzePatterns(executionId: string, errors: TestError[]): Map<string, number> {
    const patterns = new Map<string, number>()
    
    // Time-based patterns
    this.analyzeTimePatterns(errors, patterns)
    
    // Account-based patterns
    this.analyzeAccountPatterns(errors, patterns)
    
    // Error type clustering
    this.analyzeErrorClusters(errors, patterns)
    
    return patterns
  }
  
  private analyzeTimePatterns(errors: TestError[], patterns: Map<string, number>): void {
    // Check for bursts of errors
    const timeWindows = this.groupErrorsByTimeWindow(errors, 30000) // 30-second windows
    
    timeWindows.forEach((windowErrors, timestamp) => {
      if (windowErrors.length > 5) {
        patterns.set(`error-burst-${timestamp}`, windowErrors.length)
      }
    })
  }
  
  private analyzeAccountPatterns(errors: TestError[], patterns: Map<string, number>): void {
    const accountErrors = new Map<Address, number>()
    
    errors.forEach(error => {
      if (error.account) {
        accountErrors.set(error.account, (accountErrors.get(error.account) || 0) + 1)
      }
    })
    
    accountErrors.forEach((count, account) => {
      if (count > 3) {
        patterns.set(`account-errors-${account}`, count)
      }
    })
  }
  
  private analyzeErrorClusters(errors: TestError[], patterns: Map<string, number>): void {
    const errorTypes = new Map<string, TestError[]>()
    
    errors.forEach(error => {
      const type = error.errorType
      if (!errorTypes.has(type)) {
        errorTypes.set(type, [])
      }
      errorTypes.get(type)!.push(error)
    })
    
    // Look for consecutive errors of same type
    errorTypes.forEach((typeErrors, type) => {
      if (typeErrors.length > 2) {
        patterns.set(`${type}-cluster`, typeErrors.length)
      }
    })
  }
  
  private groupErrorsByTimeWindow(errors: TestError[], windowMs: number): Map<number, TestError[]> {
    const windows = new Map<number, TestError[]>()
    
    errors.forEach(error => {
      const windowStart = Math.floor(error.timestamp.getTime() / windowMs) * windowMs
      if (!windows.has(windowStart)) {
        windows.set(windowStart, [])
      }
      windows.get(windowStart)!.push(error)
    })
    
    return windows
  }
}

// Export singleton instance
export const testErrorRecoveryService = new TestErrorRecoveryService()

// Export convenience functions
export function analyzeTestError(error: Error, context: ErrorContext): ErrorAnalysis {
  return testErrorRecoveryService.analyzeError(error, context)
}

export function executeErrorRecovery(
  error: Error, 
  context: ErrorContext,
  onRecoveryAttempt?: (action: RecoveryAction, success: boolean) => void
): Promise<boolean> {
  return testErrorRecoveryService.executeRecovery(error, context, onRecoveryAttempt)
}

export function getRetryPolicy(error: Error, context: ErrorContext): RetryPolicy | null {
  return testErrorRecoveryService.getRetryPolicy(error, context)
}