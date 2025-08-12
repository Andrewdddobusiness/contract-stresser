'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Layers,
  Info
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { 
  BlockType, 
  BLOCK_CATEGORIES, 
  getBlockDefinition 
} from '@/services/flowDesigner/blockTypes'

interface BlockPaletteProps {
  onDragStart: (event: React.DragEvent<HTMLDivElement>, blockType: BlockType) => void
  className?: string
}

interface BlockPaletteItemProps {
  blockType: BlockType
  onDragStart: (event: React.DragEvent<HTMLDivElement>, blockType: BlockType) => void
  searchTerm?: string
}

function BlockPaletteItem({ blockType, onDragStart, searchTerm }: BlockPaletteItemProps) {
  const blockDef = getBlockDefinition(blockType)
  const IconComponent = blockDef.icon

  // Highlight search matches
  const highlightText = (text: string, search: string) => {
    if (!search) return text
    
    const index = text.toLowerCase().indexOf(search.toLowerCase())
    if (index === -1) return text
    
    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-yellow-200 dark:bg-yellow-800">
          {text.slice(index, index + search.length)}
        </mark>
        {text.slice(index + search.length)}
      </>
    )
  }

  const isSearchMatch = !searchTerm || 
    blockDef.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blockDef.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blockDef.category.toLowerCase().includes(searchTerm.toLowerCase())

  if (!isSearchMatch) return null

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, blockType)}
      className={cn(
        "palette-item group cursor-grab active:cursor-grabbing",
        "p-3 border rounded-lg transition-all duration-200",
        "hover:bg-accent hover:shadow-md hover:border-primary/50",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
      )}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // Could trigger a different action for keyboard users
        }
      }}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 p-2 rounded-md bg-background border group-hover:border-primary/30">
          <IconComponent className="w-4 h-4 text-foreground" />
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="text-sm font-medium truncate">
            {highlightText(blockDef.name, searchTerm || '')}
          </h4>
          
          <p className="text-xs text-muted-foreground line-clamp-2">
            {highlightText(blockDef.description, searchTerm || '')}
          </p>
          
          {blockDef.examples && blockDef.examples.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                {blockDef.examples[0]}
              </Badge>
              {blockDef.examples.length > 1 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  +{blockDef.examples.length - 1}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CategorySection({ 
  category, 
  searchTerm, 
  onDragStart 
}: { 
  category: typeof BLOCK_CATEGORIES[0]
  searchTerm: string
  onDragStart: (event: React.DragEvent<HTMLDivElement>, blockType: BlockType) => void 
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  // Filter blocks based on search
  const filteredBlocks = category.blocks.filter(blockType => {
    if (!searchTerm) return true
    
    const blockDef = getBlockDefinition(blockType)
    return (
      blockDef.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blockDef.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blockDef.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  if (searchTerm && filteredBlocks.length === 0) {
    return null
  }

  return (
    <div className="category-section">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 text-sm font-medium text-left hover:bg-accent rounded-md"
      >
        <div className="flex items-center space-x-2">
          <Layers className="w-3 h-3" />
          <span>{category.name}</span>
          <Badge variant="secondary" className="text-xs">
            {searchTerm ? filteredBlocks.length : category.blocks.length}
          </Badge>
        </div>
        <div className={cn(
          "transition-transform duration-200",
          isExpanded ? "rotate-90" : ""
        )}>
          ▶
        </div>
      </button>
      
      {isExpanded && (
        <div className="mt-2 space-y-2 pl-1">
          <p className="text-xs text-muted-foreground px-2">
            {category.description}
          </p>
          
          <div className="space-y-1">
            {filteredBlocks.map(blockType => (
              <BlockPaletteItem
                key={blockType}
                blockType={blockType}
                onDragStart={onDragStart}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function BlockPalette({ onDragStart, className }: BlockPaletteProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Calculate total blocks and filtered count
  const totalBlocks = BLOCK_CATEGORIES.reduce((sum, cat) => sum + cat.blocks.length, 0)
  const filteredCount = searchTerm 
    ? BLOCK_CATEGORIES.reduce((sum, cat) => {
        return sum + cat.blocks.filter(blockType => {
          const blockDef = getBlockDefinition(blockType)
          return (
            blockDef.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            blockDef.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            blockDef.category.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }).length
      }, 0)
    : totalBlocks

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center space-x-2">
          <Layers className="w-4 h-4" />
          <span>Components</span>
          <Badge variant="outline" className="text-xs">
            {searchTerm ? `${filteredCount}/${totalBlocks}` : totalBlocks}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-3">
            {BLOCK_CATEGORIES.map((category, index) => (
              <div key={category.name}>
                <CategorySection
                  category={category}
                  searchTerm={searchTerm}
                  onDragStart={onDragStart}
                />
                {index < BLOCK_CATEGORIES.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* No Results */}
        {searchTerm && filteredCount === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No components found</p>
            <p className="text-xs">Try a different search term</p>
          </div>
        )}

        {/* Usage Hint */}
        {!searchTerm && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">How to use:</p>
                <ul className="space-y-1">
                  <li>• Drag blocks to the canvas</li>
                  <li>• Connect blocks with arrows</li>
                  <li>• Configure each block's settings</li>
                  <li>• Test with simulation mode</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}