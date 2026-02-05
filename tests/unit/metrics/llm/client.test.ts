/**
 * Tests for LLM client management
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  setLLMClient,
  getLLMClient,
  resetLLMClient,
  requireLLMClient,
} from "../../../../src/metrics/llm/client.js";
import { createMockLLMClient } from "../../../../src/metrics/llm/adapters/mock.js";

describe("LLM Client Management", () => {
  beforeEach(() => {
    resetLLMClient();
  });

  describe("setLLMClient", () => {
    it("should set the global LLM client", () => {
      const mockClient = createMockLLMClient();
      setLLMClient(mockClient);
      expect(getLLMClient()).toBe(mockClient);
    });

    it("should allow overwriting the global client", () => {
      const client1 = createMockLLMClient({ response: "first" });
      const client2 = createMockLLMClient({ response: "second" });

      setLLMClient(client1);
      expect(getLLMClient()).toBe(client1);

      setLLMClient(client2);
      expect(getLLMClient()).toBe(client2);
    });
  });

  describe("getLLMClient", () => {
    it("should return null when no client is set", () => {
      expect(getLLMClient()).toBeNull();
    });

    it("should return the configured client", () => {
      const mockClient = createMockLLMClient();
      setLLMClient(mockClient);
      expect(getLLMClient()).toBe(mockClient);
    });
  });

  describe("resetLLMClient", () => {
    it("should clear the global client", () => {
      const mockClient = createMockLLMClient();
      setLLMClient(mockClient);
      expect(getLLMClient()).toBe(mockClient);

      resetLLMClient();
      expect(getLLMClient()).toBeNull();
    });

    it("should be safe to call multiple times", () => {
      resetLLMClient();
      resetLLMClient();
      expect(getLLMClient()).toBeNull();
    });
  });

  describe("requireLLMClient", () => {
    it("should return the override client when provided", () => {
      const globalClient = createMockLLMClient({ response: "global" });
      const overrideClient = createMockLLMClient({ response: "override" });

      setLLMClient(globalClient);

      const result = requireLLMClient(overrideClient, "test");
      expect(result).toBe(overrideClient);
    });

    it("should return the global client when no override provided", () => {
      const globalClient = createMockLLMClient();
      setLLMClient(globalClient);

      const result = requireLLMClient(undefined, "test");
      expect(result).toBe(globalClient);
    });

    it("should throw error when no client is available", () => {
      expect(() => requireLLMClient(undefined, "hallucination")).toThrow(
        "hallucination() requires an LLM client"
      );
    });

    it("should include helpful error message about how to configure", () => {
      expect(() => requireLLMClient(undefined, "relevance")).toThrow(
        "Set a global client with setLLMClient() or pass llmClient in config"
      );
    });
  });

  describe("client interface", () => {
    it("should support complete() method", async () => {
      const mockClient = createMockLLMClient({ response: "test response" });
      const result = await mockClient.complete("test prompt");
      expect(result).toBe("test response");
    });

    it("should support completeStructured() method", async () => {
      const mockClient = createMockLLMClient({
        response: { score: 0.8, reasoning: "test" },
      });

      const result = await mockClient.completeStructured!("test prompt", {
        type: "object",
        properties: { score: { type: "number" }, reasoning: { type: "string" } },
      });

      expect(result).toEqual({ score: 0.8, reasoning: "test" });
    });

    it("should work without completeStructured() method (optional)", async () => {
      const basicClient = {
        async complete(prompt: string) {
          return "basic response";
        },
      };

      setLLMClient(basicClient);
      const client = getLLMClient()!;

      expect(client.completeStructured).toBeUndefined();
      const result = await client.complete("test");
      expect(result).toBe("basic response");
    });
  });
});
