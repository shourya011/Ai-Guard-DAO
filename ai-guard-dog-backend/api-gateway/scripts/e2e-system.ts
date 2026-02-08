/**
 * AI Guard DAO - End-to-End System Integration Test
 * 
 * Tests the complete flow from delegation to voting:
 * 1. User delegates voting power to AI
 * 2. Proposal is created
 * 3. Analysis is queued and processed
 * 4. Voting service casts votes based on analysis
 * 
 * Usage:
 *   npx ts-node scripts/e2e-system.ts
 * 
 * Prerequisites:
 *   - PostgreSQL running with DATABASE_URL configured
 *   - Redis running with REDIS_HOST/REDIS_PORT configured
 *   - Run in a separate terminal: npx ts-node scripts/mock-ai-worker.ts
 * 
 * Or run with auto-simulated worker:
 *   npx ts-node scripts/e2e-system.ts --simulate-worker
 */

import { NestFactory } from '@nestjs/core';
import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Import modules and services
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/services/prisma.service';
import { RedisService } from '../src/services/redis.service';
import { VotingService } from '../src/services/voting.service';
import { AnalysisProducerService } from '../src/modules/queue/analysis-producer.service';

// ============================================
// TEST CONFIGURATION
// ============================================

const TEST_CONFIG = {
  // Test user (delegator)
  user: {
    address: '0x1234567890123456789012345678901234567890',
    riskThreshold: 50, // Accept proposals with risk score <= 50
  },
  
  // Test DAO Governor
  daoGovernor: '0xDAOGovernor0000000000000000000000000001',
  chainId: 31337, // Hardhat local chain
  
  // Test proposal
  proposal: {
    onchainProposalId: '42',
    title: 'Test Proposal for E2E System Test',
    description: 'This is a test proposal to verify the complete flow from analysis to voting. It should be analyzed and voted on automatically.',
    proposerAddress: '0xProposer000000000000000000000000000001',
  },
  
  // Timeouts
  analysisTimeout: 30000, // 30 seconds for analysis
  pollInterval: 500, // Poll every 500ms
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================
// CLEANUP FUNCTION
// ============================================

async function cleanupTestData(prisma: PrismaService): Promise<void> {
  console.log('\n🧹 Cleaning up test data...');
  
  // Delete in order to avoid foreign key constraints
  await prisma.auditLog.deleteMany({
    where: {
      daoGovernor: TEST_CONFIG.daoGovernor,
    },
  });
  
  await prisma.agentResult.deleteMany({
    where: {
      analysis: {
        proposal: {
          daoGovernor: TEST_CONFIG.daoGovernor,
        },
      },
    },
  });
  
  await prisma.redFlag.deleteMany({
    where: {
      analysis: {
        proposal: {
          daoGovernor: TEST_CONFIG.daoGovernor,
        },
      },
    },
  });
  
  await prisma.analysis.deleteMany({
    where: {
      proposal: {
        daoGovernor: TEST_CONFIG.daoGovernor,
      },
    },
  });
  
  await prisma.proposal.deleteMany({
    where: {
      daoGovernor: TEST_CONFIG.daoGovernor,
    },
  });
  
  await prisma.delegation.deleteMany({
    where: {
      daoGovernor: TEST_CONFIG.daoGovernor.toLowerCase(),
    },
  });
  
  console.log('   ✅ Test data cleaned');
}

// ============================================
// MOCK WORKER SIMULATOR
// ============================================

async function simulateWorker(
  redis: Redis,
  proposalId: string,
): Promise<void> {
  console.log('\n🤖 Simulating AI Worker...');
  
  // Wait a bit to simulate processing
  await sleep(2000);
  
  // Calculate a mock risk score (low risk for our test)
  const compositeScore = 35;
  const riskLevel = 'MEDIUM';
  const recommendation = 'APPROVE';
  
  // Publish progress events
  const channel = `analysis:events:${proposalId}`;
  
  await redis.publish(channel, JSON.stringify({
    type: 'processing',
    jobId: proposalId,
    stage: 'started',
    timestamp: new Date().toISOString(),
  }));
  
  await sleep(500);
  
  await redis.publish(channel, JSON.stringify({
    type: 'progress',
    jobId: proposalId,
    stage: 'reputation',
    progress: 30,
    message: 'Analyzing proposer reputation...',
    timestamp: new Date().toISOString(),
  }));
  
  await sleep(500);
  
  await redis.publish(channel, JSON.stringify({
    type: 'progress',
    jobId: proposalId,
    stage: 'nlp',
    progress: 60,
    message: 'Analyzing proposal text...',
    timestamp: new Date().toISOString(),
  }));
  
  await sleep(500);
  
  // Publish completion event
  await redis.publish(channel, JSON.stringify({
    type: 'complete',
    jobId: proposalId,
    result: {
      compositeScore,
      riskLevel,
      recommendation,
    },
    processingTimeMs: 1500,
    timestamp: new Date().toISOString(),
  }));
  
  console.log(`   ✅ Published complete event: Score=${compositeScore}, Rec=${recommendation}`);
}

// ============================================
// MAIN TEST FUNCTION
// ============================================

async function runE2ETest(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   AI Guard DAO - End-to-End System Integration Test          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const simulateWorker_flag = process.argv.includes('--simulate-worker');
  
  if (simulateWorker_flag) {
    console.log('ℹ️  Running with simulated worker (--simulate-worker flag detected)\n');
  } else {
    console.log('ℹ️  Expecting mock-ai-worker to be running externally');
    console.log('   Run: npx ts-node scripts/mock-ai-worker.ts\n');
  }

  let app: INestApplicationContext | null = null;
  let redisClient: Redis | null = null;

  try {
    // ============================================
    // STEP 0: Bootstrap NestJS Application
    // ============================================
    console.log('📦 Step 0: Bootstrapping NestJS application...');
    
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'], // Reduce noise during tests
    });
    
    const prisma = app.get(PrismaService);
    const redisService = app.get(RedisService);
    const analysisProducer = app.get(AnalysisProducerService);
    const votingService = app.get(VotingService);
    const configService = app.get(ConfigService);
    
    redisClient = redisService.getClient().duplicate();
    
    console.log('   ✅ Application bootstrapped\n');

    // ============================================
    // STEP 1: Cleanup Previous Test Data
    // ============================================
    await cleanupTestData(prisma);

    // ============================================
    // STEP 2: Create Test Delegation
    // ============================================
    console.log('\n📝 Step 1: Creating test delegation...');
    console.log(`   User: ${TEST_CONFIG.user.address}`);
    console.log(`   DAO: ${TEST_CONFIG.daoGovernor}`);
    console.log(`   Risk Threshold: ${TEST_CONFIG.user.riskThreshold}`);
    
    const delegation = await prisma.delegation.create({
      data: {
        delegatorAddress: TEST_CONFIG.user.address.toLowerCase(),
        daoGovernor: TEST_CONFIG.daoGovernor.toLowerCase(),
        chainId: TEST_CONFIG.chainId,
        riskThreshold: TEST_CONFIG.user.riskThreshold,
        status: 'ACTIVE',
        txHash: '0xDelegationTx' + Date.now().toString(16),
        blockNumber: BigInt(12345),
      },
    });
    
    console.log(`   ✅ Delegation created: ${delegation.id}\n`);

    // ============================================
    // STEP 3: Create Test Proposal
    // ============================================
    console.log('📝 Step 2: Creating test proposal...');
    console.log(`   ID: ${TEST_CONFIG.proposal.onchainProposalId}`);
    console.log(`   Title: ${TEST_CONFIG.proposal.title}`);
    
    const proposal = await prisma.proposal.create({
      data: {
        onchainProposalId: TEST_CONFIG.proposal.onchainProposalId,
        daoGovernor: TEST_CONFIG.daoGovernor,
        chainId: TEST_CONFIG.chainId,
        title: TEST_CONFIG.proposal.title,
        description: TEST_CONFIG.proposal.description,
        proposerAddress: TEST_CONFIG.proposal.proposerAddress,
        status: 'PENDING_ANALYSIS',
        detectedAtBlock: BigInt(12346),
        creationTxHash: '0xProposalTx' + Date.now().toString(16),
      },
    });
    
    console.log(`   ✅ Proposal created: ${proposal.id}\n`);

    // ============================================
    // STEP 4: Queue Analysis Job
    // ============================================
    console.log('📝 Step 3: Queueing analysis job...');
    
    const job = await analysisProducer.addJob(
      proposal.id,
      {
        onchainProposalId: proposal.onchainProposalId,
        daoGovernor: proposal.daoGovernor,
        chainId: proposal.chainId,
        proposerAddress: proposal.proposerAddress,
        title: proposal.title,
        description: proposal.description,
        metadata: { source: 'e2e-test' },
      },
      'normal',
    );
    
    if (!job) {
      throw new Error('Failed to queue analysis job - job already exists');
    }
    
    console.log(`   ✅ Job queued: ${job.id}\n`);

    // ============================================
    // STEP 5: Wait for Analysis (or Simulate)
    // ============================================
    console.log('⏳ Step 4: Waiting for analysis to complete...');
    
    // If simulating, run the simulated worker
    if (simulateWorker_flag) {
      // Give the listener a moment to start
      await sleep(1000);
      await simulateWorker(redisClient, proposal.id);
    }
    
    // Poll for analysis completion
    const analysisStartTime = Date.now();
    let analysisComplete = false;
    let lastStatus = '';
    
    while (Date.now() - analysisStartTime < TEST_CONFIG.analysisTimeout) {
      const status = await redisClient.get(`analysis:status:${proposal.id}`);
      
      if (status && status !== lastStatus) {
        console.log(`   Status: ${status}`);
        lastStatus = status;
      }
      
      if (status === 'complete') {
        analysisComplete = true;
        break;
      }
      
      await sleep(TEST_CONFIG.pollInterval);
    }
    
    if (!analysisComplete) {
      console.log('\n⚠️  Analysis did not complete within timeout');
      console.log('   Make sure the mock-ai-worker is running:');
      console.log('   npx ts-node scripts/mock-ai-worker.ts');
      
      if (!simulateWorker_flag) {
        console.log('\n   Or run this test with --simulate-worker flag');
      }
      
      throw new Error('Analysis timeout - worker may not be running');
    }
    
    console.log(`   ✅ Analysis complete in ${formatDuration(Date.now() - analysisStartTime)}\n`);

    // Give the AnalysisResultListener time to process and trigger voting
    console.log('⏳ Step 5: Waiting for voting execution...');
    await sleep(2000);

    // ============================================
    // STEP 6: Verify Results
    // ============================================
    console.log('\n🔍 Step 6: Verifying results...\n');
    
    // Check AuditLog for vote entries
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        proposalId: proposal.id,
        action: 'VOTE_CAST_AUTO',
      },
    });
    
    console.log('   📋 Audit Log Results:');
    console.log(`      Total vote entries: ${auditLogs.length}`);
    
    if (auditLogs.length > 0) {
      for (const log of auditLogs) {
        const metadata = log.metadata as any;
        console.log(`      - Delegator: ${metadata?.delegatorAddress || 'unknown'}`);
        console.log(`        Vote: ${log.voteType}`);
        console.log(`        Risk Score: ${log.riskScore}`);
        console.log(`        Success: ${metadata?.success}`);
        if (metadata?.errorCode) {
          console.log(`        Error: ${metadata.errorCode}`);
        }
      }
    }
    
    // Check proposal status
    const updatedProposal = await prisma.proposal.findUnique({
      where: { id: proposal.id },
    });
    
    console.log('\n   📋 Proposal Status:');
    console.log(`      Status: ${updatedProposal?.status}`);
    console.log(`      Risk Score: ${updatedProposal?.compositeRiskScore}`);
    console.log(`      Risk Level: ${updatedProposal?.riskLevel}`);

    // ============================================
    // ASSERTIONS
    // ============================================
    console.log('\n📊 Assertions:\n');
    
    let passed = 0;
    let failed = 0;
    
    // Assertion 1: Analysis should have completed
    if (updatedProposal?.compositeRiskScore !== null) {
      console.log('   ✅ PASS: Proposal has risk score assigned');
      passed++;
    } else {
      console.log('   ❌ FAIL: Proposal missing risk score');
      failed++;
    }
    
    // Assertion 2: Proposal status should be updated
    const validStatuses = ['AUTO_APPROVED', 'AUTO_REJECTED', 'NEEDS_REVIEW'];
    if (updatedProposal && validStatuses.includes(updatedProposal.status)) {
      console.log(`   ✅ PASS: Proposal status updated to ${updatedProposal.status}`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: Proposal status not updated (${updatedProposal?.status})`);
      failed++;
    }
    
    // Assertion 3: Vote should have been attempted for our test user
    // Note: This may fail if VotingAgent contract is not configured
    const userVote = auditLogs.find(
      log => (log.metadata as any)?.delegatorAddress?.toLowerCase() === TEST_CONFIG.user.address.toLowerCase()
    );
    
    if (userVote) {
      console.log(`   ✅ PASS: Vote recorded for test user (${userVote.voteType})`);
      passed++;
      
      // If risk score < threshold, vote should be FOR
      if (updatedProposal && 
          updatedProposal.compositeRiskScore !== null && 
          updatedProposal.compositeRiskScore <= TEST_CONFIG.user.riskThreshold) {
        if (userVote.voteType === 'FOR') {
          console.log('   ✅ PASS: Vote direction correct (FOR for low risk)');
          passed++;
        } else {
          console.log(`   ❌ FAIL: Expected FOR vote for low risk, got ${userVote.voteType}`);
          failed++;
        }
      }
    } else {
      // This might fail if VotingAgent contract interaction fails
      console.log('   ⚠️  WARN: No vote recorded for test user');
      console.log('         (This is expected if VOTING_AGENT_ADDRESS is not configured)');
    }

    // ============================================
    // FINAL RESULT
    // ============================================
    const totalTime = Date.now() - startTime;
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                      TEST RESULTS                             ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║   Passed: ${passed}                                                     ║`);
    console.log(`║   Failed: ${failed}                                                     ║`);
    console.log(`║   Duration: ${formatDuration(totalTime).padEnd(41)}║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    if (failed > 0) {
      process.exitCode = 1;
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exitCode = 1;
  } finally {
    // Cleanup
    if (redisClient) {
      await redisClient.quit();
    }
    
    if (app) {
      console.log('\n🧹 Shutting down application...');
      await app.close();
    }
  }
}

// ============================================
// RUN TEST
// ============================================

runE2ETest().catch(console.error);
