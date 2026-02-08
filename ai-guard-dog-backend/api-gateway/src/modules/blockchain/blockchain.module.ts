/**
 * AI Guard DAO - Blockchain Module
 * 
 * NestJS module for blockchain integration:
 * - BlockchainService: Event scanning and contract interaction
 * - VotingService: Vote execution via VotingAgent contract
 * - PrismaService: Database operations
 */

import { Module, Global } from '@nestjs/common';
import { BlockchainService } from '../../services/blockchain.service';
import { VotingService } from '../../services/voting.service';
import { PrismaService } from '../../services/prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    BlockchainService,
    VotingService,
  ],
  exports: [
    PrismaService,
    BlockchainService,
    VotingService,
  ],
})
export class BlockchainModule {}
