// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./RoleBasedAccessControl.sol";

/**
 * @title AllowlistManager
 * @dev Manages multiple allowlists with time-based expiration, batch operations, and role-based admin controls
 */
contract AllowlistManager is Ownable, Pausable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;

    struct Allowlist {
        string name;
        string description;
        address admin;
        bool active;
        uint256 maxEntries;
        uint256 currentEntries;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 expiresAt; // 0 = never expires
        EnumerableSet.AddressSet entries;
        mapping(address => AllowlistEntry) entryData;
    }

    struct AllowlistEntry {
        bool allowed;
        uint256 addedAt;
        uint256 expiresAt; // 0 = never expires
        address addedBy;
        string metadata;
        bool isActive;
    }

    struct AllowlistInfo {
        bytes32 id;
        string name;
        string description;
        address admin;
        bool active;
        uint256 maxEntries;
        uint256 currentEntries;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 expiresAt;
    }

    // Storage
    mapping(bytes32 => Allowlist) public allowlists;
    mapping(address => mapping(bytes32 => bool)) public isAllowed; // user => listId => allowed
    
    EnumerableSet.Bytes32Set private allAllowlistIds;
    RoleBasedAccessControl private rbac;
    
    uint256 private allowlistCounter;
    uint256 private constant MAX_BATCH_SIZE = 100;

    // Events
    event AllowlistCreated(
        bytes32 indexed listId,
        string name,
        address indexed admin,
        uint256 maxEntries,
        uint256 expiresAt
    );

    event AllowlistUpdated(
        bytes32 indexed listId,
        string name,
        string description,
        uint256 maxEntries
    );

    event AllowlistStatusChanged(bytes32 indexed listId, bool active, address indexed admin);

    event AddressesAddedToAllowlist(
        bytes32 indexed listId,
        address[] addresses,
        address indexed addedBy,
        uint256 expiresAt
    );

    event AddressesRemovedFromAllowlist(
        bytes32 indexed listId,
        address[] addresses,
        address indexed removedBy
    );

    event AllowlistEntryUpdated(
        bytes32 indexed listId,
        address indexed user,
        bool allowed,
        uint256 expiresAt,
        address indexed updatedBy
    );

    event AllowlistExpired(bytes32 indexed listId, uint256 timestamp);

    // Modifiers
    modifier allowlistExists(bytes32 listId) {
        require(allowlists[listId].createdAt != 0, "Allowlist does not exist");
        _;
    }

    modifier onlyAllowlistAdmin(bytes32 listId) {
        require(
            allowlists[listId].admin == msg.sender || 
            owner() == msg.sender ||
            (address(rbac) != address(0) && rbac.hasRole(rbac.ADMIN_ROLE(), msg.sender)),
            "Not allowlist admin"
        );
        _;
    }

    modifier allowlistActive(bytes32 listId) {
        require(allowlists[listId].active, "Allowlist is not active");
        require(
            allowlists[listId].expiresAt == 0 || allowlists[listId].expiresAt > block.timestamp,
            "Allowlist has expired"
        );
        _;
    }

    modifier validBatchSize(uint256 size) {
        require(size > 0 && size <= MAX_BATCH_SIZE, "Invalid batch size");
        _;
    }

    constructor(address _rbacAddress) {
        if (_rbacAddress != address(0)) {
            rbac = RoleBasedAccessControl(_rbacAddress);
        }
        allowlistCounter = 0;
    }

    /**
     * @dev Create a new allowlist
     */
    function createAllowlist(
        bytes32 listId,
        string memory name,
        string memory description,
        uint256 maxEntries,
        uint256 expiresAt
    ) external whenNotPaused nonReentrant {
        require(listId != bytes32(0), "Invalid list ID");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(maxEntries > 0, "Max entries must be greater than 0");
        require(allowlists[listId].createdAt == 0, "Allowlist already exists");
        require(expiresAt == 0 || expiresAt > block.timestamp, "Invalid expiration time");

        Allowlist storage allowlist = allowlists[listId];
        allowlist.name = name;
        allowlist.description = description;
        allowlist.admin = msg.sender;
        allowlist.active = true;
        allowlist.maxEntries = maxEntries;
        allowlist.currentEntries = 0;
        allowlist.createdAt = block.timestamp;
        allowlist.updatedAt = block.timestamp;
        allowlist.expiresAt = expiresAt;

        allAllowlistIds.add(listId);
        allowlistCounter++;

        emit AllowlistCreated(listId, name, msg.sender, maxEntries, expiresAt);
    }

    /**
     * @dev Update allowlist information
     */
    function updateAllowlist(
        bytes32 listId,
        string memory name,
        string memory description,
        uint256 maxEntries
    ) external allowlistExists(listId) onlyAllowlistAdmin(listId) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(maxEntries >= allowlists[listId].currentEntries, "Max entries cannot be less than current entries");

        Allowlist storage allowlist = allowlists[listId];
        allowlist.name = name;
        allowlist.description = description;
        allowlist.maxEntries = maxEntries;
        allowlist.updatedAt = block.timestamp;

        emit AllowlistUpdated(listId, name, description, maxEntries);
    }

    /**
     * @dev Set allowlist active status
     */
    function setAllowlistActive(bytes32 listId, bool active) 
        external 
        allowlistExists(listId) 
        onlyAllowlistAdmin(listId) 
    {
        allowlists[listId].active = active;
        allowlists[listId].updatedAt = block.timestamp;

        emit AllowlistStatusChanged(listId, active, msg.sender);
    }

    /**
     * @dev Add addresses to allowlist
     */
    function addToAllowlist(
        bytes32 listId,
        address[] memory addresses,
        uint256 expiresAt,
        string memory metadata
    ) external 
        allowlistExists(listId) 
        allowlistActive(listId) 
        onlyAllowlistAdmin(listId) 
        validBatchSize(addresses.length)
        whenNotPaused 
        nonReentrant 
    {
        require(expiresAt == 0 || expiresAt > block.timestamp, "Invalid expiration time");
        
        Allowlist storage allowlist = allowlists[listId];
        
        // Count new unique addresses
        uint256 newAddressCount = 0;
        for (uint256 i = 0; i < addresses.length; i++) {
            require(addresses[i] != address(0), "Invalid address");
            
            if (!allowlist.entries.contains(addresses[i])) {
                newAddressCount++;
            }
        }
        
        require(
            allowlist.currentEntries + newAddressCount <= allowlist.maxEntries,
            "Would exceed max entries"
        );

        // Add addresses to allowlist
        for (uint256 i = 0; i < addresses.length; i++) {
            address user = addresses[i];
            
            if (!allowlist.entries.contains(user)) {
                allowlist.entries.add(user);
                allowlist.currentEntries++;
            }

            // Update entry data
            AllowlistEntry storage entry = allowlist.entryData[user];
            entry.allowed = true;
            entry.addedAt = block.timestamp;
            entry.expiresAt = expiresAt;
            entry.addedBy = msg.sender;
            entry.metadata = metadata;
            entry.isActive = true;

            // Update quick lookup
            isAllowed[user][listId] = true;
        }

        allowlist.updatedAt = block.timestamp;
        emit AddressesAddedToAllowlist(listId, addresses, msg.sender, expiresAt);
    }

    /**
     * @dev Remove addresses from allowlist
     */
    function removeFromAllowlist(
        bytes32 listId,
        address[] memory addresses
    ) external 
        allowlistExists(listId) 
        onlyAllowlistAdmin(listId) 
        validBatchSize(addresses.length)
        nonReentrant 
    {
        Allowlist storage allowlist = allowlists[listId];

        for (uint256 i = 0; i < addresses.length; i++) {
            address user = addresses[i];
            
            if (allowlist.entries.contains(user)) {
                allowlist.entries.remove(user);
                allowlist.currentEntries--;
                
                // Update entry data
                allowlist.entryData[user].allowed = false;
                allowlist.entryData[user].isActive = false;
                
                // Update quick lookup
                isAllowed[user][listId] = false;
            }
        }

        allowlist.updatedAt = block.timestamp;
        emit AddressesRemovedFromAllowlist(listId, addresses, msg.sender);
    }

    /**
     * @dev Update single allowlist entry
     */
    function updateAllowlistEntry(
        bytes32 listId,
        address user,
        bool allowed,
        uint256 expiresAt,
        string memory metadata
    ) external 
        allowlistExists(listId) 
        onlyAllowlistAdmin(listId) 
        whenNotPaused 
    {
        require(user != address(0), "Invalid address");
        require(expiresAt == 0 || expiresAt > block.timestamp, "Invalid expiration time");

        Allowlist storage allowlist = allowlists[listId];
        
        if (allowed && !allowlist.entries.contains(user)) {
            require(allowlist.currentEntries < allowlist.maxEntries, "Allowlist is full");
            allowlist.entries.add(user);
            allowlist.currentEntries++;
        } else if (!allowed && allowlist.entries.contains(user)) {
            allowlist.entries.remove(user);
            allowlist.currentEntries--;
        }

        // Update entry data
        AllowlistEntry storage entry = allowlist.entryData[user];
        entry.allowed = allowed;
        entry.addedAt = block.timestamp;
        entry.expiresAt = expiresAt;
        entry.addedBy = msg.sender;
        entry.metadata = metadata;
        entry.isActive = allowed;

        // Update quick lookup
        isAllowed[user][listId] = allowed;

        allowlist.updatedAt = block.timestamp;
        emit AllowlistEntryUpdated(listId, user, allowed, expiresAt, msg.sender);
    }

    /**
     * @dev Check if address is in allowlist (with expiration check)
     */
    function checkAllowlist(bytes32 listId, address user) external view returns (bool) {
        if (!allowlists[listId].active) return false;
        
        // Check allowlist expiration
        if (allowlists[listId].expiresAt != 0 && allowlists[listId].expiresAt <= block.timestamp) {
            return false;
        }

        // Check if user is in allowlist
        if (!allowlists[listId].entries.contains(user)) return false;
        
        AllowlistEntry memory entry = allowlists[listId].entryData[user];
        
        // Check entry expiration
        if (entry.expiresAt != 0 && entry.expiresAt <= block.timestamp) {
            return false;
        }

        return entry.allowed && entry.isActive;
    }

    /**
     * @dev Batch check multiple addresses against allowlist
     */
    function batchCheckAllowlist(bytes32 listId, address[] memory addresses) 
        external 
        view 
        returns (bool[] memory) 
    {
        bool[] memory results = new bool[](addresses.length);
        
        for (uint256 i = 0; i < addresses.length; i++) {
            results[i] = this.checkAllowlist(listId, addresses[i]);
        }
        
        return results;
    }

    /**
     * @dev Clean expired entries from allowlist
     */
    function cleanExpiredEntries(bytes32 listId) 
        external 
        allowlistExists(listId) 
        onlyAllowlistAdmin(listId) 
        nonReentrant 
    {
        Allowlist storage allowlist = allowlists[listId];
        address[] memory allEntries = allowlist.entries.values();
        address[] memory expiredAddresses = new address[](allEntries.length);
        uint256 expiredCount = 0;

        for (uint256 i = 0; i < allEntries.length; i++) {
            address user = allEntries[i];
            AllowlistEntry memory entry = allowlist.entryData[user];
            
            if (entry.expiresAt != 0 && entry.expiresAt <= block.timestamp) {
                expiredAddresses[expiredCount] = user;
                expiredCount++;
            }
        }

        if (expiredCount > 0) {
            // Create array with exact size
            address[] memory toRemove = new address[](expiredCount);
            for (uint256 i = 0; i < expiredCount; i++) {
                toRemove[i] = expiredAddresses[i];
            }
            
            // Remove expired addresses
            for (uint256 i = 0; i < expiredCount; i++) {
                address user = toRemove[i];
                allowlist.entries.remove(user);
                allowlist.currentEntries--;
                allowlist.entryData[user].allowed = false;
                allowlist.entryData[user].isActive = false;
                isAllowed[user][listId] = false;
            }
            
            allowlist.updatedAt = block.timestamp;
            emit AddressesRemovedFromAllowlist(listId, toRemove, msg.sender);
        }
    }

    /**
     * @dev Mark allowlist as expired
     */
    function expireAllowlist(bytes32 listId) external allowlistExists(listId) {
        Allowlist storage allowlist = allowlists[listId];
        
        require(
            allowlist.expiresAt != 0 && allowlist.expiresAt <= block.timestamp,
            "Allowlist has not reached expiration time"
        );
        
        allowlist.active = false;
        emit AllowlistExpired(listId, block.timestamp);
    }

    // View functions
    function getAllowlistInfo(bytes32 listId) external view returns (AllowlistInfo memory) {
        Allowlist storage allowlist = allowlists[listId];
        require(allowlist.createdAt != 0, "Allowlist does not exist");
        
        return AllowlistInfo({
            id: listId,
            name: allowlist.name,
            description: allowlist.description,
            admin: allowlist.admin,
            active: allowlist.active,
            maxEntries: allowlist.maxEntries,
            currentEntries: allowlist.currentEntries,
            createdAt: allowlist.createdAt,
            updatedAt: allowlist.updatedAt,
            expiresAt: allowlist.expiresAt
        });
    }

    function getAllowlistEntries(bytes32 listId) external view returns (address[] memory) {
        require(allowlists[listId].createdAt != 0, "Allowlist does not exist");
        return allowlists[listId].entries.values();
    }

    function getAllowlistEntryData(bytes32 listId, address user) external view returns (
        bool allowed,
        uint256 addedAt,
        uint256 expiresAt,
        address addedBy,
        string memory metadata,
        bool isActive
    ) {
        AllowlistEntry memory entry = allowlists[listId].entryData[user];
        return (
            entry.allowed,
            entry.addedAt,
            entry.expiresAt,
            entry.addedBy,
            entry.metadata,
            entry.isActive
        );
    }

    function getAllAllowlists() external view returns (bytes32[] memory) {
        return allAllowlistIds.values();
    }

    function getAllowlistCount() external view returns (uint256) {
        return allowlistCounter;
    }

    function getUserAllowlists(address user) external view returns (bytes32[] memory) {
        bytes32[] memory allIds = allAllowlistIds.values();
        bytes32[] memory userAllowlists = new bytes32[](allIds.length);
        uint256 count = 0;

        for (uint256 i = 0; i < allIds.length; i++) {
            bytes32 listId = allIds[i];
            if (this.checkAllowlist(listId, user)) {
                userAllowlists[count] = listId;
                count++;
            }
        }

        // Return array with exact size
        bytes32[] memory result = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = userAllowlists[i];
        }

        return result;
    }

    // Admin functions
    function setRBACContract(address _rbacAddress) external onlyOwner {
        rbac = RoleBasedAccessControl(_rbacAddress);
    }

    function transferAllowlistAdmin(bytes32 listId, address newAdmin) 
        external 
        allowlistExists(listId) 
        onlyAllowlistAdmin(listId) 
    {
        require(newAdmin != address(0), "Invalid admin address");
        allowlists[listId].admin = newAdmin;
        allowlists[listId].updatedAt = block.timestamp;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency function to remove allowlist
    function emergencyRemoveAllowlist(bytes32 listId) external onlyOwner {
        require(allowlists[listId].createdAt != 0, "Allowlist does not exist");
        
        Allowlist storage allowlist = allowlists[listId];
        address[] memory allEntries = allowlist.entries.values();
        
        // Clear all entries
        for (uint256 i = 0; i < allEntries.length; i++) {
            isAllowed[allEntries[i]][listId] = false;
        }
        
        // Remove from global tracking
        allAllowlistIds.remove(listId);
        delete allowlists[listId];
        
        if (allowlistCounter > 0) {
            allowlistCounter--;
        }
    }
}