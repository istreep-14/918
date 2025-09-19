Workflow (Option B)

1) Configure
   - Edit `CONFIG.gs` → `CONFIG.username`, `timezone`, `projectName`.
   - Run `applyConfigToProperties()`.

2) Setup
   - Run `setupOptionB()` to create the Drive folder and spreadsheets, and to write `ArchivesList`.

3) Backfill
   - Run `backfillAllArchives()`.
   - The code fetches each monthly archive once, transforms all games in memory (single pipeline), then writes in bulk to:
     - Active month → Active spreadsheet (`ActiveGames`)
     - Inactive months → Archives spreadsheet (`ArchiveGames`)

4) Refresh (optional)
   - Re-run `setupOptionB()` periodically to refresh the `ArchivesList`.
   - Re-run `backfillAllArchives()` to bring the active month up to date.

5) Triggers (optional)
   - Weekly: `setupOptionB()` to refresh ledger.
   - Daily: `backfillAllArchives()` to keep active month fresh.

Notes
- All writes are batched. No per-row setValue calls.
- Ledger parity fields (`api_game_count_last`, `last_url_api/seen`) are updated on each backfill pass.

