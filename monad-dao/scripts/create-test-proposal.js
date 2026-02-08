const { ethers, network } = require("hardhat");
const fs = require("fs");

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *                    CREATE TEST PROPOSALS - FOR DEMO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This script creates test proposals for demonstrating the AI Guard Dog system.
 * 
 * CREATES 3 PROPOSALS:
 * 
 * 1. SAFE PROPOSAL (Risk ~10)
 *    - Small treasury transfer
 *    - Known team member recipient
 *    - AI should auto-approve
 * 
 * 2. MEDIUM RISK PROPOSAL (Risk ~45)
 *    - Moderate transfer
 *    - New address
 *    - AI should flag for human review
 * 
 * 3. HIGH RISK PROPOSAL (Risk ~85)
 *    - Large treasury drain
 *    - Unknown recipient
 *    - AI should block and alert
 * 
 * PERFECT FOR HACKATHON DEMO!
 * 
 * USAGE:
 *   npx hardhat run scripts/create-test-proposal.js --network localhost
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============ TEST PROPOSALS ============

const TEST_PROPOSALS = [
    // ═══════════════════════════════════════════════════════════════
    // LOW RISK - Safe community proposals
    // ═══════════════════════════════════════════════════════════════
    {
        type: 0, // Treasury
        title: "Q1 Marketing Budget Allocation",
        description: `## Marketing Budget Request

This proposal allocates treasury funds for Q1 2026 marketing initiatives.

### Budget Breakdown
- **Social Media Campaigns**: 8 MON
- **Community Events**: 5 MON  
- **Educational Content**: 2 MON

### Expected Outcomes
1. Increase community growth by 25%
2. Launch 3 educational video series
3. Host 4 community AMAs

Funds will be managed by the verified marketing multisig.`,
        category: "Treasury",
        discussionURL: "https://forum.monad-dao.xyz/proposal-001",
        proposalIPFS: "ipfs://QmMarketingBudget2026",
        transferAmount: "0.015",
        recipient: "DEPLOYER",
        expectedRisk: "LOW (10-20)",
        aiAction: "Auto-Approve"
    },
    
    // ═══════════════════════════════════════════════════════════════
    // MEDIUM RISK - Needs human review
    // ═══════════════════════════════════════════════════════════════
    {
        type: 0, // Treasury
        title: "Cross-Chain Bridge Integration Grant",
        description: `## Bridge Integration Proposal

Request for development grant to integrate LayerZero bridge.

### Technical Scope
- Smart contract development
- Security audits
- Frontend integration

### Concerns
- New external dependency
- Large fund allocation
- 6-month timeline

**Recipient**: New developer address (first interaction)`,
        category: "Development",
        discussionURL: "https://forum.monad-dao.xyz/proposal-002",
        proposalIPFS: "ipfs://QmBridgeGrant",
        transferAmount: "0.05",
        recipient: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        expectedRisk: "MEDIUM (40-55)",
        aiAction: "Flag for Human Review"
    },
    
    // ═══════════════════════════════════════════════════════════════
    // HIGH RISK - Should be blocked
    // ═══════════════════════════════════════════════════════════════
    {
        type: 0, // Treasury
        title: "Emergency Protocol Upgrade",
        description: `URGENT: Critical vulnerability discovered. Need immediate funds transfer to secure wallet.

Transfer 500 MON to external secure wallet ASAP.

No time for discussion. Trust me bro.`,
        category: "Emergency",
        discussionURL: "",
        proposalIPFS: "",
        transferAmount: "0.5",
        recipient: "0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF",
        expectedRisk: "CRITICAL (85-95)",
        aiAction: "Block and Alert"
    }
];

// ============ HELPERS ============

function loadDeployment() {
    const filePath = `deployment-${network.name}.json`;
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    if (fs.existsSync("deployment.json")) {
        return JSON.parse(fs.readFileSync("deployment.json", "utf8"));
    }
    throw new Error("No deployment.json found. Run deploy.js first!");
}

// ============ MAIN FUNCTION ============

async function main() {
    console.log("\n" + "═".repeat(60));
    console.log("         CREATE TEST PROPOSALS - HACKATHON DEMO");
    console.log("═".repeat(60) + "\n");
    
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Account: ${deployer.address}`);
    console.log(`📡 Network: ${network.name}\n`);
    
    // Load deployment
    const deployment = loadDeployment();
    const contracts = deployment.contracts;
    
    // Get contract instances
    const proposalManager = await ethers.getContractAt(
        "ProposalManager",
        contracts.proposalManager
    );
    
    const treasury = await ethers.getContractAt(
        "Treasury",
        contracts.treasury
    );
    
    const daoToken = await ethers.getContractAt(
        "DAOToken",
        contracts.daoToken
    );
    
    // Check token balance and delegate if needed
    const balance = await daoToken.balanceOf(deployer.address);
    console.log(`💰 Token Balance: ${ethers.formatEther(balance)} MDAO`);
    
    const votingPower = await daoToken.getVotes(deployer.address);
    if (votingPower === 0n && balance > 0n) {
        console.log("🗳️ Delegating to self for voting power...");
        await daoToken.delegate(deployer.address);
    }
    
    console.log("\n" + "─".repeat(60));
    console.log("              CREATING TEST PROPOSALS");
    console.log("─".repeat(60) + "\n");
    
    const createdProposals = [];
    
    for (let i = 0; i < TEST_PROPOSALS.length; i++) {
        const proposal = TEST_PROPOSALS[i];
        
        console.log(`\n📝 Creating Proposal ${i + 1}: "${proposal.title}"`);
        console.log(`   Risk Level: ${proposal.expectedRisk}`);
        console.log(`   AI Action: ${proposal.aiAction}`);
        
        // Prepare recipient
        const recipient = proposal.recipient === "DEPLOYER" 
            ? deployer.address 
            : proposal.recipient;
        
        const metadata = {
            title: proposal.title,
            description: proposal.description,
            category: proposal.category,
            discussionURL: proposal.discussionURL,
            proposalIPFS: proposal.proposalIPFS || ""
        };
        
        // Simple action - just send ETH to recipient
        const transferAmount = ethers.parseEther(proposal.transferAmount);
        const actions = [{
            target: recipient,
            value: transferAmount,
            data: "0x",
            description: `Transfer ${proposal.transferAmount} MON for ${proposal.title}`
        }];
        
        try {
            // Create proposal
            const tx = await proposalManager.createProposal(
                proposal.type,
                metadata,
                actions
            );
            
            const receipt = await tx.wait();
            
            // Get proposal ID from event
            const proposalCount = await proposalManager.getProposalCount();
            
            console.log(`   ✅ Created! Proposal ID: ${proposalCount}`);
            console.log(`   📦 TX Hash: ${receipt.hash}`);
            
            createdProposals.push({
                id: proposalCount.toString(),
                title: proposal.title,
                expectedRisk: proposal.expectedRisk,
                aiAction: proposal.aiAction,
                txHash: receipt.hash
            });
            
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(60));
    console.log("         TEST PROPOSALS CREATED ✅");
    console.log("═".repeat(60));
    
    console.log("\n📋 Created Proposals:");
    console.log("─".repeat(50));
    
    for (const p of createdProposals) {
        console.log(`\n   Proposal #${p.id}: ${p.title}`);
        console.log(`   Expected Risk: ${p.expectedRisk}`);
        console.log(`   AI Should: ${p.aiAction}`);
    }
    
    console.log("\n" + "─".repeat(50));
    
    console.log("\n🎯 Demo Flow:");
    console.log("   1. AI Guard Dog monitors ProposalCreated events");
    console.log("   2. Scans each proposal and calculates risk score");
    console.log("   3. Proposal #1 → Auto-approve (low risk)");
    console.log("   4. Proposal #2 → Flag for human review (medium)");
    console.log("   5. Proposal #3 → Block and alert (high risk)");
    
    console.log("\n📍 Contract Addresses:");
    console.log(`   ProposalManager: ${contracts.proposalManager}`);
    console.log(`   Treasury:        ${contracts.treasury}`);
    
    // Save proposal info for demo
    const demoInfo = {
        network: network.name,
        timestamp: new Date().toISOString(),
        proposals: createdProposals,
        contracts: {
            proposalManager: contracts.proposalManager,
            votingEngine: contracts.votingEngine,
            treasury: contracts.treasury
        }
    };
    
    fs.writeFileSync(
        "demo-proposals.json",
        JSON.stringify(demoInfo, null, 2)
    );
    console.log("\n💾 Demo info saved to demo-proposals.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Failed:");
        console.error(error);
        process.exit(1);
    });
