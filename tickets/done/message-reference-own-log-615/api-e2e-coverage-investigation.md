# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-002)
- Investigation Notes: `investigation-notes.md`; `root-cause-report.md`; `test-gap-report.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-001, Pass)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Code Review Report: `code-review-report.md` (CRR-001, Pass)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 1
- Trigger: CRR-001 Pass (Medium / High), message from `/code_reviewer`
- Code validated: branch `codex/message-reference-own-log-615`, code `0629b5c631` (later commits: ticket records; this stage's TESTING.md `725891acc1`), base `origin/personal` `1956c232c8`
- Order note: the TESTING.md rule (AC-008) was written before this file; it is a documentation rule the requirements fix in content, and nothing else waited on it.

## Current Requirement And Design Basis

One server owner of "the messages of the view of run X" serves both the Messages tab and its reference read, through one route; one web builder makes the link from the list's key; the viewer tells a missing message from a missing file (REQ-001…REQ-005). REQ-006: a permanent property test (AC-007) and the TESTING.md rule (AC-008).

## Supported Scenarios And Real Usage

- SCN-001…004 as designed.
- Real-use addition: none beyond the design's; the observed case (a delegated SE task team member's tab) is AC-007's "agent: task team member" view on the built server.
- Observation checked: a delegated task team lead's own tab does not list its delegator's message to it (IMP-09 "listed in"). That is `MessageViewScope`'s documented rule (461 SR-074, 565): a Team view shows a message when both agents are in its tree or the counterpart is a past participant; the delegator is outside the delegated team's tree. Message listing is out of this ticket's scope; not a finding.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| API / transport | Yes | one REST reference route; three removed | units, AC-007 built-server E2E, whole E2E | a stale `dist` | AC-007 on a fresh build |
| Request gate (NA-7) | Yes (new path) | owner-and-phone by fall-through | whole server E2E (IMP-06b) | — | — |
| Frontend | Yes | one link builder, the viewer's two texts, the phone prefix | web units, IMP-07 desktop render, IMP-08 phone | — | — |
| Desktop shell | No | the renderer fetches through `authorizedResourceUrl`, the same in Electron | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (rerun by impact; request-gate row → the whole server E2E suite; browser probes). The built-server E2E needs a fresh `pnpm -C autobyteus-server-ts build` (the reviewer's point: a stale `dist` proves nothing).
- Build inputs changed: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/projects/message-references-every-view.e2e.test.ts` (MRV-1, gated) | every listed reference in 12 views answers its bytes | AC-007, AC-001, AC-002 | Still Valid | IMP-09, IMP-10 (control) | Rerun on a fresh build |
| `closed-run-attachments` E2E (gated) | references of closed runs | AC-006-adjacent | Still Valid | IMP-06e | Rerun with MRV-1 |
| server focused, web focused, whole suites | REQ-001…005 | — | Still Valid | IMP-02…IMP-14 (`0629b5c631`) | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | fresh server build | — | `rm -rf dist; pnpm -C autobyteus-server-ts build` | the reviewer's condition |
| API-01 | AC-001…AC-006 | reused checks | Reused | IMP-02…IMP-14 | on the code under test |
| API-02 | AC-008 | TESTING.md | Durable doc | a "Choosing the path" row | the rule's owner |
| API-03 | AC-007, AC-001, AC-002 | built server, scripted AGY | Existing (gated) | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> vitest run message-references-every-view closed-run-attachments` | the property on a fresh build |

- Test progress log needed: `Yes`

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| The observed case on the founder's own stack | never his running server or data | low: AC-007 covers the same view kind on the built server | No | — |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (TESTING.md)
- Reroute Required Before Validation Execution: `No`
