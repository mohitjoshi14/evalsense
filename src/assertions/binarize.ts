/**
 * BinarizeSelector - transforms continuous scores to binary for classification metrics
 */

import type { AlignedRecord, AssertionResult, FieldMetricResult } from "../core/types.js";
import { recordAssertion, recordFieldMetrics } from "../core/context.js";
import { AssertionError } from "../core/errors.js";
import { computeClassificationMetrics } from "../statistics/classification.js";
import { MetricMatcher } from "./metric-matcher.js";

/**
 * Selector for binarized fields (continuous → binary threshold)
 */
export class BinarizeSelector {
  private fieldName: string;
  private threshold: number;
  private binaryActual: string[];
  private binaryExpected: string[];
  private assertions: AssertionResult[] = [];

  constructor(aligned: AlignedRecord[], fieldName: string, threshold: number) {
    this.fieldName = fieldName;
    this.threshold = threshold;

    // Binarize values
    this.binaryActual = [];
    this.binaryExpected = [];

    for (const record of aligned) {
      const actualVal = record.actual[fieldName];
      const expectedVal = record.expected[fieldName];

      // Binarize actual (numeric score → true/false)
      if (typeof actualVal === "number") {
        this.binaryActual.push(actualVal >= threshold ? "true" : "false");
      } else if (typeof actualVal === "boolean") {
        this.binaryActual.push(String(actualVal));
      } else {
        this.binaryActual.push(String(actualVal));
      }

      // Expected can be boolean, number, or string
      if (typeof expectedVal === "number") {
        this.binaryExpected.push(expectedVal >= threshold ? "true" : "false");
      } else if (typeof expectedVal === "boolean") {
        this.binaryExpected.push(String(expectedVal));
      } else {
        this.binaryExpected.push(String(expectedVal));
      }
    }
  }

  // ============================================================================
  // Classification Metric Getters
  // ============================================================================

  /**
   * Access accuracy metric for assertions
   * @example
   * expectStats(predictions, groundTruth)
   *   .field("score")
   *   .binarize(0.5)
   *   .accuracy.toBeAtLeast(0.8)
   */
  get accuracy(): MetricMatcher<this> {
    const metrics = computeClassificationMetrics(this.binaryActual, this.binaryExpected);

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
   *   .field("score")
   *   .binarize(0.5)
   *   .f1.toBeAtLeast(0.75)
   */
  get f1(): MetricMatcher<this> {
    const metrics = computeClassificationMetrics(this.binaryActual, this.binaryExpected);

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
   * @param targetClass - Optional boolean class (true/false). If omitted, uses macro average
   * @example
   * expectStats(predictions, groundTruth)
   *   .field("score")
   *   .binarize(0.5)
   *   .precision(true).toBeAtLeast(0.7)
   */
  precision(targetClass?: boolean): MetricMatcher<this> {
    const metrics = computeClassificationMetrics(this.binaryActual, this.binaryExpected);

    let metricValue: number;
    let classKey: string | undefined;

    if (targetClass === undefined) {
      metricValue = metrics.macroAvg.precision;
    } else {
      classKey = String(targetClass);
      const classMetrics = metrics.perClass[classKey];
      if (!classMetrics) {
        throw new AssertionError(
          `Class "${classKey}" not found in binarized predictions`,
          classKey,
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
      targetClass: classKey,
      assertions: this.assertions,
    });
  }

  /**
   * Access recall metric for assertions
   * @param targetClass - Optional boolean class (true/false). If omitted, uses macro average
   * @example
   * expectStats(predictions, groundTruth)
   *   .field("score")
   *   .binarize(0.5)
   *   .recall(true).toBeAtLeast(0.7)
   */
  recall(targetClass?: boolean): MetricMatcher<this> {
    const metrics = computeClassificationMetrics(this.binaryActual, this.binaryExpected);

    let metricValue: number;
    let classKey: string | undefined;

    if (targetClass === undefined) {
      metricValue = metrics.macroAvg.recall;
    } else {
      classKey = String(targetClass);
      const classMetrics = metrics.perClass[classKey];
      if (!classMetrics) {
        throw new AssertionError(
          `Class "${classKey}" not found in binarized predictions`,
          classKey,
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
      targetClass: classKey,
      assertions: this.assertions,
    });
  }

  // ============================================================================
  // Display Methods
  // ============================================================================

  /**
   * Displays the confusion matrix in the report
   * This is not an assertion - it always passes and just records the matrix for display
   */
  displayConfusionMatrix(): this {
    const metrics = computeClassificationMetrics(this.binaryActual, this.binaryExpected);

    const fieldResult: FieldMetricResult = {
      field: this.fieldName,
      metrics,
      binarized: true,
      binarizeThreshold: this.threshold,
    };

    recordFieldMetrics(fieldResult);

    const result: AssertionResult = {
      type: "confusionMatrix",
      passed: true,
      message: `Confusion matrix recorded for binarized field "${this.fieldName}" (threshold: ${this.threshold})`,
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
   * Gets computed metrics
   */
  getMetrics() {
    return computeClassificationMetrics(this.binaryActual, this.binaryExpected);
  }

  /**
   * Gets all assertions made
   */
  getAssertions(): AssertionResult[] {
    return this.assertions;
  }
}
