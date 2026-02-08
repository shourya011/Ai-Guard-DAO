/**
 * Proposal Controller
 * 
 * Handles HTTP endpoints for proposal-related operations.
 * Response formats are designed to match the frontend API client expectations.
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/database';
import { intelligenceService } from '../services/intelligenceService';
import { blockchainListener } from '../services/blockchainListener';
import { eventBus, EVENTS } from '../events/eventBus';

// Types matching frontend expectations
interface FrontendProposal {
  id: string;
  title: string;
  description: string;
  proposer_address: string;
  status: 'pending' | 'analyzing' | 'needs_review' | 'auto_approved' | 'auto_rejected' | 'voted';
  risk_score: number | null;
  risk_category: 'low' | 'medium' | 'high' | null;
  verdict: string | null;
  created_at: string;
  updated_at: string;
}

interface ProposalSnapshot {
  executive_summary: string;
  deliverables: string[];
  timeline: string;
  budget_breakdown: Record<string, any>;
  risk_profile: {
    agent_alerts: string[];
  };
}

// Database row types
interface DbProposal {
  id: string;
  onchain_proposal_id: number;
  ipfs_hash: string;
  title: string;
  description: string;
  proposer_wallet: string;
  status: string;
  composite_risk_score: number | null;
  created_at: string;
  analyzed_at: string | null;
  updated_at?: string;
}

interface DbReasoningReport {
  id: string;
  proposal_id: string;
  agent_1_score: number;
  agent_2_score: number;
  agent_3_score: number;
  composite_risk_score: number;
  agent_1_reasoning?: string;
  agent_2_reasoning?: string;
  agent_3_reasoning?: string;
  snapshot_json: any;
  red_flags: string[];
}

/**
 * Transform database row to frontend format
 */
function transformProposal(row: DbProposal): FrontendProposal {
  let riskCategory: 'low' | 'medium' | 'high' | null = null;
  if (row.composite_risk_score !== null) {
    if (row.composite_risk_score < 30) riskCategory = 'low';
    else if (row.composite_risk_score < 70) riskCategory = 'medium';
    else riskCategory = 'high';
  }

  return {
    id: row.id,
    title: row.title || 'Untitled Proposal',
    description: row.description || '',
    proposer_address: row.proposer_wallet,
    status: row.status as FrontendProposal['status'],
    risk_score: row.composite_risk_score,
    risk_category: riskCategory,
    verdict: row.status === 'auto_approved' ? 'APPROVED' : 
             row.status === 'auto_rejected' ? 'REJECTED' : 
             row.status === 'needs_review' ? 'NEEDS_REVIEW' : null,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
  };
}

/**
 * GET /api/proposals
 * Get all proposals - returns direct array for frontend
 */
export async function getProposals(req: Request, res: Response): Promise<void> {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let queryText = 'SELECT * FROM proposals';
    const params: any[] = [];
    
    if (status) {
      queryText += ' WHERE status = $1';
      params.push(status);
    }
    
    queryText += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const proposals = await query<DbProposal>(queryText, params);
    
    // Transform to frontend format and return direct array
    const transformed = proposals.map(transformProposal);
    res.json(transformed);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.json([]); // Return empty array on error for frontend compatibility
  }
}

/**
 * GET /api/proposals/:id
 * Get a single proposal with its analysis - returns direct object for frontend
 */
export async function getProposalById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    const proposal = await queryOne<DbProposal>(
      'SELECT * FROM proposals WHERE id = $1',
      [id]
    );
    
    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }
    
    // Also fetch the reasoning report
    const report = await queryOne<DbReasoningReport>(
      'SELECT * FROM reasoning_reports WHERE proposal_id = $1',
      [id]
    );
    
    // Build the detailed response
    const transformed = transformProposal(proposal);
    const detail: any = { ...transformed };

    if (report) {
      detail.analysis = {
        proposal_id: report.proposal_id,
        agent_1_score: report.agent_1_score,
        agent_2_score: report.agent_2_score,
        agent_3_score: report.agent_3_score,
        composite_risk_score: report.composite_risk_score,
        agent_1_reasoning: report.agent_1_reasoning || '',
        agent_2_reasoning: report.agent_2_reasoning || '',
        agent_3_reasoning: report.agent_3_reasoning || '',
        red_flags: report.red_flags || [],
        snapshot: report.snapshot_json || {
          executive_summary: '',
          deliverables: [],
          timeline: '',
          budget_breakdown: {},
          risk_profile: { agent_alerts: [] },
        },
      };
      detail.snapshot = report.snapshot_json;
    }
    
    res.json(detail);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
}

/**
 * POST /api/proposals
 * Create a new proposal and queue it for analysis
 */
export async function createProposal(req: Request, res: Response): Promise<void> {
  try {
    const { title, description, proposer_address } = req.body;
    
    if (!title || !description) {
      res.status(400).json({ error: 'title and description are required' });
      return;
    }
    
    const id = uuidv4();
    const proposer = proposer_address || '0x0000000000000000000000000000000000000000';
    
    // Insert the proposal
    await query(
      `INSERT INTO proposals (id, title, description, proposer_wallet, status, created_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())`,
      [id, title, description, proposer]
    );
    
    // Fetch the created proposal
    const created = await queryOne<DbProposal>(
      'SELECT * FROM proposals WHERE id = $1',
      [id]
    );
    
    if (!created) {
      res.status(500).json({ error: 'Failed to create proposal' });
      return;
    }
    
    // Emit event to trigger analysis
    eventBus.emit(EVENTS.PROPOSAL_CREATED, {
      proposalId: id,
      proposalText: `${title}\n\n${description}`,
      walletAddress: proposer,
    });
    
    res.status(201).json(transformProposal(created));
  } catch (error) {
    console.error('Error creating proposal:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
}

/**
 * POST /api/proposals/:id/analyze
 * Trigger analysis for a specific proposal
 */
export async function triggerAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    // Get the proposal
    const proposal = await queryOne<DbProposal>(
      'SELECT * FROM proposals WHERE id = $1',
      [id]
    );
    
    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }
    
    // Update status to analyzing
    await query(
      "UPDATE proposals SET status = 'analyzing' WHERE id = $1",
      [id]
    );
    
    // Call the intelligence service
    const result = await intelligenceService.analyze({
      proposal_id: id,
      proposal_text: `${proposal.title}\n\n${proposal.description}`,
      wallet_address: proposal.proposer_wallet,
    });
    
    // Store the analysis result
    await query(
      `INSERT INTO reasoning_reports 
       (id, proposal_id, agent_1_score, agent_2_score, agent_3_score, 
        composite_risk_score, agent_1_reasoning, agent_2_reasoning, agent_3_reasoning,
        snapshot_json, red_flags, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (proposal_id) 
       DO UPDATE SET 
         agent_1_score = $3, agent_2_score = $4, agent_3_score = $5,
         composite_risk_score = $6, agent_1_reasoning = $7, agent_2_reasoning = $8,
         agent_3_reasoning = $9, snapshot_json = $10, red_flags = $11`,
      [
        uuidv4(),
        id,
        result.agent_1_score,
        result.agent_2_score,
        result.agent_3_score,
        result.composite_risk_score,
        result.agent_1_reasoning,
        result.agent_2_reasoning,
        result.agent_3_reasoning,
        JSON.stringify(result.snapshot),
        result.red_flags,
      ]
    );
    
    // Determine new status based on risk score
    let newStatus = 'needs_review';
    if (result.composite_risk_score < 30) {
      newStatus = 'auto_approved';
    } else if (result.composite_risk_score >= 70) {
      newStatus = 'auto_rejected';
    }
    
    // Update proposal with results
    await query(
      `UPDATE proposals 
       SET status = $1, composite_risk_score = $2, analyzed_at = NOW()
       WHERE id = $3`,
      [newStatus, result.composite_risk_score, id]
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error triggering analysis:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
}

/**
 * POST /api/proposals/simulate
 * Simulate a proposal draft (stateless - does not save to DB)
 */
export async function simulateProposal(req: Request, res: Response): Promise<void> {
  try {
    const { draft_text } = req.body;
    
    if (!draft_text || typeof draft_text !== 'string') {
      res.status(400).json({ error: 'draft_text is required' });
      return;
    }
    
    const result = await intelligenceService.simulate({ draft_text });
    res.json(result);
  } catch (error) {
    console.error('Error simulating proposal:', error);
    res.status(500).json({ error: 'Simulation failed' });
  }
}

/**
 * POST /api/proposals/mock
 * Trigger a mock proposal event for testing
 */
export async function triggerMockProposal(req: Request, res: Response): Promise<void> {
  try {
    const { 
      proposalId = Math.floor(Math.random() * 10000),
      proposer = '0x742d35Cc6634C0532925a3b844Bc9e7595f5b123',
      ipfsHash = 'QmTest' + Date.now(),
      title = 'Test Proposal',
      description = 'This is a test proposal for the AI Guard Dog system.',
    } = req.body;
    
    const dbId = await blockchainListener.triggerMockEvent({
      proposalId,
      proposer,
      ipfsHash,
      title,
      description,
    });
    
    res.json({
      success: true,
      message: 'Mock event triggered successfully',
      data: {
        databaseId: dbId,
        onchainProposalId: proposalId,
      },
    });
  } catch (error) {
    console.error('Error triggering mock event:', error);
    res.status(500).json({ error: 'Failed to trigger mock event' });
  }
}

/**
 * GET /api/proposals/review-queue
 * Get proposals that need human review
 */
export async function getReviewQueue(req: Request, res: Response): Promise<void> {
  try {
    const queue = await query<DbProposal & { priority?: number; queued_at?: string; snapshot_json?: any }>(
      `SELECT p.*, rq.priority, rq.created_at as queued_at, rr.snapshot_json
       FROM proposals p
       JOIN review_queue rq ON p.id = rq.proposal_id
       LEFT JOIN reasoning_reports rr ON p.id = rr.proposal_id
       WHERE rq.reviewed_at IS NULL
       ORDER BY rq.priority ASC, rq.created_at ASC`
    );
    
    // Transform and return
    const transformed = queue.map(row => ({
      ...transformProposal(row),
      priority: row.priority,
      queued_at: row.queued_at,
      snapshot: row.snapshot_json,
    }));
    
    res.json(transformed);
  } catch (error) {
    console.error('Error fetching review queue:', error);
    res.json([]); // Return empty array on error
  }
}
