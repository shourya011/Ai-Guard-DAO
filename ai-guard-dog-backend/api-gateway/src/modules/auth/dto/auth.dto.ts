/**
 * AI Guard DAO - Auth DTOs
 * 
 * Request/Response Data Transfer Objects for authentication endpoints.
 * Uses Zod for runtime validation with class-validator decorators for NestJS pipes.
 */

import { z } from 'zod';
import { 
  IsString, 
  IsNotEmpty, 
  Matches, 
  IsOptional, 
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';

// ============================================
// ZOD SCHEMAS (for strict validation)
// ============================================

/**
 * Ethereum address validation regex
 */
const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Nonce request schema
 */
export const NonceRequestSchema = z.object({
  address: z
    .string()
    .regex(ETHEREUM_ADDRESS_REGEX, 'Invalid Ethereum address format')
    .describe('Ethereum wallet address'),
});

/**
 * Nonce response schema
 */
export const NonceResponseSchema = z.object({
  nonce: z.string().min(8).describe('Random nonce for SIWE message'),
  issuedAt: z.string().datetime().describe('ISO timestamp when nonce was issued'),
  expiresAt: z.string().datetime().describe('ISO timestamp when nonce expires'),
});

/**
 * Verify request schema
 */
export const VerifyRequestSchema = z.object({
  message: z.string().min(1).describe('The SIWE message that was signed'),
  signature: z
    .string()
    .regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature format')
    .describe('The wallet signature of the message'),
});

/**
 * Verify response schema
 */
export const VerifyResponseSchema = z.object({
  accessToken: z.string().uuid().describe('Session token (UUID v4)'),
  address: z
    .string()
    .regex(ETHEREUM_ADDRESS_REGEX)
    .describe('Authenticated wallet address'),
  chainId: z.number().int().positive().describe('Chain ID from SIWE message'),
  expiresAt: z.string().datetime().describe('Session expiration timestamp'),
});

/**
 * Session info schema
 */
export const SessionInfoSchema = z.object({
  address: z.string().regex(ETHEREUM_ADDRESS_REGEX),
  chainId: z.number().int().positive(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  isValid: z.boolean(),
});

// ============================================
// TYPESCRIPT TYPES (inferred from Zod)
// ============================================

export type NonceRequest = z.infer<typeof NonceRequestSchema>;
export type NonceResponse = z.infer<typeof NonceResponseSchema>;
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;
export type SessionInfo = z.infer<typeof SessionInfoSchema>;

// ============================================
// CLASS DTOs (for NestJS validation pipes)
// ============================================

/**
 * Request DTO for POST /auth/nonce
 */
export class NonceRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(ETHEREUM_ADDRESS_REGEX, {
    message: 'address must be a valid Ethereum address (0x followed by 40 hex characters)',
  })
  address!: string;
}

/**
 * Response DTO for POST /auth/nonce
 */
export class NonceResponseDto {
  @IsString()
  @IsNotEmpty()
  nonce!: string;

  @IsDateString()
  issuedAt!: string;

  @IsDateString()
  expiresAt!: string;
}

/**
 * Request DTO for POST /auth/verify
 */
export class VerifyRequestDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]+$/, {
    message: 'signature must be a valid hex string starting with 0x',
  })
  signature!: string;
}

/**
 * Response DTO for POST /auth/verify
 */
export class VerifyResponseDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsString()
  @Matches(ETHEREUM_ADDRESS_REGEX)
  address!: string;

  @IsNumber()
  chainId!: number;

  @IsDateString()
  expiresAt!: string;
}

/**
 * Response DTO for GET /auth/session
 */
export class SessionInfoDto {
  @IsString()
  @Matches(ETHEREUM_ADDRESS_REGEX)
  address!: string;

  @IsNumber()
  chainId!: number;

  @IsDateString()
  createdAt!: string;

  @IsDateString()
  expiresAt!: string;

  @IsBoolean()
  isValid!: boolean;
}

/**
 * DTO for logout request (optional body)
 */
export class LogoutRequestDto {
  @IsOptional()
  @IsBoolean()
  allSessions?: boolean;
}

// ============================================
// ERROR RESPONSE DTOs
// ============================================

/**
 * Standard error response
 */
export class AuthErrorResponseDto {
  @IsNumber()
  statusCode!: number;

  @IsString()
  error!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  code?: string;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate nonce request with Zod
 */
export function validateNonceRequest(data: unknown): NonceRequest {
  return NonceRequestSchema.parse(data);
}

/**
 * Validate verify request with Zod
 */
export function validateVerifyRequest(data: unknown): VerifyRequest {
  return VerifyRequestSchema.parse(data);
}

/**
 * Check if a string is a valid Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  return ETHEREUM_ADDRESS_REGEX.test(address);
}
