# Code Quality Strategy: TS Naming + Strong Typing

This ticket improves code quality across all TypeScript files listed in `migrate_nodesjs_ticket/MIGRATION_PROGRESS.md`.

## Goals
- **Naming:** align to TS conventions (camelCase for variables/methods; PascalCase for types/classes; UPPER_SNAKE for constants).
- **Typing:** remove `any` where possible; prefer `unknown` + narrowing, concrete types, and helper context types.
- **Compatibility:** keep external/tool payload keys (e.g., `agent_id`, `task_name`) in snake_case when they are API contracts.

## Scope
- All files listed in `migrate_nodesjs_ticket/MIGRATION_PROGRESS.md` (TS targets).
- When changing a symbol, update all usages and tests.

## Method
1. Pick a small cluster (module + tests).
2. Rename internal identifiers to camelCase.
3. Tighten types (`any` -> `unknown`/concrete types).
4. Update imports/usages/tests (unit + integration as applicable).
5. Mark the file **Completed** in `CODE_QUALITY_PROGRESS.md`.

## Guardrails
- Do not rename externally consumed keys, tool names, or serialized schema fields without a coordinated breaking-change plan.
- Treat established public framework fields (e.g., `agent_id`, `team_id`, `task_plan`) as API surface unless explicitly approved for breaking changes.
- Avoid behavioral changes; refactors should be type/naming only.
- Keep changes localized and verifiable (update tests if affected).
- **No fallbacks:** do not add backward-compatible aliases or fallback method names. When renaming identifiers, update all usages to the new names and remove legacy names entirely.
- If a public API changes, update all direct callers and references.

## Testing
- Run unit tests first (`pnpm exec vitest tests/unit`) after a batch of changes.
- Then run integration tests individually for the touched areas; record any skips/timeouts.
- Prefer targeted `vitest --run` for changed areas when available.
- If tests cannot run locally (e.g., missing binaries), note it in progress log and defer.
