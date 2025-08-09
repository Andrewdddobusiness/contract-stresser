import type { Address, Hash } from 'viem'
import type {
  ContractMetadata,
  ContractRegistry,
  ContractSearchFilters,
  ContractSearchResult,
  ContractStats,
  ImportContractParams,
  ContractImportResult,
  ContractInteraction,
  NetworkConfig,
} from '@/types/contracts'
import { createPublicClientForChain } from '@/services/blockchain/clients'
import { anvil, sepolia } from '@/services/blockchain/chains'

// Storage keys
const CONTRACTS_KEY = 'contract-registry'
const INTERACTIONS_KEY = 'contract-interactions'
const REGISTRY_VERSION = '1.0.0'

// Network configurations
const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  local: {
    id: 'local',
    name: 'Local Anvil',
    chainId: anvil.id,
    rpcUrl: 'http://localhost:8545',
    explorerUrl: undefined,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    isTestnet: true,
    color: '#627EEA',
  },
  sepolia: {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    chainId: sepolia.id,
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || '',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    isTestnet: true,
    color: '#627EEA',
  },
}

/**
 * Contract Storage Service
 * Provides comprehensive contract management functionality
 */
export class ContractStorageService {
  private static instance: ContractStorageService
  private registry: ContractRegistry

  private constructor() {
    this.registry = this.loadRegistry()
  }

  public static getInstance(): ContractStorageService {
    if (!ContractStorageService.instance) {
      ContractStorageService.instance = new ContractStorageService()
    }
    return ContractStorageService.instance
  }

  // Registry management
  private loadRegistry(): ContractRegistry {
    try {
      const stored = localStorage.getItem(CONTRACTS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          contracts: parsed.contracts.map((contract: any) => ({
            ...contract,
            deployedAt: new Date(contract.deployedAt),
          })),
          lastUpdated: new Date(parsed.lastUpdated),
          version: parsed.version || REGISTRY_VERSION,
        }
      }
    } catch (error) {
      console.error('Failed to load contract registry:', error)
    }

    return {
      contracts: [],
      lastUpdated: new Date(),
      version: REGISTRY_VERSION,
    }
  }

  private saveRegistry(): void {
    try {
      localStorage.setItem(CONTRACTS_KEY, JSON.stringify(this.registry))
    } catch (error) {
      console.error('Failed to save contract registry:', error)
    }
  }

  // Contract management
  public addContract(contract: ContractMetadata): void {
    const existingIndex = this.registry.contracts.findIndex(
      c => c.address.toLowerCase() === contract.address.toLowerCase() && c.network === contract.network
    )

    if (existingIndex >= 0) {
      this.registry.contracts[existingIndex] = contract
    } else {
      this.registry.contracts.push(contract)
    }

    this.registry.lastUpdated = new Date()
    this.saveRegistry()
  }

  public getContract(address: Address, network: string): ContractMetadata | undefined {
    return this.registry.contracts.find(
      c => c.address.toLowerCase() === address.toLowerCase() && c.network === network
    )
  }

  public getAllContracts(): ContractMetadata[] {
    return [...this.registry.contracts].sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime())
  }

  public removeContract(address: Address, network: string): boolean {
    const initialLength = this.registry.contracts.length
    this.registry.contracts = this.registry.contracts.filter(
      c => !(c.address.toLowerCase() === address.toLowerCase() && c.network === network)
    )

    if (this.registry.contracts.length < initialLength) {
      this.registry.lastUpdated = new Date()
      this.saveRegistry()
      return true
    }
    return false
  }

  public updateContract(address: Address, network: string, updates: Partial<ContractMetadata>): boolean {
    const contractIndex = this.registry.contracts.findIndex(
      c => c.address.toLowerCase() === address.toLowerCase() && c.network === network
    )

    if (contractIndex >= 0) {
      this.registry.contracts[contractIndex] = {
        ...this.registry.contracts[contractIndex],
        ...updates,
      }
      this.registry.lastUpdated = new Date()
      this.saveRegistry()
      return true
    }
    return false
  }

  // Search and filtering
  public searchContracts(filters: ContractSearchFilters, page = 1, pageSize = 10): ContractSearchResult {
    let filtered = this.registry.contracts

    if (filters.network) {
      filtered = filtered.filter(c => c.network === filters.network)
    }

    if (filters.name) {
      const nameFilter = filters.name.toLowerCase()
      filtered = filtered.filter(c => c.name.toLowerCase().includes(nameFilter))
    }

    if (filters.symbol) {
      const symbolFilter = filters.symbol.toLowerCase()
      filtered = filtered.filter(c => c.symbol.toLowerCase().includes(symbolFilter))
    }

    if (filters.deployerAddress) {
      filtered = filtered.filter(
        c => c.deployerAddress.toLowerCase() === filters.deployerAddress!.toLowerCase()
      )
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(c => c.deployedAt >= filters.dateFrom!)
    }

    if (filters.dateTo) {
      filtered = filtered.filter(c => c.deployedAt <= filters.dateTo!)
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(c => 
        c.tags && filters.tags!.some(tag => c.tags!.includes(tag))
      )
    }

    if (filters.verified !== undefined) {
      filtered = filtered.filter(c => c.verified === filters.verified)
    }

    // Sort by deployment date (newest first)
    filtered.sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime())

    const totalCount = filtered.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedResults = filtered.slice(startIndex, endIndex)

    return {
      contracts: paginatedResults,
      totalCount,
      page,
      pageSize,
    }
  }

  // Statistics
  public getContractStats(): ContractStats {
    const contracts = this.registry.contracts
    const totalContracts = contracts.length

    const contractsByNetwork = contracts.reduce((acc, contract) => {
      acc[contract.network] = (acc[contract.network] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentDeployments = contracts.filter(c => c.deployedAt >= thirtyDaysAgo).length

    const totalGasUsed = contracts.reduce((acc, contract) => acc + (contract.gasUsed || BigInt(0)), BigInt(0))
    const totalDeploymentCost = contracts.reduce((acc, contract) => acc + (contract.deploymentCost || BigInt(0)), BigInt(0))
    
    const gasUsedContracts = contracts.filter(c => c.gasUsed)
    const averageGasPrice = gasUsedContracts.length > 0 
      ? gasUsedContracts.reduce((acc, contract) => {
          const gasPrice = contract.deploymentCost && contract.gasUsed 
            ? contract.deploymentCost / contract.gasUsed 
            : BigInt(0)
          return acc + gasPrice
        }, BigInt(0)) / BigInt(gasUsedContracts.length)
      : BigInt(0)

    const mostUsedNetworks = Object.entries(contractsByNetwork)
      .map(([network, count]) => ({ network, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Deployment trends (last 30 days)
    const deploymentTrends: Array<{ date: string; count: number }> = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const count = contracts.filter(contract => {
        const contractDate = contract.deployedAt.toISOString().split('T')[0]
        return contractDate === dateStr
      }).length

      deploymentTrends.push({ date: dateStr, count })
    }

    return {
      totalContracts,
      contractsByNetwork,
      recentDeployments,
      totalGasUsed,
      totalDeploymentCost,
      averageGasPrice,
      mostUsedNetworks,
      deploymentTrends,
    }
  }

  // Import contracts
  public async importContract(params: ImportContractParams): Promise<ContractImportResult> {
    try {
      const networkConfig = NETWORK_CONFIGS[params.network]
      if (!networkConfig) {
        return {
          success: false,
          error: `Unsupported network: ${params.network}`,
        }
      }

      const publicClient = createPublicClientForChain(networkConfig.chainId)
      
      // Check if contract exists
      const bytecode = await publicClient.getBytecode({ address: params.address })
      if (!bytecode || bytecode === '0x') {
        return {
          success: false,
          error: 'No contract found at the specified address',
        }
      }

      // Check if already exists in registry
      const existingContract = this.getContract(params.address, params.network)
      if (existingContract) {
        return {
          success: false,
          error: 'Contract already exists in registry',
        }
      }

      // Try to get contract name and symbol if it's an ERC-20
      let name = params.name || 'Imported Contract'
      let symbol = params.symbol || 'UNKNOWN'
      let decimals = 18

      if (!params.name || !params.symbol) {
        try {
          // Standard ERC-20 ABI for name, symbol, decimals
          const erc20Abi = [
            {
              type: 'function',
              name: 'name',
              inputs: [],
              outputs: [{ type: 'string', name: '' }],
              stateMutability: 'view',
            },
            {
              type: 'function',
              name: 'symbol',
              inputs: [],
              outputs: [{ type: 'string', name: '' }],
              stateMutability: 'view',
            },
            {
              type: 'function',
              name: 'decimals',
              inputs: [],
              outputs: [{ type: 'uint8', name: '' }],
              stateMutability: 'view',
            },
          ] as const

          const [contractName, contractSymbol, contractDecimals] = await Promise.allSettled([
            publicClient.readContract({
              address: params.address,
              abi: erc20Abi,
              functionName: 'name',
            }),
            publicClient.readContract({
              address: params.address,
              abi: erc20Abi,
              functionName: 'symbol',
            }),
            publicClient.readContract({
              address: params.address,
              abi: erc20Abi,
              functionName: 'decimals',
            }),
          ])

          if (contractName.status === 'fulfilled') name = contractName.value as string
          if (contractSymbol.status === 'fulfilled') symbol = contractSymbol.value as string
          if (contractDecimals.status === 'fulfilled') decimals = Number(contractDecimals.value)
        } catch (error) {
          // Not an ERC-20 or failed to read, use provided values or defaults
        }
      }

      const contract: ContractMetadata = {
        id: crypto.randomUUID(),
        name,
        symbol,
        address: params.address,
        network: params.network,
        chainId: networkConfig.chainId,
        decimals,
        totalSupply: '0', // Unknown for imported contracts
        deployedAt: new Date(), // Use current date since we don't know the actual deployment date
        deployerAddress: '0x0000000000000000000000000000000000000000' as Address, // Unknown
        txHash: '0x0000000000000000000000000000000000000000000000000000000000000000' as Hash, // Unknown
        verified: false,
        tags: ['imported'],
      }

      this.addContract(contract)

      return {
        success: true,
        contract,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  // Contract interactions tracking
  public addInteraction(interaction: ContractInteraction): void {
    try {
      const stored = localStorage.getItem(INTERACTIONS_KEY)
      const interactions: ContractInteraction[] = stored ? JSON.parse(stored) : []
      
      interactions.unshift({
        ...interaction,
        timestamp: new Date(interaction.timestamp),
      })

      // Keep only last 1000 interactions to prevent storage bloat
      const trimmed = interactions.slice(0, 1000)
      localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(trimmed))
    } catch (error) {
      console.error('Failed to save contract interaction:', error)
    }
  }

  public getInteractions(contractAddress?: Address, limit = 50): ContractInteraction[] {
    try {
      const stored = localStorage.getItem(INTERACTIONS_KEY)
      if (!stored) return []

      const interactions: ContractInteraction[] = JSON.parse(stored).map((interaction: any) => ({
        ...interaction,
        timestamp: new Date(interaction.timestamp),
      }))

      let filtered = interactions
      if (contractAddress) {
        filtered = interactions.filter(
          i => i.contractAddress.toLowerCase() === contractAddress.toLowerCase()
        )
      }

      return filtered.slice(0, limit)
    } catch (error) {
      console.error('Failed to load contract interactions:', error)
      return []
    }
  }

  // Clear all data
  public clearAllData(): void {
    try {
      localStorage.removeItem(CONTRACTS_KEY)
      localStorage.removeItem(INTERACTIONS_KEY)
      this.registry = {
        contracts: [],
        lastUpdated: new Date(),
        version: REGISTRY_VERSION,
      }
    } catch (error) {
      console.error('Failed to clear contract data:', error)
    }
  }

  // Export/Import registry
  public exportRegistry(): string {
    return JSON.stringify(this.registry, null, 2)
  }

  public importRegistry(data: string): { success: boolean; error?: string } {
    try {
      const imported = JSON.parse(data)
      
      // Validate structure
      if (!imported.contracts || !Array.isArray(imported.contracts)) {
        return { success: false, error: 'Invalid registry format' }
      }

      this.registry = {
        contracts: imported.contracts.map((contract: any) => ({
          ...contract,
          deployedAt: new Date(contract.deployedAt),
        })),
        lastUpdated: new Date(),
        version: imported.version || REGISTRY_VERSION,
      }

      this.saveRegistry()
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to import registry' 
      }
    }
  }

  // Network configurations
  public getNetworkConfig(networkId: string): NetworkConfig | undefined {
    return NETWORK_CONFIGS[networkId]
  }

  public getAllNetworks(): NetworkConfig[] {
    return Object.values(NETWORK_CONFIGS)
  }
}

// Singleton instance
export const contractStorage = ContractStorageService.getInstance()

// Convenience functions
export const addContract = (contract: ContractMetadata) => contractStorage.addContract(contract)
export const getContract = (address: Address, network: string) => contractStorage.getContract(address, network)
export const getAllContracts = () => contractStorage.getAllContracts()
export const removeContract = (address: Address, network: string) => contractStorage.removeContract(address, network)
export const searchContracts = (filters: ContractSearchFilters, page?: number, pageSize?: number) => 
  contractStorage.searchContracts(filters, page, pageSize)
export const getContractStats = () => contractStorage.getContractStats()
export const importContract = (params: ImportContractParams) => contractStorage.importContract(params)
export const addContractInteraction = (interaction: ContractInteraction) => contractStorage.addInteraction(interaction)
export const getContractInteractions = (contractAddress?: Address, limit?: number) => 
  contractStorage.getInteractions(contractAddress, limit)