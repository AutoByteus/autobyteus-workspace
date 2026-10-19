# Investigation Notes

## Investigation Meta

- Package identifier: `file-explorer-pending-save-draft-preservation`
- Request / ticket: Project Task `project_task_a4f90984-add2-4300-983d-de54ded3032b` (linked follow-up of parent `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation` on `codex/file-explorer-pending-save-draft-preservation`
- Resolved base remote / branch / revision: `origin/personal` @ `88c865d4129efd23bd23f009d80dc7aa3db6e405`, fetched 2026-10-15. It includes the merged shared-filesystem increment `f69ee78626` and the IR010 peer-refresh fix `a3f65bfe6e`.
- Finalization target remote / branch: `origin` / `personal` (no release authorized by this Task)
- Bootstrap result: Worktree created; `pnpm install --frozen-lockfile` and `nuxi prepare` succeeded. Ticket folder: `tickets/in-progress/file-explorer-pending-save-draft-preservation/`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-15). Architecture gate: `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md` (worktree root), `/TESTING.md` (head), and `autobyteus-web/AGENTS.md` (2026-10-15).
- Investigation status: Complete for requirements and architecture.

## Initial Request And Clarifications

- Original request: Preserve later File Explorer edits when a pending Save completes (see Task description and `evidence/ctx_b3b6cee445b9__editor-follow-up.md`).
- Clarifications received: On 2026-10-15 the user authorized dispatch of the bounded editor fix ("then i suggest dispatch the follow up ticket to fix teh editor problem right?"). The user's direction: keep the IR010 peer-refresh fix and do not expand the filesystem ticket.
- User-supplied facts and constraints: frontend draft preservation only, no NFS proof needed; no redesign; no suppression of failures; not a public-release permission.
- Initial ambiguity: None material. Empty-text and failed-Save variants were decided within the direction (requirements DEC-002/DEC-004).

## Product And Domain Understanding

- Product area: `autobyteus-web` File Explorer content tabs and the Monaco text editor.
- Affected actors or systems: users editing workspace text files.
- Existing user or operational purpose: Ctrl/Cmd+S saves through the `writeFileContent` GraphQL mutation. "Saving..." shows while the request is pending, and the editor stays editable.
- Relevant terminology: *committed content* = `OpenFileState.content`, the last known on-disk bytes. *Editor draft* = `OpenFileState.editorDraft`, session-only unsaved input; its presence means "unsaved". *Projection* = `displayFileData` in Tabs, which shows the draft over committed content.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-15 | Code | `autobyteus-web/stores/fileExplorerContentActions.ts:270-275` | Draft classification | `updateEditorDraft` sets `editorDraft = content === file.content ? undefined : {content}`. While a Save is pending, `file.content` is still the pre-save text. | Root cause |
| 2026-10-15 | Code | same file `:295-325` (`_writeFileCore`) | Save success path | On success `file.content = content` (`:316`) | — |
| 2026-10-15 | Code | same file `:327-342` (`saveFileContentFromEditor`) | Save lifecycle | Sets `saveContentLoading[path]=true` before the write and false in `finally`. On success, clears the draft only if it equals the saved content (`:335`). No settle on failure. | Settle point |
| 2026-10-15 | Code | `components/fileExplorer/FileExplorerTabs.vue:289-300, 366-387` | Projection and Save trigger | `hasEditorDraft`/`displayFileData` project the draft. `handleSave` saves `displayFileData.content` and is blocked while `isSavingContent`. | Only one Save per file in flight |
| 2026-10-15 | Code | `components/fileExplorer/FileViewer.vue:96-100`; `MonacoEditor.vue` `watch(modelValue)` | Editor sync | Monaco replaces its model when `modelValue` differs from its current value. This is how the saved snapshot overwrites visible text. | — |
| 2026-10-15 | Code | `stores/fileExplorerTreeActions.ts:74-97` | Peer refresh (IR010) | Modify events invalidate committed content unless the path is in `filesToIgnoreNextModify`. The draft projection keeps the visible draft. | Preserve |
| 2026-10-15 | Code | `stores/fileExplorerState.ts:21-31, 48` | State shape | `editorDraft?: {content}` session-only; `saveContentLoading: Record<string, boolean>` per path in workspace state | Reuse existing pending state |
| 2026-10-15 | Code | `components/fileExplorer/__tests__/FileExplorerTabs.draftViewer.spec.ts`, `FileExplorerTabs.unsaved.spec.ts` | Existing regressions | Cover peer refresh, clean undo, isolation, Zen/preview/read-only, failed-save plus later keystroke, refresh error, close discard | Extend draftViewer spec |
| 2026-10-15 | Command | `git log --oneline -8 -- stores/fileExplorerContentActions.ts components/fileExplorer/FileExplorerTabs.vue` | History | Latest change is `a3f65bfe6e` (IR010 baseline fix) | — |
| 2026-10-15 | Doc | `tickets/done/shared-network-workspaces/requirements-doc.md` (AC-010, BEH-006) | Parent contract | AC-010 requires preserving unsaved edits | Basis only; parent not reopened |
| 2026-10-15 | Code | `autobyteus-web/tests/e2e/*.mjs`, `package.json` `test:e2e:*` | Actual-UI validation options | Browser probes with fixture pages exist (e.g. `event-monitor-file-preview-probe.mjs`); isolated desktop instance per TESTING.md | Validation choice for API/E2E |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Ctrl/Cmd+S, then continued editing while "Saving..." | Edit → Save (pending) → later input equal to the pre-save committed text → draft deleted → Save success sets committed to the saved text → projection shows committed → Monaco replaced | Later input lost; next Save resends the snapshot | INV-RUN-001/002 | High |
| BEH-002 | User | Same; later input different | Draft retained → success → `:335` keeps the draft | Preserved | INV-RUN-001/002 control | High |
| BEH-003 | User | Type then undo, no Save pending | Draft cleared when equal to committed | Clean; peer refresh applies | draftViewer spec | High |
| BEH-004 | User/System | Peer modify; failed Save | Draft projected over committed; failure keeps the draft | IR010 | draftViewer and unsaved specs | High |
| BEH-005 | User | Ordinary Save | Success clears the matching draft | Clean | `:335` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `fileExplorerContentActions.updateEditorDraft` | Classifies input as draft or clean against committed content | Must not use the pre-save committed text as the clean baseline while a Save is pending | Use the existing `saveContentLoading[path]` as the pending signal |
| `fileExplorerContentActions.saveFileContentFromEditor` | Owns the Save lifecycle (loading, error, draft clear on success) | Settle the draft against the resulting committed content on success and on failure | Generalize `:335` into one settle step after either outcome |
| `FileExplorerTabs.vue` | Projection and Save trigger | No change needed | — |
| `MonacoEditor.vue` | Syncs from `modelValue` | No change; with the draft retained, the projection equals the visible value, so there is no replacement | — |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: None.
- Existing readers, writers, or contracts that consume them: N/A.
- Evidence paths: N/A.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: one Pinia store action file (`fileExplorerContentActions.ts`), two actions.
- Existing structural surfaces that can support the approved behavior: `saveContentLoading` pending state; `editorDraft`; the Tabs projection.
- Evidence paths: listed in the Source Log.

### Potential Structural Impacts To Investigate

- API or external-contract change: None (the GraphQL mutation is unchanged).
- Persistence schema or invariant change: None (session-only state).
- Security or privacy boundary change: None.
- Concurrency or lifecycle change: Only the in-store rule for when an editor draft is kept during one pending Save. No new coordination.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: None.
- Confirmed absent, present, or unknown: Confirmed absent.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| INV-RUN-001: reviewer probe at `a3f65bfe6e` (historical) | SCN-001, SCN-002 | 1 Fail (revert-to-original) / 1 Pass (different edit). Payloads `["saved checkpoint","saved checkpoint"]` | Defect confirmed by reviewer | `evidence/ctx_65177eb5c779__pending-save-probe.log.txt`, `evidence/ctx_dc567b3b0fae__checks-result.json` |
| INV-RUN-002: SD revalidation. Same probe copied to a temporary spec on base `88c865d412`, run with `pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorerTabs.sd-revalidate-probe.spec.ts --run`, then the temporary spec was removed (`git status` clean apart from the ticket folder) | SCN-001, SCN-002 | Identical result on current base: revert case `afterInput.draft=null`, `afterComplete.visible="saved checkpoint"`, payloads `["saved checkpoint","saved checkpoint"]`; control passes | Current-source reproduction | `evidence/sd-revalidation-probe.log` |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via `/project_task_manager` | Bounded fix; keep IR010; not filesystem work | Explicit instruction | Scope Guardrail | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| `writeFileContent` mutation | Current schema | Unchanged | `_writeFileCore` | None |

## Persisted Data And State Facts

- Affected stored or external subject: None persisted. In-memory `OpenFileState.editorDraft` only.
- Location and representative shape: `{ content: string } | undefined` per open file.
- Approximate volume: one per open text tab.
- Current readers and writers: `updateEditorDraft` and `saveFileContentFromEditor` write it; Tabs `hasEditorDraft`/`displayFileData` read it.
- Current unknown/extra-field behavior: N/A.
- Required semantics or data that must be preserved: a present draft means unsaved user input.
- Acceptable loss, reset, rebuild, or regeneration: discarded on tab close (unchanged).
- Privacy, retention, compliance, downtime, or operational constraints: None.
- Remaining evidence gap: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- User's requested outcome, in the user's own terms: N/A
- Requirement / behavior IDs involved: N/A
- Product decision, uncertainty, or experience to understand or evolve: N/A
- Critical journey and states: N/A
- Known constraints and non-goals: N/A
- Relevant existing-product or frontend context supplied or established: N/A
- Product Design request artifact / message reference: N/A
- Established separate design repository/root and ticket reference, when applicable: N/A

## Product Design Findings

N/A — not applicable (no Product Design involvement).

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/ctx_b3b6cee445b9__editor-follow-up.md` | Code reviewer (parent ticket) | Follow-up statement, reproduction, suggested acceptance | Context | All | Read-only copy of Task context | Not behavior-defining |
| `evidence/ctx_42f5ac0dd8da__pending-save-probe.spec.ts.txt` | Code reviewer | Probe source; usable as a template for the durable regression | AC-001, AC-005 | AC-001, AC-005 | Read-only | Not behavior-defining |
| `evidence/ctx_65177eb5c779__pending-save-probe.log.txt` | Code reviewer | Historical run log | AC-001 | AC-001 | Historical; not proof for the fix | Not behavior-defining |
| `evidence/ctx_dc567b3b0fae__checks-result.json` | Code reviewer | Historical check summary (adjacent suite passed, probe failed) | AC-005..AC-008 | — | Historical | Not behavior-defining |
| `evidence/sd-revalidation-probe.log` | Solution Designer | Current-base reproduction | AC-001, AC-005 | — | Current | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Real Monaco may emit `update:modelValue` when its model is replaced programmatically | Could create a spurious draft after the projection changes | With the draft retained, the projection equals the visible text, so Monaco makes no replacement. When the draft clears after a matching Save, the projection equals the visible text too. Verify with actual-editor validation | Open for validation |
| RSK-002 | Risk | `file` is looked up before the await in `saveFileContentFromEditor`; closing and reopening the tab during a pending Save produces a new object | Settle could target a stale object | Existing behavior, unchanged by this design; a reopened tab starts with no draft | Accepted, out of scope |

## Architecture Investigation Findings

- Entry: Monaco `onDidChangeModelContent` → `update:modelValue` → `FileViewer` re-emit → Tabs `updateEditorDraft` → store `updateEditorDraft`.
- Save: Monaco Ctrl/Cmd+S → `save` → Tabs `handleSave` (guarded by `isSavingContent`) → store `saveFileContentFromEditor` → `_writeFileCore` → GraphQL → `file.content = content` → mutation echo `handleFileSystemChange(..., 'mutation')`, where `filesToIgnoreNextModify` suppresses re-invalidation.
- Root cause: the draft-or-clean rule compares against the pre-save committed text, which the in-flight Save is about to replace. The rule ignores the Save lifecycle the same store owns. Settling happens only on success, and only for an exact match.
- Owner: `fileExplorerContentActions.ts` owns both the draft rule and the Save lifecycle, so the fix belongs there. No caller or boundary change is needed.

## Requirement Implications

- The defect is reproducible on current source, which justifies REQ-001..REQ-003.
- The existing failed-save path never re-normalizes the draft, so DEC-004 was needed to define clean state after failure.

## Notes For Architecture Design

- Map SCN-001..SCN-004 onto the input and Save spines above.
- Constraints: keep the Tabs projection, the IR010 behavior and the Save guard unchanged; no new state field is needed because `saveContentLoading[path]` already represents the pending Save.
