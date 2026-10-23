# Design Review Report — task-comments

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments/tickets/in-progress/task-comments/requirements-doc.md` (Approved, SR-013: SR-011 plus editorial alignment and DEC-025)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments/tickets/in-progress/task-comments/investigation-notes.md` (AF-001–AF-009; the "Part 2 Investigation" section is out of scope and was not reviewed)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments/tickets/in-progress/task-comments/solution-revision-record.md` (SR-001–SR-012)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments/tickets/in-progress/task-comments/design-spec.md` (SR-013, `Ready`; DS-003 and the work-text example now use bullets)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001, FU-002). No behavior-defining supplement (DEC-005).
- Relevant Solution Revision IDs: SR-011 (requirements basis), SR-012 (design), SR-013 (ARCH-REV-001 corrections)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments/tickets/in-progress/task-comments/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Revised `Architecture Design Complete` (SR-013, "Round 2" of the handoff) after ARCH-REV-001 Fail
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail — ARF-001, ARF-002)
- Latest Authoritative Round: 2
- Round 2 scope: recheck of ARF-001 and ARF-002 against the current requirements doc and design spec. Every other structural verdict keeps its round-1 evidence. SR-013 changed only the requirements text and the DS-003 work-text format, from `1.` numbering to `- ` bullets. That format change affects no ownership, boundary or file decision.
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments`, branch `codex/task-comments` at `786055f3d7` (no source changes). Read:
  - `project-task-service.ts`: `updateTask`, `updateTaskById`, `resolveAssignment`, `update()`;
  - `task-part-closure.ts`, `project-task-views.ts`, `project-task-search-service.ts` (exact tier, `itemsOf`, fingerprints);
  - `root-task-execution-lifecycle.ts` (both saved-Task delegation paths), `task-execution-input.ts` (`taskBodyLines`, both work-text builders), the port type;
  - web `useProjectTaskSearch.ts`;
  - `DESIGN.md` rule 9, `RELEASE.md` "Rollback", migration guideline "Rolling back after a migration".
  - Effective non-empty line counts: `project-task-service.ts` 474, `root-task-execution-lifecycle.ts` 462.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: about 25 files within existing owners. Contract changes: the agent tool (`add_comment`, `partsNotClosed`, list/search fields), GraphQL (field + mutation), the strict `/ws/projects` schema, and the delegated work text every task agent receives. One persisted field.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 2; ARF-001 and ARF-002 resolved in SR-013)
- Approved requirements / intended behavior understood: Yes. These come from REQ-001–014 and the user's later decisions: DEC-001 add only; DEC-006 no author; DEC-024 texts only for agents, with the `update_task` result unchanged; DEC-002 no notification.
- Relevant existing behavior and evidence confirmed: Yes.
  - `update()` is the single Project Task write body. It runs a locked read-modify-write of `task.json`, and DONE/CANCELLED goes through `closeAndWrite` and then the part cascade.
  - GraphQL `UpdateProjectTaskInput.description` is required, and there is no status mutation.
  - `ProjectTaskViews.projectTask` spreads the stored Task, so a model field flows into views without extra mapping.
  - The board and `search_project_tasks` share `ProjectTaskSearchService.search`, whose exact tier is description containment and whose meaning items are descriptions.
  - Both saved-Task delegation paths take `description` from `resolveAssignment` and render it through `taskBodyLines`.
- Scope guardrail confirmed: Yes. In scope: UC-001–004, 006, 007. Out of scope: edit/delete, notification (FU-002), meaning search of comments (FU-001), Temp tasks, board cards, Part 2. Preserved behavior and review authority as stated.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: N/A (no `Design Impact` findings).
- Remaining material ambiguity: none.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract / User | Pass (follows REQ-005, REQ-008) | Pass. AC-001 now uses `add_comment`, says the result is unchanged, and makes the combined call one write; SCN-001 trigger fixed | Pass (DS-001, DS-002) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass (DS-004) | Confirmed | — |
| BEH-004 | Contract / User | Pass | Pass. DEC-025, REQ-008, UC-004, SCN-009, AC-016 and Out Of Scope record the board's search matching comments | Pass (DS-005) | Confirmed | — |
| BEH-006 | Contract | Pass | Pass (`TaskPartClosure` logs and skips today) | Pass (DS-006) | Confirmed | — |
| BEH-007 | Contract | Pass (follows REQ-012) | Pass. AC-010 and DEC-012 now give texts as bullets with no IDs or times (DEC-024); design DS-003 and its example match | Pass (DS-003) | Confirmed | — |
| — (REQ-013) | Operational | Pass | Pass. Data Continuity names the rollback consequence under RELEASE.md (AP-001) | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `follow-ups.md` (FU-001, FU-002) | Pass | Pass | Pass | Pass | Pass (unsent; sent by the Solution Designer when the ticket leaves the team) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature; size, reuse, boundary and shared-structure triggers considered | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`; existing owners verified in code | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No refactor; comment rules in a new pure domain file | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | `project-task-service.ts` has 474 effective lines, about 26 lines of headroom. The planned additions fit if kept compact: patch field and check, Temp refusal, `addComment`, comments in `resolveAssignment`, ack field. `root-task-execution-lifecycle.ts` has 462, enough room | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Agent add | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | App add | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Delegated work text | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Live thread (return/event) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Agent list/search | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | `partsNotClosed` | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProjectTaskService` | Pass | Pass | Pass | Pass | Resolver, manifest and port users never touch the store; IDs and times only from `appendComment` under the lock |
| `TaskExecutionResourcePort` | Pass | Pass | Pass | Pass | Collaboration gets comment texts through the port result only |
| Search service | Pass | Pass | Pass | Pass | Exact-tier rule stays in one owner |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `domain/task-comments.ts` | Pass | Pass | Pass | Pass | → `project-errors.ts` only |
| Collaboration lifecycle / input builder | Pass | Pass | Pass | Pass | No Project file reads |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `update_task add_comment` | Pass | Pass | Pass (`task_id`) | Low | Pass |
| GraphQL `addProjectTaskComment({projectId, taskId, text})` | Pass | Pass | Pass | Low | Pass. A dedicated mutation is justified: `description` is required on update (AF-003) |
| GraphQL `ProjectTask.comments`, `ProjectTaskComment` | Pass | Pass | Pass | Low | Pass |
| `/ws/projects` `+comments` | Pass | Pass | Pass | Low | Pass |
| `list_project_tasks` `comments: string[]`; `search_project_tasks` `commentCount`; `update_task` `partsNotClosed` | Pass | Pass | Pass | Low | Pass |
| Port `resolveAssignment` `+comments: string[]` | Pass | Pass | Pass | Low | Pass |
| `TASK_COMMENT_INVALID` | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Serialize appends | Pass | Pass | N/A | Pass | `ProjectStore.updateTask` per-Task lock; also makes a combined status + comment call one write |
| Live updates | Pass | Pass | N/A | Pass | Feed field |
| Work text | Pass | Pass | N/A | Pass | `taskBodyLines` serves both paths |
| Exact search | Pass | Pass | N/A | Pass | One rule for the tool and the board (needs recording, ARF-002) |
| Comment rules | Pass | Pass | Pass | Pass | New pure domain file keeps the service under the size limit |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `server/src/projects` | Pass | Pass | Pass | Pass | — |
| `server/src/api/graphql/types` | Pass | Pass | Pass | Pass | — |
| `server/src/agent-tools/project-tasks` | Pass | Pass | Pass | Pass | — |
| `server/src/agent-collaboration/execution/task` | Pass | Pass | Pass | Pass | — |
| `autobyteus-web` Projects | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Comment text and append rules | Pass | Pass | Pass | Pass | Shared by GraphQL and tools |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `comments[] {id, createdAt, text}` | Pass | Pass | Pass | N/A | Pass | No author or edit fields |
| Agent `comments: string[]` / port `comments: string[]` | Pass | Pass | Pass | N/A | Pass | Order = age |
| `TaskAcknowledgementView.partsNotClosedReferences?` | Pass | Pass | Pass | N/A | Pass | Present only when non-empty |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `domain/task-comments.ts` (new) | Pass | Pass | N/A | Pass | — |
| `project-task-service.ts` | Pass | Pass | Pass | Pass | 474 effective lines; stays ≤ 500 by the design's guidance |
| `task-part-closure.ts` | Pass | Pass | N/A | Pass | `{closed, notClosed}` |
| `project-task-search-service.ts` | Pass | Pass | N/A | Pass | Exact tier only; `itemsOf` unchanged, so no reindex |
| `task-execution-input.ts`, port, lifecycle | Pass | Pass | N/A | Pass | — |
| Web `TaskCommentsSection.vue` + two views, store, i18n | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `projects/domain/task-comments.ts` | Pass | Pass | Low | Pass | — |
| `web/components/projects/TaskCommentsSection.vue` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Additive change | Pass (none) | N/A | Pass | Pass | Dead code in touched files is left to implementation, with evidence |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Versions / old data | No | Pass | Pass | DESIGN.md rule 9; tolerant reader |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `task.json` `+comments` | `Directly Usable — No Migration` | Pass (309 real Tasks without the field; absence = none) | Pass | N/A | Pass | The rollback consequence is consistent with RELEASE.md and is now named in the requirements' Data Continuity (SR-013) |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server domain → store → service → closure → search → GraphQL/feed → tools → port/work text → web → docs | Pass | Pass (port fakes named) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `task.json`, tool call, list, search, work text, parent close, tool description, app card and strings | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

### `AP-001` — After a rollback, an older build drops `comments` from Tasks it rewrites

- Related approved requirement or established contract: REQ-013; requirements "Data Continuity: Acceptable: none"; RELEASE.md "Rollback"; migration guideline "Rolling back after a migration".
- Relevant behavior ID(s): REQ-013 row
- Initiating basis kind: `Operational`
- Independent product-supported initiating trigger or applicable governing contract: RELEASE.md "Rollback": revert the merge on `personal` and cut a new release. The rule "A release may rename or drop stored fields without keeping … old-format writers for older builds" governs this.
- Support evidence: RELEASE.md lines 186–203.
- Forward path: the rollback release runs with the pre-change exact writer → the next ordinary save of a Task writes the pre-change key set → its `comments` are gone.
- Lifecycle preconditions and material consequence: comments on Tasks the reverted build rewrites are lost.
- Reachability: `Reachable` (supported operational action)
- Review consequence / proportionate response: no machinery. RELEASE.md explicitly forbids rollback compatibility, and the design states it correctly. Round 2: the requirements' Data Continuity now names this accepted consequence (resolved under ARF-001).

## Unresolved Approved-Behavior Or Current-State Gaps

None (ARF-001 and ARF-002 resolved in SR-013; see `architecture-review-revision-record.md` ARCH-REV-002).

## Review Decision

`Pass` (round 2).

## Findings

None open. The round-1 findings are kept below for reference; both are `Resolved` in ARCH-REV-002.

### ARF-001 — Stale acceptance criteria and decision texts contradict the approved requirements (Resolved, SR-013)

- Type: `Requirement Gap`
- Severity: Blocking (validation basis). The fix is small.
- Protected: REQ-005, REQ-008, REQ-012, DEC-024 (the user's decision, 2026-10-22), REQ-013
- Scope status: `Requirement Gap — User Approval Required` only if the Solution Designer judges a text changes intent. As far as I can tell, every correction aligns text with decisions the user already made.
- Changes approved behavior: `No` (expected)
- Affected: BEH-001, BEH-007, REQ-013 data continuity
- Evidence (requirements-doc.md at SR-011):
  1. **AC-001** uses `comment="Decision: use X"` (REQ-005 / DEC-003: `add_comment`). It also says "the result gives the new ID", but REQ-008 and DEC-024 say "The `update_task` result is unchanged". The design follows REQ-008 (example: no `addedComment`).
  2. **AC-010** expects "the comments with number and time", and **DEC-012** says "with number and time". REQ-012 and DEC-024 say "as their texts" (times are "completely not useful for agents"). The design renders `1. <text>` (numbered, no time).
  3. **External Contracts And Dependencies** still lists "Collaboration delivery: a comment message to the worker", "Meaning search: comment items", and "New or changed tool; caller identity" (withdrawn: DEC-002, DEC-010, DEC-006). **Architecture Phase Input** still defers author/caller identity, sender kind, inactive-root delivery and message text. **AC-012** says "as the spec", but there is no spec (DEC-005); the strings are in design-spec "Concrete Examples". **ASM-001** is still "Open (design)"; the design decides that comments travel in the `projectTasks` list and the feed.
  4. **SCN-001** trigger reads `update_task comment` (should be `add_comment`).
  5. **Data Continuity** says "Acceptable: none". Under RELEASE.md "Rollback", a reverted build drops `comments` from Tasks it rewrites (AP-001). The design states this correctly; the requirements should name it as the accepted consequence, as task-part-of's requirements did.
- Material premise: AP-001 (item 5 only).
- Required update: correct these texts in `requirements-doc.md` to match REQ-005 / REQ-008 / REQ-012 / DEC-024 and RELEASE.md. For AC-010, say whether the work text numbers the comments (`1.`, `2.`) without times, as the design shows. Record the correction in a new SR entry. No design-spec change expected beyond the SR reference.
- Why proportionate: API/E2E and code review verify against the ACs. As written, a correct implementation of REQ-008 / REQ-012 would fail AC-001 and AC-010.
- Recommended recipient: Solution Designer

- Round 2 verification: every item is corrected in `requirements-doc.md` (AC-001, AC-010, DEC-012, AC-012, SCN-001, ASM-001, External Contracts, Architecture Phase Input, Data Continuity). The work text now uses bullets with no numbering; `design-spec.md` DS-003 and the work-text example match. A search for the stale phrases finds none left.

### ARF-002 — The board's search behavior change is not in the approved requirements (Resolved, SR-013)

- Round 2 verification: DEC-025 records the decision, its rationale, its owner (Solution Designer, user informed on 2026-10-22, no objection) and that the user can still change it. REQ-008, BEH-004, UC-004, the new SCN-009 and AC-016, the Out Of Scope wording and External Contracts all reflect it, and design-spec Key Tradeoffs cites it. Whether "user informed" is enough is the Solution Designer's call under the requirements' review authority. The basis is now recorded and coherent.

- Type: `Requirement Gap`
- Severity: Blocking until recorded. The design choice itself is sound.
- Protected: Scope Guardrail ("Comments on the board cards (the board stays as it is …)"); REQ-008 covers `search_project_tasks` only.
- Scope status: `Requirement Gap — User Approval Required` as the Solution Designer judges. SR-012 records it as "Solution Designer decision, user informed".
- Changes approved behavior: `Yes`. The board's search box will now return Tasks whose comments, not their visible card text, contain the query.
- Affected: the board's search (`useProjectTaskSearch` → `searchProjectTasks` → `ProjectTaskSearchService.search`, AF-007).
- Evidence: one exact tier serves both the tool and the board (`project-task-search-service.ts` line 80). The requirements doc at SR-011 never mentions the board search. The decision appears only in solution-revision-record SR-012.
- Required update: add the decision to the requirements with its approval status: a DEC, the in-scope/preserved wording for the board search, and an AC so validation covers it. Keeping one rule is the right technical answer; splitting the rule for the board would add a policy branch for no approved need.
- Why proportionate: a user-visible behavior must be in the approved basis that downstream roles validate.
- Recommended recipient: Solution Designer

### Non-blocking implementation notes (not findings)

1. Validate `add_comment` (shape in the parser; `normalizeCommentText`) and the Temp-task refusal before `update()`, so a combined DONE + blank comment never reaches `closeAndWrite` (AC-001 "nothing written").
2. Count `addComment` as a change in both `TASK_PATCH_REQUIRED` checks: the parser and `updateTaskById` (line 149). Update the error texts.
3. `project-task-service.ts` has 474 effective lines. Keep the additions compact; if they would cross 500, move a cohesive piece (for example the port's `resolveAssignment` read) rather than squeezing lines.
4. `ProjectTaskViews.projectTask` spreads the stored Task, so `comments` reach GraphQL, the feed and the search views without a mapping change. The strict feed schema still needs the field (AF-004).
5. The exact tier also needs a comment-only match to sort sensibly. It already orders by meaning score and then `updatedAt`, and a comment bumps `updatedAt` (DEC-008); no change needed.

## Classification

N/A (Pass). Round 1 was `Requirement Gap` (ARF-001, ARF-002), now resolved.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (per handoff rules); informational notice to `/software_engineering_team/solution_designer`.

## Residual Risks

- Long threads grow `list_project_tasks` results and the app's `projectTasks` payload. This is accepted in the design; `autobyteus-260` and FU-001 cover adjacent work.
- The `update_task` description text affects agent behavior; keep it to the one line.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002)
- Material-Premise Gate: `Pass` (AP-001 Reachable; no machinery; now named in the requirements)
- Notes: the design is ready for implementation. The five implementation notes above are guidance, not conditions.
