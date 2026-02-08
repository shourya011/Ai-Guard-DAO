// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IAuditLogger.sol";

/**
 * @title AuditLogger
 * @author AI Guard Dog Team
 * @notice Immutable on-chain audit trail for all AI voting decisions
 * @dev Deployed on Monad to leverage low gas fees for frequent logging
 * 
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║                         AUDIT LOGGER                                   ║
 * ║                                                                        ║
 * ║  PURPOSE:                                                              ║
 * ║  Creates permanent, tamper-proof records of every AI decision.        ║
 * ║  Think of it as a "black box recorder" for the AI voting system.      ║
 * ║                                                                        ║
 * ║  WHY IT MATTERS:                                                       ║
 * ║  - Users can verify their votes were cast correctly                   ║
 * ║  - DAOs can audit the AI's behavior                                   ║
 * ║  - Disputes can be resolved with on-chain proof                       ║
 * ║  - Regulators/auditors have full transparency                         ║
 * ║                                                                        ║
 * ║  DATA STORED:                                                          ║
 * ║  - Proposal ID + DAO address                                          ║
 * ║  - User who delegated the vote                                        ║
 * ║  - Vote direction (for/against/abstain)                               ║
 * ║  - Risk score from AI analysis                                        ║
 * ║  - Hash linking to full off-chain report                              ║
 * ║  - Timestamp of decision                                              ║
 * ║  - Whether it was auto-voted or human-approved                        ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */
contract AuditLogger is IAuditLogger {
    
    // ============ STATE VARIABLES ============
    
    /**
     * @notice The VotingAgent contract - only it can log decisions
     * @dev Set once during deployment, cannot be changed
     */
    address public votingAgent;
    
    /**
     * @notice Contract owner for initial setup
     */
    address public owner;
    
    /**
     * @notice Whether the VotingAgent has been set (one-time operation)
     */
    bool public votingAgentSet;
    
    /**
     * @notice Master array of all audit entries (chronological)
     * @dev Used for global queries and statistics
     */
    AuditEntry[] public auditTrail;
    
    /**
     * @notice Mapping from proposalId => array of audit entries
     * @dev Allows querying all votes for a specific proposal
     */
    mapping(uint256 => AuditEntry[]) public proposalAudits;
    
    /**
     * @notice Mapping from proposalId => daoGovernor => array of entries
     * @dev More specific queries when same proposalId exists across DAOs
     */
    mapping(uint256 => mapping(address => AuditEntry[])) public proposalDAOAudits;
    
    /**
     * @notice Mapping from user address => array of their audit entries
     * @dev Allows users to see their complete voting history
     */
    mapping(address => AuditEntry[]) public userAudits;
    
    /**
     * @notice Mapping from DAO address => array of all entries for that DAO
     * @dev Allows DAOs to audit all AI activity in their governance
     */
    mapping(address => AuditEntry[]) public daoAudits;
    
    /**
     * @notice Track high-risk flags separately
     */
    AuditEntry[] public highRiskFlags;

    // ============ ERRORS ============
    
    error OnlyVotingAgent();
    error OnlyOwner();
    error VotingAgentAlreadySet();
    error ZeroAddress();

    // ============ MODIFIERS ============
    
    /**
     * @notice Restricts function to VotingAgent contract only
     * @dev Critical security: only VotingAgent can write to audit log
     */
    modifier onlyVotingAgent() {
        if (msg.sender != votingAgent) revert OnlyVotingAgent();
        _;
    }
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // ============ CONSTRUCTOR ============
    
    /**
     * @notice Deploy the AuditLogger
     * @dev VotingAgent address is set separately to handle circular dependency
     * 
     * DEPLOYMENT ORDER:
     * 1. Deploy AuditLogger
     * 2. Deploy VotingAgent (passing AuditLogger address)
     * 3. Call setVotingAgent() on AuditLogger (passing VotingAgent address)
     */
    constructor() {
        owner = msg.sender;
    }

    // ============ SETUP FUNCTIONS ============
    
    /**
     * @notice Set the VotingAgent address (one-time only)
     * @param _votingAgent Address of the VotingAgent contract
     * 
     * SECURITY:
     * - Can only be called once
     * - Only owner can call
     * - Prevents malicious contracts from logging fake entries
     */
    function setVotingAgent(address _votingAgent) external onlyOwner {
        if (votingAgentSet) revert VotingAgentAlreadySet();
        if (_votingAgent == address(0)) revert ZeroAddress();
        
        votingAgent = _votingAgent;
        votingAgentSet = true;
    }

    // ============ LOGGING FUNCTIONS ============
    
    /**
     * @notice Log a voting decision
     * @dev Called by VotingAgent after successfully casting a vote
     * 
     * WHEN THIS IS CALLED:
     * 1. AI analyzes proposal → risk score < user's threshold
     * 2. VotingAgent casts vote on DAO
     * 3. VotingAgent calls this function to record the decision
     * 
     * DATA FLOW:
     * Off-chain AI → VotingAgent.castVoteWithRisk() → DAOGovernor.castVote()
     *                       ↓
     *              AuditLogger.logDecision() ← YOU ARE HERE
     * 
     * @param proposalId The proposal that was voted on
     * @param daoGovernor The DAO's governor contract address
     * @param user The user whose voting power was used
     * @param support Vote direction (0=against, 1=for, 2=abstain)
     * @param riskScore AI-calculated risk score (0-100)
     * @param reportHash IPFS/Arweave hash linking to full analysis report
     * @param wasAutoVote True if AI voted automatically, false if user approved manually
     */
    function logDecision(
        uint256 proposalId,
        address daoGovernor,
        address user,
        uint8 support,
        uint256 riskScore,
        bytes32 reportHash,
        bool wasAutoVote
    ) external onlyVotingAgent {
        
        // Create the audit entry
        AuditEntry memory entry = AuditEntry({
            proposalId: proposalId,
            daoGovernor: daoGovernor,
            user: user,
            support: support,
            riskScore: riskScore,
            reportHash: reportHash,
            timestamp: block.timestamp,
            wasAutoVote: wasAutoVote
        });
        
        // Store in all relevant mappings for different query patterns
        auditTrail.push(entry);                              // Global chronological
        proposalAudits[proposalId].push(entry);              // By proposal ID
        proposalDAOAudits[proposalId][daoGovernor].push(entry); // By proposal + DAO
        userAudits[user].push(entry);                        // By user
        daoAudits[daoGovernor].push(entry);                  // By DAO
        
        // Emit event for off-chain listeners
        emit DecisionLogged(
            proposalId,
            daoGovernor,
            user,
            support,
            riskScore,
            reportHash,
            wasAutoVote
        );
    }
    
    /**
     * @notice Log when a proposal is flagged as high risk
     * @dev Called when AI detects risk >= user's threshold
     * 
     * WHEN THIS IS CALLED:
     * 1. AI analyzes proposal → risk score >= user's threshold
     * 2. VotingAgent does NOT cast vote
     * 3. VotingAgent calls this to record the flag
     * 4. User gets notified to review manually
     * 
     * WHY LOG THIS?
     * - Track which proposals were flagged
     * - Audit false positive rates
     * - User can see why AI didn't vote
     */
    function logHighRiskFlag(
        uint256 proposalId,
        address daoGovernor,
        address user,
        uint256 riskScore,
        bytes32 reportHash
    ) external onlyVotingAgent {
        
        // Create entry with support=255 to indicate "flagged, not voted"
        AuditEntry memory entry = AuditEntry({
            proposalId: proposalId,
            daoGovernor: daoGovernor,
            user: user,
            support: 255, // Special value: flagged but not voted
            riskScore: riskScore,
            reportHash: reportHash,
            timestamp: block.timestamp,
            wasAutoVote: false
        });
        
        // Store in high risk flags array
        highRiskFlags.push(entry);
        
        // Also store in user audits so they can see their flags
        userAudits[user].push(entry);
        
        emit HighRiskFlagged(
            proposalId,
            daoGovernor,
            user,
            riskScore,
            reportHash
        );
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get all audit entries for a specific proposal
     * @param proposalId The proposal ID to query
     * @return Array of all audit entries for this proposal
     * 
     * USE CASE:
     * "Show me everyone who voted on proposal #42 through AI Guard Dog"
     */
    function getProposalAudit(uint256 proposalId) 
        external view returns (AuditEntry[] memory) 
    {
        return proposalAudits[proposalId];
    }
    
    /**
     * @notice Get audit entries for a proposal in a specific DAO
     * @dev Use this when multiple DAOs might have same proposal IDs
     */
    function getProposalAuditByDAO(uint256 proposalId, address daoGovernor) 
        external view returns (AuditEntry[] memory) 
    {
        return proposalDAOAudits[proposalId][daoGovernor];
    }
    
    /**
     * @notice Get a user's voting history
     * @param user The user's address
     * @param limit Maximum entries to return (0 = all)
     * @return Array of audit entries (most recent first)
     * 
     * USE CASE:
     * "Show me my last 10 AI-assisted votes"
     */
    function getUserAuditHistory(address user, uint256 limit) 
        external view returns (AuditEntry[] memory) 
    {
        AuditEntry[] storage userHistory = userAudits[user];
        uint256 totalEntries = userHistory.length;
        
        // If limit is 0 or greater than total, return all
        uint256 returnCount = (limit == 0 || limit > totalEntries) 
            ? totalEntries 
            : limit;
        
        // Return most recent entries
        AuditEntry[] memory result = new AuditEntry[](returnCount);
        for (uint256 i = 0; i < returnCount; i++) {
            // Get from end of array (most recent)
            result[i] = userHistory[totalEntries - 1 - i];
        }
        
        return result;
    }
    
    /**
     * @notice Get all audit entries for a specific DAO
     * @param daoGovernor The DAO's governor address
     * 
     * USE CASE:
     * DAO admin wants to see all AI voting activity in their governance
     */
    function getDAOAuditHistory(address daoGovernor) 
        external view returns (AuditEntry[] memory) 
    {
        return daoAudits[daoGovernor];
    }
    
    /**
     * @notice Get total number of decisions logged
     * @return The count of all logged decisions
     * 
     * USE CASE:
     * Dashboard showing "X votes cast through AI Guard Dog"
     */
    function getTotalDecisions() external view returns (uint256) {
        return auditTrail.length;
    }
    
    /**
     * @notice Get total high risk flags
     */
    function getTotalHighRiskFlags() external view returns (uint256) {
        return highRiskFlags.length;
    }
    
    /**
     * @notice Get decisions within a time range
     * @param startTime Unix timestamp for range start
     * @param endTime Unix timestamp for range end
     * @return Array of entries within the time range
     * 
     * USE CASE:
     * "Show me all AI votes from last week"
     * 
     * NOTE: This is O(n) and may be expensive for large audit trails.
     * For production, consider using events + off-chain indexing.
     */
    function getDecisionsByTimeRange(uint256 startTime, uint256 endTime) 
        external view returns (AuditEntry[] memory) 
    {
        // First, count matching entries
        uint256 count = 0;
        for (uint256 i = 0; i < auditTrail.length; i++) {
            if (auditTrail[i].timestamp >= startTime && 
                auditTrail[i].timestamp <= endTime) {
                count++;
            }
        }
        
        // Then collect them
        AuditEntry[] memory result = new AuditEntry[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < auditTrail.length; i++) {
            if (auditTrail[i].timestamp >= startTime && 
                auditTrail[i].timestamp <= endTime) {
                result[index] = auditTrail[i];
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Get a specific audit entry by index
     * @param index The index in the global audit trail
     */
    function getAuditEntry(uint256 index) 
        external view returns (AuditEntry memory) 
    {
        require(index < auditTrail.length, "Index out of bounds");
        return auditTrail[index];
    }
    
    /**
     * @notice Get all high risk flags
     */
    function getAllHighRiskFlags() 
        external view returns (AuditEntry[] memory) 
    {
        return highRiskFlags;
    }
}
