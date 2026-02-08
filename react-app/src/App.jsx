import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { config } from './config/wagmi'
import { WalletProvider } from './context/WalletContext'
import { ProposalsProvider } from './context/ProposalsContext'
import AnimatedCursor from './components/AnimatedCursor'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Proposals from './pages/Proposals'
import CreateProposal from './pages/CreateProposal'
import Review from './pages/Review'
import Simulator from './pages/Simulator'
import Settings from './pages/Settings'

import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#10b981',
            accentColorForeground: 'white',
            borderRadius: 'large',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          modalSize="compact"
        >
          <WalletProvider>
            <ProposalsProvider>
              <AnimatedCursor />
              <Router>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/proposals" element={<Proposals />} />
                  <Route path="/proposals/create" element={<CreateProposal />} />
                  <Route path="/review" element={<Review />} />
                  <Route path="/simulator" element={<Simulator />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Router>
            </ProposalsProvider>
          </WalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
