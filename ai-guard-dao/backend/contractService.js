/**
 * AI Guard DAO - Contract Service
 * 
 * This module provides easy-to-use functions for the frontend to interact
 * with the AI Guard DAO smart contracts. It handles:
 * - Contract initialization
 * - Read operations (view functions)
 * - Write operations (transactions)
 * - Event listening
 * 
 * USAGE:
 * 1. Include this file in your frontend
 * 2. Call contractService.init(provider, addresses) with your connected provider
 * 3. Use the service methods to interact with contracts
 * 
 * EXAMPLE:
 * ```javascript
 * // Initialize with MetaMask
 * const provider = new ethers.BrowserProvider(window.ethereum);
 * const signer = await provider.getSigner();
 * 
 * await contractService.init(signer, {
 *   votingAgent: '0x...',
 *   auditLogger: '0x...',
 *   daoGovernor: '0x...'
 * });
 * 
 * // Delegate voting power
 * await contractService.delegate(daoAddress, 50, false);
 * 
 * // Check delegation
 * const delegation = await contractService.getDelegation(userAddress, daoAddress);
 * ```
 */

const ContractService = {
  // Contract instances
  votingAgent: null,
  auditLogger: null,
  daoGovernor: null,
  mockToken: null,
  
  // Provider and signer
  provider: null,
  signer: null,
  
  // Contract ABIs
  abis: {
    votingAgent: null,
    auditLogger: null,
    daoGovernor: null,
    mockToken: null
  },
  
  // Addresses
  addresses: {
    votingAgent: '',
    auditLogger: '',
    daoGovernor: '',
    mockToken: ''
  },

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  /**
   * Initialize the contract service
   * @param {object} signerOrProvider - ethers.js signer or provider
   * @param {object} addresses - Contract addresses
   * @param {object} abis - Contract ABIs (optional, will fetch if not provided)
   */
  async init(signerOrProvider, addresses, abis = null) {
    console.log('[ContractService] Initializing...');
    
    this.addresses = { ...this.addresses, ...addresses };
    
    // Determine if it's a signer or provider
    if (signerOrProvider.signMessage) {
      this.signer = signerOrProvider;
      this.provider = signerOrProvider.provider;
    } else {
      this.provider = signerOrProvider;
      this.signer = null;
    }
    
    // Load ABIs
    if (abis) {
      this.abis = { ...this.abis, ...abis };
    } else {
      await this.loadABIs();
    }
    
    // Create contract instances
    this.createContractInstances();
    
    console.log('[ContractService] Initialized successfully');
    return true;
  },

  /**
   * Load ABIs from backend or local files
   */
  async loadABIs() {
    try {
      // Try to fetch from backend
      const response = await fetch('/api/abis');
      if (response.ok) {
        this.abis = await response.json();
        return;
      }
    } catch (e) {
      console.log('[ContractService] Could not fetch ABIs from backend, using embedded');
    }
    
    // Use embedded minimal ABIs if fetch fails
    this.abis = {
      votingAgent: VOTING_AGENT_ABI,
      auditLogger: AUDIT_LOGGER_ABI,
      daoGovernor: DAO_GOVERNOR_ABI,
      mockToken: MOCK_TOKEN_ABI
    };
  },

  /**
   * Create contract instances
   */
  createContractInstances() {
    const connectedTo = this.signer || this.provider;
    
    if (this.addresses.votingAgent && this.abis.votingAgent) {
      this.votingAgent = new ethers.Contract(
        this.addresses.votingAgent,
        this.abis.votingAgent,
        connectedTo
      );
    }
    
    if (this.addresses.auditLogger && this.abis.auditLogger) {
      this.auditLogger = new ethers.Contract(
        this.addresses.auditLogger,
        this.abis.auditLogger,
        connectedTo
      );
    }
    
    if (this.addresses.daoGovernor && this.abis.daoGovernor) {
      this.daoGovernor = new ethers.Contract(
        this.addresses.daoGovernor,
        this.abis.daoGovernor,
        connectedTo
      );
    }
    
    if (this.addresses.mockToken && this.abis.mockToken) {
      this.mockToken = new ethers.Contract(
        this.addresses.mockToken,
        this.abis.mockToken,
        connectedTo
      );
    }
  },

  // =============================================================================
  // VOTING AGENT - DELEGATION FUNCTIONS
  // =============================================================================

  /**
   * Delegate voting power to AI Guard Dog for a DAO
   * @param {string} daoGovernor - DAO governor contract address
   * @param {number} riskThreshold - Risk threshold (0-100)
   * @param {boolean} requireApproval - Require manual approval for each vote
   * @returns {Promise<object>} Transaction receipt
   */
  async delegate(daoGovernor, riskThreshold, requireApproval = false) {
    if (!this.votingAgent || !this.signer) {
      throw new Error('Contract not initialized or no signer');
    }
    
    console.log(`[ContractService] Delegating to ${daoGovernor} with threshold ${riskThreshold}`);
    
    const tx = await this.votingAgent.delegateVotingPower(
      daoGovernor,
      riskThreshold,
      requireApproval
    );
    
    const receipt = await tx.wait();
    console.log('[ContractService] Delegation successful:', receipt.hash);
    
    return receipt;
  },

  /**
   * Revoke delegation for a specific DAO
   * @param {string} daoGovernor - DAO governor contract address
   * @returns {Promise<object>} Transaction receipt
   */
  async revokeDelegation(daoGovernor) {
    if (!this.votingAgent || !this.signer) {
      throw new Error('Contract not initialized or no signer');
    }
    
    console.log(`[ContractService] Revoking delegation for ${daoGovernor}`);
    
    const tx = await this.votingAgent.revokeDelegation(daoGovernor);
    const receipt = await tx.wait();
    
    console.log('[ContractService] Revocation successful:', receipt.hash);
    return receipt;
  },

  /**
   * Revoke ALL delegations (emergency)
   * @returns {Promise<object>} Transaction receipt
   */
  async revokeAll() {
    if (!this.votingAgent || !this.signer) {
      throw new Error('Contract not initialized or no signer');
    }
    
    console.log('[ContractService] Revoking all delegations');
    
    const tx = await this.votingAgent.revokeAll();
    const receipt = await tx.wait();
    
    console.log('[ContractService] All delegations revoked:', receipt.hash);
    return receipt;
  },

  /**
   * Update risk threshold for a delegation
   * @param {string} daoGovernor - DAO governor contract address
   * @param {number} newThreshold - New risk threshold (0-100)
   * @returns {Promise<object>} Transaction receipt
   */
  async updateRiskThreshold(daoGovernor, newThreshold) {
    if (!this.votingAgent || !this.signer) {
      throw new Error('Contract not initialized or no signer');
    }
    
    const tx = await this.votingAgent.updateRiskThreshold(daoGovernor, newThreshold);
    const receipt = await tx.wait();
    
    return receipt;
  },

  /**
   * Approve a high-risk vote manually
   * @param {string} daoGovernor - DAO governor contract address
   * @param {number} proposalId - Proposal ID
   * @param {number} support - 0=against, 1=for, 2=abstain
   * @returns {Promise<object>} Transaction receipt
   */
  async approveHighRiskVote(daoGovernor, proposalId, support) {
    if (!this.votingAgent || !this.signer) {
      throw new Error('Contract not initialized or no signer');
    }
    
    console.log(`[ContractService] Approving high-risk vote: proposal ${proposalId}, support ${support}`);
    
    const tx = await this.votingAgent.approveHighRiskVote(
      daoGovernor,
      proposalId,
      support
    );
    
    const receipt = await tx.wait();
    console.log('[ContractService] High-risk vote approved:', receipt.hash);
    
    return receipt;
  },

  // =============================================================================
  // VOTING AGENT - VIEW FUNCTIONS
  // =============================================================================

  /**
   * Get delegation status for a user and DAO
   * @param {string} user - User address
   * @param {string} daoGovernor - DAO governor address
   * @returns {Promise<object>} Delegation info
   */
  async getDelegation(user, daoGovernor) {
    if (!this.votingAgent) {
      throw new Error('VotingAgent contract not initialized');
    }
    
    const delegation = await this.votingAgent.getDelegation(user, daoGovernor);
    
    return {
      active: delegation.active,
      riskThreshold: Number(delegation.riskThreshold),
      delegatedAt: new Date(Number(delegation.delegatedAt) * 1000),
      requiresApproval: delegation.requiresApproval
    };
  },

  /**
   * Check if user has active delegation
   * @param {string} user - User address
   * @param {string} daoGovernor - DAO governor address
   * @returns {Promise<boolean>}
   */
  async hasDelegation(user, daoGovernor) {
    if (!this.votingAgent) {
      throw new Error('VotingAgent contract not initialized');
    }
    
    return await this.votingAgent.hasDelegation(user, daoGovernor);
  },

  /**
   * Get all DAOs a user has delegated to
   * @param {string} user - User address
   * @returns {Promise<string[]>} Array of DAO addresses
   */
  async getUserDAOs(user) {
    if (!this.votingAgent) {
      throw new Error('VotingAgent contract not initialized');
    }
    
    return await this.votingAgent.getUserDAOs(user);
  },

  // =============================================================================
  // DAO GOVERNOR - PROPOSAL FUNCTIONS
  // =============================================================================

  /**
   * Get all proposals
   * @returns {Promise<object[]>} Array of proposals
   */
  async getAllProposals() {
    if (!this.daoGovernor) {
      throw new Error('DAOGovernor contract not initialized');
    }
    
    const count = await this.daoGovernor.proposalCount();
    const proposals = [];
    
    for (let i = 1; i <= count; i++) {
      const proposal = await this.getProposal(i);
      proposals.push(proposal);
    }
    
    return proposals;
  },

  /**
   * Get a specific proposal
   * @param {number} proposalId - Proposal ID
   * @returns {Promise<object>} Proposal details
   */
  async getProposal(proposalId) {
    if (!this.daoGovernor) {
      throw new Error('DAOGovernor contract not initialized');
    }
    
    const proposal = await this.daoGovernor.getProposal(proposalId);
    const description = await this.daoGovernor.getProposalDescription(proposalId);
    const state = await this.daoGovernor.state(proposalId);
    
    const stateNames = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
    
    return {
      id: Number(proposal.id),
      proposer: proposal.proposer,
      startBlock: Number(proposal.startBlock),
      endBlock: Number(proposal.endBlock),
      forVotes: Number(proposal.forVotes),
      againstVotes: Number(proposal.againstVotes),
      abstainVotes: Number(proposal.abstainVotes),
      canceled: proposal.canceled,
      executed: proposal.executed,
      description,
      state: state,
      stateName: stateNames[state]
    };
  },

  /**
   * Get proposal actions
   * @param {number} proposalId - Proposal ID
   * @returns {Promise<object>} Proposal actions
   */
  async getProposalActions(proposalId) {
    if (!this.daoGovernor) {
      throw new Error('DAOGovernor contract not initialized');
    }
    
    const [targets, values, calldatas] = await this.daoGovernor.getProposalActions(proposalId);
    
    return {
      targets,
      values: values.map(v => ethers.formatEther(v)),
      calldatas
    };
  },

  /**
   * Create a new proposal
   * @param {string[]} targets - Target contract addresses
   * @param {string[]} values - ETH values to send
   * @param {string[]} calldatas - Encoded function calls
   * @param {string} description - Proposal description
   * @returns {Promise<object>} Transaction receipt and proposal ID
   */
  async createProposal(targets, values, calldatas, description) {
    if (!this.daoGovernor || !this.signer) {
      throw new Error('Contract not initialized or no signer');
    }
    
    const tx = await this.daoGovernor.propose(targets, values, calldatas, description);
    const receipt = await tx.wait();
    
    // Extract proposal ID from event
    const event = receipt.logs.find(log => log.eventName === 'ProposalCreated');
    const proposalId = event ? Number(event.args.proposalId) : null;
    
    return { receipt, proposalId };
  },

  /**
   * Cast a direct vote on a proposal
   * @param {number} proposalId - Proposal ID
   * @param {number} support - 0=against, 1=for, 2=abstain
   * @returns {Promise<object>} Transaction receipt
   */
  async castVote(proposalId, support) {
    if (!this.daoGovernor || !this.signer) {
      throw new Error('Contract not initialized or no signer');
    }
    
    const tx = await this.daoGovernor.castVote(proposalId, support);
    const receipt = await tx.wait();
    
    return receipt;
  },

  /**
   * Cast a vote with reason
   * @param {number} proposalId - Proposal ID
   * @param {number} support - 0=against, 1=for, 2=abstain
   * @param {string} reason - Vote reason
   * @returns {Promise<object>} Transaction receipt
   */
  async castVoteWithReason(proposalId, support, reason) {
    if (!this.daoGovernor || !this.signer) {
      throw new Error('Contract not initialized or no signer');
    }
    
    const tx = await this.daoGovernor.castVoteWithReason(proposalId, support, reason);
    const receipt = await tx.wait();
    
    return receipt;
  },

  /**
   * Check if user has voted on a proposal
   * @param {number} proposalId - Proposal ID
   * @param {string} account - User address
   * @returns {Promise<boolean>}
   */
  async hasVoted(proposalId, account) {
    if (!this.daoGovernor) {
      throw new Error('DAOGovernor contract not initialized');
    }
    
    return await this.daoGovernor.hasVoted(proposalId, account);
  },

  /**
   * Get user's vote receipt for a proposal
   * @param {number} proposalId - Proposal ID
   * @param {string} voter - Voter address
   * @returns {Promise<object>} Vote receipt
   */
  async getReceipt(proposalId, voter) {
    if (!this.daoGovernor) {
      throw new Error('DAOGovernor contract not initialized');
    }
    
    const receipt = await this.daoGovernor.getReceipt(proposalId, voter);
    
    return {
      hasVoted: receipt.hasVoted,
      support: receipt.support,
      votes: Number(receipt.votes)
    };
  },

  // =============================================================================
  // AUDIT LOGGER - VIEW FUNCTIONS
  // =============================================================================

  /**
   * Get user's audit history
   * @param {string} user - User address
   * @param {number} limit - Maximum entries to return
   * @returns {Promise<object[]>} Array of audit entries
   */
  async getUserAuditHistory(user, limit = 20) {
    if (!this.auditLogger) {
      throw new Error('AuditLogger contract not initialized');
    }
    
    const entries = await this.auditLogger.getUserAuditHistory(user, limit);
    
    return entries.map(entry => ({
      proposalId: Number(entry.proposalId),
      daoGovernor: entry.daoGovernor,
      user: entry.user,
      support: entry.support,
      supportName: ['Against', 'For', 'Abstain'][entry.support] || 'Flagged',
      riskScore: Number(entry.riskScore),
      reportHash: entry.reportHash,
      timestamp: new Date(Number(entry.timestamp) * 1000),
      wasAutoVote: entry.wasAutoVote
    }));
  },

  /**
   * Get audit entries for a proposal
   * @param {number} proposalId - Proposal ID
   * @returns {Promise<object[]>} Array of audit entries
   */
  async getProposalAudit(proposalId) {
    if (!this.auditLogger) {
      throw new Error('AuditLogger contract not initialized');
    }
    
    const entries = await this.auditLogger.getProposalAudit(proposalId);
    
    return entries.map(entry => ({
      proposalId: Number(entry.proposalId),
      daoGovernor: entry.daoGovernor,
      user: entry.user,
      support: entry.support,
      supportName: ['Against', 'For', 'Abstain'][entry.support] || 'Flagged',
      riskScore: Number(entry.riskScore),
      reportHash: entry.reportHash,
      timestamp: new Date(Number(entry.timestamp) * 1000),
      wasAutoVote: entry.wasAutoVote
    }));
  },

  /**
   * Get total decisions logged
   * @returns {Promise<number>}
   */
  async getTotalDecisions() {
    if (!this.auditLogger) {
      throw new Error('AuditLogger contract not initialized');
    }
    
    return Number(await this.auditLogger.getTotalDecisions());
  },

  /**
   * Get total high risk flags
   * @returns {Promise<number>}
   */
  async getTotalHighRiskFlags() {
    if (!this.auditLogger) {
      throw new Error('AuditLogger contract not initialized');
    }
    
    return Number(await this.auditLogger.getTotalHighRiskFlags());
  },

  // =============================================================================
  // EVENT LISTENERS
  // =============================================================================

  /**
   * Listen for new proposals
   * @param {function} callback - Callback function(proposalId, proposer, description)
   */
  onProposalCreated(callback) {
    if (!this.daoGovernor) return;
    
    this.daoGovernor.on('ProposalCreated', (proposalId, proposer, targets, values, calldatas, description, startBlock, endBlock) => {
      callback({
        proposalId: Number(proposalId),
        proposer,
        description,
        startBlock: Number(startBlock),
        endBlock: Number(endBlock)
      });
    });
  },

  /**
   * Listen for vote cast events
   * @param {function} callback - Callback function
   */
  onVoteCast(callback) {
    if (!this.daoGovernor) return;
    
    this.daoGovernor.on('VoteCast', (voter, proposalId, support, weight, reason) => {
      callback({
        voter,
        proposalId: Number(proposalId),
        support,
        weight: Number(weight),
        reason
      });
    });
  },

  /**
   * Listen for AI vote cast events
   * @param {function} callback - Callback function
   */
  onAIVoteCast(callback) {
    if (!this.votingAgent) return;
    
    this.votingAgent.on('VoteCastByAI', (proposalId, user, support, riskScore) => {
      callback({
        proposalId: Number(proposalId),
        user,
        support,
        riskScore: Number(riskScore)
      });
    });
  },

  /**
   * Listen for high risk alerts
   * @param {function} callback - Callback function
   */
  onHighRiskAlert(callback) {
    if (!this.votingAgent) return;
    
    this.votingAgent.on('HighRiskProposalDetected', (proposalId, user, riskScore) => {
      callback({
        proposalId: Number(proposalId),
        user,
        riskScore: Number(riskScore)
      });
    });
  },

  /**
   * Listen for delegation events
   * @param {function} callback - Callback function
   */
  onDelegated(callback) {
    if (!this.votingAgent) return;
    
    this.votingAgent.on('VotingPowerDelegated', (user, daoGovernor, riskThreshold) => {
      callback({
        user,
        daoGovernor,
        riskThreshold: Number(riskThreshold)
      });
    });
  },

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    if (this.daoGovernor) {
      this.daoGovernor.removeAllListeners();
    }
    if (this.votingAgent) {
      this.votingAgent.removeAllListeners();
    }
    if (this.auditLogger) {
      this.auditLogger.removeAllListeners();
    }
  }
};

// =============================================================================
// MINIMAL ABIs (Fallback if not loaded from artifacts)
// =============================================================================

const VOTING_AGENT_ABI = [
  "function delegateVotingPower(address daoGovernor, uint256 riskThreshold, bool requireApproval) external",
  "function revokeDelegation(address daoGovernor) external",
  "function revokeAll() external",
  "function approveHighRiskVote(address daoGovernor, uint256 proposalId, uint8 support) external",
  "function updateRiskThreshold(address daoGovernor, uint256 newThreshold) external",
  "function getDelegation(address user, address daoGovernor) external view returns (bool active, uint256 riskThreshold, uint256 delegatedAt, bool requiresApproval)",
  "function hasDelegation(address user, address daoGovernor) external view returns (bool)",
  "function getUserDAOs(address user) external view returns (address[])",
  "function isAuthorizedBackend(address backend) external view returns (bool)",
  "event VotingPowerDelegated(address indexed user, address indexed daoGovernor, uint256 riskThreshold)",
  "event DelegationRevoked(address indexed user, address indexed daoGovernor)",
  "event AllDelegationsRevoked(address indexed user)",
  "event VoteCastByAI(uint256 indexed proposalId, address indexed user, uint8 support, uint256 riskScore)",
  "event HighRiskProposalDetected(uint256 indexed proposalId, address indexed user, uint256 riskScore)",
  "event ApprovalRequired(uint256 indexed proposalId, address indexed user, uint256 riskScore)",
  "event HighRiskVoteApproved(address indexed user, uint256 indexed proposalId, uint8 support)"
];

const AUDIT_LOGGER_ABI = [
  "function getProposalAudit(uint256 proposalId) external view returns (tuple(uint256 proposalId, address daoGovernor, address user, uint8 support, uint256 riskScore, bytes32 reportHash, uint256 timestamp, bool wasAutoVote)[])",
  "function getProposalAuditByDAO(uint256 proposalId, address daoGovernor) external view returns (tuple(uint256 proposalId, address daoGovernor, address user, uint8 support, uint256 riskScore, bytes32 reportHash, uint256 timestamp, bool wasAutoVote)[])",
  "function getUserAuditHistory(address user, uint256 limit) external view returns (tuple(uint256 proposalId, address daoGovernor, address user, uint8 support, uint256 riskScore, bytes32 reportHash, uint256 timestamp, bool wasAutoVote)[])",
  "function getTotalDecisions() external view returns (uint256)",
  "function getTotalHighRiskFlags() external view returns (uint256)",
  "function getDAOAuditHistory(address daoGovernor) external view returns (tuple(uint256 proposalId, address daoGovernor, address user, uint8 support, uint256 riskScore, bytes32 reportHash, uint256 timestamp, bool wasAutoVote)[])",
  "event DecisionLogged(uint256 indexed proposalId, address indexed daoGovernor, address indexed user, uint8 support, uint256 riskScore, bytes32 reportHash, bool wasAutoVote)",
  "event HighRiskFlagged(uint256 indexed proposalId, address indexed daoGovernor, address indexed user, uint256 riskScore, bytes32 reportHash)"
];

const DAO_GOVERNOR_ABI = [
  "function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description) external returns (uint256)",
  "function execute(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) external payable returns (uint256)",
  "function cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) external returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support) external returns (uint256)",
  "function castVoteWithReason(uint256 proposalId, uint8 support, string calldata reason) external returns (uint256)",
  "function state(uint256 proposalId) public view returns (uint8)",
  "function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address proposer, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool executed))",
  "function getProposalDescription(uint256 proposalId) external view returns (string)",
  "function getProposalActions(uint256 proposalId) external view returns (address[], uint256[], bytes[])",
  "function getReceipt(uint256 proposalId, address voter) external view returns (bool hasVoted, uint8 support, uint256 votes)",
  "function hasVoted(uint256 proposalId, address account) external view returns (bool)",
  "function proposalCount() public view returns (uint256)",
  "function votingDelay() external view returns (uint256)",
  "function votingPeriod() external view returns (uint256)",
  "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address[] targets, uint256[] values, bytes[] calldatas, string description, uint256 startBlock, uint256 endBlock)",
  "event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight, string reason)",
  "event ProposalCanceled(uint256 indexed proposalId)",
  "event ProposalExecuted(uint256 indexed proposalId)"
];

const MOCK_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function delegate(address delegatee) external",
  "function delegates(address account) view returns (address)",
  "function getVotes(address account) view returns (uint256)",
  "function getPastVotes(address account, uint256 blockNumber) view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "function faucet(uint256 amount) external",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)"
];

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContractService;
}

// Global export for browser
if (typeof window !== 'undefined') {
  window.ContractService = ContractService;
}
