/**
 * AI Guard Dog - Automated Environment Setup Script
 * 
 * This script:
 * 1. Deploys contracts to local Hardhat node
 * 2. Captures deployed addresses
 * 3. Updates .env files in api-gateway and react-app
 * 4. Seeds database with test data (optional)
 * 
 * Usage: npx ts-node scripts/setup-env.ts [--seed]
 */

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIGURATION
// ============================================

const ROOT_DIR = path.resolve(__dirname, '..');
const CONTRACTS_DIR = path.join(ROOT_DIR, 'ai-guard-dao');
const API_DIR = path.join(ROOT_DIR, 'ai-guard-dog-backend', 'api-gateway');
const FRONTEND_DIR = path.join(ROOT_DIR, 'react-app');
const DEPLOYMENTS_DIR = path.join(CONTRACTS_DIR, 'deployments');

interface DeploymentInfo {
  network: string;
  deployer: string;
  timestamp: string;
  contracts: {
    AuditLogger: string;
    VotingAgent: string;
    MockToken: string;
    DAOGovernor: string;
  };
  configuration: {
    initialBackend: string;
    votingDelay: number;
    votingPeriod: number;
    proposalThreshold: number;
    quorum: number;
  };
}

// ============================================
// UTILITIES
// ============================================

function log(emoji: string, message: string): void {
  console.log(`${emoji}  ${message}`);
}

function logSection(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function readEnvFile(filePath: string): Map<string, string> {
  const envMap = new Map<string, string>();
  
  if (!fileExists(filePath)) {
    return envMap;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        envMap.set(key.trim(), valueParts.join('=').trim());
      }
    }
  }
  
  return envMap;
}

function writeEnvFile(filePath: string, envMap: Map<string, string>): void {
  const lines: string[] = [];
  
  for (const [key, value] of envMap) {
    lines.push(`${key}=${value}`);
  }
  
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function updateEnvFile(filePath: string, updates: Record<string, string>): void {
  const envMap = readEnvFile(filePath);
  
  for (const [key, value] of Object.entries(updates)) {
    envMap.set(key, value);
  }
  
  writeEnvFile(filePath, envMap);
}

// ============================================
// HARDHAT NODE CHECK
// ============================================

async function checkHardhatNode(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8545', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================
// CONTRACT DEPLOYMENT
// ============================================

function deployContracts(): Promise<void> {
  return new Promise((resolve, reject) => {
    log('📦', 'Deploying contracts to local Hardhat node...');
    
    const deploy = spawn('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost'], {
      cwd: CONTRACTS_DIR,
      shell: true,
      stdio: 'inherit',
    });
    
    deploy.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Deployment failed with code ${code}`));
      }
    });
    
    deploy.on('error', (err) => {
      reject(err);
    });
  });
}

function getLatestDeployment(): DeploymentInfo | null {
  const latestFile = path.join(DEPLOYMENTS_DIR, 'latest-localhost.json');
  
  if (!fileExists(latestFile)) {
    log('⚠️', 'No deployment file found. Please deploy contracts first.');
    return null;
  }
  
  const content = fs.readFileSync(latestFile, 'utf-8');
  return JSON.parse(content) as DeploymentInfo;
}

// ============================================
// ENVIRONMENT FILE UPDATES
// ============================================

function updateApiEnv(deployment: DeploymentInfo): void {
  const envPath = path.join(API_DIR, '.env');
  const examplePath = path.join(API_DIR, '.env.example');
  
  // If .env doesn't exist, copy from example
  if (!fileExists(envPath) && fileExists(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    log('📋', 'Created .env from .env.example');
  }
  
  // Create with defaults if neither exists
  if (!fileExists(envPath)) {
    const defaultEnv = `
# AI Guard DAO - API Gateway Environment Variables
# Auto-generated by setup-env.ts

# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://ai_guard:ai_guard_secret@localhost:5432/ai_guard_dao?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Blockchain
RPC_URL=http://localhost:8545
CHAIN_ID=31337

# Contracts (auto-populated)
VOTING_AGENT_ADDRESS=
DAO_GOVERNOR_ADDRESS=
AUDIT_LOGGER_ADDRESS=
MOCK_TOKEN_ADDRESS=

# Auth
AUTH_NONCE_TTL=300
AUTH_SESSION_TTL=86400
AUTH_DOMAIN=localhost
AUTH_URI=http://localhost:3001

# AI Engine
AI_ENGINE_URL=http://localhost:8000
`.trim();
    
    fs.writeFileSync(envPath, defaultEnv + '\n');
    log('📋', 'Created new .env with defaults');
  }
  
  // Update contract addresses
  const updates: Record<string, string> = {
    VOTING_AGENT_ADDRESS: deployment.contracts.VotingAgent,
    DAO_GOVERNOR_ADDRESS: deployment.contracts.DAOGovernor,
    AUDIT_LOGGER_ADDRESS: deployment.contracts.AuditLogger,
    MOCK_TOKEN_ADDRESS: deployment.contracts.MockToken,
    RPC_URL: 'http://localhost:8545',
    CHAIN_ID: '31337',
  };
  
  updateEnvFile(envPath, updates);
  log('✅', `Updated ${envPath}`);
}

function updateFrontendEnv(deployment: DeploymentInfo): void {
  const envPath = path.join(FRONTEND_DIR, '.env');
  const envLocalPath = path.join(FRONTEND_DIR, '.env.local');
  
  // Vite uses .env.local for local overrides
  const targetPath = envPath;
  
  // Create or update
  const updates: Record<string, string> = {
    VITE_API_BASE_URL: 'http://localhost:3001',
    VITE_RPC_URL: 'http://localhost:8545',
    VITE_CHAIN_ID: '31337',
    VITE_VOTING_AGENT_ADDRESS: deployment.contracts.VotingAgent,
    VITE_DAO_GOVERNOR_ADDRESS: deployment.contracts.DAOGovernor,
    VITE_AUDIT_LOGGER_ADDRESS: deployment.contracts.AuditLogger,
    VITE_MOCK_TOKEN_ADDRESS: deployment.contracts.MockToken,
    VITE_WALLETCONNECT_PROJECT_ID: 'demo-project-id',
  };
  
  // If file exists, merge; otherwise create fresh
  if (fileExists(targetPath)) {
    updateEnvFile(targetPath, updates);
  } else {
    const envMap = new Map(Object.entries(updates));
    writeEnvFile(targetPath, envMap);
  }
  
  log('✅', `Updated ${targetPath}`);
}

// ============================================
// DATABASE SEEDING
// ============================================

async function seedDatabase(): Promise<void> {
  log('🌱', 'Seeding database...');
  
  try {
    execSync('npx prisma db seed', {
      cwd: API_DIR,
      stdio: 'inherit',
    });
    log('✅', 'Database seeded successfully');
  } catch (error) {
    log('⚠️', 'Database seed failed or not configured (this is okay)');
  }
}

async function runMigrations(): Promise<void> {
  log('🔄', 'Running Prisma migrations...');
  
  try {
    // Generate client first
    execSync('npx prisma generate', {
      cwd: API_DIR,
      stdio: 'inherit',
    });
    
    // Run migrations
    execSync('npx prisma migrate deploy', {
      cwd: API_DIR,
      stdio: 'inherit',
    });
    
    log('✅', 'Migrations applied successfully');
  } catch (error) {
    log('⚠️', 'Migration failed. Database might not be running.');
    log('💡', 'Try: docker-compose up -d');
  }
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const shouldSeed = args.includes('--seed');
  const skipDeploy = args.includes('--skip-deploy');
  
  console.log('\n');
  console.log('🐕 ═══════════════════════════════════════════════════════');
  console.log('   AI GUARD DOG - Automated Environment Setup');
  console.log('═══════════════════════════════════════════════════════ 🐕');
  console.log('\n');
  
  // Step 1: Check Hardhat node
  logSection('Step 1: Checking Hardhat Node');
  const nodeRunning = await checkHardhatNode();
  
  if (!nodeRunning) {
    log('❌', 'Hardhat node is not running on localhost:8545');
    log('💡', 'Start it with: cd ai-guard-dao && npx hardhat node');
    log('', '');
    log('⏳', 'Waiting 10 seconds for you to start the node...');
    
    await sleep(10000);
    
    const retryCheck = await checkHardhatNode();
    if (!retryCheck) {
      log('❌', 'Still no Hardhat node detected. Exiting.');
      process.exit(1);
    }
  }
  log('✅', 'Hardhat node is running');
  
  // Step 2: Deploy contracts
  logSection('Step 2: Deploying Smart Contracts');
  
  if (skipDeploy) {
    log('⏭️', 'Skipping deployment (--skip-deploy flag)');
  } else {
    await deployContracts();
  }
  
  // Wait for deployment file to be written
  await sleep(1000);
  
  // Step 3: Get deployment info
  logSection('Step 3: Reading Deployment Info');
  const deployment = getLatestDeployment();
  
  if (!deployment) {
    log('❌', 'Could not read deployment info. Exiting.');
    process.exit(1);
  }
  
  log('📋', 'Deployed Contracts:');
  console.log(`      • AuditLogger:  ${deployment.contracts.AuditLogger}`);
  console.log(`      • VotingAgent:  ${deployment.contracts.VotingAgent}`);
  console.log(`      • MockToken:    ${deployment.contracts.MockToken}`);
  console.log(`      • DAOGovernor:  ${deployment.contracts.DAOGovernor}`);
  
  // Step 4: Update .env files
  logSection('Step 4: Updating Environment Files');
  updateApiEnv(deployment);
  updateFrontendEnv(deployment);
  
  // Step 5: Database (optional)
  logSection('Step 5: Database Setup');
  await runMigrations();
  
  if (shouldSeed) {
    await seedDatabase();
  } else {
    log('💡', 'Run with --seed flag to seed database');
  }
  
  // Done!
  logSection('🎉 Setup Complete!');
  console.log(`
  Your environment is configured with:
  
  📍 Contract Addresses (localhost:8545):
     • VotingAgent:  ${deployment.contracts.VotingAgent}
     • DAOGovernor:  ${deployment.contracts.DAOGovernor}
     • AuditLogger:  ${deployment.contracts.AuditLogger}
     • MockToken:    ${deployment.contracts.MockToken}
  
  📁 Updated Files:
     • ai-guard-dog-backend/api-gateway/.env
     • react-app/.env
  
  🚀 Next Steps:
     1. Start Backend:  cd ai-guard-dog-backend/api-gateway && npm run start:dev
     2. Start Worker:   cd ai-guard-dog-backend/api-gateway && npm run worker:mock
     3. Start Frontend: cd react-app && npm run dev
  
  Or just run: start-local.bat (Windows) / ./start-local.sh (Mac)
  `);
}

main().catch((error) => {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
});
