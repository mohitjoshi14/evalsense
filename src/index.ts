/**
 * EvalSense - JS-native LLM evaluation framework
 *
 * @example
 * ```ts
 * import { describe, evalTest, expectStats, loadDataset, runModel } from "evalsense";
 *
 * describe("Sentiment classifier", () => {
 *   evalTest("accuracy above 80%", async () => {
 *     const dataset = loadDataset("./sentiment.json");
 *     const predictions = await runModel(dataset, classify);
 *
 *     expectStats(predictions)
 *       .field("sentiment")
 *       .toHaveAccuracyAbove(0.8)
 *       .toHaveConfusionMatrix();
 *   });
 * });
 * ```
 */

// Core test API
export { describe, beforeAll, afterAll, beforeEach, afterEach } from "./core/describe.js";
export { evalTest, test, it } from "./core/eval-test.js";

// Dataset utilities
export { loadDataset, createDataset } from "./dataset/loader.js";
export { runModel, runModelParallel } from "./dataset/run-model.js";
export { alignByKey, extractFieldValues, filterComplete } from "./dataset/alignment.js";
export { checkIntegrity, validatePredictions } from "./dataset/integrity.js";

// Assertions
export { expectStats } from "./assertions/expect-stats.js";

// Statistics (for advanced use)
export {
  buildConfusionMatrix,
  computeClassificationMetrics,
  computeAccuracy,
  computePrecision,
  computeRecall,
  computeF1,
  formatConfusionMatrix,
} from "./statistics/index.js";

// Report utilities
export { JsonReporter, ConsoleReporter, parseReport } from "./report/index.js";

// Runner (for programmatic use)
export { executeEvalFiles, discoverEvalFiles, getExitCode } from "./runner/index.js";

// Types
export type {
  // Core types
  Dataset,
  DatasetMetadata,
  Prediction,
  AlignedRecord,
  MetricOutput,
  MetricConfig,
  MetricFn,

  // Statistics types
  ConfusionMatrix,
  ClassMetrics,
  ClassificationMetrics,
  RegressionMetrics,
  FieldMetricResult,

  // Test types
  Suite,
  EvalTest,
  TestFn,
  TestContext,

  // Result types
  AssertionResult,
  TestResult,
  SuiteResult,
  EvalReport,
  IntegrityResult,

  // CLI types
  CLIOptions,
  ExitCode,
} from "./core/types.js";

export { ExitCodes } from "./core/types.js";

// Errors
export {
  EvalSenseError,
  AssertionError,
  DatasetError,
  IntegrityError,
  ConfigurationError,
  TestExecutionError,
} from "./core/errors.js";
