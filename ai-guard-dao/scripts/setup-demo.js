/**
 * AI Guard Dog - Demo Setup Script
 * 
 * This script sets up a demo environment with:
 * 1. Test accounts with voting power
 * 2. Three proposals:
 *    - Safe proposal (risk ~15)
 *    - Medium risk proposal (risk ~55)
 *    - Scam proposal (risk ~95)
 * 
 * Run after deployment to prepare for the hackathon demo.
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🐕 AI Guard Dog - Demo Setup\n");
    console.log("=".repeat(50));
    
    // Load deployment info
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const deploymentFile = path.join(deploymentsDir, `latest-${hre.network.name}.json`);
    
    if (!fs.existsSync(deploymentFile)) {
        console.log("❌ No deployment found. Run 'npm run deploy:local' first.");
        process.exit(1);
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    console.log("📂 Loaded deployment from:", deploymentFile);
    
    // Get signers
    const [deployer, user1, user2, user3] = await hre.ethers.getSigners();
    console.log("\n👥 Test Accounts:");
    console.log("   • Deployer:", deployer.address);
    console.log("   • User 1:  ", user1.address);
    console.log("   • User 2:  ", user2.address);
    console.log("   • User 3:  ", user3.address);
    
    // Get contract instances
    const auditLogger = await hre.ethers.getContractAt("AuditLogger", deployment.contracts.AuditLogger);
    const votingAgent = await hre.ethers.getContractAt("VotingAgent", deployment.contracts.VotingAgent);
    const mockToken = await hre.ethers.getContractAt("MockToken", deployment.contracts.MockToken);
    const daoGovernor = await hre.ethers.getContractAt("DAOGovernor", deployment.contracts.DAOGovernor);
    
    // ============ STEP 1: Distribute Tokens ============
    console.log("\n1️⃣  Distributing tokens...");
    
    const tokenAmount = hre.ethers.parseEther("1000");
    
    // Mint tokens to test users
    await mockToken.mint(user1.address, tokenAmount);
    await mockToken.mint(user2.address, tokenAmount);
    await mockToken.mint(user3.address, tokenAmount);
    
    console.log("   ✅ Minted 1000 GUARD to each test user");
    
    // Grant voting power in governor (for simplified demo)
    await daoGovernor.batchGrantVotingPower(
        [user1.address, user2.address, user3.address],
        [100, 100, 100]
    );
    console.log("   ✅ Granted voting power in DAOGovernor");
    
    // ============ STEP 2: Set Up Delegations ============
    console.log("\n2️⃣  Setting up delegations to VotingAgent...");
    
    // User 1: Conservative (threshold 30)
    await votingAgent.connect(user1).delegateVotingPower(
        deployment.contracts.DAOGovernor,
        30,    // Only auto-vote if risk < 30
        false  // Don't require approval for each vote
    );
    console.log("   ✅ User 1 delegated with threshold 30 (conservative)");
    
    // User 2: Balanced (threshold 50)
    await votingAgent.connect(user2).delegateVotingPower(
        deployment.contracts.DAOGovernor,
        50,    // Auto-vote if risk < 50
        false
    );
    console.log("   ✅ User 2 delegated with threshold 50 (balanced)");
    
    // User 3: Trusting (threshold 80)
    await votingAgent.connect(user3).delegateVotingPower(
        deployment.contracts.DAOGovernor,
        80,    // Auto-vote if risk < 80
        false
    );
    console.log("   ✅ User 3 delegated with threshold 80 (trusting)");
    
    // ============ STEP 3: Create Test Proposals ============
    console.log("\n3️⃣  Creating test proposals...");
    
    // Proposal 1: SAFE - Small community grant
    // Expected AI risk score: ~15
    const safeProposal = await daoGovernor.connect(deployer).propose(
        [user1.address],  // target: send to known community member
        [hre.ethers.parseEther("0.1")],  // small amount: 0.1 ETH
        ["0x"],  // no function call, just transfer
        "Community Grant: Fund local meetup organizer for Q1 events. Recipient has 2 years of verified DAO contributions."
    );
    await safeProposal.wait();
    console.log("   ✅ Proposal 1 created: Safe community grant (expected risk: ~15)");
    
    // Proposal 2: MEDIUM RISK - Large marketing budget
    // Expected AI risk score: ~55
    const mediumProposal = await daoGovernor.connect(deployer).propose(
        [user2.address],  // target: marketing wallet
        [hre.ethers.parseEther("10")],  // medium amount: 10 ETH
        ["0x"],
        "Marketing Budget: Allocate 10 ETH for influencer campaign. New marketing lead, joined 3 months ago. Detailed plan in forum post #4521."
    );
    await mediumProposal.wait();
    console.log("   ✅ Proposal 2 created: Medium risk marketing (expected risk: ~55)");
    
    // Proposal 3: SCAM - Suspicious treasury drain
    // Expected AI risk score: ~95
    const scamProposal = await daoGovernor.connect(user3).propose(
        ["0x000000000000000000000000000000000000dEaD"],  // suspicious: burn address
        [hre.ethers.parseEther("100")],  // large amount: 100 ETH
        ["0x"],
        "URGENT: Emergency fund transfer needed immediately! Treasury migration to new secure wallet. Must pass within 24 hours or funds at risk!"
    );
    await scamProposal.wait();
    console.log("   ✅ Proposal 3 created: Scam proposal (expected risk: ~95)");
    
    // Fund the governor contract for proposal execution
    await deployer.sendTransaction({
        to: deployment.contracts.DAOGovernor,
        value: hre.ethers.parseEther("200")
    });
    console.log("   ✅ Funded DAOGovernor with 200 ETH for proposals");
    
    // ============ DEMO SUMMARY ============
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEMO SETUP COMPLETE!\n");
    
    console.log("📊 Created Proposals:");
    console.log("   1. Safe Proposal (ID: 1)");
    console.log("      • Risk: ~15 (should auto-approve)");
    console.log("      • Amount: 0.1 ETH");
    console.log("      • All users should auto-vote YES\n");
    
    console.log("   2. Medium Risk Proposal (ID: 2)");
    console.log("      • Risk: ~55");
    console.log("      • Amount: 10 ETH");
    console.log("      • User 1 (threshold 30): FLAGGED");
    console.log("      • User 2 (threshold 50): FLAGGED");
    console.log("      • User 3 (threshold 80): Auto-vote\n");
    
    console.log("   3. Scam Proposal (ID: 3)");
    console.log("      • Risk: ~95 (should flag as HIGH RISK)");
    console.log("      • Amount: 100 ETH");
    console.log("      • All users should be ALERTED\n");
    
    console.log("👥 Test Users:");
    console.log("   • User 1:", user1.address, "(threshold: 30)");
    console.log("   • User 2:", user2.address, "(threshold: 50)");
    console.log("   • User 3:", user3.address, "(threshold: 80)");
    
    console.log("\n📝 Demo Flow:");
    console.log("   1. AI backend detects ProposalCreated events");
    console.log("   2. AI analyzes each proposal → generates risk scores");
    console.log("   3. AI calls VotingAgent.castVoteWithRisk()");
    console.log("   4. Watch events: VoteCastByAI vs HighRiskProposalDetected");
    console.log("   5. Check audit trail: auditLogger.getProposalAudit(proposalId)");
    
    console.log("\n🐕 Ready for demo! Woof!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Setup failed:", error);
        process.exit(1);
    });
