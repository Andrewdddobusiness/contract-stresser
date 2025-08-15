'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Play,
  Pause,
  Square,
  RotateCcw,
  Settings,
  Zap,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Camera,
  Rewind,
  Info,
  Code,
  Database,
  Network
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Address, parseEther, parseGwei } from 'viem'
import { Flow } from '@/services/flowDesigner/flowBuilder'
import { 
  SimulationEnvironment, 
  SimulationResult, 
  StateModification, 
  SimulationSnapshot,
  simulationEngine 
} from '@/services/simulation/simulationEngine'

interface SimulationControlPanelProps {
  flow: Flow
  onSimulationComplete?: (result: SimulationResult) => void
  className?: string
}

interface EnvironmentConfigFormProps {
  onCreateEnvironment: (config: {
    name: string
    baseNetwork: number
    forkBlockNumber?: bigint
    initialModifications?: StateModification[]
    description?: string
  }) => Promise<void>
  isCreating: boolean
}

function EnvironmentConfigForm({ onCreateEnvironment, isCreating }: EnvironmentConfigFormProps) {
  const [config, setConfig] = useState({
    name: '',
    description: '',
    baseNetwork: 31337,
    forkBlockNumber: '',
    initialBalance: '100'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const initialModifications: StateModification[] = [
      {
        type: 'balance',
        target: '0x1000000000000000000000000000000000000001' as Address,
        value: parseEther(config.initialBalance || '100'),
        description: 'Set initial test account balance',
        applied: false,
        timestamp: new Date()
      }
    ]

    await onCreateEnvironment({
      name: config.name || `Test Environment ${Date.now()}`,
      baseNetwork: config.baseNetwork,
      forkBlockNumber: config.forkBlockNumber ? BigInt(config.forkBlockNumber) : undefined,
      initialModifications,
      description: config.description
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="env-name">Environment Name</Label>
          <Input
            id="env-name"
            value={config.name}
            onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
            placeholder="My Test Environment"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="base-network">Base Network</Label>
          <Select 
            value={config.baseNetwork.toString()} 
            onValueChange={(value) => setConfig(prev => ({ ...prev, baseNetwork: parseInt(value) }))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="31337">Anvil (Local)</SelectItem>
              <SelectItem value="1">Ethereum Mainnet Fork</SelectItem>
              <SelectItem value="11155111">Sepolia Testnet Fork</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fork-block">Fork Block Number (Optional)</Label>
          <Input
            id="fork-block"
            type="number"
            value={config.forkBlockNumber}
            onChange={(e) => setConfig(prev => ({ ...prev, forkBlockNumber: e.target.value }))}
            placeholder="Latest block"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="initial-balance">Initial Balance (ETH)</Label>
          <Input
            id="initial-balance"
            type="number"
            step="0.1"
            value={config.initialBalance}
            onChange={(e) => setConfig(prev => ({ ...prev, initialBalance: e.target.value }))}
            placeholder="100"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={config.description}
          onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the purpose of this environment..."
          rows={2}
          className="mt-1"
        />
      </div>

      <Button type="submit" disabled={isCreating} className="w-full">
        {isCreating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Creating Environment...
          </>
        ) : (
          <>
            <Database className="w-4 h-4 mr-2" />
            Create Environment
          </>
        )}
      </Button>
    </form>
  )
}

interface EnvironmentStatusProps {
  environment: SimulationEnvironment
  onReset: () => void
  onTerminate: () => void
  onSnapshot: (name: string, description: string) => void
  snapshots: SimulationSnapshot[]
  onRevertSnapshot: (snapshotId: string) => void
}

function EnvironmentStatus({ 
  environment, 
  onReset, 
  onTerminate, 
  onSnapshot,
  snapshots,
  onRevertSnapshot
}: EnvironmentStatusProps) {
  const [showSnapshotForm, setShowSnapshotForm] = useState(false)
  const [snapshotData, setSnapshotData] = useState({ name: '', description: '' })

  const handleCreateSnapshot = () => {
    if (snapshotData.name) {
      onSnapshot(snapshotData.name, snapshotData.description)
      setSnapshotData({ name: '', description: '' })
      setShowSnapshotForm(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'terminated': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>{environment.name}</span>
            <Badge className={getStatusColor(environment.status)}>
              {environment.status}
            </Badge>
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Network: {environment.baseNetwork} | Block: {environment.forkBlockNumber.toString()}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowSnapshotForm(true)}>
            <Camera className="w-4 h-4 mr-1" />
            Snapshot
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
          <Button variant="destructive" size="sm" onClick={onTerminate}>
            <XCircle className="w-4 h-4 mr-1" />
            Terminate
          </Button>
        </div>
      </div>

      {environment.modifications.length > 0 && (
        <div>
          <h5 className="text-sm font-medium mb-2">State Modifications</h5>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {environment.modifications.map((mod, index) => (
              <div key={index} className="text-xs p-2 bg-muted rounded flex items-center justify-between">
                <span>{mod.description}</span>
                <Badge variant={mod.applied ? "default" : "secondary"} className="text-xs">
                  {mod.applied ? "Applied" : "Pending"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshots.length > 0 && (
        <div>
          <h5 className="text-sm font-medium mb-2">Snapshots</h5>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {snapshots.map((snapshot) => (
              <div key={snapshot.id} className="text-xs p-2 bg-muted rounded flex items-center justify-between">
                <div>
                  <span className="font-medium">{snapshot.name}</span>
                  {snapshot.description && (
                    <p className="text-muted-foreground">{snapshot.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevertSnapshot(snapshot.id)}
                  className="h-6 px-2"
                >
                  <Rewind className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshot Creation Form */}
      {showSnapshotForm && (
        <Card className="p-4">
          <div className="space-y-3">
            <h5 className="font-medium">Create Snapshot</h5>
            <Input
              placeholder="Snapshot name"
              value={snapshotData.name}
              onChange={(e) => setSnapshotData(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Description (optional)"
              value={snapshotData.description}
              onChange={(e) => setSnapshotData(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="flex space-x-2">
              <Button onClick={handleCreateSnapshot} size="sm" disabled={!snapshotData.name}>
                Create
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSnapshotForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

interface SimulationProgressProps {
  isRunning: boolean
  progress: number
  currentStep: string
  result?: SimulationResult
}

function SimulationProgress({ isRunning, progress, currentStep, result }: SimulationProgressProps) {
  if (!isRunning && !result) {
    return null
  }

  return (
    <div className="space-y-4">
      {isRunning && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Running Simulation...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center text-sm text-muted-foreground">
            <Activity className="w-4 h-4 mr-2 animate-pulse" />
            {currentStep}
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <h4 className="font-medium">
              Simulation {result.success ? 'Completed' : 'Failed'}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center">
                  <Zap className="w-4 h-4 mr-1" />
                  Gas Used
                </span>
                <span className="font-mono">{result.gasUsed.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Execution Time
                </span>
                <span>{result.performance.executionTime}ms</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Success Rate
                </span>
                <span>{result.performance.successRate}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center">
                  <Activity className="w-4 h-4 mr-1" />
                  Events
                </span>
                <span>{result.events.length}</span>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {result.errors.length} error(s) occurred during simulation.
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">View Details</summary>
                  <div className="mt-2 space-y-1">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-xs p-2 bg-red-50 rounded">
                        <strong>{error.type}:</strong> {error.message}
                      </div>
                    ))}
                  </div>
                </details>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}

export function SimulationControlPanel({ 
  flow, 
  onSimulationComplete, 
  className 
}: SimulationControlPanelProps) {
  const [environment, setEnvironment] = useState<SimulationEnvironment | null>(null)
  const [isCreatingEnvironment, setIsCreatingEnvironment] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [snapshots, setSnapshots] = useState<SimulationSnapshot[]>([])

  useEffect(() => {
    if (environment) {
      setSnapshots(environment.snapshots || [])
    }
  }, [environment])

  const handleCreateEnvironment = async (config: {
    name: string
    baseNetwork: number
    forkBlockNumber?: bigint
    initialModifications?: StateModification[]
    description?: string
  }) => {
    setIsCreatingEnvironment(true)
    try {
      const env = await simulationEngine.createEnvironment(config)
      setEnvironment(env)
      setSimulationResult(null) // Clear previous results
    } catch (error) {
      console.error('Failed to create environment:', error)
    } finally {
      setIsCreatingEnvironment(false)
    }
  }

  const handleRunSimulation = async () => {
    if (!environment) return

    setIsSimulating(true)
    setSimulationProgress(0)
    setSimulationResult(null)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSimulationProgress(prev => {
          const next = prev + Math.random() * 20
          return next >= 100 ? 100 : next
        })
      }, 200)

      // Simulate different steps
      const steps = [
        'Initializing simulation environment...',
        'Deploying contracts...',
        'Setting up accounts...',
        'Executing flow blocks...',
        'Collecting results...',
        'Analyzing performance...'
      ]

      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i])
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      const result = await simulationEngine.simulateFlow(environment.id, flow)
      
      clearInterval(progressInterval)
      setSimulationProgress(100)
      setSimulationResult(result)
      onSimulationComplete?.(result)

    } catch (error) {
      console.error('Simulation failed:', error)
      setSimulationResult({
        id: 'error',
        success: false,
        gasUsed: 0n,
        gasPrice: 0n,
        blockNumber: 0n,
        timestamp: Date.now(),
        events: [],
        stateChanges: [],
        errors: [{
          type: 'network',
          message: error instanceof Error ? error.message : 'Unknown error',
          blockNumber: 0n,
          gasUsed: 0n
        }],
        performance: {
          totalGasUsed: 0n,
          averageGasPrice: 0n,
          executionTime: 0,
          blockCount: 0,
          transactionCount: 0,
          successRate: 0,
          throughput: 0,
          bottlenecks: []
        },
        flowId: flow.id,
        environmentId: environment.id
      })
    } finally {
      setIsSimulating(false)
      setCurrentStep('')
    }
  }

  const handleResetEnvironment = async () => {
    if (!environment) return
    
    try {
      await simulationEngine.resetEnvironment(environment.id)
      setSimulationResult(null)
      
      // Refresh environment data
      const updatedEnv = simulationEngine.getEnvironment(environment.id)
      if (updatedEnv) {
        setEnvironment(updatedEnv)
      }
    } catch (error) {
      console.error('Failed to reset environment:', error)
    }
  }

  const handleTerminateEnvironment = async () => {
    if (!environment) return

    try {
      await simulationEngine.terminateEnvironment(environment.id)
      setEnvironment(null)
      setSimulationResult(null)
      setSnapshots([])
    } catch (error) {
      console.error('Failed to terminate environment:', error)
    }
  }

  const handleCreateSnapshot = async (name: string, description: string) => {
    if (!environment) return

    try {
      const snapshot = await simulationEngine.createSnapshot(environment.id, name, description)
      setSnapshots(prev => [...prev, snapshot])
    } catch (error) {
      console.error('Failed to create snapshot:', error)
    }
  }

  const handleRevertSnapshot = async (snapshotId: string) => {
    if (!environment) return

    try {
      await simulationEngine.revertToSnapshot(environment.id, snapshotId)
      setSimulationResult(null)
    } catch (error) {
      console.error('Failed to revert snapshot:', error)
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Flow Simulation</span>
          </CardTitle>
          <CardDescription>
            Test your flow "{flow.name}" in a safe simulation environment before execution
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="environment" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="environment">Environment</TabsTrigger>
              <TabsTrigger value="simulation">Simulation</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="environment" className="space-y-4 mt-6">
              {!environment ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Database className="w-4 h-4" />
                    <h4 className="font-medium">Create Simulation Environment</h4>
                  </div>
                  <EnvironmentConfigForm 
                    onCreateEnvironment={handleCreateEnvironment}
                    isCreating={isCreatingEnvironment}
                  />
                </div>
              ) : (
                <EnvironmentStatus 
                  environment={environment}
                  onReset={handleResetEnvironment}
                  onTerminate={handleTerminateEnvironment}
                  onSnapshot={handleCreateSnapshot}
                  snapshots={snapshots}
                  onRevertSnapshot={handleRevertSnapshot}
                />
              )}
            </TabsContent>
            
            <TabsContent value="simulation" className="space-y-4 mt-6">
              {!environment ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Please create a simulation environment first.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium flex items-center space-x-2">
                        <Code className="w-4 h-4" />
                        <span>Flow: {flow.name}</span>
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {flow.blocks.length} blocks, {flow.connections.length} connections
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleRunSimulation}
                      disabled={!environment || isSimulating}
                      className="flex items-center space-x-2"
                    >
                      {isSimulating ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>Simulating...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Run Simulation</span>
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <SimulationProgress 
                    isRunning={isSimulating}
                    progress={simulationProgress}
                    currentStep={currentStep}
                    result={simulationResult}
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="results" className="mt-6">
              {simulationResult ? (
                <SimulationProgress 
                  isRunning={false}
                  progress={100}
                  currentStep=""
                  result={simulationResult}
                />
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No simulation results available. Run a simulation first.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}