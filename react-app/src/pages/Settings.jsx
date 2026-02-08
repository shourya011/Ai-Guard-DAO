import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import NotificationDropdown from '../components/NotificationDropdown'
import DelegationCard from '../components/guard/DelegationCard'
import { Save, Bell, Shield, Sliders, Users, AlertTriangle, Search, Bot, Check, Key, Globe, Database, Lock, Eye, Mail } from 'lucide-react'
import '../styles/Settings.css'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('delegation')
  const [thresholds, setThresholds] = useState({
    autoApprove: 19,
    autoReject: 80
  })
  const [notifications, setNotifications] = useState({
    email: true,
    browser: true,
    critical: true,
    summary: false
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('riskThresholds', JSON.stringify(thresholds))
    localStorage.setItem('notifications', JSON.stringify(notifications))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs = [
    { id: 'delegation', label: 'AI Delegation', icon: Bot, description: 'Manage voting delegation' },
    { id: 'thresholds', label: 'Risk Thresholds', icon: Sliders, description: 'Configure risk parameters' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert preferences' },
    { id: 'security', label: 'Security', icon: Shield, description: 'Security settings' },
    { id: 'team', label: 'Team', icon: Users, description: 'Manage team members' }
  ]

  return (
    <DashboardLayout>
      {/* App Header with Breadcrumbs */}
      <div className="app-header" style={{ marginLeft: '-24px', marginRight: '-24px', marginTop: '-24px', marginBottom: 'var(--spacing-6)' }}>
        <div className="header-left">
          <h1 style={{ fontSize: 'var(--font-size-xl)', margin: 0 }}>Settings</h1>
          <div className="breadcrumbs">
            <a href="/dashboard">Dashboard</a>
            <span>/</span>
            <span>Settings</span>
          </div>
        </div>
        <div className="header-right">
          <div className="header-search">
            <Search size={16} />
            <input type="text" placeholder="Search settings..." defaultValue="" />
          </div>
          <NotificationDropdown />
        </div>
      </div>

      <div style={{ marginBottom: 'var(--spacing-8)' }}>
        <h2 className="heading-2" style={{ marginBottom: 'var(--spacing-2)' }}>Settings</h2>
        <p className="text-large text-muted">Configure your AI Guard Dog preferences and system settings</p>
      </div>

      <div className="settings-layout-new">
        {/* Settings Nav - Modern Card Style */}
        <div className="settings-sidebar">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              >
                <div className="settings-nav-icon">
                  <Icon size={20} />
                </div>
                <div className="settings-nav-content">
                  <div className="settings-nav-label">{tab.label}</div>
                  <div className="settings-nav-description">{tab.description}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Settings Content - Modern Design */}
        <div className="settings-content-area">
          <div className="settings-content-wrapper">
            {activeTab === 'delegation' && (
              <div className="settings-section">
                <div className="section-header-new">
                  <div>
                    <h3 className="section-title">AI Delegation (On-Chain)</h3>
                    <p className="section-subtitle">
                      Delegate your voting power to the AI Guard agent. Your tokens remain in your wallet - 
                      only voting rights are delegated.
                    </p>
                  </div>
                </div>

                <div className="settings-cards">
                  {/* DelegationCard Component */}
                  <div className="settings-card-large">
                    <DelegationCard 
                      onStatusChange={(isActive) => {
                        console.log('Delegation status changed:', isActive)
                      }}
                    />
                  </div>

                  {/* How It Works */}
                  <div className="info-card-modern">
                    <div className="info-card-header">
                      <Shield size={24} className="info-card-icon" />
                      <h4>How AI Delegation Works</h4>
                    </div>
                    <div className="info-features-grid">
                      <div className="info-feature">
                        <div className="feature-icon"><Lock size={18} /></div>
                        <div>
                          <div className="feature-title">Non-custodial</div>
                          <div className="feature-desc">Your tokens never leave your wallet</div>
                        </div>
                      </div>
                      <div className="info-feature">
                        <div className="feature-icon"><Sliders size={18} /></div>
                        <div>
                          <div className="feature-title">Risk-based</div>
                          <div className="feature-desc">AI only votes below your threshold</div>
                        </div>
                      </div>
                      <div className="info-feature">
                        <div className="feature-icon"><Eye size={18} /></div>
                        <div>
                          <div className="feature-title">Transparent</div>
                          <div className="feature-desc">All votes logged on-chain</div>
                        </div>
                      </div>
                      <div className="info-feature">
                        <div className="feature-icon"><Key size={18} /></div>
                        <div>
                          <div className="feature-title">Revocable</div>
                          <div className="feature-desc">Revoke delegation anytime</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'thresholds' && (
              <div className="settings-section">
                <div className="section-header-new">
                  <div>
                    <h3 className="section-title">Risk Thresholds</h3>
                    <p className="section-subtitle">
                      Configure automatic voting behavior based on AI risk scores
                    </p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Auto-Approve Threshold: {thresholds.autoApprove}
                  </label>
                  <p className="text-small text-muted mb-4">
                    Proposals with risk scores below this value will be automatically approved
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={thresholds.autoApprove}
                    onChange={(e) => setThresholds(prev => ({ ...prev, autoApprove: parseInt(e.target.value) }))}
                    className="slider"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-2)' }}>
                    <span className="text-small text-muted">0 (Very Strict)</span>
                    <span className="text-small text-muted">50 (Lenient)</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 'var(--spacing-8)' }}>
                  <label className="form-label">
                    Auto-Reject Threshold: {thresholds.autoReject}
                  </label>
                  <p className="text-small text-muted mb-4">
                    Proposals with risk scores above this value will be automatically rejected
                  </p>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={thresholds.autoReject}
                    onChange={(e) => setThresholds(prev => ({ ...prev, autoReject: parseInt(e.target.value) }))}
                    className="slider"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-2)' }}>
                    <span className="text-small text-muted">50 (Strict)</span>
                    <span className="text-small text-muted">100 (Never Auto-Reject)</span>
                  </div>
                </div>

                {/* Preview */}
                <div style={{
                  marginTop: 'var(--spacing-8)',
                  padding: 'var(--spacing-4)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                  <h4 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-sm)' }}>Threshold Preview</h4>
                  <div style={{ height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-full)', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${thresholds.autoApprove}%`,
                      background: 'var(--color-success)',
                      borderRadius: 'var(--radius-full) 0 0 var(--radius-full)'
                    }} />
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: `${100 - thresholds.autoReject}%`,
                      background: 'var(--color-danger)',
                      borderRadius: '0 var(--radius-full) var(--radius-full) 0'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)' }}>
                    <span style={{ color: 'var(--color-success)' }}>Auto-Approve (0-{thresholds.autoApprove})</span>
                    <span style={{ color: 'var(--color-warning)' }}>Human Review ({thresholds.autoApprove}-{thresholds.autoReject})</span>
                    <span style={{ color: 'var(--color-danger)' }}>Auto-Reject ({thresholds.autoReject}-100)</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="settings-section">
                <div className="section-header-new">
                  <div>
                    <h3 className="section-title">Notification Settings</h3>
                    <p className="section-subtitle">
                      Configure how you receive alerts about proposals
                    </p>
                  </div>
                </div>

                <div className="settings-cards">
                  {[
                    { key: 'email', label: 'Email Notifications', desc: 'Receive alerts via email', icon: Mail },
                    { key: 'browser', label: 'Browser Notifications', desc: 'Show desktop notifications', icon: Bell },
                    { key: 'critical', label: 'Critical Alerts Only', desc: 'Only notify for high-risk proposals', icon: AlertTriangle },
                    { key: 'summary', label: 'Daily Summary', desc: 'Receive a daily digest of activity', icon: Globe }
                  ].map(item => {
                    const Icon = item.icon
                    return (
                      <div key={item.key} className="setting-option">
                        <div className="setting-option-content">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                            <Icon size={18} style={{ color: '#64748b' }} />
                            <div className="setting-option-label">{item.label}</div>
                          </div>
                          <div className="setting-option-desc">{item.desc}</div>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={notifications[item.key]}
                            onChange={(e) => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="settings-section">
                <div className="section-header-new">
                  <div>
                    <h3 className="section-title">Security Settings</h3>
                    <p className="section-subtitle">
                      Manage your account security
                    </p>
                  </div>
                </div>

                <div className="settings-cards">
                  <div className="info-card-modern" style={{ 
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 146, 60, 0.1) 100%)',
                    borderColor: 'rgba(245, 158, 11, 0.25)'
                  }}>
                    <div className="info-card-header">
                      <Shield size={24} style={{ color: '#f59e0b' }} />
                      <h4 style={{ color: '#f59e0b' }}>Two-Factor Authentication</h4>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                      Enhance your account security by enabling 2FA. Protect your assets with an additional layer of verification.
                    </p>
                    <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                      <Lock size={18} />
                      Enable 2FA
                    </button>
                  </div>

                  <div className="settings-card-large">
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#e2e8f0' }}>
                      Connected Wallet
                    </h4>
                    <div style={{
                      padding: '1rem 1.25rem',
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(71, 85, 105, 0.3)',
                      borderRadius: '10px',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      color: '#64748b'
                    }}>
                      Not connected
                    </div>
                    <button className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%' }}>
                      <Key size={18} />
                      Connect Wallet
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="settings-section">
                <div className="section-header-new">
                  <div>
                    <h3 className="section-title">Team Management</h3>
                    <p className="section-subtitle">
                      Manage team members and permissions
                    </p>
                  </div>
                </div>

                <div className="settings-cards">
                  <div style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px dashed rgba(71, 85, 105, 0.5)',
                    borderRadius: '16px'
                  }}>
                    <Users size={64} style={{ marginBottom: '1.5rem', opacity: 0.3, color: '#64748b' }} />
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: '#e2e8f0' }}>
                      Team Management Coming Soon
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                      Team management is available on Pro and Enterprise plans. Invite collaborators, assign roles, and manage permissions.
                    </p>
                    <button className="btn btn-primary">
                      <Database size={18} />
                      Upgrade to Pro
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save Button Area */}
          {(activeTab === 'thresholds' || activeTab === 'notifications') && (
            <div className="settings-save-area">
              <button 
                onClick={handleSave} 
                className={`save-button ${saved ? 'saved' : ''}`}
                disabled={saved}
              >
                {saved ? (
                  <>
                    <Check size={18} />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
