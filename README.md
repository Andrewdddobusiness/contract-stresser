# Contract Stresser

A lightweight web application for stress-testing Ethereum smart contracts, with a focus on ERC-20 tokens and scalability analysis.

## Features

- 🚀 Deploy ERC-20 contracts with custom parameters
- 💥 Execute stress tests with 100-500+ transactions
- 📊 Real-time performance monitoring and visualization
- 🌐 Support for local (Anvil) and testnet (Sepolia) networks
- 📈 Comprehensive analytics and gas usage tracking
- 🔍 Lightweight block explorer for transaction analysis

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Blockchain**: Viem, Wagmi, RainbowKit
- **Smart Contracts**: Foundry (Forge/Anvil)
- **Analytics**: Recharts

## Quick Start

### Prerequisites

- Node.js 18+
- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/contract-stresser.git
cd contract-stresser
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Install Foundry dependencies:
```bash
forge install
```

### Running the Application

1. Start Anvil (local blockchain):
```bash
npm run anvil
```

2. Deploy contracts (in a new terminal):
```bash
npm run forge:build
npm run forge:deploy
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Connect Wallet**: Connect MetaMask or use local Anvil accounts
2. **Deploy Contract**: Navigate to Deploy page and create an ERC-20 token
3. **Configure Test**: Set up your stress test parameters
4. **Run Test**: Execute the test and monitor in real-time
5. **Analyze Results**: View performance metrics and visualizations

## Development

See [tickets/MVP_ROADMAP.md](tickets/MVP_ROADMAP.md) for the development roadmap and phase breakdown.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT