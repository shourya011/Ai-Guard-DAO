/**
 * AI Guard DAO - Analysis Queue Tests
 * 
 * Tests for the BullMQ-based analysis queue pipeline.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import {
  AnalysisProducerService,
  QUEUE_NAMES,
  AnalysisRedisKeys,
  AnalysisJobData,
} from './analysis-producer.service';
import {
  QueueModule,
  ANALYSIS_HIGH_PRIORITY_QUEUE,
  ANALYSIS_NORMAL_QUEUE,
  ANALYSIS_HIGH_PRIORITY_QUEUE_EVENTS,
  ANALYSIS_NORMAL_QUEUE_EVENTS,
} from './queue.module';
import { RedisService } from '../../services/redis.service';
import configuration from '../../config/app.config';

// ============================================
// MOCK REDIS SERVICE
// ============================================

class MockRedisService {
  private store = new Map<string, string>();
  private publishedEvents: Array<{ channel: string; message: string }> = [];
  private client = {
    publish: async (channel: string, message: string) => {
      this.publishedEvents.push({ channel, message });
      return 1;
    },
  };

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  getClient() {
    return this.client;
  }

  createSubscriber() {
    return {
      subscribe: jest.fn(),
      on: jest.fn(),
      unsubscribe: jest.fn(),
      quit: jest.fn(),
    };
  }

  // Test helpers
  _getPublishedEvents() {
    return this.publishedEvents;
  }

  _getStore() {
    return this.store;
  }

  _clear() {
    this.store.clear();
    this.publishedEvents = [];
  }
}

// ============================================
// MOCK QUEUE
// ============================================

class MockQueue {
  private jobs = new Map<string, any>();
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async add(name: string, data: any, options?: any): Promise<any> {
    const jobId = options?.jobId || `job-${Date.now()}`;
    const job = {
      id: jobId,
      name,
      data,
      opts: options,
      getState: async () => 'waiting',
      remove: async () => this.jobs.delete(jobId),
    };
    this.jobs.set(jobId, job);
    return job;
  }

  async getJob(jobId: string): Promise<any | undefined> {
    return this.jobs.get(jobId);
  }

  async getWaitingCount() {
    return Array.from(this.jobs.values()).length;
  }

  async getActiveCount() {
    return 0;
  }

  async getCompletedCount() {
    return 0;
  }

  async getFailedCount() {
    return 0;
  }

  async close() {}

  // Test helpers
  _getJobs() {
    return this.jobs;
  }

  _clear() {
    this.jobs.clear();
  }
}

// ============================================
// TEST SUITE
// ============================================

describe('AnalysisProducerService', () => {
  let service: AnalysisProducerService;
  let mockRedisService: MockRedisService;
  let mockHighPriorityQueue: MockQueue;
  let mockNormalQueue: MockQueue;

  beforeEach(async () => {
    mockRedisService = new MockRedisService();
    mockHighPriorityQueue = new MockQueue(QUEUE_NAMES.HIGH_PRIORITY);
    mockNormalQueue = new MockQueue(QUEUE_NAMES.NORMAL);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
      ],
      providers: [
        AnalysisProducerService,
        {
          provide: ANALYSIS_HIGH_PRIORITY_QUEUE,
          useValue: mockHighPriorityQueue,
        },
        {
          provide: ANALYSIS_NORMAL_QUEUE,
          useValue: mockNormalQueue,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = moduleFixture.get<AnalysisProducerService>(AnalysisProducerService);
  });

  afterEach(async () => {
    mockRedisService._clear();
    mockHighPriorityQueue._clear();
    mockNormalQueue._clear();
  });

  // ============================================
  // CONSTANTS TESTS
  // ============================================

  describe('Queue Names', () => {
    it('should have correct queue name constants', () => {
      expect(QUEUE_NAMES.HIGH_PRIORITY).toBe('analysis-high-priority');
      expect(QUEUE_NAMES.NORMAL).toBe('analysis-normal');
    });
  });

  describe('Redis Keys', () => {
    it('should generate correct result key', () => {
      expect(AnalysisRedisKeys.result('test-123')).toBe('analysis:test-123');
    });

    it('should generate correct events channel', () => {
      expect(AnalysisRedisKeys.events('test-123')).toBe('analysis:events:test-123');
    });

    it('should generate correct status key', () => {
      expect(AnalysisRedisKeys.status('test-123')).toBe('analysis:status:test-123');
    });
  });

  // ============================================
  // ADD JOB TESTS
  // ============================================

  describe('addJob', () => {
    const testJobData = {
      onchainProposalId: '12345',
      daoGovernor: '0x1234567890123456789012345678901234567890',
      chainId: 1,
      proposerAddress: '0x0987654321098765432109876543210987654321',
      title: 'Test Proposal',
      description: 'This is a test proposal description',
    };

    it('should add job to normal queue by default', async () => {
      const job = await service.addJob('proposal-1', testJobData);

      expect(job).toBeDefined();
      expect(job?.id).toBe('proposal-1');
      expect(mockNormalQueue._getJobs().has('proposal-1')).toBe(true);
      expect(mockHighPriorityQueue._getJobs().has('proposal-1')).toBe(false);
    });

    it('should add job to high priority queue when specified', async () => {
      const job = await service.addJob('proposal-2', testJobData, 'high');

      expect(job).toBeDefined();
      expect(job?.id).toBe('proposal-2');
      expect(mockHighPriorityQueue._getJobs().has('proposal-2')).toBe(true);
      expect(mockNormalQueue._getJobs().has('proposal-2')).toBe(false);
    });

    it('should use proposalId as jobId for deduplication', async () => {
      const proposalId = 'unique-proposal-id';
      const job = await service.addJob(proposalId, testJobData);

      expect(job?.id).toBe(proposalId);
    });

    it('should set job status in Redis after adding', async () => {
      await service.addJob('proposal-3', testJobData);

      const status = await service.getJobStatus('proposal-3');
      expect(status).toBe('queued');
    });

    it('should publish queued event to Redis Pub/Sub', async () => {
      await service.addJob('proposal-4', testJobData);

      const events = mockRedisService._getPublishedEvents();
      expect(events.length).toBeGreaterThan(0);
      
      const queuedEvent = events.find(e => 
        e.channel === 'analysis:events:proposal-4'
      );
      expect(queuedEvent).toBeDefined();
      
      const eventData = JSON.parse(queuedEvent!.message);
      expect(eventData.type).toBe('queued');
      expect(eventData.jobId).toBe('proposal-4');
    });

    it('should return existing job instead of creating duplicate', async () => {
      // Add first job
      const job1 = await service.addJob('proposal-5', testJobData);
      
      // Try to add duplicate
      const job2 = await service.addJob('proposal-5', testJobData);

      expect(job1?.id).toBe(job2?.id);
      expect(mockNormalQueue._getJobs().size).toBe(1);
    });
  });

  // ============================================
  // STATUS TESTS
  // ============================================

  describe('Job Status', () => {
    it('should set and get job status', async () => {
      await service.setJobStatus('test-prop', 'processing');
      
      const status = await service.getJobStatus('test-prop');
      expect(status).toBe('processing');
    });

    it('should return null for non-existent status', async () => {
      const status = await service.getJobStatus('non-existent');
      expect(status).toBeNull();
    });
  });

  // ============================================
  // RESULT TESTS
  // ============================================

  describe('Result Management', () => {
    const testResult = {
      jobId: 'result-test',
      status: 'complete' as const,
      compositeScore: 45,
      riskLevel: 'MEDIUM' as const,
      recommendation: 'REVIEW' as const,
      completedAt: new Date().toISOString(),
    };

    it('should set and get analysis result', async () => {
      await service.setResult('result-test', testResult);
      
      const result = await service.getResult('result-test');
      expect(result).toEqual(testResult);
    });

    it('should return null for non-existent result', async () => {
      const result = await service.getResult('non-existent');
      expect(result).toBeNull();
    });
  });

  // ============================================
  // QUEUE HEALTH TESTS
  // ============================================

  describe('Queue Health', () => {
    it('should return queue health metrics', async () => {
      const health = await service.getQueueHealth();

      expect(health).toHaveProperty('highPriority');
      expect(health).toHaveProperty('normal');
      expect(health.highPriority).toHaveProperty('waiting');
      expect(health.highPriority).toHaveProperty('active');
      expect(health.highPriority).toHaveProperty('completed');
      expect(health.highPriority).toHaveProperty('failed');
    });
  });

  // ============================================
  // PUB/SUB TESTS
  // ============================================

  describe('Pub/Sub Events', () => {
    it('should publish event to correct channel', async () => {
      await service.publishEvent('pub-test', {
        type: 'progress',
        stage: 'nlp',
        progress: 50,
      });

      const events = mockRedisService._getPublishedEvents();
      expect(events.length).toBe(1);
      expect(events[0].channel).toBe('analysis:events:pub-test');
      
      const data = JSON.parse(events[0].message);
      expect(data.type).toBe('progress');
      expect(data.stage).toBe('nlp');
    });
  });

  // ============================================
  // GET JOB TESTS
  // ============================================

  describe('getJob', () => {
    const testJobData = {
      onchainProposalId: '99999',
      daoGovernor: '0x1234567890123456789012345678901234567890',
      chainId: 1,
      proposerAddress: '0x0987654321098765432109876543210987654321',
      title: 'Test',
      description: 'Test',
    };

    it('should find job in high priority queue', async () => {
      await service.addJob('high-job', testJobData, 'high');
      
      const job = await service.getJob('high-job');
      expect(job).toBeDefined();
      expect(job?.id).toBe('high-job');
    });

    it('should find job in normal queue', async () => {
      await service.addJob('normal-job', testJobData, 'normal');
      
      const job = await service.getJob('normal-job');
      expect(job).toBeDefined();
      expect(job?.id).toBe('normal-job');
    });

    it('should return null for non-existent job', async () => {
      const job = await service.getJob('non-existent');
      expect(job).toBeNull();
    });
  });
});
