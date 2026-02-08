/**
 * Proposal Routes
 * 
 * Express router for proposal-related endpoints
 */

import { Router } from 'express';
import {
  getProposals,
  getProposalById,
  createProposal,
  triggerAnalysis,
  simulateProposal,
  triggerMockProposal,
  getReviewQueue,
} from '../controllers/proposalController';

const router = Router();

// GET /api/proposals - Get all proposals
router.get('/', getProposals);

// GET /api/proposals/review-queue - Get proposals needing review
router.get('/review-queue', getReviewQueue);

// GET /api/proposals/:id - Get single proposal with reasoning
router.get('/:id', getProposalById);

// POST /api/proposals - Create a new proposal
router.post('/', createProposal);

// POST /api/proposals/simulate - Simulate a draft (stateless)
router.post('/simulate', simulateProposal);

// POST /api/proposals/mock - Trigger mock event (dev only)
router.post('/mock', triggerMockProposal);

// POST /api/proposals/:id/analyze - Trigger analysis for a proposal
router.post('/:id/analyze', triggerAnalysis);

export default router;
