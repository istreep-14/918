Architecture (Option B)

Files
- `CONFIG.gs`: User-editable constants; apply to document properties.
- `constants.gs`: Property keys, headers, endpoints.
- `utils.gs`: Time formatting, sheet header management, batch append, HTTP GET with ETag.
- `setup.gs`: Creates Drive folder and three spreadsheets; ensures tabs/headers; populates `ArchivesList`.
- `archives.gs`: Fetches and writes `ArchivesList`; backfills all months, updates ledger counters and URLs.
- `transform_pipeline.gs`: Pure normalization pipeline that outputs a 2D array for setValues().

Data model
- Control/`ArchivesList`: one row per {year, month} with active/inactive status and parity counters.
- Archives/`ArchiveGames`: normalized game rows for all historical months.
- Active/`ActiveGames`: normalized game rows for the current month only.

Performance characteristics
- ETag-aware fetches for both list and month endpoints.
- In-memory transforms for entire months; single setValues per destination.
- No per-row writes, no repeated range lookups beyond URL de-duplication on write.

Rationale
- Active vs Archives separation keeps the working set small and stable.
- Single ledger simplifies visibility (what is active now, what changed last).

