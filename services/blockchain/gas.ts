import { formatUnits, parseUnits, type PublicClient } from 'viem'
import { createPublicClientForChain } from './clients'
import { anvil, sepolia } from './chains'

// Gas price tiers (in gwei)
export interface GasPriceTiers {
  slow: bigint
  normal: bigint
  fast: bigint
}

// Gas estimation result
export interface GasEstimation {
  gasLimit: bigint
  gasPrices: GasPriceTiers
  estimatedCosts: {
    slow: {
      wei: bigint
      gwei: string
      eth: string
      usd?: string
    }
    normal: {
      wei: bigint
      gwei: string
      eth: string
      usd?: string
    }
    fast: {
      wei: bigint
      gwei: string
      eth: string
      usd?: string
    }
  }
  recommendations: {
    gasLimit: bigint
    suggestedGasPrice: bigint
    tier: 'slow' | 'normal' | 'fast'
    reasoning: string
  }
}

// Network gas configuration
interface NetworkGasConfig {
  baseFee?: bigint
  priorityFee?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  gasLimit: {
    min: bigint
    max: bigint
    default: bigint
  }
}

const NETWORK_GAS_CONFIGS: Record<number, NetworkGasConfig> = {
  // Anvil (local)
  31337: {
    gasLimit: {
      min: BigInt(21000),
      max: BigInt(30000000),
      default: BigInt(500000),
    },
  },
  // Sepolia
  11155111: {
    gasLimit: {
      min: BigInt(21000),
      max: BigInt(30000000),
      default: BigInt(500000),
    },
  },
}

/**
 * Gas Estimation Service
 * Provides comprehensive gas estimation and optimization features
 */
export class GasEstimationService {
  private ethPriceCache: { price: number; timestamp: number } | null = null
  private readonly ethPriceCacheTime = 300000 // 5 minutes

  /**
   * Get current gas prices with slow/normal/fast tiers
   */
  async getGasPrices(chainId: number): Promise<GasPriceTiers> {
    const publicClient = createPublicClientForChain(chainId)
    
    try {
      const baseGasPrice = await publicClient.getGasPrice()

      // For local Anvil, use fixed gas prices
      if (chainId === anvil.id) {
        return {
          slow: parseUnits('1', 9),
          normal: parseUnits('2', 9),
          fast: parseUnits('3', 9),
        }
      }

      // For mainnet/testnet, calculate tiers based on current gas price
      const slowMultiplier = BigInt(90) // 90% of base
      const normalMultiplier = BigInt(110) // 110% of base
      const fastMultiplier = BigInt(130) // 130% of base

      return {
        slow: (baseGasPrice * slowMultiplier) / BigInt(100),
        normal: (baseGasPrice * normalMultiplier) / BigInt(100),
        fast: (baseGasPrice * fastMultiplier) / BigInt(100),
      }
    } catch (error) {
      console.error('Failed to get gas prices:', error)
      
      // Fallback gas prices
      return {
        slow: parseUnits('10', 9),
        normal: parseUnits('20', 9),
        fast: parseUnits('30', 9),
      }
    }
  }

  /**
   * Estimate gas for contract deployment
   */
  async estimateDeploymentGas(
    chainId: number,
    bytecode: `0x${string}`,
    abi: any[],
    constructorArgs: any[] = [],
    from?: `0x${string}`
  ): Promise<GasEstimation> {
    const publicClient = createPublicClientForChain(chainId)
    const config = NETWORK_GAS_CONFIGS[chainId] || NETWORK_GAS_CONFIGS[11155111]

    try {
      // Encode constructor data
      let deployData = bytecode
      if (constructorArgs.length > 0) {
        // For simplicity, we'll use a rough estimation
        // In a real implementation, you'd properly encode the constructor args
        deployData = `${bytecode}${'00'.repeat(constructorArgs.length * 32)}` as `0x${string}`
      }

      // Estimate gas limit
      let gasLimit: bigint
      try {
        gasLimit = await publicClient.estimateGas({
          data: deployData,
          account: from || '0x0000000000000000000000000000000000000000',
        })
        
        // Add 20% buffer
        gasLimit = (gasLimit * BigInt(120)) / BigInt(100)
      } catch (error) {
        console.warn('Gas estimation failed, using default:', error)
        gasLimit = config.gasLimit.default
      }

      // Ensure gas limit is within bounds
      if (gasLimit < config.gasLimit.min) {
        gasLimit = config.gasLimit.min
      }
      if (gasLimit > config.gasLimit.max) {
        gasLimit = config.gasLimit.max
      }

      // Get gas prices
      const gasPrices = await this.getGasPrices(chainId)

      // Get ETH price for USD conversion
      const ethPrice = await this.getEthPrice()

      // Calculate estimated costs
      const estimatedCosts = {
        slow: this.calculateCost(gasLimit, gasPrices.slow, ethPrice),
        normal: this.calculateCost(gasLimit, gasPrices.normal, ethPrice),
        fast: this.calculateCost(gasLimit, gasPrices.fast, ethPrice),
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        gasLimit,
        gasPrices,
        estimatedCosts,
        chainId
      )

      return {
        gasLimit,
        gasPrices,
        estimatedCosts,
        recommendations,
      }
    } catch (error) {
      console.error('Gas estimation failed:', error)
      throw new Error(`Gas estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Estimate gas for contract function call
   */
  async estimateFunctionGas(
    chainId: number,
    contractAddress: `0x${string}`,
    abi: any[],
    functionName: string,
    args: any[] = [],
    from?: `0x${string}`,
    value?: bigint
  ): Promise<GasEstimation> {
    const publicClient = createPublicClientForChain(chainId)
    const config = NETWORK_GAS_CONFIGS[chainId] || NETWORK_GAS_CONFIGS[11155111]

    try {
      // Estimate gas limit for the function call
      let gasLimit: bigint
      try {
        gasLimit = await (publicClient as any).estimateContractGas({
          address: contractAddress,
          abi,
          functionName,
          args,
          account: from || '0x0000000000000000000000000000000000000000',
          value,
        })
        
        // Add 10% buffer for function calls (less than deployment)
        gasLimit = (gasLimit * BigInt(110)) / BigInt(100)
      } catch (error) {
        console.warn('Function gas estimation failed, using default:', error)
        // Use lower default for function calls
        gasLimit = BigInt(200000)
      }

      // Ensure gas limit is within bounds
      if (gasLimit < config.gasLimit.min) {
        gasLimit = config.gasLimit.min
      }
      if (gasLimit > config.gasLimit.max) {
        gasLimit = config.gasLimit.max
      }

      // Get gas prices
      const gasPrices = await this.getGasPrices(chainId)

      // Get ETH price for USD conversion
      const ethPrice = await this.getEthPrice()

      // Calculate estimated costs
      const estimatedCosts = {
        slow: this.calculateCost(gasLimit, gasPrices.slow, ethPrice),
        normal: this.calculateCost(gasLimit, gasPrices.normal, ethPrice),
        fast: this.calculateCost(gasLimit, gasPrices.fast, ethPrice),
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        gasLimit,
        gasPrices,
        estimatedCosts,
        chainId
      )

      return {
        gasLimit,
        gasPrices,
        estimatedCosts,
        recommendations,
      }
    } catch (error) {
      console.error('Function gas estimation failed:', error)
      throw new Error(`Function gas estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get current ETH price in USD
   */
  private async getEthPrice(): Promise<number> {
    // Check cache
    if (
      this.ethPriceCache &&
      Date.now() - this.ethPriceCache.timestamp < this.ethPriceCacheTime
    ) {
      return this.ethPriceCache.price
    }

    try {
      // Use a free API to get ETH price
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      const data = await response.json()
      const price = data.ethereum?.usd || 2000 // Fallback price

      // Cache the result
      this.ethPriceCache = {
        price,
        timestamp: Date.now(),
      }

      return price
    } catch (error) {
      console.warn('Failed to fetch ETH price:', error)
      return 2000 // Fallback price
    }
  }

  /**
   * Calculate cost breakdown for gas estimation
   */
  private calculateCost(gasLimit: bigint, gasPrice: bigint, ethPrice: number) {
    const totalWei = gasLimit * gasPrice
    const totalEth = formatUnits(totalWei, 18)
    const totalUsd = (parseFloat(totalEth) * ethPrice).toFixed(2)

    return {
      wei: totalWei,
      gwei: formatUnits(gasPrice, 9),
      eth: totalEth,
      usd: `$${totalUsd}`,
    }
  }

  /**
   * Generate gas recommendations based on network conditions
   */
  private generateRecommendations(
    gasLimit: bigint,
    gasPrices: GasPriceTiers,
    estimatedCosts: any,
    chainId: number
  ) {
    let tier: 'slow' | 'normal' | 'fast' = 'normal'
    let reasoning = 'Standard gas price for reliable confirmation'

    // For local network, always use slow
    if (chainId === anvil.id) {
      tier = 'slow'
      reasoning = 'Local network - use minimal gas price'
    } else {
      // For testnets/mainnet, analyze costs
      const normalCostUsd = parseFloat(estimatedCosts.normal.usd.replace('$', ''))
      
      if (normalCostUsd < 1) {
        tier = 'normal'
        reasoning = 'Low cost transaction - standard speed is economical'
      } else if (normalCostUsd < 5) {
        tier = 'slow'
        reasoning = 'Moderate cost - save money with slower confirmation'
      } else {
        tier = 'fast'
        reasoning = 'High cost transaction - ensure quick confirmation'
      }
    }

    return {
      gasLimit,
      suggestedGasPrice: gasPrices[tier],
      tier,
      reasoning,
    }
  }

  /**
   * Get gas limit recommendations for different operation types
   */
  getGasLimitRecommendations(operationType: string): {
    min: bigint
    recommended: bigint
    max: bigint
    description: string
  } {
    const recommendations: Record<string, any> = {
      'erc20-transfer': {
        min: BigInt(21000),
        recommended: BigInt(65000),
        max: BigInt(100000),
        description: 'Simple ERC-20 token transfer',
      },
      'erc20-approve': {
        min: BigInt(21000),
        recommended: BigInt(50000),
        max: BigInt(80000),
        description: 'ERC-20 token approval',
      },
      'contract-deployment': {
        min: BigInt(200000),
        recommended: BigInt(800000),
        max: BigInt(3000000),
        description: 'Smart contract deployment',
      },
      'token-mint': {
        min: BigInt(50000),
        recommended: BigInt(100000),
        max: BigInt(200000),
        description: 'Token minting operation',
      },
      'batch-mint': {
        min: BigInt(100000),
        recommended: BigInt(500000),
        max: BigInt(2000000),
        description: 'Batch token minting (varies by batch size)',
      },
      'complex-contract': {
        min: BigInt(100000),
        recommended: BigInt(300000),
        max: BigInt(1000000),
        description: 'Complex contract interaction',
      },
    }

    return recommendations[operationType] || recommendations['complex-contract']
  }

  /**
   * Format gas price for display
   */
  formatGasPrice(gasPrice: bigint, unit: 'wei' | 'gwei' | 'eth' = 'gwei'): string {
    switch (unit) {
      case 'wei':
        return gasPrice.toString()
      case 'gwei':
        return formatUnits(gasPrice, 9)
      case 'eth':
        return formatUnits(gasPrice, 18)
      default:
        return formatUnits(gasPrice, 9)
    }
  }

  /**
   * Parse gas price from user input
   */
  parseGasPrice(input: string, unit: 'wei' | 'gwei' | 'eth' = 'gwei'): bigint {
    try {
      switch (unit) {
        case 'wei':
          return BigInt(input)
        case 'gwei':
          return parseUnits(input, 9)
        case 'eth':
          return parseUnits(input, 18)
        default:
          return parseUnits(input, 9)
      }
    } catch (error) {
      throw new Error(`Invalid gas price format: ${input}`)
    }
  }

  /**
   * Get network-specific gas optimization tips
   */
  getOptimizationTips(chainId: number): string[] {
    if (chainId === anvil.id) {
      return [
        'Local network has no real gas costs',
        'Use minimal gas prices for testing',
        'Gas limit still affects execution',
      ]
    }

    return [
      'Monitor network congestion before transactions',
      'Use lower gas prices during off-peak hours',
      'Batch multiple operations when possible',
      'Consider using gas limit multipliers for safety',
      'Test on testnets before mainnet deployment',
    ]
  }

  /**
   * Calculate time estimation for transaction confirmation
   */
  estimateConfirmationTime(gasPrice: bigint, chainId: number): string {
    if (chainId === anvil.id) {
      return '~1 second (instant mining)'
    }

    const gasPriceGwei = parseFloat(formatUnits(gasPrice, 9))

    // Rough estimates based on gas price (for Ethereum mainnet/testnets)
    if (gasPriceGwei < 10) {
      return '5-10 minutes'
    } else if (gasPriceGwei < 20) {
      return '2-5 minutes'
    } else if (gasPriceGwei < 50) {
      return '1-2 minutes'
    } else {
      return '< 1 minute'
    }
  }
}

// Singleton instance
export const gasEstimationService = new GasEstimationService()

// Convenience functions
export const getGasPrices = (chainId: number) => gasEstimationService.getGasPrices(chainId)
export const estimateDeploymentGas = (
  chainId: number,
  bytecode: `0x${string}`,
  abi: any[],
  constructorArgs?: any[],
  from?: `0x${string}`
) => gasEstimationService.estimateDeploymentGas(chainId, bytecode, abi, constructorArgs, from)
export const estimateFunctionGas = (
  chainId: number,
  contractAddress: `0x${string}`,
  abi: any[],
  functionName: string,
  args?: any[],
  from?: `0x${string}`,
  value?: bigint
) => gasEstimationService.estimateFunctionGas(chainId, contractAddress, abi, functionName, args, from, value)