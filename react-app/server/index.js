/**
 * AI Guard DAO - Backend API Server
 * 
 * Reads proposal data from Monad DAO contracts.
 * Falls back to mock data if contracts unavailable.
 * 
 * ENDPOINTS:
 * - GET  /api/health     - Connection status
 * - GET  /api/proposals  - All proposals (from chain or mock)
 * - GET  /api/proposals/:id - Single proposal
 * - GET  /api/stats      - Dashboard statistics
 * - POST /api/analyze    - AI-Integration_GuardDAO: Risk analysis endpoint
 */

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const contractService = require('./contractService')

const app = express()
const PORT = process.env.PORT || 5002

// Middleware
app.use(cors())
app.use(express.json())

// =============================================================================
// MOCK DATA FALLBACK
// =============================================================================
// Used when contracts are not connected (development without blockchain)

const MOCK_PROPOSALS = [
  {
    id: 1,
    title: 'Treasury Diversification: Allocate 10% to Stablecoins',
    proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '250 MON',
    deadline: '2026-02-01',
    status: 'active',
    description: 'Proposal to diversify treasury holdings by allocating 10% of funds into stablecoins to reduce volatility exposure.',
    category: 'Treasury',
    forVotes: '1500',
    againstVotes: '200',
    abstainVotes: '50',
    // AI-Integration_GuardDAO: Mock risk data - AI agent should replace
    riskScore: 15,
    riskLevel: 'low',
    redFlags: [],
    details: {
      proposerReputation: 'Established DAO member (12 months)',
      walletAge: '2 years',
      previousProposals: '5 approved, 0 rejected',
      communitySupport: 'High (85% approval)',
      smartContractAudit: 'Verified'
    }
  },
  {
    id: 2,
    title: 'Emergency Dev Fund Request',
    proposer: '0x9c5e8F7B3D92Cc6634C0532925a3b844Bc9e759',
    amount: '50 MON',
    deadline: '2026-01-28',
    status: 'active',
    description: 'Requesting 50 MON for unplanned security audit after potential vulnerability discovered.',
    category: 'Security',
    forVotes: '800',
    againstVotes: '600',
    abstainVotes: '100',
    // AI-Integration_GuardDAO: Mock risk data
    riskScore: 52,
    riskLevel: 'medium',
    redFlags: [
      'New proposer (wallet age: 3 months)',
      'Urgency language detected',
      'Limited community discussion'
    ],
    details: {
      proposerReputation: 'New member (3 months)',
      walletAge: '3 months',
      previousProposals: '0 approved, 0 rejected',
      communitySupport: 'Moderate (62% approval)',
      smartContractAudit: 'N/A'
    }
  },
  {
    id: 3,
    title: 'Strategic Partnership Investment',
    proposer: '0x1a2b3c4d5e6f708090a0b0c0d0e0f01020304050',
    amount: '500 MON',
    deadline: '2026-01-25',
    status: 'active',
    description: 'Transfer 500 MON to new partner for exclusive integration deal. Partner: Anonymous LLC. Immediate transfer requested.',
    category: 'Investment',
    forVotes: '100',
    againstVotes: '1200',
    abstainVotes: '50',
    // AI-Integration_GuardDAO: Mock high-risk data
    riskScore: 94,
    riskLevel: 'critical',
    redFlags: [
      'New wallet (created 2 days ago)',
      'Extremely high requested amount',
      'Recipient wallet has no history',
      'Urgent deadline',
      'No previous on-chain activity',
      'Pattern matches known scam attempts'
    ],
    details: {
      proposerReputation: 'Unknown (new wallet)',
      walletAge: '2 days',
      previousProposals: '0 approved, 0 rejected',
      communitySupport: 'Low (23% approval)',
      smartContractAudit: 'NONE - Major red flag'
    }
  }
]

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * Health check - shows connection status
 */
app.get('/api/health', (req, res) => {
  const status = contractService.getStatus()
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    blockchain: status,
    mode: status.connected ? 'contract' : 'mock'
  })
})

/**
 * Get all proposals
 * Returns real data if connected, mock data otherwise
 */
app.get('/api/proposals', async (req, res) => {
  try {
    if (contractService.isConnected()) {
      const proposals = await contractService.getAllProposals()
      console.log(`[API] Returning ${proposals.length} proposals from chain`)
      return res.json(proposals)
    }
    
    // Fallback to mock data
    console.log('[API] Returning mock proposals (contracts not connected)')
    res.json(MOCK_PROPOSALS)
    
  } catch (error) {
    console.error('[API] /proposals error:', error.message)
    res.json(MOCK_PROPOSALS) // Fallback on error
  }
})

/**
 * Get single proposal by ID
 */
app.get('/api/proposals/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  
  try {
    if (contractService.isConnected()) {
      const proposal = await contractService.getProposal(id)
      if (proposal) {
        return res.json(proposal)
      }
      return res.status(404).json({ error: 'Proposal not found' })
    }
    
    // Fallback to mock
    const mock = MOCK_PROPOSALS.find(p => p.id === id)
    if (mock) {
      return res.json(mock)
    }
    res.status(404).json({ error: 'Proposal not found' })
    
  } catch (error) {
    console.error(`[API] /proposals/${id} error:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Get dashboard statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    if (contractService.isConnected()) {
      const stats = await contractService.getStats()
      return res.json(stats)
    }
    
    // Mock stats
    res.json({
      totalProposals: MOCK_PROPOSALS.length,
      activeProposals: MOCK_PROPOSALS.filter(p => p.status === 'active').length,
      executedProposals: 0,
      // AI-Integration_GuardDAO: These would come from AI analysis
      highRiskAlerts: MOCK_PROPOSALS.filter(p => p.riskScore >= 70).length,
      totalProtected: '$2.4M'
    })
    
  } catch (error) {
    console.error('[API] /stats error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * AI-Integration_GuardDAO: Risk Analysis Endpoint
 * 
 * This endpoint is a placeholder for AI agent integration.
 * The Python AI agent should call this to submit risk analysis results.
 * 
 * Current implementation: Basic keyword-based scoring (REPLACE WITH AI)
 * 
 * Expected AI integration:
 * 1. AI agent monitors ProposalCreated events
 * 2. Fetches proposal details via /api/proposals/:id
 * 3. Runs analysis (wallet history, text analysis, pattern matching)
 * 4. POSTs results back to this endpoint or updates via separate service
 */
app.post('/api/analyze', (req, res) => {
  const { title, description, amount, proposerWalletAge, previousProposals, communitySupport } = req.body

  // AI-Integration_GuardDAO: START
  // This is placeholder logic. Replace with actual AI service call.
  // Your Python AI agent should implement the real risk scoring algorithm.
  
  let riskScore = 20
  const redFlags = []

  // Basic keyword detection (AI should do much better)
  const text = ((title || '') + ' ' + (description || '')).toLowerCase()
  
  if (text.includes('urgent') || text.includes('emergency')) {
    riskScore += 25
    redFlags.push('Urgency language detected')
  }
  if (text.includes('immediate') || text.includes('asap')) {
    riskScore += 20
    redFlags.push('Immediate action requested')
  }
  if (text.includes('anonymous') || text.includes('unknown')) {
    riskScore += 30
    redFlags.push('Anonymous/unknown entities involved')
  }

  // Amount check
  const amountNum = parseInt(String(amount).replace(/[^0-9]/g, '')) || 0
  if (amountNum > 100) {
    riskScore += 15
    redFlags.push('High requested amount')
  }
  if (amountNum > 500) {
    riskScore += 25
    redFlags.push('Very high requested amount')
  }

  // Wallet age (AI should verify on-chain)
  const walletAge = parseInt(proposerWalletAge) || 0
  if (walletAge < 3) {
    riskScore += 30
    redFlags.push('New wallet (< 3 months)')
  }

  riskScore = Math.min(100, riskScore)

  let riskLevel = 'low'
  if (riskScore >= 70) riskLevel = 'critical'
  else if (riskScore >= 50) riskLevel = 'high'
  else if (riskScore >= 30) riskLevel = 'medium'

  // AI-Integration_GuardDAO: END

  res.json({
    riskScore,
    riskLevel,
    redFlags,
    recommendation: riskScore < 30 ? 'Auto-approve' : 
                    riskScore < 70 ? 'Human review required' : 
                    'Auto-reject recommended',
    // AI-Integration_GuardDAO: Add confidence score, model version, etc.
    analysisType: 'placeholder' // Change to 'ai' when real AI is connected
  })
})

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function start() {
  console.log('═'.repeat(50))
  console.log('  AI Guard DAO - API Server')
  console.log('═'.repeat(50))
  
  // Try to connect to contracts
  const connected = await contractService.connect()
  
  if (connected) {
    console.log('\n✅ Contract mode: Reading from blockchain')
  } else {
    console.log('\n⚠️  Mock mode: Contracts not available')
    console.log('   Set RPC_URL and contract addresses in .env to enable')
  }
  
  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`)
    console.log('\nEndpoints:')
    console.log(`   GET  /api/health`)
    console.log(`   GET  /api/proposals`)
    console.log(`   GET  /api/proposals/:id`)
    console.log(`   GET  /api/stats`)
    console.log(`   POST /api/analyze  (AI-Integration_GuardDAO)`)
    console.log('')
  })

  // Keep server alive
  server.on('error', (err) => {
    console.error('Server error:', err)
  })

  // Handle process signals
  process.on('SIGINT', () => {
    console.log('\nShutting down server...')
    server.close()
    process.exit(0)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
