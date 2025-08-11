'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  FileText,
  Plus,
  Eye,
  Download,
  Share,
  Calendar,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter
} from 'lucide-react'
import type { PerformanceReport } from '@/services/analytics/reports'
import { ReportGenerator } from '@/components/analytics/ReportGenerator'
import { ReportViewer } from '@/components/analytics/ReportViewer'
import { ReportShare } from '@/components/analytics/ReportShare'
import { PerformanceReportService } from '@/services/analytics/reports'

// Mock data for demonstration
const mockReports: PerformanceReport[] = [
  {
    id: 'report_1',
    title: 'ERC-20 Token Stress Test - January 2025',
    generatedAt: new Date('2025-01-11T10:30:00'),
    configuration: {
      includeCharts: true,
      includeSummary: true,
      includeTransactionDetails: true,
      includePerformanceAnalysis: true,
      includeErrorAnalysis: true,
      includeRecommendations: true
    },
    summary: {
      executionId: 'exec_001',
      startTime: Date.now() - 3600000,
      endTime: Date.now() - 1800000,
      totalTransactions: 500,
      successfulTransactions: 487,
      failedTransactions: 13,
      pendingTransactions: 0,
      averageGasUsed: 21000,
      totalGasUsed: BigInt('10234000'),
      averageConfirmationTime: 2500,
      peakTPS: 25.5,
      averageTPS: 18.2
    },
    transactions: [],
    snapshots: [],
    analysis: {
      overview: {
        totalTransactions: 500,
        successRate: 97.4,
        averageTPS: 18.2,
        peakTPS: 25.5,
        totalDuration: 1800,
        totalGasUsed: '10234000',
        averageGasPrice: 2.5,
        totalCost: 0.025634
      },
      timing: {
        averageConfirmationTime: 2500,
        medianConfirmationTime: 2200,
        p95ConfirmationTime: 4800,
        p99ConfirmationTime: 7200,
        timeDistribution: [
          { range: '0-1s', count: 120, percentage: 24 },
          { range: '1-5s', count: 320, percentage: 64 },
          { range: '5-15s', count: 50, percentage: 10 },
          { range: '15s+', count: 10, percentage: 2 }
        ]
      },
      gas: {
        averageGasUsed: 21000,
        gasEfficiency: 0.85,
        gasDistribution: [
          { range: '20k-22k', count: 450, percentage: 90, averagePrice: 2.5 },
          { range: '22k-25k', count: 50, percentage: 10, averagePrice: 2.8 }
        ],
        costAnalysis: {
          totalCost: 0.025634,
          averageCostPerTransaction: 0.000051,
          highestCost: 0.000063,
          lowestCost: 0.000042
        }
      },
      errors: {
        totalErrors: 13,
        errorRate: 2.6,
        errorTypes: [
          {
            type: 'Gas Related',
            count: 8,
            percentage: 61.5,
            examples: ['Transaction underpriced', 'Insufficient gas']
          },
          {
            type: 'Network Issues',
            count: 5,
            percentage: 38.5,
            examples: ['Connection timeout', 'RPC error']
          }
        ],
        retryAnalysis: {
          averageRetries: 0.6,
          maxRetries: 3,
          retriesDistribution: [
            { retryCount: 0, transactionCount: 450 },
            { retryCount: 1, transactionCount: 35 },
            { retryCount: 2, transactionCount: 10 },
            { retryCount: 3, transactionCount: 5 }
          ]
        }
      },
      performance: {
        tpsOverTime: [],
        blockUtilization: [],
        networkStress: {
          peakConcurrency: 50,
          sustainedLoad: 18.2,
          loadSpikes: []
        }
      }
    },
    recommendations: [
      {
        category: 'cost',
        priority: 'medium',
        title: 'Optimize Gas Limit Estimation',
        description: 'Gas efficiency could be improved with better limit estimation',
        impact: 'Reduce transaction costs by 10-15%',
        implementation: 'Use dynamic gas estimation based on network conditions',
        metrics: {
          current: '85%',
          target: '90%+',
          improvement: 'Better gas utilization'
        }
      }
    ],
    metadata: {
      version: '1.0.0',
      generatedBy: 'Contract Stresser Analytics',
      testEnvironment: 'development',
      networkId: 31337,
      tags: ['stress-test', 'erc-20', 'performance']
    }
  }
]

export default function ReportsPage() {
  const [activeView, setActiveView] = useState<'list' | 'generate' | 'view'>('list')
  const [selectedReport, setSelectedReport] = useState<PerformanceReport | null>(null)
  const [reports, setReports] = useState<PerformanceReport[]>(mockReports)
  const [shareReport, setShareReport] = useState<PerformanceReport | null>(null)
  const [shareUrl, setShareUrl] = useState<string>('')

  const handleReportGenerated = (report: PerformanceReport) => {
    setReports(prev => [report, ...prev])
    setSelectedReport(report)
    setActiveView('view')
  }

  const handleViewReport = (report: PerformanceReport) => {
    setSelectedReport(report)
    setActiveView('view')
  }

  const handleShareReport = async (report: PerformanceReport) => {
    try {
      const url = await PerformanceReportService.shareReport(report)
      setShareUrl(url)
      setShareReport(report)
    } catch (error) {
      console.error('Failed to share report:', error)
    }
  }

  const handleExportReport = (report: PerformanceReport, format: 'json' | 'csv' | 'html' | 'pdf') => {
    try {
      const exportResult = PerformanceReportService.exportReport(report, format)
      
      const blob = new Blob([exportResult.data], { type: exportResult.mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = exportResult.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export report:', error)
    }
  }

  const ReportCard = ({ report }: { report: PerformanceReport }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              {report.title}
            </CardTitle>
            <CardDescription className="mt-2">
              <div className="flex items-center space-x-4 text-sm">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {report.generatedAt.toLocaleDateString()}
                </span>
                <span>ID: {report.id}</span>
              </div>
            </CardDescription>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {report.metadata.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {report.analysis.overview.totalTransactions.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Transactions</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              report.analysis.overview.successRate >= 95 ? 'text-green-600' :
              report.analysis.overview.successRate >= 80 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {report.analysis.overview.successRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Success Rate</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {report.analysis.overview.averageTPS.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Avg TPS</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm">{report.summary.successfulTransactions} confirmed</span>
            {report.summary.failedTransactions > 0 && (
              <>
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm">{report.summary.failedTransactions} failed</span>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewReport(report)}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShareReport(report)}
            >
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportReport(report, 'html')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto p-6">
      {activeView === 'list' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Performance Reports</h1>
              <p className="text-muted-foreground mt-2">
                Generate and manage comprehensive analysis reports for your stress tests
              </p>
            </div>
            
            <Button onClick={() => setActiveView('generate')}>
              <Plus className="w-4 h-4 mr-2" />
              New Report
            </Button>
          </div>

          <Separator />

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{reports.length}</div>
                <div className="text-sm text-muted-foreground">Total Reports</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {reports.reduce((sum, r) => sum + r.analysis.overview.totalTransactions, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Transactions</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {reports.length > 0 ? 
                    (reports.reduce((sum, r) => sum + r.analysis.overview.successRate, 0) / reports.length).toFixed(1) : 
                    '0.0'
                  }%
                </div>
                <div className="text-sm text-muted-foreground">Avg Success Rate</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {reports.filter(r => r.generatedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                </div>
                <div className="text-sm text-muted-foreground">This Week</div>
              </CardContent>
            </Card>
          </div>

          {/* Reports List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Reports</h2>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
            
            {reports.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first performance report to get started
                  </p>
                  <Button onClick={() => setActiveView('generate')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeView === 'generate' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Generate Report</h1>
              <p className="text-muted-foreground mt-2">
                Create a new performance analysis report
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setActiveView('list')}
            >
              Back to Reports
            </Button>
          </div>
          
          <ReportGenerator
            transactions={[]}
            onReportGenerated={handleReportGenerated}
            onReportShared={(shareUrl) => {
              setShareUrl(shareUrl)
              // Show success message or copy to clipboard
              navigator.clipboard.writeText(shareUrl)
            }}
          />
        </div>
      )}

      {activeView === 'view' && selectedReport && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Report Viewer</h1>
              <p className="text-muted-foreground mt-2">
                {selectedReport.title}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setActiveView('list')}
            >
              Back to Reports
            </Button>
          </div>
          
          <ReportViewer
            report={selectedReport}
            onShare={(shareUrl) => setShareUrl(shareUrl)}
            onExport={(format) => handleExportReport(selectedReport, format)}
          />
        </div>
      )}

      {/* Share Modal */}
      <ReportShare
        report={shareReport}
        shareUrl={shareUrl}
        open={!!shareReport}
        onOpenChange={(open) => {
          if (!open) {
            setShareReport(null)
            setShareUrl('')
          }
        }}
        onGenerateShareUrl={async (report) => {
          const url = await PerformanceReportService.shareReport(report)
          setShareUrl(url)
          return url
        }}
      />
    </div>
  )
}