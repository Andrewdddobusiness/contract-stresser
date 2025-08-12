'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Zap, 
  ArrowRightLeft, 
  Layers, 
  Timer, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  AlertCircle,
  Gauge,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface OperationNodeData {
  name: string
  status: 'active' | 'pending' | 'success' | 'error' | 'waiting'
  metadata: {
    operationType?: 'swap' | 'batch' | 'conditional' | 'timelocked'
    description?: string
    totalSteps?: number
    completedSteps?: number
    estimatedGas?: bigint
    estimatedCost?: bigint
    riskLevel?: 'low' | 'medium' | 'high'
    tags?: string[]
  }
  progress?: number
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />
    case 'active':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    case 'pending':
      return <Clock className="w-5 h-5 text-yellow-500" />
    case 'waiting':
      return <AlertCircle className="w-5 h-5 text-gray-500" />
    default:
      return <Zap className="w-5 h-5 text-gray-500" />
  }
}

const getOperationIcon = (type?: string) => {
  switch (type) {
    case 'swap':
      return <ArrowRightLeft className="w-5 h-5 text-blue-600" />
    case 'batch':
      return <Layers className="w-5 h-5 text-purple-600" />
    case 'conditional':
      return <Zap className="w-5 h-5 text-green-600" />
    case 'timelocked':
      return <Timer className="w-5 h-5 text-orange-600" />
    default:
      return <Zap className="w-5 h-5 text-gray-600" />
  }
}

const getOperationTypeColor = (type?: string) => {
  switch (type) {
    case 'swap':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    case 'batch':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
    case 'conditional':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    case 'timelocked':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
  }
}

const getRiskLevelColor = (risk?: string) => {
  switch (risk) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700'
    case 'low':
      return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700'
  }
}

const formatGas = (gas?: bigint) => {
  if (!gas) return '0'
  const gasNumber = Number(gas)
  if (gasNumber >= 1e6) {
    return `${(gasNumber / 1e6).toFixed(1)}M`
  } else if (gasNumber >= 1e3) {
    return `${(gasNumber / 1e3).toFixed(1)}K`
  }
  return gasNumber.toLocaleString()
}

const formatCost = (cost?: bigint) => {
  if (!cost) return '0 ETH'
  const eth = Number(cost) / 1e18
  if (eth < 0.001) return '< 0.001 ETH'
  return `${eth.toFixed(4)} ETH`
}

export function OperationNode({ data, selected }: NodeProps<OperationNodeData>) {
  const { name, status, metadata, progress } = data

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
  const stepProgress = metadata.totalSteps && metadata.completedSteps 
    ? (metadata.completedSteps / metadata.totalSteps) * 100 
    : progress || 0

  return (
    <>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      
      <Card className={cn(
        "operation-node min-w-[280px] max-w-[320px] transition-all duration-200",
        colors.border,
        colors.bg,
        selected ? "ring-2 ring-blue-500" : "",
        "border-2"
      )}>
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between space-x-3">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              {getOperationIcon(metadata.operationType)}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-base truncate">{name}</h3>
                {metadata.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                    {metadata.description}
                  </p>
                )}
              </div>
            </div>
            <StatusIcon status={status} />
          </div>

          {/* Operation Type and Risk Level */}
          <div className="flex items-center space-x-2">
            {metadata.operationType && (
              <Badge 
                variant="secondary" 
                className={cn("text-xs capitalize", getOperationTypeColor(metadata.operationType))}
              >
                {metadata.operationType}
              </Badge>
            )}
            {metadata.riskLevel && (
              <Badge 
                variant="outline" 
                className={cn("text-xs capitalize border", getRiskLevelColor(metadata.riskLevel))}
              >
                {metadata.riskLevel} Risk
              </Badge>
            )}
          </div>

          {/* Progress */}
          {stepProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <div className="flex items-center space-x-2">
                  {metadata.totalSteps && metadata.completedSteps !== undefined && (
                    <span className="text-xs text-gray-500">
                      {metadata.completedSteps}/{metadata.totalSteps} steps
                    </span>
                  )}
                  <span className="font-medium">{Math.round(stepProgress)}%</span>
                </div>
              </div>
              <Progress value={stepProgress} className="h-2" />
            </div>
          )}

          {/* Gas and Cost Estimates */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {metadata.estimatedGas && (
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-gray-600">
                  <Gauge className="w-3 h-3" />
                  <span className="text-xs">Est. Gas</span>
                </div>
                <p className="font-medium text-sm">{formatGas(metadata.estimatedGas)}</p>
              </div>
            )}
            {metadata.estimatedCost && (
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-gray-600">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-xs">Est. Cost</span>
                </div>
                <p className="font-medium text-sm">{formatCost(metadata.estimatedCost)}</p>
              </div>
            )}
          </div>

          {/* Status Message */}
          {status === 'active' && (
            <div className="flex items-center space-x-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-blue-600">Executing operation...</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center space-x-2 text-sm">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-600">Operation failed</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center space-x-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-600">Completed successfully</span>
            </div>
          )}

          {/* Tags */}
          {metadata.tags && metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {metadata.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                  #{tag}
                </Badge>
              ))}
              {metadata.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{metadata.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </>
  )
}