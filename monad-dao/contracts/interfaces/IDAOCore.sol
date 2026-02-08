// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDAOCore
 * @notice Main interface for the DAO coordinator contract
 */
interface IDAOCore {
    
    // ============ ENUMS ============
    
    enum Role {
        NONE,
        MEMBER,
        DELEGATE,
        ADMIN,
        SUPER_ADMIN
    }

    // ============ STRUCTS ============
    
    /// @notice Contract addresses configuration
    struct DAOConfig {
        address daoToken;
        address treasury;
        address proposalManager;
        address votingEngine;
        address memberRegistry;
        address timelock;
    }
    
    /// @notice DAO metadata info
    struct DAOInfo {
        string name;
        string description;
        string website;
        uint256 createdAt;
        address owner;
        string version;
        bool paused;
    }

    // ============ EVENTS ============
    
    event DAOInitialized(address indexed daoCore, DAOConfig config);
    event ConfigUpdated(string parameter, uint256 oldValue, uint256 newValue);
    event ContractRegistered(string name, address contractAddress);
    event RoleGranted(address indexed account, Role role);
    event RoleRevoked(address indexed account, Role role);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ============ FUNCTIONS ============
    
    function initialize(DAOConfig memory config) external;
    function getConfig() external view returns (DAOConfig memory);
    function getDAOInfo() external view returns (DAOInfo memory);
    function transferOwnership(address newOwner) external;
}
