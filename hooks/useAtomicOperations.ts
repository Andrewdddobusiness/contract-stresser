import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { atomicEngine, type AtomicOperation, type ExecutionResult, type SimulationResult, type SwapParameters, type BatchParameters } from '@/services/atomic/atomicEngine'
import { toast } from 'react-hot-toast'

export interface UseAtomicOperationsOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useAtomicOperations(options: UseAtomicOperationsOptions = {}) {
  const { address } = useAccount()
  const { autoRefresh = false, refreshInterval = 10000 } = options

  const [operations, setOperations] = useState<AtomicOperation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [executingOperations, setExecutingOperations] = useState<Set<string>>(new Set())

  const loadOperations = useCallback(() => {
    const allOperations = atomicEngine.getAllOperations()
    setOperations(allOperations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
  }, [])

  const createAtomicSwap = useCallback(async (params: SwapParameters) => {
    if (!address) {
      toast.error('Please connect your wallet')
      return null
    }

    try {
      setIsLoading(true)
      const operation = await atomicEngine.createAtomicSwap({
        ...params,
        participant1: address
      })
      
      loadOperations()
      toast.success('Atomic swap created successfully')
      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create swap'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [address, loadOperations])

  const createBatchOperation = useCallback(async (params: BatchParameters) => {
    if (!address) {
      toast.error('Please connect your wallet')
      return null
    }

    try {
      setIsLoading(true)
      const operation = await atomicEngine.batchOperations(params)
      
      loadOperations()
      toast.success('Batch operation created successfully')
      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create batch operation'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [address, loadOperations])

  const simulateOperation = useCallback(async (operationId: string): Promise<SimulationResult | null> => {
    try {
      setIsLoading(true)
      const result = await atomicEngine.simulateOperation(operationId)
      
      if (result.canExecute) {
        toast.success('Simulation successful - operation can execute')
      } else {
        toast.warning('Simulation shows operation cannot execute')
      }
      
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Simulation failed'
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const executeOperation = useCallback(async (operationId: string): Promise<ExecutionResult | null> => {
    if (!address) {
      toast.error('Please connect your wallet')
      return null
    }

    try {
      setExecutingOperations(prev => new Set(prev).add(operationId))
      const result = await atomicEngine.executeAtomicOperation(operationId)
      
      loadOperations()
      
      if (result.success) {
        toast.success(`Operation executed successfully in ${(result.duration / 1000).toFixed(1)}s`)
      } else {
        toast.error(`Operation failed: ${result.error}`)
      }
      
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution failed'
      toast.error(message)
      loadOperations() // Refresh to show updated status
      return null
    } finally {
      setExecutingOperations(prev => {
        const next = new Set(prev)
        next.delete(operationId)
        return next
      })
    }
  }, [address, loadOperations])

  const cancelOperation = useCallback(async (operationId: string) => {
    try {
      await atomicEngine.cancelOperation(operationId)
      loadOperations()
      toast.success('Operation cancelled')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel operation'
      toast.error(message)
      throw error
    }
  }, [loadOperations])

  const deleteOperation = useCallback(async (operationId: string) => {
    try {
      await atomicEngine.deleteOperation(operationId)
      loadOperations()
      toast.success('Operation deleted')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete operation'
      toast.error(message)
      throw error
    }
  }, [loadOperations])

  // Load operations on mount and when address changes
  useEffect(() => {
    loadOperations()
  }, [loadOperations, address])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(loadOperations, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadOperations])

  // Filter operations by user involvement
  const userOperations = operations.filter(op => {
    // Check if user is involved in any step
    return op.steps.some(step => step.contract === address) ||
           op.metadata.tags.includes('user') ||
           op.requirements.some(req => req.target === address)
  })

  const swapOperations = operations.filter(op => op.type === 'swap')
  const batchOperations = operations.filter(op => op.type === 'batch')
  const activeOperations = operations.filter(op => 
    op.status === 'pending' || op.status === 'executing' || op.status === 'simulating'
  )
  const completedOperations = operations.filter(op => op.status === 'completed')

  return {
    // Data
    operations,
    userOperations,
    swapOperations,
    batchOperations,
    activeOperations,
    completedOperations,
    
    // State
    isLoading,
    executingOperations,
    
    // Actions
    createAtomicSwap,
    createBatchOperation,
    simulateOperation,
    executeOperation,
    cancelOperation,
    deleteOperation,
    refresh: loadOperations,
    
    // Utils
    getOperation: (id: string) => operations.find(op => op.id === id),
    isExecuting: (id: string) => executingOperations.has(id) || atomicEngine.isExecuting(id)
  }
}