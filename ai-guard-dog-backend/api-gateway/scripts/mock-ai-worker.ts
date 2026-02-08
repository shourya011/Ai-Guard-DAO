/**
 * Mock AI Worker Script
 * 
 * Simulates the Python AI engine for testing the BullMQ pipeline.
 * 
 * Usage:
 *   npx ts-node scripts/mock-ai-worker.ts
 * 
 * This worker:
 * 1. Connects to both BullMQ queues (high-priority and normal)
 * 2. Processes jobs with simulated analysis
 * 3. Publishes progress events to Redis Pub/Sub
 * 4. Stores results in Redis
 */

import { Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// ============================================
// CONFIGURATION
// ============================================

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
};

const QUEUE_NAMES = {
  HIGH_PRIORITY: 'analysis-high-priority',
  NORMAL: 'analysis-normal',
};

// ============================================
// INTERFACES
// ============================================

interface AnalysisJobData {
  proposalId: string;
  onchainProposalId: string;
  daoGovernor: string;
  chainId: number;
  proposerAddress: string;
  title: string;
  description: string;
  priority: 'high' | 'normal';
  createdAt: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

interface AnalysisJobResult {
  jobId: string;
  status: 'complete' | 'failed';
  compositeScore?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation?: 'APPROVE' | 'REVIEW' | 'REJECT';
  agents?: {
    reputation?: {
      score: number;
      flags: string[];
      reasoning: string;
    };
    nlp?: {
      score: number;
      redFlags: string[];
      tactics: string[];
      confidence: number;
      reasoning: string;
    };
    mediator?: {
      compositeScore: number;
      riskLevel: string;
      recommendation: string;
      reasoning: string;
      confidence: number;
    };
  };
  error?: string;
  processingTimeMs?: number;
  completedAt: string;
}

// ============================================
// REDIS PUB/SUB HELPER
// ============================================

const publisher = new Redis(REDIS_CONFIG);

async function publishEvent(
  proposalId: string,
  event: Record<string, unknown>,
): Promise<void> {
  const channel = `analysis:events:${proposalId}`;
  await publisher.publish(channel, JSON.stringify(event));
  console.log(`📤 Published event to ${channel}: ${event.type}`);
}

async function setStatus(proposalId: string, status: string): Promise<void> {
  await publisher.setex(`analysis:status:${proposalId}`, 3600, status);
}

async function setResult(proposalId: string, result: AnalysisJobResult): Promise<void> {
  await publisher.setex(`analysis:${proposalId}`, 3600, JSON.stringify(result));
}

// ============================================
// MOCK ANALYSIS LOGIC
// ============================================

function detectRedFlags(description: string): string[] {
  const redFlags: string[] = [];
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('urgent') || lowerDesc.includes('emergency')) {
    redFlags.push('URGENCY_TACTICS');
  }
  if (lowerDesc.includes('unlimited') || lowerDesc.includes('max')) {
    redFlags.push('EXCESSIVE_PERMISSIONS');
  }
  if (lowerDesc.includes('transfer') && lowerDesc.includes('treasury')) {
    redFlags.push('TREASURY_ACCESS');
  }
  if (lowerDesc.includes('owner') || lowerDesc.includes('admin')) {
    redFlags.push('ADMIN_PRIVILEGES');
  }
  if (lowerDesc.includes('upgrade') || lowerDesc.includes('proxy')) {
    redFlags.push('CONTRACT_UPGRADE');
  }

  return redFlags;
}

function calculateRiskScore(redFlags: string[]): number {
  const baseScore = 20; // Base risk
  const flagScore = redFlags.length * 15; // Each flag adds 15 points
  return Math.min(100, baseScore + flagScore + Math.floor(Math.random() * 10));
}

function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score <= 30) return 'LOW';
  if (score <= 50) return 'MEDIUM';
  if (score <= 75) return 'HIGH';
  return 'CRITICAL';
}

function getRecommendation(score: number): 'APPROVE' | 'REVIEW' | 'REJECT' {
  if (score <= 30) return 'APPROVE';
  if (score <= 60) return 'REVIEW';
  return 'REJECT';
}

// ============================================
// JOB PROCESSOR
// ============================================

async function processJob(job: Job<AnalysisJobData>): Promise<AnalysisJobResult> {
  const { proposalId, title, description, proposerAddress, priority } = job.data;
  const startTime = Date.now();

  console.log(`\n🔬 Processing job: ${job.id}`);
  console.log(`   Proposal: ${proposalId}`);
  console.log(`   Title: ${title}`);
  console.log(`   Priority: ${priority}`);

  // Update status to processing
  await setStatus(proposalId, 'processing');
  await publishEvent(proposalId, {
    type: 'processing',
    jobId: proposalId,
    stage: 'started',
    timestamp: new Date().toISOString(),
  });

  // Simulate Stage 1: Reputation Analysis
  await job.updateProgress(20);
  await publishEvent(proposalId, {
    type: 'progress',
    jobId: proposalId,
    stage: 'reputation',
    progress: 20,
    message: 'Analyzing proposer reputation...',
    timestamp: new Date().toISOString(),
  });
  await sleep(1000); // Simulate work

  const reputationScore = 30 + Math.floor(Math.random() * 40);
  const reputationFlags = proposerAddress.startsWith('0x000')
    ? ['NEW_ADDRESS', 'LOW_HISTORY']
    : [];

  // Simulate Stage 2: NLP Analysis
  await job.updateProgress(50);
  await publishEvent(proposalId, {
    type: 'progress',
    jobId: proposalId,
    stage: 'nlp',
    progress: 50,
    message: 'Analyzing proposal text...',
    timestamp: new Date().toISOString(),
  });
  await sleep(1500); // Simulate work

  const nlpRedFlags = detectRedFlags(description);
  const nlpScore = calculateRiskScore(nlpRedFlags);

  // Simulate Stage 3: Mediator Analysis
  await job.updateProgress(80);
  await publishEvent(proposalId, {
    type: 'progress',
    jobId: proposalId,
    stage: 'mediator',
    progress: 80,
    message: 'Computing final risk assessment...',
    timestamp: new Date().toISOString(),
  });
  await sleep(1000); // Simulate work

  // Calculate final composite score
  const compositeScore = Math.round((reputationScore * 0.3 + nlpScore * 0.7));
  const riskLevel = getRiskLevel(compositeScore);
  const recommendation = getRecommendation(compositeScore);

  const processingTimeMs = Date.now() - startTime;

  // Build result
  const result: AnalysisJobResult = {
    jobId: proposalId,
    status: 'complete',
    compositeScore,
    riskLevel,
    recommendation,
    agents: {
      reputation: {
        score: reputationScore,
        flags: reputationFlags,
        reasoning: `Proposer ${proposerAddress.substring(0, 10)}... has ${
          reputationFlags.length > 0 ? 'limited' : 'established'
        } history on-chain.`,
      },
      nlp: {
        score: nlpScore,
        redFlags: nlpRedFlags,
        tactics: nlpRedFlags.length > 0 ? ['potential_manipulation'] : [],
        confidence: 0.85,
        reasoning: nlpRedFlags.length > 0
          ? `Detected ${nlpRedFlags.length} potential red flags in proposal text.`
          : 'No significant red flags detected in proposal text.',
      },
      mediator: {
        compositeScore,
        riskLevel,
        recommendation,
        reasoning: `Based on combined analysis, this proposal has ${riskLevel.toLowerCase()} risk. ${
          recommendation === 'REJECT'
            ? 'Manual review strongly recommended.'
            : recommendation === 'REVIEW'
            ? 'Consider additional review before voting.'
            : 'Appears safe for community voting.'
        }`,
        confidence: 0.82,
      },
    },
    processingTimeMs,
    completedAt: new Date().toISOString(),
  };

  // Store result in Redis
  await setResult(proposalId, result);
  await setStatus(proposalId, 'complete');

  // Publish completion event
  await publishEvent(proposalId, {
    type: 'complete',
    jobId: proposalId,
    result: {
      compositeScore,
      riskLevel,
      recommendation,
    },
    processingTimeMs,
    timestamp: new Date().toISOString(),
  });

  console.log(`✅ Job completed: ${job.id}`);
  console.log(`   Score: ${compositeScore} | Level: ${riskLevel} | Rec: ${recommendation}`);
  console.log(`   Time: ${processingTimeMs}ms`);

  return result;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  console.log('🤖 Mock AI Worker starting...');
  console.log(`   Redis: ${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`);
  console.log(`   Queues: ${Object.values(QUEUE_NAMES).join(', ')}`);

  // Create workers for both queues
  const workers: Worker[] = [];

  for (const [name, queueName] of Object.entries(QUEUE_NAMES)) {
    const worker = new Worker<AnalysisJobData, AnalysisJobResult>(
      queueName,
      async (job) => processJob(job),
      {
        connection: REDIS_CONFIG,
        concurrency: 3, // Process up to 3 jobs in parallel
      },
    );

    worker.on('completed', (job, result) => {
      console.log(`🎉 [${name}] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ [${name}] Job ${job?.id} failed:`, err.message);
      
      // Publish failure event if we have the job data
      if (job?.data?.proposalId) {
        const proposalId = job.data.proposalId;
        setStatus(proposalId, 'failed');
        publishEvent(proposalId, {
          type: 'failed',
          jobId: proposalId,
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    worker.on('error', (err) => {
      console.error(`❌ [${name}] Worker error:`, err.message);
    });

    workers.push(worker);
    console.log(`👷 Worker created for queue: ${queueName}`);
  }

  console.log('\n🚀 Mock AI Worker is ready and listening for jobs!\n');
  console.log('Press Ctrl+C to stop.\n');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down workers...');
    await Promise.all(workers.map((w) => w.close()));
    await publisher.quit();
    console.log('✅ Workers stopped');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
