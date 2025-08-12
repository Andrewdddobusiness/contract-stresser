'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  GitBranch, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Code,
  Clock,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { FlowBlock } from '@/services/flowDesigner/flowBuilder'

interface ConditionalBlockData extends FlowBlock {
  selected?: boolean
}

const getConditionTypeIcon = (type?: string) => {
  switch (type) {
    case 'balance': return <TrendingUp className="w-3 h-3 text-blue-500" />
    case 'tx_success': return <CheckCircle className="w-3 h-3 text-green-500" />
    case 'time_check': return <Clock className="w-3 h-3 text-orange-500" />
    case 'expression': return <Code className="w-3 h-3 text-purple-500" />
    default: return <Code className="w-3 h-3 text-gray-500" />
  }
}

const getConditionTypeLabel = (type?: string) => {
  switch (type) {
    case 'balance': return 'Balance Check'
    case 'tx_success': return 'Transaction Success'
    case 'value_compare': return 'Value Comparison'
    case 'time_check': return 'Time Check'
    case 'expression': return 'Custom Expression'
    default: return 'Unknown'
  }
}

export function ConditionalBlock({ data, selected }: NodeProps<ConditionalBlockData>) {
  const { config, validation, name } = data
  const hasErrors = !validation.isValid
  const hasWarnings = validation.warnings.length > 0

  const getStatusColor = () => {
    if (hasErrors) return 'border-red-500 bg-red-50 dark:bg-red-950'
    if (hasWarnings) return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
    return 'border-orange-500 bg-orange-50 dark:bg-orange-950'
  }

  const getStatusIcon = () => {
    if (hasErrors) return <XCircle className="w-4 h-4 text-red-500" />
    if (hasWarnings) return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    return <CheckCircle className="w-4 h-4 text-green-500" />
  }

  const isConfigured = config.conditionType && config.expression
  const expressionPreview = config.expression 
    ? config.expression.length > 30 
      ? `${config.expression.slice(0, 30)}...`
      : config.expression
    : 'No condition set'

  return (
    <>
      {/* Input Handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 border-2 border-gray-400 bg-white"
        style={{ borderColor: '#6b7280' }}
      />

      {/* Condition Input Handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="condition_value"
        className="w-3 h-3 border-2 border-purple-400 bg-white"
        style={{ 
          borderColor: '#a855f7',
          left: '70%'
        }}
      />

      <Card className={cn(
        "conditional-block min-w-[260px] max-w-[300px] transition-all duration-200 border-2",
        getStatusColor(),
        selected ? "ring-2 ring-primary shadow-lg" : "shadow-md"
      )}>
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-sm">
                {name || 'Conditional'}
              </span>
            </div>
            {getStatusIcon()}
          </div>

          {/* Condition Type */}
          {config.conditionType && (
            <div className="flex items-center space-x-2 text-xs">
              {getConditionTypeIcon(config.conditionType)}
              <span className="text-gray-600">Type:</span>
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                {getConditionTypeLabel(config.conditionType)}
              </Badge>
            </div>
          )}

          {/* Expression Preview */}
          <div className="text-xs">
            <span className="text-gray-600">Condition:</span>
            <div className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 mt-1 font-mono text-xs">
              {expressionPreview}
            </div>
          </div>

          {/* Description */}
          {config.description && (
            <div className="text-xs">
              <span className="text-gray-600">Description:</span>
              <p className="text-gray-800 dark:text-gray-200 mt-1">
                {config.description}
              </p>
            </div>
          )}

          {/* Decision Paths Indicator */}
          <div className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 rounded p-2">
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="w-3 h-3" />
              <span>True Path</span>
            </div>
            <div className="text-gray-400">|</div>
            <div className="flex items-center space-x-1 text-red-600">
              <XCircle className="w-3 h-3" />
              <span>False Path</span>
            </div>
          </div>

          {/* Configuration Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Status:</span>
            {isConfigured ? (
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-600">
                Needs Setup
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
          {isConfigured && !hasErrors && !hasWarnings && (
            <div className="flex items-center space-x-1 text-xs text-green-700">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Ready to evaluate</span>
            </div>
          )}

          {/* Configuration Hint */}
          {!isConfigured && !hasErrors && (
            <div className="text-xs text-gray-500 text-center py-1">
              Configure condition expression
            </div>
          )}
        </div>
      </Card>

      {/* True Path Output Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="true_path"
        className="w-3 h-3 border-2 bg-green-500"
        style={{ 
          top: '40%',
          borderColor: '#10b981',
          backgroundColor: '#10b981'
        }}
      />
      
      {/* False Path Output Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="false_path"
        className="w-3 h-3 border-2 bg-red-500"
        style={{ 
          top: '60%',
          borderColor: '#ef4444',
          backgroundColor: '#ef4444'
        }}
      />

      {/* Error Output Handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="error"
        className="w-3 h-3 border-2 bg-gray-500"
        style={{ 
          borderColor: '#6b7280',
          backgroundColor: '#6b7280'
        }}
      />
    </>
  )
}