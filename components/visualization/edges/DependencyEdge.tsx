'use client'

import { 
  BaseEdge, 
  EdgeLabelRenderer, 
  EdgeProps, 
  getBezierPath 
} from 'reactflow'
import { Badge } from '@/components/ui/badge'
import { 
  GitBranch, 
  ArrowDown, 
  Clock, 
  Link,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface DependencyEdgeData {
  dependencyType: 'sequential' | 'conditional' | 'parallel' | 'timeout'
  condition?: string
  timeout?: number
  timestamp: number
  status: 'active' | 'waiting' | 'satisfied' | 'failed' | 'timeout'
  metadata: {
    description?: string
    priority?: 'low' | 'medium' | 'high'
    stepIndex?: number
    estimatedDelay?: number
  }
}

const DependencyIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'sequential':
      return <ArrowDown className="w-3 h-3 text-blue-500" />
    case 'conditional':
      return <GitBranch className="w-3 h-3 text-orange-500" />
    case 'parallel':
      return <Link className="w-3 h-3 text-purple-500" />
    case 'timeout':
      return <Clock className="w-3 h-3 text-red-500" />
    default:
      return <Link className="w-3 h-3 text-gray-500" />
  }
}

const getStatusColors = (status: string) => {
  switch (status) {
    case 'satisfied':
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
    case 'active':
      return {
        stroke: '#3b82f6', // blue-500
        text: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200'
      }
    case 'waiting':
      return {
        stroke: '#f59e0b', // amber-500
        text: 'text-amber-700',
        bg: 'bg-amber-50 border-amber-200'
      }
    case 'timeout':
      return {
        stroke: '#dc2626', // red-600
        text: 'text-red-700',
        bg: 'bg-red-50 border-red-200'
      }
    default:
      return {
        stroke: '#6b7280', // gray-500
        text: 'text-gray-700',
        bg: 'bg-gray-50 border-gray-200'
      }
  }
}

const getDependencyTypeColor = (type: string) => {
  switch (type) {
    case 'sequential':
      return 'bg-blue-100 text-blue-700 border-blue-300'
    case 'conditional':
      return 'bg-orange-100 text-orange-700 border-orange-300'
    case 'parallel':
      return 'bg-purple-100 text-purple-700 border-purple-300'
    case 'timeout':
      return 'bg-red-100 text-red-700 border-red-300'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300'
  }
}

const formatTimeout = (timeout?: number) => {
  if (!timeout) return null
  if (timeout >= 60) return `${Math.round(timeout / 60)}m`
  return `${timeout}s`
}

export function DependencyEdge({
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
}: EdgeProps<DependencyEdgeData>) {
  if (!data) return null

  const { dependencyType, condition, timeout, status, metadata } = data
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
    strokeWidth: selected ? 2 : 1,
    strokeDasharray: '5,5', // Always dashed for dependencies
    opacity: status === 'waiting' ? 0.6 : 1,
  }

  // Animation for active dependencies
  const animationClass = status === 'active' ? 'animate-pulse' : ''

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
            "dependency-label px-2 py-1 rounded-md border shadow-sm text-xs space-y-1 min-w-[120px]",
            colors.bg,
            selected ? "ring-2 ring-blue-500" : ""
          )}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <DependencyIcon type={dependencyType} />
                <span className="font-medium text-xs capitalize">
                  {dependencyType}
                </span>
              </div>
              {metadata.priority && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs px-1 py-0",
                    metadata.priority === 'high' && "border-red-300 text-red-600",
                    metadata.priority === 'medium' && "border-yellow-300 text-yellow-600",
                    metadata.priority === 'low' && "border-green-300 text-green-600"
                  )}
                >
                  {metadata.priority}
                </Badge>
              )}
            </div>
            
            {/* Dependency Type */}
            <div className="flex justify-center">
              <Badge 
                variant="outline"
                className={cn("text-xs capitalize", getDependencyTypeColor(dependencyType))}
              >
                {dependencyType}
              </Badge>
            </div>
            
            {/* Condition */}
            {condition && (
              <div className="space-y-1">
                <span className="text-gray-600 text-xs">Condition:</span>
                <p className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 font-mono">
                  {condition.length > 20 ? `${condition.slice(0, 20)}...` : condition}
                </p>
              </div>
            )}
            
            {/* Timeout */}
            {timeout && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Timeout:</span>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-medium">{formatTimeout(timeout)}</span>
                </div>
              </div>
            )}
            
            {/* Estimated Delay */}
            {metadata.estimatedDelay && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Est. Delay:</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  {formatTimeout(metadata.estimatedDelay)}
                </Badge>
              </div>
            )}
            
            {/* Description */}
            {metadata.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {metadata.description}
              </p>
            )}
            
            {/* Status Badge */}
            <div className="flex justify-center">
              <Badge 
                variant={status === 'satisfied' ? 'default' : 'outline'}
                className={cn(
                  "text-xs capitalize",
                  colors.text,
                  status === 'satisfied' && "bg-green-100 text-green-700 border-green-300",
                  status === 'failed' && "bg-red-100 text-red-700 border-red-300",
                  status === 'active' && "bg-blue-100 text-blue-700 border-blue-300",
                  status === 'waiting' && "bg-amber-100 text-amber-700 border-amber-300",
                  status === 'timeout' && "bg-red-100 text-red-700 border-red-300"
                )}
              >
                {status}
              </Badge>
            </div>
            
            {/* Status Messages */}
            {status === 'failed' && (
              <div className="flex items-center space-x-1 text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span className="text-xs">Dependency Failed</span>
              </div>
            )}
            
            {status === 'timeout' && (
              <div className="flex items-center space-x-1 text-red-600">
                <Clock className="w-3 h-3" />
                <span className="text-xs">Timed Out</span>
              </div>
            )}
            
            {status === 'waiting' && (
              <div className="flex items-center justify-center space-x-2 text-amber-600">
                <div className="animate-ping w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                <span className="text-xs">Waiting...</span>
              </div>
            )}
            
            {status === 'active' && (
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></div>
                <span className="text-xs">Checking...</span>
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}