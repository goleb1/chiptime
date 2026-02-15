import { computeAwards } from "../awards";
import type { Guesser, Prediction } from "../types";

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
