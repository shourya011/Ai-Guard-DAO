/**
 * AI Guard DAO - Backend API Server
 * 
 * This server provides REST API endpoints for the frontend to interact
 * with the smart contracts. It handles:
 * - Contract interactions
 * - Event listening
 * - WebSocket notifications
 * - Mock AI risk analysis (for demo)
 * 
 * ENDPOINTS:
 * - GET  /api/health - Health check
 * - GET  /api/contracts - Get deployed contract addresses
 * - GET  /api/proposals - Get all proposals
 * - GET  /api/proposals/:id - Get specific proposal
 * - POST /api/delegate - Delegate voting power
 * - POST /api/revoke - Revoke delegation
 * - POST /api/vote - Cast manual vote (high-risk approval)
 * - GET  /api/delegation/:user/:dao - Check delegation status
 * - GET  /api/audit/:user - Get user's audit history
 * - WS   /ws - WebSocket for real-time events
 */

const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Middleware
app.use(cors());
app.use(express.json());

// =============================================================================
// CONFIGURATION
// =============================================================================

const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

// Contract addresses (loaded from deployment file or environment)
let CONTRACT_ADDRESSES = {
  VotingAgent: process.env.VOTING_AGENT_ADDRESS || '',
  AuditLogger: process.env.AUDIT_LOGGER_ADDRESS || '',
  DAOGovernor: process.env.DAO_GOVERNOR_ADDRESS || '',
  MockToken: process.env.MOCK_TOKEN_ADDRESS || ''
};

// Provider and wallet setup
let provider;
let backendWallet;
let contracts = {};

// =============================================================================
// CONTRACT INITIALIZATION
// =============================================================================

/**
 * Load contract ABIs from artifacts
 */
function loadABI(contractName) {
  const abiPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  
  if (fs.existsSync(abiPath)) {
    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    return artifact.abi;
  }
  
  // Fallback: try abis folder
  const fallbackPath = path.join(__dirname, '..', 'abis', `${contractName}.json`);
  if (fs.existsSync(fallbackPath)) {
    const artifact = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    return artifact.abi || artifact;
  }
  
  console.warn(`[Server] ABI not found for ${contractName}`);
  return [];
}

/**
 * Load deployment addresses from file
 */
function loadDeploymentAddresses() {
  const deploymentPath = path.join(__dirname, '..', 'deployments', 'latest-localhost.json');
  
  if (fs.existsSync(deploymentPath)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    CONTRACT_ADDRESSES = {
      VotingAgent: deployment.contracts?.VotingAgent || '',
      AuditLogger: deployment.contracts?.AuditLogger || '',
      DAOGovernor: deployment.contracts?.DAOGovernor || '',
      MockToken: deployment.contracts?.MockToken || ''
    };
    console.log('[Server] Loaded deployment addresses:', CONTRACT_ADDRESSES);
    return true;
  }
  
  console.warn('[Server] No deployment file found. Run deploy script first.');
  return false;
}

/**
 * Initialize blockchain connection and contracts
 */
async function initializeContracts() {
  try {
    // Setup provider
    provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Setup backend wallet (for AI voting operations)
    const privateKey = process.env.BACKEND_PRIVATE_KEY || 
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default Hardhat account
    backendWallet = new ethers.Wallet(privateKey, provider);
    
    console.log('[Server] Backend wallet:', backendWallet.address);
    
    // Load deployment addresses
    loadDeploymentAddresses();
    
    // Initialize contract instances
    const votingAgentABI = loadABI('VotingAgent');
    const auditLoggerABI = loadABI('AuditLogger');
    const daoGovernorABI = loadABI('DAOGovernor');
    const mockTokenABI = loadABI('MockToken');
    
    if (CONTRACT_ADDRESSES.VotingAgent) {
      contracts.votingAgent = new ethers.Contract(
        CONTRACT_ADDRESSES.VotingAgent,
        votingAgentABI,
        backendWallet
      );
    }
    
    if (CONTRACT_ADDRESSES.AuditLogger) {
      contracts.auditLogger = new ethers.Contract(
        CONTRACT_ADDRESSES.AuditLogger,
        auditLoggerABI,
        provider
      );
    }
    
    if (CONTRACT_ADDRESSES.DAOGovernor) {
      contracts.daoGovernor = new ethers.Contract(
        CONTRACT_ADDRESSES.DAOGovernor,
        daoGovernorABI,
        provider
      );
    }
    
    if (CONTRACT_ADDRESSES.MockToken) {
      contracts.mockToken = new ethers.Contract(
        CONTRACT_ADDRESSES.MockToken,
        mockTokenABI,
        provider
      );
    }
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('[Server] Contracts initialized successfully');
    return true;
    
  } catch (error) {
    console.error('[Server] Failed to initialize contracts:', error.message);
    return false;
  }
}

/**
 * Setup event listeners for real-time updates
 */
function setupEventListeners() {
  if (contracts.daoGovernor) {
    contracts.daoGovernor.on('ProposalCreated', (proposalId, proposer, targets, values, calldatas, description, startBlock, endBlock) => {
      console.log(`[Event] New proposal created: ${proposalId}`);
      
      // Broadcast to WebSocket clients
      broadcastEvent('proposalCreated', {
        proposalId: proposalId.toString(),
        proposer,
        description,
        startBlock: startBlock.toString(),
        endBlock: endBlock.toString()
      });
      
      // Trigger AI analysis (mock for demo)
      analyzeProposal(proposalId, proposer, description);
    });
    
    contracts.daoGovernor.on('VoteCast', (voter, proposalId, support, weight, reason) => {
      console.log(`[Event] Vote cast on proposal ${proposalId} by ${voter}`);
      
      broadcastEvent('voteCast', {
        proposalId: proposalId.toString(),
        voter,
        support,
        weight: weight.toString(),
        reason
      });
    });
  }
  
  if (contracts.votingAgent) {
    contracts.votingAgent.on('VoteCastByAI', (proposalId, user, support, riskScore) => {
      console.log(`[Event] AI voted on proposal ${proposalId} for user ${user}`);
      
      broadcastEvent('aiVoteCast', {
        proposalId: proposalId.toString(),
        user,
        support,
        riskScore: riskScore.toString()
      });
    });
    
    contracts.votingAgent.on('HighRiskProposalDetected', (proposalId, user, riskScore) => {
      console.log(`[Event] High risk proposal detected: ${proposalId}, risk: ${riskScore}`);
      
      broadcastEvent('highRiskAlert', {
        proposalId: proposalId.toString(),
        user,
        riskScore: riskScore.toString()
      });
    });
    
    contracts.votingAgent.on('VotingPowerDelegated', (user, daoGovernor, riskThreshold) => {
      console.log(`[Event] User ${user} delegated to ${daoGovernor} with threshold ${riskThreshold}`);
      
      broadcastEvent('delegated', {
        user,
        daoGovernor,
        riskThreshold: riskThreshold.toString()
      });
    });
  }
}

// =============================================================================
// WEBSOCKET HANDLING
// =============================================================================

const wsClients = new Set();

wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected');
  wsClients.add(ws);
  
  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
    wsClients.delete(ws);
  });
  
  ws.on('message', (message) => {
    console.log('[WebSocket] Message received:', message.toString());
  });
});

function broadcastEvent(eventType, data) {
  const message = JSON.stringify({ type: eventType, data, timestamp: Date.now() });
  
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// =============================================================================
// AI ANALYSIS (Mock for Demo)
// =============================================================================

/**
 * Mock AI analysis for proposals
 * In production, this would call your actual AI service
 */
async function analyzeProposal(proposalId, proposer, description) {
  console.log(`[AI] Analyzing proposal ${proposalId}...`);
  
  // Simulate analysis delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock risk scoring based on keywords
  let riskScore = 20; // Default low risk
  
  const descLower = description.toLowerCase();
  
  // High risk indicators
  if (descLower.includes('emergency') || descLower.includes('urgent')) riskScore += 30;
  if (descLower.includes('transfer') && descLower.includes('new wallet')) riskScore += 40;
  if (descLower.includes('immediate')) riskScore += 20;
  
  // Medium risk indicators
  if (descLower.includes('marketing')) riskScore += 15;
  if (descLower.includes('unknown')) riskScore += 20;
  
  // Low risk indicators (reduce score)
  if (descLower.includes('treasury') && descLower.includes('diversification')) riskScore -= 10;
  if (descLower.includes('grants') || descLower.includes('developer')) riskScore -= 5;
  if (descLower.includes('infrastructure')) riskScore -= 5;
  
  // Clamp between 0-100
  riskScore = Math.max(0, Math.min(100, riskScore));
  
  console.log(`[AI] Proposal ${proposalId} risk score: ${riskScore}`);
  
  // Broadcast analysis result
  broadcastEvent('analysisComplete', {
    proposalId: proposalId.toString(),
    riskScore,
    recommendation: riskScore < 40 ? 'approve' : riskScore < 70 ? 'review' : 'reject'
  });
  
  return { riskScore, recommendation: riskScore < 40 ? 1 : 0 };
}

// =============================================================================
// API ROUTES
// =============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    contracts: {
      votingAgent: !!contracts.votingAgent,
      auditLogger: !!contracts.auditLogger,
      daoGovernor: !!contracts.daoGovernor,
      mockToken: !!contracts.mockToken
    }
  });
});

// Get contract addresses
app.get('/api/contracts', (req, res) => {
  res.json(CONTRACT_ADDRESSES);
});

// Get all proposals
app.get('/api/proposals', async (req, res) => {
  try {
    if (!contracts.daoGovernor) {
      return res.status(503).json({ error: 'Contracts not initialized' });
    }
    
    const proposalCount = await contracts.daoGovernor.proposalCount();
    const proposals = [];
    
    for (let i = 1; i <= proposalCount; i++) {
      const proposal = await contracts.daoGovernor.getProposal(i);
      const description = await contracts.daoGovernor.getProposalDescription(i);
      const state = await contracts.daoGovernor.state(i);
      
      proposals.push({
        id: proposal.id.toString(),
        proposer: proposal.proposer,
        startBlock: proposal.startBlock.toString(),
        endBlock: proposal.endBlock.toString(),
        forVotes: proposal.forVotes.toString(),
        againstVotes: proposal.againstVotes.toString(),
        abstainVotes: proposal.abstainVotes.toString(),
        canceled: proposal.canceled,
        executed: proposal.executed,
        description,
        state: ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'][state]
      });
    }
    
    res.json(proposals);
  } catch (error) {
    console.error('[API] Error fetching proposals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific proposal
app.get('/api/proposals/:id', async (req, res) => {
  try {
    if (!contracts.daoGovernor) {
      return res.status(503).json({ error: 'Contracts not initialized' });
    }
    
    const proposalId = req.params.id;
    const proposal = await contracts.daoGovernor.getProposal(proposalId);
    const description = await contracts.daoGovernor.getProposalDescription(proposalId);
    const actions = await contracts.daoGovernor.getProposalActions(proposalId);
    const state = await contracts.daoGovernor.state(proposalId);
    
    res.json({
      id: proposal.id.toString(),
      proposer: proposal.proposer,
      startBlock: proposal.startBlock.toString(),
      endBlock: proposal.endBlock.toString(),
      forVotes: proposal.forVotes.toString(),
      againstVotes: proposal.againstVotes.toString(),
      abstainVotes: proposal.abstainVotes.toString(),
      canceled: proposal.canceled,
      executed: proposal.executed,
      description,
      targets: actions[0],
      values: actions[1].map(v => v.toString()),
      calldatas: actions[2],
      state: ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'][state]
    });
  } catch (error) {
    console.error('[API] Error fetching proposal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check delegation status
app.get('/api/delegation/:user/:dao', async (req, res) => {
  try {
    if (!contracts.votingAgent) {
      return res.status(503).json({ error: 'Contracts not initialized' });
    }
    
    const { user, dao } = req.params;
    const delegation = await contracts.votingAgent.getDelegation(user, dao);
    
    res.json({
      active: delegation.active,
      riskThreshold: delegation.riskThreshold.toString(),
      delegatedAt: delegation.delegatedAt.toString(),
      requiresApproval: delegation.requiresApproval
    });
  } catch (error) {
    console.error('[API] Error checking delegation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's audit history
app.get('/api/audit/:user', async (req, res) => {
  try {
    if (!contracts.auditLogger) {
      return res.status(503).json({ error: 'Contracts not initialized' });
    }
    
    const { user } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const history = await contracts.auditLogger.getUserAuditHistory(user, limit);
    
    const formattedHistory = history.map(entry => ({
      proposalId: entry.proposalId.toString(),
      daoGovernor: entry.daoGovernor,
      user: entry.user,
      support: entry.support,
      riskScore: entry.riskScore.toString(),
      reportHash: entry.reportHash,
      timestamp: entry.timestamp.toString(),
      wasAutoVote: entry.wasAutoVote
    }));
    
    res.json(formattedHistory);
  } catch (error) {
    console.error('[API] Error fetching audit history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get total statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = {
      totalProposals: 0,
      totalDecisions: 0,
      highRiskFlags: 0,
      activeUsers: 0
    };
    
    if (contracts.daoGovernor) {
      stats.totalProposals = (await contracts.daoGovernor.proposalCount()).toString();
    }
    
    if (contracts.auditLogger) {
      stats.totalDecisions = (await contracts.auditLogger.getTotalDecisions()).toString();
      stats.highRiskFlags = (await contracts.auditLogger.getTotalHighRiskFlags()).toString();
    }
    
    res.json(stats);
  } catch (error) {
    console.error('[API] Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trigger AI analysis manually
app.post('/api/analyze/:proposalId', async (req, res) => {
  try {
    const proposalId = req.params.proposalId;
    const description = await contracts.daoGovernor.getProposalDescription(proposalId);
    const proposal = await contracts.daoGovernor.getProposal(proposalId);
    
    const analysis = await analyzeProposal(proposalId, proposal.proposer, description);
    
    res.json({
      proposalId,
      ...analysis
    });
  } catch (error) {
    console.error('[API] Error analyzing proposal:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function start() {
  console.log('='.repeat(60));
  console.log('🐕 AI Guard DAO - Backend Server');
  console.log('='.repeat(60));
  
  // Initialize contracts
  await initializeContracts();
  
  // Start server
  server.listen(PORT, () => {
    console.log(`\n[Server] HTTP API running on http://localhost:${PORT}`);
    console.log(`[Server] WebSocket running on ws://localhost:${PORT}/ws`);
    console.log('\nAvailable endpoints:');
    console.log('  GET  /api/health          - Health check');
    console.log('  GET  /api/contracts       - Contract addresses');
    console.log('  GET  /api/proposals       - All proposals');
    console.log('  GET  /api/proposals/:id   - Specific proposal');
    console.log('  GET  /api/delegation/:user/:dao - Check delegation');
    console.log('  GET  /api/audit/:user     - User audit history');
    console.log('  GET  /api/stats           - Statistics');
    console.log('  POST /api/analyze/:id     - Trigger AI analysis');
    console.log('');
  });
}

start().catch(console.error);
