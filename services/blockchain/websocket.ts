'use client'

import { PublicClient } from 'viem'
import { createWebSocketClient } from './clients'
import { SupportedChainId } from '@/lib/wagmi'
import { anvil } from './chains'

type BlockListener = (block: any) => void
type TransactionListener = (transaction: any) => void
type LogListener = (logs: any[]) => void

export class WebSocketManager {
  private client: PublicClient | null = null
  private chainId: SupportedChainId | null = null
  private blockUnwatch: (() => void) | null = null
  private transactionUnwatch: (() => void) | null = null
  private logUnwatchers: Map<string, () => void> = new Map()
  private blockListeners: Set<BlockListener> = new Set()
  private transactionListeners: Set<TransactionListener> = new Set()
  private logListeners: Map<string, Set<LogListener>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // 1 second
  private isConnected = false

  /**
   * Connect to WebSocket for a specific chain
   */
  async connect(chainId: SupportedChainId): Promise<boolean> {
    try {
      // Disconnect existing connection
      if (this.client) {
        this.disconnect()
      }

      this.chainId = chainId
      this.client = createWebSocketClient(chainId)
      
      if (!this.client) {
        console.warn(`WebSocket not available for chain ${chainId}`)
        return false
      }

      // Test connection
      await this.client.getBlockNumber()
      this.isConnected = true
      this.reconnectAttempts = 0
      
      console.log(`WebSocket connected to chain ${chainId}`)
      return true
    } catch (error) {
      console.error(`Failed to connect WebSocket for chain ${chainId}:`, error)
      this.isConnected = false
      
      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect()
      }
      
      return false
    }
  }

  /**
   * Disconnect WebSocket and cleanup
   */
  disconnect(): void {
    this.isConnected = false
    
    // Cleanup watchers
    if (this.blockUnwatch) {
      this.blockUnwatch()
      this.blockUnwatch = null
    }
    
    if (this.transactionUnwatch) {
      this.transactionUnwatch()
      this.transactionUnwatch = null
    }
    
    // Cleanup log watchers
    this.logUnwatchers.forEach(unwatch => unwatch())
    this.logUnwatchers.clear()
    
    this.client = null
    this.chainId = null
    
    console.log('WebSocket disconnected')
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff
    
    console.log(`Scheduling WebSocket reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      if (this.chainId) {
        this.connect(this.chainId)
      }
    }, delay)
  }

  /**
   * Subscribe to new blocks
   */
  subscribeToBlocks(): void {
    if (!this.client || !this.isConnected) {
      console.warn('WebSocket not connected, cannot subscribe to blocks')
      return
    }

    try {
      this.blockUnwatch = this.client.watchBlocks({
        onBlock: (block) => {
          this.blockListeners.forEach(listener => {
            try {
              listener(block)
            } catch (error) {
              console.error('Error in block listener:', error)
            }
          })
        },
        onError: (error) => {
          console.error('Block subscription error:', error)
          this.handleConnectionError()
        },
      })
      
      console.log('Subscribed to blocks')
    } catch (error) {
      console.error('Failed to subscribe to blocks:', error)
    }
  }

  /**
   * Subscribe to pending transactions
   */
  subscribeToPendingTransactions(): void {
    if (!this.client || !this.isConnected) {
      console.warn('WebSocket not connected, cannot subscribe to pending transactions')
      return
    }

    try {
      this.transactionUnwatch = this.client.watchPendingTransactions({
        onTransactions: (transactions) => {
          transactions.forEach(tx => {
            this.transactionListeners.forEach(listener => {
              try {
                listener(tx)
              } catch (error) {
                console.error('Error in transaction listener:', error)
              }
            })
          })
        },
        onError: (error) => {
          console.error('Pending transaction subscription error:', error)
          this.handleConnectionError()
        },
      })
      
      console.log('Subscribed to pending transactions')
    } catch (error) {
      console.error('Failed to subscribe to pending transactions:', error)
    }
  }

  /**
   * Subscribe to contract logs
   */
  subscribeToLogs(address: `0x${string}`, events?: string[]): string {
    if (!this.client || !this.isConnected) {
      console.warn('WebSocket not connected, cannot subscribe to logs')
      return ''
    }

    const subscriptionId = `${address}-${events?.join(',') || 'all'}-${Date.now()}`
    
    try {
      // Use watchEvent for general log watching without requiring ABI
      const unwatch = this.client.watchEvent({
        address,
        onLogs: (logs) => {
          const listeners = this.logListeners.get(subscriptionId)
          if (listeners) {
            listeners.forEach(listener => {
              try {
                listener(logs)
              } catch (error) {
                console.error('Error in log listener:', error)
              }
            })
          }
        },
        onError: (error) => {
          console.error('Log subscription error:', error)
          this.handleConnectionError()
        },
      })
      
      this.logUnwatchers.set(subscriptionId, unwatch)
      console.log(`Subscribed to logs for ${address}`)
      
      return subscriptionId
    } catch (error) {
      console.error('Failed to subscribe to logs:', error)
      return ''
    }
  }

  /**
   * Unsubscribe from logs
   */
  unsubscribeFromLogs(subscriptionId: string): void {
    const unwatch = this.logUnwatchers.get(subscriptionId)
    if (unwatch) {
      unwatch()
      this.logUnwatchers.delete(subscriptionId)
      this.logListeners.delete(subscriptionId)
      console.log(`Unsubscribed from logs: ${subscriptionId}`)
    }
  }

  /**
   * Add block listener
   */
  addBlockListener(listener: BlockListener): () => void {
    this.blockListeners.add(listener)
    
    // Auto-subscribe if this is the first listener
    if (this.blockListeners.size === 1 && this.isConnected) {
      this.subscribeToBlocks()
    }
    
    return () => {
      this.blockListeners.delete(listener)
    }
  }

  /**
   * Add transaction listener
   */
  addTransactionListener(listener: TransactionListener): () => void {
    this.transactionListeners.add(listener)
    
    // Auto-subscribe if this is the first listener
    if (this.transactionListeners.size === 1 && this.isConnected) {
      this.subscribeToPendingTransactions()
    }
    
    return () => {
      this.transactionListeners.delete(listener)
    }
  }

  /**
   * Add log listener
   */
  addLogListener(subscriptionId: string, listener: LogListener): () => void {
    if (!this.logListeners.has(subscriptionId)) {
      this.logListeners.set(subscriptionId, new Set())
    }
    
    this.logListeners.get(subscriptionId)!.add(listener)
    
    return () => {
      const listeners = this.logListeners.get(subscriptionId)
      if (listeners) {
        listeners.delete(listener)
        if (listeners.size === 0) {
          this.unsubscribeFromLogs(subscriptionId)
        }
      }
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(): void {
    this.isConnected = false
    
    if (this.chainId && this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log('WebSocket connection lost, attempting to reconnect...')
      this.scheduleReconnect()
    } else {
      console.error('WebSocket connection lost and max reconnection attempts reached')
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      chainId: this.chainId,
      reconnectAttempts: this.reconnectAttempts,
      hasBlockListeners: this.blockListeners.size > 0,
      hasTransactionListeners: this.transactionListeners.size > 0,
      logSubscriptions: this.logUnwatchers.size,
    }
  }
}

// Global WebSocket manager instance
export const wsManager = new WebSocketManager()

// React hooks for WebSocket functionality
export function useWebSocket(chainId: SupportedChainId) {
  const connect = () => wsManager.connect(chainId)
  const disconnect = () => wsManager.disconnect()
  const status = wsManager.getStatus()
  
  return {
    connect,
    disconnect,
    status,
    isConnected: status.isConnected && status.chainId === chainId,
  }
}

export function useBlockListener(listener: BlockListener, enabled = true) {
  return {
    subscribe: () => enabled ? wsManager.addBlockListener(listener) : () => {},
  }
}

export function useTransactionListener(listener: TransactionListener, enabled = true) {
  return {
    subscribe: () => enabled ? wsManager.addTransactionListener(listener) : () => {},
  }
}

export function useContractLogs(address: `0x${string}`, listener: LogListener, events?: string[]) {
  return {
    subscribe: () => {
      const subscriptionId = wsManager.subscribeToLogs(address, events)
      if (subscriptionId) {
        return wsManager.addLogListener(subscriptionId, listener)
      }
      return () => {}
    },
  }
}