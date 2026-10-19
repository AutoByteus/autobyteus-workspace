# API/E2E Coverage Investigation — autobyteus-140 `agent-run-input-state-cleanup`

Paths are relative to the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-input-state-cleanup/tickets/in-progress/agent-run-input-state-cleanup/` unless noted. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-input-state-cleanup`, branch `codex/agent-run-input-state-cleanup`, HEAD `24b6017a7e` (code `a3c4982721`; `24b6017a7e` adds only the ticket folder), base `origin/personal` `2763e7c678`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts: `evidence/test-double-drift-typecheck-probe.txt` (FU-001 scope)
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct Small/Low route)
- Implementation Handoff: `implementation-handoff.md` (IR-001, Checks Run IMP-01..10)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- API/E2E Revision Record: `api-e2e-revision-record.md`; current `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round: 1; trigger: Implementation Complete IR-001 (direct route)

## Routing Classification

- Task size `Small`; architectural risk `Low`; input route `Direct Low-Risk`; successful-output route `Delivery`; test-code review `Not Required — direct low-risk route`.

## Current Requirement And Design Basis

A refactor with no behavior change (REQ-005):
- **Production:** `AgentRun`'s input-state projection gets named steps:
  - `readInputStateContent` (entries, then `compactionRecovery.reconcile()`);
  - `advanceInputRevision`, the only writer of the revision;
  - `refreshInputState`;
  - a pure `inputStateEvent(state)`;
  - `reconcileAndPublishInputState`, used at the three former consecutive pairs only.
- **Tests:** six test doubles move to `{ activeTurnAppend: "unsupported" }`; `ScriptedAgentRunBackend` conforms to `AgentRunBackend`; one test comment is corrected.
- **Criteria:** AC-001..AC-003 are code-reading criteria, AC-004 is grep plus review, and AC-005 requires the suites green with no assertion changed.
- **Preserved:** BEH-001 (PB-001 publish-once, snapshot on subscribe, pull read advances the revision) and all PB-001 and autobyteus-139 tests.

## Supported Scenarios And Real Usage

- SCN-001 (WebSocket and root-view consumers of input state): live run activity, subscribe and pull read.
- Added from investigating the implementation: SCN-A1, a real native-runtime text stream with a queued message mid-reply and a second subscriber. This is the PB-001 live journey, the most direct proof that the publish-once behavior is unchanged with real runtime batches.
- No contrived scenarios.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 input-state publication | Preserved (structure only) | diff `c2e8335c42` | Code reading (CODE-01), reused suites, own reruns, mutation check, live stream |
| BEH-002 test doubles | Preserved (outcomes) | diff `a3c4982721` | grep, reused IMP-06, IMP-02 |

## Changed Surface And Boundary Classification

| Surface | Affected? | Changed Boundary | Repository Evidence | Material Risk Not Exercised | Candidate Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `AgentRun` private methods | Unit (`agent-run.test.ts` input-state cases), socket integration | Real runtime batch mixes (compaction recovery, dispatch) | Live API (one PB-001 run) |
| API / transport | No (frames unchanged) | — | PB-001 socket file | — | — |
| Frontend / desktop | No | — | — | — | — |
| Persisted data | No (`Not Affected`) | — | — | — | — |

## Project Execution Discovery

- Testing guideline: this worktree's `TESTING.md` (rerun by impact; Rule 9 failure causes; local model rules). No closer `TESTING*.md`.
- Commands: as in the implementation's Checks Run; live: the PB-001 probe on the built `dist/app.js` with a clean env and LM Studio. `dist` was built at 16:23 (after `c2e8335c42`) and contains `refreshInputState` and `reconcileAndPublishInputState`.
- LM Studio: no model is loaded at start, so a run JIT-loads qwen3.6-35b-a3b and must unload it afterwards. Another person's instance (`iso-65187-14ae`) is running; I won't touch it.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Validity | Action |
| --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/agent-run.test.ts` (incl. PB-001 input-state publication cases) | Publish-once, snapshot, pull read | BEH-001 | Still Valid (unchanged) | Reuse IMP-03; own rerun |
| `tests/integration/agent/agent-status-websocket.integration.test.ts` | PB-001 socket cadence through `AgentRun` | BEH-001 | Still Valid (comment + double changed, assertions unchanged) | Reuse IMP-04; own rerun |
| `tests/integration/agent/chat-socket-content-cadence.integration.test.ts` | Sequenced sockets | BEH-001 | Still Valid | Reuse IMP-05 |
| The 6 edited test files | Doubles on the current contract | BEH-002 | Still Valid (contract-conforming; assertions unchanged) | Reuse IMP-06 |
| Server `typecheck`, `test:unit`, `test:integration` | Regression | AC-005 | Still Valid | Reuse IMP-01, IMP-07, IMP-09 |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps (for `Reused`: the check ID) | Why |
| --- | --- | --- | --- | --- | --- |
| CODE-01 | AC-001, AC-002, AC-003, AC-004 | Code reading of the diff (direct route: no independent code review) | Journey (review) | `git diff 2763e7c678 a3c4982721`; call-site comparison of base vs HEAD; `grep -rn start_only` | Code-reading criteria |
| REPO-01 | AC-005 | `agent-run.test.ts`, `agent-status-websocket` | Existing Test | Own rerun at HEAD | Independent confirmation of the most direct tests |
| REPO-02..07 | AC-005, AC-004 | as IMP rows | Reused | IMP-01 (typecheck), IMP-03 (agent-execution units 1468), IMP-04 (PB-001 socket ×3), IMP-05 (cadence ×3), IMP-06 (6 files 99), IMP-07 (`test:unit` 5950), IMP-08/09 (`test:integration` 415), IMP-10 (grep) | Ran at `a3c4982721`; HEAD adds only the ticket folder; evidence has headers and look-for lines |
| MUT-01 | AC-005 (coverage quality) | `agent-run.ts` temporary mutants | Temporary Probe | (a) `advanceInputRevision` never advances; (b) the read order swapped (reconcile before entries); run `agent-run.test.ts` + PB-001 socket file; restore | Shows whether the unchanged tests would catch a behavior change in the refactored steps; not durable (mutants are temporary) |
| LIVE-01 | AC-005 / BEH-001 on a real stream | Built server + LM Studio, `/ws/agent` | Temporary Probe | PB-001 `live-stream-probe.mjs` (copied with the main-port fix) | Needs a local model; nondeterministic timing |

## Durable Coverage To Add / Update / Remove

None.

## Broader Validation Decision

- `Required`, scaled to the risk: one live PB-001 run (LIVE-01). The repository evidence exercises the real `AgentRun` with scripted backends only. A real runtime's batch mix is the remaining risk for an `AgentRun` refactor, and the probe is cheap. No browser or desktop run: there is no UI or transport change.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only? | Follow-up |
| --- | --- | --- | --- | --- |
| Wider test-double drift | Out of scope (FU-001 → autobyteus-65) | — | No | autobyteus-65 |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed: `Yes`. Durable coverage change: `No`. Reroute: `No`.
