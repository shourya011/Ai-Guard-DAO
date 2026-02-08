// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AIAgentRegistry
 * @author Monad DAO Team
 * @notice Registry for authorized AI voting agents
 * @dev This contract bridges the monad-dao with AI Guard Dog system
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      AI AGENT REGISTRY                                     ║
 * ║                                                                            ║
 * ║  PURPOSE:                                                                  ║
 * ║  - Whitelist authorized AI voting agents                                  ║
 * ║  - Bridge between DAO and AI Guard Dog system                             ║
 * ║  - Track agent reputation and performance                                 ║
 * ║  - Enable agent discovery by users                                        ║
 * ║                                                                            ║
 * ║  MACHINE DATA:                                                             ║
 * ║  - Agent addresses                                                        ║
 * ║  - Registration timestamps                                                ║
 * ║  - Vote counts                                                            ║
 * ║  - Success rates                                                          ║
 * ║                                                                            ║
 * ║  HUMAN DATA:                                                               ║
 * ║  - Agent names                                                            ║
 * ║  - Descriptions                                                           ║
 * ║  - Strategy descriptions                                                  ║
 * ║                                                                            ║
 * ║  INTEGRATION:                                                              ║
 * ║  - VotingAgent from GuardDao registers here                               ║
 * ║  - VotingEngine checks this registry for authorization                    ║
 * ║  - Users can query available agents                                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
contract AIAgentRegistry {
    
    // ============ TYPES ============
    
    struct AgentInfo {
        // Machine data
        address agentAddress;
        address owner;
        uint256 registeredAt;
        uint256 votesExecuted;
        uint256 successfulVotes;
        bool active;
        
        // Human data
        string name;
        string description;
        string strategyDescription;
        string website;
    }
    
    struct AgentStats {
        uint256 totalVotes;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 delegatorCount;
    }

    // ============ STATE VARIABLES ============
    
    /// @notice DAO Core contract
    address public daoCore;
    
    /// @notice Voting Engine (for authorization)
    address public votingEngine;
    
    /// @notice Owner
    address public owner;
    
    /// @notice Agent info storage
    mapping(address => AgentInfo) public agents;
    
    /// @notice Agent stats storage
    mapping(address => AgentStats) public agentStats;
    
    /// @notice All registered agents
    address[] public allAgents;
    
    /// @notice Agent index in array
    mapping(address => uint256) public agentIndex;
    
    /// @notice Registered agent count
    uint256 public agentCount;
    
    /// @notice Users delegated to each agent
    mapping(address => mapping(address => bool)) public userDelegations;
    
    /// @notice Agent delegator counts
    mapping(address => uint256) public delegatorCounts;

    // ============ EVENTS ============
    
    event AgentRegistered(
        address indexed agent,
        address indexed registeredBy,
        string name
    );
    event AgentDeactivated(address indexed agent);
    event AgentReactivated(address indexed agent);
    event AgentUpdated(address indexed agent, string name);
    event UserDelegatedToAgent(address indexed user, address indexed agent);
    event UserRevokedAgent(address indexed user, address indexed agent);
    event VoteRecorded(address indexed agent, uint256 indexed proposalId, uint8 voteType);

    // ============ ERRORS ============
    
    error Unauthorized();
    error AgentAlreadyRegistered();
    error AgentNotFound();
    error ZeroAddress();
    error InvalidName();

    // ============ MODIFIERS ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier onlyAgentOwner(address agent) {
        if (msg.sender != agents[agent].owner && msg.sender != owner) {
            revert Unauthorized();
        }
        _;
    }

    // ============ CONSTRUCTOR ============
    
    constructor() {
        owner = msg.sender;
    }

    // ============ INITIALIZATION ============
    
    /**
     * @notice Initialize with DAO contracts
     */
    function initialize(address _daoCore, address _votingEngine) external onlyOwner {
        daoCore = _daoCore;
        votingEngine = _votingEngine;
    }

    // ============ AGENT REGISTRATION ============
    
    /**
     * @notice Register a new AI voting agent
     * @param agentAddress Agent contract address
     * @param name Agent name
     * @param description What the agent does
     * @param strategyDescription How the agent makes decisions
     * @param website Agent website
     */
    function registerAgent(
        address agentAddress,
        string memory name,
        string memory description,
        string memory strategyDescription,
        string memory website
    ) external {
        if (agentAddress == address(0)) revert ZeroAddress();
        if (bytes(name).length == 0) revert InvalidName();
        if (agents[agentAddress].agentAddress != address(0)) {
            revert AgentAlreadyRegistered();
        }
        
        agents[agentAddress] = AgentInfo({
            agentAddress: agentAddress,
            owner: msg.sender,
            registeredAt: block.timestamp,
            votesExecuted: 0,
            successfulVotes: 0,
            active: true,
            name: name,
            description: description,
            strategyDescription: strategyDescription,
            website: website
        });
        
        agentIndex[agentAddress] = allAgents.length;
        allAgents.push(agentAddress);
        agentCount++;
        
        emit AgentRegistered(agentAddress, msg.sender, name);
    }
    
    /**
     * @notice Deactivate an agent
     */
    function deactivateAgent(address agent) external onlyAgentOwner(agent) {
        if (agents[agent].agentAddress == address(0)) revert AgentNotFound();
        
        agents[agent].active = false;
        
        emit AgentDeactivated(agent);
    }
    
    /**
     * @notice Reactivate an agent
     */
    function reactivateAgent(address agent) external onlyAgentOwner(agent) {
        if (agents[agent].agentAddress == address(0)) revert AgentNotFound();
        
        agents[agent].active = true;
        
        emit AgentReactivated(agent);
    }
    
    /**
     * @notice Update agent info
     */
    function updateAgent(
        address agent,
        string memory name,
        string memory description,
        string memory strategyDescription,
        string memory website
    ) external onlyAgentOwner(agent) {
        if (agents[agent].agentAddress == address(0)) revert AgentNotFound();
        
        AgentInfo storage info = agents[agent];
        
        if (bytes(name).length > 0) {
            info.name = name;
        }
        info.description = description;
        info.strategyDescription = strategyDescription;
        info.website = website;
        
        emit AgentUpdated(agent, name);
    }

    // ============ USER DELEGATION ============
    
    /**
     * @notice Delegate to an agent (user calls this)
     * @param agent Agent to delegate to
     * 
     * This signals that the user trusts this agent to vote on their behalf
     */
    function delegateToAgent(address agent) external {
        if (agents[agent].agentAddress == address(0)) revert AgentNotFound();
        if (userDelegations[msg.sender][agent]) return; // Already delegated
        
        userDelegations[msg.sender][agent] = true;
        delegatorCounts[agent]++;
        agentStats[agent].delegatorCount++;
        
        emit UserDelegatedToAgent(msg.sender, agent);
    }
    
    /**
     * @notice Revoke delegation from agent
     */
    function revokeAgentDelegation(address agent) external {
        if (!userDelegations[msg.sender][agent]) return; // Not delegated
        
        userDelegations[msg.sender][agent] = false;
        delegatorCounts[agent]--;
        agentStats[agent].delegatorCount--;
        
        emit UserRevokedAgent(msg.sender, agent);
    }
    
    /**
     * @notice Check if user delegated to agent
     */
    function hasDelegatedTo(address user, address agent) external view returns (bool) {
        return userDelegations[user][agent];
    }

    // ============ VOTE RECORDING ============
    
    /**
     * @notice Record a vote executed by agent
     * @dev Called by VotingEngine when agent votes
     */
    function recordVote(
        address agent,
        uint256 proposalId,
        uint8 voteType
    ) external {
        // Only allow from VotingEngine or owner for testing
        if (msg.sender != votingEngine && msg.sender != owner) {
            revert Unauthorized();
        }
        
        agents[agent].votesExecuted++;
        agentStats[agent].totalVotes++;
        
        if (voteType == 0) {
            agentStats[agent].againstVotes++;
        } else if (voteType == 1) {
            agentStats[agent].forVotes++;
        } else {
            agentStats[agent].abstainVotes++;
        }
        
        emit VoteRecorded(agent, proposalId, voteType);
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get agent info
     */
    function getAgentInfo(address agent) external view returns (AgentInfo memory) {
        return agents[agent];
    }
    
    /**
     * @notice Get agent stats
     */
    function getAgentStats(address agent) external view returns (AgentStats memory) {
        return agentStats[agent];
    }
    
    /**
     * @notice Check if agent is registered and active
     */
    function isActiveAgent(address agent) external view returns (bool) {
        return agents[agent].agentAddress != address(0) && agents[agent].active;
    }
    
    /**
     * @notice Get all active agents
     */
    function getActiveAgents() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Count active agents
        for (uint256 i = 0; i < allAgents.length; i++) {
            if (agents[allAgents[i]].active) {
                activeCount++;
            }
        }
        
        // Collect active agents
        address[] memory result = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allAgents.length; i++) {
            if (agents[allAgents[i]].active) {
                result[index] = allAgents[i];
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Get all agents (paginated)
     */
    function getAgents(uint256 offset, uint256 limit) 
        external view 
        returns (address[] memory) 
    {
        if (offset >= allAgents.length) {
            return new address[](0);
        }
        
        uint256 end = offset + limit;
        if (end > allAgents.length) {
            end = allAgents.length;
        }
        
        uint256 count = end - offset;
        address[] memory result = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            result[i] = allAgents[offset + i];
        }
        
        return result;
    }
    
    /**
     * @notice Get top agents by delegation count
     */
    function getTopAgentsByDelegators(uint256 limit) 
        external view 
        returns (address[] memory) 
    {
        uint256 count = limit > allAgents.length ? allAgents.length : limit;
        address[] memory result = new address[](count);
        
        // Simple sort (ok for view function with small arrays)
        address[] memory temp = new address[](allAgents.length);
        uint256[] memory counts = new uint256[](allAgents.length);
        
        for (uint256 i = 0; i < allAgents.length; i++) {
            temp[i] = allAgents[i];
            counts[i] = delegatorCounts[allAgents[i]];
        }
        
        for (uint256 i = 0; i < count; i++) {
            for (uint256 j = i + 1; j < temp.length; j++) {
                if (counts[j] > counts[i]) {
                    (temp[i], temp[j]) = (temp[j], temp[i]);
                    (counts[i], counts[j]) = (counts[j], counts[i]);
                }
            }
            result[i] = temp[i];
        }
        
        return result;
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Set voting engine
     */
    function setVotingEngine(address _votingEngine) external onlyOwner {
        votingEngine = _votingEngine;
    }
    
    /**
     * @notice Set DAO Core
     */
    function setDAOCore(address _daoCore) external onlyOwner {
        daoCore = _daoCore;
    }
    
    /**
     * @notice Force remove agent (admin only)
     */
    function forceRemoveAgent(address agent) external onlyOwner {
        if (agents[agent].agentAddress == address(0)) revert AgentNotFound();
        
        agents[agent].active = false;
        emit AgentDeactivated(agent);
    }
}
