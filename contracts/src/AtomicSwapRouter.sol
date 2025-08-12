// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title AtomicSwapRouter
 * @dev Handles atomic swaps between different token standards (ERC20 <-> ERC1155)
 */
contract AtomicSwapRouter is ERC1155Holder, ReentrancyGuard, Pausable, Ownable {
    using ECDSA for bytes32;

    enum SwapStatus {
        None,
        Created,
        Completed,
        Cancelled,
        Expired
    }

    enum SwapType {
        ERC20_TO_ERC20,
        ERC20_TO_ERC1155,
        ERC1155_TO_ERC20,
        ERC1155_TO_ERC1155
    }

    struct SwapOrder {
        bytes32 id;
        SwapType swapType;
        address creator;
        address counterparty;
        
        // Token A (what creator offers)
        address tokenA;
        uint256 amountA;
        uint256 tokenIdA; // Only for ERC1155
        
        // Token B (what creator wants)
        address tokenB;
        uint256 amountB;
        uint256 tokenIdB; // Only for ERC1155
        
        uint256 deadline;
        bytes32 secretHash;
        SwapStatus status;
        uint256 createdAt;
        uint256 executedAt;
    }

    struct BatchSwap {
        bytes32[] swapIds;
        uint256 deadline;
        bool requireAllSuccess;
        SwapStatus status;
    }

    // Storage
    mapping(bytes32 => SwapOrder) public swapOrders;
    mapping(bytes32 => BatchSwap) public batchSwaps;
    mapping(address => bytes32[]) public userSwaps;
    
    bytes32[] public allSwapIds;
    uint256 public swapCounter;
    uint256 public completedSwaps;
    uint256 public cancelledSwaps;

    // Configuration
    uint256 public minDeadline = 1 hours;
    uint256 public maxDeadline = 30 days;
    uint256 public platformFee = 0; // Fee in basis points (0 = no fee)
    address public feeRecipient;

    // Events
    event SwapCreated(
        bytes32 indexed swapId,
        address indexed creator,
        address indexed counterparty,
        SwapType swapType,
        uint256 deadline
    );

    event SwapExecuted(
        bytes32 indexed swapId,
        address indexed executor,
        bytes32 secret,
        uint256 timestamp
    );

    event SwapCancelled(
        bytes32 indexed swapId,
        address indexed canceller,
        uint256 timestamp
    );

    event SwapExpired(
        bytes32 indexed swapId,
        uint256 timestamp
    );

    event BatchSwapCreated(
        bytes32 indexed batchId,
        bytes32[] swapIds,
        uint256 deadline
    );

    event BatchSwapExecuted(
        bytes32 indexed batchId,
        uint256 successCount,
        uint256 totalCount
    );

    // Modifiers
    modifier onlyValidSwap(bytes32 swapId) {
        require(swapOrders[swapId].status != SwapStatus.None, "Swap does not exist");
        require(swapOrders[swapId].status == SwapStatus.Created, "Swap not available");
        require(block.timestamp <= swapOrders[swapId].deadline, "Swap expired");
        _;
    }

    modifier onlySwapParticipant(bytes32 swapId) {
        SwapOrder memory swap = swapOrders[swapId];
        require(
            msg.sender == swap.creator || msg.sender == swap.counterparty,
            "Not a swap participant"
        );
        _;
    }

    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient == address(0) ? owner() : _feeRecipient;
    }

    /**
     * @dev Create a new atomic swap order
     */
    function createSwapOrder(
        SwapType swapType,
        address counterparty,
        address tokenA,
        uint256 amountA,
        uint256 tokenIdA,
        address tokenB,
        uint256 amountB,
        uint256 tokenIdB,
        uint256 deadline,
        bytes32 secretHash
    ) external whenNotPaused nonReentrant returns (bytes32 swapId) {
        require(counterparty != address(0), "Invalid counterparty");
        require(counterparty != msg.sender, "Cannot swap with yourself");
        require(tokenA != tokenB || tokenIdA != tokenIdB, "Cannot swap identical tokens");
        require(deadline >= block.timestamp + minDeadline, "Deadline too soon");
        require(deadline <= block.timestamp + maxDeadline, "Deadline too late");
        require(secretHash != bytes32(0), "Invalid secret hash");

        swapId = keccak256(abi.encodePacked(
            msg.sender,
            counterparty,
            tokenA,
            tokenB,
            amountA,
            amountB,
            block.timestamp,
            swapCounter++
        ));

        // Validate and transfer tokens from creator
        _validateAndLockTokens(swapType, true, tokenA, amountA, tokenIdA);

        SwapOrder storage swap = swapOrders[swapId];
        swap.id = swapId;
        swap.swapType = swapType;
        swap.creator = msg.sender;
        swap.counterparty = counterparty;
        swap.tokenA = tokenA;
        swap.amountA = amountA;
        swap.tokenIdA = tokenIdA;
        swap.tokenB = tokenB;
        swap.amountB = amountB;
        swap.tokenIdB = tokenIdB;
        swap.deadline = deadline;
        swap.secretHash = secretHash;
        swap.status = SwapStatus.Created;
        swap.createdAt = block.timestamp;

        allSwapIds.push(swapId);
        userSwaps[msg.sender].push(swapId);
        userSwaps[counterparty].push(swapId);

        emit SwapCreated(swapId, msg.sender, counterparty, swapType, deadline);
    }

    /**
     * @dev Execute an atomic swap with the secret
     */
    function executeSwap(
        bytes32 swapId,
        bytes memory secret
    ) external whenNotPaused nonReentrant onlyValidSwap(swapId) {
        SwapOrder storage swap = swapOrders[swapId];
        
        // Verify the secret matches the hash
        require(keccak256(secret) == swap.secretHash, "Invalid secret");
        
        // Only counterparty can execute (revealing the secret)
        require(msg.sender == swap.counterparty, "Only counterparty can execute");

        // Lock counterparty's tokens
        _validateAndLockTokens(swap.swapType, false, swap.tokenB, swap.amountB, swap.tokenIdB);

        // Execute the swap
        _performSwap(swap);

        swap.status = SwapStatus.Completed;
        swap.executedAt = block.timestamp;
        completedSwaps++;

        emit SwapExecuted(swapId, msg.sender, keccak256(secret), block.timestamp);
    }

    /**
     * @dev Cancel a swap order (only creator before execution)
     */
    function cancelSwap(bytes32 swapId) external onlySwapParticipant(swapId) {
        SwapOrder storage swap = swapOrders[swapId];
        require(swap.status == SwapStatus.Created, "Swap cannot be cancelled");
        
        // Return locked tokens to creator
        _returnTokens(swap.swapType, true, swap.creator, swap.tokenA, swap.amountA, swap.tokenIdA);

        swap.status = SwapStatus.Cancelled;
        cancelledSwaps++;

        emit SwapCancelled(swapId, msg.sender, block.timestamp);
    }

    /**
     * @dev Expire a swap order after deadline
     */
    function expireSwap(bytes32 swapId) external {
        SwapOrder storage swap = swapOrders[swapId];
        require(swap.status == SwapStatus.Created, "Swap not active");
        require(block.timestamp > swap.deadline, "Swap not yet expired");

        // Return locked tokens to creator
        _returnTokens(swap.swapType, true, swap.creator, swap.tokenA, swap.amountA, swap.tokenIdA);

        swap.status = SwapStatus.Expired;

        emit SwapExpired(swapId, block.timestamp);
    }

    /**
     * @dev Create a batch of atomic swaps
     */
    function createBatchSwap(
        bytes32[] calldata swapIds,
        uint256 deadline,
        bool requireAllSuccess
    ) external whenNotPaused returns (bytes32 batchId) {
        require(swapIds.length > 1, "Batch must contain multiple swaps");
        require(deadline >= block.timestamp + minDeadline, "Deadline too soon");

        // Verify all swaps exist and user is participant
        for (uint256 i = 0; i < swapIds.length; i++) {
            SwapOrder memory swap = swapOrders[swapIds[i]];
            require(swap.status == SwapStatus.Created, "Invalid swap in batch");
            require(
                msg.sender == swap.creator || msg.sender == swap.counterparty,
                "Not participant in all swaps"
            );
        }

        batchId = keccak256(abi.encodePacked(
            msg.sender,
            swapIds,
            deadline,
            block.timestamp
        ));

        BatchSwap storage batch = batchSwaps[batchId];
        batch.swapIds = swapIds;
        batch.deadline = deadline;
        batch.requireAllSuccess = requireAllSuccess;
        batch.status = SwapStatus.Created;

        emit BatchSwapCreated(batchId, swapIds, deadline);
    }

    /**
     * @dev Execute a batch of atomic swaps
     */
    function executeBatchSwap(
        bytes32 batchId,
        bytes[] calldata secrets
    ) external whenNotPaused nonReentrant {
        BatchSwap storage batch = batchSwaps[batchId];
        require(batch.status == SwapStatus.Created, "Batch not available");
        require(block.timestamp <= batch.deadline, "Batch expired");
        require(secrets.length == batch.swapIds.length, "Secret count mismatch");

        uint256 successCount = 0;
        
        for (uint256 i = 0; i < batch.swapIds.length; i++) {
            bytes32 swapId = batch.swapIds[i];
            SwapOrder storage swap = swapOrders[swapId];

            if (swap.status == SwapStatus.Created && 
                block.timestamp <= swap.deadline &&
                keccak256(secrets[i]) == swap.secretHash) {
                
                try this._executeSingleSwap(swapId, secrets[i]) {
                    successCount++;
                } catch {
                    if (batch.requireAllSuccess) {
                        revert("Batch execution failed - all swaps required");
                    }
                }
            } else if (batch.requireAllSuccess) {
                revert("Batch execution failed - invalid swap");
            }
        }

        require(successCount > 0, "No swaps executed successfully");

        batch.status = SwapStatus.Completed;
        emit BatchSwapExecuted(batchId, successCount, batch.swapIds.length);
    }

    /**
     * @dev Internal function to execute a single swap (for batch operations)
     */
    function _executeSingleSwap(bytes32 swapId, bytes calldata secret) external {
        require(msg.sender == address(this), "Internal function only");
        
        SwapOrder storage swap = swapOrders[swapId];
        
        // Lock counterparty's tokens
        _validateAndLockTokens(swap.swapType, false, swap.tokenB, swap.amountB, swap.tokenIdB);
        
        // Perform the swap
        _performSwap(swap);
        
        swap.status = SwapStatus.Completed;
        swap.executedAt = block.timestamp;
    }

    /**
     * @dev Validate and lock tokens for a swap
     */
    function _validateAndLockTokens(
        SwapType swapType,
        bool isTokenA,
        address token,
        uint256 amount,
        uint256 tokenId
    ) internal {
        if (swapType == SwapType.ERC20_TO_ERC20 || 
            (swapType == SwapType.ERC20_TO_ERC1155 && isTokenA) ||
            (swapType == SwapType.ERC1155_TO_ERC20 && !isTokenA)) {
            
            // ERC20 token
            require(IERC20(token).transferFrom(msg.sender, address(this), amount), "ERC20 transfer failed");
        } else {
            // ERC1155 token
            IERC1155(token).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        }
    }

    /**
     * @dev Return tokens to user (on cancellation/expiry)
     */
    function _returnTokens(
        SwapType swapType,
        bool isTokenA,
        address recipient,
        address token,
        uint256 amount,
        uint256 tokenId
    ) internal {
        if (swapType == SwapType.ERC20_TO_ERC20 || 
            (swapType == SwapType.ERC20_TO_ERC1155 && isTokenA) ||
            (swapType == SwapType.ERC1155_TO_ERC20 && !isTokenA)) {
            
            // ERC20 token
            require(IERC20(token).transfer(recipient, amount), "ERC20 return failed");
        } else {
            // ERC1155 token
            IERC1155(token).safeTransferFrom(address(this), recipient, tokenId, amount, "");
        }
    }

    /**
     * @dev Perform the actual token swap
     */
    function _performSwap(SwapOrder storage swap) internal {
        // Calculate fee if applicable
        uint256 feeA = (swap.amountA * platformFee) / 10000;
        uint256 feeB = (swap.amountB * platformFee) / 10000;

        // Transfer token A to counterparty (minus fee)
        if (swap.swapType == SwapType.ERC20_TO_ERC20 || swap.swapType == SwapType.ERC20_TO_ERC1155) {
            require(IERC20(swap.tokenA).transfer(swap.counterparty, swap.amountA - feeA), "TokenA transfer failed");
            if (feeA > 0) {
                require(IERC20(swap.tokenA).transfer(feeRecipient, feeA), "Fee transfer failed");
            }
        } else {
            IERC1155(swap.tokenA).safeTransferFrom(address(this), swap.counterparty, swap.tokenIdA, swap.amountA - feeA, "");
            if (feeA > 0) {
                IERC1155(swap.tokenA).safeTransferFrom(address(this), feeRecipient, swap.tokenIdA, feeA, "");
            }
        }

        // Transfer token B to creator (minus fee)
        if (swap.swapType == SwapType.ERC20_TO_ERC20 || swap.swapType == SwapType.ERC1155_TO_ERC20) {
            require(IERC20(swap.tokenB).transfer(swap.creator, swap.amountB - feeB), "TokenB transfer failed");
            if (feeB > 0) {
                require(IERC20(swap.tokenB).transfer(feeRecipient, feeB), "Fee transfer failed");
            }
        } else {
            IERC1155(swap.tokenB).safeTransferFrom(address(this), swap.creator, swap.tokenIdB, swap.amountB - feeB, "");
            if (feeB > 0) {
                IERC1155(swap.tokenB).safeTransferFrom(address(this), feeRecipient, swap.tokenIdB, feeB, "");
            }
        }
    }

    // View functions
    function getSwapOrder(bytes32 swapId) external view returns (SwapOrder memory) {
        return swapOrders[swapId];
    }

    function getUserSwaps(address user) external view returns (bytes32[] memory) {
        return userSwaps[user];
    }

    function getAllSwaps() external view returns (bytes32[] memory) {
        return allSwapIds;
    }

    function getSwapCount() external view returns (uint256) {
        return allSwapIds.length;
    }

    function getStats() external view returns (uint256, uint256, uint256) {
        return (allSwapIds.length, completedSwaps, cancelledSwaps);
    }

    // Admin functions
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        platformFee = _fee;
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        feeRecipient = _recipient;
    }

    function setDeadlineLimits(uint256 _minDeadline, uint256 _maxDeadline) external onlyOwner {
        require(_minDeadline <= _maxDeadline, "Invalid deadline limits");
        minDeadline = _minDeadline;
        maxDeadline = _maxDeadline;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency function to recover stuck tokens
    function emergencyRecoverToken(address token, uint256 amount, uint256 tokenId, bool isERC1155) external onlyOwner {
        if (isERC1155) {
            IERC1155(token).safeTransferFrom(address(this), owner(), tokenId, amount, "");
        } else {
            require(IERC20(token).transfer(owner(), amount), "Recovery failed");
        }
    }
}