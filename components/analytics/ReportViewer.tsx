'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Download,
  Share,
  Printer,
  FileText,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  Calendar
} from 'lucide-react'
import type { PerformanceReport, Recommendation } from '@/services/analytics/reports'
import { PerformanceReportService } from '@/services/analytics/reports'

interface ReportViewerProps {
  report: PerformanceReport
  onShare?: (shareUrl: string) => void
  onExport?: (format: 'json' | 'csv' | 'html' | 'pdf') => void
}

export function ReportViewer({ report, onShare, onExport }: ReportViewerProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)
    try {
      const shareUrl = await PerformanceReportService.shareReport(report)
      onShare?.(shareUrl)
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl)
    } catch (error) {
      console.error('Failed to share report:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv' | 'html' | 'pdf') => {
    setIsExporting(true)
    try {
      if (onExport) {
        onExport(format)
      } else {
        const exportResult = PerformanceReportService.exportReport(report, format)
        
        // Create and download the file
        const blob = new Blob([exportResult.data], { type: exportResult.mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = exportResult.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export report:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />
      default: return null
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50'
      case 'medium': return 'border-yellow-500 bg-yellow-50'
      case 'low': return 'border-green-500 bg-green-50'
      default: return 'border-gray-500 bg-gray-50'
    }
  }

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive' as const
      case 'medium': return 'secondary' as const
      case 'low': return 'default' as const
      default: return 'outline' as const
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`
    return `${(seconds / 3600).toFixed(1)}h`
  }

  const formatCost = (cost: number) => {
    if (cost < 0.0001) return `${(cost * 1e6).toFixed(2)} μΞ`
    if (cost < 0.1) return `${(cost * 1000).toFixed(4)} mΞ`
    return `${cost.toFixed(6)} Ξ`
  }

  const MetricCard = ({ 
    icon, 
    title, 
    value, 
    subtitle, 
    color = "text-blue-600" 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    value: string; 
    subtitle?: string;
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={`${color} mb-2`}>
          {icon}
        </div>
        <div className={`text-2xl font-bold ${color}`}>
          {value}
        </div>
        <div className="text-sm font-medium text-gray-900">{title}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  )

  const RecommendationCard = ({ recommendation }: { recommendation: Recommendation }) => (
    <Card className={`border-l-4 ${getPriorityColor(recommendation.priority)}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
            {recommendation.title}
          </h4>
          <Badge variant={getPriorityBadgeVariant(recommendation.priority)}>
            {recommendation.priority.toUpperCase()}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-700">Issue: </span>
            <span className="text-gray-600">{recommendation.description}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Impact: </span>
            <span className="text-gray-600">{recommendation.impact}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Solution: </span>
            <span className="text-gray-600">{recommendation.implementation}</span>
          </div>
          
          {recommendation.metrics && (
            <div className="mt-3 p-3 bg-gray-50 rounded border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Current: <strong>{recommendation.metrics.current}</strong></span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-600">Target: <strong>{recommendation.metrics.target}</strong></span>
              </div>
              <div className="text-xs text-gray-500 mt-1 italic">
                {recommendation.metrics.improvement}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 print:p-0">
      {/* Header */}
      <Card className="print:shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-2xl">
                <FileText className="w-6 h-6 mr-3" />
                {report.title}
              </CardTitle>
              <CardDescription className="mt-2">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Generated: {report.generatedAt.toLocaleString()}
                  </span>
                  <span>Report ID: {report.id}</span>
                </div>
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={isSharing}
              >
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('html')}
                  disabled={isExporting}
                  className="rounded-r-none"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <div className="flex border-l">
                  {(['json', 'csv', 'pdf'] as const).map(format => (
                    <Button
                      key={format}
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(format)}
                      disabled={isExporting}
                      className="rounded-none border-l-0 px-2"
                    >
                      {format.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 print:hidden">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  icon={<BarChart3 className="w-6 h-6 mx-auto" />}
                  title="Total Transactions"
                  value={report.analysis.overview.totalTransactions.toLocaleString()}
                  color="text-blue-600"
                />
                
                <MetricCard
                  icon={<CheckCircle className="w-6 h-6 mx-auto" />}
                  title="Success Rate"
                  value={`${report.analysis.overview.successRate.toFixed(1)}%`}
                  color={report.analysis.overview.successRate >= 95 ? "text-green-600" : 
                         report.analysis.overview.successRate >= 80 ? "text-yellow-600" : "text-red-600"}
                />
                
                <MetricCard
                  icon={<TrendingUp className="w-6 h-6 mx-auto" />}
                  title="Average TPS"
                  value={report.analysis.overview.averageTPS.toFixed(1)}
                  subtitle={`Peak: ${report.analysis.overview.peakTPS.toFixed(1)}`}
                  color="text-purple-600"
                />
                
                <MetricCard
                  icon={<Zap className="w-6 h-6 mx-auto" />}
                  title="Total Cost"
                  value={formatCost(report.analysis.overview.totalCost)}
                  subtitle={`Avg: ${formatCost(report.analysis.gas.costAnalysis.averageCostPerTransaction)}/tx`}
                  color="text-green-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Duration:</span>
                  <span className="font-medium">{formatDuration(report.analysis.overview.totalDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Confirmation:</span>
                  <span className="font-medium">
                    {(report.analysis.timing.averageConfirmationTime / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gas Efficiency:</span>
                  <span className="font-medium">
                    {(report.analysis.gas.gasEfficiency * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Gas Price:</span>
                  <span className="font-medium">
                    {report.analysis.overview.averageGasPrice.toFixed(2)} Gwei
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm">Confirmed</span>
                    </div>
                    <span className="font-medium">
                      {report.transactions.filter(tx => tx.status === 'confirmed').length}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <XCircle className="w-4 h-4 text-red-600 mr-2" />
                      <span className="text-sm">Failed</span>
                    </div>
                    <span className="font-medium">
                      {report.transactions.filter(tx => tx.status === 'failed').length}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-yellow-600 mr-2" />
                      <span className="text-sm">Pending</span>
                    </div>
                    <span className="font-medium">
                      {report.transactions.filter(tx => tx.status === 'pending').length}
                    </span>
                  </div>
                  
                  {report.analysis.errors.totalErrors > 0 && (
                    <>
                      <Separator />
                      <div className="text-sm text-red-600">
                        <strong>Most Common Error:</strong> {report.analysis.errors.errorTypes[0]?.type || 'N/A'}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Timing Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Timing Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <MetricCard
                  icon={<Clock className="w-5 h-5 mx-auto" />}
                  title="Average"
                  value={`${(report.analysis.timing.averageConfirmationTime / 1000).toFixed(2)}s`}
                  color="text-blue-600"
                />
                <MetricCard
                  icon={<Clock className="w-5 h-5 mx-auto" />}
                  title="Median"
                  value={`${(report.analysis.timing.medianConfirmationTime / 1000).toFixed(2)}s`}
                  color="text-green-600"
                />
                <MetricCard
                  icon={<Clock className="w-5 h-5 mx-auto" />}
                  title="95th Percentile"
                  value={`${(report.analysis.timing.p95ConfirmationTime / 1000).toFixed(2)}s`}
                  color="text-orange-600"
                />
                <MetricCard
                  icon={<Clock className="w-5 h-5 mx-auto" />}
                  title="99th Percentile"
                  value={`${(report.analysis.timing.p99ConfirmationTime / 1000).toFixed(2)}s`}
                  color="text-red-600"
                />
              </div>

              {report.analysis.timing.timeDistribution.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Time Distribution</h4>
                  <div className="space-y-2">
                    {report.analysis.timing.timeDistribution.map((dist, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{dist.range}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{dist.count}</span>
                          <span className="text-xs text-gray-500">({dist.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gas Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Gas Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <MetricCard
                  icon={<Zap className="w-5 h-5 mx-auto" />}
                  title="Average Gas"
                  value={report.analysis.gas.averageGasUsed.toLocaleString()}
                  color="text-purple-600"
                />
                <MetricCard
                  icon={<TrendingUp className="w-5 h-5 mx-auto" />}
                  title="Efficiency"
                  value={`${(report.analysis.gas.gasEfficiency * 100).toFixed(1)}%`}
                  color="text-green-600"
                />
                <MetricCard
                  icon={<Zap className="w-5 h-5 mx-auto" />}
                  title="Highest Cost"
                  value={formatCost(report.analysis.gas.costAnalysis.highestCost)}
                  color="text-red-600"
                />
                <MetricCard
                  icon={<Zap className="w-5 h-5 mx-auto" />}
                  title="Lowest Cost"
                  value={formatCost(report.analysis.gas.costAnalysis.lowestCost)}
                  color="text-green-600"
                />
              </div>

              {report.analysis.gas.gasDistribution.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Gas Distribution</h4>
                  <div className="space-y-2">
                    {report.analysis.gas.gasDistribution.map((dist, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{dist.range}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium">{dist.count} txs</span>
                          <span className="text-xs text-gray-500">
                            {dist.averagePrice.toFixed(2)} Gwei avg
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          {report.analysis.errors.totalErrors > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                    Error Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard
                      icon={<XCircle className="w-5 h-5 mx-auto" />}
                      title="Total Errors"
                      value={report.analysis.errors.totalErrors.toString()}
                      color="text-red-600"
                    />
                    <MetricCard
                      icon={<BarChart3 className="w-5 h-5 mx-auto" />}
                      title="Error Rate"
                      value={`${report.analysis.errors.errorRate.toFixed(2)}%`}
                      color="text-red-600"
                    />
                    <MetricCard
                      icon={<TrendingUp className="w-5 h-5 mx-auto" />}
                      title="Avg Retries"
                      value={report.analysis.errors.retryAnalysis.averageRetries.toFixed(1)}
                      color="text-yellow-600"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.analysis.errors.errorTypes.map((error, index) => (
                      <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                            {error.type}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="destructive">
                              {error.count} occurrences
                            </Badge>
                            <Badge variant="outline">
                              {error.percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p className="mb-2 font-medium">Example errors:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {error.examples.map((example, i) => (
                              <li key={i} className="text-xs font-mono bg-white p-2 rounded border">
                                {example}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Errors Found</h3>
                <p className="text-muted-foreground">All transactions completed successfully!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {report.recommendations.length > 0 ? (
            <div className="space-y-4">
              {report.recommendations.map((recommendation, index) => (
                <RecommendationCard key={index} recommendation={recommendation} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Optimal Performance</h3>
                <p className="text-muted-foreground">No recommendations needed - performance is within acceptable parameters.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Report ID</label>
                  <div className="font-mono text-sm p-2 bg-gray-50 rounded border mt-1">
                    {report.id}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Generated</label>
                  <div className="font-mono text-sm p-2 bg-gray-50 rounded border mt-1">
                    {report.generatedAt.toISOString()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Version</label>
                  <div className="font-mono text-sm p-2 bg-gray-50 rounded border mt-1">
                    {report.metadata.version}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Environment</label>
                  <div className="font-mono text-sm p-2 bg-gray-50 rounded border mt-1">
                    {report.metadata.testEnvironment}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Network ID</label>
                  <div className="font-mono text-sm p-2 bg-gray-50 rounded border mt-1">
                    {report.metadata.networkId}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Generated By</label>
                  <div className="font-mono text-sm p-2 bg-gray-50 rounded border mt-1">
                    {report.metadata.generatedBy}
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700">Tags</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {report.metadata.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}