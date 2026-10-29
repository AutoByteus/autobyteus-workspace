# Delivery Revision Record

Ticket `remove-skill-improvement` (autobyteus-205). Task size `Large`, architectural risk `High`, route `Reviewed`.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Code reviewer's delivery handoff (CRR-002 Pass; API-REV-001 Pass) | N/A | `Blocked`: INT-001 merge conflicts with `origin/personal`, routed as `Local Fix` | `release-deployment-report.md`, this record |
| DR-002 | Code reviewer's handoff after INT-001 (CRR-003 Pass; API-REV-002 Pass; CRR-004 N/A) | DR-001 `Blocked` | `Blocked` on evidence: the origin of the DCP-003/DCR-003 Org save failures (FU-005) is not established; discriminating base run requested from API/E2E | this record |
| DR-003 | API/E2E's DR-002 result (API-REV-003: FU-005 pre-existing on base) | DR-002 `Blocked` on evidence | Verified; docs synced; finalized and beta released (see the report) | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, this record |
| DR-004 | Release workflows completed | DR-003 | Beta `v1.5.8-beta.4` published completely; waiting for the user's data check | `release-deployment-report.md`, this record |

## Revision Entries

### DR-001: initial delivery, blocked at the latest-base integration refresh

- Delivery round and trigger: round 1. Message from `/software_engineering_team/code_reviewer` (CRR-002 Pass); ticket head `b17fe367f0`.
- Triggering upstream report, verification, or evidence: `api-e2e-test-review-report.md` (CRR-002), `api-e2e-execution-coverage-report.md` (API-REV-001, 95.0%), `code-review-report.md` (CRR-001).
- Prior authoritative result: N/A
- Current authoritative result: `Blocked`. Merging `origin/personal` @ `3b2c86ca9e` (20 commits) conflicted in `schema.ts`, `server-settings-service.ts` and `ServerSettingsBasicsPanel.vue`. In each, base's Update Notifications additions sit next to the Skill Improvement lines this ticket removes (INT-001). The merge was aborted.
- Docs sync report: not started
- Handoff summary: not started
- Release/publication/deployment report: `release-deployment-report.md`
- Integration and post-integration verification: `Blocked` (INT-001)
- Verification and finalization state: not started. Nothing pushed (the ticket branch has never been pushed), merged or released.
- Terminal return to the Solution Designer: `Not yet eligible`
- Terminal return message/reference: N/A
- Why this baseline was recorded: it records the delivery start and the integration blocker.
- Next recipient/action: the implementation engineer merges `origin/personal`, resolves INT-001 (keep base's Update Notifications lines, keep the Skill Improvement lines removed), reruns the affected checks, then continues through the normal review route. The Secret Gate (`scripts/check_secrets.sh origin/personal..HEAD`) applies before the branch's first push.
- Remaining blockers, rollback concerns, or untested scope: INT-001. AC-004's last part needs the user's check after a released build.

### DR-002: integrated; evidence check found an unclassified regression signal

- Delivery round and trigger: round 2. Message from `/software_engineering_team/code_reviewer` (CRR-003 Pass, API-REV-002 Pass 95.0%, CRR-004 N/A); head `02ece9ee0e`.
- Prior authoritative result: DR-001 `Blocked` (INT-001)
- Integration: INT-001 is resolved by merge `5cfccd66c7` (IR-002) and passed CRR-003. `origin/personal` is still `3b2c86ca9e` (0 behind).
- Evidence judgement:
  - AC-001..AC-004 are proven from the evidence. `API-15-17-r2-probe-evidence.json`:
    - SIR-001: `send_message_to` returns `DELIVERED`, `TARGET_AGENT_RUN_NOT_ACTIVE` and `TARGET_IS_TEAM_RUN` through real tool calls.
    - SIR-002: the migration is `SUCCEEDED`, "Scanned 11; migrated 11". It deleted exactly the feature paths, including only the `skill_improvement`/`self_evolution` subfolders inside real runs, and the improver definition. `stillThere`, `changed` and `rowsChanged` are `[]`, 1201 kept files are unchanged, `.env` is exact, a second start changes nothing, the Skill Self-Evolver is kept, the retired key is refused, and the runs resumed on their own sessions.
  - Open: the same probe run is `18 Pass, 2 Fail`: DCP-003 and DCR-003, "Timed out waiting for saved" (FU-005). Round 1, before the merge, had 1 failure in the full run and passes on repetition. Round 2, after merging base's update notifications, fails in 3 of 6 looped Org saves. The cause is a race (the Org stream reconnects during the post-save re-read), but whether the reconnect comes from this ticket's change or from base was never checked: no run on `origin/personal` without this ticket.
- Action: evidence requested from API/E2E. Loop DCP-003 and DCR-003 on `origin/personal` @ `3b2c86ca9e` without this ticket. If it fails at a similar rate, FU-005 is pre-existing in base (a follow-up) and delivery continues. If not, it is this ticket's defect and goes to implementation.
- Terminal return to the Solution Designer: `Not yet eligible`
- Release decision: `Beta`, decided in advance by the user. It applies after verification.

### DR-003: verified, finalized and released as beta

- Trigger: API/E2E's message with API-REV-003. API-18 matched base vs ticket: 4/12 vs 3/12 Org save failures with the same sequence, so FU-005 is pre-existing in base.
- Prior authoritative result: DR-002 (`Blocked` on the FU-005 origin)
- Current authoritative result: verification complete (AC-001..AC-005; the user's own data check follows the beta). Docs synced with no delivery edits. Ticket archived. Finalization and the advance-decided beta follow; the outcome is in `release-deployment-report.md`.
- Terminal return to the Solution Designer: after the release and the user's check

### DR-004: beta v1.5.8-beta.4 published

- Result: merge `562ad15070` and release commit `3b9014215e` are on `origin/personal`, with tag `v1.5.8-beta.4`. All four workflows succeeded. The pre-release has 17 assets, and Docker `1.5.8-beta.4` = `:beta`. The Secret Gate passed before the first push, on the merged state and over `v1.5.8-beta.3..HEAD`.
- Terminal return to the Solution Designer: `Not yet eligible` (the user's data check of AC-004, then cleanup)
