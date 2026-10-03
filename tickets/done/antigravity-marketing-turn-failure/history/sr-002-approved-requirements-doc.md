# Requirements — Runtime Error Reporting

## Document Status
- Stable package identifier: antigravity-marketing-turn-failure.
- Status: **Approved**; approved intended-behavior baseline **SR-002**, 2026-10-03. Current solution round **SR-003** (approval and design).
- Owner: Solution Designer. Original request: investigate/fix repeated Marketing Team errors on node localhost:8001.
- Latest scope authority: user says, “In general ... if runtime have certain errors, the user interface should actually display maybe a little bit more raw error from the runtime instead of runtime error. That's it.” User also describes a previous limit-exhaustion incident hidden by generic feedback. This supersedes the assistant's quota-specific proposal.
- Exact revised-baseline approval: **Received**. User first confirmed “of course not entire log.” Then explicitly authorized proceeding: “this is common software engineering practice. lets go i think requirement is clear now”. These messages approve the SR-002 general runtime-error-message behavior and safety/preservation boundary presented immediately beforehand. SR-001 quota-specific proposal remains superseded, never approved.
- Behavior-defining supplements: None. History/sources are evidence only.

## Problem And Desired Outcome
Useful runtime/provider error text can be replaced with generic “runtime error” feedback, leaving users unable to distinguish a limit issue from a software fault. The AGY incident proves this: the actual error says “Individual quota reached ... Resets in ...”, while public feedback says only that the turn could not complete.
**General intended behavior:** display the runtime's supplied useful error message (and any supplied reason/code/hint), not a bespoke quota classification or list of recognized errors. Keep sensitive credentials redacted. Use generic feedback only when no useful displayable message is available.
Actors: users of currently supported Agent runtimes and Team/Org members experiencing runtime/provider errors in the existing chat error surfaces. Success: a user can read the reported reason without log investigation; no backend recovery or UI redesign is introduced.

## Relevant Current, Desired And Preserved Behavior
| ID | Kind / scenarios | Evidence-backed current | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | System/User; SCN-001/004 | AGY terminal errors drop all useful provider text. Some other runtimes already preserve actual messages. | Retain useful runtime-supplied error text in public feedback across existing runtime error paths, including unfamiliar causes. Existing specific messages must not regress. | Truthful failed status, partial output and successful completed tools. |
| BEH-002 | User; SCN-002 | Existing dispatch/continuation/restore binds the same conversation; actual “continue”/“hello” reached provider. | Preserve normal user-driven continuation while improving explanatory feedback. | No automatic retries, switches, input locks or identity reset. |
| BEH-003 | System/Contract; SCN-003 | AGY blanket suppression hides safe and unsafe errors alike; native provider errors have credential redaction. UI interpolates error text, not raw HTML. | Useful error messages can be shown without a recognized-error allowlist; credential/secret fragments are redacted and non-error responses/log dumps stay outside public error reporting. Generic fallback only for absent/empty/unusable messages. | Safe plain-text rendering, bounded feedback and private diagnostic ownership. |

## Stakeholders And Constraints
Users need to distinguish “quota reached”, “rate/read limit reached” and other runtime reasons from application faults. Runtime maintainers preserve truthful lifecycle and provider meaning. The original quota incident remains confirmed; the earlier limit incident is **user-reported**, not independently investigated or reclassified as the same cause.

## Scope Guardrail
### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Read actual runtime/provider cause in ordinary chat failure feedback | SCN-001/004 |
| UC-002 | Continue same run through existing user-driven flow | SCN-002 |
| UC-003 | Safely display useful runtime error text or missing-message fallback | SCN-003/004 |
### Out Of Scope
Quota-specific classifiers, whitelist/catalog of supported failures, reset-duration parsing/countdown, inferred retry times, automatic retries/backoff/failover/runtime/model/account switches, recovery/state changes, new quota dashboard, subscription operations, tool-output policies, full raw logs/stderr/stack traces/assistant response dumps, new persisted error-history system, migration and chat redesign. No live user's node restart/reset/deployment during investigation.
### Non-Goals
Guaranteeing that arbitrary raw text contains no conceivable sensitive value or that a provider's hint/reset estimate is accurate. Do not invent details or new compatibility promises when a provider supplies none.
### Preserved Behavior Boundary
BEH-001/002/003, REQ-003/004, AC-003/004/005. No data loss/reset. Existing runtime-specific codes, scopes/effects and meaningful messages remain; generic heading/status can remain when the actual cause is readable in the card.
### Review Authority
Blocking technical findings must trace to the approved BEH/REQ/AC basis. New product/security/storage/recovery policies are Requirement Gaps requiring renewed approval. Adjacent recommendations do not change scope.

## Requirements
| ID | Intended behavior | Linked basis |
| --- | --- | --- |
| REQ-001 | Show available meaningful runtime/provider error text in existing UI error feedback rather than replacing it with a generic runtime/turn error. This applies generally, not only to recognized quota/rate-limit errors. Preserve already informative runtime paths. | BEH-001; user scope correction; E-001–005 |
| REQ-002 | Preserve useful runtime-supplied reason/code/hints as reported when available, including any reset text; do not require a classifier, reinterpret the failure or fabricate missing provider details. Missing/empty/non-text/unusable message -> truthful generic fallback. | BEH-001/003; user request and current structured error contracts |
| REQ-003 | Show error-message content, not wholesale diagnostic/response/log content. Keep credential/secret redaction and safe bounded plain-text display; private diagnostics remain private. Redaction must not erase the non-sensitive explanation merely because it is unfamiliar. | BEH-003; existing safety boundaries |
| REQ-004 | Preserve existing failure scope/effect, partial successful work, run/conversation identity, history/configuration and user-driven continuation. No automatic recovery or new input-lock policy. | BEH-001/002/003; supported lifecycle/data invariants |

## Acceptance Criteria
| ID | REQ / scenarios | Trigger and observable outcome | Verification intent |
| --- | --- | --- | --- |
| AC-001 | REQ-001/002/004; SCN-001/004 | Runtime supplies individual-quota, rate/read-limit or a previously unclassified error message -> actual useful text is readable in the normal Agent/Team member chat card, not replaced solely by generic runtime error. Supplied hints are retained; no success/completion is fabricated. | AGY observed-message control and at least an unfamiliar-error control through actual backend/public transport and rendered feedback; representative existing runtime-path regressions. |
| AC-002 | REQ-002/003; SCN-003 | Missing/empty/malformed runtime error content -> safe meaningful generic fallback, not “[object Object]”, raw JSON or invented limit/reset details. Usable structured message -> preserve its useful text. | Message-shape boundary tests and public error assertions. |
| AC-003 | REQ-003; SCN-003/004 | Error contains credential fragments and useful reason, multiline/long text or markup -> retain useful reason while credential fragments are redacted, feedback bounded and rendered as inert text. Separate provider response/private diagnostic content is not public. | Controlled secret/response markers, bounds/rendering assertions; preserve private diagnostic regressions. |
| AC-004 | REQ-004; SCN-002 | Subsequent user message after failure -> existing dispatch/restore still uses same run/conversation; provider rejection is truthful, later permitted work can complete. No automatic message or duplicate turn. | Focused lifecycle/restore regressions for changed owners with test-owned data. |
| AC-005 | REQ-001/003/004; all scenarios | Repair and validation -> existing specific error messages are not generalized, provider details remain available, histories/config/media unchanged; tests do not modify user's container/data. | Cross-runtime message-path tests, scoped source checks and cleanup evidence. |

## Relevant Scenarios And Journeys
| ID | Kind / actor / goal | Supported trigger / start / sequence | Expected / alternate | Validity / independent evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | User/System; understand stopped marketing work | Existing AGY member doing ordinary work hits provider quota | Actual provider quota message/hint readable; partial work/failure unchanged. | Supported Explicit Edge Scenario: actual screenshot, exact provider diagnostics/traces. |
| SCN-002 | User; continue same work | After failed turn, user sends another normal chat message | Existing same-conversation dispatch/restore; failure or success remains provider-governed. | Supported Normal Scenario: actual continuation traces/restore and current code. |
| SCN-003 | System/Contract; safe error feedback | Structured runtime failure contains secret fragments, missing or malformed message | Useful text with safety controls, or generic missing-message fallback; no diagnostic dumps. | Supported Explicit Edge Scenario: existing redaction/message contracts and failure tests. |
| SCN-004 | User/System; understand general runtime errors | Ordinary Agent/member runtime emits meaningful error (limit-related or unfamiliar cause) | Reason is displayed without a quota/error-category allowlist; already-specific feedback retained. | Supported Explicit Edge Scenario: latest user-directed general behavior; current Codex/Claude/ACP/native error contracts independently show message-bearing runtime errors. Past limit incident is user-reported. |

## UI / Interaction / Experience
Existing chat error card message/detail surfaces, not a new screen/layout. Generic “Error” status/“An Error Occurred” heading need not change if actual cause is readable below. Plain text, not executable HTML. No Product/prototype request; all prototype repository/ticket/visual specification/runnable references and UI/UX approvals: N/A — not applicable.

## Quality And Non-Functional Constraints
QR-001 -> REQ-003 / AC-003: preserve credential redaction and safe bounded text without suppressing the explanation; controlled negative/render checks.
QR-002 -> REQ-004 / AC-004/005: lifecycle/data/identity continuity; no automatic messages; test-owned validation.
No new performance/SLA, fully-general secret detection or security policy is claimed.

## Data Continuity And Acceptable Loss
No authorized history/schema migration, run reset, media deletion or config rebuild. Preserve exact conversation/capsule/tree/raw history, recordings and partial output. Inspected AGY member has 145 trace rows. Acceptable loss: none. Current historical error-card availability remains unchanged; do not promise new error archives.

## External Contracts And Dependencies
Currently registered runtimes: autobyteus, claude_agent_sdk, codex_app_server, antigravity_cli, grok_build. Available structured runtime/provider error text is the authority for explanation; details/codes can be absent. AGY stream error in the incident lacks the 429 code present in CLI logs: do not invent code 429 solely from quota wording. Existing WebSocket message/detail fields and runtime lifecycle contracts remain.

## Supplements / Assumptions / Decisions
Canonical evidence inventory: investigation-notes.md. No normative supplements. Earlier SR-001 requirements/result archived in history/ for audit only, superseded.
ASM-001: available error messages can improve explanation without exposing whole logs/response objects; current other-runtime paths already support this, AGY needs correction.
ASM-002: UI already displays message/details, so some necessary changes may be backend-side even though outcome is UI-visible. Exact technical solution deferred to approved architecture.
DEC-001: SR-001 quota-specific proposal superseded by user-directed general scope.
DEC-002: SR-002 approved by explicit user “lets go ... requirement is clear now”, following “of course not entire log”; architecture may now proceed. Approval does not authorize bypassing validation/delivery gates or changing live user state.

## Traceability
REQ-001 -> UC-001/003, BEH-001, SCN-001/004, AC-001/005.
REQ-002 -> UC-001/003, BEH-001/003, SCN-001/003/004, AC-001/002.
REQ-003 -> UC-001/003, BEH-003, SCN-003/004, AC-002/003/005.
REQ-004 -> UC-001/002, BEH-001/002/003, SCN-001/002/003/004, AC-001/004/005.

## Architecture Phase Input / Readiness
Verify actual message loss at runtime boundaries, reuse current error/details/rendering capability, preserve meaningful existing paths, and avoid a quota-specific mapper or needless cross-runtime rewrite. No target architecture authored.
Content readiness (supported facts, scope/current/desired/preserved behavior, stable traceable IDs, tests/unknowns): Yes. Visual/Product supplements: N/A.
Approved basis ready for design: Yes — SR-002 explicitly approved as quoted above; no behavior-defining supplements. Design and final size/risk are recorded in design-spec.md when complete. Downstream reviews/implementation/API/E2E/delivery are separately owned; no pass claims at this phase.
