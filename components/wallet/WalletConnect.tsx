'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { Wallet, CheckCircle, Copy, LogOut, ExternalLink, Loader2 } from 'lucide-react'
import { useState } from 'react'

export function WalletConnect() {
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center space-x-3">
          <Wallet className="w-5 h-5" />
          <span className="font-medium">Wallet Connection</span>
        </div>
        
        <ConnectButton />
      </div>
      
      <div className="text-sm text-muted-foreground text-center">
        Use RainbowKit's Connect button for external wallet connections.
        <br />
        For stress testing, accounts are managed automatically.
      </div>
    </div>
  )
}