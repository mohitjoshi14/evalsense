# Custom Metrics Guide

This guide shows how to create and use custom metrics in evalsense. Custom metrics let you evaluate model outputs using your own criteria beyond the built-in opinionated metrics.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Metric Types](#metric-types)
- [Complete Example: Answer Correctness](#complete-example-answer-correctness)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)

---

## Overview

### What are Custom Metrics?

Custom metrics are evaluation functions you define to measure specific qualities of model outputs. They produce scores and labels that can be used with evalsense's statistical assertions.

### When to Use Custom Metrics

Use custom metrics when:

- Built-in metrics (hallucination, relevance, faithfulness, toxicity) don't cover your use case
- You have domain-specific evaluation criteria
- You want to implement metrics from research papers (e.g., Ragas, G-Eval)
- You need simple heuristics (keyword matching, regex patterns, length checks)

### Metric Architecture

evalsense provides two ways to create metrics:

1. **`createLLMMetric()`** - Factory for LLM-based metrics (recommended for semantic evaluation)
2. **`createKeywordMetric()`** / `createPatternMetric()`\*\* - Helpers for simple heuristics

All metrics follow the unified record pattern - no more parallel arrays:

```typescript
// Input: Unified records with all fields together
const records = [
  { id: "1", output: "answer", reference: "correct answer" },
  { id: "2", output: "another", reference: "expected" },
];

// Output: MetricOutput array
const results = await myMetric(records);
// [
//   { id: "1", metric: "my-metric", score: 0.85, label: "good" },
//   { id: "2", metric: "my-metric", score: 0.7, label: "fair" },
// ]
```

---

## Quick Start

### 1. LLM-Based Custom Metric (Recommended)

Use `createLLMMetric()` for semantic evaluation:

```javascript
import { createLLMMetric, setLLMClient, createOpenAIAdapter } from "evalsense/metrics";

// Setup LLM client
setLLMClient(createOpenAIAdapter(process.env.OPENAI_API_KEY));

// Create a custom metric
const answerCorrectness = createLLMMetric({
  name: "answer-correctness",
  inputs: ["output", "reference"], // Fields to extract from records
  prompt: `
    Reference Answer: {reference}
    Student Answer: {output}

    Score the correctness of the student answer (0-1).
    Return JSON: {"score": 0.85, "reasoning": "..."}
  `,
  responseFields: { score: "number", reasoning: "string" },
  labels: [
    { min: 0.8, label: "correct" },
    { min: 0.5, label: "partial" },
    { min: 0, label: "incorrect" },
  ],
});

// Use with unified records
const results = await answerCorrectness([
  { id: "1", output: "Paris is the capital of France.", reference: "Paris" },
  { id: "2", output: "It's in Europe somewhere.", reference: "Paris" },
]);
```

### 2. Simple Keyword-Based Metric

```javascript
import { createKeywordMetric } from "evalsense/metrics";

const disclaimerChecker = createKeywordMetric(
  "has-disclaimer",
  ["disclaimer", "not medical advice", "consult professional"],
  { caseSensitive: false, threshold: 0.3 }
);

const results = await disclaimerChecker({
  outputs: [
    { id: "1", output: "This is not medical advice. Consult a doctor." },
    { id: "2", output: "Take these pills daily." },
  ],
});
// [
//   { id: "1", metric: "has-disclaimer", score: 0.66, label: "detected" },
//   { id: "2", metric: "has-disclaimer", score: 0, label: "not_detected" }
// ]
```

### 3. Pattern Matching Metric

```javascript
import { createPatternMetric } from "evalsense/metrics";

const emailDetector = createPatternMetric(
  "contains-email",
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/],
  { matchScore: 1, noMatchScore: 0 }
);
```

---

## Metric Types

### Type 1: Simple Heuristic Metrics

Best for: Fast, deterministic evaluation without LLM calls

**Examples:**

- Length checks
- Keyword detection
- Regex pattern matching
- Readability scores
- Format validation

````javascript
import { createPatternMetric } from "evalsense/metrics";

// Create a word count metric using pattern matching
const codeDetector = createPatternMetric(
  "contains-code",
  [/```[\s\S]*?```/, /function\s+\w+\s*\(/, /const\s+\w+\s*=/],
  { matchScore: 1, noMatchScore: 0 }
);
````

### Type 2: LLM-Based Semantic Metrics

Best for: Nuanced evaluation requiring understanding

**Examples:**

- Answer correctness
- Argument strength
- Creativity
- Politeness
- Domain-specific quality

```javascript
import { createLLMMetric } from "evalsense/metrics";

const politeness = createLLMMetric({
  name: "politeness",
  inputs: ["output"],
  prompt: `
    Evaluate the politeness of this text:
    {output}

    Return JSON: {"score": 0-1, "severity": "polite|neutral|rude", "reasoning": "..."}
  `,
  responseFields: { score: "number", severity: "string", reasoning: "string" },
  labelField: "severity", // Use severity field as label
});

const results = await politeness([
  { id: "1", output: "Thank you for your help!" },
  { id: "2", output: "That's a stupid question." },
]);
```

### Type 3: Comparison Metrics

Best for: Comparing outputs to references

**Examples:**

- Answer correctness
- Semantic similarity
- Factual consistency
- Style matching

```javascript
import { createLLMMetric } from "evalsense/metrics";

const semanticMatch = createLLMMetric({
  name: "semantic-match",
  inputs: ["output", "reference"],
  prompt: `
    Compare the semantic similarity:
    Reference: {reference}
    Output: {output}

    Return JSON: {"score": 0-1, "reasoning": "..."}
  `,
  responseFields: { score: "number", reasoning: "string" },
});

const results = await semanticMatch([
  { id: "1", output: "The capital is Paris", reference: "Paris is the capital of France" },
]);
```

---

## Complete Example: Answer Correctness

This is a production-ready implementation of an "answer correctness" metric inspired by Ragas.

### Using createLLMMetric

```javascript
import { createLLMMetric, setLLMClient, createOpenAIAdapter } from "evalsense/metrics";

// Define the prompt
const ANSWER_CORRECTNESS_PROMPT = `You are an expert evaluator assessing answer quality.

REFERENCE ANSWER (Ground Truth):
{reference}

STUDENT ANSWER (To Evaluate):
{output}

EVALUATION CRITERIA:

1. **Factual Accuracy** (0-1)
   - Are all facts correct?
   - Any contradictions with reference?

2. **Completeness** (0-1)
   - Covers key points from reference?
   - Missing important details?

3. **Overall Correctness** (0-1)
   - Formula: (accuracy * 0.6) + (completeness * 0.4)

Return JSON:
{
  "factual_accuracy": <0-1>,
  "completeness": <0-1>,
  "correctness": <0-1>,
  "reasoning": "<brief explanation>"
}`;

// Create the metric
const answerCorrectness = createLLMMetric({
  name: "answer-correctness",
  inputs: ["output", "reference"],
  prompt: ANSWER_CORRECTNESS_PROMPT,
  responseFields: {
    factual_accuracy: "number",
    completeness: "number",
    correctness: "number",
    reasoning: "string",
  },
  scoreField: "correctness", // Use correctness as the primary score
  labels: [
    { min: 0.8, label: "correct" },
    { min: 0.5, label: "partial" },
    { min: 0, label: "incorrect" },
  ],
});

// Use in eval file
import { describe, evalTest, expectStats } from "evalsense";

setLLMClient(createOpenAIAdapter(process.env.OPENAI_API_KEY));

describe("QA Evaluation", () => {
  evalTest("measure answer quality", async () => {
    const records = [
      { id: "1", output: "Paris is the capital of France.", reference: "Paris" },
      { id: "2", output: "It's in Europe somewhere.", reference: "Paris" },
    ];

    const results = await answerCorrectness(records);

    // Assert quality thresholds
    expectStats(results).field("score").toHavePercentageAbove(0.7, 0.6);
  });
});
```

---

## Best Practices

### 1. Use Unified Records

```javascript
// ✅ Good: Unified records (impossible to mismatch)
await myMetric([
  { id: "1", output: "answer", reference: "correct" },
  { id: "2", output: "answer2", reference: "correct2" },
]);

// ❌ Old pattern (error-prone parallel arrays)
// This was the old API - don't use this
// await runMetric("my-metric", {
//   outputs: [...],
//   references: [...],  // Easy to mismatch lengths!
// });
```

### 2. Score Normalization

`createLLMMetric` automatically normalizes scores to 0-1:

```javascript
// Scores are automatically clamped to 0-1
// If LLM returns score: 1.5, it becomes 1.0
// If LLM returns score: -0.2, it becomes 0.0
```

### 3. Clear Label Thresholds

```javascript
// ✅ Good: Descriptive, ordered thresholds
labels: [
  { min: 0.8, label: "excellent" },
  { min: 0.6, label: "good" },
  { min: 0.4, label: "fair" },
  { min: 0, label: "poor" },
];

// Or use labelField for LLM-generated labels
labelField: "severity"; // Uses LLM's severity field directly
```

### 4. Required vs Optional Inputs

```javascript
// All required inputs
inputs: ["output", "reference", "context"];

// Optional context
inputs: ["output", "reference", { name: "context", required: false }];
```

### 5. Batch Mode for Cost Savings

```javascript
const metric = createLLMMetric({
  // ...
  prompt: "Per-row prompt: {output}",
  batchPrompt: "Evaluate all: {items}", // For batch mode
  defaultMode: "batch", // Default to batch for cost savings
});

// Or specify per-call
await metric(records, { evaluationMode: "batch" });
```

### 6. Custom Prompt Override

```javascript
// Override prompt at runtime for experimentation
await metric(records, {
  customPrompt: "Alternative evaluation prompt: {output}",
});
```

---

## API Reference

### `createLLMMetric(config)`

Create an LLM-based metric function.

**Config:**

```typescript
interface LLMMetricConfig {
  name: string; // Metric name
  inputs: InputSpec[]; // Field names to extract from records
  prompt: string; // Prompt template with {variable} placeholders
  batchPrompt?: string; // Optional batch prompt with {items} placeholder
  responseFields: Record<string, "string" | "number" | "boolean" | "array">;
  scoreField?: string; // Which response field is the score (default: "score")
  labelField?: string; // Use this response field as label (instead of thresholds)
  labels?: Array<{ min: number; label: string }>; // Score-to-label thresholds
  defaultMode?: "per-row" | "batch"; // Default evaluation mode
}
```

**Returns:** `LLMMetric` - A function that takes records and options

**Example:**

```javascript
const metric = createLLMMetric({
  name: "quality",
  inputs: ["output"],
  prompt: "Rate quality: {output}\nReturn: {score, reasoning}",
  responseFields: { score: "number", reasoning: "string" },
});

const results = await metric([{ id: "1", output: "Hello" }]);
```

### `createKeywordMetric(name, keywords, options)`

Create a keyword-matching metric.

**Parameters:**

- `name: string` - Metric name
- `keywords: string[]` - Keywords to detect
- `options` - `{ caseSensitive?: boolean, threshold?: number }`

**Returns:** `MetricFn` (takes `{ outputs }` config object)

### `createPatternMetric(name, patterns, options)`

Create a regex pattern-matching metric.

**Parameters:**

- `name: string` - Metric name
- `patterns: RegExp[]` - Regex patterns to match
- `options` - `{ matchScore?: number, noMatchScore?: number }`

**Returns:** `MetricFn` (takes `{ outputs }` config object)

### Type: `EvalRecord`

```typescript
interface EvalRecord {
  id: string; // Required: unique identifier
  [field: string]: unknown; // Any additional fields (output, context, etc.)
}
```

### Type: `LLMMetricOptions`

```typescript
interface LLMMetricOptions {
  evaluationMode?: "per-row" | "batch"; // Override default mode
  llmClient?: LLMClient; // Override global client
  customPrompt?: string; // Override prompt template
}
```

### Type: `MetricOutput`

```typescript
interface MetricOutput {
  id: string; // Matches input record ID
  metric: string; // Metric name
  score: number; // Numeric score (0-1)
  label?: string; // Categorical label
  reasoning?: string; // LLM explanation
  evaluationMode?: "per-row" | "batch";
}
```

---

## Migration from Old API

If you were using the old `registerMetric`/`runMetric` API:

```javascript
// OLD (deprecated)
registerMetric("my-metric", async (config) => {
  const { outputs, references } = config;
  // 90+ lines of boilerplate...
});
await runMetric("my-metric", { outputs, references });

// NEW (recommended)
const myMetric = createLLMMetric({
  name: "my-metric",
  inputs: ["output", "reference"],
  prompt: "...",
  responseFields: { score: "number" },
});
await myMetric([{ id: "1", output: "...", reference: "..." }]);
```

Key differences:

- No registration step - factory returns a callable function
- Unified records instead of parallel arrays
- Declarative config instead of imperative code
- 15 lines instead of 90+ lines

---

## Complete Examples

See these files for full working examples:

- **`examples/answer-correctness.eval.js`** - LLM-based answer correctness metric
- **`examples/custom-metrics-example.eval.js`** - Multiple custom metric patterns
- **`examples/uc4-judge-validation.eval.js`** - Validating metrics against ground truth

---

## Next Steps

1. **Start simple**: Use `createLLMMetric()` with a basic prompt
2. **Iterate on prompts**: Refine based on evaluation results
3. **Add batch mode**: Reduce costs with batch evaluation
4. **Validate metrics**: Use UC4 pattern to compare against human labels
5. **Share metrics**: Publish your custom metrics as npm packages

Need help? Open an issue at https://github.com/yourusername/evalsense/issues
