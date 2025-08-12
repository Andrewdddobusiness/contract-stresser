'use client'

import { useState, useEffect } from 'react'
import { Plus, Settings, Play, Pause, AlertTriangle, CheckCircle, Clock, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCurrentChain } from '@/services/blockchain/connection'
import { multiDeploymentService, DeploymentPlan, ContractConfig, DeploymentResult, ValidationResult } from '@/services/contracts/multiDeployment'
import { contractTemplateService, ContractType } from '@/services/contracts/contractTemplates'
import { formatDistanceToNow } from 'date-fns'

interface DeploymentPlannerProps {
  onPlanExecuted?: (result: DeploymentResult) => void
}

export function DeploymentPlanner({ onPlanExecuted }: DeploymentPlannerProps) {
  const chainId = useCurrentChain()
  const [plans, setPlans] = useState<DeploymentPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<DeploymentPlan | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isExecuting, setIsExecuting] = useState<string | null>(null)
  const [executionResults, setExecutionResults] = useState<Map<string, DeploymentResult>>(new Map())

  useEffect(() => {
    loadDeploymentPlans()
  }, [])

  const loadDeploymentPlans = () => {
    const allPlans = multiDeploymentService.getAllDeploymentPlans()
    setPlans(allPlans)
  }

  const handleCreatePlan = async (planConfig: Omit<DeploymentPlan, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      const plan = await multiDeploymentService.createDeploymentPlan({
        ...planConfig,
        parameters: {
          ...planConfig.parameters,
          chainId: chainId!
        }
      })
      setPlans(prev => [...prev, plan])
      setShowCreateDialog(false)
    } catch (error) {
      console.error('Failed to create deployment plan:', error)
    }
  }

  const handleExecutePlan = async (planId: string) => {
    if (!chainId) return
    
    setIsExecuting(planId)
    try {
      const result = await multiDeploymentService.executeDeploymentPlan(planId)
      setExecutionResults(prev => new Map(prev).set(planId, result))
      loadDeploymentPlans() // Refresh to get updated status
      onPlanExecuted?.(result)
    } catch (error) {
      console.error('Failed to execute deployment plan:', error)
    } finally {
      setIsExecuting(null)
    }
  }

  const handleDeletePlan = async (planId: string) => {
    try {
      await multiDeploymentService.deleteDeploymentPlan(planId)
      setPlans(prev => prev.filter(p => p.id !== planId))
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null)
      }
    } catch (error) {
      console.error('Failed to delete deployment plan:', error)
    }
  }

  const getStatusColor = (status: DeploymentPlan['status']): string => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'deploying': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      case 'rolled_back': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: DeploymentPlan['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'deploying': return <Clock className="w-4 h-4 animate-spin" />
      case 'failed': return <AlertTriangle className="w-4 h-4" />
      default: return <Settings className="w-4 h-4" />
    }
  }

  if (!chainId) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please connect to a network to manage deployment plans.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Multi-Contract Deployment
              </CardTitle>
              <CardDescription>
                Orchestrate complex deployments with dependency management
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plans List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-semibold">Deployment Plans</h3>
          {plans.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Settings className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium mb-2">No Deployment Plans</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first multi-contract deployment plan
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  Create Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            plans.map(plan => (
              <DeploymentPlanCard
                key={plan.id}
                plan={plan}
                isSelected={selectedPlan?.id === plan.id}
                isExecuting={isExecuting === plan.id}
                onClick={() => setSelectedPlan(plan)}
                onExecute={() => handleExecutePlan(plan.id)}
                onDelete={() => handleDeletePlan(plan.id)}
              />
            ))
          )}
        </div>

        {/* Plan Details */}
        <div className="lg:col-span-2">
          {selectedPlan ? (
            <DeploymentPlanDetails 
              plan={selectedPlan}
              executionResult={executionResults.get(selectedPlan.id)}
              isExecuting={isExecuting === selectedPlan.id}
              onExecute={() => handleExecutePlan(selectedPlan.id)}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Deployment Plan</h3>
                <p className="text-muted-foreground">
                  Choose a plan from the list to view its details and execute deployment
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Plan Dialog */}
      <CreatePlanDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreatePlan}
      />
    </div>
  )
}

interface DeploymentPlanCardProps {
  plan: DeploymentPlan
  isSelected: boolean
  isExecuting: boolean
  onClick: () => void
  onExecute: () => void
  onDelete: () => void
}

function DeploymentPlanCard({ 
  plan, 
  isSelected, 
  isExecuting, 
  onClick, 
  onExecute, 
  onDelete 
}: DeploymentPlanCardProps) {
  const getStatusColor = (status: DeploymentPlan['status']): string => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'deploying': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      case 'rolled_back': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: DeploymentPlan['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'deploying': return <Clock className="w-4 h-4 animate-spin" />
      case 'failed': return <AlertTriangle className="w-4 h-4" />
      default: return <Settings className="w-4 h-4" />
    }
  }

  return (
    <Card 
      className={`cursor-pointer transition-colors hover:bg-accent ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{plan.name}</CardTitle>
            <CardDescription className="text-sm">
              {plan.contracts.length} contracts
            </CardDescription>
          </div>
          <Badge className={getStatusColor(plan.status)}>
            {getStatusIcon(plan.status)}
            <span className="ml-1 capitalize">{plan.status}</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formatDistanceToNow(plan.createdAt, { addSuffix: true })}
          </span>
          <div className="flex gap-1">
            {plan.status === 'draft' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onExecute()
                }}
                disabled={isExecuting}
              >
                <Play className="w-3 h-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              disabled={isExecuting}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface DeploymentPlanDetailsProps {
  plan: DeploymentPlan
  executionResult?: DeploymentResult
  isExecuting: boolean
  onExecute: () => void
}

function DeploymentPlanDetails({ 
  plan, 
  executionResult, 
  isExecuting, 
  onExecute 
}: DeploymentPlanDetailsProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null)

  useEffect(() => {
    const validatePlan = async () => {
      const result = await multiDeploymentService.validateDeploymentPlan(plan.id)
      setValidation(result)
    }
    validatePlan()
  }, [plan.id])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="contracts" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="execution">Execution</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Contracts ({plan.contracts.length})</h4>
              {plan.status === 'draft' && (
                <Button 
                  onClick={onExecute}
                  disabled={isExecuting || !validation?.isValid}
                >
                  {isExecuting ? 'Deploying...' : 'Deploy All'}
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              {plan.contracts.map(contract => (
                <ContractConfigCard key={contract.id} contract={contract} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dependencies" className="space-y-4">
            <DependencyGraph 
              contracts={plan.contracts}
              dependencies={plan.dependencies}
            />
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validation ? (
              <ValidationResults validation={validation} />
            ) : (
              <div>Loading validation...</div>
            )}
          </TabsContent>

          <TabsContent value="execution" className="space-y-4">
            {executionResult ? (
              <ExecutionResults result={executionResult} />
            ) : (
              <div>No execution results available</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

interface ContractConfigCardProps {
  contract: ContractConfig
}

function ContractConfigCard({ contract }: ContractConfigCardProps) {
  const template = contractTemplateService.getTemplate(contract.type)
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{contract.name}</CardTitle>
            <CardDescription>{contract.type}</CardDescription>
          </div>
          <div className="flex gap-1">
            {template?.features.map(feature => (
              <Badge key={feature} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-2">
        <div>
          <h5 className="text-sm font-medium mb-1">Constructor Arguments</h5>
          <div className="text-xs space-y-1">
            {contract.constructorArgs.map(arg => (
              <div key={arg.name} className="flex justify-between">
                <span className="text-muted-foreground">{arg.name}:</span>
                <span className="font-mono">
                  {arg.isDependency ? `[${arg.dependsOn}]` : String(arg.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {contract.dependencies.length > 0 && (
          <div>
            <h5 className="text-sm font-medium mb-1">Dependencies</h5>
            <div className="flex flex-wrap gap-1">
              {contract.dependencies.map(dep => (
                <Badge key={dep} variant="secondary" className="text-xs">
                  {dep}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface DependencyGraphProps {
  contracts: ContractConfig[]
  dependencies: Record<string, string[]>
}

function DependencyGraph({ contracts, dependencies }: DependencyGraphProps) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium">Deployment Order</h4>
      <div className="space-y-2">
        {contracts.map((contract, index) => (
          <div key={contract.id} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
              {index + 1}
            </div>
            <div className="flex-1">
              <div className="font-medium">{contract.name}</div>
              <div className="text-sm text-muted-foreground">
                {contract.type}
                {dependencies[contract.id]?.length > 0 && (
                  <span> • Depends on: {dependencies[contract.id].join(', ')}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ValidationResultsProps {
  validation: ValidationResult
}

function ValidationResults({ validation }: ValidationResultsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {validation.isValid ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-600" />
        )}
        <h4 className="font-medium">
          Validation {validation.isValid ? 'Passed' : 'Failed'}
        </h4>
      </div>

      {validation.errors.length > 0 && (
        <div className="space-y-2">
          <h5 className="font-medium text-red-600">Errors</h5>
          {validation.errors.map((error, index) => (
            <Alert key={index} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error.contractId && `[${error.contractId}] `}
                {error.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="space-y-2">
          <h5 className="font-medium text-yellow-600">Warnings</h5>
          {validation.warnings.map((warning, index) => (
            <Alert key={index}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {warning.contractId && `[${warning.contractId}] `}
                {warning.message}
                {warning.suggestion && (
                  <div className="mt-1 text-sm">
                    Suggestion: {warning.suggestion}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  )
}

interface ExecutionResultsProps {
  result: DeploymentResult
}

function ExecutionResults({ result }: ExecutionResultsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {result.deployedContracts.length}
          </div>
          <div className="text-sm text-muted-foreground">Deployed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {result.failedContracts.length}
          </div>
          <div className="text-sm text-muted-foreground">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">
            {result.gasUsed.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Gas Used</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">
            {(result.duration / 1000).toFixed(1)}s
          </div>
          <div className="text-sm text-muted-foreground">Duration</div>
        </div>
      </div>

      {result.deployedContracts.length > 0 && (
        <div>
          <h5 className="font-medium mb-2">Deployed Contracts</h5>
          <div className="space-y-2">
            {result.deployedContracts.map(contract => (
              <div key={contract.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{contract.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {contract.address}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {contract.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.failedContracts.length > 0 && (
        <div>
          <h5 className="font-medium mb-2 text-red-600">Failed Contracts</h5>
          <div className="space-y-2">
            {result.failedContracts.map(contract => (
              <Alert key={contract.id} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{contract.name}</strong>: {contract.error}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface CreatePlanDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (plan: Omit<DeploymentPlan, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void
}

function CreatePlanDialog({ open, onClose, onSubmit }: CreatePlanDialogProps) {
  // This would be a comprehensive form for creating deployment plans
  // For now, just a placeholder
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create Deployment Plan</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          {/* This would contain forms for selecting contracts, configuring dependencies, etc. */}
          <p>Plan creation form would go here...</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}