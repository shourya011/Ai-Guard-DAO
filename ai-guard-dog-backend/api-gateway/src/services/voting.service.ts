/**
 * Voting Service
 * 
 * Handles execution of AI-guided votes on behalf of delegating users.
 * Works with VotingAgent smart contract to cast votes based on AI analysis results.
 * 
 * Core Responsibilities:
 * 1. Fetch ACTIVE delegations for a DAO
 * 2. Filter by risk threshold (riskScore <= threshold → safe to vote FOR)
 * 3. Execute votes via VotingAgent.castVoteWithRisk() or batch via castMultipleVotes()
 * 4. Handle errors (AlreadyVoted, tx failures) gracefully
 * 5. Record votes in AuditLog for transparency
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { BlockchainService } from './blockchain.service';
import { Contract, Signer, keccak256, toUtf8Bytes } from 'ethers';
import { AppConfig } from '../config/app.config';

// Vote support values matching OpenZeppelin Governor standard
export enum VoteSupport {
  AGAINST = 0,
  FOR = 1,
  ABSTAIN = 2,
}

// Result of a single vote attempt
export interface VoteAttemptResult {
  delegatorAddress: string;
  success: boolean;
  txHash?: string;
  errorCode?: string;
  errorMessage?: string;
}

// Result of processing votes for a proposal
export interface ProcessVotesResult {
  proposalId: string;
  onchainProposalId: string;
  daoGovernor: string;
  riskScore: number;
  totalDelegations: number;
  eligibleDelegations: number;
  votesAttempted: number;
  votesSuccessful: number;
  votesFailed: number;
  results: VoteAttemptResult[];
  batchTxHash?: string;
}

// Analysis result structure (subset of what AI returns)
export interface AnalysisResultForVoting {
  analysisId: string;
  proposalId: string;
  onchainProposalId: string;
  daoGovernor: string;
  chainId: number;
  compositeRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  reportHash?: string;
}

@Injectable()
export class VotingService implements OnModuleInit {
  private readonly logger = new Logger(VotingService.name);
  private contract: Contract | null = null;
  private signer: Signer | null = null;

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly prismaService: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('VotingService initialized');
  }

  /**
   * Initialize voting contract with signer for write operations.
   * This is called lazily when needed, not at startup.
   */
  private async ensureContractReady(): Promise<boolean> {
    if (this.contract && this.signer) {
      return true;
    }

    const votingAgentContract = this.blockchainService.getVotingAgentContract();
    const backendSigner = this.blockchainService.getBackendSigner();

    if (!votingAgentContract) {
      this.logger.warn('VotingAgent contract not initialized - vote execution disabled');
      return false;
    }

    if (!backendSigner) {
      this.logger.warn('Backend signer not initialized - vote execution disabled');
      return false;
    }

    // Connect contract with signer for write operations
    this.signer = backendSigner;
    this.contract = votingAgentContract.connect(backendSigner) as Contract;

    this.logger.log('VotingService contract connected with signer');
    return true;
  }

  /**
   * Process votes for a proposal based on AI analysis results.
   * 
   * Flow:
   * 1. Fetch all ACTIVE delegations for the DAO
   * 2. Filter delegations where riskScore <= user's riskThreshold
   * 3. For eligible delegations, cast votes (FOR if low risk, AGAINST if high risk)
   * 4. Record all votes in AuditLog
   * 
   * @param analysisResult - The completed AI analysis result
   * @returns ProcessVotesResult with details of all vote attempts
   */
  async processVotesForProposal(
    analysisResult: AnalysisResultForVoting,
  ): Promise<ProcessVotesResult> {
    const {
      analysisId,
      proposalId,
      onchainProposalId,
      daoGovernor,
      chainId,
      compositeRiskScore,
      recommendation,
      reportHash,
    } = analysisResult;

    this.logger.log(`🗳️ Processing votes for proposal ${onchainProposalId}`);
    this.logger.log(`   Risk Score: ${compositeRiskScore}, Recommendation: ${recommendation}`);

    const result: ProcessVotesResult = {
      proposalId,
      onchainProposalId,
      daoGovernor,
      riskScore: compositeRiskScore,
      totalDelegations: 0,
      eligibleDelegations: 0,
      votesAttempted: 0,
      votesSuccessful: 0,
      votesFailed: 0,
      results: [],
    };

    // Check if contract is ready
    const ready = await this.ensureContractReady();
    if (!ready) {
      this.logger.warn('Contract not ready - skipping vote execution');
      return result;
    }

    // Fetch all ACTIVE delegations for this DAO + chainId
    const delegations = await this.prismaService.delegation.findMany({
      where: {
        daoGovernor: daoGovernor.toLowerCase(),
        chainId,
        status: 'ACTIVE',
      },
    });

    result.totalDelegations = delegations.length;
    this.logger.log(`   Found ${delegations.length} active delegations`);

    if (delegations.length === 0) {
      this.logger.log('   No active delegations - nothing to process');
      return result;
    }

    // Filter delegations eligible for auto-voting
    // User's threshold >= proposal's risk score means they're OK with voting
    const eligibleDelegations = delegations.filter(d => {
      // If user requires approval, skip auto-voting
      if (d.requiresApproval) {
        this.logger.debug(`   ${d.delegatorAddress}: Requires approval - skipping`);
        return false;
      }
      
      // If risk score exceeds user's threshold, skip (too risky for them)
      if (compositeRiskScore > d.riskThreshold) {
        this.logger.debug(
          `   ${d.delegatorAddress}: Risk ${compositeRiskScore} > threshold ${d.riskThreshold} - skipping`
        );
        return false;
      }
      
      return true;
    });

    result.eligibleDelegations = eligibleDelegations.length;
    this.logger.log(`   ${eligibleDelegations.length} delegations eligible for auto-voting`);

    if (eligibleDelegations.length === 0) {
      this.logger.log('   No eligible delegations - nothing to process');
      return result;
    }

    // Determine vote direction based on recommendation
    const voteSupport = this.determineVoteSupport(recommendation, compositeRiskScore);
    this.logger.log(`   Vote direction: ${VoteSupport[voteSupport]} (${voteSupport})`);

    // Generate report hash if not provided
    const riskReportHash = reportHash 
      ? reportHash 
      : keccak256(toUtf8Bytes(`analysis-${analysisId}-${Date.now()}`));

    // Use batch voting if multiple delegations, otherwise single vote
    if (eligibleDelegations.length > 1) {
      result.batchTxHash = await this.executeBatchVotes(
        daoGovernor,
        onchainProposalId,
        eligibleDelegations.map(d => d.delegatorAddress),
        voteSupport,
        compositeRiskScore,
        riskReportHash,
        result,
      );
    } else {
      // Single vote
      const delegation = eligibleDelegations[0];
      const voteResult = await this.executeSingleVote(
        daoGovernor,
        onchainProposalId,
        delegation.delegatorAddress,
        voteSupport,
        compositeRiskScore,
        riskReportHash,
      );
      result.results.push(voteResult);
      result.votesAttempted = 1;
      result.votesSuccessful = voteResult.success ? 1 : 0;
      result.votesFailed = voteResult.success ? 0 : 1;
    }

    // Record votes in audit log
    await this.recordVotesInAuditLog(
      result,
      analysisId,
      voteSupport,
      compositeRiskScore,
    );

    this.logger.log(`✅ Vote processing complete:`);
    this.logger.log(`   Attempted: ${result.votesAttempted}`);
    this.logger.log(`   Successful: ${result.votesSuccessful}`);
    this.logger.log(`   Failed: ${result.votesFailed}`);

    return result;
  }

  /**
   * Determine vote support based on recommendation and risk score.
   */
  private determineVoteSupport(
    recommendation: string,
    riskScore: number,
  ): VoteSupport {
    // Clear recommendations map directly to vote type
    if (recommendation === 'APPROVE') {
      return VoteSupport.FOR;
    }
    if (recommendation === 'REJECT') {
      return VoteSupport.AGAINST;
    }
    
    // For 'REVIEW' recommendations, use risk score to decide
    // Low risk (< 50) → vote FOR, High risk (>= 50) → ABSTAIN
    if (riskScore < 50) {
      return VoteSupport.FOR;
    }
    
    // For medium-high risk with REVIEW, abstain is safest
    return VoteSupport.ABSTAIN;
  }

  /**
   * Execute a single vote via VotingAgent contract.
   */
  private async executeSingleVote(
    daoGovernor: string,
    proposalId: string,
    userAddress: string,
    support: VoteSupport,
    riskScore: number,
    reportHash: string,
  ): Promise<VoteAttemptResult> {
    this.logger.debug(`   Casting vote for ${userAddress}...`);

    try {
      // Convert risk score to uint256 (scale to basis points if needed)
      const riskScoreBigInt = BigInt(Math.round(riskScore * 100)); // e.g., 75.5 → 7550

      const tx = await this.contract!.castVoteWithRisk(
        daoGovernor,
        BigInt(proposalId),
        userAddress,
        support,
        riskScoreBigInt,
        reportHash,
      );

      const receipt = await tx.wait();

      return {
        delegatorAddress: userAddress,
        success: true,
        txHash: receipt.hash,
      };
    } catch (error: any) {
      const errorResult = this.parseVoteError(error);
      return {
        delegatorAddress: userAddress,
        success: false,
        errorCode: errorResult.code,
        errorMessage: errorResult.message,
      };
    }
  }

  /**
   * Execute batch votes via VotingAgent.castMultipleVotes().
   * More gas efficient for multiple delegations.
   */
  private async executeBatchVotes(
    daoGovernor: string,
    proposalId: string,
    userAddresses: string[],
    support: VoteSupport,
    riskScore: number,
    reportHash: string,
    result: ProcessVotesResult,
  ): Promise<string | undefined> {
    this.logger.log(`   Executing batch vote for ${userAddresses.length} users...`);

    try {
      const riskScoreBigInt = BigInt(Math.round(riskScore * 100));

      // Prepare arrays for batch call
      const proposalIds = userAddresses.map(() => BigInt(proposalId));
      const supports = userAddresses.map(() => support);
      const riskScores = userAddresses.map(() => riskScoreBigInt);
      const reportHashes = userAddresses.map(() => reportHash);

      const tx = await this.contract!.castMultipleVotes(
        daoGovernor,
        proposalIds,
        userAddresses,
        supports,
        riskScores,
        reportHashes,
      );

      const receipt = await tx.wait();

      // Mark all as successful
      result.votesAttempted = userAddresses.length;
      result.votesSuccessful = userAddresses.length;
      result.votesFailed = 0;

      for (const addr of userAddresses) {
        result.results.push({
          delegatorAddress: addr,
          success: true,
          txHash: receipt.hash,
        });
      }

      return receipt.hash;
    } catch (error: any) {
      this.logger.error('Batch vote failed, falling back to individual votes');
      
      // Fallback to individual votes
      for (const userAddress of userAddresses) {
        const voteResult = await this.executeSingleVote(
          daoGovernor,
          proposalId,
          userAddress,
          support,
          riskScore,
          reportHash,
        );
        result.results.push(voteResult);
        result.votesAttempted++;
        if (voteResult.success) {
          result.votesSuccessful++;
        } else {
          result.votesFailed++;
        }
      }

      return undefined;
    }
  }

  /**
   * Parse common vote errors into user-friendly messages.
   */
  private parseVoteError(error: any): { code: string; message: string } {
    const errorMessage = error.message || error.toString();

    // Check for common revert reasons
    if (errorMessage.includes('AlreadyVoted') || errorMessage.includes('already voted')) {
      return { code: 'ALREADY_VOTED', message: 'User has already voted on this proposal' };
    }
    if (errorMessage.includes('NotDelegated') || errorMessage.includes('not delegated')) {
      return { code: 'NOT_DELEGATED', message: 'User has not delegated voting power' };
    }
    if (errorMessage.includes('InsufficientVotingPower') || errorMessage.includes('insufficient')) {
      return { code: 'INSUFFICIENT_POWER', message: 'User has insufficient voting power' };
    }
    if (errorMessage.includes('ProposalNotActive') || errorMessage.includes('not active')) {
      return { code: 'PROPOSAL_NOT_ACTIVE', message: 'Proposal is not in active voting period' };
    }
    if (errorMessage.includes('RiskExceedsThreshold') || errorMessage.includes('risk exceeds')) {
      return { code: 'RISK_EXCEEDS_THRESHOLD', message: 'Risk score exceeds user threshold' };
    }
    if (errorMessage.includes('nonce') || errorMessage.includes('Nonce')) {
      return { code: 'NONCE_ERROR', message: 'Transaction nonce error - retry needed' };
    }
    if (errorMessage.includes('gas') || errorMessage.includes('Gas')) {
      return { code: 'GAS_ERROR', message: 'Insufficient gas or gas estimation failed' };
    }

    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: errorMessage.substring(0, 200),
    };
  }

  /**
   * Record vote results in the audit log for transparency.
   */
  private async recordVotesInAuditLog(
    result: ProcessVotesResult,
    analysisId: string,
    voteSupport: VoteSupport,
    riskScore: number,
  ): Promise<void> {
    // Find proposal in database
    const proposal = await this.prismaService.proposal.findUnique({
      where: { id: result.proposalId },
    });

    // Map VoteSupport to VoteType enum
    const voteType = voteSupport === VoteSupport.FOR 
      ? 'FOR' 
      : voteSupport === VoteSupport.AGAINST 
        ? 'AGAINST' 
        : 'ABSTAIN';

    // Create audit log entries for each vote attempt
    const auditLogEntries = result.results.map(voteResult => ({
      action: 'VOTE_CAST_AUTO' as const,
      proposalId: proposal?.id || null,
      daoGovernor: result.daoGovernor,
      voteType: voteType as 'FOR' | 'AGAINST' | 'ABSTAIN',
      riskScore: Math.round(riskScore),
      wasAutoVote: true,
      txHash: voteResult.txHash || null,
      metadata: {
        analysisId,
        onchainProposalId: result.onchainProposalId,
        delegatorAddress: voteResult.delegatorAddress,
        success: voteResult.success,
        errorCode: voteResult.errorCode,
        errorMessage: voteResult.errorMessage,
        batchTxHash: result.batchTxHash,
      },
      description: voteResult.success
        ? `Auto-voted ${voteType} on proposal ${result.onchainProposalId} for ${voteResult.delegatorAddress}`
        : `Failed to vote on proposal ${result.onchainProposalId} for ${voteResult.delegatorAddress}: ${voteResult.errorCode}`,
    }));

    // Batch insert audit logs
    if (auditLogEntries.length > 0) {
      await this.prismaService.auditLog.createMany({
        data: auditLogEntries,
      });
      this.logger.debug(`   Recorded ${auditLogEntries.length} audit log entries`);
    }
  }

  /**
   * Get vote statistics for a proposal.
   */
  async getVoteStatsForProposal(proposalId: string): Promise<{
    totalVotes: number;
    autoVotes: number;
    forVotes: number;
    againstVotes: number;
    abstainVotes: number;
  }> {
    const auditLogs = await this.prismaService.auditLog.findMany({
      where: {
        proposalId,
        action: 'VOTE_CAST_AUTO',
      },
    });

    return {
      totalVotes: auditLogs.length,
      autoVotes: auditLogs.filter(l => l.wasAutoVote).length,
      forVotes: auditLogs.filter(l => l.voteType === 'FOR').length,
      againstVotes: auditLogs.filter(l => l.voteType === 'AGAINST').length,
      abstainVotes: auditLogs.filter(l => l.voteType === 'ABSTAIN').length,
    };
  }

  /**
   * Check if a specific user has already voted on a proposal (via our system).
   */
  async hasUserVoted(
    delegatorAddress: string,
    proposalId: string,
  ): Promise<boolean> {
    const existingVote = await this.prismaService.auditLog.findFirst({
      where: {
        proposalId,
        action: 'VOTE_CAST_AUTO',
        metadata: {
          path: ['delegatorAddress'],
          equals: delegatorAddress.toLowerCase(),
        },
      },
    });

    return existingVote !== null;
  }
}
