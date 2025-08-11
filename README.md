# Contract Stresser

A comprehensive web application for stress-testing Ethereum smart contracts with real-time analytics, block exploration, and advanced testing capabilities.

## 🌟 Features

### 🧪 **Smart Contract Testing**
- **Multiple Test Modes**: Sequential, concurrent, and multi-user testing
- **Gas Optimization**: Analyze and optimize gas usage patterns
- **Error Recovery**: Automatic retry mechanisms with configurable limits
- **Real-time Monitoring**: Live test progress tracking and metrics

### 🔍 **Block Explorer**
- **Real-time Block Data**: Live blockchain monitoring with WebSocket support
- **Transaction Analysis**: Detailed transaction information with decoded events
- **Search Functionality**: Search blocks and transactions by number/hash
- **Event Log Decoding**: Properly formatted smart contract event displays

### 📊 **Analytics & Reporting**
- **Performance Metrics**: TPS, latency, gas usage, and success rates
- **Visual Charts**: Interactive charts for transaction analytics
- **Export Capabilities**: Export test results and reports
- **Historical Data**: Track performance trends over time

### 🔧 **Advanced Testing Features**
- **Custom RPC Endpoints**: Connect to any blockchain network
- **Test Scheduling**: Automated test execution with cron support
- **Test Templates**: Pre-built scenarios for common testing patterns
- **A/B Testing**: Statistical comparison of different configurations

### 📡 **Network Monitoring**
- **Real-time Status**: Live network health and performance monitoring
- **Gas Price Tracking**: Historical gas price trends and predictions
- **Alert System**: Intelligent alerts for network issues
- **Performance Analysis**: Block time, latency, and throughput metrics

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Foundry** (Forge + Anvil) for smart contract development
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/contract-stresser.git
   cd contract-stresser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start local blockchain (Anvil)**
   ```bash
   npm run anvil
   ```
   This starts a local Ethereum node on `http://localhost:8545`

4. **Deploy smart contracts** (in a new terminal)
   ```bash
   npm run forge:deploy
   ```

5. **Start the development server** (in another terminal)
   ```bash
   npm run dev
   ```

6. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Complete Usage Guide

### 1. Getting Started

#### Initial Setup
1. **Connect Your Wallet**: Click "Connect Wallet" in the top navigation
2. **Select Network**: Choose between Local (Anvil) or Sepolia testnet
3. **Fund Accounts**: For local testing, accounts are automatically funded

#### Deploy a Test Contract
1. Navigate to **Deploy** page
2. Choose from available contract templates:
   - **SimpleERC20**: Basic ERC-20 token for transfer testing
   - **ComplexToken**: Advanced token with additional features
   - **GasOptimized**: Optimized contract for gas efficiency testing
3. Configure deployment parameters:
   - Token name and symbol
   - Initial supply
   - Decimal places
4. Click **Deploy Contract**
5. Wait for deployment confirmation and note the contract address

### 2. Contract Testing

#### Basic Testing
1. Go to the **Test** page
2. **Select Contract**: Choose from deployed contracts or enter address manually
3. **Choose Function**: Select the smart contract function to test
4. **Configure Parameters**:
   - **Function Arguments**: Fill in required parameters (addresses, amounts, etc.)
   - **Iterations**: Number of transactions to execute (1-10,000)
   - **Execution Mode**: Sequential, Concurrent, or Multi-user
5. **Set Test Options**:
   - **Account Settings**: Use single or multiple test accounts
   - **Timing**: Delay between transactions
   - **Gas Settings**: Gas price tier (slow/normal/fast)
   - **Error Handling**: Stop on error or retry failed transactions

#### Advanced Configuration
```
Execution Modes:
├── Sequential: Transactions sent one after another
├── Concurrent: Multiple transactions sent simultaneously  
└── Multi-user: Simulate multiple users with separate accounts

Gas Settings:
├── Slow: Lower gas prices, longer confirmation times
├── Normal: Standard gas prices (recommended)
└── Fast: Higher gas prices, faster confirmations

Error Handling:
├── Stop on Error: Halt test on first failure
├── Retry Failed: Automatic retry with configurable attempts
└── Timeout: Maximum wait time per transaction
```

#### Running Tests
1. **Preview Configuration**: Click "Preview Test" to review settings
2. **Start Test**: Click "Start Test" to begin execution
3. **Monitor Progress**: Watch real-time metrics:
   - Current iteration and progress percentage
   - Success/failure rates
   - Transaction throughput (TPS)
   - Average gas usage and costs
4. **Control Execution**: Pause, resume, or stop tests as needed

### 3. Using Test Templates

#### Selecting Templates
1. Navigate to **Test Templates** section
2. **Browse Categories**:
   - **Basic**: Simple scenarios for beginners
   - **Performance**: Throughput and latency testing
   - **Advanced**: Complex multi-step scenarios
   - **Stress**: High-intensity load testing
   - **Custom**: User-created templates
3. **Filter by Difficulty**: Easy, Medium, Hard, Extreme

#### Built-in Templates
- **Basic Token Transfer**: Simple ERC-20 transfers (Easy, 1-2 min)
- **Concurrent Transfers**: Multi-user concurrent testing (Medium, 3-5 min)
- **Approval Stress Test**: High-volume approval operations (Hard, 8-12 min)
- **Gas Optimization**: Systematic gas analysis (Medium, 5-8 min)
- **Extreme Load Test**: Maximum stress testing (Extreme, 15-30 min)

#### Using Templates
1. **Select Template**: Click on desired template
2. **Review Requirements**: Check prerequisites and resource needs
3. **Apply Template**: Click "Apply" to load configuration
4. **Customize**: Modify parameters as needed
5. **Execute**: Run the pre-configured test

#### Creating Custom Templates
1. **Configure Test**: Set up your desired test parameters
2. **Save as Template**: Click "Save as Template"
3. **Template Details**:
   - Name and description
   - Category and difficulty
   - Tags for organization
   - Requirements and expected outcomes
4. **Export/Import**: Share templates via JSON export/import

### 4. Test Scheduling

#### Creating Scheduled Tests
1. Go to **Test Scheduler**
2. **Schedule Types**:
   - **Run Once**: Execute at specific date/time
   - **Recurring**: Repeat every X minutes/hours
   - **Cron**: Use cron expressions for complex schedules
3. **Configure Schedule**:
   ```
   Examples:
   ├── Daily at 9 AM: "0 9 * * *"
   ├── Every 30 minutes: Recurring with 30-minute interval
   ├── Weekdays only: "0 9 * * 1-5"
   └── Every hour during business: "0 9-17 * * 1-5"
   ```
4. **Set Parameters**:
   - Test configuration to run
   - Duration and max runs
   - Enable/disable schedule

#### Managing Schedules
- **View Active**: See all scheduled tests and next run times
- **Pause/Resume**: Temporarily disable schedules
- **Edit**: Modify existing schedules
- **History**: View execution history and results

### 5. A/B Testing

#### Setting Up A/B Tests
1. **Navigate to A/B Testing** section
2. **Define Variants**:
   - **Variant A (Control)**: Baseline configuration
   - **Variant B (Test)**: Modified configuration
3. **Configure Split**: Set traffic split ratio (e.g., 50/50)
4. **Success Metrics**:
   - Throughput (TPS)
   - Success rate (%)
   - Average latency (ms)
   - Gas usage (wei)
5. **Test Duration**: Set how long to run the test

#### Analyzing Results
1. **Real-time Progress**: Monitor both variants during execution
2. **Statistical Analysis**: View confidence levels and significance
3. **Winner Determination**: Automated analysis determines best performer
4. **Recommendations**: Get actionable insights based on results

### 6. Block Explorer

#### Exploring Blocks
1. **Navigate to Explorer**
2. **Real-time Block List**: See latest blocks with:
   - Block number and timestamp
   - Transaction count
   - Gas usage percentage
   - Block size and hash
3. **Block Details**: Click any block to view:
   - Complete block information
   - All transactions in the block
   - Miner and difficulty data
   - Gas limits and usage

#### Transaction Analysis
1. **Search Transactions**: Use search bar for specific transaction hash
2. **Transaction Details**: View complete transaction data:
   - From/to addresses
   - Value and gas information
   - Function calls and parameters
   - Execution status and events
3. **Event Logs**: Decoded smart contract events with:
   - Event names and parameters
   - Indexed vs non-indexed data
   - Transaction receipt information

#### Search Functionality
```
Search Formats:
├── Block Number: "12345"
├── Transaction Hash: "0xabc123..."
├── Address: "0x742d35..."
└── Recent: Browse recent blocks/transactions
```

### 7. Network Monitoring

#### Real-time Monitoring
1. **Start Monitor**: Enable network monitoring
2. **Overview Dashboard**:
   - Current block number and timestamp
   - Gas prices (slow/normal/fast)
   - Block utilization percentage
   - Network latency and TPS
3. **Health Status**: Network health from Excellent to Critical

#### Gas Price Analysis
1. **Gas Trends Tab**: View historical gas price charts
2. **Price Tracking**:
   - Current, slow, normal, fast prices
   - 30-minute historical trends
   - Block utilization correlation
3. **Alerts**: Automatic notifications for:
   - High gas prices (50% above average)
   - Network latency issues (>3 seconds)
   - Block utilization >90%

#### Network Alerts
- **Severity Levels**: Low, Medium, High, Critical
- **Alert Types**: Connection issues, performance problems, gas price spikes
- **Management**: Acknowledge alerts, clear notifications
- **History**: View past alerts and patterns

### 8. Custom RPC Networks

#### Adding Custom Networks
1. **Navigate to Custom RPC Manager**
2. **Popular Networks**: Quick setup for:
   - Polygon Mainnet/Mumbai
   - Binance Smart Chain
   - Avalanche C-Chain
   - Arbitrum One
3. **Manual Setup**:
   ```
   Required Fields:
   ├── Network Name: "My Custom Network"
   ├── RPC URL: "https://rpc.example.com"
   ├── Chain ID: 1337
   ├── Currency: Symbol and name
   └── Block Explorer: Optional
   ```
4. **Connection**: Test and connect to custom networks

#### Network Management
- **Health Checks**: Automatic validation and monitoring
- **Connection Status**: Real-time connection monitoring
- **Latency Tracking**: Monitor RPC response times
- **Remove Networks**: Clean up unused configurations

## 🔧 Configuration

### Environment Variables

Create `.env.local` file:

```env
# RPC Endpoints
NEXT_PUBLIC_ANVIL_RPC_URL=http://localhost:8545
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Private Keys (for local testing only)
ANVIL_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Optional: External Services
ETHERSCAN_API_KEY=your_etherscan_api_key
INFURA_PROJECT_ID=your_infura_project_id
```

### Network Configuration

Supported networks are defined in `services/blockchain/chains.ts`:

```typescript
// Add custom network
export const customNetwork = {
  id: 1337,
  name: 'Custom Network',
  network: 'custom',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
    public: { http: ['http://localhost:8545'] }
  }
}
```

## 🧪 Testing Strategies

### 1. Basic Functionality Testing
```
Objective: Verify smart contract functions work correctly
├── Single transactions with various parameters
├── Edge cases (zero values, maximum values)
├── Error conditions and revert scenarios
└── Gas estimation accuracy
```

### 2. Performance Testing
```
Objective: Measure contract performance under normal load
├── Sequential execution (baseline performance)
├── Concurrent execution (parallel processing)
├── Gas optimization analysis
└── Throughput measurement (TPS)
```

### 3. Stress Testing
```
Objective: Find breaking points and limits
├── High-volume transactions (1000+ iterations)
├── Maximum concurrency limits
├── Memory and gas limit testing
└── Network congestion simulation
```

### 4. Load Testing
```
Objective: Test sustained high load over time
├── Extended duration tests (30+ minutes)
├── Multiple user simulation
├── Resource utilization monitoring
└── Performance degradation analysis
```

## 📊 Understanding Results

### Performance Metrics

#### Transaction Throughput (TPS)
- **Good**: >20 TPS for simple operations
- **Average**: 10-20 TPS for complex operations
- **Poor**: <10 TPS indicates bottlenecks

#### Success Rate
- **Excellent**: >99% success rate
- **Good**: 95-99% success rate
- **Poor**: <95% indicates issues

#### Gas Usage
- **Efficient**: Consistent gas usage across transactions
- **Optimized**: Below average gas for similar operations
- **Inefficient**: High variance or excessive gas usage

#### Latency
- **Local (Anvil)**: <100ms average
- **Testnet**: 1-5 seconds average
- **Mainnet**: 5-30 seconds average

### Error Analysis

#### Common Error Types
```
Transaction Errors:
├── Revert: Contract logic rejection
├── Out of Gas: Insufficient gas limit
├── Nonce Issues: Transaction ordering problems
└── Network: Connection or timeout issues

Contract Errors:
├── Insufficient Balance: Not enough tokens/ETH
├── Access Control: Permission denied
├── State Issues: Invalid contract state
└── Parameter Validation: Invalid inputs
```

#### Debugging Steps
1. **Check Error Messages**: Review specific revert reasons
2. **Verify Parameters**: Ensure all inputs are valid
3. **Test Smaller Batches**: Isolate problematic transactions
4. **Review Gas Limits**: Increase if out-of-gas errors
5. **Check Network Status**: Monitor for network issues

## 🚨 Troubleshooting

### Common Issues

#### Connection Problems
```
Issue: Cannot connect to network
Solutions:
├── Check RPC URL is correct and accessible
├── Verify network is running (Anvil for local)
├── Check firewall and network settings
└── Try different RPC endpoint
```

#### Contract Deployment Fails
```
Issue: Contract deployment unsuccessful  
Solutions:
├── Ensure sufficient ETH balance for gas
├── Check contract compilation errors
├── Verify constructor parameters
└── Review gas limits and pricing
```

#### Test Execution Errors
```
Issue: Tests fail or hang
Solutions:
├── Verify contract address is correct
├── Check function exists and is public
├── Ensure proper function arguments
├── Monitor gas usage and limits
└── Review network connectivity
```

#### Performance Issues
```
Issue: Slow test execution
Solutions:
├── Reduce concurrent transaction limits
├── Increase delays between transactions
├── Check network latency and status
├── Use local Anvil for faster testing
└── Optimize contract gas usage
```

### Getting Help

#### Debug Information
When reporting issues, include:
- Contract address and network
- Test configuration (iterations, mode, etc.)
- Error messages and transaction hashes
- Network status and gas prices
- Browser console errors

#### Log Analysis
Check browser developer tools for:
- Network requests and responses
- JavaScript console errors
- Local storage data
- WebSocket connection status

## 🔐 Security Considerations

### Private Keys
- **Never** use mainnet private keys in testing
- Use dedicated test accounts only
- Keep private keys secure and never commit to git
- Anvil provides pre-funded test accounts

### Smart Contracts
- Always test on testnets before mainnet
- Verify contract source code
- Review function permissions and access controls
- Monitor for unexpected behavior during testing

### Network Safety
- Use testnets for experimental features
- Monitor gas costs to prevent excessive spending
- Set reasonable limits on test iterations
- Be cautious with automated/scheduled tests

## 🚀 Advanced Usage

### Custom Test Scenarios

#### Creating Complex Tests
```typescript
// Example: Multi-step token operation
const complexTest = {
  steps: [
    { function: 'approve', args: [spender, amount] },
    { function: 'transferFrom', args: [owner, recipient, amount] },
    { function: 'balanceOf', args: [recipient] }
  ],
  validation: [
    { check: 'balance_increased', target: recipient },
    { check: 'allowance_decreased', target: owner }
  ]
}
```

#### Performance Benchmarking
1. **Baseline Tests**: Establish performance baselines
2. **Regression Testing**: Compare against previous results
3. **Optimization Tracking**: Measure improvement over time
4. **Cross-network Comparison**: Compare performance across networks

### Integration Testing
```typescript
// Example: DeFi protocol testing
const defiTest = {
  contracts: ['token', 'pool', 'router'],
  scenarios: [
    'liquidity_provision',
    'token_swap', 
    'liquidity_removal'
  ],
  metrics: ['slippage', 'price_impact', 'gas_efficiency']
}
```

### Continuous Integration
```yaml
# GitHub Actions example
name: Contract Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run anvil &
      - run: npm run forge:deploy
      - run: npm run test:automated
```

## 📈 Best Practices

### Test Planning
1. **Define Objectives**: Clear goals for each test
2. **Start Small**: Begin with simple scenarios
3. **Gradual Scaling**: Increase complexity incrementally  
4. **Document Results**: Keep detailed test records
5. **Regular Testing**: Establish testing schedules

### Resource Management
1. **Monitor Costs**: Track gas usage and expenses
2. **Optimize Timing**: Test during low-activity periods
3. **Batch Operations**: Group related tests together
4. **Clean Up**: Remove unused contracts and data
5. **Backup Data**: Export important test results

### Result Analysis
1. **Compare Baselines**: Track performance over time
2. **Identify Patterns**: Look for trends and anomalies
3. **Root Cause Analysis**: Investigate failures thoroughly
4. **Document Findings**: Share insights with team
5. **Iterate Improvements**: Apply lessons learned

## 🤝 Contributing

### Development Setup
```bash
# Clone and setup
git clone https://github.com/your-username/contract-stresser.git
cd contract-stresser
npm install

# Development workflow
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Check code style
npm run typecheck    # TypeScript validation
```

### Code Organization
```
contract-stresser/
├── app/             # Next.js pages and API routes
├── components/      # React components
├── services/        # Business logic and external services  
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── types/           # TypeScript definitions
├── contracts/       # Solidity contracts (Foundry)
└── docs/            # Documentation
```

### Adding Features
1. **Plan**: Design new functionality thoroughly
2. **Implement**: Follow existing code patterns
3. **Test**: Add comprehensive tests
4. **Document**: Update README and code comments
5. **Review**: Submit pull request for review

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/your-username/contract-stresser/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/contract-stresser/discussions)
- **Documentation**: This README and inline code documentation

---

**Happy Testing!** 🚀

Built with ❤️ for the Ethereum developer community.