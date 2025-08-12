'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePermissions } from '@/hooks/usePermissions'
import { useAccount } from 'wagmi'
import { 
  Shield, 
  Users, 
  List, 
  Coins, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Activity
} from 'lucide-react'
import { RoleManagementPanel } from './RoleManagementPanel'
import { AllowlistManager } from './AllowlistManager'
import { TokenAllowancePanel } from './TokenAllowancePanel'
import { PermissionAuditLog } from './PermissionAuditLog'

export function PermissionDashboard() {
  const { address } = useAccount()
  const { stats, userReport, isLoading } = usePermissions({ autoRefresh: true })
  const [activeTab, setActiveTab] = useState('overview')

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Permission Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to access permission management.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <Shield className="w-6 h-6" />
            <span>Permission Management</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Manage roles, allowlists, and token permissions across your contract ecosystem
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={userReport?.activePermissions ? "default" : "secondary"}>
            {userReport?.activePermissions || 0} Active Permissions
          </Badge>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Roles</span>
          </TabsTrigger>
          <TabsTrigger value="allowlists" className="flex items-center space-x-2">
            <List className="w-4 h-4" />
            <span>Allowlists</span>
          </TabsTrigger>
          <TabsTrigger value="allowances" className="flex items-center space-x-2">
            <Coins className="w-4 h-4" />
            <span>Allowances</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Audit</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* System Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span>Total Permissions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPermissions}</div>
                <div className="text-xs text-gray-600 flex items-center space-x-1 mt-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>{stats.activePermissions} active</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Users className="w-4 h-4 text-green-500" />
                  <span>Roles</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRoles}</div>
                <div className="text-xs text-gray-600 flex items-center space-x-1 mt-1">
                  <Activity className="w-3 h-3 text-green-500" />
                  <span>{stats.activeRoles} active</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <List className="w-4 h-4 text-purple-500" />
                  <span>Allowlists</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAllowlists}</div>
                <div className="text-xs text-gray-600 flex items-center space-x-1 mt-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>{stats.activeAllowlists} active</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>Expired</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.expiredPermissions}</div>
                <div className="text-xs text-gray-600 flex items-center space-x-1 mt-1">
                  <XCircle className="w-3 h-3 text-red-500" />
                  <span>Permissions expired</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Permission Summary */}
          {userReport && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Your Permission Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Assigned Roles ({userReport.roles.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {userReport.roles.length > 0 ? (
                        userReport.roles.map((role, index) => (
                          <Badge key={index} variant="outline" className="block w-fit">
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No roles assigned</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center space-x-2">
                      <List className="w-4 h-4" />
                      <span>Allowlists ({userReport.allowlists.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {userReport.allowlists.length > 0 ? (
                        userReport.allowlists.map((allowlist, index) => (
                          <Badge key={index} variant="outline" className="block w-fit">
                            {allowlist}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">Not in any allowlists</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>Permission Status</span>
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Active</span>
                        <Badge variant="default">{userReport.activePermissions}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Total</span>
                        <Badge variant="secondary">{userReport.totalPermissions}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Expired</span>
                        <Badge variant="destructive">{userReport.expiredPermissions}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Last checked: {userReport.lastChecked.toLocaleTimeString()}</span>
                    <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center space-y-2"
                  onClick={() => setActiveTab('roles')}
                >
                  <Users className="w-6 h-6" />
                  <span>Manage Roles</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center space-y-2"
                  onClick={() => setActiveTab('allowlists')}
                >
                  <List className="w-6 h-6" />
                  <span>Edit Allowlists</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center space-y-2"
                  onClick={() => setActiveTab('allowances')}
                >
                  <Coins className="w-6 h-6" />
                  <span>Token Allowances</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center space-y-2"
                  onClick={() => setActiveTab('audit')}
                >
                  <FileText className="w-6 h-6" />
                  <span>View Audit Log</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Warnings/Alerts */}
          {stats.expiredPermissions > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have {stats.expiredPermissions} expired permissions that may need attention.
                Check the audit log for details.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <RoleManagementPanel />
        </TabsContent>

        {/* Allowlists Tab */}
        <TabsContent value="allowlists">
          <AllowlistManager />
        </TabsContent>

        {/* Allowances Tab */}
        <TabsContent value="allowances">
          <TokenAllowancePanel />
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <PermissionAuditLog />
        </TabsContent>
      </Tabs>
    </div>
  )
}