'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Play, 
  Pause, 
  Square, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Zap,
  Filter,
  Search,
  Download,
  RefreshCw
} from 'lucide-react'
import type { 
  TestExecution, 
  TestTransaction, 
  TestError,
  AccountInfo 
} from '@/types/testing'
import { formatEther } from 'viem'

interface TestProgressProps {
  execution: TestExecution | null
  transactions: TestTransaction[]
  errors: TestError[]
  accounts: AccountInfo[]
  onPause?: () => void
  onResume?: () => void
  onStop?: () => void
  onRetry?: () => void
}

interface TransactionLogProps {
  transactions: TestTransaction[]
  errors: TestError[]
  onFilterChange?: (filters: LogFilters) => void
}

interface LogFilters {
  status: 'all' | 'pending' | 'confirmed' | 'failed'
  account: string
  timeRange: '1m' | '5m' | '15m' | 'all'
}

export function TestProgress({ 
  execution, 
  transactions, 
  errors, 
  accounts,
  onPause, 
  onResume, 
  onStop,
  onRetry 
}: TestProgressProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  if (!execution) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No active test execution</p>
        </CardContent>
      </Card>
    )
  }

  const progress = execution.totalIterations > 0 
    ? (execution.currentIteration / execution.totalIterations) * 100 
    : 0

  const successRate = (execution.successCount + execution.failureCount) > 0
    ? (execution.successCount / (execution.successCount + execution.failureCount)) * 100
    : 0

  const elapsedTime = execution.startTime 
    ? (execution.endTime || new Date()).getTime() - execution.startTime.getTime()
    : 0

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`
  }

  const getStatusColor = (status: TestExecution['status']) => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'completed': return 'bg-blue-500'
      case 'failed': return 'bg-red-500'
      case 'cancelled': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>{execution.name}</span>
              <Badge 
                variant="secondary" 
                className={`${getStatusColor(execution.status)} text-white`}
              >
                {execution.status.toUpperCase()}
              </Badge>
            </CardTitle>
            
            <div className="flex space-x-2">
              {execution.status === 'running' && (
                <Button size="sm" variant="outline" onClick={onPause}>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
              
              {execution.status === 'paused' && (
                <Button size="sm" variant="outline" onClick={onResume}>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              
              {(execution.status === 'running' || execution.status === 'paused') && (
                <Button size="sm" variant="destructive" onClick={onStop}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}
              
              {execution.status === 'failed' && (
                <Button size="sm" variant="default" onClick={onRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}

              <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress: {execution.currentIteration} / {execution.totalIterations}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-sm font-medium text-green-600">Success</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{execution.successCount}</div>
              <div className="text-xs text-green-600">{Math.round(successRate)}% rate</div>
            </div>

            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <XCircle className="w-4 h-4 text-red-600 mr-1" />
                <span className="text-sm font-medium text-red-600">Failed</span>
              </div>
              <div className="text-2xl font-bold text-red-700">{execution.failureCount}</div>
              <div className="text-xs text-red-600">{errors.length} errors</div>
            </div>

            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Clock className="w-4 h-4 text-blue-600 mr-1" />
                <span className="text-sm font-medium text-blue-600">Duration</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{formatDuration(elapsedTime)}</div>
              <div className="text-xs text-blue-600">
                {execution.transactionsPerSecond ? 
                  `${execution.transactionsPerSecond.toFixed(1)} tx/s` : 
                  'Calculating...'}
              </div>
            </div>

            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Zap className="w-4 h-4 text-purple-600 mr-1" />
                <span className="text-sm font-medium text-purple-600">Gas</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {execution.avgGasUsed ? 
                  `${(Number(execution.avgGasUsed) / 1000).toFixed(0)}k` : 
                  '---'}
              </div>
              <div className="text-xs text-purple-600">
                {execution.totalCost ? 
                  `${formatEther(execution.totalCost).slice(0, 6)} ETH` : 
                  'Calculating...'}
              </div>
            </div>
          </div>

          {/* Configuration Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-sm">
              <span className="text-muted-foreground">Mode:</span>
              <span className="ml-2 font-medium capitalize">{execution.config.mode}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Accounts:</span>
              <span className="ml-2 font-medium">{accounts.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Network:</span>
              <span className="ml-2 font-medium capitalize">{execution.config.network}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Log */}
      <TransactionLog 
        transactions={transactions} 
        errors={errors}
      />
    </div>
  )
}

function TransactionLog({ transactions, errors }: TransactionLogProps) {
  const [filters, setFilters] = useState<LogFilters>({
    status: 'all',
    account: '',
    timeRange: 'all'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Combine transactions and errors for unified timeline
  const combinedLogs = React.useMemo(() => {
    const logs: Array<{
      id: string
      timestamp: Date
      type: 'transaction' | 'error'
      status: string
      account?: string
      txHash?: string
      error?: string
      data: TestTransaction | TestError
    }> = []

    // Add transactions
    transactions.forEach(tx => {
      logs.push({
        id: tx.id,
        timestamp: tx.timestamp,
        type: 'transaction',
        status: tx.status,
        account: tx.account,
        txHash: tx.txHash,
        data: tx
      })
    })

    // Add errors
    errors.forEach(error => {
      logs.push({
        id: error.id,
        timestamp: error.timestamp,
        type: 'error',
        status: 'failed',
        account: error.account,
        txHash: error.txHash,
        error: error.error,
        data: error
      })
    })

    // Sort by timestamp (newest first)
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [transactions, errors])

  // Apply filters
  const filteredLogs = React.useMemo(() => {
    return combinedLogs.filter(log => {
      // Status filter
      if (filters.status !== 'all' && log.status !== filters.status) {
        return false
      }

      // Account filter
      if (filters.account && log.account !== filters.account) {
        return false
      }

      // Time range filter
      if (filters.timeRange !== 'all') {
        const now = new Date().getTime()
        const logTime = log.timestamp.getTime()
        const minutes = {
          '1m': 1,
          '5m': 5,
          '15m': 15
        }[filters.timeRange] || 0
        
        if (now - logTime > minutes * 60 * 1000) {
          return false
        }
      }

      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesHash = log.txHash?.toLowerCase().includes(searchLower)
        const matchesAccount = log.account?.toLowerCase().includes(searchLower)
        const matchesError = log.error?.toLowerCase().includes(searchLower)
        
        if (!matchesHash && !matchesAccount && !matchesError) {
          return false
        }
      }

      return true
    })
  }, [combinedLogs, filters, searchTerm])

  const getStatusIcon = (status: string, type: 'transaction' | 'error') => {
    if (type === 'error') return <XCircle className="w-4 h-4 text-red-500" />
    
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const exportLogs = () => {
    const csv = filteredLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      type: log.type,
      status: log.status,
      account: log.account || '',
      txHash: log.txHash || '',
      error: log.error || ''
    }))
    
    const blob = new Blob([JSON.stringify(csv, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-logs-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Transaction Log</span>
            <Badge variant="secondary">{filteredLogs.length} entries</Badge>
          </CardTitle>
          
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button size="sm" variant="outline" onClick={exportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value as LogFilters['status']})}
                className="w-full p-2 border rounded"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <select 
                value={filters.timeRange}
                onChange={(e) => setFilters({...filters, timeRange: e.target.value as LogFilters['timeRange']})}
                className="w-full p-2 border rounded"
              >
                <option value="all">All Time</option>
                <option value="1m">Last 1 minute</option>
                <option value="5m">Last 5 minutes</option>
                <option value="15m">Last 15 minutes</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by hash, account, or error..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 p-2 border rounded"
                />
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions match the current filters
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={log.id} className="flex items-center space-x-3 p-3 border rounded hover:bg-muted/50">
                <div className="flex-shrink-0">
                  {getStatusIcon(log.status, log.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {log.type === 'transaction' ? 'Transaction' : 'Error'}
                      {log.account && (
                        <span className="text-muted-foreground ml-2">
                          {log.account.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground truncate">
                    {log.txHash ? (
                      <span>Hash: {log.txHash.slice(0, 16)}...</span>
                    ) : log.error ? (
                      <span className="text-red-600">{log.error.slice(0, 80)}...</span>
                    ) : (
                      <span>Processing...</span>
                    )}
                  </div>
                </div>

                <Badge 
                  variant={
                    log.status === 'confirmed' ? 'default' :
                    log.status === 'pending' ? 'secondary' :
                    'destructive'
                  }
                  className="flex-shrink-0"
                >
                  {log.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}