# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `composer-context-file-removal`
- Request / ticket: Project Task `project_task_9261def1-bb86-494f-aa1a-bbd643e2f9a4`
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-09
- Approval state and reference: Approved by the user on 2026-10-09 in this conversation: "when it cannot delete it, it's a bug we should fix. So we fix it in this ticket. We first fix this ticket and then it will be deleteable." (follows the SR-002 universal-delete direction)
- Exact approved requirements baseline / solution revision: SR-003 (this document)
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: In the composer of a **delegated child of a standalone agent run** (an Agent copy, or a member of a Team copy, created by `delegate_task` from e.g. the Project Task Manager), an uploaded context file (pasted image, `+` file picker) cannot be removed: per-file × and Clear All do nothing. Root cause: the server has no DELETE route for that draft-owner kind (`/rest/drafts/agent-collaborations/...` → 404); the composer swallows the error (console only) and keeps the item. Smaller related gaps: the composer also silently ignores uploads where the target has no upload authority, and silently drops failed uploads.
- Affected actors: desktop/web user composing a message in any run view.
- Desired outcome: wherever a file can be attached, it can be removed; attach controls are not offered where uploads can't be accepted; every attach/remove failure is visible in the composer.
- Observable definition of success: in the 19.png case (delegated Software Engineering Team member under the Project Task Manager), × and Clear All remove the image from the tray and the server draft copy is deleted.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Delegated child of a standalone run: × / Clear All on uploaded file do nothing; file stays in tray and on disk | Item removed from tray; server draft copy deleted | Sending still finalizes remaining attachments | investigation-notes §Reproduction Matrix |
| BEH-002 | User | SCN-002 | Standalone agent, New chat, team/sub-team member, Org members: removal works | Unchanged | Yes | same |
| BEH-003 | User | SCN-002 | Path attachments removable everywhere | Unchanged | Yes | same |
| BEH-004 | User | SCN-003 | Composer visible but target can't accept uploads (Org task agent / task team member while its message is pending): `+`/paste/drop silently do nothing | Upload controls disabled/ignored with a visible reason | Path attachments still allowed where currently allowed | Code |
| BEH-005 | User | SCN-003, SCN-004 | Removing an uploaded draft without upload authority, or when the server delete fails: silent no-op, item stays | See DEC-001 | — | Code |
| BEH-006 | User | SCN-004 | Failed upload: placeholder disappears, console only | Visible error in the composer naming the file | — | Code |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Desktop/web user | Curate attachments before sending | Remove any attached file; understand any failure | No silent failures |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenario IDs |
| --- | --- | --- |
| UC-001 | Remove one uploaded or path attachment (×) in any desktop/web composer where attaching is possible | SCN-001, SCN-002 |
| UC-002 | Clear All attachments in any desktop/web composer | SCN-001, SCN-002 |
| UC-003 | Attach files only where the composer target accepts uploads | SCN-003 |
| UC-004 | See attach/remove failures in the composer | SCN-004 |

### Out Of Scope

- Mobile composer (removal is already local-only and works).
- Project Task description composer / task context files (separate store and routes).
- Send/interrupt error surfacing, and any change to which run kinds/states show the composer.
- Changing draft TTL or finalization semantics.

### Non-Goals

- No redesign of the Context Files tray beyond showing an error line and disabled state.

### Preserved Behavior Boundary

BEH-002, BEH-003; existing upload/finalize behaviour for all owner kinds; other composers' drafts are never deleted by removing an item here.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID.
- New product behavior/policy proposals are `Requirement Gap`s needing explicit user approval.
- Adjacent concerns are non-blocking risks or separate-ticket candidates.
- Reviewer comments do not amend this basis without renewed user approval.

## Requirements

| Requirement ID | Requirement | Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Deleting an uploaded draft attachment is **one universal operation**: every draft attachment belongs to exactly one agent run's draft, and the same delete works for any attachment by its own identity, whatever the run kind (standalone, team/sub-team member, Org member, delegated Agent copy, delegated Team-copy member, New chat). No run kind may have upload/read without delete. | BEH-001 | Must | Root cause is per-run-kind duplication (delete was hand-added per kind and missed for delegated children) | Ticket; live 404; user feedback 2026-10-09 (SR-002) |
| REQ-002 | Per-file × and Clear All remove the attachment(s) from the composer in every run kind and run state where they can be attached, for uploaded and path attachments. | BEH-001..003, BEH-005 | Must | Ticket "Done when" | Ticket |
| REQ-003 | Removing an attachment never deletes a draft file owned by a different composer. | BEH-005 | Must | Preserve other drafts | Investigation |
| REQ-004 | Where the visible composer cannot accept uploads, upload controls (`+`) are disabled and pasting/dropping files shows a visible message instead of doing nothing. | BEH-004 | Should | Ticket: "shouldn't allow attaching" | Ticket |
| REQ-005 | Upload, removal and Clear All failures are shown in the composer (not only in the console), identifying the affected file. | BEH-005, BEH-006 | Must | Ticket: "never silent" | Ticket |
| REQ-006 | Automated tests cover the failing combinations: server DELETE for every draft-owner kind (incl. agent-collaboration), composer removal for a delegated child target, owner-less removal, failure visibility, and upload gating. | all | Must | Ticket | Ticket |

## Acceptance Criteria

| AC ID | REQ IDs | Behavior / Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | In a delegated Team-copy member (19.png case) and a delegated Agent copy under a standalone run, paste an image and use + picker; click × | Item disappears; server draft file no longer exists | — | Web component/composable test + server integration test + user desktop verification |
| AC-002 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Same targets with ≥2 uploaded + 1 path attachment; click Clear All | Tray empty; draft files deleted | — | same |
| AC-003 | REQ-002 | BEH-001 / SCN-001 | AC-001 with the delegated child offline/idle, and after app restart | Same as AC-001 | — | Manual/desktop + test with non-active status |
| AC-004 | REQ-002 | BEH-002/003 / SCN-002 | Standalone agent, New chat, team & sub-team member, Org direct/team/task member: × and Clear All | Removed (unchanged) | — | Existing + added regression tests |
| AC-005 | REQ-001, REQ-006 | Contract | For every draft-owner kind: upload a file, then delete it using the attachment's own identity; also delete an already-missing file | Deleted (and no longer readable); missing file also succeeds; an invalid owner gives a visible 4xx with message. One test iterates over all owner kinds | — | Server integration test + client unit test |
| AC-006 | REQ-003 | BEH-005 | Remove a draft attachment whose locator belongs to another composer's owner (or the composer has no upload owner) | Removed from this composer; the other owner's file is untouched | — | Composable test |
| AC-007 | REQ-004 | BEH-004 / SCN-003 | Composer visible for a target without upload authority | `+` disabled; pasting/dropping a file shows a visible message; nothing is uploaded | Path attachments still accepted | Component test |
| AC-008 | REQ-005 | BEH-005/006 / SCN-004 | Server delete fails (simulated 5xx/network), or upload fails | Visible error in the composer naming the file; on a failed delete the item stays so the user can retry | Error clears on the next successful attach/remove or target change | Component/composable test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Remove a mistakenly attached file from a delegated child's composer | Workspaces tree → delegated Agent copy or Team-copy member under a standalone run → composer | File uploaded (paste / +) | Click × or Clear All | File gone from tray and server draft | Failure visible (SCN-004) | Supported Normal Scenario | 19.png | REQ-001/002, AC-001..003 |
| SCN-002 | User | User | Remove attachments in any other run view | Standalone agent, New chat, team/sub-team, Org views | Attachments present | × / Clear All | Removed | — | Supported Normal Scenario | 20.png | REQ-002, AC-004 |
| SCN-003 | User | User | Attach a file where the target can't take uploads | Org task agent/member composer while its message is pending | Composer visible, no upload authority | Click + / paste / drop file | Control disabled or visible message | — | Supported Explicit Edge Scenario (composer is intentionally visible while pending) | Code | REQ-004, AC-007 |
| SCN-004 | User | User | Understand a failed attach/remove | Any desktop/web composer | Server/network failure | Attach or remove | Visible error naming file | — | Supported Normal Scenario | Ticket | REQ-005, AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (minimal): an inline error line in the Context Files tray; disabled `+` with tooltip reason. No Product Design requested.
- Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Requirement | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-005 | Reliability | Adding a new run kind / draft-owner kind cannot produce attachments that are readable but not deletable (structurally guaranteed, plus a test over all owner kinds) | Server + web client | Integration test |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` (draft files only).
- Must preserve: finalized attachments; other composers' drafts.
- Acceptable: already-stranded draft files expire via the existing 24h draft TTL.
- No migration.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| REST `/rest/drafts/.../context-files/:file` | DELETE semantics identical across owner kinds (204 on existing or missing file) | `context-files.ts` | Low |

## Supplemental Artifacts

| Artifact | Purpose | REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- |
| 19.png / 20.png (task context) | Symptom evidence | AC-001, AC-004 | Reference | N/A |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-002 | The composer's attachment list is not durable across reselect/restart (user's later screenshot shows `Context Files (0)` while the 19.png file is still on disk), so a failed delete leaves an invisible orphan until the 24h draft cleanup | Explains orphans | Observed 2026-10-09 | Confirmed |
| ASM-001 | Desktop and web share the same composer code path (Electron renderer = Nuxt app) | Fix covers desktop | Code | Confirmed |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | When the server can't delete an uploaded draft, what does × / Clear All do? | — | Withdrawn by the user (SR-003): an undeletable attachment is a bug, fixed by this ticket (REQ-001); no special fallback product behavior. A genuinely unexpected failure (e.g. server unreachable) follows the ordinary error rule REQ-005: the item is not removed and a visible error names the file, so the user can retry. | User | Resolved (withdrawn) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001 | AC-001, AC-002, AC-005 | SCN-001 |
| REQ-002 | UC-001, UC-002 | BEH-001..003, 005 | AC-001..004 | SCN-001, SCN-002 |
| REQ-003 | UC-001 | BEH-005 | AC-006 | SCN-002 |
| REQ-004 | UC-003 | BEH-004 | AC-007 | SCN-003 |
| REQ-005 | UC-004 | BEH-005, BEH-006 | AC-008 | SCN-004 |
| REQ-006 | all | all | AC-001..008 | all |

## Architecture Phase Input

- Scenarios to map: SCN-001..SCN-004.
- Constraints: owner-generic deletion; no deletion of foreign drafts; no change to composer visibility rules.
- Deferred to design: where composer error state lives; the universal delete mechanism (single owner-generic route/handler and client deleting by the attachment's own identity) and how REQ-003 is enforced with it.
- Facts to verify: delegated child viewability after Task DONE/CANCELLED (UNK-001).

## Readiness Check

### Content Ready For Approval

- Current behavior evidence-backed: `Yes`
- Desired and preserved behavior explicit: `Yes`
- Scope and non-goals clear: `Yes`
- Requirements and ACs testable and traceable: `Yes`
- Scenarios covered with validity and evidence: `Yes`
- Product design evidence: `N/A`
- UI/UX approval basis: `N/A`
- Assumptions and open decisions visible: `Yes` (DEC-001 resolved)
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-09, SR-003)
- Exact basis recorded: `Yes`
- Ready for architecture design: `Yes`
- Remaining blocker: None
