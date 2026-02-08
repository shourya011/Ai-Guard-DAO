const { PrismaClient } = require('@prisma/client');

async function check() {
  const prisma = new PrismaClient();
  
  try {
    const proposals = await prisma.proposal.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        compositeRiskScore: true,
        riskLevel: true,
      }
    });
    
    console.log('\n📊 Seeded Proposals:\n');
    proposals.forEach((p, i) => {
      console.log(`${i + 1}. ${p.title.substring(0, 50)}...`);
      console.log(`   Status: ${p.status} | Risk: ${p.compositeRiskScore}/100 (${p.riskLevel})\n`);
    });
    
    const analyses = await prisma.analysis.count();
    const agentResults = await prisma.agentResult.count();
    const redFlags = await prisma.redFlag.count();
    
    console.log('📈 Totals:');
    console.log(`   Proposals: ${proposals.length}`);
    console.log(`   Analyses: ${analyses}`);
    console.log(`   Agent Results: ${agentResults}`);
    console.log(`   Red Flags: ${redFlags}`);
    
  } finally {
    await prisma.$disconnect();
  }
}

check();
