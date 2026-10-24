# API/E2E Coverage Investigation — Agent Input Delivery Simplification

## Investigation Meta

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification/tickets/in-progress/agent-input-delivery-simplification/`.

- Requirements Doc: `requirements-doc.md` (Approved, SR-003 baseline, re-confirmed SR-005)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-004 + SR-005 self-validation V-1..V-4)
- Supplemental Task Artifacts:
  - `probes/task-close-during-delivery.probe.ts`
  - `followup-cleanup-ticket-brief.md`
  - `handover.md`
  - `handoff-sr-005-rebootstrap.md`
  - `handoff-architecture-design-complete.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-001/002)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-003)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Code Reviewer CRR-002 Pass, HEAD `1f2758614`
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

Teammate delivery has one owner for the standalone, Team and Org roots (`RootCommunicationEngine` + per-root `RootCommunicationPort`), with one history-append protocol (`root-message-append.ts`) run under each coordinator's history lock.

Must be preserved exactly (base `46e94fdea`), per root:
- results, codes and messages;
- event order;
- persisted history bytes and recipient `message_id`/`dedupe_key`;
- duplicate and history-write-failure outcomes;
- `AgentRun` admission semantics (`postUserMessage`/`reserveUserMessage`; `admit()` keeps only reserve + commit + release);
- member activation (DTL-001..008);
- compaction recovery;
- the global router.

Removed:
- the dead `InterAgentMessageRouter`;
- `TaskAgentExecutionRegistry.reserveInput`.

The one approved behavior change is REQ-012 / AC-012 (DEC-001 = A). A Task closing, or the recipient's input closing, while a teammate message is being saved never fail-stops the root:
- The sender gets `TASK_AGENT_RESOURCE_CLOSED`, or `AGENT_RUN_NOT_ACCEPTING_INPUT` if the recipient stopped.
- The recipient never processes the message.
- The written record stays.

CR-001: a closure found under the lock before the write (the message waited behind another write) keeps the Task-closed outcome even when the forced release already dropped the held slot. Genuine post-durability failures still fail-stop.

Persisted data: `Not Affected`. Stores and validators are unchanged; envelope construction moved into the coordinators; V-2 shows byte identity with base-recorded values.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-015 (changed path SCN-005, SCN-006, SCN-014, SCN-015; others as preservation).
- Real-use scenarios added from investigating the implemented behavior:
  - **SCN-A1 (SCN-014 real trigger).** Another agent marks a Project Task DONE through `create_or_update_task`. In the test this is a separate standalone root ("Closer"), the "DONE from another root" case that TESTING.md lists as supported. Meanwhile the root's Manager is saving a run-ID message to that Task's copy. Agents set Task status (there is no UI status mutation), so this is the real trigger. The timing is forced at the history store boundary: the write is held until the closure has happened, as the race does in real use.
  - **SCN-A2 (CR-001 real trigger).** The same closure while the Manager's message waits for the history lock behind another member's teammate message write.
  - **SCN-A3.** After either race: the root keeps accepting messages, and stop/restore reads back the history.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-004 teammate delivery (all roots) | Changed (structure); outcomes preserved | REQ-007/008/013/014, AC-007/008/013 | Real teammate delivery per root through the server; baseline contract (V-2/V-3) |
| BEH-008 Task closure during save | Changed (defect fix) | REQ-012, AC-012, CR-001 | New server-level race E2E per root (SCN-A1/A2/A3) |
| BEH-001 admission validation once | Changed (internal) | REQ-002/003/004 | Existing agent-run, coordinator, compaction suites |
| BEH-005 dead router removed | Removed | REQ-009 | Run-ID messaging suites (global router), retargeted Claude active-turn test |
| BEH-006 member activation | Preserved | REQ-006 | DTL unit + gated E2E |
| BEH-007 docs | Changed | REQ-011 | Delivery/doc review (not executable) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Delivery engine, append protocol, roots' ports | Engine and per-root unit suites with real coordinators; baseline contract | Real tool/MCP sender, real Task services and closure, real runtime | Live API (scripted AGY) |
| API / transport / contract | Yes (preserved) | `send_message_to` results, WS events | Baseline contract records root events and codes | Tool result surface through MCP | Live API |
| Frontend | No | — | — | — | — |
| Process / lifecycle | Yes | Closure/stop during a held write; restore | Unit (real coordinators, controlled closure) | Real Task closure + copy stop + restore | Live API + lifecycle |
| Persisted-data transition | Not Affected | Writer call site moved | V-2 byte identity vs base record | Restore/read-back through real roots | Live API restore |
| External integration | Preserved | Teammate input to real runtimes | Unit doubles | Real provider teammate rounds | Gated live runtime suites where available |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification`, branch `codex/agent-input-delivery-simplification-v2`, HEAD `1f2758614`
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification/TESTING.md` (no closer guideline)
- Discrepancy (pre-existing): `pnpm -C autobyteus-server-ts typecheck` fails with TS6059. `tsc -p tsconfig.build.json --noEmit` is used instead.
- Secrets: none needed for scripted AGY. The optional live Claude suites use the logged-in `claude` CLI.
- Host: shared with other worktrees' test batches (load average 40–55 at start). Timing assertions must tolerate this.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Guideline | Project Task layer, gated scripted-AGY E2E commands, `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS …`, rule 9 |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted actor | `CALL_TOOL`, argv log |
| `probes/task-close-during-delivery.probe.ts` | OBS-003 reproduction | Gate at the history store write |
| Coordinators `commitMessageAppend` | Gate point | Standalone `StandaloneRootPackageStore.writeMessages`, Org `AgentOrgCommunicationMessagesV1Store.write`, Team `TeamCommunicationV1Store.write`; all run under the coordinator lock |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Evidence planned:
  - V-2 (implementation; rerun here) proves the bytes are identical to base-recorded values.
  - The new E2E stops and restores each root after the race and reads the history back through the real reader. These files have the same bytes as files written by the base code.
- Upstream ambiguity: None

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related REQ / AC | Validity Decision | Action |
| --- | --- | --- | --- | --- |
| `tests/unit/agent-collaboration/root-communication-baseline-contract.test.ts` (+ JSON record) | V-2/V-3 per root vs base record | REQ-008/013, AC-007/013 | Still Valid | Run |
| `tests/unit/agent-collaboration/root-communication-roots.test.ts`, `root-communication-engine.test.ts` | V-4, CR-001, engine order | REQ-012, AC-012 | Still Valid | Run |
| `tests/unit/agent-team-execution/teammate-input-claude-active-turn-admission.test.ts` (retargeted) | Claude active-turn append on the real path | REQ-009 | Still Valid | Run |
| `tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts`, `task-existing-copy-assignment.e2e.test.ts` (AR2-NB-001 caller), `delegated-copy-member-contact-host.e2e.test.ts` | DTL-001..009; existing-copy assignment including teammate `send_message_to` in all roots and the activation failure on teammate delivery | AC-006, AC-007, AC-014 | Still Valid | Run (gated) |
| Project Task E2E set: idle lifetime, reactivation, ad-hoc delegation, task closure, change feed, context files, task boundaries; plus `agent-org-runs/controlled-org-publication-http`, `agent-team-runs/task-delegation-api-surface` | Delivery, run-ID messaging, closure, Org publication | AC-009, AC-014 | Still Valid | Run (gated, serial) |
| `tests/e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts` | Real teammate delivery into a running turn (Claude/Codex) | AC-007, AC-014 | Still Valid | Run (gated) |
| `tests/e2e/runtime/{claude,codex}-team-inter-agent-roundtrip.e2e.test.ts` | Live Team round trips | AC-007 | Needs Update (pre-existing, outside scope): `refType` in `TeamMemberInput` and nested Team definitions no longer exist; identical failures on base | Report to owner |
| `standalone-agent-collaborator-mention.e2e.test.ts`, `all-runtime-send-message-matrix.e2e.test.ts` | Multi-runtime matrices | AC-007 | Out Of Scope for this run (need LM Studio and other runtimes as a set); the busy-member, DTL and race suites cover the delivery path | Not run |
| Compaction recovery suites (`grok-build-compaction-replay`, `agy-compaction-rotation-transport`) | AC-003 recovery | AC-003 | Still Valid | Run |
| Removed: `team-communication-service.test.ts`, `team-communication-message-append-plan-current.test.ts`, `inter-agent-message-router-claude-input-admission.test.ts` | Ported or retargeted (handoff) | — | Stale / Remove (done by implementation) | Verify the ported assertions exist |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | REQ / AC | Planned Artifact | Why Durable |
| --- | --- | --- | --- | --- |
| TDR-001..TDR-003 per root | SCN-A1 (closure during the held write), SCN-A2 (closure while waiting behind another write, CR-001), SCN-A3 (root keeps working; restore reads history) | REQ-012, AC-012, REQ-008, AC-013 | `autobyteus-server-ts/tests/e2e/projects/teammate-delivery-task-closure-race.e2e.test.ts` (gated scripted AGY) | The only proof of REQ-012 so far uses controlled closure doubles. The real Task services, cross-root DONE, copy stop and MCP tool result are unexercised. |

## Repository Coverage Execution Plan And Results

| Order | Command | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| R-01 | `tsc -p tsconfig.build.json --noEmit` | Build types | Pass | `api-e2e-evidence/r01-tsc.log` |
| R-02 | Unit: `tests/unit/{agent-collaboration,agent-team-execution,agent-org-execution,standalone-agent-run-root,agent-execution,agent-communication,agent-tools,projects,skill-improvement,application-orchestration,services,run-history,agent-memory,architecture}` | Delivery, admission, roots, tools, memory | Pass. 3229/3230; the 1 failure is environmental, `agy-configured-skill-linker` reading the user's changed external `autobyteus-agents` checkout. Delivery-path suites all pass. | `r02-unit.log` |
| R-03 | Integration: `tests/integration` | Integration layer | Pass vs baseline: 22 failures, all in the base list, 0 new | `r03-integration.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes` (multi-root, long-running gated E2E, several regression suites, high host load)

## Broader Validation Decision (pre-decided; confirmed after repository execution)

- Decision: `Required`
- Mode: Live API and lifecycle through gated scripted-AGY server E2E, plus gated live-runtime teammate suites where available.
- Gap: real sender tool, real Task closure across roots, copy stop and restore through the server.
- Browser: not required. There is no frontend change and event payloads are unchanged (V-3).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Docs accuracy (AC-011) | Not executable | Low | Delivery docs sync |
| `mixed-task-delegation.e2e.test.ts` | Needs LM Studio + Codex + Claude together | Low | — |
| CAND-002 (history publish throwing after durability) | Accepted residual; not producible through real use without fault injection | Low | Unit counterpart exists |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable coverage will be added: `Yes` (new E2E; TESTING.md entry)
- Post-repository confidence: 82% (see execution report). Final after broader validation: 95%.
- Broader validation: `Required`
- Reroute: `No`
