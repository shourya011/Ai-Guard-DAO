"""
Test Proposal Examples for AI Guard Dog

Contains categorized example proposals for testing and demonstration:
- GOOD: Should be AUTO_APPROVED (risk 0-19)
- BAD: Should be AUTO_REJECTED (risk 80-100)
- REVIEW: Should require HUMAN_REVIEW (risk 20-79)

Usage:
    from app.examples.test_proposals import GOOD_PROPOSALS, BAD_PROPOSALS, REVIEW_PROPOSALS
    
    # Or run tests directly:
    python -m app.examples.test_proposals
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class TestProposal:
    """Test proposal data structure"""
    id: str
    name: str
    wallet_address: str
    text: str
    expected_classification: str  # "GOOD", "BAD", "REVIEW"
    expected_risk_range: tuple  # (min, max) expected risk score
    description: str  # Why this should be classified this way


# ═══════════════════════════════════════════════════════════════
# GOOD PROPOSALS - Should be AUTO_APPROVED (Risk: 0-19)
# ═══════════════════════════════════════════════════════════════

GOOD_PROPOSALS = [
    TestProposal(
        id="UNI-2026-001",
        name="Protocol Security Audit - Trail of Bits",
        wallet_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",  # Verified: Trail of Bits Multi-sig
        expected_classification="GOOD",
        expected_risk_range=(0, 19),
        description="Established security firm, verified multi-sig, detailed scope, milestone payments",
        text="""# Protocol Security Audit - Trail of Bits

## Proposal ID: UNI-2026-001
## Amount Requested: 150,000 USDC
## Duration: 8 weeks (Feb 1 - March 28, 2026)

### Executive Summary
Trail of Bits, a leading blockchain security firm with 8+ years of experience, proposes to conduct a comprehensive security audit of the Uniswap V4 hooks implementation prior to mainnet deployment.

### Detailed Scope of Work

**Phase 1 (Weeks 1-3): Static Analysis**
- Manual code review of all V4 hook contracts
- Automated vulnerability scanning using Slither and custom tooling
- Architecture review of hook permission model

**Phase 2 (Weeks 4-6): Dynamic Testing**
- Fuzzing campaigns on hook interaction patterns
- Economic attack vector simulation
- Gas optimization analysis

**Phase 3 (Weeks 7-8): Reporting & Remediation**
- Detailed vulnerability report with severity classifications
- Remediation recommendations with code samples
- Re-audit of critical fixes (included in scope)

### Deliverables
1. **Preliminary Findings Report** (Week 4)
2. **Final Audit Report** (Week 7) - Public release
3. **Remediation Verification Report** (Week 8)
4. **Post-audit workshop** with core dev team (1 session)

### Budget Breakdown
| Item | Cost |
|------|------|
| Senior Security Engineer (320 hours @ $300/hr) | $96,000 |
| Junior Security Engineer (160 hours @ $200/hr) | $32,000 |
| Automated Tooling & Infrastructure | $12,000 |
| Report Writing & Documentation | $10,000 |
| **Total** | **$150,000** |

### Team Credentials
- **Lead Auditor:** Dan Guido (Founder, Trail of Bits)
- **Technical Lead:** Josselin Feist (Creator of Slither)
- **Previous Clients:** Uniswap V3 (2021), MakerDAO, Compound, Aave
- **Track Record:** 300+ audits, $2B+ in assets secured

### Success Metrics
- Zero critical vulnerabilities post-deployment (6-month window)
- All high-severity findings remediated before mainnet
- Public report published with DAO transparency

### Proposer Verification
- **GitHub:** https://github.com/trailofbits (2.1k repos, 8 years)
- **Past Proposals:** 3 previous audits for Uniswap (all delivered on-time)
- **Wallet Age:** 1,847 days
- **DAO Participation:** Active voter in 47 proposals

### References
- V3 Audit Report: https://github.com/Uniswap/v3-core/blob/main/audits/tob/audit.pdf
- Website: https://www.trailofbits.com
"""
    ),
    
    TestProposal(
        id="UNI-2026-002",
        name="Cross-Chain Bridge Integration - LayerZero Partnership",
        wallet_address="0x1a9C8182C09F50C8318d769245beA52c32BE35BC",  # LayerZero Labs Multi-sig
        expected_classification="GOOD",
        expected_risk_range=(0, 19),
        description="Established protocol, detailed technical spec, milestone payments, community feedback",
        text="""# Cross-Chain Bridge Integration - LayerZero Partnership

## Proposal ID: UNI-2026-002
## Amount Requested: 75,000 USDC + 25,000 UNI
## Duration: 12 weeks (Feb 15 - May 10, 2026)

### Executive Summary
LayerZero Labs proposes to integrate Uniswap liquidity pools with 5 new EVM chains (Monad, Berachain, MegaETH, Mantle, zkSync Era) via omnichain messaging, enabling seamless cross-chain swaps and liquidity bridging.

### Technical Architecture

**Smart Contract Components:**
1. `OmnichainPoolAdapter.sol` - Wraps Uniswap V3/V4 pools with LayerZero endpoints
2. `CrossChainSwapRouter.sol` - Routes swap intents across chains
3. `LiquidityBridge.sol` - Manages cross-chain LP position synchronization

**Security Model:**
- Deployed on each target chain with identical bytecode
- Uses LayerZero's Ultra Light Node (ULN) verification
- 2-of-3 oracle validation (Chainlink, Google Cloud, Polyhedra)
- 6-hour timelock on large liquidity movements (>$500k)

### Milestones & Payment Schedule

| Milestone | Deliverable | Payment | Timeline |
|-----------|-------------|---------|----------|
| M1 | Smart contract development complete | 25% | Week 4 |
| M2 | Testnet deployment on all 5 chains | 25% | Week 7 |
| M3 | Security audit completion (Zellic) | 25% | Week 10 |
| M4 | Mainnet deployment + 2-week monitoring | 25% | Week 12 |

### Budget Allocation
- **Development:** 40,000 USDC (2 senior Solidity engineers, 8 weeks)
- **Security Audit:** 25,000 USDC (Zellic Labs - pre-contracted)
- **Gas & Deployment:** 10,000 USDC (deployment on 5 chains + testing)
- **UNI Tokens:** For governance participation and protocol alignment

### Risk Mitigation
1. **Technical Risk:** Code reviewed by Uniswap Labs before deployment (commitment letter attached)
2. **Economic Risk:** Initial cap of $10M TVL per chain for first 30 days
3. **Operational Risk:** 24/7 monitoring via LayerZero Labs incident response team

### Team
- **Project Lead:** Ryan Zarick (CTO, LayerZero Labs)
- **Smart Contract Dev:** Bryan Pellegrino (CEO, LayerZero Labs)
- **Integration Engineer:** Assigned from Uniswap Labs partnership program
- **Company Track Record:** $3B+ in cross-chain volume, 50+ protocol integrations

### Success Metrics
- 100k+ cross-chain swaps within 3 months of launch
- <0.1% failed transaction rate
- $50M+ in cross-chain liquidity bridged

### Community Feedback Period
- **Temperature Check:** Passed 87% approval (2,450,000 UNI voted)
- **Forum Discussion:** 127 comments over 3 weeks
- **Technical Review:** Completed by @atiselsts (Uniswap core dev) - approved

### Documentation
- Technical Spec: https://github.com/LayerZero-Labs/uniswap-integration/blob/main/SPEC.md
- Security Model: https://layerzero.network/security
- Testnet Demo: https://testnet.uniswap-lz.xyz
"""
    ),
    
    TestProposal(
        id="UNI-2026-003",
        name="Developer Grant - Uniswap Analytics Dashboard",
        wallet_address="0x50Ec05ADe8280758E2077fcBC08D878D4aef79C3",  # Dune Analytics Team
        expected_classification="GOOD",
        expected_risk_range=(0, 19),
        description="Known team (Dune), modest budget, clear deliverables, open source",
        text="""# Developer Grant - Uniswap Analytics Dashboard

## Proposal ID: UNI-2026-003
## Amount Requested: 35,000 USDC
## Duration: 6 weeks (March 1 - April 12, 2026)

### Executive Summary
Dune Analytics proposes to build a public, real-time analytics dashboard for Uniswap V4 that tracks hook usage, fee tier adoption, and liquidity distribution across all deployed chains.

### Product Specification

**Dashboard Features:**
1. **Hook Analytics Module**
   - Top 20 most-used hooks by volume
   - Hook creation timeline and adoption curves
   - Gas cost analysis per hook type

2. **Liquidity Health Metrics**
   - TVL by chain and fee tier
   - Impermanent loss calculator by pool
   - LP profitability heatmap

3. **Governance Insights**
   - Proposal voting patterns
   - Delegate participation rates
   - Treasury balance trends

**Technical Stack:**
- **Data Source:** Monad RPC, Ethereum Archive Nodes
- **Query Engine:** Dune SQL (custom materialized views)
- **Frontend:** React + D3.js (open-source, MIT license)
- **Hosting:** IPFS + ENS (uniswap-analytics.eth)

### Deliverables
1. **Live Dashboard** (Week 6) - Publicly accessible URL
2. **Open-Source Repo** (Week 6) - MIT licensed, full documentation
3. **Dune Query Library** (Week 5) - 25+ pre-built SQL queries for community use
4. **Video Tutorial** (Week 6) - 15-minute walkthrough for DAO members

### Budget Breakdown
| Role | Hours | Rate | Total |
|------|-------|------|-------|
| Senior Data Engineer | 120 | $150 | $18,000 |
| Frontend Developer | 80 | $125 | $10,000 |
| Designer (UI/UX) | 40 | $100 | $4,000 |
| Infrastructure & Hosting (1 year) | - | - | $3,000 |
| **Total** | | | **$35,000** |

### Team Credentials
- **Lead:** @hagaetc (Dune Wizard, 2M+ query views, 4 years experience)
- **Frontend:** @andrewhong (Built dex.guru analytics, React specialist)
- **Previous Work:** MakerDAO Risk Dashboard, Aave Liquidation Tracker

### Success Metrics
- 10,000+ unique visitors in first month
- 95% uptime SLA
- Forked/used by at least 3 other DeFi protocols

### Community Value
- **Open Source:** All code published under MIT license
- **Educational:** Helps users understand V4 adoption patterns
- **No Ongoing Costs:** Dashboard self-sustaining after initial build

### Verification
- **Proposer Wallet Age:** 923 days
- **GitHub:** https://github.com/duneanalytics (Verified organization)
- **Past Contributions:** 12 public Uniswap dashboards on Dune
- **Community Endorsement:** Recommended by @0xShitTrader (UNI delegate, 500k votes)
"""
    ),
]


# ═══════════════════════════════════════════════════════════════
# BAD PROPOSALS - Should be AUTO_REJECTED (Risk: 80-100)
# ═══════════════════════════════════════════════════════════════

BAD_PROPOSALS = [
    TestProposal(
        id="UNI-2026-666",
        name="Revolutionary AI Trading Bot - SCAM PATTERN",
        wallet_address="0x9aB5f4E8D2c1F3b6A7C8e9D0F1a2B3C4d5E6f7A8",  # Unverified
        expected_classification="BAD",
        expected_risk_range=(80, 100),
        description="Guaranteed returns, anonymous team, 100% upfront payment, urgency tactics",
        text="""# Revolutionary AI Trading Bot

## Proposal ID: UNI-2026-666
## Amount Requested: 500,000 USDC
## Duration: "Flexible timeline, depends on market conditions"

### Executive Summary
Our team has developed a REVOLUTIONARY AI-powered trading bot that will GUARANTEE 200-500% returns for the Uniswap treasury. Using advanced machine learning and quantum algorithms, we can predict market movements with 94% accuracy. This is a LIMITED TIME OPPORTUNITY to get in before other DAOs discover this technology!!!

### How It Works
The bot uses proprietary AI algorithms (details confidential for competitive reasons) to analyze market sentiment across Twitter, Reddit, and Discord. By leveraging quantum computing principles and neural networks, we achieve unprecedented accuracy in predicting price movements.

**Key Features:**
- 🚀 GUARANTEED returns (minimum 200% APY)
- 🤖 Fully automated (no human intervention needed)
- 🔒 "Military-grade" encryption
- ⚡ "Quantum-powered" analysis engine
- 💎 Secret partnership with major exchanges (NDA, can't disclose)

### Budget
We need 500,000 USDC upfront to:
- Purchase server infrastructure
- Train the AI models
- Cover operational costs
- Marketing and business development
- "Other expenses as needed"

**Payment Terms:** 100% upfront (we don't do milestone payments because it slows down innovation)

### Team
- **CEO:** John Crypto (Entrepreneur, 15+ years in "finance")
- **CTO:** Anonymous (worked at "major tech company", can't reveal due to NDA)
- **AI Specialist:** Dr. Smith (PhD in "machine learning", university name confidential)

**Note:** Team prefers to remain mostly anonymous to avoid being poached by competitors.

### Returns
We project the following returns for the DAO:
- **Month 1:** 50,000 USDC profit
- **Month 3:** 250,000 USDC profit  
- **Month 6:** 1,000,000 USDC profit
- **Year 1:** 5,000,000+ USDC profit

All profits will be returned to the treasury (trust us).

### Why You Should Vote YES
- First-mover advantage before other DAOs get this tech
- Risk-free guaranteed returns
- Limited spots available (only accepting 3 DAOs)
- Our CEO personally guarantees results
- This opportunity won't last long!

### Contact
- Telegram: @CryptoJohn888 (DM for private investor opportunities)
- Email: getcryptoprofits@gmail.com
- Website: Coming soon™

**VOTE YES NOW before this opportunity disappears!!! 🚀🚀🚀**
"""
    ),
    
    TestProposal(
        id="UNI-2026-069",
        name="Urgent Treasury Rebalancing - VAGUE SCAM",
        wallet_address="0x1234567890abcdef1234567890abcdef12345678",  # Wallet age: 12 days
        expected_classification="BAD",
        expected_risk_range=(80, 100),
        description="New wallet, urgency manipulation, vague details, immediate execution request",
        text="""# Urgent Treasury Rebalancing

## Proposal ID: UNI-2026-069
## Amount Requested: 2,000,000 USDC
## Duration: "Immediate execution required"

### Summary
The treasury needs URGENT rebalancing due to recent market volatility. We have identified critical risks that require immediate action. Delay could result in significant losses.

### Proposal
Transfer 2,000,000 USDC to our managed portfolio strategy for optimal yield generation and risk mitigation. Our team of experts will handle everything.

### Details
Due to the urgent nature, we've streamlined the process:
- Funds transferred to secure wallet: 0xDEADBEEF... (our cold storage)
- We manage investments across DeFi protocols
- Quarterly reports provided
- Profits shared 70/30 (DAO gets 70%)

### Why Urgent?
Market analysis shows imminent risk event. Acting now protects treasury. Delaying could cost millions. Trust our expertise.

### Team
Experienced DeFi professionals. Combined 50+ years in finance. Managed $100M+ in assets. References available upon request.

### Budget
- Management fee: 2% annually (40,000 USDC)
- Performance fee: 30% of profits
- Setup costs: 50,000 USDC (one-time)

Total initial transfer: 2,000,000 USDC

### Timeline
IMMEDIATE. Vote should execute within 24 hours to capture opportunity.

**Vote YES to protect the treasury!**
"""
    ),
    
    TestProposal(
        id="UNI-2026-420",
        name="Metaverse Partnership Initiative - HYPE SCAM",
        wallet_address="0xF1A9B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9",  # Wallet age: 5 days
        expected_classification="BAD",
        expected_risk_range=(80, 100),
        description="Buzzword salad, no technical substance, team is influencers, vague deliverables",
        text="""# 🌟 THE NEXT BIG THING IN DEFI - Metaverse Partnership Initiative 🌟

## Proposal ID: UNI-2026-420
## Amount Requested: 750,000 USDC + 100,000 UNI
## Duration: "18-24 months (flexible)"

Uniswap has been MISSING OUT on the METAVERSE revolution! We're here to change that!

### The Vision
Imagine... Uniswap... but in the METAVERSE! Users can trade NFTs, tokens, and digital real estate ALL IN VIRTUAL REALITY! We're partnering with [REDACTED] major metaverse platform to build the FIRST decentralized exchange in the metaverse!

### Synergies & Opportunities
- Virtual trading floors in Decentraland/Sandbox
- NFT integration with metaverse assets
- VR trading interface (put on headset, trade in 3D!)
- Virtual DAO meetings in custom Uniswap headquarters
- Celebrity partnerships (in talks with major influencers)
- Cross-platform integration with gaming ecosystems

### Market Opportunity
- Metaverse market projected to hit $800 BILLION by 2028
- Early movers will dominate the space
- Uniswap could capture 10-15% market share = $80-120B opportunity
- First-mover advantage is CRITICAL

### What We'll Build
Phase 1: Concept art and mockups
Phase 2: Partnership development  
Phase 3: Prototype (maybe)
Phase 4: Launch (if everything goes well)
Phase 5: Marketing and influencer campaigns
Phase 6: TBD based on market response

### Budget Breakdown
- "Development": 300,000 USDC
- "Partnerships & BD": 200,000 USDC  
- "Marketing": 150,000 USDC
- "Operational costs": 100,000 USDC
- UNI tokens: For "strategic initiatives"

**Note:** Budget is flexible and may need adjustments as we iterate.

### The Team
- **CEO/Visionary:** Chad Maximus (Serial entrepreneur, 5 startups, 3 successful exits*)
  - *Results may vary, past performance not guarantee of future success
- **Chief Metaverse Officer:** Luna Moon (Influencer, 50k followers on Instagram)
- **Head of Vibes:** DJ Crypto (Community builder, hosted 100+ Twitter Spaces)
- **Advisors:** Several "senior industry experts" (names revealed after funding)

### Competitive Advantage
- First-mover in metaverse DEX space
- Innovative synergies between DeFi and gaming
- Viral marketing potential
- Celebrity endorsements (pending)
- Revolutionary technology stack (details proprietary)

### Revenue Model
- Transaction fees in metaverse
- NFT marketplace commissions
- Virtual land sales
- Sponsorships and advertising
- Merchandise (virtual AND physical)
- Licensing opportunities

### Risks
None! This is the future! 🚀

### Social Proof
- Twitter thread has 47 likes
- Discord community of 230 members (growing fast!)
- Featured in "Top 10 Metaverse Projects" on cryptomoonshots.reddit
- CEO was interviewed on small podcast

### Call to Action
The metaverse waits for NO ONE! Vote YES and let's make Uniswap the DOMINANT force in virtual trading! This is OUR MOMENT! Don't let other DAOs steal this opportunity!

🌙 TO THE MOON 🌙
"""
    ),
    
    TestProposal(
        id="UNI-2026-911",
        name="Emergency Security Patch - PHISHING ATTACK",
        wallet_address="0xUn1swapSecur1tyTeam000000000000000000000",  # Impersonating official team
        expected_classification="BAD",
        expected_risk_range=(85, 100),
        description="Impersonation, fake urgency, requests contract upgrade authorization, social engineering",
        text="""# 🚨 URGENT SECURITY NOTICE - Emergency Security Patch 🚨

## Proposal ID: UNI-2026-911
## Amount Requested: 0 USDC (requesting contract upgrade authorization)
## Duration: "IMMEDIATE - CRITICAL SECURITY ISSUE"

A CRITICAL VULNERABILITY has been discovered in Uniswap V4 smart contracts. IMMEDIATE ACTION REQUIRED to prevent loss of funds.

### The Vulnerability
Our security team identified a critical re-entrancy bug in the V4 router contract that could allow attackers to drain liquidity pools. This affects ALL V4 deployments.

**Severity:** CRITICAL (10/10)
**Exploitability:** HIGH  
**Funds at Risk:** $500M+

### Immediate Action Required
This proposal authorizes the Uniswap Security Team to:
1. Deploy emergency patch contract
2. Migrate liquidity to secure contract
3. Upgrade core protocol contracts

**Contract Address:** 0x000000000000SecurityPatch000000000000
(Trust us, this is the official security contract)

### Timeline
VOTE AND EXECUTE IMMEDIATELY. Every hour of delay increases risk of exploit.

### Technical Details
[Complicated technical jargon to seem legitimate]
[Random smart contract code snippets]
[Graph showing "attack vector simulation"]

### Verification
- Reported to Uniswap Labs (they're preparing official statement)
- Confirmed by "independent security researcher" (@random_account_42)
- Similar to recent exploit on [other protocol]

### What Happens If We Wait?
- Catastrophic loss of funds
- Protocol reputation destroyed
- Class action lawsuits
- Criminal investigations
- DAO dissolution

### Authorization Request
By voting YES, you authorize:
- Emergency contract upgrades (automated)
- Temporary admin privileges for patch deployment  
- Liquidity migration to new contracts

**THIS IS NOT A DRILL. VOTE YES NOW TO SAVE THE PROTOCOL.**
"""
    ),
]


# ═══════════════════════════════════════════════════════════════
# REVIEW PROPOSALS - Should require HUMAN_REVIEW (Risk: 20-79)
# ═══════════════════════════════════════════════════════════════

REVIEW_PROPOSALS = [
    TestProposal(
        id="UNI-2026-042",
        name="DeFi Education Initiative - NEEDS SCRUTINY",
        wallet_address="0x7C9f4B8aD3e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9",  # Wallet age: 147 days
        expected_classification="REVIEW",
        expected_risk_range=(40, 60),
        description="Legitimate mission but new org, unverifiable metrics, ambitious scope",
        text="""# DeFi Education Initiative

## Proposal ID: UNI-2026-042
## Amount Requested: 120,000 USDC
## Duration: 9 months (March - November 2026)

### Executive Summary
DeFi Education DAO proposes to create a comprehensive educational program to onboard 10,000 new users to Uniswap through workshops, tutorials, and community events across Latin America and Southeast Asia.

### Program Components

**1. Workshop Series (50 events)**
- In-person workshops in 15 cities
- Topics: "Intro to Uniswap", "Liquidity Provision 101", "Understanding Impermanent Loss"
- Target: 50-100 attendees per workshop

**2. Content Creation**
- 30 tutorial videos (Spanish, Portuguese, Mandarin, Vietnamese)
- 15 written guides with illustrations
- Interactive web-based learning platform

**3. Community Ambassador Program**
- Recruit 50 ambassadors across target regions
- Provide stipends and Uniswap swag
- Monthly training sessions

### Budget Breakdown
| Category | Amount |
|----------|--------|
| Event venues & logistics | $35,000 |
| Content creator fees | $28,000 |
| Ambassador stipends (50 x $600 x 9mo) | $27,000 |
| Translation services | $12,000 |
| Platform development | $18,000 |

### Team
- **Lead:** Maria Rodriguez (Founder, DeFi Education DAO)
  - Background: Former teacher, 3 years in crypto
  - LinkedIn: [Profile link]
  - Twitter: @MariaEduDeFi (2,300 followers)
  
- **Content Director:** James Chen  
  - Background: YouTube creator (DeFi Simplified, 15k subscribers)
  - Previous work: Created tutorials for Aave, Compound
  
- **Regional Coordinator:** Priya Sharma
  - Background: Community manager at [small DeFi protocol]
  - Experience: Organized 12 crypto meetups in Singapore

### Success Metrics
- 10,000 new unique Uniswap users from target regions
- 50 workshops completed
- 100,000 video views
- 500 active community members

### Deliverables Timeline
- Month 1-2: Platform development & content creation
- Month 3-8: Workshop execution (6 events/month)
- Month 9: Impact report and metrics analysis

### Concerns to Address
- **Limited Track Record:** Organization only 5 months old
- **Difficult to Verify Impact:** Hard to prove 10,000 "new" users came from program
- **No Previous DAO Experience:** First time applying for DAO funding
- **Ambitious Geographic Scope:** 15 cities across 2 continents with small team

### Supporting Evidence
- Partnership letter from [regional crypto conference]
- Sample tutorial video: [YouTube link]
- Testimonials from 3 previous workshop attendees
- Draft curriculum outline
"""
    ),
    
    TestProposal(
        id="UNI-2026-057",
        name="Uniswap Mobile App Development - CAPABILITY QUESTIONS",
        wallet_address="0x3C8d9A2b1F4e5a6B7c8D9e0F1A2b3C4d5E6f7G8H",  # Wallet age: 412 days
        expected_classification="REVIEW",
        expected_risk_range=(30, 50),
        description="Detailed spec but team lacks DeFi experience, timeline aggressive, need assessment unclear",
        text="""# Uniswap Mobile App Development

## Proposal ID: UNI-2026-057
## Amount Requested: 200,000 USDC
## Duration: 6 months (Feb - July 2026)

### Executive Summary
SwapMobile Labs proposes to develop a native mobile application (iOS & Android) for Uniswap, providing a streamlined trading experience optimized for mobile users.

### Technical Specification

**Features:**
- Native iOS (Swift) and Android (Kotlin) apps
- WalletConnect integration
- Real-time price charts and pool analytics
- Biometric authentication
- Push notifications for price alerts
- QR code scanning for wallet addresses

**Architecture:**
- Backend: Node.js API layer connecting to Uniswap subgraphs
- Frontend: React Native for shared component library
- Wallet: Integration with MetaMask Mobile, Rainbow, Trust Wallet
- Analytics: Mixpanel for user behavior tracking

### Milestones

| Milestone | Deliverable | Payment |
|-----------|-------------|---------|
| M1 (Month 2) | UI/UX design complete, testable prototype | 25% ($50k) |
| M2 (Month 4) | Beta app on TestFlight & Google Play Beta | 35% ($70k) |
| M3 (Month 5) | Security audit complete | 20% ($40k) |
| M4 (Month 6) | Production release on app stores | 20% ($40k) |

### Budget
- **Development:** $130,000 (3 developers x 6 months)
- **Design:** $25,000 (1 UI/UX designer x 3 months)  
- **Security Audit:** $30,000 (Consensys Diligence - quoted)
- **App Store Fees & Infrastructure:** $15,000

**Total:** $200,000

### Team
- **CEO/PM:** Alex Thompson
  - GitHub: @alexdev (87 repos, 3 years activity)
  - Background: Former mobile dev at fintech startup (name withheld)
  - Projects: Built 4 iOS apps (small user bases)

- **Lead iOS Dev:** Sarah Kim
  - GitHub: @sarahk_dev (34 repos)
  - Background: 5 years iOS development
  - No major DeFi experience listed

- **Lead Android Dev:** Raj Patel  
  - GitHub: @rajpateldev (21 repos)
  - Background: Android developer, worked on e-commerce apps
  - Some blockchain hobby projects

### Concerns to Address

**Questions on Feasibility:**
- Team has never built a DeFi app before (only traditional mobile apps)
- 6-month timeline is aggressive for security-critical wallet app
- No mention of ongoing maintenance after launch
- Audit budget ($30k) seems low for wallet application
- No clear differentiation from existing mobile interfaces (Uniswap web is mobile-responsive)

**Competitive Analysis:**
- Uniswap's web interface is already mobile-friendly
- MetaMask Mobile browser works well with Uniswap
- Is native app necessary vs improving PWA?

### Supporting Materials
- Figma mockups: [Link to design prototypes]
- Technical architecture diagram
- Quote from Consensys Diligence for audit
- Resumes of team members

### Risk Mitigation
- Code will be open-source (MIT license)
- DAO retains all IP rights
- Monthly progress updates to DAO
- Milestone-based payments
"""
    ),
    
    TestProposal(
        id="UNI-2026-088",
        name="Research Grant - MEV Mitigation Study - NICHE EXPERTISE",
        wallet_address="0x9F2b3C4d5E6f7A8b9C0d1E2f3A4B5c6D7e8F9a0B",  # Wallet age: 634 days
        expected_classification="REVIEW",
        expected_risk_range=(20, 40),
        description="Strong credentials but academic research ROI unclear, strategic judgment needed",
        text="""# Research Grant - Uniswap V5 MEV Mitigation

## Proposal ID: UNI-2026-088
## Amount Requested: 95,000 USDC
## Duration: 8 months (March - October 2026)

### Executive Summary
Dr. Elena Vasquez (Stanford PhD, MEV researcher) proposes an academic research project to design novel MEV mitigation mechanisms for a potential Uniswap V5 upgrade, focusing on "batch auctions" and "encrypted mempools."

### Research Questions
1. Can batch auction mechanisms reduce toxic MEV while preserving liquidity provider profits?
2. How do encrypted mempools (e.g., Flashbots Protect) impact price discovery on Uniswap?
3. What are the game-theoretic implications of order flow auctions (OFA) for DEX design?

### Methodology

**Phase 1: Literature Review (Month 1-2)**
- Survey existing MEV mitigation approaches (Flashbots, CoW Protocol, Eden Network)
- Analyze 100,000+ Uniswap transactions for MEV patterns
- Categorize MEV types: sandwich attacks, arbitrage, frontrunning

**Phase 2: Mechanism Design (Month 3-5)**
- Develop formal models for 3 MEV mitigation architectures:
  1. Time-based batch auctions (5-second windows)
  2. Encrypted mempool integration  
  3. Hybrid OFA + liquidity provider rebates
- Game-theoretic simulations using agent-based modeling

**Phase 3: Empirical Testing (Month 6-7)**
- Deploy testnet implementation on Sepolia
- Simulate market conditions with bot trading
- Measure impact on: slippage, LP returns, user costs

**Phase 4: Publication & Reporting (Month 8)**
- Academic paper submitted to top venue (IEEE S&P or Financial Cryptography)
- Public research report for Uniswap DAO
- Presentation at Uniswap governance call

### Budget
| Item | Cost |
|------|------|
| Principal Investigator (Dr. Vasquez, 20 hrs/week x 8mo) | $48,000 |
| Graduate Research Assistant (40 hrs/week x 6mo) | $30,000 |
| Computing resources (AWS, simulation infrastructure) | $8,000 |
| Data acquisition & analysis tools | $5,000 |
| Conference travel (for presenting findings) | $4,000 |
| **Total** | **$95,000** |

### Principal Investigator: Dr. Elena Vasquez
- **Credentials:**
  - PhD in Computer Science, Stanford University (2024)
  - Dissertation: "Game Theory in Decentralized Finance"
  - Published: 7 peer-reviewed papers on MEV, 3 specifically on Uniswap
  
- **Verification:**
  - Google Scholar: [Profile link] (214 citations)
  - Stanford faculty page: [Link]
  - GitHub: @elenaresearch (12 repos, MEV simulation tools)
  - Twitter: @ElenaVasquezPhD (1,200 followers, active in MEV research community)

- **Relevant Work:**
  - Co-authored "MEV in Uniswap V3: An Empirical Study" (2025)
  - Consulted for Flashbots research team (2024)
  - Speaker at MEV-Boost workshop, Devcon 2025

### Deliverables
1. **Research Report** (75+ pages, published on arXiv)
2. **Testnet Prototype** (open-source Solidity code)
3. **Simulation Framework** (Python codebase for community use)
4. **Academic Paper** (submitted to peer-reviewed conference)
5. **DAO Presentation** (live governance call + Q&A)

### Success Metrics
- Academic paper accepted at top-tier venue
- Simulation code forked/used by at least 2 other researchers
- Findings cited in V5 design discussions (if applicable)
- At least 1 actionable recommendation for Uniswap governance

### Questions for DAO Consideration
1. Is theoretical research worth $95k when outcome is uncertain?
2. Will findings actually inform V5 design, or is this purely academic?
3. V5 may not be in active development—is this premature?
4. Should academic research be funded by universities/grants instead of DAO?
"""
    ),
    
    TestProposal(
        id="UNI-2026-101",
        name="Partnership Proposal - Regional Exchange Integration - DUE DILIGENCE NEEDED",
        wallet_address="0x4A5b6C7d8E9f0A1b2C3d4E5f6A7B8c9D0e1F2a3B",  # Verified: CryptoExchangeAsia Multi-sig
        expected_classification="REVIEW",
        expected_risk_range=(35, 55),
        description="Potentially legitimate partnership but requires verification of claims, regulatory risk",
        text="""# Partnership Proposal - Regional Exchange Integration

## Proposal ID: UNI-2026-101
## Amount Requested: 180,000 USDC (+ potential revenue share)
## Duration: 12 months (Feb 2026 - Jan 2027)

### Executive Summary
CryptoExchangeAsia (CEA), a licensed cryptocurrency exchange operating in Vietnam, Thailand, and Philippines, proposes a partnership to integrate Uniswap liquidity into their centralized exchange platform, bringing Uniswap access to 850,000 retail users in Southeast Asia.

### Partnership Structure

**What CEA Provides:**
- Integration of Uniswap V4 as backend liquidity source for their CEX
- Marketing Uniswap to 850,000 existing users
- Fiat on-ramp (bank transfers, credit cards) → Uniswap trades
- Local language support (Vietnamese, Thai, Tagalog)
- Compliance and regulatory liaison in 3 countries

**What CEA Requests:**
- $180,000 integration & marketing budget (breakdown below)
- Co-branding rights (display "Powered by Uniswap" logo)
- Optional: 2-year exclusive partnership in SEA region (negotiable)
- Optional: Revenue share on integration fees (10% to DAO)

### Business Case
- **User Acquisition:** Expose Uniswap to 850k users (90% never used DEX before)
- **Volume Potential:** CEA averages $45M monthly volume, 30% could flow through Uniswap integration
- **Strategic Value:** First major CEX-DEX hybrid in Southeast Asia

### Budget Breakdown
| Item | Amount |
|------|--------|
| Smart contract integration development | $60,000 |
| Frontend UI/UX development | $35,000 |
| Security audit (CertiK quoted) | $40,000 |
| Marketing campaign (6 months) | $30,000 |
| Legal & compliance review | $15,000 |
| **Total** | **$180,000** |

### Milestones
- **M1 (Month 3):** Integration complete on testnet
- **M2 (Month 5):** Security audit passed
- **M3 (Month 6):** Mainnet launch in Vietnam (pilot)
- **M4 (Month 9):** Expansion to Thailand & Philippines
- **M5 (Month 12):** Impact report (user metrics, volume stats)

### About CryptoExchangeAsia
- **Founded:** 2021
- **Licensing:** 
  - Vietnam: Registered with SBV (State Bank of Vietnam) - *pending full licensing*
  - Thailand: Operating under SEC Thailand regulations
  - Philippines: Registered Virtual Asset Service Provider (VASP)
  
- **Metrics:**
  - 850,000 registered users
  - $45M average monthly volume
  - 15,000 daily active users
  - Team of 47 employees

- **Website:** https://cryptoexchangeasia.com
- **Verification:** [Links to regulatory filings]

### Team
- **CEO:** Nguyen Tran (Former VP at [regional bank], LinkedIn profile)
- **CTO:** Somchai Patel (Ex-engineer at Binance, GitHub: @somchai_dev)
- **Chief Compliance Officer:** Maria Santos (Former regulator at BSP Philippines)

### Concerns to Address

**Regulatory Uncertainty:**
- Crypto regulations in Vietnam are evolving (not fully clarified)
- CEA's Vietnamese license is "pending" full approval
- Risk: Integration could be halted by regulatory changes

**Verification Challenges:**
- User count (850k) is self-reported, difficult to independently verify
- Monthly volume ($45M) not audited by third party
- Regional exchange less known globally (limited public information)

**Partnership Terms:**
- Exclusivity clause could limit other partnerships in SEA
- Revenue share structure not fully defined
- What happens if CEA gets acquired or shuts down?

### Supporting Materials
- Letter of Intent from CEA legal team
- Screenshot of CEA trading platform
- CertiK quote for security audit
- Sample marketing materials (Uniswap co-branding mockups)
- Reference: Integration with [another small DeFi protocol]
"""
    ),
]


# ═══════════════════════════════════════════════════════════════
# ALL PROPOSALS
# ═══════════════════════════════════════════════════════════════

ALL_PROPOSALS = GOOD_PROPOSALS + BAD_PROPOSALS + REVIEW_PROPOSALS


def get_proposal_by_id(proposal_id: str) -> Optional[TestProposal]:
    """Get a test proposal by ID"""
    for proposal in ALL_PROPOSALS:
        if proposal.id == proposal_id:
            return proposal
    return None


def get_proposals_by_classification(classification: str) -> list[TestProposal]:
    """Get all proposals of a given classification"""
    classification = classification.upper()
    if classification == "GOOD":
        return GOOD_PROPOSALS
    elif classification == "BAD":
        return BAD_PROPOSALS
    elif classification == "REVIEW":
        return REVIEW_PROPOSALS
    else:
        return []


# ═══════════════════════════════════════════════════════════════
# TEST RUNNER
# ═══════════════════════════════════════════════════════════════

async def run_tests():
    """Run all test proposals through the API and report results"""
    import httpx
    
    API_URL = "http://localhost:8000"
    
    print("\n" + "="*70)
    print("🧪 AI GUARD DOG - TEST PROPOSAL SUITE")
    print("="*70 + "\n")
    
    results = {"passed": 0, "failed": 0, "errors": 0}
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for proposal in ALL_PROPOSALS:
            print(f"\n📋 Testing: {proposal.id} - {proposal.name}")
            print(f"   Expected: {proposal.expected_classification}")
            
            try:
                # Test with /analyze endpoint
                response = await client.post(
                    f"{API_URL}/analyze",
                    json={
                        "proposal_id": proposal.id,
                        "proposal_text": proposal.text,
                        "wallet_address": proposal.wallet_address,
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    risk_score = data.get("composite_risk_score", 0)
                    
                    # Determine actual classification based on risk score
                    if risk_score <= 30:
                        actual = "GOOD"
                    elif risk_score >= 70:
                        actual = "BAD"
                    else:
                        actual = "REVIEW"
                    
                    # Check if classification matches
                    if actual == proposal.expected_classification:
                        print(f"   ✅ PASSED - Risk Score: {risk_score}")
                        results["passed"] += 1
                    else:
                        print(f"   ❌ FAILED - Risk Score: {risk_score}, Got: {actual}")
                        results["failed"] += 1
                else:
                    print(f"   ⚠️ ERROR - Status: {response.status_code}")
                    results["errors"] += 1
                    
            except Exception as e:
                print(f"   ⚠️ ERROR - {str(e)}")
                results["errors"] += 1
    
    # Summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70)
    print(f"   ✅ Passed: {results['passed']}")
    print(f"   ❌ Failed: {results['failed']}")
    print(f"   ⚠️ Errors: {results['errors']}")
    print(f"   📈 Success Rate: {results['passed']}/{len(ALL_PROPOSALS)} ({100*results['passed']/len(ALL_PROPOSALS):.1f}%)")
    print("="*70 + "\n")
    
    return results


if __name__ == "__main__":
    import asyncio
    
    print("\n📝 Available Test Proposals:\n")
    
    print("GOOD (Should Auto-Approve):")
    for p in GOOD_PROPOSALS:
        print(f"  - {p.id}: {p.name}")
    
    print("\nBAD (Should Auto-Reject):")
    for p in BAD_PROPOSALS:
        print(f"  - {p.id}: {p.name}")
    
    print("\nREVIEW (Should Need Human Review):")
    for p in REVIEW_PROPOSALS:
        print(f"  - {p.id}: {p.name}")
    
    print("\n" + "-"*50)
    print("To run tests against the API:")
    print("  1. Start the server: uvicorn app.main:app --reload")
    print("  2. Run: python -m app.examples.test_proposals --test")
    print("-"*50 + "\n")
    
    # Check if --test flag is passed
    import sys
    if "--test" in sys.argv:
        asyncio.run(run_tests())
