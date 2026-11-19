# IR-002 local implementation checks (2026-09-24)

Worktree: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation`.
Focused-test correction commit: `a189b338020c511f3e646718d95f81cbf4820d43`.

| Check | Result | Scope / limitation |
| --- | --- | --- |
| `node --test autobyteus-web/scripts/test-appimage-launcher.mjs` | **9 passed, 0 skipped** | The test-owned launcher copy replaces only its two fixed unshare path references with a fixture-local absolute stub. The production source remains fixed to `/usr/bin/unshare` and has no runtime test override. Positive, negative, absent and ambiguous probe cases run on every host. Actual ELF-first-attempt, argv, status/fatal gate, live stderr and TERM assertions are retained. This remains a stub test, not packaged Electron proof. |
| `pnpm --dir autobyteus-web transpile-build` | Pass | No production TypeScript delta in IR-002; confirms build hook still compiles. |
| `pnpm --dir autobyteus-web transpile-electron` | Pass | No Electron source delta in IR-002. |
| `bash -n autobyteus-web/build/appimage/launcher.sh`; `git diff --check` | Pass | Production shell and change syntax/whitespace. |
| `pnpm --dir autobyteus-web test:electron --run` | First rerun: 151 passed, 1 unrelated `managedExtensionService.spec.ts` failure, 1 skipped. Targeted `managedExtensionService.spec.ts` rerun: 3 passed. Full rerun: **152 passed, 1 skipped**. | Intermittent existing extension-install test; no changed source or test in that subsystem. The first failure is disclosed rather than represented as a clean first-pass result. |

The x64 AppImage build was not rerun: the same local toolchain still lacks `/usr/bin/make` and `/usr/bin/g++`, and the prior IR-001 attempt stopped before packaging during `node-pty` rebuild. Packaged x64/ARM64, GUI/security state, Node/updater and host-policy validation remain downstream, not claimed here.
