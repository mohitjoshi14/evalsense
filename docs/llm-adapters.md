# LLM Client Adapters Guide

This guide shows how to implement LLM client adapters for different providers to use with evalsense metrics.

## Table of Contents

- [Overview](#overview)
- [Client Interface](#client-interface)
- [Provider Examples](#provider-examples)
  - [OpenAI](#openai)
  - [Anthropic](#anthropic)
  - [Local Models (Ollama)](#local-models-ollama)
  - [Azure OpenAI](#azure-openai)
  - [Google Gemini](#google-gemini)
- [Advanced Features](#advanced-features)
- [Testing Your Adapter](#testing-your-adapter)
- [Best Practices](#best-practices)

## Overview

evalsense uses a simple `LLMClient` interface that you implement for your LLM provider. This keeps evalsense provider-agnostic while giving you full control over:

- API authentication
- Model selection
- Rate limiting
- Error handling
- Cost tracking
- Caching

## Client Interface

The minimal interface requires just one method:

```typescript
interface LLMClient {
  // Required: Generate text completion
  complete(prompt: string): Promise<string>;

  // Optional: Generate structured JSON output
  completeStructured?<T>(prompt: string, schema: JSONSchema): Promise<T>;
}
```

**`complete(prompt)`**: Takes a prompt string, returns LLM's text response.

**`completeStructured<T>(prompt, schema)`** (optional): Takes a prompt and JSON schema, returns parsed JSON object. If not provided, evalsense will parse JSON from text responses.

## Provider Examples

### OpenAI

```javascript
import OpenAI from "openai";

export function createOpenAIAdapter(apiKey, options = {}) {
  const {
    model = "gpt-4-turbo-preview",
    temperature = 0,
    maxTokens = 4096,
  } = options;

  const client = new OpenAI({ apiKey });

  return {
    async complete(prompt) {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
      });

      return response.choices[0]?.message?.content ?? "";
    },

    async completeStructured(prompt, schema) {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature,
        max_tokens: maxTokens,
      });

      const text = response.choices[0]?.message?.content ?? "{}";
      return JSON.parse(text);
    },
  };
}

// Usage
import { setLLMClient } from "evalsense/metrics";

const client = createOpenAIAdapter(process.env.OPENAI_API_KEY, {
  model: "gpt-4-turbo-preview",
  temperature: 0,
});

setLLMClient(client);
```

**Cost Optimization for OpenAI:**
```javascript
// Use cheaper model for screening
const screeningClient = createOpenAIAdapter(apiKey, {
  model: "gpt-3.5-turbo",  // Much cheaper
});

// Use powerful model for final evaluation
const productionClient = createOpenAIAdapter(apiKey, {
  model: "gpt-4-turbo-preview",
});
```

### Anthropic

```javascript
import Anthropic from "@anthropic-ai/sdk";

export function createAnthropicAdapter(apiKey, options = {}) {
  const {
    model = "claude-3-5-sonnet-20241022",
    maxTokens = 4096,
  } = options;

  const client = new Anthropic({ apiKey });

  return {
    async complete(prompt) {
      const message = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      });

      return message.content[0].type === "text"
        ? message.content[0].text
        : "";
    },

    // Note: Claude doesn't have built-in JSON mode yet
    // Fall back to parsing from text
  };
}

// Usage
import { setLLMClient } from "evalsense/metrics";

const client = createAnthropicAdapter(process.env.ANTHROPIC_API_KEY, {
  model: "claude-3-5-sonnet-20241022",
});

setLLMClient(client);
```

**Claude Model Selection:**
```javascript
// Haiku: Fast and cheap
createAnthropicAdapter(apiKey, { model: "claude-3-haiku-20240307" });

// Sonnet: Balanced (recommended)
createAnthropicAdapter(apiKey, { model: "claude-3-5-sonnet-20241022" });

// Opus: Most capable
createAnthropicAdapter(apiKey, { model: "claude-3-opus-20240229" });
```

### Local Models (Ollama)

```javascript
export function createOllamaAdapter(options = {}) {
  const {
    model = "llama2",
    baseUrl = "http://localhost:11434",
  } = options;

  return {
    async complete(prompt) {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
        }),
      });

      const data = await response.json();
      return data.response;
    },

    async completeStructured(prompt, schema) {
      // Add JSON formatting instruction
      const jsonPrompt = `${prompt}\n\nYou must respond with valid JSON matching this schema: ${JSON.stringify(schema)}`;

      const response = await this.complete(jsonPrompt);

      // Parse and validate
      try {
        return JSON.parse(response);
      } catch (error) {
        throw new Error(`Failed to parse Ollama response as JSON: ${error.message}`);
      }
    },
  };
}

// Usage
import { setLLMClient } from "evalsense/metrics";

const client = createOllamaAdapter({
  model: "llama2",  // or "mistral", "mixtral", etc.
  baseUrl: "http://localhost:11434",
});

setLLMClient(client);
```

**Benefits of Ollama:**
- Zero API costs
- Full privacy (local inference)
- No rate limits
- Deterministic results

**Considerations:**
- Slower than cloud APIs
- Requires local hardware
- Model quality varies
- Setup overhead

### Azure OpenAI

```javascript
import { OpenAIClient, AzureKeyCredential } from "@azure/openai";

export function createAzureOpenAIAdapter(endpoint, apiKey, deployment) {
  const client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));

  return {
    async complete(prompt) {
      const { choices } = await client.getCompletions(deployment, [prompt], {
        maxTokens: 4096,
        temperature: 0,
      });

      return choices[0]?.text ?? "";
    },

    async completeStructured(prompt, schema) {
      const jsonPrompt = `${prompt}\n\nRespond with JSON only.`;
      const response = await this.complete(jsonPrompt);
      return JSON.parse(response);
    },
  };
}

// Usage
const client = createAzureOpenAIAdapter(
  process.env.AZURE_OPENAI_ENDPOINT,
  process.env.AZURE_OPENAI_API_KEY,
  "gpt-4-deployment-name"
);

setLLMClient(client);
```

### Google Gemini

```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

export function createGeminiAdapter(apiKey, options = {}) {
  const { model = "gemini-pro" } = options;

  const genAI = new GoogleGenerativeAI(apiKey);
  const gemini = genAI.getGenerativeModel({ model });

  return {
    async complete(prompt) {
      const result = await gemini.generateContent(prompt);
      const response = await result.response;
      return response.text();
    },

    async completeStructured(prompt, schema) {
      // Gemini supports JSON mode
      const generationConfig = {
        temperature: 0,
        topP: 1,
        topK: 1,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      };

      const geminiJson = genAI.getGenerativeModel({
        model,
        generationConfig,
      });

      const result = await geminiJson.generateContent(prompt);
      const response = await result.response;
      return JSON.parse(response.text());
    },
  };
}

// Usage
const client = createGeminiAdapter(process.env.GOOGLE_API_KEY, {
  model: "gemini-pro",
});

setLLMClient(client);
```

## Advanced Features

### Rate Limiting

```javascript
import pLimit from "p-limit";

export function createRateLimitedAdapter(baseAdapter, requestsPerMinute) {
  const limit = pLimit(requestsPerMinute / 60);

  return {
    async complete(prompt) {
      return limit(() => baseAdapter.complete(prompt));
    },

    async completeStructured(prompt, schema) {
      if (baseAdapter.completeStructured) {
        return limit(() => baseAdapter.completeStructured(prompt, schema));
      }
      const response = await this.complete(prompt);
      return JSON.parse(response);
    },
  };
}

// Usage
const baseClient = createOpenAIAdapter(apiKey);
const rateLimitedClient = createRateLimitedAdapter(baseClient, 60); // 60 req/min

setLLMClient(rateLimitedClient);
```

### Caching

```javascript
import NodeCache from "node-cache";

export function createCachedAdapter(baseAdapter, ttlSeconds = 3600) {
  const cache = new NodeCache({ stdTTL: ttlSeconds });

  return {
    async complete(prompt) {
      const cached = cache.get(prompt);
      if (cached) return cached;

      const response = await baseAdapter.complete(prompt);
      cache.set(prompt, response);
      return response;
    },

    async completeStructured(prompt, schema) {
      const cacheKey = `${prompt}:${JSON.stringify(schema)}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      let response;
      if (baseAdapter.completeStructured) {
        response = await baseAdapter.completeStructured(prompt, schema);
      } else {
        const text = await this.complete(prompt);
        response = JSON.parse(text);
      }

      cache.set(cacheKey, response);
      return response;
    },
  };
}

// Usage
const baseClient = createOpenAIAdapter(apiKey);
const cachedClient = createCachedAdapter(baseClient, 3600); // 1 hour TTL

setLLMClient(cachedClient);
```

### Retry Logic

```javascript
export function createRetryAdapter(baseAdapter, maxRetries = 3) {
  async function retry(fn, retries = maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, (maxRetries - retries + 1) * 1000)
      );

      return retry(fn, retries - 1);
    }
  }

  return {
    async complete(prompt) {
      return retry(() => baseAdapter.complete(prompt));
    },

    async completeStructured(prompt, schema) {
      return retry(() => {
        if (baseAdapter.completeStructured) {
          return baseAdapter.completeStructured(prompt, schema);
        }
        return this.complete(prompt).then(JSON.parse);
      });
    },
  };
}

// Usage
const baseClient = createOpenAIAdapter(apiKey);
const retryClient = createRetryAdapter(baseClient, 3);

setLLMClient(retryClient);
```

### Cost Tracking

```javascript
export function createCostTrackingAdapter(baseAdapter, costPerToken) {
  let totalTokens = 0;
  let totalCost = 0;

  return {
    async complete(prompt) {
      const response = await baseAdapter.complete(prompt);

      // Estimate tokens (rough)
      const estimatedTokens = Math.ceil((prompt.length + response.length) / 4);
      totalTokens += estimatedTokens;
      totalCost += estimatedTokens * costPerToken;

      return response;
    },

    async completeStructured(prompt, schema) {
      if (baseAdapter.completeStructured) {
        const response = await baseAdapter.completeStructured(prompt, schema);
        const estimatedTokens = Math.ceil(
          (prompt.length + JSON.stringify(response).length) / 4
        );
        totalTokens += estimatedTokens;
        totalCost += estimatedTokens * costPerToken;
        return response;
      }

      return this.complete(prompt).then(JSON.parse);
    },

    getStats() {
      return { totalTokens, totalCost };
    },
  };
}

// Usage
const baseClient = createOpenAIAdapter(apiKey);
const trackingClient = createCostTrackingAdapter(
  baseClient,
  0.00001 // $0.01 per 1K tokens
);

setLLMClient(trackingClient);

// Later, check costs
const stats = trackingClient.getStats();
console.log(`Total cost: $${stats.totalCost.toFixed(2)}`);
```

### Composition

Combine multiple adapters:

```javascript
const baseClient = createOpenAIAdapter(apiKey);
const cachedClient = createCachedAdapter(baseClient);
const rateLimitedClient = createRateLimitedAdapter(cachedClient, 60);
const retryClient = createRetryAdapter(rateLimitedClient, 3);

setLLMClient(retryClient);
```

## Testing Your Adapter

Use the mock client to test without API calls:

```javascript
import { createMockLLMClient, setLLMClient } from "evalsense/metrics";
import { hallucination } from "evalsense/metrics/opinionated";

// Create mock for testing
const mockClient = createMockLLMClient({
  response: {
    score: 0.2,
    hallucinated_claims: [],
    reasoning: "Test response",
  },
});

setLLMClient(mockClient);

// Test your metric usage
const results = await hallucination({
  outputs: [{ id: "1", output: "test" }],
  context: ["context"],
});

console.log(results); // Uses mock, no API call
```

## Best Practices

### 1. Error Handling

```javascript
// ✓ Good: Provide context in errors
async complete(prompt) {
  try {
    return await api.generate(prompt);
  } catch (error) {
    throw new Error(
      `OpenAI API failed: ${error.message}. ` +
      `Status: ${error.status}, Type: ${error.type}`
    );
  }
}

// ✗ Bad: Let errors propagate without context
async complete(prompt) {
  return await api.generate(prompt);
}
```

### 2. Configuration

```javascript
// ✓ Good: Accept options with defaults
export function createAdapter(apiKey, options = {}) {
  const {
    model = "default-model",
    temperature = 0,
    maxTokens = 4096,
    timeout = 30000,
  } = options;
  // ...
}

// ✗ Bad: Hardcode configuration
export function createAdapter(apiKey) {
  const model = "gpt-4"; // No flexibility
  // ...
}
```

### 3. Validation

```javascript
// ✓ Good: Validate inputs
async complete(prompt) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt must be a non-empty string");
  }
  // ...
}

// ✗ Bad: No validation
async complete(prompt) {
  return await api.generate(prompt);
}
```

### 4. Timeouts

```javascript
// ✓ Good: Implement timeouts
async complete(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    return await api.generate(prompt, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// ✗ Bad: No timeout protection
async complete(prompt) {
  return await api.generate(prompt);
}
```

### 5. Logging

```javascript
// ✓ Good: Log for debugging (optional)
async complete(prompt) {
  console.debug(`LLM request: ${prompt.substring(0, 100)}...`);
  const response = await api.generate(prompt);
  console.debug(`LLM response: ${response.substring(0, 100)}...`);
  return response;
}

// But don't log sensitive data
```

## Next Steps

- [LLM Metrics Guide](./llm-metrics.md) - Learn how to use metrics
- [Examples](../examples/) - See complete working examples
- Provider-specific documentation:
  - [OpenAI Docs](https://platform.openai.com/docs)
  - [Anthropic Docs](https://docs.anthropic.com)
  - [Ollama Docs](https://ollama.ai/docs)
