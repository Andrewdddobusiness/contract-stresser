'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { TestExecutor } from '@/services/testing/executor'
import type { 
  TestConfiguration, 
  TestExecution, 
  TestTransaction, 
  TestError 
} from '@/types/testing'

interface UseTestExecutorOptions {
  onProgress?: (execution: TestExecution) => void
  onTransaction?: (transaction: TestTransaction) => void
  onError?: (error: TestError) => void
  onComplete?: (execution: TestExecution) => void
}

interface UseTestExecutorReturn {
  // State
  execution: TestExecution | null
  isRunning: boolean
  isPaused: boolean
  
  // Actions
  startTest: (config: TestConfiguration) => Promise<TestExecution>
  pauseTest: () => void
  resumeTest: () => void
  stopTest: () => void
  
  // Stats
  progress: number
  successRate: number
  transactionsPerSecond: number
  estimatedTimeRemaining: number
  
  // Recent data
  recentTransactions: TestTransaction[]
  recentErrors: TestError[]
}

/**
 * Hook for managing test execution with real-time updates
 */
export function useTestExecutor(options: UseTestExecutorOptions = {}): UseTestExecutorReturn {
  const [execution, setExecution] = useState<TestExecution | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recentTransactions, setRecentTransactions] = useState<TestTransaction[]>([])
  const [recentErrors, setRecentErrors] = useState<TestError[]>([])
  
  const executorRef = useRef<TestExecutor | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  
  // Initialize executor
  useEffect(() => {
    executorRef.current = new TestExecutor({
      onProgress: (updatedExecution) => {
        setExecution(updatedExecution)
        options.onProgress?.(updatedExecution)
      },
      onTransaction: (transaction) => {
        setRecentTransactions(prev => {
          const updated = [transaction, ...prev].slice(0, 100) // Keep last 100
          return updated
        })
        options.onTransaction?.(transaction)
      },
      onError: (error) => {
        setRecentErrors(prev => {
          const updated = [error, ...prev].slice(0, 50) // Keep last 50
          return updated
        })
        options.onError?.(error)
      },
      onComplete: (completedExecution) => {
        setIsRunning(false)
        setIsPaused(false)
        setExecution(completedExecution)
        options.onComplete?.(completedExecution)
      }
    })
    
    return () => {
      executorRef.current?.stopTest()
    }
  }, [options])
  
  const startTest = useCallback(async (config: TestConfiguration): Promise<TestExecution> => {
    if (!executorRef.current) {
      throw new Error('Test executor not initialized')
    }
    
    try {
      setIsRunning(true)
      setIsPaused(false)
      setRecentTransactions([])
      setRecentErrors([])
      startTimeRef.current = new Date()
      
      const result = await executorRef.current.startTest(config)
      return result
      
    } catch (error) {
      setIsRunning(false)
      setIsPaused(false)
      throw error
    }
  }, [])
  
  const pauseTest = useCallback(() => {
    if (executorRef.current && isRunning) {
      executorRef.current.pauseTest()
      setIsPaused(true)
    }
  }, [isRunning])
  
  const resumeTest = useCallback(() => {
    if (executorRef.current && isRunning && isPaused) {
      executorRef.current.resumeTest()
      setIsPaused(false)
    }
  }, [isRunning, isPaused])
  
  const stopTest = useCallback(() => {
    if (executorRef.current && isRunning) {
      executorRef.current.stopTest()
      setIsRunning(false)
      setIsPaused(false)
    }
  }, [isRunning])
  
  // Calculate progress percentage
  const progress = execution 
    ? Math.round((execution.currentIteration / execution.totalIterations) * 100)
    : 0
  
  // Calculate success rate
  const successRate = execution && (execution.successCount + execution.failureCount) > 0
    ? Math.round((execution.successCount / (execution.successCount + execution.failureCount)) * 100)
    : 0
  
  // Calculate transactions per second
  const transactionsPerSecond = execution?.transactionsPerSecond || 0
  
  // Estimate time remaining
  const estimatedTimeRemaining = (() => {
    if (!execution || !startTimeRef.current || transactionsPerSecond === 0) {
      return 0
    }
    
    const remainingTxs = execution.totalIterations - execution.currentIteration
    return Math.round(remainingTxs / transactionsPerSecond)
  })()
  
  return {
    // State
    execution,
    isRunning,
    isPaused,
    
    // Actions
    startTest,
    pauseTest,
    resumeTest,
    stopTest,
    
    // Stats
    progress,
    successRate,
    transactionsPerSecond,
    estimatedTimeRemaining,
    
    // Recent data
    recentTransactions,
    recentErrors,
  }
}

/**
 * Hook for test execution history and statistics
 */
export function useTestHistory() {
  const [executions, setExecutions] = useState<TestExecution[]>([])
  
  const addExecution = useCallback((execution: TestExecution) => {
    setExecutions(prev => {
      const updated = [execution, ...prev]
      // Keep only last 20 executions
      return updated.slice(0, 20)
    })
  }, [])
  
  const clearHistory = useCallback(() => {
    setExecutions([])
  }, [])
  
  const getExecutionById = useCallback((id: string) => {
    return executions.find(exec => exec.id === id)
  }, [executions])
  
  // Calculate aggregate stats
  const totalExecutions = executions.length
  const successfulExecutions = executions.filter(e => e.status === 'completed').length
  const totalTransactions = executions.reduce((sum, e) => sum + (e.successCount + e.failureCount), 0)
  const avgSuccessRate = executions.length > 0 
    ? executions.reduce((sum, e) => {
        const total = e.successCount + e.failureCount
        return sum + (total > 0 ? e.successCount / total : 0)
      }, 0) / executions.length * 100
    : 0
  
  return {
    executions,
    addExecution,
    clearHistory,
    getExecutionById,
    
    // Stats
    totalExecutions,
    successfulExecutions,
    totalTransactions,
    avgSuccessRate: Math.round(avgSuccessRate),
  }
}