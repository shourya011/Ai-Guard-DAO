/**
 * Analysis Result Listener Service
 * 
 * Closes the loop between AI Analysis completion and Vote Execution.
 * 
 * Responsibilities:
 * 1. Subscribe to Redis Pub/Sub pattern `analysis:events:*`
 * 2. Parse incoming analysis completion events
 * 3. Trigger VotingService to process votes for eligible delegations
 * 
 * This is the "Circuit Closer" - connecting the async analysis pipeline
 * to the synchronous voting execution.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { RedisService } from '../../services/redis.service';
import { VotingService, AnalysisResultForVoting } from '../../services/voting.service';
import Redis from 'ioredis';

// ============================================
// EVENT INTERFACES
// ============================================

/**
 * Analysis event published by the AI worker
 */
export interface AnalysisEvent {
  type: 'processing' | 'progress' | 'complete' | 'failed';
  jobId: string;
  timestamp: string;
  
  // Progress event fields
  stage?: string;
  progress?: number;
  message?: string;
  
  // Complete event fields
  result?: {
    compositeScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  };
  processingTimeMs?: number;
  
  // Failed event fields
  error?: string;
}

// ============================================
// ANALYSIS RESULT LISTENER SERVICE
// ============================================

@Injectable()
export class AnalysisResultListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalysisResultListener.name);
  private subscriber: Redis | null = null;
  private isShuttingDown = false;

  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
    private readonly votingService: VotingService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('🎧 AnalysisResultListener initializing...');
    await this.startListening();
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;
    await this.stopListening();
  }

  /**
   * Start listening for analysis events via Redis Pub/Sub
   */
  private async startListening(): Promise<void> {
    try {
      // Create dedicated subscriber connection
      this.subscriber = this.redisService.createSubscriber();
      
      // Subscribe to analysis events pattern
      const pattern = 'analysis:events:*';
      await this.subscriber.psubscribe(pattern);
      
      this.logger.log(`✅ Subscribed to Redis pattern: ${pattern}`);

      // Handle incoming messages
      this.subscriber.on('pmessage', async (pattern, channel, message) => {
        if (this.isShuttingDown) return;
        
        try {
          await this.handleMessage(channel, message);
        } catch (error) {
          this.logger.error(`Error handling message from ${channel}:`, error);
        }
      });

      // Handle subscription errors
      this.subscriber.on('error', (error) => {
        this.logger.error('Redis subscriber error:', error.message);
      });

    } catch (error) {
      this.logger.error('Failed to start analysis listener:', error);
      throw error;
    }
  }

  /**
   * Stop listening and clean up
   */
  private async stopListening(): Promise<void> {
    if (this.subscriber) {
      this.logger.log('🛑 Stopping analysis listener...');
      
      try {
        await this.subscriber.punsubscribe('analysis:events:*');
        await this.subscriber.quit();
        this.subscriber = null;
        this.logger.log('Analysis listener stopped');
      } catch (error) {
        this.logger.error('Error stopping subscriber:', error);
      }
    }
  }

  /**
   * Handle incoming Redis Pub/Sub message
   */
  private async handleMessage(channel: string, rawMessage: string): Promise<void> {
    // Extract proposalId from channel name (analysis:events:{proposalId})
    const proposalId = channel.replace('analysis:events:', '');
    
    // Parse the event
    let event: AnalysisEvent;
    try {
      event = JSON.parse(rawMessage);
    } catch (error) {
      this.logger.warn(`Invalid JSON in message from ${channel}`);
      return;
    }

    this.logger.debug(`📨 Received event: ${event.type} for proposal ${proposalId}`);

    // Only process 'complete' events for voting
    if (event.type === 'complete') {
      await this.handleAnalysisComplete(proposalId, event);
    } else if (event.type === 'failed') {
      await this.handleAnalysisFailed(proposalId, event);
    }
    // Ignore 'processing' and 'progress' events - they're for SSE streaming
  }

  /**
   * Handle analysis completion - trigger voting
   */
  private async handleAnalysisComplete(
    proposalId: string,
    event: AnalysisEvent,
  ): Promise<void> {
    this.logger.log(`✅ Analysis complete for proposal ${proposalId}. Triggering Voting Service...`);
    
    if (!event.result) {
      this.logger.warn(`Complete event missing result for proposal ${proposalId}`);
      return;
    }

    const { compositeScore, riskLevel, recommendation } = event.result;
    this.logger.log(`   Score: ${compositeScore} | Level: ${riskLevel} | Rec: ${recommendation}`);

    try {
      // Fetch proposal from database to get full details
      const proposal = await this.prismaService.proposal.findUnique({
        where: { id: proposalId },
        include: {
          analyses: {
            where: { status: 'COMPLETE' },
            orderBy: { completedAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!proposal) {
        this.logger.warn(`Proposal ${proposalId} not found in database`);
        return;
      }

      // Get the analysis record (if it exists)
      const analysis = proposal.analyses[0];

      // Build the voting input
      const analysisResult: AnalysisResultForVoting = {
        analysisId: analysis?.id || proposalId,
        proposalId: proposal.id,
        onchainProposalId: proposal.onchainProposalId,
        daoGovernor: proposal.daoGovernor,
        chainId: proposal.chainId,
        compositeRiskScore: compositeScore,
        riskLevel,
        recommendation,
        reportHash: analysis?.reportHash || undefined,
      };

      // Trigger voting service
      const votingResult = await this.votingService.processVotesForProposal(analysisResult);

      this.logger.log(`🗳️ Voting complete for proposal ${proposalId}:`);
      this.logger.log(`   Total Delegations: ${votingResult.totalDelegations}`);
      this.logger.log(`   Eligible: ${votingResult.eligibleDelegations}`);
      this.logger.log(`   Votes Cast: ${votingResult.votesSuccessful}/${votingResult.votesAttempted}`);

      // Update proposal status based on recommendation
      const newStatus = this.mapRecommendationToStatus(recommendation);
      await this.prismaService.proposal.update({
        where: { id: proposalId },
        data: {
          status: newStatus,
          compositeRiskScore: compositeScore,
          riskLevel,
        },
      });

    } catch (error) {
      this.logger.error(`Error processing votes for proposal ${proposalId}:`, error);
      // Don't throw - we don't want to crash the listener
    }
  }

  /**
   * Handle analysis failure
   */
  private async handleAnalysisFailed(
    proposalId: string,
    event: AnalysisEvent,
  ): Promise<void> {
    this.logger.error(`❌ Analysis failed for proposal ${proposalId}: ${event.error}`);

    try {
      // Update proposal status to indicate analysis failure
      await this.prismaService.proposal.update({
        where: { id: proposalId },
        data: {
          status: 'PENDING_ANALYSIS', // Reset to pending so it can be retried
        },
      });
    } catch (error) {
      this.logger.error(`Error updating proposal status for ${proposalId}:`, error);
    }
  }

  /**
   * Map AI recommendation to proposal status
   */
  private mapRecommendationToStatus(
    recommendation: 'APPROVE' | 'REVIEW' | 'REJECT',
  ): 'AUTO_APPROVED' | 'NEEDS_REVIEW' | 'AUTO_REJECTED' {
    switch (recommendation) {
      case 'APPROVE':
        return 'AUTO_APPROVED';
      case 'REJECT':
        return 'AUTO_REJECTED';
      case 'REVIEW':
      default:
        return 'NEEDS_REVIEW';
    }
  }

  /**
   * Get listener status (for health checks)
   */
  isListening(): boolean {
    return this.subscriber !== null && !this.isShuttingDown;
  }
}
