"use client"

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Copy, ExternalLink, Trash2, Plus, Search, Filter, Download, Upload, Clock, Zap } from 'lucide-react'
import type { Address } from 'viem'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'

import { contractStorage } from '@/services/contracts'
import type { ContractMetadata, ContractSearchFilters, ImportContractParams } from '@/types/contracts'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const importSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  network: z.enum(['local', 'sepolia']),
  name: z.string().optional(),
  symbol: z.string().optional(),
})

type ImportFormData = z.infer<typeof importSchema>

interface ContractListProps {
  className?: string
}

export function ContractList({ className }: ContractListProps) {
  const [contracts, setContracts] = useState<ContractMetadata[]>([])
  const [filteredContracts, setFilteredContracts] = useState<ContractMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [networkFilter, setNetworkFilter] = useState<string>('all')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)

  const importForm = useForm<ImportFormData>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      address: '',
      network: 'local',
      name: '',
      symbol: '',
    },
  })

  // Load contracts
  const loadContracts = () => {
    setIsLoading(true)
    try {
      const allContracts = contractStorage.getAllContracts()
      setContracts(allContracts)
    } catch (error) {
      console.error('Failed to load contracts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter contracts
  const filterContracts = () => {
    let filtered = contracts

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        contract =>
          contract.name.toLowerCase().includes(term) ||
          contract.symbol.toLowerCase().includes(term) ||
          contract.address.toLowerCase().includes(term)
      )
    }

    if (networkFilter !== 'all') {
      filtered = filtered.filter(contract => contract.network === networkFilter)
    }

    setFilteredContracts(filtered)
  }

  useEffect(() => {
    loadContracts()
  }, [])

  useEffect(() => {
    filterContracts()
  }, [contracts, searchTerm, networkFilter])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const getNetworkBadge = (network: string) => {
    const networkConfig = contractStorage.getNetworkConfig(network)
    return (
      <Badge variant={network === 'local' ? 'secondary' : 'default'}>
        {networkConfig?.name || network}
      </Badge>
    )
  }

  const handleRemoveContract = (address: Address, network: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove contract "${name}"?`)) {
      contractStorage.removeContract(address, network)
      loadContracts()
    }
  }

  const handleImportContract = async (data: ImportFormData) => {
    setIsImporting(true)
    setImportResult(null)

    try {
      const importParams: ImportContractParams = {
        address: data.address as Address,
        network: data.network,
        name: data.name || undefined,
        symbol: data.symbol || undefined,
      }

      const result = await contractStorage.importContract(importParams)
      
      if (result.success) {
        setImportResult({ success: true, message: 'Contract imported successfully!' })
        loadContracts()
        importForm.reset()
        setTimeout(() => {
          setIsImportModalOpen(false)
          setImportResult(null)
        }, 2000)
      } else {
        setImportResult({ success: false, message: result.error || 'Import failed' })
      }
    } catch (error) {
      setImportResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Import failed' 
      })
    } finally {
      setIsImporting(false)
    }
  }

  const exportContracts = () => {
    const data = contractStorage.exportRegistry()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contracts-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Deployed Contracts</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportContracts}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button size="sm" onClick={() => setIsImportModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Import Contract
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contracts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                <SelectItem value="local">Local Anvil</SelectItem>
                <SelectItem value="sepolia">Sepolia Testnet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading contracts...</div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {contracts.length === 0 ? 'No contracts deployed yet' : 'No contracts match your search'}
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Deployed</TableHead>
                    <TableHead>Gas Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <TableRow key={`${contract.address}-${contract.network}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contract.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {contract.symbol} • {contract.decimals} decimals
                          </div>
                          {contract.tags && contract.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {contract.tags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm">{formatAddress(contract.address)}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(contract.address)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getNetworkBadge(contract.network)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(contract.deployedAt)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {formatAddress(contract.deployerAddress)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {contract.gasUsed ? (
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {contract.gasUsed.toLocaleString()}
                            </div>
                            {contract.deploymentCost && (
                              <div className="text-muted-foreground text-xs">
                                {(Number(contract.deploymentCost) / 1e18).toFixed(6)} ETH
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {contractStorage.getNetworkConfig(contract.network)?.explorerUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const explorerUrl = contractStorage.getNetworkConfig(contract.network)?.explorerUrl
                                if (explorerUrl) {
                                  window.open(`${explorerUrl}/address/${contract.address}`, '_blank')
                                }
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveContract(contract.address, contract.network, contract.name)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false)
          setImportResult(null)
          importForm.reset()
        }}
        title="Import Existing Contract"
        description="Import a contract that was deployed outside of this application"
      >
        <Form {...importForm}>
          <form onSubmit={importForm.handleSubmit(handleImportContract)} className="space-y-4">
            <FormField
              control={importForm.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Address</FormLabel>
                  <FormControl>
                    <Input placeholder="0x..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={importForm.control}
              name="network"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Network</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="local">Local Anvil</SelectItem>
                      <SelectItem value="sepolia">Sepolia Testnet</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={importForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-detect if ERC-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={importForm.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-detect if ERC-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {importResult && (
              <Alert variant={importResult.success ? 'default' : 'destructive'}>
                <AlertDescription>{importResult.message}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsImportModalOpen(false)
                  setImportResult(null)
                  importForm.reset()
                }}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isImporting}>
                {isImporting ? 'Importing...' : 'Import Contract'}
              </Button>
            </div>
          </form>
        </Form>
      </Modal>
    </div>
  )
}