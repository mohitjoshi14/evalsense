/**
 * Tests for hallucination metric (LLM-based)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { hallucination } from "../../../../src/metrics/opinionated/hallucination.js";
import {
  setLLMClient,
  resetLLMClient,
  createMockLLMClient,
  createErrorMockClient,
} from "../../../../src/metrics/index.js";

describe("Hallucination Metric (LLM-based)", () => {
  beforeEach(() => {
    resetLLMClient();
  });

  describe("Client Validation", () => {
    it("should throw error when no LLM client is configured", async () => {
      await expect(
        hallucination({
          outputs: [{ id: "1", output: "test" }],
          context: ["test"],
        })
      ).rejects.toThrow("hallucination() requires an LLM client");
    });

    it("should accept LLM client in config", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, hallucinated_claims: [], reasoning: "test" },
      });

      const results = await hallucination({
        outputs: [{ id: "1", output: "test" }],
        context: ["test"],
        llmClient: mockClient,
      });

      expect(results).toHaveLength(1);
    });

    it("should use global LLM client", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, hallucinated_claims: [], reasoning: "test" },
      });

      setLLMClient(mockClient);

      const results = await hallucination({
        outputs: [{ id: "1", output: "test" }],
        context: ["test"],
      });

      expect(results).toHaveLength(1);
    });
  });

  describe("Input Validation", () => {
    beforeEach(() => {
      setLLMClient(
        createMockLLMClient({
          response: { score: 0.5, hallucinated_claims: [], reasoning: "test" },
        })
      );
    });

    it("should throw error when outputs and context length mismatch", async () => {
      await expect(
        hallucination({
          outputs: [{ id: "1", output: "test" }],
          context: ["ctx1", "ctx2"],
        })
      ).rejects.toThrow("outputs and context arrays must have the same length");
    });

    it("should accept matching array lengths", async () => {
      const results = await hallucination({
        outputs: [
          { id: "1", output: "test1" },
          { id: "2", output: "test2" },
        ],
        context: ["ctx1", "ctx2"],
      });

      expect(results).toHaveLength(2);
    });
  });

  describe("Per-Row Evaluation Mode", () => {
    it("should evaluate each output independently", async () => {
      const mockClient = createMockLLMClient({
        responses: [
          { score: 0.2, hallucinated_claims: [], reasoning: "First output is accurate" },
          {
            score: 0.9,
            hallucinated_claims: ["fake claim"],
            reasoning: "Second has hallucinations",
          },
        ],
      });

      setLLMClient(mockClient);

      const results = await hallucination({
        outputs: [
          { id: "1", output: "Paris is in France" },
          { id: "2", output: "Paris has 50 million people" },
        ],
        context: ["Paris is the capital of France", "Paris is the capital of France"],
        evaluationMode: "per-row",
      });

      expect(results).toHaveLength(2);
      expect(results[0].score).toBe(0.2);
      expect(results[0].label).toBe("false");
      expect(results[0].reasoning).toBe("First output is accurate");
      expect(results[0].evaluationMode).toBe("per-row");

      expect(results[1].score).toBe(0.9);
      expect(results[1].label).toBe("true");
      expect(results[1].reasoning).toBe("Second has hallucinations");
      expect(results[1].evaluationMode).toBe("per-row");
    });

    it("should use structured output when available", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.8, hallucinated_claims: ["claim"], reasoning: "Has hallucination" },
      });

      setLLMClient(mockClient);

      const results = await hallucination({
        outputs: [{ id: "1", output: "test" }],
        context: ["context"],
      });

      expect(results[0].score).toBe(0.8);
      expect(results[0].label).toBe("true");
    });

    it("should parse JSON from text response", async () => {
      const mockClient = {
        async complete() {
          return JSON.stringify({
            score: 0.3,
            hallucinated_claims: [],
            reasoning: "No hallucinations",
          });
        },
      };

      setLLMClient(mockClient);

      const results = await hallucination({
        outputs: [{ id: "1", output: "test" }],
        context: ["context"],
      });

      expect(results[0].score).toBe(0.3);
      expect(results[0].label).toBe("false");
    });

    it("should normalize scores outside 0-1 range", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 1.5, hallucinated_claims: [], reasoning: "test" },
      });

      setLLMClient(mockClient);

      const results = await hallucination({
        outputs: [{ id: "1", output: "test" }],
        context: ["context"],
      });

      expect(results[0].score).toBe(1);
    });
  });

  describe("Batch Evaluation Mode", () => {
    it("should evaluate all outputs in single LLM call", async () => {
      const mockClient = createMockLLMClient({
        response: [
          { id: "1", score: 0.1, hallucinated_claims: [], reasoning: "Accurate" },
          { id: "2", score: 0.9, hallucinated_claims: ["fake"], reasoning: "Hallucinated" },
        ],
      });

      setLLMClient(mockClient);

      const results = await hallucination({
        outputs: [
          { id: "1", output: "output1" },
          { id: "2", output: "output2" },
        ],
        context: ["ctx1", "ctx2"],
        evaluationMode: "batch",
      });

      expect(results).toHaveLength(2);
      expect(results[0].evaluationMode).toBe("batch");
      expect(results[1].evaluationMode).toBe("batch");
    });

    it("should match results to outputs by ID", async () => {
      const mockClient = createMockLLMClient({
        response: [
          { id: "2", score: 0.9, hallucinated_claims: [], reasoning: "Second" },
          { id: "1", score: 0.1, hallucinated_claims: [], reasoning: "First" },
        ],
      });

      setLLMClient(mockClient);

      const results = await hallucination({
        outputs: [
          { id: "1", output: "first" },
          { id: "2", output: "second" },
        ],
        context: ["ctx1", "ctx2"],
        evaluationMode: "batch",
      });

      expect(results[0].id).toBe("1");
      expect(results[0].reasoning).toBe("First");
      expect(results[1].id).toBe("2");
      expect(results[1].reasoning).toBe("Second");
    });

    it("should throw error if result count mismatch", async () => {
      const mockClient = createMockLLMClient({
        response: [{ id: "1", score: 0.5, hallucinated_claims: [], reasoning: "test" }],
      });

      setLLMClient(mockClient);

      await expect(
        hallucination({
          outputs: [
            { id: "1", output: "first" },
            { id: "2", output: "second" },
          ],
          context: ["ctx1", "ctx2"],
          evaluationMode: "batch",
        })
      ).rejects.toThrow("Expected 2 results, got 1");
    });

    it("should throw error if missing result for output", async () => {
      const mockClient = createMockLLMClient({
        response: [
          { id: "1", score: 0.5, hallucinated_claims: [], reasoning: "test" },
          { id: "3", score: 0.5, hallucinated_claims: [], reasoning: "wrong id" },
        ],
      });

      setLLMClient(mockClient);

      await expect(
        hallucination({
          outputs: [
            { id: "1", output: "first" },
            { id: "2", output: "second" },
          ],
          context: ["ctx1", "ctx2"],
          evaluationMode: "batch",
        })
      ).rejects.toThrow("Missing result for output 2");
    });
  });

  describe("Custom Prompts", () => {
    it("should accept custom prompt override", async () => {
      let capturedPrompt = "";
      const mockClient = {
        async complete(prompt: string) {
          capturedPrompt = prompt;
          return JSON.stringify({ score: 0.5, hallucinated_claims: [], reasoning: "test" });
        },
      };

      setLLMClient(mockClient);

      await hallucination({
        outputs: [{ id: "1", output: "test" }],
        context: ["context"],
        customPrompt: "CUSTOM PROMPT: {context} | {output}",
      });

      expect(capturedPrompt).toContain("CUSTOM PROMPT");
      expect(capturedPrompt).toContain("context");
      expect(capturedPrompt).toContain("test");
    });
  });

  describe("Error Handling", () => {
    it("should throw clear error on LLM failure", async () => {
      const mockClient = createErrorMockClient("LLM API error");

      setLLMClient(mockClient);

      await expect(
        hallucination({
          outputs: [{ id: "1", output: "test" }],
          context: ["context"],
        })
      ).rejects.toThrow("Per-row LLM evaluation failed");
    });

    it("should include output ID in error message", async () => {
      const mockClient = createErrorMockClient("Network timeout");

      setLLMClient(mockClient);

      await expect(
        hallucination({
          outputs: [{ id: "test-123", output: "test" }],
          context: ["context"],
        })
      ).rejects.toThrow("for output test-123");
    });

    it("should handle batch evaluation errors", async () => {
      const mockClient = createErrorMockClient("Batch processing failed");

      setLLMClient(mockClient);

      await expect(
        hallucination({
          outputs: [{ id: "1", output: "test" }],
          context: ["context"],
          evaluationMode: "batch",
        })
      ).rejects.toThrow("Batch LLM evaluation failed");
    });

    it("should handle malformed JSON responses", async () => {
      const mockClient = {
        async complete() {
          return "not valid json";
        },
      };

      setLLMClient(mockClient);

      await expect(
        hallucination({
          outputs: [{ id: "1", output: "test" }],
          context: ["context"],
        })
      ).rejects.toThrow("Failed to parse LLM response as JSON");
    });
  });

  describe("Label Assignment", () => {
    beforeEach(() => {
      setLLMClient(
        createMockLLMClient({
          response: { score: 0, hallucinated_claims: [], reasoning: "test" },
        })
      );
    });

    it("should assign 'false' label for scores below 0.5", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.3, hallucinated_claims: [], reasoning: "test" },
      });

      setLLMClient(mockClient);

      const results = await hallucination({
        outputs: [{ id: "1", output: "test" }],
        context: ["context"],
      });

      expect(results[0].label).toBe("false");
    });

    it("should assign 'true' label for scores >= 0.5", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.7, hallucinated_claims: ["claim"], reasoning: "test" },
      });

      setLLMClient(mockClient);

      const results = await hallucination({
        outputs: [{ id: "1", output: "test" }],
        context: ["context"],
      });

      expect(results[0].label).toBe("true");
    });
  });
});
