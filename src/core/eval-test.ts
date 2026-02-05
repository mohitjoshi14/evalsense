/**
 * evalTest() implementation - defines an individual evaluation test
 */

import type { EvalTest, TestFn } from "./types.js";
import { getCurrentSuite, addTestToCurrentSuite } from "./context.js";

/**
 * Defines an individual evaluation test within a describe() block
 *
 * @example
 * ```ts
 * evalTest("accuracy above 80%", async () => {
 *   const dataset = loadDataset("./data.json");
 *   const predictions = await runModel(dataset, classify);
 *
 *   expectStats(predictions)
 *     .field("sentiment")
 *     .toHaveAccuracyAbove(0.8);
 * });
 * ```
 */
export function evalTest(name: string, fn: TestFn): void {
  const currentSuite = getCurrentSuite();

  if (!currentSuite) {
    throw new Error("evalTest() must be called inside a describe() block");
  }

  const test: EvalTest = {
    name,
    fn,
  };

  addTestToCurrentSuite(test);
}

/**
 * Alias for evalTest - some users may prefer "test" or "it"
 */
export const test = evalTest;
export const it = evalTest;

/**
 * Skipped test - registers but doesn't run
 */
export function evalTestSkip(name: string, _fn: TestFn): void {
  const currentSuite = getCurrentSuite();

  if (!currentSuite) {
    throw new Error("evalTest.skip() must be called inside a describe() block");
  }

  const test: EvalTest = {
    name: `[SKIPPED] ${name}`,
    fn: async () => {
      // No-op - test is skipped
    },
  };

  addTestToCurrentSuite(test);
}

/**
 * Focused test - only runs this test (TODO: implement filtering)
 */
export function evalTestOnly(name: string, fn: TestFn): void {
  const currentSuite = getCurrentSuite();

  if (!currentSuite) {
    throw new Error("evalTest.only() must be called inside a describe() block");
  }

  const test: EvalTest = {
    name: `[ONLY] ${name}`,
    fn,
  };

  addTestToCurrentSuite(test);
}

// Attach skip and only as properties
evalTest.skip = evalTestSkip;
evalTest.only = evalTestOnly;
