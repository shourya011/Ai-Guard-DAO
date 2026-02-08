/**
 * AI Guard DAO - Rich Data Seeding Script (Q1 2026)
 * 
 * Seeds the database with realistic DAO proposals for demo purposes.
 * 
 * ══════════════════════════════════════════════════════════════════════
 * CRITICAL LOGIC - Risk Score Calculation (INVERSE):
 * ══════════════════════════════════════════════════════════════════════
 * 
 * The "Risk Score" is the INVERSE of agent quality scores.
 * - High agent scores (good reputation, clear language) = LOW risk
 * - Formula: riskScore = 100 - ((reputationScore + nlpScore) / 2)
 * 
 * Example:
 * - Reputation: 88/100 (Great) + NLP: 72/100 (Good)
 * - Average Quality: (88 + 72) / 2 = 80
 * - Risk Score: 100 - 80 = 20 (Low Risk)
 * 
 * Usage: npm run seed:rich
 */

import { PrismaClient, ProposalStatus, RiskLevel, AnalysisStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// HELPER: Calculate Risk Score from Agent Scores
// ============================================

function calculateRiskScore(reputationScore: number, nlpScore: number): number {
  const averageQuality = (reputationScore + nlpScore) / 2;
  const riskScore = Math.round(100 - averageQuality);
  return Math.max(0, Math.min(100, riskScore)); // Clamp 0-100
}

function getRiskLevel(score: number): RiskLevel {
  if (score <= 30) return RiskLevel.LOW;
  if (score <= 50) return RiskLevel.MEDIUM;
  if (score <= 75) return RiskLevel.HIGH;
  return RiskLevel.CRITICAL;
}

function getRecommendation(score: number): 'APPROVE' | 'REVIEW' | 'REJECT' {
  if (score <= 30) return 'APPROVE';
  if (score <= 70) return 'REVIEW';
  return 'REJECT';
}

// ============================================
// PROPOSAL DATA - Q1 2026
// ============================================

const PROPOSALS = [
  // ═══════════════════════════════════════════════════════════════
  // PROPOSAL 1: Treasury Diversification (LOW RISK)
  // Agent Scores: Reputation 88, NLP 72 → Risk = 100 - 80 = 20
  // ═══════════════════════════════════════════════════════════════
  {
    title: 'Treasury Diversification Strategy Q1 2026',
    onchainProposalId: 'PROP-2026-0001',
    description: `# Treasury Diversification Strategy Q1 2026

## Executive Summary

This proposal outlines a comprehensive treasury diversification strategy designed to enhance the long-term financial stability and growth potential of the AI Guard DAO. By strategically allocating treasury assets across multiple asset classes and DeFi protocols, we aim to reduce single-point-of-failure risks while generating sustainable yield.

---

## Current Treasury Status

| Asset | Amount | % of Total |
|-------|--------|------------|
| MONAD | 2,450,000 | 78.2% |
| USDC | 450,000 | 14.4% |
| ETH | 125 | 7.4% |
| **Total** | **~$3.1M** | **100%** |

### Problem Statement

Our current treasury allocation presents several risks:

1. **Concentration Risk**: 78% in a single asset (MONAD)
2. **Yield Inefficiency**: Stablecoins sitting idle in cold storage
3. **Market Exposure**: No hedging against broader market downturns
4. **Liquidity Constraints**: Limited ability to respond to emergencies

---

## Proposed Allocation Strategy

### Target Portfolio (Post-Implementation)

| Asset Class | Target % | Rationale |
|-------------|----------|-----------|
| MONAD (Native) | 50% | Maintain governance power, reduced from 78% |
| Blue-Chip DeFi | 20% | Yield generation via Aave, Compound |
| Stablecoins | 20% | USDC/DAI for operational runway |
| ETH | 10% | Cross-chain bridge collateral |

### Implementation Phases

#### Phase 1: Rebalancing (Weeks 1-2)
- Convert 28% of MONAD holdings to target assets
- Execute via TWAP orders to minimize slippage
- Estimated gas cost: ~$2,400

#### Phase 2: DeFi Deployment (Weeks 3-4)
- Deploy stablecoins to Aave V3 (current APY: 4.2%)
- Stake ETH in Lido (current APY: 3.8%)
- Set up multi-sig for protocol interactions

#### Phase 3: Monitoring & Reporting (Ongoing)
- Weekly treasury reports to DAO forum
- Quarterly rebalancing reviews
- Emergency procedures for market volatility

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Smart Contract Exploit | Low | High | Only audited protocols, insurance coverage |
| Impermanent Loss | Medium | Medium | Avoid LPs, stick to lending |
| Stablecoin Depeg | Low | High | Diversify across USDC, DAI, FRAX |
| Market Crash | Medium | Medium | 20% stablecoin buffer |

---

## Team & Credentials

**Treasury Committee Members:**

- **Alex Chen** - 5 years DeFi treasury management
  - Former treasury lead at Compound DAO
  - Managed $50M+ in protocol assets
  
- **Sarah Kim** - Risk analyst, CFA charterholder
  - Previously at Gauntlet Network
  - Published research on DAO treasury optimization

- **David Park** - Smart contract engineer
  - Auditor at OpenZeppelin (2021-2023)
  - Contributor to Gnosis Safe

---

## Success Metrics

1. ✅ Achieve target allocation within 30 days
2. ✅ Generate minimum 3.5% APY on deployed assets
3. ✅ Zero security incidents in first 6 months
4. ✅ Maintain 6-month operational runway in stablecoins
5. ✅ Weekly transparency reports published on-chain

---

## Budget Request

| Item | Cost |
|------|------|
| Gas fees (rebalancing) | $2,400 |
| Insurance premiums (6 mo) | $8,500 |
| Monitoring tools | $1,200 |
| Contingency (10%) | $1,210 |
| **Total** | **$13,310** |

---

## Voting Options

- **For**: Approve treasury diversification strategy
- **Against**: Reject proposal, maintain current allocation
- **Abstain**: No opinion

---

## Timeline

| Milestone | Target Date | Deliverable |
|-----------|-------------|-------------|
| Proposal Vote | Feb 5, 2026 | Community approval |
| Phase 1 Complete | Feb 19, 2026 | Rebalancing done |
| Phase 2 Complete | Mar 5, 2026 | DeFi deployment |
| First Report | Mar 12, 2026 | Performance metrics |

---

## Appendix

### A. Protocol Selection Criteria

All DeFi protocols were evaluated against:
- TVL > $500M
- Audit history (minimum 2 audits from top firms)
- Insurance availability
- Track record > 2 years
- Governance token liquidity

### B. Emergency Procedures

In case of protocol exploit or market emergency:
1. Treasury committee has 3/5 multi-sig authority
2. Emergency withdrawal to cold storage within 4 hours
3. Incident report to DAO within 24 hours

---

*Submitted by Treasury Committee | February 1, 2026*`,
    proposerAddress: '0x7a3BfC9d12345678901234567890123456784f2E',
    requestedAmount: '13310',
    tokenSymbol: 'USDC',
    status: ProposalStatus.NEEDS_REVIEW,
    createdAt: new Date('2026-02-01T10:00:00Z'),
    votingDeadline: new Date('2026-02-15T23:59:59Z'),
    // Agent Scores → Risk Score = 100 - ((88 + 72) / 2) = 20
    reputationScore: 88,
    nlpScore: 72,
    reputationData: {
      walletAge: '3.4 years',
      txCount: 1832,
      daoMemberships: 7,
      previousProposals: 4,
      successRate: '100%',
    },
    nlpData: {
      clarity: 91,
      sentiment: 'Positive',
      readability: 'Professional',
      manipulationScore: 3,
      buzzwordRatio: 'Low',
    },
    // Positive risk factors (displayed with ✅)
    positiveFactors: [
      { title: 'Verified Team', description: 'Team members have verifiable public profiles with years of relevant experience.' },
      { title: 'Detailed Budget', description: 'All budget categories are itemized with specific dollar amounts.' },
      { title: 'Audit Plans', description: 'Proposal includes plans for using only audited protocols.' },
      { title: 'Emergency Procedures', description: 'Clear emergency response plan with multi-sig authority.' },
    ],
    // Negative risk factors (displayed with ⚠️)
    negativeFactors: [],
  },

  // ═══════════════════════════════════════════════════════════════
  // PROPOSAL 2: Emergency Fund Request (CRITICAL RISK)
  // Agent Scores: Reputation 22, NLP 8 → Risk = 100 - 15 = 85
  // ═══════════════════════════════════════════════════════════════
  {
    title: 'URGENT: Emergency Infrastructure Fund',
    onchainProposalId: 'PROP-2026-0002',
    description: `# URGENT: Emergency Infrastructure Fund Request

## Summary

We need immediate funding to address critical infrastructure issues. Time is of the essence!!!

---

## The Problem

Our servers are failing and we need to act NOW. Without this funding, the entire platform could go offline within days.

---

## Budget

| Item | Cost |
|------|------|
| Server upgrades | $180,000 |
| Security patches | $45,000 |
| Misc expenses | $75,000 |
| **Total** | **$300,000** |

---

## Team

We are experienced developers. Trust us to handle this.

Contact: @urgentfund2026 on Telegram

---

## Why This Is Urgent

- Servers failing
- Security vulnerabilities 
- Must act immediately
- Don't miss this opportunity to save the platform

---

## Timeline

ASAP - We need funds within 48 hours.

---

*Posted January 20, 2026*`,
    proposerAddress: '0x1a2BcD345678901234567890123456789019z0Y',
    requestedAmount: '300000',
    tokenSymbol: 'USDC',
    status: ProposalStatus.AUTO_REJECTED,
    createdAt: new Date('2026-01-20T08:30:00Z'),
    votingDeadline: new Date('2026-01-25T23:59:59Z'),
    // Agent Scores → Risk Score = 100 - ((22 + 8) / 2) = 85
    reputationScore: 22,
    nlpScore: 8,
    reputationData: {
      walletAge: '12 days',
      txCount: 3,
      daoMemberships: 0,
      previousProposals: 0,
      successRate: 'N/A',
    },
    nlpData: {
      clarity: 28,
      sentiment: 'Urgent/Pressuring',
      readability: 'Poor',
      manipulationScore: 89,
      buzzwordRatio: 'High',
    },
    positiveFactors: [],
    negativeFactors: [
      { title: 'Urgency Tactics', description: 'Proposal uses urgent language to pressure quick decision (ASAP, act NOW)' },
      { title: 'Vague Budget', description: '"Misc expenses" accounts for 25% of budget with no breakdown' },
      { title: 'Anonymous Team', description: 'No verifiable team credentials provided, Telegram-only contact' },
      { title: 'New Wallet', description: 'Proposer wallet created 12 days ago with minimal history' },
      { title: 'No Technical Details', description: 'No specifics on what infrastructure or servers need upgrading' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PROPOSAL 3: Community Grants Program (MEDIUM RISK)
  // Agent Scores: Reputation 65, NLP 58 → Risk = 100 - 61.5 ≈ 38
  // ═══════════════════════════════════════════════════════════════
  {
    title: 'Community Developer Grants Program',
    onchainProposalId: 'PROP-2026-0003',
    description: `# Community Developer Grants Program

## Overview

This proposal establishes a grants program to fund community developers building on the AI Guard ecosystem.

---

## Program Structure

### Grant Tiers

| Tier | Amount | Requirements |
|------|--------|--------------|
| Seed | $5,000 | Idea + MVP plan |
| Growth | $25,000 | Working prototype |
| Scale | $100,000 | Production-ready |

### Focus Areas

1. Developer tooling
2. Analytics dashboards
3. Integration plugins
4. Educational content

---

## Budget

Total allocation: **$500,000** over 12 months

- Seed grants (20x): $100,000
- Growth grants (10x): $250,000  
- Scale grants (1x): $100,000
- Administration: $50,000

---

## Selection Committee

To be determined by community vote.

---

## Timeline

- Q1 2026: Program launch
- Q2 2026: First cohort
- Q4 2026: Program review

---

*Submitted January 28, 2026*`,
    proposerAddress: '0x5c6DfE789012345678901234567890125f3B',
    requestedAmount: '500000',
    tokenSymbol: 'USDC',
    status: ProposalStatus.NEEDS_REVIEW,
    createdAt: new Date('2026-01-28T14:00:00Z'),
    votingDeadline: new Date('2026-02-11T23:59:59Z'),
    // Agent Scores → Risk Score = 100 - ((65 + 58) / 2) = 38
    reputationScore: 65,
    nlpScore: 58,
    reputationData: {
      walletAge: '1.2 years',
      txCount: 234,
      daoMemberships: 2,
      previousProposals: 1,
      successRate: '100%',
    },
    nlpData: {
      clarity: 68,
      sentiment: 'Neutral',
      readability: 'Good',
      manipulationScore: 15,
      buzzwordRatio: 'Medium',
    },
    positiveFactors: [
      { title: 'Clear Timeline', description: '12-month program with quarterly milestones' },
      { title: 'Reasonable Amounts', description: 'Grant tiers are within industry norms' },
    ],
    negativeFactors: [
      { title: 'Vague Committee', description: 'Selection committee "to be determined" - no accountability structure' },
      { title: 'Limited Detail', description: 'No success criteria or KPIs for funded projects' },
    ],
  },
];
// ============================================
// SEEDING FUNCTIONS
// ============================================

async function clearData() {
  console.log('🗑️  Clearing existing data...');
  
  await prisma.redFlag.deleteMany();
  await prisma.agentResult.deleteMany();
  await prisma.analysis.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.proposal.deleteMany();
  
  console.log('   ✅ Data cleared');
}

async function seedProposals() {
  console.log('📝 Seeding proposals with Q1 2026 data...\n');
  console.log('📊 Risk Score Formula: 100 - ((ReputationScore + NLPScore) / 2)');
  console.log('   Example: Rep(88) + NLP(72) → 100 - 80 = 20 Risk\n');
  
  for (const proposalData of PROPOSALS) {
    // Calculate INVERSE risk score from agent scores
    const riskScore = calculateRiskScore(proposalData.reputationScore, proposalData.nlpScore);
    const riskLevel = getRiskLevel(riskScore);
    const recommendation = getRecommendation(riskScore);
    
    console.log(`   📋 ${proposalData.title.substring(0, 50)}...`);
    console.log(`      Reputation: ${proposalData.reputationScore} | NLP: ${proposalData.nlpScore} → Risk: ${riskScore}`);
    
    // Create proposal
    const proposal = await prisma.proposal.create({
      data: {
        title: proposalData.title,
        onchainProposalId: proposalData.onchainProposalId,
        description: proposalData.description,
        proposerAddress: proposalData.proposerAddress,
        requestedAmount: proposalData.requestedAmount,
        tokenSymbol: proposalData.tokenSymbol,
        status: proposalData.status,
        daoGovernor: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
        daoName: 'AI Guard DAO',
        chainId: 31337,
        compositeRiskScore: riskScore,
        riskLevel: riskLevel,
        votingDeadline: proposalData.votingDeadline,
        forVotes: '0',
        againstVotes: '0',
        abstainVotes: '0',
        analyzedAt: new Date(),
        createdAt: proposalData.createdAt,
      },
    });
    
    // Create analysis record
    const analysisRecord = await prisma.analysis.create({
      data: {
        jobId: `seed-${proposal.id}-${Date.now()}`,
        proposalId: proposal.id,
        status: AnalysisStatus.COMPLETE,
        priority: 'normal',
        compositeRiskScore: riskScore,
        riskLevel: riskLevel,
        recommendation: recommendation,
        snapshot: {
          executiveSummary: `Risk assessment complete. Score: ${riskScore}/100 (${riskLevel}).`,
          reputationData: proposalData.reputationData,
          nlpData: proposalData.nlpData,
          positiveFactors: proposalData.positiveFactors,
          negativeFactors: proposalData.negativeFactors,
        },
        completedAt: new Date(),
        processingTimeMs: Math.floor(Math.random() * 15000) + 8000,
        modelVersion: 'ai-guard-v2.1-2026',
      },
    });
    
    // Create agent results
    // 1. Reputation Sentinel
    await prisma.agentResult.create({
      data: {
        analysisId: analysisRecord.id,
        agentName: 'REPUTATION_SENTINEL',
        score: proposalData.reputationScore,
        reasoning: proposalData.reputationScore >= 70
          ? `Strong reputation profile. Wallet age: ${proposalData.reputationData.walletAge}, Transaction count: ${proposalData.reputationData.txCount}. Active DAO participant with ${proposalData.reputationData.daoMemberships} memberships.`
          : proposalData.reputationScore >= 40
          ? `Moderate reputation. Wallet age: ${proposalData.reputationData.walletAge}. Limited DAO history.`
          : `⚠️ LOW REPUTATION: New wallet (${proposalData.reputationData.walletAge}), minimal transaction history (${proposalData.reputationData.txCount}). No prior DAO participation.`,
        confidence: proposalData.reputationScore >= 50 ? 0.92 : 0.78,
        flags: proposalData.reputationScore < 40 
          ? ['NEW_WALLET', 'NO_DAO_HISTORY', 'LOW_TX_COUNT']
          : [],
        metadata: proposalData.reputationData,
        processingTimeMs: Math.floor(Math.random() * 3000) + 2000,
      },
    });
    
    // 2. NLP Analyst
    await prisma.agentResult.create({
      data: {
        analysisId: analysisRecord.id,
        agentName: 'NLP_ANALYST',
        score: proposalData.nlpScore,
        reasoning: proposalData.nlpScore >= 70
          ? `Clear, professional language. Clarity score: ${proposalData.nlpData.clarity}%. Sentiment: ${proposalData.nlpData.sentiment}. No manipulation tactics detected.`
          : proposalData.nlpScore >= 40
          ? `Acceptable language quality. Some areas lack detail. Clarity: ${proposalData.nlpData.clarity}%.`
          : `⚠️ RED FLAGS DETECTED: Urgency tactics, manipulation score: ${proposalData.nlpData.manipulationScore}%. Poor clarity (${proposalData.nlpData.clarity}%). ${proposalData.nlpData.sentiment} tone.`,
        confidence: proposalData.nlpScore >= 50 ? 0.89 : 0.95,
        flags: proposalData.nlpScore < 40 
          ? ['URGENCY_TACTICS', 'MANIPULATION_DETECTED', 'POOR_CLARITY', 'BUZZWORD_ABUSE']
          : proposalData.nlpScore < 60
          ? ['MISSING_DETAILS']
          : [],
        metadata: proposalData.nlpData,
        processingTimeMs: Math.floor(Math.random() * 4000) + 2500,
      },
    });
    
    // 3. Mediator (final consensus) - score IS the risk score (inverse)
    await prisma.agentResult.create({
      data: {
        analysisId: analysisRecord.id,
        agentName: 'MEDIATOR',
        score: riskScore, // This IS the risk score
        reasoning: riskScore <= 30
          ? `✅ LOW RISK: Both agents report positive signals. Recommendation: ${recommendation}.`
          : riskScore <= 60
          ? `⚠️ MEDIUM RISK: Mixed signals from agents. Human review recommended. Recommendation: ${recommendation}.`
          : `🚨 HIGH RISK: Multiple red flags detected. Auto-rejection triggered. Recommendation: ${recommendation}.`,
        confidence: 0.94,
        flags: riskScore > 70 ? ['AUTO_REJECT_TRIGGERED'] : [],
        metadata: {
          reputationWeight: 0.5,
          nlpWeight: 0.5,
          inputScores: {
            reputation: proposalData.reputationScore,
            nlp: proposalData.nlpScore,
          },
          calculatedRisk: riskScore,
        },
        processingTimeMs: Math.floor(Math.random() * 2000) + 1000,
      },
    });
    
    // Create red flags from negative factors
    for (const factor of proposalData.negativeFactors) {
      await prisma.redFlag.create({
        data: {
          analysisId: analysisRecord.id,
          agentName: 'NLP_ANALYST',
          category: 'GOVERNANCE',
          severity: riskScore > 70 ? 5 : riskScore > 50 ? 4 : 3,
          title: factor.title,
          description: factor.description,
          confidence: 0.88,
        },
      });
    }
    
    console.log(`      ✅ Created with ${riskLevel} risk level\n`);
  }
}

async function main() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(' 🐕 AI Guard DAO - Rich Data Seeding (Q1 2026)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n');
  
  try {
    await clearData();
    await seedProposals();
    
    // Summary
    const proposals = await prisma.proposal.findMany({
      select: { title: true, compositeRiskScore: true, riskLevel: true },
      orderBy: { createdAt: 'asc' },
    });
    
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(' ✅ SEEDING COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📊 Final Results:\n');
    
    proposals.forEach((p, i) => {
      const emoji = p.compositeRiskScore! <= 30 ? '🟢' : p.compositeRiskScore! <= 60 ? '🟡' : '🔴';
      console.log(`   ${i + 1}. ${emoji} ${p.title.substring(0, 45)}...`);
      console.log(`      Risk: ${p.compositeRiskScore}/100 (${p.riskLevel})\n`);
    });
    
    console.log('🚀 Frontend ready at http://localhost:5173');
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
