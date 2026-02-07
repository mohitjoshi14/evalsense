/**
 * Tests for createLLMMetric factory function
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createLLMMetric } from "../../../../src/metrics/create-metric.js";
import {
  setLLMClient,
  resetLLMClient,
  createMockLLMClient,
  createErrorMockClient,
} from "../../../../src/metrics/index.js";

describe("createLLMMetric Factory", () => {
  beforeEach(() => {
    resetLLMClient();
  });

  describe("Basic Creation", () => {
    it("should create a callable metric function", () => {
      const metric = createLLMMetric({
        name: "test-metric",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number", reasoning: "string" },
      });

      expect(typeof metric).toBe("function");
    });

    it("should use metric name in outputs", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, reasoning: "test" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "custom-test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number", reasoning: "string" },
      });

      const results = await metric([{ id: "1", output: "hello" }]);

      expect(results[0].metric).toBe("custom-test");
    });
  });

  describe("Input Validation", () => {
    it("should require id field in all records", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, reasoning: "test" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number" },
      });

      await expect(
        // @ts-expect-error Testing runtime validation
        metric([{ output: "hello" }])
      ).rejects.toThrow("missing required 'id' field");
    });

    it("should require all specified input fields", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, reasoning: "test" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output", "context"],
        prompt: "Test: {output} {context}",
        responseFields: { score: "number" },
      });

      await expect(
        // @ts-expect-error Testing runtime validation
        metric([{ id: "1", output: "hello" }]) // missing context
      ).rejects.toThrow("missing required field 'context'");
    });

    it("should allow optional fields to be missing", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, reasoning: "test" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output", { name: "context", required: false }],
        prompt: "Test: {output}",
        responseFields: { score: "number" },
      });

      const results = await metric([{ id: "1", output: "hello" }]); // no context

      expect(results).toHaveLength(1);
    });
  });

  describe("Prompt Filling", () => {
    it("should fill prompt variables from record fields", async () => {
      let capturedPrompt = "";
      const mockClient = {
        async complete(prompt: string) {
          capturedPrompt = prompt;
          return JSON.stringify({ score: 0.5, reasoning: "test" });
        },
      };
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output", "context"],
        prompt: "OUTPUT: {output}\nCONTEXT: {context}",
        responseFields: { score: "number" },
      });

      await metric([{ id: "1", output: "my output", context: "my context" }]);

      expect(capturedPrompt).toContain("OUTPUT: my output");
      expect(capturedPrompt).toContain("CONTEXT: my context");
    });
  });

  describe("Score Handling", () => {
    it("should normalize scores to 0-1 range", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 1.5, reasoning: "test" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number" },
      });

      const results = await metric([{ id: "1", output: "hello" }]);

      expect(results[0].score).toBe(1);
    });

    it("should use custom scoreField", async () => {
      const mockClient = createMockLLMClient({
        response: { relevance_score: 0.8, reasoning: "test" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { relevance_score: "number" },
        scoreField: "relevance_score",
      });

      const results = await metric([{ id: "1", output: "hello" }]);

      expect(results[0].score).toBe(0.8);
    });
  });

  describe("Label Assignment", () => {
    it("should use label thresholds", async () => {
      const mockClient = createMockLLMClient({
        responses: [
          { score: 0.9, reasoning: "high" },
          { score: 0.5, reasoning: "medium" },
          { score: 0.1, reasoning: "low" },
        ],
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number" },
        labels: [
          { min: 0.7, label: "good" },
          { min: 0.4, label: "fair" },
          { min: 0, label: "poor" },
        ],
      });

      const results = await metric([
        { id: "1", output: "a" },
        { id: "2", output: "b" },
        { id: "3", output: "c" },
      ]);

      expect(results[0].label).toBe("good");
      expect(results[1].label).toBe("fair");
      expect(results[2].label).toBe("poor");
    });

    it("should use labelField from response", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.7, severity: "moderate", reasoning: "test" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number", severity: "string" },
        labelField: "severity",
      });

      const results = await metric([{ id: "1", output: "hello" }]);

      expect(results[0].label).toBe("moderate");
    });

    it("should fall back to default labels when none specified", async () => {
      const mockClient = createMockLLMClient({
        responses: [
          { score: 0.7, reasoning: "high" },
          { score: 0.3, reasoning: "low" },
        ],
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number" },
      });

      const results = await metric([
        { id: "1", output: "a" },
        { id: "2", output: "b" },
      ]);

      expect(results[0].label).toBe("high"); // >= 0.5
      expect(results[1].label).toBe("low"); // < 0.5
    });
  });

  describe("Evaluation Modes", () => {
    it("should default to per-row mode", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, reasoning: "test" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number" },
      });

      const results = await metric([{ id: "1", output: "hello" }]);

      expect(results[0].evaluationMode).toBe("per-row");
    });

    it("should support batch mode when batchPrompt provided", async () => {
      const mockClient = createMockLLMClient({
        response: [{ id: "1", score: 0.5, reasoning: "test" }],
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Per-row: {output}",
        batchPrompt: "Batch: {items}",
        responseFields: { score: "number" },
      });

      const results = await metric([{ id: "1", output: "hello" }], { evaluationMode: "batch" });

      expect(results[0].evaluationMode).toBe("batch");
    });

    it("should use defaultMode when specified", async () => {
      const mockClient = createMockLLMClient({
        response: [{ id: "1", score: 0.5, reasoning: "test" }],
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Per-row: {output}",
        batchPrompt: "Batch: {items}",
        responseFields: { score: "number" },
        defaultMode: "batch",
      });

      const results = await metric([{ id: "1", output: "hello" }]);

      expect(results[0].evaluationMode).toBe("batch");
    });

    it("should fall back to per-row when batch requested but no batchPrompt", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, reasoning: "test" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Per-row: {output}",
        // no batchPrompt
        responseFields: { score: "number" },
      });

      const results = await metric([{ id: "1", output: "hello" }], { evaluationMode: "batch" });

      expect(results[0].evaluationMode).toBe("per-row");
    });
  });

  describe("Custom Prompt Override", () => {
    it("should accept custom prompt in options", async () => {
      let capturedPrompt = "";
      const mockClient = {
        async complete(prompt: string) {
          capturedPrompt = prompt;
          return JSON.stringify({ score: 0.5 });
        },
      };
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "DEFAULT: {output}",
        responseFields: { score: "number" },
      });

      await metric([{ id: "1", output: "hello" }], { customPrompt: "CUSTOM: {output}" });

      expect(capturedPrompt).toContain("CUSTOM: hello");
      expect(capturedPrompt).not.toContain("DEFAULT");
    });
  });

  describe("LLM Client Handling", () => {
    it("should require LLM client", async () => {
      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number" },
      });

      await expect(metric([{ id: "1", output: "hello" }])).rejects.toThrow(
        "test() requires an LLM client"
      );
    });

    it("should use global LLM client", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, reasoning: "test" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number" },
      });

      const results = await metric([{ id: "1", output: "hello" }]);

      expect(results).toHaveLength(1);
    });

    it("should accept LLM client in options", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, reasoning: "test" },
      });

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number" },
      });

      const results = await metric([{ id: "1", output: "hello" }], { llmClient: mockClient });

      expect(results).toHaveLength(1);
    });
  });

  describe("Error Handling", () => {
    it("should throw clear error on LLM failure", async () => {
      const mockClient = createErrorMockClient("API error");
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number" },
      });

      await expect(metric([{ id: "1", output: "hello" }])).rejects.toThrow(
        "test(): Per-row LLM evaluation failed"
      );
    });

    it("should include record ID in error", async () => {
      const mockClient = createErrorMockClient("API error");
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number" },
      });

      await expect(metric([{ id: "test-123", output: "hello" }])).rejects.toThrow(
        "for output test-123"
      );
    });
  });

  describe("Reasoning Field", () => {
    it("should include reasoning in output when present", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, reasoning: "This is the explanation" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number", reasoning: "string" },
      });

      const results = await metric([{ id: "1", output: "hello" }]);

      expect(results[0].reasoning).toBe("This is the explanation");
    });
  });

  describe("Response Field Types", () => {
    it("should handle array response fields", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, items: ["a", "b", "c"], reasoning: "test" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number", items: "array", reasoning: "string" },
      });

      const results = await metric([{ id: "1", output: "hello" }]);

      expect(results[0].score).toBe(0.5);
    });

    it("should handle boolean response fields", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.5, is_valid: true, reasoning: "test" },
      });
      setLLMClient(mockClient);

      const metric = createLLMMetric({
        name: "test",
        inputs: ["output"],
        prompt: "Test: {output}",
        responseFields: { score: "number", is_valid: "boolean" },
      });

      const results = await metric([{ id: "1", output: "hello" }]);

      expect(results[0].score).toBe(0.5);
    });
  });
});
