'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { setupValidationService, type HealthCheckResult, type ContractInfo } from '@/services/validation/setupValidator'
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Activity, Clock, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface HealthDashboardProps {
  contracts: ContractInfo[]
  refreshInterval?: number
  onContractClick?: (contract: ContractInfo) => void
}

interface ContractHealthCardProps {
  contract: ContractInfo
  health: HealthCheckResult
  onClick?: () => void
}

function ContractHealthCard({ contract, health, onClick }: ContractHealthCardProps) {
  const getHealthIcon = () => {
    if (health.isHealthy) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }
    return <XCircle className="w-5 h-5 text-red-500" />
  }

  const getHealthColor = () => {
    if (health.isHealthy) {
      return 'border-green-200 bg-green-50'
    }
    return 'border-red-200 bg-red-50'
  }

  const getStatusBadge = () => {
    if (health.isHealthy) {
      return <Badge className="bg-green-100 text-green-800">Healthy</Badge>
    }
    return <Badge className="bg-red-100 text-red-800">Issues</Badge>
  }

  return (
    <Card 
      className={`transition-all cursor-pointer hover:shadow-md ${getHealthColor()}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getHealthIcon()}
            <CardTitle className="text-sm font-medium">
              {contract.name}
            </CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center space-x-1">
            <Activity className="w-3 h-3" />
            <span>Type: {contract.type}</span>
          </div>
          <div className="flex items-center space-x-1 font-mono">
            <Zap className="w-3 h-3" />
            <span>{contract.address.slice(0, 10)}...{contract.address.slice(-8)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Checked {formatDistanceToNow(health.lastChecked, { addSuffix: true })}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {health.issues.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-red-700">
              {health.issues.length} Issue{health.issues.length !== 1 ? 's' : ''} Found:
            </p>
            <ul className="text-xs text-red-600 space-y-1">
              {health.issues.slice(0, 3).map((issue, index) => (
                <li key={index} className="flex items-start space-x-1">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span className="flex-1">{issue}</span>
                </li>
              ))}
              {health.issues.length > 3 && (
                <li className="text-gray-500">
                  +{health.issues.length - 3} more issues...
                </li>
              )}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-green-600">
            All health checks passed
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function HealthSummaryCard({ healthResults }: { healthResults: HealthCheckResult[] }) {
  const healthyCount = healthResults.filter(h => h.isHealthy).length
  const unhealthyCount = healthResults.length - healthyCount
  const totalIssues = healthResults.reduce((sum, h) => sum + h.issues.length, 0)
  
  const overallHealthy = unhealthyCount === 0

  return (
    <Card className={overallHealthy ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-base">
          {overallHealthy ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          )}
          <span>Ecosystem Health</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{healthyCount}</div>
            <div className="text-xs text-gray-600">Healthy</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{unhealthyCount}</div>
            <div className="text-xs text-gray-600">Issues</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">{totalIssues}</div>
            <div className="text-xs text-gray-600">Total Issues</div>
          </div>
        </div>
        
        <div className="mt-4">
          {overallHealthy ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                All contracts are healthy and ready for operation.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                {unhealthyCount} contract{unhealthyCount !== 1 ? 's have' : ' has'} issues that may affect operation.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function HealthDashboard({ 
  contracts, 
  refreshInterval = 30000, 
  onContractClick 
}: HealthDashboardProps) {
  const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const runHealthChecks = async () => {
    if (!contracts.length) return

    setIsLoading(true)
    setError(null)

    try {
      const results = await setupValidationService.runHealthChecks(contracts)
      setHealthResults(results)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Health check failed'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const refresh = () => {
    runHealthChecks()
  }

  // Initial health check
  useEffect(() => {
    if (contracts.length > 0) {
      runHealthChecks()
    }
  }, [contracts])

  // Auto-refresh setup
  useEffect(() => {
    if (!contracts.length || refreshInterval <= 0) return

    const interval = setInterval(runHealthChecks, refreshInterval)
    return () => clearInterval(interval)
  }, [contracts, refreshInterval])

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span>Health Check Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={refresh} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Health Check
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!contracts.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Contract Health Dashboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No contracts to monitor</p>
            <p className="text-sm">Deploy contracts to see their health status</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <span>Contract Health Dashboard</span>
        </h2>
        
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          
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
      </div>

      {/* Summary Card */}
      {healthResults.length > 0 && (
        <HealthSummaryCard healthResults={healthResults} />
      )}

      {/* Contract Health Cards */}
      {isLoading && !healthResults.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contracts.map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-gray-200 rounded-full" />
                    <div className="w-24 h-4 bg-gray-200 rounded" />
                  </div>
                  <div className="w-16 h-5 bg-gray-200 rounded" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="w-full h-3 bg-gray-200 rounded" />
                  <div className="w-3/4 h-3 bg-gray-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contracts.map(contract => {
            const health = healthResults.find(h => h.contractAddress === contract.address)
            
            if (!health) {
              return (
                <Card key={contract.address} className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-gray-400" />
                      <span>{contract.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">Health check pending...</p>
                  </CardContent>
                </Card>
              )
            }

            return (
              <ContractHealthCard
                key={contract.address}
                contract={contract}
                health={health}
                onClick={() => onContractClick?.(contract)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}