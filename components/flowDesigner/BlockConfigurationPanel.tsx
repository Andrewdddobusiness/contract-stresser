'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Copy,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { 
  FlowBlock, 
  ValidationResult 
} from '@/services/flowDesigner/flowBuilder'
import { 
  getBlockDefinition, 
  ConfigFieldDefinition,
  validateBlockConfig
} from '@/services/flowDesigner/blockTypes'

interface BlockConfigurationPanelProps {
  block: FlowBlock
  onChange: (blockId: string, field: string, value: any) => void
  onDelete?: (blockId: string) => void
  onDuplicate?: (blockId: string) => void
  className?: string
}

interface ConfigFieldProps {
  field: ConfigFieldDefinition
  value: any
  config: any
  onChange: (value: any) => void
  error?: string
}

function ConfigField({ field, value, config, onChange, error }: ConfigFieldProps) {
  const [isFocused, setIsFocused] = useState(false)

  // Check if field should be shown based on conditions
  if (field.showWhen && !field.showWhen(config)) {
    return null
  }

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'address':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn(error && "border-red-500")}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            placeholder={field.placeholder}
            className={cn(error && "border-red-500")}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        )

      case 'bigint':
        return (
          <Input
            type="text"
            value={value?.toString() || ''}
            onChange={(e) => {
              try {
                onChange(BigInt(e.target.value || '0'))
              } catch {
                onChange(BigInt(0))
              }
            }}
            placeholder={field.placeholder}
            className={cn(error && "border-red-500")}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value || false}
              onCheckedChange={onChange}
            />
            <span className="text-sm text-muted-foreground">
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        )

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className={cn(error && "border-red-500")}>
              <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn(error && "border-red-500", "min-h-[100px]")}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        )

      case 'multiselect':
        // Simple implementation - would need a proper multiselect component
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Switch
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const currentValues = Array.isArray(value) ? value : []
                    if (checked) {
                      onChange([...currentValues, option.value])
                    } else {
                      onChange(currentValues.filter((v: any) => v !== option.value))
                    }
                  }}
                />
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
          </div>
        )

      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn(error && "border-red-500")}
          />
        )
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={field.name} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        
        {field.type === 'address' && value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigator.clipboard.writeText(value)}
            className="h-6 px-2"
          >
            <Copy className="w-3 h-3" />
          </Button>
        )}
      </div>

      {renderField()}

      {/* Field Description */}
      {field.description && (
        <p className="text-xs text-muted-foreground">
          {field.description}
        </p>
      )}

      {/* Field Error */}
      {error && (
        <p className="text-xs text-red-500 flex items-center space-x-1">
          <AlertTriangle className="w-3 h-3" />
          <span>{error}</span>
        </p>
      )}

      {/* Field Help for focused inputs */}
      {isFocused && field.type === 'bigint' && (
        <p className="text-xs text-blue-500">
          Enter value in wei (e.g., 1000000000000000000 = 1 ETH)
        </p>
      )}

      {isFocused && field.type === 'address' && (
        <p className="text-xs text-blue-500">
          Enter a valid Ethereum address (0x...)
        </p>
      )}

      {isFocused && field.type === 'textarea' && field.placeholder?.includes('JSON') && (
        <p className="text-xs text-blue-500">
          Enter valid JSON format
        </p>
      )}
    </div>
  )
}

export function BlockConfigurationPanel({ 
  block, 
  onChange, 
  onDelete, 
  onDuplicate,
  className 
}: BlockConfigurationPanelProps) {
  const blockDef = getBlockDefinition(block.type)
  const IconComponent = blockDef.icon

  // Validate current configuration
  const validation = validateBlockConfig(block.type, block.config)
  const fieldErrors = new Map<string, string>()
  
  validation.errors.forEach(error => {
    if (error.field) {
      fieldErrors.set(error.field, error.message)
    }
  })

  const handleFieldChange = (fieldName: string, value: any) => {
    onChange(block.id, fieldName, value)
  }

  const handleNameChange = (newName: string) => {
    onChange(block.id, 'name', newName)
  }

  const handleDescriptionChange = (newDescription: string) => {
    onChange(block.id, 'description', newDescription)
  }

  const resetToDefaults = () => {
    Object.entries(blockDef.defaultConfig).forEach(([key, value]) => {
      onChange(block.id, key, value)
    })
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center space-x-2">
            <IconComponent className="w-4 h-4" />
            <span>{blockDef.name}</span>
          </CardTitle>
          
          <div className="flex items-center space-x-1">
            {validation.isValid ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            
            <Badge variant={validation.isValid ? "default" : "destructive"} className="text-xs">
              {validation.isValid ? 'Valid' : 'Invalid'}
            </Badge>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {blockDef.description}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-3">
            {/* Block Identity */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <Settings className="w-3 h-3" />
                <span>Block Settings</span>
              </h4>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="block-name" className="text-sm font-medium">
                    Block Name
                  </Label>
                  <Input
                    id="block-name"
                    value={block.name || ''}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={blockDef.name}
                  />
                </div>
                
                <div>
                  <Label htmlFor="block-description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="block-description"
                    value={block.description || ''}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="Optional description for this block"
                    className="min-h-[60px]"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Configuration Fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Configuration</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetToDefaults}
                  className="h-6 px-2"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>
              
              <div className="space-y-4">
                {blockDef.configSchema.map(field => (
                  <ConfigField
                    key={field.name}
                    field={field}
                    value={block.config[field.name]}
                    config={block.config}
                    onChange={(value) => handleFieldChange(field.name, value)}
                    error={fieldErrors.get(field.name)}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Validation Results */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Validation</h4>
              
              {validation.errors.length > 0 && (
                <div className="space-y-2">
                  {validation.errors.map((error, index) => (
                    <Alert key={index} variant="destructive" className="py-2">
                      <AlertTriangle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        {error.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="space-y-2">
                  {validation.warnings.map((warning, index) => (
                    <Alert key={index} className="py-2 border-yellow-300 bg-yellow-50">
                      <Info className="h-3 w-3 text-yellow-600" />
                      <AlertDescription className="text-xs text-yellow-700">
                        {warning.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {validation.isValid && (
                <Alert className="py-2 border-green-300 bg-green-50">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <AlertDescription className="text-xs text-green-700">
                    Block configuration is valid and ready for execution.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Examples */}
            {blockDef.examples && blockDef.examples.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Examples</h4>
                  <div className="space-y-1">
                    {blockDef.examples.map((example, index) => (
                      <div key={index} className="text-xs text-muted-foreground bg-muted rounded p-2">
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="pt-3 border-t">
          <div className="flex justify-between space-x-2">
            <div className="flex space-x-2">
              {onDuplicate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDuplicate(block.id)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              )}
            </div>
            
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(block.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}