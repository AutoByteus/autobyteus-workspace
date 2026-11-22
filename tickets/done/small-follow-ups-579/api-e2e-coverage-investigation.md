# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001)
- Supplemental Task Artifacts: `solution-designer-handoff.md`; `follow-ups.md` (FU-001)
- Design Review Report: N/A (direct route)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Code Review Report: N/A (direct route)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (Medium / Low, direct route), message from `/implementation_engineer`
- Code validated: branch `codex/small-follow-ups-579`, HEAD `a9195932c0` (code `4c77e3e78a`), base `origin/personal` `f2c0d2a902`

## Current Requirement And Design Basis

I-1: `fileContent` answers refusals as GraphQL errors, the viewer shows its error state, error-shaped file text opens as text (REQ-001/002). I-2: each busy-Mac E2E failure gets the limit or wait its measured cause calls for (REQ-003, DEC-002). I-3: file-event time-outs labeled `ENVIRONMENT:`/`INCONCLUSIVE:` (REQ-004). I-4: the race test waits on conditions (REQ-005). I-5: cleanup waits for writers (REQ-006). I-6: TESTING.md documents the Claude throwaway home (REQ-007), written by API/E2E (DEC-003).

## Supported Scenarios And Real Usage

- SCN-001…003 as designed.
- Real-use additions:
  - **S-1 a semantic memory link to a missing file** (AC-001's third trigger) through the rendered Memory page: `semantic-memory-view-probe.mjs` SMV-104 drives exactly this path, and its expectation of "File not found" now meets the viewer's error state instead of the raw JSON.
  - **S-2 the packaged app's file preview** (`event-monitor-file-preview-probe.mjs` N-009): its assertion was changed for the new refusal and never run.
- Contrived: none.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `fileContent` refusals (server), store read path, demo | Changed | REQ-001/002 | units + E2E (IMP-04/05/06), rendered (IMP-07); rendered probe SMV-104; packaged probe N-009 |
| Test helpers and seven I-2 files, three I-3 users, race test, cleanup | Changed (tests only) | REQ-003…006 | whole suites (IMP-03/04), negative controls (IMP-12); integration suite (watcher test changed, not yet run) |
| TESTING.md | Changed (API/E2E's) | REQ-007 | review |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| API / transport | Yes | `fileContent` error form | E2E | — | — |
| Frontend component / state | Yes | store read path, error state spacing | web units, IMP-07 | the Memory page's semantic view link | rendered probe |
| Desktop shell | Possibly | the packaged app's preview of a refused file | none (N-009 not run) | — | packaged probe |
| Test infrastructure | Yes | helpers, limits, cleanup | IMP-03/04/09–12 | the busy-`fseventsd` regime | see Not Tested |

## Project Execution Discovery

- Testing guideline: `TESTING.md`. Rules used: rerun by impact; Rule 9; busy-Mac rule; browser probes; packaged Electron harness for the desktop probe.
- Host state at the start: load 7, `fseventsd` 0.1% CPU, 29 MB resident: the busy regime of 576/583 (99–170%) is absent.
- Build inputs changed: none (`git diff --name-only f2c0d2a902...HEAD`).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| server unit, web unit, server E2E (whole) | regression and the changed tests | all | Still Valid | IMP-03 (`02ee9c2237`), IMP-04 (`02ee9c2237`), IMP-05 (`4c77e3e78a`); later commits change no server code | Reuse |
| `file-system-watcher.integration.test.ts` (changed: shared probe) | its labels | AC-004 | Still Valid | IMP-12 control | Run in the whole integration suite (not run by implementation) |
| `semantic-memory-view-probe.mjs` SMV-104 | a link to a missing file shows "File not found" | AC-001 | Still Valid; now meets the error state | — | Run |
| `event-monitor-file-preview-probe.mjs` N-009 | the refusal's GraphQL error and code | AC-001 | Unclear (never run) | — | Run (packaged build) |
| `agent-semantic-memory.e2e` SM-11 (changed) | the GraphQL error | AC-001 | Still Valid | IMP-06 | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | server build | — | `pnpm -C autobyteus-server-ts build` | probe |
| API-01 | AC-001…AC-006 | reused checks | Reused | IMP-01…IMP-12 | ran on the code under test |
| API-02 | AC-007 | TESTING.md | Durable doc | the Claude throwaway-home entry | DEC-003 |
| API-03 | AC-004 (regression) | server integration | Existing | `test:integration` | the watcher test changed |
| API-04 | AC-001 (S-1) | rendered Memory page | Durable probe | `semantic-memory-view-probe.mjs` | the semantic link path |
| API-05 | AC-001 (S-2) | packaged app | Durable probe | `event-monitor-file-preview-probe.mjs` | N-009 never run |
| API-06 | AC-003 | the whole server E2E on a busy host | Not Tested here | — | see below |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

- Update: `TESTING.md` "Test-only runtime CLI settings": the Claude throwaway home (REQ-007).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-003's "the whole server E2E suite run once on the busy host" | the regime (`fseventsd` 99–170%) is absent here (0.1%), the implementation's emulation reached only ~60%, driving the shared host harder would disturb other agents' work, and changing `fseventsd` or host settings is out of scope | low: the changes only raise named limits for slow answers or replace fixed waits; a real regression still fails | No | evidence decision requested from the Solution Designer (When A Check Cannot Run Here) |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (independent cases; AC-003's busy-host run waits for the evidence decision)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (TESTING.md)
- Reroute Required Before Validation Execution: `No`
