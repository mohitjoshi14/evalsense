# Migration Guide: v0.2.0 → v0.3.0

This guide covers new features and improvements in evalsense v0.3.0.

## Summary

v0.3.0 adds:

- ✨ **Regression assertions** (`toHaveMAEBelow`, `toHaveRMSEBelow`, `toHaveR2Above`)
- ✨ **Flexible ID matching** (`expectStats(..., { idField: 'uuid' })`)
- ✨ **Consolidated examples** (8 files → 4 use case patterns)
- ✨ **Comprehensive test coverage** (330+ tests)
- 📚 **New documentation** (use case patterns, regression metrics)

**No breaking changes** - fully backwards compatible with v0.2.0.

## New Features

### 1. Regression Assertions

Evaluate numeric predictions with MAE, RMSE, and R² metrics.

```javascript
import { describe, evalTest, expectStats } from "evalsense";

describe("Rating Prediction", () => {
  evalTest("accurate predictions", () => {
    const predictions = [
      { id: "1", rating: 4.2 },
      { id: "2", rating: 3.8 },
    ];

    const groundTruth = [
      { id: "1", rating: 4.0 },
      { id: "2", rating: 4.0 },
    ];

    // NEW in v0.3.0
    expectStats(predictions, groundTruth)
      .field("rating")
      .toHaveMAEBelow(0.3) // Mean Absolute Error
      .toHaveRMSEBelow(0.3) // Root Mean Squared Error
      .toHaveR2Above(0.8); // R-squared (correlation)
  });
});
```

**Use cases**:

- Rating predictions (1-5 stars)
- Price forecasting ($)
- Score predictions (0-1 scale)
- LLM judge score calibration

See [Regression Metrics Guide](./regression-metrics.md) for details.

### 2. Flexible ID Matching

Specify custom ID fields for aligning predictions with ground truth.

```javascript
import { expectStats } from "evalsense";

const predictions = [
  { id: "uuid-1", score: "high" },
  { id: "uuid-2", score: "low" },
];

const groundTruth = [
  { uuid: "uuid-1", score: "high" }, // Field name is "uuid", not "id"
  { uuid: "uuid-2", score: "high" },
];

// NEW in v0.3.0: Tell evalsense which field to use
expectStats(predictions, groundTruth, { idField: "uuid" }).field("score").toHaveAccuracyAbove(0.8);
```

**Options**:

```javascript
expectStats(predictions, groundTruth, {
  idField: "uuid", // Use this field from groundTruth (default: "id")
  strict: true, // Throw if any prediction has no matching groundTruth
});
```

**Use cases**:

- Legacy datasets with non-standard ID fields
- MongoDB documents (using `_id`)
- UUID-based systems
- Custom identifier schemes

### 3. Four Use Case Patterns

Examples have been consolidated from 8 files to 4 focused patterns:

| File                                 | Pattern | Use Case                                      |
| ------------------------------------ | ------- | --------------------------------------------- |
| `uc1-distribution.eval.js`           | UC1     | Monitor distributions without ground truth    |
| `uc2-llm-judge-distribution.eval.js` | UC2     | LLM judge evaluation (per-row vs batch)       |
| `uc3-classification.eval.js`         | UC3     | Classification & regression with ground truth |
| `uc4-judge-validation.eval.js`       | UC4     | Validate judges against human labels          |

**What changed**:

- ❌ Removed: `distribution-assertions.eval.js` → ✅ Now: `uc1-distribution.eval.js`
- ❌ Removed: `llm-metrics*.eval.js` (4 files) → ✅ Now: `uc2-llm-judge-distribution.eval.js`
- ❌ Removed: `judge-validation.eval.js` → ✅ Now: `uc4-judge-validation.eval.js`
- ❌ Removed: `basic/classification.eval.js` → ✅ Now: `uc3-classification.eval.js`

See [Use Case Patterns Guide](./use-case-patterns.md) for the complete pattern reference.

## Migration Steps

### Step 1: No Action Required (Backwards Compatible)

v0.3.0 is fully backwards compatible. Your existing code will continue to work.

### Step 2: Optional - Add Regression Assertions

If you evaluate numeric predictions, consider adding regression metrics:

**Before (v0.2.0)**:

```javascript
// No built-in way to evaluate regression
const predictions = [
  { id: "1", rating: 4.2 },
  { id: "2", rating: 3.8 },
];

// Had to compute metrics manually or use distribution assertions
expectStats(predictions).field("rating").toHavePercentageAbove(3.0, 0.8); // Indirect validation
```

**After (v0.3.0)**:

```javascript
// Direct regression evaluation
expectStats(predictions, groundTruth).field("rating").toHaveMAEBelow(0.5).toHaveR2Above(0.8); // Direct validation
```

### Step 3: Optional - Use Custom ID Fields

If your datasets use non-standard ID fields, simplify alignment:

**Before (v0.2.0)**:

```javascript
// Had to pre-process to rename fields
const predictions = rawPredictions.map((p) => ({
  id: p.uuid, // Rename uuid → id
  ...p,
}));
```

**After (v0.3.0)**:

```javascript
// Use idField option directly
expectStats(predictions, groundTruth, { idField: "uuid" }).field("score").toHaveAccuracyAbove(0.8);
```

### Step 4: Optional - Update Example References

If you reference examples in documentation or tests, update to new names:

| Old Reference                              | New Reference                                 |
| ------------------------------------------ | --------------------------------------------- |
| `examples/distribution-assertions.eval.js` | `examples/uc1-distribution.eval.js`           |
| `examples/llm-metrics-basic.eval.js`       | `examples/uc2-llm-judge-distribution.eval.js` |
| `examples/judge-validation.eval.js`        | `examples/uc4-judge-validation.eval.js`       |
| `examples/basic/classification.eval.js`    | `examples/uc3-classification.eval.js`         |

## New Documentation

### Added in v0.3.0

- **[Use Case Patterns Guide](./use-case-patterns.md)** - Complete guide to the four core patterns
- **[Regression Metrics Guide](./regression-metrics.md)** - Detailed regression evaluation documentation

### Updated in v0.3.0

- **[Agent Judges Guide](./agent-judges.md)** - Updated example references
- **[LLM Metrics Guide](./llm-metrics.md)** - Updated example references

## API Additions

### New Assertions

```typescript
// Regression metrics
FieldSelector.toHaveMAEBelow(threshold: number): this
FieldSelector.toHaveRMSEBelow(threshold: number): this
FieldSelector.toHaveR2Above(threshold: number): this
```

### New Options

```typescript
// Flexible ID matching
interface ExpectStatsOptions {
  idField?: string; // NEW: Custom ID field name
  strict?: boolean; // NEW: Strict alignment mode
}

function expectStats(
  actual: Prediction[],
  expected: Array<Record<string, unknown>>,
  options?: ExpectStatsOptions // NEW: Options parameter
): ExpectStats;
```

## Examples

### Regression Evaluation

```javascript
// Price prediction
expectStats(predictions, groundTruth)
  .field("price")
  .toHaveMAEBelow(50) // Average error < $50
  .toHaveRMSEBelow(75) // Penalize large errors
  .toHaveR2Above(0.85); // Strong correlation

// Rating prediction
expectStats(predictions, groundTruth)
  .field("rating")
  .toHaveMAEBelow(0.5) // Within 0.5 stars
  .toHaveR2Above(0.75);
```

### Custom ID Field

```javascript
// MongoDB-style _id
const groundTruth = [
  { _id: "abc123", label: "positive" },
  { _id: "def456", label: "negative" },
];

expectStats(predictions, groundTruth, { idField: "_id" }).field("label").toHaveAccuracyAbove(0.9);

// UUID field
const groundTruth = [
  { itemUuid: "uuid-1", category: "spam" },
  { itemUuid: "uuid-2", category: "ham" },
];

expectStats(predictions, groundTruth, { idField: "itemUuid" })
  .field("category")
  .toHaveAccuracyAbove(0.9);
```

### Strict Mode

```javascript
// Throw if predictions have no matching ground truth
expectStats(predictions, groundTruth, { strict: true }).field("label").toHaveAccuracyAbove(0.9);

// Non-strict (default): Include records with missing ground truth
expectStats(predictions, groundTruth).field("label").toHaveAccuracyAbove(0.9);
```

## Test Coverage

v0.3.0 significantly improves test coverage:

- **Total tests**: 330+ (up from ~230)
- **New test suites**:
  - `tests/unit/statistics/regression.test.ts` (26 tests)
  - `tests/unit/assertions/regression-assertions.test.ts` (18 tests)
  - `tests/unit/runner/executor.test.ts` (29 tests)
  - `tests/unit/runner/discovery.test.ts` (23 tests)
- **Updated tests**:
  - `tests/unit/assertions/expect-stats-two-arg.test.ts` (added flexible ID matching tests)

## Known Issues

None. This is a stable release.

## Questions?

- 📖 [Use Case Patterns Guide](./use-case-patterns.md) - See all patterns
- 📖 [Regression Metrics Guide](./regression-metrics.md) - Regression details
- 💬 [GitHub Issues](https://github.com/anthropics/evalsense/issues) - Report issues
- 📚 [Examples](../examples/) - Working code examples

## Next Steps

1. **Explore new features** - Try regression metrics and custom ID fields
2. **Review patterns** - Read the [Use Case Patterns Guide](./use-case-patterns.md)
3. **Update examples** - If referencing old example files, update to new names
4. **Provide feedback** - Let us know what you think!

Happy evaluating! 🎯
