# Delivery / Release / Deployment Report — switch-back-eexist

## Scope
Repository finalization into `origin/personal`. No release, tag or deployment.

## Project Release Guide
`RELEASE.md` on `origin/personal` @ `31aa11b241`. Deviations: none.

## Integration
- Base `31aa11b241`, not advanced beyond the ticket's base; integration `Already current`; checks in `evidence/DEL-01-post-integration-checks.md` (`Passed`).

## Verification
- Evidence judged: `Sufficient` (API/E2E 95%, no category below 93%).

| AC | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001..003 | API-01, API-02, API-03; my rerun of 31 built-server tests | RS-01..09, MS-01..05, SB-01..03 pass; four-hop RS-09 | Proven |
| AC-004, AC-005 | API-03 `API-03-switch-back-built-server.log`; unit | SB-01 failed start names EISDIR (not EEXIST), previous file byte-identical, switch stays pending, retry completes with one marker and one segment | Proven |
| AC-002 live | API-04 `API-04-live-agy-claude-agy.log` | real `agy` 1.5.3 and Claude: manifest `[antigravity_cli, claude_agent_sdk]`, record ids equal on both segments | Proven |
| fail-first | `X-mutations.log` | the compiled capsule without `fs.rm`: all three SB cases and the live run fail with `EEXIST` | Proven |
| AC-006, AC-007 | unit; API-05 | link target and workspace intact; restore from its own capsule | Proven |

- User check needed: `No`. The user's own stuck run on node 8001 was deliberately not read; it is the state before the message in RS-09, MS-05 and SB-01.

## Release Decision
`No release`: not requested; the guide's default.

## Ticket State Transition
Moved to `tickets/done/switch-back-eexist`: `Yes`.

## Repository Finalization
TBD

## Post-Finalization Cleanup
TBD

## Release Notes Summary
Not written: no release.

## Environment Or Persisted-Data Transition Notes
None. Remote state created: branch `origin/codex/switch-back-eexist`, deleted in cleanup.

## Rollback Criteria
Revert the merge on `personal`; a run that returned to Antigravity then fails again at its next message with `EEXIST`. Nothing is released.

## Final Status
TBD
