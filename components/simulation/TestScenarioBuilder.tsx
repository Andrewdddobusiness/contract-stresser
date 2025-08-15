'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Clock,
  Users,
  DollarSign,
  Activity,
  Network,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  Save,
  Play,
  RotateCcw,
  Copy,
  Trash2,
  Info,
  Lightbulb,
  BarChart3
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Address, parseEther, parseGwei } from 'viem'
import { 
  TestScenario, 
  MarketConditions, 
  NetworkConditions, 
  UserBehavior, 
  ExternalFactor 
} from '@/services/testing/flowTesting'
import { 
  BUILT_IN_SCENARIOS, 
  scenarioGenerator,
  ScenarioGenerationConfig
} from '@/services/simulation/scenarioGenerator'

interface TestScenarioBuilderProps {
  onScenarioCreate?: (scenario: TestScenario) => void
  onScenarioSave?: (scenario: TestScenario) => void
  initialScenario?: Partial<TestScenario>
  className?: string
}

interface TokenPriceConfig {
  address: string
  name: string
  price: string
  enabled: boolean
}

interface LiquidityPoolConfig {
  pair: string
  liquidity: number
  enabled: boolean
}

interface BehaviorPattern {
  id: string
  name: string
  description: string
  enabled: boolean
}

const DEFAULT_TOKENS: TokenPriceConfig[] = [
  { address: '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e', name: 'ETH', price: '2000', enabled: true },
  { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', name: 'DAI', price: '1', enabled: true },
  { address: '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d', name: 'USDC', price: '1', enabled: true }
]

const DEFAULT_POOLS: LiquidityPoolConfig[] = [
  { pair: 'ETH/DAI', liquidity: 1000000, enabled: true },
  { pair: 'ETH/USDC', liquidity: 800000, enabled: true },
  { pair: 'DAI/USDC', liquidity: 500000, enabled: true }
]

const BEHAVIOR_PATTERNS: BehaviorPattern[] = [
  { id: 'normal_trading', name: 'Normal Trading', description: 'Regular trading patterns', enabled: true },
  { id: 'hodling', name: 'HODLing', description: 'Long-term holding behavior', enabled: false },
  { id: 'panic_selling', name: 'Panic Selling', description: 'Rapid sell-offs during volatility', enabled: false },
  { id: 'arbitrage', name: 'Arbitrage', description: 'Price difference exploitation', enabled: false },
  { id: 'mev_extraction', name: 'MEV Extraction', description: 'Maximal Extractable Value strategies', enabled: false },
  { id: 'flash_loan_arbitrage', name: 'Flash Loan Arbitrage', description: 'Using flash loans for arbitrage', enabled: false },
  { id: 'gas_optimization', name: 'Gas Optimization', description: 'Gas-efficient transaction patterns', enabled: false },
  { id: 'batching', name: 'Transaction Batching', description: 'Grouping multiple operations', enabled: false }
]

interface MarketConditionsFormProps {
  conditions: MarketConditions
  onChange: (conditions: MarketConditions) => void
}

function MarketConditionsForm({ conditions, onChange }: MarketConditionsFormProps) {
  const [tokens, setTokens] = useState<TokenPriceConfig[]>(DEFAULT_TOKENS)
  const [pools, setPools] = useState<LiquidityPoolConfig[]>(DEFAULT_POOLS)
  const [volatility, setVolatility] = useState([conditions.volatility * 100])
  const [slippage, setSlippage] = useState([conditions.slippage * 100])
  const [volumeEth, setVolumeEth] = useState(Number(conditions.tradingVolume) / 1e18)

  useEffect(() => {
    const tokenPrices: Record<Address, bigint> = {}
    tokens.filter(t => t.enabled).forEach(token => {
      tokenPrices[token.address as Address] = parseEther(token.price || '0')
    })

    const liquidityLevels: Record<string, number> = {}
    pools.filter(p => p.enabled).forEach(pool => {
      liquidityLevels[pool.pair] = pool.liquidity
    })

    onChange({
      ...conditions,
      tokenPrices,
      liquidityLevels,
      volatility: volatility[0] / 100,
      slippage: slippage[0] / 100,
      tradingVolume: parseEther(volumeEth.toString())
    })
  }, [tokens, pools, volatility, slippage, volumeEth])

  const updateToken = (index: number, updates: Partial<TokenPriceConfig>) => {
    setTokens(prev => prev.map((token, i) => i === index ? { ...token, ...updates } : token))
  }

  const updatePool = (index: number, updates: Partial<LiquidityPoolConfig>) => {
    setPools(prev => prev.map((pool, i) => i === index ? { ...pool, ...updates } : pool))
  }

  return (
    <div className="space-y-6">
      {/* Token Prices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <span>Token Prices</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tokens.map((token, index) => (
            <div key={token.address} className="flex items-center space-x-3">
              <Switch
                checked={token.enabled}
                onCheckedChange={(enabled) => updateToken(index, { enabled })}
              />
              <Badge variant="outline" className="w-16 justify-center">
                {token.name}
              </Badge>
              <Input
                type="number"
                step="0.01"
                value={token.price}
                onChange={(e) => updateToken(index, { price: e.target.value })}
                disabled={!token.enabled}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">USD</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Liquidity Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Liquidity Pools</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pools.map((pool, index) => (
            <div key={pool.pair} className="flex items-center space-x-3">
              <Switch
                checked={pool.enabled}
                onCheckedChange={(enabled) => updatePool(index, { enabled })}
              />
              <Badge variant="outline" className="w-20 justify-center">
                {pool.pair}
              </Badge>
              <Input
                type="number"
                step="1000"
                value={pool.liquidity}
                onChange={(e) => updatePool(index, { liquidity: parseInt(e.target.value) || 0 })}
                disabled={!pool.enabled}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">USD</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Market Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Market Parameters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Volatility: {volatility[0].toFixed(1)}%</Label>
            <Slider
              value={volatility}
              onValueChange={setVolatility}
              max={100}
              step={0.1}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Slippage: {slippage[0].toFixed(2)}%</Label>
            <Slider
              value={slippage}
              onValueChange={setSlippage}
              max={10}
              step={0.01}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="volume">Trading Volume (ETH)</Label>
            <Input
              id="volume"
              type="number"
              value={volumeEth}
              onChange={(e) => setVolumeEth(parseFloat(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface NetworkConditionsFormProps {
  conditions: NetworkConditions
  onChange: (conditions: NetworkConditions) => void
}

function NetworkConditionsForm({ conditions, onChange }: NetworkConditionsFormProps) {
  const [gasPrice, setGasPrice] = useState(Number(conditions.gasPrice) / 1e9)
  const [blockTime, setBlockTime] = useState(conditions.blockTime)
  const [congestion, setCongestion] = useState(conditions.congestion)
  const [mempoolSize, setMempoolSize] = useState(conditions.mempoolSize)

  useEffect(() => {
    onChange({
      gasPrice: parseGwei(gasPrice.toString()),
      blockTime,
      congestion,
      mempoolSize
    })
  }, [gasPrice, blockTime, congestion, mempoolSize])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="gas-price">Gas Price (gwei)</Label>
          <Input
            id="gas-price"
            type="number"
            value={gasPrice}
            onChange={(e) => setGasPrice(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="block-time">Block Time (seconds)</Label>
          <Input
            id="block-time"
            type="number"
            value={blockTime}
            onChange={(e) => setBlockTime(parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label>Network Congestion</Label>
        <Select value={congestion} onValueChange={(value: any) => setCongestion(value)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="mempool-size">Mempool Size (transactions)</Label>
        <Input
          id="mempool-size"
          type="number"
          value={mempoolSize}
          onChange={(e) => setMempoolSize(parseInt(e.target.value) || 0)}
          className="mt-1"
        />
      </div>
    </div>
  )
}

interface UserBehaviorFormProps {
  behavior: UserBehavior
  onChange: (behavior: UserBehavior) => void
}

function UserBehaviorForm({ behavior, onChange }: UserBehaviorFormProps) {
  const [concurrentUsers, setConcurrentUsers] = useState(behavior.concurrentUsers)
  const [frequency, setFrequency] = useState(behavior.transactionFrequency)
  const [avgSize, setAvgSize] = useState(Number(behavior.averageTransactionSize) / 1e18)
  const [patterns, setPatterns] = useState<BehaviorPattern[]>(
    BEHAVIOR_PATTERNS.map(p => ({
      ...p,
      enabled: behavior.behaviorPatterns.includes(p.id)
    }))
  )

  useEffect(() => {
    onChange({
      concurrentUsers,
      transactionFrequency: frequency,
      averageTransactionSize: parseEther(avgSize.toString()),
      behaviorPatterns: patterns.filter(p => p.enabled).map(p => p.id)
    })
  }, [concurrentUsers, frequency, avgSize, patterns])

  const togglePattern = (patternId: string) => {
    setPatterns(prev => prev.map(p => 
      p.id === patternId ? { ...p, enabled: !p.enabled } : p
    ))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="concurrent-users">Concurrent Users</Label>
          <Input
            id="concurrent-users"
            type="number"
            value={concurrentUsers}
            onChange={(e) => setConcurrentUsers(parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="frequency">Transaction Frequency (per second)</Label>
          <Input
            id="frequency"
            type="number"
            step="0.1"
            value={frequency}
            onChange={(e) => setFrequency(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="avg-size">Average Transaction Size (ETH)</Label>
        <Input
          id="avg-size"
          type="number"
          step="0.01"
          value={avgSize}
          onChange={(e) => setAvgSize(parseFloat(e.target.value) || 0)}
          className="mt-1"
        />
      </div>

      <div>
        <Label>Behavior Patterns</Label>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {patterns.map(pattern => (
            <div key={pattern.id} className="flex items-center space-x-3 p-2 rounded border">
              <Switch
                checked={pattern.enabled}
                onCheckedChange={() => togglePattern(pattern.id)}
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{pattern.name}</div>
                <div className="text-xs text-muted-foreground">{pattern.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ExternalFactorsFormProps {
  factors: ExternalFactor[]
  onChange: (factors: ExternalFactor[]) => void
}

function ExternalFactorsForm({ factors, onChange }: ExternalFactorsFormProps) {
  const [expandedFactors, setExpandedFactors] = useState<Set<number>>(new Set())

  const addFactor = () => {
    const newFactor: ExternalFactor = {
      type: 'oracle_price',
      description: 'New external factor',
      impact: 'medium',
      parameters: {}
    }
    onChange([...factors, newFactor])
  }

  const updateFactor = (index: number, updates: Partial<ExternalFactor>) => {
    onChange(factors.map((factor, i) => i === index ? { ...factor, ...updates } : factor))
  }

  const removeFactor = (index: number) => {
    onChange(factors.filter((_, i) => i !== index))
  }

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedFactors)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedFactors(newExpanded)
  }

  return (
    <div className="space-y-4">
      {factors.map((factor, index) => (
        <Card key={index}>
          <Collapsible 
            open={expandedFactors.has(index)} 
            onOpenChange={() => toggleExpanded(index)}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {expandedFactors.has(index) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <CardTitle className="text-sm">{factor.description}</CardTitle>
                    <Badge variant={
                      factor.impact === 'high' ? 'destructive' : 
                      factor.impact === 'medium' ? 'default' : 'secondary'
                    }>
                      {factor.impact}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFactor(index)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                <div>
                  <Label>Type</Label>
                  <Select 
                    value={factor.type} 
                    onValueChange={(value: any) => updateFactor(index, { type: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oracle_price">Oracle Price</SelectItem>
                      <SelectItem value="liquidity_change">Liquidity Change</SelectItem>
                      <SelectItem value="governance_action">Governance Action</SelectItem>
                      <SelectItem value="external_call">External Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    value={factor.description}
                    onChange={(e) => updateFactor(index, { description: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Impact Level</Label>
                  <Select 
                    value={factor.impact} 
                    onValueChange={(value: any) => updateFactor(index, { impact: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Type-specific parameters could be added here */}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      <Button onClick={addFactor} variant="outline" className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add External Factor
      </Button>
    </div>
  )
}

interface ScenarioTemplatesProps {
  onSelectTemplate: (scenario: TestScenario) => void
}

function ScenarioTemplates({ onSelectTemplate }: ScenarioTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {BUILT_IN_SCENARIOS.map((scenario, index) => (
          <Card 
            key={index}
            className={cn(
              "cursor-pointer transition-colors hover:bg-muted/50",
              selectedTemplate === scenario.name && "ring-2 ring-primary"
            )}
            onClick={() => {
              setSelectedTemplate(scenario.name)
              onSelectTemplate(scenario)
            }}
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{scenario.name}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {scenario.userBehavior.concurrentUsers} users
                    </Badge>
                    <Badge variant="outline">
                      {(scenario.marketConditions.volatility * 100).toFixed(1)}% volatility
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {scenario.description}
                </p>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <Zap className="w-3 h-3 mr-1" />
                    {Number(scenario.networkConditions.gasPrice) / 1e9} gwei
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {scenario.networkConditions.blockTime}s blocks
                  </span>
                  <span className="flex items-center">
                    <Network className="w-3 h-3 mr-1" />
                    {scenario.networkConditions.congestion} congestion
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function TestScenarioBuilder({ 
  onScenarioCreate, 
  onScenarioSave, 
  initialScenario, 
  className 
}: TestScenarioBuilderProps) {
  const [scenario, setScenario] = useState<TestScenario>({
    name: initialScenario?.name || 'Custom Scenario',
    description: initialScenario?.description || 'User-defined test scenario',
    marketConditions: initialScenario?.marketConditions || {
      tokenPrices: {
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('2000'),
        '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'),
        '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'),
      },
      liquidityLevels: {
        'ETH/DAI': 1000000,
        'ETH/USDC': 800000,
        'DAI/USDC': 500000
      },
      volatility: 0.1,
      tradingVolume: parseEther('10000000'),
      slippage: 0.005
    },
    networkConditions: initialScenario?.networkConditions || {
      gasPrice: parseGwei('20'),
      blockTime: 12,
      congestion: 'low',
      mempoolSize: 1000
    },
    userBehavior: initialScenario?.userBehavior || {
      concurrentUsers: 10,
      transactionFrequency: 1,
      averageTransactionSize: parseEther('1'),
      behaviorPatterns: ['normal_trading']
    },
    externalFactors: initialScenario?.externalFactors || []
  })

  const [activeTab, setActiveTab] = useState('basic')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const validateScenario = (): boolean => {
    const errors: string[] = []

    if (!scenario.name.trim()) {
      errors.push('Scenario name is required')
    }

    if (scenario.userBehavior.concurrentUsers <= 0) {
      errors.push('Concurrent users must be greater than 0')
    }

    if (scenario.networkConditions.blockTime <= 0) {
      errors.push('Block time must be greater than 0')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSaveScenario = () => {
    if (validateScenario()) {
      onScenarioSave?.(scenario)
    }
  }

  const handleCreateTest = () => {
    if (validateScenario()) {
      onScenarioCreate?.(scenario)
    }
  }

  const handleTemplateSelect = (template: TestScenario) => {
    setScenario({ ...template })
  }

  const handleReset = () => {
    setScenario({
      name: 'Custom Scenario',
      description: 'User-defined test scenario',
      marketConditions: {
        tokenPrices: {
          '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8e' as Address: parseEther('2000'),
          '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address: parseEther('1'),
          '0xA0b86a33E6441e47fe7b8c8d08E924c2Da7d1c8d' as Address: parseEther('1'),
        },
        liquidityLevels: {
          'ETH/DAI': 1000000,
          'ETH/USDC': 800000,
          'DAI/USDC': 500000
        },
        volatility: 0.1,
        tradingVolume: parseEther('10000000'),
        slippage: 0.005
      },
      networkConditions: {
        gasPrice: parseGwei('20'),
        blockTime: 12,
        congestion: 'low',
        mempoolSize: 1000
      },
      userBehavior: {
        concurrentUsers: 10,
        transactionFrequency: 1,
        averageTransactionSize: parseEther('1'),
        behaviorPatterns: ['normal_trading']
      },
      externalFactors: []
    })
  }

  const scenarioAnalysis = scenarioGenerator.analyzeScenarioImpact(scenario)

  return (
    <div className={cn("test-scenario-builder space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Test Scenario Builder</span>
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Create custom test scenarios with configurable market and network conditions
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button variant="outline" onClick={handleSaveScenario}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={handleCreateTest}>
                <Play className="w-4 h-4 mr-2" />
                Create Test
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="market">Market</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
              <TabsTrigger value="factors">Factors</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-6">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label htmlFor="scenario-name">Scenario Name</Label>
                    <Input
                      id="scenario-name"
                      value={scenario.name}
                      onChange={(e) => setScenario(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="scenario-description">Description</Label>
                    <Textarea
                      id="scenario-description"
                      value={scenario.description}
                      onChange={(e) => setScenario(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Templates</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Start with a built-in scenario template
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <ScenarioTemplates onSelectTemplate={handleTemplateSelect} />
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="market" className="mt-6">
              <MarketConditionsForm
                conditions={scenario.marketConditions}
                onChange={(conditions) => setScenario(prev => ({ ...prev, marketConditions: conditions }))}
              />
            </TabsContent>

            <TabsContent value="network" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Network className="w-4 h-4" />
                    <span>Network Conditions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <NetworkConditionsForm
                    conditions={scenario.networkConditions}
                    onChange={(conditions) => setScenario(prev => ({ ...prev, networkConditions: conditions }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="behavior" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>User Behavior</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <UserBehaviorForm
                    behavior={scenario.userBehavior}
                    onChange={(behavior) => setScenario(prev => ({ ...prev, userBehavior: behavior }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="factors" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>External Factors</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Add external factors that can affect test execution
                  </p>
                </CardHeader>
                <CardContent>
                  <ExternalFactorsForm
                    factors={scenario.externalFactors}
                    onChange={(factors) => setScenario(prev => ({ ...prev, externalFactors: factors }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Scenario Analysis */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Lightbulb className="w-4 h-4" />
                <span>Scenario Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Risk Level</Label>
                <Badge 
                  className={cn(
                    "mt-1",
                    scenarioAnalysis.riskLevel === 'extreme' && "bg-red-600",
                    scenarioAnalysis.riskLevel === 'high' && "bg-orange-600",
                    scenarioAnalysis.riskLevel === 'medium' && "bg-yellow-600",
                    scenarioAnalysis.riskLevel === 'low' && "bg-green-600"
                  )}
                >
                  {scenarioAnalysis.riskLevel.toUpperCase()}
                </Badge>
              </div>

              {scenarioAnalysis.impactAreas.length > 0 && (
                <div>
                  <Label>Impact Areas</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {scenarioAnalysis.impactAreas.map(area => (
                      <Badge key={area} variant="outline" className="text-xs">
                        {area.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {scenarioAnalysis.recommendations.length > 0 && (
                <div>
                  <Label>Recommendations</Label>
                  <div className="space-y-2 mt-1">
                    {scenarioAnalysis.recommendations.map((rec, index) => (
                      <Alert key={index}>
                        <Info className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          {rec}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scenario Summary */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Concurrent Users:</span>
                <span>{scenario.userBehavior.concurrentUsers}</span>
              </div>
              <div className="flex justify-between">
                <span>Volatility:</span>
                <span>{(scenario.marketConditions.volatility * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Gas Price:</span>
                <span>{Number(scenario.networkConditions.gasPrice) / 1e9} gwei</span>
              </div>
              <div className="flex justify-between">
                <span>Network Congestion:</span>
                <span>{scenario.networkConditions.congestion}</span>
              </div>
              <div className="flex justify-between">
                <span>External Factors:</span>
                <span>{scenario.externalFactors.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}