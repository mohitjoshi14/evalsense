# Regression Metrics Guide

This guide covers regression evaluation in evalsense for numeric predictions like ratings, prices, scores, and continuous values.

## Table of Contents

- [Overview](#overview)
- [Available Metrics](#available-metrics)
- [Usage Examples](#usage-examples)
- [When to Use Each Metric](#when-to-use-each-metric)
- [Best Practices](#best-practices)
- [Common Use Cases](#common-use-cases)

## Overview

Regression metrics evaluate how well numeric predictions match ground truth values. Unlike classification (correct/incorrect), regression measures the magnitude of errors.

### Quick Example

```javascript
import { describe, evalTest, expectStats } from "evalsense";

describe("Rating Prediction Model", () => {
  evalTest("accurate predictions", () => {
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
      .toHaveMAEBelow(0.3) // Average error < 0.3
      .toHaveRMSEBelow(0.3) // Root mean squared error < 0.3
      .toHaveR2Above(0.9); // Strong correlation (R² > 0.9)
  });
});
```

## Available Metrics

### Mean Absolute Error (MAE)

**Definition**: Average of absolute differences between predicted and actual values.

```javascript
toHaveMAEBelow(threshold);
```

**Formula**: `MAE = (1/n) × Σ|predicted - actual|`

**Interpretation**:

- **0.0**: Perfect predictions
- **Lower values**: Better performance
- **Same scale as your data**: Easy to interpret

**Example**:

```javascript
// Price predictions
expectStats(predictions, groundTruth).field("price").toHaveMAEBelow(50); // Average error less than $50
```

**When to use**:

- You want easily interpretable error metric
- All errors are equally important
- Outliers shouldn't dominate the metric

### Root Mean Squared Error (RMSE)

**Definition**: Square root of average squared differences.

```javascript
toHaveRMSEBelow(threshold);
```

**Formula**: `RMSE = sqrt((1/n) × Σ(predicted - actual)²)`

**Interpretation**:

- **0.0**: Perfect predictions
- **Lower values**: Better performance
- **Same scale as your data**
- **Penalizes large errors more than MAE**

**Example**:

```javascript
// Temperature predictions
expectStats(predictions, groundTruth).field("temperature").toHaveRMSEBelow(2.0); // RMSE less than 2°C
```

**When to use**:

- Large errors are particularly undesirable
- You want to penalize outliers more heavily
- Standard metric for many ML applications

### R-squared (R²)

**Definition**: Proportion of variance in actual values explained by predictions.

```javascript
toHaveR2Above(threshold);
```

**Formula**: `R² = 1 - (SS_residual / SS_total)`

**Interpretation**:

- **1.0**: Perfect predictions (explains all variance)
- **0.0**: Model no better than predicting the mean
- **<0.0**: Model worse than predicting the mean
- **0.7+**: Generally considered good
- **0.9+**: Very strong correlation

**Example**:

```javascript
// Sales forecasting
expectStats(predictions, groundTruth).field("sales").toHaveR2Above(0.85); // Strong predictive power
```

**When to use**:

- You want to measure correlation strength
- You need a normalized metric (0-1 range)
- Comparing models on different scales

## Usage Examples

### Basic Usage

```javascript
import { describe, evalTest, expectStats } from "evalsense";

describe("Regression Evaluation", () => {
  evalTest("all three metrics", () => {
    const predictions = [
      { id: "1", score: 4.2 },
      { id: "2", score: 3.8 },
    ];

    const groundTruth = [
      { id: "1", score: 4.0 },
      { id: "2", score: 4.0 },
    ];

    expectStats(predictions, groundTruth)
      .field("score")
      .toHaveMAEBelow(0.3)
      .toHaveRMSEBelow(0.3)
      .toHaveR2Above(0.8);
  });
});
```

### With runModel

```javascript
import { loadDataset, runModel } from "evalsense";

describe("Rating Predictor", () => {
  evalTest("evaluate on test set", async () => {
    const dataset = loadDataset("./test-ratings.json");

    const result = await runModel(dataset, (record) => ({
      id: record.id,
      predictedRating: predictRating(record),
    }));

    expectStats(result)
      .field("predictedRating") // Uses "rating" from dataset as ground truth
      .toHaveMAEBelow(0.5)
      .toHaveR2Above(0.7);
  });
});
```

### Multiple Fields

```javascript
describe("Multi-Output Model", () => {
  evalTest("evaluate all outputs", () => {
    const predictions = [
      { id: "1", price: 100, quantity: 5 },
      { id: "2", price: 250, quantity: 3 },
    ];

    const groundTruth = [
      { id: "1", price: 105, quantity: 5 },
      { id: "2", price: 240, quantity: 3 },
    ];

    // Evaluate each field independently
    expectStats(predictions, groundTruth).field("price").toHaveMAEBelow(10).toHaveR2Above(0.9);

    expectStats(predictions, groundTruth).field("quantity").toHaveMAEBelow(1).toHaveR2Above(0.95);
  });
});
```

### Chaining with Distribution Assertions

```javascript
describe("Combined Evaluation", () => {
  evalTest("regression + distribution", () => {
    const predictions = [
      { id: "1", score: 4.2, confidence: 0.9 },
      { id: "2", score: 3.8, confidence: 0.85 },
    ];

    const groundTruth = [
      { id: "1", score: 4.0 },
      { id: "2", score: 4.0 },
    ];

    // Regression metrics
    expectStats(predictions, groundTruth).field("score").toHaveMAEBelow(0.3).toHaveR2Above(0.8);

    // Distribution check (no ground truth needed)
    expectStats(predictions).field("confidence").toHavePercentageAbove(0.8, 0.9); // 90% high confidence
  });
});
```

## When to Use Each Metric

### MAE vs RMSE

| Aspect                  | MAE              | RMSE                |
| ----------------------- | ---------------- | ------------------- |
| **Outlier Sensitivity** | Low              | High                |
| **Interpretability**    | Easier           | Moderate            |
| **Large Error Penalty** | Linear           | Quadratic           |
| **Use When**            | All errors equal | Large errors costly |

**Example Scenario - MAE**:
Rating predictions where a 1-star error is 2x worse than a 0.5-star error (linear).

**Example Scenario - RMSE**:
Medical dosage predictions where a 2x error is 4x worse than a 1x error (quadratic).

### R² vs MAE/RMSE

| Aspect                | R²                 | MAE/RMSE          |
| --------------------- | ------------------ | ----------------- |
| **Scale**             | Normalized (0-1)   | Data scale        |
| **Interpretation**    | Correlation        | Error magnitude   |
| **Comparing Models**  | ✓ Different scales | ✗ Same scale only |
| **Threshold Setting** | Universal          | Data-specific     |

**Use R² when**:

- Comparing models on different datasets
- Want a single quality score
- Correlation matters more than absolute error

**Use MAE/RMSE when**:

- Absolute error magnitude matters
- Setting error budgets
- Domain-specific thresholds

## Best Practices

### 1. Choose Appropriate Thresholds

```javascript
// ✓ Good: Domain-specific thresholds
expectStats(predictions, groundTruth).field("price").toHaveMAEBelow(50); // $50 average error acceptable

// ✗ Bad: Arbitrary threshold
expectStats(predictions, groundTruth).field("price").toHaveMAEBelow(0.1); // May be unrealistic
```

### 2. Use Multiple Metrics

```javascript
// ✓ Good: Comprehensive evaluation
expectStats(predictions, groundTruth)
  .field("score")
  .toHaveMAEBelow(0.3) // Average error
  .toHaveRMSEBelow(0.4) // Penalize outliers
  .toHaveR2Above(0.85); // Correlation strength

// ✗ Bad: Single metric only
expectStats(predictions, groundTruth).field("score").toHaveMAEBelow(0.3);
```

### 3. Understand Your Data Scale

```javascript
// For small values (0-5 scale)
expectStats(predictions, groundTruth).field("rating").toHaveMAEBelow(0.5); // 0.5 stars

// For large values (prices)
expectStats(predictions, groundTruth).field("price").toHaveMAEBelow(100); // $100
```

### 4. Monitor Error Distribution

```javascript
// Check prediction spread
expectStats(predictions)
  .field("predictedRating")
  .toHavePercentageAbove(3.0, 0.4) // 40% are high ratings
  .toHavePercentageBelow(2.0, 0.2); // 20% are low ratings
```

### 5. Validate Against Baselines

```javascript
// Compare to naive baseline
const naiveMAE = 1.5; // Baseline: always predict mean

expectStats(predictions, groundTruth)
  .field("score")
  .toHaveMAEBelow(naiveMAE * 0.7); // 30% better than baseline
```

## Common Use Cases

### Rating Prediction

```javascript
describe("Movie Rating Prediction", () => {
  evalTest("accurate ratings", () => {
    expectStats(predictions, groundTruth)
      .field("rating")
      .toHaveMAEBelow(0.5) // Within 0.5 stars
      .toHaveRMSEBelow(0.7) // Penalize large misses
      .toHaveR2Above(0.75); // Strong correlation
  });
});
```

### Price Forecasting

```javascript
describe("House Price Prediction", () => {
  evalTest("price accuracy", () => {
    expectStats(predictions, groundTruth)
      .field("price")
      .toHaveMAEBelow(50000) // $50K average error
      .toHaveRMSEBelow(75000) // Penalize large errors
      .toHaveR2Above(0.85); // Explain 85% of variance
  });
});
```

### Time Series Forecasting

```javascript
describe("Sales Forecasting", () => {
  evalTest("weekly sales", () => {
    expectStats(predictions, groundTruth)
      .field("weeklySales")
      .toHaveMAEBelow(100) // Within $100/week
      .toHaveRMSEBelow(150)
      .toHaveR2Above(0.8);
  });
});
```

### LLM Judge Score Prediction

```javascript
describe("Judge Score Calibration", () => {
  evalTest("predict human scores", () => {
    // LLM judge scores vs human scores
    expectStats(judgeScores, humanScores)
      .field("quality")
      .toHaveMAEBelow(0.15) // 0.15 on 0-1 scale
      .toHaveR2Above(0.85); // Strong agreement
  });
});
```

### Confidence Calibration

```javascript
describe("Confidence Score Calibration", () => {
  evalTest("confidence matches accuracy", () => {
    // Model confidence vs actual accuracy
    expectStats(predictions, actualAccuracy)
      .field("confidence")
      .toHaveMAEBelow(0.1) // Well-calibrated
      .toHaveR2Above(0.9); // Strong correlation
  });
});
```

## Error Handling

### Non-Numeric Values

```javascript
// Automatic filtering
const predictions = [
  { id: "1", score: 4.2 },
  { id: "2", score: "invalid" }, // Filtered out
  { id: "3", score: null }, // Filtered out
  { id: "4", score: 3.8 },
];

// Only numeric values used
expectStats(predictions, groundTruth).field("score").toHaveMAEBelow(0.5); // Uses only IDs 1 and 4
```

### Missing Ground Truth

```javascript
// Will throw clear error
expectStats(predictions).field("score").toHaveMAEBelow(0.5); // Error: requires ground truth
```

## Integration with Other Patterns

### UC1: Distribution Monitoring

```javascript
// Regression metrics require ground truth (UC3)
expectStats(predictions, groundTruth).field("score").toHaveMAEBelow(0.3);

// Distribution monitoring doesn't (UC1)
expectStats(predictions).field("score").toHavePercentageAbove(3.0, 0.7);
```

### UC4: Validate Regression Judges

```javascript
// Validate LLM judge scores against human scores
const judgeScores = await qualityScore({ outputs });
const humanScores = humanLabels;

expectStats(judgeScores, humanScores).field("score").toHaveMAEBelow(0.2).toHaveR2Above(0.8);
```

## Next Steps

- [Use Case Patterns Guide](./use-case-patterns.md) - See where regression fits
- [Examples](../examples/uc3-classification.eval.js) - Working regression examples
- [API Reference](../src/statistics/regression.ts) - Implementation details
- [Migration Guide](./migration-v0.2.md) - Upgrading to v0.2.1

## References

- MAE: https://en.wikipedia.org/wiki/Mean_absolute_error
- RMSE: https://en.wikipedia.org/wiki/Root-mean-square_deviation
- R²: https://en.wikipedia.org/wiki/Coefficient_of_determination
