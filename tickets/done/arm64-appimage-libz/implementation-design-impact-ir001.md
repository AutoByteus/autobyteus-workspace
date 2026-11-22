# Implementation Design Impact — IR-001 (arm64-appimage-libz, autobyteus-28)

- From: implementation engineer, 2026-11-21
- Basis: design-spec.md SR-001, ARCH-REV-001 Pass; worktree `codex/arm64-appimage-libz` at `885e1d0151` plus the uncommitted changes listed below
- Classification: `Design Impact` — the design's own escalation trigger fired at Change/Refactor Sequence step 1 ("compare arm64 25 and 26 output before switching the toolset"). task_size `Medium`, architectural_risk `High`, unchanged.
- Protects: REQ-005 / AC-005 (every other release output unchanged), BEH-004, and BEH-001's preserved column (the app from `AppRun` on).

## What happened

Step 1 as designed: same worktree, same prepared inputs (`typecheck`, `prepare-server`, `generate:electron`, `transpile-electron` done once), only `electron-builder` changed (`^25.1.8` → `^26.18.0`, lockfile resolved to `26.18.0` with its `26.18.0` peers), toolset left at the default. Packaging command for both: `node build/dist/build.js --linux --arm64` with `AUTOBYTEUS_BUILD_FLAVOR=personal`, `GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace`, a build-only trust key and Go 1.27.4.

| Fact | electron-builder 25.1.8 | electron-builder 26.18.0 (default toolset) |
| --- | --- | --- |
| Artifact names, `electron-dist` files | `AutoByteus_personal_linux-arm64-1.5.14-beta.6.AppImage`, `latest-linux-arm64.yml` | same |
| `latest-linux-arm64.yml` keys | version, files[url, sha512, size, blockMapSize], path, sha512, releaseDate | same |
| AppImage runtime prefix | sha256 `207f8955…1d85` (= cached `appimage-12.0.1/runtime-arm64`), gzip squashfs | same bytes, gzip |
| Image `AppRun` / desktop `Exec` | native ELF / `Exec=AppRun --autobyteus-appimage-desktop-entry %U` | same |
| AppImage size | 350,484,119 | 247,748,494 |
| **`resources/server/node_modules`** | 20,455 files unpacked; 24,089 image entries | **absent** (0) |
| **Packaged server startup** (`autobyteus-web/scripts/verify-packaged-server-startup.mjs`, the release job's step) | passes | **fails**: `ERR_MODULE_NOT_FOUND: Cannot find package 'reflect-metadata' imported from …/resources/server/dist/app.js` |
| **`app.asar`** | 14,388 entries, sha256 `7a2a1c07…` | 14,594 entries, sha256 `d72b27ea…`: 193 paths removed, 399 added (different hoisting of `uuid`, `d3-shape`, `cytoscape-fcose`, `mlly`, `d3-sankey`'s nested `d3-shape`; new `@types/*` packages such as `@types/d3-*`, `@types/markdown-it`) |

Evidence: `evidence/eb25-vs-eb26-arm64/` (per-build facts, `asar-file-list-diff-v25-v26.txt`, server-startup logs, and the scripts that collected them).

## Cause

`app-builder-lib@26.x` `out/util/filter.js` `createFilter` now returns `false` for any copy source's root `node_modules` (`if (relative === "node_modules") return false;`). 25.1.8's `createFilter` has no such rule. The filter applies to every `extraResources` entry, so `{ from: "resources/server", to: "server" }` (`build.ts` options) loses the server's whole `node_modules`. No file pattern can re-include it (the check runs before pattern matching). Checked: the line is present in `app-builder-lib` 26.0.0, 26.0.12, 26.4.0, 26.8.0, 26.18.0 and 26.18.1, so no 26 version avoids it.

The same copier serves macOS and Windows packaging (`extraResources` is shared in `options`), so all five desktop targets would ship a server without its dependencies. The release job's "Verify Linux … packaged server startup" step would catch it on Linux; the macOS terminal-runtime check reads the staged `resources/server` and the final `.app` `node-pty` helpers, so I did not establish whether a macOS gate catches it.

The `app.asar` difference is the electron-builder 26 node_modules collector (#8562, already named in the design's risk rationale). Its effect on the running Electron main process is not established; it is a difference the design names as an escalation trigger.

## What the design needs to decide (options seen, not chosen)

1. Keep electron-builder 26 and make `resources/server/node_modules` survive the filter in every target: e.g. an `extraResources` entry whose source root is not the `node_modules` parent (`{ from: "resources", to: ".", filter: ["server/**"] }`, so the path is `server/node_modules`, not the root `node_modules`), or a copy in `afterPack`. This changes the packaging configuration of all five targets (outside the design's "two-line wiring" scope and FU-002 deviation) and needs its own 25-vs-26 comparison of `resources/` on macOS and Windows.
2. Decide whether the `app.asar` collector difference is acceptable (compare runtime-relevant modules, or pin the collector behavior if 26 offers an option), with evidence.
3. Or avoid the electron-builder upgrade: DEC-001 option (b) was rejected for needing a hand-patched legacy runtime; any other route to the static runtime under 25 (e.g. replacing the runtime prefix of the built arm64 AppImage after packaging with the sha256-pinned type2 runtime and re-writing the blockmap/`latest-linux-arm64.yml`) is a new design.

## State of the worktree (uncommitted, nothing committed by implementation)

Done and independent of the decision above:
- `scripts/desktop-package/verify-clean-image-runtime.mjs` + `verify-clean-image-runtime.test.mjs` (3 tests pass). Checked with a test-owned docker stand-in (`evidence/docker-chroot-shim/docker`, chroot of `ubuntu-base-24.04.5-base-arm64`): published `AutoByteus_personal_linux-arm64-1.4.69.AppImage` fails with exit 127 `libz.so: cannot open shared object file`; with a root that has `libz.so` the check fails closed with exit 3 before running the image. Implementation detail: `--mount type=bind,…,readonly` instead of the design's `-v …:ro`, so a wrong path fails in Docker instead of Docker creating a directory.
- `.github/workflows/release-desktop.yml`: the new step in both Linux jobs.
- Docs: `electron_packaging.md` (Linux AppImage Runtime section), `github-actions-tag-build.md`, `RELEASE.md`.

Depends on the decision (present in the worktree, not to be merged as is):
- `autobyteus-web/package.json` `electron-builder` `^26.18.0` and the regenerated `pnpm-lock.yaml` (stale `electron-builder-squirrel-windows@25.1.8` / `app-builder-lib@25.1.8` peer entries removed so pnpm resolved the 26.18.0 peers).
- `linuxAppImageToolset.ts` and the `build.ts` wiring: not written yet.

Not run yet: the toolset `1.0.3` build, AC-001/AC-003 on a new build, fresh-start build, build-only release run.
