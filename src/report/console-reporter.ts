/**
 * Console Reporter - human-readable output
 */

import type { EvalReport, TestResult, FieldMetricResult } from "../core/types.js";
import { formatConfusionMatrix } from "../statistics/confusion-matrix.js";

/**
 * ANSI color codes
 */
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

/**
 * Status symbols
 */
const symbols = {
  pass: "\u2713", // ✓
  fail: "\u2717", // ✗
  error: "!",
  skip: "-",
};

/**
 * Console reporter for human-readable output
 */
export class ConsoleReporter {
  private useColors: boolean;

  constructor(useColors = true) {
    this.useColors = useColors && process.stdout.isTTY !== false;
  }

  /**
   * Prints the run header
   */
  printHeader(fileCount: number): void {
    this.log("");
    this.log(this.color("bold", `EvalSense v0.1.0`));
    this.log(this.color("dim", `Running ${fileCount} eval file(s)...`));
    this.log("");
  }

  /**
   * Prints the full report
   */
  printReport(report: EvalReport): void {
    // Print each suite
    for (const suite of report.suites) {
      this.printSuite(suite.name, suite.tests);
    }

    // Print summary
    this.printSummary(report);
  }

  /**
   * Prints a suite's results
   */
  private printSuite(name: string, tests: TestResult[]): void {
    this.log(this.color("bold", `  ${name}`));
    this.log("");

    for (const test of tests) {
      this.printTest(test);
    }

    this.log("");
  }

  /**
   * Prints a single test result
   */
  private printTest(test: TestResult): void {
    const symbol = this.getStatusSymbol(test.status);
    const statusColor = this.getStatusColor(test.status);
    const duration = this.color("dim", `(${test.duration}ms)`);

    this.log(`    ${this.color(statusColor, symbol)} ${test.name} ${duration}`);

    // Print field metrics
    for (const fm of test.fieldMetrics) {
      this.printFieldMetrics(fm);
    }

    // Print error if any
    if (test.error && test.status === "failed") {
      this.log(this.color("red", `      ${test.error.message}`));
    } else if (test.error && test.status === "error") {
      this.log(this.color("red", `      Error: ${test.error.message}`));
    }

    // Print failed assertions
    for (const assertion of test.assertions) {
      if (!assertion.passed) {
        this.log(this.color("red", `      ${assertion.message}`));
      }
    }
  }

  /**
   * Prints field metrics summary
   */
  private printFieldMetrics(fm: FieldMetricResult): void {
    const { metrics, field, binarized, binarizeThreshold } = fm;

    const fieldLabel = binarized
      ? `${field} (binarized @ ${binarizeThreshold})`
      : field;

    this.log(
      this.color(
        "cyan",
        `      Field: ${fieldLabel} | Accuracy: ${this.pct(metrics.accuracy)} | F1: ${this.pct(metrics.macroAvg.f1)}`
      )
    );

    // Show per-class metrics if multiple classes
    if (Object.keys(metrics.perClass).length > 1) {
      for (const [cls, classMetrics] of Object.entries(metrics.perClass)) {
        this.log(
          this.color(
            "dim",
            `        ${cls}: P=${this.pct(classMetrics.precision)} R=${this.pct(classMetrics.recall)} F1=${this.pct(classMetrics.f1)} (n=${classMetrics.support})`
          )
        );
      }
    }
  }

  /**
   * Prints the summary
   */
  private printSummary(report: EvalReport): void {
    const { summary } = report;

    this.log(this.color("bold", "  Summary"));
    this.log("");

    const passedStr = this.color("green", `${summary.passed} passed`);
    const failedStr =
      summary.failed > 0
        ? this.color("red", `${summary.failed} failed`)
        : `${summary.failed} failed`;
    const errorsStr =
      summary.errors > 0
        ? this.color("red", `${summary.errors} errors`)
        : `${summary.errors} errors`;
    const skippedStr =
      summary.skipped > 0
        ? this.color("yellow", `${summary.skipped} skipped`)
        : `${summary.skipped} skipped`;

    this.log(`    Tests:    ${passedStr}, ${failedStr}, ${errorsStr}, ${skippedStr}`);
    this.log(`    Suites:   ${summary.totalSuites}`);
    this.log(`    Duration: ${this.formatDuration(summary.duration)}`);
    this.log("");

    // Final status
    if (summary.failed === 0 && summary.errors === 0) {
      this.log(this.color("green", "  All tests passed!"));
    } else {
      this.log(this.color("red", "  Some tests failed."));
    }

    this.log("");
  }

  /**
   * Prints a confusion matrix
   */
  printConfusionMatrix(fm: FieldMetricResult): void {
    this.log("");
    this.log(this.color("bold", `  Confusion Matrix: ${fm.field}`));
    this.log("");

    const matrixStr = formatConfusionMatrix(fm.metrics.confusionMatrix);
    for (const line of matrixStr.split("\n")) {
      this.log(`    ${line}`);
    }

    this.log("");
  }

  /**
   * Formats a percentage
   */
  private pct(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  /**
   * Formats duration
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * Gets status symbol
   */
  private getStatusSymbol(status: TestResult["status"]): string {
    switch (status) {
      case "passed":
        return symbols.pass;
      case "failed":
        return symbols.fail;
      case "error":
        return symbols.error;
      case "skipped":
        return symbols.skip;
    }
  }

  /**
   * Gets status color
   */
  private getStatusColor(status: TestResult["status"]): keyof typeof colors {
    switch (status) {
      case "passed":
        return "green";
      case "failed":
        return "red";
      case "error":
        return "red";
      case "skipped":
        return "yellow";
    }
  }

  /**
   * Applies color if enabled
   */
  private color(colorName: keyof typeof colors, text: string): string {
    if (!this.useColors) {
      return text;
    }
    return `${colors[colorName]}${text}${colors.reset}`;
  }

  /**
   * Logs a line
   */
  private log(message: string): void {
    console.log(message);
  }
}
