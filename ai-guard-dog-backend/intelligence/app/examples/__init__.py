"""
Test examples module for AI Guard Dog Intelligence Layer

Contains realistic DAO proposal examples for testing:
- GOOD (3 proposals): Expected risk 0-19, AUTO_APPROVE
- BAD (4 proposals): Expected risk 80-100, AUTO_REJECT  
- REVIEW (4 proposals): Expected risk 20-79, HUMAN_REVIEW
"""

from .test_proposals import (
    TestProposal,
    GOOD_PROPOSALS,
    BAD_PROPOSALS,
    REVIEW_PROPOSALS,
    ALL_PROPOSALS,
    get_proposal_by_id,
    get_proposals_by_classification,
)

__all__ = [
    "TestProposal",
    "GOOD_PROPOSALS",
    "BAD_PROPOSALS", 
    "REVIEW_PROPOSALS",
    "ALL_PROPOSALS",
    "get_proposal_by_id",
    "get_proposals_by_classification",
]
