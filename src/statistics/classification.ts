/**
 * Classification metrics computation
 */

import type { ConfusionMatrix, ClassificationMetrics, ClassMetrics } from "../core/types.js";
import {
  buildConfusionMatrix,
  getTruePositives,
  getFalsePositives,
  getFalseNegatives,
  getSupport,
} from "./confusion-matrix.js";

/**
 * Computes all classification metrics from actual and expected values
 */
export function computeClassificationMetrics(
  actual: unknown[],
  expected: unknown[]
): ClassificationMetrics {
  const confusionMatrix = buildConfusionMatrix(actual, expected);
  return computeMetricsFromMatrix(confusionMatrix);
}

/**
 * Computes classification metrics from a pre-built confusion matrix
 */
export function computeMetricsFromMatrix(cm: ConfusionMatrix): ClassificationMetrics {
  const perClass: Record<string, ClassMetrics> = {};
  let totalSupport = 0;
  let correctPredictions = 0;

  // Compute per-class metrics
  for (const label of cm.labels) {
    const tp = getTruePositives(cm, label);
    const fp = getFalsePositives(cm, label);
    const fn = getFalseNegatives(cm, label);
    const support = getSupport(cm, label);

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    perClass[label] = { precision, recall, f1, support };
    totalSupport += support;
    correctPredictions += tp;
  }

  // Compute accuracy
  const accuracy = totalSupport > 0 ? correctPredictions / totalSupport : 0;

  // Compute macro averages (unweighted mean)
  const classCount = cm.labels.length;
  const macroAvg = {
    precision:
      classCount > 0
        ? Object.values(perClass).reduce((sum, m) => sum + m.precision, 0) / classCount
        : 0,
    recall:
      classCount > 0
        ? Object.values(perClass).reduce((sum, m) => sum + m.recall, 0) / classCount
        : 0,
    f1:
      classCount > 0
        ? Object.values(perClass).reduce((sum, m) => sum + m.f1, 0) / classCount
        : 0,
  };

  // Compute weighted averages
  const weightedAvg = {
    precision:
      totalSupport > 0
        ? Object.values(perClass).reduce((sum, m) => sum + m.precision * m.support, 0) /
          totalSupport
        : 0,
    recall:
      totalSupport > 0
        ? Object.values(perClass).reduce((sum, m) => sum + m.recall * m.support, 0) / totalSupport
        : 0,
    f1:
      totalSupport > 0
        ? Object.values(perClass).reduce((sum, m) => sum + m.f1 * m.support, 0) / totalSupport
        : 0,
  };

  return {
    accuracy,
    perClass,
    macroAvg,
    weightedAvg,
    confusionMatrix: cm,
  };
}

/**
 * Computes precision for a specific class
 */
export function computePrecision(actual: unknown[], expected: unknown[], targetClass: string): number {
  const cm = buildConfusionMatrix(actual, expected);
  const tp = getTruePositives(cm, targetClass);
  const fp = getFalsePositives(cm, targetClass);
  return tp + fp > 0 ? tp / (tp + fp) : 0;
}

/**
 * Computes recall for a specific class
 */
export function computeRecall(actual: unknown[], expected: unknown[], targetClass: string): number {
  const cm = buildConfusionMatrix(actual, expected);
  const tp = getTruePositives(cm, targetClass);
  const fn = getFalseNegatives(cm, targetClass);
  return tp + fn > 0 ? tp / (tp + fn) : 0;
}

/**
 * Computes F1 score for a specific class
 */
export function computeF1(actual: unknown[], expected: unknown[], targetClass: string): number {
  const precision = computePrecision(actual, expected, targetClass);
  const recall = computeRecall(actual, expected, targetClass);
  return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
}

/**
 * Computes overall accuracy
 */
export function computeAccuracy(actual: unknown[], expected: unknown[]): number {
  if (actual.length !== expected.length || actual.length === 0) {
    return 0;
  }

  let correct = 0;
  let total = 0;

  for (let i = 0; i < actual.length; i++) {
    const a = actual[i];
    const e = expected[i];
    if (a !== undefined && a !== null && e !== undefined && e !== null) {
      total++;
      if (String(a) === String(e)) {
        correct++;
      }
    }
  }

  return total > 0 ? correct / total : 0;
}
