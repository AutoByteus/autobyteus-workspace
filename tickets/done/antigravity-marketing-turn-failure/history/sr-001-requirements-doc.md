# Requirements — Antigravity Marketing Turn Failure

## Document Status
- Package identifier: antigravity-marketing-turn-failure
- Status: **Ready for Approval**. Baseline: **SR-001**, 2026-10-03.
- Owner: Solution Designer.
- Original request: investigate the suddenly failing AGY Marketing Team at localhost:8001 and fix a bug if found.
- Approval state: **Pending**. Investigation is authorized; the exact repair behavior below has not yet been explicitly approved. No approved requirements/design baseline exists for this package.
- Behavior-defining supplements: None. Investigation evidence is factual, not normative.

## Problem And Desired Outcome
The provider rejected marketing work and two continuation messages because its individual quota was exhausted. AutoByteus hides the actionable quota reason and reset interval behind a generic terminal error. Explain known quota exhaustion safely so users understand when to retry, without pretending quota can be bypassed, resetting their run or weakening private-error redaction.
Actors: users of AGY-backed runs, especially the reported Marketing Team member. Success: a recognized provider quota failure is an explicit, actionable failed turn; user continuation remains available through the existing supported flow when the provider can accept it.

## Relevant Current, Desired And Preserved Behavior
| Behavior ID | Kind / scenarios | Evidence-backed current behavior | Desired behavior | Intentionally preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | System/User; SCN-001 | Explicit individual-quota rejection is replaced with “Antigravity could not complete this turn.” | Public failed-turn feedback clearly explains AGY quota exhaustion and retry guidance; display a validated provider-reported reset interval when available, labeled as reported at failure time. | Failed status, partial assistant output and truthful already-completed tool results. |
| BEH-002 | User; SCN-002 | “continue” and “hello” reach provider, but same quota exhaustion fails again; later restore binds to original conversation. | Preserve existing user-driven continuation in same run/conversation; quota failure is not a new permanent local input lock. | No automatic retry, failover, runtime/model switch, new conversation or history loss. |
| BEH-003 | System/Contract; SCN-003 | Arbitrary terminal error/response content stays private; public fallback is fixed safe text. | Recognized quota guidance is sanitized; unrecognized/malformed failures retain safe generic fallback. | Raw errors/responses, secrets and arbitrary diagnostic text never become public because of this change; private bounded diagnostics remain intact. |
Evidence: investigation-notes.md E-001–E-004; raw native quota rejection and deployed converter branch.

## Stakeholders And Constraints
| Actor | Goal / outcome | Constraint |
| --- | --- | --- |
| Marketing user | Understand stopped work and safely retry later | Preserve recordings/media, partial output, run/conversation identity and history. |
| Runtime / maintainers | Truthful failures and diagnosable reasons | No provider-quota bypass or raw diagnostic leak; other runtimes unaffected. |

## Scope Guardrail
### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Receive an actionable known quota failure during ordinary AGY work | SCN-001 |
| UC-002 | User retries an existing AGY run after a provider terminal failure | SCN-002 |
| UC-003 | Safely report unrecognized/malformed AGY terminal failures | SCN-003 |
### Out Of Scope
Automatic retry/backoff or blocking until a scheduled reset; switching runtime/model/account; purchase/subscription actions; provider quota policy changes; proactive quota dashboard; classifying every external provider error; changing tool outcomes/permissions; new persistent error-history system or migration; redesigning chat/status UI; release/deployment/restart of the user's node during investigation.
### Non-Goals
Guaranteeing the provider will accept a request exactly at its estimated reset time or claiming another model has quota.
### Preserved Behavior Boundary
BEH-001/002/003, REQ-003/004, AC-003/004/005. No authorized data loss/reset.
### Review Authority
Blocking design/implementation findings must cite this eventual approved BEH/REQ/AC basis. New policy, storage, compatibility or recovery obligations are Requirement Gaps requiring explicit renewed approval. Adjacent recommendations do not amend scope.

## Requirements
| ID | Intended behavior / constraint | Behaviors / source |
| --- | --- | --- |
| REQ-001 | When AGY explicitly reports individual quota exhaustion, present a distinguishable quota-exhausted reason and guidance to retry after quota resets, not only an unexplained generic turn error. | BEH-001; incident/request, proposed repair |
| REQ-002 | If the quota error contains a valid reset interval, show its normalized duration as provider-reported at the error time. If missing/malformed, still explain quota exhaustion without inventing a reset time or displaying arbitrary content. | BEH-001; actual observed reset intervals, proposed repair |
| REQ-003 | Do not expose raw terminal error/response payloads. Unknown failures retain safe generic feedback; private bounded diagnostics remain available. | BEH-003; existing safe redaction contract |
| REQ-004 | Preserve terminal failure semantics, partial successful work, existing user-driven continuation/restoration to the same conversation, stored history/configuration and non-AGY behavior. Do not add an automatic recovery or permanent-input-lock policy. | BEH-001/002/003; current supported flow/data invariants |

## Acceptance Criteria
| ID | REQ / behavior / scenario | Trigger | Observable outcome / alternate | Verification intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001/004; BEH-001; SCN-001 | Provider emits failed result with observed “Individual quota reached” cause | Public failed-turn feedback in ordinary AGY Team chat names quota exhaustion and retry guidance; no TURN_COMPLETED/success is fabricated; completed tools/partial text remain truthful. Shared standalone path retains equivalent semantics. | Controlled AGY fixture through real server + rendered error handling; converter assertions. |
| AC-002 | REQ-002/003; BEH-001/003; SCN-001/003 | Quota error includes 4h47m23s, other valid duration, absent/malformed interval, or extra arbitrary/private text | Valid duration appears as normalized reported-at-error information; missing/invalid duration is omitted; unrelated/private text is not exposed. No invented or live-countdown guarantee. | Focused valid/invalid boundary tests and controlled public event assertions. |
| AC-003 | REQ-003; BEH-003; SCN-003 | Unknown/non-string/malformed terminal provider failure or non-success status | Safe generic fallback; no raw provider error/response/secret content in public wire/chat/history; bounded private diagnostic retained. | Existing redaction tests + negative fixture coverage. |
| AC-004 | REQ-004; BEH-002; SCN-002 | User sends a later message after a quota failure | Message can follow existing lifecycle, including exact-conversation restore if runtime is offline. Provider still exhausted -> explicit failed turn again; controlled provider subsequently permits work -> successful turn without new identity or duplicate retry. No automatic send. | Controlled failure→retry→success lifecycle and server continuation checks; do not spend real quota on user's run. |
| AC-005 | REQ-003/004; all behaviors/scenarios | Execute repair / validation | Existing history, capsule, identity, user media/configuration and other runtime behavior unchanged; user's container/data not modified by tests. | Focused regressions, source review and test-owned instance/data cleanup evidence. |

## Relevant Scenarios And Journeys
| ID | Kind / actor / goal | Supported trigger / start / sequence | Expected outcome and supported alternate | Validity / independent evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | User/System; understand halted marketing work | In existing AGY Marketing Team chat, send ordinary work; assistant/tools progress; provider quota becomes exhausted | Understand failed turn as quota exhaustion and available incident-time reset guidance; partial work preserved. If interval absent, reason still explained. | Supported Explicit Edge Scenario: actual screenshots, member traces and provider quota 429 records. |
| SCN-002 | User; continue same work | After failed turn, send “continue” / another message using existing chat | Same run/conversation accepts normal user-driven dispatch; exhausted provider fails truthfully, provider later allowing work completes normally. | Supported Normal Scenario: actual accepted “continue”/“hello”, exact native conversation resume and current lifecycle/restore paths. Later quota-free success is verification intent, not claimed live evidence. |
| SCN-003 | System/Contract; safe failed-turn reporting | AGY reports unrecognized error or malformed metadata during ordinary work | Generic safe failure and private diagnostics; do not expose arbitrary provider payload or fabricate reset/completion | Supported Explicit Edge Scenario: existing converter redaction and transport tests plus observed ordinary failure boundary. |

## UI, Interaction And Experience
Applicable: existing failed-turn feedback text only, no visual/layout redesign. Existing status/error surfaces remain. All Product/prototype repository, ticket, UI/UX supplement, runnable prototype, approval/reference fields: **N/A — not applicable**, not requested. New quota explanation is defined by REQ-001/002, not by a separate UI specification.

## Quality And Non-Functional Requirements
| ID | Linked IDs | Area / measurable constraint | Verification |
| --- | --- | --- | --- |
| QR-001 | REQ-003; AC-002/003 | Privacy: no arbitrary provider payload becomes public due to quota classification | Private marker injection and wire/render/history assertions |
| QR-002 | REQ-004; AC-004/005 | Reliability/data continuity: preserve same identity and normal failure/continuation semantics, no automatic messages | Test-owned lifecycle/transport and cleanup assertions |

## Data Continuity And Acceptable Loss
Affected persisted state: existing run/conversation/capsule, team tree, raw history, partial assistant output, recordings/media. Repair is not authorized to delete, reset, reconstruct or migrate these. Acceptable loss: **none**. Investigation observed 145 raw-trace items in relevant member. No new retention/downtime promise. Deployment/restart requires applicable later delivery gates, not this approval hold.

## External Contracts And Dependencies
Installed AGY CLI stream result/status/error is the authority for provider rejection. Observed CLI 1.2.16 and configured claude-opus-5-5-high. Provider reset interval is guidance, not a guarantee or stable policy. Future unknown wording must fall back safely; compatibility with arbitrary upstream changes is not promised. Existing public failed-turn semantics and private diagnostic boundaries must remain.

## Supplements, Assumptions And Decisions
- Factual supplement inventory: investigation-notes.md; no behavior-defining supplements.
- ASM-001: observed explicit quota reason can be safely distinguished without exposing the whole payload; technical feasibility to verify in approved architecture phase.
- ASM-002: existing public error surfaces can display actionable safe text; inspected renderer consumes payload message, downstream rendered proof required.
- DEC-001: user approves or adjusts SR-001 narrow quota-explanation repair. **Pending**.
- Unknown: current quota availability and actual successful post-reset continuation; no live tests/user messages performed. Not a blocker to proposing controlled validation.

## Traceability
REQ-001 -> UC-001, BEH-001, SCN-001, AC-001.
REQ-002 -> UC-001/003, BEH-001/003, SCN-001/003, AC-002.
REQ-003 -> UC-001/003, BEH-003, SCN-001/003, AC-002/003/005.
REQ-004 -> UC-001/002, BEH-001/002, SCN-001/002, AC-001/004/005.

## Architecture Phase Input
Map approved scenarios through existing AGY event conversion and continuation/restore boundaries. Verify minimal safe classification/presentation, payload shapes, privacy fallback and deterministic validation surfaces. No new storage, scheduler or transport design is pre-authorized. Task size/risk unclassified until design is complete.

## Readiness Check
Content readiness: problem/current/desired/preserved behavior, scope, traceability, scenario validity, evidence inventory, testability and unknowns **Yes**. Product/visual approval **N/A**. Content ready for user approval **Yes**.
Approved basis ready for design: **No**; user approval pending for exact SR-001. Design **N/A — not yet started**. Independent architecture/code review **N/A — not applicable at this phase**, not a review bypass claim.
