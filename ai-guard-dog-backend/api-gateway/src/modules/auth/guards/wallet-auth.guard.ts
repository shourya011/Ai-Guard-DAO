/**
 * AI Guard DAO - Wallet Auth Guard
 * 
 * NestJS Guard that protects routes by validating session tokens.
 * 
 * Flow:
 * 1. Extract token from Authorization: Bearer <token> header
 * 2. Check if session:{token} exists in Redis
 * 3. If valid, attach the user object (SessionData) to request
 * 4. If invalid, throw 401 Unauthorized
 * 
 * Usage:
 * @UseGuards(WalletAuthGuard)
 * @Get('protected')
 * async protectedRoute(@CurrentUser() user: SessionData) { ... }
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { RedisService, type SessionData } from '../../../services/redis.service';

// ============================================
// EXTEND EXPRESS REQUEST TYPE
// ============================================

declare global {
  namespace Express {
    interface Request {
      user?: SessionData;
      sessionToken?: string;
    }
  }
}

// ============================================
// AUTH ERROR TYPES
// ============================================

export class AuthorizationError extends UnauthorizedException {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super({ code, message });
  }
}

// ============================================
// WALLET AUTH GUARD
// ============================================

@Injectable()
export class WalletAuthGuard implements CanActivate {
  private readonly logger = new Logger(WalletAuthGuard.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Validate the request and check for valid session
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Step 1: Extract token from Authorization header
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.debug('No authorization token provided');
      throw new AuthorizationError(
        'MISSING_TOKEN',
        'Missing authorization header. Expected: Authorization: Bearer <token>',
      );
    }

    // Step 2: Validate UUID format (basic check)
    if (!this.isValidUUID(token)) {
      this.logger.debug('Invalid token format');
      throw new AuthorizationError(
        'INVALID_TOKEN_FORMAT',
        'Invalid token format. Expected UUID v4.',
      );
    }

    // Step 3: Check if session exists in Redis
    const session = await this.redisService.getSession(token);

    if (!session) {
      this.logger.debug(`Session not found: ${token.slice(0, 8)}...`);
      throw new AuthorizationError(
        'SESSION_NOT_FOUND',
        'Session not found or expired. Please login again.',
      );
    }

    // Step 4: Check if session has expired (belt and suspenders)
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      this.logger.debug(`Session expired: ${token.slice(0, 8)}...`);
      // Clean up expired session
      await this.redisService.deleteSession(token);
      throw new AuthorizationError(
        'SESSION_EXPIRED',
        'Session has expired. Please login again.',
      );
    }

    // Step 5: Attach user and token to request
    request.user = session;
    request.sessionToken = token;

    this.logger.debug(`Authenticated: ${session.address}`);

    return true;
  }

  /**
   * Extract Bearer token from Authorization header
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return undefined;
    }

    // Support both "Bearer token" and "bearer token"
    const [type, token] = authHeader.split(' ');

    if (type?.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }

    return token;
  }

  /**
   * Basic UUID v4 format validation
   */
  private isValidUUID(token: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(token);
  }
}

// ============================================
// OPTIONAL: TOKEN GATE GUARD (Token Balance)
// ============================================

/**
 * Guard that checks if user holds minimum token balance
 * Use in combination with WalletAuthGuard:
 * @UseGuards(WalletAuthGuard, TokenGateGuard)
 */
@Injectable()
export class TokenGateGuard implements CanActivate {
  private readonly logger = new Logger(TokenGateGuard.name);

  // TODO: Inject BlockchainService to check on-chain balance
  // constructor(private readonly blockchain: BlockchainService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // TODO: Check token balance on-chain
    // const balance = await this.blockchain.getTokenBalance(TOKEN_ADDRESS, user.address);
    // const MINIMUM_BALANCE = BigInt('100000000000000000000'); // 100 tokens
    // 
    // if (balance < MINIMUM_BALANCE) {
    //   throw new ForbiddenException({
    //     code: 'INSUFFICIENT_BALANCE',
    //     message: 'Minimum 100 GUARD tokens required',
    //     required: '100',
    //     current: (balance / BigInt(10**18)).toString(),
    //   });
    // }

    return true;
  }
}
