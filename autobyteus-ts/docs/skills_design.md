# Agent Skills Design (AutoByteus)

This document describes the design and runtime contract of **Agent Skills** in
the AutoByteus TypeScript framework.

## Philosophy: Configured Awareness, On-Demand Reading

A skill is a directory of instructions and supporting resources. Agents should
know which skills are configured for them without paying the launch-time context
cost of every instruction body.

The runtime therefore separates awareness from instruction retrieval:

1. **Configured awareness**: the system prompt lists only the skills explicitly
   configured for the agent.
2. **Path-based orientation**: each catalog entry contains the exact absolute
   path to that skill's `SKILL.md`.
3. **On-demand reading**: before work governed by a skill begins, the agent reads
   the current `SKILL.md` through a general-purpose file tool that was explicitly
   configured for that agent.
4. **Selective deep dive**: the agent reads or executes other files only when
   the skill instructions require them.

AutoByteus does not inject configured `SKILL.md` bodies into newly bootstrapped
native system prompts. It also has no launch-time "all installed skills" or
global-discovery mode. A broad generalist is configured with a broad explicit
skill set; an agent with no configured skills receives no managed-skill catalog.

## 1. Skill Definition: A Directory With an Entry Point

A skill is a self-contained directory:

```text
skills/
  java_expert/
    SKILL.md
    scripts/
      code_formatter.jar
    templates/
      SpringBootApp.java
    docs/
      memory_model.md
```

`SKILL.md` is the entry point. YAML frontmatter supplies the catalog metadata,
and the Markdown body supplies the instructions and references:

```markdown
---
name: java_expert
description: Java development guidance with formatters and templates.
---

# Java Expert

1. Run `./scripts/code_formatter.jar` when formatting is required.
2. Read `./templates/SpringBootApp.java` when creating an application.
```

Skill authors should keep relative references portable. At runtime every
relative path mentioned by a skill is resolved from the directory containing
that skill's `SKILL.md`.

## 2. Native Runtime Contract

### Configuration and registration

`AgentConfig.skills` is an ordered configured-only list. Core accepts registered
skill names and skill root paths:

```ts
const config = new AgentConfig({
  skills: [
    'java_expert',
    '/home/user/dev/private_review_skill'
  ]
});
```

Before native bootstrap, `AgentFactory.prepareSkills(...)` registers path entries
in `SkillRegistry` and normalizes them to the names declared by their
`SKILL.md`. Name entries must already be registered. Server launches normally
resolve agent-definition skill names to concrete root paths before constructing
`AgentConfig`.

The retained internal/transport value `PRELOADED_ONLY` still means "use only the agent's
explicitly configured skills." It does **not** mean that skill bodies are
preloaded into the prompt. `NONE` suppresses the catalog entirely.

### Catalog-only system prompt

For a newly bootstrapped native run, `SystemPromptProcessingStep` directly calls
the platform-owned `appendConfiguredSkillsCatalog` function after the carpenter
foundation has been composed. It appends a catalog like this:

```markdown
## Skills

### Skill Catalog

- **java_expert**: Java development guidance with formatters and templates.
  - **SKILL.md:** `/home/user/skills/java_expert/SKILL.md`

### Rules for Using Skills

- Use a configured skill whenever it applies to the task.
- When no configured skill applies, use the best available general approach.
- When an applicable configured skill covers only part of the task, follow it for the covered part and use another available technique for the uncovered part.
- Before beginning work governed by a skill, read its `SKILL.md` from the exact path listed above.
- Resolve every relative path mentioned by a skill from the directory containing that skill's `SKILL.md`.
```

The appender preserves configured order and emits only:

- skill name
- skill description
- absolute `SKILL.md` path
- the shared direct-read and path-resolution rules

It does not emit the `SKILL.md` body, a skill file tree, rewritten Markdown
links, or a `Skill Details` section. Registry-only skills are not advertised
when `AgentConfig.skills` is empty.

### Direct reading and relative paths

The catalog is guidance, not an implicit capability grant. An agent can read a
skill only when its definition explicitly includes a suitable general-purpose
tool such as `read_file` (or an explicitly authorized shell tool).

With `read_file`, the normal trusted-local path rules apply:

- pass the catalog's absolute `SKILL.md` path directly; or
- for a relative reference, use an explicit absolute `base_dir` equal to the
  directory containing that `SKILL.md`.

For example:

```text
SKILL.md: /home/user/skills/java_expert/SKILL.md
relative reference: ./templates/SpringBootApp.java
resolved file: /home/user/skills/java_expert/templates/SpringBootApp.java
```

The direct reader obtains current file content. If a managed `SKILL.md` changes
after prompt bootstrap, a later read in the same native run sees the updated
file even though the launch-time catalog text remains unchanged.

## 3. Components and Ownership

### `Skill`

`Skill` contains `name`, `description`, parsed `content`, and absolute
`rootPath`. Loading may parse the entry-point content for registry and service
use, but native prompt rendering deliberately uses only metadata and the derived
entry-point path.

### `SkillLoader` and `SkillRegistry`

`SkillLoader` validates and parses a skill directory. `SkillRegistry` registers
skills from concrete paths and resolves configured names. Directory discovery
is an administrative/bootstrap mechanism; it does not make registry-only skills
visible to an unconfigured agent.

### `appendConfiguredSkillsCatalog`

This focused platform-owned function owns the configured catalog and shared
usage rules. It is called exactly once by the native final-instruction step and
is not configurable, registered, or ordered by agent definitions. It does not
own filesystem access and does not infer access from the presence of a skill.

### General-purpose tools

General-purpose filesystem and shell tools own actual file access and execution.
Their ordinary authorization, path handling, and errors apply equally to skill
files and non-skill files.

There is no supported agent-facing `Skills` tool group. The retired
`get_available_skills`, `get_skill_content`, and `load_skill` tools are not a
runtime compatibility boundary. Persisted agent definitions that still name a
retired tool do not recreate it; normal missing-tool handling leaves that name
inert until the definition is edited.

## 4. Execution Flow

For a native agent configured with `java_expert` and `read_file`:

1. The server resolves `java_expert` to its managed root path.
2. `AgentFactory` registers the path and normalizes the configured entry to its
   skill name.
3. `appendConfiguredSkillsCatalog` appends the catalog metadata and absolute
   `SKILL.md` path; it does not append the body.
4. When the task requires Java guidance, the agent calls `read_file` with the
   advertised absolute entry-point path.
5. The agent follows the returned instructions and resolves any relative
   reference from `dirname(SKILL.md)`.
6. It reads or executes only the supporting resources required for the task,
   using its explicitly configured tools.

For an otherwise identical agent without `read_file` or another reader, steps
1-3 still provide awareness, but the runtime grants no hidden way to retrieve
the instructions. Tool configuration must be corrected explicitly when the
agent is expected to use file-backed skills.

## 5. Lifecycle and Provider Boundaries

- **New native runs** use the catalog/path-only prompt contract above.
- **Historical native working-context snapshots** are restored exactly. A
  snapshot created before this design may therefore retain its historical
  embedded skill text. Restore does not rewrite old context into the new prompt
  shape.
- **Codex and Claude runtimes** use their provider-specific skill
  materialization/bootstrap paths. The native configured-catalog
  contract must not be assumed to replace those provider mechanisms.

## 6. Operational Limits and Failure Behavior

- If an advertised file is later deleted or becomes inaccessible, the explicit
  reader surfaces its normal missing-file or permission error. The catalog is
  not a file-availability guarantee.
- The system prompt instructs the model to read applicable skills, but model
  compliance is stochastic. Deterministic runtime checks can prove the catalog,
  authorization, and direct-read capability; they cannot guarantee that every
  model will follow the instruction on every turn.
- Skill paths are trusted-local paths resolved and authorized by existing server
  and tool boundaries. The catalog appender is not a separate security layer.

## 7. Benefits

1. **Context economy**: launch-time prompts contain small configured catalogs,
   not complete instruction bodies.
2. **Freshness**: native agents read the current canonical file when the skill
   becomes relevant.
3. **Explicit capability control**: skill configuration does not silently grant
   filesystem or shell tools.
4. **Portable skill packages**: relative references remain relative to the skill
   entry-point directory.
5. **Clean ownership**: catalog rendering, managed-skill resolution, and general
   file access remain separate responsibilities.
