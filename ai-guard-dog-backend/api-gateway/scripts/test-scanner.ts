/**
 * AI Guard DAO - Blockchain Scanner Test Script
 * 
 * This script simulates ProposalCreated events for testing the BlockchainService
 * without requiring a live testnet connection.
 * 
 * Usage:
 *   npx ts-node scripts/test-scanner.ts [command]
 * 
 * Commands:
 *   simulate     - Simulate a ProposalCreated event using local Hardhat
 *   mock         - Test with mock provider (no blockchain needed)
 *   status       - Check scanner status from Redis
 */

import { ethers, Contract, Wallet, JsonRpcProvider } from 'ethers';
import Redis from 'ioredis';

// ABI for DAOGovernor (minimal for testing)
const DAOGovernorABI = [
  {
    type: 'function',
    name: 'propose',
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'description', type: 'string' },
    ],
    outputs: [{ name: 'proposalId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'ProposalCreated',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: false },
      { name: 'proposer', type: 'address', indexed: false },
      { name: 'targets', type: 'address[]', indexed: false },
      { name: 'values', type: 'uint256[]', indexed: false },
      { name: 'signatures', type: 'string[]', indexed: false },
      { name: 'calldatas', type: 'bytes[]', indexed: false },
      { name: 'startBlock', type: 'uint256', indexed: false },
      { name: 'endBlock', type: 'uint256', indexed: false },
      { name: 'description', type: 'string', indexed: false },
    ],
  },
];

// ============================================
// CONFIGURATION
// ============================================

const config = {
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  daoGovernorAddress: process.env.DAO_GOVERNOR_ADDRESS || '',
  privateKey: process.env.TEST_PRIVATE_KEY || '',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
};

// ============================================
// TEST COMMANDS
// ============================================

/**
 * Command: simulate
 * Creates a real proposal on local Hardhat network
 */
async function simulateProposal(): Promise<void> {
  console.log('🧪 Simulating ProposalCreated event...\n');

  if (!config.daoGovernorAddress) {
    console.error('❌ DAO_GOVERNOR_ADDRESS not set');
    console.log('   Run: export DAO_GOVERNOR_ADDRESS=0x...');
    process.exit(1);
  }

  if (!config.privateKey) {
    console.error('❌ TEST_PRIVATE_KEY not set');
    console.log('   Run: export TEST_PRIVATE_KEY=0x...');
    process.exit(1);
  }

  const provider = new JsonRpcProvider(config.rpcUrl);
  const wallet = new Wallet(config.privateKey, provider);
  const contract = new Contract(config.daoGovernorAddress, DAOGovernorABI, wallet);

  console.log(`📜 Contract: ${config.daoGovernorAddress}`);
  console.log(`👤 Proposer: ${wallet.address}`);
  console.log(`🌐 RPC: ${config.rpcUrl}\n`);

  // Create a test proposal
  const targets = [wallet.address]; // Target is proposer (no-op)
  const values = [0n];
  const calldatas = ['0x'];
  const description = `# Test Proposal ${Date.now()}

## Summary
This is a test proposal to verify the BlockchainService scanner is working correctly.

## Details
- Created at: ${new Date().toISOString()}
- Purpose: Testing scanner functionality
- Expected: Scanner should detect this event and persist to database

## Actions
1. No actual on-chain actions (targets self with empty calldata)
`;

  try {
    console.log('📝 Creating proposal...');
    const tx = await contract.propose(targets, values, calldatas, description);
    console.log(`   Transaction: ${tx.hash}`);

    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    console.log(`   Block: ${receipt?.blockNumber}`);
    console.log(`   Gas used: ${receipt?.gasUsed.toString()}`);

    // Get proposal ID from events
    const event = receipt?.logs.find(
      (log: any) => log.topics[0] === ethers.id('ProposalCreated(uint256,address,address[],uint256[],string[],bytes[],uint256,uint256,string)')
    );

    if (event) {
      const decoded = contract.interface.parseLog({
        topics: event.topics as string[],
        data: event.data,
      });
      console.log(`\n✅ Proposal created successfully!`);
      console.log(`   Proposal ID: ${decoded?.args[0].toString()}`);
    }

    console.log('\n📡 The BlockchainService should now detect this event.');
    console.log('   Check the API Gateway logs for confirmation.');

  } catch (error: any) {
    console.error('❌ Failed to create proposal:', error.message);
    process.exit(1);
  }
}

/**
 * Command: mock
 * Test scanner logic with mock data (no blockchain needed)
 */
async function mockTest(): Promise<void> {
  console.log('🧪 Testing with mock data (no blockchain connection)...\n');

  const redis = new Redis({
    host: config.redisHost,
    port: config.redisPort,
  });

  try {
    // Check Redis connection
    const pong = await redis.ping();
    console.log(`✅ Redis connected: ${pong}`);

    // Simulate what BlockchainService would store
    const mockProposal = {
      proposalId: BigInt(Date.now()).toString(),
      proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD5E',
      targets: ['0x742d35Cc6634C0532925a3b844Bc9e7595f2bD5E'],
      values: ['0'],
      signatures: [''],
      calldatas: ['0x'],
      startBlock: '12345',
      endBlock: '12445',
      description: '# Mock Test Proposal\n\nThis is a mock proposal for testing.',
      blockNumber: 12340,
    };

    console.log('\n📝 Mock Proposal Data:');
    console.log(JSON.stringify(mockProposal, null, 2));

    // Set a test block in Redis
    const testBlock = 12340;
    await redis.set('scanner:last_block', testBlock.toString());
    console.log(`\n✅ Set scanner:last_block = ${testBlock}`);

    // Check current state
    const lastBlock = await redis.get('scanner:last_block');
    const status = await redis.get('scanner:status');
    
    console.log('\n📊 Scanner State:');
    console.log(`   Last Block: ${lastBlock || 'not set'}`);
    console.log(`   Status: ${status || 'not set'}`);

    console.log('\n✅ Mock test complete!');
    console.log('   The mock data shows what BlockchainService would process.');

  } finally {
    await redis.quit();
  }
}

/**
 * Command: status
 * Check scanner status from Redis
 */
async function checkStatus(): Promise<void> {
  console.log('📊 Checking scanner status...\n');

  const redis = new Redis({
    host: config.redisHost,
    port: config.redisPort,
  });

  try {
    const lastBlock = await redis.get('scanner:last_block');
    const status = await redis.get('scanner:status');

    console.log('Scanner Status:');
    console.log('─'.repeat(40));
    console.log(`  Status:      ${status || '(not set)'}`);
    console.log(`  Last Block:  ${lastBlock || '(not set)'}`);
    console.log('─'.repeat(40));

    // Get all scanner keys
    const keys = await redis.keys('scanner:*');
    if (keys.length > 0) {
      console.log('\nAll Scanner Keys:');
      for (const key of keys) {
        const value = await redis.get(key);
        console.log(`  ${key}: ${value}`);
      }
    }

  } finally {
    await redis.quit();
  }
}

/**
 * Command: reset
 * Reset scanner state in Redis
 */
async function resetScanner(): Promise<void> {
  console.log('🔄 Resetting scanner state...\n');

  const redis = new Redis({
    host: config.redisHost,
    port: config.redisPort,
  });

  try {
    const keys = await redis.keys('scanner:*');
    
    if (keys.length === 0) {
      console.log('No scanner keys found.');
      return;
    }

    console.log(`Deleting ${keys.length} keys:`);
    for (const key of keys) {
      await redis.del(key);
      console.log(`  Deleted: ${key}`);
    }

    console.log('\n✅ Scanner state reset!');

  } finally {
    await redis.quit();
  }
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  const command = process.argv[2] || 'status';

  console.log('═'.repeat(50));
  console.log('  AI Guard DAO - Scanner Test Utility');
  console.log('═'.repeat(50));
  console.log();

  switch (command) {
    case 'simulate':
      await simulateProposal();
      break;
    case 'mock':
      await mockTest();
      break;
    case 'status':
      await checkStatus();
      break;
    case 'reset':
      await resetScanner();
      break;
    default:
      console.log('Available commands:');
      console.log('  simulate  - Create real proposal on local blockchain');
      console.log('  mock      - Test with mock data (no blockchain)');
      console.log('  status    - Check scanner status from Redis');
      console.log('  reset     - Reset scanner state in Redis');
      console.log();
      console.log('Usage: npx ts-node scripts/test-scanner.ts [command]');
  }
}

main().catch(console.error);
