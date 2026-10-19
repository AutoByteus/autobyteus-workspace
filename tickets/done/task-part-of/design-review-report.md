# Design Review Report — task-part-of

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/tickets/in-progress/task-part-of/requirements-doc.md` (Approved, SR-004)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/tickets/in-progress/task-part-of/investigation-notes.md` (AF-001–AF-009)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/tickets/in-progress/task-part-of/solution-revision-record.md` (SR-001–SR-005)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/tickets/in-progress/task-part-of/design-spec.md` (SR-005, `Ready`)
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/ui-ux-spec.md` (Approved; design `c406879`, integration `10207c6` verified present); reference derivation `autobyteus-web-design/utils/projects/taskParts.ts`; `visual-references/` (present).
- Relevant Solution Revision IDs: SR-004 (requirements basis), SR-005 (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/tickets/in-progress/task-part-of/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: `Architecture Design Complete` from `/software_engineering_team/solution_designer` (Large / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of`, branch `codex/task-part-of` at `cba6b85122` (no source changes yet). Read: `project-task-service.ts` (`create`, `update`, `updateTask`, `updateTaskById`, `closeAndWrite`, `deleteTask`), `task-dependency-writes.ts`, `project-store.ts` (reader/writer, `withTaskDependencies`, lock primitives), `task-execution-resource-service.ts` (`closeTask`, `assertTaskReadable`), `api/graphql/types/project-tasks.ts`, `project-task-tool-contract.ts`, `project-task-tool-manifest.ts`, `project-change-messages.ts`, `domain/models.ts` (commands, ack view), `tsconfig.json` (target ES2022), root `DESIGN.md` (rules 1–8), grep of all callers of the renamed symbols and of every `store.updateTask` / `closeAndWrite` caller.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: three areas (server Projects, GraphQL/feed/tool contracts, web Projects UI), ~35 files; changed agent-facing tool contract; extended GraphQL and WebSocket contracts; one-level invariant under concurrency; a new lifecycle effect where one `update_task` closes several Tasks and stops their task agents (CM-6).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. Confirmed against code: the cascade touches agent-run closure across Tasks, and the tool and feed contracts are strict.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. One parent per Task, same Project, one level, informs only. Exception: the parent's DONE/CANCELLED closes its open parts (REQ-016) and lists them (REQ-017). Delete leaves the parts without a parent. No mixed-version code (DEC-009).
- Relevant existing behavior and evidence confirmed: Yes. Status changes only through `updateTaskById` → `update()` (GraphQL has no status field; the only `store.updateTask` callers are `update()`, `reclaim` (no status) and `removeDeleted` (no status)). `closeAndWrite` closes runs under `resources.serialize(taskId)`, and `closeTask` throws `TASK_AGENT_RESOURCES_UNAVAILABLE` for a Task with damaged run data. Dependency validation sits under the per-Project `.task-dependencies` path lock, and delete cleanup keeps `updatedAt`. The reader is tolerant and the writer exact.
- Scope guardrail confirmed: Yes (UC-001–UC-007; out of scope: multi-parent, nesting, cross-Project, Temp tasks, board grouping, other auto status changes, PTM skill update, mixed versions; preserved: `depends on`, keys, status rules, other UI).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: N/A (no blocking findings).
- Remaining material ambiguity: none blocking. QR-005 "never goes unreported" is met by a named log warning plus truthful `closedParts` (see Residual Risks).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Contract | Pass | Pass (create/update bodies, `TaskReferences`, relations lock) | Pass (DS-001, DS-002, DS-008) | Confirmed | — |
| BEH-002 | User | Pass | Pass (store holds full list; reference `taskParts.ts`) | Pass (DS-005, DS-006) | Confirmed | — |
| BEH-003 | Contract | Pass | Pass (manifest maps IDs → keys from the Project list) | Pass (DS-007; acks) | Confirmed | — |
| BEH-004 | User | Pass | Pass (`deleteTask` → `removeDeleted`) | Pass (DS-004) | Confirmed | — |
| BEH-005 | System / Contract | Pass | Pass (single status path `update()`; `closeAndWrite`) | Pass (DS-003) | Confirmed | — |
| BEH-006 | Operational | Pass | Pass (tolerant reader; 204 Tasks, none with the field) | Pass (reader only) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` + VIS-001–017 (Approved, `c406879`) | Pass | Pass (requirements UI section, investigation inventory, design supplements table) | Pass | Pass (TR-008 "omitted keeps, null clears" = design's GraphQL semantics; one level and dangling-ID rules match the server rule; the spec leaves server refusals and the cascade to engineering, and the design covers both) | Pass | — |
| Design repo reference diff `e5ad9d8..c406879` | Pass | Pass (design spec "Relevant Supplemental Task Artifacts") | Pass | Pass (`partOfBlockedIds` treats a dangling parent as no parent, the same as server `assertParentValid`) | Pass (Reference; design-only code named for removal) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature; triggers considered (overload, reuse, naming, boundary, tightness) | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`; verified that `TaskDependencyWrites` already owns lock, reference resolution and delete cleanup | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Small refactor now: rename/generalize to `TaskRelationWrites`, fold `forNewTask`/`replace` into `write` | — |
| Refactor decision is supported by the concrete design sections | Pass | Removal plan, file mapping, DS-008, sequence step 3 | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Create with parent | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Replace/clear parent | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Parent close cascade | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Delete cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Live derived state | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Picker (bounded local) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Tool reads | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Relations write (bounded local) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProjectTaskService` | Pass | Pass | Pass | Pass | Resolver and manifest call only the service; the cascade stays inside the service (the manifest never closes parts) |
| `TaskRelationWrites` | Pass | Pass | Pass | Pass | Used only by the service; sole taker of the relations lock |
| `ProjectStore` | Pass | Pass | Pass | Pass | Unchanged role; lock primitive renamed |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `domain/task-parts.ts` | Pass | Pass | Pass | Pass | Depends only on `project-errors.ts` |
| `TaskRelationWrites` | Pass | Pass | Pass | Pass | store, domain rules, `TaskReferences`, change marks |
| Tool manifest | Pass | Pass | Pass | Pass | Service and search service only |
| Web components | Pass | Pass | Pass | Pass | Derivations in `utils/projects/taskParts.ts` |

Lock order checked: relations lock → `resources.serialize(taskId)` → task file lock; relations lock → task file lock → catalog lock (create). No current path takes these locks in reverse order.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| GraphQL `ProjectTask.partOfTaskId` / create & update inputs | Pass | Pass | Pass (long ID; update: omitted keep / null clear / string replace) | Low | Pass |
| Service commands `partOfTaskId?: string \| null`; tool commands `partOf?` | Pass | Pass | Pass (`undefined` = keep) | Low | Pass |
| `TaskRelationWrites.write` / `parentIdOf` / `removeDeleted` | Pass | Pass | Pass | Low | Pass |
| Tool `part_of` (create non-empty; update `""` clears) | Pass | Pass | Pass (key any case or long ID, resolved once) | Low | Pass |
| Tool outputs `partOf`, `parts`, `closedParts` (keys only) | Pass | Pass | Pass | Low | Pass |
| `TaskAcknowledgementView` `+partOfTaskId`, `+closedPartReferences` | Pass | Pass | Pass | Low | Pass |
| `/ws/projects` `projectTaskSchema` `+partOfTaskId` | Pass | Pass | Pass | Low | Pass |
| Error `TASK_PARENT_INVALID` | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Serialize relation writes | Pass | Pass | N/A | Pass | Extends `withTaskDependencies` |
| Resolve `part_of` | Pass | Pass | N/A | Pass | `TaskReferences.projectTask` |
| Close parts | Pass | Pass | N/A | Pass | Reuses `update()` / `closeAndWrite` (one closure path, CM-6) |
| Delete cleanup | Pass | Pass | N/A | Pass | One pass for both relations |
| Parent picker | Pass | Pass | Pass | Pass | Single-choice + unchoosable + has-parts state; ported from the approved reference instead of adding a mode flag to the multi-choice picker |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `server/src/projects` | Pass | Pass | Pass | Pass | Extend |
| `server/src/api/graphql/types` | Pass | Pass | Pass | Pass | Extend |
| `server/src/agent-tools/project-tasks` | Pass | Pass | Pass | Pass | Extend |
| `autobyteus-web` Projects | Pass | Pass | Pass | Pass | Extend |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Parent rule | Pass | Pass | Pass | Pass | `domain/task-parts.ts` beside `task-dependencies.ts` |
| Relations write | Pass | Pass | Pass | Pass | `task-relation-writes.ts` |
| Web derivations | Pass | Pass | Pass | Pass | `utils/projects/taskParts.ts` |
| Relation-key mapping | Pass | Pass | Pass | Pass | Local to the manifest |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectTask.partOfTaskId` | Pass | Pass | Pass (parts never stored) | N/A | Pass | — |
| `TaskAcknowledgementView` | Pass | Pass | Pass | N/A | Pass | Project-Task-only fields, same as `dependsOnTaskIds` |
| Web `ProjectTask.partOfTaskId` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `domain/task-parts.ts` (new) | Pass | Pass | N/A | Pass | — |
| `services/task-relation-writes.ts` (renamed) | Pass | Pass | Pass | Pass | — |
| `services/project-task-service.ts` | Pass | Pass | Pass | Pass | Gains only the cascade (~20 lines), next to its closure orchestration |
| `stores/project-store.ts` | Pass | Pass | N/A | Pass | — |
| GraphQL / feed / tool files | Pass | Pass | N/A | Pass | — |
| Web files (4 new, 4 changed components; store, draft, derivations, i18n) | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `projects/domain/task-parts.ts` | Pass | Pass | Low | Pass | — |
| `projects/services/task-relation-writes.ts` | Pass | Pass | Low | Pass | — |
| `web/components/projects/*` (flat) | Pass | Pass | Low | Pass | Matches current layout |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `TaskDependencyWrites` / file | Pass | Pass | Pass | Pass | `git mv` |
| `forNewTask`, `replace` | Pass | Pass | Pass | Pass | Folded into `write` |
| `withTaskDependencies` / `.task-dependencies` | Pass | Pass | Pass | Pass | In-process path lock; nothing on disk to migrate |
| Dead code in touched files | Pass | N/A | Pass | Pass | Delegated to implementation with evidence (Principle 7) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Renamed writer / lock | No | Pass | Pass | Alias rejected |
| Mixed versions | No | Pass | Pass | DEC-009 |
| Reader absent-field handling | No | Pass | Pass | Generic tolerant projection, not version branching |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `task.json` `+partOfTaskId` | `Directly Usable — No Migration` | Pass (tolerant `readTaskFile`; 204 real Tasks without the field; absence truthfully = no parent) | Pass | N/A | Pass | Rollback loss accepted in requirements (DEC-009) |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server domain → store → writer → service → transport → tools | Pass | Pass (none) | Pass | Pass |
| Web port from the reference | Pass | Pass | Pass (design-only code named) | Pass |
| Docs (modules, CM-6, web) | Pass | N/A | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `task.json` shape | Yes | Pass | Pass | Pass | — |
| Parent rule refusals | Yes | Pass | Pass | Pass | — |
| GraphQL omitted vs null | Yes | Pass | Pass | Pass | — |
| Tool clear value / results / cascade result | Yes | Pass | Pass | Pass | — |
| Cascade trigger matrix | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

### `AP-001` — A part's close fails during the cascade (damaged run data)

- Related approved requirement or established contract: QR-005; REQ-016; DESIGN.md rule 7 ("Contain bad data to its own run").
- Relevant behavior ID(s): BEH-005
- Initiating basis kind: `Contract`
- Independent product-supported initiating trigger or applicable governing contract: DESIGN.md rule 7 requires a run whose saved data can't be read to be left out and logged by name, without affecting other runs. `TaskExecutionResourceService` already records such Tasks in `damaged` when it loads.
- Support evidence: `closeTask` → `assertTaskReadable(taskId)` throws `TASK_AGENT_RESOURCES_UNAVAILABLE` for a damaged Task; rule 7 places containment at "a lookup or scan across many runs that skips the unreadable run".
- Forward path: `update_task status=CANCELLED` on parent → `updateTaskById` → `update()` → parent `closeAndWrite` commits → `closeOpenParts` → part `update()` → `closeAndWrite` → `closeTask` throws for the damaged part.
- Lifecycle preconditions and material consequence: the parent is already committed. If the error propagated, the tool would report a failure for a write that was committed, and the remaining parts would stay open.
- Reachability: `Reachable` (via the governing contract)
- Review consequence / proportionate response: the design's per-part try → log `TASK_PART_CLOSE_FAILED` (project, parent, part IDs) → skip, with truthful `closedParts`, is proportionate and matches rule 7. No further machinery.

### `AP-002` — A part is attached to the parent between the parent's commit and the cascade's listing

- Related approved requirement or established contract: REQ-016 / DEC-018 ("a part attached to a closed parent keeps its status").
- Relevant behavior ID(s): BEH-005, BEH-001
- Initiating basis kind: `User` / `Contract`
- Independent product-supported initiating trigger or applicable governing contract: none for the combination. Each action (closing a parent with `update_task`, attaching a part in Edit task or with `update_task part_of`) is supported alone. No product goal or contract covers running them concurrently on the same parent.
- Support evidence: two individually supported actions do not make a supported concurrent workflow (Principle 6).
- Forward path: N/A
- Lifecycle preconditions and material consequence: at worst the newly attached part is closed too, which the user would see on the board.
- Reachability: `Not Reachable` (as a supported scenario)
- Review consequence / proportionate response: no finding, no machinery.

### `AP-003` — An agent runtime sends `part_of=""` for an optional parameter it meant to leave out, which would clear the parent

- Related approved requirement or established contract: REQ-013, REQ-015 ("tool calls without the parent argument behave exactly as before").
- Relevant behavior ID(s): BEH-003
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: none found. Current `update_task` already rejects `description: ""` with `TASK_DESCRIPTION_REQUIRED`, so a runtime that filled omitted string parameters with `""` would already break every `update_task`. Nothing indicates that happens.
- Support evidence: `parseUpdateTaskInput` / `taskDescription` in `project-task-tool-contract.ts`.
- Forward path: N/A
- Lifecycle preconditions and material consequence: N/A
- Reachability: `Not Reachable`
- Review consequence / proportionate response: none. `""` as the clear value is accepted.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None.

### Non-blocking implementation notes (not findings; for the implementation engineer)

These follow from the approved design and current code. They add no behavior.

1. **GraphQL omitted vs null (the design's update semantics).** Decide presence by value: `partOfTaskId === undefined` keeps, `null` (or `""` after `normalizePartOf`) clears, a string replaces. Do not use `Object.hasOwn`, because target ES2022 defines declared input-class fields as own `undefined` properties. Do not copy the existing `dependsOnTaskIds == null → keep` pattern either. Keep the planned `projects-graphql.e2e` case (omitted keeps, null clears).
2. **Patch-required checks.** `parseUpdateTaskInput` (allowed keys and the `TASK_PATCH_REQUIRED` condition), `updateTaskById` and `updateTask` must treat a supplied `part_of` / `partOfTaskId`, including the clear value, as a change. `rejectUnsupported` lists for `create_task` / `update_task` gain `part_of`. `create_task part_of=""` is an argument error.
3. **Key order on the server.** For tool `parts`, sort by numeric key order, as the web does with `taskKeyNumber`, so `autobyteus-25` comes before `autobyteus-172`. Plain string order would differ from the Parts card.
4. **Ack list loading.** `projectTaskList` in the manifest loads the Project list only when `dependsOnTaskIds` is non-empty. Also load it when the ack has a `partOfTaskId`, so `partOf` maps to a key. `closedPartReferences` are already keys.
5. **Cascade and the relations lock.** When the same `update_task` also supplies `depends_on` / `part_of`, the cascade runs inside the per-Project relations lock. That is fine because a part's close takes no relations lock, but `withFilePathLock` is not reentrant. The cascade's per-part `update()` must never go through `TaskRelationWrites.write`.
6. **Delete cleanup.** In `removeDeleted`, clear `partOfTaskId` conditionally inside the per-file updater (`task.partOfTaskId === deletedId ? null : …`), the same way dependencies are filtered today. This way a re-parent committed meanwhile under the lock is never overwritten.
7. **Renamed log code.** `TASK_DEPENDENCY_CLEANUP_FAILED` → `TASK_RELATION_CLEANUP_FAILED` is asserted in `tests/unit/projects/project-task-keys-and-dependencies.test.ts:199`. That file is not in AF-003's caller list, so update it too.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (per handoff rules); informational notice to `/software_engineering_team/solution_designer`.

## Residual Risks

- **QR-005 visibility to the calling agent.** A part that fails to close is reported by a named server log warning and left out of `closedParts`. The agent is not told by name that a part stayed open, though it can see that part still open in `list_project_tasks`. This meets QR-005 as written and DESIGN.md rule 7. An agent-visible "not closed" field would be new contract and would need user approval. Optional follow-up only.
- **Create with a parent or dependencies holds the relations lock during the context-file import** (up to 25 MiB per file). This is accepted in Key Tradeoffs. Such creates are rare, and the lock is per Project and in-process.
- **Tool descriptions change agent behavior** (the design keeps them minimal). FU-001 covers the Project Task Manager's skill.
- Mixed versions are unsupported by the user's decision (DEC-009).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (AP-001 Reachable and proportionately handled; AP-002, AP-003 Not Reachable, no machinery)
- Notes: the design is ready for implementation. The seven implementation notes above are guidance, not conditions.
