/**
 * Hallucination detection metric (LLM-based)
 *
 * Detects statements in the output that are not supported by the provided context.
 * Uses LLM evaluation for accurate hallucination detection.
 */

import type { MetricConfig, MetricOutput } from "../../core/types.js";
import { requireLLMClient } from "../llm/client.js";
import { fillPrompt, parseJSONResponse, createLLMError, normalizeScore } from "../llm/utils.js";
import {
  HALLUCINATION_PER_ROW_PROMPT,
  HALLUCINATION_BATCH_PROMPT,
  type HallucinationResponse,
  type HallucinationBatchResponse,
} from "../llm/prompts/hallucination.js";

/**
 * Configuration for hallucination metric
 */
export interface HallucinationConfig extends MetricConfig {
  /** Model outputs to evaluate */
  outputs: Array<{ id: string; output: string }>;
  /** Context/source material that outputs should be faithful to */
  context: string[];
}

/**
 * Detects potential hallucinations by checking if output content
 * is supported by the provided context.
 *
 * This metric requires an LLM client. Set one globally with setLLMClient()
 * or pass llmClient in the config.
 *
 * @example
 * ```ts
 * import { setLLMClient, hallucination } from "evalsense/metrics";
 *
 * // Configure LLM client once
 * setLLMClient({
 *   async complete(prompt) {
 *     return await yourLLM.generate(prompt);
 *   }
 * });
 *
 * // Use the metric
 * const results = await hallucination({
 *   outputs: [{ id: "1", output: "The capital of France is Paris." }],
 *   context: ["France is a country in Europe. Its capital is Paris."]
 * });
 * ```
 */
export async function hallucination(config: HallucinationConfig): Promise<MetricOutput[]> {
  const { outputs, context, llmClient, evaluationMode = "per-row", customPrompt } = config;

  // Validate LLM client
  const client = requireLLMClient(llmClient, "hallucination");

  // Validate inputs
  if (outputs.length !== context.length) {
    throw new Error(
      `hallucination(): outputs and context arrays must have the same length. ` +
        `Got ${outputs.length} outputs and ${context.length} contexts.`
    );
  }

  // Route to evaluation mode
  if (evaluationMode === "batch") {
    return evaluateBatch(client, outputs, context, customPrompt);
  } else {
    return evaluatePerRow(client, outputs, context, customPrompt);
  }
}

/**
 * Per-row evaluation: Call LLM for each output individually
 *
 * Higher accuracy (each evaluation is independent)
 * Higher cost and latency (multiple API calls)
 */
async function evaluatePerRow(
  client: ReturnType<typeof requireLLMClient>,
  outputs: Array<{ id: string; output: string }>,
  context: string[],
  customPrompt?: string
): Promise<MetricOutput[]> {
  const prompt = customPrompt ?? HALLUCINATION_PER_ROW_PROMPT;

  return Promise.all(
    outputs.map(async (output, index) => {
      const ctx = context[index] ?? "";
      const filledPrompt = fillPrompt(prompt, {
        context: ctx,
        output: output.output,
      });

      try {
        // Try structured output if available
        if (client.completeStructured) {
          const result = await client.completeStructured<HallucinationResponse>(filledPrompt, {
            type: "object",
            properties: {
              score: { type: "number" },
              hallucinated_claims: { type: "array", items: { type: "string" } },
              reasoning: { type: "string" },
            },
            required: ["score", "hallucinated_claims", "reasoning"],
          });

          return {
            id: output.id,
            metric: "hallucination",
            score: normalizeScore(result.score),
            label: result.score >= 0.5 ? "true" : "false",
            reasoning: result.reasoning,
            evaluationMode: "per-row" as const,
          };
        } else {
          // Fallback to text parsing
          const response = await client.complete(filledPrompt);
          const parsed = parseJSONResponse<HallucinationResponse>(response);

          return {
            id: output.id,
            metric: "hallucination",
            score: normalizeScore(parsed.score),
            label: parsed.score >= 0.5 ? "true" : "false",
            reasoning: parsed.reasoning,
            evaluationMode: "per-row" as const,
          };
        }
      } catch (error) {
        throw createLLMError("hallucination", "Per-row LLM evaluation", error, {
          id: output.id,
        });
      }
    })
  );
}

/**
 * Batch evaluation: Call LLM once with all outputs
 *
 * Lower cost (single API call)
 * Potentially less accurate (LLM sees all outputs at once)
 */
async function evaluateBatch(
  client: ReturnType<typeof requireLLMClient>,
  outputs: Array<{ id: string; output: string }>,
  context: string[],
  customPrompt?: string
): Promise<MetricOutput[]> {
  const prompt = customPrompt ?? HALLUCINATION_BATCH_PROMPT;

  // Build batch input
  const batchInput = outputs.map((output, index) => ({
    id: output.id,
    context: context[index] ?? "",
    output: output.output,
  }));

  const filledPrompt = fillPrompt(prompt, {
    items: JSON.stringify(batchInput, null, 2),
  });

  try {
    // Try structured output if available
    let results: HallucinationBatchResponse[];

    if (client.completeStructured) {
      results = await client.completeStructured<HallucinationBatchResponse[]>(filledPrompt, {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            score: { type: "number" },
            hallucinated_claims: { type: "array", items: { type: "string" } },
            reasoning: { type: "string" },
          },
          required: ["id", "score", "hallucinated_claims", "reasoning"],
        },
      });
    } else {
      // Fallback to text parsing
      const response = await client.complete(filledPrompt);
      results = parseJSONResponse<HallucinationBatchResponse[]>(response);
    }

    // Validate we got results for all outputs
    if (!Array.isArray(results)) {
      throw new Error("LLM response is not an array");
    }

    if (results.length !== outputs.length) {
      throw new Error(
        `Expected ${outputs.length} results, got ${results.length}. ` +
          `Batch evaluation must return one result per input.`
      );
    }

    // Map results back to outputs
    return outputs.map((output) => {
      const result = results.find((r) => r.id === output.id);
      if (!result) {
        throw new Error(`Missing result for output ${output.id} in batch response`);
      }

      return {
        id: output.id,
        metric: "hallucination",
        score: normalizeScore(result.score),
        label: result.score >= 0.5 ? "true" : "false",
        reasoning: result.reasoning,
        evaluationMode: "batch" as const,
      };
    });
  } catch (error) {
    throw createLLMError("hallucination", "Batch LLM evaluation", error);
  }
}
