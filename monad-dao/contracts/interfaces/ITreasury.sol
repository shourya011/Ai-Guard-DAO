// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITreasury
 * @notice Interface for DAO treasury management
 */
interface ITreasury {
    
    // ============ ENUMS ============
    
    enum TransferType {
        ETH,
        ERC20,
        ERC721,
        ERC1155
    }

    // ============ STRUCTS ============
    
    /**
     * @notice Record of a treasury transaction
     */
    struct TransferRecord {
        uint256 id;
        TransferType transferType;
        address token;
        address recipient;
        uint256 amount;
        uint256 proposalId;
        uint256 timestamp;
        string description;
    }

    /**
     * @notice Treasury balance snapshot
     */
    struct BalanceSnapshot {
        uint256 ethBalance;
        address[] tokens;
        uint256[] tokenBalances;
        uint256 timestamp;
    }

    // ============ EVENTS ============
    
    event Deposit(
        address indexed sender,
        address indexed token,
        uint256 amount
    );

    event Withdrawal(
        uint256 indexed proposalId,
        address indexed recipient,
        address indexed token,
        uint256 amount,
        string description
    );

    event EmergencyWithdrawal(
        address indexed initiator,
        address indexed recipient,
        address indexed token,
        uint256 amount
    );

    // ============ FUNCTIONS ============
    
    function deposit() external payable;
    function depositToken(address token, uint256 amount) external;
    
    function executeTransfer(
        uint256 proposalId,
        address recipient,
        address token,
        uint256 amount,
        string calldata description
    ) external;

    function emergencyWithdraw(
        address recipient,
        address token,
        uint256 amount
    ) external;

    function getBalance(address token) external view returns (uint256);
    function getETHBalance() external view returns (uint256);
    function getTransferHistory(uint256 limit) external view returns (TransferRecord[] memory);
    function getDailySpent() external view returns (uint256);
    function getRemainingDailyLimit() external view returns (uint256);
}
