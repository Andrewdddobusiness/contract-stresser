'use client'

import { useState, useEffect } from 'react'
import { Metadata } from 'next'
import { 
  BarChart3, 
  Activity, 
  Zap, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  Download,
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { testMetricsService, type ExecutionMetrics, type HistoricalMetrics } from '@/services/analytics/metrics'
import { formatDistanceToNow } from 'date-fns'

interface DashboardStats {
  totalTests: number
  totalTransactions: number
  avgTPS: number
  avgGasUsed: bigint
  avgSuccessRate: number
  avgConfirmationTime: number
  totalGasCost: bigint
  recentTests: ExecutionMetrics[]
}

interface ComparisonData {
  current: ExecutionMetrics | null
  previous: ExecutionMetrics | null
  improvement: {
    tps: number
    gasEfficiency: number
    successRate: number
    confirmationTime: number
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTests: 0,
    totalTransactions: 0,
    avgTPS: 0,
    avgGasUsed: BigInt(0),
    avgSuccessRate: 0,
    avgConfirmationTime: 0,
    totalGasCost: BigInt(0),
    recentTests: []
  })
  
  const [historicalData, setHistoricalData] = useState<HistoricalMetrics[]>([])
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const [selectedNetwork, setSelectedNetwork] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [selectedTimeRange, selectedNetwork])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Calculate time range
      const now = new Date()
      const timeRanges = {
        '1d': new Date(now.getTime() - 24 * 60 * 60 * 1000),
        '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      }

      const startDate = timeRanges[selectedTimeRange as keyof typeof timeRanges] || timeRanges['7d']
      
      // Get historical metrics with filtering
      const filter = {
        startDate,
        endDate: now,
        ...(selectedNetwork !== 'all' && { network: selectedNetwork })
      }
      
      const historical = testMetricsService.getHistoricalMetrics(filter)
      setHistoricalData(historical)

      // Calculate dashboard statistics
      if (historical.length > 0) {
        const totalTests = historical.length
        const totalTransactions = historical.reduce((sum, h) => sum + h.metrics.totalTransactions, 0)
        const avgTPS = historical.reduce((sum, h) => sum + h.metrics.transactionsPerSecond, 0) / totalTests
        const totalGasUsed = historical.reduce((sum, h) => sum + h.metrics.totalGasUsed, BigInt(0))
        const avgGasUsed = totalTests > 0 ? totalGasUsed / BigInt(totalTests) : BigInt(0)
        const avgSuccessRate = historical.reduce((sum, h) => sum + h.metrics.successRate, 0) / totalTests
        const avgConfirmationTime = historical.reduce((sum, h) => sum + h.metrics.averageConfirmationTime, 0) / totalTests
        const totalGasCost = historical.reduce((sum, h) => sum + h.metrics.totalGasCost, BigInt(0))
        
        // Get recent tests (last 5)
        const recentTests = historical
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 5)
          .map(h => h.metrics)

        setStats({
          totalTests,
          totalTransactions,
          avgTPS,
          avgGasUsed,
          avgSuccessRate,
          avgConfirmationTime,
          totalGasCost,
          recentTests
        })

        // Calculate comparison data
        if (historical.length >= 2) {
          const sorted = historical.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          const current = sorted[0].metrics
          const previous = sorted[1].metrics
          
          const improvement = {
            tps: current.transactionsPerSecond > 0 && previous.transactionsPerSecond > 0 
              ? ((current.transactionsPerSecond - previous.transactionsPerSecond) / previous.transactionsPerSecond) * 100
              : 0,
            gasEfficiency: current.gasEfficiency > 0 && previous.gasEfficiency > 0
              ? ((current.gasEfficiency - previous.gasEfficiency) / previous.gasEfficiency) * 100
              : 0,
            successRate: previous.successRate > 0
              ? ((current.successRate - previous.successRate) / previous.successRate) * 100
              : 0,
            confirmationTime: previous.averageConfirmationTime > 0
              ? ((previous.averageConfirmationTime - current.averageConfirmationTime) / previous.averageConfirmationTime) * 100
              : 0
          }

          setComparisonData({ current, previous, improvement })
        }
      } else {
        // Reset to empty state
        setStats({
          totalTests: 0,
          totalTransactions: 0,
          avgTPS: 0,
          avgGasUsed: BigInt(0),
          avgSuccessRate: 0,
          avgConfirmationTime: 0,
          totalGasCost: BigInt(0),
          recentTests: []
        })
        setComparisonData(null)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    try {
      const executionIds = historicalData.map(h => h.executionId)
      const csvData = testMetricsService.exportMetrics(executionIds, 'csv')
      
      const blob = new Blob([csvData], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dashboard-metrics-${selectedTimeRange}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export data:', error)
    }
  }

  const formatGas = (gas: bigint) => {
    const gasNum = Number(gas)
    if (gasNum === 0) return '--'
    if (gasNum > 1000000) return `${(gasNum / 1000000).toFixed(1)}M`
    if (gasNum > 1000) return `${(gasNum / 1000).toFixed(1)}K`
    return gasNum.toString()
  }

  const formatEther = (wei: bigint) => {
    if (wei === BigInt(0)) return '--'
    const ether = Number(wei) / 1e18
    if (ether < 0.0001) return `${(ether * 1e6).toFixed(2)} μΞ`
    if (ether < 0.1) return `${(ether * 1000).toFixed(2)} mΞ`
    return `${ether.toFixed(4)} Ξ`
  }

  const getStatusColor = (successRate: number) => {
    if (successRate >= 95) return 'text-green-600'
    if (successRate >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = (value: number) => {
    if (value > 5) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (value < -5) return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
    return <div className="w-4 h-4" />
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and testing overview
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last Day</SelectItem>
              <SelectItem value="7d">Last Week</SelectItem>
              <SelectItem value="30d">Last Month</SelectItem>
              <SelectItem value="90d">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Networks</SelectItem>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="sepolia">Sepolia</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="history">Test History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTests.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalTransactions.toLocaleString()} total transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average TPS</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.avgTPS > 0 ? stats.avgTPS.toFixed(2) : '--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Transactions per second
                </p>
                {comparisonData && (
                  <div className="flex items-center mt-1">
                    {getTrendIcon(comparisonData.improvement.tps)}
                    <span className="text-xs text-muted-foreground ml-1">
                      {comparisonData.improvement.tps > 0 ? '+' : ''}{comparisonData.improvement.tps.toFixed(1)}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Gas</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatGas(stats.avgGasUsed)}</div>
                <p className="text-xs text-muted-foreground">
                  Per transaction
                </p>
                {comparisonData && (
                  <div className="flex items-center mt-1">
                    {getTrendIcon(-comparisonData.improvement.gasEfficiency)}
                    <span className="text-xs text-muted-foreground ml-1">
                      {comparisonData.improvement.gasEfficiency > 0 ? '+' : ''}{comparisonData.improvement.gasEfficiency.toFixed(1)}% efficiency
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getStatusColor(stats.avgSuccessRate)}`}>
                  {stats.avgSuccessRate > 0 ? `${stats.avgSuccessRate.toFixed(1)}%` : '--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Transaction success rate
                </p>
                {comparisonData && (
                  <div className="flex items-center mt-1">
                    {getTrendIcon(comparisonData.improvement.successRate)}
                    <span className="text-xs text-muted-foreground ml-1">
                      {comparisonData.improvement.successRate > 0 ? '+' : ''}{comparisonData.improvement.successRate.toFixed(1)}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Average Confirmation Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats.avgConfirmationTime > 0 ? `${(stats.avgConfirmationTime / 1000).toFixed(1)}s` : '--'}
                </div>
                {comparisonData && (
                  <div className="flex items-center mt-2">
                    {getTrendIcon(comparisonData.improvement.confirmationTime)}
                    <span className="text-sm text-muted-foreground ml-1">
                      {comparisonData.improvement.confirmationTime > 0 ? '+' : ''}{comparisonData.improvement.confirmationTime.toFixed(1)}% faster
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Total Gas Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatEther(stats.totalGasCost)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Across all tests in timeframe
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {comparisonData && comparisonData.current && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Latest Test Performance</CardTitle>
                  <CardDescription>Most recent test execution results</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Transactions Per Second</span>
                    <span className="font-bold">{comparisonData.current.transactionsPerSecond.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className={`font-bold ${getStatusColor(comparisonData.current.successRate)}`}>
                      {comparisonData.current.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Gas Efficiency</span>
                    <span className="font-bold">{(comparisonData.current.gasEfficiency * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Avg Confirmation</span>
                    <span className="font-bold">{(comparisonData.current.averageConfirmationTime / 1000).toFixed(1)}s</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                  <CardDescription>Compared to previous test execution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">TPS Change</span>
                    <div className="flex items-center">
                      {getTrendIcon(comparisonData.improvement.tps)}
                      <span className="font-bold ml-2">
                        {comparisonData.improvement.tps > 0 ? '+' : ''}{comparisonData.improvement.tps.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Success Rate Change</span>
                    <div className="flex items-center">
                      {getTrendIcon(comparisonData.improvement.successRate)}
                      <span className="font-bold ml-2">
                        {comparisonData.improvement.successRate > 0 ? '+' : ''}{comparisonData.improvement.successRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Gas Efficiency</span>
                    <div className="flex items-center">
                      {getTrendIcon(comparisonData.improvement.gasEfficiency)}
                      <span className="font-bold ml-2">
                        {comparisonData.improvement.gasEfficiency > 0 ? '+' : ''}{comparisonData.improvement.gasEfficiency.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Speed Improvement</span>
                    <div className="flex items-center">
                      {getTrendIcon(comparisonData.improvement.confirmationTime)}
                      <span className="font-bold ml-2">
                        {comparisonData.improvement.confirmationTime > 0 ? '+' : ''}{comparisonData.improvement.confirmationTime.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Executions</CardTitle>
              <CardDescription>
                Latest {stats.recentTests.length} test runs in selected timeframe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentTests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Test Data</h3>
                  <p>No tests have been run in the selected timeframe.</p>
                  <p className="text-sm mt-2">Run some stress tests to see analytics here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentTests.map((test) => (
                    <div
                      key={test.executionId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="font-semibold">{test.name}</div>
                          <Badge variant="outline" className="text-xs">
                            {test.config.network}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {test.config.mode}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {test.config.iterations.toLocaleString()} iterations • 
                          {test.config.functionName} • 
                          {formatDistanceToNow(test.startTime)} ago
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-center">
                          <div className="font-semibold">{test.transactionsPerSecond.toFixed(1)}</div>
                          <div className="text-muted-foreground">TPS</div>
                        </div>
                        <div className="text-center">
                          <div className={`font-semibold ${getStatusColor(test.successRate)}`}>
                            {test.successRate.toFixed(1)}%
                          </div>
                          <div className="text-muted-foreground">Success</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{formatGas(test.averageGasUsed)}</div>
                          <div className="text-muted-foreground">Avg Gas</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{(test.averageConfirmationTime / 1000).toFixed(1)}s</div>
                          <div className="text-muted-foreground">Confirm</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}