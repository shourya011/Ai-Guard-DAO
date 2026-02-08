/**
 * Mock Event Utility
 * 
 * Standalone script to trigger a mock proposal event for testing.
 * This simulates a blockchain ProposalCreated event without needing
 * an actual blockchain connection.
 * 
 * Usage: npm run mock:event
 */

import { blockchainListener } from '../services/blockchainListener';
import { pool, closePool } from '../config/database';
import '../events/analysisTrigger';  // Initialize event listeners

// Sample proposal data for testing different risk levels
const mockProposals = {
  // Low risk proposal (should be AUTO_APPROVED)
  lowRisk: {
    proposalId: 1001,
    proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b123',
    ipfsHash: 'QmLowRiskProposal123',
    title: 'Q1 2026 Marketing Budget Proposal',
    description: `
## Summary
This proposal requests 10,000 MON tokens for Q1 2026 marketing activities.

## Budget Breakdown
- Social Media Campaigns: 4,000 MON
- Community Events: 3,000 MON
- Content Creation: 2,000 MON
- Analytics Tools: 1,000 MON

## Team
- Lead: Alice (verified DAO member since 2024)
- Contact: alice@dao.example.com

## Timeline
- January: Social media campaign launch
- February: Community hackathon
- March: Results review and report

## Expected Outcomes
- 50% increase in social media engagement
- 1000 new community members
- 5 partnership opportunities
    `.trim(),
  },

  // Medium risk proposal (should be NEEDS_REVIEW)
  mediumRisk: {
    proposalId: 1002,
    proposer: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    ipfsHash: 'QmMediumRiskProposal456',
    title: 'Emergency Security Audit Request',
    description: `
## Urgent: Security Audit Needed

We need to conduct an emergency security audit of our smart contracts.

## Budget: 50,000 MON

## Reason
Recent market conditions require immediate action.

## Team
New auditing firm (details to follow)

## Timeline
ASAP - within 2 weeks
    `.trim(),
  },

  // High risk proposal (should be AUTO_REJECTED)
  highRisk: {
    proposalId: 1003,
    proposer: '0x0000000000000000000000000000000000001234',
    ipfsHash: 'QmHighRiskProposal789',
    title: 'Incredible Partnership - Guaranteed Returns!',
    description: `
## AMAZING OPPORTUNITY - ACT NOW!

Trust us, this is the best investment ever!

## Guaranteed 100x returns in 30 days!

Just send 500,000 MON to our anonymous team and we will
handle everything. No questions asked.

## Why trust us?
Because we said so! This is 100% legitimate.

## Contact
Anonymous - will reach out after funding

## Urgency
This offer expires in 24 HOURS! Don't miss out!
    `.trim(),
  },
};

async function main(): Promise<void> {
  console.log(`\n`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`🧪 MOCK EVENT UTILITY`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  // Get proposal type from command line
  const proposalType = process.argv[2] || 'lowRisk';
  
  if (!['lowRisk', 'mediumRisk', 'highRisk'].includes(proposalType)) {
    console.log('Usage: npm run mock:event [lowRisk|mediumRisk|highRisk]');
    console.log('\nAvailable mock proposals:');
    console.log('  lowRisk    - Marketing proposal (should AUTO_APPROVE)');
    console.log('  mediumRisk - Emergency audit (should NEEDS_REVIEW)');
    console.log('  highRisk   - Scam proposal (should AUTO_REJECT)\n');
    process.exit(1);
  }

  const mockData = mockProposals[proposalType as keyof typeof mockProposals];

  console.log(`📋 Triggering ${proposalType} proposal:`);
  console.log(`   Title: ${mockData.title}`);
  console.log(`   Proposer: ${mockData.proposer}\n`);

  try {
    // Test database connection first
    await pool.query('SELECT 1');
    console.log('✅ Database connected\n');

    // Initialize blockchain listener (in mock mode)
    await blockchainListener.initialize();

    // Trigger the mock event
    const dbId = await blockchainListener.triggerMockEvent(mockData);
    
    console.log(`\n🎯 Mock event triggered!`);
    console.log(`   Database ID: ${dbId}`);
    console.log(`\n⏳ Waiting for analysis to complete...`);
    console.log(`   (The Python Intelligence service must be running)\n`);

    // Wait a bit for the async processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check the result
    const result = await pool.query(
      'SELECT status, composite_risk_score FROM proposals WHERE id = $1',
      [dbId]
    );

    if (result.rows[0]) {
      console.log(`\n📊 Result:`);
      console.log(`   Status: ${result.rows[0].status}`);
      console.log(`   Risk Score: ${result.rows[0].composite_risk_score}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closePool();
    process.exit(0);
  }
}

main();
