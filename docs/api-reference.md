# API Reference

## Core API

Import from `evalsense`:

```javascript
import {
  describe,
  evalTest,
  expectStats,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "evalsense";
```

---

### `describe(name, fn)`

Groups related evaluation tests. Equivalent to Jest's `describe`.

```javascript
describe("Sentiment classifier", () => {
  evalTest("accuracy above 80%", async () => {
    /* ... */
  });
});
```

### `evalTest(name, fn)` / `test(name, fn)` / `it(name, fn)`

Defines an evaluation test. All three are aliases.

```javascript
evalTest("should have 90% accuracy", async () => {
  // test body
});
```

### Lifecycle Hooks

```javascript
describe("Model evaluation", () => {
  beforeAll(async () => {
    /* runs once before all tests in this describe */
  });
  afterAll(async () => {
    /* runs once after all tests in this describe */
  });
  beforeEach(() => {
    /* runs before each test */
  });
  afterEach(() => {
    /* runs after each test */
  });
});
```

---

## `expectStats(predictions, groundTruth?)`

Creates a statistical assertion chain.

**Two-argument form** (with ground truth — enables classification/regression metrics):

```javascript
expectStats(predictions, groundTruth).field("sentiment").accuracy.toBeAtLeast(0.8);
```

**One-argument form** (distribution assertions only — no ground truth needed):

```javascript
expectStats(predictions).field("confidence").percentageAbove(0.7).toBeAtLeast(0.8);
```

Both arguments can be:

- An array of predictions `{ id, ...fields }`
- An array of `AlignedRecord` objects
- A `ModelRunResult` object

Records are aligned by the `id` (or `_id`) field.

### `.count()`

Returns the number of records.

```javascript
const count = expectStats(predictions).count(); // number
```

---

## Field Selection

### `.field(fieldName)`

Selects a field for evaluation. All metrics and assertions operate on this field.

```javascript
expectStats(predictions, groundTruth).field("sentiment");
```

### `.binarize(threshold)`

Converts a continuous numeric field to binary classification. Values `>= threshold` become `true`, values `< threshold` become `false`.

```javascript
expectStats(predictions, groundTruth).field("score").binarize(0.5).accuracy.toBeAtLeast(0.8);
```

---

## Classification Metrics

Available after calling `.field()` (with ground truth):

| Getter/Method            | Description                                     |
| ------------------------ | ----------------------------------------------- |
| `.accuracy`              | Overall accuracy (correct / total)              |
| `.f1`                    | Macro-averaged F1 score                         |
| `.precision(className?)` | Precision for a class (or macro avg if omitted) |
| `.recall(className?)`    | Recall for a class (or macro avg if omitted)    |

Examples:

```javascript
.accuracy.toBeAtLeast(0.85)
.f1.toBeAtLeast(0.8)
.precision("positive").toBeAtLeast(0.75)
.recall("positive").toBeAtLeast(0.7)
.precision().toBeAtLeast(0.8)  // macro average
```

### `.displayConfusionMatrix()`

Prints the confusion matrix to the console. Not an assertion — returns the chain for chaining.

```javascript
.displayConfusionMatrix()
```

---

## Regression Metrics

Available when the field contains numeric values (with ground truth):

| Getter  | Description                     |
| ------- | ------------------------------- |
| `.mae`  | Mean Absolute Error             |
| `.mse`  | Mean Squared Error              |
| `.rmse` | Root Mean Squared Error         |
| `.r2`   | R² coefficient of determination |

```javascript
expectStats(predictions, groundTruth)
  .field("score")
  .mae.toBeAtMost(0.1)
  .rmse.toBeAtMost(0.15)
  .r2.toBeAtLeast(0.9);
```

---

## Distribution Assertions

Available on any numeric field, with or without ground truth:

| Method                        | Description                                 |
| ----------------------------- | ------------------------------------------- |
| `.percentageAbove(threshold)` | Fraction of values strictly above threshold |
| `.percentageBelow(threshold)` | Fraction of values strictly below threshold |

Both return a matcher:

```javascript
// At least 80% of confidence values are above 0.7
expectStats(predictions).field("confidence").percentageAbove(0.7).toBeAtLeast(0.8);

// At least 90% of toxicity scores are below 0.3
expectStats(predictions).field("toxicity").percentageBelow(0.3).toBeAtLeast(0.9);
```

---

## Matchers

All metrics return a matcher object:

| Method                    | Meaning                            |
| ------------------------- | ---------------------------------- |
| `.toBeAtLeast(x)`         | value >= x                         |
| `.toBeAbove(x)`           | value > x                          |
| `.toBeAtMost(x)`          | value <= x                         |
| `.toBeBelow(x)`           | value < x                          |
| `.toEqual(x, tolerance?)` | value === x (tolerance for floats) |

Matchers return the field selector chain for chaining:

```javascript
expectStats(predictions, groundTruth)
  .field("intent")
  .accuracy.toBeAtLeast(0.85)
  .recall("purchase")
  .toBeAtLeast(0.8)
  .f1.toBeAtLeast(0.8)
  .displayConfusionMatrix();
```

---

## LLM Metrics API

Import from `evalsense/metrics`:

```javascript
import { setLLMClient, getLLMClient, createLLMMetric } from "evalsense/metrics";
import {
  createOpenAIAdapter,
  createAnthropicAdapter,
  createOpenRouterAdapter,
  createMockLLMClient,
} from "evalsense/metrics";
```

### `setLLMClient(client)`

Sets the global LLM client used by opinionated metrics.

```javascript
setLLMClient(createOpenAIAdapter(process.env.OPENAI_API_KEY, { model: "gpt-4o" }));
```

### `getLLMClient()`

Returns the current global LLM client (throws if not set).

### Opinionated Metrics

Import from `evalsense/metrics/opinionated`:

```javascript
import { hallucination, relevance, faithfulness, toxicity } from "evalsense/metrics/opinionated";
```

All metrics accept a `MetricConfig` and return `Promise<MetricOutput[]>`:

```typescript
interface MetricConfig {
  outputs: Array<{ id: string; output: string }>;
  context?: string[]; // for hallucination, faithfulness
  query?: string[]; // for relevance
  source?: string[]; // for faithfulness
  evaluationMode?: "per-row" | "batch"; // default: "per-row"
  customPrompt?: string;
  llmClient?: LLMClient; // per-call override
}

interface MetricOutput {
  id: string;
  metric: string;
  score: number; // 0.0–1.0
  label?: string;
  reasoning?: string; // LLM's explanation
  evaluationMode?: "per-row" | "batch";
}
```

### Custom Metrics

````javascript
import { createPatternMetric, createKeywordMetric } from "evalsense/metrics";

// Pattern-based (regex matching)
const hasCodeMetric = createPatternMetric("has-code", [/```[\s\S]*?```/, /const\s+\w+/]);

// Keyword-based
const techTermsMetric = createKeywordMetric(
  "tech-terms",
  ["machine learning", "neural network", "algorithm"],
  { threshold: 0.3 }
);
````

See [LLM Metrics Guide](./llm-metrics.md) for complete examples.

---

## Dataset Format

Records must have an `id` or `_id` field for alignment:

```json
[
  { "id": "1", "text": "sample input", "label": "positive" },
  { "id": "2", "text": "another input", "label": "negative" }
]
```

### Field Type Detection

evalsense auto-detects the metric type from field values:

| Field values             | Metrics used                    |
| ------------------------ | ------------------------------- |
| `true` / `false`         | Binary classification           |
| Strings                  | Multi-class classification      |
| Numbers                  | Regression (MAE, MSE, RMSE, R²) |
| Numbers + `.binarize(t)` | Binarized classification        |
