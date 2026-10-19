# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `file-explorer-pending-save-draft-preservation`
- Request / ticket: Project Task `project_task_a4f90984-add2-4300-983d-de54ded3032b` — "Preserve later File Explorer edits when a pending Save completes." Linked follow-up of parent `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63` (shared-network-workspaces); the parent is not reopened or expanded.
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (AgentRun `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`), relaying the user's 2026-10-15 dispatch instruction ("then i suggest dispatch the follow up ticket to fix teh editor problem right?").
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-15
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: SR-001 entry in `solution-revision-record.md` and the Solution Designer conversation message of 2026-10-15 informing the user of the decisions below. No `Needs user` decision exists.
- Exact approved requirements baseline / solution revision: this document at SR-001.
- Behavior-defining supplements and their approved versions: None. Reviewer evidence in `evidence/` is supporting evidence only (see Supplemental Artifacts).

## Problem And Desired Outcome

- Problem: In the File Explorer text editor, a user can press Save and keep editing while the Save request is pending. If the later input equals the committed text from before the Save started (for example, the user undoes back to the original), the store treats the editor as clean and discards the draft. When the earlier Save succeeds, the committed content becomes the saved snapshot and the editor displays it. The user's later visible input is silently replaced, and the next Save resends the old snapshot. This loses frontend draft state. It is not filesystem corruption, needs no NFS, peer or second node, and the bytes on disk are what the user saved at that moment.
- Affected actors or systems: Any user editing a workspace text file in the File Explorer editor (Monaco) in the web/Electron app.
- Desired outcome: Completing an earlier Save never overwrites input the user made after that Save began. The visible editor keeps the later input, its unsaved/dirty state is correct relative to what is now committed, and the next Save submits that later input.
- Observable definition of success: With the reported reproduction (committed `draft-a original` → type `saved checkpoint` → Save, pending → revert to `draft-a original` → Save resolves), the editor still shows `draft-a original` and the second Save submits `draft-a original`. The control case and existing peer-refresh, failed-save, clean-undo, preview/read-only and isolation behaviors are unchanged.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | While a Save is pending, input equal to the pre-save committed text is classified clean (draft deleted). Save success then replaces the committed content, and the editor shows the saved snapshot instead of the later input. The next Save sends the saved snapshot. | Input made while a Save is pending is never classified clean against the soon-to-be-stale pre-save committed text. After the Save settles, the later input stays visible and is unsaved unless it equals the newly committed content. | The editor stays editable during a pending Save. | INV-RUN-001/002; `fileExplorerContentActions.ts:274,316,335`; `FileExplorerTabs.vue:289-295` |
| BEH-002 | User | SCN-002 | Later input different from both the pre-save and saved text survives Save completion and is submitted by the next Save (control passes). | Unchanged. | Fully preserved. | INV-RUN-001/002 control case; existing draftViewer spec "retains failed-save drafts and later keystrokes" |
| BEH-003 | User | SCN-003 | With no Save pending, typing and then undoing back to committed text clears the draft (editor clean). A clean editor accepts a peer refresh. | Unchanged. | Fully preserved. | draftViewer spec "refreshes a clean reader and one returned to clean by undo" |
| BEH-004 | User/System | SCN-004 | An unsaved draft survives a peer modification and refresh (IR010). A failed Save keeps the draft and shows the error. | Unchanged; also holds for a draft retained under BEH-001. | Fully preserved. | draftViewer and unsaved specs; commit `a3f65bfe6e` |
| BEH-005 | User | SCN-001 | Ordinary Save with no later input: draft cleared on success, editor clean and shows the saved content. | Unchanged. | Fully preserved. | `fileExplorerContentActions.ts:335`; draftViewer spec |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Editing user | Save a checkpoint and keep working | Later input is never silently replaced; the next Save writes what they see | No new prompts or UI required |
| User (product authority) | Keep the editor fix bounded and separate from the filesystem ticket | Minimal correction in the existing editor/store owner; keep IR010 | No editor/filesystem redesign, merge, sync or durable-draft subsystem |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Save a text file in the File Explorer editor, keep editing while the Save is pending (including undo/revert to pre-save text and clearing to empty), and have the later input survive Save completion and be submitted by the next Save | SCN-001, SCN-002 |

### Out Of Scope

- Filesystem, NFS, shared-network-workspace, watcher or server write semantics (parent ticket; already delivered).
- Concurrent multi-writer conflict detection, auto-merge, or conflict prompts.
- Starting another Save while one is pending (the current `isSavingContent` guard is unchanged).
- Persisting drafts across reloads or app restarts, or any durable-draft store.
- A new visible dirty indicator or Save button.
- Updater-classification FUP001, streaming PB001 (`task4577620f`), and deferred NFS items.

### Non-Goals

- No production-latency or frequency claim. The pending window is ordinary asynchronous lifecycle, not a timing guarantee.
- No NFS or platform matrix for this frontend-only fix.

### Preserved Behavior Boundary

BEH-002, BEH-003, BEH-004, BEH-005; AC-004 through AC-008. Cross-cutting invariant: committed content (`file.content`) changes only from a successful write or a committed read, never from editor input.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Editor input made while a Save of that file is pending must be retained as the user's current input. It must not be discarded by comparison with the committed content from before that Save. This includes input equal to that pre-save text and empty input. | BEH-001 | Must | The pre-save committed text is about to be replaced; comparing against it discards user work | Task; DEC-001, DEC-002 |
| REQ-002 | When a pending Save succeeds, the visible editor must keep the later input. The editor counts as unsaved exactly when that input differs from the newly committed content. | BEH-001, BEH-005 | Must | No silent overwrite; correct dirty state | Task; DEC-003 |
| REQ-003 | After REQ-002, the next Save must submit the retained later input. | BEH-001 | Must | User's later input must reach disk on next Save | Task |
| REQ-004 | When a pending Save fails, later input must remain visible and Save-able. The editor counts as unsaved exactly when that input differs from the unchanged committed content. | BEH-001, BEH-004 | Must | Failed-save draft preservation plus correct clean state | Task suggested acceptance; DEC-004 |
| REQ-005 | Preserve ordinary Save, different-later-edit, clean undo with no Save pending, IR010 peer-refresh protection, clean-reader refresh, preview/read-only behavior and workspace/path isolation. | BEH-002..BEH-005 | Must | User direction to keep IR010 and avoid regressions | Task; parent IR010 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | BEH-001; SCN-001 | Committed `draft-a original`; type `saved checkpoint`; Save (pending); revert to `draft-a original`; Save succeeds | Editor shows `draft-a original`; it is unsaved (a draft exists); the next Save submits `draft-a original` (payloads `["saved checkpoint","draft-a original"]`) | — | Durable regression through real Tabs → FileViewer → store; actual-editor (real Monaco) validation |
| AC-002 | REQ-001..REQ-003 | BEH-001; SCN-001 | Same as AC-001, but later input is empty text `""` | Editor shows empty; next Save submits `""` | — | Durable regression |
| AC-003 | REQ-002 | BEH-001, BEH-005; SCN-001 | Same as AC-001, but later input ends equal to the content being saved (`saved checkpoint`) | After success the editor is clean (no draft) and shows `saved checkpoint` | — | Durable regression |
| AC-004 | REQ-004, REQ-005 | BEH-001, BEH-004; SCN-002 | Save pending with later input (a) different from committed text: Save fails | (a) Later input visible, draft retained, error shown; next Save submits it | (b) Later input equal to the unchanged committed text: editor clean (no draft), shows that text, and a later peer refresh updates it | Durable regression |
| AC-005 | REQ-005 | BEH-002; SCN-002 | Later edit different from both texts while Save pending; Save succeeds | Later edit visible; next Save submits it (control) | — | Existing/extended regression |
| AC-006 | REQ-005 | BEH-003; SCN-003 | No Save pending; type then undo to committed | Draft cleared; peer refresh updates the clean editor | — | Existing regression stays green |
| AC-007 | REQ-005 | BEH-004; SCN-004 | Draft present; peer modify and refresh; failed Save | Draft kept and Save-able; error shown | — | Existing draftViewer and unsaved specs stay green |
| AC-008 | REQ-005 | BEH-005; SCN-001 | Ordinary Save with no later input; preview/read-only; workspace/path isolation | Draft cleared on success; preview/read-only never create drafts or save; per-workspace/per-path drafts independent | — | Existing adjacent File Explorer suite stays green |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Editing user | Save a checkpoint, then keep editing | Ctrl/Cmd+S in the File Explorer editor; the editor stays editable while "Saving..." shows | Text file open in edit mode | Edit → Save → while pending, keep editing (incl. undo to original or clear) → Save completes → later Save | Later input visible; next Save writes it | Save fails → AC-004 | Supported Normal Scenario. The editor is deliberately editable during a pending Save, and the existing code comment at `fileExplorerContentActions.ts:334` states that later keystrokes belong to the user. | Task; reviewer probe; SD revalidation (INV-RUN-002) | REQ-001..004; AC-001..004 |
| SCN-002 | User | Editing user | Same, with a different later edit, or the Save fails | Same | Same | Same | Later edit preserved | Failure error shown, draft retained | Supported Normal Scenario | Probe control; existing spec | REQ-004, REQ-005; AC-004, AC-005 |
| SCN-003 | User | Editing user | Experiment, then undo to clean with no Save pending | Typing/undo | Same | Type → undo to committed | Editor clean; accepts peer refresh | — | Supported Normal Scenario | Existing spec | REQ-005; AC-006 |
| SCN-004 | User/System | Editing user, peer writer | Keep a draft while the file changes elsewhere | Peer modify event | Draft present | Peer modify → refresh | Draft kept (IR010) | Refresh error shown with draft | Supported Normal Scenario | Parent AC-010; IR010 | REQ-005; AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no new UI; existing editor, "Saving..." and "Changes saved" indicators unchanged)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: N/A — not applicable
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: N/A — not applicable
- Product decisions that need the user (with reasoning and recommendation): None

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001..REQ-005 | Reliability | Zero silent replacement of visible later input on Save completion in AC-001..AC-004 | File Explorer text editor | Durable regression and actual-editor check |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (only session in-memory editor draft state; on-disk bytes are written exactly as submitted).
- Data or state that must be preserved: the user's visible later editor input while the tab stays open.
- Loss, reset, rebuild, or regeneration that is acceptable: drafts are discarded on explicit tab close (unchanged).
- Retention, privacy, compliance, volume, downtime, or operational constraints: None.
- Unknowns requiring downstream investigation: None.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `writeFileContent` GraphQL mutation | Unchanged; the payload is the submitted content | `fileExplorerContentActions.ts:295-325` | None |
| Monaco editor `modelValue` sync | Unchanged; shows the projected content | `MonacoEditor.vue` watch on `modelValue` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/ctx_b3b6cee445b9__editor-follow-up.md` | Reviewer follow-up: user disposition, reproduction, suggested acceptance | All | Read-only supporting evidence | Not behavior-defining; input to this doc |
| `evidence/ctx_42f5ac0dd8da__pending-save-probe.spec.ts.txt` | Reviewer probe source | AC-001, AC-005 | Read-only supporting evidence | Not behavior-defining |
| `evidence/ctx_65177eb5c779__pending-save-probe.log.txt`, `evidence/ctx_dc567b3b0fae__checks-result.json` | Reviewer run at `a3f65bfe6e` (1 Fail / 1 Pass) | AC-001, AC-005 | Historical evidence; not proof for the new fix | Not behavior-defining |
| `evidence/sd-revalidation-probe.log` | SD revalidation of the same probe on base `88c865d412` (1 Fail / 1 Pass) | AC-001, AC-005 | Current-source reproduction evidence | Not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Only one Save per file is in flight at a time (existing `isSavingContent` guard) | Bounds the pending-Save model | Verified in `FileExplorerTabs.vue:368` | Confirmed |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Is undo/revert to the pre-save committed text during a pending Save a supported input to preserve? | It is the failing case | Task requires it; the editor is editable during Save | Yes. The pre-save text is no longer a valid clean baseline once a Save is in flight, so treating it as clean is the bug. | Solution Designer | Decided |
| DEC-002 | Is empty later input preserved the same way? | Empty string is falsy and easy to mishandle | Reviewer's suggested acceptance; IR010 already covers empty drafts | Yes, for consistency with IR010's empty-draft handling (AC-002). | Solution Designer | Decided |
| DEC-003 | If later input ends up equal to the content being saved, is the editor clean after success? | Correct dirty state | Existing line 335 behavior | Yes. It matches the new committed content, so it is clean (AC-003). | Solution Designer | Decided |
| DEC-004 | After a failed pending Save, is later input equal to the unchanged committed text clean? | Correct dirty state; a stale clean-equal draft would block peer refresh | Ordinary clean-undo rule (BEH-003) | Yes. Committed is unchanged, so it is clean, consistent with BEH-003. A draft that differs is kept with the error (AC-004). | Solution Designer | Decided |
| DEC-005 | Add a visible dirty indicator or conflict prompt? | Scope | None exists today; user asked for a bounded fix | No. "Dirty state" means draft retention, which governs the Save payload and peer-refresh protection. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 | Probe, revalidation |
| REQ-002 | UC-001 | BEH-001, BEH-005 | AC-001, AC-003 | SCN-001 | Probe |
| REQ-003 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 | Probe |
| REQ-004 | UC-001 | BEH-001, BEH-004 | AC-004 | SCN-002 | — |
| REQ-005 | UC-001 | BEH-002..BEH-005 | AC-005..AC-008 | SCN-002..SCN-004 | Existing specs |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-004.
- Product and system constraints architecture must preserve: IR010 draft-over-committed projection, failed-save retention, clean undo, preview/read-only, per-workspace/per-path isolation; no new subsystem.
- Decisions intentionally deferred to architecture design: exact mechanism for recognizing a pending Save and settling the draft.
- Technical facts architecture should verify: `saveContentLoading` timing relative to `updateEditorDraft`; Monaco `modelValue` echo behavior after projection changes.
- Known feasibility or integration risks: Monaco emits `update:modelValue` on programmatic model edits, so projection changes may echo back.

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

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes` (Solution Designer within the direction, 2026-10-15; user informed in conversation)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-001)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
