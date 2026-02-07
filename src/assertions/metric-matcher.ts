/**
 * MetricMatcher - provides Jest-like assertion methods for metrics
 */

import type { AssertionResult } from "../core/types.js";
import { recordAssertion } from "../core/context.js";

export type ComparisonOperator = ">=" | ">" | "<=" | "<" | "===";

export interface MetricMatcherContext<TParent> {
  parent: TParent;
  metricName: string;
  metricValue: number;
  fieldName: string;
  targetClass?: string;
  assertions: AssertionResult[];
  formatValue?: (value: number) => string;
}

/**
 * Matcher class for individual metric assertions
 * Returns the parent selector to enable fluent chaining
 */
export class MetricMatcher<TParent> {
  private context: MetricMatcherContext<TParent>;

  constructor(context: MetricMatcherContext<TParent>) {
    this.context = context;
  }

  private formatMetricValue(value: number): string {
    if (this.context.formatValue) {
      return this.context.formatValue(value);
    }
    // Default: format as percentage for values between 0 and 1
    if (value >= 0 && value <= 1) {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toFixed(4);
  }

  private createAssertion(
    operator: ComparisonOperator,
    threshold: number,
    passed: boolean
  ): AssertionResult {
    const { metricName, metricValue, fieldName, targetClass } = this.context;
    const formattedActual = this.formatMetricValue(metricValue);
    const formattedThreshold = this.formatMetricValue(threshold);

    const classInfo = targetClass ? ` for "${targetClass}"` : "";
    const operatorText = {
      ">=": "at least",
      ">": "above",
      "<=": "at most",
      "<": "below",
      "===": "equal to",
    }[operator];

    const message = passed
      ? `${metricName}${classInfo} ${formattedActual} is ${operatorText} ${formattedThreshold}`
      : `${metricName}${classInfo} ${formattedActual} is not ${operatorText} ${formattedThreshold}`;

    return {
      type: metricName.toLowerCase().replace(/\s+/g, "").replace(/²/g, "2"),
      passed,
      message,
      expected: threshold,
      actual: metricValue,
      field: fieldName,
      class: targetClass,
    };
  }

  private recordAndReturn(result: AssertionResult): TParent {
    this.context.assertions.push(result);
    recordAssertion(result);
    return this.context.parent;
  }

  /**
   * Assert that the metric is greater than or equal to the threshold (>=)
   */
  toBeAtLeast(threshold: number): TParent {
    const passed = this.context.metricValue >= threshold;
    const result = this.createAssertion(">=", threshold, passed);
    return this.recordAndReturn(result);
  }

  /**
   * Assert that the metric is strictly greater than the threshold (>)
   */
  toBeAbove(threshold: number): TParent {
    const passed = this.context.metricValue > threshold;
    const result = this.createAssertion(">", threshold, passed);
    return this.recordAndReturn(result);
  }

  /**
   * Assert that the metric is less than or equal to the threshold (<=)
   */
  toBeAtMost(threshold: number): TParent {
    const passed = this.context.metricValue <= threshold;
    const result = this.createAssertion("<=", threshold, passed);
    return this.recordAndReturn(result);
  }

  /**
   * Assert that the metric is strictly less than the threshold (<)
   */
  toBeBelow(threshold: number): TParent {
    const passed = this.context.metricValue < threshold;
    const result = this.createAssertion("<", threshold, passed);
    return this.recordAndReturn(result);
  }

  /**
   * Assert that the metric equals the expected value (with optional tolerance for floats)
   */
  toEqual(expected: number, tolerance: number = 1e-9): TParent {
    const passed = Math.abs(this.context.metricValue - expected) <= tolerance;
    const result = this.createAssertion("===", expected, passed);
    return this.recordAndReturn(result);
  }
}
