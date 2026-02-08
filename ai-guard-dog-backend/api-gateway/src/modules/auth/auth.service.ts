/**
 * AI Guard DAO - Auth Service
 * 
 * Implements SIWE (Sign-In with Ethereum) authentication flow:
 * 1. Generate nonce for wallet address
 * 2. Verify signed SIWE message
 * 3. Create and manage sessions
 * 
 * Security Features:
 * - Nonce replay prevention (single-use, TTL: 5 min)
 * - Session management with Redis (TTL: 24 hours)
 * - Signature verification using SIWE library
 */

import { 
  Injectable, 
  UnauthorizedException, 
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SiweMessage, SiweErrorType, generateNonce } from 'siwe';
import { v4 as uuidv4 } from 'uuid';
import { RedisService, type SessionData } from '../../services/redis.service';
import type { AppConfig } from '../../config/app.config';
import type { 
  NonceResponse, 
  VerifyRequest, 
  VerifyResponse,
  SessionInfo,
} from './dto/auth.dto';

// ============================================
// AUTH ERROR CODES
// ============================================

export enum AuthErrorCode {
  NONCE_MISSING = 'NONCE_MISSING',
  NONCE_MISMATCH = 'NONCE_MISMATCH',
  NONCE_EXPIRED = 'NONCE_EXPIRED',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  MESSAGE_PARSE_ERROR = 'MESSAGE_PARSE_ERROR',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  DOMAIN_MISMATCH = 'DOMAIN_MISMATCH',
}

// ============================================
// CUSTOM EXCEPTIONS
// ============================================

export class AuthException extends UnauthorizedException {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
  ) {
    super({ code, message });
  }
}

// ============================================
// AUTH SERVICE
// ============================================

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly domain: string;
  private readonly uri: string;
  private readonly statement: string;
  private readonly nonceTtl: number;
  private readonly sessionTtl: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService<AppConfig>,
  ) {
    const authConfig = this.configService.get('auth', { infer: true });
    this.domain = authConfig?.domain || 'ai-guard-dao.xyz';
    this.uri = authConfig?.uri || 'https://ai-guard-dao.xyz';
    this.statement = authConfig?.statement || 'Sign in to AI Guard DAO';
    this.nonceTtl = authConfig?.nonceTtl || 300;
    this.sessionTtl = authConfig?.sessionTtl || 86400;
  }

  // ============================================
  // NONCE GENERATION
  // ============================================

  /**
   * Generate a random nonce for SIWE authentication
   * 
   * @param address - Wallet address requesting the nonce
   * @returns Nonce response with expiration info
   * 
   * Flow:
   * 1. Generate cryptographically secure random nonce
   * 2. Store in Redis with key pattern: nonce:{address}
   * 3. Set TTL to 300 seconds (5 minutes)
   * 4. Return nonce with timestamps
   */
  async generateNonce(address: string): Promise<NonceResponse> {
    // Normalize address to lowercase
    const normalizedAddress = address.toLowerCase();
    
    // Generate random nonce using SIWE library
    const nonce = generateNonce();
    
    // Calculate timestamps
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + this.nonceTtl * 1000);
    
    // Store nonce in Redis
    await this.redisService.setNonce(normalizedAddress, nonce);
    
    this.logger.log(`Nonce generated for ${normalizedAddress}`);
    
    return {
      nonce,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  // ============================================
  // SIWE VERIFICATION
  // ============================================

  /**
   * Verify SIWE message signature and create session
   * 
   * @param request - Contains the SIWE message and signature
   * @param metadata - Optional metadata (IP, User-Agent) for security tracking
   * @returns Session token and info
   * 
   * Flow:
   * 1. Parse the SIWE message
   * 2. Extract address and nonce from message
   * 3. Retrieve stored nonce from Redis
   * 4. Verify nonce matches (prevent replay attacks)
   * 5. Verify signature using SIWE library
   * 6. If valid, generate session token (UUID v4)
   * 7. Store session in Redis with TTL: 24 hours
   * 8. Delete the used nonce
   * 9. Return session info
   */
  async verifySignature(
    request: VerifyRequest,
    metadata?: { userAgent?: string; ipHash?: string },
  ): Promise<VerifyResponse> {
    const { message, signature } = request;

    // Step 1: Parse the SIWE message
    let siweMessage: SiweMessage;
    try {
      siweMessage = new SiweMessage(message);
    } catch (error) {
      this.logger.warn(`Failed to parse SIWE message: ${error}`);
      throw new AuthException(
        AuthErrorCode.MESSAGE_PARSE_ERROR,
        'Invalid SIWE message format',
      );
    }

    const address = siweMessage.address.toLowerCase();
    const messageNonce = siweMessage.nonce;

    // Step 2: Retrieve stored nonce from Redis
    const storedNonce = await this.redisService.getNonce(address);

    // Step 3: Check if nonce exists
    if (!storedNonce) {
      this.logger.warn(`Nonce not found for ${address}`);
      throw new AuthException(
        AuthErrorCode.NONCE_MISSING,
        'Nonce not found or expired. Please request a new nonce.',
      );
    }

    // Step 4: Verify nonce matches
    if (storedNonce !== messageNonce) {
      this.logger.warn(`Nonce mismatch for ${address}`);
      throw new AuthException(
        AuthErrorCode.NONCE_MISMATCH,
        'Nonce does not match. Please request a new nonce.',
      );
    }

    // Step 5: Verify the SIWE signature
    try {
      const verifyResult = await siweMessage.verify({
        signature,
        domain: this.domain,
        nonce: storedNonce,
      });

      if (!verifyResult.success) {
        const errorType = verifyResult.error?.type;
        this.logger.warn(`SIWE verification failed: ${errorType}`);
        
        // Map SIWE error types to our error codes
        if (errorType === SiweErrorType.EXPIRED_MESSAGE) {
          throw new AuthException(
            AuthErrorCode.NONCE_EXPIRED,
            'Message has expired. Please request a new nonce.',
          );
        }
        
        if (errorType === SiweErrorType.DOMAIN_MISMATCH) {
          throw new AuthException(
            AuthErrorCode.DOMAIN_MISMATCH,
            'Domain mismatch in SIWE message.',
          );
        }

        throw new AuthException(
          AuthErrorCode.SIGNATURE_INVALID,
          `Signature verification failed: ${errorType || 'unknown error'}`,
        );
      }
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }
      
      this.logger.error(`SIWE verification error: ${error}`);
      throw new AuthException(
        AuthErrorCode.SIGNATURE_INVALID,
        'Signature verification failed',
      );
    }

    // Step 6: Generate session token
    const sessionToken = uuidv4();
    
    // Calculate session timestamps
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + this.sessionTtl * 1000);

    // Step 7: Store session in Redis
    const sessionData: SessionData = {
      address: siweMessage.address, // Keep original case
      chainId: siweMessage.chainId,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      userAgent: metadata?.userAgent,
      ipHash: metadata?.ipHash,
    };

    await this.redisService.setSession(sessionToken, sessionData);

    // Step 8: Delete the used nonce (prevent replay attacks)
    await this.redisService.deleteNonce(address);

    this.logger.log(`Session created for ${address}, chainId: ${siweMessage.chainId}`);

    // Step 9: Return session info
    return {
      accessToken: sessionToken,
      address: siweMessage.address,
      chainId: siweMessage.chainId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Validate a session token and return session info
   * 
   * @param token - Session token (UUID)
   * @returns Session info if valid
   * @throws AuthException if session not found or expired
   */
  async validateSession(token: string): Promise<SessionData> {
    const session = await this.redisService.getSession(token);

    if (!session) {
      throw new AuthException(
        AuthErrorCode.SESSION_NOT_FOUND,
        'Session not found or expired',
      );
    }

    // Check if session has expired (belt and suspenders - Redis TTL should handle this)
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      await this.redisService.deleteSession(token);
      throw new AuthException(
        AuthErrorCode.SESSION_EXPIRED,
        'Session has expired',
      );
    }

    return session;
  }

  /**
   * Get session info for a token
   */
  async getSessionInfo(token: string): Promise<SessionInfo> {
    const session = await this.validateSession(token);
    
    return {
      address: session.address,
      chainId: session.chainId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isValid: true,
    };
  }

  /**
   * Logout - delete session
   */
  async logout(token: string): Promise<void> {
    await this.redisService.deleteSession(token);
    this.logger.log(`Session logged out: ${token.slice(0, 8)}...`);
  }

  /**
   * Refresh session - extend TTL
   */
  async refreshSession(token: string): Promise<VerifyResponse> {
    const session = await this.validateSession(token);
    
    // Extend session
    const expiresAt = new Date(Date.now() + this.sessionTtl * 1000);
    
    const updatedSession: SessionData = {
      ...session,
      expiresAt: expiresAt.toISOString(),
    };

    await this.redisService.setSession(token, updatedSession);

    return {
      accessToken: token,
      address: session.address,
      chainId: session.chainId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  // ============================================
  // SIWE MESSAGE BUILDER (Helper for frontend)
  // ============================================

  /**
   * Build a SIWE message for the frontend to sign
   * This is a helper method - the actual message should be built on the frontend
   */
  buildSiweMessage(params: {
    address: string;
    nonce: string;
    chainId: number;
    expirationTime?: string;
    notBefore?: string;
  }): string {
    const now = new Date();
    const expirationTime = params.expirationTime || 
      new Date(now.getTime() + this.nonceTtl * 1000).toISOString();

    const message = new SiweMessage({
      domain: this.domain,
      address: params.address,
      statement: this.statement,
      uri: this.uri,
      version: '1',
      chainId: params.chainId,
      nonce: params.nonce,
      issuedAt: now.toISOString(),
      expirationTime,
      notBefore: params.notBefore,
    });

    return message.prepareMessage();
  }
}
