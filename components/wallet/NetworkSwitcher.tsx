'use client'

import { useAccountManager } from '@/hooks/useAccountManager'
import { Button } from '@/components/ui/button'
import { Network, AlertCircle, CheckCircle, Loader2, Wifi, WifiOff } from 'lucide-react'
import { anvil } from '@/services/blockchain/chains'

interface NetworkSwitcherProps {
  compact?: boolean
  showStatus?: boolean
}

export function NetworkSwitcher({ compact = false, showStatus = true }: NetworkSwitcherProps) {
  const { networkStatus, isSwitching, switchToAnvil, switchToSepolia } = useAccountManager()

  const networks = [
    {
      id: anvil.id,
      name: 'Anvil',
      description: 'Local Development',
      isLocal: true,
    },
    {
      id: 11155111,
      name: 'Sepolia',
      description: 'Ethereum Testnet',
      isLocal: false,
    },
  ]

  const handleNetworkSwitch = async (networkId: number) => {
    try {
      if (networkId === anvil.id) {
        await switchToAnvil()
      } else if (networkId === 11155111) {
        await switchToSepolia()
      }
    } catch (error) {
      // Error handling is done in the hook
    }
  }

  const getCurrentNetwork = () => {
    return networks.find(network => network.id === networkStatus.currentChainId)
  }

  const currentNetwork = getCurrentNetwork()

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {networks.map((network) => (
          <Button
            key={network.id}
            variant={networkStatus.currentChainId === network.id ? "default" : "outline"}
            size="sm"
            onClick={() => handleNetworkSwitch(network.id)}
            disabled={isSwitching || networkStatus.currentChainId === network.id}
            className="relative"
          >
            {isSwitching && networkStatus.currentChainId !== network.id && (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            )}
            {network.name}
            {networkStatus.currentChainId === network.id && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Current Network Status */}
      {showStatus && (
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Network className="h-5 w-5" />
              Network Status
            </h3>
            <div className="flex items-center gap-1">
              {networkStatus.isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-500">Disconnected</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current Network:</span>
              <span className="font-medium">
                {currentNetwork?.name || 'Unknown'} 
                {currentNetwork?.isLocal && <span className="text-muted-foreground ml-1">(Local)</span>}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Chain ID:</span>
              <span className="font-mono">{networkStatus.currentChainId}</span>
            </div>

            {networkStatus.blockNumber && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Block Number:</span>
                <span className="font-mono">{networkStatus.blockNumber.toString()}</span>
              </div>
            )}

            {networkStatus.chainMismatch && (
              <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    Chain Mismatch
                  </span>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                    Your wallet is connected to a different network than the selected one.
                  </p>
                </div>
              </div>
            )}

            {networkStatus.error && (
              <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    Network Error
                  </span>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                    {networkStatus.error}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Network Switching */}
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="text-lg font-semibold mb-3">Switch Network</h3>
        <div className="space-y-2">
          {networks.map((network) => {
            const isActive = networkStatus.currentChainId === network.id
            const isSwitchingTo = isSwitching && !isActive
            
            return (
              <Button
                key={network.id}
                variant={isActive ? "default" : "outline"}
                className="w-full justify-start h-auto p-3"
                onClick={() => handleNetworkSwitch(network.id)}
                disabled={isSwitching || isActive}
              >
                <div className="flex items-center w-full">
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{network.name}</span>
                      {isActive && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {isSwitchingTo && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {network.description}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {network.id}
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}