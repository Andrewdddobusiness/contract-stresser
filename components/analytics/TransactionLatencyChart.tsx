'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { TransactionMetrics } from '@/services/analytics/metrics'

interface TransactionLatencyChartProps {
  transactions: TransactionMetrics[]
  executionName?: string
  height?: number
  showStats?: boolean
}

interface ChartDataPoint {
  iteration: number
  confirmationTime: number
  timestamp: string
  status: 'confirmed' | 'failed' | 'pending'
  gasUsed?: number
  moving_average?: number
}

interface LatencyStats {
  avgLatency: number
  minLatency: number
  maxLatency: number
  p95Latency: number
  p99Latency: number
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
}

export function TransactionLatencyChart({ 
  transactions, 
  executionName, 
  height = 400,
  showStats = true 
}: TransactionLatencyChartProps) {
  // Process transaction data into chart format
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    const confirmedTransactions = transactions
      .filter(tx => tx.status === 'confirmed' && tx.confirmationTime)
      .sort((a, b) => a.iteration - b.iteration)

    return confirmedTransactions.map((tx, index) => {
      // Calculate moving average (window of 5)
      const windowSize = 5
      const startIndex = Math.max(0, index - Math.floor(windowSize / 2))
      const endIndex = Math.min(confirmedTransactions.length - 1, index + Math.floor(windowSize / 2))
      const windowTransactions = confirmedTransactions.slice(startIndex, endIndex + 1)
      const movingAverage = windowTransactions.reduce((sum, t) => sum + (t.confirmationTime || 0), 0) / windowTransactions.length

      return {
        iteration: tx.iteration,
        confirmationTime: tx.confirmationTime || 0,
        timestamp: tx.startTime.toLocaleTimeString(),
        status: tx.status,
        gasUsed: tx.gasUsed ? Number(tx.gasUsed) : undefined,
        moving_average: movingAverage
      }
    })
  }, [transactions])

  // Calculate latency statistics
  const stats: LatencyStats = React.useMemo(() => {
    const latencies = chartData.map(d => d.confirmationTime).filter(l => l > 0).sort((a, b) => a - b)
    
    if (latencies.length === 0) {
      return {
        avgLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        trend: 'stable',
        trendPercentage: 0
      }
    }

    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length
    const minLatency = latencies[0]
    const maxLatency = latencies[latencies.length - 1]
    const p95Index = Math.floor(latencies.length * 0.95)
    const p99Index = Math.floor(latencies.length * 0.99)
    const p95Latency = latencies[p95Index] || maxLatency
    const p99Latency = latencies[p99Index] || maxLatency

    // Calculate trend (compare first half vs second half)
    const midpoint = Math.floor(chartData.length / 2)
    const firstHalf = chartData.slice(0, midpoint)
    const secondHalf = chartData.slice(midpoint)
    
    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.confirmationTime, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.confirmationTime, 0) / secondHalf.length
    
    const trendPercentage = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0
    const trend = Math.abs(trendPercentage) < 5 ? 'stable' : trendPercentage > 0 ? 'up' : 'down'

    return {
      avgLatency,
      minLatency,
      maxLatency,
      p95Latency,
      p99Latency,
      trend,
      trendPercentage: Math.abs(trendPercentage)
    }
  }, [chartData])

  const formatLatency = (value: number) => {
    if (value < 1000) return `${value.toFixed(0)}ms`
    return `${(value / 1000).toFixed(2)}s`
  }

  const getTrendIcon = (trend: LatencyStats['trend']) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />
      default: return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: LatencyStats['trend']) => {
    switch (trend) {
      case 'up': return 'text-red-600'
      case 'down': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">Transaction #{label}</p>
          <p className="text-sm text-gray-600">Time: {data.timestamp}</p>
          <p className="text-blue-600 font-medium">
            Confirmation: {formatLatency(data.confirmationTime)}
          </p>
          {data.gasUsed && (
            <p className="text-sm text-gray-600">
              Gas Used: {data.gasUsed.toLocaleString()}
            </p>
          )}
          {payload[1] && (
            <p className="text-purple-600 font-medium">
              Moving Avg: {formatLatency(payload[1].value)}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Transaction Latency
          </CardTitle>
          <CardDescription>
            Confirmation time for each transaction{executionName && ` in ${executionName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Transaction Data</h3>
            <p>No confirmed transactions available for latency analysis.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Transaction Latency Over Time
            </div>
            <div className="flex items-center space-x-2">
              {getTrendIcon(stats.trend)}
              <span className={`text-sm ${getTrendColor(stats.trend)}`}>
                {stats.trend === 'stable' ? 'Stable' : `${stats.trendPercentage.toFixed(1)}% ${stats.trend}`}
              </span>
            </div>
          </CardTitle>
          <CardDescription>
            Confirmation time for each transaction{executionName && ` in ${executionName}`}
            {chartData.length > 0 && ` (${chartData.length} transactions)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="iteration" 
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Transaction Number', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Confirmation Time (ms)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={formatLatency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Reference lines for percentiles */}
                <ReferenceLine 
                  y={stats.avgLatency} 
                  stroke="#8884d8" 
                  strokeDasharray="2 2"
                  label={{ value: "Avg", position: "topRight" }}
                />
                <ReferenceLine 
                  y={stats.p95Latency} 
                  stroke="#ff7300" 
                  strokeDasharray="2 2"
                  label={{ value: "P95", position: "topRight" }}
                />
                
                {/* Main latency line */}
                <Line
                  type="monotone"
                  dataKey="confirmationTime"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#2563eb' }}
                  activeDot={{ r: 5, fill: '#1d4ed8' }}
                  name="Confirmation Time"
                />
                
                {/* Moving average line */}
                {chartData.length > 5 && (
                  <Line
                    type="monotone"
                    dataKey="moving_average"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={false}
                    name="Moving Average (5-point)"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Panel */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{formatLatency(stats.avgLatency)}</div>
              <div className="text-sm text-muted-foreground">Average</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{formatLatency(stats.minLatency)}</div>
              <div className="text-sm text-muted-foreground">Minimum</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{formatLatency(stats.maxLatency)}</div>
              <div className="text-sm text-muted-foreground">Maximum</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{formatLatency(stats.p95Latency)}</div>
              <div className="text-sm text-muted-foreground">95th Percentile</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{formatLatency(stats.p99Latency)}</div>
              <div className="text-sm text-muted-foreground">99th Percentile</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}