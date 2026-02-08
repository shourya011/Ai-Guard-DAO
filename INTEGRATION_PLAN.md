# Integration Plan: Frontend ↔ Monad-DAO

## ✅ Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `react-app/server/contractService.js` | ✅ Created | ethers.js connection to monad-dao contracts |
| `react-app/server/abis/ProposalManager.json` | ✅ Created | ABI for ProposalManager contract |
| `react-app/server/abis/VotingEngine.json` | ✅ Created | ABI for VotingEngine contract |
| `react-app/server/index.js` | ✅ Updated | Contract reading + mock fallback |
| `react-app/.env.example` | ✅ Updated | Environment variables template |
| `react-app/package.json` | ✅ Updated | Added ethers ^6.9.0, dotenv ^16.3.1 |
| `monad-dao/hardhat.config.js` | ✅ Updated | Fixed Chain ID to 10143 |

---

## Monad Testnet Setup

### Network Details
```
Network Name: Monad Testnet
RPC URL: https://testnet-rpc.monad.xyz
Chain ID: 10143
Currency: MON
Block Explorer: https://testnet.monadexplorer.com
```

### Deployment Steps

1. **Get testnet MON from faucet**

2. **Create `.env` in monad-dao folder**
   ```
   PRIVATE_KEY=0x_your_private_key_here
   MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
   ```

3. **Deploy contracts to Monad Testnet**
   ```bash
   cd monad-dao
   npx hardhat run scripts/deploy.js --network monadTestnet
   ```

4. **Copy addresses from deployment.json to react-app/.env**
   ```
   RPC_URL=https://testnet-rpc.monad.xyz
   PROPOSAL_MANAGER_ADDRESS=0x...
   VOTING_ENGINE_ADDRESS=0x...
   TREASURY_ADDRESS=0x...
   DAO_TOKEN_ADDRESS=0x...
   ```

5. **Create test proposals**
   ```bash
   npx hardhat run scripts/create-test-proposal.js --network monadTestnet
   ```

6. **Start frontend**
   ```bash
   cd react-app
   npm run dev
   ```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Connection status (contract/mock mode) |
| `/api/proposals` | GET | All proposals |
| `/api/proposals/:id` | GET | Single proposal |
| `/api/stats` | GET | Dashboard statistics |
| `/api/analyze` | POST | AI-Integration_GuardDAO: Risk analysis |

---

## Environment Modes

| Mode | When | Data Source |
|------|------|-------------|
| Contract | `.env` has addresses + RPC reachable | Blockchain |
| Mock | No `.env` or RPC unreachable | Hardcoded test data |

---

## AI-Integration_GuardDAO Placeholders

Search for `AI-Integration_GuardDAO` in codebase. These fields need AI agent:

| Field | Location | Expected AI Input |
|-------|----------|-------------------|
| `riskScore` | contractService.js:178 | 0-100 risk value |
| `riskLevel` | contractService.js:179 | low/medium/high/critical |
| `redFlags` | contractService.js:180 | Array of warning strings |
| `details.proposerReputation` | contractService.js:183 | Wallet analysis |
| `details.walletAge` | contractService.js:184 | On-chain age |
| `details.previousProposals` | contractService.js:185 | History count |
| `details.communitySupport` | contractService.js:186 | Sentiment score |
| `details.smartContractAudit` | contractService.js:187 | Verification status |
| `/api/analyze` endpoint | index.js:205 | Full analysis logic |

---

## Quick Test (Local Hardhat)

```bash
# Terminal 1: Start Hardhat node
cd monad-dao
npx hardhat node

# Terminal 2: Deploy contracts
cd monad-dao
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/create-test-proposal.js --network localhost

# Terminal 3: Create react-app/.env
# Copy addresses from monad-dao/deployment.json
RPC_URL=http://127.0.0.1:8545
PROPOSAL_MANAGER_ADDRESS=0x5081a39b8A5f0E35a8D959395a630b68B74Dd30f
VOTING_ENGINE_ADDRESS=0x1fA02b2d6A771842690194Cf62D91bdd92BfE28d

# Terminal 3: Start frontend
cd react-app
npm run dev
```

---

## Quick Test (Mock Mode - No Blockchain)

```bash
cd react-app
npm run dev
# Server runs in mock mode, shows 3 test proposals
```

---

## What's Next

1. **Test mock mode** - Run `npm run dev` in react-app, should show test proposals
2. **Get MON tokens** - From Monad testnet faucet
3. **Deploy to testnet** - Use steps above
4. **Teammates integrate** - Search `AI-Integration_GuardDAO` for wallet/AI hookup points
