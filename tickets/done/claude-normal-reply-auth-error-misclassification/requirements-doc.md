# Requirements Document

## Document Status

- Status: `Approved`
- Approved by: `Solution Designer within the direction (user informed)`; reference: Solution Designer result to the Project Task Manager / user, 2026-10-12 (see `solution-revision-record.md` SR-001 and `handoff-architecture-design-complete.md`)
- Current solution revision ID: `SR-001`
- Package identifier: `claude-normal-reply-auth-error-misclassification` (Project Task `project_task_74fdb459-5ea9-4507-9e05-2aa29130a39e`)
- Request / ticket: URGENT user request 2026-10-12 — "we need to fix this problem immediately… find out why this error is introduced, and then fix that. In the past we do not have such issues."
- Requirements owner: Solution Designer
- Date: 2026-10-12
- Approval state and reference: Approved within the Task's direction; no `Needs user` decisions.
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: `probe-evidence/sdk-0.3.280-not-logged-in.frames.jsonl`, `probe-evidence/sdk-0.3.280-normal-reply-mentioning-login.frames.jsonl` (real SDK 0.3.280 frames; they define the two contract shapes that AC-001/AC-002 are verified against)

## Problem And Desired Outcome

- Problem: When a Claude Agent SDK run finishes a normal turn and its final reply happens to contain "not logged in", "please run /login" or "authentication_failed", the server reports the turn as a terminal `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` error. The user sees the reply inside a red "An Error Occurred" card, and the run's status turns to Error (red sidebar dot).
- Affected actors or systems: any user of a Claude Agent SDK agent run (standalone, Team member, delegated copy, Project Task Manager).
- Desired outcome: A Claude turn counts as failed only when the SDK reports a failure. Words in the agent's reply never decide that.
- Observable definition of success: A normal reply mentioning login or authentication shows as a normal message, the turn completes, and the run returns to Idle. A real "Not logged in" failure is still reported as `CLAUDE_RUNTIME_AUTHENTICATION_FAILED`.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | A successful SDK result (`subtype:"success"`, `is_error:false`) whose `result` text contains a marker is classified as a terminal turn error: ERROR event with code `CLAUDE_RUNTIME_AUTHENTICATION_FAILED`, run status `ERROR`, no `TURN_COMPLETED`, assistant reply not added to the session message cache, `hasCompletedTurn` not set, and the result frame is not projected. | The turn completes normally. No error event, status returns to `IDLE`, the reply is recorded as an assistant message, and `TURN_COMPLETED` is emitted. | Normal completion path unchanged for replies without markers. | investigation-notes Source Log S-01..S-06, R-01, R-03 |
| BEH-002 | Contract | SCN-002 | A real auth failure (`is_error:true`, `result:"Not logged in · Please run /login"`, preceded by an assistant frame with `error:"authentication_failed"`) is reported as `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` with the SDK message. | Unchanged. | Code, message text, credential redaction, `errors[]` fallback (from 29c1fa66b). | R-02, existing tests |
| BEH-003 | Contract | SCN-003 | Other SDK error results (`is_error:true`, or an `error`/`code` field, or a non-success subtype) are reported as `CLAUDE_RUNTIME_RESULT_ERROR` with the provider message. | Unchanged. | Message selection precedence and redaction. | existing unit tests |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| App user | Read agent replies and trust the run status | Normal replies are never shown as errors | Real auth failures must stay visible |
| Delegating agent / Team coordinator | Rely on a member's turn finishing normally | A member's normal turn completes and is recorded | None |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A Claude SDK turn ends successfully with a reply that mentions login or authentication | SCN-001 |
| UC-002 | A Claude SDK turn fails because the runtime is not logged in | SCN-002 |

### Out Of Scope

- How the frontend displays errors (ErrorSegment, status handler). They render correctly whatever the server classifies.
- Other runtimes (Codex, AGY, Grok) and their error classification.
- Re-classifying or repairing past runs already stored with this error.
- Detecting auth failure *before* the first turn (runtime readiness checks).

### Non-Goals

- No new error codes or new auth-failure user experience.

### Preserved Behavior Boundary

BEH-002, BEH-003; the 29c1fa66b behavior (provider-supplied terminal message preserved, `errors[]` fallback, credential redaction); REQ-002, REQ-003.

### Review Authority

Standard: blocking findings must cite REQ/AC/BEH IDs here; new behavior is a Requirement Gap.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A Claude result is a turn error only when the SDK reports one through its own fields (`is_error: true`, an explicit error code field, or a non-success subtype). The text of the reply alone never makes a turn an error. | BEH-001 | Critical | The SDK contract says `result` on success is the agent's final reply. Searching it for words misreads user content. | Task Done #2; SDK `sdk.d.ts` SDKResultMessage doc; DEC-001 |
| REQ-002 | When a result *is* an SDK-reported error and its error text or code matches the auth markers, it keeps the code `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` and the provider message (redacted). | BEH-002 | Critical | Real "Not logged in" must still be reported. | Task Done #3 |
| REQ-003 | All other error-result behavior stays the same (code `CLAUDE_RUNTIME_RESULT_ERROR`, message precedence, `errors[]` fallback, redaction, non-success subtype fallback). | BEH-003 | High | Keep 29c1fa66b's intent. | Task lead; 29c1fa66b |
| REQ-004 | Regression coverage uses realistic SDK result payloads for both cases: a successful reply mentioning the markers, and a real not-logged-in failure. It checks the full turn outcome, not just the classifier. | BEH-001, BEH-002 | High | Task Done #4 | Task |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-004 | BEH-001 / SCN-001 | Claude session; the turn ends with the real-shape success result whose `result` contains "Not logged in · Please run /login" and "authentication_failed" (`is_error:false`, `terminal_reason:"completed"`) | No ERROR event; `TURN_COMPLETED` emitted; status `IDLE`; the assistant reply is in the session message cache; `hasCompletedTurn` true | — | Unit (classifier) + session-level unit test with the real frame shape |
| AC-002 | REQ-002, REQ-004 | BEH-002 / SCN-002 | Claude session; the turn ends with the real-shape not-logged-in frames (assistant `error:"authentication_failed"` then result `is_error:true`, `subtype:"success"`, `terminal_reason:"api_error"`, `result:"Not logged in · Please run /login"`) | ERROR event message contains `CLAUDE_RUNTIME_AUTHENTICATION_FAILED: Not logged in · Please run /login`; status `ERROR`; no `TURN_COMPLETED` | — | Session-level unit test with the real frame shape |
| AC-003 | REQ-003 | BEH-003 / SCN-003 | Existing classifier/session tests for error results, `errors[]`, redaction | All pass unchanged | — | Existing suites |
| AC-004 | REQ-001 | BEH-001 / SCN-001 | Released app, a Claude agent asked to reply with a sentence containing "not logged in" / "please run /login" | The reply is a normal message, no red card, the run dot does not turn red | — | User verification in the released app |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User talking to a Claude SDK agent (direct, Team, delegated) | Agent answers and its answer mentions login/auth | Normal message to the agent | Claude runtime logged in | User sends → agent works → agent's final reply mentions "not logged in" etc. → turn ends | Normal reply, turn completes, run Idle | — | Supported Normal Scenario | Both screenshots; memory traces of api_e2e_engineer_17d4… and project_task_manager_7c8d… (R-01) | REQ-001, AC-001, AC-004 |
| SCN-002 | Contract | Claude Agent SDK | Runtime not logged in | Normal message to the agent | Claude CLI has no credentials | User sends → SDK emits synthetic assistant error + error result | Turn reported as `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` | — | Supported Explicit Edge Scenario (SDK contract; f5866908a startup fix) | R-02 real capture | REQ-002, AC-002 |
| SCN-003 | Contract | Claude Agent SDK | Other turn failure | Any | Any | SDK emits error result | `CLAUDE_RUNTIME_RESULT_ERROR` | — | Supported Explicit Edge Scenario | SDK types; existing tests | REQ-003, AC-003 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — the server classification fix corrects the display. Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002 | Security | Credential redaction of the terminal message stays in place | Error results | Existing redaction tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. Past runs that were misclassified stay as stored. Their assistant traces were already recorded in memory (R-01).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `@anthropic-ai/claude-agent-sdk` 0.3.280 `SDKResultMessage` | `subtype:"success"` carries the final reply in `result`. With `is_error:true` it carries the error text. Error subtypes carry `errors[]`. | `sdk.d.ts` lines 5447–5560; real captures R-02/R-03 | Low; `is_error` is a required field in both variants |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probe-evidence/sdk-0.3.280-not-logged-in.frames.jsonl` | Real not-logged-in assistant+result frames | AC-002 | Final | Behavior-defining; approved with SR-001 |
| `probe-evidence/sdk-0.3.280-normal-reply-mentioning-login.frames.jsonl` | Real success frames whose reply contains all markers | AC-001 | Final | Behavior-defining; approved with SR-001 |
| `probe-evidence/turn-final-marker-scan.txt` + `scan-turn-final-replies.py` | History scan explaining "not seen in the past" | Root cause | Final | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The SDK always sets `is_error:true` on auth-failure results | REQ-002 relies on it | Verified by real capture R-02 (SDK 0.3.280) | Verified |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What counts as an SDK-reported error? | Defines the fix | (a) keep the text search but only on `is_error` results; (b) drop the text markers entirely and use the assistant frame's `error:"authentication_failed"` | Option (a). The SDK's own structured fields (`is_error`, error code, subtype) decide whether it's an error. The markers only pick the more specific code *after that*. This is the smallest change, keeps the existing auth code for real failures (R-02 has `is_error:true` and the marker text), and keeps 29c1fa66b's message behavior. Option (b) needs a new cross-frame state for no added user benefit. | Solution Designer | Decided |
| DEC-002 | Repair stored history of past misclassified turns? | Scope | Their replies are already in memory traces; only the transient error card/status was wrong | No; out of scope. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-004 | SCN-001 | normal-reply frames |
| REQ-002 | UC-002 | BEH-002 | AC-002 | SCN-002 | not-logged-in frames |
| REQ-003 | UC-002 | BEH-003 | AC-003 | SCN-003 | — |
| REQ-004 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-002 | SCN-001, SCN-002 | both frame files |

## Architecture Phase Input

- Approved scenario IDs: SCN-001, SCN-002, SCN-003.
- Constraints: preserve error message precedence, `errors[]` fallback, redaction, interrupt-abort handling in the turn tracker.
- Technical facts to verify: the single caller of the classifier (`claude-turn-tracker.ts` `resolveResultFailure`); all downstream effects come from that one classification.

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

- Approval recorded: `Yes` (Solution Designer within the direction; user informed in the result message)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
