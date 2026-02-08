/**
 * AI Guard DAO - Agent Controller
 * 
 * REST & SSE endpoints for AI analysis operations:
 * - POST /agent/analyze/:proposalId - Trigger manual analysis
 * - GET /agent/status/:proposalId - Get analysis status
 * - GET /agent/result/:proposalId - Get analysis result
 * - GET /agent/events/:proposalId - SSE stream for real-time updates
 * - GET /agent/health - Queue health metrics
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Sse,
  MessageEvent,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Observable, Subject, fromEvent, takeUntil, map, filter, finalize } from 'rxjs';
import { Redis } from 'ioredis';

import {
  AnalysisProducerService,
  AnalysisRedisKeys,
  AnalysisJobResult,
} from '../queue/analysis-producer.service';
import { RedisService } from '../../services/redis.service';
import { PrismaService } from '../../services/prisma.service';

// ============================================
// AGENT CONTROLLER
// ============================================

@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);
  private readonly subscriberClients: Map<string, Redis> = new Map();

  constructor(
    private readonly analysisProducer: AnalysisProducerService,
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) {}

  // ============================================
  // TRIGGER ANALYSIS
  // ============================================

  /**
   * POST /agent/analyze/:proposalId
   * 
   * Manually trigger AI analysis for a proposal (high priority queue)
   */
  @Post('analyze/:proposalId')
  async triggerAnalysis(
    @Param('proposalId') proposalId: string,
  ): Promise<{ jobId: string; status: string; queue: string }> {
    this.logger.log(`Manual analysis triggered for proposal: ${proposalId}`);

    // Fetch proposal from database
    const proposal = await this.prismaService.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new HttpException('Proposal not found', HttpStatus.NOT_FOUND);
    }

    // Add to high priority queue
    const job = await this.analysisProducer.addJob(
      proposalId,
      {
        onchainProposalId: proposal.onchainProposalId,
        daoGovernor: proposal.daoGovernor,
        chainId: proposal.chainId,
        proposerAddress: proposal.proposerAddress,
        title: proposal.title,
        description: proposal.description,
        metadata: {
          source: 'manual',
          targets: proposal.targets,
          values: proposal.values,
          calldatas: proposal.calldatas,
        },
      },
      'high', // Manual requests go to high priority queue
    );

    const status = await this.analysisProducer.getJobStatus(proposalId);

    return {
      jobId: proposalId,
      status: status || 'queued',
      queue: 'high-priority',
    };
  }

  // ============================================
  // GET STATUS
  // ============================================

  /**
   * GET /agent/status/:proposalId
   * 
   * Get current analysis status for a proposal
   */
  @Get('status/:proposalId')
  async getStatus(
    @Param('proposalId') proposalId: string,
  ): Promise<{ proposalId: string; status: string | null; jobState?: string }> {
    const status = await this.analysisProducer.getJobStatus(proposalId);
    
    // Also check BullMQ job state
    const job = await this.analysisProducer.getJob(proposalId);
    const jobState = job ? await job.getState() : undefined;

    return {
      proposalId,
      status,
      jobState,
    };
  }

  // ============================================
  // GET RESULT
  // ============================================

  /**
   * GET /agent/result/:proposalId
   * 
   * Get analysis result for a proposal (from Redis cache)
   */
  @Get('result/:proposalId')
  async getResult(
    @Param('proposalId') proposalId: string,
  ): Promise<AnalysisJobResult | { error: string }> {
    const result = await this.analysisProducer.getResult(proposalId);

    if (!result) {
      throw new HttpException(
        'Analysis result not found. The analysis may still be in progress.',
        HttpStatus.NOT_FOUND,
      );
    }

    return result;
  }

  // ============================================
  // SSE EVENTS STREAM
  // ============================================

  /**
   * GET /agent/events/:proposalId
   * 
   * Server-Sent Events stream for real-time analysis updates.
   * Subscribes to Redis Pub/Sub channel for the specific proposal.
   */
  @Sse('events/:proposalId')
  subscribeToEvents(
    @Param('proposalId') proposalId: string,
  ): Observable<MessageEvent> {
    this.logger.log(`SSE connection opened for proposal: ${proposalId}`);
    
    const channel = AnalysisRedisKeys.events(proposalId);
    const connectionId = `${proposalId}-${Date.now()}`;
    const disconnect$ = new Subject<void>();

    // Create a dedicated Redis subscriber for this connection
    // (Redis Pub/Sub requires a separate connection)
    const subscriber = this.redisService.createSubscriber();
    this.subscriberClients.set(connectionId, subscriber);

    // Subscribe to the channel
    subscriber.subscribe(channel);
    this.logger.debug(`Subscribed to Redis channel: ${channel}`);

    // Create observable from Redis message events
    const events$ = new Observable<MessageEvent>((observer) => {
      // Handle Redis messages
      subscriber.on('message', (receivedChannel: string, message: string) => {
        if (receivedChannel !== channel) return;

        try {
          const data = JSON.parse(message);
          this.logger.debug(`SSE event for ${proposalId}: ${data.type}`);

          observer.next({
            data: message,
            type: data.type || 'message',
            id: `${Date.now()}`,
          });

          // If this is a terminal event, complete the stream
          if (data.type === 'complete' || data.type === 'failed') {
            this.logger.log(`Analysis ${data.type} for ${proposalId}, closing SSE`);
            // Small delay to ensure client receives the event
            setTimeout(() => {
              observer.complete();
            }, 100);
          }
        } catch (error) {
          this.logger.error(`Failed to parse message: ${message}`, error);
        }
      });

      // Handle subscriber errors
      subscriber.on('error', (error) => {
        this.logger.error(`Redis subscriber error for ${proposalId}:`, error);
        observer.error(error);
      });

      // Cleanup on unsubscribe
      return () => {
        this.logger.log(`SSE connection closed for proposal: ${proposalId}`);
        disconnect$.next();
        disconnect$.complete();
        this.cleanupSubscriber(connectionId, channel, subscriber);
      };
    });

    // Send initial connection event
    return new Observable<MessageEvent>((observer) => {
      // Send connection established event
      observer.next({
        data: JSON.stringify({
          type: 'connected',
          proposalId,
          channel,
          timestamp: new Date().toISOString(),
        }),
        type: 'connected',
        id: `${Date.now()}`,
      });

      // Pipe the Redis events
      const subscription = events$.subscribe({
        next: (event) => observer.next(event),
        error: (error) => observer.error(error),
        complete: () => observer.complete(),
      });

      return () => {
        subscription.unsubscribe();
      };
    });
  }

  /**
   * Cleanup Redis subscriber connection
   */
  private async cleanupSubscriber(
    connectionId: string,
    channel: string,
    subscriber: Redis,
  ): Promise<void> {
    try {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
      this.subscriberClients.delete(connectionId);
      this.logger.debug(`Cleaned up subscriber: ${connectionId}`);
    } catch (error) {
      this.logger.error(`Error cleaning up subscriber:`, error);
    }
  }

  // ============================================
  // QUEUE HEALTH
  // ============================================

  /**
   * GET /agent/health
   * 
   * Get queue health metrics
   */
  @Get('health')
  async getQueueHealth(): Promise<{
    status: string;
    queues: {
      highPriority: { waiting: number; active: number; completed: number; failed: number };
      normal: { waiting: number; active: number; completed: number; failed: number };
    };
  }> {
    const queues = await this.analysisProducer.getQueueHealth();

    return {
      status: 'healthy',
      queues,
    };
  }
}
