Data Dictionary and Performance Notes

This document enumerates all relevant headers used by the simplified Option B setup and also lists additional headers and performance practices from the earlier, more complete pipeline. Items marked “Not used in Option B” are included for completeness and future extension.

Game headers (Option B)
- url: Canonical Chess.com game URL.
- type: Either live or daily (derived from the URL or time_class). Daily is not used for daily totals aggregation here.
- id: Numeric game identifier from the URL.
- time_control: Raw Chess.com time control string (e.g., 180+0, 600+5, 1/86400 for correspondence).
- base_time: Parsed base seconds for live time controls; null for correspondence.
- increment: Parsed increment seconds for live time controls; 0 if absent.
- correspondence_time: Parsed correspondence increment (seconds per move) when present; otherwise null.
- start_time: Local ISO timestamp when the game started.
- end_time: Local ISO timestamp when the game ended. Used for dating the game in daily totals.
- duration_seconds: Duration of the game in seconds (prefers raw timestamps when both start and end are present).
- rated: Boolean indicating whether the game was rated.
- time_class: Raw Chess.com time class (bullet, blitz, rapid, daily, etc.).
- rules: Variant (e.g., chess, chess960). Option B maps to formats but keeps rules for completeness.
- format: Normalized view of time_class/rules. For the daily totals we only use bullet, blitz, rapid.
- player.username: The configured user’s side username.
- player.color: white or black for the configured user’s side.
- player.rating: Post-game rating for the configured user.
- player.rating_last: Pre-game rating (carried from prior game within the same format when available).
- player.rating_change: Delta between post-game and pre-game for the configured user.
- player.outcome: win, draw, or loss (derived from result codes).
- player.score: 1 for win, 0.5 for draw, 0 for loss.
- opponent.username: Opponent username.
- opponent.color: Opponent color.
- opponent.rating: Opponent post-game rating.
- opponent.rating_last: Opponent pre-game rating (approximated from deltas when available).
- opponent.rating_change: Opponent rating change (opposite sign of player rating change when both are exact).
- opponent.outcome: Derived outcome for the opponent.
- opponent.score: Score for the opponent.
- end_reason: End reason code consolidated from both result codes (e.g., resigned, timeout, stalemate, agreed).
- rating_is_exact: Flag set false by default in Option B; meant to be true when exact rating changes are enriched via callbacks (not used in Option B).

Callback headers (Not used in Option B)
- unique_key: queue key (url|kind). Not used in Option B.
- game_url: game URL to enrich. Not used in Option B.
- kind: enrichment type (e.g., rating_callback, opening_lookup). Not used in Option B.
- status: queued, in_progress, done, failed. Not used in Option B.
- attempts: number of attempts made. Not used in Option B.
- enqueued_at_iso: time the job was enqueued. Not used in Option B.
- last_attempt_iso: last attempt time. Not used in Option B.
- last_error: last error message if any. Not used in Option B.
- month_key: YYYY-MM for grouping. Not used in Option B.
- payload_json (results): opaque JSON for callback results. Not used in Option B.
- ratingChangeWhite / ratingChangeBlack (results): exact rating changes per color from live callback. Not used in Option B.
- whitePregameRating / blackPregameRating (results): exact pre-game ratings from callback. Not used in Option B.
- moveTimestamps (results): per-move elapsed times. Not used in Option B.
- opponent.countryName / membershipCode / memberSince / postMoveAction / defaultTab (results): opponent metadata. Not used in Option B.

Archives list (Option B)
- year: four-digit year.
- month: two-digit month.
- archive_url: canonical month endpoint URL.
- status: active for current month and later, inactive for past months.
- list_etag: last known ETag for the archives list (Option B tracks at the property level; field reserved in ledger).
- month_etag: last known ETag for the month (Option B tracks at the property level; field reserved in ledger).
- last_checked_iso: last time the ledger row was refreshed.
- api_game_count_last: last observed count of games from the API for the month.
- sheet_game_count: last observed row count in the destination sheet for the month.
- last_url_api: last game URL from the API in that month.
- last_url_seen: last game URL seen in the sheet for that month.

Daily totals headers (Option B)
- date: yyyy-MM-dd in script timezone based on end_time.
- bullet.wins / losses / draws: counts for bullet games on that date.
- bullet.rating_start / rating_end: first known rating before games that day (start) and last known rating after games (end).
- bullet.rating_change: sum of rating change across bullet games that date.
- bullet.duration_seconds: total duration across bullet games on that date.
- blitz.wins / losses / draws: as above for blitz.
- blitz.rating_start / rating_end / rating_change / duration_seconds.
- rapid.wins / losses / draws: as above for rapid.
- rapid.rating_start / rating_end / rating_change / duration_seconds.
- overall.wins / losses / draws: totals across bullet, blitz, rapid.
- overall.rating_change / duration_seconds: totals across formats.
- overall.rating_start / rating_end: approximated from available formats (simple average of known starts/ends).

Additional headers used in prior/full version (Not used in Option B, included for completeness)
- pgn.ECO: ECO code parsed from PGN headers.
- pgn.ECOUrl: ECO page URL from PGN headers.
- tcn, uuid, initial_setup, fen: various identifiers and positions from the archive payload.
- accuracies.white, accuracies.black: engine accuracy values if returned.
- gameIndex/row_number/spreadsheet_id: cross-sheet index for fast lookup.
- analysisQueue / analysisResults: placeholders for deeper analysis integrations.

Performance practices (used)
- ETag-aware HTTP GET for archives list and monthly archives to avoid redundant fetches.
- Full-month in-memory transform producing a 2D array; single batched setValues per destination.
- Targeted daily totals recomputation for dates actually affected by new rows.
- URL-based de-duplication before writing to sheets.

Performance practices (available, Not used in Option B)
- LockService to prevent overlapping triggers.
- Circuit breakers / error-rate aborts and dead-letter queues.
- Structured logs and metrics tabs for run analytics.
- Per-year partitioning or per-month files to reduce single-sheet growth.
- Callback-based rating exactness updates and enrichment queues.

