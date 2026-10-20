# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative. This record indexes every completed API/E2E validation result.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-001, round 1 | SR-001..SR-004, ARCH-REV-001..002, IR-001, CRR-001 | N/A | Pass / 95.0% |
| API-REV-002 | `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-003, round 2 (INT-001 merge, Secret Gate) | IR-002, CRR-002, CRR-003, DR-001 | Pass / 95.0% | Pass / 95.0% |

## Revision Entries

### API-REV-001 — Baseline: the upgrade around real runs, `send_message_to` by run id, the removed UI

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001, Pass), round 1
- Triggering finding or case IDs: the handoff's "Downstream Coverage Hints" and the code reviewer's list:
  - AC-003/AC-004 upgrade;
  - BEH-003 through real tool calls;
  - existing-run and Team-member composers;
  - Settings Basics and Advanced;
  - Memory page.
- Related revision IDs: SR-004, ARCH-REV-002, IR-001, CRR-001
- Why recorded: first API/E2E validation.
- Coverage decisions or durable test paths changed:
  - added `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs` (SIR-001, SIR-002);
  - updated `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` (registration, restart hook, header);
  - updated `autobyteus-web/package.json`.
- Cases: API-01..API-12 reused (IMP-01..IMP-12); API-13..API-15 existing probes rerun; API-16, API-17 new.
- Commands, environment, fixture, or broader-validation delta: browser probes on the current `dist` (IMP-05); the feature data written around real runs with the fixture module's shapes.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: all (new)
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95.0%
- New or remaining failure IDs: none in this ticket. Found outside it: FU-004 (six stale fixture probes) and FU-005 (intermittent DCP-003 refresh), in `follow-ups.md`.
- Recommended owner: `/software_engineering_team/code_reviewer` (proportional test-code review), per `get_handoff_rules`
- Remaining risks, blocked evidence, or untested scope:
  - AC-004's user check after his backup; AC-005 (delivery);
  - `cross-scope-agent-mentions-live-probe` not run (needs a signed-in runtime CLI);
  - packaged desktop upgrade not run (no shell change).

### API-REV-002 — Rerun by impact on the INT-001 merge

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-003, Pass), round 2. Merge `5cfccd66c7` (base's update notifications) and Secret Gate entry `bda3731947`; head `2147206408`.
- Related revision IDs: IR-002, CRR-002 (test-code review of API-REV-001: Pass), CRR-003, DR-001.
- Why recorded: product code changed after API-REV-001.
- Coverage decisions or durable test paths changed: none.
- Cases:
  - **Reused:** API-01..API-06, API-08, API-09, API-11 from IMP-14..IMP-21 on the merge, and SIR-001/SIR-002 from IMP-22. API-10 and API-12 still hold.
  - **Rerun:** API-07, Pass 19/19. API-13: 3 pass, 5 fail on stale fixtures (FU-004). API-14: 16 pass, PT-E2E-013 fails (FU-006). API-15..API-17: 18 pass; DCP-003 and DCR-003 fail (FU-005); SIR-001/002 pass.
  - **Cause investigation:** FU-005 was reproduced with temporary diagnostics (3 of 6 looped Org saves). The cause is the stream reconnect snapshot during the post-save re-read; the diagnostics were removed.
- Commands, environment, fixture, or broader-validation delta: ENV-3 (merged build).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| DCP-003 intermittent (FU-005) | Outside this ticket, cause unknown | Still outside this ticket; cause established (Org stream reconnect snapshot during the post-save re-read). Code not in this diff | API-15, `API-15-r2-org-save-reread-cause.txt` |

- Canonical artifacts updated: the execution report (Round, environments, round-2 notes in Cases, scorecard note, Latest Authoritative Result, durable coverage note), the investigation meta, `follow-ups.md` (FU-004 note, FU-005 cause, FU-006), and the progress log.
- Prior result and confidence: Pass / 95.0%.
- Current result and confidence: Pass / 95.0%.
- New or remaining failure IDs: none in this ticket; FU-004, FU-005, FU-006 outside it.
- Recommended owner: `/software_engineering_team/code_reviewer`, per `get_handoff_rules`. Test-code review: Not Applicable this round.
- Remaining risks: AC-004's user check and AC-005 (delivery).
