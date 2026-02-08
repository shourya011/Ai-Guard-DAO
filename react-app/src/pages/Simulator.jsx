import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import RiskBadge from '../components/RiskBadge'
import NotificationDropdown from '../components/NotificationDropdown'
import { Sparkles, AlertTriangle, CheckCircle, Loader, Search } from 'lucide-react'

export default function Simulator() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    proposerWalletAge: '12',
    previousProposals: '0',
    communitySupport: '50'
  })
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const analyzeProposal = () => {
    setAnalyzing(true)
    setResult(null)

    setTimeout(() => {
      // Simulate AI analysis
      let riskScore = 20
      const redFlags = []

      // Amount-based risk
      const amount = parseInt(formData.amount.replace(/[^0-9]/g, '')) || 0
      if (amount > 100000) {
        riskScore += 20
        redFlags.push('High requested amount')
      }
      if (amount > 500000) {
        riskScore += 25
        redFlags.push('Extremely high requested amount')
      }

      // Wallet age risk
      const walletAge = parseInt(formData.proposerWalletAge)
      if (walletAge < 3) {
        riskScore += 30
        redFlags.push('New wallet (less than 3 months)')
      } else if (walletAge < 6) {
        riskScore += 15
        redFlags.push('Relatively new wallet')
      }

      // Previous proposals risk
      const prevProposals = parseInt(formData.previousProposals)
      if (prevProposals === 0) {
        riskScore += 15
        redFlags.push('No previous proposal history')
      }

      // Community support risk
      const support = parseInt(formData.communitySupport)
      if (support < 30) {
        riskScore += 20
        redFlags.push('Low community support')
      } else if (support < 50) {
        riskScore += 10
        redFlags.push('Moderate community support')
      }

      // Title/description analysis
      const text = (formData.title + ' ' + formData.description).toLowerCase()
      if (text.includes('urgent') || text.includes('emergency')) {
        riskScore += 25
        redFlags.push('Urgency language detected')
      }
      if (text.includes('new wallet') || text.includes('transfer')) {
        riskScore += 15
        redFlags.push('Suspicious transfer language')
      }

      riskScore = Math.min(100, riskScore)
      
      let riskLevel = 'low'
      if (riskScore >= 70) riskLevel = 'critical'
      else if (riskScore >= 50) riskLevel = 'high'
      else if (riskScore >= 30) riskLevel = 'medium'

      setResult({
        riskScore,
        riskLevel,
        redFlags,
        recommendation: riskScore < 30 ? 'Auto-approve' : riskScore < 70 ? 'Human review required' : 'Auto-reject recommended'
      })
      setAnalyzing(false)
    }, 2000)
  }

  return (
    <DashboardLayout>
      {/* App Header with Breadcrumbs */}
      <div className="app-header" style={{ marginLeft: '-24px', marginRight: '-24px', marginTop: '-24px', marginBottom: 'var(--spacing-6)' }}>
        <div className="header-left">
          <h1 style={{ fontSize: 'var(--font-size-xl)', margin: 0 }}>Risk Simulator</h1>
          <div className="breadcrumbs">
            <a href="/dashboard">Dashboard</a>
            <span>/</span>
            <span>Simulator</span>
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
          Test how the AI analyzes proposals before submitting
        </p>
      </div>

      <div className="responsive-detail-grid">
        {/* Form */}
        <div className="table-container">
          <div style={{ padding: 'var(--spacing-6)' }}>
            <h3 className="heading-3 mb-6">Proposal Details</h3>
            
            <div className="form-group">
              <label className="form-label">Proposal Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter proposal title..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Describe your proposal..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Amount Requested (USD)</label>
              <input
                type="text"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="form-input"
                placeholder="50,000 MON"
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Proposer Wallet Age (months)</label>
                <input
                  type="number"
                  name="proposerWalletAge"
                  value={formData.proposerWalletAge}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Previous Approved Proposals</label>
                <input
                  type="number"
                  name="previousProposals"
                  value={formData.previousProposals}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Community Support: {formData.communitySupport}%</label>
              <input
                type="range"
                name="communitySupport"
                value={formData.communitySupport}
                onChange={handleChange}
                className="slider"
                min="0"
                max="100"
              />
            </div>

            <button 
              onClick={analyzeProposal}
              disabled={analyzing || !formData.title}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 'var(--spacing-4)' }}
            >
              {analyzing ? (
                <>
                  <Loader size={20} className="spinning" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Analyze Proposal
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="table-container">
            <div style={{ padding: 'var(--spacing-6)' }}>
              <h3 className="heading-3 mb-6">AI Analysis Result</h3>

              {!result && !analyzing && (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--color-gray-400)' }}>
                  <Sparkles size={48} style={{ marginBottom: 'var(--spacing-4)', opacity: 0.5 }} />
                  <p>Enter proposal details and click analyze to see the AI risk assessment</p>
                </div>
              )}

              {analyzing && (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
                  <Loader size={48} color="var(--color-teal-accent)" className="spinning" style={{ marginBottom: 'var(--spacing-4)' }} />
                  <p className="text-muted">AI agents analyzing proposal...</p>
                </div>
              )}

              {result && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-6)' }}>
                    <div style={{ marginBottom: 'var(--spacing-4)' }}>
                      <RiskBadge score={result.riskScore} level={result.riskLevel} />
                    </div>
                    <div style={{ 
                      fontSize: 'var(--font-size-4xl)', 
                      fontWeight: 'bold',
                      color: result.riskScore >= 70 ? 'var(--color-danger)' : 
                             result.riskScore >= 30 ? 'var(--color-warning)' : 'var(--color-success)'
                    }}>
                      {result.riskScore}/100
                    </div>
                    <p className="text-muted">Risk Score</p>
                  </div>

                  <div style={{
                    padding: 'var(--spacing-4)',
                    background: result.riskScore >= 70 ? 'rgba(239, 68, 68, 0.1)' :
                               result.riskScore >= 30 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 'var(--spacing-4)',
                    textAlign: 'center'
                  }}>
                    <strong>{result.recommendation}</strong>
                  </div>

                  {result.redFlags.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-400)', marginBottom: 'var(--spacing-3)' }}>
                        Red Flags Detected
                      </h4>
                      {result.redFlags.map((flag, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: 'var(--spacing-2) var(--spacing-3)',
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: 'var(--spacing-2)',
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-danger)'
                        }}>
                          <AlertTriangle size={14} />
                          {flag}
                        </div>
                      ))}
                    </div>
                  )}

                  {result.redFlags.length === 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: 'var(--spacing-3)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-success)'
                    }}>
                      <CheckCircle size={16} />
                      No red flags detected
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DashboardLayout>
  )
}
