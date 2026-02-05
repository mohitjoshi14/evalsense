# Migration Guide: v0.1.x → v0.2.0

This guide helps you migrate from evalsense v0.1.x (heuristic metrics) to v0.2.0 (LLM-based metrics).

## Breaking Changes

### 1. Metrics Require LLM Client

**v0.1.x** (heuristic - worked without configuration):
```javascript
import { hallucination } from "evalsense/metrics/opinionated";

// Worked immediately
const results = await hallucination({ outputs, context });
```

**v0.2.0** (LLM-based - requires client):
```javascript
import { setLLMClient, hallucination } from "evalsense/metrics";

// ❌ This will throw: "hallucination() requires an LLM client"
// const results = await hallucination({ outputs, context });

// ✅ Set up LLM client first
setLLMClient({
  async complete(prompt) {
    return await yourLLM.generate(prompt);
  },
});

// Now it works
const results = await hallucination({ outputs, context });
```

### 2. Removed Heuristic Implementations

**What's Removed:**
- All heuristic/pattern-matching implementations
- `toxicityDetailed()` function
- `ToxicityCategories` constant
- `DetailedToxicityResult` type

**v0.1.x**:
```javascript
import {
  toxicity,
  toxicityDetailed,
  ToxicityCategories
} from "evalsense/metrics/opinionated";

const detailed = await toxicityDetailed({ outputs });
console.log(detailed[0].categories); // Array of categories
```

**v0.2.0**:
```javascript
import { toxicity } from "evalsense/metrics/opinionated";

// toxicityDetailed() removed - use toxicity() instead
const results = await toxicity({ outputs });

// Categories are now in reasoning (from LLM)
console.log(results[0].reasoning); // Includes category information
```

### 3. MetricOutput Changes

**Added Fields:**
- `reasoning?: string` - LLM's explanation
- `evaluationMode?: "per-row" | "batch"` - Evaluation mode used

**v0.1.x**:
```javascript
{
  id: "1",
  metric: "hallucination",
  score: 0.8,
  label: "true"
}
```

**v0.2.0**:
```javascript
{
  id: "1",
  metric: "hallucination",
  score: 0.8,
  label: "true",
  reasoning: "Output claims 50M population, context says 2.1M",
  evaluationMode: "per-row"
}
```

### 4. MetricConfig Changes

**Added Fields:**
- `llmClient?: LLMClient` - Override global client
- `evaluationMode?: "per-row" | "batch"` - Choose mode (default: "per-row")
- `customPrompt?: string` - Override default prompt
- `temperature?: number` - LLM temperature
- `maxTokens?: number` - Max tokens
- `timeout?: number` - Request timeout

**v0.2.0**:
```javascript
await hallucination({
  outputs,
  context,
  // New options
  llmClient: customClient,
  evaluationMode: "batch",
  customPrompt: "...",
  temperature: 0.7,
});
```

## Migration Steps

### Step 1: Install v0.2.0

```bash
npm install evalsense@^0.2.0
```

### Step 2: Choose LLM Provider

Pick one based on your needs:

| Provider | Pros | Cons | Cost |
|----------|------|------|------|
| OpenAI GPT-4 | High quality, JSON mode | Expensive | $$$ |
| OpenAI GPT-3.5 | Good quality, affordable | Less accurate | $ |
| Anthropic Claude | High quality, long context | No JSON mode | $$ |
| Ollama (local) | Free, private | Slower, needs hardware | Free |
| Azure OpenAI | Enterprise features | Setup complexity | $$ |

### Step 3: Implement LLM Adapter

See [LLM Adapters Guide](./llm-adapters.md) for detailed examples.

**Quick Start (OpenAI)**:
```javascript
import OpenAI from "openai";
import { setLLMClient } from "evalsense/metrics";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

setLLMClient({
  async complete(prompt) {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });
    return response.choices[0]?.message?.content ?? "";
  },
});
```

### Step 4: Update Metric Usage

**Before (v0.1.x)**:
```javascript
import { hallucination, relevance, faithfulness, toxicity }
  from "evalsense/metrics/opinionated";

// Just call directly
const h = await hallucination({ outputs, context });
const r = await relevance({ outputs, query });
const f = await faithfulness({ outputs, source });
const t = await toxicity({ outputs });
```

**After (v0.2.0)**:
```javascript
import { setLLMClient } from "evalsense/metrics";
import { hallucination, relevance, faithfulness, toxicity }
  from "evalsense/metrics/opinionated";

// Set up client ONCE (global setup)
setLLMClient(myLLMClient);

// Then call as before (or with new options)
const h = await hallucination({ outputs, context });
const r = await relevance({ outputs, query });
const f = await faithfulness({ outputs, source });
const t = await toxicity({ outputs });
```

### Step 5: Handle New Features

**Use evaluation modes for cost optimization**:
```javascript
// Development: Use batch mode (cheaper)
if (process.env.NODE_ENV === "development") {
  results = await hallucination({
    outputs,
    context,
    evaluationMode: "batch",
  });
}

// Production: Use per-row (accurate)
else {
  results = await hallucination({
    outputs,
    context,
    evaluationMode: "per-row",
  });
}
```

**Leverage reasoning for debugging**:
```javascript
const results = await hallucination({ outputs, context });

results.forEach((result) => {
  console.log(`Score: ${result.score}`);
  console.log(`Reasoning: ${result.reasoning}`); // NEW: LLM explanation
});
```

### Step 6: Update Tests

**Before (v0.1.x)**:
```javascript
describe("hallucination tests", () => {
  it("detects hallucinations", async () => {
    const results = await hallucination({ outputs, context });
    expect(results[0].score).toBeGreaterThan(0.5);
  });
});
```

**After (v0.2.0)**:
```javascript
import { setLLMClient, createMockLLMClient } from "evalsense/metrics";

describe("hallucination tests", () => {
  beforeEach(() => {
    // Use mock client for tests
    const mockClient = createMockLLMClient({
      response: {
        score: 0.8,
        hallucinated_claims: ["fake claim"],
        reasoning: "Test reasoning",
      },
    });
    setLLMClient(mockClient);
  });

  it("detects hallucinations", async () => {
    const results = await hallucination({ outputs, context });
    expect(results[0].score).toBe(0.8); // Mock returns exact value
    expect(results[0].reasoning).toBe("Test reasoning");
  });
});
```

## Compatibility Layer

If you need gradual migration, create a compatibility wrapper:

```javascript
// legacy-metrics.js
import { setLLMClient, createMockLLMClient } from "evalsense/metrics";
import * as metrics from "evalsense/metrics/opinionated";

// Use heuristic-like mock for backward compatibility
const heuristicMock = createMockLLMClient({
  response: { score: 0.5, reasoning: "Heuristic fallback" },
});

setLLMClient(heuristicMock);

// Re-export with warning
export const hallucination = (...args) => {
  console.warn("Using mock LLM. Configure real LLM client for production.");
  return metrics.hallucination(...args);
};

// Export others similarly
export const relevance = (...args) => {
  console.warn("Using mock LLM. Configure real LLM client for production.");
  return metrics.relevance(...args);
};
```

## Common Issues

### Issue 1: "requires an LLM client" Error

**Cause**: Forgot to call `setLLMClient()`.

**Fix**:
```javascript
import { setLLMClient } from "evalsense/metrics";
setLLMClient(yourClient);
```

### Issue 2: Scores Different from v0.1.x

**Cause**: LLM-based metrics are fundamentally different from heuristics.

**Expected**: Scores will differ because:
- LLMs understand context semantically
- Heuristics used pattern matching
- LLMs provide reasoning-based scores

**Action**: Recalibrate thresholds based on v0.2.0 results.

**Example**:
```javascript
// v0.1.x threshold
expectStats(result).field("hallucination").toHaveAccuracyAbove(0.8);

// v0.2.0 might need different threshold
expectStats(result).field("hallucination").toHaveAccuracyAbove(0.75);
```

### Issue 3: Tests Failing

**Cause**: Tests relied on deterministic heuristic behavior.

**Fix**: Use mock client for deterministic tests:
```javascript
import { createMockLLMClient, setLLMClient } from "evalsense/metrics";

beforeEach(() => {
  setLLMClient(createMockLLMClient({
    response: { score: 0.5, reasoning: "Mock" }
  }));
});
```

### Issue 4: Slow Evaluation

**Cause**: Per-row mode makes N API calls for N outputs.

**Fix**: Use batch mode or optimize:
```javascript
// Option 1: Batch mode
await hallucination({ outputs, context, evaluationMode: "batch" });

// Option 2: Parallel per-row (if your client supports it)
// Most clients handle this internally via Promise.all

// Option 3: Sample instead of full evaluation
const sample = outputs.slice(0, 100); // Evaluate first 100
```

### Issue 5: High Costs

**Cause**: LLM API calls cost money.

**Solutions**:
1. Use batch mode
2. Use cheaper models (GPT-3.5 vs GPT-4)
3. Cache results
4. Sample evaluation
5. Use local models (Ollama)

```javascript
// Cost optimization strategy
const config = {
  outputs,
  context,
  evaluationMode: "batch", // 1. Batch mode
  llmClient: cheaperModel,  // 2. Cheaper model
};

// 3. Cache wrapper
const cachedClient = createCachedAdapter(cheaperModel);
config.llmClient = cachedClient;
```

## Feature Comparison

| Feature | v0.1.x | v0.2.0 |
|---------|--------|--------|
| Hallucination Detection | Pattern matching | LLM semantic understanding |
| Relevance | Keyword overlap | LLM query-response alignment |
| Faithfulness | N-gram similarity | LLM fact verification |
| Toxicity | Regex patterns | LLM content moderation |
| Accuracy | Low-Medium | High |
| Cost | Free | Varies by provider |
| Speed | Fast | Slower (API calls) |
| Explainability | None | Full reasoning provided |
| Customization | Limited | Custom prompts |
| Configuration Required | No | Yes (LLM client) |

## Benefits of Upgrading

### 1. Higher Accuracy

**v0.1.x** (heuristic):
```
Context: "Paris is the capital of France with 2.1M people."
Output: "France's capital, Paris, has a population of 2.1 million."

Heuristic: 0.6 (missed paraphrase, flagged as partial hallucination)
```

**v0.2.0** (LLM):
```
LLM: 0.05 (correctly recognized paraphrase as accurate)
Reasoning: "Output accurately paraphrases context. Numbers match."
```

### 2. Explainability

```javascript
const results = await hallucination({ outputs, context });

// v0.1.x: No explanation
console.log(results[0].score); // 0.8

// v0.2.0: Full explanation
console.log(results[0].score); // 0.8
console.log(results[0].reasoning);
// "Output claims 50M population but context states 2.1M.
//  This is a significant factual error."
```

### 3. Customization

```javascript
// v0.2.0: Domain-specific evaluation
const medicalPrompt = `Evaluate as medical fact-checker...`;

await hallucination({
  outputs,
  context,
  customPrompt: medicalPrompt, // Specialized for medical domain
});
```

### 4. Cost Control

```javascript
// Choose tradeoff: accuracy vs cost
const results = await hallucination({
  outputs,
  context,
  evaluationMode: "batch", // 99% cost reduction for large datasets
});
```

## Rollback Plan

If you need to rollback to v0.1.x:

```bash
# Reinstall v0.1.x
npm install evalsense@^0.1.0

# Remove LLM client code
# Remove new configuration options
# Restore original threshold values
```

Note: Consider keeping v0.1.x installed as `evalsense-legacy` if you need both:

```json
{
  "dependencies": {
    "evalsense": "^0.2.0",
    "evalsense-legacy": "npm:evalsense@^0.1.0"
  }
}
```

## Getting Help

- [LLM Metrics Guide](./llm-metrics.md)
- [LLM Adapters Guide](./llm-adapters.md)
- [Examples](../examples/)
- [GitHub Issues](https://github.com/yourusername/evalsense/issues)

## Checklist

- [ ] Installed v0.2.0
- [ ] Chose LLM provider
- [ ] Implemented LLM adapter
- [ ] Called `setLLMClient()` in setup
- [ ] Updated metric calls (added new options if needed)
- [ ] Updated tests (using mock client)
- [ ] Recalibrated thresholds
- [ ] Tested evaluation modes
- [ ] Considered cost optimization
- [ ] Updated documentation/comments
