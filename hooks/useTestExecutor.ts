'use client'

import { useState, useCallback, useRef } from 'react'
import { TestExecutor } from '@/services/testing/executor'
import { useTestMonitoring } from './useTestMonitoring'
import type { TestConfiguration, TestExecution, TestTransaction, TestError } from '@/types/testing'

interface UseTestExecutorOptions {
  onProgress?: (execution: TestExecution) => void
  onTransaction?: (transaction: TestTransaction) => void
  onError?: (error: TestError) => void
  onComplete?: (execution: TestExecution) => void
  enableMonitoring?: boolean
}

interface UseTestExecutorReturn {
  // Execution state
  execution: TestExecution | null
  isRunning: boolean
  isPaused: boolean
  
  // Monitoring state (from useTestMonitoring)
  transactions: TestTransaction[]
  errors: TestError[]
  monitoringStats: {
    totalMonitored: number
    pendingCount: number
    confirmedCount: number
    averageConfirmationTime: number
    successRate: number
  }
  
  // Actions
  startTest: (config: TestConfiguration) => Promise<TestExecution>
  pauseTest: () => void
  resumeTest: () => void
  stopTest: () => void
  retryTest: () => Promise<TestExecution>
  
  // Monitoring actions
  clearMonitoringHistory: () => void
  
  // Computed properties for UI compatibility
  progress: number
  successRate: number
  transactionsPerSecond: number
  estimatedTimeRemaining: number
  recentErrors: TestError[]
}

/**
 * Enhanced test executor hook with integrated real-time monitoring
 */
export function useTestExecutor(options: UseTestExecutorOptions = {}): UseTestExecutorReturn {
  const {
    onProgress,
    onTransaction,
    onError,
    onComplete,
    enableMonitoring = true
  } = options

  const [execution, setExecution] = useState<TestExecution | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [lastConfig, setLastConfig] = useState<TestConfiguration | null>(null)

  const executorRef = useRef<TestExecutor | null>(null)

  // Setup monitoring
  const monitoring = useTestMonitoring({
    network: execution?.config.network || 'local',
    pollInterval: 2000,
    enableWebSocket: false
  })

  // Enhanced progress handler
  const handleProgress = useCallback((executionUpdate: TestExecution) => {
    setExecution(executionUpdate)
    onProgress?.(executionUpdate)
  }, [onProgress])

  // Enhanced transaction handler that adds to monitoring
  const handleTransaction = useCallback((transaction: TestTransaction) => {
    // Add to monitoring system if hash is available
    if (enableMonitoring && transaction.txHash && monitoring.service) {
      monitoring.addTransaction(
        transaction.txHash,
        transaction.executionId,
        transaction.iteration,
        transaction.account
      )
    }
    
    onTransaction?.(transaction)
  }, [onTransaction, enableMonitoring, monitoring])

  // Enhanced error handler
  const handleError = useCallback((error: TestError) => {
    onError?.(error)
  }, [onError])

  // Enhanced completion handler
  const handleComplete = useCallback(async (completedExecution: TestExecution) => {
    setIsRunning(false)
    setIsPaused(false)
    setExecution(completedExecution)
    
    // Stop monitoring after a delay to catch any final transactions
    if (enableMonitoring) {
      setTimeout(() => {
        monitoring.stopMonitoring()
      }, 5000)
    }
    
    onComplete?.(completedExecution)
  }, [onComplete, enableMonitoring, monitoring])

  // Start test execution
  const startTest = useCallback(async (config: TestConfiguration): Promise<TestExecution> => {
    if (isRunning) {
      throw new Error('Test is already running')
    }

    try {
      // Store config for retry functionality
      setLastConfig(config)
      
      // Create new executor instance
      executorRef.current = new TestExecutor({
        onProgress: handleProgress,
        onTransaction: handleTransaction,
        onError: handleError,
        onComplete: handleComplete
      })

      setIsRunning(true)
      setIsPaused(false)
      
      // Start monitoring if enabled
      if (enableMonitoring) {
        const dummyExecution: TestExecution = {
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
        
        await monitoring.startMonitoring(dummyExecution)
      }

      // Start the actual test execution
      const result = await executorRef.current.startTest(config)
      
      return result
    } catch (error) {
      setIsRunning(false)
      setIsPaused(false)
      
      if (enableMonitoring) {
        await monitoring.stopMonitoring()
      }
      
      throw error
    }
  }, [isRunning, handleProgress, handleTransaction, handleError, handleComplete, enableMonitoring, monitoring])

  // Pause test execution
  const pauseTest = useCallback(() => {
    if (executorRef.current && isRunning && !isPaused) {
      executorRef.current.pauseTest()
      setIsPaused(true)
    }
  }, [isRunning, isPaused])

  // Resume test execution
  const resumeTest = useCallback(() => {
    if (executorRef.current && isRunning && isPaused) {
      executorRef.current.resumeTest()
      setIsPaused(false)
    }
  }, [isRunning, isPaused])

  // Stop test execution
  const stopTest = useCallback(async () => {
    if (executorRef.current && isRunning) {
      executorRef.current.stopTest()
      setIsRunning(false)
      setIsPaused(false)
      
      if (enableMonitoring) {
        await monitoring.stopMonitoring()
      }
    }
  }, [isRunning, enableMonitoring, monitoring])

  // Retry the last test with same configuration
  const retryTest = useCallback(async (): Promise<TestExecution> => {
    if (!lastConfig) {
      throw new Error('No previous test configuration to retry')
    }
    
    // Clear previous monitoring data
    if (enableMonitoring) {
      monitoring.clearHistory()
    }
    
    return startTest(lastConfig)
  }, [lastConfig, startTest, enableMonitoring, monitoring])

  // Clear monitoring history
  const clearMonitoringHistory = useCallback(() => {
    monitoring.clearHistory()
  }, [monitoring])

  // Computed properties for UI compatibility
  const progress = execution 
    ? (execution.totalIterations > 0 ? (execution.currentIteration / execution.totalIterations) * 100 : 0)
    : 0

  const successRate = monitoring.stats.successRate

  const transactionsPerSecond = execution?.transactionsPerSecond || 0

  const estimatedTimeRemaining = execution && execution.startTime && execution.transactionsPerSecond 
    ? Math.max(0, (execution.totalIterations - execution.currentIteration) / execution.transactionsPerSecond)
    : 0

  const recentErrors = monitoring.errors.slice(-5)

  return {
    // Execution state
    execution,
    isRunning,
    isPaused,
    
    // Monitoring state
    transactions: monitoring.transactions,
    errors: monitoring.errors,
    monitoringStats: monitoring.stats,
    
    // Actions
    startTest,
    pauseTest,
    resumeTest,
    stopTest,
    retryTest,
    
    // Monitoring actions
    clearMonitoringHistory,
    
    // Computed properties for UI compatibility
    progress,
    successRate,
    transactionsPerSecond,
    estimatedTimeRemaining,
    recentErrors
  }
}