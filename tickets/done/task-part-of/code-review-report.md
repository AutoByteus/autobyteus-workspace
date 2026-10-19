# Code Review Report — task-part-of

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/task-part-of/requirements-doc.md` (Approved, SR-004)
- Investigation Notes Reviewed As Context: `tickets/in-progress/task-part-of/investigation-notes.md` (AF-001–AF-009, through the design spec and design review)
- Solution Revision Record Reviewed As Context: `tickets/in-progress/task-part-of/solution-revision-record.md` (SR-001–SR-005)
- Design Spec Reviewed As Context: `tickets/in-progress/task-part-of/design-spec.md` (SR-005, Ready)
- Supplemental Task Artifacts Reviewed As Context: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/ui-ux-spec.md` (Approved); reference implementation `autobyteus-web-design@c406879`. Each ported web file was diffed against the reference.
- Relevant Solution Revision IDs: SR-004 (requirements), SR-005 (design)
- Design Review Report Reviewed As Context: `tickets/in-progress/task-part-of/design-review-report.md` (Pass, seven implementation notes)
- Architecture Review Revision Record Reviewed As Context: `tickets/in-progress/task-part-of/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `tickets/in-progress/task-part-of/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `tickets/in-progress/task-part-of/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `tickets/in-progress/task-part-of/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Implementation done, from `/software_engineering_team/implementation_engineer` (Large / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Reviewed code: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of`, branch `codex/task-part-of`, `cba6b85122..179ddb9f77` (server `6cc6c22d2e`, web `179ddb9f77`); ticket artifacts `536a22de34`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The change covers three areas: server Projects, the GraphQL / feed / tool contracts, and the web Projects UI. It changes the agent tool contract, adds a one-level rule enforced under concurrency, and adds a lifecycle effect: one `update_task` can now close several Tasks and stop their task agents.

## Review Scope

- Changed implementation and behavior reviewed: BEH-001 to BEH-006. That covers storing, validating, replacing and clearing the parent; the parent-close cascade and `closedParts`; delete cleanup; tool reads; feed and GraphQL fields; the reader and writer; and the web derivations, components, store and draft.
- Files / areas reviewed: every changed server `src` file, read in full in the diff. That includes the renamed `task-relation-writes.ts`, the new `task-parts.ts`, `task-part-closure.ts` and `task-assignment-eligibility.ts`, and `project-task-service.ts` in context: `update`, `closeAndWrite`, `create`, `updateTaskById`. I also read the GraphQL resolver wiring and the search service source of the Task views. On the web: every changed source file, plus the host `ProjectTaskEditor.vue`. On the test side: the new server suites (cascade, concurrency, in-lock cascade, conditional clear, tools, GraphQL omitted / null) and the changed shape tests. Docs: CM-6.
- Explicit exclusions: server E2E suites (API/E2E-owned; the handoff lists the expected additive-shape updates). I did not visually re-check against VIS-001–017; that is covered by IMP-07 and the faithful port verified below. I did not rerun any recorded check: none of the exercised code changed after `179ddb9f77`, and no finding needed a new check.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. A Task has one parent, in the same Project, one level deep. The relation only informs, with one exception: when a parent is set to DONE or CANCELLED, its open parts take that status (REQ-016) and the result lists them (REQ-017). Deleting a parent leaves its parts in place without a parent. There is no migration and no mixed-version code.
- Design-spec behavior map verified against the implementation: Yes (see table).
- Design review report and round confirmed: ARCH-REV-001 Pass. All seven implementation notes are applied in code (verified individually below, under Structural checks).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: none
- Remaining material ambiguity, if any: none

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | GraphQL `createProjectTask` / `updateProjectTask` pass the input to `ProjectTaskService.createTask` / `updateTask`. Tools go `part_of` → `taskPartOf` (shape) → `createTaskWithLocalContextFiles` / `updateTaskById` → `TaskRelationWrites.parentIdOf` (resolves the reference within the same Project). Both paths then go `changesOf` (by value: undefined keeps, null / "" clears) → `TaskRelationWrites.write` (`withTaskRelations` → `listTasks` → `assertDependenciesValid` / `assertParentValid`) → `update()` or `store.createTask`. A create with relations validates before `prepareContext`. A Temp task gets `TASK_PARENT_INVALID`. | — |
| BEH-002 | Confirmed | `projectTaskStore` list (with `partOfTaskId`) → `utils/projects/taskParts.ts` → `TaskPartsSection` / `TaskPartsProgress` / `TaskPartOfMarker` in the row, the page and the tab. The ports are identical to reference `c406879` except the documented picker `immediate` fix. | — |
| BEH-003 | Confirmed | `relationKeys` (one ID → Task map; parts in key order via `compareTaskKeys`) for `list_project_tasks` and `search_project_tasks`. The search results are fresh views. Acks load the list when they carry dependencies or a parent. `closedParts` appears only when non-empty. | — |
| BEH-004 | Confirmed | `deleteTask` → `TaskRelationWrites.removeDeleted`: one pass, with the parent cleared conditionally inside the per-file updater. `updatedAt` is kept and the change is republished. Log code `TASK_RELATION_CLEANUP_FAILED`. | — |
| BEH-005 | Confirmed | `update()` sets `closesParts = closing && current.status !== status` inside the store updater. After `closeAndWrite` returns (parent committed, released) and the parent is published, `TaskPartClosure.closeOpenParts` lists the parts, keeps the TODO / IN_PROGRESS ones in key order, and closes each through the service's own `update(…, noContextChange, cascade=false)`: the part's `closeAndWrite` closes its runs and asks for their release. A failing part is caught, logged `TASK_PART_CLOSE_FAILED` and skipped. Reopen, same-status writes and a part's own close never cascade. The cascade's per-part update never re-enters `TaskRelationWrites.write`. | — |
| BEH-006 | Confirmed | `readTaskFile`: `partOfTaskId` must be a non-empty string, otherwise it reads as `null`. `taskFileContent` always writes it. There is no old-shape branch. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 / SCN-010 | BEH-001; REQ-001–004, 011, 018 | User | User | Make a Task a part, or move or detach it | New / Edit task, "New part" | Normal | Editor → store mutation → service → relations writer (lock) → store → publisher | Stored, or refused in the error line | Requirements SCN-001, SCN-010 (approved) | Supported Normal Scenario | Use |
| SCN-002 | BEH-001; REQ-013 | Contract | Project Task Manager | Create slices of a bigger Task | `create_task` / `update_task part_of` | Normal | Contract parser → manifest → service → writer | Stored; result shows the key | SCN-002 (approved) | Supported Normal Scenario | Use |
| SCN-005 | BEH-001; REQ-002, 003; QR-001 | Contract | Stale UI or a concurrent agent | Invalid or concurrent parent writes | Mutation / tool | Explicit Edge | Writer lock → `assertParentValid` | Refused, nothing written | SCN-005; QR-001 | Supported Explicit Edge Scenario | Use |
| SCN-006 | BEH-004; REQ-006 | User | User | Delete a parent or a part | Task page Delete | Normal | `deleteTask` → `removeDeleted` | Parts kept without a parent | SCN-006 | Supported Normal Scenario | Use |
| SCN-011 / SCN-007 | BEH-005; REQ-005, 016, 017; QR-005 | Agent | Project Task Manager | Close a bigger Task as a whole / close the last part | `update_task status` | Normal | DS-003 as traced above | Open parts closed with their runs; `closedParts` lists them; a part's own close never cascades | SCN-011, SCN-007; AP-001 (DESIGN.md rule 7) | Supported Normal Scenario | Use |
| SCN-008 | BEH-003; REQ-014 | Contract | Agent | Read parent and parts | `list_project_tasks` / `search_project_tasks` | Normal | Manifest `relationKeys` | Keys only | SCN-008 | Supported Normal Scenario | Use |
| SCN-009 | BEH-006; REQ-015 | Operational | App upgrade | Existing Tasks without the field | First start | Normal | Tolerant reader | No parent, no conversion | SCN-009 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `TaskAssignmentEligibility` extraction, which the design does not name (handoff point 1) | Engineering contract: the `>500` source limit; Change Scope "assignment, delegation and reopen rules left alone" | The file was at 500 at base; the feature adds code to it | Without the move the file would be ~519 (474 + the ~45 moved lines). The moved methods are byte-identical apart from `private` → public and `this.store.` → `this.store().` (verified by a line diff against base). Call order is unchanged, and `terminalAssignment` is still used in `resolveAssignment`. The rules are unchanged; only their file changed. | Base and current diff; existing assignment / reopen suites pass (IMP-02) | Reject | — | A cohesive, concretely named owner, used only by the service; not a rule change. No finding. |
| C-02 | Cascade inside the relations lock (handoff point 2) | BEH-005; ARCH note 5 | `update_task status=DONE depends_on=…` on a parent | `write` holds `.task-relations`; the parent's `update()` → `closeAndWrite` → cascade → per-part `update()` only (no `TaskRelationWrites.write`, so nothing re-enters the non-reentrant lock). Lock order: relations → part serialize → part file, as reviewed in ARCH-REV-001. | Code; test "the cascade also runs when the same update_task changes the parent's relations" | Reject (correct as built) | — | No defect. |
| C-03 | Containment of a part that fails to close (handoff point 2) | QR-005; DESIGN.md rule 7; AP-001 | A part with damaged run data (`TASK_AGENT_RESOURCES_UNAVAILABLE`), or a part deleted meanwhile | Per part: try / catch → `console.warn("TASK_PART_CLOSE_FAILED", {projectId, taskId: parent, partTaskId, error})`, skipped. The parent and the other parts close, and `closedParts` stays truthful. The containment sits at the scan-across-runs boundary that rule 7 names. | Code; QR-005 test (simulated store failure on one part) | Reject (correct as built) | — | Matches AP-001's accepted response. That the agent is not told by name is an accepted residual risk. |
| C-04 | A `listTasks` failure inside `closeOpenParts`, after the parent committed, makes the tool report `ProjectMutationUnconfirmed` | — | Infrastructure / store read failure | — | — | Reject | — | Infrastructure failure is outside scope by default (Principle 6); the reader is tolerant of bad files. No machinery. |
| C-05 | A part attached between the parent's commit and the cascade's listing gets closed too | AP-002 | Concurrent attach + close on the same parent | — | ARCH-REV-001 AP-002 | Reject | — | Two supported actions do not make a supported concurrent workflow; unchanged from AP-002. |
| C-06 | `generated/graphql.ts` committed with only the part-of hunks (handoff point 3) | Engineering contract: generated client types match the server schema used by this change | Codegen | IMP-06: the committed `partOfTaskId` lines equal a real codegen run against this worktree's schema. The rest of the file's drift is unrelated to this change. | `IMP-06-codegen-partOf-lines.txt` | Promote (the file being stale) | Follow-up | Everything this ticket uses is generated-equal. The unrelated drift exists on the base already → FU-CR-002. |
| C-07 | `ProjectTaskService.drainRuntimeReleases()` has no `src` caller (handoff) | Core Principle 7 (dead code in touched files) | — | It existed before this change. It is a one-line test-synchronization seam used by 14 test files of unrelated behaviors ("tests and orderly shutdown"). It is not "code only its own tests call", and removing it means redesigning test synchronization outside this ticket. | `grep` in src/tests | Promote | Follow-up | The ticket works without the change; when unsure, prefer a follow-up → FU-CR-003. |
| C-08 | `TaskDependencyPicker` keeps the initial-active-option issue that this change fixed in `TaskPartOfPicker` | REQ-004 / preserved behavior (dependency picker unchanged) | Open the dependency picker when the newest option is a loop Task; press Enter | `watch(options, …)` without `immediate` (line 117) | Code | Promote | Follow-up | The defect predates this change, and the ticket must not change the dependency picker → FU-CR-001. |
| C-09 | The editor always sends `partOfTaskId` (null when none), so every Edit save takes the relations lock | BEH-001; AF-007 | Edit task Save | Unchanged cost: the editor already always sends `dependsOnTaskIds` (`[...dependsOn.value]`), so the lock was already taken on every edit. `null` vs a stored `null` is not a meaningful change, so `updatedAt` is not bumped. | Code | Reject | — | No new behavior or cost. |
| C-10 | Edit draft initial `partOf` derives from the store list (a dangling parent starts as null and is cleared on save) | REQ-006 ("never shown or counted") | Edit a part whose parent was deleted and whose cleanup failed | Saving clears the dangling ID, the same as the step-1 dependency pattern. `ProjectTaskEditor` renders the draft only after `useProjectTaskPage` has the Task from the list, so a list that is still loading cannot clear a real parent. | Code | Reject | — | Correct by design. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Rename / generalize done with `git mv` history; `forNewTask` / `replace` / `idsOf` folded into `write` / `dependencyIdsOf`; no alias. The extra extraction (C-01) changes no ownership. | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | The 5 ported web files are identical to `c406879`. Two documented deltas: the picker `immediate: true` (QR-004 keyboard) and the `?partOf` current-Task guard (design guidance). en / zh-CN catalogs gained the parts block. | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001–DS-008 traced in code as specified (Basis table) | — |
| Ownership boundary preservation and clarity | Pass | All writes go through `ProjectTaskService`. `TaskRelationWrites` is the only taker of the relations lock and the only resolver of `part_of`. The cascade uses the service's own `update()`. The manifest never closes parts. | — |
| Off-spine concern clarity | Pass | `task-parts.ts` (pure rule), `TaskPartClosure` (loop, with the close callback owned by the service), `relationKeys` (manifest-local mapping), `taskParts.ts` (web derivations) | — |
| Existing capability/subsystem reuse check | Pass | Lock, reference resolution and delete cleanup reused through the generalized writer; `compareTaskKeys` added beside the key helpers; web reuses `TaskKey`, status pill, `taskKeyNumber`. | — |
| Reusable owned structures check | Pass | One parent rule shared by create and update; one `changesOf` normalization for GraphQL and tools; web derivations shared by row, page, tab, picker and delete note. | — |
| Shared-structure/data-model tightness check | Pass | `partOfTaskId` is the only stored fact; parts are never stored or accepted. `TaskAcknowledgementView` gains Project-Task-only fields; `closedPartReferences` appears only when non-empty. | — |
| Repeated coordination ownership check | Pass | The validation sequence lives in `TaskRelationWrites.write` only; the cascade policy lives in `update()` (trigger) + `TaskPartClosure` (loop). | — |
| Empty indirection check | Pass | `TaskPartClosure` owns the listing, filtering, order and per-part containment; `TaskAssignmentEligibility` owns its checks. Neither only forwards calls. | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Service at 474 effective lines; each new file has one concern. | — |
| Ownership-driven dependency check | Pass | `task-parts.ts` depends only on `project-errors.ts`; the manifest depends on the service and search service plus the domain `compareTaskKeys`; no cycles. | — |
| Authoritative Boundary Rule check | Pass | No caller uses both the service and its writer / store; GraphQL and tools depend on the service only. | — |
| File placement check | Pass | Domain rule in `projects/domain/`, writers / closure / eligibility in `projects/services/`, web components flat in `components/projects/` | — |
| Flat-vs-over-split layout judgment | Pass | Small, named files; no artificial folders | — |
| Interface/API/query/command/service-method boundary clarity | Pass | GraphQL: omitted keeps, null clears, string replaces, decided by value (no `Object.hasOwn`, ARCH note 1; pinned by the schema test). Tool: `part_of` string, create non-empty, update `""` clears (note 2); `rejectUnsupported` lists updated; `TASK_PATCH_REQUIRED` checks include the parent in the contract, in `updateTaskById` and in `updateTask`. | — |
| Naming quality and naming-to-responsibility alignment check | Pass | `TaskRelationWrites`, `withTaskRelations`, `TaskPartClosure.closeOpenParts`, `partOfTaskId`, `part_of`, `partOf` / `parts` / `closedParts`, `TASK_PARENT_INVALID`, `TASK_PART_CLOSE_FAILED`, `TASK_RELATION_CLEANUP_FAILED` | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | `projectTaskIdOf` shared by dependency and parent resolution; the manifest's `dependencyKeys` replaced by `relationKeys` | — |
| Patch-on-patch complexity control | Pass | Single-round implementation; the picker fix is one option on the reference line | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | Folded methods, the manifest helper and the unused import were removed; the moved methods are not duplicated. `drainRuntimeReleases` is a follow-up (C-07). | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | The server parts suite maps to AC-001–008 and AC-018: concurrency exactly-one, independent relations, cascade per status with a running task agent closed and released, no cascade on same status / reopen / a part's close, containment, in-lock cascade, conditional clear, wire field. The tool suite maps to AC-014, AC-015 and `closedParts`; the GraphQL test covers omitted / null / ID. Web specs cover derivations, components, the draft and the delete note. | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `family()` builder; shared create / setStatus / setParent helpers | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Log-code test renamed (note 7); shape assertions updated additively | — |
| API/E2E readiness for the next workflow stage | Pass | Known additive-shape E2E updates listed with files and lines; coverage hints for GraphQL omitted / null, tool any-case / long ID / `""`, the AC-018 cascade with a real running task agent, the feed, and AC-017 | — |

## Source File Size And Structure Audit

Every changed source file is under 500 effective lines, and no file grew by more than 220.

| Source File | Before | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `server/src/projects/services/project-task-service.ts` | 500 | 474 | Pass | Pass | Pass (cascade loop, normalization and eligibility checks moved to owned files) | Pass | — | — |
| `server/src/projects/services/task-relation-writes.ts` (renamed from `task-dependency-writes.ts`, 67) | 67 | 93 | Pass | Pass | Pass | Pass | — | — |
| `server/src/projects/services/task-part-closure.ts` (new) | 0 | 30 | Pass | Pass | Pass | Pass | — | — |
| `server/src/projects/services/task-assignment-eligibility.ts` (new, moved) | 0 | 67 | Pass | Pass | Pass | Pass | — | — |
| `server/src/projects/domain/task-parts.ts` (new) | 0 | 37 | Pass | Pass | Pass | Pass | — | — |
| `server/src/agent-tools/project-tasks/project-task-tool-contract.ts` | 226 | 241 | Pass | Pass | Pass | Pass | — | — |
| `server/src/agent-tools/project-tasks/project-task-tool-manifest.ts` | 137 | 157 | Pass | Pass | Pass | Pass | — | — |
| `server/src/api/graphql/types/project-tasks.ts` | 209 | 219 | Pass | Pass | Pass | Pass | — | — |
| `server/src/projects/stores/project-store.ts` | 274 | 275 | Pass | Pass | Pass | Pass | — | — |
| `server/src/projects/domain/models.ts`, `project-errors.ts`, `task-keys.ts`, `changes/project-change-messages.ts` | 190 / 34 / 25 / 85 | 204 / 35 / 28 / 85 | Pass | Pass | Pass | Pass | — | — |
| `web/components/projects/TaskPartOfPicker.vue` (new) | 0 | 138 | Pass | Pass | Pass | Pass | — | — |
| `web/components/projects/TaskPartsSection.vue`, `TaskPartsProgress.vue`, `TaskPartOfMarker.vue` (new) | 0 | 66 / 28 / 30 | Pass | Pass | Pass | Pass | — | — |
| `web/components/projects/ProjectTaskRow.vue`, `ProjectTaskDetail.vue`, `ProjectTaskDraftEditor.vue`, `panel/ProjectsPanelTaskDetail.vue` | 101 / 70 / 49 / 93 | 114 / 76 / 52 / 95 | Pass | Pass | Pass | Pass | — | — |
| `web/composables/projects/useProjectTaskDraft.ts`, `stores/projectTaskStore.ts`, `types/project.ts`, `utils/projects/taskParts.ts` (new), `graphql/queries/projectTaskQueries.ts` | 82 / 194 / 117 / 0 / 60 | 91 / 195 / 119 / 28 / 61 | Pass | Pass | Pass | Pass | — | — |
| `web/generated/graphql.ts` (generated) | — | — | N/A (generated) | N/A | — | — | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No alias for the writer or lock; no mixed-version code |
| No legacy old-behavior retention in changed scope | Pass | `.task-dependencies` lock path replaced by `.task-relations` (in-process) |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | See the structural check; C-07 is a follow-up |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Directly Usable — No Migration`; tolerant reader, exact writer; written at the next ordinary save |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Reader projects one current field |
| Approved transition mechanics match the reviewed design | Pass | N/A beyond the reader / writer |

## Dead / Obsolete / Legacy Items Requiring Removal

None in this ticket's scope (C-07 is recorded as FU-CR-003).

## Docs-Impact Verdict

- Docs impact: `Yes` (done)
- Why: new model field, rules, tool fields and cascade effect
- Files or areas affected: `autobyteus-server-ts/docs/modules/projects.md`, `docs/design/collaboration_model.md` CM-6 (the parent-close sentence is present), `autobyteus-web/docs/projects.md`. Delivery owns the final docs sync.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| AP-001 | Confirmed | Implemented as accepted: per-part try / log / skip in `TaskPartClosure` |
| AP-002 | Confirmed | No machinery added (C-05) |
| AP-003 | Confirmed | `""` is the clear value only on `update_task`; `create_task part_of=""` is an argument error |

New premises: None.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94
- Score calculation note: simple average of the ten categories; not the decision rule.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every designed spine (create, re-parent, cascade, delete, feed, tool reads) is visible in code in the designed order | `TaskPartClosure` takes the close step as a callback, so the cascade's link back into `update()` is one indirection away | Nothing required |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | The service stays the only Task boundary; one lock owner; the cascade reuses the one closure path | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Omitted / null / string semantics by value, pinned by a test; tool `""` clear; additive keys-only outputs; `closedParts` only when non-empty | The service's `TASK_PATCH_REQUIRED` message texts still name only "description and/or status"; this predates the change | Optional wording touch-up later |
| 4 | Separation of Concerns and File Placement | 9.3 | Concrete owned files, all under limits; the eligibility move is cohesive and verbatim | The move is not in the design; judged justified (C-01) | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | One stored fact; shared rule, normalization and derivations | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Names follow the user's wording and the step-1 pattern | A few dense one-line expressions in `update()` / the manifest, consistent with the file's existing style | — |
| 7 | API/E2E Readiness | 9.3 | Coverage hints and known shape updates listed with files and lines | Several existing E2E assertions must change before they pass (expected, additive) | API/E2E updates them |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Cascade trigger matrix, containment, in-lock path, conditional clear and concurrency are verified in code and tests; the picker keyboard defect was found and fixed | The cascade with a real running task agent and the live feed through the running server have only unit coverage so far | API/E2E AC-018 / AC-008 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean rename, no aliases, no mixed-version code, no migration | — | — |
| 10 | Cleanup Completeness | 9.3 | Folded and moved code removed; log-code test updated | Follow-ups FU-CR-001 to FU-CR-003 lie outside this ticket | Handled as follow-ups |

## Findings

None.

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| FU-CR-001 | `autobyteus-web/components/projects/TaskDependencyPicker.vue:117`: the active option is set only when the options change (`watch` without `immediate`). When the newest option is a loop Task, Enter right after opening the list does nothing. | Line 117; the same defect was found and fixed in `TaskPartOfPicker` (IMP-07 run 1) | It predates this change, and the ticket's preserved-behavior boundary keeps the dependency picker unchanged (REQ-004) | "Depends on picker: make the first active option a choosable one when the list opens (`immediate: true` on the options watch), with a regression test, as `TaskPartOfPicker` does." |
| FU-CR-002 | `autobyteus-web/generated/graphql.ts` is stale against the current server schema: types such as `Delegated*` and `MeaningSearch*` are missing | IMP-06: a full codegen run against the built schema produces drift unrelated to this ticket | It predates this change; the ticket's own hunks match codegen | "Regenerate `autobyteus-web/generated/graphql.ts` from the current server schema and commit the full result; check web typecheck / tests." |
| FU-CR-003 | `ProjectTaskService.drainRuntimeReleases()` (`autobyteus-server-ts/src/projects/services/project-task-service.ts:270`) has no `src` caller. Its doc mentions "orderly shutdown", but no shutdown path calls it; 14 test files use it to settle releases. | `grep` over `src` / `tests` | A one-line seam that predates this change; removing it means redesigning test synchronization across unrelated suites | "Decide on `drainRuntimeReleases`: wire it into orderly shutdown, or replace the test synchronization and remove it (Core Principle 7)." |

- Sent to: `/project_task_manager` (the "Requested by" agent in the requirements doc), in one message after this report.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (primary pass rule), with an informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- If a part fails to close during a cascade, the result does not name it: it is logged and left out of `closedParts`. This was accepted in ARCH-REV-001.
- One `update_task` can stop several task agents. That was the user's decision; `closedParts` makes it visible.
- Existing E2E shape assertions need the additive `partOf` / `partOfTaskId` fields (listed in the handoff).
- So far only unit tests and the external writer cover the cascade's effect on a really running task agent and the live board update through the running server. API/E2E should cover AC-018 and AC-008 end to end, and AC-017 on an isolated desktop instance.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (AP-001–AP-003 confirmed; no new premises)
- Score Summary: 9.4 / 10 (94 / 100); every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: all three focus points the implementation engineer raised were reviewed: the eligibility extraction (C-01), the cascade in the lock and its containment (C-02, C-03), and the generated file (C-06 → FU-CR-002). None is a finding.
