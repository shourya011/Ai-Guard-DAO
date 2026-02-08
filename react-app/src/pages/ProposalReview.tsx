/**
 * ProposalReview Page (Integrated with AI Guard)
 * 
 * Complete proposal review experience with:
 * - Left: Proposal details (header, content, metadata)
 * - Right: AI Guard panel (analysis stream or risk report)
 * - Bottom: Voting panel
 * 
 * Flow:
 * 1. If wallet NOT connected → Show "Connect Wallet" card
 * 2. If analysis exists → Show RiskReportCard
 * 3. If analysis in progress → Show AnalysisStream
 * 4. No analysis → Show "Scan" button
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  Loader2,
  Play,
  RefreshCw,
  AlertCircle,
  Wallet,
} from 'lucide-react';

// Existing components
import ProposalHeader from '../components/ProposalHeader';
import ProposalContent from '../components/ProposalContent';
import VotingPanel from '../components/VotingPanel';

// New AI Guard components
import AnalysisStream from '../components/guard/AnalysisStream';
import RiskReportCard from '../components/guard/RiskReportCard';
import DelegationCard from '../components/guard/DelegationCard';

// Hooks
import {
  useProposalAnalysis,
  useProposalVotes,
  useTriggerAnalysis,
  useRefetchAnalysis,
} from '../hooks/useProposalAnalysis';

// Types
import type { ProposalAnalysis } from '../types/analysis';

// Mock data (will be replaced with real API)
import {
  mockProposal,
  mockVotingStats,
} from '../data/mockProposalData';

// ============================================
// TYPES
// ============================================

type ViewMode = 'idle' | 'scanning' | 'complete' | 'error';

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Wallet Connection Guard - Glassmorphism Card
 */
const WalletGuard: React.FC<{
  onConnect: () => void;
  isConnecting: boolean;
}> = ({ onConnect, isConnecting }) => (
  <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative max-w-md w-full"
    >
      {/* Glassmorphism Card */}
      <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
        {/* Gradient glow effect behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-50" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30 shadow-lg shadow-indigo-500/20">
            <Wallet className="w-10 h-10 text-indigo-400" />
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-3">
            Connect Your Wallet
          </h2>
          
          {/* Description */}
          <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs">
            Connect your wallet to view proposal details, AI analysis reports, and participate in DAO governance.
          </p>
          
          {/* Connect Button */}
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                <span>Connect Wallet</span>
              </>
            )}
          </button>
          
          {/* Supported wallets hint */}
          <p className="text-xs text-slate-500 mt-4">
            Supports MetaMask, WalletConnect, and more
          </p>
        </div>
      </div>
    </motion.div>
  </div>
);

/**
 * Idle state - No analysis, show scan button
 */
const IdleState: React.FC<{
  onStartScan: () => void;
  isLoading: boolean;
}> = ({ onStartScan, isLoading }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-20 h-20 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
      <Shield className="w-10 h-10 text-indigo-400" />
    </div>
    
    <h3 className="text-xl font-semibold text-white mb-2">
      AI Guard Analysis
    </h3>
    <p className="text-slate-400 text-sm max-w-xs mb-6">
      Run AI-powered security analysis to detect risks, vulnerabilities, and governance concerns.
    </p>
    
    <button
      onClick={onStartScan}
      disabled={isLoading}
      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Starting...</span>
        </>
      ) : (
        <>
          <Play className="w-5 h-5" />
          <span>Start Analysis</span>
        </>
      )}
    </button>
    
    <p className="text-xs text-slate-500 mt-4">
      Analysis typically takes 30-60 seconds
    </p>
  </div>
);

/**
 * Error state - Analysis failed
 */
const ErrorState: React.FC<{
  error: Error | null;
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-20 h-20 bg-red-900/30 rounded-2xl flex items-center justify-center mb-6 border border-red-500/30">
      <AlertCircle className="w-10 h-10 text-red-400" />
    </div>
    
    <h3 className="text-xl font-semibold text-red-400 mb-2">
      Analysis Failed
    </h3>
    <p className="text-slate-400 text-sm max-w-xs mb-4">
      {error?.message || 'An error occurred during analysis. Please try again.'}
    </p>
    
    <button
      onClick={onRetry}
      className="flex items-center space-x-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-all"
    >
      <RefreshCw className="w-5 h-5" />
      <span>Retry Analysis</span>
    </button>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const ProposalReview: React.FC = () => {
  const navigate = useNavigate();
  const { proposalId } = useParams<{ proposalId: string }>();
  const [searchParams] = useSearchParams();
  
  // Wallet connection
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnectPending } = useConnect();
  
  // Get proposal ID from params or search params
  const id = proposalId || searchParams.get('id') || 'proposal-1';
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('idle');
  const [analysisError, setAnalysisError] = useState<Error | null>(null);
  
  // Hooks
  const {
    data: analysis,
    isLoading: isLoadingAnalysis,
    error: fetchError,
    refetch: refetchAnalysis,
  } = useProposalAnalysis(id);
  
  const {
    data: votes,
    isLoading: isLoadingVotes,
  } = useProposalVotes(id);
  
  const {
    mutate: triggerAnalysis,
    isPending: isTriggeringAnalysis,
  } = useTriggerAnalysis();
  
  const refetch = useRefetchAnalysis();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Determine view mode based on data
  useEffect(() => {
    if (analysis) {
      setViewMode('complete');
    } else if (fetchError) {
      // If 404, show idle state (no analysis yet)
      if ((fetchError as any)?.status === 404) {
        setViewMode('idle');
      } else {
        setViewMode('error');
        setAnalysisError(fetchError as Error);
      }
    }
  }, [analysis, fetchError]);

  // Handlers
  const handleConnectWallet = useCallback(() => {
    connect({ connector: injected() });
  }, [connect]);

  const handleStartScan = useCallback(() => {
    setViewMode('scanning');
    setAnalysisError(null);
    
    triggerAnalysis(
      { 
        proposalId: id,
        // These will be filled from the proposal data when available
        title: mockProposal.metadata.title,
        description: mockProposal.executiveSummary || '',
        proposerAddress: mockProposal.metadata.author || '0x0000000000000000000000000000000000000000',
      },
      {
        onError: (error) => {
          // If trigger fails, still try to show the stream
          // (analysis might already be in progress)
          console.warn('Trigger error:', error);
        },
      }
    );
  }, [id, triggerAnalysis]);

  const handleAnalysisComplete = useCallback((result?: {
    compositeScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  }) => {
    setViewMode('complete');
    // Refetch to get the complete analysis
    refetch(id);
  }, [id, refetch]);

  const handleAnalysisError = useCallback((error: string) => {
    setViewMode('error');
    setAnalysisError(new Error(error));
  }, []);

  const handleRetry = useCallback(() => {
    setAnalysisError(null);
    handleStartScan();
  }, [handleStartScan]);

  const handleVoteClick = useCallback(() => {
    // Scroll to voting panel or open voting modal
    const votingPanel = document.getElementById('voting-panel');
    votingPanel?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleRescan = useCallback(() => {
    setViewMode('idle');
  }, []);

  // ============================================
  // WALLET GUARD - Show connect prompt if not connected
  // ============================================
  
  if (!isConnected) {
    return (
      <WalletGuard
        onConnect={handleConnectWallet}
        isConnecting={isConnectPending}
      />
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white pb-48">
      {/* Top Navigation */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 bg-[#0a0e1a]/95 backdrop-blur-md border-b border-slate-800/50"
      >
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
          
          {/* Status Badge */}
          <div className="flex items-center space-x-2">
            {viewMode === 'complete' && analysis && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-900/30 rounded-full border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">Analysis Complete</span>
              </div>
            )}
            {viewMode === 'scanning' && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-900/30 rounded-full border border-indigo-500/30">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="text-sm text-indigo-400">Analyzing...</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Proposal Content (2/3 width) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            <ProposalHeader metadata={mockProposal.metadata} />
            <div className="overflow-auto">
              <ProposalContent proposal={mockProposal} />
            </div>
          </motion.div>

          {/* Right Column - AI Guard Panel (1/3 width, sticky) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] overflow-y-auto space-y-6">
              {/* AI Analysis Panel */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl p-6">
                {/* Panel Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-lg font-semibold">AI Guard</h3>
                  </div>
                  
                  {viewMode === 'complete' && (
                    <button
                      onClick={handleRescan}
                      className="text-xs text-slate-400 hover:text-white transition-colors flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Rescan</span>
                    </button>
                  )}
                </div>

                {/* Dynamic Content */}
                <AnimatePresence mode="wait">
                  {viewMode === 'idle' && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <IdleState
                        onStartScan={handleStartScan}
                        isLoading={isTriggeringAnalysis}
                      />
                    </motion.div>
                  )}

                  {viewMode === 'scanning' && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <AnalysisStream
                        proposalId={id}
                        autoConnect={true}
                        onComplete={handleAnalysisComplete}
                        onError={handleAnalysisError}
                      />
                    </motion.div>
                  )}

                  {viewMode === 'complete' && analysis && (
                    <motion.div
                      key="complete"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <RiskReportCard
                        analysis={analysis}
                        onVoteClick={handleVoteClick}
                      />
                    </motion.div>
                  )}

                  {viewMode === 'error' && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <ErrorState
                        error={analysisError}
                        onRetry={handleRetry}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Delegation Card - AI Auto-Pilot Settings */}
              <DelegationCard compact />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fixed Bottom Voting Panel */}
      <div id="voting-panel">
        <VotingPanel
          votingStats={mockVotingStats}
          proposalTitle={mockProposal.metadata.title}
        />
      </div>
    </div>
  );
};

export default ProposalReview;
