'use client'

import { useState, useEffect } from 'react'
import { Activity, AlertTriangle, CheckCircle, Clock, Gauge, TrendingUp, TrendingDown, Wifi, AlertCircle, Bell, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentChain } from '@/services/blockchain/connection'
import { networkMonitorService, NetworkStatus, NetworkAlert, NetworkHealth, GasPriceHistory } from '@/services/blockchain/networkMonitor'
import { formatDistanceToNow } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface NetworkMonitorProps {
  autoStart?: boolean
}

export function NetworkMonitor({ autoStart = true }: NetworkMonitorProps) {
  const chainId = useCurrentChain()
  const [status, setStatus] = useState<NetworkStatus | null>(null)
  const [alerts, setAlerts] = useState<NetworkAlert[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => {
    if (autoStart && chainId) {
      startMonitoring()
    }

    return () => {
      if (chainId) {
        networkMonitorService.stopMonitoring(chainId)
      }
    }
  }, [chainId, autoStart])

  useEffect(() => {
    if (!chainId) return

    // Subscribe to network status updates
    const unsubscribe = networkMonitorService.subscribe(`monitor-${chainId}`, (networkStatus) => {
      if (networkStatus.chainId === chainId) {
        setStatus(networkStatus)
      }
    })

    // Subscribe to alerts
    const handleAlert = (event: CustomEvent) => {
      const alert = event.detail as NetworkAlert
      if (alert.chainId === chainId) {
        setAlerts(prev => [alert, ...prev.slice(0, 9)]) // Keep only 10 latest
      }
    }

    window.addEventListener('network:alert', handleAlert as EventListener)
    
    // Initial data load
    const currentStatus = networkMonitorService.getNetworkStatus(chainId)
    if (currentStatus) {
      setStatus(currentStatus)
    }
    setAlerts(networkMonitorService.getAlerts(chainId).slice(0, 10))

    return () => {
      unsubscribe()
      window.removeEventListener('network:alert', handleAlert as EventListener)
    }
  }, [chainId])

  const startMonitoring = () => {
    if (!chainId) return
    networkMonitorService.startMonitoring(chainId)
    setIsMonitoring(true)
  }

  const stopMonitoring = () => {
    if (!chainId) return
    networkMonitorService.stopMonitoring(chainId)
    setIsMonitoring(false)
  }

  const acknowledgeAlert = (alertId: string) => {
    networkMonitorService.acknowledgeAlert(alertId)
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ))
  }

  const clearAllAlerts = () => {
    if (!chainId) return
    networkMonitorService.clearAlerts(chainId)
    setAlerts([])
  }

  const getHealthColor = (health: NetworkHealth): string => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200'
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'poor': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getHealthIcon = (health: NetworkHealth) => {
    switch (health) {
      case 'excellent': return <CheckCircle className="w-4 h-4" />
      case 'good': return <CheckCircle className="w-4 h-4" />
      case 'fair': return <AlertTriangle className="w-4 h-4" />
      case 'poor': return <AlertTriangle className="w-4 h-4" />
      case 'critical': return <AlertCircle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const formatGasPrice = (gasPrice: bigint): string => {
    return `${(Number(gasPrice) / 1e9).toFixed(2)} Gwei`
  }

  const formatBlockTime = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) * 1000)
    return formatDistanceToNow(date, { addSuffix: true })
  }

  const prepareGasChartData = (history: GasPriceHistory[]) => {
    return history.slice(-20).map((entry, index) => ({
      time: index,
      gasPrice: Number(entry.gasPrice) / 1e9,
      utilization: entry.utilization,
      timestamp: entry.timestamp.toISOString()
    }))
  }

  if (!chainId) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No chain selected. Please connect to a network to monitor.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Network Monitor
                {status && (
                  <Badge className={getHealthColor(status.health)}>
                    {getHealthIcon(status.health)}
                    <span className="ml-1 capitalize">{status.health}</span>
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Real-time network performance and health monitoring
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isMonitoring ? 'default' : 'secondary'}>
                <Wifi className="w-3 h-3 mr-1" />
                {isMonitoring ? 'Monitoring' : 'Stopped'}
              </Badge>
              <Button
                size="sm"
                variant={isMonitoring ? 'outline' : 'default'}
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
              >
                {isMonitoring ? 'Stop' : 'Start'} Monitor
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Block</p>
                  <p className="text-2xl font-bold">#{status.currentBlock.number.toString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBlockTime(status.currentBlock.timestamp)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gas Price</p>
                  <p className="text-2xl font-bold">{formatGasPrice(status.gasPrice.current)}</p>
                  <div className="flex gap-1 text-xs">
                    <span className="text-green-600">S: {formatGasPrice(status.gasPrice.slow)}</span>
                    <span className="text-red-600">F: {formatGasPrice(status.gasPrice.fast)}</span>
                  </div>
                </div>
                <Gauge className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Block Utilization</p>
                  <p className="text-2xl font-bold">
                    {((Number(status.currentBlock.gasUsed) / Number(status.currentBlock.gasLimit)) * 100).toFixed(1)}%
                  </p>
                  <Progress 
                    value={(Number(status.currentBlock.gasUsed) / Number(status.currentBlock.gasLimit)) * 100}
                    className="w-full h-2 mt-1"
                  />
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Network Latency</p>
                  <p className="text-2xl font-bold">{status.performance.latency}ms</p>
                  <p className="text-xs text-muted-foreground">
                    TPS: {status.performance.tps.toFixed(1)}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Monitoring */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gas-trends">Gas Trends</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {status ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Network Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Connection Status</span>
                    <Badge variant={status.isConnected ? 'default' : 'destructive'}>
                      {status.isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Chain ID</span>
                    <span className="text-sm font-medium">{status.chainId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Block Time</span>
                    <span className="text-sm font-medium">{status.performance.blockTime.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Updated</span>
                    <span className="text-sm font-medium">
                      {formatDistanceToNow(status.lastUpdated, { addSuffix: true })}
                    </span>
                  </div>
                  {status.baseFeePerGas && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Base Fee</span>
                      <span className="text-sm font-medium">
                        {formatGasPrice(status.currentBlock.baseFeePerGas!)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Block Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Gas Limit</span>
                    <span className="text-sm font-medium">{status.currentBlock.gasLimit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Gas Used</span>
                    <span className="text-sm font-medium">{status.currentBlock.gasUsed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Utilization</span>
                    <span className="text-sm font-medium">
                      {((Number(status.currentBlock.gasUsed) / Number(status.currentBlock.gasLimit)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  {status.mempool && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pending Txs</span>
                      <span className="text-sm font-medium">{status.mempool.pendingTransactions}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Network Data</h3>
                <p className="text-muted-foreground mb-4">
                  Start monitoring to see network status
                </p>
                <Button onClick={startMonitoring}>Start Monitoring</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="gas-trends" className="space-y-4">
          {status && status.gasPrice.history.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Gas Price Trends</CardTitle>
                <CardDescription>
                  Gas price and block utilization over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prepareGasChartData(status.gasPrice.history)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis yAxisId="gas" orientation="left" />
                      <YAxis yAxisId="util" orientation="right" />
                      <Tooltip 
                        labelFormatter={(value) => `Sample ${value}`}
                        formatter={(value: any, name: string) => [
                          name === 'gasPrice' ? `${Number(value).toFixed(2)} Gwei` : `${Number(value).toFixed(1)}%`,
                          name === 'gasPrice' ? 'Gas Price' : 'Utilization'
                        ]}
                      />
                      <Line 
                        yAxisId="gas"
                        type="monotone" 
                        dataKey="gasPrice" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="gasPrice"
                      />
                      <Line 
                        yAxisId="util"
                        type="monotone" 
                        dataKey="utilization" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="utilization"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Gas Price Data</h3>
                <p className="text-muted-foreground">
                  Gas price trends will appear here after monitoring starts
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Network Alerts</h3>
            {alerts.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAllAlerts}>
                Clear All
              </Button>
            )}
          </div>

          {alerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Active Alerts</h3>
                <p className="text-muted-foreground">
                  Network alerts will appear here when issues are detected
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <Alert key={alert.id} className={
                  alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
                  alert.severity === 'high' ? 'border-orange-200 bg-orange-50' :
                  alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }>
                  <AlertTriangle className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium">{alert.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {alert.severity}
                        </Badge>
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <AlertDescription className="text-sm">
                      {alert.message}
                    </AlertDescription>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {status ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Block Time</span>
                    <span className="text-sm font-medium">{status.performance.blockTime.toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Network Latency</span>
                    <span className="text-sm font-medium">{status.performance.latency}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Throughput (TPS)</span>
                    <span className="text-sm font-medium">{status.performance.tps.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Health Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    {getHealthIcon(status.health)}
                    <span className="capitalize font-medium">{status.health}</span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {status.health === 'excellent' && (
                      <p>All network metrics are performing optimally.</p>
                    )}
                    {status.health === 'good' && (
                      <p>Network is performing well with minor variations.</p>
                    )}
                    {status.health === 'fair' && (
                      <p>Network performance is acceptable but could be improved.</p>
                    )}
                    {status.health === 'poor' && (
                      <p>Network is experiencing performance issues that may affect operations.</p>
                    )}
                    {status.health === 'critical' && (
                      <p>Network has serious performance problems requiring attention.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Gauge className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Performance Data</h3>
                <p className="text-muted-foreground">
                  Performance metrics will appear here after monitoring starts
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}