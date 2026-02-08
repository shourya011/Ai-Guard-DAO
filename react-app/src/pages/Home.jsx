import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { 
  LayoutDashboard, 
  Gauge, 
  ShieldCheck,
  BarChart3, 
  Wallet,
  AlertTriangle,
  Vote,
  Shield,
  LineChart,
  Lock,
  BadgeCheck,
  Link as LinkIcon,
  ChevronDown,
  Play,
  Zap,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Globe,
  Activity
} from 'lucide-react'

// Hook for intersection observer animations
function useInView(options = {}) {
  const ref = useRef(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true)
      }
    }, { threshold: 0.1, ...options })

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return [ref, isInView]
}

// Animated Section Component
function AnimatedSection({ children, className = '', delay = 0 }) {
  const [ref, isInView] = useInView()
  
  return (
    <div 
      ref={ref}
      className={`animated-section ${isInView ? 'in-view' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function Home() {
  const [activeNav, setActiveNav] = useState('home')
  const [scrolled, setScrolled] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const { isConnected } = useAccount()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'features', label: 'Features', href: '#features' },
    { id: 'pricing', label: 'Pricing', href: '#pricing' },
    { id: 'resources', label: 'Resources', href: '#', hasDropdown: true }
  ]

  const stats = [
    { icon: Gauge, label: 'Detection Speed', value: '<60s', color: 'var(--color-teal-accent)' },
    { icon: ShieldCheck, label: 'Fraud Detection', value: '95%+', color: 'var(--color-success)' },
    { icon: BarChart3, label: 'Protected DAOs', value: '50+', color: 'var(--color-warning)' },
    { icon: Wallet, label: 'Assets Secured', value: '50M+ MON', color: 'var(--color-primary-navy)' }
  ]

  const features = [
    {
      icon: AlertTriangle,
      title: 'Real-Time Risk Assessment',
      description: 'Advanced AI agents analyze proposals instantly, checking on-chain history, wallet reputation, and community sentiment.',
      badge: 'HOT'
    },
    {
      icon: Vote,
      title: 'Automated Voting',
      description: 'Low-risk proposals are automatically approved, while high-risk items are flagged for human review.',
      badge: null
    },
    {
      icon: Shield,
      title: 'On-Chain Audit Trail',
      description: 'Every decision is recorded on Monad blockchain with immutable risk reports and voting history.',
      badge: 'NEW'
    },
    {
      icon: LineChart,
      title: 'Comprehensive Analytics',
      description: 'Monitor treasury health, track voting patterns, and analyze risk trends with real-time dashboards.',
      badge: null
    },
    {
      icon: Lock,
      title: 'Non-Custodial Security',
      description: 'Your funds never leave your wallet. Delegate voting power with revocable permissions.',
      badge: null
    },
    {
      icon: BadgeCheck,
      title: 'Multi-Source Intelligence',
      description: 'Background checks combine on-chain data with off-chain signals for comprehensive due diligence.',
      badge: null
    }
  ]

  const liveMetrics = [
    { label: 'Proposals/hr', value: '127', trend: '+12%' },
    { label: 'Risk Score Avg', value: '23', trend: '-5%' },
    { label: 'Auto-Approved', value: '89%', trend: '+3%' },
    { label: 'Response Time', value: '1.2s', trend: '-15%' }
  ]

  return (
    <div className="landing-page">
      {/* Floating Pill Navigation */}
      <nav className={`pill-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="pill-nav-container">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={`pill-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              {activeNav === item.id && <span className="nav-indicator" />}
              {item.label}
              {item.hasDropdown && <ChevronDown size={14} />}
            </a>
          ))}
          <div className="pill-nav-wallet">
            <ConnectButton 
              accountStatus="address"
              chainStatus="icon"
              showBalance={false}
            />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-modern">
        <div className="hero-bg-effects">
          <div className="hero-glow-1" />
          <div className="hero-glow-2" />
          <div className="hero-grid-pattern" />
        </div>

        <div className="container">
          <AnimatedSection className="hero-badge-container" delay={0}>
            <div className="hero-badge">
              <Sparkles size={14} />
              <span>Powered by Monad Blockchain</span>
              <span className="badge-live">
                <span className="live-dot" />
                Live
              </span>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <h1 className="hero-title-modern">
              Automated Treasury
              <br />
              <span className="gradient-text">Protection on Monad</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <p className="hero-subtitle-modern">
              AI-powered multi-agent system that protects DAO treasuries from fraudulent proposals.
              <br />
              Real-time risk assessment, automated voting, and comprehensive audit trails.
            </p>
          </AnimatedSection>

          <AnimatedSection className="hero-cta-modern" delay={300}>
            <Link to="/dashboard" className="btn-modern btn-primary-modern">
              <LayoutDashboard size={18} />
              Launch Dashboard
              <ArrowRight size={16} className="btn-arrow" />
            </Link>
            <button className="btn-modern btn-secondary-modern">
              <Play size={16} />
              Watch Demo
            </button>
          </AnimatedSection>

          {/* Live Metrics Bar */}
          <AnimatedSection className="live-metrics-bar" delay={400}>
            <div className="metrics-label">
              <Activity size={14} />
              <span>Live Metrics</span>
              <span className="updating-badge">● Updating live</span>
            </div>
            <div className="metrics-grid">
              {liveMetrics.map((metric, index) => (
                <div key={index} className="metric-item">
                  <span className="metric-label">{metric.label}</span>
                  <span className="metric-value">{metric.value}</span>
                  <span className={`metric-trend ${metric.trend.startsWith('+') ? 'positive' : 'negative'}`}>
                    {metric.trend}
                  </span>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid-modern">
            {stats.map((stat, index) => (
              <AnimatedSection key={index} delay={index * 100}>
                <div className="stat-card-modern">
                  <div className="stat-icon-modern" style={{ background: `${stat.color}15` }}>
                    <stat.icon size={24} style={{ color: stat.color }} />
                  </div>
                  <div className="stat-content-modern">
                    <span className="stat-label-modern">{stat.label}</span>
                    <span className="stat-value-modern">{stat.value}</span>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <AnimatedSection className="section-header-modern">
            <span className="section-badge">FEATURES</span>
            <h2 className="section-title-modern">Enterprise-Grade Protection</h2>
            <p className="section-subtitle-modern">
              Leverage AI agents and Monad's high-performance infrastructure to safeguard your treasury
            </p>
          </AnimatedSection>

          <div className="features-grid-modern">
            {features.map((feature, index) => (
              <AnimatedSection key={index} delay={index * 80}>
                <div className="feature-card-modern">
                  {feature.badge && (
                    <span className={`feature-badge ${feature.badge.toLowerCase()}`}>
                      {feature.badge}
                    </span>
                  )}
                  <div className="feature-icon-modern">
                    <feature.icon size={24} />
                  </div>
                  <h3 className="feature-title-modern">{feature.title}</h3>
                  <p className="feature-desc-modern">{feature.description}</p>
                  <a href="#" className="feature-link">
                    Learn more <ArrowRight size={14} />
                  </a>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="preview-section">
        <div className="container">
          <AnimatedSection>
            <div className="preview-card">
              <div className="preview-header">
                <div className="preview-tabs">
                  <button 
                    className={`preview-tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    Overview
                  </button>
                  <button 
                    className={`preview-tab ${activeTab === 'realtime' ? 'active' : ''}`}
                    onClick={() => setActiveTab('realtime')}
                  >
                    Real-time
                  </button>
                  <button 
                    className={`preview-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                  >
                    Analytics
                  </button>
                  <button 
                    className={`preview-tab ${activeTab === 'alerts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('alerts')}
                  >
                    Alerts
                  </button>
                </div>
                <div className="preview-actions">
                  <span className="updating-badge">● Updating live</span>
                </div>
              </div>
              
              <div className="preview-content">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="tab-content active full-width">
                    <div className="preview-title-row">
                      <h3>Campaign Performance</h3>
                      <span className="trending-badge">
                        <TrendingUp size={12} />
                        TRENDING
                      </span>
                    </div>
                    <p className="preview-subtitle">Proposals analyzed with AI-powered risk detection • <a href="#">View detailed report</a></p>
                    
                    <div className="overview-grid">
                      {/* Alert Card */}
                      <div className="overview-alert-card">
                        <div className="alert-header">
                          <div>
                            <h4>High Risk Proposal Detected</h4>
                            <p>Risk Score: 78 • +15% from last check • 3 red flags</p>
                          </div>
                          <span className="alert-badge hot">HOT</span>
                        </div>
                        <div className="alert-stats-grid">
                          <div className="alert-stat">
                            <span className="alert-stat-label">Proposals Scanned</span>
                            <span className="alert-stat-value">2.4K</span>
                          </div>
                          <div className="alert-stat">
                            <span className="alert-stat-label">Flagged</span>
                            <span className="alert-stat-value danger">288</span>
                          </div>
                          <div className="alert-stat">
                            <span className="alert-stat-label">Auto-Approved</span>
                            <span className="alert-stat-value success">12%</span>
                          </div>
                          <div className="alert-stat">
                            <span className="alert-stat-label">Risk Level</span>
                            <span className="alert-stat-value warning">Medium</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Card */}
                      <div className="overview-progress-card">
                        <div className="progress-header">
                          <div>
                            <h4>Analyzing New Proposal</h4>
                            <p>Proposal #847 • 3 AI Agents • Est. time 45s</p>
                          </div>
                          <span className="progress-time">00:45</span>
                        </div>
                        <div className="progress-row">
                          <span>Processing</span>
                          <div className="progress-bar-modern">
                            <div className="progress-fill" style={{ width: '67%' }} />
                          </div>
                          <span>67%</span>
                          <button className="stop-btn">STOP</button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section - Metrics, DAOs, Autopilot in a row */}
                    <div className="overview-bottom-grid">
                      <div className="overview-metrics-card">
                        <h4>LIVE METRICS</h4>
                        <div className="metrics-row">
                          <div className="metric-item">
                            <span className="metric-label">Proposals/hr</span>
                            <span className="metric-value">843</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Response Rate</span>
                            <span className="metric-value accent">12%</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Approval Rate</span>
                            <span className="metric-value">34%</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Risk Score</span>
                            <span className="metric-value success">9.2</span>
                          </div>
                        </div>
                      </div>

                      <div className="overview-daos-card">
                        <h4>CONNECTED DAOS</h4>
                        <p>Active on 4 chains. All monitoring agents running.</p>
                        <div className="chain-icons">
                          <div className="chain-icon"><Globe size={16} /></div>
                          <div className="chain-icon"><Zap size={16} /></div>
                          <div className="chain-icon"><Shield size={16} /></div>
                        </div>
                      </div>

                      <div className="overview-autopilot-card">
                        <h4>AUTOPILOT</h4>
                        <div className="autopilot-toggles">
                          <div className="toggle-row-inline">
                            <span>Auto-approve</span>
                            <div className="toggle-switch active" />
                          </div>
                          <div className="toggle-row-inline">
                            <span>Smart Alerts</span>
                            <div className="toggle-switch active" />
                          </div>
                          <div className="toggle-row-inline">
                            <span>Risk Watch</span>
                            <div className="toggle-switch" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real-time Tab */}
                {activeTab === 'realtime' && (
                  <div className="tab-content active full-width">
                    <div className="preview-title-row">
                      <h3>Real-Time Activity Stream</h3>
                      <span className="live-indicator">
                        <span className="live-dot"></span>
                        LIVE
                      </span>
                    </div>
                    <p className="preview-subtitle">Live monitoring of all DAO activities across connected chains</p>
                    
                    <div className="realtime-layout">
                      <div className="activity-stream-full">
                        <div className="activity-item">
                          <div className="activity-icon success"><CheckCircle2 size={18} /></div>
                          <div className="activity-content">
                            <span className="activity-title">Proposal #852 approved</span>
                            <span className="activity-time">2 seconds ago</span>
                          </div>
                          <span className="activity-badge success">Approved</span>
                        </div>
                        <div className="activity-item">
                          <div className="activity-icon warning"><AlertTriangle size={18} /></div>
                          <div className="activity-content">
                            <span className="activity-title">Risk alert: Unusual voting pattern detected</span>
                            <span className="activity-time">15 seconds ago</span>
                          </div>
                          <span className="activity-badge warning">Alert</span>
                        </div>
                        <div className="activity-item">
                          <div className="activity-icon info"><Vote size={18} /></div>
                          <div className="activity-content">
                            <span className="activity-title">New vote cast on Proposal #847</span>
                            <span className="activity-time">32 seconds ago</span>
                          </div>
                          <span className="activity-badge info">Vote</span>
                        </div>
                        <div className="activity-item">
                          <div className="activity-icon"><Sparkles size={18} /></div>
                          <div className="activity-content">
                            <span className="activity-title">AI Agent completed risk analysis</span>
                            <span className="activity-time">1 minute ago</span>
                          </div>
                          <span className="activity-badge">Analysis</span>
                        </div>
                      </div>
                      
                      <div className="stream-filters-inline">
                        <h4>STREAM FILTERS</h4>
                        <div className="filter-chips">
                          <label className="filter-chip active">
                            <input type="checkbox" defaultChecked /> All Events
                          </label>
                          <label className="filter-chip active">
                            <input type="checkbox" defaultChecked /> Risk Alerts
                          </label>
                          <label className="filter-chip active">
                            <input type="checkbox" defaultChecked /> Votes
                          </label>
                          <label className="filter-chip">
                            <input type="checkbox" /> Debug Logs
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                  <div className="tab-content active full-width">
                    <div className="preview-title-row">
                      <h3>Analytics Dashboard</h3>
                      <span className="period-badge">Last 7 days</span>
                    </div>
                    <p className="preview-subtitle">Comprehensive metrics and trends for your DAO protection</p>
                    
                    <div className="analytics-grid-full">
                      <div className="analytics-card">
                        <span className="analytics-label">TOTAL PROPOSALS</span>
                        <div className="analytics-value-row">
                          <span className="analytics-prefix">ANALYZED</span>
                          <span className="analytics-value">1,247</span>
                          <span className="analytics-trend positive">+12.5%</span>
                        </div>
                      </div>
                      <div className="analytics-card">
                        <span className="analytics-label">THREATS</span>
                        <div className="analytics-value-row">
                          <span className="analytics-prefix">BLOCKED</span>
                          <span className="analytics-value">23</span>
                          <span className="analytics-trend negative">+3</span>
                        </div>
                      </div>
                      <div className="analytics-card">
                        <span className="analytics-label">AVG RESPONSE</span>
                        <div className="analytics-value-row">
                          <span className="analytics-prefix">TIME</span>
                          <span className="analytics-value">1.2s</span>
                          <span className="analytics-trend positive">-0.3s</span>
                        </div>
                      </div>
                      <div className="analytics-card">
                        <span className="analytics-label">PROTECTION</span>
                        <div className="analytics-value-row">
                          <span className="analytics-prefix">SCORE</span>
                          <span className="analytics-value">98.5%</span>
                          <span className="analytics-trend positive">+2.1%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="analytics-bottom-section">
                      <div className="quick-reports-inline">
                        <h4>QUICK REPORTS</h4>
                        <div className="report-buttons">
                          <a href="#" className="report-btn">📊 Weekly Summary</a>
                          <a href="#" className="report-btn">⚠️ Risk Report</a>
                          <a href="#" className="report-btn">📋 Audit Log</a>
                        </div>
                      </div>
                      
                      <div className="analytics-chart-preview">
                        <h4>TREND OVERVIEW</h4>
                        <div className="mini-chart-area">
                          <div className="chart-bars">
                            <div className="chart-bar" style={{ height: '40%' }}><span>M</span></div>
                            <div className="chart-bar" style={{ height: '65%' }}><span>T</span></div>
                            <div className="chart-bar" style={{ height: '55%' }}><span>W</span></div>
                            <div className="chart-bar" style={{ height: '80%' }}><span>T</span></div>
                            <div className="chart-bar" style={{ height: '70%' }}><span>F</span></div>
                            <div className="chart-bar active" style={{ height: '90%' }}><span>S</span></div>
                            <div className="chart-bar" style={{ height: '75%' }}><span>S</span></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="analytics-insights">
                        <h4>KEY INSIGHTS</h4>
                        <div className="insight-items">
                          <div className="insight-item">
                            <TrendingUp size={16} />
                            <span>23% increase in proposal activity</span>
                          </div>
                          <div className="insight-item">
                            <Shield size={16} />
                            <span>Zero critical vulnerabilities this week</span>
                          </div>
                          <div className="insight-item">
                            <Zap size={16} />
                            <span>Response time improved by 0.3s</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                  <div className="tab-content active full-width">
                    <div className="preview-title-row">
                      <h3>Alert Center</h3>
                      <span className="alert-count-badge">4 Active</span>
                    </div>
                    <p className="preview-subtitle">Configure and monitor security alerts for your DAOs</p>
                    
                    <div className="alerts-layout">
                      <div className="alerts-list-full">
                        <div className="alert-item-full critical">
                          <div className="alert-item-icon"><AlertTriangle size={20} /></div>
                          <div className="alert-item-content">
                            <span className="alert-item-title">Critical: Large withdrawal detected</span>
                            <span className="alert-item-desc">Proposal #845 requests 500 ETH transfer</span>
                          </div>
                          <span className="alert-item-time">5 min ago</span>
                          <button className="alert-action-btn">View</button>
                        </div>
                        <div className="alert-item-full warning">
                          <div className="alert-item-icon"><AlertTriangle size={20} /></div>
                          <div className="alert-item-content">
                            <span className="alert-item-title">Warning: New wallet with voting power</span>
                            <span className="alert-item-desc">0x7a3d...8f2c acquired significant tokens</span>
                          </div>
                          <span className="alert-item-time">23 min ago</span>
                          <button className="alert-action-btn">View</button>
                        </div>
                        <div className="alert-item-full info">
                          <div className="alert-item-icon"><Shield size={20} /></div>
                          <div className="alert-item-content">
                            <span className="alert-item-title">Info: Governance threshold updated</span>
                            <span className="alert-item-desc">Quorum changed from 10% to 15%</span>
                          </div>
                          <span className="alert-item-time">1 hour ago</span>
                          <button className="alert-action-btn">View</button>
                        </div>
                      </div>
                      
                      <div className="alert-settings-inline">
                        <h4>ALERT SETTINGS</h4>
                        <div className="settings-toggles">
                          <div className="toggle-row-inline">
                            <span>Email notifications</span>
                            <div className="toggle-switch active" />
                          </div>
                          <div className="toggle-row-inline">
                            <span>Push notifications</span>
                            <div className="toggle-switch active" />
                          </div>
                          <div className="toggle-row-inline">
                            <span>Slack integration</span>
                            <div className="toggle-switch" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="container">
          <AnimatedSection className="section-header-modern">
            <span className="section-badge">PRICING</span>
            <h2 className="section-title-modern">Transparent Pricing</h2>
            <p className="section-subtitle-modern">
              Choose the plan that fits your DAO's needs. No hidden fees, cancel anytime.
            </p>
          </AnimatedSection>

          <div className="pricing-grid-modern">
            <AnimatedSection delay={0}>
              <div className="pricing-card-modern">
                <div className="pricing-header-modern">
                  <h3 className="pricing-name-modern">Starter</h3>
                  <div className="pricing-price-modern">Free</div>
                  <p className="pricing-period-modern">Forever</p>
                </div>
                <ul className="pricing-features-modern">
                  <li><CheckCircle2 size={16} /> Up to 10 proposals/month</li>
                  <li><CheckCircle2 size={16} /> Basic risk scoring</li>
                  <li><CheckCircle2 size={16} /> Email alerts</li>
                  <li><CheckCircle2 size={16} /> Dashboard access</li>
                  <li><CheckCircle2 size={16} /> Community support</li>
                </ul>
                <Link to="/dashboard" className="btn-modern btn-outline-modern">Get Started</Link>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <div className="pricing-card-modern featured">
                <span className="pricing-badge-modern">Most Popular</span>
                <div className="pricing-header-modern">
                  <h3 className="pricing-name-modern">Pro</h3>
                  <div className="pricing-price-modern">49 MON<span>/mo</span></div>
                  <p className="pricing-period-modern">Billed monthly</p>
                </div>
                <ul className="pricing-features-modern">
                  <li><CheckCircle2 size={16} /> Up to 100 proposals/month</li>
                  <li><CheckCircle2 size={16} /> Advanced AI risk models</li>
                  <li><CheckCircle2 size={16} /> Real-time SMS/push alerts</li>
                  <li><CheckCircle2 size={16} /> Automated voting</li>
                  <li><CheckCircle2 size={16} /> Priority support</li>
                  <li><CheckCircle2 size={16} /> Custom risk thresholds</li>
                  <li><CheckCircle2 size={16} /> API access</li>
                </ul>
                <Link to="/dashboard" className="btn-modern btn-primary-modern">Start Pro Trial</Link>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="pricing-card-modern">
                <div className="pricing-header-modern">
                  <h3 className="pricing-name-modern">Enterprise</h3>
                  <div className="pricing-price-modern">499 MON<span>/mo</span></div>
                  <p className="pricing-period-modern">Custom billing</p>
                </div>
                <ul className="pricing-features-modern">
                  <li><CheckCircle2 size={16} /> Unlimited proposals</li>
                  <li><CheckCircle2 size={16} /> Custom ML models</li>
                  <li><CheckCircle2 size={16} /> Dedicated account manager</li>
                  <li><CheckCircle2 size={16} /> White-label solution</li>
                  <li><CheckCircle2 size={16} /> Multi-DAO management</li>
                  <li><CheckCircle2 size={16} /> SLA guarantees</li>
                  <li><CheckCircle2 size={16} /> 24/7 phone support</li>
                </ul>
                <Link to="/dashboard" className="btn-modern btn-outline-modern">Contact Sales</Link>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <AnimatedSection>
            <div className="cta-card">
              <div className="cta-content">
                <h2>Ready to protect your treasury?</h2>
                <p>Join 50+ DAOs already using AI Guard Dog to secure their assets.</p>
                <div className="cta-buttons">
                  <Link to="/dashboard" className="btn-modern btn-primary-modern btn-lg">
                    Get Started Free
                    <ArrowRight size={18} />
                  </Link>
                  <a href="#" className="btn-modern btn-ghost-modern btn-lg">
                    Schedule Demo
                  </a>
                </div>
              </div>
              <div className="cta-stats">
                <div className="cta-stat">
                  <Users size={24} />
                  <span className="cta-stat-value">50+</span>
                  <span className="cta-stat-label">Active DAOs</span>
                </div>
                <div className="cta-stat">
                  <Shield size={24} />
                  <span className="cta-stat-value">50M+ MON</span>
                  <span className="cta-stat-label">Assets Protected</span>
                </div>
                <div className="cta-stat">
                  <Zap size={24} />
                  <span className="cta-stat-value">1.2s</span>
                  <span className="cta-stat-label">Avg Response</span>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-modern">
        <div className="container">
          <div className="footer-grid-modern">
            <div className="footer-brand">
              <div className="footer-logo">
                <ShieldCheck size={24} />
                <span>AI Guard Dog</span>
              </div>
              <p>Protecting DAO treasuries with AI-powered risk assessment on Monad blockchain.</p>
            </div>
            
            <div className="footer-links-section">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><a href="#">Documentation</a></li>
              </ul>
            </div>

            <div className="footer-links-section">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About Us</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>

            <div className="footer-links-section">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-modern">
            <p>&copy; 2026 AI Guard Dog. Built on Monad Blockchain.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
