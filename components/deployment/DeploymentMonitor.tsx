'use client'

import { useState, useEffect } from 'react'
import { Activity, CheckCircle, Clock, AlertTriangle, ExternalLink, Copy, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeploymentResult, DeployedContract } from '@/services/contracts/multiDeployment'
import { useCurrentChain } from '@/services/blockchain/connection'
import { getTransactionUrl, getAddressUrl } from '@/services/blockchain/chains'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'

interface DeploymentMonitorProps {
  deploymentResult: DeploymentResult
  isLive?: boolean // If true, show real-time updates
}

export function DeploymentMonitor({ deploymentResult, isLive = false }: DeploymentMonitorProps) {
  const chainId = useCurrentChain()
  const [expandedContract, setExpandedContract] = useState<string | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const getStatusColor = (status: DeploymentResult['status']): string => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200'
      case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: DeploymentResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5" />
      case 'partial': return <AlertTriangle className="w-5 h-5" />
      case 'failed': return <AlertTriangle className="w-5 h-5" />
      default: return <Clock className="w-5 h-5" />
    }
  }

  const successRate = deploymentResult.deployedContracts.length / 
    (deploymentResult.deployedContracts.length + deploymentResult.failedContracts.length) * 100

  return (
    <div className="space-y-6">
      {/* Deployment Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Deployment Monitor
                {isLive && (
                  <Badge variant="outline" className="animate-pulse">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Live
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Multi-contract deployment execution results
              </CardDescription>
            </div>
            <Badge className={getStatusColor(deploymentResult.status)}>
              {getStatusIcon(deploymentResult.status)}
              <span className="ml-1 capitalize">{deploymentResult.status}</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {deploymentResult.deployedContracts.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Contracts Deployed
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {deploymentResult.failedContracts.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Deployment Failures
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold">
                {deploymentResult.gasUsed.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Gas Used
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold">
                {(deploymentResult.duration / 1000).toFixed(1)}s
              </div>
              <div className="text-sm text-muted-foreground">
                Total Duration
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Success Rate</span>
              <span>{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Tabs defaultValue="deployed" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deployed">
            Deployed ({deploymentResult.deployedContracts.length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed ({deploymentResult.failedContracts.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deployed" className="space-y-4">
          {deploymentResult.deployedContracts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Successful Deployments</h3>
                <p className="text-muted-foreground">
                  All contract deployments failed during execution
                </p>
              </CardContent>
            </Card>
          ) : (
            deploymentResult.deployedContracts.map(contract => (
              <DeployedContractCard
                key={contract.id}
                contract={contract}
                chainId={chainId}
                isExpanded={expandedContract === contract.id}
                onToggleExpand={() => setExpandedContract(
                  expandedContract === contract.id ? null : contract.id
                )}
                onCopy={copyToClipboard}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          {deploymentResult.failedContracts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium">All Deployments Successful</h3>
                <p className="text-muted-foreground">
                  No deployment failures occurred during execution
                </p>
              </CardContent>
            </Card>
          ) : (
            deploymentResult.failedContracts.map(contract => (
              <FailedContractCard
                key={contract.id}
                contract={contract}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <DeploymentTimeline
            deployedContracts={deploymentResult.deployedContracts}
            failedContracts={deploymentResult.failedContracts}
            duration={deploymentResult.duration}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface DeployedContractCardProps {
  contract: DeployedContract
  chainId: number | null
  isExpanded: boolean
  onToggleExpand: () => void
  onCopy: (text: string) => void
}

function DeployedContractCard({ 
  contract, 
  chainId, 
  isExpanded, 
  onToggleExpand, 
  onCopy 
}: DeployedContractCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <CardTitle className="text-base">{contract.name}</CardTitle>
              <CardDescription>{contract.type}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {formatDistanceToNow(contract.deployedAt, { addSuffix: true })}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleExpand}
            >
              <Eye className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contract Address */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <div className="text-sm font-medium">Contract Address</div>
            <div className="text-sm font-mono text-muted-foreground">
              {contract.address}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCopy(contract.address)}
            >
              <Copy className="w-3 h-3" />
            </Button>
            {chainId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(getAddressUrl(chainId, contract.address), '_blank')}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Transaction Hash */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <div className="text-sm font-medium">Transaction Hash</div>
            <div className="text-sm font-mono text-muted-foreground">
              {contract.transactionHash.slice(0, 20)}...
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCopy(contract.transactionHash)}
            >
              <Copy className="w-3 h-3" />
            </Button>
            {chainId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(getTransactionUrl(chainId, contract.transactionHash), '_blank')}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Block Number</div>
                <div className="text-muted-foreground">
                  {contract.blockNumber.toString()}
                </div>
              </div>
              <div>
                <div className="font-medium">Gas Used</div>
                <div className="text-muted-foreground">
                  {contract.gasUsed.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface FailedContractCardProps {
  contract: {
    id: string
    name: string
    error: string
    gasUsed?: bigint
    attemptedAt: Date
  }
}

function FailedContractCard({ contract }: FailedContractCardProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">{contract.name}</h4>
          <Badge variant="outline" className="text-xs">
            {formatDistanceToNow(contract.attemptedAt, { addSuffix: true })}
          </Badge>
        </div>
        <AlertDescription className="mb-2">
          {contract.error}
        </AlertDescription>
        {contract.gasUsed && (
          <div className="text-xs text-muted-foreground">
            Gas used before failure: {contract.gasUsed.toLocaleString()}
          </div>
        )}
      </div>
    </Alert>
  )
}

interface DeploymentTimelineProps {
  deployedContracts: DeployedContract[]
  failedContracts: Array<{
    id: string
    name: string
    error: string
    attemptedAt: Date
  }>
  duration: number
}

function DeploymentTimeline({ 
  deployedContracts, 
  failedContracts, 
  duration 
}: DeploymentTimelineProps) {
  // Combine and sort all events by time
  const events = [
    ...deployedContracts.map(c => ({
      type: 'success' as const,
      name: c.name,
      timestamp: c.deployedAt,
      gasUsed: c.gasUsed,
      details: c.address
    })),
    ...failedContracts.map(c => ({
      type: 'failure' as const,
      name: c.name,
      timestamp: c.attemptedAt,
      error: c.error,
      gasUsed: c.gasUsed
    }))
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Timeline Data</h3>
          <p className="text-muted-foreground">
            No deployment events were recorded
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deployment Timeline</CardTitle>
        <CardDescription>
          Chronological order of deployment events
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${
                  event.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {index < events.length - 1 && (
                  <div className="w-px h-8 bg-border mt-2" />
                )}
              </div>
              
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-medium ${
                    event.type === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {event.name}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                  </Badge>
                </div>
                
                {event.type === 'success' ? (
                  <div className="text-sm text-muted-foreground">
                    <div>Successfully deployed</div>
                    <div className="font-mono text-xs">{event.details}</div>
                    <div>Gas used: {event.gasUsed.toLocaleString()}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <div className="text-red-600">Deployment failed: {event.error}</div>
                    {event.gasUsed && (
                      <div>Gas used: {event.gasUsed.toLocaleString()}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 bg-muted rounded-lg">
          <div className="text-sm text-center text-muted-foreground">
            Total deployment time: {(duration / 1000).toFixed(2)} seconds
          </div>
        </div>
      </CardContent>
    </Card>
  )
}