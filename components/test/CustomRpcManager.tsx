'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Wifi, WifiOff, Settings, CheckCircle, AlertCircle, Globe } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { customRpcService, CustomRpcConfig, CustomRpcConnection } from '@/services/blockchain/customRpc'
import { LoadingSpinner } from '@/components/ui/loading'

const rpcConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rpcUrl: z.string().url('Must be a valid URL'),
  wsUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  chainId: z.number().min(1, 'Chain ID must be positive'),
  currencyName: z.string().min(1, 'Currency name is required'),
  currencySymbol: z.string().min(1, 'Currency symbol is required'),
  explorerName: z.string().optional().or(z.literal('')),
  explorerUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  testnet: z.boolean(),
  description: z.string().optional()
})

type RpcConfigFormValues = z.infer<typeof rpcConfigSchema>

interface CustomRpcManagerProps {
  onRpcSelect?: (connection: CustomRpcConnection) => void
  selectedRpcId?: string
}

export function CustomRpcManager({ onRpcSelect, selectedRpcId }: CustomRpcManagerProps) {
  const [connections, setConnections] = useState<CustomRpcConnection[]>([])
  const [savedConfigs, setSavedConfigs] = useState<CustomRpcConfig[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const form = useForm<RpcConfigFormValues>({
    resolver: zodResolver(rpcConfigSchema),
    defaultValues: {
      name: '',
      rpcUrl: '',
      wsUrl: '',
      chainId: 1,
      currencyName: 'Ether',
      currencySymbol: 'ETH',
      explorerName: '',
      explorerUrl: '',
      testnet: true,
      description: ''
    }
  })

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = () => {
    setConnections(customRpcService.getAllConnections())
    setSavedConfigs(customRpcService.getSavedConfigs())
  }

  const handleAddConfig = async (data: RpcConfigFormValues) => {
    setIsValidating(true)
    
    const config: CustomRpcConfig = {
      id: `custom-${Date.now()}`,
      name: data.name,
      rpcUrl: data.rpcUrl,
      wsUrl: data.wsUrl || undefined,
      chainId: data.chainId,
      currency: {
        name: data.currencyName,
        symbol: data.currencySymbol,
        decimals: 18
      },
      blockExplorer: data.explorerName && data.explorerUrl ? {
        name: data.explorerName,
        url: data.explorerUrl
      } : undefined,
      testnet: data.testnet,
      description: data.description
    }

    const success = await customRpcService.addCustomRpc(config)
    
    if (success) {
      refreshData()
      setIsDialogOpen(false)
      form.reset()
    }
    
    setIsValidating(false)
  }

  const handleConnect = async (config: CustomRpcConfig) => {
    setIsConnecting(config.id)
    const connection = await customRpcService.connectToCustomRpc(config.id)
    if (connection && onRpcSelect) {
      onRpcSelect(connection)
    }
    refreshData()
    setIsConnecting(null)
  }

  const handleDisconnect = (configId: string) => {
    customRpcService.disconnect(configId)
    refreshData()
  }

  const handleRemove = (configId: string) => {
    customRpcService.removeConfig(configId)
    refreshData()
  }

  const handleUsePopular = (config: CustomRpcConfig) => {
    form.reset({
      name: config.name,
      rpcUrl: config.rpcUrl,
      wsUrl: config.wsUrl || '',
      chainId: config.chainId,
      currencyName: config.currency.name,
      currencySymbol: config.currency.symbol,
      explorerName: config.blockExplorer?.name || '',
      explorerUrl: config.blockExplorer?.url || '',
      testnet: config.testnet,
      description: config.description || ''
    })
  }

  const getConnectionStatus = (configId: string): 'connected' | 'disconnected' | 'connecting' => {
    if (isConnecting === configId) return 'connecting'
    const connection = connections.find(c => c.config.id === configId)
    return connection?.isConnected ? 'connected' : 'disconnected'
  }

  const popularConfigs = customRpcService.getPopularConfigs()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Custom RPC Endpoints
            </CardTitle>
            <CardDescription>
              Connect to custom blockchain networks for testing
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add RPC
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Custom RPC Endpoint</DialogTitle>
                <DialogDescription>
                  Configure a custom RPC endpoint to connect to any blockchain network
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Manual Setup</TabsTrigger>
                  <TabsTrigger value="popular">Popular Networks</TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddConfig)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Network Name</FormLabel>
                              <FormControl>
                                <Input placeholder="My Custom Network" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="chainId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Chain ID</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="1337"
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="rpcUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RPC URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://rpc.example.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              HTTP(S) endpoint for blockchain RPC calls
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="wsUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WebSocket URL (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="wss://ws.example.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              WebSocket endpoint for real-time updates
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="currencyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Currency Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Ether" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="currencySymbol"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Currency Symbol</FormLabel>
                              <FormControl>
                                <Input placeholder="ETH" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="explorerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Block Explorer Name (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Etherscan" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="explorerUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Block Explorer URL (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="https://etherscan.io" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="testnet"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>This is a testnet</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Custom development network" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isValidating}>
                          {isValidating ? <LoadingSpinner className="w-4 h-4 mr-2" /> : null}
                          Add RPC
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>
                
                <TabsContent value="popular" className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Click on a popular network to auto-fill the form, then switch to Manual Setup to customize.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-3">
                    {popularConfigs.map(config => (
                      <Card key={config.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4" onClick={() => handleUsePopular(config)}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{config.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Chain ID: {config.chainId} • {config.currency.symbol}
                              </div>
                              {config.description && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {config.description}
                                </div>
                              )}
                            </div>
                            <Badge variant={config.testnet ? 'secondary' : 'default'}>
                              {config.testnet ? 'Testnet' : 'Mainnet'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {savedConfigs.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Custom RPC Endpoints</h3>
            <p className="text-muted-foreground mb-4">
              Add a custom RPC endpoint to test on different blockchain networks
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedConfigs.map(config => {
              const status = getConnectionStatus(config.id)
              const connection = connections.find(c => c.config.id === config.id)
              const isSelected = selectedRpcId === config.id

              return (
                <Card key={config.id} className={`transition-colors ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{config.name}</h4>
                          <Badge variant={config.testnet ? 'secondary' : 'default'}>
                            {config.testnet ? 'Testnet' : 'Mainnet'}
                          </Badge>
                          {status === 'connected' && (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Connected
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Chain ID: {config.chainId} • {config.currency.symbol}
                          {connection?.latency && (
                            <span> • {connection.latency}ms</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {config.rpcUrl}
                        </div>
                        {config.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {config.description}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {status === 'connected' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDisconnect(config.id)}
                          >
                            <WifiOff className="w-4 h-4 mr-1" />
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleConnect(config)}
                            disabled={status === 'connecting'}
                          >
                            {status === 'connecting' ? (
                              <LoadingSpinner className="w-4 h-4 mr-1" />
                            ) : (
                              <Wifi className="w-4 h-4 mr-1" />
                            )}
                            {status === 'connecting' ? 'Connecting...' : 'Connect'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemove(config.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}