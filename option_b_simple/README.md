Option B: Simple Chess.com → Google Sheets (Control + Archives + Active)

Overview
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
1) Edit `CONFIG.gs`: set `CONFIG.username` (and optionally `timezone`, `projectName`).
2) Run `applyConfigToProperties()`.
3) Run `setupOptionB()` to create the Drive folder and three spreadsheets and populate the `ArchivesList`.
4) Run `backfillAllArchives()` to fetch each month and write rows:
   - active month → `Active/ActiveGames`
   - inactive months → `Archives/ArchiveGames`

What gets created
- Drive folder named from `CONFIG.projectName` (defaults to `Chess Option B`).
- Control spreadsheet with `ArchivesList` tab (ledger of months).
- Archives spreadsheet with `ArchiveGames` tab for historical games.
- Active spreadsheet with `ActiveGames` tab for the current month.

Why this shape
- Splitting Active vs Archives keeps the hot sheet small and fast while preserving a single, simple location for historical data.
- A single transform pipeline builds 2D arrays for setValues() in one shot per destination, which is faster and less error-prone.

