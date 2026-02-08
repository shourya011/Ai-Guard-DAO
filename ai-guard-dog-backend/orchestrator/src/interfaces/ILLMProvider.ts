/**
 * ILLMProvider - Abstract interface for LLM providers
 * 
 * Allows swapping between Groq, TEE, Local, or any other LLM provider
 * without modifying the agent logic.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMGenerateOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Interface for LLM providers
 * Implement this interface to add new LLM backends (Groq, OpenAI, TEE, Local, etc.)
 */
export interface ILLMProvider {
  readonly name: string;
  
  /**
   * Generate a completion from the LLM
   */
  generate(options: LLMGenerateOptions): Promise<LLMResponse>;
  
  /**
   * Generate and parse JSON response with validation
   */
  generateJSON<T>(options: LLMGenerateOptions): Promise<T>;
  
  /**
   * Check if the provider is available/configured
   */
  isAvailable(): boolean;
}
