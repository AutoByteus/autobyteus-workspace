# Prompt Engineering And Runtime Instruction Composition

## Scope

This module covers the platform-owned Carpenter composition used to construct the
stable runtime instructions for native AutoByteus, Codex App Server, and Claude
Agent SDK runs. (The old persisted/versioned prompt lookup under
`src/prompt-engineering` and its GraphQL prompt API no longer exist.)

The Carpenter boundary supplies shared identity and team context to every
runtime. Native AutoByteus additionally receives workspace facts and the
platform-owned Bash/file operating practice. It does not turn agent definitions
into an open-ended prompt processor pipeline and does not encode tool schemas in
text.

## TS Source

- `src/agent-execution/prompt/carpenter-prompt-composer.ts`
- `src/agent-execution/prompt/carpenter-prompt-sections.ts`
- `src/agent-execution/prompt/markdown-heading-containment.ts`
- `src/agent-execution/prompt/collaboration-prompt-sections.ts`
- `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` (tool descriptions)
- native `autobyteus-ts` `SystemPromptProcessingStep` and
  `appendConfiguredSkillsCatalog`

## Main Services

- `composeSharedCarpenterPrompt(...)`
- `composeNativeAutoByteusPrompt(...)`

Carpenter composition is pure and fail-fast. Shared
composition accepts the selected agent definition and optional validated
`MemberTeamContext`; native composition adds the exact absolute workspace.

## Runtime Instruction Ownership

Each section has one owner:

| Section | Source / owner | Presence |
| --- | --- | --- |
| `Agent Identity` | Selected `AgentDefinition`: required name, optional description, optional `agent.md` body | Always |
| `Team Instruction` | Exact non-blank selected `team.md` body | Whenever the run has one (any role), after Agent Identity |
| `Working With Other Agents` (and, for team and organization members, `AgentTeam Addressing` before it) | The member's `collaborationRole` (`standalone_agent`, `task_agent`, `team_member`, `org_agent`) and `renderCollaborationSections(...)`, the one owner of the collaboration text | Every run that has a member context, shared across runtimes |
| `Handoffs` (a subsection) | The same renderer | Only when the agent has handoff rules |
| `Project` | `renderProjectSection` from `AgentRunConfig.project`, which the run's config builder reads with `RunProjectContextReader.contextOfRun(root)` from the Project's [`project_runs.json`](./projects.md#runs-started-under-a-project) and the Project's current name | Only for a run started under a Project (an Agent run, or every member of a Team run, by the Team's run id), on start and on every restore (Antigravity restores its start-time instructions, which already hold it); omitted when the Project was deleted. Org members and Task copies get none |
| `Working Environment` | Exact absolute effective workspace selected for the run | Native AutoByteus only |
| `Bash Operating Practice` | Platform-owned fixed Carpenter text | Native AutoByteus only |
| `File And Directory Practice` | Platform-owned fixed Carpenter text | Native AutoByteus only |
| `Skills` | Ordinary configured skill resolver and provider-specific skill projection | Only when configured skills apply |

The shared logical order is Agent Identity, optional Team Instruction, the
collaboration sections for the agent's role, and the optional Project section.
It reads: "You work in the Project <name> (Project ID <id>). Use this Project ID
with the Project tools; ask the user before working on another Project." All
five runtime paths (native AutoByteus, Codex, Claude, Antigravity, ACP/Grok)
compose it the same way. Native AutoByteus appends
Working Environment, Bash Operating Practice, and File And Directory Practice
in that order, then the native core appends its terminal configured-skills
catalog. Blank optional values omit their line, subsection, or section; they do
not produce empty headings. An invalid required name, native workspace, Team
identity/delivery binding, or unresolved Carpenter placeholder stops bootstrap
before provider invocation.

Authored ATX headings in `agent.md` and `team.md` are shifted beneath their
owning section. A heading inside a same-or-longer Markdown fence remains content,
not structure. This keeps authored bodies intact without allowing them to escape
`Responsibilities and Boundaries` or `Team Instruction`.

## Agent Authoring Contract

Use `agent.md` for agent-specific responsibilities and boundaries. Do not repeat
platform foundation text, skill bodies, temporary run state, or tool schemas.
For example:

```markdown
---
name: Release Reviewer
description: Reviews release readiness and rollback evidence.
category: delivery
---

Check that the tested candidate, durable documentation, and release notes agree.
Block publication when required evidence or a rollback path is missing.
```

This yields identity content shaped as:

```markdown
## Agent Identity

- Name: Release Reviewer
- Description: Reviews release readiness and rollback evidence.

### Responsibilities and Boundaries

Check that the tested candidate, durable documentation, and release notes agree.
Block publication when required evidence or a rollback path is missing.
```

The optional persisted `role` field is not rendered in Agent Identity. A team
member alias is separate current-run context and never replaces the agent
name. A blank `agent.md` body does not cause description to be copied into
Responsibilities and Boundaries.

Agent definitions select ordinary skills through `agent-config.json.skillNames`
and explicitly configured non-team tools through `toolNames`. They do not select
system-prompt processors: no current agent-definition field, core processor
list/default, registry, pipeline, or public extension export exists for mutating
this closed composition.

## Native AutoByteus Foundation Example

For a standalone native AutoByteus `Release Reviewer` running in
`/work/releases`, the native foundation begins as follows (the file-practice
list continues with the same platform-owned deterministic
inspection/edit/verification rules):

```markdown
## Agent Identity

- Name: Release Reviewer
- Description: Reviews release readiness and rollback evidence.

### Responsibilities and Boundaries

Check that the tested candidate, durable documentation, and release notes agree.
Block publication when required evidence or a rollback path is missing.

## Working Environment

- Agent workspace: `/work/releases`
- Use skills from their skill package directories to work on tasks in the agent workspace.
- A skill package directory contains the skill's instructions and bundled assets. It is not the agent workspace, and reading the skill does not change the agent workspace.
- Resolve skill-package references from the skill package directory. Resolve task and project locations from the agent workspace unless an explicit target says otherwise.
- Do not modify a skill package unless the task explicitly targets that skill package.
- With no working-directory override, `pwd` returns the agent workspace. An explicit working directory changes only that command's location; it does not redefine the workspace.

## Bash Operating Practice

- Use Bash for workspace navigation, targeted search, repository and project commands, processes, network operations, and verification. Prefer deterministic, targeted commands over broad directory listings.
- For file content, follow `File And Directory Practice` and prefer the exposed dedicated file tools. Use Bash for file inspection or modification when those tools are unavailable or cannot complete the operation after recovery.
- Prefer non-interactive, small, composable, project-native commands.

## File And Directory Practice

- Locate files and directories by intent instead of broadly listing them. For content searches, use `rg -n "term" path`; for filename discovery, use `rg --files path | rg "pattern"`; use constrained `find path -maxdepth N ...` only when filesystem traversal or metadata is the goal.
- When exposed, use `read_file` for file reading, `edit_file` for targeted regional changes to an existing file, and `write_file` for new files or deliberate whole-file replacement.
- Before every targeted `edit_file` change, use `read_file` to read the relevant current content of the original file unless it was read recently and has not changed.
- Build the regional `edit_file` patch from that latest content and preserve unrelated content. If the edit context fails or the file changed, use `read_file` again for the affected content, construct a new patch, and retry; do not blindly retry an unchanged patch.
- Preserve unrelated content and existing changes. Verify important file changes with an appropriate read, diff, parser, test, or project-native check.
```

The authoritative full fixed text is
`src/agent-execution/prompt/carpenter-prompt-sections.ts`. Project or task
instructions can narrow the work, but agent authors must not replace this
platform foundation with a second generic advice block.

## Collaboration Sections By Role

The collaboration text is written for the agent that reads it (wording authority:
[the `collaboration-prompt-wording` proposal](../../../tickets/done/collaboration-prompt-wording/wording/collaboration-prompt-wording-proposal.md);
the approved per-role prompt blocks that the e2e suite compares against are in
`tests/e2e/fixtures/collaboration-prompt-complete-views.md`). Which text an agent gets is decided
once, by an explicit `collaborationRole` on its member context, never by looking
at addresses or at whether it is "team scoped":

| `collaborationRole` | Who | Sections |
| --- | --- | --- |
| `standalone_agent` | An agent the user started on its own | `Working With Other Agents` for a standalone agent |
| `task_agent` | An agent (or a member of a team) created by `delegate_task`, in any run | `Working With Other Agents` for a task agent: it works on the task it was given and answers its delegator by ID |
| `team_member` | A member of a user-started team | `AgentTeam Addressing`, then `Working With Other Agents` for a team member (with an organization line when the team runs inside an organization) |
| `org_agent` | An agent of a user-started organization | `AgentTeam Addressing`, then `Working With Other Agents` for an organization agent |

`resolveMemberCollaborationScope` decides the role together with the instance
scope: a direct member of a non-root host team is a `team_member`; a root-level
member at a configured address and with a configured run ID is a `team_member`
(Team root) or `org_agent` (Org root); a task agent created at a configured
address keeps that root's handoffs and instruction but is a `task_agent`. The
Agent-root host builder sets `standalone_agent`.

Rules every role follows:

- **No agent is told its own address.** Addresses are given only for others
  (the agents it can reach, its handoff recipients, `@` mentions). Every
  message an agent receives gives its sender's run id, and its sender address
  when that address reaches the sender, never a name (the chat looks the name up
  by run id):
  `You received a message from the agent with [sender address "<address>" and ]sender run id "<id>".`,
  then `message:` and the content. Whether the address is given is decided by
  `reachingAddressOf` (`message-recipient-resolution.ts`, design T-5): the
  sender's own address only when `send_message_to` with it, from the receiver's
  position, reaches exactly the sender — so a teammate, a configured agent or the
  agent the user started is given an address, a task agent (or a member of a task
  agent team seen from outside its team) is not. The task message uses the same
  two forms, decided run-wide (`You have a new task from the agent with [sender
  address "<address>" and ]sender run id "<id>".` plus the matching reply line).
  The answering bullet of every prompt says how to reply (`target_agent_run_id`
  set to the sender run id, or `recipient_address` set to the sender address, one
  of them) and when: only when the message asks something or the agent needs
  something; a result or an answer needs no reply (SR-015, after delegating agents
  on Codex answered every result and looped). A saved Task given to an existing
  task agent has no reply line (the delivery header gives the handles). Agents
  read "run id" in lowercase, like the parameter names (`target_agent_run_id`,
  …); "run" alone as a place ("this run") is never used.
- **Handoffs.** A `Handoffs` subsection is added only when the agent has handoff
  rules; an agent without rules is never told to call `get_handoff_rules`.
- **Vocabulary.** The agent-facing words are "task agent" / "task agent team",
  "its ID" and "talk with". Words that describe how the platform works inside
  (copy, spawn, run, mounted, collaborator, restore, shut down) never appear in
  agent-facing text; a test over the rendered prompts, tool descriptions and
  refusal texts enforces this.
- **Team Instruction.** The exact non-blank `team.md` body is rendered after
  Agent Identity and before the collaboration sections for every role that has
  one.

`send_message_to`, `delegate_task`, `list_available_agents`, `get_handoff_rules`
and the Project Task tools carry one description each, shared by the native
tools and the Agent Tools MCP server (constants in
`agent-team-collaboration-llm-contract.ts` and the tool contract files), so the
prompt says who the agent can reach and when to message, and the tool
description says only how the tool works. Argument fields and runtime dispatch
are unchanged. Refusal and result texts (for example a message to an address
that is not in the run, a delegation to your own team, a Task that is closed)
use the same vocabulary and say what to do next; their codes are unchanged. Every
such refusal reaches the agent as the tool's refusal result, including the
cross-Task and closed-Task refusals of `send_message_to` (the communication
engine returns them instead of throwing, so they no longer surface as an MCP
internal error). An invalid `recipient_address` is converted to the agent's text
at the `send_message_to` / `delegate_task` boundary, one text per tool (answer by sender run id for
`send_message_to`; `list_available_agents` for `delegate_task`); the address validator
keeps its own text for definition and configuration callers. Every result and refusal
text is catalogued once (wording §7.3, M-01..M-45) and checked against the source by
`tests/unit/agent-collaboration/result-catalogue.test.ts`.

Agent/team authors should not copy dynamic member addresses or tool schemas into
`agent.md` or `team.md`. This is model guidance, not runtime enforcement or a
guarantee of compliance. Saved prompts/history are not rewritten, and this
change does not force already running sessions to refresh their instructions.

The shared composition used by Codex App Server and Claude Agent SDK stops
after the shared identity/team sections. Those adapters place the resulting
string into Codex `baseInstructions` or Claude SDK `systemPrompt`; their
provider-native workspace, skills, tools, approval, and sandbox guidance stays
in the existing provider boundary. They do not receive the native Working
Environment, Bash Operating Practice, or File And Directory Practice sections.

## Ordinary Configured Skills

Skills remain an ordinary, configured, lazy domain layer rather than a special
foundation/system-skill kind. Configuring a skill does not change agent identity,
workspace identity, or tool authorization.

For native AutoByteus, the core appends one terminal metadata/path catalog after
Carpenter composition. For example:

```markdown
## Skills

### Skill Catalog

- **release-checklist**: Checks versioning, artifacts, and rollback readiness.
  - **SKILL.md:** `/opt/autobyteus/skills/release-checklist/SKILL.md`

### Rules for Using Skills

- Use a configured skill whenever it applies to the task.
- Before beginning work governed by a skill, read its `SKILL.md` from the exact path listed above.
- Resolve every relative path mentioned by a skill from the directory containing that skill's `SKILL.md`.
```

The catalog contains metadata and the exact manifest locator, not the
`SKILL.md` body. Work still happens in `/work/releases`; relative bundled skill
assets resolve from `/opt/autobyteus/skills/release-checklist/`. Codex can reuse
a provider-discoverable configured skill or materialize a configured fallback
under `.codex/skills`; Claude materializes configured packages under
`.claude/skills`. Both preserve configured-only, lazy skill semantics. See
[Skills](./skills.md) and the core
[Agent Skills Design](../../../autobyteus-ts/docs/skills_design.md).

## Tool Contract And Examples

Tools are authorized and projected independently of prompt prose. Provider tool
schemas—not an `Available Tools` section—define capability, arguments, path
rules, and result shape.

- A standalone run receives its explicitly configured effective tool set.
- Every valid team member context automatically unions exactly
  `get_handoff_rules`, `send_message_to`, and `delegate_task` into runtime
  exposure, even when the selected agent definition omitted those names.
  Duplicate configured names are normalized and deduplicated.
- Browser, media, publishing, and configured MCP tools remain explicitly
  configured and availability-gated. There are no task result/review tools.

Concrete team tool calls still follow their out-of-band schemas:

```text
get_handoff_rules({})

send_message_to({ recipient_address: "/release_manager", content: "Checks passed." })

delegate_task({
  recipient_address: "/release_manager",
  description: "Verify the release notes against the tested change and report mismatches.",
  reference_files: ["/work/releases/release-notes.md"]
})
```

`send_message_to` accepts exactly one of `recipient_address` or an exact
`target_agent_run_id` (any AgentRun in the sender's root, including a shut-down
delegated agent, or a currently active AgentRun elsewhere). `recipient_address` is a canonical absolute
non-root logical address; relative addresses and `/` are invalid. Accepted
messaging returns the exact existing receiver as flat `target_agent_run_id`,
while rejection returns null identity; a Team copy's team run ID is refused
(`TARGET_IS_TEAM_RUN`) with its coordinator's agent run ID. Successful
delegation returns `delegated: true`, `target_kind` and the copy's own IDs
(`target_agent_run_id` for an Agent copy; `target_team_run_id` and
`target_team_coordinator_agent_run_id` for a Team copy); if nothing started,
`delegated` is false and `message` explains why. Delegation references are absolute local paths.
The runtime exposes native AutoByteus schemas locally and routes Codex/Claude
through the session-scoped `autobyteus_agent_tools` MCP descriptor. Provider
wire names are normalized back to canonical application tool names.

There is no text-rendered `Available Tools` section, text tool manifest, or
fallback model-authored tool syntax.

## Provider Projection

The semantic foundation is composed once and projected without provider-local
rewording:

| Runtime | Instruction boundary | Skills | Team tools |
| --- | --- | --- | --- |
| Native AutoByteus | `composeNativeAutoByteusPrompt` -> `AgentConfig.systemPrompt`, then the closed core terminal Skills append | Native metadata/path catalog | Server-owned local native schemas |
| Codex App Server | `composeSharedCarpenterPrompt` -> thread `baseInstructions` | Provider discovery plus configured workspace materialization when needed | Session-scoped `autobyteus_agent_tools` MCP |
| Claude Agent SDK | `composeSharedCarpenterPrompt` -> SDK query `options.systemPrompt` custom string | Configured `.claude/skills` materialization | Session-scoped `autobyteus_agent_tools` MCP |
| Grok Build | `composeSharedCarpenterPrompt` -> ACP `session/new` `_meta.rules` (Grok `<human_rules>` block; harness guidance kept; not re-injected on `session/load`) | Configured `.grok/skills` materialization | Session-scoped `autobyteus_agent_tools` MCP over HTTP, reached through Grok `search_tool`/`use_tool`; see [Grok Build Runtime](./grok_build_runtime.md) |

Claude user turns remain user/context-file content; stable Carpenter instructions
are not rebuilt as XML inside every user message.

## Runtime Instruction Transparency

The product records the exact AutoByteus-owned string at the final runtime
handoff boundary, not a reconstruction from current definitions:

- Native records the processed prompt only after
  `configureSystemPrompt(...)` succeeds, including the appended configured-skill
  catalog.
- Codex records the exact `baseInstructions` supplied to a successful
  thread start or resume after the thread ID is valid.
- Grok Build records the exact `_meta.rules` string after `session/new`
  succeeds and the Grok `sessionId` is bound.
- Claude records the exact SDK `options.systemPrompt` after the query has
  started successfully and before output iteration.

The record is a strict run-scoped `system_instruction` raw trace and the matching
live fact is `SYSTEM_INSTRUCTIONS_SUPPLIED { trace_id, content, ts }`. Exact
content is intentionally available to users already authorized to inspect the
selected run through Activity and Memory Inspector. The implementation does not
capture provider-owned hidden prompts, injected provider context, or the final
effective context after provider processing; runtime labels must describe only
the AutoByteus-owned handoff string.

Capture is first-change-only within active raw storage. An unchanged latest
valid value reuses the existing trace without a second live event, while changed
content appends a new trace. Failed configuration/query/thread setup writes and
publishes nothing. Existing runs are not backfilled, absence is displayed as no
recorded Activity, and archived instruction rows are available only through
explicit raw-trace inspection rather than normal Activity or Event Monitor.

## Historical And Failure Boundaries

- Historical native working-context snapshots remain exact and may retain the
  prompt content they captured; restore does not rewrite history.
- Missing required values, failed team-definition lookup, absent required team
  delivery binding, invalid configured skill metadata, or unresolved
  double-brace Carpenter syntax fails bootstrap before provider invocation.
- A provider/materialization failure is surfaced by its owning adapter; it does
  not fall back to eager skill bodies, a text tool manifest, or an alternate
  workspace.
