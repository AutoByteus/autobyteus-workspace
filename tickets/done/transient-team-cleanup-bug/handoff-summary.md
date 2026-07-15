# Handoff Summary — Transient Task-Team Cleanup Bug

## Status

Completed. User verified completion and requested finalization plus a new version release on 2026-07-05. The ticket was archived, merged into `personal`, released as `v1.3.98`, and the dedicated ticket worktree/branches were cleaned up.

## Finalization Result

- Ticket branch: `codex/transient-team-cleanup-bug`
- Ticket archival commit on ticket branch: `67653b708e476e27e851ccde6686c304088931ad`
- Merge into `personal`: `92c9108e` (`Merge branch 'codex/transient-team-cleanup-bug' into personal`)
- Release commit: `5bec9a3baf49e6188f3408f3b4ccdc2d84bb9170` (`chore(release): bump workspace release version to 1.3.98`)
- Release tag: `v1.3.98`
- Tag target commit: `5bec9a3baf49e6188f3408f3b4ccdc2d84bb9170`
- Ticket branch push: completed before merge.
- `origin/personal` push: completed after ticket merge and release helper.
- Cleanup: dedicated ticket worktree removed; local and remote ticket branches deleted.

## What Changed

### Runtime Lifecycle / Backend

- Native AutoByteus agent factory lifecycle now keeps stopping agents known until graceful stop settles, rejects new id reuse while stopping, and joins duplicate removal calls.
- AutoByteus agent-run backend termination now converges active/terminating/terminated states, rejects new work during termination, and preserves real stop failures.
- Mixed team manager termination now has active/terminating/terminated lifecycle state, one termination promise, new-work gating while terminating, accepted-only disposal, and root offline publication before cleanup.
- Task-team settlement now uses known directory entries, tracks settlement state, suppresses duplicate destructive close paths, and unbinds/detaches only after accepted settlement.
- Mixed member/task-team handles no longer restore inactive platform runs solely to terminate them and dispose only after accepted termination.
- Task-team handles now preserve/bridge scoped root offline status and publish a fallback scoped root offline before accepted disposal if the child run did not already emit one.

### Durable Coverage

- Added/updated deterministic owner-boundary coverage for native lifecycle, native backend termination convergence, mixed manager termination/snapshots, task-team directory lookup, task-team settlement dedupe/cleanup, and mixed member/task-team handle termination behavior.
- Added API/E2E-owned durable scenario in `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts`: `keeps active task-team handles in snapshots until accepted settlement removes them`.
- Post-API/E2E code review re-reviewed that durable coverage and passed with no blocking findings.

### Docs

Delivery updated long-lived docs to record the final integrated lifecycle invariant:

- `autobyteus-server-ts/docs/modules/agent_team_execution.md`
- `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md`
- `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`

Docs now state that accepted task-team settlement suppresses duplicate close paths, converges already-stopping/offline child state, preserves real active failures, publishes/bridges task-team-scoped root `TEAM_STATUS offline`, unbinds active task-team handles after accepted cleanup, and prevents settled rows from rehydrating through snapshots/reload.

## Validation Summary

Post-integration checks:

- PASS: `git diff --check`.
- PASS: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/mixed-team-manager.test.ts` — 1 file, 9 tests passed.

User-requested Electron build:

- README consulted: `autobyteus-web/README.md`.
- PASS: `pnpm -C autobyteus-web build:electron:mac`.
- Build report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/electron-build-mac-report.md`.

Upstream validation already passed and remains the primary runtime proof:

- PASS: task-delegation integration lifecycle coverage — 1 file, 5 tests.
- PASS: server lifecycle/task-team unit suite — 7 files, 42 tests.
- PASS: AutoByteus agent factory unit coverage — 1 file, 11 tests.
- PASS: frontend streaming projection coverage — 1 file, 38 tests.
- PASS: server source build typecheck.
- PASS: code reviewer round 2 focused `mixed-team-manager.test.ts` rerun — 1 file, 9 tests.

## Release Result

Release helper command:

```bash
bash scripts/desktop-release.sh release 1.3.98 --release-notes tickets/done/transient-team-cleanup-bug/release-notes.md
```

The helper bumped `autobyteus-web` and `autobyteus-message-gateway` to `1.3.98`, synced curated release notes and the managed messaging release manifest, pushed `origin/personal`, and pushed annotated tag `v1.3.98`.

Tag-triggered workflows observed after release:

- Desktop Release: <https://github.com/AutoByteus/autobyteus-workspace/actions/runs/28728596538>
- Android APK Release: <https://github.com/AutoByteus/autobyteus-workspace/actions/runs/28728596550>
- iOS App Store Connect Release: <https://github.com/AutoByteus/autobyteus-workspace/actions/runs/28728596549>
- Release Messaging Gateway: <https://github.com/AutoByteus/autobyteus-workspace/actions/runs/28728596565>
- Server Docker Release: <https://github.com/AutoByteus/autobyteus-workspace/actions/runs/28728596586>

## Residual Notes / Non-Claims

- Full live autonomous `Nested Classroom Test Team` browser repro was not run; deterministic integration, owner-boundary, and frontend streaming coverage passed and are the primary proof.
- Environment-gated live `mixed-task-delegation.e2e.test.ts` was skipped locally because live runtime flags were absent and was not used as primary proof.
- Broad `pnpm -C autobyteus-server-ts run typecheck` remains blocked by the existing repo `TS6059` `rootDir`/tests configuration; source build typecheck passed.
- At final handoff time, the GitHub Release page was visible. Android APK and Messaging Gateway workflows had succeeded; Desktop, iOS, and Server Docker workflows were still in progress.

## Key Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/design-review-report.md`
- Implementation handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/implementation-handoff.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/code-review-report.md`
- API/E2E coverage investigation: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/api-e2e-coverage-investigation.md`
- API/E2E execution report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/api-e2e-execution-coverage-report.md`
- Docs sync report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/docs-sync-report.md`
- Electron build report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/electron-build-mac-report.md`
- Release notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/release-notes.md`
- Delivery/release/deployment report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/transient-team-cleanup-bug/release-deployment-report.md`
