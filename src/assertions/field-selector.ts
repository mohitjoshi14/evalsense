/**
 * FieldSelector - selects a field for statistical assertions
 */

import type { AlignedRecord, AssertionResult, FieldMetricResult } from "../core/types.js";
import { recordAssertion, recordFieldMetrics } from "../core/context.js";
import { AssertionError } from "../core/errors.js";
import { extractFieldValues } from "../dataset/alignment.js";
import { computeClassificationMetrics } from "../statistics/classification.js";
import {
  filterNumericValues,
  calculatePercentageBelow,
  calculatePercentageAbove,
} from "../statistics/distribution.js";
import { BinarizeSelector } from "./binarize.js";

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
   * Asserts that accuracy is above a threshold
   */
  toHaveAccuracyAbove(threshold: number): this {
    this.validateGroundTruth();
    const metrics = computeClassificationMetrics(this.actualValues, this.expectedValues);
    const passed = metrics.accuracy >= threshold;

    const result: AssertionResult = {
      type: "accuracy",
      passed,
      message: passed
        ? `Accuracy ${(metrics.accuracy * 100).toFixed(1)}% is above ${(threshold * 100).toFixed(1)}%`
        : `Accuracy ${(metrics.accuracy * 100).toFixed(1)}% is below threshold ${(threshold * 100).toFixed(1)}%`,
      expected: threshold,
      actual: metrics.accuracy,
      field: this.fieldName,
    };

    this.assertions.push(result);
    recordAssertion(result);

    if (!passed) {
      throw new AssertionError(result.message, threshold, metrics.accuracy, this.fieldName);
    }

    return this;
  }

  /**
   * Asserts that precision is above a threshold
   * @param classOrThreshold - Either the class name or threshold (if class is omitted, uses macro average)
   * @param threshold - Threshold when class is specified
   */
  toHavePrecisionAbove(classOrThreshold: string | number, threshold?: number): this {
    this.validateGroundTruth();
    const metrics = computeClassificationMetrics(this.actualValues, this.expectedValues);

    let actualPrecision: number;
    let targetClass: string | undefined;
    let actualThreshold: number;

    if (typeof classOrThreshold === "number") {
      // Macro average precision
      actualPrecision = metrics.macroAvg.precision;
      actualThreshold = classOrThreshold;
    } else {
      // Per-class precision
      targetClass = classOrThreshold;
      actualThreshold = threshold!;
      const classMetrics = metrics.perClass[targetClass];
      if (!classMetrics) {
        throw new AssertionError(
          `Class "${targetClass}" not found in predictions`,
          targetClass,
          Object.keys(metrics.perClass),
          this.fieldName
        );
      }
      actualPrecision = classMetrics.precision;
    }

    const passed = actualPrecision >= actualThreshold;

    const result: AssertionResult = {
      type: "precision",
      passed,
      message: passed
        ? `Precision${targetClass ? ` for "${targetClass}"` : ""} ${(actualPrecision * 100).toFixed(1)}% is above ${(actualThreshold * 100).toFixed(1)}%`
        : `Precision${targetClass ? ` for "${targetClass}"` : ""} ${(actualPrecision * 100).toFixed(1)}% is below threshold ${(actualThreshold * 100).toFixed(1)}%`,
      expected: actualThreshold,
      actual: actualPrecision,
      field: this.fieldName,
      class: targetClass,
    };

    this.assertions.push(result);
    recordAssertion(result);

    if (!passed) {
      throw new AssertionError(result.message, actualThreshold, actualPrecision, this.fieldName);
    }

    return this;
  }

  /**
   * Asserts that recall is above a threshold
   * @param classOrThreshold - Either the class name or threshold (if class is omitted, uses macro average)
   * @param threshold - Threshold when class is specified
   */
  toHaveRecallAbove(classOrThreshold: string | number, threshold?: number): this {
    this.validateGroundTruth();
    const metrics = computeClassificationMetrics(this.actualValues, this.expectedValues);

    let actualRecall: number;
    let targetClass: string | undefined;
    let actualThreshold: number;

    if (typeof classOrThreshold === "number") {
      // Macro average recall
      actualRecall = metrics.macroAvg.recall;
      actualThreshold = classOrThreshold;
    } else {
      // Per-class recall
      targetClass = classOrThreshold;
      actualThreshold = threshold!;
      const classMetrics = metrics.perClass[targetClass];
      if (!classMetrics) {
        throw new AssertionError(
          `Class "${targetClass}" not found in predictions`,
          targetClass,
          Object.keys(metrics.perClass),
          this.fieldName
        );
      }
      actualRecall = classMetrics.recall;
    }

    const passed = actualRecall >= actualThreshold;

    const result: AssertionResult = {
      type: "recall",
      passed,
      message: passed
        ? `Recall${targetClass ? ` for "${targetClass}"` : ""} ${(actualRecall * 100).toFixed(1)}% is above ${(actualThreshold * 100).toFixed(1)}%`
        : `Recall${targetClass ? ` for "${targetClass}"` : ""} ${(actualRecall * 100).toFixed(1)}% is below threshold ${(actualThreshold * 100).toFixed(1)}%`,
      expected: actualThreshold,
      actual: actualRecall,
      field: this.fieldName,
      class: targetClass,
    };

    this.assertions.push(result);
    recordAssertion(result);

    if (!passed) {
      throw new AssertionError(result.message, actualThreshold, actualRecall, this.fieldName);
    }

    return this;
  }

  /**
   * Asserts that F1 score is above a threshold
   * @param classOrThreshold - Either the class name or threshold (if class is omitted, uses macro average)
   * @param threshold - Threshold when class is specified
   */
  toHaveF1Above(classOrThreshold: string | number, threshold?: number): this {
    this.validateGroundTruth();
    const metrics = computeClassificationMetrics(this.actualValues, this.expectedValues);

    let actualF1: number;
    let targetClass: string | undefined;
    let actualThreshold: number;

    if (typeof classOrThreshold === "number") {
      // Macro average F1
      actualF1 = metrics.macroAvg.f1;
      actualThreshold = classOrThreshold;
    } else {
      // Per-class F1
      targetClass = classOrThreshold;
      actualThreshold = threshold!;
      const classMetrics = metrics.perClass[targetClass];
      if (!classMetrics) {
        throw new AssertionError(
          `Class "${targetClass}" not found in predictions`,
          targetClass,
          Object.keys(metrics.perClass),
          this.fieldName
        );
      }
      actualF1 = classMetrics.f1;
    }

    const passed = actualF1 >= actualThreshold;

    const result: AssertionResult = {
      type: "f1",
      passed,
      message: passed
        ? `F1${targetClass ? ` for "${targetClass}"` : ""} ${(actualF1 * 100).toFixed(1)}% is above ${(actualThreshold * 100).toFixed(1)}%`
        : `F1${targetClass ? ` for "${targetClass}"` : ""} ${(actualF1 * 100).toFixed(1)}% is below threshold ${(actualThreshold * 100).toFixed(1)}%`,
      expected: actualThreshold,
      actual: actualF1,
      field: this.fieldName,
      class: targetClass,
    };

    this.assertions.push(result);
    recordAssertion(result);

    if (!passed) {
      throw new AssertionError(result.message, actualThreshold, actualF1, this.fieldName);
    }

    return this;
  }

  /**
   * Includes the confusion matrix in the report
   */
  toHaveConfusionMatrix(): this {
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

  /**
   * Asserts that a percentage of values are below or equal to a threshold.
   * This is a distributional assertion that only looks at actual values (no ground truth required).
   *
   * @param valueThreshold - The value threshold to compare against
   * @param percentageThreshold - The minimum percentage (0-1) of values that should be <= valueThreshold
   * @returns this for method chaining
   *
   * @example
   * // Assert that 90% of confidence scores are below 0.5
   * expectStats(predictions)
   *   .field("confidence")
   *   .toHavePercentageBelow(0.5, 0.9)
   */
  toHavePercentageBelow(valueThreshold: number, percentageThreshold: number): this {
    // Filter to numeric values only
    const numericActual = filterNumericValues(this.actualValues);

    // Validate: throw if no numeric values found
    if (numericActual.length === 0) {
      throw new AssertionError(
        `Field '${this.fieldName}' contains no numeric values (found 0 numeric out of ${this.actualValues.length} total values)`,
        percentageThreshold,
        undefined,
        this.fieldName
      );
    }

    // Calculate actual percentage
    const actualPercentage = calculatePercentageBelow(numericActual, valueThreshold);
    const passed = actualPercentage >= percentageThreshold;

    // Create AssertionResult
    const result: AssertionResult = {
      type: "percentageBelow",
      passed,
      message: passed
        ? `${(actualPercentage * 100).toFixed(1)}% of '${this.fieldName}' values are below or equal to ${valueThreshold} (expected >= ${(percentageThreshold * 100).toFixed(1)}%)`
        : `Only ${(actualPercentage * 100).toFixed(1)}% of '${this.fieldName}' values are below or equal to ${valueThreshold} (expected >= ${(percentageThreshold * 100).toFixed(1)}%)`,
      expected: percentageThreshold,
      actual: actualPercentage,
      field: this.fieldName,
    };

    // Record and throw if failed
    this.assertions.push(result);
    recordAssertion(result);

    if (!passed) {
      throw new AssertionError(
        result.message,
        percentageThreshold,
        actualPercentage,
        this.fieldName
      );
    }

    return this;
  }

  /**
   * Asserts that a percentage of values are above a threshold.
   * This is a distributional assertion that only looks at actual values (no ground truth required).
   *
   * @param valueThreshold - The value threshold to compare against
   * @param percentageThreshold - The minimum percentage (0-1) of values that should be > valueThreshold
   * @returns this for method chaining
   *
   * @example
   * // Assert that 80% of quality scores are above 0.7
   * expectStats(predictions)
   *   .field("quality")
   *   .toHavePercentageAbove(0.7, 0.8)
   */
  toHavePercentageAbove(valueThreshold: number, percentageThreshold: number): this {
    // Filter to numeric values only
    const numericActual = filterNumericValues(this.actualValues);

    // Validate: throw if no numeric values found
    if (numericActual.length === 0) {
      throw new AssertionError(
        `Field '${this.fieldName}' contains no numeric values (found 0 numeric out of ${this.actualValues.length} total values)`,
        percentageThreshold,
        undefined,
        this.fieldName
      );
    }

    // Calculate actual percentage
    const actualPercentage = calculatePercentageAbove(numericActual, valueThreshold);
    const passed = actualPercentage >= percentageThreshold;

    // Create AssertionResult
    const result: AssertionResult = {
      type: "percentageAbove",
      passed,
      message: passed
        ? `${(actualPercentage * 100).toFixed(1)}% of '${this.fieldName}' values are above ${valueThreshold} (expected >= ${(percentageThreshold * 100).toFixed(1)}%)`
        : `Only ${(actualPercentage * 100).toFixed(1)}% of '${this.fieldName}' values are above ${valueThreshold} (expected >= ${(percentageThreshold * 100).toFixed(1)}%)`,
      expected: percentageThreshold,
      actual: actualPercentage,
      field: this.fieldName,
    };

    // Record and throw if failed
    this.assertions.push(result);
    recordAssertion(result);

    if (!passed) {
      throw new AssertionError(
        result.message,
        percentageThreshold,
        actualPercentage,
        this.fieldName
      );
    }

    return this;
  }

  /**
   * Gets the computed metrics for this field
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
