# evalsense

> JS-native LLM evaluation framework with Jest-like API and statistical assertions

[![npm version](https://img.shields.io/npm/v/evalsense.svg)](https://www.npmjs.com/package/evalsense)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**evalsense** brings classical ML-style statistical evaluation to LLM systems in JavaScript. Instead of evaluating individual test cases, evalsense evaluates entire datasets and computes confusion matrices, precision/recall, F1 scores, and other statistical metrics.

> **New in v0.2.0:** LLM-powered metrics for hallucination, relevance, faithfulness, and toxicity detection. [See migration guide](./docs/migration-v0.2.md).

## Why evalsense?

Most LLM evaluation tools stop at producing scores (accuracy, relevance, hallucination). evalsense goes further by:

- ✅ Computing **confusion matrices** to reveal systematic failure patterns
- ✅ Analyzing **false positives vs false negatives** across datasets
- ✅ Treating **metrics as predictions, not truth** (and validating them statistically)
- ✅ Providing a **Jest-like API** that fits naturally into JS/Node workflows
- ✅ Supporting **deterministic CI/CD** integration with specific exit codes

## Features

- 📊 **Dataset-level evaluation** - evaluate distributions, not single examples
- 🎯 **Statistical rigor** - confusion matrices, precision/recall, F1, regression metrics
- 🧪 **Jest-like API** - familiar `describe()` and test patterns
- 🤖 **LLM-powered metrics** - hallucination, relevance, faithfulness, toxicity with explainable reasoning
- ⚡ **Dual evaluation modes** - choose between accuracy (per-row) or cost efficiency (batch)
- 🔄 **CI-friendly** - deterministic execution, machine-readable reports
- 🚀 **JS-native** - first-class TypeScript support, works with any Node.js LLM library
- 🔌 **Composable** - evaluate outputs from your existing LLM code

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
import { describe, evalTest, expectStats, loadDataset, runModel } from "evalsense";

// Your model function - can be any JS function
function classifySentiment(record) {
  const text = record.text.toLowerCase();
  const hasPositive = /love|amazing|great|fantastic|perfect/.test(text);
  const hasNegative = /terrible|worst|disappointed|waste/.test(text);

  return {
    id: record.id,
    sentiment: hasPositive && !hasNegative ? "positive" : "negative"
  };
}

describe("Sentiment classifier", () => {
  evalTest("accuracy above 80%", async () => {
    // 1. Load dataset with ground truth
    const dataset = loadDataset("./sentiment.json");

    // 2. Run your model on the dataset
    const result = await runModel(dataset, classifySentiment);

    // 3. Assert on statistical properties
    expectStats(result)
      .field("sentiment")
      .toHaveAccuracyAbove(0.8)
      .toHaveRecallAbove("positive", 0.7)
      .toHavePrecisionAbove("positive", 0.7)
      .toHaveConfusionMatrix();
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
import { describe, evalTest, expectStats, loadDataset, runModel } from "evalsense";

describe("Spam classifier", () => {
  evalTest("high precision and recall", async () => {
    const dataset = loadDataset("./emails.json");

    const result = await runModel(dataset, (record) => ({
      id: record.id,
      isSpam: classifyEmail(record.text)
    }));

    expectStats(result)
      .field("isSpam")
      .toHaveAccuracyAbove(0.9)
      .toHavePrecisionAbove(true, 0.85)  // Precision for spam=true
      .toHaveRecallAbove(true, 0.85)     // Recall for spam=true
      .toHaveConfusionMatrix();
  });
});
```

### Continuous Scores with Binarization

```javascript
import { describe, evalTest, expectStats, loadDataset, runModel } from "evalsense";

describe("Hallucination detector", () => {
  evalTest("detect hallucinations with 70% recall", async () => {
    const dataset = loadDataset("./outputs.json");

    // Your model returns a continuous score
    const result = await runModel(dataset, (record) => ({
      id: record.id,
      hallucinated: computeHallucinationScore(record.output)  // 0.0 to 1.0
    }));

    // Binarize the score at threshold 0.3
    expectStats(result)
      .field("hallucinated")
      .binarize(0.3)  // >= 0.3 means hallucinated
      .toHaveRecallAbove(true, 0.7)
      .toHavePrecisionAbove(true, 0.6)
      .toHaveConfusionMatrix();
  });
});
```

### Multi-class Classification

```javascript
import { describe, evalTest, expectStats, loadDataset, runModel } from "evalsense";

describe("Intent classifier", () => {
  evalTest("balanced performance across intents", async () => {
    const dataset = loadDataset("./intents.json");

    const result = await runModel(dataset, (record) => ({
      id: record.id,
      intent: classifyIntent(record.query)
    }));

    expectStats(result)
      .field("intent")
      .toHaveAccuracyAbove(0.85)
      .toHaveRecallAbove("purchase", 0.8)
      .toHaveRecallAbove("support", 0.8)
      .toHaveRecallAbove("general", 0.7)
      .toHaveConfusionMatrix();
  });
});
```

### Parallel Model Execution

For LLM calls or slow operations, use parallel execution:

```javascript
import { describe, evalTest, expectStats, loadDataset, runModelParallel } from "evalsense";

describe("LLM classifier", () => {
  evalTest("classification accuracy", async () => {
    const dataset = loadDataset("./data.json");

    // Run with concurrency=5
    const result = await runModelParallel(
      dataset,
      async (record) => {
        const response = await callLLM(record.text);
        return { id: record.id, category: response.category };
      },
      5  // concurrency limit
    );

    expectStats(result)
      .field("category")
      .toHaveAccuracyAbove(0.9);
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

### Dataset Functions

#### `loadDataset(path)`
Loads a dataset from a JSON file. Records must have an `id` or `_id` field.

```javascript
const dataset = loadDataset("./data.json");
```

#### `runModel(dataset, modelFn)`
Runs a model function on each record sequentially.

```javascript
const result = await runModel(dataset, (record) => ({
  id: record.id,
  prediction: classify(record.text)
}));
```

#### `runModelParallel(dataset, modelFn, concurrency)`
Runs a model function with parallel execution.

```javascript
const result = await runModelParallel(dataset, modelFn, 10);  // concurrency=10
```

### Assertions

#### `expectStats(result)`
Creates a statistical assertion chain from model results.

```javascript
expectStats(result)
  .field("prediction")
  .toHaveAccuracyAbove(0.8);
```

#### `expectStats(predictions, groundTruth)`
Two-argument form for judge validation. Aligns predictions with ground truth by `id` field.

```javascript
// Validate judge outputs against human labels
expectStats(judgeOutputs, humanLabels)
  .field("label")
  .toHaveAccuracyAbove(0.85);
```

**When to use:**
- Validating LLM judges against human labels
- Evaluating metric quality
- Testing automated detection systems

### Field Selection

#### `.field(fieldName)`
Selects a field for evaluation.

```javascript
expectStats(result).field("sentiment")
```

#### `.binarize(threshold)`
Converts continuous scores to binary (>=threshold is true).

```javascript
expectStats(result)
  .field("score")
  .binarize(0.5)  // score >= 0.5 is true
  .toHaveAccuracyAbove(0.8);
```

### Available Assertions

#### Classification Metrics

```javascript
// Accuracy
.toHaveAccuracyAbove(threshold)
.toHaveAccuracyBelow(threshold)
.toHaveAccuracyBetween(min, max)

// Precision (per class)
.toHavePrecisionAbove(className, threshold)
.toHavePrecisionBelow(className, threshold)

// Recall (per class)
.toHaveRecallAbove(className, threshold)
.toHaveRecallBelow(className, threshold)

// F1 Score
.toHaveF1Above(threshold)           // Overall F1
.toHaveF1Above(className, threshold) // Per-class F1

// Confusion Matrix
.toHaveConfusionMatrix()  // Prints confusion matrix
```

#### Distribution Assertions (Pattern 1)

Distribution assertions validate output distributions **without requiring ground truth**. Use these to monitor that model outputs stay within expected ranges.

```javascript
// Assert that at least 80% of confidence scores are above 0.7
expectStats(predictions)
  .field("confidence")
  .toHavePercentageAbove(0.7, 0.8);

// Assert that at least 90% of toxicity scores are below 0.3
expectStats(predictions)
  .field("toxicity")
  .toHavePercentageBelow(0.3, 0.9);

// Chain multiple distribution assertions
expectStats(predictions)
  .field("score")
  .toHavePercentageAbove(0.5, 0.6)  // At least 60% above 0.5
  .toHavePercentageBelow(0.9, 0.8); // At least 80% below 0.9
```

**Use cases:**
- Monitor confidence score distributions
- Validate schema compliance rates
- Check output range constraints
- Ensure score distributions remain stable over time

See [Distribution Assertions Example](./examples/distribution-assertions.eval.js) for complete examples.

### Judge Validation (Pattern 1b)

Validate judge outputs against human-labeled ground truth using the **two-argument expectStats API**:

```javascript
// Judge outputs (predictions from your judge/metric)
const judgeOutputs = [
  { id: "1", hallucinated: true },
  { id: "2", hallucinated: false },
  { id: "3", hallucinated: true }
];

// Human labels (ground truth)
const humanLabels = [
  { id: "1", hallucinated: true },
  { id: "2", hallucinated: false },
  { id: "3", hallucinated: false }
];

// Validate judge performance
expectStats(judgeOutputs, humanLabels)
  .field("hallucinated")
  .toHaveRecallAbove(true, 0.9)       // Don't miss hallucinations
  .toHavePrecisionAbove(true, 0.7)    // Some false positives OK
  .toHaveConfusionMatrix();
```

**Use cases:**
- Evaluate LLM-as-judge accuracy
- Validate heuristic metrics against human labels
- Test automated detection systems (refusal, policy compliance)
- Calibrate metric thresholds

**Two-argument expectStats:**
```javascript
expectStats(actual, expected)
  .field("fieldName")
  .toHaveAccuracyAbove(0.8);
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
import { setLLMClient } from "evalsense/metrics";
import { hallucination, relevance, faithfulness, toxicity } from "evalsense/metrics/opinionated";

// 1. Configure your LLM client (one-time setup)
setLLMClient({
  async complete(prompt) {
    // Call your LLM API (OpenAI, Anthropic, local model, etc.)
    const response = await yourLLM.generate(prompt);
    return response.text;
  }
});

// 2. Use metrics in evaluations
const results = await hallucination({
  outputs: [{ id: "1", output: "Paris has 50 million people." }],
  context: ["Paris has approximately 2.1 million residents."]
});

console.log(results[0].score);      // 0.9 (high hallucination)
console.log(results[0].reasoning);  // "Output claims 50M, context says 2.1M"
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
  evaluationMode: "per-row"  // default
});

// Batch: Lower cost, single API call
await hallucination({
  outputs,
  context,
  evaluationMode: "batch"
});
```

### Provider Examples

**OpenAI:**
```javascript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
setLLMClient({
  async complete(prompt) {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0]?.message?.content ?? "";
  }
});
```

**Anthropic:**
```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
setLLMClient({
  async complete(prompt) {
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    return message.content[0].text;
  }
});
```

**Local (Ollama):**
```javascript
setLLMClient({
  async complete(prompt) {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({ model: "llama2", prompt }),
    });
    return (await response.json()).response;
  }
});
```

### Learn More

- [LLM Metrics Guide](./docs/llm-metrics.md) - Complete usage guide
- [LLM Adapters Guide](./docs/llm-adapters.md) - Implement adapters for different providers
- [Migration Guide](./docs/migration-v0.2.md) - Upgrade from v0.1.x
- [Examples](./examples/) - Working code examples

## Philosophy

evalsense is built on the principle that **metrics are predictions, not facts**.

Instead of treating LLM-as-judge metrics (relevance, hallucination, etc.) as ground truth, evalsense:
- Treats them as **weak labels** from a model
- Validates them statistically against human references when available
- Computes confusion matrices to reveal bias and systematic errors
- Focuses on dataset-level distributions, not individual examples

## Contributing

Contributions are welcome! Please see [CLAUDE.md](./CLAUDE.md) for development guidelines.

## License

MIT © Mohit Joshi

---

**Made with ❤️ for the JS/Node.js AI community**
