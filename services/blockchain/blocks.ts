import { Block, Transaction, Log, Hash, PublicClient, GetBlockReturnType, GetTransactionReturnType } from 'viem'
import { createPublicClientForChain, createWebSocketClient } from './clients'
import { SupportedChainId } from '@/lib/wagmi'

export interface BlockWithTransactions {
  block: GetBlockReturnType
  transactions: GetTransactionReturnType[]
}

export interface TransactionWithLogs {
  transaction: GetTransactionReturnType
  receipt?: {
    logs: Log[]
    gasUsed: bigint
    status: 'success' | 'reverted'
  }
}

export interface BlocksCache {
  [blockNumber: string]: BlockWithTransactions
}

class BlocksService {
  private cache: Map<SupportedChainId, BlocksCache> = new Map()
  private clients: Map<SupportedChainId, PublicClient> = new Map()
  private wsClients: Map<SupportedChainId, PublicClient | null> = new Map()
  private subscriptions: Map<string, () => void> = new Map()

  constructor() {
    // Initialize clients for supported chains
    this.initializeClients()
  }

  private initializeClients() {
    // Initialize for anvil by default
    const anvilId = 31337 as SupportedChainId
    this.clients.set(anvilId, createPublicClientForChain(anvilId))
    this.wsClients.set(anvilId, createWebSocketClient(anvilId))
    this.cache.set(anvilId, {})
  }

  private getClient(chainId: SupportedChainId): PublicClient {
    if (!this.clients.has(chainId)) {
      const client = createPublicClientForChain(chainId)
      this.clients.set(chainId, client)
      this.cache.set(chainId, {})
    }
    return this.clients.get(chainId)!
  }

  private getWSClient(chainId: SupportedChainId): PublicClient | null {
    if (!this.wsClients.has(chainId)) {
      const wsClient = createWebSocketClient(chainId)
      this.wsClients.set(chainId, wsClient)
    }
    return this.wsClients.get(chainId)!
  }

  async getLatestBlockNumber(chainId: SupportedChainId): Promise<bigint> {
    const client = this.getClient(chainId)
    return await client.getBlockNumber()
  }

  async getBlock(chainId: SupportedChainId, blockNumber: bigint): Promise<GetBlockReturnType> {
    const client = this.getClient(chainId)
    const cacheKey = blockNumber.toString()
    const cache = this.cache.get(chainId) || {}
    
    if (cache[cacheKey]) {
      return cache[cacheKey].block
    }

    const block = await client.getBlock({
      blockNumber,
      includeTransactions: false // Get hashes only initially
    })

    return block
  }

  async getBlockWithTransactions(chainId: SupportedChainId, blockNumber: bigint): Promise<BlockWithTransactions> {
    const cacheKey = blockNumber.toString()
    const cache = this.cache.get(chainId) || {}
    
    if (cache[cacheKey]) {
      return cache[cacheKey]
    }

    const client = this.getClient(chainId)
    const block = await client.getBlock({
      blockNumber,
      includeTransactions: false // Get hashes only
    })

    // Get full transaction details
    const transactions: GetTransactionReturnType[] = []
    if (block.transactions && Array.isArray(block.transactions)) {
      for (const txHash of block.transactions) {
        try {
          const tx = await client.getTransaction({ hash: txHash as Hash })
          transactions.push(tx)
        } catch (error) {
          console.warn(`Failed to fetch transaction ${txHash}:`, error)
        }
      }
    }

    const blockWithTxs: BlockWithTransactions = {
      block,
      transactions
    }

    // Cache the result
    if (!this.cache.has(chainId)) {
      this.cache.set(chainId, {})
    }
    this.cache.get(chainId)![cacheKey] = blockWithTxs

    return blockWithTxs
  }

  async getRecentBlocks(chainId: SupportedChainId, count: number = 10): Promise<BlockWithTransactions[]> {
    const latestBlockNumber = await this.getLatestBlockNumber(chainId)
    const blocks: BlockWithTransactions[] = []

    for (let i = 0; i < count; i++) {
      const blockNumber = latestBlockNumber - BigInt(i)
      if (blockNumber < BigInt(0)) break
      
      try {
        const blockData = await this.getBlockWithTransactions(chainId, blockNumber)
        blocks.push(blockData)
      } catch (error) {
        console.warn(`Failed to fetch block ${blockNumber}:`, error)
      }
    }

    return blocks
  }

  async getTransaction(chainId: SupportedChainId, hash: Hash): Promise<TransactionWithLogs | null> {
    const client = this.getClient(chainId)
    
    try {
      const [transaction, receipt] = await Promise.all([
        client.getTransaction({ hash }),
        client.getTransactionReceipt({ hash }).catch(() => null)
      ])

      return {
        transaction,
        receipt: receipt ? {
          logs: receipt.logs,
          gasUsed: receipt.gasUsed,
          status: receipt.status
        } : undefined
      }
    } catch (error) {
      console.warn(`Failed to fetch transaction ${hash}:`, error)
      return null
    }
  }

  async searchBlockOrTransaction(chainId: SupportedChainId, query: string): Promise<{
    type: 'block' | 'transaction' | 'not_found'
    data?: BlockWithTransactions | TransactionWithLogs
  }> {
    const client = this.getClient(chainId)
    
    // Check if query is a block number
    if (/^\d+$/.test(query)) {
      try {
        const blockNumber = BigInt(query)
        const data = await this.getBlockWithTransactions(chainId, blockNumber)
        return { type: 'block', data }
      } catch (error) {
        console.warn(`Block ${query} not found:`, error)
      }
    }
    
    // Check if query is a transaction hash
    if (/^0x[a-fA-F0-9]{64}$/.test(query)) {
      try {
        const data = await this.getTransaction(chainId, query as Hash)
        if (data) {
          return { type: 'transaction', data }
        }
      } catch (error) {
        console.warn(`Transaction ${query} not found:`, error)
      }
    }

    return { type: 'not_found' }
  }

  subscribeToNewBlocks(
    chainId: SupportedChainId,
    callback: (block: BlockWithTransactions) => void
  ): () => void {
    const wsClient = this.getWSClient(chainId)
    
    if (!wsClient) {
      console.warn(`WebSocket not available for chain ${chainId}`)
      return () => {}
    }

    const subscriptionKey = `blocks_${chainId}_${Date.now()}`
    
    const unwatch = wsClient.watchBlocks({
      onBlock: async (block) => {
        try {
          const blockData = await this.getBlockWithTransactions(chainId, block.number!)
          callback(blockData)
        } catch (error) {
          console.error('Error in block subscription:', error)
        }
      },
      poll: true,
      pollingInterval: 1000
    })

    this.subscriptions.set(subscriptionKey, unwatch)

    return () => {
      unwatch()
      this.subscriptions.delete(subscriptionKey)
    }
  }

  clearCache(chainId?: SupportedChainId) {
    if (chainId) {
      this.cache.set(chainId, {})
    } else {
      this.cache.clear()
    }
  }

  cleanup() {
    // Cleanup all subscriptions
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions.clear()
    
    // Clear caches
    this.cache.clear()
  }
}

// Singleton instance
export const blocksService = new BlocksService()

// React hooks for easier integration
export { useRecentBlocks, useBlockDetails, useTransactionDetails, useBlockSearch, useRealtimeBlocks, useLatestBlockNumber } from './hooks/useBlocks'