# Memory Migration Strategy: Autobyteus Python -> TypeScript

This ticket ports the Autobyteus memory subsystem from the Python implementation into autobyteus-ts, matching behavior and tests while following TS conventions.

## Goals
- **Parity:** behavior matches Python for memory ingest, transcript assembly, compaction triggers, and tool trace linkage.
- **Stateless LLM:** prompts assembled from memory; LLM calls are stateless.
- **State alignment:** remove `conversationHistory` once memory is wired (Python already removed it).
- **Test parity:** TS unit + integration tests match or exceed the Python memory suite.

## Scope
- Memory core (models, store, manager, compaction, retriever, active transcript).
- LLM message types and prompt renderers needed for memory.
- Agent integration (ingest processors, request assembler, runtime state updates).
- Token budget + compaction policy wiring.
- Unit + integration tests mirroring Python behavior.

## Method (Bottom-up, TDD)
1. Update LLM message types and prompt renderers; add unit tests.
2. Implement memory core + file store; add unit tests.
3. Wire memory into agent runtime (processors, request assembler, handler updates); add unit tests.
4. Implement token budget + compaction policy triggers; add unit tests.
5. Add integration flows and record results in `MEMORY_MIGRATION_PROGRESS.md`.

## Guardrails
- Do not diverge from Python business logic unless explicitly approved.
- Keep external API payload keys stable (snake_case where required).
- Avoid hidden global state; use `MemoryManager` as the single source of truth.
- Follow Node.js/TS naming best practices:
  - **Files:** kebab-case for new TS files (match project conventions).
  - **Variables/functions:** camelCase.
  - **Types/classes:** PascalCase.
  - **Constants:** UPPER_SNAKE_CASE.
- Document any intentional deviations or environment-gated tests.

## Testing
- Run targeted unit tests for each file or module change.
- Run memory integration flows; gate LM Studio-dependent tests by config and record skips.
- Keep the progress log updated after each batch.
