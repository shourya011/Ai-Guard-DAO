import { NavLink, Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardCheck, 
  Sparkles, 
  Settings, 
  User,
  Wallet,
  ShieldCheck,
  X
} from 'lucide-react'

export default function Sidebar({ isOpen, onClose }) {
  const { address, isConnected } = useAccount()

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand">
            <ShieldCheck size={24} />
            <span>AI Guard Dog</span>
          </Link>
          <button 
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

      <nav className="sidebar-nav">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/proposals" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <FileText size={20} />
          <span>DAO Proposals</span>
        </NavLink>

        <NavLink 
          to="/review" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <ClipboardCheck size={20} />
          <span>Review Queue</span>
        </NavLink>

        <NavLink 
          to="/simulator" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <Sparkles size={20} />
          <span>Simulator</span>
        </NavLink>

        <NavLink 
          to="/settings" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        {!isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button onClick={openConnectModal} className="btn btn-primary" style={{ width: '100%' }}>
                <Wallet size={16} />
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40,
              height: 40,
              background: 'rgba(0, 188, 212, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={20} color="var(--color-teal-accent)" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-white)' }}>
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                Monad Testnet
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  )
}
