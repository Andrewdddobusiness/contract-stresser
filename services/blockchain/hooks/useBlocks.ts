import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useCallback } from 'react'
import { Hash } from 'viem'
import { useCurrentChain } from '../connection'
import { blocksService, BlockWithTransactions, TransactionWithLogs } from '../blocks'

export function useRecentBlocks(count: number = 10, enabled: boolean = true) {
  const chainId = useCurrentChain()

  return useQuery({
    queryKey: ['recent-blocks', chainId, count],
    queryFn: () => blocksService.getRecentBlocks(chainId, count),
    refetchInterval: 2000, // Refresh every 2 seconds
    enabled: enabled && !!chainId,
    staleTime: 1000, // Consider data stale after 1 second
  })
}

export function useBlockDetails(blockNumber: bigint | null, enabled: boolean = true) {
  const chainId = useCurrentChain()

  return useQuery({
    queryKey: ['block-details', chainId, blockNumber?.toString()],
    queryFn: () => blockNumber ? blocksService.getBlockWithTransactions(chainId, blockNumber) : null,
    enabled: enabled && !!chainId && blockNumber !== null,
    staleTime: 60000, // Block data is immutable, cache for 1 minute
  })
}

export function useTransactionDetails(hash: Hash | null, enabled: boolean = true) {
  const chainId = useCurrentChain()

  return useQuery({
    queryKey: ['transaction-details', chainId, hash],
    queryFn: () => hash ? blocksService.getTransaction(chainId, hash) : null,
    enabled: enabled && !!chainId && !!hash,
    staleTime: 60000, // Transaction data is immutable, cache for 1 minute
  })
}

export function useBlockSearch() {
  const chainId = useCurrentChain()
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<{
    type: 'block' | 'transaction' | 'not_found'
    data?: BlockWithTransactions | TransactionWithLogs
    query?: string
  } | null>(null)

  const search = useCallback(async (query: string) => {
    if (!query.trim() || !chainId) {
      setSearchResult(null)
      return
    }

    setIsSearching(true)
    try {
      const result = await blocksService.searchBlockOrTransaction(chainId, query.trim())
      setSearchResult({ ...result, query: query.trim() })
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResult({ type: 'not_found', query: query.trim() })
    } finally {
      setIsSearching(false)
    }
  }, [chainId])

  const clearSearch = useCallback(() => {
    setSearchResult(null)
  }, [])

  return {
    search,
    clearSearch,
    isSearching,
    result: searchResult
  }
}

export function useRealtimeBlocks(enabled: boolean = true) {
  const chainId = useCurrentChain()
  const queryClient = useQueryClient()
  const [latestBlock, setLatestBlock] = useState<BlockWithTransactions | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!enabled || !chainId) {
      setIsConnected(false)
      return
    }

    let unsubscribe: (() => void) | null = null

    const setupSubscription = () => {
      unsubscribe = blocksService.subscribeToNewBlocks(chainId, (block) => {
        setLatestBlock(block)
        setIsConnected(true)
        
        // Invalidate related queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['recent-blocks', chainId] })
        queryClient.invalidateQueries({ queryKey: ['network-info', chainId] })
      })
    }

    setupSubscription()
    setIsConnected(true)

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
      setIsConnected(false)
    }
  }, [enabled, chainId, queryClient])

  return {
    latestBlock,
    isConnected
  }
}

export function useLatestBlockNumber() {
  const chainId = useCurrentChain()

  return useQuery({
    queryKey: ['latest-block-number', chainId],
    queryFn: () => blocksService.getLatestBlockNumber(chainId),
    refetchInterval: 2000,
    enabled: !!chainId,
    staleTime: 1000,
  })
}