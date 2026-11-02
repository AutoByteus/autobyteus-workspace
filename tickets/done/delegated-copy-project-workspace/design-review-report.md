# Design Review Report — delegated-copy-project-workspace (autobyteus-97)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/requirements-doc.md` (SR-002, Approved)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/investigation-notes.md` (E-001…E-012)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed: `handoff-architecture-review.md`
- Relevant Solution Revision IDs: SR-002
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Architecture Design Complete from the Solution Designer (run `solution_designer_7591e3d191704d25a3396b3020a41127`), 2026-11-02
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace` at `94c466ae9c` (base `c952758a81`), read only; nothing was run. Files read are cited in the tables below.

## Routing Classification Review

- Task size: `Medium`. Architectural risk: `High`.
- Rationale reviewed: the changes stay within existing owners, but where every local saved-Task and sub-work copy runs changes on all roots and runtimes. High is justified by blast radius.
- Independent Architecture Review required: `Yes`. Design approval: `Not required` (the Task does not ask for it). Requirements approved, with the user deciding the rule and the tree.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved intent understood: the folder rule, Team copies with one folder, a coded refusal for an unusable first link, existing copies unchanged, no tool parameter, no UI change.
- Scope guardrail confirmed: Yes. No blocking finding.
- Remaining material ambiguity: none.

Each kind and entry form, traced (Principle 1):

| Kind / form | Path read | Result |
| --- | --- | --- |
| Saved Task | `new-copy-work.ts` 53–62: `delegation.task.projectId` comes from `resolveAssignment` | Project known before placement |
| Sub-work | `new-copy-work.ts` 70–74: `describeTask` → `readDelegatedTaskIdentity` (`task-identity-reader.ts` 15–27) gives the Project | Same rule (REQ-003). A deleted Task or Project already fails here with `TASK_NOT_FOUND`, because Project Delete removes the Task files |
| Temp task | `new-copy-work.ts` 76–78: `projectId: null`; ad-hoc identity also `null` | Inherits (REQ-002) |
| Remote | All three roots return to `remoteDelegation.delegate` before this step (`standalone-root-message-delivery.ts` 195–197, `agent-org-run-message-delivery.ts`, `root-team-run.ts`) | Unchanged; the remote path's own `prepareNewCopyWork` takes no folder step |
| Peer-started run | `remote-delegation-receiver.ts` 65 calls `catalogTaskSourceOf` with a `defaults_only` base | Unchanged (no folder passed) |
| Catalog copy | `collaborator-admission.ts` 145: `launches.resolve([plan], port.launchBase(), work)`. Every candidate takes `launchContextOf(base)` (`collaborator-launch-resolver.ts` 310–313); `launch-usability-check.ts` validates against that folder; `run-model-selection-service.ts` 54 reads the runtime's catalog per folder | Folder set before resolution, so the check reads F (REQ-006, AC-008) |
| In-run placement | Standalone has none (`standalone-root-recipient-resolver.ts` 50–52 always throws); Team and Org use `configuredPlacementSource` (`collaborator-source-projector.ts` 68–82). Activation uses `placement.source` (`team-task-execution-adapter.ts` 76–88, `projectTaskExecutionSource`) | Rewriting the snapshot reaches the copy. No launch check exists on this form today, and REQ-006 keeps that (Residual Risks) |
| Agent and Team copies | `run-execution-tree-shared-records.ts` 73–93: the Agent's `launchConfiguration`; the Team's default and each member's launch | `sourceInFolder` covers all (REQ-004) |
| Existing copy, restart | `assignToExistingCopy` is a separate path that restores from its snapshot (projects.md § Follow-up Task) | Unchanged (REQ-007) |
| Refusal | Thrown inside the `resolve` closure. `delegateToResolvedTarget` (`task-delegation-target.ts`) rethrows everything except `COLLABORATION_TARGET_NOT_FOUND`, before any Task link (`root-task-dispatch.ts`) | Nothing starts (REQ-005). The lifecycle must wrap the port call with `asTaskDelegationError`, as its siblings do (Residual Risks) |
| Link shape | `project-service.ts` 51–55 stores canonical absolute paths | `stat` on the link is well defined |

Web (REQ-008, AC-009), checked separately because copies have never had a folder different from the root's:

- `RightSideTabs.vue` 121–131 takes the Files workspace ID and the Terminal metadata from `activeContextStore.activeWorkspaceTarget`.
- `activeContextStore.ts` 77–82 returns the selected child's target.
- The child context gets its workspace per folder: `agentRunCollaborationHydration.ts` 45–55, `agentRunCollaborationChildContextFactory.ts` 19–20; Team members per address in `teamExecutionContextFactory.ts` 100–122.
- `RightSideTabs.workspaceTarget.spec.ts` already covers an Org member in a different folder.
- The older getter `stores/workspace.ts` `activeWorkspaceMetadata` still returns the host's folder for a selected child (`activeRun` is the host). It is not what the right panel reads when a target exists; `ContextFilePathInputArea.vue` 197–201 and `useEventMonitorFilePreview.ts` 104–120 also prefer the target. `useWorkspaceFileContentVisible` reads the getter, but its result only feeds `showFileContent`, a prop `WorkspaceAdaptiveLayout.vue` declares and does not use.

Result: no web change is needed. E-011's conclusion is right, but its citation is the wrong path (Residual Risks).

| Behavior ID | Kind | Alignment | Trigger / Evidence | Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass (E-011 corrected above) | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None beyond the handoff, which is consistent with the design.

## Task Design Health Assessment Verdict

| Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present | Pass | design § Task Design Health | — |
| Root cause explicit | Pass | `No Design Issue Found` for a feature that the existing owners absorb | — |
| Refactor decision explicit | Pass | No refactor | — |
| Supported by design sections | Pass | One rule owner; one shared apply step | File-size note: `root-team-run.ts` (Residual Risks) |

## Spine Inventory Verdict

| Spine | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner, Call Order | Off-Spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | N/A | Pass | Pass (the root delivery drives the sequence; the rule file decides) | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary | Public Entry | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `TaskExecutionResourcePort.projectFolderForNewCopy` | Pass | Pass | Pass | Pass | Collaboration never reads Project stores or stats a link |
| `resolveDelegationPlacement` | Pass | Pass | Pass | Pass | One place applies the folder to both forms |

## Dependency Direction / Forbidden Shortcut Verdict

`Pass`. `agent-collaboration → its port`; `projects → fs`; no new direction.

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `projectFolderForNewCopy(projectId)` | Pass | Pass | Pass | Low | Pass (`null` is the explicit "inherit" result) |
| `RootTaskExecutionLifecycle.newCopyFolder(work)` | Pass | Pass | Pass | Low | Pass |
| `resolveDelegationPlacement({…, newCopyFolder, catalogSource(folder)})` | Pass | Pass | Pass | Low | Pass |

`DelegationWork` correctly stays free of a local path, because it travels to peers and the router.

## Existing Capability / Subsystem Reuse Verdict

`Pass`. Launch resolution, snapshot, restore and web contexts are reused unchanged. The Project read uses the store the service holds.

## Subsystem / Capability-Area Allocation Verdict

`Pass`.

## Reusable Owned Structures Verdict

`Pass` (`baseInFolder`, `sourceInFolder`, each with its type).

## Shared Structure / Data Model Tightness Verdict

`Pass`. No structure changes.

- Derived consumers listed (Principle 11): `Pass` (snapshot → restore, views, web contexts; launch check and Model Router through the base).
- One vocabulary (Principle 15): `Pass`. "New-copy folder" is a design label; `workspaceRootPath` stays the stored and launch name.

## File Responsibility Mapping Verdict

`Pass`, with two additions recorded under Residual Risks: `team-task-execution-service.ts` and `project-errors.ts`.

## Subsystem / Folder / File Placement Verdict

`Pass`. `projects/services/project-new-copy-folder.ts` is the rule's own file.

## Removal / Decommission Completeness Verdict

`Pass`. Nothing becomes unnecessary.

## Legacy / Backward-Compatibility Verdict

`Pass`. No wrappers; existing copies keep their recorded folder, which is required behavior, not retention.

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Copy snapshots (`workspaceRootPath`) | Not Affected | Pass: same field and shape, different value for new copies; the readers do not depend on it equalling the root's folder (web evidence above) | Pass | N/A | Pass | No key is added, so older readers are unaffected |

## Change / Refactor Sequence Verdict

`Pass`. The shared step goes in first with `folder = null`, so nothing changes until the roots call it.

## Example Adequacy Verdict

`Pass` (root step, catalog, refusal text, each with its avoided shape).

## Material Premise Validation

None. SCN-005 (missing folder) is an approved explicit edge; links are unchecked on save (E-006).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`.

## Findings

None blocking and none requiring a design revision. The corrections below go to implementation as guidance.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). The Solution Designer gets an informational notification.

## Residual Risks

Guidance for implementation.

- **Team forwarder missing from the file map.** Team roots reach the lifecycle through `agent-team-execution/task-delegation/team-task-execution-service.ts` (54–58), so it needs a `newCopyFolder` forward. The Standalone and Org roots hold the lifecycle directly.
- **`root-team-run.ts` is at exactly 500 effective lines.** It may not grow. Add the step within the existing lines 329–331 (the design's example fits), or put the step behind `delivery.resolveDelegationPlacement`.
- **Error plumbing.** The new code also belongs in `ProjectErrorCode` (`projects/domain/project-errors.ts`) if the rule throws `ProjectError`. Wrap the port call in `newCopyFolder` with `asTaskDelegationError`, as the sibling calls in `new-copy-work.ts` do. Otherwise the agent gets an uncoded failure. Cover this in AC-006's tool-path test.
- **Refusal order.** The design's example resolves the folder before `resolveDelegationPlacement`, so a missing folder takes precedence over the CM-1 refusal and over target-not-found. Nothing starts either way, so this is harmless. Do not reorder it to run after placement.
- **In-run placements have no launch check, today or after this change.** A model valid for the old folder's catalog but not F's fails at start through the existing start-failure path, rather than being refused at delegation. It is reachable only on an Org or Team configured placement with a folder-scoped runtime catalog. REQ-006 keeps resolution as it is; report it if testing shows a worse outcome.
- **E-011's citation.** Files and Terminal follow the focused copy through `activeContextStore.activeWorkspaceTarget` and `RightSideTabs.vue` 121–131, not through `stores/workspace.ts` `activeWorkspaceMetadata`, which returns the host's folder for a selected child. Verify AC-009 in the browser on an Agent root, the user's main case.
- **A new Workspaces row.** A Project folder not yet registered appears in the Workspaces list after the first delegation (E-005; accepted in the design's Key Tradeoffs). REQ-008 says no UI change, and the user is the one who would notice this, so mention it in the delivery summary.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (none needed)
- Notes: ARCH-REV-001 passes SR-002. task_size Medium / architectural_risk High.
