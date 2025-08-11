'use client'

import { Hash } from 'viem'
import { Copy, ExternalLink, AlertCircle, CheckCircle, Zap, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading'
import { useTransactionDetails } from '@/services/blockchain'
import { toast } from 'react-hot-toast'

interface TransactionDetailsProps {
  hash: Hash
  onClose?: () => void
}

export function TransactionDetails({ hash, onClose }: TransactionDetailsProps) {
  const { data: txData, isLoading, error } = useTransactionDetails(hash)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const formatValue = (value: bigint) => {
    const eth = Number(value) / 1e18
    if (eth === 0) return '0 ETH'
    if (eth < 0.0001) return `${value.toString()} wei`
    return `${eth.toFixed(6)} ETH`
  }

  const formatGasPrice = (gasPrice: bigint | undefined | null) => {
    if (!gasPrice) return 'N/A'
    const gwei = Number(gasPrice) / 1e9
    return `${gwei.toFixed(2)} Gwei`
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner className="w-6 h-6" />
          <span className="ml-2">Loading transaction details...</span>
        </div>
      </Card>
    )
  }

  if (error || !txData) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">Failed to load transaction</div>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Transaction not found'}
          </p>
          {onClose && (
            <Button variant="outline" onClick={onClose} className="mt-4">
              Close
            </Button>
          )}
        </div>
      </Card>
    )
  }

  const { transaction, receipt } = txData

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          <h2 className="text-xl font-semibold">Transaction Details</h2>
        </div>
        <div className="flex items-center gap-2">
          {receipt && (
            <Badge variant={receipt.status === 'success' ? 'default' : 'destructive'}>
              {receipt.status === 'success' ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Success
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Failed
                </>
              )}
            </Badge>
          )}
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Transaction Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Value</div>
          <div className="text-xl font-bold">{formatValue(transaction.value)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Gas Used</div>
          <div className="text-xl font-bold">
            {receipt ? receipt.gasUsed.toString() : transaction.gas.toString()}
          </div>
          <div className="text-xs text-muted-foreground">
            Limit: {transaction.gas.toString()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Gas Price</div>
          <div className="text-xl font-bold">{formatGasPrice(transaction.gasPrice)}</div>
        </Card>
      </div>

      <Separator className="my-6" />

      {/* Transaction Info */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">Transaction Hash</div>
          <div className="flex items-center">
            <code className="text-sm bg-muted px-2 py-1 rounded flex-1 mr-2">
              {transaction.hash}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(transaction.hash)}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">From</div>
            <div className="flex items-center">
              <code className="text-sm bg-muted px-2 py-1 rounded flex-1 mr-2">
                {transaction.from}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(transaction.from)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">To</div>
            <div className="flex items-center">
              <code className="text-sm bg-muted px-2 py-1 rounded flex-1 mr-2">
                {transaction.to || 'Contract Creation'}
              </code>
              {transaction.to && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(transaction.to!)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Block Number</div>
            <div className="text-sm bg-muted px-2 py-1 rounded">
              {transaction.blockNumber?.toString() || 'Pending'}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Transaction Index</div>
            <div className="text-sm bg-muted px-2 py-1 rounded">
              {transaction.transactionIndex?.toString() || 'N/A'}
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">Nonce</div>
          <div className="text-sm bg-muted px-2 py-1 rounded inline-block">
            {transaction.nonce}
          </div>
        </div>

        {transaction.input && transaction.input !== '0x' && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Input Data</div>
            <div className="bg-muted p-3 rounded font-mono text-xs break-all max-h-32 overflow-y-auto">
              {transaction.input}
            </div>
          </div>
        )}
      </div>

      {/* Logs/Events */}
      {receipt?.logs && receipt.logs.length > 0 && (
        <>
          <Separator className="my-6" />
          <div>
            <div className="flex items-center mb-4">
              <Zap className="mr-2 h-5 w-5" />
              <h3 className="text-lg font-semibold">Events ({receipt.logs.length})</h3>
            </div>
            <div className="space-y-3">
              {receipt.logs.map((log, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">Event {index}</Badge>
                    <div className="text-sm text-muted-foreground">
                      Log Index: {log.logIndex?.toString()}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Contract:</span>
                      <code className="ml-2 bg-muted px-1 rounded">{log.address}</code>
                    </div>
                    {log.topics.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Topics:</span>
                        <div className="mt-1 space-y-1">
                          {log.topics.map((topic, i) => (
                            <div key={i} className="font-mono text-xs bg-muted px-2 py-1 rounded">
                              {i}: {topic}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {log.data && log.data !== '0x' && (
                      <div>
                        <span className="text-muted-foreground">Data:</span>
                        <div className="font-mono text-xs bg-muted px-2 py-1 rounded mt-1 break-all">
                          {log.data}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}