import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  type Address,
  type Hash,
  type WalletClient,
  type PublicClient,
  type Chain
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { anvil, sepolia } from '../blockchain/chains'
import type { AccountInfo } from '@/types/testing'

export interface AccountGenerationOptions {
  count: number
  fundingAmount: string // ETH amount
  network: 'local' | 'sepolia'
  namePrefix?: string
}

export interface AccountFundingRequest {
  accounts: Address[]
  amount: bigint
  network: 'local' | 'sepolia'
}

export interface AccountBalanceInfo {
  address: Address
  balance: bigint
  balanceFormatted: string
  nonce: number
  isActive: boolean
  lastActivity?: Date
}

export interface AccountRotationStrategy {
  type: 'round-robin' | 'random' | 'balance-weighted' | 'least-used'
  accounts: AccountInfo[]
  currentIndex: number
}

/**
 * Multi-Account Management Service for Stress Testing
 * Handles account generation, funding, rotation, and monitoring
 */
export class AccountManager {
  private publicClient: PublicClient | null = null
  private funderClient: WalletClient | null = null
  private accounts: Map<Address, AccountInfo> = new Map()
  private walletClients: Map<Address, WalletClient> = new Map()
  private accountUsage: Map<Address, number> = new Map()
  private rotationIndex = 0
  private network: 'local' | 'sepolia' = 'local'
  private chain: Chain = anvil

  constructor() {
    // Initialize with local network by default
    this.setupNetwork('local')
  }

  /**
   * Setup network configuration
   */
  async setupNetwork(network: 'local' | 'sepolia'): Promise<void> {
    this.network = network
    this.chain = network === 'local' ? anvil : sepolia
    
    const rpcUrl = network === 'local' 
      ? 'http://localhost:8545' 
      : sepolia.rpcUrls.default.http[0]

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(rpcUrl)
    })

    // Setup funder client for local network
    if (network === 'local') {
      await this.setupFunderClient()
    }

    // Verify connection
    try {
      await this.publicClient.getBlockNumber()
      console.log(`Connected to ${network} network`)
    } catch (error) {
      throw new Error(`Failed to connect to ${network} network: ${error}`)
    }
  }

  /**
   * Setup funder client using Anvil's default account
   */
  private async setupFunderClient(): Promise<void> {
    if (this.network !== 'local') return

    // Use Anvil's first default account as funder
    const defaultPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    const funderAccount = privateKeyToAccount(defaultPrivateKey)

    this.funderClient = createWalletClient({
      account: funderAccount,
      chain: this.chain,
      transport: http('http://localhost:8545')
    })

    // Verify funder has funds
    if (this.publicClient) {
      const balance = await this.publicClient.getBalance({ 
        address: funderAccount.address 
      })
      
      if (balance < parseEther('1000')) {
        console.warn('Funder account has low balance:', formatEther(balance), 'ETH')
      } else {
        console.log('Funder account loaded with', formatEther(balance), 'ETH')
      }
    }
  }

  /**
   * Generate multiple test accounts
   */
  async generateAccounts(options: AccountGenerationOptions): Promise<AccountInfo[]> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized')
    }

    await this.setupNetwork(options.network)
    
    const accounts: AccountInfo[] = []
    const fundingAmount = parseEther(options.fundingAmount)

    console.log(`Generating ${options.count} accounts with ${options.fundingAmount} ETH each...`)

    for (let i = 0; i < options.count; i++) {
      // Generate secure random private key
      const privateKey = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}` as `0x${string}`
      const account = privateKeyToAccount(privateKey)

      // Create wallet client for this account
      const walletClient = createWalletClient({
        account,
        chain: this.chain,
        transport: http(this.network === 'local' ? 'http://localhost:8545' : sepolia.rpcUrls.default.http[0])
      })

      // Get initial state
      const balance = await this.publicClient.getBalance({ address: account.address })
      const nonce = await this.publicClient.getTransactionCount({ address: account.address })

      const accountInfo: AccountInfo = {
        address: account.address,
        privateKey,
        balance,
        nonce,
        isActive: true,
        transactionCount: 0,
        lastUsed: new Date()
      }

      // Store account information
      this.accounts.set(account.address, accountInfo)
      this.walletClients.set(account.address, walletClient)
      this.accountUsage.set(account.address, 0)

      accounts.push(accountInfo)
      
      console.log(`Generated account ${i + 1}/${options.count}: ${account.address.slice(0, 10)}...`)
    }

    // Fund all accounts if funding amount > 0
    if (fundingAmount > 0) {
      await this.fundAccounts({
        accounts: accounts.map(a => a.address),
        amount: fundingAmount,
        network: options.network
      })
    }

    console.log(`Successfully generated ${accounts.length} test accounts`)
    return accounts
  }

  /**
   * Fund multiple accounts
   */
  async fundAccounts(request: AccountFundingRequest): Promise<Hash[]> {
    if (request.network === 'sepolia') {
      throw new Error('Automatic funding not supported on Sepolia. Please fund accounts manually.')
    }

    if (!this.funderClient || !this.publicClient) {
      throw new Error('Funder client not initialized')
    }

    console.log(`Funding ${request.accounts.length} accounts with ${formatEther(request.amount)} ETH each...`)

    const transactions: Hash[] = []
    const batchSize = 10 // Process in batches to avoid overwhelming the network

    for (let i = 0; i < request.accounts.length; i += batchSize) {
      const batch = request.accounts.slice(i, i + batchSize)
      
      // Send funding transactions in parallel for this batch
      const batchPromises = batch.map(async (accountAddress, index) => {
        try {
          const nonce = await this.publicClient!.getTransactionCount({ 
            address: this.funderClient!.account!.address 
          })

          const hash = await this.funderClient!.sendTransaction({
            account: this.funderClient!.account!,
            to: accountAddress,
            value: request.amount,
            nonce: nonce + index, // Increment nonce for each transaction
            chain: this.chain
          })

          console.log(`Funded ${accountAddress.slice(0, 10)}... with ${formatEther(request.amount)} ETH`)
          return hash
        } catch (error) {
          console.error(`Failed to fund ${accountAddress}:`, error)
          throw error
        }
      })

      const batchResults = await Promise.all(batchPromises)
      transactions.push(...batchResults)

      // Wait for batch confirmations before proceeding
      await Promise.all(
        batchResults.map(hash => 
          this.publicClient!.waitForTransactionReceipt({ hash, timeout: 30000 })
        )
      )

      console.log(`Completed funding batch ${Math.ceil((i + batchSize) / batchSize)}/${Math.ceil(request.accounts.length / batchSize)}`)
    }

    // Update account balances
    await this.updateAccountBalances(request.accounts)

    console.log(`Successfully funded ${request.accounts.length} accounts`)
    return transactions
  }

  /**
   * Update account balances
   */
  async updateAccountBalances(addresses?: Address[]): Promise<void> {
    if (!this.publicClient) return

    const accountsToUpdate = addresses || Array.from(this.accounts.keys())

    await Promise.all(
      accountsToUpdate.map(async (address) => {
        const account = this.accounts.get(address)
        if (account) {
          try {
            const balance = await this.publicClient!.getBalance({ address })
            const nonce = await this.publicClient!.getTransactionCount({ address })
            
            account.balance = balance
            account.nonce = nonce
            this.accounts.set(address, account)
          } catch (error) {
            console.error(`Failed to update balance for ${address}:`, error)
          }
        }
      })
    )
  }

  /**
   * Get account rotation strategy
   */
  createRotationStrategy(
    accounts: AccountInfo[], 
    type: AccountRotationStrategy['type'] = 'round-robin'
  ): AccountRotationStrategy {
    return {
      type,
      accounts: accounts.filter(acc => acc.isActive),
      currentIndex: 0
    }
  }

  /**
   * Get next account using rotation strategy
   */
  getNextAccount(strategy: AccountRotationStrategy): AccountInfo | null {
    if (strategy.accounts.length === 0) return null

    let selectedAccount: AccountInfo

    switch (strategy.type) {
      case 'round-robin':
        selectedAccount = strategy.accounts[strategy.currentIndex % strategy.accounts.length]
        strategy.currentIndex = (strategy.currentIndex + 1) % strategy.accounts.length
        break

      case 'random':
        const randomIndex = Math.floor(Math.random() * strategy.accounts.length)
        selectedAccount = strategy.accounts[randomIndex]
        break

      case 'balance-weighted':
        // Select account with highest balance
        selectedAccount = strategy.accounts.reduce((highest, current) => 
          current.balance > highest.balance ? current : highest
        )
        break

      case 'least-used':
        // Select account with lowest usage count
        selectedAccount = strategy.accounts.reduce((leastUsed, current) => {
          const currentUsage = this.accountUsage.get(current.address) || 0
          const leastUsedUsage = this.accountUsage.get(leastUsed.address) || 0
          return currentUsage < leastUsedUsage ? current : leastUsed
        })
        break

      default:
        selectedAccount = strategy.accounts[0]
    }

    // Update usage statistics
    const currentUsage = this.accountUsage.get(selectedAccount.address) || 0
    this.accountUsage.set(selectedAccount.address, currentUsage + 1)
    selectedAccount.lastUsed = new Date()

    return selectedAccount
  }

  /**
   * Get all account balance information
   */
  async getAllAccountBalances(): Promise<AccountBalanceInfo[]> {
    if (!this.publicClient) return []

    await this.updateAccountBalances()

    return Array.from(this.accounts.values()).map(account => ({
      address: account.address,
      balance: account.balance,
      balanceFormatted: formatEther(account.balance),
      nonce: account.nonce,
      isActive: account.isActive,
      lastActivity: account.lastUsed
    }))
  }

  /**
   * Monitor account activity in real-time
   */
  async startAccountMonitoring(
    callback: (balances: AccountBalanceInfo[]) => void,
    intervalMs: number = 5000
  ): Promise<() => void> {
    let isMonitoring = true

    const monitor = async () => {
      while (isMonitoring) {
        try {
          const balances = await this.getAllAccountBalances()
          callback(balances)
        } catch (error) {
          console.error('Account monitoring error:', error)
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs))
      }
    }

    // Start monitoring in background
    monitor()

    // Return cleanup function
    return () => {
      isMonitoring = false
    }
  }

  /**
   * Handle account impersonation for Anvil
   */
  async impersonateAccount(address: Address): Promise<WalletClient> {
    if (this.network !== 'local') {
      throw new Error('Account impersonation only supported on local Anvil network')
    }

    if (!this.publicClient) {
      throw new Error('Public client not initialized')
    }

    // For Anvil, we can impersonate any account using anvil_impersonateAccount
    try {
      // Enable impersonation
      await fetch('http://localhost:8545', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'anvil_impersonateAccount',
          params: [address],
          id: 1
        })
      })

      // Create wallet client for impersonated account
      const walletClient = createWalletClient({
        account: address,
        chain: this.chain,
        transport: http('http://localhost:8545')
      })

      this.walletClients.set(address, walletClient)
      
      console.log(`Impersonating account: ${address}`)
      return walletClient
    } catch (error) {
      throw new Error(`Failed to impersonate account ${address}: ${error}`)
    }
  }

  /**
   * Stop impersonating account
   */
  async stopImpersonating(address: Address): Promise<void> {
    if (this.network !== 'local') return

    try {
      await fetch('http://localhost:8545', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'anvil_stopImpersonatingAccount',
          params: [address],
          id: 1
        })
      })

      this.walletClients.delete(address)
      console.log(`Stopped impersonating account: ${address}`)
    } catch (error) {
      console.error(`Failed to stop impersonating ${address}:`, error)
    }
  }

  /**
   * Get wallet client for account
   */
  getWalletClient(address: Address): WalletClient | null {
    return this.walletClients.get(address) || null
  }

  /**
   * Get account information
   */
  getAccount(address: Address): AccountInfo | null {
    return this.accounts.get(address) || null
  }

  /**
   * Get all managed accounts
   */
  getAllAccounts(): AccountInfo[] {
    return Array.from(this.accounts.values())
  }

  /**
   * Activate/deactivate account
   */
  setAccountStatus(address: Address, isActive: boolean): void {
    const account = this.accounts.get(address)
    if (account) {
      account.isActive = isActive
      this.accounts.set(address, account)
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): Map<Address, number> {
    return new Map(this.accountUsage)
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.accountUsage.clear()
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.accounts.clear()
    this.walletClients.clear()
    this.accountUsage.clear()
    this.rotationIndex = 0
    this.publicClient = null
    this.funderClient = null
  }

  /**
   * Get network status and configuration
   */
  getNetworkInfo() {
    return {
      network: this.network,
      chain: this.chain,
      connected: !!this.publicClient,
      accountCount: this.accounts.size,
      activeAccounts: Array.from(this.accounts.values()).filter(a => a.isActive).length
    }
  }
}

// Export singleton instance
export const accountManager = new AccountManager()

// Convenience functions
export async function generateTestAccounts(
  count: number, 
  fundingAmount: string = '10.0',
  network: 'local' | 'sepolia' = 'local'
): Promise<AccountInfo[]> {
  return accountManager.generateAccounts({
    count,
    fundingAmount,
    network,
    namePrefix: 'TestAccount'
  })
}

export async function fundTestAccounts(
  accounts: Address[], 
  amount: string,
  network: 'local' | 'sepolia' = 'local'
): Promise<Hash[]> {
  return accountManager.fundAccounts({
    accounts,
    amount: parseEther(amount),
    network
  })
}

export function createAccountRotation(
  accounts: AccountInfo[], 
  strategy: AccountRotationStrategy['type'] = 'round-robin'
): AccountRotationStrategy {
  return accountManager.createRotationStrategy(accounts, strategy)
}

export async function startBalanceMonitoring(
  callback: (balances: AccountBalanceInfo[]) => void,
  intervalMs: number = 10000
): Promise<() => void> {
  return accountManager.startAccountMonitoring(callback, intervalMs)
}