'use client'

import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Wand2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Info, 
  Tag, 
  FileCode,
  Settings,
  Eye,
  AlertTriangle,
  Plus,
  X
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { 
  FlowTemplate, 
  TemplateCategory, 
  TemplateParameter,
  flowTemplateService 
} from '@/services/templates/templateEngine'
import { Flow } from '@/services/flowDesigner/flowBuilder'

interface TemplateCreationWizardProps {
  flow: Flow
  isOpen: boolean
  onClose: () => void
  onTemplateCreated?: (template: FlowTemplate) => void
}

interface WizardStep {
  id: string
  title: string
  description: string
  component: React.ComponentType<StepProps>
}

interface StepProps {
  data: TemplateData
  onDataChange: (data: Partial<TemplateData>) => void
  onNext: () => void
  onPrev?: () => void
  isValid: boolean
}

interface TemplateData {
  name: string
  description: string
  category: TemplateCategory
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  tags: string[]
  parameters: TemplateParameter[]
  visibility: 'public' | 'private'
  license?: string
  documentation?: string
}

// Step 1: Basic Information
function BasicInfoStep({ data, onDataChange, onNext, isValid }: StepProps) {
  const [newTag, setNewTag] = useState('')

  const addTag = () => {
    if (newTag && !data.tags.includes(newTag)) {
      onDataChange({ tags: [...data.tags, newTag] })
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    onDataChange({ tags: data.tags.filter(t => t !== tag) })
  }

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="name">Template Name *</Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => onDataChange({ name: e.target.value })}
          placeholder="Enter a descriptive name for your template"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => onDataChange({ description: e.target.value })}
          placeholder="Describe what this template does and when to use it"
          rows={3}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category *</Label>
          <Select 
            value={data.category} 
            onValueChange={(value: TemplateCategory) => onDataChange({ category: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DeFi">DeFi</SelectItem>
              <SelectItem value="NFT">NFT</SelectItem>
              <SelectItem value="Governance">Governance</SelectItem>
              <SelectItem value="Gaming">Gaming</SelectItem>
              <SelectItem value="Utility">Utility</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="difficulty">Difficulty *</Label>
          <Select 
            value={data.difficulty} 
            onValueChange={(value: any) => onDataChange({ difficulty: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Tags</Label>
        <div className="flex items-center space-x-2 mt-1">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tags (press Enter)"
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            className="flex-1"
          />
          <Button type="button" onClick={addTag} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {data.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                <Tag className="w-3 h-3" />
                <span>{tag}</span>
                <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!isValid}>
          Next Step
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

// Step 2: Parameters Configuration
function ParametersStep({ data, onDataChange, onNext, onPrev, isValid }: StepProps) {
  const [newParam, setNewParam] = useState<Partial<TemplateParameter>>({
    name: '',
    type: 'string',
    description: '',
    required: true,
    validation: {}
  })

  const addParameter = () => {
    if (newParam.name && newParam.description) {
      onDataChange({
        parameters: [...data.parameters, newParam as TemplateParameter]
      })
      setNewParam({
        name: '',
        type: 'string',
        description: '',
        required: true,
        validation: {}
      })
    }
  }

  const removeParameter = (index: number) => {
    onDataChange({
      parameters: data.parameters.filter((_, i) => i !== index)
    })
  }

  const updateParameter = (index: number, updates: Partial<TemplateParameter>) => {
    const updatedParams = [...data.parameters]
    updatedParams[index] = { ...updatedParams[index], ...updates }
    onDataChange({ parameters: updatedParams })
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Define parameters that users can customize when applying this template. 
          Parameters are placeholders in your flow that will be replaced with user values.
        </AlertDescription>
      </Alert>

      {/* Existing Parameters */}
      {data.parameters.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Defined Parameters</h4>
          {data.parameters.map((param, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{param.type}</Badge>
                    <span className="font-medium">{param.name}</span>
                    {param.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{param.description}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeParameter(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Parameter */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Add New Parameter</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Parameter Name</Label>
            <Input
              value={newParam.name || ''}
              onChange={(e) => setNewParam({ ...newParam, name: e.target.value })}
              placeholder="e.g., tokenAddress"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select 
              value={newParam.type} 
              onValueChange={(value: any) => setNewParam({ ...newParam, type: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="address">Address</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="token">Token</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mt-4">
          <Label>Description</Label>
          <Textarea
            value={newParam.description || ''}
            onChange={(e) => setNewParam({ ...newParam, description: e.target.value })}
            placeholder="Describe what this parameter is used for"
            rows={2}
            className="mt-1"
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="required"
              checked={newParam.required || false}
              onChange={(e) => setNewParam({ ...newParam, required: e.target.checked })}
            />
            <Label htmlFor="required" className="text-sm">Required parameter</Label>
          </div>
          
          <Button 
            onClick={addParameter} 
            size="sm"
            disabled={!newParam.name || !newParam.description}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Parameter
          </Button>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button onClick={onNext}>
          Next Step
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

// Step 3: Publishing Settings
function PublishingStep({ data, onDataChange, onNext, onPrev, isValid }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="visibility">Visibility</Label>
        <Select 
          value={data.visibility} 
          onValueChange={(value: any) => onDataChange({ visibility: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public - Anyone can use</SelectItem>
            <SelectItem value="private">Private - Only you can use</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="license">License (Optional)</Label>
        <Select 
          value={data.license || 'MIT'} 
          onValueChange={(value) => onDataChange({ license: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select license" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MIT">MIT</SelectItem>
            <SelectItem value="Apache-2.0">Apache 2.0</SelectItem>
            <SelectItem value="GPL-3.0">GPL 3.0</SelectItem>
            <SelectItem value="BSD-3-Clause">BSD 3-Clause</SelectItem>
            <SelectItem value="Custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="documentation">Documentation URL (Optional)</Label>
        <Input
          id="documentation"
          type="url"
          value={data.documentation || ''}
          onChange={(e) => onDataChange({ documentation: e.target.value })}
          placeholder="https://docs.example.com/template-guide"
          className="mt-1"
        />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          Create Template
          <CheckCircle className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

export function TemplateCreationWizard({ 
  flow, 
  isOpen, 
  onClose, 
  onTemplateCreated 
}: TemplateCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [data, setData] = useState<TemplateData>({
    name: flow.name || '',
    description: flow.description || '',
    category: 'Utility',
    difficulty: 'intermediate',
    tags: [],
    parameters: [],
    visibility: 'public',
    license: 'MIT'
  })

  const steps: WizardStep[] = [
    {
      id: 'basic',
      title: 'Basic Information',
      description: 'Template name, description, and categorization',
      component: BasicInfoStep
    },
    {
      id: 'parameters',
      title: 'Parameters',
      description: 'Configure template parameters for customization',
      component: ParametersStep
    },
    {
      id: 'publishing',
      title: 'Publishing',
      description: 'Set visibility and licensing options',
      component: PublishingStep
    }
  ]

  const handleDataChange = useCallback((updates: Partial<TemplateData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }, [])

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleCreateTemplate()
    }
  }, [currentStep, steps.length])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handleCreateTemplate = async () => {
    setIsCreating(true)
    
    try {
      const template = await flowTemplateService.createTemplate(flow, {
        name: data.name,
        description: data.description,
        category: data.category,
        difficulty: data.difficulty,
        tags: data.tags,
        visibility: data.visibility,
        metadata: {
          license: data.license,
          documentation: data.documentation
        },
        // Add template-specific configurations
        parameters: data.parameters
      })

      onTemplateCreated?.(template)
      onClose()
    } catch (error) {
      console.error('Failed to create template:', error)
      // Handle error - show toast or error message
    } finally {
      setIsCreating(false)
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return data.name.trim() !== '' && 
               data.description.trim() !== '' && 
               data.category !== '' as any
      case 1:
        return true // Parameters are optional
      case 2:
        return true // All publishing fields are optional or have defaults
      default:
        return false
    }
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  const StepComponent = steps[currentStep].component

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wand2 className="w-5 h-5" />
            <span>Create Template from Flow</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Header */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">{steps[currentStep].title}</h3>
            <p className="text-muted-foreground">{steps[currentStep].description}</p>
          </div>

          {/* Step Content */}
          <Card className="p-6">
            <StepComponent
              data={data}
              onDataChange={handleDataChange}
              onNext={handleNext}
              onPrev={currentStep > 0 ? handlePrev : undefined}
              isValid={isStepValid()}
            />
          </Card>

          {/* Step Navigation Dots */}
          <div className="flex justify-center space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-3 h-3 rounded-full transition-colors",
                  index <= currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {isCreating && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Creating template...</span>
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}