# Requirements Document — Agent Input Delivery Simplification

## Document Status

- Status: `Ready for Approval`
- Current solution revision ID: `SR-001`
- Package identifier: `agent-input-delivery-simplification`
- Request / ticket: Project Task `project_task_17bfe0fe-5c2b-47eb-9402-71687e7a52b8`, "Simplify agent input delivery and member activation" (one ticket)
- Requirements owner: solution_designer
- Date: 2026-10-08
- Approval state and reference: Pending. The cleanup direction was approved by the user on 2026-10-08 ("The cleanup refactoring is definitely needed"; one ticket). This requirements baseline, DEC-001 and DEC-002 await explicit user approval.
- Exact approved requirements baseline / solution revision: none yet (proposed baseline SR-001)
- Behavior-defining supplements and their approved versions: none (the brief and probe are evidence only)

## Problem And Desired Outcome

- **Problem:** the same job, "give an agent one input", is written several times:
  - two `AgentRun` entry points;
  - duplicated admission validation;
  - two result shapes;
  - three copies of teammate-message saving;
  - several forwarding-only layers;
  - a dead router.

  The copies drifted, which caused DTL-003. They also hid the real teammate path from both design and implementation, and the docs describe a path that does not exist.
- **Affected actors or systems:**
  - operators (chat UI);
  - applications;
  - agents (`send_message_to`, handoffs, delegated seeds, run-ID messages);
  - Skill Improvement;
  - Task closure and root shutdown.
- **Desired outcome:**
  - one input entry point into an agent run;
  - one outcome vocabulary;
  - one teammate-delivery implementation across the standalone, Team and Org roots;
  - live routers kept with a stated purpose, dead ones removed;
  - every member lifecycle state tied to a scenario;
  - docs that match the real path.

  All of this with no product-visible behaviour change, except what the user decides under DEC-001.
- **Observable definition of success:**
  - all existing suites pass unchanged in meaning;
  - the code has exactly one path for each concern listed above;
  - the docs trace the real path.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001..SCN-008 | `AgentRun` has two independently written entry points: posting admits and dispatches in one serialized step; reserving holds a slot that the caller commits or cancels. | One entry point. Input without a caller step behaves exactly like posting today. Input with a caller step behaves exactly like reserving today. | FIFO order; serialized admission; same dispatch timing for every current post caller; lifecycle facts; held slot invisible and undispatchable until commit; cancel leaves no trace. | Investigation notes Q1/Q2, P1 |
| BEH-002 | Contract | SCN-009 | Recovery retry is authorized only by an immediately admitted `USER` message; agent input never authorizes; grant goes to the oldest FIFO entry. | Unchanged, now expressed once in the single entry point. | Approved compaction-recovery REQ-014/015 and SR029 design. | Q1 |
| BEH-003 | Contract | SCN-001..SCN-008 | Two result shapes (`accepted…` vs `reserved…`); the input-level codes are the same three. | One input-outcome vocabulary (accepted, or rejected with a code from one closed set and a message). | Every code and message each surface returns today (tool results, websocket, application disposition, operator commands). | Q2/P3 |
| BEH-004 | User/System | SCN-005, SCN-006, SCN-015 | Teammate delivery: shared engine plus three root adapters (two line-for-line copies), around nine layers, three implementations of one history-commit protocol. | One delivery implementation. Root differences are limited to: history file and envelope; recipient input message; committed-message events/presentation; result codes. No forwarding-only layers. | Saved-and-delivered together; per-root files, metadata/IDs, events, codes; duplicate detection; history-write failure outcome. | Q4, P4 |
| BEH-005 | System | SCN-006, SCN-007 | `GlobalAgentRunMessageRouter` is live (run-ID messaging, cross-root live-only path, Skill Improvement grants); `InterAgentMessageRouter` has no production caller. | Global router kept with a documented purpose, using the one entry point; `InterAgentMessageRouter` removed. | Run-ID semantics, grant checks, codes. | Q3 |
| BEH-006 | System | SCN-008, SCN-010..SCN-013 | `ConfiguredAgentExecutionHandle` (and its Team wrapper) carry activation, retry, release and shutdown state, some duplicated. | Each kept state or fence documented with its scenario; duplicates merged (e.g. the wrapper's own shutdown fence). | DTL-001..008, task-copy idle lifetime, reactivation, ad-hoc delegation, task closure, Org publication, root shutdown. | Q5 |
| BEH-007 | Operational | — | Docs say `postUserMessage` is the sole admission path. | Docs describe the real path. | — | Doc rows |
| BEH-008 | System | SCN-014 | A Task closing while a teammate message is being written leaves the message saved but undelivered, returns an indeterminate error to the sender, and **puts the whole root into persistence fail-stop**. | Per DEC-001 (recommended: no root fail-stop; sender gets a normal "closed" rejection). | Everything else about Task closure. | Probe OBS-003 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Operator (chat UI) | Talk to an agent or a Team/Org member | Same acceptance, ordering, status, recovery behaviour | No visible change |
| Application | Post input to agents and teams | Same disposition | No visible change |
| Agent (sender) | Message teammates, delegate, reply by run ID | Same tool results and codes | Tool contracts unchanged |
| Agent (recipient) | Receive messages in order, exactly once | Same FIFO and content | Persisted history unchanged |
| Maintainers | Understand and change the input path | One traceable path, accurate docs | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Every input reaches an agent run through one entry point (with or without a caller step before commit) | SCN-001..SCN-009 |
| UC-002 | Callers receive one input-outcome vocabulary | SCN-001..SCN-008 |
| UC-003 | Teammate delivery uses one implementation for all three roots, from resolved recipient to released input | SCN-005, SCN-006, SCN-014, SCN-015 |
| UC-004 | Router decisions carried out (keep the global router, remove the dead one) | SCN-006, SCN-007 |
| UC-005 | Member lifecycle-state audit carried out (keep with scenario, merge, or remove with reason) | SCN-008, SCN-010..SCN-013 |
| UC-006 | Docs describe the real path | — |
| UC-007 | Task closure during a teammate message save, per DEC-001 | SCN-014 |

### Out Of Scope

- Product behaviour changes other than DEC-001 as approved by the user. This includes message ordering, delivery semantics, handoff rules, status meaning, the `send_message_to` / `delegate_task` tool contracts, websocket/GraphQL/application contracts, and compaction-recovery policy.
- Provider/runtime internals (AutoByteus native, Codex, Claude, AGY, ACP backends).
- Persisted-data shape changes: message-history files, raw traces (including the `sourceEvent: "AgentRun.postUserMessage"` literal), `message_id`/`dedupe_key` derivation.
- Root address resolution: who a `recipient_address` resolves to (host handling, catalog bring-in, Task scope rules). Unification starts at the resolved recipient.
- Removing the `TeamRun` → `TeamRunBackend` seam itself. It carries every Team operation, not only input. Its input methods collapse to one.
- Save-first history with "not delivered" records, unless the user chooses it under DEC-002.

### Non-Goals

- Performance improvements.
- New tests beyond those needed to keep existing scenarios covered on the new path and to cover DEC-001.
- Generalizing the global router into root communication.

### Preserved Behavior Boundary

- Preserved: BEH-001..BEH-007 "Intentionally Preserved Behavior" columns; REQ-002, REQ-003, REQ-008, REQ-013; AC-002, AC-003, AC-007, AC-013, AC-014.
- Cross-cutting invariant: for any input, the sequence of lifecycle facts, the dispatch order, the timing class (same serialized step vs after commit), every caller-visible code and message, and every persisted byte format are the same as on `origin/personal@048ea6cec`. The only exceptions are DEC-001 as approved and the product-invisible items OBS-001/OBS-002.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion or preserved-behaviour ID.
- A finding that would introduce new product behaviour, policy, migration or compatibility promise is a `Requirement Gap` and needs explicit user approval.
- Adjacent concerns outside this boundary (for example address-resolution duplication between the standalone and Org roots) are non-blocking recommendations or separate-ticket candidates.
- Reviewer comments do not amend this basis without renewed user approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | An agent run has exactly one input entry point. Every input producer reaches the agent run through it: operator UI (standalone, Team, Org), application, delegated seed, Task-system input, teammate delivery, run-ID delivery, Skill Improvement. A caller may supply an optional step between holding the slot and committing it. | BEH-001 | Must | Drift between two copies caused DTL-003 | User direction 2026-10-08; brief §3a |
| REQ-002 | Input with no caller step behaves exactly as posting does today. Admission, the recovery claim (only for `USER` sender), next-input claim and dispatch start, and the input-state publication all happen in the same serialized step. The returned outcome is the same, apart from OBS-001. | BEH-001, BEH-002 | Must | Q2: no timing change is needed | Investigation Q1/Q2 |
| REQ-003 | Input with a caller step behaves exactly as reserving does today:<br>• The slot takes its FIFO position when held.<br>• It is invisible and undispatchable until committed.<br>• Cancelling removes it without trace.<br>• Commit-then-release makes it eligible.<br>• A held-slot commit/release never creates a compaction-recovery claim.<br>• Root shutdown silently drops held slots. | BEH-001, BEH-002 | Must | Approved SR029 constraints | Investigation Q1 |
| REQ-004 | Admission validation (accepting? non-empty content?) is defined once. | BEH-001 | Must | P2 duplication | Brief P2 |
| REQ-005 | One input-outcome vocabulary serves inputs with and without a caller step: accepted, or rejected with a code from one closed set (`AGENT_RUN_INPUT_INVALID`, `AGENT_RUN_NOT_ACCEPTING_INPUT`, `AGENT_RUN_ACTIVATION_FAILED`) and a message. Surface-level codes outside input admission (`RUN_NOT_FOUND`, `RUN_NOT_ACTIVE`, `TARGET_*`, root commit codes, grant codes) stay exactly as each surface returns them today. | BEH-003 | Must | P3 | Brief P3 |
| REQ-006 | Exactly one place starts a not-started configured member for an input and reports its failure (delivered by the prerequisite ticket). No other layer duplicates it, and the `readiness_failure` conversation error card is kept. | BEH-006 | Must | DTL-003 root cause | Prerequisite SR-004 |
| REQ-007 | Teammate delivery has one implementation for the standalone, Team and Org roots, from resolved recipient to released input: validation, recipient input, held slot, history save, commit, committed-message consequences, release. Root-specific differences are supplied as data or small strategies, limited to:<br>• the history file and envelope;<br>• the recipient input message builder;<br>• committed-message events and presentation;<br>• result codes.<br>No forwarding-only layer remains, and unused input methods are removed. | BEH-004 | Must | P4 | Brief P4; Q4 |
| REQ-008 | Per root, teammate delivery keeps every observable outcome:<br>• accepted result (with `agentRunId`, `displayName`);<br>• rejection codes and messages, including commit-conflict and history-commit-failed codes;<br>• persisted history file shape;<br>• recipient input content, metadata, `message_id` and `dedupe_key`;<br>• emitted events and presentation;<br>• the order "saved, then recipient input becomes eligible";<br>• duplicate detection;<br>• the history-write failure outcome (not delivered, rejection).<br>Where the three copies drifted, the strictest current form applies when it is product-invisible: the duplicate/open check runs inside the root's history lock. | BEH-004 | Must | No product change | Q4 |
| REQ-009 | `GlobalAgentRunMessageRouter` is kept, with its purpose documented: run-ID messaging, delegating same-root targets to the root, and live-only cross-root delivery with grant checks. It submits input through the one entry point. `InterAgentMessageRouter` is removed. Any still-valuable assertion in its test is moved onto the real path. | BEH-005 | Must | P5/Q3 | Q3 |
| REQ-010 | Every state and fence of the member activation handle (and its Team wrapper) is listed with the supported scenario that needs it, or merged or removed with a recorded reason. Merging or removal is allowed only when all scenarios in AC-010 still pass. | BEH-006 | Must | P6 | Q5 |
| REQ-011 | Module docs describe the real input and delivery path: `agent_execution.md`, `agent_communication.md`, `agent_team_execution.md`, `standalone_agent_run_root.md`, `agent_orgs.md`, plus references in `agent_memory.md` and `codex_integration.md`. | BEH-007 | Must | Goal 6 | Doc evidence |
| REQ-012 | A Task closing while a teammate message is being saved is handled per DEC-001. Recommended: the root does not enter persistence fail-stop; the sender receives a normal rejection with the existing Task-closed code; the recipient does not process the message; the root keeps working. | BEH-008 | Must, if DEC-001 = A | Real defect found during the audit | DEC-001 |
| REQ-013 | No persisted-data shape changes. The raw-trace literal `sourceEvent: "AgentRun.postUserMessage"` and per-root `message_id`/`dedupe_key` derivation stay byte-identical. | BEH-004 | Must | Out of scope / data continuity | Investigation persisted facts |
| REQ-014 | Teammate delivery keeps the held slot (reserve → save → commit), per DEC-002 (recommended). | BEH-004 | Must, if DEC-002 = Keep | Q6 | DEC-002 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-004 | BEH-001 | Code inspection after the change | Exactly one agent-run input entry point and one admission-validation definition. Every listed producer uses it; no second admission path exists. | — | Code review; architecture test if practical |
| AC-002 | REQ-002 | SCN-001..SCN-004, SCN-007 | Operator, application, seed or Skill Improvement input to an idle or busy agent | Same dispatch timing (the dispatch starts in the admission step), same lifecycle facts, same accepted/rejected outcomes as today | Rejected input: same code/message | Existing `agent-run`, command-coordinator, application, skill-improvement and e2e suites pass |
| AC-003 | REQ-002, REQ-003 | SCN-009 | Agent blocked in compaction recovery awaiting the user; agent messages and a user "continue" arrive | The user "continue" authorizes exactly once. Agent messages never authorize. The oldest FIFO entry runs first after authorization. | Retry fails: entries stay queued | `agent-run-compaction-recovery.test.ts`, `agent-run-compaction-races.test.ts` pass unchanged in meaning |
| AC-004 | REQ-003 | SCN-005, SCN-010, SCN-011 | Teammate message while the recipient is busy; save fails; root shuts down mid-delivery | Held slot invisible until commit; failed save leaves no queued input; root shutdown silently drops held slots | — | `agent-run.test.ts` reservation cases, communication tests |
| AC-005 | REQ-005 | SCN-001..SCN-008 | Any rejected input | Callers see today's codes and messages. Input-level rejections use the one closed code set for both kinds of input. | — | Existing handle, registry, stream-handler, dispatcher and application tests |
| AC-006 | REQ-006 | SCN-008 | First input (operator, seed or teammate) to a not-started member; start succeeds, fails, or input closes during start | DTL-001..008 outcomes unchanged, including the `readiness_failure` card exactly once and `AGENT_RUN_ACTIVATION_FAILED` naming the cause | — | `delegated-team-lazy-member-activation.test.ts`, handle tests, DTL e2e |
| AC-007 | REQ-007, REQ-008 | SCN-005, SCN-006, SCN-015 | `send_message_to` / handoff in each root (standalone host and child, Team, Org) | One implementation path. Same history file content, recipient content/metadata/IDs, events, results and codes per root as today. | Duplicate message: same conflict code. History write not renamed: same `*_HISTORY_COMMIT_FAILED` rejection, recipient not given the input. | Team/Org/standalone communication tests; Org publication; root suites |
| AC-008 | REQ-007 | — | Code inspection | No forwarding-only layer remains in the teammate path; `TaskAgentExecutionRegistry.reserveInput` and similar unused methods are gone | — | Code review |
| AC-009 | REQ-009 | SCN-006, SCN-007 | `send_message_to(target_agent_run_id)` same-root, cross-root live, cross-root inactive; Skill Improvement grant use | Same results, codes, events and grant usage records as today. `InterAgentMessageRouter` no longer exists. | — | `global-agent-run-message-router.test.ts`, `send-message-to.test.ts`, skill-improvement tests |
| AC-010 | REQ-010 | SCN-008, SCN-010..SCN-013 | Concurrent first inputs; failed start then a new input; indeterminate start failure; Task closure during start; release during configuration; root shutdown during start; reactivation after closure | Same outcomes as today; the design lists each mechanism with its scenario or removal reason | — | Handle, reactivation, root-task lifecycle, collaborator tests |
| AC-011 | REQ-011 | — | Docs review | Docs name the one entry point, the delivery implementation, the global router's purpose and the real teammate path. No doc claims a path that does not exist. | — | Docs review / delivery docs sync |
| AC-012 | REQ-012 | SCN-014 | Task marked DONE or CANCELLED while a teammate message's history write is in flight (each root kind) | Per DEC-001. If A: the root does not fail-stop and later root writes succeed; the sender receives a rejection with the existing Task-closed code; the recipient does not process the message. | If B: today's behaviour preserved and recorded as a known defect | New test per root kind (the probe scenario) |
| AC-013 | REQ-013 | — | Persisted outputs of all paths | Byte-identical formats; `sourceEvent` literal unchanged | — | Memory/run-history/migration suites |
| AC-014 | REQ-001..REQ-014 | All | Full validation | All existing unit, integration and e2e suites pass. This includes DTL-001..008, task-copy idle lifetime, reactivation, ad-hoc delegation, task closure, Org publication and compaction recovery. | — | CI and API/E2E stage |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Operator | Talk to a standalone agent | Chat UI message | Agent idle, busy, or not running | Message accepted → queued/started → lifecycle updates | Agent processes it in order | Rejected: notice; mention admission failures | Supported Normal Scenario | `agent-run-command-coordinator.ts`, stream handler | REQ-001/002/005; AC-002/005 |
| SCN-002 | User | Operator | Talk to a Team or Org member (wakes a shut-down child) | Team/Org UI SEND_MESSAGE | Member live, not started, or shut down | Command → member input → processed | Same | Invalid target / rejected codes | Supported Normal Scenario | `agent-team-stream-handler.ts:205-222`, Org handler | REQ-001/002/005/006; AC-002/005/006 |
| SCN-003 | System | Application | Drive an agent or team | Application execution API | Run active | Input posted | ACCEPTED / REJECTED disposition | NOT_AVAILABLE | Supported Normal Scenario | `application-execution-scope.ts:136-152` | REQ-001/002; AC-002 |
| SCN-004 | System | Delegating agent | Start a delegated copy with its Task | `delegate_task` | Copy prepared | Seed posted as the first message | Copy starts work | Coordinator cannot start: failed delegation | Supported Normal Scenario | registries `acceptTaskSeed` | REQ-001/002/006; AC-002/006 |
| SCN-005 | User/System | Agent | Message a teammate / hand off | `send_message_to(recipient_address)` | Same root | Validate → hold slot → save history → commit → events → release | Recipient processes in order; history shows it | Duplicate conflict; save failure; recipient not accepting; activation failure | Supported Normal Scenario | Q4 | REQ-003/007/008/014; AC-004/007 |
| SCN-006 | System | Agent (e.g. delegated copy replying to delegator) | Message by run ID | `send_message_to(target_agent_run_id)` | Same root or other root | Same root → root delivery; other root → live-only direct input + event | Delivered | Not active; root not active; grant rejected | Supported Normal Scenario | Q3 | REQ-009; AC-009 |
| SCN-007 | System | Skill Improvement | Trigger improver; improver messages target | Skill Improvement service | Improver run active | Trigger post; grant-limited direct message | Same as today | Rejected request | Supported Normal Scenario | `skill-improvement-improver-session-service.ts:74-90` | REQ-001/002/009; AC-002/009 |
| SCN-008 | System | Any input producer | First input to a not-started member | SCN-002/004/005 | Member not started | Start once → input admitted | Member works | Start fails: `error` status, card, `AGENT_RUN_ACTIVATION_FAILED`; input closed: not accepting | Supported Normal Scenario | DTL-001..008 | REQ-006/010; AC-006/010 |
| SCN-009 | Contract | Compaction recovery REQ-014/015, SR029 | Recover after a failed compaction | User "continue" | Agent awaiting user retry; agent messages queued | User admission authorizes once; oldest FIFO entry dispatches | Recovery proceeds | Retry fails: stays blocked | Supported Explicit Edge Scenario | Approved tickets | REQ-002/003; AC-003 |
| SCN-010 | User/System | Operator or delegator | Close a Task's work | Task status DONE/CANCELLED | Copy live or starting | Input closed; copy released | Further messages rejected; nothing re-activates | Release pending: retried | Supported Normal Scenario | resource scope, reactivation tests | REQ-010; AC-004/010 |
| SCN-011 | Operational | Operator / app quit | Stop a root | Root stop / shutdown | Members live or starting | Fence; drop held slots; cancel pre-forward input | Nothing re-activates | — | Supported Explicit Edge Scenario | handle and `agent-run.test.ts:781` | REQ-003/010; AC-004/010 |
| SCN-012 | System | Two producers | Concurrent first inputs to one not-started member | Any | Member not started | One shared start | Both inputs admitted in order | Shared failure | Supported Explicit Edge Scenario | concurrency tests | REQ-010; AC-010 |
| SCN-013 | System | Runtime | Start fails after the provider binding was saved, or cleanup is unconfirmed | Any first input | — | Failure is sticky (no automatic retry) | No second provider conversation | — | Supported Explicit Edge Scenario | handle tests | REQ-010; AC-010 |
| SCN-014 | System | Operator or delegator closes a Task while a member sends a teammate message | Task closure racing a message save | Task DONE/CANCELLED during the history write | Message write in flight | Today: saved, not delivered, sender gets an indeterminate error, root fail-stops | Per DEC-001 | — | Supported Explicit Edge Scenario (both actions are supported and can race) | Probe OBS-003 | REQ-012; AC-012 |
| SCN-015 | System | Storage | History write fails before rename | Any teammate message | — | Slot cancelled; rejection `*_HISTORY_COMMIT_FAILED` | Not delivered, not saved | — | Supported Explicit Edge Scenario | persistence coordinators | REQ-008; AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`
- All Product design fields: N/A — not applicable (backend refactor; no UI change).

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002; AC-002 | Compatibility | Zero change in dispatch timing class for no-step input (dispatch starts within the admission step) | All post callers | Existing timing-sensitive unit tests |
| QR-002 | REQ-008, REQ-013; AC-007, AC-013 | Compatibility | Byte-identical persisted formats and IDs | All roots | Existing persistence/memory tests |
| QR-003 | REQ-012; AC-012 | Reliability | A Task-closure race never fail-stops a root (if DEC-001 = A) | All roots | New per-root test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (no format change).
- Data or state that must be preserved: message-history files of the three roots, raw traces (`sourceEvent`, `message_id`, `dedupe_key`), execution trees.
- Acceptable loss: none.
- Constraints: none.
- Unknowns: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Compaction recovery (REQ-014/015, SR029) | User-only authorization; reservations never claim; FIFO grant | Approved tickets | None |
| `send_message_to` / `delegate_task` tool results | Unchanged | Current code | None |
| Team/Org websocket command results | Unchanged codes | Stream handlers | None |
| Prerequisite `delegated-team-member-lazy-activation` | One start-or-report-failure step; `readiness_failure` kept | Merged `9d28c1b17` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `investigation-notes.md` | Evidence and Q1–Q6 answers | All | Current | Evidence |
| `followup-cleanup-ticket-brief.md` | Origin brief | All | Input | Evidence |
| `probes/task-close-during-delivery.probe.ts` | OBS-003 reproduction | REQ-012, AC-012 | Evidence | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | All current reserved input is agent-origin (no user ingress uses a held slot) | Q1 conclusion relies on it | Verified by caller inventory; design keeps the recovery claim on the no-step path only | Verified |
| ASM-002 | The returned `turnId` hint has no production consumer | OBS-001 | Verified by search; design re-checks | Verified |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | The defect found (OBS-003): a Task closing during a teammate message save fail-stops the whole root. Fix it in this ticket? | Real product defect; the instructions require a user decision | **A (recommended):** fix it once in the unified commit path. No root fail-stop; the sender gets a normal Task-closed rejection; the recipient does not process it. The message stays in history, since it was already durably written; history therefore shows a message the closed recipient never processed. **B:** keep today's behaviour in this refactor and file a separate ticket. | User | Open |
| DEC-002 (Q6) | Keep the held slot (reserve → save → commit), or switch to save-first with a "not delivered: <reason>" record? | Product question | **Keep (recommended).** It is product-invisible and costs nothing extra once posting is the empty-step case. Save-first needs a new persisted delivery-status field (out of scope). It would also change what history shows, and it contradicts the approved reservation/FIFO semantics (SR029). History-vs-processing order is already practically aligned under the held slot. **Save-first:** separate ticket recommended if wanted. | User | Open |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-014 | SCN-001..SCN-008 | Q2 |
| REQ-002 | UC-001 | BEH-001, BEH-002 | AC-002, AC-003 | SCN-001..SCN-004, SCN-007, SCN-009 | Q1, Q2 |
| REQ-003 | UC-001 | BEH-001, BEH-002 | AC-003, AC-004 | SCN-005, SCN-009..SCN-011 | Q1 |
| REQ-004 | UC-001 | BEH-001 | AC-001 | — | P2 |
| REQ-005 | UC-002 | BEH-003 | AC-005 | SCN-001..SCN-008 | P3 |
| REQ-006 | UC-001 | BEH-006 | AC-006 | SCN-008 | Prerequisite |
| REQ-007 | UC-003 | BEH-004 | AC-007, AC-008 | SCN-005, SCN-006 | Q4 |
| REQ-008 | UC-003 | BEH-004 | AC-007 | SCN-005, SCN-015 | Q4 |
| REQ-009 | UC-004 | BEH-005 | AC-009 | SCN-006, SCN-007 | Q3 |
| REQ-010 | UC-005 | BEH-006 | AC-010 | SCN-008, SCN-010..SCN-013 | Q5 |
| REQ-011 | UC-006 | BEH-007 | AC-011 | — | Docs |
| REQ-012 | UC-007 | BEH-008 | AC-012 | SCN-014 | Probe |
| REQ-013 | UC-003 | BEH-004 | AC-013 | — | Persisted facts |
| REQ-014 | UC-003 | BEH-004 | AC-007 | SCN-005 | DEC-002 |

## Architecture Phase Input

- Approved scenario IDs and product-level paths architecture must map: SCN-001..SCN-015 (after approval).
- Product and system constraints to preserve: REQ-002/REQ-003 serialization and recovery rules; REQ-008 per-root observable outcomes; REQ-013 persisted formats; surface codes.
- Decisions deferred to architecture design:
  - the entry-point API shape and name;
  - the outcome type;
  - where root-specific strategies live;
  - which layers collapse (one input method per layer at most);
  - the handle state merges;
  - test migration (including `InterAgentMessageRouter` test coverage);
  - internal staging (entry point → root delivery → handle audit).
- Technical facts architecture should verify: every caller of the two current methods (including tests and fixtures); the Team commit-in-lock protocol versus standalone/Org; event ordering per root; the DEC-001 interaction with `AgentRun`/handle fences at commit time.
- Known risks: breadth of callers; serialization subtleties; test churn.

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
- Remaining content blocker: user decisions DEC-001 and DEC-002

### Approved Basis Ready For Design

- User approval received: `No`
- Exact requirements and supplement approval basis recorded: `No`
- Approved requirements package ready for architecture design: `No`
- Remaining blocker: explicit user approval of this baseline plus DEC-001 and DEC-002
