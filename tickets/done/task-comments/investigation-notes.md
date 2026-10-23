# Investigation Notes — Task comments

## Investigation Meta

- Package identifier: `task-comments`
- Request / ticket: Project Task `autobyteus-259` ("Task tools: let an agent ADD a note (comment) to a Task without rewriting its whole description"), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-10-21, with an extra direction the same day (the word "comment"; Jira-like thread; decide the tool contract together with `autobyteus-187`).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments`, `codex/task-comments`
- Resolved base: `origin/personal` @ `786055f3d7f1ffe338f614340ffed006c7afbf7a`, fetched 2026-10-21
- Finalization target: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created; ticket folder `tickets/in-progress/task-comments/`
- Bootstrap blocker: none
- Current solution revision ID: `SR-012`
- Authorities read (requirements gate, 2026-10-21): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (updated skill package `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/`)
- Investigation status: requirements investigation complete for SR-001; architecture investigation after approval.

## Initial Request And Clarifications

- Original request (the user, 2026-10-21, relayed): "I feel like our update task does not include add comment; this is causing you to always have to write the complete task information." The user wants a way to add a comment to a Task: appended, with time and author, without touching the description. The description stays the brief.
- Clarifications (relayed by `/project_task_manager`, 2026-10-21): the user chose "comment" over "note". A Project Task works like a Jira ticket: the description is the brief, and comments are an append-only thread under it, each with author and time.
- The Project Task Manager's suggestions, for the user to decide:
  - keep v1 small: append-only, author + time, shown under the description, visible in `list_project_tasks` / `search_project_tasks`, searchable by meaning;
  - edit, delete and replies later;
  - tell the running worker automatically;
  - one tool-contract change together with `autobyteus-187`.
- Done when (from the Task, verbatim):
  - "The user has chosen the design;"
  - "an agent (and the user in the app) can add a note to a Task without rewriting the description;"
  - "the note shows in the app and in the list/search results;"
  - "a running worker is told about it as the user decides;"
  - "tests; finalized on personal. Release as the user decides."
- Related: `autobyteus-102` (Task tools split), `autobyteus-187` (list open parts when a parent closes), `autobyteus-6` (context files for agents), `autobyteus-71` (meaning search).

## Product And Domain Understanding

- Product area: Project Tasks (server model, agent tools, the app's Task page), the collaboration runtime (delivering a message to a task agent), meaning search.
- Actors: the user (app); the Project Task Manager (agent with Task tools); task agents (workers) assigned a Task by `delegate_task`.
- Terms: *comment* (one appended entry: author, time, text); *thread* (a Task's comments in time order); *worker* (the task agent whose open assignment is this Task).

## Source Log

| Date | Type | Source | Why | Finding | How established |
| --- | --- | --- | --- | --- | --- |
| 2026-10-21 | Code | `src/projects/domain/models.ts`, `stores/project-store.ts` | Task shape | `task.json`: taskId, projectId, taskKey, description, status, dependsOnTaskIds, partOfTaskId, createdAt, updatedAt, contextFiles. No comments | Read |
| 2026-10-21 | Code | `src/agent-tools/project-tasks/project-task-tool-contract.ts`, `-manifest.ts`, `-native-tools.ts` | Tool contract | 7 tools; `update_task` replaces `description` whole. Tools are registered classes and also MCP adapters (`project-task-tools-mcp-adapter-provider.ts`); the adapter passes only `rawArguments` (no caller) | Read |
| 2026-10-21 | Code | `src/agent-tools/mcp/providers/send-message-to-mcp-adapter-provider.ts`; `agent-tools/agent-communication/send-message-to.ts`; `agent-communication/domain/agent-run-message-sender.ts` | Caller identity | MCP adapters receive `session.sender` (`AgentRunMessageSenderContext {senderRunId, senderName, runtimeKind, memberExecutionContext}`); native tools get a sender from their construction | Read |
| 2026-10-21 | Doc | `docs/modules/agent_tools_mcp_server.md` "Configured Tool Boundary" | How tools are enabled | Tools are exposed only when the agent definition selects them | Read |
| 2026-10-21 | Code | `src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (`assignToExistingCopy`, `withLiveLease`); `task-execution-input.ts` (`buildExistingCopyTaskMessage`); `services/active-collaboration-root-directory.ts` | How a running worker gets a message | The hosting root's `deliverExactAgentMessage` delivers to the worker's ingress run, waking or restoring it (`withLiveLease`). `ExactAgentMessageInput.sender` is only `kind: "agent"`; roots are reachable only while active (registered) | Read |
| 2026-10-21 | Code | `agent-collaboration/execution/events/agent-presentation-event.ts` | System notifications | `SYSTEM_TASK_NOTIFICATION` with sender `{kind: "system"}` exists for presentation | Read |
| 2026-10-21 | Code | `src/projects/search/project-task-search-service.ts` | Meaning search inputs | One index item per Task, `text: task.description`; the exact tier matches description containment | Read |
| 2026-10-21 | Code | `src/embeddings/catalog/embedding-model-catalog.ts`, `runtime/embedding-worker.ts` | Model input limit | Default `granite` small English R2 has `maxTokens: 512`. Longer inputs keep the first 511 tokens and the last token | Read |
| 2026-10-21 | Data | `~/.autobyteus/server-data/projects/*/tasks/*/task.json` (read-only, counts only) | Real Task sizes | 309 Tasks; description median 2,298 chars, p90 4,691, max 24,805; 181 over 2,000 chars (about the 512-token limit). Fields present include `partOfTaskId`; none have comments | Measured (Python, read-only) |
| 2026-10-21 | Code | `src/projects/services/task-part-closure.ts` | `autobyteus-187` | A part that fails to close is logged (`TASK_PART_CLOSE_FAILED`) and left out of `closedParts`; the agent is not told by name | Read |
| 2026-10-21 | Web | Jira, Linear, GitHub issues | Practice | Description plus a time-ordered comment thread with author and time; comments are editable by their author in all three (Jira and GitHub mark "edited"), and Jira and GitHub notify watchers | Read (public product knowledge) |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | `update_task description` | The whole description is replaced | The Project Task Manager resends the full text to add one fact (autobyteus-233 three times; 245, 205, 229, 234) | Task text; tool contract | High |
| BEH-002 | User | Task page | Description, Part of / Parts, Dependencies, Assigned to; no comments | — | `ProjectTaskDetail.vue` | High |
| BEH-003 | System | A Task edit after dispatch | Nothing reaches the running worker; the Project Task Manager messages it by hand | — | Task text; no delivery in `update()` | High (Read) |
| BEH-004 | Contract | `list_project_tasks`, `search_project_tasks` | Return description (list), summary (search) | — | manifest | High |
| BEH-005 | System | Meaning search | Indexes descriptions only, cut at 512 tokens | Most Tasks are already cut | Measured | High |
| BEH-006 | Contract | `update_task status` on a parent | `closedParts`; failed parts only in the log | — | `task-part-closure.ts` | High |

## Relevant Codebase And Technical Facts

| Path | Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `project-store.ts` | `task.json` reader / writer | Comments are a new optional fact; absence = no comments | In `task.json` or a separate append-only file per Task |
| MCP adapter / native tool classes | Tool execution | The author must come from the caller's session, not from arguments | Pass the sender into Project Task tools |
| Root exact delivery | Message to a worker | Notification is feasible for agent-authored comments | A non-agent (user) sender kind for app comments; delivery when the hosting root is not active |
| Search service | Index items | Comments must be searchable on their own (long descriptions) | One index item per comment, mapped to its Task |

## Structural And Payload Surface Inventory

- Payload: `task.json` (or a sibling file) gains comments; GraphQL `ProjectTask`; `/ws/projects`; tool results; en / zh-CN strings.
- Structural: a new tool (or parameter); caller identity for Project Task tools; a server-originated delivery to a worker; search items per comment; the app's Task page thread and composer.
- Potential impacts: tool contract (High); collaboration delivery (new sender kind); persistence (optional field, no migration expected); concurrency (append under the Task lock).

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact |
| --- | --- | --- | --- | --- | --- |
| Python read-only scan of the user's `task.json` files | Description length | 181 of 309 descriptions exceed ~2,000 chars | Measured | Comments appended to the description text would be cut off by meaning search for most Tasks; each comment needs its own search item (DEC-010) | Command in the Source Log |

## Stakeholder And User Evidence

| Source | Need | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| User 2026-10-21 | Add a comment without rewriting the description | Direct | UC-001–UC-003 | Tool contract (DEC-003) |
| User 2026-10-21 | "comment", Jira-like thread with author and time | Direct (relayed) | REQ-001 | Edit / delete (DEC-001) |
| Task text | Fewer manual steps; a running worker should learn about the change | Direct | UC-005 | DEC-002 |
| User, earlier rule | No tool exposed to agents automatically | Direct | REQ-010 | — |
| User, SR-003 of task-part-of | No backward-compatibility code | Direct | Same policy | — |

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint | Risk |
| --- | --- | --- | --- |
| Data migration guideline | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Optional field with truthful absence: no migration | Low |
| Collaboration model CM-4 / CM-6 | `docs/design/collaboration_model.md` | Messages reach runs only by existing delivery; closing a Task stops its runs | Notification must use the existing delivery |

## Persisted Data And State Facts

- Subject: Project Task storage under `<appData>/projects/<projectId>/tasks/<taskId>/`.
- Volume: 309 Tasks on the user's node; no comments yet.
- Readers / writers: `ProjectStore` only.
- Preserve: everything; existing Tasks have no comments.
- Acceptable loss: none.

## Product Design Request Context

- Request in the current input: `Not stated` for a design step. The Task says "shown in the app's Task page under the description" and "the user in the app can add a note". The last Task-relationship step used a Product design step that the user approved.
- The proposal (DEC-007) is to ask the user.

## Product Design Findings

- N/A — none yet.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `follow-ups.md` (this folder) | Solution Designer | Follow-ups found | Open |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| RSK-001 | Risk | A worker woken for every comment could be distracted or cost tokens | DEC-002 (the user decides) | Open |
| UNK-001 | Unknown | Delivery of an app (user) comment needs a non-agent sender in the exact delivery | Architecture phase (feasible: system notifications exist) | Open |
| UNK-002 | Unknown | Delivery when the hosting root (e.g. the Project Task Manager's run) is not active | Architecture phase; requirement: the comment is saved, the result says the worker was not told | Open |

## Part 2 Investigation — parts delegated to the parent's copy (2026-10-21)

Trigger: the Task text, Part 2 (added 2026-10-21; the user: "this is the problem with our delegate task management"). The Project Task Manager's direction: evaluate first the user's starting point, letting `delegate_task` give a part to the copy whose current Task is its parent. Also folded into the Task: `autobyteus-260` (leave empty fields out of agent tool results; coordinate the contract).

| ID | Source | Finding | How established |
| --- | --- | --- | --- |
| P2-001 | `src/projects/domain/task-execution-resources.ts` | A Task's `agent_run_resources.json` holds one entry per assignment period of a copy (`role`, `assignedBy`, `closedAt`, …). `assertTaskExecutionAssignable` refuses an existing copy whose current entry is open: "This task agent still works on Task … Set it to DONE or CANCELLED first …". The rule knows nothing about parts | Read |
| P2-002 | `src/projects/services/task-execution-resource-service.ts` (`currentByExecution`, `currentOf` at about 12 call sites: `linkInherited`, `historyOf`, `rootTaskLocationOf`, `isOpen`, `locationOf`, `releasableByHostRoot`, …) | "One current Task per copy" is an in-memory view built from the files: one current entry per copy. Sub-work (`role: delegated`) joins the creator's current Task; closure releases the copies whose current Task it is; the tree shows a worker's current Task | Read |
| P2-003 | `root-task-execution-lifecycle.ts` `assignToExistingCopy` / `prepareClosedCopyForResume`; `task-execution-input.ts` `buildExistingCopyTaskMessage` | A copy whose current Task is closed can be given another Task by its last assigner. It is resumed with its conversation (context kept), and the new Task's description is its first message ("New Task assigned to you: … Your previous Task is closed …") | Read |
| P2-004 | `task-part-closure.ts`; collaboration model CM-6 | Closing a parent closes its open parts and stops their runs | Read |
| P2-005 | The user's data (read-only): `autobyteus-25` (parent, IN_PROGRESS), parts 191, 245, 247, 261 | Matches the Task text: the parent occupies the copy; the parts were given by message | Read (Task text) |
| P2-006 | `autobyteus-260` Task text | Wants empty fields left out in every agent tool result; asks to coordinate with 259 and 187 | Read |

Consequences:
- **The user's option** (copy holds the parent and one part) breaks the one-current-Task invariant for exactly one case. Each call site of P2-002 needs a rule. Proposed: the open part is the work in progress (sub-work joins it, the tree shows it); the parent stays open; a copy is stopped only when it has no open assignment left.
- **Parts only, never the parent** already works today (P2-003): close part 1, then `delegate_task` part 2 to the same copy, which resumes with its conversation. Gaps: the parent shows no team, and the copy is stopped between parts.

## Architecture Investigation Findings

Gathered 2026-10-22 after SR-011. Design reading gate: `references/architecture-design.md`, `references/design-principles.md` (unchanged from the version read on 2026-10-19), `DESIGN.md` at `786055f3d7` (new rule 9: no compatibility between software versions), `autobyteus-server-ts/docs/design/data_migration_guideline.md` (new "Rolling back after a migration").

| ID | Source | Finding | Design Implication | How established |
| --- | --- | --- | --- | --- |
| AF-001 | `project-store.ts` `readTaskFile` / `taskFileContent` / `updateTask` | Tolerant projection reader; exact writer; `updateTask` is a locked read-modify-write of one `task.json` | Comments are read and written in the same file and lock; concurrent adds serialize (QR-001) | Read |
| AF-002 | `project-task-service.ts` (481 lines) `update()` | Shared patch body for GraphQL and tools; meaningful change bumps `updatedAt`; DONE / CANCELLED via `closeAndWrite` then the part cascade | `addComment` joins the patch. The comment rules go to a small domain file so the service stays under 500 lines | Read |
| AF-003 | `api/graphql/types/project-tasks.ts` | `UpdateProjectTaskInput.description` is required; there is no status mutation | The app's composer needs its own mutation (`addProjectTaskComment`), not `updateProjectTask` | Read |
| AF-004 | `project-change-messages.ts` | Strict `projectTaskSchema` | Add `comments` | Read |
| AF-005 | `agent-tools/project-tasks/*` | `update_task` parser and manifest; `TaskPartClosure.closeOpenParts` returns closed keys and only logs failures | `add_comment` param; `partsNotClosed` from the closure | Read |
| AF-006 | `search/project-task-search-service.ts` | The exact tier is description containment; meaning items are the description | Add comment containment to the exact tier only; meaning items unchanged (fingerprints unchanged, no reindex) | Read |
| AF-007 | `autobyteus-web/composables/projects/useProjectTaskSearch.ts` → `searchProjectTasks` | The board's search uses the same server search | The board will also find Tasks by comment text: one rule for agents and the app | Read |
| AF-008 | `task-execution-resource-port.ts` `resolveAssignment`; `root-task-execution-lifecycle.ts` lines 144, 181; `task-execution-input.ts` `taskBodyLines` | Both saved-Task delegation paths (new copy, existing copy) take `description` from `resolveAssignment` and build the text with `taskBodyLines` | Add `comments` to the port result and a "Comments:" block to `taskBodyLines` (REQ-012) | Read |
| AF-009 | `autobyteus-ts/src/utils/parameter-schema.ts` | `ParameterType` has STRING, OBJECT, ARRAY | `add_comment` is a STRING | Read |

## Requirement Implications

- Author must be server-derived (session sender or "user") so comments are trustworthy.
- Meaning search must index comments one by one (the measured lengths).
- Notification reuses the existing exact delivery; a user (app) sender is new.

## Notes For Architecture Design

- Storage choice and append concurrency; search item mapping; caller identity for Project Task tools (native and MCP); delivery sender kind and inactive-root behavior.
