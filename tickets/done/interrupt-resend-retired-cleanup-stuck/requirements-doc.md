# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `interrupt-resend-retired-cleanup-stuck`
- Request / ticket: Project Task `project_task_9167f6b9-9b93-42ca-b20d-333d9619fbe6`
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-08
- Approval state and reference: Approved by the user in the Solution Designer conversation on 2026-10-08 ("I like your suggestion. Let's go." in reply to the recommendation "approve SR-001 with A"); DEC-001 = Option A
- Exact approved requirements baseline / solution revision: SR-001 (this document as of 2026-10-08, with DEC-001 resolved to A)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: After the user interrupts a working standalone run on the Antigravity runtime, the next message (and every later one) fails with "Agent run '…' still owns retired cleanup." and the run shows a red Error status. The run is unusable until the app is restarted.
- Root cause (evidence: investigation-notes.md): Antigravity's interrupt stops its process, so the run goes offline and the next message must restart it. When the server sees that the run has gone offline, it marks the run as "cleanup still owed" (`retired`). Only an explicit stop clears that mark. The standalone run's restart path never does that cleanup, so it refuses to start the run. It also stores the refusal as a permanent quarantine. Timing does not matter: a slow resend gets stuck too. Any standalone run whose runtime stops by itself (crash or unexpected exit, on any runtime) gets stuck the same way. This regression arrived with commit `028cca231` (2026-10-05).
- Affected actors or systems: Desktop users of standalone agent runs (all runtimes after a runtime crash or exit; Antigravity on every interrupt); helper and application-owned standalone runs that use the same restart path.
- Desired outcome: A run that went offline can always be used again. A message sent right after an interrupt is accepted once the earlier runtime has finished stopping. If that cannot happen, the user gets a clear message telling them to try again, and the run stays retryable. Runs already stuck can recover with their history intact.
- Observable definition of success: In the desktop app, Interrupt followed at once by a new message on an Antigravity run gets the agent's reply to the new message, and the run never ends up permanently in the error state.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | AGY interrupt stops the AGY process; the run goes offline. Other runtimes cancel the turn and stay live. | Unchanged | Interrupt semantics per runtime | Source Log: agy backend, codex/claude/acp |
| BEH-002 | User | SCN-001, SCN-002, SCN-003 | A send to a standalone run whose runtime went offline is permanently refused ("still owns retired cleanup"); the refusal is cached until restart | The send finishes the earlier runtime's cleanup, restarts the run in the same conversation and is delivered | Same conversation/provider binding and history are kept | registry, lifecycle service, probe, server log |
| BEH-003 | User | SCN-001 | No ordering guarantee between the stop of the interrupted AGY process and the restart for the new message | The restart waits until the interrupted runtime has fully stopped | Activations for one run stay serialized; concurrent sends join one restart | agy backend `interrupt()`; lifecycle transition lane |
| BEH-004 | System | SCN-004 | Team members and delegated copies clear the old run before restarting (they recover) | Unchanged, and never permanently blocked if that cleanup fails once | Existing team/delegation behavior | configured-agent-execution-handle |
| BEH-005 | Operational | SCN-005 | Restart of the app is the only way out; history kept on disk | A stuck run recovers when the user retries a message (after the fix is installed) and after an app restart | History and provider conversation | run_metadata.json |
| BEH-006 | User | SCN-001..SCN-003 | Error card shows the raw internal text "still owns retired cleanup" | Any remaining error explains what happened in plain language and says the user can try again | Error card component and Error status display | command coordinator; screenshot |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop user | Stop a turn and steer the agent with a new message | The new message is handled; the run never becomes permanently unusable | No history loss; no app restart needed |
| Team / delegating agents | Send work to a member whose runtime went offline | Member restarts and receives work | No regression of existing team behavior |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Interrupt a standalone Antigravity run and immediately send a new message | SCN-001 |
| UC-002 | Interrupt a standalone Antigravity run and send a new message later | SCN-002 |
| UC-003 | Send to a standalone run (any runtime) whose runtime stopped by itself (crash or unexpected exit) | SCN-003 |
| UC-004 | Send work to a team member or delegated copy whose runtime went offline (regression guard, including after an interrupt) | SCN-004 |
| UC-005 | Recover a run already stuck in this state | SCN-005 |

### Out Of Scope

- Changing Antigravity interrupt semantics (for example, keeping the AGY process alive across interrupts).
- Redesigning the activation registry beyond what is needed for retired-cleanup ownership.
- Other sources of `AGENT_RUN_ACTIVATION_CLEANUP_FAILED`, such as a genuinely failed termination of a *private* candidate (`quarantined` pending claim). They keep their current behavior except for the wording rule in REQ-005.
- Visual redesign of the chat error card.

### Non-Goals

- Making interrupt itself faster.
- Recovering a partially streamed interrupted turn's output beyond what is already recorded.

### Preserved Behavior Boundary

BEH-001, BEH-004 (existing recovery), and the per-run activation serialization in BEH-003 stay as they are. A run must never be served by two live runtimes at the same time: the earlier runtime must be confirmed stopped before a replacement starts.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A standalone run whose runtime went offline (after an interrupt that stops the runtime, or after a crash or unexpected exit) can be restarted in-process by the next message, on every runtime. "Cleanup still owed" for the earlier runtime must never permanently block a restart. | BEH-002 | Must | Root cause | Task "What to do" 2 |
| REQ-002 | When a message arrives while the earlier runtime is still stopping or being cleaned up, the message waits for that cleanup to finish and is then delivered to the restarted run in the same conversation. If cleanup cannot finish within a bounded time, or fails, the message is rejected with a temporary, retryable error (REQ-005), and the next send retries the cleanup. | BEH-002, BEH-003 | Must | Task: "accepted once cleanup finishes or rejected with a clear temporary message" | DEC-001 (proposed: wait, then temporary reject) |
| REQ-003 | A replacement runtime for a run starts only after the earlier runtime for that run is confirmed stopped. Concurrent sends during this window result in one restart, not several. | BEH-003 | Must | Avoid two AGY processes on one conversation | Preserved boundary |
| REQ-004 | A run already stuck in this state recovers without losing history: (a) after the fix is installed, through an app restart, and (b) in a running app with the fix, through a later message (no stuck state is cached permanently for retryable cleanup). | BEH-005 | Must | Task "What to do" 3 | — |
| REQ-005 | Any remaining user-visible error from this path explains in plain language that the agent was still stopping or restarting after an interrupt, and that the user can send the message again. Internal wording ("retired cleanup", "quarantined") is not shown. | BEH-006 | Should | Task "What to do" 4 | — |
| REQ-006 | Team members and delegated copies whose runtime went offline keep restarting on the next work. A failed cleanup attempt on that path must not leave the member permanently unusable. | BEH-004 | Must | Regression guard; latent risk R-001 | Task "other runtimes and team members" |
| REQ-007 | Automated tests cover: AGY interrupt + immediate send (the race), interrupt + later send, a runtime that stops by itself for a non-AGY runtime, the team-member path, and the in-process recovery of a stuck run. | BEH-002..BEH-005 | Must | Task "Done when" | — |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | BEH-002/003, SCN-001 | Standalone AGY run mid-turn; user presses Interrupt and sends a message at once (before the interrupt finishes) | The new message is accepted and answered in the same conversation, with earlier history visible. No "still owns retired cleanup" error. The run's status returns to normal (not Error). | If cleanup fails, the user sees the REQ-005 message, and a later send succeeds once cleanup succeeds | Automated race test (server) + desktop-app verification |
| AC-002 | REQ-001 | BEH-002, SCN-002 | Standalone AGY run interrupted; user waits several seconds, then sends | Message accepted and answered in the same conversation | — | Automated test + desktop-app verification |
| AC-003 | REQ-001 | BEH-002, SCN-003 | Standalone run on a non-AGY runtime whose runtime stopped by itself | Next send restarts the run and is accepted | — | Automated test (runtime-neutral, using a test backend) |
| AC-004 | REQ-005 | BEH-006 | Cleanup of the earlier runtime fails or exceeds the wait bound | The message is rejected with plain-language, retryable text. The run is not permanently blocked: once cleanup succeeds, the next send is accepted. | — | Automated test on the message/ack text and retry |
| AC-005 | REQ-003 | BEH-003, SCN-001 | Two sends arrive while the earlier AGY runtime is still stopping | Exactly one replacement runtime starts, after the earlier one is confirmed stopped; both messages are handled under the run's normal input rules | — | Automated test |
| AC-006 | REQ-006 | BEH-004, SCN-004 | Team member or delegated copy on AGY is interrupted and immediately receives new work; and a variant where the first cleanup attempt fails | Member restarts and receives the work. After a failed first attempt, a later attempt succeeds (not permanently stuck). | — | Automated test |
| AC-007 | REQ-004 | BEH-005, SCN-005 | The user's existing stuck run (`daily_assistant_feb311e7…`) after installing the fixed build | Reopening the app and sending a message works; earlier conversation history is shown and the agent keeps its context | — | Desktop-app verification by the user |
| AC-008 | REQ-004 | BEH-005, SCN-005 | In a running fixed build, a run reached the "cleanup owed" state and its cleanup failed once | A later send retries cleanup and succeeds without an app restart | — | Automated test |
| AC-009 | REQ-007 | all | CI | Tests for AC-001..AC-006 and AC-008 exist and pass | — | Test run evidence |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Desktop user | Stop the agent and redirect it at once | Chat Interrupt button, then Send | Standalone AGY run working on a turn | Interrupt -> send new message before interrupt completes | New message handled in same conversation | Temporary retryable error if cleanup fails | Supported Normal Scenario | User report, screenshot, log | REQ-001..003, 005; AC-001, AC-004, AC-005 |
| SCN-002 | User | Desktop user | Stop, think, continue | Interrupt, later Send | Standalone AGY run working | Interrupt -> wait -> send | Message handled | — | Supported Normal Scenario | Code trace (same path) | REQ-001; AC-002 |
| SCN-003 | System/User | Runtime process/session | Runtime stops on its own; user keeps chatting | Next Send | Standalone run (any runtime) whose runtime crashed or exited | Runtime goes offline -> user sends | Run restarts, message handled | — | Supported Normal Scenario | Backend self-shutdown paths | REQ-001; AC-003 |
| SCN-004 | System | Delegating agent / team | Give new work to a member whose runtime went offline | Team message / delegation | Member runtime offline (incl. after AGY interrupt) | Work arrives -> member restarts | Member handles work | One failed cleanup attempt does not block later attempts | Supported Normal Scenario | configured-agent-execution-handle | REQ-006; AC-006 |
| SCN-005 | Operational/User | Desktop user | Recover an already-stuck run | App restart after update, or later Send | Run stuck from before the fix | Restart app / send again | Run usable, history intact | — | Supported Normal Scenario | Task "What to do" 3 | REQ-004; AC-007, AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (error text only)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details: Existing error card and status display stay as they are; only the message text changes (REQ-005).
- Explicitly illustrative fixture content or permitted implementation variation: Exact wording may vary if it meets REQ-005. Proposed: "The agent was still stopping after the interrupt, so this message couldn't be delivered. Please send it again."
- Required screens, states, transitions: After a successful restart, the run status leaves the Error state.
- Explicitly unresolved product decisions: None (DEC-001 resolved to A).

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, AC-004 | Reliability | A send that waits for cleanup gets either acceptance or the retryable rejection within a bounded time (proposed: 30 s); it never waits forever | Cleanup in progress | Automated test with a stalled cleanup |
| QR-002 | REQ-001, REQ-004 | Reliability | No in-process state may block a run permanently because of retryable cleanup | All runtimes | Automated tests AC-004, AC-008 |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (fix concerns in-memory lifecycle state)
- Data or state that must be preserved: Conversation history, `run_metadata.json`, provider conversation id (`platformAgentRunId`), memory/traces.
- Loss, reset, rebuild, or regeneration that is acceptable: The interrupted turn ends as interrupted; its partial output stays as already recorded.
- Retention, privacy, compliance, volume, downtime, or operational constraints: None.
- Unknowns requiring downstream investigation: U-001 (shutdown handling of retired runs during app restart).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Antigravity CLI headless process | Restore by conversation id after the previous process has exited | agy backend/restore | R-002: overlap if not awaited |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/user-screenshot-stuck-run.png` | Symptom | AC-001, AC-007 | Final | Evidence only |
| `evidence/server-log-excerpt.txt` | Production confirmation | AC-001 | Final | Evidence only |
| `evidence/registry-repro-probe.test.ts.txt` | Reproduction | AC-001..AC-003 | Final | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | AGY restore by conversation id works after an interrupt-stop, as it does after an app restart | Needed for AC-001/002 | Desktop-app validation (API/E2E + user) | Open |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | What should happen to a message sent while the interrupted runtime is still stopping? | Defines REQ-002 and QR-001 | (A, recommended) Wait for cleanup, then deliver; after a 30 s bound or a failure, show the temporary retryable error. (B) Always reject at once with the temporary error while cleanup runs. | User | Resolved: A (user, 2026-10-08) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001..003 | BEH-002 | AC-001, AC-002, AC-003 | SCN-001..003 | probe, log |
| REQ-002 | UC-001 | BEH-002, BEH-003 | AC-001, AC-004 | SCN-001 | — |
| REQ-003 | UC-001 | BEH-003 | AC-001, AC-005 | SCN-001 | — |
| REQ-004 | UC-005 | BEH-005 | AC-007, AC-008 | SCN-005 | run_metadata |
| REQ-005 | UC-001..003 | BEH-006 | AC-004 | SCN-001..003 | screenshot |
| REQ-006 | UC-004 | BEH-004 | AC-006 | SCN-004 | — |
| REQ-007 | all | all | AC-009 | all | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-005 (approved SR-001).
- Product and system constraints architecture must preserve: one live runtime per run; per-run activation serialization; team/delegation recovery; no persisted-data change.
- Decisions intentionally deferred to architecture design: which owner completes "cleanup owed" for a run that went offline by itself (registry on discovery or the restarting owner); how the standalone path waits for cleanup; which failures stay sticky quarantine; mapping of error codes to user text.
- Technical facts architecture should verify: U-001 (shutdown/restart with retired runs), R-001 (team-member readiness retry safety), R-002 (AGY process overlap).
- Known feasibility or integration risks: Concurrency ordering between AGY `interrupt()`'s asynchronous stop and restore.

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
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
