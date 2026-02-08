/**
 * Analysis Trigger - Event-Driven Architecture
 * 
 * CRITICAL COMPONENT: This file bridges the blockchain listener to the AI analysis.
 * 
 * Architecture:
 * - Blockchain Listener emits 'new_proposal' event
 * - This module listens and triggers the Intelligence Service
 * - Results are stored in the database
 * - WebSocket updates are sent to the frontend
 * 
 * WHY EventEmitter?
 * - Decouples blockchain listening from AI processing
 * - Allows for easy testing (mock events)
 * - Enables future scaling (could swap to Redis/RabbitMQ)
 */

import { EventEmitter } from 'events';
import { query, queryOne } from '../config/database';
import { intelligenceService, AnalyzeResponse } from '../services/intelligenceService';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

// Event names - centralized for consistency
export const EVENTS = {
  NEW_PROPOSAL: 'new_proposal',
  ANALYSIS_COMPLETE: 'analysis_complete',
  VOTE_CAST: 'vote_cast',
  STATUS_UPDATED: 'status_updated',
};

// Create the global event emitter
export const eventEmitter = new EventEmitter();

// Increase max listeners for production use
eventEmitter.setMaxListeners(50);

// Types
interface Proposal {
  id: string;
  onchain_proposal_id: number;
  title: string;
  description: string;
  proposer_wallet: string;
  status: string;
}

type ProposalStatus = 'PENDING_ANALYSIS' | 'NEEDS_REVIEW' | 'AUTO_APPROVED' | 'AUTO_REJECTED';

/**
 * Handle a new proposal event
 * This is the main orchestration function
 */
async function handleNewProposal(proposalId: string): Promise<void> {
  console.log(`\n⚡ ══════════════════════════════════════════`);
  console.log(`🎯 ANALYSIS TRIGGER ACTIVATED`);
  console.log(`   Proposal ID: ${proposalId}`);
  console.log(`══════════════════════════════════════════════\n`);

  try {
    // Step 1: Retrieve proposal from database
    const proposal = await queryOne<Proposal>(
      'SELECT * FROM proposals WHERE id = $1',
      [proposalId]
    );

    if (!proposal) {
      console.error(`❌ Proposal not found: ${proposalId}`);
      return;
    }

    console.log(`📄 Proposal retrieved: "${proposal.title}"`);

    // Step 2: Call Intelligence Service (Python API)
    console.log(`🧠 Sending to Intelligence Layer...`);
    
    const analysisResult = await intelligenceService.analyze({
      proposal_id: proposal.id,
      proposal_text: `${proposal.title}\n\n${proposal.description}`,
      wallet_address: proposal.proposer_wallet,
    });

    // Step 3: Store results in Reasoning_Reports table
    await storeReasoningReport(proposal.id, analysisResult);

    // Step 4: Determine routing based on risk score (Module B Logic)
    const newStatus = determineRouting(analysisResult.composite_risk_score);
    
    // Step 5: Update proposal status
    await updateProposalStatus(proposal.id, newStatus, analysisResult.composite_risk_score);

    // Step 6: Handle auto-voting if applicable
    if (newStatus === 'AUTO_APPROVED' || newStatus === 'AUTO_REJECTED') {
      await handleAutoVote(proposal, newStatus, analysisResult);
    }

    // Step 7: Emit completion event (for WebSocket broadcast)
    eventEmitter.emit(EVENTS.ANALYSIS_COMPLETE, {
      proposalId: proposal.id,
      status: newStatus,
      riskScore: analysisResult.composite_risk_score,
    });

    // Step 8: Log WebSocket notification (mock for now)
    console.log(`\n📡 [WebSocket] Update sent to Frontend:`);
    console.log(`   {`);
    console.log(`     type: "ANALYSIS_COMPLETE",`);
    console.log(`     proposalId: "${proposal.id}",`);
    console.log(`     status: "${newStatus}",`);
    console.log(`     riskScore: ${analysisResult.composite_risk_score}`);
    console.log(`   }`);

    console.log(`\n✅ ══════════════════════════════════════════`);
    console.log(`🎉 ANALYSIS COMPLETE`);
    console.log(`   Final Status: ${newStatus}`);
    console.log(`══════════════════════════════════════════════\n`);

  } catch (error) {
    console.error(`\n❌ ══════════════════════════════════════════`);
    console.error(`💥 ANALYSIS FAILED for proposal: ${proposalId}`);
    console.error(`   Error: ${error}`);
    console.error(`══════════════════════════════════════════════\n`);
    
    // Update status to indicate failure
    await query(
      `UPDATE proposals SET status = 'NEEDS_REVIEW', updated_at = NOW() WHERE id = $1`,
      [proposalId]
    );
  }
}

/**
 * Store the AI analysis results in the database
 */
async function storeReasoningReport(proposalId: string, result: AnalyzeResponse): Promise<void> {
  const insertQuery = `
    INSERT INTO reasoning_reports (
      id, proposal_id, 
      agent_1_score, agent_2_score, agent_3_score, 
      composite_risk_score,
      agent_1_reasoning, agent_2_reasoning, agent_3_reasoning,
      red_flags, snapshot_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `;

  await query(insertQuery, [
    uuidv4(),
    proposalId,
    result.agent_1_score,
    result.agent_2_score,
    result.agent_3_score,
    result.composite_risk_score,
    result.agent_1_reasoning,
    result.agent_2_reasoning,
    result.agent_3_reasoning,
    JSON.stringify(result.red_flags),
    JSON.stringify(result.snapshot),
  ]);

  console.log(`💾 Reasoning report saved to database`);
}

/**
 * Determine proposal routing based on Module B logic
 * 
 * Risk Thresholds:
 * - 0-19:   AUTO_APPROVED  (Low risk, safe to auto-approve)
 * - 20-79:  NEEDS_REVIEW   (Mid-range, requires human review)
 * - 80-100: AUTO_REJECTED  (High risk, auto-reject)
 */
function determineRouting(riskScore: number): ProposalStatus {
  const { autoApproveMax, autoRejectMin } = config.riskThresholds;

  if (riskScore <= autoApproveMax) {
    console.log(`✅ ROUTING: AUTO_APPROVED (Risk ${riskScore} ≤ ${autoApproveMax})`);
    return 'AUTO_APPROVED';
  } else if (riskScore >= autoRejectMin) {
    console.log(`🚫 ROUTING: AUTO_REJECTED (Risk ${riskScore} ≥ ${autoRejectMin})`);
    return 'AUTO_REJECTED';
  } else {
    console.log(`👀 ROUTING: NEEDS_REVIEW (Risk ${riskScore} in range 20-79)`);
    return 'NEEDS_REVIEW';
  }
}

/**
 * Update proposal status in database
 */
async function updateProposalStatus(
  proposalId: string, 
  status: ProposalStatus, 
  riskScore: number
): Promise<void> {
  await query(
    `UPDATE proposals 
     SET status = $1, composite_risk_score = $2, analyzed_at = NOW(), updated_at = NOW() 
     WHERE id = $3`,
    [status, riskScore, proposalId]
  );
  
  console.log(`📝 Proposal status updated to: ${status}`);

  // If needs review, add to review queue
  if (status === 'NEEDS_REVIEW') {
    await query(
      `INSERT INTO review_queue (id, proposal_id, priority) VALUES ($1, $2, $3)`,
      [uuidv4(), proposalId, calculatePriority(riskScore)]
    );
    console.log(`📋 Added to human review queue`);
  }
}

/**
 * Calculate review priority based on risk score
 * Higher risk = higher priority (lower number)
 */
function calculatePriority(riskScore: number): number {
  if (riskScore >= 70) return 1;  // Urgent
  if (riskScore >= 50) return 3;  // High
  if (riskScore >= 30) return 5;  // Medium
  return 7;                        // Low
}

/**
 * Handle automatic voting for auto-approved/rejected proposals
 */
async function handleAutoVote(
  proposal: Proposal, 
  status: ProposalStatus,
  analysisResult: AnalyzeResponse
): Promise<void> {
  const voteType = status === 'AUTO_APPROVED' ? 'FOR' : 'AGAINST';
  
  console.log(`\n🗳️ AUTO-VOTING: ${voteType}`);
  console.log(`   Calling VotingAgent.sol vote() function...`);
  
  // Record the vote in database
  await query(
    `INSERT INTO vote_records (id, proposal_id, voter_wallet, vote_type, is_ai_vote) 
     VALUES ($1, $2, $3, $4, true)`,
    [uuidv4(), proposal.id, '0x0000000000000000000000000000000000000001', voteType]
  );

  // TODO: Actual blockchain vote will be implemented in Phase 2
  // This would call the VotingAgent contract:
  // const votingAgent = new ethers.Contract(votingAgentAddress, abi, signer);
  // await votingAgent.executeVote(proposal.onchain_proposal_id);

  console.log(`   ✅ Vote recorded in database (blockchain integration pending)`);
  
  eventEmitter.emit(EVENTS.VOTE_CAST, {
    proposalId: proposal.id,
    voteType,
    isAutoVote: true,
  });
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

// Register the main event handler
eventEmitter.on(EVENTS.NEW_PROPOSAL, handleNewProposal);

// Log all events in debug mode
if (config.logLevel === 'debug') {
  eventEmitter.on(EVENTS.ANALYSIS_COMPLETE, (data) => {
    console.log(`📡 Event: ANALYSIS_COMPLETE`, data);
  });

  eventEmitter.on(EVENTS.VOTE_CAST, (data) => {
    console.log(`📡 Event: VOTE_CAST`, data);
  });
}

console.log('⚡ Analysis trigger initialized and listening for events');

export default eventEmitter;
