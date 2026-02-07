/**
 * Factory function for creating LLM-based metrics
 *
 * Reduces metric definition from 90+ lines to ~15 lines with a declarative API.
 * Eliminates parallel array matching and provides unified record input.
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
 *
 * // Usage with unified records
 * const results = await answerCorrectness([
 *   { id: "1", output: "Paris", reference: "Paris is the capital" },
 * ]);
 * ```
 */

import type { JSONSchema } from "../core/types.js";
import type {
  LLMMetricConfig,
  LLMMetric,
  EvalRecord,
  InputSpec,
  EvaluatorConfig,
  ResponseFieldType,
} from "./types.js";
import { requireLLMClient, getDefaults } from "./client.js";
import { evaluatePerRow, evaluateBatch } from "./evaluators.js";

/**
 * Normalizes input specs to consistent object format
 */
function normalizeInputs(inputs: InputSpec[]): Array<{ name: string; required: boolean }> {
  return inputs.map((input) => {
    if (typeof input === "string") {
      return { name: input, required: true };
    }
    return input;
  });
}

/**
 * Maps response field type to JSON schema type
 */
function mapFieldType(type: ResponseFieldType): { type: string; items?: { type: string } } {
  switch (type) {
    case "array":
      return { type: "array", items: { type: "string" } };
    case "string":
    case "number":
    case "boolean":
      return { type };
    default:
      return { type: "string" };
  }
}

/**
 * Generates JSON schema for per-row responses
 */
function generateSchema(responseFields: Record<string, ResponseFieldType>): JSONSchema {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, type] of Object.entries(responseFields)) {
    properties[key] = mapFieldType(type);
    required.push(key);
  }

  return {
    type: "object",
    properties,
    required,
  };
}

/**
 * Generates JSON schema for batch responses
 */
function generateBatchSchema(responseFields: Record<string, ResponseFieldType>): JSONSchema {
  const itemProperties: Record<string, unknown> = {
    id: { type: "string" },
  };
  const required: string[] = ["id"];

  for (const [key, type] of Object.entries(responseFields)) {
    itemProperties[key] = mapFieldType(type);
    required.push(key);
  }

  return {
    type: "array",
    items: {
      type: "object",
      properties: itemProperties,
      required,
    },
  };
}

/**
 * Validates that required input fields exist in all records
 */
function validateInputFields(
  records: EvalRecord[],
  inputs: Array<{ name: string; required: boolean }>,
  metricName: string
): void {
  const requiredFields = inputs.filter((i) => i.required).map((i) => i.name);

  for (const record of records) {
    if (!record.id) {
      throw new Error(`${metricName}(): Record missing required 'id' field`);
    }

    for (const field of requiredFields) {
      if (record[field] === undefined) {
        throw new Error(`${metricName}(): Record ${record.id} missing required field '${field}'`);
      }
    }
  }
}

/**
 * Creates an LLM-based metric function
 *
 * This factory function eliminates boilerplate by:
 * - Handling LLM client validation
 * - Managing structured output with fallback to text parsing
 * - Normalizing scores to 0-1 range
 * - Converting scores to labels using thresholds
 * - Supporting both per-row and batch evaluation modes
 * - Providing consistent error handling
 *
 * @param config - Metric configuration
 * @returns A metric function that takes unified records
 *
 * @example
 * ```ts
 * // Create a custom LLM metric
 * const myMetric = createLLMMetric({
 *   name: "my-metric",
 *   inputs: ["output", "reference"],
 *   prompt: `
 *     Reference: {reference}
 *     Output: {output}
 *
 *     Evaluate the output against the reference...
 *   `,
 *   responseFields: { score: "number", reasoning: "string" },
 *   labels: [
 *     { min: 0.7, label: "good" },
 *     { min: 0.4, label: "fair" },
 *     { min: 0, label: "poor" },
 *   ],
 * });
 *
 * // Use with unified records
 * const results = await myMetric([
 *   { id: "1", output: "answer A", reference: "correct answer" },
 *   { id: "2", output: "answer B", reference: "expected B" },
 * ]);
 * ```
 */
export function createLLMMetric(config: LLMMetricConfig): LLMMetric {
  const {
    name,
    inputs,
    prompt,
    batchPrompt,
    responseFields,
    scoreField = "score",
    labelField,
    labels,
    defaultMode = "per-row",
  } = config;

  // Pre-process configuration
  const normalizedInputs = normalizeInputs(inputs);
  const schema = generateSchema(responseFields);
  const batchSchema = generateBatchSchema(responseFields);

  // Build evaluator config
  const evaluatorConfig: EvaluatorConfig = {
    name,
    prompt,
    schema,
    batchSchema,
    scoreField,
    labelField,
    labels,
    inputs: normalizedInputs,
  };

  // Return the metric function
  return async (records, options = {}) => {
    // Get global defaults and merge with options
    const globalDefaults = getDefaults();
    const {
      evaluationMode = globalDefaults.evaluationMode ?? defaultMode,
      llmClient,
      customPrompt,
    } = options;

    // Validate LLM client
    const client = requireLLMClient(llmClient, name);

    // Validate input fields
    validateInputFields(records, normalizedInputs, name);

    // Use custom prompt if provided
    const effectiveConfig = customPrompt
      ? { ...evaluatorConfig, prompt: customPrompt }
      : evaluatorConfig;

    // Route to evaluator
    if (evaluationMode === "batch" && batchPrompt) {
      return evaluateBatch(client, records, effectiveConfig, batchPrompt);
    }

    return evaluatePerRow(client, records, effectiveConfig);
  };
}
