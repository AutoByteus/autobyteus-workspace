# Agent Skills Design (Autobyteus)

This document describes the design and implementation of **Agent Skills** in the Autobyteus TypeScript framework.

## Philosophy: Human-Like Information Retrieval

The design of Agent Skills is fundamentally inspired by **how humans acquire and process information**.

When a human needs to learn a new subject (e.g., "Advanced Java Programming"), they do not memorize an entire library of books instantly. Instead, they follow a hierarchical process:

1.  **Awareness**: They know a library exists and what books are in it.
2.  **Selection**: They pick a specific book (`java_expert`) relevant to their current task.
3.  **Orientation**: They read the Table of Contents (`SKILL.md`) to understand the structure and where to find specific details.
4.  **Deep Dive**: They flip to specific chapters or reference distinct files (assets/code) _only when that specific detail is needed_.

This "Just-In-Time" learning model allows agents to have infinite potential knowledge without the cognitive load (context window) of holding it all at once.

The core philosophy of this design is **Explicit Context Economy**:

1.  **Configured Awareness**: The Agent is aware only of the skills explicitly configured for that agent definition.
2.  **Heavyweight Loading (On-Demand)**: The body of a configured skill (instructions, examples, data) may be loaded or inspected through the server-owned skill tools when the runtime exposes them.

AutoByteus no longer has a launch-time "all installed skills" / global discovery mode. A generalist or orchestrator agent is modeled by configuring the broad skill set it is allowed to use on the agent definition; a zero-skill agent exposes no AutoByteus-managed skills by default.

## 1. Skill Definition: The Hierarchical "Skill as a Directory"

A **Skill** is not just a file; it is a **directory** acting as a self-contained knowledge base or toolkit.

- **The Entry Point (`SKILL.md`)**: This file serves as the "README" or "Map" for the skill. It contains high-level instructions and _pointers_ to other resources within the skill folder.
- **The Assets**: The folder can contain arbitrary files—code snippets in any language, detailed documentation, templates, or reference data.

### Structure Example

```text
skills/
  └── java_expert/
      ├── SKILL.md                 # The Entry Point
      ├── scripts/
      │   └── code_formatter.jar   # Executable asset
      ├── templates/
      │   └── SpringBootApp.java   # Code template
      └── docs/
          └── memory_model.md      # Deep-dive documentation
```

### `SKILL.md` Format

The file uses YAML Frontmatter for metadata. The body serves as the guide.

```markdown
---
name: java_expert
description: Java development expert with access to formatters and templates.
---

# Java Expert

You are a Java Expert.

1. **Formatting**: If you need to format code, run the jar found at `./scripts/code_formatter.jar`.
2. **Boilerplate**: For new apps, read the template at `./templates/SpringBootApp.java`.
```

**Path Resolution (Context Injection)**

Skill authors still write portable relative paths (e.g., `./scripts/...` or `scripts/...`) in `SKILL.md`.
Before skill content is shown to the model, the runtime rewrites any Markdown link target that is:

- relative
- resolvable from the skill root
- not already an external URL, anchor, or absolute path

into an absolute filesystem path. This means linked files usually arrive in model-visible skill content already ready for direct tool use.
When configured skills are present, the runtime injects:

1. A **Skill Catalog** listing the configured skills available to this agent
2. **Critical Rules** for any remaining plain-text or unresolved relative references
3. **Skill Details** with each preloaded skill's Root Path and formatted content

_Injection Format Example:_

```markdown
## Agent Skills

### Skill Catalog

- **java_expert**: Java development expert with access to formatters and templates.

If the server-owned `load_skill` tool is available, use it to load a configured listed skill by name when runtime skill details are needed.

### Critical Rules for Using Skills

> **Path Resolution Required for Remaining Relative Skill References**
>
> Resolvable Markdown links are already rewritten to absolute filesystem paths before injection.
> However, plain-text relative references or unresolved targets may still appear in the skill content.
>
> When a skill refers to a file by a remaining relative path, convert it to ABSOLUTE:
> `Root Path` + `Relative Path` = `Absolute Path`
>
> **Examples:**
>
> 1. Root Path: `/path/to/skill`
>    Relative: `./scripts/run.sh`
>    Result: `/path/to/skill/scripts/run.sh`
>
> 2. Root Path: `/path/to/skill`
>    Relative: `scripts/run.sh`
>    Result: `/path/to/skill/scripts/run.sh`

### Skill Details

#### java_expert

**Root Path:** `/home/user/skills/java_expert`

[content of SKILL.md here]
```

## 2. Core Components

### A. `Skill` Model

A data class representing a loaded skill.

- `name` (string): Unique identifier.
- `description` (string): Short summary.
- `root_path` (string): Absolute path to the skill directory (Critical for accessing assets).
- `entry_point_content` (string): The content of `SKILL.md` (loaded on demand).

### B. `SkillRegistry`

A central registry responsible for:

1.  **Discovery**: Scanning configured paths (e.g., `src/skills/`) for `SKILL.md` files.
2.  **Resolution**: Identifying the `SKILL.md` and the `root_path`.
3.  **Retrieval**: Providing access to the skill object.

### C. Server-Owned Skill Tools

Agent-facing skill access is provided by the server-owned `Skills` tool boundary:

- `get_available_skills`: lists configured skill names and descriptions for this agent.
- `get_skill_content`: retrieves a configured skill's `SKILL.md` content plus a readable file tree for inspection.
- `load_skill`: loads one configured server-managed skill for runtime use, returns the skill base path, path-resolution guidance, and skill content with resolvable relative Markdown links rewritten to absolute filesystem paths.

`load_skill` is intentionally server-owned rather than a core `General` tool. It resolves skills through normal server-managed skill sources/CRUD, refuses path-like model input, and does not register arbitrary model-supplied filesystem paths as skills. Agent-runtime calls are additionally constrained by the current agent's configured skill allowlist; non-configured skill names are rejected even if they exist in the broader catalog.

## 3. Configuration & Integration

We support flexible skill definition via `AgentConfig`.

### A. Preloaded Skills (Static / Vertical Agents)

For specialized agents, skills are defined in the configuration. The system supports **Hybrid Loading** (Names & Paths).

- **Config**:
  ```ts
  const config = new AgentConfig({
    skills: [
      'java_expert',             // Registered Name
      '/home/user/dev/new_skill' // Ad-hoc Local Path
    ]
  });
  ```
- **Startup Logic**:
  1.  **Paths**: If an entry is a path, the `SkillRegistry` dynamically loads and registers it (using the name defined in its `SKILL.md`).
  2.  **Names**: It looks up existing registered skills.
- **Result**: The `SKILL.md` content for _all_ listed skills is injected into the System Prompt.

### B. Configured Skills For Generalist Agents

Flexible or generalist agents still use explicit configuration. To grant broad skill coverage, add every allowed skill name or path to `AgentConfig.skills` / `agent-config.json.skillNames`.

- **Config**: `AgentConfig(..., skills=["java_expert", "python_expert", ...])`
- **Behavior**: The prompt catalog and server-owned skill tools expose only that configured set.
- **Zero configured skills**: `AgentConfig(..., skills=[])` exposes no AutoByteus-managed skills. It does not fall back to all registered skills.
- **Trigger**:
  - The agent can call server-owned skill tools by configured skill name when those tools are available.
  - No "magic shortcuts" (like `$skill`) are required; it follows standard tool usage patterns.

## 4. Execution Flow: The Universal "Deep Dive"

Regardless of whether the skill map (`SKILL.md`) was injected at startup or retrieved later for a configured skill, the "Deep Dive" phase follows the same rules.

1.  **Possession of the Map**: The Agent has formatted `SKILL.md` content (either in System Prompt or recent context).
2.  **Reading the Map**: The Agent reads skill instructions. Markdown links may already contain absolute filesystem paths.
3.  **The "Deep Dive" Action**:
    - If the skill content already exposes an absolute path, the Agent can pass that path directly to `read_file`.
    - If the skill instruction uses a remaining plain-text relative path, the Agent constructs the absolute path by combining the skill's `root_path` with the relative path (e.g., `/home/user/skills/java_expert` + `./templates/X.java` = `/home/user/skills/java_expert/templates/X.java`).
    - The Agent then calls the `read_file` tool, passing the absolute path as the `path` parameter.

### Example: Preloaded "Java Agent" (Static)

1.  **Startup**: `AgentConfig` has `skills=["java_expert"]`. System Prompt includes `SKILL.md` for `java_expert`.
2.  **User**: "Create a Spring Boot app."
3.  **Reasoning**: Agent sees the template link already rewritten to an absolute path in the System Prompt.
4.  **Action**: Calls `read_file` with that absolute path.

### Example: General Assistant With Explicit Skills

1.  **Startup**: `AgentConfig` explicitly includes `skills=["java_expert"]`.
2.  **User**: "I need to fix a Java bug, please use the java skill."
3.  **Reasoning**: "The configured `java_expert` skill is available. I should use it."
4.  **Action 1**: If details were not already sufficient in the prompt, calls `load_skill` or `get_skill_content` with the configured skill name `java_expert`.
5.  **Observation**: Receives formatted `SKILL.md` content and root path.
6.  **Reasoning**: "The debugging docs link is already absolute, so I can read it directly."
7.  **Action 2**: Calls `read_file` with that absolute path.

## 5. Benefits

1.  **Infinite Extensibility**: A skill can contain entire libraries, specialized CLI tools, or encyclopedias of text, without bloating the prompt.
2.  **Polyglot Support**: A skill folder can contain Python scripts, Java JARs, Bash scripts, etc. Linked assets can already appear as absolute tool-usable paths, and plain-text relative references can still be resolved through the emitted root path when needed.
3.  **Context Efficiency**: The Agent only loads the "Index" (`SKILL.md`). It only pays the context cost for "Deep Dive" items if the specific task requires them.
4.  **Lower Path-Arithmetic Error Rate**: Common linked skill references no longer require the model to manually compute an absolute path before calling file tools.
