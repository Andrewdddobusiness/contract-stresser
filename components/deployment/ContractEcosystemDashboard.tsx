'use client'

import { useState, useEffect } from 'react'
import { Network, Settings, Users, Coins, Shield, ExternalLink, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { multiDeploymentService, DeployedContract } from '@/services/contracts/multiDeployment'
import { contractTemplateService, ContractType } from '@/services/contracts/contractTemplates'
import { useCurrentChain } from '@/services/blockchain/connection'
import { getAddressUrl } from '@/services/blockchain/chains'
import { formatDistanceToNow } from 'date-fns'

interface ContractEcosystem {
  id: string
  name: string
  contracts: DeployedContract[]
  relationships: ContractRelationship[]
  stats: EcosystemStats
  lastUpdated: Date
}

interface ContractRelationship {
  from: string // Contract address
  to: string // Contract address  
  type: 'depends_on' | 'calls' | 'owns' | 'manages'
  description: string
}

interface EcosystemStats {
  totalContracts: number
  contractTypes: Record<ContractType, number>
  totalGasUsed: bigint
  averageGasPerContract: bigint
  deploymentSuccessRate: number
}

interface ContractEcosystemDashboardProps {
  ecosystemId?: string
}

export function ContractEcosystemDashboard({ ecosystemId }: ContractEcosystemDashboardProps) {
  const chainId = useCurrentChain()
  const [ecosystems, setEcosystems] = useState<ContractEcosystem[]>([])
  const [selectedEcosystem, setSelectedEcosystem] = useState<ContractEcosystem | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadEcosystems()
  }, [chainId])

  useEffect(() => {
    if (ecosystemId && ecosystems.length > 0) {
      const ecosystem = ecosystems.find(e => e.id === ecosystemId)
      setSelectedEcosystem(ecosystem || null)
    }
  }, [ecosystemId, ecosystems])

  const loadEcosystems = async () => {
    setIsLoading(true)
    try {
      // Load deployed ecosystems from deployment plans
      const plans = multiDeploymentService.getAllDeploymentPlans()
      const completedPlans = plans.filter(p => p.status === 'completed')
      
      const ecosystemData: ContractEcosystem[] = completedPlans.map(plan => {
        // This would be populated with actual deployed contract data
        // For now, creating mock data structure
        const contracts: DeployedContract[] = []
        
        return {
          id: plan.id,
          name: plan.name,
          contracts,
          relationships: [],
          stats: {
            totalContracts: plan.contracts.length,
            contractTypes: plan.contracts.reduce((acc, contract) => {
              acc[contract.type] = (acc[contract.type] || 0) + 1
              return acc
            }, {} as Record<ContractType, number>),
            totalGasUsed: BigInt(0),
            averageGasPerContract: BigInt(0),
            deploymentSuccessRate: 100
          },
          lastUpdated: plan.updatedAt
        }
      })

      setEcosystems(ecosystemData)
      if (!selectedEcosystem && ecosystemData.length > 0) {
        setSelectedEcosystem(ecosystemData[0])
      }
    } catch (error) {
      console.error('Failed to load ecosystems:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getContractTypeIcon = (type: ContractType) => {
    switch (type) {
      case 'ERC20': return <Coins className="w-4 h-4" />
      case 'ERC1155': return <Coins className="w-4 h-4" />
      case 'Settlement': return <Network className="w-4 h-4" />
      case 'AccessControl': return <Shield className="w-4 h-4" />
      case 'Registry': return <Settings className="w-4 h-4" />
      default: return <Settings className="w-4 h-4" />
    }
  }

  const getContractTypeColor = (type: ContractType): string => {
    switch (type) {
      case 'ERC20': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'ERC1155': return 'text-green-600 bg-green-50 border-green-200'
      case 'Settlement': return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'AccessControl': return 'text-red-600 bg-red-50 border-red-200'
      case 'Registry': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Loading Ecosystems</h3>
          <p className="text-muted-foreground">Fetching deployed contract ecosystems...</p>
        </CardContent>
      </Card>
    )
  }

  if (ecosystems.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Contract Ecosystems</h3>
          <p className="text-muted-foreground mb-4">
            Deploy your first multi-contract ecosystem to get started
          </p>
          <Button>
            Create Deployment Plan
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Contract Ecosystems
              </CardTitle>
              <CardDescription>
                Overview and management of deployed contract ecosystems
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadEcosystems}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Ecosystem List */}
        <div className="space-y-4">
          <h3 className="font-semibold">Deployed Ecosystems</h3>
          {ecosystems.map(ecosystem => (
            <EcosystemCard
              key={ecosystem.id}
              ecosystem={ecosystem}
              isSelected={selectedEcosystem?.id === ecosystem.id}
              onClick={() => setSelectedEcosystem(ecosystem)}
            />
          ))}
        </div>

        {/* Ecosystem Details */}
        <div className="lg:col-span-3">
          {selectedEcosystem ? (
            <EcosystemDetails ecosystem={selectedEcosystem} chainId={chainId} />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Select an Ecosystem</h3>
                <p className="text-muted-foreground">
                  Choose an ecosystem from the list to view its details
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

interface EcosystemCardProps {
  ecosystem: ContractEcosystem
  isSelected: boolean
  onClick: () => void
}

function EcosystemCard({ ecosystem, isSelected, onClick }: EcosystemCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-colors hover:bg-accent ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{ecosystem.name}</CardTitle>
        <CardDescription>
          {ecosystem.stats.totalContracts} contracts
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {Object.entries(ecosystem.stats.contractTypes).map(([type, count]) => (
              <Badge key={type} variant="outline" className="text-xs">
                {type} ({count})
              </Badge>
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(ecosystem.lastUpdated, { addSuffix: true })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface EcosystemDetailsProps {
  ecosystem: ContractEcosystem
  chainId: number | null
}

function EcosystemDetails({ ecosystem, chainId }: EcosystemDetailsProps) {
  const getContractTypeIcon = (type: ContractType) => {
    switch (type) {
      case 'ERC20': return <Coins className="w-4 h-4" />
      case 'ERC1155': return <Coins className="w-4 h-4" />
      case 'Settlement': return <Network className="w-4 h-4" />
      case 'AccessControl': return <Shield className="w-4 h-4" />
      case 'Registry': return <Settings className="w-4 h-4" />
      default: return <Settings className="w-4 h-4" />
    }
  }

  const getContractTypeColor = (type: ContractType): string => {
    switch (type) {
      case 'ERC20': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'ERC1155': return 'text-green-600 bg-green-50 border-green-200'
      case 'Settlement': return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'AccessControl': return 'text-red-600 bg-red-50 border-red-200'
      case 'Registry': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ecosystem.name}</CardTitle>
        <CardDescription>
          Contract ecosystem deployed on {chainId ? `Chain ${chainId}` : 'Unknown Network'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <EcosystemOverview ecosystem={ecosystem} />
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4">
            <ContractsList 
              contracts={ecosystem.contracts} 
              chainId={chainId}
              getTypeIcon={getContractTypeIcon}
              getTypeColor={getContractTypeColor}
            />
          </TabsContent>

          <TabsContent value="relationships" className="space-y-4">
            <ContractRelationships relationships={ecosystem.relationships} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <EcosystemAnalytics ecosystem={ecosystem} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function EcosystemOverview({ ecosystem }: { ecosystem: ContractEcosystem }) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {ecosystem.stats.totalContracts}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Contracts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {ecosystem.stats.deploymentSuccessRate.toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Success Rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {ecosystem.stats.totalGasUsed.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Gas Used
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {Object.keys(ecosystem.stats.contractTypes).length}
            </div>
            <div className="text-sm text-muted-foreground">
              Contract Types
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contract Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(ecosystem.stats.contractTypes).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="font-medium">{type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {count} contract{count !== 1 ? 's' : ''}
                  </span>
                  <Badge variant="outline">
                    {((count / ecosystem.stats.totalContracts) * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface ContractsListProps {
  contracts: DeployedContract[]
  chainId: number | null
  getTypeIcon: (type: ContractType) => React.ReactNode
  getTypeColor: (type: ContractType) => string
}

function ContractsList({ contracts, chainId, getTypeIcon, getTypeColor }: ContractsListProps) {
  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Settings className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Contracts Deployed</h3>
          <p className="text-muted-foreground">
            This ecosystem has no deployed contracts yet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {contracts.map(contract => (
        <Card key={contract.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={getTypeColor(contract.type)}>
                  {getTypeIcon(contract.type)}
                  <span className="ml-1">{contract.type}</span>
                </Badge>
                <div>
                  <div className="font-medium">{contract.name}</div>
                  <div className="text-sm font-mono text-muted-foreground">
                    {contract.address}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right text-sm">
                  <div className="text-muted-foreground">Gas Used</div>
                  <div className="font-medium">{contract.gasUsed.toLocaleString()}</div>
                </div>
                {chainId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getAddressUrl(chainId, contract.address), '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ContractRelationships({ relationships }: { relationships: ContractRelationship[] }) {
  if (relationships.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Network className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Relationships Defined</h3>
          <p className="text-muted-foreground">
            Contract relationships will appear here when configured
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {relationships.map((relationship, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{relationship.description}</div>
                <div className="text-sm text-muted-foreground">
                  {relationship.from} → {relationship.to}
                </div>
              </div>
              <Badge variant="outline">{relationship.type}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EcosystemAnalytics({ ecosystem }: { ecosystem: ContractEcosystem }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deployment Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Average Gas per Contract</span>
              <span className="font-mono">
                {ecosystem.stats.averageGasPerContract.toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Most Common Contract Type</span>
              <span className="font-medium">
                {Object.entries(ecosystem.stats.contractTypes)
                  .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Last Updated</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(ecosystem.lastUpdated, { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}