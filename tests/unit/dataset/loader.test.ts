import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadDataset, createDataset } from "../../../src/dataset/loader.js";

const testDir = join(process.cwd(), "tests/fixtures/temp");

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("loadDataset", () => {
  it("loads JSON array file", () => {
    const data = [
      { id: "1", text: "hello", label: "greeting" },
      { id: "2", text: "bye", label: "farewell" },
    ];
    const filePath = join(testDir, "test.json");
    writeFileSync(filePath, JSON.stringify(data));

    const dataset = loadDataset(filePath);

    expect(dataset.records).toEqual(data);
    expect(dataset.metadata.count).toBe(2);
    expect(dataset.metadata.source).toContain("test.json");
  });

  it("loads NDJSON file", () => {
    const records = [
      { id: "1", value: 10 },
      { id: "2", value: 20 },
    ];
    const ndjson = records.map((r) => JSON.stringify(r)).join("\n");
    const filePath = join(testDir, "test.ndjson");
    writeFileSync(filePath, ndjson);

    const dataset = loadDataset(filePath);

    expect(dataset.records).toEqual(records);
    expect(dataset.metadata.count).toBe(2);
  });

  it("loads JSONL file (alias for NDJSON)", () => {
    const records = [{ id: "a" }, { id: "b" }];
    const jsonl = records.map((r) => JSON.stringify(r)).join("\n");
    const filePath = join(testDir, "test.jsonl");
    writeFileSync(filePath, jsonl);

    const dataset = loadDataset(filePath);
    expect(dataset.records).toEqual(records);
  });

  it("throws on non-array JSON", () => {
    const filePath = join(testDir, "object.json");
    writeFileSync(filePath, JSON.stringify({ key: "value" }));

    expect(() => loadDataset(filePath)).toThrow("must be an array");
  });

  it("throws on invalid file extension", () => {
    const filePath = join(testDir, "test.txt");
    writeFileSync(filePath, "hello");

    expect(() => loadDataset(filePath)).toThrow("Unsupported file format");
  });

  it("throws on non-existent file", () => {
    expect(() => loadDataset("nonexistent.json")).toThrow();
  });

  it("handles empty array", () => {
    const filePath = join(testDir, "empty.json");
    writeFileSync(filePath, "[]");

    const dataset = loadDataset(filePath);
    expect(dataset.records).toEqual([]);
    expect(dataset.metadata.count).toBe(0);
  });
});

describe("createDataset", () => {
  it("creates dataset from array", () => {
    const records = [
      { id: "1", value: 1 },
      { id: "2", value: 2 },
    ];

    const dataset = createDataset(records);

    expect(dataset.records).toEqual(records);
    expect(dataset.metadata.count).toBe(2);
    expect(dataset.metadata.source).toBe("inline");
  });

  it("accepts custom source name", () => {
    const dataset = createDataset([], "my-source");
    expect(dataset.metadata.source).toBe("my-source");
  });
});
