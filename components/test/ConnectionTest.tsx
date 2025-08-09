'use client'

import { WalletConnect, NetworkSwitcher } from '@/components/wallet'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function ConnectionTest() {
  return (
    <div className="space-y-6">
      <div className="p-4 border rounded bg-card">
        <h3 className="text-lg font-semibold mb-3">Wallet & Network Testing</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Use this section to test wallet connection and network switching functionality.
        </p>
        
        {/* Simple Connect Button */}
        <div className="mb-4">
          <ConnectButton />
        </div>
        
        {/* Compact Network Switcher */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Quick Network Switch:</h4>
          <NetworkSwitcher compact />
        </div>
      </div>
      
      {/* Full Wallet Interface */}
      <WalletConnect />
    </div>
  )
}