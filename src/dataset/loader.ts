/**
 * Dataset loading functionality
 */

import { readFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import type { Dataset } from "../core/types.js";
import { DatasetError } from "../core/errors.js";

/**
 * Loads a dataset from a JSON or NDJSON file
 *
 * @param path - Path to the dataset file (relative to cwd or absolute)
 * @returns Dataset with records and metadata
 *
 * @example
 * ```ts
 * const dataset = loadDataset("./fixtures/sentiment.json");
 * // dataset.records = [{ id: "1", text: "...", sentiment: "positive" }, ...]
 * ```
 */
export function loadDataset<T extends Record<string, unknown> = Record<string, unknown>>(
  path: string
): Dataset<T> {
  const absolutePath = resolve(process.cwd(), path);
  const ext = extname(absolutePath).toLowerCase();

  let records: T[];

  try {
    const content = readFileSync(absolutePath, "utf-8");

    if (ext === ".ndjson" || ext === ".jsonl") {
      records = parseNDJSON<T>(content);
    } else if (ext === ".json") {
      records = parseJSON<T>(content);
    } else {
      throw new DatasetError(
        `Unsupported file format: ${ext}. Use .json, .ndjson, or .jsonl`,
        path
      );
    }
  } catch (error) {
    if (error instanceof DatasetError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new DatasetError(`Failed to load dataset from ${path}: ${message}`, path);
  }

  return {
    records,
    metadata: {
      source: path,
      count: records.length,
      loadedAt: new Date(),
    },
  };
}

/**
 * Parses JSON array content
 */
function parseJSON<T>(content: string): T[] {
  const parsed: unknown = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new DatasetError("JSON dataset must be an array of records");
  }

  return parsed as T[];
}

/**
 * Parses NDJSON (newline-delimited JSON) content
 */
function parseNDJSON<T>(content: string): T[] {
  const lines = content.split("\n").filter((line) => line.trim() !== "");
  const records: T[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    try {
      records.push(JSON.parse(line) as T);
    } catch {
      throw new DatasetError(`Invalid JSON at line ${i + 1} in NDJSON file`);
    }
  }

  return records;
}

/**
 * Creates a dataset from an array of records (for testing/programmatic use)
 */
export function createDataset<T extends Record<string, unknown>>(
  records: T[],
  source = "inline"
): Dataset<T> {
  return {
    records,
    metadata: {
      source,
      count: records.length,
      loadedAt: new Date(),
    },
  };
}
