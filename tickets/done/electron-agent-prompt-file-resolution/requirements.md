# Requirements

## status
Design-ready

## goal/problem statement
- Refactor runtime instruction resolution so run creation consumes one coherent fresh definition snapshot rather than mixing cached metadata with a separate disk reread of `agent.md`.
- Preserve `agent.md` as the persisted source of truth for agent instructions, but make the provider/service layer the only place that resolves files and parses definitions for runtime use.
- Keep the refactor scoped to runtime definition loading and avoid persisting source file paths in agent/team data.

## known evidence
- App/server logs on `2026-03-10` showed false `Prompt file not found or unreadable` warnings caused by `PromptLoader` rereading a narrower path than the definition provider.
- Design review found that runtime currently mixes two sources:
  - cached `AgentDefinition` / `AgentTeamDefinition` objects for metadata
  - separate direct file reads for instructions via `PromptLoader`
- The provider layer already parses `agent.md` into `AgentDefinition.instructions`, and the cached provider already stores that parsed object in memory.

## in-scope use cases
- `UC-001` fresh single-agent run after manual file edit:
  - An agent definition is cached, then `agent.md` and/or `agent-config.json` is edited on disk before a new run is created.
  - Expected: the next run uses one fresh `AgentDefinition` snapshot from persistence, including updated instructions and other definition fields.
- `UC-002` fresh agent-team run after manual file edit:
  - A team definition or one of its member agent definitions is cached, then corresponding files are edited on disk before a new team run is created.
  - Expected: the next team run uses fresh team/member definitions from persistence for expansion and member runtime configuration.
- `UC-003` blank-instructions fallback:
  - A fresh definition resolves successfully but its instructions body is blank.
  - Expected: runtime falls back to the definition description, preserving current behavior without a separate file reread path.

## requirements
- `REQ-001` Fresh full agent-definition snapshot for runtime:
  - Expected outcome: single-agent runtime creation resolves a fresh `AgentDefinition` from persistence at run creation time and uses that one object for instructions, tools, processors, skills, and description.
- `REQ-002` Fresh full team-definition snapshot for runtime:
  - Expected outcome: team runtime creation resolves fresh team/member definitions from persistence at team-run creation time instead of mixing cached definition state with separate instruction rereads.
- `REQ-003` Remove runtime dependence on `PromptLoader`:
  - Expected outcome: runtime execution paths no longer use `PromptLoader` to fetch instructions independently of definition loading.
- `REQ-004` Preserve next-run file-edit freshness:
  - Expected outcome: manual edits to persisted definition files are reflected on the next run without requiring a global cache refresh.
- `REQ-005` Preserve blank-instructions fallback:
  - Expected outcome: when fresh definition instructions are blank, runtime still falls back to description text as today.

## acceptance criteria
- `AC-001` Single-agent runtime freshness:
  - Measurable outcome: after the definition cache is primed, editing the persisted agent files changes the next created agent run without a cache refresh step.
- `AC-002` Team runtime freshness:
  - Measurable outcome: after caches are primed, team-run creation resolves fresh team/member definitions for the next run.
- `AC-003` No runtime prompt-loader path:
  - Measurable outcome: `AgentRunManager`, `AgentTeamRunManager`, and single-agent runtime metadata paths no longer depend on `PromptLoader`.
- `AC-004` Blank-instructions fallback preserved:
  - Measurable outcome: runtime still falls back to description when fresh definition instructions are blank.

## constraints/dependencies
- Use the existing provider/service layering instead of introducing persisted source-path metadata.
- Keep the implementation within the server TypeScript codebase and avoid changing persisted user data shape.
- Follow the software-engineering workflow artifacts in this ticket folder.

## assumptions
- Fresh-on-run semantics are preferred over reusing cached runtime definition state.
- Immediate hot reload for already running agents/teams is out of scope; freshness is required for the next run/session build.

## open questions/risks
- Other runtime metadata paths using cached definitions may need to align with fresh-read semantics to avoid partial staleness within the same runtime bootstrap sequence.
- `PromptLoader` may become unused after the refactor; cleanup scope should be decided during implementation based on touched-test cost and whether any non-runtime use remains.

## triage
- Scope: `Small`
- Rationale: the refactor is localized to definition-service/runtime wiring and targeted tests, without new storage formats or broad API changes.

## requirement coverage map
- `REQ-001` -> `UC-001`
- `REQ-002` -> `UC-002`
- `REQ-003` -> `UC-001`, `UC-002`
- `REQ-004` -> `UC-001`, `UC-002`
- `REQ-005` -> `UC-003`

## acceptance-criteria to Stage 7 scenario map
- `AC-001` -> `S7-001` (integration test: single-agent next-run uses fresh edited definition state)
- `AC-002` -> `S7-002` (targeted team-run test: fresh team/member definitions are used for next run)
- `AC-003` -> `S7-003` (source-level verification: runtime paths no longer import/use `PromptLoader`)
- `AC-004` -> `S7-004` (runtime test: blank instructions fall back to description)
