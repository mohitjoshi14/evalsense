/**
 * BinarizeSelector - transforms continuous scores to binary for classification metrics
 */

import type { AlignedRecord, AssertionResult, FieldMetricResult } from "../core/types.js";
import { recordAssertion, recordFieldMetrics } from "../core/context.js";
import { AssertionError } from "../core/errors.js";
import { computeClassificationMetrics } from "../statistics/classification.js";

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

  /**
   * Asserts that accuracy is above a threshold
   */
  toHaveAccuracyAbove(threshold: number): this {
    const metrics = computeClassificationMetrics(this.binaryActual, this.binaryExpected);
    const passed = metrics.accuracy >= threshold;

    const result: AssertionResult = {
      type: "accuracy",
      passed,
      message: passed
        ? `Accuracy ${(metrics.accuracy * 100).toFixed(1)}% is above ${(threshold * 100).toFixed(1)}% (binarized at ${this.threshold})`
        : `Accuracy ${(metrics.accuracy * 100).toFixed(1)}% is below threshold ${(threshold * 100).toFixed(1)}% (binarized at ${this.threshold})`,
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
   * @param classOrThreshold - Either the class (true/false) or threshold
   * @param threshold - Threshold when class is specified
   */
  toHavePrecisionAbove(classOrThreshold: boolean | number, threshold?: number): this {
    const metrics = computeClassificationMetrics(this.binaryActual, this.binaryExpected);

    let actualPrecision: number;
    let targetClass: string | undefined;
    let actualThreshold: number;

    if (typeof classOrThreshold === "number") {
      actualPrecision = metrics.macroAvg.precision;
      actualThreshold = classOrThreshold;
    } else {
      targetClass = String(classOrThreshold);
      actualThreshold = threshold!;
      const classMetrics = metrics.perClass[targetClass];
      if (!classMetrics) {
        throw new AssertionError(
          `Class "${targetClass}" not found in binarized predictions`,
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
        ? `Precision${targetClass ? ` for ${targetClass}` : ""} ${(actualPrecision * 100).toFixed(1)}% is above ${(actualThreshold * 100).toFixed(1)}%`
        : `Precision${targetClass ? ` for ${targetClass}` : ""} ${(actualPrecision * 100).toFixed(1)}% is below threshold ${(actualThreshold * 100).toFixed(1)}%`,
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
   * @param classOrThreshold - Either the class (true/false) or threshold
   * @param threshold - Threshold when class is specified
   */
  toHaveRecallAbove(classOrThreshold: boolean | number, threshold?: number): this {
    const metrics = computeClassificationMetrics(this.binaryActual, this.binaryExpected);

    let actualRecall: number;
    let targetClass: string | undefined;
    let actualThreshold: number;

    if (typeof classOrThreshold === "number") {
      actualRecall = metrics.macroAvg.recall;
      actualThreshold = classOrThreshold;
    } else {
      targetClass = String(classOrThreshold);
      actualThreshold = threshold!;
      const classMetrics = metrics.perClass[targetClass];
      if (!classMetrics) {
        throw new AssertionError(
          `Class "${targetClass}" not found in binarized predictions`,
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
        ? `Recall${targetClass ? ` for ${targetClass}` : ""} ${(actualRecall * 100).toFixed(1)}% is above ${(actualThreshold * 100).toFixed(1)}%`
        : `Recall${targetClass ? ` for ${targetClass}` : ""} ${(actualRecall * 100).toFixed(1)}% is below threshold ${(actualThreshold * 100).toFixed(1)}%`,
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
   */
  toHaveF1Above(classOrThreshold: boolean | number, threshold?: number): this {
    const metrics = computeClassificationMetrics(this.binaryActual, this.binaryExpected);

    let actualF1: number;
    let targetClass: string | undefined;
    let actualThreshold: number;

    if (typeof classOrThreshold === "number") {
      actualF1 = metrics.macroAvg.f1;
      actualThreshold = classOrThreshold;
    } else {
      targetClass = String(classOrThreshold);
      actualThreshold = threshold!;
      const classMetrics = metrics.perClass[targetClass];
      if (!classMetrics) {
        throw new AssertionError(
          `Class "${targetClass}" not found in binarized predictions`,
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
        ? `F1${targetClass ? ` for ${targetClass}` : ""} ${(actualF1 * 100).toFixed(1)}% is above ${(actualThreshold * 100).toFixed(1)}%`
        : `F1${targetClass ? ` for ${targetClass}` : ""} ${(actualF1 * 100).toFixed(1)}% is below threshold ${(actualThreshold * 100).toFixed(1)}%`,
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
