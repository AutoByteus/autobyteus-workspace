# Delivery / Release / Deployment Report — autobyteus-348 (runtime-switch-members)

## Release / Publication / Deployment Scope

Repository finalization into `origin/personal` only. No release, tag, publication or deployment.

## Project Release Guide

- `RELEASE.md` as on `origin/personal` @ `c952758a81`. Deviations: `None`. Proposed guide fixes: `None`.

## Handoff Summary

- `handoff-summary.md` (`Updated`); `delivery-revision-record.md` (`DR-001`); `docs-sync-report.md`

## Initial Delivery Integration Refresh

- Latest tracked remote base `c952758a81`; advanced beyond the ticket's base: `No` (0 commits behind); integration `Already current`; checkpoint commit `Not needed`.
- Post-integration executable checks rerun on the head: `Yes`, `Passed` (`evidence/DEL-01-post-integration-checks.md`). Delivery edits started on the current state: `Yes`. Blocker: none.

## Verification

- Evidence judged: `Sufficient` (execution report scorecard 92%, no category below 90%; the default 95% is not met because Grok, Antigravity and native are scripted, which needs accounts the team does not have).

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 Team default and member | EX-04, R0, RSM-01, LV-01; `API-02r2-extended-built-server.log`, `API-03r2-live-claude-codex.log`; rerun of 17 built-server tests | `✓ EX-04: a configured Team's default runtime edit …`, `✓ LV-01: a Team member, Claude -> Codex -> Claude`, segments `claude_agent_sdk` then `codex_app_server`; RSM-01 saved row `… Antigravity CLI …`, one marker live and reopened | Proven |
| AC-002 Org members | EX-01, LV-02, RSM-02, RSM-03, API-07 | native target failing after its instruction was written is retried with the previous file byte-identical; `saveNote: null` after Save (round-1 defect F-1 closed); runtime menu on the nested row lists five runtimes | Proven |
| AC-004, AC-007 delegated copies, Team copies | EX-02, EX-03, LV-03, RSM-04, RSM-06 | restart between save and first message; opposite wake orders; the saved row shows the choice at once (F-2 closed) | Proven |
| AC-005, AC-006 | LV-01..03, EX-01..04, X-A..X-D mutations | exact-id equality on both live segments; each mutation fails the matching case | Proven |
| AC-003 undo | EX-05, RSM-07 (`API-04r2-mutation-undo-guard.log`) | binding and session return, no marker or segment afterwards; reverting the fix fails RSM-07 | Proven for Team and Org members; a copy's undo is unit-tested only |
| AC-008 chat | RSM-01..04 | live and reopened chats show the marker | Proven for the chat; journal and memory-search reads beyond it not shown |
| AC-009 old names gone | not proven by API/E2E | I ran the grep (no hit outside tickets and `dist/`) and `codegen:check` (current) | Proven by delivery |
| AC-010 | R0, DCP-001..005, RSM-06 | model-only save of a stopped copy writes no marker | Proven (the stale probe `existing-run-model-config` fails 4 checks as at the base: FU-C2) |

- More evidence requested: `None`; user check needed: `No`. Re-verification after later re-integration: `Not needed` unless `origin/personal` moves before the push.

## Release Decision

- `No release`: the user did not ask; the guide's default.

## Docs Sync Result

- `docs-sync-report.md`: ten docs updated in the ticket, verified; `release-notes.md` added.

## Ticket State Transition

- Moved to `tickets/done/runtime-switch-members`: `Yes`

## Version / Tag / Release Commit

Not applicable: no release.

## Repository Finalization

TBD

## Release / Publication / Deployment

- Applicable: `No`; result `Not required`; release notes handoff `Not required`

## Post-Finalization Cleanup

TBD

## Release Notes Summary

- `release-notes.md` written; status `Updated` (not used: no release)

## Environment Or Persisted-Data Transition Notes

- Old stored shapes read unchanged; no migration; delivery action `None`. The tracked `dist/` of the two stream-contract packages equals a fresh build of the committed sources.

## Rollback Criteria

Revert the merge on `personal` if a member's switch corrupts its raw traces or chat in a way the tests did not show. Runs switched under this version keep their `runtime_switch` segments and marker; how an older build reads them was not tested. Nothing is released.

## Final Status

TBD
