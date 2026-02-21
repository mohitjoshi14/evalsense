#!/usr/bin/env node

/**
 * EvalSense CLI
 */

import { Command } from "commander";
import { discoverFromPath, filterFiles } from "./discovery.js";
import { executeEvalFiles, getExitCode } from "./executor.js";
import { ConsoleReporter } from "../report/console-reporter.js";
import { JsonReporter } from "../report/json-reporter.js";
import { ExitCodes } from "../core/types.js";

const program = new Command();

program
  .name("evalsense")
  .description("JS-native LLM evaluation framework with Jest-like API")
  .version("0.1.0");

program
  .command("run")
  .description("Run evaluation tests")
  .argument("[path]", "Path to eval file or directory", ".")
  .option("-f, --filter <pattern>", "Filter tests by name pattern")
  .option("-o, --output <file>", "Write JSON report to file")
  .option("-r, --reporter <type>", "Reporter type: console, json, both", "console")
  .option("-b, --bail", "Stop on first failure")
  .option("-t, --timeout <ms>", "Test timeout in milliseconds", "30000")
  .action(
    async (
      path: string,
      options: {
        filter?: string;
        output?: string;
        reporter: string;
        bail?: boolean;
        timeout: string;
      }
    ) => {
      try {
        // Discover eval files
        const files = await discoverFromPath(path);
        const filtered = filterFiles(files, options.filter);

        if (filtered.length === 0) {
          console.error("No eval files found");
          process.exit(ExitCodes.CONFIGURATION_ERROR);
        }

        const consoleReporter = new ConsoleReporter();

        // Print header
        consoleReporter.printHeader(filtered.length);

        // Execute tests
        const report = await executeEvalFiles(filtered, {
          bail: options.bail,
          timeout: parseInt(options.timeout, 10),
          filter: options.filter,
        });

        // Output results
        const reporterType = options.reporter.toLowerCase();

        if (reporterType === "console" || reporterType === "both") {
          consoleReporter.printReport(report);
        }

        if (reporterType === "json" || reporterType === "both" || options.output) {
          const jsonReporter = new JsonReporter();
          const json = jsonReporter.format(report);

          if (options.output) {
            await jsonReporter.writeToFile(report, options.output);
            console.log(`\nReport written to: ${options.output}`);
          } else if (reporterType === "json") {
            console.log(json);
          }
        }

        // Exit with appropriate code
        const exitCode = getExitCode(report);
        process.exit(exitCode);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : String(error));
        process.exit(ExitCodes.EXECUTION_ERROR);
      }
    }
  );

program
  .command("list")
  .description("List discovered eval files")
  .argument("[path]", "Path to search", ".")
  .action(async (path: string) => {
    try {
      const files = await discoverFromPath(path);

      if (files.length === 0) {
        console.log("No eval files found");
        return;
      }

      console.log(`Found ${files.length} eval file(s):\n`);
      for (const file of files) {
        console.log(`  ${file}`);
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(ExitCodes.CONFIGURATION_ERROR);
    }
  });

program
  .command("docs")
  .description("Print the assertion API reference")
  .action(() => {
    console.log(`
EVALSENSE ASSERTION API REFERENCE
==================================

ENTRY POINT
  import { describe, evalTest, expectStats } from "evalsense";

  expectStats(predictions, groundTruth)   // with ground truth (classification/regression)
  expectStats(predictions)                // without ground truth (distribution only)
    .field("fieldName")                   // select field to assert on
    → returns FieldSelector

FIELD SELECTOR METHODS
  Classification (requires ground truth, field values: boolean or string labels)
    .accuracy                             → MetricMatcher  (overall accuracy)
    .f1                                   → MetricMatcher  (macro F1)
    .precision()                          → MetricMatcher  (macro average)
    .precision("className")               → MetricMatcher  (per-class)
    .recall()                             → MetricMatcher  (macro average)
    .recall("className")                  → MetricMatcher  (per-class)

  Regression (requires ground truth, field values: numbers)
    .mae                                  → MetricMatcher  (mean absolute error)
    .rmse                                 → MetricMatcher  (root mean squared error)
    .r2                                   → MetricMatcher  (R-squared)

  Distribution (no ground truth needed, field values: numbers)
    .percentageAbove(valueThreshold)      → PercentageMatcher
    .percentageBelow(valueThreshold)      → PercentageMatcher

  Binarize (continuous scores → binary classification)
    .binarize(threshold)                  → BinarizeSelector → then use classification metrics

  Display (not an assertion, always passes)
    .displayConfusionMatrix()             → FieldSelector (chainable)

METRIC MATCHERS (on MetricMatcher or PercentageMatcher)
  .toBeAtLeast(n)   assert value >= n
  .toBeAbove(n)     assert value >  n
  .toBeAtMost(n)    assert value <= n
  .toBeBelow(n)     assert value <  n
  .toEqual(n)       assert value === n (float tolerance: 1e-9)

  All matchers return the parent FieldSelector for chaining.

LIFECYCLE HOOKS
  beforeAll(fn)  afterAll(fn)  beforeEach(fn)  afterEach(fn)

LLM-AS-JUDGE METRICS (no ground truth needed)
  import { hallucination, relevance, faithfulness, toxicity }
    from "evalsense/metrics/opinionated";
  import { setLLMClient } from "evalsense/metrics";

  setLLMClient(yourAdapter);              // required before using opinionated metrics
  const scores = await hallucination(predictions, { context: "..." });
  // returns MetricOutput[]: { id, metric, score, label, reasoning, evaluationMode }

  Options: { evaluationMode: "per-row" | "batch", customPrompt, llmClient }

EXAMPLES
  // Classification
  expectStats(predictions, groundTruth)
    .field("label")
    .accuracy.toBeAtLeast(0.85)
    .precision("positive").toBeAtLeast(0.8)
    .recall("positive").toBeAtLeast(0.75)
    .f1.toBeAtLeast(0.78)
    .displayConfusionMatrix();

  // Regression
  expectStats(predictions, groundTruth)
    .field("score")
    .mae.toBeAtMost(0.1)
    .r2.toBeAtLeast(0.9);

  // Distribution (scores without ground truth)
  expectStats(predictions)
    .field("confidence")
    .percentageAbove(0.7).toBeAtLeast(0.8);

  // Binarize continuous score at threshold 0.5
  expectStats(predictions, groundTruth)
    .field("score")
    .binarize(0.5)
    .accuracy.toBeAtLeast(0.85);

DATASET REQUIREMENTS
  - Every record MUST have an "id" (or "_id") field for alignment
  - predictions and groundTruth are matched by id
  - Minimum recommended: 10+ records per eval
`);
  });

program.parse();
