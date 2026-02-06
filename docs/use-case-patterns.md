# Four Core Use Case Patterns

This guide covers the four main evaluation patterns in evalsense, each addressing a specific use case with clear APIs and assertions.

## Table of Contents

- [Overview](#overview)
- [UC1: Distribution Monitoring](#uc1-distribution-monitoring)
- [UC2: LLM Judge Distribution](#uc2-llm-judge-distribution)
- [UC3: Classification with Ground Truth](#uc3-classification-with-ground-truth)
- [UC4: Judge Validation](#uc4-judge-validation)
- [Choosing the Right Pattern](#choosing-the-right-pattern)

## Overview

evalsense provides four core patterns that cover the vast majority of LLM evaluation scenarios:

| Pattern | Ground Truth? | Use Case                  | Key Assertions                          |
| ------- | ------------- | ------------------------- | --------------------------------------- |
| **UC1** | No            | Monitor distributions     | `toHavePercentageAbove/Below`           |
| **UC2** | No            | LLM judge outputs         | Same as UC1, after calling judge        |
| **UC3** | Yes           | Classification/Regression | `toHaveAccuracyAbove`, `toHaveMAEBelow` |
| **UC4** | Yes           | Validate judges           | Same as UC3, judge vs human labels      |

## UC1: Distribution Monitoring

**Pattern**: Monitor output distributions WITHOUT ground truth data.

### When to Use

- Track model output distributions over time
- Ensure outputs stay within expected ranges
- Monitor confidence scores, toxicity levels, quality metrics
- No labeled data required

### Key Assertions

```javascript
toHavePercentageAbove(valueThreshold, percentageThreshold);
toHavePercentageBelow(valueThreshold, percentageThreshold);
```

### Example

```javascript
import { describe, evalTest, expectStats } from "evalsense";

describe("Confidence Monitoring", () => {
  evalTest("80% of outputs should have high confidence", () => {
    const predictions = [
      { id: "1", confidence: 0.95 },
      { id: "2", confidence: 0.72 },
      { id: "3", confidence: 0.88 },
      // ... more predictions
    ];

    // Assert: 80% of confidence scores are above 0.7
    expectStats(predictions).field("confidence").toHavePercentageAbove(0.7, 0.8);
  });
});
```

### Real-World Scenarios

**Content Safety**:

```javascript
// Monitor toxicity scores stay low
expectStats(outputs).field("toxicity").toHavePercentageBelow(0.1, 0.95); // 95% below 0.1
```

**Quality Assurance**:

```javascript
// Multiple quality dimensions
expectStats(responses).field("relevance").toHavePercentageAbove(0.7, 0.8);
expectStats(responses).field("coherence").toHavePercentageAbove(0.7, 0.8);
expectStats(responses).field("helpfulness").toHavePercentageAbove(0.7, 0.8);
```

### Notes

- **No runModel required** - Pass predictions directly to `expectStats()`
- Filters to numeric values automatically
- Handles mixed numeric/non-numeric data gracefully
- Perfect for production monitoring dashboards

See [examples/uc1-distribution.eval.js](../examples/uc1-distribution.eval.js) for complete examples.

## UC2: LLM Judge Distribution

**Pattern**: Use LLM-based metrics to evaluate outputs, then monitor score distributions.

### When to Use

- Evaluate hallucination, toxicity, relevance, faithfulness
- Monitor LLM judge outputs over time
- Compare per-row vs batch evaluation modes
- No human-labeled ground truth needed

### Key Steps

1. Run LLM judge on outputs
2. Get scores/labels from judge
3. Monitor distribution using UC1 assertions

### Example

```javascript
import { hallucination, toxicity } from "evalsense/metrics/opinionated";
import { setLLMClient } from "evalsense/metrics";

// Setup
setLLMClient(myLLMClient);

describe("Hallucination Monitoring", () => {
  evalTest("most outputs should have low hallucination", async () => {
    const outputs = [
      { id: "1", output: "Paris is the capital of France..." },
      { id: "2", output: "Paris has 50 million people..." },
    ];

    const context = [
      "Paris is the capital of France. Population: 2.1M.",
      "Paris is the capital of France. Population: 2.1M.",
    ];

    // Run LLM judge
    const results = await hallucination({
      outputs,
      context,
      evaluationMode: "per-row", // or "batch"
    });

    // Monitor distribution
    expectStats(results).field("score").toHavePercentageBelow(0.5, 0.7); // 70% should be low-hallucination
  });
});
```

### Evaluation Modes

**Per-Row Mode** (default):

- One LLM call per output
- Higher accuracy, higher cost
- Use for: production, high-stakes, complex outputs

**Batch Mode**:

- One LLM call for all outputs
- Lower cost, potentially less accurate
- Use for: development, testing, cost-sensitive scenarios

```javascript
// Per-row: N API calls
const perRowResults = await hallucination({
  outputs,
  context,
  evaluationMode: "per-row",
});

// Batch: 1 API call
const batchResults = await hallucination({
  outputs,
  context,
  evaluationMode: "batch",
});
```

### Available Metrics

- `hallucination({ outputs, context })` - Detect unsupported claims
- `relevance({ outputs, query })` - Measure query relevance
- `faithfulness({ outputs, source })` - Verify faithfulness to source
- `toxicity({ outputs })` - Detect harmful content

See [examples/uc2-llm-judge-distribution.eval.js](../examples/uc2-llm-judge-distribution.eval.js) for complete examples.

## UC3: Classification with Ground Truth

**Pattern**: Compare model predictions against labeled ground truth.

### When to Use

- You have labeled test data
- Measure classification accuracy, precision, recall, F1
- Evaluate regression models (MAE, RMSE, R²)
- Validate model performance

### Key Assertions

**Classification**:

```javascript
toHaveAccuracyAbove(threshold)
toHavePrecisionAbove(class, threshold)
toHaveRecallAbove(class, threshold)
toHaveF1Above(class, threshold)
toHaveConfusionMatrix()
binarize(threshold) // For continuous scores
```

**Regression** (new in v0.2.1):

```javascript
toHaveMAEBelow(threshold);
toHaveRMSEBelow(threshold);
toHaveR2Above(threshold);
```

### Example: Classification

```javascript
import { describe, evalTest, expectStats, loadDataset, runModel } from "evalsense";

// Pattern A: With runModel
describe("Sentiment Classifier", () => {
  evalTest("accuracy above 80%", async () => {
    const dataset = loadDataset("./data/sentiment.json");

    const result = await runModel(dataset, (record) => ({
      id: record.id,
      sentiment: classifySentiment(record.text),
    }));

    expectStats(result)
      .field("sentiment")
      .toHaveAccuracyAbove(0.8)
      .toHaveRecallAbove("positive", 0.75)
      .toHaveRecallAbove("negative", 0.75)
      .toHaveConfusionMatrix();
  });
});

// Pattern B: Without runModel
describe("Direct Predictions", () => {
  evalTest("spam detection", () => {
    const predictions = [
      { id: "1", category: "spam" },
      { id: "2", category: "ham" },
    ];

    const groundTruth = [
      { id: "1", category: "spam" },
      { id: "2", category: "ham" },
    ];

    // Two-argument form
    expectStats(predictions, groundTruth).field("category").toHaveAccuracyAbove(0.9);
  });
});
```

### Example: Regression

```javascript
describe("Rating Prediction", () => {
  evalTest("accurate rating predictions", () => {
    const predictions = [
      { id: "1", rating: 4.2 },
      { id: "2", rating: 3.8 },
      { id: "3", rating: 4.5 },
    ];

    const groundTruth = [
      { id: "1", rating: 4.0 },
      { id: "2", rating: 4.0 },
      { id: "3", rating: 4.5 },
    ];

    expectStats(predictions, groundTruth)
      .field("rating")
      .toHaveMAEBelow(0.3) // Mean Absolute Error < 0.3
      .toHaveRMSEBelow(0.3) // Root Mean Squared Error < 0.3
      .toHaveR2Above(0.7); // R² > 0.7 (good correlation)
  });
});
```

### Binarizing Continuous Scores

```javascript
describe("Confidence Score Binarization", () => {
  evalTest("binarize at threshold", () => {
    const predictions = [
      { id: "1", confidence: 0.95 }, // >= 0.5 → true
      { id: "2", confidence: 0.3 }, // < 0.5 → false
    ];

    const groundTruth = [
      { id: "1", confidence: true },
      { id: "2", confidence: false },
    ];

    expectStats(predictions, groundTruth)
      .field("confidence")
      .binarize(0.5)
      .toHaveAccuracyAbove(0.9);
  });
});
```

### Custom ID Field

```javascript
// Use custom ID field for alignment
const predictions = [
  { id: "uuid-1", score: "high" },
  { id: "uuid-2", score: "low" },
];

const groundTruth = [
  { uuid: "uuid-1", score: "high" },
  { uuid: "uuid-2", score: "high" },
];

// Tell evalsense to use 'uuid' field from groundTruth
expectStats(predictions, groundTruth, { idField: "uuid" }).field("score").toHaveAccuracyAbove(0.8);
```

See [examples/uc3-classification.eval.js](../examples/uc3-classification.eval.js) for complete examples.

## UC4: Judge Validation

**Pattern**: Validate LLM judges against human-labeled ground truth.

### When to Use

- Evaluate the quality of your evaluation metrics
- Ensure judges agree with human judgment
- Prioritize recall for safety-critical detection
- Calibrate judge thresholds

### Key Pattern

1. Run LLM judge on dataset
2. Convert judge scores to predictions
3. Compare to human labels using UC3 assertions

### Example: Hallucination Judge

```javascript
import { hallucination } from "evalsense/metrics/opinionated";

describe("Hallucination Judge Validation", () => {
  evalTest("validate against human labels", async () => {
    // Dataset with human labels
    const dataset = [
      {
        id: "1",
        context: "Paris has 2.1M residents.",
        output: "Paris has 2.1M residents.",
        humanLabel: false, // NOT hallucinated
      },
      {
        id: "2",
        context: "Paris has 2.1M residents.",
        output: "Paris has 50M people.",
        humanLabel: true, // IS hallucinated
      },
    ];

    // Run LLM judge
    const judgeResults = await hallucination({
      outputs: dataset.map((d) => ({ id: d.id, output: d.output })),
      context: dataset.map((d) => d.context),
    });

    // Convert to predictions
    const judgePredictions = judgeResults.map((r) => ({
      id: r.id,
      hallucinated: r.score >= 0.5, // Binarize
    }));

    // Human labels
    const humanLabels = dataset.map((d) => ({
      id: d.id,
      hallucinated: d.humanLabel,
    }));

    // Validate judge accuracy
    expectStats(judgePredictions, humanLabels)
      .field("hallucinated")
      .toHaveAccuracyAbove(0.7)
      .toHaveRecallAbove(true, 0.85) // Critical: catch hallucinations
      .toHavePrecisionAbove(true, 0.7) // Some false positives OK
      .toHaveConfusionMatrix();
  });
});
```

### Prioritizing Recall

For safety-critical detection, prioritize recall over precision:

```javascript
// High-stakes scenarios
expectStats(judgePredictions, humanLabels).field("shouldRefuse").toHaveRecallAbove(true, 0.98); // Must catch 98% of harmful requests
```

### Custom Prompts for Domain-Specific Evaluation

```javascript
const medicalPrompt = `You are a medical fact-checker.
CONTEXT: {context}
OUTPUT: {output}
Be extremely strict with medical claims.
Return JSON: {"score": <0-1>, "reasoning": "..."}`;

const results = await hallucination({
  outputs,
  context,
  customPrompt: medicalPrompt,
});
```

### Combining Patterns

```javascript
// UC4: Validate judge
expectStats(judgePredictions, humanLabels).field("flagged").toHaveAccuracyAbove(0.8);

// UC1: Monitor score distribution
expectStats(judgeResults).field("score").toHavePercentageBelow(0.5, 0.7);
```

See [examples/uc4-judge-validation.eval.js](../examples/uc4-judge-validation.eval.js) for complete examples.

## Choosing the Right Pattern

Use this decision tree:

```
Do you have labeled ground truth?
├─ NO
│  ├─ Need LLM evaluation? → UC2 (LLM Judge Distribution)
│  └─ Just monitor distributions? → UC1 (Distribution Monitoring)
└─ YES
   ├─ Evaluating the judge itself? → UC4 (Judge Validation)
   └─ Evaluating model outputs? → UC3 (Classification/Regression)
```

### Pattern Comparison

| Scenario                      | Pattern | Example                                                                                   |
| ----------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| Monitor chatbot confidence    | UC1     | `expectStats(outputs).field("confidence").toHavePercentageAbove(0.7, 0.8)`                |
| Detect hallucinations         | UC2     | `expectStats(await hallucination({...})).field("score").toHavePercentageBelow(0.5, 0.9)`  |
| Validate sentiment classifier | UC3     | `expectStats(predictions, labels).field("sentiment").toHaveAccuracyAbove(0.85)`           |
| Validate hallucination judge  | UC4     | `expectStats(judgePreds, humanLabels).field("hallucinated").toHaveRecallAbove(true, 0.9)` |

## Best Practices

### UC1 & UC2 (Distribution)

- Set realistic thresholds based on historical data
- Monitor trends over time
- Alert on significant distribution shifts
- Use for production monitoring dashboards

### UC3 & UC4 (Ground Truth)

- Balance precision and recall based on error costs
- Use confusion matrix to identify systematic errors
- Prioritize recall for safety-critical tasks
- Regularly update test sets as model evolves

### General

- Start simple (UC1) and add complexity as needed
- Use UC4 to validate before deploying UC2 in production
- Combine patterns for comprehensive evaluation
- Document threshold choices and rationale

## Next Steps

- [Regression Metrics Guide](./regression-metrics.md) - Detailed regression evaluation
- [LLM Metrics Guide](./llm-metrics.md) - LLM-based evaluation
- [Agent Judges Guide](./agent-judges.md) - Judge validation patterns
- [Examples](../examples/) - Working code for all patterns

## References

- [README](../README.md) - Library overview
- [API Documentation](../src/index.ts) - TypeScript definitions
- [Migration Guide](./migration-v0.2.md) - Upgrade from v0.1.x
