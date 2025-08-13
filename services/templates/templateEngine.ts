'use client'

import { Address } from 'viem'
import { Flow, FlowBlock, BlockConnection, FlowModification } from '@/services/flowDesigner/flowBuilder'

// Template System Types
export interface TemplateMetadata {
  version: string
  createdAt: Date
  updatedAt: Date
  compatibility: {
    minClientVersion: string
    blockVersions: Record<string, string>
  }
  license?: string
  repository?: string
  documentation?: string
}

export interface TemplateParameter {
  name: string
  type: 'address' | 'amount' | 'token' | 'number' | 'string' | 'boolean'
  description: string
  defaultValue?: any
  validation: ParameterValidation
  required: boolean
  group?: string
  dependsOn?: string[]
}

export interface ParameterValidation {
  min?: number | string
  max?: number | string
  pattern?: string
  isContract?: boolean
  implements?: string
  custom?: (value: any) => boolean | string
}

export interface TemplateRequirement {
  type: 'balance' | 'approval' | 'role' | 'contract' | 'network'
  description: string
  details: Record<string, any>
  optional: boolean
}

export interface Rating {
  userId: Address
  score: number
  comment?: string
  timestamp: Date
}

export interface FlowTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  tags: string[]
  author: {
    address: Address
    name?: string
    verified: boolean
  }
  flow: Flow
  parameters: TemplateParameter[]
  requirements: TemplateRequirement[]
  metadata: TemplateMetadata
  usage: {
    downloads: number
    ratings: Rating[]
    averageRating: number
    lastUsed?: Date
  }
  status: 'draft' | 'published' | 'deprecated'
  visibility: 'public' | 'private' | 'team'
}

export type TemplateCategory = 
  | 'DeFi' 
  | 'NFT' 
  | 'Governance' 
  | 'Gaming' 
  | 'Utility' 
  | 'Advanced'

export interface TemplateSearchQuery {
  query?: string
  category?: TemplateCategory
  difficulty?: string[]
  tags?: string[]
  author?: Address
  minRating?: number
  sortBy?: 'rating' | 'downloads' | 'recent' | 'name'
  limit?: number
  offset?: number
}

export interface SharingPermissions {
  visibility: 'public' | 'private' | 'team'
  allowFork: boolean
  allowModification: boolean
  teamMembers?: Address[]
  expiresAt?: Date
}

export interface TemplateApplication {
  templateId: string
  parameters: Record<string, any>
  userId: Address
  timestamp: Date
}

export interface TemplateValidationResult {
  isValid: boolean
  errors: {
    field?: string
    message: string
    severity: 'error' | 'warning'
  }[]
  warnings: {
    field?: string
    message: string
  }[]
  estimatedGas?: bigint
  requiredBalance?: Record<string, bigint>
}

// Template Engine Service
export class FlowTemplateService {
  private templates = new Map<string, FlowTemplate>()
  private templatesByCategory = new Map<TemplateCategory, string[]>()
  private templatesByAuthor = new Map<Address, string[]>()
  private applicationHistory: TemplateApplication[] = []

  constructor() {
    this.initializeBuiltInTemplates()
  }

  // Template Creation and Management
  async createTemplate(
    flow: Flow, 
    metadata: Partial<FlowTemplate>
  ): Promise<FlowTemplate> {
    const templateId = this.generateTemplateId()
    
    const template: FlowTemplate = {
      id: templateId,
      name: metadata.name || flow.name || 'Unnamed Template',
      description: metadata.description || flow.description || '',
      category: metadata.category || 'Utility',
      difficulty: metadata.difficulty || 'intermediate',
      tags: metadata.tags || [],
      author: metadata.author || {
        address: '0x0000000000000000000000000000000000000000' as Address,
        verified: false
      },
      flow: this.sanitizeFlowForTemplate(flow),
      parameters: this.extractTemplateParameters(flow),
      requirements: this.analyzeFlowRequirements(flow),
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        compatibility: {
          minClientVersion: '1.0.0',
          blockVersions: {}
        },
        ...metadata.metadata
      },
      usage: {
        downloads: 0,
        ratings: [],
        averageRating: 0
      },
      status: 'draft',
      visibility: 'private'
    }

    this.templates.set(templateId, template)
    this.indexTemplate(template)

    return template
  }

  async applyTemplate(
    templateId: string, 
    parameters: Record<string, any>
  ): Promise<Flow> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    // Validate parameters
    const validation = this.validateTemplateParameters(template, parameters)
    if (!validation.isValid) {
      throw new Error(`Invalid parameters: ${validation.errors[0].message}`)
    }

    // Apply parameters to template flow
    const appliedFlow = await this.substituteTemplateParameters(
      template.flow,
      template.parameters,
      parameters
    )

    // Track usage
    this.applicationHistory.push({
      templateId,
      parameters,
      userId: '0x0000000000000000000000000000000000000000' as Address, // TODO: Get from user context
      timestamp: new Date()
    })

    // Update download count
    template.usage.downloads++

    return appliedFlow
  }

  async searchTemplates(query: TemplateSearchQuery): Promise<FlowTemplate[]> {
    let results = Array.from(this.templates.values())

    // Filter by visibility (only public templates for now)
    results = results.filter(template => 
      template.visibility === 'public' && template.status === 'published'
    )

    // Text search
    if (query.query) {
      const searchTerm = query.query.toLowerCase()
      results = results.filter(template =>
        template.name.toLowerCase().includes(searchTerm) ||
        template.description.toLowerCase().includes(searchTerm) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    }

    // Category filter
    if (query.category) {
      results = results.filter(template => template.category === query.category)
    }

    // Difficulty filter
    if (query.difficulty && query.difficulty.length > 0) {
      results = results.filter(template => query.difficulty!.includes(template.difficulty))
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      results = results.filter(template =>
        query.tags!.some(tag => template.tags.includes(tag))
      )
    }

    // Author filter
    if (query.author) {
      results = results.filter(template => template.author.address === query.author)
    }

    // Minimum rating filter
    if (query.minRating !== undefined) {
      results = results.filter(template => template.usage.averageRating >= query.minRating!)
    }

    // Sort results
    if (query.sortBy) {
      results.sort((a, b) => {
        switch (query.sortBy) {
          case 'rating':
            return b.usage.averageRating - a.usage.averageRating
          case 'downloads':
            return b.usage.downloads - a.usage.downloads
          case 'recent':
            return b.metadata.updatedAt.getTime() - a.metadata.updatedAt.getTime()
          case 'name':
            return a.name.localeCompare(b.name)
          default:
            return 0
        }
      })
    }

    // Pagination
    const offset = query.offset || 0
    const limit = query.limit || 50
    
    return results.slice(offset, offset + limit)
  }

  async forkTemplate(
    templateId: string, 
    modifications: FlowModification[]
  ): Promise<FlowTemplate> {
    const originalTemplate = this.templates.get(templateId)
    if (!originalTemplate) {
      throw new Error(`Template ${templateId} not found`)
    }

    // Create a copy of the template
    const forkedFlow = this.deepCloneFlow(originalTemplate.flow)
    
    // Apply modifications
    for (const modification of modifications) {
      await this.applyFlowModification(forkedFlow, modification)
    }

    // Create new template from modified flow
    const forkedTemplate = await this.createTemplate(forkedFlow, {
      name: `${originalTemplate.name} (Fork)`,
      description: `Forked from ${originalTemplate.name}`,
      category: originalTemplate.category,
      difficulty: originalTemplate.difficulty,
      tags: [...originalTemplate.tags, 'fork']
    })

    return forkedTemplate
  }

  async shareTemplate(
    templateId: string, 
    permissions: SharingPermissions
  ): Promise<string> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    // Update template permissions
    template.visibility = permissions.visibility
    template.metadata.updatedAt = new Date()

    // Generate sharing URL/token
    const sharingToken = this.generateSharingToken(templateId, permissions)
    
    return sharingToken
  }

  // Template Parameter Validation
  validateTemplateParameters(
    template: FlowTemplate,
    parameters: Record<string, any>
  ): TemplateValidationResult {
    const errors: { field?: string; message: string; severity: 'error' | 'warning' }[] = []
    const warnings: { field?: string; message: string }[] = []

    for (const param of template.parameters) {
      const value = parameters[param.name]

      // Required parameter check
      if (param.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: param.name,
          message: `Required parameter '${param.name}' is missing`,
          severity: 'error'
        })
        continue
      }

      // Type validation
      if (value !== undefined && !this.validateParameterType(param, value)) {
        errors.push({
          field: param.name,
          message: `Parameter '${param.name}' must be of type ${param.type}`,
          severity: 'error'
        })
        continue
      }

      // Custom validation
      if (value !== undefined && param.validation.custom) {
        const customResult = param.validation.custom(value)
        if (typeof customResult === 'string') {
          errors.push({
            field: param.name,
            message: customResult,
            severity: 'error'
          })
        }
      }

      // Range validation for numbers
      if (value !== undefined && param.type === 'number') {
        if (param.validation.min !== undefined && value < param.validation.min) {
          errors.push({
            field: param.name,
            message: `${param.name} must be at least ${param.validation.min}`,
            severity: 'error'
          })
        }
        if (param.validation.max !== undefined && value > param.validation.max) {
          errors.push({
            field: param.name,
            message: `${param.name} must be at most ${param.validation.max}`,
            severity: 'error'
          })
        }
      }

      // Pattern validation for strings
      if (value !== undefined && param.type === 'string' && param.validation.pattern) {
        const regex = new RegExp(param.validation.pattern)
        if (!regex.test(value)) {
          errors.push({
            field: param.name,
            message: `${param.name} format is invalid`,
            severity: 'error'
          })
        }
      }

      // Address validation
      if (value !== undefined && param.type === 'address') {
        if (!this.isValidAddress(value)) {
          errors.push({
            field: param.name,
            message: `${param.name} must be a valid Ethereum address`,
            severity: 'error'
          })
        }
      }
    }

    // Dependency validation
    for (const param of template.parameters) {
      if (param.dependsOn && param.dependsOn.length > 0) {
        for (const dependency of param.dependsOn) {
          if (parameters[param.name] !== undefined && !parameters[dependency]) {
            warnings.push({
              field: param.name,
              message: `${param.name} depends on ${dependency} which is not set`
            })
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  // Template Management
  getTemplate(templateId: string): FlowTemplate | undefined {
    return this.templates.get(templateId)
  }

  getTemplatesByCategory(category: TemplateCategory): FlowTemplate[] {
    const templateIds = this.templatesByCategory.get(category) || []
    return templateIds.map(id => this.templates.get(id)!).filter(Boolean)
  }

  getTemplatesByAuthor(author: Address): FlowTemplate[] {
    const templateIds = this.templatesByAuthor.get(author) || []
    return templateIds.map(id => this.templates.get(id)!).filter(Boolean)
  }

  async rateTemplate(
    templateId: string, 
    userId: Address, 
    rating: number, 
    comment?: string
  ): Promise<void> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    // Remove existing rating by this user
    template.usage.ratings = template.usage.ratings.filter(r => r.userId !== userId)

    // Add new rating
    template.usage.ratings.push({
      userId,
      score: Math.max(1, Math.min(5, rating)),
      comment,
      timestamp: new Date()
    })

    // Update average rating
    template.usage.averageRating = 
      template.usage.ratings.reduce((sum, r) => sum + r.score, 0) / 
      template.usage.ratings.length
  }

  // Private Helper Methods
  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private sanitizeFlowForTemplate(flow: Flow): Flow {
    // Remove user-specific data and prepare flow for template use
    return {
      ...flow,
      id: 'template_flow',
      name: flow.name || 'Template Flow',
      blocks: flow.blocks.map(block => ({
        ...block,
        id: block.id, // Keep original IDs for parameter mapping
      })),
      connections: flow.connections
    }
  }

  private extractTemplateParameters(flow: Flow): TemplateParameter[] {
    const parameters: TemplateParameter[] = []
    const parameterNames = new Set<string>()

    // Scan flow blocks for configurable parameters
    for (const block of flow.blocks) {
      for (const [key, value] of Object.entries(block.config || {})) {
        // Look for parameter placeholders (e.g., ${tokenAddress})
        if (typeof value === 'string' && value.includes('${')) {
          const matches = value.match(/\$\{([^}]+)\}/g)
          if (matches) {
            for (const match of matches) {
              const paramName = match.slice(2, -1)
              if (!parameterNames.has(paramName)) {
                parameterNames.add(paramName)
                parameters.push(this.createParameterFromContext(paramName, key, block.type))
              }
            }
          }
        }
      }
    }

    return parameters
  }

  private createParameterFromContext(
    paramName: string, 
    configKey: string, 
    blockType: string
  ): TemplateParameter {
    // Infer parameter type from context
    let type: TemplateParameter['type'] = 'string'
    let validation: ParameterValidation = {}

    if (paramName.toLowerCase().includes('address') || configKey.toLowerCase().includes('address')) {
      type = 'address'
      validation.isContract = true
    } else if (paramName.toLowerCase().includes('amount') || configKey.toLowerCase().includes('amount')) {
      type = 'amount'
      validation.min = '0'
    } else if (paramName.toLowerCase().includes('token')) {
      type = 'address'
      validation.isContract = true
      validation.implements = 'IERC20'
    }

    return {
      name: paramName,
      type,
      description: `${paramName} for ${blockType}`,
      validation,
      required: true
    }
  }

  private analyzeFlowRequirements(flow: Flow): TemplateRequirement[] {
    const requirements: TemplateRequirement[] = []

    // Analyze flow for common requirements
    for (const block of flow.blocks) {
      switch (block.type) {
        case 'token_transfer':
        case 'token_approval':
          requirements.push({
            type: 'balance',
            description: 'Sufficient token balance required',
            details: { blockId: block.id },
            optional: false
          })
          break
        case 'atomic_swap':
          requirements.push({
            type: 'approval',
            description: 'Token approvals required for swap',
            details: { blockId: block.id },
            optional: false
          })
          break
      }
    }

    return requirements
  }

  private async substituteTemplateParameters(
    templateFlow: Flow,
    parameters: TemplateParameter[],
    values: Record<string, any>
  ): Promise<Flow> {
    const newFlow = this.deepCloneFlow(templateFlow)
    
    // Generate new IDs for the flow and blocks
    newFlow.id = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const blockIdMap = new Map<string, string>()
    newFlow.blocks = newFlow.blocks.map(block => {
      const newBlockId = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      blockIdMap.set(block.id, newBlockId)
      
      return {
        ...block,
        id: newBlockId,
        config: this.substituteConfigParameters(block.config, values)
      }
    })

    // Update connections with new block IDs
    newFlow.connections = newFlow.connections.map(conn => ({
      ...conn,
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceBlock: blockIdMap.get(conn.sourceBlock) || conn.sourceBlock,
      targetBlock: blockIdMap.get(conn.targetBlock) || conn.targetBlock
    }))

    return newFlow
  }

  private substituteConfigParameters(config: any, values: Record<string, any>): any {
    if (typeof config === 'string') {
      return config.replace(/\$\{([^}]+)\}/g, (match, paramName) => {
        return values[paramName] !== undefined ? values[paramName] : match
      })
    } else if (typeof config === 'object' && config !== null) {
      const result: any = Array.isArray(config) ? [] : {}
      for (const [key, value] of Object.entries(config)) {
        result[key] = this.substituteConfigParameters(value, values)
      }
      return result
    }
    return config
  }

  private validateParameterType(param: TemplateParameter, value: any): boolean {
    switch (param.type) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'address':
        return typeof value === 'string' && this.isValidAddress(value)
      case 'amount':
        return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
      case 'token':
        return typeof value === 'string' && this.isValidAddress(value)
      default:
        return true
    }
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  private deepCloneFlow(flow: Flow): Flow {
    return JSON.parse(JSON.stringify(flow))
  }

  private async applyFlowModification(flow: Flow, modification: FlowModification): Promise<void> {
    // Implementation depends on FlowModification structure from flowBuilder
    // This would modify the flow according to the modification specification
    console.log('Applying flow modification:', modification)
  }

  private indexTemplate(template: FlowTemplate): void {
    // Index by category
    if (!this.templatesByCategory.has(template.category)) {
      this.templatesByCategory.set(template.category, [])
    }
    this.templatesByCategory.get(template.category)!.push(template.id)

    // Index by author
    if (!this.templatesByAuthor.has(template.author.address)) {
      this.templatesByAuthor.set(template.author.address, [])
    }
    this.templatesByAuthor.get(template.author.address)!.push(template.id)
  }

  private generateSharingToken(templateId: string, permissions: SharingPermissions): string {
    // Generate a secure sharing token
    return `share_${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`
  }

  private initializeBuiltInTemplates(): void {
    // Import built-in templates
    import('@/templates/defi/atomicSwapTemplates').then(({ ATOMIC_SWAP_TEMPLATES }) => {
      ATOMIC_SWAP_TEMPLATES.forEach(template => {
        this.templates.set(template.id, template)
        this.indexTemplate(template)
      })
    }).catch(error => {
      console.warn('Failed to load built-in templates:', error)
    })
  }
}

// Export singleton instance
export const flowTemplateService = new FlowTemplateService()