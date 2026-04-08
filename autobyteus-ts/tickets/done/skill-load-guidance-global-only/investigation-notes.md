# Investigation Notes

## Scope Triage

- Scope: `Small`
- Area: `autobyteus-ts` skill prompt injection

## Relevant Files

- `src/agent/system-prompt-processor/available-skills-processor.ts`
- `src/agent/context/skill-access-mode.ts`
- `src/tools/skill/load-skill.ts`
- `tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts`
- `tests/integration/agent/agent-skills.test.ts`

## Findings

1. The prompt sentence `To load a skill not shown in detail below, use the load_skill tool.` is injected unconditionally whenever catalog entries exist.
2. `PRELOADED_ONLY` mode already injects the configured skill details directly into the system prompt, so that sentence is not relevant in that mode.
3. `GLOBAL_DISCOVERY` mode is the mode where the sentence is relevant because only the catalog is injected and the agent may need to load a skill map on demand.
4. The `load_skill` tool itself enforces mode restrictions, but the current prompt text is still misleading because it is not scoped by mode.

## Change Direction

1. Keep the catalog in both modes.
2. Emit the `load_skill` guidance sentence only in `GLOBAL_DISCOVERY`.
3. Add test coverage for the absence of that sentence in `PRELOADED_ONLY` and its presence in `GLOBAL_DISCOVERY`.
