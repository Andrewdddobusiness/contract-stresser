'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink, 
  Copy, 
  Zap,
  Timer,
  Hash,
  Layers,
  AlertTriangle,
  TrendingUp,
  RefreshCw
} from 'lucide-react'
import type { TransactionMetrics } from '@/services/analytics/metrics'
import { formatDistanceToNow } from 'date-fns'

interface TransactionDetailModalProps {
  transaction: TransactionMetrics | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewOnExplorer?: (hash: string) => void
}

export function TransactionDetailModal({
  transaction,
  open,
  onOpenChange,
  onViewOnExplorer
}: TransactionDetailModalProps) {
  if (!transaction) return null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'failed': return <XCircle className="w-5 h-5 text-red-600" />
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600" />
      default: return <RefreshCw className="w-5 h-5 text-gray-400" />
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

  const formatGas = (gas?: bigint | number) => {
    if (!gas) return 'N/A'
    const gasNumber = typeof gas === 'bigint' ? Number(gas) : gas
    return gasNumber.toLocaleString()
  }

  const formatGwei = (wei?: bigint) => {
    if (!wei) return 'N/A'
    return (Number(wei) / 1e9).toFixed(2)
  }

  const formatEther = (wei?: bigint) => {
    if (!wei) return 'N/A'
    const ether = Number(wei) / 1e18
    if (ether < 0.0001) return `${(ether * 1e6).toFixed(2)} μΞ`
    if (ether < 0.1) return `${(ether * 1000).toFixed(4)} mΞ`
    return `${ether.toFixed(6)} Ξ`
  }

  const formatTime = (time?: number) => {
    if (!time) return 'N/A'
    if (time < 1000) return `${time} ms`
    if (time < 60000) return `${(time / 1000).toFixed(1)} s`
    return `${(time / 60000).toFixed(1)} min`
  }

  const formatTimestamp = (date: Date) => {
    return `${date.toLocaleString()} (${formatDistanceToNow(date, { addSuffix: true })})`
  }

  const calculateCost = () => {
    if (!transaction.gasUsed || !transaction.gasPrice) return null
    return transaction.gasUsed * transaction.gasPrice
  }

  const cost = calculateCost()

  const HashDisplay = ({ label, value }: { label: string; value?: string }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded border font-mono text-sm">
        <span className="flex-1 break-all">{value || 'N/A'}</span>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={() => copyToClipboard(value)}
          >
            <Copy className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )

  const MetricCard = ({ 
    icon, 
    title, 
    value, 
    description, 
    color = "text-blue-600" 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    value: string; 
    description?: string;
    color?: string;
  }) => (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
      <div className={`mt-0.5 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <div className={`text-lg font-bold ${color}`}>{value}</div>
        {description && (
          <div className="text-xs text-gray-500 mt-1">{description}</div>
        )}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto !bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            {getStatusIcon(transaction.status)}
            <span>Transaction #{transaction.iteration}</span>
            {getStatusBadge(transaction.status)}
          </DialogTitle>
          <DialogDescription>
            Detailed information for transaction executed at {formatTimestamp(transaction.startTime)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Identifiers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hash className="w-5 h-5 mr-2" />
                Transaction Identifiers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <HashDisplay label="Transaction Hash" value={transaction.hash} />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Block Number</label>
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <span className="font-mono text-sm">
                      {transaction.blockNumber ? transaction.blockNumber.toString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              {transaction.hash && onViewOnExplorer && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onViewOnExplorer(transaction.hash!)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Block Explorer
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Execution Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Execution Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  icon={<Timer className="w-4 h-4" />}
                  title="Confirmation Time"
                  value={formatTime(transaction.confirmationTime)}
                  description="Time to confirmation"
                  color="text-blue-600"
                />
                <MetricCard
                  icon={<Zap className="w-4 h-4" />}
                  title="Gas Used"
                  value={formatGas(transaction.gasUsed)}
                  description={`${((Number(transaction.gasUsed || 0) / Number(transaction.gasLimit || 1)) * 100).toFixed(1)}% of limit`}
                  color="text-purple-600"
                />
                <MetricCard
                  icon={<RefreshCw className="w-4 h-4" />}
                  title="Retry Count"
                  value={transaction.retryCount.toString()}
                  description="Number of retries"
                  color={transaction.retryCount > 0 ? "text-yellow-600" : "text-green-600"}
                />
                <MetricCard
                  icon={<TrendingUp className="w-4 h-4" />}
                  title="Gas Efficiency"
                  value={transaction.gasEfficiency ? `${(transaction.gasEfficiency * 100).toFixed(1)}%` : 'N/A'}
                  description="Gas utilization"
                  color="text-green-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* Gas Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Gas & Cost Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Gas Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Gas Limit:</span>
                      <span className="font-mono text-sm">{formatGas(transaction.gasLimit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Gas Used:</span>
                      <span className="font-mono text-sm">{formatGas(transaction.gasUsed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Gas Price:</span>
                      <span className="font-mono text-sm">{formatGwei(transaction.gasPrice)} Gwei</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Utilization:</span>
                      <span className="font-mono text-sm">
                        {((Number(transaction.gasUsed || 0) / Number(transaction.gasLimit || 1)) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Cost Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Transaction Fee:</span>
                      <span className="font-mono text-sm">{cost ? formatEther(cost) : 'N/A'}</span>
                    </div>
                    {transaction.gasPrice && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Fee in USD:</span>
                          <span className="font-mono text-sm text-gray-400">~$0.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Gas Price (Wei):</span>
                          <span className="font-mono text-xs text-gray-400">
                            {transaction.gasPrice.toString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Timer className="w-5 h-5 mr-2" />
                Timing Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Started At:</span>
                    <span className="text-sm font-mono">{transaction.startTime.toLocaleString()}</span>
                  </div>
                  {transaction.endTime && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Ended At:</span>
                      <span className="text-sm font-mono">{transaction.endTime.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Duration:</span>
                    <span className="text-sm font-mono">
                      {transaction.endTime ? 
                        formatTime(transaction.endTime.getTime() - transaction.startTime.getTime()) : 
                        'In Progress'
                      }
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Confirmation Time:</span>
                    <span className="text-sm font-mono">{formatTime(transaction.confirmationTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Relative Time:</span>
                    <span className="text-sm">{formatDistanceToNow(transaction.startTime, { addSuffix: true })}</span>
                  </div>
                  {transaction.blockNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Block Inclusion:</span>
                      <span className="text-sm font-mono">#{transaction.blockNumber.toString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Information */}
          {transaction.error && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Error Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-medium text-red-800 mb-2">Error Message:</div>
                  <div className="text-sm text-red-700 break-words">{transaction.error}</div>
                </div>
                {transaction.retryCount > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-sm font-medium text-yellow-800">
                      This transaction was retried {transaction.retryCount} time(s)
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Raw Transaction Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Raw Transaction Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-gray-50 border rounded-lg font-mono text-xs overflow-x-auto">
                <pre>{JSON.stringify({
                  iteration: transaction.iteration,
                  hash: transaction.hash,
                  status: transaction.status,
                  startTime: transaction.startTime.toISOString(),
                  endTime: transaction.endTime?.toISOString(),
                  gasLimit: transaction.gasLimit?.toString(),
                  gasUsed: transaction.gasUsed?.toString(),
                  gasPrice: transaction.gasPrice?.toString(),
                  blockNumber: transaction.blockNumber?.toString(),
                  confirmationTime: transaction.confirmationTime,
                  retryCount: transaction.retryCount,
                  gasEfficiency: transaction.gasEfficiency,
                  error: transaction.error
                }, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}