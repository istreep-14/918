# Chess.com → Google Sheets Pipeline (Apps Script)

## Quick start

1. Create a new Apps Script project and upload all files in `src/` plus `appsscript.json`.
2. In `initSetup`, pass your Chess.com username (single user) and run the function once.
3. Run `fetchAndStoreProfile()` to capture profile + join date.
4. Run `backfillAllArchives()` to backfill history (20k games scale supported via chunking and ETags).
5. For daily use, set time-driven triggers for:
   - `incrementalIngestActiveMonths` (e.g., every 15 minutes)
   - `refreshDailyTotalsActive` (e.g., hourly)
   - `fetchAndAppendPlayerStats` (e.g., 2–6 times/day)
   - `processCallbacksBatch` (e.g., every 15 minutes)

## Entry points
- `initSetup(username)`
- `backfillAllArchives()`
- `incrementalIngestActiveMonths()`
- `refreshDailyTotalsActive()`
- `enqueueCallbacksForRecentGames(limit)`
- `processCallbacksBatch(maxBatch)`
- `fetchAndStoreProfile()`
- `fetchAndAppendPlayerStats()`
- `monthlyRollover()`

## Notes
- Timezone: America/New_York. All dates based on end_time for daily totals; continuous date sequence.
- Uniqueness key: url.
- Variants included: bullet, blitz, rapid, daily, 960 variants, threecheck, kingofthehill, bughouse, crazyhouse. Daily totals currently focus on bullet/blitz/rapid/daily and overall.
- Callbacks: Unofficial endpoints; handled in small batches with time-limits and progress logging. Rating exactness updates the `rating_is_exact` flag and `player.rating_change` when available.
- Performance: Batch writes, ETags, dedupe, per-month spreadsheets for archives, active mirror for quick pulls.
- Analysis: `AnalysisQueue`/`AnalysisResults` placeholders exist; no logic implemented yet.