import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConsoleReporter } from "../../../src/report/console-reporter.js";
import type { EvalReport, TestResult, FieldMetricResult } from "../../../src/core/types.js";

function makeFieldMetric(field = "label", accuracy = 0.9): FieldMetricResult {
  return {
    field,
    binarized: false,
    metrics: {
      accuracy,
      perClass: {
        positive: { precision: 0.9, recall: 0.85, f1: 0.875, support: 10 },
        negative: { precision: 0.88, recall: 0.92, f1: 0.9, support: 10 },
      },
      macroAvg: { precision: 0.89, recall: 0.885, f1: 0.8875 },
      weightedAvg: { precision: 0.89, recall: 0.885, f1: 0.8875 },
      confusionMatrix: {
        matrix: [
          [9, 1],
          [1, 9],
        ],
        labels: ["positive", "negative"],
        total: 20,
      },
    },
  };
}

function makeTestResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    name: "test accuracy",
    status: "passed",
    duration: 42,
    assertions: [
      {
        type: "accuracy",
        passed: true,
        message: "Accuracy 90.0% >= 80.0%",
        expected: 0.8,
        actual: 0.9,
      },
    ],
    fieldMetrics: [makeFieldMetric()],
    ...overrides,
  };
}

function makeReport(overrides: Partial<EvalReport> = {}): EvalReport {
  return {
    version: "0.4.0",
    timestamp: "2026-01-01T00:00:00.000Z",
    suites: [
      {
        name: "Sentiment classifier",
        tests: [makeTestResult()],
        passed: 1,
        failed: 0,
        errors: 0,
        skipped: 0,
        duration: 42,
      },
    ],
    summary: {
      totalSuites: 1,
      totalTests: 1,
      passed: 1,
      failed: 0,
      errors: 0,
      skipped: 0,
      duration: 42,
    },
    ...overrides,
  };
}

describe("ConsoleReporter", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let reporter: ConsoleReporter;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    reporter = new ConsoleReporter(false); // disable colors for predictable output
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("printHeader", () => {
    it("prints the EvalSense version string", () => {
      reporter.printHeader(3);
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("EvalSense v0.4.1");
    });

    it("prints the file count", () => {
      reporter.printHeader(5);
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("5 eval file(s)");
    });

    it("works with 0 files", () => {
      expect(() => reporter.printHeader(0)).not.toThrow();
    });
  });

  describe("printReport", () => {
    it("prints suite names", () => {
      reporter.printReport(makeReport());
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("Sentiment classifier");
    });

    it("prints test names", () => {
      reporter.printReport(makeReport());
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("test accuracy");
    });

    it("prints duration in ms", () => {
      reporter.printReport(makeReport());
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("42ms");
    });

    it("prints field metrics summary", () => {
      reporter.printReport(makeReport());
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("Field: label");
      expect(output).toContain("Accuracy:");
    });

    it("prints assertion messages", () => {
      reporter.printReport(makeReport());
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("Accuracy 90.0% >= 80.0%");
    });

    it("prints expected and actual values", () => {
      reporter.printReport(makeReport());
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("Expected:");
      expect(output).toContain("Actual:");
    });

    it("shows 'All tests passed!' when no failures", () => {
      reporter.printReport(makeReport());
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("All tests passed!");
    });

    it("shows 'Some tests failed.' when there are failures", () => {
      const report = makeReport({
        summary: {
          totalSuites: 1,
          totalTests: 1,
          passed: 0,
          failed: 1,
          errors: 0,
          skipped: 0,
          duration: 42,
        },
      });
      reporter.printReport(report);
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("Some tests failed.");
    });

    it("prints error message for error status", () => {
      const report = makeReport({
        suites: [
          {
            name: "Suite",
            tests: [
              makeTestResult({
                status: "error",
                error: new Error("Something went wrong"),
              }),
            ],
            passed: 0,
            failed: 0,
            errors: 1,
            skipped: 0,
            duration: 5,
          },
        ],
      });
      reporter.printReport(report);
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("Error: Something went wrong");
    });

    it("prints assertion failed message for failed status", () => {
      const report = makeReport({
        suites: [
          {
            name: "Suite",
            tests: [
              makeTestResult({
                status: "failed",
                error: new Error("Accuracy 60.0% < 80.0%"),
              }),
            ],
            passed: 0,
            failed: 1,
            errors: 0,
            skipped: 0,
            duration: 5,
          },
        ],
      });
      reporter.printReport(report);
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("Assertion Failed:");
    });

    it("prints summary with suite and test counts", () => {
      reporter.printReport(makeReport());
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("Suites:");
      expect(output).toContain("Tests:");
    });
  });

  describe("printConfusionMatrix", () => {
    it("prints confusion matrix header with field name", () => {
      reporter.printConfusionMatrix(makeFieldMetric("sentiment"));
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("Confusion Matrix: sentiment");
    });

    it("does not throw for valid matrix", () => {
      expect(() => reporter.printConfusionMatrix(makeFieldMetric())).not.toThrow();
    });
  });

  describe("with colors enabled", () => {
    it("instantiates without throwing", () => {
      expect(() => new ConsoleReporter(true)).not.toThrow();
    });
  });

  describe("duration formatting", () => {
    it("formats durations >= 1000ms as seconds", () => {
      const report = makeReport({
        summary: {
          totalSuites: 1,
          totalTests: 1,
          passed: 1,
          failed: 0,
          errors: 0,
          skipped: 0,
          duration: 2500,
        },
      });
      reporter.printReport(report);
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("2.50s");
    });

    it("formats durations < 1000ms as milliseconds", () => {
      const report = makeReport({
        summary: {
          totalSuites: 1,
          totalTests: 1,
          passed: 1,
          failed: 0,
          errors: 0,
          skipped: 0,
          duration: 500,
        },
      });
      reporter.printReport(report);
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("500ms");
    });
  });

  describe("binarized field display", () => {
    it("shows binarize threshold in field label", () => {
      const fm = makeFieldMetric();
      fm.binarized = true;
      fm.binarizeThreshold = 0.5;
      const report = makeReport({
        suites: [
          {
            name: "Suite",
            tests: [makeTestResult({ fieldMetrics: [fm] })],
            passed: 1,
            failed: 0,
            errors: 0,
            skipped: 0,
            duration: 1,
          },
        ],
      });
      reporter.printReport(report);
      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("binarized @ 0.5");
    });
  });
});
