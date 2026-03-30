# Implementation Plan

## Status

- Current Status: `In Progress`
- Updated On: `2026-03-19`
- First Slice Outcome: `Implemented and verified in focused unit slice`

## First Slice

1. Split context types
- Slim `ClaudeSessionContext` to session-owned fields only.
- Add `ClaudeSessionTeamContext` under `agent-team-execution/backends/claude`.

2. Update Claude runtime state
- Add optional `teamContext` to `ClaudeRunSessionState`.
- Thread the new field through `ClaudeSession` and `ClaudeSessionManager`.

3. Refactor Claude turn and team tooling
- Update `claude-turn-input-builder.ts` to consume separate session/team contexts.
- Update `claude-send-message-tooling.ts` to consume `teamContext`, not `sessionContext`.

4. Refactor bootstrap/build paths
- Make `ClaudeSessionBootstrapper` session-only.
- Add team-owned team-context builder and use it in Claude backend creation/restore.

5. Validation
- Update focused Claude/unit tests first.
- Run the Claude session/backend/team-runtime slice after the refactor.

## Progress Notes

- `ClaudeSessionContext` now carries only session-owned data.
- Team-owned Claude runtime data now lives in `ClaudeSessionTeamContext` under `agent-team-execution/backends/claude`.
- `ClaudeRunSessionState`, `ClaudeSession`, `ClaudeSessionManager`, `claude-turn-input-builder.ts`, and `claude-send-message-tooling.ts` now consume `teamContext` explicitly.
- `ClaudeSessionBootstrapper` is session-only; team context building moved to a team-owned builder.
- Team instruction composition moved out of `runtime-execution` into `agent-team-execution/services/member-run-instruction-composer.ts`.

## Validation Evidence

- Focused verification command:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/claude-agent-sdk/session/claude-turn-input-builder.test.ts tests/unit/runtime-execution/claude-agent-sdk/backend/claude-session-bootstrapper.test.ts tests/unit/runtime-execution/claude-agent-sdk/backend/claude-agent-run-backend-factory.test.ts tests/unit/runtime-execution/claude-agent-sdk/session/claude-session-manager.test.ts tests/unit/agent-team-execution/backends/claude/claude-session-team-context.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-team-execution/team-member-manager.test.ts`
- Result:
  - `7` files passed
  - `47` tests passed
