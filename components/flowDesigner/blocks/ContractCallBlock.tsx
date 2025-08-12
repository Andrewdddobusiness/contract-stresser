'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileContract2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Zap,
  Info
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { FlowBlock } from '@/services/flowDesigner/flowBuilder'

interface ContractCallBlockData extends FlowBlock {
  selected?: boolean
}

const shortenAddress = (address: string) => {
  if (!address) return 'No address'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const formatGasLimit = (gasLimit?: number) => {
  if (!gasLimit) return 'Auto'
  if (gasLimit >= 1000000) return `${(gasLimit / 1000000).toFixed(1)}M`
  if (gasLimit >= 1000) return `${(gasLimit / 1000).toFixed(1)}K`
  return gasLimit.toString()
}

export function ContractCallBlock({ data, selected }: NodeProps<ContractCallBlockData>) {
  const { config, validation, name } = data
  const hasErrors = !validation.isValid
  const hasWarnings = validation.warnings.length > 0

  const getStatusColor = () => {
    if (hasErrors) return 'border-red-500 bg-red-50 dark:bg-red-950'
    if (hasWarnings) return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
    return 'border-blue-500 bg-blue-50 dark:bg-blue-950'
  }

  const getStatusIcon = () => {
    if (hasErrors) return <XCircle className="w-4 h-4 text-red-500" />
    if (hasWarnings) return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    return <CheckCircle className="w-4 h-4 text-green-500" />
  }

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
        "contract-call-block min-w-[240px] max-w-[280px] transition-all duration-200 border-2",
        getStatusColor(),
        selected ? "ring-2 ring-primary shadow-lg" : "shadow-md"
      )}>
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileContract2 className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">
                {name || 'Contract Call'}
              </span>
            </div>
            {getStatusIcon()}
          </div>

          {/* Contract Info */}
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-gray-600">Contract:</span>
              <div className="font-mono text-gray-800 dark:text-gray-200">
                {shortenAddress(config.contractAddress)}
              </div>
            </div>
            
            {config.functionName && (
              <div>
                <span className="text-gray-600">Function:</span>
                <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0.5">
                  {config.functionName}
                </Badge>
              </div>
            )}
          </div>

          {/* Configuration Details */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-gray-500" />
              <span className="text-gray-600">Gas:</span>
              <span>{formatGasLimit(config.gasLimit)}</span>
            </div>
            
            {config.value && Number(config.value) > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                {(Number(config.value) / 1e18).toFixed(4)} ETH
              </Badge>
            )}
          </div>

          {/* Arguments Preview */}
          {config.args && config.args.length > 0 && (
            <div className="text-xs">
              <span className="text-gray-600">Args:</span>
              <div className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 mt-1 font-mono">
                {config.args.length} parameter{config.args.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

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
              <Info className="h-3 w-3 text-yellow-600" />
              <AlertDescription className="text-xs text-yellow-700">
                {validation.warnings[0].message}
              </AlertDescription>
            </Alert>
          )}

          {/* Success State Indicator */}
          {!hasErrors && !hasWarnings && config.contractAddress && config.functionName && (
            <div className="flex items-center space-x-1 text-xs text-green-700">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Ready to execute</span>
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
          top: '40%',
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
          top: '60%',
          borderColor: '#ef4444',
          backgroundColor: '#ef4444'
        }}
      />

      {/* Data Output Handle */}
      {config.functionName && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="result"
          className="w-3 h-3 border-2 bg-blue-500"
          style={{ 
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f6'
          }}
        />
      )}
    </>
  )
}