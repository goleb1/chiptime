# ChipTime — Future Ideas & Feature Backlog

**Last updated:** February 2026
**Purpose:** Capture all ideas, features, and enhancements deferred from the MVP. Nothing here is committed — it's an idea log to revisit as the product evolves.

---

## Scoring & Game Mechanics

### Confidence Weighting
Allow guessers to assign confidence levels to predictions (like NFL confidence pools). Higher confidence = more points if correct, more risk if wrong. Adds strategic depth but risks overcomplicating the submission process. Consider as an optional "advanced mode" toggle.

### Runner Popularity Weighting
Weight points based on how many guessers predicted a given runner. Nailing the time of someone only 3 people predicted is more impressive than nailing a popular runner. Interesting at scale, not needed for a small group.

### Average Scoring Mode
If the game scales to where guessers have uneven prediction counts (e.g., optional predictions), switch the leaderboard from total score to average points per prediction. Needed if partial sheets are ever allowed.

### Self-Prediction Prevention
Build mechanics to detect and handle guesser/runner overlap, potentially using average scoring to normalize uneven prediction counts. Could flag or exclude a guesser's prediction of themselves from scoring.

### Scoring Tier Tuning
The current tiers (0%, 0.5%, 1%, 2%, 3%, 5%, 8%, 12%) are a starting point. After a few games, analyze real data to determine if the distribution feels right. May need to adjust thresholds or point values.

---

## Awards & Recognition

### Over/Under Awards
Awards for the guesser who most consistently guesses faster or slower than actual. "The Optimist" (always guesses fast) and "The Realist" (always guesses slow). Cut from v1 to keep the award set tight at 5.

### Season-Long Leaderboard
Aggregate scores across multiple race weekends for an annual champion. Requires persistent guesser identity (accounts or consistent name matching). Would be a major engagement driver for repeat play.

### Historical Awards
Track career stats across multiple games — "Most Games Played," "Lifetime Sniper Count," "Most Improved Predictor," etc.

### Custom Awards
Let the admin create one-off awards for a specific game (e.g., "Best Marathon Predictor" or "Worst 5K Take").

---

## Guesser Experience

### User Accounts & Authentication
Full account system with email/password or social login. Enables persistent identity, prediction history, and season-long tracking. Major architectural shift — only pursue if there's demand beyond a single running club.

### Prediction Visibility After Submission
After submitting your own predictions, option to browse other guessers' picks (before the deadline). Adds social fun without influencing predictions since yours are already locked.

### Head-to-Head Comparison View
Side-by-side comparison of two guessers' predictions and scores. "You vs. them" breakdown by runner. Great for trash talk content.

### Shareable Image / Graphic Cards
Auto-generated social media graphics showing final standings, award winners, best/worst picks. Instagram story format, Twitter card format. Would drive organic sharing.

### Guesser Prediction History
Show a guesser their own track record across multiple games. "Your average error is 3.2%," "You're best at predicting marathons," etc.

### Push Notifications
Notify guessers when: prediction deadline is approaching, results are being entered (live updates), final leaderboard is published. Requires accounts or at minimum email/phone collection.

---

## Runner Information & Integration

### Strava Integration
Pull runner data from Strava API to display on the prediction form — recent activities, training volume, race history. Helps casual guessers who don't follow everyone's training. Could show: last 4 weeks of mileage, most recent race result, weekly training pace. **Privacy consideration:** runners would need to opt in to sharing their Strava data.

### Race Results API Integration
Auto-populate actual finish times from official race results feeds instead of manual admin entry. Would need to handle: different result formats, timing delays, chip vs. gun time selection. Research: RunSignUp API, Athlinks API, MTEC Results.

---

## Admin & Operations

### Multi-Admin Support
Allow multiple people to administer a game. Useful if the person organizing the game isn't available on race day to enter results.

### Bulk Runner Import (CSV)
Upload a CSV of runners (name, distance) for larger games. Useful if expanding beyond small club events.

### Cropping in photo add
Ability to crop and see circular overlay preview when uploading an athlete image.

### Result Entry from Mobile
Optimized admin interface for entering results on a phone at the finish line. Quick-entry mode: tap runner name, enter time, save, next.

### Game Cloning
Duplicate a past game's setup (runners, distances) for a new race weekend. Saves setup time for recurring events (e.g., same club does Pittsburgh Marathon every year).

---

## Platform & Scale

### Multi-Group / Multi-Club Support
Allow other running clubs or friend groups to create their own ChipTime games independently. Requires: user accounts, game ownership, potentially separate namespaces. This is the "platform" version of ChipTime.

### Embeddable Leaderboard Widget
An embeddable iframe or web component that running clubs could add to their own websites to display the live leaderboard.

### Real-Time WebSocket Leaderboard
Replace 30-second polling with true real-time updates via Supabase Realtime or WebSockets. Leaderboard updates instantly as admin enters each result. Premium feel.

### Native Mobile App
If the web app gains traction, a React Native or PWA version for native mobile experience. Push notifications, offline draft saving, better drum picker performance.

---

## Fun & Social

### Prediction Reveal Ceremony
After the deadline, a dramatic "reveal" animation showing all guessers' predictions for each runner. Build suspense before results come in.

### Trash Talk Feed
A simple comment/reaction system on the leaderboard. "😂" react to someone's terrible prediction. Keep it lightweight — emoji reactions only, not full comments.

### "The Tape" — Highlight Reel
Auto-generated post-game summary: best prediction, worst prediction, biggest upset, closest race on the leaderboard. Could be formatted as a shareable narrative or newsletter snippet.

### Prediction Streaks
Track consecutive games where a guesser places in the top 3, or consecutive "Within 1%" predictions. Adds a loyalty/engagement mechanic.

---

## Technical Debt & Infrastructure

### Migrate Draft Storage to Server
Move draft auto-save from localStorage to Supabase so drafts persist across devices. Requires some form of guesser identity (even just a browser fingerprint or session token).

### Comprehensive Test Suite
Unit tests for scoring engine, integration tests for API routes, end-to-end tests for critical flows (submit predictions, enter results, view leaderboard).

### Analytics
Track: number of games created, guessers per game, prediction completion rates, leaderboard views. Helps understand usage patterns for prioritizing features.

---

*This document is a living backlog. Add ideas as they come up. Prioritize based on user feedback after the MVP launches.*
