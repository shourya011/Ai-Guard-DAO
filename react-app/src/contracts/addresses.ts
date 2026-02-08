/**
 * Contract Addresses Configuration
 * 
 * Centralized contract addresses for different networks
 * Deployed to Monad Testnet on: 2026-01-25
 */

export type ChainId = 10143 | 1 | 11155111; // Monad Testnet, Mainnet, Sepolia

export interface ContractAddresses {
  daoCore: `0x${string}`;
  daoToken: `0x${string}`;
  treasury: `0x${string}`;
  proposalManager: `0x${string}`;
  votingEngine: `0x${string}`;
  memberRegistry: `0x${string}`;
  timelock: `0x${string}`;
  aiAgentRegistry: `0x${string}`;
}

/**
 * Contract addresses by chain ID
 * Monad Testnet deployed: 2026-01-25
 */
export const CONTRACT_ADDRESSES: Record<ChainId, ContractAddresses> = {
  // Monad Testnet - LIVE DEPLOYED CONTRACTS
  10143: {
    daoCore: '0x75D2e00ecA54e5C96707eAf4ECcFe644dEC6a351' as `0x${string}`,
    daoToken: '0x4a6a8609Eeec4Fec9115D68Bf37F2d90e062B73f' as `0x${string}`,
    treasury: '0xF10fb506c5dF5c8EB02BCe9eB047ad50095260D7' as `0x${string}`,
    proposalManager: '0xF1ed240C75AecfDde7DBD5D232dfA8fbc92Cebdc' as `0x${string}`,
    votingEngine: '0xe4c07c4852A3c7c8d12c3aC3e0e31D5E5025E591' as `0x${string}`,
    memberRegistry: '0x7a1Ff7b109eC6D1cd3cF8ee6376477E8B75Bf8c2' as `0x${string}`,
    timelock: '0x51496afdCdEDDd47e67A64217787fe200640f8d6' as `0x${string}`,
    aiAgentRegistry: '0x2bbe8673Fd1cd11e133990471f8B1CB6809398FC' as `0x${string}`,
  },
  // Ethereum Mainnet (placeholder)
  1: {
    daoCore: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    daoToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    treasury: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    proposalManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    votingEngine: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    memberRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    timelock: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    aiAgentRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  // Sepolia Testnet (placeholder)
  11155111: {
    daoCore: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    daoToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    treasury: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    proposalManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    votingEngine: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    memberRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    timelock: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    aiAgentRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
};

/**
 * Get contract addresses for a given chain
 */
export function getContractAddresses(chainId: number): ContractAddresses | null {
  return CONTRACT_ADDRESSES[chainId as ChainId] || null;
}

/**
 * Default chain ID (Monad Testnet)
 */
export const DEFAULT_CHAIN_ID: ChainId = 10143;

export default CONTRACT_ADDRESSES;
