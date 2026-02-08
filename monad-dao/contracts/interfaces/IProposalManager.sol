// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IProposalManager
 * @notice Interface for proposal creation and lifecycle management
 */
interface IProposalManager {
    
    // ============ ENUMS ============
    
    enum ProposalState {
        Pending,    // 0: Created, waiting for voting delay
        Active,     // 1: Voting in progress
        Canceled,   // 2: Canceled by proposer
        Defeated,   // 3: Failed to reach quorum or majority
        Succeeded,  // 4: Passed, waiting for execution
        Queued,     // 5: In timelock queue
        Expired,    // 6: Timelock expired
        Executed    // 7: Successfully executed
    }

    enum ProposalType {
        Transfer,       // Treasury transfer
        Configuration,  // DAO parameter change
        Membership,     // Add/remove members
        Upgrade,        // Contract upgrade
        Custom          // Custom action
    }

    // ============ STRUCTS ============
    
    /**
     * @notice Human-readable proposal metadata
     */
    struct ProposalMetadata {
        string title;
        string description;
        string category;
        string discussionURL;
        string proposalIPFS;  // IPFS hash for full proposal document
    }

    /**
     * @notice Machine data for proposal
     */
    struct ProposalData {
        uint256 id;
        address proposer;
        ProposalType proposalType;
        uint256 createdAt;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool canceled;
        bool executed;
    }

    /**
     * @notice Proposal actions to execute
     */
    struct ProposalAction {
        address target;
        uint256 value;
        bytes data;
        string description;
    }

    // ============ EVENTS ============
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        string title,
        uint256 startBlock,
        uint256 endBlock
    );

    event ProposalCanceled(uint256 indexed proposalId);
    event ProposalQueued(uint256 indexed proposalId, uint256 eta);
    event ProposalExecuted(uint256 indexed proposalId);

    // ============ FUNCTIONS ============
    
    function createProposal(
        ProposalType proposalType,
        ProposalMetadata memory metadata,
        ProposalAction[] memory actions
    ) external returns (uint256 proposalId);

    function cancelProposal(uint256 proposalId) external;
    function queueProposal(uint256 proposalId) external;
    function executeProposal(uint256 proposalId) external payable;
    
    function getProposalState(uint256 proposalId) external view returns (ProposalState);
    function getProposalData(uint256 proposalId) external view returns (ProposalData memory);
    function getProposalMetadata(uint256 proposalId) external view returns (ProposalMetadata memory);
    function getProposalActions(uint256 proposalId) external view returns (ProposalAction[] memory);
    function getProposalCount() external view returns (uint256);
}
