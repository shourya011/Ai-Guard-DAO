/**
 * Custom Error Classes for AI Guard DAO Agents
 * 
 * Typed errors for proper error handling and recovery strategies.
 */

/**
 * Base error class for all agent-related errors
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public readonly agentName: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AgentError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Error thrown when LLM provider fails
 */
export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly providerName: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'LLMProviderError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Error thrown when LLM response cannot be parsed
 */
export class LLMResponseParseError extends Error {
  constructor(
    message: string,
    public readonly rawResponse: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'LLMResponseParseError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Error thrown when response validation fails (schema mismatch)
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: string[],
    public readonly receivedData?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Error thrown when agent assessment fails and returns fallback
 */
export class AssessmentError extends AgentError {
  constructor(
    message: string,
    agentName: string,
    public readonly fallbackUsed: boolean = false,
    cause?: unknown
  ) {
    super(message, agentName, cause);
    this.name = 'AssessmentError';
  }
}
