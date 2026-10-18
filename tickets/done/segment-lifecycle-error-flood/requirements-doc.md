# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `segment-lifecycle-error-flood`
- Request / ticket: Project Task `autobyteus-143` "Investigate: a full screen of 'An Error Occurred: A runtime segment event violated the canonical lifecycle contract.' in a Claude Agent SDK agent's chat (possible product bug)"
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's report of 2026-10-18
- Requirements owner: Solution Designer
- Date: 2026-10-18
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: Solution Designer's message to the user in this conversation, 2026-10-18 (requirements decided within the Task's direction "fix it if it is a clear product bug; decide what is right (merge, hide, show once)"; the user also asked for experiments on the design, recorded in the design spec)
- Exact approved requirements baseline / solution revision: this document at `SR-002` (SR-001 baseline + REQ-004/QR-001/AC-005 clarification after ARCH-REV-001 AR-001; Solution Designer within the direction, user informed)
- Behavior-defining supplements and their approved versions: none (the probe and experiment patches are evidence only)

## Problem And Desired Outcome

- Problem: when Claude starts a turn on its own right after another turn (typical after a background task finishes), AutoByteus can mark the new turn as already finished. From then on, every piece of that turn's agent text is dropped and replaced by a red card "An Error Occurred — A runtime segment event violated the canonical lifecycle contract.", one card per dropped event. The agent shows "Idle" although it is working. The dropped text is also missing from the run's saved history. The server log records nothing about it. The same flaw can also drop the remaining text of the earlier turn.
- Affected actors or systems: users watching a Claude Agent SDK agent (standalone, Team member, Org member); any runtime whose runtime state moves on before AutoByteus has processed that runtime's queued events; AgentRun status consumers.
- Desired outcome: agent text and status stay correct when turns follow each other quickly. A lifecycle rejection that still happens (a real runtime contract problem) never floods the chat. It shows at most one plain-language notice for the affected turn, and the server log says what was rejected and why.
- Observable definition of success: replaying the user's event shape gives no notice, all turn text visible and saved, and status `running` during the turn. A forced real violation gives at most one notice per turn and a server log line with the reason.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | The second of two back-to-back turns loses all its text; one red card per text event | All text of both turns is shown and saved; no card | Turn order, tool cards, notices ("Background task completed…", "Claude started a turn on its own.") | investigation-notes Source Log (user traces); probe X1 |
| BEH-002 | System | SCN-001 | Status `idle` while the second turn runs | Status `running` while it runs; `idle` after it ends | Status transitions of ordinary turns | probe X2 |
| BEH-007 | System | SCN-001 | If the first turn still has text queued when the runtime moves on, that text is dropped (cards) | First turn's text is shown and saved | — | experiment X5 (base: 3 cards, text lost) |
| BEH-003 | System | SCN-002 | Each rejected segment event gives its own chat card; nothing logged | At most one notice per turn, in plain language, only in the turn it describes; every rejection is recorded in the server log with reason (bounded, see REQ-004) | Rejection itself (late/foreign/malformed segment events stay undisplayed) | transformer code; probe X3 |
| BEH-006 | System | — | Other turn diagnostics (e.g. provider retry notices) show as cards | Unchanged | Yes | codex notification handler |
| BEH-008 | Contract | SCN-003 | A run whose current turn is known only from the runtime's state (e.g. attached/restored mid-turn, runtimes that report the turn id only through their state) is treated as running that turn; commands (Stop, append) target it | Unchanged | Yes | E1 experiment: 22 tests depend on it |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User watching an agent | See what the agent says and does; know whether it is working | Complete text, correct status, no meaningless error flood | Must still learn when output really could not be shown |
| Support/developer reading the server log | Diagnose a real contract violation | One log entry naming run, runtime, turn, event type, segment and reason | Log must not flood either |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A runtime starts a new turn before AutoByteus has processed the previous turn's queued events (Claude provider-initiated turns after background tasks are the observed case) | SCN-001 |
| UC-002 | A segment event is rejected by the canonical segment lifecycle (late, foreign or malformed) | SCN-002 |

### Out Of Scope

- The Codex thread's own admission gate (`[CodexSegmentTurnAdmissionRejected]`, 1,965 log entries). It is a different layer and mechanism, has no chat effect, and its cause is unknown. It becomes follow-up FU-001.
- Recovering text already lost in past runs. It is not in AutoByteus data. Claude's own session files are outside AutoByteus.
- Changing the turn/segment wire contract, the web rendering of error cards, or other diagnostic producers.
- Reworking how AgentRun answers command-side "which turn is running now" questions (interrupt/append/shutdown).

### Non-Goals

- Making every runtime emit perfectly ordered events. The fix makes AutoByteus robust to the ordering it already gets.

### Preserved Behavior Boundary

- BEH-006, BEH-008 unchanged; REQ-005.
- Segment events of a turn that has ended stay undisplayed (rejection kept; only its presentation and logging change).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A turn is treated as ended only on the run's ordered evidence: its own terminal event or turn-terminal error, a newer turn start observed in the event stream or by an accepted command, or the runtime going offline or failing globally. A runtime-state reading that may be ahead of the queued events never ends a turn, and never makes a turn end when the turn's own queued start event arrives later. | BEH-001, BEH-007 | Critical | Root cause of the content loss | investigation; experiments E2/E4 |
| REQ-002 | The run status reflects the turn that is actually running when turns follow each other quickly: `running` while the newer turn runs, `idle` after it ends. | BEH-002 | Critical | Status consumers (Stop, idle shutdown, input admission) must not treat a working run as idle | probe X2 |
| REQ-003 | A segment event rejected by the canonical lifecycle produces at most one chat notice per turn. The notice appears only while the affected turn is the run's current turn and reads in plain language that some of the agent's output in this turn could not be shown. Rejections for any other turn produce no chat notice. | BEH-003 | High | Stops the flood; keeps the user honestly informed when content really is missing, without placing a notice under the wrong turn | DEC-002 |
| REQ-004 | Every segment lifecycle rejection is accounted for in the server log, and the number of log lines never grows with the number of rejected events. The first rejection of a turn (or of events that carry no turn id) logs one warning with run id, runtime kind, turn id, event type, segment id and a reason code. Later rejections are counted and reported as one summary line per turn, with their count, at the run's next lifecycle boundary: a turn ending, or the run releasing its runtime (runtime failure, offline, or the user's Terminate). Pending counts are never dropped silently. (Clarified in SR-002: rejections arriving after a turn's summary, typically late events after it ended, are reported in a later boundary's summary.) | BEH-003 | High | Today nothing is logged; per-event logging would flood the log (as the Codex gate does) | DEC-003 |
| REQ-005 | Preserved: a run whose current turn is known only from the runtime state keeps being treated as running that turn (status, Stop, append). Segment events of a turn that has ended stay undisplayed. Other turn diagnostics keep showing as before. The error event contract (`code` `AGENT_SEGMENT_LIFECYCLE_INVALID`, `error_scope: turn`, `error_effect: diagnostic`, `turn_id`) is unchanged. | BEH-006, BEH-008, BEH-003 | High | No regression | E1 experiment |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001 | Claude run: an input turn starts a background task and completes; the task completes; the CLI runs a task-notification turn and immediately starts another turn that writes text, all before AutoByteus processed the queue | Zero `AGENT_SEGMENT_LIFECYCLE_INVALID` events; the second turn's text segments are delivered in order and recorded in run memory | — | Durable server test through real ClaudeSession → ClaudeAgentRunBackend → AgentRun (scripted SDK), plus run-memory assertion |
| AC-002 | REQ-001 | BEH-007, SCN-001 | As AC-001, but the first provider turn also writes text | Both turns' text delivered; zero lifecycle diagnostics | — | Same harness |
| AC-003 | REQ-002 | BEH-002, SCN-001 | As AC-001, checked while the second turn is still running and after it ends | `getStatusSnapshot().status` is `running` mid-turn and `idle` after | — | Same harness |
| AC-004 | REQ-003 | BEH-003, SCN-002 | Several invalid segment events of the current turn (e.g. content for a segment never started) | Exactly one `AGENT_SEGMENT_LIFECYCLE_INVALID` event for that turn, with the plain-language message | Segment events of an ended turn → no chat notice | Unit tests of the segment lifecycle transformer/state |
| AC-005 | REQ-004 | BEH-003, SCN-002 | (a) As AC-004; (b) turn T has ended and 3 late segment events of T arrive while turn U runs; (c) the current turn has several rejections and the user terminates the run; (d) 2 invalid events without a turn id | (a) one detailed warning at the first rejection, one summary with the remaining count when the turn ends; (b) no chat notice, one detailed warning (reason `TURN_ENDED`), one summary "2" at the next boundary (U ends or the run releases); (c) the pending count is logged as one summary during termination; (d) one warning and one summary at the next boundary, no notice | Rejection volume never adds lines beyond these | Unit tests capturing the logger (state, transformer, termination) |
| AC-006 | REQ-005 | BEH-008, BEH-006 | Existing suites | Server unit, integration and typecheck stay green; tests covering snapshot-only current turns, interrupt/append targeting and provider retry diagnostics pass unchanged. Tests asserting a chat diagnostic for a segment event of an already-ended turn change intentionally to 0 notices under REQ-003 (named in the design spec) | — | Full server suites |
| AC-007 | REQ-001..REQ-003 | SCN-001 | Isolated desktop instance of the worktree build, Claude Agent SDK agent, real background task that finishes and makes Claude continue on its own | Agent text of the self-started turn visible; no lifecycle notice; status Running during it | If a real signed-in Claude run is not possible in the validation environment, record the gap; AC-001..AC-003 remain the executable proof | Isolated app per TESTING.md |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Claude Agent SDK agent with background tasks | Claude continues by itself after its background task finishes | Agent runs a Bash command in the background and ends its turn; the task finishes | Agent idle, background task running | Task completes → Claude runs a task-notification turn → Claude starts another turn on its own and works (text + tools) | Text and tools of every turn are visible and saved; status Running while it works | — | Supported Normal Scenario | User's run traces 2026-10-18 10:58:46; background-task feature (`claude-sdk-background-task-lifecycle`) | REQ-001, REQ-002; AC-001..AC-003, AC-007 |
| SCN-002 | System | Any runtime | A runtime sends a segment event the canonical lifecycle must reject (late after the turn ended, for a foreign turn, malformed) | Runtime event stream | Run active | Rejected event | Event not displayed; at most one notice in the current turn; server log entry | — | Supported Explicit Edge Scenario (the lifecycle contract explicitly rejects these, `6a2ac70de7`) | transformer/state code | REQ-003, REQ-004; AC-004, AC-005 |
| SCN-003 | Contract | AgentRun lifecycle contract | Run's current turn known only from runtime state | Attach/restore or runtime reporting its turn only via state | Turn running | Status read / Stop / append | Treated as running that turn | — | Supported Explicit Edge Scenario (existing tested contract) | E1 experiment failures | REQ-005; AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (notice frequency and text only; no new UI)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable (existing error card)
- Normative visual and interaction details: the existing error card, at most once per turn (REQ-003); title stays "An Error Occurred"; message "Some of the agent's output in this turn could not be shown."
- Explicitly illustrative fixture content or permitted implementation variation: none
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: none new
- Product decisions that need the user: none (DEC-002 decided within the direction)

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004 / AC-005 | Operability | Log lines from segment lifecycle rejections are independent of the number of rejected events: at most 1 detailed warning per turn, plus at most 1 summary line per turn per run lifecycle boundary. A turn whose rejections all occur before one boundary gets at most 2 lines | Any rejection volume | Unit test |
| QR-002 | REQ-003 / AC-004 | Other (UX) | At most 1 lifecycle notice per turn | Any rejection volume | Unit test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (no format change; affected turns now get their normal memory records)
- Data or state that must be preserved: existing run memory and histories untouched
- Loss, reset, rebuild, or regeneration that is acceptable: none introduced; text already lost in past runs stays lost
- Retention, privacy, compliance, volume, downtime, or operational constraints: none
- Unknowns requiring downstream investigation: none

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Agent presentation error DTO | Unchanged shape | `agent-presentation-message-dtos.ts` | None |
| Claude CLI streaming (provider-initiated turns) | Consecutive self-started turns are normal | claude-turn-tracker | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/claude-provider-turn-segment-race.probe.test.ts`, `evidence/probe-run-base-1c718202b2.txt` | Reproduction | AC-001..AC-003 | Current | Evidence only |
| `experiments/E2-provisional-snapshot-turn.patch`, `E3-arrival-snapshot.patch`, `E4-shared-turn-identity.patch`, `experiments/experiment-results.md` | Design experiments | REQ-001, REQ-002 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Runtimes other than Claude only benefit from the ordered-evidence rule | Shared state change | Full server suites (Implementation, API/E2E) | Open — E4 prototype: full server unit green (721/4 skipped), related integration as base; to re-confirm on the final implementation |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Fix the cause or only hide the cards? | Hiding alone keeps losing text and the wrong Idle status | Evidence: real content loss in memory; status wrong | Fix the cause (REQ-001/002); hiding alone would make the loss silent. Recommended and decided. | Solution Designer | Decided |
| DEC-002 | What should the user see for a real rejection: merge, hide, or show once? | Task asks to decide | Flood (now) / hide entirely / once per turn | Show once per turn, plain language, only in the turn it describes. A remaining rejection means output really is missing, so hiding it would be dishonest; more than one card adds nothing. Placing it only in the current turn avoids putting a notice under the wrong turn (the web appends diagnostics to the message being shown). Other turns: log only. | Solution Designer | Decided |
| DEC-003 | What should the server log? | Today nothing; the Codex gate logs per event (1,965 lines) | per event / first per turn / first + summary; for late events after a turn ended (ARCH-REV-001 AR-001): drop their counts, or report them at a later boundary | First rejection per turn with full detail and a reason code, plus count summaries at run lifecycle boundaries (a turn ending, release, Terminate). Late events after a turn ended are a main real case, so their counts are reported at the next boundary, not dropped. Log volume then depends on boundaries, never on event count. That is the property that matters; a strict "2 lines per turn" would require silently dropping late counts. Clarified in SR-002. | Solution Designer | Decided |
| DEC-004 | Include the Codex gate rejections? | Separate mechanism, no chat effect, unknown cause | Investigated: different layer | Out of scope → follow-up FU-001 to the Project Task Manager with evidence. | Solution Designer | Decided |
| DEC-005 | Release vehicle | Done criterion says next beta or release | RELEASE.md | Ships with the next beta after merge; the release itself is Delivery's decision per RELEASE.md. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-007 | AC-001, AC-002, AC-007 | SCN-001 | probe, E2/E4 |
| REQ-002 | UC-001 | BEH-002 | AC-003, AC-007 | SCN-001 | probe X2 |
| REQ-003 | UC-002 | BEH-003 | AC-004 | SCN-002 | — |
| REQ-004 | UC-002 | BEH-003 | AC-005 | SCN-002 | — |
| REQ-005 | UC-001, UC-002 | BEH-006, BEH-008 | AC-006 | SCN-003 | E1 |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-003.
- Product and system constraints architecture must preserve: REQ-005; ordered per-run dispatch queue; DTO contract.
- Decisions intentionally deferred to architecture design: where the ordered-evidence rule lives (one owner vs two copies); whether snapshot capture timing changes.
- Technical facts architecture should verify: which backends deliver batches asynchronously relative to their state (Codex comment: "a synchronous native terminal update does not mean its async canonical batch reached AgentRun").
- Known feasibility or integration risks: command-side "current turn" during the short queue lag (see design).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
