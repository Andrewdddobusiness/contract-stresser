'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { 
  Star, 
  Download, 
  GitFork, 
  Eye, 
  Clock,
  User,
  Shield,
  TrendingUp,
  Palette,
  Vote,
  Gamepad2,
  Settings,
  Zap,
  Award,
  Hash,
  Calendar
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { FlowTemplate, TemplateCategory } from '@/services/templates/templateEngine'
import { formatDistanceToNow } from 'date-fns'

interface TemplateCardProps {
  template: FlowTemplate
  onUse: (template: FlowTemplate) => void
  onFork: (template: FlowTemplate) => void
  onView?: (template: FlowTemplate) => void
  showRank?: boolean
  showLastUpdated?: boolean
  className?: string
}

interface DifficultyBadgeProps {
  difficulty: string
  size?: 'sm' | 'md'
}

const CATEGORY_ICONS: Record<TemplateCategory, React.ComponentType<{ className?: string }>> = {
  'DeFi': TrendingUp,
  'NFT': Palette,
  'Governance': Vote,
  'Gaming': Gamepad2,
  'Utility': Settings,
  'Advanced': Zap
}

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  'DeFi': 'text-green-600 bg-green-50 border-green-200',
  'NFT': 'text-purple-600 bg-purple-50 border-purple-200',
  'Governance': 'text-blue-600 bg-blue-50 border-blue-200',
  'Gaming': 'text-orange-600 bg-orange-50 border-orange-200',
  'Utility': 'text-gray-600 bg-gray-50 border-gray-200',
  'Advanced': 'text-red-600 bg-red-50 border-red-200'
}

function DifficultyBadge({ difficulty, size = 'sm' }: DifficultyBadgeProps) {
  const colors = {
    beginner: 'bg-green-100 text-green-800 border-green-300',
    intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    advanced: 'bg-orange-100 text-orange-800 border-orange-300',
    expert: 'bg-red-100 text-red-800 border-red-300'
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        colors[difficulty as keyof typeof colors] || colors.intermediate,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
      )}
    >
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </Badge>
  )
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const stars = []
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 !== 0

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Star 
          key={i} 
          className={cn(
            'fill-yellow-400 text-yellow-400',
            size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
          )} 
        />
      )
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <div key={i} className="relative">
          <Star className={cn(
            'text-gray-300',
            size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
          )} />
          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star className={cn(
              'fill-yellow-400 text-yellow-400',
              size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
            )} />
          </div>
        </div>
      )
    } else {
      stars.push(
        <Star 
          key={i} 
          className={cn(
            'text-gray-300',
            size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
          )} 
        />
      )
    }
  }

  return <div className="flex items-center space-x-0.5">{stars}</div>
}

export function TemplateCard({ 
  template, 
  onUse, 
  onFork, 
  onView,
  showRank = false,
  showLastUpdated = false,
  className 
}: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const CategoryIcon = CATEGORY_ICONS[template.category] || Settings
  const categoryColor = CATEGORY_COLORS[template.category] || CATEGORY_COLORS['Utility']

  const handleUse = (e: React.MouseEvent) => {
    e.stopPropagation()
    onUse(template)
  }

  const handleFork = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFork(template)
  }

  const handleView = () => {
    onView?.(template)
  }

  const formatDownloads = (downloads: number) => {
    if (downloads >= 1000) {
      return `${(downloads / 1000).toFixed(1)}k`
    }
    return downloads.toString()
  }

  return (
    <Card 
      className={cn(
        "template-card cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
        "border-2 hover:border-primary/20",
        isHovered && "shadow-lg",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleView}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center space-x-2">
            <Badge className={cn("flex items-center space-x-1 border", categoryColor)}>
              <CategoryIcon className="w-3 h-3" />
              <span className="text-xs font-medium">{template.category}</span>
            </Badge>
            
            <DifficultyBadge difficulty={template.difficulty} />
            
            {template.author.verified && (
              <Shield className="w-4 h-4 text-blue-500" title="Verified Author" />
            )}
          </div>

          {showRank && (
            <Badge variant="outline" className="text-xs">
              <Hash className="w-3 h-3 mr-1" />
              Top
            </Badge>
          )}
        </div>

        <CardTitle className="text-lg font-semibold leading-tight">
          {template.name}
        </CardTitle>

        {/* Rating and Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <StarRating rating={template.usage.averageRating} />
              <span className="text-muted-foreground text-xs">
                ({template.usage.ratings.length})
              </span>
            </div>
            
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Download className="w-3 h-3" />
              <span className="text-xs">{formatDownloads(template.usage.downloads)}</span>
            </div>
          </div>

          {showLastUpdated && (
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span className="text-xs">
                {formatDistanceToNow(template.metadata.updatedAt, { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="py-3">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {template.description}
        </p>

        {/* Template Tags */}
        <div className="template-tags flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 4).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs px-2 py-0.5">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 4 && (
            <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground">
              +{template.tags.length - 4}
            </Badge>
          )}
        </div>

        {/* Author Information */}
        <div className="author-info flex items-center space-x-2 mb-3">
          <Avatar className="w-6 h-6">
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <User className="w-3 h-3 text-primary" />
            </div>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              by {template.author.name || `${template.author.address.slice(0, 6)}...${template.author.address.slice(-4)}`}
            </p>
          </div>
          {template.author.verified && (
            <Award className="w-3 h-3 text-blue-500 flex-shrink-0" />
          )}
        </div>

        {/* Requirements Preview */}
        {template.requirements.length > 0 && (
          <div className="requirements-preview">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Requirements:
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {template.requirements.slice(0, 2).map((req, index) => (
                <div key={index} className="flex items-start space-x-1">
                  <span className="text-primary mt-0.5">•</span>
                  <span className="line-clamp-1">{req.description}</span>
                </div>
              ))}
              {template.requirements.length > 2 && (
                <div className="text-xs text-muted-foreground">
                  +{template.requirements.length - 2} more requirements
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 space-y-2">
        {/* Primary Actions */}
        <div className="flex w-full space-x-2">
          <Button 
            onClick={handleUse}
            className="flex-1 h-9"
            size="sm"
          >
            <span>Use Template</span>
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleFork}
            size="sm"
            className="flex items-center space-x-1 px-3"
          >
            <GitFork className="w-3 h-3" />
            <span>Fork</span>
          </Button>
        </div>

        {/* Secondary Actions */}
        {onView && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleView}
            className="w-full h-8 text-xs flex items-center justify-center space-x-1"
          >
            <Eye className="w-3 h-3" />
            <span>View Details</span>
          </Button>
        )}

        {/* Template Metadata */}
        <div className="w-full pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-3">
              <span>v{template.metadata.version}</span>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatDistanceToNow(template.metadata.createdAt)} ago</span>
              </div>
            </div>
            
            {template.flow.blocks.length > 0 && (
              <div className="flex items-center space-x-1">
                <span>{template.flow.blocks.length} blocks</span>
              </div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}