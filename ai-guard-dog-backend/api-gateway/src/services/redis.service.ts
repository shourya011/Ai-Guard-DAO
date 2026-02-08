/**
 * AI Guard DAO - Redis Service
 * 
 * Centralized Redis operations for:
 * - SIWE nonce storage (TTL: 300s)
 * - Session management (TTL: 86400s)
 * - Rate limiting counters
 * - Response caching
 * 
 * Key Patterns:
 * - Nonce: `nonce:{walletAddress}`
 * - Session: `session:{token}`
 * - Rate Limit: `ratelimit:{address}`
 * - Cache: `cache:{hash}`
 */

import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { AppConfig } from '../config/app.config';

// ============================================
// KEY PATTERN CONSTANTS
// ============================================

export const RedisKeys = {
  /** Nonce key pattern: nonce:{walletAddress} */
  nonce: (address: string) => `nonce:${address.toLowerCase()}`,
  
  /** Session key pattern: session:{token} */
  session: (token: string) => `session:${token}`,
  
  /** Rate limit key pattern: ratelimit:{address} */
  rateLimit: (address: string) => `ratelimit:${address.toLowerCase()}`,
  
  /** Cache key pattern: cache:{hash} */
  cache: (hash: string) => `cache:${hash}`,
  
  /** Lock key pattern: lock:{resource} */
  lock: (resource: string) => `lock:${resource}`,
} as const;

// ============================================
// TTL CONSTANTS (in seconds)
// ============================================

export const RedisTTL = {
  /** Nonce expires in 5 minutes */
  NONCE: 300,
  
  /** Session expires in 24 hours */
  SESSION: 86400,
  
  /** Cache expires in 1 hour */
  CACHE: 3600,
  
  /** Lock expires in 30 seconds */
  LOCK: 30,
} as const;

// ============================================
// SESSION DATA INTERFACE
// ============================================

export interface SessionData {
  address: string;
  chainId: number;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  ipHash?: string;
}

// ============================================
// REDIS SERVICE
// ============================================

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  
  constructor(private readonly configService: ConfigService<AppConfig>) {}

  async onModuleInit(): Promise<void> {
    const redisConfig = this.configService.get('redis', { infer: true });
    
    this.client = new Redis({
      host: redisConfig?.host || 'localhost',
      port: redisConfig?.port || 6379,
      password: redisConfig?.password || undefined,
      db: redisConfig?.db || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Redis connected successfully');
    });

    this.client.on('error', (err) => {
      this.logger.error(`❌ Redis connection error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  /**
   * Get the raw Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Create a new Redis subscriber client for Pub/Sub
   * Note: Redis Pub/Sub requires dedicated connections
   */
  createSubscriber(): Redis {
    const redisConfig = this.configService.get('redis', { infer: true });
    
    const subscriber = new Redis({
      host: redisConfig?.host || 'localhost',
      port: redisConfig?.port || 6379,
      password: redisConfig?.password || undefined,
      db: redisConfig?.db || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    subscriber.on('error', (err) => {
      this.logger.error(`Redis subscriber error: ${err.message}`);
    });

    return subscriber;
  }

  // ============================================
  // BASIC OPERATIONS
  // ============================================

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Set a value with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    return (await this.client.expire(key, ttlSeconds)) === 1;
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // ============================================
  // NONCE OPERATIONS
  // ============================================

  /**
   * Store a nonce for a wallet address
   * Key: nonce:{address}
   * TTL: 300 seconds (5 minutes)
   */
  async setNonce(address: string, nonce: string): Promise<void> {
    const key = RedisKeys.nonce(address);
    const ttl = this.configService.get('auth.nonceTtl', { infer: true }) || RedisTTL.NONCE;
    await this.client.setex(key, ttl, nonce);
    this.logger.debug(`Nonce stored for ${address}, TTL: ${ttl}s`);
  }

  /**
   * Retrieve and optionally delete a nonce
   * @param address - Wallet address
   * @param consume - If true, delete the nonce after retrieval (default: false)
   */
  async getNonce(address: string, consume = false): Promise<string | null> {
    const key = RedisKeys.nonce(address);
    
    if (consume) {
      // Atomic get and delete
      const nonce = await this.client.getdel(key);
      if (nonce) {
        this.logger.debug(`Nonce consumed for ${address}`);
      }
      return nonce;
    }
    
    return this.client.get(key);
  }

  /**
   * Delete a nonce (for cleanup after verification)
   */
  async deleteNonce(address: string): Promise<void> {
    const key = RedisKeys.nonce(address);
    await this.client.del(key);
    this.logger.debug(`Nonce deleted for ${address}`);
  }

  // ============================================
  // SESSION OPERATIONS
  // ============================================

  /**
   * Store session data
   * Key: session:{token}
   * TTL: 86400 seconds (24 hours)
   */
  async setSession(token: string, data: SessionData): Promise<void> {
    const key = RedisKeys.session(token);
    const ttl = this.configService.get('auth.sessionTtl', { infer: true }) || RedisTTL.SESSION;
    await this.client.setex(key, ttl, JSON.stringify(data));
    this.logger.debug(`Session created for ${data.address}, TTL: ${ttl}s`);
  }

  /**
   * Retrieve session data
   */
  async getSession(token: string): Promise<SessionData | null> {
    const key = RedisKeys.session(token);
    const data = await this.client.get(key);
    
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as SessionData;
    } catch (error) {
      this.logger.error(`Failed to parse session data: ${error}`);
      return null;
    }
  }

  /**
   * Delete a session (logout)
   */
  async deleteSession(token: string): Promise<void> {
    const key = RedisKeys.session(token);
    await this.client.del(key);
    this.logger.debug(`Session deleted: ${token.slice(0, 8)}...`);
  }

  /**
   * Refresh session TTL (extend expiration)
   */
  async refreshSession(token: string): Promise<boolean> {
    const key = RedisKeys.session(token);
    const ttl = this.configService.get('auth.sessionTtl', { infer: true }) || RedisTTL.SESSION;
    return this.expire(key, ttl);
  }

  // ============================================
  // LOCKING OPERATIONS (for cache stampede prevention)
  // ============================================

  /**
   * Acquire a lock using SETNX
   * Returns true if lock acquired, false if already locked
   */
  async acquireLock(resource: string, ttlSeconds = RedisTTL.LOCK): Promise<boolean> {
    const key = RedisKeys.lock(resource);
    const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Release a lock
   */
  async releaseLock(resource: string): Promise<void> {
    const key = RedisKeys.lock(resource);
    await this.client.del(key);
  }

  // ============================================
  // RATE LIMITING OPERATIONS (Sliding Window)
  // ============================================

  /**
   * Check and increment rate limit counter
   * Returns { allowed: boolean, remaining: number, resetAt: number }
   */
  async checkRateLimit(
    address: string,
    windowMs: number,
    maxRequests: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = RedisKeys.rateLimit(address);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Remove old entries outside the window
    await this.client.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    const count = await this.client.zcard(key);

    if (count >= maxRequests) {
      // Get oldest entry to calculate reset time
      const oldest = await this.client.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldest.length > 1 ? parseInt(oldest[1], 10) + windowMs : now + windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add current request
    await this.client.zadd(key, now, `${now}:${Math.random()}`);
    await this.client.pexpire(key, windowMs);

    return {
      allowed: true,
      remaining: maxRequests - count - 1,
      resetAt: now + windowMs,
    };
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * Check Redis connectivity
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
