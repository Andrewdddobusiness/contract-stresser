'use client'

import React, { useCallback, useEffect, useState, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ConnectionMode,
  Panel,
  ReactFlowProvider,
  Connection,
  NodeDragHandler,
  SelectionMode
} from 'reactflow'
import 'reactflow/dist/style.css'

// Components
import { BlockPalette } from './BlockPalette'
import { BlockConfigurationPanel } from './BlockConfigurationPanel'
import { ContractCallBlock } from './blocks/ContractCallBlock'
import { TokenTransferBlock } from './blocks/TokenTransferBlock'
import { AtomicSwapBlock } from './blocks/AtomicSwapBlock'
import { ConditionalBlock } from './blocks/ConditionalBlock'

// UI Components  
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Save, 
  Play, 
  Download, 
  Upload,
  Settings,
  Eye,
  AlertTriangle,
  CheckCircle,
  FileCode,
  Zap,
  Clock,
  Info,
  History,
  Package,
  Template,
  GitBranch,
  Share
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/utils/cn'

// Services
import { 
  flowBuilderService, 
  Flow, 
  FlowBlock, 
  BlockType,
  FlowValidation
} from '@/services/flowDesigner/flowBuilder'
import { getBlockDefinition } from '@/services/flowDesigner/blockTypes'
import { FlowVisualization } from '@/components/visualization/FlowVisualization'
import { FlowSimulator } from '@/components/visualization/FlowSimulator'
import { TemplateMarketplace } from '@/components/templates/TemplateMarketplace'
import { TemplateParameterForm } from '@/components/templates/TemplateParameterForm'
import { VersionHistory } from '@/components/versioning/VersionHistory'
import { FlowTemplate, flowTemplateService } from '@/services/templates/templateEngine'
import { templateImportExportService } from '@/services/templates/templateImportExport'
import { flowVersioningService } from '@/services/versioning/flowVersioning'

interface FlowDesignerProps {
  flowId?: string
  onSave?: (flow: Flow) => void
  onExecute?: (flow: Flow) => void
  onSimulate?: (flow: Flow) => void
  className?: string
}

// Define custom node types
const nodeTypes = {
  contract_call: ContractCallBlock,
  token_transfer: TokenTransferBlock,
  atomic_swap: AtomicSwapBlock,
  conditional: ConditionalBlock,
  // Add more node types as needed
}

function FlowDesignerInner({ 
  flowId, 
  onSave, 
  onExecute, 
  onSimulate,
  className 
}: FlowDesignerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedBlock, setSelectedBlock] = useState<FlowBlock | null>(null)
  const [currentFlow, setCurrentFlow] = useState<Flow | null>(null)
  const [flowValidation, setFlowValidation] = useState<FlowValidation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'designer' | 'visualization' | 'simulation' | 'templates' | 'versions'>('designer')
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null)
  const [showTemplateForm, setShowTemplateForm] = useState(false)

  const { fitView, getViewport, setViewport } = useReactFlow()

  // Load flow data
  const loadFlow = useCallback(async () => {
    if (!flowId) {
      // Create new flow
      const newFlow = await flowBuilderService.createFlow()
      setCurrentFlow(newFlow)
      return
    }

    const flow = flowBuilderService.getFlow(flowId)
    if (flow) {
      setCurrentFlow(flow)
      
      // Convert flow blocks to ReactFlow nodes
      const reactFlowNodes: Node[] = flow.blocks.map(block => ({
        id: block.id,
        type: block.type,
        position: block.position,
        data: block,
        selected: false
      }))

      // Convert flow connections to ReactFlow edges
      const reactFlowEdges: Edge[] = flow.connections.map(conn => ({
        id: conn.id,
        source: conn.sourceBlock,
        target: conn.targetBlock,
        sourceHandle: conn.sourceOutput,
        targetHandle: conn.targetInput,
        type: 'default',
        animated: false
      }))

      setNodes(reactFlowNodes)
      setEdges(reactFlowEdges)
      
      // Validate flow
      const validation = await flowBuilderService.validateFlow(flow.id)
      setFlowValidation(validation)
    }
  }, [flowId, setNodes, setEdges])

  // Load flow on mount
  useEffect(() => {
    loadFlow()
  }, [loadFlow])

  // Handle drag from palette
  const onDragStart = useCallback((event: React.DragEvent, blockType: BlockType) => {
    event.dataTransfer.setData('application/reactflow', blockType)
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault()

      const blockType = event.dataTransfer.getData('application/reactflow') as BlockType
      if (!blockType || !currentFlow) return

      const reactFlowBounds = (event.currentTarget as Element).getBoundingClientRect()
      const position = {
        x: event.clientX - reactFlowBounds.left - 120, // Center the block
        y: event.clientY - reactFlowBounds.top - 40
      }

      try {
        const newBlock = await flowBuilderService.addBlock(currentFlow.id, {
          type: blockType,
          position
        })

        const newNode: Node = {
          id: newBlock.id,
          type: blockType,
          position,
          data: newBlock
        }

        setNodes(nds => [...nds, newNode])
        
        // Update flow validation
        const validation = await flowBuilderService.validateFlow(currentFlow.id)
        setFlowValidation(validation)
        
        toast.success('Block added to flow')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add block'
        toast.error(errorMessage)
      }
    },
    [currentFlow, setNodes]
  )

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const block = currentFlow?.blocks.find(b => b.id === node.id)
    setSelectedBlock(block || null)
  }, [currentFlow])

  // Handle connections
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!currentFlow || !connection.source || !connection.target) return

      try {
        await flowBuilderService.connectBlocks(currentFlow.id, {
          sourceBlock: connection.source,
          sourceOutput: connection.sourceHandle || 'default',
          targetBlock: connection.target,
          targetInput: connection.targetHandle || 'default'
        })

        setEdges(eds => addEdge({
          ...connection,
          type: 'default',
          animated: false
        }, eds))

        // Update validation
        const validation = await flowBuilderService.validateFlow(currentFlow.id)
        setFlowValidation(validation)

        toast.success('Blocks connected')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect blocks'
        toast.error(errorMessage)
      }
    },
    [currentFlow, setEdges]
  )

  // Handle node position updates
  const onNodeDragStop: NodeDragHandler = useCallback(
    async (event, node) => {
      if (!currentFlow) return

      try {
        await flowBuilderService.updateBlock(currentFlow.id, node.id, {
          position: node.position
        })
      } catch (error) {
        console.warn('Failed to update block position:', error)
      }
    },
    [currentFlow]
  )

  // Handle block configuration changes
  const onBlockConfigChange = useCallback(
    async (blockId: string, field: string, value: any) => {
      if (!currentFlow) return

      try {
        const updatedBlock = await flowBuilderService.updateBlock(currentFlow.id, blockId, {
          config: {
            ...currentFlow.blocks.find(b => b.id === blockId)?.config,
            [field]: value
          }
        })

        // Update the node data
        setNodes(nds => nds.map(node => 
          node.id === blockId 
            ? { ...node, data: updatedBlock }
            : node
        ))

        // Update selected block
        if (selectedBlock?.id === blockId) {
          setSelectedBlock(updatedBlock)
        }

        // Update validation
        const validation = await flowBuilderService.validateFlow(currentFlow.id)
        setFlowValidation(validation)

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update block'
        toast.error(errorMessage)
      }
    },
    [currentFlow, selectedBlock, setNodes]
  )

  // Handle block deletion
  const onBlockDelete = useCallback(
    async (blockId: string) => {
      if (!currentFlow) return

      try {
        await flowBuilderService.removeBlock(currentFlow.id, blockId)
        
        setNodes(nds => nds.filter(node => node.id !== blockId))
        setEdges(eds => eds.filter(edge => edge.source !== blockId && edge.target !== blockId))
        
        if (selectedBlock?.id === blockId) {
          setSelectedBlock(null)
        }

        // Update validation
        const validation = await flowBuilderService.validateFlow(currentFlow.id)
        setFlowValidation(validation)

        toast.success('Block deleted')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete block'
        toast.error(errorMessage)
      }
    },
    [currentFlow, selectedBlock, setNodes, setEdges]
  )

  // Handle block duplication
  const onBlockDuplicate = useCallback(
    async (blockId: string) => {
      if (!currentFlow) return

      const originalBlock = currentFlow.blocks.find(b => b.id === blockId)
      if (!originalBlock) return

      try {
        const newBlock = await flowBuilderService.addBlock(currentFlow.id, {
          ...originalBlock,
          position: {
            x: originalBlock.position.x + 50,
            y: originalBlock.position.y + 50
          },
          name: `${originalBlock.name || getBlockDefinition(originalBlock.type).name} Copy`
        })

        const newNode: Node = {
          id: newBlock.id,
          type: newBlock.type,
          position: newBlock.position,
          data: newBlock
        }

        setNodes(nds => [...nds, newNode])
        
        toast.success('Block duplicated')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to duplicate block'
        toast.error(errorMessage)
      }
    },
    [currentFlow, setNodes]
  )

  // Handle save
  const handleSave = useCallback(async () => {
    if (!currentFlow) return

    setIsLoading(true)
    try {
      await flowBuilderService.saveFlow(currentFlow.id, {
        updatedAt: new Date()
      })
      
      if (onSave) {
        onSave(currentFlow)
      }
      
      toast.success('Flow saved successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save flow'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [currentFlow, onSave])

  // Handle execution
  const handleExecute = useCallback(async () => {
    if (!currentFlow) return

    // Validate first
    const validation = await flowBuilderService.validateFlow(currentFlow.id)
    if (!validation.isValid) {
      toast.error('Cannot execute: Flow has validation errors')
      return
    }

    setIsLoading(true)
    try {
      if (onExecute) {
        onExecute(currentFlow)
      } else {
        // Compile and execute
        const compilation = await flowBuilderService.compileFlow(currentFlow.id)
        if (compilation.success && compilation.operation) {
          // Execute the compiled operation
          toast.success('Flow execution started')
        } else {
          toast.error('Failed to compile flow')
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute flow'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [currentFlow, onExecute])

  // Handle simulation
  const handleSimulate = useCallback(async () => {
    if (!currentFlow) return

    setIsLoading(true)
    try {
      if (onSimulate) {
        onSimulate(currentFlow)
      } else {
        // Switch to simulation view
        setViewMode('simulation')
        toast.success('Simulation mode activated')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to simulate flow'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [currentFlow, onSimulate])

  // Clear selection when clicking on canvas
  const onPaneClick = useCallback(() => {
    setSelectedBlock(null)
  }, [])

  // Template Handlers
  const handleUseTemplate = useCallback(async (template: FlowTemplate) => {
    setSelectedTemplate(template)
    setShowTemplateForm(true)
  }, [])

  const handleApplyTemplate = useCallback(async (template: FlowTemplate, parameters: Record<string, any>) => {
    try {
      setIsLoading(true)
      const appliedFlow = await flowTemplateService.applyTemplate(template.id, parameters)
      
      // Convert applied flow to ReactFlow format
      const reactFlowNodes: Node[] = appliedFlow.blocks.map(block => ({
        id: block.id,
        type: block.type,
        position: block.position,
        data: block,
        selected: false
      }))

      const reactFlowEdges: Edge[] = appliedFlow.connections.map(conn => ({
        id: conn.id,
        source: conn.sourceBlock,
        target: conn.targetBlock,
        sourceHandle: conn.sourceOutput,
        targetHandle: conn.targetInput,
        type: 'default',
        animated: false
      }))

      setNodes(reactFlowNodes)
      setEdges(reactFlowEdges)
      setCurrentFlow(appliedFlow)
      
      // Validate the applied flow
      const validation = await flowBuilderService.validateFlow(appliedFlow.id)
      setFlowValidation(validation)

      setShowTemplateForm(false)
      setSelectedTemplate(null)
      setViewMode('designer')
      
      toast.success(`Template "${template.name}" applied successfully`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply template'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [setNodes, setEdges])

  const handleForkTemplate = useCallback(async (template: FlowTemplate) => {
    try {
      const forkedTemplate = await flowTemplateService.forkTemplate(template.id, [])
      toast.success(`Forked template as "${forkedTemplate.name}"`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fork template'
      toast.error(errorMessage)
    }
  }, [])

  const handleCreateTemplate = useCallback(async () => {
    if (!currentFlow) return

    try {
      setIsLoading(true)
      const template = await flowTemplateService.createTemplate(currentFlow, {
        name: `${currentFlow.name} Template`,
        description: `Template created from ${currentFlow.name}`,
        category: 'Utility',
        difficulty: 'intermediate',
        tags: ['custom', 'user-created']
      })
      
      toast.success(`Template "${template.name}" created successfully`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create template'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [currentFlow])

  const handleExportFlow = useCallback(async () => {
    if (!currentFlow) return

    try {
      const exportData = await templateImportExportService.exportFlowAsTemplate(
        currentFlow,
        {
          name: `${currentFlow.name} Export`,
          description: `Exported flow: ${currentFlow.description}`,
          category: 'Utility',
          difficulty: 'intermediate'
        }
      )

      const blob = new Blob([exportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentFlow.name.replace(/\s+/g, '_')}_template.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Flow exported successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export flow'
      toast.error(errorMessage)
    }
  }, [currentFlow])

  const handleImportFlow = useCallback(async (file: File) => {
    try {
      setIsLoading(true)
      const result = await templateImportExportService.importFromFile(file, {
        overwrite: false,
        validateCompatibility: true,
        updateExisting: false,
        skipDuplicates: false
      })

      if (result.success && result.imported.length > 0) {
        const importedTemplate = result.imported[0]
        handleUseTemplate(importedTemplate)
        toast.success(`Imported template "${importedTemplate.name}"`)
      } else if (result.errors.length > 0) {
        toast.error(`Import failed: ${result.errors[0].error}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import flow'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [handleUseTemplate])

  // Version Control Handlers
  const handleCreateVersion = useCallback(async () => {
    if (!currentFlow) return

    try {
      setIsLoading(true)
      const changes = [
        {
          type: 'modify' as const,
          target: 'metadata' as const,
          path: 'flow',
          description: 'Manual version creation',
          newValue: currentFlow
        }
      ]

      const version = await flowVersioningService.createVersion(currentFlow.id, changes, {
        description: 'Manual checkpoint',
        commitMessage: `Version created at ${new Date().toISOString()}`
      })

      toast.success(`Version ${version.version} created successfully`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create version'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [currentFlow])

  const handleRevertToVersion = useCallback(async (versionId: string) => {
    if (!currentFlow) return

    try {
      setIsLoading(true)
      const revertVersion = await flowVersioningService.revertToVersion(currentFlow.id, versionId)
      
      // Load the reverted flow
      await loadFlow()
      
      toast.success(`Reverted to version ${revertVersion.version}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to revert to version'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [currentFlow, loadFlow])

  const validationSummary = useMemo(() => {
    if (!flowValidation) return null

    return {
      errors: flowValidation.errors.length,
      warnings: flowValidation.warnings.length,
      isValid: flowValidation.isValid
    }
  }, [flowValidation])

  if (viewMode === 'visualization' && currentFlow) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('designer')}
              >
                Back to Designer
              </Button>
              <h2 className="text-lg font-semibold">{currentFlow.name} - Visualization</h2>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <FlowVisualization operationId={currentFlow.id} />
        </div>
      </div>
    )
  }

  if (viewMode === 'simulation' && currentFlow) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('designer')}
              >
                Back to Designer
              </Button>
              <h2 className="text-lg font-semibold">{currentFlow.name} - Simulation</h2>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4">
          <FlowSimulator operationId={currentFlow.id} />
        </div>
      </div>
    )
  }

  if (viewMode === 'templates') {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('designer')}
              >
                Back to Designer
              </Button>
              <h2 className="text-lg font-semibold">Template Marketplace</h2>
            </div>
          </div>
        </div>
        <div className="flex-1">
          {showTemplateForm && selectedTemplate ? (
            <TemplateParameterForm
              template={selectedTemplate}
              onApply={handleApplyTemplate}
              onCancel={() => {
                setShowTemplateForm(false)
                setSelectedTemplate(null)
              }}
            />
          ) : (
            <TemplateMarketplace
              onUseTemplate={handleUseTemplate}
              onForkTemplate={handleForkTemplate}
            />
          )}
        </div>
      </div>
    )
  }

  if (viewMode === 'versions' && currentFlow) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('designer')}
              >
                Back to Designer
              </Button>
              <h2 className="text-lg font-semibold">{currentFlow.name} - Version History</h2>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <VersionHistory
            flowId={currentFlow.id}
            onRevertToVersion={(version) => handleRevertToVersion(version.id)}
            onCreateVersion={handleCreateVersion}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Flow Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <div className="flex items-center space-x-2">
                <Input
                  value={currentFlow?.name || ''}
                  onChange={(e) => {
                    if (currentFlow) {
                      flowBuilderService.saveFlow(currentFlow.id, { name: e.target.value })
                      setCurrentFlow({ ...currentFlow, name: e.target.value })
                    }
                  }}
                  className="text-lg font-semibold border-0 px-0 focus:ring-0"
                  placeholder="Flow Name"
                />
                {validationSummary && (
                  <Badge 
                    variant={validationSummary.isValid ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {validationSummary.isValid ? 'Valid' : 'Invalid'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {nodes.length} blocks, {edges.length} connections
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('templates')}
            >
              <Template className="w-4 h-4 mr-1" />
              Templates
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('versions')}
              disabled={!currentFlow}
            >
              <History className="w-4 h-4 mr-1" />
              Versions
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('visualization')}
              disabled={!currentFlow}
            >
              <Eye className="w-4 h-4 mr-1" />
              Visualize
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulate}
              disabled={!currentFlow || isLoading}
            >
              <Settings className="w-4 h-4 mr-1" />
              Simulate
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!currentFlow || isLoading}
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>

            <Button
              onClick={handleExecute}
              disabled={!currentFlow || isLoading || !validationSummary?.isValid}
            >
              <Play className="w-4 h-4 mr-1" />
              Execute
            </Button>
          </div>
        </div>

        {/* Validation Summary */}
        {validationSummary && (validationSummary.errors > 0 || validationSummary.warnings > 0) && (
          <div className="mt-2">
            <Alert variant={validationSummary.errors > 0 ? "destructive" : "default"}>
              {validationSummary.errors > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              <AlertDescription>
                {validationSummary.errors > 0 && (
                  <span className="text-red-700">
                    {validationSummary.errors} error{validationSummary.errors !== 1 ? 's' : ''}
                  </span>
                )}
                {validationSummary.errors > 0 && validationSummary.warnings > 0 && ', '}
                {validationSummary.warnings > 0 && (
                  <span className="text-yellow-700">
                    {validationSummary.warnings} warning{validationSummary.warnings !== 1 ? 's' : ''}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      {/* Designer Layout */}
      <div className="flex-1 flex">
        {/* Block Palette */}
        <div className="w-80 border-r">
          <BlockPalette onDragStart={onDragStart} />
        </div>

        {/* Flow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDragStop={onNodeDragStop}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            selectionMode={SelectionMode.Partial}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            className="bg-gray-50 dark:bg-gray-900"
          >
            <Background />
            <Controls />
            <MiniMap 
              className="bg-white dark:bg-gray-800 border rounded"
              nodeColor={(node) => {
                const blockDef = getBlockDefinition(node.type as BlockType)
                switch (blockDef.category) {
                  case 'Contract Operations': return '#3b82f6'
                  case 'Token Operations': return '#10b981'
                  case 'Control Flow': return '#f59e0b'
                  case 'User Interaction': return '#8b5cf6'
                  case 'Utility': return '#6b7280'
                  default: return '#6b7280'
                }
              }}
            />
          </ReactFlow>
        </div>

        {/* Configuration Panel */}
        <div className="w-80 border-l">
          {selectedBlock ? (
            <BlockConfigurationPanel
              block={selectedBlock}
              onChange={onBlockConfigChange}
              onDelete={onBlockDelete}
              onDuplicate={onBlockDuplicate}
            />
          ) : (
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Flow Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <FileCode className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Select a block to configure its settings
                  </p>
                </div>

                {currentFlow && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="flow-description">Flow Description</Label>
                      <Input
                        id="flow-description"
                        value={currentFlow.description}
                        onChange={(e) => {
                          flowBuilderService.saveFlow(currentFlow.id, { description: e.target.value })
                          setCurrentFlow({ ...currentFlow, description: e.target.value })
                        }}
                        placeholder="Describe what this flow does"
                      />
                    </div>

                    {/* Flow Statistics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-3 bg-muted rounded">
                        <div className="text-lg font-semibold">{nodes.length}</div>
                        <div className="text-muted-foreground">Blocks</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded">
                        <div className="text-lg font-semibold">{edges.length}</div>
                        <div className="text-muted-foreground">Connections</div>
                      </div>
                    </div>

                    {/* Flow Actions */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Flow Actions</h4>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateTemplate}
                          disabled={!currentFlow || isLoading}
                          className="text-xs"
                        >
                          <Package className="w-3 h-3 mr-1" />
                          Save Template
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateVersion}
                          disabled={!currentFlow || isLoading}
                          className="text-xs"
                        >
                          <GitBranch className="w-3 h-3 mr-1" />
                          Create Version
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportFlow}
                          disabled={!currentFlow || isLoading}
                          className="text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Export
                        </Button>

                        <label className="cursor-pointer">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            className="text-xs w-full"
                            asChild
                          >
                            <div>
                              <Upload className="w-3 h-3 mr-1" />
                              Import
                            </div>
                          </Button>
                          <input
                            type="file"
                            accept=".json,.yaml,.yml"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleImportFlow(file)
                                e.target.value = ''
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export function FlowDesigner(props: FlowDesignerProps) {
  return (
    <ReactFlowProvider>
      <FlowDesignerInner {...props} />
    </ReactFlowProvider>
  )
}