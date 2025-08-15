'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Clock, 
  DollarSign, 
  Target,
  Activity,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  RefreshCw,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { SimulationResult, PerformanceBottleneck } from '@/services/simulation/simulationEngine'

interface PerformanceAnalyzerProps {
  simulationResults: SimulationResult[]
  className?: string
}

interface PerformanceData {
  totalGasUsed: bigint
  averageGasUsed: bigint
  totalExecutionTime: number
  averageExecutionTime: number
  successRate: number
  costEstimate: number
  gasChange: number
  timeChange: number
  gasHistory: Array<{
    timestamp: string
    gasUsed: number
    executionTime: number
    success: boolean
  }>
  stepBreakdown: Array<{
    step: string
    gasUsed: number
    percentage: number
    optimization: string
  }>
  optimizations: OptimizationSuggestion[]
  bottlenecks: PerformanceBottleneck[]
  gasDistribution: Array<{
    range: string
    count: number
    percentage: number
  }>
  timeDistribution: Array<{
    range: string
    count: number
    percentage: number
  }>
}

interface OptimizationSuggestion {
  type: 'gas' | 'time' | 'success_rate' | 'cost'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
  estimatedSavings?: {
    gas?: number
    time?: number
    cost?: number
  }
}

interface MetricCardProps {
  title: string
  value: string | number
  format: 'gas' | 'duration' | 'percentage' | 'currency' | 'number'
  change?: number
  icon: React.ComponentType<{ className?: string }>
}

function MetricCard({ title, value, format, change, icon: Icon }: MetricCardProps) {
  const formatValue = (val: string | number, fmt: string) => {
    switch (fmt) {
      case 'gas':
        return typeof val === 'number' ? val.toLocaleString() : val
      case 'duration':
        return typeof val === 'number' ? `${val}ms` : val
      case 'percentage':
        return typeof val === 'number' ? `${val.toFixed(1)}%` : val
      case 'currency':
        return typeof val === 'number' ? `$${val.toFixed(2)}` : val
      case 'number':
        return typeof val === 'number' ? val.toLocaleString() : val
      default:
        return val
    }
  }

  const getChangeIcon = (change?: number) => {
    if (!change || change === 0) return <Minus className="w-3 h-3 text-gray-500" />
    if (change > 0) return <ArrowUp className="w-3 h-3 text-green-600" />
    return <ArrowDown className="w-3 h-3 text-red-600" />
  }

  const getChangeColor = (change?: number) => {
    if (!change || change === 0) return 'text-gray-500'
    if (format === 'gas' || format === 'duration') {
      // For gas and time, lower is better
      return change > 0 ? 'text-red-600' : 'text-green-600'
    } else {
      // For other metrics, higher is generally better
      return change > 0 ? 'text-green-600' : 'text-red-600'
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{formatValue(value, format)}</div>
              <div className="text-sm text-muted-foreground">{title}</div>
            </div>
          </div>
          
          {change !== undefined && (
            <div className={cn("flex items-center space-x-1 text-sm", getChangeColor(change))}>
              {getChangeIcon(change)}
              <span>{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface GasUsageChartProps {
  data: PerformanceData['gasHistory']
}

function GasUsageChart({ data }: GasUsageChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gasGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="timestamp" 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => new Date(value).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
        />
        <Tooltip 
          formatter={(value: any, name) => [
            name === 'gasUsed' ? `${value.toLocaleString()} gas` : `${value}ms`,
            name === 'gasUsed' ? 'Gas Used' : 'Execution Time'
          ]}
          labelFormatter={(value) => new Date(value).toLocaleString()}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
        />
        <Area
          type="monotone"
          dataKey="gasUsed"
          stroke="#3b82f6"
          fill="url(#gasGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface StepBreakdownChartProps {
  data: PerformanceData['stepBreakdown']
}

function StepBreakdownChart({ data }: StepBreakdownChartProps) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="step" 
          tick={{ fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
        />
        <Tooltip 
          formatter={(value: any) => [`${value.toLocaleString()} gas`, 'Gas Used']}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
        />
        <Bar dataKey="gasUsed" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface PerformanceDistributionProps {
  gasData: PerformanceData['gasDistribution']
  timeData: PerformanceData['timeDistribution']
}

function PerformanceDistribution({ gasData, timeData }: PerformanceDistributionProps) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gas Usage Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={gasData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                label={({ range, percentage }) => `${range}: ${percentage.toFixed(1)}%`}
                labelLine={false}
              >
                {gasData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execution Time Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={timeData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                label={({ range, percentage }) => `${range}: ${percentage.toFixed(1)}%`}
                labelLine={false}
              >
                {timeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

interface OptimizationSuggestionsProps {
  suggestions: OptimizationSuggestion[]
}

function OptimizationSuggestions({ suggestions }: OptimizationSuggestionsProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'gas': return <Zap className="w-4 h-4" />
      case 'time': return <Clock className="w-4 h-4" />
      case 'success_rate': return <Target className="w-4 h-4" />
      case 'cost': return <DollarSign className="w-4 h-4" />
      default: return <Lightbulb className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-4">
      {suggestions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
          <p>No optimization suggestions at this time.</p>
          <p className="text-sm">Your flow is performing well!</p>
        </div>
      ) : (
        suggestions.map((suggestion, index) => (
          <Card key={index} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                    {getTypeIcon(suggestion.type)}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {suggestion.description}
                    </p>
                    
                    {suggestion.estimatedSavings && (
                      <div className="flex items-center space-x-4 mt-2 text-xs">
                        {suggestion.estimatedSavings.gas && (
                          <span className="text-green-600">
                            -{suggestion.estimatedSavings.gas.toLocaleString()} gas
                          </span>
                        )}
                        {suggestion.estimatedSavings.time && (
                          <span className="text-blue-600">
                            -{suggestion.estimatedSavings.time}ms
                          </span>
                        )}
                        {suggestion.estimatedSavings.cost && (
                          <span className="text-purple-600">
                            -${suggestion.estimatedSavings.cost.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 ml-4">
                  <Badge className={cn('text-xs', getImpactColor(suggestion.impact))}>
                    {suggestion.impact} impact
                  </Badge>
                  <Badge variant="outline" className={cn('text-xs', getEffortColor(suggestion.effort))}>
                    {suggestion.effort} effort
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

export function PerformanceAnalyzer({ simulationResults, className }: PerformanceAnalyzerProps) {
  const [selectedMetric, setSelectedMetric] = useState<'gas' | 'time' | 'success'>('gas')

  const performanceData: PerformanceData = useMemo(() => {
    if (simulationResults.length === 0) {
      return {
        totalGasUsed: 0n,
        averageGasUsed: 0n,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        successRate: 0,
        costEstimate: 0,
        gasChange: 0,
        timeChange: 0,
        gasHistory: [],
        stepBreakdown: [],
        optimizations: [],
        bottlenecks: [],
        gasDistribution: [],
        timeDistribution: []
      }
    }

    const totalGasUsed = simulationResults.reduce((sum, r) => sum + r.gasUsed, 0n)
    const totalExecutionTime = simulationResults.reduce((sum, r) => sum + r.performance.executionTime, 0)
    const successfulResults = simulationResults.filter(r => r.success)
    
    // Generate gas history
    const gasHistory = simulationResults.map((result, index) => ({
      timestamp: new Date(result.timestamp).toISOString(),
      gasUsed: Number(result.gasUsed),
      executionTime: result.performance.executionTime,
      success: result.success
    }))

    // Generate step breakdown from bottlenecks
    const stepBreakdown = simulationResults.length > 0 
      ? simulationResults[0].performance.bottlenecks.map((bottleneck, index) => ({
          step: bottleneck.step,
          gasUsed: Number(bottleneck.gasUsed),
          percentage: Number(bottleneck.gasUsed) / Number(totalGasUsed) * 100,
          optimization: bottleneck.optimization
        }))
      : []

    // Generate optimizations based on analysis
    const optimizations: OptimizationSuggestion[] = []
    
    const averageGas = Number(totalGasUsed) / simulationResults.length
    const averageTime = totalExecutionTime / simulationResults.length
    
    if (averageGas > 500000) {
      optimizations.push({
        type: 'gas',
        title: 'High Gas Usage Detected',
        description: 'Your flow is using more gas than typical. Consider optimizing transaction batching or reducing external calls.',
        impact: 'high',
        effort: 'medium',
        estimatedSavings: {
          gas: Math.floor(averageGas * 0.2),
          cost: averageGas * 0.2 * 0.00002 // Assuming 20 gwei gas price
        }
      })
    }

    if (averageTime > 10000) {
      optimizations.push({
        type: 'time',
        title: 'Slow Execution Time',
        description: 'Execution time is longer than recommended. Consider parallel execution or optimizing complex operations.',
        impact: 'medium',
        effort: 'medium',
        estimatedSavings: {
          time: Math.floor(averageTime * 0.3)
        }
      })
    }

    if (successfulResults.length / simulationResults.length < 0.9) {
      optimizations.push({
        type: 'success_rate',
        title: 'Low Success Rate',
        description: 'Some simulations are failing. Review error conditions and add proper validation.',
        impact: 'high',
        effort: 'high'
      })
    }

    // Generate gas distribution
    const gasRanges = [
      { min: 0, max: 100000, label: '0-100K' },
      { min: 100000, max: 300000, label: '100K-300K' },
      { min: 300000, max: 500000, label: '300K-500K' },
      { min: 500000, max: 1000000, label: '500K-1M' },
      { min: 1000000, max: Infinity, label: '1M+' }
    ]

    const gasDistribution = gasRanges.map(range => {
      const count = simulationResults.filter(r => 
        Number(r.gasUsed) >= range.min && Number(r.gasUsed) < range.max
      ).length
      return {
        range: range.label,
        count,
        percentage: (count / simulationResults.length) * 100
      }
    }).filter(d => d.count > 0)

    // Generate time distribution
    const timeRanges = [
      { min: 0, max: 1000, label: '0-1s' },
      { min: 1000, max: 5000, label: '1-5s' },
      { min: 5000, max: 10000, label: '5-10s' },
      { min: 10000, max: 30000, label: '10-30s' },
      { min: 30000, max: Infinity, label: '30s+' }
    ]

    const timeDistribution = timeRanges.map(range => {
      const count = simulationResults.filter(r => 
        r.performance.executionTime >= range.min && r.performance.executionTime < range.max
      ).length
      return {
        range: range.label,
        count,
        percentage: (count / simulationResults.length) * 100
      }
    }).filter(d => d.count > 0)

    return {
      totalGasUsed,
      averageGasUsed: totalGasUsed / BigInt(simulationResults.length),
      totalExecutionTime,
      averageExecutionTime: totalExecutionTime / simulationResults.length,
      successRate: (successfulResults.length / simulationResults.length) * 100,
      costEstimate: Number(totalGasUsed) * 0.00002, // Mock cost calculation
      gasChange: Math.random() * 20 - 10, // Mock change percentage
      timeChange: Math.random() * 20 - 10, // Mock change percentage
      gasHistory,
      stepBreakdown,
      optimizations,
      bottlenecks: simulationResults.flatMap(r => r.performance.bottlenecks),
      gasDistribution,
      timeDistribution
    }
  }, [simulationResults])

  if (simulationResults.length === 0) {
    return (
      <div className={cn("performance-analyzer", className)}>
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            No simulation results available for analysis. Run some simulations first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={cn("performance-analyzer space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold">Performance Analysis</h3>
          <p className="text-muted-foreground">
            Analysis of {simulationResults.length} simulation{simulationResults.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Gas Used"
          value={Number(performanceData.totalGasUsed)}
          format="gas"
          change={performanceData.gasChange}
          icon={Zap}
        />
        <MetricCard
          title="Avg Execution Time"
          value={Math.round(performanceData.averageExecutionTime)}
          format="duration"
          change={performanceData.timeChange}
          icon={Clock}
        />
        <MetricCard
          title="Success Rate"
          value={performanceData.successRate}
          format="percentage"
          icon={Target}
        />
        <MetricCard
          title="Estimated Cost"
          value={performanceData.costEstimate}
          format="currency"
          icon={DollarSign}
        />
      </div>

      {/* Charts */}
      <Tabs value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gas">Gas Analysis</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
          <TabsTrigger value="success">Success Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="gas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Gas Usage Over Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GasUsageChart data={performanceData.gasHistory} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChartIcon className="w-5 h-5" />
                  <span>Step-by-Step Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performanceData.stepBreakdown.length > 0 ? (
                  <StepBreakdownChart data={performanceData.stepBreakdown} />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                      <p>No step breakdown data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <PerformanceDistribution 
            gasData={performanceData.gasDistribution}
            timeData={performanceData.timeDistribution}
          />
        </TabsContent>

        <TabsContent value="time" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Execution Time Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.min(...performanceData.gasHistory.map(h => h.executionTime))}ms
                    </div>
                    <div className="text-sm text-muted-foreground">Fastest</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.round(performanceData.averageExecutionTime)}ms
                    </div>
                    <div className="text-sm text-muted-foreground">Average</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.max(...performanceData.gasHistory.map(h => h.executionTime))}ms
                    </div>
                    <div className="text-sm text-muted-foreground">Slowest</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Performance Target: &lt;5s</span>
                    <span>{performanceData.averageExecutionTime < 5000 ? '✅' : '⚠️'}</span>
                  </div>
                  <Progress 
                    value={Math.min((performanceData.averageExecutionTime / 5000) * 100, 100)} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="success" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Success Rate Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {performanceData.successRate.toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground">
                    {simulationResults.filter(r => r.success).length} of {simulationResults.length} successful
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Target Success Rate: &gt;95%</span>
                    <span>{performanceData.successRate >= 95 ? '✅' : '⚠️'}</span>
                  </div>
                  <Progress 
                    value={performanceData.successRate} 
                    className="h-2"
                  />
                </div>

                {performanceData.successRate < 100 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Common Failure Reasons</h4>
                    <div className="space-y-1 text-sm">
                      {simulationResults
                        .filter(r => !r.success)
                        .slice(0, 3)
                        .map((result, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span>
                              {result.errors[0]?.message || 'Unknown error'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Optimization Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5" />
            <span>Optimization Suggestions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OptimizationSuggestions suggestions={performanceData.optimizations} />
        </CardContent>
      </Card>
    </div>
  )
}