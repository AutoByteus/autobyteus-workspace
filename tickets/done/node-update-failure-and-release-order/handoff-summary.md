# Handoff Summary

## Summary Meta

- Ticket: `node-update-failure-and-release-order` (Project Task autobyteus-412)
- Date: `2026-11-07`
- Current status: `Verified from evidence; finalized into origin/personal; no release`
- Routing: `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed` (architecture review ARCH-REV-002 Pass, code review CRR-001 Pass, API/E2E API-REV-001 Pass 95%, test-code review CRR-002 Not Applicable)
- Archived ticket folder: `tickets/done/node-update-failure-and-release-order/`

## Delivery Summary

- Delivered scope (code in `df789a89a5`):
  - FU-003, stale "Automatic update failed" on a node card:
    - `decideNodeAutoUpdate.ts` `isSupersededFailure`: an `AUTO_FAILED` entry for V is superseded when the node answers `?target=V` with `relation` `same` or `older` and no update running.
    - `nodeAutoUpdater.ts`: a pass applies the rule first and removes the entry (not counted as `AUTO_UPDATED`); new `recheckFailure(entryId)` holds the per-node `checking` guard, asks the node about the failed version through the entry's `baseUrl` (switch on or off), re-reads the entry after the answer and removes it only if the rule still holds. It never requests an update.
    - `nodeAutoUpdateRecord.ts` `remove`; IPC `node-auto-update:recheck` (`nodeAutoUpdateIpc.ts`, `preload.ts`, types); `nodeAutoUpdateStore.recheck`; `NodeServerUpdate.vue` asks for a recheck when the card has a new answer while the outcome is `AUTO_FAILED`. `electronApplication.ts` starts the pass timer in the reordered `startNodeAutoUpdates`.
  - FU-004, desktop release available before its server packages: `release-desktop.yml` `publish-release` uploads the binaries, then "Wait for the server packages" (six files, 120 × 30 s, skipped for refs without `autobyteus-server-ts/docker/system-level.json`), then "Publish the desktop updater files" (`gh release upload --clobber` of the four `latest*.yml`).
  - Tests: Electron node-auto-update specs, `NodeAutoUpdate.spec.ts`, new `scripts/tests/test_desktop_release_server_package_wait.py`.
  - Docs: `RELEASE.md`, `autobyteus-web/docs/{electron_packaging,settings,github-actions-tag-build}.md`; `docs/design-cases.md` Case 10 (Solution Designer).
- Unchanged by design: the one-attempt-per-version rule, `decideNodeAutoUpdate`'s request logic, the starter and node APIs, automatic updates off by default, the Server Docker Release and its 30-min wait, `release:test` publishing nothing.
- Intended consequence (RSK-001): a late or failed server package job now also holds back the desktop updater files; RELEASE.md Recovery covers it.
- Deferred: FU-001 (`NO_PACKAGE_FOR_VERSION` retry, held for evidence) in `follow-ups.md`.
- Removed: `latest*.yml` from the two `softprops/action-gh-release` file lists.

## Integration

- Base at delivery start: `origin/personal` advanced from `6225a734a3` to `933163361c` (autobyteus-427, phone file link). Merged into the ticket branch with `--no-ff` as `8ffbcd361c`; no conflicts (`docs/design-cases.md` auto-merged, both entries kept).
- Post-integration rerun DEL-01 on `8ffbcd361c`: `electron/nodeAutoUpdate` 88 passed, `components/settings/nodes` 67 passed, release step test 11 tests OK.
- Re-checked before the final merge: see the release/deployment report.

## Verification Summary

- Judged from the evidence by delivery; no user check needed (everything was driven on an isolated packaged desktop and a test-owned Docker node; the user's nodes were not touched, and the user did not ask to check).
- AC-001/AC-003 (first view, switch off and on, card's own update): API-06 timeline ends `"notice": "Updated to 1.5.12-beta.7."`, `"autoFailedLine": null`, record `{"entries": {}}`, one window `POST /rest/node-update` only; API-07 run 2 line `added` 20:19:00.252Z / `removed` .280Z, `"sameDocument": true`; API-08 the same with the switch on, no POST, no `AUTO_UPDATED`; API-09 cleared by a pass with no window.
- AC-002: API-10, pass at beta.7 leaves the beta.3 failure (`RECORD-UNCHANGED-AFTER-PASS`), then the main-process recheck `?target=1.5.12-beta.3` (node: `"relation":"older"`) clears it.
- AC-004: API-04/05, node on beta.3 keeps the beta.7 failure with the switch off and on, record unchanged, no POST.
- AC-005 (wait logic), AC-006, AC-007: step tests (11, and 54 across the release step suites in a clean clone), actionlint clean; mutation to the base workflow fails 10 tests. The real-tag asset order is a check on the next release (RSK-002), not run: no release in this ticket.
- AC-008: docs checked in CRR-001 and in delivery docs sync. AC-009: fresh-clone mac arm64 build and verify steps EXIT 0; full Electron suite and settings/stores suites pass; switch off by default (API-04).
- API/E2E final confidence 95%, no category below 93%.
- Residual risks (accepted): the card's address vs the entry's `baseUrl` not exercised; P-003 cosmetic; the `AUTO_FAILED` entry was seeded, not produced by a real `NO_PACKAGE_FOR_VERSION`.

## Documentation Sync Summary

- Docs sync report: `tickets/done/node-update-failure-and-release-order/docs-sync-report.md`
- Result: `Updated` (four docs, written by implementation and confirmed by delivery against the integrated state, including the `github-actions-tag-build.md` edit outside the design's list).

## Release Notes Status

- Release notes: `tickets/done/node-update-failure-and-release-order/release-notes.md` (Fixes), for the release that ships this change.
- Release decision: no release. The bootstrap handoff says "Release only on the user's word"; the user has not asked, and RELEASE.md's default is "No release". A beta (`v1.5.12-beta.8` by the guide's numbering) or stable release is available on request.
- On the first tag that contains this change, run RELEASE.md Watching The Rollout's `createdAt` check: every `latest*.yml` must be newer than all six `autobyteus-server-*` files (AC-005, RSK-002).
