// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ITreasury.sol";

/**
 * @title Treasury
 * @author Monad DAO Team
 * @notice Secure treasury management for DAO funds
 * @dev Handles ETH and ERC20 token storage and controlled withdrawals
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                           TREASURY                                         ║
 * ║                                                                            ║
 * ║  PURPOSE:                                                                  ║
 * ║  - Store and manage DAO funds securely                                    ║
 * ║  - Only allow withdrawals through approved proposals                      ║
 * ║  - Track all transactions with machine data                               ║
 * ║  - Enforce daily limits and emergency controls                            ║
 * ║                                                                            ║
 * ║  MACHINE DATA:                                                             ║
 * ║  - ETH balance                                                            ║
 * ║  - Token balances (ERC20)                                                 ║
 * ║  - Daily spent amount                                                     ║
 * ║  - Transfer history with timestamps                                       ║
 * ║                                                                            ║
 * ║  HUMAN DATA:                                                               ║
 * ║  - Transfer descriptions                                                  ║
 * ║  - Linked proposal context                                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Treasury is ITreasury {
    
    // ============ STATE VARIABLES ============
    
    /// @notice DAO Core contract (can authorize transfers)
    address public daoCore;
    
    /// @notice Owner for initial setup
    address public owner;
    
    /// @notice Emergency multisig signers
    address[] public emergencySigners;
    
    /// @notice Required signatures for emergency withdrawal
    uint256 public emergencyThreshold;
    
    /// @notice Daily spending limit (in ETH equivalent, basis points of total)
    uint256 public dailyLimitBps = 2000; // 20%
    
    /// @notice Maximum single transfer (basis points of total ETH balance)
    uint256 public maxSingleTransferBps = 1000; // 10%
    
    /// @notice Tracking daily spending
    uint256 public dailySpent;
    uint256 public lastResetTimestamp;
    
    /// @notice Transfer history
    TransferRecord[] public transfers;
    uint256 public transferCount;
    
    /// @notice Supported tokens
    address[] public supportedTokens;
    mapping(address => bool) public isTokenSupported;
    
    /// @notice Initialized flag
    bool public initialized;

    // ============ ERRORS ============
    
    error Unauthorized();
    error NotInitialized();
    error AlreadyInitialized();
    error InsufficientBalance();
    error ExceedsDailyLimit();
    error ExceedsMaxSingleTransfer();
    error ZeroAddress();
    error ZeroAmount();
    error TransferFailed();
    error NotEnoughSignatures();

    // ============ MODIFIERS ============
    
    modifier onlyDAOCore() {
        if (msg.sender != daoCore) revert Unauthorized();
        _;
    }
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier whenInitialized() {
        if (!initialized) revert NotInitialized();
        _;
    }

    // ============ CONSTRUCTOR ============
    
    constructor() {
        owner = msg.sender;
        lastResetTimestamp = block.timestamp;
    }

    // ============ INITIALIZATION ============
    
    /**
     * @notice Initialize the treasury with DAO Core address
     * @param _daoCore Address of the DAO Core contract
     * @param _emergencySigners Array of emergency multisig signers
     * @param _emergencyThreshold Required signatures for emergency
     */
    function initialize(
        address _daoCore,
        address[] memory _emergencySigners,
        uint256 _emergencyThreshold
    ) external onlyOwner {
        if (initialized) revert AlreadyInitialized();
        if (_daoCore == address(0)) revert ZeroAddress();
        if (_emergencyThreshold > _emergencySigners.length) revert NotEnoughSignatures();
        
        daoCore = _daoCore;
        emergencySigners = _emergencySigners;
        emergencyThreshold = _emergencyThreshold;
        initialized = true;
    }

    // ============ DEPOSIT FUNCTIONS ============
    
    /**
     * @notice Deposit ETH to treasury
     */
    function deposit() external payable override {
        emit Deposit(msg.sender, address(0), msg.value);
    }
    
    /**
     * @notice Receive ETH directly
     */
    receive() external payable {
        emit Deposit(msg.sender, address(0), msg.value);
    }
    
    /**
     * @notice Deposit ERC20 tokens
     * @param token Token address
     * @param amount Amount to deposit
     */
    function depositToken(address token, uint256 amount) external override {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        
        // Track supported tokens
        if (!isTokenSupported[token]) {
            supportedTokens.push(token);
            isTokenSupported[token] = true;
        }
        
        emit Deposit(msg.sender, token, amount);
    }

    // ============ WITHDRAWAL FUNCTIONS ============
    
    /**
     * @notice Execute a transfer (only via approved proposal)
     * @param proposalId The proposal that authorized this transfer
     * @param recipient Recipient address
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to transfer
     * @param description Human-readable description
     */
    function executeTransfer(
        uint256 proposalId,
        address recipient,
        address token,
        uint256 amount,
        string calldata description
    ) external override onlyDAOCore whenInitialized {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        // Reset daily limit if new day
        _resetDailyLimitIfNeeded();
        
        // Check limits (for ETH transfers)
        if (token == address(0)) {
            _checkLimits(amount);
        }
        
        // Execute transfer
        if (token == address(0)) {
            // ETH transfer
            if (address(this).balance < amount) revert InsufficientBalance();
            
            (bool success, ) = recipient.call{value: amount}("");
            if (!success) revert TransferFailed();
            
            dailySpent += amount;
        } else {
            // ERC20 transfer
            if (IERC20(token).balanceOf(address(this)) < amount) revert InsufficientBalance();
            
            bool success = IERC20(token).transfer(recipient, amount);
            if (!success) revert TransferFailed();
        }
        
        // Record transfer
        transfers.push(TransferRecord({
            id: transferCount,
            transferType: token == address(0) ? TransferType.ETH : TransferType.ERC20,
            token: token,
            recipient: recipient,
            amount: amount,
            proposalId: proposalId,
            timestamp: block.timestamp,
            description: description
        }));
        transferCount++;
        
        emit Withdrawal(proposalId, recipient, token, amount, description);
    }
    
    /**
     * @notice Emergency withdrawal (requires multisig)
     * @dev Simplified for hackathon - in production use proper multisig
     */
    function emergencyWithdraw(
        address recipient,
        address token,
        uint256 amount
    ) external override {
        // Check caller is emergency signer
        bool isSigner = false;
        for (uint256 i = 0; i < emergencySigners.length; i++) {
            if (emergencySigners[i] == msg.sender) {
                isSigner = true;
                break;
            }
        }
        if (!isSigner) revert Unauthorized();
        
        // For hackathon: simplified emergency withdrawal
        // Production: implement proper multisig signature collection
        
        if (token == address(0)) {
            (bool success, ) = recipient.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            bool success = IERC20(token).transfer(recipient, amount);
            if (!success) revert TransferFailed();
        }
        
        emit EmergencyWithdrawal(msg.sender, recipient, token, amount);
    }

    // ============ LIMIT CHECKING ============
    
    /**
     * @notice Check if transfer exceeds limits
     */
    function _checkLimits(uint256 amount) internal view {
        uint256 balance = address(this).balance;
        
        // Check single transfer limit
        uint256 maxSingle = (balance * maxSingleTransferBps) / 10000;
        if (amount > maxSingle) revert ExceedsMaxSingleTransfer();
        
        // Check daily limit
        uint256 dailyLimit = (balance * dailyLimitBps) / 10000;
        if (dailySpent + amount > dailyLimit) revert ExceedsDailyLimit();
    }
    
    /**
     * @notice Reset daily limit if 24 hours passed
     */
    function _resetDailyLimitIfNeeded() internal {
        if (block.timestamp >= lastResetTimestamp + 1 days) {
            dailySpent = 0;
            lastResetTimestamp = block.timestamp;
        }
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get ETH balance
     */
    function getETHBalance() external view override returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Get token balance
     */
    function getBalance(address token) external view override returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        }
        return IERC20(token).balanceOf(address(this));
    }
    
    /**
     * @notice Get transfer history
     */
    function getTransferHistory(uint256 limit) 
        external view override 
        returns (TransferRecord[] memory) 
    {
        uint256 count = limit > transferCount ? transferCount : limit;
        TransferRecord[] memory result = new TransferRecord[](count);
        
        for (uint256 i = 0; i < count; i++) {
            result[i] = transfers[transferCount - count + i];
        }
        
        return result;
    }
    
    /**
     * @notice Get daily spent amount
     */
    function getDailySpent() external view override returns (uint256) {
        if (block.timestamp >= lastResetTimestamp + 1 days) {
            return 0; // Would reset on next transaction
        }
        return dailySpent;
    }
    
    /**
     * @notice Get remaining daily limit
     */
    function getRemainingDailyLimit() external view override returns (uint256) {
        uint256 balance = address(this).balance;
        uint256 dailyLimit = (balance * dailyLimitBps) / 10000;
        
        uint256 currentSpent = dailySpent;
        if (block.timestamp >= lastResetTimestamp + 1 days) {
            currentSpent = 0;
        }
        
        if (currentSpent >= dailyLimit) return 0;
        return dailyLimit - currentSpent;
    }
    
    /**
     * @notice Get all supported tokens
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }
    
    /**
     * @notice Get balance snapshot
     */
    function getBalanceSnapshot() external view returns (BalanceSnapshot memory) {
        uint256[] memory tokenBalances = new uint256[](supportedTokens.length);
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            tokenBalances[i] = IERC20(supportedTokens[i]).balanceOf(address(this));
        }
        
        return BalanceSnapshot({
            ethBalance: address(this).balance,
            tokens: supportedTokens,
            tokenBalances: tokenBalances,
            timestamp: block.timestamp
        });
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Update daily limit
     */
    function setDailyLimit(uint256 newLimitBps) external onlyOwner {
        require(newLimitBps <= 10000, "Cannot exceed 100%");
        dailyLimitBps = newLimitBps;
    }
    
    /**
     * @notice Update max single transfer
     */
    function setMaxSingleTransfer(uint256 newMaxBps) external onlyOwner {
        require(newMaxBps <= 10000, "Cannot exceed 100%");
        maxSingleTransferBps = newMaxBps;
    }
    
    /**
     * @notice Update emergency signers
     */
    function setEmergencySigners(
        address[] memory newSigners,
        uint256 newThreshold
    ) external onlyOwner {
        require(newThreshold <= newSigners.length, "Invalid threshold");
        emergencySigners = newSigners;
        emergencyThreshold = newThreshold;
    }
}
