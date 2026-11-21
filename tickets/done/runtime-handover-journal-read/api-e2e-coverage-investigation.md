# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md` (PRB-001, PRB-002)
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts: `solution-designer-handoff.md`; `probes/handover-transition.probe.test.ts` (evidence)
- Design Review Report: N/A (direct route)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Code Review Report: N/A (direct route)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (Small / Low, direct route), message from `/implementation_engineer`
- Code validated: branch `codex/runtime-handover-journal-read-583`, HEAD `5617257773` (code `014e281990`), base `origin/personal` `90c4958a35`

## Current Requirement And Design Basis

After a runtime switch, the hand-over notice names the newest closed journal file with work entries (by name and path), tells the agent to read it completely, first line to last, in parts if long, before replying or continuing, says the open file starts with this hand-over, keeps listing every file, gives no read instruction when no closed file holds work, and keeps its delivery (REQ-001…REQ-006).

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001…SCN-004.
- Real-use scenario the live check uses (SCN-003): a run whose previous era's journal has more than 2,000 lines (the founder's measured maximum is 3,001 lines, 393 KB; PRB-002), switched while stopped to a live runtime, then one neutral user message ("Please continue with the work."). The message does not mention the journal: the notice alone must bring the read.
- Contrived: none.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Notice file choice and text (builder) | Changed | REQ-001…REQ-005 | units (IMP-02, reused); built-server MS-01 (IMP-03, reused) |
| `workEntryCount` in `listJournalFiles` | Added | REQ-001 | units (IMP-02); the journal view's readers (IMP-04) |
| What a real agent does with the instruction | New behavior | REQ-002, AC-005 | live probe per runtime |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | builder, journal summary | units, transition test | — | whole server suites |
| API / transport | No (text inside an existing delivery) | — | MS-01 | — | — |
| External integration | Yes | the text real runtimes receive and act on | none | whether a real agent reads the file to its end | live probe (AC-005) |
| Frontend | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (worktree root). Rules used: rerun by impact; "A runtime's system prompt" row (every test that reads a composed prompt: the notice is part of the first input, not the system prompt, but its readers are the switch e2e files); gated live suites with the test vault; one runtime at a time; isolated data; never the user's CLI config (Codex gets a throwaway `CODEX_HOME` linking `auth.json`).
- Live suite pattern: `tests/e2e/runtime/runtime-switch-live.e2e.test.ts` (create, terminate, `updateStoppedAgentRunSelection`, send).
- Build inputs changed: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `runtime-handover-notice-builder.test.ts`, `runtime-handover-notice-service.test.ts`, `runtime-handover-notice-transition.test.ts`, `work-journal-reading.test.ts` | AC-001…AC-004 | REQ-001…REQ-006 | Still Valid | IMP-02 (`014e281990`) | Reuse |
| `runtime-switch-members-built-server.e2e` MS-01…05 | AC-006, delivery | REQ-006 | Still Valid | IMP-03 | Reuse; whole suite reruns |
| `runtime-switch-native-built-server.e2e`, `agent-stream-sequence` | other readers of the notice | REQ-006 | Still Valid | IMP-03 | Reuse |
| `runtime-switch-live.e2e`, `runtime-switch-members-live.e2e`, `agy-switch-back-live.e2e` (gated, paid) | live switch; assert the marker and that a journal was opened, not the notice's wording | REQ-006 | Still Valid (no old wording: `git grep` for the removed sentences finds only the builder test's negative check) | — | Not rerun: they assert nothing this change altered; the AC-005 probe covers the live path |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…AC-004, AC-006 | units, MS e2e | Reused | IMP-02, IMP-03, IMP-04 | ran on the code under test |
| API-02 | AC-005 | live switch, Codex | Temporary probe (gated, paid) | `zz-handover-read-live.probe.e2e.test.ts`, `PROBE_TARGET=codex_app_server` | the instruction's effect on a real agent |
| API-03 | AC-005 | live switch, Claude | same | `PROBE_TARGET=claude_agent_sdk` | same |
| API-04 | AC-005 | live switch, native AutoByteus | same (test vault Anthropic key) | `PROBE_TARGET=autobyteus` | same |
| API-05 | all | whole server unit suite | Existing | `pnpm -C autobyteus-server-ts test:unit` | handoff: not run |
| API-06 | all | server integration | Existing | `test:integration` | merge |
| API-07 | all | whole server E2E | Existing | root `env -i … pnpm test:e2e` | merge |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None planned: AC-005 measures model behavior, which a durable gated test would assert unreliably; the probe stays as evidence in the ticket. Durable coverage of the text is in place (IMP-02/03).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Antigravity and Grok live | Antigravity needs its own copied token and Grok a host login; the three most used runtimes are covered; a runtime that does not read fully becomes a follow-up (AC-005) | low | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
