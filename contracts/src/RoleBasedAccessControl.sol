// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title RoleBasedAccessControl
 * @dev Advanced role-based access control with hierarchies, time-based permissions, and conditional access
 */
contract RoleBasedAccessControl is AccessControl, Pausable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;

    // Default roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");
    bytes32 public constant TRADER_ROLE = keccak256("TRADER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    struct RoleData {
        string name;
        string description;
        bytes32 adminRole;
        bool exists;
        bool active;
        uint256 createdAt;
        EnumerableSet.AddressSet members;
        EnumerableSet.Bytes32Set childRoles;
        mapping(string => bool) permissions;
    }

    struct Permission {
        string name;
        string resource;
        address target;
        bool granted;
        uint256 expiresAt;
        uint256 grantedAt;
        address grantedBy;
    }

    struct UserPermission {
        bytes32 role;
        string permission;
        uint256 expiresAt;
        bool active;
    }

    // Storage
    mapping(bytes32 => RoleData) private roles;
    mapping(address => EnumerableSet.Bytes32Set) private userRoles;
    mapping(address => mapping(string => Permission)) private userPermissions;
    mapping(bytes32 => bytes32) private roleHierarchy; // child => parent
    
    EnumerableSet.Bytes32Set private allRoles;
    uint256 private roleCounter;
    uint256 private permissionCounter;

    // Events
    event RoleCreated(bytes32 indexed role, string name, bytes32 indexed adminRole, address indexed creator);
    event RoleUpdated(bytes32 indexed role, string name, string description);
    event RoleActivated(bytes32 indexed role, address indexed admin);
    event RoleDeactivated(bytes32 indexed role, address indexed admin);
    event RoleHierarchyUpdated(bytes32 indexed childRole, bytes32 indexed parentRole);
    
    event PermissionGranted(
        address indexed user,
        bytes32 indexed role,
        string permission,
        address indexed grantedBy,
        uint256 expiresAt
    );
    
    event PermissionRevoked(
        address indexed user,
        bytes32 indexed role,
        string permission,
        address indexed revokedBy
    );
    
    event UserRoleAssigned(address indexed user, bytes32 indexed role, address indexed assignedBy);
    event UserRoleRevoked(address indexed user, bytes32 indexed role, address indexed revokedBy);

    // Modifiers
    modifier roleExists(bytes32 role) {
        require(roles[role].exists, "Role does not exist");
        _;
    }

    modifier roleActive(bytes32 role) {
        require(roles[role].exists && roles[role].active, "Role is not active");
        _;
    }

    modifier onlyRoleAdmin(bytes32 role) {
        require(hasRole(roles[role].adminRole, msg.sender), "Not role admin");
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _initializeDefaultRoles();
    }

    /**
     * @dev Initialize default roles with proper hierarchy
     */
    function _initializeDefaultRoles() internal {
        // Create ADMIN role (top level)
        _createRole(ADMIN_ROLE, "Administrator", "Full system access", DEFAULT_ADMIN_ROLE);
        
        // Create MANAGER role (inherits from USER)
        _createRole(MANAGER_ROLE, "Manager", "Management and operational access", ADMIN_ROLE);
        
        // Create USER role (base role)
        _createRole(USER_ROLE, "User", "Basic user access", MANAGER_ROLE);
        
        // Create TRADER role (inherits from USER)
        _createRole(TRADER_ROLE, "Trader", "Trading and swap permissions", MANAGER_ROLE);
        
        // Create AUDITOR role (read-only)
        _createRole(AUDITOR_ROLE, "Auditor", "Read-only audit access", ADMIN_ROLE);

        // Set up role hierarchy
        _setRoleHierarchy(MANAGER_ROLE, USER_ROLE);
        _setRoleHierarchy(TRADER_ROLE, USER_ROLE);
        
        // Set default permissions
        _setRolePermission(ADMIN_ROLE, "system.admin", true);
        _setRolePermission(ADMIN_ROLE, "user.manage", true);
        _setRolePermission(ADMIN_ROLE, "permission.grant", true);
        _setRolePermission(ADMIN_ROLE, "contract.deploy", true);
        
        _setRolePermission(MANAGER_ROLE, "user.view", true);
        _setRolePermission(MANAGER_ROLE, "operation.execute", true);
        _setRolePermission(MANAGER_ROLE, "report.generate", true);
        _setRolePermission(MANAGER_ROLE, "allowlist.manage", true);
        
        _setRolePermission(USER_ROLE, "operation.view", true);
        _setRolePermission(USER_ROLE, "balance.check", true);
        _setRolePermission(USER_ROLE, "profile.edit", true);
        
        _setRolePermission(TRADER_ROLE, "swap.create", true);
        _setRolePermission(TRADER_ROLE, "swap.execute", true);
        _setRolePermission(TRADER_ROLE, "token.transfer", true);
        _setRolePermission(TRADER_ROLE, "allowance.manage", true);
        
        _setRolePermission(AUDITOR_ROLE, "audit.view", true);
        _setRolePermission(AUDITOR_ROLE, "report.generate", true);
        _setRolePermission(AUDITOR_ROLE, "log.access", true);
    }

    /**
     * @dev Create a new role with permissions
     */
    function createRole(
        bytes32 role,
        string memory name,
        string memory description,
        bytes32 adminRole
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        _createRole(role, name, description, adminRole);
        emit RoleCreated(role, name, adminRole, msg.sender);
    }

    function _createRole(
        bytes32 role,
        string memory name,
        string memory description,
        bytes32 adminRole
    ) internal {
        require(!roles[role].exists, "Role already exists");
        require(bytes(name).length > 0, "Role name cannot be empty");
        
        RoleData storage roleData = roles[role];
        roleData.name = name;
        roleData.description = description;
        roleData.adminRole = adminRole;
        roleData.exists = true;
        roleData.active = true;
        roleData.createdAt = block.timestamp;
        
        allRoles.add(role);
        roleCounter++;
        
        // Set the admin role for the new role
        _setRoleAdmin(role, adminRole);
    }

    /**
     * @dev Update role information
     */
    function updateRole(
        bytes32 role,
        string memory name,
        string memory description
    ) external roleExists(role) onlyRoleAdmin(role) {
        roles[role].name = name;
        roles[role].description = description;
        emit RoleUpdated(role, name, description);
    }

    /**
     * @dev Activate/deactivate a role
     */
    function setRoleActive(bytes32 role, bool active) external roleExists(role) onlyRoleAdmin(role) {
        roles[role].active = active;
        if (active) {
            emit RoleActivated(role, msg.sender);
        } else {
            emit RoleDeactivated(role, msg.sender);
        }
    }

    /**
     * @dev Set role hierarchy (child inherits from parent)
     */
    function setRoleHierarchy(bytes32 childRole, bytes32 parentRole) 
        external 
        roleExists(childRole) 
        roleExists(parentRole) 
        onlyRole(ADMIN_ROLE) 
    {
        _setRoleHierarchy(childRole, parentRole);
    }

    function _setRoleHierarchy(bytes32 childRole, bytes32 parentRole) internal {
        require(childRole != parentRole, "Cannot set self as parent");
        require(!_hasCircularDependency(childRole, parentRole), "Circular dependency detected");
        
        roleHierarchy[childRole] = parentRole;
        roles[parentRole].childRoles.add(childRole);
        
        emit RoleHierarchyUpdated(childRole, parentRole);
    }

    /**
     * @dev Check for circular dependencies in role hierarchy
     */
    function _hasCircularDependency(bytes32 childRole, bytes32 parentRole) internal view returns (bool) {
        bytes32 currentParent = parentRole;
        
        while (currentParent != bytes32(0)) {
            if (currentParent == childRole) {
                return true;
            }
            currentParent = roleHierarchy[currentParent];
        }
        
        return false;
    }

    /**
     * @dev Set permissions for a role
     */
    function setRolePermission(bytes32 role, string memory permission, bool granted) 
        external 
        roleExists(role) 
        onlyRoleAdmin(role) 
    {
        _setRolePermission(role, permission, granted);
    }

    function _setRolePermission(bytes32 role, string memory permission, bool granted) internal {
        roles[role].permissions[permission] = granted;
    }

    /**
     * @dev Grant role to user
     */
    function grantRole(bytes32 role, address account) 
        public 
        override 
        roleActive(role) 
        onlyRoleAdmin(role) 
        whenNotPaused 
    {
        if (!hasRole(role, account)) {
            super.grantRole(role, account);
            userRoles[account].add(role);
            roles[role].members.add(account);
            emit UserRoleAssigned(account, role, msg.sender);
        }
    }

    /**
     * @dev Revoke role from user
     */
    function revokeRole(bytes32 role, address account) 
        public 
        override 
        roleExists(role) 
        onlyRoleAdmin(role) 
    {
        if (hasRole(role, account)) {
            super.revokeRole(role, account);
            userRoles[account].remove(role);
            roles[role].members.remove(account);
            emit UserRoleRevoked(account, role, msg.sender);
        }
    }

    /**
     * @dev Grant time-bound permission to user
     */
    function grantPermission(
        address user,
        bytes32 role,
        string memory permission,
        uint256 expiresAt
    ) external roleExists(role) onlyRoleAdmin(role) whenNotPaused {
        require(user != address(0), "Invalid user address");
        require(bytes(permission).length > 0, "Permission name cannot be empty");
        require(expiresAt == 0 || expiresAt > block.timestamp, "Invalid expiration time");

        Permission storage perm = userPermissions[user][permission];
        perm.name = permission;
        perm.target = address(this);
        perm.granted = true;
        perm.expiresAt = expiresAt;
        perm.grantedAt = block.timestamp;
        perm.grantedBy = msg.sender;

        permissionCounter++;
        emit PermissionGranted(user, role, permission, msg.sender, expiresAt);
    }

    /**
     * @dev Revoke permission from user
     */
    function revokePermission(
        address user,
        bytes32 role,
        string memory permission
    ) external roleExists(role) onlyRoleAdmin(role) {
        Permission storage perm = userPermissions[user][permission];
        require(perm.granted, "Permission not granted");

        perm.granted = false;
        emit PermissionRevoked(user, role, permission, msg.sender);
    }

    /**
     * @dev Check if user has specific permission (with hierarchy and time checks)
     */
    function hasPermission(address user, string memory permission) external view returns (bool) {
        // Check direct permission
        Permission memory directPerm = userPermissions[user][permission];
        if (directPerm.granted && (directPerm.expiresAt == 0 || directPerm.expiresAt > block.timestamp)) {
            return true;
        }

        // Check role-based permissions with hierarchy
        bytes32[] memory userRoleList = getUserRoles(user);
        
        for (uint256 i = 0; i < userRoleList.length; i++) {
            if (_checkRolePermissionWithHierarchy(userRoleList[i], permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @dev Check role permission with hierarchy inheritance
     */
    function _checkRolePermissionWithHierarchy(bytes32 role, string memory permission) 
        internal 
        view 
        returns (bool) 
    {
        // Check direct role permission
        if (roles[role].exists && roles[role].active && roles[role].permissions[permission]) {
            return true;
        }

        // Check parent role permissions
        bytes32 parentRole = roleHierarchy[role];
        if (parentRole != bytes32(0)) {
            return _checkRolePermissionWithHierarchy(parentRole, permission);
        }

        return false;
    }

    /**
     * @dev Check if user has role (including inherited roles)
     */
    function hasRoleWithHierarchy(bytes32 role, address account) external view returns (bool) {
        if (hasRole(role, account)) {
            return true;
        }

        // Check if user has any child role that inherits from this role
        bytes32[] memory userRoleList = getUserRoles(account);
        
        for (uint256 i = 0; i < userRoleList.length; i++) {
            if (_inheritsFromRole(userRoleList[i], role)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @dev Check if childRole inherits from parentRole
     */
    function _inheritsFromRole(bytes32 childRole, bytes32 parentRole) internal view returns (bool) {
        bytes32 currentParent = roleHierarchy[childRole];
        
        while (currentParent != bytes32(0)) {
            if (currentParent == parentRole) {
                return true;
            }
            currentParent = roleHierarchy[currentParent];
        }
        
        return false;
    }

    /**
     * @dev Batch grant roles to multiple users
     */
    function batchGrantRoles(bytes32[] memory rolesToGrant, address[] memory users) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
        nonReentrant 
    {
        require(rolesToGrant.length > 0, "No roles specified");
        require(users.length > 0, "No users specified");

        for (uint256 i = 0; i < rolesToGrant.length; i++) {
            for (uint256 j = 0; j < users.length; j++) {
                grantRole(rolesToGrant[i], users[j]);
            }
        }
    }

    /**
     * @dev Batch revoke roles from multiple users
     */
    function batchRevokeRoles(bytes32[] memory rolesToRevoke, address[] memory users) 
        external 
        onlyRole(ADMIN_ROLE) 
        nonReentrant 
    {
        require(rolesToRevoke.length > 0, "No roles specified");
        require(users.length > 0, "No users specified");

        for (uint256 i = 0; i < rolesToRevoke.length; i++) {
            for (uint256 j = 0; j < users.length; j++) {
                revokeRole(rolesToRevoke[i], users[j]);
            }
        }
    }

    // View functions
    function getRoleInfo(bytes32 role) external view returns (
        string memory name,
        string memory description,
        bytes32 adminRole,
        bool exists,
        bool active,
        uint256 createdAt,
        uint256 memberCount
    ) {
        RoleData storage roleData = roles[role];
        return (
            roleData.name,
            roleData.description,
            roleData.adminRole,
            roleData.exists,
            roleData.active,
            roleData.createdAt,
            roleData.members.length()
        );
    }

    function getRoleMembers(bytes32 role) external view returns (address[] memory) {
        require(roles[role].exists, "Role does not exist");
        return roles[role].members.values();
    }

    function getUserRoles(address user) public view returns (bytes32[] memory) {
        return userRoles[user].values();
    }

    function getAllRoles() external view returns (bytes32[] memory) {
        return allRoles.values();
    }

    function getRoleCount() external view returns (uint256) {
        return roleCounter;
    }

    function getPermissionCount() external view returns (uint256) {
        return permissionCounter;
    }

    function getRolePermission(bytes32 role, string memory permission) external view returns (bool) {
        return roles[role].permissions[permission];
    }

    function getUserPermission(address user, string memory permission) external view returns (
        bool granted,
        uint256 expiresAt,
        uint256 grantedAt,
        address grantedBy
    ) {
        Permission memory perm = userPermissions[user][permission];
        return (perm.granted, perm.expiresAt, perm.grantedAt, perm.grantedBy);
    }

    function getChildRoles(bytes32 role) external view returns (bytes32[] memory) {
        require(roles[role].exists, "Role does not exist");
        return roles[role].childRoles.values();
    }

    function getParentRole(bytes32 role) external view returns (bytes32) {
        return roleHierarchy[role];
    }

    // Admin functions
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // Emergency function to revoke all roles from a user
    function emergencyRevokeAllRoles(address user) external onlyRole(ADMIN_ROLE) {
        bytes32[] memory userRoleList = getUserRoles(user);
        
        for (uint256 i = 0; i < userRoleList.length; i++) {
            revokeRole(userRoleList[i], user);
        }
    }

    // Function to check if contract supports an interface
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}