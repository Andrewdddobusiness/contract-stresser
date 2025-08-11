'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { type Hash, type Address } from 'viem'
import { 
  TestMonitoringService, 
  createMonitoringService, 
  type MonitoringOptions,
  type TransactionMonitor
} from '@/services/testing/monitor'
import type { TestExecution, TestTransaction, TestError } from '@/types/testing'

interface UseTestMonitoringOptions extends Partial<MonitoringOptions> {
  autoStart?: boolean
  bufferSize?: number // Max number of transactions/errors to keep in memory
}

interface UseTestMonitoringReturn {
  // State
  isMonitoring: boolean
  transactions: TestTransaction[]
  errors: TestError[]
  activeMonitors: TransactionMonitor[]
  stats: {
    totalMonitored: number
    pendingCount: number
    confirmedCount: number
    averageConfirmationTime: number
    successRate: number
  }
  
  // Actions
  startMonitoring: (execution: TestExecution) => Promise<void>
  stopMonitoring: () => Promise<void>
  addTransaction: (txHash: Hash, executionId: string, iteration: number, account: Address) => void
  recheckTransaction: (txHash: Hash) => Promise<void>
  clearHistory: () => void
  
  // Service
  service: TestMonitoringService | null
}

/**
 * React hook for real-time test monitoring
 */
export function useTestMonitoring(options: UseTestMonitoringOptions = {}): UseTestMonitoringReturn {
  const {
    network = 'local',
    pollInterval = 2000,
    enableWebSocket = false,
    autoStart = false,
    bufferSize = 1000,
    ...restOptions
  } = options

  const [isMonitoring, setIsMonitoring] = useState(false)
  const [transactions, setTransactions] = useState<TestTransaction[]>([])
  const [errors, setErrors] = useState<TestError[]>([])
  const [activeMonitors, setActiveMonitors] = useState<TransactionMonitor[]>([])
  const [confirmationTimes, setConfirmationTimes] = useState<number[]>([])
  
  const serviceRef = useRef<TestMonitoringService | null>(null)
  const executionRef = useRef<TestExecution | null>(null)

  // Calculate stats
  const stats = React.useMemo(() => {
    const totalMonitored = transactions.length + errors.length
    const confirmedCount = transactions.filter(tx => tx.status === 'confirmed').length
    const failedCount = errors.length + transactions.filter(tx => tx.status === 'failed').length
    const pendingCount = activeMonitors.filter(m => !m.confirmed).length
    
    const averageConfirmationTime = confirmationTimes.length > 0
      ? confirmationTimes.reduce((sum, time) => sum + time, 0) / confirmationTimes.length
      : 0

    const successRate = totalMonitored > 0 ? (confirmedCount / totalMonitored) * 100 : 0

    return {
      totalMonitored,
      pendingCount,
      confirmedCount,
      averageConfirmationTime,
      successRate
    }
  }, [transactions, errors, activeMonitors, confirmationTimes])

  // Transaction update handler
  const handleTransactionUpdate = useCallback((transaction: TestTransaction) => {
    setTransactions(prev => {
      // Remove any existing transaction with same ID and add new one
      const filtered = prev.filter(tx => tx.id !== transaction.id)
      const updated = [...filtered, transaction].slice(-bufferSize)
      return updated
    })

    // Track confirmation times for stats
    if (transaction.confirmationTime && transaction.status === 'confirmed') {
      setConfirmationTimes(prev => [...prev, transaction.confirmationTime!].slice(-100))
    }

    console.log('Transaction updated:', transaction.txHash?.slice(0, 10), transaction.status)
  }, [bufferSize])

  // Error handler
  const handleError = useCallback((error: TestError) => {
    setErrors(prev => [...prev, error].slice(-bufferSize))
    console.log('Test error:', error.errorType, error.error.slice(0, 50))
  }, [bufferSize])

  // Execution update handler
  const handleExecutionUpdate = useCallback((execution: TestExecution) => {
    executionRef.current = execution
    console.log('Execution updated:', execution.status, `${execution.currentIteration}/${execution.totalIterations}`)
  }, [])

  // Start monitoring
  const startMonitoring = useCallback(async (execution: TestExecution) => {
    try {
      // Stop any existing monitoring
      if (serviceRef.current) {
        await serviceRef.current.stopMonitoring()
      }

      // Create new monitoring service
      const service = createMonitoringService({
        network,
        pollInterval,
        enableWebSocket,
        onTransactionUpdate: handleTransactionUpdate,
        onError: handleError,
        onExecutionUpdate: handleExecutionUpdate,
        ...restOptions
      })

      serviceRef.current = service
      executionRef.current = execution

      // Start monitoring
      await service.startMonitoring(execution)
      setIsMonitoring(true)

      console.log('Started test monitoring for execution:', execution.id)
    } catch (error) {
      console.error('Failed to start monitoring:', error)
      throw error
    }
  }, [network, pollInterval, enableWebSocket, handleTransactionUpdate, handleError, handleExecutionUpdate, restOptions])

  // Stop monitoring
  const stopMonitoring = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.stopMonitoring()
      serviceRef.current = null
    }
    
    executionRef.current = null
    setIsMonitoring(false)
    setActiveMonitors([])
    
    console.log('Stopped test monitoring')
  }, [])

  // Add transaction to monitoring
  const addTransaction = useCallback((
    txHash: Hash, 
    executionId: string, 
    iteration: number, 
    account: Address
  ) => {
    if (serviceRef.current) {
      serviceRef.current.addTransactionMonitor(txHash, executionId, iteration, account)
    }
  }, [])

  // Recheck specific transaction
  const recheckTransaction = useCallback(async (txHash: Hash) => {
    if (serviceRef.current) {
      await serviceRef.current.recheckTransaction(txHash)
    }
  }, [])

  // Clear transaction and error history
  const clearHistory = useCallback(() => {
    setTransactions([])
    setErrors([])
    setConfirmationTimes([])
  }, [])

  // Update active monitors periodically
  useEffect(() => {
    if (!isMonitoring || !serviceRef.current) return

    const updateInterval = setInterval(() => {
      const monitors = serviceRef.current?.getActiveMonitors() || []
      setActiveMonitors([...monitors]) // Create new array to trigger re-render
    }, 1000)

    return () => clearInterval(updateInterval)
  }, [isMonitoring])

  // Auto-start monitoring if execution is provided
  useEffect(() => {
    if (autoStart && executionRef.current && !isMonitoring) {
      startMonitoring(executionRef.current).catch(console.error)
    }
  }, [autoStart, isMonitoring, startMonitoring])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.stopMonitoring().catch(console.error)
      }
    }
  }, [])

  return {
    // State
    isMonitoring,
    transactions,
    errors,
    activeMonitors,
    stats,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    addTransaction,
    recheckTransaction,
    clearHistory,
    
    // Service
    service: serviceRef.current
  }
}

/**
 * Hook for monitoring a specific transaction
 */
export function useTransactionMonitoring(
  txHash: Hash | null,
  options: { network?: 'local' | 'sepolia', timeout?: number } = {}
) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed' | 'timeout'>('pending')
  const [receipt, setReceipt] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const { 
    isMonitoring,
    transactions,
    errors,
    startMonitoring: startService,
    stopMonitoring,
    addTransaction
  } = useTestMonitoring({
    network: options.network || 'local',
    pollInterval: 1000
  })

  // Monitor specific transaction
  useEffect(() => {
    if (!txHash) return

    // Create dummy execution for monitoring service
    const dummyExecution: TestExecution = {
      id: 'single-tx-monitor',
      name: 'Single Transaction Monitor',
      status: 'running',
      config: {
        contractAddress: '0x0000000000000000000000000000000000000000',
        functionName: 'unknown',
        functionArgs: [],
        iterations: 1,
        network: options.network || 'local',
        mode: 'sequential',
        accountCount: 1,
        useMultipleAccounts: false,
        fundingAmount: '0',
        delayBetweenTx: 0,
        gasPriceTier: 'normal',
        stopOnError: false,
        retryFailedTx: false,
        maxRetries: 0,
        timeoutMs: options.timeout || 60000
      },
      currentIteration: 1,
      totalIterations: 1,
      successCount: 0,
      failureCount: 0,
      errors: []
    }

    startService(dummyExecution).then(() => {
      addTransaction(txHash, 'single-tx-monitor', 1, '0x0000000000000000000000000000000000000000')
    })

    return () => {
      stopMonitoring()
    }
  }, [txHash, options.network, options.timeout])

  // Update status based on monitoring results
  useEffect(() => {
    const transaction = transactions.find(tx => tx.txHash === txHash)
    if (transaction) {
      setStatus(transaction.status as any)
      setReceipt(transaction)
    }

    const error = errors.find(err => err.txHash === txHash)
    if (error) {
      setStatus(error.errorType === 'timeout' ? 'timeout' : 'failed')
      setError(error.error)
    }
  }, [transactions, errors, txHash])

  return {
    status,
    receipt,
    error,
    isMonitoring: isMonitoring && !!txHash
  }
}