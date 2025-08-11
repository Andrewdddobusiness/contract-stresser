'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Clock,
  Zap,
  Activity,
  Download,
  RefreshCw,
  BarChart3,
  Target,
  Lightbulb,
  Award,
  AlertTriangle
} from 'lucide-react'
import { formatEther } from 'viem'
import { 
  testScenariosService,
  type ScenarioResult,
  type ScenarioTemplate
} from '@/services/testing/scenarios'
import type { TestExecution, TestTransaction, TestError } from '@/types/testing'

interface ScenarioResultsProps {
  execution: TestExecution
  transactions: TestTransaction[]
  errors: TestError[]
  scenarioId?: string
  onRetryScenario?: () => void
  onExportResults?: () => void
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'purple'
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  color = 'blue' 
}: MetricCardProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-50 border-green-200 text-green-700'
      case 'red': return 'bg-red-50 border-red-200 text-red-700'
      case 'yellow': return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      case 'purple': return 'bg-purple-50 border-purple-200 text-purple-700'
      default: return 'bg-blue-50 border-blue-200 text-blue-700'
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
      default: return null
    }
  }

  return (
    <Card className={`${getColorClasses(color)} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium opacity-70">{title}</p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold">{value}</p>
              {getTrendIcon()}
            </div>
            {subtitle && (
              <p className="text-xs opacity-60">{subtitle}</p>
            )}
          </div>
          <div className="opacity-70">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PerformanceRating({ performance }: { performance: ScenarioResult['performance'] }) {
  const getRatingConfig = (perf: ScenarioResult['performance']) => {
    switch (perf) {
      case 'excellent':
        return {
          icon: <Award className="w-5 h-5" />,
          color: 'bg-green-100 text-green-800',
          label: 'Excellent',
          description: 'Outstanding performance - contract handles stress very well'
        }
      case 'good':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: 'bg-blue-100 text-blue-800',
          label: 'Good',
          description: 'Good performance - minor optimizations may be beneficial'
        }
      case 'fair':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: 'bg-yellow-100 text-yellow-800',
          label: 'Fair',
          description: 'Acceptable performance - consider optimization opportunities'
        }
      case 'poor':
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: 'bg-red-100 text-red-800',
          label: 'Poor',
          description: 'Performance issues detected - optimization recommended'
        }
    }
  }

  const config = getRatingConfig(performance)

  return (
    <div className="flex items-center space-x-3">
      <Badge className={`${config.color} flex items-center space-x-1 px-3 py-1`}>
        {config.icon}
        <span>{config.label}</span>
      </Badge>
      <p className="text-sm text-muted-foreground">{config.description}</p>
    </div>
  )
}

export function ScenarioResults({
  execution,
  transactions,
  errors,
  scenarioId,
  onRetryScenario,
  onExportResults
}: ScenarioResultsProps) {
  const [selectedTab, setSelectedTab] = useState('overview')

  // Calculate metrics
  const totalTransactions = execution.successCount + execution.failureCount
  const successRate = totalTransactions > 0 ? (execution.successCount / totalTransactions) * 100 : 0
  const avgConfirmationTime = transactions.reduce((sum, tx) => 
    sum + (tx.confirmationTime || 0), 0
  ) / Math.max(transactions.length, 1)
  
  const totalGasUsed = transactions.reduce((sum, tx) => sum + Number(tx.gasUsed || 0), 0)
  const avgGasUsed = transactions.length > 0 ? totalGasUsed / transactions.length : 0
  
  const duration = execution.startTime && execution.endTime 
    ? (execution.endTime.getTime() - execution.startTime.getTime()) / 1000
    : 0

  // Get scenario analysis if scenario ID is provided
  const scenarioResult = scenarioId 
    ? testScenariosService.analyzeResults(
        scenarioId,
        totalTransactions,
        execution.successCount,
        execution.failureCount,
        avgGasUsed,
        execution.transactionsPerSecond || 0,
        duration
      )
    : null

  const scenario = scenarioId ? testScenariosService.getScenario(scenarioId) : null

  // Error analysis
  const errorsByType = errors.reduce((acc, error) => {
    acc[error.errorType] = (acc[error.errorType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const mostCommonError = Object.entries(errorsByType)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Test Results</h2>
            {scenario && (
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground">Scenario:</span>
                <Badge variant="outline">{scenario.name}</Badge>
                <Badge className="capitalize">{scenario.category}</Badge>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            {onRetryScenario && (
              <Button variant="outline" onClick={onRetryScenario}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
            {onExportResults && (
              <Button variant="outline" onClick={onExportResults}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Performance Rating */}
        {scenarioResult && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-2">Overall Performance</h3>
                  <PerformanceRating performance={scenarioResult.performance} />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {Math.round(successRate)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Transactions"
              value={totalTransactions}
              subtitle={`${execution.successCount} successful`}
              icon={<Activity className="w-6 h-6" />}
              color="blue"
            />
            
            <MetricCard
              title="Success Rate"
              value={`${Math.round(successRate)}%`}
              subtitle={successRate >= 95 ? 'Excellent' : successRate >= 85 ? 'Good' : 'Needs improvement'}
              icon={successRate >= 85 ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              color={successRate >= 95 ? 'green' : successRate >= 85 ? 'blue' : 'red'}
            />
            
            <MetricCard
              title="Duration"
              value={formatDuration(duration)}
              subtitle={execution.transactionsPerSecond ? `${execution.transactionsPerSecond.toFixed(2)} TPS` : undefined}
              icon={<Clock className="w-6 h-6" />}
              color="purple"
            />
            
            <MetricCard
              title="Avg Gas Used"
              value={avgGasUsed > 0 ? `${Math.round(avgGasUsed / 1000)}k` : '0'}
              subtitle={`${Math.round(avgConfirmationTime)}ms avg confirm`}
              icon={<Zap className="w-6 h-6" />}
              color="yellow"
            />
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Execution Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress: {execution.currentIteration} / {execution.totalIterations}</span>
                  <span>{Math.round((execution.currentIteration / execution.totalIterations) * 100)}%</span>
                </div>
                <Progress value={(execution.currentIteration / execution.totalIterations) * 100} />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">{execution.successCount}</div>
                  <div className="text-xs text-muted-foreground">Successful</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">{execution.failureCount}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-gray-600">{execution.totalIterations - execution.currentIteration}</div>
                  <div className="text-xs text-muted-foreground">Remaining</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          {/* Detailed Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Iterations:</span>
                    <div className="font-semibold">{execution.totalIterations}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed:</span>
                    <div className="font-semibold">{execution.currentIteration}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Success Count:</span>
                    <div className="font-semibold text-green-600">{execution.successCount}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Failure Count:</span>
                    <div className="font-semibold text-red-600">{execution.failureCount}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Success Rate:</span>
                    <div className="font-semibold">{Math.round(successRate)}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">TPS:</span>
                    <div className="font-semibold">{execution.transactionsPerSecond?.toFixed(2) || '0.00'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gas & Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Avg Gas Used:</span>
                    <div className="font-semibold">{Math.round(avgGasUsed).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Gas:</span>
                    <div className="font-semibold">{totalGasUsed.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Gas Price:</span>
                    <div className="font-semibold">
                      {execution.avgGasPrice ? `${Number(execution.avgGasPrice) / 1e9} Gwei` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Cost:</span>
                    <div className="font-semibold">
                      {execution.totalCost ? `${formatEther(execution.totalCost).slice(0, 8)} ETH` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Confirmation:</span>
                    <div className="font-semibold">{Math.round(avgConfirmationTime)}ms</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <div className="font-semibold">{formatDuration(duration)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuration Details */}
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Mode:</span>
                  <div className="font-semibold capitalize">{execution.config.mode}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Network:</span>
                  <div className="font-semibold capitalize">{execution.config.network}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Accounts:</span>
                  <div className="font-semibold">{execution.config.accountCount}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Delay:</span>
                  <div className="font-semibold">{execution.config.delayBetweenTx}ms</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Gas Tier:</span>
                  <div className="font-semibold capitalize">{execution.config.gasPriceTier}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Retry:</span>
                  <div className="font-semibold">{execution.config.retryFailedTx ? 'Enabled' : 'Disabled'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Stop on Error:</span>
                  <div className="font-semibold">{execution.config.stopOnError ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Timeout:</span>
                  <div className="font-semibold">{execution.config.timeoutMs / 1000}s</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          {errors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-700">No Errors Detected</h3>
                <p className="text-muted-foreground">
                  All transactions completed successfully without errors.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Error Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span>Error Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{errors.length}</div>
                      <div className="text-sm text-muted-foreground">Total Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{Object.keys(errorsByType).length}</div>
                      <div className="text-sm text-muted-foreground">Error Types</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold capitalize">{mostCommonError}</div>
                      <div className="text-sm text-muted-foreground">Most Common</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Math.round((errors.filter(e => e.retryable).length / errors.length) * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Retryable</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Error Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Error Breakdown by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(errorsByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="capitalize font-medium">{type}</div>
                          <Badge variant="destructive">{count}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round((count / errors.length) * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Errors */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {errors.slice(-5).reverse().map((error, index) => (
                      <div key={error.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="destructive" className="capitalize">
                            {error.errorType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {error.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {error.error}
                        </p>
                        <div className="text-xs text-muted-foreground mt-1">
                          Iteration: {error.iteration} | Retries: {error.retryCount}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {scenarioResult?.recommendations ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <span>Performance Recommendations</span>
                </CardTitle>
                <CardDescription>
                  Based on the test results, here are suggestions for optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scenarioResult.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Target className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Lightbulb className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No Specific Recommendations</h3>
                <p className="text-muted-foreground">
                  Run a predefined scenario to get detailed performance analysis and recommendations.
                </p>
              </CardContent>
            </Card>
          )}

          {/* General Best Practices */}
          <Card>
            <CardHeader>
              <CardTitle>General Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Optimize Gas Usage</p>
                    <p className="text-xs text-muted-foreground">Review contract functions for gas efficiency improvements</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Enable Retry Logic</p>
                    <p className="text-xs text-muted-foreground">Use retries for transient network errors to improve success rates</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Monitor Success Rates</p>
                    <p className="text-xs text-muted-foreground">Aim for {'>'}95% success rate in production scenarios</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Test Gradually</p>
                    <p className="text-xs text-muted-foreground">Start with small loads and gradually increase to find limits</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}