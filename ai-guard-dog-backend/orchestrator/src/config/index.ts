import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'ai_guard_dog',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  
  // Blockchain
  blockchain: {
    rpcUrl: process.env.MONAD_RPC_URL || 'http://127.0.0.1:8545',
    wsUrl: process.env.MONAD_WS_URL || 'ws://127.0.0.1:8545',
    contracts: {
      daoGovernor: process.env.DAO_GOVERNOR_ADDRESS || '',
      proposalManager: process.env.PROPOSAL_MANAGER_ADDRESS || '',
      votingAgent: process.env.VOTING_AGENT_ADDRESS || '',
    },
    aiAgentPrivateKey: process.env.AI_AGENT_PRIVATE_KEY || '',
  },
  
  // External Services
  intelligenceApiUrl: process.env.INTELLIGENCE_API_URL || 'http://localhost:8000',
  ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs',
  
  // Risk Thresholds (Module B Logic)
  riskThresholds: {
    autoApproveMax: 19,    // 0-19: Auto-approve
    humanReviewMin: 20,    // 20-79: Human review
    humanReviewMax: 79,
    autoRejectMin: 80,     // 80-100: Auto-reject
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
};

export default config;
