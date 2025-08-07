# Phase 1: Foundation & Infrastructure

## Objective
Establish the core infrastructure, blockchain connectivity, and basic UI framework.

## Tickets

### TICKET-001: Project Configuration & Base Layout
**Priority**: High  
**Estimated**: 2 hours  
**Description**: Set up base Next.js layout, global styles, and app configuration.

**Tasks**:
- [ ] Create app/layout.tsx with RainbowKit and React Query providers
- [ ] Set up global CSS with Tailwind design tokens
- [ ] Create base navigation structure
- [ ] Configure environment variables (.env.local)
- [ ] Set up error boundaries and loading states

---

### TICKET-002: Blockchain Service Layer
**Priority**: High  
**Estimated**: 3 hours  
**Description**: Implement Viem clients and blockchain connection services.

**Tasks**:
- [ ] Create services/blockchain/clients.ts with public and wallet clients
- [ ] Implement network switching logic (local Anvil vs Sepolia)
- [ ] Create services/blockchain/chains.ts with chain configurations
- [ ] Set up WebSocket connections for real-time updates
- [ ] Implement connection state management

---

### TICKET-003: Smart Contract Setup
**Priority**: High  
**Estimated**: 2 hours  
**Description**: Create and configure the ERC-20 test contract using OpenZeppelin.

**Tasks**:
- [ ] Install OpenZeppelin contracts via Foundry
- [ ] Create contracts/src/TestToken.sol with configurable parameters
- [ ] Write basic deployment script in contracts/script/Deploy.s.sol
- [ ] Create contract tests in contracts/test/
- [ ] Generate TypeScript types from ABI

---

### TICKET-004: Wallet Integration
**Priority**: High  
**Estimated**: 2 hours  
**Description**: Implement wallet connection using RainbowKit and Wagmi.

**Tasks**:
- [ ] Configure RainbowKit with custom chains
- [ ] Create components/wallet/WalletConnect.tsx
- [ ] Implement account management hooks
- [ ] Add network switching UI
- [ ] Handle connection errors gracefully

---

### TICKET-005: Basic UI Components
**Priority**: Medium  
**Estimated**: 3 hours  
**Description**: Build reusable UI components following the design system.

**Tasks**:
- [ ] Create Button, Input, Card components in components/ui/
- [ ] Implement Form components with validation
- [ ] Create Modal and Dialog components
- [ ] Build Table component for transaction display
- [ ] Add loading spinners and progress indicators

## Success Criteria
- [ ] Can connect to both local Anvil and Sepolia networks
- [ ] Wallet connection works with MetaMask
- [ ] Smart contract compiles and deploys successfully
- [ ] Basic UI components render correctly
- [ ] No TypeScript errors