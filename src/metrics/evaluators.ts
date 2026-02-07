/**
 * Generic evaluators for LLM-based metrics
 *
 * Provides per-row and batch evaluation modes that eliminate
 * boilerplate code from individual metric implementations.
 */

import type { LLMClient, MetricOutput } from "../core/types.js";
import type { EvalRecord, EvaluatorConfig } from "./types.js";
import { fillPrompt, parseJSONResponse, createLLMError, normalizeScore } from "./llm-utils.js";
import { scoreToLabel } from "./utils.js";

/**
 * Extracts string value from a record field
 */
function getFieldValue(record: EvalRecord, field: string): string {
  const value = record[field];
  if (value === undefined || value === null) {
    return "";
  }
  return typeof value === "string" ? value : String(value);
}

/**
 * Computes label from score using thresholds, or from response field
 */
function computeLabel(
  response: Record<string, unknown>,
  score: number,
  config: EvaluatorConfig
): string {
  // If labelField specified, use that directly from response
  if (config.labelField && response[config.labelField] !== undefined) {
    return String(response[config.labelField]);
  }

  // Otherwise use score thresholds
  if (config.labels && config.labels.length > 0) {
    return scoreToLabel(score, config.labels);
  }

  // Default binary labeling
  return score >= 0.5 ? "high" : "low";
}

/**
 * Builds prompt variables from a record using configured inputs
 */
function buildPromptVariables(
  record: EvalRecord,
  inputs: Array<{ name: string; required: boolean }>
): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const input of inputs) {
    variables[input.name] = getFieldValue(record, input.name);
  }
  return variables;
}

/**
 * Per-row evaluation: One LLM call per record
 *
 * Higher accuracy (each evaluation is independent).
 * Higher cost and latency (N API calls for N records).
 *
 * @example
 * ```ts
 * const results = await evaluatePerRow(client, records, {
 *   name: "hallucination",
 *   prompt: HALLUCINATION_PROMPT,
 *   schema: { ... },
 *   batchSchema: { ... },
 *   scoreField: "score",
 *   labels: [{ min: 0.5, label: "true" }, { min: 0, label: "false" }],
 *   inputs: [{ name: "output", required: true }, { name: "context", required: true }],
 * });
 * ```
 */
export async function evaluatePerRow(
  client: LLMClient,
  records: EvalRecord[],
  config: EvaluatorConfig
): Promise<MetricOutput[]> {
  return Promise.all(
    records.map(async (record) => {
      const variables = buildPromptVariables(record, config.inputs);
      const filledPrompt = fillPrompt(config.prompt, variables);

      try {
        let response: Record<string, unknown>;

        // Try structured output if available
        if (client.completeStructured) {
          response = await client.completeStructured<Record<string, unknown>>(
            filledPrompt,
            config.schema
          );
        } else {
          // Fallback to text parsing
          const textResponse = await client.complete(filledPrompt);
          response = parseJSONResponse<Record<string, unknown>>(textResponse);
        }

        const rawScore = response[config.scoreField];
        const score = normalizeScore(
          typeof rawScore === "number" ? rawScore : parseFloat(String(rawScore ?? 0.5))
        );
        const label = computeLabel(response, score, config);

        return {
          id: record.id,
          metric: config.name,
          score,
          label,
          reasoning: response.reasoning as string | undefined,
          evaluationMode: "per-row" as const,
        };
      } catch (error) {
        throw createLLMError(config.name, "Per-row LLM evaluation", error, { id: record.id });
      }
    })
  );
}

/**
 * Batch evaluation: Single LLM call for all records
 *
 * Lower cost (1 API call total).
 * Potentially less accurate (LLM sees all outputs at once).
 *
 * @example
 * ```ts
 * const results = await evaluateBatch(client, records, {
 *   name: "hallucination",
 *   prompt: HALLUCINATION_BATCH_PROMPT,
 *   schema: { ... },
 *   batchSchema: { ... },
 *   scoreField: "score",
 *   labels: [...],
 *   inputs: [...],
 * });
 * ```
 */
export async function evaluateBatch(
  client: LLMClient,
  records: EvalRecord[],
  config: EvaluatorConfig,
  batchPrompt: string
): Promise<MetricOutput[]> {
  // Build batch input array with only the relevant fields
  const batchInput = records.map((record) => {
    const item: Record<string, unknown> = { id: record.id };
    for (const input of config.inputs) {
      item[input.name] = getFieldValue(record, input.name);
    }
    return item;
  });

  const filledPrompt = fillPrompt(batchPrompt, {
    items: JSON.stringify(batchInput, null, 2),
  });

  try {
    let results: Array<Record<string, unknown>>;

    // Try structured output if available
    if (client.completeStructured) {
      results = await client.completeStructured<Array<Record<string, unknown>>>(
        filledPrompt,
        config.batchSchema
      );
    } else {
      // Fallback to text parsing
      const textResponse = await client.complete(filledPrompt);
      results = parseJSONResponse<Array<Record<string, unknown>>>(textResponse);
    }

    // Validate response
    if (!Array.isArray(results)) {
      throw new Error("LLM response is not an array");
    }

    if (results.length !== records.length) {
      throw new Error(
        `Expected ${records.length} results, got ${results.length}. ` +
          `Batch evaluation must return one result per input.`
      );
    }

    // Map results back to records
    return records.map((record) => {
      const result = results.find((r) => r.id === record.id);
      if (!result) {
        throw new Error(`Missing result for record ${record.id} in batch response`);
      }

      const rawScore = result[config.scoreField];
      const score = normalizeScore(
        typeof rawScore === "number" ? rawScore : parseFloat(String(rawScore ?? 0.5))
      );
      const label = computeLabel(result, score, config);

      return {
        id: record.id,
        metric: config.name,
        score,
        label,
        reasoning: result.reasoning as string | undefined,
        evaluationMode: "batch" as const,
      };
    });
  } catch (error) {
    throw createLLMError(config.name, "Batch LLM evaluation", error);
  }
}
