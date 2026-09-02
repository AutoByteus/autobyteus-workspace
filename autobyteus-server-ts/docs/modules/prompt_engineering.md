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
same-root collaboration through an intent-first distinction: `send_message_to`
contacts an already existing mounted execution, while `delegate_task` spawns one
fresh independently tracked task execution and delivers its complete assignment.
It also explains exact returned ingress identities, genuine later
clarification, duplicate-dispatch prohibition, formal task result/review tools,
Agent-side evaluation of possible `get_handoff_rules` conditions, selection of
the single rule whose condition most specifically applies, notification of only
that rule's recipient, no-rule completion, and delivery confirmation. The
renderer contains no flat recipient or delegation-target roster.

For example, a Team-bound Agent can receive this shape:

```markdown
## AgentTeam Addressing

Every Agent and nested AgentTeam is identified by one canonical absolute address beginning with `/` at the root AgentTeam. Copy that exact address when a tool asks for `recipient_address`. Relative addresses, bare names, `../`, backslashes, and the structural root `/` itself are not valid recipients.

Your Agent address is:

/release_team/release_reviewer

## AgentTeam Collaboration

Choose the collaboration mode based on your primary intent.
`send_message_to` communicates with an already existing execution.
`delegate_task` spawns a fresh task execution that independently owns a unit of work.
These operations are not interchangeable. Never use both to deliver the same work.

After successful delegation, genuinely new clarification may be sent to the exact
active task ingress using the returned `target_agent_run_id`. Formal task output
and review use `submit_task_result` and `review_task_result`.

### Rule-Based Handoffs

When you finish your own work or are blocked, call `get_handoff_rules`. Evaluate the returned rules against your outcome. Select the single rule whose `when` condition most specifically applies, and notify only its `recipient_address` using `send_message_to`. Do not notify additional recipients for the same outcome. If no rule applies, finish normally.
```

The runtime renderer owns the complete exact wording and is shared by
AutoByteus, Codex App Server, and Claude Agent SDK composition. Agent/team
authors should not copy dynamic member addresses or tool schemas into `agent.md`
or `team.md`. Standalone runs render neither Team Instruction nor either
AgentTeam section.

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
- Other task lifecycle tools such as `submit_task_result` and
  `review_task_result`, and browser/media/publishing/configured MCP tools, remain
  explicitly configured and availability-gated.

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

`send_message_to` accepts exactly one of `recipient_address` or an exact currently
active `target_agent_run_id`. `recipient_address` is a canonical absolute
non-root logical address; relative addresses and `/` are invalid. Accepted
messaging returns the exact existing receiver as flat `target_agent_run_id`,
while rejection returns null identity. Successful delegation returns `task_id`,
`status:"active"`, and the fresh task ingress as `target_agent_run_id`;
`not_started` omits that identity. Delegation references are absolute local paths.
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
