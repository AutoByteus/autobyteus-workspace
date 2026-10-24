# Handoff Summary — test-and-tooling-hygiene (autobyteus-253)

## Classification And Route

- `task_size` `Medium`, `architectural_risk` `Low`, route `Direct Low-Risk`. These are carried unchanged; delivery did not reclassify.
- Architecture review, code review and API/E2E test-code review: `Not Applicable` on the direct route.

## What Changed

Each of the 13 items from autobyteus-229, 191 and 209 (and the Task's comments) was fixed after its cause was found (TESTING.md Rule 9):

- **Product (W-02):** the agent package folder watcher can lose OS directory events, which made a new Team folder go unnoticed.
  - After a watch arms, and after a definition folder is added or removed, the watcher waits 300 ms of quiet and then asks the reloader to re-read the package. The re-read announces only definitions that really changed.
  - Before asking, it checks that every definition folder on disk is watched. If one is not, it re-arms quietly, once.
  - The integration and E2E tests no longer sleep to "let the watch start".
- **Dependency (W-03):** `type-graphql` moved to `^2.0.0-rc.4`. Building the GraphQL schema twice no longer shifts resolver arguments, and the memoizing test mock is gone.
- **Tests and tooling:**
  - W-01: architecture-guard allow-list.
  - W-04: NotificationCenter fixed timestamps.
  - W-05: LM Studio suite runs or visibly skips.
  - W-06: the Electron harness builds the host platform.
  - W-07: `electron_packaging.md` lists the real build commands.
  - W-08: Grok probe timeout.
  - W-09: extension spec timeout.
  - W-10: 36 dead prompt-engineering tests and their exclusions deleted.
  - W-11: five web spec type errors.
  - W-12: file-explorer socket closes quietly.
  - W-13: the drain test waits for the event.
- **Not worked:** W-14 (FU-011 of 229) is done in `autobyteus-220`.

## Integration

- Bootstrap base: `origin/personal` @ `8b34e8ae10`. Latest base: `origin/personal` @ `1138e8fbef`, 15 new commits.
- Method: merge into the ticket branch, giving `f7c9648821`. There were no conflicts.
- Merge delta outside `tickets/`: 8 files.
  - Docs: `DESIGN.md`, `docs/design-cases.md`, `data_migration_guideline.md`, `nfs_guide.md`.
  - Web: `NfsGuideCard.vue` and its spec.
  - The en and zh-CN settings messages.
  - None of these changes server code, the lockfile, `package.json`, the harness, the fixtures or the build config.
- Post-integration check: `evidence/DR-01-ac016-clean-clone.txt`, a clean `git clone` of `f7c9648821` (tree `ac1a2e3e01`).
  - Setup: frozen-lockfile install `rc=0`, only `type-graphql@2.0.0-rc.4`; prebuild, `nuxt prepare` and `test:integration:prepare` all `rc=0`.
  - Server typecheck `rc=0`.
  - Web `test:nuxt`: `Tests  4860 passed | 5 skipped`, including `NfsGuideCard.spec.ts (13 tests)`.
  - `guard:web-boundary`, `guard:localization-boundary` and `audit:localization-literals`: all `rc=0`.
- Rerun by impact (TESTING.md): the remaining AC-016 suites stay proven by API-21 (a clean clone of the branch) and by API-01…19 on code the merge does not change. The API/E2E engineer confirmed that plan.
  - I started a full rerun first and stopped it during server `test:unit`. No result is taken from that partial run.

## Verification

- Verified from the evidence; no user check needed. See the release/deployment report.

## Release

- The user asked for a beta: "release a new beta for this thanks a lot if everythign okay". The target is `v1.5.9-beta.4`.

## Follow-Ups

- FU-001…FU-004 in `follow-ups.md`. The Solution Designer sends them.

## Residual Risks

- RISK-001: the design accepts it. A write that coincides with another component's watch churn is not caught; Reload recovers it.
- RISK-002: `type-graphql` rc.4 is a prerelease. Its schema text is identical to rc.3 (API-11).
- Validation ran on macOS only.
