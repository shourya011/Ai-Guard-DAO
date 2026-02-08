/**
 * DelegationCard Component
 * 
 * UI component for managing AI delegation status.
 * Features:
 * - AI Auto-Pilot header with status badge
 * - Risk threshold slider (0-100)
 * - Enable/Update/Revoke actions
 * - Transaction status feedback
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Settings,
  Power,
  PowerOff,
  Info,
  Zap,
} from 'lucide-react';
import {
  useDelegationStatus,
  useDelegateVote,
  useRevokeDelegation,
  useUpdateThreshold,
} from '../../hooks/useDelegation';

// ============================================
// TYPES
// ============================================

interface DelegationCardProps {
  /** DAO Governor contract address */
  daoAddress?: `0x${string}`;
  /** Custom className */
  className?: string;
  /** Callback when delegation status changes */
  onStatusChange?: (isActive: boolean) => void;
  /** Compact mode for sidebar */
  compact?: boolean;
}

// ============================================
// HELPERS
// ============================================

function getRiskLevelLabel(threshold: number): {
  label: string;
  color: string;
  description: string;
} {
  if (threshold <= 25) {
    return {
      label: 'Conservative',
      color: 'text-emerald-400',
      description: 'AI votes only on very low-risk proposals',
    };
  }
  if (threshold <= 50) {
    return {
      label: 'Moderate',
      color: 'text-yellow-400',
      description: 'AI votes on low to medium-risk proposals',
    };
  }
  if (threshold <= 75) {
    return {
      label: 'Aggressive',
      color: 'text-orange-400',
      description: 'AI votes on most proposals except high-risk',
    };
  }
  return {
    label: 'Maximum',
    color: 'text-red-400',
    description: 'AI votes on nearly all proposals',
  };
}

function getSliderGradient(value: number): string {
  const percent = value;
  return `linear-gradient(to right, 
    #10b981 0%, 
    #eab308 ${percent * 0.5}%, 
    #f97316 ${percent * 0.75}%, 
    #ef4444 ${percent}%, 
    #374151 ${percent}%, 
    #374151 100%)`;
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Status indicator dot
 */
const StatusDot: React.FC<{ active: boolean; pulsing?: boolean }> = ({
  active,
  pulsing = true,
}) => (
  <span className="relative flex h-3 w-3">
    {active && pulsing && (
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
    )}
    <span
      className={`relative inline-flex rounded-full h-3 w-3 ${
        active ? 'bg-emerald-400' : 'bg-slate-500'
      }`}
    />
  </span>
);

/**
 * Transaction status overlay
 */
const TransactionStatus: React.FC<{
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  action: string;
  onReset: () => void;
}> = ({ isPending, isConfirming, isSuccess, isError, error, action, onReset }) => {
  // Auto-reset success state after 3 seconds
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(onReset, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onReset]);

  if (!isPending && !isConfirming && !isSuccess && !isError) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm rounded-xl flex items-center justify-center z-10"
    >
      <div className="text-center p-6">
        {isPending && (
          <>
            <Loader2 className="w-12 h-12 mx-auto text-indigo-400 animate-spin mb-4" />
            <h4 className="text-lg font-semibold text-white mb-2">Confirm in Wallet</h4>
            <p className="text-sm text-slate-400">
              Please sign the transaction to {action.toLowerCase()}
            </p>
          </>
        )}

        {isConfirming && (
          <>
            <Loader2 className="w-12 h-12 mx-auto text-yellow-400 animate-spin mb-4" />
            <h4 className="text-lg font-semibold text-white mb-2">Confirming...</h4>
            <p className="text-sm text-slate-400">
              Waiting for blockchain confirmation
            </p>
          </>
        )}

        {isSuccess && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-4" />
            <h4 className="text-lg font-semibold text-emerald-400 mb-2">Success!</h4>
            <p className="text-sm text-slate-400">{action} completed successfully</p>
          </>
        )}

        {isError && (
          <>
            <AlertTriangle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h4 className="text-lg font-semibold text-red-400 mb-2">Transaction Failed</h4>
            <p className="text-sm text-slate-400 mb-4">
              {error?.message || 'An error occurred'}
            </p>
            <button
              onClick={onReset}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Risk threshold slider
 */
const ThresholdSlider: React.FC<{
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const riskLevel = getRiskLevelLabel(value);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">
          Risk Threshold
        </label>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${riskLevel.color}`}>
            {riskLevel.label}
          </span>
          <span className="text-lg font-bold text-white">{value}</span>
        </div>
      </div>

      {/* Custom slider */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-3 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: getSliderGradient(value),
          }}
        />
        
        {/* Tick marks */}
        <div className="flex justify-between px-1 mt-1">
          {[0, 25, 50, 75, 100].map((tick) => (
            <span
              key={tick}
              className={`text-xs ${
                tick <= value ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="flex items-start space-x-2 p-3 bg-slate-800/50 rounded-lg">
        <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-400">
          AI will automatically vote on proposals with a risk score{' '}
          <span className="text-white font-medium">below {value}</span>.{' '}
          {riskLevel.description}
        </p>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const DelegationCard: React.FC<DelegationCardProps> = ({
  daoAddress,
  className = '',
  onStatusChange,
  compact = false,
}) => {
  const { isConnected, address } = useAccount();
  
  // Delegation hooks
  const { data: status, isLoading: isLoadingStatus, refetch } = useDelegationStatus(daoAddress);
  const { delegate, isPending: isDelegatePending, isConfirming: isDelegateConfirming, isSuccess: isDelegateSuccess, isError: isDelegateError, error: delegateError, reset: resetDelegate } = useDelegateVote(daoAddress);
  const { revoke, isPending: isRevokePending, isConfirming: isRevokeConfirming, isSuccess: isRevokeSuccess, isError: isRevokeError, error: revokeError, reset: resetRevoke } = useRevokeDelegation(daoAddress);
  const { update, isPending: isUpdatePending, isConfirming: isUpdateConfirming, isSuccess: isUpdateSuccess, isError: isUpdateError, error: updateError, reset: resetUpdate } = useUpdateThreshold(daoAddress);

  // Local state
  const [threshold, setThreshold] = useState(50);
  const [showSettings, setShowSettings] = useState(false);

  // Sync threshold with on-chain value
  useEffect(() => {
    if (status?.riskThreshold) {
      setThreshold(status.riskThreshold);
    }
  }, [status?.riskThreshold]);

  // Notify parent of status changes
  useEffect(() => {
    if (onStatusChange && status) {
      onStatusChange(status.isDelegated);
    }
  }, [status?.isDelegated, onStatusChange]);

  // Refetch after successful transactions
  useEffect(() => {
    if (isDelegateSuccess || isRevokeSuccess || isUpdateSuccess) {
      refetch();
    }
  }, [isDelegateSuccess, isRevokeSuccess, isUpdateSuccess, refetch]);

  // Handlers
  const handleEnable = useCallback(() => {
    delegate(threshold, false);
  }, [delegate, threshold]);

  const handleUpdate = useCallback(() => {
    update(threshold);
    setShowSettings(false);
  }, [update, threshold]);

  const handleRevoke = useCallback(() => {
    revoke();
  }, [revoke]);

  // Combined transaction states
  const isAnyPending = isDelegatePending || isRevokePending || isUpdatePending;
  const isAnyConfirming = isDelegateConfirming || isRevokeConfirming || isUpdateConfirming;
  const isAnySuccess = isDelegateSuccess || isRevokeSuccess || isUpdateSuccess;
  const isAnyError = isDelegateError || isRevokeError || isUpdateError;
  const anyError = delegateError || revokeError || updateError;
  const currentAction = isDelegatePending || isDelegateConfirming
    ? 'Enable AI Guard'
    : isRevokePending || isRevokeConfirming
    ? 'Revoke Delegation'
    : 'Update Settings';

  const resetAll = useCallback(() => {
    resetDelegate();
    resetRevoke();
    resetUpdate();
  }, [resetDelegate, resetRevoke, resetUpdate]);

  // ============================================
  // RENDER
  // ============================================

  // Not connected state
  if (!isConnected) {
    return (
      <div className={`bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-slate-700/50 rounded-lg">
            <ShieldOff className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Auto-Pilot</h3>
            <p className="text-xs text-slate-400">Connect wallet to manage</p>
          </div>
        </div>
        <p className="text-sm text-slate-400 text-center py-4">
          Connect your wallet to enable AI voting delegation
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoadingStatus) {
    return (
      <div className={`bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  const isDelegated = status?.isDelegated ?? false;

  return (
    <div className={`relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl border ${isDelegated ? 'border-emerald-500/30' : 'border-slate-700/50'} overflow-hidden ${className}`}>
      {/* Transaction overlay */}
      <AnimatePresence>
        {(isAnyPending || isAnyConfirming || isAnySuccess || isAnyError) && (
          <TransactionStatus
            isPending={isAnyPending}
            isConfirming={isAnyConfirming}
            isSuccess={isAnySuccess}
            isError={isAnyError}
            error={anyError}
            action={currentAction}
            onReset={resetAll}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isDelegated ? 'bg-emerald-500/20' : 'bg-slate-700/50'}`}>
              {isDelegated ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <Shield className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white flex items-center space-x-2">
                <span>AI Auto-Pilot</span>
                {isDelegated && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                    Active
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <StatusDot active={isDelegated} />
                <span>{isDelegated ? 'Protecting your votes' : 'Not enabled'}</span>
              </div>
            </div>
          </div>

          {/* Settings toggle (when delegated) */}
          {isDelegated && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <Settings className={`w-5 h-5 ${showSettings ? 'text-indigo-400' : 'text-slate-400'}`} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* When not delegated - Show enable controls */}
        {!isDelegated && (
          <>
            <ThresholdSlider
              value={threshold}
              onChange={setThreshold}
              disabled={false}
            />

            <button
              onClick={handleEnable}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-medium transition-all"
            >
              <Power className="w-5 h-5" />
              <span>Enable AI Guard</span>
            </button>
          </>
        )}

        {/* When delegated - Show status and controls */}
        {isDelegated && (
          <>
            {/* Current settings */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
              <div>
                <p className="text-xs text-slate-400">Current Threshold</p>
                <p className="text-2xl font-bold text-white">{status?.riskThreshold}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Status</p>
                <p className={`text-sm font-medium ${getRiskLevelLabel(status?.riskThreshold ?? 50).color}`}>
                  {getRiskLevelLabel(status?.riskThreshold ?? 50).label}
                </p>
              </div>
            </div>

            {/* Settings panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-4"
                >
                  <ThresholdSlider
                    value={threshold}
                    onChange={setThreshold}
                    disabled={false}
                  />

                  {threshold !== status?.riskThreshold && (
                    <button
                      onClick={handleUpdate}
                      className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-all"
                    >
                      <Zap className="w-5 h-5" />
                      <span>Update Threshold</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Revoke button */}
            <button
              onClick={handleRevoke}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-slate-700/50 hover:bg-red-900/30 text-slate-300 hover:text-red-400 border border-slate-600 hover:border-red-500/30 rounded-xl font-medium transition-all"
            >
              <PowerOff className="w-5 h-5" />
              <span>Revoke AI Access</span>
            </button>
          </>
        )}

        {/* Delegation info */}
        {isDelegated && status?.delegatedAt && (
          <p className="text-xs text-slate-500 text-center">
            Delegated since{' '}
            {new Date(status.delegatedAt * 1000).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default DelegationCard;
