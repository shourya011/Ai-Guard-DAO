// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IVotingAgent.sol";
import "./interfaces/IDAOGovernor.sol";
import "./interfaces/IAuditLogger.sol";

/**
 * @title VotingAgent
 * @author AI Guard Dog Team
 * @notice Core contract enabling AI-powered voting delegation for DAO governance
 * @dev Deployed on Monad for high throughput and low-cost operations
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                           VOTING AGENT                                     ║
 * ║                                                                            ║
 * ║  THE HEART OF AI GUARD DOG                                                 ║
 * ║                                                                            ║
 * ║  This contract is the bridge between:                                      ║
 * ║  - Users who want AI to vote on their behalf                              ║
 * ║  - AI backend that analyzes proposals                                     ║
 * ║  - DAO Governor contracts that execute votes                              ║
 * ║                                                                            ║
 * ║  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐         ║
 * ║  │    USER     │────▶│  VOTING AGENT   │────▶│   DAO GOVERNOR   │         ║
 * ║  │  (Wallet)   │     │  (This Contract) │     │  (Target DAO)    │         ║
 * ║  └─────────────┘     └─────────────────┘     └──────────────────┘         ║
 * ║        │                     ▲                                             ║
 * ║        │ delegate()          │ castVoteWithRisk()                         ║
 * ║        └─────────────────────┤                                            ║
 * ║                              │                                            ║
 * ║                    ┌─────────────────┐                                    ║
 * ║                    │   AI BACKEND    │                                    ║
 * ║                    │  (Off-chain)    │                                    ║
 * ║                    └─────────────────┘                                    ║
 * ║                                                                            ║
 * ║  KEY SECURITY FEATURES:                                                    ║
 * ║  ✓ Non-custodial: User tokens NEVER enter this contract                   ║
 * ║  ✓ Revocable: Users can revoke delegation instantly                       ║
 * ║  ✓ Threshold-based: AI only votes if risk < user's threshold              ║
 * ║  ✓ Transparent: All decisions logged to AuditLogger                       ║
 * ║  ✓ Pausable: Emergency stop if issues detected                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
contract VotingAgent is IVotingAgent {
    
    // ============ STATE VARIABLES ============
    
    /**
     * @notice Stores delegation preferences for each user per DAO
     * @dev Mapping: user address => DAO governor address => Delegation struct
     * 
     * WHY NESTED MAPPING?
     * Users might delegate to multiple DAOs with different thresholds:
     * - DAO A: Risk threshold 30 (conservative)
     * - DAO B: Risk threshold 70 (more trusting)
     */
    mapping(address => mapping(address => Delegation)) public delegations;
    
    /**
     * @notice Track which DAOs a user has delegated to
     * @dev Needed for revokeAll() to know which delegations to remove
     */
    mapping(address => address[]) public userDAOs;
    
    /**
     * @notice Track pending high-risk proposals awaiting user approval
     * @dev Mapping: user => proposalId => daoGovernor => pending status
     */
    mapping(address => mapping(uint256 => mapping(address => bool))) public pendingApprovals;
    
    /**
     * @notice The AuditLogger contract for recording decisions
     */
    IAuditLogger public auditLogger;
    
    /**
     * @notice Whitelist of AI backend addresses authorized to call castVoteWithRisk
     * @dev Only these addresses can trigger votes - critical security control
     */
    mapping(address => bool) public authorizedBackends;
    
    /**
     * @notice Contract admin (can pause, add backends, etc.)
     */
    address public admin;
    
    /**
     * @notice Emergency pause flag
     */
    bool public paused;
    
    /**
     * @notice Proposed new admin (for 2-step transfer)
     */
    address public pendingAdmin;

    // ============ CONSTANTS ============
    
    uint256 public constant MAX_RISK_THRESHOLD = 100;
    uint256 public constant MEDIUM_RISK_THRESHOLD = 40;

    // ============ EVENTS ============
    
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);
    event BackendAuthorized(address indexed backend);
    event BackendRevoked(address indexed backend);
    event AdminTransferStarted(address indexed currentAdmin, address indexed pendingAdmin);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    // ============ ERRORS ============
    
    error InvalidThreshold();
    error NotDelegated();
    error ContractIsPaused();
    error UnauthorizedBackend();
    error OnlyAdmin();
    error ZeroAddress();
    error AlreadyDelegated();
    error NoPendingApproval();
    error InvalidSupport();
    error NotPendingAdmin();

    // ============ MODIFIERS ============
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }
    
    modifier onlyAuthorizedBackend() {
        if (!authorizedBackends[msg.sender]) revert UnauthorizedBackend();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractIsPaused();
        _;
    }

    // ============ CONSTRUCTOR ============
    
    /**
     * @notice Deploy the VotingAgent contract
     * @param _auditLogger Address of the AuditLogger contract
     * @param _initialBackend Address of the initial AI backend
     * 
     * DEPLOYMENT FLOW:
     * 1. Deploy AuditLogger
     * 2. Deploy VotingAgent (passing AuditLogger address)
     * 3. Call AuditLogger.setVotingAgent(VotingAgent address)
     */
    constructor(address _auditLogger, address _initialBackend) {
        if (_auditLogger == address(0)) revert ZeroAddress();
        if (_initialBackend == address(0)) revert ZeroAddress();
        
        auditLogger = IAuditLogger(_auditLogger);
        admin = msg.sender;
        authorizedBackends[_initialBackend] = true;
        
        emit BackendAuthorized(_initialBackend);
    }

    // ============ USER FUNCTIONS ============
    
    /**
     * @notice Delegate your voting power to AI Guard Dog for a specific DAO
     * @param daoGovernor Address of the DAO's governor contract
     * @param riskThreshold Maximum acceptable risk score (0-100)
     * @param requireApproval If true, AI asks before EVERY vote (even low risk)
     * 
     * HOW IT WORKS:
     * 1. User calls this function with their preferences
     * 2. We store their delegation settings
     * 3. When a proposal appears, AI checks if user delegated
     * 4. If risk < threshold, AI votes on their behalf
     * 
     * EXAMPLE THRESHOLDS:
     * - 20: Very conservative (only obvious safe proposals)
     * - 50: Balanced (AI handles routine, human reviews unusual)
     * - 80: Trusting (only block obvious scams)
     * 
     * IMPORTANT: This does NOT transfer tokens!
     * Your tokens stay in your wallet. We only get permission to vote.
     */
    function delegateVotingPower(
        address daoGovernor,
        uint256 riskThreshold,
        bool requireApproval
    ) external whenNotPaused {
        // Validate inputs
        if (daoGovernor == address(0)) revert ZeroAddress();
        if (riskThreshold > MAX_RISK_THRESHOLD) revert InvalidThreshold();
        
        // Check if already delegated (prevent duplicate DAO entries)
        Delegation storage existing = delegations[msg.sender][daoGovernor];
        if (!existing.active) {
            // First time delegating to this DAO - track it
            userDAOs[msg.sender].push(daoGovernor);
        }
        
        // Store delegation preferences
        delegations[msg.sender][daoGovernor] = Delegation({
            active: true,
            riskThreshold: riskThreshold,
            delegatedAt: block.timestamp,
            requiresApproval: requireApproval
        });
        
        emit VotingPowerDelegated(msg.sender, daoGovernor, riskThreshold);
    }
    
    /**
     * @notice Revoke delegation for a specific DAO
     * @param daoGovernor Address of the DAO to revoke from
     * 
     * WHEN TO USE:
     * - You no longer trust the AI for this DAO
     * - You want to vote manually
     * - You're leaving the DAO
     * 
     * EFFECT:
     * - AI will immediately stop voting on your behalf
     * - Your tokens are unaffected (they were never moved)
     */
    function revokeDelegation(address daoGovernor) external {
        Delegation storage delegation = delegations[msg.sender][daoGovernor];
        
        if (!delegation.active) revert NotDelegated();
        
        delegation.active = false;
        
        emit DelegationRevoked(msg.sender, daoGovernor);
    }
    
    /**
     * @notice Emergency: Revoke ALL delegations across all DAOs
     * 
     * WHEN TO USE:
     * - You suspect your account is compromised
     * - You want to completely exit the system
     * - Emergency situation
     * 
     * This is the "big red button" - stops ALL AI voting instantly
     */
    function revokeAll() external {
        address[] storage daos = userDAOs[msg.sender];
        
        for (uint256 i = 0; i < daos.length; i++) {
            delegations[msg.sender][daos[i]].active = false;
        }
        
        emit AllDelegationsRevoked(msg.sender);
    }
    
    /**
     * @notice Manually approve a vote for a high-risk proposal
     * @param daoGovernor The DAO's governor contract
     * @param proposalId The proposal to vote on
     * @param support 0=against, 1=for, 2=abstain
     * 
     * FLOW:
     * 1. AI analyzes proposal → risk >= user's threshold
     * 2. AI emits HighRiskProposalDetected event
     * 3. User gets notification
     * 4. User reviews proposal off-chain
     * 5. User calls this function to approve or reject
     * 
     * WHY NOT LET AI VOTE ANYWAY?
     * The whole point is that high-risk proposals need human judgment.
     * AI flags, human decides.
     */
    function approveHighRiskVote(
        address daoGovernor,
        uint256 proposalId,
        uint8 support
    ) external whenNotPaused {
        // Verify user has active delegation
        Delegation storage delegation = delegations[msg.sender][daoGovernor];
        if (!delegation.active) revert NotDelegated();
        
        // Validate support value
        if (support > 2) revert InvalidSupport();
        
        // Cast the vote
        _castVote(daoGovernor, proposalId, support);
        
        // Log to audit trail (wasAutoVote = false since human approved)
        auditLogger.logDecision(
            proposalId,
            daoGovernor,
            msg.sender,
            support,
            0, // Risk score 0 for human-approved votes (or could pass actual risk)
            bytes32(0), // No report hash for manual approval
            false // NOT auto-vote
        );
        
        emit HighRiskVoteApproved(msg.sender, proposalId, support);
    }
    
    /**
     * @notice Update your risk threshold for a DAO
     * @param daoGovernor The DAO to update
     * @param newThreshold New risk threshold (0-100)
     */
    function updateRiskThreshold(
        address daoGovernor, 
        uint256 newThreshold
    ) external {
        if (newThreshold > MAX_RISK_THRESHOLD) revert InvalidThreshold();
        
        Delegation storage delegation = delegations[msg.sender][daoGovernor];
        if (!delegation.active) revert NotDelegated();
        
        delegation.riskThreshold = newThreshold;
        
        emit VotingPowerDelegated(msg.sender, daoGovernor, newThreshold);
    }

    // ============ AI BACKEND FUNCTIONS ============
    
    /**
     * @notice Cast a vote with risk assessment (AI backend only)
     * @param daoGovernor The DAO's governor contract
     * @param proposalId The proposal to vote on
     * @param user The user whose voting power to use
     * @param support 0=against, 1=for, 2=abstain
     * @param riskScore AI-calculated risk score (0-100)
     * @param riskReportHash IPFS/Arweave hash of the full risk report
     * 
     * THIS IS THE MAIN FUNCTION YOUR BACKEND TEAM WILL CALL
     * 
     * FLOW:
     * 1. AI backend detects new proposal (via ProposalCreated event)
     * 2. AI backend analyzes proposal off-chain
     * 3. AI backend generates risk score + report
     * 4. AI backend calls this function
     * 5. We check: Is risk < user's threshold?
     *    - YES: Cast vote, log decision
     *    - NO: Emit HighRiskProposalDetected, don't vote
     * 
     * SECURITY:
     * - Only authorized backends can call this
     * - We verify user actually delegated
     * - We check risk against user's threshold
     * - All decisions are logged to AuditLogger
     */
    function castVoteWithRisk(
        address daoGovernor,
        uint256 proposalId,
        address user,
        uint8 support,
        uint256 riskScore,
        bytes32 riskReportHash
    ) external onlyAuthorizedBackend whenNotPaused {
        
        // Get user's delegation settings
        Delegation storage delegation = delegations[user][daoGovernor];
        
        // Verify user has active delegation
        if (!delegation.active) revert NotDelegated();
        
        // Validate support value
        if (support > 2) revert InvalidSupport();
        
        // DECISION POINT: Is this proposal safe enough to auto-vote?
        
        // Case 1: User requires approval for ALL votes
        if (delegation.requiresApproval) {
            // Mark as pending and wait for user
            pendingApprovals[user][proposalId][daoGovernor] = true;
            emit ApprovalRequired(proposalId, user, riskScore);
            
            // Log the flag
            auditLogger.logHighRiskFlag(
                proposalId, 
                daoGovernor, 
                user, 
                riskScore, 
                riskReportHash
            );
            return;
        }
        
        // Case 2: Risk exceeds user's threshold
        if (riskScore >= delegation.riskThreshold) {
            // Don't vote - flag for human review
            emit HighRiskProposalDetected(proposalId, user, riskScore);
            
            // Log the high-risk flag
            auditLogger.logHighRiskFlag(
                proposalId,
                daoGovernor,
                user,
                riskScore,
                riskReportHash
            );
            return;
        }
        
        // Case 3: Risk is acceptable - proceed with vote!
        
        // Cast vote on the DAO governor
        // NOTE: This works because user has delegated their voting power
        // through the token's delegation mechanism
        _castVote(daoGovernor, proposalId, support);
        
        // Log the decision to audit trail
        auditLogger.logDecision(
            proposalId,
            daoGovernor,
            user,
            support,
            riskScore,
            riskReportHash,
            true // This WAS an auto-vote
        );
        
        emit VoteCastByAI(proposalId, user, support, riskScore);
    }
    
    /**
     * @notice Batch vote for multiple proposals/users efficiently
     * @dev Gas optimization for when many votes need to be cast
     * 
     * USE CASE:
     * A new proposal appears and 100 users have delegated.
     * Instead of 100 separate transactions, batch them into fewer calls.
     * 
     * MONAD ADVANTAGE:
     * With 10,000 TPS, even large batches execute quickly.
     */
    function castMultipleVotes(
        address daoGovernor,
        uint256[] calldata proposalIds,
        address[] calldata users,
        uint8[] calldata voteTypes,
        uint256[] calldata riskScores,
        bytes32[] calldata reportHashes
    ) external onlyAuthorizedBackend whenNotPaused {
        
        // Validate arrays have same length
        require(
            proposalIds.length == users.length &&
            users.length == voteTypes.length &&
            voteTypes.length == riskScores.length &&
            riskScores.length == reportHashes.length,
            "Array length mismatch"
        );
        
        // Process each vote
        for (uint256 i = 0; i < proposalIds.length; i++) {
            // Use try-catch so one failure doesn't block others
            try this.castVoteWithRisk(
                daoGovernor,
                proposalIds[i],
                users[i],
                voteTypes[i],
                riskScores[i],
                reportHashes[i]
            ) {
                // Success - continue to next
            } catch {
                // Failed - emit event but continue
                // Could be: user revoked, already voted, etc.
            }
        }
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get a user's delegation settings for a specific DAO
     * @param user The user's address
     * @param daoGovernor The DAO's governor contract
     * @return The delegation struct with all settings
     */
    function getDelegation(address user, address daoGovernor) 
        external view returns (Delegation memory) 
    {
        return delegations[user][daoGovernor];
    }
    
    /**
     * @notice Check if a user has active delegation for a DAO
     * @param user The user's address
     * @param daoGovernor The DAO's governor contract
     * @return True if delegation is active
     */
    function hasDelegation(address user, address daoGovernor) 
        external view returns (bool) 
    {
        return delegations[user][daoGovernor].active;
    }
    
    /**
     * @notice Get all DAOs a user has delegated to
     * @param user The user's address
     * @return Array of DAO governor addresses
     */
    function getUserDAOs(address user) 
        external view returns (address[] memory) 
    {
        return userDAOs[user];
    }
    
    /**
     * @notice Check if a backend address is authorized
     */
    function isAuthorizedBackend(address backend) 
        external view returns (bool) 
    {
        return authorizedBackends[backend];
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Pause the contract in emergency
     * @dev Stops all voting operations
     */
    function pause() external onlyAdmin {
        paused = true;
        emit ContractPaused(msg.sender);
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyAdmin {
        paused = false;
        emit ContractUnpaused(msg.sender);
    }
    
    /**
     * @notice Authorize a new AI backend address
     * @param backend The backend address to authorize
     * 
     * USE CASE:
     * - Adding redundant backend servers
     * - Upgrading to new AI system
     * - Different backends for different analysis types
     */
    function authorizeBackend(address backend) external onlyAdmin {
        if (backend == address(0)) revert ZeroAddress();
        authorizedBackends[backend] = true;
        emit BackendAuthorized(backend);
    }
    
    /**
     * @notice Revoke an AI backend's authorization
     * @param backend The backend address to revoke
     */
    function revokeBackend(address backend) external onlyAdmin {
        authorizedBackends[backend] = false;
        emit BackendRevoked(backend);
    }
    
    /**
     * @notice Start admin transfer (2-step process for safety)
     * @param newAdmin The address of the new admin
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        pendingAdmin = newAdmin;
        emit AdminTransferStarted(admin, newAdmin);
    }
    
    /**
     * @notice Accept admin role (called by pending admin)
     */
    function acceptAdmin() external {
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        
        address previousAdmin = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        
        emit AdminTransferred(previousAdmin, admin);
    }

    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @notice Internal function to cast a vote on a DAO
     * @param daoGovernor The DAO's governor contract
     * @param proposalId The proposal to vote on
     * @param support The vote direction
     * 
     * IMPORTANT:
     * For this to work, the user must have:
     * 1. Governance tokens in their wallet
     * 2. Delegated those tokens' voting power to themselves (default) or this contract
     * 
     * The actual voting power comes from the token's delegation, not this contract.
     */
    function _castVote(
        address daoGovernor,
        uint256 proposalId,
        uint8 support
    ) internal {
        IDAOGovernor(daoGovernor).castVote(proposalId, support);
    }
}
