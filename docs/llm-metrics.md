# LLM-Based Metrics Guide

This guide covers evalsense's LLM-based evaluation metrics for hallucination detection, relevance assessment, faithfulness verification, and toxicity detection.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Available Metrics](#available-metrics)
- [Evaluation Modes](#evaluation-modes)
- [Configuration](#configuration)
- [Custom Prompts](#custom-prompts)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

evalsense v0.2.0 introduces **LLM-based evaluation metrics** that use language models to assess output quality. These metrics provide:

- **Higher Accuracy**: LLMs understand context and nuance better than heuristics
- **Explainability**: Each evaluation includes detailed reasoning
- **Flexibility**: Support for custom prompts and domain-specific criteria
- **Two Modes**: Choose between accuracy (per-row) or cost efficiency (batch)

### Why LLM-Based Evaluation?

Traditional heuristic metrics struggle with:
- Semantic understanding
- Context-dependent evaluation
- Paraphrasing and synonyms
- Subtle nuances in toxicity or relevance

LLM-based metrics excel at these tasks by leveraging the same language understanding capabilities that power modern AI applications.

## Quick Start

### 1. Install evalsense

```bash
npm install evalsense
```

### 2. Set Up LLM Client

```javascript
import { setLLMClient } from "evalsense/metrics";

// Implement your LLM client adapter
const myLLMClient = {
  async complete(prompt) {
    // Call your LLM API here (OpenAI, Anthropic, etc.)
    const response = await yourLLM.generate(prompt);
    return response.text;
  }
};

// Configure globally (one-time setup)
setLLMClient(myLLMClient);
```

### 3. Use Metrics

```javascript
import { hallucination, relevance } from "evalsense/metrics/opinionated";

// Detect hallucinations
const results = await hallucination({
  outputs: [
    { id: "1", output: "Paris has 50 million people." }
  ],
  context: ["Paris has approximately 2.1 million residents."]
});

console.log(results[0].score);      // 0.9 (high hallucination)
console.log(results[0].reasoning);  // "Output claims 50M, context says 2.1M"
```

## Available Metrics

### Hallucination

Detects claims in outputs that are not supported by the provided context.

```javascript
import { hallucination } from "evalsense/metrics/opinionated";

const results = await hallucination({
  outputs: [{ id: "1", output: "..." }],
  context: ["Reference text that output should align with"],
  evaluationMode: "per-row",  // or "batch"
});
```

**Returns:**
- `score`: 0.0 (no hallucinations) to 1.0 (severe hallucinations)
- `label`: "true" (has hallucinations) or "false" (accurate)
- `reasoning`: LLM's explanation

**Use Cases:**
- RAG applications (verify citations)
- Summarization (check factual accuracy)
- Question answering (validate answers)

### Relevance

Measures how well outputs address the input query.

```javascript
import { relevance } from "evalsense/metrics/opinionated";

const results = await relevance({
  outputs: [{ id: "1", output: "..." }],
  query: ["What is the capital of France?"],
});
```

**Returns:**
- `score`: 0.0 (irrelevant) to 1.0 (highly relevant)
- `label`: "high", "medium", or "low"
- `reasoning`: LLM's explanation

**Use Cases:**
- Search results evaluation
- Chatbot response quality
- Q&A system accuracy

### Faithfulness

Evaluates whether outputs are faithful to source material without contradictions.

```javascript
import { faithfulness } from "evalsense/metrics/opinionated";

const results = await faithfulness({
  outputs: [{ id: "1", output: "..." }],
  source: ["Original source material"],
});
```

**Returns:**
- `score`: 0.0 (unfaithful) to 1.0 (fully faithful)
- `label`: "high", "medium", or "low"
- `reasoning`: LLM's explanation

**Use Cases:**
- Document summarization
- Content rewriting
- Translation verification

### Toxicity

Detects toxic, harmful, or inappropriate content.

```javascript
import { toxicity } from "evalsense/metrics/opinionated";

const results = await toxicity({
  outputs: [{ id: "1", output: "..." }],
});
```

**Returns:**
- `score`: 0.0 (safe) to 1.0 (severely toxic)
- `label`: "none", "mild", "moderate", or "severe"
- `reasoning`: LLM's explanation

**Use Cases:**
- Content moderation
- Customer service quality
- Safety guardrails

## Evaluation Modes

evalsense supports two evaluation modes with different tradeoffs:

### Per-Row Mode (Default)

Evaluates each output individually with separate LLM calls.

```javascript
const results = await hallucination({
  outputs,
  context,
  evaluationMode: "per-row"  // Default
});
```

**Advantages:**
- ✓ Higher accuracy (independent evaluations)
- ✓ No cross-contamination between outputs
- ✓ Better for complex outputs
- ✓ Easier to parallelize

**Disadvantages:**
- ✗ Higher cost (N API calls for N outputs)
- ✗ Higher latency
- ✗ More API quota usage

**When to use:**
- Production monitoring
- High-stakes evaluation
- Complex or lengthy outputs
- Budget allows multiple calls

### Batch Mode

Evaluates all outputs in a single LLM call.

```javascript
const results = await hallucination({
  outputs,
  context,
  evaluationMode: "batch"
});
```

**Advantages:**
- ✓ Lower cost (1 API call total)
- ✓ Lower latency
- ✓ Efficient for large volumes
- ✓ Reduced API quota usage

**Disadvantages:**
- ✗ Potentially less accurate
- ✗ LLM sees all outputs (may compare)
- ✗ Longer prompts (token limits)
- ✗ Less consistent scoring

**When to use:**
- Cost-sensitive scenarios
- Development/testing
- Simple or short outputs
- Large-scale batch processing

### Hybrid Strategy

Combine both modes for optimal cost/accuracy:

```javascript
// 1. Batch screening (cheap)
const batchResults = await hallucination({
  outputs,
  context,
  evaluationMode: "batch"
});

// 2. Identify edge cases (near threshold)
const edgeCases = batchResults.filter(r =>
  r.score > 0.4 && r.score < 0.6
);

// 3. Re-evaluate edge cases with per-row (accurate)
const perRowResults = await hallucination({
  outputs: edgeCasesOutputs,
  context: edgeCasesContext,
  evaluationMode: "per-row"
});
```

**Cost Savings Example:**
- 1000 outputs
- Per-row only: 1000 API calls
- Hybrid (10% edge cases): 101 API calls (90% savings)

## Configuration

### Global Client Setup

Set LLM client once, use everywhere:

```javascript
import { setLLMClient } from "evalsense/metrics";

setLLMClient(myClient);

// All metrics now use this client
await hallucination({ outputs, context });
await relevance({ outputs, query });
```

### Per-Call Override

Override client for specific calls:

```javascript
await hallucination({
  outputs,
  context,
  llmClient: differentClient  // Use this instead of global
});
```

### Additional Options

```javascript
await hallucination({
  outputs,
  context,

  // Evaluation settings
  evaluationMode: "per-row",    // or "batch"
  customPrompt: "...",          // Override default prompt

  // LLM settings (if supported by client)
  temperature: 0,               // Lower = more deterministic
  maxTokens: 4096,             // Max response length
  timeout: 30000,              // Request timeout (ms)

  // Client override
  llmClient: customClient,
});
```

## Custom Prompts

Override default prompts for domain-specific evaluation:

```javascript
const medicalPrompt = `You are a medical fact-checker.

CONTEXT: {context}
OUTPUT: {output}

Check for medical accuracy. Be strict with dosages and terminology.
Return JSON: {"score": <0-1>, "hallucinated_claims": [...], "reasoning": "..."}`;

const results = await hallucination({
  outputs,
  context,
  customPrompt: medicalPrompt
});
```

### Variable Substitution

Available variables in prompts:
- **Hallucination**: `{context}`, `{output}`
- **Relevance**: `{query}`, `{output}`
- **Faithfulness**: `{source}`, `{output}`
- **Toxicity**: `{output}`
- **Batch mode**: `{items}` (JSON array)

### Best Practices

1. **Be Specific**: Define exact scoring criteria
2. **Use Examples**: Include few-shot examples in prompts
3. **Request JSON**: Always ask for structured output
4. **Define Ranges**: Explain what each score means
5. **Test Thoroughly**: Validate with diverse inputs

See [examples/llm-custom-prompt.eval.js](../examples/llm-custom-prompt.eval.js) for more examples.

## Best Practices

### 1. Client Implementation

```javascript
// ✓ Good: Handle errors gracefully
async complete(prompt) {
  try {
    const response = await api.generate(prompt);
    return response.text;
  } catch (error) {
    throw new Error(`LLM API failed: ${error.message}`);
  }
}

// ✗ Bad: Let errors propagate without context
async complete(prompt) {
  return (await api.generate(prompt)).text;
}
```

### 2. Prompt Engineering

```javascript
// ✓ Good: Structured with clear instructions
const prompt = `TASK: Evaluate hallucinations
CONTEXT: {context}
OUTPUT: {output}
SCORING: 0.0 = accurate, 1.0 = hallucinated
FORMAT: JSON with score and reasoning`;

// ✗ Bad: Vague instructions
const prompt = `Check if this is accurate: {output}`;
```

### 3. Error Handling

```javascript
try {
  const results = await hallucination({ outputs, context });
} catch (error) {
  if (error.message.includes("requires an LLM client")) {
    // Configure client
    setLLMClient(myClient);
  } else if (error.message.includes("LLM evaluation failed")) {
    // Handle API errors
    console.error("LLM API issue:", error);
  }
}
```

### 4. Cost Optimization

- Use batch mode for large volumes
- Cache results to avoid re-evaluation
- Use cheaper/faster models for screening
- Implement rate limiting
- Monitor API costs

### 5. Quality Assurance

- Validate metrics against human references
- Monitor score distributions
- Check reasoning for consistency
- A/B test prompt variations
- Calibrate thresholds

## Troubleshooting

### "requires an LLM client" Error

**Cause**: No LLM client configured.

**Solution**:
```javascript
import { setLLMClient } from "evalsense/metrics";
setLLMClient(yourClient);
```

### "Failed to parse LLM response as JSON"

**Cause**: LLM returned non-JSON text.

**Solutions**:
1. Use structured output if available (client.completeStructured)
2. Improve prompt to explicitly request JSON
3. Add examples of expected JSON format

### Inconsistent Scores

**Causes**:
- High temperature setting
- Vague prompt instructions
- Batch mode cross-contamination

**Solutions**:
- Set temperature to 0
- Add clear scoring criteria to prompt
- Use per-row mode for consistency

### Timeout Errors

**Causes**:
- Large batch sizes
- Slow LLM API
- Network issues

**Solutions**:
- Reduce batch size
- Increase timeout setting
- Use faster model
- Implement retries

### High Costs

**Solutions**:
- Use batch mode
- Use cheaper models (e.g., GPT-3.5 vs GPT-4)
- Cache results
- Sample instead of full evaluation
- Use hybrid strategy

## Next Steps

- [LLM Adapters Guide](./llm-adapters.md) - Implement clients for different providers
- [Migration Guide](./migration-v0.2.md) - Upgrade from v0.1.x
- [Examples](../examples/) - See working code examples

## API Reference

See TypeScript definitions in `src/core/types.ts`:
- `LLMClient` interface
- `MetricConfig` interface
- `MetricOutput` interface
