Future additions (Option B)

Optional modules to add later:
- Daily totals: compute per-day aggregates over Active + Archives (batched by date ranges).
- Exact rating callbacks: enqueue and fetch per-game rating deltas from unofficial endpoints; write to a results tab and update `rating_is_exact`.
- Openings enrichment: parse chess.com opening pages and save ECO data per game.
- Health snapshot: simple sheet that checks parity, freshness, and counts.
- Per-year partitioning: split `ArchiveGames` into `ArchiveGames_YYYY` tabs.

Guiding principles
- Keep transforms pure and centralized.
- Keep writes batched and minimal.
- Make each optional feature opt-in to preserve simplicity.

