/**
 * Test context management for EvalSense
 * Manages the global state during test execution
 */

import type { Suite, EvalTest, TestContext, AssertionResult, FieldMetricResult } from "./types.js";

/**
 * Global test context - singleton for the current test run
 */
let globalContext: TestContext = createEmptyContext();

/**
 * Current test execution state
 */
interface CurrentTestState {
  assertions: AssertionResult[];
  fieldMetrics: FieldMetricResult[];
}

let currentTestState: CurrentTestState | null = null;

/**
 * Creates an empty test context
 */
export function createEmptyContext(): TestContext {
  return {
    currentSuite: null,
    suites: [],
    results: [],
  };
}

/**
 * Gets the global test context
 */
export function getContext(): TestContext {
  return globalContext;
}

/**
 * Resets the global test context (used between test runs)
 */
export function resetContext(): void {
  globalContext = createEmptyContext();
  currentTestState = null;
}

/**
 * Gets the current suite being defined
 */
export function getCurrentSuite(): Suite | null {
  return globalContext.currentSuite;
}

/**
 * Sets the current suite being defined
 */
export function setCurrentSuite(suite: Suite | null): void {
  globalContext.currentSuite = suite;
}

/**
 * Adds a suite to the context
 */
export function addSuite(suite: Suite): void {
  globalContext.suites.push(suite);
}

/**
 * Adds a test to the current suite
 */
export function addTestToCurrentSuite(test: EvalTest): void {
  if (!globalContext.currentSuite) {
    throw new Error("Cannot add test outside of a describe() block");
  }
  globalContext.currentSuite.tests.push(test);
}

/**
 * Gets all registered suites
 */
export function getSuites(): Suite[] {
  return globalContext.suites;
}

/**
 * Starts a new test execution (for collecting assertions)
 */
export function startTestExecution(): void {
  currentTestState = {
    assertions: [],
    fieldMetrics: [],
  };
}

/**
 * Ends the current test execution and returns collected data
 */
export function endTestExecution(): CurrentTestState {
  const state = currentTestState;
  currentTestState = null;
  return state ?? { assertions: [], fieldMetrics: [] };
}

/**
 * Records an assertion result in the current test
 */
export function recordAssertion(result: AssertionResult): void {
  if (currentTestState) {
    currentTestState.assertions.push(result);
  }
}

/**
 * Records field metrics in the current test
 */
export function recordFieldMetrics(metrics: FieldMetricResult): void {
  if (currentTestState) {
    currentTestState.fieldMetrics.push(metrics);
  }
}

/**
 * Checks if we're currently executing a test
 */
export function isInTestExecution(): boolean {
  return currentTestState !== null;
}

/**
 * Gets the current test state (for assertions to check)
 */
export function getCurrentTestState(): CurrentTestState | null {
  return currentTestState;
}
