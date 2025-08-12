# TICKET-028: Setup Validation & Health Checks

**Priority**: High  
**Estimated**: 3 hours  
**Phase**: 6 - Complex Smart Contract Flow Simulation

## Description
Implement a comprehensive validation system that checks the readiness and health of deployed contract ecosystems before executing complex flows. This includes contract state validation, permission verification, and dependency checks.

## Requirements

### Pre-Execution Validation
- **Contract State Checks**: Verify contracts are properly initialized
- **Permission Validation**: Confirm all required permissions are granted
- **Balance Verification**: Check sufficient token balances for operations
- **Allowance Confirmation**: Verify all necessary approvals are in place
- **Network Readiness**: Confirm network connectivity and gas availability

### Health Monitoring
- **Contract Connectivity**: Test all contract interactions
- **Function Availability**: Verify required contract functions exist and are callable
- **Event Emission**: Check that contracts emit expected events
- **Gas Estimation**: Pre-calculate gas requirements for flow execution
- **Dependency Status**: Monitor health of all dependent contracts

### Setup Checklist UI
- **Visual Indicators**: Green/yellow/red status indicators for each check
- **Progress Tracking**: Show completion percentage of setup requirements
- **Interactive Fixes**: Provide buttons to resolve common issues
- **Detailed Messages**: Clear explanations of what each check validates
- **Auto-Refresh**: Automatically re-run checks when conditions change

## Technical Implementation

### Validation Engine
```typescript
// services/validation/setupValidator.ts
interface ValidationCheck {
  id: string
  name: string
  description: string
  category: 'contracts' | 'permissions' | 'balances' | 'network'
  severity: 'critical' | 'warning' | 'info'
  validator: () => Promise<ValidationResult>
  autoFix?: () => Promise<void>
}

interface ValidationResult {
  passed: boolean
  message: string
  details?: any
  suggestedAction?: string
  canAutoFix: boolean
}

class SetupValidationService {
  async validateContractEcosystem(contracts: ContractInfo[]): Promise<ValidationSummary>
  async runHealthChecks(flowId: string): Promise<HealthCheckResult[]>
  async validatePermissions(user: Address, contracts: ContractInfo[]): Promise<PermissionValidation>
  async checkBalancesAndAllowances(user: Address, requirements: TokenRequirement[]): Promise<BalanceCheck>
}
```

### Validation Checks

#### Contract Validation
- **Deployment Status**: Verify contracts are deployed and accessible
- **Interface Compliance**: Check contracts implement required interfaces
- **State Initialization**: Confirm contracts are properly initialized
- **Upgrade Status**: Verify proxy contracts point to correct implementations

#### Permission Validation  
- **Role Assignments**: Check user has required roles
- **Access Lists**: Verify user is on required allowlists
- **Function Permissions**: Confirm user can call required functions
- **Admin Rights**: Check if user has necessary admin permissions

#### Balance & Allowance Checks
- **Token Balances**: Verify sufficient token balances for operations
- **ETH Balance**: Check sufficient ETH for gas costs
- **Allowances**: Confirm required token approvals are in place
- **Spending Limits**: Verify allowances cover intended operations

#### Network Checks
- **Connectivity**: Test RPC connection and responsiveness
- **Gas Price**: Verify reasonable gas prices for execution
- **Block Confirmation**: Check network is producing blocks
- **Mempool Status**: Monitor network congestion

## UI Components

### Setup Checklist Component
```tsx
// components/flows/SetupChecklist.tsx
export function SetupChecklist({ flowId, onComplete }: SetupChecklistProps) {
  const { checks, isLoading, refresh } = useSetupValidation(flowId)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup Validation</CardTitle>
        <div className="flex items-center gap-2">
          <Progress value={completionPercentage} />
          <span>{completionPercentage}% Complete</span>
        </div>
      </CardHeader>
      <CardContent>
        {checks.map(check => (
          <ChecklistItem 
            key={check.id}
            check={check}
            onAutoFix={handleAutoFix}
          />
        ))}
      </CardContent>
    </Card>
  )
}
```

### Health Dashboard
```tsx
// components/flows/HealthDashboard.tsx
export function HealthDashboard({ contracts }: HealthDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contracts.map(contract => (
        <ContractHealthCard
          key={contract.address}
          contract={contract}
          health={getContractHealth(contract)}
        />
      ))}
    </div>
  )
}
```

## Tasks

### Validation Engine
- [x] Create `SetupValidationService` class
- [x] Implement contract state validation checks
- [x] Build permission verification system  
- [x] Add balance and allowance validation
- [x] Create network health monitoring

### Validation Checks
- [x] Contract deployment and interface validation
- [x] Role-based access control verification
- [x] Token balance and allowance checks
- [x] Gas estimation and network status
- [x] Dependency health monitoring

### UI Components
- [x] Build `SetupChecklist` component with progress tracking
- [x] Create `HealthDashboard` for contract ecosystem monitoring
- [x] Implement `ChecklistItem` with auto-fix capabilities
- [x] Design `ContractHealthCard` for individual contract status
- [x] Add `ValidationMessage` component for detailed feedback

### Auto-Fix Actions
- [x] Automatic token approval transactions
- [x] Role assignment request handling
- [x] Balance top-up suggestions
- [x] Network switching recommendations
- [x] Contract re-initialization helpers

### Integration
- [x] Integrate with multi-contract deployment system
- [x] Connect to wallet for permission checks
- [x] Link with balance and allowance services
- [x] Add real-time validation updates

## Success Criteria
- [x] All validation checks run accurately and quickly
- [x] UI clearly shows setup completion status
- [x] Auto-fix actions work for common issues
- [x] Real-time updates when conditions change
- [x] Detailed error messages help users resolve issues
- [x] Health dashboard provides clear contract status overview
- [x] Validation prevents execution of invalid flows

## Dependencies
- Multi-contract deployment system (TICKET-027)
- Wallet connection and transaction capabilities
- Contract interaction services

## Notes
- Consider caching validation results to avoid repeated checks
- Implement retry logic for transient network issues
- Support different validation profiles for different flow types
- Allow users to override non-critical validation failures