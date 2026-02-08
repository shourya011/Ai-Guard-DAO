/**
 * AI Guard DAO - Analysis Types
 * 
 * TypeScript interfaces for AI Agent analysis responses.
 * Based on FRONTEND_ARCHITECTURE.md Section 4.1
 */

/**
 * Risk severity levels returned by the AI Agent
 */
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low' | 'none';

/**
 * Risk factor category
 */
export type RiskCategory = 'financial' | 'governance' | 'security' | 'compliance' | 'technical';

/**
 * Individual risk factor identified by the agent
 */
export interface RiskFactor {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  title: string;
  description: string;
  affectedSection?: string;
  recommendation?: string;
  confidence: number; // 0-100
  /** Whether this is a positive factor (reduces risk) or negative (increases risk) */
  isPositive?: boolean;
}

/**
 * Individual AI agent result
 */
export interface AgentResult {
  agentName: string;
  agentType?: 'reputation' | 'nlp' | 'financial' | 'mediator';
  score: number;
  reasoning: string;
  flags: string[];
  confidence: number;
  /** Additional agent-specific data (wallet age, tx count, clarity score, etc.) */
  metadata?: Record<string, any>;
}

/**
 * Main analysis response from the AI Guard backend
 */
export interface ProposalAnalysis {
  /** Unique analysis ID for audit trail */
  analysisId: string;
  
  /** Database proposal ID */
  proposalId: string;
  
  /** On-chain proposal ID */
  onchainProposalId: string;
  
  /** DAO Governor contract address */
  daoGovernor: string;
  
  /** Chain ID */
  chainId: number;
  
  /** Timestamp of analysis completion */
  completedAt: string;
  
  /** Overall risk score (0-100, higher = more risky) */
  riskScore: number;
  
  /** Risk level classification */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  /** Computed severity based on score thresholds */
  overallSeverity: RiskSeverity;
  
  /** List of identified risk factors */
  riskFactors: RiskFactor[];
  
  /** AI-generated summary for humans */
  summary: string;
  
  /** Recommended actions before submission */
  recommendations: string[];
  
  /** Final recommendation: APPROVE, REVIEW, or REJECT */
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  
  /** Whether submission should be blocked */
  shouldBlock: boolean;
  
  /** Reason for blocking (if applicable) */
  blockReason?: string;
  
  /** Confidence in the overall analysis (0-100) */
  confidence: number;
  
  /** Individual agent breakdown */
  agents?: AgentResult[];
  
  /** Agent results (alias for agents, from database) */
  agentResults?: AgentResult[];
  
  /** Processing time in milliseconds */
  processingTimeMs?: number;
  
  /** Hash of report stored on-chain/IPFS */
  reportHash?: string;
}

/**
 * Streaming progress update during analysis
 */
export interface AnalysisProgress {
  type: 'processing' | 'progress' | 'complete' | 'failed';
  jobId: string;
  stage?: 'queued' | 'reputation' | 'nlp' | 'mediator' | 'complete';
  progress?: number; // 0-100
  message?: string;
  timestamp: string;
  
  // Complete event fields
  result?: {
    compositeScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  };
  processingTimeMs?: number;
  
  // Error field
  error?: string;
}

/**
 * Vote record from audit log
 */
export interface VoteRecord {
  id: string;
  delegatorAddress: string;
  voteType: 'FOR' | 'AGAINST' | 'ABSTAIN';
  riskScore: number;
  wasAutoVote: boolean;
  txHash?: string;
  createdAt: string;
}

/**
 * Proposal vote summary
 */
export interface ProposalVoteSummary {
  proposalId: string;
  totalVotes: number;
  autoVotes: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  votes: VoteRecord[];
}

/**
 * API request payload for analysis
 */
export interface AnalyzeProposalRequest {
  proposalId: string;
  onchainProposalId?: string;
  title: string;
  description: string;
  proposerAddress: string;
  daoGovernor?: string;
  chainId?: number;
  metadata?: Record<string, unknown>;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
