/**
 * Result aggregation utilities
 */

import type { EvalReport, SuiteResult, TestResult, FieldMetricResult } from "../core/types.js";

/**
 * Aggregated metrics across all tests
 */
export interface AggregatedMetrics {
  totalTests: number;
  passRate: number;
  avgDuration: number;
  fieldSummaries: FieldSummary[];
}

/**
 * Summary for a specific field across tests
 */
export interface FieldSummary {
  field: string;
  testCount: number;
  avgAccuracy: number;
  minAccuracy: number;
  maxAccuracy: number;
  avgF1: number;
}

/**
 * Aggregates metrics from a report
 */
export function aggregateMetrics(report: EvalReport): AggregatedMetrics {
  const fieldMap = new Map<string, FieldMetricResult[]>();
  let totalDuration = 0;
  let testCount = 0;

  // Collect all field metrics
  for (const suite of report.suites) {
    for (const test of suite.tests) {
      testCount++;
      totalDuration += test.duration;

      for (const fm of test.fieldMetrics) {
        const existing = fieldMap.get(fm.field) ?? [];
        existing.push(fm);
        fieldMap.set(fm.field, existing);
      }
    }
  }

  // Build field summaries
  const fieldSummaries: FieldSummary[] = [];

  for (const [field, metrics] of fieldMap) {
    const accuracies = metrics.map((m) => m.metrics.accuracy);
    const f1s = metrics.map((m) => m.metrics.macroAvg.f1);

    fieldSummaries.push({
      field,
      testCount: metrics.length,
      avgAccuracy: average(accuracies),
      minAccuracy: Math.min(...accuracies),
      maxAccuracy: Math.max(...accuracies),
      avgF1: average(f1s),
    });
  }

  return {
    totalTests: report.summary.totalTests,
    passRate: testCount > 0 ? report.summary.passed / testCount : 0,
    avgDuration: testCount > 0 ? totalDuration / testCount : 0,
    fieldSummaries,
  };
}

/**
 * Filters failed tests from a report
 */
export function getFailedTests(report: EvalReport): Array<{ suite: string; test: TestResult }> {
  const failed: Array<{ suite: string; test: TestResult }> = [];

  for (const suite of report.suites) {
    for (const test of suite.tests) {
      if (test.status === "failed" || test.status === "error") {
        failed.push({ suite: suite.name, test });
      }
    }
  }

  return failed;
}

/**
 * Gets tests with specific field below threshold
 */
export function getTestsBelowThreshold(
  report: EvalReport,
  field: string,
  metricType: "accuracy" | "precision" | "recall" | "f1",
  threshold: number
): Array<{ suite: string; test: TestResult; value: number }> {
  const results: Array<{ suite: string; test: TestResult; value: number }> = [];

  for (const suite of report.suites) {
    for (const test of suite.tests) {
      for (const fm of test.fieldMetrics) {
        if (fm.field === field) {
          let value: number;
          switch (metricType) {
            case "accuracy":
              value = fm.metrics.accuracy;
              break;
            case "precision":
              value = fm.metrics.macroAvg.precision;
              break;
            case "recall":
              value = fm.metrics.macroAvg.recall;
              break;
            case "f1":
              value = fm.metrics.macroAvg.f1;
              break;
          }

          if (value < threshold) {
            results.push({ suite: suite.name, test, value });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Computes average of an array
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Merges multiple reports into one
 */
export function mergeReports(reports: EvalReport[]): EvalReport {
  if (reports.length === 0) {
    return {
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
  }

  const allSuites: SuiteResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  let totalDuration = 0;

  for (const report of reports) {
    allSuites.push(...report.suites);
    totalPassed += report.summary.passed;
    totalFailed += report.summary.failed;
    totalErrors += report.summary.errors;
    totalSkipped += report.summary.skipped;
    totalDuration += report.summary.duration;
  }

  return {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    suites: allSuites,
    summary: {
      totalSuites: allSuites.length,
      totalTests: totalPassed + totalFailed + totalErrors + totalSkipped,
      passed: totalPassed,
      failed: totalFailed,
      errors: totalErrors,
      skipped: totalSkipped,
      duration: totalDuration,
    },
  };
}
