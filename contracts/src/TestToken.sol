// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestToken
 * @dev ERC-20 token with mint/burn capabilities for testing purposes
 * @notice This token is for testing only and should not be used in production
 */
contract TestToken is ERC20, ERC20Burnable, Ownable {
    uint8 private immutable _customDecimals;

    /**
     * @dev Constructor to initialize the token
     * @param name_ Name of the token
     * @param symbol_ Symbol of the token
     * @param decimals_ Number of decimals for the token
     * @param initialSupply_ Initial supply to mint to the deployer
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _customDecimals = decimals_;
        
        // Mint initial supply to the deployer
        if (initialSupply_ > 0) {
            _mint(msg.sender, initialSupply_);
        }
    }

    /**
     * @dev Returns the number of decimals used to get its user representation
     * @return uint8 The number of decimals
     */
    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }

    /**
     * @dev Mints new tokens to a specified address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @notice Only the owner can mint new tokens
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Mints tokens to multiple addresses in one transaction
     * @param recipients Array of addresses to receive tokens
     * @param amounts Array of amounts to mint to each address
     * @notice Arrays must have the same length
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(
            recipients.length == amounts.length,
            "TestToken: arrays length mismatch"
        );
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Allows any token holder to burn their own tokens
     * @param amount Amount of tokens to burn
     * @notice This is in addition to the burn function from ERC20Burnable
     */
    function burn(uint256 amount) public virtual override {
        super.burn(amount);
    }

    /**
     * @dev Allows the owner to burn tokens from any address
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @notice Only the owner can burn tokens from other addresses
     */
    function burnFrom(address from, uint256 amount) public virtual override {
        if (msg.sender != owner()) {
            // If not owner, use standard burnFrom with allowance check
            super.burnFrom(from, amount);
        } else {
            // If owner, burn without allowance check
            _burn(from, amount);
        }
    }
}