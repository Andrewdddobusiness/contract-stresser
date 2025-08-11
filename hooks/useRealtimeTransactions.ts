'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { TransactionMetrics } from '@/services/analytics/metrics'

export interface RealtimeTransactionOptions {
  pollingInterval?: number
  maxRetries?: number
  onError?: (error: Error) => void
  onUpdate?: (transactions: TransactionMetrics[]) => void
  enabled?: boolean
}

export interface RealtimeTransactionState {
  transactions: TransactionMetrics[]
  isPolling: boolean
  error: Error | null
  lastUpdate: Date | null
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  retryCount: number
}

export interface RealtimeTransactionActions {
  startPolling: () => void
  stopPolling: () => void
  refresh: () => Promise<void>
  reset: () => void
  updateTransaction: (transaction: TransactionMetrics) => void
  addTransaction: (transaction: TransactionMetrics) => void
  removeTransaction: (iteration: number) => void
}

/**
 * Hook for real-time transaction monitoring with polling fallback
 */
export function useRealtimeTransactions(
  fetchTransactions: () => Promise<TransactionMetrics[]>,
  options: RealtimeTransactionOptions = {}
): [RealtimeTransactionState, RealtimeTransactionActions] {
  const {
    pollingInterval = 2000, // 2 seconds
    maxRetries = 3,
    onError,
    onUpdate,
    enabled = true
  } = options

  const [state, setState] = useState<RealtimeTransactionState>({
    transactions: [],
    isPolling: false,
    error: null,
    lastUpdate: null,
    connectionStatus: 'disconnected',
    retryCount: 0
  })

  const intervalRef = useRef<NodeJS.Timeout>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const isPollingRef = useRef(false)
  const mountedRef = useRef(true)

  const updateState = useCallback((updates: Partial<RealtimeTransactionState>) => {
    if (!mountedRef.current) return
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const handleError = useCallback((error: Error) => {
    console.error('Realtime transactions error:', error)
    updateState({ 
      error, 
      connectionStatus: 'error',
      isPolling: false 
    })
    onError?.(error)
  }, [updateState, onError])

  const fetchWithRetry = useCallback(async (): Promise<TransactionMetrics[]> => {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        updateState({ 
          connectionStatus: attempt === 0 ? 'connecting' : 'connecting',
          retryCount: attempt 
        })
        
        const transactions = await fetchTransactions()
        
        updateState({ 
          connectionStatus: 'connected',
          error: null,
          retryCount: 0 
        })
        
        return transactions
      } catch (error) {
        lastError = error as Error
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => {
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current)
            }
            retryTimeoutRef.current = setTimeout(resolve, delay)
          })
        }
      }
    }
    
    throw lastError || new Error('Failed to fetch transactions after retries')
  }, [fetchTransactions, maxRetries, updateState])

  const poll = useCallback(async () => {
    if (!isPollingRef.current || !mountedRef.current) return

    try {
      const newTransactions = await fetchWithRetry()
      
      if (!mountedRef.current) return

      updateState({
        transactions: newTransactions,
        lastUpdate: new Date(),
        error: null
      })

      onUpdate?.(newTransactions)
    } catch (error) {
      if (mountedRef.current) {
        handleError(error as Error)
      }
    }
  }, [fetchWithRetry, updateState, onUpdate, handleError])

  const startPolling = useCallback(() => {
    if (isPollingRef.current || !enabled) return

    isPollingRef.current = true
    updateState({ 
      isPolling: true, 
      connectionStatus: 'connecting',
      error: null 
    })

    // Initial fetch
    poll()

    // Set up polling interval
    intervalRef.current = setInterval(poll, pollingInterval)
  }, [enabled, poll, pollingInterval, updateState])

  const stopPolling = useCallback(() => {
    isPollingRef.current = false
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = undefined
    }

    updateState({ 
      isPolling: false,
      connectionStatus: 'disconnected'
    })
  }, [updateState])

  const refresh = useCallback(async () => {
    try {
      updateState({ connectionStatus: 'connecting' })
      const transactions = await fetchWithRetry()
      
      updateState({
        transactions,
        lastUpdate: new Date(),
        error: null
      })

      onUpdate?.(transactions)
    } catch (error) {
      handleError(error as Error)
    }
  }, [fetchWithRetry, updateState, onUpdate, handleError])

  const reset = useCallback(() => {
    stopPolling()
    updateState({
      transactions: [],
      error: null,
      lastUpdate: null,
      connectionStatus: 'disconnected',
      retryCount: 0
    })
  }, [stopPolling, updateState])

  const updateTransaction = useCallback((updatedTransaction: TransactionMetrics) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(tx =>
        tx.iteration === updatedTransaction.iteration ? updatedTransaction : tx
      )
    }))
  }, [])

  const addTransaction = useCallback((newTransaction: TransactionMetrics) => {
    setState(prev => ({
      ...prev,
      transactions: [...prev.transactions, newTransaction]
    }))
  }, [])

  const removeTransaction = useCallback((iteration: number) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(tx => tx.iteration !== iteration)
    }))
  }, [])

  // Auto-start polling when enabled
  useEffect(() => {
    if (enabled && !state.isPolling) {
      startPolling()
    } else if (!enabled && state.isPolling) {
      stopPolling()
    }
  }, [enabled, state.isPolling, startPolling, stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      stopPolling()
    }
  }, [stopPolling])

  // Adjust polling interval dynamically
  useEffect(() => {
    if (state.isPolling) {
      stopPolling()
      startPolling()
    }
  }, [pollingInterval]) // Only depend on pollingInterval, not the functions

  return [
    state,
    {
      startPolling,
      stopPolling,
      refresh,
      reset,
      updateTransaction,
      addTransaction,
      removeTransaction
    }
  ]
}

/**
 * Hook for WebSocket-based real-time updates (for future implementation)
 */
export function useWebSocketTransactions(
  url: string,
  options: RealtimeTransactionOptions = {}
): [RealtimeTransactionState, RealtimeTransactionActions] {
  const [state, setState] = useState<RealtimeTransactionState>({
    transactions: [],
    isPolling: false,
    error: null,
    lastUpdate: null,
    connectionStatus: 'disconnected',
    retryCount: 0
  })

  const wsRef = useRef<WebSocket>()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const mountedRef = useRef(true)

  const { maxRetries = 3, onError, onUpdate, enabled = true } = options

  const updateState = useCallback((updates: Partial<RealtimeTransactionState>) => {
    if (!mountedRef.current) return
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const connect = useCallback(() => {
    if (!enabled || state.connectionStatus === 'connected') return

    try {
      updateState({ connectionStatus: 'connecting' })
      
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        updateState({ 
          connectionStatus: 'connected',
          error: null,
          retryCount: 0,
          isPolling: true
        })
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'transactions') {
            const transactions: TransactionMetrics[] = data.transactions
            updateState({
              transactions,
              lastUpdate: new Date()
            })
            onUpdate?.(transactions)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        updateState({ 
          connectionStatus: 'disconnected',
          isPolling: false
        })
        
        // Auto-reconnect with exponential backoff
        if (enabled && state.retryCount < maxRetries) {
          const delay = Math.pow(2, state.retryCount) * 1000
          reconnectTimeoutRef.current = setTimeout(() => {
            updateState({ retryCount: state.retryCount + 1 })
            connect()
          }, delay)
        }
      }

      ws.onerror = (error) => {
        const errorObj = new Error('WebSocket connection error')
        updateState({ 
          error: errorObj,
          connectionStatus: 'error'
        })
        onError?.(errorObj)
      }

    } catch (error) {
      const errorObj = error as Error
      updateState({ 
        error: errorObj,
        connectionStatus: 'error'
      })
      onError?.(errorObj)
    }
  }, [enabled, url, state.connectionStatus, state.retryCount, maxRetries, onError, onUpdate, updateState])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = undefined
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    updateState({ 
      connectionStatus: 'disconnected',
      isPolling: false
    })
  }, [updateState])

  const refresh = useCallback(async () => {
    // For WebSocket, we might send a refresh message
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'refresh' }))
    }
  }, [])

  const reset = useCallback(() => {
    disconnect()
    updateState({
      transactions: [],
      error: null,
      lastUpdate: null,
      retryCount: 0
    })
  }, [disconnect, updateState])

  const updateTransaction = useCallback((updatedTransaction: TransactionMetrics) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(tx =>
        tx.iteration === updatedTransaction.iteration ? updatedTransaction : tx
      )
    }))
  }, [])

  const addTransaction = useCallback((newTransaction: TransactionMetrics) => {
    setState(prev => ({
      ...prev,
      transactions: [...prev.transactions, newTransaction]
    }))
  }, [])

  const removeTransaction = useCallback((iteration: number) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(tx => tx.iteration !== iteration)
    }))
  }, [])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      mountedRef.current = false
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return [
    state,
    {
      startPolling: connect,
      stopPolling: disconnect,
      refresh,
      reset,
      updateTransaction,
      addTransaction,
      removeTransaction
    }
  ]
}