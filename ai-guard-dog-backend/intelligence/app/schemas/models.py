"""
Pydantic Schemas for AI Guard Dog Intelligence API

These models define the request/response structure for the FastAPI endpoints.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════

class RiskCategory(str, Enum):
    """Risk category enumeration for verdicts"""
    LOW = "low"           # 0-19: AUTO_APPROVE
    MEDIUM = "medium"     # 20-79: NEEDS_REVIEW
    HIGH = "high"         # 80-100: AUTO_REJECT


# ═══════════════════════════════════════════════════════════════
# REQUEST MODELS
# ═══════════════════════════════════════════════════════════════

class AnalyzeRequest(BaseModel):
    """
    Request model for the /analyze endpoint (Stateful)
    
    This is used when a real proposal needs to be analyzed.
    Results will be stored in the database.
    """
    proposal_id: str = Field(..., description="UUID of the proposal in the database")
    proposal_text: str = Field(..., description="Full proposal text (title + description)")
    wallet_address: str = Field(..., description="Proposer's wallet address (0x...)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "proposal_id": "123e4567-e89b-12d3-a456-426614174000",
                    "proposal_text": "Q1 Marketing Budget\n\nThis proposal requests 10,000 MON...",
                    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b123"
                }
            ]
        }
    }


class SimulateRequest(BaseModel):
    """
    Request model for the /simulate endpoint (Stateless)
    
    This is a PURE FUNCTION - it does NOT write to the database.
    Used for the pre-submission tool to help proposers improve their proposals.
    """
    draft_text: str = Field(..., description="Draft proposal text to analyze")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "draft_text": "I want to request funding for a new marketing campaign..."
                }
            ]
        }
    }


# ═══════════════════════════════════════════════════════════════
# RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════

class RiskProfile(BaseModel):
    """Risk profile with agent alerts"""
    agent_alerts: list[str] = Field(default_factory=list)


class ProposalSnapshot(BaseModel):
    """
    The "Google Drive" sidebar summary - structured synopsis for human reviewers
    """
    executive_summary: str = Field(..., description="2-3 sentence summary")
    deliverables: list[str] = Field(default_factory=list, description="Specific outputs")
    timeline: str = Field(..., description="Duration and milestones")
    budget_breakdown: dict = Field(default_factory=dict, description="Budget allocation")
    risk_profile: RiskProfile = Field(default_factory=RiskProfile)


class AnalyzeResponse(BaseModel):
    """
    Response model for the /analyze endpoint
    
    Contains all three agent scores, the composite risk score,
    and the structured "Proposal Snapshot" for human review.
    """
    proposal_id: str
    
    # Individual Agent Scores (0-100, where higher = more risky)
    agent_1_score: float = Field(..., ge=0, le=100, description="Reputation Sentinel score")
    agent_2_score: float = Field(..., ge=0, le=100, description="NLP Analyst score")
    agent_3_score: float = Field(..., ge=0, le=100, description="Mediator score")
    
    # Final composite score
    composite_risk_score: float = Field(..., ge=0, le=100, description="Final risk score")
    
    # Agent reasoning explanations
    agent_1_reasoning: str = Field(..., description="Reputation analysis explanation")
    agent_2_reasoning: str = Field(..., description="NLP analysis explanation")
    agent_3_reasoning: str = Field(..., description="Mediator decision explanation")
    
    # Red flags detected
    red_flags: list[str] = Field(default_factory=list)
    
    # The Proposal Snapshot for human review
    snapshot: ProposalSnapshot


class SimulateResponse(BaseModel):
    """
    Response model for the /simulate endpoint
    
    Provides feedback to proposers without storing anything.
    """
    success_probability: float = Field(..., ge=0, le=1, description="Probability of passing (0-1)")
    risk_score: float = Field(..., ge=0, le=100, description="Predicted risk score")
    classification: str = Field(..., description="LIKELY_APPROVED | NEEDS_REVIEW | LIKELY_REJECTED")
    suggestions: list[str] = Field(default_factory=list, description="Improvement suggestions")
    red_flags: list[str] = Field(default_factory=list, description="Detected red flags")


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    agents: dict[str, str]


class AnalysisResult(BaseModel):
    """
    Internal model for mediator output - contains full analysis result.
    Used internally by the Mediator agent.
    """
    proposal_id: str
    risk_score: int = Field(..., ge=0, le=100)
    risk_category: RiskCategory
    verdict: str = Field(..., description="AUTO_APPROVE | NEEDS_REVIEW | AUTO_REJECT")
    reasoning: str
    red_flags: list[str] = Field(default_factory=list)
    agent_scores: dict = Field(default_factory=dict)
    confidence: float = Field(default=0.5, ge=0, le=1)
