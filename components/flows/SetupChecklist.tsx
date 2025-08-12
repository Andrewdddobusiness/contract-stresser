'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSetupValidation } from '@/hooks/useSetupValidation'
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Wrench } from 'lucide-react'
import type { ContractInfo, ValidationCheck } from '@/services/validation/setupValidator'

interface SetupChecklistProps {
  contracts: ContractInfo[]
  onComplete?: (canProceed: boolean) => void
  autoRefresh?: boolean
}

interface ChecklistItemProps {
  check: ValidationCheck & { result?: any }
  onAutoFix?: (checkId: string) => void
  isFixing?: boolean
}

function ChecklistItem({ check, onAutoFix, isFixing }: ChecklistItemProps) {
  const { result } = check
  
  if (!result) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-gray-200 rounded-full" />
          <div className="space-y-1">
            <div className="w-32 h-4 bg-gray-200 rounded" />
            <div className="w-24 h-3 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    )
  }

  const getStatusIcon = () => {
    if (result.passed) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }
    
    if (check.severity === 'critical') {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
    
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />
  }

  const getStatusColor = () => {
    if (result.passed) return 'bg-green-50 border-green-200'
    if (check.severity === 'critical') return 'bg-red-50 border-red-200'
    return 'bg-yellow-50 border-yellow-200'
  }

  const getSeverityBadge = () => {
    const variants = {
      critical: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800'
    }
    
    return (
      <Badge className={variants[check.severity]}>
        {check.severity}
      </Badge>
    )
  }

  return (
    <div className={`p-4 border rounded-lg transition-colors ${getStatusColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-sm">{check.name}</h4>
              {getSeverityBadge()}
            </div>
            <p className="text-xs text-gray-600 mt-1">{check.description}</p>
            
            <div className="mt-2">
              <p className={`text-sm ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
                {result.message}
              </p>
              
              {result.suggestedAction && !result.passed && (
                <p className="text-xs text-gray-600 mt-1">
                  💡 {result.suggestedAction}
                </p>
              )}
              
              {result.details && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    View details
                  </summary>
                  <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
        
        {result.canAutoFix && !result.passed && onAutoFix && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAutoFix(check.id)}
            disabled={isFixing}
            className="ml-3"
          >
            {isFixing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wrench className="w-4 h-4" />
            )}
            {isFixing ? 'Fixing...' : 'Fix'}
          </Button>
        )}
      </div>
    </div>
  )
}

export function SetupChecklist({ contracts, onComplete, autoRefresh = false }: SetupChecklistProps) {
  const { 
    summary, 
    checks, 
    isLoading, 
    error, 
    lastUpdated, 
    completionPercentage, 
    canProceed, 
    refresh, 
    autoFix 
  } = useSetupValidation(contracts, {
    autoRefresh,
    onValidationComplete: (summary) => {
      if (onComplete) {
        onComplete(summary.canProceed)
      }
    }
  })

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span>Validation Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button onClick={refresh} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Validation
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            {canProceed ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            )}
            <span>Setup Validation</span>
          </CardTitle>
          
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{completionPercentage}% Complete</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          
          {summary && (
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>{summary.passedChecks} Passed</span>
              </span>
              
              {summary.failedChecks > 0 && (
                <span className="flex items-center space-x-1">
                  <XCircle className="w-3 h-3 text-red-500" />
                  <span>{summary.failedChecks} Failed</span>
                </span>
              )}
              
              {summary.warningChecks > 0 && (
                <span className="flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  <span>{summary.warningChecks} Warnings</span>
                </span>
              )}
            </div>
          )}
          
          {lastUpdated && (
            <p className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {!contracts.length ? (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>No contracts to validate</p>
            <p className="text-sm">Add contracts to begin validation</p>
          </div>
        ) : isLoading && !summary ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg animate-pulse">
                <div className="w-5 h-5 bg-gray-200 rounded-full" />
                <div className="space-y-1 flex-1">
                  <div className="w-3/4 h-4 bg-gray-200 rounded" />
                  <div className="w-1/2 h-3 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {checks.map(check => (
              <ChecklistItem
                key={check.id}
                check={check}
                onAutoFix={autoFix}
                isFixing={isLoading}
              />
            ))}
            
            {summary && (
              <div className="mt-6 pt-4 border-t">
                <Alert className={canProceed ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                  {canProceed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                  <AlertDescription className={canProceed ? 'text-green-700' : 'text-yellow-700'}>
                    {canProceed 
                      ? 'All critical validations passed. You can proceed with the flow execution.'
                      : `${summary.failedChecks} critical checks must pass before proceeding.`
                    }
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}