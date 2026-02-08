import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import RiskBadge from '../components/RiskBadge'
import NotificationDropdown from '../components/NotificationDropdown'
import { useProposals } from '../context/ProposalsContext'
import { useWallet } from '../context/WalletContext'
import { extractExcerpt } from '../components/MarkdownRenderer'
import { 
  ArrowLeft, AlertTriangle, CheckCircle, XCircle, ExternalLink, 
  Search, LayoutGrid, List, FileText, BarChart2, Vote, 
  History, Clock, Bot, Shield, Users, RefreshCw, Plus
} from 'lucide-react'

export default function Proposals() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const proposalId = searchParams.get('id')
  const { proposals, getProposalById, castVote, getVoteForProposal, refreshProposals, refreshing } = useProposals()
  const { wallet } = useWallet()
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [voting, setVoting] = useState(false)
  const [voteResult, setVoteResult] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [viewMode, setViewMode] = useState('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')

  useEffect(() => {
    if (proposalId) {
      const proposal = getProposalById(proposalId)
      setSelectedProposal(proposal)
      const existingVote = getVoteForProposal(parseInt(proposalId))
      if (existingVote) setVoteResult(existingVote)
    } else {
      setSelectedProposal(null)
      setVoteResult(null)
    }
  }, [proposalId, getProposalById, getVoteForProposal])

  // Filter proposals
  const filteredProposals = proposals.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status.toLowerCase() === statusFilter
    const matchesRisk = riskFilter === 'all' || p.riskLevel.toLowerCase() === riskFilter
    return matchesSearch && matchesStatus && matchesRisk
  })

  const handleVote = async (support) => {
    if (!wallet.connected) {
      alert('Please connect your wallet first')
      return
    }
    setVoting(true)
    try {
      const result = await castVote(selectedProposal.id, support)
      setVoteResult(result.vote)
    } catch (error) {
      console.error('Vote failed:', error)
    }
    setVoting(false)
  }

  const handleBack = () => {
    setSearchParams({})
    setSelectedProposal(null)
    setVoteResult(null)
  }

  if (selectedProposal) {
    const tabs = [
      { id: 'overview', label: 'Overview', icon: FileText },
      { id: 'analysis', label: 'AI Analysis', icon: BarChart2 },
      { id: 'voting', label: 'Voting', icon: Vote },
      { id: 'audit', label: 'Audit Trail', icon: History }
    ]

    return (
      <DashboardLayout>
        {/* Header with Breadcrumbs */}
        <div className="app-header" style={{ marginLeft: '-24px', marginRight: '-24px', marginTop: '-24px' }}>
          <div className="header-left">
            <h1 style={{ fontSize: 'var(--font-size-xl)', margin: 0 }}>DAO Proposal Details</h1>
            <div className="breadcrumbs">
              <a href="#" onClick={(e) => { e.preventDefault(); handleBack(); }}>DAO Proposals</a>
              <span>/</span>
              <span>#{selectedProposal.id}</span>
            </div>
          </div>
          <div className="header-right">
            <div className="header-search">
              <Search size={16} />
              <input type="text" placeholder="Search..." defaultValue="" />
            </div>
            <NotificationDropdown />
          </div>
        </div>

        <div style={{ paddingTop: 'var(--spacing-6)' }}>
          <button onClick={handleBack} className="btn btn-secondary mb-6">
            <ArrowLeft size={16} />
            Back to Proposals
          </button>

          {/* Proposal Tabs */}
          <div className="proposal-tabs">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                className={`proposal-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="responsive-detail-grid">
            {/* Main Content */}
            <div>
              {activeTab === 'overview' && (
                <>
                  <div className="table-container" style={{ marginBottom: 'var(--spacing-6)' }}>
                    <div style={{ padding: 'var(--spacing-6)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-4)' }}>
                        <div>
                          <span className="text-muted">#{selectedProposal.id}</span>
                          <h2 className="heading-2" style={{ marginTop: 'var(--spacing-2)' }}>{selectedProposal.title}</h2>
                        </div>
                        <RiskBadge score={selectedProposal.riskScore} level={selectedProposal.riskLevel} />
                      </div>
                      <p style={{ color: 'var(--color-gray-300)', lineHeight: 1.7 }}>
                        {selectedProposal.description}
                      </p>
                    </div>
                  </div>

                  {/* Red Flags */}
                  {selectedProposal.redFlags.length > 0 && (
                    <div className="table-container" style={{ marginBottom: 'var(--spacing-6)' }}>
                      <div style={{ padding: 'var(--spacing-6)' }}>
                        <h3 className="heading-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={20} color="var(--color-danger)" />
                          Red Flags Detected
                        </h3>
                        <ul className="red-flags-list" style={{ marginTop: 'var(--spacing-4)' }}>
                          {selectedProposal.redFlags.map((flag, index) => (
                            <li key={index}>
                              <XCircle size={16} color="var(--color-danger)" />
                              {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="table-container">
                    <div style={{ padding: 'var(--spacing-6)' }}>
                      <h3 className="heading-3">Timeline</h3>
                      <div className="timeline" style={{ marginTop: 'var(--spacing-4)' }}>
                        <div className="timeline-item">
                          <div className="timeline-marker active"></div>
                          <div className="timeline-date">Jan 15, 2025 • 10:30 AM</div>
                          <div className="timeline-title">Proposal Created</div>
                          <div className="timeline-desc">Submitted by {selectedProposal.proposer.slice(0, 8)}...</div>
                        </div>
                        <div className="timeline-item">
                          <div className="timeline-marker active"></div>
                          <div className="timeline-date">Jan 15, 2025 • 10:31 AM</div>
                          <div className="timeline-title">AI Analysis Complete</div>
                          <div className="timeline-desc">Risk Score: {selectedProposal.riskScore}/100</div>
                        </div>
                        <div className="timeline-item">
                          <div className="timeline-marker pending"></div>
                          <div className="timeline-date">{selectedProposal.deadline}</div>
                          <div className="timeline-title">Voting Deadline</div>
                          <div className="timeline-desc">Voting closes at 11:59 PM UTC</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'analysis' && (
                <>
                  <div className="table-container" style={{ marginBottom: 'var(--spacing-6)' }}>
                    <div style={{ padding: 'var(--spacing-6)' }}>
                      <h3 className="heading-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bot size={20} color="var(--color-teal-accent)" />
                        AI Risk Analysis
                      </h3>
                      <div className="risk-score-display">
                        <div className={`risk-score-circle ${selectedProposal.riskLevel.toLowerCase()}`}>
                          {selectedProposal.riskScore}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, textTransform: 'uppercase' }}>
                          {selectedProposal.riskLevel} Risk
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="table-container">
                    <div style={{ padding: 'var(--spacing-6)' }}>
                      <h3 className="heading-3">Analysis Details</h3>
                      <div style={{ display: 'grid', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-4)' }}>
                        {Object.entries(selectedProposal.details).map(([key, value]) => (
                          <div key={key} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            padding: 'var(--spacing-3) 0',
                            borderBottom: '1px solid rgba(255,255,255,0.06)'
                          }}>
                            <span className="text-muted">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span style={{ color: 'var(--color-white)' }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'voting' && (
                <>
                  <div className="voting-stats">
                    <div className="voting-stat-card">
                      <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>65%</div>
                      <div className="text-muted">For</div>
                      <div className="stat-bar">
                        <div className="stat-bar-fill" style={{ width: '65%', background: 'var(--color-success)' }}></div>
                      </div>
                    </div>
                    <div className="voting-stat-card">
                      <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-danger)' }}>25%</div>
                      <div className="text-muted">Against</div>
                      <div className="stat-bar">
                        <div className="stat-bar-fill" style={{ width: '25%', background: 'var(--color-danger)' }}></div>
                      </div>
                    </div>
                    <div className="voting-stat-card">
                      <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-gray-400)' }}>10%</div>
                      <div className="text-muted">Abstain</div>
                      <div className="stat-bar">
                        <div className="stat-bar-fill" style={{ width: '10%', background: 'var(--color-gray-600)' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="table-container">
                    <div style={{ padding: 'var(--spacing-6)' }}>
                      <h3 className="heading-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={20} />
                        Recent Votes
                      </h3>
                      <div style={{ marginTop: 'var(--spacing-4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-3) 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <span className="mono-text">0x1234...5678</span>
                          <span style={{ color: 'var(--color-success)' }}>For</span>
                          <span className="text-muted">1,500 MONAD</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-3) 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <span className="mono-text">0xabcd...efgh</span>
                          <span style={{ color: 'var(--color-danger)' }}>Against</span>
                          <span className="text-muted">800 MONAD</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-3) 0' }}>
                          <span className="mono-text">0x9876...4321</span>
                          <span style={{ color: 'var(--color-success)' }}>For</span>
                          <span className="text-muted">2,000 MONAD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'audit' && (
                <div className="table-container">
                  <div style={{ padding: 'var(--spacing-6)' }}>
                    <h3 className="heading-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <History size={20} />
                      Audit Trail
                    </h3>
                    <div className="audit-log" style={{ marginTop: 'var(--spacing-4)' }}>
                      <div className="audit-entry">
                        <span className="audit-time">2025-01-15 10:30:00</span>
                        <div className="audit-event">
                          <FileText size={16} />
                          Proposal Created
                        </div>
                        <span className="audit-details">By {selectedProposal.proposer.slice(0, 10)}...</span>
                      </div>
                      <div className="audit-entry">
                        <span className="audit-time">2025-01-15 10:30:05</span>
                        <div className="audit-event">
                          <Bot size={16} />
                          AI Analysis Started
                        </div>
                        <span className="audit-details">Automatic</span>
                      </div>
                      <div className="audit-entry">
                        <span className="audit-time">2025-01-15 10:31:22</span>
                        <div className="audit-event">
                          <Shield size={16} />
                          Risk Score Assigned
                        </div>
                        <span className="audit-details">Score: {selectedProposal.riskScore}/100</span>
                      </div>
                      <div className="audit-entry">
                        <span className="audit-time">2025-01-15 10:31:25</span>
                        <div className="audit-event">
                          <CheckCircle size={16} />
                          Voting Period Started
                        </div>
                        <span className="audit-details">Ends: {selectedProposal.deadline}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div>
              {/* AI Recommendation Card */}
              <div className="table-container" style={{ marginBottom: 'var(--spacing-4)' }}>
                <div style={{ padding: 'var(--spacing-6)' }}>
                  <h3 className="heading-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bot size={20} color="var(--color-teal-accent)" />
                    AI Recommendation
                  </h3>
                  <div style={{ 
                    marginTop: 'var(--spacing-4)', 
                    padding: 'var(--spacing-4)',
                    background: selectedProposal.riskScore >= 70 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    borderRadius: 'var(--radius-lg)',
                    border: `1px solid ${selectedProposal.riskScore >= 70 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      color: selectedProposal.riskScore >= 70 ? 'var(--color-danger)' : 'var(--color-success)',
                      fontWeight: 600
                    }}>
                      {selectedProposal.riskScore >= 70 ? <XCircle size={20} /> : <CheckCircle size={20} />}
                      {selectedProposal.riskScore >= 70 ? 'Reject Recommended' : 'Approve Recommended'}
                    </div>
                    <p className="text-small text-muted" style={{ marginTop: 'var(--spacing-2)' }}>
                      {selectedProposal.riskScore >= 70 
                        ? 'High risk factors detected. Manual review strongly advised.'
                        : 'This proposal passes AI safety checks.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Voting Actions */}
              <div className="table-container">
                <div style={{ padding: 'var(--spacing-6)' }}>
                  <h3 className="heading-3">Cast Your Vote</h3>
                
                  {voteResult ? (
                    <div style={{ marginTop: 'var(--spacing-4)' }}>
                      <div style={{
                        padding: 'var(--spacing-4)',
                        background: voteResult.support ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--spacing-4)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--spacing-2)' }}>
                          {voteResult.support ? (
                            <CheckCircle size={20} color="var(--color-success)" />
                          ) : (
                            <XCircle size={20} color="var(--color-danger)" />
                          )}
                          <span style={{ fontWeight: 600 }}>
                            Vote {voteResult.support ? 'Approved' : 'Rejected'}
                          </span>
                        </div>
                        <p className="text-small text-muted">
                          Transaction confirmed
                        </p>
                      </div>
                      <a 
                        href={`https://explorer.monad.xyz/tx/${voteResult.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                      >
                        <ExternalLink size={16} />
                        View on Explorer
                      </a>
                    </div>
                  ) : (
                    <div style={{ marginTop: 'var(--spacing-4)' }}>
                      {/* Auto-Vote Button */}
                      <button 
                        onClick={() => handleVote(selectedProposal.riskScore < 70)}
                        disabled={voting}
                        className="btn btn-primary"
                        style={{ width: '100%', marginBottom: 'var(--spacing-3)' }}
                      >
                        <Bot size={16} />
                        {voting ? 'Processing...' : 'Auto-Vote (AI Recommended)'}
                      </button>
                      
                      <div style={{ 
                        textAlign: 'center', 
                        padding: 'var(--spacing-2)', 
                        color: 'var(--color-gray-500)',
                        fontSize: 'var(--font-size-sm)'
                      }}>
                        or manual override
                      </div>
                      
                      <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
                        <button 
                          onClick={() => handleVote(true)}
                          disabled={voting}
                          className="btn btn-success"
                          style={{ flex: 1 }}
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button 
                          onClick={() => handleVote(false)}
                          disabled={voting}
                          className="btn btn-danger"
                          style={{ flex: 1 }}
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Proposal Info */}
              <div className="table-container" style={{ marginTop: 'var(--spacing-4)' }}>
                <div style={{ padding: 'var(--spacing-6)' }}>
                  <h3 className="heading-3">Proposal Info</h3>
                  <div style={{ marginTop: 'var(--spacing-4)' }}>
                    <div style={{ marginBottom: 'var(--spacing-3)' }}>
                      <span className="text-small text-muted">Amount Requested</span>
                      <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>{selectedProposal.amount}</div>
                    </div>
                    <div style={{ marginBottom: 'var(--spacing-3)' }}>
                      <span className="text-small text-muted">Deadline</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} color="var(--color-gray-400)" />
                        {selectedProposal.deadline}
                      </div>
                    </div>
                    <div>
                      <span className="text-small text-muted">Proposer</span>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}>
                        {selectedProposal.proposer.slice(0, 10)}...{selectedProposal.proposer.slice(-8)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header with Breadcrumbs */}
      <div className="app-header" style={{ marginLeft: '-24px', marginRight: '-24px', marginTop: '-24px', marginBottom: 'var(--spacing-6)' }}>
        <div className="header-left">
          <h1 style={{ fontSize: 'var(--font-size-xl)', margin: 0 }}>DAO Proposals</h1>
          <div className="breadcrumbs">
            <a href="/dashboard">Dashboard</a>
            <span>/</span>
            <span>DAO Proposals</span>
          </div>
        </div>
        <div className="header-right">
          <div className="header-search">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search DAO proposals..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <NotificationDropdown />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-controls">
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select 
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="passed">Passed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Risk Level</label>
            <select 
              className="filter-select"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
              <option value="critical">Critical Risk</option>
            </select>
          </div>
        </div>
        <div className="view-controls">
          <span className="text-small text-muted">{filteredProposals.length} proposals</span>
          <button 
            className="refresh-btn"
            onClick={refreshProposals}
            disabled={refreshing}
            title="Refresh proposals"
          >
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          </button>
          <div className="view-toggle">
            <button 
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <List size={16} />
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Proposal</th>
                <th>Proposer</th>
                <th>Amount</th>
                <th>Deadline</th>
                <th>Risk Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map(proposal => (
                <tr key={proposal.id} onClick={() => setSearchParams({ id: proposal.id.toString() })}>
                  <td>#{proposal.id}</td>
                  <td style={{ maxWidth: 250 }}>{proposal.title}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
                    {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
                  </td>
                  <td>{proposal.amount}</td>
                  <td>{proposal.deadline}</td>
                  <td><RiskBadge score={proposal.riskScore} level={proposal.riskLevel} /></td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: 'var(--color-success)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 'var(--font-size-xs)',
                      textTransform: 'uppercase'
                    }}>
                      {proposal.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="proposals-grid">
          {filteredProposals.map(proposal => (
            <div 
              key={proposal.id} 
              className="proposal-card"
              onClick={() => setSearchParams({ id: proposal.id.toString() })}
            >
              <div className="proposal-card-header">
                <span className="proposal-card-id">#{proposal.id}</span>
                <RiskBadge score={proposal.riskScore} level={proposal.riskLevel} />
              </div>
              <h3 className="proposal-card-title">{proposal.title}</h3>
              <p className="text-small text-muted" style={{ marginBottom: 'var(--spacing-3)', lineHeight: 1.5 }}>
                {extractExcerpt(proposal.description || '', 120)}
              </p>
              <div className="proposal-card-meta">
                <span>{proposal.amount}</span>
                <span>{proposal.deadline}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
