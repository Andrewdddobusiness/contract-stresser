'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccountManager } from '@/hooks/useAccountManager'
import { NetworkSwitcher } from './NetworkSwitcher'
import { WalletErrorHandler } from './WalletErrorHandler'
import { Button } from '@/components/ui/button'
import { Wallet, CheckCircle, Copy, LogOut, ExternalLink, Loader2 } from 'lucide-react'
import { useState } from 'react'

export function WalletConnect() {
  const {
    isConnected,
    isConnecting,
    accountInfo,
    balanceLoading,
    networkStatus,
    disconnectWallet,
    copyAddress,
    refreshAccount,
  } = useAccountManager()

  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleCopyAddress = async () => {
    const success = await copyAddress()
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshAccount()
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 border rounded-lg bg-card">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="h-5 w-5" />
          <span>Wallet not connected</span>
        </div>
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted,
          }) => {
            const ready = mounted && authenticationStatus !== 'loading'
            const connected =
              ready &&
              account &&
              chain &&
              (!authenticationStatus || authenticationStatus === 'authenticated')

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  'style': {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <Button onClick={openConnectModal} className="w-full">
                        <Wallet className="w-4 h-4 mr-2" />
                        Connect Wallet
                      </Button>
                    )
                  }

                  return null
                })()}
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error Handler */}
      <WalletErrorHandler />

      {/* Wallet Status */}
      <div className="p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Connected
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-green-500">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Connected</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-6 w-6 p-0"
            >
              {isRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ExternalLink className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Account Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Address:</span>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                {accountInfo?.shortAddress || ''}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAddress}
                className="h-6 w-6 p-0"
              >
                {copied ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Balance */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Balance:</span>
            {balanceLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : accountInfo?.balance ? (
              <span className="text-sm font-mono">
                {accountInfo.balance.value.toFixed(4)} {accountInfo.balance.symbol}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">--</span>
            )}
          </div>

          {/* Connector */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Wallet:</span>
            <span className="text-sm">{accountInfo?.connector}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={disconnectWallet}
            className="flex-1"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </div>

      {/* Network Switcher */}
      <NetworkSwitcher />
    </div>
  )
}