import { Chain } from 'viem'

// Custom chain type with additional features
export interface ChainWithFeatures extends Chain {
  features?: {
    testClient?: boolean
    instantMining?: boolean
    impersonation?: boolean
    unlimitedAccounts?: boolean
  }
}

/**
 * Local Anvil chain configuration
 */
export const anvil: ChainWithFeatures = {
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
      webSocket: [process.env.NEXT_PUBLIC_ANVIL_WS_URL || 'ws://localhost:8545'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Local Explorer',
      url: '#', // We'll implement our own explorer
    },
  },
  testnet: true,
  features: {
    testClient: true, // Supports test client operations
    instantMining: true, // Can mine blocks instantly
    impersonation: true, // Can impersonate accounts
    unlimitedAccounts: true, // Has many pre-funded accounts
  },
}

/**
 * Sepolia testnet configuration
 */
export const sepolia: ChainWithFeatures = {
  id: 11155111,
  name: 'Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'SEP',
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherscan',
      url: 'https://sepolia.etherscan.io',
      apiUrl: 'https://api-sepolia.etherscan.io/api',
    },
  },
  testnet: true,
  features: {
    testClient: false,
    instantMining: false,
    impersonation: false,
    unlimitedAccounts: false,
  },
}

/**
 * All supported chains
 */
export const supportedChains = [anvil, sepolia] as const

/**
 * Chain type with custom features
 */
export interface ChainWithFeatures extends Chain {
  features?: {
    testClient?: boolean
    instantMining?: boolean
    impersonation?: boolean
    unlimitedAccounts?: boolean
  }
}

/**
 * Get chain by ID
 */
export function getChainById(chainId: number): ChainWithFeatures | undefined {
  return supportedChains.find(chain => chain.id === chainId)
}

/**
 * Check if chain is local development chain
 */
export function isLocalChain(chainId: number): boolean {
  return chainId === anvil.id
}

/**
 * Check if chain is a testnet
 */
export function isTestnet(chainId: number): boolean {
  const chain = getChainById(chainId)
  return chain?.testnet || false
}

/**
 * Get chain features
 */
export function getChainFeatures(chainId: number) {
  const chain = getChainById(chainId) as ChainWithFeatures
  return chain?.features || {
    testClient: false,
    instantMining: false,
    impersonation: false,
    unlimitedAccounts: false,
  }
}

/**
 * Get default block explorer URL for a transaction
 */
export function getTransactionUrl(chainId: number, txHash: string): string {
  const chain = getChainById(chainId)
  if (!chain?.blockExplorers?.default?.url || chain.blockExplorers.default.url === '#') {
    return '#' // Local chain or no explorer
  }
  return `${chain.blockExplorers.default.url}/tx/${txHash}`
}

/**
 * Get default block explorer URL for an address
 */
export function getAddressUrl(chainId: number, address: string): string {
  const chain = getChainById(chainId)
  if (!chain?.blockExplorers?.default?.url || chain.blockExplorers.default.url === '#') {
    return '#' // Local chain or no explorer
  }
  return `${chain.blockExplorers.default.url}/address/${address}`
}

/**
 * Get block explorer URL for a block
 */
export function getBlockUrl(chainId: number, blockNumber: string | number): string {
  const chain = getChainById(chainId)
  if (!chain?.blockExplorers?.default?.url || chain.blockExplorers.default.url === '#') {
    return '#' // Local chain or no explorer
  }
  return `${chain.blockExplorers.default.url}/block/${blockNumber}`
}

/**
 * Network display names and colors for UI
 */
export const networkDisplayConfig = {
  [anvil.id]: {
    name: 'Anvil Local',
    shortName: 'Anvil',
    color: '#FF6B35', // Orange
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
  },
  [sepolia.id]: {
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    color: '#627EEA', // Ethereum blue
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
  },
} as const