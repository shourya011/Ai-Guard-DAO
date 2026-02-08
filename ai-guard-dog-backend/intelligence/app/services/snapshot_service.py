"""
Snapshot Service - Executive Summary Generator

Uses Google Gemini 1.5 Flash for fast generation of proposal snapshots.
Extracts key heuristics and provides human-readable summaries.

Type: LLM (Gemini 1.5 Flash)
"""

import os
import json
from loguru import logger

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not installed. Snapshot Service will use fallback mode.")


class SnapshotService:
    """
    Generates executive summaries and structured snapshots for proposals.
    
    Uses Gemini 1.5 Flash for fast, cost-effective summarization.
    """
    
    # System prompt for snapshot generation
    SYSTEM_PROMPT = """You are a DAO governance assistant that creates concise, structured summaries of proposals.

Your task is to analyze the proposal and extract key information into a structured format.

For each proposal, provide:
1. "executive_summary": A 2-3 sentence summary of what the proposal is asking for
2. "key_heuristics": Key facts extracted from the proposal:
   - "requested_amount": Amount of funds requested (or "Not specified")
   - "recipient": Who receives the funds/benefit
   - "timeline": Proposed timeline or deadline
   - "category": Type of proposal (Treasury, Governance, Technical, Community, Other)
3. "deliverables": List of concrete deliverables mentioned (max 5)
4. "concerns": Any notable concerns or missing information (max 3)
5. "recommendation_context": Brief context for reviewers (1 sentence)

Be factual and objective. Extract only what's explicitly stated.
Return a JSON object with these fields."""

    def __init__(self):
        self.name = "Snapshot Service"
        self.model = None
        self.model_name = os.environ.get("GEMINI_FLASH_MODEL", "gemini-2.0-flash-lite")
        
        if GEMINI_AVAILABLE and os.environ.get("GOOGLE_API_KEY"):
            try:
                genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
                self.model = genai.GenerativeModel(
                    model_name=self.model_name,
                    generation_config={
                        "temperature": 0.2,  # Lower temp for factual extraction
                        "top_p": 0.95,
                        "top_k": 40,
                        "max_output_tokens": 1024,
                    }
                )
                logger.info(f"📋 {self.name} initialized with {self.model_name}")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini Flash: {e}. Using fallback mode.")
                self.model = None
        else:
            logger.info(f"📋 {self.name} initialized in fallback mode (no API key)")

    async def generate_snapshot(
        self,
        proposal_id: str,
        title: str,
        description: str,
        proposer_address: str
    ) -> dict:
        """
        Generate a structured snapshot of the proposal.
        
        Args:
            proposal_id: Unique identifier for the proposal
            title: Proposal title
            description: Full proposal description
            proposer_address: Address of the proposer
            
        Returns:
            dict with executive_summary, key_heuristics, deliverables, concerns
        """
        logger.info(f"📋 Generating snapshot for proposal {proposal_id}")
        
        proposal_text = f"Title: {title}\n\nDescription:\n{description}\n\nProposer: {proposer_address}"
        
        if self.model:
            return await self._generate_with_gemini(proposal_id, proposal_text)
        else:
            return self._generate_fallback(proposal_id, title, description, proposer_address)

    async def _generate_with_gemini(self, proposal_id: str, proposal_text: str) -> dict:
        """Use Gemini Flash for snapshot generation"""
        import asyncio
        try:
            prompt = f"""{self.SYSTEM_PROMPT}

---
PROPOSAL TO SUMMARIZE:
{proposal_text}
---

Respond with a JSON object containing the structured snapshot."""

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
            snapshot = {
                "proposal_id": proposal_id,
                "executive_summary": result.get("executive_summary", "Summary not available."),
                "key_heuristics": result.get("key_heuristics", {}),
                "deliverables": result.get("deliverables", [])[:5],  # Max 5
                "concerns": result.get("concerns", [])[:3],  # Max 3
                "recommendation_context": result.get("recommendation_context", ""),
                "generated_by": "gemini-1.5-flash"
            }
            
            logger.info(f"📋 Gemini snapshot generated: {len(snapshot['deliverables'])} deliverables")
            return snapshot
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini snapshot response: {e}")
            return self._generate_fallback(proposal_id, "", proposal_text, "")
        except Exception as e:
            logger.error(f"Gemini Flash API error: {e}")
            return self._generate_fallback(proposal_id, "", proposal_text, "")

    def _generate_fallback(
        self,
        proposal_id: str,
        title: str,
        description: str,
        proposer_address: str
    ) -> dict:
        """Fallback snapshot generation using heuristics"""
        logger.info(f"📋 Using fallback snapshot generation")
        
        full_text = f"{title}\n{description}"
        text_lower = full_text.lower()
        
        # Extract amount (look for numbers followed by token symbols)
        import re
        amount_patterns = [
            r'(\d+[,.]?\d*)\s*(MON|ETH|USDC|USDT|USD|DAI)',
            r'(\d+[,.]?\d*)\s*tokens?',
            r'\$(\d+[,.]?\d*)',
        ]
        requested_amount = "Not specified"
        for pattern in amount_patterns:
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                requested_amount = match.group(0)
                break
        
        # Detect category
        category = "Other"
        if any(word in text_lower for word in ['treasury', 'fund', 'budget', 'allocate']):
            category = "Treasury"
        elif any(word in text_lower for word in ['vote', 'governance', 'quorum', 'proposal']):
            category = "Governance"
        elif any(word in text_lower for word in ['contract', 'deploy', 'upgrade', 'technical']):
            category = "Technical"
        elif any(word in text_lower for word in ['community', 'event', 'marketing', 'social']):
            category = "Community"
        
        # Extract deliverables (bullet points)
        deliverables = []
        lines = description.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith(('-', '•', '*', '1.', '2.', '3.')):
                content = re.sub(r'^[-•*\d.]+\s*', '', line).strip()
                if 10 < len(content) < 200:
                    deliverables.append(content)
        
        # Identify concerns
        concerns = []
        word_count = len(full_text.split())
        if word_count < 50:
            concerns.append("Very short proposal - lacking detail")
        if requested_amount == "Not specified" and category == "Treasury":
            concerns.append("Treasury proposal without specified amount")
        if not deliverables:
            concerns.append("No clear deliverables listed")
        
        # Generate executive summary
        executive_summary = f"This {category.lower()} proposal "
        if requested_amount != "Not specified":
            executive_summary += f"requests {requested_amount}. "
        else:
            executive_summary += "does not specify a funding amount. "
        executive_summary += f"The proposal contains {word_count} words."
        
        return {
            "proposal_id": proposal_id,
            "executive_summary": executive_summary,
            "key_heuristics": {
                "requested_amount": requested_amount,
                "recipient": "See proposal details",
                "timeline": "Not specified",
                "category": category
            },
            "deliverables": deliverables[:5],
            "concerns": concerns[:3],
            "recommendation_context": f"Review this {category.lower()} proposal carefully.",
            "generated_by": "fallback-heuristics"
        }

    async def generate_quick_summary(self, title: str, description: str) -> str:
        """
        Generate just a quick one-liner summary.
        
        Useful for list views and notifications.
        """
        if self.model:
            try:
                prompt = f"""Summarize this proposal in exactly one sentence (max 100 characters):

Title: {title}
Description: {description[:500]}

One sentence summary:"""
                
                response = self.model.generate_content(prompt)
                return response.text.strip()[:150]
            except Exception as e:
                logger.warning(f"Quick summary generation failed: {e}")
        
        # Fallback: use title or first line
        return title[:100] if title else description.split('\n')[0][:100]


# Singleton instance
snapshot_service = SnapshotService()
