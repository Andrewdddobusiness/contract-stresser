'use client'

import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Clock, PieChart as PieChartIcon, BarChart3, AlertTriangle } from 'lucide-react'
import type { TransactionMetrics } from '@/services/analytics/metrics'

interface SuccessFailureChartProps {
  transactions: TransactionMetrics[]
  executionName?: string
  height?: number
  showStats?: boolean
}

interface StatusData {
  name: string
  value: number
  color: string
  percentage: number
}

interface ErrorAnalysis {
  errorType: string
  count: number
  percentage: number
  examples: string[]
}

interface TimeBasedSuccess {
  timeRange: string
  successful: number
  failed: number
  pending: number
  successRate: number
}

interface SuccessFailureStats {
  totalTransactions: number
  successCount: number
  failureCount: number
  pendingCount: number
  successRate: number
  failureRate: number
  mostCommonError: string
  errorVariety: number
  avgRetries: number
}

export function SuccessFailureChart({ 
  transactions, 
  executionName, 
  height = 400,
  showStats = true 
}: SuccessFailureChartProps) {
  // Process status distribution
  const statusData: StatusData[] = React.useMemo(() => {
    const statusCounts = transactions.reduce((acc, tx) => {
      acc[tx.status] = (acc[tx.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const total = transactions.length
    const colors = {
      confirmed: '#10b981',
      failed: '#ef4444',
      pending: '#f59e0b'
    }

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: colors[status as keyof typeof colors] || '#6b7280',
      percentage: total > 0 ? (count / total) * 100 : 0
    }))
  }, [transactions])

  // Analyze error types
  const errorAnalysis: ErrorAnalysis[] = React.useMemo(() => {
    const failedTransactions = transactions.filter(tx => tx.status === 'failed' && tx.error)
    const errorGroups = new Map<string, string[]>()

    failedTransactions.forEach(tx => {
      const error = tx.error!.toLowerCase()
      let errorType = 'other'

      // Categorize errors
      if (error.includes('gas') || error.includes('fee')) {
        errorType = 'Gas Related'
      } else if (error.includes('network') || error.includes('connection') || error.includes('timeout')) {
        errorType = 'Network Issues'
      } else if (error.includes('revert') || error.includes('execution')) {
        errorType = 'Contract Revert'
      } else if (error.includes('nonce')) {
        errorType = 'Nonce Issues'
      } else if (error.includes('rejected') || error.includes('denied')) {
        errorType = 'User Rejection'
      } else if (error.includes('insufficient')) {
        errorType = 'Insufficient Funds'
      }

      if (!errorGroups.has(errorType)) {
        errorGroups.set(errorType, [])
      }
      errorGroups.get(errorType)!.push(tx.error!)
    })

    const totalFailures = failedTransactions.length

    return Array.from(errorGroups.entries())
      .map(([errorType, examples]) => ({
        errorType,
        count: examples.length,
        percentage: totalFailures > 0 ? (examples.length / totalFailures) * 100 : 0,
        examples: [...new Set(examples)].slice(0, 3) // Unique examples, max 3
      }))
      .sort((a, b) => b.count - a.count)
  }, [transactions])

  // Time-based success analysis
  const timeBasedData: TimeBasedSuccess[] = React.useMemo(() => {
    if (transactions.length === 0) return []

    // Sort transactions by start time
    const sortedTx = [...transactions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    const startTime = sortedTx[0].startTime
    const endTime = sortedTx[sortedTx.length - 1].startTime
    const duration = endTime.getTime() - startTime.getTime()

    // Create time buckets (max 10 buckets)
    const bucketCount = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(transactions.length))))
    const bucketSize = duration / bucketCount
    const buckets: TimeBasedSuccess[] = []

    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = new Date(startTime.getTime() + i * bucketSize)
      const bucketEnd = new Date(startTime.getTime() + (i + 1) * bucketSize)
      
      const bucketTx = transactions.filter(tx => 
        tx.startTime >= bucketStart && tx.startTime < bucketEnd
      )

      const successful = bucketTx.filter(tx => tx.status === 'confirmed').length
      const failed = bucketTx.filter(tx => tx.status === 'failed').length
      const pending = bucketTx.filter(tx => tx.status === 'pending').length
      const total = bucketTx.length

      buckets.push({
        timeRange: `${bucketStart.toLocaleTimeString()} - ${bucketEnd.toLocaleTimeString()}`,
        successful,
        failed,
        pending,
        successRate: total > 0 ? (successful / total) * 100 : 0
      })
    }

    return buckets
  }, [transactions])

  // Calculate statistics
  const stats: SuccessFailureStats = React.useMemo(() => {
    const total = transactions.length
    const successCount = transactions.filter(tx => tx.status === 'confirmed').length
    const failureCount = transactions.filter(tx => tx.status === 'failed').length
    const pendingCount = transactions.filter(tx => tx.status === 'pending').length
    
    const successRate = total > 0 ? (successCount / total) * 100 : 0
    const failureRate = total > 0 ? (failureCount / total) * 100 : 0
    
    const mostCommonError = errorAnalysis.length > 0 ? errorAnalysis[0].errorType : 'None'
    const errorVariety = errorAnalysis.length
    
    const avgRetries = transactions.reduce((sum, tx) => sum + tx.retryCount, 0) / Math.max(total, 1)

    return {
      totalTransactions: total,
      successCount,
      failureCount,
      pendingCount,
      successRate,
      failureRate,
      mostCommonError,
      errorVariety,
      avgRetries
    }
  }, [transactions, errorAnalysis])

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />
      default: return null
    }
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 80) return 'text-yellow-600'
    if (rate >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as StatusData
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2 mb-1">
            {getStatusIcon(data.name)}
            <span className="font-semibold">{data.name}</span>
          </div>
          <p className="text-blue-600 font-medium">
            {data.value.toLocaleString()} transactions
          </p>
          <p className="text-sm text-gray-600">
            {data.percentage.toFixed(1)}% of total
          </p>
        </div>
      )
    }
    return null
  }

  const TimeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TimeBasedSuccess
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-green-600 font-medium">
              Successful: {data.successful}
            </p>
            <p className="text-red-600 font-medium">
              Failed: {data.failed}
            </p>
            {data.pending > 0 && (
              <p className="text-yellow-600 font-medium">
                Pending: {data.pending}
              </p>
            )}
            <p className="text-sm text-gray-600">
              Success Rate: {data.successRate.toFixed(1)}%
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChartIcon className="w-5 h-5 mr-2" />
            Success/Failure Analysis
          </CardTitle>
          <CardDescription>
            Transaction outcome distribution{executionName && ` for ${executionName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <PieChartIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Transaction Data</h3>
            <p>No transactions available for success/failure analysis.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <PieChartIcon className="w-5 h-5 mr-2" />
              Success/Failure Analysis
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={stats.successRate >= 95 ? 'default' : stats.successRate >= 80 ? 'secondary' : 'destructive'}
                className="text-sm"
              >
                {stats.successRate.toFixed(1)}% Success Rate
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Transaction outcomes{executionName && ` for ${executionName}`}
            {` (${stats.totalTransactions.toLocaleString()} total transactions)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center">
                <PieChartIcon className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="errors" className="flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Error Analysis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div style={{ width: '100%', height }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                      outerRadius={120}
                      innerRadius={60}
                      paddingAngle={2}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <div style={{ width: '100%', height }}>
                <ResponsiveContainer>
                  <BarChart
                    data={timeBasedData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="timeRange" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<TimeTooltip />} />
                    <Legend />
                    
                    <Bar
                      dataKey="successful"
                      stackId="a"
                      fill="#10b981"
                      name="Successful"
                    />
                    <Bar
                      dataKey="failed"
                      stackId="a"
                      fill="#ef4444"
                      name="Failed"
                    />
                    {timeBasedData.some(d => d.pending > 0) && (
                      <Bar
                        dataKey="pending"
                        stackId="a"
                        fill="#f59e0b"
                        name="Pending"
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="errors">
              {errorAnalysis.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Error Breakdown</h4>
                  <div className="grid gap-4">
                    {errorAnalysis.map((error, index) => (
                      <Card key={index} className="border-l-4 border-l-red-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold flex items-center">
                              <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                              {error.errorType}
                            </h5>
                            <div className="flex items-center space-x-2">
                              <Badge variant="destructive">
                                {error.count} occurrences
                              </Badge>
                              <Badge variant="outline">
                                {error.percentage.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p className="mb-2">Example errors:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {error.examples.map((example, i) => (
                                <li key={i} className="truncate">
                                  {example}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Errors Found</h3>
                  <p>All transactions completed successfully!</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Statistics Panel */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${getSuccessRateColor(stats.successRate)}`}>
                {stats.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
              <div className="text-xs text-muted-foreground">
                {stats.successCount.toLocaleString()} / {stats.totalTransactions.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.failureCount.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
              <div className="text-xs text-muted-foreground">
                {stats.failureRate.toFixed(1)}% failure rate
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.errorVariety}
              </div>
              <div className="text-sm text-muted-foreground">Error Types</div>
              <div className="text-xs text-muted-foreground">
                Most common: {stats.mostCommonError}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.avgRetries.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Retries</div>
              <div className="text-xs text-muted-foreground">
                Per transaction
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statusData.map((status, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status.name)}
                  <span className="font-semibold">{status.name}</span>
                </div>
                <Badge variant="outline">
                  {status.percentage.toFixed(1)}%
                </Badge>
              </div>
              <div className="text-2xl font-bold" style={{ color: status.color }}>
                {status.value.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                transactions
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}