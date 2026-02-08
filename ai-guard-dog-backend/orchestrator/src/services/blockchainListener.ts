/**
 * Blockchain Listener Service
 * 
 * Listens for ProposalCreated events on the Monad blockchain
 * and triggers the AI analysis pipeline via EventEmitter.
 * 
 * Architecture Note: This is part of the Node.js Orchestrator.
 * It does NOT call Python directly - it emits internal events.
 */

import { ethers, Contract, WebSocketProvider, JsonRpcProvider } from 'ethers';
import { config } from '../config';
import { query } from '../config/database';
import { eventEmitter, EVENTS } from '../events/analysisTrigger';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// ProposalManager ABI (only the events we need)
const PROPOSAL_MANAGER_ABI = [
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string ipfsHash, uint256 startTime, uint256 endTime)',
  'event ProposalExecuted(uint256 indexed proposalId)',
  'event ProposalCancelled(uint256 indexed proposalId)',
];

// Types
interface ProposalData {
  id: string;
  onchain_proposal_id: number;
  ipfs_hash: string;
  title: string;
  description: string;
  proposer_wallet: string;
  requested_amount?: string;
}

interface IPFSContent {
  title: string;
  description: string;
  requestedAmount?: string;
  recipient?: string;
}

class BlockchainListener {
  private provider: WebSocketProvider | JsonRpcProvider | null = null;
  private contract: Contract | null = null;
  private isListening: boolean = false;
  private isAvailable: boolean = false;

  /**
   * Check if blockchain is available
   */
  get available(): boolean {
    return this.isAvailable;
  }

  /**
   * Initialize the blockchain connection
   * Returns without error if blockchain is not available
   */
  async initialize(): Promise<void> {
    // Skip if no RPC URL is configured or if it's the default placeholder
    if (!config.blockchain.rpcUrl || config.blockchain.rpcUrl === 'http://127.0.0.1:8545') {
      console.log('⚠️ No blockchain RPC configured - skipping blockchain listener');
      console.log('   Set MONAD_RPC_URL in .env to enable blockchain features\n');
      return;
    }

    try {
      // Try WebSocket first for real-time events
      if (config.blockchain.wsUrl && config.blockchain.wsUrl !== 'ws://127.0.0.1:8545') {
        try {
          this.provider = new WebSocketProvider(config.blockchain.wsUrl);
        } catch (wsError) {
          console.warn('⚠️ WebSocket connection failed, trying HTTP');
          this.provider = new JsonRpcProvider(config.blockchain.rpcUrl);
        }
      } else {
        this.provider = new JsonRpcProvider(config.blockchain.rpcUrl);
      }

      // Verify connection - this will throw if blockchain is not available
      const network = await this.provider.getNetwork();
      console.log(`⛓️ Connected to network: ${network.name} (chainId: ${network.chainId})`);
      this.isAvailable = true;

      // Initialize contract if address is configured
      if (config.blockchain.contracts.proposalManager && 
          config.blockchain.contracts.proposalManager !== '0x0000000000000000000000000000000000000000') {
        this.contract = new Contract(
          config.blockchain.contracts.proposalManager,
          PROPOSAL_MANAGER_ABI,
          this.provider
        );
        console.log(`📄 ProposalManager contract initialized at: ${config.blockchain.contracts.proposalManager}`);
      }
    } catch (error) {
      console.log('⚠️ Blockchain not available - running in API-only mode');
      console.log('   Blockchain features will be disabled\n');
      this.isAvailable = false;
      // Don't throw - just continue without blockchain
    }
  }

  /**
   * Start listening for ProposalCreated events
   * This is the entry point of the analysis pipeline
   */
  async listenForProposals(): Promise<void> {
    if (!this.contract) {
      console.warn('⚠️ No contract configured. Running in mock mode.');
      return;
    }

    if (this.isListening) {
      console.warn('⚠️ Already listening for proposals');
      return;
    }

    this.isListening = true;
    console.log('👂 Listening for ProposalCreated events...');

    // Listen for ProposalCreated events
    this.contract.on('ProposalCreated', async (
      proposalId: bigint,
      proposer: string,
      ipfsHash: string,
      startTime: bigint,
      endTime: bigint,
      event: any
    ) => {
      console.log(`\n🆕 ══════════════════════════════════════════`);
      console.log(`📥 NEW PROPOSAL DETECTED!`);
      console.log(`   Proposal ID: ${proposalId.toString()}`);
      console.log(`   Proposer: ${proposer}`);
      console.log(`   IPFS Hash: ${ipfsHash}`);
      console.log(`══════════════════════════════════════════════\n`);

      try {
        // Step 1: Fetch IPFS content
        const content = await this.fetchIPFSContent(ipfsHash);

        // Step 2: Insert into database
        const dbProposal = await this.insertProposal({
          id: uuidv4(),
          onchain_proposal_id: Number(proposalId),
          ipfs_hash: ipfsHash,
          title: content.title || `Proposal #${proposalId}`,
          description: content.description || '',
          proposer_wallet: proposer,
          requested_amount: content.requestedAmount,
        });

        // Step 3: CRITICAL - Emit event (do NOT call Python directly!)
        // This decouples the blockchain listener from the analysis logic
        console.log(`📡 Emitting 'new_proposal' event for ID: ${dbProposal.id}`);
        eventEmitter.emit(EVENTS.NEW_PROPOSAL, dbProposal.id);

      } catch (error) {
        console.error('❌ Error processing proposal:', error);
      }
    });

    // Handle connection errors
    this.provider?.on('error', (error: Error) => {
      console.error('❌ Provider error:', error);
    });
  }

  /**
   * Fetch proposal content from IPFS
   */
  private async fetchIPFSContent(ipfsHash: string): Promise<IPFSContent> {
    try {
      const url = `${config.ipfsGatewayUrl}/${ipfsHash}`;
      console.log(`📡 Fetching IPFS content from: ${url}`);
      
      const response = await axios.get(url, { timeout: 10000 });
      return response.data as IPFSContent;
    } catch (error) {
      console.warn(`⚠️ Could not fetch IPFS content: ${error}`);
      // Return default values if IPFS fetch fails
      return {
        title: 'Unknown Proposal',
        description: 'Content could not be fetched from IPFS',
      };
    }
  }

  /**
   * Insert proposal into database with PENDING_ANALYSIS status
   */
  private async insertProposal(proposal: ProposalData): Promise<ProposalData> {
    const insertQuery = `
      INSERT INTO proposals (
        id, onchain_proposal_id, ipfs_hash, title, description, 
        proposer_wallet, requested_amount, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING_ANALYSIS')
      RETURNING *
    `;

    const result = await query<ProposalData>(insertQuery, [
      proposal.id,
      proposal.onchain_proposal_id,
      proposal.ipfs_hash,
      proposal.title,
      proposal.description,
      proposal.proposer_wallet,
      proposal.requested_amount || null,
    ]);

    console.log(`💾 Proposal saved to database with ID: ${result[0].id}`);
    console.log(`   Status: PENDING_ANALYSIS`);
    
    return result[0];
  }

  /**
   * Stop listening for events
   */
  async stopListening(): Promise<void> {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
    this.isListening = false;
    console.log('🛑 Stopped listening for blockchain events');
  }

  /**
   * Manually trigger a proposal event (for testing)
   */
  async triggerMockEvent(mockData: {
    proposalId: number;
    proposer: string;
    ipfsHash: string;
    title: string;
    description: string;
  }): Promise<string> {
    console.log(`\n🧪 ══════════════════════════════════════════`);
    console.log(`🔬 MOCK EVENT TRIGGERED`);
    console.log(`══════════════════════════════════════════════\n`);

    const dbId = uuidv4();
    
    // Insert directly into database
    await this.insertProposal({
      id: dbId,
      onchain_proposal_id: mockData.proposalId,
      ipfs_hash: mockData.ipfsHash,
      title: mockData.title,
      description: mockData.description,
      proposer_wallet: mockData.proposer,
    });

    // Emit the event to trigger analysis
    eventEmitter.emit(EVENTS.NEW_PROPOSAL, dbId);
    
    return dbId;
  }
}

// Export singleton instance
export const blockchainListener = new BlockchainListener();
export default blockchainListener;
