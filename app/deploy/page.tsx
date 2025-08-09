"use client"

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Upload, Coins, AlertCircle } from 'lucide-react'
import { useAccount, useChainId } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

const deployFormSchema = z.object({
  name: z.string().min(1, 'Token name is required').max(50, 'Token name must be less than 50 characters'),
  symbol: z.string().min(1, 'Token symbol is required').max(10, 'Token symbol must be less than 10 characters'),
  totalSupply: z.string().refine((val) => {
    const num = Number(val)
    return !isNaN(num) && num > 0
  }, 'Total supply must be a positive number'),
  decimals: z.string().refine((val) => {
    const num = Number(val)
    return !isNaN(num) && num >= 0 && num <= 18 && Number.isInteger(num)
  }, 'Decimals must be an integer between 0 and 18'),
  network: z.enum(['local', 'sepolia'], {
    required_error: 'Please select a network',
  }),
})

type DeployFormValues = z.infer<typeof deployFormSchema>

export default function DeployPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  
  const getChainName = (id: number) => {
    switch (id) {
      case 1: return 'Ethereum'
      case 11155111: return 'Sepolia'
      case 1337: return 'Localhost'
      default: return 'Unknown'
    }
  }
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentResult, setDeploymentResult] = useState<{
    address?: string
    txHash?: string
    error?: string
  }>({})

  const form = useForm<DeployFormValues>({
    resolver: zodResolver(deployFormSchema),
    defaultValues: {
      name: '',
      symbol: '',
      totalSupply: '1000000',
      decimals: '18',
      network: 'local',
    },
  })

  const onSubmit = async (data: DeployFormValues) => {
    setIsDeploying(true)
    setDeploymentResult({})
    
    try {
      // TODO: Implement actual deployment logic
      console.log('Deploying contract with:', data)
      
      // Simulated deployment
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setDeploymentResult({
        address: '0x' + Math.random().toString(16).slice(2, 42),
        txHash: '0x' + Math.random().toString(16).slice(2, 66),
      })
    } catch (error) {
      setDeploymentResult({
        error: error instanceof Error ? error.message : 'Deployment failed',
      })
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Deploy Contracts</h1>
        <p className="text-muted-foreground">
          Deploy ERC-20 contracts with custom parameters
        </p>
      </div>

      {!isConnected && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to deploy contracts
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                Contract Configuration
              </div>
            </CardTitle>
            <CardDescription>
              Configure your ERC-20 token parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Token" {...field} />
                      </FormControl>
                      <FormDescription>
                        The full name of your token
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="MTK" {...field} />
                      </FormControl>
                      <FormDescription>
                        The ticker symbol for your token
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Supply</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1000000" {...field} />
                      </FormControl>
                      <FormDescription>
                        The total number of tokens to mint
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="decimals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decimals</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="18" {...field} />
                      </FormControl>
                      <FormDescription>
                        The number of decimal places (usually 18)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="network"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Network</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a network" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="local">Local Anvil (localhost:8545)</SelectItem>
                          <SelectItem value="sepolia">Sepolia Testnet</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the network to deploy your contract to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!isConnected || isDeploying}
                >
                  {isDeploying ? 'Deploying...' : 'Deploy Contract'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deployment Preview</CardTitle>
              <CardDescription>
                Review your contract parameters before deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Network</span>
                  <span className="font-medium">
                    {form.watch('network') === 'local' ? 'Local Anvil' : 'Sepolia Testnet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Network</span>
                  <span className="font-medium">
                    {isConnected ? getChainName(chainId) : 'Not connected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deployer</span>
                  <span className="font-medium font-mono text-sm">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token Name</span>
                  <span className="font-medium">
                    {form.watch('name') || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Symbol</span>
                  <span className="font-medium">
                    {form.watch('symbol') || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Supply</span>
                  <span className="font-medium">
                    {form.watch('totalSupply') || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Decimals</span>
                  <span className="font-medium">
                    {form.watch('decimals') || '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {deploymentResult.address && (
            <Card className="border-success">
              <CardHeader>
                <CardTitle className="text-success">Deployment Successful!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-muted-foreground">Contract Address:</span>
                  <p className="font-mono text-sm">{deploymentResult.address}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Transaction Hash:</span>
                  <p className="font-mono text-sm">{deploymentResult.txHash}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {deploymentResult.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deploymentResult.error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}