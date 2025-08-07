import { Metadata } from 'next'
import { BarChart3, Activity, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Performance analytics and testing overview',
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Performance analytics and testing overview
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Total Tests</h3>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No tests run yet
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Avg TPS</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Transactions per second
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Gas Usage</h3>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Average gas per transaction
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-2 h-12 w-12" />
            <p>No recent activity</p>
            <p className="text-sm">Deploy a contract and run tests to see data</p>
          </div>
        </div>
      </div>
    </div>
  )
}