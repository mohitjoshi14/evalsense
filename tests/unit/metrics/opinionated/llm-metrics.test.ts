/**
 * Comprehensive tests for all LLM-based opinionated metrics
 */

import { describe, it, expect, beforeEach } from "vitest";
import { relevance } from "../../../../src/metrics/opinionated/relevance.js";
import { faithfulness } from "../../../../src/metrics/opinionated/faithfulness.js";
import { toxicity } from "../../../../src/metrics/opinionated/toxicity.js";
import {
  setLLMClient,
  resetLLMClient,
  createMockLLMClient,
} from "../../../../src/metrics/index.js";

describe("Relevance Metric", () => {
  beforeEach(() => {
    resetLLMClient();
  });

  it("should require LLM client", async () => {
    await expect(
      relevance({
        outputs: [{ id: "1", output: "Paris" }],
        query: ["What is the capital of France?"],
      })
    ).rejects.toThrow("relevance() requires an LLM client");
  });

  it("should validate outputs and query lengths match", async () => {
    setLLMClient(
      createMockLLMClient({
        response: { score: 0.9, relevant_parts: [], irrelevant_parts: [], reasoning: "test" },
      })
    );

    await expect(
      relevance({
        outputs: [{ id: "1", output: "Paris" }],
        query: ["Query1", "Query2"],
      })
    ).rejects.toThrow("outputs and query arrays must have the same length");
  });

  it("should evaluate relevance in per-row mode", async () => {
    const mockClient = createMockLLMClient({
      response: {
        score: 0.9,
        relevant_parts: ["answer"],
        irrelevant_parts: [],
        reasoning: "Highly relevant",
      },
    });

    setLLMClient(mockClient);

    const results = await relevance({
      outputs: [{ id: "1", output: "Paris is the capital of France" }],
      query: ["What is the capital of France?"],
      evaluationMode: "per-row",
    });

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.9);
    expect(results[0].label).toBe("high");
    expect(results[0].reasoning).toBe("Highly relevant");
    expect(results[0].evaluationMode).toBe("per-row");
  });

  it("should evaluate relevance in batch mode", async () => {
    const mockClient = createMockLLMClient({
      response: [
        { id: "1", score: 0.9, relevant_parts: [], irrelevant_parts: [], reasoning: "High" },
        { id: "2", score: 0.5, relevant_parts: [], irrelevant_parts: [], reasoning: "Medium" },
      ],
    });

    setLLMClient(mockClient);

    const results = await relevance({
      outputs: [
        { id: "1", output: "Paris" },
        { id: "2", output: "Maybe Paris" },
      ],
      query: ["Capital of France?", "Capital of France?"],
      evaluationMode: "batch",
    });

    expect(results).toHaveLength(2);
    expect(results[0].evaluationMode).toBe("batch");
    expect(results[1].evaluationMode).toBe("batch");
  });

  it("should assign correct labels based on score", async () => {
    const mockClient = createMockLLMClient({
      responses: [
        { score: 0.8, relevant_parts: [], irrelevant_parts: [], reasoning: "high" },
        { score: 0.5, relevant_parts: [], irrelevant_parts: [], reasoning: "medium" },
        { score: 0.2, relevant_parts: [], irrelevant_parts: [], reasoning: "low" },
      ],
    });

    setLLMClient(mockClient);

    const results = await relevance({
      outputs: [
        { id: "1", output: "test" },
        { id: "2", output: "test" },
        { id: "3", output: "test" },
      ],
      query: ["q1", "q2", "q3"],
    });

    expect(results[0].label).toBe("high"); // >= 0.7
    expect(results[1].label).toBe("medium"); // >= 0.4
    expect(results[2].label).toBe("low"); // < 0.4
  });
});

describe("Faithfulness Metric", () => {
  beforeEach(() => {
    resetLLMClient();
  });

  it("should require LLM client", async () => {
    await expect(
      faithfulness({
        outputs: [{ id: "1", output: "Summary" }],
        source: ["Original text"],
      })
    ).rejects.toThrow("faithfulness() requires an LLM client");
  });

  it("should validate outputs and source lengths match", async () => {
    setLLMClient(
      createMockLLMClient({
        response: {
          score: 0.9,
          faithful_statements: [],
          unfaithful_statements: [],
          reasoning: "test",
        },
      })
    );

    await expect(
      faithfulness({
        outputs: [{ id: "1", output: "Summary" }],
        source: ["Source1", "Source2"],
      })
    ).rejects.toThrow("outputs and source arrays must have the same length");
  });

  it("should evaluate faithfulness in per-row mode", async () => {
    const mockClient = createMockLLMClient({
      response: {
        score: 0.95,
        faithful_statements: ["statement"],
        unfaithful_statements: [],
        reasoning: "Fully faithful",
      },
    });

    setLLMClient(mockClient);

    const results = await faithfulness({
      outputs: [{ id: "1", output: "The study found positive results" }],
      source: ["Study results were positive"],
      evaluationMode: "per-row",
    });

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.95);
    expect(results[0].label).toBe("high");
    expect(results[0].reasoning).toBe("Fully faithful");
    expect(results[0].evaluationMode).toBe("per-row");
  });

  it("should evaluate faithfulness in batch mode", async () => {
    const mockClient = createMockLLMClient({
      response: [
        {
          id: "1",
          score: 0.9,
          faithful_statements: [],
          unfaithful_statements: [],
          reasoning: "Faithful",
        },
        {
          id: "2",
          score: 0.3,
          faithful_statements: [],
          unfaithful_statements: ["error"],
          reasoning: "Unfaithful",
        },
      ],
    });

    setLLMClient(mockClient);

    const results = await faithfulness({
      outputs: [
        { id: "1", output: "Accurate summary" },
        { id: "2", output: "Inaccurate summary" },
      ],
      source: ["Original text", "Original text"],
      evaluationMode: "batch",
    });

    expect(results).toHaveLength(2);
    expect(results[0].score).toBe(0.9);
    expect(results[1].score).toBe(0.3);
  });

  it("should detect unfaithful statements", async () => {
    const mockClient = createMockLLMClient({
      response: {
        score: 0.1,
        faithful_statements: [],
        unfaithful_statements: ["Revenue decreased instead of increased"],
        reasoning: "Contradicts source",
      },
    });

    setLLMClient(mockClient);

    const results = await faithfulness({
      outputs: [{ id: "1", output: "Revenue decreased" }],
      source: ["Revenue increased by 15%"],
    });

    expect(results[0].score).toBe(0.1);
    expect(results[0].label).toBe("low");
  });
});

describe("Toxicity Metric", () => {
  beforeEach(() => {
    resetLLMClient();
  });

  it("should require LLM client", async () => {
    await expect(
      toxicity({
        outputs: [{ id: "1", output: "Hello" }],
      })
    ).rejects.toThrow("toxicity() requires an LLM client");
  });

  it("should evaluate toxicity in per-row mode", async () => {
    const mockClient = createMockLLMClient({
      response: {
        score: 0.1,
        categories: [],
        severity: "none",
        reasoning: "Polite and professional",
      },
    });

    setLLMClient(mockClient);

    const results = await toxicity({
      outputs: [{ id: "1", output: "Thank you for your help" }],
      evaluationMode: "per-row",
    });

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.1);
    expect(results[0].label).toBe("none");
    expect(results[0].reasoning).toBe("Polite and professional");
    expect(results[0].evaluationMode).toBe("per-row");
  });

  it("should evaluate toxicity in batch mode", async () => {
    const mockClient = createMockLLMClient({
      response: [
        { id: "1", score: 0.0, categories: [], severity: "none", reasoning: "Safe" },
        { id: "2", score: 0.8, categories: ["insults"], severity: "severe", reasoning: "Toxic" },
      ],
    });

    setLLMClient(mockClient);

    const results = await toxicity({
      outputs: [
        { id: "1", output: "Hello friend" },
        { id: "2", output: "You're stupid" },
      ],
      evaluationMode: "batch",
    });

    expect(results).toHaveLength(2);
    expect(results[0].label).toBe("none");
    expect(results[1].label).toBe("severe");
  });

  it("should detect different toxicity categories", async () => {
    const mockClient = createMockLLMClient({
      response: {
        score: 0.7,
        categories: ["Personal attacks", "Profanity"],
        severity: "moderate",
        reasoning: "Contains insults and profanity",
      },
    });

    setLLMClient(mockClient);

    const results = await toxicity({
      outputs: [{ id: "1", output: "That's a damn stupid idea" }],
    });

    expect(results[0].score).toBe(0.7);
    expect(results[0].label).toBe("moderate");
  });

  it("should assign severity labels correctly", async () => {
    const mockClient = createMockLLMClient({
      responses: [
        { score: 0.0, categories: [], severity: "none", reasoning: "safe" },
        { score: 0.2, categories: [], severity: "mild", reasoning: "mild" },
        { score: 0.6, categories: [], severity: "moderate", reasoning: "moderate" },
        { score: 1.0, categories: [], severity: "severe", reasoning: "severe" },
      ],
    });

    setLLMClient(mockClient);

    const results = await toxicity({
      outputs: [
        { id: "1", output: "safe" },
        { id: "2", output: "mild" },
        { id: "3", output: "moderate" },
        { id: "4", output: "severe" },
      ],
    });

    expect(results[0].label).toBe("none");
    expect(results[1].label).toBe("mild");
    expect(results[2].label).toBe("moderate");
    expect(results[3].label).toBe("severe");
  });

  it("should work without context or query fields", async () => {
    const mockClient = createMockLLMClient({
      response: { score: 0.0, categories: [], severity: "none", reasoning: "Safe" },
    });

    setLLMClient(mockClient);

    // Toxicity doesn't require context or query
    const results = await toxicity({
      outputs: [{ id: "1", output: "Hello world" }],
    });

    expect(results).toHaveLength(1);
    expect(results[0].metric).toBe("toxicity");
  });
});

describe("Common LLM Metric Features", () => {
  beforeEach(() => {
    resetLLMClient();
  });

  it("all metrics should support custom prompts", async () => {
    let capturedPrompts: string[] = [];

    const mockClient = {
      async complete(prompt: string) {
        capturedPrompts.push(prompt);
        return JSON.stringify({
          score: 0.5,
          hallucinated_claims: [],
          relevant_parts: [],
          irrelevant_parts: [],
          faithful_statements: [],
          unfaithful_statements: [],
          categories: [],
          severity: "none",
          reasoning: "test",
        });
      },
    };

    setLLMClient(mockClient);

    const customPrompt = "CUSTOM: {output}";

    await toxicity({
      outputs: [{ id: "1", output: "test" }],
      customPrompt,
    });

    expect(capturedPrompts[0]).toContain("CUSTOM");
  });

  it("all metrics should normalize scores", async () => {
    const mockClient = createMockLLMClient({
      response: {
        score: 2.5, // Out of range
        hallucinated_claims: [],
        reasoning: "test",
      },
    });

    setLLMClient(mockClient);

    const results = await toxicity({
      outputs: [{ id: "1", output: "test" }],
    });

    expect(results[0].score).toBeLessThanOrEqual(1);
    expect(results[0].score).toBeGreaterThanOrEqual(0);
  });
});
