# Monad DAO Implementation

## Overview

A basic DAO implementation for the Monad blockchain that handles both **human-readable data** (proposals, descriptions, member profiles) and **machine data** (voting weights, thresholds, treasury balances, timestamps).

This DAO serves as the foundation for the AI Guard Dog system.

---

## 📊 Data Architecture (From Diagram Analysis)

### Human Language Data (Descriptive)
- Proposal titles and descriptions
- Member names and profiles
- Category labels
- Voting reasons
- Execution summaries

### Machine Data (Numeric/Facts)
- Voting weights and thresholds
- Treasury balances
- Timestamps and deadlines
- Quorum requirements
- Member reputation scores
- Proposal IDs and states

---

## 📋 Contract List

### Core Contracts (Must Have)

| # | Contract | Purpose | Priority |
|---|----------|---------|----------|
| 1 | `DAOToken.sol` | Governance token with voting power | 🔴 Critical |
| 2 | `MemberRegistry.sol` | Member management and reputation | 🔴 Critical |
| 3 | `ProposalManager.sol` | Proposal creation and lifecycle | 🔴 Critical |
| 4 | `VotingEngine.sol` | Voting logic and tallying | 🔴 Critical |
| 5 | `Treasury.sol` | Fund management and execution | 🔴 Critical |
| 6 | `DAOCore.sol` | Main coordinator contract | 🔴 Critical |

### Supporting Contracts (Enhancement)

| # | Contract | Purpose | Priority |
|---|----------|---------|----------|
| 7 | `Timelock.sol` | Delayed execution for security | 🟡 Important |
| 8 | `DelegationRegistry.sol` | Vote delegation tracking | 🟡 Important |
| 9 | `ProposalCategories.sol` | Proposal type management | 🟢 Nice-to-have |
| 10 | `ReputationSystem.sol` | Member reputation scoring | 🟢 Nice-to-have |

### Integration Contracts (For AI Guard Dog)

| # | Contract | Purpose | Priority |
|---|----------|---------|----------|
| 11 | `AIAgentRegistry.sol` | Whitelist AI voting agents | 🟡 Important |
| 12 | `RiskOracle.sol` | Store risk scores on-chain | 🟢 Nice-to-have |

---

## 🏗️ Implementation Steps

### Phase 1: Foundation (Week 1)

#### Step 1.1: DAOToken
```
□ ERC20 with voting extensions
□ Checkpoints for historical voting power
□ Delegation support
□ Mint/burn functions (controlled)
```

#### Step 1.2: MemberRegistry
```
□ Member struct (address, joinDate, reputation, status)
□ Registration/removal functions
□ Role management (Admin, Member, Delegate)
□ Reputation tracking
```

#### Step 1.3: Treasury
```
□ Multi-token support (MON + ERC20)
□ Spend authorization (only via proposals)
□ Balance tracking
□ Emergency withdrawal (multisig)
```

### Phase 2: Governance Logic (Week 1-2)

#### Step 2.1: ProposalManager
```
□ Proposal struct with all metadata
□ Create proposal function
□ State machine (Pending → Active → Passed/Failed → Executed)
□ Proposal types (Transfer, Configuration, Custom)
□ Human-readable metadata storage
```

#### Step 2.2: VotingEngine
```
□ Vote casting (For, Against, Abstain)
□ Vote weighting (token-based)
□ Quorum calculation
□ Threshold validation
□ Voting period enforcement
```

### Phase 3: Coordination (Week 2)

#### Step 3.1: DAOCore
```
□ Link all contracts together
□ Access control management
□ Configuration parameters
□ Event emission for indexing
```

#### Step 3.2: Timelock
```
□ Execution delay
□ Queue management
□ Cancel functionality
□ Grace period
```

### Phase 4: AI Integration (Week 2-3)

#### Step 4.1: AIAgentRegistry
```
□ Whitelist AI agents
□ Delegation limits
□ Risk threshold storage
□ Agent performance tracking
```

#### Step 4.2: Integration with VotingAgent
```
□ Hook VotingAgent to VotingEngine
□ Enable delegated voting
□ Audit trail connection
```

---

## 📁 Folder Structure

```
monad-dao/
├── contracts/
│   ├── core/
│   │   ├── DAOCore.sol
│   │   ├── DAOToken.sol
│   │   └── Treasury.sol
│   ├── governance/
│   │   ├── ProposalManager.sol
│   │   ├── VotingEngine.sol
│   │   └── Timelock.sol
│   ├── membership/
│   │   ├── MemberRegistry.sol
│   │   ├── DelegationRegistry.sol
│   │   └── ReputationSystem.sol
│   ├── integration/
│   │   ├── AIAgentRegistry.sol
│   │   └── RiskOracle.sol
│   └── interfaces/
│       ├── IDAOCore.sol
│       ├── IProposalManager.sol
│       ├── IVotingEngine.sol
│       └── ITreasury.sol
├── scripts/
│   ├── deploy-dao.js
│   └── setup-dao.js
├── test/
│   ├── DAOToken.test.js
│   ├── ProposalManager.test.js
│   └── Integration.test.js
└── README.md
```

---

## 🔢 Key Parameters (Machine Data)

### Voting Parameters
| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| `votingDelay` | 1 block | Delay before voting starts |
| `votingPeriod` | 17280 blocks (~3 days) | How long voting lasts |
| `proposalThreshold` | 100 tokens | Min tokens to create proposal |
| `quorumPercentage` | 4% | Min participation required |
| `passingThreshold` | 50% | Votes needed to pass |

### Treasury Parameters
| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| `maxSingleTransfer` | 10% of treasury | Max single withdrawal |
| `dailyLimit` | 20% of treasury | Max daily withdrawals |
| `emergencyMultisig` | 3-of-5 | Emergency access |

### Member Parameters
| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| `minStakeToJoin` | 10 tokens | Minimum stake to become member |
| `reputationDecay` | 1%/month | Inactive reputation loss |
| `maxDelegations` | 100 | Max delegators per delegate |

---

## 📝 Human-Readable Data Schema

### Proposal Metadata
```solidity
struct ProposalMetadata {
    string title;           // "Fund Marketing Campaign Q1"
    string description;     // Full proposal text (or IPFS hash)
    string category;        // "Treasury", "Governance", "Technical"
    string discussionURL;   // Link to forum discussion
    string[] tags;          // ["marketing", "budget", "urgent"]
}
```

### Member Profile
```solidity
struct MemberProfile {
    string displayName;     // "Alice.eth"
    string bio;             // "Core contributor since 2024"
    string avatarURI;       // IPFS or URL to avatar
    string[] socialLinks;   // Twitter, Discord, etc.
}
```

---

## 🚀 Getting Started

```bash
# From the GuardDao root directory
cd monad-dao

# Install dependencies (uses root package.json)
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to local network
npx hardhat run scripts/deploy-dao.js --network localhost

# Deploy to Monad testnet
npx hardhat run scripts/deploy-dao.js --network monadTestnet
```

---

## 🔗 Integration with AI Guard Dog

Once the DAO is deployed:

1. **Connect VotingAgent**: Update VotingAgent to call `VotingEngine.castVote()`
2. **Register AI Agent**: Call `AIAgentRegistry.registerAgent(votingAgentAddress)`
3. **Set Permissions**: Grant `VOTER_ROLE` to VotingAgent in DAOCore
4. **Link Audit Trail**: Connect AuditLogger to DAO events

---

## 📊 Contract Dependency Graph

```
                    ┌─────────────┐
                    │  DAOCore    │
                    │ (Coordinator)│
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   DAOToken    │  │ProposalManager│  │   Treasury    │
│ (Voting Power)│  │  (Proposals)  │  │   (Funds)     │
└───────┬───────┘  └───────┬───────┘  └───────────────┘
        │                  │
        │                  ▼
        │          ┌───────────────┐
        └─────────►│ VotingEngine  │
                   │   (Voting)    │
                   └───────┬───────┘
                           │
                           ▼
                   ┌───────────────┐
                   │   Timelock    │
                   │  (Execution)  │
                   └───────────────┘
```

---

## ✅ Checklist

### Phase 1: Core Contracts
- [ ] DAOToken.sol
- [ ] MemberRegistry.sol
- [ ] Treasury.sol

### Phase 2: Governance
- [ ] ProposalManager.sol
- [ ] VotingEngine.sol
- [ ] Timelock.sol

### Phase 3: Coordinator
- [ ] DAOCore.sol
- [ ] All interfaces

### Phase 4: Integration
- [ ] AIAgentRegistry.sol
- [ ] Connect to VotingAgent
- [ ] End-to-end testing

---

*This DAO implementation is designed specifically for Monad's high-throughput environment and integrates seamlessly with the AI Guard Dog treasury protection system.*
