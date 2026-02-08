const { ethers } = require("hardhat");

/**
 * Monad DAO Deployment Script
 * 
 * Deploys all DAO contracts in the correct order:
 * 1. DAOToken
 * 2. Treasury
 * 3. Timelock
 * 4. MemberRegistry
 * 5. ProposalManager
 * 6. VotingEngine
 * 7. DAOCore
 * 8. AIAgentRegistry
 */

async function main() {
    console.log("=== Deploying Monad DAO ===\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MON\n");
    
    // Configuration
    const DAO_NAME = "Monad DAO";
    const DAO_DESCRIPTION = "A decentralized autonomous organization on Monad";
    const TOKEN_NAME = "Monad DAO Token";
    const TOKEN_SYMBOL = "MDAO";
    const TIMELOCK_DELAY = 2 * 24 * 60 * 60; // 2 days in seconds
    const MIN_STAKE = 0; // No minimum for demo
    
    // Track deployed addresses
    const deployed = {};
    
    // 1. Deploy DAOToken
    console.log("1. Deploying DAOToken...");
    const DAOToken = await ethers.getContractFactory("DAOToken");
    const initialSupply = ethers.parseEther("1000000"); // 1 million tokens
    const daoToken = await DAOToken.deploy(TOKEN_NAME, TOKEN_SYMBOL, initialSupply);
    await daoToken.waitForDeployment();
    deployed.daoToken = await daoToken.getAddress();
    console.log("   DAOToken deployed at:", deployed.daoToken);
    
    // 2. Deploy Treasury
    console.log("\n2. Deploying Treasury...");
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy();
    await treasury.waitForDeployment();
    deployed.treasury = await treasury.getAddress();
    console.log("   Treasury deployed at:", deployed.treasury);
    
    // 3. Deploy Timelock
    console.log("\n3. Deploying Timelock...");
    const Timelock = await ethers.getContractFactory("Timelock");
    const timelock = await Timelock.deploy(deployer.address, TIMELOCK_DELAY);
    await timelock.waitForDeployment();
    deployed.timelock = await timelock.getAddress();
    console.log("   Timelock deployed at:", deployed.timelock);
    
    // 4. Deploy MemberRegistry
    console.log("\n4. Deploying MemberRegistry...");
    const MemberRegistry = await ethers.getContractFactory("MemberRegistry");
    const memberRegistry = await MemberRegistry.deploy(MIN_STAKE);
    await memberRegistry.waitForDeployment();
    deployed.memberRegistry = await memberRegistry.getAddress();
    console.log("   MemberRegistry deployed at:", deployed.memberRegistry);
    
    // 5. Deploy ProposalManager
    console.log("\n5. Deploying ProposalManager...");
    const ProposalManager = await ethers.getContractFactory("ProposalManager");
    const proposalManager = await ProposalManager.deploy();
    await proposalManager.waitForDeployment();
    deployed.proposalManager = await proposalManager.getAddress();
    console.log("   ProposalManager deployed at:", deployed.proposalManager);
    
    // 6. Deploy VotingEngine
    console.log("\n6. Deploying VotingEngine...");
    const VotingEngine = await ethers.getContractFactory("VotingEngine");
    const votingEngine = await VotingEngine.deploy();
    await votingEngine.waitForDeployment();
    deployed.votingEngine = await votingEngine.getAddress();
    console.log("   VotingEngine deployed at:", deployed.votingEngine);
    
    // 7. Deploy DAOCore
    console.log("\n7. Deploying DAOCore...");
    const DAOCore = await ethers.getContractFactory("DAOCore");
    const daoCore = await DAOCore.deploy(DAO_NAME, DAO_DESCRIPTION);
    await daoCore.waitForDeployment();
    deployed.daoCore = await daoCore.getAddress();
    console.log("   DAOCore deployed at:", deployed.daoCore);
    
    // 8. Deploy AIAgentRegistry
    console.log("\n8. Deploying AIAgentRegistry...");
    const AIAgentRegistry = await ethers.getContractFactory("AIAgentRegistry");
    const aiAgentRegistry = await AIAgentRegistry.deploy();
    await aiAgentRegistry.waitForDeployment();
    deployed.aiAgentRegistry = await aiAgentRegistry.getAddress();
    console.log("   AIAgentRegistry deployed at:", deployed.aiAgentRegistry);
    
    // === Initialize Contracts ===
    console.log("\n=== Initializing Contracts ===\n");
    
    // Initialize DAOCore
    console.log("Initializing DAOCore...");
    await daoCore.initialize({
        daoToken: deployed.daoToken,
        treasury: deployed.treasury,
        proposalManager: deployed.proposalManager,
        votingEngine: deployed.votingEngine,
        memberRegistry: deployed.memberRegistry,
        timelock: deployed.timelock
    });
    await daoCore.setAIAgentRegistry(deployed.aiAgentRegistry);
    console.log("   DAOCore initialized");
    
    // Initialize ProposalManager
    console.log("Initializing ProposalManager...");
    await proposalManager.initialize(
        deployed.daoCore,
        deployed.votingEngine,
        deployed.treasury,
        deployed.daoToken
    );
    console.log("   ProposalManager initialized");
    
    // Initialize VotingEngine
    console.log("Initializing VotingEngine...");
    await votingEngine.initialize(
        deployed.daoToken,
        deployed.proposalManager,
        deployed.daoCore
    );
    console.log("   VotingEngine initialized");
    
    // Initialize MemberRegistry
    console.log("Initializing MemberRegistry...");
    await memberRegistry.setDAOCore(deployed.daoCore);
    console.log("   MemberRegistry initialized");
    
    // Initialize Treasury
    console.log("Initializing Treasury...");
    // Treasury.initialize(daoCore, emergencySigners[], emergencyThreshold)
    await treasury.initialize(
        deployed.daoCore,
        [deployer.address], // Emergency signer (deployer for demo)
        1                   // Threshold of 1 for demo
    );
    console.log("   Treasury initialized");
    
    // Initialize AIAgentRegistry
    console.log("Initializing AIAgentRegistry...");
    await aiAgentRegistry.initialize(deployed.daoCore, deployed.votingEngine);
    console.log("   AIAgentRegistry initialized");
    
    // === Summary ===
    console.log("\n" + "=".repeat(60));
    console.log("         MONAD DAO DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log("\nDeployed Contracts:");
    console.log("-".repeat(60));
    console.log(`DAOCore:          ${deployed.daoCore}`);
    console.log(`DAOToken:         ${deployed.daoToken}`);
    console.log(`Treasury:         ${deployed.treasury}`);
    console.log(`ProposalManager:  ${deployed.proposalManager}`);
    console.log(`VotingEngine:     ${deployed.votingEngine}`);
    console.log(`MemberRegistry:   ${deployed.memberRegistry}`);
    console.log(`Timelock:         ${deployed.timelock}`);
    console.log(`AIAgentRegistry:  ${deployed.aiAgentRegistry}`);
    console.log("-".repeat(60));
    
    // Save deployment info
    const fs = require("fs");
    const deploymentInfo = {
        network: network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: deployed
    };
    
    fs.writeFileSync(
        "deployment.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\nDeployment info saved to deployment.json");
    
    return deployed;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
