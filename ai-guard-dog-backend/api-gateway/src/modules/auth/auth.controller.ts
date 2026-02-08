/**
 * AI Guard DAO - Auth Controller
 * 
 * HTTP endpoints for SIWE authentication:
 * - POST /auth/nonce - Request a nonce for signing
 * - POST /auth/verify - Verify signature and create session
 * - GET /auth/session - Get current session info
 * - POST /auth/logout - Invalidate session
 * - POST /auth/refresh - Extend session TTL
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { WalletAuthGuard } from './guards/wallet-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  NonceRequestDto,
  NonceResponseDto,
  VerifyRequestDto,
  VerifyResponseDto,
  SessionInfoDto,
  isValidEthereumAddress,
} from './dto/auth.dto';
import type { SessionData } from '../../services/redis.service';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Hash IP address for privacy-preserving logging
 */
function hashIP(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

/**
 * Extract client IP from request (handles proxies)
 */
function getClientIP(request: Request): string | undefined {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
  }
  return request.ip || request.socket?.remoteAddress;
}

// ============================================
// AUTH CONTROLLER
// ============================================

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  // ============================================
  // POST /auth/nonce
  // ============================================

  /**
   * Request a nonce for SIWE authentication
   * 
   * @param body - Contains the wallet address
   * @returns Nonce with expiration timestamps
   * 
   * Example Request:
   * POST /auth/nonce
   * { "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" }
   * 
   * Example Response:
   * {
   *   "nonce": "8a3f2b1c9d4e5f6a",
   *   "issuedAt": "2026-01-25T10:30:00.000Z",
   *   "expiresAt": "2026-01-25T10:35:00.000Z"
   * }
   */
  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  async getNonce(@Body() body: NonceRequestDto): Promise<NonceResponseDto> {
    // Validate Ethereum address format
    if (!isValidEthereumAddress(body.address)) {
      throw new BadRequestException('Invalid Ethereum address format');
    }

    this.logger.log(`Nonce requested for: ${body.address}`);
    
    const result = await this.authService.generateNonce(body.address);
    
    return result;
  }

  // ============================================
  // POST /auth/verify
  // ============================================

  /**
   * Verify SIWE signature and create session
   * 
   * @param body - Contains the SIWE message and signature
   * @param request - Express request for metadata extraction
   * @returns Session token and info
   * 
   * Example Request:
   * POST /auth/verify
   * {
   *   "message": "ai-guard-dao.xyz wants you to sign in with your Ethereum account:\n0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb\n\nSign in to AI Guard DAO\n\nURI: https://ai-guard-dao.xyz\nVersion: 1\nChain ID: 1\nNonce: 8a3f2b1c9d4e5f6a\nIssued At: 2026-01-25T10:30:00.000Z",
   *   "signature": "0x..."
   * }
   * 
   * Example Response:
   * {
   *   "accessToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
   *   "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
   *   "chainId": 1,
   *   "expiresAt": "2026-01-26T10:30:00.000Z"
   * }
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Body() body: VerifyRequestDto,
    @Req() request: Request,
  ): Promise<VerifyResponseDto> {
    this.logger.log('Verification request received');

    // Extract metadata for security tracking
    const metadata = {
      userAgent: request.headers['user-agent'],
      ipHash: hashIP(getClientIP(request)),
    };

    const result = await this.authService.verifySignature(body, metadata);

    this.logger.log(`Session created for: ${result.address}`);

    return result;
  }

  // ============================================
  // GET /auth/session (Protected)
  // ============================================

  /**
   * Get current session information
   * 
   * @param user - Current user from WalletAuthGuard
   * @returns Session info
   * 
   * Example Response:
   * {
   *   "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
   *   "chainId": 1,
   *   "createdAt": "2026-01-25T10:30:00.000Z",
   *   "expiresAt": "2026-01-26T10:30:00.000Z",
   *   "isValid": true
   * }
   */
  @Get('session')
  @UseGuards(WalletAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSession(@CurrentUser() user: SessionData): Promise<SessionInfoDto> {
    return {
      address: user.address,
      chainId: user.chainId,
      createdAt: user.createdAt,
      expiresAt: user.expiresAt,
      isValid: true,
    };
  }

  // ============================================
  // POST /auth/logout (Protected)
  // ============================================

  /**
   * Logout and invalidate session
   * 
   * @param authorization - Bearer token header
   * @returns Success message
   */
  @Post('logout')
  @UseGuards(WalletAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Headers('authorization') authorization: string,
  ): Promise<{ message: string }> {
    const token = this.extractToken(authorization);
    
    if (token) {
      await this.authService.logout(token);
      this.logger.log(`Session logged out: ${token.slice(0, 8)}...`);
    }

    return { message: 'Logged out successfully' };
  }

  // ============================================
  // POST /auth/refresh (Protected)
  // ============================================

  /**
   * Refresh session - extend TTL
   * 
   * @param authorization - Bearer token header
   * @returns Updated session info
   */
  @Post('refresh')
  @UseGuards(WalletAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Headers('authorization') authorization: string,
  ): Promise<VerifyResponseDto> {
    const token = this.extractToken(authorization);
    
    if (!token) {
      throw new BadRequestException('Missing authorization token');
    }

    const result = await this.authService.refreshSession(token);
    
    this.logger.log(`Session refreshed for: ${result.address}`);

    return result;
  }

  // ============================================
  // HELPER: Build SIWE Message (for frontend reference)
  // ============================================

  /**
   * Helper endpoint to build a SIWE message
   * This is primarily for testing/documentation purposes
   * In production, the frontend should build the message
   */
  @Post('build-message')
  @HttpCode(HttpStatus.OK)
  async buildMessage(
    @Body() body: { address: string; nonce: string; chainId: number },
  ): Promise<{ message: string }> {
    const message = this.authService.buildSiweMessage({
      address: body.address,
      nonce: body.nonce,
      chainId: body.chainId,
    });

    return { message };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Extract token from Authorization header
   */
  private extractToken(authorization: string | undefined): string | undefined {
    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }
    return authorization.slice(7);
  }
}
