'use client'

import { 
  BaseEdge, 
  EdgeLabelRenderer, 
  EdgeProps, 
  getBezierPath 
} from 'reactflow'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRightLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface TransferEdgeData {
  amount: bigint
  from: string
  to: string
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed' | 'simulated'
  transactionHash?: string
  metadata: {
    tokenSymbol?: string
    tokenAddress?: string
    transferType?: 'send' | 'receive' | 'swap'
    usdValue?: number
    description?: string
    stepIndex?: number
  }
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'confirmed':
      return <CheckCircle className="w-3 h-3 text-green-500" />
    case 'failed':
      return <XCircle className="w-3 h-3 text-red-500" />
    case 'pending':
      return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
    case 'simulated':
      return <Clock className="w-3 h-3 text-gray-400" />
    default:
      return <ArrowRightLeft className="w-3 h-3 text-gray-500" />
  }
}

const getTransferIcon = (transferType?: string) => {
  switch (transferType) {
    case 'send':
      return <TrendingUp className="w-3 h-3 text-red-500" />
    case 'receive':
      return <TrendingDown className="w-3 h-3 text-green-500" />
    case 'swap':
      return <ArrowRightLeft className="w-3 h-3 text-blue-500" />
    default:
      return <ArrowRightLeft className="w-3 h-3 text-gray-500" />
  }
}

const formatAmount = (amount: bigint, tokenSymbol?: string, decimals: number = 18) => {
  const tokens = Number(amount) / Math.pow(10, decimals)
  let formatted: string
  
  if (tokens >= 1e9) {
    formatted = `${(tokens / 1e9).toFixed(2)}B`
  } else if (tokens >= 1e6) {
    formatted = `${(tokens / 1e6).toFixed(2)}M`
  } else if (tokens >= 1e3) {
    formatted = `${(tokens / 1e3).toFixed(2)}K`
  } else if (tokens < 0.001) {
    formatted = '< 0.001'
  } else {
    formatted = tokens.toFixed(3)
  }
  
  return tokenSymbol ? `${formatted} ${tokenSymbol}` : formatted
}

const formatUsdValue = (usdValue?: number) => {
  if (!usdValue) return null
  if (usdValue >= 1e6) return `$${(usdValue / 1e6).toFixed(2)}M`
  if (usdValue >= 1e3) return `$${(usdValue / 1e3).toFixed(2)}K`
  if (usdValue < 0.01) return '< $0.01'
  return `$${usdValue.toFixed(2)}`
}

const shortenAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const getStatusColors = (status: string) => {
  switch (status) {
    case 'confirmed':
      return {
        stroke: '#10b981', // green-500
        text: 'text-green-700',
        bg: 'bg-green-50 border-green-200'
      }
    case 'failed':
      return {
        stroke: '#ef4444', // red-500
        text: 'text-red-700',
        bg: 'bg-red-50 border-red-200'
      }
    case 'pending':
      return {
        stroke: '#3b82f6', // blue-500
        text: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200'
      }
    case 'simulated':
      return {
        stroke: '#6b7280', // gray-500
        text: 'text-gray-700',
        bg: 'bg-gray-50 border-gray-200'
      }
    default:
      return {
        stroke: '#9ca3af', // gray-400
        text: 'text-gray-700',
        bg: 'bg-gray-50 border-gray-200'
      }
  }
}

const getTransferTypeColor = (transferType?: string) => {
  switch (transferType) {
    case 'send':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'receive':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'swap':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function TransferEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
  selected
}: EdgeProps<TransferEdgeData>) {
  if (!data) return null

  const { amount, from, to, status, transactionHash, metadata } = data
  const colors = getStatusColors(status)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const edgeStyle = {
    ...style,
    stroke: colors.stroke,
    strokeWidth: selected ? 4 : 3, // Thicker for transfers
    strokeDasharray: status === 'simulated' ? '8,4' : undefined,
  }

  // Animation for pending transfers
  const animationClass = status === 'pending' ? 'animate-pulse' : ''
  const formattedAmount = formatAmount(amount, metadata.tokenSymbol)
  const formattedUsd = formatUsdValue(metadata.usdValue)

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
        className={animationClass}
      />
      
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="edge-label"
        >
          <div className={cn(
            "transfer-label px-3 py-2 rounded-lg border shadow-md text-xs space-y-2 min-w-[160px]",
            colors.bg,
            selected ? "ring-2 ring-blue-500" : ""
          )}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                {getTransferIcon(metadata.transferType)}
                <span className="font-medium capitalize">
                  {metadata.transferType || 'Transfer'}
                </span>
              </div>
              <StatusIcon status={status} />
            </div>
            
            {/* Amount */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Amount:</span>
                <Badge 
                  variant="secondary" 
                  className="text-xs px-2 py-0.5 font-medium"
                >
                  {formattedAmount}
                </Badge>
              </div>
              
              {/* USD Value */}
              {formattedUsd && (
                <div className="flex justify-center">
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-gray-600">
                    {formattedUsd}
                  </Badge>
                </div>
              )}
            </div>
            
            {/* From/To Addresses */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">From:</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-mono">
                  {shortenAddress(from)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">To:</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-mono">
                  {shortenAddress(to)}
                </Badge>
              </div>
            </div>
            
            {/* Token Info */}
            {metadata.tokenSymbol && (
              <div className="flex justify-center">
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs px-2 py-0.5", getTransferTypeColor(metadata.transferType))}
                >
                  {metadata.tokenSymbol} Token
                </Badge>
              </div>
            )}
            
            {/* Transaction Hash */}
            {transactionHash && status === 'confirmed' && (
              <div className="text-center">
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-mono">
                  {transactionHash.slice(0, 8)}...
                </Badge>
              </div>
            )}
            
            {/* Status Badge */}
            <div className="flex justify-center">
              <Badge 
                variant={status === 'confirmed' ? 'default' : 'outline'}
                className={cn(
                  "text-xs capitalize",
                  colors.text,
                  status === 'confirmed' && "bg-green-100 text-green-700 border-green-300",
                  status === 'failed' && "bg-red-100 text-red-700 border-red-300",
                  status === 'pending' && "bg-blue-100 text-blue-700 border-blue-300",
                  status === 'simulated' && "bg-gray-100 text-gray-700 border-gray-300"
                )}
              >
                {status}
              </Badge>
            </div>
            
            {/* Failed Status */}
            {status === 'failed' && (
              <div className="flex items-center space-x-1 text-red-600">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs">Transfer Failed</span>
              </div>
            )}
            
            {/* Pending Animation Indicator */}
            {status === 'pending' && (
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <div className="animate-ping w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-xs">Processing...</span>
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}