# 🐕 AI Guard Dog - Local Development Setup Guide

> **Zero-to-Hero Guide** for setting up the complete AI Guard Dog development environment on Windows/macOS.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Install Dependencies](#2-clone--install-dependencies)
3. [Environment Setup (Infrastructure)](#3-environment-setup-infrastructure)
4. [Database Setup](#4-database-setup)
5. [Smart Contract Deployment](#5-smart-contract-deployment)
6. [Running the Application](#6-running-the-application)
7. [One-Click Startup (Recommended)](#7-one-click-startup-recommended)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

Ensure you have the following installed on your system:

| Software | Version | Installation |
|----------|---------|--------------|
| **Node.js** | 20.x LTS | [nodejs.org](https://nodejs.org/) |
| **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |
| **pnpm** (optional) | 8.x+ | `npm install -g pnpm` |

### Verify Installation

```bash
# Check Node.js
node --version    # Should be v20.x.x

# Check npm
npm --version     # Should be 10.x.x

# Check Docker
docker --version  # Should be 24.x.x or higher

# Check Git
git --version
```

### Windows-Specific Setup

1. **Enable WSL2** (recommended for Docker performance):
   ```powershell
   wsl --install
   ```

2. **Docker Desktop Settings**:
   - Enable "Use WSL 2 based engine"
   - Allocate at least 4GB RAM in Resources > Advanced

### macOS-Specific Setup

1. Install Homebrew if not present:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Install Node via Homebrew (alternative):
   ```bash
   brew install node@20
   ```

---

## 2. Clone & Install Dependencies

### Clone the Repository

```bash
git clone https://github.com/your-org/AI-Guard-Dao.git
cd AI-Guard-Dao
```

### Install Root Dependencies

```bash
npm install
```

### Install Sub-Project Dependencies

```bash
# Smart Contracts
cd ai-guard-dao
npm install
cd ..

# API Gateway (NestJS Backend)
cd ai-guard-dog-backend/api-gateway
npm install
cd ../..

# React Frontend
cd react-app
npm install
cd ..

# Intelligence Service (Python - if using)
cd ai-guard-dog-backend/intelligence
pip install -r requirements.txt  # or: poetry install
cd ../..
```

**Quick Install Script (Windows PowerShell):**
```powershell
npm install; cd ai-guard-dao; npm install; cd ..\ai-guard-dog-backend\api-gateway; npm install; cd ..\..\react-app; npm install; cd ..
```

**Quick Install Script (macOS/Linux):**
```bash
npm install && cd ai-guard-dao && npm install && cd ../ai-guard-dog-backend/api-gateway && npm install && cd ../../react-app && npm install && cd ..
```

---

## 3. Environment Setup (Infrastructure)

### 3.1 Docker Services (PostgreSQL + Redis)

We use Docker Compose to run PostgreSQL and Redis locally.

**Start the infrastructure:**

```bash
# From the root directory
docker-compose up -d
```

If `docker-compose.yml` doesn't exist, create it:

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ai-guard-postgres
    environment:
      POSTGRES_USER: ai_guard
      POSTGRES_PASSWORD: ai_guard_secret
      POSTGRES_DB: ai_guard_dao
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ai_guard"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ai-guard-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

**Verify services are running:**

```bash
docker ps
# Should show ai-guard-postgres and ai-guard-redis
```

### 3.2 Environment Variables

Copy the example environment files:

```bash
# API Gateway
cp ai-guard-dog-backend/api-gateway/.env.example ai-guard-dog-backend/api-gateway/.env

# React App (if exists)
cp react-app/.env.example react-app/.env 2>/dev/null || echo "No .env.example for react-app"

# Contracts (if exists)
cp ai-guard-dao/.env.example ai-guard-dao/.env 2>/dev/null || echo "No .env.example for contracts"
```

**Edit `ai-guard-dog-backend/api-gateway/.env`:**

```env
# Database
DATABASE_URL="postgresql://ai_guard:ai_guard_secret@localhost:5432/ai_guard_dao?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Blockchain (will be updated after contract deployment)
RPC_URL=http://localhost:8545
CHAIN_ID=31337

# Contracts (LEAVE BLANK - will be filled by setup script)
VOTING_AGENT_ADDRESS=
DAO_GOVERNOR_ADDRESS=
AUDIT_LOGGER_ADDRESS=
MOCK_TOKEN_ADDRESS=

# Server
PORT=3001
NODE_ENV=development
```

---

## 4. Database Setup

### Run Prisma Migrations

```bash
cd ai-guard-dog-backend/api-gateway

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed the database
npx prisma db seed
```

### Verify Database

```bash
# Open Prisma Studio to inspect data
npx prisma studio
```

This opens a browser UI at `http://localhost:5555` to view your database tables.

---

## 5. Smart Contract Deployment

### 5.1 Start Local Blockchain

Open a **NEW terminal** and run:

```bash
cd ai-guard-dao
npx hardhat node
```

Keep this terminal running! You should see:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
...
```

### 5.2 Deploy Contracts

Open a **SECOND terminal** and run:

```bash
cd ai-guard-dao
npx hardhat run scripts/deploy.js --network localhost
```

You should see output like:
```
🐕 AI Guard Dog - Contract Deployment

📋 Contract Addresses:
   • AuditLogger:   0x5FbDB2315678afecb367f032d93F642f64180aa3
   • VotingAgent:   0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
   • MockToken:     0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
   • DAOGovernor:   0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

### 5.3 ⚠️ CRUCIAL: Update Environment Variables

**You MUST copy the deployed contract addresses into your `.env` files!**

**Edit `ai-guard-dog-backend/api-gateway/.env`:**
```env
VOTING_AGENT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
DAO_GOVERNOR_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
AUDIT_LOGGER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
MOCK_TOKEN_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

**Edit `react-app/.env` (create if not exists):**
```env
VITE_RPC_URL=http://localhost:8545
VITE_CHAIN_ID=31337
VITE_VOTING_AGENT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_DAO_GOVERNOR_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
VITE_AUDIT_LOGGER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_MOCK_TOKEN_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

> 💡 **Pro Tip:** Use the automated `setup-env.ts` script to do this automatically! See Section 7.

---

## 6. Running the Application

You'll need **4 terminal windows** running simultaneously:

### Terminal 1: Local Blockchain
```bash
cd ai-guard-dao
npx hardhat node
```

### Terminal 2: API Gateway (Backend)
```bash
cd ai-guard-dog-backend/api-gateway
npm run start:dev
```
- Runs at: `http://localhost:3001`

### Terminal 3: Mock AI Worker (BullMQ Consumer)
```bash
cd ai-guard-dog-backend/api-gateway
npm run worker:mock
```
- Processes analysis jobs from Redis queue

### Terminal 4: Frontend
```bash
cd react-app
npm run dev
```
- Runs at: `http://localhost:5173`

### Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API Gateway | http://localhost:3001 |
| Prisma Studio | http://localhost:5555 |
| Hardhat Node | http://localhost:8545 |

---

## 7. One-Click Startup (Recommended)

Tired of opening multiple terminals? Use our automation scripts!

### Windows: `start-local.bat`

```batch
# From root directory
start-local.bat
```

This will:
1. ✅ Check Docker is running
2. ✅ Start PostgreSQL + Redis
3. ✅ Launch Hardhat node
4. ✅ Deploy contracts & update `.env` files automatically
5. ✅ Start Backend + Worker + Frontend

### Unix/Mac: `start-local.sh`

```bash
chmod +x start-local.sh
./start-local.sh
```

### Manual Setup Automation

Run the setup script to deploy contracts and update `.env` files:

```bash
# From root directory
npx ts-node scripts/setup-env.ts
```

---

## 8. Troubleshooting

### Docker Issues

**Problem:** Docker containers won't start
```bash
# Reset Docker volumes
docker-compose down -v
docker-compose up -d
```

**Problem:** Port already in use
```bash
# Check what's using the port
# Windows:
netstat -ano | findstr :5432

# Mac/Linux:
lsof -i :5432
```

### Prisma Issues

**Problem:** Migration fails
```bash
# Reset database
npx prisma migrate reset --force
npx prisma migrate dev
```

**Problem:** Client out of sync
```bash
npx prisma generate
```

### Hardhat Issues

**Problem:** Contract deployment fails
```bash
# Ensure Hardhat node is running
# In separate terminal:
cd ai-guard-dao && npx hardhat node
```

**Problem:** "Nonce too high" error
```bash
# Reset Hardhat node (restart it)
# Or clear MetaMask account activity
```

### Environment Variable Issues

**Problem:** Contracts not found
- Ensure you've copied addresses from deploy output to `.env`
- Run `npx ts-node scripts/setup-env.ts` to automate this

### Frontend Connection Issues

**Problem:** "RPC Error" in browser
```bash
# Ensure Hardhat node is running on port 8545
# Check VITE_RPC_URL in react-app/.env
```

---

## Quick Reference

### Useful Commands

```bash
# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Reset everything
docker-compose down -v
npx prisma migrate reset --force

# Run tests
cd ai-guard-dog-backend/api-gateway && npm test
cd ai-guard-dao && npx hardhat test

# Generate types from contracts
cd ai-guard-dao && npx hardhat compile
```

### Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| PostgreSQL | ai_guard | ai_guard_secret |
| Redis | - | (no password) |

### Hardhat Test Accounts

The first account with 10,000 ETH:
```
Address:    0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

> ⚠️ **Never use these keys on mainnet!**

---

## Next Steps

Once your local environment is running:

1. 📖 Read [CONTRACT_INTEGRATION.md](./CONTRACT_INTEGRATION.md) to understand the smart contracts
2. 📖 Read [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) for API documentation
3. 📖 Read [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) for UI patterns
4. 🧪 Run the E2E test: `npm run test:system` in api-gateway

---

*Happy Building! 🐕*
