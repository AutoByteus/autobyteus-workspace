# Carpenter Model System Prompt Contract

## Status

Approved consolidated intended-behavior contract — approved with `requirements.md` on 2026-08-12, including the same-day automatic team-tool clarification.

## Purpose

Provide one authoritative place for the complete system-prompt contract established during requirements refinement. Focused supplements remain the detailed authorities for their individual sections.

## Governing Principle

Include always-present prompt content only when the model cannot know it, must not guess it, or must behave differently from its normal trained behavior. Do not add generic reasoning, inspection, verification, reporting, or tool-use advice merely for reinforcement.

There is no generic `Platform Fundamentals` advice block.

## Always-Present Agent Foundation

The agent foundation contains only:

1. Agent Identity.
2. Applicable Team Instruction and Team Runtime context.
3. Working Environment.
4. Bash Operating Practice.
5. File And Directory Practice.

Configured skill bodies are not part of the always-present foundation.

## Structured Composition

The prompt is a structured composition of semantic sections, not one undifferentiated instruction body. The logical section order is:

1. `## Agent Identity` — always present.
2. `## Team Instruction` — present only for a team run with a non-blank authored team instruction body.
3. `## Team Runtime` — present only for a team member run; contains only framework-derived membership, communication, and task-delegation state and protocols.
4. `## Working Environment` — always present for filesystem-backed runs.
5. `## Bash Operating Practice` — always present.
6. `## File And Directory Practice` — always present.
7. `## Skills` — present only when skills are configured for the agent, or projected through the provider's native skill catalog mechanism.

The order follows three groups:

1. **Identity and collaboration context:** Agent Identity, then applicable Team Instruction and Team Runtime. The agent first knows who it is, then the stable team policy, then its concrete position and capabilities in the current team execution.
2. **Operating context and practice:** Working Environment, Bash Operating Practice, then File And Directory Practice. Once identity and collaboration are established, the prompt defines where and how the agent operates.
3. **Domain technique:** configured Skills. Skills follow the stable identity, team, and operating context and provide the applicable domain or reusable workflow without a separate kind taxonomy.

Rules:

- Omit an inapplicable or empty section; do not render placeholder headings or `None` values.
- Each section has one semantic owner and must not duplicate another section's content.
- Use stable Markdown headings and plain text. XML is not the canonical representation.
- The logical structure is provider-independent. Native maps the complete Markdown to `AgentConfig.systemPrompt`, Codex to `baseInstructions`, and Claude Agent SDK to the query `options.systemPrompt` custom string; adapters preserve section identity, content, and relative meaning.
- Prompt order is organization, not an invented authority system; actual instruction authority remains governed by the runtime/provider instruction hierarchy.
- Do not render an `Available Tools` section. Tool schemas and authorization are supplied out-of-band by the current runtime/provider tool mechanism.
- The optional Skills representation is terminal in the logical order. The obsolete optional system-prompt-processor extension surface is removed, so no later processor can append or mutate content outside this closed contract.

## Agent Identity

Source: the selected agent definition, including file-backed `agent.md`.

Required shape:

```md
## Agent Identity

- Name: {{agent_definition_name}}
```

Append the Description line only for a non-blank description, and append Responsibilities and Boundaries only for a non-blank agent instruction body:

```md
- Description: {{agent_definition_description}}

### Responsibilities and Boundaries

{{agent_instruction_body}}
```

Rules:

- Double-brace expressions are specification placeholders. Runtime output contains the resolved values, not template syntax or XML tags.
- Render the required name. Render description and the responsibility subsection only when their resolved values are non-blank; do not render the optional agent-definition `role` field.
- Do not use description as a fallback agent instruction inside this structured section.
- Preserve agent-body content but normalize its ATX heading levels under Responsibilities and Boundaries according to `prompt-value-binding-spec.md`.
- The body contains agent-specific responsibilities and boundaries, not complete skill workflows, generic model advice, tool schemas, or temporary runtime state.
- A team member name/alias is runtime context and does not replace the agent-definition name.

Focused authority: `agent-identity-prompt-spec.md`.

## Working Environment

```md
## Working Environment

- Agent workspace: `{{workspace_root_path}}`
- Use skills from their skill package directories to work on tasks in the agent workspace.
- A skill package directory contains the skill's instructions and bundled assets. It is not the agent workspace, and reading the skill does not change the agent workspace.
- Resolve skill-package references from the skill package directory. Resolve task and project locations from the agent workspace unless an explicit target says otherwise.
- Do not modify a skill package unless the task explicitly targets that skill package.
- With no working-directory override, `pwd` returns the agent workspace. An explicit working directory changes only that command's location; it does not redefine the workspace.
```

Canonical relationship:

> The agent reads a skill from its skill package directory and applies that skill to work on the task in its agent workspace.

Rules:

- `{{workspace_root_path}}` resolves to the canonical absolute workspace authorized for the run.
- Bind the exact directory that the adapter will use as the run's default working directory; fail before provider invocation if it is unavailable, blank, or non-absolute.
- The exact skill paths remain catalog-owned and are not copied into this section.
- Tool schemas remain authoritative for path argument shape and filesystem authorization.
- The contract applies to every configured skill.

Focused authority: `working-environment-prompt-spec.md`.

## Bash Operating Practice

```md
## Bash Operating Practice

- Use Bash as the primary interface for performing work in the agent workspace. Use it for workspace navigation, search, file reading, writing and editing, repository operations, processes, network operations, and project commands.
- Prefer deterministic, non-interactive, small, composable commands.
- Prefer project-native commands and format-aware tools such as `git`, `npm`, `pnpm`, `pytest`, `jq`, and project scripts when applicable.
- Use another provided tool when Bash cannot achieve the purpose.
```

Rules:

- Bash availability is a platform invariant; do not render conditional shell-availability wording.
- This section is the concise replacement for treating `shell-first-operating-practice` as a skill.
- It defines Bash-first routing and selected high-value efficiency practices, not a Unix command manual.

Focused authority: `bash-operating-practice-prompt-spec.md`.

## File And Directory Practice

```md
## File And Directory Practice

- Locate files and directories by intent instead of broadly listing them. For content, use targeted searches such as `rg -n "term" path`. For file names, use `rg --files path | rg "pattern"`. Use constrained `find` commands only when filesystem traversal or metadata is the better fit.
- Read only the relevant content. Use `cat` for a complete small file, `wc -l` before a potentially broad read, `sed -n '40,120p' file` for an exact window, and `nl -ba file | sed -n '40,120p'` when line numbers matter. Prefer format-aware readers such as `jq` for structured data.
- Choose the narrowest deterministic edit that matches the file format and change shape. Prefer exact anchors for text, parser-aware tools for structured files, and quoted heredocs for new content. Replace important files through a temporary file when a direct in-place edit is not safely verifiable.
- Use explicit quoted paths and preserve unrelated content and existing changes. Before copying, moving, or deleting, verify the source and destination. Delete only when the task requires it and the target has been verified.
- Keep inspection, modification, and verification as separate commands when a failure would need diagnosis. Verify changes with a fitting check such as `git diff -- path`, targeted `rg`, a format parser, or a project-native test or validator.
```

Rules:

- This section owns efficient file and directory discovery, inspection, modification, and verification.
- It follows Bash Operating Practice instead of repeating Bash-selection policy.
- It does not replace tool schemas, project instructions, or domain-specific skills.

Focused authority: `file-and-directory-practice-prompt-spec.md`.

## Team Instruction

```md
## Team Instruction

{{team_instruction_body}}
```

- Source only: the non-blank `AgentTeamDefinition.instructions` parsed from the selected `team.md` body.
- Render once only for team runs. Preserve authored content after trimming surrounding blank space, with ATX headings deterministically nested beneath Team Instruction according to `prompt-value-binding-spec.md`.
- Do not automatically inject team frontmatter description/category or team configuration.

## Team Runtime

```md
## Team Runtime

Current team member: {{member_name}}
```

- Source only: validated current `MemberTeamContext`.
- After the current-member line, append the fixed `send_message_to` communication contract/allowed roster and fixed `delegate_task` target roster/assignment protocol. Team execution automatically provisions those two provider-native tools even when omitted from the agent definition; their schemas remain out of band.
- It does not contain arbitrary provider/runtime information. There is no general miscellaneous Runtime Instruction bucket.
- Exact triggers, fixed wording, dynamic roster fields, and exclusions are authoritative in `team-and-runtime-prompt-spec.md`.
- Exact provider-channel placement remains a design decision because AutoByteus, Codex, and Claude expose different instruction boundaries; placement must not change the section meaning or content.
- Every dynamic value and generated fragment follows `prompt-value-binding-spec.md`; no unresolved documentation placeholder may reach a provider.

## Skill Catalog Contract

AutoByteus retains one ordinary configured skill model. There is no first-class system-, operating-, or task-skill kind in the runtime contract.

Each advertised skill entry contains only:

- Name.
- Description.
- Exact `SKILL.md` path or provider-equivalent manifest locator.

The initial prompt does not contain a configured skill's instruction body.

Shared activation rules:

- Read a skill only when its governed work is needed.
- Read it from the exact advertised manifest path.
- Resolve its bundled relative references from its skill package directory.
- A skill does not grant tools or change agent identity, workspace identity, or runtime restrictions.

Decision rationale: `system-skill-decision.md`.

For native AutoByteus, the exact rendered block is:

```md
## Skills

### Skill Catalog

- **{{skill_name}}**: {{skill_description}}
  - **SKILL.md:** `{{absolute_skill_md_path}}`

### Rules for Using Skills

- Use a configured skill whenever it applies to the task.
- When no configured skill applies, use the best available general approach.
- When an applicable configured skill covers only part of the task, follow it for the covered part and use another available technique for the uncovered part.
- Before beginning work governed by a skill, read its `SKILL.md` from the exact path listed above.
- Resolve every relative path mentioned by a skill from the directory containing that skill's `SKILL.md`.
```

Repeat only the catalog entry for each valid configured skill. Name, description, and manifest path must be non-blank/valid under `prompt-value-binding-spec.md`. Render the rules once. If no valid configured skill resolves or skill access is disabled, render no Skills section. Codex and Claude may expose the same configured skill packages through their provider-native catalog/materialization mechanism rather than duplicating this Markdown block.

## Tool Contract

- Tools remain independently authorized by the runtime.
- Bash is the primary operating interface; use another provided tool when Bash cannot achieve the purpose.
- Tool definitions and schemas remain authoritative for capability, parameters, path handling, and return values.
- Do not duplicate ordinary tool schemas in the agent foundation or skill bodies.
- Preserve the existing provider-specific, out-of-band tool exposure.
- For a valid team member context, automatically union `send_message_to` and `delegate_task` into provider tool exposure. Do not make prompt composition depend on configured tool names or an MCP descriptor.
- The latest base deliberately removed text-embedded tool calling, `ToolManifestInjectorProcessor`, and the text tool-manifest provider. They must not be recreated as part of the carpenter model.

## Representation Contract

- The semantic contract uses Markdown headings and plain text.
- Double-brace values in this specification are placeholders only.
- A provider adapter may project the semantic sections into provider-supported instruction channels, but provider mechanics must not change their meaning.
- Skill packages may be discovered or materialized differently by a provider; such mechanics must not make a skill package the agent workspace.
- The shared composer rejects unresolved double-brace syntax in the carpenter portion. Native AutoByteus appends its dynamic Skills catalog afterward, so `SystemPromptProcessingStep` must validate the complete post-Skills payload before storing it or configuring the LLM. Codex and Claude add no later textual skill catalog, making the composer result their complete instruction string.

## Deliberately Excluded Content

- Generic advice already supplied by model training, such as “understand the task,” “reason carefully,” “inspect before editing,” “verify,” or “report clearly.”
- Eager `SKILL.md` bodies.
- A first-class system- or operating-skill taxonomy.
- An agent-definition role line.
- Tool permissions or full tool schemas.
- Skill paths duplicated outside their catalog.
- Any statement that identifies a skill package directory as the agent workspace.

## Design Resolutions

- Provider-channel projection is fixed in `design-spec.md`: native uses its processed system prompt, Codex uses `baseInstructions`, and Claude Agent SDK uses its supported `systemPrompt` query option.
- External deletion of `shell-first-operating-practice` and consumer configuration changes are a coordinated follow-up in the repositories that own those files; AutoByteus does not retain a legacy prompt path for them.
- Existing authored `agent.md` and `team.md` bodies are source-preserved in this ticket. Heading containment prevents structural escape; author-content normalization is a separate content-package change.

## Related Artifacts

- `requirements.md`
- `investigation-notes.md`
- `agent-identity-prompt-spec.md`
- `working-environment-prompt-spec.md`
- `bash-operating-practice-prompt-spec.md`
- `file-and-directory-practice-prompt-spec.md`
- `team-and-runtime-prompt-spec.md`
- `prompt-value-binding-spec.md`
- `system-skill-decision.md`
