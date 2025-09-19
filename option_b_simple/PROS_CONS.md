Pros and Cons (Option B)

Pros
- Simple structure: three spreadsheets, one ledger.
- Fast writes: single batched set per destination.
- Clear separation: current month vs all history.
- Easy re-runs: setup and backfill are idempotent.

Cons
- Two data locations for games (Active + Archives) may require cross-sheet queries if you analyze across months.
- No built-in daily totals or enrichment queues (kept minimal by design).
- All history in one `ArchiveGames` tab could grow large over time (consider per-year tabs if needed later).

When to switch approaches
- If `ArchiveGames` gets too large: split into per-year tabs or per-year files.
- If you need frequent per-game enrichments: add an optional queue module.

