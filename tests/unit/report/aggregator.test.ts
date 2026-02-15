import { describe, it, expect } from "vitest";
import {
  aggregateMetrics,
  getFailedTests,
  getTestsBelowThreshold,
  mergeReports,
} from "../../../src/report/aggregator.js";
import type { EvalReport, TestResult, FieldMetricResult } from "../../../src/core/types.js";

function makeFieldMetric(
  field: string,
  accuracy: number,
  f1: number,
  precision = 0.8,
  recall = 0.8
): FieldMetricResult {
  return {
    field,
    binarized: false,
    metrics: {
      accuracy,
      perClass: { positive: { precision, recall, f1, support: 10 } },
      macroAvg: { precision, recall, f1 },
      weightedAvg: { precision, recall, f1 },
      confusionMatrix: {
        matrix: [
          [5, 0],
          [0, 5],
        ],
        labels: ["positive", "negative"],
        total: 10,
      },
    },
  };
}

function makeTest(
  name: string,
  status: TestResult["status"],
  duration: number,
  fieldMetrics: FieldMetricResult[] = []
): TestResult {
  return {
    name,
    status,
    duration,
    assertions: [],
    fieldMetrics,
  };
}

function makeReport(overrides: Partial<EvalReport> = {}): EvalReport {
  return {
    version: "0.4.1",
    timestamp: "2026-01-01T00:00:00.000Z",
    suites: [
      {
        name: "Suite A",
        tests: [
          makeTest("test1", "passed", 100, [makeFieldMetric("label", 0.9, 0.85)]),
          makeTest("test2", "failed", 200, [makeFieldMetric("label", 0.6, 0.5)]),
        ],
        passed: 1,
        failed: 1,
        errors: 0,
        skipped: 0,
        duration: 300,
      },
    ],
    summary: {
      totalSuites: 1,
      totalTests: 2,
      passed: 1,
      failed: 1,
      errors: 0,
      skipped: 0,
      duration: 300,
    },
    ...overrides,
  };
}

describe("aggregateMetrics", () => {
  it("aggregates total tests from summary", () => {
    const report = makeReport();
    const result = aggregateMetrics(report);
    expect(result.totalTests).toBe(2);
  });

  it("computes pass rate", () => {
    const report = makeReport();
    const result = aggregateMetrics(report);
    expect(result.passRate).toBe(0.5); // 1 passed out of 2
  });

  it("computes average duration", () => {
    const report = makeReport();
    const result = aggregateMetrics(report);
    expect(result.avgDuration).toBe(150); // (100 + 200) / 2
  });

  it("builds field summaries with avg/min/max accuracy", () => {
    const report = makeReport();
    const result = aggregateMetrics(report);
    expect(result.fieldSummaries).toHaveLength(1);
    const summary = result.fieldSummaries[0];
    expect(summary.field).toBe("label");
    expect(summary.testCount).toBe(2);
    expect(summary.avgAccuracy).toBeCloseTo(0.75); // (0.9 + 0.6) / 2
    expect(summary.minAccuracy).toBe(0.6);
    expect(summary.maxAccuracy).toBe(0.9);
    expect(summary.avgF1).toBeCloseTo(0.675); // (0.85 + 0.5) / 2
  });

  it("handles report with no tests", () => {
    const report = makeReport({
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
    });
    const result = aggregateMetrics(report);
    expect(result.passRate).toBe(0);
    expect(result.avgDuration).toBe(0);
    expect(result.fieldSummaries).toHaveLength(0);
  });

  it("handles multiple fields across tests", () => {
    const report = makeReport({
      suites: [
        {
          name: "Suite",
          tests: [
            makeTest("t1", "passed", 10, [makeFieldMetric("a", 0.9, 0.8)]),
            makeTest("t2", "passed", 10, [makeFieldMetric("b", 0.7, 0.6)]),
          ],
          passed: 2,
          failed: 0,
          errors: 0,
          skipped: 0,
          duration: 20,
        },
      ],
      summary: {
        totalSuites: 1,
        totalTests: 2,
        passed: 2,
        failed: 0,
        errors: 0,
        skipped: 0,
        duration: 20,
      },
    });
    const result = aggregateMetrics(report);
    expect(result.fieldSummaries).toHaveLength(2);
    expect(result.fieldSummaries.map((s) => s.field).sort()).toEqual(["a", "b"]);
  });
});

describe("getFailedTests", () => {
  it("returns failed and error tests", () => {
    const report = makeReport();
    const failed = getFailedTests(report);
    expect(failed).toHaveLength(1);
    expect(failed[0].suite).toBe("Suite A");
    expect(failed[0].test.name).toBe("test2");
  });

  it("includes error status tests", () => {
    const report = makeReport({
      suites: [
        {
          name: "Suite",
          tests: [makeTest("err-test", "error", 5)],
          passed: 0,
          failed: 0,
          errors: 1,
          skipped: 0,
          duration: 5,
        },
      ],
    });
    const failed = getFailedTests(report);
    expect(failed).toHaveLength(1);
  });

  it("returns empty array when all tests pass", () => {
    const report = makeReport({
      suites: [
        {
          name: "Suite",
          tests: [makeTest("good", "passed", 5)],
          passed: 1,
          failed: 0,
          errors: 0,
          skipped: 0,
          duration: 5,
        },
      ],
    });
    expect(getFailedTests(report)).toHaveLength(0);
  });
});

describe("getTestsBelowThreshold", () => {
  it("finds tests with accuracy below threshold", () => {
    const report = makeReport();
    const below = getTestsBelowThreshold(report, "label", "accuracy", 0.8);
    expect(below).toHaveLength(1);
    expect(below[0].value).toBe(0.6);
  });

  it("returns empty when all above threshold", () => {
    const report = makeReport();
    const below = getTestsBelowThreshold(report, "label", "accuracy", 0.5);
    expect(below).toHaveLength(0);
  });

  it("supports precision metric type", () => {
    const report = makeReport();
    const below = getTestsBelowThreshold(report, "label", "precision", 0.9);
    expect(below).toHaveLength(2); // both have precision 0.8
  });

  it("supports recall metric type", () => {
    const report = makeReport();
    const below = getTestsBelowThreshold(report, "label", "recall", 0.9);
    expect(below).toHaveLength(2);
  });

  it("supports f1 metric type", () => {
    const report = makeReport();
    const below = getTestsBelowThreshold(report, "label", "f1", 0.7);
    expect(below).toHaveLength(1); // test2 has f1=0.5
  });

  it("returns empty for non-existent field", () => {
    const report = makeReport();
    const below = getTestsBelowThreshold(report, "nonexistent", "accuracy", 0.5);
    expect(below).toHaveLength(0);
  });
});

describe("mergeReports", () => {
  it("merges multiple reports into one", () => {
    const r1 = makeReport();
    const r2 = makeReport({
      suites: [
        {
          name: "Suite B",
          tests: [makeTest("test3", "passed", 50)],
          passed: 1,
          failed: 0,
          errors: 0,
          skipped: 0,
          duration: 50,
        },
      ],
      summary: {
        totalSuites: 1,
        totalTests: 1,
        passed: 1,
        failed: 0,
        errors: 0,
        skipped: 0,
        duration: 50,
      },
    });
    const merged = mergeReports([r1, r2]);
    expect(merged.suites).toHaveLength(2);
    expect(merged.summary.totalTests).toBe(3);
    expect(merged.summary.passed).toBe(2);
    expect(merged.summary.failed).toBe(1);
    expect(merged.summary.duration).toBe(350);
  });

  it("returns empty report for empty array", () => {
    const merged = mergeReports([]);
    expect(merged.suites).toHaveLength(0);
    expect(merged.summary.totalTests).toBe(0);
  });

  it("handles single report", () => {
    const r = makeReport();
    const merged = mergeReports([r]);
    expect(merged.suites).toHaveLength(1);
    expect(merged.summary.passed).toBe(1);
    expect(merged.summary.failed).toBe(1);
  });
});
