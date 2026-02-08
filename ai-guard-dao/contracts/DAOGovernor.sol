// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IDAOGovernor.sol";

/**
 * @title DAOGovernor
 * @author AI Guard Dog Team
 * @notice Simplified DAO governance contract for hackathon demo
 * @dev Based on OpenZeppelin Governor patterns, simplified for clarity
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                           DAO GOVERNOR                                     ║
 * ║                                                                            ║
 * ║  WHAT THIS CONTRACT DOES:                                                  ║
 * ║  - Creates and manages proposals                                          ║
 * ║  - Tracks votes (for, against, abstain)                                   ║
 * ║  - Executes approved proposals                                            ║
 * ║  - Emits events that AI Guard Dog monitors                                ║
 * ║                                                                            ║
 * ║  SIMPLIFIED FOR HACKATHON:                                                 ║
 * ║  In production, you'd use OpenZeppelin's Governor with:                   ║
 * ║  - GovernorVotes (token-weighted voting)                                  ║
 * ║  - GovernorTimelockControl (delayed execution)                            ║
 * ║  - GovernorSettings (configurable parameters)                             ║
 * ║                                                                            ║
 * ║  This version uses simplified voting for demo purposes.                   ║
 * ║                                                                            ║
 * ║  PROPOSAL LIFECYCLE:                                                       ║
 * ║  1. propose() → ProposalCreated event (AI starts listening)               ║
 * ║  2. Voting period starts (after votingDelay blocks)                       ║
 * ║  3. castVote() called by users or VotingAgent                             ║
 * ║  4. Voting period ends                                                    ║
 * ║  5. If passed: execute() runs the proposal                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
contract DAOGovernor is IDAOGovernor {
    
    // ============ STATE VARIABLES ============
    
    /**
     * @notice The governance token (for voting power)
     * @dev In production, this would be an ERC20Votes token
     */
    address public token;
    
    /**
     * @notice Name of this DAO
     */
    string public name;
    
    /**
     * @notice Delay before voting starts (in blocks)
     * @dev Gives people time to acquire tokens and delegate
     */
    uint256 public _votingDelay;
    
    /**
     * @notice How long voting lasts (in blocks)
     */
    uint256 public _votingPeriod;
    
    /**
     * @notice Minimum votes needed to create a proposal
     */
    uint256 public _proposalThreshold;
    
    /**
     * @notice Minimum participation for proposal to be valid
     */
    uint256 public _quorumVotes;
    
    /**
     * @notice Counter for generating proposal IDs
     */
    uint256 public proposalCount;
    
    /**
     * @notice Storage for all proposals
     */
    mapping(uint256 => ProposalCore) internal _proposals;
    
    /**
     * @notice Voting receipts: proposalId => voter => Receipt
     */
    mapping(uint256 => mapping(address => Receipt)) internal _receipts;
    
    /**
     * @notice Simple voting power for demo (address => votes)
     * @dev In production, use ERC20Votes.getPastVotes()
     */
    mapping(address => uint256) public votingPower;
    
    /**
     * @notice Contract admin
     */
    address public admin;

    // ============ STRUCTS ============
    
    /**
     * @notice Internal proposal storage
     */
    struct ProposalCore {
        uint256 id;
        address proposer;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool canceled;
        bool executed;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        string description;
    }

    // ============ ERRORS ============
    
    error InvalidProposalLength();
    error ProposalNotActive();
    error AlreadyVoted();
    error InvalidVoteType();
    error ProposalNotSucceeded();
    error ProposalAlreadyExecuted();
    error ExecutionFailed();
    error OnlyProposer();
    error OnlyAdmin();
    error BelowProposalThreshold();
    error ProposalDoesNotExist();

    // ============ CONSTRUCTOR ============
    
    /**
     * @notice Deploy the DAO Governor
     * @param _name Name of the DAO
     * @param _token Governance token address (can be address(0) for demo)
     * @param votingDelay_ Blocks before voting starts
     * @param votingPeriod_ Blocks voting lasts
     * @param proposalThreshold_ Minimum votes to create proposal
     * @param quorumVotes_ Minimum votes for valid proposal
     * 
     * EXAMPLE VALUES FOR DEMO:
     * - votingDelay: 1 block (immediate for testing)
     * - votingPeriod: 50 blocks (~10 minutes on Monad)
     * - proposalThreshold: 0 (anyone can propose)
     * - quorumVotes: 1 (any participation is enough)
     */
    constructor(
        string memory _name,
        address _token,
        uint256 votingDelay_,
        uint256 votingPeriod_,
        uint256 proposalThreshold_,
        uint256 quorumVotes_
    ) {
        name = _name;
        token = _token;
        _votingDelay = votingDelay_;
        _votingPeriod = votingPeriod_;
        _proposalThreshold = proposalThreshold_;
        _quorumVotes = quorumVotes_;
        admin = msg.sender;
        
        // Give admin voting power for demo
        votingPower[msg.sender] = 1000;
    }

    // ============ PROPOSAL FUNCTIONS ============
    
    /**
     * @notice Create a new proposal
     * @param targets Contract addresses to call if proposal passes
     * @param values ETH amounts to send with each call
     * @param calldatas Encoded function calls
     * @param description Human-readable proposal description
     * @return proposalId The unique ID of the created proposal
     * 
     * HOW IT WORKS:
     * 1. You specify what the proposal will DO (targets, values, calldatas)
     * 2. You describe it in human terms (description)
     * 3. Contract creates proposal and emits ProposalCreated event
     * 4. AI GUARD DOG LISTENS TO THIS EVENT and starts analysis
     * 
     * EXAMPLE - Simple ETH transfer:
     * targets: [recipientAddress]
     * values: [1 ether]
     * calldatas: ["0x"] // empty call
     * description: "Send 1 ETH to marketing team"
     * 
     * EXAMPLE - Contract function call:
     * targets: [treasuryAddress]
     * values: [0]
     * calldatas: [abi.encodeWithSignature("transfer(address,uint256)", recipient, amount)]
     * description: "Transfer 100 tokens from treasury"
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) external returns (uint256 proposalId) {
        // Validate arrays match
        if (targets.length != values.length || 
            targets.length != calldatas.length ||
            targets.length == 0) {
            revert InvalidProposalLength();
        }
        
        // Check proposer has enough voting power (skip for demo if threshold is 0)
        if (_proposalThreshold > 0 && votingPower[msg.sender] < _proposalThreshold) {
            revert BelowProposalThreshold();
        }
        
        // Generate proposal ID
        proposalCount++;
        proposalId = proposalCount;
        
        // Calculate voting timeline
        uint256 startBlock = block.number + _votingDelay;
        uint256 endBlock = startBlock + _votingPeriod;
        
        // Store proposal
        _proposals[proposalId] = ProposalCore({
            id: proposalId,
            proposer: msg.sender,
            startBlock: startBlock,
            endBlock: endBlock,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            canceled: false,
            executed: false,
            targets: targets,
            values: values,
            calldatas: calldatas,
            description: description
        });
        
        // CRITICAL EVENT: AI Guard Dog monitors this
        emit ProposalCreated(
            proposalId,
            msg.sender,
            targets,
            values,
            calldatas,
            description,
            startBlock,
            endBlock
        );
        
        return proposalId;
    }
    
    /**
     * @notice Execute a successful proposal
     * @param targets Contract addresses to call
     * @param values ETH amounts to send
     * @param calldatas Encoded function calls
     * @param descriptionHash Hash of the description
     * 
     * WHEN TO CALL:
     * - After voting period ends
     * - Only if proposal state is Succeeded
     * 
     * WHAT HAPPENS:
     * Each target contract is called with its corresponding value and calldata.
     * If any call fails, the entire execution reverts.
     */
    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) external payable returns (uint256 proposalId) {
        // Find proposal by hash (simplified: just use proposalCount)
        proposalId = proposalCount; // In production, compute from params hash
        
        ProposalCore storage proposal = _proposals[proposalId];
        
        // Verify proposal can be executed
        if (state(proposalId) != ProposalState.Succeeded) {
            revert ProposalNotSucceeded();
        }
        
        // Mark as executed
        proposal.executed = true;
        
        // Execute each action
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, ) = targets[i].call{value: values[i]}(calldatas[i]);
            if (!success) revert ExecutionFailed();
        }
        
        emit ProposalExecuted(proposalId);
        
        return proposalId;
    }
    
    /**
     * @notice Cancel a proposal
     * @dev Only proposer or admin can cancel
     */
    function cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) external returns (uint256 proposalId) {
        proposalId = proposalCount;
        
        ProposalCore storage proposal = _proposals[proposalId];
        
        if (msg.sender != proposal.proposer && msg.sender != admin) {
            revert OnlyProposer();
        }
        
        proposal.canceled = true;
        
        emit ProposalCanceled(proposalId);
        
        return proposalId;
    }

    // ============ VOTING FUNCTIONS ============
    
    /**
     * @notice Cast a vote on a proposal
     * @param proposalId The proposal to vote on
     * @param support 0=against, 1=for, 2=abstain
     * @return weight The voting weight that was cast
     * 
     * WHO CALLS THIS:
     * - Users voting directly
     * - VotingAgent voting on behalf of users
     * 
     * THE AI GUARD DOG FLOW:
     * 1. User delegates to VotingAgent
     * 2. Proposal created → AI analyzes
     * 3. Risk < threshold → VotingAgent calls this function
     * 4. Vote is recorded with user's voting power
     */
    function castVote(
        uint256 proposalId,
        uint8 support
    ) external returns (uint256 weight) {
        return _castVote(msg.sender, proposalId, support, "");
    }
    
    /**
     * @notice Cast a vote with a reason string
     */
    function castVoteWithReason(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) external returns (uint256 weight) {
        return _castVote(msg.sender, proposalId, support, reason);
    }
    
    /**
     * @notice Cast a vote using EIP-712 signature (gasless voting)
     * @dev Allows meta-transactions - user signs, relayer submits
     */
    function castVoteBySig(
        uint256 proposalId,
        uint8 support,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 weight) {
        // Simplified: In production, recover signer from signature
        // For demo, just cast as msg.sender
        return _castVote(msg.sender, proposalId, support, "");
    }
    
    /**
     * @notice Internal vote casting logic
     */
    function _castVote(
        address voter,
        uint256 proposalId,
        uint8 support,
        string memory reason
    ) internal returns (uint256 weight) {
        ProposalCore storage proposal = _proposals[proposalId];
        
        // Verify proposal exists and is active
        if (proposal.id == 0) revert ProposalDoesNotExist();
        if (state(proposalId) != ProposalState.Active) revert ProposalNotActive();
        
        // Check hasn't already voted
        Receipt storage receipt = _receipts[proposalId][voter];
        if (receipt.hasVoted) revert AlreadyVoted();
        
        // Validate vote type
        if (support > 2) revert InvalidVoteType();
        
        // Get voting power (simplified for demo)
        weight = votingPower[voter];
        if (weight == 0) weight = 1; // Give everyone at least 1 vote for demo
        
        // Record vote
        if (support == 0) {
            proposal.againstVotes += weight;
        } else if (support == 1) {
            proposal.forVotes += weight;
        } else {
            proposal.abstainVotes += weight;
        }
        
        // Store receipt
        receipt.hasVoted = true;
        receipt.support = support;
        receipt.votes = weight;
        
        emit VoteCast(voter, proposalId, support, weight, reason);
        
        return weight;
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get the current state of a proposal
     * @param proposalId The proposal ID to check
     * @return The proposal state enum value
     * 
     * STATES:
     * - Pending (0): Voting hasn't started yet
     * - Active (1): Currently accepting votes
     * - Canceled (2): Proposal was canceled
     * - Defeated (3): Voting ended, didn't pass
     * - Succeeded (4): Voting ended, passed
     * - Executed (7): Proposal was executed
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        ProposalCore storage proposal = _proposals[proposalId];
        
        if (proposal.id == 0) {
            revert ProposalDoesNotExist();
        }
        
        if (proposal.canceled) {
            return ProposalState.Canceled;
        }
        
        if (proposal.executed) {
            return ProposalState.Executed;
        }
        
        if (block.number < proposal.startBlock) {
            return ProposalState.Pending;
        }
        
        if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        }
        
        // Voting ended - check if passed
        if (proposal.forVotes > proposal.againstVotes && 
            proposal.forVotes >= _quorumVotes) {
            return ProposalState.Succeeded;
        }
        
        return ProposalState.Defeated;
    }
    
    /**
     * @notice Get full proposal details
     * @param proposalId The proposal ID to fetch
     * @return The proposal struct
     */
    function getProposal(uint256 proposalId) 
        external view returns (Proposal memory) 
    {
        ProposalCore storage p = _proposals[proposalId];
        
        return Proposal({
            id: p.id,
            proposer: p.proposer,
            startBlock: p.startBlock,
            endBlock: p.endBlock,
            forVotes: p.forVotes,
            againstVotes: p.againstVotes,
            abstainVotes: p.abstainVotes,
            canceled: p.canceled,
            executed: p.executed
        });
    }
    
    /**
     * @notice Get proposal description
     */
    function getProposalDescription(uint256 proposalId) 
        external view returns (string memory) 
    {
        return _proposals[proposalId].description;
    }
    
    /**
     * @notice Get proposal actions (targets, values, calldatas)
     */
    function getProposalActions(uint256 proposalId) 
        external view returns (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas
        ) 
    {
        ProposalCore storage p = _proposals[proposalId];
        return (p.targets, p.values, p.calldatas);
    }
    
    /**
     * @notice Get a user's voting receipt for a proposal
     */
    function getReceipt(uint256 proposalId, address voter) 
        external view returns (Receipt memory) 
    {
        return _receipts[proposalId][voter];
    }
    
    /**
     * @notice Check if an account has voted on a proposal
     */
    function hasVoted(uint256 proposalId, address account) 
        external view returns (bool) 
    {
        return _receipts[proposalId][account].hasVoted;
    }
    
    /**
     * @notice Get voting power of an account
     * @dev Simplified for demo - just returns stored voting power
     */
    function getVotes(address account, uint256 blockNumber) 
        external view returns (uint256) 
    {
        // In production: return token.getPastVotes(account, blockNumber)
        return votingPower[account];
    }
    
    function proposalThreshold() external view returns (uint256) {
        return _proposalThreshold;
    }
    
    function quorum(uint256 blockNumber) external view returns (uint256) {
        return _quorumVotes;
    }
    
    function votingDelay() external view returns (uint256) {
        return _votingDelay;
    }
    
    function votingPeriod() external view returns (uint256) {
        return _votingPeriod;
    }

    // ============ ADMIN FUNCTIONS (FOR DEMO) ============
    
    /**
     * @notice Grant voting power to an address (for demo/testing)
     * @param account Address to grant voting power
     * @param amount Amount of voting power to grant
     */
    function grantVotingPower(address account, uint256 amount) external {
        if (msg.sender != admin) revert OnlyAdmin();
        votingPower[account] = amount;
    }
    
    /**
     * @notice Batch grant voting power (for demo setup)
     */
    function batchGrantVotingPower(
        address[] calldata accounts, 
        uint256[] calldata amounts
    ) external {
        if (msg.sender != admin) revert OnlyAdmin();
        require(accounts.length == amounts.length, "Length mismatch");
        
        for (uint256 i = 0; i < accounts.length; i++) {
            votingPower[accounts[i]] = amounts[i];
        }
    }

    /**
     * @notice Allow contract to receive ETH (for proposal execution)
     */
    receive() external payable {}
}
