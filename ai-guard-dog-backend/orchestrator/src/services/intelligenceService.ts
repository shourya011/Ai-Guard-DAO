/**
 * Intelligence Service
 * 
 * Bridge to the Python FastAPI Intelligence Layer.
 * Handles communication with the AI agents for proposal analysis.
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

// Types for API communication
export interface AnalyzeRequest {
  proposal_id: string;
  proposal_text: string;
  wallet_address: string;
}

export interface AnalyzeResponse {
  proposal_id: string;
  agent_1_score: number;  // Reputation Sentinel
  agent_2_score: number;  // NLP Analyst
  agent_3_score: number;  // Mediator
  composite_risk_score: number;
  agent_1_reasoning: string;
  agent_2_reasoning: string;
  agent_3_reasoning: string;
  red_flags: string[];
  snapshot: {
    executive_summary: string;
    deliverables: string[];
    timeline: string;
    budget_breakdown: Record<string, any>;
    risk_profile: {
      agent_alerts: string[];
    };
  };
}

export interface SimulateRequest {
  draft_text: string;
}

export interface SimulateResponse {
  success_probability: number;
  risk_score: number;
  classification: 'LIKELY_APPROVED' | 'NEEDS_REVIEW' | 'LIKELY_REJECTED';
  suggestions: string[];
  red_flags: string[];
}

class IntelligenceService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.intelligenceApiUrl,
      timeout: 60000, // 60 seconds timeout for AI processing
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((request) => {
      console.log(`🧠 Intelligence API Request: ${request.method?.toUpperCase()} ${request.url}`);
      return request;
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Intelligence API Response: ${response.status}`);
        return response;
      },
      (error) => {
        console.error(`❌ Intelligence API Error: ${error.message}`);
        throw error;
      }
    );
  }

  /**
   * Health check for the Python service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('❌ Intelligence service health check failed:', error);
      return false;
    }
  }

  /**
   * STATEFUL ENDPOINT: Analyze a proposal
   * 
   * This is the main analysis endpoint that:
   * 1. Runs all three AI agents in parallel
   * 2. Generates the composite risk score
   * 3. Creates the "Proposal Snapshot" summary
   * 
   * Results are stored in the Reasoning_Reports table.
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    console.log(`\n🔍 ══════════════════════════════════════════`);
    console.log(`📊 ANALYZING PROPOSAL: ${request.proposal_id}`);
    console.log(`══════════════════════════════════════════════\n`);

    try {
      const response = await this.client.post<AnalyzeResponse>('/analyze', request);
      
      const result = response.data;
      
      // Log the results
      console.log(`📈 Analysis Results:`);
      console.log(`   Agent 1 (Reputation): ${result.agent_1_score}/100`);
      console.log(`   Agent 2 (NLP):        ${result.agent_2_score}/100`);
      console.log(`   Agent 3 (Mediator):   ${result.agent_3_score}/100`);
      console.log(`   ─────────────────────────────────`);
      console.log(`   COMPOSITE RISK SCORE: ${result.composite_risk_score}/100`);
      
      if (result.red_flags.length > 0) {
        console.log(`   🚩 Red Flags: ${result.red_flags.join(', ')}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw new Error(`Intelligence service analysis failed: ${error}`);
    }
  }

  /**
   * STATELESS ENDPOINT: Simulate a proposal
   * 
   * This is a PURE FUNCTION for the pre-submission tool.
   * It does NOT write to the database.
   * 
   * Use this to:
   * - Let proposers preview their score before submitting
   * - Give voters quick insights on proposals
   */
  async simulate(request: SimulateRequest): Promise<SimulateResponse> {
    console.log(`\n🎮 ══════════════════════════════════════════`);
    console.log(`🔮 SIMULATING PROPOSAL DRAFT`);
    console.log(`══════════════════════════════════════════════\n`);

    try {
      const response = await this.client.post<SimulateResponse>('/simulate', request);
      
      const result = response.data;
      
      console.log(`📊 Simulation Results:`);
      console.log(`   Success Probability: ${(result.success_probability * 100).toFixed(1)}%`);
      console.log(`   Risk Score: ${result.risk_score}/100`);
      console.log(`   Classification: ${result.classification}`);
      
      if (result.suggestions.length > 0) {
        console.log(`   💡 Suggestions:`);
        result.suggestions.forEach((s, i) => console.log(`      ${i + 1}. ${s}`));
      }

      return result;
    } catch (error) {
      console.error('❌ Simulation failed:', error);
      throw new Error(`Intelligence service simulation failed: ${error}`);
    }
  }
}

// Export singleton instance
export const intelligenceService = new IntelligenceService();
export default intelligenceService;
