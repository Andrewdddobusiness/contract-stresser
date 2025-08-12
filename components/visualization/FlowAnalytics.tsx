'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Clock, 
  DollarSign, 
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import { useFlowExecution } from '@/hooks/useFlowExecution'
import { flowVisualizationEngine, type FlowAnalytics } from '@/services/visualization/flowEngine'
import { cn } from '@/utils/cn'

interface FlowAnalyticsProps {
  operationId: string
  className?: string
}

interface MetricCardProps {
  title: string
  value: string | number
  format?: 'number' | 'gas' | 'duration' | 'percentage' | 'currency'
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
  description?: string
}

const MetricCard = ({ title, value, format = 'number', trend, icon, description }: MetricCardProps) => {
  const formatValue = (val: string | number, fmt: string) => {
    switch (fmt) {
      case 'gas':
        const gasNum = typeof val === 'string' ? parseFloat(val) : val
        if (gasNum >= 1e6) return `${(gasNum / 1e6).toFixed(1)}M`
        if (gasNum >= 1e3) return `${(gasNum / 1e3).toFixed(1)}K`
        return gasNum.toLocaleString()
      
      case 'duration':
        const ms = typeof val === 'string' ? parseFloat(val) : val
        if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`
        if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
        return `${Math.round(ms)}ms`
      
      case 'percentage':
        return `${typeof val === 'string' ? parseFloat(val).toFixed(1) : val.toFixed(1)}%`
      
      case 'currency':
        const ethVal = typeof val === 'string' ? parseFloat(val) : val
        if (ethVal >= 1) return `${ethVal.toFixed(4)} ETH`
        return `${(ethVal * 1000).toFixed(2)} mETH`
      
      default:
        return typeof val === 'string' ? val : val.toLocaleString()
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />
      default: return null
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-1">
            <p className="text-xs text-gray-600 flex items-center space-x-1">
              {icon}
              <span>{title}</span>
            </p>
            <p className="text-lg font-semibold">{formatValue(value, format)}</p>
            {description && (
              <p className="text-xs text-gray-500">{description}</p>
            )}
          </div>
          {getTrendIcon()}
        </div>
      </CardContent>
    </Card>
  )
}

export function FlowAnalytics({ operationId, className }: FlowAnalyticsProps) {
  const {
    operation,
    executionProgress,
    simulationResult,
    isLoading,
    error
  } = useFlowExecution({ operationId })

  const analytics = useMemo(async () => {
    if (!operation) return null
    
    try {
      return await flowVisualizationEngine.generateFlowAnalytics(operationId)
    } catch (err) {
      console.warn('Failed to generate analytics:', err)
      return null
    }
  }, [operationId, operation])

  // Generate chart data
  const gasUsageData = useMemo(() => {
    if (!operation) return []
    
    return operation.steps.map((step, index) => ({
      step: `Step ${index + 1}`,
      name: step.function,
      estimatedGas: Number(step.gasLimit || 0),
      actualGas: Number(step.gasUsed || 0)
    }))
  }, [operation])

  const executionTimelineData = useMemo(() => {
    if (!executionProgress) return []
    
    // Generate timeline data based on progress
    const data = []
    for (let i = 0; i <= executionProgress.currentStep; i++) {
      data.push({
        step: i + 1,
        time: i * (executionProgress.elapsedTime / Math.max(executionProgress.currentStep, 1)),
        cumulativeTime: (i + 1) * (executionProgress.elapsedTime / Math.max(executionProgress.currentStep, 1))
      })
    }
    return data
  }, [executionProgress])

  const statusDistribution = useMemo(() => {
    if (!operation) return []
    
    const statuses = operation.steps.reduce((acc, step) => {
      let status: string
      if (step.executed) status = 'completed'
      else if (step.error) status = 'failed'
      else status = 'pending'
      
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(statuses).map(([status, count]) => ({
      name: status,
      value: count,
      color: status === 'completed' ? '#10b981' : 
             status === 'failed' ? '#ef4444' : '#6b7280'
    }))
  }, [operation])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Activity className="w-8 h-8 animate-pulse text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Loading analytics...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!operation) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No operation data available</p>
        </CardContent>
      </Card>
    )
  }

  const successRate = operation.steps.length > 0 
    ? (operation.steps.filter(step => step.executed && !step.error).length / operation.steps.length) * 100 
    : 0

  const totalEstimatedGas = operation.steps.reduce((sum, step) => sum + Number(step.gasLimit || 0), 0)
  const totalActualGas = operation.steps.reduce((sum, step) => sum + Number(step.gasUsed || 0), 0)
  const estimatedCost = simulationResult ? Number(simulationResult.estimatedCost) / 1e18 : 0
  const executionTime = executionProgress?.elapsedTime || 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Flow Analytics</span>
            <Badge variant="outline" className="ml-2">
              {operation.type.charAt(0).toUpperCase() + operation.type.slice(1)}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Gas Used"
          value={totalActualGas || totalEstimatedGas}
          format="gas"
          icon={<Zap className="w-3 h-3" />}
          description={totalActualGas ? "Actual usage" : "Estimated"}
        />
        
        <MetricCard
          title="Execution Time"
          value={executionTime}
          format="duration"
          icon={<Clock className="w-3 h-3" />}
          description={executionProgress ? "Elapsed time" : "Not started"}
        />
        
        <MetricCard
          title="Success Rate"
          value={successRate}
          format="percentage"
          trend={successRate >= 80 ? 'up' : successRate >= 50 ? 'neutral' : 'down'}
          icon={<Target className="w-3 h-3" />}
        />
        
        <MetricCard
          title="Estimated Cost"
          value={estimatedCost}
          format="currency"
          icon={<DollarSign className="w-3 h-3" />}
          description="Based on simulation"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gas Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gas Usage by Step</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gasUsageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="step" 
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()} gas`, '']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar 
                    dataKey="estimatedGas" 
                    fill="#94a3b8" 
                    name="Estimated"
                    opacity={0.7}
                  />
                  <Bar 
                    dataKey="actualGas" 
                    fill="#3b82f6" 
                    name="Actual"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution Timeline */}
      {executionTimelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={executionTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="step" 
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(1)}s`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Execution Time']}
                    labelFormatter={(label) => `Step ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulativeTime" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {operation.steps.map((step, index) => (
              <div key={step.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {step.executed && !step.error ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : step.error ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div>
                    <p className="font-medium text-sm">
                      Step {index + 1}: {step.function}
                    </p>
                    <p className="text-xs text-gray-600 font-mono">
                      {step.contract}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-xs">
                  {step.gasUsed && (
                    <Badge variant="outline">
                      {step.gasUsed.toLocaleString()} gas
                    </Badge>
                  )}
                  
                  <Badge 
                    variant={step.executed ? 'default' : 'outline'}
                    className={cn(
                      step.executed && !step.error && "bg-green-100 text-green-700",
                      step.error && "bg-red-100 text-red-700"
                    )}
                  >
                    {step.executed ? (step.error ? 'Failed' : 'Complete') : 'Pending'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Simulation Results */}
      {simulationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simulation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Can Execute:</span>
                <div className="flex items-center space-x-1 mt-1">
                  {simulationResult.canExecute ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={simulationResult.canExecute ? "text-green-700" : "text-red-700"}>
                    {simulationResult.canExecute ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              
              <div>
                <span className="text-gray-600">Estimated Gas:</span>
                <p className="font-medium mt-1">{simulationResult.estimatedGas.toLocaleString()}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Recommended Gas Price:</span>
                <p className="font-medium mt-1">{(Number(simulationResult.recommendedGasPrice) / 1e9).toFixed(2)} gwei</p>
              </div>
            </div>
            
            {simulationResult.warnings.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Warnings:</p>
                    {simulationResult.warnings.map((warning, index) => (
                      <p key={index} className="text-sm">{warning}</p>
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
                      <p key={index} className="text-sm">{error}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}