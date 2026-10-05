# IR-015 Local Implementation Checks (SR-026 / REQ-014 / AC-017)

These are local implementation checks only, not API/E2E sign-off. Run in the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation` on commit `335f78c20` (parent `e94d83538`).

| # | Command | Result |
| --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/codex/client/codex-app-server-launch-config.test.ts` | 5/5 Pass |
| 2 | Codex unit suites (`tests/unit/runtime-management/codex`, `tests/unit/agent-execution/backends/codex`) | 23 files / 303 tests Pass |
| 3 | `pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json` | exit 0 |
| 4 | `git diff --check e94d83538..335f78c20` | exit 0 |
| 5 | Real CLI smoke with codex-cli 0.160.0, run from `/tmp`, stdin held open by `sleep 4 \|`, using a throwaway `CODEX_HOME` whose `config.toml` sets `[features] multi_agent = true`: `codex app-server -c features.multi_agent=false -c features.multi_agent_v2=false` | Starts and stays up; no error on stderr (matches the no-override baseline) |
| 6 | Negative control, same setup: `codex app-server --disable multi_agent_v2_nonexistent` | `Error: Unknown feature flag`. This reproduces E-103 and is why `-c` was chosen |

Throwaway `CODEX_HOME` directories were deleted afterwards. The user's `~/.codex/config.toml` was not read for writing and not modified.

## Not run (owned downstream)

- AC-017 end to end: a Codex-backed delegated copy with the user-level feature enabled exposes no built-in `send_message` / `list_agents` and replies via `send_message_to`.
- Wide-suite rerun: not needed for this delta. The change is limited to one launch-args function whose only caller is `codex-app-server-client-manager.ts`.
