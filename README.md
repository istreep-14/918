# Chess.com Sheets Pipeline (Apps Script)

Control file sheets:
- ActiveGames
- DailyTotalsActive
- ArchiveList
- CallbacksQueue, CallbacksResults
- Logs, Health

Archive files:
- ArchiveGames_YYYY (one per year)
- Optional: DailyTotalsArchive

Key features:
- ETag-aware fetch for archives list and month archives
- Incremental ingest by last URL
- Pure transforms; bulk write using ACTIVE_HEADERS
- Daily totals per day, per format plus overall
- Idempotent month rollover (finalize/move/seed)
- Unified queue with reconciler & worker
- Centralized logging and health status

Setup:
1) Create a Google Spreadsheet (Control). Note its ID.
2) (Optional) Create archive spreadsheets per year and store their IDs.
3) In Apps Script project properties, set:
   - CONTROL_SPREADSHEET_ID
   - USERNAME (chess.com username to fetch archives for)
   - MY_USERNAME (your own account; may equal USERNAME)
   - ARCHIVE_SPREADSHEET_ID_YYYY for each year
4) Add time-driven triggers:
   - ingestActiveMonthOnce: every 15-60 minutes
   - processQueueBatch_: every 5 minutes
   - finalizePreviousMonthIfReady_: daily near midnight
   - writeHealth_: daily

Primary functions:
- ingestActiveMonthOnce(): fetch + append new games to ActiveGames, update ArchiveList
- recomputeDailyTotalsForDates_(["YYYY-MM-DD", ...]): update affected days
- seedDailyTotalsForNewMonth_(YYYY, MM): pre-create month dates
- finalizePreviousMonthIfReady_(): safe rollover when new month appears
- reconcileQueueForMonth_(YYYY, MM, [kinds]): rebuild queues for month
- processQueueBatch_(K): process up to K queued jobs
- writeHealth_(): compute and append health row

Notes:
- All timestamps normalized to yyyy-MM-dd HH:mm:ss in script timezone
- ACTIVE_HEADERS keeps sheets light; widen later if needed
- Use ArchiveList as the audit ledger; it tracks ETags, counts, last URLs, and more