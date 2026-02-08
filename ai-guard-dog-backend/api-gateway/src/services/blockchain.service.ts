/**
 * AI Guard DAO - Blockchain Service
 * 
 * Resilient scanner for DAO proposals and delegations:
 * - Connects to RPC via ethers v6
 * - Historical sync: Catches up on missed blocks
 * - Live sync: Real-time event listening
 * - Auto-reconnection on connection drops
 * 
 * Redis Keys:
 * - `scanner:last_block` - Last processed block number
 * 
 * Events Listened:
 * - ProposalCreated(proposalId, proposer, targets, values, signatures, calldatas, startBlock, endBlock, description)
 * - VotingPowerDelegated(user, daoGovernor, riskThreshold)
 * - DelegationRevoked(user, daoGovernor)
 */

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JsonRpcProvider,
  WebSocketProvider,
  Contract,
  EventLog,
  Log,
  isError,
  Wallet,
  Signer,
} from 'ethers';

import { RedisService } from './redis.service';
import { PrismaService } from './prisma.service';
import { AnalysisProducerService } from '../modules/queue/analysis-producer.service';
import type { AppConfig } from '../config/app.config';

// Import ABIs from local contracts folder
import DAOGovernorABI from '../contracts/abis/DAOGovernor.json';
import VotingAgentABI from '../contracts/abis/VotingAgent.json';

// ============================================
// REDIS KEYS FOR SCANNER
// ============================================

export const ScannerRedisKeys = {
  /** Last processed block number */
  lastBlock: 'scanner:last_block',
  
  /** Scanner status */
  status: 'scanner:status',
  
  /** Processing lock to prevent duplicate processing */
  lock: (proposalId: string) => `scanner:lock:${proposalId}`,
} as const;

// ============================================
// PROPOSAL CREATED EVENT INTERFACE
// ============================================

export interface ProposalCreatedEvent {
  proposalId: bigint;
  proposer: string;
  targets: string[];
  values: bigint[];
  signatures: string[];
  calldatas: string[];
  startBlock: bigint;
  endBlock: bigint;
  description: string;
  blockNumber: number;
  transactionHash: string;
}

// ============================================
// DELEGATION EVENT INTERFACES
// ============================================

export interface VotingPowerDelegatedEvent {
  user: string;
  daoGovernor: string;
  riskThreshold: bigint;
  blockNumber: number;
  transactionHash: string;
}

export interface DelegationRevokedEvent {
  user: string;
  daoGovernor: string;
  blockNumber: number;
  transactionHash: string;
}

// ============================================
// SCANNER STATUS
// ============================================

export type ScannerStatus = 
  | 'starting'
  | 'syncing_historical'
  | 'live'
  | 'reconnecting'
  | 'stopped'
  | 'error';

// ============================================
// BLOCKCHAIN SERVICE
// ============================================

@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainService.name);
  
  private provider: JsonRpcProvider | WebSocketProvider | null = null;
  private contract: Contract | null = null;
  private votingAgentContract: Contract | null = null;
  private backendSigner: Signer | null = null;
  private status: ScannerStatus = 'stopped';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  
  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
    private readonly analysisProducer: AnalysisProducerService,
  ) {}

  // ============================================
  // LIFECYCLE HOOKS
  // ============================================

  async onModuleInit(): Promise<void> {
    const blockchainConfig = this.configService.get('blockchain', { infer: true });
    
    if (!blockchainConfig?.daoGovernorAddress) {
      this.logger.warn('⚠️ DAO_GOVERNOR_ADDRESS not configured - Scanner disabled');
      return;
    }

    this.logger.log('🔗 Initializing Blockchain Scanner...');
    await this.startScanner();
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;
    await this.stopScanner();
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Get current scanner status
   */
  getStatus(): ScannerStatus {
    return this.status;
  }

  /**
   * Get the current block number from the provider
   */
  async getCurrentBlockNumber(): Promise<number | null> {
    if (!this.provider) return null;
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      this.logger.error('Failed to get current block number', error);
      return null;
    }
  }

  /**
   * Get the last processed block from Redis
   */
  async getLastProcessedBlock(): Promise<number | null> {
    const value = await this.redisService.get(ScannerRedisKeys.lastBlock);
    return value ? parseInt(value, 10) : null;
  }

  /**
   * Get the provider for external use (e.g., VotingService)
   */
  getProvider(): JsonRpcProvider | WebSocketProvider | null {
    return this.provider;
  }

  /**
   * Get the VotingAgent contract instance for external use
   */
  getVotingAgentContract(): Contract | null {
    return this.votingAgentContract;
  }

  /**
   * Get the backend signer for signing transactions
   */
  getBackendSigner(): Signer | null {
    return this.backendSigner;
  }

  // ============================================
  // SCANNER LIFECYCLE
  // ============================================

  /**
   * Start the scanner with resilient logic:
   * 1. Connect to RPC
   * 2. Fetch last processed block from Redis
   * 3. Historical sync (catch up on missed events)
   * 4. Live sync (real-time event listening)
   */
  async startScanner(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.status = 'starting';
    await this.updateStatusInRedis('starting');
    
    try {
      // Step 1: Initialize provider and contract
      await this.initializeProvider();
      
      if (!this.provider || !this.contract) {
        throw new Error('Failed to initialize provider or contract');
      }
      
      // Step 2: Get block range for historical sync
      const lastProcessedBlock = await this.getLastProcessedBlock();
      const startBlock = this.configService.get('blockchain.startBlock', { infer: true }) || 0;
      const fromBlock = lastProcessedBlock !== null ? lastProcessedBlock + 1 : startBlock;
      const currentBlock = await this.provider.getBlockNumber();
      
      this.logger.log(`📊 Scanner state:`);
      this.logger.log(`   Start block: ${startBlock}`);
      this.logger.log(`   Last processed: ${lastProcessedBlock ?? 'none'}`);
      this.logger.log(`   Current block: ${currentBlock}`);
      this.logger.log(`   Blocks to sync: ${currentBlock - fromBlock + 1}`);
      
      // Step 3: Historical sync
      if (fromBlock <= currentBlock) {
        this.status = 'syncing_historical';
        await this.updateStatusInRedis('syncing_historical');
        await this.syncHistoricalEvents(fromBlock, currentBlock);
      }
      
      // Step 4: Start live listener
      this.status = 'live';
      await this.updateStatusInRedis('live');
      await this.startLiveListener();
      
      this.logger.log('✅ Blockchain scanner is LIVE');
      
    } catch (error) {
      this.status = 'error';
      await this.updateStatusInRedis('error');
      this.logger.error('❌ Scanner startup failed:', error);
      
      // Schedule reconnection
      this.scheduleReconnect();
    }
  }

  /**
   * Stop the scanner gracefully
   */
  async stopScanner(): Promise<void> {
    this.logger.log('🛑 Stopping blockchain scanner...');
    
    this.status = 'stopped';
    await this.updateStatusInRedis('stopped');
    
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Remove event listeners from DAOGovernor
    if (this.contract) {
      this.contract.removeAllListeners();
    }
    
    // Remove event listeners from VotingAgent
    if (this.votingAgentContract) {
      this.votingAgentContract.removeAllListeners();
      this.votingAgentContract = null;
    }
    
    // Clear backend signer
    this.backendSigner = null;
    
    // Destroy provider
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
    
    this.contract = null;
    this.logger.log('Scanner stopped');
  }

  // ============================================
  // PROVIDER & CONTRACT INITIALIZATION
  // ============================================

  private async initializeProvider(): Promise<void> {
    const blockchainConfig = this.configService.get('blockchain', { infer: true });
    
    if (!blockchainConfig) {
      throw new Error('Blockchain configuration not found');
    }

    const { rpcUrl, daoGovernorAddress, votingAgentAddress, backendPrivateKey } = blockchainConfig;
    
    this.logger.log(`🔌 Connecting to RPC: ${this.maskUrl(rpcUrl)}`);
    
    // Use WebSocket for better event performance if URL starts with wss://
    if (rpcUrl.startsWith('wss://') || rpcUrl.startsWith('ws://')) {
      this.provider = new WebSocketProvider(rpcUrl);
    } else {
      this.provider = new JsonRpcProvider(rpcUrl);
    }
    
    // Verify connection
    const network = await this.provider.getNetwork();
    this.logger.log(`✅ Connected to chain: ${network.name} (${network.chainId})`);
    
    // Initialize DAO Governor contract (read-only)
    this.contract = new Contract(
      daoGovernorAddress,
      DAOGovernorABI,
      this.provider,
    );
    this.logger.log(`📜 DAOGovernor contract initialized: ${daoGovernorAddress}`);
    
    // Initialize VotingAgent contract if address is configured
    if (votingAgentAddress) {
      this.votingAgentContract = new Contract(
        votingAgentAddress,
        VotingAgentABI,
        this.provider,
      );
      this.logger.log(`📜 VotingAgent contract initialized: ${votingAgentAddress}`);
    } else {
      this.logger.warn('⚠️ VOTING_AGENT_ADDRESS not configured - Delegation tracking disabled');
    }
    
    // Initialize backend signer if private key is provided
    if (backendPrivateKey) {
      this.backendSigner = new Wallet(backendPrivateKey, this.provider);
      const signerAddress = await this.backendSigner.getAddress();
      this.logger.log(`🔑 Backend signer initialized: ${signerAddress}`);
    } else {
      this.logger.warn('⚠️ BACKEND_PRIVATE_KEY not configured - Vote execution disabled');
    }
    
    // Set up provider error handlers
    this.setupProviderErrorHandlers();
  }

  private setupProviderErrorHandlers(): void {
    if (!this.provider) return;
    
    this.provider.on('error', (error: Error) => {
      this.logger.error('Provider error:', error.message);
      this.handleConnectionError(error);
    });
    
    // WebSocket specific handlers
    if (this.provider instanceof WebSocketProvider) {
      (this.provider as any)._websocket?.on('close', () => {
        this.logger.warn('WebSocket connection closed');
        this.handleConnectionError(new Error('WebSocket closed'));
      });
    }
  }

  // ============================================
  // HISTORICAL SYNC
  // ============================================

  /**
   * Sync historical events from `fromBlock` to `toBlock`
   * Processes in batches to avoid overwhelming the RPC
   */
  private async syncHistoricalEvents(
    fromBlock: number,
    toBlock: number,
  ): Promise<void> {
    const maxBlockBatch = this.configService.get('blockchain.maxBlockBatch', { infer: true }) || 10000;
    
    this.logger.log(`📜 Starting historical sync: blocks ${fromBlock} to ${toBlock}`);
    
    let currentFrom = fromBlock;
    let totalProposalEvents = 0;
    let totalDelegationEvents = 0;
    
    while (currentFrom <= toBlock) {
      const currentTo = Math.min(currentFrom + maxBlockBatch - 1, toBlock);
      
      this.logger.debug(`Querying blocks ${currentFrom} - ${currentTo}...`);
      
      try {
        // Query ProposalCreated events from DAOGovernor
        const proposalEvents = await this.contract!.queryFilter(
          'ProposalCreated',
          currentFrom,
          currentTo,
        );
        
        this.logger.debug(`Found ${proposalEvents.length} proposal events in batch`);
        
        // Process proposal events sequentially to maintain order
        for (const event of proposalEvents) {
          await this.handleProposalCreatedEvent(event as EventLog);
          totalProposalEvents++;
        }
        
        // Query VotingAgent delegation events if contract is initialized
        if (this.votingAgentContract) {
          // Query VotingPowerDelegated events
          const delegatedEvents = await this.votingAgentContract.queryFilter(
            'VotingPowerDelegated',
            currentFrom,
            currentTo,
          );
          
          for (const event of delegatedEvents) {
            await this.handleVotingPowerDelegatedEvent(event as EventLog);
            totalDelegationEvents++;
          }
          
          // Query DelegationRevoked events
          const revokedEvents = await this.votingAgentContract.queryFilter(
            'DelegationRevoked',
            currentFrom,
            currentTo,
          );
          
          for (const event of revokedEvents) {
            await this.handleDelegationRevokedEvent(event as EventLog);
            totalDelegationEvents++;
          }
        }
        
        // Update last processed block after each batch
        await this.setLastProcessedBlock(currentTo);
        
      } catch (error) {
        this.logger.error(`Error querying blocks ${currentFrom}-${currentTo}:`, error);
        throw error;
      }
      
      currentFrom = currentTo + 1;
    }
    
    this.logger.log(`✅ Historical sync complete. Processed ${totalProposalEvents} proposal events, ${totalDelegationEvents} delegation events`);
  }

  // ============================================
  // LIVE LISTENER
  // ============================================

  /**
   * Start listening for real-time events:
   * - ProposalCreated from DAOGovernor
   * - VotingPowerDelegated and DelegationRevoked from VotingAgent
   */
  private async startLiveListener(): Promise<void> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    
    this.logger.log('👂 Starting live event listener for ProposalCreated...');
    
    // Listen for ProposalCreated events from DAOGovernor
    this.contract.on(
      'ProposalCreated',
      async (
        proposalId: bigint,
        proposer: string,
        targets: string[],
        values: bigint[],
        signatures: string[],
        calldatas: string[],
        startBlock: bigint,
        endBlock: bigint,
        description: string,
        event: EventLog,
      ) => {
        try {
          await this.handleProposalCreatedEvent(event);
        } catch (error) {
          this.logger.error('Error handling live ProposalCreated event:', error);
        }
      },
    );
    
    // Listen for VotingAgent events if contract is initialized
    if (this.votingAgentContract) {
      this.logger.log('👂 Starting live event listener for delegation events...');
      
      // Listen for VotingPowerDelegated events
      this.votingAgentContract.on(
        'VotingPowerDelegated',
        async (
          user: string,
          daoGovernor: string,
          riskThreshold: bigint,
          event: EventLog,
        ) => {
          try {
            await this.handleVotingPowerDelegatedEvent(event);
          } catch (error) {
            this.logger.error('Error handling live VotingPowerDelegated event:', error);
          }
        },
      );
      
      // Listen for DelegationRevoked events
      this.votingAgentContract.on(
        'DelegationRevoked',
        async (
          user: string,
          daoGovernor: string,
          event: EventLog,
        ) => {
          try {
            await this.handleDelegationRevokedEvent(event);
          } catch (error) {
            this.logger.error('Error handling live DelegationRevoked event:', error);
          }
        },
      );
    }
  }

  // ============================================
  // EVENT HANDLER
  // ============================================

  /**
   * Handle ProposalCreated event:
   * 1. Parse event data
   * 2. Upsert proposal in database
   * 3. Update last processed block
   * 4. Log trigger for AI analysis
   */
  private async handleProposalCreatedEvent(event: EventLog): Promise<void> {
    // Extract event arguments
    const args = event.args;
    if (!args) {
      this.logger.warn('Event has no args, skipping');
      return;
    }

    const proposalData: ProposalCreatedEvent = {
      proposalId: args[0] as bigint,
      proposer: args[1] as string,
      targets: args[2] as string[],
      values: args[3] as bigint[],
      signatures: args[4] as string[],
      calldatas: args[5] as string[],
      startBlock: args[6] as bigint,
      endBlock: args[7] as bigint,
      description: args[8] as string,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    };

    const proposalIdStr = proposalData.proposalId.toString();
    
    this.logger.log(`📥 ProposalCreated detected:`);
    this.logger.log(`   ID: ${proposalIdStr}`);
    this.logger.log(`   Proposer: ${proposalData.proposer}`);
    this.logger.log(`   Block: ${proposalData.blockNumber}`);
    this.logger.log(`   Description: ${proposalData.description.substring(0, 100)}...`);

    // Acquire lock to prevent duplicate processing
    const lockKey = ScannerRedisKeys.lock(proposalIdStr);
    const acquired = await this.redisService.acquireLock(lockKey, 30);
    
    if (!acquired) {
      this.logger.debug(`Proposal ${proposalIdStr} already being processed, skipping`);
      return;
    }

    try {
      // Extract title from description (first line or first 100 chars)
      const title = this.extractTitle(proposalData.description);
      
      // Get blockchain config for chain ID and DAO address
      const blockchainConfig = this.configService.get('blockchain', { infer: true });
      
      // Upsert proposal in database
      const proposal = await this.prismaService.proposal.upsert({
        where: {
          onchainProposalId_daoGovernor_chainId: {
            onchainProposalId: proposalIdStr,
            daoGovernor: blockchainConfig!.daoGovernorAddress,
            chainId: blockchainConfig!.chainId,
          },
        },
        create: {
          onchainProposalId: proposalIdStr,
          daoGovernor: blockchainConfig!.daoGovernorAddress,
          chainId: blockchainConfig!.chainId,
          title,
          description: proposalData.description,
          proposerAddress: proposalData.proposer,
          votingStartBlock: proposalData.startBlock,
          votingEndBlock: proposalData.endBlock,
          status: 'PENDING_ANALYSIS',
          // Store execution data in dedicated columns
          targets: proposalData.targets,
          values: proposalData.values.map(v => v.toString()),
          calldatas: proposalData.calldatas,
          detectedAtBlock: BigInt(proposalData.blockNumber),
          creationTxHash: proposalData.transactionHash,
        },
        update: {
          // Update only if re-processing (shouldn't happen often)
          title,
          description: proposalData.description,
          votingStartBlock: proposalData.startBlock,
          votingEndBlock: proposalData.endBlock,
          targets: proposalData.targets,
          values: proposalData.values.map(v => v.toString()),
          calldatas: proposalData.calldatas,
          detectedAtBlock: BigInt(proposalData.blockNumber),
          creationTxHash: proposalData.transactionHash,
        },
      });

      this.logger.log(`✅ Proposal saved to database: ${proposal.id}`);

      // Update last processed block
      await this.setLastProcessedBlock(proposalData.blockNumber);

      // Queue AI Analysis (Phase 4 - Implemented)
      this.logger.log(`🤖 Queueing AI Analysis for Proposal ${proposalIdStr}`);
      await this.analysisProducer.addJob(
        proposal.id, // Database UUID used as jobId for deduplication
        {
          onchainProposalId: proposalIdStr,
          daoGovernor: blockchainConfig!.daoGovernorAddress,
          chainId: blockchainConfig!.chainId,
          proposerAddress: proposalData.proposer,
          title,
          description: proposalData.description,
          metadata: {
            targets: proposalData.targets,
            values: proposalData.values.map(v => v.toString()),
            calldatas: proposalData.calldatas,
            startBlock: proposalData.startBlock.toString(),
            endBlock: proposalData.endBlock.toString(),
            detectedAtBlock: proposalData.blockNumber,
            transactionHash: proposalData.transactionHash,
          },
        },
        'normal', // Auto-detected proposals go to normal priority queue
      );

    } finally {
      // Release lock
      await this.redisService.releaseLock(lockKey);
    }
  }

  /**
   * Handle VotingPowerDelegated event:
   * 1. Parse event data
   * 2. Upsert delegation in database with ACTIVE status
   */
  private async handleVotingPowerDelegatedEvent(event: EventLog): Promise<void> {
    const args = event.args;
    if (!args) {
      this.logger.warn('VotingPowerDelegated event has no args, skipping');
      return;
    }

    const eventData: VotingPowerDelegatedEvent = {
      user: args[0] as string,
      daoGovernor: args[1] as string,
      riskThreshold: args[2] as bigint,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    };

    this.logger.log(`📥 VotingPowerDelegated detected:`);
    this.logger.log(`   User: ${eventData.user}`);
    this.logger.log(`   DAO Governor: ${eventData.daoGovernor}`);
    this.logger.log(`   Risk Threshold: ${eventData.riskThreshold.toString()}`);
    this.logger.log(`   Block: ${eventData.blockNumber}`);

    // Get blockchain config for chain ID
    const blockchainConfig = this.configService.get('blockchain', { infer: true });
    const chainId = blockchainConfig!.chainId;

    try {
      // Upsert delegation - if same user+daoGovernor+chainId exists, update it
      const delegation = await this.prismaService.delegation.upsert({
        where: {
          delegatorAddress_daoGovernor_chainId: {
            delegatorAddress: eventData.user.toLowerCase(),
            daoGovernor: eventData.daoGovernor.toLowerCase(),
            chainId,
          },
        },
        create: {
          delegatorAddress: eventData.user.toLowerCase(),
          daoGovernor: eventData.daoGovernor.toLowerCase(),
          chainId,
          riskThreshold: Number(eventData.riskThreshold),
          status: 'ACTIVE',
          blockNumber: BigInt(eventData.blockNumber),
          txHash: eventData.transactionHash,
        },
        update: {
          riskThreshold: Number(eventData.riskThreshold),
          status: 'ACTIVE',
          blockNumber: BigInt(eventData.blockNumber),
          txHash: eventData.transactionHash,
          revokeTxHash: null, // Clear any previous revoke tx
        },
      });

      this.logger.log(`✅ Delegation saved/updated: ${delegation.id}`);
    } catch (error) {
      this.logger.error('Failed to save delegation:', error);
      throw error;
    }
  }

  /**
   * Handle DelegationRevoked event:
   * 1. Parse event data  
   * 2. Update delegation status to REVOKED in database
   */
  private async handleDelegationRevokedEvent(event: EventLog): Promise<void> {
    const args = event.args;
    if (!args) {
      this.logger.warn('DelegationRevoked event has no args, skipping');
      return;
    }

    const eventData: DelegationRevokedEvent = {
      user: args[0] as string,
      daoGovernor: args[1] as string,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    };

    this.logger.log(`📥 DelegationRevoked detected:`);
    this.logger.log(`   User: ${eventData.user}`);
    this.logger.log(`   DAO Governor: ${eventData.daoGovernor}`);
    this.logger.log(`   Block: ${eventData.blockNumber}`);

    // Get blockchain config for chain ID
    const blockchainConfig = this.configService.get('blockchain', { infer: true });
    const chainId = blockchainConfig!.chainId;

    try {
      // Update delegation status to REVOKED
      const delegation = await this.prismaService.delegation.update({
        where: {
          delegatorAddress_daoGovernor_chainId: {
            delegatorAddress: eventData.user.toLowerCase(),
            daoGovernor: eventData.daoGovernor.toLowerCase(),
            chainId,
          },
        },
        data: {
          status: 'REVOKED',
          revokeTxHash: eventData.transactionHash,
        },
      });

      this.logger.log(`✅ Delegation revoked: ${delegation.id}`);
    } catch (error) {
      // If delegation doesn't exist (shouldn't happen), log warning but don't fail
      if ((error as any).code === 'P2025') {
        this.logger.warn(`No delegation found to revoke for user ${eventData.user} on DAO ${eventData.daoGovernor}`);
      } else {
        this.logger.error('Failed to revoke delegation:', error);
        throw error;
      }
    }
  }

  // ============================================
  // RECONNECTION LOGIC
  // ============================================

  private handleConnectionError(error: Error): void {
    if (this.isShuttingDown) return;
    
    this.logger.error('Connection error detected:', error.message);
    this.status = 'reconnecting';
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown || this.reconnectTimer) return;
    
    const reconnectDelay = this.configService.get('blockchain.reconnectDelay', { infer: true }) || 5000;
    
    this.logger.warn(`🔄 Scheduling reconnect in ${reconnectDelay}ms...`);
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      if (this.isShuttingDown) return;
      
      this.logger.log('🔄 Attempting to reconnect...');
      
      // Stop existing connections
      await this.stopScanner();
      
      // Restart scanner
      await this.startScanner();
    }, reconnectDelay);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Extract title from proposal description
   * Uses first line or first 100 chars
   */
  private extractTitle(description: string): string {
    const firstLine = description.split('\n')[0].trim();
    
    // If first line is a markdown header, extract text
    if (firstLine.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '').substring(0, 500);
    }
    
    // Use first 100 chars if first line is too long
    if (firstLine.length > 500) {
      return firstLine.substring(0, 500) + '...';
    }
    
    return firstLine || 'Untitled Proposal';
  }

  /**
   * Update last processed block in Redis
   */
  private async setLastProcessedBlock(blockNumber: number): Promise<void> {
    await this.redisService.set(
      ScannerRedisKeys.lastBlock,
      blockNumber.toString(),
    );
  }

  /**
   * Update scanner status in Redis (for monitoring)
   */
  private async updateStatusInRedis(status: ScannerStatus): Promise<void> {
    await this.redisService.set(ScannerRedisKeys.status, status);
  }

  /**
   * Mask sensitive parts of URL for logging
   */
  private maskUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        parsed.password = '****';
      }
      // Mask API keys in path or query
      return parsed.toString().replace(/[a-f0-9]{32,}/gi, '****');
    } catch {
      return url.substring(0, 30) + '...';
    }
  }
}
