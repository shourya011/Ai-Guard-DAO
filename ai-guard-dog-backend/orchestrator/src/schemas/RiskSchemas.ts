/**
 * Risk Assessment Schemas - Zod Validation
 * 
 * Strict schema definitions for Scout Agent risk assessments.
 * Ensures type safety and validates LLM responses.
 */

import { z } from 'zod';

/**
 * Risk result schema - enforces strict JSON structure from LLM
 */
export const RiskResultSchema = z.object({
  risk_score: z
    .number()
    .min(0)
    .max(100)
    .describe('Risk score from 0-100, where 100 is highest risk'),
  
  is_safe: z
    .boolean()
    .describe('Whether the proposal is considered safe'),
  
  flagged_reason: z
    .string()
    .describe('Explanation of why the proposal was flagged, or empty if safe'),
  
  // Optional extended fields
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Model confidence in the assessment (0-1)'),
  
  threat_categories: z
    .array(z.string())
    .optional()
    .describe('List of detected threat categories'),
  
  recommendations: z
    .array(z.string())
    .optional()
    .describe('Suggested actions for the DAO'),
});

export type RiskResult = z.infer<typeof RiskResultSchema>;

/**
 * Fallback safe state when assessment fails
 */
export const FALLBACK_RISK_RESULT: RiskResult = {
  risk_score: 50,
  is_safe: false,
  flagged_reason: 'Assessment failed - manual review recommended',
  confidence: 0,
  threat_categories: ['assessment_error'],
  recommendations: ['Manual review required', 'Do not auto-approve'],
};

/**
 * Proposal input schema
 */
export const ProposalInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().min(1, 'Proposal text cannot be empty'),
  proposer: z.string().optional(),
});

export type ProposalInput = z.infer<typeof ProposalInputSchema>;

/**
 * Full assessment result including metadata
 */
export const AssessmentResultSchema = z.object({
  proposalId: z.string().optional(),
  assessment: RiskResultSchema,
  metadata: z.object({
    model: z.string(),
    provider: z.string(),
    latencyMs: z.number(),
    timestamp: z.string(),
    fallbackUsed: z.boolean(),
  }),
});

export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;

/**
 * Validate and parse risk result from raw LLM response
 */
export function validateRiskResult(data: unknown): RiskResult {
  return RiskResultSchema.parse(data);
}

/**
 * Safe validation that returns errors instead of throwing
 */
export function safeValidateRiskResult(data: unknown): {
  success: boolean;
  data?: RiskResult;
  errors?: string[];
} {
  const result = RiskResultSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}
