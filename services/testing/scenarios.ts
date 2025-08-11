import { type Address } from 'viem'
import type { TestConfiguration, TestScenario } from '@/types/testing'

export interface ScenarioTemplate {
  id: string
  name: string
  description: string
  category: 'throughput' | 'concurrency' | 'gas' | 'stress' | 'custom'
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  estimatedDuration: string
  configFactory: (contractAddress: Address, customParams?: any) => TestConfiguration
  requirements: string[]
  expectedOutcome: string
}

export interface ScenarioResult {
  scenarioId: string
  success: boolean
  metrics: {
    totalTransactions: number
    successRate: number
    averageGasUsed: number
    transactionsPerSecond: number
    totalDuration: number
    peakTPS: number
    errorCount: number
  }
  performance: 'excellent' | 'good' | 'fair' | 'poor'
  recommendations: string[]
}

/**
 * Test Scenarios Service
 * Provides predefined test scenarios for stress testing smart contracts
 */
export class TestScenariosService {
  private scenarios = new Map<string, ScenarioTemplate>()

  constructor() {
    this.initializeScenarios()
  }

  /**
   * Initialize all predefined scenarios
   */
  private initializeScenarios(): void {
    // Rapid Transfer Scenarios
    this.addScenario({
      id: 'rapid-transfer-light',
      name: 'Rapid Transfer (Light)',
      description: 'Send 100 sequential token transfers to test basic throughput',
      category: 'throughput',
      difficulty: 'easy',
      estimatedDuration: '2-3 minutes',
      configFactory: (contractAddress: Address) => ({
        contractAddress,
        functionName: 'transfer',
        functionArgs: [
          { name: 'to', type: 'address', value: '0x742d35Cc94C5F7C9a81B18D74f8C8067F3532F0E' },
          { name: 'amount', type: 'uint256', value: '1000000000000000000' } // 1 token
        ],
        iterations: 100,
        network: 'local',
        mode: 'sequential',
        accountCount: 1,
        useMultipleAccounts: false,
        fundingAmount: '1.0',
        delayBetweenTx: 100,
        gasPriceTier: 'normal',
        stopOnError: false,
        retryFailedTx: true,
        maxRetries: 3,
        timeoutMs: 30000
      }),
      requirements: [
        'Contract must have transfer function',
        'Account must have sufficient token balance',
        'Anvil must be running'
      ],
      expectedOutcome: 'Should complete 100 transfers in under 3 minutes with >95% success rate'
    })

    this.addScenario({
      id: 'rapid-transfer-heavy',
      name: 'Rapid Transfer (Heavy)',
      description: 'Send 500 sequential token transfers for intensive throughput testing',
      category: 'throughput',
      difficulty: 'medium',
      estimatedDuration: '8-12 minutes',
      configFactory: (contractAddress: Address) => ({
        contractAddress,
        functionName: 'transfer',
        functionArgs: [
          { name: 'to', type: 'address', value: '0x742d35Cc94C5F7C9a81B18D74f8C8067F3532F0E' },
          { name: 'amount', type: 'uint256', value: '1000000000000000000' }
        ],
        iterations: 500,
        network: 'local',
        mode: 'sequential',
        accountCount: 1,
        useMultipleAccounts: false,
        fundingAmount: '2.0',
        delayBetweenTx: 50,
        gasPriceTier: 'normal',
        stopOnError: false,
        retryFailedTx: true,
        maxRetries: 2,
        timeoutMs: 45000
      }),
      requirements: [
        'Contract must have transfer function',
        'Account must have large token balance',
        'Anvil must be running with adequate resources'
      ],
      expectedOutcome: 'Should complete 500 transfers in under 12 minutes with >90% success rate'
    })

    // Concurrent User Scenarios
    this.addScenario({
      id: 'concurrent-users-small',
      name: 'Concurrent Users (5 Users)',
      description: 'Simulate 5 users sending transactions simultaneously',
      category: 'concurrency',
      difficulty: 'easy',
      estimatedDuration: '3-5 minutes',
      configFactory: (contractAddress: Address) => ({
        contractAddress,
        functionName: 'transfer',
        functionArgs: [
          { name: 'to', type: 'address', value: '0x742d35Cc94C5F7C9a81B18D74f8C8067F3532F0E' },
          { name: 'amount', type: 'uint256', value: '500000000000000000' } // 0.5 tokens
        ],
        iterations: 50,
        network: 'local',
        mode: 'concurrent',
        accountCount: 5,
        useMultipleAccounts: true,
        fundingAmount: '1.0',
        delayBetweenTx: 0,
        concurrencyLimit: 5,
        gasPriceTier: 'normal',
        stopOnError: false,
        retryFailedTx: true,
        maxRetries: 3,
        timeoutMs: 30000
      }),
      requirements: [
        'Contract must support concurrent transfers',
        '5 accounts will be generated and funded',
        'Sufficient ETH for gas fees'
      ],
      expectedOutcome: 'Should demonstrate proper nonce management and concurrent execution'
    })

    this.addScenario({
      id: 'concurrent-users-large',
      name: 'Concurrent Users (20 Users)',
      description: 'Simulate 20 users for high-concurrency stress testing',
      category: 'concurrency',
      difficulty: 'hard',
      estimatedDuration: '10-15 minutes',
      configFactory: (contractAddress: Address) => ({
        contractAddress,
        functionName: 'transfer',
        functionArgs: [
          { name: 'to', type: 'address', value: '0x742d35Cc94C5F7C9a81B18D74f8C8067F3532F0E' },
          { name: 'amount', type: 'uint256', value: '100000000000000000' } // 0.1 tokens
        ],
        iterations: 200,
        network: 'local',
        mode: 'concurrent',
        accountCount: 20,
        useMultipleAccounts: true,
        fundingAmount: '0.5',
        delayBetweenTx: 0,
        concurrencyLimit: 20,
        gasPriceTier: 'fast',
        stopOnError: false,
        retryFailedTx: true,
        maxRetries: 2,
        timeoutMs: 60000
      }),
      requirements: [
        'High-performance contract implementation',
        '20 accounts will be generated (high funding cost)',
        'Anvil with increased block gas limit'
      ],
      expectedOutcome: 'Tests network congestion handling and account rotation efficiency'
    })

    // Multi-User Batch Operations
    this.addScenario({
      id: 'batch-operations',
      name: 'Multi-User Batch Operations',
      description: 'Test batch operations across multiple accounts with complex function calls',
      category: 'stress',
      difficulty: 'medium',
      estimatedDuration: '5-8 minutes',
      configFactory: (contractAddress: Address) => ({
        contractAddress,
        functionName: 'batchMint',
        functionArgs: [
          { 
            name: 'recipients', 
            type: 'address[]', 
            value: JSON.stringify([
              '0x742d35Cc94C5F7C9a81B18D74f8C8067F3532F0E',
              '0x8ba1f109551bD432803012645Hac136c13141D00',
              '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db'
            ])
          },
          { 
            name: 'amounts', 
            type: 'uint256[]', 
            value: JSON.stringify(['1000000000000000000', '2000000000000000000', '3000000000000000000'])
          }
        ],
        iterations: 25,
        network: 'local',
        mode: 'multi-user',
        accountCount: 5,
        useMultipleAccounts: true,
        fundingAmount: '2.0',
        delayBetweenTx: 2000,
        batchSize: 5,
        gasPriceTier: 'fast',
        stopOnError: false,
        retryFailedTx: true,
        maxRetries: 2,
        timeoutMs: 90000
      }),
      requirements: [
        'Contract must have batchMint function',
        'Contract must support array parameters',
        'High gas limits for batch operations'
      ],
      expectedOutcome: 'Tests complex parameter handling and batch operation efficiency'
    })

    // Gas Limit Stress Tests
    this.addScenario({
      id: 'gas-limit-stress',
      name: 'Gas Limit Stress Test',
      description: 'Push gas limits to test network handling of complex transactions',
      category: 'gas',
      difficulty: 'hard',
      estimatedDuration: '15-20 minutes',
      configFactory: (contractAddress: Address) => ({
        contractAddress,
        functionName: 'complexOperation',
        functionArgs: [
          { name: 'iterations', type: 'uint256', value: '1000' },
          { name: 'data', type: 'bytes', value: '0x' + '00'.repeat(1000) } // 1KB of data
        ],
        iterations: 50,
        network: 'local',
        mode: 'sequential',
        accountCount: 1,
        useMultipleAccounts: false,
        fundingAmount: '5.0',
        delayBetweenTx: 3000,
        gasLimit: BigInt(2000000), // 2M gas limit
        gasPriceTier: 'fast',
        stopOnError: false,
        retryFailedTx: true,
        maxRetries: 5,
        timeoutMs: 180000
      }),
      requirements: [
        'Contract must have complexOperation function',
        'Anvil configured with high block gas limit',
        'Account with substantial ETH for gas'
      ],
      expectedOutcome: 'Tests gas estimation accuracy and high-gas transaction handling'
    })

    // Custom Function Scenarios
    this.addScenario({
      id: 'custom-erc20-full',
      name: 'Complete ERC20 Function Test',
      description: 'Test all major ERC20 functions in sequence',
      category: 'custom',
      difficulty: 'medium',
      estimatedDuration: '10-12 minutes',
      configFactory: (contractAddress: Address, params?: { recipient?: Address }) => ({
        contractAddress,
        functionName: 'transfer',
        functionArgs: [
          { name: 'to', type: 'address', value: params?.recipient || '0x742d35Cc94C5F7C9a81B18D74f8C8067F3532F0E' },
          { name: 'amount', type: 'uint256', value: '1000000000000000000' }
        ],
        iterations: 100,
        network: 'local',
        mode: 'sequential',
        accountCount: 3,
        useMultipleAccounts: true,
        fundingAmount: '1.5',
        delayBetweenTx: 500,
        gasPriceTier: 'normal',
        stopOnError: false,
        retryFailedTx: true,
        maxRetries: 3,
        timeoutMs: 45000
      }),
      requirements: [
        'Complete ERC20 contract implementation',
        'Multiple test accounts for approval flows',
        'Token balance for transfers'
      ],
      expectedOutcome: 'Validates complete ERC20 functionality under stress'
    })

    // Network Stress Test
    this.addScenario({
      id: 'network-stress-extreme',
      name: 'Network Stress Test (Extreme)',
      description: 'Maximum stress test with 1000+ transactions across 50 accounts',
      category: 'stress',
      difficulty: 'extreme',
      estimatedDuration: '25-35 minutes',
      configFactory: (contractAddress: Address) => ({
        contractAddress,
        functionName: 'transfer',
        functionArgs: [
          { name: 'to', type: 'address', value: '0x742d35Cc94C5F7C9a81B18D74f8C8067F3532F0E' },
          { name: 'amount', type: 'uint256', value: '1000000000000000' } // 0.001 tokens
        ],
        iterations: 1000,
        network: 'local',
        mode: 'concurrent',
        accountCount: 50,
        useMultipleAccounts: true,
        fundingAmount: '0.2',
        delayBetweenTx: 0,
        concurrencyLimit: 25,
        gasPriceTier: 'fast',
        stopOnError: false,
        retryFailedTx: false, // Disable retries for pure stress test
        maxRetries: 0,
        timeoutMs: 120000
      }),
      requirements: [
        '⚠️  High-performance setup required',
        'Anvil with maximum configuration',
        'Monitor system resources during execution',
        'May impact system performance'
      ],
      expectedOutcome: '⚠️  Ultimate stress test - may cause transaction failures and timeouts'
    })
  }

  /**
   * Add a custom scenario
   */
  private addScenario(scenario: ScenarioTemplate): void {
    this.scenarios.set(scenario.id, scenario)
  }

  /**
   * Get all available scenarios
   */
  getAllScenarios(): ScenarioTemplate[] {
    return Array.from(this.scenarios.values())
  }

  /**
   * Get scenarios by category
   */
  getScenariosByCategory(category: ScenarioTemplate['category']): ScenarioTemplate[] {
    return this.getAllScenarios().filter(scenario => scenario.category === category)
  }

  /**
   * Get scenarios by difficulty
   */
  getScenariosByDifficulty(difficulty: ScenarioTemplate['difficulty']): ScenarioTemplate[] {
    return this.getAllScenarios().filter(scenario => scenario.difficulty === difficulty)
  }

  /**
   * Get a specific scenario by ID
   */
  getScenario(id: string): ScenarioTemplate | null {
    return this.scenarios.get(id) || null
  }

  /**
   * Create test configuration from scenario
   */
  createConfigFromScenario(
    scenarioId: string, 
    contractAddress: Address, 
    customParams?: any
  ): TestConfiguration | null {
    const scenario = this.getScenario(scenarioId)
    if (!scenario) return null

    return scenario.configFactory(contractAddress, customParams)
  }

  /**
   * Get recommended scenarios for beginners
   */
  getRecommendedScenarios(): ScenarioTemplate[] {
    return [
      'rapid-transfer-light',
      'concurrent-users-small',
      'custom-erc20-full'
    ].map(id => this.getScenario(id)!).filter(Boolean)
  }

  /**
   * Get advanced scenarios for experienced users
   */
  getAdvancedScenarios(): ScenarioTemplate[] {
    return this.getAllScenarios().filter(scenario => 
      scenario.difficulty === 'hard' || scenario.difficulty === 'extreme'
    )
  }

  /**
   * Analyze scenario results and provide recommendations
   */
  analyzeResults(
    scenarioId: string,
    totalTransactions: number,
    successCount: number,
    failureCount: number,
    avgGasUsed: number,
    transactionsPerSecond: number,
    totalDuration: number
  ): ScenarioResult {
    const scenario = this.getScenario(scenarioId)
    const successRate = totalTransactions > 0 ? (successCount / totalTransactions) * 100 : 0
    
    // Determine performance rating
    let performance: ScenarioResult['performance'] = 'poor'
    if (successRate >= 95 && transactionsPerSecond >= 5) performance = 'excellent'
    else if (successRate >= 90 && transactionsPerSecond >= 3) performance = 'good'
    else if (successRate >= 75 && transactionsPerSecond >= 1) performance = 'fair'

    // Generate recommendations
    const recommendations: string[] = []
    
    if (successRate < 90) {
      recommendations.push('Low success rate - check contract implementation and gas settings')
    }
    if (transactionsPerSecond < 2) {
      recommendations.push('Low throughput - consider optimizing delays or increasing concurrency')
    }
    if (avgGasUsed > 100000) {
      recommendations.push('High gas usage - review contract efficiency')
    }
    if (failureCount > totalTransactions * 0.1) {
      recommendations.push('High failure rate - enable retries or check error patterns')
    }

    // Add scenario-specific recommendations
    if (scenario?.category === 'concurrency' && successRate < 85) {
      recommendations.push('Concurrency issues detected - check nonce management and account rotation')
    }
    if (scenario?.category === 'gas' && avgGasUsed < 500000) {
      recommendations.push('Gas stress test may not be intensive enough - increase complexity')
    }

    return {
      scenarioId,
      success: successRate >= 75,
      metrics: {
        totalTransactions,
        successRate,
        averageGasUsed: avgGasUsed,
        transactionsPerSecond,
        totalDuration,
        peakTPS: transactionsPerSecond * 1.5, // Estimated peak
        errorCount: failureCount
      },
      performance,
      recommendations
    }
  }

  /**
   * Get scenario categories with counts
   */
  getScenarioCategories(): Array<{ category: string; count: number; description: string }> {
    const categories = [
      { category: 'throughput', description: 'High-volume sequential transaction tests' },
      { category: 'concurrency', description: 'Multi-user concurrent execution tests' },
      { category: 'gas', description: 'Gas limit and optimization tests' },
      { category: 'stress', description: 'Maximum load and endurance tests' },
      { category: 'custom', description: 'Specialized function and workflow tests' }
    ]

    return categories.map(cat => ({
      ...cat,
      count: this.getScenariosByCategory(cat.category as any).length
    }))
  }
}

// Export singleton instance
export const testScenariosService = new TestScenariosService()

// Convenience functions
export function getAllTestScenarios(): ScenarioTemplate[] {
  return testScenariosService.getAllScenarios()
}

export function getScenariosByCategory(category: ScenarioTemplate['category']): ScenarioTemplate[] {
  return testScenariosService.getScenariosByCategory(category)
}

export function createScenarioConfig(
  scenarioId: string, 
  contractAddress: Address, 
  customParams?: any
): TestConfiguration | null {
  return testScenariosService.createConfigFromScenario(scenarioId, contractAddress, customParams)
}