'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAccount } from 'wagmi'
import { Coins, AlertTriangle, Info } from 'lucide-react'

export function TokenAllowancePanel() {
  const { address } = useAccount()

  if (!address) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Please connect your wallet to view token allowances</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center space-x-2">
          <Coins className="w-5 h-5" />
          <span>Token Allowance Management</span>
        </h2>
        <p className="text-sm text-gray-600">
          Monitor and manage token spending permissions for your contracts
        </p>
      </div>

      {/* Coming Soon Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Token allowance management interface is coming soon. This will include:
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>Overview of all token approvals</li>
            <li>Batch allowance management</li>
            <li>Allowance monitoring and alerts</li>
            <li>Security recommendations</li>
            <li>Integration with atomic operations</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Placeholder Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-base">ERC20 Allowances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-gray-400">--</div>
              <div className="text-xs text-gray-500">Coming Soon</div>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-base">ERC1155 Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-gray-400">--</div>
              <div className="text-xs text-gray-500">Coming Soon</div>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-base">Active Allowances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-gray-400">--</div>
              <div className="text-xs text-gray-500">Coming Soon</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}