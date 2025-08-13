'use client'

import { FlowTemplate } from '@/services/templates/templateEngine'
import { Flow } from '@/services/flowDesigner/flowBuilder'
import { Address } from 'viem'

// ERC20 ⟷ ERC1155 Atomic Swap Template
export const ERC20_ERC1155_SWAP_TEMPLATE: FlowTemplate = {
  id: 'erc20-erc1155-swap',
  name: 'ERC20 ⟷ ERC1155 Atomic Swap',
  description: 'Exchange ERC20 tokens for ERC1155 NFTs atomically with built-in safety checks and deadline protection',
  category: 'DeFi',
  difficulty: 'intermediate',
  tags: ['swap', 'atomic', 'nft', 'defi', 'erc20', 'erc1155'],
  author: {
    address: '0x742d35Cc6634C0532925a3b8D0b0C0f1DbF8E8C0' as Address,
    name: 'Contract Stresser Team',
    verified: true
  },
  flow: {
    id: 'template_erc20_erc1155_swap',
    name: 'ERC20 ⟷ ERC1155 Atomic Swap',
    description: 'Atomically exchange ERC20 tokens for ERC1155 NFTs',
    blocks: [
      {
        id: 'validate_balances',
        type: 'validation',
        position: { x: 100, y: 100 },
        name: 'Validate Balances',
        description: 'Check ERC20 balance and ERC1155 ownership',
        inputs: [],
        outputs: ['success', 'error'],
        config: {
          validationType: 'balance_check',
          erc20Token: '${erc20Token}',
          erc20Amount: '${erc20Amount}',
          erc1155Token: '${erc1155Token}',
          erc1155TokenId: '${nftTokenId}',
          counterpartyAddress: '${counterpartyAddress}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'approve_erc20',
        type: 'token_approval',
        position: { x: 300, y: 50 },
        name: 'Approve ERC20 Transfer',
        description: 'Approve atomic swap contract to transfer ERC20 tokens',
        inputs: ['trigger'],
        outputs: ['success', 'error'],
        config: {
          tokenAddress: '${erc20Token}',
          spenderAddress: '${atomicSwapContract}',
          amount: '${erc20Amount}',
          unlimited: false
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'approve_erc1155',
        type: 'token_approval',
        position: { x: 300, y: 150 },
        name: 'Approve ERC1155 Transfer',
        description: 'Approve atomic swap contract for ERC1155 transfers',
        inputs: ['trigger'],
        outputs: ['success', 'error'],
        config: {
          tokenAddress: '${erc1155Token}',
          spenderAddress: '${atomicSwapContract}',
          operator: true,
          approved: true
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'create_swap_order',
        type: 'contract_call',
        position: { x: 500, y: 100 },
        name: 'Create Swap Order',
        description: 'Create atomic swap order with deadline',
        inputs: ['erc20_approved', 'erc1155_approved'],
        outputs: ['success', 'error'],
        config: {
          contractAddress: '${atomicSwapContract}',
          functionName: 'createSwapOrder',
          args: [
            '${erc20Token}',
            '${erc20Amount}',
            '${erc1155Token}',
            '${nftTokenId}',
            '${counterpartyAddress}',
            '${deadline}'
          ],
          gasLimit: 150000
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'wait_for_counterparty',
        type: 'delay',
        position: { x: 700, y: 100 },
        name: 'Wait for Counterparty',
        description: 'Wait for counterparty to accept the swap',
        inputs: ['order_created'],
        outputs: ['accepted', 'timeout'],
        config: {
          delayType: 'wait_for_event',
          eventName: 'SwapAccepted',
          maxWaitTime: '${deadline}',
          checkInterval: 5000
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'execute_swap',
        type: 'contract_call',
        position: { x: 900, y: 50 },
        name: 'Execute Swap',
        description: 'Execute the atomic swap',
        inputs: ['swap_accepted'],
        outputs: ['success', 'error'],
        config: {
          contractAddress: '${atomicSwapContract}',
          functionName: 'executeSwap',
          args: ['${swapOrderId}'],
          gasLimit: 200000
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'cancel_swap',
        type: 'contract_call',
        position: { x: 900, y: 150 },
        name: 'Cancel Swap',
        description: 'Cancel swap if timeout occurs',
        inputs: ['timeout'],
        outputs: ['success', 'error'],
        config: {
          contractAddress: '${atomicSwapContract}',
          functionName: 'cancelSwap',
          args: ['${swapOrderId}'],
          gasLimit: 100000
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'verify_completion',
        type: 'validation',
        position: { x: 1100, y: 100 },
        name: 'Verify Swap Completion',
        description: 'Verify tokens were transferred correctly',
        inputs: ['swap_executed'],
        outputs: ['verified', 'failed'],
        config: {
          validationType: 'transfer_verification',
          checkERC20Balance: true,
          checkERC1155Ownership: true,
          expectedERC20Recipient: '${counterpartyAddress}',
          expectedERC1155Recipient: '${userAddress}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      }
    ],
    connections: [
      {
        id: 'conn_1',
        sourceBlock: 'validate_balances',
        sourceOutput: 'success',
        targetBlock: 'approve_erc20',
        targetInput: 'trigger'
      },
      {
        id: 'conn_2',
        sourceBlock: 'validate_balances',
        sourceOutput: 'success',
        targetBlock: 'approve_erc1155',
        targetInput: 'trigger'
      },
      {
        id: 'conn_3',
        sourceBlock: 'approve_erc20',
        sourceOutput: 'success',
        targetBlock: 'create_swap_order',
        targetInput: 'erc20_approved'
      },
      {
        id: 'conn_4',
        sourceBlock: 'approve_erc1155',
        sourceOutput: 'success',
        targetBlock: 'create_swap_order',
        targetInput: 'erc1155_approved'
      },
      {
        id: 'conn_5',
        sourceBlock: 'create_swap_order',
        sourceOutput: 'success',
        targetBlock: 'wait_for_counterparty',
        targetInput: 'order_created'
      },
      {
        id: 'conn_6',
        sourceBlock: 'wait_for_counterparty',
        sourceOutput: 'accepted',
        targetBlock: 'execute_swap',
        targetInput: 'swap_accepted'
      },
      {
        id: 'conn_7',
        sourceBlock: 'wait_for_counterparty',
        sourceOutput: 'timeout',
        targetBlock: 'cancel_swap',
        targetInput: 'timeout'
      },
      {
        id: 'conn_8',
        sourceBlock: 'execute_swap',
        sourceOutput: 'success',
        targetBlock: 'verify_completion',
        targetInput: 'swap_executed'
      }
    ],
    globalConfig: {
      maxGasPrice: '50000000000', // 50 gwei
      slippageTolerance: '0.5', // 0.5%
      deadlineBuffer: 300 // 5 minutes
    },
    metadata: {
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  } as Flow,
  parameters: [
    {
      name: 'erc20Token',
      type: 'address',
      description: 'ERC20 token contract address to swap',
      required: true,
      validation: { 
        isContract: true, 
        implements: 'IERC20',
        pattern: '^0x[a-fA-F0-9]{40}$'
      }
    },
    {
      name: 'erc1155Token',
      type: 'address',
      description: 'ERC1155 token contract address to receive',
      required: true,
      validation: { 
        isContract: true, 
        implements: 'IERC1155',
        pattern: '^0x[a-fA-F0-9]{40}$'
      }
    },
    {
      name: 'erc20Amount',
      type: 'amount',
      description: 'Amount of ERC20 tokens to swap (in wei)',
      required: true,
      validation: { 
        min: '1',
        max: 'balance'
      }
    },
    {
      name: 'nftTokenId',
      type: 'number',
      description: 'ERC1155 token ID to receive',
      required: true,
      validation: { 
        min: 0
      }
    },
    {
      name: 'counterpartyAddress',
      type: 'address',
      description: 'Address of the swap counterparty',
      required: true,
      validation: { 
        pattern: '^0x[a-fA-F0-9]{40}$'
      }
    },
    {
      name: 'atomicSwapContract',
      type: 'address',
      description: 'Atomic swap contract address',
      required: true,
      defaultValue: '0x1234567890123456789012345678901234567890',
      validation: { 
        isContract: true,
        pattern: '^0x[a-fA-F0-9]{40}$'
      }
    },
    {
      name: 'deadline',
      type: 'number',
      description: 'Swap deadline in seconds from now',
      required: true,
      defaultValue: 3600, // 1 hour
      validation: { 
        min: 300, // 5 minutes minimum
        max: 86400 // 24 hours maximum
      }
    },
    {
      name: 'userAddress',
      type: 'address',
      description: 'Your wallet address',
      required: true,
      validation: { 
        pattern: '^0x[a-fA-F0-9]{40}$'
      }
    }
  ],
  requirements: [
    {
      type: 'balance',
      description: 'Sufficient ERC20 token balance for the swap',
      details: { tokenType: 'ERC20', minimumBalance: 'erc20Amount' },
      optional: false
    },
    {
      type: 'approval',
      description: 'ERC20 token approval for atomic swap contract',
      details: { tokenType: 'ERC20', spender: 'atomicSwapContract' },
      optional: false
    },
    {
      type: 'approval',
      description: 'ERC1155 operator approval for atomic swap contract',
      details: { tokenType: 'ERC1155', operator: 'atomicSwapContract' },
      optional: false
    },
    {
      type: 'contract',
      description: 'Valid atomic swap contract deployment',
      details: { contractAddress: 'atomicSwapContract', interface: 'IAtomicSwap' },
      optional: false
    }
  ],
  metadata: {
    version: '1.0.0',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    compatibility: {
      minClientVersion: '1.0.0',
      blockVersions: {
        'token_approval': '1.0.0',
        'contract_call': '1.0.0',
        'validation': '1.0.0',
        'delay': '1.0.0'
      }
    },
    license: 'MIT',
    documentation: 'https://docs.contractstresser.com/templates/atomic-swaps'
  },
  usage: {
    downloads: 847,
    ratings: [
      {
        userId: '0x1234567890123456789012345678901234567890' as Address,
        score: 5,
        comment: 'Perfect for NFT trading!',
        timestamp: new Date('2024-01-15')
      },
      {
        userId: '0x2345678901234567890123456789012345678901' as Address,
        score: 4,
        comment: 'Works great but needs better error handling',
        timestamp: new Date('2024-01-20')
      }
    ],
    averageRating: 4.2,
    lastUsed: new Date('2024-01-25')
  },
  status: 'published',
  visibility: 'public'
}

// Liquidity Provision Template
export const LIQUIDITY_PROVISION_TEMPLATE: FlowTemplate = {
  id: 'liquidity-provision',
  name: 'Liquidity Provision Flow',
  description: 'Add liquidity to a DEX pair with optimal routing, slippage protection, and automatic position management',
  category: 'DeFi',
  difficulty: 'advanced',
  tags: ['liquidity', 'defi', 'dex', 'amm', 'yield'],
  author: {
    address: '0x742d35Cc6634C0532925a3b8D0b0C0f1DbF8E8C0' as Address,
    name: 'Contract Stresser Team',
    verified: true
  },
  flow: {
    id: 'template_liquidity_provision',
    name: 'Liquidity Provision Flow',
    description: 'Add liquidity to DEX with optimal routing',
    blocks: [
      {
        id: 'check_pair_exists',
        type: 'validation',
        position: { x: 100, y: 100 },
        name: 'Check Pair Exists',
        description: 'Validate that the trading pair exists',
        inputs: [],
        outputs: ['exists', 'not_exists'],
        config: {
          validationType: 'pair_exists',
          tokenA: '${tokenA}',
          tokenB: '${tokenB}',
          dexRouter: '${dexRouter}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'calculate_optimal_amounts',
        type: 'calculation',
        position: { x: 300, y: 100 },
        name: 'Calculate Optimal Amounts',
        description: 'Calculate optimal token amounts based on current reserves',
        inputs: ['pair_exists'],
        outputs: ['calculated', 'error'],
        config: {
          calculationType: 'optimal_liquidity',
          inputAmount: '${liquidityAmount}',
          inputToken: '${primaryToken}',
          slippageTolerance: '${slippageTolerance}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'approve_token_a',
        type: 'token_approval',
        position: { x: 500, y: 50 },
        name: 'Approve Token A',
        description: 'Approve DEX router for Token A transfers',
        inputs: ['amounts_calculated'],
        outputs: ['success', 'error'],
        config: {
          tokenAddress: '${tokenA}',
          spenderAddress: '${dexRouter}',
          amount: '${calculatedAmountA}',
          unlimited: false
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'approve_token_b',
        type: 'token_approval',
        position: { x: 500, y: 150 },
        name: 'Approve Token B',
        description: 'Approve DEX router for Token B transfers',
        inputs: ['amounts_calculated'],
        outputs: ['success', 'error'],
        config: {
          tokenAddress: '${tokenB}',
          spenderAddress: '${dexRouter}',
          amount: '${calculatedAmountB}',
          unlimited: false
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'add_liquidity',
        type: 'contract_call',
        position: { x: 700, y: 100 },
        name: 'Add Liquidity',
        description: 'Add liquidity to the DEX pair',
        inputs: ['token_a_approved', 'token_b_approved'],
        outputs: ['success', 'error'],
        config: {
          contractAddress: '${dexRouter}',
          functionName: 'addLiquidity',
          args: [
            '${tokenA}',
            '${tokenB}',
            '${calculatedAmountA}',
            '${calculatedAmountB}',
            '${minAmountA}',
            '${minAmountB}',
            '${userAddress}',
            '${deadline}'
          ],
          gasLimit: 300000
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'verify_lp_tokens',
        type: 'validation',
        position: { x: 900, y: 100 },
        name: 'Verify LP Tokens',
        description: 'Verify LP tokens were received',
        inputs: ['liquidity_added'],
        outputs: ['verified', 'failed'],
        config: {
          validationType: 'lp_token_balance',
          pairAddress: '${pairAddress}',
          expectedMinimum: '${expectedLPTokens}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      }
    ],
    connections: [
      {
        id: 'conn_1',
        sourceBlock: 'check_pair_exists',
        sourceOutput: 'exists',
        targetBlock: 'calculate_optimal_amounts',
        targetInput: 'pair_exists'
      },
      {
        id: 'conn_2',
        sourceBlock: 'calculate_optimal_amounts',
        sourceOutput: 'calculated',
        targetBlock: 'approve_token_a',
        targetInput: 'amounts_calculated'
      },
      {
        id: 'conn_3',
        sourceBlock: 'calculate_optimal_amounts',
        sourceOutput: 'calculated',
        targetBlock: 'approve_token_b',
        targetInput: 'amounts_calculated'
      },
      {
        id: 'conn_4',
        sourceBlock: 'approve_token_a',
        sourceOutput: 'success',
        targetBlock: 'add_liquidity',
        targetInput: 'token_a_approved'
      },
      {
        id: 'conn_5',
        sourceBlock: 'approve_token_b',
        sourceOutput: 'success',
        targetBlock: 'add_liquidity',
        targetInput: 'token_b_approved'
      },
      {
        id: 'conn_6',
        sourceBlock: 'add_liquidity',
        sourceOutput: 'success',
        targetBlock: 'verify_lp_tokens',
        targetInput: 'liquidity_added'
      }
    ],
    globalConfig: {
      maxGasPrice: '30000000000', // 30 gwei
      slippageTolerance: '0.5',
      deadlineBuffer: 600 // 10 minutes
    },
    metadata: {
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  } as Flow,
  parameters: [
    {
      name: 'tokenA',
      type: 'address',
      description: 'First token in the pair',
      required: true,
      validation: { isContract: true, implements: 'IERC20' }
    },
    {
      name: 'tokenB',
      type: 'address',
      description: 'Second token in the pair',
      required: true,
      validation: { isContract: true, implements: 'IERC20' }
    },
    {
      name: 'dexRouter',
      type: 'address',
      description: 'DEX router contract address',
      required: true,
      defaultValue: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
      validation: { isContract: true }
    },
    {
      name: 'liquidityAmount',
      type: 'amount',
      description: 'Amount of primary token to provide as liquidity',
      required: true,
      validation: { min: '1000000000000000' } // 0.001 ETH minimum
    },
    {
      name: 'primaryToken',
      type: 'address',
      description: 'Primary token to base calculations on (tokenA or tokenB)',
      required: true,
      validation: { custom: (value) => ['tokenA', 'tokenB'].includes(value) }
    },
    {
      name: 'slippageTolerance',
      type: 'string',
      description: 'Slippage tolerance percentage (e.g., "0.5" for 0.5%)',
      required: true,
      defaultValue: '0.5',
      validation: { pattern: '^[0-9]+\\.?[0-9]*$' }
    },
    {
      name: 'userAddress',
      type: 'address',
      description: 'Recipient address for LP tokens',
      required: true,
      validation: { pattern: '^0x[a-fA-F0-9]{40}$' }
    },
    {
      name: 'deadline',
      type: 'number',
      description: 'Transaction deadline in seconds from now',
      required: true,
      defaultValue: 1200, // 20 minutes
      validation: { min: 300, max: 3600 }
    }
  ],
  requirements: [
    {
      type: 'balance',
      description: 'Sufficient balance for both tokens',
      details: { tokenType: 'ERC20', bothTokens: true },
      optional: false
    },
    {
      type: 'approval',
      description: 'Token approvals for DEX router',
      details: { tokenType: 'ERC20', spender: 'dexRouter' },
      optional: false
    },
    {
      type: 'contract',
      description: 'Valid DEX router contract',
      details: { contractAddress: 'dexRouter', interface: 'IUniswapV2Router' },
      optional: false
    }
  ],
  metadata: {
    version: '1.2.0',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    compatibility: {
      minClientVersion: '1.0.0',
      blockVersions: {
        'validation': '1.0.0',
        'calculation': '1.1.0',
        'token_approval': '1.0.0',
        'contract_call': '1.0.0'
      }
    },
    license: 'MIT'
  },
  usage: {
    downloads: 523,
    ratings: [
      {
        userId: '0x3456789012345678901234567890123456789012' as Address,
        score: 5,
        comment: 'Excellent for DeFi automation',
        timestamp: new Date('2024-01-10')
      }
    ],
    averageRating: 4.7
  },
  status: 'published',
  visibility: 'public'
}

// Multi-Token Approval Template
export const MULTI_TOKEN_APPROVAL_TEMPLATE: FlowTemplate = {
  id: 'multi-token-approval',
  name: 'Multi-Token Approval Flow',
  description: 'Approve multiple ERC20 tokens for different spenders in a single transaction batch with gas optimization',
  category: 'Utility',
  difficulty: 'beginner',
  tags: ['approval', 'batch', 'gas-optimization', 'utility'],
  author: {
    address: '0x742d35Cc6634C0532925a3b8D0b0C0f1DbF8E8C0' as Address,
    name: 'Contract Stresser Team',
    verified: true
  },
  flow: {
    id: 'template_multi_token_approval',
    name: 'Multi-Token Approval Flow',
    description: 'Batch approve multiple tokens efficiently',
    blocks: [
      {
        id: 'validate_inputs',
        type: 'validation',
        position: { x: 100, y: 100 },
        name: 'Validate Inputs',
        description: 'Validate token addresses and spender addresses',
        inputs: [],
        outputs: ['valid', 'invalid'],
        config: {
          validationType: 'multi_address_validation',
          tokenAddresses: '${tokenAddresses}',
          spenderAddresses: '${spenderAddresses}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'batch_approvals',
        type: 'contract_call',
        position: { x: 300, y: 100 },
        name: 'Execute Batch Approvals',
        description: 'Execute all token approvals in batch',
        inputs: ['validated'],
        outputs: ['success', 'partial_success', 'error'],
        config: {
          contractAddress: '${multicallContract}',
          functionName: 'batchApprove',
          args: ['${approvalData}'],
          gasLimit: '${estimatedGas}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      }
    ],
    connections: [
      {
        id: 'conn_1',
        sourceBlock: 'validate_inputs',
        sourceOutput: 'valid',
        targetBlock: 'batch_approvals',
        targetInput: 'validated'
      }
    ],
    globalConfig: {
      gasOptimization: true,
      batchSize: 10
    },
    metadata: {
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  } as Flow,
  parameters: [
    {
      name: 'tokenAddresses',
      type: 'string',
      description: 'Comma-separated list of token addresses',
      required: true,
      validation: { 
        custom: (value) => {
          const addresses = value.split(',').map((a: string) => a.trim())
          return addresses.every((addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr))
        }
      }
    },
    {
      name: 'spenderAddresses',
      type: 'string',
      description: 'Comma-separated list of spender addresses (must match token count)',
      required: true,
      validation: { 
        custom: (value) => {
          const addresses = value.split(',').map((a: string) => a.trim())
          return addresses.every((addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr))
        }
      }
    },
    {
      name: 'amounts',
      type: 'string',
      description: 'Comma-separated list of amounts (use "unlimited" for unlimited approval)',
      required: true,
      defaultValue: 'unlimited'
    },
    {
      name: 'multicallContract',
      type: 'address',
      description: 'Multicall contract for batch operations',
      required: true,
      defaultValue: '0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696',
      validation: { isContract: true }
    }
  ],
  requirements: [
    {
      type: 'contract',
      description: 'Valid multicall contract for batch operations',
      details: { contractAddress: 'multicallContract' },
      optional: false
    }
  ],
  metadata: {
    version: '1.0.0',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    compatibility: {
      minClientVersion: '1.0.0',
      blockVersions: {}
    },
    license: 'MIT'
  },
  usage: {
    downloads: 1205,
    ratings: [],
    averageRating: 0
  },
  status: 'published',
  visibility: 'public'
}

// Export all templates
export const ATOMIC_SWAP_TEMPLATES = [
  ERC20_ERC1155_SWAP_TEMPLATE,
  LIQUIDITY_PROVISION_TEMPLATE,
  MULTI_TOKEN_APPROVAL_TEMPLATE
]