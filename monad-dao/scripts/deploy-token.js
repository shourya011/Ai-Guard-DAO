const { ethers, network } = require("hardhat");

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *                    DEPLOY TOKEN ONLY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Deploys only the DAOToken contract for testing token functionality.
 * 
 * USE CASE:
 * - Test token minting, transfers, delegation
 * - Test voting power mechanics
 * - Verify checkpoints work correctly
 * 
 * USAGE:
 *   npx hardhat run scripts/deploy-token.js --network localhost
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const CONFIG = {
    TOKEN_NAME: "Monad DAO Token",
    TOKEN_SYMBOL: "MDAO",
    INITIAL_MINT: ethers.parseEther("1000000") // 1 million tokens
};

async function main() {
    console.log("\n" + "═".repeat(50));
    console.log("         DEPLOYING DAO TOKEN ONLY");
    console.log("═".repeat(50) + "\n");
    
    const [deployer] = await ethers.getSigners();
    console.log(`Network: ${network.name}`);
    console.log(`Deployer: ${deployer.address}`);
    
    // Deploy DAOToken
    console.log("\n📦 Deploying DAOToken...");
    const DAOToken = await ethers.getContractFactory("DAOToken");
    const daoToken = await DAOToken.deploy(
        CONFIG.TOKEN_NAME,
        CONFIG.TOKEN_SYMBOL,
        deployer.address
    );
    await daoToken.waitForDeployment();
    const tokenAddress = await daoToken.getAddress();
    
    console.log(`✅ DAOToken deployed at: ${tokenAddress}`);
    
    // Get token info
    const name = await daoToken.name();
    const symbol = await daoToken.symbol();
    const totalSupply = await daoToken.totalSupply();
    const deployerBalance = await daoToken.balanceOf(deployer.address);
    
    console.log("\n📊 Token Info:");
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);
    console.log(`   Deployer Balance: ${ethers.formatEther(deployerBalance)} ${symbol}`);
    
    // Self-delegate to activate voting power
    console.log("\n🗳️ Delegating to self to activate voting power...");
    await daoToken.delegate(deployer.address);
    const votingPower = await daoToken.getVotes(deployer.address);
    console.log(`   Voting Power: ${ethers.formatEther(votingPower)} votes`);
    
    console.log("\n" + "═".repeat(50));
    console.log("         DEPLOYMENT COMPLETE ✅");
    console.log("═".repeat(50));
    
    return { daoToken: tokenAddress };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
