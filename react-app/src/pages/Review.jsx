import DashboardLayout from '../components/DashboardLayout'
import RiskBadge from '../components/RiskBadge'
import NotificationDropdown from '../components/NotificationDropdown'
import { useProposals } from '../context/ProposalsContext'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, ArrowRight, Search } from 'lucide-react'

export default function Review() {
  const navigate = useNavigate()
  const { proposals } = useProposals()
  
  // Filter proposals that need human review (risk score >= 30)
  const reviewQueue = proposals
    .filter(p => p.riskScore >= 30)
    .sort((a, b) => b.riskScore - a.riskScore)

  return (
    <DashboardLayout>
      {/* App Header with Breadcrumbs */}
      <div className="app-header" style={{ marginLeft: '-24px', marginRight: '-24px', marginTop: '-24px', marginBottom: 'var(--spacing-6)' }}>
        <div className="header-left">
          <h1 style={{ fontSize: 'var(--font-size-xl)', margin: 0 }}>Review Queue</h1>
          <div className="breadcrumbs">
            <a href="/dashboard">Dashboard</a>
            <span>/</span>
            <span>Review</span>
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

      <div style={{ marginBottom: 'var(--spacing-6)' }}>
        <p className="text-large text-muted">
          Proposals flagged for human review based on AI risk assessment
        </p>
      </div>

      {/* Queue Stats */}
      <div className="stats-grid review-stats" style={{ marginBottom: 'var(--spacing-8)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            <AlertTriangle size={24} color="var(--color-danger)" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Critical Risk</div>
            <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
              {proposals.filter(p => p.riskScore >= 70).length}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <Clock size={24} color="var(--color-warning)" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Pending Review</div>
            <div className="stat-value">{reviewQueue.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ArrowRight size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Auto-Approved Today</div>
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>
              {proposals.filter(p => p.riskScore < 30).length}
            </div>
          </div>
        </div>
      </div>

      {/* Review Cards */}
      <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
        {reviewQueue.map(proposal => (
          <div 
            key={proposal.id}
            className="table-container"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/proposals?id=${proposal.id}`)}
          >
            <div style={{ padding: 'var(--spacing-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-2)' }}>
                    <span className="text-muted">#{proposal.id}</span>
                    <RiskBadge score={proposal.riskScore} level={proposal.riskLevel} />
                  </div>
                  <h3 className="heading-3" style={{ marginBottom: 'var(--spacing-2)' }}>{proposal.title}</h3>
                  <p className="text-muted" style={{ marginBottom: 'var(--spacing-4)' }}>
                    {proposal.description.slice(0, 150)}...
                  </p>
                  
                  {/* Red Flags Preview */}
                  {proposal.redFlags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                      {proposal.redFlags.slice(0, 3).map((flag, index) => (
                        <span 
                          key={index}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.75rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--color-danger)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--font-size-xs)'
                          }}
                        >
                          <AlertTriangle size={12} />
                          {flag.length > 40 ? flag.slice(0, 40) + '...' : flag}
                        </span>
                      ))}
                      {proposal.redFlags.length > 3 && (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--color-gray-400)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--font-size-xs)'
                        }}>
                          +{proposal.redFlags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div style={{ textAlign: 'right', marginLeft: 'var(--spacing-6)' }}>
                  <div className="text-muted text-small">Amount Requested</div>
                  <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-2)' }}>
                    {proposal.amount}
                  </div>
                  <div className="text-muted text-small">Deadline: {proposal.deadline}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {reviewQueue.length === 0 && (
        <div className="table-container">
          <div style={{ padding: 'var(--spacing-12)', textAlign: 'center' }}>
            <p className="text-muted">No proposals currently require review</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
