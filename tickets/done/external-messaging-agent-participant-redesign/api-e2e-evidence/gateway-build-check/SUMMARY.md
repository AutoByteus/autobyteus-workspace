# Gateway build check (informational; REQ-121 says the gateway is not validated in this ticket)

Commit: 40f769e0d. Method: `autobyteus-message-gateway/` copied (without `tickets/`, `memory/`) to a throwaway dir and run standalone under a scrubbed env. The repo was not modified.

| Check | Command | Result | Log |
| --- | --- | --- | --- |
| Standalone install | `pnpm install` (no lockfile; the gateway is no longer a workspace member) | Pass (5.6 s). pnpm ignored the build scripts of `@whiskeysockets/baileys` and `protobufjs`, which the workspace root used to approve. | `install.log` |
| Typecheck | `pnpm run typecheck` (`tsc -p tsconfig.json --noEmit`, src + tests) | Pass, 0 errors | `typecheck.log` |
| Build | `pnpm run build` (`tsc -p tsconfig.build.json`) | Pass, 0 errors; `dist/` includes `external-channel/` | `build.log` |
| Tests | `pnpm test` (vitest) | Pass: 86 files / 268 tests, including the 6 moved `tests/unit/external-channel` files | `test.log` |
| Start smoke | `node dist/index.js`, `GATEWAY_HOST=127.0.0.1`, `GATEWAY_PORT=18791`, temp `GATEWAY_RUNTIME_DATA_ROOT`, no providers enabled | `GET /health` → 200 `{"service":"autobyteus-message-gateway","status":"ok"}`; stopped cleanly | `start.log` |
| Workspace-based packaging | `pnpm --filter autobyteus-message-gateway ls` at the repo root | "No projects matched"; lockfile has 0 gateway entries | `workspace-filter-check.log` |

Not working (known, accepted deferral in design-spec "Intentional deferrals" / SR-011; not executed end to end):
- `pnpm build:runtime-package` (`scripts/build-runtime-package.mjs`) runs `pnpm -C <repo> --filter autobyteus-message-gateway deploy`, which matches no project now. It also still builds `autobyteus-ts` first.
- `autobyteus-message-gateway/docker/Dockerfile` copies `autobyteus-ts` and runs `pnpm install --frozen-lockfile --filter autobyteus-message-gateway...` against the workspace lockfile, which no longer contains the gateway. So the gateway would get no dependencies and its build would fail.

Both need the planned gateway refactor: a standalone lockfile and its own packaging. The release workflow that used them was deleted (DEC-112).

Note: the copy was taken while another member's merge of `origin/personal` (`fdbd07124`, v1.4.79) was staged in the worktree. `git diff HEAD -- autobyteus-message-gateway` shows that the only difference from `40f769e0d` is `package.json` `"version": "1.4.78"` → `"1.4.79"`, so these results apply to the `40f769e0d` gateway source. The merge was not touched.

## Follow-up after the user's direction "the gateway may not work, but it must build" (2026-09-24)

Clean detached temp worktrees at candidate `40f769e0d` and baseline `40b1783f4` (both removed afterwards), scrubbed env:

| Build path | Baseline `40b1783f4` | Candidate `40f769e0d` | Log |
| --- | --- | --- | --- |
| Root `pnpm install --frozen-lockfile`, then `pnpm -C autobyteus-message-gateway build` | Pass | **Fail**: `sh: tsc: command not found` (the root install no longer installs gateway deps) | `baseline-gateway-build.log`, `runtime-package-build.log` |
| `pnpm install` inside `autobyteus-message-gateway/` | (n/a) | Captured by the root workspace (reinstalls the workspace); the gateway still gets no `node_modules` or lockfile | `in-repo-gateway-install.log` |
| `pnpm run build:runtime-package` | Pass (tarball + manifest) | **Fail** at its internal `pnpm -C autobyteus-message-gateway build` | `baseline-runtime-package-build.log`, `runtime-package-build.log` |
| Gateway `docker/Dockerfile` (temp copies: local `node:20-bookworm` base; pnpm pinned to 10.28.2, because unpinned corepack fetched pnpm 12.6.0, which fails on Node 20; this is pre-existing) | **Fail (pre-existing)**: `autobyteus-ts` postinstall script missing, since only its `package.json` is copied before install | Fail: "No projects matched the filters", then `pnpm -C autobyteus-message-gateway build` fails | `gateway-docker-build.log`, `gateway-docker-build-pinned-{baseline,candidate}.log` |
| `pnpm install --ignore-workspace` inside `autobyteus-message-gateway/`, then `pnpm --ignore-workspace run build` | (n/a) | **Pass** (creates gateway-local `node_modules` + `pnpm-lock.yaml`) | `in-repo-gateway-install-ignore-workspace.log`, `in-repo-gateway-build-ignore-workspace.log` |

Conclusion: the gateway's TypeScript builds and its tests pass once its deps are installed standalone. But the change removed the only working in-repo install path (workspace membership) without providing a standalone one, so the gateway's normal build and its runtime-package build regress from Pass to Fail. REQ-121 allowed this ("no requirement that it builds"). The user now requires that it builds, so this was routed to `/solution_designer` as a Requirement Gap.
