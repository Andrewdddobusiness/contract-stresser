'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/usePermissions'
import { useAccount } from 'wagmi'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Crown, 
  UserCheck,
  AlertCircle,
  CheckCircle,
  Clock,
  Search
} from 'lucide-react'
import { isAddress, Address } from 'viem'
import { ROLE_TEMPLATES, type Role } from '@/services/permissions/permissionEngine'

interface RoleCardProps {
  role: Role
  onEdit: (role: Role) => void
  onDelete: (roleId: string) => void
  onAssignUser: (roleId: string) => void
}

function RoleCard({ role, onEdit, onDelete, onAssignUser }: RoleCardProps) {
  const getPriorityColor = (permissions: any[]) => {
    const hasCritical = permissions.some(p => p.metadata?.priority === 'critical')
    const hasHigh = permissions.some(p => p.metadata?.priority === 'high')
    
    if (hasCritical) return 'border-red-200 bg-red-50'
    if (hasHigh) return 'border-orange-200 bg-orange-50'
    return 'border-gray-200 bg-white'
  }

  return (
    <Card className={`transition-all hover:shadow-md ${getPriorityColor(role.permissions)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-base">{role.name}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {role.isActive ? (
              <Badge variant="default" className="text-xs">Active</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Inactive</Badge>
            )}
            {role.inherits.length > 0 && (
              <Badge variant="outline" className="text-xs">Inherits</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 line-clamp-2">{role.description}</p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>Members</span>
            </span>
            <Badge variant="outline">{role.members.length}</Badge>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center space-x-1">
              <Crown className="w-3 h-3" />
              <span>Permissions</span>
            </span>
            <Badge variant="outline">{role.permissions.length}</Badge>
          </div>
          
          {role.inherits.length > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span>Inherits from</span>
              <div className="flex flex-wrap gap-1">
                {role.inherits.slice(0, 2).map(inheritedRole => (
                  <Badge key={inheritedRole} variant="secondary" className="text-xs">
                    {inheritedRole}
                  </Badge>
                ))}
                {role.inherits.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{role.inherits.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            Created {role.createdAt.toLocaleDateString()}
          </div>
        </div>
        
        <div className="flex space-x-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => onEdit(role)} className="flex-1">
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAssignUser(role.id)} className="flex-1">
            <UserCheck className="w-3 h-3 mr-1" />
            Assign
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(role.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function RoleManagementPanel() {
  const { address } = useAccount()
  const { roles, rolesByCategory, createRole, assignRole, revokeRole, isLoading } = usePermissions()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedRoleForAssignment, setSelectedRoleForAssignment] = useState<string>('')
  const [userToAssign, setUserToAssign] = useState('')
  
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    template: '',
    permissions: [] as string[],
    inherits: [] as string[]
  })

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (selectedCategory === 'all') return matchesSearch
    
    const categoryRoles = rolesByCategory[selectedCategory] || []
    return matchesSearch && categoryRoles.some(r => r.id === role.id)
  })

  const handleCreateRole = async () => {
    if (!newRole.name || !address) return

    const roleData = {
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions.map(perm => ({
        id: `perm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'function' as const,
        subject: '0x0000000000000000000000000000000000000000' as Address,
        resource: perm,
        contract: '0x0000000000000000000000000000000000000000' as Address,
        granted: true,
        metadata: {
          title: perm,
          description: `Permission for ${perm}`,
          category: 'custom',
          tags: ['custom'],
          priority: 'medium' as const,
          source: 'manual' as const
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        grantedBy: address
      })),
      inherits: newRole.inherits,
      contracts: [] as Address[],
      members: [] as Address[],
      isActive: true,
      createdBy: address
    }

    const result = await createRole(roleData)
    if (result) {
      setIsCreateDialogOpen(false)
      setNewRole({
        name: '',
        description: '',
        template: '',
        permissions: [],
        inherits: []
      })
    }
  }

  const handleAssignRole = async () => {
    if (!selectedRoleForAssignment || !userToAssign || !isAddress(userToAssign)) return

    await assignRole(userToAssign as Address, selectedRoleForAssignment)
    setIsAssignDialogOpen(false)
    setUserToAssign('')
    setSelectedRoleForAssignment('')
  }

  const handleTemplateSelect = (templateKey: string) => {
    if (!templateKey) return
    
    const template = ROLE_TEMPLATES[templateKey as keyof typeof ROLE_TEMPLATES]
    if (!template) return

    setNewRole(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      permissions: template.permissions,
      inherits: template.inherits
    }))
  }

  const categories = ['all', ...Object.keys(rolesByCategory)]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Role Management</span>
          </h2>
          <p className="text-sm text-gray-600">
            Create and manage role-based access control for your contracts
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template">Start from Template</Label>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                      <SelectItem key={key} value={key}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  value={newRole.name}
                  onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter role name"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newRole.description}
                  onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the role and its purpose"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRole} disabled={!newRole.name || isLoading}>
                  Create Role
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{roles.length}</div>
                <div className="text-xs text-gray-600">Total Roles</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{roles.filter(r => r.isActive).length}</div>
                <div className="text-xs text-gray-600">Active Roles</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {roles.reduce((sum, role) => sum + role.members.length, 0)}
                </div>
                <div className="text-xs text-gray-600">Total Members</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">
                  {roles.reduce((sum, role) => sum + role.permissions.length, 0)}
                </div>
                <div className="text-xs text-gray-600">Total Permissions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Grid */}
      {filteredRoles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map(role => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={(role) => console.log('Edit role:', role)}
              onDelete={(roleId) => console.log('Delete role:', roleId)}
              onAssignUser={(roleId) => {
                setSelectedRoleForAssignment(roleId)
                setIsAssignDialogOpen(true)
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">
              {searchTerm || selectedCategory !== 'all' 
                ? 'No roles match your filters'
                : 'No roles created yet'
              }
            </p>
            {!searchTerm && selectedCategory === 'all' && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                Create Your First Role
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assign User Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="userAddress">User Address</Label>
              <Input
                id="userAddress"
                value={userToAssign}
                onChange={(e) => setUserToAssign(e.target.value)}
                placeholder="0x..."
              />
            </div>
            
            {userToAssign && !isAddress(userToAssign) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please enter a valid Ethereum address.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignRole} 
                disabled={!isAddress(userToAssign) || isLoading}
              >
                Assign Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}