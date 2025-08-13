'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  History, 
  GitBranch, 
  Tag, 
  Clock, 
  User, 
  ArrowRight, 
  GitMerge,
  GitCommit,
  Eye,
  RotateCcw,
  Copy,
  Download,
  Plus,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { 
  FlowVersion, 
  FlowBranch, 
  VersionTag,
  flowVersioningService 
} from '@/services/versioning/flowVersioning'
import { VersionCard } from './VersionCard'
import { VersionComparison } from './VersionComparison'
import { useFlowVersions } from '@/hooks/useFlowVersions'
import { formatDistanceToNow } from 'date-fns'

interface VersionHistoryProps {
  flowId: string
  onRevertToVersion?: (version: FlowVersion) => void
  onCompareVersions?: (versionA: FlowVersion, versionB: FlowVersion) => void
  onCreateVersion?: () => void
  onCreateBranch?: (version: FlowVersion) => void
  className?: string
}

type ViewMode = 'timeline' | 'tree' | 'comparison'

export function VersionHistory({ 
  flowId, 
  onRevertToVersion,
  onCompareVersions,
  onCreateVersion,
  onCreateBranch,
  className 
}: VersionHistoryProps) {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set(['main']))
  const [showTags, setShowTags] = useState(true)

  const { 
    versions, 
    branches, 
    tags, 
    currentVersion, 
    isLoading, 
    error 
  } = useFlowVersions(flowId)

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId)
      } else if (prev.length < 2) {
        return [...prev, versionId]
      } else {
        // Replace the first selected version
        return [prev[1], versionId]
      }
    })
  }

  const handleCompareSelected = () => {
    if (selectedVersions.length === 2) {
      const versionA = versions.find(v => v.id === selectedVersions[0])
      const versionB = versions.find(v => v.id === selectedVersions[1])
      if (versionA && versionB) {
        onCompareVersions?.(versionA, versionB)
      }
    }
  }

  const handleRevertToVersion = (version: FlowVersion) => {
    onRevertToVersion?.(version)
  }

  const handleCreateBranch = (version: FlowVersion) => {
    onCreateBranch?.(version)
  }

  const toggleBranchExpansion = (branchName: string) => {
    setExpandedBranches(prev => {
      const newSet = new Set(prev)
      if (newSet.has(branchName)) {
        newSet.delete(branchName)
      } else {
        newSet.add(branchName)
      }
      return newSet
    })
  }

  // Group versions by branch
  const versionsByBranch = versions.reduce((acc, version) => {
    const branch = version.branch || 'main'
    if (!acc[branch]) {
      acc[branch] = []
    }
    acc[branch].push(version)
    return acc
  }, {} as Record<string, FlowVersion[]>)

  if (isLoading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading version history...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load version history: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>Version History</span>
            <Badge variant="outline" className="ml-2">
              {versions.length} version{versions.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="rounded-r-none"
              >
                <Clock className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'tree' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('tree')}
                className="rounded-none border-x"
              >
                <GitBranch className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'comparison' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('comparison')}
                className="rounded-l-none"
                disabled={selectedVersions.length !== 2}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>

            {onCreateVersion && (
              <Button onClick={onCreateVersion} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                New Version
              </Button>
            )}
          </div>
        </div>

        {/* Selection Actions */}
        {selectedVersions.length > 0 && (
          <div className="flex items-center space-x-2 mt-3 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedVersions.length} version{selectedVersions.length !== 1 ? 's' : ''} selected
            </span>
            
            {selectedVersions.length === 2 && (
              <Button size="sm" onClick={handleCompareSelected}>
                <Eye className="w-4 h-4 mr-1" />
                Compare
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedVersions([])}
            >
              Clear Selection
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1">
          {/* Timeline View */}
          {viewMode === 'timeline' && (
            <div className="p-6 space-y-4">
              {versions.length === 0 ? (
                <div className="text-center py-8">
                  <GitCommit className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No versions yet</p>
                  <p className="text-muted-foreground mb-4">
                    Create your first version to start tracking changes
                  </p>
                  {onCreateVersion && (
                    <Button onClick={onCreateVersion}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Version
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {versions.map((version, index) => (
                    <VersionCard
                      key={version.id}
                      version={version}
                      isCurrent={version.id === currentVersion}
                      isSelected={selectedVersions.includes(version.id)}
                      onSelect={() => handleVersionSelect(version.id)}
                      onRevert={() => handleRevertToVersion(version)}
                      onCreateBranch={() => handleCreateBranch(version)}
                      showConnector={index < versions.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tree View */}
          {viewMode === 'tree' && (
            <div className="p-6">
              <div className="space-y-6">
                {Object.entries(versionsByBranch).map(([branchName, branchVersions]) => {
                  const isExpanded = expandedBranches.has(branchName)
                  const branch = branches.find(b => b.name === branchName)
                  
                  return (
                    <div key={branchName} className="space-y-3">
                      {/* Branch Header */}
                      <div 
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50"
                        onClick={() => toggleBranchExpansion(branchName)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <GitBranch className="w-4 h-4 text-primary" />
                        <span className="font-medium">{branchName}</span>
                        <Badge variant="outline" className="text-xs">
                          {branchVersions.length} version{branchVersions.length !== 1 ? 's' : ''}
                        </Badge>
                        
                        {branch && (
                          <Badge 
                            variant={branch.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {branch.status}
                          </Badge>
                        )}
                      </div>

                      {/* Branch Versions */}
                      {isExpanded && (
                        <div className="ml-6 space-y-3 border-l-2 border-muted pl-4">
                          {branchVersions.map(version => (
                            <VersionCard
                              key={version.id}
                              version={version}
                              isCurrent={version.id === currentVersion}
                              isSelected={selectedVersions.includes(version.id)}
                              onSelect={() => handleVersionSelect(version.id)}
                              onRevert={() => handleRevertToVersion(version)}
                              onCreateBranch={() => handleCreateBranch(version)}
                              compact
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Tags Section */}
              {tags.length > 0 && showTags && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center space-x-2">
                        <Tag className="w-4 h-4 text-primary" />
                        <span>Tags</span>
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTags(!showTags)}
                      >
                        Hide
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => {
                        const tagVersion = versions.find(v => v.id === tag.versionId)
                        return (
                          <Badge
                            key={tag.name}
                            variant="outline"
                            className="flex items-center space-x-1 cursor-pointer hover:bg-muted"
                            onClick={() => tagVersion && handleVersionSelect(tagVersion.id)}
                          >
                            <Tag className="w-3 h-3" />
                            <span>{tag.name}</span>
                            <span className="text-muted-foreground">
                              ({tagVersion?.version || 'unknown'})
                            </span>
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Comparison View */}
          {viewMode === 'comparison' && selectedVersions.length === 2 && (
            <div className="p-6">
              <VersionComparison
                versionAId={selectedVersions[0]}
                versionBId={selectedVersions[1]}
                flowId={flowId}
              />
            </div>
          )}

          {/* Comparison Placeholder */}
          {viewMode === 'comparison' && selectedVersions.length !== 2 && (
            <div className="p-6 text-center py-12">
              <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Select Two Versions</p>
              <p className="text-muted-foreground mb-4">
                Choose two versions from the timeline to compare their differences
              </p>
              <Button
                variant="outline"
                onClick={() => setViewMode('timeline')}
              >
                Back to Timeline
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}