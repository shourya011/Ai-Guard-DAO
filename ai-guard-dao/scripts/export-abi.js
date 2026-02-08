/**
 * Export ABIs from compiled artifacts to abis folder
 * 
 * Run: node scripts/export-abi.js
 */

const fs = require('fs');
const path = require('path');

const CONTRACTS = [
  'VotingAgent',
  'AuditLogger',
  'DAOGovernor',
  'MockToken'
];

const artifactsDir = path.join(__dirname, '..', 'artifacts', 'contracts');
const abisDir = path.join(__dirname, '..', 'abis');

// Create abis directory if it doesn't exist
if (!fs.existsSync(abisDir)) {
  fs.mkdirSync(abisDir, { recursive: true });
}

console.log('Exporting ABIs...\n');

CONTRACTS.forEach(contractName => {
  const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);
  
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;
    
    // Export full ABI
    const abiPath = path.join(abisDir, `${contractName}.json`);
    fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
    console.log(`✅ ${contractName}.json (${abi.length} functions/events)`);
  } else {
    console.log(`⚠️  ${contractName} artifact not found - run 'npx hardhat compile' first`);
  }
});

// Create combined ABIs file for frontend
const combinedAbis = {};
CONTRACTS.forEach(contractName => {
  const abiPath = path.join(abisDir, `${contractName}.json`);
  if (fs.existsSync(abiPath)) {
    combinedAbis[contractName] = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  }
});

const combinedPath = path.join(abisDir, 'all-abis.json');
fs.writeFileSync(combinedPath, JSON.stringify(combinedAbis, null, 2));
console.log(`\n✅ all-abis.json (combined)`);

console.log('\nDone! ABIs exported to:', abisDir);
