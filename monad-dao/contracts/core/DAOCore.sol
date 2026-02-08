// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IDAOCore.sol";

/**
 * @title DAOCore
 * @author Monad DAO Team
 * @notice Central coordinator for the DAO system
 * @dev Links all DAO components and manages configuration
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                          DAO CORE                                          ║
 * ║                                                                            ║
 * ║  PURPOSE:                                                                  ║
 * ║  - Central registry for all DAO contracts                                 ║
 * ║  - Store DAO configuration parameters                                     ║
 * ║  - Manage DAO-wide settings                                               ║
 * ║  - Coordinate between components                                          ║
 * ║                                                                            ║
 * ║  MACHINE DATA:                                                             ║
 * ║  - Contract addresses                                                     ║
 * ║  - Thresholds and parameters                                              ║
 * ║  - Creation timestamp                                                     ║
 * ║                                                                            ║
 * ║  HUMAN DATA:                                                               ║
 * ║  - DAO name                                                               ║
 * ║  - Description                                                            ║
 * ║  - Website URL                                                            ║
 * ║                                                                            ║
 * ║  INTEGRATION:                                                              ║
 * ║  This is the main entry point for AI Guard Dog to query                   ║
 * ║  DAO information and find related contracts.                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
contract DAOCore is IDAOCore {
    
    // ============ CONSTANTS ============
    
    /// @notice Version string
    string public constant VERSION = "1.0.0";

    // ============ STATE VARIABLES ============
    
    /// @notice DAO name (human data)
    string public daoName;
    
    /// @notice DAO description (human data)
    string public daoDescription;
    
    /// @notice Website URL (human data)
    string public websiteURL;
    
    /// @notice DAO creation timestamp (machine data)
    uint256 public createdAt;
    
    /// @notice DAO Token contract
    address public daoToken;
    
    /// @notice Treasury contract
    address public treasury;
    
    /// @notice Proposal Manager contract
    address public proposalManager;
    
    /// @notice Voting Engine contract
    address public votingEngine;
    
    /// @notice Member Registry contract
    address public memberRegistry;
    
    /// @notice Timelock contract (optional)
    address public timelock;
    
    /// @notice Owner (initially deployer, later governance)
    address public owner;
    
    /// @notice Whether DAO is initialized
    bool public initialized;
    
    /// @notice Whether DAO is paused
    bool public paused;
    
    /// @notice AI Agent Registry (for AI Guard Dog integration)
    address public aiAgentRegistry;

    // ============ ERRORS ============
    
    error Unauthorized();
    error AlreadyInitialized();
    error NotInitialized();
    error DAOPaused();
    error ZeroAddress();
    error InvalidName();

    // ============ MODIFIERS ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert DAOPaused();
        _;
    }
    
    modifier afterInit() {
        if (!initialized) revert NotInitialized();
        _;
    }

    // ============ CONSTRUCTOR ============
    
    /**
     * @notice Create the DAO Core
     * @param _name DAO name
     * @param _description DAO description
     */
    constructor(string memory _name, string memory _description) {
        if (bytes(_name).length == 0) revert InvalidName();
        
        daoName = _name;
        daoDescription = _description;
        createdAt = block.timestamp;
        owner = msg.sender;
    }

    // ============ INITIALIZATION ============
    
    /**
     * @notice Initialize DAO with all component addresses
     * @param config Configuration with all contract addresses
     */
    function initialize(DAOConfig memory config) external override onlyOwner {
        if (initialized) revert AlreadyInitialized();
        
        daoToken = config.daoToken;
        treasury = config.treasury;
        proposalManager = config.proposalManager;
        votingEngine = config.votingEngine;
        memberRegistry = config.memberRegistry;
        timelock = config.timelock;
        
        initialized = true;
        
        emit DAOInitialized(address(this), config);
    }

    // ============ CONFIGURATION ============
    
    /**
     * @notice Get DAO configuration
     */
    function getConfig() external view override returns (DAOConfig memory) {
        return DAOConfig({
            daoToken: daoToken,
            treasury: treasury,
            proposalManager: proposalManager,
            votingEngine: votingEngine,
            memberRegistry: memberRegistry,
            timelock: timelock
        });
    }
    
    /**
     * @notice Update single component address
     * @param component Component name
     * @param newAddress New contract address
     */
    function updateComponent(
        string calldata component,
        address newAddress
    ) external onlyOwner {
        if (newAddress == address(0)) revert ZeroAddress();
        
        bytes32 compHash = keccak256(bytes(component));
        
        if (compHash == keccak256("daoToken")) {
            daoToken = newAddress;
        } else if (compHash == keccak256("treasury")) {
            treasury = newAddress;
        } else if (compHash == keccak256("proposalManager")) {
            proposalManager = newAddress;
        } else if (compHash == keccak256("votingEngine")) {
            votingEngine = newAddress;
        } else if (compHash == keccak256("memberRegistry")) {
            memberRegistry = newAddress;
        } else if (compHash == keccak256("timelock")) {
            timelock = newAddress;
        } else if (compHash == keccak256("aiAgentRegistry")) {
            aiAgentRegistry = newAddress;
        }
        
        emit ComponentUpdated(component, newAddress);
    }
    
    /**
     * @notice Get component address by name
     */
    function getComponent(string calldata component) 
        external view 
        returns (address) 
    {
        bytes32 compHash = keccak256(bytes(component));
        
        if (compHash == keccak256("daoToken")) return daoToken;
        if (compHash == keccak256("treasury")) return treasury;
        if (compHash == keccak256("proposalManager")) return proposalManager;
        if (compHash == keccak256("votingEngine")) return votingEngine;
        if (compHash == keccak256("memberRegistry")) return memberRegistry;
        if (compHash == keccak256("timelock")) return timelock;
        if (compHash == keccak256("aiAgentRegistry")) return aiAgentRegistry;
        
        return address(0);
    }

    // ============ DAO METADATA ============
    
    /**
     * @notice Update DAO metadata
     */
    function updateMetadata(
        string calldata _name,
        string calldata _description,
        string calldata _website
    ) external onlyOwner {
        if (bytes(_name).length > 0) {
            daoName = _name;
        }
        daoDescription = _description;
        websiteURL = _website;
        
        emit MetadataUpdated(_name, _description, _website);
    }
    
    /**
     * @notice Get DAO info
     */
    function getDAOInfo() external view override returns (DAOInfo memory) {
        return DAOInfo({
            name: daoName,
            description: daoDescription,
            website: websiteURL,
            createdAt: createdAt,
            owner: owner,
            version: VERSION,
            paused: paused
        });
    }

    // ============ PAUSE MECHANISM ============
    
    /**
     * @notice Pause the DAO (emergency)
     */
    function pause() external onlyOwner {
        paused = true;
        emit DAOPausedEvent(msg.sender);
    }
    
    /**
     * @notice Unpause the DAO
     */
    function unpause() external onlyOwner {
        paused = false;
        emit DAOUnpaused(msg.sender);
    }

    // ============ OWNERSHIP ============
    
    /**
     * @notice Transfer ownership to governance
     * @param newOwner New owner address (typically timelock)
     */
    function transferOwnership(address newOwner) external override onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        
        address oldOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // ============ AI GUARD DOG INTEGRATION ============
    
    /**
     * @notice Set AI Agent Registry address
     * @param registry AIAgentRegistry contract address
     */
    function setAIAgentRegistry(address registry) external onlyOwner {
        aiAgentRegistry = registry;
        emit ComponentUpdated("aiAgentRegistry", registry);
    }
    
    /**
     * @notice Get all contract addresses for AI Guard Dog
     * @dev Used by AI system to discover all DAO components
     */
    function getAllContracts() external view returns (
        address _daoToken,
        address _treasury,
        address _proposalManager,
        address _votingEngine,
        address _memberRegistry,
        address _timelock,
        address _aiAgentRegistry
    ) {
        return (
            daoToken,
            treasury,
            proposalManager,
            votingEngine,
            memberRegistry,
            timelock,
            aiAgentRegistry
        );
    }
    
    /**
     * @notice Check if DAO is fully operational
     */
    function isOperational() external view returns (bool) {
        return initialized && 
               !paused && 
               daoToken != address(0) && 
               proposalManager != address(0) && 
               votingEngine != address(0);
    }

    // ============ EVENTS ============
    
    event DAOPausedEvent(address indexed by);
    event DAOUnpaused(address indexed by);
    event MetadataUpdated(string name, string description, string website);
    event ComponentUpdated(string component, address newAddress);
}
