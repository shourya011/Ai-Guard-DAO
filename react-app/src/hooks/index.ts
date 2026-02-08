/**
 * Hooks Barrel Export
 */

// Analysis hooks
export {
  useProposalAnalysis,
  useProposalVotes,
  useTriggerAnalysis,
  useRefetchAnalysis,
  analysisKeys,
} from './useProposalAnalysis';

// Delegation hooks
export {
  useDelegation,
  useDelegationStatus,
  useDelegateVote,
  useRevokeDelegation,
  useUpdateThreshold,
  useRevokeAllDelegations,
  type DelegationStatus,
  type UseDelegationStatusResult,
  type UseDelegateVoteResult,
  type UseRevokeDelegationResult,
  type UseUpdateThresholdResult,
} from './useDelegation';
