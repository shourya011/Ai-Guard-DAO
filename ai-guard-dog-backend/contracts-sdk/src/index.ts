/**
 * AI Guard DAO - Contracts SDK
 * 
 * TypeScript types and utilities for interacting with AI Guard DAO smart contracts.
 * 
 * @packageDocumentation
 * @module @ai-guard-dao/contracts-sdk
 */

// ============================================
// ABI EXPORTS
// ============================================

import VotingAgentABI from '../abis/VotingAgent.json';
import DAOGovernorABI from '../abis/DAOGovernor.json';
import AuditLoggerABI from '../abis/AuditLogger.json';

export { VotingAgentABI, DAOGovernorABI, AuditLoggerABI };

// ============================================
// TYPE EXPORTS
// ============================================

export * from './types/VotingAgent.types.js';

// Re-export specific commonly used items for convenience
export {
  VoteSupport,
  RiskConstants,
  generateReportHash,
  isValidRiskScore,
  shouldAutoVote,
  getRiskLevel,
  type IVotingAgentContract,
  type CastVoteWithRiskParams,
  type Delegation,
  type VoteSupportValue,
} from './types/VotingAgent.types.js';

// ============================================
// CONTRACT FACTORY UTILITIES
// ============================================

import { ethers, type Signer, type Provider, type AddressLike } from 'ethers';

/**
 * Create a VotingAgent contract instance
 */
export function getVotingAgentContract(
  address: AddressLike,
  signerOrProvider: Signer | Provider
): ethers.Contract {
  return new ethers.Contract(
    address as string,
    VotingAgentABI,
    signerOrProvider
  );
}

/**
 * Create a DAOGovernor contract instance
 */
export function getDAOGovernorContract(
  address: AddressLike,
  signerOrProvider: Signer | Provider
): ethers.Contract {
  return new ethers.Contract(
    address as string,
    DAOGovernorABI,
    signerOrProvider
  );
}

/**
 * Create an AuditLogger contract instance
 */
export function getAuditLoggerContract(
  address: AddressLike,
  signerOrProvider: Signer | Provider
): ethers.Contract {
  return new ethers.Contract(
    address as string,
    AuditLoggerABI,
    signerOrProvider
  );
}

// ============================================
// VERSION INFO
// ============================================

export const SDK_VERSION = '1.0.0';
export const SUPPORTED_CHAIN_IDS = [
  1,        // Ethereum Mainnet
  11155111, // Sepolia Testnet
  // Monad testnet chain ID TBD
] as const;
