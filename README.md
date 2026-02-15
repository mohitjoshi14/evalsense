[![Evalsense logo](./brand/evalsense.png)](https://www.evlasense.com)

[![npm version](https://img.shields.io/npm/v/evalsense.svg)](https://www.npmjs.com/package/evalsense)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> JS-native LLM evaluation framework with Jest-like API and statistical assertions

**EvalSense is like Jest for testing code that uses LLMs.**

It helps engineers answer one simple question:

> **“Is my LLM-powered code good enough to ship?”**

Instead of checking a few example responses, evalsense runs your code across many inputs, measures overall quality, and gives you a clear **pass / fail** result — locally or in CI.

evalsense is built for **engineers deploying LLM-enabled features**, not for training or benchmarking models.

## What problem does EvalSense solve?

Most LLM evaluation tools focus on individual outputs:

> _“How good is this one response?”_

That’s useful, but it doesn’t tell you whether your system is reliable.

evalsense answers a different question:

> **“Does my code consistently meet our quality bar?”**

It treats evaluation like testing:

- run your code many times
- measure results across all runs
- fail fast if quality drops

## How EvalSense works (in plain terms)

At a high level, evalsense:

1. Runs your code
   (this can be a function, module, API call, or a fixed dataset)
2. Collects the results
3. Scores them using:
   - standard metrics (accuracy, precision, recall, F1)
   - LLM-as-judge checks (e.g. relevance, hallucination, correctness)

4. Aggregates scores across all results
5. Applies rules you define
6. Passes or fails the test

Think of it as **unit tests for output quality**.

## A quick example

```ts
describe("test answer quality", async () => {
  evalTest("toxicity detection", async () => {
    const answers = await generateAnswersDataset(testQuestions);
    const toxicityScore = await toxicity(answers);

    expectStats(toxicityScore)
      .field("score")
      .percentageBelow(0.5).toBeAtLeast(0.5)
  };

  evalTest("correctness score", async () => {
    const answers = await generateAnswersDataset(testQuestions);
    const groundTruth = await JSON.parse(readFileSync("truth-dataset.json"));

    expectStats(answers, groundTruth)
      .field("label")
      .accuracy.toBeAtLeast(0.9)
      .precision("positive").toBeAtLeast(0.7)
      .recall("positive").toBeAtLeast(0.7)
      .displayConfusionMatrix();
  }
});
```

Running the test:

```markdown
**test answer quality**

    ✓ toxicity detection (1ms)
      ✓ 50.0% of 'score' values are below or equal to 0.5 (expected >= 50.0%)
        Expected: 50.0%
        Actual:   50.0%

    ✓ correctness score (1ms)
      Field: label | Accuracy: 100.0% | F1: 100.0%
        negative: P=100.0% R=100.0% F1=100.0% (n=5)
        positive: P=100.0% R=100.0% F1=100.0% (n=5)

Confusion Matrix: label

Predicted →   correct incorrect
Actual ↓
  correct           5        0
  incorrect         0        5

      ✓ Accuracy 100.0% >= 90.0%
        Expected: 90.0%
        Actual:   100.0%
      ✓ Precision for 'positive' 100.0% >= 70.0%
        Expected: 70.0%
        Actual:   100.0%
      ✓ Recall for 'positive' 100.0% >= 70.0%
        Expected: 70.0%
        Actual:   100.0%
      ✓ Confusion matrix recorded for field "label"
```

If the quality drops, the test fails — just like a normal test.

## Two common ways to use evalsense

### 1. When you **don’t have ground truth**

Use this when there are no labels.

Example:

- Run your LLM-powered function
- Score outputs using an LLM-as-judge (relevance, hallucination, etc.)
- Define what “acceptable” means
- Fail if quality degrades

**Example rule:**

> “Average relevance score must be at least 0.75”

### 2. When you **do have ground truth**

Use this when correct answers are known.

Example:

- Run your prediction code
- Compare outputs with ground truth
- Compute accuracy, precision, recall, F1
- Optionally add LLM-as-judge checks
- Fail if metrics fall below thresholds

**Example rule:**

> “F1 score must be ≥ 0.85 and false positives ≤ 5%”

## What evalsense is _not_

evalsense is **not**:

- A tool for scoring single responses in isolation
- A dashboard or experiment-tracking platform
- A system for analyzing agent step-by-step traces
- A model benchmarking or training framework

If you mainly want scores, charts, or leaderboards, other tools may be a better fit.

## Who should use evalsense

evalsense is a good fit if you:

- are **shipping LLM-powered features**
- want **clear pass/fail quality gates**
- run checks in **CI/CD**
- care about **regressions** (“did this get worse?”)
- already think in terms of tests
- work in **JavaScript / TypeScript**

## Who should _not_ use evalsense

evalsense may not be right for you if you:

- only care about individual output scores
- want visual dashboards or experiment UIs
- need deep agent trace inspection
- are training or benchmarking foundation models

## In one sentence

**evalsense lets you test the quality of LLM-powered code the same way you test everything else — with clear pass/fail results.**

## Installation

```bash
npm install --save-dev evalsense
```

Or with yarn:

```bash
yarn add -D evalsense
```

## Quick Start

Create a file named `sentiment.eval.js`:

```javascript
import { describe, evalTest, expectStats } from "evalsense";
import { readFileSync } from "fs";

// Your model function - can be any JS function
function classifySentiment(text) {
  const lower = text.toLowerCase();
  const hasPositive = /love|amazing|great|fantastic|perfect/.test(lower);
  const hasNegative = /terrible|worst|disappointed|waste/.test(lower);
  return hasPositive && !hasNegative ? "positive" : "negative";
}

describe("Sentiment classifier", () => {
  evalTest("accuracy above 80%", async () => {
    // 1. Load ground truth data
    const groundTruth = JSON.parse(readFileSync("./sentiment.json", "utf-8"));

    // 2. Run your model and collect predictions
    const predictions = groundTruth.map((record) => ({
      id: record.id,
      sentiment: classifySentiment(record.text),
    }));

    // 3. Assert on statistical properties
    expectStats(predictions, groundTruth)
      .field("sentiment")
      .accuracy.toBeAtLeast(0.8)
      .recall("positive").toBeAtLeast(0.7)
      .precision("positive").toBeAtLeast(0.7)
      .displayConfusionMatrix();
  });
});
```

Create `sentiment.json`:

```json
[
  { "id": "1", "text": "I love this product!", "sentiment": "positive" },
  { "id": "2", "text": "Terrible experience.", "sentiment": "negative" },
  { "id": "3", "text": "Great quality!", "sentiment": "positive" }
]
```

Run the evaluation:

```bash
npx evalsense run sentiment.eval.js
```

## Usage

### Basic Classification Example

```javascript
import { describe, evalTest, expectStats } from "evalsense";
import { readFileSync } from "fs";

describe("Spam classifier", () => {
  evalTest("high precision and recall", async () => {
    const groundTruth = JSON.parse(readFileSync("./emails.json", "utf-8"));

    const predictions = groundTruth.map((record) => ({
      id: record.id,
      isSpam: classifyEmail(record.text),
    }));

    expectStats(predictions, groundTruth)
      .field("isSpam")
      .accuracy.toBeAtLeast(0.9)
      .precision(true).toBeAtLeast(0.85) // Precision for spam=true
      .recall(true).toBeAtLeast(0.85) // Recall for spam=true
      .displayConfusionMatrix();
  });
});
```

### Continuous Scores with Binarization

```javascript
import { describe, evalTest, expectStats } from "evalsense";
import { readFileSync } from "fs";

describe("Hallucination detector", () => {
  evalTest("detect hallucinations with 70% recall", async () => {
    const groundTruth = JSON.parse(readFileSync("./outputs.json", "utf-8"));

    // Your model returns a continuous score (0.0 to 1.0)
    const predictions = groundTruth.map((record) => ({
      id: record.id,
      hallucinated: computeHallucinationScore(record.output),
    }));

    // Binarize the score at threshold 0.3
    expectStats(predictions, groundTruth)
      .field("hallucinated")
      .binarize(0.3) // >= 0.3 means hallucinated
      .recall(true).toBeAtLeast(0.7)
      .precision(true).toBeAtLeast(0.6)
      .displayConfusionMatrix();
  });
});
```

### Multi-class Classification

```javascript
import { describe, evalTest, expectStats } from "evalsense";
import { readFileSync } from "fs";

describe("Intent classifier", () => {
  evalTest("balanced performance across intents", async () => {
    const groundTruth = JSON.parse(readFileSync("./intents.json", "utf-8"));

    const predictions = groundTruth.map((record) => ({
      id: record.id,
      intent: classifyIntent(record.query),
    }));

    expectStats(predictions, groundTruth)
      .field("intent")
      .accuracy.toBeAtLeast(0.85)
      .recall("purchase").toBeAtLeast(0.8)
      .recall("support").toBeAtLeast(0.8)
      .recall("general").toBeAtLeast(0.7)
      .displayConfusionMatrix();
  });
});
```

### Parallel Model Execution with LLMs

For LLM calls or slow operations, use `Promise.all` with chunking for concurrency control:

```javascript
import { describe, evalTest, expectStats } from "evalsense";
import { readFileSync } from "fs";

// Helper for parallel execution with concurrency limit
async function mapConcurrent(items, fn, concurrency = 5) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    results.push(...(await Promise.all(chunk.map(fn))));
  }
  return results;
}

describe("LLM classifier", () => {
  evalTest("classification accuracy", async () => {
    const groundTruth = JSON.parse(readFileSync("./data.json", "utf-8"));

    // Run with concurrency=5
    const predictions = await mapConcurrent(
      groundTruth,
      async (record) => {
        const response = await callLLM(record.text);
        return { id: record.id, category: response.category };
      },
      5
    );

    expectStats(predictions, groundTruth).field("category").accuracy.toBeAtLeast(0.9);
  });
});
```

### Test Lifecycle Hooks

```javascript
import { describe, evalTest, beforeAll, afterAll, beforeEach, afterEach } from "evalsense";

describe("Model evaluation", () => {
  let model;

  beforeAll(async () => {
    // Load model once before all tests
    model = await loadModel();
  });

  afterAll(async () => {
    // Cleanup after all tests
    await model.dispose();
  });

  beforeEach(() => {
    // Reset state before each test
    model.reset();
  });

  afterEach(() => {
    // Cleanup after each test
    console.log("Test completed");
  });

  evalTest("test 1", async () => {
    // ...
  });

  evalTest("test 2", async () => {
    // ...
  });
});
```

## CLI Usage

### Run Evaluations

```bash
# Run all eval files in current directory
npx evalsense run

# Run specific file or directory
npx evalsense run tests/eval/

# Filter tests by name
npx evalsense run --filter "accuracy"

# Output JSON report
npx evalsense run --output report.json

# Use different reporters
npx evalsense run --reporter console  # default
npx evalsense run --reporter json
npx evalsense run --reporter both

# Bail on first failure
npx evalsense run --bail

# Set timeout (in milliseconds)
npx evalsense run --timeout 60000
```

### List Eval Files

```bash
# List all discovered eval files
npx evalsense list

# List files in specific directory
npx evalsense list tests/
```

## API Reference

### Core API

#### `describe(name, fn)`

Groups related evaluation tests (like Jest's describe).

```javascript
describe("My model", () => {
  // eval tests go here
});
```

#### `evalTest(name, fn)` / `test(name, fn)` / `it(name, fn)`

Defines an evaluation test.

```javascript
evalTest("should have 90% accuracy", async () => {
  // test implementation
});
```

### Dataset Loading

evalsense doesn't dictate how you load data or run your model. Use standard Node.js tools:

```javascript
import { readFileSync } from "fs";

// Load ground truth
const groundTruth = JSON.parse(readFileSync("./data.json", "utf-8"));

// Run your model however you want
const predictions = groundTruth.map(runYourModel);

// Or use async operations
const predictions = await Promise.all(
  groundTruth.map(async (item) => {
    const result = await callLLM(item.text);
    return { id: item.id, prediction: result };
  })
);
```

### Assertions

#### `expectStats(predictions, groundTruth)`

Creates a statistical assertion chain from predictions and ground truth. Aligns by `id` field.

```javascript
expectStats(predictions, groundTruth)
  .field("prediction")
  .accuracy.toBeAtLeast(0.8)
  .f1.toBeAtLeast(0.75)
  .displayConfusionMatrix();
```

**One-argument form (distribution assertions only):**

```javascript
// For distribution monitoring without ground truth
expectStats(predictions).field("confidence").percentageAbove(0.7).toBeAtLeast(0.8);
```

**Common use cases:**

- Classification evaluation with ground truth
- Regression evaluation (MAE, RMSE, R²)
- Validating LLM judges against human labels
- Distribution monitoring without ground truth

### Field Selection

#### `.field(fieldName)`

Selects a field for evaluation.

```javascript
expectStats(result).field("sentiment");
```

#### `.binarize(threshold)`

Converts continuous scores to binary (>=threshold is true).

```javascript
expectStats(result)
  .field("score")
  .binarize(0.5) // score >= 0.5 is true
  .accuracy.toBeAtLeast(0.8);
```

### Available Assertions

#### Classification Metrics

```javascript
// Accuracy (macro average for multi-class)
.accuracy.toBeAtLeast(threshold)
.accuracy.toBeAbove(threshold)
.accuracy.toBeAtMost(threshold)
.accuracy.toBeBelow(threshold)

// Precision (per class or macro average)
.precision("className").toBeAtLeast(threshold)
.precision().toBeAtLeast(threshold) // macro average

// Recall (per class or macro average)
.recall("className").toBeAtLeast(threshold)
.recall().toBeAtLeast(threshold) // macro average

// F1 Score (macro average)
.f1.toBeAtLeast(threshold)
.f1.toBeAbove(threshold)

// Regression Metrics
.mae.toBeAtMost(threshold)  // Mean Absolute Error
.rmse.toBeAtMost(threshold) // Root Mean Squared Error
.r2.toBeAtLeast(threshold)  // R² coefficient

// Confusion Matrix
.displayConfusionMatrix()  // Displays confusion matrix (not an assertion)
```

#### Available Matchers

All metrics return a matcher object with these comparison methods:

```javascript
.toBeAtLeast(x)  // >= x
.toBeAbove(x)    // > x
.toBeAtMost(x)   // <= x
.toBeBelow(x)    // < x
.toEqual(x, tolerance?)  // === x (with optional tolerance for floats)
```

#### Distribution Assertions

Distribution assertions validate output distributions **without requiring ground truth**. Use these to monitor that model outputs stay within expected ranges.

```javascript
// Assert that at least 80% of confidence scores are above 0.7
expectStats(predictions).field("confidence").percentageAbove(0.7).toBeAtLeast(0.8);

// Assert that at least 90% of toxicity scores are below 0.3
expectStats(predictions).field("toxicity").percentageBelow(0.3).toBeAtLeast(0.9);

// Chain multiple distribution assertions
expectStats(predictions)
  .field("score")
  .percentageAbove(0.5).toBeAtLeast(0.6) // At least 60% above 0.5
  .percentageBelow(0.9).toBeAtLeast(0.8); // At least 80% below 0.9
```

**Use cases:**

- Monitor confidence score distributions
- Validate schema compliance rates
- Check output range constraints
- Ensure score distributions remain stable over time

See [Distribution Assertions Example](./examples/distribution-assertions.eval.js) for complete examples.

### Judge Validation

Validate judge outputs against human-labeled ground truth using the **two-argument expectStats API**:

```javascript
// Judge outputs (predictions from your judge/metric)
const judgeOutputs = [
  { id: "1", hallucinated: true },
  { id: "2", hallucinated: false },
  { id: "3", hallucinated: true },
];

// Human labels (ground truth)
const humanLabels = [
  { id: "1", hallucinated: true },
  { id: "2", hallucinated: false },
  { id: "3", hallucinated: false },
];

// Validate judge performance
expectStats(judgeOutputs, humanLabels)
  .field("hallucinated")
  .recall(true).toBeAtLeast(0.9) // Don't miss hallucinations
  .precision(true).toBeAtLeast(0.7) // Some false positives OK
  .displayConfusionMatrix();
```

**Use cases:**

- Evaluate LLM-as-judge accuracy
- Validate heuristic metrics against human labels
- Test automated detection systems (refusal, policy compliance)
- Calibrate metric thresholds

**Two-argument expectStats:**

```javascript
expectStats(actual, expected).field("fieldName").accuracy.toBeAtLeast(0.8);
```

The first argument is your predictions (judge outputs), the second is ground truth (human labels). Both must have matching `id` fields for alignment.

See [Judge Validation Example](./examples/judge-validation.eval.js) for complete examples.

For comprehensive guidance on evaluating agent systems, see [Agent Judges Design Patterns](./docs/agent-judges.md).

## Dataset Format

Datasets must be JSON arrays where each record has an `id` or `_id` field:

```json
[
  {
    "id": "1",
    "text": "input text",
    "label": "expected_output"
  },
  {
    "id": "2",
    "text": "another input",
    "label": "another_output"
  }
]
```

**Requirements:**

- Each record MUST have `id` or `_id` for alignment
- Ground truth fields (e.g., `label`, `sentiment`, `category`) are compared against model outputs
- Model functions must return predictions with matching `id`

## Exit Codes

evalsense returns specific exit codes for CI integration:

- `0` - Success (all tests passed)
- `1` - Assertion failure (statistical thresholds not met)
- `2` - Integrity failure (dataset alignment issues)
- `3` - Execution error (test threw exception)
- `4` - Configuration error (invalid CLI options)

## Writing Eval Files

Eval files use the `.eval.js` or `.eval.ts` extension and are discovered automatically:

```
project/
├── tests/
│   ├── classifier.eval.js
│   └── hallucination.eval.js
├── data/
│   └── dataset.json
└── package.json
```

Run with:

```bash
npx evalsense run tests/
```

## Examples

See the [`examples/`](./examples/) directory for complete examples:

- [`classification.eval.js`](./examples/basic/classification.eval.js) - Binary sentiment classification
- [`hallucination.eval.js`](./examples/basic/hallucination.eval.js) - Continuous score binarization
- [`distribution-assertions.eval.js`](./examples/distribution-assertions.eval.js) - Distribution monitoring without ground truth
- [`judge-validation.eval.js`](./examples/judge-validation.eval.js) - Validating judges against human labels

## Field Types

evalsense automatically determines evaluation metrics based on field values:

- **Boolean** (`true`/`false`) → Binary classification metrics
- **Categorical** (strings) → Multi-class classification metrics
- **Numeric** (numbers) → Regression metrics (MAE, MSE, RMSE, R²)
- **Numeric + threshold** → Binarized classification metrics

## LLM-Based Metrics (v0.2.0+)

evalsense includes LLM-powered metrics for hallucination detection, relevance assessment, faithfulness verification, and toxicity detection.

### Quick Setup

```javascript
import { setLLMClient, createOpenAIAdapter } from "evalsense/metrics";
import { hallucination, relevance, faithfulness, toxicity } from "evalsense/metrics/opinionated";

// 1. Configure your LLM client (one-time setup)
setLLMClient(
  createOpenAIAdapter(process.env.OPENAI_API_KEY, {
    model: "gpt-4-turbo-preview",
    temperature: 0,
  })
);

// 2. Use metrics in evaluations
const results = await hallucination({
  outputs: [{ id: "1", output: "Paris has 50 million people." }],
  context: ["Paris has approximately 2.1 million residents."],
});

console.log(results[0].score); // 0.9 (high hallucination)
console.log(results[0].reasoning); // "Output claims 50M, context says 2.1M"
```

### Available Metrics

- **`hallucination()`** - Detects claims not supported by context
- **`relevance()`** - Measures query-response alignment
- **`faithfulness()`** - Verifies outputs don't contradict sources
- **`toxicity()`** - Identifies harmful or inappropriate content

### Evaluation Modes

Choose between accuracy and cost:

```javascript
// Per-row: Higher accuracy, higher cost (N API calls)
await hallucination({
  outputs,
  context,
  evaluationMode: "per-row", // default
});

// Batch: Lower cost, single API call
await hallucination({
  outputs,
  context,
  evaluationMode: "batch",
});
```

### Built-in Provider Adapters

evalsense includes ready-to-use adapters for popular LLM providers:

**OpenAI (GPT-4, GPT-3.5)**

```javascript
import { createOpenAIAdapter } from "evalsense/metrics";

// npm install openai
setLLMClient(
  createOpenAIAdapter(process.env.OPENAI_API_KEY, {
    model: "gpt-4-turbo-preview", // or "gpt-3.5-turbo" for lower cost
    temperature: 0,
    maxTokens: 4096,
  })
);
```

**Anthropic (Claude)**

```javascript
import { createAnthropicAdapter } from "evalsense/metrics";

// npm install @anthropic-ai/sdk
setLLMClient(
  createAnthropicAdapter(process.env.ANTHROPIC_API_KEY, {
    model: "claude-3-5-sonnet-20241022", // or "claude-3-haiku-20240307" for speed
    maxTokens: 4096,
  })
);
```

**OpenRouter (100+ models from one API)**

```javascript
import { createOpenRouterAdapter } from "evalsense/metrics";

// No SDK needed - uses fetch
setLLMClient(
  createOpenRouterAdapter(process.env.OPENROUTER_API_KEY, {
    model: "anthropic/claude-3.5-sonnet", // or "openai/gpt-3.5-turbo", etc.
    temperature: 0,
    appName: "my-eval-system",
  })
);
```

**Custom Adapter (for any provider)**

```javascript
setLLMClient({
  async complete(prompt) {
    // Implement for your LLM provider
    const response = await yourLLM.generate(prompt);
    return response.text;
  },
});
```

### Learn More

- [LLM Metrics Guide](./docs/llm-metrics.md) - Complete usage guide
- [LLM Adapters Guide](./docs/llm-adapters.md) - Implement adapters for different providers
- [Migration Guide](./docs/migration-v0.2.md) - Upgrade from v0.1.x
- [Examples](./examples/) - Working code examples

## Contributing

Contributions are welcome! Please see [CLAUDE.md](./CLAUDE.md) for development guidelines.
