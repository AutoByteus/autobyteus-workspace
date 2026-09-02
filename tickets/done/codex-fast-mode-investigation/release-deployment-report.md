# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

The user explicitly accepted the completed real-browser result and instructed Delivery to “finalize and release.” Scope included latest-base reintegration, archival and target merge, stable patch release `v1.4.65`, all five tag-triggered publication/deployment workflows, output verification, and safe ticket cleanup.

## Handoff Summary

- Handoff summary: `tickets/done/codex-fast-mode-investigation/handoff-summary.md`
- Delivery revision record: `tickets/done/codex-fast-mode-investigation/delivery-revision-record.md`
- Current delivery revision: `DR-006`
- Status: `Released and verified`

## Initial Delivery Integration Refresh

- Bootstrap base: `origin/personal@773bce779f195c22194c6bed1b242be6e222d06e`
- Post-acceptance tracked base: `origin/personal@bed4c05a1c7860c7bd392c61dd7d26c239598284`
- Accepted-state checkpoint: `c91749e089ddd9658231eafb351918c22922e914`
- Integration method/result: merged latest base without conflict as `a923fdf0a75b1a865a7dac6dcc2a2408bed22ac5`
- Changed-path overlap: none with ticket implementation, durable test, README, or Codex integration docs
- Post-integration check: shared-package preparation passed; focused Codex normalizer passed `1` file / `10` tests
- Renewed user verification: not required because the six base commits were unrelated, had no effective-path overlap, and the focused check passed

## User Verification

- Explicit user completion/verification: `Yes`
- Reference: `2026-09-02 — “finalize and release”`, after `API-REV-003 Pass / 98.7%`
- Additional requested real-browser validation: completed before acceptance

## Docs Sync Result

- Result: `Updated and verified`
- Updated: `autobyteus-server-ts/docs/modules/codex_integration.md`; `README.md`
- Release-stage impact: `No additional long-lived docs edit`. Versioning/publication changed release records only; the documented behavior remains accurate.
- Artifact: `tickets/done/codex-fast-mode-investigation/docs-sync-report.md`

## Ticket State Transition

- Moved to `tickets/done/codex-fast-mode-investigation`: `Yes`
- Archived ticket commit: `b463101fba3b546c478086d4a19a98e761aacd8f`

## Version / Tag / Release Commit

- Version bump: `1.4.64 -> 1.4.65` in `autobyteus-web` and `autobyteus-message-gateway`
- Managed messaging manifest: synchronized to `v1.4.65` / artifact `1.4.65`
- Release commit: `754860d8e4a9b29454728f9dab861ba805e1c3c6`
- Annotated tag: `v1.4.65`; tag object `2ef9f30dd85f6384726b1ac4c49398d690749626`; peeled target `754860d8e4a9b29454728f9dab861ba805e1c3c6`
- Remote `personal` at release publication: `754860d8e4a9b29454728f9dab861ba805e1c3c6`

## Repository Finalization

- Ticket branch: `codex/codex-fast-mode-investigation`
- Ticket push: completed at `b463101fba3b546c478086d4a19a98e761aacd8f`
- Finalization target: `origin/personal`
- Target merge: `e1a1422b0306bd0f0fa98cc0a0de71637d97c904`
- Target push: completed before release
- Release execution used a clean isolated checkout because the user's primary `personal` worktree was dirty/stale and was intentionally not modified.
- Result: `Completed`

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `pnpm release 1.4.65 -- --release-notes tickets/done/codex-fast-mode-investigation/release-notes.md`
- Result: `Pass`
- Stable release: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.65
- Published: `2026-09-02T03:39:23Z`
- Draft/prerelease: `false / false`
- Curated body: matches archived notes, ignoring one terminal newline
- Assets: `21`
- Recovery/manual second dispatch: `None`

### Workflow Results

| Workflow | Run | Result | Verified output |
| --- | --- | --- | --- |
| iOS App Store Connect Release | [33587668322](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/33587668322) | `Pass` | Build/test and App Store Connect/TestFlight upload; `1.4.65 (127)`; delivery UUID `13d36e7b-06f0-4f98-b56f-3a814a7a3abd` |
| Desktop Release | [33587668323](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/33587668323) | `Pass` | Windows, macOS x64/arm64, Linux x64/arm64; GitHub release publication |
| Server Docker Release | [33587668343](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/33587668343) | `Pass` | Default linux/amd64 + linux/arm64 image; version and latest tags |
| Release Messaging Gateway | [33587668325](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/33587668325) | `Pass` | Archive, metadata, checksum |
| Android APK Release | [33587668332](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/33587668332) | `Pass` | APK and checksum |

All workflows used exact head SHA `754860d8e4a9b29454728f9dab861ba805e1c3c6`.

### Server Docker Verification

- Image tags: `autobyteus/autobyteus-server:1.4.65`; `autobyteus/autobyteus-server:latest`
- Both registry tags resolve to: `sha256:b8650d626573ec1b603e22cca9e4010023c99832bea72136c58df44750a0947d`
- linux/amd64: `sha256:bcf560077ccf520e3168eb96683c7bec5a526d9b0c044e2bbaaa0747283e3201`
- linux/arm64: `sha256:d15902abe73b4c5edb75890fa2e24cacfa22214593fee4fc65e97a70646b0d1b`
- Registry verification: `docker buildx imagetools inspect` passed for both versioned and latest tags
- `zh` variant: not part of the tag-triggered default release; its conditional workflow step was skipped by design

### iOS Publication Boundary

The IPA upload to App Store Connect/TestFlight completed with “UPLOAD SUCCEEDED with no errors.” This workflow does not submit the build for App Store review or make it publicly available in the App Store; that remains a separate product-release action.

## Post-Finalization Cleanup

- Dedicated ticket worktree: `Removed`
- Local ticket branch: `Removed`
- Remote ticket branch: `Removed` after confirming it was an ancestor of remote `personal`
- Worktree registration: `Pruned`
- Stable target/tag/release retained: `Verified`
- Primary dirty/stale `personal` worktree: `Untouched`; pre-existing `package.json`, `.article-work/`, and generated application-dist changes were not modified
- Evidence: `tickets/done/codex-fast-mode-investigation/delivery-evidence/dr-006-post-finalization-cleanup.log`

## Environment Or Persisted-Data Transition Notes

- Approved result: `Directly Usable — No Migration`
- Action: `None`
- Existing `llmConfig.service_tier: "fast"` remains canonical. No schema rewrite, backfill, downtime, or recovery step is required.

## Verification Evidence

- `tickets/done/codex-fast-mode-investigation/delivery-evidence/release-v1.4.65-command.log`
- `tickets/done/codex-fast-mode-investigation/delivery-evidence/release-v1.4.65-workflow-monitor.log`
- `tickets/done/codex-fast-mode-investigation/delivery-evidence/release-v1.4.65-verification.log`
- `tickets/done/codex-fast-mode-investigation/delivery-evidence/dr-006-post-finalization-cleanup.log`

## Residual Repository Health

- Round 1's full live-enabled server suite remains non-clean: `63` failed files / `177` failed tests. The exact changed-boundary catalog file passed in that run and focused runs; the broad failures are unrelated/stale debt and are not relabeled as clean or attributed to this change.
- Generic server package typecheck remains unusable due the pre-existing `rootDir=src` plus included-tests `TS6059` mismatch. The production build passed; generic typecheck is not claimed clean.

## Rollback Criteria

- A published stable tag must not be rewritten. If rollback becomes necessary, revert the ticket merge on `personal`, restore deployment state as appropriate, and publish a later patch release.
- Trigger rollback only for a confirmed regression such as structured `priority` catalogs no longer exposing Fast, persisted `fast` becoming unusable, reasoning semantics changing, or unauthorized runtime/header UI appearing.
- Do not restore deprecated dual-read fallback automatically; any provider-contract change requires a new investigated change.
- No data rollback is expected because no persisted data was transformed.

## Escalation / Reroute

`N/A — no technical blocker, deployment-local issue, upstream defect, or unresolved review finding remains.`

## Final Status

`Pass — repository finalization, stable v1.4.65 publication, rollout verification, archival, and safe ticket cleanup completed.`
