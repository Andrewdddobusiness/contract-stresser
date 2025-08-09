'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount, useBlockNumber } from 'wagmi'
import { formatUnits, type Address } from 'viem'
import { useContract, useERC20Contract } from './useContract'
import { contractStorage } from '@/services/contracts'

interface TokenBalanceData {
  balance: bigint
  formatted: string
  symbol: string
  decimals: number
  loading: boolean
  error: string | null
}

interface UseTokenBalanceOptions {
  watch?: boolean
  refetchInterval?: number
  enabled?: boolean
  suspense?: boolean
}

/**
 * Hook to get token balance for a specific account and token
 */
export function useTokenBalance(
  tokenAddress: Address | undefined,
  accountAddress: Address | undefined,
  options: UseTokenBalanceOptions = {}
) {
  const { 
    watch = false, 
    refetchInterval = 0, 
    enabled = true,
    suspense = false 
  } = options

  const [balance, setBalance] = useState<bigint>(BigInt(0))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contract = useERC20Contract(tokenAddress)
  const { data: blockNumber } = useBlockNumber({ watch: watch && enabled })

  // Get token metadata
  const tokenMetadata = useMemo(() => {
    if (!tokenAddress) return null
    return contractStorage.getAllContracts().find(
      c => c.address.toLowerCase() === tokenAddress.toLowerCase()
    )
  }, [tokenAddress])

  const fetchBalance = useCallback(async () => {
    if (!contract?.publicContract || !accountAddress || !enabled) {
      setBalance(BigInt(0))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await (contract.publicContract as any).read.balanceOf([accountAddress])
      setBalance(result as bigint)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance'
      setError(errorMessage)
      console.error('Token balance fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [contract, accountAddress, enabled])

  // Initial fetch and refetch on dependencies change
  useEffect(() => {
    fetchBalance()
  }, [fetchBalance, blockNumber])

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return

    const interval = setInterval(fetchBalance, refetchInterval)
    return () => clearInterval(interval)
  }, [fetchBalance, refetchInterval, enabled])

  const tokenData = useMemo((): TokenBalanceData => {
    const decimals = tokenMetadata?.decimals || 18
    const symbol = tokenMetadata?.symbol || 'TOKEN'
    
    return {
      balance,
      formatted: formatUnits(balance, decimals),
      symbol,
      decimals,
      loading,
      error,
    }
  }, [balance, tokenMetadata, loading, error])

  const refetch = useCallback(() => {
    fetchBalance()
  }, [fetchBalance])

  return {
    ...tokenData,
    refetch,
    contract,
  }
}

/**
 * Hook to get current user's token balance
 */
export function useMyTokenBalance(
  tokenAddress: Address | undefined,
  options: UseTokenBalanceOptions = {}
) {
  const { address } = useAccount()
  return useTokenBalance(tokenAddress, address, options)
}

/**
 * Hook to get token balances for multiple accounts
 */
export function useMultipleTokenBalances(
  tokenAddress: Address | undefined,
  accountAddresses: Address[],
  options: UseTokenBalanceOptions = {}
) {
  const contract = useERC20Contract(tokenAddress)
  const { data: blockNumber } = useBlockNumber({ 
    watch: options.watch && options.enabled !== false 
  })

  const [balances, setBalances] = useState<Record<string, TokenBalanceData>>({})
  const [loading, setLoading] = useState(false)

  const tokenMetadata = useMemo(() => {
    if (!tokenAddress) return null
    return contractStorage.getAllContracts().find(
      c => c.address.toLowerCase() === tokenAddress.toLowerCase()
    )
  }, [tokenAddress])

  const fetchBalances = useCallback(async () => {
    if (!contract?.publicContract || accountAddresses.length === 0 || options.enabled === false) {
      return
    }

    setLoading(true)

    try {
      const balancePromises = accountAddresses.map(async (address) => {
        try {
          const balance = await (contract.publicContract as any).read.balanceOf([address])
          return { address, balance: balance as bigint, error: null }
        } catch (error) {
          return { 
            address, 
            balance: BigInt(0), 
            error: error instanceof Error ? error.message : 'Failed to fetch balance' 
          }
        }
      })

      const results = await Promise.all(balancePromises)
      
      const decimals = tokenMetadata?.decimals || 18
      const symbol = tokenMetadata?.symbol || 'TOKEN'

      const newBalances: Record<string, TokenBalanceData> = {}
      results.forEach(({ address, balance, error }) => {
        newBalances[address.toLowerCase()] = {
          balance,
          formatted: formatUnits(balance, decimals),
          symbol,
          decimals,
          loading: false,
          error,
        }
      })

      setBalances(newBalances)
    } catch (error) {
      console.error('Multi-balance fetch error:', error)
      // Set error state for all addresses
      const errorBalances: Record<string, TokenBalanceData> = {}
      accountAddresses.forEach(address => {
        errorBalances[address.toLowerCase()] = {
          balance: BigInt(0),
          formatted: '0',
          symbol: tokenMetadata?.symbol || 'TOKEN',
          decimals: tokenMetadata?.decimals || 18,
          loading: false,
          error: 'Failed to fetch balance',
        }
      })
      setBalances(errorBalances)
    } finally {
      setLoading(false)
    }
  }, [contract, accountAddresses, tokenMetadata, options.enabled])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances, blockNumber])

  const refetch = useCallback(() => {
    fetchBalances()
  }, [fetchBalances])

  const getBalance = useCallback((address: Address) => {
    return balances[address.toLowerCase()] || {
      balance: BigInt(0),
      formatted: '0',
      symbol: tokenMetadata?.symbol || 'TOKEN',
      decimals: tokenMetadata?.decimals || 18,
      loading: false,
      error: null,
    }
  }, [balances, tokenMetadata])

  return {
    balances,
    loading,
    getBalance,
    refetch,
    contract,
  }
}

/**
 * Hook to get balances for multiple tokens for a single account
 */
export function useMultiTokenBalance(
  tokenAddresses: Address[],
  accountAddress: Address | undefined,
  options: UseTokenBalanceOptions = {}
) {
  const [balances, setBalances] = useState<Record<string, TokenBalanceData>>({})
  const [loading, setLoading] = useState(false)

  const { data: blockNumber } = useBlockNumber({ 
    watch: options.watch && options.enabled !== false 
  })

  const fetchBalances = useCallback(async () => {
    if (!accountAddress || tokenAddresses.length === 0 || options.enabled === false) {
      return
    }

    setLoading(true)

    try {
      const balancePromises = tokenAddresses.map(async (tokenAddress) => {
        try {
          const contract = useERC20Contract(tokenAddress)
          if (!contract?.publicContract) {
            throw new Error('Contract not available')
          }

          const balance = await (contract.publicContract as any).read.balanceOf([accountAddress])
          const metadata = contractStorage.getAllContracts().find(
            c => c.address.toLowerCase() === tokenAddress.toLowerCase()
          )

          return { 
            tokenAddress, 
            balance: balance as bigint, 
            metadata,
            error: null 
          }
        } catch (error) {
          return { 
            tokenAddress, 
            balance: BigInt(0), 
            metadata: null,
            error: error instanceof Error ? error.message : 'Failed to fetch balance' 
          }
        }
      })

      const results = await Promise.all(balancePromises)
      
      const newBalances: Record<string, TokenBalanceData> = {}
      results.forEach(({ tokenAddress, balance, metadata, error }) => {
        const decimals = metadata?.decimals || 18
        const symbol = metadata?.symbol || 'TOKEN'
        
        newBalances[tokenAddress.toLowerCase()] = {
          balance,
          formatted: formatUnits(balance, decimals),
          symbol,
          decimals,
          loading: false,
          error,
        }
      })

      setBalances(newBalances)
    } catch (error) {
      console.error('Multi-token balance fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [accountAddress, tokenAddresses, options.enabled])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances, blockNumber])

  const refetch = useCallback(() => {
    fetchBalances()
  }, [fetchBalances])

  const getTokenBalance = useCallback((tokenAddress: Address) => {
    return balances[tokenAddress.toLowerCase()] || {
      balance: BigInt(0),
      formatted: '0',
      symbol: 'TOKEN',
      decimals: 18,
      loading: false,
      error: null,
    }
  }, [balances])

  return {
    balances,
    loading,
    getTokenBalance,
    refetch,
  }
}

/**
 * Hook to watch for balance changes with real-time updates
 */
export function useTokenBalanceWatcher(
  tokenAddress: Address | undefined,
  accountAddress: Address | undefined,
  onBalanceChange?: (balance: TokenBalanceData) => void
) {
  const balanceData = useTokenBalance(tokenAddress, accountAddress, {
    watch: true,
    enabled: true,
  })

  useEffect(() => {
    if (onBalanceChange && !balanceData.loading && !balanceData.error) {
      onBalanceChange(balanceData)
    }
  }, [balanceData, onBalanceChange])

  return balanceData
}