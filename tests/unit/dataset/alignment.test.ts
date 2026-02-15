import { describe, it, expect } from "vitest";
import { alignByKey, extractFieldValues, filterComplete } from "../../../src/dataset/alignment.js";
import { IntegrityError } from "../../../src/core/errors.js";

describe("alignByKey", () => {
  const predictions = [
    { id: "1", label: "positive" },
    { id: "2", label: "negative" },
    { id: "3", label: "positive" },
  ];

  const expected = [
    { id: "1", label: "positive", text: "Great!" },
    { id: "2", label: "negative", text: "Terrible." },
    { id: "3", label: "positive", text: "Excellent." },
  ];

  it("aligns records by default id field", () => {
    const aligned = alignByKey(predictions, expected);
    expect(aligned).toHaveLength(3);
    expect(aligned[0]).toEqual({
      id: "1",
      actual: { id: "1", label: "positive" },
      expected: { id: "1", label: "positive", text: "Great!" },
    });
  });

  it("returns aligned records with correct structure", () => {
    const aligned = alignByKey(predictions, expected);
    for (const record of aligned) {
      expect(record).toHaveProperty("id");
      expect(record).toHaveProperty("actual");
      expect(record).toHaveProperty("expected");
    }
  });

  it("aligns using custom idField (legacy option)", () => {
    const preds = [{ uid: "a", score: 1 }];
    const exp = [{ uid: "a", label: "good" }];
    const aligned = alignByKey(preds as never, exp, { idField: "uid" });
    expect(aligned).toHaveLength(1);
    expect(aligned[0].id).toBe("a");
  });

  it("aligns using separate predictionIdField and expectedIdField", () => {
    const preds = [{ predId: "x", score: 0.9 }];
    const exp = [{ groundId: "x", label: "high" }];
    const aligned = alignByKey(preds as never, exp, {
      predictionIdField: "predId",
      expectedIdField: "groundId",
    });
    expect(aligned).toHaveLength(1);
    expect(aligned[0].id).toBe("x");
    expect(aligned[0].actual).toMatchObject({ predId: "x" });
    expect(aligned[0].expected).toMatchObject({ groundId: "x", label: "high" });
  });

  it("in non-strict mode, includes prediction with empty expected when ID is missing from expected", () => {
    const preds = [
      { id: "1", label: "a" },
      { id: "99", label: "b" },
    ];
    const exp = [{ id: "1", label: "a" }];
    const aligned = alignByKey(preds, exp);
    expect(aligned).toHaveLength(2);
    const missingRecord = aligned.find((r) => r.id === "99");
    expect(missingRecord?.expected).toEqual({});
  });

  it("in strict mode, throws when prediction has no matching expected", () => {
    const preds = [
      { id: "1", label: "a" },
      { id: "99", label: "b" },
    ];
    const exp = [{ id: "1", label: "a" }];
    expect(() => alignByKey(preds, exp, { strict: true })).toThrow(IntegrityError);
  });

  it("throws IntegrityError when expected record is missing ID", () => {
    const preds = [{ id: "1", label: "a" }];
    const exp = [{ label: "a" }]; // no id
    expect(() => alignByKey(preds, exp)).toThrow(IntegrityError);
  });

  it("throws IntegrityError when prediction is missing ID", () => {
    const preds = [{ label: "a" }] as never; // no id
    const exp = [{ id: "1", label: "a" }];
    expect(() => alignByKey(preds, exp)).toThrow(IntegrityError);
  });

  it("handles _id as fallback for expected records", () => {
    const preds = [{ id: "1", label: "a" }];
    const exp = [{ _id: "1", label: "a" }];
    const aligned = alignByKey(preds, exp);
    expect(aligned).toHaveLength(1);
    expect(aligned[0].id).toBe("1");
  });

  it("returns empty array for empty inputs", () => {
    const aligned = alignByKey([], []);
    expect(aligned).toHaveLength(0);
  });

  it("strict mode error message includes count of missing IDs", () => {
    const preds = [{ id: "1" }, { id: "2" }, { id: "3" }];
    const exp = [{ id: "1" }];
    expect(() => alignByKey(preds, exp, { strict: true })).toThrow(/2 prediction/);
  });
});

describe("extractFieldValues", () => {
  const aligned = [
    { id: "1", actual: { label: "positive", score: 0.9 }, expected: { label: "positive" } },
    { id: "2", actual: { label: "negative", score: 0.2 }, expected: { label: "negative" } },
    { id: "3", actual: { label: "positive", score: 0.8 }, expected: { label: "negative" } },
  ];

  it("extracts field values from aligned records", () => {
    const result = extractFieldValues(aligned, "label");
    expect(result.actual).toEqual(["positive", "negative", "positive"]);
    expect(result.expected).toEqual(["positive", "negative", "negative"]);
    expect(result.ids).toEqual(["1", "2", "3"]);
  });

  it("extracts numeric field values", () => {
    const result = extractFieldValues(aligned, "score");
    expect(result.actual).toEqual([0.9, 0.2, 0.8]);
  });

  it("returns undefined for missing fields", () => {
    const result = extractFieldValues(aligned, "nonexistent");
    expect(result.actual).toEqual([undefined, undefined, undefined]);
  });

  it("returns all three arrays with matching lengths", () => {
    const result = extractFieldValues(aligned, "label");
    expect(result.actual).toHaveLength(aligned.length);
    expect(result.expected).toHaveLength(aligned.length);
    expect(result.ids).toHaveLength(aligned.length);
  });

  it("returns empty arrays for empty input", () => {
    const result = extractFieldValues([], "label");
    expect(result.actual).toHaveLength(0);
    expect(result.expected).toHaveLength(0);
    expect(result.ids).toHaveLength(0);
  });
});

describe("filterComplete", () => {
  const aligned = [
    { id: "1", actual: { label: "a" }, expected: { label: "x" } },
    { id: "2", actual: { label: "b" }, expected: {} }, // missing expected
    { id: "3", actual: {}, expected: { label: "z" } }, // missing actual
    { id: "4", actual: { label: "c" }, expected: { label: "y" } },
  ];

  it("keeps only records where both actual and expected have the field", () => {
    const result = filterComplete(aligned, "label");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(["1", "4"]);
  });

  it("returns empty array if no records are complete", () => {
    const result = filterComplete(aligned, "nonexistent");
    expect(result).toHaveLength(0);
  });

  it("returns all records if all are complete", () => {
    const complete = [
      { id: "1", actual: { x: 1 }, expected: { x: 2 } },
      { id: "2", actual: { x: 3 }, expected: { x: 4 } },
    ];
    const result = filterComplete(complete, "x");
    expect(result).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    const result = filterComplete([], "label");
    expect(result).toHaveLength(0);
  });
});
