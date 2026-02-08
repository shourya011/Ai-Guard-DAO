const { ethers, network, run } = require("hardhat");
const fs = require("fs");

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *                    VERIFY CONTRACTS ON BLOCK EXPLORER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This script verifies all deployed contracts on the block explorer.
 * 
 * WHY VERIFY?
 * - Shows source code is legitimate
 * - Allows users to interact via explorer
 * - Builds trust in the contracts
 * - Required for production deployments
 * 
 * PREREQUISITE:
 * - Contracts deployed (deployment.json exists)
 * - ETHERSCAN_API_KEY in .env (or Monad explorer key)
 * 
 * USAGE:
 *   npx hardhat run scripts/verify-contracts.js --network monadTestnet
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============ CONFIGURATION ============

// Re-create constructor arguments for verification
const CONFIG = {
    TOKEN_NAME: "Monad DAO Token",
    TOKEN_SYMBOL: "MDAO",
    TIMELOCK_DELAY: 2 * 24 * 60 * 60,
    MIN_STAKE: 0,
    DAO_NAME: "Monad DAO",
    DAO_DESCRIPTION: "A decentralized autonomous organization on Monad blockchain"
};

// ============ HELPERS ============

function loadDeployment() {
    const filePath = `deployment-${network.name}.json`;
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    if (fs.existsSync("deployment.json")) {
        return JSON.parse(fs.readFileSync("deployment.json", "utf8"));
    }
    throw new Error("No deployment.json found!");
}

async function verifyContract(name, address, constructorArgs) {
    console.log(`\n📝 Verifying ${name}...`);
    console.log(`   Address: ${address}`);
    
    try {
        await run("verify:verify", {
            address: address,
            constructorArguments: constructorArgs,
        });
        console.log(`   ✅ ${name} verified!`);
        return true;
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log(`   ℹ️  ${name} already verified`);
            return true;
        }
        console.log(`   ❌ Failed: ${error.message}`);
        return false;
    }
}

// ============ MAIN FUNCTION ============

async function main() {
    console.log("\n" + "═".repeat(60));
    console.log("         VERIFY CONTRACTS ON BLOCK EXPLORER");
    console.log("═".repeat(60) + "\n");
    
    if (network.name === "hardhat" || network.name === "localhost") {
        console.log("⚠️  Verification not needed for local networks!");
        console.log("   Run this on testnet or mainnet.");
        return;
    }
    
    const deployment = loadDeployment();
    const contracts = deployment.contracts;
    const deployer = deployment.deployer;
    
    console.log(`📡 Network: ${network.name}`);
    console.log(`📄 Deployment: ${deployment.timestamp}\n`);
    
    const results = {
        verified: [],
        failed: []
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // VERIFY EACH CONTRACT
    // ═══════════════════════════════════════════════════════════════════
    
    // 1. DAOToken
    const tokenResult = await verifyContract(
        "DAOToken",
        contracts.daoToken,
        [CONFIG.TOKEN_NAME, CONFIG.TOKEN_SYMBOL, deployer]
    );
    results[tokenResult ? "verified" : "failed"].push("DAOToken");
    
    // 2. Treasury
    const treasuryResult = await verifyContract(
        "Treasury",
        contracts.treasury,
        [contracts.daoToken]
    );
    results[treasuryResult ? "verified" : "failed"].push("Treasury");
    
    // 3. Timelock
    const timelockResult = await verifyContract(
        "Timelock",
        contracts.timelock,
        [deployer, CONFIG.TIMELOCK_DELAY]
    );
    results[timelockResult ? "verified" : "failed"].push("Timelock");
    
    // 4. MemberRegistry
    const memberResult = await verifyContract(
        "MemberRegistry",
        contracts.memberRegistry,
        [CONFIG.MIN_STAKE]
    );
    results[memberResult ? "verified" : "failed"].push("MemberRegistry");
    
    // 5. ProposalManager
    const proposalResult = await verifyContract(
        "ProposalManager",
        contracts.proposalManager,
        []
    );
    results[proposalResult ? "verified" : "failed"].push("ProposalManager");
    
    // 6. VotingEngine
    const votingResult = await verifyContract(
        "VotingEngine",
        contracts.votingEngine,
        []
    );
    results[votingResult ? "verified" : "failed"].push("VotingEngine");
    
    // 7. DAOCore
    const coreResult = await verifyContract(
        "DAOCore",
        contracts.daoCore,
        [CONFIG.DAO_NAME, CONFIG.DAO_DESCRIPTION]
    );
    results[coreResult ? "verified" : "failed"].push("DAOCore");
    
    // 8. AIAgentRegistry
    const agentResult = await verifyContract(
        "AIAgentRegistry",
        contracts.aiAgentRegistry,
        []
    );
    results[agentResult ? "verified" : "failed"].push("AIAgentRegistry");
    
    // ═══════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(60));
    console.log("         VERIFICATION SUMMARY");
    console.log("═".repeat(60));
    
    console.log(`\n✅ Verified (${results.verified.length}):`);
    for (const name of results.verified) {
        console.log(`   - ${name}`);
    }
    
    if (results.failed.length > 0) {
        console.log(`\n❌ Failed (${results.failed.length}):`);
        for (const name of results.failed) {
            console.log(`   - ${name}`);
        }
    }
    
    console.log("\n📍 Explorer Links:");
    console.log(`   DAOCore: https://explorer.monad.xyz/address/${contracts.daoCore}`);
    console.log(`   DAOToken: https://explorer.monad.xyz/address/${contracts.daoToken}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
