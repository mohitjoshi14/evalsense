/**
 * Faithfulness metric (LLM-based)
 *
 * Measures how faithful the output is to the source material.
 * Uses LLM evaluation to detect contradictions and misrepresentations.
 */

import type { MetricConfig, MetricOutput } from "../../core/types.js";
import { requireLLMClient } from "../llm/client.js";
import { fillPrompt, parseJSONResponse, createLLMError, normalizeScore } from "../llm/utils.js";
import {
  FAITHFULNESS_PER_ROW_PROMPT,
  FAITHFULNESS_BATCH_PROMPT,
  type FaithfulnessResponse,
  type FaithfulnessBatchResponse,
} from "../llm/prompts/faithfulness.js";

/**
 * Configuration for faithfulness metric
 */
export interface FaithfulnessConfig extends MetricConfig {
  /** Model outputs to evaluate */
  outputs: Array<{ id: string; output: string }>;
  /** Source material that outputs should be faithful to */
  source: string[];
}

/**
 * Measures the faithfulness of outputs to their source material.
 *
 * This metric requires an LLM client. Set one globally with setLLMClient()
 * or pass llmClient in the config.
 *
 * @example
 * ```ts
 * import { setLLMClient, faithfulness } from "evalsense/metrics";
 *
 * setLLMClient({ async complete(prompt) { ... } });
 *
 * const results = await faithfulness({
 *   outputs: [{ id: "1", output: "The document discusses climate change." }],
 *   source: ["This report covers the impacts of climate change on biodiversity."]
 * });
 * ```
 */
export async function faithfulness(config: FaithfulnessConfig): Promise<MetricOutput[]> {
  const { outputs, source, llmClient, evaluationMode = "per-row", customPrompt } = config;

  // Validate LLM client
  const client = requireLLMClient(llmClient, "faithfulness");

  // Validate inputs
  if (outputs.length !== source.length) {
    throw new Error(
      `faithfulness(): outputs and source arrays must have the same length. ` +
        `Got ${outputs.length} outputs and ${source.length} sources.`
    );
  }

  // Route to evaluation mode
  if (evaluationMode === "batch") {
    return evaluateBatch(client, outputs, source, customPrompt);
  } else {
    return evaluatePerRow(client, outputs, source, customPrompt);
  }
}

/**
 * Per-row evaluation: Call LLM for each output individually
 */
async function evaluatePerRow(
  client: ReturnType<typeof requireLLMClient>,
  outputs: Array<{ id: string; output: string }>,
  source: string[],
  customPrompt?: string
): Promise<MetricOutput[]> {
  const prompt = customPrompt ?? FAITHFULNESS_PER_ROW_PROMPT;

  return Promise.all(
    outputs.map(async (output, index) => {
      const src = source[index] ?? "";
      const filledPrompt = fillPrompt(prompt, {
        source: src,
        output: output.output,
      });

      try {
        if (client.completeStructured) {
          const result = await client.completeStructured<FaithfulnessResponse>(filledPrompt, {
            type: "object",
            properties: {
              score: { type: "number" },
              faithful_statements: { type: "array", items: { type: "string" } },
              unfaithful_statements: { type: "array", items: { type: "string" } },
              reasoning: { type: "string" },
            },
            required: ["score", "faithful_statements", "unfaithful_statements", "reasoning"],
          });

          return {
            id: output.id,
            metric: "faithfulness",
            score: normalizeScore(result.score),
            label: result.score >= 0.7 ? "high" : result.score >= 0.4 ? "medium" : "low",
            reasoning: result.reasoning,
            evaluationMode: "per-row" as const,
          };
        } else {
          const response = await client.complete(filledPrompt);
          const parsed = parseJSONResponse<FaithfulnessResponse>(response);

          return {
            id: output.id,
            metric: "faithfulness",
            score: normalizeScore(parsed.score),
            label: parsed.score >= 0.7 ? "high" : parsed.score >= 0.4 ? "medium" : "low",
            reasoning: parsed.reasoning,
            evaluationMode: "per-row" as const,
          };
        }
      } catch (error) {
        throw createLLMError("faithfulness", "Per-row LLM evaluation", error, { id: output.id });
      }
    })
  );
}

/**
 * Batch evaluation: Call LLM once with all source-output pairs
 */
async function evaluateBatch(
  client: ReturnType<typeof requireLLMClient>,
  outputs: Array<{ id: string; output: string }>,
  source: string[],
  customPrompt?: string
): Promise<MetricOutput[]> {
  const prompt = customPrompt ?? FAITHFULNESS_BATCH_PROMPT;

  // Build batch input
  const batchInput = outputs.map((output, index) => ({
    id: output.id,
    source: source[index] ?? "",
    output: output.output,
  }));

  const filledPrompt = fillPrompt(prompt, {
    items: JSON.stringify(batchInput, null, 2),
  });

  try {
    let results: FaithfulnessBatchResponse[];

    if (client.completeStructured) {
      results = await client.completeStructured<FaithfulnessBatchResponse[]>(filledPrompt, {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            score: { type: "number" },
            faithful_statements: { type: "array", items: { type: "string" } },
            unfaithful_statements: { type: "array", items: { type: "string" } },
            reasoning: { type: "string" },
          },
          required: ["id", "score", "faithful_statements", "unfaithful_statements", "reasoning"],
        },
      });
    } else {
      const response = await client.complete(filledPrompt);
      results = parseJSONResponse<FaithfulnessBatchResponse[]>(response);
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
        metric: "faithfulness",
        score: normalizeScore(result.score),
        label: result.score >= 0.7 ? "high" : result.score >= 0.4 ? "medium" : "low",
        reasoning: result.reasoning,
        evaluationMode: "batch" as const,
      };
    });
  } catch (error) {
    throw createLLMError("faithfulness", "Batch LLM evaluation", error);
  }
}
