"""
Agent 2: NLP Analyst

Qualitative semantic analysis of content using Google Gemini 1.5 Pro.
Detects linguistic patterns associated with scams, vague promises, or obfuscated logic.

Type: LLM (Gemini 1.5 Pro)
"""

import os
import json
from loguru import logger

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not installed. NLP Agent will use fallback mode.")


class NLPAgent:
    """
    The NLP Analyst - Agent 2
    
    Analyzes the proposal text for red flags and quality indicators
    using Google's Gemini 1.5 Pro model.
    """
    
    # System prompt for the NLP analysis
    SYSTEM_PROMPT = """You are a DAO Security Analyst specializing in detecting fraudulent governance proposals.

Your task is to analyze the given proposal for linguistic markers of fraud, including:
- Vague promises without concrete deliverables
- Excessive urgency or pressure tactics ("act now", "limited time")
- Technical obfuscation to hide true intent
- Unrealistic return promises
- Anonymous team or lack of accountability
- Missing budget breakdown or timeline
- Emotional manipulation language

Analyze the proposal and return a JSON object with:
1. "score": An integer from 0-100 where 100 means completely safe/legitimate and 0 means highly likely scam
2. "red_flags": A list of specific red flags detected (empty list if none)
3. "reasoning": A brief 1-2 sentence explanation of your assessment

Be thorough but fair. Not all unusual proposals are scams."""

    # Fallback red flag patterns for when Gemini is unavailable
    FALLBACK_RED_FLAGS = {
        "guaranteed returns": 30,
        "guaranteed profit": 30,
        "100% safe": 25,
        "risk-free": 25,
        "anonymous team": 25,
        "anonymous": 20,
        "trust us": 15,
        "act now": 10,
        "urgent": 10,
        "limited time": 10,
        "no questions asked": 25,
        "easy money": 20,
        "get rich": 20,
    }

    def __init__(self):
        self.name = "NLP Analyst"
        self.model = None
        self.model_name = os.environ.get("GEMINI_PRO_MODEL", "gemini-2.0-flash")
        
        if GEMINI_AVAILABLE and os.environ.get("GOOGLE_API_KEY"):
            try:
                genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
                self.model = genai.GenerativeModel(
                    model_name=self.model_name,
                    generation_config={
                        "temperature": 0.3,
                        "top_p": 0.95,
                        "top_k": 40,
                        "max_output_tokens": 1024,
                    }
                )
                logger.info(f"📝 {self.name} initialized with {self.model_name}")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini: {e}. Using fallback mode.")
                self.model = None
        else:
            logger.info(f"📝 {self.name} initialized in fallback mode (no API key)")

    async def evaluate_content(self, title: str, description: str) -> dict:
        """
        Evaluate proposal content for fraud indicators using Gemini.
        
        Args:
            title: The proposal title
            description: The proposal description/body
            
        Returns:
            dict with score (0-100, higher = safer), red_flags list, and reasoning
        """
        logger.info(f"📝 {self.name} analyzing proposal: {title[:50]}...")
        
        full_text = f"Title: {title}\n\nDescription:\n{description}"
        
        if self.model:
            return await self._analyze_with_gemini(full_text)
        else:
            return self._analyze_fallback(full_text)

    async def _analyze_with_gemini(self, proposal_text: str) -> dict:
        """Use Gemini for analysis"""
        import asyncio
        try:
            prompt = f"""{self.SYSTEM_PROMPT}

---
PROPOSAL TO ANALYZE:
{proposal_text}
---

Respond with a JSON object containing "score", "red_flags", and "reasoning"."""

            # Run the sync API call in a thread executor to not block the event loop
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: self.model.generate_content(prompt)
            )
            
            # Parse JSON response - handle markdown code blocks
            response_text = response.text.strip()
            if response_text.startswith("```"):
                # Remove markdown code block markers
                lines = response_text.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                response_text = "\n".join(lines)
            
            result = json.loads(response_text)
            
            # Validate and normalize the response
            score = max(0, min(100, int(result.get("score", 50))))
            red_flags = result.get("red_flags", [])
            reasoning = result.get("reasoning", "Analysis complete.")
            
            logger.info(f"📝 Gemini analysis: score={score}, flags={len(red_flags)}")
            
            return {
                "score": score,
                "red_flags": red_flags if isinstance(red_flags, list) else [],
                "reasoning": reasoning
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            return self._analyze_fallback(proposal_text)
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return self._analyze_fallback(proposal_text)

    def _analyze_fallback(self, proposal_text: str) -> dict:
        """Fallback analysis when Gemini is unavailable"""
        logger.info(f"📝 Using fallback NLP analysis")
        
        text_lower = proposal_text.lower()
        detected_flags = []
        penalty = 0
        
        # Check for red flag phrases
        for phrase, weight in self.FALLBACK_RED_FLAGS.items():
            if phrase in text_lower:
                detected_flags.append(f"Detected: '{phrase}'")
                penalty += weight
        
        # Check proposal length
        word_count = len(proposal_text.split())
        if word_count < 50:
            detected_flags.append("Very short proposal (< 50 words)")
            penalty += 15
        
        # Check for excessive caps
        caps_ratio = sum(1 for c in proposal_text if c.isupper()) / max(len(proposal_text), 1)
        if caps_ratio > 0.3:
            detected_flags.append("Excessive use of capital letters")
            penalty += 10
        
        # Calculate score (100 = safe, 0 = scam)
        score = max(0, min(100, 85 - penalty))
        
        reasoning = f"Fallback analysis detected {len(detected_flags)} potential issues."
        if not detected_flags:
            reasoning = "No obvious red flags detected in fallback analysis."
        
        return {
            "score": score,
            "red_flags": detected_flags,
            "reasoning": reasoning
        }

    # Legacy interface for backward compatibility
    async def analyze(self, proposal_text: str) -> dict:
        """Legacy interface"""
        lines = proposal_text.split('\n', 1)
        title = lines[0] if lines else "Untitled"
        description = lines[1] if len(lines) > 1 else proposal_text
        
        result = await self.evaluate_content(title, description)
        
        # Convert to legacy format (inverted score for risk)
        return {
            "score": 100 - result["score"],  # Convert safety score to risk score
            "reasoning": result["reasoning"],
            "red_flags": result["red_flags"]
        }

    def generate_snapshot(self, proposal_text: str) -> dict:
        """Legacy method - kept for compatibility"""
        return {
            "executive_summary": "Summary generation moved to SnapshotService",
            "deliverables": [],
            "timeline": "Not specified",
            "budget_breakdown": {},
            "risk_profile": {"agent_alerts": []},
        }


# Singleton instance
nlp_agent = NLPAgent()
