"""
Agent 1: Reputation Sentinel

Quantitative analysis of identity and history.
Analyzes wallet age, transaction history, DAO participation.

Type: Deterministic / API-based
For testnet, uses mock logic based on wallet address patterns.
"""

from loguru import logger


class ReputationAgent:
    """
    The Reputation Sentinel - Agent 1
    
    Analyzes the proposer's on-chain reputation and history.
    Uses deterministic rules for testnet (will integrate with blockchain explorers in production).
    """

    def __init__(self):
        self.name = "Reputation Sentinel"
        logger.info(f"🔍 {self.name} initialized")

    async def evaluate_reputation(self, wallet_address: str) -> dict:
        """
        Evaluate the proposer's wallet reputation.
        
        Mock Logic for Testnet:
        - Wallet ends in ...888 (The "Whale"): High trust
        - Wallet ends in ...000 (The "Attacker"): Low trust  
        - Else: Neutral score
        
        Args:
            wallet_address: The proposer's wallet address (0x...)
            
        Returns:
            dict with:
            - score: 0-100 (higher = more trustworthy)
            - history: Description of wallet history
            - reasoning: Detailed analysis explanation
            - analysis_log: List of findings
        """
        logger.info(f"🔍 {self.name} analyzing wallet: {wallet_address}")
        
        wallet_lower = wallet_address.lower()
        
        # Mock logic based on wallet address patterns
        if wallet_lower.endswith("888"):
            # The "Whale" - Verified high-reputation wallet
            score = 95
            history = "Verified Whale Account"
            analysis_log = [
                "✅ Verified Identity: ENS domain linked",
                "✅ High DAO Participation: 50+ governance votes",
                "✅ Wallet Age: 3+ years",
                "✅ Transaction History: 1000+ transactions",
                "✅ Social Verification: GitHub & Twitter linked"
            ]
            reasoning = "High-trust wallet with verified identity, extensive DAO participation, and established on-chain history."
            logger.info(f"🐋 Whale wallet detected: {wallet_address}")
            
        elif wallet_lower.endswith("000"):
            # The "Attacker" - Suspicious wallet
            score = 10
            history = "Suspicious New Wallet"
            analysis_log = [
                "🚨 New Wallet: Created < 24 hours ago",
                "🚨 Funded by Tornado Cash",
                "⚠️ No DAO Participation History",
                "⚠️ Single Funding Source",
                "⚠️ No Social Verification"
            ]
            reasoning = "High-risk wallet with no history, suspicious funding source, and no verifiable identity."
            logger.warning(f"🚨 Suspicious wallet detected: {wallet_address}")
            
        elif wallet_lower.endswith("123") or wallet_lower.endswith("abc"):
            # Test wallet - Medium trust
            score = 65
            history = "Established User"
            analysis_log = [
                "ℹ️ Wallet Age: 6 months",
                "ℹ️ Transaction Count: 50",
                "✅ Some DAO Participation: 5 votes",
                "⚠️ No ENS domain",
                "⚠️ Limited Social Verification"
            ]
            reasoning = "Moderate-trust wallet with some on-chain history and limited DAO participation."
            logger.info(f"📊 Standard wallet detected: {wallet_address}")
            
        else:
            # Default - No history found
            score = 50
            history = "No History Found"
            analysis_log = [
                "ℹ️ No On-Chain History Found",
                "ℹ️ Unable to verify wallet age",
                "ℹ️ No DAO participation records",
                "⚠️ Recommend additional verification"
            ]
            reasoning = "Neutral score due to lack of on-chain history. Additional verification recommended."
            logger.info(f"❓ Unknown wallet: {wallet_address}")
        
        result = {
            "score": score,
            "history": history,
            "reasoning": reasoning,
            "analysis_log": analysis_log
        }
        
        logger.info(f"🔍 {self.name} result: score={score}, history={history}")
        return result

    # Keep backward compatibility with old interface
    async def analyze(self, wallet_address: str, proposal_text: str) -> dict:
        """Legacy interface for compatibility"""
        result = await self.evaluate_reputation(wallet_address)
        return {
            "score": result["score"],
            "reasoning": " | ".join(result["analysis_log"])
        }


# Singleton instance
reputation_agent = ReputationAgent()
