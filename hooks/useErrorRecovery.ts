'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'

interface ErrorRecoveryOptions {
  maxRetries?: number
  retryDelay?: number
  exponentialBackoff?: boolean
  onRetry?: (attempt: number, error: Error) => void
  onMaxRetriesReached?: (error: Error) => void
  shouldRetry?: (error: Error) => boolean
}

interface ErrorState {
  error: Error | null
  retryCount: number
  isRetrying: boolean
  lastAttempt: Date | null
}

interface RecoveryAction {
  name: string
  description: string
  execute: () => Promise<void>
  canExecute: boolean
}

/**
 * Hook for handling errors with automatic retry logic and recovery actions
 */
export function useErrorRecovery<T extends (...args: any[]) => Promise<any>>(
  asyncFunction: T,
  options: ErrorRecoveryOptions = {}
): {
  execute: T
  state: ErrorState
  retry: () => Promise<void>
  reset: () => void
  recoveryActions: RecoveryAction[]
} {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onRetry,
    onMaxRetriesReached,
    shouldRetry,
  } = options

  const [state, setState] = useState<ErrorState>({
    error: null,
    retryCount: 0,
    isRetrying: false,
    lastAttempt: null,
  })

  const { address, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const lastArgsRef = useRef<Parameters<T>>([] as unknown as Parameters<T>)

  const calculateDelay = useCallback((attempt: number) => {
    if (!exponentialBackoff) return retryDelay
    return Math.min(retryDelay * Math.pow(2, attempt - 1), 30000) // Max 30 seconds
  }, [retryDelay, exponentialBackoff])

  const executeWithRetry = useCallback(async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    lastArgsRef.current = args
    let currentAttempt = 0

    const attempt = async (): Promise<ReturnType<T>> => {
      currentAttempt++
      setState(prev => ({ 
        ...prev, 
        isRetrying: currentAttempt > 1,
        retryCount: currentAttempt - 1,
        lastAttempt: new Date()
      }))

      try {
        const result = await asyncFunction(...args)
        // Success - reset error state
        setState({
          error: null,
          retryCount: 0,
          isRetrying: false,
          lastAttempt: new Date(),
        })
        return result
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        
        setState(prev => ({
          ...prev,
          error: errorObj,
          retryCount: currentAttempt - 1,
          isRetrying: false,
        }))

        // Check if we should retry this error
        const canRetry = shouldRetry ? shouldRetry(errorObj) : true
        
        if (canRetry && currentAttempt <= maxRetries) {
          onRetry?.(currentAttempt, errorObj)
          
          const delay = calculateDelay(currentAttempt)
          await new Promise(resolve => setTimeout(resolve, delay))
          
          return attempt()
        } else {
          onMaxRetriesReached?.(errorObj)
          throw errorObj
        }
      }
    }

    return attempt()
  }, [asyncFunction, maxRetries, shouldRetry, onRetry, onMaxRetriesReached, calculateDelay])

  const retry = useCallback(async () => {
    if (lastArgsRef.current) {
      await executeWithRetry(...lastArgsRef.current)
    }
  }, [executeWithRetry])

  const reset = useCallback(() => {
    setState({
      error: null,
      retryCount: 0,
      isRetrying: false,
      lastAttempt: null,
    })
  }, [])

  // Recovery actions based on common error patterns
  const recoveryActions: RecoveryAction[] = [
    {
      name: 'Connect Wallet',
      description: 'Connect your wallet to continue',
      execute: async () => {
        // This would trigger the wallet connection modal
        // The actual implementation depends on how wallet connection is handled
        window.dispatchEvent(new CustomEvent('request-wallet-connection'))
      },
      canExecute: !isConnected,
    },
    {
      name: 'Switch Network',
      description: 'Switch to the correct network',
      execute: async () => {
        try {
          // Default to local network for this app
          await switchChain({ chainId: 31337 })
        } catch (error) {
          console.error('Failed to switch chain:', error)
        }
      },
      canExecute: !!switchChain && isConnected,
    },
    {
      name: 'Refresh Connection',
      description: 'Refresh your wallet connection',
      execute: async () => {
        window.location.reload()
      },
      canExecute: isConnected,
    },
    {
      name: 'Clear Cache',
      description: 'Clear local storage and refresh',
      execute: async () => {
        localStorage.clear()
        window.location.reload()
      },
      canExecute: true,
    },
  ]

  return {
    execute: executeWithRetry as T,
    state,
    retry,
    reset,
    recoveryActions: recoveryActions.filter(action => action.canExecute),
  }
}

/**
 * Hook specifically for contract interaction errors
 */
export function useContractErrorRecovery<T extends (...args: any[]) => Promise<any>>(
  contractFunction: T,
  options: ErrorRecoveryOptions = {}
) {
  const shouldRetry = useCallback((error: Error) => {
    const message = error.message.toLowerCase()
    
    // Retry on network issues
    if (message.includes('network') || message.includes('connection')) {
      return true
    }
    
    // Retry on temporary RPC issues
    if (message.includes('timeout') || message.includes('rate limit')) {
      return true
    }
    
    // Retry on gas estimation failures (might be temporary)
    if (message.includes('gas') && message.includes('estimation')) {
      return true
    }
    
    // Don't retry on user rejection or insufficient funds
    if (message.includes('rejected') || message.includes('insufficient')) {
      return false
    }
    
    // Don't retry on contract revert errors
    if (message.includes('revert') || message.includes('execution reverted')) {
      return false
    }
    
    // Retry on other errors by default
    return true
  }, [])

  return useErrorRecovery(contractFunction, {
    ...options,
    shouldRetry: options.shouldRetry || shouldRetry,
  })
}

/**
 * Hook for handling transaction errors with specific recovery actions
 */
export function useTransactionErrorRecovery<T extends (...args: any[]) => Promise<any>>(
  transactionFunction: T,
  options: ErrorRecoveryOptions = {}
) {
  const shouldRetry = useCallback((error: Error) => {
    const message = error.message.toLowerCase()
    
    // Always retry on network issues
    if (message.includes('network error') || message.includes('connection lost')) {
      return true
    }
    
    // Retry on nonce issues (might resolve on next block)
    if (message.includes('nonce') && !message.includes('nonce too low')) {
      return true
    }
    
    // Retry on gas price issues
    if (message.includes('replacement transaction underpriced')) {
      return true
    }
    
    // Don't retry on user rejections
    if (message.includes('user rejected') || message.includes('user denied')) {
      return false
    }
    
    // Don't retry on insufficient funds
    if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
      return false
    }
    
    return true
  }, [])

  const { execute, state, retry, reset, recoveryActions } = useErrorRecovery(transactionFunction, {
    ...options,
    shouldRetry: options.shouldRetry || shouldRetry,
    exponentialBackoff: true,
    maxRetries: 5, // More retries for transactions
  })

  // Additional recovery actions for transactions
  const transactionRecoveryActions: RecoveryAction[] = [
    ...recoveryActions,
    {
      name: 'Check Gas Settings',
      description: 'Review and adjust gas price/limit',
      execute: async () => {
        console.log('User should check gas settings')
        // This would open a gas settings modal
      },
      canExecute: state.error?.message.toLowerCase().includes('gas') || false,
    },
    {
      name: 'Wait and Retry',
      description: 'Wait for network congestion to clear',
      execute: async () => {
        await new Promise(resolve => setTimeout(resolve, 30000)) // Wait 30 seconds
        await retry()
      },
      canExecute: state.error?.message.toLowerCase().includes('congestion') || false,
    },
  ]

  return {
    execute,
    state,
    retry,
    reset,
    recoveryActions: transactionRecoveryActions,
  }
}

/**
 * Hook for global error boundary with recovery suggestions
 */
export function useGlobalErrorRecovery() {
  const [globalErrors, setGlobalErrors] = useState<Error[]>([])

  const addError = useCallback((error: Error) => {
    setGlobalErrors(prev => [...prev, error])
  }, [])

  const removeError = useCallback((index: number) => {
    setGlobalErrors(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearAllErrors = useCallback(() => {
    setGlobalErrors([])
  }, [])

  // Listen for unhandled errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      addError(new Error(event.message))
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))
      addError(error)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [addError])

  const getRecoverySuggestions = useCallback((error: Error) => {
    const suggestions: string[] = []
    const message = error.message.toLowerCase()

    if (message.includes('network') || message.includes('connection')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Try switching networks')
    }

    if (message.includes('wallet') || message.includes('account')) {
      suggestions.push('Reconnect your wallet')
      suggestions.push('Check if wallet is unlocked')
    }

    if (message.includes('gas') || message.includes('fee')) {
      suggestions.push('Increase gas price or limit')
      suggestions.push('Wait for network congestion to clear')
    }

    if (message.includes('balance') || message.includes('funds')) {
      suggestions.push('Add more funds to your wallet')
      suggestions.push('Check token balances')
    }

    if (suggestions.length === 0) {
      suggestions.push('Try refreshing the page')
      suggestions.push('Contact support if the issue persists')
    }

    return suggestions
  }, [])

  return {
    errors: globalErrors,
    addError,
    removeError,
    clearAllErrors,
    getRecoverySuggestions,
    hasErrors: globalErrors.length > 0,
  }
}