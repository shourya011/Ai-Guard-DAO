# Team Setup Instructions

## Quick Start

1. Clone the repo
2. Copy the `.env` files below
3. Run `npm install` in `react-app/`
4. Run `npm run dev` in `react-app/`

---

## Contract Addresses (Monad Testnet - Already Deployed!)

These contracts are LIVE on Monad Testnet. No need to redeploy.

```
Network: Monad Testnet
Chain ID: 10143
RPC URL: https://testnet-rpc.monad.xyz
Explorer: https://testnet.monadexplorer.com
```

### Deployed Contract Addresses

| Contract | Address |
|----------|---------|
| DAOCore | `0x2C79715bb243195869AbC6D0ABf082D324983852` |
| DAOToken | `0x4C7f1d5E2eb1625dF98227Bb6672B3e70741923c` |
| Treasury | `0xf6b0357ECc520359F7B554133D6c9202c0ffE171` |
| ProposalManager | `0x7Ca8EdD9C7EDAF030AEFa606E88cd8749c76F625` |
| VotingEngine | `0xAC881ad247fA2f8e68AdBf6010C0F71d6B659489` |
| MemberRegistry | `0x121dCc4213A5eED076D0456759FCc75E4D2244e5` |
| Timelock | `0x084A61FeBA222fA117e29ab27239a3E5a05B73Fe` |
| AIAgentRegistry | `0x9c70fE07B00f130B22D9c185C573E2A415c4737C` |

---

## Setup Files

### Create `react-app/.env`

```env
# Monad Testnet RPC
RPC_URL=https://testnet-rpc.monad.xyz

# Contract Addresses - Deployed to Monad Testnet
PROPOSAL_MANAGER_ADDRESS=0x7Ca8EdD9C7EDAF030AEFa606E88cd8749c76F625
VOTING_ENGINE_ADDRESS=0xAC881ad247fA2f8e68AdBf6010C0F71d6B659489
TREASURY_ADDRESS=0xf6b0357ECc520359F7B554133D6c9202c0ffE171
DAO_TOKEN_ADDRESS=0x4C7f1d5E2eb1625dF98227Bb6672B3e70741923c
DAO_CORE_ADDRESS=0x2C79715bb243195869AbC6D0ABf082D324983852
MEMBER_REGISTRY_ADDRESS=0x121dCc4213A5eED076D0456759FCc75E4D2244e5
AI_AGENT_REGISTRY_ADDRESS=0x9c70fE07B00f130B22D9c185C573E2A415c4737C
```

### Create `monad-dao/.env` (Only if deploying new contracts)

```env
# Only needed if you want to deploy new contracts or create proposals
PRIVATE_KEY=your_wallet_private_key_here
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
```

---

## AI Integration Points

Search for `AI-Integration_GuardDAO` in the codebase. Key files:

| File | What to integrate |
|------|-------------------|
| `react-app/server/contractService.js` | Replace placeholder risk scores |
| `react-app/server/index.js` | `/api/analyze` endpoint |

### Fields to populate:
- `riskScore` (0-100)
- `riskLevel` (low/medium/high/critical)
- `redFlags` (array of warning strings)
- `details.proposerReputation`
- `details.walletAge`
- `details.previousProposals`
- `details.communitySupport`
- `details.smartContractAudit`

---

## Running the App

```bash
# Terminal 1: Start backend server
cd react-app
node server/index.js

# Terminal 2: Start frontend
cd react-app
npm run dev:client
```

Or run both together:
```bash
cd react-app
npm run dev
```

Frontend: http://localhost:3000
API: http://localhost:5002
