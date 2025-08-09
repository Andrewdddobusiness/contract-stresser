'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useBlockNumber } from 'wagmi'
import { type Address } from 'viem'
import { useContract } from './useContract'
import { contractStorage } from '@/services/contracts'
import type { ContractInteraction } from '@/types/contracts'

interface ContractReadOptions {
  watch?: boolean
  enabled?: boolean
  refetchInterval?: number
  cacheTime?: number
  staleTime?: number
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

interface ContractReadResult<T = any> {
  data: T | undefined
  error: Error | null
  loading: boolean
  refetch: () => Promise<void>
  isStale: boolean
  lastFetched: Date | null
}

/**
 * Hook for reading from smart contracts with caching and error handling
 */
export function useContractRead<T = any>(
  address: Address | undefined,
  functionName: string,
  args: any[] = [],
  options: ContractReadOptions = {}
): ContractReadResult<T> {
  const {
    watch = false,
    enabled = true,
    refetchInterval = 0,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 30 * 1000, // 30 seconds
    onSuccess,
    onError,
  } = options

  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const contract = useContract(address)
  const { data: blockNumber } = useBlockNumber({ watch: watch && enabled })

  const isStale = useMemo(() => {
    if (!lastFetched) return true
    return Date.now() - lastFetched.getTime() > staleTime
  }, [lastFetched, staleTime])

  const read = useCallback(async () => {
    if (!contract?.publicContract || !enabled) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await (contract.publicContract as any).read[functionName](args)
      setData(result as T)
      setLastFetched(new Date())

      // Log successful read interaction
      const interaction: ContractInteraction = {
        id: crypto.randomUUID(),
        contractAddress: address!,
        contractName: contract.metadata?.name || 'Unknown Contract',
        functionName,
        functionType: 'read',
        args: args.reduce((acc, arg, index) => {
          acc[`arg${index}`] = arg
          return acc
        }, {} as Record<string, unknown>),
        result: result,
        status: 'success',
        timestamp: new Date(),
        userAddress: undefined, // Read operations don't have a user address
      }
      contractStorage.addInteraction(interaction)

      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)

      // Log failed read interaction
      const interaction: ContractInteraction = {
        id: crypto.randomUUID(),
        contractAddress: address!,
        contractName: contract.metadata?.name || 'Unknown Contract',
        functionName,
        functionType: 'read',
        args: args.reduce((acc, arg, index) => {
          acc[`arg${index}`] = arg
          return acc
        }, {} as Record<string, unknown>),
        status: 'failed',
        error: errorObj.message,
        timestamp: new Date(),
        userAddress: undefined,
      }
      contractStorage.addInteraction(interaction)

      if (onError) {
        onError(errorObj)
      }
    } finally {
      setLoading(false)
    }
  }, [contract, functionName, args, enabled, address, onSuccess, onError])

  // Initial read and re-read on block changes
  useEffect(() => {
    if (enabled && (isStale || watch)) {
      read()
    }
  }, [read, enabled, isStale, watch, blockNumber])

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return

    const interval = setInterval(read, refetchInterval)
    return () => clearInterval(interval)
  }, [read, refetchInterval, enabled])

  // Cache cleanup
  useEffect(() => {
    if (!cacheTime) return

    const timeout = setTimeout(() => {
      if (lastFetched && Date.now() - lastFetched.getTime() > cacheTime) {
        setData(undefined)
        setLastFetched(null)
      }
    }, cacheTime)

    return () => clearTimeout(timeout)
  }, [lastFetched, cacheTime])

  return {
    data,
    error,
    loading,
    refetch: read,
    isStale,
    lastFetched,
  }
}

/**
 * Hook for reading multiple values from a contract in parallel
 */
export function useContractReads<T = any[]>(
  address: Address | undefined,
  calls: Array<{ functionName: string; args?: any[] }>,
  options: ContractReadOptions = {}
): ContractReadResult<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const contract = useContract(address)
  const { data: blockNumber } = useBlockNumber({ 
    watch: options.watch && options.enabled !== false 
  })

  const isStale = useMemo(() => {
    if (!lastFetched) return true
    return Date.now() - lastFetched.getTime() > (options.staleTime || 30000)
  }, [lastFetched, options.staleTime])

  const readAll = useCallback(async () => {
    if (!contract?.publicContract || options.enabled === false || calls.length === 0) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const promises = calls.map(async ({ functionName, args = [] }) => {
        try {
          const result = await (contract.publicContract as any).read[functionName](args)
          return { success: true, data: result, functionName, args }
        } catch (err) {
          return { 
            success: false, 
            error: err instanceof Error ? err.message : String(err),
            functionName,
            args
          }
        }
      })

      const results = await Promise.all(promises)
      const successfulResults = results
        .filter(r => r.success)
        .map(r => r.data)
      
      setData(successfulResults as T)
      setLastFetched(new Date())

      // Log interactions for each call
      results.forEach(({ success, data: result, error: callError, functionName, args }) => {
        const interaction: ContractInteraction = {
          id: crypto.randomUUID(),
          contractAddress: address!,
          contractName: contract.metadata?.name || 'Unknown Contract',
          functionName,
          functionType: 'read',
          args: args.reduce((acc: Record<string, unknown>, arg: any, index: number) => {
            acc[`arg${index}`] = arg
            return acc
          }, {}),
          result: success ? result : undefined,
          status: success ? 'success' : 'failed',
          error: success ? undefined : callError,
          timestamp: new Date(),
          userAddress: undefined,
        }
        contractStorage.addInteraction(interaction)
      })

      const hasErrors = results.some(r => !r.success)
      if (hasErrors && options.onError) {
        const errorMessages = results
          .filter(r => !r.success)
          .map(r => r.error)
          .join(', ')
        options.onError(new Error(`Some calls failed: ${errorMessages}`))
      }

      if (!hasErrors && options.onSuccess) {
        options.onSuccess(successfulResults)
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      
      if (options.onError) {
        options.onError(errorObj)
      }
    } finally {
      setLoading(false)
    }
  }, [contract, calls, options, address])

  useEffect(() => {
    if (options.enabled !== false && (isStale || options.watch)) {
      readAll()
    }
  }, [readAll, options.enabled, isStale, options.watch, blockNumber])

  return {
    data,
    error,
    loading,
    refetch: readAll,
    isStale,
    lastFetched,
  }
}

/**
 * Hook for reading ERC-20 token information
 */
export function useTokenInfo(address: Address | undefined, options: ContractReadOptions = {}) {
  const tokenDetails = useContractReads(
    address,
    [
      { functionName: 'name' },
      { functionName: 'symbol' },
      { functionName: 'decimals' },
      { functionName: 'totalSupply' },
    ],
    options
  )

  const formattedData = useMemo(() => {
    if (!tokenDetails.data || !Array.isArray(tokenDetails.data) || tokenDetails.data.length !== 4) {
      return undefined
    }

    const [name, symbol, decimals, totalSupply] = tokenDetails.data
    return {
      name: name as string,
      symbol: symbol as string,
      decimals: Number(decimals),
      totalSupply: totalSupply as bigint,
    }
  }, [tokenDetails.data])

  return {
    ...tokenDetails,
    data: formattedData,
  }
}

/**
 * Hook for reading with automatic retry on failure
 */
export function useContractReadWithRetry<T = any>(
  address: Address | undefined,
  functionName: string,
  args: any[] = [],
  options: ContractReadOptions & { maxRetries?: number; retryDelay?: number } = {}
): ContractReadResult<T> {
  const { maxRetries = 3, retryDelay = 1000, ...readOptions } = options
  const [retryCount, setRetryCount] = useState(0)

  const baseResult = useContractRead<T>(address, functionName, args, {
    ...readOptions,
    enabled: options.enabled && retryCount <= maxRetries,
  })

  const retryRead = useCallback(async () => {
    if (baseResult.error && retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1)
      }, retryDelay)
    }
  }, [baseResult.error, retryCount, maxRetries, retryDelay])

  useEffect(() => {
    if (baseResult.error && retryCount < maxRetries) {
      retryRead()
    }
  }, [baseResult.error, retryRead, retryCount, maxRetries])

  useEffect(() => {
    if (baseResult.data || !baseResult.error) {
      setRetryCount(0)
    }
  }, [baseResult.data, baseResult.error])

  return {
    ...baseResult,
    refetch: async () => {
      setRetryCount(0)
      await baseResult.refetch()
    },
  }
}