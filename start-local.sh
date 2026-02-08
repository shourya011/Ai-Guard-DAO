#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
#  AI Guard Dog - One-Click Local Development Launcher (macOS/Linux)
#  
#  This script starts the entire development environment:
#  1. Docker (PostgreSQL + Redis)
#  2. Hardhat Local Blockchain
#  3. Contract Deployment + .env Updates
#  4. NestJS Backend
#  5. Mock AI Worker
#  6. React Frontend
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} 🐕 AI GUARD DOG - Local Development Launcher${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────
#  Step 0: Check Prerequisites
# ─────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[Step 0/6]${NC} Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}⚠️  WARNING: Docker Desktop is not running!${NC}"
    echo "Please start Docker Desktop and try again."
    exit 1
fi
echo -e "  ${GREEN}✅ Docker is running${NC}"

# Check Node
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Please install Node.js 20.x from: https://nodejs.org/"
    exit 1
fi
echo -e "  ${GREEN}✅ Node.js is installed${NC}"

# ─────────────────────────────────────────────────────────────────
#  Step 1: Start Docker Infrastructure
# ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[Step 1/6]${NC} Starting Docker infrastructure (PostgreSQL + Redis)..."

docker-compose up -d
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start Docker containers${NC}"
    exit 1
fi
echo -e "  ${GREEN}✅ Docker containers started${NC}"

# Wait for PostgreSQL to be ready
echo "  ⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# ─────────────────────────────────────────────────────────────────
#  Step 2: Start Hardhat Node (New Terminal)
# ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[Step 2/6]${NC} Starting Hardhat local blockchain node..."

# Detect OS and open appropriate terminal
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR/ai-guard-dao' && echo 'Starting Hardhat Node...' && npx hardhat node\""
elif command -v gnome-terminal &> /dev/null; then
    # Linux with GNOME
    gnome-terminal --title="🔗 Hardhat Node" -- bash -c "cd '$SCRIPT_DIR/ai-guard-dao' && echo 'Starting Hardhat Node...' && npx hardhat node; exec bash"
elif command -v xterm &> /dev/null; then
    # Fallback to xterm
    xterm -title "🔗 Hardhat Node" -e "cd '$SCRIPT_DIR/ai-guard-dao' && echo 'Starting Hardhat Node...' && npx hardhat node" &
else
    echo -e "${YELLOW}⚠️  Could not open new terminal. Please run in another terminal:${NC}"
    echo "    cd ai-guard-dao && npx hardhat node"
fi

echo -e "  ${GREEN}✅ Hardhat node starting in new terminal${NC}"
echo "  ⏳ Waiting 8 seconds for node to initialize..."
sleep 8

# ─────────────────────────────────────────────────────────────────
#  Step 3: Deploy Contracts & Setup Environment
# ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[Step 3/6]${NC} Deploying contracts and configuring environment..."

# Run the setup script
if npx ts-node scripts/setup-env.ts; then
    echo -e "  ${GREEN}✅ Contracts deployed and .env files updated${NC}"
else
    echo -e "${YELLOW}⚠️  Setup script failed. Trying direct deployment...${NC}"
    cd "$SCRIPT_DIR/ai-guard-dao"
    npx hardhat run scripts/deploy.js --network localhost
    cd "$SCRIPT_DIR"
fi

# ─────────────────────────────────────────────────────────────────
#  Step 4: Start Backend (New Terminal)
# ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[Step 4/6]${NC} Starting NestJS Backend..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR/ai-guard-dog-backend/api-gateway' && echo 'Starting NestJS Backend...' && npm run start:dev\""
elif command -v gnome-terminal &> /dev/null; then
    gnome-terminal --title="🚀 Backend" -- bash -c "cd '$SCRIPT_DIR/ai-guard-dog-backend/api-gateway' && echo 'Starting NestJS Backend...' && npm run start:dev; exec bash"
fi

echo -e "  ${GREEN}✅ Backend starting in new terminal${NC}"
sleep 3

# ─────────────────────────────────────────────────────────────────
#  Step 5: Start Mock AI Worker (New Terminal)
# ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[Step 5/6]${NC} Starting Mock AI Worker..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR/ai-guard-dog-backend/api-gateway' && echo 'Starting Mock AI Worker...' && npm run worker:mock\""
elif command -v gnome-terminal &> /dev/null; then
    gnome-terminal --title="🤖 AI Worker" -- bash -c "cd '$SCRIPT_DIR/ai-guard-dog-backend/api-gateway' && echo 'Starting Mock AI Worker...' && npm run worker:mock; exec bash"
fi

echo -e "  ${GREEN}✅ AI Worker starting in new terminal${NC}"
sleep 2

# ─────────────────────────────────────────────────────────────────
#  Step 6: Start Frontend (New Terminal)
# ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[Step 6/6]${NC} Starting React Frontend..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR/react-app' && echo 'Starting React Frontend...' && npm run dev\""
elif command -v gnome-terminal &> /dev/null; then
    gnome-terminal --title="🎨 Frontend" -- bash -c "cd '$SCRIPT_DIR/react-app' && echo 'Starting React Frontend...' && npm run dev; exec bash"
fi

echo -e "  ${GREEN}✅ Frontend starting in new terminal${NC}"

# ─────────────────────────────────────────────────────────────────
#  Complete!
# ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} 🎉 AI GUARD DOG IS READY!${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  🌐 Access your application:"
echo ""
echo "     Frontend:        http://localhost:5173"
echo "     Backend API:     http://localhost:3001"
echo "     Hardhat RPC:     http://localhost:8545"
echo "     Prisma Studio:   npx prisma studio (in api-gateway)"
echo ""
echo "  📋 Running Services:"
echo ""
echo "     [Terminal 1] Hardhat Node     - Local blockchain"
echo "     [Terminal 2] NestJS Backend   - API Gateway"
echo "     [Terminal 3] AI Worker        - Analysis processor"
echo "     [Terminal 4] Vite Frontend    - React app"
echo ""
echo "  🛑 To stop all services:"
echo "     Close all terminal windows or run: docker-compose down"
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
