# Code Review Report — mention-delegation-dismissal

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/requirements-doc.md` (SR-003, Approved 2026-10-06)
- Investigation Notes Reviewed As Context: `.../investigation-notes.md` (E-01..E-36)
- Solution Revision Record Reviewed As Context: `.../solution-revision-record.md` (SR-001..SR-005)
- Design Spec Reviewed As Context: `.../design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: None exist (`N/A — not applicable`); `handoff-architecture-design-complete.md` read as routing context
- Relevant Solution Revision IDs: SR-003 (requirements), SR-005 (design)
- Design Review Report Reviewed As Context: `.../design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record Reviewed As Context: `.../architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `.../implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `.../implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `.../code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Initial implementation handoff IR-001 (Large / High), worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal`, branch `codex/mention-delegation-dismissal`, commit `a2a7b37bc` on base `3c8e49ad5`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Relevant API/E2E Revision IDs: N/A
- Delivery Revision Record / IDs: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Project guidance applied: repo `DESIGN.md`, `TESTING.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2 (through the design spec). No project-specific design conflict found.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. Confirmed by the diff: 34 production source files across six server subsystems plus presentation contracts. Two public tool contracts change, one of them breaking. There is a new persisted root `<appData>/ad-hoc-tasks/`, a widened Task port, and a new run-history → Projects dependency.

## Review Scope

- Changed implementation and behavior reviewed: `git diff 3c8e49ad5..a2a7b37bc`. This covers `@` resolution without admission, the mention note, described-delegation ad-hoc Task creation, the `task_id` result, ad-hoc storage, `updateTaskById` with the shared DONE closure, the two-mode `create_or_update_task`, automatic tool exposure, delete-owner cleanup, LLM contract text, docs, and the changed tests.
- Files / areas reviewed:
  - `projects/{domain,stores,services}` and the composition.
  - `agent-collaboration/{collaborators/collaborator-admission, execution/task/{task-agent-resource-port,root-task-execution-lifecycle,root-task-dispatch,task-delegation-command,root-task-agent-resource-scope}, domain/agent-team-collaboration-llm-contract}`.
  - The three roots, their collaborators owners and deliveries, and the three stream handlers.
  - `agent-tools/project-tasks/{contract,manifest}`, `agent-execution/shared/runtime-agent-tool-exposure`, and `task-delegation-result-contract`.
  - The three delete owners and `general-process-run-supervisor` (port binding).
  - Presentation-contracts note, server/web docs, the new `tests/unit/projects/ad-hoc-tasks.test.ts`, the architecture boundary test, and the root harness changes.
- Reviewer verification run:
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` → exit 0.
  - Focused suites → 135 files / 970 tests passed. They cover unit projects, agent-collaboration, agent-tools, agent-execution/shared, agent-team/org/standalone, the stream handler, the run-history delete owners, the architecture boundary, the task-delegation lifecycle integration, standalone root integration, and the projects boundary e2e.
- Explicit exclusions:
  - Live / real-runtime validation of AC-001..AC-015 (API/E2E stage).
  - The stale live probe `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` (explicitly handed to API/E2E).
  - Baseline full-suite failures (72 files, verified by the implementation engineer against `3c8e49ad5`; not rerun here).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. The requirement is that `@` adds nothing and steers to `delegate_task`. Unowned described delegation creates a text-only Project-less Task and returns `task_id`. Update by `task_id` alone works on both Task kinds, and DONE is identical for both. The tool is automatic wherever `delegate_task` is. Cleanup happens on permanent run delete. The Projects migration gate is not inherited. Linked delegation and Project DONE are preserved.
- Design-spec behavior map verified against the implementation: Yes. All of DS-001..DS-006 were traced in code (table below).
- Design review report and round confirmed: ARCH-REV-002, Pass. Both non-blocking implementation notes were followed: `task_id` is decided by the join variant (`root-task-dispatch.ts`), and the ad-hoc-ID `TASK_NOT_FOUND` case is tested.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None
- Remaining material ambiguity, if any: None

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Stream handlers (`agent-collaboration/agent-team/agent-org-stream-handler.ts`) and the standalone host path `postToHost` call root `resolveCollaboratorMentions` (inside the gate) → `*Collaborators.resolveMentions` → `CollaboratorAdmission.resolveMentions`. That validates via `admissible()` and gives the address from the in-run entry else `catalogAddressMap`. No `addEntries`, allocation or publish. No remaining `admitCollaboratorMentions`/`admitMentions` references in the repo. | — |
| BEH-002 | Confirmed | `collaborator-mention-note.ts`: new `NOTE_GUIDANCE` (conditional DONE wording per R-1). `SAVED_NOTE_GUIDANCES` still parsed and never composed. dist rebuilt. | — |
| BEH-003 | Confirmed | `delegate()` unowned described branch → `{role:"assigned", assignedBy, adHocTask}`. `dispatchTaskCopy` links after `plan()` and before activation → `ProjectTaskService.linkAgentRun` → `linkAdHocTask` (`AdHocTaskStore.create` text-only + `linkAssigned` under serialization). `task_id` is set only when `join.adHocTask`. Validation and plan failures happen before the link, so no Task is created. | — |
| BEH-004 | Confirmed | Parser: `hasTask` selects the allowed keys `[task_id, description, status]` vs `[project_id, description, status]`. Create still forbids status and requires description. Manifest → `updateTaskById` / `createTask`. `updateTaskById` reads ad-hoc directly, else `uniqueTask` → unchanged `updateTask`. | — |
| BEH-005 | Confirmed | Shared `closeAndWrite(location, write)` = `closeTask` → write → `release(closedByHostRoot)`. Used by both the Project `updateTask` and the ad-hoc branch. Restart fencing is via `TaskAgentResourceStore.list()` enumerating `ad-hoc-tasks/` (tested). | — |
| BEH-006 | Confirmed | `automaticCollaborationToolNames` adds `CREATE_OR_UPDATE_TASK_TOOL_NAME`. `buildRuntimeAgentToolExposure` dedups and derives `enabledProjectTaskToolNames` for all runtimes. | — |
| BEH-007 | Confirmed | Owned sender → `{role:"delegated"}`, no `task_id`. Tested, including sub-work of an ad-hoc copy. | — |
| BEH-008 | Confirmed | `ad-hoc-tasks/` sits outside `ProjectsLayout.root`, so `listTasks`/`findTask` never see it (tested). Delete owners call `deleteAdHocTasksHostedBy(root)` after `success`, with root kinds `agent`/`agent_team`/`agent_org` matching `createAgent/Team/OrgRootExecutionIdentity`. | — |
| BEH-009 | Confirmed | `bringInAt`/`ensureNow`/`CollaboratorAdmission.ensure` are unchanged. The restore paths are untouched. | — |
| REQ-012 | Confirmed | The ad-hoc create, read and DONE paths never call `ProjectStore`. A test with `projects.json` present passes. | — |
| AC-014 | Confirmed | `resolveAssignment` and the linked `uniqueTask` stay Project-only. The linked result is exactly `{target_agent_run_id}`. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001..003, REQ-001..004, REQ-013 | User | User → focused agent | Get help from X | `@X` in a live-run composer; the agent calls `delegate_task` | Normal | DS-001 then DS-002 (above) | No collaborator row; one delegated copy with an ad-hoc Task; `task_id` returned | Requirements SCN-001; code | Supported Normal Scenario | Use |
| SCN-002 | BEH-004/005, REQ-005..007 | User | User via agent | Remove the finished helper | Agent `create_or_update_task({task_id, status: DONE})` | Normal | DS-003 → DS-005 | Copy stopped and hidden; history kept | Requirements SCN-002; code | Supported Normal Scenario | Use |
| SCN-003 | REQ-006 | System | Server | Closed stays closed | Reopen / restart | Normal | `load()` enumerates both roots → `closedAgentRunsIn` | Row hidden; copy fenced | Requirements; test | Supported Normal Scenario | Use |
| SCN-005 | REQ-009 | Operational | User | Delete an old run | Permanent delete in history (GraphQL → delete owner) | Normal | DS-006 | That root's ad-hoc Tasks removed | Requirements; code | Supported Normal Scenario | Use |
| SCN-006 | REQ-010 | System | Task-owned agent | Delegate sub-work | `delegate_task` by description | Normal | `delegated` join | No new Task | Requirements; code | Supported Normal Scenario | Use |
| SCN-007 | REQ-011 | Compatibility | User | Reopen an old run | Open a stored run with collaborators | Normal | Unchanged restore | Works as before | Requirements; untouched code | Supported Normal Scenario | Use |
| SCN-X1 | Runtime launch contract | System | Runtime | Copy activation fails after the link | Runtime start failure during `delegate_task` | Explicit Edge | `dispatchTaskCopy` catch → `markFailed`; result `{target_agent_run_id: null, message}` | Ad-hoc Task kept with a failed entry until the run is deleted | Design DS-002 and Key Tradeoffs (approved) | Supported Explicit Edge Scenario | Use (confirm only) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Described delegation now fails `TASK_AGENT_RESOURCES_UNAVAILABLE` when no Task port is bound | SCN-001 | None in production | Production roots always receive the port | `general-process-run-supervisor.ts:91,116` requires `taskAgentResources`; studio and standalone host compose it | Reject | Only test harnesses lacked a port (now bound). This replaces a test-only fallback that would leave copies unclosable. Correct. |
| C-02 | Orphan `task.json` on a crash between `AdHocTaskStore.create` and `linkAssigned` | — | Interrupted execution | — | DESIGN.md / design-principles: interrupted execution is out of scope by default | Reject | Recorded by design as a risk; no machinery required |
| C-03 | A post-link activation failure leaves an ad-hoc Task with a `failed` entry and no returned `task_id` | SCN-X1 | Runtime start failure | `markFailed`; null result | Design DS-002 / Key Tradeoffs (approved); same recorded-failure semantics as linked mode | Reject | An approved design tradeoff with no regression versus baseline (an unowned failed copy was never closable). Kept as a residual risk. |
| C-04 | `AdHocTaskStore.read` turns read errors into `null`, then falls back to the Projects lookup (`TASK_NOT_FOUND`) | — | Corrupt or unreadable file (manual tampering) | — | No supported product action produces it | Reject | Not reachable from a supported scenario |
| C-05 | Duplicate-identity error code `TASK_CONTEXT_INVALID` in `AdHocTaskStore.create` | — | UUID collision | — | `randomUUID` ID; DESIGN.md rule 2 | Reject | Not reachable |
| C-06 | Collaborators owners gained `resolveMentions` and lost the public `ensure`, which the design file map did not list | Design ownership map / DS-001 | Engineering contract | Roots → owner (holds `port()`, `admission`, queue) → `CollaboratorAdmission.resolveMentions` | Code; owners already sat between the root and admission for `ensure` | Reject (as finding) | This follows the existing ownership chain and removes dead public API. It is consistent with the design intent, so it is not a Design Impact. |
| C-07 | Test harnesses reach the private `collaborators` field through a cast to create an Offline collaborator | SCN-007 / agent bring-in state | Test setup | Reproduces the state of an agent's first `send_message_to` to a catalog address | Harness diffs | Reject (as finding) | The state is real in production (bring-in / stored runs), and only the entry is test-only. Non-blocking recommendation below. |
| C-08 | `agent-run-history-catalog-service.ts` is at 499 effective lines (baseline 490) | Size guardrail | Engineering contract | — | Line count | Reject (as finding) | Under the 500 hard limit with a +11 delta. Recorded as size pressure. |
| C-09 | Stale live probe `cross-scope-agent-mentions-live-probe.mjs` still asserts collaborator rows after `@` | Design Removal Plan; AC-001 | Engineering contract | — | Handoff Known Risks; design removal plan | Promote to API/E2E required item (not a source finding) | It is real-browser/real-model executable coverage, which the API/E2E stage owns. Explicitly handed over. It must be rewritten before API/E2E can pass AC-001. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Missing Invariant closed in `delegate()`; one closure authority (`closeAndWrite`); update split by identity shape | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None exist | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001..DS-006 traced end to end | — |
| Ownership boundary preservation and clarity | Pass | `ProjectTaskService` owns both Task kinds and the port; `TaskAgentResourceService` stays the single resource authority; runtime sees only the neutral port | — |
| Off-spine concern clarity | Pass | `AdHocTaskStore`/`AdHocTasksLayout` serve `ProjectTaskService` only | — |
| Existing capability/subsystem reuse check | Pass | Reuses `plan`-equivalent address logic, `closeTask`/release, the resource view, segment helpers (exported, not duplicated), and `automaticCollaborationToolNames` | — |
| Reusable owned structures check | Pass | `TaskLocation` replaces `TaskAgentResourceLocation` in place; `sameDefinitionAs` extracted and shared by `plan` and `resolveMentions`; `unindex` shared by `swap` and `forget` | — |
| Shared-structure/data-model tightness check | Pass | `AdHocTask` is its own record (no projectId/contextFiles/host). The port assigned variant is a discriminated `taskId` xor `adHocTask`. Ack `projectId: string \| null` has one meaning. | — |
| Repeated coordination ownership check | Pass | DONE sequencing has one owner (`closeAndWrite`); the "never throws" cleanup guarantee lives once in `deleteAdHocTasksHostedBy` | — |
| Empty indirection check | Pass | `*Collaborators.resolveMentions` adds queue serialization and port binding; not pass-through only | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | New files are small and single-purpose | — |
| Ownership-driven dependency check | Pass | Only the three delete owners import `projects/services/project-task-service.js`, enforced by the narrowed architecture test. `projects/` does not import run-history. | — |
| Authoritative Boundary Rule check | Pass | Tools, delete owners and runtime enter through `ProjectTaskService`/port only; no store bypass | — |
| File placement check | Pass | `projects/{domain,stores}/ad-hoc-*` beside their Project counterparts | — |
| Flat-vs-over-split layout judgment | Pass | Flat placement is justified by the design | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `updateTaskById` (unique ID) vs `updateTask` (Project+Task); `deleteAdHocTasksHostedBy(hostRoot)`; `DelegateTaskResult.task_id` with one meaning | — |
| Naming quality and naming-to-responsibility alignment check | Pass | `resolveMentions` / `resolveCollaboratorMentions` match the no-write behavior. `ProjectTaskService` name drift is an accepted residual (design review). | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | `dispatchTaskCopy` became simpler (optional `join`/`resources` branches removed) | — |
| Dead/obsolete code cleanup completeness in changed scope | Pass | `admit*` methods, the public `ensure` on owners, and the update-mode `project_id` were removed; no stale references remain | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | `ad-hoc-tasks.test.ts` maps tests to AC-003/004/005/007/008/010/013/014/015; dispatch tests cover `task_id` by join variant | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `InMemoryTaskAgentResources` reused in harnesses; `bringIn` helper centralizes the cast (see recommendation) | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | `@`-admission assertions replaced. The stale live probe was handed to API/E2E (C-09). | — |
| API/E2E readiness for the next workflow stage | Pass | Handoff lists scenarios per AC; the probe rewrite is required at API/E2E | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `run-history/services/agent-run-history-catalog-service.ts` | 499 | Pass (at limit; baseline 490) | Pass (+11) | Pass | Pass | Size pressure (pre-existing) | None now; avoid further growth |
| `agent-team-execution/domain/root-team-run.ts` | 454 | Pass | Pass (6) | Pass | Pass | — | — |
| `standalone-agent-run-root/domain/standalone-agent-run-root.ts` | 398 | Pass | Pass (12) | Pass | Pass | — | — |
| `projects/services/project-task-service.ts` | 312 | Pass | Pass (111) | Pass | Pass | — | — |
| `agent-collaboration/collaborators/collaborator-admission.ts` | 207 | Pass | Pass (47) | Pass | Pass | — | — |
| `projects/services/task-agent-resource-service.ts` | 201 | Pass | Pass (42) | Pass | Pass | — | — |
| `projects/stores/ad-hoc-task-store.ts` (new) | 60 | Pass | Pass | Pass | Pass | — | — |
| All other changed source files | ≤ 373 | Pass | Pass (≤ 40) | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No "ignore project_id" fallback; no `@` admission flag |
| No legacy old-behavior retention in changed scope | Pass | Saved-note guidance parsing is display of saved history, approved by BEH-002's preserved column; never composed |
| Dead/obsolete code cleanup completeness in changed scope | Pass | See above |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected` / additive root; resource file format unchanged |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | The ad-hoc-then-Projects lookup covers two subjects, not two versions |
| Approved transition mechanics match the reviewed design | Pass | No migration (N/A) |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None in source. The stale live probe (C-09) is an API/E2E-owned executable artifact and is tracked there.

## Docs-Impact Verdict

- Docs impact: `Yes` (already applied in this change)
- Why: Two tool contracts changed, `@` behavior changed, there is a new storage root, and automatic tool exposure changed.
- Files or areas likely affected:
  - Server `docs/modules/{agent_communication,projects,agent_tools,agent_tools_mcp_server,standalone_agent_run_root,agent_team_execution,prompt_engineering}.md`.
  - Web `docs/{chat,projects,agent_teams}.md`.
  - Spot-checked `projects.md`: accurate, and it also corrects the E-27 "context bytes" wording to paths. Delivery should verify final sync.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | `Not Reachable`. `resolveAssignment` and the linked `uniqueTask` stay Project-only (tested: ad-hoc ID → `TASK_NOT_FOUND`). Ad-hoc `delegated`/`broughtIn` sub-work links with the same `target.root`. `adHocTaskIdsHostedBy` relies on the single-host-root invariant, which holds by construction. |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3
- Overall score (`/100`): 93
- Score calculation note: simple average for trend visibility only; the decision follows the findings and mandatory checks.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | All six spines are implemented as designed, and both `@` entries are switched | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | One Task authority, one resource authority, a neutral port, and a narrow, enforced delete-owner dependency | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | Update split by identity shape; the discriminated link variant; `task_id` with one meaning | The breaking `create_or_update_task` change for external callers is approved but needs coordination | Coordinate the external skill update |
| `4` | `Separation of Concerns and File Placement` | 9.2 | Small new files placed beside their counterparts | `agent-run-history-catalog-service.ts` sits at 499 effective lines | Keep further changes out of that file or split it in a later cleanup |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | `AdHocTask` tight; `TaskLocation` replaces the old type in place; `sameDefinitionAs` and `unindex` extracted | — | — |
| `6` | `Naming Quality and Local Readability` | 9.0 | `resolve*` naming matches behavior; comments are clear | `ProjectTaskService` / `projects/` now also own Project-less Tasks (accepted residual) | Consider a rename in a later cleanup |
| `7` | `API/E2E Readiness` | 9.1 | Clear per-AC scenarios; focused suites green | The stale live probe must be rewritten at API/E2E before AC-001 can be validated | API/E2E to rewrite and run the probe |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.4 | Link-before-resources kept; `task_id` by join variant; DONE shared; restart enumeration; root identities match the delete kinds; no Projects gate on the ad-hoc paths | Live runtime behavior not yet exercised (API/E2E) | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean cut on `project_id` update and `@` admission | — | — |
| `10` | `Cleanup Completeness` | 9.3 | Obsolete methods, branches and tests removed; docs synced | The live probe is still stale (handed off) | — |

## Findings

None. No candidate was promoted to an implementation finding (see the Candidate Gate).

Non-blocking recommendations:
- R-CR-1 (tests): The Team, Org and native fixture harnesses reach the private `collaborators` field through a cast to create an Offline collaborator. This is acceptable for now because the production state is real and the cast is centralized in `bringIn` helpers. A future cleanup could drive it through the real trigger (an agent `send_message_to` to a catalog address) or a stored-tree fixture.
- R-CR-2 (size): `agent-run-history-catalog-service.ts` is at 499 effective lines. Avoid adding to it; split it in a later cleanup if it grows.

## Classification

N/A — Pass.

## Recommended Recipient

`/api_e2e_engineer` (primary pass handoff), with an informational notice to `/implementation_engineer`.

## Residual Risks

- Breaking `create_or_update_task` update mode for external callers that send `project_id` with `task_id` (the agent-repository Project Task Manager skill). This needs a coordinated update.
- Copies owned by different Tasks can no longer message each other by run ID (approved consequence).
- An orphan ad-hoc `task.json` is left on a crash between create and link (interrupted execution; out of scope).
- A post-link activation failure leaves an ad-hoc Task with a `failed` entry and no returned `task_id`. It is removed with its run (approved tradeoff).
- The stale live probe `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` must be rewritten by API/E2E for AC-001.
- UI copy ("Bring into this run", "Couldn't add …") still describes adding. Out of scope; a product-copy follow-up candidate.
- `pnpm -C autobyteus-server-ts typecheck` fails at baseline with TS6059 (pre-existing discrepancy). The source typecheck passes via `tsconfig.build.json`.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (MP-001 Confirmed `Not Reachable`)
- Score Summary: 9.3 / 10 (93 / 100); every category ≥ 9.0
- Failure Origin (when applicable): N/A
- Recommended Recipient (when applicable): `/api_e2e_engineer`
- Notes: Classification Large / High preserved. API/E2E must cover AC-001..AC-015 live, including rewriting the stale `@` live probe and running `task-closure-tree-probe.mjs`, `projects-feature-probe.mjs` and the env-gated `task-closure-root-visibility.e2e.test.ts`.
