/**
 * AI Guard DAO - Prisma Service
 * 
 * NestJS wrapper for Prisma Client
 * Handles database connections with proper lifecycle management
 */

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('🔌 Connecting to PostgreSQL...');
    
    try {
      await this.$connect();
      this.logger.log('✅ PostgreSQL connected successfully');
      
      // Log query events in development
      if (process.env.NODE_ENV === 'development') {
        (this as any).$on('query', (e: any) => {
          this.logger.debug(`Query: ${e.query} - Duration: ${e.duration}ms`);
        });
      }
    } catch (error) {
      this.logger.error('❌ PostgreSQL connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from PostgreSQL...');
    await this.$disconnect();
    this.logger.log('PostgreSQL disconnected');
  }

  /**
   * Clean up database for testing (DANGER: Clears all data!)
   * Only available in test/development environments
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    this.logger.warn('⚠️ Cleaning database...');
    
    // Delete in order to respect foreign key constraints
    await this.$transaction([
      this.agentResult.deleteMany(),
      this.redFlag.deleteMany(),
      this.analysis.deleteMany(),
      this.auditLog.deleteMany(),
      this.proposal.deleteMany(),
      this.delegation.deleteMany(),
      this.session.deleteMany(),
      this.wallet.deleteMany(),
    ]);
    
    this.logger.log('Database cleaned');
  }
}
