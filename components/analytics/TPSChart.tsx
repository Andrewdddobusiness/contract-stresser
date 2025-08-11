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
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react'
import type { TransactionMetrics, PerformanceSnapshot } from '@/services/analytics/metrics'
import { formatDistanceToNow } from 'date-fns'

interface TPSChartProps {
  transactions?: TransactionMetrics[]
  snapshots?: PerformanceSnapshot[]
  executionName?: string
  height?: number
  showStats?: boolean
  timeWindowSeconds?: number
}

interface TPSDataPoint {
  timestamp: string
  time: number
  tps: number
  cumulativeTPS: number
  activeTransactions: number
  successfulTransactions: number
  failedTransactions: number
  windowStart: Date
  windowEnd: Date
}

interface TPSStats {
  peakTPS: number
  averageTPS: number
  minTPS: number
  sustainedTPS: number // TPS for 80% of the time
  trend: 'increasing' | 'decreasing' | 'stable'
  trendPercentage: number
  totalDuration: number
}

export function TPSChart({ 
  transactions = [],
  snapshots = [],
  executionName, 
  height = 400,
  showStats = true,
  timeWindowSeconds = 10
}: TPSChartProps) {
  // Process transactions into TPS data points
  const tpsData: TPSDataPoint[] = React.useMemo(() => {
    if (transactions.length === 0) return []

    // Sort transactions by completion time
    const completedTransactions = transactions
      .filter(tx => tx.status === 'confirmed' && tx.endTime)
      .sort((a, b) => a.endTime!.getTime() - b.endTime!.getTime())

    if (completedTransactions.length === 0) return []

    const startTime = completedTransactions[0].endTime!
    const endTime = completedTransactions[completedTransactions.length - 1].endTime!
    const totalDuration = endTime.getTime() - startTime.getTime()
    
    // Create time windows
    const windowSizeMs = timeWindowSeconds * 1000
    const windows: TPSDataPoint[] = []
    
    let currentTime = startTime.getTime()
    let cumulativeCount = 0
    
    while (currentTime <= endTime.getTime()) {
      const windowStart = new Date(currentTime)
      const windowEnd = new Date(currentTime + windowSizeMs)
      
      // Count transactions in this window
      const windowTransactions = completedTransactions.filter(tx => 
        tx.endTime! >= windowStart && tx.endTime! < windowEnd
      )
      
      const successfulInWindow = windowTransactions.filter(tx => tx.status === 'confirmed').length
      const failedInWindow = windowTransactions.filter(tx => tx.status === 'failed').length
      const activeInWindow = transactions.filter(tx => 
        tx.startTime <= windowEnd && 
        (!tx.endTime || tx.endTime >= windowStart) &&
        tx.status === 'pending'
      ).length
      
      cumulativeCount += windowTransactions.length
      const cumulativeTPS = totalDuration > 0 ? (cumulativeCount / (currentTime - startTime.getTime())) * 1000 : 0
      
      windows.push({
        timestamp: windowStart.toLocaleTimeString(),
        time: currentTime,
        tps: windowTransactions.length / timeWindowSeconds,
        cumulativeTPS,
        activeTransactions: activeInWindow,
        successfulTransactions: successfulInWindow,
        failedTransactions: failedInWindow,
        windowStart,
        windowEnd
      })
      
      currentTime += windowSizeMs
    }
    
    return windows
  }, [transactions, timeWindowSeconds])

  // Process snapshots into TPS data (alternative data source)
  const snapshotData: TPSDataPoint[] = React.useMemo(() => {
    if (snapshots.length === 0) return []

    return snapshots.map(snapshot => ({
      timestamp: snapshot.timestamp.toLocaleTimeString(),
      time: snapshot.timestamp.getTime(),
      tps: snapshot.currentTPS,
      cumulativeTPS: snapshot.totalProcessed / ((snapshot.timestamp.getTime() - snapshots[0].timestamp.getTime()) / 1000 || 1),
      activeTransactions: snapshot.activeTransactions,
      successfulTransactions: snapshot.successCount,
      failedTransactions: snapshot.errorCount,
      windowStart: snapshot.timestamp,
      windowEnd: snapshot.timestamp
    }))
  }, [snapshots])

  // Use snapshots if available, otherwise use transaction-derived data
  const chartData = snapshotData.length > 0 ? snapshotData : tpsData

  // Calculate TPS statistics
  const stats: TPSStats = React.useMemo(() => {
    if (chartData.length === 0) {
      return {
        peakTPS: 0,
        averageTPS: 0,
        minTPS: 0,
        sustainedTPS: 0,
        trend: 'stable',
        trendPercentage: 0,
        totalDuration: 0
      }
    }

    const tpsValues = chartData.map(d => d.tps).filter(tps => tps > 0)
    
    if (tpsValues.length === 0) {
      return {
        peakTPS: 0,
        averageTPS: 0,
        minTPS: 0,
        sustainedTPS: 0,
        trend: 'stable',
        trendPercentage: 0,
        totalDuration: 0
      }
    }

    const peakTPS = Math.max(...tpsValues)
    const averageTPS = tpsValues.reduce((sum, tps) => sum + tps, 0) / tpsValues.length
    const minTPS = Math.min(...tpsValues)
    
    // Calculate sustained TPS (80th percentile)
    const sortedTPS = [...tpsValues].sort((a, b) => a - b)
    const sustainedIndex = Math.floor(sortedTPS.length * 0.2) // 20th percentile (80% above this)
    const sustainedTPS = sortedTPS[sustainedIndex] || minTPS

    // Calculate trend (first third vs last third)
    const thirdPoint = Math.floor(chartData.length / 3)
    const firstThird = chartData.slice(0, thirdPoint)
    const lastThird = chartData.slice(-thirdPoint)
    
    const firstThirdAvg = firstThird.reduce((sum, d) => sum + d.tps, 0) / firstThird.length
    const lastThirdAvg = lastThird.reduce((sum, d) => sum + d.tps, 0) / lastThird.length
    
    const trendPercentage = firstThirdAvg > 0 ? ((lastThirdAvg - firstThirdAvg) / firstThirdAvg) * 100 : 0
    const trend = Math.abs(trendPercentage) < 10 ? 'stable' : 
                  trendPercentage > 0 ? 'increasing' : 'decreasing'

    const totalDuration = chartData.length > 0 ? 
      (chartData[chartData.length - 1].time - chartData[0].time) / 1000 : 0

    return {
      peakTPS,
      averageTPS,
      minTPS,
      sustainedTPS,
      trend,
      trendPercentage: Math.abs(trendPercentage),
      totalDuration
    }
  }, [chartData])

  const getTrendIcon = (trend: TPSStats['trend']) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-red-500" />
      default: return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: TPSStats['trend']) => {
    switch (trend) {
      case 'increasing': return 'text-green-600'
      case 'decreasing': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)}s`
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`
    return `${(seconds / 3600).toFixed(1)}h`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TPSDataPoint
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">Time: {label}</p>
          <p className="text-blue-600 font-medium">
            TPS: {data.tps.toFixed(2)}
          </p>
          <p className="text-purple-600 font-medium">
            Cumulative TPS: {data.cumulativeTPS.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">
            Active: {data.activeTransactions}
          </p>
          <p className="text-sm text-green-600">
            Successful: {data.successfulTransactions}
          </p>
          {data.failedTransactions > 0 && (
            <p className="text-sm text-red-600">
              Failed: {data.failedTransactions}
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
            <Activity className="w-5 h-5 mr-2" />
            Transactions Per Second (TPS)
          </CardTitle>
          <CardDescription>
            Transaction throughput over time{executionName && ` for ${executionName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No TPS Data</h3>
            <p>No transaction data available for throughput analysis.</p>
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
              <Activity className="w-5 h-5 mr-2" />
              Transactions Per Second (TPS)
            </div>
            <div className="flex items-center space-x-2">
              {getTrendIcon(stats.trend)}
              <span className={`text-sm ${getTrendColor(stats.trend)}`}>
                {stats.trend === 'stable' ? 'Stable' : 
                 `${stats.trendPercentage.toFixed(1)}% ${stats.trend}`}
              </span>
            </div>
          </CardTitle>
          <CardDescription>
            Transaction throughput over time{executionName && ` for ${executionName}`}
            {` (${timeWindowSeconds}s windows, ${formatDuration(stats.totalDuration)} total)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="line" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="line">
                <Activity className="w-4 h-4 mr-2" />
                Line Chart
              </TabsTrigger>
              <TabsTrigger value="area">
                <Zap className="w-4 h-4 mr-2" />
                Area Chart
              </TabsTrigger>
            </TabsList>

            <TabsContent value="line">
              <div style={{ width: '100%', height }}>
                <ResponsiveContainer>
                  <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Transactions/Second', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    
                    {/* Reference lines */}
                    <ReferenceLine 
                      y={stats.averageTPS} 
                      stroke="#8884d8" 
                      strokeDasharray="2 2"
                      label={{ value: "Avg", position: "topRight" }}
                    />
                    <ReferenceLine 
                      y={stats.sustainedTPS} 
                      stroke="#82ca9d" 
                      strokeDasharray="2 2"
                      label={{ value: "Sustained", position: "topRight" }}
                    />
                    
                    {/* TPS Line */}
                    <Line
                      type="monotone"
                      dataKey="tps"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#2563eb' }}
                      activeDot={{ r: 5, fill: '#1d4ed8' }}
                      name="Current TPS"
                    />
                    
                    {/* Cumulative TPS Line */}
                    <Line
                      type="monotone"
                      dataKey="cumulativeTPS"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={false}
                      name="Cumulative TPS"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="area">
              <div style={{ width: '100%', height }}>
                <ResponsiveContainer>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Transactions/Second', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    
                    {/* Reference line for average */}
                    <ReferenceLine 
                      y={stats.averageTPS} 
                      stroke="#8884d8" 
                      strokeDasharray="2 2"
                      label={{ value: "Avg", position: "topRight" }}
                    />
                    
                    {/* TPS Area */}
                    <Area
                      type="monotone"
                      dataKey="tps"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#tpsGradient)"
                      fillOpacity={0.6}
                      name="TPS"
                    />
                    
                    {/* Define gradient */}
                    <defs>
                      <linearGradient id="tpsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Statistics Panel */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.peakTPS.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Peak TPS</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.averageTPS.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Average TPS</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.sustainedTPS.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Sustained TPS</div>
              <div className="text-xs text-muted-foreground">(80th percentile)</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatDuration(stats.totalDuration)}
              </div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Peak Performance:</span>
              <span className="font-semibold">{stats.peakTPS.toFixed(2)} TPS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Performance:</span>
              <span className="font-semibold">{stats.averageTPS.toFixed(2)} TPS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Minimum Performance:</span>
              <span className="font-semibold">{stats.minTPS.toFixed(2)} TPS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Consistency:</span>
              <span className="font-semibold">
                {((stats.sustainedTPS / stats.peakTPS) * 100).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trend Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Trend Direction:</span>
              <div className="flex items-center space-x-1">
                {getTrendIcon(stats.trend)}
                <span className={`font-semibold ${getTrendColor(stats.trend)}`}>
                  {stats.trend.charAt(0).toUpperCase() + stats.trend.slice(1)}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Trend Magnitude:</span>
              <span className="font-semibold">{stats.trendPercentage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Duration:</span>
              <span className="font-semibold">{formatDuration(stats.totalDuration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Data Points:</span>
              <span className="font-semibold">{chartData.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}