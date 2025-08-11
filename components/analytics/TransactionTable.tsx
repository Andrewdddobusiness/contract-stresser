'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock,
  ExternalLink,
  Download,
  RefreshCw
} from 'lucide-react'
import type { TransactionMetrics } from '@/services/analytics/metrics'
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions'
import { TransactionExportService } from '@/services/analytics/export'

interface TransactionTableProps {
  transactions?: TransactionMetrics[]
  fetchTransactions?: () => Promise<TransactionMetrics[]>
  onTransactionClick?: (transaction: TransactionMetrics) => void
  onExport?: (format: 'csv' | 'json') => void
  refreshing?: boolean
  onRefresh?: () => void
  height?: number
  pageSize?: number
  realtime?: boolean
  pollingInterval?: number
}

type SortField = keyof TransactionMetrics | 'confirmationTime' | 'gasEfficiency'
type SortDirection = 'asc' | 'desc'

interface FilterState {
  search: string
  status: string
  gasRange: string
  timeRange: string
}

export function TransactionTable({
  transactions: initialTransactions = [],
  fetchTransactions,
  onTransactionClick,
  onExport,
  refreshing = false,
  onRefresh,
  height = 600,
  pageSize = 50,
  realtime = false,
  pollingInterval = 2000
}: TransactionTableProps) {
  const [sortField, setSortField] = useState<SortField>('iteration')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    gasRange: 'all',
    timeRange: 'all'
  })

  // Real-time transaction fetching
  const [realtimeState, realtimeActions] = useRealtimeTransactions(
    fetchTransactions || (() => Promise.resolve(initialTransactions)),
    {
      pollingInterval,
      enabled: realtime && !!fetchTransactions,
      onError: (error) => console.error('Real-time transaction error:', error)
    }
  )

  // Use real-time transactions if enabled, otherwise use initial transactions
  const transactions = realtime && fetchTransactions ? realtimeState.transactions : initialTransactions

  // Handle export functionality
  const handleExport = (format: 'csv' | 'json') => {
    if (onExport) {
      onExport(format)
      return
    }

    // Default export implementation
    try {
      const exportResult = format === 'csv' 
        ? TransactionExportService.exportToCSV(processedTransactions)
        : TransactionExportService.exportToJSON(processedTransactions)
      
      TransactionExportService.downloadExport(exportResult)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Handle refresh
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    } else if (realtime && fetchTransactions) {
      realtimeActions.refresh()
    }
  }

  // Determine if we're currently refreshing
  const isRefreshing = refreshing || realtimeState.isPolling

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, sortField, sortDirection])

  // Sort and filter transactions
  const processedTransactions = useMemo(() => {
    let filtered = [...transactions]

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(tx => 
        tx.hash?.toLowerCase().includes(searchLower) ||
        tx.error?.toLowerCase().includes(searchLower) ||
        tx.iteration.toString().includes(searchLower)
      )
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(tx => tx.status === filters.status)
    }

    if (filters.gasRange !== 'all') {
      const gasUsed = filtered.map(tx => Number(tx.gasUsed || 0)).filter(g => g > 0)
      if (gasUsed.length > 0) {
        const minGas = Math.min(...gasUsed)
        const maxGas = Math.max(...gasUsed)
        const range = maxGas - minGas

        filtered = filtered.filter(tx => {
          const gas = Number(tx.gasUsed || 0)
          switch (filters.gasRange) {
            case 'low': return gas <= minGas + range * 0.33
            case 'medium': return gas > minGas + range * 0.33 && gas <= minGas + range * 0.67
            case 'high': return gas > minGas + range * 0.67
            default: return true
          }
        })
      }
    }

    if (filters.timeRange !== 'all') {
      const now = new Date()
      const cutoff = new Date()
      switch (filters.timeRange) {
        case '1h': cutoff.setHours(now.getHours() - 1); break
        case '6h': cutoff.setHours(now.getHours() - 6); break
        case '24h': cutoff.setDate(now.getDate() - 1); break
        case '7d': cutoff.setDate(now.getDate() - 7); break
      }
      if (filters.timeRange !== 'all') {
        filtered = filtered.filter(tx => tx.startTime >= cutoff)
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'confirmationTime':
          aValue = a.confirmationTime || 0
          bValue = b.confirmationTime || 0
          break
        case 'gasEfficiency':
          aValue = a.gasEfficiency || 0
          bValue = b.gasEfficiency || 0
          break
        default:
          aValue = a[sortField]
          bValue = b[sortField]
      }

      if (aValue === bValue) return 0
      
      const comparison = aValue < bValue ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [transactions, filters, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(processedTransactions.length / pageSize)
  const paginatedTransactions = processedTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />
      default: return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      confirmed: 'default',
      failed: 'destructive',
      pending: 'secondary'
    }
    return (
      <Badge variant={variants[status] || 'secondary'} className="capitalize">
        {status}
      </Badge>
    )
  }

  const formatHash = (hash?: string) => {
    if (!hash) return 'N/A'
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  const formatGas = (gas?: bigint | number) => {
    if (!gas) return 'N/A'
    const gasNumber = typeof gas === 'bigint' ? Number(gas) : gas
    if (gasNumber > 1000000) return `${(gasNumber / 1000000).toFixed(1)}M`
    if (gasNumber > 1000) return `${(gasNumber / 1000).toFixed(0)}k`
    return gasNumber.toLocaleString()
  }

  const formatTime = (time?: number) => {
    if (!time) return 'N/A'
    if (time < 1000) return `${time}ms`
    return `${(time / 1000).toFixed(1)}s`
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString()
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-1 hover:bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span className="text-xs font-semibold">{children}</span>
        {sortField === field && (
          sortDirection === 'asc' ? 
            <ChevronUp className="w-3 h-3" /> : 
            <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </Button>
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Transaction Table
                {refreshing && <RefreshCw className="w-4 h-4 ml-2 animate-spin text-blue-500" />}
              </CardTitle>
              <CardDescription>
                {processedTransactions.length.toLocaleString()} of {transactions.length.toLocaleString()} transactions
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              {realtime && (
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    realtimeState.connectionStatus === 'connected' ? 'bg-green-500' :
                    realtimeState.connectionStatus === 'connecting' ? 'bg-yellow-500' :
                    realtimeState.connectionStatus === 'error' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`} />
                  <span className="capitalize text-gray-600">
                    {realtimeState.connectionStatus}
                  </span>
                  {realtimeState.lastUpdate && (
                    <span className="text-xs text-gray-400">
                      Updated {realtimeState.lastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}
              
              {(onRefresh || (realtime && fetchTransactions)) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
              
              <Select onValueChange={handleExport}>
                <SelectTrigger className="w-32">
                  <Download className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent className="!bg-white">
                  <SelectItem value="csv">Export CSV</SelectItem>
                  <SelectItem value="json">Export JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search hash, error, iteration..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="!bg-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="!bg-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.gasRange}
              onValueChange={(value) => setFilters({ ...filters, gasRange: value })}
            >
              <SelectTrigger className="!bg-white">
                <SelectValue placeholder="Gas Range" />
              </SelectTrigger>
              <SelectContent className="!bg-white">
                <SelectItem value="all">All Gas Ranges</SelectItem>
                <SelectItem value="low">Low (0-33%)</SelectItem>
                <SelectItem value="medium">Medium (33-67%)</SelectItem>
                <SelectItem value="high">High (67-100%)</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.timeRange}
              onValueChange={(value) => setFilters({ ...filters, timeRange: value })}
            >
              <SelectTrigger className="!bg-white">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent className="!bg-white">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <div style={{ height, overflowY: 'auto' }}>
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50 z-10">
                  <TableRow>
                    <TableHead className="w-16">
                      <SortButton field="iteration">#</SortButton>
                    </TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>
                      <SortButton field="hash">Hash</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="gasUsed">Gas</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="confirmationTime">Time</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="startTime">Started</SortButton>
                    </TableHead>
                    <TableHead className="text-center">
                      <SortButton field="retryCount">Retries</SortButton>
                    </TableHead>
                    <TableHead className="w-12">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction) => (
                    <TableRow 
                      key={`${transaction.iteration}-${transaction.hash || transaction.startTime.getTime()}`}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onTransactionClick?.(transaction)}
                    >
                      <TableCell className="font-mono text-sm">
                        {transaction.iteration}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(transaction.status)}
                          {getStatusBadge(transaction.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {formatHash(transaction.hash)}
                        </div>
                        {transaction.error && (
                          <div className="text-xs text-red-600 mt-1 truncate max-w-32">
                            {transaction.error}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          {formatGas(transaction.gasUsed)}
                        </div>
                        {transaction.gasEfficiency && transaction.gasEfficiency > 0 && (
                          <div className="text-xs text-gray-500">
                            {(transaction.gasEfficiency * 100).toFixed(0)}% eff.
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          {formatTime(transaction.confirmationTime)}
                        </div>
                        {transaction.blockNumber && (
                          <div className="text-xs text-gray-500">
                            Block #{transaction.blockNumber.toString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-600">
                        {formatTimestamp(transaction.startTime)}
                      </TableCell>
                      <TableCell className="text-center">
                        {transaction.retryCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.retryCount}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
                        <p>Try adjusting your filters or search criteria.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedTransactions.length)} of {processedTransactions.length} transactions
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                    if (pageNum > totalPages) return null
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <span className="text-sm text-gray-500 px-2">...</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}