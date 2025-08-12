'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowRightLeft, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Coins,
  User
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { FlowBlock } from '@/services/flowDesigner/flowBuilder'

interface AtomicSwapBlockData extends FlowBlock {
  selected?: boolean
}

const shortenAddress = (address: string) => {
  if (!address) return 'No address'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const formatTokenAmount = (amount?: bigint | string | number, decimals: number = 18) => {
  if (!amount) return '0'
  
  let amountBigInt: bigint
  if (typeof amount === 'string') {
    amountBigInt = BigInt(amount)
  } else if (typeof amount === 'number') {
    amountBigInt = BigInt(amount)
  } else {
    amountBigInt = amount
  }
  
  const tokens = Number(amountBigInt) / Math.pow(10, decimals)
  
  if (tokens >= 1e9) return `${(tokens / 1e9).toFixed(2)}B`
  if (tokens >= 1e6) return `${(tokens / 1e6).toFixed(2)}M`
  if (tokens >= 1e3) return `${(tokens / 1e3).toFixed(2)}K`
  if (tokens < 0.001) return '< 0.001'
  return tokens.toFixed(3)
}

const formatDeadline = (timestamp?: number) => {
  if (!timestamp) return 'Not set'
  
  const now = Date.now() / 1000
  const diffSeconds = timestamp - now
  
  if (diffSeconds <= 0) return 'Expired'
  
  const hours = Math.floor(diffSeconds / 3600)
  const minutes = Math.floor((diffSeconds % 3600) / 60)
  
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${Math.floor(diffSeconds / 60)}m`
}

export function AtomicSwapBlock({ data, selected }: NodeProps<AtomicSwapBlockData>) {
  const { config, validation, name } = data
  const hasErrors = !validation.isValid
  const hasWarnings = validation.warnings.length > 0

  const getStatusColor = () => {
    if (hasErrors) return 'border-red-500 bg-red-50 dark:bg-red-950'
    if (hasWarnings) return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
    return 'border-purple-500 bg-purple-50 dark:bg-purple-950'
  }

  const getStatusIcon = () => {
    if (hasErrors) return <XCircle className="w-4 h-4 text-red-500" />
    if (hasWarnings) return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    return <CheckCircle className="w-4 h-4 text-green-500" />
  }

  const isConfigured = config.tokenA && config.tokenB && config.amountA && config.amountB && config.participant2 && config.deadline
  const isExpired = config.deadline && (config.deadline < Date.now() / 1000)

  return (
    <>
      {/* Input Handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 border-2 border-gray-400 bg-white"
        style={{ borderColor: '#6b7280' }}
      />

      <Card className={cn(
        "atomic-swap-block min-w-[280px] max-w-[320px] transition-all duration-200 border-2",
        getStatusColor(),
        selected ? "ring-2 ring-primary shadow-lg" : "shadow-md"
      )}>
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-sm">
                {name || 'Atomic Swap'}
              </span>
            </div>
            {getStatusIcon()}
          </div>

          {/* Token Pair */}
          {(config.tokenA || config.tokenB) && (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2 py-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="text-center flex-1">
                  <div className="flex items-center justify-center space-x-1 text-xs text-gray-600">
                    <Coins className="w-3 h-3" />
                    <span>Token A</span>
                  </div>
                  <div className="font-mono text-xs mt-1">
                    {config.tokenA ? shortenAddress(config.tokenA) : 'Not set'}
                  </div>
                  {config.amountA && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {formatTokenAmount(config.amountA)}
                    </Badge>
                  )}
                </div>
                
                <ArrowRightLeft className="w-4 h-4 text-purple-500" />
                
                <div className="text-center flex-1">
                  <div className="flex items-center justify-center space-x-1 text-xs text-gray-600">
                    <Coins className="w-3 h-3" />
                    <span>Token B</span>
                  </div>
                  <div className="font-mono text-xs mt-1">
                    {config.tokenB ? shortenAddress(config.tokenB) : 'Not set'}
                  </div>
                  {config.amountB && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {formatTokenAmount(config.amountB)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Participants */}
          {config.participant2 && (
            <div className="text-xs">
              <div className="flex items-center space-x-1 text-gray-600">
                <User className="w-3 h-3" />
                <span>Counterparty:</span>
              </div>
              <div className="font-mono text-gray-800 dark:text-gray-200 ml-4">
                {shortenAddress(config.participant2)}
              </div>
            </div>
          )}

          {/* Deadline */}
          {config.deadline && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1 text-gray-600">
                <Clock className="w-3 h-3" />
                <span>Deadline:</span>
              </div>
              <Badge 
                variant={isExpired ? "destructive" : "outline"}
                className="text-xs"
              >
                {formatDeadline(config.deadline)}
              </Badge>
            </div>
          )}

          {/* Slippage Tolerance */}
          {config.slippageTolerance && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Slippage:</span>
              <Badge variant="secondary" className="text-xs">
                {config.slippageTolerance}%
              </Badge>
            </div>
          )}

          {/* Configuration Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Status:</span>
            {isExpired ? (
              <Badge variant="destructive" className="text-xs">
                Expired
              </Badge>
            ) : isConfigured ? (
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-600">
                Incomplete
              </Badge>
            )}
          </div>

          {/* Validation Errors */}
          {hasErrors && (
            <Alert variant="destructive" className="py-1 px-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                {validation.errors[0].message}
                {validation.errors.length > 1 && (
                  <span className="text-gray-500 ml-1">
                    +{validation.errors.length - 1} more
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Warnings */}
          {hasWarnings && !hasErrors && (
            <Alert className="py-1 px-2 border-yellow-300 bg-yellow-50">
              <AlertTriangle className="h-3 w-3 text-yellow-600" />
              <AlertDescription className="text-xs text-yellow-700">
                {validation.warnings[0].message}
              </AlertDescription>
            </Alert>
          )}

          {/* Success State */}
          {isConfigured && !hasErrors && !hasWarnings && !isExpired && (
            <div className="flex items-center space-x-1 text-xs text-green-700">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Ready for atomic swap</span>
            </div>
          )}

          {/* Configuration Hints */}
          {!isConfigured && !hasErrors && (
            <div className="text-xs text-gray-500 text-center py-1">
              Configure tokens, amounts, and counterparty
            </div>
          )}
        </div>
      </Card>

      {/* Output Handles */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="success"
        className="w-3 h-3 border-2 bg-green-500"
        style={{ 
          top: '50%',
          borderColor: '#10b981',
          backgroundColor: '#10b981'
        }}
      />
      
      <Handle 
        type="source" 
        position={Position.Right} 
        id="error"
        className="w-3 h-3 border-2 bg-red-500"
        style={{ 
          top: '70%',
          borderColor: '#ef4444',
          backgroundColor: '#ef4444'
        }}
      />

      {/* Transaction Hash Output */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="transaction_hash"
        className="w-3 h-3 border-2 bg-blue-500"
        style={{ 
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6'
        }}
      />
    </>
  )
}