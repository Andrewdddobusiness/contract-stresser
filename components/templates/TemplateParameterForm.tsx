'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Copy, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Zap,
  Shield,
  DollarSign,
  Hash,
  Type,
  ToggleLeft,
  MapPin,
  HelpCircle,
  Wallet
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { 
  FlowTemplate, 
  TemplateParameter, 
  TemplateValidationResult,
  flowTemplateService 
} from '@/services/templates/templateEngine'
import { formatEther, parseEther, isAddress } from 'viem'

interface TemplateParameterFormProps {
  template: FlowTemplate
  onApply: (template: FlowTemplate, parameters: Record<string, any>) => void
  onCancel?: () => void
  initialParameters?: Record<string, any>
  className?: string
}

interface ParameterFieldProps {
  parameter: TemplateParameter
  value: any
  onChange: (value: any) => void
  error?: string
  showHelp?: boolean
  disabled?: boolean
}

function getParameterIcon(type: TemplateParameter['type']) {
  switch (type) {
    case 'address': return MapPin
    case 'amount': return DollarSign
    case 'token': return Wallet
    case 'number': return Hash
    case 'string': return Type
    case 'boolean': return ToggleLeft
    default: return Type
  }
}

function ParameterField({ 
  parameter, 
  value, 
  onChange, 
  error, 
  showHelp = false,
  disabled = false 
}: ParameterFieldProps) {
  const [showValue, setShowValue] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  
  const Icon = getParameterIcon(parameter.type)

  const handleValueChange = (newValue: any) => {
    setIsValidating(true)
    onChange(newValue)
    // Simulate validation delay
    setTimeout(() => setIsValidating(false), 300)
  }

  const formatAddressDisplay = (address: string) => {
    if (!address || !isAddress(address)) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const renderInputField = () => {
    switch (parameter.type) {
      case 'address':
      case 'token':
        return (
          <div className="relative">
            <Input
              type="text"
              value={value || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={parameter.defaultValue || '0x...'}
              className={cn(
                "font-mono",
                error && "border-red-500",
                isValidating && "border-yellow-500"
              )}
              disabled={disabled}
            />
            {value && isAddress(value) && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(value)}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )

      case 'amount':
        return (
          <div className="space-y-2">
            <div className="relative">
              <Input
                type="text"
                value={value || ''}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder="1.0"
                className={cn(
                  error && "border-red-500",
                  isValidating && "border-yellow-500"
                )}
                disabled={disabled}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                ETH
              </div>
            </div>
            
            {value && !isNaN(Number(value)) && (
              <div className="text-xs text-muted-foreground">
                = {parseEther(value.toString()).toString()} wei
              </div>
            )}

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-1">
              {['0.01', '0.1', '1.0', '10.0'].map(amount => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => handleValueChange(amount)}
                  className="h-6 text-xs px-2"
                  disabled={disabled}
                >
                  {amount} ETH
                </Button>
              ))}
            </div>
          </div>
        )

      case 'number':
        return (
          <div className="space-y-2">
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => handleValueChange(Number(e.target.value) || 0)}
              placeholder={parameter.defaultValue?.toString() || '0'}
              min={parameter.validation.min}
              max={parameter.validation.max}
              className={cn(
                error && "border-red-500",
                isValidating && "border-yellow-500"
              )}
              disabled={disabled}
            />
            
            {(parameter.validation.min !== undefined || parameter.validation.max !== undefined) && (
              <div className="text-xs text-muted-foreground">
                Range: {parameter.validation.min ?? '∞'} - {parameter.validation.max ?? '∞'}
              </div>
            )}
          </div>
        )

      case 'string':
        return parameter.description.toLowerCase().includes('json') || 
               parameter.description.toLowerCase().includes('config') ? (
          <Textarea
            value={value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={parameter.defaultValue || parameter.description}
            className={cn(
              "font-mono text-sm min-h-[100px]",
              error && "border-red-500",
              isValidating && "border-yellow-500"
            )}
            disabled={disabled}
          />
        ) : (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={parameter.defaultValue || parameter.description}
            className={cn(
              error && "border-red-500",
              isValidating && "border-yellow-500"
            )}
            disabled={disabled}
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-3">
            <Switch
              checked={value || false}
              onCheckedChange={handleValueChange}
              disabled={disabled}
            />
            <span className={cn(
              "text-sm",
              value ? "text-green-700 font-medium" : "text-muted-foreground"
            )}>
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        )

      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={parameter.defaultValue}
            className={cn(
              error && "border-red-500",
              isValidating && "border-yellow-500"
            )}
            disabled={disabled}
          />
        )
    }
  }

  return (
    <div className="space-y-3">
      {/* Parameter Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2 flex-1">
          <Icon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Label htmlFor={parameter.name} className="text-sm font-medium flex items-center space-x-1">
              <span>{parameter.name}</span>
              {parameter.required && (
                <Badge variant="destructive" className="text-xs px-1">
                  Required
                </Badge>
              )}
              {parameter.type === 'address' && value && isAddress(value) && (
                <Badge variant="outline" className="text-xs px-1">
                  Valid Address
                </Badge>
              )}
            </Label>
            
            <p className="text-xs text-muted-foreground mt-1">
              {parameter.description}
            </p>
          </div>
        </div>

        {/* Help Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowValue(!showValue)}
          className="h-6 w-6 p-0 flex-shrink-0"
        >
          {showHelp ? <EyeOff className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />}
        </Button>
      </div>

      {/* Input Field */}
      <div>
        {renderInputField()}
      </div>

      {/* Parameter Info */}
      {showHelp && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-medium">Type:</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {parameter.type}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Required:</span>
              <span className={cn(
                "ml-2",
                parameter.required ? "text-red-600" : "text-green-600"
              )}>
                {parameter.required ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          
          {parameter.defaultValue && (
            <div className="text-xs">
              <span className="font-medium">Default:</span>
              <code className="ml-2 bg-background px-1 rounded">
                {typeof parameter.defaultValue === 'object' 
                  ? JSON.stringify(parameter.defaultValue)
                  : String(parameter.defaultValue)}
              </code>
            </div>
          )}
          
          {parameter.group && (
            <div className="text-xs">
              <span className="font-medium">Group:</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {parameter.group}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Validation Indicator */}
      {isValidating && (
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Validating...</span>
        </div>
      )}
    </div>
  )
}

export function TemplateParameterForm({ 
  template, 
  onApply, 
  onCancel,
  initialParameters = {},
  className 
}: TemplateParameterFormProps) {
  const [parameters, setParameters] = useState<Record<string, any>>(initialParameters)
  const [validation, setValidation] = useState<TemplateValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Group parameters
  const parameterGroups = template.parameters.reduce((groups, param) => {
    const group = param.group || 'basic'
    if (!groups[group]) groups[group] = []
    groups[group].push(param)
    return groups
  }, {} as Record<string, TemplateParameter[]>)

  const groupNames = Object.keys(parameterGroups)
  const isStepForm = groupNames.length > 1

  useEffect(() => {
    // Set default values
    const defaults: Record<string, any> = {}
    template.parameters.forEach(param => {
      if (param.defaultValue !== undefined && !(param.name in parameters)) {
        defaults[param.name] = param.defaultValue
      }
    })
    setParameters(prev => ({ ...defaults, ...prev }))
  }, [template])

  useEffect(() => {
    validateParameters()
  }, [parameters])

  const validateParameters = async () => {
    setIsValidating(true)
    try {
      const result = flowTemplateService.validateTemplateParameters(template, parameters)
      setValidation(result)
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({ ...prev, [paramName]: value }))
  }

  const handleApply = () => {
    if (validation?.isValid) {
      onApply(template, parameters)
    }
  }

  const resetToDefaults = () => {
    const defaults: Record<string, any> = {}
    template.parameters.forEach(param => {
      if (param.defaultValue !== undefined) {
        defaults[param.name] = param.defaultValue
      }
    })
    setParameters(defaults)
  }

  const getCompletionProgress = () => {
    const requiredParams = template.parameters.filter(p => p.required)
    const filledRequired = requiredParams.filter(p => 
      parameters[p.name] !== undefined && 
      parameters[p.name] !== null && 
      parameters[p.name] !== ''
    )
    return requiredParams.length > 0 ? (filledRequired.length / requiredParams.length) * 100 : 100
  }

  const canProceedToNext = () => {
    if (!isStepForm) return true
    const currentGroup = groupNames[currentStep]
    const groupParams = parameterGroups[currentGroup].filter(p => p.required)
    return groupParams.every(p => 
      parameters[p.name] !== undefined && 
      parameters[p.name] !== null && 
      parameters[p.name] !== ''
    )
  }

  const fieldErrors = new Map<string, string>()
  validation?.errors.forEach(error => {
    if (error.field) {
      fieldErrors.set(error.field, error.message)
    }
  })

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-primary" />
              <span>Configure Template</span>
            </CardTitle>
            <CardDescription className="mt-1">
              {template.name} - {template.description}
            </CardDescription>
          </div>
          
          <Badge variant="outline" className="flex items-center space-x-1">
            <Shield className="w-3 h-3" />
            <span>{template.difficulty}</span>
          </Badge>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Configuration Progress</span>
            <span>{Math.round(getCompletionProgress())}%</span>
          </div>
          <Progress value={getCompletionProgress()} className="h-2" />
        </div>

        {/* Step Navigation for Multi-Group Forms */}
        {isStepForm && (
          <div className="flex items-center space-x-2 mt-4">
            {groupNames.map((group, index) => (
              <Button
                key={group}
                variant={index === currentStep ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentStep(index)}
                disabled={index > currentStep && !canProceedToNext()}
                className="flex-1"
              >
                {index + 1}. {group.charAt(0).toUpperCase() + group.slice(1)}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        <ScrollArea className="flex-1">
          <div className="space-y-6 pr-3">
            {/* Single Form or Current Step */}
            {isStepForm ? (
              <div className="space-y-4">
                <h3 className="font-medium capitalize">
                  {groupNames[currentStep]} Parameters
                </h3>
                {parameterGroups[groupNames[currentStep]].map(param => (
                  <ParameterField
                    key={param.name}
                    parameter={param}
                    value={parameters[param.name]}
                    onChange={(value) => handleParameterChange(param.name, value)}
                    error={fieldErrors.get(param.name)}
                    showHelp={showAdvanced}
                  />
                ))}
              </div>
            ) : (
              /* All Parameters */
              Object.entries(parameterGroups).map(([groupName, groupParams]) => (
                <div key={groupName} className="space-y-4">
                  {groupNames.length > 1 && (
                    <>
                      <h3 className="font-medium capitalize">{groupName} Parameters</h3>
                      <Separator />
                    </>
                  )}
                  {groupParams.map(param => (
                    <ParameterField
                      key={param.name}
                      parameter={param}
                      value={parameters[param.name]}
                      onChange={(value) => handleParameterChange(param.name, value)}
                      error={fieldErrors.get(param.name)}
                      showHelp={showAdvanced}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Validation Summary */}
        {validation && (
          <div className="space-y-3">
            <Separator />
            
            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''} found:
                  <ul className="mt-2 list-disc list-inside text-sm">
                    {validation.errors.slice(0, 3).map((error, i) => (
                      <li key={i}>{error.message}</li>
                    ))}
                    {validation.errors.length > 3 && (
                      <li>+{validation.errors.length - 3} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validation.warnings.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}:
                  <ul className="mt-2 list-disc list-inside text-sm">
                    {validation.warnings.slice(0, 2).map((warning, i) => (
                      <li key={i}>{warning.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validation.isValid && (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  All parameters are valid. Ready to apply template.
                  {validation.estimatedGas && (
                    <div className="mt-1 text-sm">
                      Estimated gas: {validation.estimatedGas.toString()}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showAdvanced ? 'Hide' : 'Show'} Details
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}

            {/* Step Navigation */}
            {isStepForm && (
              <>
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    Previous
                  </Button>
                )}
                
                {currentStep < groupNames.length - 1 ? (
                  <Button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={!canProceedToNext()}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleApply}
                    disabled={!validation?.isValid || isValidating}
                    className="min-w-32"
                  >
                    {isValidating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Apply Template
                  </Button>
                )}
              </>
            )}

            {/* Single Form Apply */}
            {!isStepForm && (
              <Button
                onClick={handleApply}
                disabled={!validation?.isValid || isValidating}
                className="min-w-32"
              >
                {isValidating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Apply Template
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}