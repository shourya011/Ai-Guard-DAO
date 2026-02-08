/**
 * AI Guard DAO - VotingAgent Contract Types
 * 
 * Strict TypeScript interfaces for interacting with the VotingAgent smart contract.
 * These types are manually defined to provide maximum type safety beyond what TypeChain generates.
 * 
 * @version 1.0.0
 * @author AI Guard DAO Backend Team
 */

import { ethers, type AddressLike, type BigNumberish, type BytesLike } from 'ethers';

// ============================================
// ENUMS & CONSTANTS
// ============================================

/**
 * Vote support values matching Solidity enum
 * - AGAINST (0): Vote against the proposal
 * - FOR (1): Vote in favor of the proposal
 * - ABSTAIN (2): Abstain from voting
 */
export const VoteSupport = {
  AGAINST: 0,
  FOR: 1,
  ABSTAIN: 2,
} as const;

export type VoteSupportValue = (typeof VoteSupport)[keyof typeof VoteSupport];

/**
 * Risk score constants matching contract
 */
export const RiskConstants = {
  MAX_RISK_THRESHOLD: 100,
  MEDIUM_RISK_THRESHOLD: 40,
  MIN_RISK_SCORE: 0,
} as const;

// ============================================
// STRUCT TYPES
// ============================================

/**
 * Delegation struct matching Solidity struct
 * Represents a user's delegation preferences for a specific DAO
 */
export interface Delegation {
  /** Whether the delegation is currently active */
  active: boolean;
  /** Maximum acceptable risk score (0-100) */
  riskThreshold: bigint;
  /** Unix timestamp when delegation was created */
  delegatedAt: bigint;
  /** If true, AI asks before EVERY vote */
  requiresApproval: boolean;
}

/**
 * Audit entry struct for AuditLogger compatibility
 */
export interface AuditEntry {
  user: string;
  daoGovernor: string;
  support: number;
  riskScore: bigint;
  reportHash: string;
  wasAutoVote: boolean;
  timestamp: bigint;
}

// ============================================
// FUNCTION INPUT TYPES
// ============================================

/**
 * Input parameters for delegateVotingPower function
 * @see VotingAgent.sol#delegateVotingPower
 */
export interface DelegateVotingPowerParams {
  /** Address of the DAO's governor contract */
  daoGovernor: AddressLike;
  /** Maximum acceptable risk score (0-100) */
  riskThreshold: BigNumberish;
  /** If true, AI asks before EVERY vote (even low risk) */
  requireApproval: boolean;
}

/**
 * Input parameters for castVoteWithRisk function
 * 
 * THIS IS THE PRIMARY FUNCTION YOUR BACKEND WILL CALL
 * 
 * @see VotingAgent.sol#castVoteWithRisk
 * @see CONTRACT_INTEGRATION.md - Backend Functions section
 */
export interface CastVoteWithRiskParams {
  /** 
   * Address of the DAO's governor contract
   * @example "0x1234567890123456789012345678901234567890"
   */
  daoGovernor: AddressLike;
  
  /**
   * The on-chain proposal ID to vote on
   * @example BigInt(42)
   */
  proposalId: BigNumberish;
  
  /**
   * The user whose voting power to use
   * Must have an active delegation to this DAO
   * @example "0xUserWalletAddress..."
   */
  user: AddressLike;
  
  /**
   * Vote direction: 0=against, 1=for, 2=abstain
   * Use VoteSupport enum for type safety
   * @example VoteSupport.FOR (1)
   */
  support: VoteSupportValue;
  
  /**
   * AI-calculated risk score (0-100)
   * If >= user's threshold, vote will be blocked and HighRiskProposalDetected emitted
   * @example 25 (low risk)
   */
  riskScore: BigNumberish;
  
  /**
   * IPFS/Arweave hash of the full risk report
   * Use ethers.keccak256(ethers.toUtf8Bytes(ipfsHash)) to generate
   * @example "0x1234...abcd" (bytes32)
   */
  riskReportHash: BytesLike;
}

/**
 * Input parameters for castMultipleVotes function (batch voting)
 * @see VotingAgent.sol#castMultipleVotes
 */
export interface CastMultipleVotesParams {
  /** Address of the DAO's governor contract */
  daoGovernor: AddressLike;
  /** Array of proposal IDs to vote on */
  proposalIds: BigNumberish[];
  /** Array of user addresses whose voting power to use */
  users: AddressLike[];
  /** Array of vote directions (0, 1, or 2) */
  supports: VoteSupportValue[];
  /** Array of risk scores (0-100) */
  riskScores: BigNumberish[];
  /** Array of report hashes (bytes32) */
  reportHashes: BytesLike[];
}

/**
 * Input parameters for approveHighRiskVote function
 * @see VotingAgent.sol#approveHighRiskVote
 */
export interface ApproveHighRiskVoteParams {
  /** Address of the DAO's governor contract */
  daoGovernor: AddressLike;
  /** The proposal ID to vote on */
  proposalId: BigNumberish;
  /** Vote direction: 0=against, 1=for, 2=abstain */
  support: VoteSupportValue;
}

/**
 * Input parameters for updateRiskThreshold function
 */
export interface UpdateRiskThresholdParams {
  /** Address of the DAO to update */
  daoGovernor: AddressLike;
  /** New risk threshold (0-100) */
  newThreshold: BigNumberish;
}

// ============================================
// FUNCTION RETURN TYPES
// ============================================

/**
 * Return type for getDelegation function
 */
export interface GetDelegationResult {
  active: boolean;
  riskThreshold: bigint;
  delegatedAt: bigint;
  requiresApproval: boolean;
}

// ============================================
// EVENT TYPES
// ============================================

/**
 * VotingPowerDelegated event args
 */
export interface VotingPowerDelegatedEvent {
  user: string;
  daoGovernor: string;
  riskThreshold: bigint;
}

/**
 * DelegationRevoked event args
 */
export interface DelegationRevokedEvent {
  user: string;
  daoGovernor: string;
}

/**
 * AllDelegationsRevoked event args
 */
export interface AllDelegationsRevokedEvent {
  user: string;
}

/**
 * VoteCastByAI event args
 */
export interface VoteCastByAIEvent {
  proposalId: bigint;
  user: string;
  support: number;
  riskScore: bigint;
}

/**
 * HighRiskProposalDetected event args
 */
export interface HighRiskProposalDetectedEvent {
  proposalId: bigint;
  user: string;
  riskScore: bigint;
}

/**
 * ApprovalRequired event args
 */
export interface ApprovalRequiredEvent {
  proposalId: bigint;
  user: string;
  riskScore: bigint;
}

/**
 * HighRiskVoteApproved event args
 */
export interface HighRiskVoteApprovedEvent {
  user: string;
  proposalId: bigint;
  support: number;
}

// ============================================
// CONTRACT INTERFACE
// ============================================

/**
 * Strict interface for VotingAgent contract interactions
 * 
 * Use with ethers.js Contract class for type-safe interactions:
 * ```typescript
 * const votingAgent = new ethers.Contract(
 *   VOTING_AGENT_ADDRESS,
 *   VotingAgentABI,
 *   signer
 * ) as unknown as IVotingAgentContract;
 * ```
 */
export interface IVotingAgentContract {
  // ============ USER FUNCTIONS ============
  
  /**
   * Delegate voting power to AI Guard Dog for a specific DAO
   * @notice Tokens stay in your wallet - this only grants voting permission
   */
  delegateVotingPower(
    daoGovernor: AddressLike,
    riskThreshold: BigNumberish,
    requireApproval: boolean
  ): Promise<ethers.ContractTransactionResponse>;

  /**
   * Revoke delegation for a specific DAO
   */
  revokeDelegation(
    daoGovernor: AddressLike
  ): Promise<ethers.ContractTransactionResponse>;

  /**
   * Emergency: Revoke ALL delegations across all DAOs
   */
  revokeAll(): Promise<ethers.ContractTransactionResponse>;

  /**
   * Manually approve a vote for a high-risk proposal
   */
  approveHighRiskVote(
    daoGovernor: AddressLike,
    proposalId: BigNumberish,
    support: VoteSupportValue
  ): Promise<ethers.ContractTransactionResponse>;

  /**
   * Update risk threshold for a DAO
   */
  updateRiskThreshold(
    daoGovernor: AddressLike,
    newThreshold: BigNumberish
  ): Promise<ethers.ContractTransactionResponse>;

  // ============ AI BACKEND FUNCTIONS ============

  /**
   * Cast a vote with risk assessment (AI backend only)
   * 
   * @notice Only authorized backends can call this function
   * @notice Will emit HighRiskProposalDetected if risk >= user's threshold
   * 
   * @example
   * ```typescript
   * const reportHash = ethers.keccak256(ethers.toUtf8Bytes(ipfsHash));
   * 
   * await votingAgent.castVoteWithRisk(
   *   daoAddress,
   *   proposalId,
   *   userAddress,
   *   VoteSupport.FOR,
   *   25,  // risk score
   *   reportHash
   * );
   * ```
   */
  castVoteWithRisk(
    daoGovernor: AddressLike,
    proposalId: BigNumberish,
    user: AddressLike,
    support: VoteSupportValue,
    riskScore: BigNumberish,
    riskReportHash: BytesLike
  ): Promise<ethers.ContractTransactionResponse>;

  /**
   * Batch voting for efficiency (AI backend only)
   */
  castMultipleVotes(
    daoGovernor: AddressLike,
    proposalIds: BigNumberish[],
    users: AddressLike[],
    supports: VoteSupportValue[],
    riskScores: BigNumberish[],
    reportHashes: BytesLike[]
  ): Promise<ethers.ContractTransactionResponse>;

  // ============ VIEW FUNCTIONS ============

  /**
   * Get delegation settings for a user + DAO pair
   */
  getDelegation(
    user: AddressLike,
    daoGovernor: AddressLike
  ): Promise<GetDelegationResult>;

  /**
   * Direct mapping access for delegations
   */
  delegations(
    user: AddressLike,
    daoGovernor: AddressLike
  ): Promise<[boolean, bigint, bigint, boolean]>;

  /**
   * Get list of DAOs a user has delegated to
   */
  userDAOs(
    user: AddressLike,
    index: BigNumberish
  ): Promise<string>;

  /**
   * Check if a proposal is pending approval
   */
  pendingApprovals(
    user: AddressLike,
    proposalId: BigNumberish,
    daoGovernor: AddressLike
  ): Promise<boolean>;

  /**
   * Get the AuditLogger contract address
   */
  auditLogger(): Promise<string>;

  /**
   * Check if an address is an authorized backend
   */
  authorizedBackends(backend: AddressLike): Promise<boolean>;

  /**
   * Get the admin address
   */
  admin(): Promise<string>;

  /**
   * Check if contract is paused
   */
  paused(): Promise<boolean>;

  /**
   * Get max risk threshold constant
   */
  MAX_RISK_THRESHOLD(): Promise<bigint>;

  /**
   * Get medium risk threshold constant
   */
  MEDIUM_RISK_THRESHOLD(): Promise<bigint>;

  // ============ EVENT FILTERS ============

  filters: {
    VotingPowerDelegated(
      user?: AddressLike | null,
      daoGovernor?: AddressLike | null
    ): ethers.ContractEventName;
    
    DelegationRevoked(
      user?: AddressLike | null,
      daoGovernor?: AddressLike | null
    ): ethers.ContractEventName;
    
    AllDelegationsRevoked(
      user?: AddressLike | null
    ): ethers.ContractEventName;
    
    VoteCastByAI(
      proposalId?: BigNumberish | null,
      user?: AddressLike | null
    ): ethers.ContractEventName;
    
    HighRiskProposalDetected(
      proposalId?: BigNumberish | null,
      user?: AddressLike | null
    ): ethers.ContractEventName;
    
    ApprovalRequired(
      proposalId?: BigNumberish | null,
      user?: AddressLike | null
    ): ethers.ContractEventName;
    
    HighRiskVoteApproved(
      user?: AddressLike | null,
      proposalId?: BigNumberish | null
    ): ethers.ContractEventName;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a report hash from an IPFS CID
 * @param ipfsCid - The IPFS content identifier (e.g., "QmXyz...")
 * @returns bytes32 hash suitable for riskReportHash parameter
 */
export function generateReportHash(ipfsCid: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(ipfsCid));
}

/**
 * Validate that a risk score is within acceptable bounds
 * @param riskScore - The risk score to validate
 * @returns true if valid (0-100)
 */
export function isValidRiskScore(riskScore: number | bigint): boolean {
  const score = typeof riskScore === 'bigint' ? Number(riskScore) : riskScore;
  return score >= RiskConstants.MIN_RISK_SCORE && score <= RiskConstants.MAX_RISK_THRESHOLD;
}

/**
 * Determine if a vote should be auto-cast based on risk score and threshold
 * @param riskScore - The AI-calculated risk score
 * @param userThreshold - The user's configured threshold
 * @returns true if risk < threshold (safe to auto-vote)
 */
export function shouldAutoVote(
  riskScore: number | bigint,
  userThreshold: number | bigint
): boolean {
  const score = typeof riskScore === 'bigint' ? Number(riskScore) : riskScore;
  const threshold = typeof userThreshold === 'bigint' ? Number(userThreshold) : userThreshold;
  return score < threshold;
}

/**
 * Get human-readable risk level from score
 */
export function getRiskLevel(riskScore: number | bigint): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const score = typeof riskScore === 'bigint' ? Number(riskScore) : riskScore;
  if (score <= 20) return 'LOW';
  if (score <= 40) return 'MEDIUM';
  if (score <= 60) return 'HIGH';
  return 'CRITICAL';
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard for CastVoteWithRiskParams
 */
export function isCastVoteWithRiskParams(obj: unknown): obj is CastVoteWithRiskParams {
  if (typeof obj !== 'object' || obj === null) return false;
  const params = obj as Record<string, unknown>;
  return (
    'daoGovernor' in params &&
    'proposalId' in params &&
    'user' in params &&
    'support' in params &&
    'riskScore' in params &&
    'riskReportHash' in params
  );
}

// ============================================
// EXPORTS
// ============================================

export default {
  VoteSupport,
  RiskConstants,
  generateReportHash,
  isValidRiskScore,
  shouldAutoVote,
  getRiskLevel,
  isCastVoteWithRiskParams,
};
