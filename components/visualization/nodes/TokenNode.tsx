'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  AlertCircle,
  ArrowUpDown
} from 'lucide-react'
import { Address } from 'viem'
import { cn } from '@/utils/cn'

interface TokenNodeData {
  address?: Address
  name: string
  status: 'active' | 'pending' | 'success' | 'error' | 'waiting'
  metadata: {
    tokenSymbol?: string
    tokenStandard?: 'ERC20' | 'ERC721' | 'ERC1155'
    decimals?: number
    totalSupply?: bigint
    description?: string
    tags?: string[]
  }
  balance?: bigint
  balanceHistory?: Array<{ timestamp: number; balance: bigint }>
  progress?: number
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />
    case 'active':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />
    case 'waiting':
      return <AlertCircle className="w-4 h-4 text-gray-500" />
    default:
      return <Coins className="w-4 h-4 text-gray-500" />
  }
}

const getTokenStandardColor = (standard?: string) => {
  switch (standard) {
    case 'ERC20':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    case 'ERC721':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
    case 'ERC1155':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
  }
}

const shortenAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const formatTokenAmount = (balance?: bigint, decimals: number = 18, symbol?: string) => {
  if (!balance) return '0'
  
  const amount = Number(balance) / Math.pow(10, decimals)
  let formatted: string
  
  if (amount >= 1e9) {
    formatted = `${(amount / 1e9).toFixed(2)}B`
  } else if (amount >= 1e6) {
    formatted = `${(amount / 1e6).toFixed(2)}M`
  } else if (amount >= 1e3) {
    formatted = `${(amount / 1e3).toFixed(2)}K`
  } else if (amount < 0.001) {
    formatted = '< 0.001'
  } else {
    formatted = amount.toFixed(3)
  }
  
  return symbol ? `${formatted} ${symbol}` : formatted
}

const BalanceTrend = ({ history }: { history?: Array<{ timestamp: number; balance: bigint }> }) => {
  if (!history || history.length < 2) return null
  
  const latest = history[history.length - 1]
  const previous = history[history.length - 2]
  const isIncreasing = latest.balance > previous.balance
  
  return (
    <div className="flex items-center space-x-1">
      {isIncreasing ? (
        <TrendingUp className="w-3 h-3 text-green-500" />
      ) : (
        <TrendingDown className="w-3 h-3 text-red-500" />
      )}
      <span className={cn(
        "text-xs font-medium",
        isIncreasing ? "text-green-600" : "text-red-600"
      )}>
        {isIncreasing ? "↗" : "↘"}
      </span>
    </div>
  )
}

const MiniBalanceChart = ({ history }: { history?: Array<{ timestamp: number; balance: bigint }> }) => {
  if (!history || history.length < 2) return null
  
  const points = history.slice(-10).map((point, index) => ({
    x: (index / (history.length - 1)) * 100,
    y: Number(point.balance)
  }))
  
  const maxBalance = Math.max(...points.map(p => p.y))
  const minBalance = Math.min(...points.map(p => p.y))
  const range = maxBalance - minBalance || 1
  
  const normalizedPoints = points.map(point => ({
    x: point.x,
    y: 100 - ((point.y - minBalance) / range) * 100
  }))
  
  const pathData = normalizedPoints.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ')
  
  return (
    <div className="h-8 w-full bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <path
          d={pathData}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-blue-500"
        />
        <path
          d={`${pathData} L 100 100 L 0 100 Z`}
          fill="currentColor"
          className="text-blue-200 dark:text-blue-800 opacity-30"
        />
      </svg>
    </div>
  )
}

export function TokenNode({ data, selected }: NodeProps<TokenNodeData>) {
  const { name, status, metadata, balance, balanceHistory, progress } = data

  const getStatusColors = () => {
    switch (status) {
      case 'success':
        return {
          border: 'border-green-500',
          bg: 'bg-green-50 dark:bg-green-950'
        }
      case 'error':
        return {
          border: 'border-red-500',
          bg: 'bg-red-50 dark:bg-red-950'
        }
      case 'active':
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-50 dark:bg-blue-950'
        }
      case 'pending':
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-50 dark:bg-yellow-950'
        }
      default:
        return {
          border: 'border-gray-300',
          bg: 'bg-gray-50 dark:bg-gray-950'
        }
    }
  }

  const colors = getStatusColors()

  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <Card className={cn(
        "token-node min-w-[240px] max-w-[280px] transition-all duration-200",
        colors.border,
        colors.bg,
        selected ? "ring-2 ring-blue-500" : "",
        "border-2"
      )}>
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between space-x-2">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Coins className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1">
                  <h3 className="font-semibold text-sm truncate">{name}</h3>
                  {metadata.tokenSymbol && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      {metadata.tokenSymbol}
                    </Badge>
                  )}
                </div>
                {data.address && (
                  <p className="text-xs text-gray-500 truncate">
                    {shortenAddress(data.address)}
                  </p>
                )}
              </div>
            </div>
            <StatusIcon status={status} />
          </div>

          {/* Token Standard Badge */}
          {metadata.tokenStandard && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs", getTokenStandardColor(metadata.tokenStandard))}
            >
              {metadata.tokenStandard}
            </Badge>
          )}

          {/* Balance */}
          {balance && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Balance:</span>
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-medium">
                    {formatTokenAmount(balance, metadata.decimals, metadata.tokenSymbol)}
                  </span>
                  <BalanceTrend history={balanceHistory} />
                </div>
              </div>
              
              {/* Mini Balance Chart */}
              <MiniBalanceChart history={balanceHistory} />
            </div>
          )}

          {/* Progress Bar */}
          {typeof progress === 'number' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Transfer Progress</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Total Supply */}
          {metadata.totalSupply && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Total Supply:</span>
              <span className="font-medium">
                {formatTokenAmount(metadata.totalSupply, metadata.decimals)}
              </span>
            </div>
          )}

          {/* Description */}
          {metadata.description && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {metadata.description}
            </p>
          )}

          {/* Tags */}
          {metadata.tags && metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {metadata.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                  #{tag}
                </Badge>
              ))}
              {metadata.tags.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{metadata.tags.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </>
  )
}