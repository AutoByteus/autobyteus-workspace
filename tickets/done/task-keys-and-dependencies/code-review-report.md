# Code Review Report — task-keys-and-dependencies

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/requirements-doc.md` (Approved, SR-003)
- Investigation Notes Reviewed As Context: `…/investigation-notes.md` (used for the stored-shape and current-path evidence the design cites)
- Solution Revision Record Reviewed As Context: `…/solution-revision-record.md` (SR-001–SR-003)
- Design Spec Reviewed As Context: `…/design-spec.md` (Ready, SR-003; SR-001 body, "SR-002 Extension", "SR-003 Corrections")
- Supplemental Task Artifacts Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md`; prototype components at design `1ff2edf` (`TaskDependencyPicker.vue`, `TaskKeyChip.vue`) for parity checks
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Design Review Report Reviewed As Context: `…/design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record Reviewed As Context: `…/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`, `ARCH-REV-003`
- Implementation Handoff Reviewed As Context: `…/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `…/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-003` (CRR-001 Local Fix), on top of `IR-002` / `IR-001`
- Code Review Revision Record: `…/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Review Scope: `Targeted Delta Review` (round 2); round 1 was a `Full Review`
- Review Scope Evidence (round >1): IR-003 changes only `task-dependency-writes.ts` (`idsOf` returns `normalizeDependsOn(ids)`), one new unit case in `project-task-keys-tools.test.ts`, the server module doc "Key" bullet and the web `taskKey` comment. All are within CR-001 / CR-002. The tracked and untracked file set is unchanged from round 1. No spine, shared interface or data shape changed.
- Trigger: IR-003 Local Fix message from `/software_engineering_team/implementation_engineer`, 2026-10-17 (round 1: IR-002)
- Prior Review Round Reviewed: `CRR-001` (round 1, Fail, Local Fix)
- Latest Authoritative Round: `2`
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. Confirmed by the diff: startup migration plus new persisted fields and a new retired-prefix file; extended GraphQL, strict feed and agent tool contracts; allocation and per-Project dependency locks; three subsystems.

## Review Scope

- Changed implementation and behavior reviewed: the whole uncommitted worktree diff against `origin/personal@c600028072` (BEH-001–BEH-011).
- Files / areas reviewed:
  - Server: `projects/domain/{task-keys,task-dependencies,models,project-errors,task-execution-resources}.ts`; `projects/stores/{project-store,projects-layout}.ts`; `projects/services/{project-service,project-task-service,task-dependency-writes,project-task-views,task-references}.ts`; `projects/changes/project-change-messages.ts`; `api/graphql/types/project-tasks.ts`; `app-data-migrations/{app-data-migration-registry.ts,migrations/project-task-keys-v1/*}`; `agent-collaboration/{domain/agent-team-collaboration-llm-contract.ts,execution/task/{root-task-execution-lifecycle,task-execution-input,task-execution-resource-port}.ts}`; `agent-tools/project-tasks/{project-task-tool-contract,project-task-tool-manifest}.ts`; server docs.
  - Web: `types/project.ts`, `graphql/queries/projectTaskQueries.ts`, `stores/{projectTaskStore,taskWorkerTaskStore}.ts`, `composables/projects/{useProjectTaskDraft,useProjectTaskPage}.ts`, `utils/projects/{taskDependencies,taskPagePath}.ts`, the 5 new and 7 modified components, both pages, `docs/projects.md`.
  - Tests: the new and changed server and web tests, proportionately.
- Explicit exclusions: `generated/graphql.ts` beyond the ticket's fields (hand-applied; regeneration is a recorded follow-up); localization string values were spot-checked against the spec, not compared line by line; the untracked SDK `dist/` folders are build output, not part of the change.
- Executed by the reviewer: the ticket's new server unit tests (6 files, 89 tests) and new web specs (4 files, 25 tests) pass; one temporary probe test (deleted afterwards) confirmed CR-001.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001–REQ-022 at SR-003, including DEC-010–DEC-013 (key is the agent-facing Task ID; stored paths unchanged; delegation Project-only; "a deleted Task").
- Design-spec behavior map verified against the implementation: yes, for DS-001–DS-011.
- Design review report and round confirmed: ARCH-REV-003 Pass; REC-005 (refusal order) and REC-008 (unresolvable `depends_on` → `TASK_DEPENDENCY_INVALID`) are implemented and tested.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `ProjectTaskService.create` → `ProjectStore.createTask` → `allocateTaskKey` (catalog lock, `lastNumber+1`, `updatedAt` kept) → first `task.json` write; `updateTask` forces `taskKey: current.taskKey` | — |
| BEH-002 | Confirmed | `ProjectTaskKeysV1AppDataMigration` (frozen readers and prefix rule; Tasks first, `taskKeys` marker last; retry recognizes planned keys; conflict fails only that Project); registered after per-folder v1 with it as prerequisite | — |
| BEH-003 | Confirmed | `ProjectService.createProjectRecord` inside `store.createProject(check(existing, retired))`; `updateProject` keeps stored `taskKeys`; `deleteProject` appends to `retired-task-key-prefixes.json` under the catalog lock before unlinking `project.json` | — |
| BEH-004 | Confirmed (one defect, CR-001) | GraphQL create / update and tool create normalize and validate before any context step or write; `replace` holds the per-Project lock. Tool `update_task depends_on` skips duplicate collapsing (CR-001) | — |
| BEH-005 / 006 | Confirmed | `ProjectTaskRow` (key line, badge), `TaskKey`, `TaskKeyChip`, `TaskDependencyBadge`, `TaskDependenciesSection`, `ProjectTaskDetail`, `ProjectsPanelTaskDetail`; derivations in `utils/projects/taskDependencies.ts` | — |
| BEH-007 | Confirmed | `currentTasksOfTaskWorkers` adds `taskKey` (null for Temp) → GraphQL → `taskWorkerTaskStore` → `TaskWorkerTaskSummary` | — |
| BEH-008 | Confirmed | `deleteTask` → `TaskDependencyWrites.removeDeleted` (dependents' `updatedAt` kept via the store updater; republished; failure logged) | — |
| BEH-009 | Confirmed | `projectTaskSchema` and `projectTaskWire` carry `taskKey`, `dependsOnTaskIds` | — |
| BEH-010 | Confirmed | `TaskReferences.projectTask` (long ID exact, else lower-cased key via `findTaskByKey`) serves `resolveAssignment` and `depends_on`; Temp-first branch only in `updateTaskById`; lifecycle resolves first and passes `saved.taskId` inward; texts and results use the key or "a deleted Task" | — |
| BEH-011 | Confirmed | `taskPagePath` for every in-app link; `useProjectTaskPage` is the only resolver and `router.replace`s non-exact references to the key URL; detail context client and delete use the resolved `taskId` | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001/002 | BEH-001, REQ-001 | System | User or agent | New Task gets the next key | New task Save; `create_task` | Normal | DS-001 | Next number, never reused | Requirements SCN-001/002 | Supported Normal Scenario | Use |
| SCN-003 | BEH-002, REQ-004 | Operational | App upgrade | Released data keyed | First start | Normal | DS-006 | All valid Tasks keyed; no lockout | Requirements SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-003, REQ-002/003 | User | User | Rename, reuse a name, delete then reuse | Edit / New / Delete Project | Explicit Edge | DS-002, D-RETIRED | Prefix kept; suffix on collision; retired prefix reserved | Requirements SCN-004, AC-025 | Supported Explicit Edge Scenario | Use |
| SCN-005/006 | BEH-004, REQ-007 | User / Contract | User; API caller | Set valid dependencies; invalid ones rejected | New / Edit task; GraphQL | Normal / Explicit Edge | DS-001, DS-003 | Stored, validated, duplicates collapsed | Requirements SCN-005/006 | Supported Normal / Explicit Edge | Use |
| SCN-012 | BEH-004, BEH-010, REQ-020 (with REQ-007 rules) | Contract | Agent | Record "depends on" by key or long ID | `create_task` / `update_task depends_on` | Normal | DS-010 | Same rules as REQ-007, results show `dependsOn` keys | Requirements SCN-012, AC-024 | Supported Normal Scenario | Use (CR-001) |
| SCN-007–010, 013 | BEH-005–009, 011 | User | User | Board, Task page, tree, delete, key URLs | Projects UI | Normal | DS-004, DS-005, DS-007, DS-011 | As approved | Requirements, UI/UX spec | Supported Normal Scenario | Use |
| SCN-011 | BEH-010, REQ-018/019 | Contract | Agent | Refer to a Task by key | Task tools, `delegate_task` | Normal | DS-009 | Same outcomes as long IDs; texts show keys | Requirements SCN-011 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-001 | `update_task depends_on` stores duplicates | SCN-012; REQ-007 "Duplicates are collapsed", REQ-020 "with the REQ-007 rules" | Agent calls `update_task` naming one Task twice (repeated, another letter case, or key plus long ID; all are accepted input forms) | parser `taskDependsOn` trims only → `updateTaskById` → `TaskDependencyWrites.idsOf` (no collapse) → `replace` → `update` writes the list as given. Stored `dependsOnTaskIds` holds repeats; the ack and `list_project_tasks` show `dependsOn: ["autobyteus-1","autobyteus-1","autobyteus-1"]` | Code read; temporary probe: `depends_on: ["autobyteus-1","AutoByteus-1",<long id>]` → STORED three copies of one ID, ACK three keys. `create_task` with the same input collapses (via `forNewTask`), GraphQL update collapses (via `normalizeDependsOn`) | Promote | This ticket | Collapse the resolved IDs in the tool update path (e.g. `normalizeDependsOn` over `idsOf`'s result, or collapse inside `idsOf`), and pin it with a test |
| CAND-002 | Stale "display only" wording for the key | REQ-018, REQ-019, REQ-022 (key is the agent-facing ID and the URL form) | Reader of the module doc | `docs/modules/projects.md:150-151` says `taskId` stays the identity in "URLs … tools" and "the key is display only"; the next bullet and the code say the opposite. Same "Display only" comment on web `types/project.ts:64` | Grep | Promote | This ticket | Reword those lines (stored identity vs. agent-facing / URL ID). Cheap; bundled with CR-001 |
| CAND-003 | Delete cleanup is not under the per-Project dependency lock, so a concurrent dependency replace may keep a deleted ID | — | Needs a user delete and another client's dependency save in the same instant | Result would be a dangling ID, which readers ignore (REQ-014) | Design DS-004 accepts it; no supported concurrent workflow | Reject | — | Artificial timing; harmless by design |
| CAND-004 | A migration that failed for one Project, then a new Project taking its prefix, would make the retry conflict | MP-001 | Needs an I/O failure during migration | Not Reachable within operating assumptions (ARCH MP-001) | Design review MP-001 | Reject | — | — |
| CAND-005 | Picker: Enter while the list is closed adds the active option | REQ-011, UI/UX spec | User presses Enter after a choice | Matches the approved prototype (`1ff2edf` `TaskDependencyPicker.vue` has the same keydown handler); the spec says "Enter adds" | Prototype diff | Reject | — | Implementation matches the approved design; changing it would be a product decision. Noted under Residual Risks |
| CAND-006 | Copy chip shows "Copied" when the clipboard write fails | REQ-010, AC-013 | Clipboard unavailable | Spec line 235: "if the clipboard is unavailable, the key stays selectable and 'Copied' still confirms the action"; failure logged like `CopyButton` | Spec, `CopyButton.vue` | Reject | — | Matches spec |
| CAND-007 | Allocation writes `project.json` in the exact current shape, dropping obsolete link extras at the first Task create | Tolerant-reader / exact-writer policy (guideline; Principle 5) | Any Task create on a released file | Same as every existing Project save; extras are obsolete and unread | Handoff note, `projectFileContent` | Reject | — | Current-schema writer by design; not a compatibility obligation |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Feature / No Design Issue Found; owners extended. The three service-owned splits (`task-dependency-writes`, `project-task-views`, `task-references`) keep `ProjectTaskService` the Task boundary and its only caller | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Components ported from the prototype; strings, picker limits, order, loop greying, chip timing match spec / prototype | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001–DS-011 traced end to end in code | — |
| Ownership boundary preservation and clarity | Pass | Allocation only in `ProjectStore`; prefix only in `ProjectService`; resolution only in `ProjectTaskService` (via `TaskReferences`); lifecycle and manifest never parse keys | — |
| Off-spine concern clarity | Pass | Pure rules in `projects/domain/`; web derivations in `utils/projects/taskDependencies.ts` | — |
| Existing capability/subsystem reuse check | Pass | `withProjectsCatalog`, `withFilePathLock`, migration runner, publisher reused | — |
| Reusable owned structures check | Pass | One prefix rule, one dependency rule, one `taskPagePath`, one web derivation module | — |
| Shared-structure/data-model tightness check | Pass | `ProjectView` omits `taskKeys` in type and at runtime; tool acks carry one Task ID | — |
| Repeated coordination ownership check | Pass | Reference resolution in one class; dependency writes in one class | — |
| Empty indirection check | Pass | `ProjectTaskViews` and `TaskReferences` own real logic | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Splits follow existing responsibilities | — |
| Ownership-driven dependency check | Pass | Domain imports nothing from services or stores; migration imports current readers only for output validation; no runtime import of the migration folder | — |
| Authoritative Boundary Rule check | Pass | GraphQL and tools call `ProjectTaskService` only; `TaskDependencyWrites` / `TaskReferences` are used only inside it | — |
| File placement check | Pass | — | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `projectTask(reference)` vs `byId(taskId)`; Temp-first branch only in `updateTaskById`; port `resolveAssignment` returns explicit `taskId` / `taskReference` | — |
| Naming quality and naming-to-responsibility alignment check | Pass | `taskReference`, `taskKeys`, `dependsOnTaskIds` consistent | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Store and domain both have a `normalizeDependsOn`, with different meanings (tolerant reader vs. input rule); acceptable | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules | Pass | `uniqueTask`, unused imports removed | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Strong coverage of AC-001–AC-027. Round 2 adds the duplicate-collapse case for `create_task` and `update_task` (repeated key, other case, key plus long ID), which checks the stored list and `dependsOn` | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | — | — |
| API/E2E readiness for the next workflow stage | Pass | CR-001 resolved; all paths ready | — |

## Source File Size And Structure Audit

Effective non-empty lines (`grep -c .`).

| Source File | Before | After | `>500` Check | `>220` Delta Check | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `server/src/projects/services/project-task-service.ts` | 498 | 499 | Pass | Pass (+87/−86) | Pass | Pass | OK | — |
| `server/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | 446 | 446 | Pass | Pass | Pass | Pass | OK | — |
| `server/src/projects/stores/project-store.ts` | 212 | 274 | Pass | Pass (+83/−20) | Pass | Pass | OK | — |
| `server/src/projects/services/project-service.ts` | 251 | 251 | Pass | Pass | Pass | Pass | OK | — |
| `server/src/projects/domain/models.ts` | 167 | 192 | Pass | Pass | Pass | Pass | OK | — |
| `server/src/agent-tools/project-tasks/project-task-tool-contract.ts` | 163 | 181 | Pass | Pass | Pass | Pass | OK | — |
| `server/.../project-task-keys-v1-app-data-migration.ts` (new) | — | 159 | Pass | Pass | Pass | Pass | OK | — |
| `web/components/projects/TaskDependencyPicker.vue` (new) | — | 134 | Pass | Pass | Pass | Pass | OK | — |
| All other changed or new source files | ≤ 211 | ≤ 211 | Pass | Pass | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Long-ID inputs and URLs are approved behavior through one resolver to the stored identity |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Keys migrated; `dependsOnTaskIds` and the retired-prefix file used directly |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Current readers require `taskKeys` / `taskKey`; old shapes only in the frozen migration files |
| Approved transition mechanics match the reviewed design | Pass | Ordering, marker-last, re-read validation, retry recognition, per-Project failure, prerequisite, startup-only all as designed |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: new persisted fields and file, agent-facing ID change, key URLs. Server `docs/modules/projects.md`, `agent_team_execution.md`, `collaboration_model.md` and web `docs/projects.md` were updated; the stale "display only" wording is fixed (CR-002).
- Files or areas likely affected: delivery docs sync only.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | — |
| MP-002 | Confirmed | — |
| MP-003 | Confirmed | `readTaskAt` → null → "a deleted Task" (`namedTask`) |
| MP-004 | Confirmed | — |

No new or reclassified premise.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94
- Score calculation note: simple average; the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | Every spine traces cleanly from entry to feed / UI | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Allocation, prefix, resolution and dependency writes each have one owner; no bypass | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.3 | Explicit `taskId` / `taskReference`; split resolvers by subject | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.3 | Service splits are owned and under the guardrail | The service sits at 499 lines; the next addition needs another owned split | Keep future Task-service growth in owned files |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.2 | `ProjectView` stays tight; one rule module each | — | — |
| `6` | `Naming Quality and Local Readability` | 9.1 | Clear names; CR-002 wording fixed | Dense one-line expressions in a few places (existing house style) | — |
| `7` | `API/E2E Readiness` | 9.2 | Tests strong; CR-001 is pinned by a test; contracts ready | — | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.2 | All ACs behave as specified. CR-001 is fixed in `idsOf` for both tool paths and verified by the new test (reviewer rerun: 136 tests pass, typecheck passes) | — | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | Old shapes confined to frozen migration files | — | — |
| `10` | `Cleanup Completeness` | 9.4 | `uniqueTask` and unused imports removed | — | — |

## Findings

No open findings in round 2.

- CR-001: `Resolved` (IR-003). `TaskDependencyWrites.idsOf` returns `normalizeDependsOn(ids)` after resolution, which covers `create_task` and `update_task`. The new unit case checks one stored ID and one `dependsOn` key for `[key, key, "AutoByteus-1", longId]`.
- CR-002: `Resolved` (IR-003). `docs/modules/projects.md` "Key" bullet and the web `taskKey` comment now separate the stored identity from the agent-facing / URL ID.

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| — | None new from this review | — | — | — |

- Sent to: `None`. FU-002–FU-004 and the `generated/graphql.ts` regeneration are already recorded by the design and the implementation handoff.

## Classification

- N/A (Pass). Round 1 (CRR-001) was `Local Fix` for CR-001 and CR-002, both resolved.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (primary); informational pass notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- Picker keyboard (CAND-005): Enter while the option list is closed (for example right after a choice) adds the active option. This matches the approved prototype and spec wording. Product may want to look at it later; it is not a finding.
- `project-task-service.ts` is at 499 effective lines; any further Task-service growth needs another owned split.
- `generated/graphql.ts` was hand-edited for this ticket's fields; the regeneration follow-up remains.
- Server and web must ship together (required fields, strict feed, key URLs).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 2, targeted delta)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10; every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: CR-001 and CR-002 are resolved and verified. The package is ready for API/E2E, including AC-021 (isolated desktop instance) and the scripted-runtime tool journeys listed in the handoff.
