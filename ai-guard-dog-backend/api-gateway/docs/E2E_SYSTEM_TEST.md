# E2E System Integration Test

This document explains how to run the end-to-end system integration test that verifies the complete flow from delegation to voting.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI Guard DAO - Event Flow                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌──────────────┐     ┌────────────────┐               │
│  │ Blockchain  │────>│ Blockchain   │────>│ Analysis       │               │
│  │ Events      │     │ Service      │     │ Producer       │               │
│  └─────────────┘     └──────────────┘     └───────┬────────┘               │
│                                                   │                         │
│                            BullMQ Queue           │                         │
│                      ┌────────────────────────────┼───────┐                │
│                      │                            ▼       │                │
│                      │    ┌──────────────────────────┐    │                │
│                      │    │     Mock AI Worker       │    │                │
│                      │    │ (scripts/mock-ai-worker) │    │                │
│                      │    └───────────┬──────────────┘    │                │
│                      │                │                   │                │
│                      └────────────────┼───────────────────┘                │
│                                       │                                     │
│                         Redis Pub/Sub │ (analysis:events:*)                │
│                                       ▼                                     │
│                      ┌────────────────────────────────────┐                │
│                      │   AnalysisResultListener           │                │
│                      │   (Circuit Closer)                 │                │
│                      └───────────┬────────────────────────┘                │
│                                  │                                          │
│                                  ▼                                          │
│                      ┌────────────────────────────────────┐                │
│                      │      VotingService                 │                │
│                      │ - Fetch ACTIVE delegations         │                │
│                      │ - Filter by risk threshold         │                │
│                      │ - Cast votes via VotingAgent       │                │
│                      │ - Record in AuditLog               │                │
│                      └────────────────────────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **PostgreSQL** running with `DATABASE_URL` configured in `.env`
2. **Redis** running with `REDIS_HOST` and `REDIS_PORT` configured
3. **Prisma** migrations applied: `npx prisma migrate deploy`

## Running the E2E Test

### Option 1: With External Mock Worker (Two Terminals)

This is the recommended approach for development - it lets you see both processes.

**Terminal 1 - Start the Mock AI Worker:**
```bash
cd ai-guard-dog-backend/api-gateway
npm run worker:mock
```

You should see:
```
🤖 Mock AI Worker starting...
   Redis: localhost:6379
   Queues: analysis-high-priority, analysis-normal
✅ Workers started. Listening for jobs...
```

**Terminal 2 - Run the E2E Test:**
```bash
cd ai-guard-dog-backend/api-gateway
npm run test:system
```

### Option 2: Standalone with Simulated Worker (Single Terminal)

For CI/CD or quick testing, the script can simulate the worker internally:

```bash
cd ai-guard-dog-backend/api-gateway
npm run test:system:standalone
```

This uses the `--simulate-worker` flag to publish mock analysis events directly.

## What the Test Does

1. **Setup**: Cleans up any previous test data from the database
2. **Act 1 - Delegation**: Creates a test user delegation (risk threshold: 50)
3. **Act 2 - Proposal**: Creates a test proposal in the database
4. **Act 3 - Analysis**: Queues the proposal for AI analysis
5. **Wait**: Polls Redis for analysis completion (or simulates it)
6. **Assert**: Verifies:
   - Proposal has a risk score assigned
   - Proposal status was updated (AUTO_APPROVED, AUTO_REJECTED, or NEEDS_REVIEW)
   - Vote was recorded in AuditLog for the test user

## Expected Output

```
╔══════════════════════════════════════════════════════════════╗
║   AI Guard DAO - End-to-End System Integration Test          ║
╚══════════════════════════════════════════════════════════════╝

ℹ️  Running with simulated worker (--simulate-worker flag detected)

📦 Step 0: Bootstrapping NestJS application...
   ✅ Application bootstrapped

🧹 Cleaning up test data...
   ✅ Test data cleaned

📝 Step 1: Creating test delegation...
   User: 0x1234567890123456789012345678901234567890
   DAO: 0xDAOGovernor0000000000000000000000000001
   Risk Threshold: 50
   ✅ Delegation created: <uuid>

📝 Step 2: Creating test proposal...
   ID: 42
   Title: Test Proposal for E2E System Test
   ✅ Proposal created: <uuid>

📝 Step 3: Queueing analysis job...
   ✅ Job queued: <job-id>

⏳ Step 4: Waiting for analysis to complete...
🤖 Simulating AI Worker...
   Status: processing
   Status: complete
   ✅ Published complete event: Score=35, Rec=APPROVE
   ✅ Analysis complete in 3.52s

⏳ Step 5: Waiting for voting execution...

🔍 Step 6: Verifying results...

   📋 Audit Log Results:
      Total vote entries: 1
      - Delegator: 0x1234567890123456789012345678901234567890
        Vote: FOR
        Risk Score: 35
        Success: true

   📋 Proposal Status:
      Status: AUTO_APPROVED
      Risk Score: 35
      Risk Level: MEDIUM

📊 Assertions:

   ✅ PASS: Proposal has risk score assigned
   ✅ PASS: Proposal status updated to AUTO_APPROVED
   ✅ PASS: Vote recorded for test user (FOR)
   ✅ PASS: Vote direction correct (FOR for low risk)

╔══════════════════════════════════════════════════════════════╗
║                      TEST RESULTS                             ║
╠══════════════════════════════════════════════════════════════╣
║   Passed: 4                                                   ║
║   Failed: 0                                                   ║
║   Duration: 8.52s                                             ║
╚══════════════════════════════════════════════════════════════╝
```

## Troubleshooting

### "Analysis timeout - worker may not be running"

Make sure the mock worker is running in another terminal:
```bash
npm run worker:mock
```

Or use the standalone mode:
```bash
npm run test:system:standalone
```

### "Vote not recorded"

This is expected if:
- `VOTING_AGENT_ADDRESS` is not configured (contract not deployed)
- `BACKEND_PRIVATE_KEY` is not configured

The test will show a warning but won't fail - the voting contract interaction is optional.

### Database Connection Issues

Ensure your `.env` file has the correct `DATABASE_URL`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/ai_guard_dao?schema=public"
```

### Redis Connection Issues

Ensure Redis is running and accessible:
```
REDIS_HOST=localhost
REDIS_PORT=6379
```

## NPM Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `worker:mock` | `ts-node scripts/mock-ai-worker.ts` | Start the mock AI worker |
| `test:system` | `ts-node scripts/e2e-system.ts` | Run E2E test (requires external worker) |
| `test:system:standalone` | `ts-node scripts/e2e-system.ts --simulate-worker` | Run E2E test with simulated worker |
