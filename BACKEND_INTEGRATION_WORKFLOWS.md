# AI Guard DAO - Backend Integration Workflows

> **For Backend & DevOps Teams**: Complete visual guide to system architecture, data flows, and integration points.

---

## Table of Contents

1. [Complete System Architecture](#1-complete-system-architecture)
2. [SIWE Authentication Flow](#2-siwe-authentication-flow)
3. [Analysis Pipeline Flow](#3-analysis-pipeline-flow)
4. [Agent Orchestration](#4-agent-orchestration)
5. [Job Queue Processing](#5-job-queue-processing)
6. [Cache Strategy](#6-cache-strategy)
7. [Error Handling Flow](#7-error-handling-flow)
8. [Rate Limiting Flow](#8-rate-limiting-flow)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Data Flow Diagram](#10-data-flow-diagram)

---

## 1. Complete System Architecture

```mermaid
flowchart TB
    subgraph External["🌐 External Clients"]
        FE["Next.js Frontend<br/>Port: 3000"]
        MobileApp["Mobile App<br/>(Future)"]
        CLI["CLI Tool<br/>(Admin)"]
    end
    
    subgraph LoadBalancer["⚖️ Load Balancer / API Gateway"]
        Kong["Kong Gateway<br/>- TLS Termination<br/>- Rate Limiting<br/>- CORS<br/>- Request Logging"]
    end
    
    subgraph NestJS["🟢 API Gateway Service (NestJS)<br/>Port: 3001"]
        direction TB
        
        Controllers["Controllers Layer<br/>───────────────<br/>• AuthController<br/>• ScanController<br/>• ProposalsController<br/>• WebhooksController"]
        
        Guards["Guards & Interceptors<br/>───────────────<br/>• WalletAuthGuard<br/>• TokenGateGuard<br/>• RateLimitGuard<br/>• CacheInterceptor<br/>• LoggingInterceptor"]
        
        Services["Business Logic<br/>───────────────<br/>• AuthService<br/>• ScanService<br/>• QueueService<br/>• RedisService<br/>• BlockchainService"]
        
        Controllers --> Guards
        Guards --> Services
    end
    
    subgraph Queue["📨 Message Queue"]
        BullMQ["BullMQ<br/>───────────────<br/>Queues:<br/>• analysis-high-priority<br/>• analysis-normal<br/>• analysis-low<br/>• webhook-callbacks"]
    end
    
    subgraph Python["🐍 Intelligence Engine (FastAPI)<br/>Port: 8000"]
        direction TB
        
        FastAPI["FastAPI Server<br/>───────────────<br/>• /analyze<br/>• /health<br/>• /internal/*"]
        
        Workers["Celery Workers<br/>───────────────<br/>• Analysis Worker<br/>• Reputation Worker<br/>• NLP Worker"]
        
        Agents["AI Agents<br/>───────────────<br/>• ReputationSentinel<br/>• NLPAnalyst<br/>• Mediator"]
        
        FastAPI --> Workers
        Workers --> Agents
    end
    
    subgraph AI["🤖 AI Services"]
        Groq["Groq API<br/>───────────────<br/>Llama 4 Scout 17B<br/>Low-latency inference"]
        
        Local["Local LLM<br/>(Fallback)<br/>───────────────<br/>Ollama/vLLM"]
    end
    
    subgraph Cache["💾 Cache Layer"]
        Redis["Redis Cluster<br/>───────────────<br/>• Session Store<br/>• Rate Limit Counters<br/>• Analysis Cache<br/>• Job Queue<br/>• Pub/Sub"]
    end
    
    subgraph Database["🗄️ Persistent Storage"]
        Postgres["PostgreSQL 16<br/>───────────────<br/>Tables:<br/>• sessions<br/>• analyses<br/>• proposals<br/>• wallets<br/>• audit_logs"]
        
        Vector["pgvector Extension<br/>───────────────<br/>• Proposal Embeddings<br/>• Similarity Search"]
        
        Postgres -.-> Vector
    end
    
    subgraph Blockchain["⛓️ Blockchain Layer"]
        RPC["RPC Nodes<br/>───────────────<br/>• Alchemy<br/>• Infura<br/>• QuickNode"]
        
        Contracts["Smart Contracts<br/>───────────────<br/>• DAOCore<br/>• ProposalManager<br/>• VotingEngine<br/>• AIRegistry"]
        
        RPC --> Contracts
    end
    
    subgraph Monitoring["📊 Observability"]
        Logs["Logging<br/>───────────────<br/>• Pino (Node.js)<br/>• Loguru (Python)<br/>→ Grafana Loki"]
        
        Metrics["Metrics<br/>───────────────<br/>• Prometheus<br/>• Custom Metrics<br/>→ Grafana"]
        
        Tracing["Distributed Tracing<br/>───────────────<br/>• OpenTelemetry<br/>→ Jaeger/Tempo"]
    end
    
    %% External to Load Balancer
    FE --> Kong
    MobileApp --> Kong
    CLI --> Kong
    
    %% Load Balancer to Services
    Kong --> Controllers
    
    %% NestJS Internal Flow
    Services --> Queue
    Services --> Cache
    Services --> Database
    Services --> Blockchain
    
    %% Queue to Python
    Queue --> Workers
    
    %% Python to External Services
    Agents --> Groq
    Agents -.->|Fallback| Local
    Agents --> Database
    Workers --> Cache
    
    %% Python to Blockchain
    Agents --> RPC
    
    %% Webhooks back to NestJS
    Workers -.->|Webhook| Controllers
    
    %% Monitoring connections
    NestJS -.->|Logs| Logs
    Python -.->|Logs| Logs
    NestJS -.->|Metrics| Metrics
    Python -.->|Metrics| Metrics
    NestJS -.->|Traces| Tracing
    Python -.->|Traces| Tracing
    
    classDef external fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    classDef nestjs fill:#c8e6c9,stroke:#2e7d32,stroke-width:3px
    classDef python fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px
    classDef storage fill:#ffe0b2,stroke:#e64a19,stroke-width:2px
    classDef blockchain fill:#b2dfdb,stroke:#00695c,stroke-width:2px
    classDef monitoring fill:#cfd8dc,stroke:#455a64,stroke-width:2px
    
    class External external
    class LoadBalancer gateway
    class NestJS,Controllers,Guards,Services nestjs
    class Python,FastAPI,Workers,Agents python
    class Cache,Database,Postgres,Vector,Queue storage
    class Blockchain,RPC,Contracts blockchain
    class Monitoring,Logs,Metrics,Tracing monitoring
```

---

## 2. SIWE Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    participant User as 👤 User (Wallet)
    participant FE as Frontend (Next.js)
    participant Kong as Kong Gateway
    participant Auth as AuthController
    participant Guard as WalletAuthGuard
    participant Redis as Redis Cache
    participant Chain as Blockchain RPC
    
    Note over User,Chain: Phase 1: Request Nonce
    
    User->>FE: Click "Connect Wallet"
    FE->>FE: Connect via RainbowKit
    FE->>Kong: POST /auth/nonce<br/>{address: "0x742d..."}
    Kong->>Auth: Forward request
    
    Auth->>Auth: Generate random nonce<br/>crypto.randomBytes(16)
    Auth->>Redis: SETEX nonce:0x742d 300 "8a3f2b1c"
    Redis-->>Auth: OK
    
    Auth-->>Kong: {nonce, issuedAt, expiresAt}
    Kong-->>FE: 200 OK
    
    Note over User,Chain: Phase 2: Sign Message
    
    FE->>FE: Construct SIWE message<br/>using @siwe/siwe
    FE->>User: Request signature
    User->>User: Sign with wallet
    User-->>FE: signature
    
    Note over User,Chain: Phase 3: Verify Signature
    
    FE->>Kong: POST /auth/verify<br/>{message, signature}
    Kong->>Auth: Forward request
    
    Auth->>Auth: Parse SIWE message
    Auth->>Redis: GET nonce:0x742d
    
    alt Nonce not found or expired
        Redis-->>Auth: null
        Auth-->>FE: 401 Nonce expired
    end
    
    Redis-->>Auth: "8a3f2b1c"
    
    Auth->>Auth: Verify signature<br/>siwe.verify(message, signature)
    
    alt Invalid signature
        Auth-->>FE: 401 Invalid signature
    end
    
    Auth->>Redis: DEL nonce:0x742d
    Auth->>Auth: Generate session token<br/>JWT or random UUID
    
    Note over User,Chain: Phase 4: Create Session
    
    Auth->>Chain: Optional: isMember(0x742d)
    Chain-->>Auth: true
    
    Auth->>Chain: Optional: balanceOf(0x742d)
    Chain-->>Auth: 250000000000000000000 (250 tokens)
    
    Auth->>Redis: SETEX session:{token} 86400<br/>{address, chainId, isMember, balance}
    Redis-->>Auth: OK
    
    Auth-->>Kong: {sessionToken, expiresAt, address}
    Kong-->>FE: 200 OK
    FE->>FE: Store token in httpOnly cookie
    
    Note over User,Chain: Phase 5: Subsequent Requests
    
    User->>FE: Make authenticated request
    FE->>Kong: POST /api/v1/scan<br/>Cookie: session=token
    Kong->>Guard: Check authentication
    
    Guard->>Redis: GET session:{token}
    
    alt Session not found
        Redis-->>Guard: null
        Guard-->>FE: 401 Session expired
    end
    
    Redis-->>Guard: {address, chainId, ...}
    Guard->>Guard: Attach wallet to request
    Guard-->>Kong: Authorized
    Kong->>Auth: Process request
```

---

## 3. Analysis Pipeline Flow

```mermaid
flowchart TD
    Start([API Request]) --> Validate{Zod Schema<br/>Validation}
    
    Validate -->|Invalid| ValidationError[400 Bad Request<br/>Return field errors]
    ValidationError --> End1([End])
    
    Validate -->|Valid| Auth{SIWE Session<br/>Valid?}
    
    Auth -->|No| AuthError[401 Unauthorized<br/>Return auth error]
    AuthError --> End2([End])
    
    Auth -->|Yes| TokenGate{Token Balance<br/>≥ 100 GUARD?}
    
    TokenGate -->|No| GateError[403 Forbidden<br/>Insufficient balance]
    GateError --> End3([End])
    
    TokenGate -->|Yes| RateCheck{Rate Limit<br/>OK?}
    
    RateCheck -->|Exceeded| RateError[429 Too Many Requests<br/>Return reset time]
    RateError --> End4([End])
    
    RateCheck -->|OK| HashGen[Generate Cache Key<br/>SHA256 hash of proposal]
    
    HashGen --> CacheCheck{Redis<br/>Cache Hit?}
    
    CacheCheck -->|Hit| CachedResult[Return Cached Analysis<br/>{cached: true, ttl}]
    CachedResult --> End5([End])
    
    CacheCheck -->|Miss| AcquireLock{Redis SETNX<br/>Lock Acquired?}
    
    AcquireLock -->|No| WaitLock[Wait 100ms<br/>Retry]
    WaitLock --> CacheCheck
    
    AcquireLock -->|Yes| CreateJob[Create BullMQ Job<br/>Generate jobId]
    
    CreateJob --> DeterminePriority{Determine<br/>Priority}
    
    DeterminePriority -->|High| HighQueue[Add to<br/>analysis-high-priority]
    DeterminePriority -->|Normal| NormalQueue[Add to<br/>analysis-normal]
    DeterminePriority -->|Low| LowQueue[Add to<br/>analysis-low]
    
    HighQueue --> JobQueued
    NormalQueue --> JobQueued
    LowQueue --> JobQueued
    
    JobQueued[Job Queued<br/>Store in Redis] --> SaveMetadata[Save job metadata<br/>to PostgreSQL]
    
    SaveMetadata --> ResponseMode{Response<br/>Mode?}
    
    ResponseMode -->|Synchronous| WaitResult[Wait for job completion<br/>Timeout: 30s]
    ResponseMode -->|Async| AsyncResponse[Return immediately<br/>{jobId, status: queued}]
    
    AsyncResponse --> End6([End])
    
    WaitResult --> PollStatus{Job<br/>Complete?}
    
    PollStatus -->|Timeout| TimeoutError[504 Gateway Timeout<br/>Return jobId for polling]
    TimeoutError --> End7([End])
    
    PollStatus -->|Complete| CheckStatus{Job<br/>Status?}
    
    CheckStatus -->|Failed| JobError[500 Internal Error<br/>Return error details]
    JobError --> End8([End])
    
    CheckStatus -->|Success| GetResult[Fetch result from Redis]
    
    GetResult --> CacheResult[Cache result<br/>TTL: 3600s]
    
    CacheResult --> ReleaseLock[Release lock<br/>DEL lock:hash]
    
    ReleaseLock --> IncrementMetrics[Increment metrics<br/>- Total scans<br/>- User scans<br/>- Success rate]
    
    IncrementMetrics --> ReturnResult[Return Analysis Result<br/>{jobId, result, cached: false}]
    
    ReturnResult --> End9([End])
    
    style Start fill:#e3f2fd,stroke:#1976d2
    style ValidationError fill:#ffcdd2,stroke:#c62828
    style AuthError fill:#ffcdd2,stroke:#c62828
    style GateError fill:#ffcdd2,stroke:#c62828
    style RateError fill:#fff9c4,stroke:#f57f17
    style CachedResult fill:#c8e6c9,stroke:#2e7d32
    style ReturnResult fill:#c8e6c9,stroke:#2e7d32
```

---

## 4. Agent Orchestration

```mermaid
flowchart TB
    subgraph Input["📥 Input Data"]
        JobData["BullMQ Job<br/>───────────────<br/>• jobId<br/>• proposalText<br/>• walletAddress<br/>• metadata<br/>• priority"]
    end
    
    subgraph Preprocessing["🔧 Preprocessing"]
        TextNorm["Text Normalization<br/>───────────────<br/>• Remove extra whitespace<br/>• Lowercase<br/>• Strip markdown<br/>• Truncate to 10k chars"]
        
        WalletFetch["Wallet Data Fetch<br/>───────────────<br/>• Transaction history<br/>• Token balances<br/>• ENS name<br/>• First seen date"]
    end
    
    subgraph Agent1["🛡️ Agent 1: Reputation Sentinel"]
        A1Input["Input:<br/>walletAddress"]
        
        A1Logic["Deterministic Scoring<br/>───────────────<br/>wallet_age_score = min(days/365 * 100, 50)<br/>tx_count_score = min(count/100 * 30, 30)<br/>governance_score = participation * 20<br/>───────────────<br/>TOTAL: 0-100"]
        
        A1Flags["Flag Checks<br/>───────────────<br/>• New wallet (< 30 days)<br/>• Low activity (< 10 txs)<br/>• No governance history<br/>• Known scammer list"]
        
        A1Output["Output:<br/>───────────────<br/>{<br/>  score: 0-100,<br/>  flags: string[],<br/>  reasoning: string,<br/>  metadata: {...}<br/>}"]
        
        A1Input --> A1Logic
        A1Logic --> A1Flags
        A1Flags --> A1Output
    end
    
    subgraph Agent2["📝 Agent 2: NLP Analyst"]
        A2Input["Input:<br/>proposalText"]
        
        A2Prompt["Construct Prompt<br/>───────────────<br/>• System prompt template<br/>• Few-shot examples<br/>• Proposal text<br/>• JSON schema"]
        
        A2LLM["LLM Inference<br/>───────────────<br/>Groq API Call<br/>Model: llama-4-scout-17b<br/>Temp: 0.3<br/>Max tokens: 2048"]
        
        A2Parse["Parse Response<br/>───────────────<br/>• Validate JSON<br/>• Extract risk_score<br/>• Extract red_flags<br/>• Fallback on error"]
        
        A2Fallback["Fallback Logic<br/>───────────────<br/>If LLM fails:<br/>• Regex pattern matching<br/>• Keyword detection<br/>• Conservative score: 50"]
        
        A2Output["Output:<br/>───────────────<br/>{<br/>  score: 0-100,<br/>  red_flags: string[],<br/>  tactics: string[],<br/>  confidence: 0-1,<br/>  reasoning: string<br/>}"]
        
        A2Input --> A2Prompt
        A2Prompt --> A2LLM
        A2LLM --> A2Parse
        A2Parse -->|Success| A2Output
        A2Parse -->|Error| A2Fallback
        A2Fallback --> A2Output
    end
    
    subgraph Agent3["⚖️ Agent 3: Mediator"]
        A3Input["Input:<br/>─────────────��─<br/>• Agent 1 result<br/>• Agent 2 result<br/>• Original metadata"]
        
        A3Weights["Weighted Ensemble<br/>───────────────<br/>IF reputation_score < 30:<br/>  weight_reputation = 0.6<br/>  weight_nlp = 0.4<br/>ELSE:<br/>  weight_reputation = 0.3<br/>  weight_nlp = 0.7"]
        
        A3Compute["Compute Final Score<br/>───────────────<br/>base_score = <br/>  (rep_score * w_rep) +<br/>  (nlp_score * w_nlp)<br/><br/>Apply modifiers:<br/>• New wallet: +15<br/>• Urgency detected: +20<br/>• Large amount: +10"]
        
        A3Threshold["Risk Level Threshold<br/>───────────────<br/>0-20: LOW → APPROVE<br/>21-40: MEDIUM → APPROVE<br/>41-60: HIGH → REVIEW<br/>61-80: CRITICAL → REVIEW<br/>81-100: SEVERE → REJECT"]
        
        A3Output["Output:<br/>───────────────<br/>{<br/>  composite_score: 0-100,<br/>  risk_level: enum,<br/>  recommendation: enum,<br/>  reasoning: string,<br/>  confidence: 0-1<br/>}"]
        
        A3Input --> A3Weights
        A3Weights --> A3Compute
        A3Compute --> A3Threshold
        A3Threshold --> A3Output
    end
    
    subgraph Postprocessing["🔚 Postprocessing"]
        Snapshot["Generate Snapshot<br/>───────────────<br/>• Executive summary<br/>• Deliverables list<br/>• Budget breakdown<br/>• Timeline extraction"]
        
        Store["Store Results<br/>───────────────<br/>• Redis cache (1hr TTL)<br/>• PostgreSQL (permanent)<br/>• Update job status"]
        
        Callback["Webhook Callback<br/>───────────────<br/>POST to callback_url<br/>or<br/>Update job in queue"]
    end
    
    subgraph Output["📤 Output"]
        Result["Analysis Result<br/>───────────────<br/>{<br/>  jobId,<br/>  status: 'complete',<br/>  agents: {...},<br/>  composite_score,<br/>  risk_level,<br/>  recommendation,<br/>  snapshot,<br/>  processing_time_ms<br/>}"]
    end
    
    JobData --> TextNorm
    JobData --> WalletFetch
    
    TextNorm --> A2Input
    WalletFetch --> A1Input
    
    A1Output --> A3Input
    A2Output --> A3Input
    
    A3Output --> Snapshot
    Snapshot --> Store
    Store --> Callback
    
    Callback --> Result
    
    style Agent1 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style Agent2 fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style Agent3 fill:#fff3e0,stroke:#f57c00,stroke-width:2px
```

---

## 5. Job Queue Processing

```mermaid
stateDiagram-v2
    [*] --> Queued: Job created
    
    Queued --> Waiting: In queue
    Waiting --> Processing: Worker picks up job
    
    Processing --> Agent1Running: Start reputation check
    Agent1Running --> Agent1Complete: Reputation scored
    Agent1Running --> Agent1Failed: RPC error / timeout
    
    Agent1Complete --> Agent2Running: Start NLP analysis
    Agent2Running --> Agent2LLMCall: Call Groq API
    Agent2LLMCall --> Agent2Complete: LLM response received
    Agent2LLMCall --> Agent2Retry: Rate limit / timeout
    
    Agent2Retry --> Agent2LLMCall: Retry with backoff
    Agent2Retry --> Agent2Fallback: Max retries exceeded
    Agent2Fallback --> Agent2Complete: Use fallback logic
    
    Agent1Failed --> Failed: Critical error
    
    Agent2Complete --> Agent3Running: Start mediator
    Agent3Running --> Agent3Complete: Final score computed
    
    Agent3Complete --> Snapshot: Generate snapshot
    Snapshot --> Storing: Store results
    Storing --> Webhooks: Trigger webhooks
    
    Webhooks --> Complete: Success
    Webhooks --> PartialFailure: Webhook failed
    
    PartialFailure --> Complete: Job still marked complete
    
    Processing --> Stalled: Worker died
    Stalled --> Retry1: Attempt 1
    Retry1 --> Processing: Requeue
    Retry1 --> Retry2: Failed again
    Retry2 --> Processing: Requeue
    Retry2 --> Retry3: Failed again
    Retry3 --> Processing: Requeue
    Retry3 --> Failed: Max retries (3)
    
    Complete --> [*]
    Failed --> [*]
    
    note right of Queued
        TTL: 1 hour
        After TTL: Auto-fail
    end note
    
    note right of Processing
        Timeout: 30 seconds
        After timeout: Mark as stalled
    end note
    
    note right of Agent2Retry
        Exponential backoff:
        1s, 2s, 4s, 8s, 16s
        Max retries: 5
    end note
    
    note right of Complete
        Result cached for 1 hour
        Permanent storage in PostgreSQL
    end note
```

---

## 6. Cache Strategy

```mermaid
flowchart TD
    subgraph Request["Incoming Request"]
        REQ["POST /api/v1/scan<br/>{proposal data}"]
    end
    
    subgraph KeyGen["Cache Key Generation"]
        Normalize["Normalize Proposal Text<br/>───────────────<br/>• Lowercase<br/>• Remove whitespace<br/>• Sort JSON keys"]
        
        Hash["Generate Hash<br/>───────────────<br/>SHA256(<br/>  model_version +<br/>  wallet_address +<br/>  normalized_text<br/>)"]
        
        CacheKey["Cache Key<br/>───────────────<br/>analysis:a3f2b8c9..."]
        
        Normalize --> Hash
        Hash --> CacheKey
    end
    
    subgraph CacheLookup["Cache Lookup"]
        RedisGet["Redis GET<br/>analysis:a3f2b8c9..."]
        
        CheckResult{Result<br/>Found?}
        
        CheckTTL{TTL > 0?}
        
        RedisGet --> CheckResult
        CheckResult -->|Yes| CheckTTL
    end
    
    subgraph CacheHit["Cache Hit Path"]
        ValidCache["Valid Cache Entry<br/>───────────────<br/>• Deserialize JSON<br/>• Add metadata:<br/>  cached: true<br/>  ttl: remaining"]
        
        UpdateMetrics["Update Metrics<br/>───────────────<br/>cache_hit_total++<br/>cache_hit_rate"]
        
        ReturnCached["Return Result<br/>Status: 200 OK<br/>Response time: < 50ms"]
        
        CheckTTL -->|Yes| ValidCache
        ValidCache --> UpdateMetrics
        UpdateMetrics --> ReturnCached
    end
    
    subgraph CacheMiss["Cache Miss Path"]
        AcquireLock["Try Acquire Lock<br/>───────────────<br/>Redis SETNX<br/>lock:a3f2b8c9 1<br/>EX 30"]
        
        LockResult{Lock<br/>Acquired?}
        
        CheckResult -->|No| AcquireLock
        CheckTTL -->|No| AcquireLock
        
        AcquireLock --> LockResult
    end
    
    subgraph LockWait["Lock Wait (Thundering Herd Prevention)"]
        Wait["Wait 100ms"]
        
        RetryLookup["Retry Cache Lookup<br/>───────────────<br/>Another process may<br/>have completed analysis"]
        
        MaxRetries{Retried<br/>10 times?}
        
        LockResult -->|No| Wait
        Wait --> RetryLookup
        RetryLookup --> MaxRetries
        MaxRetries -->|No| RedisGet
        MaxRetries -->|Yes| ProcessAnyway["Process Anyway<br/>Potential duplicate work"]
    end
    
    subgraph Process["Analysis Processing"]
        QueueJob["Queue Analysis Job<br/>───────────────<br/>Create BullMQ job<br/>Priority based on tier"]
        
        WaitCompletion["Wait for Completion<br/>───────────────<br/>Poll job status<br/>Timeout: 30s"]
        
        GetResult["Get Result from Redis<br/>───────────────<br/>job:result:jobId"]
        
        LockResult -->|Yes| QueueJob
        ProcessAnyway --> QueueJob
        QueueJob --> WaitCompletion
        WaitCompletion --> GetResult
    end
    
    subgraph CacheStore["Cache Storage"]
        StoreResult["Store Result<br/>───────────────<br/>Redis SETEX<br/>analysis:a3f2b8c9<br/>JSON.stringify(result)<br/>EX 3600"]
        
        ReleaseLock["Release Lock<br/>───────────────<br/>Redis DEL<br/>lock:a3f2b8c9"]
        
        UpdateCacheMetrics["Update Metrics<br/>───────────────<br/>cache_miss_total++<br/>cache_store_total++"]
        
        GetResult --> StoreResult
        StoreResult --> ReleaseLock
        ReleaseLock --> UpdateCacheMetrics
    end
    
    subgraph Response["Response"]
        ReturnFresh["Return Result<br/>Status: 200 OK<br/>cached: false<br/>Response time: 3-30s"]
        
        UpdateCacheMetrics --> ReturnFresh
    end
    
    REQ --> Normalize
    
    CacheKey --> RedisGet
    
    style CacheHit fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style CacheMiss fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style LockWait fill:#ffecb3,stroke:#ff6f00,stroke-width:2px
    style Process fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
```

### Cache Invalidation Strategy

```mermaid
flowchart LR
    subgraph Triggers["Invalidation Triggers"]
        T1["Proposal Edited"]
        T2["Wallet Activity Changed"]
        T3["Model Updated"]
        T4["Manual Invalidation"]
    end
    
    subgraph Strategies["Invalidation Strategies"]
        S1["Time-Based (TTL)<br/>───────────────<br/>Default: 1 hour<br/>Wallet reputation: 15 min"]
        
        S2["Event-Based<br/>───────────────<br/>Listen to blockchain events<br/>Invalidate affected caches"]
        
        S3["Pattern-Based<br/>───────────────<br/>Redis SCAN + DEL<br/>analysis:*<br/>wallet:*"]
        
        S4["Selective Invalidation<br/>───────────────<br/>Invalidate specific keys<br/>Keep related data"]
    end
    
    subgraph Actions["Invalidation Actions"]
        A1["DELETE from Redis"]
        A2["Mark as stale"]
        A3["Background refresh"]
        A4["Audit log entry"]
    end
    
    T1 --> S4 --> A1
    T2 --> S2 --> A2 --> A3
    T3 --> S3 --> A1 --> A4
    T4 --> S3 --> A1
```

---

## 7. Error Handling Flow

```mermaid
flowchart TD
    Start([Request Received]) --> TryBlock[Try Execute]
    
    TryBlock --> Success{Success?}
    
    Success -->|Yes| SuccessPath[Return 200/201]
    SuccessPath --> LogSuccess[Log Success<br/>level: info]
    LogSuccess --> End1([End])
    
    Success -->|No| CatchError[Catch Error]
    
    CatchError --> ClassifyError{Error Type?}
    
    %% Validation Errors
    ClassifyError -->|ZodError| ValidationHandler[Validation Error Handler]
    ValidationHandler --> ParseZodErrors[Parse Zod Error Issues<br/>Extract field paths]
    ParseZodErrors --> FormatValidation["Format Response<br/>{<br/>  code: 'VALIDATION_ERROR',<br/>  message: 'Invalid input',<br/>  errors: [{<br/>    field: 'title',<br/>    message: 'Too short'<br/>  }]<br/>}"]
    FormatValidation --> Return400[Return 400]
    Return400 --> LogValidation[Log Validation<br/>level: warn]
    LogValidation --> End2([End])
    
    %% Authentication Errors
    ClassifyError -->|UnauthorizedException| AuthHandler[Auth Error Handler]
    AuthHandler --> CheckAuthType{Auth Error<br/>Type?}
    CheckAuthType -->|Missing Token| FormatMissingToken["Format Response<br/>{<br/>  code: 'MISSING_TOKEN',<br/>  message: 'No auth header'<br/>}"]
    CheckAuthType -->|Invalid Token| FormatInvalidToken["Format Response<br/>{<br/>  code: 'INVALID_TOKEN',<br/>  message: 'Session expired'<br/>}"]
    CheckAuthType -->|Signature Invalid| FormatSigInvalid["Format Response<br/>{<br/>  code: 'INVALID_SIGNATURE',<br/>  message: 'SIWE verification failed'<br/>}"]
    FormatMissingToken --> Return401[Return 401]
    FormatInvalidToken --> Return401
    FormatSigInvalid --> Return401
    Return401 --> LogAuth[Log Auth Error<br/>level: warn]
    LogAuth --> End3([End])
    
    %% Authorization Errors
    ClassifyError -->|ForbiddenException| ForbiddenHandler[Forbidden Error Handler]
    ForbiddenHandler --> CheckForbiddenType{Forbidden<br/>Type?}
    CheckForbiddenType -->|Insufficient Balance| FormatBalance["Format Response<br/>{<br/>  code: 'INSUFFICIENT_BALANCE',<br/>  required: '100',<br/>  current: '50'<br/>}"]
    CheckForbiddenType -->|Not Member| FormatMember["Format Response<br/>{<br/>  code: 'NOT_MEMBER',<br/>  message: 'DAO membership required'<br/>}"]
    FormatBalance --> Return403[Return 403]
    FormatMember --> Return403
    Return403 --> LogForbidden[Log Forbidden<br/>level: warn]
    LogForbidden --> End4([End])
    
    %% Rate Limit Errors
    ClassifyError -->|ThrottlerException| RateLimitHandler[Rate Limit Handler]
    RateLimitHandler --> FormatRateLimit["Format Response<br/>{<br/>  code: 'RATE_LIMIT_EXCEEDED',<br/>  limit: 100,<br/>  remaining: 0,<br/>  resetAt: '2026-01-26T00:00:00Z'<br/>}"]
    FormatRateLimit --> Return429[Return 429<br/>Retry-After header]
    Return429 --> LogRateLimit[Log Rate Limit<br/>level: warn]
    LogRateLimit --> End5([End])
    
    %% External Service Errors
    ClassifyError -->|AxiosError / FetchError| ExternalHandler[External Service Error]
    ExternalHandler --> CheckExternalType{External<br/>Service?}
    CheckExternalType -->|Groq API| HandleGroq[Groq API Error]
    CheckExternalType -->|RPC Node| HandleRPC[RPC Error]
    CheckExternalType -->|Redis| HandleRedis[Redis Error]
    
    HandleGroq --> CheckGroqStatus{Status<br/>Code?}
    CheckGroqStatus -->|429| GroqRateLimit[Groq Rate Limit<br/>Use fallback LLM]
    CheckGroqStatus -->|500| GroqServerError[Groq Server Error<br/>Retry with backoff]
    CheckGroqStatus -->|Other| GroqUnknown[Unknown Groq Error<br/>Fail job]
    
    GroqRateLimit --> RetryWithFallback[Switch to Local LLM]
    GroqServerError --> ExponentialBackoff[Exponential Backoff<br/>1s, 2s, 4s, 8s, 16s]
    ExponentialBackoff --> MaxRetries{Max Retries<br/>Reached?}
    MaxRetries -->|No| TryBlock
    MaxRetries -->|Yes| GroqUnknown
    
    RetryWithFallback --> TryBlock
    GroqUnknown --> Return502[Return 502<br/>Bad Gateway]
    
    HandleRPC --> Return503RPC[Return 503<br/>Service Unavailable]
    HandleRedis --> CheckRedisCritical{Critical<br/>Operation?}
    CheckRedisCritical -->|Yes| Return500Redis[Return 500<br/>Internal Error]
    CheckRedisCritical -->|No| ContinueWithoutCache[Continue without cache]
    ContinueWithoutCache --> TryBlock
    
    Return502 --> LogExternal[Log External Error<br/>level: error]
    Return503RPC --> LogExternal
    Return500Redis --> LogExternal
    LogExternal --> AlertOps[Alert Ops Team<br/>PagerDuty/Slack]
    AlertOps --> End6([End])
    
    %% Database Errors
    ClassifyError -->|QueryFailedError| DatabaseHandler[Database Error]
    DatabaseHandler --> CheckDBType{DB Error<br/>Type?}
    CheckDBType -->|Connection| DBConnection[Connection Pool Exhausted]
    CheckDBType -->|Constraint| DBConstraint[Unique/FK Violation]
    CheckDBType -->|Timeout| DBTimeout[Query Timeout]
    
    DBConnection --> Return500DB[Return 500]
    DBConstraint --> Return409[Return 409<br/>Conflict]
    DBTimeout --> Return504[Return 504<br/>Gateway Timeout]
    
    Return500DB --> LogDB[Log DB Error<br/>level: error]
    Return409 --> LogDB
    Return504 --> LogDB
    LogDB --> AlertOps
    
    %% Unknown Errors
    ClassifyError -->|Unknown Error| UnknownHandler[Unknown Error Handler]
    UnknownHandler --> CaptureContext[Capture Full Context<br/>• Stack trace<br/>• Request body<br/>• Headers<br/>• User session]
    CaptureContext --> SendToSentry[Send to Sentry]
    SendToSentry --> FormatGeneric["Format Response<br/>{<br/>  code: 'INTERNAL_ERROR',<br/>  message: 'An error occurred',<br/>  requestId: uuid<br/>}"]
    FormatGeneric --> Return500[Return 500]
    Return500 --> LogCritical[Log Critical<br/>level: error]
    LogCritical --> AlertOps
    
    style Return400 fill:#ffecb3,stroke:#ff6f00
    style Return401 fill:#ffcdd2,stroke:#c62828
    style Return403 fill:#ffcdd2,stroke:#c62828
    style Return429 fill:#fff9c4,stroke:#f57f17
    style Return500 fill:#d32f2f,color:#fff,stroke:#b71c1c
    style Return502 fill:#ff6f00,color:#fff,stroke:#e65100
    style Return503 fill:#ff6f00,color:#fff,stroke:#e65100
    style SuccessPath fill:#c8e6c9,stroke:#2e7d32
```

---

## 8. Rate Limiting Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Guard as RateLimitGuard
    participant Redis
    participant Service
    
    Client->>Guard: Make request
    Guard->>Guard: Extract wallet address
    Guard->>Guard: Determine tier from token balance
    
    Note over Guard: Tier Logic:<br/>0-99 GUARD: Free (blocked)<br/>100-999: Basic (10/day)<br/>1000-9999: Pro (100/day)<br/>10000+: Enterprise (unlimited)
    
    Guard->>Redis: ZREMRANGEBYSCORE<br/>ratelimit:{address}<br/>0 {now - 86400000}
    Note over Redis: Remove requests older<br/>than 24 hours
    
    Guard->>Redis: ZCARD ratelimit:{address}
    Redis-->>Guard: count: 47
    
    Guard->>Guard: Check: count < limit?
    
    alt Rate limit exceeded
        Guard->>Redis: ZRANGE ratelimit:{address}<br/>0 0 WITHSCORES
        Redis-->>Guard: oldest timestamp
        Guard->>Guard: Calculate resetAt =<br/>oldest + 86400000
        Guard-->>Client: 429 Too Many Requests<br/>{<br/>  code: 'RATE_LIMIT_EXCEEDED',<br/>  limit: 100,<br/>  remaining: 0,<br/>  resetAt: '2026-01-26T10:30:00Z'<br/>}
    else Rate limit OK
        Guard->>Redis: ZADD ratelimit:{address}<br/>{now} "{now}:{random}"
        Guard->>Redis: EXPIRE ratelimit:{address}<br/>86400
        Guard->>Guard: Set response headers:<br/>X-RateLimit-Limit: 100<br/>X-RateLimit-Remaining: 52<br/>X-RateLimit-Reset: 1738000000
        Guard->>Service: Forward request
        Service-->>Guard: Response
        Guard-->>Client: 200 OK + rate limit headers
    end
```

### Sliding Window Implementation

```mermaid
flowchart LR
    subgraph Window["24-Hour Sliding Window"]
        direction TB
        T1["Request 1<br/>10:00:00"]
        T2["Request 2<br/>10:15:30"]
        T3["Request 3<br/>11:45:20"]
        T4["..."]
        T5["Request 47<br/>09:30:00 (next day)"]
        
        Now["Current Time:<br/>10:30:00 (next day)"]
        
        Cutoff["Cutoff:<br/>10:30:00 (previous day)"]
    end
    
    subgraph Redis["Redis Sorted Set"]
        direction TB
        Key["Key: ratelimit:0x742d"]
        
        Members["Members (score = timestamp):<br/>───────────────<br/>1737800430000: '1737800430000:0.123'<br/>1737801330000: '1737801330000:0.456'<br/>1737806720000: '1737806720000:0.789'<br/>...<br/>1737886200000: '1737886200000:0.321'"]
    end
    
    subgraph Operations["Operations"]
        O1["1. ZREMRANGEBYSCORE<br/>Remove entries < cutoff"]
        O2["2. ZCARD<br/>Count remaining entries"]
        O3["3. Compare count vs limit"]
        O4["4. ZADD<br/>Add new entry if allowed"]
    end
    
    Now --> Cutoff
    Cutoff --> O1
    O1 --> Key
    Key --> Members
    Members --> O2
    O2 --> O3
    O3 -->|Allowed| O4
    O4 --> Members
```

---

## 9. Deployment Architecture

```mermaid
flowchart TB
    subgraph Internet["🌍 Internet"]
        Users["Users"]
    end
    
    subgraph CDN["🚀 CDN / Edge"]
        Cloudflare["Cloudflare<br/>───────────────<br/>• DDoS Protection<br/>• TLS Termination<br/>• Rate Limiting<br/>• Caching"]
    end
    
    subgraph K8s["☸️ Kubernetes Cluster (GKE/EKS/AKS)"]
        direction TB
        
        Ingress["Ingress Controller<br/>(NGINX/Traefik)<br/>───────────────<br/>• TLS<br/>• Path routing<br/>• Load balancing"]
        
        subgraph Namespace1["Namespace: production"]
            direction TB
            
            subgraph Gateway["API Gateway Deployment"]
                GW1["NestJS Pod 1<br/>───────────────<br/>CPU: 500m<br/>RAM: 512Mi"]
                GW2["NestJS Pod 2<br/>───────────────<br/>CPU: 500m<br/>RAM: 512Mi"]
                GW3["NestJS Pod 3<br/>───────────────<br/>CPU: 500m<br/>RAM: 512Mi"]
                
                GWSvc["Service<br/>api-gateway-svc<br/>ClusterIP"]
                
                GW1 --> GWSvc
                GW2 --> GWSvc
                GW3 --> GWSvc
            end
            
            subgraph Python["AI Engine Deployment"]
                PY1["FastAPI Pod 1<br/>───────────────<br/>CPU: 2000m<br/>RAM: 4Gi<br/>GPU: 1x T4"]
                PY2["FastAPI Pod 2<br/>───────────────<br/>CPU: 2000m<br/>RAM: 4Gi<br/>GPU: 1x T4"]
                
                PYSvc["Service<br/>ai-engine-svc<br/>ClusterIP"]
                
                PY1 --> PYSvc
                PY2 --> PYSvc
            end
            
            subgraph Workers["Celery Workers"]
                W1["Worker Pod 1<br/>───────────────<br/>CPU: 1000m<br/>RAM: 2Gi"]
                W2["Worker Pod 2<br/>───────────────<br/>CPU: 1000m<br/>RAM: 2Gi"]
                W3["Worker Pod 3<br/>───────────────<br/>CPU: 1000m<br/>RAM: 2Gi"]
            end
        end
        
        Ingress --> GWSvc
    end
    
    subgraph Managed["🔧 Managed Services"]
        direction TB
        
        RedisCloud["Redis Cloud<br/>(Upstash/AWS ElastiCache)<br/>───────────────<br/>• Cluster mode<br/>• Auto-failover<br/>• 99.99% SLA"]
        
        PostgresCloud["PostgreSQL<br/>(AWS RDS/Supabase)<br/>───────────────<br/>• Multi-AZ<br/>• Automated backups<br/>• Read replicas"]
        
        Secrets["Secrets Manager<br/>(Vault/AWS Secrets)<br/>───────────────<br/>• Groq API keys<br/>• DB credentials<br/>• Session secrets"]
    end
    
    subgraph External["🌐 External APIs"]
        GroqAPI["Groq API<br/>───────────────<br/>api.groq.com"]
        
        AlchemyRPC["Alchemy RPC<br/>───────────────<br/>eth-mainnet.g.alchemy.com"]
    end
    
    subgraph Monitoring["📊 Observability Stack"]
        Prometheus["Prometheus<br/>───────────────<br/>Metrics collection"]
        
        Grafana["Grafana<br/>───────────────<br/>Dashboards"]
        
        Loki["Loki<br/>───────────────<br/>Log aggregation"]
        
        Jaeger["Jaeger<br/>───────────────<br/>Distributed tracing"]
        
        Prometheus --> Grafana
        Loki --> Grafana
    end
    
    Users --> Cloudflare
    Cloudflare --> Ingress
    
    GWSvc --> PYSvc
    GWSvc --> RedisCloud
    GWSvc --> PostgresCloud
    GWSvc --> Secrets
    
    PYSvc --> RedisCloud
    PY1 --> GroqAPI
    PY2 --> GroqAPI
    
    W1 --> RedisCloud
    W2 --> RedisCloud
    W3 --> RedisCloud
    W1 --> GroqAPI
    W2 --> GroqAPI
    W3 --> GroqAPI
    
    GWSvc --> AlchemyRPC
    W1 --> AlchemyRPC
    
    GW1 -.->|Metrics| Prometheus
    GW1 -.->|Logs| Loki
    GW1 -.->|Traces| Jaeger
    PY1 -.->|Metrics| Prometheus
    PY1 -.->|Logs| Loki
    
    style K8s fill:#e8f4fd,stroke:#0277bd,stroke-width:3px
    style Managed fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style Monitoring fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

### Auto-Scaling Configuration

```mermaid
flowchart LR
    subgraph Metrics["Metrics Sources"]
        CPU["CPU Utilization<br/>Target: 70%"]
        Memory["Memory Utilization<br/>Target: 80%"]
        Custom["Custom Metrics<br/>───────────────<br/>• Queue depth<br/>• Request latency<br/>• Active jobs"]
    end
    
    subgraph HPA["Horizontal Pod Autoscaler"]
        Evaluate["Evaluate Metrics<br/>Every 15s"]
        
        Decision{Scale<br/>Action?}
        
        ScaleUp["Scale Up<br/>Add pods"]
        ScaleDown["Scale Down<br/>Remove pods"]
        NoAction["No Action"]
    end
    
    subgraph Limits["Scaling Limits"]
        Min["Min Replicas<br/>───────────────<br/>Gateway: 2<br/>AI Engine: 1<br/>Workers: 2"]
        
        Max["Max Replicas<br/>───────────────<br/>Gateway: 10<br/>AI Engine: 5<br/>Workers: 20"]
    end
    
    CPU --> Evaluate
    Memory --> Evaluate
    Custom --> Evaluate
    
    Evaluate --> Decision
    
    Decision -->|Metric > Target + 10%| ScaleUp
    Decision -->|Metric < Target - 20%| ScaleDown
    Decision -->|Within range| NoAction
    
    ScaleUp --> Max
    ScaleDown --> Min
```

---

## 10. Data Flow Diagram

```mermaid
flowchart TD
    subgraph Sources["Data Sources"]
        User["User Input<br/>───────────────<br/>• Proposal text<br/>• Wallet signature"]
        
        Chain["Blockchain<br/>───────────────<br/>• Wallet history<br/>• Token balances<br/>• DAO membership"]
        
        LLM["LLM Provider<br/>───────────────<br/>• Risk analysis<br/>• Pattern detection"]
    end
    
    subgraph Ingestion["Data Ingestion Layer"]
        API["API Gateway<br/>───────────────<br/>• Validation<br/>• Normalization<br/>• Enrichment"]
    end
    
    subgraph Processing["Processing Layer"]
        Queue["Job Queue<br/>───────────────<br/>• Priority routing<br/>• Retry logic<br/>• Deduplication"]
        
        Agents["AI Agents<br/>───────────────<br/>• Parallel execution<br/>• Score aggregation<br/>• Confidence weighting"]
    end
    
    subgraph Storage["Storage Layer"]
        Hot["Hot Storage (Redis)<br/>───────────────<br/>• Active jobs<br/>• Recent results<br/>• Session data<br/>TTL: 1 hour - 24 hours"]
        
        Warm["Warm Storage (PostgreSQL)<br/>───────────────<br/>• Historical analyses<br/>• User profiles<br/>• Audit logs<br/>Retention: 90 days"]
        
        Cold["Cold Storage (S3/Archive)<br/>───────────────<br/>• Old analyses<br/>• Model training data<br/>• Compliance logs<br/>Retention: 7 years"]
    end
    
    subgraph Analytics["Analytics Layer"]
        Metrics["Metrics<br/>───────────────<br/>• Success rate<br/>• Processing time<br/>• Cache hit rate<br/>• LLM costs"]
        
        BI["Business Intelligence<br/>───────────────<br/>• Risk trends<br/>• User patterns<br/>• Model performance"]
    end
    
    subgraph Output["Output Layer"]
        Sync["Synchronous Response<br/>───────────────<br/>• Immediate results<br/>• < 30s timeout"]
        
        Async["Asynchronous Response<br/>───────────────<br/>• Webhook callback<br/>• Polling endpoint"]
        
        Stream["Server-Sent Events<br/>───────────────<br/>• Progress updates<br/>• Real-time scores"]
    end
    
    User --> API
    API --> Chain
    API --> Queue
    
    Queue --> Agents
    Agents --> LLM
    Agents --> Chain
    
    Agents --> Hot
    Hot --> Warm
    Warm --> Cold
    
    Hot --> Sync
    Hot --> Async
    Hot --> Stream
    
    Warm --> Metrics
    Warm --> BI
    
    Sync --> User
    Async --> User
    Stream --> User
    
    style Sources fill:#e3f2fd,stroke:#1976d2
    style Processing fill:#f3e5f5,stroke:#7b1fa2
    style Storage fill:#fff3e0,stroke:#f57c00
    style Analytics fill:#e8f5e9,stroke:#2e7d32
    style Output fill:#fce4ec,stroke:#c2185b
```

---

## 11. CI/CD Pipeline

```mermaid
flowchart LR
    subgraph Dev["Developer"]
        Code["Write Code"]
        Commit["Git Commit"]
        Push["Git Push"]
    end
    
    subgraph CI["Continuous Integration"]
        Trigger["GitHub Actions<br/>Triggered"]
        
        Lint["Lint & Format<br/>───────────────<br/>• ESLint<br/>• Biome<br/>• Ruff (Python)"]
        
        Test["Run Tests<br/>───────────────<br/>• Unit tests<br/>• Integration tests<br/>• E2E tests"]
        
        Build["Build Docker Images<br/>───────────────<br/>• api-gateway:sha<br/>• ai-engine:sha"]
        
        Scan["Security Scan<br/>───────────────<br/>• Trivy<br/>• Snyk<br/>• SAST"]
    end
    
    subgraph CD["Continuous Deployment"]
        Push Registry["Push to Registry<br/>───────────────<br/>• Docker Hub<br/>• GCR/ECR"]
        
        Deploy Staging["Deploy to Staging<br/>───────────────<br/>• Update K8s manifests<br/>• Apply with kubectl"]
        
        Smoke["Smoke Tests<br/>───────────────<br/>• Health checks<br/>• Critical paths"]
        
        Approve{"Manual<br/>Approval?"}
        
        Deploy Prod["Deploy to Production<br/>───────────────<br/>• Blue/Green deployment<br/>• Gradual rollout"]
        
        Monitor["Monitor Metrics<br/>───────────────<br/>• Error rate<br/>• Latency<br/>• Success rate"]
        
        Rollback{"Healthy?"}
    end
    
    Code --> Commit
    Commit --> Push
    Push --> Trigger
    
    Trigger --> Lint
    Lint --> Test
    Test --> Build
    Build --> Scan
    
    Scan -->|Pass| Push Registry
    Scan -->|Fail| Notify Fail
    
    Push Registry --> Deploy Staging
    Deploy Staging --> Smoke
    
    Smoke -->|Pass| Approve
    Smoke -->|Fail| Notify Fail
    
    Approve -->|Yes| Deploy Prod
    Approve -->|No| End1([End])
    
    Deploy Prod --> Monitor
    Monitor --> Rollback
    
    Rollback -->|Yes| Success([Success])
    Rollback -->|No| Auto Rollback
    
    Auto Rollback --> Notify Fail
    Notify Fail --> End2([End])
    
    style CI fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style CD fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
```

---

## 12. Database Schema

```mermaid
erDiagram
    SESSIONS ||--o{ ANALYSES : creates
    WALLETS ||--o{ ANALYSES : submits
    ANALYSES ||--o{ AGENT_RESULTS : contains
    ANALYSES ||--o{ RED_FLAGS : has
    PROPOSALS ||--|| ANALYSES : analyzed_by
    
    SESSIONS {
        uuid id PK
        string address
        int chain_id
        timestamp created_at
        timestamp expires_at
        boolean is_member
        bigint token_balance
    }
    
    WALLETS {
        string address PK
        string ens_name
        int transaction_count
        timestamp first_seen
        timestamp last_active
        int reputation_score
        jsonb metadata
        timestamp updated_at
    }
    
    PROPOSALS {
        uuid id PK
        string proposal_id UK
        string title
        text description
        string proposer_address FK
        string dao_name
        int chain_id
        bigint requested_amount
        string recipient_address
        timestamp voting_deadline
        int snapshot_block
        timestamp created_at
    }
    
    ANALYSES {
        uuid id PK
        string job_id UK
        uuid proposal_id FK
        string wallet_address FK
        int composite_score
        string risk_level
        string recommendation
        int processing_time_ms
        boolean cached
        string cache_key
        jsonb snapshot
        timestamp created_at
    }
    
    AGENT_RESULTS {
        uuid id PK
        uuid analysis_id FK
        string agent_name
        int score
        text reasoning
        float confidence
        jsonb metadata
        timestamp created_at
    }
    
    RED_FLAGS {
        uuid id PK
        uuid analysis_id FK
        string category
        string severity
        string title
        text description
        string affected_section
        text recommendation
        timestamp created_at
    }
    
    AUDIT_LOGS {
        uuid id PK
        string event_type
        string actor_address
        jsonb event_data
        string ip_address
        string user_agent
        timestamp created_at
    }
```

---

## Environment Variables Reference

```bash
# ═══════════════════════════════════════
# API Gateway (NestJS) Environment
# ═══════════════════════════════════════

# Server
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Redis
REDIS_URL=redis://redis-cluster:6379
REDIS_PASSWORD=
REDIS_TLS=true

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/ai_guard_dao
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# AI Engine
AI_ENGINE_URL=http://ai-engine:8000
AI_ENGINE_TIMEOUT_MS=30000

# Blockchain
ALCHEMY_API_KEY=
INFURA_API_KEY=
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Smart Contracts
DAO_CORE_ADDRESS=0x...
PROPOSAL_MANAGER_ADDRESS=0x...
VOTING_ENGINE_ADDRESS=0x...
GUARD_TOKEN_ADDRESS=0x...

# Auth
SESSION_SECRET=your-32-char-secret-here
JWT_SECRET=your-jwt-secret-here
SIWE_DOMAIN=ai-guard-dao.xyz

# Rate Limiting
RATE_LIMIT_BASIC_REQUESTS=10
RATE_LIMIT_BASIC_WINDOW_MS=86400000
RATE_LIMIT_PRO_REQUESTS=100
RATE_LIMIT_PRO_WINDOW_MS=86400000

# Token Gating
MINIMUM_TOKEN_BALANCE=100000000000000000000

# Monitoring
SENTRY_DSN=
PROMETHEUS_PORT=9090

# ═══════════════════════════════════════
# AI Engine (Python) Environment
# ═══════════════════════════════════════

# Server
PYTHON_ENV=production
PORT=8000
WORKERS=4

# LLM Provider
GROQ_API_KEY=
GROQ_MODEL=llama-4-scout-17b
GROQ_MAX_TOKENS=2048
GROQ_TEMPERATURE=0.3

# Fallback LLM
OLLAMA_BASE_URL=http://localhost:11434
LOCAL_MODEL=llama4-scout

# Redis
REDIS_URL=redis://redis-cluster:6379
CELERY_BROKER_URL=redis://redis-cluster:6379/1
CELERY_RESULT_BACKEND=redis://redis-cluster:6379/2

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/ai_guard_dao

# Vector Store
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=

# Blockchain
WEB3_PROVIDER_URI=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Monitoring
LOGURU_LEVEL=INFO
SENTRY_DSN=

# Performance
MAX_CONCURRENT_JOBS=10
JOB_TIMEOUT_SECONDS=30
```

---

## Quick Start Commands

```bash
# Development
docker-compose up -d                 # Start all services
pnpm install                          # Install Node dependencies
poetry install                        # Install Python dependencies

# API Gateway
cd apps/api-gateway
pnpm dev                             # Start in watch mode
pnpm test                            # Run tests
pnpm build                           # Build for production

# AI Engine
cd apps/ai-engine
poetry run uvicorn app.main:app --reload
poetry run pytest                    # Run tests
poetry run celery -A app.workers.celery_worker worker --loglevel=info

# Database
pnpm db:migrate                      # Run migrations
pnpm db:seed                         # Seed database

#