# IR-001 local implementation checks (2026-09-24)

Worktree: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation`.
Implementation commit: `658a854dd3bc66a73c58b6454117d41e4e509652`.

| Check | Result | Scope / limitation |
| --- | --- | --- |
| `pnpm --dir autobyteus-web transpile-build` | Pass | Builder hook/config TypeScript. |
| `pnpm --dir autobyteus-web transpile-electron` | Pass | Electron startup/logger TypeScript. |
| `node --test autobyteus-web/scripts/test-appimage-launcher.mjs` | Pass: 6, skipped: 1 | Local restricted host: negative-probe, actual first-attempt stub, fatal/status retry, unrelated exit, Node/argv/marker and live stderr/signal checks. Positive-probe case skipped because this host's `/usr/bin/unshare -Ur true` fails. These stubs are not packaged Electron runtime proof. |
| `pnpm --dir autobyteus-web test:electron --run` | Pass: 152 tests, 1 skipped, 34 files passed | Existing Electron unit suite, including updater, logger and server manager tests. |
| `bash -n autobyteus-web/build/appimage/launcher.sh`; `git diff --check` | Pass | Shell syntax and whitespace. |
| `pnpm --dir autobyteus-web build:electron:linux:x64` | Blocked by local toolchain, not source failure | Existing `prepare-server` native `node-pty` rebuild reached `node-gyp`, then failed with `Error: not found: make`; `/usr/bin/make` and `/usr/bin/g++` are absent on this host. No AppImage artifact was produced here. CI's native Linux runners and downstream packaged validation remain required. |

Not claimed: x64/ARM64 AppImage artifact validity, restricted-host GUI/server runtime, capable-host renderer isolation, desktop-entry extraction, Node-mode packaged server, updater/relaunch, or host-policy before/after comparison. The release workflow now contains x64/ARM64 package-layout and existing metadata/Node-mode gates; no CI run has been observed for this commit.
