const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *                    REGISTER AI AGENT - AI GUARD DOG INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This script connects the AI Guard Dog (VotingAgent) to the Monad DAO.
 * 
 * WHAT IT DOES:
 * 1. Reads VotingAgent address from GuardDao deployment
 * 2. Registers the agent in AIAgentRegistry
 * 3. Authorizes the agent in VotingEngine
 * 4. Optionally sets up test user delegation
 * 
 * PREREQUISITE:
 * - monad-dao deployed (deployment.json exists)
 * - GuardDao VotingAgent deployed (../deployment.json exists)
 * 
 * USAGE:
 *   npx hardhat run scripts/register-ai-agent.js --network localhost
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============ CONFIGURATION ============

const CONFIG = {
    // AI Agent metadata
    AGENT_NAME: "AI Guard Dog",
    AGENT_DESCRIPTION: "AI-powered voting agent that protects DAO treasuries by analyzing proposal risk",
    AGENT_STRATEGY: "Analyzes proposals using rule-based + AI scoring. Auto-votes on low risk (<20), alerts on high risk (>60)",
    AGENT_WEBSITE: "https://github.com/your-repo/guard-dao",
    
    // Manual agent address (if not reading from GuardDao deployment)
    MANUAL_AGENT_ADDRESS: null // Set this if you deployed VotingAgent separately
};

// ============ HELPERS ============

function loadDeployment(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findGuardDaoDeployment() {
    // Try different possible locations
    const possiblePaths = [
        path.join(__dirname, "../../deployment.json"),           // Parent folder
        path.join(__dirname, "../../deployment-localhost.json"), // Parent folder with network
        path.join(__dirname, `../../deployment-${network.name}.json`),
    ];
    
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            console.log(`   Found GuardDao deployment at: ${p}`);
            return JSON.parse(fs.readFileSync(p, "utf8"));
        }
    }
    
    return null;
}

// ============ MAIN FUNCTION ============

async function main() {
    console.log("\n" + "═".repeat(60));
    console.log("       AI GUARD DOG - REGISTRATION & INTEGRATION");
    console.log("═".repeat(60) + "\n");
    
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Account: ${deployer.address}`);
    console.log(`📡 Network: ${network.name}\n`);
    
    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Load Deployments
    // ═══════════════════════════════════════════════════════════════════
    console.log("📄 Step 1: Loading Deployments...\n");
    
    // Load monad-dao deployment
    const monadDaoDeployment = loadDeployment("deployment.json") || 
                               loadDeployment(`deployment-${network.name}.json`);
    
    if (!monadDaoDeployment) {
        throw new Error("Monad DAO deployment not found. Run deploy.js first!");
    }
    console.log("   ✅ Loaded monad-dao deployment");
    
    // Load or get VotingAgent address
    let votingAgentAddress = CONFIG.MANUAL_AGENT_ADDRESS;
    
    if (!votingAgentAddress) {
        const guardDaoDeployment = findGuardDaoDeployment();
        if (guardDaoDeployment && guardDaoDeployment.contracts && guardDaoDeployment.contracts.votingAgent) {
            votingAgentAddress = guardDaoDeployment.contracts.votingAgent;
            console.log("   ✅ Found VotingAgent from GuardDao deployment");
        }
    }
    
    if (!votingAgentAddress) {
        console.log("\n⚠️  VotingAgent address not found!");
        console.log("   Options:");
        console.log("   1. Deploy GuardDao contracts first");
        console.log("   2. Set MANUAL_AGENT_ADDRESS in this script");
        console.log("\n   Creating a placeholder registration for demo...\n");
        
        // Use deployer as placeholder for demo
        votingAgentAddress = deployer.address;
    }
    
    console.log(`   📍 VotingAgent address: ${votingAgentAddress}\n`);
    
    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Register Agent in AIAgentRegistry
    // ═══════════════════════════════════════════════════════════════════
    console.log("🤖 Step 2: Registering in AIAgentRegistry...\n");
    
    const aiAgentRegistry = await ethers.getContractAt(
        "AIAgentRegistry",
        monadDaoDeployment.contracts.aiAgentRegistry
    );
    
    // Check if already registered
    const agentInfo = await aiAgentRegistry.getAgentInfo(votingAgentAddress);
    
    if (agentInfo.agentAddress === ethers.ZeroAddress) {
        console.log("   Registering agent...");
        await aiAgentRegistry.registerAgent(
            votingAgentAddress,
            CONFIG.AGENT_NAME,
            CONFIG.AGENT_DESCRIPTION,
            CONFIG.AGENT_STRATEGY,
            CONFIG.AGENT_WEBSITE
        );
        console.log("   ✅ Agent registered in AIAgentRegistry");
    } else {
        console.log("   ℹ️  Agent already registered");
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Authorize Agent in VotingEngine
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n🔐 Step 3: Authorizing in VotingEngine...\n");
    
    const votingEngine = await ethers.getContractAt(
        "VotingEngine",
        monadDaoDeployment.contracts.votingEngine
    );
    
    // Check if already authorized
    const isAuthorized = await votingEngine.isAuthorizedAgent(votingAgentAddress);
    
    if (!isAuthorized) {
        console.log("   Authorizing agent...");
        await votingEngine.authorizeAgent(votingAgentAddress);
        console.log("   ✅ Agent authorized in VotingEngine");
    } else {
        console.log("   ℹ️  Agent already authorized");
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Setup Test Delegation (deployer delegates to agent)
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n🗳️ Step 4: Setting Up Test Delegation...\n");
    
    // Check current delegation in VotingEngine
    const hasDelegated = await votingEngine.hasDelegatedTo(deployer.address, votingAgentAddress);
    
    if (!hasDelegated) {
        console.log("   Delegating deployer's voting to agent...");
        await votingEngine.delegateToAgent(votingAgentAddress);
        console.log("   ✅ Deployer delegated to AI agent in VotingEngine");
    } else {
        console.log("   ℹ️  Already delegated in VotingEngine");
    }
    
    // Also delegate in AIAgentRegistry
    const hasDelegatedRegistry = await aiAgentRegistry.hasDelegatedTo(deployer.address, votingAgentAddress);
    
    if (!hasDelegatedRegistry) {
        console.log("   Registering delegation in AIAgentRegistry...");
        await aiAgentRegistry.delegateToAgent(votingAgentAddress);
        console.log("   ✅ Deployer delegated to AI agent in Registry");
    } else {
        console.log("   ℹ️  Already delegated in Registry");
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(60));
    console.log("       REGISTRATION COMPLETE ✅");
    console.log("═".repeat(60));
    
    // Get final agent info
    const finalInfo = await aiAgentRegistry.getAgentInfo(votingAgentAddress);
    const finalStats = await aiAgentRegistry.getAgentStats(votingAgentAddress);
    
    console.log("\n📋 Agent Status:");
    console.log("─".repeat(40));
    console.log(`   Name:        ${finalInfo.name}`);
    console.log(`   Address:     ${finalInfo.agentAddress}`);
    console.log(`   Active:      ${finalInfo.active}`);
    console.log(`   Delegators:  ${finalStats.delegatorCount}`);
    console.log(`   Votes Cast:  ${finalInfo.votesExecuted}`);
    console.log("─".repeat(40));
    
    console.log("\n🎯 Integration Points:");
    console.log(`   AIAgentRegistry: ${monadDaoDeployment.contracts.aiAgentRegistry}`);
    console.log(`   VotingEngine:    ${monadDaoDeployment.contracts.votingEngine}`);
    console.log(`   VotingAgent:     ${votingAgentAddress}`);
    
    console.log("\n🎉 Next step:");
    console.log(`   npx hardhat run scripts/create-test-proposal.js --network ${network.name}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Registration failed:");
        console.error(error);
        process.exit(1);
    });
