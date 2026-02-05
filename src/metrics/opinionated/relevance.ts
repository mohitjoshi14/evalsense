/**
 * Relevance metric (LLM-based)
 *
 * Measures how relevant the output is to the input query.
 * Uses LLM evaluation for accurate relevance assessment.
 */

import type { MetricConfig, MetricOutput } from "../../core/types.js";
import { requireLLMClient } from "../llm/client.js";
import { fillPrompt, parseJSONResponse, createLLMError, normalizeScore } from "../llm/utils.js";
import {
  RELEVANCE_PER_ROW_PROMPT,
  RELEVANCE_BATCH_PROMPT,
  type RelevanceResponse,
  type RelevanceBatchResponse,
} from "../llm/prompts/relevance.js";

/**
 * Configuration for relevance metric
 */
export interface RelevanceConfig extends MetricConfig {
  /** Model outputs to evaluate */
  outputs: Array<{ id: string; output: string }>;
  /** Queries that the outputs should be relevant to */
  query: string[];
}

/**
 * Measures the relevance of outputs to their queries.
 *
 * This metric requires an LLM client. Set one globally with setLLMClient()
 * or pass llmClient in the config.
 *
 * @example
 * ```ts
 * import { setLLMClient, relevance } from "evalsense/metrics";
 *
 * setLLMClient({ async complete(prompt) { ... } });
 *
 * const results = await relevance({
 *   outputs: [{ id: "1", output: "Paris is the capital of France." }],
 *   query: ["What is the capital of France?"]
 * });
 * ```
 */
export async function relevance(config: RelevanceConfig): Promise<MetricOutput[]> {
  const { outputs, query, llmClient, evaluationMode = "per-row", customPrompt } = config;

  // Validate LLM client
  const client = requireLLMClient(llmClient, "relevance");

  // Validate inputs
  if (outputs.length !== query.length) {
    throw new Error(
      `relevance(): outputs and query arrays must have the same length. ` +
        `Got ${outputs.length} outputs and ${query.length} queries.`
    );
  }

  // Route to evaluation mode
  if (evaluationMode === "batch") {
    return evaluateBatch(client, outputs, query, customPrompt);
  } else {
    return evaluatePerRow(client, outputs, query, customPrompt);
  }
}

/**
 * Per-row evaluation: Call LLM for each output individually
 */
async function evaluatePerRow(
  client: ReturnType<typeof requireLLMClient>,
  outputs: Array<{ id: string; output: string }>,
  query: string[],
  customPrompt?: string
): Promise<MetricOutput[]> {
  const prompt = customPrompt ?? RELEVANCE_PER_ROW_PROMPT;

  return Promise.all(
    outputs.map(async (output, index) => {
      const q = query[index] ?? "";
      const filledPrompt = fillPrompt(prompt, {
        query: q,
        output: output.output,
      });

      try {
        if (client.completeStructured) {
          const result = await client.completeStructured<RelevanceResponse>(filledPrompt, {
            type: "object",
            properties: {
              score: { type: "number" },
              relevant_parts: { type: "array", items: { type: "string" } },
              irrelevant_parts: { type: "array", items: { type: "string" } },
              reasoning: { type: "string" },
            },
            required: ["score", "relevant_parts", "irrelevant_parts", "reasoning"],
          });

          return {
            id: output.id,
            metric: "relevance",
            score: normalizeScore(result.score),
            label: result.score >= 0.7 ? "high" : result.score >= 0.4 ? "medium" : "low",
            reasoning: result.reasoning,
            evaluationMode: "per-row" as const,
          };
        } else {
          const response = await client.complete(filledPrompt);
          const parsed = parseJSONResponse<RelevanceResponse>(response);

          return {
            id: output.id,
            metric: "relevance",
            score: normalizeScore(parsed.score),
            label: parsed.score >= 0.7 ? "high" : parsed.score >= 0.4 ? "medium" : "low",
            reasoning: parsed.reasoning,
            evaluationMode: "per-row" as const,
          };
        }
      } catch (error) {
        throw createLLMError("relevance", "Per-row LLM evaluation", error, { id: output.id });
      }
    })
  );
}

/**
 * Batch evaluation: Call LLM once with all query-output pairs
 */
async function evaluateBatch(
  client: ReturnType<typeof requireLLMClient>,
  outputs: Array<{ id: string; output: string }>,
  query: string[],
  customPrompt?: string
): Promise<MetricOutput[]> {
  const prompt = customPrompt ?? RELEVANCE_BATCH_PROMPT;

  // Build batch input
  const batchInput = outputs.map((output, index) => ({
    id: output.id,
    query: query[index] ?? "",
    output: output.output,
  }));

  const filledPrompt = fillPrompt(prompt, {
    items: JSON.stringify(batchInput, null, 2),
  });

  try {
    let results: RelevanceBatchResponse[];

    if (client.completeStructured) {
      results = await client.completeStructured<RelevanceBatchResponse[]>(filledPrompt, {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            score: { type: "number" },
            relevant_parts: { type: "array", items: { type: "string" } },
            irrelevant_parts: { type: "array", items: { type: "string" } },
            reasoning: { type: "string" },
          },
          required: ["id", "score", "relevant_parts", "irrelevant_parts", "reasoning"],
        },
      });
    } else {
      const response = await client.complete(filledPrompt);
      results = parseJSONResponse<RelevanceBatchResponse[]>(response);
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
        metric: "relevance",
        score: normalizeScore(result.score),
        label: result.score >= 0.7 ? "high" : result.score >= 0.4 ? "medium" : "low",
        reasoning: result.reasoning,
        evaluationMode: "batch" as const,
      };
    });
  } catch (error) {
    throw createLLMError("relevance", "Batch LLM evaluation", error);
  }
}
