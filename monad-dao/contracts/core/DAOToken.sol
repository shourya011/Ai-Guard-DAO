// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DAOToken
 * @author Monad DAO Team
 * @notice Governance token with voting power and delegation support
 * @dev ERC20 token with checkpoints for historical voting power queries
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                           DAO TOKEN                                        ║
 * ║                                                                            ║
 * ║  PURPOSE:                                                                  ║
 * ║  - Represents voting power in the DAO                                     ║
 * ║  - Supports delegation (transfer voting power without moving tokens)      ║
 * ║  - Checkpoints allow querying historical voting power                     ║
 * ║                                                                            ║
 * ║  MACHINE DATA:                                                             ║
 * ║  - balanceOf[address] → Token balance                                     ║
 * ║  - votingPower[address] → Current voting power                            ║
 * ║  - checkpoints[address][index] → Historical voting power                  ║
 * ║  - totalSupply → Total tokens in circulation                              ║
 * ║                                                                            ║
 * ║  HUMAN DATA:                                                               ║
 * ║  - name → "Monad DAO Token"                                               ║
 * ║  - symbol → "MDAO"                                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
contract DAOToken {
    
    // ============ TOKEN METADATA (Human Data) ============
    
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    
    // ============ TOKEN STATE (Machine Data) ============
    
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============ VOTING POWER STATE ============
    
    /// @notice Who each account has delegated to
    mapping(address => address) public delegates;
    
    /// @notice Current voting power (own tokens + delegated tokens)
    mapping(address => uint256) public votingPower;
    
    /// @notice Checkpoint for historical voting power
    struct Checkpoint {
        uint256 fromBlock;
        uint256 votes;
    }
    
    /// @notice Checkpoints for each account
    mapping(address => Checkpoint[]) public checkpoints;
    
    /// @notice Number of checkpoints for each account
    mapping(address => uint256) public numCheckpoints;
    
    // ============ ACCESS CONTROL ============
    
    address public owner;
    address public daoCore;
    mapping(address => bool) public minters;
    
    bool public transfersPaused;
    
    // ============ EVENTS ============
    
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    // ============ ERRORS ============
    
    error Unauthorized();
    error InsufficientBalance();
    error InsufficientAllowance();
    error TransfersPaused();
    error ZeroAddress();
    error InvalidAmount();

    // ============ MODIFIERS ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier onlyMinter() {
        if (!minters[msg.sender] && msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier whenNotPaused() {
        if (transfersPaused) revert TransfersPaused();
        _;
    }

    // ============ CONSTRUCTOR ============
    
    /**
     * @notice Deploy the DAO governance token
     * @param _name Token name (human data)
     * @param _symbol Token symbol (human data)
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
        minters[msg.sender] = true;
        
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    // ============ ERC20 FUNCTIONS ============
    
    /**
     * @notice Transfer tokens
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(address to, uint256 amount) 
        external 
        whenNotPaused 
        returns (bool) 
    {
        _transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @notice Approve spender
     * @param spender Address to approve
     * @param amount Amount to approve
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    /**
     * @notice Transfer from (with approval)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external whenNotPaused returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance < amount) revert InsufficientAllowance();
        
        allowance[from][msg.sender] = currentAllowance - amount;
        _transfer(from, to, amount);
        return true;
    }
    
    /**
     * @notice Internal transfer logic
     */
    function _transfer(address from, address to, uint256 amount) internal {
        if (from == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();
        if (balanceOf[from] < amount) revert InsufficientBalance();
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        // Move voting power from old delegate to new delegate
        _moveVotingPower(delegates[from], delegates[to], amount);
        
        emit Transfer(from, to, amount);
    }

    // ============ DELEGATION FUNCTIONS ============
    
    /**
     * @notice Delegate voting power to another address
     * @param delegatee Address to delegate to (or self)
     * 
     * HOW IT WORKS:
     * - Your tokens stay in your wallet
     * - Your voting power goes to delegatee
     * - Default: delegate to yourself
     * - Can change delegation anytime
     */
    function delegate(address delegatee) external {
        if (delegatee == address(0)) revert ZeroAddress();
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
        if (from == to || amount == 0) return;
        
        if (from != address(0)) {
            uint256 oldVotes = votingPower[from];
            uint256 newVotes = oldVotes - amount;
            votingPower[from] = newVotes;
            _writeCheckpoint(from, oldVotes, newVotes);
            emit DelegateVotesChanged(from, oldVotes, newVotes);
        }
        
        if (to != address(0)) {
            uint256 oldVotes = votingPower[to];
            uint256 newVotes = oldVotes + amount;
            votingPower[to] = newVotes;
            _writeCheckpoint(to, oldVotes, newVotes);
            emit DelegateVotesChanged(to, oldVotes, newVotes);
        }
    }

    // ============ CHECKPOINT FUNCTIONS ============
    
    /**
     * @notice Write a new checkpoint
     * @dev Stores historical voting power for governance queries
     */
    function _writeCheckpoint(
        address account,
        uint256 oldVotes,
        uint256 newVotes
    ) internal {
        uint256 nCheckpoints = numCheckpoints[account];
        
        if (nCheckpoints > 0 && checkpoints[account][nCheckpoints - 1].fromBlock == block.number) {
            // Update existing checkpoint for this block
            checkpoints[account][nCheckpoints - 1].votes = newVotes;
        } else {
            // Create new checkpoint
            checkpoints[account].push(Checkpoint({
                fromBlock: block.number,
                votes: newVotes
            }));
            numCheckpoints[account] = nCheckpoints + 1;
        }
    }
    
    /**
     * @notice Get voting power at a specific block
     * @param account Address to check
     * @param blockNumber Block to query
     * @return Voting power at that block
     * 
     * USED BY: VotingEngine to determine voting weight at proposal creation
     */
    function getPastVotes(address account, uint256 blockNumber) 
        external view returns (uint256) 
    {
        require(blockNumber < block.number, "Block not yet mined");
        
        uint256 nCheckpoints = numCheckpoints[account];
        if (nCheckpoints == 0) return 0;
        
        // Most recent checkpoint
        if (checkpoints[account][nCheckpoints - 1].fromBlock <= blockNumber) {
            return checkpoints[account][nCheckpoints - 1].votes;
        }
        
        // First checkpoint
        if (checkpoints[account][0].fromBlock > blockNumber) {
            return 0;
        }
        
        // Binary search
        uint256 lower = 0;
        uint256 upper = nCheckpoints - 1;
        while (upper > lower) {
            uint256 center = upper - (upper - lower) / 2;
            Checkpoint memory cp = checkpoints[account][center];
            if (cp.fromBlock == blockNumber) {
                return cp.votes;
            } else if (cp.fromBlock < blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }
        return checkpoints[account][lower].votes;
    }
    
    /**
     * @notice Get current voting power
     */
    function getVotes(address account) external view returns (uint256) {
        return votingPower[account];
    }

    // ============ MINT/BURN FUNCTIONS ============
    
    /**
     * @notice Mint new tokens
     * @param to Recipient
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
    
    /**
     * @notice Internal mint logic
     */
    function _mint(address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        // Auto-delegate to self if not delegated
        if (delegates[to] == address(0)) {
            delegates[to] = to;
        }
        
        _moveVotingPower(address(0), delegates[to], amount);
        
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @notice Burn tokens
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        _moveVotingPower(delegates[msg.sender], address(0), amount);
        
        emit Transfer(msg.sender, address(0), amount);
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Set the DAO Core contract
     */
    function setDAOCore(address _daoCore) external onlyOwner {
        if (_daoCore == address(0)) revert ZeroAddress();
        daoCore = _daoCore;
    }
    
    /**
     * @notice Add a minter
     */
    function addMinter(address minter) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        minters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /**
     * @notice Remove a minter
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /**
     * @notice Pause/unpause transfers
     */
    function setTransfersPaused(bool paused) external onlyOwner {
        transfersPaused = paused;
    }
    
    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }

    // ============ BATCH OPERATIONS (for setup) ============
    
    /**
     * @notice Batch mint to multiple addresses
     * @param recipients Array of recipients
     * @param amounts Array of amounts
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyMinter {
        require(recipients.length == amounts.length, "Length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
}
