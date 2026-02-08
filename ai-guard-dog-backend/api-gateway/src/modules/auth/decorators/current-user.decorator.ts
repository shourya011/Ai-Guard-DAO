/**
 * AI Guard DAO - Current User Decorator
 * 
 * Custom parameter decorator to extract user from request.
 * 
 * Usage:
 * @Get('profile')
 * @UseGuards(WalletAuthGuard)
 * async getProfile(@CurrentUser() user: SessionData) {
 *   return { address: user.address };
 * }
 * 
 * // Extract specific field
 * async getAddress(@CurrentUser('address') address: string) {
 *   return { address };
 * }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { SessionData } from '../../../services/redis.service';

/**
 * Extract current user from request
 * 
 * @param data - Optional: specific field to extract from SessionData
 * @param ctx - Execution context
 * @returns SessionData or specific field value
 */
export const CurrentUser = createParamDecorator(
  (data: keyof SessionData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    // If specific field requested, return that field
    if (data) {
      return user[data];
    }

    // Return full user object
    return user;
  },
);

/**
 * Extract session token from request
 */
export const SessionToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.sessionToken;
  },
);

/**
 * Extract wallet address from authenticated user
 * Shorthand for @CurrentUser('address')
 */
export const WalletAddress = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user?.address;
  },
);
