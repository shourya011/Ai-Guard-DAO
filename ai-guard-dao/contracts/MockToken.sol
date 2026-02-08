// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockToken
 * @author AI Guard Dog Team
 * @notice Simple ERC20 token for testing DAO governance
 * @dev This is a simplified token for hackathon demo purposes only
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                           MOCK TOKEN                                       ║
 * ║                                                                            ║
 * ║  PURPOSE:                                                                  ║
 * ║  Provides a simple governance token for testing the AI Guard Dog system.  ║
 * ║                                                                            ║
 * ║  FOR TESTING:                                                              ║
 * ║  1. Deploy MockToken                                                      ║
 * ║  2. Mint tokens to test accounts                                          ║
 * ║  3. Use with DAOGovernor for voting                                       ║
 * ║                                                                            ║
 * ║  IN PRODUCTION:                                                            ║
 * ║  You would use OpenZeppelin's ERC20Votes which includes:                  ║
 * ║  - Checkpoint-based voting power                                          ║
 * ║  - Delegation support                                                     ║
 * ║  - Historical voting power queries                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
contract MockToken {
    
    // ============ STATE VARIABLES ============
    
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    /**
     * @notice Delegation: who each address has delegated their voting power to
     * @dev delegates[A] = B means A's voting power goes to B
     */
    mapping(address => address) public delegates;
    
    /**
     * @notice Voting power: includes delegated power
     */
    mapping(address => uint256) public votingPower;
    
    address public owner;

    // ============ EVENTS ============
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);

    // ============ CONSTRUCTOR ============
    
    /**
     * @notice Deploy the mock token
     * @param _name Token name (e.g., "Guard Dog DAO Token")
     * @param _symbol Token symbol (e.g., "GUARD")
     * @param initialSupply Initial supply to mint to deployer
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
        
        // Mint initial supply to deployer
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    // ============ ERC20 FUNCTIONS ============
    
    /**
     * @notice Transfer tokens to another address
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }
    
    /**
     * @notice Approve spender to transfer tokens
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    /**
     * @notice Transfer tokens from one address to another (with approval)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "Insufficient allowance");
        
        allowance[from][msg.sender] = currentAllowance - amount;
        return _transfer(from, to, amount);
    }
    
    /**
     * @notice Internal transfer logic
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal returns (bool) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        // Update voting power for delegations
        _moveVotingPower(delegates[from], delegates[to], amount);
        
        emit Transfer(from, to, amount);
        return true;
    }

    // ============ DELEGATION FUNCTIONS ============
    
    /**
     * @notice Delegate your voting power to another address
     * @param delegatee Address to receive your voting power
     * 
     * HOW DELEGATION WORKS:
     * - Your tokens stay in your wallet
     * - Your voting power goes to the delegatee
     * - You can change delegation anytime
     * - Delegating to yourself gives you your own voting power
     * 
     * FOR AI GUARD DOG:
     * Users delegate their voting power to themselves (default).
     * The VotingAgent contract then votes using that power.
     */
    function delegate(address delegatee) external {
        _delegate(msg.sender, delegatee);
    }
    
    /**
     * @notice Internal delegation logic
     */
    function _delegate(address delegator, address delegatee) internal {
        address currentDelegate = delegates[delegator];
        uint256 delegatorBalance = balanceOf[delegator];
        
        delegates[delegator] = delegatee;
        
        emit DelegateChanged(delegator, currentDelegate, delegatee);
        
        _moveVotingPower(currentDelegate, delegatee, delegatorBalance);
    }
    
    /**
     * @notice Move voting power between addresses
     */
    function _moveVotingPower(
        address from,
        address to,
        uint256 amount
    ) internal {
        if (from != to && amount > 0) {
            if (from != address(0)) {
                uint256 oldBalance = votingPower[from];
                uint256 newBalance = oldBalance - amount;
                votingPower[from] = newBalance;
                emit DelegateVotesChanged(from, oldBalance, newBalance);
            }
            
            if (to != address(0)) {
                uint256 oldBalance = votingPower[to];
                uint256 newBalance = oldBalance + amount;
                votingPower[to] = newBalance;
                emit DelegateVotesChanged(to, oldBalance, newBalance);
            }
        }
    }
    
    /**
     * @notice Get the current voting power of an account
     * @param account The address to check
     * @return The voting power (own tokens + delegated tokens)
     */
    function getVotes(address account) external view returns (uint256) {
        return votingPower[account];
    }
    
    /**
     * @notice Get voting power at a specific block (simplified)
     * @dev In production, use checkpoints for historical queries
     */
    function getPastVotes(address account, uint256 blockNumber) 
        external view returns (uint256) 
    {
        // Simplified: just return current voting power
        // Production version would use checkpoints
        return votingPower[account];
    }

    // ============ MINT/BURN FUNCTIONS ============
    
    /**
     * @notice Mint new tokens (owner only)
     * @param to Address to receive tokens
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "Only owner can mint");
        _mint(to, amount);
    }
    
    /**
     * @notice Internal mint logic
     */
    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "Mint to zero address");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        // Auto-delegate to self if not delegated
        if (delegates[to] == address(0)) {
            delegates[to] = to;
        }
        
        // Update voting power
        _moveVotingPower(address(0), delegates[to], amount);
        
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @notice Burn tokens
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        // Update voting power
        _moveVotingPower(delegates[msg.sender], address(0), amount);
        
        emit Transfer(msg.sender, address(0), amount);
    }

    // ============ HELPER FUNCTIONS (FOR TESTING) ============
    
    /**
     * @notice Batch mint to multiple addresses (for demo setup)
     * @param recipients Array of addresses to mint to
     * @param amounts Array of amounts to mint
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        require(msg.sender == owner, "Only owner can mint");
        require(recipients.length == amounts.length, "Length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
    
    /**
     * @notice Faucet function for testing - anyone can get tokens
     * @param amount Amount to receive (max 1000 tokens per call)
     */
    function faucet(uint256 amount) external {
        require(amount <= 1000 * 10**decimals, "Max 1000 tokens per faucet");
        _mint(msg.sender, amount);
    }
}
