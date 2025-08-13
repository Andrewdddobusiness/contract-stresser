'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  GitCommit, 
  User, 
  Clock, 
  Tag, 
  GitBranch, 
  ArrowDown, 
  RotateCcw, 
  Copy, 
  Eye,
  Plus,
  Minus,
  Edit,
  AlertCircle,
  CheckCircle,
  Calendar
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { FlowVersion, FlowChange } from '@/services/versioning/flowVersioning'
import { formatDistanceToNow, format } from 'date-fns'

interface VersionCardProps {
  version: FlowVersion
  isCurrent?: boolean
  isSelected?: boolean
  onSelect?: () => void
  onRevert?: () => void
  onCreateBranch?: () => void
  onViewChanges?: () => void
  showConnector?: boolean
  compact?: boolean
  className?: string
}

interface ChangeIconProps {
  type: FlowChange['type']
  className?: string
}

function ChangeIcon({ type, className }: ChangeIconProps) {
  const iconMap = {
    add: <Plus className={cn("w-3 h-3 text-green-600", className)} />,
    remove: <Minus className={cn("w-3 h-3 text-red-600", className)} />,
    modify: <Edit className={cn("w-3 h-3 text-blue-600", className)} />
  }
  
  return iconMap[type] || <Edit className={cn("w-3 h-3", className)} />
}

function getStatusIcon(status: FlowVersion['status']) {
  switch (status) {
    case 'published':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'deprecated':
      return <AlertCircle className="w-4 h-4 text-red-500" />
    default:
      return <GitCommit className="w-4 h-4 text-yellow-500" />
  }
}

function getStatusColor(status: FlowVersion['status']) {
  switch (status) {
    case 'published':
      return 'border-green-200 bg-green-50'
    case 'deprecated':
      return 'border-red-200 bg-red-50'
    default:
      return 'border-yellow-200 bg-yellow-50'
  }
}

export function VersionCard({
  version,
  isCurrent = false,
  isSelected = false,
  onSelect,
  onRevert,
  onCreateBranch,
  onViewChanges,
  showConnector = false,
  compact = false,
  className
}: VersionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSelect) {
      onSelect()
    }
  }

  const formatAuthorAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getChangesSummary = () => {
    const adds = version.changes.filter(c => c.type === 'add').length
    const removes = version.changes.filter(c => c.type === 'remove').length
    const modifies = version.changes.filter(c => c.type === 'modify').length
    
    const parts = []
    if (adds > 0) parts.push(`+${adds}`)
    if (removes > 0) parts.push(`-${removes}`)
    if (modifies > 0) parts.push(`~${modifies}`)
    
    return parts.join(' ')
  }

  return (
    <div className={cn("relative", className)}>
      {/* Timeline Connector */}
      {showConnector && (
        <div className="absolute left-6 top-16 w-0.5 h-8 bg-border" />
      )}

      <Card 
        className={cn(
          "transition-all duration-200 cursor-pointer hover:shadow-md",
          isCurrent ? "ring-2 ring-primary border-primary shadow-md" : "border",
          isSelected ? "ring-2 ring-blue-500 border-blue-500" : "",
          compact ? "shadow-sm" : "shadow",
          getStatusColor(version.status)
        )}
        onClick={handleCardClick}
      >
        <CardHeader className={cn("pb-2", compact ? "p-3" : "p-4")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Selection Checkbox */}
              {onSelect && (
                <Checkbox
                  checked={isSelected}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={onSelect}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              )}

              {/* Version Info */}
              <div className="flex items-center space-x-2">
                {getStatusIcon(version.status)}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      "font-semibold",
                      compact ? "text-sm" : "text-base"
                    )}>
                      v{version.version}
                    </span>
                    
                    {isCurrent && (
                      <Badge className="text-xs bg-primary text-primary-foreground">
                        Current
                      </Badge>
                    )}
                    
                    {version.branch && version.branch !== 'main' && (
                      <Badge variant="outline" className="text-xs flex items-center space-x-1">
                        <GitBranch className="w-3 h-3" />
                        <span>{version.branch}</span>
                      </Badge>
                    )}
                    
                    <Badge 
                      variant={version.status === 'published' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {version.status}
                    </Badge>
                  </div>
                  
                  {!compact && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {version.metadata.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1">
              {onViewChanges && version.changes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewChanges()
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="w-3 h-3" />
                </Button>
              )}

              {onCreateBranch && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateBranch()
                  }}
                  className="h-8 w-8 p-0"
                >
                  <GitBranch className="w-3 h-3" />
                </Button>
              )}

              {onRevert && !isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRevert()
                  }}
                  className="h-8 w-8 p-0"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className={cn("pt-0", compact ? "p-3 pt-0" : "p-4 pt-0")}>
          {/* Commit Message */}
          <div className="mb-3">
            <p className={cn(
              "font-medium text-foreground",
              compact ? "text-sm" : "text-base"
            )}>
              {version.metadata.commitMessage}
            </p>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span>{formatAuthorAddress(version.metadata.author)}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatDistanceToNow(version.metadata.timestamp, { addSuffix: true })}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {version.changes.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {getChangesSummary()}
                </Badge>
              )}
              
              {version.metadata.tags.length > 0 && (
                <Badge variant="outline" className="text-xs flex items-center space-x-1">
                  <Tag className="w-3 h-3" />
                  <span>{version.metadata.tags.length}</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Changes Summary */}
          {version.changes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "font-medium",
                  compact ? "text-xs" : "text-sm"
                )}>
                  Changes ({version.changes.length})
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(!isExpanded)
                  }}
                  className="h-6 px-2 text-xs"
                >
                  {isExpanded ? 'Hide' : 'Show'}
                </Button>
              </div>

              {/* Changes List */}
              <div className={cn(
                "space-y-1 overflow-hidden transition-all duration-200",
                isExpanded ? "max-h-96" : "max-h-20"
              )}>
                {version.changes.slice(0, isExpanded ? undefined : 3).map((change, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    <ChangeIcon type={change.type} />
                    <span className="flex-1 truncate">{change.description}</span>
                    <Badge variant="outline" className="text-xs">
                      {change.target}
                    </Badge>
                  </div>
                ))}
                
                {!isExpanded && version.changes.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{version.changes.length - 3} more changes
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Extended Metadata for Non-Compact View */}
          {!compact && (
            <div className="mt-3 pt-3 border-t">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{format(version.metadata.timestamp, 'MMM dd, yyyy HH:mm')}</span>
                </div>
                
                {version.parentVersion && (
                  <div className="flex items-center space-x-1">
                    <ArrowDown className="w-3 h-3" />
                    <span>From {version.parentVersion.slice(0, 8)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}