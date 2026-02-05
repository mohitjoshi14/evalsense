/**
 * Calibration metrics for probability predictions
 */

/**
 * Result of calibration analysis
 */
export interface CalibrationResult {
  expectedCalibrationError: number;
  maxCalibrationError: number;
  bins: CalibrationBin[];
}

/**
 * A single calibration bin
 */
export interface CalibrationBin {
  binStart: number;
  binEnd: number;
  avgPrediction: number;
  avgActual: number;
  count: number;
}

/**
 * Computes calibration metrics for probability predictions
 *
 * @param predictions - Predicted probabilities (0 to 1)
 * @param actuals - Actual binary outcomes (0 or 1)
 * @param numBins - Number of bins for calibration curve (default: 10)
 */
export function computeCalibration(
  predictions: number[],
  actuals: number[],
  numBins = 10
): CalibrationResult {
  if (predictions.length !== actuals.length) {
    throw new Error("Predictions and actuals must have same length");
  }

  const n = predictions.length;
  if (n === 0) {
    return {
      expectedCalibrationError: 0,
      maxCalibrationError: 0,
      bins: [],
    };
  }

  // Create bins
  const bins: CalibrationBin[] = [];
  const binWidth = 1 / numBins;

  for (let i = 0; i < numBins; i++) {
    const binStart = i * binWidth;
    const binEnd = (i + 1) * binWidth;

    // Find predictions in this bin
    const binPredictions: number[] = [];
    const binActuals: number[] = [];

    for (let j = 0; j < n; j++) {
      const pred = predictions[j]!;
      if (pred >= binStart && (pred < binEnd || (i === numBins - 1 && pred <= binEnd))) {
        binPredictions.push(pred);
        binActuals.push(actuals[j]!);
      }
    }

    const count = binPredictions.length;
    const avgPrediction =
      count > 0 ? binPredictions.reduce((a, b) => a + b, 0) / count : (binStart + binEnd) / 2;
    const avgActual = count > 0 ? binActuals.reduce((a, b) => a + b, 0) / count : 0;

    bins.push({
      binStart,
      binEnd,
      avgPrediction,
      avgActual,
      count,
    });
  }

  // Compute Expected Calibration Error (ECE)
  let ece = 0;
  let mce = 0;

  for (const bin of bins) {
    if (bin.count > 0) {
      const binError = Math.abs(bin.avgPrediction - bin.avgActual);
      ece += (bin.count / n) * binError;
      mce = Math.max(mce, binError);
    }
  }

  return {
    expectedCalibrationError: ece,
    maxCalibrationError: mce,
    bins,
  };
}

/**
 * Computes Brier score for probability predictions
 * Lower is better; 0 is perfect
 */
export function computeBrierScore(predictions: number[], actuals: number[]): number {
  if (predictions.length !== actuals.length || predictions.length === 0) {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < predictions.length; i++) {
    const diff = (predictions[i] ?? 0) - (actuals[i] ?? 0);
    sum += diff * diff;
  }

  return sum / predictions.length;
}
