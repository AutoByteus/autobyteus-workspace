# Operational production database reset incident

- **Status:** User reported restoring `production.db` on 2026-08-15. Implementation performed no inspection, rollback, repair, or validation of the restored database.
- **Date:** 2026-08-14 (Europe/Berlin)
- **Owner at origin:** implementation_engineer
- **Affected command:** `pnpm prisma migrate reset --force --skip-seed`
- **Working directory:** `autobyteus-server-ts`
- **Resolved datasource reported by Prisma:** `file:/Users/normy/.autobyteus/server-data/db/production.db`
- **Observed action:** Prisma reported "Applying migration" for the repository migration chain and then failed on the temporary `20260814090000_team_run_execution_tree_v1` migration with `P3018`, SQLite `duplicate column name: root_team_run_id`.
- **Cause:** The implementation-scoped schema check was launched without an explicit disposable `DATABASE_URL`; the project default resolved to the operational production database. This violated the protected-database constraint.
- **Repository follow-up:** The redundant temporary migration file was removed. No database command, inspection, rollback, restoration, repair, or cleanup was performed afterward.
- **Unknowns:** The pre-command operational data state and post-failure contents were not inspected. The command output indicates a reset/migration sequence, so destructive impact must be assumed.
- **Required operator action:** Treat the operational database as impacted. Any recovery decision must be explicit and operator-owned; implementation must not infer or perform repair.

## User-reported recovery

On 2026-08-15, the user stated that they restored `production.db` under `$HOME/.autobyteus`. The implementation workflow remains prohibited from accessing or validating that operational database. All subsequent database-backed checks must set both `DATABASE_URL` and `DATABASE_URL_TEST` to an explicit disposable path under the repository test directory before execution.

## Captured command tail

```text
Datasource "db": SQLite database "production.db" at "file:/Users/normy/.autobyteus/server-data/db/production.db"
Applying migration `20260203074245_init`
...
Applying migration `20260814090000_team_run_execution_tree_v1`
Error: P3018
Database error code: 1
Database error:
duplicate column name: root_team_run_id
```
