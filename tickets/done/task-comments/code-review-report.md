# Code Review Report — task-comments

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/task-comments/requirements-doc.md` (Approved, SR-013)
- Investigation Notes Reviewed As Context: `investigation-notes.md`, through the design spec and design review (AF-001–AF-009; the Part 2 section belongs to another Task)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (to SR-013)
- Design Spec Reviewed As Context: `tickets/in-progress/task-comments/design-spec.md` (SR-013, Ready)
- Supplemental Task Artifacts Reviewed As Context: none behavior-defining (DEC-005); `follow-ups.md` (FU-001, FU-002); style reference: the task-part-of Parts card
- Relevant Solution Revision IDs: SR-011 (approval), SR-012 (design), SR-013
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass; five implementation notes)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001 (Fail, resolved), ARCH-REV-002 (Pass)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `tickets/in-progress/task-comments/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: implementation ready for source review, from `/software_engineering_team/implementation_engineer` (Medium / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage / execution / API/E2E / delivery records: N/A (implementation review)

Reviewed code: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments`, branch `codex/task-comments`, `786055f3d7..e014c349b8`: server `52035832a6` and web `e014c349b8`. Ticket artifacts are in `3ceec06fb6`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes` (High)
- Classification evidence or correction required: none. Every change sits inside an existing owner, with no new owner or subsystem. The change does alter material contracts:
  - the `update_task` parameter and result, and the list / search fields;
  - a GraphQL field and mutation;
  - the strict `/ws/projects` schema;
  - the delegated work text.

  It also adds one persisted field, with no migration.

## Review Scope

- Changed implementation and behavior reviewed: BEH-001 (agent and app add), BEH-002, BEH-004, BEH-006, BEH-007, and REQ-013 (existing data).
- Files / areas reviewed:
  - Server: every changed `src` file, in full in the diff: the domain, store, service, part closure, search, GraphQL, feed, tool contract and manifest, port, work-text builder and lifecycle. I also read `assertOwner`, and confirmed that board search takes only IDs from the server (`projectTaskSearchQueries.ts`: `matches { taskId match }`).
  - Web: every changed source file.
  - Tests: the titles and key cases of the new server and web suites.
- Explicit exclusions:
  - Server E2E and the isolated desktop instance (AC-013), which belong to API/E2E.
  - I reran no recorded check: the code each one exercises is unchanged since it ran (IMP-01 to IMP-07 on `e014c349b8`).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes.
  - Comments can only be added; each has a Task-local number and the server time; no author is recorded (DEC-001, 006, 016).
  - Adding one changes nothing but `updatedAt` (REQ-002).
  - Agents see texts only; the `update_task` result is unchanged (DEC-024).
  - The exact search tier matches comment text, for agents and the board alike (DEC-025); meaning search is unchanged.
  - Delegated work lists the comments after the description (REQ-012).
  - `partsNotClosed` appears only when some parts were not closed (REQ-011).
  - No notification to runs (DEC-002).
- Design-spec behavior map verified against the implementation: Yes (table below).
- Design review report and round confirmed: ARCH-REV-002 Pass; all five notes are applied in code (Structural checks).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered |
| --- | --- | --- | --- |
| BEH-001 (agent) | Confirmed | The parser's `taskComment` rejects a non-string (`PROJECT_TOOL_ARGUMENT_INVALID`) and refuses blank text via `normalizeCommentText` (`TASK_COMMENT_INVALID`). `add_comment` counts toward `TASK_PATCH_REQUIRED`. The manifest passes it as `addComment` to `updateTaskById`, which runs in this order: (1) `TASK_PATCH_REQUIRED` check including `addComment`, (2) `normalizeCommentText`, (3) Temp-task refusal `TASK_COMMENT_INVALID`, (4) reference resolution (unknown → `TASK_NOT_FOUND`), (5) `update()`. Inside the locked updater, `appendComment(current, text, now)` runs, and `meaningful` includes `addComment`. The ack is unchanged. | — |
| BEH-001 (app) | Confirmed | `TaskCommentsSection.add` → `projectTaskStore.addComment` → `addProjectTaskComment({projectId, taskId, text})` → `ProjectTaskService.addComment` → `update(…, {addComment: normalizeCommentText(text)}, noContextChange)`. `assertOwner` refuses an unknown Project or Task. The returned Task replaces the listed one. | — |
| BEH-002 | Confirmed | GraphQL `ProjectTask.comments` (`[ProjectTaskComment!]!`, mapped in `toGraphqlTask`). The strict feed schema and `projectTaskWire` carry `comments`. The card sits after Description and before Parts on the page and in the tab (`v-if="projectTask"`, so Project Tasks only). | — |
| BEH-004 | Confirmed | Manifest: `comments` (texts) only when any; search `commentCount` only when > 0. Search service: the exact filter covers `[description, ...comment texts]`, while `itemsOf` (meaning items) is unchanged. The board query takes `taskId` / `match` only. | — |
| BEH-006 | Confirmed | `TaskPartClosure.closeOpenParts` → `{closed, notClosed}` (the failed part is logged and pushed to `notClosed`). `update()` returns `parts` (`NO_PART_CLOSURE` when nothing cascades). The ack carries `partsNotClosedReferences` only when non-empty, and the tool shows `partsNotClosed`. | — |
| BEH-007 | Confirmed | `resolveAssignment` returns `comments` (texts in ID order). Both lifecycle paths (new copy and existing copy) pass them to `taskBodyLines`, which emits a "Comments:" block of `- ` bullets only when non-empty. Described work starts from `comments = []`. | — |
| REQ-013 | Confirmed | `normalizeComments` keeps well-formed entries sorted by `id`; an absent or invalid field reads as `[]`. `taskFileContent` always writes `comments`; `create` writes `comments: []`. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001; REQ-001–005, 010; AC-001, 002 | Contract | Project Task Manager | Record a decision without rewriting the description | `update_task add_comment` | Normal | DS-001 as traced | One comment appended; combined call one write; invalid refused with nothing written | Requirements (approved) | Supported Normal Scenario | Use |
| SCN-002 / SCN-003 | BEH-001, 002; REQ-006, 007, 014; AC-003, 004, 012 | User | User | Add and read updates in the app | Task page / tab | Normal | DS-002, DS-004 | Thread oldest first; live in other views | Requirements | Supported Normal Scenario | Use |
| SCN-005 / SCN-009 | BEH-004; REQ-008; AC-005, 016 | Contract / User | Agent; user on the board | Find and read comments | list / search; board search | Normal | DS-005 | Texts, count, exact matches by comment | Requirements, DEC-025 | Supported Normal Scenario | Use |
| SCN-006 | BEH-006; REQ-011; AC-009 | Contract | Agent | Close a parent whose part has damaged run data | `update_task status` | Explicit Edge | DS-006 | `partsNotClosed` names it | DESIGN.md rule 7; autobyteus-187 | Supported Explicit Edge Scenario | Use |
| SCN-007 | BEH-007; REQ-012; AC-010 | Contract | Project Task Manager | Delegate a Task with comments | `delegate_task task_id` | Normal | DS-003 | Work text has the "Comments:" block | Requirements | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Order of validation in `updateTaskById` (handoff point 1) | SCN-001; AC-001 "nothing written (also not the status)"; ARCH note 1 | `update_task status=DONE add_comment="  "`, on a Temp task or an unknown Task | Blank → refused by the parser, and again by the service before any branch. Temp → refused before `adHocTasks.update`. Unknown → `references.projectTask` throws before `update()`. Nothing reaches `closeAndWrite`. | Code; test "status and a comment in one call are one write; a blank comment, a Temp task or an unknown Task writes nothing, not even the status" | Reject (correct as built) | — | No defect. |
| C-02 | The append and `updatedAt` inside the locked updater share one `now` (handoff point 2) | REQ-001, 002; AC-002, QR-001 | An agent and the user comment at once | Each append reads `current` under the Task's file lock, so the next ID is computed from the latest list and the two get consecutive numbers. One timestamp means the comment's `createdAt` equals the Task's `updatedAt` for that write. | Code; concurrency test | Reject (correct as built) | — | Matches the design ("IDs and times only from `appendComment` under the store lock"). |
| C-03 | Row layout: the meta line "#n · relative time" above the full text, not "#1 · time · text" on one line (handoff point 3) | REQ-007 (number, time, full text); DEC-005 (no separate spec; the existing card language) | Reading a thread with multi-line comments | All three elements are shown; the full local time is in a `<time datetime>` with a hover title; the text wraps with `whitespace-pre-wrap`. The design's App row is shape guidance, not a normative spec. | Component; IMP-07 screenshots; spec test | Reject (not a defect) | — | A fair reading; the user sees it in the real-app check (DEC-005). |
| C-04 | `buildTaskWorkText.comments` is optional while `buildExistingCopyTaskMessage.comments` is required | Engineering contract: Interfaces Follow Ownership (Principle 10) | — | Described work and remote packets have no comments; the existing-copy message always serves a saved Task. The optional field defaults to no block. | Code | Reject | — | Proportionate; no ambiguity in meaning. |
| C-05 | A multi-line comment in the work text: only its first line follows the `- ` bullet | REQ-012 | Delegating a Task whose comment has several lines | The lines stay in order, and the block remains readable for an agent. No requirement asks for indented continuation lines. | Code | Reject | — | Not a defect against any approved requirement. |
| C-06 | Relative time is computed at render and does not tick on an open page | REQ-007 ("time") | Leaving a page open | Same behavior as the existing `notificationTime` utility; the exact time is in the title. | Code | Reject | — | No requirement. |
| C-07 | `generated/graphql.ts` committed with only the comment hunks | Engineering contract: generated client types match the schema | Codegen | IMP-06: 25 comment lines identical to a real codegen run; the remaining drift predates this change | IMP-06 evidence | Reject for this ticket | — | Already tracked from task-part-of (FU-CR-002, folded into autobyteus-164). No new follow-up. |
| C-08 | A tampered `task.json` with duplicate comment IDs | — | Manual file edit | — | — | Reject | — | Manual tampering is outside scope by default (Principle 6). |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | No refactor; rules in the new `domain/task-comments.ts`; service at 486 effective lines | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No separate spec (DEC-005). The card uses the Parts-card classes (`rounded-xl`, slate-200, 12 px label). The strings match the design's en / zh-CN list. | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001–DS-006 traced in code as designed (Basis table) | — |
| Ownership boundary preservation and clarity | Pass | Only `ProjectTaskService` writes comments; the resolver and manifest call the service; collaboration receives the texts through the port result only | — |
| Off-spine concern clarity | Pass | The pure comment rules serve the service; agent result shaping lives in the manifest | — |
| Existing capability/subsystem reuse check | Pass | Per-Task store lock, shared `update()` body, publisher, `taskBodyLines`, the `notificationTime` utilities, the card style | — |
| Reusable owned structures check | Pass | One `normalizeCommentText` for the tools, the service and GraphQL; one `appendComment` | — |
| Shared-structure/data-model tightness check | Pass | `ProjectTaskComment {id, createdAt, text}` only. Agents get texts. `partsNotClosedReferences` appears only when non-empty. `PartClosureResult` replaces the bare list. | — |
| Repeated coordination ownership check | Pass | Text validation lives in one domain function (the parser reuses it) | — |
| Empty indirection check | Pass | `addComment` in the service owns normalization and the update call; the resolver is a thin facade | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | — | — |
| Ownership-driven dependency check | Pass | `task-comments.ts` → `models` (type) and `project-errors`; the contract → domain rule; no cycles | — |
| Authoritative Boundary Rule check | Pass | No caller uses the service and the store together | — |
| File placement check | Pass | `projects/domain/task-comments.ts`; `components/projects/TaskCommentsSection.vue` | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | The dedicated mutation is justified (`description` is required on update, AF-003). `add_comment` is a string on `update_task` only. ARCH note 2 (both patch-required checks) is applied, with updated texts. | — |
| Naming quality and naming-to-responsibility alignment check | Pass | `comments`, `add_comment`, `addComment`, `partsNotClosed`, `TASK_COMMENT_INVALID`, `NO_PART_CLOSURE` | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | Single round | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | The old `closedParts: string[]` return is fully replaced by `parts` | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | The server suites map to AC-001, 002, 003 (service), 005, 008, 009, 010, 011 and 016 (search); the web spec covers AC-003, 004 and 012 | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | The shared port fake returns `comments` | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Shape updates only | — |
| API/E2E readiness for the next workflow stage | Pass | The handoff lists coverage hints (tool E2E, AC-009 with damaged run data, AC-010 for both copy paths, GraphQL blank refusal, feed) and AC-013 | — |

## Source File Size And Structure Audit

| Source File | Before (base) | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `server/src/projects/services/project-task-service.ts` | 474 | 486 | Pass | Pass | Pass | Pass | — | — |
| `server/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | 462 | 462 | Pass | Pass | Pass | Pass | — | — |
| `server/src/api/graphql/types/project-tasks.ts` | 219 | 243 | Pass | Pass | Pass | Pass | — | — |
| `server/src/agent-tools/project-tasks/project-task-tool-contract.ts` / `-manifest.ts` | 241 / 157 | 251 / 164 | Pass | Pass | Pass | Pass | — | — |
| `server/src/projects/search/project-task-search-service.ts` | 240 | 241 | Pass | Pass | Pass | Pass | — | — |
| `server/src/projects/stores/project-store.ts`, `domain/models.ts`, `task-part-closure.ts`, `task-execution-input.ts`, port, change messages, errors | 275 / 204 / 30 / 81 / 118 / 85 / 35 | 279 / 222 / 35 / 86 / 119 / 87 / 36 | Pass | Pass | Pass | Pass | — | — |
| `server/src/projects/domain/task-comments.ts` (new) | 0 | 16 | Pass | Pass | Pass | Pass | — | — |
| `web/components/projects/TaskCommentsSection.vue` (new) | 0 | 75 | Pass | Pass | Pass | Pass | — | — |
| `web` views, store, types, GraphQL documents, en / zh-CN | ≤ 241 | ≤ 241 | Pass | Pass | Pass | Pass | — | — |
| `web/generated/graphql.ts` | generated | — | N/A | N/A | — | — | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No mixed-version code (DESIGN.md rule 9) |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Directly Usable — No Migration`; tolerant reader; written at the next save |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A beyond the reader and writer |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (done)
- Why: new stored field, tool parameter and results, GraphQL mutation, work-text block, UI card
- Files: `autobyteus-server-ts/docs/modules/projects.md`, `docs/modules/agent_tools_mcp_server.md`, `autobyteus-web/docs/projects.md`. Delivery owns the final docs sync.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| AP-001 (rollback drops `comments`) | Confirmed | No rollback machinery added; the writer is the ordinary exact writer |

New premises: None.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.5
- Overall score (`/100`): 95
- Score calculation note: simple average of the ten categories; not the decision rule.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | All six spines are visible in code as designed | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One writer (the service); IDs and times are set only under the lock; the port carries texts | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | One-line tool parameter; fields appear only when non-empty; a justified dedicated mutation | `buildTaskWorkText.comments` is optional while the existing-copy message requires it (C-04) | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Pure rules file; the service grows by +12 effective lines | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.6 | Tight comment shape; `PartClosureResult` | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Clear names | Dense one-line updater expressions, in the file's existing style | — |
| 7 | API/E2E Readiness | 9.4 | Coverage hints complete | AC-009 (damaged run data) and AC-010 (both paths, live) need E2E | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Validation order, atomic combined write, concurrency, meaning index untouched, live feed | The tab view was not rendered (component test only) | API/E2E / AC-013 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | None added | — | — |
| 10 | Cleanup Completeness | 9.5 | Replaced return removed; no unused imports (typecheck) | — | — |

## Findings

None.

## Follow-ups

Findings outside this ticket go in the ticket's `follow-ups.md`.

- Follow-ups this review added: None. The stale `generated/graphql.ts` (C-07) is already tracked from task-part-of (FU-CR-002, folded into autobyteus-164).

## Classification

N/A (Pass).

## Recommended Recipient

- Owner of the classified outcome and the recipient `get_handoff_rules` returned for it: `/software_engineering_team/api_e2e_engineer` (primary pass rule); informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- The `update_task` description gained one line; the tool text shapes agent behavior.
- Long threads enlarge `list_project_tasks` and the app's `projectTasks` payload (accepted in the design; `autobyteus-260`, FU-001).
- The tab view and zh-CN were not rendered yet; AC-013 on an isolated desktop instance is left to API/E2E.
- After a rollback, an older build drops comments from Tasks it rewrites (AP-001; accepted under RELEASE.md).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (AP-001 confirmed; no new premises)
- Score Summary: 9.5 / 10 (95 / 100); every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: the three focus points (C-01 validation order, C-02 one `now` under the lock, C-03 row layout) are correct as built.
