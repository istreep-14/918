Simple Chess.com → Google Sheets (Apps Script)

What this does
- Setup: Creates a project folder, Control spreadsheet, Archives spreadsheet, and Active spreadsheet.
- Archives list: Fetches Chess.com archives list and writes a single ledger in Control → ArchivesList with status (active/inactive).
- Backfill: For each month, fetches games once, applies a pure transform pipeline in-memory, then writes rows:
  - inactive months → Archives spreadsheet (ArchiveGames tab)
  - active month → Active spreadsheet (ActiveGames tab)

How to use
1) Open CONFIG.gs and set CONFIG.username and optionally timezone/projectName.
2) Run applyConfigToProperties().
3) Run setupSimple() to create files and fetch the archives list.
4) Run backfillAllArchives() to ingest all months in one go.

Notes
- The transform pipeline is a JS object (Transform) and is applied once per fetch to build 2D arrays for setValues in a single call per destination.
- The Active spreadsheet contains only the current month; all past months live in the Archives spreadsheet.

