'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  FileText,
  Calendar,
  Settings,
  Download,
  Share,
  Loader2,
  CheckCircle
} from 'lucide-react'
import type { TransactionMetrics, PerformanceSnapshot, TestExecutionSummary } from '@/services/analytics/metrics'
import type { ReportConfiguration, PerformanceReport } from '@/services/analytics/reports'
import { PerformanceReportService } from '@/services/analytics/reports'

interface ReportGeneratorProps {
  transactions: TransactionMetrics[]
  snapshots?: PerformanceSnapshot[]
  summary?: TestExecutionSummary
  onReportGenerated?: (report: PerformanceReport) => void
  onReportShared?: (shareUrl: string) => void
}

export function ReportGenerator({
  transactions,
  snapshots = [],
  summary,
  onReportGenerated,
  onReportShared
}: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [generatedReport, setGeneratedReport] = useState<PerformanceReport | null>(null)
  
  const [reportTitle, setReportTitle] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [configuration, setConfiguration] = useState<ReportConfiguration>({
    includeCharts: true,
    includeSummary: true,
    includeTransactionDetails: true,
    includePerformanceAnalysis: true,
    includeErrorAnalysis: true,
    includeRecommendations: true
  })
  const [dateRange, setDateRange] = useState<'all' | '1h' | '6h' | '24h' | '7d' | 'custom'>('all')
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  })

  const generateDefaultSummary = (): TestExecutionSummary => {
    const confirmedTxs = transactions.filter(tx => tx.status === 'confirmed')
    const failedTxs = transactions.filter(tx => tx.status === 'failed')
    const pendingTxs = transactions.filter(tx => tx.status === 'pending')

    return {
      executionId: `exec_${Date.now()}`,
      startTime: transactions.length > 0 ? Math.min(...transactions.map(tx => tx.startTime.getTime())) : Date.now(),
      endTime: transactions.length > 0 ? Math.max(...transactions.map(tx => (tx.endTime || tx.startTime).getTime())) : Date.now(),
      totalTransactions: transactions.length,
      successfulTransactions: confirmedTxs.length,
      failedTransactions: failedTxs.length,
      pendingTransactions: pendingTxs.length,
      averageGasUsed: confirmedTxs.length > 0 ? 
        confirmedTxs.reduce((sum, tx) => sum + Number(tx.gasUsed || 0), 0) / confirmedTxs.length : 0,
      totalGasUsed: confirmedTxs.reduce((sum, tx) => sum + (tx.gasUsed || BigInt(0)), BigInt(0)),
      averageConfirmationTime: confirmedTxs.length > 0 ?
        confirmedTxs.filter(tx => tx.confirmationTime).reduce((sum, tx) => sum + (tx.confirmationTime || 0), 0) / 
        confirmedTxs.filter(tx => tx.confirmationTime).length || 0 : 0,
      peakTPS: 0,
      averageTPS: 0
    }
  }

  const filterTransactionsByDateRange = (transactions: TransactionMetrics[]): TransactionMetrics[] => {
    if (dateRange === 'all') return transactions

    const now = new Date()
    let cutoffTime: Date

    switch (dateRange) {
      case '1h':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '6h':
        cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case '24h':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'custom':
        if (customDateRange.start && customDateRange.end) {
          return transactions.filter(tx => 
            tx.startTime >= new Date(customDateRange.start) &&
            tx.startTime <= new Date(customDateRange.end)
          )
        }
        return transactions
      default:
        return transactions
    }

    return transactions.filter(tx => tx.startTime >= cutoffTime)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    
    try {
      const filteredTransactions = filterTransactionsByDateRange(transactions)
      const reportSummary = summary || generateDefaultSummary()
      
      let finalConfiguration = { ...configuration }
      
      // Add date range to configuration if not 'all'
      if (dateRange !== 'all') {
        if (dateRange === 'custom' && customDateRange.start && customDateRange.end) {
          finalConfiguration.dateRange = {
            start: new Date(customDateRange.start),
            end: new Date(customDateRange.end)
          }
        } else if (dateRange !== 'custom') {
          const now = new Date()
          const ranges: Record<string, number> = {
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000
          }
          finalConfiguration.dateRange = {
            start: new Date(now.getTime() - ranges[dateRange]),
            end: now
          }
        }
      }

      const report = await PerformanceReportService.generateReport(
        reportTitle || `Performance Report - ${new Date().toLocaleDateString()}`,
        reportSummary,
        filteredTransactions,
        snapshots,
        finalConfiguration
      )

      setGeneratedReport(report)
      onReportGenerated?.(report)
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv' | 'html' | 'pdf') => {
    if (!generatedReport) return

    try {
      const exportResult = PerformanceReportService.exportReport(generatedReport, format)
      
      if (format === 'csv' && 'additionalFiles' in exportResult) {
        // Handle multiple CSV files - create a zip-like download
        const mainBlob = new Blob([exportResult.data], { type: exportResult.mimeType })
        const mainUrl = URL.createObjectURL(mainBlob)
        const mainLink = document.createElement('a')
        mainLink.href = mainUrl
        mainLink.download = exportResult.filename
        document.body.appendChild(mainLink)
        mainLink.click()
        document.body.removeChild(mainLink)
        URL.revokeObjectURL(mainUrl)

        // Download additional files
        for (const file of exportResult.additionalFiles || []) {
          const blob = new Blob([file.data], { type: 'text/csv' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = file.name
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }
      } else {
        // Single file download
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
    }
  }

  const handleShare = async () => {
    if (!generatedReport) return

    setIsSharing(true)
    try {
      const shareUrl = await PerformanceReportService.shareReport(generatedReport)
      onReportShared?.(shareUrl)
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)
    } catch (error) {
      console.error('Failed to share report:', error)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Generate Performance Report
          </CardTitle>
          <CardDescription>
            Create a comprehensive analysis report from your transaction data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Report Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Report Title</Label>
                <Input
                  id="title"
                  placeholder="Performance Analysis Report"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateRange">Date Range</Label>
                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="!bg-white">
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="6h">Last 6 Hours</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional notes or context for this report..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Configuration Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Report Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium">Sections to Include</h4>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeSummary"
                    checked={configuration.includeSummary}
                    onCheckedChange={(checked) => 
                      setConfiguration({ ...configuration, includeSummary: !!checked })
                    }
                  />
                  <Label htmlFor="includeSummary" className="text-sm">Executive Summary</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includePerformanceAnalysis"
                    checked={configuration.includePerformanceAnalysis}
                    onCheckedChange={(checked) => 
                      setConfiguration({ ...configuration, includePerformanceAnalysis: !!checked })
                    }
                  />
                  <Label htmlFor="includePerformanceAnalysis" className="text-sm">Performance Analysis</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeErrorAnalysis"
                    checked={configuration.includeErrorAnalysis}
                    onCheckedChange={(checked) => 
                      setConfiguration({ ...configuration, includeErrorAnalysis: !!checked })
                    }
                  />
                  <Label htmlFor="includeErrorAnalysis" className="text-sm">Error Analysis</Label>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Additional Features</h4>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeTransactionDetails"
                    checked={configuration.includeTransactionDetails}
                    onCheckedChange={(checked) => 
                      setConfiguration({ ...configuration, includeTransactionDetails: !!checked })
                    }
                  />
                  <Label htmlFor="includeTransactionDetails" className="text-sm">Transaction Details</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeRecommendations"
                    checked={configuration.includeRecommendations}
                    onCheckedChange={(checked) => 
                      setConfiguration({ ...configuration, includeRecommendations: !!checked })
                    }
                  />
                  <Label htmlFor="includeRecommendations" className="text-sm">Recommendations</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeCharts"
                    checked={configuration.includeCharts}
                    onCheckedChange={(checked) => 
                      setConfiguration({ ...configuration, includeCharts: !!checked })
                    }
                  />
                  <Label htmlFor="includeCharts" className="text-sm">Charts & Visualizations</Label>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Data Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Data Preview</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {filterTransactionsByDateRange(transactions).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Transactions</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {filterTransactionsByDateRange(transactions).filter(tx => tx.status === 'confirmed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Confirmed</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {filterTransactionsByDateRange(transactions).filter(tx => tx.status === 'failed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {snapshots.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Snapshots</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              {filterTransactionsByDateRange(transactions).length === 0 ? (
                'No transactions match the selected criteria'
              ) : (
                `Report will include ${filterTransactionsByDateRange(transactions).length} transactions`
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || filterTransactionsByDateRange(transactions).length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Report Actions */}
      {generatedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              Report Generated Successfully
            </CardTitle>
            <CardDescription>
              Your performance report is ready for export or sharing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="text-sm font-medium">{generatedReport.title}</div>
                <div className="text-xs text-muted-foreground">
                  ID: {generatedReport.id} • Generated: {generatedReport.generatedAt.toLocaleString()}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Share className="w-4 h-4 mr-2" />
                  )}
                  Share
                </Button>
                
                <div className="flex items-center border border-gray-200 rounded">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('html')}
                    className="rounded-r-none border-r-0"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  
                  {(['json', 'csv', 'pdf'] as const).map(format => (
                    <Button
                      key={format}
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(format)}
                      className="rounded-none border-r-0 border-l-0 px-2 last:rounded-r last:border-r"
                    >
                      {format.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}