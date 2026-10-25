# Requirements Document — Agent tool results without empty fields, and a Task title

## Document Status

- Status: `Approved` (SR-010: the read-one-Task addition approved by the user on 2026-10-25; SR-008 basis unchanged otherwise)
- Current solution revision ID: `SR-011`
- Package identifier: `agent-tool-results-omit-empty`
- Request / ticket: Project Task `autobyteus-260` (2026-10-21), its comments (2026-10-24 user decisions; 2026-10-25 reassignment; 2026-10-25 "PM + USER" comment #6: a read-one-Task tool)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer (second team); date 2026-10-25
- Approved by and reference: `User`, 2026-10-25, in this Solution Designer's conversation, after the four open points and the preliminary design were put to him: "you know the best I think, you understand the code more than me, I trust your design". Recorded as approval of this package with the Solution Designer's recommendations on DEC-009 (a), DEC-013 (existing style) and DEC-016 (yes); the user was told so in the same conversation.
- Exact approved requirements baseline / solution revision: this document at SR-006 (REQ-001–REQ-012, AC-001–AC-010, DEC-001–DEC-017) with the three supplements below
- Behavior-defining supplements: `evidence/SD-measure-sizes-output-20261025.txt`, `evidence/SD-measure-summary-output-20261025.txt`, `evidence/SD-first-line-lengths-output-20261025.txt` (before sizes, re-measured read-only on current data)
- History: the first team's draft (SR-001 to SR-003, never approved) is kept in [solution-revision-record.md](solution-revision-record.md); this document supersedes it after verification against `origin/personal@fc06a7355d`.
- Done when (verbatim, Task): "The user has seen the measured before/after sizes; every agent tool omits empty fields under one rule; consumers still work (the Project Task Manager package is updated where it relied on a field being present); tests; finalized on personal. Release as the user decides."

## Problem And Desired Outcome

- Problem:
  - Platform agent tools return fields with no value (`null`, `[]`, `""`) and repeated boilerplate (`meaningSearch: {state: "ready"}` on every search, `projectId` on every listed Task); several families pretty-print their JSON.
  - `list_project_tasks` returns every Task's full description (70% of its bytes); a list of open Tasks (153 Tasks, 481,648 bytes) is too large for the Project Task Manager to read.
  - A Project Task has no title: tools and the app use the description's first line, which is longer than 160 characters for 36% of Tasks.
- Affected actors or systems: every agent on every runtime (AutoByteus native, Codex, Claude, AGY) that calls platform tools; the Project Task Manager (main reader of Task lists); the user in the web app (Task forms and labels).
- Desired outcome:
  - one rule, one owner: every platform tool result leaves out empty fields and is compact JSON;
  - a Project Task has an explicit short **title**, given at creation, editable, shown by the tools and the app;
  - `list_project_tasks` returns short entries (with the title) by default and full Tasks on request.
- Observable definition of success: measured before/after sizes shown to the user (REQ-010); per-tool tests of the shapes; consumers working.

## Measured Before (read-only, numbers only, 2026-10-25)

| Result | Before | After (estimated) |
| --- | --- | --- |
| `list_project_tasks`, AutoByteus Project, 153 open Tasks | 481,648 B | ≈31,126 B with short entries by default (−94%); 468,844 B with only empty fields left out (−2.7%) |
| `list_project_tasks`, AutoByteus Project, all 300 Tasks | 1,287,231 B | ≈59,528 B (−95%) |
| of which full descriptions (open) | 335,371 B (70%) | not in default entries |
| `search_project_tasks`, 10 hits | 2,004 B | 1,720 B (−14%) (first team, 2026-10-24) |
| `update_task` acknowledgement | 140 B | 111 B (−21%) (first team) |
| `send_message_to` refusal | 167 B | 140 B (−16%) (first team) |
| Browser `dom_snapshot` (synthetic, 200 elements) | 60,542 B pretty | 37,930 B compact (−37%); 36,334 B also without empty fields (−40%) |
| First lines of the 376 stored Task descriptions | median 133 chars; p90 254; max 2,688; 242 (64%) ≤ 160; 303 (81%) ≤ 200 | — |

## Relevant Current And Desired Behavior

| BEH | Kind | Current (evidence: investigation notes) | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | Contract | Each tool family writes its own JSON; empty fields kept in Project Task tools, `send_message_to` (documented null rule), delegation, browser, media; definition tools, delegation, browser, media and `publish_artifacts` pretty-print | One rule for every platform tool result, on both routes: no empty fields, compact JSON | Every field with a value keeps its name and meaning (except BEH-003/004/005); what each tool does |
| BEH-002 | User + Contract | A Project Task has no title (`models.ts`: "It has no title; the description is the content"); tools and app derive a one-line label from the description | A Project Task has a `title`; tools and app show it | Description content and behavior |
| BEH-003 | Contract | `list_project_tasks` returns full Tasks, each repeating `projectId` | Short entries only; `projectId` once at the top; a Task in full comes from `get_project_task` | `status` filter; relation keys |
| BEH-004 | Contract | `search_project_tasks` returns `summary` (derived first line) and `meaningSearch` on every call | Returns `title`; `meaningSearch` only when meaning search was not (fully) used | Matching and ranking |
| BEH-006 | Contract | No tool reads one Task: `list_project_tasks` returns all Tasks, search a one-liner; a worker's first message has no Task key and no Project ID (`agent-collaboration/execution/task/task-execution-input.ts:41-63`) and later comments never reach it | `get_project_task(project_id, task_id)` reads one Project Task in full; a worker may read only its own Task; the worker's first message names its Task key and Project | Every other tool's behavior |
| BEH-005 | Contract | Context files in Task results carry six fields (`storedFilename`, `displayName`, `mimeType`, `sizeBytes`, `locator`, `localPath`) | `{name, path}` | The files themselves |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| UC | Use case | Scenario |
| --- | --- | --- |
| UC-001 | An agent calls any platform tool and gets only fields with a value, as compact JSON | SCN-001 |
| UC-002 | An agent creates a Project Task with a title, and changes a title | SCN-002 |
| UC-003 | The user creates and edits a Task's title in the app, and sees titles wherever a Task's one-line label is shown | SCN-003 |
| UC-004 | An agent lists a Project's Tasks as short entries, then reads chosen Tasks in full | SCN-004 |
| UC-005 | Existing Tasks get a title (DEC-009) | SCN-005 |
| UC-007 | An agent reads one Project Task in full by its Project and key; a Task worker reads its own Task, knowing both from its first message | SCN-007 |
| UC-006 | Consumers keep working: the web activity view, tests, and the Project Task Manager skill (updated where it describes the changed shapes) | SCN-006 |

### Out Of Scope

- Configured third-party MCP tools and application-defined tool payloads (their results pass through unchanged).
- Tasks with no Project (Temp tasks, created by a description-only `delegate_task`): no title; their label stays their description's first line (DEC-014).
- Meaning search over titles (autobyteus-276) and memory work (autobyteus-185 / 233); this ticket only provides the field.
- Error codes and messages (their text stays; only empty fields around them go).
- Core tools of the AutoByteus runtime that return plain text (`read_file`, `write_file`, `edit_file`, `read_url`, media); `run_bash` already leaves out empty fields (`TerminalResult.toJSON`).

### Non-Goals

- No new tool or tool exposure other than `get_project_task` (opt-in, REQ-016); the only new parameter is `title`.

### Preserved Behavior Boundary

- Every non-empty field keeps its name and meaning, except: search's `summary` becomes `title` (DEC-012); list default entries leave out description, comments, context files and closed assignments (DEC-008); per-Task `projectId` in lists goes (DEC-015); context files become `{name, path}` in full entries and acknowledgements (DEC-004, DEC-019).
- `false` and `0` stay.
- Refusals keep `code` and `message`.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| REQ | Requirement | BEH | Source / Decision |
| --- | --- | --- | --- |
| REQ-001 | Every platform agent tool result (success and refusal; native and MCP route) leaves out every field whose value is `null`, `""`, `[]` or `{}`, at any depth; `false` and `0` stay. An absent field means "none". | BEH-001 | User; DEC-001 |
| REQ-002 | One owner applies the rule and writes compact JSON, used by every platform tool family on both routes. Advertised MCP output schemas and tool descriptions match the new shapes. | BEH-001 | User; DEC-002, DEC-005 |
| REQ-003 | A Project Task has a `title`: free text, trimmed, not blank. No length or line limit (the user, 2026-10-25). | BEH-002 | User; DEC-010, DEC-011 |
| REQ-004 | `create_task` requires `title`; `update_task` can change it. The app's New task and Edit task forms have a required Title field. A missing or blank title is refused with no change. | BEH-002 | User; DEC-010 |
| REQ-005 | Every existing Project Task gets a title from its description's first non-empty line, cut at 200 characters with "…" when longer (the safety cut applies to these derived titles only); nothing else in the Task changes (DEC-009). | BEH-002 | User; DEC-009 |
| REQ-006 | The app shows the title wherever it shows a Project Task's one-line label today: board cards (title as the main line, the description's start as the quieter preview), Task page, dependency and part rows, pickers, the parent marker, the delete confirmation, the Workspaces-tree Task summary. The description is shown in full on the Task page as today. | BEH-002 | DEC-013 |
| REQ-007 | `list_project_tasks` returns `projectId` once and, for each Task: `taskId`, `title`, `status`, `dependsOn`, `partOf`, `parts`, `commentCount`, open `assignments` (or `assignmentsUnavailable`) — each only when it has a value. It has no `task_ids` parameter; a Task in full is read with `get_project_task` (REQ-014). | BEH-003 | User; DEC-008, DEC-015, DEC-021 |
| REQ-013 | `create_task` and `update_task` acknowledgements name attached context files as `attachedContextFiles: [{name, path}]`, the same shape as `get_project_task`'s `contextFiles`. | BEH-005 | DEC-019 |
| REQ-014 | A new tool `get_project_task` takes `project_id` and `task_id` (the Task's key, any letter case, or its long ID) and returns that Project Task in full: `projectId`, `taskId`, `title`, `status`, `description`, `dependsOn`, `partOf`, `parts`, `comments`, `contextFiles` as `{name, path}`, `assignments`, `closedAssignments` (each only when it has a value). A `task_id` naming no Task of that Project → `TASK_NOT_FOUND`. Read-only. Temp tasks are not read by it. | BEH-006 | User (2026-10-25); DEC-020 |
| REQ-015 | Scope: a caller that works on a Task (its run, or the task team it belongs to, holds that Task's assignment, including agents it delegated to) may read only that Task; any other Task is refused with no data (`TASK_READ_OUT_OF_SCOPE`, naming the caller's Task). A caller that works on no Task may read any Project Task on this node, as `list_project_tasks` can today. A copy that holds several open Tasks works on its current one (the latest given to it), and reads only that one. | BEH-006 | User (2026-10-25: focus on its own Task, no parent; "one task at a time"); DEC-022 |
| REQ-016 | `get_project_task` is exposed only to agents whose definition lists it (never automatically); same on both routes. | BEH-006 | Constraint "no tool exposed automatically"; DEC-023 |
| REQ-017 | A worker's first message for a saved Project Task names it: `Task: <key> in Project <projectId>`, with one sentence that `get_project_task` reads it again (including later comments) for an agent that has that tool. Described (Temp) work is unchanged. | BEH-006 | User (2026-10-25: "a very short message … a very big difference"); DEC-024 |
| REQ-008 | `search_project_tasks` returns `title` in place of `summary`, and leaves out `meaningSearch` when meaning search was used. | BEH-004 | DEC-003, DEC-012 |
| REQ-009 | `create_task` / `update_task` acknowledgements, GraphQL, the change feed and the app's Task types carry `title`. | BEH-002 | — |
| REQ-010 | Before/after sizes, on synthesized data with the user's shapes, are in the delivery evidence and shown to the user. | — | Done when |
| REQ-011 | The vocabulary is one: a Project Task's one-line name is its **title** everywhere (code, stored field, wire, GraphQL, tools, UI, docs); "summary" is no longer used for it; `GLOSSARY.md` has the entry. | BEH-002, BEH-004 | DESIGN.md Principle 15; DEC-016 |
| REQ-012 | The Project Task Manager skill (autobyteus-agents) describes the new shapes where it describes the changed ones: search returns `title`; lists are short; a Task in full comes from `get_project_task` (new); the title field exists; workers' first messages name their Task and Project; `closedParts` is absent when nothing was closed. | — | Done when; DEC-017 |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | For each tool family, empty values are absent, `false`/`0` present, refusals keep `code`/`message`; results are compact; MCP `structuredContent` validates against advertised output schemas | Unit per family, both routes; MCP schema unit |
| AC-002 | REQ-002 | No platform tool result is serialized outside the one owner | Unit + a guard test |
| AC-003 | REQ-003, REQ-004 | `create_task` without `title` or with a blank one → refused; a long title is kept whole; `update_task title=…` changes it; the app's form requires it | Server unit + tool E2E; web unit |
| AC-004 | REQ-005 | Stored Tasks in the released shape read afterwards with their first line (≤ 200, "…" when cut) as title; nothing else changes; a Task that cannot be converted does not stop startup | Migration tests on synthesized fixtures of every released shape; isolated instance |
| AC-005 | REQ-006 | The listed app places show titles | Web unit; isolated instance |
| AC-006 | REQ-007 | List entries: no description, comments, context files or closed assignments; no `task_ids` parameter | Server unit + tool E2E |
| AC-011 | REQ-013 | `create_task` / `update_task` with `context_files` → `attachedContextFiles` entries carry `name` and `path` only; `path` reads the saved file | Server unit + tool E2E |
| AC-012 | REQ-014 | `get_project_task project_id=P task_id=autobyteus-42` → that Task in full; by long ID or other letter case the same; a key of another Project or unknown → `TASK_NOT_FOUND` | Server unit + tool E2E, both routes |
| AC-013 | REQ-015 | A worker (a task agent, a task team member, an agent the worker delegated to) reads its own Task; any other Task, its parent included → `TASK_READ_OUT_OF_SCOPE`, no data; a caller on no Task reads any Task | Server unit + tool E2E with a task team |
| AC-014 | REQ-016 | `get_project_task` absent from an agent whose definition does not list it, on both routes | Unit (exposure) |
| AC-015 | REQ-017 | `delegate_task` with a saved Task (new copy and existing copy) → the first message contains `Task: <key> in Project <projectId>` and the `get_project_task` sentence; a described delegation's message has neither | Unit (`task-execution-input`) + collaboration E2E |
| AC-007 | REQ-008 | Search hits carry `title`; `meaningSearch` absent when ready, present (with note) when not | Unit |
| AC-008 | REQ-010 | Before/after table in the delivery evidence | Evidence |
| AC-009 | REQ-011 | No code, wire, UI text or doc names a Project Task's one-liner "summary"; `GLOSSARY.md` defines Title | Review + grep |
| AC-010 | REQ-012 | The skill's text matches the shipped shapes | Review |

## Relevant Scenarios And Journeys

| SCN | Kind | Actor | Trigger | Steps / outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | Any agent | A platform tool call | The result carries only valued fields, compact | Supported Normal | Task description; user 2026-10-21 |
| SCN-002 | User (agent) | Project Task Manager, Opportunity Scout | `create_task` / `update_task` | Title given; refused when invalid | Supported Normal | User decision, comment 2026-10-24 |
| SCN-003 | User | The user in the app | New / Edit task | Title field required; labels show it | Supported Normal | Same |
| SCN-004 | User (agent) | Project Task Manager | `list_project_tasks` status=TODO, then `get_project_task` | Short list, then a chosen Task in full | Supported Normal | Same; PM skill line 22 |
| SCN-005 | System | App start after update | Stored Tasks without title | Each gets its title once | Supported Normal | User: "old Tasks fall back to the first line … generous safety cut" |
| SCN-007 | User (agent) | Project Task Manager; a Task worker (e.g. the Solution Designer) | `get_project_task` | The manager reads a Task found in a list; a worker re-reads its own Task (latest comments) with the key and Project from its first message | Supported Normal | User + PM comment #6; user 2026-10-25 |
| SCN-006 | Contract | Web activity view, skills | Reading results | Absent fields read as none | Supported Normal | Investigation notes, consumers |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (Title field and labels).
- Product Design: not requested; DEC-013 asks the user whether the existing style suffices.
- Required: a required one-line Title input above the description on the New / Edit task forms, in the existing form style; labels as REQ-006; a refusal message for an invalid title in the existing error style.

## Quality And Non-Functional Requirements

| QR | REQ / AC | Area | Requirement |
| --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-007 | Performance | Default `list_project_tasks` of the measured 153 open Tasks ≤ 10% of its before size; every result compact |
| QR-002 | REQ-005 | Reliability | The title conversion never blocks startup or new work; an unconvertible Task is left unchanged and reported (Data Migration Guideline § 1) |
| QR-003 | All | Security | No secret or Task content printed while measuring; no secret added to any result |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` — each `task.json` under `projects/<projectId>/tasks/<taskId>/` gains `title` (376 Tasks in the user's data).
- Must be preserved: every other field and the description, byte for byte in meaning.
- Acceptable loss: none.
- The transition mechanism is the design's (DEC-009 sets the intent).

## External Contracts And Dependencies

| Contract | Constraint | Evidence |
| --- | --- | --- |
| MCP `tools/call` results | `structuredContent` must validate against an advertised `outputSchema` | `docs/modules/agent_communication.md` |
| Codex / Claude / AGY MCP clients | How each shows `content` vs `structuredContent` to the model | Claude: one copy (observed); Codex: probe in design (DEC-006) |

## Supplemental Artifacts

| Path | Purpose | REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/SD-measure-sizes.py`, `-output-20261025.txt` | List sizes, empty-field and description share | REQ-010, QR-001 | Current | In approval basis |
| `evidence/SD-measure-summary.py`, `-output-20261025.txt` | Short-entry size | REQ-007, QR-001 | Current | In approval basis |
| `evidence/SD-first-line-lengths.py`, `-output-20261025.txt` | Title length limit | REQ-003, REQ-005 | Current | In approval basis |
| `evidence/first-team-*` | First team's handover and outputs (2026-10-24) | — | Historical | Not applicable |

## Assumptions

| ASM | Assumption | Validation |
| --- | --- | --- |
| ASM-001 | No consumer relies on an empty field being present | Consumer check in investigation notes; design verifies the web activity view and tests |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | What counts as "no value" | `null`, `""`, `[]`, `{}` at any depth; `false` and `0` are values and stay. Matches the user's words ("fields which don't have any value"). | User (direction) / Solution Designer | Decided |
| DEC-002 | Compact JSON everywhere | Indentation is 37% of structured results; the user's decision (comment 2026-10-24), confirmed 2026-10-25. | User | Decided |
| DEC-003 | `meaningSearch` when ready | Leave out; absent = used. | Solution Designer | Decided |
| DEC-004 | Context files in full Tasks | `{name, path}`; agents read files by path; no tool takes the stored name, MIME type, size or REST locator. | User (PM view, comment 2026-10-24) / Solution Designer | Decided |
| DEC-005 | Where the rule lives | One shared serializer used by every platform family on both routes; never a filter over all tool output (third-party results stay untouched). | Solution Designer | Decided |
| DEC-006 | MCP's two copies (`content` text + `structuredContent`) | The design probes Codex read-only; options return to the user only if a runtime shows the model both copies. | Solution Designer | Decided (probe in design) |
| DEC-007 | Scope of "every tool" | Every server-owned platform tool family (Project Task, delegation, communication, discovery, browser, media, publish_artifacts, agent/team definition tools) on both routes; core AutoByteus tools that return structured results (`get_background_processes`, `get_process_output`, `start_background_process`, `stop_background_process`) too; text-returning core tools need nothing. | Solution Designer | Decided |
| DEC-008 | Short entries by default, full on request | The user: "list_project_tasks and search_project_tasks return it by default, full description on request". Full on request = `get_project_task` (SR-010; was `task_ids` until DEC-021). | User | Decided (confirmed 2026-10-25) |
| DEC-009 | How existing Tasks get their title | (a) A one-time conversion at startup writes each existing Task's title from its first line; afterwards every Task has a title and every reader has one path. (b) Every reader computes the first line whenever a Task has no title, forever. Cost: both are cheap to run (376 small files once, or a string cut per read). The difference is the code: (b) makes `title` optional in storage and keeps a fallback in every reader (tools, GraphQL, search, app), which the Data Migration Guideline § 3 rules out ("a new required fact that only old data can supply" is a migration; "no fallback reads"); the Task key was added the same way (`project-task-keys-v1`). With (a) an old Task's title does not follow later edits of its description's first line, exactly like a new Task's title. **Recommend (a).** | User | Decided (user, 2026-10-25: (a)) |
| DEC-010 | Title rules | The user (2026-10-25): "No need to limit the title … the agent has a very, very good understanding how to write the title … we don't have to apply a hard limit on the title." So: required and not blank, trimmed; no length or line limit. The app bounds what it renders, as it does today (`boundTaskText`), which is display only. The 200-character cut stays only for titles derived from old descriptions (REQ-005), which no writer chose and whose first lines reach 2,688 characters; it is the "generous safety cut" the user asked for on 2026-10-24 (81% fit whole). | User | Decided |
| DEC-011 | Name | `title` everywhere. | Solution Designer | Decided |
| DEC-012 | Search's `summary` | Becomes `title`, in the same contract change. | Solution Designer | Decided |
| DEC-013 | The app's Title field and labels | Existing style: a required one-line Title input above the description on New / Edit task (as the Project name input), the card's main line = title and its quieter preview = the description's start; no separate Product design pass. **Recommend the existing style.** | User | Decided (user, 2026-10-25: existing style) |
| DEC-014 | Temp tasks (no Project) | No title: `delegate_task` stays unchanged ("do not change what the tools can do"); their label stays their description's first line, and is not called title or summary. | Solution Designer | Decided |
| DEC-015 | Repeated `projectId` per listed Task | Leave out; the result's top-level `projectId` names it once (repeated boilerplate). | Solution Designer | Decided |
| DEC-016 | "summary" → "title" (Principle 15) | Today "summary" names two things: a Task's derived one-liner (search's `summary`, the app's `taskSummary` helpers, i18n `{summary}`) and a reduced view (`listProjectSummaries`, `TaskWorkerTaskSummary`). With titles, the one-liner is the title everywhere; "summary" keeps only the reduced-view meaning. `GLOSSARY.md` gains **Title** (a Project Task's one-line name, given by its writer; a Temp task has none) and a note that a summary is a reduced view, never a Task's one-liner. No stored name changes (nothing stored is called summary). **Recommend.** | User | Decided (user, 2026-10-25: yes) |
| DEC-017 | The Project Task Manager skill | The Task's done-when requires it to be updated where it relied on the shapes; the change is four sentences in `SKILL.md` (lines 21, 22, 56, 84). In this ticket, on its own branch in autobyteus-agents. | Solution Designer | Decided |
| DEC-018 | Details settled in design (within the direction, no change to the approved behavior) | (1) Search's exact tier also matches the title, so a word shown on a card finds its Task; the meaning index stays on descriptions (autobyteus-276). (2) The Task page and the Projects panel show the title above the description. (3) A card shows the title and the description's start; for an old Task whose description begins with its title, the preview skips that line. | Solution Designer (user informed) | Decided |
| DEC-019 | Context files in acknowledgements | Architecture review ARCH-REV-001 (residual): the acks keep `{storedFilename, displayName}` while full entries use `{name, path}`, two names for one thing (Principle 15) that this ticket would introduce. Same reasoning as DEC-004 (agents read files by path; no agent tool takes a stored name; `agent-tools/**` has no other `storedFilename` use), within the user's direction ("context files as names … ", PM view "context files as {name, path} yes"). Align the acks in this ticket. | Solution Designer (user informed) | Decided |
| DEC-020 | Name and shape of the read-one-Task tool | The user (2026-10-25): the tool takes the Project, like the Project family (`list_project_tasks`, `search_project_tasks`), so the identity is explicit and stays unambiguous when boards live elsewhere later (another node, a shared board). Name `get_project_task(project_id, task_id)`; shape = a Task in full (the shape full list entries had). | User | Decided |
| DEC-021 | `list_project_tasks task_ids` | The user (2026-10-25): "drop it is a good idea". One way to read a Task in full; several Tasks = several calls. | User | Decided |
| DEC-022 | Worker scope | The user (2026-10-25): "for the current being, no parents"; keep workers focused on their own Task (one Task at a time, deterministic). The Solution Designer's narrowing to the own Task only (no parts, no dependencies; the Task Manager writes what a worker needs into its Task) was put to him and he continued. Scope follows the existing "which Task does this run work on" answer (`root-task-execution-resource-scope.ts:48` `ownerOf`, the rule that makes `delegate_task` refuse `task_id` for task agents). A copy holding several open Tasks (an existing copy given Task B while Task A is open) reads only its current Task B: this follows the user's "one task at a time" (architecture review AR-006, stated in SR-011). | User | Decided |
| DEC-023 | Exposure | Opt-in by agent definition only, like the other Task tools; the Agent Package Creator adds it to roles afterwards (the PM files that Task). | Solution Designer | Decided |
| DEC-024 | The worker's first message | The user (2026-10-25): include the Task key and the Project ID in the delegated message; "a very short message … a very big difference". One line plus one sentence; only for saved Project Tasks. | User | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 |
| REQ-003 | UC-002, UC-003 | BEH-002 | AC-003 | SCN-002, SCN-003 |
| REQ-004 | UC-002, UC-003 | BEH-002 | AC-003 | SCN-002, SCN-003 |
| REQ-005 | UC-005 | BEH-002 | AC-004 | SCN-005 |
| REQ-006 | UC-003 | BEH-002 | AC-005 | SCN-003 |
| REQ-007 | UC-004 | BEH-003, BEH-005 | AC-006 | SCN-004 |
| REQ-008 | UC-001 | BEH-004 | AC-007 | SCN-001 |
| REQ-009 | UC-002, UC-003 | BEH-002 | AC-003, AC-005 | SCN-002, SCN-003 |
| REQ-010 | UC-001 | — | AC-008 | — |
| REQ-011 | UC-002–UC-004 | BEH-002, BEH-004 | AC-009 | SCN-002–SCN-004 |
| REQ-012 | UC-006 | — | AC-010 | SCN-006 |
| REQ-013 | UC-002 | BEH-005 | AC-011 | SCN-002 |
| REQ-014 | UC-007 | BEH-006 | AC-012 | SCN-007 |
| REQ-015 | UC-007 | BEH-006 | AC-013 | SCN-007 |
| REQ-016 | UC-007 | BEH-006 | AC-014 | SCN-007 |
| REQ-017 | UC-007 | BEH-006 | AC-015 | SCN-007 |

## Architecture Phase Input

- Approved scenarios to map: SCN-001 to SCN-006.
- Constraints: no new tool exposure; third-party results untouched; startup never blocked by the conversion; no secrets.
- Deferred to design: where the shared serializer lives (shared by autobyteus-ts core tools and server tools); MCP output schemas; DEC-006 Codex probe; the conversion mechanism (migration conventions investigation); web component changes.
- Facts to verify: every serialization point (investigation notes' inventory); consumers of `summary`, `contextFiles` fields, `target_agent_run_id: null`; GraphQL and change-feed Task types.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A` (DEC-013: existing style, no Product pass)
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A` (DEC-013)
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes` (the user, 2026-10-25)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes` (SR-010)
- Remaining blocker: none
