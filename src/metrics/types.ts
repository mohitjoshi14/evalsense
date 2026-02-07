/**
 * Type definitions for the LLM metric factory
 *
 * Provides a declarative API for creating LLM-based evaluation metrics
 * with unified record input (no more parallel arrays).
 */

import type { LLMClient, MetricOutput, JSONSchema } from "../core/types.js";

/**
 * A record with id and arbitrary fields for evaluation
 *
 * All LLM metrics expect unified records where each record contains
 * all fields needed for evaluation (output, context, query, etc.).
 *
 * @example
 * ```ts
 * // Hallucination metric (needs output + context)
 * const records: EvalRecord[] = [
 *   { id: "1", output: "Paris has 50M people", context: "Paris has 2.1M residents" },
 *   { id: "2", output: "Berlin is Germany's capital", context: "Berlin is the capital of Germany" },
 * ];
 *
 * // Toxicity metric (needs only output)
 * const records: EvalRecord[] = [
 *   { id: "1", output: "Thank you for your question" },
 * ];
 * ```
 */
export interface EvalRecord {
  id: string;
  [field: string]: unknown;
}

/**
 * Input field specification for createLLMMetric
 *
 * Can be a string (required field) or an object with explicit required flag.
 *
 * @example
 * ```ts
 * // Required fields
 * inputs: ["output", "context"]
 *
 * // Optional context field
 * inputs: ["output", { name: "context", required: false }]
 * ```
 */
export type InputSpec = string | { name: string; required: boolean };

/**
 * Response field type for JSON schema generation
 */
export type ResponseFieldType = "string" | "number" | "boolean" | "array";

/**
 * Label threshold configuration
 *
 * Sorted by min descending at runtime to find matching label.
 *
 * @example
 * ```ts
 * labels: [
 *   { min: 0.7, label: "high" },
 *   { min: 0.4, label: "medium" },
 *   { min: 0, label: "low" },
 * ]
 * ```
 */
export interface LabelThreshold {
  min: number;
  label: string;
}

/**
 * Configuration for creating an LLM-based metric
 *
 * This declarative configuration replaces 90+ lines of boilerplate
 * with ~15 lines of configuration.
 *
 * @example
 * ```ts
 * const answerCorrectness = createLLMMetric({
 *   name: "answer-correctness",
 *   inputs: ["output", "reference"],
 *   prompt: ANSWER_CORRECTNESS_PROMPT,
 *   responseFields: { score: "number", reasoning: "string" },
 *   labels: [
 *     { min: 0.8, label: "correct" },
 *     { min: 0.5, label: "partial" },
 *     { min: 0, label: "incorrect" },
 *   ],
 * });
 * ```
 */
export interface LLMMetricConfig {
  /**
   * Metric name - used in MetricOutput and error messages
   */
  name: string;

  /**
   * Field names to extract from records for prompt filling.
   *
   * - string: required field (e.g., "output")
   * - { name: string, required: boolean }: explicit requirement
   *
   * The "output" field is always required and should be first.
   *
   * @example
   * ```ts
   * // Toxicity: only output needed
   * inputs: ["output"]
   *
   * // Hallucination: output + context
   * inputs: ["output", "context"]
   *
   * // Relevance: output + query
   * inputs: ["output", "query"]
   *
   * // Faithfulness: output + source
   * inputs: ["output", "source"]
   *
   * // Optional context
   * inputs: ["output", { name: "context", required: false }]
   * ```
   */
  inputs: InputSpec[];

  /**
   * Prompt template with {variable} placeholders.
   *
   * Variables are filled from record fields using fillPrompt().
   * Use the same names as specified in `inputs`.
   *
   * @example
   * ```ts
   * prompt: `
   * Context: {context}
   * Output: {output}
   *
   * Evaluate for hallucinations...
   * `
   * ```
   */
  prompt: string;

  /**
   * Optional batch prompt template.
   *
   * Uses {items} placeholder which receives JSON array of all records.
   * If not provided, batch mode falls back to per-row evaluation.
   */
  batchPrompt?: string;

  /**
   * Response fields and their types.
   *
   * Generates JSON schema for structured LLM outputs.
   * All fields listed here become required in the schema.
   *
   * @example
   * ```ts
   * responseFields: {
   *   score: "number",
   *   reasoning: "string",
   *   categories: "array",
   * }
   * ```
   */
  responseFields: Record<string, ResponseFieldType>;

  /**
   * Which response field to use as the primary score.
   *
   * @default "score"
   */
  scoreField?: string;

  /**
   * Optional label field from response to use directly.
   *
   * If specified, uses this field from LLM response as the label
   * instead of computing from score thresholds.
   *
   * @example
   * ```ts
   * // Toxicity uses "severity" field directly
   * labelField: "severity"
   * ```
   */
  labelField?: string;

  /**
   * Label thresholds for score-to-label conversion.
   *
   * Applied in descending min order. Ignored if labelField is set.
   *
   * @example
   * ```ts
   * labels: [
   *   { min: 0.7, label: "high" },
   *   { min: 0.4, label: "medium" },
   *   { min: 0, label: "low" },
   * ]
   * ```
   */
  labels?: LabelThreshold[];

  /**
   * Default evaluation mode for this metric.
   *
   * - "per-row": One LLM call per record (higher accuracy)
   * - "batch": Single LLM call for all records (lower cost)
   *
   * @default "per-row"
   */
  defaultMode?: "per-row" | "batch";
}

/**
 * Options for calling an LLM metric
 */
export interface LLMMetricOptions {
  /**
   * Override the default evaluation mode
   */
  evaluationMode?: "per-row" | "batch";

  /**
   * Override the global LLM client for this call
   */
  llmClient?: LLMClient;

  /**
   * Custom prompt template override
   */
  customPrompt?: string;
}

/**
 * The resulting metric function from createLLMMetric
 *
 * Takes unified records and returns MetricOutput array.
 *
 * @example
 * ```ts
 * const results = await hallucination([
 *   { id: "1", output: "Paris has 50M people", context: "Paris has 2.1M residents" },
 * ]);
 * ```
 */
export type LLMMetric = (
  records: EvalRecord[],
  options?: LLMMetricOptions
) => Promise<MetricOutput[]>;

/**
 * Internal evaluator configuration
 *
 * Used by evaluatePerRow and evaluateBatch
 */
export interface EvaluatorConfig {
  name: string;
  prompt: string;
  schema: JSONSchema;
  batchSchema: JSONSchema;
  scoreField: string;
  labelField?: string;
  labels?: LabelThreshold[];
  inputs: Array<{ name: string; required: boolean }>;
}
