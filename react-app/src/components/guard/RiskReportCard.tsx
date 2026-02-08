/**
 * RiskReportCard Component
 * 
 * Displays the complete AI analysis risk report with:
 * - Large visual risk badge (Green/Yellow/Red)
 * - Circular score gauge (0-100)
 * - AgentBreakdown with 3 vertical cards
 * - Risk factors in expandable accordion
 * - Recommendation banner
 * 
 * Uses shadcn/ui + Tailwind for consistent styling.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  Fingerprint,
  FileText,
  TrendingUp,
  Lock,
  Users,
} from 'lucide-react';
import type { ProposalAnalysis, RiskFactor, RiskSeverity } from '../../types/analysis';
import AgentBreakdown from './AgentBreakdown';

// ============================================
// TYPES
// ============================================

interface RiskReportCardProps {
  analysis: ProposalAnalysis;
  className?: string;
  onVoteClick?: () => void;
}

// ============================================
// HELPERS
// ============================================

function getRiskColor(score: number): { bg: string; text: string; border: string; gradient: string } {
  if (score <= 30) {
    return {
      bg: 'bg-emerald-500',
      text: 'text-emerald-400',
      border: 'border-emerald-500',
      gradient: 'from-emerald-500 to-green-400',
    };
  }
  if (score <= 50) {
    return {
      bg: 'bg-yellow-500',
      text: 'text-yellow-400',
      border: 'border-yellow-500',
      gradient: 'from-yellow-500 to-amber-400',
    };
  }
  if (score <= 75) {
    return {
      bg: 'bg-orange-500',
      text: 'text-orange-400',
      border: 'border-orange-500',
      gradient: 'from-orange-500 to-amber-500',
    };
  }
  return {
    bg: 'bg-red-500',
    text: 'text-red-400',
    border: 'border-red-500',
    gradient: 'from-red-500 to-rose-400',
  };
}

function getRiskLabel(score: number): string {
  if (score <= 30) return 'Low Risk';
  if (score <= 50) return 'Medium Risk';
  if (score <= 75) return 'High Risk';
  return 'Critical Risk';
}

function getSeverityColor(severity: RiskSeverity): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'none': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

function getCategoryIcon(category: RiskFactor['category']): React.ReactNode {
  const iconClass = 'w-4 h-4';
  switch (category) {
    case 'financial': return <TrendingUp className={iconClass} />;
    case 'governance': return <Users className={iconClass} />;
    case 'security': return <Lock className={iconClass} />;
    case 'compliance': return <FileText className={iconClass} />;
    case 'technical': return <Shield className={iconClass} />;
    default: return <Info className={iconClass} />;
  }
}

function getRecommendationStyle(rec: ProposalAnalysis['recommendation']): {
  bg: string;
  border: string;
  text: string;
  icon: React.ReactNode;
} {
  switch (rec) {
    case 'APPROVE':
      return {
        bg: 'bg-emerald-900/40',
        border: 'border-emerald-500/50',
        text: 'text-emerald-400',
        icon: <CheckCircle className="w-6 h-6" />,
      };
    case 'REJECT':
      return {
        bg: 'bg-red-900/40',
        border: 'border-red-500/50',
        text: 'text-red-400',
        icon: <XCircle className="w-6 h-6" />,
      };
    case 'REVIEW':
    default:
      return {
        bg: 'bg-yellow-900/40',
        border: 'border-yellow-500/50',
        text: 'text-yellow-400',
        icon: <AlertTriangle className="w-6 h-6" />,
      };
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Circular score gauge using SVG
 */
const ScoreGauge: React.FC<{ score: number; size?: number }> = ({ score, size = 180 }) => {
  const colors = getRiskColor(score);
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox="0 0 160 160"
      >
        {/* Background ring */}
        <circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-slate-700/50"
        />
        {/* Progress ring */}
        <motion.circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" className={colors.text} stopColor="currentColor" />
            <stop offset="100%" className={colors.text} stopColor="currentColor" stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-4xl font-bold ${colors.text}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-slate-400">Risk Score</span>
      </div>
    </div>
  );
};

/**
 * Get color based on whether factor is positive or negative
 */
function getFactorStyle(factor: RiskFactor): { 
  bg: string; 
  border: string; 
  icon: React.ReactNode;
  iconBg: string;
} {
  if (factor.isPositive) {
    return {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
      iconBg: 'bg-emerald-500/20',
    };
  }
  
  // Negative factor - use severity colors
  switch (factor.severity) {
    case 'critical':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        icon: <XCircle className="w-5 h-5 text-red-400" />,
        iconBg: 'bg-red-500/20',
      };
    case 'high':
      return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
        iconBg: 'bg-orange-500/20',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
        iconBg: 'bg-yellow-500/20',
      };
    default:
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        icon: <Info className="w-5 h-5 text-blue-400" />,
        iconBg: 'bg-blue-500/20',
      };
  }
}

/**
 * Risk factor item with positive/negative indicator
 */
const RiskFactorItem: React.FC<{ factor: RiskFactor; index: number }> = ({ factor, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  const style = getFactorStyle(factor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`border rounded-lg overflow-hidden ${style.bg} ${style.border}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${style.iconBg}`}>
            {style.icon}
          </div>
          <div>
            <h4 className="font-medium text-white text-sm">{factor.title}</h4>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                factor.isPositive 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : factor.severity === 'critical' ? 'bg-red-500/20 text-red-400'
                  : factor.severity === 'high' ? 'bg-orange-500/20 text-orange-400'
                  : factor.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {factor.isPositive ? '✓ Positive' : `⚠ ${factor.severity}`}
              </span>
              <span className="text-xs text-slate-500 capitalize">
                {factor.category}
              </span>
            </div>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-2 border-t border-white/10">
              <p className="text-sm text-slate-300">{factor.description}</p>
              
              {factor.recommendation && (
                <div className="flex items-start space-x-2 text-xs bg-black/20 p-2 rounded-lg">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-indigo-400" />
                  <span className="text-slate-400">{factor.recommendation}</span>
                </div>
              )}
              
              <div className="text-xs text-slate-500">
                Confidence: {factor.confidence}%
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const RiskReportCard: React.FC<RiskReportCardProps> = ({
  analysis,
  className = '',
  onVoteClick,
}) => {
  const colors = getRiskColor(analysis.riskScore);
  const recStyle = getRecommendationStyle(analysis.recommendation);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Risk Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {/* Risk Shield Icon */}
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.gradient} mb-4`}>
          {analysis.riskScore <= 30 ? (
            <ShieldCheck className="w-8 h-8 text-white" />
          ) : analysis.riskScore <= 75 ? (
            <ShieldAlert className="w-8 h-8 text-white" />
          ) : (
            <ShieldX className="w-8 h-8 text-white" />
          )}
        </div>
        
        <h3 className={`text-2xl font-bold ${colors.text}`}>
          {getRiskLabel(analysis.riskScore)}
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          AI Guard Analysis Complete
        </p>
      </motion.div>

      {/* Score Gauge */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center"
      >
        <ScoreGauge score={analysis.riskScore} />
      </motion.div>

      {/* Agent Breakdown - 3 Vertical Cards */}
      {(analysis.agentResults || analysis.agents) && (analysis.agentResults || analysis.agents)!.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {(() => {
            const agents = analysis.agentResults || analysis.agents || [];
            return (
              <AgentBreakdown
                reputationAgent={{
                  score: agents.find(a => a.agentName === 'REPUTATION_SENTINEL')?.score || 50,
                  metadata: agents.find(a => a.agentName === 'REPUTATION_SENTINEL')?.metadata || {},
                  reasoning: agents.find(a => a.agentName === 'REPUTATION_SENTINEL')?.reasoning,
                  flags: agents.find(a => a.agentName === 'REPUTATION_SENTINEL')?.flags,
                }}
                nlpAgent={{
                  score: agents.find(a => a.agentName === 'NLP_ANALYST')?.score || 50,
                  metadata: agents.find(a => a.agentName === 'NLP_ANALYST')?.metadata || {},
                  reasoning: agents.find(a => a.agentName === 'NLP_ANALYST')?.reasoning,
                  flags: agents.find(a => a.agentName === 'NLP_ANALYST')?.flags,
                }}
                riskScore={analysis.riskScore}
                recommendation={analysis.recommendation}
              />
            );
          })()}
        </motion.div>
      )}

      {/* Summary */}
      {analysis.summary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50"
        >
          <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Summary
          </h4>
          <p className="text-sm text-slate-400">{analysis.summary}</p>
        </motion.div>
      )}

      {/* Recommendation Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={`p-4 rounded-xl border ${recStyle.bg} ${recStyle.border}`}
      >
        <div className="flex items-center space-x-3">
          <div className={recStyle.text}>
            {recStyle.icon}
          </div>
          <div>
            <h4 className={`font-bold text-lg ${recStyle.text}`}>
              {analysis.recommendation}
            </h4>
            <p className="text-sm text-slate-400">
              {analysis.recommendation === 'APPROVE' && 'This proposal appears safe for execution.'}
              {analysis.recommendation === 'REVIEW' && 'Human review recommended before voting.'}
              {analysis.recommendation === 'REJECT' && 'High risk detected. Proceed with caution.'}
            </p>
          </div>
        </div>
        
        {analysis.shouldBlock && analysis.blockReason && (
          <div className="mt-3 p-3 bg-red-900/30 rounded-lg border border-red-500/30">
            <p className="text-sm text-red-400">
              <strong>Warning:</strong> {analysis.blockReason}
            </p>
          </div>
        )}
      </motion.div>

      {/* Risk Factors - Split into Positive and Negative */}
      {analysis.riskFactors && analysis.riskFactors.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          {/* Positive Factors */}
          {analysis.riskFactors.filter(f => f.isPositive).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-emerald-400 mb-3 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Positive Indicators ({analysis.riskFactors.filter(f => f.isPositive).length})
              </h4>
              <div className="space-y-2">
                {analysis.riskFactors
                  .filter(f => f.isPositive)
                  .map((factor, index) => (
                    <RiskFactorItem key={factor.id || index} factor={factor} index={index} />
                  ))}
              </div>
            </div>
          )}
          
          {/* Negative Factors */}
          {analysis.riskFactors.filter(f => !f.isPositive).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Risk Factors ({analysis.riskFactors.filter(f => !f.isPositive).length})
              </h4>
              <div className="space-y-2">
                {analysis.riskFactors
                  .filter(f => !f.isPositive)
                  .map((factor, index) => (
                    <RiskFactorItem key={factor.id || index} factor={factor} index={index} />
                  ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Recommendations List */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50"
        >
          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Recommendations
          </h4>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm text-slate-400">
                <span className="text-emerald-400 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Metadata Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-700/50 text-xs text-slate-500"
      >
        <div className="flex items-center space-x-2">
          <Fingerprint className="w-4 h-4" />
          <span className="font-mono">{analysis.analysisId.substring(0, 8)}...</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4" />
          <span>{new Date(analysis.completedAt).toLocaleString()}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>Confidence: {analysis.confidence}%</span>
        </div>
      </motion.div>

      {/* Vote Button */}
      {onVoteClick && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          onClick={onVoteClick}
          disabled={analysis.shouldBlock}
          className={`w-full py-3 rounded-xl font-medium transition-all ${
            analysis.shouldBlock
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
          }`}
        >
          {analysis.shouldBlock ? 'Voting Blocked by AI Guard' : 'Proceed to Vote'}
        </motion.button>
      )}
    </div>
  );
};

export default RiskReportCard;
