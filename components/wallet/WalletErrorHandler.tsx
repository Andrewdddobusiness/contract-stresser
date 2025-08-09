'use client'

import { useEffect, useState } from 'react'
import { useAccount, useAccountEffect } from 'wagmi'
import { useConnection } from '@/services/blockchain'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, X, Wifi, WifiOff } from 'lucide-react'

interface WalletError {
  type: 'connection' | 'network' | 'account' | 'transaction'
  title: string
  message: string
  action?: () => void
  actionLabel?: string
  dismissible?: boolean
}

export function WalletErrorHandler() {
  const { isConnected, isReconnecting } = useAccount()
  const { state: connectionState, refreshConnection } = useConnection()
  const [errors, setErrors] = useState<WalletError[]>([])

  // Monitor connection errors
  useEffect(() => {
    if (connectionState.error) {
      const error: WalletError = {
        type: 'connection',
        title: 'Connection Error',
        message: connectionState.error,
        action: refreshConnection,
        actionLabel: 'Retry Connection',
        dismissible: true,
      }
      
      setErrors(prev => {
        // Avoid duplicate connection errors
        const hasConnectionError = prev.some(e => e.type === 'connection')
        if (hasConnectionError) {
          return prev.map(e => e.type === 'connection' ? error : e)
        }
        return [...prev, error]
      })
    } else {
      // Clear connection errors when resolved
      setErrors(prev => prev.filter(e => e.type !== 'connection'))
    }
  }, [connectionState.error, refreshConnection])

  // Monitor account disconnections
  useAccountEffect({
    onConnect(data) {
      // Clear account-related errors when connected
      setErrors(prev => prev.filter(e => e.type !== 'account'))
    },
    onDisconnect() {
      // Don't show error for intentional disconnections
      setErrors(prev => prev.filter(e => e.type !== 'account'))
    },
  })

  // Monitor network connectivity
  useEffect(() => {
    if (isConnected && !connectionState.isConnected && !connectionState.isConnecting) {
      const error: WalletError = {
        type: 'network',
        title: 'Network Connectivity Issues',
        message: 'Unable to connect to the blockchain network. Check your internet connection and try again.',
        action: refreshConnection,
        actionLabel: 'Retry Connection',
        dismissible: true,
      }
      
      setErrors(prev => {
        const hasNetworkError = prev.some(e => e.type === 'network')
        if (!hasNetworkError) {
          return [...prev, error]
        }
        return prev
      })
    } else {
      setErrors(prev => prev.filter(e => e.type !== 'network'))
    }
  }, [isConnected, connectionState.isConnected, connectionState.isConnecting, refreshConnection])

  const dismissError = (index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index))
  }

  const getErrorIcon = (type: WalletError['type']) => {
    switch (type) {
      case 'connection':
        return <WifiOff className="h-4 w-4" />
      case 'network':
        return <Wifi className="h-4 w-4" />
      case 'account':
        return <AlertTriangle className="h-4 w-4" />
      case 'transaction':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getErrorColor = (type: WalletError['type']) => {
    switch (type) {
      case 'connection':
        return 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400'
      case 'network':
        return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
      case 'account':
        return 'border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400'
      case 'transaction':
        return 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400'
      default:
        return 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400'
    }
  }

  if (errors.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {errors.map((error, index) => (
        <div
          key={`${error.type}-${index}`}
          className={`flex items-start gap-3 p-3 border rounded-lg ${getErrorColor(error.type)}`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getErrorIcon(error.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{error.title}</div>
            <div className="text-xs mt-1 opacity-80">{error.message}</div>
            
            {error.action && (
              <Button
                variant="outline"
                size="sm"
                onClick={error.action}
                className="mt-2 h-7 text-xs"
                disabled={isReconnecting || connectionState.isConnecting}
              >
                {(isReconnecting || connectionState.isConnecting) && (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                )}
                {error.actionLabel || 'Retry'}
              </Button>
            )}
          </div>
          
          {error.dismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissError(index)}
              className="flex-shrink-0 h-6 w-6 p-0 opacity-60 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

// Utility hook to add custom errors
export function useWalletErrorHandler() {
  const [customErrors, setCustomErrors] = useState<WalletError[]>([])

  const addError = (error: Omit<WalletError, 'dismissible'> & { dismissible?: boolean }) => {
    const fullError: WalletError = { ...error, dismissible: true }
    setCustomErrors(prev => [...prev, fullError])
  }

  const clearErrors = (type?: WalletError['type']) => {
    if (type) {
      setCustomErrors(prev => prev.filter(e => e.type !== type))
    } else {
      setCustomErrors([])
    }
  }

  return {
    customErrors,
    addError,
    clearErrors,
  }
}