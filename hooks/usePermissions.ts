import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { permissionEngine, type Permission, type Role, type Allowlist, type PermissionUpdate, type PermissionReport } from '@/services/permissions/permissionEngine'
import { toast } from 'react-hot-toast'
import { Address } from 'viem'

export interface UsePermissionsOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

export function usePermissions(options: UsePermissionsOptions = {}) {
  const { address } = useAccount()
  const { autoRefresh = false, refreshInterval = 30000 } = options

  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [allowlists, setAllowlists] = useState<Allowlist[]>([])
  const [userReport, setUserReport] = useState<PermissionReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadData = useCallback(() => {
    setPermissions(permissionEngine.getAllPermissions())
    setRoles(permissionEngine.getAllRoles())
    setAllowlists(permissionEngine.getAllAllowlists())
    
    if (address) {
      setUserReport(permissionEngine.getUserPermissionReport(address))
    }
  }, [address])

  // Permission Management
  const grantPermission = useCallback(async (permission: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!address) {
      toast.error('Please connect your wallet')
      return null
    }

    try {
      setIsLoading(true)
      const result = await permissionEngine.grantPermission({
        ...permission,
        grantedBy: address
      })
      
      if (result.success) {
        loadData()
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to grant permission'
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [address, loadData])

  const revokePermission = useCallback(async (permissionId: string) => {
    try {
      setIsLoading(true)
      const result = await permissionEngine.revokePermission(permissionId)
      
      if (result.success) {
        loadData()
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke permission'
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [loadData])

  const checkPermission = useCallback(async (
    user: Address,
    resource: string,
    contract: Address
  ): Promise<boolean> => {
    try {
      return await permissionEngine.checkPermission(user, resource, contract)
    } catch (error) {
      console.warn('Permission check failed:', error)
      return false
    }
  }, [])

  // Role Management
  const createRole = useCallback(async (roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!address) {
      toast.error('Please connect your wallet')
      return null
    }

    try {
      setIsLoading(true)
      const role = await permissionEngine.createRole({
        ...roleData,
        createdBy: address
      })
      
      loadData()
      toast.success(`Role "${role.name}" created successfully`)
      return role
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create role'
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [address, loadData])

  const assignRole = useCallback(async (user: Address, roleId: string) => {
    try {
      setIsLoading(true)
      const result = await permissionEngine.assignRole(user, roleId)
      
      if (result.success) {
        loadData()
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign role'
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [loadData])

  const revokeRole = useCallback(async (user: Address, roleId: string) => {
    try {
      setIsLoading(true)
      const result = await permissionEngine.revokeRole(user, roleId)
      
      if (result.success) {
        loadData()
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke role'
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [loadData])

  // Allowlist Management
  const createAllowlist = useCallback(async (allowlistData: Omit<Allowlist, 'id' | 'entries' | 'createdAt' | 'updatedAt'>) => {
    if (!address) {
      toast.error('Please connect your wallet')
      return null
    }

    try {
      setIsLoading(true)
      const allowlist = await permissionEngine.createAllowlist(allowlistData)
      
      loadData()
      toast.success(`Allowlist "${allowlist.name}" created successfully`)
      return allowlist
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create allowlist'
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [address, loadData])

  const addToAllowlist = useCallback(async (
    allowlistId: string,
    addresses: Address[],
    expiresAt?: Date,
    addedBy?: Address
  ) => {
    try {
      setIsLoading(true)
      const result = await permissionEngine.addToAllowlist(
        allowlistId,
        addresses,
        expiresAt,
        addedBy || address
      )
      
      if (result.success) {
        loadData()
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add to allowlist'
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [address, loadData])

  const removeFromAllowlist = useCallback(async (allowlistId: string, addresses: Address[]) => {
    try {
      setIsLoading(true)
      const result = await permissionEngine.removeFromAllowlist(allowlistId, addresses)
      
      if (result.success) {
        loadData()
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove from allowlist'
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [loadData])

  // Bulk Operations
  const bulkUpdatePermissions = useCallback(async (updates: PermissionUpdate[]) => {
    try {
      setIsLoading(true)
      const result = await permissionEngine.bulkUpdatePermissions(updates)
      
      loadData()
      
      if (result.successfulOperations > 0) {
        toast.success(`${result.successfulOperations}/${result.totalOperations} operations completed`)
      }
      
      if (result.failedOperations > 0) {
        toast.warning(`${result.failedOperations} operations failed`)
      }
      
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk update failed'
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [loadData])

  // Load data on mount and when address changes
  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(loadData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadData])

  // Computed values
  const userPermissions = permissions.filter(p =>
    address && p.subject.toLowerCase() === address.toLowerCase()
  )

  const userRoles = roles.filter(role =>
    address && role.members.some(member => member.toLowerCase() === address.toLowerCase())
  )

  const userAllowlists = allowlists.filter(allowlist =>
    address && allowlist.entries.some(entry =>
      entry.address.toLowerCase() === address.toLowerCase() && entry.isActive
    )
  )

  const activePermissions = permissions.filter(p =>
    p.granted && (!p.expiresAt || p.expiresAt > new Date())
  )

  const expiredPermissions = permissions.filter(p =>
    p.expiresAt && p.expiresAt <= new Date()
  )

  const rolesByCategory = roles.reduce((acc, role) => {
    // Extract category from role name or use 'general'
    const category = role.name.toLowerCase().includes('admin') ? 'admin' :
                    role.name.toLowerCase().includes('manager') ? 'management' :
                    role.name.toLowerCase().includes('trader') ? 'trading' :
                    role.name.toLowerCase().includes('auditor') ? 'audit' : 'general'
    
    if (!acc[category]) acc[category] = []
    acc[category].push(role)
    return acc
  }, {} as Record<string, Role[]>)

  return {
    // Data
    permissions,
    roles,
    allowlists,
    userReport,
    userPermissions,
    userRoles,
    userAllowlists,
    activePermissions,
    expiredPermissions,
    rolesByCategory,
    
    // State
    isLoading,
    
    // Permission Actions
    grantPermission,
    revokePermission,
    checkPermission,
    bulkUpdatePermissions,
    
    // Role Actions
    createRole,
    assignRole,
    revokeRole,
    
    // Allowlist Actions
    createAllowlist,
    addToAllowlist,
    removeFromAllowlist,
    
    // Utils
    refresh: loadData,
    getPermission: (id: string) => permissions.find(p => p.id === id),
    getRole: (id: string) => roles.find(r => r.id === id),
    getAllowlist: (id: string) => allowlists.find(a => a.id === id),
    
    // Stats
    stats: {
      totalPermissions: permissions.length,
      activePermissions: activePermissions.length,
      expiredPermissions: expiredPermissions.length,
      totalRoles: roles.length,
      activeRoles: roles.filter(r => r.isActive).length,
      totalAllowlists: allowlists.length,
      activeAllowlists: allowlists.filter(a => a.isActive).length,
      userPermissionCount: userPermissions.length,
      userRoleCount: userRoles.length,
      userAllowlistCount: userAllowlists.length
    }
  }
}