'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  FileContract2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  AlertCircle 
} from 'lucide-react'
import { Address } from 'viem'
import { cn } from '@/utils/cn'

interface ContractNodeData {
  address?: Address
  name: string
  status: 'active' | 'pending' | 'success' | 'error' | 'waiting'
  metadata: {
    contractType?: string
    functions?: string[]
    permissions?: string[]
    description?: string
    tags?: string[]
  }
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
      return <FileContract2 className="w-4 h-4 text-gray-500" />
  }
}

const shortenAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function ContractNode({ data, selected }: NodeProps<ContractNodeData>) {
  const { name, status, metadata, progress, address } = data

  const getStatusColors = () => {
    switch (status) {
      case 'success':
        return {
          border: 'border-green-500',
          bg: 'bg-green-50 dark:bg-green-950',
          text: 'text-green-700 dark:text-green-300'
        }
      case 'error':
        return {
          border: 'border-red-500',
          bg: 'bg-red-50 dark:bg-red-950',
          text: 'text-red-700 dark:text-red-300'
        }
      case 'active':
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-50 dark:bg-blue-950',
          text: 'text-blue-700 dark:text-blue-300'
        }
      case 'pending':
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-50 dark:bg-yellow-950',
          text: 'text-yellow-700 dark:text-yellow-300'
        }
      default:
        return {
          border: 'border-gray-300',
          bg: 'bg-gray-50 dark:bg-gray-950',
          text: 'text-gray-700 dark:text-gray-300'
        }
    }
  }

  const colors = getStatusColors()

  return (
    <>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      
      <Card className={cn(
        "contract-node min-w-[240px] max-w-[280px] transition-all duration-200",
        colors.border,
        colors.bg,
        selected ? "ring-2 ring-blue-500" : "",
        "border-2"
      )}>
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between space-x-2">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <FileContract2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">{name}</h3>
                {address && (
                  <p className="text-xs text-gray-500 truncate">
                    {shortenAddress(address)}
                  </p>
                )}
              </div>
            </div>
            <StatusIcon status={status} />
          </div>

          {/* Contract Type Badge */}
          {metadata.contractType && (
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="text-xs">
                {metadata.contractType}
              </Badge>
            </div>
          )}

          {/* Progress Bar */}
          {typeof progress === 'number' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Functions */}
          {metadata.functions && metadata.functions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Functions:</p>
              <div className="flex flex-wrap gap-1">
                {metadata.functions.slice(0, 3).map((fn, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                    {fn}
                  </Badge>
                ))}
                {metadata.functions.length > 3 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    +{metadata.functions.length - 3}
                  </Badge>
                )}
              </div>
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

      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </>
  )
}