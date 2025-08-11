'use client'

import { useState } from 'react'
import { Hash } from 'viem'
import { Clock, Zap, Database, Activity } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { useRecentBlocks, useRealtimeBlocks } from '@/services/blockchain'
import { formatDistanceToNow } from 'date-fns'

interface BlockListProps {
  onBlockSelect?: (blockNumber: bigint) => void
  count?: number
}

export function BlockList({ onBlockSelect, count = 10 }: BlockListProps) {
  const [selectedBlock, setSelectedBlock] = useState<bigint | null>(null)
  const { data: blocks, isLoading, error, refetch } = useRecentBlocks(count)
  const { latestBlock, isConnected } = useRealtimeBlocks()

  const handleBlockClick = (blockNumber: bigint) => {
    setSelectedBlock(blockNumber)
    onBlockSelect?.(blockNumber)
  }

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return formatDistanceToNow(date, { addSuffix: true })
  }

  const formatGasUsed = (gasUsed: bigint | null | undefined, gasLimit: bigint) => {
    if (!gasUsed) return '0%'
    const percentage = (Number(gasUsed) / Number(gasLimit)) * 100
    return `${percentage.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner className="w-6 h-6" />
          <span className="ml-2">Loading recent blocks...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">Failed to load blocks</div>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <button
            onClick={() => refetch()}
            className="text-sm text-blue-500 hover:underline"
          >
            Try again
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Database className="mr-2 h-5 w-5" />
          <h2 className="text-lg font-semibold">Recent Blocks</h2>
        </div>
        <div className="flex items-center">
          {isConnected ? (
            <Badge variant="default" className="bg-green-500">
              <Activity className="w-3 h-3 mr-1" />
              Live
            </Badge>
          ) : (
            <Badge variant="secondary">
              Polling
            </Badge>
          )}
        </div>
      </div>

      {!blocks || blocks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No blocks found
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map(({ block, transactions }) => (
            <div
              key={block.number?.toString()}
              className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedBlock === block.number ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => block.number && handleBlockClick(block.number)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="font-mono text-sm font-medium">
                    Block #{block.number?.toString()}
                  </div>
                  {latestBlock?.block.number === block.number && (
                    <Badge variant="default" className="ml-2 bg-green-500 text-xs">
                      Latest
                    </Badge>
                  )}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  {block.timestamp ? formatTimestamp(block.timestamp) : 'Unknown'}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Transactions</div>
                  <div className="font-medium">{transactions.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gas Used</div>
                  <div className="font-medium">
                    {formatGasUsed(block.gasUsed, block.gasLimit)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Size</div>
                  <div className="font-medium">
                    {block.size ? `${(Number(block.size) / 1024).toFixed(1)} KB` : 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Hash</div>
                  <div className="font-mono text-xs">
                    {block.hash ? `${block.hash.slice(0, 10)}...` : 'Unknown'}
                  </div>
                </div>
              </div>

              {block.baseFeePerGas && (
                <div className="mt-2 pt-2 border-t">
                  <div className="flex items-center text-sm">
                    <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                    <span className="text-muted-foreground mr-2">Base Fee:</span>
                    <span className="font-medium">
                      {(Number(block.baseFeePerGas) / 1e9).toFixed(2)} Gwei
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}