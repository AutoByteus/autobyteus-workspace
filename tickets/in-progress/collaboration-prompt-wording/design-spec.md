# Design Spec — `collaboration-prompt-wording`

## Solution And Approval Basis

- Requirements: [`requirements-doc.md`](requirements-doc.md) `Approved` (SR-001).
- Wording authority (exact text, behavior-defining):
  [`wording/collaboration-prompt-wording-proposal.md`](wording/collaboration-prompt-wording-proposal.md);
  complete views [`wording/collaboration-prompt-complete-views.md`](wording/collaboration-prompt-complete-views.md).
- Evidence: [`investigation-notes.md`](investigation-notes.md) (IN-001..IN-010).
- Base: `origin/personal` `3712cd9bf0`; branch `codex/collaboration-prompt-wording`.
- Design principles: `DESIGN.md` (smallest coherent change, existing owners); the
  [Collaboration Model](../../../autobyteus-server-ts/docs/design/collaboration_model.md) is
  unchanged (this ticket changes text, not rules).

## Current-State Read

Agent-facing collaboration text lives in about ten source files (IN-001), chosen by
`teamScoped` (IN-002), written in system vocabulary, partly contradictory, repeating facts, and
exposing addresses that do not reach task agents (IN-005). The `@` note is decided for the run,
not the viewer (IN-008).

## Task Size And Architectural Risk (Mandatory)

- **task_size = Medium.** About 20 source files and their tests across server, the presentation
  contracts package and one web parser check; one wording authority to transcribe.
- **architectural_risk = Low.** No tool behavior, refusal condition, resolution rule, lifecycle
  or persisted data changes. New internal facts: one `collaborationRole` on the member context,
  computed by the existing scope owner (IN-003), and a viewer relation passed into the existing
  mention resolution (IN-008). The only shared contract changed (`@` note compose) keeps parsing
  every earlier form.
- Route: direct implementation (team rule: Medium and Low).

## Architecture Investigation Evidence

IN-002/IN-003 (role owner and its inputs), IN-004 (handoff rules known at build), IN-005/IN-006
(address reachability; own address never needed), IN-007 (header readers), IN-008 (viewer at the
mention gate; `isOwnTeamAddress` on every index), IN-009/IN-010 (texts and pins).

## Intended Change

1. Choose the prompt from an explicit role (REQ-001), render the wording authority's sections
   (REQ-002, REQ-003), with no own address (REQ-004).
2. Replace tool and parameter descriptions (REQ-007).
3. Task message and received-message header without addresses (REQ-005, REQ-006).
4. Refusal and result texts in the vocabulary (REQ-008).
5. `@` note per viewer (REQ-009).
6. Docs (REQ-011); optional UI badge (REQ-010).

## Change Scope (Mandatory)

In: the files of the Final File Responsibility Mapping, their tests, the docs listed, the
contracts `dist/`, and (SR-003) returning the delivery-scope refusal of
`RootCommunicationEngine.deliver` as a result. Out: anything that changes who may message or delegate, tool exposure,
storage, migrations, user-facing Settings/history texts (except REQ-010). A problem found
outside this scope becomes a follow-up for the Project Task Manager.

## Relevant Behavior And Production-Path Map (Mandatory)

| Path | Today | After |
| --- | --- | --- |
| Member context build (Team/Org/Agent roots) | `teamScoped`, handoffs, instruction | + `collaborationRole` from `resolveMemberCollaborationScope` (or `standalone_agent` from the host builder) |
| Prompt compose (`buildSharedCarpenterPromptSections`) | `teamScoped` switch → standalone or team template | switch on `collaborationRole`; §5.3 when `outgoingHandoffs.length > 0` |
| Tool registration (native + MCP) | constants in LLM contract and tool contracts | same constants, new text |
| `delegate_task` dispatch → task message | `buildTaskWorkText` with address | name + ID only |
| Message delivery → header (3 builders) | name, address, ID | name, ID |
| User message with `@` → note | presence for the run | relation for the focused agent |
| Tool refusals | system vocabulary | §7.3 vocabulary |

## Relevant Supplemental Task Artifacts

The wording authority and complete views (above). `build-complete-views.py` regenerates the
views; the implementation's snapshot tests are compared with them.

## Task Design Health Assessment (Mandatory)

- Owners exist for every concern: the scope resolver (role), the composer (sections), the LLM
  contract and tool contracts (descriptions), the task input builder (task message), the three
  header builders, the mention-note contract (note), the error sites (refusals). No new owner,
  service or layer.
- The one structural improvement: three prompt renderer files collapse into one owner of the
  collaboration prompt sections.
- No speculative machinery: the role is a closed union computed once at context build.

## Terminology

Agent-facing words are the wording authority §2. Code identifiers keep their names (`copy`,
`collaborator` in symbols are covered by follow-up FU-1 of `collaboration-model-contract`).

## Legacy Removal Policy (Mandatory)

Removed, not kept beside the new path: `standalone-collaboration-instruction.ts`,
`member-collaboration-instruction-renderer.ts`, `team-collaboration-instruction-renderer.ts`,
`WORK_REQUEST_EXECUTION_LLM_INSTRUCTION`, `RULE_BASED_HANDOFF_LLM_INSTRUCTION`,
`AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION`, the note's `IN_RUN_GUIDANCE`/`NOTE_GUIDANCE`
composition. Kept only as readers of saved data: the note's earlier guidance strings
(parse-only, already the pattern), the optional `sender address` in the web header regex, and
the frozen Org-history migration reader.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

No persisted shape changes. New messages are saved with the new header and note text; saved
messages keep theirs. Readers accept both (IN-007, IN-008). No migration (Data Migration
Guideline: tolerant reader, nothing to convert).

### Migration Plan

None.

## Data-Flow Spine Inventory

1. Context build → role → prompt compose.
2. Delegation → task message.
3. Message delivery → header.
4. User send with mentions → mention resolution → note compose → stored and parsed.

## Primary Execution Spine(s)

Spine 1 is primary: `<root builder> → resolveMemberCollaborationScope → MemberExecutionContext
(collaborationRole, outgoingHandoffs) → buildSharedCarpenterPromptSections →
renderCollaborationSections → runtime bootstrap (native/Codex/Claude/ACP/AGY)`.

## Spine Narratives (Mandatory)

- **Spine 1.** Every root builds each agent's context through the scope resolver, which already
  knows whether the agent is a direct member of a team instance (hostTeam) or sits at a
  configured root placement. Adding the agent's run ID and the root's configured agent run IDs
  lets it tell a configured agent from a task agent at the same address. The role is stored on
  the context; the composer switches on it and appends Handoffs when the agent has rules.
- **Spine 2.** `buildTaskWorkText` formats the first line from the delegator's address basename
  (label) and run ID. `buildExistingCopyTaskMessage` (mode 3) is delivered as a message, which
  already carries the header with the sender's name and ID, so its body keeps the "New Task
  assigned to you" line and the description without the "You have a new task from" line.
- **Spine 3.** Each header builder drops the address part; the web regex already makes it
  optional.
- **Spine 4.** At the mention gate each root knows the focused agent; it passes a relation
  function to `CollaboratorAdmission.resolveMentions`, which refines presence; the contract
  composes one line per mention with its guidance and parses new and earlier forms.

## Spine Actors / Main-Line Nodes

Root builders (Team `member-team-context-builder.ts`, Org `agent-org-execution-scope-builder.ts`,
Agent `standalone-root-builder.ts`, `standalone-host-member-context-builder.ts`); scope resolver;
member context; composer; collaboration prompt sections; tool contracts; task input builder;
header builders; mention admission; mention-note contract.

## Ownership Map

| Concern | Owner |
| --- | --- |
| Which role an agent has | `member-instance-scope.ts` `resolveMemberCollaborationScope` (+ host builder for `standalone_agent`) |
| Collaboration prompt text and assembly | new `agent-execution/prompt/collaboration-prompt-sections.ts` |
| `send_message_to` / `delegate_task` descriptions | `agent-team-collaboration-llm-contract.ts` (descriptions only after the change) |
| Other tool descriptions | their existing contract files |
| Task message | `task-execution-input.ts` |
| Header | the three builders (IN-001) |
| Viewer relation for mentions | each root (it owns its index and gate) |
| Note wording | `collaborator-mention-note.ts` |

## Thin Entry Facades / Public Wrappers (If Applicable)

None added.

## Removal / Decommission Plan (Mandatory)

Delete the three renderer files and the three instruction constants (Legacy Removal Policy);
update their importers (`carpenter-prompt-composer.ts`) and tests. Delete composition of the
note's old guidance; keep the strings for parse.

## Return Or Event Spine(s) (If Applicable)

Tool results and refusals (T-3) travel the existing return paths; only texts change.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

Docs (REQ-011): `docs/modules/prompt_engineering.md`, `docs/modules/agent_communication.md`
(header shape, note), `docs/design/collaboration_model.md` (one line: agent-facing vocabulary is
the wording authority's), any module doc quoting the old texts (grep "Task delegator",
"Mentioned collaborators", "Your address in this run").

## Ownership Boundaries

The role is decided where scope is decided, never re-derived in the composer from addresses.
Prompt text lives in one file; tool text stays with each tool's contract. The contracts package
owns note compose/parse; the server owns the relation.

## Boundary Encapsulation Map

The composer reads only `MemberExecutionContext` (`collaborationRole`, `identity.root`,
`collaboration.outgoingHandoffs`). The admission reads a `MentionViewerRelation` function, not
the root's index.

## Dependency Rules

`agent-execution/prompt` may import from `agent-collaboration/domain` and
`agent-collaboration/execution/domain` (as today); no new import from `agent-team-execution`
into the composer (the team renderer import goes away).

## Interface Boundary Mapping

```ts
// agent-collaboration/execution/domain/member-instance-scope.ts
export type MemberCollaborationRole = "standalone_agent" | "task_agent" | "team_member" | "org_agent";
export type MemberCollaborationScope = Readonly<{
  outgoingHandoffs: readonly CollaborationHandoff[];
  instructionDefinition: MemberInstructionDefinition | null;
  role: Exclude<MemberCollaborationRole, "standalone_agent">;
}>;
// input gains: agentRunId: string; root.configuredRootAgentRunIds: Iterable<string>
// (Team: teamNode.children agent run IDs; Org: rootOrg.members with agentRunId; Agent root: []).
// role: case (1) direct member of a non-root team instance → "team_member";
//       case (2) root-level placement whose run ID is configured → "team_member" (Team root) or
//                "org_agent" (Org root); a task agent at a configured address → "task_agent"
//                (it keeps the root's handoffs, as today);
//       case (3) → "task_agent".

// member-execution-context.ts: MemberExecutionContext gains
readonly collaborationRole: MemberCollaborationRole; // required in the constructor

// agent-execution/prompt/collaboration-prompt-sections.ts
export const renderCollaborationSections = (context: MemberExecutionContext): string;
// standalone_agent → §4.1; task_agent → §4.2; team_member → §5.0 + §5.1
// (organization_line when identity.root.rootSubjectKind === "agent_org"); org_agent → §5.0 + §5.2;
// + §5.3 appended to the Working With Other Agents section when outgoingHandoffs.length > 0.
// "## Team Instruction" (authoredEnclosingScopeInstruction) is rendered, as today, before the
// addressing/collaboration sections whenever it is present, for every role (a task agent at a
// configured team placement keeps its team's instruction and handoffs, as today).

// collaborator-admission.ts
export type MentionViewerRelation = (address: AgentTeamAddress) => "self" | "own_team" | "other";
resolveMentions(port, definitions, relation: MentionViewerRelation)
// presence: not_in_run (no placement) | run_agent | self | own_team | in_run (placement, "other")

// collaborator-mention-note.ts
export type MentionedCollaboratorPresence = "not_in_run" | "in_run" | "own_team" | "self" | "run_agent";
// compose: heading "[Mentioned agents]", one line per entry with its guidance (wording §8);
// parse: the new form and every earlier form (heading "[Mentioned collaborators]", suffixes,
// guidance lines) — earlier forms map to the presences they had.
```

Each root builds the relation from its index for the focused agent:
`address === focused.address → "self"`; `index.isOwnTeamAddress(focusedId, address) → "own_team"`;
else `"other"`.

## Interface Boundary Check

Every caller of `resolveMemberCollaborationScope` and of `MemberExecutionContext` is updated
(three roots, host builder, tests). Every caller of `resolveMentions` passes a relation.

## Main Domain Subject Naming Check

`collaborationRole`, `MemberCollaborationRole`, `MentionViewerRelation`: name what they are.

## Existing Capability / Subsystem Reuse Check

Reuses the scope resolver, `isOwnTeamAddress`, the existing gates, the contract parse pattern
for saved forms, the web header regex.

## Subsystem / Capability-Area Allocation

Server: role, prompt, tool texts, task message, headers, refusals, relation. Contracts package:
note. Web: no logic change (verify parse of new note and header); optional badge.

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

The wording sections are string constants in one file; no generic templating.

## Shared Structure / Data Model Tightness Check

`MemberCollaborationRole` is a closed union; `MentionedCollaboratorPresence` grows by two values
used by compose and parse only.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `agent-collaboration/execution/domain/member-instance-scope.ts` | role in scope (Interface) |
| `agent-collaboration/execution/domain/member-execution-context.ts` | `collaborationRole` |
| `agent-team-execution/services/member-team-context-builder.ts` | pass run ID, configured run IDs; set role |
| `agent-org-execution/services/agent-org-execution-scope-builder.ts` | same |
| `standalone-agent-run-root/services/standalone-root-builder.ts` | same (configured run IDs empty) |
| `standalone-agent-run-root/services/standalone-host-member-context-builder.ts` | role `standalone_agent` |
| `agent-execution/prompt/collaboration-prompt-sections.ts` (new) | wording §4.1, §4.2, §5.0–§5.3 and `renderCollaborationSections` |
| `agent-execution/prompt/carpenter-prompt-composer.ts` | use it; drop `teamScoped` switch |
| `agent-execution/prompt/standalone-collaboration-instruction.ts`, `agent-team-execution/services/member-collaboration-instruction-renderer.ts`, `agent-team-execution/services/team-collaboration-instruction-renderer.ts` | delete |
| `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | wording §6 descriptions; delete instruction constants |
| `agent-tools/agent-discovery/list-available-agents-contract.ts` | wording §6 |
| `agent-communication/services/get-handoff-rules-tool-contract.ts` | wording §6 |
| `agent-tools/project-tasks/project-task-tool-contract.ts` | `update_task`, `list_project_tasks` wording §6 |
| `agent-collaboration/execution/task/task-execution-input.ts` | wording §7.1 (SR-003 text) |
| `agent-collaboration/execution/communication/root-communication-engine.ts` | T-4; T-3 engine texts |
| `agent-communication/services/global-agent-run-message-router.ts`, `agent-collaboration/execution/backends/root-agent-execution-registry.ts`, the `send_message_to`/`delegate_task` tool boundaries | T-3 SR-003 rows |
| the three header builders (IN-001) | wording §7.2 |
| refusal sites (T-3) | wording §7.3 |
| `agent-collaboration/collaborators/collaborator-admission.ts` + the three roots' mention paths (`team-run-collaborators.ts`/`root-team-run.ts`, `agent-org-run-collaborators.ts`/`agent-org-run-message-delivery.ts`, `standalone-root-collaborators.ts`) | viewer relation |
| `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` (+ `dist/`, tests) | wording §8 compose; parse all forms |
| `autobyteus-web` | verify note/header parse with new forms (tests); optional badge (REQ-010) |
| docs (Off-Spine) | update |

## Applied Patterns (If Any)

Tolerant reader for saved notes and headers.

## Target Subsystem / Folder / File Mapping

As the Final mapping.

## Folder Boundary Check

The new prompt sections file sits beside the composer in `agent-execution/prompt/`.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

**T-1 Role examples.** PTM in an Org run → `org_agent`. Code reviewer of a user-started team →
`team_member`. A member of the software engineering team task agent team created by the PTM →
`team_member` (organization line). An Agent task execution created by the PTM →
`task_agent` (no addressing section; `get_handoff_rules` still exposed by `teamScoped`; §5.3
only if it has rules). Host of a standalone run → `standalone_agent`; its Agent task execution →
`task_agent`.

**T-2 Header.** `You received a message from sender name: code_reviewer, sender id: <id>\nmessage:\n<content>`.

**T-3 Refusals and results (REQ-008).** New texts; codes unchanged.

| Site | Now | New |
| --- | --- | --- |
| `collaborator-errors.ts` `messageTargetNotFoundMessage` | "<a> is not in this run. To give work to an outside Agent or Team, use delegate_task, then send_message_to its run ID." | "No agent or agent team you can talk with has the address <a>. To have a task done by a new agent, use delegate_task; then talk with it by its ID." |
| `collaborator-errors.ts` `ownTeamDelegationRefusedMessage` | "<a> is in your own team. Use send_message_to with recipient_address <a>." | "<a> is in your own team; you can't delegate to it. Talk with it using send_message_to." |
| `collaborator-errors.ts` `delegationTargetUnavailableMessage` | "'<a>' is not a mounted Agent or Agent Team or an available agent of this run." | "'<a>' is not the address of an available agent or agent team. If you have list_available_agents, it shows the addresses you can use." |
| `root-task-execution-lifecycle.ts` `TASK_AGENT_RESOURCE_OWNED_SENDER` (×2) | "Task workers delegate sub-work without task_id." | "You are a task agent, so you can't use task_id. Delegate with a description instead; that work is part of your Task." |
| `root-task-execution-lifecycle.ts` / `root-task-execution-resource-scope.ts` closed | "The Task work for this agent run is closed (its Task is DONE or CANCELLED)." | "Your Task is DONE or CANCELLED, so you can't start new work." |
| `root-task-execution-lifecycle.ts:192-193` not delivered | "Task <t> was assigned to the copy but its work was not delivered (<r>). Message the copy's ingress <id>, or mark Task <t> CANCELLED or delegate it to a new copy." | "Task <t> was given to the task agent, but the message with its work was not delivered (<r>). Message the task agent's ID <id>, or set Task <t> to CANCELLED, or delegate it to a new task agent." |
| `root-task-execution-lifecycle.ts:267` + `task-execution-resources.ts` `ASSIGNER_ONLY_REACTIVATION_MESSAGE` | "This run is part of closed Task work. Only the run that assigned the work can reactivate it: …" / "… message the copy's agent run ID (for a Team copy, its coordinator's)." | "This task agent's Task is closed. Only the agent that assigned the Task can continue it: set the Task to TODO or IN_PROGRESS, then message the task agent's ID (for a task agent team, its coordinator's ID)." |
| `root-task-execution-lifecycle.ts` reactivated suffixes | "<id> was reactivated." / "… was reactivated (its Task work is open again) but did not receive this message; message it again." | "<id> continues with its conversation." / "<id> continues with its conversation (its Task is open again) but did not receive this message; send it again." |
| `root-task-execution-lifecycle.ts` `ROOT_RUN_NOT_ACTIVE` | "The collaboration root is not accepting deliveries/commands/task commands." | "This work is stopping or has stopped, so the message or delegation was not sent." |
| `root-task-execution-resource-scope.ts` `TASK_AGENT_RESOURCE_CONFLICT` | "A Task-owned worker cannot message another Task's work." | "You can't message this agent: it works on a different Task." |
| `root-task-execution-resource-scope.ts:34` | "Task agent run resources are unavailable in this scope." | "Tasks are not available here, so this delegation can't be recorded." |
| `root-task-dispatch.ts:40` | unchanged wording check: "The Task was marked DONE or CANCELLED; its new work was not started." | keep |
| `task-execution-live-holds.ts:38` | "This copy is being stopped by the user." | "The user is stopping this task agent." |
| `existing-copy-target.ts` `notACopyOfThisRun` | "<id> is not a delegated copy in this run. Use the ID delegate_task returned for a copy delegated in this run, or delegate to a new copy with recipient_address." | "<id> is not one of your task agents. Use an ID that delegate_task returned to you, or delegate to a new task agent with recipient_address." |
| `existing-copy-target.ts` coordinator / team ID / member / agent ID refusals | "… coordinator of Team copy …", "… a Team copy's team run ID …", "… a member of Team copy …, not a copy itself …", "… an Agent copy's agent run ID …" | "<id> is the coordinator of task agent team <t>; use target_team_run_id \"<t>\"." / "<id> is a task agent team's ID; use target_team_run_id \"<id>\"." / "<id> is a member of task agent team <t>; to give that team a Task, use target_team_run_id \"<t>\"." / "<id> is a task agent's ID; use target_agent_run_id \"<id>\"." |
| `task-execution-resources.ts:104` | "This copy already works on this Task." | "This task agent already works on this Task." |
| `task-execution-resources.ts` `newCopyHint` | "or delegate Task <t> to a new copy with recipient_address." | "or delegate Task <t> to a new task agent with recipient_address." |
| `task-execution-resources.ts:163` | "This copy belongs to no Task; delegate Task <t> with recipient_address instead." | "This task agent has no Task; delegate Task <t> with recipient_address instead." |
| `task-execution-resources.ts:166-167` | "This copy is sub-work or a helper of a Task worker, not an assignment; only an assigned copy can be given a new Task. …" | "This task agent works on part of another agent's Task, so you can't give it a Task. Delegate Task <t> to a new task agent with recipient_address." |
| `task-execution-resources.ts:170` | "Only the run that made this copy's most recent assignment can give it a new Task; …" | "Only the agent that gave this task agent its most recent Task can give it a new one; …" |
| `task-execution-resources.ts:174-175` | "This copy still works on Task <c> (<s>). Mark it DONE or CANCELLED first, or delegate …" | "This task agent still works on Task <c> (<s>). Set it to DONE or CANCELLED first, or delegate …" |
| `task-execution-resources.ts:178-179` | "This copy's most recent assignment is already Task <t>. To continue it, reopen … then message the copy (for a Team, its coordinator)." | "This task agent already has Task <t>. To continue it, set Task <t> to TODO or IN_PROGRESS, then message the task agent's ID (for a task agent team, its coordinator's ID)." |
| `task-execution-resources.ts:182` | "This copy never started, so it has no conversation to resume; …" | "This task agent never started, so it has no conversation to continue; …" |
| `project-task-service.ts:370-371` | "This Task is <s>. The run that assigned it can reopen the Task (move it to TODO or IN_PROGRESS) and then message this run ID again." | "This Task is <s>. The agent that assigned it can set the Task to TODO or IN_PROGRESS and then message this ID again." |
| `project-task-service.ts` `notCurrentTaskMessage` | (check for "copy"/"run") | vocabulary |
| `task-delegation-tool-input-parsers.ts` | "(a Team copy)" / "(an Agent copy)" / "for a new copy … for an existing copy" / "task_id (an existing copy takes a saved Task)" | "(a task agent team)" / "(a task agent)" / "for a new task agent … to give a Task to one of your task agents" / "task_id (the saved Task to give)" |
| `agent-team-address.ts` `COLLABORATION_ADDRESS_INVALID`, when it reaches an agent through `send_message_to` or `delegate_task` (SR-003) | "AgentTeam address '<x>' is invalid: <detail>" | "'<x>' is not a valid address (<detail>). An address is exact and begins with '/', for example /team/agent. To answer an agent that wrote to you or gave you a task, use target_agent_run_id with its ID instead." Convert at the two tools' boundary (the shared validator keeps its text for definition and configuration callers). |
| `global-agent-run-message-router.ts` `TARGET_AGENT_RUN_NOT_ACTIVE` (SR-003) | "Exact AgentRun target '<id>' is not active." | "No running agent has the ID '<id>', so the message was not sent. Use an exact ID you were given: the one in your task message, a message's sender id, or one delegate_task returned to you." |
| `global-agent-run-message-router.ts` "… rejected the message." (SR-003) | "<id> rejected the message …" | "The agent '<id>' did not accept the message: <reason>." (keep the reason when there is one) |
| `root-communication-engine.ts` `COLLABORATION_SELF_TARGET_REJECTED` (SR-003) | "An AgentRun cannot send an ordinary collaboration message to itself." | "You can't send a message to yourself." |
| `root-communication-engine.ts` `COLLABORATION_CONTEXT_REQUIRED` (SR-003) | "Sender and receiver must be exact live executions in the same collaboration root." | "The agent with that ID is not running here, so the message was not sent. Use an exact ID you were given." |
| `root-agent-execution-registry.ts` "Root-hosted AgentRun '<id>' is not active." / "Task AgentRun '<id>' is shut down." (SR-003) | as quoted | "The agent '<id>' is not running, so the message was not sent." / "The task agent '<id>' has stopped, so the message was not sent." (teardown-internal texts stay) |

**T-4 Delivery-scope refusal surfaced as a result (SR-003, DEC-009).** In
`RootCommunicationEngine.deliver` (`root-communication-engine.ts:40-41`), the first
`assertAllowed()` call converts a `TaskDelegationError` whose code is a refusal code
(`TASK_AGENT_RESOURCE_CLOSED`, `TASK_AGENT_RESOURCE_CONFLICT`; the existing `refusalCode`
helper's set) into `{ accepted: false, code, message }`. Anything else still throws. The later
re-checks inside reservation and commit keep throwing (a race between check and commit is not a
normal agent path). The refusal condition does not change. Tests: native and MCP
`send_message_to` across Tasks and to a closed Task return the refusal result with the §7.3 text.

Internal-invariant messages that an agent cannot normally trigger ("A Team agent run needs its
coordinator.", "The agent run is already linked to this Task.", schema "Duplicate AgentRun ID")
are out of scope. Any other agent-reachable text found while editing these files follows the
same rule; list it in the implementation handoff.

## Backward-Compatibility Rejection Log (Mandatory)

- Rejected: keeping the old prompt templates behind a flag — one wording, no parallel path.
- Rejected: keeping "sender address" in headers for old agents — saved messages keep theirs;
  new messages need no address.
- Kept (read-only): parsing earlier note forms and header forms — saved history must display.

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Role: scope resolver + context + builders (+ tests per root kind, T-1).
2. Prompt sections file + composer; delete the three renderers; snapshots for every §3 row.
3. Tool descriptions (native + MCP share constants; snapshot both).
4. Task message, headers; web parse tests for the new header.
5. Refusals (T-3) with tests.
6. Mention relation + note compose/parse (+ contracts `dist/`), web parse test.
7. Forbidden-word test over rendered agent-facing texts (wording §10 check 9).
8. Docs.

## Key Tradeoffs

- The role sits in the scope resolver (one owner) instead of being derived in the composer from
  addresses (which cannot tell a task agent from a configured agent at the same address).
- `get_handoff_rules` exposure stays on `teamScoped` (out of scope); an agent may have the tool
  with an empty rule list and no Handoffs text — harmless.

## Risks

- R-1: models trained on the old prompt shape behave differently. Mitigation: AC-008 live
  journeys on an isolated instance.
- R-2: missing a refusal site. Mitigation: T-3 plus the forbidden-word test over messages
  produced in tests; implementer lists additions.
- R-3: a run started before the upgrade may keep the system prompt it was started with on
  runtimes that store it in their session, while tool descriptions and messages use the new
  text. Both describe the same behavior, so nothing contradicts in effect; new runs get only
  the new text. Accepted (no session rewriting).

## Guidance For Implementation

- Transcribe the wording authority exactly; generate expected snapshots from the complete views
  where possible. Any wording change needed returns to the Solution Designer.
- Validation (TESTING.md): server unit/integration/typecheck; contracts package tests and
  `dist/` rebuild; web unit tests for parse; rendered-prompt snapshots for every §3 row on the
  native, Codex and Claude paths; AC-008 as revised in SR-003 (repeated samples per runtime,
  branch vs base, helper traces kept) on test-owned data roots and an isolated desktop instance.
