// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IProposalManager.sol";

/**
 * @title ProposalManager
 * @author Monad DAO Team
 * @notice Manages proposal creation, lifecycle, and execution
 * @dev Handles both human-readable metadata and machine data for proposals
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                        PROPOSAL MANAGER                                    ║
 * ║                                                                            ║
 * ║  PURPOSE:                                                                  ║
 * ║  - Create and manage governance proposals                                 ║
 * ║  - Track proposal state machine                                           ║
 * ║  - Store human-readable descriptions                                      ║
 * ║  - Execute approved proposals                                             ║
 * ║                                                                            ║
 * ║  MACHINE DATA (per proposal):                                              ║
 * ║  - id: unique identifier                                                  ║
 * ║  - proposer: creator address                                              ║
 * ║  - createdAt: timestamp                                                   ║
 * ║  - startBlock: voting start                                               ║
 * ║  - endBlock: voting end                                                   ║
 * ║  - forVotes/againstVotes/abstainVotes: vote tallies                       ║
 * ║  - canceled/executed: boolean flags                                       ║
 * ║                                                                            ║
 * ║  HUMAN DATA (per proposal):                                                ║
 * ║  - title: short name                                                      ║
 * ║  - description: full text                                                 ║
 * ║  - category: classification                                               ║
 * ║  - discussionURL: link to forum                                           ║
 * ║                                                                            ║
 * ║  PROPOSAL STATES:                                                          ║
 * ║  Pending → Active → Succeeded/Defeated → Queued → Executed                ║
 * ║      ↓                    ↓                ↓                               ║
 * ║   Canceled            Canceled          Expired                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
contract ProposalManager is IProposalManager {
    
    // ============ STORAGE STRUCTS ============
    
    struct ProposalStorage {
        // Machine data
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
        uint256 eta; // Execution time (for timelock)
        
        // Human data
        string title;
        string description;
        string category;
        string discussionURL;
        string proposalIPFS;  // IPFS hash for full proposal document
    }
    
    // ============ STATE VARIABLES ============
    
    /// @notice DAO Core contract
    address public daoCore;
    
    /// @notice Voting Engine contract
    address public votingEngine;
    
    /// @notice Timelock contract
    address public timelock;
    
    /// @notice Treasury contract
    address public treasury;
    
    /// @notice Owner for setup
    address public owner;
    
    /// @notice All proposals
    mapping(uint256 => ProposalStorage) internal _proposals;
    
    /// @notice Proposal actions
    mapping(uint256 => ProposalAction[]) internal _proposalActions;
    
    /// @notice Proposal count
    uint256 public proposalCount;
    
    /// @notice Voting delay (blocks)
    uint256 public votingDelay = 1;
    
    /// @notice Voting period (blocks)
    uint256 public votingPeriod = 17280; // ~3 days on Monad
    
    /// @notice Proposal threshold (min tokens to propose)
    uint256 public proposalThreshold = 0; // 0 for demo
    
    /// @notice Quorum (basis points, e.g., 400 = 4%)
    uint256 public quorumBps = 400;
    
    /// @notice Passing threshold (basis points, e.g., 5000 = 50%)
    uint256 public passingThresholdBps = 5000;
    
    /// @notice Timelock delay (seconds)
    uint256 public timelockDelay = 2 days;
    
    /// @notice Grace period for execution
    uint256 public gracePeriod = 14 days;
    
    /// @notice DAO Token for voting power checks
    address public daoToken;

    // ============ ERRORS ============
    
    error Unauthorized();
    error ProposalNotFound();
    error InvalidProposalState();
    error BelowProposalThreshold();
    error EmptyProposal();
    error ProposalAlreadyExecuted();
    error TimelockNotPassed();
    error ExecutionFailed();
    error ZeroAddress();

    // ============ MODIFIERS ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier onlyVotingEngine() {
        if (msg.sender != votingEngine && msg.sender != owner) revert Unauthorized();
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
        address _daoCore,
        address _votingEngine,
        address _treasury,
        address _daoToken
    ) external onlyOwner {
        if (_daoCore == address(0)) revert ZeroAddress();
        
        daoCore = _daoCore;
        votingEngine = _votingEngine;
        treasury = _treasury;
        daoToken = _daoToken;
    }

    // ============ PROPOSAL CREATION ============
    
    /**
     * @notice Create a new proposal
     * @param proposalType Type of proposal
     * @param metadata Human-readable metadata
     * @param actions Actions to execute if passed
     * @return proposalId The new proposal's ID
     * 
     * EMITS: ProposalCreated - AI Guard Dog listens for this!
     */
    function createProposal(
        ProposalType proposalType,
        ProposalMetadata memory metadata,
        ProposalAction[] memory actions
    ) external override returns (uint256 proposalId) {
        // Validate
        if (actions.length == 0) revert EmptyProposal();
        
        // TODO: Check proposer has enough tokens (skip for demo)
        // if (getVotingPower(msg.sender) < proposalThreshold) revert BelowProposalThreshold();
        
        // Create proposal
        proposalCount++;
        proposalId = proposalCount;
        
        uint256 startBlock = block.number + votingDelay;
        uint256 endBlock = startBlock + votingPeriod;
        
        _proposals[proposalId] = ProposalStorage({
            id: proposalId,
            proposer: msg.sender,
            proposalType: proposalType,
            createdAt: block.timestamp,
            startBlock: startBlock,
            endBlock: endBlock,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            canceled: false,
            executed: false,
            eta: 0,
            title: metadata.title,
            description: metadata.description,
            category: metadata.category,
            discussionURL: metadata.discussionURL,
            proposalIPFS: metadata.proposalIPFS
        });
        
        // Store actions
        for (uint256 i = 0; i < actions.length; i++) {
            _proposalActions[proposalId].push(actions[i]);
        }
        
        // CRITICAL EVENT: AI Guard Dog monitors this
        emit ProposalCreated(
            proposalId,
            msg.sender,
            proposalType,
            metadata.title,
            startBlock,
            endBlock
        );
        
        return proposalId;
    }

    // ============ PROPOSAL LIFECYCLE ============
    
    /**
     * @notice Cancel a proposal (proposer only, before voting ends)
     */
    function cancelProposal(uint256 proposalId) external override {
        ProposalStorage storage proposal = _proposals[proposalId];
        
        if (proposal.id == 0) revert ProposalNotFound();
        if (msg.sender != proposal.proposer && msg.sender != owner) {
            revert Unauthorized();
        }
        
        ProposalState currentState = getProposalState(proposalId);
        if (currentState != ProposalState.Pending && currentState != ProposalState.Active) {
            revert InvalidProposalState();
        }
        
        proposal.canceled = true;
        
        emit ProposalCanceled(proposalId);
    }
    
    /**
     * @notice Queue a successful proposal for timelock
     */
    function queueProposal(uint256 proposalId) external override {
        if (getProposalState(proposalId) != ProposalState.Succeeded) {
            revert InvalidProposalState();
        }
        
        ProposalStorage storage proposal = _proposals[proposalId];
        uint256 eta = block.timestamp + timelockDelay;
        proposal.eta = eta;
        
        emit ProposalQueued(proposalId, eta);
    }
    
    /**
     * @notice Execute a queued proposal
     */
    function executeProposal(uint256 proposalId) external payable override {
        ProposalState currentState = getProposalState(proposalId);
        
        // Can execute if Succeeded (no timelock) or Queued (with timelock passed)
        if (currentState == ProposalState.Queued) {
            ProposalStorage storage queuedProposal = _proposals[proposalId];
            if (block.timestamp < queuedProposal.eta) revert TimelockNotPassed();
        } else if (currentState != ProposalState.Succeeded) {
            revert InvalidProposalState();
        }
        
        ProposalStorage storage proposal = _proposals[proposalId];
        proposal.executed = true;
        
        // Execute all actions
        ProposalAction[] storage actions = _proposalActions[proposalId];
        for (uint256 i = 0; i < actions.length; i++) {
            (bool success, ) = actions[i].target.call{value: actions[i].value}(
                actions[i].data
            );
            if (!success) revert ExecutionFailed();
        }
        
        emit ProposalExecuted(proposalId);
    }

    // ============ VOTING INTEGRATION ============
    
    /**
     * @notice Update vote counts (called by VotingEngine)
     */
    function updateVotes(
        uint256 proposalId,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes
    ) external onlyVotingEngine {
        ProposalStorage storage proposal = _proposals[proposalId];
        if (proposal.id == 0) revert ProposalNotFound();
        
        proposal.forVotes = forVotes;
        proposal.againstVotes = againstVotes;
        proposal.abstainVotes = abstainVotes;
    }
    
    /**
     * @notice Add votes (called by VotingEngine)
     */
    function addVotes(
        uint256 proposalId,
        uint8 support,
        uint256 weight
    ) external onlyVotingEngine {
        ProposalStorage storage proposal = _proposals[proposalId];
        if (proposal.id == 0) revert ProposalNotFound();
        
        if (support == 0) {
            proposal.againstVotes += weight;
        } else if (support == 1) {
            proposal.forVotes += weight;
        } else {
            proposal.abstainVotes += weight;
        }
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get proposal state
     */
    function getProposalState(uint256 proposalId) 
        public view override 
        returns (ProposalState) 
    {
        ProposalStorage storage proposal = _proposals[proposalId];
        
        if (proposal.id == 0) revert ProposalNotFound();
        
        if (proposal.canceled) {
            return ProposalState.Canceled;
        }
        
        if (proposal.executed) {
            return ProposalState.Executed;
        }
        
        if (block.number < proposal.startBlock) {
            return ProposalState.Pending;
        }
        
        if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        }
        
        // Voting ended - check if passed
        bool passed = _proposalPassed(proposalId);
        
        if (!passed) {
            return ProposalState.Defeated;
        }
        
        if (proposal.eta == 0) {
            return ProposalState.Succeeded;
        }
        
        if (block.timestamp < proposal.eta) {
            return ProposalState.Queued;
        }
        
        if (block.timestamp > proposal.eta + gracePeriod) {
            return ProposalState.Expired;
        }
        
        return ProposalState.Queued;
    }
    
    /**
     * @notice Check if proposal passed
     */
    function _proposalPassed(uint256 proposalId) internal view returns (bool) {
        ProposalStorage storage proposal = _proposals[proposalId];
        
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        
        // Check quorum (simplified - in production, calculate vs total supply)
        if (totalVotes == 0) return false;
        
        // Check passing threshold
        uint256 forPercentage = (proposal.forVotes * 10000) / (proposal.forVotes + proposal.againstVotes);
        
        return forPercentage >= passingThresholdBps;
    }
    
    /**
     * @notice Get proposal machine data
     */
    function getProposalData(uint256 proposalId) 
        external view override 
        returns (ProposalData memory) 
    {
        ProposalStorage storage p = _proposals[proposalId];
        
        return ProposalData({
            id: p.id,
            proposer: p.proposer,
            proposalType: p.proposalType,
            createdAt: p.createdAt,
            startBlock: p.startBlock,
            endBlock: p.endBlock,
            forVotes: p.forVotes,
            againstVotes: p.againstVotes,
            abstainVotes: p.abstainVotes,
            canceled: p.canceled,
            executed: p.executed
        });
    }
    
    /**
     * @notice Get proposal human-readable metadata
     */
    function getProposalMetadata(uint256 proposalId) 
        external view override 
        returns (ProposalMetadata memory) 
    {
        ProposalStorage storage p = _proposals[proposalId];
        
        return ProposalMetadata({
            title: p.title,
            description: p.description,
            category: p.category,
            discussionURL: p.discussionURL,
            proposalIPFS: p.proposalIPFS
        });
    }
    
    /**
     * @notice Get proposal actions
     */
    function getProposalActions(uint256 proposalId) 
        external view override 
        returns (ProposalAction[] memory) 
    {
        return _proposalActions[proposalId];
    }
    
    /**
     * @notice Get total proposal count
     */
    function getProposalCount() external view override returns (uint256) {
        return proposalCount;
    }
    
    /**
     * @notice Get proposal voting timeline
     */
    function getProposalTimeline(uint256 proposalId) 
        external view 
        returns (
            uint256 startBlock,
            uint256 endBlock,
            uint256 eta,
            uint256 createdAt
        ) 
    {
        ProposalStorage storage p = _proposals[proposalId];
        return (p.startBlock, p.endBlock, p.eta, p.createdAt);
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Set voting delay
     */
    function setVotingDelay(uint256 newDelay) external onlyOwner {
        votingDelay = newDelay;
    }
    
    /**
     * @notice Set voting period
     */
    function setVotingPeriod(uint256 newPeriod) external onlyOwner {
        votingPeriod = newPeriod;
    }
    
    /**
     * @notice Set quorum
     */
    function setQuorum(uint256 newQuorumBps) external onlyOwner {
        require(newQuorumBps <= 10000, "Cannot exceed 100%");
        quorumBps = newQuorumBps;
    }
    
    /**
     * @notice Set passing threshold
     */
    function setPassingThreshold(uint256 newThresholdBps) external onlyOwner {
        require(newThresholdBps <= 10000, "Cannot exceed 100%");
        passingThresholdBps = newThresholdBps;
    }
    
    /**
     * @notice Set timelock delay
     */
    function setTimelockDelay(uint256 newDelay) external onlyOwner {
        timelockDelay = newDelay;
    }
}
