"""
AI Guard Dog Intern - Python Intelligence Layer

FastAPI application that runs the Tri-Agent analysis system.

Agents:
- Agent 1: Reputation Sentinel (Deterministic wallet scoring)
- Agent 2: NLP Analyst (Gemini 1.5 Pro for content analysis)
- Agent 3: Mediator (Ensemble classifier)

Services:
- Snapshot Service (Gemini 1.5 Flash for summaries)

Endpoints:
- POST /analyze  - Stateful analysis (results stored in DB via Node.js)
- POST /simulate - Stateless simulation (pure function, no DB writes)
- GET  /health   - Health check
"""

import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API if available
try:
    import google.generativeai as genai
    if os.environ.get("GOOGLE_API_KEY"):
        genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
        logger.info("✅ Gemini API configured successfully")
    else:
        logger.warning("⚠️ GOOGLE_API_KEY not set - agents will use fallback mode")
except ImportError:
    logger.warning("⚠️ google-generativeai not installed - using fallback mode")

from app.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    SimulateRequest,
    SimulateResponse,
    ProposalSnapshot,
    RiskProfile,
    HealthResponse,
)
from app.agents import reputation_agent, nlp_agent, mediator_agent
from app.services import snapshot_service


# ═══════════════════════════════════════════════════════════════
# APPLICATION SETUP
# ═══════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info("🚀 Starting AI Guard Dog Intelligence Layer...")
    logger.info("🔍 Agent 1: Reputation Sentinel - Ready")
    logger.info("📝 Agent 2: NLP Analyst - Ready")
    logger.info("⚖️ Agent 3: Mediator - Ready")
    yield
    logger.info("👋 Shutting down Intelligence Layer...")


app = FastAPI(
    title="AI Guard Dog Intelligence API",
    description="Multi-agent AI system for DAO proposal analysis",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """Root endpoint - redirects to docs"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        agents={
            "reputation_sentinel": "ready",
            "nlp_analyst": "ready",
            "mediator": "ready",
        }
    )


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_proposal(request: AnalyzeRequest):
    """
    STATEFUL ENDPOINT: Analyze a proposal
    
    Runs all three AI agents:
    1. Reputation Sentinel - Deterministic wallet scoring
    2. NLP Analyst - Gemini 1.5 Pro content analysis
    3. Mediator - Ensemble classifier with weighted combination
    
    Plus: Snapshot Service generates executive summary with Gemini 1.5 Flash
    
    Results are returned to Node.js for database storage.
    """
    logger.info(f"\n{'='*60}")
    logger.info(f"📊 ANALYZING PROPOSAL: {request.proposal_id}")
    logger.info(f"{'='*60}\n")
    
    try:
        # Extract title from proposal text (first line or first 100 chars)
        lines = request.proposal_text.split('\n', 1)
        title = lines[0].strip().lstrip('#').strip()[:100] if lines else "Untitled"
        description = lines[1] if len(lines) > 1 else request.proposal_text
        
        # Run Agent 1 (Reputation) and Agent 2 (NLP) in parallel
        agent_1_task = reputation_agent.evaluate_reputation(request.wallet_address)
        agent_2_task = nlp_agent.evaluate_content(title, description)
        
        agent_1_result, agent_2_result = await asyncio.gather(
            agent_1_task, 
            agent_2_task
        )
        
        logger.info(f"🔍 Agent 1 (Reputation): {agent_1_result['score']}/100 - {agent_1_result['history']}")
        logger.info(f"📝 Agent 2 (NLP Safety): {agent_2_result['score']}/100")
        
        # Run Agent 3 (Mediator) to combine and decide
        mediation_result = await mediator_agent.mediate(
            proposal_id=request.proposal_id,
            reputation_result=agent_1_result,
            nlp_result=agent_2_result,
            proposer_address=request.wallet_address,
        )
        
        logger.info(f"⚖️ Agent 3 (Mediator): Risk={mediation_result.risk_score}/100")
        logger.info(f"📋 Verdict: {mediation_result.verdict}")
        
        # Generate the Proposal Snapshot using Gemini Flash
        snapshot_data = await snapshot_service.generate_snapshot(
            proposal_id=request.proposal_id,
            title=title,
            description=description,
            proposer_address=request.wallet_address,
        )
        
        # Build risk profile with agent alerts
        agent_alerts = []
        if agent_1_result["score"] < 30:
            agent_alerts.append(f"⚠️ Low reputation score ({agent_1_result['score']}): {agent_1_result['history']}")
        if agent_2_result["score"] < 50:
            agent_alerts.append(f"⚠️ Content safety concerns (score: {agent_2_result['score']})")
        for flag in agent_2_result.get("red_flags", []):
            agent_alerts.append(f"🚩 {flag}")
        
        snapshot = ProposalSnapshot(
            executive_summary=snapshot_data.get("executive_summary", ""),
            deliverables=snapshot_data.get("deliverables", []),
            timeline=snapshot_data.get("key_heuristics", {}).get("timeline", "Not specified"),
            budget_breakdown=snapshot_data.get("key_heuristics", {}),
            risk_profile=RiskProfile(agent_alerts=agent_alerts),
        )
        
        response = AnalyzeResponse(
            proposal_id=request.proposal_id,
            agent_1_score=agent_1_result["score"],
            agent_2_score=agent_2_result["score"],
            agent_3_score=mediation_result.risk_score,
            composite_risk_score=mediation_result.risk_score,
            agent_1_reasoning=agent_1_result["reasoning"],
            agent_2_reasoning=agent_2_result["reasoning"],
            agent_3_reasoning=mediation_result.reasoning,
            red_flags=mediation_result.red_flags,
            snapshot=snapshot,
        )
        
        logger.info(f"\n✅ Analysis complete for {request.proposal_id}")
        logger.info(f"   Composite Risk Score: {response.composite_risk_score}/100")
        logger.info(f"   Verdict: {mediation_result.verdict}\n")
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/simulate", response_model=SimulateResponse)
async def simulate_proposal(request: SimulateRequest):
    """
    STATELESS ENDPOINT: Simulate a proposal draft
    
    This is a PURE FUNCTION - it does NOT write to any database.
    Uses Gemini for content analysis but assumes neutral reputation.
    
    Use cases:
    - Proposers can preview their score before submitting
    - Voters can get quick insights on proposals
    - Testing and development
    """
    logger.info(f"\n{'='*60}")
    logger.info(f"🎮 SIMULATING DRAFT PROPOSAL")
    logger.info(f"{'='*60}\n")
    
    try:
        # Extract title and description
        lines = request.draft_text.split('\n', 1)
        title = lines[0].strip().lstrip('#').strip()[:100] if lines else "Draft Proposal"
        description = lines[1] if len(lines) > 1 else request.draft_text
        
        # Run NLP analysis with Gemini
        nlp_result = await nlp_agent.evaluate_content(title, description)
        
        # Use neutral reputation for simulation (score of 50)
        mock_reputation_result = {
            "score": 50,
            "history": "Simulated - No wallet provided",
            "reasoning": "Simulation mode: assuming neutral reputation"
        }
        
        # Calculate risk using the mediator's formula
        risk_score, category = mediator_agent.calculate_risk_score(
            reputation_score=50,  # Neutral
            nlp_safety_score=nlp_result["score"]
        )
        
        # Calculate success probability (inverse of risk)
        success_probability = max(0, min(1, 1 - (risk_score / 100)))
        
        # Determine classification based on mediator thresholds
        verdict = mediator_agent.determine_verdict(risk_score, category)
        if verdict == "AUTO_APPROVE":
            classification = "LIKELY_APPROVED"
        elif verdict == "AUTO_REJECT":
            classification = "LIKELY_REJECTED"
        else:
            classification = "NEEDS_REVIEW"
        
        # Generate improvement suggestions
        suggestions = []
        
        word_count = len(request.draft_text.split())
        if word_count < 100:
            suggestions.append("📝 Add more detail to your proposal (aim for 200+ words)")
        
        if "budget" not in request.draft_text.lower():
            suggestions.append("💰 Include a budget breakdown section")
        
        if "timeline" not in request.draft_text.lower() and "schedule" not in request.draft_text.lower():
            suggestions.append("📅 Add a timeline or schedule for deliverables")
        
        if "team" not in request.draft_text.lower() and "contact" not in request.draft_text.lower():
            suggestions.append("👥 Include team information or contact details")
        
        if "deliverable" not in request.draft_text.lower() and "outcome" not in request.draft_text.lower():
            suggestions.append("🎯 Clearly list expected deliverables and outcomes")
        
        # Add suggestions based on NLP red flags
        if nlp_result.get("red_flags"):
            for flag in nlp_result["red_flags"][:3]:  # Limit to top 3
                suggestions.append(f"⚠️ Review: {flag}")
        
        # Add NLP reasoning as context
        if nlp_result.get("reasoning") and risk_score > 30:
            suggestions.append(f"💡 AI Note: {nlp_result['reasoning']}")
        
        response = SimulateResponse(
            success_probability=round(success_probability, 2),
            risk_score=risk_score,
            classification=classification,
            suggestions=suggestions,
            red_flags=nlp_result.get("red_flags", []),
        )
        
        logger.info(f"🎯 Simulation complete:")
        logger.info(f"   NLP Safety Score: {nlp_result['score']}/100")
        logger.info(f"   Combined Risk Score: {risk_score}/100")
        logger.info(f"   Success Probability: {success_probability*100:.1f}%")
        logger.info(f"   Classification: {classification}\n")
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "="*60)
    print("🐕 AI GUARD DOG INTERN - Intelligence Layer")
    print("="*60 + "\n")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
