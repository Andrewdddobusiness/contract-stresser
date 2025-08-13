'use client'

import { useState, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  Star, 
  Download,
  Calendar,
  Tag,
  User,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { TemplateCategory, TemplateSearchQuery } from '@/services/templates/templateEngine'

interface TemplateSearchFiltersProps {
  onSearchChange: (query: TemplateSearchQuery) => void
  totalResults: number
  isLoading?: boolean
  className?: string
}

interface FilterState {
  query: string
  categories: TemplateCategory[]
  difficulties: string[]
  tags: string[]
  minRating: number
  sortBy: 'rating' | 'downloads' | 'recent' | 'name'
  dateRange: 'all' | '1d' | '7d' | '30d' | '90d'
  hasParameters: boolean | null
  verifiedOnly: boolean
}

const INITIAL_FILTER_STATE: FilterState = {
  query: '',
  categories: [],
  difficulties: [],
  tags: [],
  minRating: 0,
  sortBy: 'rating',
  dateRange: 'all',
  hasParameters: null,
  verifiedOnly: false
}

const CATEGORIES: TemplateCategory[] = ['DeFi', 'NFT', 'Governance', 'Gaming', 'Utility', 'Advanced']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert']
const POPULAR_TAGS = [
  'swap', 'liquidity', 'staking', 'farming', 'lending', 'voting', 'auction',
  'bridge', 'multisig', 'proxy', 'factory', 'oracle', 'flash-loan'
]

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated', icon: Star },
  { value: 'downloads', label: 'Most Downloaded', icon: Download },
  { value: 'recent', label: 'Recently Updated', icon: Calendar },
  { value: 'name', label: 'Name (A-Z)', icon: Tag }
] as const

export function TemplateSearchFilters({ 
  onSearchChange, 
  totalResults, 
  isLoading, 
  className 
}: TemplateSearchFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER_STATE)
  const [customTag, setCustomTag] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState({
    categories: true,
    difficulty: false,
    rating: false,
    tags: false,
    advanced: false
  })

  // Debounced search function
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return (searchQuery: TemplateSearchQuery) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        onSearchChange(searchQuery)
      }, 300)
    }
  }, [onSearchChange])

  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates }
    setFilters(newFilters)
    
    // Convert to search query format
    const searchQuery: TemplateSearchQuery = {
      query: newFilters.query || undefined,
      category: newFilters.categories.length === 1 ? newFilters.categories[0] : undefined,
      difficulty: newFilters.difficulties.length > 0 ? newFilters.difficulties : undefined,
      tags: newFilters.tags.length > 0 ? newFilters.tags : undefined,
      minRating: newFilters.minRating > 0 ? newFilters.minRating : undefined,
      sortBy: newFilters.sortBy
    }
    
    debouncedSearch(searchQuery)
  }, [filters, debouncedSearch])

  const toggleCategory = (category: TemplateCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category]
    updateFilters({ categories: newCategories })
  }

  const toggleDifficulty = (difficulty: string) => {
    const newDifficulties = filters.difficulties.includes(difficulty)
      ? filters.difficulties.filter(d => d !== difficulty)
      : [...filters.difficulties, difficulty]
    updateFilters({ difficulties: newDifficulties })
  }

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    updateFilters({ tags: newTags })
  }

  const addCustomTag = () => {
    if (customTag && !filters.tags.includes(customTag)) {
      updateFilters({ tags: [...filters.tags, customTag] })
      setCustomTag('')
    }
  }

  const clearAllFilters = () => {
    setFilters(INITIAL_FILTER_STATE)
    setCustomTag('')
    onSearchChange({})
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.query) count++
    if (filters.categories.length) count++
    if (filters.difficulties.length) count++
    if (filters.tags.length) count++
    if (filters.minRating > 0) count++
    if (filters.hasParameters !== null) count++
    if (filters.verifiedOnly) count++
    if (filters.dateRange !== 'all') count++
    return count
  }

  const toggleFilterSection = (section: keyof typeof filtersOpen) => {
    setFiltersOpen(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          value={filters.query}
          onChange={(e) => updateFilters({ query: e.target.value })}
          placeholder="Search templates..."
          className="pl-10 pr-10"
        />
        {filters.query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateFilters({ query: '' })}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Sort and Results */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Select 
            value={filters.sortBy} 
            onValueChange={(value: any) => updateFilters({ sortBy: value })}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => {
                const Icon = option.icon
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-1">
                {getActiveFilterCount()}
              </Badge>
            )}
          </Button>
        </div>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            <span>{totalResults.toLocaleString()} templates found</span>
          )}
        </div>
      </div>

      {/* Active Filters */}
      {getActiveFilterCount() > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Active filters:</span>
          
          {filters.query && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>"{filters.query}"</span>
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilters({ query: '' })} 
              />
            </Badge>
          )}
          
          {filters.categories.map(category => (
            <Badge key={category} variant="secondary" className="flex items-center space-x-1">
              <span>{category}</span>
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => toggleCategory(category)} 
              />
            </Badge>
          ))}
          
          {filters.difficulties.map(difficulty => (
            <Badge key={difficulty} variant="secondary" className="flex items-center space-x-1">
              <span>{difficulty}</span>
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => toggleDifficulty(difficulty)} 
              />
            </Badge>
          ))}
          
          {filters.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
              <span>#{tag}</span>
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => toggleTag(tag)} 
              />
            </Badge>
          ))}
          
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Categories */}
            <Collapsible open={filtersOpen.categories} onOpenChange={() => toggleFilterSection('categories')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Categories</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", filtersOpen.categories && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(category => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={filters.categories.includes(category)}
                        onCheckedChange={() => toggleCategory(category)}
                      />
                      <Label htmlFor={`category-${category}`} className="text-sm">
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Difficulty */}
            <Collapsible open={filtersOpen.difficulty} onOpenChange={() => toggleFilterSection('difficulty')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Difficulty</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", filtersOpen.difficulty && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTIES.map(difficulty => (
                    <div key={difficulty} className="flex items-center space-x-2">
                      <Checkbox
                        id={`difficulty-${difficulty}`}
                        checked={filters.difficulties.includes(difficulty)}
                        onCheckedChange={() => toggleDifficulty(difficulty)}
                      />
                      <Label htmlFor={`difficulty-${difficulty}`} className="text-sm capitalize">
                        {difficulty}
                      </Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Rating */}
            <Collapsible open={filtersOpen.rating} onOpenChange={() => toggleFilterSection('rating')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Minimum Rating</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", filtersOpen.rating && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                <div className="px-2">
                  <Slider
                    value={[filters.minRating]}
                    onValueChange={([value]) => updateFilters({ minRating: value })}
                    min={0}
                    max={5}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Any rating</span>
                    <span>{filters.minRating}+ stars</span>
                    <span>5 stars</span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Tags */}
            <Collapsible open={filtersOpen.tags} onOpenChange={() => toggleFilterSection('tags')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Tags</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", filtersOpen.tags && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-2">
                <div className="flex space-x-2">
                  <Input
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Add custom tag..."
                    onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={addCustomTag} disabled={!customTag}>
                    Add
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Popular Tags</Label>
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_TAGS.map(tag => (
                      <Badge
                        key={tag}
                        variant={filters.tags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleTag(tag)}
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Advanced Options */}
            <Collapsible open={filtersOpen.advanced} onOpenChange={() => toggleFilterSection('advanced')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Advanced Options</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", filtersOpen.advanced && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verified-only"
                    checked={filters.verifiedOnly}
                    onCheckedChange={(checked) => updateFilters({ verifiedOnly: !!checked })}
                  />
                  <Label htmlFor="verified-only" className="text-sm flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>Verified authors only</span>
                  </Label>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date Range</Label>
                  <Select 
                    value={filters.dateRange} 
                    onValueChange={(value: any) => updateFilters({ dateRange: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="1d">Last 24 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}
    </div>
  )
}