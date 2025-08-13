'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Share, 
  Copy, 
  Download, 
  Link, 
  Globe, 
  Lock, 
  Users, 
  Calendar,
  CheckCircle,
  AlertCircle,
  QrCode,
  Mail
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { FlowTemplate } from '@/services/templates/templateEngine'
import { templateImportExportService, SharingPermissions } from '@/services/templates/templateImportExport'
import { formatDistanceToNow } from 'date-fns'

interface TemplateShareDialogProps {
  template: FlowTemplate
  isOpen: boolean
  onClose: () => void
  onShare?: (shareUrl: string, permissions: SharingPermissions) => void
}

interface ShareLinkResult {
  url: string
  shortUrl?: string
  qrCode?: string
  expiresAt?: Date
}

export function TemplateShareDialog({ 
  template, 
  isOpen, 
  onClose, 
  onShare 
}: TemplateShareDialogProps) {
  const [shareResult, setShareResult] = useState<ShareLinkResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Sharing configuration
  const [permissions, setPermissions] = useState<SharingPermissions>({
    visibility: 'public',
    allowFork: true,
    allowModification: false,
    teamMembers: [],
    expiresAt: undefined
  })
  
  const [shareConfig, setShareConfig] = useState({
    includeAuthorInfo: true,
    includeUsageStats: false,
    includeMetadata: true,
    customMessage: '',
    recipientEmails: [] as string[]
  })

  const [newTeamMember, setNewTeamMember] = useState('')
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setShareResult(null)
      setError(null)
    }
  }, [isOpen])

  const handleGenerateShareLink = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const shareUrl = await templateImportExportService.generateSharingLink(template.id, {
        expiresAt: permissions.expiresAt,
        allowFork: permissions.allowFork,
        includeAuthorInfo: shareConfig.includeAuthorInfo
      })

      // In a real implementation, you'd also generate QR code and short URL
      setShareResult({
        url: shareUrl,
        shortUrl: `https://tmpl.ly/${shareUrl.split('/').pop()?.slice(0, 8)}`,
        expiresAt: permissions.expiresAt
      })

      if (onShare) {
        onShare(shareUrl, permissions)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate share link')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      // In a real app, you'd show a toast notification
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const exportData = await templateImportExportService.exportTemplate(template.id, {
        format: 'json',
        includeMetadata: shareConfig.includeMetadata,
        includeUsageStats: shareConfig.includeUsageStats,
        includeAuthorInfo: shareConfig.includeAuthorInfo
      })

      const blob = new Blob([exportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.name.replace(/\s+/g, '_')}_template.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download template')
    }
  }

  const addTeamMember = () => {
    if (newTeamMember && !permissions.teamMembers?.includes(newTeamMember as any)) {
      setPermissions(prev => ({
        ...prev,
        teamMembers: [...(prev.teamMembers || []), newTeamMember as any]
      }))
      setNewTeamMember('')
    }
  }

  const removeTeamMember = (address: string) => {
    setPermissions(prev => ({
      ...prev,
      teamMembers: prev.teamMembers?.filter(member => member !== address) || []
    }))
  }

  const addRecipientEmail = () => {
    if (newEmail && !shareConfig.recipientEmails.includes(newEmail)) {
      setShareConfig(prev => ({
        ...prev,
        recipientEmails: [...prev.recipientEmails, newEmail]
      }))
      setNewEmail('')
    }
  }

  const removeRecipientEmail = (email: string) => {
    setShareConfig(prev => ({
      ...prev,
      recipientEmails: prev.recipientEmails.filter(e => e !== email)
    }))
  }

  const getVisibilityIcon = () => {
    switch (permissions.visibility) {
      case 'public': return <Globe className="w-4 h-4" />
      case 'private': return <Lock className="w-4 h-4" />
      case 'team': return <Users className="w-4 h-4" />
      default: return <Globe className="w-4 h-4" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share className="w-5 h-5" />
            <span>Share Template</span>
          </DialogTitle>
          <DialogDescription>
            Share "{template.name}" with others or export for offline use
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-medium">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{template.category}</Badge>
                  <Badge variant="outline">{template.difficulty}</Badge>
                  <Badge variant="outline">{template.flow.blocks.length} blocks</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Sharing Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Sharing Options</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Visibility */}
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select 
                  value={permissions.visibility} 
                  onValueChange={(value: any) => setPermissions(prev => ({ ...prev, visibility: value }))}
                >
                  <SelectTrigger>
                    <div className="flex items-center space-x-2">
                      {getVisibilityIcon()}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4" />
                        <span>Public</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center space-x-2">
                        <Lock className="w-4 h-4" />
                        <span>Private</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="team">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>Team Only</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Permissions */}
              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow-fork" className="text-sm">Allow Forking</Label>
                    <Switch
                      id="allow-fork"
                      checked={permissions.allowFork}
                      onCheckedChange={(checked) => setPermissions(prev => ({ ...prev, allowFork: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow-modification" className="text-sm">Allow Modification</Label>
                    <Switch
                      id="allow-modification"
                      checked={permissions.allowModification}
                      onCheckedChange={(checked) => setPermissions(prev => ({ ...prev, allowModification: checked }))}
                    />
                  </div>
                </div>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <Label>Expiration</Label>
                <Select 
                  value={permissions.expiresAt ? 'custom' : 'never'}
                  onValueChange={(value) => {
                    if (value === 'never') {
                      setPermissions(prev => ({ ...prev, expiresAt: undefined }))
                    } else if (value === '7d') {
                      const expires = new Date()
                      expires.setDate(expires.getDate() + 7)
                      setPermissions(prev => ({ ...prev, expiresAt: expires }))
                    } else if (value === '30d') {
                      const expires = new Date()
                      expires.setDate(expires.getDate() + 30)
                      setPermissions(prev => ({ ...prev, expiresAt: expires }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="30d">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Team Members (if team visibility) */}
            {permissions.visibility === 'team' && (
              <div className="space-y-2">
                <Label>Team Members</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="0x... address"
                    value={newTeamMember}
                    onChange={(e) => setNewTeamMember(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addTeamMember} size="sm">
                    Add
                  </Button>
                </div>
                {permissions.teamMembers && permissions.teamMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {permissions.teamMembers.map(member => (
                      <Badge key={member} variant="outline" className="flex items-center space-x-1">
                        <span>{`${member.slice(0, 6)}...${member.slice(-4)}`}</span>
                        <button onClick={() => removeTeamMember(member)} className="ml-1 hover:text-red-600">
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Export Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Export Options</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-metadata"
                  checked={shareConfig.includeMetadata}
                  onCheckedChange={(checked) => setShareConfig(prev => ({ ...prev, includeMetadata: checked }))}
                />
                <Label htmlFor="include-metadata" className="text-sm">Include Metadata</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-author"
                  checked={shareConfig.includeAuthorInfo}
                  onCheckedChange={(checked) => setShareConfig(prev => ({ ...prev, includeAuthorInfo: checked }))}
                />
                <Label htmlFor="include-author" className="text-sm">Include Author</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-stats"
                  checked={shareConfig.includeUsageStats}
                  onCheckedChange={(checked) => setShareConfig(prev => ({ ...prev, includeUsageStats: checked }))}
                />
                <Label htmlFor="include-stats" className="text-sm">Include Stats</Label>
              </div>
            </div>

            {/* Custom Message */}
            <div className="space-y-2">
              <Label htmlFor="custom-message">Custom Message (Optional)</Label>
              <Textarea
                id="custom-message"
                placeholder="Add a message for template recipients..."
                value={shareConfig.customMessage}
                onChange={(e) => setShareConfig(prev => ({ ...prev, customMessage: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          {/* Generated Share Link */}
          {shareResult && (
            <div className="space-y-4 bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Share Link Generated</span>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-green-600 dark:text-green-400">Full URL</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      value={shareResult.url} 
                      readOnly 
                      className="font-mono text-xs bg-white dark:bg-gray-900"
                    />
                    <Button size="sm" onClick={() => handleCopyLink(shareResult.url)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {shareResult.shortUrl && (
                  <div className="space-y-1">
                    <Label className="text-xs text-green-600 dark:text-green-400">Short URL</Label>
                    <div className="flex items-center space-x-2">
                      <Input 
                        value={shareResult.shortUrl} 
                        readOnly 
                        className="font-mono text-xs bg-white dark:bg-gray-900"
                      />
                      <Button size="sm" onClick={() => handleCopyLink(shareResult.shortUrl!)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {shareResult.expiresAt && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Expires {formatDistanceToNow(shareResult.expiresAt, { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            <Button 
              onClick={handleGenerateShareLink} 
              disabled={isGenerating}
              className="min-w-32"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" />
                  Generate Link
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}