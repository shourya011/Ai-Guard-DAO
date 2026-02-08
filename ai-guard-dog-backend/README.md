# AI Guard Dog Backend

**Dual-Backend Architecture for DAO Treasury Protection**

This is the backend infrastructure for the AI Guard Dog Intern system, implementing a **Node.js Orchestrator + Python Intelligence Layer** architecture.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN (Monad)                           │
│                 ProposalCreated Event                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│               NODE.JS ORCHESTRATOR (Port 3001)                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Blockchain      │  │ Event Emitter   │  │ Express API     │  │
│  │ Listener        │──│ analysisTrigger │──│ /api/proposals  │  │
│  └─────────────────┘  └────────┬────────┘  └─────────────────┘  │
└────────────────────────────────┼────────────────────────────────┘
                                 │ HTTP POST /analyze
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              PYTHON INTELLIGENCE LAYER (Port 8000)              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Agent 1:        │  │ Agent 2:        │  │ Agent 3:        │  │
│  │ Reputation      │  │ NLP Analyst     │  │ Mediator        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                            │
│  ┌───────────┐  ┌────────────────────┐  ┌───────────────────┐   │
│  │ Users     │  │ Proposals          │  │ Reasoning_Reports │   │
│  └───────────┘  └────────────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
ai-guard-dog-backend/
├── orchestrator/           # Node.js (TypeScript)
│   ├── src/
│   │   ├── config/         # Environment & DB config
│   │   ├── controllers/    # API logic
│   │   ├── events/         # EventEmitter handlers
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities & mock tools
│   ├── package.json
│   └── tsconfig.json
│
├── intelligence/           # Python (FastAPI)
│   ├── app/
│   │   ├── agents/         # AI agents
│   │   ├── schemas/        # Pydantic models
│   │   └── main.py         # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
│
├── database/
│   └── schema.sql          # PostgreSQL schema
│
└── docker-compose.yml      # Container orchestration
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Manual Setup

#### 1. Database Setup

```bash
# Start PostgreSQL (or use existing)
# Create database
createdb ai_guard_dog

# Run schema
psql -d ai_guard_dog -f database/schema.sql
```

#### 2. Python Intelligence Layer

```bash
cd intelligence

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Node.js Orchestrator

```bash
cd orchestrator

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your database credentials

# Start in development mode
npm run dev
```

## 🧪 Testing the Pipeline

### Method 1: Using the API endpoint

```bash
# Trigger a mock proposal event
curl -X POST http://localhost:3001/api/proposals/mock \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q1 Marketing Budget",
    "description": "This proposal requests 10,000 MON for marketing activities including social media campaigns and community events.",
    "proposalId": 1001,
    "proposer": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b123"
  }'
```

### Method 2: Using the mock script

```bash
cd orchestrator

# Test low-risk proposal (should AUTO_APPROVE)
npm run mock:event lowRisk

# Test medium-risk proposal (should NEEDS_REVIEW)
npm run mock:event mediumRisk

# Test high-risk proposal (should AUTO_REJECT)
npm run mock:event highRisk
```

### Method 3: Test simulation endpoint directly

```bash
# Test the stateless simulation endpoint
curl -X POST http://localhost:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "draft_text": "This proposal requests funding for a new marketing campaign. Budget breakdown: 5000 MON for ads, 3000 MON for events. Timeline: 3 months. Team: Marketing department lead by Alice."
  }'
```

## 📡 API Endpoints

### Node.js Orchestrator (Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/proposals` | GET | List all proposals |
| `/api/proposals/:id` | GET | Get proposal with reasoning |
| `/api/proposals/review-queue` | GET | Get human review queue |
| `/api/proposals/simulate` | POST | Simulate a draft |
| `/api/proposals/mock` | POST | Trigger mock event |

### Python Intelligence (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/analyze` | POST | **Stateful** - Full analysis |
| `/simulate` | POST | **Stateless** - Draft preview |

## ⚙️ Risk Thresholds (Module B Logic)

| Risk Score | Action | Description |
|------------|--------|-------------|
| 0-19 | `AUTO_APPROVED` | Low risk, safe to auto-approve |
| 20-79 | `NEEDS_REVIEW` | Mid-range, requires human review |
| 80-100 | `AUTO_REJECTED` | High risk, auto-reject |

## 🔧 Environment Variables

### Orchestrator (.env)

```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_guard_dog
DB_USER=postgres
DB_PASSWORD=your_password
INTELLIGENCE_API_URL=http://localhost:8000
MONAD_RPC_URL=http://127.0.0.1:8545
```

## 📝 Event Flow

1. **Blockchain Listener** detects `ProposalCreated` event
2. Fetches IPFS content (proposal details)
3. Inserts into `proposals` table with `PENDING_ANALYSIS` status
4. **Emits** `new_proposal` event (does NOT call Python directly)
5. **Analysis Trigger** listens for event
6. Calls Python `/analyze` endpoint
7. Receives analysis results
8. Stores in `reasoning_reports` table
9. Updates proposal status based on risk score
10. Broadcasts update via WebSocket (mock for now)

## 🛠️ Phase 2 TODO

- [ ] Real blockchain integration with Monad
- [ ] Implement actual AI models (transformers, LLMs)
- [ ] WebSocket real-time updates
- [ ] IPFS content fetching
- [ ] On-chain vote execution via VotingAgent.sol
- [ ] Authentication & authorization
