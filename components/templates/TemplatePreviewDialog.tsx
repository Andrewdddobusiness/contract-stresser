'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Eye, 
  Star, 
  Download, 
  GitFork, 
  User, 
  Calendar, 
  Tag, 
  FileCode,
  Settings,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'
import { FlowTemplate } from '@/services/templates/templateEngine'
import { cn } from '@/utils/cn'

interface TemplatePreviewDialogProps {
  template: FlowTemplate | null
  isOpen: boolean
  onClose: () => void
  onUse?: (template: FlowTemplate) => void
  onFork?: (template: FlowTemplate) => void
}

interface DifficultyBadgeProps {
  difficulty: FlowTemplate['difficulty']
}

function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const variants = {
    beginner: { color: 'bg-green-100 text-green-800 border-green-200', icon: '🟢' },
    intermediate: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🟡' },
    advanced: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🟠' },
    expert: { color: 'bg-red-100 text-red-800 border-red-200', icon: '🔴' }
  }

  const variant = variants[difficulty]
  
  return (
    <Badge className={cn('border', variant.color)}>
      <span className="mr-1">{variant.icon}</span>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </Badge>
  )
}

interface StarRatingProps {
  rating: number
  totalRatings: number
}

function StarRating({ rating, totalRatings }: StarRatingProps) {
  const stars = []
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />)
    } else {
      stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />)
    }
  }

  return (
    <div className="flex items-center space-x-1">
      <div className="flex">{stars}</div>
      <span className="text-sm text-muted-foreground">
        {rating.toFixed(1)} ({totalRatings})
      </span>
    </div>
  )
}

export function TemplatePreviewDialog({
  template,
  isOpen,
  onClose,
  onUse,
  onFork
}: TemplatePreviewDialogProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'parameters' | 'flow' | 'requirements'>('overview')

  if (!template) return null

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'parameters', label: 'Parameters', icon: Settings },
    { id: 'flow', label: 'Flow Structure', icon: FileCode },
    { id: 'requirements', label: 'Requirements', icon: CheckCircle }
  ] as const

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground">{template.description}</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Author</h4>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span className="text-sm">
                  {template.author.name || `${template.author.address.slice(0, 6)}...${template.author.address.slice(-4)}`}
                </span>
                {template.author.verified && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Usage Statistics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>{template.usage.downloads} downloads</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Updated {template.metadata.updatedAt.toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">License</h4>
              <Badge variant="outline">{template.metadata.license || 'MIT'}</Badge>
            </div>
          </div>
        )

      case 'parameters':
        return (
          <div className="space-y-4">
            {template.parameters.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                This template has no configurable parameters.
              </p>
            ) : (
              template.parameters.map((param, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{param.type}</Badge>
                      <span className="font-medium">{param.name}</span>
                    </div>
                    {param.required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{param.description}</p>
                  {param.defaultValue && (
                    <div className="text-xs text-muted-foreground">
                      Default: <code className="bg-muted px-1 rounded">{param.defaultValue}</code>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )

      case 'flow':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Flow Structure</h4>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Blocks:</span>
                    <Badge variant="outline">{template.flow.blocks.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Connections:</span>
                    <Badge variant="outline">{template.flow.connections.length}</Badge>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Block Types</h4>
              <div className="flex flex-wrap gap-2">
                {[...new Set(template.flow.blocks.map(block => block.type))].map(type => (
                  <Badge key={type} variant="outline">{type}</Badge>
                ))}
              </div>
            </div>
          </div>
        )

      case 'requirements':
        return (
          <div className="space-y-4">
            {template.requirements.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                This template has no special requirements.
              </p>
            ) : (
              template.requirements.map((req, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  {req.optional ? (
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={req.optional ? 'secondary' : 'destructive'}>
                        {req.type}
                      </Badge>
                      {req.optional && <Badge variant="outline" className="text-xs">Optional</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{req.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>{template.name}</span>
              </DialogTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{template.category}</Badge>
                <DifficultyBadge difficulty={template.difficulty} />
                <Badge variant={template.status === 'published' ? 'default' : 'secondary'}>
                  {template.status}
                </Badge>
              </div>
            </div>
            <StarRating 
              rating={template.usage.averageRating} 
              totalRatings={template.usage.ratings.length}
            />
          </div>
          
          {template.tags.length > 0 && (
            <div className="flex items-center space-x-1 pt-2">
              <Tag className="w-4 h-4" />
              <div className="flex flex-wrap gap-1">
                {template.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Tab Navigation */}
          <div className="flex border-b flex-shrink-0">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <ScrollArea className="flex-1 p-6">
            {renderTabContent()}
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onFork && (
            <Button variant="outline" onClick={() => onFork(template)}>
              <GitFork className="w-4 h-4 mr-2" />
              Fork
            </Button>
          )}
          {onUse && (
            <Button onClick={() => onUse(template)}>
              Use Template
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}