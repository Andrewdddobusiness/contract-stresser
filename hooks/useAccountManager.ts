'use client'

import { useAccount, useBalance, useChainId, useDisconnect, useSwitchChain } from 'wagmi'
import { useConnection, useCurrentChain, useIsLocalChain, useNetworkInfo } from '@/services/blockchain'
import { anvil } from '@/services/blockchain/chains'
import { useCallback, useMemo } from 'react'
import { formatEther } from 'viem'

export function useAccountManager() {
  const { address, isConnected, isConnecting, connector } = useAccount()
  const chainId = useChainId()
  const currentChain = useCurrentChain()
  const isLocalChain = useIsLocalChain()
  const networkInfo = useNetworkInfo()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain()
  const { state: connectionState, refreshConnection } = useConnection()

  // Get account balance
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useBalance({
    address: address,
    query: {
      enabled: !!address && isConnected,
    },
  })

  // Format balance for display
  const formattedBalance = useMemo(() => {
    if (!balance) return null
    return {
      value: parseFloat(formatEther(balance.value)),
      formatted: balance.formatted,
      symbol: balance.symbol,
      decimals: balance.decimals,
    }
  }, [balance])

  // Account info
  const accountInfo = useMemo(() => {
    if (!address || !isConnected) return null
    
    return {
      address,
      shortAddress: `${address.slice(0, 6)}...${address.slice(-4)}`,
      balance: formattedBalance,
      chainId,
      chainName: isLocalChain ? 'Anvil (Local)' : 'Sepolia Testnet',
      isLocalChain,
      connector: connector?.name || 'Unknown',
    }
  }, [address, isConnected, formattedBalance, chainId, isLocalChain, connector])

  // Network status
  const networkStatus = useMemo(() => {
    return {
      isConnected: connectionState.isConnected,
      isConnecting: connectionState.isConnecting,
      currentChainId: currentChain,
      targetChainId: chainId,
      chainMismatch: currentChain !== chainId,
      blockNumber: networkInfo?.blockNumber,
      gasPrice: networkInfo?.gasPrice,
      error: connectionState.error || switchError?.message,
    }
  }, [connectionState, currentChain, chainId, networkInfo, switchError])

  // Switch to Anvil (local network)
  const switchToAnvil = useCallback(async () => {
    try {
      await switchChain({ chainId: anvil.id })
    } catch (error) {
      console.error('Failed to switch to Anvil:', error)
      throw error
    }
  }, [switchChain])

  // Switch to Sepolia
  const switchToSepolia = useCallback(async () => {
    try {
      await switchChain({ chainId: 11155111 })
    } catch (error) {
      console.error('Failed to switch to Sepolia:', error)
      throw error
    }
  }, [switchChain])

  // Switch to specific chain
  const switchToChain = useCallback(async (targetChainId: number) => {
    try {
      await switchChain({ chainId: targetChainId })
    } catch (error) {
      console.error(`Failed to switch to chain ${targetChainId}:`, error)
      throw error
    }
  }, [switchChain])

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect()
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
      throw error
    }
  }, [disconnect])

  // Refresh account data
  const refreshAccount = useCallback(async () => {
    try {
      await Promise.all([
        refetchBalance(),
        refreshConnection(),
      ])
    } catch (error) {
      console.error('Failed to refresh account data:', error)
    }
  }, [refetchBalance, refreshConnection])

  // Copy address to clipboard
  const copyAddress = useCallback(async () => {
    if (!address) return false
    
    try {
      await navigator.clipboard.writeText(address)
      return true
    } catch (error) {
      console.error('Failed to copy address:', error)
      return false
    }
  }, [address])

  return {
    // Account state
    isConnected,
    isConnecting,
    accountInfo,
    balanceLoading,
    
    // Network state
    networkStatus,
    isSwitching,
    
    // Actions
    switchToAnvil,
    switchToSepolia,
    switchToChain,
    disconnectWallet,
    refreshAccount,
    copyAddress,
    
    // Raw data (for advanced usage)
    rawBalance: balance,
    rawNetworkInfo: networkInfo,
    connectionState,
  }
}