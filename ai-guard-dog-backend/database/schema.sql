-- AI Guard Dog Intern - Database Schema
-- PostgreSQL Schema with UUID primary keys

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

-- User roles enum
CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'REVIEWER',
    'PROPOSER',
    'AI_AGENT'
);

-- Proposal status enum
CREATE TYPE proposal_status AS ENUM (
    'PENDING_ANALYSIS',
    'NEEDS_REVIEW',
    'AUTO_APPROVED',
    'AUTO_REJECTED',
    'MANUALLY_APPROVED',
    'MANUALLY_REJECTED',
    'EXECUTED'
);

-- ============================================
-- TABLES
-- ============================================

-- Users Table
-- Stores all participants including human reviewers and AI agents
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'PROPOSER',
    display_name VARCHAR(100),
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for wallet lookups
CREATE INDEX idx_users_wallet ON users(wallet_address);

-- Proposals Table
-- Stores all proposals received from the blockchain
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    onchain_proposal_id INTEGER NOT NULL,
    ipfs_hash VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    proposer_wallet VARCHAR(42) NOT NULL,
    requested_amount DECIMAL(38, 18),
    recipient_wallet VARCHAR(42),
    status proposal_status NOT NULL DEFAULT 'PENDING_ANALYSIS',
    composite_risk_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    analyzed_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for common queries
CREATE INDEX idx_proposals_onchain_id ON proposals(onchain_proposal_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_proposer ON proposals(proposer_wallet);

-- Reasoning Reports Table
-- Stores AI agent analysis results and the "Proposal Snapshot" summary
CREATE TABLE reasoning_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    
    -- Individual Agent Scores (0-100)
    agent_1_score FLOAT,  -- Reputation Sentinel
    agent_2_score FLOAT,  -- NLP Analyst
    agent_3_score FLOAT,  -- Mediator Classifier
    
    -- Final Composite Score (0-100)
    composite_risk_score FLOAT NOT NULL,
    
    -- Agent reasoning details
    agent_1_reasoning TEXT,
    agent_2_reasoning TEXT,
    agent_3_reasoning TEXT,
    
    -- Red flags detected
    red_flags JSONB DEFAULT '[]',
    
    -- The "Proposal Snapshot" - Structured summary for human reviewers
    -- Schema: {
    --   executive_summary: string,
    --   deliverables: string[],
    --   timeline: string,
    --   budget_breakdown: object,
    --   risk_profile: { agent_alerts: string[] }
    -- }
    snapshot_json JSONB,
    
    -- Hash stored on-chain for audit trail
    onchain_hash VARCHAR(66),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for proposal lookups
CREATE INDEX idx_reasoning_reports_proposal ON reasoning_reports(proposal_id);
CREATE INDEX idx_reasoning_reports_score ON reasoning_reports(composite_risk_score);

-- ============================================
-- AUDIT & HISTORY TABLES
-- ============================================

-- Vote Records Table
-- Tracks all votes (AI and human)
CREATE TABLE vote_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_wallet VARCHAR(42) NOT NULL,
    vote_type VARCHAR(20) NOT NULL, -- 'FOR', 'AGAINST', 'ABSTAIN'
    is_ai_vote BOOLEAN DEFAULT FALSE,
    voting_power DECIMAL(38, 18),
    onchain_tx_hash VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vote_records_proposal ON vote_records(proposal_id);

-- Human Review Queue
-- Tracks proposals requiring human attention
CREATE TABLE review_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    assigned_reviewer UUID REFERENCES users(id),
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_queue_pending ON review_queue(reviewed_at) WHERE reviewed_at IS NULL;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to proposals table
CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Development Only)
-- ============================================

-- Insert AI Agent user
INSERT INTO users (wallet_address, role, display_name) VALUES
    ('0x0000000000000000000000000000000000000001', 'AI_AGENT', 'AI Guard Dog Agent');

-- Sample admin user
INSERT INTO users (wallet_address, role, display_name) VALUES
    ('0x0000000000000000000000000000000000000000', 'ADMIN', 'System Admin');
