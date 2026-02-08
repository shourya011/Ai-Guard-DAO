# AI Guard DAO - Implementation Status & Frontend Integration Guide

## 📋 Project Overview

**AI Guard Dog Intern** is an AI-powered multi-agent system that protects DAO treasuries on Monad by scanning proposals, analyzing risks, and voting on behalf of delegating users based on their risk thresholds.

---

## ✅ What's Already Implemented

### Smart Contracts (Complete ✅)

| Contract | Status | Description |
|----------|--------|-------------|
| **VotingAgent.sol** | ✅ Complete | Core AI voting contract - handles delegations, votes |
| **AuditLogger.sol** | ✅ Complete | Immutable on-chain audit trail for all AI decisions |
| **DAOGovernor.sol** | ✅ Complete | DAO governance - proposals, voting, execution |
| **MockToken.sol** | ✅ Complete | Test token for demo purposes |
| **Interfaces** | ✅ Complete | IVotingAgent, IAuditLogger, IDAOGovernor |

### Backend Services (NEW ✅)

| Service | Status | Description |
|---------|--------|-------------|
| **server.js** | ✅ Complete | Express API server with WebSocket support |
| **contractService.js** | ✅ Complete | Frontend integration library |

### Frontend (Exists - Needs Connection)

| Component | Status | Description |
|-----------|--------|-------------|
| Dashboard | 🟡 UI Only | Uses mock data - needs contract connection |
| Proposals | 🟡 UI Only | Uses mock data - needs contract connection |
| Voting | 🟡 UI Only | Simulated - needs contract connection |
| Settings | 🟡 UI Only | Local storage - needs contract connection |
| Wallet | 🟡 Simulated | Mock wallet - needs real MetaMask integration |

---

## ⚠️ What Still Needs To Be Done

### 1. **Connect Frontend to Real Contracts** 🔴 HIGH PRIORITY

The frontend currently uses mock data. Needs to:

```javascript
// In Frontend/wallet.js - Replace mock with real MetaMask
async connect() {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask not installed');
  }
  
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  this.address = await signer.getAddress();
  
  // Initialize contract service
  await ContractService.init(signer, {
    votingAgent: CONTRACT_ADDRESSES.VotingAgent,
    auditLogger: CONTRACT_ADDRESSES.AuditLogger,
    daoGovernor: CONTRACT_ADDRESSES.DAOGovernor
  });
  
  return { address: this.address, connected: true };
}
```

### 2. **Replace Mock Proposals with Real Data** 🔴 HIGH PRIORITY

```javascript
// In Frontend/proposals.js - Replace generateMockProposals()
async loadProposals() {
  const proposals = await ContractService.getAllProposals();
  
  // Fetch risk scores from backend
  for (const proposal of proposals) {
    const analysis = await fetch(`/api/analyze/${proposal.id}`).then(r => r.json());
    proposal.riskScore = analysis.riskScore;
    proposal.riskLevel = this.getRiskLevel(analysis.riskScore);
  }
  
  return proposals;
}
```

### 3. **Implement Real Delegation Flow** 🔴 HIGH PRIORITY

```javascript
// In settings.js - Replace saveSettings()
async saveSettings() {
  const daoAddress = CONTRACT_ADDRESSES.DAOGovernor;
  const riskThreshold = this.thresholds.autoApprove;
  
  try {
    const receipt = await ContractService.delegate(
      daoAddress,
      riskThreshold,
      false // requireApproval
    );
    
    this.showToast('Delegation successful!', 'success');
  } catch (error) {
    this.showToast(`Delegation failed: ${error.message}`, 'error');
  }
}
```

### 4. **AI Risk Analysis Service** 🟡 MEDIUM PRIORITY

Currently using mock risk scoring in `backend/server.js`. For production:

- [ ] Integrate with actual AI/ML service
- [ ] Implement on-chain/off-chain data analysis
- [ ] GitHub/Twitter/Discord reputation checks
- [ ] Store reports on IPFS/Arweave

### 5. **Real-Time Event Handling** 🟡 MEDIUM PRIORITY

Connect WebSocket for live updates:

```javascript
// In Frontend/app.js
initWebSocket() {
  const ws = new WebSocket('ws://localhost:3001/ws');
  
  ws.onmessage = (event) => {
    const { type, data } = JSON.parse(event.data);
    
    switch (type) {
      case 'proposalCreated':
        this.addNewProposal(data);
        break;
      case 'highRiskAlert':
        this.showHighRiskAlert(data);
        break;
      case 'aiVoteCast':
        this.updateVoteStatus(data);
        break;
    }
  };
}
```

### 6. **Deploy to Monad Testnet** 🟢 LOW PRIORITY (for hackathon demo)

- [ ] Get Monad testnet tokens
- [ ] Configure RPC endpoint
- [ ] Deploy contracts
- [ ] Update frontend with deployed addresses

---

## 🔧 Quick Start Guide

### 1. Setup AI Guard DAO

```bash
cd ai-guard-dao
npm install
```

### 2. Start Local Blockchain

```bash
npx hardhat node
```

### 3. Deploy Contracts

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 4. Start Backend Server

```bash
npm run backend
```

### 5. Connect Frontend

Copy `backend/contractService.js` to `Frontend/` and update wallet.js:

```javascript
// Add to Frontend/index.html
<script src="https://cdn.ethers.io/lib/ethers-6.9.umd.min.js"></script>
<script src="contractService.js"></script>
```

---

## 📁 File Structure

```
ai-guard-dao/
├── contracts/
│   ├── VotingAgent.sol      # Core AI voting contract
│   ├── AuditLogger.sol      # Audit trail storage
│   ├── DAOGovernor.sol      # DAO governance
│   ├── MockToken.sol        # Test token
│   └── interfaces/
│       ├── IVotingAgent.sol
│       ├── IAuditLogger.sol
│       └── IDAOGovernor.sol
├── scripts/
│   └── deploy.js            # Deployment script
├── backend/
│   ├── server.js            # API + WebSocket server
│   └── contractService.js   # Frontend integration library
├── abis/                    # Generated ABIs
├── deployments/             # Deployment info
├── hardhat.config.js
├── package.json
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/contracts` | Get deployed contract addresses |
| GET | `/api/proposals` | Get all proposals |
| GET | `/api/proposals/:id` | Get specific proposal |
| GET | `/api/delegation/:user/:dao` | Check delegation status |
| GET | `/api/audit/:user` | Get user's audit history |
| GET | `/api/stats` | Get statistics |
| POST | `/api/analyze/:id` | Trigger AI analysis |
| WS | `/ws` | WebSocket for real-time events |

---

## 🎯 Frontend Integration Checklist

### wallet.js
- [ ] Replace mock wallet with real MetaMask connection
- [ ] Add network switching to Monad
- [ ] Initialize ContractService on connect

### proposals.js
- [ ] Replace mock proposals with `ContractService.getAllProposals()`
- [ ] Fetch real risk scores from backend
- [ ] Add WebSocket listeners for new proposals

### app.js
- [ ] Initialize WebSocket connection
- [ ] Handle real-time events
- [ ] Update dashboard stats from contracts

### settings.js
- [ ] Save delegation settings to blockchain
- [ ] Load existing delegation on page load
- [ ] Add revoke delegation button

### voting.js
- [ ] Implement `ContractService.castVote()` calls
- [ ] Implement `ContractService.approveHighRiskVote()`
- [ ] Show transaction status/confirmation

### review.js
- [ ] Load audit history from `ContractService.getUserAuditHistory()`
- [ ] Show real proposal analysis data

---

## 📊 Contract Functions Quick Reference

### VotingAgent (User Functions)
```javascript
// Delegate voting power
await ContractService.delegate(daoAddress, riskThreshold, requireApproval);

// Revoke delegation
await ContractService.revokeDelegation(daoAddress);

// Revoke ALL (emergency)
await ContractService.revokeAll();

// Approve high-risk vote manually
await ContractService.approveHighRiskVote(daoAddress, proposalId, support);

// Update risk threshold
await ContractService.updateRiskThreshold(daoAddress, newThreshold);

// Check delegation status
const delegation = await ContractService.getDelegation(userAddress, daoAddress);
```

### DAOGovernor (Proposal Functions)
```javascript
// Get all proposals
const proposals = await ContractService.getAllProposals();

// Get specific proposal
const proposal = await ContractService.getProposal(proposalId);

// Create proposal
const { receipt, proposalId } = await ContractService.createProposal(
  targets, values, calldatas, description
);

// Cast vote directly
await ContractService.castVote(proposalId, support);
```

### AuditLogger (View Functions)
```javascript
// Get user's voting history
const history = await ContractService.getUserAuditHistory(userAddress, limit);

// Get proposal audit trail
const audit = await ContractService.getProposalAudit(proposalId);

// Get statistics
const totalDecisions = await ContractService.getTotalDecisions();
const highRiskFlags = await ContractService.getTotalHighRiskFlags();
```

---

## 🚀 Demo Flow (For Hackathon)

1. **Deploy Contracts** → Run `npm run deploy:local`
2. **Start Backend** → Run `npm run backend`
3. **Connect Wallet** → User connects MetaMask
4. **Delegate Voting** → User sets risk threshold (e.g., 50)
5. **Create Proposals** → Submit 3 test proposals (safe, medium, scam)
6. **AI Analyzes** → Backend scores each proposal
7. **AI Votes** → Safe proposals auto-voted
8. **High Risk Alert** → Scam proposal flagged for user review
9. **View Audit Trail** → All decisions logged on-chain

---

## 📝 Environment Variables

Create `.env` file:

```env
# Network Configuration
RPC_URL=http://127.0.0.1:8545
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAIN_ID=10001

# Backend Configuration
PORT=3001
BACKEND_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Contract Addresses (populated after deployment)
VOTING_AGENT_ADDRESS=
AUDIT_LOGGER_ADDRESS=
DAO_GOVERNOR_ADDRESS=
MOCK_TOKEN_ADDRESS=

# Optional: For production deployment
PRIVATE_KEY=your_deployment_private_key
```

---

## 🔒 Security Notes

1. **Non-Custodial**: User tokens NEVER enter the VotingAgent contract
2. **Revocable**: Users can revoke delegation instantly at any time
3. **Threshold-Based**: AI only votes if risk < user's threshold
4. **Transparent**: All decisions logged to AuditLogger on-chain
5. **Pausable**: Emergency pause if issues detected

---

## 📞 Next Steps

1. Copy `contractService.js` to Frontend folder
2. Add ethers.js to Frontend HTML
3. Update wallet.js with real MetaMask integration
4. Replace mock data in proposals.js
5. Connect settings to delegation functions
6. Add WebSocket for real-time updates
7. Test end-to-end flow locally
8. Deploy to Monad testnet for demo

---

*Last Updated: January 24, 2026*
