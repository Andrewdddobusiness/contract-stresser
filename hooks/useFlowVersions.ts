'use client'

import { useState, useEffect } from 'react'
import { 
  FlowVersion, 
  FlowBranch, 
  VersionTag,
  flowVersioningService 
} from '@/services/versioning/flowVersioning'

interface UseFlowVersionsResult {
  versions: FlowVersion[]
  branches: FlowBranch[]
  tags: VersionTag[]
  currentVersion: string | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useFlowVersions(flowId: string): UseFlowVersionsResult {
  const [versions, setVersions] = useState<FlowVersion[]>([])
  const [branches, setBranches] = useState<FlowBranch[]>([])
  const [tags, setTags] = useState<VersionTag[]>([])
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadVersionData = async () => {
    if (!flowId) return

    setIsLoading(true)
    setError(null)

    try {
      // Load versions
      const versionHistory = flowVersioningService.getVersionHistory(flowId)
      setVersions(versionHistory)
      
      // Set current version (most recent published version)
      const current = versionHistory.find(v => v.status === 'published') || versionHistory[0]
      setCurrentVersion(current?.id || null)

      // Load branches
      const flowBranches = flowVersioningService.getBranches(flowId)
      setBranches(flowBranches)

      // Load tags
      const flowTags = flowVersioningService.getTags(flowId)
      setTags(flowTags)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version data')
      setVersions([])
      setBranches([])
      setTags([])
      setCurrentVersion(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVersionData()
  }, [flowId])

  return {
    versions,
    branches,
    tags,
    currentVersion,
    isLoading,
    error,
    refetch: loadVersionData
  }
}