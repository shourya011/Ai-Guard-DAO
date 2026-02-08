// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAuditLogger
 * @notice Interface for the AuditLogger contract
 * @dev This interface defines the audit trail storage system
 * 
 * PURPOSE:
 * The AuditLogger creates an immutable, transparent record of every decision
 * made by the AI Guard Dog system. This serves multiple purposes:
 * 
 * 1. TRANSPARENCY: Anyone can verify why a vote was cast
 * 2. ACCOUNTABILITY: AI decisions are permanently recorded
 * 3. DISPUTE RESOLUTION: If users question a vote, proof exists on-chain
 * 4. ANALYTICS: DAOs can analyze voting patterns and risk trends
 * 
 * WHY ON-CHAIN?
 * - Immutable: Cannot be altered after the fact
 * - Trustless: No central party controls the records
 * - Verifiable: Anyone can audit the history
 * - Monad's low gas fees make this economically viable
 */
interface IAuditLogger {
    
    // ============ STRUCTS ============
    
    /**
     * @notice Represents a single audit entry for a voting decision
     * @param proposalId The proposal that was voted on
     * @param daoGovernor The DAO's governor contract
     * @param user The user whose voting power was used
     * @param support The vote direction (0=against, 1=for, 2=abstain)
     * @param riskScore The AI-calculated risk score (0-100)
     * @param reportHash Hash linking to the full off-chain report (IPFS/Arweave)
     * @param timestamp When this decision was made
     * @param wasAutoVote True if AI voted automatically, false if user approved manually
     */
    struct AuditEntry {
        uint256 proposalId;
        address daoGovernor;
        address user;
        uint8 support;
        uint256 riskScore;
        bytes32 reportHash;
        uint256 timestamp;
        bool wasAutoVote;
    }

    // ============ EVENTS ============
    
    /**
     * @notice Emitted when a new decision is logged
     * @dev Frontend and analytics tools should listen for this
     */
    event DecisionLogged(
        uint256 indexed proposalId,
        address indexed daoGovernor,
        address indexed user,
        uint8 support,
        uint256 riskScore,
        bytes32 reportHash,
        bool wasAutoVote
    );

    /**
     * @notice Emitted when a high-risk proposal is flagged (but not voted on)
     */
    event HighRiskFlagged(
        uint256 indexed proposalId,
        address indexed daoGovernor,
        address indexed user,
        uint256 riskScore,
        bytes32 reportHash
    );

    // ============ FUNCTIONS ============

    /**
     * @notice Log a voting decision (called by VotingAgent only)
     * @param proposalId The proposal that was voted on
     * @param daoGovernor The DAO's governor contract
     * @param user The user whose voting power was used
     * @param support Vote direction
     * @param riskScore AI risk score
     * @param reportHash Link to full report
     * @param wasAutoVote Whether this was automatic or user-approved
     */
    function logDecision(
        uint256 proposalId,
        address daoGovernor,
        address user,
        uint8 support,
        uint256 riskScore,
        bytes32 reportHash,
        bool wasAutoVote
    ) external;

    /**
     * @notice Log when a proposal is flagged as high risk
     */
    function logHighRiskFlag(
        uint256 proposalId,
        address daoGovernor,
        address user,
        uint256 riskScore,
        bytes32 reportHash
    ) external;

    /**
     * @notice Get all audit entries for a specific proposal
     * @param proposalId The proposal ID to query
     * @return Array of audit entries
     */
    function getProposalAudit(uint256 proposalId) 
        external view returns (AuditEntry[] memory);

    /**
     * @notice Get audit entries for a specific proposal in a specific DAO
     */
    function getProposalAuditByDAO(uint256 proposalId, address daoGovernor) 
        external view returns (AuditEntry[] memory);

    /**
     * @notice Get a user's voting history
     * @param user The user's address
     * @param limit Maximum entries to return
     * @return Array of audit entries
     */
    function getUserAuditHistory(address user, uint256 limit) 
        external view returns (AuditEntry[] memory);

    /**
     * @notice Get total number of decisions logged
     */
    function getTotalDecisions() external view returns (uint256);

    /**
     * @notice Get decisions within a time range
     */
    function getDecisionsByTimeRange(uint256 startTime, uint256 endTime) 
        external view returns (AuditEntry[] memory);
}
