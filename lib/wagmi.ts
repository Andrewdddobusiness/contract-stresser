'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { Chain } from 'viem'
import { sepolia } from 'viem/chains'

// Define local Anvil chain
export const anvil: Chain = {
  id: 31337,
  name: 'Anvil',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ANVIL_RPC_URL || 'http://localhost:8545'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Local Explorer',
      url: '#', // We'll implement our own explorer
    },
  },
  testnet: true,
}

// Wagmi configuration
export const wagmiConfig = getDefaultConfig({
  appName: 'Contract Stresser',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id',
  chains: [anvil, sepolia] as const,
  ssr: true, // Enable SSR support
})

// Export chains for use in other parts of the app
export const supportedChains = [anvil, sepolia] as const
export type SupportedChainId = typeof supportedChains[number]['id']