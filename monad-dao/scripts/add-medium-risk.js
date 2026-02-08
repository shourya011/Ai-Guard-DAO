const { ethers, network } = require("hardhat");
const fs = require("fs");

/**
 * Add single medium-risk proposal
 */

async function main() {
    console.log("\n=== Adding Medium Risk Proposal ===\n");
    
    const [deployer] = await ethers.getSigners();
    console.log(`Account: ${deployer.address}`);
    
    // Load deployment
    const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
    
    const proposalManager = await ethers.getContractAt(
        "ProposalManager",
        deployment.contracts.proposalManager
    );
    
    const metadata = {
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
        proposalIPFS: "ipfs://QmBridgeGrant"
    };
    
    // Use a valid checksum address
    const recipient = "0x1234567890123456789012345678901234567890";
    const transferAmount = ethers.parseEther("0.05");
    
    const actions = [{
        target: recipient,
        value: transferAmount,
        data: "0x",
        description: "Transfer 0.05 MON for Bridge Grant"
    }];
    
    console.log("Creating proposal...");
    const tx = await proposalManager.createProposal(0, metadata, actions);
    const receipt = await tx.wait();
    
    const count = await proposalManager.getProposalCount();
    console.log(`✅ Created Proposal #${count}`);
    console.log(`TX: ${receipt.hash}`);
}

main().catch(console.error);
