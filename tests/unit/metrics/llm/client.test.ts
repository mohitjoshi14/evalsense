/**
 * Tests for LLM client management
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  setLLMClient,
  getLLMClient,
  resetLLMClient,
  requireLLMClient,
  withLLMClient,
  configureLLM,
  setDefaults,
  getDefaults,
  resetDefaults,
} from "../../../../src/metrics/client.js";
import { createMockLLMClient } from "../../../../src/metrics/adapters/mock.js";
import { testing } from "../../../../src/metrics/index.js";

describe("LLM Client Management", () => {
  beforeEach(() => {
    resetLLMClient();
    resetDefaults();
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
        async complete(_prompt: string) {
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

  describe("withLLMClient", () => {
    it("should scope client to callback", async () => {
      const originalClient = createMockLLMClient({ response: "original" });
      const scopedClient = createMockLLMClient({ response: "scoped" });

      setLLMClient(originalClient);
      expect(getLLMClient()).toBe(originalClient);

      const result = await withLLMClient(scopedClient, async () => {
        expect(getLLMClient()).toBe(scopedClient);
        return "done";
      });

      expect(result).toBe("done");
      expect(getLLMClient()).toBe(originalClient);
    });

    it("should restore client even on error", async () => {
      const originalClient = createMockLLMClient({ response: "original" });
      const scopedClient = createMockLLMClient({ response: "scoped" });

      setLLMClient(originalClient);

      await expect(
        withLLMClient(scopedClient, async () => {
          throw new Error("test error");
        })
      ).rejects.toThrow("test error");

      expect(getLLMClient()).toBe(originalClient);
    });

    it("should work with no previous client", async () => {
      const scopedClient = createMockLLMClient({ response: "scoped" });
      expect(getLLMClient()).toBeNull();

      await withLLMClient(scopedClient, async () => {
        expect(getLLMClient()).toBe(scopedClient);
      });

      expect(getLLMClient()).toBeNull();
    });

    it("should support nested scopes", async () => {
      const client1 = createMockLLMClient({ response: "1" });
      const client2 = createMockLLMClient({ response: "2" });

      await withLLMClient(client1, async () => {
        expect(getLLMClient()).toBe(client1);

        await withLLMClient(client2, async () => {
          expect(getLLMClient()).toBe(client2);
        });

        expect(getLLMClient()).toBe(client1);
      });

      expect(getLLMClient()).toBeNull();
    });
  });

  describe("setDefaults / getDefaults / resetDefaults", () => {
    it("should set and get defaults", () => {
      setDefaults({ evaluationMode: "batch" });
      expect(getDefaults()).toEqual({ evaluationMode: "batch" });
    });

    it("should merge defaults", () => {
      setDefaults({ evaluationMode: "batch" });
      setDefaults({ evaluationMode: "per-row" });
      expect(getDefaults()).toEqual({ evaluationMode: "per-row" });
    });

    it("should reset defaults", () => {
      setDefaults({ evaluationMode: "batch" });
      resetDefaults();
      expect(getDefaults()).toEqual({});
    });

    it("should return a copy of defaults", () => {
      setDefaults({ evaluationMode: "batch" });
      const defaults = getDefaults();
      defaults.evaluationMode = "per-row";
      expect(getDefaults().evaluationMode).toBe("batch");
    });
  });

  describe("configureLLM", () => {
    it("should configure custom client", () => {
      const customClient = createMockLLMClient({ response: "custom" });
      const result = configureLLM({ provider: "custom", client: customClient });

      expect(result).toBe(customClient);
      expect(getLLMClient()).toBe(customClient);
    });

    it("should throw when custom provider has no client", () => {
      expect(() => configureLLM({ provider: "custom" })).toThrow(
        "'client' is required when provider is 'custom'"
      );
    });

    it("should set defaults when provided", () => {
      const customClient = createMockLLMClient();
      configureLLM({
        provider: "custom",
        client: customClient,
        defaults: { evaluationMode: "batch" },
      });

      expect(getDefaults()).toEqual({ evaluationMode: "batch" });
    });

    it("should throw when API key not found for openai", () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      try {
        expect(() => configureLLM({ provider: "openai" })).toThrow("API key not found");
      } finally {
        if (originalEnv) {
          process.env.OPENAI_API_KEY = originalEnv;
        }
      }
    });

    it("should throw when API key not found for anthropic", () => {
      const originalEnv = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      try {
        expect(() => configureLLM({ provider: "anthropic" })).toThrow("API key not found");
      } finally {
        if (originalEnv) {
          process.env.ANTHROPIC_API_KEY = originalEnv;
        }
      }
    });

    it("should throw when API key not found for openrouter", () => {
      const originalEnv = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      try {
        expect(() => configureLLM({ provider: "openrouter" })).toThrow("API key not found");
      } finally {
        if (originalEnv) {
          process.env.OPENROUTER_API_KEY = originalEnv;
        }
      }
    });
  });

  describe("configureLLM.auto", () => {
    it("should throw when no API key in environment", () => {
      const openai = process.env.OPENAI_API_KEY;
      const anthropic = process.env.ANTHROPIC_API_KEY;
      const openrouter = process.env.OPENROUTER_API_KEY;

      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      try {
        expect(() => configureLLM.auto()).toThrow("No API key found in environment");
      } finally {
        if (openai) process.env.OPENAI_API_KEY = openai;
        if (anthropic) process.env.ANTHROPIC_API_KEY = anthropic;
        if (openrouter) process.env.OPENROUTER_API_KEY = openrouter;
      }
    });

    it("should accept defaults option", () => {
      // This will fail because no API key, but tests the signature
      const openai = process.env.OPENAI_API_KEY;
      const anthropic = process.env.ANTHROPIC_API_KEY;
      const openrouter = process.env.OPENROUTER_API_KEY;

      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      try {
        expect(() => configureLLM.auto({ defaults: { evaluationMode: "batch" } })).toThrow(
          "No API key found"
        );
      } finally {
        if (openai) process.env.OPENAI_API_KEY = openai;
        if (anthropic) process.env.ANTHROPIC_API_KEY = anthropic;
        if (openrouter) process.env.OPENROUTER_API_KEY = openrouter;
      }
    });
  });

  describe("testing namespace", () => {
    it("should export reset function", () => {
      setLLMClient(createMockLLMClient());
      setDefaults({ evaluationMode: "batch" });

      testing.reset();

      expect(getLLMClient()).toBeNull();
      expect(getDefaults()).toEqual({});
    });

    it("should export mock function", () => {
      const mock = testing.mock({ response: "test" });
      expect(mock).toBeDefined();
      expect(mock.complete).toBeDefined();
    });

    it("should export withClient function", async () => {
      const mock = testing.mock({ response: "test" });
      let insideClient;

      await testing.withClient(mock, async () => {
        insideClient = getLLMClient();
      });

      expect(insideClient).toBe(mock);
    });

    it("should export sequentialMock function", () => {
      const mock = testing.sequentialMock([{ score: 0.1 }, { score: 0.2 }]);
      expect(mock).toBeDefined();
    });

    it("should export errorMock function", async () => {
      const mock = testing.errorMock("Custom error");
      await expect(mock.complete("test")).rejects.toThrow("Custom error");
    });

    it("should export spyMock function", async () => {
      const { client, prompts } = testing.spyMock({ score: 0.5 });
      await client.complete("prompt 1");
      await client.complete("prompt 2");
      expect(prompts).toEqual(["prompt 1", "prompt 2"]);
    });
  });
});
