/**
 * AI Guard DAO - Application Configuration
 * 
 * Centralized configuration management using NestJS ConfigModule
 */

export interface AppConfig {
  port: number;
  nodeEnv: string;
  
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  
  auth: {
    /** Nonce TTL in seconds (default: 300 = 5 minutes) */
    nonceTtl: number;
    /** Session TTL in seconds (default: 86400 = 24 hours) */
    sessionTtl: number;
    /** Domain for SIWE message */
    domain: string;
    /** URI for SIWE message */
    uri: string;
    /** Statement shown to user when signing */
    statement: string;
  };
  
  rateLimit: {
    /** Time window in milliseconds */
    ttl: number;
    /** Max requests per window */
    limit: number;
  };

  blockchain: {
    /** RPC URL for blockchain connection */
    rpcUrl: string;
    /** Fallback RPC URL */
    fallbackRpcUrl?: string;
    /** DAO Governor contract address */
    daoGovernorAddress: string;
    /** VotingAgent contract address */
    votingAgentAddress: string;
    /** Starting block for historical sync (deployment block) */
    startBlock: number;
    /** Chain ID */
    chainId: number;
    /** Reconnection delay in ms */
    reconnectDelay: number;
    /** Max historical blocks to process per batch */
    maxBlockBatch: number;
    /** Backend wallet private key for signing transactions */
    backendPrivateKey: string;
  };

  database: {
    /** PostgreSQL connection URL */
    url: string;
  };
}

export const configuration = (): AppConfig => ({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  auth: {
    nonceTtl: parseInt(process.env.AUTH_NONCE_TTL || '300', 10),
    sessionTtl: parseInt(process.env.AUTH_SESSION_TTL || '86400', 10),
    domain: process.env.AUTH_DOMAIN || 'ai-guard-dao.xyz',
    uri: process.env.AUTH_URI || 'https://ai-guard-dao.xyz',
    statement: process.env.AUTH_STATEMENT || 'Sign in to AI Guard DAO',
  },
  
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  blockchain: {
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    fallbackRpcUrl: process.env.FALLBACK_RPC_URL,
    daoGovernorAddress: process.env.DAO_GOVERNOR_ADDRESS || '',
    votingAgentAddress: process.env.VOTING_AGENT_ADDRESS || '',
    startBlock: parseInt(process.env.START_BLOCK || '0', 10),
    chainId: parseInt(process.env.CHAIN_ID || '1', 10),
    reconnectDelay: parseInt(process.env.RECONNECT_DELAY || '5000', 10),
    maxBlockBatch: parseInt(process.env.MAX_BLOCK_BATCH || '10000', 10),
    backendPrivateKey: process.env.BACKEND_PRIVATE_KEY || '',
  },

  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_guard_dao',
  },
});

export default configuration;
