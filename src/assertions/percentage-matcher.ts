/**
 * PercentageMatcher - provides assertion methods for percentage-based distribution checks
 */

import type { AssertionResult } from "../core/types.js";
import { recordAssertion } from "../core/context.js";

export type PercentageDirection = "above" | "below";

export interface PercentageMatcherContext<TParent> {
  parent: TParent;
  fieldName: string;
  valueThreshold: number;
  direction: PercentageDirection;
  actualPercentage: number;
  assertions: AssertionResult[];
}

/**
 * Matcher class for percentage-based distribution assertions
 * Returns the parent selector to enable fluent chaining
 */
export class PercentageMatcher<TParent> {
  private context: PercentageMatcherContext<TParent>;

  constructor(context: PercentageMatcherContext<TParent>) {
    this.context = context;
  }

  private formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  private createAssertion(
    operator: ">=" | ">" | "<=" | "<",
    percentageThreshold: number,
    passed: boolean
  ): AssertionResult {
    const { fieldName, valueThreshold, direction, actualPercentage } = this.context;

    const operatorText = {
      ">=": "at least",
      ">": "above",
      "<=": "at most",
      "<": "below",
    }[operator];

    const directionText = direction === "above" ? "above" : "below or equal to";

    const message = passed
      ? `${this.formatPercentage(actualPercentage)} of '${fieldName}' values are ${directionText} ${valueThreshold} (expected ${operatorText} ${this.formatPercentage(percentageThreshold)})`
      : `Only ${this.formatPercentage(actualPercentage)} of '${fieldName}' values are ${directionText} ${valueThreshold} (expected ${operatorText} ${this.formatPercentage(percentageThreshold)})`;

    return {
      type: direction === "above" ? "percentageAbove" : "percentageBelow",
      passed,
      message,
      expected: percentageThreshold,
      actual: actualPercentage,
      field: fieldName,
    };
  }

  private recordAndReturn(result: AssertionResult): TParent {
    this.context.assertions.push(result);
    recordAssertion(result);
    return this.context.parent;
  }

  /**
   * Assert that the percentage is greater than or equal to the threshold (>=)
   */
  toBeAtLeast(percentageThreshold: number): TParent {
    const passed = this.context.actualPercentage >= percentageThreshold;
    const result = this.createAssertion(">=", percentageThreshold, passed);
    return this.recordAndReturn(result);
  }

  /**
   * Assert that the percentage is strictly greater than the threshold (>)
   */
  toBeAbove(percentageThreshold: number): TParent {
    const passed = this.context.actualPercentage > percentageThreshold;
    const result = this.createAssertion(">", percentageThreshold, passed);
    return this.recordAndReturn(result);
  }

  /**
   * Assert that the percentage is less than or equal to the threshold (<=)
   */
  toBeAtMost(percentageThreshold: number): TParent {
    const passed = this.context.actualPercentage <= percentageThreshold;
    const result = this.createAssertion("<=", percentageThreshold, passed);
    return this.recordAndReturn(result);
  }

  /**
   * Assert that the percentage is strictly less than the threshold (<)
   */
  toBeBelow(percentageThreshold: number): TParent {
    const passed = this.context.actualPercentage < percentageThreshold;
    const result = this.createAssertion("<", percentageThreshold, passed);
    return this.recordAndReturn(result);
  }
}
