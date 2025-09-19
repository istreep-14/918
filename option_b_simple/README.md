Option B: Simple Chess.com → Google Sheets (Control + Archives + Active)

Overview
- See `DATA_DICTIONARY.md` for a full description of every header and performance notes (including headers not used in Option B but available for future expansion).
- Purpose: Pull Chess.com monthly archives for a user, normalize games in memory, and write in two places:
  - Active spreadsheet (current month only)
  - Archives spreadsheet (all past months)
- Control spreadsheet holds a single `ArchivesList` ledger indicating which months are active/inactive and basic parity info.

Key Goals
- Minimal code surface and minimal files to operate
- Explicit configuration via `CONFIG.gs`
- Batched transformations and writes (no row-by-row updates)
- A clean, restartable backfill

Quick Start
1) Single call config: `setConfig({ username: 'your_name', projectName: 'Chess Option B', timezone: 'America/New_York' })`
2) Or manual: edit `CONFIG.gs` and run `applyConfigToProperties()`.
3) Run `setupOptionB()` to create the Drive folder and three spreadsheets and populate the `ArchivesList`.
4) Run `backfillAllArchives()` to fetch each month and write rows:
   - active month → `Active/ActiveGames`
   - inactive months → `Archives/ArchiveGames`
5) Daily totals: when new games are added to Active, the `Active/DailyTotals` tab is updated only for the dates impacted.

What gets created
- Drive folder named from `CONFIG.projectName` (defaults to `Chess Option B`).
- Control spreadsheet with `ArchivesList` tab (ledger of months).
- Archives spreadsheet with `ArchiveGames` tab for historical games.
- Active spreadsheet with `ActiveGames` tab for the current month.

Why this shape
- Splitting Active vs Archives keeps the hot sheet small and fast while preserving a single, simple location for historical data.
- A single transform pipeline builds 2D arrays for setValues() in one shot per destination, which is faster and less error-prone.
 - Daily totals track bullet/blitz/rapid only; Overall includes wins/losses/draws, duration, and approximated start/end-of-day ratings (averaged from formats when available).

