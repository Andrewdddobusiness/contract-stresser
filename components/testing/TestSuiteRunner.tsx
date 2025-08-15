'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  BarChart3,
  Activity,
  Target,
  Award,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatDistanceToNow } from 'date-fns'
import { 
  TestSuite, 
  TestCase, 
  TestResult, 
  TestSuiteResult, 
  AssertionResult,
  flowTestingFramework 
} from '@/services/testing/flowTesting'

interface TestSuiteRunnerProps {
  suiteId: string
  onTestComplete?: (result: TestSuiteResult) => void
  className?: string
}

interface TestCaseResultProps {
  testCase: TestCase
  result?: TestResult
  onRunSingle: (testCaseId: string) => void
  isRunning: boolean
}

function TestCaseResult({ testCase, result, onRunSingle, isRunning }: TestCaseResultProps) {
  const [expanded, setExpanded] = useState(false)

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'running':
        return <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      case 'skipped':
        return <div className="w-4 h-4 rounded-full bg-gray-400" />
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-300" />
    }
  }

  const getStatusBadge = (status?: string) => {
    const variants = {
      passed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      running: 'bg-blue-100 text-blue-800 border-blue-200',
      skipped: 'bg-gray-100 text-gray-800 border-gray-200',
      pending: 'bg-gray-100 text-gray-600 border-gray-200'
    }

    const variant = variants[status as keyof typeof variants] || variants.pending
    
    return (
      <Badge className={cn('border', variant)}>
        {status || 'pending'}
      </Badge>
    )
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'unit':
        return <Target className="w-3 h-3" />
      case 'integration':
        return <Activity className="w-3 h-3" />
      case 'performance':
        return <BarChart3 className="w-3 h-3" />
      case 'security':
        return <AlertTriangle className="w-3 h-3" />
      default:
        return <FileText className="w-3 h-3" />
    }
  }

  const getDifficultyColor = (priority: string) => {
    const colors = {
      low: 'text-gray-600',
      medium: 'text-yellow-600', 
      high: 'text-orange-600',
      critical: 'text-red-600'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  return (
    <Card className="test-case-result">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(result?.status)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-base">{testCase.name}</CardTitle>
                    {getStatusBadge(result?.status)}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      {getCategoryIcon(testCase.category)}
                      <span>{testCase.category}</span>
                    </div>
                    <div className={cn("text-xs", getDifficultyColor(testCase.priority))}>
                      {testCase.priority}
                    </div>
                    {testCase.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {result && (
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{result.executionTime}ms</span>
                    </div>
                    {result.gasUsed > 0n && (
                      <div className="flex items-center space-x-1">
                        <Zap className="w-3 h-3" />
                        <span>{result.gasUsed.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRunSingle(testCase.id)
                  }}
                  disabled={isRunning}
                >
                  {isRunning ? 'Running...' : 'Run'}
                </Button>
                
                {expanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {testCase.description}
              </div>
              
              {/* Test Configuration */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Configuration</h5>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>Timeout: {testCase.timeout}ms</div>
                  <div>Preconditions: {testCase.preconditions.length}</div>
                  <div>Assertions: {testCase.assertions.length}</div>
                  <div>Expected Success: {testCase.expectedOutcome.success ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {/* Test Results */}
              {result && (
                <div className="space-y-3">
                  <h5 className="text-sm font-medium">Results</h5>
                  
                  {/* Execution Summary */}
                  <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{result.executionTime}ms</div>
                      <div className="text-xs text-muted-foreground">Execution Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{result.gasUsed.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Gas Used</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {result.assertionResults.filter(ar => ar.passed).length}/
                        {result.assertionResults.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Assertions Passed</div>
                    </div>
                  </div>

                  {/* Assertions */}
                  {result.assertionResults.length > 0 && (
                    <div>
                      <h6 className="text-sm font-medium mb-2">Assertion Results</h6>
                      <div className="space-y-1">
                        {result.assertionResults.map((assertion, index) => (
                          <div 
                            key={index}
                            className={cn(
                              "text-xs p-2 rounded border-l-4",
                              assertion.passed 
                                ? "bg-green-50 border-l-green-400" 
                                : "bg-red-50 border-l-red-400"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{assertion.assertion.description}</div>
                                <div className="text-muted-foreground mt-1">
                                  Expected {assertion.assertion.operator} {JSON.stringify(assertion.expected)}
                                  {!assertion.passed && (
                                    <>, got ${JSON.stringify(assertion.actual)}</span>
                                  )}
                                </div>
                              </div>
                              {assertion.passed ? (
                                <CheckCircle className="w-4 h-4 text-green-600 ml-2" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600 ml-2" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {result.errors.length > 0 && (
                    <div>
                      <h6 className="text-sm font-medium mb-2">Errors</h6>
                      <div className="space-y-1">
                        {result.errors.map((error, index) => (
                          <div key={index} className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                            <strong>{error.type}:</strong> {error.message}
                            {error.stack && (
                              <details className="mt-1">
                                <summary className="cursor-pointer">Stack trace</summary>
                                <pre className="mt-1 text-xs overflow-auto">{error.stack}</pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div>
                      <h6 className="text-sm font-medium mb-2">Warnings</h6>
                      <div className="space-y-1">
                        {result.warnings.map((warning, index) => (
                          <div key={index} className="text-xs p-2 bg-yellow-50 border border-yellow-200 rounded">
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

interface TestSuiteSummaryProps {
  suite: TestSuite
  result?: TestSuiteResult
  isRunning: boolean
  progress: number
}

function TestSuiteSummary({ suite, result, isRunning, progress }: TestSuiteSummaryProps) {
  if (isRunning) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Running Test Suite...</h3>
              <div className="text-sm text-muted-foreground">
                {Math.round(progress)}%
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="text-sm text-muted-foreground">
              {suite.testCases.length} test cases in queue
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2" />
            <p>No test results available yet.</p>
            <p className="text-sm">Run the test suite to see results.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const successRate = result.passedTests / result.totalTests * 100

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className={cn(
              "p-2 rounded-full",
              successRate === 100 ? "bg-green-100" : successRate >= 80 ? "bg-yellow-100" : "bg-red-100"
            )}>
              {successRate === 100 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : successRate >= 80 ? (
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div>
              <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-full bg-blue-100">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {(result.executionTime / 1000).toFixed(1)}s
              </div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-full bg-purple-100">
              <Zap className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {result.summary.totalGasUsed.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Total Gas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-full bg-green-100">
              <Award className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {result.coverage.flowCoverage.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Coverage</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function TestSuiteRunner({ 
  suiteId, 
  onTestComplete, 
  className 
}: TestSuiteRunnerProps) {
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [suiteResult, setSuiteResult] = useState<TestSuiteResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [runningTestId, setRunningTestId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'results'>('overview')

  useEffect(() => {
    const suite = flowTestingFramework.getTestSuite(suiteId)
    if (suite) {
      setTestSuite(suite)
      const results = flowTestingFramework.getTestResults(suiteId)
      setTestResults(results)
    }
  }, [suiteId])

  const handleRunAllTests = async () => {
    if (!testSuite || isRunning) return

    setIsRunning(true)
    setProgress(0)
    setSuiteResult(null)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 10, 90))
      }, 500)

      const result = await flowTestingFramework.runTestSuite(suiteId)
      
      clearInterval(progressInterval)
      setProgress(100)
      setSuiteResult(result)
      setTestResults(result.results)
      onTestComplete?.(result)

    } catch (error) {
      console.error('Test suite execution failed:', error)
    } finally {
      setIsRunning(false)
      setRunningTestId(null)
    }
  }

  const handleRunFailedTests = async () => {
    if (!testSuite || isRunning) return

    const failedTestCases = testSuite.testCases.filter(tc => {
      const result = testResults.find(r => r.testCaseId === tc.id)
      return result && (result.status === 'failed' || result.status === 'error')
    })

    if (failedTestCases.length === 0) return

    setIsRunning(true)
    setRunningTestId('failed-tests')

    try {
      // Run only failed tests
      for (const testCase of failedTestCases) {
        await handleRunSingleTest(testCase.id)
      }
    } catch (error) {
      console.error('Failed tests execution failed:', error)
    } finally {
      setIsRunning(false)
      setRunningTestId(null)
    }
  }

  const handleRunSingleTest = async (testCaseId: string) => {
    if (!testSuite || isRunning) return

    const testCase = testSuite.testCases.find(tc => tc.id === testCaseId)
    if (!testCase || !testSuite.environment) return

    setRunningTestId(testCaseId)

    try {
      const result = await flowTestingFramework.runTestCase(testCase, testSuite.environment)
      
      // Update results
      setTestResults(prev => {
        const filtered = prev.filter(r => r.testCaseId !== testCaseId)
        return [...filtered, result]
      })

    } catch (error) {
      console.error('Single test execution failed:', error)
    } finally {
      if (runningTestId === testCaseId) {
        setRunningTestId(null)
      }
    }
  }

  const hasFailedTests = () => {
    return testResults.some(r => r.status === 'failed' || r.status === 'error')
  }

  const getTestResult = (testCaseId: string) => {
    return testResults.find(r => r.testCaseId === testCaseId)
  }

  if (!testSuite) {
    return (
      <div className={cn("p-6", className)}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Test suite not found. Please check the suite ID.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={cn("test-suite-runner space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{testSuite.name}</h2>
          <p className="text-muted-foreground">{testSuite.description}</p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
            <span>{testSuite.testCases.length} test cases</span>
            <span>•</span>
            <span>Created {formatDistanceToNow(testSuite.createdAt, { addSuffix: true })}</span>
            <span>•</span>
            <span>Updated {formatDistanceToNow(testSuite.updatedAt, { addSuffix: true })}</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={handleRunAllTests}
            disabled={isRunning}
            className="flex items-center space-x-2"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run All Tests</span>
              </>
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleRunFailedTests}
            disabled={isRunning || !hasFailedTests()}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Run Failed</span>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <TestSuiteSummary 
        suite={testSuite}
        result={suiteResult}
        isRunning={isRunning}
        progress={progress}
      />

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tests">Test Cases ({testSuite.testCases.length})</TabsTrigger>
          <TabsTrigger value="results">
            Results ({testResults.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Suite Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Timeout:</span>
                  <span>{testSuite.configuration.timeoutMs}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Max Gas per Test:</span>
                  <span>{testSuite.configuration.maxGasPerTest.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Parallel Execution:</span>
                  <span>{testSuite.configuration.parallelExecution ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fail Fast:</span>
                  <span>{testSuite.configuration.failFast ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Retry Count:</span>
                  <span>{testSuite.configuration.retryCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    testSuite.testCases.reduce((acc, tc) => {
                      acc[tc.category] = (acc[tc.category] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  ).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="capitalize">{category}</span>
                      </div>
                      <span>{count} tests</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {suiteResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {suiteResult.summary.recommendations.length > 0 ? (
                  <div className="space-y-2">
                    {suiteResult.summary.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recommendations at this time.</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="tests" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {testSuite.testCases.map(testCase => (
                <TestCaseResult
                  key={testCase.id}
                  testCase={testCase}
                  result={getTestResult(testCase.id)}
                  onRunSingle={handleRunSingleTest}
                  isRunning={runningTestId === testCase.id}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-4">
          {suiteResult ? (
            <div className="space-y-6">
              {/* Detailed Results */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {suiteResult.passedTests}
                    </div>
                    <div className="text-sm text-muted-foreground">Passed</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {suiteResult.failedTests}
                    </div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-gray-600">
                      {suiteResult.skippedTests}
                    </div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {suiteResult.summary.averageExecutionTime.toFixed(0)}ms
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Execution</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {suiteResult.summary.averageGasUsage.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Gas Usage</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {suiteResult.summary.totalGasUsed.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Gas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {suiteResult.coverage.flowCoverage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Flow Coverage</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                No test results available. Run the test suite to see detailed results.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}