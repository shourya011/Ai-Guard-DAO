const { ethers, network } = require("hardhat");
const fs = require("fs");

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *                    SETUP DAO - POST-DEPLOYMENT CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This script configures the DAO after deployment:
 * 
 * 1. VOTING PARAMETERS
 *    - Voting delay (blocks before voting starts)
 *    - Voting period (how long voting lasts)
 *    - Quorum percentage
 *    - Passing threshold
 * 
 * 2. TREASURY SETTINGS
 *    - Daily spending limit
 *    - Max single transfer limit
 *    - Authorized spenders
 * 
 * 3. MEMBER SETUP
 *    - Register deployer as initial member
 *    - Set up admin roles
 * 
 * 4. TOKEN DISTRIBUTION (optional)
 *    - Distribute tokens to test accounts
 *    - Set up delegation
 * 
 * PREREQUISITE:
 *   Run deploy.js first to create deployment.json
 * 
 * USAGE:
 *   npx hardhat run scripts/setup-dao.js --network localhost
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============ CONFIGURATION ============

const CONFIG = {
    // Voting parameters
    VOTING_DELAY: 1,           // 1 block delay before voting starts
    VOTING_PERIOD: 100,        // 100 blocks for local testing (increase for production)
    QUORUM_BPS: 400,           // 4% quorum
    PASSING_THRESHOLD_BPS: 5000, // 50% to pass
    
    // Treasury settings
    DAILY_LIMIT_BPS: 2000,     // 20% daily limit
    MAX_SINGLE_TRANSFER_BPS: 1000, // 10% max single transfer
    
    // Token distribution for testing
    TEST_DISTRIBUTION: [
        // { address: "0x...", amount: "1000" }
    ]
};

// ============ HELPERS ============

function loadDeployment() {
    const deploymentPath = `deployment-${network.name}.json`;
    if (!fs.existsSync(deploymentPath)) {
        // Try generic deployment.json
        if (!fs.existsSync("deployment.json")) {
            throw new Error("No deployment.json found. Run deploy.js first!");
        }
        return JSON.parse(fs.readFileSync("deployment.json", "utf8"));
    }
    return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
}

// ============ MAIN FUNCTION ============

async function main() {
    console.log("\n" + "═".repeat(60));
    console.log("          MONAD DAO - POST-DEPLOYMENT SETUP");
    console.log("═".repeat(60) + "\n");
    
    // Load deployment
    const deployment = loadDeployment();
    const contracts = deployment.contracts;
    
    console.log(`📄 Loaded deployment from: ${deployment.network}`);
    console.log(`   Deployed at: ${deployment.timestamp}\n`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Setup account: ${deployer.address}\n`);
    
    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Configure Voting Parameters
    // ═══════════════════════════════════════════════════════════════════
    console.log("📊 Step 1: Configuring Voting Parameters...\n");
    
    const proposalManager = await ethers.getContractAt(
        "ProposalManager",
        contracts.proposalManager
    );
    
    console.log("   Setting voting delay...");
    await proposalManager.setVotingDelay(CONFIG.VOTING_DELAY);
    console.log(`   ✅ Voting delay: ${CONFIG.VOTING_DELAY} blocks`);
    
    console.log("   Setting voting period...");
    await proposalManager.setVotingPeriod(CONFIG.VOTING_PERIOD);
    console.log(`   ✅ Voting period: ${CONFIG.VOTING_PERIOD} blocks`);
    
    console.log("   Setting quorum...");
    await proposalManager.setQuorum(CONFIG.QUORUM_BPS);
    console.log(`   ✅ Quorum: ${CONFIG.QUORUM_BPS / 100}%`);
    
    console.log("   Setting passing threshold...");
    await proposalManager.setPassingThreshold(CONFIG.PASSING_THRESHOLD_BPS);
    console.log(`   ✅ Passing threshold: ${CONFIG.PASSING_THRESHOLD_BPS / 100}%`);
    
    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Configure Treasury
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n💰 Step 2: Configuring Treasury...\n");
    
    const treasury = await ethers.getContractAt(
        "Treasury",
        contracts.treasury
    );
    
    console.log("   Setting daily spend limit...");
    await treasury.setDailyLimit(CONFIG.DAILY_LIMIT_BPS);
    console.log(`   ✅ Daily limit: ${CONFIG.DAILY_LIMIT_BPS / 100}% of balance`);
    
    console.log("   Setting max single transfer...");
    await treasury.setMaxSingleTransfer(CONFIG.MAX_SINGLE_TRANSFER_BPS);
    console.log(`   ✅ Max single transfer: ${CONFIG.MAX_SINGLE_TRANSFER_BPS / 100}% of balance`);
    
    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Register Initial Member
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n👤 Step 3: Registering Initial Member...\n");
    
    const memberRegistry = await ethers.getContractAt(
        "MemberRegistry",
        contracts.memberRegistry
    );
    
    // Check if already registered
    const isMember = await memberRegistry.isMember(deployer.address);
    
    if (!isMember) {
        console.log("   Registering deployer as member...");
        await memberRegistry.register({
            displayName: "DAO Admin",
            bio: "Initial DAO administrator and deployer",
            avatarURI: "",
            socialLinks: []  // Must be an array of strings
        });
        console.log(`   ✅ Registered: ${deployer.address}`);
    } else {
        console.log(`   ℹ️ Already registered: ${deployer.address}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Setup Token Delegation
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n🗳️ Step 4: Setting Up Token Delegation...\n");
    
    const daoToken = await ethers.getContractAt(
        "DAOToken",
        contracts.daoToken
    );
    
    // Delegate to self to activate voting power
    const currentDelegate = await daoToken.delegates(deployer.address);
    if (currentDelegate === ethers.ZeroAddress) {
        console.log("   Delegating to self...");
        await daoToken.delegate(deployer.address);
        console.log("   ✅ Self-delegated");
    } else {
        console.log(`   ℹ️ Already delegated to: ${currentDelegate}`);
    }
    
    const votingPower = await daoToken.getVotes(deployer.address);
    console.log(`   📊 Current voting power: ${ethers.formatEther(votingPower)} votes`);
    
    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: Distribute Test Tokens (if configured)
    // ═══════════════════════════════════════════════════════════════════
    if (CONFIG.TEST_DISTRIBUTION.length > 0) {
        console.log("\n💸 Step 5: Distributing Test Tokens...\n");
        
        for (const dist of CONFIG.TEST_DISTRIBUTION) {
            const amount = ethers.parseEther(dist.amount);
            await daoToken.transfer(dist.address, amount);
            console.log(`   ✅ Sent ${dist.amount} MDAO to ${dist.address}`);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(60));
    console.log("          SETUP COMPLETE ✅");
    console.log("═".repeat(60));
    
    console.log("\n📋 Current Configuration:");
    console.log("─".repeat(40));
    console.log(`   Voting Delay:      ${CONFIG.VOTING_DELAY} blocks`);
    console.log(`   Voting Period:     ${CONFIG.VOTING_PERIOD} blocks`);
    console.log(`   Quorum:            ${CONFIG.QUORUM_BPS / 100}%`);
    console.log(`   Passing Threshold: ${CONFIG.PASSING_THRESHOLD_BPS / 100}%`);
    console.log(`   Daily Limit:       ${CONFIG.DAILY_LIMIT_BPS / 100}%`);
    console.log(`   Max Transfer:      ${CONFIG.MAX_SINGLE_TRANSFER_BPS / 100}%`);
    console.log("─".repeat(40));
    
    console.log("\n🎉 Next step:");
    console.log(`   npx hardhat run scripts/register-ai-agent.js --network ${network.name}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Setup failed:");
        console.error(error);
        process.exit(1);
    });
