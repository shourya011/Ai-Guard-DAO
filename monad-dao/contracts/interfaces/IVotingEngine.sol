// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVotingEngine
 * @notice Interface for the voting logic contract
 */
interface IVotingEngine {
    
    // ============ ENUMS ============
    
    enum VoteType {
        Against,    // 0
        For,        // 1
        Abstain     // 2
    }

    // ============ STRUCTS ============
    
    /**
     * @notice Record of a single vote
     */
    struct VoteReceipt {
        bool hasVoted;
        VoteType voteType;
        uint256 weight;
        string reason;
        uint256 timestamp;
    }

    /**
     * @notice Voting statistics for a proposal
     */
    struct VotingStats {
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 totalVoters;
        uint256 quorumReached;
        bool passed;
    }

    // ============ EVENTS ============
    
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        VoteType voteType,
        uint256 weight,
        string reason
    );

    event VoteCastByDelegate(
        address indexed delegate,
        address indexed voter,
        uint256 indexed proposalId,
        VoteType voteType,
        uint256 weight
    );

    event QuorumReached(uint256 indexed proposalId, uint256 totalVotes);

    // ============ FUNCTIONS ============
    
    function castVote(
        uint256 proposalId,
        VoteType voteType
    ) external returns (uint256 weight);

    function castVoteWithReason(
        uint256 proposalId,
        VoteType voteType,
        string calldata reason
    ) external returns (uint256 weight);

    function castVoteOnBehalf(
        uint256 proposalId,
        address voter,
        VoteType voteType,
        string calldata reason
    ) external returns (uint256 weight);

    function getVoteReceipt(
        uint256 proposalId,
        address voter
    ) external view returns (VoteReceipt memory);

    function getVotingStats(
        uint256 proposalId
    ) external view returns (VotingStats memory);

    function hasVoted(
        uint256 proposalId,
        address voter
    ) external view returns (bool);

    function getVotingPower(
        address account,
        uint256 blockNumber
    ) external view returns (uint256);
}
