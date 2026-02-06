/**
 * runModel() - executes a model function against a dataset
 */

import type { Dataset, Prediction, AlignedRecord } from "../core/types.js";
import { DatasetError } from "../core/errors.js";

/**
 * Model function signature - takes a record and returns a prediction
 */
export type ModelFn<T> = (record: T) => Prediction | Promise<Prediction>;

/**
 * Result of running a model on a dataset
 */
export interface ModelRunResult {
  predictions: Prediction[];
  aligned: AlignedRecord[];
  duration: number;
}

/**
 * Runs a model function against each record in a dataset
 *
 * @param dataset - The dataset to process
 * @param modelFn - Function that processes each record and returns a prediction
 * @returns Aligned predictions with actual vs expected values
 *
 * @example
 * ```ts
 * const result = await runModel(dataset, (record) => ({
 *   id: record.id,
 *   sentiment: classify(record.text)
 * }));
 * ```
 */
export async function runModel<T extends Record<string, unknown>>(
  dataset: Dataset<T>,
  modelFn: ModelFn<T>
): Promise<ModelRunResult> {
  const startTime = Date.now();
  const predictions: Prediction[] = [];
  const aligned: AlignedRecord[] = [];

  for (const record of dataset.records) {
    const id = getRecordId(record);

    // Run the model function
    const prediction = await modelFn(record);

    // Validate prediction has matching ID
    if (prediction.id !== id) {
      throw new DatasetError(
        `Prediction ID mismatch: expected "${id}", got "${prediction.id}". ` +
          `Model function must return the same ID as the input record.`
      );
    }

    predictions.push(prediction);

    // Create aligned record (actual = prediction, expected = original record)
    aligned.push({
      id,
      actual: { ...prediction },
      expected: { ...record },
    });
  }

  return {
    predictions,
    aligned,
    duration: Date.now() - startTime,
  };
}

/**
 * Extracts the ID from a record (supports "id" or "_id" fields)
 */
function getRecordId(record: Record<string, unknown>): string {
  const id = record.id ?? record._id;

  if (id === undefined || id === null) {
    throw new DatasetError('Dataset records must have an "id" or "_id" field for alignment');
  }

  return String(id);
}

/**
 * Runs model in parallel with concurrency limit
 */
export async function runModelParallel<T extends Record<string, unknown>>(
  dataset: Dataset<T>,
  modelFn: ModelFn<T>,
  concurrency = 10
): Promise<ModelRunResult> {
  const startTime = Date.now();
  const results: Array<{ prediction: Prediction; record: T }> = [];

  // Process in batches
  for (let i = 0; i < dataset.records.length; i += concurrency) {
    const batch = dataset.records.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (record) => {
        const prediction = await modelFn(record);
        return { prediction, record };
      })
    );
    results.push(...batchResults);
  }

  // Build predictions and aligned arrays in original order
  const predictions: Prediction[] = [];
  const aligned: AlignedRecord[] = [];

  for (const { prediction, record } of results) {
    const id = getRecordId(record);

    if (prediction.id !== id) {
      throw new DatasetError(`Prediction ID mismatch: expected "${id}", got "${prediction.id}".`);
    }

    predictions.push(prediction);
    aligned.push({
      id,
      actual: { ...prediction },
      expected: { ...record },
    });
  }

  return {
    predictions,
    aligned,
    duration: Date.now() - startTime,
  };
}
