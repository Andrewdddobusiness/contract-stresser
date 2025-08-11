'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Clock,
  Lightbulb,
  Settings,
  Network,
  Zap,
  User,
  FileText,
  Download,
  Filter,
  Search,
  Eye,
  EyeOff
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  testErrorRecoveryService,
  type ErrorAnalysis,
  type RecoveryAction,
  type ErrorContext
} from '@/services/testing/errorRecovery'
import { 
  testErrorLogger,
  type LogEntry,
  type ErrorLogEntry,
  type LogFilter
} from '@/services/testing/errorLogger'
import type { TestError, TestExecution, TestTransaction } from '@/types/testing'
import { formatDistanceToNow } from 'date-fns'

interface ErrorHandlerProps {
  execution?: TestExecution | null
  transactions?: TestTransaction[]
  errors?: TestError[]
  onRetry?: () => void
  onRecoveryAction?: (actionId: string) => Promise<boolean>
}

interface ErrorAnalysisCardProps {
  error: TestError
  analysis: ErrorAnalysis
  onRecoveryAction?: (actionId: string) => Promise<boolean>
  onResolve?: () => void
}

interface ErrorLogViewProps {
  executionId?: string
  maxEntries?: number
}

function ErrorAnalysisCard({ 
  error, 
  analysis, 
  onRecoveryAction, 
  onResolve 
}: ErrorAnalysisCardProps) {
  const [executingAction, setExecutingAction] = useState<string | null>(null)
  const [resolvedActions, setResolvedActions] = useState<Set<string>>(new Set())

  const getSeverityColor = (severity: ErrorAnalysis['severity']) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50'
      case 'high': return 'border-orange-500 bg-orange-50'
      case 'medium': return 'border-yellow-500 bg-yellow-50'
      case 'low': return 'border-blue-500 bg-blue-50'
    }
  }

  const getSeverityIcon = (severity: ErrorAnalysis['severity']) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-500" />
      case 'high': return <AlertTriangle className="w-5 h-5 text-orange-500" />
      case 'medium': return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'low': return <AlertCircle className="w-5 h-5 text-blue-500" />
    }
  }

  const handleRecoveryAction = async (action: RecoveryAction) => {
    if (!onRecoveryAction) return

    setExecutingAction(action.id)
    try {
      const success = await onRecoveryAction(action.id)
      if (success) {
        setResolvedActions(prev => new Set(Array.from(prev).concat(action.id)))
        if (action.id === 'retry-with-backoff' && onResolve) {
          onResolve()
        }
      }
    } catch (error) {
      console.error('Recovery action failed:', error)
    } finally {
      setExecutingAction(null)
    }
  }

  return (
    <Card className={`border-2 ${getSeverityColor(analysis.severity)}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {getSeverityIcon(analysis.severity)}
            <div>
              <CardTitle className="text-lg">
                {analysis.errorType.charAt(0).toUpperCase() + analysis.errorType.slice(1)} Error
              </CardTitle>
              <CardDescription className="flex items-center space-x-2 mt-1">
                <Badge variant={analysis.isRetryable ? 'secondary' : 'destructive'}>
                  {analysis.isRetryable ? 'Retryable' : 'Non-retryable'}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {analysis.severity}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Iteration {error.iteration}
                </span>
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* User-friendly message */}
        <Alert>
          <Lightbulb className="w-4 h-4" />
          <AlertDescription className="font-medium">
            {analysis.userMessage}
          </AlertDescription>
        </Alert>

        {/* Root cause */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Root Cause</h4>
          <p className="text-sm text-muted-foreground">{analysis.rootCause}</p>
        </div>

        {/* Technical details (collapsible) */}
        <details className="space-y-2">
          <summary className="font-semibold text-sm cursor-pointer hover:text-primary">
            Technical Details
          </summary>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
            {analysis.technicalDetails}
          </pre>
        </details>

        {/* Suggested actions */}
        {analysis.suggestedActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Suggested Actions</h4>
            <ul className="text-sm space-y-1">
              {analysis.suggestedActions.map((action, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recovery actions */}
        {analysis.recoveryActions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Recovery Actions</h4>
            <div className="space-y-2">
              {analysis.recoveryActions.map((action) => (
                <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{action.name}</div>
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {resolvedActions.has(action.id) && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <Button
                      size="sm"
                      variant={action.autoExecute ? 'default' : 'outline'}
                      onClick={() => handleRecoveryAction(action)}
                      disabled={executingAction === action.id || resolvedActions.has(action.id)}
                    >
                      {executingAction === action.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : resolvedActions.has(action.id) ? (
                        'Completed'
                      ) : action.autoExecute ? (
                        'Auto Execute'
                      ) : (
                        'Execute'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prevention tips */}
        {analysis.preventionTips.length > 0 && (
          <details className="space-y-2">
            <summary className="font-semibold text-sm cursor-pointer hover:text-primary">
              Prevention Tips
            </summary>
            <ul className="text-sm space-y-1">
              {analysis.preventionTips.map((tip, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-muted-foreground mt-1">💡</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

function ErrorLogView({ executionId, maxEntries = 100 }: ErrorLogViewProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([])
  const [filter, setFilter] = useState<LogFilter>({ executionId })
  const [showResolved, setShowResolved] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const updateLogs = () => {
      const allLogs = testErrorLogger.getLogs({ ...filter, executionId }).slice(0, maxEntries)
      const allErrorLogs = testErrorLogger.getErrorLogs({ ...filter, executionId, showResolved })
      
      setLogs(allLogs)
      setErrorLogs(allErrorLogs)
    }

    updateLogs()
    
    // Subscribe to new logs
    const unsubscribe = testErrorLogger.subscribe(updateLogs)
    return unsubscribe
  }, [filter, executionId, maxEntries, showResolved])

  const handleExport = () => {
    const exported = testErrorLogger.exportLogs({
      format: 'json',
      filter: { ...filter, executionId },
      includeContext: true,
      includeStackTraces: true
    })
    
    const blob = new Blob([exported], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-logs-${executionId || 'all'}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'critical': return <XCircle className="w-4 h-4 text-red-500" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'info': return <AlertCircle className="w-4 h-4 text-blue-500" />
      case 'debug': return <Settings className="w-4 h-4 text-gray-500" />
    }
  }

  const getCategoryIcon = (category: LogEntry['category']) => {
    switch (category) {
      case 'network': return <Network className="w-4 h-4" />
      case 'gas': return <Zap className="w-4 h-4" />
      case 'user': return <User className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const filteredLogs = logs.filter(log => 
    !searchTerm || 
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.context && JSON.stringify(log.context).toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            {showResolved ? 'Hide Resolved' : 'Show Resolved'}
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-sm text-muted-foreground">Total Logs</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {logs.filter(l => l.level === 'error' || l.level === 'critical').length}
            </div>
            <div className="text-sm text-muted-foreground">Errors</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {errorLogs.filter(e => e.resolved).length}
            </div>
            <div className="text-sm text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {errorLogs.filter(e => e.level === 'critical').length}
            </div>
            <div className="text-sm text-muted-foreground">Critical</div>
          </CardContent>
        </Card>
      </div>

      {/* Log entries */}
      <Card>
        <CardHeader>
          <CardTitle>Error Log</CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} of {logs.length} log entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {getLogIcon(log.level)}
                  {getCategoryIcon(log.category)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {log.level}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {log.category}
                      </Badge>
                      {log.tags && log.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(log.timestamp)} ago
                    </div>
                  </div>
                  
                  <div className="text-sm mt-1 break-words">
                    {log.message}
                  </div>
                  
                  {log.context && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        Show context
                      </summary>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No log entries match the current filters
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ErrorHandler({ 
  execution, 
  transactions = [], 
  errors = [], 
  onRetry, 
  onRecoveryAction 
}: ErrorHandlerProps) {
  const [analyzedErrors, setAnalyzedErrors] = useState<Map<string, ErrorAnalysis>>(new Map())
  const [selectedTab, setSelectedTab] = useState('current')

  // Analyze errors when they change
  useEffect(() => {
    const newAnalysis = new Map<string, ErrorAnalysis>()
    
    errors.forEach(error => {
      const context: ErrorContext = {
        executionId: execution?.id || 'unknown',
        iteration: error.iteration,
        account: error.account || '0x0000000000000000000000000000000000000000',
        functionName: 'unknown',
        txHash: error.txHash,
        timestamp: error.timestamp
      }
      
      try {
        const analysis = testErrorRecoveryService.analyzeError(
          new Error(error.error), 
          context
        )
        newAnalysis.set(error.id, analysis)
      } catch (err) {
        console.error('Failed to analyze error:', err)
      }
    })
    
    setAnalyzedErrors(newAnalysis)
  }, [errors, execution?.id])

  const unresolvedErrors = errors.filter(error => {
    const analysis = analyzedErrors.get(error.id)
    return analysis?.isRetryable && error.retryCount < 3
  })

  const criticalErrors = errors.filter(error => {
    const analysis = analyzedErrors.get(error.id)
    return analysis?.severity === 'critical'
  })

  return (
    <div className="space-y-6">
      {/* Error Summary */}
      {errors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{errors.length}</div>
              <div className="text-sm text-muted-foreground">Total Errors</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{unresolvedErrors.length}</div>
              <div className="text-sm text-muted-foreground">Unresolved</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{criticalErrors.length}</div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(((errors.length - unresolvedErrors.length) / Math.max(errors.length, 1)) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current Errors</TabsTrigger>
          <TabsTrigger value="logs">Error Logs</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {errors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-700">No Errors Detected</h3>
                <p className="text-muted-foreground">
                  All operations completed successfully without errors.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Priority errors first */}
              {criticalErrors.map(error => {
                const analysis = analyzedErrors.get(error.id)
                if (!analysis) return null
                
                return (
                  <ErrorAnalysisCard
                    key={error.id}
                    error={error}
                    analysis={analysis}
                    onRecoveryAction={onRecoveryAction}
                  />
                )
              })}
              
              {/* Then other errors */}
              {errors.filter(error => !criticalErrors.includes(error)).map(error => {
                const analysis = analyzedErrors.get(error.id)
                if (!analysis) return null
                
                return (
                  <ErrorAnalysisCard
                    key={error.id}
                    error={error}
                    analysis={analysis}
                    onRecoveryAction={onRecoveryAction}
                  />
                )
              })}
              
              {/* Retry all button */}
              {unresolvedErrors.length > 0 && onRetry && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Button onClick={onRetry} size="lg">
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Retry Failed Operations ({unresolvedErrors.length})
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <ErrorLogView executionId={execution?.id} />
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Error Analysis Summary</CardTitle>
              <CardDescription>
                Patterns and insights from error data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {execution?.id && (
                <div className="space-y-4">
                  {/* Error patterns would be displayed here */}
                  <div className="text-center py-8 text-muted-foreground">
                    Error pattern analysis will be displayed here once more data is collected.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}