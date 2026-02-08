/**
 * Contract Service - Connects to Monad DAO contracts
 * 
 * This service handles all blockchain interactions for reading proposal data.
 * Uses ethers.js to connect to either local Hardhat or Monad Testnet.
 */

const { ethers } = require('ethers')
const path = require('path')

// Load ABIs
const ProposalManagerABI = require('./abis/ProposalManager.json')
const VotingEngineABI = require('./abis/VotingEngine.json')

// Proposal states from contract enum
const PROPOSAL_STATES = [
  'Pending',
  'Active', 
  'Canceled',
  'Defeated',
  'Succeeded',
  'Queued',
  'Expired',
  'Executed'
]

// Proposal types from contract enum
const PROPOSAL_TYPES = [
  'Treasury',
  'Governance', 
  'Membership',
  'General'
]

// ═══════════════════════════════════════════════════════════════════════════
// RISK SCORING HEURISTICS (Demo mode until full AI integration)
// ═══════════════════════════════════════════════════════════════════════════

const HIGH_RISK_KEYWORDS = [
  'urgent', 'emergency', 'immediate', 'asap', 'trust me',
  'no time', 'quick', 'fast', 'drain', 'transfer all',
  'anonymous', 'unknown', 'external', 'new wallet'
]

const MEDIUM_RISK_KEYWORDS = [
  'large', 'significant', 'major', 'external', 'partner',
  'integration', 'bridge', 'cross-chain', 'new address'
]

const LOW_RISK_INDICATORS = [
  'community', 'airdrop', 'marketing', 'education',
  'verified', 'multisig', 'audit', 'team', 'documented'
]

/**
 * Calculate risk score based on proposal content (0-100)
 * This is a heuristic demo - replace with actual AI analysis
 */
function calculateRiskScore(proposal) {
  let score = 25 // Base score
  
  const title = (proposal.title || '').toLowerCase()
  const description = (proposal.description || '').toLowerCase()
  const combined = title + ' ' + description
  
  // Check HIGH RISK keywords (+15 each, max 60)
  let highRiskHits = 0
  for (const keyword of HIGH_RISK_KEYWORDS) {
    if (combined.includes(keyword)) {
      highRiskHits++
    }
  }
  score += Math.min(highRiskHits * 15, 60)
  
  // Check MEDIUM RISK keywords (+8 each, max 30)
  let mediumRiskHits = 0
  for (const keyword of MEDIUM_RISK_KEYWORDS) {
    if (combined.includes(keyword)) {
      mediumRiskHits++
    }
  }
  score += Math.min(mediumRiskHits * 8, 30)
  
  // Check LOW RISK indicators (-5 each, min -20)
  let lowRiskHits = 0
  for (const indicator of LOW_RISK_INDICATORS) {
    if (combined.includes(indicator)) {
      lowRiskHits++
    }
  }
  score -= Math.min(lowRiskHits * 5, 20)
  
  // Amount-based risk (parse MON amount)
  const amountMatch = proposal.amount?.match(/([\d.]+)\s*MON/i)
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1])
    if (amount >= 100) score += 30
    else if (amount >= 10) score += 15
    else if (amount >= 1) score += 5
  }
  
  // Missing documentation penalty
  if (!proposal.discussionURL || proposal.discussionURL === '') score += 10
  if (!proposal.proposalIPFS || proposal.proposalIPFS === '') score += 5
  
  // Short description penalty
  if (description.length < 100) score += 15
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Get risk level from score
 */
function getRiskLevel(score) {
  if (score >= 70) return 'critical'
  if (score >= 40) return 'medium'
  return 'low'
}

/**
 * Extract red flags from proposal
 */
function extractRedFlags(proposal, riskScore) {
  const flags = []
  const combined = ((proposal.title || '') + ' ' + (proposal.description || '')).toLowerCase()
  
  if (combined.includes('emergency') || combined.includes('urgent')) {
    flags.push('Urgency language detected')
  }
  if (combined.includes('trust me') || combined.includes('no time')) {
    flags.push('Social engineering patterns')
  }
  if (!proposal.discussionURL) {
    flags.push('No discussion forum link')
  }
  if (proposal.description && proposal.description.length < 100) {
    flags.push('Insufficient proposal detail')
  }
  
  const amountMatch = proposal.amount?.match(/([\d.]+)\s*MON/i)
  if (amountMatch && parseFloat(amountMatch[1]) >= 100) {
    flags.push('Large treasury transfer request')
  }
  
  if (combined.includes('anonymous') || combined.includes('unknown')) {
    flags.push('Anonymous recipient detected')
  }
  
  return flags
}

class ContractService {
  constructor() {
    this.provider = null
    this.proposalManager = null
    this.votingEngine = null
    this.connected = false
    this.networkName = 'unknown'
  }

  /**
   * Initialize connection to blockchain
   */
  async connect() {
    const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545'
    const proposalManagerAddress = process.env.PROPOSAL_MANAGER_ADDRESS
    const votingEngineAddress = process.env.VOTING_ENGINE_ADDRESS

    // Check if addresses are configured
    if (!proposalManagerAddress) {
      console.warn('[ContractService] PROPOSAL_MANAGER_ADDRESS not set, contract features disabled')
      return false
    }

    try {
      // Create provider with longer timeout for Monad testnet
      this.provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
        staticNetwork: true,
        polling: true,
        pollingInterval: 4000,
        batchMaxCount: 1
      })
      
      // Set longer timeout for testnet connections
      this.provider._getConnection().timeout = 30000
      
      // Test connection with retries
      let network
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[ContractService] Connecting to ${rpcUrl} (attempt ${attempt}/3)...`)
          network = await this.provider.getNetwork()
          break
        } catch (err) {
          if (attempt === 3) throw err
          console.log(`[ContractService] Retry in 2 seconds...`)
          await new Promise(r => setTimeout(r, 2000))
        }
      }
      
      this.networkName = network.chainId === 10143n ? 'Monad Testnet' : 
                         network.chainId === 31337n ? 'Hardhat Local' : 
                         `Chain ${network.chainId}`
      
      console.log(`[ContractService] ✅ Connected to ${this.networkName} (${rpcUrl})`)

      // Initialize contracts
      this.proposalManager = new ethers.Contract(
        proposalManagerAddress,
        ProposalManagerABI,
        this.provider
      )

      if (votingEngineAddress) {
        this.votingEngine = new ethers.Contract(
          votingEngineAddress,
          VotingEngineABI,
          this.provider
        )
      }

      this.connected = true
      console.log('[ContractService] Contracts initialized')
      return true

    } catch (error) {
      console.error('[ContractService] Connection failed:', error.message)
      this.connected = false
      return false
    }
  }

  /**
   * Check if contracts are connected
   */
  isConnected() {
    return this.connected && this.proposalManager !== null
  }

  /**
   * Get total proposal count
   */
  async getProposalCount() {
    if (!this.isConnected()) return 0
    
    try {
      const count = await this.proposalManager.getProposalCount()
      return Number(count)
    } catch (error) {
      console.error('[ContractService] getProposalCount error:', error.message)
      return 0
    }
  }

  /**
   * Get all proposals from chain
   * Returns formatted data for frontend consumption
   */
  async getAllProposals() {
    if (!this.isConnected()) return []

    try {
      const count = await this.getProposalCount()
      const proposals = []

      for (let i = 1; i <= count; i++) {
        const proposal = await this.getProposal(i)
        if (proposal) {
          proposals.push(proposal)
        }
      }

      return proposals
    } catch (error) {
      console.error('[ContractService] getAllProposals error:', error.message)
      return []
    }
  }

  /**
   * Get single proposal by ID
   * Combines contract data with placeholder AI fields
   */
  async getProposal(proposalId) {
    if (!this.isConnected()) return null

    try {
      // Fetch contract data
      const [data, metadata, state, actions] = await Promise.all([
        this.proposalManager.getProposalData(proposalId),
        this.proposalManager.getProposalMetadata(proposalId),
        this.proposalManager.getProposalState(proposalId),
        this.proposalManager.getProposalActions(proposalId)
      ])

      // Calculate deadline from endBlock (estimate ~0.4s per block on Monad)
      const currentBlock = await this.provider.getBlockNumber()
      const blocksRemaining = Number(data.endBlock) - currentBlock
      const secondsRemaining = Math.max(0, blocksRemaining * 0.4)
      const deadline = new Date(Date.now() + secondsRemaining * 1000)

      // Parse amount from actions (if treasury transfer)
      let amount = '$0'
      if (actions.length > 0 && actions[0].value > 0) {
        const ethAmount = ethers.formatEther(actions[0].value)
        amount = `${ethAmount} MON`
      }

      // Format proposal for frontend
      const proposal = {
        // === REAL DATA FROM CONTRACT ===
        id: Number(data.id),
        proposer: data.proposer,
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        discussionURL: metadata.discussionURL,
        proposalIPFS: metadata.proposalIPFS,
        
        // Voting data
        forVotes: ethers.formatEther(data.forVotes),
        againstVotes: ethers.formatEther(data.againstVotes),
        abstainVotes: ethers.formatEther(data.abstainVotes),
        
        // State
        status: PROPOSAL_STATES[Number(state)]?.toLowerCase() || 'unknown',
        proposalType: PROPOSAL_TYPES[Number(data.proposalType)] || 'General',
        canceled: data.canceled,
        executed: data.executed,
        
        // Timeline
        createdAt: Number(data.createdAt),
        startBlock: Number(data.startBlock),
        endBlock: Number(data.endBlock),
        deadline: deadline.toISOString().split('T')[0],
        
        // Parsed from actions
        amount: amount,
        
        // === AI RISK ANALYSIS (Placeholder - calculated below) ===
        riskScore: 0,
        riskLevel: 'low',
        redFlags: [],
        
        details: {
          proposerReputation: 'Verified DAO Member',
          walletAge: '> 6 months', 
          previousProposals: 'First proposal',
          communitySupport: 'Pending votes',
          smartContractAudit: 'N/A'
        }
      }

      // Calculate risk using heuristics
      const riskScore = calculateRiskScore(proposal)
      proposal.riskScore = riskScore
      proposal.riskLevel = getRiskLevel(riskScore)
      proposal.redFlags = extractRedFlags(proposal, riskScore)

      return proposal

    } catch (error) {
      console.error(`[ContractService] getProposal(${proposalId}) error:`, error.message)
      return null
    }
  }

  /**
   * Get dashboard statistics
   */
  async getStats() {
    if (!this.isConnected()) {
      return {
        totalProposals: 0,
        activeProposals: 0,
        executedProposals: 0,
        // AI-Integration_GuardDAO: These stats should be populated by AI service
        highRiskAlerts: 0,
        totalProtected: '$0'
      }
    }

    try {
      const count = await this.getProposalCount()
      let active = 0
      let executed = 0

      for (let i = 1; i <= count; i++) {
        const state = await this.proposalManager.getProposalState(i)
        if (Number(state) === 1) active++ // Active
        if (Number(state) === 7) executed++ // Executed
      }

      return {
        totalProposals: count,
        activeProposals: active,
        executedProposals: executed,
        // AI-Integration_GuardDAO: AI agent updates these
        highRiskAlerts: 0,
        totalProtected: '$0'
      }

    } catch (error) {
      console.error('[ContractService] getStats error:', error.message)
      return { totalProposals: 0, activeProposals: 0, executedProposals: 0, highRiskAlerts: 0, totalProtected: '$0' }
    }
  }

  /**
   * Get connection status for health check
   */
  getStatus() {
    return {
      connected: this.connected,
      network: this.networkName,
      proposalManager: !!this.proposalManager,
      votingEngine: !!this.votingEngine
    }
  }
}

// Export singleton instance
module.exports = new ContractService()
