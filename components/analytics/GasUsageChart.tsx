'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Zap, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import type { TransactionMetrics } from '@/services/analytics/metrics'

interface GasUsageChartProps {
  transactions: TransactionMetrics[]
  executionName?: string
  height?: number
  showStats?: boolean
}

interface GasDistributionBin {
  range: string
  count: number
  percentage: number
  avgGasPrice: number
  totalCost: number
  minGas: number
  maxGas: number
}

interface GasEfficiencyData {
  name: string
  value: number
  color: string
  transactions: number
}

interface GasStats {
  totalGasUsed: bigint
  avgGasUsed: number
  minGasUsed: number
  maxGasUsed: number
  totalCost: number
  avgCost: number
  avgGasPrice: number
  efficiency: number
}

export function GasUsageChart({ 
  transactions, 
  executionName, 
  height = 400,
  showStats = true 
}: GasUsageChartProps) {
  // Process gas usage data
  const gasData = React.useMemo(() => {
    return transactions
      .filter(tx => tx.status === 'confirmed' && tx.gasUsed)
      .map(tx => ({
        iteration: tx.iteration,
        gasUsed: Number(tx.gasUsed || 0),
        gasLimit: Number(tx.gasLimit),
        gasPrice: Number(tx.gasPrice),
        cost: Number((tx.gasUsed || BigInt(0)) * tx.gasPrice) / 1e18, // Convert to ETH
        efficiency: tx.gasEfficiency || 0,
        timestamp: tx.startTime
      }))
      .sort((a, b) => a.iteration - b.iteration)
  }, [transactions])

  // Create gas distribution bins
  const distributionData: GasDistributionBin[] = React.useMemo(() => {
    if (gasData.length === 0) return []

    const gasValues = gasData.map(d => d.gasUsed).sort((a, b) => a - b)
    const min = gasValues[0]
    const max = gasValues[gasValues.length - 1]
    const range = max - min
    const binCount = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(gasData.length))))
    const binSize = range / binCount

    const bins: GasDistributionBin[] = []
    
    for (let i = 0; i < binCount; i++) {
      const binMin = min + (i * binSize)
      const binMax = i === binCount - 1 ? max : min + ((i + 1) * binSize)
      
      const binTransactions = gasData.filter(d => 
        d.gasUsed >= binMin && (i === binCount - 1 ? d.gasUsed <= binMax : d.gasUsed < binMax)
      )
      
      if (binTransactions.length > 0) {
        const avgGasPrice = binTransactions.reduce((sum, t) => sum + t.gasPrice, 0) / binTransactions.length
        const totalCost = binTransactions.reduce((sum, t) => sum + t.cost, 0)
        
        bins.push({
          range: `${Math.round(binMin / 1000)}k-${Math.round(binMax / 1000)}k`,
          count: binTransactions.length,
          percentage: (binTransactions.length / gasData.length) * 100,
          avgGasPrice: avgGasPrice / 1e9, // Convert to Gwei
          totalCost,
          minGas: Math.min(...binTransactions.map(t => t.gasUsed)),
          maxGas: Math.max(...binTransactions.map(t => t.gasUsed))
        })
      }
    }
    
    return bins
  }, [gasData])

  // Create gas efficiency distribution
  const efficiencyData: GasEfficiencyData[] = React.useMemo(() => {
    if (gasData.length === 0) return []

    const ranges = [
      { name: 'Very Efficient (>90%)', min: 0.9, max: 1, color: '#10b981' },
      { name: 'Efficient (75-90%)', min: 0.75, max: 0.9, color: '#3b82f6' },
      { name: 'Moderate (50-75%)', min: 0.5, max: 0.75, color: '#f59e0b' },
      { name: 'Inefficient (<50%)', min: 0, max: 0.5, color: '#ef4444' }
    ]

    return ranges.map(range => {
      const transactions = gasData.filter(d => 
        d.efficiency >= range.min && d.efficiency < range.max
      )
      return {
        name: range.name,
        value: transactions.length,
        color: range.color,
        transactions: transactions.length
      }
    }).filter(item => item.value > 0)
  }, [gasData])

  // Calculate statistics
  const stats: GasStats = React.useMemo(() => {
    if (gasData.length === 0) {
      return {
        totalGasUsed: BigInt(0),
        avgGasUsed: 0,
        minGasUsed: 0,
        maxGasUsed: 0,
        totalCost: 0,
        avgCost: 0,
        avgGasPrice: 0,
        efficiency: 0
      }
    }

    const totalGasUsed = gasData.reduce((sum, d) => sum + BigInt(d.gasUsed), BigInt(0))
    const avgGasUsed = gasData.reduce((sum, d) => sum + d.gasUsed, 0) / gasData.length
    const minGasUsed = Math.min(...gasData.map(d => d.gasUsed))
    const maxGasUsed = Math.max(...gasData.map(d => d.gasUsed))
    const totalCost = gasData.reduce((sum, d) => sum + d.cost, 0)
    const avgCost = totalCost / gasData.length
    const avgGasPrice = gasData.reduce((sum, d) => sum + d.gasPrice, 0) / gasData.length
    const efficiency = gasData.reduce((sum, d) => sum + d.efficiency, 0) / gasData.length

    return {
      totalGasUsed,
      avgGasUsed,
      minGasUsed,
      maxGasUsed,
      totalCost,
      avgCost,
      avgGasPrice: avgGasPrice / 1e9, // Convert to Gwei
      efficiency
    }
  }, [gasData])

  const formatGas = (value: number) => {
    if (value > 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value > 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toLocaleString()
  }

  const formatEther = (value: number) => {
    if (value < 0.0001) return `${(value * 1e6).toFixed(2)} μΞ`
    if (value < 0.1) return `${(value * 1000).toFixed(2)} mΞ`
    return `${value.toFixed(4)} Ξ`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">Gas Range: {label}</p>
          <p className="text-blue-600 font-medium">
            Transactions: {data.count} ({data.percentage.toFixed(1)}%)
          </p>
          <p className="text-sm text-gray-600">
            Avg Gas Price: {data.avgGasPrice.toFixed(2)} Gwei
          </p>
          <p className="text-sm text-gray-600">
            Total Cost: {formatEther(data.totalCost)}
          </p>
          <p className="text-sm text-gray-600">
            Range: {formatGas(data.minGas)} - {formatGas(data.maxGas)}
          </p>
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-blue-600 font-medium">
            {data.transactions} transactions
          </p>
          <p className="text-sm text-gray-600">
            {((data.value / gasData.length) * 100).toFixed(1)}% of total
          </p>
        </div>
      )
    }
    return null
  }

  if (gasData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Gas Usage Analysis
          </CardTitle>
          <CardDescription>
            Gas consumption patterns{executionName && ` for ${executionName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Zap className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Gas Data</h3>
            <p>No confirmed transactions with gas data available.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Gas Usage Analysis
          </CardTitle>
          <CardDescription>
            Gas consumption patterns{executionName && ` for ${executionName}`}
            {gasData.length > 0 && ` (${gasData.length} transactions)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="distribution" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="distribution" className="flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                Distribution
              </TabsTrigger>
              <TabsTrigger value="efficiency" className="flex items-center">
                <PieChartIcon className="w-4 h-4 mr-2" />
                Efficiency
              </TabsTrigger>
            </TabsList>

            <TabsContent value="distribution">
              <div style={{ width: '100%', height }}>
                <ResponsiveContainer>
                  <BarChart
                    data={distributionData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="range" 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Gas Usage Range', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Transaction Count', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    
                    {/* Reference line for average */}
                    <ReferenceLine 
                      y={stats.avgGasUsed} 
                      stroke="#8884d8" 
                      strokeDasharray="2 2"
                      label={{ value: "Avg", position: "topRight" }}
                    />
                    
                    <Bar
                      dataKey="count"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      name="Transaction Count"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="efficiency">
              <div style={{ width: '100%', height }}>
                <ResponsiveContainer>
                  <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <Pie
                      data={efficiencyData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      innerRadius={60}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    >
                      {efficiencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend />
                  </PieChart>
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
              <div className="text-2xl font-bold text-blue-600">
                {formatGas(stats.avgGasUsed)}
              </div>
              <div className="text-sm text-muted-foreground">Average Gas Used</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatGas(Number(stats.totalGasUsed))}
              </div>
              <div className="text-sm text-muted-foreground">Total Gas Used</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatEther(stats.totalCost)}
              </div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {(stats.efficiency * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Efficiency</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gas Usage Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Minimum:</span>
              <span className="font-semibold">{formatGas(stats.minGasUsed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Maximum:</span>
              <span className="font-semibold">{formatGas(stats.maxGasUsed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average:</span>
              <span className="font-semibold">{formatGas(stats.avgGasUsed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Range:</span>
              <span className="font-semibold">{formatGas(stats.maxGasUsed - stats.minGasUsed)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Gas Price:</span>
              <span className="font-semibold">{stats.avgGasPrice.toFixed(2)} Gwei</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Cost per TX:</span>
              <span className="font-semibold">{formatEther(stats.avgCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Cost:</span>
              <span className="font-semibold">{formatEther(stats.totalCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Efficiency:</span>
              <span className="font-semibold">{(stats.efficiency * 100).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}