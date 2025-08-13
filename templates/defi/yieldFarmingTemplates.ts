'use client'

import { FlowTemplate } from '@/services/templates/templateEngine'
import { Flow } from '@/services/flowDesigner/flowBuilder'
import { Address } from 'viem'

// Yield Farming Strategy Template
export const YIELD_FARMING_STRATEGY_TEMPLATE: FlowTemplate = {
  id: 'yield-farming-strategy',
  name: 'Yield Farming Strategy',
  description: 'Automated yield farming strategy with LP token staking, reward harvesting, and compound reinvestment',
  category: 'DeFi',
  difficulty: 'advanced',
  tags: ['yield-farming', 'staking', 'rewards', 'compound', 'defi', 'lp-tokens'],
  author: {
    address: '0x742d35Cc6634C0532925a3b8D0b0C0f1DbF8E8C0' as Address,
    name: 'Contract Stresser Team',
    verified: true
  },
  flow: {
    id: 'template_yield_farming',
    name: 'Yield Farming Strategy',
    description: 'Automated yield farming with compound reinvestment',
    blocks: [
      {
        id: 'check_lp_balance',
        type: 'validation',
        position: { x: 100, y: 100 },
        name: 'Check LP Token Balance',
        description: 'Verify sufficient LP tokens for staking',
        inputs: [],
        outputs: ['sufficient', 'insufficient'],
        config: {
          validationType: 'balance_check',
          tokenAddress: '${lpTokenAddress}',
          minimumAmount: '${stakingAmount}',
          userAddress: '${userAddress}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'approve_lp_tokens',
        type: 'token_approval',
        position: { x: 300, y: 100 },
        name: 'Approve LP Tokens',
        description: 'Approve farming contract to spend LP tokens',
        inputs: ['balance_sufficient'],
        outputs: ['success', 'error'],
        config: {
          tokenAddress: '${lpTokenAddress}',
          spenderAddress: '${farmingContract}',
          amount: '${stakingAmount}',
          unlimited: false
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'stake_lp_tokens',
        type: 'contract_call',
        position: { x: 500, y: 100 },
        name: 'Stake LP Tokens',
        description: 'Deposit LP tokens into farming contract',
        inputs: ['tokens_approved'],
        outputs: ['success', 'error'],
        config: {
          contractAddress: '${farmingContract}',
          functionName: 'deposit',
          args: ['${poolId}', '${stakingAmount}'],
          gasLimit: 200000
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'harvest_schedule',
        type: 'delay',
        position: { x: 700, y: 100 },
        name: 'Harvest Schedule',
        description: 'Wait for harvest interval',
        inputs: ['staking_complete'],
        outputs: ['harvest_time', 'timeout'],
        config: {
          delayType: 'fixed_interval',
          interval: '${harvestInterval}',
          maxIterations: '${maxHarvests}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'check_pending_rewards',
        type: 'validation',
        position: { x: 900, y: 50 },
        name: 'Check Pending Rewards',
        description: 'Verify rewards are available to harvest',
        inputs: ['harvest_ready'],
        outputs: ['rewards_available', 'no_rewards'],
        config: {
          validationType: 'pending_rewards',
          farmingContract: '${farmingContract}',
          poolId: '${poolId}',
          userAddress: '${userAddress}',
          minimumReward: '${minimumHarvestAmount}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'harvest_rewards',
        type: 'contract_call',
        position: { x: 1100, y: 50 },
        name: 'Harvest Rewards',
        description: 'Claim farming rewards',
        inputs: ['rewards_ready'],
        outputs: ['success', 'error'],
        config: {
          contractAddress: '${farmingContract}',
          functionName: 'harvest',
          args: ['${poolId}'],
          gasLimit: 250000
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'compound_rewards',
        type: 'conditional',
        position: { x: 900, y: 150 },
        name: 'Compound Decision',
        description: 'Decide whether to compound or withdraw rewards',
        inputs: ['rewards_harvested'],
        outputs: ['compound', 'withdraw'],
        config: {
          conditionType: 'boolean',
          expression: '${enableCompounding}',
          description: 'Auto-compound rewards into more LP tokens'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'swap_half_rewards',
        type: 'contract_call',
        position: { x: 1100, y: 200 },
        name: 'Swap Half Rewards',
        description: 'Swap half of reward tokens for pair token',
        inputs: ['compound_enabled'],
        outputs: ['success', 'error'],
        config: {
          contractAddress: '${dexRouter}',
          functionName: 'swapExactTokensForTokens',
          args: [
            '${halfRewardAmount}',
            '${minOutputAmount}',
            '${swapPath}',
            '${userAddress}',
            '${deadline}'
          ],
          gasLimit: 300000
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'add_liquidity',
        type: 'contract_call',
        position: { x: 1300, y: 200 },
        name: 'Add Liquidity',
        description: 'Create new LP tokens from rewards',
        inputs: ['swap_complete'],
        outputs: ['success', 'error'],
        config: {
          contractAddress: '${dexRouter}',
          functionName: 'addLiquidity',
          args: [
            '${rewardToken}',
            '${pairToken}',
            '${rewardAmount}',
            '${pairAmount}',
            '${minRewardAmount}',
            '${minPairAmount}',
            '${userAddress}',
            '${deadline}'
          ],
          gasLimit: 350000
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'restake_lp',
        type: 'contract_call',
        position: { x: 1500, y: 200 },
        name: 'Restake LP Tokens',
        description: 'Stake newly created LP tokens',
        inputs: ['liquidity_added'],
        outputs: ['success', 'error'],
        config: {
          contractAddress: '${farmingContract}',
          functionName: 'deposit',
          args: ['${poolId}', '${newLPAmount}'],
          gasLimit: 200000
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'performance_tracking',
        type: 'validation',
        position: { x: 1300, y: 50 },
        name: 'Performance Tracking',
        description: 'Track farming performance and APY',
        inputs: ['cycle_complete'],
        outputs: ['continue', 'stop'],
        config: {
          validationType: 'performance_check',
          targetAPY: '${targetAPY}',
          actualAPY: '${calculatedAPY}',
          minPerformance: '${minimumAPY}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      }
    ],
    connections: [
      {
        id: 'conn_1',
        sourceBlock: 'check_lp_balance',
        sourceOutput: 'sufficient',
        targetBlock: 'approve_lp_tokens',
        targetInput: 'balance_sufficient'
      },
      {
        id: 'conn_2',
        sourceBlock: 'approve_lp_tokens',
        sourceOutput: 'success',
        targetBlock: 'stake_lp_tokens',
        targetInput: 'tokens_approved'
      },
      {
        id: 'conn_3',
        sourceBlock: 'stake_lp_tokens',
        sourceOutput: 'success',
        targetBlock: 'harvest_schedule',
        targetInput: 'staking_complete'
      },
      {
        id: 'conn_4',
        sourceBlock: 'harvest_schedule',
        sourceOutput: 'harvest_time',
        targetBlock: 'check_pending_rewards',
        targetInput: 'harvest_ready'
      },
      {
        id: 'conn_5',
        sourceBlock: 'check_pending_rewards',
        sourceOutput: 'rewards_available',
        targetBlock: 'harvest_rewards',
        targetInput: 'rewards_ready'
      },
      {
        id: 'conn_6',
        sourceBlock: 'harvest_rewards',
        sourceOutput: 'success',
        targetBlock: 'compound_rewards',
        targetInput: 'rewards_harvested'
      },
      {
        id: 'conn_7',
        sourceBlock: 'compound_rewards',
        sourceOutput: 'compound',
        targetBlock: 'swap_half_rewards',
        targetInput: 'compound_enabled'
      },
      {
        id: 'conn_8',
        sourceBlock: 'swap_half_rewards',
        sourceOutput: 'success',
        targetBlock: 'add_liquidity',
        targetInput: 'swap_complete'
      },
      {
        id: 'conn_9',
        sourceBlock: 'add_liquidity',
        sourceOutput: 'success',
        targetBlock: 'restake_lp',
        targetInput: 'liquidity_added'
      },
      {
        id: 'conn_10',
        sourceBlock: 'restake_lp',
        sourceOutput: 'success',
        targetBlock: 'performance_tracking',
        targetInput: 'cycle_complete'
      },
      {
        id: 'conn_11',
        sourceBlock: 'performance_tracking',
        sourceOutput: 'continue',
        targetBlock: 'harvest_schedule',
        targetInput: 'staking_complete'
      }
    ],
    globalConfig: {
      maxGasPrice: '40000000000', // 40 gwei
      slippageTolerance: '1.0', // 1%
      deadlineBuffer: 900 // 15 minutes
    },
    metadata: {
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  } as Flow,
  parameters: [
    {
      name: 'lpTokenAddress',
      type: 'address',
      description: 'LP token contract address to farm',
      required: true,
      validation: { 
        isContract: true,
        pattern: '^0x[a-fA-F0-9]{40}$'
      }
    },
    {
      name: 'farmingContract',
      type: 'address',
      description: 'Yield farming contract address',
      required: true,
      validation: { 
        isContract: true,
        pattern: '^0x[a-fA-F0-9]{40}$'
      }
    },
    {
      name: 'dexRouter',
      type: 'address',
      description: 'DEX router for token swaps',
      required: true,
      defaultValue: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      validation: { isContract: true }
    },
    {
      name: 'poolId',
      type: 'number',
      description: 'Farming pool ID',
      required: true,
      validation: { min: 0 }
    },
    {
      name: 'stakingAmount',
      type: 'amount',
      description: 'Amount of LP tokens to stake',
      required: true,
      validation: { min: '1000000000000000' } // 0.001 minimum
    },
    {
      name: 'userAddress',
      type: 'address',
      description: 'User wallet address',
      required: true,
      validation: { pattern: '^0x[a-fA-F0-9]{40}$' }
    },
    {
      name: 'harvestInterval',
      type: 'number',
      description: 'Harvest interval in seconds',
      required: true,
      defaultValue: 86400, // 24 hours
      validation: { min: 3600, max: 604800 } // 1 hour to 1 week
    },
    {
      name: 'enableCompounding',
      type: 'boolean',
      description: 'Auto-compound rewards into more LP tokens',
      required: true,
      defaultValue: true
    },
    {
      name: 'minimumHarvestAmount',
      type: 'amount',
      description: 'Minimum reward amount to trigger harvest',
      required: true,
      defaultValue: '1000000000000000000', // 1 token
      validation: { min: '0' }
    },
    {
      name: 'rewardToken',
      type: 'address',
      description: 'Reward token contract address',
      required: true,
      validation: { 
        isContract: true,
        implements: 'IERC20'
      }
    },
    {
      name: 'pairToken',
      type: 'address',
      description: 'Pair token for LP creation',
      required: true,
      validation: { 
        isContract: true,
        implements: 'IERC20'
      }
    },
    {
      name: 'targetAPY',
      type: 'string',
      description: 'Target APY percentage (e.g., "50.5" for 50.5%)',
      required: false,
      defaultValue: '20.0',
      validation: { 
        pattern: '^[0-9]+\\.?[0-9]*$'
      }
    },
    {
      name: 'minimumAPY',
      type: 'string',
      description: 'Minimum acceptable APY to continue farming',
      required: false,
      defaultValue: '5.0',
      validation: { 
        pattern: '^[0-9]+\\.?[0-9]*$'
      }
    },
    {
      name: 'maxHarvests',
      type: 'number',
      description: 'Maximum number of harvest cycles',
      required: false,
      defaultValue: 30,
      validation: { min: 1, max: 365 }
    }
  ],
  requirements: [
    {
      type: 'balance',
      description: 'Sufficient LP token balance for staking',
      details: { tokenType: 'LP', minimumBalance: 'stakingAmount' },
      optional: false
    },
    {
      type: 'approval',
      description: 'LP token approval for farming contract',
      details: { tokenType: 'LP', spender: 'farmingContract' },
      optional: false
    },
    {
      type: 'contract',
      description: 'Valid farming contract with active pool',
      details: { contractAddress: 'farmingContract', interface: 'IMasterChef' },
      optional: false
    },
    {
      type: 'balance',
      description: 'Sufficient ETH for gas fees',
      details: { tokenType: 'ETH', minimumBalance: '0.1' },
      optional: false
    }
  ],
  metadata: {
    version: '1.1.0',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    compatibility: {
      minClientVersion: '1.0.0',
      blockVersions: {
        'validation': '1.0.0',
        'contract_call': '1.0.0',
        'token_approval': '1.0.0',
        'conditional': '1.0.0',
        'delay': '1.0.0'
      }
    },
    license: 'MIT',
    documentation: 'https://docs.contractstresser.com/templates/yield-farming'
  },
  usage: {
    downloads: 1567,
    ratings: [
      {
        userId: '0x5678901234567890123456789012345678901234' as Address,
        score: 5,
        comment: 'Excellent automated farming strategy!',
        timestamp: new Date('2024-01-12')
      },
      {
        userId: '0x6789012345678901234567890123456789012345' as Address,
        score: 4,
        comment: 'Works well but gas costs can be high',
        timestamp: new Date('2024-01-20')
      }
    ],
    averageRating: 4.6
  },
  status: 'published',
  visibility: 'public'
}

export const YIELD_FARMING_TEMPLATES = [YIELD_FARMING_STRATEGY_TEMPLATE]