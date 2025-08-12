'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { useAtomicOperations } from '@/hooks/useAtomicOperations'
import { Layers, Plus, Trash2, Play, AlertTriangle, Settings, Clock, Zap } from 'lucide-react'
import { isAddress } from 'viem'
import type { TransactionStep } from '@/services/atomic/atomicEngine'

interface StepFormData {
  contract: string
  function: string
  args: string[]
  value: string
  gasLimit: string
}

const COMMON_FUNCTIONS = [
  'approve',
  'transfer',
  'transferFrom',
  'mint',
  'burn',
  'safeTransferFrom',
  'setApprovalForAll'
]

export function BatchOperationBuilder() {
  const { address } = useAccount()
  const { createBatchOperation, simulateOperation, isLoading } = useAtomicOperations()
  
  const [steps, setSteps] = useState<StepFormData[]>([{
    contract: '',
    function: '',
    args: [],
    value: '0',
    gasLimit: '100000'
  }])
  
  const [batchSettings, setBatchSettings] = useState({
    revertOnFailure: true,
    deadline: '1',
    gasPrice: '',
    maxGasLimit: ''
  })
  
  const [errors, setErrors] = useState<string[]>([])
  const [createdOperationId, setCreatedOperationId] = useState<string | null>(null)

  const addStep = () => {
    setSteps(prev => [...prev, {
      contract: '',
      function: '',
      args: [],
      value: '0',
      gasLimit: '100000'
    }])
  }

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(prev => prev.filter((_, i) => i !== index))
    }
  }

  const updateStep = (index: number, field: keyof StepFormData, value: any) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, [field]: value } : step
    ))
  }

  const updateStepArg = (stepIndex: number, argIndex: number, value: string) => {
    setSteps(prev => prev.map((step, i) => {
      if (i !== stepIndex) return step
      
      const newArgs = [...step.args]
      newArgs[argIndex] = value
      return { ...step, args: newArgs }
    }))
  }

  const addArgument = (stepIndex: number) => {
    setSteps(prev => prev.map((step, i) => 
      i === stepIndex ? { ...step, args: [...step.args, ''] } : step
    ))
  }

  const removeArgument = (stepIndex: number, argIndex: number) => {
    setSteps(prev => prev.map((step, i) => 
      i === stepIndex 
        ? { ...step, args: step.args.filter((_, ai) => ai !== argIndex) }
        : step
    ))
  }

  const validateBatch = (): boolean => {
    const newErrors: string[] = []

    if (steps.length === 0) {
      newErrors.push('At least one step is required')
    }

    steps.forEach((step, index) => {
      if (!step.contract || !isAddress(step.contract)) {
        newErrors.push(`Step ${index + 1}: Contract address is required and must be valid`)
      }

      if (!step.function.trim()) {
        newErrors.push(`Step ${index + 1}: Function name is required`)
      }

      const gasLimit = parseInt(step.gasLimit)
      if (isNaN(gasLimit) || gasLimit <= 0) {
        newErrors.push(`Step ${index + 1}: Gas limit must be a positive number`)
      }

      const value = parseFloat(step.value)
      if (isNaN(value) || value < 0) {
        newErrors.push(`Step ${index + 1}: Value must be a non-negative number`)
      }
    })

    const deadline = parseFloat(batchSettings.deadline)
    if (isNaN(deadline) || deadline <= 0 || deadline > 24) {
      newErrors.push('Deadline must be between 0 and 24 hours')
    }

    if (batchSettings.gasPrice && (isNaN(parseFloat(batchSettings.gasPrice)) || parseFloat(batchSettings.gasPrice) <= 0)) {
      newErrors.push('Gas price must be a positive number if specified')
    }

    if (batchSettings.maxGasLimit && (isNaN(parseFloat(batchSettings.maxGasLimit)) || parseFloat(batchSettings.maxGasLimit) <= 0)) {
      newErrors.push('Max gas limit must be a positive number if specified')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleCreateBatch = async () => {
    if (!validateBatch() || !address) return

    try {
      const transactionSteps: Omit<TransactionStep, 'id' | 'executed'>[] = steps.map(step => ({
        contract: step.contract as `0x${string}`,
        function: step.function,
        args: step.args.filter(arg => arg.trim() !== ''),
        value: step.value === '0' ? undefined : BigInt(Math.floor(parseFloat(step.value) * 1e18)),
        gasLimit: BigInt(step.gasLimit)
      }))

      const operation = await createBatchOperation({
        steps: transactionSteps,
        gasLimit: batchSettings.maxGasLimit ? BigInt(batchSettings.maxGasLimit) : undefined,
        gasPrice: batchSettings.gasPrice ? BigInt(Math.floor(parseFloat(batchSettings.gasPrice) * 1e9)) : undefined,
        deadline: Math.floor(Date.now() / 1000) + (parseFloat(batchSettings.deadline) * 3600),
        revertOnFailure: batchSettings.revertOnFailure
      })

      if (operation) {
        setCreatedOperationId(operation.id)
        // Reset form
        setSteps([{
          contract: '',
          function: '',
          args: [],
          value: '0',
          gasLimit: '100000'
        }])
        setErrors([])
      }
    } catch (error) {
      console.error('Failed to create batch operation:', error)
    }
  }

  const handleSimulate = async () => {
    if (!createdOperationId) return
    await simulateOperation(createdOperationId)
  }

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layers className="w-5 h-5" />
            <span>Batch Operation Builder</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to create batch operations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layers className="w-5 h-5" />
            <span>Batch Operation Builder</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Build atomic batch operations that execute multiple transactions sequentially
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Transaction Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Transaction Steps</h3>
              <Button onClick={addStep} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </div>
            
            {steps.map((step, stepIndex) => (
              <Card key={stepIndex} className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <Badge variant="outline">Step {stepIndex + 1}</Badge>
                  {steps.length > 1 && (
                    <Button
                      onClick={() => removeStep(stepIndex)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Contract Address</Label>
                    <Input
                      placeholder="0x..."
                      value={step.contract}
                      onChange={(e) => updateStep(stepIndex, 'contract', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label>Function Name</Label>
                    <Select
                      value={step.function}
                      onValueChange={(value) => updateStep(stepIndex, 'function', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select function" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_FUNCTIONS.map(fn => (
                          <SelectItem key={fn} value={fn}>
                            {fn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>ETH Value</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={step.value}
                      onChange={(e) => updateStep(stepIndex, 'value', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label>Gas Limit</Label>
                    <Input
                      type="number"
                      placeholder="100000"
                      value={step.gasLimit}
                      onChange={(e) => updateStep(stepIndex, 'gasLimit', e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Function Arguments */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Arguments</Label>
                    <Button
                      onClick={() => addArgument(stepIndex)}
                      variant="ghost"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Argument
                    </Button>
                  </div>
                  
                  {step.args.map((arg, argIndex) => (
                    <div key={argIndex} className="flex items-center space-x-2">
                      <Input
                        placeholder={`Argument ${argIndex + 1}`}
                        value={arg}
                        onChange={(e) => updateStepArg(stepIndex, argIndex, e.target.value)}
                      />
                      <Button
                        onClick={() => removeArgument(stepIndex, argIndex)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {step.args.length === 0 && (
                    <p className="text-sm text-gray-500">No arguments added</p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Batch Settings */}
          <Card className="p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-4 h-4" />
              <h3 className="font-medium">Batch Settings</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deadline" className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Deadline (hours)</span>
                </Label>
                <Input
                  id="deadline"
                  type="number"
                  min="0.1"
                  max="24"
                  step="0.1"
                  value={batchSettings.deadline}
                  onChange={(e) => setBatchSettings(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="gasPrice">Gas Price (Gwei)</Label>
                <Input
                  id="gasPrice"
                  type="number"
                  placeholder="Auto"
                  value={batchSettings.gasPrice}
                  onChange={(e) => setBatchSettings(prev => ({ ...prev, gasPrice: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="maxGasLimit">Max Gas Limit</Label>
              <Input
                id="maxGasLimit"
                type="number"
                placeholder="Auto"
                value={batchSettings.maxGasLimit}
                onChange={(e) => setBatchSettings(prev => ({ ...prev, maxGasLimit: e.target.value }))}
              />
            </div>
            
            <div className="mt-4 flex items-center space-x-2">
              <Switch
                id="revertOnFailure"
                checked={batchSettings.revertOnFailure}
                onCheckedChange={(checked) => setBatchSettings(prev => ({ ...prev, revertOnFailure: checked }))}
              />
              <Label htmlFor="revertOnFailure" className="text-sm">
                Revert entire batch if any step fails (atomic execution)
              </Label>
            </div>
          </Card>

          {/* Batch Summary */}
          {steps.length > 0 && steps.some(s => s.contract && s.function) && (
            <Card className="p-4 bg-gray-50">
              <h4 className="font-medium mb-2">Batch Summary</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Total steps:</span>
                  <span>{steps.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated gas:</span>
                  <span>{steps.reduce((sum, step) => sum + parseInt(step.gasLimit || '0'), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total ETH value:</span>
                  <span>{steps.reduce((sum, step) => sum + parseFloat(step.value || '0'), 0).toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span>Execution mode:</span>
                  <span>{batchSettings.revertOnFailure ? 'Atomic' : 'Best effort'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expires in:</span>
                  <span>{batchSettings.deadline} hours</span>
                </div>
              </div>
            </Card>
          )}

          <div className="flex space-x-4">
            <Button
              onClick={handleCreateBatch}
              disabled={isLoading || errors.length > 0}
              className="flex-1"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Create Batch Operation</span>
                </div>
              )}
            </Button>
            
            {createdOperationId && (
              <Button onClick={handleSimulate} variant="outline">
                <Play className="w-4 h-4 mr-2" />
                Test Simulation
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Atomic Mode:</strong> All steps execute successfully or the entire batch fails and reverts.</p>
            <p><strong>Best Effort Mode:</strong> Steps execute independently - some can succeed while others fail.</p>
            <p>Always test with simulation before executing on mainnet.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}