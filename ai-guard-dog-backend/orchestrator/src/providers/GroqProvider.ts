/**
 * GroqProvider - LLM Provider implementation for Groq API
 * 
 * Uses Groq's ultra-fast inference for Llama models.
 * Implements ILLMProvider interface for swappable architecture.
 */

import Groq from 'groq-sdk';
import { 
  ILLMProvider, 
  LLMGenerateOptions, 
  LLMResponse 
} from '../interfaces/ILLMProvider';
import { LLMProviderError, LLMResponseParseError } from '../errors/AgentErrors';

export class GroqProvider implements ILLMProvider {
  readonly name = 'groq';
  private client: Groq | null = null;
  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY;
    
    if (this.apiKey) {
      this.client = new Groq({ apiKey: this.apiKey });
    }
  }

  isAvailable(): boolean {
    return this.client !== null && !!this.apiKey;
  }

  async generate(options: LLMGenerateOptions): Promise<LLMResponse> {
    if (!this.client) {
      throw new LLMProviderError(
        'Groq client not initialized. Please provide GROQ_API_KEY.',
        this.name
      );
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 1024,
        response_format: options.responseFormat === 'json' 
          ? { type: 'json_object' } 
          : undefined,
      });

      const content = completion.choices[0]?.message?.content;
      
      if (!content) {
        throw new LLMProviderError(
          'Empty response from Groq API',
          this.name
        );
      }

      return {
        content: content || '',
        model: completion.model || 'unknown',
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens || 0,
          completionTokens: completion.usage.completion_tokens || 0,
          totalTokens: completion.usage.total_tokens || 0,
        } : undefined,
      };
    } catch (error) {
      if (error instanceof LLMProviderError) {
        throw error;
      }
      
      const message = error instanceof Error ? error.message : 'Unknown Groq API error';
      throw new LLMProviderError(message, this.name, error);
    }
  }

  async generateJSON<T>(options: LLMGenerateOptions): Promise<T> {
    const response = await this.generate({
      ...options,
      responseFormat: 'json',
    });

    try {
      return JSON.parse(response.content) as T;
    } catch (error) {
      throw new LLMResponseParseError(
        'Failed to parse JSON response from Groq',
        response.content,
        error
      );
    }
  }
}
