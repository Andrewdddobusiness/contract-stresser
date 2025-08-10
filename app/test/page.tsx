"use client"

import * as React from 'react'
import { useState, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useFieldArray } from 'react-hook-form'
import * as z from 'zod'
import { 
  Play, 
  Settings, 
  Users, 
  Zap, 
  Clock, 
  AlertTriangle, 
  Info,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useAccount, useChainId } from 'wagmi'
import { isAddress, type Address } from 'viem'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { contractStorage } from '@/services/contracts'
import type { TestConfiguration, TestScenario } from '@/types/testing'
import { TEST_SCENARIOS, FUNCTION_TEMPLATES } from '@/types/testing'
import { useTestExecutor } from '@/hooks/useTestExecutor'

// Form validation schema
const testConfigSchema = z.object({
  // Basic settings
  contractAddress: z.string().min(1, 'Contract address is required'),
  functionName: z.string().min(1, 'Function name is required'),
  functionArgs: z.array(z.object({
    name: z.string(),
    type: z.string(),
    value: z.string(),
  })),
  iterations: z.number().min(1).max(10000),
  
  // Execution mode
  mode: z.enum(['sequential', 'concurrent', 'multi-user']),
  
  // Account settings
  accountCount: z.number().min(1).max(100),
  useMultipleAccounts: z.boolean(),
  fundingAmount: z.string().refine((val) => {
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }, 'Must be a positive number'),
  
  // Timing settings
  delayBetweenTx: z.number().min(0).max(60000),
  batchSize: z.number().min(1).max(1000).optional(),
  concurrencyLimit: z.number().min(1).max(100).optional(),
  
  // Gas settings
  gasPriceTier: z.enum(['slow', 'normal', 'fast']),
  customGasLimit: z.string().optional(),
  customGasPrice: z.string().optional(),
  
  // Advanced options
  stopOnError: z.boolean(),
  retryFailedTx: z.boolean(),
  maxRetries: z.number().min(0).max(10),
  timeoutMs: z.number().min(1000).max(300000),
})

type TestConfigFormValues = z.infer<typeof testConfigSchema>

export default function TestPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  
  const [selectedScenario, setSelectedScenario] = useState<string>('custom-scenario')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  
  // Test execution hook
  const testExecutor = useTestExecutor({
    onProgress: (execution) => {
      console.log('Test progress:', execution)
    },
    onTransaction: (transaction) => {
      console.log('New transaction:', transaction)
    },
    onError: (error) => {
      console.error('Test error:', error)
    },
    onComplete: (execution) => {
      console.log('Test completed:', execution)
    }
  })
  
  // Get deployed contracts
  const deployedContracts = useMemo(() => {
    return contractStorage.getAllContracts()
  }, [])
  
  const currentScenario = useMemo(() => {
    return TEST_SCENARIOS.find(s => s.id === selectedScenario) || TEST_SCENARIOS[4] // Default to custom
  }, [selectedScenario])

  const form = useForm<TestConfigFormValues>({
    resolver: zodResolver(testConfigSchema),
    defaultValues: {
      contractAddress: '',
      functionName: 'transfer',
      functionArgs: [],
      iterations: 10,
      mode: 'sequential',
      accountCount: 1,
      useMultipleAccounts: false,
      fundingAmount: '1.0',
      delayBetweenTx: 1000,
      gasPriceTier: 'normal',
      stopOnError: false,
      retryFailedTx: true,
      maxRetries: 3,
      timeoutMs: 30000,
    }
  })
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'functionArgs'
  })
  
  // Watch form values for dynamic updates
  const watchedValues = form.watch()
  const selectedFunction = watchedValues.functionName
  const functionTemplate = FUNCTION_TEMPLATES[selectedFunction]
  
  // Load scenario template
  const loadScenario = (scenarioId: string) => {
    const scenario = TEST_SCENARIOS.find(s => s.id === scenarioId)
    if (!scenario) return
    
    const config = scenario.config
    form.reset({
      contractAddress: config.contractAddress === '0x' ? '' : config.contractAddress,
      functionName: config.functionName,
      functionArgs: [],
      iterations: config.iterations,
      mode: config.mode,
      accountCount: config.accountCount,
      useMultipleAccounts: config.useMultipleAccounts,
      fundingAmount: config.fundingAmount,
      delayBetweenTx: config.delayBetweenTx,
      batchSize: config.batchSize,
      concurrencyLimit: config.concurrencyLimit,
      gasPriceTier: config.gasPriceTier,
      customGasLimit: config.gasLimit?.toString(),
      stopOnError: config.stopOnError,
      retryFailedTx: config.retryFailedTx,
      maxRetries: config.maxRetries,
      timeoutMs: config.timeoutMs,
    })
    
    setSelectedScenario(scenarioId)
  }
  
  // Update function arguments when function changes
  React.useEffect(() => {
    if (functionTemplate) {
      // Clear existing args and add template args
      form.setValue('functionArgs', [])
      functionTemplate.args.forEach((arg, index) => {
        append({
          name: arg.name,
          type: arg.type,
          value: '',
        })
      })
    }
  }, [selectedFunction, append, form, functionTemplate])
  
  const onSubmit = async (data: TestConfigFormValues) => {
    try {
      // Convert form data to test configuration
      const testConfig: TestConfiguration = {
        contractAddress: data.contractAddress as Address,
        functionName: data.functionName,
        functionArgs: data.functionArgs,
        iterations: data.iterations,
        network: 'local', // Default to local for now
        mode: data.mode,
        accountCount: data.accountCount,
        useMultipleAccounts: data.useMultipleAccounts,
        fundingAmount: data.fundingAmount,
        delayBetweenTx: data.delayBetweenTx,
        batchSize: data.batchSize,
        concurrencyLimit: data.concurrencyLimit,
        gasPriceTier: data.gasPriceTier,
        gasLimit: data.customGasLimit ? BigInt(data.customGasLimit) : undefined,
        gasPrice: data.customGasPrice ? BigInt(data.customGasPrice) : undefined,
        stopOnError: data.stopOnError,
        retryFailedTx: data.retryFailedTx,
        maxRetries: data.maxRetries,
        timeoutMs: data.timeoutMs,
      }

      // Start the test
      await testExecutor.startTest(testConfig)
    } catch (error) {
      console.error('Failed to start test:', error)
      // You might want to show an error notification here
    }
  }
  
  const estimateTestDuration = () => {
    const iterations = watchedValues.iterations
    const delayMs = watchedValues.delayBetweenTx
    const mode = watchedValues.mode
    
    if (mode === 'sequential') {
      const totalMs = iterations * (delayMs + 2000) // Assume 2s per tx
      return Math.ceil(totalMs / 1000 / 60) // Convert to minutes
    } else if (mode === 'concurrent') {
      const concurrency = watchedValues.concurrencyLimit || watchedValues.accountCount
      const batches = Math.ceil(iterations / concurrency)
      const totalMs = batches * (delayMs + 5000) // Assume 5s per batch
      return Math.ceil(totalMs / 1000 / 60)
    }
    
    return Math.ceil(iterations / 10) // Rough estimate for multi-user
  }
  
  const estimateTotalCost = () => {
    // Rough cost estimation (this would use real gas estimation in production)
    const iterations = watchedValues.iterations
    const accounts = watchedValues.useMultipleAccounts ? watchedValues.accountCount : 1
    const fundingAmount = parseFloat(watchedValues.fundingAmount)
    
    const gasPerTx = 50000 // Rough estimate
    const gasPriceGwei = watchedValues.gasPriceTier === 'fast' ? 20 : watchedValues.gasPriceTier === 'normal' ? 10 : 5
    const gasCostEth = (gasPerTx * gasPriceGwei * iterations) / 1e18 * 1e9
    const fundingCostEth = accounts * fundingAmount
    
    return gasCostEth + fundingCostEth
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Stress Test Configuration</h1>
        <p className="text-muted-foreground">
          Configure and execute smart contract stress tests
        </p>
      </div>

      {!isConnected && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to configure stress tests
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Scenario Templates */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Test Scenarios</CardTitle>
            <CardDescription>
              Choose a predefined scenario or create custom
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {TEST_SCENARIOS.map((scenario) => (
              <div key={scenario.id}>
                <Button
                  variant={selectedScenario === scenario.id ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => loadScenario(scenario.id)}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{scenario.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {scenario.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground text-left">
                      {scenario.description}
                    </p>
                  </div>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center justify-between">
                Test Configuration
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    {previewMode ? 'Edit' : 'Preview'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Advanced
                  </Button>
                </div>
              </div>
            </CardTitle>
            <CardDescription>
              Configure parameters for {currentScenario.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewMode ? (
              <TestPreview 
                config={watchedValues} 
                scenario={currentScenario}
                estimatedDuration={estimateTestDuration()}
                estimatedCost={estimateTotalCost()}
              />
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic</TabsTrigger>
                      <TabsTrigger value="execution">Execution</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4">
                      {/* Contract Selection */}
                      <FormField
                        control={form.control}
                        name="contractAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contract Address</FormLabel>
                            <Select 
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a deployed contract" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {deployedContracts.map((contract) => (
                                  <SelectItem key={contract.address} value={contract.address}>
                                    <div>
                                      <div className="font-medium">{contract.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choose a deployed contract to test
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Function Selection */}
                      <FormField
                        control={form.control}
                        name="functionName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Function to Test</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a function" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(FUNCTION_TEMPLATES).map(([func, template]) => (
                                  <SelectItem key={func} value={func}>
                                    <div>
                                      <div className="font-medium">{func}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {template.description}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Function to call in each test iteration
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Function Arguments */}
                      {fields.length > 0 && (
                        <div className="space-y-3">
                          <FormLabel>Function Arguments</FormLabel>
                          {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-end">
                              <div className="flex-1">
                                <FormField
                                  control={form.control}
                                  name={`functionArgs.${index}.value`}
                                  render={({ field: inputField }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">
                                        {field.name} ({field.type})
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...inputField} 
                                          placeholder={`Enter ${field.name}`}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Iterations */}
                      <FormField
                        control={form.control}
                        name="iterations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Iterations</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Total number of transactions to send
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    <TabsContent value="execution" className="space-y-4">
                      {/* Execution Mode */}
                      <FormField
                        control={form.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Execution Mode</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="sequential">
                                  Sequential - Send transactions one by one
                                </SelectItem>
                                <SelectItem value="concurrent">
                                  Concurrent - Send multiple transactions simultaneously
                                </SelectItem>
                                <SelectItem value="multi-user">
                                  Multi-User - Simulate multiple users
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Account Settings */}
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="useMultipleAccounts"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Use Multiple Test Accounts</FormLabel>
                            </FormItem>
                          )}
                        />
                        
                        {watchedValues.useMultipleAccounts && (
                          <>
                            <FormField
                              control={form.control}
                              name="accountCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Number of Test Accounts</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      {...field} 
                                      onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Accounts will be automatically generated and funded
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="fundingAmount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Funding Amount (ETH)</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="1.0" />
                                  </FormControl>
                                  <FormDescription>
                                    ETH amount to fund each test account
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </div>

                      {/* Timing Settings */}
                      <FormField
                        control={form.control}
                        name="delayBetweenTx"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delay Between Transactions (ms)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Milliseconds to wait between transactions
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Concurrency Settings */}
                      {(watchedValues.mode === 'concurrent' || watchedValues.mode === 'multi-user') && (
                        <FormField
                          control={form.control}
                          name="concurrencyLimit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Concurrency Limit</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  value={field.value || ''}
                                  onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                                />
                              </FormControl>
                              <FormDescription>
                                Maximum concurrent transactions (default: account count)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </TabsContent>
                    
                    <TabsContent value="advanced" className="space-y-4">
                      {/* Gas Settings */}
                      <FormField
                        control={form.control}
                        name="gasPriceTier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gas Price Tier</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="slow">Slow (Cheaper)</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="fast">Fast (More expensive)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Error Handling */}
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="stopOnError"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Stop Test on First Error</FormLabel>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="retryFailedTx"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Retry Failed Transactions</FormLabel>
                            </FormItem>
                          )}
                        />
                        
                        {watchedValues.retryFailedTx && (
                          <FormField
                            control={form.control}
                            name="maxRetries"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Retries</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
                        <FormField
                          control={form.control}
                          name="timeoutMs"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transaction Timeout (ms)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(parseInt(e.target.value) || 30000)}
                                />
                              </FormControl>
                              <FormDescription>
                                Timeout for each transaction confirmation
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <Separator />
                  
                  <div className="flex gap-4">
                    {testExecutor.isRunning ? (
                      <div className="flex gap-2 w-full">
                        <Button 
                          type="button" 
                          variant="outline"
                          className="flex-1"
                          onClick={testExecutor.isPaused ? testExecutor.resumeTest : testExecutor.pauseTest}
                        >
                          {testExecutor.isPaused ? 'Resume' : 'Pause'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="destructive"
                          onClick={testExecutor.stopTest}
                        >
                          Stop
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button 
                          type="submit" 
                          className="flex-1"
                          disabled={!isConnected}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Test
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setPreviewMode(true)}
                        >
                          Preview Test
                        </Button>
                      </>
                    )}
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
        
        {/* Test Execution Status */}
        {testExecutor.execution && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center justify-between">
                  Test Execution Status
                  <Badge variant={
                    testExecutor.execution.status === 'running' ? 'default' :
                    testExecutor.execution.status === 'completed' ? 'secondary' :
                    testExecutor.execution.status === 'failed' ? 'destructive' :
                    testExecutor.execution.status === 'paused' ? 'outline' : 'secondary'
                  }>
                    {testExecutor.execution.status.toUpperCase()}
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                {testExecutor.execution.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{testExecutor.progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${testExecutor.progress}%` }}
                    />
                  </div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Iteration</div>
                    <div className="text-lg font-semibold">
                      {testExecutor.execution.currentIteration} / {testExecutor.execution.totalIterations}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Success Rate</div>
                    <div className="text-lg font-semibold text-green-600">
                      {testExecutor.successRate}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Transactions/sec</div>
                    <div className="text-lg font-semibold">
                      {testExecutor.transactionsPerSecond.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Time Remaining</div>
                    <div className="text-lg font-semibold">
                      {testExecutor.estimatedTimeRemaining}s
                    </div>
                  </div>
                </div>
                
                {/* Success/Failure Counts */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Successful: {testExecutor.execution.successCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Failed: {testExecutor.execution.failureCount}</span>
                  </div>
                </div>
                
                {/* Recent Errors */}
                {testExecutor.recentErrors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Recent Errors</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {testExecutor.recentErrors.slice(0, 5).map((error) => (
                        <div key={error.id} className="text-xs p-2 bg-destructive/10 text-destructive rounded">
                          <div className="font-medium">Iteration {error.iteration}: {error.errorType}</div>
                          <div className="truncate">{error.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// Test Preview Component
function TestPreview({ 
  config, 
  scenario, 
  estimatedDuration, 
  estimatedCost 
}: {
  config: TestConfigFormValues
  scenario: TestScenario
  estimatedDuration: number
  estimatedCost: number
}) {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Preview of your test configuration. Review all settings before starting.
        </AlertDescription>
      </Alert>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Test Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scenario</span>
              <span>{scenario.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode</span>
              <Badge variant="outline">{config.mode}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Iterations</span>
              <span>{config.iterations.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Function</span>
              <span className="font-mono">{config.functionName}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Estimates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span>~{estimatedDuration} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accounts</span>
              <span>{config.useMultipleAccounts ? config.accountCount : 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Cost</span>
              <span>{estimatedCost.toFixed(4)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gas Tier</span>
              <Badge variant={config.gasPriceTier === 'fast' ? 'destructive' : 'secondary'}>
                {config.gasPriceTier}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Execution Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Generate and fund {config.useMultipleAccounts ? config.accountCount : 1} test account(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Prepare {config.iterations} {config.functionName} transactions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Execute in {config.mode} mode with {config.delayBetweenTx}ms delays</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Monitor progress and collect performance metrics</span>
            </div>
            {config.retryFailedTx && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span>Retry failed transactions up to {config.maxRetries} times</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}