Operations (Option B)

One-time
- Edit `CONFIG.gs`, then run `applyConfigToProperties()`.
- Run `setupOptionB()`.

Recurring
- Refresh ledger: run `setupOptionB()` (safe to re-run).
- Update data: run `backfillAllArchives()`.

Suggested triggers
- Time-driven (weekly): `setupOptionB()`.
- Time-driven (daily): `backfillAllArchives()`.

Monitoring
- Control → `ArchivesList` shows status (active/inactive), last checked time, API vs sheet counts, and last URLs.

Common issues
- Missing username: set in `CONFIG.gs` and re-run `applyConfigToProperties()`.
- Quotas/timeouts: split backfill into multiple runs; Option B performs one setValues per destination per month.

