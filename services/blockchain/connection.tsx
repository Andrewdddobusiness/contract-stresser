'use client'

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { PublicClient, WalletClient, TestClient } from 'viem'
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi'
import { createBlockchainClients, checkConnection, getNetworkInfo } from './clients'
import { anvil, isLocalChain, getChainFeatures } from './chains'
import { SupportedChainId } from '@/lib/wagmi'

export interface NetworkInfo {
  blockNumber: bigint
  gasPrice: bigint
  chainId: number
  connected: boolean
  error?: string
}

export interface ConnectionState {
  currentChainId: SupportedChainId
  isConnected: boolean
  isConnecting: boolean
  publicClient: PublicClient | null
  walletClient: WalletClient | null
  testClient: TestClient | null
  wsClient: PublicClient | null
  networkInfo: NetworkInfo | null
  error: string | null
  features: {
    testClient: boolean
    instantMining: boolean
    impersonation: boolean
    unlimitedAccounts: boolean
  }
}

type ConnectionAction =
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'SET_CHAIN'; payload: SupportedChainId }
  | { type: 'SET_CLIENTS'; payload: { publicClient: PublicClient | null; walletClient: WalletClient | null; testClient: TestClient | null; wsClient: PublicClient | null } }
  | { type: 'SET_NETWORK_INFO'; payload: NetworkInfo }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTED'; payload: boolean }

const initialState: ConnectionState = {
  currentChainId: anvil.id,
  isConnected: false,
  isConnecting: false,
  publicClient: null,
  walletClient: null,
  testClient: null,
  wsClient: null,
  networkInfo: null,
  error: null,
  features: {
    testClient: false,
    instantMining: false,
    impersonation: false,
    unlimitedAccounts: false,
  },
}

function connectionReducer(state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload, error: action.payload ? null : state.error }
    case 'SET_CHAIN':
      const chainFeatures = getChainFeatures(action.payload)
      return {
        ...state,
        currentChainId: action.payload,
        features: {
          testClient: chainFeatures.testClient || false,
          instantMining: chainFeatures.instantMining || false,
          impersonation: chainFeatures.impersonation || false,
          unlimitedAccounts: chainFeatures.unlimitedAccounts || false,
        },
      }
    case 'SET_CLIENTS':
      return {
        ...state,
        publicClient: action.payload.publicClient,
        walletClient: action.payload.walletClient,
        testClient: action.payload.testClient,
        wsClient: action.payload.wsClient,
      }
    case 'SET_NETWORK_INFO':
      return {
        ...state,
        networkInfo: action.payload,
        isConnected: action.payload.connected,
      }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isConnecting: false }
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload }
    default:
      return state
  }
}

interface ConnectionContextType {
  state: ConnectionState
  switchChain: (chainId: SupportedChainId) => Promise<void>
  refreshConnection: () => Promise<void>
  refreshNetworkInfo: () => Promise<void>
}

const ConnectionContext = createContext<ConnectionContextType | null>(null)

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(connectionReducer, initialState)
  const account = useAccount()
  const chainId = useChainId() as SupportedChainId
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const switchChain = async (newChainId: SupportedChainId) => {
    dispatch({ type: 'SET_CONNECTING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      dispatch({ type: 'SET_CHAIN', payload: newChainId })
      
      const clients = createBlockchainClients(newChainId)
      dispatch({ 
        type: 'SET_CLIENTS', 
        payload: {
          publicClient: clients.publicClient,
          walletClient: clients.walletClient || null,
          testClient: clients.testClient || null,
          wsClient: clients.wsClient || null,
        }
      })

      const isConnected = await checkConnection(newChainId)
      dispatch({ type: 'SET_CONNECTED', payload: isConnected })

      if (isConnected) {
        const networkInfo = await getNetworkInfo(newChainId)
        dispatch({ type: 'SET_NETWORK_INFO', payload: networkInfo })
      } else {
        dispatch({ type: 'SET_ERROR', payload: `Failed to connect to ${newChainId === anvil.id ? 'Anvil' : 'Sepolia'}` })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      dispatch({ type: 'SET_ERROR', payload: message })
    } finally {
      dispatch({ type: 'SET_CONNECTING', payload: false })
    }
  }

  const refreshConnection = async () => {
    dispatch({ type: 'SET_CONNECTING', payload: true })
    
    try {
      const isConnected = await checkConnection(state.currentChainId)
      dispatch({ type: 'SET_CONNECTED', payload: isConnected })
      
      if (isConnected) {
        await refreshNetworkInfo()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection refresh failed'
      dispatch({ type: 'SET_ERROR', payload: message })
    } finally {
      dispatch({ type: 'SET_CONNECTING', payload: false })
    }
  }

  const refreshNetworkInfo = async () => {
    try {
      const networkInfo = await getNetworkInfo(state.currentChainId)
      dispatch({ type: 'SET_NETWORK_INFO', payload: networkInfo })
    } catch (error) {
      console.error('Failed to refresh network info:', error)
    }
  }

  useEffect(() => {
    if (chainId && chainId !== state.currentChainId) {
      dispatch({ type: 'SET_CHAIN', payload: chainId })
    }
  }, [chainId, state.currentChainId])

  useEffect(() => {
    dispatch({
      type: 'SET_CLIENTS',
      payload: {
        publicClient: publicClient || null,
        walletClient: walletClient || null,
        testClient: state.testClient,
        wsClient: state.wsClient,
      },
    })
  }, [publicClient, walletClient, state.testClient, state.wsClient])

  useEffect(() => {
    const hasClients = !!state.publicClient
    dispatch({ type: 'SET_CONNECTED', payload: hasClients })
  }, [account.isConnected, state.publicClient])

  useEffect(() => {
    if (state.isConnected && state.publicClient) {
      refreshNetworkInfo()
      
      const interval = setInterval(refreshNetworkInfo, 10000)
      return () => clearInterval(interval)
    }
  }, [state.isConnected, state.publicClient, state.currentChainId])

  const contextValue = {
    state,
    switchChain,
    refreshConnection,
    refreshNetworkInfo,
  }

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection() {
  const context = useContext(ConnectionContext)
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider')
  }
  return context
}

export function useCurrentChain() {
  const { state } = useConnection()
  return state.currentChainId
}

export function useNetworkInfo() {
  const { state } = useConnection()
  return state.networkInfo
}

export function useChainFeatures() {
  const { state } = useConnection()
  return state.features
}

export function useIsLocalChain() {
  const { state } = useConnection()
  return isLocalChain(state.currentChainId)
}