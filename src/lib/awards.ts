import type { Award, AwardType, Guesser, Prediction } from "./types";

interface ScoredPrediction {
  guesserId: string;
  runnerId: string;
  errorPercentage: number;
  dnfBadge: boolean;
  runnerDnf: boolean;
}

/**
 * Compute standard deviation of an array of numbers.
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Create an award record (without id/createdAt — those are DB-generated).
 */
function makeAward(
  gameId: string,
  guesserId: string,
  awardType: AwardType,
  detail: string | null = null
): Award {
  return {
    id: "",
    gameId,
    guesserId,
    awardType,
    detail,
    createdAt: "",
  };
}

/**
 * Compute all awards for a game.
 *
 * @param predictions - All predictions for the game (must have score and errorPercentage populated for finished runners).
 * @param guessers - All guessers in the game.
 * @param gameId - The game ID for the award records.
 * @returns Array of Award objects to be inserted.
 */
export function computeAwards(
  predictions: Prediction[],
  guessers: Guesser[],
  gameId: string
): Award[] {
  const awards: Award[] = [];

  // Build scored predictions — only those with a numeric error percentage
  const scoredPredictions: ScoredPrediction[] = predictions
    .filter((p) => p.errorPercentage !== null)
    .map((p) => ({
      guesserId: p.guesserId,
      runnerId: p.runnerId,
      errorPercentage: p.errorPercentage!,
      dnfBadge: p.dnfBadge,
      runnerDnf: false, // not needed for error-based awards
    }));

  // --- Sniper: lowest single error percentage ---
  if (scoredPredictions.length > 0) {
    const best = scoredPredictions.reduce((min, p) =>
      p.errorPercentage < min.errorPercentage ? p : min
    );
    awards.push(
      makeAward(
        gameId,
        best.guesserId,
        "sniper",
        `${best.errorPercentage.toFixed(4)}% error`
      )
    );
  }

  // --- Trash Can: highest single error percentage ---
  if (scoredPredictions.length > 0) {
    const worst = scoredPredictions.reduce((max, p) =>
      p.errorPercentage > max.errorPercentage ? p : max
    );
    awards.push(
      makeAward(
        gameId,
        worst.guesserId,
        "trash_can",
        `${worst.errorPercentage.toFixed(4)}% error`
      )
    );
  }

  // --- Robot & Chaos Agent: std dev of error percentages per guesser ---
  const guesserErrors = new Map<string, number[]>();
  for (const sp of scoredPredictions) {
    if (!guesserErrors.has(sp.guesserId)) {
      guesserErrors.set(sp.guesserId, []);
    }
    guesserErrors.get(sp.guesserId)!.push(sp.errorPercentage);
  }

  const guesserStdDevs: { guesserId: string; stdDev: number }[] = [];
  for (const [guesserId, errors] of guesserErrors) {
    // Need at least 2 predictions to compute meaningful std dev
    if (errors.length >= 2) {
      guesserStdDevs.push({
        guesserId,
        stdDev: standardDeviation(errors),
      });
    }
  }

  if (guesserStdDevs.length > 0) {
    // Robot: lowest std dev
    const robot = guesserStdDevs.reduce((min, g) =>
      g.stdDev < min.stdDev ? g : min
    );
    awards.push(
      makeAward(
        gameId,
        robot.guesserId,
        "robot",
        `Std dev: ${robot.stdDev.toFixed(4)}%`
      )
    );

    // Chaos Agent: highest std dev
    const chaos = guesserStdDevs.reduce((max, g) =>
      g.stdDev > max.stdDev ? g : max
    );
    awards.push(
      makeAward(
        gameId,
        chaos.guesserId,
        "chaos_agent",
        `Std dev: ${chaos.stdDev.toFixed(4)}%`
      )
    );
  }

  // --- Oracle: correctly flagged a DNF ---
  // A prediction has dnfBadge=true and score=50 (DNF Called) means the runner actually DNF'd.
  // We check for tierLabel or score to determine if the runner DNF'd.
  // Since we only have predictions here, we use: dnfBadge=true AND score=50 (DNF_BADGE_POINTS)
  const oracleGuessers = new Set<string>();
  for (const p of predictions) {
    if (p.dnfBadge && p.score === 50 && p.errorPercentage === null) {
      oracleGuessers.add(p.guesserId);
    }
  }

  for (const guesserId of oracleGuessers) {
    const guesser = guessers.find((g) => g.id === guesserId);
    awards.push(
      makeAward(
        gameId,
        guesserId,
        "oracle",
        guesser ? `${guesser.name} correctly called a DNF` : null
      )
    );
  }

  return awards;
}
