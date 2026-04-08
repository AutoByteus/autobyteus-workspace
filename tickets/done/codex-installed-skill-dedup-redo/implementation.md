# Implementation

## Plan

1. Extend `CodexThreadBootstrapper` to preflight `skills/list` through `CodexAppServerClientManager`, filter out same-name discoverable configured skills, and fall back cleanly when discovery fails.
2. Update `CodexWorkspaceSkillMaterializer` to dereference symlinked source content when copying missing skills into workspace `.codex/skills`, so runtime bundles are self-contained.
3. Add targeted unit coverage for:
   - bootstrapper-installed-skill dedupe,
   - bootstrapper discovery-failure fallback,
   - materializer self-contained symlinked-content materialization.
4. Reuse the current Codex configured-skill executable validation path in Stage 7 after source changes land.

## Live Progress

- `2026-04-08`: Stage 6 opened after Stage 5 `Go Confirmed`.
- `2026-04-08`: Implemented bootstrapper-owned installed-skill dedupe on top of current `personal` by preflighting Codex `skills/list` through `CodexAppServerClientManager` and filtering same-name configured skills before workspace copy.
- `2026-04-08`: Updated `CodexWorkspaceSkillMaterializer` to preserve symlinks during runtime-owned skill copy with `verbatimSymlinks: true`.
- `2026-04-08`: Added targeted durable coverage for installed-skill dedupe, discovery-failure fallback, cleanup ownership retention, and symlink preservation.
- `2026-04-08`: Stage 6 implementation verification passed with `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/codex-installed-skill-dedup-redo/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts`.
- `2026-04-08`: Re-entry reopened after live team-agent execution proved that preserving relative symlink identity breaks team-local skills by resolving to missing `.codex/shared/...` paths.
- `2026-04-08`: Stage 6 reopened to replace the prior `verbatimSymlinks: true` approach with self-contained copied bundles created by dereferencing source symlinks during materialization.
- `2026-04-08`: Replaced `verbatimSymlinks: true` in `CodexWorkspaceSkillMaterializer` with a shared dereferencing copy helper, keeping the bootstrapper-owned dedupe logic unchanged.
- `2026-04-08`: Strengthened durable regression coverage so the materializer and the live bootstrapper path both exercise team-style `../../shared/*.md` symlinks and prove that no `.codex/shared/...` mirror is required.
- `2026-04-08`: Re-entry Stage 6 verification passed with `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/codex-installed-skill-dedup-redo/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts`.
- `2026-04-08`: User requested shortening the runtime-owned materialized skill suffix from `12` hash characters to `4` characters.
- `2026-04-08`: Updated `CodexWorkspaceSkillMaterializer` to use a `4`-character source-path suffix and added a direct regression assertion for that suffix length.
- `2026-04-08`: Local-fix Stage 6 verification passed again with `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/codex-installed-skill-dedup-redo/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts`.

## Legacy / Removal Check

- No `runtime-execution` Codex file will be added or modified.
- No dual-path installed-skill compatibility branch will be introduced.
