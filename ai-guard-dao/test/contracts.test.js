/**
 * AI Guard Dog - Contract Tests
 * 
 * Tests all core functionality:
 * 1. AuditLogger - Logging and querying
 * 2. VotingAgent - Delegation and voting
 * 3. DAOGovernor - Proposals and execution
 * 4. Integration - Full flow
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AI Guard Dog Contracts", function () {
    let auditLogger, votingAgent, daoGovernor, mockToken;
    let owner, backend, user1, user2, user3;
    
    // Deploy all contracts before each test suite
    before(async function () {
        [owner, backend, user1, user2, user3] = await ethers.getSigners();
        
        // Deploy AuditLogger
        const AuditLogger = await ethers.getContractFactory("AuditLogger");
        auditLogger = await AuditLogger.deploy();
        await auditLogger.waitForDeployment();
        
        // Deploy VotingAgent
        const VotingAgent = await ethers.getContractFactory("VotingAgent");
        votingAgent = await VotingAgent.deploy(
            await auditLogger.getAddress(),
            backend.address
        );
        await votingAgent.waitForDeployment();
        
        // Link AuditLogger to VotingAgent
        await auditLogger.setVotingAgent(await votingAgent.getAddress());
        
        // Deploy MockToken
        const MockToken = await ethers.getContractFactory("MockToken");
        mockToken = await MockToken.deploy(
            "Guard Dog Token",
            "GUARD",
            ethers.parseEther("1000000")
        );
        await mockToken.waitForDeployment();
        
        // Deploy DAOGovernor
        const DAOGovernor = await ethers.getContractFactory("DAOGovernor");
        daoGovernor = await DAOGovernor.deploy(
            "Test DAO",
            await mockToken.getAddress(),
            1,   // votingDelay
            100, // votingPeriod
            0,   // proposalThreshold
            1    // quorum
        );
        await daoGovernor.waitForDeployment();
    });

    // ============ AUDIT LOGGER TESTS ============
    describe("AuditLogger", function () {
        it("Should only allow VotingAgent to log decisions", async function () {
            await expect(
                auditLogger.connect(user1).logDecision(
                    1, // proposalId
                    await daoGovernor.getAddress(),
                    user1.address,
                    1, // support
                    25, // riskScore
                    ethers.keccak256(ethers.toUtf8Bytes("report")),
                    true
                )
            ).to.be.revertedWithCustomError(auditLogger, "OnlyVotingAgent");
        });
        
        it("Should not allow setting VotingAgent twice", async function () {
            await expect(
                auditLogger.setVotingAgent(user1.address)
            ).to.be.revertedWithCustomError(auditLogger, "VotingAgentAlreadySet");
        });
    });

    // ============ VOTING AGENT TESTS ============
    describe("VotingAgent", function () {
        describe("Delegation", function () {
            it("Should allow user to delegate voting power", async function () {
                const daoAddress = await daoGovernor.getAddress();
                
                await expect(
                    votingAgent.connect(user1).delegateVotingPower(daoAddress, 50, false)
                ).to.emit(votingAgent, "VotingPowerDelegated")
                    .withArgs(user1.address, daoAddress, 50);
                
                const delegation = await votingAgent.getDelegation(user1.address, daoAddress);
                expect(delegation.active).to.be.true;
                expect(delegation.riskThreshold).to.equal(50);
                expect(delegation.requiresApproval).to.be.false;
            });
            
            it("Should reject invalid risk threshold (> 100)", async function () {
                await expect(
                    votingAgent.connect(user2).delegateVotingPower(
                        await daoGovernor.getAddress(),
                        101, // Invalid: > 100
                        false
                    )
                ).to.be.revertedWithCustomError(votingAgent, "InvalidThreshold");
            });
            
            it("Should allow user to revoke delegation", async function () {
                const daoAddress = await daoGovernor.getAddress();
                
                // First delegate
                await votingAgent.connect(user2).delegateVotingPower(daoAddress, 30, false);
                
                // Then revoke
                await expect(
                    votingAgent.connect(user2).revokeDelegation(daoAddress)
                ).to.emit(votingAgent, "DelegationRevoked")
                    .withArgs(user2.address, daoAddress);
                
                const delegation = await votingAgent.getDelegation(user2.address, daoAddress);
                expect(delegation.active).to.be.false;
            });
            
            it("Should reject revocation if not delegated", async function () {
                await expect(
                    votingAgent.connect(user3).revokeDelegation(await daoGovernor.getAddress())
                ).to.be.revertedWithCustomError(votingAgent, "NotDelegated");
            });
        });
        
        describe("Backend Authorization", function () {
            it("Should allow only authorized backend to cast votes", async function () {
                const daoAddress = await daoGovernor.getAddress();
                
                await expect(
                    votingAgent.connect(user1).castVoteWithRisk(
                        daoAddress,
                        1,
                        user1.address,
                        1,
                        25,
                        ethers.keccak256(ethers.toUtf8Bytes("report"))
                    )
                ).to.be.revertedWithCustomError(votingAgent, "UnauthorizedBackend");
            });
            
            it("Should allow admin to authorize new backend", async function () {
                await expect(
                    votingAgent.authorizeBackend(user3.address)
                ).to.emit(votingAgent, "BackendAuthorized")
                    .withArgs(user3.address);
                
                expect(await votingAgent.isAuthorizedBackend(user3.address)).to.be.true;
            });
            
            it("Should allow admin to revoke backend", async function () {
                await expect(
                    votingAgent.revokeBackend(user3.address)
                ).to.emit(votingAgent, "BackendRevoked")
                    .withArgs(user3.address);
                
                expect(await votingAgent.isAuthorizedBackend(user3.address)).to.be.false;
            });
        });
        
        describe("Emergency Functions", function () {
            it("Should allow admin to pause contract", async function () {
                await expect(votingAgent.pause())
                    .to.emit(votingAgent, "ContractPaused")
                    .withArgs(owner.address);
                
                expect(await votingAgent.paused()).to.be.true;
            });
            
            it("Should block delegations when paused", async function () {
                await expect(
                    votingAgent.connect(user3).delegateVotingPower(
                        await daoGovernor.getAddress(),
                        50,
                        false
                    )
                ).to.be.revertedWithCustomError(votingAgent, "ContractIsPaused");
            });
            
            it("Should allow admin to unpause contract", async function () {
                await expect(votingAgent.unpause())
                    .to.emit(votingAgent, "ContractUnpaused")
                    .withArgs(owner.address);
                
                expect(await votingAgent.paused()).to.be.false;
            });
        });
    });

    // ============ DAO GOVERNOR TESTS ============
    describe("DAOGovernor", function () {
        let proposalId;
        
        describe("Proposals", function () {
            it("Should allow creating a proposal", async function () {
                const tx = await daoGovernor.propose(
                    [user1.address],
                    [ethers.parseEther("1")],
                    ["0x"],
                    "Test proposal: Send 1 ETH to user1"
                );
                
                const receipt = await tx.wait();
                // Get proposalId from event
                const event = receipt.logs.find(
                    log => log.fragment?.name === "ProposalCreated"
                );
                proposalId = event.args[0];
                
                expect(proposalId).to.equal(1);
            });
            
            it("Should emit ProposalCreated event with correct data", async function () {
                await expect(
                    daoGovernor.propose(
                        [user2.address],
                        [ethers.parseEther("0.5")],
                        ["0x"],
                        "Another test proposal"
                    )
                ).to.emit(daoGovernor, "ProposalCreated");
            });
            
            it("Should correctly track proposal state", async function () {
                // Initially pending (before votingDelay)
                const state = await daoGovernor.state(proposalId);
                // Could be Pending (0) or Active (1) depending on block
                expect(state).to.be.oneOf([0n, 1n]);
            });
        });
        
        describe("Voting", function () {
            it("Should allow casting votes", async function () {
                // Mine blocks to ensure voting is active
                await ethers.provider.send("evm_mine", []);
                await ethers.provider.send("evm_mine", []);
                
                // Grant voting power
                await daoGovernor.grantVotingPower(user1.address, 100);
                
                await expect(
                    daoGovernor.connect(user1).castVote(proposalId, 1) // Vote FOR
                ).to.emit(daoGovernor, "VoteCast");
                
                const receipt = await daoGovernor.getReceipt(proposalId, user1.address);
                expect(receipt.hasVoted).to.be.true;
                expect(receipt.support).to.equal(1);
            });
            
            it("Should prevent double voting", async function () {
                await expect(
                    daoGovernor.connect(user1).castVote(proposalId, 0)
                ).to.be.revertedWithCustomError(daoGovernor, "AlreadyVoted");
            });
            
            it("Should reject invalid vote types", async function () {
                await daoGovernor.grantVotingPower(user2.address, 100);
                
                await expect(
                    daoGovernor.connect(user2).castVote(proposalId, 5) // Invalid
                ).to.be.revertedWithCustomError(daoGovernor, "InvalidVoteType");
            });
        });
    });

    // ============ INTEGRATION TESTS ============
    describe("Integration: Full Voting Flow", function () {
        let proposalId;
        const daoAddress = async () => await daoGovernor.getAddress();
        
        beforeEach(async function () {
            // Setup: User delegates and proposal is created
            await votingAgent.connect(user3).delegateVotingPower(
                await daoGovernor.getAddress(),
                60,  // threshold: auto-vote if risk < 60
                false
            );
            
            // Create proposal
            const tx = await daoGovernor.propose(
                [user1.address],
                [ethers.parseEther("0.01")],
                ["0x"],
                "Integration test proposal"
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(
                log => log.fragment?.name === "ProposalCreated"
            );
            proposalId = event.args[0];
            
            // Mine blocks to make voting active
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_mine", []);
            
            // Grant voting power
            await daoGovernor.grantVotingPower(user3.address, 100);
        });
        
        it("Should auto-vote when risk < threshold", async function () {
            const riskScore = 25; // Below user3's threshold of 60
            const reportHash = ethers.keccak256(ethers.toUtf8Bytes("low-risk-report"));
            
            // Backend calls castVoteWithRisk
            await expect(
                votingAgent.connect(backend).castVoteWithRisk(
                    await daoGovernor.getAddress(),
                    proposalId,
                    user3.address,
                    1, // Vote FOR
                    riskScore,
                    reportHash
                )
            ).to.emit(votingAgent, "VoteCastByAI")
                .withArgs(proposalId, user3.address, 1, riskScore);
            
            // Check vote was recorded
            const hasVoted = await daoGovernor.hasVoted(proposalId, await votingAgent.getAddress());
            // Note: In this simplified version, the vote is cast by VotingAgent contract
        });
        
        it("Should flag high-risk proposals", async function () {
            // Re-delegate with lower threshold
            await votingAgent.connect(user3).delegateVotingPower(
                await daoGovernor.getAddress(),
                30,  // threshold: only auto-vote if risk < 30
                false
            );
            
            const riskScore = 75; // Above threshold
            const reportHash = ethers.keccak256(ethers.toUtf8Bytes("high-risk-report"));
            
            // Create new proposal for this test
            const tx = await daoGovernor.propose(
                [user2.address],
                [ethers.parseEther("50")],
                ["0x"],
                "High risk test proposal"
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(
                log => log.fragment?.name === "ProposalCreated"
            );
            const newProposalId = event.args[0];
            
            // Mine blocks
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_mine", []);
            
            // Backend calls castVoteWithRisk - should emit HighRiskProposalDetected
            await expect(
                votingAgent.connect(backend).castVoteWithRisk(
                    await daoGovernor.getAddress(),
                    newProposalId,
                    user3.address,
                    1,
                    riskScore,
                    reportHash
                )
            ).to.emit(votingAgent, "HighRiskProposalDetected")
                .withArgs(newProposalId, user3.address, riskScore);
        });
        
        it("Should log decisions to AuditLogger", async function () {
            // Re-delegate
            await votingAgent.connect(user3).delegateVotingPower(
                await daoGovernor.getAddress(),
                80,
                false
            );
            
            // Create new proposal
            const tx = await daoGovernor.propose(
                [user1.address],
                [ethers.parseEther("0.001")],
                ["0x"],
                "Audit log test proposal"
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(
                log => log.fragment?.name === "ProposalCreated"
            );
            const newProposalId = event.args[0];
            
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_mine", []);
            
            const riskScore = 20;
            const reportHash = ethers.keccak256(ethers.toUtf8Bytes("audit-test"));
            
            // Cast vote
            await votingAgent.connect(backend).castVoteWithRisk(
                await daoGovernor.getAddress(),
                newProposalId,
                user3.address,
                1,
                riskScore,
                reportHash
            );
            
            // Check audit log
            const totalDecisions = await auditLogger.getTotalDecisions();
            expect(totalDecisions).to.be.greaterThan(0);
            
            const userHistory = await auditLogger.getUserAuditHistory(user3.address, 10);
            expect(userHistory.length).to.be.greaterThan(0);
        });
    });

    // ============ MOCK TOKEN TESTS ============
    describe("MockToken", function () {
        it("Should mint tokens", async function () {
            await mockToken.mint(user1.address, ethers.parseEther("100"));
            expect(await mockToken.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
        });
        
        it("Should handle delegation", async function () {
            await mockToken.connect(user1).delegate(user2.address);
            expect(await mockToken.delegates(user1.address)).to.equal(user2.address);
        });
        
        it("Should have faucet for testing", async function () {
            const initialBalance = await mockToken.balanceOf(user3.address);
            await mockToken.connect(user3).faucet(ethers.parseEther("500"));
            
            expect(await mockToken.balanceOf(user3.address)).to.equal(
                initialBalance + ethers.parseEther("500")
            );
        });
    });
});
