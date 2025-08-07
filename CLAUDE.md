# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Contract Stresser is a lightweight web application for stress-testing Ethereum smart contracts, particularly ERC-20 tokens. It uses Next.js, Foundry (Forge/Anvil), Viem, and Tailwind CSS to provide a comprehensive testing environment for smart contract scalability.

## Key Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run typecheck
```

### Smart Contracts (Foundry)
```bash
# Compile contracts
npm run forge:build

# Run contract tests
npm run forge:test

# Deploy contracts (requires running Anvil)
npm run forge:deploy

# Start local blockchain (Anvil)
npm run anvil
```

### Testing Workflow
```bash
# 1. Start Anvil in one terminal
npm run anvil

# 2. Deploy contracts in another terminal
npm run forge:deploy

# 3. Start the Next.js dev server
npm run dev
```

## Architecture

### Directory Structure
- `app/` - Next.js 14 App Router pages and API routes
  - `api/` - Backend API endpoints for test orchestration
  - `dashboard/` - Main dashboard UI
  - `deploy/` - Contract deployment interface
  - `test/` - Test configuration and execution UI
  - `explorer/` - Block explorer view
- `components/` - Reusable React components
  - `ui/` - Generic UI components (buttons, forms, etc.)
  - `blockchain/` - Web3-specific components (wallet connect, tx status)
  - `analytics/` - Charts and metrics visualization
  - `wallet/` - Wallet connection and management
- `contracts/` - Solidity smart contracts (Foundry structure)
  - `src/` - Contract source files
  - `test/` - Contract tests
  - `script/` - Deployment scripts
- `services/` - Business logic and external service integration
  - `blockchain/` - Viem clients, contract interactions
  - `analytics/` - Performance metrics collection
- `hooks/` - Custom React hooks for Web3 and UI state
- `utils/` - Utility functions and helpers
- `types/` - TypeScript type definitions
- `lib/` - Third-party library configurations

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Web3**: Viem for blockchain interactions, Wagmi for React hooks
- **Wallet**: RainbowKit for wallet connections
- **Smart Contracts**: Foundry (Forge for compilation, Anvil for local chain)
- **Charts**: Recharts for performance visualization
- **State Management**: React Query for server state

### Key Patterns

1. **Blockchain Clients**: Always use the centralized Viem clients from `services/blockchain/clients.ts`
2. **Error Handling**: Wrap blockchain calls in try-catch with user-friendly error messages
3. **Type Safety**: Use generated contract types from Viem for all contract interactions
4. **Performance**: Batch RPC calls when possible, use React Query for caching
5. **Testing**: Support both local (Anvil) and testnet (Sepolia) modes seamlessly

### Contract Interaction Flow
1. Deploy contracts via UI or Foundry scripts
2. Store deployed addresses in local state/context
3. Use Viem's contract instances for all interactions
4. Monitor transactions with publicClient watchers
5. Display results in real-time with WebSocket or polling

### Testing Scenarios
- Sequential transaction batches (100-500 calls)
- Concurrent transactions from multiple accounts
- Gas optimization comparisons
- Network stress testing with configurable parameters
- Performance metrics collection and visualization

### Security Considerations
- Never store private keys in code
- Use environment variables for sensitive data
- Validate all user inputs before contract interactions
- Implement proper error boundaries for failed transactions

### Development Tips
- Always run Anvil before testing locally
- Use Foundry's console.log for contract debugging
- Monitor gas usage patterns across different test scenarios
- Keep UI lightweight - this is a developer tool
- Batch similar operations to reduce RPC calls