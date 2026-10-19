# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `codex-segment-turn-admission-drops`
- Request / ticket: Project Task autobyteus-165 "Codex runs drop whole turns of agent output (CODEX_SEGMENT_TURN_INACTIVE / CONFLICT): possible content loss" (FU-001 of autobyteus-143)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), at the user's request
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference: Solution Designer within the direction (user informed); reference: this conversation's result message of 2026-10-19 (see `solution-revision-record.md` SR-001)
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- Problem: the user's server log has 1,963 `[CodexSegmentTurnAdmissionRejected]` warnings, and the Task asks whether Codex runs lose agent output and why. Investigation found two populations:
  1. **31 Aug – 2 Sep (1,727 lines, 88%, including all 1,269 text deltas)**: a Codex `error` with `willRetry: true` ("Reconnecting… n/5") ended the turn in AutoByteus while Codex kept running it, so the rest of the turn (text, tools, reasoning) was dropped from the chat and run history. This was fixed on 2026-09-02 (`fb65f564f6`, released in v1.4.67) with tests. No text delta has been rejected since.
  2. **3 Sep – 18 Oct (130 lines, 58 runs)**: tool items (shell commands, MCP calls) that Codex finishes *after* their turn ended, mostly after the user pressed Stop. The gate rightly refuses to attach them to another turn. No agent text is involved.
  Separately, the gate writes one 6-line warning per rejected event, with no item type or turn id, and without any bound: one rejected turn produced up to 438 consecutive warnings.
- Affected actors or systems: users of Codex-backed agents (history fidelity, already fixed); operators and developers reading the server log.
- Desired outcome: the cause and content-loss answer are documented with evidence; the gate's logging is bounded and identifies what was dropped; admission behavior stays as it is.
- Observable definition of success: a burst of rejections for one turn produces at most one detailed line plus one count summary per boundary, the detailed line names the item type and both turn ids, and the gate admits and rejects exactly the same events as today.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-002 | Since v1.4.67 a `willRetry: true` error is a diagnostic and the turn stays active (before: the turn was ended and the rest dropped) | Unchanged | The willRetry fix and its tests | `fb65f564f6`; investigation notes Source Log |
| BEH-002 | System | SCN-001 | Late `item/started`/`item/completed` of an ended turn are rejected (INACTIVE/CONFLICT) and never attached to another turn | Unchanged | Exact-turn admission (BEH-004) | Rollout correlation |
| BEH-003 | Operational | SCN-001, SCN-002 | One 6-line warning per rejected event; no item type or turn ids; unbounded | Bounded per turn; detailed first line with item type and turn ids; count summaries at turn boundaries and at thread release | Rejected events are still dropped and still logged (counted) | `codex-thread.ts`; server.log |
| BEH-004 | Contract | SCN-001, SCN-002 | Exact-turn admission rule | Unchanged | All admission outcomes | `codex-segment-turn-admission.ts` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User of a Codex agent | Trust that the agent's output is shown and kept | Answer on content loss; no new loss | No chat change in this ticket |
| Operator / developer | Diagnose dropped Codex events | Bounded, informative log lines | No count silently lost |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Logging of Codex gate rejections (bound, content, count summaries) | SCN-001, SCN-002 |
| UC-002 | Documenting the cause and content-loss answer for the 1,963 log lines | SCN-001, SCN-002 |

### Out Of Scope

- Changing which Codex events the gate admits or rejects (BEH-004).
- Showing late tool calls/results that Codex reports after a Stop (FU-001).
- The `lastTerminalTurnId` re-adoption guard in `turn/start` handling (FU-002).
- Recovering the Aug 31–Sep 2 lost content into AutoByteus history (DEC-004).
- AgentRun-level segment lifecycle and its logging (shipped in autobyteus-143).
- The web client and run-history format.

### Non-Goals

- No new chat notice for Codex gate rejections (they stay server-side).

### Preserved Behavior Boundary

BEH-001, BEH-002, BEH-004; REQ-001, REQ-005; AC-004, AC-007.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The gate admits and rejects exactly the same Codex events, with the same reasons, as before this change. | BEH-002, BEH-004 | Must | Residual rejections are correct drops | DEC-001 |
| REQ-002 | Gate rejection logging is bounded per run thread: at most one detailed line per rejected-turn account for the thread's lifetime, plus at most one count summary per account per boundary. An account is the rejected event's own turn id, or one "no turn id" account. | BEH-003 | Must | Task: bound per-event logging; a whole-turn rejection must not flood the log | DEC-002 |
| REQ-003 | The detailed line names the run, runtime kind, native event name, reason, the item type when the event has an item, the rejected event's turn id, and the thread's active turn id at that moment. The summary names run, runtime kind, turn id (or null) and the number of rejections since the account's last line. | BEH-003 | Must | Diagnosable log (which item, which turn) | DEC-003 |
| REQ-004 | No rejection count is silently lost: every rejection is either the account's detailed line or counted in a later summary, written at the next turn boundary the thread observes (`turn/started`, `turn/completed`) or when the thread is released. | BEH-003 | Must | Counts stay trustworthy | DEC-002 |
| REQ-005 | The willRetry fix (BEH-001) and its regression tests stay unchanged and green. | BEH-001 | Must (preserved) | It is the actual content-loss fix | DEC-005 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-002, REQ-004 | BEH-003; SCN-002 | Thread has no active turn; 438 governed events of turn T arrive; then `turn/started` for U | Exactly 1 detailed line for T, then 1 summary `{turnId: T, count: 437}` at U's start | No per-event lines | Unit test on CodexThread |
| AC-002 | REQ-002 | BEH-002/003; SCN-001 | Active turn U; late `item/completed` of ended turns T1, T2, T3 (one each) | 3 detailed lines (CONFLICT), no summary (nothing pending) | — | Unit test |
| AC-003 | REQ-002, REQ-003 | BEH-003 | Rejected events without any turn id (INACTIVE) | One detailed line with `turnId: null`; further ones counted in the "no turn id" summary | — | Unit test |
| AC-004 | REQ-001 | BEH-004 | The existing admission matrix (explicit/inherited/invalid/conflict/inactive/unlisted) | Same accept/reject results and reasons; accepted events emitted exactly as today | — | Existing + updated unit tests |
| AC-005 | REQ-004 | BEH-003 | Pending counts exist; the thread is released (run closed) | One summary line per pending account at release | Released thread with nothing pending writes nothing | Unit test on release path |
| AC-006 | REQ-003 | BEH-003 | A rejected `item/completed` of a `commandExecution` for turn T while U is active | Detailed line includes `itemType: "commandExecution"`, `turnId: T`, `activeTurnId: U`, reason CONFLICT | `itemType: null` for `item/agentMessage/delta` | Unit test |
| AC-007 | REQ-005 | BEH-001 | Server unit suite and typecheck | Existing willRetry tests and all other tests pass | — | `pnpm -C autobyteus-server-ts test:unit`, `typecheck` |
| AC-008 | REQ-002 | BEH-003; SCN-002 | Account T already wrote its detailed line; later more T rejections after a summary | No second detailed line for T; counts appear in a later summary | — | Unit test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User + System | User stops a Codex turn; Codex finishes tools it already dispatched | Stop the agent mid-work | Stop button / new message that interrupts | Codex turn T running parallel commands or an MCP call | Stop → Codex ends T (interrupted) → next turn U may start → Codex sends `item/started`/`item/completed` for T's tool | Event dropped (not attached to U); chat shows T's tool as interrupted; one bounded log line | Late item after a normally completed turn (background exec) behaves the same | Supported Normal Scenario | User's rollouts (97 late items, 50 runs) | REQ-001..REQ-004; AC-002, AC-004, AC-006 |
| SCN-002 | System | Any defect or protocol case that leaves the thread without the turn Codex is running | Keep the log usable when a whole turn's events are rejected | Codex item stream | Thread's active turn ≠ Codex's running turn | Hundreds of governed events of T rejected | ≤ 1 detailed line + 1 summary per boundary | — | Supported Explicit Edge Scenario (operational: the 31 Aug – 2 Sep incident produced it) | server.log bursts of 438/595 | REQ-002..REQ-004; AC-001, AC-003, AC-005, AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`
- All Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002; AC-001 | Operability | A whole-turn rejection of N events writes ≤ 2 log entries before the next boundary instead of N | Per run thread | Unit test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: user data untouched.
- Loss, reset, rebuild, or regeneration that is acceptable: the historical gap in two runs' history (Aug 31–Sep 2) remains (DEC-004).
- Retention, privacy, compliance, volume, downtime, or operational constraints: none.
- Unknowns requiring downstream investigation: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Codex App Server v2 item notifications | Carry the item's own turn id, also when sent after the turn ended | Rollouts | Codex may change this; the rule handles both |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/*.py`, `evidence/*.txt` | Read-only evidence scripts and outputs | — | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Run ef2854b4's lost turn has the same willRetry cause as codex_45ce (Codex logs for that day are rotated) | Cause attribution | Indirect evidence (investigation UNK-001) | Accepted |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Should the gate stop rejecting late tool items of ended turns? | Residual 130 lines | (a) keep dropping; (b) forward them under their own ended turn | Attaching them to the running turn would misattribute output; forwarding under the ended turn would be rejected again by AgentRun's ended-turn rule (autobyteus-143) and would need a new chat/history behavior. The chat already shows those tools as interrupted. Keep dropping. | Solution Designer | Decided |
| DEC-002 | How to bound the log? | Task requirement | (a) rate limit per time; (b) per-turn accounts with first detailed line + boundary summaries (as AgentRun does since autobyteus-143) | (b): deterministic, keeps counts, and matches the existing AgentRun pattern so both layers read the same way. | Solution Designer | Decided |
| DEC-003 | May the log carry turn ids and the item type? | Diagnosis | The current line omits them; AgentRun's rejection log already logs turn ids (opaque UUIDs) | Yes: without them the log cannot tell a late command from lost agent text. No user content is logged. | Solution Designer | Decided |
| DEC-004 | Recover the Aug 31–Sep 2 lost content into AutoByteus history? | Two runs' history is incomplete | The text exists in Codex rollouts; a recovery tool would rewrite user run data | Not part of this direction (explain and fix forward), and rewriting user history is a separate, hard-to-undo decision. Not done; the user can ask for it as its own Task. | Solution Designer | Decided (out of scope) |
| DEC-005 | Is another product fix for the text loss needed? | Task: "fix it if it is a product bug" | `fb65f564f6` (v1.4.67) fixed it with tests; 0 text rejections in the 6.5 weeks since | No new fix; preserve and verify the existing tests (REQ-005). | Solution Designer | Decided |
| DEC-006 | Handle late tool visibility after a Stop and the re-adoption guard here? | Found during investigation | Different behaviors; tool visibility crosses the AgentRun ended-turn rule and sets new visible behavior | Record as follow-ups FU-001 and FU-002 for the delegator; not this ticket. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-002, BEH-004 | AC-004 | SCN-001 | rollout correlation |
| REQ-002 | UC-001 | BEH-003 | AC-001, AC-002, AC-003, AC-008 | SCN-001, SCN-002 | server.log bursts |
| REQ-003 | UC-001 | BEH-003 | AC-003, AC-006 | SCN-001 | — |
| REQ-004 | UC-001 | BEH-003 | AC-001, AC-005 | SCN-002 | — |
| REQ-005 | UC-002 | BEH-001 | AC-007 | SCN-002 | `fb65f564f6` |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001, SCN-002.
- Product and system constraints architecture must preserve: admission outcomes; no chat output; per-run thread scope.
- Decisions intentionally deferred to architecture design: owner and file of the rejection accounts; the exact boundary hooks; the account lifetime.
- Technical facts architecture should verify: turn boundary notifications pass the gate unchanged; the release path.
- Known feasibility or integration risks: none.

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

- Approval recorded: `Yes` (Solution Designer within the direction; the user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
