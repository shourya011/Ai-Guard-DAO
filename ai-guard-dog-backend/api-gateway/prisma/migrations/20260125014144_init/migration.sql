-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'REVIEWER', 'PROPOSER', 'AI_AGENT');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING_ANALYSIS', 'PROCESSING', 'NEEDS_REVIEW', 'AUTO_APPROVED', 'AUTO_REJECTED', 'MANUALLY_APPROVED', 'MANUALLY_REJECTED', 'EXECUTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');

-- CreateEnum
CREATE TYPE "DelegationStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('SESSION_CREATED', 'SESSION_EXPIRED', 'DELEGATION_CREATED', 'DELEGATION_REVOKED', 'ANALYSIS_STARTED', 'ANALYSIS_COMPLETED', 'VOTE_CAST_AUTO', 'VOTE_CAST_MANUAL', 'HIGH_RISK_FLAGGED', 'PROPOSAL_APPROVED', 'PROPOSAL_REJECTED', 'ADMIN_ACTION');

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "sessionToken" VARCHAR(512) NOT NULL,
    "nonce" VARCHAR(64) NOT NULL,
    "chainId" INTEGER NOT NULL,
    "userAgent" VARCHAR(512),
    "ipHash" VARCHAR(64),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "ensName" VARCHAR(255),
    "role" "UserRole" NOT NULL DEFAULT 'PROPOSER',
    "displayName" VARCHAR(100),
    "reputationScore" INTEGER NOT NULL DEFAULT 50,
    "tokenBalance" DECIMAL(38,18),
    "metadata" JSONB,
    "defaultRiskThreshold" INTEGER NOT NULL DEFAULT 50,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegations" (
    "id" UUID NOT NULL,
    "delegatorAddress" VARCHAR(42) NOT NULL,
    "walletId" UUID,
    "daoGovernor" VARCHAR(42) NOT NULL,
    "daoName" VARCHAR(255),
    "chainId" INTEGER NOT NULL,
    "riskThreshold" INTEGER NOT NULL DEFAULT 50,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "status" "DelegationStatus" NOT NULL DEFAULT 'ACTIVE',
    "txHash" VARCHAR(66) NOT NULL,
    "blockNumber" BIGINT,
    "delegatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokeTxHash" VARCHAR(66),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" UUID NOT NULL,
    "onchainProposalId" VARCHAR(100) NOT NULL,
    "daoGovernor" VARCHAR(42) NOT NULL,
    "daoName" VARCHAR(255),
    "chainId" INTEGER NOT NULL,
    "ipfsHash" VARCHAR(64),
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "proposerAddress" VARCHAR(42) NOT NULL,
    "proposerId" UUID,
    "requestedAmount" DECIMAL(38,18),
    "tokenSymbol" VARCHAR(20),
    "recipientAddress" VARCHAR(42),
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING_ANALYSIS',
    "compositeRiskScore" DOUBLE PRECISION,
    "riskLevel" "RiskLevel",
    "votingStartBlock" BIGINT,
    "votingEndBlock" BIGINT,
    "votingDeadline" TIMESTAMP(3),
    "snapshotBlock" BIGINT,
    "forVotes" DECIMAL(38,18),
    "againstVotes" DECIMAL(38,18),
    "abstainVotes" DECIMAL(38,18),
    "targets" JSONB,
    "values" JSONB,
    "calldatas" JSONB,
    "detectedAtBlock" BIGINT,
    "creationTxHash" VARCHAR(66),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "analyzedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" UUID NOT NULL,
    "jobId" VARCHAR(100) NOT NULL,
    "proposalId" UUID NOT NULL,
    "requestedById" UUID,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "compositeRiskScore" DOUBLE PRECISION,
    "riskLevel" "RiskLevel",
    "recommendation" VARCHAR(20),
    "snapshot" JSONB,
    "reportHash" VARCHAR(66),
    "ipfsReportCid" VARCHAR(64),
    "webhookUrl" VARCHAR(512),
    "webhookDelivered" BOOLEAN NOT NULL DEFAULT false,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "processingTimeMs" INTEGER,
    "errorCode" VARCHAR(50),
    "errorMessage" TEXT,
    "modelVersion" VARCHAR(50),
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "cacheKey" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_results" (
    "id" UUID NOT NULL,
    "analysisId" UUID NOT NULL,
    "agentName" VARCHAR(50) NOT NULL,
    "score" INTEGER NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "flags" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB,
    "processingTimeMs" INTEGER,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "red_flags" (
    "id" UUID NOT NULL,
    "analysisId" UUID NOT NULL,
    "agentName" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "severity" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "recommendation" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "red_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "walletId" UUID,
    "proposalId" UUID,
    "daoGovernor" VARCHAR(42),
    "voteType" "VoteType",
    "riskScore" INTEGER,
    "wasAutoVote" BOOLEAN,
    "txHash" VARCHAR(66),
    "reportHash" VARCHAR(66),
    "ipHash" VARCHAR(64),
    "userAgent" VARCHAR(512),
    "metadata" JSONB,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_queue" (
    "id" UUID NOT NULL,
    "proposalId" UUID NOT NULL,
    "assignedTo" UUID,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "reason" VARCHAR(255) NOT NULL,
    "riskScore" INTEGER,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "decision" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache_entries" (
    "id" UUID NOT NULL,
    "cacheKey" VARCHAR(64) NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cache_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_walletId_idx" ON "sessions"("walletId");

-- CreateIndex
CREATE INDEX "sessions_sessionToken_idx" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sessions_isActive_expiresAt_idx" ON "sessions"("isActive", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_address_key" ON "wallets"("address");

-- CreateIndex
CREATE INDEX "wallets_address_idx" ON "wallets"("address");

-- CreateIndex
CREATE INDEX "wallets_reputationScore_idx" ON "wallets"("reputationScore");

-- CreateIndex
CREATE INDEX "wallets_role_idx" ON "wallets"("role");

-- CreateIndex
CREATE INDEX "delegations_delegatorAddress_idx" ON "delegations"("delegatorAddress");

-- CreateIndex
CREATE INDEX "delegations_daoGovernor_idx" ON "delegations"("daoGovernor");

-- CreateIndex
CREATE INDEX "delegations_status_idx" ON "delegations"("status");

-- CreateIndex
CREATE INDEX "delegations_chainId_status_idx" ON "delegations"("chainId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "delegations_delegatorAddress_daoGovernor_chainId_key" ON "delegations"("delegatorAddress", "daoGovernor", "chainId");

-- CreateIndex
CREATE INDEX "proposals_onchainProposalId_idx" ON "proposals"("onchainProposalId");

-- CreateIndex
CREATE INDEX "proposals_daoGovernor_idx" ON "proposals"("daoGovernor");

-- CreateIndex
CREATE INDEX "proposals_proposerAddress_idx" ON "proposals"("proposerAddress");

-- CreateIndex
CREATE INDEX "proposals_status_idx" ON "proposals"("status");

-- CreateIndex
CREATE INDEX "proposals_compositeRiskScore_idx" ON "proposals"("compositeRiskScore");

-- CreateIndex
CREATE INDEX "proposals_votingDeadline_idx" ON "proposals"("votingDeadline");

-- CreateIndex
CREATE INDEX "proposals_createdAt_idx" ON "proposals"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_onchainProposalId_daoGovernor_chainId_key" ON "proposals"("onchainProposalId", "daoGovernor", "chainId");

-- CreateIndex
CREATE UNIQUE INDEX "analyses_jobId_key" ON "analyses"("jobId");

-- CreateIndex
CREATE INDEX "analyses_jobId_idx" ON "analyses"("jobId");

-- CreateIndex
CREATE INDEX "analyses_proposalId_idx" ON "analyses"("proposalId");

-- CreateIndex
CREATE INDEX "analyses_status_idx" ON "analyses"("status");

-- CreateIndex
CREATE INDEX "analyses_requestedById_idx" ON "analyses"("requestedById");

-- CreateIndex
CREATE INDEX "analyses_queuedAt_idx" ON "analyses"("queuedAt");

-- CreateIndex
CREATE INDEX "analyses_compositeRiskScore_idx" ON "analyses"("compositeRiskScore");

-- CreateIndex
CREATE INDEX "agent_results_analysisId_idx" ON "agent_results"("analysisId");

-- CreateIndex
CREATE INDEX "agent_results_agentName_idx" ON "agent_results"("agentName");

-- CreateIndex
CREATE INDEX "agent_results_score_idx" ON "agent_results"("score");

-- CreateIndex
CREATE UNIQUE INDEX "agent_results_analysisId_agentName_key" ON "agent_results"("analysisId", "agentName");

-- CreateIndex
CREATE INDEX "red_flags_analysisId_idx" ON "red_flags"("analysisId");

-- CreateIndex
CREATE INDEX "red_flags_category_idx" ON "red_flags"("category");

-- CreateIndex
CREATE INDEX "red_flags_severity_idx" ON "red_flags"("severity");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_walletId_idx" ON "audit_logs"("walletId");

-- CreateIndex
CREATE INDEX "audit_logs_proposalId_idx" ON "audit_logs"("proposalId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_txHash_idx" ON "audit_logs"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "review_queue_proposalId_key" ON "review_queue"("proposalId");

-- CreateIndex
CREATE INDEX "review_queue_assignedTo_idx" ON "review_queue"("assignedTo");

-- CreateIndex
CREATE INDEX "review_queue_priority_idx" ON "review_queue"("priority");

-- CreateIndex
CREATE INDEX "review_queue_reviewedAt_idx" ON "review_queue"("reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cache_entries_cacheKey_key" ON "cache_entries"("cacheKey");

-- CreateIndex
CREATE INDEX "cache_entries_cacheKey_idx" ON "cache_entries"("cacheKey");

-- CreateIndex
CREATE INDEX "cache_entries_expiresAt_idx" ON "cache_entries"("expiresAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_results" ADD CONSTRAINT "agent_results_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "red_flags" ADD CONSTRAINT "red_flags_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
