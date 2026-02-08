// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";

// Core contracts
import "../contracts/core/DAOCore.sol";
import "../contracts/core/DAOToken.sol";
import "../contracts/core/Treasury.sol";

// Governance contracts
import "../contracts/governance/ProposalManager.sol";
import "../contracts/governance/VotingEngine.sol";
import "../contracts/governance/Timelock.sol";

// Membership contracts
import "../contracts/membership/MemberRegistry.sol";

// Integration contracts
import "../contracts/integration/AIAgentRegistry.sol";

/**
 * @title DeployDAO
 * @notice Deployment script for the complete Monad DAO system
 * 
 * DEPLOYMENT ORDER:
 * 1. DAOToken - Governance token with checkpoints
 * 2. Treasury - Fund management
 * 3. Timelock - Delayed execution (optional for MVP)
 * 4. MemberRegistry - Member management
 * 5. ProposalManager - Proposal lifecycle
 * 6. VotingEngine - Voting logic
 * 7. DAOCore - Central coordinator
 * 8. AIAgentRegistry - AI Guard Dog integration
 * 
 * POST-DEPLOYMENT:
 * - Initialize all contracts with addresses
 * - Set up roles and permissions
 * - Connect to AI Guard Dog VotingAgent
 */
contract DeployDAO {
    
    // Deployed addresses
    DAOCore public daoCore;
    DAOToken public daoToken;
    Treasury public treasury;
    Timelock public timelock;
    MemberRegistry public memberRegistry;
    ProposalManager public proposalManager;
    VotingEngine public votingEngine;
    AIAgentRegistry public aiAgentRegistry;
    
    // Configuration
    string public constant DAO_NAME = "Monad DAO";
    string public constant DAO_DESCRIPTION = "A decentralized autonomous organization on Monad";
    string public constant TOKEN_NAME = "Monad DAO Token";
    string public constant TOKEN_SYMBOL = "MDAO";
    
    uint256 public constant INITIAL_SUPPLY = 10_000_000 * 10**18; // 10 million tokens
    uint256 public constant TIMELOCK_DELAY = 2 days;
    uint256 public constant MIN_STAKE_TO_JOIN = 0; // No minimum for demo
    
    event DAODeployed(
        address daoCore,
        address daoToken,
        address treasury,
        address proposalManager,
        address votingEngine,
        address memberRegistry,
        address timelock,
        address aiAgentRegistry
    );
    
    /**
     * @notice Deploy all DAO contracts
     */
    function deploy() external returns (address) {
        console.log("=== Deploying Monad DAO ===");
        console.log("Deployer:", msg.sender);
        
        // 1. Deploy DAO Token
        console.log("\n1. Deploying DAOToken...");
        daoToken = new DAOToken(TOKEN_NAME, TOKEN_SYMBOL, msg.sender);
        console.log("   DAOToken deployed at:", address(daoToken));
        
        // Mint initial supply to deployer
        // Note: The token constructor may have already minted, check your DAOToken
        
        // 2. Deploy Treasury
        console.log("\n2. Deploying Treasury...");
        treasury = new Treasury(address(daoToken));
        console.log("   Treasury deployed at:", address(treasury));
        
        // 3. Deploy Timelock
        console.log("\n3. Deploying Timelock...");
        timelock = new Timelock(msg.sender, TIMELOCK_DELAY);
        console.log("   Timelock deployed at:", address(timelock));
        
        // 4. Deploy MemberRegistry
        console.log("\n4. Deploying MemberRegistry...");
        memberRegistry = new MemberRegistry(MIN_STAKE_TO_JOIN);
        console.log("   MemberRegistry deployed at:", address(memberRegistry));
        
        // 5. Deploy ProposalManager
        console.log("\n5. Deploying ProposalManager...");
        proposalManager = new ProposalManager();
        console.log("   ProposalManager deployed at:", address(proposalManager));
        
        // 6. Deploy VotingEngine
        console.log("\n6. Deploying VotingEngine...");
        votingEngine = new VotingEngine();
        console.log("   VotingEngine deployed at:", address(votingEngine));
        
        // 7. Deploy DAOCore
        console.log("\n7. Deploying DAOCore...");
        daoCore = new DAOCore(DAO_NAME, DAO_DESCRIPTION);
        console.log("   DAOCore deployed at:", address(daoCore));
        
        // 8. Deploy AIAgentRegistry
        console.log("\n8. Deploying AIAgentRegistry...");
        aiAgentRegistry = new AIAgentRegistry();
        console.log("   AIAgentRegistry deployed at:", address(aiAgentRegistry));
        
        // === Initialize Contracts ===
        console.log("\n=== Initializing Contracts ===");
        
        // Initialize DAOCore
        console.log("\nInitializing DAOCore...");
        daoCore.initialize(IDAOCore.DAOConfig({
            daoToken: address(daoToken),
            treasury: address(treasury),
            proposalManager: address(proposalManager),
            votingEngine: address(votingEngine),
            memberRegistry: address(memberRegistry),
            timelock: address(timelock)
        }));
        daoCore.setAIAgentRegistry(address(aiAgentRegistry));
        
        // Initialize ProposalManager
        console.log("Initializing ProposalManager...");
        proposalManager.initialize(
            address(daoCore),
            address(votingEngine),
            address(treasury),
            address(daoToken)
        );
        
        // Initialize VotingEngine
        console.log("Initializing VotingEngine...");
        votingEngine.initialize(
            address(daoToken),
            address(proposalManager),
            address(daoCore)
        );
        
        // Initialize MemberRegistry
        console.log("Initializing MemberRegistry...");
        memberRegistry.setDAOCore(address(daoCore));
        
        // Initialize Treasury
        console.log("Initializing Treasury...");
        treasury.setDAOCore(address(daoCore));
        treasury.setProposalManager(address(proposalManager));
        
        // Initialize AIAgentRegistry
        console.log("Initializing AIAgentRegistry...");
        aiAgentRegistry.initialize(address(daoCore), address(votingEngine));
        
        console.log("\n=== Deployment Complete ===");
        console.log("DAOCore:", address(daoCore));
        console.log("DAOToken:", address(daoToken));
        console.log("Treasury:", address(treasury));
        console.log("ProposalManager:", address(proposalManager));
        console.log("VotingEngine:", address(votingEngine));
        console.log("MemberRegistry:", address(memberRegistry));
        console.log("Timelock:", address(timelock));
        console.log("AIAgentRegistry:", address(aiAgentRegistry));
        
        emit DAODeployed(
            address(daoCore),
            address(daoToken),
            address(treasury),
            address(proposalManager),
            address(votingEngine),
            address(memberRegistry),
            address(timelock),
            address(aiAgentRegistry)
        );
        
        return address(daoCore);
    }
    
    /**
     * @notice Get all deployed addresses
     */
    function getDeployedAddresses() external view returns (
        address _daoCore,
        address _daoToken,
        address _treasury,
        address _proposalManager,
        address _votingEngine,
        address _memberRegistry,
        address _timelock,
        address _aiAgentRegistry
    ) {
        return (
            address(daoCore),
            address(daoToken),
            address(treasury),
            address(proposalManager),
            address(votingEngine),
            address(memberRegistry),
            address(timelock),
            address(aiAgentRegistry)
        );
    }
}
