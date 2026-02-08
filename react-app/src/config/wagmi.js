import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { 
  mainnet, 
  polygon, 
  optimism, 
  arbitrum, 
  base,
  sepolia 
} from 'wagmi/chains'

// Define Monad Testnet chain (custom chain)
export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
}

// Get WalletConnect Project ID from environment
const projectId = import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID

if (!projectId || projectId === 'demo-project-id') {
  console.warn(
    '⚠️ WalletConnect: Missing VITE_WALLETCONNECT_PROJECT_ID in .env file.\n' +
    '   Get a free project ID at: https://cloud.walletconnect.com/\n' +
    '   Add to .env: VITE_WALLETCONNECT_PROJECT_ID=your_project_id'
  )
}

export const config = getDefaultConfig({
  appName: 'AI Guard DAO',
  projectId: projectId || 'demo-fallback', // WalletConnect requires non-empty string
  chains: [
    monadTestnet,
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    sepolia,
  ],
  ssr: false,
})

// Export for backward compatibility
export const wagmiConfig = config
