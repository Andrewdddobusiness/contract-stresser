'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  User, 
  Wallet, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  AlertCircle 
} from 'lucide-react'
import { Address } from 'viem'
import { cn } from '@/utils/cn'

interface UserNodeData {
  address?: Address
  name: string
  status: 'active' | 'pending' | 'success' | 'error' | 'waiting'
  metadata: {
    userType?: 'admin' | 'manager' | 'user' | 'trader'
    roles?: string[]
    permissions?: string[]
    description?: string
    tags?: string[]
    balance?: bigint
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
      return <User className="w-4 h-4 text-gray-500" />
  }
}

const getUserTypeColor = (userType?: string) => {
  switch (userType) {
    case 'admin':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    case 'manager':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
    case 'trader':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
  }
}

const shortenAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const formatBalance = (balance?: bigint) => {
  if (!balance) return '0'
  const eth = Number(balance) / 1e18
  if (eth < 0.001) return '< 0.001 ETH'
  return `${eth.toFixed(3)} ETH`
}

export function UserNode({ data, selected }: NodeProps<UserNodeData>) {
  const { name, status, metadata, address } = data

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
        "user-node min-w-[220px] max-w-[260px] transition-all duration-200",
        colors.border,
        colors.bg,
        selected ? "ring-2 ring-blue-500" : "",
        "border-2"
      )}>
        <div className="p-3 space-y-3">
          {/* Header with Avatar */}
          <div className="flex items-start space-x-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarFallback className={getUserTypeColor(metadata.userType)}>
                {metadata.userType === 'admin' && <Shield className="w-5 h-5" />}
                {metadata.userType === 'trader' && <Wallet className="w-5 h-5" />}
                {(!metadata.userType || metadata.userType === 'user' || metadata.userType === 'manager') && 
                  <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm truncate">{name}</h3>
                <StatusIcon status={status} />
              </div>
              {address && (
                <p className="text-xs text-gray-500 truncate">
                  {shortenAddress(address)}
                </p>
              )}
            </div>
          </div>

          {/* User Type Badge */}
          {metadata.userType && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs capitalize", getUserTypeColor(metadata.userType))}
            >
              {metadata.userType}
            </Badge>
          )}

          {/* Balance */}
          {metadata.balance && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Balance:</span>
              <span className="font-medium">{formatBalance(metadata.balance)}</span>
            </div>
          )}

          {/* Roles */}
          {metadata.roles && metadata.roles.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Roles:</p>
              <div className="flex flex-wrap gap-1">
                {metadata.roles.slice(0, 2).map((role, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                    {role}
                  </Badge>
                ))}
                {metadata.roles.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    +{metadata.roles.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Permissions Count */}
          {metadata.permissions && metadata.permissions.length > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Permissions:</span>
              <Badge variant="outline" className="text-xs">
                {metadata.permissions.length}
              </Badge>
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