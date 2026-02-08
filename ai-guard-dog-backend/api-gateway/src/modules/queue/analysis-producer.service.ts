/**
 * AI Guard DAO - Analysis Producer Service
 * 
 * Produces analysis jobs to BullMQ queues:
 * - High priority: User-initiated analysis requests
 * - Normal priority: Auto-detected proposals from blockchain scanner
 * 
 * Features:
 * - Job deduplication using proposalId as jobId
 * - Priority-based routing
 * - Job progress tracking via Redis Pub/Sub
 */

import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { RedisService } from '../../services/redis.service';
import {
  ANALYSIS_HIGH_PRIORITY_QUEUE,
  ANALYSIS_NORMAL_QUEUE,
} from './queue.tokens';

// ============================================
// CONSTANTS
// ============================================

export const QUEUE_NAMES = {
  HIGH_PRIORITY: 'analysis-high-priority',
  NORMAL: 'analysis-normal',
} as const;

export type JobPriority = 'high' | 'normal';

// ============================================
// REDIS KEYS FOR ANALYSIS
// ============================================

export const AnalysisRedisKeys = {
  /** Analysis result cache: analysis:{proposalId} */
  result: (proposalId: string) => `analysis:${proposalId}`,
  
  /** Pub/Sub channel for real-time events: analysis:events:{proposalId} */
  events: (proposalId: string) => `analysis:events:${proposalId}`,
  
  /** Job status: analysis:status:{proposalId} */
  status: (proposalId: string) => `analysis:status:${proposalId}`,
} as const;

// ============================================
// JOB DATA INTERFACE
// ============================================

export interface AnalysisJobData {
  /** Database UUID of the proposal */
  proposalId: string;
  
  /** On-chain proposal ID (uint256 as string) */
  onchainProposalId: string;
  
  /** DAO Governor contract address */
  daoGovernor: string;
  
  /** Chain ID */
  chainId: number;
  
  /** Proposer wallet address */
  proposerAddress: string;
  
  /** Proposal title */
  title: string;
  
  /** Full proposal description */
  description: string;
  
  /** Priority level */
  priority: JobPriority;
  
  /** Timestamp when job was created */
  createdAt: string;
  
  /** Optional callback URL for webhook notification */
  callbackUrl?: string;
  
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================
// JOB RESULT INTERFACE
// ============================================

export interface AnalysisJobResult {
  /** Job ID (same as proposalId) */
  jobId: string;
  
  /** Processing status */
  status: 'complete' | 'failed';
  
  /** Composite risk score (0-100) */
  compositeScore?: number;
  
  /** Risk level classification */
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  /** Recommendation */
  recommendation?: 'APPROVE' | 'REVIEW' | 'REJECT';
  
  /** Individual agent results */
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
  
  /** Error message if failed */
  error?: string;
  
  /** Processing time in milliseconds */
  processingTimeMs?: number;
  
  /** Timestamp when analysis completed */
  completedAt: string;
}

// ============================================
// ANALYSIS PRODUCER SERVICE
// ============================================

@Injectable()
export class AnalysisProducerService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalysisProducerService.name);

  constructor(
    @Inject(ANALYSIS_HIGH_PRIORITY_QUEUE)
    private readonly highPriorityQueue: Queue<AnalysisJobData, AnalysisJobResult>,
    
    @Inject(ANALYSIS_NORMAL_QUEUE)
    private readonly normalQueue: Queue<AnalysisJobData, AnalysisJobResult>,
    
    private readonly redisService: RedisService,
  ) {}

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing queue connections...');
    await Promise.all([
      this.highPriorityQueue.close(),
      this.normalQueue.close(),
    ]);
  }

  // ============================================
  // ADD JOB TO QUEUE
  // ============================================

  /**
   * Add an analysis job to the appropriate queue
   * 
   * @param proposalId - Database UUID of the proposal (used as jobId for deduplication)
   * @param data - Job data including proposal details
   * @param priority - 'high' for user-initiated, 'normal' for scanner events
   * @returns The created job, or null if job already exists
   */
  async addJob(
    proposalId: string,
    data: Omit<AnalysisJobData, 'proposalId' | 'priority' | 'createdAt'>,
    priority: JobPriority = 'normal',
  ): Promise<Job<AnalysisJobData, AnalysisJobResult> | null> {
    const queue = priority === 'high' ? this.highPriorityQueue : this.normalQueue;
    const queueName = priority === 'high' ? QUEUE_NAMES.HIGH_PRIORITY : QUEUE_NAMES.NORMAL;

    // Prepare full job data
    const jobData: AnalysisJobData = {
      ...data,
      proposalId,
      priority,
      createdAt: new Date().toISOString(),
    };

    try {
      // Check if job already exists (deduplication)
      const existingJob = await queue.getJob(proposalId);
      
      if (existingJob) {
        const state = await existingJob.getState();
        
        // If job is already completed or active, don't create a new one
        if (state === 'completed' || state === 'active' || state === 'waiting') {
          this.logger.debug(
            `Job already exists for proposal ${proposalId} (state: ${state})`,
          );
          return existingJob;
        }
        
        // If job failed, remove it and create a new one
        if (state === 'failed') {
          this.logger.log(`Removing failed job for proposal ${proposalId}`);
          await existingJob.remove();
        }
      }

      // Create new job with proposalId as jobId (enables deduplication)
      const job = await queue.add(
        'analyze-proposal', // Job name
        jobData,
        {
          jobId: proposalId, // Use proposalId for deduplication
          priority: priority === 'high' ? 1 : 10, // Lower number = higher priority
        },
      );

      this.logger.log(
        `📤 Job added to ${queueName}: ${proposalId} (BullMQ ID: ${job.id})`,
      );

      // Set initial status in Redis
      await this.setJobStatus(proposalId, 'queued');

      // Publish event to Pub/Sub channel
      await this.publishEvent(proposalId, {
        type: 'queued',
        jobId: proposalId,
        priority,
        queueName,
        timestamp: new Date().toISOString(),
      });

      return job;

    } catch (error) {
      this.logger.error(`Failed to add job for proposal ${proposalId}:`, error);
      throw error;
    }
  }

  // ============================================
  // JOB STATUS MANAGEMENT
  // ============================================

  /**
   * Set job status in Redis
   */
  async setJobStatus(
    proposalId: string,
    status: 'queued' | 'processing' | 'complete' | 'failed',
  ): Promise<void> {
    const key = AnalysisRedisKeys.status(proposalId);
    await this.redisService.set(key, status, 3600); // 1 hour TTL
  }

  /**
   * Get job status from Redis
   */
  async getJobStatus(proposalId: string): Promise<string | null> {
    const key = AnalysisRedisKeys.status(proposalId);
    return this.redisService.get(key);
  }

  // ============================================
  // RESULT MANAGEMENT
  // ============================================

  /**
   * Store analysis result in Redis cache
   */
  async setResult(proposalId: string, result: AnalysisJobResult): Promise<void> {
    const key = AnalysisRedisKeys.result(proposalId);
    await this.redisService.set(key, JSON.stringify(result), 3600); // 1 hour TTL
  }

  /**
   * Get analysis result from Redis cache
   */
  async getResult(proposalId: string): Promise<AnalysisJobResult | null> {
    const key = AnalysisRedisKeys.result(proposalId);
    const data = await this.redisService.get(key);
    return data ? JSON.parse(data) : null;
  }

  // ============================================
  // PUB/SUB EVENTS
  // ============================================

  /**
   * Publish an event to the proposal's Pub/Sub channel
   */
  async publishEvent(proposalId: string, event: Record<string, unknown>): Promise<void> {
    const channel = AnalysisRedisKeys.events(proposalId);
    const client = this.redisService.getClient();
    await client.publish(channel, JSON.stringify(event));
    this.logger.debug(`Published event to ${channel}: ${event.type}`);
  }

  // ============================================
  // QUEUE HEALTH
  // ============================================

  /**
   * Get queue health metrics
   */
  async getQueueHealth(): Promise<{
    highPriority: { waiting: number; active: number; completed: number; failed: number };
    normal: { waiting: number; active: number; completed: number; failed: number };
  }> {
    const [highWaiting, highActive, highCompleted, highFailed] = await Promise.all([
      this.highPriorityQueue.getWaitingCount(),
      this.highPriorityQueue.getActiveCount(),
      this.highPriorityQueue.getCompletedCount(),
      this.highPriorityQueue.getFailedCount(),
    ]);

    const [normalWaiting, normalActive, normalCompleted, normalFailed] = await Promise.all([
      this.normalQueue.getWaitingCount(),
      this.normalQueue.getActiveCount(),
      this.normalQueue.getCompletedCount(),
      this.normalQueue.getFailedCount(),
    ]);

    return {
      highPriority: {
        waiting: highWaiting,
        active: highActive,
        completed: highCompleted,
        failed: highFailed,
      },
      normal: {
        waiting: normalWaiting,
        active: normalActive,
        completed: normalCompleted,
        failed: normalFailed,
      },
    };
  }

  /**
   * Get job by proposal ID from either queue
   */
  async getJob(proposalId: string): Promise<Job<AnalysisJobData, AnalysisJobResult> | null> {
    // Check high priority queue first
    let job = await this.highPriorityQueue.getJob(proposalId);
    if (job) return job;

    // Then check normal queue
    job = await this.normalQueue.getJob(proposalId);
    return job ?? null;
  }
}
