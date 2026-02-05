/**
 * Toxicity detection metric (LLM-based)
 *
 * Detects potentially toxic, harmful, or inappropriate content.
 * Uses LLM evaluation for nuanced toxicity detection.
 */

import type { MetricConfig, MetricOutput } from "../../core/types.js";
import { requireLLMClient } from "../llm/client.js";
import { fillPrompt, parseJSONResponse, createLLMError, normalizeScore } from "../llm/utils.js";
import {
  TOXICITY_PER_ROW_PROMPT,
  TOXICITY_BATCH_PROMPT,
  type ToxicityResponse,
  type ToxicityBatchResponse,
} from "../llm/prompts/toxicity.js";

/**
 * Configuration for toxicity metric
 */
export interface ToxicityConfig extends MetricConfig {
  /** Model outputs to evaluate */
  outputs: Array<{ id: string; output: string }>;
}

/**
 * Detects potential toxicity in outputs.
 *
 * This metric requires an LLM client. Set one globally with setLLMClient()
 * or pass llmClient in the config.
 *
 * @example
 * ```ts
 * import { setLLMClient, toxicity } from "evalsense/metrics";
 *
 * setLLMClient({ async complete(prompt) { ... } });
 *
 * const results = await toxicity({
 *   outputs: [{ id: "1", output: "This is a friendly message." }]
 * });
 * ```
 */
export async function toxicity(config: ToxicityConfig): Promise<MetricOutput[]> {
  const { outputs, llmClient, evaluationMode = "per-row", customPrompt } = config;

  // Validate LLM client
  const client = requireLLMClient(llmClient, "toxicity");

  // Route to evaluation mode
  if (evaluationMode === "batch") {
    return evaluateBatch(client, outputs, customPrompt);
  } else {
    return evaluatePerRow(client, outputs, customPrompt);
  }
}

/**
 * Per-row evaluation: Call LLM for each output individually
 */
async function evaluatePerRow(
  client: ReturnType<typeof requireLLMClient>,
  outputs: Array<{ id: string; output: string }>,
  customPrompt?: string
): Promise<MetricOutput[]> {
  const prompt = customPrompt ?? TOXICITY_PER_ROW_PROMPT;

  return Promise.all(
    outputs.map(async (output) => {
      const filledPrompt = fillPrompt(prompt, {
        output: output.output,
      });

      try {
        if (client.completeStructured) {
          const result = await client.completeStructured<ToxicityResponse>(filledPrompt, {
            type: "object",
            properties: {
              score: { type: "number" },
              categories: { type: "array", items: { type: "string" } },
              severity: { type: "string", enum: ["none", "mild", "moderate", "severe"] },
              reasoning: { type: "string" },
            },
            required: ["score", "categories", "severity", "reasoning"],
          });

          return {
            id: output.id,
            metric: "toxicity",
            score: normalizeScore(result.score),
            label: result.severity,
            reasoning: result.reasoning,
            evaluationMode: "per-row" as const,
          };
        } else {
          const response = await client.complete(filledPrompt);
          const parsed = parseJSONResponse<ToxicityResponse>(response);

          return {
            id: output.id,
            metric: "toxicity",
            score: normalizeScore(parsed.score),
            label: parsed.severity,
            reasoning: parsed.reasoning,
            evaluationMode: "per-row" as const,
          };
        }
      } catch (error) {
        throw createLLMError("toxicity", "Per-row LLM evaluation", error, { id: output.id });
      }
    })
  );
}

/**
 * Batch evaluation: Call LLM once with all outputs
 */
async function evaluateBatch(
  client: ReturnType<typeof requireLLMClient>,
  outputs: Array<{ id: string; output: string }>,
  customPrompt?: string
): Promise<MetricOutput[]> {
  const prompt = customPrompt ?? TOXICITY_BATCH_PROMPT;

  // Build batch input
  const batchInput = outputs.map((output) => ({
    id: output.id,
    output: output.output,
  }));

  const filledPrompt = fillPrompt(prompt, {
    items: JSON.stringify(batchInput, null, 2),
  });

  try {
    let results: ToxicityBatchResponse[];

    if (client.completeStructured) {
      results = await client.completeStructured<ToxicityBatchResponse[]>(filledPrompt, {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            score: { type: "number" },
            categories: { type: "array", items: { type: "string" } },
            severity: { type: "string", enum: ["none", "mild", "moderate", "severe"] },
            reasoning: { type: "string" },
          },
          required: ["id", "score", "categories", "severity", "reasoning"],
        },
      });
    } else {
      const response = await client.complete(filledPrompt);
      results = parseJSONResponse<ToxicityBatchResponse[]>(response);
    }

    if (!Array.isArray(results)) {
      throw new Error("LLM response is not an array");
    }

    if (results.length !== outputs.length) {
      throw new Error(
        `Expected ${outputs.length} results, got ${results.length}. ` +
          `Batch evaluation must return one result per input.`
      );
    }

    return outputs.map((output) => {
      const result = results.find((r) => r.id === output.id);
      if (!result) {
        throw new Error(`Missing result for output ${output.id} in batch response`);
      }

      return {
        id: output.id,
        metric: "toxicity",
        score: normalizeScore(result.score),
        label: result.severity,
        reasoning: result.reasoning,
        evaluationMode: "batch" as const,
      };
    });
  } catch (error) {
    throw createLLMError("toxicity", "Batch LLM evaluation", error);
  }
}
