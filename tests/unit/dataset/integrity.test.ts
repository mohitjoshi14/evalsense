import { describe, it, expect } from "vitest";
import {
  checkIntegrity,
  validatePredictions,
  isValidNumber,
  isValidLabel,
} from "../../../src/dataset/integrity.js";
import { IntegrityError } from "../../../src/core/errors.js";

describe("checkIntegrity", () => {
  it("returns valid for a clean dataset", () => {
    const records = [
      { id: "1", label: "positive" },
      { id: "2", label: "negative" },
    ];
    const result = checkIntegrity(records);
    expect(result.valid).toBe(true);
    expect(result.totalRecords).toBe(2);
    expect(result.missingIds).toHaveLength(0);
    expect(result.duplicateIds).toHaveLength(0);
    expect(result.missingFields).toHaveLength(0);
  });

  it("detects missing IDs", () => {
    const records = [
      { label: "positive" }, // no id
      { id: "2", label: "negative" },
    ] as never;
    const result = checkIntegrity(records);
    expect(result.valid).toBe(false);
    expect(result.missingIds).toHaveLength(1);
    expect(result.missingIds[0]).toBe("record[0]");
  });

  it("detects duplicate IDs", () => {
    const records = [
      { id: "1", label: "a" },
      { id: "1", label: "b" }, // duplicate
      { id: "3", label: "c" },
    ];
    const result = checkIntegrity(records);
    expect(result.valid).toBe(false);
    expect(result.duplicateIds).toContain("1");
  });

  it("detects missing required fields", () => {
    const records = [
      { id: "1", label: "a" },
      { id: "2" }, // missing label
    ];
    const result = checkIntegrity(records, { requiredFields: ["label"] });
    expect(result.valid).toBe(false);
    expect(result.missingFields).toHaveLength(1);
    expect(result.missingFields[0].id).toBe("2");
    expect(result.missingFields[0].fields).toContain("label");
  });

  it("detects multiple missing required fields in one record", () => {
    const records = [{ id: "1" }]; // missing text and label
    const result = checkIntegrity(records, { requiredFields: ["text", "label"] });
    expect(result.valid).toBe(false);
    expect(result.missingFields[0].fields).toEqual(expect.arrayContaining(["text", "label"]));
  });

  it("supports _id as alternative to id", () => {
    const records = [
      { _id: "1", label: "a" },
      { _id: "2", label: "b" },
    ];
    const result = checkIntegrity(records);
    expect(result.valid).toBe(true);
  });

  it("throws IntegrityError when throwOnFailure is true and dataset is invalid", () => {
    const records = [{ label: "a" }] as never; // no id
    expect(() => checkIntegrity(records, { throwOnFailure: true })).toThrow(IntegrityError);
  });

  it("throws with message listing all issue types", () => {
    const records = [
      { label: "a" }, // missing id
      { id: "2", label: "b" },
      { id: "2", label: "c" }, // duplicate id
    ] as never;
    expect(() => checkIntegrity(records, { throwOnFailure: true })).toThrow(
      /Dataset integrity check failed/
    );
  });

  it("returns totalRecords count", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({ id: String(i + 1) }));
    const result = checkIntegrity(records);
    expect(result.totalRecords).toBe(5);
  });

  it("handles empty dataset", () => {
    const result = checkIntegrity([]);
    expect(result.valid).toBe(true);
    expect(result.totalRecords).toBe(0);
  });

  it("reports multiple issues simultaneously", () => {
    const records = [
      { label: "a" }, // missing id
      { id: "2" }, // missing label (required field)
      { id: "2", label: "c" }, // duplicate id
    ] as never;
    const result = checkIntegrity(records, { requiredFields: ["label"] });
    expect(result.valid).toBe(false);
    expect(result.missingIds.length).toBeGreaterThan(0);
    expect(result.duplicateIds.length).toBeGreaterThan(0);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });
});

describe("validatePredictions", () => {
  it("returns valid when predictions match expected IDs exactly", () => {
    const predictions = [{ id: "1" }, { id: "2" }, { id: "3" }];
    const expectedIds = ["1", "2", "3"];
    const result = validatePredictions(predictions, expectedIds);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.extra).toHaveLength(0);
  });

  it("detects missing predictions", () => {
    const predictions = [{ id: "1" }];
    const expectedIds = ["1", "2", "3"];
    const result = validatePredictions(predictions, expectedIds);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining(["2", "3"]));
  });

  it("detects extra predictions not in expected", () => {
    const predictions = [{ id: "1" }, { id: "2" }, { id: "99" }];
    const expectedIds = ["1", "2"];
    const result = validatePredictions(predictions, expectedIds);
    expect(result.valid).toBe(false);
    expect(result.extra).toContain("99");
  });

  it("handles empty predictions and expected", () => {
    const result = validatePredictions([], []);
    expect(result.valid).toBe(true);
  });

  it("handles empty predictions with expected IDs", () => {
    const result = validatePredictions([], ["1", "2"]);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["1", "2"]);
  });
});

describe("isValidNumber", () => {
  it("returns true for finite numbers", () => {
    expect(isValidNumber(0)).toBe(true);
    expect(isValidNumber(1)).toBe(true);
    expect(isValidNumber(-5.5)).toBe(true);
    expect(isValidNumber(0.001)).toBe(true);
  });

  it("returns false for NaN", () => {
    expect(isValidNumber(NaN)).toBe(false);
  });

  it("returns false for Infinity", () => {
    expect(isValidNumber(Infinity)).toBe(false);
    expect(isValidNumber(-Infinity)).toBe(false);
  });

  it("returns false for non-numbers", () => {
    expect(isValidNumber("1")).toBe(false);
    expect(isValidNumber(null)).toBe(false);
    expect(isValidNumber(undefined)).toBe(false);
    expect(isValidNumber(true)).toBe(false);
  });
});

describe("isValidLabel", () => {
  it("returns true for non-empty strings", () => {
    expect(isValidLabel("positive")).toBe(true);
    expect(isValidLabel("a")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isValidLabel("")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(isValidLabel("   ")).toBe(false);
  });

  it("returns false for non-strings", () => {
    expect(isValidLabel(1)).toBe(false);
    expect(isValidLabel(null)).toBe(false);
    expect(isValidLabel(undefined)).toBe(false);
  });
});
