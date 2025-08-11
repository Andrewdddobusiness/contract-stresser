'use client'

import { useState, useCallback } from 'react'
import { Hash } from 'viem'
import { Search, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useBlockSearch } from '@/services/blockchain'

interface SearchBarProps {
  onBlockSelect?: (blockNumber: bigint) => void
  onTransactionSelect?: (hash: Hash) => void
  placeholder?: string
}

export function SearchBar({ 
  onBlockSelect, 
  onTransactionSelect,
  placeholder = "Search by block number or transaction hash..."
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const { search, clearSearch, isSearching, result } = useBlockSearch()

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      await search(query.trim())
    }
  }, [query, search])

  const handleClear = () => {
    setQuery('')
    clearSearch()
  }

  const handleResultClick = () => {
    if (!result?.data) return

    if (result.type === 'block') {
      const blockData = result.data as any
      onBlockSelect?.(blockData.block.number)
    } else if (result.type === 'transaction') {
      const txData = result.data as any
      onTransactionSelect?.(txData.transaction.hash)
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-10"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button 
          type="submit" 
          disabled={!query.trim() || isSearching}
          className="px-6"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </form>

      {/* Search Results */}
      {result && (
        <Card className="mt-4 p-4">
          {result.type === 'not_found' ? (
            <div className="text-center py-4">
              <div className="text-muted-foreground">
                No results found for "{result.query}"
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Try searching with a block number (e.g., 123) or transaction hash (0x...)
              </div>
            </div>
          ) : (
            <div 
              className="cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
              onClick={handleResultClick}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={result.type === 'block' ? 'default' : 'secondary'}>
                    {result.type === 'block' ? 'Block' : 'Transaction'}
                  </Badge>
                  <span className="font-medium">
                    {result.type === 'block' ? 
                      `Block #${(result.data as any).block.number?.toString()}` :
                      'Transaction'
                    }
                  </span>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
              
              {result.type === 'block' && (
                <div className="text-sm text-muted-foreground">
                  {(result.data as any).transactions.length} transaction(s) • 
                  Hash: {(result.data as any).block.hash?.slice(0, 20)}...
                </div>
              )}
              
              {result.type === 'transaction' && (
                <div className="text-sm text-muted-foreground">
                  From: {(result.data as any).transaction.from.slice(0, 20)}... • 
                  To: {(result.data as any).transaction.to?.slice(0, 20) || 'Contract Creation'}...
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}