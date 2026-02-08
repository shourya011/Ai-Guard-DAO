/**
 * AnalysisResultListener Test Suite
 * 
 * Tests for the analysis completion listener that triggers voting.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisResultListener, AnalysisEvent } from './analysis-result-listener.service';
import { PrismaService } from '../../services/prisma.service';
import { RedisService } from '../../services/redis.service';
import { VotingService } from '../../services/voting.service';

describe('AnalysisResultListener', () => {
  let service: AnalysisResultListener;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;
  let votingService: jest.Mocked<VotingService>;
  let mockSubscriber: any;

  beforeEach(async () => {
    // Create mock Redis subscriber
    mockSubscriber = {
      psubscribe: jest.fn().mockResolvedValue(1),
      punsubscribe: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
      on: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisResultListener,
        {
          provide: PrismaService,
          useValue: {
            proposal: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            createSubscriber: jest.fn().mockReturnValue(mockSubscriber),
          },
        },
        {
          provide: VotingService,
          useValue: {
            processVotesForProposal: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalysisResultListener>(AnalysisResultListener);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    votingService = module.get(VotingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should subscribe to Redis pattern on init', async () => {
      await service.onModuleInit();
      
      expect(redisService.createSubscriber).toHaveBeenCalled();
      expect(mockSubscriber.psubscribe).toHaveBeenCalledWith('analysis:events:*');
    });

    it('should set up message handler', async () => {
      await service.onModuleInit();
      
      expect(mockSubscriber.on).toHaveBeenCalledWith('pmessage', expect.any(Function));
    });
  });

  describe('isListening', () => {
    it('should return false before initialization', () => {
      expect(service.isListening()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await service.onModuleInit();
      expect(service.isListening()).toBe(true);
    });
  });

  describe('Message Handling', () => {
    // Get the message handler registered on init
    const getMessageHandler = async () => {
      await service.onModuleInit();
      const calls = mockSubscriber.on.mock.calls;
      const pmessageCall = calls.find((call: any[]) => call[0] === 'pmessage');
      return pmessageCall?.[1];
    };

    it('should ignore non-complete events', async () => {
      const handler = await getMessageHandler();
      
      const progressEvent: AnalysisEvent = {
        type: 'progress',
        jobId: 'proposal-123',
        stage: 'nlp',
        progress: 50,
        timestamp: new Date().toISOString(),
      };
      
      await handler('analysis:events:*', 'analysis:events:proposal-123', JSON.stringify(progressEvent));
      
      expect(votingService.processVotesForProposal).not.toHaveBeenCalled();
    });

    it('should process complete events', async () => {
      const handler = await getMessageHandler();
      
      const mockProposal = {
        id: 'proposal-uuid-123',
        onchainProposalId: '42',
        daoGovernor: '0xDAO',
        chainId: 1,
        analyses: [],
      };
      
      (prismaService.proposal.findUnique as jest.Mock).mockResolvedValue(mockProposal);
      (votingService.processVotesForProposal as jest.Mock).mockResolvedValue({
        totalDelegations: 1,
        eligibleDelegations: 1,
        votesAttempted: 1,
        votesSuccessful: 1,
        results: [],
      });
      
      const completeEvent: AnalysisEvent = {
        type: 'complete',
        jobId: 'proposal-uuid-123',
        result: {
          compositeScore: 35,
          riskLevel: 'MEDIUM',
          recommendation: 'APPROVE',
        },
        processingTimeMs: 1500,
        timestamp: new Date().toISOString(),
      };
      
      await handler('analysis:events:*', 'analysis:events:proposal-uuid-123', JSON.stringify(completeEvent));
      
      expect(prismaService.proposal.findUnique).toHaveBeenCalledWith({
        where: { id: 'proposal-uuid-123' },
        include: expect.any(Object),
      });
      
      expect(votingService.processVotesForProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          proposalId: 'proposal-uuid-123',
          compositeRiskScore: 35,
          riskLevel: 'MEDIUM',
          recommendation: 'APPROVE',
        }),
      );
    });

    it('should update proposal status based on recommendation', async () => {
      const handler = await getMessageHandler();
      
      const mockProposal = {
        id: 'proposal-uuid-123',
        onchainProposalId: '42',
        daoGovernor: '0xDAO',
        chainId: 1,
        analyses: [],
      };
      
      (prismaService.proposal.findUnique as jest.Mock).mockResolvedValue(mockProposal);
      (votingService.processVotesForProposal as jest.Mock).mockResolvedValue({
        totalDelegations: 0,
        eligibleDelegations: 0,
        votesAttempted: 0,
        votesSuccessful: 0,
        results: [],
      });
      
      const completeEvent: AnalysisEvent = {
        type: 'complete',
        jobId: 'proposal-uuid-123',
        result: {
          compositeScore: 80,
          riskLevel: 'HIGH',
          recommendation: 'REJECT',
        },
        timestamp: new Date().toISOString(),
      };
      
      await handler('analysis:events:*', 'analysis:events:proposal-uuid-123', JSON.stringify(completeEvent));
      
      expect(prismaService.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-uuid-123' },
        data: expect.objectContaining({
          status: 'AUTO_REJECTED',
          compositeRiskScore: 80,
          riskLevel: 'HIGH',
        }),
      });
    });

    it('should handle failed events', async () => {
      const handler = await getMessageHandler();
      
      const failedEvent: AnalysisEvent = {
        type: 'failed',
        jobId: 'proposal-uuid-123',
        error: 'Worker crashed',
        timestamp: new Date().toISOString(),
      };
      
      await handler('analysis:events:*', 'analysis:events:proposal-uuid-123', JSON.stringify(failedEvent));
      
      expect(prismaService.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-uuid-123' },
        data: { status: 'PENDING_ANALYSIS' },
      });
      
      expect(votingService.processVotesForProposal).not.toHaveBeenCalled();
    });

    it('should handle missing proposal gracefully', async () => {
      const handler = await getMessageHandler();
      
      (prismaService.proposal.findUnique as jest.Mock).mockResolvedValue(null);
      
      const completeEvent: AnalysisEvent = {
        type: 'complete',
        jobId: 'non-existent-proposal',
        result: {
          compositeScore: 35,
          riskLevel: 'LOW',
          recommendation: 'APPROVE',
        },
        timestamp: new Date().toISOString(),
      };
      
      // Should not throw
      await handler('analysis:events:*', 'analysis:events:non-existent-proposal', JSON.stringify(completeEvent));
      
      expect(votingService.processVotesForProposal).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON gracefully', async () => {
      const handler = await getMessageHandler();
      
      // Should not throw
      await handler('analysis:events:*', 'analysis:events:proposal-123', 'invalid json');
      
      expect(votingService.processVotesForProposal).not.toHaveBeenCalled();
    });
  });

  describe('Recommendation to Status Mapping', () => {
    // Access private method via prototype
    const mapRecommendationToStatus = (rec: string) => {
      return (service as any).mapRecommendationToStatus(rec);
    };

    it('should map APPROVE to AUTO_APPROVED', () => {
      expect(mapRecommendationToStatus('APPROVE')).toBe('AUTO_APPROVED');
    });

    it('should map REJECT to AUTO_REJECTED', () => {
      expect(mapRecommendationToStatus('REJECT')).toBe('AUTO_REJECTED');
    });

    it('should map REVIEW to NEEDS_REVIEW', () => {
      expect(mapRecommendationToStatus('REVIEW')).toBe('NEEDS_REVIEW');
    });
  });

  describe('Shutdown', () => {
    it('should unsubscribe and quit on destroy', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();
      
      expect(mockSubscriber.punsubscribe).toHaveBeenCalledWith('analysis:events:*');
      expect(mockSubscriber.quit).toHaveBeenCalled();
    });

    it('should report not listening after destroy', async () => {
      await service.onModuleInit();
      expect(service.isListening()).toBe(true);
      
      await service.onModuleDestroy();
      expect(service.isListening()).toBe(false);
    });
  });
});
