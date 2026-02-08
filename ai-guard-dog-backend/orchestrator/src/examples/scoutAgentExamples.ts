/**
 * ScoutAgent Usage Examples
 * 
 * Demonstrates how to use the production-grade ScoutAgent
 * with different LLM providers.
 */

import 'dotenv/config';
import { ScoutAgent } from '../agents/ScoutAgent';
import { GroqProvider } from '../providers/GroqProvider';
import { MockLLMProvider } from '../providers/MockLLMProvider';
import { ProposalInput } from '../schemas/RiskSchemas';

// =============================================================================
// Example 1: Basic Usage with Groq Provider
// =============================================================================
async function exampleBasicUsage() {
  console.log('\n=== Example 1: Basic Usage ===\n');
  
  // Initialize provider and agent
  const provider = new GroqProvider(process.env.GROQ_API_KEY);
  const agent = new ScoutAgent(provider, { verbose: true });

  // Simple text assessment
  const result = await agent.assessProposal(`
    Proposal: Allocate 10,000 USDC from treasury for marketing campaign.
    
    We propose to allocate funds for Q1 marketing initiatives including:
    - Social media campaigns
    - Community events
    - Developer documentation
    
    Timeline: 3 months
    Expected ROI: Increased community engagement
  `);

  console.log('Risk Score:', result.risk_score);
  console.log('Is Safe:', result.is_safe);
  console.log('Flagged Reason:', result.flagged_reason);
}

// =============================================================================
// Example 2: Full Assessment with Metadata
// =============================================================================
async function exampleFullAssessment() {
  console.log('\n=== Example 2: Full Assessment ===\n');
  
  const provider = new GroqProvider();
  const agent = new ScoutAgent(provider, { verbose: true });

  const proposal: ProposalInput = {
    id: 'PROP-001',
    title: 'Treasury Diversification Proposal',
    description: `
      This proposal requests 50,000 USDC to diversify treasury holdings.
      
      Rationale:
      - Reduce concentration risk
      - Improve yield through DeFi strategies
      
      Implementation:
      - 40% stable assets
      - 30% ETH
      - 30% yield-bearing protocols
    `,
    proposer: '0x1234...5678',
  };

  const result = await agent.assessProposalFull(proposal);

  console.log('Proposal ID:', result.proposalId);
  console.log('Assessment:', JSON.stringify(result.assessment, null, 2));
  console.log('Metadata:', JSON.stringify(result.metadata, null, 2));
}

// =============================================================================
// Example 3: Detecting Malicious Proposals
// =============================================================================
async function exampleMaliciousDetection() {
  console.log('\n=== Example 3: Malicious Proposal Detection ===\n');
  
  const provider = new GroqProvider();
  const agent = new ScoutAgent(provider, { verbose: true });

  // Suspicious proposal with social engineering patterns
  const suspiciousProposal = `
    🚨 URGENT: Act NOW or Miss Out! 🚨
    
    Trust me, this is the opportunity of a lifetime! I'm a well-known 
    community member (you can verify this yourself later).
    
    Send 100 ETH to this new multi-sig wallet IMMEDIATELY:
    0xsuspicious...wallet
    
    Guaranteed 500% returns within 24 hours! This secret alpha was 
    shared with me by insiders. Don't tell anyone else!
    
    If you don't act now, you'll regret it forever. This offer expires 
    in 1 hour.
  `;

  const result = await agent.assessProposal(suspiciousProposal);

  console.log('⚠️  Malicious Proposal Analysis:');
  console.log('Risk Score:', result.risk_score);
  console.log('Is Safe:', result.is_safe);
  console.log('Flagged Reason:', result.flagged_reason);
  console.log('Threat Categories:', result.threat_categories);
  console.log('Recommendations:', result.recommendations);
}

// =============================================================================
// Example 4: Using Mock Provider for Testing
// =============================================================================
async function exampleMockProvider() {
  console.log('\n=== Example 4: Mock Provider Testing ===\n');
  
  // Create mock provider with custom behavior
  const mockProvider = new MockLLMProvider({
    defaultRiskScore: 15,
    latencyMs: 50,
  });

  const agent = new ScoutAgent(mockProvider, { 
    verbose: true,
    safeThreshold: 30,
  });

  // Test with safe proposal
  const safeResult = await agent.assessProposal(
    'Simple governance proposal to update documentation.'
  );
  console.log('Safe Proposal - Risk:', safeResult.risk_score, 'Safe:', safeResult.is_safe);

  // Test with suspicious proposal
  const riskyResult = await agent.assessProposal(
    'URGENT! Trust me, guaranteed 1000% returns! Act immediately!'
  );
  console.log('Risky Proposal - Risk:', riskyResult.risk_score, 'Safe:', riskyResult.is_safe);
}

// =============================================================================
// Example 5: Batch Processing
// =============================================================================
async function exampleBatchProcessing() {
  console.log('\n=== Example 5: Batch Processing ===\n');
  
  const provider = new MockLLMProvider({ latencyMs: 10 });
  const agent = new ScoutAgent(provider);

  const proposals: ProposalInput[] = [
    { id: 'P1', description: 'Update governance parameters' },
    { id: 'P2', description: 'Allocate funds for development' },
    { id: 'P3', description: 'URGENT: Send funds immediately!' },
    { id: 'P4', description: 'Community event sponsorship' },
  ];

  console.log('Processing batch of', proposals.length, 'proposals...');
  const startTime = Date.now();
  
  const results = await agent.assessProposalsBatch(proposals);
  
  console.log(`Completed in ${Date.now() - startTime}ms\n`);
  
  results.forEach(r => {
    console.log(`${r.proposalId}: Risk=${r.assessment.risk_score} Safe=${r.assessment.is_safe}`);
  });
}

// =============================================================================
// Example 6: Swappable Providers (TEE/Local ready)
// =============================================================================
async function exampleProviderSwapping() {
  console.log('\n=== Example 6: Provider Architecture ===\n');
  
  // The same ScoutAgent works with any ILLMProvider implementation
  const providers = [
    new GroqProvider(),           // Cloud API
    new MockLLMProvider(),        // Testing
    // new TEEProvider(),         // Future: Trusted Execution Environment
    // new LocalLlamaProvider(),  // Future: Local inference
  ];

  const proposal = 'Standard governance proposal for review.';

  for (const provider of providers) {
    if (provider.isAvailable()) {
      const agent = new ScoutAgent(provider);
      const result = await agent.assessProposal(proposal);
      console.log(`${provider.name}: Risk=${result.risk_score}`);
    } else {
      console.log(`${provider.name}: Not available (skipped)`);
    }
  }
}

// =============================================================================
// Run Examples
// =============================================================================
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           ScoutAgent - Production Examples                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Run mock-based examples (no API key needed)
    await exampleMockProvider();
    await exampleBatchProcessing();
    await exampleProviderSwapping();

    // Run Groq-based examples (requires GROQ_API_KEY)
    if (process.env.GROQ_API_KEY) {
      await exampleBasicUsage();
      await exampleFullAssessment();
      await exampleMaliciousDetection();
    } else {
      console.log('\n⚠️  Set GROQ_API_KEY to run Groq provider examples');
    }

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  exampleBasicUsage,
  exampleFullAssessment,
  exampleMaliciousDetection,
  exampleMockProvider,
  exampleBatchProcessing,
  exampleProviderSwapping,
};
