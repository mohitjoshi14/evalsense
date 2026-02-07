/**
 * Prompts for faithfulness metric
 *
 * Evaluates whether an AI output is faithful to its source material,
 * ensuring it doesn't contradict or misrepresent the source.
 */

import type { JSONSchema } from "../../core/types.js";

/**
 * Per-row faithfulness evaluation prompt
 *
 * Evaluates a single output's faithfulness to its source material.
 */
export const FAITHFULNESS_PER_ROW_PROMPT = `You are an expert evaluator assessing the faithfulness of an AI-generated output to its source material.

Faithfulness measures whether the output accurately represents the source without:
- Contradictions of source facts
- Misrepresentation of source claims
- Distortion of source meaning
- Fabrication beyond the source

An output can summarize or paraphrase the source, but must remain faithful to its facts and meaning.

SOURCE MATERIAL:
{source}

OUTPUT TO EVALUATE:
{output}

INSTRUCTIONS:
1. Carefully read the source material to understand its facts and claims
2. Read the output and identify all statements it makes
3. For each statement, verify it is faithful to the source:
   - Does it align with source facts?
   - Does it preserve source meaning?
   - Does it avoid contradictions?
4. Calculate a faithfulness score:
   - 0.0 = Unfaithful (contradicts or misrepresents source)
   - 0.5 = Partially faithful (some accurate, some distortions)
   - 1.0 = Fully faithful (accurate representation of source)

EXAMPLES:

Source: "The study found that 65% of participants improved their test scores after the intervention."
Output: "Most participants (65%) showed improvement following the intervention."
Score: 1.0
Reasoning: "The output accurately represents the source finding. '65%' and 'Most participants' are faithful, and the meaning is preserved."

Source: "Revenue increased by 15% in Q4, reaching $2.3 million."
Output: "Q4 revenue decreased to $2.3 million, down 15% from the previous quarter."
Score: 0.0
Reasoning: "The output contradicts the source. It states revenue 'decreased' when the source says it 'increased'. The percentage is also misattributed. Completely unfaithful."

Source: "The medication showed promise in early trials but requires further testing before approval."
Output: "The medication is highly effective and has been approved for use."
Score: 0.1
Reasoning: "The output misrepresents the source's cautious findings as definitive approval. This is a significant distortion of both the facts and the overall meaning."

RESPONSE FORMAT:
Return a JSON object with the following structure:
{
  "score": <number between 0.0 and 1.0>,
  "faithful_statements": [<array of statements that align with source>],
  "unfaithful_statements": [<array of statements that contradict or misrepresent>],
  "reasoning": "<brief explanation of your evaluation>"
}`;

/**
 * Batch faithfulness evaluation prompt
 *
 * Evaluates multiple source-output pairs at once.
 */
export const FAITHFULNESS_BATCH_PROMPT = `You are an expert evaluator assessing the faithfulness of AI-generated outputs to their source materials.

Faithfulness measures whether outputs accurately represent their sources without contradictions or misrepresentations.

SOURCE-OUTPUT PAIRS TO EVALUATE:
{items}

INSTRUCTIONS:
1. For each pair, carefully read the source and its corresponding output
2. Verify that the output is faithful to the source
3. Calculate a faithfulness score for each:
   - 0.0 = Unfaithful (contradicts or misrepresents)
   - 0.5 = Partially faithful
   - 1.0 = Fully faithful
4. Evaluate each pair INDEPENDENTLY

RESPONSE FORMAT:
Return a JSON array with one object per source-output pair:
[
  {
    "id": "<output id>",
    "score": <number between 0.0 and 1.0>,
    "faithful_statements": [<array of faithful statements>],
    "unfaithful_statements": [<array of unfaithful statements>],
    "reasoning": "<brief explanation>"
  },
  ...
]

IMPORTANT: You must return results for ALL provided pairs in the same order, matching each output's ID exactly.`;

/**
 * JSON schema for faithfulness response
 */
export const FAITHFULNESS_SCHEMA: JSONSchema = {
  type: "object",
  properties: {
    score: {
      type: "number",
      description: "Faithfulness score between 0.0 (unfaithful) and 1.0 (fully faithful)",
      minimum: 0,
      maximum: 1,
    },
    faithful_statements: {
      type: "array",
      description: "Statements that align with the source",
      items: {
        type: "string",
      },
    },
    unfaithful_statements: {
      type: "array",
      description: "Statements that contradict or misrepresent the source",
      items: {
        type: "string",
      },
    },
    reasoning: {
      type: "string",
      description: "Explanation of the evaluation",
    },
  },
  required: ["score", "faithful_statements", "unfaithful_statements", "reasoning"],
};

/**
 * JSON schema for batch faithfulness response
 */
export const FAITHFULNESS_BATCH_SCHEMA: JSONSchema = {
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
        description: "Faithfulness score between 0.0 and 1.0",
        minimum: 0,
        maximum: 1,
      },
      faithful_statements: {
        type: "array",
        description: "Faithful statements",
        items: {
          type: "string",
        },
      },
      unfaithful_statements: {
        type: "array",
        description: "Unfaithful statements",
        items: {
          type: "string",
        },
      },
      reasoning: {
        type: "string",
        description: "Explanation of the evaluation",
      },
    },
    required: ["id", "score", "faithful_statements", "unfaithful_statements", "reasoning"],
  },
};

/**
 * Response type for faithfulness evaluation
 */
export interface FaithfulnessResponse {
  score: number;
  faithful_statements: string[];
  unfaithful_statements: string[];
  reasoning: string;
}

/**
 * Batch response type for faithfulness evaluation
 */
export interface FaithfulnessBatchResponse {
  id: string;
  score: number;
  faithful_statements: string[];
  unfaithful_statements: string[];
  reasoning: string;
}
