'use client'

import { 
  BaseEdge, 
  EdgeLabelRenderer, 
  EdgeProps, 
  getBezierPath 
} from 'reactflow'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  AlertTriangle,
  Infinity
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface ApprovalEdgeData {
  amount?: bigint
  spender: string
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed' | 'simulated'
  transactionHash?: string
  metadata: {
    tokenSymbol?: string
    isInfinite?: boolean
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
      return <Shield className="w-3 h-3 text-gray-500" />
  }
}

const formatAmount = (amount?: bigint, tokenSymbol?: string) => {
  if (!amount) return null
  
  // Check for max uint256 (infinite approval)
  const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
  if (amount >= maxUint256 / BigInt(2)) {
    return 'Unlimited'
  }
  
  const tokens = Number(amount) / 1e18
  let formatted: string
  
  if (tokens >= 1e6) {
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

export function ApprovalEdge({
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
}: EdgeProps<ApprovalEdgeData>) {
  if (!data) return null

  const { amount, spender, status, transactionHash, metadata } = data
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
    strokeWidth: selected ? 3 : 2,
    strokeDasharray: '2,2', // Dotted line for approvals
  }

  // Animation for pending approvals
  const animationClass = status === 'pending' ? 'animate-pulse' : ''
  const formattedAmount = formatAmount(amount, metadata.tokenSymbol)

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
            "approval-label px-2 py-1 rounded-lg border shadow-sm text-xs space-y-1 min-w-[140px]",
            colors.bg,
            selected ? "ring-2 ring-blue-500" : ""
          )}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3 text-blue-600" />
                <span className="font-medium">Approval</span>
              </div>
              <StatusIcon status={status} />
            </div>
            
            {/* Amount */}
            {formattedAmount && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Amount:</span>
                <div className="flex items-center space-x-1">
                  {metadata.isInfinite && <Infinity className="w-3 h-3 text-orange-500" />}
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {formattedAmount}
                  </Badge>
                </div>
              </div>
            )}
            
            {/* Spender */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Spender:</span>
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-mono">
                {shortenAddress(spender)}
              </Badge>
            </div>
            
            {/* Token Symbol */}
            {metadata.tokenSymbol && (
              <div className="flex justify-center">
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {metadata.tokenSymbol}
                </Badge>
              </div>
            )}
            
            {/* Transaction Hash (for confirmed) */}
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
            
            {/* Infinite Approval Warning */}
            {metadata.isInfinite && status !== 'failed' && (
              <div className="flex items-center space-x-1 text-orange-600">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs">Unlimited Approval</span>
              </div>
            )}
            
            {/* Failed Status */}
            {status === 'failed' && (
              <div className="flex items-center space-x-1 text-red-600">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs">Approval Failed</span>
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}