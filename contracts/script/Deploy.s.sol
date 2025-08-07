// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TestToken.sol";

/**
 * @title Deploy
 * @dev Deployment script for TestToken contract
 * @notice Run with: forge script script/Deploy.s.sol --broadcast --rpc-url <RPC_URL>
 */
contract Deploy is Script {
    // Default configuration
    string constant DEFAULT_NAME = "Test Token";
    string constant DEFAULT_SYMBOL = "TEST";
    uint8 constant DEFAULT_DECIMALS = 18;
    uint256 constant DEFAULT_INITIAL_SUPPLY = 1_000_000 * 10**DEFAULT_DECIMALS; // 1 million tokens

    function run() external {
        // Get configuration from environment variables or use defaults
        string memory name = vm.envOr("TOKEN_NAME", DEFAULT_NAME);
        string memory symbol = vm.envOr("TOKEN_SYMBOL", DEFAULT_SYMBOL);
        uint8 decimals = uint8(vm.envOr("TOKEN_DECIMALS", uint256(DEFAULT_DECIMALS)));
        uint256 initialSupply = vm.envOr("TOKEN_INITIAL_SUPPLY", DEFAULT_INITIAL_SUPPLY);

        // Get deployer private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcast
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract
        TestToken token = new TestToken(name, symbol, decimals, initialSupply);

        // Log deployment information
        console.log("TestToken deployed at:", address(token));
        console.log("Name:", token.name());
        console.log("Symbol:", token.symbol());
        console.log("Decimals:", token.decimals());
        console.log("Initial Supply:", initialSupply);
        console.log("Owner:", token.owner());

        vm.stopBroadcast();
    }

    /**
     * @dev Deploy with custom parameters (useful for testing)
     */
    function deployWithParams(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply
    ) external returns (TestToken) {
        vm.startBroadcast();
        
        TestToken token = new TestToken(name, symbol, decimals, initialSupply);
        
        console.log("TestToken deployed at:", address(token));
        
        vm.stopBroadcast();
        
        return token;
    }

    /**
     * @dev Deploy multiple test tokens at once
     */
    function deployMultiple() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy USDC-like token (6 decimals)
        TestToken usdc = new TestToken(
            "USD Coin Test",
            "USDC",
            6,
            1_000_000 * 10**6
        );
        console.log("USDC Test deployed at:", address(usdc));

        // Deploy WETH-like token (18 decimals)
        TestToken weth = new TestToken(
            "Wrapped Ether Test",
            "WETH",
            18,
            1_000 * 10**18
        );
        console.log("WETH Test deployed at:", address(weth));

        // Deploy DAI-like token (18 decimals)
        TestToken dai = new TestToken(
            "Dai Stablecoin Test",
            "DAI",
            18,
            1_000_000 * 10**18
        );
        console.log("DAI Test deployed at:", address(dai));

        vm.stopBroadcast();
    }
}