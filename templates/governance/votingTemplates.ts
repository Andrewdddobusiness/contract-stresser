'use client'

import { FlowTemplate } from '@/services/templates/templateEngine'
import { Flow } from '@/services/flowDesigner/flowBuilder'
import { Address } from 'viem'

// Governance Voting Participation Template
export const GOVERNANCE_VOTING_TEMPLATE: FlowTemplate = {
  id: 'governance-voting-participation',
  name: 'Governance Voting Participation',
  description: 'Participate in DAO governance by voting on proposals with delegation support and vote tracking',
  category: 'Governance',
  difficulty: 'intermediate',
  tags: ['governance', 'dao', 'voting', 'delegation', 'proposal'],
  author: {
    address: '0x742d35Cc6634C0532925a3b8D0b0C0f1DbF8E8C0' as Address,
    name: 'Contract Stresser Team',
    verified: true
  },
  flow: {
    id: 'template_governance_voting',
    name: 'Governance Voting Participation',
    description: 'Participate in DAO governance voting',
    blocks: [
      {
        id: 'check_proposal_status',
        type: 'validation',
        position: { x: 100, y: 100 },
        name: 'Check Proposal Status',
        description: 'Validate that the proposal is active and votable',
        inputs: [],
        outputs: ['active', 'inactive'],
        config: {
          validationType: 'proposal_status',
          governanceContract: '${governanceContract}',
          proposalId: '${proposalId}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'check_voting_power',
        type: 'validation',
        position: { x: 300, y: 100 },
        name: 'Check Voting Power',
        description: 'Verify user has voting power for this proposal',
        inputs: ['proposal_active'],
        outputs: ['has_power', 'no_power'],
        config: {
          validationType: 'voting_power',
          voterAddress: '${userAddress}',
          proposalId: '${proposalId}',
          snapshotBlock: '${snapshotBlock}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'delegate_votes',
        type: 'contract_call',
        position: { x: 500, y: 50 },
        name: 'Delegate Votes (Optional)',
        description: 'Delegate voting power to another address',
        inputs: ['has_voting_power'],
        outputs: ['success', 'error'],
        config: {
          contractAddress: '${tokenContract}',
          functionName: 'delegate',
          args: ['${delegateAddress}'],
          gasLimit: 100000,
          condition: '${enableDelegation}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'cast_vote',
        type: 'contract_call',
        position: { x: 700, y: 100 },
        name: 'Cast Vote',
        description: 'Submit vote on the proposal',
        inputs: ['voting_ready'],
        outputs: ['success', 'error'],
        config: {
          contractAddress: '${governanceContract}',
          functionName: 'castVote',
          args: ['${proposalId}', '${voteSupport}'],
          gasLimit: 150000
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'cast_vote_with_reason',
        type: 'contract_call',
        position: { x: 700, y: 200 },
        name: 'Cast Vote with Reason',
        description: 'Submit vote with reasoning text',
        inputs: ['voting_ready'],
        outputs: ['success', 'error'],
        config: {
          contractAddress: '${governanceContract}',
          functionName: 'castVoteWithReason',
          args: ['${proposalId}', '${voteSupport}', '${voteReason}'],
          gasLimit: 200000,
          condition: '${includeReason}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'verify_vote_recorded',
        type: 'validation',
        position: { x: 900, y: 150 },
        name: 'Verify Vote Recorded',
        description: 'Confirm vote was recorded correctly',
        inputs: ['vote_cast'],
        outputs: ['verified', 'failed'],
        config: {
          validationType: 'vote_verification',
          proposalId: '${proposalId}',
          voterAddress: '${userAddress}',
          expectedSupport: '${voteSupport}'
        },
        validation: { isValid: true, errors: [], warnings: [] }
      },
      {
        id: 'track_proposal_outcome',
        type: 'delay',
        position: { x: 1100, y: 150 },
        name: 'Track Proposal Outcome',
        description: 'Monitor proposal until voting ends',
        inputs: ['vote_verified'],
        outputs: ['ended', 'timeout'],
        config: {
          delayType: 'wait_for_event',
          eventName: 'ProposalExecuted',
          maxWaitTime: 604800, // 1 week
          checkInterval: 3600 // 1 hour
        },
        validation: { isValid: true, errors: [], warnings: [] }
      }
    ],
    connections: [
      {
        id: 'conn_1',
        sourceBlock: 'check_proposal_status',
        sourceOutput: 'active',
        targetBlock: 'check_voting_power',
        targetInput: 'proposal_active'
      },
      {
        id: 'conn_2',
        sourceBlock: 'check_voting_power',
        sourceOutput: 'has_power',
        targetBlock: 'delegate_votes',
        targetInput: 'has_voting_power'
      },
      {
        id: 'conn_3',
        sourceBlock: 'check_voting_power',
        sourceOutput: 'has_power',
        targetBlock: 'cast_vote',
        targetInput: 'voting_ready'
      },
      {
        id: 'conn_4',
        sourceBlock: 'check_voting_power',
        sourceOutput: 'has_power',
        targetBlock: 'cast_vote_with_reason',
        targetInput: 'voting_ready'
      },
      {
        id: 'conn_5',
        sourceBlock: 'cast_vote',
        sourceOutput: 'success',
        targetBlock: 'verify_vote_recorded',
        targetInput: 'vote_cast'
      },
      {
        id: 'conn_6',
        sourceBlock: 'cast_vote_with_reason',
        sourceOutput: 'success',
        targetBlock: 'verify_vote_recorded',
        targetInput: 'vote_cast'
      },
      {
        id: 'conn_7',
        sourceBlock: 'verify_vote_recorded',
        sourceOutput: 'verified',
        targetBlock: 'track_proposal_outcome',
        targetInput: 'vote_verified'
      }
    ],
    globalConfig: {
      maxGasPrice: '20000000000', // 20 gwei
      timeout: 300000, // 5 minutes
      retryCount: 3
    },
    metadata: {
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  } as Flow,
  parameters: [
    {
      name: 'governanceContract',
      type: 'address',
      description: 'DAO governance contract address',
      required: true,
      validation: { 
        isContract: true,
        pattern: '^0x[a-fA-F0-9]{40}$'
      }
    },
    {
      name: 'tokenContract',
      type: 'address',
      description: 'Governance token contract address',
      required: true,
      validation: { 
        isContract: true,
        implements: 'IERC20Votes'
      }
    },
    {
      name: 'proposalId',
      type: 'number',
      description: 'Proposal ID to vote on',
      required: true,
      validation: { min: 0 }
    },
    {
      name: 'voteSupport',
      type: 'number',
      description: 'Vote support (0=Against, 1=For, 2=Abstain)',
      required: true,
      validation: { min: 0, max: 2 }
    },
    {
      name: 'userAddress',
      type: 'address',
      description: 'Voter wallet address',
      required: true,
      validation: { pattern: '^0x[a-fA-F0-9]{40}$' }
    },
    {
      name: 'includeReason',
      type: 'boolean',
      description: 'Include reasoning text with vote',
      required: false,
      defaultValue: false
    },
    {
      name: 'voteReason',
      type: 'string',
      description: 'Reasoning for the vote decision',
      required: false,
      defaultValue: '',
      validation: { 
        custom: (value) => !value || value.length <= 1000 || 'Reason must be 1000 characters or less'
      }
    },
    {
      name: 'enableDelegation',
      type: 'boolean',
      description: 'Enable vote delegation',
      required: false,
      defaultValue: false
    },
    {
      name: 'delegateAddress',
      type: 'address',
      description: 'Address to delegate votes to',
      required: false,
      validation: { pattern: '^0x[a-fA-F0-9]{40}$' }
    },
    {
      name: 'snapshotBlock',
      type: 'number',
      description: 'Block number for voting power snapshot',
      required: false,
      validation: { min: 0 }
    }
  ],
  requirements: [
    {
      type: 'balance',
      description: 'Governance token balance for voting power',
      details: { tokenType: 'ERC20Votes', minimumBalance: '1' },
      optional: false
    },
    {
      type: 'contract',
      description: 'Valid governance contract with active proposal',
      details: { contractAddress: 'governanceContract', interface: 'IGovernor' },
      optional: false
    },
    {
      type: 'role',
      description: 'Voting eligibility at proposal snapshot',
      details: { requiredRole: 'voter', snapshotBlock: 'snapshotBlock' },
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
        'validation': '1.0.0',
        'contract_call': '1.0.0',
        'delay': '1.0.0'
      }
    },
    license: 'MIT',
    documentation: 'https://docs.contractstresser.com/templates/governance'
  },
  usage: {
    downloads: 234,
    ratings: [
      {
        userId: '0x4567890123456789012345678901234567890123' as Address,
        score: 5,
        comment: 'Perfect for DAO participation!',
        timestamp: new Date('2024-01-18')
      }
    ],
    averageRating: 4.8
  },
  status: 'published',
  visibility: 'public'
}

export const GOVERNANCE_TEMPLATES = [GOVERNANCE_VOTING_TEMPLATE]