/**
 * Delegation Hooks
 * 
 * Wagmi v2 hooks for interacting with VotingAgent.sol
 * Manages AI delegation status, enabling/updating delegation, and revoking
 */

import { useCallback, useMemo } from 'react';
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { votingAgentAbi } from '../contracts/abis/VotingAgent';
import { getContractAddresses, DEFAULT_CHAIN_ID } from '../contracts/addresses';

// ============================================
// TYPES
// ============================================

export interface DelegationStatus {
  /** Whether delegation is currently active */
  isDelegated: boolean;
  /** Current risk threshold (0-100) */
  riskThreshold: number;
  /** Timestamp when delegation was created */
  delegatedAt: number;
  /** Whether user approval is required for each vote */
  requiresApproval: boolean;
  /** Human-readable status */
  status: 'active' | 'inactive' | 'pending-approval';
}

export interface UseDelegationStatusResult {
  data: DelegationStatus | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseDelegateVoteResult {
  /** Execute the delegate transaction */
  delegate: (riskThreshold: number, requireApproval?: boolean) => void;
  /** Transaction hash (if submitted) */
  hash: `0x${string}` | undefined;
  /** Whether waiting for user to sign */
  isPending: boolean;
  /** Whether waiting for confirmation */
  isConfirming: boolean;
  /** Whether transaction succeeded */
  isSuccess: boolean;
  /** Whether transaction failed */
  isError: boolean;
  /** Error object if failed */
  error: Error | null;
  /** Reset the state */
  reset: () => void;
}

export interface UseRevokeDelegationResult {
  /** Execute the revoke transaction */
  revoke: () => void;
  /** Transaction hash (if submitted) */
  hash: `0x${string}` | undefined;
  /** Whether waiting for user to sign */
  isPending: boolean;
  /** Whether waiting for confirmation */
  isConfirming: boolean;
  /** Whether transaction succeeded */
  isSuccess: boolean;
  /** Whether transaction failed */
  isError: boolean;
  /** Error object if failed */
  error: Error | null;
  /** Reset the state */
  reset: () => void;
}

export interface UseUpdateThresholdResult {
  /** Execute the update transaction */
  update: (newThreshold: number) => void;
  /** Transaction hash (if submitted) */
  hash: `0x${string}` | undefined;
  /** Whether waiting for user to sign */
  isPending: boolean;
  /** Whether waiting for confirmation */
  isConfirming: boolean;
  /** Whether transaction succeeded */
  isSuccess: boolean;
  /** Whether transaction failed */
  isError: boolean;
  /** Error object if failed */
  error: Error | null;
  /** Reset the state */
  reset: () => void;
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to read delegation status for current user and a specific DAO
 */
export function useDelegationStatus(daoAddress?: `0x${string}`): UseDelegationStatusResult {
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  
  const addresses = getContractAddresses(chainId || DEFAULT_CHAIN_ID);
  const votingAgentAddress = addresses?.votingAgent;
  
  // Use provided DAO address or fall back to default
  const targetDao = daoAddress || addresses?.daoGovernor;

  const {
    data: rawData,
    isLoading,
    isError,
    error,
    refetch,
  } = useReadContract({
    address: votingAgentAddress,
    abi: votingAgentAbi,
    functionName: 'getDelegation',
    args: userAddress && targetDao ? [userAddress, targetDao] : undefined,
    query: {
      enabled: isConnected && !!userAddress && !!targetDao && !!votingAgentAddress,
      staleTime: 30_000, // 30 seconds
      refetchInterval: 60_000, // 1 minute
    },
  });

  // Transform raw contract data to typed result
  const data = useMemo((): DelegationStatus | undefined => {
    if (!rawData) return undefined;

    const [active, riskThreshold, delegatedAt, requiresApproval] = rawData as [
      boolean,
      bigint,
      bigint,
      boolean
    ];

    let status: DelegationStatus['status'] = 'inactive';
    if (active) {
      status = requiresApproval ? 'pending-approval' : 'active';
    }

    return {
      isDelegated: active,
      riskThreshold: Number(riskThreshold),
      delegatedAt: Number(delegatedAt),
      requiresApproval,
      status,
    };
  }, [rawData]);

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to delegate voting power to the AI agent
 */
export function useDelegateVote(daoAddress?: `0x${string}`): UseDelegateVoteResult {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId || DEFAULT_CHAIN_ID);
  const votingAgentAddress = addresses?.votingAgent;
  const targetDao = daoAddress || addresses?.daoGovernor;

  const {
    writeContract,
    data: hash,
    isPending,
    isError: isWriteError,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const delegate = useCallback(
    (riskThreshold: number, requireApproval = false) => {
      if (!votingAgentAddress || !targetDao) {
        console.error('Contract addresses not configured');
        return;
      }

      // Validate threshold
      if (riskThreshold < 0 || riskThreshold > 100) {
        console.error('Risk threshold must be between 0 and 100');
        return;
      }

      writeContract({
        address: votingAgentAddress,
        abi: votingAgentAbi,
        functionName: 'delegateVotingPower',
        args: [targetDao, BigInt(riskThreshold), requireApproval],
      });
    },
    [writeContract, votingAgentAddress, targetDao]
  );

  return {
    delegate,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError: isWriteError || isReceiptError,
    error: (writeError || receiptError) as Error | null,
    reset,
  };
}

/**
 * Hook to revoke delegation for a specific DAO
 */
export function useRevokeDelegation(daoAddress?: `0x${string}`): UseRevokeDelegationResult {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId || DEFAULT_CHAIN_ID);
  const votingAgentAddress = addresses?.votingAgent;
  const targetDao = daoAddress || addresses?.daoGovernor;

  const {
    writeContract,
    data: hash,
    isPending,
    isError: isWriteError,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const revoke = useCallback(() => {
    if (!votingAgentAddress || !targetDao) {
      console.error('Contract addresses not configured');
      return;
    }

    writeContract({
      address: votingAgentAddress,
      abi: votingAgentAbi,
      functionName: 'revokeDelegation',
      args: [targetDao],
    });
  }, [writeContract, votingAgentAddress, targetDao]);

  return {
    revoke,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError: isWriteError || isReceiptError,
    error: (writeError || receiptError) as Error | null,
    reset,
  };
}

/**
 * Hook to update risk threshold without re-delegating
 */
export function useUpdateThreshold(daoAddress?: `0x${string}`): UseUpdateThresholdResult {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId || DEFAULT_CHAIN_ID);
  const votingAgentAddress = addresses?.votingAgent;
  const targetDao = daoAddress || addresses?.daoGovernor;

  const {
    writeContract,
    data: hash,
    isPending,
    isError: isWriteError,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const update = useCallback(
    (newThreshold: number) => {
      if (!votingAgentAddress || !targetDao) {
        console.error('Contract addresses not configured');
        return;
      }

      // Validate threshold
      if (newThreshold < 0 || newThreshold > 100) {
        console.error('Risk threshold must be between 0 and 100');
        return;
      }

      writeContract({
        address: votingAgentAddress,
        abi: votingAgentAbi,
        functionName: 'updateRiskThreshold',
        args: [targetDao, BigInt(newThreshold)],
      });
    },
    [writeContract, votingAgentAddress, targetDao]
  );

  return {
    update,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError: isWriteError || isReceiptError,
    error: (writeError || receiptError) as Error | null,
    reset,
  };
}

/**
 * Hook to revoke ALL delegations (emergency function)
 */
export function useRevokeAllDelegations() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId || DEFAULT_CHAIN_ID);
  const votingAgentAddress = addresses?.votingAgent;

  const {
    writeContract,
    data: hash,
    isPending,
    isError: isWriteError,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const revokeAll = useCallback(() => {
    if (!votingAgentAddress) {
      console.error('Contract addresses not configured');
      return;
    }

    writeContract({
      address: votingAgentAddress,
      abi: votingAgentAbi,
      functionName: 'revokeAll',
      args: [],
    });
  }, [writeContract, votingAgentAddress]);

  return {
    revokeAll,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError: isWriteError || isReceiptError,
    error: (writeError || receiptError) as Error | null,
    reset,
  };
}

/**
 * Combined hook for common delegation management
 * Provides all delegation functionality in one hook
 */
export function useDelegation(daoAddress?: `0x${string}`) {
  const status = useDelegationStatus(daoAddress);
  const delegateHook = useDelegateVote(daoAddress);
  const revokeHook = useRevokeDelegation(daoAddress);
  const updateHook = useUpdateThreshold(daoAddress);

  return {
    // Status
    ...status,
    
    // Delegate
    delegate: delegateHook.delegate,
    delegateState: {
      hash: delegateHook.hash,
      isPending: delegateHook.isPending,
      isConfirming: delegateHook.isConfirming,
      isSuccess: delegateHook.isSuccess,
      isError: delegateHook.isError,
      error: delegateHook.error,
      reset: delegateHook.reset,
    },
    
    // Revoke
    revoke: revokeHook.revoke,
    revokeState: {
      hash: revokeHook.hash,
      isPending: revokeHook.isPending,
      isConfirming: revokeHook.isConfirming,
      isSuccess: revokeHook.isSuccess,
      isError: revokeHook.isError,
      error: revokeHook.error,
      reset: revokeHook.reset,
    },
    
    // Update threshold
    updateThreshold: updateHook.update,
    updateState: {
      hash: updateHook.hash,
      isPending: updateHook.isPending,
      isConfirming: updateHook.isConfirming,
      isSuccess: updateHook.isSuccess,
      isError: updateHook.isError,
      error: updateHook.error,
      reset: updateHook.reset,
    },
  };
}

export default useDelegation;
