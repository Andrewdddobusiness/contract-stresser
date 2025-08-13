'use client'

import { FlowTemplate, flowTemplateService } from './templateEngine'
import { FlowVersion, flowVersioningService } from '@/services/versioning/flowVersioning'
import { templateImportExportService } from './templateImportExport'

export interface BackupData {
  version: string
  createdAt: Date
  templates: FlowTemplate[]
  versions: FlowVersion[]
  metadata: {
    totalTemplates: number
    totalVersions: number
    backupSize: number
    clientVersion: string
  }
}

export interface RestoreResult {
  success: boolean
  templatesRestored: number
  versionsRestored: number
  errors: string[]
  warnings: string[]
}

export interface BackupOptions {
  includeVersions: boolean
  includePrivateTemplates: boolean
  includeUsageStats: boolean
  compressionLevel: number
  encryptionKey?: string
}

export interface RestoreOptions {
  overwriteExisting: boolean
  validateCompatibility: boolean
  restoreVersions: boolean
  skipCorrupted: boolean
}

export class TemplateBackupService {
  // Create Full Backup
  async createFullBackup(options: BackupOptions = {
    includeVersions: true,
    includePrivateTemplates: true,
    includeUsageStats: false,
    compressionLevel: 6
  }): Promise<Blob> {
    const templates = await this.getAllUserTemplates(options.includePrivateTemplates)
    const versions = options.includeVersions ? await this.getAllUserVersions() : []
    
    const backupData: BackupData = {
      version: '1.0.0',
      createdAt: new Date(),
      templates: templates.map(template => this.sanitizeTemplateForBackup(template, options)),
      versions,
      metadata: {
        totalTemplates: templates.length,
        totalVersions: versions.length,
        backupSize: 0, // Will be calculated after serialization
        clientVersion: '1.0.0' // Should come from app config
      }
    }

    let serializedData = JSON.stringify(backupData, null, options.compressionLevel > 0 ? 0 : 2)
    
    // Calculate backup size
    backupData.metadata.backupSize = serializedData.length
    serializedData = JSON.stringify(backupData, null, options.compressionLevel > 0 ? 0 : 2)

    // Apply encryption if requested
    if (options.encryptionKey) {
      serializedData = await this.encryptData(serializedData, options.encryptionKey)
    }

    return new Blob([serializedData], { type: 'application/json' })
  }

  // Create Selective Backup
  async createSelectiveBackup(
    templateIds: string[], 
    options: BackupOptions = {
      includeVersions: false,
      includePrivateTemplates: true,
      includeUsageStats: false,
      compressionLevel: 6
    }
  ): Promise<Blob> {
    const templates = templateIds
      .map(id => flowTemplateService.getTemplate(id))
      .filter(Boolean) as FlowTemplate[]
    
    const versions = options.includeVersions 
      ? await this.getVersionsForTemplates(templateIds)
      : []

    const backupData: BackupData = {
      version: '1.0.0',
      createdAt: new Date(),
      templates: templates.map(template => this.sanitizeTemplateForBackup(template, options)),
      versions,
      metadata: {
        totalTemplates: templates.length,
        totalVersions: versions.length,
        backupSize: 0,
        clientVersion: '1.0.0'
      }
    }

    const serializedData = JSON.stringify(backupData, null, options.compressionLevel > 0 ? 0 : 2)
    backupData.metadata.backupSize = serializedData.length

    return new Blob([JSON.stringify(backupData, null, options.compressionLevel > 0 ? 0 : 2)], { 
      type: 'application/json' 
    })
  }

  // Restore from Backup
  async restoreFromBackup(
    backupFile: File | Blob, 
    options: RestoreOptions = {
      overwriteExisting: false,
      validateCompatibility: true,
      restoreVersions: true,
      skipCorrupted: true
    }
  ): Promise<RestoreResult> {
    const result: RestoreResult = {
      success: false,
      templatesRestored: 0,
      versionsRestored: 0,
      errors: [],
      warnings: []
    }

    try {
      // Read backup data
      const backupText = await this.readBlobAsText(backupFile)
      let backupData: BackupData

      try {
        backupData = JSON.parse(backupText)
      } catch (error) {
        // Try to decrypt if it's encrypted
        try {
          const decryptedData = await this.decryptData(backupText, 'default-key')
          backupData = JSON.parse(decryptedData)
        } catch {
          result.errors.push('Failed to parse backup file. File may be corrupted or encrypted.')
          return result
        }
      }

      // Validate backup structure
      if (!this.isValidBackup(backupData)) {
        result.errors.push('Invalid backup file format')
        return result
      }

      // Compatibility check
      if (options.validateCompatibility && !this.isCompatibleVersion(backupData.version)) {
        result.warnings.push(`Backup version ${backupData.version} may not be fully compatible`)
      }

      // Restore templates
      for (const template of backupData.templates) {
        try {
          const existingTemplate = flowTemplateService.getTemplate(template.id)
          
          if (existingTemplate && !options.overwriteExisting) {
            result.warnings.push(`Template "${template.name}" already exists, skipping`)
            continue
          }

          // Restore template
          const restoredTemplate = await flowTemplateService.createTemplate(
            template.flow,
            template
          )
          
          result.templatesRestored++
        } catch (error) {
          const errorMsg = `Failed to restore template "${template.name}": ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
          
          if (options.skipCorrupted) {
            result.warnings.push(errorMsg)
          } else {
            result.errors.push(errorMsg)
          }
        }
      }

      // Restore versions if requested
      if (options.restoreVersions && backupData.versions) {
        for (const version of backupData.versions) {
          try {
            await flowVersioningService.createVersion(
              version.flowId,
              version.changes,
              {
                description: version.metadata.description,
                commitMessage: version.metadata.commitMessage
              }
            )
            
            result.versionsRestored++
          } catch (error) {
            const errorMsg = `Failed to restore version ${version.version}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
            
            if (options.skipCorrupted) {
              result.warnings.push(errorMsg)
            } else {
              result.errors.push(errorMsg)
            }
          }
        }
      }

      result.success = result.errors.length === 0
      
    } catch (error) {
      result.errors.push(`Backup restoration failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`)
    }

    return result
  }

  // Auto-backup functionality
  async setupAutoBackup(intervalHours: number = 24): Promise<void> {
    // Clear any existing auto-backup
    const existingInterval = localStorage.getItem('autoBackupInterval')
    if (existingInterval) {
      clearInterval(Number(existingInterval))
    }

    // Set up new auto-backup
    const intervalId = setInterval(async () => {
      try {
        const backup = await this.createFullBackup({
          includeVersions: true,
          includePrivateTemplates: true,
          includeUsageStats: false,
          compressionLevel: 9 // High compression for auto-backups
        })

        // Store in IndexedDB or trigger download
        await this.storeAutoBackup(backup)
      } catch (error) {
        console.error('Auto-backup failed:', error)
      }
    }, intervalHours * 60 * 60 * 1000)

    localStorage.setItem('autoBackupInterval', intervalId.toString())
    localStorage.setItem('autoBackupEnabled', 'true')
  }

  async disableAutoBackup(): Promise<void> {
    const existingInterval = localStorage.getItem('autoBackupInterval')
    if (existingInterval) {
      clearInterval(Number(existingInterval))
      localStorage.removeItem('autoBackupInterval')
    }
    localStorage.setItem('autoBackupEnabled', 'false')
  }

  // Backup validation and repair
  async validateBackup(backupFile: File | Blob): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    metadata?: BackupData['metadata']
  }> {
    try {
      const backupText = await this.readBlobAsText(backupFile)
      const backupData: BackupData = JSON.parse(backupText)

      const errors: string[] = []
      const warnings: string[] = []

      if (!this.isValidBackup(backupData)) {
        errors.push('Invalid backup file structure')
      }

      // Validate templates
      for (const template of backupData.templates) {
        const validation = templateImportExportService.validateTemplateStructure(template)
        if (!validation.isValid) {
          errors.push(...validation.errors.map(e => `Template "${template.name}": ${e}`))
        }
        warnings.push(...validation.warnings.map(w => `Template "${template.name}": ${w}`))
      }

      // Check version compatibility
      if (!this.isCompatibleVersion(backupData.version)) {
        warnings.push(`Backup version ${backupData.version} may have compatibility issues`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: backupData.metadata
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to validate backup: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  // Get backup statistics
  async getBackupStats(): Promise<{
    totalTemplates: number
    totalVersions: number
    lastBackup?: Date
    autoBackupEnabled: boolean
    estimatedBackupSize: number
  }> {
    const templates = await this.getAllUserTemplates(true)
    const versions = await this.getAllUserVersions()
    
    // Estimate backup size
    const sampleBackup = await this.createSelectiveBackup(
      templates.slice(0, 1).map(t => t.id)
    )
    const estimatedSize = (sampleBackup.size / 1) * templates.length

    return {
      totalTemplates: templates.length,
      totalVersions: versions.length,
      lastBackup: this.getLastBackupDate(),
      autoBackupEnabled: localStorage.getItem('autoBackupEnabled') === 'true',
      estimatedBackupSize: estimatedSize
    }
  }

  // Private helper methods
  private async getAllUserTemplates(includePrivate: boolean): Promise<FlowTemplate[]> {
    // In a real implementation, this would filter by user
    const allTemplates = Array.from((flowTemplateService as any).templates.values())
    return includePrivate ? allTemplates : allTemplates.filter(t => t.visibility === 'public')
  }

  private async getAllUserVersions(): Promise<FlowVersion[]> {
    // In a real implementation, this would filter by user's flows
    return []
  }

  private async getVersionsForTemplates(templateIds: string[]): Promise<FlowVersion[]> {
    const versions: FlowVersion[] = []
    for (const templateId of templateIds) {
      const template = flowTemplateService.getTemplate(templateId)
      if (template) {
        const flowVersions = flowVersioningService.getVersionHistory(template.flow.id)
        versions.push(...flowVersions)
      }
    }
    return versions
  }

  private sanitizeTemplateForBackup(template: FlowTemplate, options: BackupOptions): FlowTemplate {
    const sanitized = { ...template }
    
    if (!options.includeUsageStats) {
      sanitized.usage = {
        downloads: 0,
        ratings: [],
        averageRating: 0
      }
    }

    return sanitized
  }

  private async encryptData(data: string, key: string): Promise<string> {
    // Simple encryption - in production, use proper encryption
    const encoder = new TextEncoder()
    const keyBuffer = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )
    
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      keyBuffer,
      encoder.encode(data)
    )
    
    const encryptedArray = new Uint8Array(encrypted)
    const result = new Uint8Array(iv.length + encryptedArray.length)
    result.set(iv)
    result.set(encryptedArray, iv.length)
    
    return btoa(String.fromCharCode(...result))
  }

  private async decryptData(encryptedData: string, key: string): Promise<string> {
    // Simple decryption - in production, use proper decryption
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    
    const keyBuffer = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
    
    const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    const iv = encryptedBuffer.slice(0, 12)
    const data = encryptedBuffer.slice(12)
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      keyBuffer,
      data
    )
    
    return decoder.decode(decrypted)
  }

  private isValidBackup(data: any): data is BackupData {
    return (
      data &&
      typeof data.version === 'string' &&
      Array.isArray(data.templates) &&
      Array.isArray(data.versions) &&
      data.metadata &&
      typeof data.metadata.totalTemplates === 'number'
    )
  }

  private isCompatibleVersion(version: string): boolean {
    const currentVersion = '1.0.0'
    return version === currentVersion
  }

  private async readBlobAsText(blob: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(blob)
    })
  }

  private async storeAutoBackup(backup: Blob): Promise<void> {
    // Store in IndexedDB or local storage
    // For now, just trigger download with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const url = URL.createObjectURL(backup)
    const a = document.createElement('a')
    a.href = url
    a.download = `auto-backup-${timestamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    localStorage.setItem('lastAutoBackup', new Date().toISOString())
  }

  private getLastBackupDate(): Date | undefined {
    const lastBackup = localStorage.getItem('lastAutoBackup')
    return lastBackup ? new Date(lastBackup) : undefined
  }
}

// Export singleton instance
export const templateBackupService = new TemplateBackupService()