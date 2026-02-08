/**
 * AI Guard DAO - Auth Module
 * 
 * NestJS module that encapsulates all authentication components:
 * - AuthController: HTTP endpoints (/auth/nonce, /auth/verify, etc.)
 * - AuthService: SIWE business logic
 * - WalletAuthGuard: Route protection
 */

import { Module, Global } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WalletAuthGuard, TokenGateGuard } from './guards/wallet-auth.guard';

@Global() // Make AuthService available globally
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    WalletAuthGuard,
    TokenGateGuard,
  ],
  exports: [
    AuthService,
    WalletAuthGuard,
    TokenGateGuard,
  ],
})
export class AuthModule {}
