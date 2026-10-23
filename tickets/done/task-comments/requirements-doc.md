# Requirements Document — Task comments

## Document Status

- Status: `Approved` (SR-013: editorial alignment for ARCH-REV-001 ARF-001; DEC-025 recorded for ARF-002)
- Current solution revision ID: `SR-013`
- Package identifier: `task-comments`
- Request / ticket: Project Task `autobyteus-259`, delegated 2026-10-21, with the extra direction of the same day (the word "comment", a Jira-like thread, one tool-contract change together with `autobyteus-187`).
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Requirements owner: Solution Designer
- Date: 2026-10-21
- Approved by and reference (SR-011): `User`, in the Solution Designer's conversation on 2026-10-21/22. The decisions are quoted in DEC-001 to DEC-024 and the SR-002 to SR-010 entries. The final go, after the `update_task` contract was shown with `add_comment` and the conditional `partsNotClosed`: "Okay, cool. I agree. Look good. Now let's now we're good. It's working on it now". DEC-004 is read from that agreement. DEC-005 (no design pass; the existing Task-page style) is decided by the Solution Designer within the user's direction for speed and simplicity, the user informed in the same conversation.
- Exact approved requirements baseline: this document at `SR-013`. SR-013 aligns stale text with the user's decisions (no intended-behavior change) and records DEC-025 (board search), decided by the Solution Designer with the user informed on 2026-10-22.
- Behavior-defining supplements: none. The UI follows the existing Task-page design language (step-1 and step-2 specs in `autobyteus-web-design`, `tickets/done/task-keys-and-dependencies/` and `tickets/done/task-part-of/`); no separate spec (DEC-005).
- Scope of this ticket (the user, 2026-10-22): Part 1 (comments) only; Part 2 ("a part of a parent can be delegated to the parent's copy …") moves to its own Task.
- Done when (the Task text as extended 2026-10-21, verbatim; its Part 2 clause no longer applies here): "The user has chosen the design; an agent (and the user in the app) can add a comment to a Task without rewriting the description; the comment shows in the app and in list/search results; a running worker is told about it as the user decides; a part of a parent can be delegated to the parent's copy with its full description and a visible link; tests; finalized on personal. Release as the user decides."
- Earlier Done when (before Part 2): "The user has chosen the design; an agent (and the user in the app) can add a note to a Task without rewriting the description; the note shows in the app and in the list/search results; a running worker is told about it as the user decides; tests; finalized on personal. Release as the user decides." ("note" reads "comment", per the user.)

## Problem And Desired Outcome

- Problem: `update_task` replaces a Task's whole description. To add one fact (a decision, a new direction, "dispatched with this direction"), the Project Task Manager resends every earlier line: autobyteus-233 three times, and 245, 205, 229, 234. That costs tokens and risks losing or changing text in the brief the team works from. What was added when, and by whom, is mixed into the text. A worker that is already running never learns of the change unless someone messages it.
- Affected actors: the user (app); the Project Task Manager and other agents with Task tools; task agents (workers).
- Desired outcome (a simple first version, the user 2026-10-21): a Project Task has a comment thread under its description, each comment with an ID and time. Comments can only be added (no edit, no delete). Agents add comments with `update_task add_comment` and the user adds them in the app, without touching the description. The thread shows in the app and in `list_project_tasks`, and search finds a Task by the exact words of its comments. Telling a running worker is a follow-up (FU-002), and so is searching comments by meaning (FU-001).
- Observable success: adding a comment never changes the description; the comment appears with its ID and time in the app and the tool results; search finds a Task by a comment's exact words.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract / User | SCN-001, SCN-002 | No current supported behavior: no comments; updates are made by replacing the description | A comment is appended to a Project Task by an agent tool (DEC-003) or by the user on the Task page | `update_task description` still replaces the description | INV BEH-001 |
| BEH-002 | User | SCN-003 | Task page has no thread | The thread shows under the description, oldest first, each with its number and time | Every other Task page element | INV BEH-002 |
| BEH-003 | System | — | Nothing reaches a running worker after dispatch | Unchanged in this ticket (DEC-002: follow-up FU-002) | As today | INV BEH-003 |
| BEH-004 | Contract / User | SCN-005, SCN-009 | List shows descriptions; search (`search_project_tasks` and the board's search box, one server rule) matches descriptions | List shows each Task's comment texts; `search_project_tasks` shows the comment count; both `search_project_tasks` and the board's search find Tasks whose comments contain the query text | Every other field; meaning search; board lanes and order | INV BEH-004; AF-007 |
| BEH-005 | System | — | Meaning search sees descriptions only, cut at 512 tokens | Unchanged in this ticket (DEC-010: comments by meaning in FU-001) | Description search unchanged | Measured, INV |
| BEH-006 | Contract | SCN-006 | A part that fails to close is only logged | Per DEC-004: `update_task` names the parts it could not close | `closedParts` | INV BEH-006 |
| BEH-007 | Contract | SCN-007 | Delegation sends the description and context files | The work a task agent receives also contains the Task's comments | Everything else in the work packet | DEC-012 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | Add updates and read the history of a Task | Thread with composer on the Task page | Simple, Jira-like |
| Project Task Manager | Record decisions and directions without rewriting | A comment tool; the thread in list results; the worker told | Configured tools only |
| Workers | Know the latest direction; record progress | Receive new comments; may comment when configured | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | An agent adds a comment to a Project Task | SCN-001 |
| UC-002 | The user adds a comment on the Task page | SCN-002 |
| UC-003 | The user reads a Task's thread (page and the right-panel tab) | SCN-003 |
| UC-004 | Agents read the thread and find Tasks by comments (list, search); the board's search finds them too | SCN-005, SCN-009 |
| UC-006 | `update_task` names the parts it could not close (per DEC-004) | SCN-006 |
| UC-007 | A delegated task agent receives the Task's comments with its work | SCN-007 |

### Out Of Scope

- Editing or deleting comments (later, if missed: IDs and stored data already allow it); replies, reactions, mentions.
- Part 2 of the Task text (delegating a part to the team working on its parent): its own Task (DEC-022).
- Comments on Temp tasks (Tasks with no Project).
- Telling a running worker, or anyone else, about a new comment (the user, 2026-10-21: a possible follow-up, FU-002).
- Searching comments by meaning (FU-001, together with long descriptions).
- Appending to the description in place (rejected, DEC-011).
- Attachments on comments (context files stay as they are).
- Comments on the board cards: cards stay as they are. The board's search box does change: it also finds Tasks by comment text (DEC-025).
- Meaning search's cut of long descriptions (a follow-up, FU-001).

### Non-Goals

- None.

### Preserved Behavior Boundary

- `update_task`, `create_task` and every other tool behave as today, except `update_task`'s added result field (DEC-004).
- Descriptions, keys, dependencies, parts, statuses, assignment and closure rules unchanged.
- Existing Tasks: no comments, no data change (REQ-013).

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Rationale | Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A Project Task has a comment thread: comments in the order they were added, each with an ID (its number within the Task: 1, 2, 3, …; never reused), the time it was added (set by the server, shown in the app) and its text. No author is recorded (DEC-006). Comments can only be added: no edit, no delete (DEC-001). | BEH-001 | Must | The user's Jira model, kept simple | DEC-001, DEC-006, DEC-016 |
| REQ-002 | Adding a comment never changes the description or any other Task field except its last-change time (`updatedAt`), and never changes another Task or an earlier comment. | BEH-001 | Must | "without touching the description" | DEC-008 |
| REQ-003 | Withdrawn (SR-004): no author is recorded. | — | — | The user, 2026-10-21 | DEC-006 |
| REQ-004 | A comment's text is trimmed and must not be empty; otherwise it is refused with no change. | BEH-001 | Must | Same rule as a description | DEC-013 |
| REQ-005 | Agents add a comment with `update_task`'s new optional `add_comment` parameter (text), naming the Task by a Project Task's key (any letter case) or long ID. Each call with `add_comment` appends one new comment; calling it again adds another. `add_comment` alone is a valid update, and may be combined with the other fields in one call. A comment on a Temp task, an unknown Task, or blank text is refused, and nothing in that call is written. | BEH-001 | Must | UC-001 | DEC-003, DEC-007 |
| REQ-006 | The user adds comments on the Task page and in the right-panel tab's Task view: one text box under the thread and an add action, in the Task page's existing style (DEC-005). | BEH-001 | Must | "the user in the app" | DEC-005 |
| REQ-007 | The Task page and the tab's Task view show the thread under the description, oldest first, each comment with its number, time and full text, in a card in the Task page's existing style (DEC-005). Open views update live when a comment is added. | BEH-002 | Must | UC-003 | DEC-005 |
| REQ-008 | Agent-facing results carry only what an agent uses (DEC-024): `list_project_tasks` shows each Task's comments as a list of their texts, oldest first (no IDs, no times; no field when there are none). `search_project_tasks` shows `commentCount` (absent when 0). The exact search, shared by `search_project_tasks` and the board's search box, finds a Task when its description or one of its comments contains the query text (case-insensitive) (DEC-025). Meaning search is unchanged (descriptions only). The `update_task` result is unchanged: a successful call means the comment was added. | BEH-004 | Must | "visible in list and search"; tokens; one search rule | DEC-009, DEC-010, DEC-023, DEC-024, DEC-025 |
| REQ-009 | Withdrawn (SR-002): telling the running worker is a follow-up (FU-002). Adding a comment sends nothing to any run. | — | — | The user, 2026-10-21 | DEC-002 |
| REQ-010 | No new tool: commenting is available to exactly the agents whose definition already selects `update_task`. | BEH-001 | Must | The user's rule; simplest setup | DEC-003 |
| REQ-011 | When setting a parent to DONE or CANCELLED leaves some of its open parts unclosed, the `update_task` result lists them by key in `partsNotClosed`, next to `closedParts`; the field appears only in that case. | BEH-006 | Must | `autobyteus-187` | DEC-004 |
| REQ-012 | The work a task agent receives when a Project Task is delegated to it (a new task agent or an existing one) contains the Task's comments after the description, oldest first, as their texts. | BEH-007 | Must | Comments carry directions; a new worker must see them | DEC-012, DEC-024 |
| REQ-013 | Existing Tasks have no comments and need no data conversion. No mixed-version handling (the user's standing rule). | — | Must | Compatibility | DEC-015 |
| REQ-014 | All new strings exist in en and zh-CN. | BEH-002 | Must | — | DEC-005 |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-004, REQ-005, REQ-008 | SCN-001 | `update_task task_id="autobyteus-42" add_comment="Decision: use X"` (also `AutoByteus-42` and the long ID); then a second call with another `add_comment`; then one call with `status=DONE` and `add_comment` | Each call appends one comment with the next stored ID (1, 2, 3) and the server time; two calls → two comments, in order; description unchanged; the combined call sets the status and appends the comment in one write; the `update_task` result is unchanged (no comment field) | Blank `add_comment`, Temp task or unknown Task → refused, nothing written (also not the status of a combined call) | Server unit + tool E2E |
| AC-002 | REQ-001 | SCN-001 | Concurrent comments on one Task (an agent and the user at once) | Both kept, with distinct consecutive IDs | — | Server unit |
| AC-003 | REQ-006, REQ-007 | SCN-002, SCN-003 | The user posts a comment on the Task page | It shows under the description with its number and time; other open views update live | Empty text cannot be posted | Web unit; probe; isolated instance |
| AC-004 | REQ-007 | SCN-003 | A Task with three comments, opened on the page and in the tab | Oldest first, number, time, full text | No comments: the design's empty state | Web unit; probe |
| AC-005 | REQ-008 | SCN-005 | `list_project_tasks`; `search_project_tasks` for words that appear only in a comment | List shows the thread; search returns the Task (an exact match) with its comment count | — | Server unit + tool E2E |
| AC-006 | REQ-009 | — | Withdrawn (SR-002) | Adding a comment delivers nothing to any run (no message, no wake) | — | Server unit |
| AC-008 | REQ-010 | — | An agent without `update_task` | It has no way to comment; no new tool appears in any agent's tool list | — | Server unit (exposure) |
| AC-009 | REQ-011 | SCN-006 | Parent closed; one part's close fails | `closedParts` lists the closed ones; the new field lists the failed one by key | All closed → the field is absent | Server unit |
| AC-010 | REQ-012 | SCN-007 | `delegate_task` of a Project Task with two comments, to a new task agent and to an existing one | The work text contains the description, then a "Comments:" block listing the comment texts oldest first as bullets (no IDs, no times) | No comments → work text as today (no block) | Server unit + E2E |
| AC-016 | REQ-008 | SCN-009 | On the board, search for words that appear only in a Task's comment | That Task is shown as a match in its lane, as for a description match | Clearing the search restores the board as today | Web unit; probe |
| AC-011 | REQ-013 | — | Existing data | Tasks read with no comments; files unchanged until edited | — | Server unit; isolated instance |
| AC-012 | REQ-014 | — | en / zh-CN | Every new string exists in both catalogs | — | Web unit |
| AC-013 | REQ-001–014 | All | Isolated Electron instance with test data | The journeys work in the real desktop app, with evidence | — | Isolated desktop instance (TESTING.md) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | Project Task Manager | Record a decision or new direction | `update_task add_comment` | A Project Task | Add comment | Appended | Invalid refused | Supported Normal | The Task's examples (233, 245, …) | REQ-001–005; AC-001, AC-002 |
| SCN-002 | User | User | Add an update in the app | Task page / tab | A Project Task | Type, post | Appended | Empty not posted | Supported Normal (proposed) | Done-when "the user in the app" | REQ-006; AC-003 |
| SCN-003 | User | User | Read what changed | Task page / tab | Task with comments | Read | Thread oldest first | None: empty state | Supported Normal | Direction | REQ-007; AC-004 |
| SCN-004 | — | — | Withdrawn (SR-002; FU-002) | — | — | — | — | — | — | The user 2026-10-21 | — |
| SCN-005 | Contract | Agent | See and find comments | List / search | — | — | Thread; search by comment | Meaning not ready | Supported Normal | Direction | REQ-008; AC-005 |
| SCN-006 | Contract | Agent | Close a parent | `update_task status` | Parent with parts | Close | Unclosed parts named | — | Supported Explicit Edge (damaged run data, DESIGN.md rule 7) | autobyteus-187 | REQ-011; AC-009 |
| SCN-009 | User | User | Find a Task by something said in a comment | Board search box | Tasks with comments | Type words | Matching Tasks shown | No match: the existing empty state | Supported Normal | DEC-025 | REQ-008; AC-016 |
| SCN-007 | Contract | Project Task Manager | Delegate a Task that has comments | `delegate_task task_id` | Task with comments | Delegate | Worker sees the comments | — | Supported Normal | Comments carry directions | REQ-012; AC-010 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement: none (DEC-005); existing Task-page language.
- Design language: step-1 and step-2 Task page specs in `/Users/normy/autobyteus_org/autobyteus-web-design` (`tickets/done/task-keys-and-dependencies/`, `tickets/done/task-part-of/`).
- Product decisions that need the user: none.
- Required screens and states (for the design): thread with 0 / some / many comments; long comments; composer (empty, typing, posting, error); live arrival; the tab (compact); en / zh-CN.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-001 | Integrity | Concurrent comments on one Task (agent and user) are all kept, none overwritten | Server unit |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes`, Project Task storage gains comments.
- Preserve: everything; no conversion of existing Tasks.
- Acceptable: after a rollback (RELEASE.md "Rollback"), an older build ignores `comments` and drops them from any Task it rewrites (an ordinary writer change; nothing is engineered for rollback, data migration guideline "Rolling back after a migration"). No other loss.
- Constraints: never test on real data.

## External Contracts And Dependencies

| Contract | Required Behavior | Authority | Risk |
| --- | --- | --- | --- |
| Agent tool `update_task` (native and MCP) | `add_comment` parameter; `partsNotClosed`; list / search fields | `agent-tools/project-tasks/*` | Agent behavior from the tool text |
| GraphQL / `/ws/projects` | Comments in the Task read; `addProjectTaskComment` mutation | `api/graphql/types/project-tasks.ts`, `project-change-messages.ts` | — |
| Delegated work text | Comments after the description | `task-execution-input.ts`, `TaskExecutionResourcePort.resolveAssignment` | — |
| Exact search (shared by `search_project_tasks` and the board) | Also matches comment text (DEC-025) | `project-task-search-service.ts` | — |

## Supplemental Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `follow-ups.md` | Follow-ups | Open |

## Assumptions

| ID | Assumption | Validation | Status |
| --- | --- | --- | --- |
| ASM-001 | The Project's full Task list (with comments) stays small enough to hold in the app | 309 Tasks in 6 Projects today; comments add text only | Accepted (design keeps the existing whole-list model) |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Can comments be edited or deleted? | Correcting mistakes vs simplicity | Add only; edit; delete | The user first chose add + edit (SR-005). Asked again on 2026-10-22, the Solution Designer recommended add-only: one parameter, no edit UI or "edited" marker, no quiet rewrites without an author; a correction is a new comment; IDs keep edit possible later. The user: "i also think so, no need for update". | User | Decided: add only |
| DEC-002 | Is the running worker told automatically? | "Fewer manual steps" vs scope | Always; never; the writer chooses | The Solution Designer recommended always. The user (2026-10-21): "it's a possible follow up … I don't want to make the scope really big in these tickets, and currently we also have no idea whether it's really going to give us a lot of benefits." Not in this ticket; FU-002. | User | Decided: follow-up |
| DEC-003 | Tool contract | Simplicity | A new tool; parameters on `update_task` | The user chose `update_task` ("Yeah, please"), with one parameter `add_comment` once editing was dropped (DEC-001). | User | Decided: `update_task add_comment` |
| DEC-004 | Include `autobyteus-187` now? | One tool-contract change | Now; later | Recommended. The user agreed with the shown `update_task` contract, which includes `partsNotClosed` (keys) only when closing a parent leaves parts open: "I agree. Look good." | User | Decided: included |
| DEC-005 | A Product UI/UX design step? | New visible surface (now only a list and one text box) | Design step; existing style | The user left it open and asked to proceed ("now we're good. It's working on it now"). Decided: no separate design step. The thread follows the Task page's existing card language (like Parts / Dependencies), with strings in en and zh-CN. The user sees it in the real-app check and can ask for changes. | Solution Designer (user informed 2026-10-22) | Decided |
| DEC-006 | Record who wrote a comment? | Telling the user's words from an agent's vs simplicity | Nested author with kind; a plain author name; none | The Solution Designer recommended a plain author name. The user (2026-10-21): "no author please, because i want to keep it simple to be honest". No author is recorded; a writer who wants it known says so in the text. | User | Decided: no author |
| DEC-007 | Temp tasks | Consistency | — | Project Tasks only, like keys, dependencies and parts. | Solution Designer | Decided |
| DEC-008 | Does a comment bump `updatedAt`? | Board order and "what changed recently" | Yes; no | A comment is activity on the Task (Jira's "updated"); the board's newest-first order should show it. Yes. | Solution Designer | Decided |
| DEC-009 | What list and search show | Agent cost vs completeness | — | List: the full thread (it already returns full descriptions). Search: the comment count, and a Task matches when a comment does; for the text, agents use the list. | Solution Designer | Decided |
| DEC-010 | Searching comments | Measured: 181 of 309 descriptions exceed the 512-token limit, so comments must be indexed on their own for meaning search | Exact only now; meaning per comment now | The user wants a simple first version: comments are found by exact text now; meaning search of comments joins the long-description indexing follow-up (FU-001, widened by the user 2026-10-21). | User / Solution Designer | Decided |
| DEC-011 | Appending to the description in place (the smaller step) | Rejected alternative | — | Keeps the token and safety problem smaller, but gives no author, time or notification, and keeps mixing updates into the brief. Not done. | Solution Designer | Decided |
| DEC-012 | Comments in delegated work | A new worker must see later directions | — | The delegated work contains the description, then a "Comments:" block with the comment texts, oldest first, as bullets: texts only, no IDs or times (DEC-024). | Solution Designer | Decided |
| DEC-013 | Text rules | — | — | Trimmed, non-empty; no other limit, as for descriptions. | Solution Designer | Decided |
| DEC-014 | Who is told | Scope | — | Nobody in this ticket (DEC-002). | Solution Designer | Decided |
| DEC-016 | Comment IDs and storage | Referring to one comment; edit possible later | Number within the Task; random ID | Comments live in the Task's `task.json` as `comments: [{id, createdAt, text}]`; `id` is the Task-local number (last + 1, never reused), referable as `autobyteus-42 #2`; absence of `comments` = none. Accepted by the user (2026-10-21; kept without edit 2026-10-22). | User | Decided |
| DEC-020 | Part 2: how a part reaches the team working on its parent | — | (A) / (B) / (C) / (0); see investigation notes "Part 2 Investigation" | Moved out of this ticket by the user (DEC-022). The Solution Designer's analysis (recommend A now, B later) goes with the new Task. | User | Moved to its own Task |
| DEC-021 | (A): several parts at once on one copy? | — | — | Moved with DEC-020. | — | Moved to its own Task |
| DEC-022 | One ticket or two? | Small tickets | Both here; split | The user (2026-10-22): "I think part two definitely belongs to a separate ticket." | User | Decided: split |
| DEC-023 | `autobyteus-260` (leave empty fields out) | One contract change | Absorb 260 for all tools; apply its rule to what this ticket adds | The fields this ticket adds or changes follow 260's rule from the start (for example no `comments` field when there are none, `partsNotClosed` only when some). 260 stays its own Task for every other tool. | Solution Designer (user informed) | Decided |
| DEC-024 | What agents see of a comment | Tokens; usefulness to an LLM | Times and IDs; text only | The user (2026-10-22): times are "completely not useful for agents"; then, with no editing, "in the return we dont have to show id". Agents see comments as texts in order, in `list_project_tasks` and in delegated work; `update_task` adds no comment field to its result. ID and time stay stored for the app. | User | Decided |
| DEC-025 | Does the board's search also match comment text? | The board and `search_project_tasks` share one server search (AF-007) | One rule for both; a flag that keeps the board on descriptions only | The board's search is meant to find a Task by what the user remembers; a direction recorded in a comment is part of that. One rule keeps agents and the app consistent; a flag would add a second behavior for no gain. Consistency across similar surfaces is a solution detail. Decided: one rule. The user was informed on 2026-10-22, in the Solution Designer's message after the design ("One effect you should know about: the board's search box uses the same server search …"), and did not object. The user can still ask to change it. | Solution Designer (user informed 2026-10-22) | Decided |
| DEC-015 | Existing data and versions | — | — | No comments on existing Tasks; no conversion; no mixed-version code (the user's rule). | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-001, UC-002 | BEH-001 | AC-001 | SCN-001 |
| REQ-003 | — | — | — | — |
| REQ-004 | UC-001, UC-002 | BEH-001 | AC-001, AC-003 | SCN-001 |
| REQ-005 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-006 | UC-002 | BEH-001 | AC-003, AC-013 | SCN-002 |
| REQ-007 | UC-003 | BEH-002 | AC-003, AC-004, AC-013 | SCN-003 |
| REQ-008 | UC-004 | BEH-004 | AC-001, AC-005, AC-016 | SCN-005, SCN-009 |
| REQ-009 | — | — | AC-006 | — |
| REQ-010 | UC-001 | BEH-001 | AC-008 | — |
| REQ-011 | UC-006 | BEH-006 | AC-009 | SCN-006 |
| REQ-012 | UC-007 | BEH-007 | AC-010 | SCN-007 |
| REQ-013 | — | — | AC-011 | — |
| REQ-014 | UC-002, UC-003 | BEH-002 | AC-012 | — |

## Architecture Phase Input

- Scenarios: SCN-001 to SCN-003, SCN-005 to SCN-007 (SCN-004 withdrawn).
- Constraints: no author; server-set time and Task-local ID; add only; comments never touch the description; Project Tasks only; no run notification; existing `update_task` tool (no new tool); no migration or mixed-version code (DESIGN.md rule 9).
- Deferred to design (resolved in `design-spec.md` SR-012): GraphQL mutation and feed shape; the work-text format; the `partsNotClosed` shape; where the comment rules live.
- Risks: agent behavior from the new tool text; token cost of full threads in list results.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A` (no design step, DEC-005)
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A` (DEC-005)
- Material assumptions and decisions are visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (SR-011)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
