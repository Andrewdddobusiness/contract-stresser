import { TestConfiguration } from '@/types/testing'
import { toast } from 'react-hot-toast'
import { Address } from 'viem'

export interface TestTemplate {
  id: string
  name: string
  description: string
  category: 'basic' | 'advanced' | 'performance' | 'stress' | 'custom'
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  tags: string[]
  author?: string
  version: string
  createdAt: Date
  updatedAt: Date
  isBuiltIn: boolean
  configuration: Omit<TestConfiguration, 'contractAddress'>
  requirements: string[]
  expectedOutcome: string
  estimatedDuration: string
  resources: {
    minAccounts: number
    estimatedGasCost: string
    recommendedBalance: string
  }
}

export interface TemplateCategory {
  category: TestTemplate['category']
  name: string
  description: string
  count: number
}

class TestTemplatesService {
  private templates: Map<string, TestTemplate> = new Map()
  private builtInTemplates: TestTemplate[] = []

  constructor() {
    this.initializeBuiltInTemplates()
    this.loadCustomTemplates()
  }

  private initializeBuiltInTemplates() {
    this.builtInTemplates = [
      // Basic Templates
      {
        id: 'basic-transfer',
        name: 'Basic Token Transfer',
        description: 'Simple ERC-20 token transfer test with sequential transactions',
        category: 'basic',
        difficulty: 'easy',
        tags: ['erc20', 'transfer', 'sequential'],
        version: '1.0.0',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isBuiltIn: true,
        configuration: {
          functionName: 'transfer',
          functionArgs: [
            { name: 'to', type: 'address', value: '0x742d35Cc6634C0532925a3b8D7389EDF59Fb4B6b' },
            { name: 'amount', type: 'uint256', value: '1000000000000000000' } // 1 ETH
          ],
          iterations: 10,
          network: 'local',
          mode: 'sequential',
          accountCount: 1,
          useMultipleAccounts: false,
          fundingAmount: '1.0',
          delayBetweenTx: 1000,
          gasPriceTier: 'normal',
          stopOnError: true,
          retryFailedTx: true,
          maxRetries: 2,
          timeoutMs: 30000
        },
        requirements: [
          'ERC-20 token contract deployed',
          'Test account with sufficient token balance',
          'Valid recipient address'
        ],
        expectedOutcome: 'All transfers complete successfully with consistent gas usage',
        estimatedDuration: '1-2 minutes',
        resources: {
          minAccounts: 1,
          estimatedGasCost: '0.001 ETH',
          recommendedBalance: '0.1 ETH'
        }
      },
      {
        id: 'concurrent-transfers',
        name: 'Concurrent Token Transfers',
        description: 'Multiple simultaneous token transfers to test concurrency handling',
        category: 'performance',
        difficulty: 'medium',
        tags: ['erc20', 'transfer', 'concurrent', 'performance'],
        version: '1.0.0',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isBuiltIn: true,
        configuration: {
          functionName: 'transfer',
          functionArgs: [
            { name: 'to', type: 'address', value: '0x742d35Cc6634C0532925a3b8D7389EDF59Fb4B6b' },
            { name: 'amount', type: 'uint256', value: '100000000000000000' } // 0.1 ETH
          ],
          iterations: 50,
          network: 'local',
          mode: 'concurrent',
          accountCount: 5,
          useMultipleAccounts: true,
          fundingAmount: '2.0',
          delayBetweenTx: 100,
          concurrencyLimit: 10,
          gasPriceTier: 'normal',
          stopOnError: false,
          retryFailedTx: true,
          maxRetries: 3,
          timeoutMs: 45000
        },
        requirements: [
          'ERC-20 token contract deployed',
          '5 test accounts with sufficient token balance',
          'Network supports concurrent transactions'
        ],
        expectedOutcome: 'High throughput transfers with minimal conflicts and consistent performance',
        estimatedDuration: '3-5 minutes',
        resources: {
          minAccounts: 5,
          estimatedGasCost: '0.02 ETH',
          recommendedBalance: '2.5 ETH per account'
        }
      },
      {
        id: 'approve-stress',
        name: 'Approval Stress Test',
        description: 'Intensive approve/transferFrom operations to test allowance mechanisms',
        category: 'stress',
        difficulty: 'hard',
        tags: ['erc20', 'approve', 'allowance', 'stress'],
        version: '1.0.0',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isBuiltIn: true,
        configuration: {
          functionName: 'approve',
          functionArgs: [
            { name: 'spender', type: 'address', value: '0x742d35Cc6634C0532925a3b8D7389EDF59Fb4B6b' },
            { name: 'amount', type: 'uint256', value: '1000000000000000000000' } // 1000 tokens
          ],
          iterations: 200,
          network: 'local',
          mode: 'multi-user',
          accountCount: 10,
          useMultipleAccounts: true,
          fundingAmount: '3.0',
          delayBetweenTx: 50,
          concurrencyLimit: 15,
          batchSize: 25,
          gasPriceTier: 'fast',
          stopOnError: false,
          retryFailedTx: true,
          maxRetries: 5,
          timeoutMs: 60000
        },
        requirements: [
          'ERC-20 token contract with approval functionality',
          '10 test accounts with substantial token balance',
          'High gas limit tolerance',
          'Stable network connection'
        ],
        expectedOutcome: 'Contract handles high-volume approvals without state corruption or gas issues',
        estimatedDuration: '8-12 minutes',
        resources: {
          minAccounts: 10,
          estimatedGasCost: '0.1 ETH',
          recommendedBalance: '4.0 ETH per account'
        }
      },
      {
        id: 'gas-optimization',
        name: 'Gas Optimization Analysis',
        description: 'Systematic gas usage analysis across different execution patterns',
        category: 'performance',
        difficulty: 'medium',
        tags: ['gas', 'optimization', 'analysis', 'performance'],
        version: '1.0.0',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isBuiltIn: true,
        configuration: {
          functionName: 'transfer',
          functionArgs: [
            { name: 'to', type: 'address', value: '0x742d35Cc6634C0532925a3b8D7389EDF59Fb4B6b' },
            { name: 'amount', type: 'uint256', value: '1000000000000000000' }
          ],
          iterations: 100,
          network: 'local',
          mode: 'sequential',
          accountCount: 3,
          useMultipleAccounts: true,
          fundingAmount: '2.0',
          delayBetweenTx: 2000,
          gasPriceTier: 'normal',
          stopOnError: true,
          retryFailedTx: false,
          maxRetries: 0,
          timeoutMs: 30000
        },
        requirements: [
          'Contract with gas-optimized functions',
          'Multiple test accounts',
          'Detailed gas monitoring enabled'
        ],
        expectedOutcome: 'Comprehensive gas usage patterns and optimization opportunities identified',
        estimatedDuration: '5-8 minutes',
        resources: {
          minAccounts: 3,
          estimatedGasCost: '0.05 ETH',
          recommendedBalance: '2.5 ETH per account'
        }
      },
      {
        id: 'extreme-load',
        name: 'Extreme Load Test',
        description: 'Maximum stress test with high transaction volume and concurrency',
        category: 'stress',
        difficulty: 'extreme',
        tags: ['extreme', 'load', 'stress', 'volume', 'concurrency'],
        version: '1.0.0',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isBuiltIn: true,
        configuration: {
          functionName: 'transfer',
          functionArgs: [
            { name: 'to', type: 'address', value: '0x742d35Cc6634C0532925a3b8D7389EDF59Fb4B6b' },
            { name: 'amount', type: 'uint256', value: '1000000000000000' } // 0.001 ETH
          ],
          iterations: 1000,
          network: 'local',
          mode: 'multi-user',
          accountCount: 20,
          useMultipleAccounts: true,
          fundingAmount: '5.0',
          delayBetweenTx: 10,
          concurrencyLimit: 50,
          batchSize: 50,
          gasPriceTier: 'fast',
          stopOnError: false,
          retryFailedTx: true,
          maxRetries: 10,
          timeoutMs: 120000
        },
        requirements: [
          'Highly optimized smart contract',
          '20+ test accounts with substantial funding',
          'High-performance network (local Anvil recommended)',
          'System monitoring capabilities',
          'WARNING: May consume significant resources'
        ],
        expectedOutcome: 'Contract maintains stability and performance under extreme load conditions',
        estimatedDuration: '15-30 minutes',
        resources: {
          minAccounts: 20,
          estimatedGasCost: '0.5 ETH',
          recommendedBalance: '6.0 ETH per account'
        }
      }
    ]

    // Add built-in templates to the main map
    this.builtInTemplates.forEach(template => {
      this.templates.set(template.id, template)
    })
  }

  private loadCustomTemplates() {
    try {
      const saved = localStorage.getItem('test-templates')
      if (saved) {
        const templates: TestTemplate[] = JSON.parse(saved)
        templates.forEach(template => {
          // Convert date strings back to Date objects
          template.createdAt = new Date(template.createdAt)
          template.updatedAt = new Date(template.updatedAt)
          this.templates.set(template.id, template)
        })
      }
    } catch (error) {
      console.warn('Failed to load saved templates:', error)
    }
  }

  private saveCustomTemplates() {
    try {
      const customTemplates = Array.from(this.templates.values()).filter(t => !t.isBuiltIn)
      localStorage.setItem('test-templates', JSON.stringify(customTemplates))
    } catch (error) {
      console.warn('Failed to save templates:', error)
    }
  }

  createTemplate(template: Omit<TestTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>): TestTemplate {
    const newTemplate: TestTemplate = {
      ...template,
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isBuiltIn: false
    }

    this.templates.set(newTemplate.id, newTemplate)
    this.saveCustomTemplates()
    toast.success(`Template "${newTemplate.name}" created`)
    return newTemplate
  }

  updateTemplate(id: string, updates: Partial<TestTemplate>): boolean {
    const template = this.templates.get(id)
    if (!template || template.isBuiltIn) {
      toast.error('Cannot update built-in template')
      return false
    }

    Object.assign(template, updates, { updatedAt: new Date() })
    this.saveCustomTemplates()
    toast.success(`Template "${template.name}" updated`)
    return true
  }

  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id)
    if (!template) return false

    if (template.isBuiltIn) {
      toast.error('Cannot delete built-in template')
      return false
    }

    this.templates.delete(id)
    this.saveCustomTemplates()
    toast.success(`Template "${template.name}" deleted`)
    return true
  }

  cloneTemplate(id: string, newName?: string): TestTemplate | null {
    const original = this.templates.get(id)
    if (!original) return null

    const cloned = this.createTemplate({
      ...original,
      name: newName || `${original.name} (Copy)`,
      version: '1.0.0',
      author: undefined // Clear author for cloned templates
    })

    toast.success(`Template cloned as "${cloned.name}"`)
    return cloned
  }

  getTemplate(id: string): TestTemplate | null {
    return this.templates.get(id) || null
  }

  getAllTemplates(): TestTemplate[] {
    return Array.from(this.templates.values()).sort((a, b) => {
      // Sort by category first, then by difficulty, then by name
      if (a.category !== b.category) {
        const categoryOrder = ['basic', 'performance', 'advanced', 'stress', 'custom']
        return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
      }
      if (a.difficulty !== b.difficulty) {
        const difficultyOrder = ['easy', 'medium', 'hard', 'extreme']
        return difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty)
      }
      return a.name.localeCompare(b.name)
    })
  }

  getBuiltInTemplates(): TestTemplate[] {
    return this.builtInTemplates
  }

  getCustomTemplates(): TestTemplate[] {
    return Array.from(this.templates.values()).filter(t => !t.isBuiltIn)
  }

  getTemplatesByCategory(category: TestTemplate['category']): TestTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category)
  }

  getTemplatesByDifficulty(difficulty: TestTemplate['difficulty']): TestTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.difficulty === difficulty)
  }

  searchTemplates(query: string): TestTemplate[] {
    const lowercaseQuery = query.toLowerCase()
    return Array.from(this.templates.values()).filter(template =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    )
  }

  getCategories(): TemplateCategory[] {
    const categoryMap = new Map<TestTemplate['category'], TemplateCategory>()

    // Initialize categories
    const categoryInfo = {
      basic: { name: 'Basic Tests', description: 'Simple, foundational test scenarios for beginners' },
      performance: { name: 'Performance Tests', description: 'Measure and analyze contract performance metrics' },
      advanced: { name: 'Advanced Tests', description: 'Complex scenarios for experienced users' },
      stress: { name: 'Stress Tests', description: 'High-intensity tests to find breaking points' },
      custom: { name: 'Custom Tests', description: 'User-created test templates' }
    }

    // Count templates in each category
    Array.from(this.templates.values()).forEach(template => {
      if (!categoryMap.has(template.category)) {
        categoryMap.set(template.category, {
          category: template.category,
          name: categoryInfo[template.category].name,
          description: categoryInfo[template.category].description,
          count: 0
        })
      }
      categoryMap.get(template.category)!.count++
    })

    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  createConfigurationFromTemplate(templateId: string, contractAddress: Address): TestConfiguration | null {
    const template = this.templates.get(templateId)
    if (!template) return null

    return {
      ...template.configuration,
      contractAddress
    }
  }

  exportTemplate(id: string): string | null {
    const template = this.templates.get(id)
    if (!template) return null

    return JSON.stringify(template, null, 2)
  }

  importTemplate(templateData: string): TestTemplate | null {
    try {
      const template: TestTemplate = JSON.parse(templateData)
      
      // Validate required fields
      if (!template.name || !template.configuration) {
        throw new Error('Invalid template format')
      }

      // Generate new ID and mark as custom
      const importedTemplate = this.createTemplate({
        ...template,
        isBuiltIn: false
      })

      toast.success(`Template "${importedTemplate.name}" imported`)
      return importedTemplate
    } catch (error) {
      toast.error('Failed to import template: Invalid format')
      return null
    }
  }

  // Quick template creation helpers
  createBasicTemplate(name: string, functionName: string, args: any[], iterations: number = 10): TestTemplate {
    return this.createTemplate({
      name,
      description: `Basic ${functionName} test with ${iterations} iterations`,
      category: 'basic',
      difficulty: 'easy',
      tags: [functionName, 'basic'],
      version: '1.0.0',
      configuration: {
        functionName,
        functionArgs: args,
        iterations,
        network: 'local',
        mode: 'sequential',
        accountCount: 1,
        useMultipleAccounts: false,
        fundingAmount: '1.0',
        delayBetweenTx: 1000,
        gasPriceTier: 'normal',
        stopOnError: true,
        retryFailedTx: true,
        maxRetries: 2,
        timeoutMs: 30000
      },
      requirements: ['Contract deployed with the specified function'],
      expectedOutcome: 'All function calls complete successfully',
      estimatedDuration: '1-2 minutes',
      resources: {
        minAccounts: 1,
        estimatedGasCost: '0.01 ETH',
        recommendedBalance: '0.1 ETH'
      }
    })
  }
}

export const testTemplatesService = new TestTemplatesService()
export default testTemplatesService