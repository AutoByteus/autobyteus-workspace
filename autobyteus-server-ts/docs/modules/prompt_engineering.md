# Prompt Engineering And Runtime Instruction Composition

## Scope

This module covers two separate boundaries:

1. persisted/versioned prompt lookup under `src/prompt-engineering`; and
2. the platform-owned Carpenter composition used to construct the stable runtime
   instructions for native AutoByteus, Codex App Server, and Claude Agent SDK
   runs.

The Carpenter boundary supplies shared identity and team context to every
runtime. Native AutoByteus additionally receives workspace facts and the
platform-owned Bash/file operating practice. It does not turn agent definitions
into an open-ended prompt processor pipeline and does not encode tool schemas in
text.

## TS Source

- `src/prompt-engineering`
- `src/api/graphql/types/prompt.ts`
- `src/agent-tools/prompt-engineering`
- `src/agent-execution/prompt/carpenter-prompt-composer.ts`
- `src/agent-execution/prompt/carpenter-prompt-sections.ts`
- `src/agent-execution/prompt/markdown-heading-containment.ts`
- `src/agent-team-execution/services/team-collaboration-instruction-renderer.ts`
- native `autobyteus-ts` `SystemPromptProcessingStep` and
  `appendConfiguredSkillsCatalog`

## Main Services

- `src/prompt-engineering/services/prompt-service.ts`
- `composeSharedCarpenterPrompt(...)`
- `composeNativeAutoByteusPrompt(...)`

The prompt service and cached provider are singleton-backed to avoid repeated
cache initialization. Carpenter composition is pure and fail-fast. Shared
composition accepts the selected agent definition and optional validated
`MemberTeamContext`; native composition adds the exact absolute workspace.

## Runtime Instruction Ownership

Each section has one owner:

| Section | Source / owner | Presence |
| --- | --- | --- |
| `Agent Identity` | Selected `AgentDefinition`: required name, optional description, optional `agent.md` body | Always |
| `Team Instruction` | Exact non-blank selected `team.md` body | Team runs only, when non-blank |
| `AgentTeam Addressing` then `AgentTeam Collaboration` | Validated `MemberTeamContext` and one fixed canonical-address, collaboration, handoff, and task-eligibility renderer | Team runs only, shared across runtimes |
| `Working Environment` | Exact absolute effective workspace selected for the run | Native AutoByteus only |
| `Bash Operating Practice` | Platform-owned fixed Carpenter text | Native AutoByteus only |
| `File And Directory Practice` | Platform-owned fixed Carpenter text | Native AutoByteus only |
| `Skills` | Ordinary configured skill resolver and provider-specific skill projection | Only when configured skills apply |

The shared logical order is Agent Identity, optional Team Instruction,
AgentTeam Addressing, and AgentTeam Collaboration. Native AutoByteus appends
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

## Team Instruction And AgentTeam Collaboration

A team run inserts the exact non-blank `team.md` body under `Team Instruction`
and then renders two sibling sections from the validated current member context:
`AgentTeam Addressing` followed by `AgentTeam Collaboration`. They appear before
native `Working Environment`. The first teaches one canonical absolute non-root
address grammar and the member's exact address. The second explains universal
collaboration through an intent-first distinction (REQ-009 wording):
`send_message_to` reaches the one instance at an address, and an available
agent or team that is not yet in the run is brought in on first use;
`delegate_task` always spawns a new copy of an Agent or AgentTeam and delivers
its complete assignment as the first message. A "Work Requests and Results"
subsection covers Agent and AgentTeam (coordinator) addresses, teammates inside
the sender's own team instance, first-use bring-in, and run-ID selection, which
never brings anything in. A "Delegated Agents" subsection explains that every
call spawns another copy (copies can work in parallel), the returned
`target_agent_run_id` (or null plus `message` when nothing started), follow-up
on a copy only through `send_message_to` with its run ID, and that a quiet copy
is shut down (but not while it has a running background task) and restored with
its conversation on the next message. The section also
covers duplicate-dispatch prohibition, Agent-side evaluation of possible `get_handoff_rules` conditions, selection of
the single rule whose condition most specifically applies, notification of only
that rule's recipient, requester-return when no rule applies to incoming work, and delivery confirmation. The
renderer contains no flat recipient or delegation-target roster.

For example, a Team-bound Agent can receive this shape:

```markdown
## AgentTeam Addressing

(The directory/file analogy and the `/A`…`/C/E` example are omitted here.)

Every Agent and nested AgentTeam is identified by one canonical absolute address beginning with `/` at the root AgentTeam. Copy that exact address when a tool asks for `recipient_address`. Relative addresses, bare names, `../`, backslashes, and the structural root `/` itself are not valid recipients.

Your Agent address is:

/release_team/release_reviewer

Sending a message to an AgentTeam address delivers it through that AgentTeam's configured coordinator.

## AgentTeam Collaboration

### Work Requests and Outcomes

On receiving a work request, follow your own agent instructions and applicable skills. Do not send acknowledgements or promises to work. Use `send_message_to` only at a workflow-defined handoff point or when blocked and needing external input. Follow applicable handoff rules; otherwise, return the result or specific blocker to the requesting agent.

Choose the collaboration mode based on your primary intent.
`send_message_to` reaches the one instance at an address, brought in on first use.
`delegate_task` with an address spawns a new copy of an Agent or AgentTeam for new work;
with a copy's own ID it gives a new saved Task to that existing copy.
Never use both to deliver the same work.

### Work Requests and Results

Use `send_message_to` to communicate with the one Agent or AgentTeam instance
at an address.

- When `recipient_address` identifies an Agent, the message is delivered to
  that Agent's instance.
- When `recipient_address` identifies an AgentTeam, the message is delivered
  to that Team instance's coordinator.
- Inside your own team instance, a teammate's address reaches the member of
  that same instance.
- An available agent or team that is not yet in the run is brought in on
  first use; later messages to its address reach the same instance.
- When an exact AgentRun ID is known, `target_agent_run_id` may instead
  select that specific execution: any AgentRun in the same root, including a
  shut-down delegated agent, or a currently active AgentRun elsewhere. A run ID
  never brings anything in.

A successful call returns the exact AgentRun that accepted the message as
`target_agent_run_id`. For an AgentTeam recipient, this is its coordinator
AgentRun. `target_agent_run_id` takes agent run IDs only: a team run ID is
refused with its coordinator's agent run ID to use.

### Delegated Agents

Use `delegate_task` with `recipient_address` to spawn a new copy of an Agent or
AgentTeam for new work. The `recipient_address` identifies what to copy (a mounted
Agent or AgentTeam, a collaborator, or an available agent or team); it is not an
alias for the new copy. Every call with an address spawns another copy, so copies
can work in parallel.

- Supply task_id alone for saved Task text/files, or description and optional reference_files without task_id.
- The work description and reference files become the copy's first message,
  together with your address and AgentRun ID.
- On success, `delegated` is true and `target_kind` says whether the copy is an
  `agent` or a `team`. An Agent copy is named by `target_agent_run_id`. A Team
  copy is named by `target_team_run_id` (the copy itself) and
  `target_team_coordinator_agent_run_id` (its coordinator, which receives the
  work). If `delegated` is false, nothing was started and `message` explains
  why; correct the problem and delegate again, or report the failure.
- A description-only delegation that creates a Task also returns its
  `task_id`. When the work is finished, call `create_or_update_task` with that
  `task_id` and status `DONE` (or `CANCELLED` if the work turned out not to be
  needed); this stops the copy and removes it from the run.
- While you work on a Task yourself, a description-only delegation is sub-work
  of your Task: it returns no `task_id` and closes only with your Task.

To give a follow-up Task to a copy you delegated, call `delegate_task` with its
`target_team_run_id` (a Team copy) or `target_agent_run_id` (an Agent copy) and
the new `task_id`. The copy resumes with its conversation and receives the Task's
work from you. A copy has one current Task at a time: this works only when you
made its most recent assignment and its current Task is `DONE` or `CANCELLED`;
that earlier Task stays closed, and closing it again never stops the copy.

Message a copy only through `send_message_to` with an agent run ID: its
`target_agent_run_id`, or for a Team copy its `target_team_coordinator_agent_run_id`,
in both directions. A copy that stays quiet is shut down after a while, but not
while it has a running background task; a message to it restores it with its
conversation. A copy whose Task is `DONE` or `CANCELLED` is stopped. To continue
that same Task with it, the run that assigned the work first moves the Task out of
`DONE` or `CANCELLED` (for example to `IN_PROGRESS`) with `create_or_update_task`,
then messages the copy; that reactivates it with its conversation. Setting the
status alone starts nothing.

### Rule-Based Handoffs

When you finish your own work or are blocked, call `get_handoff_rules`. Evaluate the returned rules against your outcome. Select the single rule whose `when` condition most specifically applies, and notify only its `recipient_address` using `send_message_to`. Do not notify additional recipients for the same outcome. If no rule applies to an incoming work request, return the result or specific blocker to the requesting agent using `send_message_to`; otherwise, finish normally.

Do not claim that a message, delegation, or handoff succeeded unless the
corresponding tool confirms success.
```

The runtime renderer owns the complete exact wording and is shared by
AutoByteus, Codex App Server, and Claude Agent SDK composition. Agent/team
authors should not copy dynamic member addresses or tool schemas into `agent.md`
or `team.md`. Standalone runs render neither Team Instruction nor either
AgentTeam section. An eligible standalone run (not a server helper or
application-owned run), and an Agent directly under its Agent root, instead get
one short `## Collaboration` section
(`src/agent-execution/prompt/standalone-collaboration-instruction.ts`).
Both renderers reuse the same `Work Requests and Outcomes` paragraph: assigned work
follows the recipient’s instructions and applicable skills, without acknowledgement-only
replies. Skill-defined intermediate handoffs and blockers remain valid. This guidance
does not turn informational notifications into new assignments.
The standalone section also covers the `[Mentioned collaborators]` note, `send_message_to` reaching the
one instance at an address (brought in on first use), `delegate_task` always
spawning a new copy, `list_available_agents` when selected, and the member's
own address. It does not instruct standalone agents to call `get_handoff_rules`;
without applicable rules, results or specific blockers return to the requesting agent.

The shared wording owner is `WORK_REQUEST_EXECUTION_LLM_INSTRUCTION` in
`src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`.
The `send_message_to` tool and content-field descriptions likewise frame work
requests, results, and blockers; argument fields and runtime dispatch are unchanged.
This is model guidance, not runtime enforcement or a guarantee of compliance.
Saved prompts/history are not rewritten, and this change does not force already
running sessions to refresh their instructions.

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
while rejection returns null identity. Successful delegation returns only the
fresh child ingress as `target_agent_run_id`; if nothing started,
`target_agent_run_id` is null and `message` explains why. Delegation references are absolute local paths.
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
