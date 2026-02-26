import { computeAwards } from "../awards";
import type { Guesser, Prediction, Runner } from "../types";

// Helper to create a scored prediction
function makePrediction(
  id: string,
  guesserId: string,
  runnerId: string,
  opts: {
    predictedTimeSeconds?: number;
    dnfBadge?: boolean;
    score?: number | null;
    errorPercentage?: number | null;
    tierLabel?: string | null;
  } = {}
): Prediction {
  return {
    id,
    guesserId,
    runnerId,
    predictedTimeSeconds: opts.predictedTimeSeconds ?? 10000,
    dnfBadge: opts.dnfBadge ?? false,
    score: opts.score ?? null,
    errorPercentage: opts.errorPercentage ?? null,
    tierLabel: opts.tierLabel ?? null,
    createdAt: "",
  };
}

function makeGuesser(id: string, name: string): Guesser {
  return {
    id,
    gameId: "game1",
    name,
    submittedAt: null,
    totalScore: null,
    rank: null,
    createdAt: "",
  };
}

describe("computeAwards", () => {
  const guessers = [
    makeGuesser("g1", "Alice"),
    makeGuesser("g2", "Bob"),
    makeGuesser("g3", "Carol"),
  ];

  it("awards Sniper to guesser with lowest single error", () => {
    const predictions = [
      makePrediction("p1", "g1", "r1", { errorPercentage: 2.0, score: 65 }),
      makePrediction("p2", "g1", "r2", { errorPercentage: 5.0, score: 35 }),
      makePrediction("p3", "g2", "r1", { errorPercentage: 0.5, score: 90 }),
      makePrediction("p4", "g2", "r2", { errorPercentage: 3.0, score: 50 }),
    ];

    const awards = computeAwards(predictions, guessers, "game1");
    const sniper = awards.find((a) => a.awardType === "sniper");
    expect(sniper).toBeDefined();
    expect(sniper!.guesserId).toBe("g2");
  });

  it("awards Trash Can to guesser with highest single error", () => {
    const predictions = [
      makePrediction("p1", "g1", "r1", { errorPercentage: 2.0, score: 65 }),
      makePrediction("p2", "g1", "r2", { errorPercentage: 15.0, score: 5 }),
      makePrediction("p3", "g2", "r1", { errorPercentage: 0.5, score: 90 }),
      makePrediction("p4", "g2", "r2", { errorPercentage: 3.0, score: 50 }),
    ];

    const awards = computeAwards(predictions, guessers, "game1");
    const trashCan = awards.find((a) => a.awardType === "trash_can");
    expect(trashCan).toBeDefined();
    expect(trashCan!.guesserId).toBe("g1");
  });

  it("awards Robot to guesser with lowest std dev", () => {
    const predictions = [
      // g1: errors 2.0, 2.5 → std dev ≈ 0.25
      makePrediction("p1", "g1", "r1", { errorPercentage: 2.0, score: 65 }),
      makePrediction("p2", "g1", "r2", { errorPercentage: 2.5, score: 65 }),
      // g2: errors 0.5, 10.0 → std dev ≈ 4.75
      makePrediction("p3", "g2", "r1", { errorPercentage: 0.5, score: 90 }),
      makePrediction("p4", "g2", "r2", { errorPercentage: 10.0, score: 10 }),
    ];

    const awards = computeAwards(predictions, guessers, "game1");
    const robot = awards.find((a) => a.awardType === "robot");
    expect(robot).toBeDefined();
    expect(robot!.guesserId).toBe("g1");
  });

  it("awards Chaos Agent to guesser with highest std dev", () => {
    const predictions = [
      makePrediction("p1", "g1", "r1", { errorPercentage: 2.0, score: 65 }),
      makePrediction("p2", "g1", "r2", { errorPercentage: 2.5, score: 65 }),
      makePrediction("p3", "g2", "r1", { errorPercentage: 0.5, score: 90 }),
      makePrediction("p4", "g2", "r2", { errorPercentage: 10.0, score: 10 }),
    ];

    const awards = computeAwards(predictions, guessers, "game1");
    const chaos = awards.find((a) => a.awardType === "chaos_agent");
    expect(chaos).toBeDefined();
    expect(chaos!.guesserId).toBe("g2");
  });

  it("awards Oracle to guessers who correctly flagged a DNF", () => {
    const predictions = [
      // g1 flagged runner r1 with DNF badge, runner actually DNF'd → score=50, errorPercentage=null
      makePrediction("p1", "g1", "r1", {
        dnfBadge: true,
        score: 50,
        errorPercentage: null,
        tierLabel: "DNF Called",
      }),
      // g2 did NOT flag runner r1 → score=0, errorPercentage=null
      makePrediction("p2", "g2", "r1", {
        dnfBadge: false,
        score: 0,
        errorPercentage: null,
        tierLabel: "DNF Missed",
      }),
      // g1 and g2 have normal predictions for r2
      makePrediction("p3", "g1", "r2", { errorPercentage: 3.0, score: 50 }),
      makePrediction("p4", "g2", "r2", { errorPercentage: 4.0, score: 35 }),
    ];

    const awards = computeAwards(predictions, guessers, "game1");
    const oracles = awards.filter((a) => a.awardType === "oracle");
    expect(oracles).toHaveLength(1);
    expect(oracles[0].guesserId).toBe("g1");
  });

  it("awards multiple Oracles if multiple guessers correctly flag DNF", () => {
    const predictions = [
      makePrediction("p1", "g1", "r1", {
        dnfBadge: true,
        score: 50,
        errorPercentage: null,
      }),
      makePrediction("p2", "g2", "r1", {
        dnfBadge: true,
        score: 50,
        errorPercentage: null,
      }),
      makePrediction("p3", "g1", "r2", { errorPercentage: 3.0, score: 50 }),
      makePrediction("p4", "g2", "r2", { errorPercentage: 4.0, score: 35 }),
    ];

    const awards = computeAwards(predictions, guessers, "game1");
    const oracles = awards.filter((a) => a.awardType === "oracle");
    expect(oracles).toHaveLength(2);
    const oracleIds = oracles.map((o) => o.guesserId).sort();
    expect(oracleIds).toEqual(["g1", "g2"]);
  });

  it("does not award Oracle for DNF badge when runner finished", () => {
    const predictions = [
      // g1 flagged with DNF badge but runner finished → score=65 (normal scoring), errorPercentage is set
      makePrediction("p1", "g1", "r1", {
        dnfBadge: true,
        score: 65,
        errorPercentage: 1.5,
      }),
      makePrediction("p2", "g1", "r2", { errorPercentage: 3.0, score: 50 }),
    ];

    const awards = computeAwards(predictions, guessers, "game1");
    const oracles = awards.filter((a) => a.awardType === "oracle");
    expect(oracles).toHaveLength(0);
  });

  it("handles Emily's worked example — Oracle for DNF call on Alice", () => {
    const emilyGuessers = [makeGuesser("emily", "Emily")];

    // Emily's predictions, already scored
    const predictions = [
      // Alice: DNF, Emily had badge → 50 points
      makePrediction("p1", "emily", "alice", {
        predictedTimeSeconds: 11700,
        dnfBadge: true,
        score: 50,
        errorPercentage: null,
        tierLabel: "DNF Called",
      }),
      // Bob: 65 points
      makePrediction("p2", "emily", "bob", {
        predictedTimeSeconds: 13500,
        dnfBadge: false,
        score: 65,
        errorPercentage: 1.2146,
        tierLabel: "Within 2%",
      }),
      // Carol: 65 points
      makePrediction("p3", "emily", "carol", {
        predictedTimeSeconds: 6120,
        dnfBadge: false,
        score: 65,
        errorPercentage: 1.4925,
        tierLabel: "Within 2%",
      }),
      // Dave: 50 points
      makePrediction("p4", "emily", "dave", {
        predictedTimeSeconds: 1410,
        dnfBadge: false,
        score: 50,
        errorPercentage: 2.4221,
        tierLabel: "Within 3%",
      }),
    ];

    const awards = computeAwards(predictions, emilyGuessers, "game1");
    const oracle = awards.find((a) => a.awardType === "oracle");
    expect(oracle).toBeDefined();
    expect(oracle!.guesserId).toBe("emily");
  });

  it("returns no awards when there are no predictions", () => {
    const awards = computeAwards([], guessers, "game1");
    expect(awards).toHaveLength(0);
  });
});

// Helper to create a finished runner with an actual time
function makeRunner(
  id: string,
  actualTimeSeconds: number,
  status: Runner["status"] = "finished"
): Runner {
  return {
    id,
    gameId: "game1",
    name: `Runner ${id}`,
    distance: "Full Marathon",
    notes: null,
    actualTimeSeconds,
    status,
    sortOrder: 0,
    athleteId: null,
    createdAt: "",
  };
}

describe("computeAwards — Optimist & Realist", () => {
  const guessers = [
    makeGuesser("g1", "Alice"),
    makeGuesser("g2", "Bob"),
    makeGuesser("g3", "Carol"),
  ];

  // r1: actual 10000s, r2: actual 12000s
  const runners = [
    makeRunner("r1", 10000),
    makeRunner("r2", 12000),
  ];

  it("awards Optimist to the guesser who consistently predicts faster times", () => {
    const predictions = [
      // g1: predicts under (faster) on both runners
      makePrediction("p1", "g1", "r1", { predictedTimeSeconds: 9000, errorPercentage: 10.0, score: 10 }),
      makePrediction("p2", "g1", "r2", { predictedTimeSeconds: 11000, errorPercentage: 8.3, score: 10 }),
      // g2: predicts over (slower) on both runners
      makePrediction("p3", "g2", "r1", { predictedTimeSeconds: 11000, errorPercentage: 10.0, score: 10 }),
      makePrediction("p4", "g2", "r2", { predictedTimeSeconds: 13000, errorPercentage: 8.3, score: 10 }),
    ];

    const awards = computeAwards(predictions, guessers, "game1", runners);
    const optimist = awards.find((a) => a.awardType === "optimist");
    expect(optimist).toBeDefined();
    expect(optimist!.guesserId).toBe("g1");
    expect(optimist!.detail).toBe("Predicted faster 2/2 times");
  });

  it("awards Realist to the guesser who consistently predicts slower times", () => {
    const predictions = [
      makePrediction("p1", "g1", "r1", { predictedTimeSeconds: 9000, errorPercentage: 10.0, score: 10 }),
      makePrediction("p2", "g1", "r2", { predictedTimeSeconds: 11000, errorPercentage: 8.3, score: 10 }),
      makePrediction("p3", "g2", "r1", { predictedTimeSeconds: 11000, errorPercentage: 10.0, score: 10 }),
      makePrediction("p4", "g2", "r2", { predictedTimeSeconds: 13000, errorPercentage: 8.3, score: 10 }),
    ];

    const awards = computeAwards(predictions, guessers, "game1", runners);
    const realist = awards.find((a) => a.awardType === "realist");
    expect(realist).toBeDefined();
    expect(realist!.guesserId).toBe("g2");
    expect(realist!.detail).toBe("Predicted slower 2/2 times");
  });

  it("does not award Optimist or Realist when a guesser has fewer than 2 qualified predictions", () => {
    const oneRunner = [makeRunner("r1", 10000)];
    const predictions = [
      makePrediction("p1", "g1", "r1", { predictedTimeSeconds: 9000, errorPercentage: 10.0, score: 10 }),
    ];

    const awards = computeAwards(predictions, guessers, "game1", oneRunner);
    expect(awards.find((a) => a.awardType === "optimist")).toBeUndefined();
    expect(awards.find((a) => a.awardType === "realist")).toBeUndefined();
  });

  it("does not award Optimist when a guesser has equal under/over predictions (no majority)", () => {
    const predictions = [
      // g1: 1 under, 1 over → tied, no majority
      makePrediction("p1", "g1", "r1", { predictedTimeSeconds: 9000, errorPercentage: 10.0, score: 10 }),
      makePrediction("p2", "g1", "r2", { predictedTimeSeconds: 13000, errorPercentage: 8.3, score: 10 }),
    ];

    const awards = computeAwards(predictions, guessers, "game1", runners);
    expect(awards.find((a) => a.awardType === "optimist")).toBeUndefined();
    expect(awards.find((a) => a.awardType === "realist")).toBeUndefined();
  });

  it("uses total underDelta as tiebreak when two guessers have the same under-ratio", () => {
    // 3 runners for a 2/3 ratio scenario
    const threeRunners = [
      makeRunner("r1", 10000),
      makeRunner("r2", 12000),
      makeRunner("r3", 8000),
    ];

    const predictions = [
      // g1: under on r1 by 500s, under on r2 by 500s, over on r3
      makePrediction("p1", "g1", "r1", { predictedTimeSeconds: 9500, errorPercentage: 5.0, score: 35 }),
      makePrediction("p2", "g1", "r2", { predictedTimeSeconds: 11500, errorPercentage: 4.2, score: 35 }),
      makePrediction("p3", "g1", "r3", { predictedTimeSeconds: 8500, errorPercentage: 6.3, score: 35 }),
      // g2: under on r1 by 2000s, under on r2 by 2000s, over on r3
      makePrediction("p4", "g2", "r1", { predictedTimeSeconds: 8000, errorPercentage: 20.0, score: 5 }),
      makePrediction("p5", "g2", "r2", { predictedTimeSeconds: 10000, errorPercentage: 16.7, score: 5 }),
      makePrediction("p6", "g2", "r3", { predictedTimeSeconds: 8500, errorPercentage: 6.3, score: 35 }),
    ];

    const awards = computeAwards(predictions, guessers, "game1", threeRunners);
    const optimist = awards.find((a) => a.awardType === "optimist");
    expect(optimist).toBeDefined();
    // g2 wins tiebreak: both are 2/3 under, but g2's total underDelta (2000+2000=4000) > g1's (500+500=1000)
    expect(optimist!.guesserId).toBe("g2");
  });

  it("excludes DNF/DNS predictions (errorPercentage=null) from over/under calculation", () => {
    const predictions = [
      // g1: 1 real under-prediction + 1 DNF prediction (should not count toward over/under)
      makePrediction("p1", "g1", "r1", { predictedTimeSeconds: 9000, errorPercentage: 10.0, score: 10 }),
      makePrediction("p2", "g1", "r2", { predictedTimeSeconds: 10000, dnfBadge: true, score: 50, errorPercentage: null }),
    ];

    const awards = computeAwards(predictions, guessers, "game1", runners);
    // Only 1 qualified prediction for g1 (the DNF is excluded), so no Optimist/Realist
    expect(awards.find((a) => a.awardType === "optimist")).toBeUndefined();
    expect(awards.find((a) => a.awardType === "realist")).toBeUndefined();
  });

  it("does not award Optimist or Realist when no runners are passed", () => {
    const predictions = [
      makePrediction("p1", "g1", "r1", { predictedTimeSeconds: 9000, errorPercentage: 10.0, score: 10 }),
      makePrediction("p2", "g1", "r2", { predictedTimeSeconds: 11000, errorPercentage: 8.3, score: 10 }),
    ];

    // No runners → default behavior (backward compat with existing callers)
    const awards = computeAwards(predictions, guessers, "game1");
    expect(awards.find((a) => a.awardType === "optimist")).toBeUndefined();
    expect(awards.find((a) => a.awardType === "realist")).toBeUndefined();
  });
});
