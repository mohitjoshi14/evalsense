/**
 * Custom error classes for EvalSense
 */

export class EvalSenseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvalSenseError";
  }
}

export class AssertionError extends EvalSenseError {
  public readonly expected: unknown;
  public readonly actual: unknown;
  public readonly field?: string;

  constructor(message: string, expected?: unknown, actual?: unknown, field?: string) {
    super(message);
    this.name = "AssertionError";
    this.expected = expected;
    this.actual = actual;
    this.field = field;
  }
}

export class DatasetError extends EvalSenseError {
  public readonly source?: string;

  constructor(message: string, source?: string) {
    super(message);
    this.name = "DatasetError";
    this.source = source;
  }
}

export class IntegrityError extends EvalSenseError {
  public readonly missingIds?: string[];
  public readonly duplicateIds?: string[];

  constructor(message: string, missingIds?: string[], duplicateIds?: string[]) {
    super(message);
    this.name = "IntegrityError";
    this.missingIds = missingIds;
    this.duplicateIds = duplicateIds;
  }
}

export class ConfigurationError extends EvalSenseError {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class TestExecutionError extends EvalSenseError {
  public readonly testName: string;
  public readonly originalError?: Error;

  constructor(message: string, testName: string, originalError?: Error) {
    super(message);
    this.name = "TestExecutionError";
    this.testName = testName;
    this.originalError = originalError;
  }
}

export class MultipleAssertionError extends EvalSenseError {
  public readonly failures: Array<{
    message: string;
    expected?: unknown;
    actual?: unknown;
    field?: string;
  }>;

  constructor(
    failures: Array<{ message: string; expected?: unknown; actual?: unknown; field?: string }>
  ) {
    const count = failures.length;
    const summary = failures.map((f) => `  - ${f.message}`).join("\n");
    super(`${count} assertion${count > 1 ? "s" : ""} failed:\n${summary}`);
    this.name = "MultipleAssertionError";
    this.failures = failures;
  }
}
