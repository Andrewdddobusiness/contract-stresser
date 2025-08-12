'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAccount } from 'wagmi'
import { FileText, AlertTriangle, Info } from 'lucide-react'

export function PermissionAuditLog() {
  const { address } = useAccount()

  if (!address) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Please connect your wallet to view audit logs</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Permission Audit Log</span>
        </h2>
        <p className="text-sm text-gray-600">
          Track all permission changes, role assignments, and access attempts
        </p>
      </div>

      {/* Coming Soon Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Permission audit logging is coming soon. This will include:
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>Complete audit trail of permission changes</li>
            <li>Role assignment and revocation history</li>
            <li>Allowlist modification tracking</li>
            <li>Failed access attempt monitoring</li>
            <li>Export capabilities for compliance</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Placeholder Content */}
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Audit logging coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}