/**
 * AI Guard DAO - Queue Module
 * 
 * BullMQ-based job queue for asynchronous AI analysis pipeline:
 * - analysis-high-priority: Expedited requests (user-initiated)
 * - analysis-normal: Standard scanner events (auto-detected proposals)
 * 
 * Redis Keys:
 * - `analysis:{proposalId}` - Analysis result cache
 * - `analysis:events:{proposalId}` - Pub/Sub channel for real-time updates
 */

import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import { AnalysisProducerService, QUEUE_NAMES } from './analysis-producer.service';
import type { AppConfig } from '../../config/app.config';
import {
  ANALYSIS_HIGH_PRIORITY_QUEUE,
  ANALYSIS_NORMAL_QUEUE,
  ANALYSIS_HIGH_PRIORITY_QUEUE_EVENTS,
  ANALYSIS_NORMAL_QUEUE_EVENTS,
} from './queue.tokens';

// Re-export tokens for external use
export {
  ANALYSIS_HIGH_PRIORITY_QUEUE,
  ANALYSIS_NORMAL_QUEUE,
  ANALYSIS_HIGH_PRIORITY_QUEUE_EVENTS,
  ANALYSIS_NORMAL_QUEUE_EVENTS,
} from './queue.tokens';

// ============================================
// QUEUE MODULE
// ============================================

@Global()
@Module({
  providers: [
    // High Priority Queue
    {
      provide: ANALYSIS_HIGH_PRIORITY_QUEUE,
      useFactory: (configService: ConfigService<AppConfig>) => {
        const redisConfig = configService.get('redis', { infer: true });
        
        return new Queue(QUEUE_NAMES.HIGH_PRIORITY, {
          connection: {
            host: redisConfig?.host || 'localhost',
            port: redisConfig?.port || 6379,
            password: redisConfig?.password || undefined,
            db: redisConfig?.db || 0,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: {
              age: 3600, // Keep completed jobs for 1 hour
              count: 1000, // Keep last 1000 completed jobs
            },
            removeOnFail: {
              age: 86400, // Keep failed jobs for 24 hours
            },
          },
        });
      },
      inject: [ConfigService],
    },

    // Normal Priority Queue
    {
      provide: ANALYSIS_NORMAL_QUEUE,
      useFactory: (configService: ConfigService<AppConfig>) => {
        const redisConfig = configService.get('redis', { infer: true });
        
        return new Queue(QUEUE_NAMES.NORMAL, {
          connection: {
            host: redisConfig?.host || 'localhost',
            port: redisConfig?.port || 6379,
            password: redisConfig?.password || undefined,
            db: redisConfig?.db || 0,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: {
              age: 3600,
              count: 1000,
            },
            removeOnFail: {
              age: 86400,
            },
          },
        });
      },
      inject: [ConfigService],
    },

    // Queue Events for High Priority (for monitoring job progress)
    {
      provide: ANALYSIS_HIGH_PRIORITY_QUEUE_EVENTS,
      useFactory: (configService: ConfigService<AppConfig>) => {
        const redisConfig = configService.get('redis', { infer: true });
        
        return new QueueEvents(QUEUE_NAMES.HIGH_PRIORITY, {
          connection: {
            host: redisConfig?.host || 'localhost',
            port: redisConfig?.port || 6379,
            password: redisConfig?.password || undefined,
            db: redisConfig?.db || 0,
          },
        });
      },
      inject: [ConfigService],
    },

    // Queue Events for Normal Priority
    {
      provide: ANALYSIS_NORMAL_QUEUE_EVENTS,
      useFactory: (configService: ConfigService<AppConfig>) => {
        const redisConfig = configService.get('redis', { infer: true });
        
        return new QueueEvents(QUEUE_NAMES.NORMAL, {
          connection: {
            host: redisConfig?.host || 'localhost',
            port: redisConfig?.port || 6379,
            password: redisConfig?.password || undefined,
            db: redisConfig?.db || 0,
          },
        });
      },
      inject: [ConfigService],
    },

    // Analysis Producer Service
    AnalysisProducerService,
  ],
  exports: [
    ANALYSIS_HIGH_PRIORITY_QUEUE,
    ANALYSIS_NORMAL_QUEUE,
    ANALYSIS_HIGH_PRIORITY_QUEUE_EVENTS,
    ANALYSIS_NORMAL_QUEUE_EVENTS,
    AnalysisProducerService,
  ],
})
export class QueueModule {}
