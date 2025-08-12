'use client'

import React, { useCallback, useEffect, useState, useMemo } from 'react'
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
  ReactFlowProvider
} from 'reactflow'
import 'reactflow/dist/style.css'

// Custom Node Components
import { ContractNode } from './nodes/ContractNode'
import { UserNode } from './nodes/UserNode'
import { TokenNode } from './nodes/TokenNode'
import { OperationNode } from './nodes/OperationNode'

// Custom Edge Components
import { TransactionEdge } from './edges/TransactionEdge'
import { ApprovalEdge } from './edges/ApprovalEdge'
import { TransferEdge } from './edges/TransferEdge'
import { DependencyEdge } from './edges/DependencyEdge'

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Settings,
  Info,
  Loader2
} from 'lucide-react'

// Services
import { flowVisualizationEngine, type FlowDiagram, type ExecutionProgress } from '@/services/visualization/flowEngine'
import { atomicEngine, type AtomicOperation } from '@/services/atomic/atomicEngine'
import { cn } from '@/utils/cn'

interface FlowVisualizationProps {
  operationId: string
  simulationMode?: boolean
  onExecute?: () => void
  onSimulate?: () => void
  className?: string
}

// Define custom node types
const nodeTypes = {
  contract: ContractNode,
  user: UserNode,
  token: TokenNode,
  operation: OperationNode,
  step: ContractNode // Steps use contract node styling
}

// Define custom edge types
const edgeTypes = {
  transaction: TransactionEdge,
  approval: ApprovalEdge,
  transfer: TransferEdge,
  call: TransactionEdge, // Function calls use transaction edge
  dependency: DependencyEdge,
  data: DependencyEdge // Data flow uses dependency edge
}

function FlowVisualizationInner({ 
  operationId, 
  simulationMode = false, 
  onExecute,
  onSimulate,
  className 
}: FlowVisualizationProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [flowDiagram, setFlowDiagram] = useState<FlowDiagram | null>(null)
  const [executionProgress, setExecutionProgress] = useState<ExecutionProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load flow diagram
  const loadFlowDiagram = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get the atomic operation
      const operation = atomicEngine.getOperation(operationId)
      if (!operation) {
        throw new Error('Operation not found')
      }

      // Generate or get existing flow diagram
      let diagram = flowVisualizationEngine.getFlowDiagram(operationId)
      if (!diagram) {
        diagram = await flowVisualizationEngine.generateFlowDiagram(operation)
      }

      setFlowDiagram(diagram)

      // Convert to ReactFlow format
      const reactFlowNodes: Node[] = diagram.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        style: node.style
      }))

      const reactFlowEdges: Edge[] = diagram.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        data: edge.data,
        animated: edge.animated,
        style: edge.style
      }))

      setNodes(reactFlowNodes)
      setEdges(reactFlowEdges)

      // Check if operation is currently executing
      setIsExecuting(atomicEngine.isExecuting(operationId))

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load flow diagram'
      setError(errorMessage)
      console.error('Failed to load flow diagram:', err)
    } finally {
      setIsLoading(false)
    }
  }, [operationId, setNodes, setEdges])

  // Load execution progress
  const loadExecutionProgress = useCallback(() => {
    const progress = flowVisualizationEngine.getExecutionProgress(operationId)
    setExecutionProgress(progress)
  }, [operationId])

  // Update progress periodically when executing
  useEffect(() => {
    if (!isExecuting) return

    const interval = setInterval(() => {
      loadExecutionProgress()
      
      // Update node and edge statuses
      if (executionProgress && flowDiagram) {
        flowVisualizationEngine.updateFlowProgress(operationId, executionProgress)
        loadFlowDiagram() // Reload to get updated statuses
      }
      
      // Check if execution is complete
      const operation = atomicEngine.getOperation(operationId)
      if (operation && (operation.status === 'completed' || operation.status === 'failed')) {
        setIsExecuting(false)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isExecuting, operationId, executionProgress, flowDiagram, loadExecutionProgress, loadFlowDiagram])

  // Load diagram on component mount and operation change
  useEffect(() => {
    loadFlowDiagram()
  }, [loadFlowDiagram])

  // Handle execution
  const handleExecute = useCallback(async () => {
    if (!onExecute) return
    
    try {
      setIsExecuting(true)
      await onExecute()
    } catch (err) {
      setIsExecuting(false)
      const errorMessage = err instanceof Error ? err.message : 'Execution failed'
      setError(errorMessage)
    }
  }, [onExecute])

  // Handle simulation
  const handleSimulate = useCallback(async () => {
    if (!onSimulate) return
    
    try {
      setIsLoading(true)
      await onSimulate()
      await loadFlowDiagram() // Reload to show simulation results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Simulation failed'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [onSimulate, loadFlowDiagram])

  // Handle reset
  const handleReset = useCallback(() => {
    loadFlowDiagram()
    setExecutionProgress(null)
    setError(null)
  }, [loadFlowDiagram])

  // Handle export
  const handleExport = useCallback(async (format: 'svg' | 'png' | 'json') => {
    try {
      const exported = await flowVisualizationEngine.exportFlowDiagram(operationId, format)
      
      // Create download link
      const blob = new Blob([exported], { 
        type: format === 'json' ? 'application/json' : `image/${format}` 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `flow-${operationId}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      setError(errorMessage)
    }
  }, [operationId])

  // Get operation details
  const operation = useMemo(() => atomicEngine.getOperation(operationId), [operationId])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            <p className="text-sm text-gray-600">Loading flow diagram...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleReset} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {operation?.metadata.title || `Flow ${operationId}`}
            </CardTitle>
            {operation?.metadata.description && (
              <p className="text-sm text-gray-600 mt-1">
                {operation.metadata.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {operation && (
              <Badge 
                variant={operation.status === 'completed' ? 'default' : 'outline'}
                className={cn(
                  "capitalize",
                  operation.status === 'executing' && "bg-blue-100 text-blue-700",
                  operation.status === 'completed' && "bg-green-100 text-green-700",
                  operation.status === 'failed' && "bg-red-100 text-red-700"
                )}
              >
                {operation.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {executionProgress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progress: {executionProgress.completedSteps}/{executionProgress.totalSteps} steps</span>
              <span>{Math.round(executionProgress.overallProgress)}%</span>
            </div>
            <Progress value={executionProgress.overallProgress} className="h-1.5" />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0 relative">
        <div className="h-96 w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            attributionPosition="bottom-left"
            className="bg-gray-50 dark:bg-gray-900"
          >
            <Background />
            <Controls />
            <MiniMap 
              className="bg-white dark:bg-gray-800 border rounded"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'contract': return '#3b82f6'
                  case 'user': return '#8b5cf6'
                  case 'token': return '#f59e0b'
                  case 'operation': return '#10b981'
                  default: return '#6b7280'
                }
              }}
            />
            
            {/* Control Panel */}
            <Panel position="top-right" className="space-y-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 space-y-2">
                {/* Execution Controls */}
                {!simulationMode && (
                  <div className="flex space-x-1">
                    {!isExecuting ? (
                      <Button
                        size="sm"
                        onClick={handleExecute}
                        disabled={!onExecute || operation?.status === 'completed'}
                        className="h-8 px-2"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="h-8 px-2"
                      >
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSimulate}
                      disabled={!onSimulate}
                      className="h-8 px-2"
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReset}
                      className="h-8 px-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                
                {/* Export Controls */}
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport('json')}
                    className="h-8 px-2"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  )
}

export function FlowVisualization(props: FlowVisualizationProps) {
  return (
    <ReactFlowProvider>
      <FlowVisualizationInner {...props} />
    </ReactFlowProvider>
  )
}