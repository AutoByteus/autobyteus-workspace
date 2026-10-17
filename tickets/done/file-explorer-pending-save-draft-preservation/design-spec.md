# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001. Approved by the Solution Designer within the direction, user informed in the Solution Designer conversation on 2026-10-15.
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/investigation-notes.md`
- Authorities read (2026-10-15): `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md` (worktree root; no closer `DESIGN*.md` under `autobyteus-web/`), `autobyteus-web/AGENTS.md`, `/TESTING.md`. `design-examples.md` was not used.
- Project design-principle conflicts or discrepancies: None. The design follows root DESIGN.md rule 5 (a bounded change to the existing owner).

## Current-State Read

`fileExplorerContentActions.ts` owns two things:

- **Draft classification (`updateEditorDraft`):** input is a draft unless it equals committed `file.content`.
- **Save lifecycle (`saveFileContentFromEditor` → `_writeFileCore`):** sets `saveContentLoading[path]`, writes, sets `file.content = content` on success, and clears a draft that exactly equals the saved content.

`FileExplorerTabs.vue` projects the draft over committed content into `FileViewer`/Monaco. While a Save is pending, committed content is still the pre-save text. Input equal to it is classified clean and the draft is deleted. Save success then changes committed content, and the projection replaces the visible editor (BEH-001; INV-RUN-002). Ownership and boundaries are correct. The defect is one rule in the right owner that ignores the Save lifecycle the same owner manages.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: Two actions change in one production file (`autobyteus-web/stores/fileExplorerContentActions.ts`, about 5 lines). One durable test file is extended (`components/fileExplorer/__tests__/FileExplorerTabs.draftViewer.spec.ts`). No component, type, API or other module changes.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: No contract, persistence, security, deployment or ownership-boundary change. The only lifecycle change is the in-store rule for keeping a session-only draft during the existing single pending Save. That Save is already serialized per file by the `isSavingContent` guard (`FileExplorerTabs.vue:368`). The change reuses the existing pending state and adds no coordination.
- Escalation trigger if implementation or validation discovers new impact: return `Design Impact` if any of these is found:
  - the fix needs changes outside `fileExplorerContentActions.ts`, such as the Tabs projection, Monaco sync or the state type;
  - real Monaco echoes a spurious draft (RSK-001);
  - a preserved behavior (AC-005..AC-008) cannot hold;
  - more than one Save per file can be in flight.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | `stores/fileExplorerContentActions.ts:270-275, 295-342` | Draft rule ignores the pending Save; settle only on success, exact match | Change the draft rule and generalize the settle step | None |
| Code read | `FileExplorerTabs.vue:289-300, 366-369` | Projection is correct; one Save per file in flight | No component change | None |
| Code read | `MonacoEditor.vue` `watch(modelValue)` | Replaces the model only when the value differs from the visible text | A retained draft means no replacement | RSK-001 (actual-editor check) |
| Probe | INV-RUN-002, `evidence/sd-revalidation-probe.log` | Defect reproduces on base `88c865d412` | Fix is needed on current source | None |

## Intended Change

While a Save of a file is pending, every editor input for that file is kept as a draft. When that Save settles, by success or failure, the store clears the draft only if it equals the committed content that results from the Save.

## Change Scope (Mandatory)

- In scope: UC-001. The draft-classification rule and the Save-settle step in `autobyteus-web/stores/fileExplorerContentActions.ts`, plus durable regressions in `FileExplorerTabs.draftViewer.spec.ts`.
- Deliberately left alone:
  - `FileExplorerTabs.vue` projection and Save guard, `FileViewer.vue`, `MonacoEditor.vue`, `fileExplorerState.ts` types: already correct for this behavior.
  - Peer-refresh/IR010 logic in `fileExplorerTreeActions.ts`: must stay unchanged.
  - `_writeFileCore`, the GraphQL mutation and `filesToIgnoreNextModify`: the write contract is unchanged.
  - Repeated or concurrent Save, conflict detection, durable drafts: out of scope per the Scope Guardrail.
- Follow-ups: None found that need a new Task. RSK-002 (stale `file` reference if the tab is closed and reopened during a pending Save) is existing, accepted behavior with no supported data-loss consequence. It is recorded only as a risk.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001..REQ-004; AC-001..AC-004 | Typing/undo while "Saving..."; Save completion | INV-RUN-002 | Change: input during a pending Save is always a draft; settle against the resulting committed content | DS-001 (input), DS-002 (Save settle) |
| BEH-002 | User | REQ-005; AC-005 | Same, different later edit | Probe control | Preserved | DS-001, DS-002 |
| BEH-003 | User | REQ-005; AC-006 | Undo with no Save pending | draftViewer spec | Preserved: the rule is unchanged when no Save is pending | DS-001 |
| BEH-004 | User/System | REQ-005; AC-007 | Peer modify; failed Save | IR010 specs | Preserved: the projection is unchanged; a failed Save keeps a differing draft | DS-002, DS-003 |
| BEH-005 | User | REQ-005; AC-008 | Ordinary Save | `:335` | Preserved: a matching draft is cleared on success | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/ctx_42f5ac0dd8da__pending-save-probe.spec.ts.txt` | Reviewer probe | AC-001, AC-005 | Template for the durable regression (same real Tabs/FileViewer/store harness as the existing draftViewer spec) | Read-only, not behavior-defining |
| `evidence/sd-revalidation-probe.log` | Current-base reproduction | AC-001 | Pre-fix failing baseline | Not behavior-defining |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `No` (structural)
- Structural triggers that fire, each with evidence; if none fire, name the triggers this change could plausibly hit and the evidence ruling each out:
  - Authoritative-boundary: ruled out. Tabs calls only store actions, and draft and Save state stay inside the store.
  - Repeated coordination: ruled out. A single Save owner exists.
  - Responsibility overload: ruled out. About 5 lines change in an action file that already owns this concern.
  - Shared-structure tightness: ruled out. No new field; `saveContentLoading` already means "Save pending for this path".
  - Legacy-cleanup: ruled out. The old success-only clear is replaced by the unified settle step, not kept alongside it.
- Root cause classification: `Local Implementation Defect`. The owner and boundary are right. One classification rule uses a baseline that is stale during the owner's own pending Save, and the settle step covers only the exact-match success case.
- Refactor needed now: `No`
- Evidence: Investigation notes, Architecture Investigation Findings; INV-RUN-002.
- Design response: Two local rule changes in `fileExplorerContentActions.ts`.
- Refactor rationale: The existing owner already holds both the draft and the Save lifecycle, so no reshaping is warranted.
- Intentional deferrals and residual risk, if any: RSK-002 (see Change Scope).

## Terminology

- *Pending Save*: `wsState.saveContentLoading[filePath] === true` for that workspace and path.
- *Settle*: the point after the write promise resolves or rejects, before loading is cleared.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the success-only line `if (file?.editorDraft?.content === content) file.editorDraft = undefined` and its comment (`:334-335`). The unified settle step replaces them.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. `editorDraft` is session-only in-memory state; no stored data or schema changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001..003 | Monaco content change | Store draft state, projected back to Monaco | `fileExplorerContentActions.updateEditorDraft` | Decides whether input is kept |
| DS-002 | Primary End-to-End | BEH-001, 002, 004, 005 | Monaco Ctrl/Cmd+S | GraphQL write → committed update → draft settle → projection | `fileExplorerContentActions.saveFileContentFromEditor` | Save completion must not overwrite later input |
| DS-003 | Return-Event | BEH-004 | Peer modify event | Committed refresh under the draft projection | `fileExplorerTreeActions.handleFileSystemChange` | Unchanged; must stay green |

## Primary Execution Spine(s)

- DS-001: `MonacoEditor (onDidChangeModelContent) -> FileViewer (re-emit) -> FileExplorerTabs.updateEditorDraft -> store.updateEditorDraft [draft rule] -> Tabs displayFileData -> MonacoEditor modelValue`
- DS-002: `MonacoEditor (Ctrl/Cmd+S) -> FileViewer -> FileExplorerTabs.handleSave -> store.saveFileContentFromEditor -> _writeFileCore -> GraphQL writeFileContent -> file.content update -> [settle draft] -> Tabs displayFileData -> MonacoEditor`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each edit reaches the store. With no Save pending, input equal to committed content is clean (no draft). Otherwise, including always while a Save is pending, the input is stored as the draft. Tabs projects the draft, so Monaco keeps the user's text. | Editor input, open-file draft | Store draft rule | None |
| DS-002 | Save marks the path pending and writes. On success, committed content becomes the saved bytes. Settle then clears the draft only if it equals the committed content now in effect (the saved bytes on success, the unchanged text on failure). Loading then clears. A retained draft keeps the projection on the later input. | Save request, committed content, draft | Store Save lifecycle | Error recording (`saveContentError`), echo suppression (`filesToIgnoreNextModify`): unchanged |

## Spine Actors / Main-Line Nodes

Monaco editor; FileViewer; FileExplorerTabs; `fileExplorerContentActions` (draft rule, Save lifecycle); `_writeFileCore`/GraphQL.

## Ownership Map

- `fileExplorerContentActions.updateEditorDraft`: owns the draft-or-clean invariant for edit input.
- `fileExplorerContentActions.saveFileContentFromEditor`: owns Save sequencing, pending/error state and the draft settle at the end of a Save.
- `_writeFileCore`: owns the transport write and the committed-content update on success (unchanged).
- `FileExplorerTabs`: thin projection and trigger; owns no draft policy.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `FileExplorerTabs.updateEditorDraft` / `handleSave` | Store actions | Resolve the workspace and active path | Draft classification or settle policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Success-only matching-draft clear and its comment in `saveFileContentFromEditor` (`:334-335`) | The unified settle step covers success and failure | Settle step in the same action | In This Change | No dead code found in the touched file (all actions are referenced by the store or composables) |

## Return Or Event Spine(s) (If Applicable)

DS-003 (peer modify → `invalidateFileContent` → `fetchFileContent` → committed update under the draft projection) is unchanged.

## Bounded Local / Internal Spines (If Applicable)

Draft lifecycle inside the store (parent owner `fileExplorerContentActions`):
`input -> (Save pending ? keep draft : draft iff ≠ committed) -> Save settles -> draft cleared iff = resulting committed`.
It matters because it is the whole defect surface.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `saveContentLoading` / `saveContentError` | DS-002 | Save lifecycle | Pending and error UI state; now also read by the draft rule | Existing | None; reused as is |

## Ownership Boundaries

The store actions are the authoritative boundary for draft and committed state. Components call actions only. The draft rule may read the store's own `saveContentLoading` because both live in the same owner.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `fileExplorerStore.updateEditorDraft` / `saveFileContentFromEditor` | `editorDraft`, `content`, `saveContentLoading` | `FileExplorerTabs.vue` | Components mutating `editorDraft` directly, or Tabs deciding pending-Save draft policy | Strengthen the store action |

## Dependency Rules

- Allowed: Tabs → store actions; store draft rule → same-workspace `saveContentLoading`.
- Forbidden: moving pending-Save draft logic into `FileExplorerTabs.vue`, `FileViewer.vue` or `MonacoEditor.vue`; touching `fileExplorerTreeActions.ts` peer-refresh logic for this fix.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `updateEditorDraft(workspaceId, filePath, content)` | Open-file draft | Classify input | (workspaceId, filePath) | Signature unchanged |
| `saveFileContentFromEditor(workspaceId, filePath, content)` | Save lifecycle | Write and settle | (workspaceId, filePath) | Signature unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `updateEditorDraft` | Yes | Yes | Low | None |
| `saveFileContentFromEditor` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Editor draft | `editorDraft` | Yes | Low | None |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Know whether a Save is pending | `saveContentLoading[path]` | Reuse | Exact existing meaning, same owner | N/A |
| Hold later input | `editorDraft` | Reuse | Existing session draft and projection | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| File Explorer store (`autobyteus-web/stores/`) | Draft rule, Save settle | DS-001, DS-002 | Store actions | Extend | — |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/fileExplorerContentActions.ts` | File Explorer store | Content actions | Draft rule and Save settle | Already owns both | `saveContentLoading`, `editorDraft` |
| `autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.draftViewer.spec.ts` | Tests | — | Visible-draft lifecycle regressions through real Tabs/FileViewer/store | Existing home for this lifecycle | Existing harness (`addFile`, `save`, `deferred`) |

## Reusable Owned Structures Check

N/A. No repeated structure is introduced.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `OpenFileState.editorDraft` | Yes ("unsaved user input") | Yes | Low; no new field such as a "pending baseline" | None |

## Final File Responsibility Mapping

Same as the draft mapping. No other file changes.

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/fileExplorerContentActions.ts` | File (Modify) | Store content actions | Pending-aware draft rule; unified settle | Owner of both | Component or Monaco logic; peer-refresh changes |
| `autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.draftViewer.spec.ts` | File (Modify) | Tests | AC-001..AC-005 regressions | Existing lifecycle spec | Sleeps or timing assumptions; skipped or soft-masked failures |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/stores/` | Main-Line Domain-Control | Yes | Low | Existing |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Draft rule | `const savePending = !!wsState.saveContentLoading[filePath]`; `file.editorDraft = !savePending && content === file.content ? undefined : { content }` | Tabs tracking a "saving snapshot" ref, or a new `pendingSaveContent` field on `OpenFileState` | Keeps policy in the existing owner without parallel state |
| Settle | In `saveFileContentFromEditor`, after the write resolves or rejects (e.g. in `finally` before `saveContentLoading[path] = false`): `if (file && file.editorDraft?.content === file.content) file.editorDraft = undefined` | Keeping the success-only `=== content` clear and adding a separate failure branch | One rule for both outcomes, measured against the committed content actually in effect |

Expected outcomes (AC mapping), from committed `A`, Save `S`, later input `L`:

| Later input during pending | Save outcome | Committed after | Draft after | Visible |
| --- | --- | --- | --- | --- |
| none (draft `S`) | success | `S` | cleared | `S` (AC-008) |
| `A` (revert) | success | `S` | `A` | `A` (AC-001) |
| `""` | success | `S` | `""` | `""` (AC-002) |
| back to `S` | success | `S` | cleared | `S` (AC-003) |
| `X` ≠ A,S | success | `S` | `X` | `X` (AC-005) |
| `X` | failure | `A` | `X` | `X` + error (AC-004a) |
| `A` | failure | `A` | cleared | `A` + error; peer refresh applies (AC-004b) |
| none (draft `S`) | failure | `A` | `S` | `S` + error (AC-007) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the success-only clear alongside the new settle | Minimal diff | Rejected | Replace it with the unified settle |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add durable regressions for AC-001..AC-004 to `FileExplorerTabs.draftViewer.spec.ts` (deferred-mutation harness already present) and confirm the AC-001/AC-002 cases fail on the base.
2. Change `updateEditorDraft` to keep the draft while `saveContentLoading[filePath]` is true for that workspace (read it from the same `_getWorkspaceState(workspaceId)` lookup).
3. Replace `:334-335` with the unified settle in `saveFileContentFromEditor`, before `saveContentLoading[filePath] = false`.
4. Run the new regressions, the existing draftViewer/unsaved specs, the adjacent File Explorer suite and the web guards (see Guidance).
5. Actual-editor validation with real Monaco (owned by API/E2E).

## Key Tradeoffs

- Reusing `saveContentLoading` couples the draft rule to the pending-UI flag. Both live in the same owner with the same per-path meaning, which is better than a parallel field.
- During a pending Save, briefly holding a draft that equals the old committed text is intentional. It is settled at the end of the Save.

## Risks

- RSK-001: real Monaco echoing a programmatic model change. The design avoids any projection change while later input exists, but the actual-editor check must confirm it.
- RSK-002: see Change Scope (accepted).

## Guidance For Implementation

- Keep the change inside `fileExplorerContentActions.ts`. Do not alter Tabs, FileViewer, Monaco, `fileExplorerTreeActions.ts` or `fileExplorerState.ts`.
- Keep the read-only/preview/type guards in `updateEditorDraft` exactly as they are.
- Regressions should drive the real Tabs → FileViewer → store path with the controlled Monaco/GraphQL doubles already used in `FileExplorerTabs.draftViewer.spec.ts`. Use hard assertions, not `expect.soft`, on visible text, draft presence and the ordered mutation payloads.
- Checks: `pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__ components/fileExplorer/viewers/__tests__ stores/__tests__/fileExplorerStore.spec.ts stores/__tests__/fileExplorerNodeRouting.spec.ts utils/fileExplorer/__tests__ --run`; `pnpm -C autobyteus-web guard:web-boundary`; `pnpm -C autobyteus-web guard:localization-boundary`.
- Actual-editor validation intent (TESTING.md "Renderer UI, stores" → web unit tests plus a browser probe): exercise real Monaco typing, Ctrl/Cmd+S, undo during a held Save response, then completion and a second Save, through a browser probe or an isolated desktop instance. No NFS/platform matrix.
