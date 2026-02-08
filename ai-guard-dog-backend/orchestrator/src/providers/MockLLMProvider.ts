/**
 * MockLLMProvider - Testing provider that returns deterministic results
 * 
 * Use this for unit tests and development without API calls.
 */

import { 
  ILLMProvider, 
  LLMGenerateOptions, 
  LLMResponse 
} from '../interfaces/ILLMProvider';
import { RiskResult } from '../schemas/RiskSchemas';

export interface MockProviderConfig {
  /** Default risk score to return */
  defaultRiskScore?: number;
  /** Whether to simulate failures */
  shouldFail?: boolean;
  /** Custom response handler */
  responseHandler?: (prompt: string) => RiskResult;
  /** Simulated latency in ms */
  latencyMs?: number;
}

/**
 * Mock LLM Provider for testing
 */
export class MockLLMProvider implements ILLMProvider {
  readonly name = 'mock';
  private config: MockProviderConfig;

  constructor(config: MockProviderConfig = {}) {
    this.config = {
      defaultRiskScore: 25,
      shouldFail: false,
      latencyMs: 10,
      ...config,
    };
  }

  isAvailable(): boolean {
    return !this.config.shouldFail;
  }

  async generate(options: LLMGenerateOptions): Promise<LLMResponse> {
    // Simulate latency
    if (this.config.latencyMs) {
      await new Promise(resolve => setTimeout(resolve, this.config.latencyMs));
    }

    if (this.config.shouldFail) {
      throw new Error('Mock provider configured to fail');
    }

    const userMessage = options.messages.find(m => m.role === 'user')?.content || '';
    
    let result: RiskResult;
    
    if (this.config.responseHandler) {
      result = this.config.responseHandler(userMessage);
    } else {
      result = this.generateDefaultResponse(userMessage);
    }

    return {
      content: JSON.stringify(result),
      model: 'mock-model',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    };
  }

  async generateJSON<T>(options: LLMGenerateOptions): Promise<T> {
    const response = await this.generate(options);
    return JSON.parse(response.content) as T;
  }

  private generateDefaultResponse(text: string): RiskResult {
    const textLower = text.toLowerCase();
    
    // Simple heuristic-based mock response
    let riskScore = this.config.defaultRiskScore!;
    const threatCategories: string[] = [];
    const flaggedReasons: string[] = [];

    // Detect dangerous patterns
    if (textLower.includes('urgent') || textLower.includes('immediately')) {
      riskScore += 20;
      threatCategories.push('urgency_tactic');
      flaggedReasons.push('Uses urgency language');
    }
    
    if (textLower.includes('trust me') || textLower.includes('guaranteed')) {
      riskScore += 25;
      threatCategories.push('social_engineering');
      flaggedReasons.push('Uses manipulative trust language');
    }
    
    if (textLower.includes('private') || textLower.includes('secret')) {
      riskScore += 15;
      threatCategories.push('suspicious_secrecy');
      flaggedReasons.push('Contains secrecy indicators');
    }

    if (/\d+%.*return|profit|gains/i.test(text)) {
      riskScore += 30;
      threatCategories.push('financial_exploitation');
      flaggedReasons.push('Promises unrealistic returns');
    }

    riskScore = Math.min(100, riskScore);

    return {
      risk_score: riskScore,
      is_safe: riskScore <= 30,
      flagged_reason: flaggedReasons.length > 0 
        ? flaggedReasons.join('. ') 
        : 'No significant risks detected',
      confidence: 0.85,
      threat_categories: threatCategories.length > 0 ? threatCategories : ['none'],
      recommendations: riskScore > 30 
        ? ['Requires human review', 'Verify proposer identity']
        : ['Safe to proceed'],
    };
  }

  /**
   * Configure the mock to return specific results
   */
  setConfig(config: Partial<MockProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
