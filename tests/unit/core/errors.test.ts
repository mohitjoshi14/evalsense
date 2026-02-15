import { describe, it, expect } from "vitest";
import {
  EvalSenseError,
  AssertionError,
  DatasetError,
  IntegrityError,
  ConfigurationError,
  TestExecutionError,
  MultipleAssertionError,
} from "../../../src/core/errors.js";

describe("EvalSenseError", () => {
  it("sets name and message", () => {
    const err = new EvalSenseError("test error");
    expect(err.name).toBe("EvalSenseError");
    expect(err.message).toBe("test error");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("AssertionError", () => {
  it("sets name, message, expected, actual, and field", () => {
    const err = new AssertionError("bad", 0.8, 0.5, "label");
    expect(err.name).toBe("AssertionError");
    expect(err.expected).toBe(0.8);
    expect(err.actual).toBe(0.5);
    expect(err.field).toBe("label");
  });

  it("works without optional params", () => {
    const err = new AssertionError("bad");
    expect(err.expected).toBeUndefined();
    expect(err.actual).toBeUndefined();
    expect(err.field).toBeUndefined();
  });
});

describe("DatasetError", () => {
  it("sets name and source", () => {
    const err = new DatasetError("missing file", "data.json");
    expect(err.name).toBe("DatasetError");
    expect(err.source).toBe("data.json");
  });

  it("works without source", () => {
    const err = new DatasetError("bad");
    expect(err.source).toBeUndefined();
  });
});

describe("IntegrityError", () => {
  it("sets name, missingIds, and duplicateIds", () => {
    const err = new IntegrityError("integrity fail", ["1", "2"], ["3"]);
    expect(err.name).toBe("IntegrityError");
    expect(err.missingIds).toEqual(["1", "2"]);
    expect(err.duplicateIds).toEqual(["3"]);
  });

  it("works without optional params", () => {
    const err = new IntegrityError("fail");
    expect(err.missingIds).toBeUndefined();
    expect(err.duplicateIds).toBeUndefined();
  });
});

describe("ConfigurationError", () => {
  it("sets name and message", () => {
    const err = new ConfigurationError("bad config");
    expect(err.name).toBe("ConfigurationError");
    expect(err.message).toBe("bad config");
  });
});

describe("TestExecutionError", () => {
  it("sets name, testName, and originalError", () => {
    const original = new Error("root cause");
    const err = new TestExecutionError("test failed", "my-test", original);
    expect(err.name).toBe("TestExecutionError");
    expect(err.testName).toBe("my-test");
    expect(err.originalError).toBe(original);
  });

  it("works without originalError", () => {
    const err = new TestExecutionError("failed", "test1");
    expect(err.originalError).toBeUndefined();
  });
});

describe("MultipleAssertionError", () => {
  it("sets name and failures", () => {
    const failures = [
      { message: "accuracy too low", expected: 0.8, actual: 0.5 },
      { message: "recall too low", expected: 0.7, actual: 0.3, field: "label" },
    ];
    const err = new MultipleAssertionError(failures);
    expect(err.name).toBe("MultipleAssertionError");
    expect(err.failures).toHaveLength(2);
  });

  it("formats message with count and details", () => {
    const failures = [{ message: "accuracy too low" }, { message: "recall too low" }];
    const err = new MultipleAssertionError(failures);
    expect(err.message).toContain("2 assertions failed");
    expect(err.message).toContain("accuracy too low");
    expect(err.message).toContain("recall too low");
  });

  it("singular form for single failure", () => {
    const failures = [{ message: "one failure" }];
    const err = new MultipleAssertionError(failures);
    expect(err.message).toContain("1 assertion failed");
  });
});
