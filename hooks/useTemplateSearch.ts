'use client'

import { useState, useEffect } from 'react'
import { 
  FlowTemplate, 
  TemplateSearchQuery, 
  flowTemplateService 
} from '@/services/templates/templateEngine'

interface UseTemplateSearchResult {
  templates: FlowTemplate[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useTemplateSearch(query: TemplateSearchQuery): UseTemplateSearchResult {
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchTemplates = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const results = await flowTemplateService.searchTemplates(query)
      setTemplates(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search templates')
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    searchTemplates()
  }, [
    query.query,
    query.category,
    query.difficulty?.join(','),
    query.tags?.join(','),
    query.author,
    query.minRating,
    query.sortBy,
    query.limit,
    query.offset
  ])

  return {
    templates,
    isLoading,
    error,
    refetch: searchTemplates
  }
}