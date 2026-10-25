# Handoff Summary: seal-migrations-per-folder

## Ticket

- Package `seal-migrations-per-folder`, Project Task `autobyteus-280`.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed:
  - source review CRR-001 and CRR-002 (Pass 9.45/10; CR-001 and CR-002 fixed in IR-002);
  - API/E2E API-REV-001 (Pass, 95.5%);
  - test-code review CRR-003 (Pass).
- Delivery revision: DR-001.

## What Changed

- **Sealed migration area.** Every registered app-data migration has its own folder under `src/app-data-migrations/migrations/<name>/`, with its tests in one folder named after it. Code several migrations share lives in one frozen layer, `frozen/` (formerly `legacy/`): frozen copies of the production, `autobyteus-ts` and `@autobyteus/application-sdk-contracts` code they use (`frozen/<package>/<path>`), plus released data shapes.
- **No imports in either direction.** `tests/architecture/app-data-migration-boundaries.test.ts` enforces the rule (with a negative case) and reports unused frozen files.
- **Capabilities instead of migration-id checks.** A migration declares `holdsBackCapabilities`, and production code names only the capability:
  - G-2, `token_usage_history`: behavior unchanged;
  - G-1, `custom_llm_providers`: **user-visible.** While the custom-provider migration is pending or failed, the app starts normally. Only custom providers are unavailable, with `CUSTOM_PROVIDERS_MIGRATION_PENDING` (built-ins only in listings; custom-model runs and Settings create/update/delete refused), until a retry succeeds, at the next start or from Settings → Migrations without a restart. Before, the whole server refused to start.
- **`autobyteus-ts/src/memory/migration/`** moved into `frozen/autobyteus-ts/` and is gone from the library.
- **205 repair (REQ-008).** `20261020_remove_skill_improvement_data` now identifies helper runs only by the improver agent id, the records' `improverRunId`/`evolverRunId` and the improver session files, never by `server_helper` alone. A 1.4.92-beta-era memory-compaction run survives. Installs that already ran the earlier cleanup cannot get those runs back; the release notes say so.
- **Docs:** the Data Migration Guideline holds the rule, the reasoning and the retirement steps. Delivery completed its frozen-layer and workspace-package wording (`docs-sync-report.md`).

## Integration

- `origin/personal` advanced 45 commits past the merge base `27f2d2f72d`, including remote-runs-in-tree (autobyteus-278), which overlaps the three task-execution adapters and `team-run-service.ts`.
- `git merge origin/personal` gave merge `8904a45087`, with no conflicts. The base adds no migration and does not change `RELEASE.md`.
- Checks on the merged state:
  - DLV-01 typecheck: exit 0.
  - DLV-02 architecture: 46/47. The one failure is the pre-existing FU-001; the sealed-area boundary tests all pass with the base's new code.
  - DLV-03 server unit: 6656 passed, 1 failed. The failure is a load-sensitive Grok capability test that passes 3/3 alone (FU-003, outside this ticket).
  - DLV-04 build and smoke: exit 0.
  - DLV-05 migration startup e2e: 20/20.
  - DLV-06 capability-gate e2e: 9/9. It covers custom providers held back while the server serves, Settings retry without restart, the fresh RUNNING record, and G-2 history refusal with restart retry.

## Verification

- Judged from the evidence; no user check needed. AC-001..AC-007 are proven; details in `release-deployment-report.md`.

## Release

- No release yet (`RELEASE.md` default; the user has not asked for one for this ticket). A beta or stable is available on request. `release-notes.md` is ready for the next release.

## Follow-ups

`follow-ups.md`, none sent; the Solution Designer sends them:
- FU-001: pre-existing architecture assertion failing on `personal`.
- FU-002: a now-vacuous assertion in `team-run-v1-production-upgrade.e2e.test.ts:1498`.
- FU-003: the load-sensitive Grok capability unit test.
