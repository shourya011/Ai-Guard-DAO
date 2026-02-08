// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVotingAgent
 * @notice Interface for the VotingAgent contract
 * @dev This interface defines the core functions for AI-powered voting delegation
 * 
 * PURPOSE:
 * The VotingAgent is the heart of the AI Guard Dog system. It allows users to
 * delegate their voting power to an AI system that analyzes proposals and
 * votes on their behalf based on risk thresholds they set.
 * 
 * KEY CONCEPTS:
 * - Delegation: Users grant permission (not tokens) for AI to vote on their behalf
 * - Risk Threshold: User-defined limit (0-100) - AI only votes if risk is below this
 * - Non-Custodial: User's tokens never leave their wallet
 */
interface IVotingAgent {
    
    // ============ STRUCTS ============
    
    /**
     * @notice Stores a user's delegation preferences for a specific DAO
     * @param active Whether the delegation is currently active
     * @param riskThreshold Risk score limit (0-100). AI votes only if proposal risk < this value
     * @param delegatedAt Timestamp when delegation was created
     * @param requiresApproval If true, AI must get user approval before voting (even for low risk)
     */
    struct Delegation {
        bool active;
        uint256 riskThreshold;
        uint256 delegatedAt;
        bool requiresApproval;
    }

    // ============ EVENTS ============
    
    /**
     * @notice Emitted when a user delegates their voting power
     * @param user The address of the user delegating
     * @param daoGovernor The DAO they're delegating for
     * @param riskThreshold The risk limit they set
     */
    event VotingPowerDelegated(
        address indexed user,
        address indexed daoGovernor,
        uint256 riskThreshold
    );

    /**
     * @notice Emitted when a user revokes their delegation
     */
    event DelegationRevoked(
        address indexed user,
        address indexed daoGovernor
    );

    /**
     * @notice Emitted when all delegations are revoked (emergency)
     */
    event AllDelegationsRevoked(address indexed user);

    /**
     * @notice Emitted when AI successfully casts a vote
     * @param proposalId The proposal that was voted on
     * @param user The user whose voting power was used
     * @param support 0=against, 1=for, 2=abstain
     * @param riskScore The AI-calculated risk score
     */
    event VoteCastByAI(
        uint256 indexed proposalId,
        address indexed user,
        uint8 support,
        uint256 riskScore
    );

    /**
     * @notice Emitted when a proposal is flagged as high risk
     * @dev Vote is NOT cast when this happens - user must review
     */
    event HighRiskProposalDetected(
        uint256 indexed proposalId,
        address indexed user,
        uint256 riskScore
    );

    /**
     * @notice Emitted when a medium-risk proposal needs user approval
     */
    event ApprovalRequired(
        uint256 indexed proposalId,
        address indexed user,
        uint256 riskScore
    );

    /**
     * @notice Emitted when user manually approves a high-risk vote
     */
    event HighRiskVoteApproved(
        address indexed user,
        uint256 indexed proposalId,
        uint8 support
    );

    // ============ USER FUNCTIONS ============

    /**
     * @notice Delegate voting power to AI for a specific DAO
     * @param daoGovernor Address of the DAO's governor contract
     * @param riskThreshold Maximum acceptable risk score (0-100)
     * @param requireApproval Whether to require manual approval for each vote
     */
    function delegateVotingPower(
        address daoGovernor,
        uint256 riskThreshold,
        bool requireApproval
    ) external;

    /**
     * @notice Revoke delegation for a specific DAO
     * @param daoGovernor Address of the DAO to revoke from
     */
    function revokeDelegation(address daoGovernor) external;

    /**
     * @notice Emergency: Revoke ALL delegations across all DAOs
     */
    function revokeAll() external;

    /**
     * @notice Manually approve a vote for a high-risk proposal
     * @param daoGovernor The DAO's governor contract
     * @param proposalId The proposal to vote on
     * @param support 0=against, 1=for, 2=abstain
     */
    function approveHighRiskVote(
        address daoGovernor,
        uint256 proposalId,
        uint8 support
    ) external;

    // ============ AI BACKEND FUNCTIONS ============

    /**
     * @notice Cast a vote with risk assessment (AI backend only)
     * @param daoGovernor The DAO's governor contract
     * @param proposalId The proposal to vote on
     * @param user The user whose voting power to use
     * @param support 0=against, 1=for, 2=abstain
     * @param riskScore AI-calculated risk score (0-100)
     * @param riskReportHash IPFS/Arweave hash of the full risk report
     */
    function castVoteWithRisk(
        address daoGovernor,
        uint256 proposalId,
        address user,
        uint8 support,
        uint256 riskScore,
        bytes32 riskReportHash
    ) external;

    /**
     * @notice Batch vote for multiple users (AI backend only)
     */
    function castMultipleVotes(
        address daoGovernor,
        uint256[] calldata proposalIds,
        address[] calldata users,
        uint8[] calldata voteTypes,
        uint256[] calldata riskScores,
        bytes32[] calldata reportHashes
    ) external;

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get a user's delegation settings for a specific DAO
     * @param user The user's address
     * @param daoGovernor The DAO's governor contract
     * @return The delegation struct
     */
    function getDelegation(address user, address daoGovernor) 
        external view returns (Delegation memory);

    /**
     * @notice Check if a user has active delegation for a DAO
     */
    function hasDelegation(address user, address daoGovernor) 
        external view returns (bool);
}
