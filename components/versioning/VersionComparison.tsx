'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  GitCompare, 
  Plus, 
  Minus, 
  Edit, 
  ArrowRight, 
  Copy,
  Download,
  Eye,
  Code,
  FileText,
  BarChart3,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { 
  VersionComparison as VersionComparisonType,
  FlowDifference,
  flowVersioningService 
} from '@/services/versioning/flowVersioning'

interface VersionComparisonProps {
  versionAId: string
  versionBId: string
  flowId: string
  className?: string
}

interface DifferenceCardProps {
  difference: FlowDifference
  index: number
}

function getImpactColor(impact: FlowDifference['impact']) {
  switch (impact) {
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

function getChangeIcon(type: FlowDifference['type']) {
  switch (type) {
    case 'addition':
      return <Plus className="w-4 h-4 text-green-600" />
    case 'deletion':
      return <Minus className="w-4 h-4 text-red-600" />
    case 'modification':
      return <Edit className="w-4 h-4 text-blue-600" />
    default:
      return <Edit className="w-4 h-4" />
  }
}

function DifferenceCard({ difference, index }: DifferenceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getChangeIcon(difference.type)}
            <div>
              <h4 className="font-medium">{difference.description}</h4>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {difference.target}
                </Badge>
                <Badge 
                  className={cn("text-xs border", getImpactColor(difference.impact))}
                >
                  {difference.impact} impact
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              #{index + 1}
            </Badge>
            
            {(difference.before || difference.after) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Hide' : 'Details'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (difference.before || difference.after) && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Path Information */}
            <div className="text-sm text-muted-foreground">
              <strong>Path:</strong> {difference.path}
              {difference.elementId && (
                <span className="ml-2">
                  <strong>Element:</strong> {difference.elementId}
                </span>
              )}
            </div>

            {/* Before/After Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Before */}
              {difference.before && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Minus className="w-3 h-3 text-red-600" />
                    <span className="text-sm font-medium text-red-600">Before</span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                    <pre className="whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                      {typeof difference.before === 'object' 
                        ? JSON.stringify(difference.before, null, 2)
                        : String(difference.before)}
                    </pre>
                  </div>
                </div>
              )}

              {/* After */}
              {difference.after && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Plus className="w-3 h-3 text-green-600" />
                    <span className="text-sm font-medium text-green-600">After</span>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                    <pre className="whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                      {typeof difference.after === 'object' 
                        ? JSON.stringify(difference.after, null, 2)
                        : String(difference.after)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function VersionComparison({ 
  versionAId, 
  versionBId, 
  flowId,
  className 
}: VersionComparisonProps) {
  const [comparison, setComparison] = useState<VersionComparisonType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'differences' | 'diff'>('summary')

  useEffect(() => {
    loadComparison()
  }, [versionAId, versionBId])

  const loadComparison = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await flowVersioningService.compareVersions(versionAId, versionBId)
      setComparison(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare versions')
    } finally {
      setIsLoading(false)
    }
  }

  const generateUnifiedDiff = () => {
    if (!comparison) return ''
    return flowVersioningService.generateDiff(versionAId, versionBId)
  }

  const downloadDiff = () => {
    const diff = generateUnifiedDiff()
    const blob = new Blob([diff], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `version-diff-${comparison?.versionA.version}-${comparison?.versionB.version}.diff`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyDiff = async () => {
    const diff = generateUnifiedDiff()
    await navigator.clipboard.writeText(diff)
  }

  if (isLoading) {
    return (
      <Card className={cn("h-96", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Comparing versions...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("h-96", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Comparison Failed</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!comparison) {
    return null
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <GitCompare className="w-5 h-5" />
            <span>Version Comparison</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={copyDiff}>
              <Copy className="w-4 h-4 mr-1" />
              Copy Diff
            </Button>
            <Button variant="outline" size="sm" onClick={downloadDiff}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Version Headers */}
        <div className="flex items-center space-x-4 mt-4 p-4 bg-muted rounded-lg">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline" className="bg-red-50 border-red-300">
                From
              </Badge>
              <span className="font-semibold">v{comparison.versionA.version}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {comparison.versionA.metadata.description}
            </p>
          </div>
          
          <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline" className="bg-green-50 border-green-300">
                To
              </Badge>
              <span className="font-semibold">v{comparison.versionB.version}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {comparison.versionB.metadata.description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="flex-1 flex flex-col">
          <div className="px-6 border-b">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="summary" className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Summary</span>
              </TabsTrigger>
              <TabsTrigger value="differences" className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Details</span>
              </TabsTrigger>
              <TabsTrigger value="diff" className="flex items-center space-x-2">
                <Code className="w-4 h-4" />
                <span>Diff</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Summary Tab */}
          <TabsContent value="summary" className="flex-1 p-6">
            <div className="space-y-6">
              {/* Summary Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      +{comparison.summary.blocksAdded}
                    </div>
                    <div className="text-sm text-muted-foreground">Blocks Added</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      -{comparison.summary.blocksRemoved}
                    </div>
                    <div className="text-sm text-muted-foreground">Blocks Removed</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ~{comparison.summary.blocksModified}
                    </div>
                    <div className="text-sm text-muted-foreground">Blocks Modified</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      +{comparison.summary.connectionsAdded}
                    </div>
                    <div className="text-sm text-muted-foreground">Connections Added</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      -{comparison.summary.connectionsRemoved}
                    </div>
                    <div className="text-sm text-muted-foreground">Connections Removed</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {comparison.summary.configChanges}
                    </div>
                    <div className="text-sm text-muted-foreground">Config Changes</div>
                  </CardContent>
                </Card>
              </div>

              {/* Impact Analysis */}
              <div>
                <h4 className="font-medium mb-3">Impact Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  {(['critical', 'high', 'medium', 'low'] as const).map(impact => {
                    const count = comparison.differences.filter(d => d.impact === impact).length
                    return (
                      <div key={impact} className={cn("p-3 rounded-lg border", getImpactColor(impact))}>
                        <div className="font-semibold">{count}</div>
                        <div className="text-xs capitalize">{impact} Impact</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Quick Overview */}
              {comparison.differences.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Recent Changes</h4>
                  <div className="space-y-2">
                    {comparison.differences.slice(0, 5).map((diff, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-muted rounded">
                        {getChangeIcon(diff.type)}
                        <span className="flex-1 text-sm">{diff.description}</span>
                        <Badge variant="outline" className="text-xs">
                          {diff.impact}
                        </Badge>
                      </div>
                    ))}
                    {comparison.differences.length > 5 && (
                      <div className="text-center py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab('differences')}
                        >
                          View all {comparison.differences.length} changes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Differences Tab */}
          <TabsContent value="differences" className="flex-1">
            <ScrollArea className="h-full p-6">
              <div className="space-y-4">
                {comparison.differences.length === 0 ? (
                  <div className="text-center py-12">
                    <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">No Differences Found</p>
                    <p className="text-muted-foreground">
                      These versions appear to be identical
                    </p>
                  </div>
                ) : (
                  comparison.differences.map((difference, index) => (
                    <DifferenceCard
                      key={index}
                      difference={difference}
                      index={index}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Diff Tab */}
          <TabsContent value="diff" className="flex-1">
            <ScrollArea className="h-full p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Unified Diff</h4>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={copyDiff}>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="p-0">
                    <pre className="p-4 text-xs font-mono bg-muted rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {generateUnifiedDiff()}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}