/**
 * ScoutAgent - NLP Scout Layer for AI Guard DAO
 * 
 * Production-grade implementation of the First Agent (Scout Layer).
 * Uses Llama 4 Scout 17B model for proposal risk assessment.
 * 
 * Features:
 * - Abstracted LLM layer (provider-agnostic)
 * - Strict JSON schema validation with Zod
 * - Robust async error handling with typed errors
 * - Fallback safe state on failures
 * - Configurable thresholds and models
 */

import { ILLMProvider } from '../interfaces/ILLMProvider';
import { 
  RiskResult, 
  AssessmentResult,
  ProposalInput,
  ProposalInputSchema,
  validateRiskResult,
  safeValidateRiskResult,
  FALLBACK_RISK_RESULT,
} from '../schemas/RiskSchemas';
import { 
  AgentError, 
  AssessmentError, 
  ValidationError 
} from '../errors/AgentErrors';

/**
 * Configuration options for ScoutAgent
 */
export interface ScoutAgentConfig {
  /** LLM model to use for assessment */
  model?: string;
  /** Temperature for LLM inference (lower = more deterministic) */
  temperature?: number;
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Risk score threshold for safe/unsafe determination */
  safeThreshold?: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

const DEFAULT_CONFIG: Required<ScoutAgentConfig> = {
  model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  temperature: 0.1,
  maxTokens: 1024,
  safeThreshold: 30,
  verbose: false,
};

/**
 * System prompt for the Scout Agent
 * Instructs the model to analyze proposals for social engineering and hostility
 */
const SCOUT_SYSTEM_PROMPT = `You are the NLP Scout for AI Guard DAO, a security layer protecting decentralized governance.

Your mission is to analyze governance proposals and detect:
1. **Social Engineering**: Manipulation, urgency tactics, emotional appeals, authority exploitation
2. **Hostility/Threats**: Aggressive language, intimidation, coercion
3. **Deceptive Patterns**: Misleading claims, hidden agendas, obfuscated terms
4. **Financial Exploitation**: Unreasonable fund requests, suspicious recipients, pump-and-dump signals
5. **Governance Attacks**: Voting manipulation, quorum gaming, proposal spam

RESPONSE FORMAT (Strict JSON):
{
  "risk_score": <number 0-100>,
  "is_safe": <boolean>,
  "flagged_reason": "<string explaining concerns or empty if safe>",
  "confidence": <number 0-1>,
  "threat_categories": ["<category1>", "<category2>"],
  "recommendations": ["<action1>", "<action2>"]
}

SCORING GUIDELINES:
- 0-20: Safe, routine governance
- 21-40: Minor concerns, proceed with caution
- 41-60: Moderate risk, requires review
- 61-80: High risk, recommend rejection
- 81-100: Critical threat, immediate escalation

Be objective, factual, and deterministic. When uncertain, err on the side of caution.
Return ONLY valid JSON, no additional text.`;

/**
 * ScoutAgent - First layer security analysis for DAO proposals
 */
export class ScoutAgent {
  readonly name = 'ScoutAgent';
  private readonly provider: ILLMProvider;
  private readonly config: Required<ScoutAgentConfig>;

  constructor(provider: ILLMProvider, config: ScoutAgentConfig = {}) {
    this.provider = provider;
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.provider.isAvailable()) {
      console.warn(
        `[${this.name}] Warning: LLM provider "${provider.name}" is not available. ` +
        'Agent will return fallback results.'
      );
    }

    if (this.config.verbose) {
      console.log(`[${this.name}] Initialized with provider: ${provider.name}`);
      console.log(`[${this.name}] Model: ${this.config.model}`);
    }
  }

  /**
   * Assess a proposal for security risks
   * 
   * @param text - The proposal text to analyze
   * @returns Promise<RiskResult> - Deterministic risk assessment
   * @throws AssessmentError - If assessment fails and no fallback
   */
  async assessProposal(text: string): Promise<RiskResult> {
    const startTime = Date.now();
    
    // Validate input
    if (!text || text.trim().length === 0) {
      throw new ValidationError(
        'Proposal text cannot be empty',
        ['text: Required field is empty']
      );
    }

    // Check provider availability
    if (!this.provider.isAvailable()) {
      this.log('Provider unavailable, returning fallback');
      return this.createFallbackResult('LLM provider not available');
    }

    try {
      // Call LLM with strict JSON response format
      const rawResult = await this.provider.generateJSON<unknown>({
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        responseFormat: 'json',
        messages: [
          { role: 'system', content: SCOUT_SYSTEM_PROMPT },
          { role: 'user', content: this.formatProposalPrompt(text) },
        ],
      });

      // Validate response against schema
      const validation = safeValidateRiskResult(rawResult);
      
      if (!validation.success) {
        this.log(`Schema validation failed: ${validation.errors?.join(', ')}`);
        return this.createFallbackResult(
          `Invalid response format: ${validation.errors?.join(', ')}`
        );
      }

      const result = validation.data!;
      
      // Apply safe threshold override
      if (result.risk_score <= this.config.safeThreshold && !result.is_safe) {
        result.is_safe = true;
      } else if (result.risk_score > this.config.safeThreshold && result.is_safe) {
        result.is_safe = false;
      }

      const latencyMs = Date.now() - startTime;
      this.log(`Assessment complete in ${latencyMs}ms - Risk: ${result.risk_score}`);
      
      return result;

    } catch (error) {
      this.log(`Assessment error: ${error instanceof Error ? error.message : 'Unknown'}`);
      
      // Return fallback on any error
      return this.createFallbackResult(
        error instanceof Error ? error.message : 'Unknown assessment error'
      );
    }
  }

  /**
   * Assess a structured proposal input
   * Returns full result with metadata
   */
  async assessProposalFull(input: ProposalInput): Promise<AssessmentResult> {
    const startTime = Date.now();
    
    // Validate input structure
    const validatedInput = ProposalInputSchema.parse(input);
    
    // Build proposal text
    const proposalText = this.buildProposalText(validatedInput);
    
    let assessment: RiskResult;
    let fallbackUsed = false;

    try {
      assessment = await this.assessProposal(proposalText);
    } catch (error) {
      assessment = this.createFallbackResult(
        error instanceof Error ? error.message : 'Assessment failed'
      );
      fallbackUsed = true;
    }

    return {
      proposalId: validatedInput.id,
      assessment,
      metadata: {
        model: this.config.model,
        provider: this.provider.name,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        fallbackUsed,
      },
    };
  }

  /**
   * Batch assess multiple proposals
   */
  async assessProposalsBatch(
    proposals: ProposalInput[]
  ): Promise<AssessmentResult[]> {
    return Promise.all(
      proposals.map(p => this.assessProposalFull(p))
    );
  }

  /**
   * Quick check if a proposal is likely safe (fast path)
   */
  async isProposalSafe(text: string): Promise<boolean> {
    const result = await this.assessProposal(text);
    return result.is_safe;
  }

  /**
   * Format the proposal for the LLM prompt
   */
  private formatProposalPrompt(text: string): string {
    return `Analyze the following DAO governance proposal for security risks:

---
PROPOSAL TEXT:
${text}
---

Provide your risk assessment as a JSON object.`;
  }

  /**
   * Build proposal text from structured input
   */
  private buildProposalText(input: ProposalInput): string {
    const parts: string[] = [];
    
    if (input.title) {
      parts.push(`Title: ${input.title}`);
    }
    if (input.proposer) {
      parts.push(`Proposer: ${input.proposer}`);
    }
    parts.push(`Description:\n${input.description}`);
    
    return parts.join('\n\n');
  }

  /**
   * Create a fallback result when assessment fails
   */
  private createFallbackResult(reason: string): RiskResult {
    return {
      ...FALLBACK_RISK_RESULT,
      flagged_reason: `Assessment failed: ${reason}. Manual review recommended.`,
    };
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[${this.name}] ${message}`);
    }
  }
}
