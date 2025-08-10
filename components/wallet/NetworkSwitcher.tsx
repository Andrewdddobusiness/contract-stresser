'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Network, Check, Clock } from 'lucide-react'
import { useState } from 'react'

interface NetworkSwitcherProps {
  compact?: boolean
  showStatus?: boolean
}

export function NetworkSwitcher({ compact = false, showStatus = true }: NetworkSwitcherProps) {
  const [currentNetwork, setCurrentNetwork] = useState<'local' | 'sepolia'>('local')
  const [isSwitching, setIsSwitching] = useState(false)

  const switchNetwork = async (network: 'local' | 'sepolia') => {
    setIsSwitching(true)
    // Simulate network switching
    setTimeout(() => {
      setCurrentNetwork(network)
      setIsSwitching(false)
    }, 1000)
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant={currentNetwork === 'local' ? 'default' : 'secondary'}>
          {currentNetwork === 'local' ? 'Anvil' : 'Sepolia'}
        </Badge>
        {isSwitching && <Clock className="w-4 h-4 animate-spin" />}
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Network className="w-5 h-5" />
          <span className="font-medium">Network</span>
        </div>
        
        {showStatus && (
          <Badge variant={currentNetwork === 'local' ? 'default' : 'secondary'}>
            {currentNetwork === 'local' ? 'Anvil Local' : 'Sepolia Testnet'}
          </Badge>
        )}
      </div>
      
      <div className="flex space-x-2">
        <Button
          variant={currentNetwork === 'local' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchNetwork('local')}
          disabled={isSwitching}
          className="flex-1"
        >
          {currentNetwork === 'local' && <Check className="w-4 h-4 mr-2" />}
          {isSwitching && currentNetwork !== 'local' && <Clock className="w-4 h-4 animate-spin mr-2" />}
          Anvil
        </Button>
        
        <Button
          variant={currentNetwork === 'sepolia' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchNetwork('sepolia')}
          disabled={isSwitching}
          className="flex-1"
        >
          {currentNetwork === 'sepolia' && <Check className="w-4 h-4 mr-2" />}
          {isSwitching && currentNetwork === 'local' && <Clock className="w-4 h-4 animate-spin mr-2" />}
          Sepolia
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground text-center">
        Switch between local Anvil and Sepolia testnet for testing
      </div>
    </div>
  )
}