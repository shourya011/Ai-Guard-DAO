// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Timelock
 * @author Monad DAO Team
 * @notice Delays execution of governance actions for security
 * @dev Required delay between proposal passing and execution
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                           TIMELOCK                                         ║
 * ║                                                                            ║
 * ║  PURPOSE:                                                                  ║
 * ║  - Delay execution of passed proposals                                    ║
 * ║  - Give users time to react to changes                                    ║
 * ║  - Allow exit before contentious changes                                  ║
 * ║  - Enable emergency cancellation                                          ║
 * ║                                                                            ║
 * ║  WORKFLOW:                                                                 ║
 * ║  1. Proposal passes voting                                                ║
 * ║  2. Proposal queued in timelock                                           ║
 * ║  3. Wait for delay period (e.g., 2 days)                                  ║
 * ║  4. Execute after delay                                                   ║
 * ║                                                                            ║
 * ║  MACHINE DATA:                                                             ║
 * ║  - Transaction hash                                                       ║
 * ║  - ETA (timestamp when executable)                                        ║
 * ║  - Executed/canceled flags                                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
contract Timelock {
    
    // ============ STATE VARIABLES ============
    
    /// @notice Minimum delay (seconds)
    uint256 public constant MINIMUM_DELAY = 1 hours;
    
    /// @notice Maximum delay (seconds)
    uint256 public constant MAXIMUM_DELAY = 30 days;
    
    /// @notice Grace period after ETA
    uint256 public constant GRACE_PERIOD = 14 days;
    
    /// @notice Admin (typically DAO governance)
    address public admin;
    
    /// @notice Pending admin for 2-step transfer
    address public pendingAdmin;
    
    /// @notice Current delay
    uint256 public delay;
    
    /// @notice Queued transactions
    mapping(bytes32 => bool) public queuedTransactions;

    // ============ ERRORS ============
    
    error Unauthorized();
    error InvalidDelay();
    error TransactionNotQueued();
    error TransactionAlreadyQueued();
    error TimelockNotPassed();
    error TransactionStale();
    error ExecutionFailed();

    // ============ EVENTS ============
    
    event NewAdmin(address indexed newAdmin);
    event NewPendingAdmin(address indexed pendingAdmin);
    event NewDelay(uint256 indexed delay);
    event QueueTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );
    event CancelTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );
    event ExecuteTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );

    // ============ CONSTRUCTOR ============
    
    /**
     * @notice Create timelock
     * @param _admin Admin address
     * @param _delay Initial delay (seconds)
     */
    constructor(address _admin, uint256 _delay) {
        if (_delay < MINIMUM_DELAY || _delay > MAXIMUM_DELAY) {
            revert InvalidDelay();
        }
        
        admin = _admin;
        delay = _delay;
    }

    // ============ MODIFIERS ============
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Set new delay
     * @param _delay New delay in seconds
     */
    function setDelay(uint256 _delay) external {
        if (msg.sender != address(this)) revert Unauthorized();
        if (_delay < MINIMUM_DELAY || _delay > MAXIMUM_DELAY) {
            revert InvalidDelay();
        }
        
        delay = _delay;
        emit NewDelay(_delay);
    }
    
    /**
     * @notice Accept admin role (2-step transfer)
     */
    function acceptAdmin() external {
        if (msg.sender != pendingAdmin) revert Unauthorized();
        admin = msg.sender;
        pendingAdmin = address(0);
        emit NewAdmin(msg.sender);
    }
    
    /**
     * @notice Set pending admin for transfer
     * @param _pendingAdmin New pending admin
     */
    function setPendingAdmin(address _pendingAdmin) external {
        if (msg.sender != address(this)) revert Unauthorized();
        pendingAdmin = _pendingAdmin;
        emit NewPendingAdmin(_pendingAdmin);
    }

    // ============ QUEUE/EXECUTE FUNCTIONS ============
    
    /**
     * @notice Queue a transaction for delayed execution
     * @param target Target contract
     * @param value ETH value
     * @param signature Function signature
     * @param data Encoded parameters
     * @param eta Earliest execution time
     */
    function queueTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external onlyAdmin returns (bytes32 txHash) {
        if (eta < block.timestamp + delay) revert TimelockNotPassed();
        
        txHash = _getTxHash(target, value, signature, data, eta);
        
        if (queuedTransactions[txHash]) revert TransactionAlreadyQueued();
        
        queuedTransactions[txHash] = true;
        
        emit QueueTransaction(txHash, target, value, signature, data, eta);
        
        return txHash;
    }
    
    /**
     * @notice Cancel a queued transaction
     */
    function cancelTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external onlyAdmin {
        bytes32 txHash = _getTxHash(target, value, signature, data, eta);
        
        if (!queuedTransactions[txHash]) revert TransactionNotQueued();
        
        queuedTransactions[txHash] = false;
        
        emit CancelTransaction(txHash, target, value, signature, data, eta);
    }
    
    /**
     * @notice Execute a queued transaction
     */
    function executeTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external payable onlyAdmin returns (bytes memory) {
        bytes32 txHash = _getTxHash(target, value, signature, data, eta);
        
        if (!queuedTransactions[txHash]) revert TransactionNotQueued();
        if (block.timestamp < eta) revert TimelockNotPassed();
        if (block.timestamp > eta + GRACE_PERIOD) revert TransactionStale();
        
        queuedTransactions[txHash] = false;
        
        bytes memory callData;
        
        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(
                bytes4(keccak256(bytes(signature))),
                data
            );
        }
        
        (bool success, bytes memory returnData) = target.call{value: value}(callData);
        
        if (!success) revert ExecutionFailed();
        
        emit ExecuteTransaction(txHash, target, value, signature, data, eta);
        
        return returnData;
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get transaction hash
     */
    function _getTxHash(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(target, value, signature, data, eta)
        );
    }
    
    /**
     * @notice Check if transaction is queued
     */
    function isQueued(bytes32 txHash) external view returns (bool) {
        return queuedTransactions[txHash];
    }
    
    /**
     * @notice Get transaction hash (public version)
     */
    function getTxHash(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external pure returns (bytes32) {
        return _getTxHash(target, value, signature, data, eta);
    }

    // ============ RECEIVE ============
    
    receive() external payable {}
}
