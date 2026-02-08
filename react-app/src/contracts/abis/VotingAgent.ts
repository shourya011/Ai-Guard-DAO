/**
 * VotingAgent ABI
 * 
 * Contract for managing AI delegation and automated voting
 */

export const votingAgentAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_auditLogger', type: 'address' },
      { name: '_initialBackend', type: 'address' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'delegateVotingPower',
    inputs: [
      { name: 'daoGovernor', type: 'address' },
      { name: 'riskThreshold', type: 'uint256' },
      { name: 'requireApproval', type: 'bool' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'revokeDelegation',
    inputs: [
      { name: 'daoGovernor', type: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'revokeAll',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'approveHighRiskVote',
    inputs: [
      { name: 'daoGovernor', type: 'address' },
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'updateRiskThreshold',
    inputs: [
      { name: 'daoGovernor', type: 'address' },
      { name: 'newThreshold', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getDelegation',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'daoGovernor', type: 'address' }
    ],
    outputs: [
      { name: 'active', type: 'bool' },
      { name: 'riskThreshold', type: 'uint256' },
      { name: 'delegatedAt', type: 'uint256' },
      { name: 'requiresApproval', type: 'bool' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'delegations',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'daoGovernor', type: 'address' }
    ],
    outputs: [
      { name: 'active', type: 'bool' },
      { name: 'riskThreshold', type: 'uint256' },
      { name: 'delegatedAt', type: 'uint256' },
      { name: 'requiresApproval', type: 'bool' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'pendingApprovals',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'proposalId', type: 'uint256' },
      { name: 'daoGovernor', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'bool' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'MAX_RISK_THRESHOLD',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'MEDIUM_RISK_THRESHOLD',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'paused',
    inputs: [],
    outputs: [
      { name: '', type: 'bool' }
    ],
    stateMutability: 'view'
  },
  // Events
  {
    type: 'event',
    name: 'VotingPowerDelegated',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'daoGovernor', type: 'address', indexed: true },
      { name: 'riskThreshold', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'DelegationRevoked',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'daoGovernor', type: 'address', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'RiskThresholdUpdated',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'daoGovernor', type: 'address', indexed: true },
      { name: 'oldThreshold', type: 'uint256', indexed: false },
      { name: 'newThreshold', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'VoteCastByAI',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'support', type: 'uint8', indexed: false },
      { name: 'riskScore', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'HighRiskProposalDetected',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'riskScore', type: 'uint256', indexed: false }
    ]
  }
] as const;

export default votingAgentAbi;
