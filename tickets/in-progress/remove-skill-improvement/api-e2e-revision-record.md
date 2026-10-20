# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative. This record indexes every completed API/E2E validation result.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-001, round 1 | SR-001..SR-004, ARCH-REV-001..002, IR-001, CRR-001 | N/A | Pass / 95.0% |

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
