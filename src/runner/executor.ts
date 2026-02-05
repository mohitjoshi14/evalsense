/**
 * Test executor - runs discovered eval files
 */

import { pathToFileURL } from "node:url";
import type { Suite, TestResult, SuiteResult, EvalReport } from "../core/types.js";
import { ExitCodes } from "../core/types.js";
import {
  getSuites,
  startTestExecution,
  endTestExecution,
} from "../core/context.js";
import { AssertionError, TestExecutionError } from "../core/errors.js";

/**
 * Options for test execution
 */
export interface ExecutorOptions {
  /** Stop on first failure */
  bail?: boolean;
  /** Test timeout in ms */
  timeout?: number;
  /** Filter pattern for test names */
  filter?: string;
}

/**
 * Executes all eval files and returns results
 */
export async function executeEvalFiles(
  files: string[],
  options: ExecutorOptions = {}
): Promise<EvalReport> {
  const startTime = Date.now();
  const suiteResults: SuiteResult[] = [];

  // Load all eval files (this registers suites via describe())
  // Note: We don't reset context here because in CLI usage, each run
  // is a fresh Node process. For programmatic usage, call resetContext()
  // before calling this function if you need a clean slate.
  for (const file of files) {
    try {
      const fileUrl = pathToFileURL(file).href;
      await import(fileUrl);
    } catch (error) {
      throw new TestExecutionError(`Failed to load eval file: ${file}`, file, error as Error);
    }
  }

  // Get all registered suites
  const suites = getSuites();

  // Execute each suite
  for (const suite of suites) {
    const result = await executeSuite(suite, options);
    suiteResults.push(result);

    if (options.bail && result.failed > 0) {
      break;
    }
  }

  // Build report
  const report = buildReport(suiteResults, Date.now() - startTime);

  return report;
}

/**
 * Executes a single suite
 */
async function executeSuite(
  suite: Suite,
  options: ExecutorOptions
): Promise<SuiteResult> {
  const startTime = Date.now();
  const testResults: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let errors = 0;
  let skipped = 0;

  // Run beforeAll hooks
  for (const hook of suite.beforeAll ?? []) {
    try {
      await hook();
    } catch (error) {
      // beforeAll failure fails all tests
      const message = error instanceof Error ? error.message : String(error);
      for (const test of suite.tests) {
        testResults.push({
          name: test.name,
          status: "error",
          assertions: [],
          fieldMetrics: [],
          duration: 0,
          error: new Error(`beforeAll hook failed: ${message}`),
        });
        errors++;
      }
      return {
        name: suite.name,
        tests: testResults,
        passed,
        failed,
        errors,
        skipped,
        duration: Date.now() - startTime,
      };
    }
  }

  // Run each test
  for (const test of suite.tests) {
    // Check filter
    if (options.filter && !test.name.toLowerCase().includes(options.filter.toLowerCase())) {
      testResults.push({
        name: test.name,
        status: "skipped",
        assertions: [],
        fieldMetrics: [],
        duration: 0,
      });
      skipped++;
      continue;
    }

    // Check if skipped
    if (test.name.startsWith("[SKIPPED]")) {
      testResults.push({
        name: test.name,
        status: "skipped",
        assertions: [],
        fieldMetrics: [],
        duration: 0,
      });
      skipped++;
      continue;
    }

    // Run beforeEach hooks
    for (const hook of suite.beforeEach ?? []) {
      try {
        await hook();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        testResults.push({
          name: test.name,
          status: "error",
          assertions: [],
          fieldMetrics: [],
          duration: 0,
          error: new Error(`beforeEach hook failed: ${message}`),
        });
        errors++;
        continue;
      }
    }

    // Execute the test
    const result = await executeTest(test.name, test.fn, options.timeout);
    testResults.push(result);

    if (result.status === "passed") {
      passed++;
    } else if (result.status === "failed") {
      failed++;
    } else if (result.status === "error") {
      errors++;
    }

    // Run afterEach hooks
    for (const hook of suite.afterEach ?? []) {
      try {
        await hook();
      } catch {
        // Log but don't fail the test
      }
    }

    // Bail on failure
    if (options.bail && (failed > 0 || errors > 0)) {
      break;
    }
  }

  // Run afterAll hooks
  for (const hook of suite.afterAll ?? []) {
    try {
      await hook();
    } catch {
      // Log but don't fail
    }
  }

  return {
    name: suite.name,
    tests: testResults,
    passed,
    failed,
    errors,
    skipped,
    duration: Date.now() - startTime,
  };
}

/**
 * Executes a single test with timeout
 */
async function executeTest(
  name: string,
  fn: () => Promise<void> | void,
  timeout = 30000
): Promise<TestResult> {
  const startTime = Date.now();

  // Start collecting assertions
  startTestExecution();

  try {
    // Run with timeout
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Test timed out after ${timeout}ms`)), timeout)
      ),
    ]);

    // Test passed - collect results
    const { assertions, fieldMetrics } = endTestExecution();

    return {
      name,
      status: "passed",
      assertions,
      fieldMetrics,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const { assertions, fieldMetrics } = endTestExecution();

    if (error instanceof AssertionError) {
      // Assertion failure
      return {
        name,
        status: "failed",
        assertions,
        fieldMetrics,
        duration: Date.now() - startTime,
        error,
      };
    }

    // Execution error
    return {
      name,
      status: "error",
      assertions,
      fieldMetrics,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Builds the final report from suite results
 */
function buildReport(suiteResults: SuiteResult[], totalDuration: number): EvalReport {
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  for (const suite of suiteResults) {
    totalTests += suite.tests.length;
    totalPassed += suite.passed;
    totalFailed += suite.failed;
    totalErrors += suite.errors;
    totalSkipped += suite.skipped;
  }

  return {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    suites: suiteResults,
    summary: {
      totalSuites: suiteResults.length,
      totalTests,
      passed: totalPassed,
      failed: totalFailed,
      errors: totalErrors,
      skipped: totalSkipped,
      duration: totalDuration,
    },
  };
}

/**
 * Determines exit code from report
 */
export function getExitCode(report: EvalReport): number {
  if (report.summary.errors > 0) {
    return ExitCodes.EXECUTION_ERROR;
  }
  if (report.summary.failed > 0) {
    return ExitCodes.ASSERTION_FAILURE;
  }
  return ExitCodes.SUCCESS;
}
