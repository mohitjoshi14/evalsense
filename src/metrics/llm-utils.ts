/**
 * Utilities for LLM-based metric evaluation
 *
 * Provides helpers for prompt templating, response parsing, validation, and error handling.
 */

import type { JSONSchema } from "../core/types.js";

/**
 * Fills a prompt template with variables
 *
 * @example
 * ```ts
 * const prompt = fillPrompt(
 *   "Context: {context}\nOutput: {output}",
 *   { context: "Paris is the capital", output: "France's capital is Paris" }
 * );
 * ```
 */
export function fillPrompt(template: string, variables: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(variables)) {
    // Replace all occurrences of {key} with value
    filled = filled.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return filled;
}

/**
 * Parses a JSON response from an LLM, with fallback handling
 *
 * Handles:
 * - Plain JSON strings
 * - JSON wrapped in markdown code blocks
 * - Malformed JSON with helpful error messages
 *
 * @example
 * ```ts
 * const result = parseJSONResponse<{ score: number }>(llmResponse);
 * ```
 */
export function parseJSONResponse<T>(response: string): T {
  try {
    // First, try to extract JSON from markdown code blocks
    const codeBlockMatch = response.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
    const jsonStr = codeBlockMatch?.[1] ?? response;

    // Parse the JSON
    return JSON.parse(jsonStr.trim()) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : String(error)}\n` +
        `Response: ${response.substring(0, 200)}...`
    );
  }
}

/**
 * Validates that a parsed JSON response has required fields
 *
 * @example
 * ```ts
 * validateResponse(result, ["score", "reasoning"], "hallucination");
 * ```
 */
export function validateResponse(
  response: unknown,
  requiredFields: string[],
  metricName: string
): void {
  if (typeof response !== "object" || response === null) {
    throw new Error(`${metricName}(): LLM response is not an object`);
  }

  const obj = response as Record<string, unknown>;
  const missingFields = requiredFields.filter((field) => !(field in obj));

  if (missingFields.length > 0) {
    throw new Error(
      `${metricName}(): LLM response missing required fields: ${missingFields.join(", ")}`
    );
  }
}

/**
 * Normalizes a score to ensure it's in the 0-1 range
 */
export function normalizeScore(score: number): number {
  return Math.max(0, Math.min(1, score));
}

/**
 * Extracts a score from various formats (number, string, object with score field)
 */
export function extractScore(value: unknown, defaultScore = 0.5): number {
  if (typeof value === "number") {
    return normalizeScore(value);
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultScore : normalizeScore(parsed);
  }

  if (typeof value === "object" && value !== null && "score" in value) {
    return extractScore((value as { score: unknown }).score, defaultScore);
  }

  return defaultScore;
}

/**
 * Creates a JSON schema for structured LLM outputs
 *
 * @example
 * ```ts
 * const schema = createJSONSchema({
 *   score: "number",
 *   reasoning: "string"
 * });
 * ```
 */
export function createJSONSchema(
  properties: Record<string, string>,
  required?: string[]
): JSONSchema {
  const schemaProperties: Record<string, { type: string }> = {};

  for (const [key, type] of Object.entries(properties)) {
    schemaProperties[key] = { type };
  }

  return {
    type: "object",
    properties: schemaProperties,
    required: required ?? Object.keys(properties),
  };
}

/**
 * Batches an array of items into chunks
 *
 * Useful for batch evaluation mode to control batch size.
 */
export function batchItems<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Creates a consistent error message for LLM metric failures
 */
export function createLLMError(
  metricName: string,
  operation: string,
  error: unknown,
  context?: { id?: string; index?: number }
): Error {
  const contextStr = context?.id
    ? ` for output ${context.id}`
    : context?.index !== undefined
      ? ` for output at index ${context.index}`
      : "";

  const errorMsg =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);

  return new Error(`${metricName}(): ${operation} failed${contextStr}: ${errorMsg}`);
}

/**
 * Waits for a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}
