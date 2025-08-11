'use client'

import { useState } from 'react'
import { Hash } from 'viem'
import { BlockList, BlockDetails, SearchBar, TransactionDetails } from '@/components/explorer'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export default function ExplorerPage() {
  const [selectedBlock, setSelectedBlock] = useState<bigint | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<Hash | null>(null)
  const [showBlockDetails, setShowBlockDetails] = useState(false)
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)

  const handleBlockSelect = (blockNumber: bigint) => {
    setSelectedBlock(blockNumber)
    setShowBlockDetails(true)
    setShowTransactionDetails(false)
  }

  const handleTransactionSelect = (hash: Hash) => {
    setSelectedTransaction(hash)
    setShowTransactionDetails(true)
    setShowBlockDetails(false)
  }

  const handleCloseDetails = () => {
    setShowBlockDetails(false)
    setShowTransactionDetails(false)
    setSelectedBlock(null)
    setSelectedTransaction(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Block Explorer</h1>
        <p className="text-muted-foreground">
          Explore blocks, transactions, and contract interactions
        </p>
      </div>

      <div className="grid gap-8">
        {/* Search Bar */}
        <Card className="p-6">
          <SearchBar
            onBlockSelect={handleBlockSelect}
            onTransactionSelect={handleTransactionSelect}
          />
        </Card>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Block List */}
          <div className="lg:col-span-5">
            <BlockList onBlockSelect={handleBlockSelect} />
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-7">
            {showBlockDetails && selectedBlock ? (
              <BlockDetails
                blockNumber={selectedBlock}
                onTransactionSelect={handleTransactionSelect}
              />
            ) : showTransactionDetails && selectedTransaction ? (
              <TransactionDetails
                hash={selectedTransaction}
                onClose={handleCloseDetails}
              />
            ) : (
              <Card className="p-6">
                <div className="text-center py-12">
                  <div className="text-muted-foreground">
                    Select a block or search for a transaction to view details
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Modal for Details */}
      <Dialog open={showBlockDetails || showTransactionDetails} onOpenChange={(open) => {
        if (!open) handleCloseDetails()
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto lg:hidden">
          {showBlockDetails && selectedBlock ? (
            <BlockDetails
              blockNumber={selectedBlock}
              onTransactionSelect={handleTransactionSelect}
            />
          ) : showTransactionDetails && selectedTransaction ? (
            <TransactionDetails
              hash={selectedTransaction}
              onClose={handleCloseDetails}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}