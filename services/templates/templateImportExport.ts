'use client'

import { FlowTemplate, flowTemplateService } from './templateEngine'
import { Flow } from '@/services/flowDesigner/flowBuilder'
import { Address } from 'viem'

// Export Types
export interface TemplateExportOptions {
  format: 'json' | 'yaml' | 'package'
  includeMetadata: boolean
  includeUsageStats: boolean
  includeAuthorInfo: boolean
  compressionLevel?: number
}

export interface TemplatePackage {
  version: string
  templates: FlowTemplate[]
  metadata: {
    exportedAt: Date
    exportedBy?: Address
    packageName: string
    description: string
    dependencies?: string[]
  }
  signature?: string
}

export interface ImportResult {
  success: boolean
  imported: FlowTemplate[]
  skipped: { template: FlowTemplate; reason: string }[]
  errors: { template?: FlowTemplate; error: string }[]
  warnings: string[]
}

export interface ImportOptions {
  overwrite: boolean
  validateCompatibility: boolean
  updateExisting: boolean
  skipDuplicates: boolean
  importAsPrivate?: boolean
  newAuthor?: Address
}

// Template Import/Export Service
export class TemplateImportExportService {
  // Export Templates
  async exportTemplate(
    templateId: string, 
    options: TemplateExportOptions = {
      format: 'json',
      includeMetadata: true,
      includeUsageStats: false,
      includeAuthorInfo: true
    }
  ): Promise<string> {
    const template = flowTemplateService.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    const exportData = this.prepareTemplateForExport(template, options)
    
    switch (options.format) {
      case 'json':
        return JSON.stringify(exportData, null, 2)
      case 'yaml':
        return this.convertToYAML(exportData)
      case 'package':
        return this.createTemplatePackage([template], options)
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  }

  async exportMultipleTemplates(
    templateIds: string[],
    packageName: string,
    description: string,
    options: TemplateExportOptions = {
      format: 'package',
      includeMetadata: true,
      includeUsageStats: false,
      includeAuthorInfo: true
    }
  ): Promise<string> {
    const templates = templateIds.map(id => {
      const template = flowTemplateService.getTemplate(id)
      if (!template) {
        throw new Error(`Template ${id} not found`)
      }
      return template
    })

    const packageData: TemplatePackage = {
      version: '1.0.0',
      templates: templates.map(t => this.prepareTemplateForExport(t, options)),
      metadata: {
        exportedAt: new Date(),
        packageName,
        description,
        dependencies: this.extractDependencies(templates)
      }
    }

    return JSON.stringify(packageData, null, 2)
  }

  async exportFlowAsTemplate(
    flow: Flow,
    templateMetadata: Partial<FlowTemplate>,
    options: TemplateExportOptions = {
      format: 'json',
      includeMetadata: true,
      includeUsageStats: false,
      includeAuthorInfo: true
    }
  ): Promise<string> {
    // Create template from flow
    const template = await flowTemplateService.createTemplate(flow, templateMetadata)
    return this.exportTemplate(template.id, options)
  }

  // Import Templates
  async importTemplate(
    templateData: string,
    options: ImportOptions = {
      overwrite: false,
      validateCompatibility: true,
      updateExisting: false,
      skipDuplicates: true
    }
  ): Promise<ImportResult> {
    try {
      const parsedData = JSON.parse(templateData)
      
      // Determine if this is a single template or package
      if (this.isTemplatePackage(parsedData)) {
        return this.importTemplatePackage(parsedData, options)
      } else if (this.isFlowTemplate(parsedData)) {
        return this.importSingleTemplate(parsedData, options)
      } else {
        throw new Error('Invalid template format')
      }
    } catch (error) {
      return {
        success: false,
        imported: [],
        skipped: [],
        errors: [{ error: error instanceof Error ? error.message : 'Unknown import error' }],
        warnings: []
      }
    }
  }

  async importFromUrl(url: string, options: ImportOptions): Promise<ImportResult> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`)
      }
      
      const templateData = await response.text()
      return this.importTemplate(templateData, options)
    } catch (error) {
      return {
        success: false,
        imported: [],
        skipped: [],
        errors: [{ error: error instanceof Error ? error.message : 'Failed to import from URL' }],
        warnings: []
      }
    }
  }

  async importFromFile(file: File, options: ImportOptions): Promise<ImportResult> {
    try {
      const templateData = await this.readFileAsText(file)
      
      // Validate file type
      if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        // Convert YAML to JSON
        const jsonData = this.convertYAMLToJSON(templateData)
        return this.importTemplate(jsonData, options)
      } else if (file.name.endsWith('.json')) {
        return this.importTemplate(templateData, options)
      } else {
        throw new Error('Unsupported file format. Use .json or .yaml files.')
      }
    } catch (error) {
      return {
        success: false,
        imported: [],
        skipped: [],
        errors: [{ error: error instanceof Error ? error.message : 'Failed to import file' }],
        warnings: []
      }
    }
  }

  // Sharing and Collaboration
  async generateSharingLink(templateId: string, options: {
    expiresAt?: Date
    allowFork?: boolean
    includeAuthorInfo?: boolean
  } = {}): Promise<string> {
    const template = flowTemplateService.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    const exportData = this.prepareTemplateForExport(template, {
      format: 'json',
      includeMetadata: true,
      includeUsageStats: false,
      includeAuthorInfo: options.includeAuthorInfo ?? true
    })

    // Generate sharing token (in real implementation, this would be stored server-side)
    const sharingToken = this.generateSharingToken(templateId, options)
    
    // For now, encode the template data in the URL (not recommended for production)
    const encodedData = btoa(JSON.stringify(exportData))
    
    return `${window.location.origin}/templates/shared/${sharingToken}?data=${encodedData}`
  }

  async createTemplateBundle(
    templateIds: string[],
    bundleName: string,
    description: string
  ): Promise<Blob> {
    const templates = templateIds.map(id => {
      const template = flowTemplateService.getTemplate(id)
      if (!template) {
        throw new Error(`Template ${id} not found`)
      }
      return template
    })

    const bundle = {
      name: bundleName,
      description,
      version: '1.0.0',
      templates: templates.map(t => this.prepareTemplateForExport(t, {
        format: 'json',
        includeMetadata: true,
        includeUsageStats: false,
        includeAuthorInfo: true
      })),
      createdAt: new Date().toISOString()
    }

    return new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  }

  // Template Validation
  validateTemplateStructure(templateData: any): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Required fields validation
    const requiredFields = ['id', 'name', 'description', 'category', 'flow', 'parameters']
    
    for (const field of requiredFields) {
      if (!templateData[field]) {
        errors.push(`Missing required field: ${field}`)
      }
    }

    // Flow structure validation
    if (templateData.flow) {
      if (!templateData.flow.blocks || !Array.isArray(templateData.flow.blocks)) {
        errors.push('Flow must contain blocks array')
      }
      
      if (!templateData.flow.connections || !Array.isArray(templateData.flow.connections)) {
        warnings.push('Flow should contain connections array')
      }
    }

    // Parameters validation
    if (templateData.parameters && Array.isArray(templateData.parameters)) {
      templateData.parameters.forEach((param: any, index: number) => {
        if (!param.name) {
          errors.push(`Parameter ${index} missing name`)
        }
        if (!param.type) {
          errors.push(`Parameter ${index} missing type`)
        }
        if (!param.description) {
          warnings.push(`Parameter ${index} missing description`)
        }
      })
    }

    // Version compatibility check
    if (templateData.metadata?.compatibility) {
      const minVersion = templateData.metadata.compatibility.minClientVersion
      const currentVersion = '1.0.0' // Should come from app config
      
      if (minVersion && this.isVersionNewer(minVersion, currentVersion)) {
        warnings.push(`Template requires client version ${minVersion} or newer`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  // Private Helper Methods
  private prepareTemplateForExport(
    template: FlowTemplate, 
    options: TemplateExportOptions
  ): FlowTemplate {
    const exported = { ...template }

    if (!options.includeUsageStats) {
      exported.usage = {
        downloads: 0,
        ratings: [],
        averageRating: 0
      }
    }

    if (!options.includeAuthorInfo) {
      exported.author = {
        address: '0x0000000000000000000000000000000000000000' as Address,
        verified: false
      }
    }

    if (!options.includeMetadata) {
      exported.metadata = {
        version: template.metadata.version,
        createdAt: new Date(),
        updatedAt: new Date(),
        compatibility: template.metadata.compatibility
      }
    }

    return exported
  }

  private createTemplatePackage(
    templates: FlowTemplate[], 
    options: TemplateExportOptions
  ): string {
    const packageData: TemplatePackage = {
      version: '1.0.0',
      templates: templates.map(t => this.prepareTemplateForExport(t, options)),
      metadata: {
        exportedAt: new Date(),
        packageName: 'Custom Template Package',
        description: 'Exported template package',
        dependencies: this.extractDependencies(templates)
      }
    }

    return JSON.stringify(packageData, null, 2)
  }

  private extractDependencies(templates: FlowTemplate[]): string[] {
    const dependencies = new Set<string>()
    
    templates.forEach(template => {
      template.flow.blocks.forEach(block => {
        // Extract contract dependencies
        if (block.config.contractAddress) {
          dependencies.add(`contract:${block.config.contractAddress}`)
        }
        
        // Extract token dependencies
        if (block.config.tokenAddress) {
          dependencies.add(`token:${block.config.tokenAddress}`)
        }
        
        // Extract library dependencies based on block type
        switch (block.type) {
          case 'contract_call':
            dependencies.add('library:viem')
            break
          case 'token_approval':
            dependencies.add('library:erc20')
            break
          case 'atomic_swap':
            dependencies.add('library:atomic-swap')
            break
        }
      })
    })

    return Array.from(dependencies)
  }

  private async importSingleTemplate(
    templateData: any, 
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: [],
      skipped: [],
      errors: [],
      warnings: []
    }

    try {
      // Validate structure
      const validation = this.validateTemplateStructure(templateData)
      result.warnings.push(...validation.warnings)
      
      if (!validation.isValid) {
        result.errors.push({ template: templateData, error: validation.errors.join(', ') })
        return result
      }

      // Check for existing template
      const existingTemplate = flowTemplateService.getTemplate(templateData.id)
      
      if (existingTemplate) {
        if (options.skipDuplicates) {
          result.skipped.push({ 
            template: templateData, 
            reason: 'Template already exists and skipDuplicates is enabled' 
          })
          return result
        } else if (!options.overwrite && !options.updateExisting) {
          result.errors.push({ 
            template: templateData, 
            error: 'Template already exists. Use overwrite or updateExisting option.' 
          })
          return result
        }
      }

      // Apply import modifications
      if (options.newAuthor) {
        templateData.author.address = options.newAuthor
        templateData.author.verified = false
      }

      if (options.importAsPrivate) {
        templateData.visibility = 'private'
        templateData.status = 'draft'
      }

      // Import the template
      const importedTemplate = await flowTemplateService.createTemplate(
        templateData.flow,
        templateData
      )

      result.imported.push(importedTemplate)
      result.success = true

    } catch (error) {
      result.errors.push({
        template: templateData,
        error: error instanceof Error ? error.message : 'Unknown import error'
      })
    }

    return result
  }

  private async importTemplatePackage(
    packageData: TemplatePackage, 
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: [],
      skipped: [],
      errors: [],
      warnings: []
    }

    // Import each template in the package
    for (const templateData of packageData.templates) {
      const templateResult = await this.importSingleTemplate(templateData, options)
      
      result.imported.push(...templateResult.imported)
      result.skipped.push(...templateResult.skipped)
      result.errors.push(...templateResult.errors)
      result.warnings.push(...templateResult.warnings)
      
      if (!templateResult.success) {
        result.success = false
      }
    }

    return result
  }

  private isTemplatePackage(data: any): data is TemplatePackage {
    return data && 
           typeof data === 'object' && 
           'templates' in data && 
           Array.isArray(data.templates) &&
           'metadata' in data
  }

  private isFlowTemplate(data: any): data is FlowTemplate {
    return data && 
           typeof data === 'object' && 
           'id' in data && 
           'name' in data && 
           'flow' in data && 
           'parameters' in data
  }

  private convertToYAML(data: any): string {
    // Simple YAML conversion - in production, use a proper YAML library
    return JSON.stringify(data, null, 2)
      .replace(/"/g, '')
      .replace(/,$/gm, '')
      .replace(/^\s*\{/gm, '')
      .replace(/^\s*\}/gm, '')
  }

  private convertYAMLToJSON(yamlData: string): string {
    // Simple YAML to JSON conversion - in production, use a proper YAML parser
    try {
      // For now, assume it's already JSON-like
      return yamlData
    } catch (error) {
      throw new Error('YAML parsing not implemented. Please use JSON format.')
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = (e) => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  private generateSharingToken(templateId: string, options: any): string {
    return `share_${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private isVersionNewer(versionA: string, versionB: string): boolean {
    const parseVersion = (v: string) => v.split('.').map(Number)
    const [majorA, minorA, patchA] = parseVersion(versionA)
    const [majorB, minorB, patchB] = parseVersion(versionB)
    
    if (majorA !== majorB) return majorA > majorB
    if (minorA !== minorB) return minorA > minorB
    return patchA > patchB
  }
}

// Export singleton instance
export const templateImportExportService = new TemplateImportExportService()