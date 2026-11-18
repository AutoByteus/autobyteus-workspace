# Requirements Document — Agent Input Delivery Simplification

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005` (re-bootstrap on `origin/personal@46e94fdea` and approval re-confirmation; requirements intent unchanged since SR-003)
- Package identifier: `agent-input-delivery-simplification`
- Request / ticket: Project Task `project_task_17bfe0fe-5c2b-47eb-9402-71687e7a52b8`, "Simplify agent input delivery and member activation" (one ticket)
- Requirements owner: solution_designer
- Date: 2026-10-08
- Approval state and reference:
  - Scope direction given by the user on 2026-10-08, after reviewing the SR-001 analysis: "for the weaker part, we don't have to work on it. But you should be based on your investigation." This baseline keeps only the evidence-backed points.
  - Approved 2026-10-08. The user delegated the remaining choices to the designer: "You only do the one you think that's reasonable … and which will do make the code cleaner"; "You help me to choose. You give me suggestions … And after that, you will continue."
  - The designer's choices were presented to the user in the conversation and recorded here:
    - DEC-001 = A (fix the defect);
    - REQ-005 (one outcome shape) withdrawn.
- Re-confirmed by the user on 2026-10-10 for this team copy, after the 2026-10-09 recheck showed every in-scope problem still exists on `origin/personal@46e94fdea` and the code reviewer withdrew §3a: "yesss. lets do it" (reply to "Reply 'Confirmed' and I'll send it to implementation on the new branch"). Optional points R-1 (fence owner; current shape justified), R-2 (routing lines) and R-3 (residual) stay out.
- Exact approved requirements baseline / solution revision: SR-003 (this document). Earlier snapshots: `history/requirements-doc.sr-001.md`, `history/requirements-doc.sr-002.md`.
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- **Problem.** The investigation confirmed these issues:
  - Agent-to-agent message delivery ("teammate delivery") is implemented as one shared engine plus three root adapters. Two of the adapters (standalone, Org) are line-for-line copies, and the history-save-then-deliver protocol is written three times and has already drifted.
  - The teammate path crosses about nine layers, several of which only forward.
  - Two pieces of code are dead.
  - `AgentRunInputAdmissionState.admit()` repeats the validation of `reserve()`.
  - The module docs describe a path teammate messages do not take.
  - The audit also found a real defect: a Task closing while a teammate message is being saved fail-stops the whole root.
- **Affected actors or systems:**
  - agents sending or receiving teammate messages in the standalone, Team and Org roots;
  - run-ID messaging;
  - maintainers.
- **Desired outcome:**
  - one teammate-delivery implementation with no forwarding-only layers;
  - dead code removed;
  - validation defined once;
  - accurate docs;
  - the Task-closure defect fixed (DEC-001 = A).

  No other product-visible change.
- **Observable definition of success:**
  - existing suites pass unchanged in meaning;
  - the teammate path has one implementation;
  - the docs trace the real path.

## Not Pursued (weak premises, per user direction 2026-10-08)

| Brief item | Investigation finding | Disposition |
| --- | --- | --- |
| Merge `postUserMessage` / `reserveUserMessage` into one `AgentRun` entry point (brief §3a, Goal 1) | Each method is small. The claimed drift was one case (start-failure handling), already fixed by the prerequisite ticket. | Not pursued. Both methods stay with today's semantics. |
| Compaction-recovery steps missing from reserved input (Q1) | Intended, approved (compaction REQ-014/015, SR029) and tested | No change |
| Posting timing change (Q2) | Not needed once the merge is dropped | No change |
| `ConfiguredAgentExecutionHandle` state reduction (Goal 5 / Q5) | Every state and fence maps to a tested supported scenario (investigation Q5 table) | No code change; the scenario mapping stays recorded in the investigation notes |
| One input-outcome shape for posted and reserved input (P3, Goal 2) | The posting result type (`AgentOperationResult`) is shared with interrupt, tool approval and other commands. Unifying spreads changes across many callers without clarifying the input path. | Not pursued (SR-003 designer choice under user delegation) |
| Save-first with "not delivered" records (Q6) | Needs a new persisted field and changes what history shows | Not pursued. Held slot kept (DEC-002 resolved). |

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001..SCN-009 | `AgentRun` has `postUserMessage` (admit and dispatch in one serialized step) and `reserveUserMessage` (held slot committed by the caller). `admit()` repeats `reserve()`'s validation. | Both methods kept. Validation defined once. | All admission semantics: FIFO, timing, recovery claim only for immediate `USER` input, held-slot invisibility, cancel, root-shutdown drop, lifecycle facts. | Q1/Q2, P2 |
| BEH-002 | Contract | SCN-009 | Recovery authorized only by an immediately admitted `USER` message; FIFO grant | Unchanged | Approved REQ-014/015, SR029 | Q1 |
| BEH-003 | Contract | SCN-001..SCN-008 | Two result shapes (`accepted…` vs `reserved…`) with the same three input-level codes | Unchanged (not pursued) | Every code and message each surface returns today | P3 |
| BEH-004 | User/System | SCN-005, SCN-006, SCN-015 | Teammate delivery: shared engine plus three adapters (two copies), about nine layers, three implementations of one history-commit protocol, drifted duplicate check | One delivery implementation. Root differences limited to: history file/envelope; recipient input message; committed-message events/presentation; result codes. No forwarding-only layers. | Saved-and-delivered together via the held slot; per-root files, metadata/IDs, events, codes; duplicate detection; history-write failure outcome | Q4, P4 |
| BEH-005 | System | SCN-006, SCN-007 | `GlobalAgentRunMessageRouter` live; `InterAgentMessageRouter` and `TaskAgentExecutionRegistry.reserveInput` unused | Global router kept and documented; dead code removed | Run-ID semantics, grants, codes | Q3, P4 |
| BEH-006 | System | SCN-008, SCN-010..SCN-013 | Member activation handle states, each justified | Unchanged | DTL-001..008 and all lifecycle scenarios | Q5 |
| BEH-007 | Operational | — | Docs say `postUserMessage` is the sole admission path | Docs describe both entry points and the real teammate path | — | Doc rows |
| BEH-008 | System | SCN-014 | A Task closing during a teammate message save fail-stops the whole root | No root fail-stop. The sender gets the same Task-closed outcome as a closure just before the save (thrown `TaskDelegationError`, `TASK_AGENT_RESOURCE_CLOSED`), or `AGENT_RUN_NOT_ACCEPTING_INPUT` if the recipient run stopped accepting input during the write. The recipient does not process the message; the already-written history record stays. (Aligned with REQ-012 after ARCH-REV-001 RR-002; intent unchanged.) | Everything else about Task closure | Probe OBS-003 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Operator / application | Send input to agents | No change | — |
| Agent (sender) | Message teammates, reply by run ID | Same tool results and codes | Tool contracts unchanged |
| Agent (recipient) | Receive messages in order, exactly once | Same FIFO and content | Persisted history unchanged |
| Maintainers | Understand and change teammate delivery | One traceable implementation, accurate docs | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Admission validation defined once inside `AgentRun` admission (no change to the two entry points) | SCN-001..SCN-009 |
| UC-002 | Withdrawn in SR-003 (one outcome shape not pursued) | — |
| UC-003 | Teammate delivery uses one implementation for all three roots, from resolved recipient to released input | SCN-005, SCN-006, SCN-014, SCN-015 |
| UC-004 | Router decisions carried out: keep the global router, remove dead code | SCN-006, SCN-007 |
| UC-005 | Withdrawn in SR-002 (handle state audit: no code change) | — |
| UC-006 | Docs describe the real path | — |
| UC-007 | Task closure during a teammate message save does not fail-stop the root | SCN-014 |

### Out Of Scope

- Everything in "Not Pursued".
- Product behaviour changes other than the approved DEC-001 fix. This includes ordering, delivery semantics, handoff rules, status meaning, compaction recovery, and tool/websocket/GraphQL/application contracts.
- Provider/runtime internals.
- Persisted-data shape changes.
- Root address resolution (host handling, catalog bring-in, Task scope rules).
- Removing the `TeamRun` → `TeamRunBackend` seam itself (it carries every Team operation). Only its input forwarding may collapse.

### Non-Goals

- Performance improvements.
- New tests beyond keeping existing scenarios covered on the new delivery path and covering DEC-001.

### Preserved Behavior Boundary

- Preserved: the "Intentionally Preserved Behavior" column of BEH-001..BEH-007; REQ-002, REQ-003, REQ-008, REQ-013, REQ-014; AC-002, AC-003, AC-004, AC-006, AC-007, AC-010, AC-013.
- Cross-cutting invariant: for any input, the following stay as on `origin/personal@048ea6cec` (re-based on `46e94fdea` in SR-005; the rechecked paths are unchanged), except the approved DEC-001 fix:
  - lifecycle facts;
  - dispatch order and timing;
  - caller-visible codes and messages;
  - persisted formats.

### Review Authority

- Blocking findings must cite an approved REQ, AC or preserved-behaviour ID.
- New product behaviour is a `Requirement Gap` and needs user approval.
- Items in "Not Pursued" may be noted only as non-blocking observations.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Withdrawn in SR-002 (single `AgentRun` entry point not pursued) | — | — | Weak premise | User direction 2026-10-08 |
| REQ-002 | Preserved: `postUserMessage` behaves exactly as today (serialized admission and dispatch, recovery claim only for `USER` sender, input-state publication, lifecycle facts) | BEH-001, BEH-002 | Must (preservation) | Q1/Q2 | Investigation |
| REQ-003 | Preserved: `reserveUserMessage` behaves exactly as today:<br>• FIFO position at hold;<br>• invisible/undispatchable until commit;<br>• cancel without trace;<br>• commit-then-release eligibility;<br>• never mints a recovery claim;<br>• root shutdown drops held slots. | BEH-001, BEH-002 | Must (preservation) | SR029 | Investigation Q1 |
| REQ-004 | Admission validation (accepting? non-empty content?) is defined once in the admission state | BEH-001 | Must | P2 duplication | Brief P2 |
| REQ-005 | Withdrawn in SR-003. Both result shapes and every code stay as today. | BEH-003 | — | Low clarity gain, broad churn | Designer choice under user delegation 2026-10-08 |
| REQ-006 | Preserved: one start-or-report-failure step for a not-started member (prerequisite ticket), including the `readiness_failure` card | BEH-006 | Must (preservation) | DTL-003 fix | Prerequisite SR-004 |
| REQ-007 | Teammate delivery has one implementation for the standalone, Team and Org roots, from resolved recipient to released input: validation, recipient input, held slot, history save, commit, committed-message consequences, release. Root-specific differences are supplied as data or small strategies, limited to:<br>• the history file and envelope;<br>• the recipient input message builder;<br>• committed-message events/presentation;<br>• result codes.<br>No forwarding-only layer remains in this path. | BEH-004 | Must | Confirmed duplication and drift | Q4, P4 |
| REQ-008 | Per root, teammate delivery keeps every observable outcome:<br>• accepted result (`agentRunId`, `displayName`);<br>• rejection codes and messages, including commit-conflict and history-commit-failed;<br>• persisted history shape;<br>• recipient content, metadata, `message_id`, `dedupe_key`;<br>• events/presentation;<br>• "saved, then recipient input eligible" order;<br>• duplicate detection;<br>• history-write failure outcome.<br>Where the copies drifted, the duplicate/open check runs inside the root's history lock (Team's current, stricter form; product-invisible). | BEH-004 | Must | No product change | Q4 |
| REQ-009 | `GlobalAgentRunMessageRouter` is kept with its purpose documented: run-ID messaging, same-root delegation to the root, and live-only cross-root delivery with grants. `InterAgentMessageRouter` and `TaskAgentExecutionRegistry.reserveInput` are removed. Any still-valuable assertion in the removed router's test moves onto the real path. | BEH-005 | Must | Dead code | Q3 |
| REQ-010 | Withdrawn in SR-002 (handle state reduction not pursued). The scenario mapping remains recorded in the investigation notes. | — | — | Every state justified | Q5 |
| REQ-011 | Module docs describe the real input and delivery path: `agent_execution.md`, `agent_communication.md`, `agent_team_execution.md`, `standalone_agent_run_root.md`, `agent_orgs.md`, plus references in `agent_memory.md` and `codex_integration.md`. | BEH-007 | Must | Docs misled DTL-003 | Doc evidence |
| REQ-012 | A Task closing (or the recipient's input closing) while a teammate message is being saved never puts the root into persistence fail-stop. The sender receives the same Task-closed outcome it receives today when the Task closes just before the save (`TaskDelegationError` with code `TASK_AGENT_RESOURCE_CLOSED`). If instead the recipient run stopped accepting input during the write, the sender receives `{accepted:false, code:"AGENT_RUN_NOT_ACCEPTING_INPUT"}`. In both cases the recipient does not process the message, the root keeps working, and the already-written history record stays. Genuine post-durability failures (local list update or publication throwing) still fail-stop as today. (Wording made precise in SR-004 from evidence; intent unchanged.) | BEH-008 | Must | Real defect | DEC-001 |
| REQ-013 | No persisted-data shape changes. The `sourceEvent: "AgentRun.postUserMessage"` literal and per-root `message_id`/`dedupe_key` derivation stay byte-identical. | BEH-004 | Must | Data continuity | Investigation |
| REQ-014 | Teammate delivery keeps the held slot (reserve → save → commit) | BEH-004 | Must | DEC-002 resolved | User direction 2026-10-08 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-004 | BEH-001 | Code inspection | The accepting/content validation exists once in the admission state | — | Code review; existing admission tests |
| AC-002 | REQ-002 | SCN-001..SCN-004, SCN-007 | Operator, application, seed or Skill Improvement input | Same timing, lifecycle facts and outcomes as today | Rejected: same code/message | Existing `agent-run`, coordinator, application, skill-improvement and e2e suites |
| AC-003 | REQ-002, REQ-003 | SCN-009 | Agent in compaction recovery; agent messages and user "continue" | User authorizes exactly once; agent messages never authorize; oldest FIFO entry runs first | Retry fails: stays queued | Recovery suites unchanged in meaning |
| AC-004 | REQ-003, REQ-014 | SCN-005, SCN-010, SCN-011 | Teammate message to a busy recipient; save fails; root shutdown mid-delivery | Held slot invisible until commit; failed save leaves no queued input; shutdown drops held slots | — | `agent-run.test.ts` reservation cases, communication tests |
| AC-005 | (REQ-005 withdrawn) preservation | SCN-001..SCN-008 | Any rejected input | Callers see today's codes and messages | — | Existing tests |
| AC-006 | REQ-006 | SCN-008 | First input to a not-started member | DTL-001..008 outcomes unchanged | — | DTL unit and e2e suites |
| AC-007 | REQ-007, REQ-008 | SCN-005, SCN-006, SCN-015 | `send_message_to` / handoff in each root (standalone host and child, Team, Org) | One implementation path. Same history content, recipient content/metadata/IDs, events, results and codes per root. | Duplicate: same conflict code. Write not renamed: same `*_HISTORY_COMMIT_FAILED`, recipient not given input. | Team/Org/standalone communication tests, Org publication, root suites |
| AC-008 | REQ-007, REQ-009 | — | Code inspection | No forwarding-only layer in the teammate path; `InterAgentMessageRouter` and `TaskAgentExecutionRegistry.reserveInput` gone | — | Code review |
| AC-009 | REQ-009 | SCN-006, SCN-007 | `send_message_to(target_agent_run_id)` same-root, cross-root live and inactive; Skill Improvement grant | Same results, codes, events, grant records | — | Global router, send-message-to, skill-improvement tests |
| AC-010 | REQ-006 (preservation) | SCN-008, SCN-010..SCN-013 | Concurrent first inputs; failed and indeterminate starts; Task closure or root shutdown during start; reactivation | Same outcomes as today | — | Handle, reactivation, root-task lifecycle, collaborator tests |
| AC-011 | REQ-011 | — | Docs review | Docs name both `AgentRun` entry points and when each is used, the one delivery implementation, and the global router's purpose. No doc claims a nonexistent path. | — | Docs sync review |
| AC-012 | REQ-012 | SCN-014 | Task DONE/CANCELLED while a teammate message write is in flight (each root kind) | No root fail-stop; later root writes succeed; sender gets a rejection with the existing Task-closed code; recipient does not process it | A real post-durability failure (e.g. a publication throw unrelated to closure) still fail-stops | New per-root test (probe scenario) |
| AC-013 | REQ-013 | — | Persisted outputs | Byte-identical formats; `sourceEvent` literal unchanged | — | Memory/run-history/migration suites |
| AC-014 | All | All | Full validation | All existing unit, integration and e2e suites pass, including DTL-001..008, task-copy idle lifetime, reactivation, ad-hoc delegation, task closure, Org publication and compaction recovery | — | CI and API/E2E |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Operator | Talk to a standalone agent | Chat UI message | Agent idle, busy, or not running | Message accepted → queued/started → lifecycle updates | Agent processes it in order | Rejected: notice; mention admission failures | Supported Normal Scenario | `agent-run-command-coordinator.ts`, stream handler | REQ-002/004/005; AC-002/005 |
| SCN-002 | User | Operator | Talk to a Team or Org member (wakes a shut-down child) | Team/Org UI SEND_MESSAGE | Member live, not started, or shut down | Command → member input → processed | Same | Invalid target / rejected codes | Supported Normal Scenario | `agent-team-stream-handler.ts:205-222`, Org handler | REQ-002/005/006; AC-002/005/006 |
| SCN-003 | System | Application | Drive an agent or team | Application execution API | Run active | Input posted | ACCEPTED / REJECTED disposition | NOT_AVAILABLE | Supported Normal Scenario | `application-execution-scope.ts:136-152` | REQ-002/005; AC-002 |
| SCN-004 | System | Delegating agent | Start a delegated copy with its Task | `delegate_task` | Copy prepared | Seed posted as the first message | Copy starts work | Coordinator cannot start: failed delegation | Supported Normal Scenario | registries `acceptTaskSeed` | REQ-002/006; AC-002/006 |
| SCN-005 | User/System | Agent | Message a teammate / hand off | `send_message_to(recipient_address)` | Same root | Validate → hold slot → save history → commit → events → release | Recipient processes in order; history shows it | Duplicate conflict; save failure; recipient not accepting; activation failure | Supported Normal Scenario | Q4 | REQ-003/007/008/014; AC-004/007 |
| SCN-006 | System | Agent (e.g. delegated copy replying to delegator) | Message by run ID | `send_message_to(target_agent_run_id)` | Same root or other root | Same root → root delivery; other root → live-only direct input + event | Delivered | Not active; root not active; grant rejected | Supported Normal Scenario | Q3 | REQ-007/009; AC-007/009 |
| SCN-007 | System | Skill Improvement | Trigger improver; improver messages target | Skill Improvement service | Improver run active | Trigger post; grant-limited direct message | Same as today | Rejected request | Supported Normal Scenario | `skill-improvement-improver-session-service.ts:74-90` | REQ-002/009; AC-002/009 |
| SCN-008 | System | Any input producer | First input to a not-started member | SCN-002/004/005 | Member not started | Start once → input admitted | Member works | Start fails: `error` status, card, `AGENT_RUN_ACTIVATION_FAILED`; input closed: not accepting | Supported Normal Scenario | DTL-001..008 | REQ-006; AC-006/010 |
| SCN-009 | Contract | Compaction recovery REQ-014/015, SR029 | Recover after a failed compaction | User "continue" | Agent awaiting user retry; agent messages queued | User admission authorizes once; oldest FIFO entry dispatches | Recovery proceeds | Retry fails: stays blocked | Supported Explicit Edge Scenario | Approved tickets | REQ-002/003; AC-003 |
| SCN-010 | User/System | Operator or delegator | Close a Task's work | Task status DONE/CANCELLED | Copy live or starting | Input closed; copy released | Further messages rejected; nothing re-activates | Release pending: retried | Supported Normal Scenario | resource scope, reactivation tests | REQ-003/006; AC-004/010 |
| SCN-011 | Operational | Operator / app quit | Stop a root | Root stop / shutdown | Members live or starting | Fence; drop held slots; cancel pre-forward input | Nothing re-activates | — | Supported Explicit Edge Scenario | handle and `agent-run.test.ts:781` | REQ-003; AC-004/010 |
| SCN-012 | System | Two producers | Concurrent first inputs to one not-started member | Any | Member not started | One shared start | Both inputs admitted in order | Shared failure | Supported Explicit Edge Scenario | concurrency tests | REQ-006; AC-010 |
| SCN-013 | System | Runtime | Start fails after the provider binding was saved, or cleanup unconfirmed | Any first input | — | Failure is sticky (no automatic retry) | No second provider conversation | — | Supported Explicit Edge Scenario | handle tests | REQ-006; AC-010 |
| SCN-014 | System | Operator or delegator closes a Task while a member sends a teammate message | Task closure racing a message save | Task DONE/CANCELLED during the history write | Message write in flight | Today: saved, not delivered, sender gets an indeterminate error, root fail-stops | Per DEC-001 | — | Supported Explicit Edge Scenario (both actions are supported and can race) | Probe OBS-003 | REQ-012; AC-012 |
| SCN-015 | System | Storage | History write fails before rename | Any teammate message | — | Slot cancelled; rejection `*_HISTORY_COMMIT_FAILED` | Not delivered, not saved | — | Supported Explicit Edge Scenario | persistence coordinators | REQ-008; AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`
- All Product design fields: N/A — not applicable (backend refactor; no UI change).

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, REQ-003; AC-002–AC-004 | Compatibility | No change to `AgentRun` admission timing or semantics | All input producers | Existing timing-sensitive tests |
| QR-002 | REQ-008, REQ-013; AC-007, AC-013 | Compatibility | Byte-identical persisted formats and IDs | All roots | Existing persistence/memory tests |
| QR-003 | REQ-012; AC-012 | Reliability | A Task-closure race never fail-stops a root | All roots | New per-root test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (no format change).
- Data or state that must be preserved: message-history files of the three roots; raw traces (`sourceEvent`, `message_id`, `dedupe_key`); execution trees.
- Acceptable loss: none.
- Constraints and unknowns: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Compaction recovery (REQ-014/015, SR029) | Unchanged | Approved tickets | None |
| `send_message_to` / `delegate_task` tool results | Unchanged | Current code | None |
| Team/Org websocket command results | Unchanged codes | Stream handlers | None |
| Prerequisite `delegated-team-member-lazy-activation` | Its start-or-report-failure step and `readiness_failure` kept | Merged `9d28c1b17` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `investigation-notes.md` | Evidence, Q1–Q6 answers, Q5 scenario mapping | All | Current | Evidence |
| `followup-cleanup-ticket-brief.md` | Origin brief | All | Input | Evidence |
| `probes/task-close-during-delivery.probe.ts` | OBS-003 reproduction | REQ-012, AC-012 | Evidence | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | All current reserved input is agent-origin | Q1 conclusion relies on it | Caller inventory | Verified |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Fix the OBS-003 defect in this ticket? | Real defect | A: fix once in the unified commit path. B: separate ticket. | User (delegated to designer) | Resolved 2026-10-08: A |
| DEC-002 (Q6) | Keep the held slot or save-first? | Product question | Keep. Save-first needs a persisted-shape change. | User | Resolved 2026-10-08: keep (weak premise not pursued, per user direction) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | — | — | — | — | Withdrawn SR-002 |
| REQ-002 | UC-001 | BEH-001, BEH-002 | AC-002, AC-003 | SCN-001..SCN-004, SCN-007, SCN-009 | Q1, Q2 |
| REQ-003 | UC-001 | BEH-001, BEH-002 | AC-003, AC-004 | SCN-005, SCN-009..SCN-011 | Q1 |
| REQ-004 | UC-001 | BEH-001 | AC-001 | — | P2 |
| REQ-005 | — | BEH-003 | AC-005 (preservation) | — | Withdrawn SR-003 |
| REQ-006 | — | BEH-006 | AC-006, AC-010 | SCN-008, SCN-010..SCN-013 | Prerequisite, Q5 |
| REQ-007 | UC-003 | BEH-004 | AC-007, AC-008 | SCN-005, SCN-006 | Q4 |
| REQ-008 | UC-003 | BEH-004 | AC-007 | SCN-005, SCN-015 | Q4 |
| REQ-009 | UC-004 | BEH-005 | AC-008, AC-009 | SCN-006, SCN-007 | Q3 |
| REQ-010 | — | — | — | — | Withdrawn SR-002 |
| REQ-011 | UC-006 | BEH-007 | AC-011 | — | Docs |
| REQ-012 | UC-007 | BEH-008 | AC-012 | SCN-014 | Probe |
| REQ-013 | UC-003 | BEH-004 | AC-013 | — | Persisted facts |
| REQ-014 | UC-003 | BEH-004 | AC-004, AC-007 | SCN-005 | DEC-002 |

## Architecture Phase Input

- Scenarios to map after approval: SCN-005, SCN-006, SCN-014, SCN-015 (changed path); all others as preservation.
- Constraints: REQ-002/REQ-003 unchanged `AgentRun` admission; REQ-008 per-root outcomes; REQ-013 persisted formats; surface codes.
- Deferred to design:
  - the delivery implementation's shape and placement;
  - per-root strategy/data;
  - which forwarding layers collapse;
  - the REQ-012 commit-time handling (distinguishing closure from genuine post-durability failure);
  - test migration (including `InterAgentMessageRouter` test coverage).
- Facts to verify: Team commit-in-lock versus standalone/Org; event order per root; standalone host-recipient routing; `AgentRun`/handle fence behaviour at commit time.
- Risks: per-root event and code drift during unification; test churn.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-08, delegated choice; see Document Status)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-003)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
