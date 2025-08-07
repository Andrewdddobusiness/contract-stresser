import { Metadata } from 'next'
import { Search, Blocks } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Block Explorer',
  description: 'Explore blocks and transactions',
}

export default function ExplorerPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Block Explorer</h1>
        <p className="text-muted-foreground">
          Explore blocks, transactions, and contract interactions
        </p>
      </div>

      <div className="grid gap-8">
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center">
            <Search className="mr-2 h-5 w-5" />
            <h2 className="text-lg font-semibold">Search</h2>
          </div>
          
          <div className="text-center py-8">
            <Blocks className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">Phase 5 Implementation</h3>
            <p className="text-sm text-muted-foreground">
              Block explorer functionality will be implemented in Phase 5
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-3 font-semibold">Recent Blocks</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                <span>Block #2</span>
                <span className="text-muted-foreground">1 tx</span>
              </div>
              <div className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                <span>Block #1</span>
                <span className="text-muted-foreground">1 tx</span>
              </div>
              <div className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                <span>Block #0</span>
                <span className="text-muted-foreground">0 tx</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-3 font-semibold">Recent Transactions</h3>
            <div className="space-y-2">
              <div className="rounded bg-muted p-2 text-sm">
                <div className="font-mono text-xs">0x227f84b8...</div>
                <div className="text-muted-foreground text-xs">Contract Creation</div>
              </div>
              <div className="rounded bg-muted p-2 text-sm">
                <div className="font-mono text-xs">0xd9fe27d6...</div>
                <div className="text-muted-foreground text-xs">Contract Creation</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}