# 🛡️ AI Guard Dog Intern

> **Autonomous DAO Treasury Protection & Intelligent Governance System**

---

## 📋 Overview

AI Guard Dog Intern is an advanced multi-agent intelligence system built to safeguard DAO treasuries on the Monad blockchain. By leveraging a **Tri-Agent Consensus Architecture**, the platform automates comprehensive due diligence—analyzing reputation, semantics, and human-aligned decision patterns—to assess proposal risk and execute automated on-chain voting.

The system directly addresses "Voter Fatigue" through a **Cognitive Augmentation Module** that delivers instant proposal summaries and key insights (similar to an intelligent document sidebar), plus a **Local AI Simulator** that provides real-time scoring and optimization feedback for proposal authors.

---

## 🎯 The Challenge

DAOs face critical operational bottlenecks:

* **High Financial Risk:** Multi-million dollar losses from fraudulent proposals slip through due to inadequate vetting mechanisms
* **Voter Fatigue:** DAO members struggle to thoroughly review 10-50+ complex technical proposals monthly
* **Tooling Gap:** Current solutions fail to effectively detect fraud, distill dense documentation, or provide actionable feedback to proposers

---

## 🏗️ Architecture: Tri-Agent Intelligence Layer

Our system deploys three specialized AI agents working in parallel to cross-validate every proposal:



#### 🔍 Agent 1: Reputation Sentinel
**Quantitative identity and behavioral analysis**

* **Data Sources:** Wallet age, transaction history, DAO participation records, social graph (GitHub, X, Discord)
* **Delivers:** `Reputation Score (0-100)`

#### 📝 Agent 2: NLP Analyst
**Qualitative semantic content evaluation**

* **Analyzes:** Proposal text, whitepapers, supporting documentation
* **Detection Mechanisms:** Identifies linguistic patterns indicative of scams, vague commitments, or deliberately obfuscated logic
* **Delivers:** `NLP Integrity Score (0-100)`

#### ⚖️ Agent 3: Mediator (Human-Aligned Supervisor)
**Weighted consensus and historical pattern matching**

* **Input Processing:** Synthesizes outputs from Agent 1 and Agent 2
* **Intelligence Model:** Ensemble classifier trained on manually reviewed proposal datasets, calibrated to match historical human voting patterns and handle edge cases
* **Delivers:** `Composite Risk Score (0-100)`

---

## ⚙️ Core Modules

### 🔐 Module A: Immutable Audit & Logging
**Cryptographic transparency and traceability**

* **Data Aggregation:** Compiles comprehensive reasoning logs from all three agents
* **On-Chain Storage:** Generates cryptographic hash of the "Reasoning Report" and records both `riskHash` and `Composite Risk Score` on Monad
* **Audit Trail:** Every vote is cryptographically linked to specific agent outputs for full verifiability

### 🎛️ Module B: Human Review Routing & Proposal Snapshot
**Intelligent gating system with automated summarization**

**Decision Logic:**
* **🚫 Auto-Reject (80-100 Risk):** Immediate "No" vote / Block
* **✅ Auto-Approve (0-19 Risk):** Immediate "Yes" vote
* **⚠️ Mid-Range (20-79 Risk):** Route to Human Review Queue

**Proposal Snapshot Feature:**  
Mimics an intelligent document sidebar, transforming dense proposals into a structured synopsis:

* **Executive Summary:** 2-3 sentence distillation of core intent  
  *Example: "This proposal requests 50k USDC to fund a 3-month audit of the protocol's liquidity pools..."*

* **Key Concept Extraction (Bulleted):**
  * **Deliverables:** Specific outputs (e.g., Audit Report, Patch Fixes)
  * **Timeline:** Duration and milestones (e.g., Phase 1: Jan-Feb)
  * **Budget:** Total funding request and allocation breakdown

* **Risk Profile:**
  * **Agent Alerts:** Highlighted flags explaining review triggers  
    *Example:* **"Agent 1 Flag:** Wallet age < 30 days"

### 🤖 Module C: Local AI Agent (Proposal Simulator)
**Pre-submission analysis tool for proposers and voters**

* **Predictive Scoring:** Analyzes draft proposals and predicts passage probability (e.g., "65% Success Probability")
* **Optimization Guidance:** Provides actionable feedback to improve scores  
  *Example:* "Add technical architecture diagram to improve NLP Score"
* **Classification System:**
  1. ✅ **Likely Selected**
  2. ⚠️ **Marked for Human Review**
  3. ❌ **Likely Rejected**

---

## 🛠️ Technical Stack

**Frontend**
* React, Next.js, Tailwind CSS

**Backend**
* Node.js (Orchestration), Python/FastAPI (Agent Logic)

**AI/ML Components**
* *Reputation Analysis:* Graph Neural Networks
* *NLP/Summarization:* Transformer models (BERT) + LLM APIs (OpenAI/Anthropic)
* *Mediator:* XGBoost/Supervised Learning Classifiers

**Blockchain**
* Solidity, Monad RPC, Ethers.js

### 📜 Smart Contract Interfaces (VotingAgent.sol)

```solidity
delegate(address dao, uint256 amount)
// Assigns voting power to the AI agent

submitScore(uint256 proposalId, uint256 repScore, uint256 nlpScore, uint256 finalScore)
// Records all agent analysis data on-chain

executeVote(uint256 proposalId)
// Casts automated vote based on Module B logic

logAudit(uint256 proposalId, string memory ipfsHash)
// Stores hash of Proposal Snapshot and full analysis
```

---

## 📊 Success Metrics

* **Security:** >95% fraud detection rate via Agent consensus
* **Efficiency:** 50% reduction in human review time through Proposal Snapshot summarization
* **Speed:** <60 second end-to-end detection and submission time
* **Quality:** Measurable improvement in proposal quality for DAOs utilizing the Local AI Simulator

---

## 🌐 Deployed Smart Contracts

### 🚀 Monad Testnet (Production)

**Network Details:** Monad Testnet | **Chain ID:** `10143` | **RPC:** `https://testnet-rpc.monad.xyz`

| Contract | Address | Description |
|----------|---------|-------------|
| **DAOCore** | `0x75D2e00ecA54e5C96707eAf4ECcFe644dEC6a351` | Main DAO controller |
| **DAOToken** | `0x4a6a8609Eeec4Fec9115D68Bf37F2d90e062B73f` | ERC20 governance token (MDAO) |
| **Treasury** | `0xF10fb506c5dF5c8EB02BCe9eB047ad50095260D7` | DAO funds management |
| **ProposalManager** | `0xF1ed240C75AecfDde7DBD5D232dfA8fbc92Cebdc` | Proposal creation & management |
| **VotingEngine** | `0xe4c07c4852A3c7c8d12c3aC3e0e31D5E5025E591` | Voting logic and tallying |
| **MemberRegistry** | `0x7a1Ff7b109eC6D1cd3cF8ee6376477E8B75Bf8c2` | DAO membership tracking |
| **Timelock** | `0x51496afdCdEDDd47e67A64217787fe200640f8d6` | Security-focused execution delay |
| **AIAgentRegistry** | `0x2bbe8673Fd1cd11e133990471f8B1CB6809398FC` | AI Guard Dog agent registration |

**Block Explorer:** [monad-testnet.socialscan.io](https://monad-testnet.socialscan.io)

### 💻 Localhost (Development)

**Network Details:** Hardhat | **Chain ID:** `31337` | **RPC:** `http://127.0.0.1:8545`

| Contract | Address | Description |
|----------|---------|-------------|
| **AuditLogger** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | AI reasoning & audit logging |
| **VotingAgent** | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | AI agent voting execution |
| **MockToken** | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` | Test governance token |
| **DAOGovernor** | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` | Governor implementation |

> ⚠️ **Note:** Localhost contracts only exist when running `npx hardhat node`
