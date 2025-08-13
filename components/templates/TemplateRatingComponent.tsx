'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  User,
  Calendar,
  MoreHorizontal,
  Flag
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { FlowTemplate, Rating, flowTemplateService } from '@/services/templates/templateEngine'
import { Address } from 'viem'

interface TemplateRatingComponentProps {
  template: FlowTemplate
  userAddress?: Address
  className?: string
}

interface RatingDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (rating: number, comment: string) => Promise<void>
  existingRating?: Rating
}

interface StarRatingInputProps {
  value: number
  onChange: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
}

function StarRatingInput({ value, onChange, size = 'md', readonly = false }: StarRatingInputProps) {
  const [hover, setHover] = useState(0)
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={cn(
            "transition-colors",
            !readonly && "hover:scale-105 cursor-pointer",
            readonly && "cursor-default"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              (hover >= star || value >= star)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  )
}

function RatingDialog({ isOpen, onClose, onSubmit, existingRating }: RatingDialogProps) {
  const [rating, setRating] = useState(existingRating?.score || 0)
  const [comment, setComment] = useState(existingRating?.comment || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(rating, comment)
      onClose()
    } catch (error) {
      console.error('Failed to submit rating:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingRating ? 'Update Your Rating' : 'Rate This Template'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Rating</label>
            <div className="flex items-center space-x-2">
              <StarRatingInput value={rating} onChange={setRating} size="lg" />
              <span className="text-sm text-muted-foreground ml-2">
                {rating > 0 && `${rating} out of 5 stars`}
              </span>
            </div>
          </div>
          
          <div>
            <label htmlFor="comment" className="text-sm font-medium mb-2 block">
              Comment (Optional)
            </label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this template..."
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {comment.length}/500 characters
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : existingRating ? 'Update' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface RatingCardProps {
  rating: Rating
  isOwnRating?: boolean
  onUpdate?: () => void
  onReport?: () => void
}

function RatingCard({ rating, isOwnRating, onUpdate, onReport }: RatingCardProps) {
  const [showActions, setShowActions] = useState(false)
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">
                  {`${rating.userId.slice(0, 6)}...${rating.userId.slice(-4)}`}
                </span>
                {isOwnRating && <Badge variant="secondary" className="text-xs">You</Badge>}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <StarRatingInput value={rating.score} onChange={() => {}} readonly size="sm" />
                <span className="text-xs text-muted-foreground">
                  {rating.timestamp.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            
            {showActions && (
              <div className="absolute right-0 top-8 bg-white border rounded-md shadow-lg py-1 z-10 min-w-[120px]">
                {isOwnRating ? (
                  <button
                    onClick={() => {
                      onUpdate?.()
                      setShowActions(false)
                    }}
                    className="w-full text-left px-3 py-1 text-sm hover:bg-muted"
                  >
                    Edit Rating
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onReport?.()
                      setShowActions(false)
                    }}
                    className="w-full text-left px-3 py-1 text-sm hover:bg-muted flex items-center space-x-2"
                  >
                    <Flag className="w-3 h-3" />
                    <span>Report</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      {rating.comment && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{rating.comment}</p>
        </CardContent>
      )}
    </Card>
  )
}

export function TemplateRatingComponent({ 
  template, 
  userAddress, 
  className 
}: TemplateRatingComponentProps) {
  const [showRatingDialog, setShowRatingDialog] = useState(false)
  const [ratings, setRatings] = useState(template.usage.ratings)
  
  const userRating = userAddress 
    ? ratings.find(r => r.userId.toLowerCase() === userAddress.toLowerCase())
    : undefined
  
  const ratingBreakdown = [5, 4, 3, 2, 1].map(star => {
    const count = ratings.filter(r => r.score === star).length
    const percentage = ratings.length > 0 ? (count / ratings.length) * 100 : 0
    return { star, count, percentage }
  })
  
  const handleRatingSubmit = async (rating: number, comment: string) => {
    if (!userAddress) return
    
    try {
      await flowTemplateService.rateTemplate(template.id, userAddress, rating, comment)
      
      // Update local state
      const newRating: Rating = {
        userId: userAddress,
        score: rating,
        comment,
        timestamp: new Date()
      }
      
      const updatedRatings = userRating 
        ? ratings.map(r => r.userId === userAddress ? newRating : r)
        : [...ratings, newRating]
      
      setRatings(updatedRatings)
    } catch (error) {
      console.error('Failed to submit rating:', error)
    }
  }
  
  return (
    <div className={className}>
      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="w-5 h-5" />
            <span>Ratings & Reviews</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{template.usage.averageRating.toFixed(1)}</div>
              <StarRatingInput 
                value={Math.round(template.usage.averageRating)} 
                onChange={() => {}} 
                readonly 
              />
              <div className="text-sm text-muted-foreground mt-1">
                {ratings.length} {ratings.length === 1 ? 'review' : 'reviews'}
              </div>
            </div>
            
            <div className="flex-1 space-y-2">
              {ratingBreakdown.map(({ star, count, percentage }) => (
                <div key={star} className="flex items-center space-x-2 text-sm">
                  <span className="w-8">{star}★</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          {userAddress && (
            <div className="pt-4 border-t">
              <Button 
                onClick={() => setShowRatingDialog(true)}
                variant={userRating ? "outline" : "default"}
                size="sm"
              >
                <Star className="w-4 h-4 mr-2" />
                {userRating ? 'Update Your Rating' : 'Write a Review'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Individual Ratings */}
      {ratings.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Reviews</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {ratings
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .map(rating => (
                    <RatingCard
                      key={rating.userId}
                      rating={rating}
                      isOwnRating={userAddress?.toLowerCase() === rating.userId.toLowerCase()}
                      onUpdate={() => setShowRatingDialog(true)}
                      onReport={() => {
                        // Handle report functionality
                        console.log('Report rating:', rating.userId)
                      }}
                    />
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      <RatingDialog
        isOpen={showRatingDialog}
        onClose={() => setShowRatingDialog(false)}
        onSubmit={handleRatingSubmit}
        existingRating={userRating}
      />
    </div>
  )
}