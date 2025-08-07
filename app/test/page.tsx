import { Metadata } from 'next'
import { FlaskConical, Settings } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Stress Tests',
  description: 'Configure and execute stress tests',
}

export default function TestPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Stress Tests</h1>
        <p className="text-muted-foreground">
          Configure and execute high-volume transaction tests
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            <h2 className="text-lg font-semibold">Test Configuration</h2>
          </div>
          
          <div className="text-center py-8">
            <FlaskConical className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">Phase 3 Implementation</h3>
            <p className="text-sm text-muted-foreground">
              Stress testing UI will be implemented in Phase 3
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Available Test Types</h2>
          <div className="space-y-3">
            <div className="rounded bg-muted p-3">
              <h4 className="font-medium">Sequential Transactions</h4>
              <p className="text-sm text-muted-foreground">Send transactions one after another</p>
            </div>
            <div className="rounded bg-muted p-3">
              <h4 className="font-medium">Concurrent Transactions</h4>
              <p className="text-sm text-muted-foreground">Send multiple transactions simultaneously</p>
            </div>
            <div className="rounded bg-muted p-3">
              <h4 className="font-medium">Multi-User Simulation</h4>
              <p className="text-sm text-muted-foreground">Simulate many users interacting</p>
            </div>
            <div className="rounded bg-muted p-3">
              <h4 className="font-medium">Gas Stress Testing</h4>
              <p className="text-sm text-muted-foreground">Test gas limit scenarios</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}