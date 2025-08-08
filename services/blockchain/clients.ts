import { createPublicClient, createWalletClient, createTestClient, http, webSocket, PublicClient, WalletClient, TestClient, Account, Chain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { anvil, sepolia } from './chains'
import { SupportedChainId } from '@/lib/wagmi'

// Environment variables
const ANVIL_RPC_URL = process.env.NEXT_PUBLIC_ANVIL_RPC_URL || 'http://localhost:8545'
const SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL
const ANVIL_PRIVATE_KEY = process.env.ANVIL_PRIVATE_KEY as `0x${string}`

// WebSocket URLs for real-time updates
const ANVIL_WS_URL = ANVIL_RPC_URL.replace('http', 'ws')

interface BlockchainClients {
  publicClient: PublicClient
  walletClient?: WalletClient
  testClient?: TestClient
  wsClient?: PublicClient
}

/**
 * Create public client for reading blockchain data
 */
export function createPublicClientForChain(chainId: SupportedChainId): PublicClient {
  const chain = getChainById(chainId)
  const rpcUrl = getRpcUrl(chainId)
  
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
    batch: {
      multicall: true,
    },
  })
}

/**
 * Create WebSocket client for real-time updates
 */
export function createWebSocketClient(chainId: SupportedChainId): PublicClient | null {
  try {
    const chain = getChainById(chainId)
    
    // Only create WebSocket client for local Anvil
    if (chainId === anvil.id) {
      return createPublicClient({
        chain,
        transport: webSocket(ANVIL_WS_URL),
        batch: {
          multicall: true,
        },
      })
    }
    
    // For other chains, return null (could implement with Alchemy/Infura WebSocket later)
    return null
  } catch (error) {
    console.warn(`Failed to create WebSocket client for chain ${chainId}:`, error)
    return null
  }
}

/**
 * Create wallet client for signing transactions
 */
export function createWalletClientForChain(
  chainId: SupportedChainId,
  account?: Account
): WalletClient {
  const chain = getChainById(chainId)
  const rpcUrl = getRpcUrl(chainId)
  
  return createWalletClient({
    chain,
    transport: http(rpcUrl),
    account,
  })
}

/**
 * Create test client for advanced testing operations (Anvil only)
 */
export function createTestClientForChain(chainId: SupportedChainId): TestClient | null {
  if (chainId !== anvil.id) {
    return null // Test client only for local chains
  }
  
  const chain = getChainById(chainId)
  const rpcUrl = getRpcUrl(chainId)
  
  return createTestClient({
    chain,
    transport: http(rpcUrl),
    mode: 'anvil',
  })
}

/**
 * Get default account for local testing (Anvil)
 */
export function getDefaultLocalAccount(): Account | null {
  if (!ANVIL_PRIVATE_KEY) {
    console.warn('ANVIL_PRIVATE_KEY not set, cannot create default local account')
    return null
  }
  
  try {
    return privateKeyToAccount(ANVIL_PRIVATE_KEY)
  } catch (error) {
    console.error('Failed to create local account:', error)
    return null
  }
}

/**
 * Create complete blockchain client setup for a chain
 */
export function createBlockchainClients(chainId: SupportedChainId): BlockchainClients {
  const publicClient = createPublicClientForChain(chainId)
  const wsClient = createWebSocketClient(chainId)
  const testClient = createTestClientForChain(chainId)
  
  let walletClient: WalletClient | undefined
  
  // For local Anvil, create wallet client with default account
  if (chainId === anvil.id) {
    const defaultAccount = getDefaultLocalAccount()
    if (defaultAccount) {
      walletClient = createWalletClientForChain(chainId, defaultAccount)
    }
  }
  
  return {
    publicClient,
    walletClient,
    testClient: testClient || undefined,
    wsClient: wsClient || undefined,
  }
}

/**
 * Utility functions
 */
function getChainById(chainId: SupportedChainId): Chain {
  switch (chainId) {
    case anvil.id:
      return anvil
    case sepolia.id:
      return sepolia
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`)
  }
}

function getRpcUrl(chainId: SupportedChainId): string {
  switch (chainId) {
    case anvil.id:
      return ANVIL_RPC_URL
    case sepolia.id:
      if (!SEPOLIA_RPC_URL) {
        throw new Error('SEPOLIA_RPC_URL not configured')
      }
      return SEPOLIA_RPC_URL
    default:
      throw new Error(`No RPC URL configured for chain ID: ${chainId}`)
  }
}

/**
 * Connection health check
 */
export async function checkConnection(chainId: SupportedChainId): Promise<boolean> {
  try {
    const client = createPublicClientForChain(chainId)
    const blockNumber = await client.getBlockNumber()
    return blockNumber >= 0
  } catch (error) {
    console.error(`Connection check failed for chain ${chainId}:`, error)
    return false
  }
}

/**
 * Get network information
 */
export async function getNetworkInfo(chainId: SupportedChainId) {
  const client = createPublicClientForChain(chainId)
  
  try {
    const [blockNumber, gasPrice, chainIdFromNetwork] = await Promise.all([
      client.getBlockNumber(),
      client.getGasPrice().catch(() => BigInt(0)),
      client.getChainId(),
    ])
    
    return {
      blockNumber,
      gasPrice,
      chainId: chainIdFromNetwork,
      connected: true,
    }
  } catch (error) {
    console.error(`Failed to get network info for chain ${chainId}:`, error)
    return {
      blockNumber: BigInt(0),
      gasPrice: BigInt(0),
      chainId: chainId,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}