'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { type Address, type Hash } from 'viem'
import { accountManager, type AccountBalanceInfo } from '@/services/testing/accounts'
import type { AccountInfo, AccountRotationStrategy } from '@/types/testing'

interface UseAccountManagerOptions {
  network?: 'local' | 'sepolia'
  monitoringInterval?: number
  onAccountUpdate?: (balances: AccountBalanceInfo[]) => void
  onError?: (error: Error) => void
}

interface UseAccountManagerReturn {
  // State
  accounts: AccountInfo[]
  balances: AccountBalanceInfo[]
  isGenerating: boolean
  isFunding: boolean
  isMonitoring: boolean
  networkInfo: {
    network: 'local' | 'sepolia'
    chain: any | null
    connected: boolean
    accountCount: number
    activeAccounts: number
  }
  
  // Actions
  generateAccounts: (count: number, fundingAmount: string) => Promise<AccountInfo[]>
  fundAccounts: (addresses: Address[], amount: string) => Promise<Hash[]>
  updateBalances: () => Promise<void>
  startMonitoring: () => void
  stopMonitoring: () => void
  impersonateAccount: (address: Address) => Promise<void>
  stopImpersonating: (address: Address) => Promise<void>
  setAccountStatus: (address: Address, isActive: boolean) => void
  
  // Rotation
  createRotation: (strategy?: AccountRotationStrategy['type']) => AccountRotationStrategy
  getNextAccount: (strategy: AccountRotationStrategy) => AccountInfo | null
  
  // Statistics
  usageStats: Map<Address, number>
  resetStats: () => void
  
  // Utilities
  getAccount: (address: Address) => AccountInfo | null
  cleanup: () => void
}

/**
 * Hook for managing multiple test accounts with funding and monitoring
 */
export function useAccountManager(options: UseAccountManagerOptions = {}): UseAccountManagerReturn {
  const {
    network = 'local',
    monitoringInterval = 10000,
    onAccountUpdate,
    onError
  } = options

  const [accounts, setAccounts] = useState<AccountInfo[]>([])
  const [balances, setBalances] = useState<AccountBalanceInfo[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isFunding, setIsFunding] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [usageStats, setUsageStats] = useState<Map<Address, number>>(new Map())
  const [networkInfo, setNetworkInfo] = useState<{
    network: 'local' | 'sepolia'
    chain: any | null
    connected: boolean
    accountCount: number
    activeAccounts: number
  }>({
    network: network,
    chain: null,
    connected: false,
    accountCount: 0,
    activeAccounts: 0
  })

  const stopMonitoringRef = useRef<(() => void) | null>(null)

  // Initialize account manager with network
  useEffect(() => {
    const initializeNetwork = async () => {
      try {
        await accountManager.setupNetwork(network)
        updateNetworkInfo()
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Failed to initialize network'))
      }
    }

    initializeNetwork()
  }, [network, onError])

  // Update network info
  const updateNetworkInfo = useCallback(() => {
    const info = accountManager.getNetworkInfo()
    setNetworkInfo({
      network: info.network,
      chain: info.chain,
      connected: info.connected,
      accountCount: info.accountCount,
      activeAccounts: info.activeAccounts
    })
  }, [])

  // Generate test accounts
  const generateAccounts = useCallback(async (count: number, fundingAmount: string): Promise<AccountInfo[]> => {
    setIsGenerating(true)
    try {
      const newAccounts = await accountManager.generateAccounts({
        count,
        fundingAmount,
        network,
        namePrefix: 'TestAccount'
      })
      
      setAccounts(newAccounts)
      updateNetworkInfo()
      
      // Update balances after generation
      await updateBalances()
      
      return newAccounts
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to generate accounts')
      onError?.(err)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [network, onError])

  // Fund accounts
  const fundAccounts = useCallback(async (addresses: Address[], amount: string): Promise<Hash[]> => {
    setIsFunding(true)
    try {
      const transactions = await accountManager.fundAccounts({
        accounts: addresses,
        amount: BigInt(amount),
        network
      })
      
      // Update balances after funding
      setTimeout(() => {
        updateBalances()
      }, 2000) // Wait a bit for transactions to confirm
      
      return transactions
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fund accounts')
      onError?.(err)
      throw err
    } finally {
      setIsFunding(false)
    }
  }, [network, onError])

  // Update account balances
  const updateBalances = useCallback(async () => {
    try {
      const latestBalances = await accountManager.getAllAccountBalances()
      setBalances(latestBalances)
      
      // Update accounts array with latest balance info
      const updatedAccounts = accountManager.getAllAccounts()
      setAccounts(updatedAccounts)
      
      updateNetworkInfo()
      onAccountUpdate?.(latestBalances)
    } catch (error) {
      console.error('Failed to update balances:', error)
    }
  }, [onAccountUpdate])

  // Start balance monitoring
  const startMonitoring = useCallback(async () => {
    if (isMonitoring) return

    setIsMonitoring(true)
    try {
      const stopFn = await accountManager.startAccountMonitoring(
        (updatedBalances) => {
          setBalances(updatedBalances)
          onAccountUpdate?.(updatedBalances)
        },
        monitoringInterval
      )
      
      stopMonitoringRef.current = stopFn
    } catch (error) {
      setIsMonitoring(false)
      onError?.(error instanceof Error ? error : new Error('Failed to start monitoring'))
    }
  }, [isMonitoring, monitoringInterval, onAccountUpdate, onError])

  // Stop balance monitoring
  const stopMonitoring = useCallback(() => {
    if (stopMonitoringRef.current) {
      stopMonitoringRef.current()
      stopMonitoringRef.current = null
    }
    setIsMonitoring(false)
  }, [])

  // Impersonate account (Anvil only)
  const impersonateAccount = useCallback(async (address: Address) => {
    try {
      await accountManager.impersonateAccount(address)
      console.log(`Started impersonating ${address}`)
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to impersonate account'))
      throw error
    }
  }, [onError])

  // Stop impersonating account
  const stopImpersonating = useCallback(async (address: Address) => {
    try {
      await accountManager.stopImpersonating(address)
      console.log(`Stopped impersonating ${address}`)
    } catch (error) {
      console.error('Failed to stop impersonating:', error)
    }
  }, [])

  // Set account status
  const setAccountStatus = useCallback((address: Address, isActive: boolean) => {
    accountManager.setAccountStatus(address, isActive)
    
    // Update local state
    setAccounts(prev => prev.map(account => 
      account.address === address 
        ? { ...account, isActive }
        : account
    ))
    
    updateNetworkInfo()
  }, [])

  // Create rotation strategy
  const createRotation = useCallback((strategy: AccountRotationStrategy['type'] = 'round-robin'): AccountRotationStrategy => {
    return accountManager.createRotationStrategy(accounts, strategy)
  }, [accounts])

  // Get next account from rotation
  const getNextAccount = useCallback((strategy: AccountRotationStrategy): AccountInfo | null => {
    const account = accountManager.getNextAccount(strategy)
    
    // Update usage stats
    const stats = accountManager.getUsageStats()
    setUsageStats(new Map(stats))
    
    return account
  }, [])

  // Reset usage statistics
  const resetStats = useCallback(() => {
    accountManager.resetUsageStats()
    setUsageStats(new Map())
  }, [])

  // Get specific account
  const getAccount = useCallback((address: Address): AccountInfo | null => {
    return accountManager.getAccount(address)
  }, [])

  // Cleanup resources
  const cleanup = useCallback(() => {
    stopMonitoring()
    accountManager.cleanup()
    setAccounts([])
    setBalances([])
    setUsageStats(new Map())
    updateNetworkInfo()
  }, [stopMonitoring])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  return {
    // State
    accounts,
    balances,
    isGenerating,
    isFunding,
    isMonitoring,
    networkInfo,
    
    // Actions
    generateAccounts,
    fundAccounts,
    updateBalances,
    startMonitoring,
    stopMonitoring,
    impersonateAccount,
    stopImpersonating,
    setAccountStatus,
    
    // Rotation
    createRotation,
    getNextAccount,
    
    // Statistics
    usageStats,
    resetStats,
    
    // Utilities
    getAccount,
    cleanup
  }
}

/**
 * Hook for simplified account generation and management
 */
export function useTestAccounts(count: number = 5, fundingAmount: string = '10.0') {
  const accountManager = useAccountManager({
    network: 'local',
    monitoringInterval: 5000
  })

  const [isSetup, setIsSetup] = useState(false)

  // Auto-generate accounts on mount
  useEffect(() => {
    if (!isSetup && !accountManager.isGenerating && accountManager.accounts.length === 0) {
      setIsSetup(true)
      accountManager.generateAccounts(count, fundingAmount).catch(console.error)
    }
  }, [accountManager, count, fundingAmount, isSetup])

  return {
    ...accountManager,
    isSetup,
    totalBalance: accountManager.balances.reduce((sum, acc) => sum + acc.balance, BigInt(0))
  }
}

/**
 * Hook for account rotation strategies
 */
export function useAccountRotation(
  accounts: AccountInfo[],
  strategy: AccountRotationStrategy['type'] = 'round-robin'
) {
  const [rotation, setRotation] = useState<AccountRotationStrategy | null>(null)
  const [currentAccount, setCurrentAccount] = useState<AccountInfo | null>(null)

  // Initialize rotation strategy
  useEffect(() => {
    if (accounts.length > 0) {
      const newRotation = accountManager.createRotationStrategy(accounts, strategy)
      setRotation(newRotation)
    }
  }, [accounts, strategy])

  // Get next account
  const getNext = useCallback(() => {
    if (!rotation) return null
    
    const nextAccount = accountManager.getNextAccount(rotation)
    setCurrentAccount(nextAccount)
    return nextAccount
  }, [rotation])

  // Reset rotation
  const reset = useCallback(() => {
    if (rotation) {
      rotation.currentIndex = 0
      setCurrentAccount(null)
    }
  }, [rotation])

  return {
    rotation,
    currentAccount,
    getNext,
    reset,
    hasNext: rotation ? rotation.accounts.length > 0 : false
  }
}