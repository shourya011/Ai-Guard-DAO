/**
 * VotingService Test Suite
 * 
 * Tests for the voting execution logic that casts votes based on AI analysis.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VotingService, VoteSupport, AnalysisResultForVoting } from './voting.service';
import { PrismaService } from './prisma.service';
import { BlockchainService } from './blockchain.service';

describe('VotingService', () => {
  let service: VotingService;
  let prismaService: jest.Mocked<PrismaService>;
  let blockchainService: jest.Mocked<BlockchainService>;
  let mockContract: any;
  let mockSigner: any;

  // Mock transaction receipt
  const mockTxReceipt = {
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  };

  // Mock transaction
  const mockTx = {
    wait: jest.fn().mockResolvedValue(mockTxReceipt),
  };

  beforeEach(async () => {
    // Create mock contract
    mockContract = {
      castVoteWithRisk: jest.fn().mockResolvedValue(mockTx),
      castMultipleVotes: jest.fn().mockResolvedValue(mockTx),
      connect: jest.fn().mockReturnThis(),
    };

    // Create mock signer
    mockSigner = {
      getAddress: jest.fn().mockResolvedValue('0xBackendSigner'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VotingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'blockchain.chainId': 1,
                'blockchain.daoGovernorAddress': '0xDAOGovernor',
                'blockchain.votingAgentAddress': '0xVotingAgent',
              };
              return config[key];
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            delegation: {
              findMany: jest.fn(),
            },
            proposal: {
              findUnique: jest.fn(),
            },
            auditLog: {
              createMany: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: BlockchainService,
          useValue: {
            getVotingAgentContract: jest.fn(),
            getBackendSigner: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VotingService>(VotingService);
    prismaService = module.get(PrismaService);
    blockchainService = module.get(BlockchainService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('processVotesForProposal', () => {
    const mockAnalysisResult: AnalysisResultForVoting = {
      analysisId: 'analysis-123',
      proposalId: 'proposal-uuid-123',
      onchainProposalId: '42',
      daoGovernor: '0xDAOGovernor',
      chainId: 1,
      compositeRiskScore: 25,
      riskLevel: 'LOW',
      recommendation: 'APPROVE',
      reportHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };

    const mockDelegations = [
      {
        id: 'delegation-1',
        delegatorAddress: '0xuser1',
        daoGovernor: '0xdaogovernor',
        chainId: 1,
        riskThreshold: 50,
        requiresApproval: false,
        status: 'ACTIVE',
      },
      {
        id: 'delegation-2',
        delegatorAddress: '0xuser2',
        daoGovernor: '0xdaogovernor',
        chainId: 1,
        riskThreshold: 30,
        requiresApproval: false,
        status: 'ACTIVE',
      },
    ];

    beforeEach(() => {
      // Setup blockchain service mocks
      (blockchainService.getVotingAgentContract as jest.Mock).mockReturnValue(mockContract);
      (blockchainService.getBackendSigner as jest.Mock).mockReturnValue(mockSigner);
      
      // Setup prisma mocks
      (prismaService.proposal.findUnique as jest.Mock).mockResolvedValue({
        id: 'proposal-uuid-123',
      });
      (prismaService.auditLog.createMany as jest.Mock).mockResolvedValue({ count: 2 });
    });

    it('should return early when contract is not ready', async () => {
      (blockchainService.getVotingAgentContract as jest.Mock).mockReturnValue(null);
      
      const result = await service.processVotesForProposal(mockAnalysisResult);
      
      expect(result.totalDelegations).toBe(0);
      expect(result.votesAttempted).toBe(0);
    });

    it('should return early when signer is not ready', async () => {
      (blockchainService.getBackendSigner as jest.Mock).mockReturnValue(null);
      
      const result = await service.processVotesForProposal(mockAnalysisResult);
      
      expect(result.totalDelegations).toBe(0);
      expect(result.votesAttempted).toBe(0);
    });

    it('should return early when no active delegations exist', async () => {
      (prismaService.delegation.findMany as jest.Mock).mockResolvedValue([]);
      
      const result = await service.processVotesForProposal(mockAnalysisResult);
      
      expect(result.totalDelegations).toBe(0);
      expect(result.eligibleDelegations).toBe(0);
      expect(result.votesAttempted).toBe(0);
    });

    it('should filter out delegations requiring approval', async () => {
      const delegationsWithApproval = [
        { ...mockDelegations[0], requiresApproval: true },
        mockDelegations[1],
      ];
      (prismaService.delegation.findMany as jest.Mock).mockResolvedValue(delegationsWithApproval);
      
      const result = await service.processVotesForProposal(mockAnalysisResult);
      
      expect(result.totalDelegations).toBe(2);
      expect(result.eligibleDelegations).toBe(1);
    });

    it('should filter out delegations where risk exceeds threshold', async () => {
      const highRiskAnalysis = {
        ...mockAnalysisResult,
        compositeRiskScore: 40, // Higher than user2's threshold of 30, but lower than user1's 50
      };
      (prismaService.delegation.findMany as jest.Mock).mockResolvedValue(mockDelegations);
      
      const result = await service.processVotesForProposal(highRiskAnalysis);
      
      // Only user1 (threshold 50) can vote, user2 (threshold 30) cannot
      expect(result.totalDelegations).toBe(2);
      expect(result.eligibleDelegations).toBe(1);
    });

    it('should execute single vote when only one eligible delegation', async () => {
      (prismaService.delegation.findMany as jest.Mock).mockResolvedValue([mockDelegations[0]]);
      
      const result = await service.processVotesForProposal(mockAnalysisResult);
      
      expect(result.votesAttempted).toBe(1);
      expect(result.votesSuccessful).toBe(1);
      expect(result.votesFailed).toBe(0);
      expect(mockContract.castVoteWithRisk).toHaveBeenCalled();
      expect(mockContract.castMultipleVotes).not.toHaveBeenCalled();
    });

    it('should execute batch vote when multiple eligible delegations', async () => {
      (prismaService.delegation.findMany as jest.Mock).mockResolvedValue(mockDelegations);
      
      const result = await service.processVotesForProposal(mockAnalysisResult);
      
      expect(result.votesAttempted).toBe(2);
      expect(result.votesSuccessful).toBe(2);
      expect(result.batchTxHash).toBe(mockTxReceipt.hash);
      expect(mockContract.castMultipleVotes).toHaveBeenCalled();
    });

    it('should fallback to individual votes when batch fails', async () => {
      mockContract.castMultipleVotes.mockRejectedValue(new Error('Batch failed'));
      (prismaService.delegation.findMany as jest.Mock).mockResolvedValue(mockDelegations);
      
      const result = await service.processVotesForProposal(mockAnalysisResult);
      
      expect(result.votesAttempted).toBe(2);
      expect(result.votesSuccessful).toBe(2);
      expect(result.batchTxHash).toBeUndefined();
      expect(mockContract.castVoteWithRisk).toHaveBeenCalledTimes(2);
    });

    it('should record votes in audit log', async () => {
      (prismaService.delegation.findMany as jest.Mock).mockResolvedValue([mockDelegations[0]]);
      
      await service.processVotesForProposal(mockAnalysisResult);
      
      expect(prismaService.auditLog.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            action: 'VOTE_CAST_AUTO',
            voteType: 'FOR',
            wasAutoVote: true,
          }),
        ]),
      });
    });
  });

  describe('Vote Support Determination', () => {
    // Access private method via prototype for testing
    const determineVoteSupport = (recommendation: string, riskScore: number) => {
      return (service as any).determineVoteSupport(recommendation, riskScore);
    };

    it('should return FOR for APPROVE recommendation', () => {
      expect(determineVoteSupport('APPROVE', 25)).toBe(VoteSupport.FOR);
    });

    it('should return AGAINST for REJECT recommendation', () => {
      expect(determineVoteSupport('REJECT', 80)).toBe(VoteSupport.AGAINST);
    });

    it('should return FOR for REVIEW with low risk', () => {
      expect(determineVoteSupport('REVIEW', 30)).toBe(VoteSupport.FOR);
    });

    it('should return ABSTAIN for REVIEW with high risk', () => {
      expect(determineVoteSupport('REVIEW', 60)).toBe(VoteSupport.ABSTAIN);
    });
  });

  describe('Error Handling', () => {
    const parseVoteError = (error: any) => {
      return (service as any).parseVoteError(error);
    };

    it('should identify AlreadyVoted error', () => {
      const error = new Error('GovernorVotingAlreadyVoted: user already voted');
      const result = parseVoteError(error);
      
      expect(result.code).toBe('ALREADY_VOTED');
    });

    it('should identify NotDelegated error', () => {
      const error = new Error('User not delegated voting power');
      const result = parseVoteError(error);
      
      expect(result.code).toBe('NOT_DELEGATED');
    });

    it('should identify ProposalNotActive error', () => {
      const error = new Error('Proposal is not active');
      const result = parseVoteError(error);
      
      expect(result.code).toBe('PROPOSAL_NOT_ACTIVE');
    });

    it('should handle unknown errors', () => {
      const error = new Error('Something unexpected happened');
      const result = parseVoteError(error);
      
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('getVoteStatsForProposal', () => {
    it('should return correct vote statistics', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        { voteType: 'FOR', wasAutoVote: true },
        { voteType: 'FOR', wasAutoVote: true },
        { voteType: 'AGAINST', wasAutoVote: true },
        { voteType: 'ABSTAIN', wasAutoVote: true },
      ]);

      const stats = await service.getVoteStatsForProposal('proposal-123');

      expect(stats.totalVotes).toBe(4);
      expect(stats.autoVotes).toBe(4);
      expect(stats.forVotes).toBe(2);
      expect(stats.againstVotes).toBe(1);
      expect(stats.abstainVotes).toBe(1);
    });
  });

  describe('hasUserVoted', () => {
    it('should return true when user has voted', async () => {
      (prismaService.auditLog.findFirst as jest.Mock).mockResolvedValue({
        id: 'audit-log-1',
      });

      const result = await service.hasUserVoted('0xUser1', 'proposal-123');

      expect(result).toBe(true);
    });

    it('should return false when user has not voted', async () => {
      (prismaService.auditLog.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.hasUserVoted('0xUser1', 'proposal-123');

      expect(result).toBe(false);
    });
  });
});
