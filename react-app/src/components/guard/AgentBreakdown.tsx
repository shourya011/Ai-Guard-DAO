/**
 * AgentBreakdown Component
 * 
 * Displays 3 vertical agent cards showing the AI analysis breakdown:
 * 
 * 1. Reputation Sentinel (Green) - Wallet age, tx count, DAO history
 * 2. NLP Analyst (Yellow) - Clarity, sentiment, manipulation detection
 * 3. Mediator Consensus (Red/Pink) - Final RISK score and recommendation
 * 
 * Key UI Detail:
 * The Mediator card shows the RISK score (inverse of quality scores)
 * - High reputation + high NLP = LOW risk score = GOOD
 * - Low reputation + low NLP = HIGH risk score = BAD
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Brain,
  Scale,
  Clock,
  Activity,
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface AgentData {
  score: number;
  metadata?: Record<string, any>;
  reasoning?: string;
  flags?: string[];
}

interface AgentBreakdownProps {
  reputationAgent: AgentData;
  nlpAgent: AgentData;
  riskScore: number; // The INVERSE/final risk score
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getScoreColor = (score: number, isRiskScore: boolean = false): string => {
  if (isRiskScore) {
    // For risk scores: LOW is good (green), HIGH is bad (red)
    if (score <= 30) return 'text-emerald-400';
    if (score <= 50) return 'text-yellow-400';
    if (score <= 70) return 'text-orange-400';
    return 'text-red-400';
  }
  // For quality scores: HIGH is good (green), LOW is bad (red)
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 30) return 'text-orange-400';
  return 'text-red-400';
};

const getScoreBgColor = (score: number, isRiskScore: boolean = false): string => {
  if (isRiskScore) {
    if (score <= 30) return 'bg-emerald-500/20 border-emerald-500/30';
    if (score <= 50) return 'bg-yellow-500/20 border-yellow-500/30';
    if (score <= 70) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  }
  if (score >= 70) return 'bg-emerald-500/20 border-emerald-500/30';
  if (score >= 50) return 'bg-yellow-500/20 border-yellow-500/30';
  if (score >= 30) return 'bg-orange-500/20 border-orange-500/30';
  return 'bg-red-500/20 border-red-500/30';
};

const getRiskLabel = (score: number): string => {
  if (score <= 30) return 'LOW RISK';
  if (score <= 50) return 'MEDIUM RISK';
  if (score <= 70) return 'HIGH RISK';
  return 'CRITICAL';
};

const getRecommendationStyle = (rec: 'APPROVE' | 'REVIEW' | 'REJECT') => {
  switch (rec) {
    case 'APPROVE':
      return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: CheckCircle };
    case 'REVIEW':
      return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Eye };
    case 'REJECT':
      return { color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle };
  }
};

// ============================================
// SCORE CIRCLE COMPONENT
// ============================================

const ScoreCircle: React.FC<{
  score: number;
  label: string;
  isRiskScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ score, label, isRiskScore = false, size = 'md' }) => {
  const color = getScoreColor(score, isRiskScore);
  const sizes = {
    sm: { container: 'w-16 h-16', text: 'text-xl', label: 'text-xs' },
    md: { container: 'w-20 h-20', text: 'text-2xl', label: 'text-xs' },
    lg: { container: 'w-24 h-24', text: 'text-3xl', label: 'text-sm' },
  };
  
  // Calculate stroke dasharray for circular progress
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  
  return (
    <div className="relative flex flex-col items-center">
      <div className={`relative ${sizes[size].container}`}>
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-slate-700/50"
          />
          <motion.circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className={color}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        
        {/* Score number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${sizes[size].text} font-bold ${color}`}>
            {score}
          </span>
        </div>
      </div>
      
      {/* Label below circle */}
      <span className={`mt-2 ${sizes[size].label} text-slate-400 font-medium`}>
        {label}
      </span>
    </div>
  );
};

// ============================================
// AGENT CARD COMPONENT
// ============================================

interface AgentCardProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  bgGradient: string;
  borderColor: string;
  score: number;
  scoreLabel: string;
  isRiskScore?: boolean;
  children: React.ReactNode;
  delay?: number;
}

const AgentCard: React.FC<AgentCardProps> = ({
  title,
  icon: Icon,
  iconColor,
  bgGradient,
  borderColor,
  score,
  scoreLabel,
  isRiskScore = false,
  children,
  delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className={`
      rounded-xl border backdrop-blur-sm
      ${bgGradient} ${borderColor}
      p-5 flex flex-col h-full
    `}
  >
    {/* Header */}
    <div className="flex items-center space-x-3 mb-4">
      <div className={`p-2 rounded-lg ${iconColor.replace('text-', 'bg-')}/20`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <h4 className="font-semibold text-white text-sm">{title}</h4>
    </div>
    
    {/* Score Circle */}
    <div className="flex justify-center mb-4">
      <ScoreCircle score={score} label={scoreLabel} isRiskScore={isRiskScore} />
    </div>
    
    {/* Details */}
    <div className="flex-1 space-y-2 text-sm">
      {children}
    </div>
  </motion.div>
);

// ============================================
// DETAIL ROW COMPONENT
// ============================================

const DetailRow: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  valueColor?: string;
}> = ({ icon: Icon, label, value, valueColor = 'text-slate-200' }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-slate-700/30 last:border-0">
    <div className="flex items-center space-x-2 text-slate-400">
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs">{label}</span>
    </div>
    <span className={`text-xs font-medium ${valueColor}`}>{value}</span>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const AgentBreakdown: React.FC<AgentBreakdownProps> = ({
  reputationAgent,
  nlpAgent,
  riskScore,
  recommendation,
  className = '',
}) => {
  const recStyle = getRecommendationStyle(recommendation);
  const RecIcon = recStyle.icon;
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Section Title */}
      <div className="flex items-center space-x-2 mb-2">
        <Brain className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-white">AI Agent Analysis</h3>
      </div>
      
      {/* Cards Grid - Vertical on mobile, horizontal on larger screens */}
      <div className="grid grid-cols-1 gap-4">
        
        {/* ═══════════════════════════════════════════════════════════
            CARD 1: Reputation Sentinel (GREEN)
            ═══════════════════════════════════════════════════════════ */}
        <AgentCard
          title="Reputation Sentinel"
          icon={Shield}
          iconColor="text-emerald-400"
          bgGradient="bg-gradient-to-br from-emerald-900/20 to-emerald-950/30"
          borderColor="border-emerald-500/20"
          score={reputationAgent.score}
          scoreLabel="Quality Score"
          delay={0}
        >
          <DetailRow
            icon={Clock}
            label="Wallet Age"
            value={reputationAgent.metadata?.walletAge || 'Unknown'}
            valueColor={reputationAgent.score >= 60 ? 'text-emerald-400' : 'text-orange-400'}
          />
          <DetailRow
            icon={Activity}
            label="Transactions"
            value={reputationAgent.metadata?.txCount?.toLocaleString() || '0'}
            valueColor="text-slate-200"
          />
          <DetailRow
            icon={Users}
            label="DAO Memberships"
            value={reputationAgent.metadata?.daoMemberships || '0'}
            valueColor="text-slate-200"
          />
          <DetailRow
            icon={TrendingUp}
            label="Success Rate"
            value={reputationAgent.metadata?.successRate || 'N/A'}
            valueColor={
              reputationAgent.metadata?.successRate === '100%' 
                ? 'text-emerald-400' 
                : 'text-slate-200'
            }
          />
        </AgentCard>
        
        {/* ═══════════════════════════════════════════════════════════
            CARD 2: NLP Analyst (YELLOW)
            ═══════════════════════════════════════════════════════════ */}
        <AgentCard
          title="NLP Analyst"
          icon={FileText}
          iconColor="text-yellow-400"
          bgGradient="bg-gradient-to-br from-yellow-900/20 to-amber-950/30"
          borderColor="border-yellow-500/20"
          score={nlpAgent.score}
          scoreLabel="Quality Score"
          delay={0.1}
        >
          <DetailRow
            icon={Eye}
            label="Clarity"
            value={`${nlpAgent.metadata?.clarity || 0}%`}
            valueColor={nlpAgent.metadata?.clarity >= 70 ? 'text-emerald-400' : 'text-yellow-400'}
          />
          <DetailRow
            icon={TrendingUp}
            label="Sentiment"
            value={nlpAgent.metadata?.sentiment || 'Unknown'}
            valueColor={
              nlpAgent.metadata?.sentiment === 'Positive' 
                ? 'text-emerald-400' 
                : nlpAgent.metadata?.sentiment === 'Neutral'
                ? 'text-slate-200'
                : 'text-red-400'
            }
          />
          <DetailRow
            icon={FileText}
            label="Readability"
            value={nlpAgent.metadata?.readability || 'Unknown'}
            valueColor="text-slate-200"
          />
          <DetailRow
            icon={AlertTriangle}
            label="Manipulation"
            value={`${nlpAgent.metadata?.manipulationScore || 0}%`}
            valueColor={
              (nlpAgent.metadata?.manipulationScore || 0) <= 20 
                ? 'text-emerald-400' 
                : 'text-red-400'
            }
          />
        </AgentCard>
        
        {/* ═══════════════════════════════════════════════════════════
            CARD 3: Mediator Consensus (RED/PINK) - RISK SCORE
            ═══════════════════════════════════════════════════════════ */}
        <AgentCard
          title="Mediator Consensus"
          icon={Scale}
          iconColor="text-pink-400"
          bgGradient="bg-gradient-to-br from-pink-900/20 to-rose-950/30"
          borderColor="border-pink-500/20"
          score={riskScore}
          scoreLabel={getRiskLabel(riskScore)}
          isRiskScore={true}
          delay={0.2}
        >
          {/* Risk Assessment */}
          <div className={`p-3 rounded-lg ${getScoreBgColor(riskScore, true)} border mb-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Final Risk Level</span>
              <span className={`text-sm font-bold ${getScoreColor(riskScore, true)}`}>
                {getRiskLabel(riskScore)}
              </span>
            </div>
          </div>
          
          {/* Input Scores Summary */}
          <div className="text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Reputation Input:</span>
              <span className={getScoreColor(reputationAgent.score)}>{reputationAgent.score}/100</span>
            </div>
            <div className="flex justify-between">
              <span>NLP Input:</span>
              <span className={getScoreColor(nlpAgent.score)}>{nlpAgent.score}/100</span>
            </div>
          </div>
          
          {/* Recommendation Badge */}
          <div className={`mt-3 p-3 rounded-lg ${recStyle.bg} flex items-center justify-center space-x-2`}>
            <RecIcon className={`w-4 h-4 ${recStyle.color}`} />
            <span className={`text-sm font-bold ${recStyle.color}`}>
              {recommendation}
            </span>
          </div>
        </AgentCard>
        
      </div>
    </div>
  );
};

export default AgentBreakdown;
