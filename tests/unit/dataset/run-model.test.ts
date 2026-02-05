import { describe, it, expect } from "vitest";
import { runModel, runModelParallel } from "../../../src/dataset/run-model.js";
import { createDataset } from "../../../src/dataset/loader.js";

describe("runModel", () => {
  it("runs model function on each record", async () => {
    const dataset = createDataset([
      { id: "1", text: "good" },
      { id: "2", text: "bad" },
    ]);

    const result = await runModel(dataset, (record) => ({
      id: record.id as string,
      sentiment: (record.text as string).includes("good") ? "positive" : "negative",
    }));

    expect(result.predictions).toHaveLength(2);
    expect(result.predictions[0]).toEqual({ id: "1", sentiment: "positive" });
    expect(result.predictions[1]).toEqual({ id: "2", sentiment: "negative" });
  });

  it("creates aligned records", async () => {
    const dataset = createDataset([
      { id: "1", text: "test", expected: "positive" },
    ]);

    const result = await runModel(dataset, (record) => ({
      id: record.id as string,
      label: "predicted",
    }));

    expect(result.aligned).toHaveLength(1);
    expect(result.aligned[0]?.actual).toEqual({ id: "1", label: "predicted" });
    expect(result.aligned[0]?.expected).toEqual({
      id: "1",
      text: "test",
      expected: "positive",
    });
  });

  it("supports async model functions", async () => {
    const dataset = createDataset([{ id: "1" }, { id: "2" }]);

    const result = await runModel(dataset, async (record) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { id: record.id as string, processed: true };
    });

    expect(result.predictions).toHaveLength(2);
    expect(result.predictions[0]?.processed).toBe(true);
  });

  it("throws if prediction ID doesn't match", async () => {
    const dataset = createDataset([{ id: "1" }]);

    await expect(
      runModel(dataset, () => ({ id: "wrong-id" }))
    ).rejects.toThrow("ID mismatch");
  });

  it("throws if record has no ID", async () => {
    const dataset = createDataset([{ text: "no id" }]);

    await expect(
      runModel(dataset, (r) => ({ id: "1", text: r.text }))
    ).rejects.toThrow('must have an "id"');
  });

  it("tracks duration", async () => {
    const dataset = createDataset([{ id: "1" }]);

    const result = await runModel(dataset, async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { id: r.id as string };
    });

    expect(result.duration).toBeGreaterThanOrEqual(50);
  });
});

describe("runModelParallel", () => {
  it("processes records in parallel batches", async () => {
    const dataset = createDataset([
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
      { id: "5" },
    ]);

    const callOrder: string[] = [];

    const result = await runModelParallel(
      dataset,
      async (record) => {
        callOrder.push(record.id as string);
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { id: record.id as string, done: true };
      },
      2 // concurrency of 2
    );

    expect(result.predictions).toHaveLength(5);
    // All should be processed
    expect(callOrder).toHaveLength(5);
  });

  it("maintains order in results", async () => {
    const dataset = createDataset([
      { id: "1" },
      { id: "2" },
      { id: "3" },
    ]);

    const result = await runModelParallel(
      dataset,
      async (record) => {
        // Random delay to test ordering
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 20)
        );
        return { id: record.id as string };
      },
      10
    );

    expect(result.predictions.map((p) => p.id)).toEqual(["1", "2", "3"]);
  });
});
