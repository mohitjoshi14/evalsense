/**
 * Core type definitions for EvalSense
 */

// ============================================================================
// Alignment Types
// ============================================================================

/**
 * A record aligned between actual (model output) and expected (ground truth)
 */
export interface AlignedRecord {
  id: string;
  actual: Record<string, unknown>;
  expected: Record<string, unknown>;
}

/**
 * Output from runModel() - predictions with IDs for alignment
 */
export interface Prediction {
  id: string;
  [field: string]: unknown;
}

// ============================================================================
// LLM Types
// ============================================================================

/**
 * JSON Schema for structured LLM outputs
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/**
 * LLM client interface for metric evaluation
 */
export interface LLMClient {
  /**
   * Generate a text completion from a prompt
   */
  complete(prompt: string): Promise<string>;

  /**
   * Generate a structured JSON completion (optional)
   */
  completeStructured?<T>(prompt: string, schema: JSONSchema): Promise<T>;
}

// ============================================================================
// Metric Types
// ============================================================================

/**
 * Output from an LLM metric evaluation
 */
export interface MetricOutput {
  id: string;
  metric: string;
  score: number;
  label?: string;

  /** LLM's reasoning/explanation (for LLM-based metrics) */
  reasoning?: string;

  /** Evaluation mode used (for LLM-based metrics) */
  evaluationMode?: "per-row" | "batch";
}

/**
 * Configuration for a metric function
 */
export interface MetricConfig {
  outputs: Array<{ id: string; output: string }>;
  context?: string[];
  query?: string[];
  source?: string[];

  /** LLM client override (defaults to global client) */
  llmClient?: LLMClient;

  /** Evaluation mode: per-row (accurate, expensive) or batch (cheaper, potentially less accurate) */
  evaluationMode?: "per-row" | "batch";

  /** Custom prompt template override */
  customPrompt?: string;

  /** LLM temperature (default: 0) */
  temperature?: number;

  /** Max tokens per completion */
  maxTokens?: number;

  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * A metric function that evaluates outputs
 */
export type MetricFn = (config: MetricConfig) => Promise<MetricOutput[]>;

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Confusion matrix with labels
 */
export interface ConfusionMatrix {
  matrix: number[][];
  labels: string[];
  total: number;
}

/**
 * Per-class classification metrics
 */
export interface ClassMetrics {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

/**
 * Full classification metrics result
 */
export interface ClassificationMetrics {
  accuracy: number;
  perClass: Record<string, ClassMetrics>;
  macroAvg: { precision: number; recall: number; f1: number };
  weightedAvg: { precision: number; recall: number; f1: number };
  confusionMatrix: ConfusionMatrix;
}

/**
 * Regression metrics result
 */
export interface RegressionMetrics {
  mae: number;
  mse: number;
  rmse: number;
  r2: number;
}

// ============================================================================
// Field Evaluation Types
// ============================================================================

/**
 * Result of evaluating a single field across all predictions
 */
export interface FieldMetricResult {
  field: string;
  metrics: ClassificationMetrics;
  binarized: boolean;
  binarizeThreshold?: number;
}

// ============================================================================
// Test & Suite Types
// ============================================================================

/**
 * Test function signature
 */
export type TestFn = () => Promise<void> | void;

/**
 * An individual eval test
 */
export interface EvalTest {
  name: string;
  fn: TestFn;
}

/**
 * A test suite (describe block)
 */
export interface Suite {
  name: string;
  tests: EvalTest[];
  beforeAll?: TestFn[];
  afterAll?: TestFn[];
  beforeEach?: TestFn[];
  afterEach?: TestFn[];
}

/**
 * Current test execution context
 */
export interface TestContext {
  currentSuite: Suite | null;
  suites: Suite[];
  results: SuiteResult[];
}

// ============================================================================
// Assertion Types
// ============================================================================

/**
 * Result of a single assertion
 */
export interface AssertionResult {
  type: string;
  passed: boolean;
  message: string;
  expected?: unknown;
  actual?: unknown;
  field?: string;
  class?: string;
}

// ============================================================================
// Result & Report Types
// ============================================================================

/**
 * Result of a single test
 */
export interface TestResult {
  name: string;
  status: "passed" | "failed" | "error" | "skipped";
  assertions: AssertionResult[];
  fieldMetrics: FieldMetricResult[];
  duration: number;
  error?: Error;
}

/**
 * Result of a test suite
 */
export interface SuiteResult {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  duration: number;
}

/**
 * Integrity check results for a dataset
 */
export interface IntegrityResult {
  valid: boolean;
  totalRecords: number;
  missingIds: string[];
  duplicateIds: string[];
  missingFields: Array<{ id: string; fields: string[] }>;
}

/**
 * Final evaluation report
 */
export interface EvalReport {
  version: string;
  timestamp: string;
  suites: SuiteResult[];
  summary: {
    totalSuites: number;
    totalTests: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    duration: number;
  };
  integrity?: IntegrityResult;
}

// ============================================================================
// CLI Types
// ============================================================================

/**
 * CLI configuration options
 */
export interface CLIOptions {
  filter?: string;
  output?: string;
  reporter?: "json" | "console" | "both";
  bail?: boolean;
  timeout?: number;
}

/**
 * Exit codes for CI integration
 */
export const ExitCodes = {
  SUCCESS: 0,
  ASSERTION_FAILURE: 1,
  INTEGRITY_FAILURE: 2,
  EXECUTION_ERROR: 3,
  CONFIGURATION_ERROR: 4,
} as const;

export type ExitCode = (typeof ExitCodes)[keyof typeof ExitCodes];
