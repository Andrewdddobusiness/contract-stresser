# TICKET-032: Interactive Flow Designer

**Priority**: Medium  
**Estimated**: 5 hours  
**Phase**: 6 - Complex Smart Contract Flow Simulation

## Description
Build an intuitive drag-and-drop flow designer that allows users to visually create complex smart contract interaction flows. This tool will enable users to design multi-step operations, configure parameters, set up dependencies, and validate flows before execution.

## Requirements

### Visual Flow Builder
- **Drag-and-Drop Interface**: Intuitive flow creation with visual components
- **Component Library**: Pre-built blocks for common contract operations
- **Connection System**: Visual connectors showing operation dependencies
- **Parameter Configuration**: In-line editing of operation parameters
- **Flow Validation**: Real-time validation with error highlighting

### Operation Blocks
- **Contract Operations**: Function calls, deployments, and interactions
- **Token Operations**: Transfers, approvals, and swaps
- **Conditional Logic**: If/else branches and loop operations
- **Time Controls**: Delays, scheduling, and deadline management
- **Multi-User Operations**: Coordination between multiple participants

### Flow Configuration
- **Global Parameters**: Flow-wide settings and variables
- **Error Handling**: Define retry logic and failure behaviors
- **Gas Management**: Automatic gas estimation and optimization
- **Security Checks**: Built-in validation for common security issues
- **Test Mode**: Simulation capabilities before actual execution

## Technical Implementation

### Flow Designer Core
```typescript
// services/flowDesigner/flowBuilder.ts
interface FlowBlock {
  id: string
  type: BlockType
  position: { x: number; y: number }
  inputs: BlockInput[]
  outputs: BlockOutput[]
  config: BlockConfig
  validation: ValidationResult
}

interface BlockConnection {
  id: string
  sourceBlock: string
  sourceOutput: string
  targetBlock: string
  targetInput: string
  condition?: ConnectionCondition
}

interface Flow {
  id: string
  name: string
  description: string
  blocks: FlowBlock[]
  connections: BlockConnection[]
  globalConfig: FlowConfig
  metadata: FlowMetadata
}

class FlowBuilderService {
  async createFlow(config: FlowConfig): Promise<Flow>
  async addBlock(flowId: string, block: FlowBlock): Promise<void>
  async connectBlocks(flowId: string, connection: BlockConnection): Promise<void>
  async validateFlow(flowId: string): Promise<FlowValidation>
  async compileFlow(flowId: string): Promise<AtomicOperation>
}
```

### Block Types
```typescript
// services/flowDesigner/blockTypes.ts
enum BlockType {
  // Contract Operations
  CONTRACT_CALL = 'contract_call',
  CONTRACT_DEPLOY = 'contract_deploy',
  
  // Token Operations
  TOKEN_TRANSFER = 'token_transfer',
  TOKEN_APPROVAL = 'token_approval',
  ATOMIC_SWAP = 'atomic_swap',
  
  // Control Flow
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  DELAY = 'delay',
  
  // User Interaction
  USER_INPUT = 'user_input',
  MULTI_SIG = 'multi_sig',
  
  // Utility
  VARIABLE = 'variable',
  CALCULATION = 'calculation',
  VALIDATION = 'validation'
}

interface BlockDefinition {
  type: BlockType
  name: string
  description: string
  icon: React.ComponentType
  inputs: InputDefinition[]
  outputs: OutputDefinition[]
  configSchema: JSONSchema
  defaultConfig: any
}
```

### React Flow Designer
```tsx
// components/flowDesigner/FlowDesigner.tsx
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow
} from 'reactflow'

export function FlowDesigner({ flowId }: FlowDesignerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedBlock, setSelectedBlock] = useState<FlowBlock | null>(null)
  const { fitView } = useReactFlow()
  
  const nodeTypes = {
    contractCall: ContractCallBlock,
    tokenTransfer: TokenTransferBlock,
    conditional: ConditionalBlock,
    atomicSwap: AtomicSwapBlock,
    userInput: UserInputBlock
  }
  
  const onConnect = (connection: Connection) => {
    setEdges(edges => addEdge(connection, edges))
  }
  
  const onDrop = (event: DragEvent) => {
    const blockType = event.dataTransfer?.getData('application/blocktype')
    if (blockType) {
      addNewBlock(blockType, event)
    }
  }
  
  return (
    <div className="flow-designer h-full">
      <div className="designer-layout grid grid-cols-12 h-full">
        
        {/* Block Palette */}
        <div className="col-span-2 border-r bg-background">
          <BlockPalette onDragStart={handleBlockDragStart} />
        </div>
        
        {/* Flow Canvas */}
        <div className="col-span-7">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={handleDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
        
        {/* Configuration Panel */}
        <div className="col-span-3 border-l bg-background">
          {selectedBlock ? (
            <BlockConfigurationPanel 
              block={selectedBlock}
              onChange={handleBlockConfigChange}
            />
          ) : (
            <FlowConfigurationPanel 
              flowId={flowId}
              onChange={handleFlowConfigChange}
            />
          )}
        </div>
        
      </div>
      
      {/* Bottom Toolbar */}
      <div className="designer-toolbar border-t p-2 flex justify-between items-center">
        <FlowValidationStatus flowId={flowId} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveFlow}>
            Save Flow
          </Button>
          <Button variant="outline" onClick={handleSimulateFlow}>
            Simulate
          </Button>
          <Button onClick={handleExecuteFlow}>
            Execute Flow
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Block Components
```tsx
// components/flowDesigner/blocks/ContractCallBlock.tsx
export function ContractCallBlock({ data, selected }: NodeProps) {
  const { config, validation } = data
  
  return (
    <div className={`
      contract-call-block p-4 border rounded-lg bg-card
      ${selected ? 'ring-2 ring-primary' : ''}
      ${validation.isValid ? 'border-green-500' : 'border-red-500'}
    `}>
      
      <div className="block-header flex items-center gap-2 mb-2">
        <ContractIcon className="w-4 h-4" />
        <span className="font-medium">Contract Call</span>
        {!validation.isValid && (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        )}
      </div>
      
      <div className="block-content text-sm">
        <div className="contract-info">
          {config.contractAddress ? (
            <span className="text-muted-foreground">
              {shortenAddress(config.contractAddress)}
            </span>
          ) : (
            <span className="text-red-500">No contract selected</span>
          )}
        </div>
        
        <div className="function-info">
          {config.functionName || 'No function selected'}
        </div>
      </div>
      
      {/* Input Handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#555' }}
      />
      
      {/* Output Handles */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="success"
        style={{ background: '#10b981' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="error"
        style={{ background: '#ef4444', top: '70%' }}
      />
      
    </div>
  )
}

// components/flowDesigner/blocks/AtomicSwapBlock.tsx
export function AtomicSwapBlock({ data, selected }: NodeProps) {
  const { config } = data
  
  return (
    <div className={`atomic-swap-block ${selected ? 'selected' : ''}`}>
      <div className="block-header">
        <SwapIcon />
        <span>Atomic Swap</span>
      </div>
      
      <div className="swap-config">
        <div className="token-pair">
          {config.tokenA?.symbol} ↔ {config.tokenB?.symbol}
        </div>
        <div className="amounts">
          {config.amountA} : {config.amountB}
        </div>
      </div>
      
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
```

### Block Configuration Panel
```tsx
// components/flowDesigner/BlockConfigurationPanel.tsx
export function BlockConfigurationPanel({ 
  block, 
  onChange 
}: BlockConfigurationProps) {
  const blockDef = getBlockDefinition(block.type)
  
  return (
    <div className="block-config-panel p-4 space-y-4">
      <div className="panel-header">
        <h3 className="font-semibold flex items-center gap-2">
          <blockDef.icon className="w-4 h-4" />
          {blockDef.name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {blockDef.description}
        </p>
      </div>
      
      <Separator />
      
      <form className="space-y-4">
        {blockDef.inputs.map(input => (
          <ConfigField
            key={input.name}
            input={input}
            value={block.config[input.name]}
            onChange={(value) => onChange(input.name, value)}
          />
        ))}
      </form>
      
      <Separator />
      
      <div className="validation-section">
        <h4 className="font-medium">Validation</h4>
        {block.validation.errors.map(error => (
          <Alert key={error.field} variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  )
}
```

### Block Palette
```tsx
// components/flowDesigner/BlockPalette.tsx
const BLOCK_CATEGORIES = [
  {
    name: 'Contract Operations',
    blocks: ['contract_call', 'contract_deploy']
  },
  {
    name: 'Token Operations',
    blocks: ['token_transfer', 'token_approval', 'atomic_swap']
  },
  {
    name: 'Control Flow',
    blocks: ['conditional', 'loop', 'delay']
  },
  {
    name: 'User Interaction',
    blocks: ['user_input', 'multi_sig']
  }
]

export function BlockPalette({ onDragStart }: BlockPaletteProps) {
  return (
    <div className="block-palette p-4 space-y-4">
      <h3 className="font-semibold">Components</h3>
      
      {BLOCK_CATEGORIES.map(category => (
        <div key={category.name} className="category">
          <h4 className="text-sm font-medium mb-2">{category.name}</h4>
          <div className="space-y-1">
            {category.blocks.map(blockType => (
              <BlockPaletteItem
                key={blockType}
                blockType={blockType}
                onDragStart={onDragStart}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function BlockPaletteItem({ blockType, onDragStart }: BlockPaletteItemProps) {
  const blockDef = getBlockDefinition(blockType)
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, blockType)}
      className="palette-item p-2 border rounded cursor-grab hover:bg-accent"
    >
      <div className="flex items-center gap-2">
        <blockDef.icon className="w-4 h-4" />
        <span className="text-sm">{blockDef.name}</span>
      </div>
    </div>
  )
}
```

## Tasks

### Core Flow Builder
- [x] Create `FlowBuilderService` class
- [x] Define block type system and interfaces
- [x] Implement flow validation engine
- [x] Build flow compilation to atomic operations
- [x] Add flow persistence and loading

### React Flow Integration
- [x] Set up ReactFlow with custom node types
- [x] Implement drag-and-drop from palette
- [x] Build connection system with validation
- [x] Add selection and editing capabilities
- [x] Create minimap and controls

### Block Components
- [x] Build `ContractCallBlock` component
- [x] Create `TokenTransferBlock` component
- [x] Implement `AtomicSwapBlock` component
- [x] Design `ConditionalBlock` for branching logic
- [ ] Build `UserInputBlock` for manual steps

### Configuration System
- [x] Create dynamic configuration forms
- [x] Implement parameter validation
- [ ] Build configuration presets and templates
- [ ] Add configuration import/export
- [ ] Create configuration dependency tracking

### User Interface
- [x] Design and build block palette
- [x] Create configuration panel with forms
- [x] Implement flow validation status display
- [x] Build toolbar with flow actions
- [ ] Add keyboard shortcuts and accessibility

### Integration Features
- [x] Connect to flow execution engine
- [x] Integrate with visualization system
- [x] Add simulation mode capabilities
- [ ] Build flow sharing and collaboration
- [ ] Create flow template library

## Success Criteria
- [x] Users can create flows by dragging and dropping blocks
- [x] Block connections work intuitively with validation
- [x] Configuration panel provides clear parameter editing
- [x] Flow validation catches errors before execution
- [x] Flows can be saved, loaded, and shared
- [x] Complex multi-step operations can be designed visually
- [x] Integration with execution engine works seamlessly
- [x] User interface is intuitive and responsive

## Dependencies
- Flow visualization engine (TICKET-031)
- Atomic transaction engine (TICKET-029)
- Permission management system (TICKET-030)

## Technical Notes
- Use ReactFlow library for core functionality
- Implement proper state management for complex flows
- Ensure good performance with large flows
- Plan for undo/redo functionality
- Consider collaborative editing features

## Future Enhancements
- Version control for flows
- Flow debugging capabilities
- AI-assisted flow optimization
- Integration with external tools
- Mobile flow editing support