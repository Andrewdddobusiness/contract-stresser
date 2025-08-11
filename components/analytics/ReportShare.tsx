'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Share,
  Copy,
  Link,
  Mail,
  Download,
  Eye,
  Calendar,
  Users,
  Shield,
  CheckCircle,
  ExternalLink,
  QrCode
} from 'lucide-react'
import type { PerformanceReport } from '@/services/analytics/reports'

interface ReportShareProps {
  report: PerformanceReport | null
  shareUrl?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerateShareUrl?: (report: PerformanceReport) => Promise<string>
}

export function ReportShare({
  report,
  shareUrl: initialShareUrl,
  open,
  onOpenChange,
  onGenerateShareUrl
}: ReportShareProps) {
  const [shareUrl, setShareUrl] = useState(initialShareUrl || '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [shareSettings, setShareSettings] = useState({
    requirePassword: false,
    expiresIn: '7d',
    allowDownload: true,
    trackViews: true
  })

  if (!report) return null

  const handleGenerateLink = async () => {
    if (shareUrl || !onGenerateShareUrl) return
    
    setIsGenerating(true)
    try {
      const url = await onGenerateShareUrl(report)
      setShareUrl(url)
    } catch (error) {
      console.error('Failed to generate share URL:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleEmailShare = () => {
    if (!shareUrl || !recipientEmail) return
    
    const subject = encodeURIComponent(`Performance Report: ${report.title}`)
    const body = encodeURIComponent(
      `Hi,\n\nI've generated a performance report that you might find interesting:\n\n` +
      `Report Title: ${report.title}\n` +
      `Generated: ${report.generatedAt.toLocaleString()}\n` +
      `Total Transactions: ${report.analysis.overview.totalTransactions.toLocaleString()}\n` +
      `Success Rate: ${report.analysis.overview.successRate.toFixed(1)}%\n\n` +
      `View the full report here: ${shareUrl}\n\n` +
      `Best regards`
    )
    
    window.open(`mailto:${recipientEmail}?subject=${subject}&body=${body}`)
  }

  const handleSocialShare = (platform: 'twitter' | 'linkedin') => {
    if (!shareUrl) return
    
    const text = encodeURIComponent(
      `Check out this performance analysis report: ${report.title} - ` +
      `${report.analysis.overview.totalTransactions} transactions with ` +
      `${report.analysis.overview.successRate.toFixed(1)}% success rate`
    )
    
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    }
    
    window.open(urls[platform], '_blank', 'width=600,height=400')
  }

  const getExpirationDate = () => {
    const now = new Date()
    switch (shareSettings.expiresIn) {
      case '1d': return new Date(now.getTime() + 24 * 60 * 60 * 1000)
      case '7d': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      case '30d': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      case 'never': return null
      default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto !bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Share className="w-5 h-5 mr-2" />
            Share Performance Report
          </DialogTitle>
          <DialogDescription>
            Share "{report.title}" with others via link or email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Title:</span>
                  <div className="font-medium">{report.title}</div>
                </div>
                <div>
                  <span className="text-gray-600">Generated:</span>
                  <div className="font-medium">{report.generatedAt.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Transactions:</span>
                  <div className="font-medium">{report.analysis.overview.totalTransactions.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Success Rate:</span>
                  <div className="font-medium">{report.analysis.overview.successRate.toFixed(1)}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Share Link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Link className="w-4 h-4 mr-2" />
                Shareable Link
              </CardTitle>
              <CardDescription>
                Generate a secure link that others can use to view the report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {shareUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="shrink-0"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(shareUrl, '_blank')}
                      className="shrink-0"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {getExpirationDate() ? 
                        `Expires: ${getExpirationDate()!.toLocaleDateString()}` :
                        'Never expires'
                      }
                    </div>
                    {shareSettings.trackViews && (
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        View tracking enabled
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleGenerateLink}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? 'Generating...' : 'Generate Share Link'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Email Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Email Sharing
              </CardTitle>
              <CardDescription>
                Send the report directly to someone via email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Label htmlFor="email" className="sr-only">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="recipient@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleEmailShare}
                  disabled={!shareUrl || !recipientEmail}
                >
                  Send Email
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Social Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Social Sharing
              </CardTitle>
              <CardDescription>
                Share on social media platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleSocialShare('twitter')}
                  disabled={!shareUrl}
                  className="flex-1"
                >
                  Share on Twitter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSocialShare('linkedin')}
                  disabled={!shareUrl}
                  className="flex-1"
                >
                  Share on LinkedIn
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {shareUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Generate QR code for the URL
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`
                      window.open(qrUrl, '_blank')
                    }}
                    className="flex items-center justify-center"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    QR Code
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      const iframe = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0"></iframe>`
                      navigator.clipboard.writeText(iframe)
                    }}
                    className="flex items-center justify-center"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Embed Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Report contains sensitive data:</span>
                  <Badge variant="outline">
                    {report.transactions.some(tx => tx.hash) ? 'Yes' : 'No'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Link expiration:</span>
                  <Badge variant="outline">
                    {getExpirationDate() ? getExpirationDate()!.toLocaleDateString() : 'Never'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Download allowed:</span>
                  <Badge variant={shareSettings.allowDownload ? "default" : "secondary"}>
                    {shareSettings.allowDownload ? 'Yes' : 'No'}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="text-xs text-gray-500">
                  <strong>Privacy Notice:</strong> Shared reports may contain transaction hashes, 
                  gas usage data, and timing information. Only share with trusted parties.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}