/**
 * Statistics module exports
 */

export {
  buildConfusionMatrix,
  getCount,
  getTruePositives,
  getFalsePositives,
  getFalseNegatives,
  getTrueNegatives,
  getSupport,
  formatConfusionMatrix,
} from "./confusion-matrix.js";

export {
  computeClassificationMetrics,
  computeMetricsFromMatrix,
  computePrecision,
  computeRecall,
  computeF1,
  computeAccuracy,
} from "./classification.js";

export {
  computeRegressionMetrics,
  computeMAE,
  computeMSE,
  computeRMSE,
  computeR2,
} from "./regression.js";

export {
  computeCalibration,
  computeBrierScore,
  type CalibrationResult,
  type CalibrationBin,
} from "./calibration.js";

export {
  filterNumericValues,
  calculatePercentageBelow,
  calculatePercentageAbove,
} from "./distribution.js";
