# Investigation Notes

## Refreshed Bootstrap Context

- Date: 2026-06-18 Europe/Berlin.
- Dedicated ticket worktree: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang`.
- Branch: `codex/intel-mac-terminal-prompt-hang`.
- Base requested by user: latest `origin/personal`.
- Latest base after fetch: `3171a5a4416e718cb4b38464206d9603733bf7a1` (`3171a5a4 docs(ticket): record raw trace rotation release finalization`, 2026-06-18 05:51:00 +0200).
- Existing uncommitted ticket work was preserved before reset via git stash: `backup before rebasing intel terminal ticket on origin/personal 20260618-080148`.
- Extra backup files: `/Users/ryan-zheng/autobyteus-org/branch-backups/intel-terminal-20260618-080148/`.
- Branch was reset to `origin/personal`; current branch HEAD equals latest `origin/personal`.

## Commands / Evidence

| Evidence | Result |
| --- | --- |
| `git fetch --prune origin` | Updated `origin/personal` from `aea805ae` to `3171a5a4`; many release tags through `v1.3.58` fetched. |
| `git stash push -u ... && git reset --hard origin/personal` | Ticket branch based exactly on latest `origin/personal`. |
| `pnpm install --frozen-lockfile` | Succeeded; dev `autobyteus-ts` postinstall repaired worktree `prebuilds/darwin-x64/spawn-helper`. |
| `pnpm -C autobyteus-ts exec vitest run tests/integration/tools/terminal/isolated-pty-session.test.ts --reporter=verbose` | Passed on Intel dev dependencies. |
| `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts --reporter=verbose` | Passed on Intel dev dependencies. |
| Static read of `autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts` | Still searches `build/Release`, `build/Debug`, then current-arch prebuild. |
| Static read of `autobyteus-web/build/scripts/afterPack.ts` | Latest personal treats `spawn-helper` as a candidate for codesigning, but does not chmod it executable. |
| Installed app metadata | `/Applications/AutoByteus.app` is version `1.3.58`, Mach-O x86_64. |
| Installed helper modes | `prebuilds/darwin-x64/spawn-helper` is x86_64 but mode `0644`; `build/Release/spawn-helper` is arm64 and mode `0755`. |
| Packaged websocket probe to `ws://127.0.0.1:29695/ws/terminal/...` | Opened, then closed with code `1011`, empty reason, zero output. |
| Server log after packaged websocket probe | `Failed to create terminal session: Error: posix_spawnp failed.` and `Terminal connection rejected: Error: posix_spawnp failed.` |
| Electron Node probe using packaged `node-pty/lib/utils.js.loadNativeModule('pty')` | Selected `/prebuilds/darwin-x64`; selected helper mode was `644`, executable=false. |
| Electron Node probe calling packaged `node-pty.spawn()` | Threw `Error: posix_spawnp failed.` |
| Electron Node probe importing packaged `autobyteus-ts/dist/tools/terminal/node-pty-bootstrap.js` | `resolveNodePtySpawnHelperPath()` returned `/build/Release/spawn-helper`, mode `755`, executable=true, which is the wrong arm64 helper for the x64 runtime. |

## Current Conclusion

The problem remains on latest `origin/personal` and installed AutoByteus `v1.3.58`: the packaged Intel app's selected `node-pty` helper is not executable. The latest source contains a partial packaging change to consider `spawn-helper` during codesigning, but it does not set executable permissions and the runtime bootstrap still resolves the wrong helper when an executable arm64 `build/Release` helper exists in the x64 package.

Windows does not hit this macOS `spawn-helper` executable-bit path. M1 works because the arm64 helper path is executable. Intel macOS fails because `node-pty` selects the x64 prebuild helper, which is mode `0644`.

## Recommended Fix Shape

- Update runtime bootstrap to resolve the actual native directory selected by `node-pty` and chmod the adjacent `spawn-helper`.
- Update desktop packaging to chmod packaged Darwin `spawn-helper` files, especially `prebuilds/darwin-x64/spawn-helper` for Intel artifacts.
- Add a packaged-runtime validation script/check that fails if the selected helper is not executable or if a packaged `node-pty.spawn()` probe fails.
- Improve startup error propagation so frontend users see an error instead of an empty terminal.
