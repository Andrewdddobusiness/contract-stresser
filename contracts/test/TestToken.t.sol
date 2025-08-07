// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TestToken.sol";

contract TestTokenTest is Test {
    TestToken public token;
    address public owner = address(this);
    address public alice = address(0x1);
    address public bob = address(0x2);

    function setUp() public {
        // Deploy token with initial supply of 1 million tokens
        token = new TestToken("Test Token", "TEST", 18, 1_000_000 * 10**18);
    }

    function testInitialState() public {
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TEST");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 1_000_000 * 10**18);
        assertEq(token.balanceOf(owner), 1_000_000 * 10**18);
        assertEq(token.owner(), owner);
    }

    function testMint() public {
        uint256 mintAmount = 100 * 10**18;
        token.mint(alice, mintAmount);
        
        assertEq(token.balanceOf(alice), mintAmount);
        assertEq(token.totalSupply(), 1_000_000 * 10**18 + mintAmount);
    }

    function testMintOnlyOwner() public {
        uint256 mintAmount = 100 * 10**18;
        
        vm.prank(alice);
        vm.expectRevert();
        token.mint(bob, mintAmount);
    }

    function testBatchMint() public {
        address[] memory recipients = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        
        recipients[0] = alice;
        recipients[1] = bob;
        recipients[2] = address(0x3);
        
        amounts[0] = 100 * 10**18;
        amounts[1] = 200 * 10**18;
        amounts[2] = 300 * 10**18;
        
        token.batchMint(recipients, amounts);
        
        assertEq(token.balanceOf(alice), 100 * 10**18);
        assertEq(token.balanceOf(bob), 200 * 10**18);
        assertEq(token.balanceOf(address(0x3)), 300 * 10**18);
        assertEq(token.totalSupply(), 1_000_000 * 10**18 + 600 * 10**18);
    }

    function testBurn() public {
        uint256 burnAmount = 100 * 10**18;
        uint256 initialBalance = token.balanceOf(owner);
        
        token.burn(burnAmount);
        
        assertEq(token.balanceOf(owner), initialBalance - burnAmount);
        assertEq(token.totalSupply(), 1_000_000 * 10**18 - burnAmount);
    }

    function testBurnFromAsOwner() public {
        uint256 mintAmount = 100 * 10**18;
        uint256 burnAmount = 50 * 10**18;
        
        // Mint to alice
        token.mint(alice, mintAmount);
        
        // Owner can burn from alice without allowance
        token.burnFrom(alice, burnAmount);
        
        assertEq(token.balanceOf(alice), mintAmount - burnAmount);
    }

    function testTransfer() public {
        uint256 transferAmount = 100 * 10**18;
        
        token.transfer(alice, transferAmount);
        
        assertEq(token.balanceOf(alice), transferAmount);
        assertEq(token.balanceOf(owner), 1_000_000 * 10**18 - transferAmount);
    }

    function testCustomDecimals() public {
        TestToken customToken = new TestToken("USDC Test", "USDC", 6, 1_000_000 * 10**6);
        
        assertEq(customToken.decimals(), 6);
        assertEq(customToken.totalSupply(), 1_000_000 * 10**6);
    }

    function testZeroInitialSupply() public {
        TestToken zeroToken = new TestToken("Zero Token", "ZERO", 18, 0);
        
        assertEq(zeroToken.totalSupply(), 0);
        assertEq(zeroToken.balanceOf(owner), 0);
    }
}