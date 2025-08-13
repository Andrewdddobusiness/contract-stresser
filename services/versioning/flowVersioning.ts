'use client'

import { Address } from 'viem'
import { Flow, FlowBlock, BlockConnection } from '@/services/flowDesigner/flowBuilder'

// Versioning System Types
export interface FlowVersion {
  id: string
  flowId: string
  version: string // semantic versioning (1.0.0)
  parentVersion?: string
  changes: FlowChange[]
  flow: Flow
  metadata: {
    author: Address
    timestamp: Date
    description: string
    tags: string[]
    commitMessage: string
  }
  status: 'draft' | 'published' | 'deprecated'
  branch?: string
}

export interface FlowChange {
  type: 'add' | 'remove' | 'modify'
  target: 'block' | 'connection' | 'config' | 'metadata'
  path: string
  elementId?: string
  oldValue?: any
  newValue?: any
  description: string
}

export interface FlowBranch {
  id: string
  name: string
  flowId: string
  baseVersion: string
  headVersion: string
  createdAt: Date
  author: Address
  description: string
  status: 'active' | 'merged' | 'abandoned'
}

export interface VersionComparison {
  versionA: FlowVersion
  versionB: FlowVersion
  differences: FlowDifference[]
  summary: {
    blocksAdded: number
    blocksRemoved: number
    blocksModified: number
    connectionsAdded: number
    connectionsRemoved: number
    configChanges: number
  }
}

export interface FlowDifference {
  type: 'addition' | 'deletion' | 'modification'
  target: 'block' | 'connection' | 'config' | 'metadata'
  path: string
  elementId?: string
  before?: any
  after?: any
  description: string
  impact: 'low' | 'medium' | 'high' | 'critical'
}

export interface MergeResult {
  success: boolean
  mergedVersion?: FlowVersion
  conflicts: MergeConflict[]
  warnings: string[]
}

export interface MergeConflict {
  type: 'block_conflict' | 'connection_conflict' | 'config_conflict'
  elementId: string
  path: string
  baseValue: any
  versionAValue: any
  versionBValue: any
  description: string
  resolution?: 'use_a' | 'use_b' | 'merge' | 'manual'
}

export interface VersionTag {
  name: string
  versionId: string
  description: string
  createdAt: Date
  author: Address
  type: 'release' | 'milestone' | 'snapshot'
}

export interface FlowHistory {
  flowId: string
  versions: FlowVersion[]
  branches: FlowBranch[]
  tags: VersionTag[]
  defaultBranch: string
}

// Flow Versioning Service
export class FlowVersioningService {
  private versions = new Map<string, FlowVersion>()
  private versionsByFlow = new Map<string, string[]>()
  private branches = new Map<string, FlowBranch>()
  private tags = new Map<string, VersionTag>()
  private histories = new Map<string, FlowHistory>()

  // Version Management
  async createVersion(
    flowId: string, 
    changes: FlowChange[], 
    options: {
      description?: string
      tags?: string[]
      parentVersion?: string
      branch?: string
      commitMessage?: string
    } = {}
  ): Promise<FlowVersion> {
    const versionId = this.generateVersionId()
    const currentVersions = this.getVersionHistory(flowId)
    const parentVersion = options.parentVersion || currentVersions[0]?.id
    
    // Calculate semantic version number
    const newVersionNumber = this.calculateNextVersion(flowId, parentVersion, changes)
    
    // Get the flow (this would come from flowBuilderService)
    const flow = await this.getFlowSnapshot(flowId)
    
    const version: FlowVersion = {
      id: versionId,
      flowId,
      version: newVersionNumber,
      parentVersion,
      changes,
      flow,
      metadata: {
        author: '0x0000000000000000000000000000000000000000' as Address, // TODO: Get from user context
        timestamp: new Date(),
        description: options.description || 'Version update',
        tags: options.tags || [],
        commitMessage: options.commitMessage || `Update to version ${newVersionNumber}`
      },
      status: 'draft',
      branch: options.branch || 'main'
    }

    // Store version
    this.versions.set(versionId, version)
    
    // Update flow versions index
    if (!this.versionsByFlow.has(flowId)) {
      this.versionsByFlow.set(flowId, [])
    }
    this.versionsByFlow.get(flowId)!.unshift(versionId)

    // Update flow history
    this.updateFlowHistory(flowId, version)

    return version
  }

  async compareVersions(versionAId: string, versionBId: string): Promise<VersionComparison> {
    const versionA = this.versions.get(versionAId)
    const versionB = this.versions.get(versionBId)

    if (!versionA || !versionB) {
      throw new Error('One or both versions not found')
    }

    const differences = this.calculateDifferences(versionA.flow, versionB.flow)
    const summary = this.calculateDifferenceSummary(differences)

    return {
      versionA,
      versionB,
      differences,
      summary
    }
  }

  async mergeVersions(
    baseVersionId: string, 
    mergeVersionId: string,
    options: {
      strategy?: 'auto' | 'manual'
      conflictResolutions?: Record<string, 'use_a' | 'use_b' | 'merge'>
      description?: string
    } = {}
  ): Promise<MergeResult> {
    const baseVersion = this.versions.get(baseVersionId)
    const mergeVersion = this.versions.get(mergeVersionId)

    if (!baseVersion || !mergeVersion) {
      throw new Error('One or both versions not found')
    }

    // Detect conflicts
    const conflicts = this.detectMergeConflicts(baseVersion.flow, mergeVersion.flow)
    
    if (conflicts.length > 0 && options.strategy !== 'manual') {
      return {
        success: false,
        conflicts,
        warnings: ['Conflicts detected. Manual resolution required.']
      }
    }

    // Perform merge
    const mergedFlow = await this.performMerge(
      baseVersion.flow,
      mergeVersion.flow,
      conflicts,
      options.conflictResolutions || {}
    )

    // Create merged changes list
    const mergedChanges = this.calculateMergeChanges(baseVersion, mergeVersion, conflicts)

    // Create new version for merged result
    const mergedVersion = await this.createVersion(baseVersion.flowId, mergedChanges, {
      description: options.description || `Merge ${mergeVersion.version} into ${baseVersion.version}`,
      commitMessage: `Merge version ${mergeVersion.version}`,
      parentVersion: baseVersion.id
    })

    return {
      success: true,
      mergedVersion,
      conflicts: [],
      warnings: []
    }
  }

  async createBranch(
    versionId: string, 
    branchName: string,
    description: string = ''
  ): Promise<FlowBranch> {
    const version = this.versions.get(versionId)
    if (!version) {
      throw new Error(`Version ${versionId} not found`)
    }

    const branchId = this.generateBranchId()
    const branch: FlowBranch = {
      id: branchId,
      name: branchName,
      flowId: version.flowId,
      baseVersion: versionId,
      headVersion: versionId,
      createdAt: new Date(),
      author: version.metadata.author,
      description,
      status: 'active'
    }

    this.branches.set(branchId, branch)
    
    // Update flow history
    const history = this.histories.get(version.flowId)
    if (history) {
      history.branches.push(branch)
    }

    return branch
  }

  getVersionHistory(flowId: string): FlowVersion[] {
    const versionIds = this.versionsByFlow.get(flowId) || []
    return versionIds.map(id => this.versions.get(id)!).filter(Boolean)
  }

  getVersion(versionId: string): FlowVersion | undefined {
    return this.versions.get(versionId)
  }

  getBranches(flowId: string): FlowBranch[] {
    return Array.from(this.branches.values()).filter(branch => branch.flowId === flowId)
  }

  // Version Tagging
  async createTag(
    versionId: string,
    name: string,
    description: string,
    type: VersionTag['type'] = 'snapshot'
  ): Promise<VersionTag> {
    const version = this.versions.get(versionId)
    if (!version) {
      throw new Error(`Version ${versionId} not found`)
    }

    const tag: VersionTag = {
      name,
      versionId,
      description,
      createdAt: new Date(),
      author: version.metadata.author,
      type
    }

    const tagKey = `${version.flowId}_${name}`
    this.tags.set(tagKey, tag)

    // Update flow history
    const history = this.histories.get(version.flowId)
    if (history) {
      history.tags.push(tag)
    }

    return tag
  }

  getTags(flowId: string): VersionTag[] {
    const history = this.histories.get(flowId)
    return history?.tags || []
  }

  async revertToVersion(flowId: string, versionId: string): Promise<FlowVersion> {
    const targetVersion = this.versions.get(versionId)
    if (!targetVersion) {
      throw new Error(`Version ${versionId} not found`)
    }

    // Create revert changes
    const revertChanges: FlowChange[] = [{
      type: 'modify',
      target: 'metadata',
      path: 'flow',
      description: `Revert to version ${targetVersion.version}`,
      newValue: targetVersion.flow,
      oldValue: null // Current flow state
    }]

    // Create new version that reverts to target
    const revertVersion = await this.createVersion(flowId, revertChanges, {
      description: `Revert to version ${targetVersion.version}`,
      commitMessage: `Revert to ${targetVersion.version}`,
      tags: ['revert']
    })

    return revertVersion
  }

  // Diff and Analysis
  generateDiff(versionAId: string, versionBId: string): string {
    const comparison = this.compareVersions(versionAId, versionBId)
    
    // Generate unified diff format
    let diff = `--- Version ${comparison.versionA.version}\n`
    diff += `+++ Version ${comparison.versionB.version}\n`
    
    for (const difference of comparison.differences) {
      diff += this.formatDifference(difference)
    }
    
    return diff
  }

  // Private Helper Methods
  private generateVersionId(): string {
    return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateBranchId(): string {
    return `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private calculateNextVersion(
    flowId: string, 
    parentVersionId?: string, 
    changes: FlowChange[] = []
  ): string {
    const versions = this.getVersionHistory(flowId)
    
    if (versions.length === 0) {
      return '1.0.0'
    }

    const parentVersion = parentVersionId ? 
      versions.find(v => v.id === parentVersionId) : 
      versions[0]

    if (!parentVersion) {
      return '1.0.0'
    }

    const [major, minor, patch] = parentVersion.version.split('.').map(Number)
    
    // Analyze changes to determine version bump
    const hasBreakingChanges = changes.some(c => 
      c.type === 'remove' || 
      (c.type === 'modify' && c.target === 'block')
    )
    
    const hasNewFeatures = changes.some(c => c.type === 'add')
    
    if (hasBreakingChanges) {
      return `${major + 1}.0.0`
    } else if (hasNewFeatures) {
      return `${major}.${minor + 1}.0`
    } else {
      return `${major}.${minor}.${patch + 1}`
    }
  }

  private async getFlowSnapshot(flowId: string): Promise<Flow> {
    // This would get the current flow state from flowBuilderService
    // For now, return a placeholder
    return {
      id: flowId,
      name: 'Flow Snapshot',
      description: '',
      blocks: [],
      connections: [],
      globalConfig: {},
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  }

  private calculateDifferences(flowA: Flow, flowB: Flow): FlowDifference[] {
    const differences: FlowDifference[] = []

    // Compare blocks
    const blocksA = new Map(flowA.blocks.map(b => [b.id, b]))
    const blocksB = new Map(flowB.blocks.map(b => [b.id, b]))

    // Find added blocks
    for (const [id, block] of blocksB) {
      if (!blocksA.has(id)) {
        differences.push({
          type: 'addition',
          target: 'block',
          path: `blocks.${id}`,
          elementId: id,
          after: block,
          description: `Added block: ${block.name || block.type}`,
          impact: 'medium'
        })
      }
    }

    // Find removed blocks
    for (const [id, block] of blocksA) {
      if (!blocksB.has(id)) {
        differences.push({
          type: 'deletion',
          target: 'block',
          path: `blocks.${id}`,
          elementId: id,
          before: block,
          description: `Removed block: ${block.name || block.type}`,
          impact: 'high'
        })
      }
    }

    // Find modified blocks
    for (const [id, blockA] of blocksA) {
      const blockB = blocksB.get(id)
      if (blockB && !this.deepEqual(blockA, blockB)) {
        differences.push({
          type: 'modification',
          target: 'block',
          path: `blocks.${id}`,
          elementId: id,
          before: blockA,
          after: blockB,
          description: `Modified block: ${blockA.name || blockA.type}`,
          impact: 'medium'
        })
      }
    }

    // Compare connections
    const connectionsA = new Map(flowA.connections.map(c => [c.id, c]))
    const connectionsB = new Map(flowB.connections.map(c => [c.id, c]))

    // Find added connections
    for (const [id, conn] of connectionsB) {
      if (!connectionsA.has(id)) {
        differences.push({
          type: 'addition',
          target: 'connection',
          path: `connections.${id}`,
          elementId: id,
          after: conn,
          description: `Added connection: ${conn.sourceBlock} -> ${conn.targetBlock}`,
          impact: 'low'
        })
      }
    }

    // Find removed connections
    for (const [id, conn] of connectionsA) {
      if (!connectionsB.has(id)) {
        differences.push({
          type: 'deletion',
          target: 'connection',
          path: `connections.${id}`,
          elementId: id,
          before: conn,
          description: `Removed connection: ${conn.sourceBlock} -> ${conn.targetBlock}`,
          impact: 'medium'
        })
      }
    }

    return differences
  }

  private calculateDifferenceSummary(differences: FlowDifference[]) {
    return {
      blocksAdded: differences.filter(d => d.type === 'addition' && d.target === 'block').length,
      blocksRemoved: differences.filter(d => d.type === 'deletion' && d.target === 'block').length,
      blocksModified: differences.filter(d => d.type === 'modification' && d.target === 'block').length,
      connectionsAdded: differences.filter(d => d.type === 'addition' && d.target === 'connection').length,
      connectionsRemoved: differences.filter(d => d.type === 'deletion' && d.target === 'connection').length,
      configChanges: differences.filter(d => d.target === 'config').length
    }
  }

  private detectMergeConflicts(baseFlow: Flow, mergeFlow: Flow): MergeConflict[] {
    const conflicts: MergeConflict[] = []

    // Detect block conflicts (same ID, different content)
    const baseBlocks = new Map(baseFlow.blocks.map(b => [b.id, b]))
    const mergeBlocks = new Map(mergeFlow.blocks.map(b => [b.id, b]))

    for (const [id, baseBlock] of baseBlocks) {
      const mergeBlock = mergeBlocks.get(id)
      if (mergeBlock && !this.deepEqual(baseBlock, mergeBlock)) {
        conflicts.push({
          type: 'block_conflict',
          elementId: id,
          path: `blocks.${id}`,
          baseValue: baseBlock,
          versionAValue: baseBlock,
          versionBValue: mergeBlock,
          description: `Conflicting changes to block ${baseBlock.name || baseBlock.type}`
        })
      }
    }

    return conflicts
  }

  private async performMerge(
    baseFlow: Flow,
    mergeFlow: Flow,
    conflicts: MergeConflict[],
    resolutions: Record<string, 'use_a' | 'use_b' | 'merge'>
  ): Promise<Flow> {
    const mergedFlow: Flow = JSON.parse(JSON.stringify(baseFlow))

    // Apply merge resolution strategies
    for (const conflict of conflicts) {
      const resolution = resolutions[conflict.elementId] || 'use_a'
      
      switch (resolution) {
        case 'use_b':
          if (conflict.type === 'block_conflict') {
            const blockIndex = mergedFlow.blocks.findIndex(b => b.id === conflict.elementId)
            if (blockIndex >= 0) {
              mergedFlow.blocks[blockIndex] = conflict.versionBValue
            }
          }
          break
        // Add more resolution strategies as needed
      }
    }

    return mergedFlow
  }

  private calculateMergeChanges(
    baseVersion: FlowVersion,
    mergeVersion: FlowVersion,
    conflicts: MergeConflict[]
  ): FlowChange[] {
    const changes: FlowChange[] = []
    
    changes.push({
      type: 'modify',
      target: 'metadata',
      path: 'merge',
      description: `Merge ${mergeVersion.version} into ${baseVersion.version}`,
      oldValue: baseVersion.version,
      newValue: `merged_${baseVersion.version}_${mergeVersion.version}`
    })

    return changes
  }

  private updateFlowHistory(flowId: string, version: FlowVersion): void {
    if (!this.histories.has(flowId)) {
      this.histories.set(flowId, {
        flowId,
        versions: [],
        branches: [],
        tags: [],
        defaultBranch: 'main'
      })
    }

    const history = this.histories.get(flowId)!
    history.versions.unshift(version)
  }

  private formatDifference(difference: FlowDifference): string {
    let result = `@@ ${difference.path} @@\n`
    
    switch (difference.type) {
      case 'addition':
        result += `+${JSON.stringify(difference.after, null, 2)}\n`
        break
      case 'deletion':
        result += `-${JSON.stringify(difference.before, null, 2)}\n`
        break
      case 'modification':
        result += `-${JSON.stringify(difference.before, null, 2)}\n`
        result += `+${JSON.stringify(difference.after, null, 2)}\n`
        break
    }
    
    return result
  }

  private deepEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2)
  }
}

// Export singleton instance
export const flowVersioningService = new FlowVersioningService()