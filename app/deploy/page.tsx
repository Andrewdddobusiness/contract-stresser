import { Metadata } from 'next'
import { Upload, Coins } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Deploy Contracts',
  description: 'Deploy ERC-20 contracts for testing',
}

export default function DeployPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Deploy Contracts</h1>
        <p className="text-muted-foreground">
          Deploy ERC-20 contracts with custom parameters
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            <h2 className="text-lg font-semibold">Contract Configuration</h2>
          </div>
          
          <div className="space-y-4">
            <div className="text-center py-8">
              <Coins className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                Contract deployment UI will be implemented in Phase 2
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Deployment Status</h2>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-medium text-success">✓ Smart Contracts Ready</h3>
              <p className="text-sm text-muted-foreground mt-1">
                TestToken contract compiled and ready for deployment
              </p>
            </div>
            
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-medium text-success">✓ Anvil Running</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Local blockchain available at localhost:8545
              </p>
            </div>
            
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-medium text-info">→ Manual Deployment Available</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Use npm run forge:deploy to deploy via CLI
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}