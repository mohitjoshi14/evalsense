import { describe, it, expect } from "vitest";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { JsonReporter, parseReport } from "../../../src/report/json-reporter.js";
import type { EvalReport } from "../../../src/core/types.js";

function makeReport(overrides: Partial<EvalReport> = {}): EvalReport {
  return {
    version: "0.4.1",
    timestamp: "2026-01-01T00:00:00.000Z",
    suites: [
      {
        name: "Suite A",
        tests: [
          {
            name: "test1",
            status: "passed",
            duration: 42,
            assertions: [
              {
                type: "accuracy",
                passed: true,
                message: "Accuracy 90.0% >= 80.0%",
                expected: 0.8,
                actual: 0.9,
                field: "label",
              },
            ],
            fieldMetrics: [
              {
                field: "label",
                binarized: false,
                metrics: {
                  accuracy: 0.9,
                  perClass: {
                    positive: { precision: 0.9, recall: 0.85, f1: 0.875, support: 10 },
                  },
                  macroAvg: { precision: 0.9, recall: 0.85, f1: 0.875 },
                  weightedAvg: { precision: 0.9, recall: 0.85, f1: 0.875 },
                  confusionMatrix: {
                    matrix: [
                      [9, 1],
                      [1, 9],
                    ],
                    labels: ["positive", "negative"],
                    total: 20,
                  },
                },
              },
            ],
          },
        ],
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

describe("JsonReporter", () => {
  describe("format", () => {
    it("returns valid JSON string", () => {
      const reporter = new JsonReporter();
      const json = reporter.format(makeReport());
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it("includes version and timestamp", () => {
      const reporter = new JsonReporter();
      const parsed = JSON.parse(reporter.format(makeReport()));
      expect(parsed.version).toBe("0.4.1");
      expect(parsed.timestamp).toBe("2026-01-01T00:00:00.000Z");
    });

    it("includes summary", () => {
      const reporter = new JsonReporter();
      const parsed = JSON.parse(reporter.format(makeReport()));
      expect(parsed.summary.totalTests).toBe(1);
      expect(parsed.summary.passed).toBe(1);
    });

    it("includes suite and test details", () => {
      const reporter = new JsonReporter();
      const parsed = JSON.parse(reporter.format(makeReport()));
      expect(parsed.suites).toHaveLength(1);
      expect(parsed.suites[0].name).toBe("Suite A");
      expect(parsed.suites[0].tests).toHaveLength(1);
      expect(parsed.suites[0].tests[0].name).toBe("test1");
      expect(parsed.suites[0].tests[0].status).toBe("passed");
    });

    it("includes assertions", () => {
      const reporter = new JsonReporter();
      const parsed = JSON.parse(reporter.format(makeReport()));
      const assertions = parsed.suites[0].tests[0].assertions;
      expect(assertions).toHaveLength(1);
      expect(assertions[0].type).toBe("accuracy");
      expect(assertions[0].passed).toBe(true);
    });

    it("includes field metrics", () => {
      const reporter = new JsonReporter();
      const parsed = JSON.parse(reporter.format(makeReport()));
      const fm = parsed.suites[0].tests[0].fieldMetrics;
      expect(fm).toHaveLength(1);
      expect(fm[0].field).toBe("label");
      expect(fm[0].metrics.accuracy).toBe(0.9);
    });

    it("includes confusion matrix in field metrics", () => {
      const reporter = new JsonReporter();
      const parsed = JSON.parse(reporter.format(makeReport()));
      const cm = parsed.suites[0].tests[0].fieldMetrics[0].metrics.confusionMatrix;
      expect(cm.labels).toEqual(["positive", "negative"]);
      expect(cm.total).toBe(20);
    });

    it("serializes test errors", () => {
      const report = makeReport({
        suites: [
          {
            name: "Suite",
            tests: [
              {
                name: "err-test",
                status: "error",
                duration: 1,
                assertions: [],
                fieldMetrics: [],
                error: new Error("something broke"),
              },
            ],
            passed: 0,
            failed: 0,
            errors: 1,
            skipped: 0,
            duration: 1,
          },
        ],
      });
      const reporter = new JsonReporter();
      const parsed = JSON.parse(reporter.format(report));
      expect(parsed.suites[0].tests[0].error.message).toBe("something broke");
    });

    it("produces deterministic output (stable keys)", () => {
      const reporter = new JsonReporter();
      const json1 = reporter.format(makeReport());
      const json2 = reporter.format(makeReport());
      expect(json1).toBe(json2);
    });

    it("omits error field when test has no error", () => {
      const reporter = new JsonReporter();
      const parsed = JSON.parse(reporter.format(makeReport()));
      // undefined fields are omitted in JSON
      expect(parsed.suites[0].tests[0].error).toBeUndefined();
    });
  });

  describe("writeToFile", () => {
    it("writes valid JSON to file", () => {
      const path = join(tmpdir(), `evalsense-test-${Date.now()}.json`);
      const reporter = new JsonReporter();
      reporter.writeToFile(makeReport(), path);
      const content = readFileSync(path, "utf-8");
      expect(() => JSON.parse(content)).not.toThrow();
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe("0.4.1");
      rmSync(path, { force: true });
    });
  });
});

describe("parseReport", () => {
  it("parses JSON string back to EvalReport", () => {
    const reporter = new JsonReporter();
    const json = reporter.format(makeReport());
    const parsed = parseReport(json);
    expect(parsed.version).toBe("0.4.1");
    expect(parsed.summary.totalTests).toBe(1);
  });
});
