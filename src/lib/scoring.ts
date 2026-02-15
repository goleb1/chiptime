import {
  SCORING_TIERS,
  DNF_BADGE_POINTS,
  DNF_NO_BADGE_POINTS,
} from "./constants";
import type {
  GuesserScore,
  Prediction,
  PredictionScore,
  Runner,
} from "./types";

/**
 * Calculate the absolute percentage error between predicted and actual times.
 * Formula: |predicted - actual| / actual * 100
 */
export function calculateErrorPercentage(
  predicted: number,
  actual: number
): number {
  if (actual <= 0) {
    throw new Error("Actual time must be positive.");
  }
  return (Math.abs(predicted - actual) / actual) * 100;
}

/**
 * Score a single prediction against an actual finish time.
 * Walks the scoring tiers to find the matching tier.
 */
export function scorePrediction(
  predictedSeconds: number,
  actualSeconds: number
): PredictionScore {
  const errorPercentage = calculateErrorPercentage(
    predictedSeconds,
    actualSeconds
  );

  for (const tier of SCORING_TIERS) {
    if (errorPercentage <= tier.threshold) {
      return {
        score: tier.points,
        errorPercentage,
        tierLabel: tier.label,
      };
    }
  }

  // Should never reach here since the last tier has Infinity threshold,
  // but satisfy TypeScript.
  const lastTier = SCORING_TIERS[SCORING_TIERS.length - 1];
  return {
    score: lastTier.points,
    errorPercentage,
    tierLabel: lastTier.label,
  };
}

/**
 * Score a DNF/DNS result.
 */
export function scoreDnf(hasBadge: boolean): PredictionScore {
  return {
    score: hasBadge ? DNF_BADGE_POINTS : DNF_NO_BADGE_POINTS,
    errorPercentage: null,
    tierLabel: hasBadge ? "DNF Called" : "DNF Missed",
  };
}

/**
 * Score all of a guesser's predictions and produce a total + rank-ready result.
 * Runners must be looked up to determine finish status and actual times.
 */
export function scoreGuesser(
  predictions: Prediction[],
  runners: Runner[]
): GuesserScore {
  const runnerMap = new Map(runners.map((r) => [r.id, r]));
  const predictionScores: PredictionScore[] = [];
  let totalScore = 0;
  let bestError: number | null = null;

  for (const prediction of predictions) {
    const runner = runnerMap.get(prediction.runnerId);
    if (!runner) continue;

    let ps: PredictionScore;

    if (runner.status === "dnf" || runner.status === "dns") {
      ps = scoreDnf(prediction.dnfBadge);
    } else if (
      runner.status === "finished" &&
      runner.actualTimeSeconds !== null
    ) {
      ps = scorePrediction(
        prediction.predictedTimeSeconds,
        runner.actualTimeSeconds
      );
    } else {
      // Runner hasn't finished yet — no score
      continue;
    }

    predictionScores.push(ps);
    totalScore += ps.score;

    if (
      ps.errorPercentage !== null &&
      (bestError === null || ps.errorPercentage < bestError)
    ) {
      bestError = ps.errorPercentage;
    }
  }

  return {
    guesserId: predictions[0]?.guesserId ?? "",
    totalScore,
    bestErrorPercentage: bestError,
    predictionScores,
  };
}
