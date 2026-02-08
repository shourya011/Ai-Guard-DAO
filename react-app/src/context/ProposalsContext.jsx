import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ProposalsContext = createContext()

// API base URL - uses Vite proxy in development
const API_BASE = '/api'

// Fallback mock data (used if API fails)
const mockProposals = [
  {
    id: 1,
    title: 'Treasury Diversification: Allocate 10% to Stablecoins',
    proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '250,000 MON',
    deadline: '2026-02-01',
    status: 'active',
    riskScore: 15,
    riskLevel: 'low',
    redFlags: [],
    description: 'Proposal to diversify treasury holdings by allocating 10% of funds into USDC and USDT stablecoins to reduce volatility exposure.',
    details: {
      proposerReputation: 'Established DAO member (12 months)',
      walletAge: '2 years',
      previousProposals: '5 approved, 0 rejected',
      communitySupport: 'High (85% approval in discussion)',
      smartContractAudit: 'Verified by OpenZeppelin'
    }
  },
  {
    id: 2,
    title: 'Marketing Campaign: Partnership with Leading DeFi Protocol',
    proposer: '0x9c5e8F7B3D92Cc6634C0532925a3b844Bc9e759',
    amount: '75,000 MON',
    deadline: '2026-01-28',
    status: 'active',
    riskScore: 52,
    riskLevel: 'medium',
    redFlags: [
      'New proposer (wallet age: 3 months)',
      'High requested amount relative to proposer history',
      'Limited community discussion'
    ],
    description: 'Proposal to fund a comprehensive marketing campaign including social media ads, influencer partnerships, and event sponsorships.',
    details: {
      proposerReputation: 'New member (3 months)',
      walletAge: '3 months',
      previousProposals: '0 approved, 0 rejected',
      communitySupport: 'Moderate (62% approval in discussion)',
      smartContractAudit: 'Not applicable (funding request)'
    }
  },
  {
    id: 3,
    title: 'Emergency Fund Transfer to New Wallet',
    proposer: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0',
    amount: '500,000 MON',
    deadline: '2026-01-25',
    status: 'active',
    riskScore: 94,
    riskLevel: 'critical',
    redFlags: [
      'New wallet (created 2 days ago)',
      'Extremely high requested amount',
      'Recipient wallet has no transaction history',
      'Urgent deadline with minimal discussion time',
      'No previous on-chain activity by proposer',
      'Unusual proposal pattern (similar to known scam attempts)'
    ],
    description: 'URGENT: Proposal to transfer emergency funds to a new secure wallet due to alleged security vulnerability.',
    details: {
      proposerReputation: 'Unknown (new wallet)',
      walletAge: '2 days',
      previousProposals: '0 approved, 0 rejected',
      communitySupport: 'Low (23% approval in discussion)',
      smartContractAudit: 'NONE - Major red flag'
    }
  },
  {
    id: 4,
    title: 'Developer Grants Program Q1 2026',
    proposer: '0x5F89bB7F3D92Cc6634C0532925a3b844Bc9e7A2',
    amount: '150,000 MON',
    deadline: '2026-02-05',
    status: 'active',
    riskScore: 28,
    riskLevel: 'low',
    redFlags: ['Requires milestone-based disbursement tracking'],
    description: 'Quarterly developer grants program to fund ecosystem development across 10-15 projects.',
    details: {
      proposerReputation: 'Core team member (founding member)',
      walletAge: '3 years',
      previousProposals: '12 approved, 1 rejected',
      communitySupport: 'High (91% approval in discussion)',
      smartContractAudit: 'Multi-sig wallet verified'
    }
  },
  {
    id: 5,
    title: 'Infrastructure Upgrade: Migrate to New Node Provider',
    proposer: '0x8D7bC3F2E1A0932925a3b844Bc9e7595f0bEbD4',
    amount: '45,000 MON',
    deadline: '2026-02-10',
    status: 'active',
    riskScore: 35,
    riskLevel: 'medium',
    redFlags: ['Vendor not previously used by DAO'],
    description: 'Proposal to migrate infrastructure to a more reliable and cost-effective node provider.',
    details: {
      proposerReputation: 'Tech lead (8 months)',
      walletAge: '1.5 years',
      previousProposals: '3 approved, 0 rejected',
      communitySupport: 'Moderate (75% approval in discussion)',
      smartContractAudit: 'N/A - Service contract'
    }
  }
]

export function ProposalsProvider({ children }) {
  const [proposals, setProposals] = useState(mockProposals)
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [apiConnected, setApiConnected] = useState(false)

  // Fetch proposals function
  const fetchProposals = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/proposals`)
      if (response.ok) {
        const data = await response.json()
        // Only update if we got actual data, otherwise keep mock data
        if (data && data.length > 0) {
          setProposals(data)
          setApiConnected(true)
          console.log('[API] Connected - loaded', data.length, 'proposals')
          return true
        } else {
          console.warn('[API] Empty response, keeping mock data')
          setApiConnected(false)
          return false
        }
      } else {
        console.warn('[API] Failed to fetch, using mock data')
        setApiConnected(false)
        return false
      }
    } catch (error) {
      console.warn('[API] Not available, using mock data:', error.message)
      setApiConnected(false)
      return false
    }
  }, [])

  // Refresh proposals
  const refreshProposals = useCallback(async () => {
    setRefreshing(true)
    await fetchProposals()
    setRefreshing(false)
  }, [fetchProposals])

  // Fetch proposals from API on mount
  useEffect(() => {
    const initFetch = async () => {
      await fetchProposals()
      setLoading(false)
    }
    initFetch()
  }, [fetchProposals])

  const getProposalById = useCallback((id) => {
    return proposals.find(p => p.id === parseInt(id))
  }, [proposals])

  const getStats = useCallback(() => {
    const highRisk = proposals.filter(p => p.riskScore >= 70).length
    const activeProposals = proposals.filter(p => p.status === 'active').length
    return {
      totalProtected: '2.4M MON',
      activeDAOs: 12,
      activeProposals,
      highRiskAlerts: highRisk
    }
  }, [proposals])

  const castVote = useCallback(async (proposalId, support, override = false) => {
    try {
      // Try to call real API first
      const response = await fetch(`${API_BASE}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, support, override })
      })
      
      if (response.ok) {
        const data = await response.json()
        setVotes(prev => [...prev, data.vote])
        // Remove proposal from list after voting
        setProposals(prev => prev.filter(p => p.id !== proposalId))
        console.log('[API] Vote cast via API:', data.vote.txHash)
        return { success: true, vote: data.vote }
      }
    } catch (error) {
      console.warn('[API] Vote API failed, using mock:', error.message)
    }

    // Fallback to mock vote
    const chars = '0123456789abcdef'
    let txHash = '0x'
    for (let i = 0; i < 64; i++) {
      txHash += chars[Math.floor(Math.random() * chars.length)]
    }

    const vote = {
      proposalId,
      support,
      override,
      timestamp: new Date().toISOString(),
      txHash,
      blockNumber: Math.floor(Math.random() * 1000000) + 5000000,
      gasUsed: '0.00021',
      status: 'confirmed'
    }

    setVotes(prev => [...prev, vote])
    // Remove proposal from list after voting
    setProposals(prev => prev.filter(p => p.id !== proposalId))
    console.log('[Mock] Vote cast:', { proposalId, support, txHash })
    return { success: true, vote }
  }, [])

  const getVoteForProposal = useCallback((proposalId) => {
    return votes.find(v => v.proposalId === proposalId)
  }, [votes])

  return (
    <ProposalsContext.Provider value={{
      proposals,
      getProposalById,
      getStats,
      castVote,
      getVoteForProposal,
      refreshProposals,
      votes,
      loading,
      refreshing,
      apiConnected
    }}>
      {children}
    </ProposalsContext.Provider>
  )
}

export function useProposals() {
  const context = useContext(ProposalsContext)
  if (!context) {
    throw new Error('useProposals must be used within a ProposalsProvider')
  }
  return context
}
