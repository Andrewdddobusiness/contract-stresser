'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  Star, 
  Download, 
  GitFork, 
  Eye, 
  TrendingUp,
  Clock,
  User,
  Tag,
  Zap,
  Gamepad2,
  Vote,
  Palette,
  Settings,
  Award,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { 
  FlowTemplate, 
  TemplateCategory, 
  TemplateSearchQuery,
  flowTemplateService 
} from '@/services/templates/templateEngine'
import { TemplateCard } from './TemplateCard'
import { useTemplateSearch } from '@/hooks/useTemplateSearch'

interface TemplateMarketplaceProps {
  onUseTemplate?: (template: FlowTemplate) => void
  onForkTemplate?: (template: FlowTemplate) => void
  onViewTemplate?: (template: FlowTemplate) => void
  className?: string
}

interface CategoryInfo {
  id: TemplateCategory
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const TEMPLATE_CATEGORIES: CategoryInfo[] = [
  {
    id: 'DeFi',
    name: 'DeFi',
    description: 'Decentralized Finance protocols and operations',
    icon: TrendingUp,
    color: 'text-green-600 bg-green-100 border-green-300'
  },
  {
    id: 'NFT',
    name: 'NFT',
    description: 'Non-Fungible Token operations and marketplaces',
    icon: Palette,
    color: 'text-purple-600 bg-purple-100 border-purple-300'
  },
  {
    id: 'Governance',
    name: 'Governance',
    description: 'DAO governance and voting mechanisms',
    icon: Vote,
    color: 'text-blue-600 bg-blue-100 border-blue-300'
  },
  {
    id: 'Gaming',
    name: 'Gaming',
    description: 'Blockchain gaming and virtual economies',
    icon: Gamepad2,
    color: 'text-orange-600 bg-orange-100 border-orange-300'
  },
  {
    id: 'Utility',
    name: 'Utility',
    description: 'General utility functions and tools',
    icon: Settings,
    color: 'text-gray-600 bg-gray-100 border-gray-300'
  },
  {
    id: 'Advanced',
    name: 'Advanced',
    description: 'Complex multi-protocol integrations',
    icon: Zap,
    color: 'text-red-600 bg-red-100 border-red-300'
  }
]

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner', color: 'bg-green-100 text-green-800' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'advanced', label: 'Advanced', color: 'bg-orange-100 text-orange-800' },
  { value: 'expert', label: 'Expert', color: 'bg-red-100 text-red-800' }
]

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'downloads', label: 'Most Popular' },
  { value: 'recent', label: 'Recently Updated' },
  { value: 'name', label: 'Name (A-Z)' }
]

export function TemplateMarketplace({ 
  onUseTemplate, 
  onForkTemplate, 
  onViewTemplate,
  className 
}: TemplateMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null)
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'recent' | 'name'>('rating')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'browse' | 'popular' | 'recent'>('browse')

  // Build search query
  const templateSearchQuery: TemplateSearchQuery = useMemo(() => ({
    query: searchQuery || undefined,
    category: selectedCategory || undefined,
    difficulty: selectedDifficulties.length > 0 ? selectedDifficulties : undefined,
    sortBy,
    limit: 50
  }), [searchQuery, selectedCategory, selectedDifficulties, sortBy])

  // Use custom hook for template search
  const { templates, isLoading, error } = useTemplateSearch(templateSearchQuery)

  // Get popular templates
  const popularTemplates = useMemo(() => {
    return flowTemplateService.searchTemplates({ 
      sortBy: 'downloads', 
      limit: 12 
    })
  }, [])

  // Get recent templates
  const recentTemplates = useMemo(() => {
    return flowTemplateService.searchTemplates({ 
      sortBy: 'recent', 
      limit: 12 
    })
  }, [])

  const handleCategorySelect = (category: TemplateCategory | null) => {
    setSelectedCategory(category)
  }

  const handleDifficultyToggle = (difficulty: string) => {
    setSelectedDifficulties(prev => 
      prev.includes(difficulty) 
        ? prev.filter(d => d !== difficulty)
        : [...prev, difficulty]
    )
  }

  const handleUseTemplate = (template: FlowTemplate) => {
    onUseTemplate?.(template)
  }

  const handleForkTemplate = (template: FlowTemplate) => {
    onForkTemplate?.(template)
  }

  const handleViewTemplate = (template: FlowTemplate) => {
    onViewTemplate?.(template)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory(null)
    setSelectedDifficulties([])
  }

  const getCategoryIcon = (category: TemplateCategory) => {
    const categoryInfo = TEMPLATE_CATEGORIES.find(c => c.id === category)
    return categoryInfo?.icon || Settings
  }

  const getCategoryColor = (category: TemplateCategory) => {
    const categoryInfo = TEMPLATE_CATEGORIES.find(c => c.id === category)
    return categoryInfo?.color || 'text-gray-600 bg-gray-100 border-gray-300'
  }

  return (
    <div className={cn("template-marketplace h-full flex flex-col", className)}>
      {/* Header */}
      <div className="marketplace-header p-6 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center space-x-2">
              <Award className="w-6 h-6 text-primary" />
              <span>Flow Templates</span>
            </h2>
            <p className="text-muted-foreground mt-1">
              Discover and use pre-built flows for common DeFi operations
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              showFilters && "rotate-180"
            )} />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="search-section flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="filters-panel p-4 bg-muted rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Filters</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCategorySelect(null)}
                >
                  All Categories
                </Button>
                {TEMPLATE_CATEGORIES.map(category => {
                  const Icon = category.icon
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCategorySelect(category.id)}
                      className="flex items-center space-x-1"
                    >
                      <Icon className="w-3 h-3" />
                      <span>{category.name}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Difficulty</label>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_LEVELS.map(level => (
                  <Button
                    key={level.value}
                    variant={selectedDifficulties.includes(level.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDifficultyToggle(level.value)}
                  >
                    {level.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="flex-1 flex flex-col">
          <div className="border-b px-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="browse" className="flex items-center space-x-2">
                <Search className="w-4 h-4" />
                <span>Browse</span>
              </TabsTrigger>
              <TabsTrigger value="popular" className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Popular</span>
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Recent</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Browse Tab */}
          <TabsContent value="browse" className="flex-1 p-6">
            <div className="space-y-4">
              {/* Active Filters Display */}
              {(selectedCategory || selectedDifficulties.length > 0 || searchQuery) && (
                <div className="active-filters flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Active filters:</span>
                  
                  {searchQuery && (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <Search className="w-3 h-3" />
                      <span>"{searchQuery}"</span>
                    </Badge>
                  )}
                  
                  {selectedCategory && (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      {(() => {
                        const Icon = getCategoryIcon(selectedCategory)
                        return <Icon className="w-3 h-3" />
                      })()}
                      <span>{selectedCategory}</span>
                    </Badge>
                  )}
                  
                  {selectedDifficulties.map(difficulty => (
                    <Badge key={difficulty} variant="secondary">
                      {DIFFICULTY_LEVELS.find(d => d.value === difficulty)?.label}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Results */}
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading templates...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-2">Error loading templates</p>
                  <p className="text-muted-foreground text-sm">{error}</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No templates found</p>
                  <p className="text-muted-foreground">Try adjusting your search criteria</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Found {templates.length} template{templates.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <div className="templates-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {templates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onUse={handleUseTemplate}
                        onFork={handleForkTemplate}
                        onView={handleViewTemplate}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Popular Tab */}
          <TabsContent value="popular" className="flex-1 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span>Most Popular Templates</span>
                </h3>
                <Badge variant="outline">Top {popularTemplates.length}</Badge>
              </div>
              
              <div className="templates-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {popularTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={handleUseTemplate}
                    onFork={handleForkTemplate}
                    onView={handleViewTemplate}
                    showRank
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Recent Tab */}
          <TabsContent value="recent" className="flex-1 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>Recently Updated</span>
                </h3>
                <Badge variant="outline">Latest {recentTemplates.length}</Badge>
              </div>
              
              <div className="templates-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recentTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={handleUseTemplate}
                    onFork={handleForkTemplate}
                    onView={handleViewTemplate}
                    showLastUpdated
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}