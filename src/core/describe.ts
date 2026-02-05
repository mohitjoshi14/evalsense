/**
 * describe() implementation - Jest-like test suite grouping
 */

import type { Suite, TestFn } from "./types.js";
import { getCurrentSuite, setCurrentSuite, addSuite } from "./context.js";

/**
 * Creates a test suite that groups related eval tests
 *
 * @example
 * ```ts
 * describe("Sentiment classifier", () => {
 *   evalTest("accuracy above 80%", async () => {
 *     // test implementation
 *   });
 * });
 * ```
 */
export function describe(name: string, fn: () => void): void {
  const parentSuite = getCurrentSuite();

  const suite: Suite = {
    name,
    tests: [],
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: [],
  };

  // Set this as the current suite for nested evalTest() calls
  setCurrentSuite(suite);

  // Execute the suite definition function
  // This will register all evalTest() calls within
  try {
    fn();
  } finally {
    // Restore parent suite context (for nested describes)
    setCurrentSuite(parentSuite);
  }

  // Add the suite to the global context
  addSuite(suite);
}

/**
 * Lifecycle hook - runs once before all tests in the suite
 */
export function beforeAll(fn: TestFn): void {
  const suite = getCurrentSuite();
  if (!suite) {
    throw new Error("beforeAll() must be called inside a describe() block");
  }
  suite.beforeAll?.push(fn);
}

/**
 * Lifecycle hook - runs once after all tests in the suite
 */
export function afterAll(fn: TestFn): void {
  const suite = getCurrentSuite();
  if (!suite) {
    throw new Error("afterAll() must be called inside a describe() block");
  }
  suite.afterAll?.push(fn);
}

/**
 * Lifecycle hook - runs before each test in the suite
 */
export function beforeEach(fn: TestFn): void {
  const suite = getCurrentSuite();
  if (!suite) {
    throw new Error("beforeEach() must be called inside a describe() block");
  }
  suite.beforeEach?.push(fn);
}

/**
 * Lifecycle hook - runs after each test in the suite
 */
export function afterEach(fn: TestFn): void {
  const suite = getCurrentSuite();
  if (!suite) {
    throw new Error("afterEach() must be called inside a describe() block");
  }
  suite.afterEach?.push(fn);
}
