# Requirements

- Ticket: `context-attachment-draft-transfer-refactor`
- Status: `Design-ready`
- Scope Classification: `Small`

## Goal / Problem Statement

The draft-context attachment fix currently works, but the cross-owner draft-transfer behavior lives inside `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`. That placement breaks the Stage 8 ownership and size gates and makes the repair specific to one input surface. The refactor must preserve the live bug fix while moving the transfer behavior into shared attachment infrastructure.

## In-Scope Use Cases

| Use Case ID | Name | Summary |
| --- | --- | --- |
| `UC-001` | Cross-owner draft paste into active team member | Pasting a draft attachment locator owned by another team member should attach a cloned draft owned by the focused target member. |
| `UC-002` | Send after source draft removal | Sending from the destination member should still work even if the original source draft file is later removed. |
| `UC-003` | Finalize flattened draft locator attachments | If a draft locator is present as a non-uploaded attachment shape, finalize/send should still recover it into the owned uploaded-attachment flow. |

## Requirements

| Requirement ID | Requirement |
| --- | --- |
| `R-001` | Cross-owner draft attachment transfer must re-own the attachment under the active target draft owner before the attachment is persisted in the target context. |
| `R-002` | Send/finalize must not forward stale localhost draft URLs upstream when the attachment can be resolved or finalized locally. |
| `R-003` | Cross-owner draft transfer behavior must live in shared attachment infrastructure so attachment entrypoints stay aligned and the Vue input component does not own transfer orchestration policy. |
| `R-004` | The refactor must reduce Stage 8 size/ownership pressure by keeping changed source implementation files within the workflow limits, including bringing `ContextFilePathInputArea.vue` back under the `500` effective non-empty line gate. |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Expected Outcome |
| --- | --- | --- |
| `AC-001` | `R-001` | When a focused team member pastes a draft locator owned by another member, the resulting attachment stored in the target context uses the focused member's draft owner and no longer points at the original member path. |
| `AC-002` | `R-002` | After cloning into the target owner, send succeeds even if the original owner removes the source draft file before the destination member sends. |
| `AC-003` | `R-002` | `finalizeDraftAttachments()` upgrades flattened draft locators into finalized uploaded attachments instead of leaving raw draft URLs in the outbound payload. |
| `AC-004` | `R-003` | The shared attachment layer owns cross-owner draft transfer orchestration, and `ContextFilePathInputArea.vue` only delegates to that shared behavior. |
| `AC-005` | `R-004` | Every changed source implementation file remains at or below the Stage 8 source-file hard limit after the refactor. |

## Constraints / Dependencies

- The current live bug fix in the tracked patch must be preserved.
- The backend draft-path resolver fallback in `autobyteus-server-ts` remains in scope and must continue to resolve local draft locators.
- Focused validation should remain repo-resident where possible and should reuse the existing Vitest suites around attachment composition and draft finalization.

## Assumptions

- The correct owner for a transferred draft attachment is always the current attachment-composer target.
- The existing attachment model and upload store are the authoritative shared boundaries for attachment ownership state in the web app.

## Open Questions / Risks

- If another attachment entrypoint exists outside the current composer flow, it may need to consume the same shared transfer helper later.
- Browser/runtime differences around `fetch` of local draft locators must still be respected after the extraction.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered By Use Case ID(s) |
| --- | --- |
| `R-001` | `UC-001` |
| `R-002` | `UC-002`, `UC-003` |
| `R-003` | `UC-001` |
| `R-004` | `UC-001` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Planned Scenario ID(s) | Validation Intent |
| --- | --- | --- |
| `AC-001` | `AV-001` | Prove cross-owner paste clones the attachment into the target owner path. |
| `AC-002` | `AV-002` | Prove send/finalize survives after the original owner draft is removed. |
| `AC-003` | `AV-003` | Prove flattened draft locators are coerced and finalized instead of being left as raw draft URLs. |
| `AC-004` | `AV-001`, `AV-004` | Prove shared infrastructure owns the transfer behavior and the component only delegates. |
| `AC-005` | `AV-004` | Prove all changed source implementation files satisfy the Stage 8 line-count gate. |

## Scope Confirmation

- Confirmed Scope Classification: `Small`
- Why `Small`: The ticket changes ownership placement and validation around an existing bug fix across a narrow set of attachment-composition files without altering product scope or external contracts.
