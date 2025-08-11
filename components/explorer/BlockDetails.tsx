'use client'

import { Hash } from 'viem'
import { Copy, ExternalLink, Clock, Zap, Database, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading'
import { useBlockDetails } from '@/services/blockchain'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'

interface BlockDetailsProps {
  blockNumber: bigint
  onTransactionSelect?: (hash: Hash) => void
}

export function BlockDetails({ blockNumber, onTransactionSelect }: BlockDetailsProps) {
  const { data: blockData, isLoading, error } = useBlockDetails(blockNumber)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return {
      distance: formatDistanceToNow(date, { addSuffix: true }),
      full: date.toLocaleString()
    }
  }

  const formatGasUsed = (gasUsed: bigint | null | undefined, gasLimit: bigint) => {
    if (!gasUsed) return { percentage: '0%', used: '0', limit: gasLimit.toString() }
    const percentage = (Number(gasUsed) / Number(gasLimit)) * 100
    return {
      percentage: `${percentage.toFixed(2)}%`,
      used: gasUsed.toString(),
      limit: gasLimit.toString()
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner className="w-6 h-6" />
          <span className="ml-2">Loading block details...</span>
        </div>
      </Card>
    )
  }

  if (error || !blockData) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">Failed to load block details</div>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Block not found'}
          </p>
        </div>
      </Card>
    )
  }

  const { block, transactions } = blockData
  const gasInfo = formatGasUsed(block.gasUsed, block.gasLimit)
  const timeInfo = block.timestamp ? formatTimestamp(block.timestamp) : null

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Database className="mr-2 h-5 w-5" />
          <h2 className="text-xl font-semibold">Block #{block.number?.toString()}</h2>
        </div>
        {timeInfo && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-1" />
            <span title={timeInfo.full}>{timeInfo.distance}</span>
          </div>
        )}
      </div>

      {/* Block Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Transactions</div>
          <div className="text-2xl font-bold">{transactions.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Gas Used</div>
          <div className="text-2xl font-bold">{gasInfo.percentage}</div>
          <div className="text-xs text-muted-foreground">
            {parseInt(gasInfo.used).toLocaleString()} / {parseInt(gasInfo.limit).toLocaleString()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Block Size</div>
          <div className="text-2xl font-bold">
            {block.size ? `${(Number(block.size) / 1024).toFixed(1)} KB` : 'N/A'}
          </div>
        </Card>
      </div>

      <Separator className="my-6" />

      {/* Block Details */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Block Hash</div>
            <div className="flex items-center">
              <code className="text-sm bg-muted px-2 py-1 rounded flex-1 mr-2">
                {block.hash}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => block.hash && copyToClipboard(block.hash)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Parent Hash</div>
            <div className="flex items-center">
              <code className="text-sm bg-muted px-2 py-1 rounded flex-1 mr-2">
                {block.parentHash}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(block.parentHash)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Miner</div>
            <div className="flex items-center">
              <code className="text-sm bg-muted px-2 py-1 rounded flex-1 mr-2">
                {block.miner}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(block.miner)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Difficulty</div>
            <div className="text-sm bg-muted px-2 py-1 rounded">
              {block.difficulty?.toString() || 'N/A'}
            </div>
          </div>
        </div>

        {block.baseFeePerGas && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Base Fee</div>
            <div className="flex items-center">
              <Zap className="w-4 h-4 mr-2 text-yellow-500" />
              <span>{(Number(block.baseFeePerGas) / 1e9).toFixed(4)} Gwei</span>
              <span className="text-muted-foreground ml-2">
                ({block.baseFeePerGas.toString()} wei)
              </span>
            </div>
          </div>
        )}
      </div>

      <Separator className="my-6" />

      {/* Transactions */}
      <div>
        <div className="flex items-center mb-4">
          <FileText className="mr-2 h-5 w-5" />
          <h3 className="text-lg font-semibold">
            Transactions ({transactions.length})
          </h3>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions in this block
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx, index) => (
              <div
                key={tx.hash}
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onTransactionSelect?.(tx.hash)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Badge variant="outline" className="mr-2">
                      {index}
                    </Badge>
                    <code className="text-sm">{tx.hash.slice(0, 20)}...</code>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tx.value > 0 ? `${(Number(tx.value) / 1e18).toFixed(4)} ETH` : 'Contract Call'}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">From:</span>
                    <div className="font-mono text-xs">{tx.from.slice(0, 10)}...</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">To:</span>
                    <div className="font-mono text-xs">
                      {tx.to ? `${tx.to.slice(0, 10)}...` : 'Contract Creation'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gas:</span>
                    <div>{tx.gas.toString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gas Price:</span>
                    <div>{(Number(tx.gasPrice || 0) / 1e9).toFixed(2)} Gwei</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}