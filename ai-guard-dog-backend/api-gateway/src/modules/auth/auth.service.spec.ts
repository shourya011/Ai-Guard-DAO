/**
 * AI Guard DAO - Auth E2E Tests
 * 
 * Tests demonstrating the complete SIWE authentication flow:
 * 1. Request nonce
 * 2. Build SIWE message
 * 3. Sign message with wallet
 * 4. Verify signature and get session
 * 5. Access protected routes
 * 6. Logout
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { Wallet } from 'ethers';
import { SiweMessage, generateNonce } from 'siwe';

import configuration from '../../config/app.config';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WalletAuthGuard, TokenGateGuard } from './guards/wallet-auth.guard';
import { RedisService } from '../../services/redis.service';

// ============================================
// MOCK REDIS SERVICE
// ============================================

class MockRedisService {
  private store = new Map<string, { value: string; ttl: number; createdAt: number }>();

  async setNonce(address: string, nonce: string): Promise<void> {
    const key = `nonce:${address.toLowerCase()}`;
    this.store.set(key, { value: nonce, ttl: 300, createdAt: Date.now() });
  }

  async getNonce(address: string, consume = false): Promise<string | null> {
    const key = `nonce:${address.toLowerCase()}`;
    const entry = this.store.get(key);
    
    if (!entry) return null;
    
    // Check expiry
    if (Date.now() - entry.createdAt > entry.ttl * 1000) {
      this.store.delete(key);
      return null;
    }
    
    if (consume) {
      this.store.delete(key);
    }
    
    return entry.value;
  }

  async deleteNonce(address: string): Promise<void> {
    const key = `nonce:${address.toLowerCase()}`;
    this.store.delete(key);
  }

  async setSession(token: string, data: any): Promise<void> {
    const key = `session:${token}`;
    this.store.set(key, { value: JSON.stringify(data), ttl: 86400, createdAt: Date.now() });
  }

  async getSession(token: string): Promise<any | null> {
    const key = `session:${token}`;
    const entry = this.store.get(key);
    
    if (!entry) return null;
    
    return JSON.parse(entry.value);
  }

  async deleteSession(token: string): Promise<void> {
    const key = `session:${token}`;
    this.store.delete(key);
  }

  // Other methods that might be called
  async onModuleInit(): Promise<void> {}
  async onModuleDestroy(): Promise<void> {}
  getClient(): any { return {}; }
  async ping(): Promise<boolean> { return true; }
}

// ============================================
// TEST SUITE
// ============================================

describe('Auth Module (e2e)', () => {
  let app: INestApplication;
  let mockRedisService: MockRedisService;
  
  // Test wallet (deterministic for reproducible tests)
  const testWallet = Wallet.createRandom();
  const testAddress = testWallet.address;
  
  // SIWE config
  const domain = 'ai-guard-dao.xyz';
  const uri = 'https://ai-guard-dao.xyz';
  const chainId = 1;

  beforeAll(async () => {
    mockRedisService = new MockRedisService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        WalletAuthGuard,
        TokenGateGuard,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================
  // TEST: COMPLETE AUTH FLOW
  // ============================================

  describe('Complete SIWE Authentication Flow', () => {
    let nonce: string;
    let accessToken: string;

    it('Step 1: POST /auth/nonce - Should return a nonce', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/nonce')
        .send({ address: testAddress })
        .expect(200);

      expect(response.body).toHaveProperty('nonce');
      expect(response.body).toHaveProperty('issuedAt');
      expect(response.body).toHaveProperty('expiresAt');
      expect(typeof response.body.nonce).toBe('string');
      expect(response.body.nonce.length).toBeGreaterThan(0);

      nonce = response.body.nonce;
      console.log(`✅ Step 1: Nonce received: ${nonce}`);
    });

    it('Step 2: Build SIWE message', async () => {
      const message = new SiweMessage({
        domain,
        address: testAddress,
        statement: 'Sign in to AI Guard DAO',
        uri,
        version: '1',
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
      });

      const preparedMessage = message.prepareMessage();
      
      expect(preparedMessage).toContain(domain);
      expect(preparedMessage).toContain(testAddress);
      expect(preparedMessage).toContain(nonce);
      
      console.log(`✅ Step 2: SIWE message built`);
      console.log(`   Message preview: ${preparedMessage.slice(0, 100)}...`);
    });

    it('Step 3: Sign message and verify - Should return session token', async () => {
      // Build SIWE message
      const message = new SiweMessage({
        domain,
        address: testAddress,
        statement: 'Sign in to AI Guard DAO',
        uri,
        version: '1',
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
      });

      const preparedMessage = message.prepareMessage();

      // Sign the message with the wallet
      const signature = await testWallet.signMessage(preparedMessage);

      console.log(`✅ Step 3a: Message signed`);
      console.log(`   Signature: ${signature.slice(0, 30)}...`);

      // Verify with the backend
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify')
        .send({
          message: preparedMessage,
          signature,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('chainId');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body.address.toLowerCase()).toBe(testAddress.toLowerCase());
      expect(response.body.chainId).toBe(chainId);

      accessToken = response.body.accessToken;
      
      console.log(`✅ Step 3b: Session created`);
      console.log(`   Token: ${accessToken.slice(0, 8)}...`);
      console.log(`   Address: ${response.body.address}`);
    });

    it('Step 4: GET /auth/session - Should return session info', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/session')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('chainId');
      expect(response.body).toHaveProperty('isValid', true);
      expect(response.body.address.toLowerCase()).toBe(testAddress.toLowerCase());

      console.log(`✅ Step 4: Session validated`);
    });

    it('Step 5: POST /auth/logout - Should invalidate session', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logged out successfully');

      console.log(`✅ Step 5: Session logged out`);
    });

    it('Step 6: GET /auth/session after logout - Should return 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/session')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      console.log(`✅ Step 6: Session correctly invalidated`);
    });
  });

  // ============================================
  // TEST: ERROR CASES
  // ============================================

  describe('Error Handling', () => {
    it('Should reject invalid address format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/nonce')
        .send({ address: 'invalid-address' })
        .expect(400);

      // message is an array from class-validator
      const messages = Array.isArray(response.body.message) 
        ? response.body.message.join(' ') 
        : response.body.message;
      expect(messages.toLowerCase()).toContain('address');
    });

    it('Should reject missing nonce', async () => {
      const wallet = Wallet.createRandom();
      
      // Build message with random nonce (not stored in Redis)
      const message = new SiweMessage({
        domain,
        address: wallet.address,
        statement: 'Sign in to AI Guard DAO',
        uri,
        version: '1',
        chainId,
        nonce: generateNonce(),
        issuedAt: new Date().toISOString(),
      });

      const preparedMessage = message.prepareMessage();
      const signature = await wallet.signMessage(preparedMessage);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify')
        .send({ message: preparedMessage, signature })
        .expect(401);

      expect(response.body.message).toContain('Nonce');
    });

    it('Should reject invalid signature', async () => {
      // First get a valid nonce
      const wallet = Wallet.createRandom();
      
      const nonceResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/nonce')
        .send({ address: wallet.address })
        .expect(200);

      // Build valid message
      const message = new SiweMessage({
        domain,
        address: wallet.address,
        statement: 'Sign in to AI Guard DAO',
        uri,
        version: '1',
        chainId,
        nonce: nonceResponse.body.nonce,
        issuedAt: new Date().toISOString(),
      });

      const preparedMessage = message.prepareMessage();
      
      // Sign with DIFFERENT wallet (invalid signature)
      const differentWallet = Wallet.createRandom();
      const invalidSignature = await differentWallet.signMessage(preparedMessage);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify')
        .send({ message: preparedMessage, signature: invalidSignature })
        .expect(401);

      expect(response.body.message).toContain('verification failed');
    });

    it('Should reject request without authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/session')
        .expect(401);
    });

    it('Should reject invalid token format', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/session')
        .set('Authorization', 'Bearer not-a-valid-uuid')
        .expect(401);
    });
  });

  // ============================================
  // TEST: REPLAY ATTACK PREVENTION
  // ============================================

  describe('Replay Attack Prevention', () => {
    it('Should prevent nonce reuse', async () => {
      const wallet = Wallet.createRandom();

      // Get nonce
      const nonceResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/nonce')
        .send({ address: wallet.address })
        .expect(200);

      const { nonce } = nonceResponse.body;

      // Build and sign message
      const message = new SiweMessage({
        domain,
        address: wallet.address,
        statement: 'Sign in to AI Guard DAO',
        uri,
        version: '1',
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
      });

      const preparedMessage = message.prepareMessage();
      const signature = await wallet.signMessage(preparedMessage);

      // First verification should succeed
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify')
        .send({ message: preparedMessage, signature })
        .expect(200);

      // Second verification with same nonce should fail
      const replayResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/verify')
        .send({ message: preparedMessage, signature })
        .expect(401);

      expect(replayResponse.body.message).toContain('Nonce');
      console.log('✅ Replay attack prevented - nonce consumed after first use');
    });
  });
});

// ============================================
// STANDALONE TEST SCRIPT (can run independently)
// ============================================

/**
 * Run this to test the flow manually:
 * npx ts-node src/modules/auth/__tests__/auth.e2e-spec.ts
 */
async function runManualTest() {
  console.log('\n🧪 Running manual SIWE authentication test...\n');
  
  const wallet = Wallet.createRandom();
  console.log(`Test wallet: ${wallet.address}`);
  
  const domain = 'localhost';
  const uri = 'http://localhost:3001';
  const chainId = 1;
  
  // Step 1: Generate nonce (simulated)
  const nonce = generateNonce();
  console.log(`\n1️⃣ Generated nonce: ${nonce}`);
  
  // Step 2: Build SIWE message
  const message = new SiweMessage({
    domain,
    address: wallet.address,
    statement: 'Sign in to AI Guard DAO',
    uri,
    version: '1',
    chainId,
    nonce,
    issuedAt: new Date().toISOString(),
  });
  
  const preparedMessage = message.prepareMessage();
  console.log(`\n2️⃣ SIWE Message:\n${preparedMessage}`);
  
  // Step 3: Sign message
  const signature = await wallet.signMessage(preparedMessage);
  console.log(`\n3️⃣ Signature: ${signature}`);
  
  // Step 4: Verify (simulation)
  try {
    const verifyResult = await message.verify({ signature });
    console.log(`\n4️⃣ Verification result: ${verifyResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (verifyResult.success) {
      console.log(`   Recovered address: ${verifyResult.data.address}`);
    }
  } catch (error) {
    console.error(`\n4️⃣ Verification error:`, error);
  }
  
  console.log('\n🏁 Manual test complete!\n');
}

// Uncomment to run standalone:
// runManualTest().catch(console.error);
