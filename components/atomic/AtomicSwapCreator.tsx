'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAtomicOperations } from '@/hooks/useAtomicOperations'
import { Swap, Clock, Shield, Zap, ArrowRight, Info } from 'lucide-react'
import { isAddress } from 'viem'

interface TokenData {
  address: string
  symbol: string
  decimals: number
  type: 'ERC20' | 'ERC1155'
  tokenId?: string
}

const SAMPLE_TOKENS: TokenData[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    symbol: 'USDC',
    decimals: 6,
    type: 'ERC20'
  },
  {
    address: '0x2345678901234567890123456789012345678901',
    symbol: 'WETH',
    decimals: 18,
    type: 'ERC20'
  },
  {
    address: '0x3456789012345678901234567890123456789012',
    symbol: 'NFT',
    decimals: 0,
    type: 'ERC1155'
  }
]

export function AtomicSwapCreator() {
  const { address } = useAccount()
  const { createAtomicSwap, isLoading } = useAtomicOperations()
  
  const [swapData, setSwapData] = useState({
    tokenA: '',
    tokenB: '',
    amountA: '',
    amountB: '',
    tokenIdA: '',
    tokenIdB: '',
    counterparty: '',
    deadline: '24',
    slippageTolerance: '0.5'
  })

  const [selectedTokenA, setSelectedTokenA] = useState<TokenData | null>(null)
  const [selectedTokenB, setSelectedTokenB] = useState<TokenData | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const validateForm = (): boolean => {
    const newErrors: string[] = []

    if (!swapData.tokenA || !isAddress(swapData.tokenA)) {
      newErrors.push('Token A address is required and must be valid')
    }

    if (!swapData.tokenB || !isAddress(swapData.tokenB)) {
      newErrors.push('Token B address is required and must be valid')
    }

    if (!swapData.amountA || parseFloat(swapData.amountA) <= 0) {
      newErrors.push('Token A amount must be greater than 0')
    }

    if (!swapData.amountB || parseFloat(swapData.amountB) <= 0) {
      newErrors.push('Token B amount must be greater than 0')
    }

    if (!swapData.counterparty || !isAddress(swapData.counterparty)) {
      newErrors.push('Counterparty address is required and must be valid')
    }

    if (swapData.counterparty === address) {
      newErrors.push('Cannot create swap with yourself')
    }

    if (selectedTokenA?.type === 'ERC1155' && !swapData.tokenIdA) {
      newErrors.push('Token ID A is required for ERC1155 tokens')
    }

    if (selectedTokenB?.type === 'ERC1155' && !swapData.tokenIdB) {
      newErrors.push('Token ID B is required for ERC1155 tokens')
    }

    const deadlineHours = parseFloat(swapData.deadline)
    if (deadlineHours < 1 || deadlineHours > 24 * 7) {
      newErrors.push('Deadline must be between 1 hour and 7 days')
    }

    const slippage = parseFloat(swapData.slippageTolerance)
    if (slippage < 0 || slippage > 10) {
      newErrors.push('Slippage tolerance must be between 0% and 10%')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleTokenASelect = (tokenAddress: string) => {
    const token = SAMPLE_TOKENS.find(t => t.address === tokenAddress)
    setSelectedTokenA(token || null)
    setSwapData(prev => ({ ...prev, tokenA: tokenAddress }))
  }

  const handleTokenBSelect = (tokenAddress: string) => {
    const token = SAMPLE_TOKENS.find(t => t.address === tokenAddress)
    setSelectedTokenB(token || null)
    setSwapData(prev => ({ ...prev, tokenB: tokenAddress }))
  }

  const handleCreateSwap = async () => {
    if (!validateForm() || !address) return

    try {
      const deadlineSeconds = Math.floor(Date.now() / 1000) + (parseFloat(swapData.deadline) * 3600)
      
      await createAtomicSwap({
        tokenA: swapData.tokenA as `0x${string}`,
        tokenB: swapData.tokenB as `0x${string}`,
        amountA: swapData.amountA,
        amountB: swapData.amountB,
        participant1: address,
        participant2: swapData.counterparty as `0x${string}`,
        deadline: deadlineSeconds,
        slippageTolerance: parseFloat(swapData.slippageTolerance),
        secretHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` // Random secret hash for demo
      })

      // Reset form
      setSwapData({
        tokenA: '',
        tokenB: '',
        amountA: '',
        amountB: '',
        tokenIdA: '',
        tokenIdB: '',
        counterparty: '',
        deadline: '24',
        slippageTolerance: '0.5'
      })
      setSelectedTokenA(null)
      setSelectedTokenB(null)
      setErrors([])
    } catch (error) {
      console.error('Failed to create atomic swap:', error)
    }
  }

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Swap className="w-5 h-5" />
            <span>Create Atomic Swap</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to create atomic swaps.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Swap className="w-5 h-5" />
          <span>Create Atomic Swap</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Create a trustless token exchange between two parties
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Token A Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">You Offer</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tokenA">Token Address</Label>
              <Select value={swapData.tokenA} onValueChange={handleTokenASelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select token A" />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_TOKENS.map(token => (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center space-x-2">
                        <span>{token.symbol}</span>
                        <Badge variant="secondary">{token.type}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="amountA">Amount</Label>
              <Input
                id="amountA"
                type="number"
                placeholder="0.0"
                value={swapData.amountA}
                onChange={(e) => setSwapData(prev => ({ ...prev, amountA: e.target.value }))}
              />
            </div>
          </div>

          {selectedTokenA?.type === 'ERC1155' && (
            <div>
              <Label htmlFor="tokenIdA">Token ID</Label>
              <Input
                id="tokenIdA"
                placeholder="Token ID"
                value={swapData.tokenIdA}
                onChange={(e) => setSwapData(prev => ({ ...prev, tokenIdA: e.target.value }))}
              />
            </div>
          )}
        </div>

        {/* Swap Arrow */}
        <div className="flex justify-center">
          <div className="p-2 border rounded-full bg-gray-100">
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>

        {/* Token B Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-green-50">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">You Request</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tokenB">Token Address</Label>
              <Select value={swapData.tokenB} onValueChange={handleTokenBSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select token B" />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_TOKENS.map(token => (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center space-x-2">
                        <span>{token.symbol}</span>
                        <Badge variant="secondary">{token.type}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="amountB">Amount</Label>
              <Input
                id="amountB"
                type="number"
                placeholder="0.0"
                value={swapData.amountB}
                onChange={(e) => setSwapData(prev => ({ ...prev, amountB: e.target.value }))}
              />
            </div>
          </div>

          {selectedTokenB?.type === 'ERC1155' && (
            <div>
              <Label htmlFor="tokenIdB">Token ID</Label>
              <Input
                id="tokenIdB"
                placeholder="Token ID"
                value={swapData.tokenIdB}
                onChange={(e) => setSwapData(prev => ({ ...prev, tokenIdB: e.target.value }))}
              />
            </div>
          )}
        </div>

        {/* Counterparty */}
        <div>
          <Label htmlFor="counterparty">Counterparty Address</Label>
          <Input
            id="counterparty"
            placeholder="0x..."
            value={swapData.counterparty}
            onChange={(e) => setSwapData(prev => ({ ...prev, counterparty: e.target.value }))}
          />
          <p className="text-xs text-gray-500 mt-1">
            The address of the person you want to swap with
          </p>
        </div>

        {/* Swap Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="deadline" className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Deadline (hours)</span>
            </Label>
            <Input
              id="deadline"
              type="number"
              min="1"
              max="168"
              value={swapData.deadline}
              onChange={(e) => setSwapData(prev => ({ ...prev, deadline: e.target.value }))}
            />
          </div>
          
          <div>
            <Label htmlFor="slippage" className="flex items-center space-x-1">
              <Shield className="w-4 h-4" />
              <span>Slippage Tolerance (%)</span>
            </Label>
            <Input
              id="slippage"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={swapData.slippageTolerance}
              onChange={(e) => setSwapData(prev => ({ ...prev, slippageTolerance: e.target.value }))}
            />
          </div>
        </div>

        {/* Swap Summary */}
        {swapData.tokenA && swapData.tokenB && swapData.amountA && swapData.amountB && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium mb-2">Swap Summary</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>You offer:</span>
                <span>{swapData.amountA} {selectedTokenA?.symbol || 'Token A'}</span>
              </div>
              <div className="flex justify-between">
                <span>You receive:</span>
                <span>{swapData.amountB} {selectedTokenB?.symbol || 'Token B'}</span>
              </div>
              <div className="flex justify-between">
                <span>Exchange rate:</span>
                <span>
                  1 {selectedTokenA?.symbol} = {(parseFloat(swapData.amountB) / parseFloat(swapData.amountA || '1')).toFixed(4)} {selectedTokenB?.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Expires in:</span>
                <span>{swapData.deadline} hours</span>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleCreateSwap}
          disabled={isLoading || errors.length > 0}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating Swap...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Create Atomic Swap</span>
            </div>
          )}
        </Button>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Note:</strong> Atomic swaps are trustless - either both parties receive their tokens, or the transaction fails completely.</p>
          <p>The counterparty will need the secret to execute the swap and reveal it to complete the exchange.</p>
        </div>
      </CardContent>
    </Card>
  )
}