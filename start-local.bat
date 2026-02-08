@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  AI Guard Dog - One-Click Local Development Launcher
REM  
REM  This script starts the entire development environment:
REM  1. Docker (PostgreSQL + Redis)
REM  2. Hardhat Local Blockchain
REM  3. Contract Deployment + .env Updates
REM  4. NestJS Backend
REM  5. Mock AI Worker
REM  6. React Frontend
REM ═══════════════════════════════════════════════════════════════════════════

title AI Guard Dog - Launcher
color 0A

echo.
echo  ══════════════════════════════════════════════════════════════
echo   🐕 AI GUARD DOG - Local Development Launcher
echo  ══════════════════════════════════════════════════════════════
echo.

REM ─────────────────────────────────────────────────────────────────
REM  Step 0: Check Prerequisites
REM ─────────────────────────────────────────────────────────────────
echo [Step 0/6] Checking prerequisites...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ⚠️  WARNING: Docker Desktop is not running!
    echo.
    echo  Please start Docker Desktop and try again.
    echo  Download from: https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)
echo   ✅ Docker is running

REM Check if Node is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ❌ Node.js is not installed!
    echo  Please install Node.js 20.x from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo   ✅ Node.js is installed

REM ─────────────────────────────────────────────────────────────────
REM  Step 1: Start Docker Infrastructure
REM ─────────────────────────────────────────────────────────────────
echo.
echo [Step 1/6] Starting Docker infrastructure (PostgreSQL + Redis)...

REM Check if docker-compose.yml exists
if not exist docker-compose.yml (
    echo   Creating docker-compose.yml...
    (
        echo version: '3.8'
        echo.
        echo services:
        echo   postgres:
        echo     image: postgres:16-alpine
        echo     container_name: ai-guard-postgres
        echo     environment:
        echo       POSTGRES_USER: ai_guard
        echo       POSTGRES_PASSWORD: ai_guard_secret
        echo       POSTGRES_DB: ai_guard_dao
        echo     ports:
        echo       - "5432:5432"
        echo     volumes:
        echo       - postgres_data:/var/lib/postgresql/data
        echo     healthcheck:
        echo       test: ["CMD-SHELL", "pg_isready -U ai_guard"]
        echo       interval: 5s
        echo       timeout: 5s
        echo       retries: 5
        echo.
        echo   redis:
        echo     image: redis:7-alpine
        echo     container_name: ai-guard-redis
        echo     ports:
        echo       - "6379:6379"
        echo     volumes:
        echo       - redis_data:/data
        echo     command: redis-server --appendonly yes
        echo     healthcheck:
        echo       test: ["CMD", "redis-cli", "ping"]
        echo       interval: 5s
        echo       timeout: 5s
        echo       retries: 5
        echo.
        echo volumes:
        echo   postgres_data:
        echo   redis_data:
    ) > docker-compose.yml
)

docker-compose up -d
if %errorlevel% neq 0 (
    echo   ❌ Failed to start Docker containers
    pause
    exit /b 1
)
echo   ✅ Docker containers started

REM Wait for PostgreSQL to be ready
echo   ⏳ Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

REM ─────────────────────────────────────────────────────────────────
REM  Step 2: Start Hardhat Node (New Terminal)
REM ─────────────────────────────────────────────────────────────────
echo.
echo [Step 2/6] Starting Hardhat local blockchain node...

start "🔗 Hardhat Node" cmd /k "cd /d %~dp0ai-guard-dao && echo Starting Hardhat Node... && npx hardhat node"

echo   ✅ Hardhat node starting in new terminal
echo   ⏳ Waiting 8 seconds for node to initialize...
timeout /t 8 /nobreak >nul

REM ─────────────────────────────────────────────────────────────────
REM  Step 3: Deploy Contracts & Setup Environment
REM ─────────────────────────────────────────────────────────────────
echo.
echo [Step 3/6] Deploying contracts and configuring environment...

REM Deploy contracts using Hardhat directly (more reliable than ts-node)
cd /d %~dp0ai-guard-dao
echo   Deploying contracts to local Hardhat node...
call npx hardhat run scripts/deploy.js --network localhost
if %errorlevel% neq 0 (
    echo   ⚠️  Contract deployment failed. Make sure Hardhat node is running.
    echo   Waiting 5 more seconds and retrying...
    timeout /t 5 /nobreak >nul
    call npx hardhat run scripts/deploy.js --network localhost
)
cd /d %~dp0
echo   ✅ Contracts deployed

REM ─────────────────────────────────────────────────────────────────
REM  Step 4: Start Backend (New Terminal)
REM ─────────────────────────────────────────────────────────────────
echo.
echo [Step 4/6] Starting NestJS Backend...

start "🚀 Backend (NestJS)" cmd /k "cd /d %~dp0ai-guard-dog-backend\api-gateway && echo Starting NestJS Backend... && npm run start:dev"

echo   ✅ Backend starting in new terminal
timeout /t 3 /nobreak >nul

REM ─────────────────────────────────────────────────────────────────
REM  Step 5: Start Mock AI Worker (New Terminal)
REM ─────────────────────────────────────────────────────────────────
echo.
echo [Step 5/6] Starting Mock AI Worker...

start "🤖 AI Worker (BullMQ)" cmd /k "cd /d %~dp0ai-guard-dog-backend\api-gateway && echo Starting Mock AI Worker... && npm run worker:mock"

echo   ✅ AI Worker starting in new terminal
timeout /t 2 /nobreak >nul

REM ─────────────────────────────────────────────────────────────────
REM  Step 6: Start Frontend (New Terminal)
REM ─────────────────────────────────────────────────────────────────
echo.
echo [Step 6/6] Starting React Frontend...

start "🎨 Frontend (Vite)" cmd /k "cd /d %~dp0react-app && echo Starting React Frontend... && npm run dev"

echo   ✅ Frontend starting in new terminal

REM ─────────────────────────────────────────────────────────────────
REM  Complete!
REM ─────────────────────────────────────────────────────────────────
echo.
echo  ══════════════════════════════════════════════════════════════
echo   🎉 AI GUARD DOG IS READY!
echo  ══════════════════════════════════════════════════════════════
echo.
echo   🌐 Access your application:
echo.
echo      Frontend:        http://localhost:5173
echo      Backend API:     http://localhost:3001
echo      Hardhat RPC:     http://localhost:8545
echo      Prisma Studio:   npx prisma studio (in api-gateway)
echo.
echo   📋 Running Services:
echo.
echo      [Terminal 1] Hardhat Node     - Local blockchain
echo      [Terminal 2] NestJS Backend   - API Gateway
echo      [Terminal 3] AI Worker        - Analysis processor
echo      [Terminal 4] Vite Frontend    - React app
echo.
echo   🛑 To stop all services:
echo      Close all terminal windows or run: docker-compose down
echo.
echo  ══════════════════════════════════════════════════════════════
echo.

REM Keep this window open
pause
