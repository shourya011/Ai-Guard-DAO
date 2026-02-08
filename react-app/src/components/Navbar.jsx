import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { Wallet, ShieldCheck } from 'lucide-react'

export default function Navbar() {
  const { wallet, connect, disconnect, formatAddress } = useWallet()

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand">
          <ShieldCheck size={24} />
          AI Guard Dog
        </Link>
        <ul className="navbar-nav">
          <li><Link to="/" className="navbar-link">Home</Link></li>
          <li><a href="#features" className="navbar-link">Features</a></li>
          <li><a href="#pricing" className="navbar-link">Pricing</a></li>
          <li><Link to="/dashboard" className="navbar-link">Dashboard</Link></li>
        </ul>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          {!wallet.connected ? (
            <button onClick={connect} className="btn btn-primary btn-sm">
              <Wallet size={16} />
              Connect Wallet
            </button>
          ) : (
            <div className="wallet-status">
              <Wallet size={16} />
              <span>{formatAddress(wallet.address)}</span>
              <button 
                onClick={disconnect}
                className="btn btn-sm"
                style={{ padding: '0.25rem 0.5rem', marginLeft: '0.5rem' }}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
