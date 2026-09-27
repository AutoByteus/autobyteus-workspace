# API/E2E Revision Record — `grok-build-runtime-support`

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer` CRR-001 Pass → API/E2E round 1 | SR-005..SR-008, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 82% |
| API-REV-002 | `/code_reviewer` CRR-003 Pass → API/E2E round 2 | SR-009..SR-011, ARCH-REV-003, IR-002, CRR-003 | Fail / 82% | Pass / 95% |

## Revision Entries

### API-REV-001 — Initial baseline: live Grok standalone/team/org pass; AC-012 and AC-004 deny fail

- Triggering role, report, round: `/code_reviewer`, `code-review-report.md` (CRR-001), round 1.
- Triggering scenario IDs: residual risks from CRR-001 (AC-001, AC-003..AC-006, AC-008, AC-009, AC-012, AC-013, AC-015; CAND-06).
- Related revisions: SR-008, ARCH-REV-002, IR-001, CRR-001.
- Why recorded: first completed API/E2E result.
- Durable coverage: updated `tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts`; added `tests/e2e/helpers/grok-fake-cli.ts`, `tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` (default CI, zero cost), `tests/e2e/runtime/grok-build-live-runtime.e2e.test.ts` (gated `RUN_GROK_E2E=1`).
- Scenarios: GE2E-001..004, L0..L6, P1..P3 executed; B1/B2 not run (AC-015 de-scoped by the user on 2026-09-26).
- Commands/environment: see execution report; live runs via `GROK_BUILD_COMMAND=/tmp/grok-api-e2e/tap/grok`; ≈ US$0.57 Grok spend.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution coverage report, test-case ledger, `evidence/api-e2e/`.
- Prior result and confidence: N/A
- Current result and confidence: Fail / 82%
- New failure IDs: F-1 (AC-012 provider auth text lost at run start — Local Fix), F-2 (AC-004 deny ends the turn — Requirement/Design), F-3 (Grok auto-allows routine commands — Requirement/Design). F-4 (application platform / Grok credential readiness) recorded as separate-ticket candidate.
- Recommended recipient: `/code_reviewer` (failure-origin review).
- Remaining risks: AC-015 untested (user de-scoped); `web_search` not demonstrable on this host/plan; Grok permission policy may keep changing without a CLI version change.

### API-REV-002 — Round 2: AC-012 and amended AC-004 proven; live standalone/team/org pass on `d7d4aa2ad`

- Triggering role, report, round: `/code_reviewer`, `code-review-report.md` "Implementation Re-Review (Round 3, CRR-003)"; API/E2E round 2.
- Triggering finding IDs: round-1 F-1 (AC-012), F-2 (AC-004 deny), F-3 (REQ-005 premise), F-4 (AC-015).
- Related revisions: SR-009 (AC-015 deferred by user), SR-011 (AC-004 amended, REQ-005 clarified), ARCH-REV-003, IR-002, CRR-003.
- Why recorded: rerun after rework.
- Coverage changes: `grok-build-runtime-replay.e2e.test.ts` +GE2E-005 (deny → `TURN_COMPLETED` `cancelled` → next turn) and +GE2E-006 (unauth `session/new` → provider text), both verified failing on `2b31b046d`; `grok-build-live-runtime.e2e.test.ts` step B now hard-asserts `TURN_COMPLETED` and no `TURN_INTERRUPTED`.
- Scenarios rechecked: GE2E-001..004, P1, L0..L6; added GE2E-005, GE2E-006.
- Commands/environment delta: typecheck + units + zero-cost e2e; replay ×3 and negative check; real unauth server probe; live standalone and live team + org via tap; default `tests/e2e/runtime` folder. Round-2 Grok spend ≈ US$0.25.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-1 AC-012 generic "Failed to prepare agent run" | Local Fix | Resolved: real unauth Grok → `AgentCreationError: Grok Build: Authentication required: no auth method id provided`; durable GE2E-006 | `evidence/api-e2e/ac012-noauth-server-probe-r2.txt`, replay logs |
| F-2 AC-004 deny → `TURN_INTERRUPTED` | Requirement Gap / Design Impact | Resolved by SR-011 + CR-006: live deny → `TURN_COMPLETED {provider_stop_reason:"cancelled"}`, next message works; user interrupt still interrupted (101 ms); durable GE2E-005 | `r2-live-standalone-excerpt.txt` |
| F-3 Grok auto-allows routine commands | Requirement Gap / Design Impact | Resolved by REQ-005 clarification (Grok's policy decides which calls prompt; every raised request is surfaced) — behavior already verified (rm -rf and web_fetch requests bridged) | `approval-bisect-results.txt` |
| F-4 AC-015 application launch | De-scoped by user | Deferred by the user (SR-009); known gap recorded in AC-015; separate-ticket note sent to `/solution_designer` | round-1 report |

- Canonical artifacts updated: coverage investigation ("Round 2 Update"), execution coverage report (rewritten to round 2), ledger events 10–14, `evidence/api-e2e/r2-*`, `ac012-*-r2*`.
- Prior result and confidence: Fail / 82%
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none
- Recommended recipient: `/code_reviewer` (proportional test-code review)
- Remaining risks: `web_search` not demonstrable on this plan; Grok permission policy may drift; application launch deferred.
