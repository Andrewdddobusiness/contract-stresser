'use client'

import { Address, parseEther, parseGwei } from 'viem'
import { 
  TestScenario, 
  MarketConditions, 
  NetworkConditions, 
  UserBehavior, 
  ExternalFactor,
  TestResult
} from '@/services/testing/flowTesting'

// Built-in Test Scenarios
export const BUILT_IN_SCENARIOS: TestScenario[] = [
  {
    name: 'Normal Market Conditions',
    description: 'Standard market with typical liquidity and volatility',
    marketConditions: {
      tokenPrices: {
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('2000'), // ETH
        '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'), // DAI
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'), // USDC
      },
      liquidityLevels: {
        'ETH/DAI': 1000000,
        'ETH/USDC': 800000,
        'DAI/USDC': 500000
      },
      volatility: 0.1,
      tradingVolume: parseEther('10000000'),
      slippage: 0.005
    },
    networkConditions: {
      gasPrice: parseGwei('20'),
      blockTime: 12,
      congestion: 'low',
      mempoolSize: 1000
    },
    userBehavior: {
      concurrentUsers: 10,
      transactionFrequency: 1,
      averageTransactionSize: parseEther('1'),
      behaviorPatterns: ['normal_trading', 'hodling']
    },
    externalFactors: []
  },
  
  {
    name: 'High Volatility Market',
    description: 'Market crash scenario with high price swings and reduced liquidity',
    marketConditions: {
      tokenPrices: {
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('1200'), // ETH crashed
        '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('0.98'), // DAI slightly depegged
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1.02'), // USDC premium
      },
      liquidityLevels: {
        'ETH/DAI': 300000, // Reduced liquidity
        'ETH/USDC': 250000,
        'DAI/USDC': 150000
      },
      volatility: 0.5,
      tradingVolume: parseEther('50000000'), // Panic trading
      slippage: 0.03 // High slippage
    },
    networkConditions: {
      gasPrice: parseGwei('150'), // High gas during volatility
      blockTime: 12,
      congestion: 'high',
      mempoolSize: 15000
    },
    userBehavior: {
      concurrentUsers: 100,
      transactionFrequency: 5,
      averageTransactionSize: parseEther('5'), // Larger trades during volatility
      behaviorPatterns: ['panic_selling', 'arbitrage', 'liquidation_hunting']
    },
    externalFactors: [
      {
        type: 'oracle_price',
        description: 'Price oracle becomes unreliable due to market conditions',
        impact: 'high',
        parameters: {
          deviation: 0.15,
          updateFrequency: 'delayed'
        }
      }
    ]
  },
  
  {
    name: 'Network Congestion',
    description: 'High gas prices and slow confirmation times during network congestion',
    marketConditions: {
      tokenPrices: {
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('2000'),
        '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'),
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'),
      },
      liquidityLevels: {
        'ETH/DAI': 1000000,
        'ETH/USDC': 800000,
        'DAI/USDC': 500000
      },
      volatility: 0.1,
      tradingVolume: parseEther('10000000'),
      slippage: 0.005
    },
    networkConditions: {
      gasPrice: parseGwei('200'), // Very high gas
      blockTime: 30, // Slower blocks
      congestion: 'high',
      mempoolSize: 50000
    },
    userBehavior: {
      concurrentUsers: 50,
      transactionFrequency: 0.5, // Reduced frequency due to high gas
      averageTransactionSize: parseEther('10'), // Larger trades to justify gas cost
      behaviorPatterns: ['gas_optimization', 'batching', 'delayed_execution']
    },
    externalFactors: [
      {
        type: 'external_call',
        description: 'External contract calls may fail due to gas limits',
        impact: 'medium',
        parameters: {
          failureRate: 0.1,
          gasMultiplier: 2
        }
      }
    ]
  },

  {
    name: 'Bear Market Stress Test',
    description: 'Extended bear market with low liquidity and user activity',
    marketConditions: {
      tokenPrices: {
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('800'), // ETH bear market
        '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'),
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'),
      },
      liquidityLevels: {
        'ETH/DAI': 200000, // Very low liquidity
        'ETH/USDC': 150000,
        'DAI/USDC': 100000
      },
      volatility: 0.15,
      tradingVolume: parseEther('1000000'), // Low volume
      slippage: 0.02
    },
    networkConditions: {
      gasPrice: parseGwei('8'), // Low gas due to low activity
      blockTime: 12,
      congestion: 'low',
      mempoolSize: 200
    },
    userBehavior: {
      concurrentUsers: 3,
      transactionFrequency: 0.2,
      averageTransactionSize: parseEther('0.1'), // Small trades
      behaviorPatterns: ['accumulation', 'cost_averaging']
    },
    externalFactors: []
  },

  {
    name: 'MEV Extraction Scenario',
    description: 'High MEV activity with sandwich attacks and front-running',
    marketConditions: {
      tokenPrices: {
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('2000'),
        '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'),
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'),
      },
      liquidityLevels: {
        'ETH/DAI': 1000000,
        'ETH/USDC': 800000,
        'DAI/USDC': 500000
      },
      volatility: 0.12,
      tradingVolume: parseEther('20000000'),
      slippage: 0.008
    },
    networkConditions: {
      gasPrice: parseGwei('50'),
      blockTime: 12,
      congestion: 'medium',
      mempoolSize: 5000
    },
    userBehavior: {
      concurrentUsers: 25,
      transactionFrequency: 2,
      averageTransactionSize: parseEther('2'),
      behaviorPatterns: ['mev_extraction', 'sandwich_attacks', 'front_running', 'back_running']
    },
    externalFactors: [
      {
        type: 'external_call',
        description: 'MEV bots competing for profitable transactions',
        impact: 'high',
        parameters: {
          competitionLevel: 'extreme',
          gasAuction: true
        }
      }
    ]
  },

  {
    name: 'Flash Loan Attack Scenario',
    description: 'Scenario simulating flash loan attacks and protocol manipulation',
    marketConditions: {
      tokenPrices: {
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('2000'),
        '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'),
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'),
      },
      liquidityLevels: {
        'ETH/DAI': 500000, // Medium liquidity for manipulation
        'ETH/USDC': 400000,
        'DAI/USDC': 300000
      },
      volatility: 0.25,
      tradingVolume: parseEther('5000000'),
      slippage: 0.015
    },
    networkConditions: {
      gasPrice: parseGwei('100'),
      blockTime: 12,
      congestion: 'medium',
      mempoolSize: 8000
    },
    userBehavior: {
      concurrentUsers: 15,
      transactionFrequency: 3,
      averageTransactionSize: parseEther('50'), // Large flash loan amounts
      behaviorPatterns: ['flash_loan_arbitrage', 'price_manipulation', 'governance_attacks']
    },
    externalFactors: [
      {
        type: 'oracle_price',
        description: 'Price manipulation attempts on oracle feeds',
        impact: 'high',
        parameters: {
          manipulationAttempts: 5,
          maxDeviation: 0.2
        }
      }
    ]
  }
]

export interface ScenarioGenerationConfig {
  baseConditions: Partial<TestScenario>
  variationFactors: {
    priceVariation: number
    liquidityVariation: number
    gasVariation: number
    userVariation: number
  }
  constraintsRules: ScenarioConstraint[]
  customFactors: ExternalFactor[]
}

export interface ScenarioConstraint {
  type: 'price' | 'liquidity' | 'gas' | 'user'
  property: string
  min: number
  max: number
  correlation?: {
    property: string
    coefficient: number
  }
}

export class ScenarioGenerator {
  private static instance: ScenarioGenerator
  
  static getInstance(): ScenarioGenerator {
    if (!ScenarioGenerator.instance) {
      ScenarioGenerator.instance = new ScenarioGenerator()
    }
    return ScenarioGenerator.instance
  }

  private constructor() {}

  // Generate Market Scenarios
  generateMarketScenarios(baseConditions: MarketConditions): TestScenario[] {
    const scenarios: TestScenario[] = []

    // Bull Market Scenario
    scenarios.push({
      name: 'Bull Market Rally',
      description: 'Strong upward trend with high trading volume and optimism',
      marketConditions: {
        ...baseConditions,
        tokenPrices: this.adjustPrices(baseConditions.tokenPrices, 1.8), // 80% increase
        volatility: Math.min(baseConditions.volatility * 1.5, 0.4),
        tradingVolume: baseConditions.tradingVolume * 3n,
        liquidityLevels: this.adjustLiquidity(baseConditions.liquidityLevels, 1.4),
        slippage: baseConditions.slippage * 0.7
      },
      networkConditions: {
        gasPrice: parseGwei('60'), // Higher gas due to activity
        blockTime: 12,
        congestion: 'medium',
        mempoolSize: 8000
      },
      userBehavior: {
        concurrentUsers: 80,
        transactionFrequency: 4,
        averageTransactionSize: parseEther('3'),
        behaviorPatterns: ['fomo_buying', 'momentum_trading', 'yield_farming']
      },
      externalFactors: []
    })

    // Flash Crash Scenario
    scenarios.push({
      name: 'Flash Crash',
      description: 'Sudden massive price drop with recovery',
      marketConditions: {
        ...baseConditions,
        tokenPrices: this.adjustPrices(baseConditions.tokenPrices, 0.4), // 60% drop
        volatility: 0.8, // Extreme volatility
        tradingVolume: baseConditions.tradingVolume * 10n,
        liquidityLevels: this.adjustLiquidity(baseConditions.liquidityLevels, 0.3),
        slippage: 0.1 // Very high slippage
      },
      networkConditions: {
        gasPrice: parseGwei('300'),
        blockTime: 15, // Network strain
        congestion: 'high',
        mempoolSize: 25000
      },
      userBehavior: {
        concurrentUsers: 200,
        transactionFrequency: 8,
        averageTransactionSize: parseEther('8'),
        behaviorPatterns: ['panic_selling', 'stop_loss_cascade', 'liquidation_spiral']
      },
      externalFactors: [
        {
          type: 'liquidity_change',
          description: 'Liquidity providers withdraw during crash',
          impact: 'high',
          parameters: {
            withdrawalRate: 0.6,
            recoveryTime: 3600
          }
        }
      ]
    })

    // Stable Market Scenario
    scenarios.push({
      name: 'Sideways Market',
      description: 'Low volatility consolidation period',
      marketConditions: {
        ...baseConditions,
        tokenPrices: this.adjustPrices(baseConditions.tokenPrices, 1.0), // No change
        volatility: 0.05, // Very low volatility
        tradingVolume: baseConditions.tradingVolume / 2n,
        liquidityLevels: baseConditions.liquidityLevels,
        slippage: baseConditions.slippage * 0.8
      },
      networkConditions: {
        gasPrice: parseGwei('15'),
        blockTime: 12,
        congestion: 'low',
        mempoolSize: 800
      },
      userBehavior: {
        concurrentUsers: 5,
        transactionFrequency: 0.5,
        averageTransactionSize: parseEther('0.5'),
        behaviorPatterns: ['range_trading', 'accumulation']
      },
      externalFactors: []
    })

    return scenarios
  }

  // Generate Stress Test Scenarios
  generateStressTestScenarios(): TestScenario[] {
    return [
      {
        name: 'Maximum Load Test',
        description: 'Test system under maximum possible load',
        marketConditions: {
          tokenPrices: {
            '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('5000'),
            '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'),
            '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'),
          },
          liquidityLevels: {
            'ETH/DAI': 10000000,
            'ETH/USDC': 8000000,
            'DAI/USDC': 5000000
          },
          volatility: 0.6,
          tradingVolume: parseEther('1000000000'),
          slippage: 0.05
        },
        networkConditions: {
          gasPrice: parseGwei('1000'), // Extreme gas prices
          blockTime: 60, // Very slow blocks
          congestion: 'high',
          mempoolSize: 100000
        },
        userBehavior: {
          concurrentUsers: 1000,
          transactionFrequency: 10,
          averageTransactionSize: parseEther('100'),
          behaviorPatterns: ['stress_testing', 'ddos_simulation']
        },
        externalFactors: [
          {
            type: 'external_call',
            description: 'External systems under extreme load',
            impact: 'high',
            parameters: {
              latency: 5000,
              failureRate: 0.3
            }
          }
        ]
      },

      {
        name: 'Cascade Failure Test',
        description: 'Test behavior when multiple systems fail simultaneously',
        marketConditions: {
          tokenPrices: {
            '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('100'), // Extreme crash
            '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('0.5'), // Stablecoin depeg
            '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('0.8'), // Stablecoin depeg
          },
          liquidityLevels: {
            'ETH/DAI': 10000, // Almost no liquidity
            'ETH/USDC': 8000,
            'DAI/USDC': 5000
          },
          volatility: 1.0, // Maximum volatility
          tradingVolume: parseEther('100000000'),
          slippage: 0.5 // Extreme slippage
        },
        networkConditions: {
          gasPrice: parseGwei('2000'),
          blockTime: 120,
          congestion: 'high',
          mempoolSize: 200000
        },
        userBehavior: {
          concurrentUsers: 500,
          transactionFrequency: 15,
          averageTransactionSize: parseEther('50'),
          behaviorPatterns: ['emergency_exit', 'system_failure_response']
        },
        externalFactors: [
          {
            type: 'oracle_price',
            description: 'Price oracles fail or become extremely unreliable',
            impact: 'high',
            parameters: {
              reliability: 0.1,
              maxDeviation: 0.9
            }
          },
          {
            type: 'liquidity_change',
            description: 'Liquidity completely dries up',
            impact: 'high',
            parameters: {
              withdrawalRate: 0.95
            }
          }
        ]
      }
    ]
  }

  // Generate Edge Case Scenarios
  generateEdgeCaseScenarios(): TestScenario[] {
    return [
      {
        name: 'Zero Liquidity Edge Case',
        description: 'Test behavior when liquidity approaches zero',
        marketConditions: {
          tokenPrices: {
            '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('2000'),
            '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'),
            '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'),
          },
          liquidityLevels: {
            'ETH/DAI': 1, // Minimal liquidity
            'ETH/USDC': 1,
            'DAI/USDC': 1
          },
          volatility: 0.1,
          tradingVolume: parseEther('1000'),
          slippage: 0.99 // Almost 100% slippage
        },
        networkConditions: {
          gasPrice: parseGwei('1'), // Minimal gas
          blockTime: 12,
          congestion: 'low',
          mempoolSize: 10
        },
        userBehavior: {
          concurrentUsers: 1,
          transactionFrequency: 0.1,
          averageTransactionSize: parseEther('0.001'),
          behaviorPatterns: ['minimal_trading']
        },
        externalFactors: []
      },

      {
        name: 'Extreme Price Precision',
        description: 'Test with very small token amounts and prices',
        marketConditions: {
          tokenPrices: {
            '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: 1n, // 1 wei
            '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('0.000001'),
            '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('0.000001'),
          },
          liquidityLevels: {
            'ETH/DAI': 1000000,
            'ETH/USDC': 800000,
            'DAI/USDC': 500000
          },
          volatility: 0.1,
          tradingVolume: 1000n, // Very small volume
          slippage: 0.005
        },
        networkConditions: {
          gasPrice: parseGwei('20'),
          blockTime: 12,
          congestion: 'low',
          mempoolSize: 1000
        },
        userBehavior: {
          concurrentUsers: 5,
          transactionFrequency: 1,
          averageTransactionSize: 1n, // 1 wei transactions
          behaviorPatterns: ['precision_testing']
        },
        externalFactors: []
      },

      {
        name: 'Maximum Integer Values',
        description: 'Test with maximum possible integer values',
        marketConditions: {
          tokenPrices: {
            '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('1000000000'), // Very high price
            '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'),
            '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'),
          },
          liquidityLevels: {
            'ETH/DAI': Number.MAX_SAFE_INTEGER,
            'ETH/USDC': Number.MAX_SAFE_INTEGER,
            'DAI/USDC': Number.MAX_SAFE_INTEGER
          },
          volatility: 0.1,
          tradingVolume: parseEther('1000000000000'), // Very high volume
          slippage: 0.005
        },
        networkConditions: {
          gasPrice: parseGwei('10000'), // Very high gas
          blockTime: 1, // Very fast blocks
          congestion: 'low',
          mempoolSize: 1000000
        },
        userBehavior: {
          concurrentUsers: 10000,
          transactionFrequency: 100,
          averageTransactionSize: parseEther('1000000'),
          behaviorPatterns: ['max_value_testing']
        },
        externalFactors: []
      }
    ]
  }

  // Generate Regression Test Scenarios
  generateRegressionScenarios(previousResults: TestResult[]): TestScenario[] {
    const scenarios: TestScenario[] = []

    // Analyze previous failures and create scenarios to prevent regression
    const failedTests = previousResults.filter(r => r.status === 'failed')
    
    if (failedTests.length > 0) {
      // Create scenario based on common failure patterns
      const highGasFailures = failedTests.filter(r => 
        r.errors.some(e => e.type === 'gas_limit')
      )

      if (highGasFailures.length > 0) {
        scenarios.push({
          name: 'Gas Limit Regression Test',
          description: 'Prevent regression of gas-related failures',
          marketConditions: {
            tokenPrices: {
              '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('2000'),
              '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'),
              '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'),
            },
            liquidityLevels: {
              'ETH/DAI': 1000000,
              'ETH/USDC': 800000,
              'DAI/USDC': 500000
            },
            volatility: 0.1,
            tradingVolume: parseEther('10000000'),
            slippage: 0.005
          },
          networkConditions: {
            gasPrice: parseGwei('150'), // High gas to trigger limits
            blockTime: 12,
            congestion: 'high',
            mempoolSize: 15000
          },
          userBehavior: {
            concurrentUsers: 50,
            transactionFrequency: 3,
            averageTransactionSize: parseEther('5'),
            behaviorPatterns: ['gas_limit_testing']
          },
          externalFactors: []
        })
      }
    }

    // Create performance regression scenario
    const slowTests = previousResults.filter(r => r.executionTime > 10000)
    if (slowTests.length > 0) {
      scenarios.push({
        name: 'Performance Regression Test',
        description: 'Ensure performance has not degraded',
        marketConditions: {
          tokenPrices: {
            '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('2000'),
            '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'),
            '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'),
          },
          liquidityLevels: {
            'ETH/DAI': 1000000,
            'ETH/USDC': 800000,
            'DAI/USDC': 500000
          },
          volatility: 0.1,
          tradingVolume: parseEther('10000000'),
          slippage: 0.005
        },
        networkConditions: {
          gasPrice: parseGwei('20'),
          blockTime: 12,
          congestion: 'low',
          mempoolSize: 1000
        },
        userBehavior: {
          concurrentUsers: 20,
          transactionFrequency: 2,
          averageTransactionSize: parseEther('2'),
          behaviorPatterns: ['performance_testing']
        },
        externalFactors: []
      })
    }

    return scenarios
  }

  // Generate Custom Scenarios
  generateCustomScenario(config: ScenarioGenerationConfig): TestScenario {
    const baseScenario = config.baseConditions

    return {
      name: baseScenario.name || 'Custom Scenario',
      description: baseScenario.description || 'User-generated custom test scenario',
      marketConditions: this.applyVariations(
        baseScenario.marketConditions || this.getDefaultMarketConditions(),
        config.variationFactors
      ),
      networkConditions: baseScenario.networkConditions || this.getDefaultNetworkConditions(),
      userBehavior: baseScenario.userBehavior || this.getDefaultUserBehavior(),
      externalFactors: [...(baseScenario.externalFactors || []), ...config.customFactors]
    }
  }

  // Scenario Analysis and Optimization
  analyzeScenarioImpact(scenario: TestScenario): {
    riskLevel: 'low' | 'medium' | 'high' | 'extreme'
    impactAreas: string[]
    recommendations: string[]
  } {
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'low'
    const impactAreas: string[] = []
    const recommendations: string[] = []

    // Analyze market conditions
    if (scenario.marketConditions.volatility > 0.3) {
      riskLevel = 'high'
      impactAreas.push('price_stability')
      recommendations.push('Implement price impact protection')
    }

    if (scenario.marketConditions.slippage > 0.1) {
      riskLevel = 'high'
      impactAreas.push('trade_execution')
      recommendations.push('Add slippage protection mechanisms')
    }

    // Analyze network conditions
    if (scenario.networkConditions.gasPrice > parseGwei('100')) {
      if (riskLevel === 'low') riskLevel = 'medium'
      impactAreas.push('transaction_costs')
      recommendations.push('Optimize gas usage and consider gas limit adjustments')
    }

    if (scenario.networkConditions.congestion === 'high') {
      if (riskLevel !== 'high' && riskLevel !== 'extreme') riskLevel = 'medium'
      impactAreas.push('confirmation_times')
      recommendations.push('Implement transaction queuing and retry mechanisms')
    }

    // Analyze user behavior
    if (scenario.userBehavior.concurrentUsers > 100) {
      if (riskLevel === 'low') riskLevel = 'medium'
      impactAreas.push('system_load')
      recommendations.push('Implement rate limiting and load balancing')
    }

    // Analyze external factors
    scenario.externalFactors.forEach(factor => {
      if (factor.impact === 'high') {
        riskLevel = 'high'
        impactAreas.push(`external_${factor.type}`)
        recommendations.push(`Implement fallback mechanisms for ${factor.type}`)
      }
    })

    // Check for extreme scenarios
    if (scenario.marketConditions.volatility > 0.7 && 
        scenario.networkConditions.gasPrice > parseGwei('500')) {
      riskLevel = 'extreme'
      recommendations.push('Consider emergency pause mechanisms')
    }

    return {
      riskLevel,
      impactAreas,
      recommendations
    }
  }

  // Utility Methods
  private adjustPrices(prices: Record<Address, bigint>, multiplier: number): Record<Address, bigint> {
    const adjusted: Record<Address, bigint> = {}
    Object.entries(prices).forEach(([address, price]) => {
      adjusted[address as Address] = BigInt(Math.floor(Number(price) * multiplier))
    })
    return adjusted
  }

  private adjustLiquidity(liquidity: Record<string, number>, multiplier: number): Record<string, number> {
    const adjusted: Record<string, number> = {}
    Object.entries(liquidity).forEach(([pair, amount]) => {
      adjusted[pair] = Math.floor(amount * multiplier)
    })
    return adjusted
  }

  private applyVariations(
    conditions: MarketConditions, 
    factors: ScenarioGenerationConfig['variationFactors']
  ): MarketConditions {
    return {
      ...conditions,
      tokenPrices: this.adjustPrices(conditions.tokenPrices, 1 + (factors.priceVariation || 0)),
      liquidityLevels: this.adjustLiquidity(conditions.liquidityLevels, 1 + (factors.liquidityVariation || 0)),
      volatility: Math.max(0, Math.min(1, conditions.volatility + (factors.priceVariation || 0) * 0.1))
    }
  }

  private getDefaultMarketConditions(): MarketConditions {
    return {
      tokenPrices: {
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('2000'),
        '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'),
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'),
      },
      liquidityLevels: {
        'ETH/DAI': 1000000,
        'ETH/USDC': 800000,
        'DAI/USDC': 500000
      },
      volatility: 0.1,
      tradingVolume: parseEther('10000000'),
      slippage: 0.005
    }
  }

  private getDefaultNetworkConditions(): NetworkConditions {
    return {
      gasPrice: parseGwei('20'),
      blockTime: 12,
      congestion: 'low',
      mempoolSize: 1000
    }
  }

  private getDefaultUserBehavior(): UserBehavior {
    return {
      concurrentUsers: 10,
      transactionFrequency: 1,
      averageTransactionSize: parseEther('1'),
      behaviorPatterns: ['normal_trading']
    }
  }
}

// Export singleton instance
export const scenarioGenerator = ScenarioGenerator.getInstance()