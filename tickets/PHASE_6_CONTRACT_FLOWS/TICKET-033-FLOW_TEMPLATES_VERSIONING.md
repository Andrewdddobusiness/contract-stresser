# TICKET-033: Flow Templates & Versioning

**Priority**: Low  
**Estimated**: 3 hours  
**Phase**: 6 - Complex Smart Contract Flow Simulation

## Description
Implement a comprehensive template system and versioning mechanism for complex smart contract flows. This system will provide pre-built flow templates for common scenarios, version control for flow evolution, and collaborative sharing capabilities.

## Requirements

### Template System
- **Built-in Templates**: Pre-configured flows for common DeFi operations
- **Custom Templates**: User-created templates from existing flows
- **Template Categories**: Organized by use case, complexity, and protocol
- **Parameter Placeholders**: Configurable parameters for template customization
- **Template Validation**: Ensure templates work across different environments

### Versioning System
- **Flow Versions**: Track changes and evolution of flows over time
- **Diff Visualization**: Compare differences between flow versions
- **Branching**: Create experimental versions without affecting main flow
- **Merge Capabilities**: Combine changes from different versions
- **Version Tagging**: Mark stable releases and milestones

### Sharing & Collaboration
- **Template Marketplace**: Community-driven template sharing
- **Export/Import**: Share flows via JSON or custom format
- **Access Control**: Public, private, and team-based sharing
- **Fork Functionality**: Create copies of existing flows for modification
- **Collaboration Features**: Multi-user editing and commenting

## Technical Implementation

### Template Engine
```typescript
// services/templates/templateEngine.ts
interface FlowTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  tags: string[]
  author: {
    address: Address
    name?: string
    verified: boolean
  }
  flow: Flow
  parameters: TemplateParameter[]
  requirements: TemplateRequirement[]
  metadata: TemplateMetadata
  usage: {
    downloads: number
    ratings: Rating[]
    averageRating: number
  }
}

interface TemplateParameter {
  name: string
  type: 'address' | 'amount' | 'token' | 'number' | 'string' | 'boolean'
  description: string
  defaultValue?: any
  validation: ParameterValidation
  required: boolean
}

class FlowTemplateService {
  async createTemplate(flow: Flow, metadata: TemplateMetadata): Promise<FlowTemplate>
  async applyTemplate(templateId: string, parameters: Record<string, any>): Promise<Flow>
  async searchTemplates(query: TemplateSearchQuery): Promise<FlowTemplate[]>
  async forkTemplate(templateId: string, modifications: FlowModification[]): Promise<FlowTemplate>
  async shareTemplate(templateId: string, permissions: SharingPermissions): Promise<string>
}
```

### Versioning System
```typescript
// services/versioning/flowVersioning.ts
interface FlowVersion {
  id: string
  flowId: string
  version: string // semantic versioning (1.0.0)
  parentVersion?: string
  changes: FlowChange[]
  flow: Flow
  metadata: {
    author: Address
    timestamp: Date
    description: string
    tags: string[]
  }
  status: 'draft' | 'published' | 'deprecated'
}

interface FlowChange {
  type: 'add' | 'remove' | 'modify'
  target: 'block' | 'connection' | 'config' | 'metadata'
  path: string
  oldValue?: any
  newValue?: any
  description: string
}

class FlowVersioningService {
  async createVersion(flowId: string, changes: FlowChange[]): Promise<FlowVersion>
  async compareVersions(versionA: string, versionB: string): Promise<VersionComparison>
  async mergeVersions(baseVersion: string, mergeVersion: string): Promise<MergeResult>
  async createBranch(versionId: string, branchName: string): Promise<FlowBranch>
  async getVersionHistory(flowId: string): Promise<FlowVersion[]>
}
```

### Built-in Template Definitions
```typescript
// templates/defi/atomicSwapTemplates.ts
export const ATOMIC_SWAP_TEMPLATES: FlowTemplate[] = [
  {
    id: 'erc20-erc1155-swap',
    name: 'ERC20 ⟷ ERC1155 Atomic Swap',
    description: 'Exchange ERC20 tokens for ERC1155 NFTs atomically',
    category: 'DeFi',
    difficulty: 'intermediate',
    tags: ['swap', 'atomic', 'nft', 'defi'],
    parameters: [
      {
        name: 'erc20Token',
        type: 'address',
        description: 'ERC20 token contract address',
        required: true,
        validation: { isContract: true, implements: 'IERC20' }
      },
      {
        name: 'erc1155Token', 
        type: 'address',
        description: 'ERC1155 token contract address',
        required: true,
        validation: { isContract: true, implements: 'IERC1155' }
      },
      {
        name: 'erc20Amount',
        type: 'amount',
        description: 'Amount of ERC20 tokens to swap',
        required: true,
        validation: { min: '0', max: 'balance' }
      },
      {
        name: 'nftTokenId',
        type: 'number',
        description: 'ERC1155 token ID to receive',
        required: true
      }
    ],
    flow: {
      // Pre-built flow definition
    }
  },
  
  {
    id: 'liquidity-provision',
    name: 'Liquidity Provision Flow',
    description: 'Add liquidity to a DEX pair with optimal routing',
    category: 'DeFi',
    difficulty: 'advanced',
    // ... template definition
  }
]
```

### Template UI Components
```tsx
// components/templates/TemplateMarketplace.tsx
export function TemplateMarketplace() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'recent'>('rating')
  
  const { templates, isLoading } = useTemplateSearch({
    query: searchQuery,
    category: selectedCategory,
    sortBy
  })
  
  return (
    <div className="template-marketplace">
      <div className="marketplace-header mb-6">
        <h2 className="text-2xl font-bold">Flow Templates</h2>
        <p className="text-muted-foreground">
          Discover and use pre-built flows for common DeFi operations
        </p>
      </div>
      
      <div className="search-filters mb-6 flex gap-4">
        <SearchInput 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search templates..."
        />
        <CategoryFilter 
          selected={selectedCategory}
          onChange={setSelectedCategory}
        />
        <SortSelector
          value={sortBy}
          onChange={setSortBy}
        />
      </div>
      
      <div className="templates-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onUse={handleUseTemplate}
            onFork={handleForkTemplate}
          />
        ))}
      </div>
    </div>
  )
}

// components/templates/TemplateCard.tsx
export function TemplateCard({ 
  template, 
  onUse, 
  onFork 
}: TemplateCardProps) {
  return (
    <Card className="template-card">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{template.category}</Badge>
              <DifficultyBadge difficulty={template.difficulty} />
            </div>
          </div>
          <div className="rating">
            <StarRating rating={template.usage.averageRating} />
            <span className="text-sm text-muted-foreground">
              ({template.usage.downloads})
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {template.description}
        </p>
        
        <div className="template-tags flex flex-wrap gap-1 mb-4">
          {template.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="template-requirements text-xs text-muted-foreground">
          <strong>Requirements:</strong>
          <ul className="ml-4 mt-1">
            {template.requirements.map((req, i) => (
              <li key={i}>• {req.description}</li>
            ))}
          </ul>
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button 
          onClick={() => onUse(template)}
          className="flex-1"
        >
          Use Template
        </Button>
        <Button 
          variant="outline"
          onClick={() => onFork(template)}
        >
          Fork
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### Version Control UI
```tsx
// components/versioning/VersionHistory.tsx
export function VersionHistory({ flowId }: VersionHistoryProps) {
  const { versions, currentVersion } = useFlowVersions(flowId)
  
  return (
    <div className="version-history">
      <div className="history-header mb-4">
        <h3 className="text-lg font-semibold">Version History</h3>
        <Button onClick={handleCreateVersion}>
          Create New Version
        </Button>
      </div>
      
      <div className="version-timeline space-y-4">
        {versions.map(version => (
          <VersionCard
            key={version.id}
            version={version}
            isCurrent={version.id === currentVersion}
            onRevert={handleRevertToVersion}
            onCompare={handleCompareVersion}
          />
        ))}
      </div>
    </div>
  )
}

// components/versioning/VersionCard.tsx
export function VersionCard({ 
  version, 
  isCurrent, 
  onRevert, 
  onCompare 
}: VersionCardProps) {
  return (
    <Card className={`version-card ${isCurrent ? 'border-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">
              v{version.version}
              {isCurrent && <Badge className="ml-2">Current</Badge>}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(version.metadata.timestamp, { addSuffix: true })}
            </p>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => onCompare(version)}>
              Compare
            </Button>
            {!isCurrent && (
              <Button size="sm" variant="outline" onClick={() => onRevert(version)}>
                Revert
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm mb-3">{version.metadata.description}</p>
        
        <div className="changes-summary">
          <h4 className="text-sm font-medium mb-2">Changes:</h4>
          <div className="space-y-1">
            {version.changes.slice(0, 3).map((change, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <ChangeIcon type={change.type} />
                <span>{change.description}</span>
              </div>
            ))}
            {version.changes.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{version.changes.length - 3} more changes
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Template Parameter Configuration
```tsx
// components/templates/TemplateParameterForm.tsx
export function TemplateParameterForm({ 
  template, 
  onApply 
}: TemplateParameterFormProps) {
  const [parameters, setParameters] = useState<Record<string, any>>({})
  const [validation, setValidation] = useState<ValidationResult>({})
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configure Template: {template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <form className="space-y-4">
          {template.parameters.map(param => (
            <ParameterInput
              key={param.name}
              parameter={param}
              value={parameters[param.name]}
              onChange={(value) => setParameters(prev => ({ 
                ...prev, 
                [param.name]: value 
              }))}
              error={validation[param.name]?.error}
            />
          ))}
        </form>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={() => onApply(template, parameters)}
          disabled={!isParameterFormValid(parameters, template.parameters)}
          className="w-full"
        >
          Apply Template
        </Button>
      </CardFooter>
    </Card>
  )
}
```

## Tasks

### Template System
- [x] Create `FlowTemplateService` class
- [x] Design template data structure and metadata
- [x] Build template parameter system
- [x] Implement template validation engine
- [x] Create template search and filtering

### Built-in Templates
- [x] Design ERC20 ⟷ ERC1155 atomic swap template
- [x] Create liquidity provision flow template
- [x] Build multi-token approval template
- [ ] Design governance voting participation template
- [ ] Create yield farming strategy template

### Versioning System
- [x] Implement `FlowVersioningService` class
- [x] Build version comparison and diff system
- [x] Create branching and merging capabilities
- [x] Add version tagging and metadata
- [x] Build version history tracking

### User Interface
- [x] Design template marketplace component
- [x] Create template parameter configuration forms
- [x] Build version history visualization
- [ ] Implement template sharing dialogs
- [ ] Add template creation wizard

### Import/Export
- [x] Create template export functionality
- [x] Build template import validation
- [x] Implement sharing URL generation
- [x] Add template packaging system
- [ ] Create backup and restore capabilities

### Integration
- [x] Integrate with flow designer
- [ ] Connect to permission system
- [ ] Add template usage analytics
- [ ] Build community rating system
- [ ] Create template update notifications

## Success Criteria
- [x] Users can browse and use built-in templates
- [x] Custom templates can be created from existing flows
- [x] Version control tracks all flow changes
- [x] Templates can be shared and forked
- [x] Parameter configuration is intuitive
- [x] Version comparison shows clear differences
- [x] Templates work across different environments
- [x] Community marketplace enables collaboration

## Dependencies
- Interactive flow designer (TICKET-032)
- Flow visualization engine (TICKET-031)
- Multi-contract deployment system (TICKET-027)

## Technical Notes
- Use semantic versioning for flow versions
- Implement efficient diff algorithms for large flows
- Consider template licensing and attribution
- Plan for template deprecation and migration
- Add template security validation

## Future Enhancements
- AI-powered template recommendations
- Template performance analytics
- Cross-protocol template compatibility
- Template testing frameworks
- Integration with external template repositories