# Handoff Summary

## Summary Meta

- Ticket: `small-follow-ups-batch-426` (Project Task autobyteus-426). Both ticket rounds are delivered.
- Date: `2026-11-08`
- Current status: `Complete`. Round 1 was finalized at `a42dbca699` (DR-001). Round 2 is verified from evidence and finalized into `origin/personal` (DR-002; the merge and push are in the release/deployment report). There is no release.
- Routing: `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`.
  - Round 1: ARCH-REV-005, CRR-005, API-REV-002 (95%), CRR-006, all Pass.
  - Round 2: CRR-007 Pass, API-REV-003 Pass (95%), CRR-008 Pass (no findings).
- Archived ticket folder: `tickets/done/small-follow-ups-batch-426/`

## Delivery Summary

### Round 1 (finalized at `a42dbca699`, DR-001)

Items 1, 2, 3 (AC-004a), 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18 and 19:
- **D-01**: the phone opens the definitions feed only while paired.
- **D-02**: the phone's connection state comes from its own credential check.
- **D-03**: Android restore after process death.
- **D-05**: phone VNC Clipboard.
- **D-06**: node-desktop refusal log line.
- **D-07**: Android `blob:` preview subframes.
- **D-08**: workspace folder check.
- **D-10, D-11, D-14**: probes and server tests.
- **D-12, D-13**: docs and design cases.
- **D-16**: remote-node Phone Setup wording.
- **D-17**: app-locale formatting.
- **D-18**: address classes.
- **D-19**: read-only file status.

### Round 2 (last code commit `736b51f87a`; one commit per item)

- **D-09** (`06cc2aabad`): delegated rows of a listed active Agent run that is not open follow their children's states on each history poll (desktop Runs view, Workspaces tree, phone list). This uses a new `agentRunCollaborationStatuses` read, and the run's view is re-read only when its children or active state change.
- **D-20** (`094c896407`): `PEER_HOST_REFUSED` / `host_refused` when a peer's Host gate refuses the name. The Nodes page names the host and the fix.
- **D-21** (`736b51f87a`): the token-statistics probe passes on any day.
- **D-22** (`c4521d4402`): MRP-02 expects the runtimes' display names.
- **D-23** (`23483d0cf8`): one `parseWebOrigin`, behavior unchanged.

### Scope notes

- Dropped with evidence: item 4; item 15 (DEC-011); AC-004b, run screens after process death (DEC-013 (B), the user's decision).
- Deferred outside the ticket: FU-001…FU-004 in `follow-ups.md`. The Solution Designer sends them now that the ticket leaves the team.

### Accepted residual risks

- While Phone access is off, the connection sheet says "Not reachable" and the bar says "Phone access off" (designed).
- Process death was tested on an emulator only.
- The Workspaces tree has no probe step of its own; it shares the section load, store and row component with the Runs view, and specs cover it.
- AC-020 (3) is proven at spec and server level, because the real page refuses the name earlier (DEC-017, FU-004).
- NP-13 depends on `lvh.me` resolving to the machine.
- Signing, notarization and the non-macOS builds need the release runner.

### Open for the Solution Designer (from round 1)

- Confirm the D-13 Case 17 "fix" wording. It does not block.

## Integration (round 2)

- Base checked: `origin/personal` @ `eebbc2b8ee`. That is 2 commits past round 1's `d785ded109`: the v1.5.12-beta.8 release, which bumps `autobyteus-web/package.json` from `1.5.12-beta.7` to `1.5.12-beta.8`, and autobyteus-431's delivery records.
- Checkpoint: `637534f27c`, the code reviewer's CRR-007/CRR-008 records.
- Merge: `0714ea1e68`, with no conflicts.
- Post-integration check DEL-R2-01 (`evidence/delivery/DEL-R2-01-focused-checks.txt`):
  - the round-2 web specs, 5 files, 25/25 passed;
  - the round-2 server unit tests (collaboration statuses, peer address resolver, peer client, request origin), 4 files, 33/33 passed.
  - The base changed only the version field, so nothing behaves differently.

## Integration (round 1)

See DR-001: `origin/personal` @ `2783491938` was merged at `3551d69ee7` (one probe conflict, resolved to the identical value). DEL-01 mobile-shell 19/19, DEL-02 node-vocabulary 5/5, DEL-03 builds.

## Verification Summary

- Round 2 was judged from the evidence by delivery. I followed AC-009a…d and AC-020…023 to their cases and opened the files for the critical ones:
  - T2-01 raw `mobile-shell-probe.json` MSP-20, and the screenshot `MSP-20-phone-child-running.png`;
  - T2-02 NP-13 summary and the screenshot `NP-13-change-address-host-refused.png`;
  - T2-04's `peer-host-refused` line.
- Every critical criterion is directly proven. Final confidence is 95% in every category. No user check is needed.
- One non-blocking note: the report's T2-01 row quotes the stop timings of debug run `T2-01-debug3` (1942/2364 ms). The authoritative run reads 1897/2324 ms. Both are well within one poll, so the judgement is unchanged.
- Round 1: see DR-001.

## Documentation Sync Summary

- Docs sync report: `tickets/done/small-follow-ups-batch-426/docs-sync-report.md`, with sections for rounds 1 and 2.
- Round 2 result: `Updated` — `autobyteus-web/docs/workspace_layout.md`, `remote_access.md`, `settings.md`, `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md`, `remote_collaboration.md`, `docs/android_mobile_access.md`.

## Release Notes Status

- Release notes: `tickets/done/small-follow-ups-batch-426/release-notes.md`. It covers both rounds and has no `## What you need to do` section.
- Release decision: no release. The Task says "release only on the user's word", and RELEASE.md's default is no release. A beta or stable release is available on request. v1.5.12-beta.8 was cut before round 2 and includes round 1.
