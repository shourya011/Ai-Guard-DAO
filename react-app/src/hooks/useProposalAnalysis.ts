/**
 * useProposalAnalysis Hook
 * 
 * TanStack Query hooks for fetching AI analysis results and voting history.
 * 
 * Features:
 * - Fetch completed analysis from /api/agent/result/:proposalId
 * - Fetch voting history from /api/proposals/:id/votes
 * - Optimistic caching (analysis is immutable once complete)
 * - Trigger new analysis via mutation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiUrl } from '../config/api';
import type {
  ProposalAnalysis,
  ProposalVoteSummary,
  AnalyzeProposalRequest,
  ApiResponse,
} from '../types/analysis';

// ============================================
// QUERY KEYS
// ============================================

export const analysisKeys = {
  all: ['analysis'] as const,
  detail: (proposalId: string) => [...analysisKeys.all, proposalId] as const,
  votes: (proposalId: string) => [...analysisKeys.all, proposalId, 'votes'] as const,
};

// ============================================
// FETCH FUNCTIONS
// ============================================

/**
 * Fetch completed analysis result for a proposal
 */
async function fetchAnalysisResult(proposalId: string): Promise<ProposalAnalysis | null> {
  try {
    const response = await apiFetch<ApiResponse<ProposalAnalysis>>(
      `/api/agent/result/${proposalId}`
    );
    return response.data || null;
  } catch (error: any) {
    // 404 means no analysis exists yet
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch voting history for a proposal
 */
async function fetchProposalVotes(proposalId: string): Promise<ProposalVoteSummary> {
  const response = await apiFetch<ApiResponse<ProposalVoteSummary>>(
    `/api/proposals/${proposalId}/votes`
  );
  return response.data || {
    proposalId,
    totalVotes: 0,
    autoVotes: 0,
    forVotes: 0,
    againstVotes: 0,
    abstainVotes: 0,
    votes: [],
  };
}

/**
 * Trigger a new analysis for a proposal
 */
async function triggerAnalysis(request: AnalyzeProposalRequest): Promise<{ jobId: string }> {
  const response = await apiFetch<ApiResponse<{ jobId: string }>>('/api/agent/analyze', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to start analysis');
  }
  
  return response.data;
}

// ============================================
// HOOKS
// ============================================

export interface UseProposalAnalysisOptions {
  /** Enable/disable the query */
  enabled?: boolean;
  /** Callback when analysis is successfully fetched */
  onSuccess?: (data: ProposalAnalysis | null) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook to fetch the completed analysis result for a proposal
 * 
 * @param proposalId - The database UUID of the proposal
 * @param options - Query options
 * @returns Query result with analysis data
 * 
 * @example
 * ```tsx
 * const { data: analysis, isLoading } = useProposalAnalysis(proposalId);
 * 
 * if (isLoading) return <Skeleton />;
 * if (!analysis) return <ScanButton />;
 * return <RiskReportCard analysis={analysis} />;
 * ```
 */
export function useProposalAnalysis(
  proposalId: string | undefined,
  options: UseProposalAnalysisOptions = {}
) {
  const { enabled = true, onSuccess, onError } = options;

  return useQuery({
    queryKey: analysisKeys.detail(proposalId || ''),
    queryFn: () => fetchAnalysisResult(proposalId!),
    enabled: enabled && !!proposalId,
    // Analysis is immutable once complete - never stale
    staleTime: Infinity,
    // Keep in cache for 30 minutes
    gcTime: 30 * 60 * 1000,
    // Don't retry on 404 (no analysis exists)
    retry: (failureCount, error: any) => {
      if (error.message?.includes('404')) return false;
      return failureCount < 3;
    },
  });
}

/**
 * Hook to fetch voting history for a proposal
 * 
 * @param proposalId - The database UUID of the proposal
 * @param options - Query options
 * @returns Query result with vote summary
 */
export function useProposalVotes(
  proposalId: string | undefined,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: analysisKeys.votes(proposalId || ''),
    queryFn: () => fetchProposalVotes(proposalId!),
    enabled: enabled && !!proposalId,
    // Votes can change - refetch every 30 seconds
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Hook to trigger a new analysis for a proposal
 * 
 * @returns Mutation for triggering analysis
 * 
 * @example
 * ```tsx
 * const { mutate: startAnalysis, isPending } = useTriggerAnalysis();
 * 
 * const handleScan = () => {
 *   startAnalysis({ proposalId, title, description, proposerAddress });
 * };
 * ```
 */
export function useTriggerAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['analysis', 'trigger'],
    mutationFn: triggerAnalysis,
    onSuccess: (data, variables) => {
      // Invalidate the analysis query to refetch when complete
      queryClient.invalidateQueries({
        queryKey: analysisKeys.detail(variables.proposalId),
      });
    },
  });
}

/**
 * Hook to manually refetch analysis (useful after SSE completion)
 */
export function useRefetchAnalysis() {
  const queryClient = useQueryClient();

  return (proposalId: string) => {
    queryClient.invalidateQueries({
      queryKey: analysisKeys.detail(proposalId),
    });
  };
}
