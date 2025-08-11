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
  Cell,
  ScatterChart,
  Scatter,
  ComposedChart,
  Line
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Layers, BarChart3, Activity } from 'lucide-react'
import type { TransactionMetrics } from '@/services/analytics/metrics'

interface BlockDistributionChartProps {
  transactions: TransactionMetrics[]
  executionName?: string
  height?: number
  showStats?: boolean
}

interface BlockData {
  blockNumber: string
  blockNumberValue: number
  transactionCount: number
  successCount: number
  failedCount: number
  avgGasUsed: number
  totalGasUsed: number
  avgConfirmationTime: number
  blockTime?: number
  cumulativeTransactions: number
}

interface BlockStats {
  totalBlocks: number
  avgTransactionsPerBlock: number
  maxTransactionsPerBlock: number
  minTransactionsPerBlock: number
  blockSpan: number
  avgBlockTime: number
  blockUtilization: number
}

export function BlockDistributionChart({ 
  transactions, 
  executionName, 
  height = 400,
  showStats = true 
}: BlockDistributionChartProps) {
  // Process transactions by block
  const blockData: BlockData[] = React.useMemo(() => {
    const confirmedTxs = transactions
      .filter(tx => tx.status === 'confirmed' && tx.blockNumber)
      .sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber))

    if (confirmedTxs.length === 0) return []

    // Group by block number
    const blockMap = new Map<bigint, TransactionMetrics[]>()
    confirmedTxs.forEach(tx => {
      if (tx.blockNumber) {
        const existing = blockMap.get(tx.blockNumber) || []
        existing.push(tx)
        blockMap.set(tx.blockNumber, existing)
      }
    })

    // Convert to chart data
    let cumulativeCount = 0
    const blocks: BlockData[] = []
    
    // Sort blocks and create data points
    const sortedBlocks = Array.from(blockMap.entries()).sort((a, b) => 
      a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
    )

    sortedBlocks.forEach(([blockNumber, txs], index) => {
      cumulativeCount += txs.length
      const successCount = txs.filter(tx => tx.status === 'confirmed').length
      const failedCount = txs.filter(tx => tx.status === 'failed').length
      
      const avgGasUsed = txs.reduce((sum, tx) => sum + Number(tx.gasUsed || 0), 0) / txs.length
      const totalGasUsed = txs.reduce((sum, tx) => sum + Number(tx.gasUsed || 0), 0)
      const avgConfirmationTime = txs
        .filter(tx => tx.confirmationTime)
        .reduce((sum, tx) => sum + (tx.confirmationTime || 0), 0) / 
        txs.filter(tx => tx.confirmationTime).length || 0

      // Calculate block time if not the first block
      let blockTime: number | undefined
      if (index > 0) {
        const prevBlock = sortedBlocks[index - 1][0]
        // Assuming ~12 second block time on mainnet, ~2 seconds on local
        const blockDiff = Number(blockNumber - prevBlock)
        blockTime = blockDiff * 12 // Approximate
      }

      blocks.push({
        blockNumber: blockNumber.toString(),
        blockNumberValue: Number(blockNumber),
        transactionCount: txs.length,
        successCount,
        failedCount,
        avgGasUsed,
        totalGasUsed,
        avgConfirmationTime,
        blockTime,
        cumulativeTransactions: cumulativeCount
      })
    })

    return blocks
  }, [transactions])

  // Calculate statistics
  const stats: BlockStats = React.useMemo(() => {
    if (blockData.length === 0) {
      return {
        totalBlocks: 0,
        avgTransactionsPerBlock: 0,
        maxTransactionsPerBlock: 0,
        minTransactionsPerBlock: 0,
        blockSpan: 0,
        avgBlockTime: 0,
        blockUtilization: 0
      }
    }

    const txCounts = blockData.map(b => b.transactionCount)
    const totalBlocks = blockData.length
    const avgTransactionsPerBlock = txCounts.reduce((sum, count) => sum + count, 0) / totalBlocks
    const maxTransactionsPerBlock = Math.max(...txCounts)
    const minTransactionsPerBlock = Math.min(...txCounts)
    
    const firstBlock = blockData[0].blockNumberValue
    const lastBlock = blockData[blockData.length - 1].blockNumberValue
    const blockSpan = lastBlock - firstBlock + 1
    
    const blockTimes = blockData.filter(b => b.blockTime).map(b => b.blockTime!)
    const avgBlockTime = blockTimes.length > 0 ? 
      blockTimes.reduce((sum, time) => sum + time, 0) / blockTimes.length : 0
    
    // Block utilization: percentage of blocks in the span that contain transactions
    const blockUtilization = (totalBlocks / blockSpan) * 100

    return {
      totalBlocks,
      avgTransactionsPerBlock,
      maxTransactionsPerBlock,
      minTransactionsPerBlock,
      blockSpan,
      avgBlockTime,
      blockUtilization
    }
  }, [blockData])

  const formatBlockNumber = (blockNumber: string) => {
    const num = parseInt(blockNumber)
    if (num > 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num > 1000) return `${(num / 1000).toFixed(1)}K`
    return blockNumber
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as BlockData
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">Block #{label}</p>
          <p className="text-blue-600 font-medium">
            Transactions: {data.transactionCount}
          </p>
          <p className="text-green-600 text-sm">
            Successful: {data.successCount}
          </p>
          {data.failedCount > 0 && (
            <p className="text-red-600 text-sm">
              Failed: {data.failedCount}
            </p>
          )}
          <p className="text-sm text-gray-600">
            Avg Gas: {Math.round(data.avgGasUsed).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            Avg Confirmation: {(data.avgConfirmationTime / 1000).toFixed(1)}s
          </p>
        </div>
      )
    }
    return null
  }

  const ScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as BlockData
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">Block #{data.blockNumber}</p>
          <p className="text-blue-600 font-medium">
            {data.transactionCount} transactions
          </p>
          <p className="text-purple-600 font-medium">
            Avg Gas: {Math.round(data.avgGasUsed).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            Total Gas: {data.totalGasUsed.toLocaleString()}
          </p>
        </div>
      )
    }
    return null
  }

  // Define colors for different transaction counts
  const getBarColor = (count: number) => {
    if (count === stats.maxTransactionsPerBlock) return '#ef4444' // red for max
    if (count >= stats.avgTransactionsPerBlock * 1.5) return '#f59e0b' // orange for high
    if (count >= stats.avgTransactionsPerBlock) return '#3b82f6' // blue for above average
    return '#10b981' // green for below average
  }

  if (blockData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Layers className="w-5 h-5 mr-2" />
            Block Distribution
          </CardTitle>
          <CardDescription>
            Transaction distribution across blocks{executionName && ` for ${executionName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Block Data</h3>
            <p>No confirmed transactions with block data available.</p>
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
            <Layers className="w-5 h-5 mr-2" />
            Block Distribution Analysis
          </CardTitle>
          <CardDescription>
            Transaction distribution across {stats.totalBlocks} blocks
            {executionName && ` for ${executionName}`}
            {` (Block #${formatBlockNumber(blockData[0].blockNumber)} - #${formatBlockNumber(blockData[blockData.length - 1].blockNumber)})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="histogram" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="histogram">
                <BarChart3 className="w-4 h-4 mr-2" />
                Histogram
              </TabsTrigger>
              <TabsTrigger value="scatter">
                <Activity className="w-4 h-4 mr-2" />
                Scatter Plot
              </TabsTrigger>
              <TabsTrigger value="cumulative">
                <Layers className="w-4 h-4 mr-2" />
                Cumulative
              </TabsTrigger>
            </TabsList>

            <TabsContent value="histogram">
              <div style={{ width: '100%', height }}>
                <ResponsiveContainer>
                  <BarChart
                    data={blockData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="blockNumber" 
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tickFormatter={formatBlockNumber}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Transaction Count', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    
                    <Bar
                      dataKey="transactionCount"
                      name="Transactions per Block"
                      radius={[4, 4, 0, 0]}
                    >
                      {blockData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getBarColor(entry.transactionCount)} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="scatter">
              <div style={{ width: '100%', height }}>
                <ResponsiveContainer>
                  <ScatterChart
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="blockNumberValue"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatBlockNumber}
                      label={{ value: 'Block Number', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      dataKey="avgGasUsed"
                      type="number"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Average Gas Used', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip content={<ScatterTooltip />} />
                    <Legend />
                    
                    <Scatter
                      name="Block Gas Usage"
                      data={blockData}
                      fill="#8b5cf6"
                    >
                      {blockData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.transactionCount > stats.avgTransactionsPerBlock ? '#ef4444' : '#8b5cf6'} 
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="cumulative">
              <div style={{ width: '100%', height }}>
                <ResponsiveContainer>
                  <ComposedChart
                    data={blockData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="blockNumber" 
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tickFormatter={formatBlockNumber}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Transactions per Block', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Cumulative Transactions', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    
                    <Bar
                      yAxisId="left"
                      dataKey="transactionCount"
                      fill="#3b82f6"
                      name="Per Block"
                      radius={[4, 4, 0, 0]}
                    />
                    
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulativeTransactions"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Cumulative"
                    />
                  </ComposedChart>
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
                {stats.totalBlocks}
              </div>
              <div className="text-sm text-muted-foreground">Total Blocks</div>
              <div className="text-xs text-muted-foreground">
                Span: {stats.blockSpan} blocks
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.avgTransactionsPerBlock.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Avg TX/Block</div>
              <div className="text-xs text-muted-foreground">
                Max: {stats.maxTransactionsPerBlock}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.blockUtilization.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Block Utilization</div>
              <div className="text-xs text-muted-foreground">
                Blocks with TXs
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.avgBlockTime.toFixed(0)}s
              </div>
              <div className="text-sm text-muted-foreground">Avg Block Time</div>
              <div className="text-xs text-muted-foreground">
                (Estimated)
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Distribution Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribution Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-sm font-medium">Light Load</span>
                <span className="text-sm text-gray-500">(&lt; avg)</span>
              </div>
              <span className="text-sm font-semibold">
                {blockData.filter(b => b.transactionCount < stats.avgTransactionsPerBlock).length} blocks
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="text-sm font-medium">Normal Load</span>
                <span className="text-sm text-gray-500">(≈ avg)</span>
              </div>
              <span className="text-sm font-semibold">
                {blockData.filter(b => 
                  b.transactionCount >= stats.avgTransactionsPerBlock && 
                  b.transactionCount < stats.avgTransactionsPerBlock * 1.5
                ).length} blocks
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded bg-orange-500"></div>
                <span className="text-sm font-medium">High Load</span>
                <span className="text-sm text-gray-500">(&gt; 1.5x avg)</span>
              </div>
              <span className="text-sm font-semibold">
                {blockData.filter(b => 
                  b.transactionCount >= stats.avgTransactionsPerBlock * 1.5 &&
                  b.transactionCount < stats.maxTransactionsPerBlock
                ).length} blocks
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span className="text-sm font-medium">Peak Load</span>
                <span className="text-sm text-gray-500">(max)</span>
              </div>
              <span className="text-sm font-semibold">
                {blockData.filter(b => b.transactionCount === stats.maxTransactionsPerBlock).length} blocks
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}