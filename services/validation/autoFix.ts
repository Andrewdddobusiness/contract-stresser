import { Address, parseEther, maxUint256 } from 'viem'
import { getWalletClient } from '@/services/blockchain/clients'
import type { SupportedChainId } from '@/types/blockchain'
import { toast } from 'react-hot-toast'

export interface AutoFixAction {
  id: string
  name: string
  description: string
  category: 'token' | 'permission' | 'network'
  execute: () => Promise<void>
}

export interface TokenApprovalParams {
  tokenAddress: Address
  spenderAddress: Address
  amount?: string
  userAddress: Address
  chainId?: SupportedChainId
}

export interface RoleAssignmentParams {
  contractAddress: Address
  role: string
  userAddress: Address
  targetAddress: Address
  chainId?: SupportedChainId
}

class AutoFixService {
  private static instance: AutoFixService

  static getInstance(): AutoFixService {
    if (!AutoFixService.instance) {
      AutoFixService.instance = new AutoFixService()
    }
    return AutoFixService.instance
  }

  /**
   * Create an auto-fix action for token approval
   */
  createTokenApprovalFix(params: TokenApprovalParams): AutoFixAction {
    return {
      id: `approve-${params.tokenAddress}-${params.spenderAddress}`,
      name: 'Approve Token',
      description: `Approve ${params.spenderAddress} to spend tokens`,
      category: 'token',
      execute: async () => {
        await this.executeTokenApproval(params)
      }
    }
  }

  /**
   * Create an auto-fix action for role assignment
   */
  createRoleAssignmentFix(params: RoleAssignmentParams): AutoFixAction {
    return {
      id: `role-${params.contractAddress}-${params.role}`,
      name: 'Assign Role',
      description: `Grant ${params.role} to ${params.targetAddress}`,
      category: 'permission',
      execute: async () => {
        await this.executeRoleAssignment(params)
      }
    }
  }

  /**
   * Execute token approval transaction
   */
  private async executeTokenApproval(params: TokenApprovalParams): Promise<void> {
    const { tokenAddress, spenderAddress, amount, userAddress, chainId = 31337 } = params
    
    try {
      const walletClient = getWalletClient(chainId)
      const approvalAmount = amount ? parseEther(amount) : maxUint256

      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: [
          {
            name: 'approve',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }]
          }
        ],
        functionName: 'approve',
        args: [spenderAddress, approvalAmount],
        account: userAddress
      })

      toast.success(`Token approval transaction sent: ${hash}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token approval failed'
      toast.error(`Token approval failed: ${message}`)
      throw error
    }
  }

  /**
   * Execute role assignment transaction
   */
  private async executeRoleAssignment(params: RoleAssignmentParams): Promise<void> {
    const { contractAddress, role, userAddress, targetAddress, chainId = 31337 } = params
    
    try {
      const walletClient = getWalletClient(chainId)
      
      // Convert role string to bytes32 hash
      const roleHash = this.getRoleHash(role)

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: [
          {
            name: 'grantRole',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'role', type: 'bytes32' },
              { name: 'account', type: 'address' }
            ],
            outputs: []
          }
        ],
        functionName: 'grantRole',
        args: [roleHash, targetAddress],
        account: userAddress
      })

      toast.success(`Role assignment transaction sent: ${hash}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Role assignment failed'
      toast.error(`Role assignment failed: ${message}`)
      throw error
    }
  }

  /**
   * Get role hash for common AccessControl roles
   */
  private getRoleHash(role: string): `0x${string}` {
    const commonRoles: { [key: string]: `0x${string}` } = {
      'DEFAULT_ADMIN_ROLE': '0x0000000000000000000000000000000000000000000000000000000000000000',
      'MINTER_ROLE': '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
      'BURNER_ROLE': '0x51d1caa9a3d8c8ec0ac2b2dff86a21e5f6e7b25c3c6a5a3e7c5b4f8b4b7a4d8e',
      'PAUSER_ROLE': '0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a'
    }

    return commonRoles[role] || '0x0000000000000000000000000000000000000000000000000000000000000000'
  }

  /**
   * Create auto-fix for insufficient ETH balance
   */
  createETHBalanceFix(userAddress: Address, requiredAmount: string): AutoFixAction {
    return {
      id: `eth-balance-${userAddress}`,
      name: 'Top Up ETH',
      description: `Need ${requiredAmount} ETH for gas fees`,
      category: 'network',
      execute: async () => {
        // For testnets, suggest getting ETH from faucets
        // For local networks, this could trigger a faucet call
        toast.error('Please top up your ETH balance from a faucet or exchange')
        throw new Error('Manual ETH top-up required')
      }
    }
  }

  /**
   * Create auto-fix for network switching
   */
  createNetworkSwitchFix(targetChainId: SupportedChainId): AutoFixAction {
    return {
      id: `network-switch-${targetChainId}`,
      name: 'Switch Network',
      description: `Switch to chain ${targetChainId}`,
      category: 'network',
      execute: async () => {
        try {
          // Request network switch via wallet
          await window.ethereum?.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${targetChainId.toString(16)}` }]
          })
          toast.success(`Switched to chain ${targetChainId}`)
        } catch (error) {
          if (error instanceof Error && error.message.includes('4902')) {
            toast.error('Network not found in wallet. Please add it manually.')
          } else {
            toast.error('Failed to switch network')
          }
          throw error
        }
      }
    }
  }

  /**
   * Create auto-fix for contract reinitialization
   */
  createContractReinitializeFix(
    contractAddress: Address,
    userAddress: Address,
    initData: any[]
  ): AutoFixAction {
    return {
      id: `reinitialize-${contractAddress}`,
      name: 'Reinitialize Contract',
      description: 'Reinitialize contract with proper parameters',
      category: 'permission',
      execute: async () => {
        try {
          const walletClient = getWalletClient(31337)

          const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: [
              {
                name: 'initialize',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [
                  { name: 'data', type: 'bytes' }
                ],
                outputs: []
              }
            ],
            functionName: 'initialize',
            args: initData,
            account: userAddress
          })

          toast.success(`Contract reinitialization sent: ${hash}`)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Reinitialization failed'
          toast.error(`Contract reinitialization failed: ${message}`)
          throw error
        }
      }
    }
  }

  /**
   * Create auto-fix for missing contract deployment
   */
  createContractDeploymentFix(contractName: string, deploymentFunction: () => Promise<void>): AutoFixAction {
    return {
      id: `deploy-${contractName}`,
      name: `Deploy ${contractName}`,
      description: `Deploy missing ${contractName} contract`,
      category: 'network',
      execute: async () => {
        try {
          await deploymentFunction()
          toast.success(`${contractName} deployment initiated`)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Deployment failed'
          toast.error(`${contractName} deployment failed: ${message}`)
          throw error
        }
      }
    }
  }
}

export const autoFixService = AutoFixService.getInstance()

// Utility functions for common auto-fix scenarios
export const createCommonAutoFixes = {
  tokenApproval: (params: TokenApprovalParams) => 
    autoFixService.createTokenApprovalFix(params),
    
  roleAssignment: (params: RoleAssignmentParams) => 
    autoFixService.createRoleAssignmentFix(params),
    
  ethBalance: (userAddress: Address, amount: string) => 
    autoFixService.createETHBalanceFix(userAddress, amount),
    
  networkSwitch: (chainId: SupportedChainId) => 
    autoFixService.createNetworkSwitchFix(chainId),
    
  contractReinit: (contractAddress: Address, userAddress: Address, initData: any[]) => 
    autoFixService.createContractReinitializeFix(contractAddress, userAddress, initData),
    
  contractDeploy: (contractName: string, deployFn: () => Promise<void>) => 
    autoFixService.createContractDeploymentFix(contractName, deployFn)
}