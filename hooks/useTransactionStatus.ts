'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePublicClient } from 'wagmi'
import { type Hash, type TransactionReceipt } from 'viem'

export interface TransactionStatus {
  hash: Hash
  status: 'pending' | 'confirming' | 'success' | 'failed' | 'not_found'
  confirmations: number
  receipt?: TransactionReceipt
  error?: string
  gasUsed?: bigint
  gasPrice?: bigint
  blockNumber?: bigint
  timestamp?: Date
}

interface UseTransactionStatusOptions {
  confirmations?: number
  pollingInterval?: number
  timeout?: number
  onStatusChange?: (status: TransactionStatus) => void
  onSuccess?: (receipt: TransactionReceipt) => void
  onError?: (error: string) => void
}

/**
 * Hook for tracking transaction status with real-time updates
 */
export function useTransactionStatus(
  hash: Hash | undefined,
  options: UseTransactionStatusOptions = {}
) {
  const {
    confirmations = 1,
    pollingInterval = 2000,
    timeout = 300000, // 5 minutes
    onStatusChange,
    onSuccess,
    onError,
  } = options

  const publicClient = usePublicClient()
  const [status, setStatus] = useState<TransactionStatus | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const updateStatus = useCallback((newStatus: TransactionStatus) => {
    setStatus(prev => {
      if (!prev || prev.status !== newStatus.status || prev.confirmations !== newStatus.confirmations) {
        onStatusChange?.(newStatus)
        
        if (newStatus.status === 'success' && newStatus.receipt) {
          onSuccess?.(newStatus.receipt)
        } else if (newStatus.status === 'failed' && newStatus.error) {
          onError?.(newStatus.error)
        }
        
        return newStatus
      }
      return prev
    })
  }, [onStatusChange, onSuccess, onError])

  const checkTransactionStatus = useCallback(async (txHash: Hash): Promise<TransactionStatus> => {
    if (!publicClient) {
      throw new Error('Public client not available')
    }

    try {
      // First check if transaction exists
      const transaction = await publicClient.getTransaction({ hash: txHash }).catch(() => null)
      
      if (!transaction) {
        return {
          hash: txHash,
          status: 'not_found',
          confirmations: 0,
          error: 'Transaction not found',
        }
      }

      // Check for receipt
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash }).catch(() => null)
      
      if (!receipt) {
        return {
          hash: txHash,
          status: 'pending',
          confirmations: 0,
        }
      }

      // Get current block number to calculate confirmations
      const currentBlockNumber = await publicClient.getBlockNumber()
      const txConfirmations = Number(currentBlockNumber - receipt.blockNumber) + 1

      // Check if transaction was successful
      if (receipt.status === 'reverted') {
        return {
          hash: txHash,
          status: 'failed',
          confirmations: txConfirmations,
          receipt,
          error: 'Transaction reverted',
          gasUsed: receipt.gasUsed,
          gasPrice: receipt.effectiveGasPrice,
          blockNumber: receipt.blockNumber,
        }
      }

      // Check if we have enough confirmations
      if (txConfirmations < confirmations) {
        return {
          hash: txHash,
          status: 'confirming',
          confirmations: txConfirmations,
          receipt,
          gasUsed: receipt.gasUsed,
          gasPrice: receipt.effectiveGasPrice,
          blockNumber: receipt.blockNumber,
        }
      }

      return {
        hash: txHash,
        status: 'success',
        confirmations: txConfirmations,
        receipt,
        gasUsed: receipt.gasUsed,
        gasPrice: receipt.effectiveGasPrice,
        blockNumber: receipt.blockNumber,
      }
    } catch (error) {
      return {
        hash: txHash,
        status: 'failed',
        confirmations: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }, [publicClient, confirmations])

  const startPolling = useCallback(async (txHash: Hash) => {
    if (isPolling || !publicClient) return

    setIsPolling(true)
    const startTime = Date.now()

    const poll = async () => {
      try {
        const newStatus = await checkTransactionStatus(txHash)
        updateStatus(newStatus)

        // Stop polling if transaction is final or timeout reached
        if (
          newStatus.status === 'success' || 
          newStatus.status === 'failed' ||
          newStatus.status === 'not_found' ||
          Date.now() - startTime > timeout
        ) {
          setIsPolling(false)
          return
        }

        // Continue polling
        setTimeout(poll, pollingInterval)
      } catch (error) {
        const errorStatus: TransactionStatus = {
          hash: txHash,
          status: 'failed',
          confirmations: 0,
          error: error instanceof Error ? error.message : 'Polling error',
        }
        updateStatus(errorStatus)
        setIsPolling(false)
      }
    }

    poll()
  }, [checkTransactionStatus, updateStatus, isPolling, publicClient, pollingInterval, timeout])

  // Start polling when hash is provided
  useEffect(() => {
    if (hash && !isPolling) {
      startPolling(hash)
    }
  }, [hash, startPolling, isPolling])

  const refetch = useCallback(async () => {
    if (hash) {
      const newStatus = await checkTransactionStatus(hash)
      updateStatus(newStatus)
      return newStatus
    }
    return null
  }, [hash, checkTransactionStatus, updateStatus])

  return {
    status,
    isPolling,
    refetch,
  }
}

/**
 * Hook for tracking multiple transactions
 */
export function useMultipleTransactionStatus(
  hashes: Hash[],
  options: UseTransactionStatusOptions = {}
) {
  const [statuses, setStatuses] = useState<Record<string, TransactionStatus>>({})
  const [isPolling, setIsPolling] = useState(false)

  const publicClient = usePublicClient()

  const updateStatus = useCallback((hash: Hash, status: TransactionStatus) => {
    setStatuses(prev => ({
      ...prev,
      [hash]: status,
    }))

    if (status.status === 'success' && status.receipt && options.onSuccess) {
      options.onSuccess(status.receipt)
    } else if (status.status === 'failed' && status.error && options.onError) {
      options.onError(status.error)
    }

    if (options.onStatusChange) {
      options.onStatusChange(status)
    }
  }, [options])

  const checkAllStatuses = useCallback(async () => {
    if (!publicClient || hashes.length === 0) return

    setIsPolling(true)

    try {
      const statusChecks = hashes.map(async (hash) => {
        const singleHook = useTransactionStatus(hash, {
          ...options,
          onStatusChange: (status) => updateStatus(hash, status),
        })
        return { hash, status: singleHook.status }
      })

      await Promise.all(statusChecks)
    } catch (error) {
      console.error('Error checking multiple transaction statuses:', error)
    } finally {
      setIsPolling(false)
    }
  }, [hashes, publicClient, options, updateStatus])

  useEffect(() => {
    checkAllStatuses()
  }, [checkAllStatuses])

  const allFinished = useMemo(() => {
    return hashes.every(hash => {
      const status = statuses[hash]
      return status && ['success', 'failed', 'not_found'].includes(status.status)
    })
  }, [hashes, statuses])

  const successCount = useMemo(() => {
    return Object.values(statuses).filter(s => s.status === 'success').length
  }, [statuses])

  const failedCount = useMemo(() => {
    return Object.values(statuses).filter(s => s.status === 'failed').length
  }, [statuses])

  return {
    statuses,
    isPolling,
    allFinished,
    successCount,
    failedCount,
    totalCount: hashes.length,
    getStatus: (hash: Hash) => statuses[hash] || null,
  }
}

/**
 * Hook for transaction status with automatic retry
 */
export function useTransactionStatusWithRetry(
  hash: Hash | undefined,
  options: UseTransactionStatusOptions & { maxRetries?: number; retryDelay?: number } = {}
) {
  const { maxRetries = 3, retryDelay = 5000, ...statusOptions } = options
  const [retryCount, setRetryCount] = useState(0)

  const { status, isPolling, refetch } = useTransactionStatus(hash, {
    ...statusOptions,
    onError: (error) => {
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          refetch()
        }, retryDelay)
      }
      options.onError?.(error)
    },
  })

  const retryManually = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1)
      refetch()
    }
  }, [retryCount, maxRetries, refetch])

  return {
    status,
    isPolling,
    retryCount,
    maxRetries,
    canRetry: retryCount < maxRetries,
    retry: retryManually,
    refetch,
  }
}

/**
 * Hook for batch transaction monitoring with progress tracking
 */
export function useBatchTransactionStatus(
  hashes: Hash[],
  options: UseTransactionStatusOptions = {}
) {
  const multiStatus = useMultipleTransactionStatus(hashes, options)

  const progress = useMemo(() => {
    const total = hashes.length
    if (total === 0) return { completed: 0, pending: 0, failed: 0, percentage: 0 }

    const completed = multiStatus.successCount
    const failed = multiStatus.failedCount
    const pending = total - completed - failed

    return {
      completed,
      pending,
      failed,
      percentage: Math.round(((completed + failed) / total) * 100),
    }
  }, [hashes.length, multiStatus.successCount, multiStatus.failedCount])

  return {
    ...multiStatus,
    progress,
  }
}