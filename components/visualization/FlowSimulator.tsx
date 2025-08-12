'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  FastForward,
  Rewind,
  SkipForward,
  SkipBack,
  Settings,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Clock
} from 'lucide-react'
import { FlowVisualization } from './FlowVisualization'
import { useFlowExecution } from '@/hooks/useFlowExecution'
import { atomicEngine, type AtomicOperation } from '@/services/atomic/atomicEngine'
import { cn } from '@/utils/cn'

interface FlowSimulatorProps {
  operationId: string
  className?: string
}

interface SimulationState {
  isPlaying: boolean
  currentStep: number
  simulationSpeed: number
  stepProgress: number
  autoAdvance: boolean
}

export function FlowSimulator({ operationId, className }: FlowSimulatorProps) {
  const {
    operation,
    simulationResult,
    simulationVisualization,
    isSimulating,
    simulateOperation,
    error
  } = useFlowExecution({ operationId })

  const [simulationState, setSimulationState] = useState<SimulationState>({
    isPlaying: false,
    currentStep: 0,
    simulationSpeed: 1,
    stepProgress: 0,
    autoAdvance: true
  })

  const [hasSimulated, setHasSimulated] = useState(false)

  // Run simulation when component mounts
  useEffect(() => {
    if (operation && !hasSimulated && !isSimulating) {
      handleSimulate()
    }
  }, [operation, hasSimulated, isSimulating])

  const handleSimulate = useCallback(async () => {
    try {
      await simulateOperation()
      setHasSimulated(true)
      setSimulationState(prev => ({ ...prev, currentStep: 0, stepProgress: 0 }))
    } catch (err) {
      // Error is handled by the hook
    }
  }, [simulateOperation])

  const handlePlay = useCallback(() => {
    setSimulationState(prev => ({ ...prev, isPlaying: true }))
  }, [])

  const handlePause = useCallback(() => {
    setSimulationState(prev => ({ ...prev, isPlaying: false }))
  }, [])

  const handleStop = useCallback(() => {
    setSimulationState(prev => ({ 
      ...prev, 
      isPlaying: false, 
      currentStep: 0, 
      stepProgress: 0 
    }))
  }, [])

  const handleReset = useCallback(() => {
    setSimulationState(prev => ({ 
      ...prev, 
      isPlaying: false, 
      currentStep: 0, 
      stepProgress: 0 
    }))
    handleSimulate()
  }, [handleSimulate])

  const handleStepForward = useCallback(() => {
    if (!operation) return
    
    setSimulationState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, operation.steps.length - 1),
      stepProgress: 0
    }))
  }, [operation])

  const handleStepBackward = useCallback(() => {
    setSimulationState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
      stepProgress: 0
    }))
  }, [])

  const handleSpeedChange = useCallback((value: number[]) => {
    setSimulationState(prev => ({ ...prev, simulationSpeed: value[0] }))
  }, [])

  // Auto-advance simulation steps
  useEffect(() => {
    if (!simulationState.isPlaying || !operation || !simulationState.autoAdvance) return

    const stepDuration = 2000 / simulationState.simulationSpeed // 2 seconds per step at normal speed
    const progressInterval = 50 // Update progress every 50ms

    const interval = setInterval(() => {
      setSimulationState(prev => {
        const newStepProgress = prev.stepProgress + (progressInterval / stepDuration) * 100
        
        if (newStepProgress >= 100) {
          // Move to next step
          const nextStep = prev.currentStep + 1
          if (nextStep >= operation.steps.length) {
            // Simulation complete
            return { ...prev, isPlaying: false, stepProgress: 100 }
          }
          return { ...prev, currentStep: nextStep, stepProgress: 0 }
        }
        
        return { ...prev, stepProgress: newStepProgress }
      })
    }, progressInterval)

    return () => clearInterval(interval)
  }, [simulationState.isPlaying, simulationState.simulationSpeed, simulationState.autoAdvance, operation])

  const currentStepData = operation?.steps[simulationState.currentStep]
  const simulationStepResult = simulationVisualization?.simulationResults.stepResults[simulationState.currentStep]
  const overallProgress = operation ? ((simulationState.currentStep + simulationState.stepProgress / 100) / operation.steps.length) * 100 : 0

  if (!operation) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Operation not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Simulation Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Flow Simulation</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {simulationResult && (
                <Badge 
                  variant={simulationResult.canExecute ? 'default' : 'destructive'}
                  className="flex items-center space-x-1"
                >
                  {simulationResult.canExecute ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  <span>{simulationResult.canExecute ? 'Executable' : 'Issues Found'}</span>
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            
            <div className="flex justify-between text-xs text-gray-600">
              <span>Step {simulationState.currentStep + 1} of {operation.steps.length}</span>
              <span>{Math.round(simulationState.stepProgress)}% complete</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleStepBackward}
              disabled={simulationState.currentStep === 0}
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleStepBackward}
              disabled={simulationState.currentStep === 0}
            >
              <Rewind className="w-4 h-4" />
            </Button>

            {!simulationState.isPlaying ? (
              <Button onClick={handlePlay} disabled={isSimulating}>
                <Play className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handlePause}>
                <Pause className="w-4 h-4" />
              </Button>
            )}

            <Button size="sm" variant="outline" onClick={handleStop}>
              <Square className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleStepForward}
              disabled={simulationState.currentStep >= operation.steps.length - 1}
            >
              <FastForward className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleStepForward}
              disabled={simulationState.currentStep >= operation.steps.length - 1}
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Speed Control */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Simulation Speed</span>
              <span>{simulationState.simulationSpeed.toFixed(1)}x</span>
            </div>
            <Slider
              value={[simulationState.simulationSpeed]}
              onValueChange={handleSpeedChange}
              min={0.1}
              max={5}
              step={0.1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Step Info */}
      {currentStepData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Current Step: {currentStepData.function}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Contract:</span>
                <p className="font-mono text-xs">{currentStepData.contract}</p>
              </div>
              <div>
                <span className="text-gray-600">Function:</span>
                <p className="font-medium">{currentStepData.function}</p>
              </div>
            </div>

            {simulationStepResult && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {simulationStepResult.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    simulationStepResult.success ? "text-green-700" : "text-red-700"
                  )}>
                    {simulationStepResult.success ? 'Will Succeed' : 'Will Fail'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <Zap className="w-3 h-3" />
                    <span>Gas: {simulationStepResult.gasEstimate.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Time: ~{Math.round(simulationStepResult.executionTime)}ms</span>
                  </div>
                </div>

                {simulationStepResult.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {simulationStepResult.warnings.map((warning, index) => (
                          <p key={index} className="text-xs">{warning}</p>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Simulation Results Summary */}
      {simulationResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Simulation Results</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Est. Total Gas:</span>
                <p className="font-medium">{simulationResult.estimatedGas.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-600">Est. Cost:</span>
                <p className="font-medium">{(Number(simulationResult.estimatedCost) / 1e18).toFixed(6)} ETH</p>
              </div>
            </div>

            {simulationResult.warnings.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Warnings:</p>
                    {simulationResult.warnings.map((warning, index) => (
                      <p key={index} className="text-xs">{warning}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {simulationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Errors:</p>
                    {simulationResult.errors.map((error, index) => (
                      <p key={index} className="text-xs">{error}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Flow Visualization */}
      <FlowVisualization
        operationId={operationId}
        simulationMode={true}
        className="min-h-[500px]"
      />
    </div>
  )
}