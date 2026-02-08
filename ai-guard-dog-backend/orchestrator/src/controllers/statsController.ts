/**
 * Stats Controller
 * 
 * Handles dashboard statistics endpoints
 */

import { Request, Response } from 'express';
import { query, queryOne } from '../config/database';

interface StatsRow {
  total_proposals: string;
  pending_review: string;
  auto_approved: string;
  auto_rejected: string;
  fraud_detected: string;
}

/**
 * GET /api/stats
 * Get dashboard statistics
 */
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    // Get proposal counts by status
    const stats = await queryOne<StatsRow>(`
      SELECT 
        COUNT(*) as total_proposals,
        COUNT(*) FILTER (WHERE status = 'NEEDS_REVIEW') as pending_review,
        COUNT(*) FILTER (WHERE status = 'AUTO_APPROVED') as auto_approved,
        COUNT(*) FILTER (WHERE status = 'AUTO_REJECTED') as auto_rejected,
        COUNT(*) FILTER (WHERE composite_risk_score >= 80) as fraud_detected
      FROM proposals
    `);

    // Calculate protected value (mock - would come from blockchain in production)
    const highRiskProposals = await query<{ composite_risk_score: number }>(`
      SELECT composite_risk_score FROM proposals WHERE composite_risk_score >= 70
    `);
    
    // Estimate protected value based on blocked high-risk proposals
    const protectedValue = highRiskProposals.length * 50000; // $50k average per blocked proposal
    const formattedValue = protectedValue >= 1000000 
      ? `$${(protectedValue / 1000000).toFixed(1)}M`
      : `$${(protectedValue / 1000).toFixed(0)}K`;

    res.json({
      total_proposals: parseInt(stats?.total_proposals || '0'),
      pending_review: parseInt(stats?.pending_review || '0'),
      auto_approved: parseInt(stats?.auto_approved || '0'),
      auto_rejected: parseInt(stats?.auto_rejected || '0'),
      fraud_detected: parseInt(stats?.fraud_detected || '0'),
      total_protected_value: formattedValue || '$0',
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return default stats if database not available
    res.json({
      total_proposals: 0,
      pending_review: 0,
      auto_approved: 0,
      auto_rejected: 0,
      fraud_detected: 0,
      total_protected_value: '$0',
    });
  }
}
