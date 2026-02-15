import { describe, it, expect } from "vitest";
import {
  ExitCodes,
  ExitCodeDescriptions,
  getExitCodeDescription,
} from "../../../src/runner/exit-codes.js";

describe("ExitCodes", () => {
  it("defines SUCCESS as 0", () => {
    expect(ExitCodes.SUCCESS).toBe(0);
  });

  it("defines ASSERTION_FAILURE as 1", () => {
    expect(ExitCodes.ASSERTION_FAILURE).toBe(1);
  });

  it("defines INTEGRITY_FAILURE as 2", () => {
    expect(ExitCodes.INTEGRITY_FAILURE).toBe(2);
  });

  it("defines EXECUTION_ERROR as 3", () => {
    expect(ExitCodes.EXECUTION_ERROR).toBe(3);
  });

  it("defines CONFIGURATION_ERROR as 4", () => {
    expect(ExitCodes.CONFIGURATION_ERROR).toBe(4);
  });
});

describe("ExitCodeDescriptions", () => {
  it("has descriptions for all exit codes", () => {
    expect(ExitCodeDescriptions[0]).toBeDefined();
    expect(ExitCodeDescriptions[1]).toBeDefined();
    expect(ExitCodeDescriptions[2]).toBeDefined();
    expect(ExitCodeDescriptions[3]).toBeDefined();
    expect(ExitCodeDescriptions[4]).toBeDefined();
  });
});

describe("getExitCodeDescription", () => {
  it("returns description for known codes", () => {
    expect(getExitCodeDescription(0)).toContain("passed");
    expect(getExitCodeDescription(1)).toContain("Assertion");
    expect(getExitCodeDescription(2)).toContain("integrity");
    expect(getExitCodeDescription(3)).toContain("Execution");
    expect(getExitCodeDescription(4)).toContain("Configuration");
  });

  it("returns unknown message for unrecognized codes", () => {
    expect(getExitCodeDescription(99)).toContain("Unknown");
    expect(getExitCodeDescription(99)).toContain("99");
  });
});
