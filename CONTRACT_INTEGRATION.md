# Smart Contract Integration Guide
# AI Guard Dog Intern - Monad Track

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Author:** Solidity Team

---

## 📋 Overview

This document explains how to integrate with the AI Guard Dog smart contracts. Use this guide to connect your frontend, backend, or AI services to the on-chain components.

---

## 🏗️ Contract Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER WALLET                              │
│              (Tokens stay here - non-custodial)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    delegateVotingPower()
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VOTINGAGENT.SOL                             │
│  • Stores user preferences (risk threshold)                      │
│  • Validates AI decisions against user settings                  │
│  • Casts votes on behalf of users                               │
│  • Emits alerts for high-risk proposals                         │
└─────────────────────────────────────────────────────────────────┘
           │                                    │
   castVote()                          logDecision()
           ▼                                    ▼
┌──────────────────────────┐    ┌──────────────────────────────────┐
│    DAOGOVERNOR.SOL       │    │       AUDITLOGGER.SOL            │
│  • Manages proposals     │    │  • Immutable decision records    │
│  • Handles voting        │    │  • Risk score history            │
│  • Executes passed votes │    │  • Report hash storage           │
└──────────────────────────┘    └──────────────────────────────────┘
```

---

## 📍 Deployed Contract Addresses (Monad Testnet)

| Contract | Address | Status |
|----------|---------|--------|
| DAOGovernor | `TBD` | 🔄 Pending |
| VotingAgent | `TBD` | 🔄 Pending |
| AuditLogger | `TBD` | 🔄 Pending |
| MockToken (Testing) | `TBD` | 🔄 Pending |

**Network:** Monad Testnet  
**Chain ID:** `TBD`  
**RPC URL:** `TBD`

---

## 🔄 Complete System Flow

### Step-by-Step Process

```
1. USER DELEGATES
   └─> User calls VotingAgent.delegateVotingPower(dao, threshold)
   └─> Tokens remain in user's wallet
   └─> VotingAgent stores preferences

2. PROPOSAL CREATED
   └─> Someone calls DAOGovernor.propose()
   └─> Event emitted: ProposalCreated(proposalId, proposer, ...)
   └─> Backend scanner detects event

3. AI ANALYSIS (OFF-CHAIN)
   └─> Backend fetches proposal details
   └─> AI analyzes risk (0-100 score)
   └─> Generates risk report, stores on IPFS
   └─> Gets report hash

4. VOTE EXECUTION
   └─> Backend calls VotingAgent.castVoteWithRisk(...)
   └─> VotingAgent checks: Is risk < user's threshold?
   
   IF LOW RISK (risk < threshold):
       └─> Vote cast automatically
       └─> Logged to AuditLogger
       └─> Event: VoteCastByAI
   
   IF HIGH RISK (risk >= threshold):
       └─> No vote cast
       └─> Event: HighRiskProposalDetected
       └─> User notified for manual decision

5. USER OVERRIDE (if high risk)
   └─> User reviews proposal
   └─> Calls VotingAgent.approveHighRiskVote() or ignores
   └─> Decision logged

6. PROPOSAL EXECUTION
   └─> Voting period ends
   └─> DAOGovernor.execute() called
   └─> If passed, proposal actions execute
```

---

## 📦 Contract 1: VotingAgent.sol

### Purpose
The core AI voting contract. Manages delegations and executes votes.

### User Functions

#### `delegateVotingPower`
Allows user to delegate their voting power to the AI.

```solidity
function delegateVotingPower(
    address daoGovernor,    // Address of the DAO
    uint256 riskThreshold,  // 0-100: Only vote if risk below this
    bool requireApproval    // If true, AI asks before each vote
) external
```

**Frontend Example:**
```javascript
const tx = await votingAgent.delegateVotingPower(
    "0x123...abc",  // DAO Governor address
    50,             // Risk threshold (votes only if risk < 50)
    false           // Auto-vote without asking
);
await tx.wait();
```

---

#### `revokeDelegation`
Removes delegation for a specific DAO.

```solidity
function revokeDelegation(address daoGovernor) external
```

**Frontend Example:**
```javascript
await votingAgent.revokeDelegation("0x123...abc");
```

---

#### `revokeAll`
Emergency function - removes ALL delegations.

```solidity
function revokeAll() external
```

---

#### `approveHighRiskVote`
User manually approves a flagged high-risk proposal.

```solidity
function approveHighRiskVote(
    address daoGovernor,
    uint256 proposalId,
    uint8 support          // 0 = against, 1 = for, 2 = abstain
) external
```

**Frontend Example:**
```javascript
// User reviewed proposal and wants to vote YES
await votingAgent.approveHighRiskVote(
    daoAddress,
    proposalId,
    1  // 1 = vote FOR
);
```

---

### Backend Functions (AI Only)

#### `castVoteWithRisk`
Main function for AI to cast votes with risk assessment.

```solidity
function castVoteWithRisk(
    address daoGovernor,
    uint256 proposalId,
    address user,           // Whose voting power to use
    uint8 support,          // 0 = against, 1 = for
    uint256 riskScore,      // 0-100 from AI
    bytes32 riskReportHash  // IPFS hash of full report
) external onlyAIBackend
```

**Backend Example:**
```javascript
// After AI analysis completes
const riskScore = 25;
const reportHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(ipfsHash)
);

const tx = await votingAgent.castVoteWithRisk(
    daoAddress,
    proposalId,
    userAddress,
    1,           // Vote FOR
    riskScore,
    reportHash
);
```

---

#### `castMultipleVotes`
Batch voting for efficiency.

```solidity
function castMultipleVotes(
    address daoGovernor,
    uint256[] calldata proposalIds,
    address[] calldata users,
    uint8[] calldata supports,
    uint256[] calldata riskScores,
    bytes32[] calldata reportHashes
) external onlyAIBackend
```

---

### View Functions

#### `getDelegation`
Check a user's delegation settings.

```solidity
function getDelegation(address user, address daoGovernor) 
    external view returns (
        bool active,
        uint256 riskThreshold,
        uint256 delegatedAt,
        bool requiresApproval
    )
```

**Usage:**
```javascript
const delegation = await votingAgent.getDelegation(userAddress, daoAddress);

if (delegation.active) {
    console.log(`Risk threshold: ${delegation.riskThreshold}`);
    console.log(`Delegated at: ${new Date(delegation.delegatedAt * 1000)}`);
}
```

---

### Events to Listen For

```solidity
// User delegated voting power
event VotingPowerDelegated(
    address indexed user,
    address indexed daoGovernor,
    uint256 riskThreshold
);

// User revoked delegation
event DelegationRevoked(
    address indexed user,
    address indexed daoGovernor
);

// AI successfully cast a vote
event VoteCastByAI(
    uint256 indexed proposalId,
    address indexed user,
    uint8 support,
    uint256 riskScore
);

// Proposal flagged as high risk (no vote cast)
event HighRiskProposalDetected(
    uint256 indexed proposalId,
    address indexed user,
    uint256 riskScore
);

// Medium risk - waiting for user approval
event ApprovalRequired(
    uint256 indexed proposalId,
    address indexed user,
    uint256 riskScore
);
```

**Listening Example:**
```javascript
// Frontend: Listen for high risk alerts for current user
votingAgent.on("HighRiskProposalDetected", (proposalId, user, riskScore) => {
    if (user.toLowerCase() === currentUser.toLowerCase()) {
        showNotification(`⚠️ Proposal ${proposalId} flagged! Risk: ${riskScore}`);
    }
});

// Backend: Listen for all delegations
votingAgent.on("VotingPowerDelegated", (user, dao, threshold) => {
    addUserToMonitoringList(user, dao, threshold);
});
```

---

## 📦 Contract 2: DAOGovernor.sol

### Purpose
Standard DAO governance (based on OpenZeppelin Governor).

### Key Functions

#### `propose`
Create a new proposal.

```solidity
function propose(
    address[] memory targets,     // Contracts to call
    uint256[] memory values,      // ETH to send
    bytes[] memory calldatas,     // Function calls
    string memory description     // Proposal description
) external returns (uint256 proposalId)
```

**Example - Treasury Transfer Proposal:**
```javascript
const targets = [treasuryAddress];
const values = [0];
const calldatas = [
    treasury.interface.encodeFunctionData("transfer", [
        recipientAddress,
        ethers.utils.parseEther("100")
    ])
];
const description = "Transfer 100 ETH to marketing team";

const tx = await governor.propose(targets, values, calldatas, description);
const receipt = await tx.wait();
const proposalId = receipt.events[0].args.proposalId;
```

---

#### `getProposal`
Fetch proposal details.

```solidity
function getProposal(uint256 proposalId) external view returns (
    address proposer,
    uint256 startBlock,
    uint256 endBlock,
    string memory description,
    uint256 forVotes,
    uint256 againstVotes,
    uint8 state  // 0=Pending, 1=Active, 2=Canceled, 3=Defeated, 4=Succeeded, 5=Executed
)
```

---

#### `castVote`
Cast a vote (called by VotingAgent internally).

```solidity
function castVote(uint256 proposalId, uint8 support) external returns (uint256)
```

---

### Events

```solidity
// New proposal created - BACKEND MUST LISTEN TO THIS
event ProposalCreated(
    uint256 proposalId,
    address proposer,
    address[] targets,
    uint256[] values,
    string[] signatures,
    bytes[] calldatas,
    uint256 startBlock,
    uint256 endBlock,
    string description
);

// Vote cast
event VoteCast(
    address indexed voter,
    uint256 proposalId,
    uint8 support,
    uint256 weight,
    string reason
);

// Proposal executed
event ProposalExecuted(uint256 proposalId);
```

**Backend Scanner Example:**
```javascript
// This is how the scanner detects new proposals
governor.on("ProposalCreated", async (
    proposalId,
    proposer,
    targets,
    values,
    signatures,
    calldatas,
    startBlock,
    endBlock,
    description
) => {
    console.log(`New proposal detected: ${proposalId}`);
    
    // Trigger AI analysis
    await analyzeProposal({
        proposalId,
        proposer,
        targets,
        values,
        description,
        deadline: endBlock
    });
});
```

---

## 📦 Contract 3: AuditLogger.sol

### Purpose
Immutable on-chain record of all AI decisions.

### Functions

#### `logDecision` (Called by VotingAgent only)
```solidity
function logDecision(
    uint256 proposalId,
    address user,
    uint8 support,
    uint256 riskScore,
    bytes32 reportHash
) external onlyVotingAgent
```

---

#### `getProposalAudit`
Get all audit entries for a proposal.

```solidity
function getProposalAudit(uint256 proposalId) 
    external view returns (AuditEntry[] memory)
```

**Frontend Example:**
```javascript
const audits = await auditLogger.getProposalAudit(proposalId);

audits.forEach(entry => {
    console.log(`User: ${entry.user}`);
    console.log(`Vote: ${entry.support === 1 ? 'FOR' : 'AGAINST'}`);
    console.log(`Risk Score: ${entry.riskScore}`);
    console.log(`Report: ipfs://${entry.reportHash}`);
});
```

---

#### `getUserAuditHistory`
Get voting history for a user.

```solidity
function getUserAuditHistory(address user, uint256 limit) 
    external view returns (AuditEntry[] memory)
```

---

### Events

```solidity
event DecisionLogged(
    uint256 indexed proposalId,
    address indexed user,
    uint256 riskScore,
    bytes32 reportHash
);
```

---

## 🔌 Integration Cheat Sheet

### For Frontend Team

```javascript
import { ethers } from "ethers";
import VotingAgentABI from "./abis/VotingAgent.json";
import AuditLoggerABI from "./abis/AuditLogger.json";

// Connect to contracts
const votingAgent = new ethers.Contract(VOTING_AGENT_ADDRESS, VotingAgentABI, signer);
const auditLogger = new ethers.Contract(AUDIT_LOGGER_ADDRESS, AuditLoggerABI, provider);

// ===== USER ACTIONS =====

// 1. Delegate voting power
async function delegate(daoAddress, riskThreshold) {
    const tx = await votingAgent.delegateVotingPower(daoAddress, riskThreshold, false);
    await tx.wait();
}

// 2. Check delegation status
async function checkDelegation(userAddress, daoAddress) {
    return await votingAgent.getDelegation(userAddress, daoAddress);
}

// 3. Revoke delegation
async function revoke(daoAddress) {
    const tx = await votingAgent.revokeDelegation(daoAddress);
    await tx.wait();
}

// 4. Approve high-risk vote
async function approveVote(daoAddress, proposalId, voteFor) {
    const tx = await votingAgent.approveHighRiskVote(
        daoAddress, 
        proposalId, 
        voteFor ? 1 : 0
    );
    await tx.wait();
}

// 5. Get user's voting history
async function getHistory(userAddress) {
    return await auditLogger.getUserAuditHistory(userAddress, 20);
}

// ===== EVENT LISTENERS =====

// Listen for high-risk alerts
votingAgent.on("HighRiskProposalDetected", (proposalId, user, risk) => {
    showAlert(`Proposal ${proposalId} flagged with risk ${risk}!`);
});

// Listen for successful AI votes
votingAgent.on("VoteCastByAI", (proposalId, user, support, risk) => {
    showToast(`AI voted ${support === 1 ? 'FOR' : 'AGAINST'} proposal ${proposalId}`);
});
```

---

### For Backend Team

```javascript
import { ethers } from "ethers";

// Use dedicated backend wallet
const backendWallet = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider);
const votingAgent = new ethers.Contract(VOTING_AGENT_ADDRESS, VotingAgentABI, backendWallet);
const governor = new ethers.Contract(GOVERNOR_ADDRESS, GovernorABI, provider);

// ===== PROPOSAL SCANNER =====

async function startScanner() {
    console.log("Starting proposal scanner...");
    
    governor.on("ProposalCreated", async (proposalId, proposer, ...args) => {
        console.log(`New proposal: ${proposalId}`);
        
        // Get full proposal details
        const proposal = await governor.getProposal(proposalId);
        
        // Trigger AI analysis pipeline
        await analyzeAndVote(proposalId, proposal);
    });
}

// ===== AI VOTING PIPELINE =====

async function analyzeAndVote(proposalId, proposal) {
    // 1. Run AI analysis (your AI team's code)
    const { riskScore, reportIPFSHash, recommendation } = await runAIAnalysis(proposal);
    
    // 2. Get all users who delegated to this DAO
    const delegators = await getDelegators(proposal.daoAddress);
    
    // 3. Vote for each eligible user
    for (const user of delegators) {
        const delegation = await votingAgent.getDelegation(user, proposal.daoAddress);
        
        if (!delegation.active) continue;
        
        // Convert IPFS hash to bytes32
        const reportHash = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(reportIPFSHash)
        );
        
        try {
            const tx = await votingAgent.castVoteWithRisk(
                proposal.daoAddress,
                proposalId,
                user,
                recommendation,  // 0 or 1
                riskScore,
                reportHash
            );
            await tx.wait();
            console.log(`Voted for user ${user}`);
        } catch (error) {
            // Likely risk > threshold, event emitted instead
            console.log(`Vote blocked for ${user}: ${error.message}`);
        }
    }
}

// ===== NOTIFICATION SERVICE =====

votingAgent.on("HighRiskProposalDetected", async (proposalId, user, riskScore) => {
    // Send push notification, email, etc.
    await sendNotification(user, {
        type: "HIGH_RISK_ALERT",
        proposalId,
        riskScore,
        message: `Proposal ${proposalId} has risk score ${riskScore}. Review required.`
    });
});

votingAgent.on("ApprovalRequired", async (proposalId, user, riskScore) => {
    await sendNotification(user, {
        type: "APPROVAL_NEEDED",
        proposalId,
        riskScore,
        message: `Proposal ${proposalId} needs your approval. Risk: ${riskScore}`
    });
});
```

---

## 🧪 Testing Checklist

### Smart Contract Tests
- [ ] User can delegate voting power
- [ ] User can revoke delegation
- [ ] AI can cast vote when risk < threshold
- [ ] AI cannot cast vote when risk >= threshold
- [ ] High risk emits HighRiskProposalDetected event
- [ ] User can approve high-risk vote manually
- [ ] Audit log records all decisions
- [ ] Only AI backend can call castVoteWithRisk
- [ ] Emergency pause works
- [ ] Emergency revokeAll works

### Integration Tests
- [ ] Frontend can connect wallet
- [ ] Frontend can delegate/revoke
- [ ] Backend scanner detects proposals
- [ ] Backend can cast votes
- [ ] Events trigger notifications
- [ ] Audit trail is queryable

---

## 🚨 Error Codes

| Error | Meaning | Solution |
|-------|---------|----------|
| `NotDelegated` | User hasn't delegated | Call `delegateVotingPower` first |
| `ContractPaused` | Emergency pause active | Wait for admin to unpause |
| `UnauthorizedBackend` | Caller not AI backend | Use correct backend wallet |
| `InvalidThreshold` | Risk threshold > 100 | Use value 0-100 |
| `ProposalNotActive` | Voting period ended | Cannot vote anymore |
| `AlreadyVoted` | User already voted | Each user votes once per proposal |

---

## 📁 File Structure

```
contracts/
├── VotingAgent.sol       # Core AI voting contract
├── AuditLogger.sol       # Audit trail storage
├── DAOGovernor.sol       # DAO governance (OpenZeppelin based)
├── MockToken.sol         # Test token for development
└── interfaces/
    ├── IVotingAgent.sol
    ├── IAuditLogger.sol
    └── IDAOGovernor.sol

scripts/
├── deploy.js             # Deployment script
├── setup-test-dao.js     # Create mock DAO + proposals
└── verify.js             # Verify on block explorer

test/
├── VotingAgent.test.js
├── AuditLogger.test.js
└── integration.test.js

abis/                     # Generated ABIs for frontend/backend
├── VotingAgent.json
├── AuditLogger.json
└── DAOGovernor.json
```

---

## 📞 Contact

**Solidity Lead:** [Your Name]  
**Questions:** Post in #smart-contracts Discord channel

---

## 📝 Changelog

| Date | Version | Changes |
|------|---------|---------|
| Jan 23, 2026 | 1.0 | Initial document |

---

*This document will be updated as contracts are deployed and ABIs are generated.*
