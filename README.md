# Project Description: AI Guard Dog Intern
**DAO Treasury Protection & Automated Governance System**

## 1. Executive Summary
The AI Guard Dog Intern is a multi-agent system designed to protect DAO treasuries on the Monad blockchain. The system automates due diligence using a **Tri-Agent Consensus Architecture** (Reputation, NLP, and Human-Aligned Mediation) to assess risk and execute on-chain votes. To combat "Voter Fatigue," the system includes a **Cognitive Augmentation Module** that functions like an intelligent document sidebar—generating instant summaries and key-concept bullet points for reviewers—and a **Local AI Simulator** that provides pre-submission scoring for proposers.

## 2. Problem Statement
* **High Financial Risk:** DAOs lose millions to fraudulent proposals due to insufficient vetting capabilities.
* **Voter Fatigue:** Members lack the bandwidth to research 10-50 technical proposals per month.
* **Lack of Tooling:** No existing automated tools effectively detect fraud, summarize dense content, or provide qualitative feedback to proposers.

## 3. System Architecture: The Tri-Agent Model
The intelligence layer utilizes three specialized agents operating in parallel to cross-verify proposals.



### Agent 1: The Reputation Sentinel
**Function:** Quantitative analysis of identity and history.
* **Input:** Wallet age, transaction history, DAO participation, and social graph (GitHub, X, Discord).
* **Output:** `Reputation Score (0-100)`.

### Agent 2: The NLP Analyst
**Function:** Qualitative semantic analysis of content.
* **Input:** Proposal text, whitepapers, and documentation.
* **Mechanism:** Detects linguistic patterns associated with scams, vague promises, or obfuscated logic.
* **Output:** `NLP Integrity Score (0-100)`.

### Agent 3: The Mediator (Human-Aligned Supervisor)
**Function:** Weighted decision-making based on historical data.
* **Input:** Outputs from Agent 1 and Agent 2.
* **Mechanism:** An ensemble model trained on a dataset of manually reviewed and voted-upon proposals. It adjusts for edge cases and aligns the final output with historical human voting patterns.
* **Output:** `Composite Risk Score (0-100)`.

## 4. Operational Modules

### Module A: Immutable Audit & Logging
Handles the transparency layer to ensure verifiability.
* **Aggregation:** Compiles reasoning logs from all three agents.
* **On-Chain Storage:** Hashes the "Reasoning Report" and stores the `riskHash` and `Composite Risk Score` on Monad.
* **Traceability:** Ensures every vote is cryptographically linked to specific agent outputs.

### Module B: Human Review Routing & Proposal Snapshot
Acts as the "Mid-Range" Gatekeeper and **Intelligent Summary Assistant**.

* **Logic Flow:**
    * **Auto-Reject (80-100 Risk):** Vote "No" / Block.
    * **Auto-Approve (0-19 Risk):** Vote "Yes".
    * **Mid-Range (20-79 Risk):** Route to Human Review Queue.

* **The "Proposal Snapshot" Feature:**
    Designed to mimic the utility of a document summary sidebar, this feature parses dense proposals to generate a **Structured Synopsis** for the human reviewer interface:
    * **Executive Summary:** A 2-3 sentence paragraph distilling the core intent of the proposal (e.g., *"This proposal requests 50k USDC to fund a 3-month audit of the protocol's liquidity pools..."*).
    * **Key Concept Extraction (Bulleted):**
        * **Deliverables:** Specific outputs (e.g., Audit Report, Patch Fixes).
        * **Timeline:** Duration and milestones (e.g., Phase 1: Jan-Feb).
        * **Budget:** Total ask and allocation breakdown.
    * **Risk Profile:**
        * **Agent Alerts:** Bolded flags explaining *why* it needs review (e.g., **"Agent 1 Flag:** Wallet age < 30 days").

### Module C: Local AI Agent (Proposal Simulator)
A standalone tool for Proposers (pre-submission) and Voters (quick insights).

* **Scoring:** Analyzes drafts and predicts the likelihood of passing (e.g., "65% Success Probability").
* **Optimization:** Provides specific feedback to improve scores (e.g., "Add technical architecture diagram to improve NLP Score").
* **Classification:**
    1.  ✅ **Likely Selected**
    2.  ⚠️ **Marked for Human Review**
    3.  ❌ **Likely Rejected**

## 5. Technical Specifications

### Tech Stack
* **Frontend:** React, Next.js, Tailwind CSS.
* **Backend:** Node.js (Orchestration), Python/FastAPI (Agent Logic).
* **AI/ML:**
    * *Reputation:* Graph Neural Networks.
    * *NLP/Summarization:* Transformer models (BERT) + LLM APIs (OpenAI/Anthropic).
    * *Mediator:* XGBoost/Supervised Learning Classifiers.
* **Blockchain:** Solidity, Monad RPC, Ethers.js.

### Smart Contract Interfaces (VotingAgent.sol)
* `delegate(address dao, uint256 amount)`: Assigns voting power.
* `submitScore(uint256 proposalId, uint256 repScore, uint256 nlpScore, uint256 finalScore)`: Records agent data.
* `executeVote(uint256 proposalId)`: Casts vote based on Module B logic.
* `logAudit(uint256 proposalId, string memory ipfsHash)`: Stores hash of the Snapshot and analysis.

## 6. Success Metrics
* **Security:** >95% fraud detection rate via Agent consensus.
* **Efficiency:** Reduce human review time by 50% via the Proposal Snapshot summarization.
* **Speed:** <60s detection and submission time.
* **Quality:** Measurable improvement in proposal quality for DAOs using the Local AI Simulator.

---

## 7. Deployed Smart Contracts

### 🌐 Monad Testnet (Production)

**Network:** Monad Testnet | **Chain ID:** `10143` | **RPC:** `https://testnet-rpc.monad.xyz`

| Contract | Address | Purpose |
|----------|---------|---------|
| **DAOCore** | `0x75D2e00ecA54e5C96707eAf4ECcFe644dEC6a351` | Main DAO controller |
| **DAOToken** | `0x4a6a8609Eeec4Fec9115D68Bf37F2d90e062B73f` | ERC20 governance token (MDAO) |
| **Treasury** | `0xF10fb506c5dF5c8EB02BCe9eB047ad50095260D7` | Holds DAO funds |
| **ProposalManager** | `0xF1ed240C75AecfDde7DBD5D232dfA8fbc92Cebdc` | Creates/manages proposals |
| **VotingEngine** | `0xe4c07c4852A3c7c8d12c3aC3e0e31D5E5025E591` | Voting logic and tallying |
| **MemberRegistry** | `0x7a1Ff7b109eC6D1cd3cF8ee6376477E8B75Bf8c2` | Tracks DAO membership |
| **Timelock** | `0x51496afdCdEDDd47e67A64217787fe200640f8d6` | Delays execution for security |
| **AIAgentRegistry** | `0x2bbe8673Fd1cd11e133990471f8B1CB6809398FC` | Registers AI Guard Dog agents |

**Block Explorer:** [monad-testnet.socialscan.io](https://monad-testnet.socialscan.io)

### 🖥️ Localhost (Development)

**Network:** Hardhat | **Chain ID:** `31337` | **RPC:** `http://127.0.0.1:8545`

| Contract | Address | Purpose |
|----------|---------|---------|
| **AuditLogger** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Logs AI reasoning & audits |
| **VotingAgent** | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | AI agent voting execution |
| **MockToken** | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` | Test governance token |
| **DAOGovernor** | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` | Governor implementation |

> ⚠️ Localhost contracts only exist when running `npx hardhat node`

Deploy link: https://guard-cn4p55rao-ojhasanay-2913s-projects.vercel.app/
