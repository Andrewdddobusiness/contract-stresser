# TestToken Contract

This directory contains the ERC-20 TestToken contract for the contract-stresser project.

## Overview

The TestToken is a standard ERC-20 token with additional features for testing:
- Configurable name, symbol, decimals, and initial supply
- Mint functionality (owner only)
- Batch minting capability
- Burn functionality (any holder can burn their tokens)
- Owner can burn from any address

## Contract Details

### TestToken.sol
- Standard ERC-20 implementation using OpenZeppelin
- Includes ERC20Burnable and Ownable extensions
- Configurable decimals (useful for testing different token types like USDC with 6 decimals)

## Deployment

### Local Deployment
```bash
# Start local node (in another terminal)
anvil

# Deploy to local network
forge script script/Deploy.s.sol --broadcast --rpc-url http://localhost:8545 --private-key <PRIVATE_KEY>
```

### Testnet Deployment (Sepolia)
```bash
# Set environment variables
export PRIVATE_KEY=<YOUR_PRIVATE_KEY>
export SEPOLIA_RPC_URL=<YOUR_SEPOLIA_RPC_URL>
export ETHERSCAN_API_KEY=<YOUR_ETHERSCAN_API_KEY>

# Deploy with custom parameters
export TOKEN_NAME="My Test Token"
export TOKEN_SYMBOL="MTT"
export TOKEN_DECIMALS=18
export TOKEN_INITIAL_SUPPLY=1000000000000000000000000  # 1 million tokens

forge script script/Deploy.s.sol --broadcast --rpc-url sepolia --verify
```

### Deploy Multiple Test Tokens
```bash
forge script script/Deploy.s.sol:Deploy --sig "deployMultiple()" --broadcast --rpc-url <RPC_URL> --private-key <PRIVATE_KEY>
```

This will deploy three test tokens:
- USDC Test (6 decimals)
- WETH Test (18 decimals)
- DAI Test (18 decimals)

## Testing

Run the test suite:
```bash
forge test
```

Run with verbosity:
```bash
forge test -vvv
```

## Key Functions

### For Testing
- `mint(address to, uint256 amount)` - Mint new tokens (owner only)
- `batchMint(address[] recipients, uint256[] amounts)` - Mint to multiple addresses
- `burn(uint256 amount)` - Burn your own tokens
- `burnFrom(address from, uint256 amount)` - Owner can burn from any address

### Standard ERC-20
- `transfer(address to, uint256 amount)`
- `approve(address spender, uint256 amount)`
- `transferFrom(address from, address to, uint256 amount)`
- `balanceOf(address account)`
- `totalSupply()`

## Security Note

This token is designed for testing purposes only. Do not use in production without proper security audits and modifications.