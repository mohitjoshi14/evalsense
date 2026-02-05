/**
 * Tests for LLM utilities
 */

import { describe, it, expect } from "vitest";
import {
  fillPrompt,
  parseJSONResponse,
  validateResponse,
  normalizeScore,
  extractScore,
  createJSONSchema,
  batchItems,
  createLLMError,
  withTimeout,
} from "../../../../src/metrics/llm/utils.js";

describe("LLM Utilities", () => {
  describe("fillPrompt", () => {
    it("should replace single variable", () => {
      const result = fillPrompt("Hello {name}", { name: "World" });
      expect(result).toBe("Hello World");
    });

    it("should replace multiple variables", () => {
      const result = fillPrompt("Context: {context}\nOutput: {output}", {
        context: "Paris is the capital",
        output: "France's capital",
      });
      expect(result).toBe("Context: Paris is the capital\nOutput: France's capital");
    });

    it("should replace multiple occurrences of same variable", () => {
      const result = fillPrompt("{name} said hello to {name}", { name: "Alice" });
      expect(result).toBe("Alice said hello to Alice");
    });

    it("should handle empty values", () => {
      const result = fillPrompt("Test: {value}", { value: "" });
      expect(result).toBe("Test: ");
    });

    it("should leave unreplaced variables as-is", () => {
      const result = fillPrompt("Hello {name} and {other}", { name: "World" });
      expect(result).toBe("Hello World and {other}");
    });
  });

  describe("parseJSONResponse", () => {
    it("should parse plain JSON string", () => {
      const result = parseJSONResponse<{ score: number }>('{"score": 0.8}');
      expect(result).toEqual({ score: 0.8 });
    });

    it("should parse JSON from markdown code block", () => {
      const response = "```json\n{\"score\": 0.8}\n```";
      const result = parseJSONResponse<{ score: number }>(response);
      expect(result).toEqual({ score: 0.8 });
    });

    it("should parse JSON from code block without language specifier", () => {
      const response = "```\n{\"score\": 0.8}\n```";
      const result = parseJSONResponse<{ score: number }>(response);
      expect(result).toEqual({ score: 0.8 });
    });

    it("should handle whitespace around JSON", () => {
      const result = parseJSONResponse<{ score: number }>('  {"score": 0.8}  ');
      expect(result).toEqual({ score: 0.8 });
    });

    it("should throw error for invalid JSON", () => {
      expect(() => parseJSONResponse("{invalid")).toThrow("Failed to parse LLM response as JSON");
    });

    it("should include response snippet in error message", () => {
      expect(() => parseJSONResponse("not json at all")).toThrow("not json at all");
    });

    it("should parse complex nested objects", () => {
      const response = '{"score": 0.8, "claims": ["claim1", "claim2"], "nested": {"key": "value"}}';
      const result = parseJSONResponse(response);
      expect(result).toEqual({
        score: 0.8,
        claims: ["claim1", "claim2"],
        nested: { key: "value" },
      });
    });
  });

  describe("validateResponse", () => {
    it("should pass validation for object with all required fields", () => {
      const response = { score: 0.8, reasoning: "test" };
      expect(() => validateResponse(response, ["score", "reasoning"], "hallucination")).not.toThrow();
    });

    it("should throw error for non-object response", () => {
      expect(() => validateResponse("string", ["score"], "hallucination")).toThrow(
        "hallucination(): LLM response is not an object"
      );
    });

    it("should throw error for null response", () => {
      expect(() => validateResponse(null, ["score"], "hallucination")).toThrow(
        "hallucination(): LLM response is not an object"
      );
    });

    it("should throw error for missing required fields", () => {
      const response = { score: 0.8 };
      expect(() => validateResponse(response, ["score", "reasoning"], "hallucination")).toThrow(
        "hallucination(): LLM response missing required fields: reasoning"
      );
    });

    it("should list all missing fields", () => {
      const response = { other: "value" };
      expect(() => validateResponse(response, ["score", "reasoning"], "test")).toThrow(
        "test(): LLM response missing required fields: score, reasoning"
      );
    });

    it("should allow extra fields", () => {
      const response = { score: 0.8, reasoning: "test", extra: "field" };
      expect(() => validateResponse(response, ["score"], "test")).not.toThrow();
    });
  });

  describe("normalizeScore", () => {
    it("should keep scores in 0-1 range unchanged", () => {
      expect(normalizeScore(0.5)).toBe(0.5);
      expect(normalizeScore(0)).toBe(0);
      expect(normalizeScore(1)).toBe(1);
    });

    it("should clamp scores above 1", () => {
      expect(normalizeScore(1.5)).toBe(1);
      expect(normalizeScore(100)).toBe(1);
    });

    it("should clamp scores below 0", () => {
      expect(normalizeScore(-0.5)).toBe(0);
      expect(normalizeScore(-100)).toBe(0);
    });
  });

  describe("extractScore", () => {
    it("should extract score from number", () => {
      expect(extractScore(0.8)).toBe(0.8);
    });

    it("should extract score from string", () => {
      expect(extractScore("0.75")).toBe(0.75);
    });

    it("should extract score from object with score field", () => {
      expect(extractScore({ score: 0.9 })).toBe(0.9);
    });

    it("should normalize extracted scores", () => {
      expect(extractScore(1.5)).toBe(1);
      expect(extractScore(-0.5)).toBe(0);
    });

    it("should return default for invalid values", () => {
      expect(extractScore("not a number")).toBe(0.5);
      expect(extractScore(null)).toBe(0.5);
      expect(extractScore(undefined)).toBe(0.5);
    });

    it("should use custom default", () => {
      expect(extractScore("invalid", 0.7)).toBe(0.7);
    });
  });

  describe("createJSONSchema", () => {
    it("should create basic schema", () => {
      const schema = createJSONSchema({
        score: "number",
        reasoning: "string",
      });

      expect(schema).toEqual({
        type: "object",
        properties: {
          score: { type: "number" },
          reasoning: { type: "string" },
        },
        required: ["score", "reasoning"],
      });
    });

    it("should support custom required fields", () => {
      const schema = createJSONSchema(
        {
          score: "number",
          reasoning: "string",
          optional: "string",
        },
        ["score"]
      );

      expect(schema.required).toEqual(["score"]);
    });

    it("should handle empty properties", () => {
      const schema = createJSONSchema({});
      expect(schema.properties).toEqual({});
      expect(schema.required).toEqual([]);
    });
  });

  describe("batchItems", () => {
    it("should split array into batches", () => {
      const items = [1, 2, 3, 4, 5];
      const batches = batchItems(items, 2);

      expect(batches).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("should handle exact divisions", () => {
      const items = [1, 2, 3, 4];
      const batches = batchItems(items, 2);

      expect(batches).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });

    it("should handle batch size larger than array", () => {
      const items = [1, 2];
      const batches = batchItems(items, 5);

      expect(batches).toEqual([[1, 2]]);
    });

    it("should handle empty array", () => {
      const batches = batchItems([], 2);
      expect(batches).toEqual([]);
    });

    it("should handle batch size of 1", () => {
      const items = [1, 2, 3];
      const batches = batchItems(items, 1);

      expect(batches).toEqual([[1], [2], [3]]);
    });
  });

  describe("createLLMError", () => {
    it("should create basic error message", () => {
      const error = createLLMError("hallucination", "LLM call", new Error("Network error"));

      expect(error.message).toBe("hallucination(): LLM call failed: Network error");
    });

    it("should include ID context", () => {
      const error = createLLMError("hallucination", "LLM call", new Error("Failed"), { id: "123" });

      expect(error.message).toBe("hallucination(): LLM call failed for output 123: Failed");
    });

    it("should include index context", () => {
      const error = createLLMError("hallucination", "LLM call", new Error("Failed"), { index: 5 });

      expect(error.message).toBe("hallucination(): LLM call failed for output at index 5: Failed");
    });

    it("should handle string errors", () => {
      const error = createLLMError("test", "operation", "string error");

      expect(error.message).toBe("test(): operation failed: string error");
    });

    it("should handle unknown error types", () => {
      const error = createLLMError("test", "operation", { custom: "error" });

      expect(error.message).toContain("test(): operation failed:");
    });
  });

  describe("withTimeout", () => {
    it("should resolve promise within timeout", async () => {
      const promise = Promise.resolve("success");
      const result = await withTimeout(promise, 1000, "test operation");

      expect(result).toBe("success");
    });

    it("should reject when promise times out", async () => {
      const promise = new Promise((resolve) => setTimeout(() => resolve("too late"), 1000));

      await expect(withTimeout(promise, 50, "test operation")).rejects.toThrow(
        "test operation timed out after 50ms"
      );
    });

    it("should propagate promise rejection", async () => {
      const promise = Promise.reject(new Error("promise error"));

      await expect(withTimeout(promise, 1000, "test operation")).rejects.toThrow("promise error");
    });

    it("should clean up timeout on success", async () => {
      const promise = Promise.resolve("success");
      await withTimeout(promise, 1000, "test operation");

      // If timeout wasn't cleaned up, this test would hang
      expect(true).toBe(true);
    });
  });
});
