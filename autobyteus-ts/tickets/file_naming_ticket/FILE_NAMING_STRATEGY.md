# File Naming Strategy: TypeScript Naming Best Practices

This ticket standardizes TypeScript/TSX file naming across the repository to align with common Node.js/TypeScript conventions.

## Goals
- **Consistency:** remove snake_case file names in favor of a single, consistent style.
- **Clarity:** make file names readable and predictable in imports and search.
- **Safety:** avoid behavioral changes; only rename paths and update references/tests.

## Current Baseline (2026-01-31)
- TS/TSX files: **857** total
- Files with underscores: **724**
- Directories with underscores: **65**

## Naming Rules
- **Default:** use **kebab-case** for TypeScript/TSX file names and directories.
  - Example: `agent_input_event_queue_manager.ts` -> `agent-input-event-queue-manager.ts`
- **Barrels:** keep `index.ts` / `index.tsx`.
- **Tests:** keep `.test.ts` / `.test.tsx` suffix; base name mirrors the source.
  - Example: `agent_input_event_queue_manager.test.ts` -> `agent-input-event-queue-manager.test.ts`
- **Acronyms:** lower-case within names (`llm`, `mcp`, `cli`).
- **Dots:** retain existing dot suffix patterns (e.g., `vitest.config.ts`).

## Scope
- `src/**`, `tests/**`, `examples/**`.
- Exclude `node_modules/**`, `dist/**`, and any generated output.

## Method (TDD-first)
1. **Pick ONE file** (and its direct tests/usages).
2. **List rename targets** for that file only.
3. **Rename with history preserved** (prefer `git mv`).
4. **Update imports and references** (TS/TSX, tests, docs) for that file.
5. **Run tests**:
   - Unit tests for that file first (`pnpm exec vitest --run <testfile>`).
   - Integration tests for touched areas (one file at a time).
6. **Record status** in `FILE_NAMING_PROGRESS.md`.

## Guardrails
- Do not change runtime behavior or exported APIs; only paths/imports.
- Keep external path contracts accurate (docs, examples, scripts).
- **One file at a time is mandatory.** No batching across files or modules.
- If a module has dynamic file lookups (string-based paths), update those references explicitly.

## Helper Commands
- Inventory TS/TSX files with underscores:
  - `rg --files -g '*.ts' -g '*.tsx' | rg '_'`
- Rename previews (per directory):
  - `rg --files -g '*.ts' -g '*.tsx' src/agent | rg '_'`
