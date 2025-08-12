'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Address } from 'viem'
import { useAccount } from 'wagmi'
import { toast } from 'react-hot-toast'

// Services
import { atomicEngine, type AtomicOperation, type ExecutionResult, type SimulationResult } from '@/services/atomic/atomicEngine'
import { flowVisualizationEngine, type FlowDiagram, type ExecutionProgress, type SimulationVisualization } from '@/services/visualization/flowEngine'
import type { SupportedChainId } from '@/types/blockchain'

interface UseFlowExecutionProps {
  operationId: string
  chainId?: SupportedChainId
  autoRefresh?: boolean
  refreshInterval?: number
}

interface FlowExecutionState {
  operation: AtomicOperation | null
  flowDiagram: FlowDiagram | null
  executionProgress: ExecutionProgress | null
  simulationResult: SimulationResult | null
  simulationVisualization: SimulationVisualization | null
  isExecuting: boolean
  isSimulating: boolean
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useFlowExecution({
  operationId,
  chainId = 31337,
  autoRefresh = true,
  refreshInterval = 1000
}: UseFlowExecutionProps) {
  const { address } = useAccount()
  const [state, setState] = useState<FlowExecutionState>({
    operation: null,
    flowDiagram: null,
    executionProgress: null,
    simulationResult: null,
    simulationVisualization: null,
    isExecuting: false,
    isSimulating: false,
    isLoading: true,
    error: null,
    lastUpdated: null
  })

  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const executionPromiseRef = useRef<Promise<ExecutionResult> | null>(null)

  // Load operation and flow data
  const loadFlowData = useCallback(async () => {
    try {
      const operation = atomicEngine.getOperation(operationId)
      if (!operation) {
        setState(prev => ({
          ...prev,
          operation: null,
          flowDiagram: null,
          error: 'Operation not found',
          isLoading: false
        }))
        return
      }

      // Get or generate flow diagram
      let flowDiagram = flowVisualizationEngine.getFlowDiagram(operationId)
      if (!flowDiagram) {
        flowDiagram = await flowVisualizationEngine.generateFlowDiagram(operation)
      }

      // Get execution progress if available
      const executionProgress = flowVisualizationEngine.getExecutionProgress(operationId)

      // Check execution status
      const isExecuting = atomicEngine.isExecuting(operationId)

      setState(prev => ({
        ...prev,
        operation,
        flowDiagram,
        executionProgress,
        isExecuting,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      }))

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load flow data'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
    }
  }, [operationId])

  // Execute the atomic operation
  const executeOperation = useCallback(async (): Promise<ExecutionResult> => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    if (state.isExecuting || executionPromiseRef.current) {
      throw new Error('Operation is already executing')
    }

    setState(prev => ({ ...prev, isExecuting: true, error: null }))

    try {
      const executionPromise = atomicEngine.executeAtomicOperation(operationId, chainId, address)
      executionPromiseRef.current = executionPromise
      
      // Start real-time progress tracking
      const progressInterval = setInterval(async () => {
        try {
          const progress = flowVisualizationEngine.getExecutionProgress(operationId)
          if (progress) {
            setState(prev => ({ ...prev, executionProgress: progress }))
            
            // Update flow diagram with progress
            await flowVisualizationEngine.updateFlowProgress(operationId, progress)
            
            // Reload flow diagram to reflect updates
            const updatedDiagram = flowVisualizationEngine.getFlowDiagram(operationId)
            if (updatedDiagram) {
              setState(prev => ({ ...prev, flowDiagram: updatedDiagram }))
            }
          }
        } catch (err) {
          console.warn('Failed to update execution progress:', err)
        }
      }, 500)

      const result = await executionPromise

      clearInterval(progressInterval)
      executionPromiseRef.current = null

      // Final state update
      setState(prev => ({
        ...prev,
        isExecuting: false,
        executionProgress: flowVisualizationEngine.getExecutionProgress(operationId),
        lastUpdated: new Date()
      }))

      // Reload operation to get final status
      await loadFlowData()

      if (result.success) {
        toast.success('Operation executed successfully!')
      } else {
        toast.error(`Operation failed: ${result.error}`)
      }

      return result

    } catch (err) {
      executionPromiseRef.current = null
      const errorMessage = err instanceof Error ? err.message : 'Execution failed'
      
      setState(prev => ({
        ...prev,
        isExecuting: false,
        error: errorMessage
      }))

      toast.error(errorMessage)
      throw err
    }
  }, [operationId, chainId, address, state.isExecuting, loadFlowData])

  // Simulate the operation
  const simulateOperation = useCallback(async (): Promise<SimulationResult> => {
    setState(prev => ({ ...prev, isSimulating: true, error: null }))

    try {
      const simulationResult = await atomicEngine.simulateOperation(operationId, chainId)
      const simulationVisualization = await flowVisualizationEngine.simulateFlow(
        state.operation!
      )

      setState(prev => ({
        ...prev,
        simulationResult,
        simulationVisualization,
        isSimulating: false,
        lastUpdated: new Date()
      }))

      if (simulationResult.canExecute) {
        toast.success('Simulation completed successfully')
      } else {
        toast.warning(`Simulation found issues: ${simulationResult.errors.join(', ')}`)
      }

      return simulationResult

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Simulation failed'
      
      setState(prev => ({
        ...prev,
        isSimulating: false,
        error: errorMessage
      }))

      toast.error(errorMessage)
      throw err
    }
  }, [operationId, chainId, state.operation])

  // Cancel execution (if possible)
  const cancelExecution = useCallback(async () => {
    try {
      await atomicEngine.cancelOperation(operationId)
      setState(prev => ({ ...prev, isExecuting: false }))
      toast.success('Operation cancelled')
      await loadFlowData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel operation'
      toast.error(errorMessage)
      throw err
    }
  }, [operationId, loadFlowData])

  // Refresh flow data
  const refreshFlowData = useCallback(() => {
    loadFlowData()
  }, [loadFlowData])

  // Export flow diagram
  const exportFlowDiagram = useCallback(async (format: 'svg' | 'png' | 'json'): Promise<string> => {
    try {
      return await flowVisualizationEngine.exportFlowDiagram(operationId, format)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      toast.error(errorMessage)
      throw err
    }
  }, [operationId])

  // Auto-refresh when executing
  useEffect(() => {
    if (!autoRefresh) return

    if (state.isExecuting) {
      const refreshLoop = () => {
        loadFlowData()
        refreshTimeoutRef.current = setTimeout(refreshLoop, refreshInterval)
      }
      refreshLoop()
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [autoRefresh, state.isExecuting, refreshInterval, loadFlowData])

  // Initial load
  useEffect(() => {
    loadFlowData()
  }, [loadFlowData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    operation: state.operation,
    flowDiagram: state.flowDiagram,
    executionProgress: state.executionProgress,
    simulationResult: state.simulationResult,
    simulationVisualization: state.simulationVisualization,
    isExecuting: state.isExecuting,
    isSimulating: state.isSimulating,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Actions
    executeOperation,
    simulateOperation,
    cancelExecution,
    refreshFlowData,
    exportFlowDiagram,

    // Computed values
    canExecute: Boolean(address && state.operation && !state.isExecuting),
    canSimulate: Boolean(state.operation && !state.isSimulating),
    hasSimulationResults: Boolean(state.simulationResult || state.simulationVisualization),
    executionStatus: state.operation?.status,
    progressPercentage: state.executionProgress?.overallProgress || 0,
    completedSteps: state.executionProgress?.completedSteps.length || 0,
    totalSteps: state.executionProgress?.totalSteps || state.operation?.steps.length || 0
  }
}