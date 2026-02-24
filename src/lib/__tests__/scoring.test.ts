import {
  calculateErrorPercentage,
  scorePrediction,
  scoreDnf,
  scoreGuesser,
} from "../scoring";
import type { Prediction, Runner } from "../types";

describe("calculateErrorPercentage", () => {
  it("returns 0 for exact match", () => {
    expect(calculateErrorPercentage(12240, 12240)).toBe(0);
  });

  it("calculates correctly for the worked example (Bob)", () => {
    // Predicted 3:45:00 (13500s), Actual 3:42:18 (13338s)
    const predicted = 3 * 3600 + 45 * 60; // 13500
    const actual = 3 * 3600 + 42 * 60 + 18; // 13338
    const error = calculateErrorPercentage(predicted, actual);
    // |13500 - 13338| / 13338 * 100 = 162/13338*100 ≈ 1.2146%
    expect(error).toBeCloseTo(1.2146, 2);
  });

  it("calculates correctly for the worked example (Carol)", () => {
    // Predicted 1:42:00 (6120s), Actual 1:40:30 (6030s)
    const predicted = 1 * 3600 + 42 * 60; // 6120
    const actual = 1 * 3600 + 40 * 60 + 30; // 6030
    const error = calculateErrorPercentage(predicted, actual);
    // |6120 - 6030| / 6030 * 100 = 90/6030*100 ≈ 1.4925%
    expect(error).toBeCloseTo(1.4925, 2);
  });

  it("calculates correctly for the worked example (Dave)", () => {
    // Predicted 23:30 (1410s), Actual 24:05 (1445s)
    const predicted = 23 * 60 + 30; // 1410
    const actual = 24 * 60 + 5; // 1445
    const error = calculateErrorPercentage(predicted, actual);
    // |1410 - 1445| / 1445 * 100 = 35/1445*100 ≈ 2.4221%
    expect(error).toBeCloseTo(2.4221, 2);
  });

  it("is symmetric (over vs under doesn't matter)", () => {
    const over = calculateErrorPercentage(110, 100);
    const under = calculateErrorPercentage(90, 100);
    expect(over).toBe(under);
  });

  it("throws for zero actual time", () => {
    expect(() => calculateErrorPercentage(100, 0)).toThrow();
  });

  it("throws for negative actual time", () => {
    expect(() => calculateErrorPercentage(100, -1)).toThrow();
  });
});

describe("scorePrediction", () => {
  it("scores exact match as Dead on (100 points)", () => {
    const result = scorePrediction(12240, 12240);
    expect(result.score).toBe(100);
    expect(result.errorPercentage).toBe(0);
    expect(result.tierLabel).toBe("Dead on");
  });

  it("scores within 0.5% as 90 points", () => {
    // 0.3% error on a 10000s time = 30s off
    const result = scorePrediction(10030, 10000);
    expect(result.score).toBe(90);
    expect(result.tierLabel).toBe("Within 0.5%");
  });

  it("scores within 1% as 80 points", () => {
    // 0.8% error on 10000s = 80s off
    const result = scorePrediction(10080, 10000);
    expect(result.score).toBe(80);
    expect(result.tierLabel).toBe("Within 1%");
  });

  it("scores Bob from worked example as Within 2% (65 points)", () => {
    const predicted = 3 * 3600 + 45 * 60; // 13500
    const actual = 3 * 3600 + 42 * 60 + 18; // 13338
    const result = scorePrediction(predicted, actual);
    expect(result.score).toBe(65);
    expect(result.tierLabel).toBe("Within 2%");
  });

  it("scores Carol from worked example as Within 2% (65 points)", () => {
    const predicted = 1 * 3600 + 42 * 60; // 6120
    const actual = 1 * 3600 + 40 * 60 + 30; // 6030
    const result = scorePrediction(predicted, actual);
    expect(result.score).toBe(65);
    expect(result.tierLabel).toBe("Within 2%");
  });

  it("scores Dave from worked example as Within 3% (50 points)", () => {
    const predicted = 23 * 60 + 30; // 1410
    const actual = 24 * 60 + 5; // 1445
    const result = scorePrediction(predicted, actual);
    expect(result.score).toBe(50);
    expect(result.tierLabel).toBe("Within 3%");
  });

  it("scores within 5% as 35 points", () => {
    // 4% error on 10000s = 400s off
    const result = scorePrediction(10400, 10000);
    expect(result.score).toBe(35);
    expect(result.tierLabel).toBe("Within 5%");
  });

  it("scores within 8% as 20 points", () => {
    // 7% error on 10000s = 700s off
    const result = scorePrediction(10700, 10000);
    expect(result.score).toBe(20);
    expect(result.tierLabel).toBe("Within 8%");
  });

  it("scores within 12% as 10 points", () => {
    // 11% error on 10000s = 1100s off
    const result = scorePrediction(11100, 10000);
    expect(result.score).toBe(10);
    expect(result.tierLabel).toBe("Within 12%");
  });

  it("scores beyond 12% as 5 points", () => {
    // 50% error
    const result = scorePrediction(15000, 10000);
    expect(result.score).toBe(5);
    expect(result.tierLabel).toBe("Beyond 12%");
  });

  it("scores boundary at exactly 0.5% as Within 0.5%", () => {
    // Exactly 0.5% of 10000 = 50
    const result = scorePrediction(10050, 10000);
    expect(result.score).toBe(90);
    expect(result.tierLabel).toBe("Within 0.5%");
  });

  it("scores boundary at exactly 3% as Within 3%", () => {
    const result = scorePrediction(10300, 10000);
    expect(result.score).toBe(50);
    expect(result.tierLabel).toBe("Within 3%");
  });
});

describe("scoreDnf", () => {
  it("scores DNF with badge as 50 points", () => {
    const result = scoreDnf(true);
    expect(result.score).toBe(50);
    expect(result.errorPercentage).toBeNull();
    expect(result.tierLabel).toBe("DNF Called");
  });

  it("scores DNF without badge as 0 points", () => {
    const result = scoreDnf(false);
    expect(result.score).toBe(0);
    expect(result.errorPercentage).toBeNull();
    expect(result.tierLabel).toBe("DNF Missed");
  });
});

describe("scoreGuesser", () => {
  // Worked example from game spec: Emily's predictions
  const runners: Runner[] = [
    {
      id: "alice",
      gameId: "g1",
      name: "Alice",
      distance: "Full Marathon",
      notes: null,
      actualTimeSeconds: null,
      status: "dnf",
      sortOrder: 0,
      athleteId: null,
      createdAt: "",
    },
    {
      id: "bob",
      gameId: "g1",
      name: "Bob",
      distance: "Full Marathon",
      notes: null,
      actualTimeSeconds: 13338, // 3:42:18
      status: "finished",
      sortOrder: 1,
      athleteId: null,
      createdAt: "",
    },
    {
      id: "carol",
      gameId: "g1",
      name: "Carol",
      distance: "Half Marathon",
      notes: null,
      actualTimeSeconds: 6030, // 1:40:30
      status: "finished",
      sortOrder: 2,
      athleteId: null,
      createdAt: "",
    },
    {
      id: "dave",
      gameId: "g1",
      name: "Dave",
      distance: "5K",
      notes: null,
      actualTimeSeconds: 1445, // 24:05
      status: "finished",
      sortOrder: 3,
      athleteId: null,
      createdAt: "",
    },
  ];

  const predictions: Prediction[] = [
    {
      id: "p1",
      guesserId: "emily",
      runnerId: "alice",
      predictedTimeSeconds: 11700, // 3:15:00
      dnfBadge: true,
      score: null,
      errorPercentage: null,
      tierLabel: null,
      createdAt: "",
    },
    {
      id: "p2",
      guesserId: "emily",
      runnerId: "bob",
      predictedTimeSeconds: 13500, // 3:45:00
      dnfBadge: false,
      score: null,
      errorPercentage: null,
      tierLabel: null,
      createdAt: "",
    },
    {
      id: "p3",
      guesserId: "emily",
      runnerId: "carol",
      predictedTimeSeconds: 6120, // 1:42:00
      dnfBadge: false,
      score: null,
      errorPercentage: null,
      tierLabel: null,
      createdAt: "",
    },
    {
      id: "p4",
      guesserId: "emily",
      runnerId: "dave",
      predictedTimeSeconds: 1410, // 23:30
      dnfBadge: false,
      score: null,
      errorPercentage: null,
      tierLabel: null,
      createdAt: "",
    },
  ];

  it("scores Emily's total as 230 points (worked example)", () => {
    const result = scoreGuesser(predictions, runners);
    // Alice: DNF w/ badge = 50
    // Bob: Within 2% = 65
    // Carol: Within 2% = 65
    // Dave: Within 3% = 50
    // Total = 230
    expect(result.totalScore).toBe(230);
  });

  it("returns correct guesser ID", () => {
    const result = scoreGuesser(predictions, runners);
    expect(result.guesserId).toBe("emily");
  });

  it("identifies best error percentage (Bob at ~1.21%)", () => {
    const result = scoreGuesser(predictions, runners);
    // Bob's error is the lowest among scored predictions
    expect(result.bestErrorPercentage).toBeCloseTo(1.2146, 2);
  });

  it("has 4 prediction scores", () => {
    const result = scoreGuesser(predictions, runners);
    expect(result.predictionScores).toHaveLength(4);
  });

  it("skips runners with no result yet", () => {
    const runnersWithPending: Runner[] = [
      ...runners,
      {
        id: "eve",
        gameId: "g1",
        name: "Eve",
        distance: "10K",
        notes: null,
        actualTimeSeconds: null,
        status: "registered",
        sortOrder: 4,
        athleteId: null,
        createdAt: "",
      },
    ];

    const predictionsWithPending: Prediction[] = [
      ...predictions,
      {
        id: "p5",
        guesserId: "emily",
        runnerId: "eve",
        predictedTimeSeconds: 3000,
        dnfBadge: false,
        score: null,
        errorPercentage: null,
        tierLabel: null,
        createdAt: "",
      },
    ];

    const result = scoreGuesser(predictionsWithPending, runnersWithPending);
    // Should still be 230 — Eve's prediction is not scored
    expect(result.totalScore).toBe(230);
    expect(result.predictionScores).toHaveLength(4);
  });
});
