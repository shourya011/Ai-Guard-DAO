# Monad DAO Deployment Scripts

## Overview

This folder contains all deployment and configuration scripts for the Monad DAO system.

## Script Descriptions

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `deploy.js` | Deploy all contracts | Initial deployment |
| `deploy-token.js` | Deploy only DAOToken | Token testing |
| `setup-dao.js` | Configure DAO parameters | After deployment |
| `register-ai-agent.js` | Connect AI Guard Dog | After both systems deployed |
| `create-test-proposal.js` | Create test proposals | Testing/Demo |
| `verify-contracts.js` | Verify on explorer | After mainnet deployment |

---

## Deployment Order

```
1. deploy.js           → Deploys all 8 contracts
2. setup-dao.js        → Configures parameters
3. register-ai-agent.js → Connects AI Guard Dog
4. create-test-proposal.js → Creates demo proposals
```

---

## Quick Start

### Local Development
```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/setup-dao.js --network localhost
```

### Monad Testnet
```bash
# Set your private key
export PRIVATE_KEY=your_private_key_here

# Deploy
npx hardhat run scripts/deploy.js --network monadTestnet
npx hardhat run scripts/setup-dao.js --network monadTestnet
npx hardhat run scripts/verify-contracts.js --network monadTestnet
```

---

## Environment Variables

Create a `.env` file in the monad-dao folder:

```env
PRIVATE_KEY=your_private_key
MONAD_TESTNET_RPC=https://testnet.monad.xyz
MONAD_MAINNET_RPC=https://mainnet.monad.xyz
ETHERSCAN_API_KEY=your_api_key
```

---

## Output Files

After deployment, these files are created:

| File | Contents |
|------|----------|
| `deployment.json` | All contract addresses |
| `deployment-localhost.json` | Local deployment addresses |
| `deployment-monadTestnet.json` | Testnet addresses |

---

## Script Details

### 1. deploy.js
**Deploys:** DAOToken, Treasury, Timelock, MemberRegistry, ProposalManager, VotingEngine, DAOCore, AIAgentRegistry

**Order matters because:**
- Treasury needs DAOToken address
- ProposalManager needs VotingEngine address
- DAOCore needs all addresses for initialization

### 2. deploy-token.js
**Deploys:** Only DAOToken

**Use case:** When you want to test token functionality (minting, delegation, transfers) without deploying the full DAO.

### 3. setup-dao.js
**Configures:**
- Voting delay (blocks before voting starts)
- Voting period (how long voting lasts)
- Quorum percentage
- Treasury spending limits
- Admin roles

### 4. register-ai-agent.js
**Does:**
- Reads VotingAgent address from GuardDao deployment
- Registers agent in AIAgentRegistry
- Authorizes agent in VotingEngine
- Sets up test user delegation

### 5. create-test-proposal.js
**Creates:**
- Safe proposal (low risk)
- Medium risk proposal
- High risk proposal (for AI to flag)

**Perfect for hackathon demo!**

### 6. verify-contracts.js
**Verifies all contracts on block explorer**

Required for mainnet to show users the source code is legitimate.

---

## Integration with AI Guard Dog

After deploying monad-dao, update the GuardDao VotingAgent to point to these contracts:

```javascript
// In GuardDao deployment
const votingAgent = await VotingAgent.deploy(
    monadDaoAddresses.daoCore,      // From monad-dao deployment
    monadDaoAddresses.votingEngine,
    auditLogger.address
);
```

Then run `register-ai-agent.js` to complete the connection.
