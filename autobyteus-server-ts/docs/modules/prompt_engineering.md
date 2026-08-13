# Prompt Engineering And Runtime Instruction Composition

## Scope

This module covers two separate boundaries:

1. persisted/versioned prompt lookup under `src/prompt-engineering`; and
2. the platform-owned Carpenter composition used to construct the stable runtime
   instructions for native AutoByteus, Codex App Server, and Claude Agent SDK
   runs.

The Carpenter boundary supplies identity, team context, workspace facts, and
operating practice. It does not turn agent definitions into an open-ended prompt
processor pipeline and does not encode tool schemas in text.

## TS Source

- `src/prompt-engineering`
- `src/api/graphql/types/prompt.ts`
- `src/agent-tools/prompt-engineering`
- `src/agent-execution/prompt/carpenter-prompt-composer.ts`
- `src/agent-execution/prompt/carpenter-prompt-sections.ts`
- `src/agent-execution/prompt/markdown-heading-containment.ts`
- `src/agent-team-execution/services/team-runtime-instruction-renderer.ts`
- native `autobyteus-ts` `SystemPromptProcessingStep` and
  `appendConfiguredSkillsCatalog`

## Main Services

- `src/prompt-engineering/services/prompt-service.ts`
- `composeCarpenterPrompt(...)`

The prompt service and cached provider are singleton-backed to avoid repeated
cache initialization. Runtime Carpenter composition is a pure, fail-fast
operation over the selected agent definition, exact absolute workspace, and
optional validated `MemberTeamContext`.

## Runtime Instruction Ownership

Each section has one owner:

| Section | Source / owner | Presence |
| --- | --- | --- |
| `Agent Identity` | Selected `AgentDefinition`: required name, optional description, optional `agent.md` body | Always |
| `Team Instruction` | Exact non-blank selected `team.md` body | Team runs only, when non-blank |
| `AgentTeam Addressing` then `AgentTeam Collaboration` | Validated `MemberTeamContext` and one fixed logical-address, collaboration, handoff, and task-eligibility renderer | Team runs only |
| `Working Environment` | Exact absolute effective workspace selected for the run | Always |
| `Bash Operating Practice` | Platform-owned fixed Carpenter text | Always |
| `File And Directory Practice` | Platform-owned fixed Carpenter text | Always |
| `Skills` | Ordinary configured skill resolver and provider-specific skill projection | Only when configured skills apply |

The logical order is the order shown above. Blank optional values omit their
line, subsection, or section; they do not produce empty headings. An invalid
required name, workspace, team member name, team delivery binding, or unresolved
Carpenter placeholder stops bootstrap before provider invocation.

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

## Concrete Foundation Example

For a standalone `Release Reviewer` running in `/work/releases`, the stable
foundation begins as follows (the file-practice list continues with the same
platform-owned deterministic inspection/edit/verification rules):

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

- Use Bash as the primary interface for performing work in the agent workspace. Use it for workspace navigation, search, file reading, writing and editing, repository operations, processes, network operations, and project commands.
- Prefer deterministic, non-interactive, small, composable commands.
- Prefer project-native commands and format-aware tools such as `git`, `npm`, `pnpm`, `pytest`, `jq`, and project scripts when applicable.
- Use another provided tool when Bash cannot achieve the purpose.

## File And Directory Practice

- Locate files and directories by intent instead of broadly listing them; use targeted `rg`, `rg --files`, or constrained `find` commands.
- Read bounded relevant content with tools such as `cat`, `wc -l`, `sed`, `nl`, and format-aware readers.
- Make the narrowest deterministic format-appropriate edit, preserve unrelated content, guard file operations, and run a fitting verification.
```

The authoritative full fixed text is
`src/agent-execution/prompt/carpenter-prompt-sections.ts`. Project or task
instructions can narrow the work, but agent authors must not replace this
platform foundation with a second generic advice block.

## Team Instruction And AgentTeam Collaboration

A team run inserts the exact non-blank `team.md` body under `Team Instruction`
and then renders two sibling sections from the validated current member context:
`AgentTeam Addressing` followed by `AgentTeam Collaboration`. They appear before
`Working Environment`. The first explains the logical directory/file analogy,
the `/...` and `./...` grammar, invalid forms, the member's exact rooted address,
examples, and Team-coordinator ingress. The second explains `send_message_to`,
direct-child eligibility for `delegate_task`, and the ordered
`get_handoff_rules` completion/blocked workflow plus delivery confirmation. The
renderer contains no flat recipient or delegation-target roster.

For example, a Team-bound Agent can receive this shape:

```markdown
## AgentTeam Addressing

AgentTeams use filesystem-like logical addresses. Think of an AgentTeam as a directory, an Agent inside it as a file, and a nested AgentTeam as a subdirectory. This analogy describes the Team structure and addressing model only; the addresses are not real filesystem paths.

An address beginning with `/` starts from the root AgentTeam. An address beginning with `./` starts from your immediate AgentTeam—the Team that directly contains you. Bare names, `../`, and backslashes are invalid.

Within this structure, your address is:

/release_team/release_reviewer

For example:

- `./architecture_reviewer` identifies an Agent in your immediate AgentTeam.
- `./implementation_team` identifies a nested AgentTeam in your immediate AgentTeam.
- `/requirements_engineering/requirements_lead` identifies an Agent using an absolute address from the root AgentTeam.

An AgentTeam address identifies the Team itself. Sending a message to that address delivers it to the Team's configured coordinator.

## AgentTeam Collaboration

Use `send_message_to` with `recipient_address` to send a message to an Agent or AgentTeam.

`delegate_task` uses the same address format, but its recipient must be a direct Agent or AgentTeam child of your immediate AgentTeam. Message delivery may address deeper or cross-branch recipients.

When you finish your work or are blocked, call `get_handoff_rules`. If a returned rule applies, notify its `recipient_address` using `send_message_to`. Combine applicable reasons for the same recipient and follow distinct recipients in their returned order. If no rule applies, finish normally.

Do not claim that a handoff was completed unless `send_message_to` confirms delivery.
```

The runtime renderer owns the complete exact wording and is shared by
AutoByteus, Codex App Server, and Claude Agent SDK composition. Agent/team
authors should not copy dynamic member addresses or tool schemas into `agent.md`
or `team.md`. Standalone runs render neither Team Instruction nor either
AgentTeam section.

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

send_message_to({ recipient_address: "./release_manager", content: "Checks passed." })

delegate_task({
  recipient_address: "./release_manager",
  description: "Verify the release notes against the tested change and report mismatches.",
  reference_files: ["/work/releases/release-notes.md"]
})
```

`send_message_to` accepts exactly one of `recipient_address` or an exact currently
active `target_agent_run_id`. Delegation references are absolute local paths.
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
| Native AutoByteus | `AgentConfig.systemPrompt`, then the closed core terminal Skills append | Native metadata/path catalog | Server-owned local native schemas |
| Codex App Server | Thread `baseInstructions` | Provider discovery plus configured workspace materialization when needed | Session-scoped `autobyteus_agent_tools` MCP |
| Claude Agent SDK | SDK query `options.systemPrompt` custom string | Configured `.claude/skills` materialization | Session-scoped `autobyteus_agent_tools` MCP |

Claude user turns remain user/context-file content; stable Carpenter instructions
are not rebuilt as XML inside every user message.

## Historical And Failure Boundaries

- Historical native working-context snapshots remain exact and may retain the
  prompt content they captured; restore does not rewrite history.
- Missing required values, failed team-definition lookup, absent required team
  delivery binding, invalid configured skill metadata, or unresolved
  double-brace Carpenter syntax fails bootstrap before provider invocation.
- A provider/materialization failure is surfaced by its owning adapter; it does
  not fall back to eager skill bodies, a text tool manifest, or an alternate
  workspace.
