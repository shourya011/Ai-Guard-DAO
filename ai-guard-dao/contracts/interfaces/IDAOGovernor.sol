// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDAOGovernor
 * @notice Interface for the DAO Governor contract
 * @dev This interface defines the standard governance functions
 * 
 * PURPOSE:
 * The DAOGovernor is the core governance contract for any DAO. It manages:
 * - Creating proposals
 * - Casting votes
 * - Executing approved proposals
 * - Tracking voting power
 * 
 * HOW IT WORKS WITH AI GUARD DOG:
 * 1. Someone creates a proposal via propose()
 * 2. ProposalCreated event is emitted
 * 3. AI backend listens and analyzes the proposal
 * 4. VotingAgent calls castVote() on behalf of delegated users
 * 5. When voting ends, execute() runs the proposal actions
 * 
 * BASED ON:
 * OpenZeppelin's Governor contracts with some simplifications for the hackathon.
 */
interface IDAOGovernor {
    
    // ============ ENUMS ============
    
    /**
     * @notice The state of a proposal
     */
    enum ProposalState {
        Pending,    // 0: Voting hasn't started yet
        Active,     // 1: Currently in voting period
        Canceled,   // 2: Proposal was canceled
        Defeated,   // 3: Voting ended, didn't pass
        Succeeded,  // 4: Voting ended, passed
        Queued,     // 5: Waiting in timelock
        Expired,    // 6: Timelock expired without execution
        Executed    // 7: Proposal was executed
    }

    // ============ STRUCTS ============
    
    /**
     * @notice Full proposal information
     */
    struct Proposal {
        uint256 id;
        address proposer;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool canceled;
        bool executed;
    }

    /**
     * @notice Receipt of a vote cast
     */
    struct Receipt {
        bool hasVoted;
        uint8 support;
        uint256 votes;
    }

    // ============ EVENTS ============
    
    /**
     * @notice Emitted when a new proposal is created
     * @dev AI backend MUST listen to this event to trigger analysis
     */
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address[] targets,
        uint256[] values,
        bytes[] calldatas,
        string description,
        uint256 startBlock,
        uint256 endBlock
    );

    /**
     * @notice Emitted when a vote is cast
     */
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 weight,
        string reason
    );

    /**
     * @notice Emitted when a proposal is canceled
     */
    event ProposalCanceled(uint256 indexed proposalId);

    /**
     * @notice Emitted when a proposal is executed
     */
    event ProposalExecuted(uint256 indexed proposalId);

    // ============ PROPOSAL FUNCTIONS ============

    /**
     * @notice Create a new proposal
     * @param targets Contract addresses to call
     * @param values ETH amounts to send with each call
     * @param calldatas Encoded function calls
     * @param description Human-readable description
     * @return proposalId The unique ID of the created proposal
     * 
     * EXAMPLE: Transfer 100 tokens from treasury
     * targets: [treasuryAddress]
     * values: [0]
     * calldatas: [abi.encodeWithSignature("transfer(address,uint256)", recipient, amount)]
     * description: "Transfer 100 tokens to marketing team"
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) external returns (uint256 proposalId);

    /**
     * @notice Execute a successful proposal
     * @param targets Contract addresses to call
     * @param values ETH amounts to send
     * @param calldatas Encoded function calls
     * @param descriptionHash Hash of the description
     * @return proposalId The executed proposal's ID
     */
    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) external payable returns (uint256 proposalId);

    /**
     * @notice Cancel a proposal (only proposer or admin)
     */
    function cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) external returns (uint256 proposalId);

    // ============ VOTING FUNCTIONS ============

    /**
     * @notice Cast a vote on a proposal
     * @param proposalId The proposal to vote on
     * @param support 0=against, 1=for, 2=abstain
     * @return weight The voting weight that was cast
     * 
     * NOTE: This is what VotingAgent calls on behalf of users
     */
    function castVote(
        uint256 proposalId,
        uint8 support
    ) external returns (uint256 weight);

    /**
     * @notice Cast a vote with a reason string
     */
    function castVoteWithReason(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) external returns (uint256 weight);

    /**
     * @notice Cast a vote on behalf of another user (requires signature)
     */
    function castVoteBySig(
        uint256 proposalId,
        uint8 support,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 weight);

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get the current state of a proposal
     */
    function state(uint256 proposalId) external view returns (ProposalState);

    /**
     * @notice Get full proposal details
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory);

    /**
     * @notice Get a user's voting receipt for a proposal
     */
    function getReceipt(uint256 proposalId, address voter) 
        external view returns (Receipt memory);

    /**
     * @notice Check if an account has voted on a proposal
     */
    function hasVoted(uint256 proposalId, address account) 
        external view returns (bool);

    /**
     * @notice Get voting power of an account at a specific block
     */
    function getVotes(address account, uint256 blockNumber) 
        external view returns (uint256);

    /**
     * @notice Get the proposal threshold (minimum votes to create proposal)
     */
    function proposalThreshold() external view returns (uint256);

    /**
     * @notice Get the quorum required (minimum votes for proposal to pass)
     */
    function quorum(uint256 blockNumber) external view returns (uint256);

    /**
     * @notice Get voting delay (blocks after proposal before voting starts)
     */
    function votingDelay() external view returns (uint256);

    /**
     * @notice Get voting period (how long voting lasts in blocks)
     */
    function votingPeriod() external view returns (uint256);
}
