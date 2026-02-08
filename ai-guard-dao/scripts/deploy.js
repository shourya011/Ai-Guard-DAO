/**
 * AI Guard Dog - Deployment Script
 * 
 * This script deploys all contracts in the correct order:
 * 1. AuditLogger (needs VotingAgent address later)
 * 2. VotingAgent (needs AuditLogger address)
 * 3. Link them together
 * 4. DAOGovernor (for demo)
 * 5. MockToken (optional, for demo)
 * 
 * DEPLOYMENT ORDER MATTERS because of circular dependencies:
 * - VotingAgent needs AuditLogger address in constructor
 * - AuditLogger needs VotingAgent address set after deployment
 */

const hre = require("hardhat");

async function main() {
    console.log("🐕 AI Guard Dog - Contract Deployment\n");
    console.log("=".repeat(50));
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📍 Deployer:", deployer.address);
    console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // ============ STEP 1: Deploy AuditLogger ============
    console.log("1️⃣  Deploying AuditLogger...");
    const AuditLogger = await hre.ethers.getContractFactory("AuditLogger");
    const auditLogger = await AuditLogger.deploy();
    await auditLogger.waitForDeployment();
    const auditLoggerAddress = await auditLogger.getAddress();
    console.log("   ✅ AuditLogger deployed to:", auditLoggerAddress);

    // ============ STEP 2: Deploy VotingAgent ============
    console.log("\n2️⃣  Deploying VotingAgent...");
    
    // The backend address that will call castVoteWithRisk
    // For demo, we use the deployer. In production, use dedicated backend wallet.
    const initialBackend = deployer.address;
    
    const VotingAgent = await hre.ethers.getContractFactory("VotingAgent");
    const votingAgent = await VotingAgent.deploy(auditLoggerAddress, initialBackend);
    await votingAgent.waitForDeployment();
    const votingAgentAddress = await votingAgent.getAddress();
    console.log("   ✅ VotingAgent deployed to:", votingAgentAddress);
    console.log("   📝 Initial backend set to:", initialBackend);

    // ============ STEP 3: Link AuditLogger to VotingAgent ============
    console.log("\n3️⃣  Linking AuditLogger to VotingAgent...");
    const linkTx = await auditLogger.setVotingAgent(votingAgentAddress);
    await linkTx.wait();
    console.log("   ✅ AuditLogger now accepts logs from VotingAgent");

    // ============ STEP 4: Deploy MockToken (for demo) ============
    console.log("\n4️⃣  Deploying MockToken (for demo)...");
    const MockToken = await hre.ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy(
        "Guard Dog DAO Token",  // name
        "GUARD",                 // symbol
        hre.ethers.parseEther("1000000") // 1 million initial supply
    );
    await mockToken.waitForDeployment();
    const mockTokenAddress = await mockToken.getAddress();
    console.log("   ✅ MockToken deployed to:", mockTokenAddress);

    // ============ STEP 5: Deploy DAOGovernor ============
    console.log("\n5️⃣  Deploying DAOGovernor...");
    const DAOGovernor = await hre.ethers.getContractFactory("DAOGovernor");
    const daoGovernor = await DAOGovernor.deploy(
        "Guard Dog Demo DAO",    // name
        mockTokenAddress,         // token address
        1,                        // votingDelay: 1 block (fast for demo)
        50,                       // votingPeriod: 50 blocks (~10 min)
        0,                        // proposalThreshold: 0 (anyone can propose)
        1                         // quorum: 1 vote needed
    );
    await daoGovernor.waitForDeployment();
    const daoGovernorAddress = await daoGovernor.getAddress();
    console.log("   ✅ DAOGovernor deployed to:", daoGovernorAddress);

    // ============ DEPLOYMENT SUMMARY ============
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE!\n");
    console.log("📋 Contract Addresses:");
    console.log("   • AuditLogger:  ", auditLoggerAddress);
    console.log("   • VotingAgent:  ", votingAgentAddress);
    console.log("   • MockToken:    ", mockTokenAddress);
    console.log("   • DAOGovernor:  ", daoGovernorAddress);
    
    console.log("\n📝 Next Steps:");
    console.log("   1. Run 'npx hardhat run scripts/setup-demo.js' to create test proposals");
    console.log("   2. Update CONTRACT_INTEGRATION.md with these addresses");
    console.log("   3. Share ABIs with frontend/backend teams");
    
    console.log("\n💾 Saving deployment info...");
    
    // Save deployment info to file
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            AuditLogger: auditLoggerAddress,
            VotingAgent: votingAgentAddress,
            MockToken: mockTokenAddress,
            DAOGovernor: daoGovernorAddress
        },
        configuration: {
            initialBackend: initialBackend,
            votingDelay: 1,
            votingPeriod: 50,
            proposalThreshold: 0,
            quorum: 1
        }
    };
    
    const fs = require("fs");
    const path = require("path");
    
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save deployment info
    const filename = `deployment-${hre.network.name}-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(deploymentsDir, filename),
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("   ✅ Saved to deployments/" + filename);
    
    // Also save latest deployment
    fs.writeFileSync(
        path.join(deploymentsDir, `latest-${hre.network.name}.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("   ✅ Saved to deployments/latest-" + hre.network.name + ".json");
    
    console.log("\n🐕 Woof! Deployment complete. Your DAO is protected!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
