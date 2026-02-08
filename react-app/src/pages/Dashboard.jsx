import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import 'echarts-gl'
import DashboardLayout from '../components/DashboardLayout'
import StatCard from '../components/StatCard'
import RiskBadge from '../components/RiskBadge'
import { useProposals } from '../context/ProposalsContext'
import NotificationDropdown from '../components/NotificationDropdown'
import { Wallet, Shield, Vote, AlertTriangle, Search, Bell, RefreshCw, TrendingUp, Plus } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const { proposals, getStats, refreshProposals, refreshing } = useProposals()
  const [stats, setStats] = useState({
    totalProtected: '0 MON',
    activeDAOs: 0,
    activeProposals: 0,
    highRiskAlerts: 0
  })
  const [autoRefresh, setAutoRefresh] = useState(true)
  const autoRefreshInterval = useRef(null)

  // Update stats when proposals change
  useEffect(() => {
    const newStats = getStats()
    setStats(newStats)
  }, [proposals, getStats])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshInterval.current = setInterval(() => {
        refreshProposals()
      }, 30000) // 30 seconds
    }

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current)
      }
    }
  }, [autoRefresh, refreshProposals])

  // Manual refresh function
  const handleRefresh = async () => {
    await refreshProposals()
  }

  // ECharts data
  const riskData = [
    { name: 'Low Risk', value: proposals.filter(p => p.riskScore < 30).length, itemStyle: { color: '#10b981' } },
    { name: 'Medium Risk', value: proposals.filter(p => p.riskScore >= 30 && p.riskScore < 50).length, itemStyle: { color: '#f59e0b' } },
    { name: 'High Risk', value: proposals.filter(p => p.riskScore >= 50 && p.riskScore < 70).length, itemStyle: { color: '#ef4444' } },
    { name: 'Critical', value: proposals.filter(p => p.riskScore >= 70).length, itemStyle: { color: '#dc2626' } },
  ]

  const chartOptions = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(17, 17, 27, 0.95)',
      borderColor: 'rgba(99, 102, 241, 0.3)',
      textStyle: { color: '#fff' },
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      roseType: 'radius',
      itemStyle: {
        borderRadius: 8,
        borderColor: 'rgba(0,0,0,0.3)',
        borderWidth: 2
      },
      label: {
        show: true,
        color: '#a1a1aa',
        fontSize: 12
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(99, 102, 241, 0.5)'
        },
        label: {
          fontSize: 14,
          fontWeight: 'bold'
        }
      },
      data: riskData
    }]
  }

  const activityData = [12, 19, 15, 25, 22, 30, 28]

  const barChartOptions = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 17, 27, 0.95)',
      borderColor: 'rgba(99, 102, 241, 0.3)',
      textStyle: { color: '#fff' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#71717a' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      axisLabel: { color: '#71717a' }
    },
    series: [{
      data: activityData,
      type: 'bar',
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#818cf8' },
            { offset: 1, color: '#6366f1' }
          ]
        }
      },
      emphasis: {
        itemStyle: {
          color: {
            type: 'linear',
            colorStops: [
              { offset: 0, color: '#a5b4fc' },
              { offset: 1, color: '#818cf8' }
            ]
          }
        }
      }
    }]
  }

  return (
    <DashboardLayout>
      {/* App Header with Breadcrumbs */}
      <div className="app-header" style={{ marginLeft: '-24px', marginRight: '-24px', marginTop: '-24px', marginBottom: 'var(--spacing-6)' }}>
        <div className="header-left">
          <h1 style={{ fontSize: 'var(--font-size-xl)', margin: 0 }}>Command Center</h1>
          <div className="breadcrumbs">
            <a href="/">Home</a>
            <span>/</span>
            <span>Dashboard</span>
          </div>
        </div>
        <div className="header-right">
          <div className="header-search">
            <Search size={16} />
            <input type="text" placeholder="Search..." defaultValue="" />
          </div>
          <button 
            onClick={() => navigate('/proposals/create')}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Create DAO Proposal
          </button>
          <button 
            className={`header-icon-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
            style={{ color: autoRefresh ? '#10b981' : undefined }}
          >
            <TrendingUp size={18} />
          </button>
          <button 
            className={`header-icon-btn ${refreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            title="Refresh data"
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
          </button>
          <NotificationDropdown />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard 
          icon={Wallet} 
          label="Total Protected" 
          value={stats.totalProtected} 
        />
        <StatCard 
          icon={Shield} 
          label="Active DAOs" 
          value={stats.activeDAOs} 
        />
        <StatCard 
          icon={Vote} 
          label="Active Proposals" 
          value={stats.activeProposals} 
        />
        <StatCard 
          icon={AlertTriangle} 
          label="High Risk Alerts" 
          value={stats.highRiskAlerts}
          valueColor="var(--color-danger)"
        />
      </div>

      {/* Risk Charts */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div className="chart-container">
          <h3 className="heading-3">Risk Assessment Overview</h3>
          <div style={{ height: 280, maxHeight: '50vh', position: 'relative' }}>
            <ReactECharts 
              option={chartOptions} 
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </div>
        <div className="chart-container">
          <h3 className="heading-3">Weekly Activity</h3>
          <div style={{ height: 280, maxHeight: '50vh', position: 'relative' }}>
            <ReactECharts 
              option={barChartOptions} 
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </div>
      </div>

      {/* Proposals Table */}
      <div className="table-container">
        <div style={{ padding: 'var(--spacing-6)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <h3 className="heading-3" style={{ margin: 0 }}>Priority Proposals</h3>
          <p className="text-small text-muted" style={{ marginTop: 'var(--spacing-2)' }}>
            Click any proposal to view detailed risk analysis
          </p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Proposal</th>
              <th>Amount</th>
              <th>Deadline</th>
              <th>Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map(proposal => (
              <tr key={proposal.id} onClick={() => navigate(`/proposals?id=${proposal.id}`)}>
                <td>#{proposal.id}</td>
                <td style={{ maxWidth: 300 }}>{proposal.title}</td>
                <td>{proposal.amount}</td>
                <td>{proposal.deadline}</td>
                <td><RiskBadge score={proposal.riskScore} level={proposal.riskLevel} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  )
}
