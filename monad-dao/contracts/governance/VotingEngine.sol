// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IVotingEngine.sol";

/**
 * @title VotingEngine
 * @author Monad DAO Team
 * @notice Handles all voting logic for the DAO
 * @dev Processes votes, tracks receipts, and determines outcomes
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         VOTING ENGINE                                      ║
 * ║                                                                            ║
 * ║  PURPOSE:                                                                  ║
 * ║  - Cast and record votes                                                  ║
 * ║  - Calculate voting power                                                 ║
 * ║  - Support delegated voting (for AI Guard Dog)                            ║
 * ║  - Track vote receipts                                                    ║
 * ║                                                                            ║
 * ║  MACHINE DATA:                                                             ║
 * ║  - Vote weights                                                           ║
 * ║  - Timestamps                                                             ║
 * ║  - Vote type (0/1/2)                                                      ║
 * ║                                                                            ║
 * ║  HUMAN DATA:                                                               ║
 * ║  - Vote reason strings                                                    ║
 * ║                                                                            ║
 * ║  AI GUARD DOG INTEGRATION:                                                 ║
 * ║  - castVoteOnBehalf() allows authorized agents to vote                    ║
 * ║  - for users who have delegated to them                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

interface IDAOToken {
    function getVotes(address account) external view returns (uint256);
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);
}

interface IProposalManager {
    function getProposalData(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        uint8 proposalType,
        uint256 createdAt,
        uint256 startBlock,
        uint256 endBlock,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        bool canceled,
        bool executed
    );
    function addVotes(uint256 proposalId, uint8 support, uint256 weight) external;
}

contract VotingEngine is IVotingEngine {
    
    // ============ STATE VARIABLES ============
    
    /// @notice DAO Token for voting power
    address public daoToken;
    
    /// @notice Proposal Manager
    address public proposalManager;
    
    /// @notice DAO Core
    address public daoCore;
    
    /// @notice Owner for setup
    address public owner;
    
    /// @notice Vote receipts: proposalId => voter => receipt
    mapping(uint256 => mapping(address => VoteReceipt)) internal _receipts;
    
    /// @notice Authorized voting agents (for AI Guard Dog)
    mapping(address => bool) public authorizedAgents;
    
    /// @notice User delegations to agents: user => agent => authorized
    mapping(address => mapping(address => bool)) public agentDelegations;
    
    /// @notice Voting stats per proposal
    mapping(uint256 => VotingStats) internal _stats;

    // ============ ERRORS ============
    
    error Unauthorized();
    error AlreadyVoted();
    error VotingNotActive();
    error InvalidVoteType();
    error NoVotingPower();
    error NotDelegated();
    error ZeroAddress();

    // ============ MODIFIERS ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier onlyAuthorizedAgent() {
        if (!authorizedAgents[msg.sender] && msg.sender != owner) {
            revert Unauthorized();
        }
        _;
    }

    // ============ CONSTRUCTOR ============
    
    constructor() {
        owner = msg.sender;
    }

    // ============ INITIALIZATION ============
    
    /**
     * @notice Initialize with related contracts
     */
    function initialize(
        address _daoToken,
        address _proposalManager,
        address _daoCore
    ) external onlyOwner {
        if (_daoToken == address(0)) revert ZeroAddress();
        
        daoToken = _daoToken;
        proposalManager = _proposalManager;
        daoCore = _daoCore;
    }

    // ============ VOTING FUNCTIONS ============
    
    /**
     * @notice Cast a vote
     * @param proposalId Proposal to vote on
     * @param voteType 0=Against, 1=For, 2=Abstain
     */
    function castVote(
        uint256 proposalId,
        VoteType voteType
    ) external override returns (uint256 weight) {
        return _castVote(msg.sender, proposalId, voteType, "");
    }
    
    /**
     * @notice Cast a vote with reason
     * @param proposalId Proposal to vote on
     * @param voteType Vote type
     * @param reason Human-readable reason
     */
    function castVoteWithReason(
        uint256 proposalId,
        VoteType voteType,
        string calldata reason
    ) external override returns (uint256 weight) {
        return _castVote(msg.sender, proposalId, voteType, reason);
    }
    
    /**
     * @notice Cast vote on behalf of another user (delegated voting)
     * @param proposalId Proposal to vote on
     * @param voter Original voter who delegated
     * @param voteType Vote type
     * @param reason Reason for vote
     * 
     * THIS IS THE KEY FUNCTION FOR AI GUARD DOG
     * 
     * The VotingAgent contract from the AI Guard Dog system calls this
     * to vote on behalf of users who have delegated to it.
     */
    function castVoteOnBehalf(
        uint256 proposalId,
        address voter,
        VoteType voteType,
        string calldata reason
    ) external override onlyAuthorizedAgent returns (uint256 weight) {
        // Verify the voter has delegated to this agent
        if (!agentDelegations[voter][msg.sender]) {
            revert NotDelegated();
        }
        
        weight = _castVote(voter, proposalId, voteType, reason);
        
        emit VoteCastByDelegate(msg.sender, voter, proposalId, voteType, weight);
        
        return weight;
    }
    
    /**
     * @notice Internal vote casting logic
     */
    function _castVote(
        address voter,
        uint256 proposalId,
        VoteType voteType,
        string memory reason
    ) internal returns (uint256 weight) {
        // Check not already voted
        if (_receipts[proposalId][voter].hasVoted) {
            revert AlreadyVoted();
        }
        
        // Get proposal data to check if voting is active
        // For simplicity, we'll just proceed (in production, check state)
        
        // Get voting power
        weight = _getVotingPower(voter);
        if (weight == 0) {
            // Give minimum weight for demo
            weight = 1;
        }
        
        // Record receipt
        _receipts[proposalId][voter] = VoteReceipt({
            hasVoted: true,
            voteType: voteType,
            weight: weight,
            reason: reason,
            timestamp: block.timestamp
        });
        
        // Update stats
        VotingStats storage stats = _stats[proposalId];
        stats.totalVoters++;
        
        if (voteType == VoteType.Against) {
            stats.againstVotes += weight;
        } else if (voteType == VoteType.For) {
            stats.forVotes += weight;
        } else {
            stats.abstainVotes += weight;
        }
        
        // Update proposal manager
        if (proposalManager != address(0)) {
            IProposalManager(proposalManager).addVotes(
                proposalId,
                uint8(voteType),
                weight
            );
        }
        
        emit VoteCast(voter, proposalId, voteType, weight, reason);
        
        return weight;
    }
    
    /**
     * @notice Get voting power for an account
     */
    function _getVotingPower(address account) internal view returns (uint256) {
        if (daoToken == address(0)) {
            return 1; // Demo: everyone gets 1 vote
        }
        return IDAOToken(daoToken).getVotes(account);
    }

    // ============ DELEGATION FUNCTIONS ============
    
    /**
     * @notice Delegate voting to an agent (user calls this)
     * @param agent Agent address to delegate to
     * 
     * This allows AI Guard Dog's VotingAgent to vote on behalf of this user
     */
    function delegateToAgent(address agent) external {
        if (agent == address(0)) revert ZeroAddress();
        agentDelegations[msg.sender][agent] = true;
    }
    
    /**
     * @notice Revoke delegation from an agent
     * @param agent Agent to revoke from
     */
    function revokeAgentDelegation(address agent) external {
        agentDelegations[msg.sender][agent] = false;
    }
    
    /**
     * @notice Check if user has delegated to agent
     */
    function hasDelegatedTo(address user, address agent) external view returns (bool) {
        return agentDelegations[user][agent];
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get vote receipt for a voter on a proposal
     */
    function getVoteReceipt(
        uint256 proposalId,
        address voter
    ) external view override returns (VoteReceipt memory) {
        return _receipts[proposalId][voter];
    }
    
    /**
     * @notice Get voting stats for a proposal
     */
    function getVotingStats(
        uint256 proposalId
    ) external view override returns (VotingStats memory) {
        return _stats[proposalId];
    }
    
    /**
     * @notice Check if account has voted
     */
    function hasVoted(
        uint256 proposalId,
        address voter
    ) external view override returns (bool) {
        return _receipts[proposalId][voter].hasVoted;
    }
    
    /**
     * @notice Get voting power at a block
     */
    function getVotingPower(
        address account,
        uint256 blockNumber
    ) external view override returns (uint256) {
        if (daoToken == address(0)) {
            return 1;
        }
        if (blockNumber >= block.number) {
            return IDAOToken(daoToken).getVotes(account);
        }
        return IDAOToken(daoToken).getPastVotes(account, blockNumber);
    }
    
    /**
     * @notice Get current voting power
     */
    function getCurrentVotingPower(address account) external view returns (uint256) {
        return _getVotingPower(account);
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Authorize a voting agent
     * @param agent Agent address to authorize
     * 
     * This is called to authorize the AI Guard Dog VotingAgent contract
     */
    function authorizeAgent(address agent) external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();
        authorizedAgents[agent] = true;
    }
    
    /**
     * @notice Revoke agent authorization
     */
    function revokeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = false;
    }
    
    /**
     * @notice Check if agent is authorized
     */
    function isAuthorizedAgent(address agent) external view returns (bool) {
        return authorizedAgents[agent];
    }
    
    /**
     * @notice Set DAO token
     */
    function setDAOToken(address _daoToken) external onlyOwner {
        daoToken = _daoToken;
    }
    
    /**
     * @notice Set proposal manager
     */
    function setProposalManager(address _proposalManager) external onlyOwner {
        proposalManager = _proposalManager;
    }
}
