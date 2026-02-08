/**
 * AI Guard DAO - App Module (Root)
 * 
 * Root NestJS module that imports all feature modules.
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import configuration from './config/app.config';
import { RedisService } from './services/redis.service';
import { AuthModule } from './modules/auth/auth.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { AgentModule } from './modules/agent/agent.module';
import { QueueModule } from './modules/queue/queue.module';

/**
 * Redis Module - Global provider for Redis service
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
class RedisModule {}

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Global services
    RedisModule,
    QueueModule,

    // Feature modules
    AuthModule,
    BlockchainModule,
    AgentModule,
  ],
})
export class AppModule {}
