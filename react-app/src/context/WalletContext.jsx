import { createContext, useContext, useCallback, useMemo } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

const WalletContext = createContext()

export function WalletProvider({ children }) {
  const { address, isConnected, chain } = useAccount()
  const { connect: wagmiConnect } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()

  // Build wallet state from wagmi
  const wallet = useMemo(() => ({
    connected: isConnected,
    address: address || null,
    chainId: chain?.id || 10143,
    chainName: chain?.name || 'Monad Testnet'
  }), [isConnected, address, chain])

  const formatAddress = useCallback((addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }, [])

  const connect = useCallback(() => {
    // Trigger wagmi connection (RainbowKit modal will handle UI)
    wagmiConnect({ connector: injected() })
  }, [wagmiConnect])

  const disconnect = useCallback(() => {
    wagmiDisconnect()
    console.log('[Wallet] Disconnected')
  }, [wagmiDisconnect])

  return (
    <WalletContext.Provider value={{ wallet, connect, disconnect, formatAddress }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
