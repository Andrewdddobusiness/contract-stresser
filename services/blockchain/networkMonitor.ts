import { PublicClient } from 'viem'
import { createPublicClientForChain } from './clients'
import { SupportedChainId } from '@/lib/wagmi'
import { toast } from 'react-hot-toast'

export interface NetworkStatus {
  chainId: SupportedChainId
  isConnected: boolean
  currentBlock: {
    number: bigint
    timestamp: bigint
    gasLimit: bigint
    gasUsed: bigint
    baseFeePerGas?: bigint
  }
  gasPrice: {
    current: bigint
    slow: bigint
    normal: bigint
    fast: bigint
    history: GasPriceHistory[]
  }
  performance: {
    blockTime: number // Average seconds between blocks
    latency: number // RPC response time in ms
    tps: number // Transactions per second
  }
  mempool?: {
    pendingTransactions: number
    queuedTransactions: number
  }
  syncStatus?: {
    isSyncing: boolean
    currentBlock: bigint
    highestBlock: bigint
    syncPercentage: number
  }
  peers?: {
    connected: number
    max: number
  }
  health: NetworkHealth
  lastUpdated: Date
}

export interface GasPriceHistory {
  timestamp: Date
  gasPrice: bigint
  baseFee?: bigint
  utilization: number // Block gas used / gas limit
}

export interface NetworkAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  timestamp: Date
  acknowledged: boolean
  chainId: SupportedChainId
}

export type NetworkHealth = 'excellent' | 'good' | 'fair' | 'poor' | 'critical'

class NetworkMonitorService {
  private clients: Map<SupportedChainId, PublicClient> = new Map()
  private status: Map<SupportedChainId, NetworkStatus> = new Map()
  private alerts: NetworkAlert[] = []
  private intervals: Map<SupportedChainId, NodeJS.Timeout> = new Map()
  private gasPriceHistory: Map<SupportedChainId, GasPriceHistory[]> = new Map()
  private blockTimes: Map<SupportedChainId, number[]> = new Map()
  private listeners: Map<string, (status: NetworkStatus) => void> = new Map()

  constructor() {
    this.loadPersistedData()
  }

  private loadPersistedData() {
    try {
      const savedAlerts = localStorage.getItem('network-alerts')
      if (savedAlerts) {
        this.alerts = JSON.parse(savedAlerts).map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp)
        }))
      }

      const savedGasHistory = localStorage.getItem('gas-price-history')
      if (savedGasHistory) {
        const historyData = JSON.parse(savedGasHistory)
        Object.entries(historyData).forEach(([chainId, history]: [string, any]) => {
          this.gasPriceHistory.set(parseInt(chainId) as SupportedChainId, 
            history.map((h: any) => ({
              ...h,
              timestamp: new Date(h.timestamp),
              gasPrice: BigInt(h.gasPrice),
              baseFee: h.baseFee ? BigInt(h.baseFee) : undefined
            }))
          )
        })
      }
    } catch (error) {
      console.warn('Failed to load persisted network data:', error)
    }
  }

  private savePersistedData() {
    try {
      localStorage.setItem('network-alerts', JSON.stringify(this.alerts))
      
      const historyData: any = {}
      this.gasPriceHistory.forEach((history, chainId) => {
        historyData[chainId] = history.map(h => ({
          ...h,
          gasPrice: h.gasPrice.toString(),
          baseFee: h.baseFee?.toString()
        }))
      })
      localStorage.setItem('gas-price-history', JSON.stringify(historyData))
    } catch (error) {
      console.warn('Failed to save network data:', error)
    }
  }

  startMonitoring(chainId: SupportedChainId): void {
    if (this.intervals.has(chainId)) {
      return // Already monitoring
    }

    const client = createPublicClientForChain(chainId)
    this.clients.set(chainId, client)

    // Initialize data structures
    if (!this.gasPriceHistory.has(chainId)) {
      this.gasPriceHistory.set(chainId, [])
    }
    if (!this.blockTimes.has(chainId)) {
      this.blockTimes.set(chainId, [])
    }

    // Start monitoring loop
    const interval = setInterval(() => {
      this.updateNetworkStatus(chainId)
    }, 5000) // Update every 5 seconds

    this.intervals.set(chainId, interval)

    // Initial update
    this.updateNetworkStatus(chainId)
  }

  stopMonitoring(chainId: SupportedChainId): void {
    const interval = this.intervals.get(chainId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(chainId)
    }
  }

  private async updateNetworkStatus(chainId: SupportedChainId): Promise<void> {
    const client = this.clients.get(chainId)
    if (!client) return

    try {
      const startTime = Date.now()
      
      // Fetch basic network data
      const [blockNumber, gasPrice, block] = await Promise.all([
        client.getBlockNumber(),
        client.getGasPrice().catch(() => BigInt(0)),
        client.getBlock({ blockTag: 'latest' }).catch(() => null)
      ])

      const latency = Date.now() - startTime

      if (!block) {
        throw new Error('Failed to fetch latest block')
      }

      // Calculate gas prices (simplified - in production you'd use more sophisticated methods)
      const gasPrices = {
        current: gasPrice,
        slow: gasPrice * BigInt(80) / BigInt(100), // 80% of current
        normal: gasPrice,
        fast: gasPrice * BigInt(120) / BigInt(100) // 120% of current
      }

      // Update gas price history
      this.updateGasPriceHistory(chainId, {
        timestamp: new Date(),
        gasPrice: gasPrice,
        baseFee: block.baseFeePerGas,
        utilization: block.gasLimit > 0 ? Number(block.gasUsed * BigInt(100) / block.gasLimit) : 0
      })

      // Calculate block times
      this.updateBlockTimes(chainId, block.timestamp)

      // Get performance metrics
      const performance = this.calculatePerformanceMetrics(chainId, latency, block)

      // Determine network health
      const health = this.assessNetworkHealth(latency, block, performance)

      const status: NetworkStatus = {
        chainId,
        isConnected: true,
        currentBlock: {
          number: block.number!,
          timestamp: block.timestamp,
          gasLimit: block.gasLimit,
          gasUsed: block.gasUsed,
          baseFeePerGas: block.baseFeePerGas || undefined
        },
        gasPrice: {
          ...gasPrices,
          history: this.gasPriceHistory.get(chainId) || []
        },
        performance,
        health,
        lastUpdated: new Date()
      }

      // For local Anvil, we can get additional data
      if (chainId === 31337) {
        try {
          // These are Anvil-specific calls that might not work on all networks
          status.mempool = await this.getMempoolInfo(client)
        } catch (error) {
          // Ignore mempool errors for now
        }
      }

      this.status.set(chainId, status)
      this.checkForAlerts(status)
      this.notifyListeners(chainId, status)
      
    } catch (error) {
      console.error(`Network monitoring failed for chain ${chainId}:`, error)
      
      // Create error status
      const errorStatus: NetworkStatus = {
        chainId,
        isConnected: false,
        currentBlock: {
          number: BigInt(0),
          timestamp: BigInt(0),
          gasLimit: BigInt(0),
          gasUsed: BigInt(0)
        },
        gasPrice: {
          current: BigInt(0),
          slow: BigInt(0),
          normal: BigInt(0),
          fast: BigInt(0),
          history: []
        },
        performance: {
          blockTime: 0,
          latency: 0,
          tps: 0
        },
        health: 'critical',
        lastUpdated: new Date()
      }

      this.status.set(chainId, errorStatus)
      this.addAlert({
        type: 'error',
        severity: 'critical',
        title: 'Network Connection Lost',
        message: `Failed to connect to network ${chainId}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        chainId
      })
      this.notifyListeners(chainId, errorStatus)
    }
  }

  private updateGasPriceHistory(chainId: SupportedChainId, entry: GasPriceHistory): void {
    const history = this.gasPriceHistory.get(chainId) || []
    history.push(entry)
    
    // Keep only last 100 entries (about 8 minutes at 5-second intervals)
    if (history.length > 100) {
      history.shift()
    }
    
    this.gasPriceHistory.set(chainId, history)
    this.savePersistedData()
  }

  private updateBlockTimes(chainId: SupportedChainId, blockTimestamp: bigint): void {
    const blockTimes = this.blockTimes.get(chainId) || []
    const currentTime = Number(blockTimestamp)
    
    if (blockTimes.length > 0) {
      const lastTime = blockTimes[blockTimes.length - 1]
      const timeDiff = currentTime - lastTime
      if (timeDiff > 0 && timeDiff < 300) { // Ignore blocks more than 5 minutes apart
        blockTimes.push(currentTime)
      }
    } else {
      blockTimes.push(currentTime)
    }
    
    // Keep only last 20 block times
    if (blockTimes.length > 20) {
      blockTimes.shift()
    }
    
    this.blockTimes.set(chainId, blockTimes)
  }

  private calculatePerformanceMetrics(chainId: SupportedChainId, latency: number, block: any) {
    const blockTimes = this.blockTimes.get(chainId) || []
    
    let averageBlockTime = 12 // Default for Ethereum
    if (blockTimes.length >= 2) {
      const timeDiffs = []
      for (let i = 1; i < blockTimes.length; i++) {
        timeDiffs.push(blockTimes[i] - blockTimes[i - 1])
      }
      averageBlockTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length
    }

    const tps = averageBlockTime > 0 ? Number(block.gasUsed) / (21000 * averageBlockTime) : 0

    return {
      blockTime: averageBlockTime,
      latency,
      tps: Math.max(0, tps)
    }
  }

  private assessNetworkHealth(latency: number, block: any, performance: any): NetworkHealth {
    let score = 100

    // Latency impact (0-30 points)
    if (latency > 5000) score -= 30
    else if (latency > 2000) score -= 20
    else if (latency > 1000) score -= 10
    else if (latency > 500) score -= 5

    // Gas utilization impact (0-20 points)
    const utilization = block.gasLimit > 0 ? Number(block.gasUsed * BigInt(100) / block.gasLimit) : 0
    if (utilization > 95) score -= 20
    else if (utilization > 85) score -= 15
    else if (utilization > 75) score -= 10

    // Block time impact (0-20 points)
    if (performance.blockTime > 20) score -= 20
    else if (performance.blockTime > 15) score -= 10

    if (score >= 90) return 'excellent'
    if (score >= 75) return 'good'
    if (score >= 60) return 'fair'
    if (score >= 40) return 'poor'
    return 'critical'
  }

  private async getMempoolInfo(client: PublicClient): Promise<{ pendingTransactions: number; queuedTransactions: number }> {
    // This is a simplified implementation
    // In practice, you'd use specific RPC methods like eth_getBlockTransactionCountByHash
    // For Anvil, we can make some assumptions
    return {
      pendingTransactions: 0, // Anvil processes transactions immediately
      queuedTransactions: 0
    }
  }

  private checkForAlerts(status: NetworkStatus): void {
    // High gas prices alert
    const gasHistory = status.gasPrice.history
    if (gasHistory.length >= 3) {
      const recent = gasHistory.slice(-3)
      const avgGasPrice = recent.reduce((sum, h) => sum + Number(h.gasPrice), 0) / recent.length
      const currentGasPrice = Number(status.gasPrice.current)
      
      if (currentGasPrice > avgGasPrice * 1.5) {
        this.addAlert({
          type: 'warning',
          severity: 'medium',
          title: 'High Gas Prices',
          message: `Gas prices are 50% above recent average (${(currentGasPrice / 1e9).toFixed(2)} Gwei)`,
          chainId: status.chainId
        })
      }
    }

    // High network latency alert
    if (status.performance.latency > 3000) {
      this.addAlert({
        type: 'warning',
        severity: 'high',
        title: 'High Network Latency',
        message: `Network response time is ${status.performance.latency}ms`,
        chainId: status.chainId
      })
    }

    // Block gas utilization alert
    const utilization = Number(status.currentBlock.gasUsed * BigInt(100) / status.currentBlock.gasLimit)
    if (utilization > 90) {
      this.addAlert({
        type: 'warning',
        severity: 'medium',
        title: 'High Block Utilization',
        message: `Block gas utilization is ${utilization.toFixed(1)}%`,
        chainId: status.chainId
      })
    }

    // Network health alerts
    if (status.health === 'critical') {
      this.addAlert({
        type: 'error',
        severity: 'critical',
        title: 'Critical Network Issues',
        message: 'Network is experiencing critical performance issues',
        chainId: status.chainId
      })
    } else if (status.health === 'poor') {
      this.addAlert({
        type: 'warning',
        severity: 'high',
        title: 'Poor Network Performance',
        message: 'Network performance is below acceptable levels',
        chainId: status.chainId
      })
    }
  }

  private addAlert(alert: Omit<NetworkAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    // Check for duplicate alerts (same type and message within last 5 minutes)
    const recent = this.alerts.filter(a => 
      a.chainId === alert.chainId &&
      a.title === alert.title &&
      Date.now() - a.timestamp.getTime() < 5 * 60 * 1000
    )

    if (recent.length > 0) return // Don't create duplicate alerts

    const newAlert: NetworkAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false
    }

    this.alerts.unshift(newAlert) // Add to beginning
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100)
    }

    this.savePersistedData()

    // Show toast for high severity alerts
    if (alert.severity === 'critical' || alert.severity === 'high') {
      toast.error(alert.title)
    } else if (alert.severity === 'medium') {
      toast.warning(alert.title)
    }

    // Emit alert event
    window.dispatchEvent(new CustomEvent('network:alert', { detail: newAlert }))
  }

  private notifyListeners(chainId: SupportedChainId, status: NetworkStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status)
      } catch (error) {
        console.error('Error in network status listener:', error)
      }
    })
  }

  // Public API
  getNetworkStatus(chainId: SupportedChainId): NetworkStatus | null {
    return this.status.get(chainId) || null
  }

  getAllNetworkStatuses(): NetworkStatus[] {
    return Array.from(this.status.values())
  }

  getAlerts(chainId?: SupportedChainId): NetworkAlert[] {
    if (chainId) {
      return this.alerts.filter(a => a.chainId === chainId)
    }
    return [...this.alerts]
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      this.savePersistedData()
    }
  }

  clearAlerts(chainId?: SupportedChainId): void {
    if (chainId) {
      this.alerts = this.alerts.filter(a => a.chainId !== chainId)
    } else {
      this.alerts = []
    }
    this.savePersistedData()
  }

  subscribe(id: string, callback: (status: NetworkStatus) => void): () => void {
    this.listeners.set(id, callback)
    return () => {
      this.listeners.delete(id)
    }
  }

  getGasPriceTrends(chainId: SupportedChainId, minutes: number = 30): GasPriceHistory[] {
    const history = this.gasPriceHistory.get(chainId) || []
    const cutoff = Date.now() - minutes * 60 * 1000
    return history.filter(h => h.timestamp.getTime() > cutoff)
  }

  cleanup(): void {
    // Stop all monitoring
    this.intervals.forEach((interval, chainId) => {
      clearInterval(interval)
    })
    this.intervals.clear()
    
    // Clear listeners
    this.listeners.clear()
  }
}

export const networkMonitorService = new NetworkMonitorService()
export default networkMonitorService