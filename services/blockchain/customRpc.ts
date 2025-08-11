import { createPublicClient, createWalletClient, http, PublicClient, WalletClient, Chain } from 'viem'
import { privateKeyToAccount, Account } from 'viem/accounts'
import { toast } from 'react-hot-toast'

export interface CustomRpcConfig {
  id: string
  name: string
  rpcUrl: string
  wsUrl?: string
  chainId: number
  currency: {
    name: string
    symbol: string
    decimals: number
  }
  blockExplorer?: {
    name: string
    url: string
  }
  testnet: boolean
  description?: string
}

export interface CustomRpcConnection {
  config: CustomRpcConfig
  publicClient: PublicClient
  walletClient?: WalletClient
  isConnected: boolean
  lastHealthCheck: Date
  latency?: number
}

class CustomRpcService {
  private connections: Map<string, CustomRpcConnection> = new Map()
  private savedConfigs: Map<string, CustomRpcConfig> = new Map()

  constructor() {
    this.loadSavedConfigs()
  }

  private loadSavedConfigs() {
    try {
      const saved = localStorage.getItem('custom-rpc-configs')
      if (saved) {
        const configs: CustomRpcConfig[] = JSON.parse(saved)
        configs.forEach(config => {
          this.savedConfigs.set(config.id, config)
        })
      }
    } catch (error) {
      console.warn('Failed to load saved RPC configs:', error)
    }
  }

  private saveConfigs() {
    try {
      const configs = Array.from(this.savedConfigs.values())
      localStorage.setItem('custom-rpc-configs', JSON.stringify(configs))
    } catch (error) {
      console.warn('Failed to save RPC configs:', error)
    }
  }

  private createChainFromConfig(config: CustomRpcConfig): Chain {
    return {
      id: config.chainId,
      name: config.name,
      network: config.name.toLowerCase().replace(/\s+/g, '-'),
      nativeCurrency: config.currency,
      rpcUrls: {
        default: {
          http: [config.rpcUrl],
          ...(config.wsUrl && { webSocket: [config.wsUrl] })
        },
        public: {
          http: [config.rpcUrl],
          ...(config.wsUrl && { webSocket: [config.wsUrl] })
        }
      },
      ...(config.blockExplorer && {
        blockExplorers: {
          default: {
            name: config.blockExplorer.name,
            url: config.blockExplorer.url
          }
        }
      }),
      testnet: config.testnet
    }
  }

  async addCustomRpc(config: CustomRpcConfig): Promise<boolean> {
    try {
      // Validate the RPC endpoint first
      const isValid = await this.validateRpcEndpoint(config.rpcUrl, config.chainId)
      if (!isValid) {
        toast.error('Invalid RPC endpoint or chain ID mismatch')
        return false
      }

      // Save the configuration
      this.savedConfigs.set(config.id, config)
      this.saveConfigs()

      toast.success(`Custom RPC "${config.name}" added successfully`)
      return true
    } catch (error) {
      console.error('Failed to add custom RPC:', error)
      toast.error('Failed to add custom RPC')
      return false
    }
  }

  async connectToCustomRpc(configId: string, privateKey?: `0x${string}`): Promise<CustomRpcConnection | null> {
    const config = this.savedConfigs.get(configId)
    if (!config) {
      toast.error('RPC configuration not found')
      return null
    }

    try {
      const chain = this.createChainFromConfig(config)
      
      // Create public client
      const publicClient = createPublicClient({
        chain,
        transport: http(config.rpcUrl),
        batch: { multicall: true }
      })

      // Test the connection
      const startTime = Date.now()
      const blockNumber = await publicClient.getBlockNumber()
      const latency = Date.now() - startTime

      let walletClient: WalletClient | undefined

      // Create wallet client if private key is provided
      if (privateKey) {
        try {
          const account = privateKeyToAccount(privateKey)
          walletClient = createWalletClient({
            chain,
            transport: http(config.rpcUrl),
            account
          })
        } catch (error) {
          console.warn('Failed to create wallet client:', error)
        }
      }

      const connection: CustomRpcConnection = {
        config,
        publicClient,
        walletClient,
        isConnected: true,
        lastHealthCheck: new Date(),
        latency
      }

      this.connections.set(configId, connection)
      toast.success(`Connected to ${config.name} (Block: ${blockNumber})`)
      
      return connection
    } catch (error) {
      console.error('Failed to connect to custom RPC:', error)
      toast.error(`Failed to connect to ${config.name}`)
      return null
    }
  }

  async validateRpcEndpoint(rpcUrl: string, expectedChainId: number): Promise<boolean> {
    try {
      const tempClient = createPublicClient({
        transport: http(rpcUrl)
      })

      // Test basic connectivity
      const [actualChainId, blockNumber] = await Promise.all([
        tempClient.getChainId(),
        tempClient.getBlockNumber()
      ])

      // Verify chain ID matches
      if (actualChainId !== expectedChainId) {
        console.warn(`Chain ID mismatch: expected ${expectedChainId}, got ${actualChainId}`)
        return false
      }

      // Verify we can get block data
      if (blockNumber < 0) {
        console.warn('Invalid block number received')
        return false
      }

      return true
    } catch (error) {
      console.error('RPC validation failed:', error)
      return false
    }
  }

  async healthCheck(configId: string): Promise<boolean> {
    const connection = this.connections.get(configId)
    if (!connection) return false

    try {
      const startTime = Date.now()
      const blockNumber = await connection.publicClient.getBlockNumber()
      const latency = Date.now() - startTime

      connection.isConnected = true
      connection.lastHealthCheck = new Date()
      connection.latency = latency

      return blockNumber >= 0
    } catch (error) {
      console.warn(`Health check failed for ${connection.config.name}:`, error)
      connection.isConnected = false
      return false
    }
  }

  getConnection(configId: string): CustomRpcConnection | null {
    return this.connections.get(configId) || null
  }

  getAllConnections(): CustomRpcConnection[] {
    return Array.from(this.connections.values())
  }

  getSavedConfigs(): CustomRpcConfig[] {
    return Array.from(this.savedConfigs.values())
  }

  removeConfig(configId: string): boolean {
    try {
      // Disconnect if connected
      this.disconnect(configId)
      
      // Remove from saved configs
      this.savedConfigs.delete(configId)
      this.saveConfigs()
      
      toast.success('Custom RPC configuration removed')
      return true
    } catch (error) {
      console.error('Failed to remove config:', error)
      toast.error('Failed to remove configuration')
      return false
    }
  }

  disconnect(configId: string): void {
    const connection = this.connections.get(configId)
    if (connection) {
      connection.isConnected = false
      this.connections.delete(configId)
      toast.success(`Disconnected from ${connection.config.name}`)
    }
  }

  disconnectAll(): void {
    this.connections.forEach(connection => {
      connection.isConnected = false
    })
    this.connections.clear()
    toast.success('Disconnected from all custom RPC endpoints')
  }

  // Predefined popular RPC configurations
  getPopularConfigs(): CustomRpcConfig[] {
    return [
      {
        id: 'polygon-mainnet',
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        chainId: 137,
        currency: { name: 'Matic', symbol: 'MATIC', decimals: 18 },
        blockExplorer: { name: 'PolygonScan', url: 'https://polygonscan.com' },
        testnet: false,
        description: 'Polygon (formerly Matic) mainnet'
      },
      {
        id: 'polygon-mumbai',
        name: 'Polygon Mumbai Testnet',
        rpcUrl: 'https://rpc-mumbai.maticvigil.com',
        chainId: 80001,
        currency: { name: 'Matic', symbol: 'MATIC', decimals: 18 },
        blockExplorer: { name: 'Mumbai PolygonScan', url: 'https://mumbai.polygonscan.com' },
        testnet: true,
        description: 'Polygon Mumbai testnet'
      },
      {
        id: 'bsc-mainnet',
        name: 'Binance Smart Chain',
        rpcUrl: 'https://bsc-dataseed1.binance.org',
        chainId: 56,
        currency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        blockExplorer: { name: 'BscScan', url: 'https://bscscan.com' },
        testnet: false,
        description: 'Binance Smart Chain mainnet'
      },
      {
        id: 'avalanche-mainnet',
        name: 'Avalanche C-Chain',
        rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
        chainId: 43114,
        currency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
        blockExplorer: { name: 'SnowTrace', url: 'https://snowtrace.io' },
        testnet: false,
        description: 'Avalanche C-Chain mainnet'
      },
      {
        id: 'arbitrum-mainnet',
        name: 'Arbitrum One',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        chainId: 42161,
        currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorer: { name: 'Arbiscan', url: 'https://arbiscan.io' },
        testnet: false,
        description: 'Arbitrum One mainnet'
      }
    ]
  }
}

export const customRpcService = new CustomRpcService()
export default customRpcService