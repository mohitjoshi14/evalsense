/**
 * JSON Reporter - deterministic JSON output
 */

import { writeFileSync } from "node:fs";
import stringify from "fast-json-stable-stringify";
import type { EvalReport } from "../core/types.js";

/**
 * JSON Reporter for machine-readable output
 */
export class JsonReporter {
  /**
   * Formats a report as deterministic JSON
   */
  format(report: EvalReport): string {
    // Create a serializable version of the report
    const serializable = this.toSerializable(report);
    return stringify(serializable) ?? "{}";
  }

  /**
   * Writes report to a file
   */
  writeToFile(report: EvalReport, path: string): void {
    const json = this.format(report);
    writeFileSync(path, json, "utf-8");
  }

  /**
   * Converts report to a JSON-serializable format
   */
  private toSerializable(report: EvalReport): Record<string, unknown> {
    return {
      version: report.version,
      timestamp: report.timestamp,
      summary: report.summary,
      suites: report.suites.map((suite) => ({
        name: suite.name,
        passed: suite.passed,
        failed: suite.failed,
        errors: suite.errors,
        skipped: suite.skipped,
        duration: suite.duration,
        tests: suite.tests.map((test) => ({
          name: test.name,
          status: test.status,
          duration: test.duration,
          error: test.error
            ? {
                name: test.error.name,
                message: test.error.message,
              }
            : undefined,
          assertions: test.assertions.map((a) => ({
            type: a.type,
            passed: a.passed,
            message: a.message,
            expected: a.expected,
            actual: a.actual,
            field: a.field,
            class: a.class,
          })),
          fieldMetrics: test.fieldMetrics.map((fm) => ({
            field: fm.field,
            binarized: fm.binarized,
            binarizeThreshold: fm.binarizeThreshold,
            metrics: {
              accuracy: fm.metrics.accuracy,
              perClass: fm.metrics.perClass,
              macroAvg: fm.metrics.macroAvg,
              weightedAvg: fm.metrics.weightedAvg,
              confusionMatrix: {
                labels: fm.metrics.confusionMatrix.labels,
                matrix: fm.metrics.confusionMatrix.matrix,
                total: fm.metrics.confusionMatrix.total,
              },
            },
          })),
        })),
      })),
      integrity: report.integrity,
    };
  }
}

/**
 * Parses a JSON report back into an EvalReport
 */
export function parseReport(json: string): EvalReport {
  const data = JSON.parse(json) as EvalReport;
  return data;
}
