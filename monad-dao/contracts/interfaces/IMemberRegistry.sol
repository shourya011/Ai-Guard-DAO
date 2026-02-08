// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMemberRegistry
 * @notice Interface for member management and reputation
 */
interface IMemberRegistry {
    
    // ============ ENUMS ============
    
    enum MemberStatus {
        None,       // Not a member
        Pending,    // Application pending
        Active,     // Full member
        Suspended,  // Temporarily suspended
        Banned      // Permanently banned
    }

    // ============ STRUCTS ============
    
    /**
     * @notice Human-readable member profile
     */
    struct MemberProfile {
        string displayName;
        string bio;
        string avatarURI;
        string[] socialLinks;
    }

    /**
     * @notice Machine data for member
     */
    struct MemberData {
        address wallet;
        MemberStatus status;
        uint256 joinedAt;
        uint256 reputation;
        uint256 proposalsCreated;
        uint256 votesParticipated;
        uint256 lastActiveAt;
    }

    // ============ EVENTS ============
    
    event MemberRegistered(
        address indexed member,
        string displayName,
        uint256 timestamp
    );

    event MemberStatusChanged(
        address indexed member,
        MemberStatus oldStatus,
        MemberStatus newStatus
    );

    event ReputationUpdated(
        address indexed member,
        uint256 oldReputation,
        uint256 newReputation,
        string reason
    );

    event ProfileUpdated(
        address indexed member,
        string displayName
    );

    // ============ FUNCTIONS ============
    
    function register(MemberProfile memory profile) external;
    function updateProfile(MemberProfile memory profile) external;
    function updateStatus(address member, MemberStatus status) external;
    
    function addReputation(address member, uint256 amount, string calldata reason) external;
    function removeReputation(address member, uint256 amount, string calldata reason) external;
    
    function getMemberData(address member) external view returns (MemberData memory);
    function getMemberProfile(address member) external view returns (MemberProfile memory);
    function isMember(address account) external view returns (bool);
    function isActiveMember(address account) external view returns (bool);
    function getMemberCount() external view returns (uint256);
    function getTopMembers(uint256 limit) external view returns (address[] memory);
}
