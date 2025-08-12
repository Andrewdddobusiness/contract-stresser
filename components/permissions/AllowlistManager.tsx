'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePermissions } from '@/hooks/usePermissions'
import { useAccount } from 'wagmi'
import { 
  List, 
  Plus, 
  Users, 
  Clock, 
  Shield,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Search,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { isAddress, Address } from 'viem'
import type { Allowlist } from '@/services/permissions/permissionEngine'

interface AllowlistSelectorProps {
  allowlists: Allowlist[]
  selected: string | null
  onSelect: (allowlistId: string) => void
}

function AllowlistSelector({ allowlists, selected, onSelect }: AllowlistSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  
  const filteredAllowlists = allowlists.filter(allowlist =>
    allowlist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    allowlist.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Allowlists</CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search allowlists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {filteredAllowlists.map(allowlist => (
            <div
              key={allowlist.id}
              onClick={() => onSelect(allowlist.id)}
              className={`p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 ${
                selected === allowlist.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">{allowlist.name}</h4>
                <div className="flex items-center space-x-1">
                  {allowlist.isActive ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <Badge variant="outline" className="text-xs">
                    {allowlist.entries.length}/{allowlist.maxEntries}
                  </Badge>
                </div>
              </div>
              
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {allowlist.description || 'No description'}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Created {allowlist.createdAt.toLocaleDateString()}</span>
                {allowlist.expiresAt && (
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Expires {allowlist.expiresAt.toLocaleDateString()}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {filteredAllowlists.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <List className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No allowlists found</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AllowlistEditorProps {
  listId: string
  onAddAddresses: (listId: string, addresses: Address[]) => void
  onRemoveAddresses: (listId: string, addresses: Address[]) => void
}

function AllowlistEditor({ listId, onAddAddresses, onRemoveAddresses }: AllowlistEditorProps) {
  const { getAllowlist } = usePermissions()
  const [newAddresses, setNewAddresses] = useState('')
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  
  const allowlist = getAllowlist(listId)
  if (!allowlist) return null

  const filteredEntries = allowlist.entries.filter(entry =>
    entry.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddAddresses = () => {
    const addresses = newAddresses
      .split(/[\n,;]/)
      .map(addr => addr.trim())
      .filter(addr => addr && isAddress(addr))
    
    if (addresses.length > 0) {
      onAddAddresses(listId, addresses as Address[])
      setNewAddresses('')
    }
  }

  const handleRemoveSelected = () => {
    if (selectedAddresses.size > 0) {
      onRemoveAddresses(listId, Array.from(selectedAddresses) as Address[])
      setSelectedAddresses(new Set())
    }
  }

  const toggleAddress = (address: string) => {
    const newSelected = new Set(selectedAddresses)
    if (newSelected.has(address)) {
      newSelected.delete(address)
    } else {
      newSelected.add(address)
    }
    setSelectedAddresses(newSelected)
  }

  const validNewAddresses = newAddresses
    .split(/[\n,;]/)
    .map(addr => addr.trim())
    .filter(addr => addr && isAddress(addr))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>{allowlist.name}</span>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">{allowlist.description}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant={allowlist.isActive ? "default" : "secondary"}>
              {allowlist.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline">
              {allowlist.entries.length} / {allowlist.maxEntries}
            </Badge>
          </div>
        </div>
        
        {allowlist.expiresAt && (
          <Alert className={allowlist.expiresAt > new Date() ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"}>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {allowlist.expiresAt > new Date() 
                ? `Expires ${allowlist.expiresAt.toLocaleDateString()}`
                : `Expired ${allowlist.expiresAt.toLocaleDateString()}`
              }
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Add Addresses */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <Label>Add Addresses</Label>
          </div>
          
          <Textarea
            placeholder="Enter addresses (one per line, or comma/semicolon separated)&#10;0x1234...&#10;0x5678...&#10;0x9abc..."
            value={newAddresses}
            onChange={(e) => setNewAddresses(e.target.value)}
            rows={4}
          />
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {validNewAddresses.length > 0 && (
                <span className="text-green-600">
                  {validNewAddresses.length} valid address{validNewAddresses.length !== 1 ? 'es' : ''} ready to add
                </span>
              )}
            </div>
            
            <Button 
              onClick={handleAddAddresses}
              disabled={validNewAddresses.length === 0}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add {validNewAddresses.length} Address{validNewAddresses.length !== 1 ? 'es' : ''}
            </Button>
          </div>
        </div>

        {/* Address List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <Label>Current Addresses ({allowlist.entries.length})</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              {selectedAddresses.size > 0 && (
                <Button variant="destructive" size="sm" onClick={handleRemoveSelected}>
                  <UserMinus className="w-4 h-4 mr-2" />
                  Remove {selectedAddresses.size}
                </Button>
              )}
            </div>
          </div>
          
          {allowlist.entries.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search addresses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          
          <div className="max-h-64 overflow-y-auto border rounded-lg">
            {filteredEntries.length > 0 ? (
              filteredEntries.map(entry => (
                <div
                  key={entry.address}
                  className={`p-3 border-b last:border-b-0 flex items-center justify-between hover:bg-gray-50 ${
                    selectedAddresses.has(entry.address) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedAddresses.has(entry.address)}
                      onChange={() => toggleAddress(entry.address)}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-mono text-sm">{entry.address}</div>
                      <div className="text-xs text-gray-500 flex items-center space-x-2">
                        <span>Added {entry.addedAt.toLocaleDateString()}</span>
                        {entry.expiresAt && (
                          <>
                            <span>•</span>
                            <span className={entry.expiresAt > new Date() ? 'text-green-600' : 'text-red-600'}>
                              {entry.expiresAt > new Date() ? 'Valid' : 'Expired'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {entry.isActive ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>
                  {searchTerm ? 'No addresses match your search' : 'No addresses in this allowlist'}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AllowlistManager() {
  const { address } = useAccount()
  const { allowlists, createAllowlist, addToAllowlist, removeFromAllowlist, isLoading } = usePermissions()
  
  const [selectedAllowlist, setSelectedAllowlist] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newAllowlist, setNewAllowlist] = useState({
    name: '',
    description: '',
    maxEntries: '1000',
    expiresAt: ''
  })

  const handleCreateAllowlist = async () => {
    if (!newAllowlist.name || !address) return

    const allowlistData = {
      name: newAllowlist.name,
      description: newAllowlist.description,
      contract: '0x0000000000000000000000000000000000000000' as Address,
      admin: address,
      maxEntries: parseInt(newAllowlist.maxEntries),
      isActive: true,
      expiresAt: newAllowlist.expiresAt ? new Date(newAllowlist.expiresAt) : undefined
    }

    const result = await createAllowlist(allowlistData)
    if (result) {
      setIsCreateDialogOpen(false)
      setNewAllowlist({
        name: '',
        description: '',
        maxEntries: '1000',
        expiresAt: ''
      })
      setSelectedAllowlist(result.id)
    }
  }

  const handleAddToAllowlist = async (listId: string, addresses: Address[]) => {
    await addToAllowlist(listId, addresses)
  }

  const handleRemoveFromAllowlist = async (listId: string, addresses: Address[]) => {
    await removeFromAllowlist(listId, addresses)
  }

  if (!address) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Please connect your wallet to manage allowlists</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <List className="w-5 h-5" />
            <span>Allowlist Management</span>
          </h2>
          <p className="text-sm text-gray-600">
            Manage address-based access control lists for your contracts
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Allowlist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Allowlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Allowlist Name</Label>
                <Input
                  id="name"
                  value={newAllowlist.name}
                  onChange={(e) => setNewAllowlist(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Verified Users"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newAllowlist.description}
                  onChange={(e) => setNewAllowlist(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the purpose of this allowlist"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="maxEntries">Maximum Entries</Label>
                <Input
                  id="maxEntries"
                  type="number"
                  value={newAllowlist.maxEntries}
                  onChange={(e) => setNewAllowlist(prev => ({ ...prev, maxEntries: e.target.value }))}
                  min="1"
                />
              </div>
              
              <div>
                <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={newAllowlist.expiresAt}
                  onChange={(e) => setNewAllowlist(prev => ({ ...prev, expiresAt: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAllowlist} disabled={!newAllowlist.name || isLoading}>
                  Create Allowlist
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <List className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{allowlists.length}</div>
                <div className="text-xs text-gray-600">Total Allowlists</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {allowlists.reduce((sum, list) => sum + list.entries.length, 0)}
                </div>
                <div className="text-xs text-gray-600">Total Addresses</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{allowlists.filter(list => list.isActive).length}</div>
                <div className="text-xs text-gray-600">Active Lists</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allowlist Selector */}
        <div>
          <AllowlistSelector 
            allowlists={allowlists}
            selected={selectedAllowlist}
            onSelect={setSelectedAllowlist}
          />
        </div>
        
        {/* Allowlist Editor */}
        <div className="lg:col-span-2">
          {selectedAllowlist ? (
            <AllowlistEditor 
              listId={selectedAllowlist}
              onAddAddresses={handleAddToAllowlist}
              onRemoveAddresses={handleRemoveFromAllowlist}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <List className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 mb-4">Select an allowlist to manage its addresses</p>
                {allowlists.length === 0 && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    Create Your First Allowlist
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}