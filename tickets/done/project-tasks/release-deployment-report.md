# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

Ticket `project-tasks` (`PROJ-TASKS-20260926-001`): description-only Project Tasks with the SR-008 UI (released grid with count line, full-width Project page with Back, Tasks/Workspaces tabs, three-column board). Classification: `task_size=Medium`, `architectural_risk=High`, full independent-review route. Finalization target: `origin/personal`. A release is conditional on the user's decision.

Delivery history: DR-001 (two-pane candidate `a0fd103af`) was **rejected** in user verification on 2026-09-27 and is superseded; it was never finalized or pushed to `personal`. This report is authoritative for DR-002.

## Handoff Summary

- Handoff summary artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/done/project-tasks/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/done/project-tasks/delivery-revision-record.md`
- Current delivery revision ID: `DR-002`
- Notes: user verified the refresh-4 build (`7ebec67fc`) on 2026-09-28 and requested finalization plus the next beta release. Finalization and the release result are recorded under "Finalization And Beta Release" at the end of this report.

## Initial Delivery Integration Refresh (DR-002)

- Bootstrap base reference: `origin/personal@e06080b00` (v1.4.86). The DR-001 merge brought the branch to `fa5919da1` (`a0fd103af`).
- Latest tracked remote base checked: `origin/personal@8bffda045` (v1.4.88), fetched 2026-09-27
- Base advanced since the previous refresh: `Yes`: 5 commits (startup admission and attachment-history recovery, the v1.4.87 finalization record, the v1.4.88 release and its record)
- New base commits integrated: `Yes`
- Local checkpoint commit: `Completed`: `a85a24efd` committed the reviewed probe (E2E-028, E2E-029, header fix) and the revised upstream ticket artifacts. Delivery-owned files, `test-results/` and the SDK `dist/` folders were excluded.
- DR-001 docs edits: these uncommitted edits described the rejected UI. They were reset to HEAD before integration; a reference patch was kept outside the repository.
- Integration method: `Merge` (`git merge --no-edit origin/personal` → `f3029d30d`)
- Integration result: `Completed` with no conflicts. None of the ticket's own files (Projects server/web code, probe, docs, ticket) are touched by the incoming commits. No lockfile or `autobyteus-ts` change came in; `autobyteus-web/package.json` changed only its version, to 1.4.88.
- Server Projects code unchanged since review: `git diff a0fd103af..HEAD -- autobyteus-server-ts/src/projects …/types/projects.ts …/types/project-tasks.ts …/schema.ts` is empty.
- Post-integration executable checks rerun: `Yes` (evidence in `delivery-logs/dr-002/`)
  - Server `npx tsc -p tsconfig.build.json --noEmit`: Pass.
  - Server `npx vitest run tests/unit/projects tests/unit/api/graphql/project-tasks-schema.test.ts tests/unit/api/graphql/projects-schema.test.ts tests/unit/api/graphql/types/projects.test.ts tests/unit/application-capability tests/unit/services/server-settings-service.test.ts tests/architecture/projects-boundaries.test.ts tests/unit/server-runtime-app-data-migration-gate.test.ts tests/e2e/projects`, run with the inherited `ENABLE_*` variables set: 11 files / 132 tests Pass.
    - The `APP_DATA_STARTUP_GATE_FAILED` lines in the log are the gate test's expected failure-path output.
  - Web `NUXT_TEST=true npx vitest run components/projects components/settings components/common components/workspace/config stores/__tests__/projectStore.spec.ts stores/__tests__/projectTaskStore.spec.ts stores/capabilities tests/stores/serverSettingsStore.test.ts composables/__tests__/useShellPrimaryNavigation.capabilities.spec.ts middleware utils localization/messages/__tests__`: 139 files / 858 tests Pass.
  - `pnpm guard:localization-boundary` Pass; `pnpm audit:localization-literals` Pass with zero unresolved findings.
  - `env -u ENABLE_PROJECTS -u ENABLE_APPLICATIONS -u ENABLE_SKILL_IMPROVEMENT -u ENABLE_SELF_EVOLUTION corepack pnpm test:e2e:projects --output-dir=/tmp/ptasks-delivery/r2/probe` (full server build, live nodes): 29/29 Pass.
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (as of the fetch above)
- Blocker: None

## User Verification

- DR-001 verification: `Rejected` by the user on 2026-09-27 (two-pane UI; see `solution-revision-record.md` SR-005)
- DR-002 explicit user verification received: `Yes`. On 2026-09-28, after testing the local macOS build of `7ebec67fc` (`1.4.91-beta.1`-versioned, refresh 4), the user wrote "finalize and release the next beta version thanks". The user had tested earlier refresh builds as they were produced; this verification applies to the final refresh-4 state.
- Renewed verification required after later re-integration: —

## Docs Sync Result

- Docs sync artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/done/project-tasks/docs-sync-report.md` (DR-002, supersedes DR-001)
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/projects.md`, `autobyteus-server-ts/docs/modules/projects.md`, `autobyteus-web/AGENTS.md`

## Ticket State Transition

- Ticket moved to `tickets/done/project-tasks`: `Yes` (after verification; see the finalization section)

## Version / Tag / Release Commit

The user requested the next **beta**. Method: `bash scripts/desktop-release.sh beta --branch <delivery branch> --no-push`, run on a delivery branch cut from `origin/personal`, then an explicit push of `personal` and the tag. The helper computes the next unused `vX.Y.Z-beta.N` (expected `v1.4.91-beta.2`, since the latest stable is `v1.4.90` and `v1.4.91-beta.1` exists). Beta releases use GitHub-generated notes and are published as pre-releases, so the curated `release-notes.md` is kept in the archived ticket for a later stable release but is not used by this beta. The result is recorded in the finalization section.

## Repository Finalization

- Bootstrap context source: `design-spec.md` (finalization target `origin/personal`)
- Ticket branch: `codex/project-tasks` (local only; not pushed)
- Status: pending user verification

## Release / Publication / Deployment

- Applicable: `Yes` (the user requested the next beta)
- Result: pending

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks`
- Status: pending

## Release Notes Summary

- Release notes artifact created before verification: `tickets/done/project-tasks/release-notes.md` (rewritten for SR-008)
- Release notes status: `Updated`

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration` (unchanged since SR-004). v1.4.86 rows without `tasks` normalize to an empty list, and the first write persists `tasks`.
- Delivery action required: `None`
- Result and evidence: E2E-024 used a released v1.4.86 file on a live node. The rows stayed intact, showed no open tasks, and were not rewritten while browsing; the first Task write kept the released fields. E2E-025 (restart persistence) also passes on `f3029d30d`.

## Verification Checks

See the integration refresh above.

Local macOS test build for user verification (method: the `autobyteus-web/README.md` "macOS Build With Logs (No Notarization)"):
- Command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= corepack pnpm build:electron:mac` in `autobyteus-web`, on `f3029d30d` plus the uncommitted delivery docs. The stale DR-001 `electron-dist` was removed first. Result: exit 0.
- `guard:web-boundary`, `guard:localization-boundary`, and `audit:localization-literals` all passed.
- Artifacts: `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`, `AutoByteus_enterprise_macos-arm64-1.4.88.dmg` / `.zip`. The build is ad-hoc signed and not notarized; it is a local test build, not a release.
- Log: `delivery-logs/dr-002/electron-build-mac.log`

## Rollback Criteria

A regression in the Projects grid or Project page, the board, or workspace linking justifies a revert of the merge on `personal`. A rollback is data-safe. The released (v1.4.86 to v1.4.88) store normalizer and every `ProjectService` updater spread the whole record (`{ ...project, ... }`, checked in `git show v1.4.86:autobyteus-server-ts/src/projects/stores/project-store.ts` and `…/services/project-service.ts`). Rows with `tasks` are therefore accepted, and the Tasks are carried unchanged through released writes. After a rollback the Tasks are only hidden, and they reappear on roll-forward.

## Final Status

- Explicit user testing/verification complete: `No`
- Repository finalization complete: `No`
- Applicable release/deployment/rollout complete or not required: `No` (pending decision)
- Applicable safe cleanup complete or not required: `No`
- Unresolved blocker: `None`. Waiting on user verification.
- Successful terminal package eligible for return: `No`
- Terminal package sent to `/solution_designer`: `No`

## DR-002 Refresh 2 (pre-verification, 2026-09-27)

- Trigger: the user reported that `origin/personal` had been updated and asked for a fresh test build.
- Latest tracked remote base: `origin/personal@82f3359cb`, 3 commits beyond `8bffda045`: startup/migration performance correction and the v1.4.89 release.
- Delivery-owned uncommitted edits: none of them overlap the incoming files, so the merge left them intact.
- Integration: `git merge --no-edit origin/personal` → `e66ea1adb`. No conflicts, and no ticket files touched. No lockfile or `autobyteus-ts` change; `autobyteus-web/package.json` changed only its version, to 1.4.89.
- Rerun checks on `e66ea1adb` (evidence in `delivery-logs/dr-002/refresh-2/`), same commands as above:
  - server tsc Pass; server 11 files / 132 tests Pass;
  - web 139 files / 858 tests Pass;
  - browser probe 29/29 Pass.
- New local macOS test build (replaces the `f3029d30d` build): `NO_TIMESTAMP=1 APPLE_TEAM_ID= corepack pnpm build:electron:mac`, exit 0; guards and localization audit passed. Artifacts: `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`, `AutoByteus_enterprise_macos-arm64-1.4.89.dmg` / `.zip` (ad-hoc signed, not notarized). Log: `delivery-logs/dr-002/refresh-2/electron-build-mac.log`.
- The latest tag is now `v1.4.89`, so a requested release would be `1.4.90`.
- User verification: still pending, on the `e66ea1adb` build.

## DR-002 Refresh 3 (pre-verification, 2026-09-27)

- Trigger: the user reported that `origin/personal` had been updated again and asked for a rebuilt test app.
- Latest tracked remote base: `origin/personal@f7b4f7f4a`, 10 commits beyond `82f3359cb`: the Grok Build runtime on a runtime-neutral ACP layer, the v1.4.89 publication record, and the v1.4.90 release.
- Delivery-owned uncommitted edits: none of them overlap the incoming files, so the merge left them intact.
- Integration: `git merge --no-edit origin/personal` → `d6999026e`, with no conflicts and no ticket files touched.
- The base changed `pnpm-lock.yaml` (adds `@agentclientprotocol/sdk@1.5.0`), `autobyteus-ts` source, and the server `package.json`. So `corepack pnpm install --frozen-lockfile` was run (exit 0), followed by `corepack pnpm -C autobyteus-ts build` (exit 0).
  - The install printed two warnings about the sample applications' devkit CLI bin, which is not built. They are unrelated to this ticket.
- Rerun checks on `d6999026e` (evidence in `delivery-logs/dr-002/refresh-3/`), same commands as above:
  - server tsc Pass; server 11 files / 132 tests Pass;
  - web 140 files / 861 tests Pass (this includes the new base spec `grokBuildRuntimePresentation.spec.ts`);
  - browser probe 29/29 Pass.
- New local macOS test build (replaces the `e66ea1adb` build): `NO_TIMESTAMP=1 APPLE_TEAM_ID= corepack pnpm build:electron:mac`, exit 0; guards and localization audit passed. Artifacts: `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`, `AutoByteus_enterprise_macos-arm64-1.4.90.dmg` / `.zip` (ad-hoc signed, not notarized). Log: `delivery-logs/dr-002/refresh-3/electron-build-mac.log`.
- The latest tag is now `v1.4.90`, so a requested release would be `1.4.91`.
- User verification: still pending, on the `d6999026e` build.

## DR-002 Refresh 4 (pre-verification, 2026-09-28)

- Trigger: the user reported that `origin/personal` had been updated and asked for a rebuilt local test app, noting it would now be a beta build.
- Latest tracked remote base: `origin/personal@fcdfcd2ca`, 20 commits beyond `f7b4f7f4a`: the desktop beta update channel and beta release track, the Antigravity version-independent runtime correction, and the `1.4.91-beta.1` version bump. `v1.4.91-beta.1` is already published as a GitHub pre-release (17 assets).
- Delivery-owned edits protected: the incoming base edits `autobyteus-web/AGENTS.md`, which the uncommitted docs sync also edits. So the three docs files were committed locally first, as checkpoint `76de52ea6` (not pushed).
- Integration: `git merge --no-edit origin/personal` → `7ebec67fc`. No conflicts; `AGENTS.md` auto-merged and keeps both the Projects line and the new beta-release line. No lockfile or `autobyteus-ts` change.
- Rerun checks on `7ebec67fc` (evidence in `delivery-logs/dr-002/refresh-4/`):
  - server tsc Pass; server 11 files / 132 tests Pass;
  - web 141 files / 897 tests Pass (now also covering `stores/__tests__/appUpdateStore.spec.ts` and the updated `AboutSettingsManager.spec.ts`);
  - browser probe 29/29 Pass.
- Local macOS test build (replaces the `d6999026e` build): `NO_TIMESTAMP=1 APPLE_TEAM_ID= corepack pnpm build:electron:mac`, exit 0; guards and localization audit passed. Artifacts: `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`, `AutoByteus_enterprise_macos-arm64-1.4.91-beta.1.dmg` / `.zip` (ad-hoc signed, not notarized). Log: `delivery-logs/dr-002/refresh-4/electron-build-mac.log`.
- Beta implications (checked):
  - `build/scripts/build.ts` has no beta branch. The version comes from `package.json`, so `Info.plist` `CFBundleShortVersionString` and `latest-mac.yml` are both `1.4.91-beta.1`, and About shows the Beta badge (`currentVersionIsPrerelease`).
  - The version string is identical to the published `v1.4.91-beta.1` pre-release, but this build also contains Project Tasks.
  - The embedded `app-update.yml` points at GitHub `AutoByteus/autobyteus-workspace`. The user's `userData/app-update-channel.v1.json` is `beta`, and `autoUpdater.autoDownload = false`. So no update is offered while `1.4.91-beta.1` is the newest release, and a newer offer would need an explicit user action.
- Release options after verification: stable `release 1.4.91 --release-notes …` (curated notes) or `beta` → `v1.4.91-beta.2` (generated notes, pre-release), or no release.
- User verification: still pending, on the `7ebec67fc` build.
