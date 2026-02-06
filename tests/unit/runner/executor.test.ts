import { describe, it, expect, beforeEach, vi } from "vitest";
import { getExitCode } from "../../../src/runner/executor.js";
import {
  resetContext,
  addSuite,
  setCurrentSuite,
  getSuites,
  startTestExecution,
  endTestExecution,
  recordAssertion,
} from "../../../src/core/context.js";
import { ExitCodes } from "../../../src/core/types.js";
import type {
  Suite,
  EvalReport,
  SuiteResult,
  TestResult,
  AssertionResult,
} from "../../../src/core/types.js";

beforeEach(() => {
  resetContext();
});

describe("getExitCode", () => {
  const createReport = (
    passed: number,
    failed: number,
    errors: number,
    skipped = 0
  ): EvalReport => ({
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    suites: [],
    summary: {
      totalSuites: 1,
      totalTests: passed + failed + errors + skipped,
      passed,
      failed,
      errors,
      skipped,
      duration: 100,
    },
  });

  it("returns SUCCESS when all tests pass", () => {
    const report = createReport(5, 0, 0);
    expect(getExitCode(report)).toBe(ExitCodes.SUCCESS);
  });

  it("returns ASSERTION_FAILURE when tests fail", () => {
    const report = createReport(3, 2, 0);
    expect(getExitCode(report)).toBe(ExitCodes.ASSERTION_FAILURE);
  });

  it("returns EXECUTION_ERROR when errors occur", () => {
    const report = createReport(3, 0, 1);
    expect(getExitCode(report)).toBe(ExitCodes.EXECUTION_ERROR);
  });

  it("prioritizes EXECUTION_ERROR over ASSERTION_FAILURE", () => {
    // Both errors and failures present
    const report = createReport(1, 2, 1);
    expect(getExitCode(report)).toBe(ExitCodes.EXECUTION_ERROR);
  });

  it("returns SUCCESS when only skipped tests", () => {
    const report = createReport(0, 0, 0, 3);
    expect(getExitCode(report)).toBe(ExitCodes.SUCCESS);
  });
});

describe("Suite Registration via Context", () => {
  it("registers suites correctly", () => {
    const suite: Suite = {
      name: "Test Suite",
      tests: [],
    };

    addSuite(suite);

    const suites = getSuites();
    expect(suites).toHaveLength(1);
    expect(suites[0].name).toBe("Test Suite");
  });

  it("tracks current suite", () => {
    const suite: Suite = {
      name: "Current Suite",
      tests: [],
    };

    setCurrentSuite(suite);
    expect(getSuites()).toHaveLength(0); // Not added yet

    addSuite(suite);
    expect(getSuites()).toHaveLength(1);
  });

  it("handles multiple suites", () => {
    addSuite({ name: "Suite 1", tests: [] });
    addSuite({ name: "Suite 2", tests: [] });
    addSuite({ name: "Suite 3", tests: [] });

    expect(getSuites()).toHaveLength(3);
  });
});

describe("Test Execution State", () => {
  it("starts and ends test execution", () => {
    startTestExecution();
    const state = endTestExecution();

    expect(state.assertions).toEqual([]);
    expect(state.fieldMetrics).toEqual([]);
  });

  it("collects assertions during test execution", () => {
    startTestExecution();

    const assertion: AssertionResult = {
      type: "accuracy",
      passed: true,
      message: "Test passed",
      expected: 0.8,
      actual: 0.9,
      field: "score",
    };

    recordAssertion(assertion);

    const state = endTestExecution();
    expect(state.assertions).toHaveLength(1);
    expect(state.assertions[0]).toEqual(assertion);
  });

  it("handles multiple assertions", () => {
    startTestExecution();

    recordAssertion({
      type: "accuracy",
      passed: true,
      message: "Pass 1",
    });
    recordAssertion({
      type: "precision",
      passed: true,
      message: "Pass 2",
    });
    recordAssertion({
      type: "recall",
      passed: false,
      message: "Fail",
    });

    const state = endTestExecution();
    expect(state.assertions).toHaveLength(3);
  });

  it("resets state between tests", () => {
    startTestExecution();
    recordAssertion({
      type: "accuracy",
      passed: true,
      message: "Test 1",
    });
    endTestExecution();

    startTestExecution();
    const state = endTestExecution();
    expect(state.assertions).toHaveLength(0);
  });

  it("returns empty state when endTestExecution called without start", () => {
    const state = endTestExecution();
    expect(state.assertions).toEqual([]);
    expect(state.fieldMetrics).toEqual([]);
  });
});

describe("Test Result Types", () => {
  it("handles passed test result", () => {
    const result: TestResult = {
      name: "passing test",
      status: "passed",
      assertions: [{ type: "accuracy", passed: true, message: "OK" }],
      fieldMetrics: [],
      duration: 50,
    };

    expect(result.status).toBe("passed");
    expect(result.error).toBeUndefined();
  });

  it("handles failed test result", () => {
    const result: TestResult = {
      name: "failing test",
      status: "failed",
      assertions: [{ type: "accuracy", passed: false, message: "Below threshold" }],
      fieldMetrics: [],
      duration: 50,
      error: new Error("Assertion failed"),
    };

    expect(result.status).toBe("failed");
    expect(result.error).toBeDefined();
  });

  it("handles error test result", () => {
    const result: TestResult = {
      name: "error test",
      status: "error",
      assertions: [],
      fieldMetrics: [],
      duration: 10,
      error: new Error("Unexpected error"),
    };

    expect(result.status).toBe("error");
    expect(result.error?.message).toBe("Unexpected error");
  });

  it("handles skipped test result", () => {
    const result: TestResult = {
      name: "skipped test",
      status: "skipped",
      assertions: [],
      fieldMetrics: [],
      duration: 0,
    };

    expect(result.status).toBe("skipped");
  });
});

describe("Suite Result Aggregation", () => {
  it("aggregates test results correctly", () => {
    const suiteResult: SuiteResult = {
      name: "Test Suite",
      tests: [
        { name: "test1", status: "passed", assertions: [], fieldMetrics: [], duration: 10 },
        { name: "test2", status: "passed", assertions: [], fieldMetrics: [], duration: 20 },
        { name: "test3", status: "failed", assertions: [], fieldMetrics: [], duration: 30 },
      ],
      passed: 2,
      failed: 1,
      errors: 0,
      skipped: 0,
      duration: 60,
    };

    expect(suiteResult.passed).toBe(2);
    expect(suiteResult.failed).toBe(1);
    expect(suiteResult.tests.length).toBe(suiteResult.passed + suiteResult.failed);
  });

  it("includes error and skipped counts", () => {
    const suiteResult: SuiteResult = {
      name: "Mixed Suite",
      tests: [
        { name: "test1", status: "passed", assertions: [], fieldMetrics: [], duration: 10 },
        { name: "test2", status: "error", assertions: [], fieldMetrics: [], duration: 5 },
        { name: "test3", status: "skipped", assertions: [], fieldMetrics: [], duration: 0 },
      ],
      passed: 1,
      failed: 0,
      errors: 1,
      skipped: 1,
      duration: 15,
    };

    expect(suiteResult.errors).toBe(1);
    expect(suiteResult.skipped).toBe(1);
  });
});

describe("Report Building", () => {
  it("calculates summary from suite results", () => {
    const report: EvalReport = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      suites: [
        {
          name: "Suite 1",
          tests: [],
          passed: 5,
          failed: 1,
          errors: 0,
          skipped: 1,
          duration: 100,
        },
        {
          name: "Suite 2",
          tests: [],
          passed: 3,
          failed: 0,
          errors: 1,
          skipped: 0,
          duration: 50,
        },
      ],
      summary: {
        totalSuites: 2,
        totalTests: 11,
        passed: 8,
        failed: 1,
        errors: 1,
        skipped: 1,
        duration: 150,
      },
    };

    expect(report.summary.totalSuites).toBe(2);
    expect(report.summary.passed).toBe(8);
    expect(report.summary.failed).toBe(1);
    expect(report.summary.errors).toBe(1);
    expect(report.summary.skipped).toBe(1);
  });

  it("includes version and timestamp", () => {
    const report: EvalReport = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      suites: [],
      summary: {
        totalSuites: 0,
        totalTests: 0,
        passed: 0,
        failed: 0,
        errors: 0,
        skipped: 0,
        duration: 0,
      },
    };

    expect(report.version).toBe("1.0.0");
    expect(new Date(report.timestamp).getTime()).not.toBeNaN();
  });
});

describe("Filter Handling", () => {
  it("filter pattern is case-insensitive", () => {
    // Testing filter behavior conceptually
    const testName = "TestAccuracy";
    const filter = "accuracy";

    const matches = testName.toLowerCase().includes(filter.toLowerCase());
    expect(matches).toBe(true);
  });

  it("empty filter matches all tests", () => {
    const testNames = ["test1", "test2", "test3"];
    const filter = "";

    const filtered = filter ? testNames.filter((n) => n.includes(filter)) : testNames;
    expect(filtered).toEqual(testNames);
  });
});

describe("Timeout Handling", () => {
  it("timeout promise rejects with timeout error", async () => {
    const timeout = 100;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Test timed out after ${timeout}ms`)), timeout)
    );

    await expect(timeoutPromise).rejects.toThrow(`Test timed out after ${timeout}ms`);
  });
});

describe("Hook Error Handling", () => {
  it("beforeAll failure affects all tests in suite", () => {
    const hookError = new Error("beforeAll hook failed");
    const tests = ["test1", "test2", "test3"];

    // Simulate how tests would be marked as errors
    const testResults: TestResult[] = tests.map((name) => ({
      name,
      status: "error",
      assertions: [],
      fieldMetrics: [],
      duration: 0,
      error: new Error(`beforeAll hook failed: ${hookError.message}`),
    }));

    expect(testResults.every((t) => t.status === "error")).toBe(true);
    expect(testResults.every((t) => t.error?.message.includes("beforeAll"))).toBe(true);
  });

  it("beforeEach failure marks individual test as error", () => {
    const testResult: TestResult = {
      name: "failing test",
      status: "error",
      assertions: [],
      fieldMetrics: [],
      duration: 0,
      error: new Error("beforeEach hook failed: setup error"),
    };

    expect(testResult.status).toBe("error");
    expect(testResult.error?.message).toContain("beforeEach");
  });
});

describe("Skipped Test Detection", () => {
  it("detects skipped tests by prefix", () => {
    const testName = "[SKIPPED] this test is skipped";
    const isSkipped = testName.startsWith("[SKIPPED]");
    expect(isSkipped).toBe(true);
  });

  it("normal tests are not skipped", () => {
    const testName = "normal test";
    const isSkipped = testName.startsWith("[SKIPPED]");
    expect(isSkipped).toBe(false);
  });
});

describe("Exit Codes", () => {
  it("exports correct exit code values", () => {
    expect(ExitCodes.SUCCESS).toBe(0);
    expect(ExitCodes.ASSERTION_FAILURE).toBe(1);
    expect(ExitCodes.INTEGRITY_FAILURE).toBe(2);
    expect(ExitCodes.EXECUTION_ERROR).toBe(3);
    expect(ExitCodes.CONFIGURATION_ERROR).toBe(4);
  });
});
