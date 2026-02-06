/**
 * Prompts for hallucination detection metric
 *
 * Detects statements in AI outputs that are not supported by the provided context.
 */

import type { JSONSchema } from "../../../core/types.js";

/**
 * Per-row hallucination evaluation prompt
 *
 * Evaluates a single output against its context to detect unsupported claims.
 */
export const HALLUCINATION_PER_ROW_PROMPT = `You are an expert evaluator assessing whether an AI-generated output contains hallucinations.

A hallucination is a statement or claim in the output that is not supported by the provided context. This includes:
- Factual claims not present in the context
- Incorrect details or numbers
- Made-up information
- Misinterpretations of the context

CONTEXT:
{context}

OUTPUT TO EVALUATE:
{output}

INSTRUCTIONS:
1. Carefully read the context and identify all factual information it contains
2. Read the output and identify all factual claims or statements
3. For each claim in the output, check if it is supported by the context
4. A claim is supported if it directly appears in the context or can be reasonably inferred from it
5. Calculate a hallucination score:
   - 0.0 = No hallucinations (all claims fully supported)
   - 0.5 = Some unsupported claims
   - 1.0 = Severe hallucinations (most/all claims unsupported)

EXAMPLES:

Context: "Paris is the capital of France. It has a population of approximately 2.1 million people within city limits."
Output: "Paris is the capital of France with 2.1 million residents."
Score: 0.0
Reasoning: "The output accurately states that Paris is France's capital and mentions the correct population. All claims are supported by the context."

Context: "The Eiffel Tower was completed in 1889. It stands 330 meters tall."
Output: "The Eiffel Tower was built in 1889 and is 450 meters tall with 5 million annual visitors."
Score: 0.7
Reasoning: "The completion year is correct (1889), but the height is wrong (should be 330m, not 450m), and the visitor count is not mentioned in the context. Two out of three claims are unsupported."

Context: "Machine learning is a subset of artificial intelligence."
Output: "Deep learning revolutionized AI in the 2010s by enabling neural networks with many layers."
Score: 0.9
Reasoning: "The output discusses deep learning and neural networks, which are not mentioned in the context at all. While the statements might be factually true in general, they are not supported by the provided context."

RESPONSE FORMAT:
Return a JSON object with the following structure:
{
  "score": <number between 0.0 and 1.0>,
  "hallucinated_claims": [<array of specific claims that are not supported>],
  "reasoning": "<brief explanation of your evaluation>"
}`;

/**
 * Batch hallucination evaluation prompt
 *
 * Evaluates multiple outputs at once for efficiency.
 */
export const HALLUCINATION_BATCH_PROMPT = `You are an expert evaluator assessing whether AI-generated outputs contain hallucinations.

A hallucination is a statement or claim in the output that is not supported by the provided context. This includes:
- Factual claims not present in the context
- Incorrect details or numbers
- Made-up information
- Misinterpretations of the context

OUTPUTS TO EVALUATE:
{items}

INSTRUCTIONS:
1. For each output, carefully read its corresponding context
2. Identify all factual claims in the output
3. Check if each claim is supported by the context
4. Calculate a hallucination score for each output:
   - 0.0 = No hallucinations (all claims fully supported)
   - 0.5 = Some unsupported claims
   - 1.0 = Severe hallucinations (most/all claims unsupported)
5. Evaluate each output INDEPENDENTLY - do not let one evaluation influence another

RESPONSE FORMAT:
Return a JSON array with one object per output:
[
  {
    "id": "<output id>",
    "score": <number between 0.0 and 1.0>,
    "hallucinated_claims": [<array of specific unsupported claims>],
    "reasoning": "<brief explanation>"
  },
  ...
]

IMPORTANT: You must return results for ALL provided outputs in the same order, matching each output's ID exactly.`;

/**
 * JSON schema for hallucination response
 */
export const HALLUCINATION_SCHEMA: JSONSchema = {
  type: "object",
  properties: {
    score: {
      type: "number",
      description:
        "Hallucination score between 0.0 (no hallucinations) and 1.0 (severe hallucinations)",
      minimum: 0,
      maximum: 1,
    },
    hallucinated_claims: {
      type: "array",
      description: "List of specific claims that are not supported by the context",
      items: {
        type: "string",
      },
    },
    reasoning: {
      type: "string",
      description: "Explanation of the evaluation",
    },
  },
  required: ["score", "hallucinated_claims", "reasoning"],
};

/**
 * JSON schema for batch hallucination response
 */
export const HALLUCINATION_BATCH_SCHEMA: JSONSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "ID of the output being evaluated",
      },
      score: {
        type: "number",
        description: "Hallucination score between 0.0 and 1.0",
        minimum: 0,
        maximum: 1,
      },
      hallucinated_claims: {
        type: "array",
        description: "List of unsupported claims",
        items: {
          type: "string",
        },
      },
      reasoning: {
        type: "string",
        description: "Explanation of the evaluation",
      },
    },
    required: ["id", "score", "hallucinated_claims", "reasoning"],
  },
};

/**
 * Response type for hallucination evaluation
 */
export interface HallucinationResponse {
  score: number;
  hallucinated_claims: string[];
  reasoning: string;
}

/**
 * Batch response type for hallucination evaluation
 */
export interface HallucinationBatchResponse {
  id: string;
  score: number;
  hallucinated_claims: string[];
  reasoning: string;
}
