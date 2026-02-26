# Implementation Plan

## Inputs
- Requirements: `requirements.md` (Design-ready)
- Design: `proposed-design.md` (v1)
- Call-stack review: `future-state-runtime-call-stack-review.md` (Go Confirmed)

## Tasks
- T-001 Update Codex projection parser for current `thread/read` item schema in `codex-thread-run-projection-provider.ts`.
- T-002 Preserve/validate legacy method-based parsing compatibility in provider logic.
- T-003 Add/adjust provider unit tests for both current and legacy payload shapes.
- T-004 Add Codex live E2E assertion that `getRunProjection.conversation` is non-empty after real Codex run.
- T-005 Execute targeted tests and live verification query against running backend.
- T-006 Sync implementation progress and findings in ticket docs.
- T-007 Add projection cwd fallback when manifest workspace path no longer exists.

## Verification Plan
- Unit:
  - `pnpm vitest tests/unit/run-history/projection/codex-thread-run-projection-provider.test.ts`
- Live E2E:
  - `RUN_CODEX_E2E=1 pnpm vitest tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "<history projection test name>"`
- Manual API verification:
  - GraphQL `getRunProjection` on recent Codex runs returns `conversation.length > 0`.
