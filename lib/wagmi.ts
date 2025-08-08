'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia } from 'viem/chains'
import { anvil, supportedChains } from '@/services/blockchain/chains'

// Wagmi configuration
export const wagmiConfig = getDefaultConfig({
  appName: 'Contract Stresser',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id',
  chains: [anvil, sepolia] as const,
  ssr: true, // Enable SSR support
})

// Export type for supported chain IDs
export type SupportedChainId = typeof supportedChains[number]['id']