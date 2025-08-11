'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Copy, Download, Upload, Plus, Edit, Trash2, Search, Star, Filter } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { testTemplatesService, TestTemplate, TemplateCategory } from '@/services/testing/templates'
import { TestConfiguration } from '@/types/testing'
import { Address } from 'viem'
import { toast } from 'react-hot-toast'

interface TestTemplatesProps {
  contractAddress?: Address
  onTemplateSelect?: (configuration: TestConfiguration) => void
  onTemplateApply?: (template: TestTemplate) => void
}

export function TestTemplates({ contractAddress, onTemplateSelect, onTemplateApply }: TestTemplatesProps) {
  const [templates, setTemplates] = useState<TestTemplate[]>([])
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<TestTemplate | null>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importData, setImportData] = useState('')

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = () => {
    setTemplates(testTemplatesService.getAllTemplates())
    setCategories(testTemplatesService.getCategories())
  }

  // Filter templates based on search and filters
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesCategory && matchesDifficulty && matchesSearch
  })

  const handleApplyTemplate = (template: TestTemplate) => {
    if (!contractAddress) {
      toast.error('Please select a contract address first')
      return
    }

    const configuration = testTemplatesService.createConfigurationFromTemplate(template.id, contractAddress)
    if (configuration) {
      onTemplateSelect?.(configuration)
      onTemplateApply?.(template)
      toast.success(`Applied template: ${template.name}`)
    }
  }

  const handleCloneTemplate = (template: TestTemplate) => {
    testTemplatesService.cloneTemplate(template.id)
    refreshData()
  }

  const handleDeleteTemplate = (template: TestTemplate) => {
    if (testTemplatesService.deleteTemplate(template.id)) {
      refreshData()
    }
  }

  const handleExportTemplate = (template: TestTemplate) => {
    const exportData = testTemplatesService.exportTemplate(template.id)
    if (exportData) {
      // Create download link
      const blob = new Blob([exportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.name.replace(/\s+/g, '_')}_template.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`Template exported: ${template.name}`)
    }
  }

  const handleImportTemplate = () => {
    if (!importData.trim()) return

    const imported = testTemplatesService.importTemplate(importData)
    if (imported) {
      refreshData()
      setIsImportDialogOpen(false)
      setImportData('')
    }
  }

  const getDifficultyColor = (difficulty: TestTemplate['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'hard': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'extreme': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryColor = (category: TestTemplate['category']) => {
    switch (category) {
      case 'basic': return 'bg-blue-100 text-blue-800'
      case 'performance': return 'bg-purple-100 text-purple-800'
      case 'advanced': return 'bg-indigo-100 text-indigo-800'
      case 'stress': return 'bg-red-100 text-red-800'
      case 'custom': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const builtInTemplates = templates.filter(t => t.isBuiltIn)
  const customTemplates = templates.filter(t => !t.isBuiltIn)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Test Templates
              </CardTitle>
              <CardDescription>
                Pre-configured test scenarios and custom templates
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Template</DialogTitle>
                    <DialogDescription>
                      Paste the template JSON data to import
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <textarea
                      className="w-full h-64 p-3 border rounded-md text-sm font-mono"
                      placeholder="Paste template JSON here..."
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleImportTemplate} disabled={!importData.trim()}>
                        Import Template
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        {/* Filters */}
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.name} ({cat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="All difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="extreme">Extreme</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedCategory('all')
                setSelectedDifficulty('all')
                setSearchTerm('')
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Templates ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="builtin">Built-in ({builtInTemplates.length})</TabsTrigger>
          <TabsTrigger value="custom">Custom ({customTemplates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TemplateGrid 
            templates={filteredTemplates}
            contractAddress={contractAddress}
            onApply={handleApplyTemplate}
            onClone={handleCloneTemplate}
            onDelete={handleDeleteTemplate}
            onExport={handleExportTemplate}
            getDifficultyColor={getDifficultyColor}
            getCategoryColor={getCategoryColor}
          />
        </TabsContent>

        <TabsContent value="builtin" className="space-y-4">
          <Alert>
            <Star className="h-4 w-4" />
            <AlertDescription>
              Built-in templates are professionally designed test scenarios. You can clone them to create custom versions.
            </AlertDescription>
          </Alert>
          <TemplateGrid 
            templates={builtInTemplates.filter(t => {
              const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory
              const matchesDifficulty = selectedDifficulty === 'all' || t.difficulty === selectedDifficulty
              const matchesSearch = !searchTerm || 
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
              return matchesCategory && matchesDifficulty && matchesSearch
            })}
            contractAddress={contractAddress}
            onApply={handleApplyTemplate}
            onClone={handleCloneTemplate}
            onDelete={handleDeleteTemplate}
            onExport={handleExportTemplate}
            getDifficultyColor={getDifficultyColor}
            getCategoryColor={getCategoryColor}
          />
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Alert>
            <Plus className="h-4 w-4" />
            <AlertDescription>
              Create custom templates by cloning built-in templates or importing from JSON files.
            </AlertDescription>
          </Alert>
          <TemplateGrid 
            templates={customTemplates.filter(t => {
              const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory
              const matchesDifficulty = selectedDifficulty === 'all' || t.difficulty === selectedDifficulty
              const matchesSearch = !searchTerm || 
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
              return matchesCategory && matchesDifficulty && matchesSearch
            })}
            contractAddress={contractAddress}
            onApply={handleApplyTemplate}
            onClone={handleCloneTemplate}
            onDelete={handleDeleteTemplate}
            onExport={handleExportTemplate}
            getDifficultyColor={getDifficultyColor}
            getCategoryColor={getCategoryColor}
          />
        </TabsContent>
      </Tabs>

      {filteredTemplates.length === 0 && searchTerm && (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No templates found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface TemplateGridProps {
  templates: TestTemplate[]
  contractAddress?: Address
  onApply: (template: TestTemplate) => void
  onClone: (template: TestTemplate) => void
  onDelete: (template: TestTemplate) => void
  onExport: (template: TestTemplate) => void
  getDifficultyColor: (difficulty: TestTemplate['difficulty']) => string
  getCategoryColor: (category: TestTemplate['category']) => string
}

function TemplateGrid({
  templates,
  contractAddress,
  onApply,
  onClone,
  onDelete,
  onExport,
  getDifficultyColor,
  getCategoryColor
}: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No templates available</h3>
        <p className="text-muted-foreground">
          No templates match the current filters.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map(template => (
        <Card key={template.id} className="h-full hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between mb-2">
              <CardTitle className="text-lg line-clamp-1">{template.name}</CardTitle>
              {template.isBuiltIn && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Star className="w-3 h-3 mr-1" />
                  Built-in
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getCategoryColor(template.category)}>
                {template.category}
              </Badge>
              <Badge variant="outline" className={getDifficultyColor(template.difficulty)}>
                {template.difficulty}
              </Badge>
            </div>
            
            <CardDescription className="text-sm line-clamp-2">
              {template.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-0 space-y-3">
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
            
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Duration: {template.estimatedDuration}</div>
              <div>Accounts: {template.resources.minAccounts}+</div>
              <div>Est. Cost: {template.resources.estimatedGasCost}</div>
              <div>Iterations: {template.configuration.iterations}</div>
            </div>
            
            <div className="flex gap-1 pt-2">
              <Button
                size="sm"
                onClick={() => onApply(template)}
                disabled={!contractAddress}
                className="flex-1"
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onClone(template)}
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onExport(template)}
              >
                <Download className="w-3 h-3" />
              </Button>
              {!template.isBuiltIn && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(template)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}