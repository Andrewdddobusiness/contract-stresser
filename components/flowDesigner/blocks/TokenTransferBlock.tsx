'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  Coins
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { FlowBlock } from '@/services/flowDesigner/flowBuilder'

interface TokenTransferBlockData extends FlowBlock {
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

export function TokenTransferBlock({ data, selected }: NodeProps<TokenTransferBlockData>) {
  const { config, validation, name } = data
  const hasErrors = !validation.isValid
  const hasWarnings = validation.warnings.length > 0

  const getStatusColor = () => {
    if (hasErrors) return 'border-red-500 bg-red-50 dark:bg-red-950'
    if (hasWarnings) return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
    return 'border-green-500 bg-green-50 dark:bg-green-950'
  }

  const getStatusIcon = () => {
    if (hasErrors) return <XCircle className="w-4 h-4 text-red-500" />
    if (hasWarnings) return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    return <CheckCircle className="w-4 h-4 text-green-500" />
  }

  const isConfigured = config.tokenAddress && config.recipient && config.amount

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
        "token-transfer-block min-w-[260px] max-w-[300px] transition-all duration-200 border-2",
        getStatusColor(),
        selected ? "ring-2 ring-primary shadow-lg" : "shadow-md"
      )}>
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-green-600" />
              <span className="font-medium text-sm">
                {name || 'Token Transfer'}
              </span>
            </div>
            {getStatusIcon()}
          </div>

          {/* Transfer Details */}
          <div className="space-y-2">
            {/* Token Info */}
            <div className="flex items-center space-x-2 text-xs">
              <Coins className="w-3 h-3 text-blue-500" />
              <span className="text-gray-600">Token:</span>
              <div className="font-mono text-gray-800 dark:text-gray-200">
                {config.tokenAddress ? shortenAddress(config.tokenAddress) : 'Not set'}
              </div>
            </div>

            {/* Amount */}
            {config.amount && (
              <div className="text-center py-2">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {formatTokenAmount(config.amount)} tokens
                </Badge>
              </div>
            )}

            {/* Transfer Flow Visualization */}
            {config.recipient && (
              <div className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 rounded p-2">
                <div className="text-center flex-1">
                  <div className="text-gray-500">From</div>
                  <div className="font-mono text-xs">Sender</div>
                </div>
                
                <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />
                
                <div className="text-center flex-1">
                  <div className="text-gray-500">To</div>
                  <div className="font-mono text-xs">
                    {shortenAddress(config.recipient)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Configuration Status */}
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status:</span>
              {isConfigured ? (
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-600">
                  Incomplete
                </Badge>
              )}
            </div>
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
          {isConfigured && !hasErrors && !hasWarnings && (
            <div className="flex items-center space-x-1 text-xs text-green-700">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Ready to transfer</span>
            </div>
          )}

          {/* Amount Preview */}
          {!config.amount && !hasErrors && (
            <div className="text-xs text-gray-500 text-center py-1">
              Configure amount to transfer
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