import type { Award, AwardType, Guesser, Prediction, Runner } from "./types";

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
  gameId: string,
  runners: Runner[] = []
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

  // --- Optimist & Realist: over/under prediction direction ---

  // Build map of runnerId → actualTimeSeconds for finished runners only
  const runnerActualMap = new Map<string, number>();
  for (const r of runners) {
    if (r.status === "finished" && r.actualTimeSeconds !== null) {
      runnerActualMap.set(r.id, r.actualTimeSeconds);
    }
  }

  const MIN_QUALIFIED = 2;

  type BiasStats = {
    under: number;
    over: number;
    total: number;
    underDelta: number;
    overDelta: number;
  };
  const guesserBias = new Map<string, BiasStats>();

  for (const pred of predictions) {
    if (pred.errorPercentage === null) continue; // skip DNF/DNS predictions
    const actual = runnerActualMap.get(pred.runnerId);
    if (actual === undefined) continue; // runner not finished or not in our map

    if (!guesserBias.has(pred.guesserId)) {
      guesserBias.set(pred.guesserId, { under: 0, over: 0, total: 0, underDelta: 0, overDelta: 0 });
    }
    const b = guesserBias.get(pred.guesserId)!;
    const delta = pred.predictedTimeSeconds - actual;
    b.total++;
    if (delta < 0) {
      // Predicted a faster time than actual → Optimist tendency
      b.under++;
      b.underDelta += Math.abs(delta);
    } else if (delta > 0) {
      // Predicted a slower time than actual → Realist tendency
      b.over++;
      b.overDelta += delta;
    }
    // delta === 0 (exact match): neutral — counted in total but neither bucket
  }

  const eligible = [...guesserBias.entries()].filter(([, b]) => b.total >= MIN_QUALIFIED);

  if (eligible.length > 0) {
    // Optimist: guesser who most consistently predicted faster (majority must be under-predictions)
    // Tiebreak: largest aggregate underDelta (most aggressively optimistic in total seconds)
    const optimistPool = eligible
      .filter(([, b]) => b.under > b.over)
      .sort(([, a], [, b]) => {
        const rDiff = b.under / b.total - a.under / a.total;
        return rDiff !== 0 ? rDiff : b.underDelta - a.underDelta;
      });

    if (optimistPool.length > 0) {
      const [guesserId, b] = optimistPool[0];
      awards.push(
        makeAward(gameId, guesserId, "optimist", `Predicted faster ${b.under}/${b.total} times`)
      );
    }

    // Realist: guesser who most consistently predicted slower (majority must be over-predictions)
    // Tiebreak: largest aggregate overDelta
    const realistPool = eligible
      .filter(([, b]) => b.over > b.under)
      .sort(([, a], [, b]) => {
        const rDiff = b.over / b.total - a.over / a.total;
        return rDiff !== 0 ? rDiff : b.overDelta - a.overDelta;
      });

    if (realistPool.length > 0) {
      const [guesserId, b] = realistPool[0];
      awards.push(
        makeAward(gameId, guesserId, "realist", `Predicted slower ${b.over}/${b.total} times`)
      );
    }
  }

  return awards;
}
