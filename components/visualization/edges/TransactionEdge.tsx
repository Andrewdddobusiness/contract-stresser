'use client'

import { 
  BaseEdge, 
  EdgeLabelRenderer, 
  EdgeProps, 
  getBezierPath,
  getStraightPath
} from 'reactflow'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Zap,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface TransactionEdgeData {
  amount?: bigint
  gasUsed?: bigint
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed' | 'simulated'
  transactionHash?: string
  label?: string
  metadata: {
    functionName?: string
    parameters?: any[]
    gasEstimate?: bigint
    value?: bigint
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
      return <ArrowRight className="w-3 h-3 text-gray-500" />
  }
}

const formatAmount = (amount?: bigint) => {
  if (!amount) return null
  const eth = Number(amount) / 1e18
  if (eth < 0.001) return '< 0.001'
  if (eth >= 1e6) return `${(eth / 1e6).toFixed(2)}M`
  if (eth >= 1e3) return `${(eth / 1e3).toFixed(2)}K`
  return eth.toFixed(3)
}

const formatGas = (gas?: bigint) => {
  if (!gas) return null
  const gasNumber = Number(gas)
  if (gasNumber >= 1e6) return `${(gasNumber / 1e6).toFixed(1)}M`
  if (gasNumber >= 1e3) return `${(gasNumber / 1e3).toFixed(1)}K`
  return gasNumber.toLocaleString()
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

export function TransactionEdge({
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
}: EdgeProps<TransactionEdgeData>) {
  if (!data) return null

  const { amount, gasUsed, status, transactionHash, label, metadata } = data
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
    strokeDasharray: status === 'simulated' ? '5,5' : status === 'pending' ? '3,3' : undefined,
  }

  // Animation for pending transactions
  const animationClass = status === 'pending' ? 'animate-pulse' : ''

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
            "transaction-label px-2 py-1 rounded-lg border shadow-sm text-xs space-y-1 min-w-[120px]",
            colors.bg,
            selected ? "ring-2 ring-blue-500" : ""
          )}>
            {/* Function Name */}
            {label && (
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{label}</span>
                <StatusIcon status={status} />
              </div>
            )}
            
            {/* Amount */}
            {amount && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Amount:</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  {formatAmount(amount)} ETH
                </Badge>
              </div>
            )}
            
            {/* Gas */}
            {gasUsed && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Gas:</span>
                <div className="flex items-center space-x-1">
                  <Zap className="w-3 h-3" />
                  <span className="text-xs font-medium">{formatGas(gasUsed)}</span>
                </div>
              </div>
            )}
            
            {/* Gas Estimate for pending/simulated */}
            {!gasUsed && metadata.gasEstimate && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Est. Gas:</span>
                <div className="flex items-center space-x-1">
                  <Zap className="w-3 h-3" />
                  <span className="text-xs font-medium">{formatGas(metadata.gasEstimate)}</span>
                </div>
              </div>
            )}
            
            {/* Transaction Hash (shortened) */}
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
            
            {/* Warning for failed transactions */}
            {status === 'failed' && (
              <div className="flex items-center space-x-1 text-red-600">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs">Transaction Failed</span>
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}