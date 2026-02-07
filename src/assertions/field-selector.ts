/**
 * FieldSelector - selects a field for statistical assertions with Jest-like API
 */

import type { AlignedRecord, AssertionResult, FieldMetricResult } from "../core/types.js";
import { recordAssertion, recordFieldMetrics } from "../core/context.js";
import { AssertionError } from "../core/errors.js";
import { extractFieldValues } from "../dataset/alignment.js";
import { computeClassificationMetrics } from "../statistics/classification.js";
import { computeRegressionMetrics } from "../statistics/regression.js";
import {
  filterNumericValues,
  calculatePercentageBelow,
  calculatePercentageAbove,
} from "../statistics/distribution.js";
import { BinarizeSelector } from "./binarize.js";
import { MetricMatcher } from "./metric-matcher.js";
import { PercentageMatcher } from "./percentage-matcher.js";

/**
 * Field selector for building assertions on a specific field
 */
export class FieldSelector {
  private aligned: AlignedRecord[];
  private fieldName: string;
  private actualValues: unknown[];
  private expectedValues: unknown[];
  private assertions: AssertionResult[] = [];

  constructor(aligned: AlignedRecord[], fieldName: string) {
    this.aligned = aligned;
    this.fieldName = fieldName;

    const extracted = extractFieldValues(aligned, fieldName);
    this.actualValues = extracted.actual;
    this.expectedValues = extracted.expected;
  }

  /**
   * Transforms continuous scores to binary classification using a threshold
   */
  binarize(threshold: number): BinarizeSelector {
    return new BinarizeSelector(this.aligned, this.fieldName, threshold);
  }

  /**
   * Validates that ground truth exists for classification metrics.
   * Throws a clear error if expected values are missing.
   */
  private validateGroundTruth(): void {
    const hasExpected = this.expectedValues.some((v) => v !== undefined && v !== null);
    if (!hasExpected) {
      throw new AssertionError(
        `Classification metric requires ground truth, but field "${this.fieldName}" has no expected values. ` +
          `Use expectStats(predictions, groundTruth) to provide expected values.`,
        undefined,
        undefined,
        this.fieldName
      );
    }
  }

  /**
   * Validates that ground truth exists and both arrays contain numeric values.
   * Returns the filtered numeric arrays for regression metrics.
   */
  private validateRegressionInputs(): { actual: number[]; expected: number[] } {
    this.validateGroundTruth();

    const numericActual = filterNumericValues(this.actualValues);
    const numericExpected = filterNumericValues(this.expectedValues);

    if (numericActual.length === 0) {
      throw new AssertionError(
        `Regression metric requires numeric values, but field "${this.fieldName}" has no numeric actual values.`,
        undefined,
        undefined,
        this.fieldName
      );
    }

    if (numericExpected.length === 0) {
      throw new AssertionError(
        `Regression metric requires numeric values, but field "${this.fieldName}" has no numeric expected values.`,
        undefined,
        undefined,
        this.fieldName
      );
    }

    if (numericActual.length !== numericExpected.length) {
      throw new AssertionError(
        `Regression metric requires equal-length arrays, but got ${numericActual.length} actual and ${numericExpected.length} expected values.`,
        numericExpected.length,
        numericActual.length,
        this.fieldName
      );
    }

    return { actual: numericActual, expected: numericExpected };
  }

  // ============================================================================
  // Classification Metric Getters
  // ============================================================================

  /**
   * Access accuracy metric for assertions
   * @example
   * expectStats(predictions, groundTruth)
   *   .field("sentiment")
   *   .accuracy.toBeAtLeast(0.8)
   */
  get accuracy(): MetricMatcher<this> {
    this.validateGroundTruth();
    const metrics = computeClassificationMetrics(this.actualValues, this.expectedValues);

    return new MetricMatcher({
      parent: this,
      metricName: "Accuracy",
      metricValue: metrics.accuracy,
      fieldName: this.fieldName,
      assertions: this.assertions,
    });
  }

  /**
   * Access F1 score metric for assertions (macro average)
   * @example
   * expectStats(predictions, groundTruth)
   *   .field("sentiment")
   *   .f1.toBeAtLeast(0.75)
   */
  get f1(): MetricMatcher<this> {
    this.validateGroundTruth();
    const metrics = computeClassificationMetrics(this.actualValues, this.expectedValues);

    return new MetricMatcher({
      parent: this,
      metricName: "F1",
      metricValue: metrics.macroAvg.f1,
      fieldName: this.fieldName,
      assertions: this.assertions,
    });
  }

  /**
   * Access precision metric for assertions
   * @param targetClass - Optional class name. If omitted, uses macro average
   * @example
   * expectStats(predictions, groundTruth)
   *   .field("sentiment")
   *   .precision("positive").toBeAtLeast(0.7)
   */
  precision(targetClass?: string): MetricMatcher<this> {
    this.validateGroundTruth();
    const metrics = computeClassificationMetrics(this.actualValues, this.expectedValues);

    let metricValue: number;
    if (targetClass === undefined) {
      metricValue = metrics.macroAvg.precision;
    } else {
      const classMetrics = metrics.perClass[targetClass];
      if (!classMetrics) {
        throw new AssertionError(
          `Class "${targetClass}" not found in predictions`,
          targetClass,
          Object.keys(metrics.perClass),
          this.fieldName
        );
      }
      metricValue = classMetrics.precision;
    }

    return new MetricMatcher({
      parent: this,
      metricName: "Precision",
      metricValue,
      fieldName: this.fieldName,
      targetClass,
      assertions: this.assertions,
    });
  }

  /**
   * Access recall metric for assertions
   * @param targetClass - Optional class name. If omitted, uses macro average
   * @example
   * expectStats(predictions, groundTruth)
   *   .field("sentiment")
   *   .recall("positive").toBeAtLeast(0.7)
   */
  recall(targetClass?: string): MetricMatcher<this> {
    this.validateGroundTruth();
    const metrics = computeClassificationMetrics(this.actualValues, this.expectedValues);

    let metricValue: number;
    if (targetClass === undefined) {
      metricValue = metrics.macroAvg.recall;
    } else {
      const classMetrics = metrics.perClass[targetClass];
      if (!classMetrics) {
        throw new AssertionError(
          `Class "${targetClass}" not found in predictions`,
          targetClass,
          Object.keys(metrics.perClass),
          this.fieldName
        );
      }
      metricValue = classMetrics.recall;
    }

    return new MetricMatcher({
      parent: this,
      metricName: "Recall",
      metricValue,
      fieldName: this.fieldName,
      targetClass,
      assertions: this.assertions,
    });
  }

  // ============================================================================
  // Regression Metric Getters
  // ============================================================================

  /**
   * Access Mean Absolute Error metric for assertions
   * @example
   * expectStats(predictions, groundTruth)
   *   .field("score")
   *   .mae.toBeAtMost(0.1)
   */
  get mae(): MetricMatcher<this> {
    const { actual, expected } = this.validateRegressionInputs();
    const metrics = computeRegressionMetrics(actual, expected);

    return new MetricMatcher({
      parent: this,
      metricName: "MAE",
      metricValue: metrics.mae,
      fieldName: this.fieldName,
      assertions: this.assertions,
      formatValue: (v) => v.toFixed(4),
    });
  }

  /**
   * Access Root Mean Squared Error metric for assertions
   * @example
   * expectStats(predictions, groundTruth)
   *   .field("score")
   *   .rmse.toBeAtMost(0.15)
   */
  get rmse(): MetricMatcher<this> {
    const { actual, expected } = this.validateRegressionInputs();
    const metrics = computeRegressionMetrics(actual, expected);

    return new MetricMatcher({
      parent: this,
      metricName: "RMSE",
      metricValue: metrics.rmse,
      fieldName: this.fieldName,
      assertions: this.assertions,
      formatValue: (v) => v.toFixed(4),
    });
  }

  /**
   * Access R-squared (coefficient of determination) metric for assertions
   * @example
   * expectStats(predictions, groundTruth)
   *   .field("score")
   *   .r2.toBeAtLeast(0.8)
   */
  get r2(): MetricMatcher<this> {
    const { actual, expected } = this.validateRegressionInputs();
    const metrics = computeRegressionMetrics(actual, expected);

    return new MetricMatcher({
      parent: this,
      metricName: "R²",
      metricValue: metrics.r2,
      fieldName: this.fieldName,
      assertions: this.assertions,
      formatValue: (v) => v.toFixed(4),
    });
  }

  // ============================================================================
  // Distribution Assertions
  // ============================================================================

  /**
   * Assert on the percentage of values below or equal to a threshold
   * @param valueThreshold - The value threshold to compare against
   * @example
   * expectStats(predictions)
   *   .field("confidence")
   *   .percentageBelow(0.5).toBeAtLeast(0.9)
   */
  percentageBelow(valueThreshold: number): PercentageMatcher<this> {
    const numericActual = filterNumericValues(this.actualValues);

    if (numericActual.length === 0) {
      throw new AssertionError(
        `Field '${this.fieldName}' contains no numeric values (found 0 numeric out of ${this.actualValues.length} total values)`,
        undefined,
        undefined,
        this.fieldName
      );
    }

    const actualPercentage = calculatePercentageBelow(numericActual, valueThreshold);

    return new PercentageMatcher({
      parent: this,
      fieldName: this.fieldName,
      valueThreshold,
      direction: "below",
      actualPercentage,
      assertions: this.assertions,
    });
  }

  /**
   * Assert on the percentage of values above a threshold
   * @param valueThreshold - The value threshold to compare against
   * @example
   * expectStats(predictions)
   *   .field("quality")
   *   .percentageAbove(0.7).toBeAtLeast(0.8)
   */
  percentageAbove(valueThreshold: number): PercentageMatcher<this> {
    const numericActual = filterNumericValues(this.actualValues);

    if (numericActual.length === 0) {
      throw new AssertionError(
        `Field '${this.fieldName}' contains no numeric values (found 0 numeric out of ${this.actualValues.length} total values)`,
        undefined,
        undefined,
        this.fieldName
      );
    }

    const actualPercentage = calculatePercentageAbove(numericActual, valueThreshold);

    return new PercentageMatcher({
      parent: this,
      fieldName: this.fieldName,
      valueThreshold,
      direction: "above",
      actualPercentage,
      assertions: this.assertions,
    });
  }

  // ============================================================================
  // Display Methods
  // ============================================================================

  /**
   * Displays the confusion matrix in the report
   * This is not an assertion - it always passes and just records the matrix for display
   * @example
   * expectStats(predictions, groundTruth)
   *   .field("sentiment")
   *   .accuracy.toBeAtLeast(0.8)
   *   .displayConfusionMatrix()
   */
  displayConfusionMatrix(): this {
    const metrics = computeClassificationMetrics(this.actualValues, this.expectedValues);

    const fieldResult: FieldMetricResult = {
      field: this.fieldName,
      metrics,
      binarized: false,
    };

    recordFieldMetrics(fieldResult);

    const result: AssertionResult = {
      type: "confusionMatrix",
      passed: true,
      message: `Confusion matrix recorded for field "${this.fieldName}"`,
      field: this.fieldName,
    };

    this.assertions.push(result);
    recordAssertion(result);

    return this;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Gets the computed classification metrics for this field
   */
  getMetrics() {
    return computeClassificationMetrics(this.actualValues, this.expectedValues);
  }

  /**
   * Gets all assertions made on this field
   */
  getAssertions(): AssertionResult[] {
    return this.assertions;
  }
}
