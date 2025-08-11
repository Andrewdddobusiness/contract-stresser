'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Play, 
  Clock, 
  Users, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  Info,
  Filter,
  Search,
  BookOpen,
  Target,
  Gauge
} from 'lucide-react'
import { type Address } from 'viem'
import { 
  testScenariosService, 
  type ScenarioTemplate, 
  type ScenarioResult
} from '@/services/testing/scenarios'
import type { TestConfiguration } from '@/types/testing'

interface ScenarioSelectorProps {
  contractAddress?: Address
  onSelectScenario: (config: TestConfiguration) => void
  onRunScenario?: (scenarioId: string, config: TestConfiguration) => void
  disabled?: boolean
}

interface ScenarioCardProps {
  scenario: ScenarioTemplate
  onSelect: () => void
  onRun?: () => void
  disabled?: boolean
  showDetails?: boolean
}

function ScenarioCard({ scenario, onSelect, onRun, disabled, showDetails = false }: ScenarioCardProps) {
  const getDifficultyColor = (difficulty: ScenarioTemplate['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-orange-100 text-orange-800'
      case 'extreme': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: ScenarioTemplate['category']) => {
    switch (category) {
      case 'throughput': return <TrendingUp className="w-4 h-4" />
      case 'concurrency': return <Users className="w-4 h-4" />
      case 'gas': return <Zap className="w-4 h-4" />
      case 'stress': return <Target className="w-4 h-4" />
      case 'custom': return <BookOpen className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  return (
    <Card className={`h-full transition-all duration-200 hover:shadow-md ${disabled ? 'opacity-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getCategoryIcon(scenario.category)}
            <CardTitle className="text-lg">{scenario.name}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getDifficultyColor(scenario.difficulty)}>
              {scenario.difficulty}
            </Badge>
            {scenario.difficulty === 'extreme' && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
        <CardDescription className="text-sm line-clamp-2">
          {scenario.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-medium">{scenario.estimatedDuration}</span>
          </div>
          <Badge variant="outline" className="capitalize">
            {scenario.category}
          </Badge>
        </div>

        {showDetails && (
          <div className="space-y-3 pt-2 border-t">
            <div>
              <h4 className="text-sm font-medium mb-2">Requirements:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {scenario.requirements.map((req, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-xs">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Expected Outcome:</h4>
              <p className="text-xs text-muted-foreground">{scenario.expectedOutcome}</p>
            </div>
          </div>
        )}

        <div className="flex space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSelect}
            disabled={disabled}
            className="flex-1"
          >
            <Info className="w-4 h-4 mr-2" />
            Configure
          </Button>
          {onRun && (
            <Button
              size="sm"
              onClick={onRun}
              disabled={disabled}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ScenarioSelector({ 
  contractAddress, 
  onSelectScenario, 
  onRunScenario,
  disabled = false
}: ScenarioSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [customParams, setCustomParams] = useState<Record<string, string>>({})

  const allScenarios = testScenariosService.getAllScenarios()
  const categories = testScenariosService.getScenarioCategories()

  // Filter scenarios based on selected filters
  const filteredScenarios = allScenarios.filter(scenario => {
    const matchesCategory = selectedCategory === 'all' || scenario.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === 'all' || scenario.difficulty === selectedDifficulty
    const matchesSearch = !searchTerm || 
      scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scenario.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesCategory && matchesDifficulty && matchesSearch
  })

  const handleSelectScenario = (scenario: ScenarioTemplate) => {
    if (!contractAddress) return

    const config = testScenariosService.createConfigFromScenario(
      scenario.id,
      contractAddress,
      customParams
    )
    
    if (config) {
      onSelectScenario(config)
    }
  }

  const handleRunScenario = (scenario: ScenarioTemplate) => {
    if (!contractAddress || !onRunScenario) return

    const config = testScenariosService.createConfigFromScenario(
      scenario.id,
      contractAddress,
      customParams
    )
    
    if (config) {
      onRunScenario(scenario.id, config)
    }
  }

  const recommendedScenarios = testScenariosService.getRecommendedScenarios()
  const advancedScenarios = testScenariosService.getAdvancedScenarios()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Test Scenarios</h2>
            <p className="text-muted-foreground">
              Choose from predefined scenarios or configure custom tests
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Info className="w-4 h-4 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </div>

        {!contractAddress && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-yellow-800 font-medium">
                Contract address required to run scenarios
              </span>
            </div>
            <p className="text-yellow-700 text-sm mt-1">
              Deploy a contract first or enter a contract address in the configuration.
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search scenarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="All difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="extreme">Extreme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedCategory('all')
                  setSelectedDifficulty('all')
                  setSearchTerm('')
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Scenarios</TabsTrigger>
          <TabsTrigger value="recommended">Recommended</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredScenarios.length} of {allScenarios.length} scenarios
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScenarios.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onSelect={() => handleSelectScenario(scenario)}
                onRun={onRunScenario ? () => handleRunScenario(scenario) : undefined}
                disabled={disabled || !contractAddress}
                showDetails={showDetails}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommended" className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Recommended for Beginners</h3>
            <p className="text-muted-foreground text-sm">
              Start with these scenarios to understand basic stress testing concepts.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedScenarios.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onSelect={() => handleSelectScenario(scenario)}
                onRun={onRunScenario ? () => handleRunScenario(scenario) : undefined}
                disabled={disabled || !contractAddress}
                showDetails={showDetails}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span>Advanced Scenarios</span>
            </h3>
            <p className="text-muted-foreground text-sm">
              High-intensity scenarios for experienced users. Monitor system resources during execution.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {advancedScenarios.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onSelect={() => handleSelectScenario(scenario)}
                onRun={onRunScenario ? () => handleRunScenario(scenario) : undefined}
                disabled={disabled || !contractAddress}
                showDetails={showDetails}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {categories.map(category => {
            const categoryScenarios = testScenariosService.getScenariosByCategory(category.category as any)
            return (
              <div key={category.category} className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold capitalize flex items-center space-x-2">
                    <Gauge className="w-5 h-5" />
                    <span>{category.category} Tests</span>
                    <Badge variant="secondary">{category.count}</Badge>
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {category.description}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryScenarios.map(scenario => (
                    <ScenarioCard
                      key={scenario.id}
                      scenario={scenario}
                      onSelect={() => handleSelectScenario(scenario)}
                      onRun={onRunScenario ? () => handleRunScenario(scenario) : undefined}
                      disabled={disabled || !contractAddress}
                      showDetails={showDetails}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </TabsContent>
      </Tabs>

      {filteredScenarios.length === 0 && searchTerm && (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No scenarios found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}