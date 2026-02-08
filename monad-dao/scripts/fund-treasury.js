const { ethers, network } = require("hardhat");
const fs = require("fs");

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *                    FUND TREASURY - ADD MON FOR TESTING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This script funds the DAO Treasury with MON for testing proposals.
 * 
 * WHY NEEDED?
 * - Test proposals request treasury transfers
 * - Treasury needs funds to execute transfers
 * - Simulates real DAO with assets
 * 
 * USAGE:
 *   npx hardhat run scripts/fund-treasury.js --network localhost
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const FUNDING_AMOUNT = "100"; // MON to send to treasury

async function main() {
    console.log("\n" + "═".repeat(50));
    console.log("         FUND TREASURY");
    console.log("═".repeat(50) + "\n");
    
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Funder: ${deployer.address}`);
    
    // Load deployment
    let deployment;
    try {
        deployment = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
    } catch {
        deployment = JSON.parse(fs.readFileSync(`deployment-${network.name}.json`, "utf8"));
    }
    
    const treasuryAddress = deployment.contracts.treasury;
    console.log(`💰 Treasury: ${treasuryAddress}`);
    
    // Get current balance
    const currentBalance = await ethers.provider.getBalance(treasuryAddress);
    console.log(`   Current balance: ${ethers.formatEther(currentBalance)} MON`);
    
    // Send MON
    const amount = ethers.parseEther(FUNDING_AMOUNT);
    console.log(`\n📤 Sending ${FUNDING_AMOUNT} MON to Treasury...`);
    
    const tx = await deployer.sendTransaction({
        to: treasuryAddress,
        value: amount
    });
    await tx.wait();
    
    // Get new balance
    const newBalance = await ethers.provider.getBalance(treasuryAddress);
    console.log(`✅ Done! New balance: ${ethers.formatEther(newBalance)} MON`);
    
    console.log("\n" + "═".repeat(50));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
