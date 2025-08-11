import type { TransactionMetrics, PerformanceSnapshot, TestExecutionSummary } from './metrics'
import { TransactionExportService } from './export'

export interface ReportConfiguration {
  includeCharts?: boolean
  includeSummary?: boolean
  includeTransactionDetails?: boolean
  includePerformanceAnalysis?: boolean
  includeErrorAnalysis?: boolean
  includeRecommendations?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface PerformanceReport {
  id: string
  title: string
  generatedAt: Date
  configuration: ReportConfiguration
  summary: TestExecutionSummary
  transactions: TransactionMetrics[]
  snapshots: PerformanceSnapshot[]
  analysis: PerformanceAnalysis
  recommendations: Recommendation[]
  metadata: ReportMetadata
}

export interface PerformanceAnalysis {
  overview: {
    totalTransactions: number
    successRate: number
    averageTPS: number
    peakTPS: number
    totalDuration: number
    totalGasUsed: string
    averageGasPrice: number
    totalCost: number
  }
  timing: {
    averageConfirmationTime: number
    medianConfirmationTime: number
    p95ConfirmationTime: number
    p99ConfirmationTime: number
    timeDistribution: Array<{
      range: string
      count: number
      percentage: number
    }>
  }
  gas: {
    averageGasUsed: number
    gasEfficiency: number
    gasDistribution: Array<{
      range: string
      count: number
      percentage: number
      averagePrice: number
    }>
    costAnalysis: {
      totalCost: number
      averageCostPerTransaction: number
      highestCost: number
      lowestCost: number
    }
  }
  errors: {
    totalErrors: number
    errorRate: number
    errorTypes: Array<{
      type: string
      count: number
      percentage: number
      examples: string[]
    }>
    retryAnalysis: {
      averageRetries: number
      maxRetries: number
      retriesDistribution: Array<{
        retryCount: number
        transactionCount: number
      }>
    }
  }
  performance: {
    tpsOverTime: Array<{
      timestamp: Date
      tps: number
      activeTransactions: number
    }>
    blockUtilization: Array<{
      blockNumber: string
      transactionCount: number
      gasUtilization: number
    }>
    networkStress: {
      peakConcurrency: number
      sustainedLoad: number
      loadSpikes: Array<{
        timestamp: Date
        tps: number
        duration: number
      }>
    }
  }
}

export interface Recommendation {
  category: 'performance' | 'cost' | 'reliability' | 'optimization'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  implementation: string
  metrics?: {
    current: number | string
    target: number | string
    improvement: string
  }
}

export interface ReportMetadata {
  version: string
  generatedBy: string
  testEnvironment: string
  contractAddress?: string
  networkId: number
  executionId?: string
  tags: string[]
}

export class PerformanceReportService {
  /**
   * Generate a comprehensive performance report
   */
  static async generateReport(
    title: string,
    summary: TestExecutionSummary,
    transactions: TransactionMetrics[],
    snapshots: PerformanceSnapshot[] = [],
    configuration: ReportConfiguration = {}
  ): Promise<PerformanceReport> {
    const reportId = this.generateReportId()
    
    const analysis = this.analyzePerformance(transactions, snapshots)
    const recommendations = this.generateRecommendations(analysis, transactions)
    
    const report: PerformanceReport = {
      id: reportId,
      title,
      generatedAt: new Date(),
      configuration: {
        includeCharts: true,
        includeSummary: true,
        includeTransactionDetails: true,
        includePerformanceAnalysis: true,
        includeErrorAnalysis: true,
        includeRecommendations: true,
        ...configuration
      },
      summary,
      transactions,
      snapshots,
      analysis,
      recommendations,
      metadata: {
        version: '1.0.0',
        generatedBy: 'Contract Stresser Analytics',
        testEnvironment: process.env.NODE_ENV || 'development',
        networkId: 31337, // Default to Anvil
        executionId: summary.executionId,
        tags: ['stress-test', 'performance', 'gas-analysis']
      }
    }

    return report
  }

  /**
   * Export report to various formats
   */
  static exportReport(report: PerformanceReport, format: 'json' | 'csv' | 'html' | 'pdf') {
    switch (format) {
      case 'json':
        return this.exportToJSON(report)
      case 'csv':
        return this.exportToCSV(report)
      case 'html':
        return this.exportToHTML(report)
      case 'pdf':
        return this.exportToPDF(report)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Share report via URL (generates shareable link)
   */
  static async shareReport(report: PerformanceReport): Promise<string> {
    // In a real implementation, this would upload to a sharing service
    const reportData = JSON.stringify(report)
    const base64Data = btoa(reportData)
    
    // Generate a shareable URL (in practice, this would be a shortened URL)
    const shareableUrl = `${window.location.origin}/reports/shared/${report.id}?data=${encodeURIComponent(base64Data.slice(0, 100))}...`
    
    return shareableUrl
  }

  /**
   * Analyze performance metrics
   */
  private static analyzePerformance(
    transactions: TransactionMetrics[],
    snapshots: PerformanceSnapshot[]
  ): PerformanceAnalysis {
    const confirmedTxs = transactions.filter(tx => tx.status === 'confirmed')
    const failedTxs = transactions.filter(tx => tx.status === 'failed')
    
    // Overview analysis
    const totalGasUsed = confirmedTxs.reduce((sum, tx) => sum + (tx.gasUsed || BigInt(0)), BigInt(0))
    const totalCost = confirmedTxs.reduce((sum, tx) => {
      if (tx.gasUsed && tx.gasPrice) {
        return sum + (Number(tx.gasUsed) * Number(tx.gasPrice)) / 1e18
      }
      return sum
    }, 0)

    const confirmationTimes = confirmedTxs
      .filter(tx => tx.confirmationTime)
      .map(tx => tx.confirmationTime!)
      .sort((a, b) => a - b)

    // Timing analysis
    const avgConfirmationTime = confirmationTimes.reduce((sum, time) => sum + time, 0) / confirmationTimes.length
    const medianConfirmationTime = confirmationTimes[Math.floor(confirmationTimes.length / 2)] || 0
    const p95ConfirmationTime = confirmationTimes[Math.floor(confirmationTimes.length * 0.95)] || 0
    const p99ConfirmationTime = confirmationTimes[Math.floor(confirmationTimes.length * 0.99)] || 0

    // Time distribution
    const timeDistribution = this.createTimeDistribution(confirmationTimes)

    // Gas analysis
    const gasValues = confirmedTxs.map(tx => Number(tx.gasUsed || 0)).filter(g => g > 0)
    const avgGasUsed = gasValues.reduce((sum, gas) => sum + gas, 0) / gasValues.length
    const gasDistribution = this.createGasDistribution(confirmedTxs)
    
    // Error analysis
    const errorTypes = this.analyzeErrors(failedTxs)
    const retryAnalysis = this.analyzeRetries(transactions)

    // TPS calculation
    const tpsData = this.calculateTPS(transactions, snapshots)
    const averageTPS = tpsData.reduce((sum, point) => sum + point.tps, 0) / tpsData.length
    const peakTPS = Math.max(...tpsData.map(point => point.tps))

    return {
      overview: {
        totalTransactions: transactions.length,
        successRate: (confirmedTxs.length / transactions.length) * 100,
        averageTPS,
        peakTPS,
        totalDuration: this.calculateTotalDuration(transactions),
        totalGasUsed: totalGasUsed.toString(),
        averageGasPrice: this.calculateAverageGasPrice(confirmedTxs),
        totalCost
      },
      timing: {
        averageConfirmationTime: avgConfirmationTime || 0,
        medianConfirmationTime,
        p95ConfirmationTime,
        p99ConfirmationTime,
        timeDistribution
      },
      gas: {
        averageGasUsed: avgGasUsed || 0,
        gasEfficiency: this.calculateGasEfficiency(confirmedTxs),
        gasDistribution,
        costAnalysis: {
          totalCost,
          averageCostPerTransaction: totalCost / confirmedTxs.length,
          highestCost: this.getHighestTransactionCost(confirmedTxs),
          lowestCost: this.getLowestTransactionCost(confirmedTxs)
        }
      },
      errors: {
        totalErrors: failedTxs.length,
        errorRate: (failedTxs.length / transactions.length) * 100,
        errorTypes,
        retryAnalysis
      },
      performance: {
        tpsOverTime: tpsData,
        blockUtilization: this.analyzeBlockUtilization(confirmedTxs),
        networkStress: this.analyzeNetworkStress(tpsData)
      }
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  private static generateRecommendations(
    analysis: PerformanceAnalysis,
    transactions: TransactionMetrics[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Performance recommendations
    if (analysis.overview.averageTPS < 10) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Low Transaction Throughput',
        description: 'Current average TPS is below optimal levels for stress testing',
        impact: 'May not adequately stress test the network or contract',
        implementation: 'Increase concurrent transaction count or reduce delays between transactions',
        metrics: {
          current: `${analysis.overview.averageTPS.toFixed(2)} TPS`,
          target: '20+ TPS',
          improvement: 'Double throughput capacity'
        }
      })
    }

    // Cost optimization
    if (analysis.gas.gasEfficiency < 0.8) {
      recommendations.push({
        category: 'cost',
        priority: 'medium',
        title: 'Gas Efficiency Below Optimal',
        description: 'Transactions are not utilizing gas limits efficiently',
        impact: 'Higher costs and potential for gas estimation improvements',
        implementation: 'Optimize gas limit estimation or contract code efficiency',
        metrics: {
          current: `${(analysis.gas.gasEfficiency * 100).toFixed(1)}%`,
          target: '80%+',
          improvement: 'Reduce gas waste'
        }
      })
    }

    // Reliability recommendations
    if (analysis.errors.errorRate > 5) {
      recommendations.push({
        category: 'reliability',
        priority: 'high',
        title: 'High Error Rate',
        description: 'Significant number of transactions are failing',
        impact: 'Poor user experience and unreliable contract interaction',
        implementation: 'Review error patterns and implement better error handling',
        metrics: {
          current: `${analysis.errors.errorRate.toFixed(1)}%`,
          target: '<5%',
          improvement: 'Improve transaction success rate'
        }
      })
    }

    // Timing recommendations
    if (analysis.timing.p95ConfirmationTime > 30000) { // 30 seconds
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        title: 'High Confirmation Times',
        description: '95th percentile confirmation time exceeds acceptable thresholds',
        impact: 'Poor user experience for time-sensitive operations',
        implementation: 'Consider higher gas prices or network optimization',
        metrics: {
          current: `${(analysis.timing.p95ConfirmationTime / 1000).toFixed(1)}s`,
          target: '<30s',
          improvement: 'Faster transaction confirmation'
        }
      })
    }

    return recommendations
  }

  /**
   * Export report to JSON format
   */
  private static exportToJSON(report: PerformanceReport) {
    const jsonData = JSON.stringify(report, null, 2)
    return {
      data: jsonData,
      filename: `performance_report_${report.id}.json`,
      mimeType: 'application/json',
      size: jsonData.length
    }
  }

  /**
   * Export report to CSV format
   */
  private static exportToCSV(report: PerformanceReport) {
    // Export multiple CSV files in a zip-like structure
    const summaryCSV = this.generateSummaryCSV(report)
    const transactionCSV = TransactionExportService.exportToCSV(report.transactions)
    const analysisCSV = this.generateAnalysisCSV(report.analysis)
    
    return {
      data: summaryCSV,
      filename: `performance_report_${report.id}_summary.csv`,
      mimeType: 'text/csv',
      size: summaryCSV.length,
      additionalFiles: [
        {
          name: `transactions_${report.id}.csv`,
          data: transactionCSV.data
        },
        {
          name: `analysis_${report.id}.csv`, 
          data: analysisCSV
        }
      ]
    }
  }

  /**
   * Export report to HTML format
   */
  private static exportToHTML(report: PerformanceReport) {
    const html = this.generateHTMLReport(report)
    return {
      data: html,
      filename: `performance_report_${report.id}.html`,
      mimeType: 'text/html',
      size: html.length
    }
  }

  /**
   * Export report to PDF format (placeholder)
   */
  private static exportToPDF(report: PerformanceReport) {
    // In a real implementation, this would use a library like Puppeteer or jsPDF
    const htmlReport = this.generateHTMLReport(report)
    return {
      data: htmlReport,
      filename: `performance_report_${report.id}.pdf`,
      mimeType: 'application/pdf',
      size: htmlReport.length
    }
  }

  // Helper methods for analysis calculations
  private static createTimeDistribution(times: number[]) {
    const ranges = [
      { min: 0, max: 1000, label: '0-1s' },
      { min: 1000, max: 5000, label: '1-5s' },
      { min: 5000, max: 15000, label: '5-15s' },
      { min: 15000, max: 30000, label: '15-30s' },
      { min: 30000, max: Infinity, label: '30s+' }
    ]

    return ranges.map(range => {
      const count = times.filter(time => time >= range.min && time < range.max).length
      return {
        range: range.label,
        count,
        percentage: (count / times.length) * 100
      }
    })
  }

  private static createGasDistribution(transactions: TransactionMetrics[]) {
    const gasValues = transactions.map(tx => Number(tx.gasUsed || 0)).filter(g => g > 0)
    if (gasValues.length === 0) return []

    const min = Math.min(...gasValues)
    const max = Math.max(...gasValues)
    const range = max - min
    const binCount = Math.min(5, Math.ceil(Math.sqrt(gasValues.length)))
    const binSize = range / binCount

    const bins = []
    for (let i = 0; i < binCount; i++) {
      const binMin = min + (i * binSize)
      const binMax = i === binCount - 1 ? max : min + ((i + 1) * binSize)
      
      const binTxs = transactions.filter(tx => {
        const gas = Number(tx.gasUsed || 0)
        return gas >= binMin && (i === binCount - 1 ? gas <= binMax : gas < binMax)
      })

      if (binTxs.length > 0) {
        bins.push({
          range: `${Math.round(binMin / 1000)}k-${Math.round(binMax / 1000)}k`,
          count: binTxs.length,
          percentage: (binTxs.length / transactions.length) * 100,
          averagePrice: binTxs.reduce((sum, tx) => sum + Number(tx.gasPrice || 0), 0) / binTxs.length / 1e9
        })
      }
    }

    return bins
  }

  private static analyzeErrors(failedTransactions: TransactionMetrics[]) {
    const errorGroups = new Map<string, string[]>()

    failedTransactions.forEach(tx => {
      if (!tx.error) return
      
      const error = tx.error.toLowerCase()
      let errorType = 'Other'

      if (error.includes('gas') || error.includes('fee')) {
        errorType = 'Gas Related'
      } else if (error.includes('network') || error.includes('connection')) {
        errorType = 'Network Issues'
      } else if (error.includes('revert') || error.includes('execution')) {
        errorType = 'Contract Revert'
      } else if (error.includes('nonce')) {
        errorType = 'Nonce Issues'
      }

      if (!errorGroups.has(errorType)) {
        errorGroups.set(errorType, [])
      }
      errorGroups.get(errorType)!.push(tx.error)
    })

    return Array.from(errorGroups.entries()).map(([type, examples]) => ({
      type,
      count: examples.length,
      percentage: (examples.length / failedTransactions.length) * 100,
      examples: [...new Set(examples)].slice(0, 3)
    }))
  }

  private static analyzeRetries(transactions: TransactionMetrics[]) {
    const retryDistribution = new Map<number, number>()
    let totalRetries = 0

    transactions.forEach(tx => {
      const retries = tx.retryCount
      totalRetries += retries
      retryDistribution.set(retries, (retryDistribution.get(retries) || 0) + 1)
    })

    return {
      averageRetries: totalRetries / transactions.length,
      maxRetries: Math.max(...transactions.map(tx => tx.retryCount)),
      retriesDistribution: Array.from(retryDistribution.entries()).map(([retryCount, transactionCount]) => ({
        retryCount,
        transactionCount
      }))
    }
  }

  private static calculateTPS(transactions: TransactionMetrics[], snapshots: PerformanceSnapshot[]) {
    if (snapshots.length > 0) {
      return snapshots.map(snapshot => ({
        timestamp: snapshot.timestamp,
        tps: snapshot.currentTPS,
        activeTransactions: snapshot.activeTransactions
      }))
    }

    // Calculate TPS from transactions if no snapshots
    const confirmedTxs = transactions.filter(tx => tx.status === 'confirmed' && tx.endTime)
    if (confirmedTxs.length === 0) return []

    const startTime = confirmedTxs[0].endTime!
    const endTime = confirmedTxs[confirmedTxs.length - 1].endTime!
    const duration = endTime.getTime() - startTime.getTime()
    const windowSize = 10000 // 10 second windows

    const windows = []
    for (let time = startTime.getTime(); time < endTime.getTime(); time += windowSize) {
      const windowStart = new Date(time)
      const windowEnd = new Date(time + windowSize)
      
      const windowTxs = confirmedTxs.filter(tx => 
        tx.endTime! >= windowStart && tx.endTime! < windowEnd
      )

      windows.push({
        timestamp: windowStart,
        tps: windowTxs.length / (windowSize / 1000),
        activeTransactions: windowTxs.length
      })
    }

    return windows
  }

  private static calculateTotalDuration(transactions: TransactionMetrics[]): number {
    if (transactions.length === 0) return 0
    
    const times = transactions.map(tx => tx.startTime.getTime())
    const startTime = Math.min(...times)
    const endTime = Math.max(...times)
    
    return (endTime - startTime) / 1000 // Return in seconds
  }

  private static calculateAverageGasPrice(transactions: TransactionMetrics[]): number {
    const prices = transactions.filter(tx => tx.gasPrice).map(tx => Number(tx.gasPrice!))
    if (prices.length === 0) return 0
    return prices.reduce((sum, price) => sum + price, 0) / prices.length / 1e9 // Convert to Gwei
  }

  private static calculateGasEfficiency(transactions: TransactionMetrics[]): number {
    const efficiencies = transactions.filter(tx => tx.gasEfficiency).map(tx => tx.gasEfficiency!)
    if (efficiencies.length === 0) return 0
    return efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length
  }

  private static getHighestTransactionCost(transactions: TransactionMetrics[]): number {
    return Math.max(...transactions.map(tx => {
      if (tx.gasUsed && tx.gasPrice) {
        return (Number(tx.gasUsed) * Number(tx.gasPrice)) / 1e18
      }
      return 0
    }))
  }

  private static getLowestTransactionCost(transactions: TransactionMetrics[]): number {
    const costs = transactions.map(tx => {
      if (tx.gasUsed && tx.gasPrice) {
        return (Number(tx.gasUsed) * Number(tx.gasPrice)) / 1e18
      }
      return 0
    }).filter(cost => cost > 0)

    return costs.length > 0 ? Math.min(...costs) : 0
  }

  private static analyzeBlockUtilization(transactions: TransactionMetrics[]) {
    const blockGroups = new Map<string, TransactionMetrics[]>()
    
    transactions.forEach(tx => {
      if (tx.blockNumber) {
        const blockKey = tx.blockNumber.toString()
        if (!blockGroups.has(blockKey)) {
          blockGroups.set(blockKey, [])
        }
        blockGroups.get(blockKey)!.push(tx)
      }
    })

    return Array.from(blockGroups.entries()).map(([blockNumber, txs]) => ({
      blockNumber,
      transactionCount: txs.length,
      gasUtilization: txs.reduce((sum, tx) => sum + Number(tx.gasUsed || 0), 0)
    }))
  }

  private static analyzeNetworkStress(tpsData: Array<{ timestamp: Date; tps: number; activeTransactions: number }>) {
    const avgTPS = tpsData.reduce((sum, point) => sum + point.tps, 0) / tpsData.length
    const peakConcurrency = Math.max(...tpsData.map(point => point.activeTransactions))
    
    // Find load spikes (TPS > 150% of average for sustained period)
    const loadSpikes = []
    let currentSpike: { timestamp: Date; tps: number; duration: number } | null = null
    
    for (const point of tpsData) {
      if (point.tps > avgTPS * 1.5) {
        if (!currentSpike) {
          currentSpike = { timestamp: point.timestamp, tps: point.tps, duration: 1 }
        } else {
          currentSpike.duration++
          if (point.tps > currentSpike.tps) {
            currentSpike.tps = point.tps
          }
        }
      } else if (currentSpike && currentSpike.duration >= 3) {
        loadSpikes.push(currentSpike)
        currentSpike = null
      } else {
        currentSpike = null
      }
    }

    return {
      peakConcurrency,
      sustainedLoad: avgTPS,
      loadSpikes
    }
  }

  // Helper methods for export formats
  private static generateSummaryCSV(report: PerformanceReport): string {
    const rows = [
      ['Metric', 'Value'],
      ['Report ID', report.id],
      ['Generated At', report.generatedAt.toISOString()],
      ['Total Transactions', report.analysis.overview.totalTransactions.toString()],
      ['Success Rate', `${report.analysis.overview.successRate.toFixed(2)}%`],
      ['Average TPS', report.analysis.overview.averageTPS.toFixed(2)],
      ['Peak TPS', report.analysis.overview.peakTPS.toFixed(2)],
      ['Total Duration', `${report.analysis.overview.totalDuration.toFixed(2)}s`],
      ['Total Gas Used', report.analysis.overview.totalGasUsed],
      ['Average Gas Price', `${report.analysis.overview.averageGasPrice.toFixed(2)} Gwei`],
      ['Total Cost', `${report.analysis.overview.totalCost.toFixed(6)} ETH`],
      ['Average Confirmation Time', `${report.analysis.timing.averageConfirmationTime.toFixed(0)}ms`],
      ['P95 Confirmation Time', `${report.analysis.timing.p95ConfirmationTime.toFixed(0)}ms`],
      ['Error Rate', `${report.analysis.errors.errorRate.toFixed(2)}%`],
      ['Gas Efficiency', `${(report.analysis.gas.gasEfficiency * 100).toFixed(1)}%`]
    ]

    return rows.map(row => row.join(',')).join('\n')
  }

  private static generateAnalysisCSV(analysis: PerformanceAnalysis): string {
    const rows = [
      ['Category', 'Metric', 'Value'],
      ...analysis.timing.timeDistribution.map(dist => 
        ['Timing Distribution', dist.range, `${dist.count} (${dist.percentage.toFixed(1)}%)`]
      ),
      ...analysis.gas.gasDistribution.map(dist => 
        ['Gas Distribution', dist.range, `${dist.count} (${dist.percentage.toFixed(1)}%)`]
      ),
      ...analysis.errors.errorTypes.map(error => 
        ['Error Types', error.type, `${error.count} (${error.percentage.toFixed(1)}%)`]
      )
    ]

    return rows.map(row => row.join(',')).join('\n')
  }

  private static generateHTMLReport(report: PerformanceReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title} - Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #ddd; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #666; margin-top: 5px; }
        .recommendations { background: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; }
        .recommendation { margin-bottom: 15px; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; }
        .priority-high { border-left-color: #dc3545; }
        .priority-medium { border-left-color: #ffc107; }
        .priority-low { border-left-color: #28a745; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f8f9fa; }
        .error-analysis { background: #fff5f5; border: 1px solid #fed7d7; border-radius: 4px; padding: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p><strong>Generated:</strong> ${report.generatedAt.toLocaleString()}</p>
        <p><strong>Report ID:</strong> ${report.id}</p>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${report.analysis.overview.totalTransactions}</div>
                <div class="metric-label">Total Transactions</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.analysis.overview.successRate.toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.analysis.overview.averageTPS.toFixed(1)}</div>
                <div class="metric-label">Average TPS</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.analysis.overview.peakTPS.toFixed(1)}</div>
                <div class="metric-label">Peak TPS</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Performance Analysis</h2>
        <h3>Timing Metrics</h3>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Average Confirmation Time</td><td>${(report.analysis.timing.averageConfirmationTime / 1000).toFixed(2)}s</td></tr>
            <tr><td>Median Confirmation Time</td><td>${(report.analysis.timing.medianConfirmationTime / 1000).toFixed(2)}s</td></tr>
            <tr><td>95th Percentile</td><td>${(report.analysis.timing.p95ConfirmationTime / 1000).toFixed(2)}s</td></tr>
            <tr><td>99th Percentile</td><td>${(report.analysis.timing.p99ConfirmationTime / 1000).toFixed(2)}s</td></tr>
        </table>

        <h3>Gas Analysis</h3>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Average Gas Used</td><td>${report.analysis.gas.averageGasUsed.toLocaleString()}</td></tr>
            <tr><td>Gas Efficiency</td><td>${(report.analysis.gas.gasEfficiency * 100).toFixed(1)}%</td></tr>
            <tr><td>Total Cost</td><td>${report.analysis.gas.costAnalysis.totalCost.toFixed(6)} ETH</td></tr>
            <tr><td>Average Cost per TX</td><td>${report.analysis.gas.costAnalysis.averageCostPerTransaction.toFixed(8)} ETH</td></tr>
        </table>
    </div>

    ${report.analysis.errors.totalErrors > 0 ? `
    <div class="section">
        <h2>Error Analysis</h2>
        <div class="error-analysis">
            <p><strong>Total Errors:</strong> ${report.analysis.errors.totalErrors} (${report.analysis.errors.errorRate.toFixed(2)}%)</p>
            <h4>Error Types:</h4>
            ${report.analysis.errors.errorTypes.map(error => `
                <div style="margin-bottom: 10px;">
                    <strong>${error.type}:</strong> ${error.count} occurrences (${error.percentage.toFixed(1)}%)
                    <ul>
                        ${error.examples.map(example => `<li style="font-size: 0.9em; color: #666;">${example}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    ${report.recommendations.length > 0 ? `
    <div class="section">
        <h2>Recommendations</h2>
        <div class="recommendations">
            ${report.recommendations.map(rec => `
                <div class="recommendation priority-${rec.priority}">
                    <h4>${rec.title} <span style="background: ${rec.priority === 'high' ? '#dc3545' : rec.priority === 'medium' ? '#ffc107' : '#28a745'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">${rec.priority.toUpperCase()}</span></h4>
                    <p><strong>Issue:</strong> ${rec.description}</p>
                    <p><strong>Impact:</strong> ${rec.impact}</p>
                    <p><strong>Implementation:</strong> ${rec.implementation}</p>
                    ${rec.metrics ? `
                        <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                            <strong>Current:</strong> ${rec.metrics.current} → <strong>Target:</strong> ${rec.metrics.target}
                            <br><em>${rec.metrics.improvement}</em>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>Report Metadata</h2>
        <table>
            <tr><th>Field</th><th>Value</th></tr>
            <tr><td>Version</td><td>${report.metadata.version}</td></tr>
            <tr><td>Generated By</td><td>${report.metadata.generatedBy}</td></tr>
            <tr><td>Environment</td><td>${report.metadata.testEnvironment}</td></tr>
            <tr><td>Network ID</td><td>${report.metadata.networkId}</td></tr>
            <tr><td>Tags</td><td>${report.metadata.tags.join(', ')}</td></tr>
        </table>
    </div>

    <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
        <p>Generated by Contract Stresser Analytics v${report.metadata.version}</p>
    </footer>
</body>
</html>`
  }

  private static generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}