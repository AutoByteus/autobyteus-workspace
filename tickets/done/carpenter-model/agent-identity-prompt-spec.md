# Agent Identity Prompt Specification

## Status

Approved intended-behavior supplement — approved with `requirements.md` on 2026-08-12

## Approved Decision

`agent.md` is the authoritative source for one agent's identity. There is no separate generic Platform Fundamentals section.

The always-present **agent foundation** is composed only of necessary run-specific content in this order:

1. Agent identity.
2. Applicable Team Instruction and Team Runtime context.
3. Working environment and path semantics.
4. Bash operating practice.
5. File and directory practice.

Configured skills remain one lazy layer after this foundation.

## Proposed Prompt Text

Required shape:

```md
## Agent Identity

- Name: {{agent_definition_name}}
```

Append the Description line only when the selected agent definition has a non-blank description:

```md
- Description: {{agent_definition_description}}
```

Append the following subsection only when the selected agent definition has a non-blank instruction body:

```md
### Responsibilities and Boundaries

{{agent_instruction_body}}
```

The double-brace expressions are specification placeholders, not literal prompt text or XML elements. Runtime composition replaces them with validated plain-text/Markdown values. The exact source, normalization, omission, and failure behavior is authoritative in `prompt-value-binding-spec.md`.

## Source And Binding Rules

- `agent.md` frontmatter remains the source of `name` and `description` for the rendered identity of file-backed agents.
- The existing optional `role` field is not rendered in the Agent Identity section. This change does not require removing that field from persisted definitions unless later design evidence establishes a separate cleanup need.
- The `agent.md` body remains the source of agent-specific responsibilities, ownership boundaries, and stable behavioral character. Preserve its content while applying the deterministic heading-containment rule in `prompt-value-binding-spec.md` so authored headings remain beneath Responsibilities and Boundaries.
- The agent-definition domain model is the runtime authority after parsing; other definition providers must project the same semantic fields.
- A team member name or alias identifies the member's position in the current team run. It belongs in Team Runtime and does not replace the agent-definition name.
- An agent identity is always present for standalone and team runs. The selected agent-definition name is required; a missing or blank name fails bootstrap before provider invocation.
- Description and instruction body may be blank in current file/provider representations. Omit their exact line or subsection when blank. Do not copy description into Responsibilities and Boundaries as a fallback.
- Generic behavioral advice that the model already knows must not be copied into every `agent.md`.
- Complete skill workflows must not be copied into `agent.md`; configured skill metadata and lazy `SKILL.md` loading remain separately owned.
- Tool permissions and argument schemas must not be stated as identity.

## Content That Belongs In `agent.md`

- The agent's name and concise description of who it is.
- What outcomes or lifecycle stage the agent owns.
- Stable ownership boundaries, including work it must not claim or produce.
- Stable communication character or tone when that genuinely distinguishes the agent.

## Content That Does Not Belong In `agent.md`

- Workspace/path rules supplied by the runtime.
- Generic reasoning, verification, or tool-discipline advice without an agent-specific contract.
- Complete step-by-step task workflows.
- Complete skill workflows or reusable operating manuals.
- Tool schemas or filesystem locations for skills.
- Temporary team membership, task packets, or run-specific state.

## Current Package Implication

Existing `agent.md` bodies mix identity with task-workflow rules and pointers to configured skills. Design must decide whether this ticket normalizes the bundled agent files or only establishes the new composition boundary while preserving their current bodies.

## Related Authority

- Requirements: `BEH-001`, `BEH-007`; `R-001`, `R-009`; `AC-001`, `AC-009`
- Bash operating practice: `bash-operating-practice-prompt-spec.md`
- Working environment: `working-environment-prompt-spec.md`
