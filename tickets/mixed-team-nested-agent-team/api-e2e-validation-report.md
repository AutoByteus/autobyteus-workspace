# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-spec.md`
- App-Data Migration Design Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/app-data-migration-design-rework-note.md`
- Command API Design Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/command-api-clean-cut-design-rework-note.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/review-report.md`
- Current Validation Round: 15
- Trigger: Code review Round 26 pass for `APPDATA-MIG-005` local fix at commit `49470432 fix(history): skip legacy team metadata during index rebuild`, plus user clarification that validation must separately prove a clean historical-format transformation and a browser/full-stack display path.
- Latest Authoritative Round: Round 15 (`Pass; validation-code re-review required`)
- Repository-resident durable validation added by API/E2E in this round: `Yes`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 14 | Code review Round 25 app-data migration pass | First-start legacy metadata upgrade, status/retry, Settings migrations UI, and degraded history/restore UX | `APPDATA-MIG-005`: empty-index workspace history leaked raw legacy-metadata error while rebuilding from disk | Fail | No | Routed Local Fix to implementation. |
| 15 | Code review Round 26 `APPDATA-MIG-005` fix plus user-requested historical fixture/E2E durability | Round 14 raw `listWorkspaceRunHistory` empty-index failure | None | Pass; validation-code re-review required | Yes | Added a clean durable historical flat metadata integration test that expects `SUCCEEDED`, added a separate unsafe/degraded integration case, and repeated standalone backend/frontend browser validation showing `SUCCEEDED` with `Migrated 1` / `Failed 0`. |

Older nested mixed-team validation rounds remain recorded in earlier versions of this same report and in the cumulative artifacts. Round 15 supersedes Round 14 for app-data migration validation.

## Validation Basis

Round 15 validates the code-review-passed Round 26 implementation at `49470432 fix(history): skip legacy team metadata during index rebuild`.

The validation is intentionally split into two levels:

1. **Backend integration/migration logic proof**: a real historical-format JSON file with `runVersion` and flat `memberMetadata` is copied into a temporary `memory/agent_teams/<teamRunId>/team_run_metadata.json`; the app-data migration runner is executed; the test asserts status `SUCCEEDED`, `migratedCount=1`, no failures, removal of `memberMetadata`/`runVersion`, canonical recursive `memberTree`, backup creation, workspace-history visibility, safe resume, and idempotent retry.
2. **Full-stack/browser proof**: a built backend is started on a fresh temporary app-data root containing only that clean historical file, a Nuxt frontend is started against that backend, and the Settings -> Server -> Migrations page is verified in the browser. The browser shows `SUCCEEDED`, `1 attempt(s)`, and `Scanned 1 · Migrated 1 · Skipped 0 · Failed 0`.

A separate durable integration case keeps the unsafe/degraded behavior covered: an old flat file whose route encodes nested topology is not guessed; it remains failed with a topology-loss warning, and workspace history skips that unmigrated row rather than leaking a raw error. That separate case explains the earlier `SUCCEEDED WITH WARNINGS` screenshot; it is not used as the clean migration proof.

Because API/E2E added repository-resident durable validation after the latest implementation code review, delivery must remain paused until `code_reviewer` reviews the validation-code additions.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce backward-compatible runtime reads in scope: `No`
- Runtime dual-schema compatibility observed: `No`
- Historical flat metadata handling observed only inside the app-data migration subsystem and current-schema rejection/degraded UX boundary: `Yes`
- Runtime metadata/history/restore paths remain current-schema-only after migration/degradation: `Yes`
- Durable validation added only to prove migration transformation plus current-schema degraded boundaries, not runtime compatibility wrappers: `Yes`
- Reroute classification needed for implementation/design: `No`

## Durable Validation Added In Round 15

- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-server-ts/tests/fixtures/app-data-migrations/team-run-metadata-member-tree/legacy-flat-safe-team-run-metadata.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-server-ts/tests/fixtures/app-data-migrations/team-run-metadata-member-tree/legacy-flat-unsafe-nested-team-run-metadata.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-server-ts/tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts`

The new integration file has two distinct cases:

- clean historical flat metadata -> canonical format, expected `SUCCEEDED`;
- mixed safe/current/unsafe files -> expected `SUCCEEDED_WITH_WARNINGS`, proving failed unsafe rows degrade without blocking history.

## Coverage Matrix

| Scenario ID | Scenario | Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| APPDATA-MIG-001 | Clean historical flat team metadata is transformed to canonical `memberTree` | New backend integration fixture test | Pass | `team-run-metadata-member-tree-history.integration.test.ts` first case passed. It asserts `status=SUCCEEDED`, `scanned=1`, `migrated=1`, `failed=0`, canonical members `program_manager` and `qa_specialist`, and removal of `memberMetadata`/`runVersion`. |
| APPDATA-MIG-002 | Safe converted history remains usable after migration | New backend integration fixture test + standalone GraphQL | Pass | Integration and standalone GraphQL both returned `team-run-legacy-flat-safe` from workspace history and returned canonical `memberTree` from `getTeamRunResumeConfig`. |
| APPDATA-MIG-003 | Clean migration retry is idempotent | New backend integration fixture test | Pass | Retry after clean migration returned `status=SUCCEEDED`, attempts `2`, `migrated=0`, `skipped=1`, `failed=0`. |
| APPDATA-MIG-004 | Browser/full-stack clean migration display shows success, not warnings | Standalone backend + standalone Nuxt frontend + browser | Pass | Browser DOM showed `SUCCEEDED`, `1 attempt(s)`, `Scanned 1 · Migrated 1 · Skipped 0 · Failed 0`, and detail `MIGRATED · team-run-legacy-flat-safe`. Screenshot: `/Users/normy/.autobyteus/browser-artifacts/578f22-1778997477577.png`. |
| APPDATA-MIG-005 | Empty-index `listWorkspaceRunHistory` skips unmigrated legacy metadata during disk rebuild instead of leaking raw topology-lost errors | Backend focused tests + standalone GraphQL | Pass | Backend focused suite passed; standalone GraphQL for the clean case returned no errors. The mixed unsafe integration case logs the expected Settings -> Server -> Migrations hint and omits `team-run-legacy-flat-unsafe`. |
| APPDATA-MIG-006 | Unsafe historical flat metadata with nested route/path is not guessed or converted | Existing unit test + new degraded integration case | Pass | Unsafe fixture remains historical and receives failure message `topology cannot be reconstructed safely`; safe/current rows continue to list in history. |
| APPDATA-MIG-007 | Frontend migration store/component/page behavior remains correct | Frontend Vitest | Pass | `pnpm -C autobyteus-web exec vitest run stores/__tests__/appDataMigrationsStore.spec.ts components/settings/__tests__/ServerSettingsManager.spec.ts pages/__tests__/settings.spec.ts --reporter=dot` passed: 3 files / 26 tests. |
| APPDATA-MIG-008 | Build/schema/localization/static checks remain clean | Typecheck/prisma/localization/git | Pass | Server `tsc --noEmit`, `prisma validate`, frontend localization audit, `git diff --check`, `git diff --cached --check`, and `git diff --check origin/personal...HEAD` all passed after the durable validation update. |

## Commands And Evidence

Focused backend app-data/history validation:

```bash
pnpm -C autobyteus-server-ts exec vitest run \
  tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts \
  tests/unit/app-data-migrations/team-run-metadata-member-tree-migration.test.ts \
  tests/unit/app-data-migrations/app-data-migration-runner.test.ts \
  tests/unit/run-history/services/team-run-history-index-service.test.ts \
  tests/unit/run-history/store/team-run-metadata-store.test.ts \
  tests/unit/run-history/services/team-run-history-service.test.ts \
  --reporter=dot
# Result: 6 files / 26 tests passed.
```

Focused frontend app-data migration UI validation:

```bash
pnpm -C autobyteus-web exec vitest run \
  stores/__tests__/appDataMigrationsStore.spec.ts \
  components/settings/__tests__/ServerSettingsManager.spec.ts \
  pages/__tests__/settings.spec.ts \
  --reporter=dot
# Result: 3 files / 26 tests passed.
```

Static/build-adjacent checks:

```bash
pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false
pnpm -C autobyteus-server-ts exec prisma validate
pnpm -C autobyteus-web audit:localization-literals
git diff --check
git diff --cached --check
git diff --check origin/personal...HEAD
# Result: all passed.
```

Standalone clean backend/frontend/browser validation:

```bash
# Fresh app-data root used by the clean browser proof:
# /tmp/autobyteus-migration-e2e-clean-r27-RqFvOw

# Backend
AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8229 \
DATABASE_URL=file:/tmp/autobyteus-migration-e2e-clean-r27-RqFvOw/db/production.db \
PORT=8229 SERVER_PORT=8229 APP_ENV=production \
PRISMA_QUERY_ENGINE_LIBRARY="$PWD/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/libquery_engine-darwin-arm64.dylib.node" \
PRISMA_SCHEMA_ENGINE_BINARY="$PWD/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/schema-engine-darwin-arm64" \
node autobyteus-server-ts/dist/app.js --host 127.0.0.1 --port 8229 --data-dir /tmp/autobyteus-migration-e2e-clean-r27-RqFvOw

# Frontend
BACKEND_NODE_BASE_URL=http://127.0.0.1:8229 \
BACKEND_GRAPHQL_BASE_URL=http://127.0.0.1:8229/graphql \
BACKEND_REST_BASE_URL=http://127.0.0.1:8229/rest \
BACKEND_AGENT_WS_ENDPOINT=ws://127.0.0.1:8229/ws/agent \
BACKEND_TEAM_WS_ENDPOINT=ws://127.0.0.1:8229/ws/agent-team \
BACKEND_GRAPHQL_WS_ENDPOINT=ws://127.0.0.1:8229/graphql \
PORT=3239 pnpm -C autobyteus-web dev --port 3239 --host 127.0.0.1

# Browser
open http://127.0.0.1:3239/settings?section=server-settings&mode=migrations
# Screenshot: /Users/normy/.autobyteus/browser-artifacts/578f22-1778997477577.png
```

Standalone clean GraphQL assertions passed:

- `getAppDataMigrations`: status `SUCCEEDED`, attempts `1`, `canRetry=false`, summary `scanned=1`, `migrated=1`, `skipped=0`, `failed=0`.
- Converted historical file: contains canonical `memberTree`; no `memberMetadata`; no `runVersion`.
- `listWorkspaceRunHistory(limitPerAgent: 10)`: no GraphQL errors; returned only `team-run-legacy-flat-safe`.
- `getTeamRunResumeConfig(team-run-legacy-flat-safe)`: returned canonical members `program_manager` and `qa_specialist`.

## Failures / Send-Backs

None for implementation or design in Round 15.

Repository-resident durable validation was added by API/E2E after the latest implementation code review. Per team workflow, this passing validation state must be returned to `code_reviewer` for a validation-code re-review before delivery resumes.

## Cleanup

- Backend/frontend validation processes were stopped after evidence capture.
- Clean browser screenshot retained at `/Users/normy/.autobyteus/browser-artifacts/578f22-1778997477577.png`.
- Temporary clean app-data root used for standalone validation: `/tmp/autobyteus-migration-e2e-clean-r27-RqFvOw`.
