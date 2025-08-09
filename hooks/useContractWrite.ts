'use client'

import { useState, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { type Address, type Hash } from 'viem'
import { useContract } from './useContract'
import { contractStorage } from '@/services/contracts'
import type { ContractInteraction } from '@/types/contracts'

interface TransactionStatus {
  status: 'idle' | 'preparing' | 'pending' | 'confirming' | 'success' | 'error'
  hash?: Hash
  confirmations?: number
  error?: Error
  gasUsed?: bigint
  gasPrice?: bigint
}

interface ContractWriteOptions {
  onSuccess?: (data: { hash: Hash; receipt?: any }) => void
  onError?: (error: Error) => void
  onStatusChange?: (status: TransactionStatus) => void
  gasLimit?: bigint
  gasPrice?: bigint
  value?: bigint
  confirmations?: number
}

interface ContractWriteResult {
  write: (...args: any[]) => Promise<Hash | undefined>
  writeAsync: (...args: any[]) => Promise<Hash | undefined>
  status: TransactionStatus
  reset: () => void
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
}

/**
 * Hook for writing to smart contracts with transaction tracking
 */
export function useContractWrite(
  address: Address | undefined,
  functionName: string,
  options: ContractWriteOptions = {}
): ContractWriteResult {
  const { address: userAddress } = useAccount()
  const publicClient = usePublicClient()
  const contract = useContract(address)

  const [status, setStatus] = useState<TransactionStatus>({
    status: 'idle',
  })

  const updateStatus = useCallback((newStatus: Partial<TransactionStatus>) => {
    setStatus(prev => {
      const updated = { ...prev, ...newStatus }
      options.onStatusChange?.(updated)
      return updated
    })
  }, [options])

  const reset = useCallback(() => {
    setStatus({ status: 'idle' })
  }, [])

  const writeInternal = useCallback(async (args: any[] = []): Promise<Hash | undefined> => {
    if (!contract?.walletContract || !userAddress) {
      const error = new Error('Wallet not connected or contract not available')
      updateStatus({ status: 'error', error })
      options.onError?.(error)
      throw error
    }

    try {
      updateStatus({ status: 'preparing' })

      // Estimate gas if not provided
      let gasLimit = options.gasLimit
      if (!gasLimit) {
        try {
          gasLimit = await (contract.publicContract as any).estimateGas[functionName](args, {
            account: userAddress,
            value: options.value,
          }) as bigint
          // Add 20% buffer
          gasLimit = (gasLimit * BigInt(120)) / BigInt(100)
        } catch (gasError) {
          console.warn('Gas estimation failed, using default:', gasError)
          gasLimit = BigInt(500000) // Fallback gas limit
        }
      }

      updateStatus({ status: 'pending' })

      // Execute transaction
      const hash = await (contract.walletContract as any).write[functionName](args, {
        gas: gasLimit,
        gasPrice: options.gasPrice,
        value: options.value,
      }) as Hash

      updateStatus({ status: 'confirming', hash })

      // Wait for confirmation
      if (publicClient) {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({
            hash,
            confirmations: options.confirmations || 1,
          })

          const gasUsed = receipt.gasUsed
          const gasPrice = receipt.effectiveGasPrice || options.gasPrice || BigInt(0)

          updateStatus({ 
            status: 'success', 
            hash, 
            gasUsed,
            gasPrice,
            confirmations: options.confirmations || 1
          })

          // Log successful interaction
          const interaction: ContractInteraction = {
            id: crypto.randomUUID(),
            contractAddress: address!,
            contractName: contract.metadata?.name || 'Unknown Contract',
            functionName,
            functionType: 'write',
            args: args.reduce((acc, arg, index) => {
              acc[`arg${index}`] = arg
              return acc
            }, {} as Record<string, unknown>),
            txHash: hash,
            gasUsed,
            gasPrice,
            status: 'success',
            timestamp: new Date(),
            userAddress,
          }
          contractStorage.addInteraction(interaction)

          options.onSuccess?.({ hash, receipt })
          return hash
        } catch (receiptError) {
          // Transaction was mined but may have failed
          const error = receiptError instanceof Error 
            ? receiptError 
            : new Error('Transaction confirmation failed')
          
          updateStatus({ status: 'error', hash, error })

          // Log failed interaction
          const interaction: ContractInteraction = {
            id: crypto.randomUUID(),
            contractAddress: address!,
            contractName: contract.metadata?.name || 'Unknown Contract',
            functionName,
            functionType: 'write',
            args: args.reduce((acc, arg, index) => {
              acc[`arg${index}`] = arg
              return acc
            }, {} as Record<string, unknown>),
            txHash: hash,
            status: 'failed',
            error: error.message,
            timestamp: new Date(),
            userAddress,
          }
          contractStorage.addInteraction(interaction)

          options.onError?.(error)
          throw error
        }
      } else {
        // No public client available, assume success
        updateStatus({ status: 'success', hash })
        options.onSuccess?.({ hash })
        return hash
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      updateStatus({ status: 'error', error: errorObj })

      // Log failed interaction
      const interaction: ContractInteraction = {
        id: crypto.randomUUID(),
        contractAddress: address!,
        contractName: contract?.metadata?.name || 'Unknown Contract',
        functionName,
        functionType: 'write',
        args: args.reduce((acc, arg, index) => {
          acc[`arg${index}`] = arg
          return acc
        }, {} as Record<string, unknown>),
        status: 'failed',
        error: errorObj.message,
        timestamp: new Date(),
        userAddress: userAddress || undefined,
      }
      contractStorage.addInteraction(interaction)

      options.onError?.(errorObj)
      throw errorObj
    }
  }, [contract, userAddress, publicClient, address, functionName, options, updateStatus])

  const write = useCallback(async (...args: any[]) => {
    try {
      return await writeInternal(args)
    } catch (error) {
      // Error already handled in writeInternal
      return undefined
    }
  }, [writeInternal])

  const writeAsync = useCallback(async (...args: any[]) => {
    return await writeInternal(args)
  }, [writeInternal])

  return {
    write,
    writeAsync,
    status,
    reset,
    isLoading: ['preparing', 'pending', 'confirming'].includes(status.status),
    isError: status.status === 'error',
    isSuccess: status.status === 'success',
  }
}

/**
 * Hook for batch contract writes (multiple transactions)
 */
export function useBatchContractWrite(
  address: Address | undefined,
  calls: Array<{ functionName: string; args: any[] }>,
  options: ContractWriteOptions & { 
    stopOnError?: boolean 
    delayBetweenCalls?: number 
  } = {}
) {
  const [results, setResults] = useState<Array<{ hash?: Hash; error?: Error; status: string }>>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isExecuting, setIsExecuting] = useState(false)

  const contract = useContract(address)
  const { address: userAddress } = useAccount()
  const publicClient = usePublicClient()

  const executeBatch = useCallback(async () => {
    if (!contract?.walletContract || !userAddress || calls.length === 0) {
      throw new Error('Contract not available or no calls provided')
    }

    setIsExecuting(true)
    setResults([])
    setCurrentIndex(0)

    const batchResults: Array<{ hash?: Hash; error?: Error; status: string }> = []

    for (let i = 0; i < calls.length; i++) {
      setCurrentIndex(i)
      const { functionName, args } = calls[i]

      try {
        // Add delay between calls if specified
        if (i > 0 && options.delayBetweenCalls) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenCalls))
        }

        const hash = await (contract.walletContract as any).write[functionName](args) as Hash

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ 
            hash,
            confirmations: options.confirmations || 1,
          })
        }

        batchResults.push({ hash, status: 'success' })
        setResults([...batchResults])

        // Log successful interaction
        const interaction: ContractInteraction = {
          id: crypto.randomUUID(),
          contractAddress: address!,
          contractName: contract.metadata?.name || 'Unknown Contract',
          functionName,
          functionType: 'write',
          args: args.reduce((acc, arg, index) => {
            acc[`arg${index}`] = arg
            return acc
          }, {} as Record<string, unknown>),
          txHash: hash,
          status: 'success',
          timestamp: new Date(),
          userAddress,
        }
        contractStorage.addInteraction(interaction)

      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        batchResults.push({ error: errorObj, status: 'failed' })
        setResults([...batchResults])

        // Log failed interaction
        const interaction: ContractInteraction = {
          id: crypto.randomUUID(),
          contractAddress: address!,
          contractName: contract.metadata?.name || 'Unknown Contract',
          functionName,
          functionType: 'write',
          args: args.reduce((acc, arg, index) => {
            acc[`arg${index}`] = arg
            return acc
          }, {} as Record<string, unknown>),
          status: 'failed',
          error: errorObj.message,
          timestamp: new Date(),
          userAddress,
        }
        contractStorage.addInteraction(interaction)

        if (options.stopOnError) {
          break
        }
      }
    }

    setIsExecuting(false)
    setCurrentIndex(-1)

    const successful = batchResults.filter(r => r.status === 'success')
    const failed = batchResults.filter(r => r.status === 'failed')

    if (failed.length > 0 && options.onError) {
      const errorMessage = `Batch execution completed with ${failed.length} failures`
      options.onError(new Error(errorMessage))
    }

    if (successful.length > 0 && options.onSuccess) {
      options.onSuccess({ 
        hash: successful[0].hash!, // Use first successful hash
        receipt: { batchResults, successful: successful.length, failed: failed.length }
      })
    }

    return batchResults
  }, [contract, userAddress, publicClient, calls, address, options])

  return {
    executeBatch,
    results,
    currentIndex,
    isExecuting,
    progress: calls.length > 0 ? ((currentIndex + 1) / calls.length) * 100 : 0,
    totalCalls: calls.length,
  }
}

/**
 * Hook for ERC-20 token transfers
 */
export function useTokenTransfer(tokenAddress: Address | undefined, options: ContractWriteOptions = {}) {
  return useContractWrite(tokenAddress, 'transfer', options)
}

/**
 * Hook for ERC-20 token approvals
 */
export function useTokenApprove(tokenAddress: Address | undefined, options: ContractWriteOptions = {}) {
  return useContractWrite(tokenAddress, 'approve', options)
}

/**
 * Hook for TestToken minting (owner only)
 */
export function useTokenMint(tokenAddress: Address | undefined, options: ContractWriteOptions = {}) {
  return useContractWrite(tokenAddress, 'mint', options)
}

/**
 * Hook for TestToken batch minting (owner only)
 */
export function useTokenBatchMint(tokenAddress: Address | undefined, options: ContractWriteOptions = {}) {
  return useContractWrite(tokenAddress, 'batchMint', options)
}