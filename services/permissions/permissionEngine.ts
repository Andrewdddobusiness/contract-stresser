import { Address, Hash, PublicClient, WalletClient, keccak256, toHex } from 'viem'
import { getPublicClient, getWalletClient } from '@/services/blockchain/clients'
import type { SupportedChainId } from '@/types/blockchain'
import { toast } from 'react-hot-toast'

export interface Permission {
  id: string
  type: 'role' | 'allowlist' | 'allowance' | 'function' | 'timebound' | 'conditional'
  subject: Address // Who has the permission
  resource: string // What they have permission to access
  contract: Address
  granted: boolean
  expiresAt?: Date
  conditions?: PermissionCondition[]
  metadata: PermissionMetadata
  createdAt: Date
  updatedAt: Date
  grantedBy: Address
  transactionHash?: Hash
}

export interface PermissionCondition {
  type: 'balance' | 'state' | 'time' | 'allowlist' | 'custom'
  operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in'
  value: any
  target?: Address
  functionName?: string
}

export interface PermissionMetadata {
  title: string
  description: string
  category: string
  tags: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  source: 'manual' | 'template' | 'inherited' | 'automated'
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  inherits: string[] // Parent role IDs
  contracts: Address[]
  members: Address[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: Address
}

export interface Allowlist {
  id: string
  name: string
  description: string
  contract: Address
  admin: Address
  entries: AllowlistEntry[]
  maxEntries: number
  isActive: boolean
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AllowlistEntry {
  address: Address
  addedAt: Date
  expiresAt?: Date
  addedBy: Address
  metadata: string
  isActive: boolean
}

export interface TokenAllowance {
  id: string
  owner: Address
  spender: Address
  token: Address
  amount: bigint
  approved: boolean
  expiresAt?: Date
  lastUpdated: Date
  transactionHash?: Hash
}

export interface PermissionUpdate {
  permissionId: string
  action: 'grant' | 'revoke' | 'update'
  data?: Partial<Permission>
}

export interface TransactionResult {
  success: boolean
  transactionHash?: Hash
  error?: string
  gasUsed?: bigint
}

export interface BatchResult {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  transactions: Hash[]
  errors: string[]
}

export interface ValidationResult {
  isValid: boolean
  permissions: PermissionCheckResult[]
  errors: string[]
  warnings: string[]
}

export interface PermissionCheckResult {
  type: Permission['type']
  resource: string
  granted: boolean
  reason: string
  expiresAt?: Date
}

export interface PermissionReport {
  user: Address
  totalPermissions: number
  activePermissions: number
  expiredPermissions: number
  roles: string[]
  allowlists: string[]
  allowances: TokenAllowance[]
  lastChecked: Date
}

export interface PermissionContext {
  user: Address
  contract: Address
  function: string
  parameters: any[]
  timestamp: number
  chainId: SupportedChainId
}

// Role Templates
export const ROLE_TEMPLATES = {
  ADMIN: {
    name: "Administrator",
    description: "Full system access with all permissions",
    permissions: ["contract.deploy", "user.manage", "permission.grant", "system.admin"],
    inherits: [],
    priority: 'critical' as const
  },
  MANAGER: {
    name: "Manager",
    description: "Management access with user and operation permissions",
    permissions: ["user.view", "operation.execute", "report.generate", "allowlist.manage"],
    inherits: ["USER"],
    priority: 'high' as const
  },
  USER: {
    name: "User",
    description: "Basic user access for viewing and self-management",
    permissions: ["operation.view", "balance.check", "profile.edit"],
    inherits: [],
    priority: 'medium' as const
  },
  TRADER: {
    name: "Trader",
    description: "Trading permissions for swaps and transfers",
    permissions: ["swap.create", "swap.execute", "token.transfer", "allowance.manage"],
    inherits: ["USER"],
    priority: 'high' as const
  },
  AUDITOR: {
    name: "Auditor", 
    description: "Read-only access for auditing and reporting",
    permissions: ["audit.view", "report.generate", "log.access"],
    inherits: [],
    priority: 'medium' as const
  }
} as const

// Permission Scenarios
export const PERMISSION_SCENARIOS = {
  ATOMIC_SWAP: {
    requiredRoles: ["TRADER"],
    requiredAllowlists: ["VERIFIED_USERS"],
    tokenAllowances: ["ERC20_SPEND", "ERC1155_TRANSFER"],
    customChecks: ["kyc.verified", "balance.sufficient"],
    description: "Permissions needed for atomic swap operations"
  },
  CONTRACT_DEPLOYMENT: {
    requiredRoles: ["ADMIN", "MANAGER"],
    customChecks: ["gas.sufficient", "network.active"],
    description: "Permissions needed for contract deployment"
  },
  BULK_OPERATIONS: {
    requiredRoles: ["MANAGER"],
    rateLimits: { maxPerHour: 100 },
    gasLimits: { maxPerTx: "1000000" },
    description: "Permissions needed for bulk operations"
  },
  EMERGENCY_PAUSE: {
    requiredRoles: ["ADMIN"],
    customChecks: ["emergency.authorized"],
    description: "Emergency pause permissions"
  }
} as const

class PermissionManagementService {
  private static instance: PermissionManagementService
  private permissions: Map<string, Permission> = new Map()
  private roles: Map<string, Role> = new Map()
  private allowlists: Map<string, Allowlist> = new Map()
  private allowances: Map<string, TokenAllowance> = new Map()
  private chainClients: Map<SupportedChainId, { public: PublicClient; wallet: WalletClient }> = new Map()

  static getInstance(): PermissionManagementService {
    if (!PermissionManagementService.instance) {
      PermissionManagementService.instance = new PermissionManagementService()
    }
    return PermissionManagementService.instance
  }

  private constructor() {
    this.loadPersistedData()
    this.initializeDefaultRoles()
  }

  private loadPersistedData() {
    try {
      const permissionsData = localStorage.getItem('permissions-data')
      if (permissionsData) {
        const data = JSON.parse(permissionsData)
        
        // Load permissions
        if (data.permissions) {
          Object.entries(data.permissions).forEach(([id, permission]: [string, any]) => {
            this.permissions.set(id, {
              ...permission,
              createdAt: new Date(permission.createdAt),
              updatedAt: new Date(permission.updatedAt),
              expiresAt: permission.expiresAt ? new Date(permission.expiresAt) : undefined
            })
          })
        }

        // Load roles
        if (data.roles) {
          Object.entries(data.roles).forEach(([id, role]: [string, any]) => {
            this.roles.set(id, {
              ...role,
              createdAt: new Date(role.createdAt),
              updatedAt: new Date(role.updatedAt)
            })
          })
        }

        // Load allowlists
        if (data.allowlists) {
          Object.entries(data.allowlists).forEach(([id, allowlist]: [string, any]) => {
            this.allowlists.set(id, {
              ...allowlist,
              createdAt: new Date(allowlist.createdAt),
              updatedAt: new Date(allowlist.updatedAt),
              expiresAt: allowlist.expiresAt ? new Date(allowlist.expiresAt) : undefined,
              entries: allowlist.entries.map((entry: any) => ({
                ...entry,
                addedAt: new Date(entry.addedAt),
                expiresAt: entry.expiresAt ? new Date(entry.expiresAt) : undefined
              }))
            })
          })
        }

        // Load allowances
        if (data.allowances) {
          Object.entries(data.allowances).forEach(([id, allowance]: [string, any]) => {
            this.allowances.set(id, {
              ...allowance,
              amount: BigInt(allowance.amount),
              lastUpdated: new Date(allowance.lastUpdated),
              expiresAt: allowance.expiresAt ? new Date(allowance.expiresAt) : undefined
            })
          })
        }
      }
    } catch (error) {
      console.warn('Failed to load permissions data:', error)
    }
  }

  private savePersistedData() {
    try {
      const data = {
        permissions: Object.fromEntries(this.permissions),
        roles: Object.fromEntries(this.roles),
        allowlists: Object.fromEntries(this.allowlists),
        allowances: Object.fromEntries(
          Array.from(this.allowances.entries()).map(([id, allowance]) => [
            id,
            { ...allowance, amount: allowance.amount.toString() }
          ])
        )
      }
      localStorage.setItem('permissions-data', JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save permissions data:', error)
    }
  }

  private initializeDefaultRoles() {
    // Initialize default roles if they don't exist
    Object.entries(ROLE_TEMPLATES).forEach(([key, template]) => {
      const roleId = key.toLowerCase()
      if (!this.roles.has(roleId)) {
        this.createRole({
          name: template.name,
          description: template.description,
          permissions: template.permissions.map(perm => this.createDefaultPermission(perm, template.priority)),
          inherits: template.inherits.map(r => r.toLowerCase()),
          contracts: [],
          members: [],
          isActive: true,
          createdBy: '0x0000000000000000000000000000000000000000' as Address
        })
      }
    })
  }

  private createDefaultPermission(resource: string, priority: 'low' | 'medium' | 'high' | 'critical'): Permission {
    return {
      id: `perm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'function',
      subject: '0x0000000000000000000000000000000000000000' as Address,
      resource,
      contract: '0x0000000000000000000000000000000000000000' as Address,
      granted: true,
      metadata: {
        title: resource,
        description: `Permission for ${resource}`,
        category: 'default',
        tags: ['default', 'system'],
        priority,
        source: 'template'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      grantedBy: '0x0000000000000000000000000000000000000000' as Address
    }
  }

  private getClients(chainId: SupportedChainId = 31337): { public: PublicClient; wallet: WalletClient } {
    if (!this.chainClients.has(chainId)) {
      this.chainClients.set(chainId, {
        public: getPublicClient(chainId),
        wallet: getWalletClient(chainId)
      })
    }
    return this.chainClients.get(chainId)!
  }

  // Permission Management
  async grantPermission(permission: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Promise<TransactionResult> {
    try {
      const permissionId = `perm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const fullPermission: Permission = {
        ...permission,
        id: permissionId,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // For demo purposes, we'll just store locally
      // In a real implementation, this would interact with smart contracts
      this.permissions.set(permissionId, fullPermission)
      this.savePersistedData()

      toast.success(`Permission granted: ${permission.resource}`)

      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as Hash
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to grant permission'
      toast.error(`Permission grant failed: ${message}`)
      
      return {
        success: false,
        error: message
      }
    }
  }

  async revokePermission(permissionId: string): Promise<TransactionResult> {
    try {
      const permission = this.permissions.get(permissionId)
      if (!permission) {
        throw new Error('Permission not found')
      }

      // Mark as revoked
      permission.granted = false
      permission.updatedAt = new Date()
      
      this.permissions.set(permissionId, permission)
      this.savePersistedData()

      toast.success(`Permission revoked: ${permission.resource}`)

      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as Hash
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke permission'
      toast.error(`Permission revocation failed: ${message}`)
      
      return {
        success: false,
        error: message
      }
    }
  }

  async checkPermission(
    user: Address, 
    resource: string, 
    contract: Address,
    chainId: SupportedChainId = 31337
  ): Promise<boolean> {
    try {
      // Check direct permissions
      const directPermission = Array.from(this.permissions.values()).find(p =>
        p.subject.toLowerCase() === user.toLowerCase() &&
        p.resource === resource &&
        p.contract.toLowerCase() === contract.toLowerCase() &&
        p.granted &&
        (!p.expiresAt || p.expiresAt > new Date())
      )

      if (directPermission) {
        return await this.validatePermissionConditions(directPermission, user, chainId)
      }

      // Check role-based permissions
      const userRoles = await this.getUserRoles(user)
      for (const roleId of userRoles) {
        const hasRolePermission = await this.checkRolePermission(roleId, resource, contract)
        if (hasRolePermission) {
          return true
        }
      }

      // Check allowlist permissions
      const allowlistPermissions = Array.from(this.permissions.values()).filter(p =>
        p.type === 'allowlist' &&
        p.resource === resource &&
        p.contract.toLowerCase() === contract.toLowerCase() &&
        p.granted
      )

      for (const permission of allowlistPermissions) {
        const isInAllowlist = await this.checkAllowlistMembership(user, permission.resource)
        if (isInAllowlist) {
          return true
        }
      }

      return false
    } catch (error) {
      console.warn('Permission check failed:', error)
      return false
    }
  }

  private async validatePermissionConditions(
    permission: Permission,
    user: Address,
    chainId: SupportedChainId
  ): Promise<boolean> {
    if (!permission.conditions || permission.conditions.length === 0) {
      return true
    }

    const clients = this.getClients(chainId)

    for (const condition of permission.conditions) {
      const conditionMet = await this.evaluateCondition(condition, user, clients.public)
      if (!conditionMet) {
        return false
      }
    }

    return true
  }

  private async evaluateCondition(
    condition: PermissionCondition,
    user: Address,
    client: PublicClient
  ): Promise<boolean> {
    try {
      switch (condition.type) {
        case 'balance':
          if (!condition.target) return false
          const balance = await client.getBalance({ address: user })
          return this.compareValues(balance, condition.operator, BigInt(condition.value))

        case 'time':
          const now = Math.floor(Date.now() / 1000)
          return this.compareValues(now, condition.operator, condition.value)

        case 'allowlist':
          return await this.checkAllowlistMembership(user, condition.value)

        case 'state':
          if (!condition.target || !condition.functionName) return false
          const stateValue = await client.readContract({
            address: condition.target,
            abi: [
              {
                name: condition.functionName,
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'user', type: 'address' }],
                outputs: [{ name: '', type: 'uint256' }]
              }
            ],
            functionName: condition.functionName,
            args: [user]
          })
          return this.compareValues(stateValue, condition.operator, condition.value)

        default:
          return true
      }
    } catch (error) {
      console.warn('Condition evaluation failed:', error)
      return false
    }
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'eq': return actual === expected
      case 'gt': return actual > expected
      case 'gte': return actual >= expected
      case 'lt': return actual < expected
      case 'lte': return actual <= expected
      case 'in': return Array.isArray(expected) && expected.includes(actual)
      case 'not_in': return Array.isArray(expected) && !expected.includes(actual)
      default: return false
    }
  }

  // Role Management
  async createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const roleId = `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const role: Role = {
      ...roleData,
      id: roleId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.roles.set(roleId, role)
    this.savePersistedData()

    return role
  }

  async assignRole(user: Address, roleId: string): Promise<TransactionResult> {
    try {
      const role = this.roles.get(roleId)
      if (!role) {
        throw new Error('Role not found')
      }

      if (!role.members.includes(user)) {
        role.members.push(user)
        role.updatedAt = new Date()
        this.roles.set(roleId, role)
        this.savePersistedData()
      }

      toast.success(`Role "${role.name}" assigned to user`)

      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as Hash
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign role'
      toast.error(`Role assignment failed: ${message}`)
      
      return {
        success: false,
        error: message
      }
    }
  }

  async revokeRole(user: Address, roleId: string): Promise<TransactionResult> {
    try {
      const role = this.roles.get(roleId)
      if (!role) {
        throw new Error('Role not found')
      }

      role.members = role.members.filter(member => member.toLowerCase() !== user.toLowerCase())
      role.updatedAt = new Date()
      this.roles.set(roleId, role)
      this.savePersistedData()

      toast.success(`Role "${role.name}" revoked from user`)

      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as Hash
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke role'
      toast.error(`Role revocation failed: ${message}`)
      
      return {
        success: false,
        error: message
      }
    }
  }

  private async getUserRoles(user: Address): Promise<string[]> {
    const userRoles: string[] = []
    
    this.roles.forEach((role, roleId) => {
      if (role.members.some(member => member.toLowerCase() === user.toLowerCase())) {
        userRoles.push(roleId)
        // Add inherited roles
        role.inherits.forEach(inheritedRoleId => {
          if (!userRoles.includes(inheritedRoleId)) {
            userRoles.push(inheritedRoleId)
          }
        })
      }
    })

    return userRoles
  }

  private async checkRolePermission(roleId: string, resource: string, contract: Address): Promise<boolean> {
    const role = this.roles.get(roleId)
    if (!role || !role.isActive) return false

    // Check direct role permissions
    const hasPermission = role.permissions.some(p =>
      p.resource === resource &&
      p.contract.toLowerCase() === contract.toLowerCase() &&
      p.granted &&
      (!p.expiresAt || p.expiresAt > new Date())
    )

    if (hasPermission) return true

    // Check inherited role permissions
    for (const inheritedRoleId of role.inherits) {
      const hasInheritedPermission = await this.checkRolePermission(inheritedRoleId, resource, contract)
      if (hasInheritedPermission) return true
    }

    return false
  }

  // Allowlist Management
  async createAllowlist(allowlistData: Omit<Allowlist, 'id' | 'entries' | 'createdAt' | 'updatedAt'>): Promise<Allowlist> {
    const allowlistId = `allowlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const allowlist: Allowlist = {
      ...allowlistData,
      id: allowlistId,
      entries: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.allowlists.set(allowlistId, allowlist)
    this.savePersistedData()

    return allowlist
  }

  async addToAllowlist(
    allowlistId: string, 
    addresses: Address[], 
    expiresAt?: Date,
    addedBy?: Address
  ): Promise<TransactionResult> {
    try {
      const allowlist = this.allowlists.get(allowlistId)
      if (!allowlist) {
        throw new Error('Allowlist not found')
      }

      const newEntries: AllowlistEntry[] = addresses.map(address => ({
        address,
        addedAt: new Date(),
        expiresAt,
        addedBy: addedBy || '0x0000000000000000000000000000000000000000' as Address,
        metadata: '',
        isActive: true
      }))

      // Check max entries limit
      if (allowlist.entries.length + newEntries.length > allowlist.maxEntries) {
        throw new Error('Allowlist capacity exceeded')
      }

      // Add new entries (avoid duplicates)
      newEntries.forEach(newEntry => {
        const existingIndex = allowlist.entries.findIndex(entry => 
          entry.address.toLowerCase() === newEntry.address.toLowerCase()
        )
        
        if (existingIndex >= 0) {
          // Update existing entry
          allowlist.entries[existingIndex] = newEntry
        } else {
          // Add new entry
          allowlist.entries.push(newEntry)
        }
      })

      allowlist.updatedAt = new Date()
      this.allowlists.set(allowlistId, allowlist)
      this.savePersistedData()

      toast.success(`Added ${addresses.length} addresses to allowlist`)

      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as Hash
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add to allowlist'
      toast.error(`Allowlist update failed: ${message}`)
      
      return {
        success: false,
        error: message
      }
    }
  }

  async removeFromAllowlist(allowlistId: string, addresses: Address[]): Promise<TransactionResult> {
    try {
      const allowlist = this.allowlists.get(allowlistId)
      if (!allowlist) {
        throw new Error('Allowlist not found')
      }

      const addressesToRemove = new Set(addresses.map(addr => addr.toLowerCase()))
      allowlist.entries = allowlist.entries.filter(entry => 
        !addressesToRemove.has(entry.address.toLowerCase())
      )

      allowlist.updatedAt = new Date()
      this.allowlists.set(allowlistId, allowlist)
      this.savePersistedData()

      toast.success(`Removed ${addresses.length} addresses from allowlist`)

      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as Hash
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove from allowlist'
      toast.error(`Allowlist update failed: ${message}`)
      
      return {
        success: false,
        error: message
      }
    }
  }

  private async checkAllowlistMembership(user: Address, allowlistId: string): Promise<boolean> {
    const allowlist = this.allowlists.get(allowlistId)
    if (!allowlist || !allowlist.isActive) return false

    const entry = allowlist.entries.find(entry => 
      entry.address.toLowerCase() === user.toLowerCase() &&
      entry.isActive &&
      (!entry.expiresAt || entry.expiresAt > new Date())
    )

    return !!entry
  }

  // Bulk Operations
  async bulkUpdatePermissions(updates: PermissionUpdate[]): Promise<BatchResult> {
    const results: Hash[] = []
    const errors: string[] = []
    let successCount = 0

    for (const update of updates) {
      try {
        let result: TransactionResult

        switch (update.action) {
          case 'grant':
            if (!update.data) throw new Error('Permission data required for grant')
            result = await this.grantPermission(update.data as Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>)
            break
          case 'revoke':
            result = await this.revokePermission(update.permissionId)
            break
          case 'update':
            // Update existing permission
            const permission = this.permissions.get(update.permissionId)
            if (!permission) throw new Error('Permission not found')
            if (update.data) {
              Object.assign(permission, update.data, { updatedAt: new Date() })
              this.permissions.set(update.permissionId, permission)
            }
            result = { success: true }
            break
          default:
            throw new Error(`Unknown action: ${update.action}`)
        }

        if (result.success) {
          successCount++
          if (result.transactionHash) {
            results.push(result.transactionHash)
          }
        } else {
          errors.push(result.error || 'Unknown error')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Update ${update.permissionId}: ${message}`)
      }
    }

    this.savePersistedData()

    return {
      totalOperations: updates.length,
      successfulOperations: successCount,
      failedOperations: updates.length - successCount,
      transactions: results,
      errors
    }
  }

  // Public API methods
  getPermission(permissionId: string): Permission | null {
    return this.permissions.get(permissionId) || null
  }

  getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values())
  }

  getRole(roleId: string): Role | null {
    return this.roles.get(roleId) || null
  }

  getAllRoles(): Role[] {
    return Array.from(this.roles.values())
  }

  getAllowlist(allowlistId: string): Allowlist | null {
    return this.allowlists.get(allowlistId) || null
  }

  getAllAllowlists(): Allowlist[] {
    return Array.from(this.allowlists.values())
  }

  getUserPermissionReport(user: Address): PermissionReport {
    const userPermissions = Array.from(this.permissions.values()).filter(p =>
      p.subject.toLowerCase() === user.toLowerCase()
    )

    const activePermissions = userPermissions.filter(p =>
      p.granted && (!p.expiresAt || p.expiresAt > new Date())
    )

    const expiredPermissions = userPermissions.filter(p =>
      p.expiresAt && p.expiresAt <= new Date()
    )

    const userRoles = Array.from(this.roles.values())
      .filter(role => role.members.some(member => member.toLowerCase() === user.toLowerCase()))
      .map(role => role.name)

    const userAllowlists = Array.from(this.allowlists.values())
      .filter(allowlist => allowlist.entries.some(entry => 
        entry.address.toLowerCase() === user.toLowerCase() &&
        entry.isActive &&
        (!entry.expiresAt || entry.expiresAt > new Date())
      ))
      .map(allowlist => allowlist.name)

    const userAllowances = Array.from(this.allowances.values()).filter(allowance =>
      allowance.owner.toLowerCase() === user.toLowerCase() && allowance.approved
    )

    return {
      user,
      totalPermissions: userPermissions.length,
      activePermissions: activePermissions.length,
      expiredPermissions: expiredPermissions.length,
      roles: userRoles,
      allowlists: userAllowlists,
      allowances: userAllowances,
      lastChecked: new Date()
    }
  }
}

export const permissionEngine = PermissionManagementService.getInstance()
export default permissionEngine