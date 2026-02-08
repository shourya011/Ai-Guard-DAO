"""
Agent 3: Mediator (The Decision Maker)

Ensemble classifier that combines signals from all agents to produce
the final risk score and verdict.

Type: Deterministic Algorithm
Formula: Risk = ((100 - RepScore) * 0.4) + ((100 - NLPScore) * 0.6)
"""

from loguru import logger
from ..schemas.models import AnalysisResult, RiskCategory


class MediatorAgent:
    """
    The Mediator - Agent 3
    
    Combines signals from Reputation Sentinel and NLP Analyst
    to produce the final verdict using an ensemble approach.
    
    Formula:
        Risk = ((100 - RepScore) * W_rep) + ((100 - NLPScore) * W_nlp)
        
    Where:
        - RepScore: 0-100 (100 = trusted wallet)
        - NLPScore: 0-100 (100 = safe content)
        - W_rep = 0.4 (reputation weight)
        - W_nlp = 0.6 (content weight)
    """
    
    # Configurable weights
    WEIGHT_REPUTATION = 0.4
    WEIGHT_NLP = 0.6
    
    # Thresholds for verdicts
    THRESHOLD_AUTO_APPROVE = 20  # Risk 0-19: AUTO_APPROVE
    THRESHOLD_NEEDS_REVIEW = 80  # Risk 20-79: NEEDS_REVIEW
    # Risk 80-100: AUTO_REJECT

    def __init__(self):
        self.name = "Mediator"
        logger.info(f"⚖️ {self.name} initialized with weights: rep={self.WEIGHT_REPUTATION}, nlp={self.WEIGHT_NLP}")

    def calculate_risk_score(
        self,
        reputation_score: int,
        nlp_safety_score: int
    ) -> tuple[int, RiskCategory]:
        """
        Calculate the combined risk score.
        
        Args:
            reputation_score: 0-100 where 100 = fully trusted wallet
            nlp_safety_score: 0-100 where 100 = completely safe content
            
        Returns:
            tuple of (risk_score: int, category: RiskCategory)
        """
        # Convert safety scores to risk scores
        reputation_risk = 100 - reputation_score
        nlp_risk = 100 - nlp_safety_score
        
        # Weighted combination
        combined_risk = (reputation_risk * self.WEIGHT_REPUTATION) + (nlp_risk * self.WEIGHT_NLP)
        
        # Round to integer
        risk_score = round(combined_risk)
        risk_score = max(0, min(100, risk_score))
        
        # Determine category
        if risk_score < self.THRESHOLD_AUTO_APPROVE:
            category = RiskCategory.LOW
        elif risk_score < self.THRESHOLD_NEEDS_REVIEW:
            category = RiskCategory.MEDIUM
        else:
            category = RiskCategory.HIGH
        
        logger.debug(
            f"⚖️ Risk calculation: rep_risk={reputation_risk}, nlp_risk={nlp_risk}, "
            f"combined={risk_score}, category={category.value}"
        )
        
        return risk_score, category

    def determine_verdict(self, risk_score: int, category: RiskCategory) -> str:
        """
        Determine the automated verdict based on risk score.
        
        Returns: "AUTO_APPROVE", "NEEDS_REVIEW", or "AUTO_REJECT"
        """
        if risk_score < self.THRESHOLD_AUTO_APPROVE:
            return "AUTO_APPROVE"
        elif risk_score < self.THRESHOLD_NEEDS_REVIEW:
            return "NEEDS_REVIEW"
        else:
            return "AUTO_REJECT"

    async def mediate(
        self,
        proposal_id: str,
        reputation_result: dict,
        nlp_result: dict,
        proposer_address: str
    ) -> AnalysisResult:
        """
        Produce the final analysis by combining all agent signals.
        
        Args:
            proposal_id: The proposal identifier
            reputation_result: Output from ReputationAgent
            nlp_result: Output from NLPAgent
            proposer_address: The wallet address that submitted the proposal
            
        Returns:
            AnalysisResult with final verdict
        """
        logger.info(f"⚖️ {self.name} mediating for proposal {proposal_id}")
        
        # Extract scores (both are safety scores: 100 = safe)
        reputation_score = reputation_result.get("score", 50)
        nlp_safety_score = nlp_result.get("score", 50)  # NLPAgent returns safety score
        
        # Calculate combined risk
        risk_score, category = self.calculate_risk_score(reputation_score, nlp_safety_score)
        
        # Determine verdict
        verdict = self.determine_verdict(risk_score, category)
        
        # Collect all red flags
        all_red_flags = []
        if nlp_result.get("red_flags"):
            all_red_flags.extend(nlp_result["red_flags"])
        
        # Add reputation concerns as red flags
        if reputation_score < 30:
            all_red_flags.append(f"Low reputation score ({reputation_score}): {reputation_result.get('history', 'Unknown history')}")
        
        # Build reasoning summary
        reasoning_parts = [
            f"Reputation Score: {reputation_score}/100 ({reputation_result.get('history', 'No history')})",
            f"Content Safety Score: {nlp_safety_score}/100",
            f"Combined Risk Score: {risk_score}/100",
            f"Verdict: {verdict}",
        ]
        
        if nlp_result.get("reasoning"):
            reasoning_parts.append(f"NLP Analysis: {nlp_result['reasoning']}")
        
        combined_reasoning = " | ".join(reasoning_parts)
        
        logger.info(
            f"⚖️ Mediation complete: risk={risk_score}, verdict={verdict}, "
            f"flags={len(all_red_flags)}"
        )
        
        return AnalysisResult(
            proposal_id=proposal_id,
            risk_score=risk_score,
            risk_category=category,
            verdict=verdict,
            reasoning=combined_reasoning,
            red_flags=all_red_flags,
            agent_scores={
                "reputation": {
                    "score": reputation_score,
                    "weight": self.WEIGHT_REPUTATION,
                    "history": reputation_result.get("history", "Unknown"),
                },
                "nlp": {
                    "score": nlp_safety_score,
                    "weight": self.WEIGHT_NLP,
                    "red_flags_count": len(nlp_result.get("red_flags", [])),
                },
                "combined_risk": risk_score,
            },
            confidence=self._calculate_confidence(reputation_result, nlp_result),
        )

    def _calculate_confidence(self, reputation_result: dict, nlp_result: dict) -> float:
        """
        Calculate confidence level for the verdict.
        
        Higher confidence when:
        - Both agents agree
        - Clear signals (very high or very low scores)
        """
        rep_score = reputation_result.get("score", 50)
        nlp_score = nlp_result.get("score", 50)
        
        # Agreement factor: high when both scores are similar
        score_diff = abs(rep_score - nlp_score)
        agreement = 1 - (score_diff / 100)
        
        # Extremity factor: high when scores are far from 50
        rep_extremity = abs(rep_score - 50) / 50
        nlp_extremity = abs(nlp_score - 50) / 50
        extremity = (rep_extremity + nlp_extremity) / 2
        
        # Combine factors
        confidence = (agreement * 0.5) + (extremity * 0.5)
        
        # Clamp to 0.3-0.98 range (never 100% confident)
        confidence = max(0.3, min(0.98, confidence))
        
        return round(confidence, 2)

    # Legacy interface for backward compatibility
    async def analyze(
        self, 
        reputation_score: float, 
        nlp_score: float,
        red_flags: list[str],
        proposal_text: str
    ) -> dict:
        """Legacy interface - converts old format to new format"""
        risk_score, category = self.calculate_risk_score(
            int(100 - reputation_score),  # Old format was inverted
            int(100 - nlp_score)
        )
        verdict = self.determine_verdict(risk_score, category)
        
        return {
            "score": risk_score,
            "reasoning": f"Risk: {risk_score}/100 | Verdict: {verdict}",
            "recommendation": verdict,
        }


# Singleton instance
mediator_agent = MediatorAgent()
