# IR-001 Local Implementation Checks

Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006`; branch `codex/disable-native-multi-agent-20261006`.
Source/test commit: `ce028688bb452500578d5e8ff3633e72ac72b54e`; base `f48dbfbf39bbf9ed76116943e304248ca387dc7f`.
Node v22.23.1, pnpm 10.28.2, Vitest 4.0.18, macOS arm64. All commands run from this worktree root; output retained here using `tee` with Bash `set -o pipefail`.

| Command / stage | Result | Log |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | Exit 0; lockfile unchanged | dependency-install.log |
| `pnpm -C autobyteus-server-ts prebuild` | Exit 0; local shared SDK/core builds and Prisma client generation | prebuild.log |
| Focused launch suite, new tests / old production source | Expected exit 1: 12 fail / 1 pass; fails on old suffix, not test setup | launch-config-red.log |
| Same suite, changed production source | Exit 0: 13 pass / 0 skip | launch-config-green.log |
| `pnpm -C autobyteus-server-ts build` | Exit 0; production `tsc -p tsconfig.build.json`, assets and sanitized built-module/bootstrap smoke | server-build.log |
| Six Codex unit suites, final serialized run after build | Exit 0: 6 files / 62 pass / 0 skip | codex-focused-units.log |
| `node tickets/in-progress/codex-disable-multi-agent/evidence/implementation/ir-001/built-launch-config-smoke.mjs` | Exit 0: freshly emitted default/conflicting args, command and timeout assertions | built-launch-config-smoke.log |
| Source/test `git diff --check` | Exit 0 before code commit and against base after commit | provenance.json |

## Exact focused commands
```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/codex/client/codex-app-server-launch-config.test.ts --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/codex/client/codex-app-server-launch-config.test.ts tests/unit/runtime-management/codex/client/codex-app-server-client.test.ts tests/unit/runtime-management/codex/client/codex-app-server-client-manager.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts --no-watch
```

The 62 cases comprise launch config 13, client 5, client manager 2, bootstrapper 32, thread manager 8, MCP materializer 2. These mock dependency/provider boundaries; no live Codex child or actual model call. They cover existing environment, exact lease/release and thread/MCP config behavior locally, not system-level acceptance.

Initial focused run also passed 62/62, but overlapped a shared-output prebuild; its log is preserved as `codex-focused-units-initial.log`. The counted final run was serialized after build to remove that ambiguity. The intentional red run is retained rather than relabeled a product regression.

## Environment notes and cleanup
- Install warnings: unbuilt devkit CLI bin targets in unrelated applications; an unapproved @google/genai build script was ignored according to existing pnpm policy. No package/lockfile/policy changes and no new global config.
- Test global setup reset only this worktree's `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`; exact owned DB/journal files removed after checks. Build smoke creates and removes its own temp root. No application instance, native Codex, auth copy, network provider or server started by Implementation.
- Generated shared SDK `dist/` outputs remain untracked build prerequisites for downstream. None staged as source. Server/core dist are build output too.
- Unit bootstrapper emits its expected synthetic skills/list-failure warning; all assertions pass.
- Whole-package development `typecheck` not run: production TypeScript compilation ran through the documented build. No API/E2E or packaged-app validation claimed.
- Upstream binary/model/tool surface, scoped external MCP callability and realistic create/restore/cleanup remain API/E2E-owned; nine historical captures/three prior completed inventories/0.160.0 capture are not current-source proof.

## Whitespace evidence distinction
The whole-package staged/base diff check reports trailing blank lines in raw Vitest/prebuild logs, Vitest excerpt whitespace and literal patch-context blank lines. These are preserved verbatim; the prose, changed source and test are clean. See package-whitespace-check.json. The counted passing source/test check is:
```bash
git diff f48dbfbf39bbf9ed76116943e304248ca387dc7f HEAD --check -- autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-launch-config.ts autobyteus-server-ts/tests/unit/runtime-management/codex/client/codex-app-server-launch-config.test.ts
```
