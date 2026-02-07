/**
 * Prompts for relevance metric
 *
 * Evaluates how well an AI output addresses the input query or question.
 */

import type { JSONSchema } from "../../core/types.js";

/**
 * Per-row relevance evaluation prompt
 *
 * Evaluates a single output's relevance to its query.
 */
export const RELEVANCE_PER_ROW_PROMPT = `You are an expert evaluator assessing the relevance of an AI-generated response to a user query.

Relevance measures how well the output addresses the query:
- Does it answer the specific question asked?
- Does it provide information the user is seeking?
- Does it stay on topic without unnecessary tangents?

QUERY:
{query}

OUTPUT TO EVALUATE:
{output}

INSTRUCTIONS:
1. Carefully read the query to understand what the user is asking for
2. Read the output and assess how well it addresses the query
3. Consider:
   - Does it directly answer the question?
   - Is the information provided useful for the query?
   - Does it include irrelevant or off-topic information?
4. Calculate a relevance score:
   - 0.0 = Completely irrelevant (doesn't address the query at all)
   - 0.5 = Partially relevant (addresses some aspects but misses key points)
   - 1.0 = Highly relevant (fully addresses the query)

EXAMPLES:

Query: "What is the capital of France?"
Output: "The capital of France is Paris."
Score: 1.0
Reasoning: "The output directly and completely answers the query with no extraneous information. Perfect relevance."

Query: "How do I reset my password?"
Output: "Our company was founded in 2010 and has offices in 15 countries. We value customer service."
Score: 0.0
Reasoning: "The output provides company background information but does not address the password reset question at all. Completely irrelevant."

Query: "What are the health benefits of green tea?"
Output: "Green tea contains antioxidants. Tea is a popular beverage worldwide, consumed for thousands of years in various cultures."
Score: 0.4
Reasoning: "The output mentions antioxidants which is relevant to health benefits, but then diverges into general tea history which doesn't address the query. Partially relevant."

RESPONSE FORMAT:
Return a JSON object with the following structure:
{
  "score": <number between 0.0 and 1.0>,
  "relevant_parts": [<array of parts that address the query>],
  "irrelevant_parts": [<array of parts that don't address the query>],
  "reasoning": "<brief explanation of your evaluation>"
}`;

/**
 * Batch relevance evaluation prompt
 *
 * Evaluates multiple query-output pairs at once.
 */
export const RELEVANCE_BATCH_PROMPT = `You are an expert evaluator assessing the relevance of AI-generated responses to user queries.

Relevance measures how well each output addresses its corresponding query.

QUERY-OUTPUT PAIRS TO EVALUATE:
{items}

INSTRUCTIONS:
1. For each pair, carefully read the query and its corresponding output
2. Assess how well the output addresses the specific query
3. Calculate a relevance score for each:
   - 0.0 = Completely irrelevant
   - 0.5 = Partially relevant
   - 1.0 = Highly relevant
4. Evaluate each pair INDEPENDENTLY

RESPONSE FORMAT:
Return a JSON array with one object per query-output pair:
[
  {
    "id": "<output id>",
    "score": <number between 0.0 and 1.0>,
    "relevant_parts": [<array of relevant parts>],
    "irrelevant_parts": [<array of irrelevant parts>],
    "reasoning": "<brief explanation>"
  },
  ...
]

IMPORTANT: You must return results for ALL provided pairs in the same order, matching each output's ID exactly.`;

/**
 * JSON schema for relevance response
 */
export const RELEVANCE_SCHEMA: JSONSchema = {
  type: "object",
  properties: {
    score: {
      type: "number",
      description: "Relevance score between 0.0 (irrelevant) and 1.0 (highly relevant)",
      minimum: 0,
      maximum: 1,
    },
    relevant_parts: {
      type: "array",
      description: "Parts of the output that address the query",
      items: {
        type: "string",
      },
    },
    irrelevant_parts: {
      type: "array",
      description: "Parts of the output that don't address the query",
      items: {
        type: "string",
      },
    },
    reasoning: {
      type: "string",
      description: "Explanation of the evaluation",
    },
  },
  required: ["score", "relevant_parts", "irrelevant_parts", "reasoning"],
};

/**
 * JSON schema for batch relevance response
 */
export const RELEVANCE_BATCH_SCHEMA: JSONSchema = {
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
        description: "Relevance score between 0.0 and 1.0",
        minimum: 0,
        maximum: 1,
      },
      relevant_parts: {
        type: "array",
        description: "Relevant parts of the output",
        items: {
          type: "string",
        },
      },
      irrelevant_parts: {
        type: "array",
        description: "Irrelevant parts of the output",
        items: {
          type: "string",
        },
      },
      reasoning: {
        type: "string",
        description: "Explanation of the evaluation",
      },
    },
    required: ["id", "score", "relevant_parts", "irrelevant_parts", "reasoning"],
  },
};

/**
 * Response type for relevance evaluation
 */
export interface RelevanceResponse {
  score: number;
  relevant_parts: string[];
  irrelevant_parts: string[];
  reasoning: string;
}

/**
 * Batch response type for relevance evaluation
 */
export interface RelevanceBatchResponse {
  id: string;
  score: number;
  relevant_parts: string[];
  irrelevant_parts: string[];
  reasoning: string;
}
