/**
 * Report module exports
 */

export {
  aggregateMetrics,
  getFailedTests,
  getTestsBelowThreshold,
  mergeReports,
  type AggregatedMetrics,
  type FieldSummary,
} from "./aggregator.js";

export { JsonReporter, parseReport } from "./json-reporter.js";
export { ConsoleReporter } from "./console-reporter.js";
