# ChipTime — Game Design Specification

**chiptime.app**
**Version 1.0 — February 2025**
*DRAFT — Subject to Testing & Iteration*

---

## 1. Overview

ChipTime turns the tradition of guessing your friends' race times into a structured, scored prediction game. Guessers predict finish times for runners competing in a race weekend, and the most accurate predictor wins bragging rights (and maybe a trophy that's slightly too large for the achievement).

The game is designed to be **simple enough to explain in 30 seconds**, fun enough to spark trash talk, and fair across different race distances.

### 1.1 Design Principles

- **Friendship over competition** — the game should bring people together, not create hurt feelings about pace predictions
- **Knowledge over luck** — this rewards knowing your friends' fitness, not random guessing
- **Simplicity over optimization** — if a rule needs a paragraph to explain, it's probably too complicated
- **Distance-agnostic fairness** — predicting a marathon and predicting a 5K should be equally valuable and equally difficult to score well on

### 1.2 Key Terms

- **Guesser**: A person making predictions. Does not need to be a club member or a runner in the race.
- **Runner**: A person being predicted. Registered for and competing in a race event.
- **Race Weekend**: A single competition instance (e.g., Pittsburgh Marathon 2025). May include multiple distances (full, half, 5K, etc.) all scored on one leaderboard.
- **Prediction Sheet**: A guesser's complete set of time predictions for all runners in a race weekend.

---

## 2. Participants

Guessers and runners are separate pools with potential overlap. The game is open to anyone.

### 2.1 Guessers

- Anyone can be a guesser — club members, friends, family, rivals.
- **All guessers must predict all runners.** No cherry-picking only the runners you know well. If you're playing, you're predicting everyone.
- This maximizes engagement and ensures the leaderboard is an apples-to-apples comparison.

### 2.2 Runners

- Runners are the people being predicted. They are added to the game by an admin before predictions open.
- Runners may compete in different distances within the same race weekend (e.g., some run the full, others the half). All predictions are scored on one unified leaderboard.
- Runners do not need to be guessers, and guessers do not need to be runners.

### 2.3 Overlap Rule

For v1, we are not building mechanics to prevent self-prediction. If a guesser is also a runner in the same race, they still predict a time for themselves. This keeps the system simple and avoids fairness complications around uneven prediction counts. This may be revisited in future versions.

---

## 3. Predictions

### 3.1 What You Submit

Each guesser submits the following for every runner in the race weekend:

1. **A finish time prediction** (e.g., 3:12:45, 1:28:30, 22:15)
2. **Optional: A DNF Risk badge** on up to 2 runners (see Section 6 for details)

### 3.2 Prediction Rules

- Predictions are submitted before a locked deadline (typically the night before the race).
- Every guesser must predict every runner. No partial sheets.
- You must always submit a time, even if you also tag someone with a DNF Risk badge. The time is your prediction if they finish; the badge is your hedge if they don't.
- Predictions cannot be modified after the deadline.

---

## 4. Core Scoring Mechanic

The game uses **percentage-based accuracy** to normalize scoring across different race distances. This is the foundational design decision that makes the entire game work.

### 4.1 Why Percentage, Not Raw Time

If we scored on raw time difference, marathon predictions would be inherently easier. Being 3 minutes off a 3:30:00 marathon is a much better guess than being 3 minutes off a 1:30:00 half marathon. Percentage error normalizes this naturally — the same quality of guess produces the same score regardless of distance.

### 4.2 The Formula

> **Percentage Error = |Predicted Time − Actual Time| ÷ Actual Time × 100**

Scoring uses absolute difference — there is no penalty for guessing over vs. under. This prevents skewing guessers' behavior in one direction.

**Example:** You predict 3:24:00 (204 min) for a runner who finishes in 3:30:00 (210 min). Your error is |204 − 210| ÷ 210 × 100 = 2.86%. This lands in the "Good guess" tier for 65 points.

### 4.3 Scoring Tiers

Each prediction is scored on a 100-point scale based on your percentage error:

| Accuracy Tier | Points | What It Means |
|---|---|---|
| Dead on (0%) | 100 | 🐐 You nailed it. Absolute wizard status. |
| Within 0.5% | 90 | Elite-level knowledge of your friend's fitness. |
| Within 1% | 80 | Really solid guess. You clearly pay attention. |
| Within 2% | 65 | Good, informed prediction. |
| Within 3% | 50 | Decent. In the right neighborhood. |
| Within 5% | 35 | Ballpark. At least you showed up. |
| Within 8% | 20 | Generous participation energy. |
| Within 12% | 10 | Were you even paying attention? |
| Beyond 12% | 5 | Participation points. Thanks for playing. |

> *Note: These tiers are a starting point and will be tuned through testing.*

### 4.4 What This Looks Like in Real Terms

To ground the percentage tiers in tangible terms, here's what each accuracy level means across common race distances:

| Distance (Example Time) | Within 2% | Within 1% | Within 0.5% | Dead On (~0.1%) |
|---|---|---|---|---|
| Marathon (3:30) | ~4:12 | ~2:06 | ~1:24 | ~42 sec |
| Half (1:35) | ~1:54 | ~57 sec | ~38 sec | ~19 sec |
| 10K (45:00) | ~54 sec | ~27 sec | ~18 sec | ~9 sec |
| 5K (22:00) | ~26 sec | ~13 sec | ~9 sec | ~4 sec |
| Mile (6:00) | ~7 sec | ~4 sec | ~2 sec | ~1 sec |

> *These feel intuitively correct — being ~4 minutes off on a marathon, ~2 minutes off on a half, and ~26 seconds off on a 5K are all roughly equivalent "good guesses."*

### 4.5 Why Tiers Instead of a Continuous Formula

Tiers are simpler to understand, easier to explain, and create natural breakpoints that feel like real distinctions. Nobody argues over 67 vs. 68 points. They argue over whether they landed in the "good guess" tier or the "decent" tier — and that's more fun.

---

## 5. Leaderboard

### 5.1 Primary Ranking

- **Total Score** = sum of points across all runner predictions.
- Since all guessers predict all runners, everyone has the same number of predictions, so raw totals are a fair comparison.

### 5.2 Tiebreaker

If two or more guessers have the same total score, the tie is broken by **best single prediction** (lowest percentage error on any individual runner). Whoever had the single most accurate guess wins the tiebreaker.

If still tied after tiebreaker: co-champions. We're not going deeper than that.

### 5.3 Leaderboard Display

The leaderboard shows each guesser's total score, rank, and any side award badges they've earned (displayed as icons next to their name). During live race tracking, the leaderboard updates in real-time as runners cross the finish line.

---

## 6. DNF Handling

DNFs (Did Not Finish) and DNS (Did Not Start) are realities of racing. The game handles them gracefully without making it feel mean-spirited.

### 6.1 DNF Risk Badges

- **Each guesser gets 2 DNF Risk badges** per race weekend.
- When submitting predictions, you may tag up to 2 runners with a DNF Risk badge *in addition to* your time guess.
- **You always submit a time prediction**, even for runners you badge. The badge is a hedge, not a replacement for your guess.

### 6.2 How DNF Scoring Works

- **Runner finishes the race:** Your time prediction is scored normally. The DNF Risk badge is ignored — no penalty for using it.
- **Runner DNFs/DNS without a badge:** You receive 0 points for that runner.
- **Runner DNFs/DNS with your badge:** You receive 50 points (equivalent to the "decent" tier). You correctly identified the risk.

### 6.3 Design Rationale

The DNF Risk badge is a hedge, not a mean-spirited "I think you're going to blow up" declaration. You're protecting your own score while still submitting an optimistic time guess. The 50-point reward is meaningful but not game-breaking — it's equivalent to a decent guess, not a perfect one.

> *Tuning note: The number of badges per guesser (currently 2) may be adjusted based on race size. Smaller races with fewer runners might warrant only 1 badge; larger fields might allow 3.*

---

## 7. Side Awards

Side awards are badges displayed on the leaderboard next to a guesser's name. They are not exclusive — one person can earn multiple awards in the same game.

| Icon | Award | Criteria |
|---|---|---|
| 🎯 | **Sniper** | Closest single prediction across the entire game (lowest percentage error on any one runner). One winner per game. |
| 🗑️ | **Trash Can** | Worst single prediction across the entire game (highest percentage error on any one runner). One winner per game. |
| 🤖 | **The Robot** | Most consistent predictor — lowest standard deviation across all predictions. Your guesses were all similarly accurate. One winner per game. |
| 🎢 | **Chaos Agent** | Highest standard deviation across all predictions. One brilliant pick, one disaster. One winner per game. |
| 🔮 | **Oracle** | Correctly flagged a runner for DNF using a DNF Risk badge. Awarded to anyone who hits a DNF call — multiple winners possible. |

---

## 8. Game Flow

### 8.1 Setup Phase (Admin)

1. Admin creates a new game for a specific race weekend (e.g., "Pittsburgh Marathon 2025").
2. Admin adds runners to the game, specifying each runner's name and which distance/event they are competing in.
3. Admin sets the prediction deadline.
4. Admin opens the game for predictions.

### 8.2 Prediction Phase (Guessers)

1. Guessers access the game and see the full list of runners with their registered distances.
2. Each guesser submits a finish time prediction for every runner.
3. Each guesser optionally assigns up to 2 DNF Risk badges.
4. Predictions lock at the deadline. No changes after lock.

### 8.3 Race Day

1. As runners finish, their actual times are entered into the system (manually by admin or via race results integration in future versions).
2. The leaderboard updates in real-time as results come in.
3. Any DNS/DNF runners are marked accordingly, triggering badge scoring.

### 8.4 Post-Race

- Final leaderboard is published with total scores, rankings, and side award badges.
- Bragging commences. Trash talk is encouraged.

---

## 9. Edge Cases & Rulings

- **Runner changes distance after predictions lock:** Predictions for that runner are voided. Everyone receives 0 points for them. (This is rare but should be handled.)
- **Runner is added after predictions open:** Only guessers who submitted before the runner was added are exempt from predicting them. All subsequent guessers must include the new runner.
- **Race is cancelled:** Game is voided. No scores, no awards, no hard feelings.
- **Chip time vs. gun time:** Use official chip time (net time) as the actual result. This is the time the runner earned.
- **Runner finishes but time is disputed/corrected:** Use the final official result once published by the race organization.

---

## 10. Future Considerations

These are ideas that surfaced during design but are intentionally deferred. They're documented here for future reference, not current implementation.

- **Average scoring mode:** If the game scales to where guessers have uneven prediction counts (e.g., optional predictions), switch the leaderboard from total score to average points per prediction.
- **Confidence weighting:** Allow guessers to assign confidence levels to predictions (like NFL confidence pools). Could add strategic depth but risks overcomplicating the submission process.
- **Runner popularity weighting:** Weight points based on how many guessers predicted a given runner. Nailing the time of someone only 3 people predicted is more impressive than nailing a popular runner. Interesting at scale, not needed for a small club.
- **Self-prediction prevention:** Build mechanics to detect and handle guesser/runner overlap, potentially using average scoring to normalize uneven prediction counts.
- **Race results API integration:** Auto-populate actual finish times from official race results feeds instead of manual admin entry.
- **Over/Under awards:** Awards for the guesser who most consistently guesses faster or slower than actual. Cut from v1 to keep the award set tight at 5, but could be added later.
- **Season-long leaderboard:** Aggregate scores across multiple race weekends for an annual champion.

---

## Appendix: Worked Example

**Race Weekend:** Pittsburgh Marathon 2025
**Runners:** Alice (Full Marathon), Bob (Full Marathon), Carol (Half Marathon), Dave (5K)
**Guesser:** Emily

**Emily's Predictions:**
- Alice (Full): 3:15:00 — DNF Risk badge applied
- Bob (Full): 3:45:00
- Carol (Half): 1:42:00
- Dave (5K): 23:30

**Actual Results:**
- Alice: DNF at mile 22
- Bob: 3:42:18
- Carol: 1:40:30
- Dave: 24:05

**Emily's Scoring:**

- **Alice:** DNF — Emily applied a DNF Risk badge → **50 points**
- **Bob:** Predicted 3:45:00 (225 min), Actual 3:42:18 (222.3 min). Error = |225 − 222.3| ÷ 222.3 = 1.21%. Within 2% → **65 points**
- **Carol:** Predicted 1:42:00 (102 min), Actual 1:40:30 (100.5 min). Error = |102 − 100.5| ÷ 100.5 = 1.49%. Within 2% → **65 points**
- **Dave:** Predicted 23:30 (23.5 min), Actual 24:05 (24.08 min). Error = |23.5 − 24.08| ÷ 24.08 = 2.41%. Within 3% → **50 points**

**Emily's Total: 50 + 65 + 65 + 50 = 230 points**

*Emily's best single pick: Bob at 1.21% error (candidate for Sniper award)*
*Emily earned: 🔮 Oracle badge (correctly flagged Alice's DNF)*
