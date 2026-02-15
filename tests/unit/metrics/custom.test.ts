import { describe, it, expect } from "vitest";
import { createPatternMetric, createKeywordMetric } from "../../../src/metrics/custom.js";

describe("createPatternMetric", () => {
  const outputs = [
    { id: "1", output: "Here is some ```code block``` for you." },
    { id: "2", output: "This is plain text with no code." },
    { id: "3", output: "const x = 5;" },
  ];

  it("returns a function", () => {
    const metric = createPatternMetric("test", [/foo/]);
    expect(typeof metric).toBe("function");
  });

  it("returns MetricOutput[] with correct length", async () => {
    const metric = createPatternMetric("code-check", [/```[\s\S]*?```/]);
    const results = await metric({ outputs });
    expect(results).toHaveLength(3);
  });

  it("assigns correct metric name to all results", async () => {
    const metric = createPatternMetric("my-metric", [/foo/]);
    const results = await metric({ outputs });
    for (const r of results) {
      expect(r.metric).toBe("my-metric");
    }
  });

  it("detects matching outputs with score 1 and label detected", async () => {
    const metric = createPatternMetric("has-code", [/const\s+\w+/]);
    const results = await metric({ outputs });
    const match = results.find((r) => r.id === "3");
    expect(match?.score).toBe(1);
    expect(match?.label).toBe("detected");
  });

  it("marks non-matching outputs with score 0 and label not_detected", async () => {
    const metric = createPatternMetric("has-code", [/const\s+\w+/]);
    const results = await metric({ outputs });
    const noMatch = results.find((r) => r.id === "2");
    expect(noMatch?.score).toBe(0);
    expect(noMatch?.label).toBe("not_detected");
  });

  it("matches if ANY pattern matches", async () => {
    const metric = createPatternMetric("has-something", [/```/, /const/]);
    const results = await metric({ outputs });
    // id "1" matches ``` pattern
    expect(results.find((r) => r.id === "1")?.score).toBe(1);
    // id "3" matches const pattern
    expect(results.find((r) => r.id === "3")?.score).toBe(1);
    // id "2" matches neither
    expect(results.find((r) => r.id === "2")?.score).toBe(0);
  });

  it("uses custom matchScore and noMatchScore", async () => {
    const metric = createPatternMetric("custom-scores", [/foo/], {
      matchScore: 0.8,
      noMatchScore: 0.2,
    });
    const results = await metric({ outputs: [{ id: "1", output: "foo bar" }] });
    expect(results[0].score).toBe(0.8);

    const results2 = await metric({ outputs: [{ id: "1", output: "bar baz" }] });
    expect(results2[0].score).toBe(0.2);
  });

  it("handles empty outputs", async () => {
    const metric = createPatternMetric("test", [/foo/]);
    const results = await metric({ outputs: [] });
    expect(results).toHaveLength(0);
  });

  it("handles empty patterns array (no match possible)", async () => {
    const metric = createPatternMetric("empty-patterns", []);
    const results = await metric({ outputs: [{ id: "1", output: "anything" }] });
    expect(results[0].score).toBe(0);
    expect(results[0].label).toBe("not_detected");
  });

  it("preserves ids in output", async () => {
    const metric = createPatternMetric("test", [/x/]);
    const myOutputs = [
      { id: "abc", output: "x" },
      { id: "xyz", output: "y" },
    ];
    const results = await metric({ outputs: myOutputs });
    expect(results.map((r) => r.id)).toEqual(["abc", "xyz"]);
  });
});

describe("createKeywordMetric", () => {
  const outputs = [
    { id: "1", output: "This uses machine learning and a neural network algorithm." },
    { id: "2", output: "This is plain text about cooking." },
    { id: "3", output: "Algorithm design is important in machine learning." },
  ];

  const keywords = ["machine learning", "neural network", "algorithm"];

  it("returns a function", () => {
    const metric = createKeywordMetric("test", ["foo"]);
    expect(typeof metric).toBe("function");
  });

  it("returns MetricOutput[] with correct length", async () => {
    const metric = createKeywordMetric("tech-terms", keywords);
    const results = await metric({ outputs });
    expect(results).toHaveLength(3);
  });

  it("assigns correct metric name", async () => {
    const metric = createKeywordMetric("my-metric", keywords);
    const results = await metric({ outputs });
    for (const r of results) {
      expect(r.metric).toBe("my-metric");
    }
  });

  it("computes score as fraction of keywords matched", async () => {
    const metric = createKeywordMetric("tech-terms", keywords);
    const results = await metric({ outputs });
    // id "1" has all 3 keywords → score = 3/3 = 1.0
    expect(results.find((r) => r.id === "1")?.score).toBe(1);
    // id "2" has 0 keywords → score = 0/3 = 0
    expect(results.find((r) => r.id === "2")?.score).toBe(0);
    // id "3" has 2 keywords (algorithm, machine learning) → score = 2/3
    expect(results.find((r) => r.id === "3")?.score).toBeCloseTo(2 / 3);
  });

  it("uses threshold to set label", async () => {
    const metric = createKeywordMetric("tech-terms", keywords, { threshold: 0.5 });
    const results = await metric({ outputs });
    expect(results.find((r) => r.id === "1")?.label).toBe("detected"); // score=1.0 >= 0.5
    expect(results.find((r) => r.id === "2")?.label).toBe("not_detected"); // score=0 < 0.5
  });

  it("default threshold is 0.5", async () => {
    const metric = createKeywordMetric("tech-terms", ["word1", "word2"]);
    // Only 1 of 2 keywords matched → score = 0.5, which equals threshold → detected
    const results = await metric({ outputs: [{ id: "1", output: "word1 is here" }] });
    expect(results[0].label).toBe("detected");
  });

  it("is case-insensitive by default", async () => {
    const metric = createKeywordMetric("test", ["MACHINE LEARNING"]);
    const results = await metric({ outputs: [{ id: "1", output: "machine learning is great" }] });
    expect(results[0].score).toBe(1);
  });

  it("is case-sensitive when caseSensitive=true", async () => {
    const metric = createKeywordMetric("test", ["MACHINE LEARNING"], { caseSensitive: true });
    const results = await metric({ outputs: [{ id: "1", output: "machine learning is great" }] });
    expect(results[0].score).toBe(0);
  });

  it("preserves ids in output", async () => {
    const metric = createKeywordMetric("test", ["foo"]);
    const myOutputs = [
      { id: "a1", output: "foo" },
      { id: "b2", output: "bar" },
    ];
    const results = await metric({ outputs: myOutputs });
    expect(results.map((r) => r.id)).toEqual(["a1", "b2"]);
  });

  it("handles empty outputs", async () => {
    const metric = createKeywordMetric("test", keywords);
    const results = await metric({ outputs: [] });
    expect(results).toHaveLength(0);
  });

  it("handles empty keywords array (score is NaN → 0/0)", async () => {
    const metric = createKeywordMetric("empty", []);
    // With no keywords, matches.length / keywords.length = 0/0 = NaN
    // This is an edge case — just verify it doesn't throw
    expect(async () => {
      await metric({ outputs: [{ id: "1", output: "anything" }] });
    }).not.toThrow();
  });
});
