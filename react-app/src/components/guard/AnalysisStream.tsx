/**
 * AnalysisStream Component
 * 
 * Terminal-style live streaming display for AI analysis progress.
 * Connects to Server-Sent Events endpoint and displays real-time logs.
 * 
 * Features:
 * - Dark terminal aesthetic with green text on black
 * - Auto-scrolling as new logs arrive
 * - Status indicator (connecting, streaming, complete, error)
 * - Parses SSE JSON data for progress updates
 * - Triggers callback on completion to refetch analysis
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Loader2, CheckCircle2, XCircle, Wifi, WifiOff } from 'lucide-react';
import { apiUrl } from '../../config/api';
import type { AnalysisProgress } from '../../types/analysis';

// ============================================
// TYPES
// ============================================

type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'progress' | 'success' | 'error' | 'system';
  message: string;
  stage?: string;
  progress?: number;
}

interface AnalysisStreamProps {
  /** Proposal ID to stream analysis for */
  proposalId: string;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Callback when analysis completes */
  onComplete?: (result: AnalysisProgress['result']) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Custom className */
  className?: string;
}

// ============================================
// HELPERS
// ============================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getStageMessage(stage: string): string {
  const messages: Record<string, string> = {
    queued: 'Analysis queued, waiting for processing...',
    reputation: 'Analyzing proposer reputation and on-chain history...',
    nlp: 'Processing proposal text with NLP models...',
    financial: 'Evaluating financial implications and risk factors...',
    mediator: 'Computing final risk assessment...',
    complete: 'Analysis complete!',
  };
  return messages[stage] || `Processing stage: ${stage}`;
}

// ============================================
// COMPONENT
// ============================================

const AnalysisStream: React.FC<AnalysisStreamProps> = ({
  proposalId,
  autoConnect = true,
  onComplete,
  onError,
  className = '',
}) => {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string>('');
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Add a log entry
  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    setLogs(prev => [...prev, {
      ...entry,
      id: generateLogId(),
      timestamp: new Date(),
    }]);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');
    setLogs([]);
    setProgress(0);
    
    addLog({ type: 'system', message: 'Connecting to AI Guard analysis stream...' });

    const url = apiUrl(`/api/agent/events/${proposalId}`);
    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setStatus('streaming');
      addLog({ type: 'success', message: 'Connected! Waiting for analysis events...' });
    };

    eventSource.onmessage = (event) => {
      try {
        const data: AnalysisProgress = JSON.parse(event.data);
        
        switch (data.type) {
          case 'processing':
            setStatus('streaming');
            addLog({ 
              type: 'info', 
              message: data.message || 'Processing started...',
              stage: data.stage,
            });
            break;

          case 'progress':
            setProgress(data.progress || 0);
            setCurrentStage(data.stage || '');
            addLog({ 
              type: 'progress', 
              message: data.message || getStageMessage(data.stage || ''),
              stage: data.stage,
              progress: data.progress,
            });
            break;

          case 'complete':
            setStatus('complete');
            setProgress(100);
            addLog({ 
              type: 'success', 
              message: `✓ Analysis complete! Risk Score: ${data.result?.compositeScore}, Recommendation: ${data.result?.recommendation}`,
            });
            addLog({
              type: 'system',
              message: `Processing time: ${data.processingTimeMs}ms`,
            });
            
            // Close connection
            eventSource.close();
            
            // Trigger callback
            if (onComplete && data.result) {
              onComplete(data.result);
            }
            break;

          case 'failed':
            setStatus('error');
            addLog({ 
              type: 'error', 
              message: `✗ Analysis failed: ${data.error || 'Unknown error'}`,
            });
            
            eventSource.close();
            
            if (onError) {
              onError(data.error || 'Analysis failed');
            }
            break;
        }
      } catch (parseError) {
        console.error('Failed to parse SSE event:', parseError);
        addLog({ type: 'error', message: `Parse error: ${event.data}` });
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      setStatus('error');
      addLog({ type: 'error', message: 'Connection lost. Analysis may still be processing...' });
      
      eventSource.close();
      
      if (onError) {
        onError('Connection error');
      }
    };

    return () => {
      eventSource.close();
    };
  }, [proposalId, addLog, onComplete, onError]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStatus('idle');
    addLog({ type: 'system', message: 'Disconnected from stream.' });
  }, [addLog]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && proposalId) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [autoConnect, proposalId, connect]);

  // Get status indicator
  const getStatusIndicator = () => {
    switch (status) {
      case 'connecting':
        return (
          <div className="flex items-center space-x-2 text-yellow-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting...</span>
          </div>
        );
      case 'streaming':
        return (
          <div className="flex items-center space-x-2 text-green-400">
            <Wifi className="w-4 h-4" />
            <span>Live</span>
          </div>
        );
      case 'complete':
        return (
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2 text-red-400">
            <XCircle className="w-4 h-4" />
            <span>Error</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2 text-slate-500">
            <WifiOff className="w-4 h-4" />
            <span>Idle</span>
          </div>
        );
    }
  };

  // Get log entry color
  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'info': return 'text-cyan-400';
      case 'progress': return 'text-green-400';
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'system': return 'text-slate-500';
      default: return 'text-green-400';
    }
  };

  return (
    <div className={`bg-[#0d1117] rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-slate-700/50">
        <div className="flex items-center space-x-3">
          <Terminal className="w-5 h-5 text-green-400" />
          <span className="font-mono text-sm text-slate-300">AI Guard Analysis</span>
        </div>
        <div className="flex items-center space-x-4">
          {/* Progress bar */}
          {status === 'streaming' && (
            <div className="flex items-center space-x-2">
              <div className="w-32 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-xs font-mono text-slate-400">{progress}%</span>
            </div>
          )}
          {/* Status indicator */}
          <div className="text-xs font-mono">
            {getStatusIndicator()}
          </div>
        </div>
      </div>

      {/* Terminal body */}
      <div className="h-[300px] overflow-y-auto p-4 font-mono text-sm bg-[#0d1117]">
        <AnimatePresence>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start space-x-3 mb-2 ${getLogColor(log.type)}`}
            >
              <span className="text-slate-600 flex-shrink-0">
                [{formatTime(log.timestamp)}]
              </span>
              <span className="break-words">
                {log.progress !== undefined && (
                  <span className="text-slate-500 mr-2">[{log.progress}%]</span>
                )}
                {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Blinking cursor when streaming */}
        {status === 'streaming' && (
          <motion.span
            className="inline-block w-2 h-4 bg-green-400"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
        
        <div ref={logsEndRef} />
      </div>

      {/* Footer with actions */}
      {(status === 'idle' || status === 'error') && (
        <div className="px-4 py-3 bg-[#161b22] border-t border-slate-700/50">
          <button
            onClick={connect}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            {status === 'error' ? 'Retry Connection' : 'Start Analysis Stream'}
          </button>
        </div>
      )}

      {/* Completion badge */}
      {status === 'complete' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 bg-emerald-900/30 border-t border-emerald-700/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Analysis Finished</span>
            </div>
            <span className="text-sm text-slate-400">
              Results are now available
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AnalysisStream;
