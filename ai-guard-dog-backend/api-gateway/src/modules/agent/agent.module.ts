/**
 * AI Guard DAO - Agent Module
 * 
 * NestJS module for AI analysis endpoints and event processing:
 * - AgentController: REST & SSE endpoints for analysis
 * - AnalysisResultListener: Listens for analysis completion and triggers voting
 */

import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AnalysisResultListener } from './analysis-result-listener.service';
import { PrismaService } from '../../services/prisma.service';
import { VotingService } from '../../services/voting.service';
import { BlockchainService } from '../../services/blockchain.service';

@Module({
  controllers: [AgentController],
  providers: [
    PrismaService,
    BlockchainService,
    VotingService,
    AnalysisResultListener,
  ],
  exports: [AnalysisResultListener],
})
export class AgentModule {}
