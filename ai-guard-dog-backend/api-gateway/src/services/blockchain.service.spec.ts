/**
 * AI Guard DAO - BlockchainService Unit Tests
 * 
 * Tests for the resilient proposal scanner:
 * - Provider initialization
 * - Historical sync logic
 * - Event handling
 * - Reconnection behavior
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlockchainService, ScannerRedisKeys, ProposalCreatedEvent } from './blockchain.service';
import { RedisService, RedisKeys } from './redis.service';
import { PrismaService } from './prisma.service';
import { AnalysisProducerService } from '../modules/queue/analysis-producer.service';
import configuration from '../config/app.config';

// ============================================
// MOCK REDIS SERVICE
// ============================================

class MockRedisService {
  private store = new Map<string, string>();
  private locks = new Set<string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async acquireLock(resource: string, ttl: number): Promise<boolean> {
    const key = RedisKeys.lock(resource);
    if (this.locks.has(key)) {
      return false;
    }
    this.locks.add(key);
    return true;
  }

  async releaseLock(resource: string): Promise<void> {
    const key = RedisKeys.lock(resource);
    this.locks.delete(key);
  }

  // Helper for tests
  _setStore(key: string, value: string): void {
    this.store.set(key, value);
  }

  _getStore(): Map<string, string> {
    return this.store;
  }

  _clear(): void {
    this.store.clear();
    this.locks.clear();
  }
}

// ============================================
// MOCK PRISMA SERVICE
// ============================================

class MockPrismaService {
  private proposals = new Map<string, any>();

  proposal = {
    upsert: async ({ where, create, update }: any) => {
      const key = `${create.onchainProposalId}-${create.daoGovernor}-${create.chainId}`;
      const existing = this.proposals.get(key);
      
      if (existing) {
        const updated = { ...existing, ...update };
        this.proposals.set(key, updated);
        return updated;
      }
      
      const proposal = { id: `uuid-${Date.now()}`, ...create };
      this.proposals.set(key, proposal);
      return proposal;
    },

    findUnique: async ({ where }: any) => {
      const key = `${where.onchainProposalId_daoGovernor_chainId.onchainProposalId}-${where.onchainProposalId_daoGovernor_chainId.daoGovernor}-${where.onchainProposalId_daoGovernor_chainId.chainId}`;
      return this.proposals.get(key) || null;
    },
  };

  // Helper for tests
  _getProposals(): Map<string, any> {
    return this.proposals;
  }

  _clear(): void {
    this.proposals.clear();
  }
}

// ============================================
// MOCK ANALYSIS PRODUCER SERVICE
// ============================================

class MockAnalysisProducerService {
  private jobs = new Map<string, any>();

  async addJob(
    proposalId: string,
    data: any,
    priority: 'high' | 'normal' = 'normal',
  ): Promise<{ id: string; data: any } | null> {
    const job = { id: proposalId, data: { proposalId, ...data, priority } };
    this.jobs.set(proposalId, job);
    return job;
  }

  async getJobStatus(proposalId: string): Promise<string | null> {
    return this.jobs.has(proposalId) ? 'queued' : null;
  }

  async getJob(proposalId: string): Promise<any | null> {
    return this.jobs.get(proposalId) || null;
  }

  // Helper for tests
  _getJobs(): Map<string, any> {
    return this.jobs;
  }

  _clear(): void {
    this.jobs.clear();
  }
}

// ============================================
// TEST SUITE
// ============================================

describe('BlockchainService', () => {
  let service: BlockchainService;
  let mockRedisService: MockRedisService;
  let mockPrismaService: MockPrismaService;
  let mockAnalysisProducerService: MockAnalysisProducerService;
  let configService: ConfigService;

  beforeEach(async () => {
    mockRedisService = new MockRedisService();
    mockPrismaService = new MockPrismaService();
    mockAnalysisProducerService = new MockAnalysisProducerService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
      ],
      providers: [
        BlockchainService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AnalysisProducerService,
          useValue: mockAnalysisProducerService,
        },
      ],
    }).compile();

    service = moduleFixture.get<BlockchainService>(BlockchainService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    // Don't call onModuleDestroy here as we didn't fully initialize
    mockRedisService._clear();
    mockPrismaService._clear();
    mockAnalysisProducerService._clear();
  });

  // ============================================
  // INITIALIZATION TESTS
  // ============================================

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have stopped status before init', () => {
      expect(service.getStatus()).toBe('stopped');
    });

    it('should warn when DAO_GOVERNOR_ADDRESS is not set', async () => {
      // Override config to have empty address
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'blockchain') {
          return { daoGovernorAddress: '' };
        }
        return undefined;
      });

      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');
      
      await service.onModuleInit();
      
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('DAO_GOVERNOR_ADDRESS not configured')
      );
    });
  });

  // ============================================
  // REDIS KEY TESTS
  // ============================================

  describe('Redis Keys', () => {
    it('should generate correct last_block key', () => {
      expect(ScannerRedisKeys.lastBlock).toBe('scanner:last_block');
    });

    it('should generate correct status key', () => {
      expect(ScannerRedisKeys.status).toBe('scanner:status');
    });

    it('should generate correct lock key', () => {
      expect(ScannerRedisKeys.lock('12345')).toBe('scanner:lock:12345');
    });
  });

  // ============================================
  // BLOCK TRACKING TESTS
  // ============================================

  describe('Block Tracking', () => {
    it('should return null when no last processed block exists', async () => {
      const lastBlock = await service.getLastProcessedBlock();
      expect(lastBlock).toBeNull();
    });

    it('should return last processed block from Redis', async () => {
      mockRedisService._setStore(ScannerRedisKeys.lastBlock, '12345');
      
      const lastBlock = await service.getLastProcessedBlock();
      expect(lastBlock).toBe(12345);
    });
  });

  // ============================================
  // STATUS TESTS
  // ============================================

  describe('Status Management', () => {
    it('should update status in Redis', async () => {
      // Access private method for testing
      await (service as any).updateStatusInRedis('syncing_historical');
      
      const status = await mockRedisService.get(ScannerRedisKeys.status);
      expect(status).toBe('syncing_historical');
    });

    it('should track status changes', async () => {
      expect(service.getStatus()).toBe('stopped');
      
      // Simulate status change
      (service as any).status = 'starting';
      expect(service.getStatus()).toBe('starting');
      
      (service as any).status = 'live';
      expect(service.getStatus()).toBe('live');
    });
  });

  // ============================================
  // HELPER METHOD TESTS
  // ============================================

  describe('Helper Methods', () => {
    it('should extract title from markdown header', () => {
      const description = '# My Proposal Title\n\nSome description here';
      const title = (service as any).extractTitle(description);
      expect(title).toBe('My Proposal Title');
    });

    it('should extract title from first line without header', () => {
      const description = 'Simple First Line\n\nMore content';
      const title = (service as any).extractTitle(description);
      expect(title).toBe('Simple First Line');
    });

    it('should truncate long titles', () => {
      const longTitle = 'A'.repeat(600);
      const description = longTitle + '\n\nMore content';
      const title = (service as any).extractTitle(description);
      expect(title.length).toBeLessThanOrEqual(503); // 500 + "..."
      expect(title.endsWith('...')).toBe(true);
    });

    it('should handle empty description', () => {
      const title = (service as any).extractTitle('');
      expect(title).toBe('Untitled Proposal');
    });

    it('should mask URLs with API keys', () => {
      const url = 'https://eth-mainnet.g.alchemy.com/v2/abc123def456789012345678901234567890';
      const masked = (service as any).maskUrl(url);
      expect(masked).not.toContain('abc123def456789012345678901234567890');
      expect(masked).toContain('****');
    });
  });

  // ============================================
  // PROPOSAL PROCESSING TESTS
  // ============================================

  describe('Proposal Processing', () => {
    it('should acquire lock before processing', async () => {
      const lockSpy = jest.spyOn(mockRedisService, 'acquireLock');
      
      // Create mock event
      const mockEvent = {
        args: [
          BigInt(123), // proposalId
          '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD5E', // proposer
          [], // targets
          [], // values
          [], // signatures
          [], // calldatas
          BigInt(100), // startBlock
          BigInt(200), // endBlock
          '# Test Proposal\n\nDescription', // description
        ],
        blockNumber: 50,
        transactionHash: '0xabc123',
      };

      // Mock config
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'blockchain') {
          return {
            daoGovernorAddress: '0xDAO',
            chainId: 1,
          };
        }
        return undefined;
      });

      await (service as any).handleProposalCreatedEvent(mockEvent);

      expect(lockSpy).toHaveBeenCalledWith(
        ScannerRedisKeys.lock('123'),
        30
      );
    });

    it('should skip processing if lock cannot be acquired', async () => {
      const proposalId = '999';
      
      // Pre-acquire the lock
      await mockRedisService.acquireLock(ScannerRedisKeys.lock(proposalId), 30);
      
      const upsertSpy = jest.spyOn(mockPrismaService.proposal, 'upsert');
      
      const mockEvent = {
        args: [
          BigInt(proposalId),
          '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD5E',
          [], [], [], [],
          BigInt(100), BigInt(200),
          'Test',
        ],
        blockNumber: 50,
        transactionHash: '0xabc',
      };

      await (service as any).handleProposalCreatedEvent(mockEvent);

      // upsert should not be called because lock wasn't acquired
      expect(upsertSpy).not.toHaveBeenCalled();
    });

    it('should upsert proposal to database', async () => {
      const upsertSpy = jest.spyOn(mockPrismaService.proposal, 'upsert');
      
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'blockchain') {
          return {
            daoGovernorAddress: '0xDAOGovernor',
            chainId: 31337,
          };
        }
        return undefined;
      });

      const mockEvent = {
        args: [
          BigInt(456),
          '0xProposer123',
          ['0xTarget1'],
          [BigInt(1000)],
          ['transfer(address,uint256)'],
          ['0xCalldata'],
          BigInt(1000),
          BigInt(2000),
          '# Budget Proposal\n\nTransfer 1000 tokens',
        ],
        blockNumber: 500,
        transactionHash: '0xTxHash123',
      };

      await (service as any).handleProposalCreatedEvent(mockEvent);

      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            onchainProposalId_daoGovernor_chainId: {
              onchainProposalId: '456',
              daoGovernor: '0xDAOGovernor',
              chainId: 31337,
            },
          },
          create: expect.objectContaining({
            onchainProposalId: '456',
            proposerAddress: '0xProposer123',
            title: 'Budget Proposal',
            status: 'PENDING_ANALYSIS',
          }),
        })
      );
    });

    it('should update last processed block after handling event', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'blockchain') {
          return { daoGovernorAddress: '0xDAO', chainId: 1 };
        }
        return undefined;
      });

      const mockEvent = {
        args: [
          BigInt(789),
          '0xProposer',
          [], [], [], [],
          BigInt(100), BigInt(200),
          'Test',
        ],
        blockNumber: 12345,
        transactionHash: '0xTx',
      };

      await (service as any).handleProposalCreatedEvent(mockEvent);

      const lastBlock = await mockRedisService.get(ScannerRedisKeys.lastBlock);
      expect(lastBlock).toBe('12345');
    });
  });
});
