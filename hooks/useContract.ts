'use client'

import { useMemo } from 'react'
import { getContract, type Address, type PublicClient, type WalletClient } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'
import { contractStorage } from '@/services/contracts'
import type { ContractMetadata } from '@/types/contracts'
import testTokenArtifact from '../contracts/out/TestToken.sol/TestToken.json'

// Standard ERC-20 ABI for common operations
const ERC20_ABI = [
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
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ type: 'address', name: 'account' }],
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { type: 'address', name: 'owner' },
      { type: 'address', name: 'spender' },
    ],
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'value' },
    ],
    outputs: [{ type: 'bool', name: '' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { type: 'address', name: 'spender' },
      { type: 'uint256', name: 'value' },
    ],
    outputs: [{ type: 'bool', name: '' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transferFrom',
    inputs: [
      { type: 'address', name: 'from' },
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'value' },
    ],
    outputs: [{ type: 'bool', name: '' }],
    stateMutability: 'nonpayable',
  },
] as const

// TestToken specific ABI additions
const TEST_TOKEN_ABI = [
  ...ERC20_ABI,
  {
    type: 'function',
    name: 'mint',
    inputs: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'batchMint',
    inputs: [
      { type: 'address[]', name: 'recipients' },
      { type: 'uint256[]', name: 'amounts' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'burn',
    inputs: [{ type: 'uint256', name: 'amount' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'burnFrom',
    inputs: [
      { type: 'address', name: 'from' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ type: 'address', name: '' }],
    stateMutability: 'view',
  },
] as const

interface UseContractOptions {
  abi?: readonly any[]
  watch?: boolean
  chainId?: number
}

interface ContractInstance {
  address: Address
  metadata?: ContractMetadata
  publicContract: ReturnType<typeof getContract>
  walletContract?: ReturnType<typeof getContract>
  isConnected: boolean
  chainId?: number
  abi: readonly any[]
}

/**
 * Hook for creating contract instances with proper typing and error handling
 */
export function useContract(
  address: Address | undefined,
  options: UseContractOptions = {}
): ContractInstance | null {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const contractInstance = useMemo(() => {
    if (!address || !publicClient) return null

    // Get contract metadata from storage
    const metadata = contractStorage.getAllContracts().find(
      (contract) => 
        contract.address.toLowerCase() === address.toLowerCase() &&
        (!options.chainId || contract.chainId === options.chainId)
    )

    // Determine ABI to use
    let abi = options.abi
    if (!abi) {
      // Use TestToken ABI if it's a deployed TestToken, otherwise use standard ERC-20
      abi = metadata?.tags?.includes('deployed') ? TEST_TOKEN_ABI : ERC20_ABI
    }

    // Create public contract instance for reads
    const publicContract = getContract({
      address,
      abi,
      client: publicClient,
    })

    // Create wallet contract instance for writes (if wallet is connected)
    let walletContract
    if (walletClient) {
      walletContract = getContract({
        address,
        abi,
        client: walletClient,
      })
    }

    return {
      address,
      metadata,
      publicContract,
      walletContract,
      isConnected: !!walletClient,
      chainId: publicClient.chain?.id,
      abi,
    }
  }, [address, publicClient, walletClient, options.abi, options.chainId])

  return contractInstance
}

/**
 * Hook specifically for TestToken contracts with enhanced functionality
 */
export function useTestTokenContract(
  address: Address | undefined,
  options: Omit<UseContractOptions, 'abi'> = {}
) {
  return useContract(address, {
    ...options,
    abi: testTokenArtifact.abi,
  })
}

/**
 * Hook for ERC-20 contracts with standard functionality
 */
export function useERC20Contract(
  address: Address | undefined,
  options: Omit<UseContractOptions, 'abi'> = {}
) {
  return useContract(address, {
    ...options,
    abi: ERC20_ABI,
  })
}

/**
 * Hook to get multiple contract instances at once
 */
export function useContracts(
  addresses: (Address | undefined)[],
  options: UseContractOptions = {}
) {
  const publicClient = usePublicClient()
  
  const contracts = useMemo(() => {
    if (!publicClient) return []
    
    return addresses.map(address => ({
      address,
      contract: address ? useContract(address, options) : null,
    })).filter(item => item.address && item.contract)
  }, [addresses, options, publicClient])

  return contracts
}

/**
 * Hook to get all deployed contracts as contract instances
 */
export function useAllContracts(options: UseContractOptions = {}) {
  const publicClient = usePublicClient()
  
  const contracts = useMemo(() => {
    if (!publicClient) return []

    const allContracts = contractStorage.getAllContracts()
    
    return allContracts
      .filter(contract => !options.chainId || contract.chainId === options.chainId)
      .map(metadata => {
        const contract = useContract(metadata.address, options)
        return {
          metadata,
          contract,
        }
      })
      .filter(item => item.contract !== null)
  }, [publicClient, options])

  return contracts
}

/**
 * Utility to check if a contract exists at an address
 */
export function useContractExists(address: Address | undefined) {
  const publicClient = usePublicClient()

  const exists = useMemo(async () => {
    if (!address || !publicClient) return false

    try {
      const bytecode = await publicClient.getBytecode({ address })
      return bytecode && bytecode !== '0x'
    } catch {
      return false
    }
  }, [address, publicClient])

  return exists
}