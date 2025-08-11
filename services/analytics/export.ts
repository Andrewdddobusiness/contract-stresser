import type { TransactionMetrics, PerformanceSnapshot, TestExecutionSummary } from './metrics'

export interface ExportOptions {
  includeHeaders?: boolean
  dateFormat?: 'iso' | 'localeString' | 'timestamp'
  precision?: number
  excludeFields?: string[]
}

export interface ExportResult {
  data: string
  filename: string
  mimeType: string
  size: number
}

export class TransactionExportService {
  /**
   * Export transactions to CSV format
   */
  static exportToCSV(
    transactions: TransactionMetrics[], 
    options: ExportOptions = {}
  ): ExportResult {
    const {
      includeHeaders = true,
      dateFormat = 'iso',
      precision = 4,
      excludeFields = []
    } = options

    if (transactions.length === 0) {
      return {
        data: includeHeaders ? this.getCSVHeaders(excludeFields) : '',
        filename: `transactions_${this.getTimestamp()}.csv`,
        mimeType: 'text/csv',
        size: 0
      }
    }

    const rows: string[] = []
    
    // Add headers
    if (includeHeaders) {
      rows.push(this.getCSVHeaders(excludeFields))
    }

    // Add data rows
    transactions.forEach(tx => {
      const row = this.transactionToCSVRow(tx, { dateFormat, precision, excludeFields })
      rows.push(row)
    })

    const csvData = rows.join('\n')
    
    return {
      data: csvData,
      filename: `transactions_${this.getTimestamp()}.csv`,
      mimeType: 'text/csv',
      size: csvData.length
    }
  }

  /**
   * Export transactions to JSON format
   */
  static exportToJSON(
    transactions: TransactionMetrics[],
    options: ExportOptions = {}
  ): ExportResult {
    const {
      dateFormat = 'iso',
      precision = 4,
      excludeFields = []
    } = options

    const processedTransactions = transactions.map(tx => 
      this.processTransactionForExport(tx, { dateFormat, precision, excludeFields })
    )

    const jsonData = JSON.stringify({
      exportedAt: new Date().toISOString(),
      count: transactions.length,
      transactions: processedTransactions,
      metadata: this.generateMetadata(transactions)
    }, null, 2)

    return {
      data: jsonData,
      filename: `transactions_${this.getTimestamp()}.json`,
      mimeType: 'application/json',
      size: jsonData.length
    }
  }

  /**
   * Export performance snapshots to CSV
   */
  static exportSnapshotsToCSV(
    snapshots: PerformanceSnapshot[],
    options: ExportOptions = {}
  ): ExportResult {
    const {
      includeHeaders = true,
      dateFormat = 'iso',
      precision = 4
    } = options

    if (snapshots.length === 0) {
      return {
        data: includeHeaders ? this.getSnapshotCSVHeaders() : '',
        filename: `performance_snapshots_${this.getTimestamp()}.csv`,
        mimeType: 'text/csv',
        size: 0
      }
    }

    const rows: string[] = []
    
    if (includeHeaders) {
      rows.push(this.getSnapshotCSVHeaders())
    }

    snapshots.forEach(snapshot => {
      const row = this.snapshotToCSVRow(snapshot, { dateFormat, precision })
      rows.push(row)
    })

    const csvData = rows.join('\n')
    
    return {
      data: csvData,
      filename: `performance_snapshots_${this.getTimestamp()}.csv`,
      mimeType: 'text/csv',
      size: csvData.length
    }
  }

  /**
   * Export test execution summary
   */
  static exportSummaryToJSON(
    summary: TestExecutionSummary,
    transactions: TransactionMetrics[],
    snapshots: PerformanceSnapshot[] = []
  ): ExportResult {
    const exportData = {
      exportedAt: new Date().toISOString(),
      summary,
      transactions: {
        count: transactions.length,
        data: transactions.map(tx => this.processTransactionForExport(tx))
      },
      snapshots: {
        count: snapshots.length,
        data: snapshots.map(s => this.processSnapshotForExport(s))
      },
      metadata: this.generateMetadata(transactions)
    }

    const jsonData = JSON.stringify(exportData, null, 2)

    return {
      data: jsonData,
      filename: `test_summary_${this.getTimestamp()}.json`,
      mimeType: 'application/json',
      size: jsonData.length
    }
  }

  /**
   * Export to Excel-compatible CSV with enhanced formatting
   */
  static exportToExcelCSV(
    transactions: TransactionMetrics[],
    options: ExportOptions = {}
  ): ExportResult {
    const csvResult = this.exportToCSV(transactions, {
      ...options,
      dateFormat: 'localeString'
    })

    // Add UTF-8 BOM for Excel compatibility
    const bomData = '\uFEFF' + csvResult.data

    return {
      ...csvResult,
      data: bomData,
      filename: csvResult.filename.replace('.csv', '_excel.csv'),
      size: bomData.length
    }
  }

  /**
   * Download export data as file
   */
  static downloadExport(exportResult: ExportResult): void {
    const blob = new Blob([exportResult.data], { 
      type: exportResult.mimeType + ';charset=utf-8;' 
    })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = exportResult.filename
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(link.href)
  }

  /**
   * Get CSV headers for transactions
   */
  private static getCSVHeaders(excludeFields: string[] = []): string {
    const headers = [
      'iteration',
      'status',
      'hash',
      'startTime',
      'endTime',
      'confirmationTime',
      'gasLimit',
      'gasUsed',
      'gasPrice',
      'gasEfficiency',
      'blockNumber',
      'retryCount',
      'error'
    ].filter(field => !excludeFields.includes(field))

    return headers.join(',')
  }

  /**
   * Get CSV headers for performance snapshots
   */
  private static getSnapshotCSVHeaders(): string {
    return [
      'timestamp',
      'currentTPS',
      'activeTransactions',
      'successCount',
      'errorCount',
      'totalProcessed',
      'avgConfirmationTime',
      'avgGasUsed'
    ].join(',')
  }

  /**
   * Convert transaction to CSV row
   */
  private static transactionToCSVRow(
    tx: TransactionMetrics, 
    options: { dateFormat: string; precision: number; excludeFields: string[] }
  ): string {
    const { dateFormat, precision, excludeFields } = options

    const fields: Record<string, string> = {
      iteration: tx.iteration.toString(),
      status: `"${tx.status}"`,
      hash: `"${tx.hash || ''}"`,
      startTime: `"${this.formatDate(tx.startTime, dateFormat)}"`,
      endTime: `"${tx.endTime ? this.formatDate(tx.endTime, dateFormat) : ''}"`,
      confirmationTime: (tx.confirmationTime || 0).toFixed(0),
      gasLimit: (tx.gasLimit || BigInt(0)).toString(),
      gasUsed: (tx.gasUsed || BigInt(0)).toString(),
      gasPrice: (tx.gasPrice || BigInt(0)).toString(),
      gasEfficiency: (tx.gasEfficiency || 0).toFixed(precision),
      blockNumber: (tx.blockNumber || BigInt(0)).toString(),
      retryCount: tx.retryCount.toString(),
      error: `"${(tx.error || '').replace(/"/g, '""')}"`
    }

    return Object.entries(fields)
      .filter(([key]) => !excludeFields.includes(key))
      .map(([, value]) => value)
      .join(',')
  }

  /**
   * Convert snapshot to CSV row
   */
  private static snapshotToCSVRow(
    snapshot: PerformanceSnapshot,
    options: { dateFormat: string; precision: number }
  ): string {
    const { dateFormat, precision } = options

    return [
      `"${this.formatDate(snapshot.timestamp, dateFormat)}"`,
      snapshot.currentTPS.toFixed(precision),
      snapshot.activeTransactions.toString(),
      snapshot.successCount.toString(),
      snapshot.errorCount.toString(),
      snapshot.totalProcessed.toString(),
      snapshot.avgConfirmationTime.toFixed(0),
      snapshot.avgGasUsed.toFixed(0)
    ].join(',')
  }

  /**
   * Process transaction for export (handles BigInt serialization)
   */
  private static processTransactionForExport(
    tx: TransactionMetrics,
    options: { dateFormat?: string; precision?: number; excludeFields?: string[] } = {}
  ): any {
    const { dateFormat = 'iso', precision = 4, excludeFields = [] } = options

    const processed: any = {}
    
    const fieldHandlers: Record<string, () => any> = {
      iteration: () => tx.iteration,
      status: () => tx.status,
      hash: () => tx.hash,
      startTime: () => this.formatDate(tx.startTime, dateFormat),
      endTime: () => tx.endTime ? this.formatDate(tx.endTime, dateFormat) : null,
      confirmationTime: () => tx.confirmationTime,
      gasLimit: () => tx.gasLimit?.toString(),
      gasUsed: () => tx.gasUsed?.toString(),
      gasPrice: () => tx.gasPrice?.toString(),
      gasEfficiency: () => tx.gasEfficiency ? Number(tx.gasEfficiency.toFixed(precision)) : null,
      blockNumber: () => tx.blockNumber?.toString(),
      retryCount: () => tx.retryCount,
      error: () => tx.error
    }

    Object.entries(fieldHandlers).forEach(([field, handler]) => {
      if (!excludeFields.includes(field)) {
        processed[field] = handler()
      }
    })

    return processed
  }

  /**
   * Process snapshot for export
   */
  private static processSnapshotForExport(snapshot: PerformanceSnapshot): any {
    return {
      timestamp: snapshot.timestamp.toISOString(),
      currentTPS: snapshot.currentTPS,
      activeTransactions: snapshot.activeTransactions,
      successCount: snapshot.successCount,
      errorCount: snapshot.errorCount,
      totalProcessed: snapshot.totalProcessed,
      avgConfirmationTime: snapshot.avgConfirmationTime,
      avgGasUsed: snapshot.avgGasUsed
    }
  }

  /**
   * Generate export metadata
   */
  private static generateMetadata(transactions: TransactionMetrics[]) {
    if (transactions.length === 0) {
      return {
        totalTransactions: 0,
        successRate: 0,
        avgConfirmationTime: 0,
        totalGasUsed: '0'
      }
    }

    const successCount = transactions.filter(tx => tx.status === 'confirmed').length
    const totalGasUsed = transactions.reduce(
      (sum, tx) => sum + (tx.gasUsed || BigInt(0)), 
      BigInt(0)
    )
    const avgConfirmationTime = transactions
      .filter(tx => tx.confirmationTime)
      .reduce((sum, tx) => sum + (tx.confirmationTime || 0), 0) / 
      Math.max(1, transactions.filter(tx => tx.confirmationTime).length)

    return {
      totalTransactions: transactions.length,
      successRate: (successCount / transactions.length) * 100,
      avgConfirmationTime,
      totalGasUsed: totalGasUsed.toString(),
      exportFormat: 'v1.0',
      generatedBy: 'Contract Stresser Analytics'
    }
  }

  /**
   * Format date based on specified format
   */
  private static formatDate(date: Date, format: string): string {
    switch (format) {
      case 'iso':
        return date.toISOString()
      case 'localeString':
        return date.toLocaleString()
      case 'timestamp':
        return date.getTime().toString()
      default:
        return date.toISOString()
    }
  }

  /**
   * Generate timestamp for filenames
   */
  private static getTimestamp(): string {
    const now = new Date()
    return now.toISOString().replace(/[:.]/g, '-').slice(0, -5) // Remove milliseconds and Z
  }
}