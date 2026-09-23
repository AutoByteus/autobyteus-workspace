# Requirements Document — Anthropic API key save failure

## Document Status
- Status: Approved — repair behavior approved by user on 2026-09-23.
- Current solution revision ID: SR-004 (design completion); approved intended-behavior baseline is SR-002, with approval captured in SR-003.
- Package identifier: anthropic-api-key-save-failure
- Request: Investigate failed Anthropic key save in Settings > API Keys (user message and attached screenshot, 2026-09-23).
- Requirements owner: Solution Designer
- Date: 2026-09-23
- Approval state and reference: Explicit user message “approve” on 2026-09-23, directly answering the Solution Designer proposal: “a successful save immediately shows Configured, displays success, and clears the input, while genuine save failures still show an error.” No behavior-defining supplement exists. Approval covers REQ-001–004 / AC-001–004 and preserved write-only/value-free behavior; no change to vault semantics or Anthropic validation was proposed.
- Behavior-defining supplements: N/A — not applicable.

## Problem And Desired Outcome
The user saw “Failed to save API key for Anthropic” when saving a filled Anthropic key in Settings > API Keys. A full frontend-through-isolated-backend reproduction established that the server commits the key and returns success, but a subsequent frontend store update throws and the UI shows a false failure. The proposed repair outcome is truthful immediate success feedback and configured state when the save succeeds, without changing vault custody or exposing the key.

## Relevant Current And Desired Behavior
| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Approved Desired Behavior | Intentionally Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | The editor submits a nonblank key. In the reproduced path, GraphQL returns success/configured=true, but the store mutates a read-only credential array and throws; the UI then shows a false failure toast and Not Configured until refresh. | After a successful save response, the current UI should show Configured and success without a false failure. Genuine save failures should still report failure. | Key remains write-only in UI/API; no key value readback. | Screenshot; frontend runtime/store; secret-management contract. |
| BEH-002 | System | SCN-001 | The server stores a built-in Anthropic key in the encrypted vault and returns a value-free credential setting. An isolated, synthetic-key end-to-end UI probe confirmed a successful backend commit and value-free response despite the frontend error. The current local server reports Anthropic configured and vault READY. | Preserve this path when diagnosing/fixing the user's failure; do not assume a provider-key format issue, since save currently accepts any nonblank value. | Existing encrypted vault and provider/model catalog semantics. | Backend service/resolver; safe probe; read-only live query. |

## Scope Guardrail
- UC-001: Save an Anthropic key through Settings > API Keys and receive truthful configured/success or genuine-failure feedback.
- In scope: correction of the existing built-in provider Save Key experience when the server returns success; regression verification through the UI and shared credential-store update path.
- Out of scope: overwriting the user's real Anthropic credential for verification; validating it with Anthropic; changing vault/provider/schema contracts; adding a new error-detail policy. Existing Gemini, Qwen, and custom-provider flows should be preserved, not redesigned.
- Preserved behavior boundary: BEH-001 and BEH-002 write-only/value-free credential handling.
- Review authority: Any proposed fix or change in visible error semantics requires user approval of the revised intended behavior before design and implementation.

## Proposed Requirements And Acceptance Criteria
The following intended repair behavior is approved under the approval reference above. The completed diagnostic history remains in `investigation-notes.md` and `solution-revision-record.md`.

| Requirement ID | Requirement | Related behavior | Source |
| --- | --- | --- | --- |
| REQ-001 | A successful built-in-provider credential save must not be reported as failed because a subsequent client-side state update throws. A genuinely rejected save must still report failure. | BEH-001 | Proven false-failure reproduction. |
| REQ-002 | Provider key handling must remain write-only and value-free in UI/API responses; the repair must not alter an existing stored key except through the user’s explicit Save Key action. | BEH-001, BEH-002 | Existing secret-management contract and user safety. |
| REQ-003 | When the existing built-in-provider Save Key request succeeds and returns configured state, the UI must immediately show that provider as Configured, display success rather than failure, and clear the submitted input. | BEH-001 | Proven false-failure reproduction. |
| REQ-004 | The frontend credential-setting update must remain usable across initial load, a successful save, and subsequent saves/reloads without corrupting or replacing unrelated provider status. | BEH-001, BEH-002 | Shared store path; preserved behavior. |

| AC ID | Related REQ | Scenario | Verification intent |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | When GraphQL returns success/configured=true, the UI does not show a failure toast; when GraphQL rejects the save, the UI reports failure without claiming a new configured state. |
| AC-002 | REQ-002 | SCN-001 | Save responses and status reads expose only configured state, never the key value. Verification uses an isolated database and synthetic key; the live credential is not replaced. |
| AC-003 | REQ-003 | SCN-001 | In a frontend/browser test against an isolated backend, save a synthetic Anthropic key; GraphQL success/configured=true is followed by a success message, immediate Configured badge, cleared input, and Configured after refresh, with no false failure toast. |
| AC-004 | REQ-004 | SCN-001 | Existing provider rows remain correct after loading and saving; a second supported save does not throw a read-only mutation error. The server still returns only value-free credential status. |

## Relevant Scenarios And Journeys
| Scenario ID | Kind | Actor / trigger | Product-level sequence and expected outcome | Supported alternate / error behavior | Validity and evidence |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User enters Anthropic key in Settings > API Keys and clicks Save Key | UI submits; backend stores key; UI shows configured state and success feedback. | On genuine server save failure, UI reports failure. The reproduced false-failure toast after a successful commit is the defect to remove. | Supported Normal Scenario — screenshot, source, product docs. |

## Data Continuity And Dependencies
- Persisted data affected: Yes, encrypted Anthropic credential in application SQLite vault.
- Must preserve: existing credential; diagnostic probes must not overwrite it.
- Acceptable loss: none for the user's real key; isolated synthetic probe data may be deleted.
- External dependency: Anthropic API validity is not checked by the save path; remote validation is not evidence for this storage failure.

## Open Decisions
| ID | Question | Why it matters | Status |
| --- | --- | --- | --- |
| DEC-001 | Does the user approve the proposed truthful-success repair for the existing Save Key path? | Required before design/implementation. | Approved by user message “approve” on 2026-09-23. |
| DEC-002 | Did the user's attempted key land in their specific backend? | The local backend says configured but cannot identify a key value or timing; not required to repair the reproduced bug. | User may confirm by refresh; not a repair blocker. |

## Readiness Check
- Investigation of normal source path and safe backend probe: Complete.
- Reproduced failure origin: Frontend store post-response update attempts to mutate a read-only credential array; the backend commit succeeds.
- Content ready for repair approval: Yes; no material behavior question remains.
- User approval received: Yes, for the SR-002 behavior baseline as recorded above.
- Approved basis ready for architecture design: Yes.
- Design spec: `design-spec.md` Ready under SR-004, aligned with this approved basis. Route follows current handoff rules.


## Traceability And Approval Boundary
| Requirement ID | Use case / scenario | Behavior IDs | Acceptance criteria | Approval basis |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 / SCN-001 | BEH-001 | AC-001 | User “approve” following truthful-success proposal, 2026-09-23 |
| REQ-002 | UC-001 / SCN-001 | BEH-001, BEH-002 | AC-002 | Same approval; preserved write-only/value-free contract |
| REQ-003 | UC-001 / SCN-001 | BEH-001 | AC-003 | Same approval |
| REQ-004 | UC-001 / SCN-001 | BEH-001, BEH-002 | AC-004 | Same approval; preservation of existing provider rows |

- Product Design package: N/A — not requested. The user screenshot and isolated browser screenshots evidence the bug; they are not an approved new visual design.
- Behavior-defining supplements: N/A — not applicable.
- Deferred to architecture: the exact frontend state-ownership correction and test placement, without changing approved UI/API outcomes.
