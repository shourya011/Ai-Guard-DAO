// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IMemberRegistry.sol";

/**
 * @title MemberRegistry
 * @author Monad DAO Team
 * @notice Manages DAO membership and reputation
 * @dev Tracks both human-readable profiles and machine data for members
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                        MEMBER REGISTRY                                     ║
 * ║                                                                            ║
 * ║  PURPOSE:                                                                  ║
 * ║  - Track who can participate in DAO governance                            ║
 * ║  - Store member profiles (human data)                                     ║
 * ║  - Track reputation and activity (machine data)                           ║
 * ║  - Manage member status (active, suspended, banned)                       ║
 * ║                                                                            ║
 * ║  MACHINE DATA:                                                             ║
 * ║  - Join timestamp                                                         ║
 * ║  - Reputation score                                                       ║
 * ║  - Proposal count                                                         ║
 * ║  - Vote participation count                                               ║
 * ║  - Last active timestamp                                                  ║
 * ║                                                                            ║
 * ║  HUMAN DATA:                                                               ║
 * ║  - Display name                                                           ║
 * ║  - Bio                                                                    ║
 * ║  - Avatar URI                                                             ║
 * ║  - Social links                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
contract MemberRegistry is IMemberRegistry {
    
    // ============ STATE VARIABLES ============
    
    /// @notice DAO Core contract
    address public daoCore;
    
    /// @notice Owner for initial setup
    address public owner;
    
    /// @notice Minimum stake required to become member
    uint256 public minStakeToJoin;
    
    /// @notice All members (for enumeration)
    address[] public allMembers;
    
    /// @notice Member index in array (for removal)
    mapping(address => uint256) public memberIndex;
    
    /// @notice Member data storage
    mapping(address => MemberData) internal _memberData;
    
    /// @notice Member profile storage
    mapping(address => MemberProfile) internal _memberProfiles;
    
    /// @notice Total member count
    uint256 public memberCount;
    
    /// @notice Admins who can manage members
    mapping(address => bool) public admins;
    
    /// @notice Initial reputation for new members
    uint256 public constant INITIAL_REPUTATION = 100;
    
    /// @notice Maximum reputation
    uint256 public constant MAX_REPUTATION = 10000;

    // ============ ERRORS ============
    
    error Unauthorized();
    error AlreadyMember();
    error NotMember();
    error InvalidStatus();
    error ZeroAddress();
    error InsufficientStake();
    error MemberSuspended();
    error MemberBanned();

    // ============ MODIFIERS ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier onlyAdmin() {
        if (!admins[msg.sender] && msg.sender != owner && msg.sender != daoCore) {
            revert Unauthorized();
        }
        _;
    }
    
    modifier onlyDAOCore() {
        if (msg.sender != daoCore && msg.sender != owner) revert Unauthorized();
        _;
    }

    // ============ CONSTRUCTOR ============
    
    constructor(uint256 _minStake) {
        owner = msg.sender;
        admins[msg.sender] = true;
        minStakeToJoin = _minStake;
    }

    // ============ REGISTRATION FUNCTIONS ============
    
    /**
     * @notice Register as a new member
     * @param profile Human-readable profile information
     */
    function register(MemberProfile memory profile) external override {
        if (_memberData[msg.sender].status != MemberStatus.None) {
            revert AlreadyMember();
        }
        
        // Create member data (machine data)
        _memberData[msg.sender] = MemberData({
            wallet: msg.sender,
            status: MemberStatus.Active,
            joinedAt: block.timestamp,
            reputation: INITIAL_REPUTATION,
            proposalsCreated: 0,
            votesParticipated: 0,
            lastActiveAt: block.timestamp
        });
        
        // Store profile (human data)
        _memberProfiles[msg.sender] = profile;
        
        // Add to member list
        memberIndex[msg.sender] = allMembers.length;
        allMembers.push(msg.sender);
        memberCount++;
        
        emit MemberRegistered(msg.sender, profile.displayName, block.timestamp);
    }
    
    /**
     * @notice Update member profile
     * @param profile New profile information
     */
    function updateProfile(MemberProfile memory profile) external override {
        if (_memberData[msg.sender].status == MemberStatus.None) {
            revert NotMember();
        }
        
        _memberProfiles[msg.sender] = profile;
        _memberData[msg.sender].lastActiveAt = block.timestamp;
        
        emit ProfileUpdated(msg.sender, profile.displayName);
    }
    
    /**
     * @notice Update member status (admin only)
     * @param member Member address
     * @param status New status
     */
    function updateStatus(address member, MemberStatus status) 
        external override onlyAdmin 
    {
        if (_memberData[member].status == MemberStatus.None) {
            revert NotMember();
        }
        
        MemberStatus oldStatus = _memberData[member].status;
        _memberData[member].status = status;
        
        emit MemberStatusChanged(member, oldStatus, status);
    }

    // ============ REPUTATION FUNCTIONS ============
    
    /**
     * @notice Add reputation to a member
     * @param member Member address
     * @param amount Reputation to add
     * @param reason Human-readable reason
     */
    function addReputation(
        address member,
        uint256 amount,
        string calldata reason
    ) external override onlyAdmin {
        if (_memberData[member].status == MemberStatus.None) {
            revert NotMember();
        }
        
        uint256 oldRep = _memberData[member].reputation;
        uint256 newRep = oldRep + amount;
        
        // Cap at max reputation
        if (newRep > MAX_REPUTATION) {
            newRep = MAX_REPUTATION;
        }
        
        _memberData[member].reputation = newRep;
        
        emit ReputationUpdated(member, oldRep, newRep, reason);
    }
    
    /**
     * @notice Remove reputation from a member
     * @param member Member address
     * @param amount Reputation to remove
     * @param reason Human-readable reason
     */
    function removeReputation(
        address member,
        uint256 amount,
        string calldata reason
    ) external override onlyAdmin {
        if (_memberData[member].status == MemberStatus.None) {
            revert NotMember();
        }
        
        uint256 oldRep = _memberData[member].reputation;
        uint256 newRep = oldRep > amount ? oldRep - amount : 0;
        
        _memberData[member].reputation = newRep;
        
        emit ReputationUpdated(member, oldRep, newRep, reason);
    }

    // ============ ACTIVITY TRACKING ============
    
    /**
     * @notice Record that member created a proposal
     * @param member Member address
     */
    function recordProposalCreated(address member) external onlyDAOCore {
        if (_memberData[member].status == MemberStatus.None) return;
        
        _memberData[member].proposalsCreated++;
        _memberData[member].lastActiveAt = block.timestamp;
    }
    
    /**
     * @notice Record that member voted
     * @param member Member address
     */
    function recordVoteParticipation(address member) external onlyDAOCore {
        if (_memberData[member].status == MemberStatus.None) return;
        
        _memberData[member].votesParticipated++;
        _memberData[member].lastActiveAt = block.timestamp;
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get member's machine data
     */
    function getMemberData(address member) 
        external view override 
        returns (MemberData memory) 
    {
        return _memberData[member];
    }
    
    /**
     * @notice Get member's human-readable profile
     */
    function getMemberProfile(address member) 
        external view override 
        returns (MemberProfile memory) 
    {
        return _memberProfiles[member];
    }
    
    /**
     * @notice Check if address is a member (any status)
     */
    function isMember(address account) external view override returns (bool) {
        return _memberData[account].status != MemberStatus.None;
    }
    
    /**
     * @notice Check if address is an active member
     */
    function isActiveMember(address account) external view override returns (bool) {
        return _memberData[account].status == MemberStatus.Active;
    }
    
    /**
     * @notice Get total member count
     */
    function getMemberCount() external view override returns (uint256) {
        return memberCount;
    }
    
    /**
     * @notice Get top members by reputation
     * @param limit Maximum members to return
     */
    function getTopMembers(uint256 limit) 
        external view override 
        returns (address[] memory) 
    {
        uint256 count = limit > allMembers.length ? allMembers.length : limit;
        address[] memory result = new address[](count);
        
        // Simple implementation - for production, use a more efficient sorting
        // Copy addresses with reputation
        address[] memory temp = new address[](allMembers.length);
        uint256[] memory reps = new uint256[](allMembers.length);
        
        for (uint256 i = 0; i < allMembers.length; i++) {
            temp[i] = allMembers[i];
            reps[i] = _memberData[allMembers[i]].reputation;
        }
        
        // Simple bubble sort (fine for small arrays in view function)
        for (uint256 i = 0; i < count; i++) {
            for (uint256 j = i + 1; j < temp.length; j++) {
                if (reps[j] > reps[i]) {
                    // Swap
                    (temp[i], temp[j]) = (temp[j], temp[i]);
                    (reps[i], reps[j]) = (reps[j], reps[i]);
                }
            }
            result[i] = temp[i];
        }
        
        return result;
    }
    
    /**
     * @notice Get all members (paginated)
     * @param offset Starting index
     * @param limit Maximum to return
     */
    function getMembers(uint256 offset, uint256 limit) 
        external view 
        returns (address[] memory) 
    {
        if (offset >= allMembers.length) {
            return new address[](0);
        }
        
        uint256 end = offset + limit;
        if (end > allMembers.length) {
            end = allMembers.length;
        }
        
        uint256 count = end - offset;
        address[] memory result = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            result[i] = allMembers[offset + i];
        }
        
        return result;
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Set DAO Core contract
     */
    function setDAOCore(address _daoCore) external onlyOwner {
        if (_daoCore == address(0)) revert ZeroAddress();
        daoCore = _daoCore;
    }
    
    /**
     * @notice Add admin
     */
    function addAdmin(address admin) external onlyOwner {
        if (admin == address(0)) revert ZeroAddress();
        admins[admin] = true;
    }
    
    /**
     * @notice Remove admin
     */
    function removeAdmin(address admin) external onlyOwner {
        admins[admin] = false;
    }
    
    /**
     * @notice Set minimum stake to join
     */
    function setMinStake(uint256 newMinStake) external onlyOwner {
        minStakeToJoin = newMinStake;
    }
    
    /**
     * @notice Force add member (admin only, for setup)
     */
    function forceAddMember(
        address member,
        MemberProfile memory profile
    ) external onlyAdmin {
        if (_memberData[member].status != MemberStatus.None) {
            revert AlreadyMember();
        }
        
        _memberData[member] = MemberData({
            wallet: member,
            status: MemberStatus.Active,
            joinedAt: block.timestamp,
            reputation: INITIAL_REPUTATION,
            proposalsCreated: 0,
            votesParticipated: 0,
            lastActiveAt: block.timestamp
        });
        
        _memberProfiles[member] = profile;
        
        memberIndex[member] = allMembers.length;
        allMembers.push(member);
        memberCount++;
        
        emit MemberRegistered(member, profile.displayName, block.timestamp);
    }
}
