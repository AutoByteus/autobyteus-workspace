# Investigation Notes

## Investigation Meta

- Package identifier: `arm64-appimage-libz`
- Request / ticket: Project Task `autobyteus-28` (FU-004 of `autobyteus-22`)
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz` / `codex/arm64-appimage-libz`
- Resolved base remote / branch / revision: `origin/personal` at `9f6add773b6bd1c299548d103cc85d8fc7fe1731` (fetched 2026-11-21)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: worktree created from refreshed `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (2026-11-21). Architecture gate: see `design-spec.md`.
- Investigation status: Complete for SR-001 (requirements and architecture).

## Initial Request And Clarifications

- Original request: Task `autobyteus-28` (see `requirements-doc.md`).
- Clarifications received: the user, 2026-11-21: "work on the follow-up immediately".
- User-supplied facts and constraints: a new beta is the user's decision.
- Initial ambiguity: whether to depend on `libz.so.1` or bundle zlib (DEC-001), and whether x64 is affected (OBS-002).

## Product And Domain Understanding

- Product area: Linux desktop packaging (AppImage) and the Desktop Release workflow.
- Affected actors or systems: arm64 Linux users; `release-desktop.yml` jobs `build-linux-x64` / `build-linux-arm64`.
- Existing user or operational purpose: download the AppImage, run it; the protected Ubuntu installation (`autobyteus-web/docs/linux-managed-desktop.md`) starts from the same AppImage.
- Relevant terminology: *AppImage runtime*: the ELF at the start of the AppImage that mounts (FUSE) or extracts the embedded squashfs and runs `AppRun`. *Legacy runtime*: electron-builder `appimage-12.0.1` (AppImageKit, 2019, dynamically linked, `dlopen`s `libfuse.so.2`). *Static runtime*: AppImage `type2-runtime`, static-pie, FUSE 3 built in, mounts through the host's `fusermount3`.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-21 | Doc | `git show 6533d7be04:tickets/done/team-run-follows-definition/follow-ups.md` (FU-004) | Origin evidence | arm64 runtime `NEEDED libz.so`, x64 `libz.so.1`; verify step passes where the runner has `libz.so` | Re-measured (OBS-001..002) |
| 2026-11-21 | Doc | `/home/autobyteus/workspace/.codex/reports/team-run-follows-definition/receipt-verification.md` | Origin | FU-004 sent urgent | — |
| 2026-11-21 | Code | `.github/workflows/release-desktop.yml` (jobs `build-linux-x64` on `ubuntu-22.04`, `build-linux-arm64` on `ubuntu-24.04-arm`) | Verify step | Step "Verify Linux ARM64 AppImage and updater metadata" runs `verify-layout.mjs` on the runner | OBS-006 |
| 2026-11-21 | Code | `scripts/desktop-package/verify-layout.mjs` | What verify runs | Runs `IMAGE --appimage-extract <file>` on the host for six files + identity; no clean-environment check | Design |
| 2026-11-21 | Code | `autobyteus-web/build/scripts/build.ts` (options, `linux`, `configWithLinuxArtifactName`), `linuxInstallPack.ts`, `afterPack.ts` | Packaging | Per-arch build invocation (`configWithLinuxArtifactName(arch)`); afterPack copies native `AppRun`, provisioner, client, `managed-restart.node`, identity into `appOutDir` | Design |
| 2026-11-21 | Code | `pnpm-lock.yaml`: `electron-builder@25.1.8`, `app-builder-lib@25.1.8`, `app-builder-bin@5.0.0-alpha.10`; `autobyteus-web/package.json` `"electron-builder": "^25.1.8"`, `"electron-updater": "^6.8.9"` | Toolchain | AppImage built by Go `app-builder` with `appimage-12.0.1` | OBS-007 |
| 2026-11-21 | Command | `strings -n 6 app-builder-bin@5.0.0-alpha.10/.../linux/arm64/app-builder \| grep -oE '[A-Z_]*(APPIMAGE\|RUNTIME\|ELECTRON_BUILDER)[A-Z_]*'` | Runtime override in 25? | Only `ELECTRON_BUILDER_CACHE` / binaries mirror; hard-coded `appimage-12.0.1`; no runtime override | DEC-001 |
| 2026-11-21 | Web / Code | `npm pack app-builder-lib@26.18.0`; `out/toolsets/linux.js`, `out/targets/appimage/AppImageTarget.js`, `appImageUtil.js` | Static runtime support | `toolsets.appimage`: `0.0.0` legacy (default), `1.0.2`/`1.0.3` static runtime 20251108 with pinned sha256; static path copies `lib/<arch>` to `usr/lib`, writes launcher, then copies `appOutDir` over the stage (native `AppRun` wins), default compression zstd, `appendBlockmap` as before | OBS-007, design |
| 2026-11-21 | Web | https://www.electron.build/v26/docs/appimage, https://www.electron.build/docs/appimage | Toolset semantics | v26: default `0.0.0`; `1.0.3` recommended; static runtimes don't need FUSE2. v27: static runtime is default | DEC-001 |
| 2026-11-21 | Web | https://github.com/electron-userland/electron-builder/releases/tag/v26.0.0 | Breaking changes | HFS+ DMG removal, deprecated `win`/`mac` fields removed (signing → `win.signtoolOptions`), `linux.desktop` must be an object, node_modules collector change | Our config uses none of the removed fields (no `desktop`, no win signing fields); collector change → RSK-002 |
| 2026-11-21 | Web | AppImageKit issue #1092 (libz.so arm64), FreeShow #352 → electron-builder #7835 | Known upstream | Same defect reported upstream for arm64 electron-builder AppImages; workaround install `zlib1g-dev` | — |
| 2026-11-21 | Command | `gh api repos/AutoByteus/autobyteus-workspace/releases` + `probes/probe-runtime-needed.sh` | Affected releases | 594 Linux AppImage assets | OBS-002 |
| 2026-11-21 | Data | `ubuntu-base-24.04.5-base-arm64.tar.gz` (sha256 `a91d5a93…14f2`, matches `SHA256SUMS`) | Clean image | Contains `libz.so.1`, `libz.so.1.3`; no `libz.so`, no `libfuse*`, no `fusermount*` | OBS-005 |
| 2026-11-21 | Doc | `autobyteus-web/docs/linux-managed-desktop.md`, `linux-install/cmd/launcher/main.go`, `internal/launch/restart_linux.go`, `internal/install/templates.go` | Runtime coupling | Launcher reads `APPIMAGE`; restart clears `APPDIR`, `APPIMAGE`, `ARGV0`, `OWD`; AppArmor profile attaches to the installed AppImage path (`flags=(unconfined)`, `userns`). Nothing reads squashfs offsets or runtime internals | Design |
| 2026-11-21 | Doc | TESTING.md § Fresh-start build; RELEASE.md § Build-only release run; `autobyteus-web/docs/github-actions-tag-build.md` | Validation rules | Build input change → fresh-start build; build step/gate change → `pnpm release:test --ref <branch>` | Verification intent |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Run the arm64 AppImage | Kernel → `ld-linux-aarch64.so.1` resolves runtime `NEEDED` (`libdl.so.2`, `libpthread.so.0`, `libz.so`, `libc.so.6`) → fails when `libz.so` absent | Exit 127 before any app code | OBS-001, OBS-005 | Reproduced |
| BEH-002 | Operational | Release workflow | Build → sign (build-only) → `verify-layout.mjs` (host `--appimage-extract`) → `file` arch → updater metadata → Prisma → packaged server startup → upload | Passes on runner because it has `libz.so` | OBS-006 | Read + inferred from published releases passing |
| BEH-003 | User | Run the x64 AppImage | Runtime `NEEDED libz.so.1` | Loads with `zlib1g`; mount needs `libfuse.so.2` | OBS-002 | Read (no x64 host) |
| BEH-004 | Operational | Release workflow | All five targets built with electron-builder 25.1.8 | — | `release-desktop.yml` | Read |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/build/scripts/build.ts` | electron-builder options; one Linux arch per invocation via `configWithLinuxArtifactName(arch)` | Per-arch toolset choice possible | Owner of the arm64 toolset selection |
| `autobyteus-web/build/scripts/linuxInstallPack.ts` (afterPack) | Copies native `AppRun` etc. into `appOutDir` | Native `AppRun` must stay | Static path copies `appOutDir` after writing its launcher → preserved (to confirm in build) |
| `scripts/desktop-package/verify-layout.mjs` | Extract-based layout/identity checks on host | Gate location | New clean-image check: separate script or extension (design) |
| `.github/workflows/release-desktop.yml` | Linux verify steps | Add clean-image step to both Linux jobs | Docker on GitHub-hosted runners |
| `scripts/desktop-package/release-pipeline.test.mjs` | Node tests over the workflow/pipeline | Existing test style for workflow steps | Extend for the new step (design) |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: the Linux AppImage (runtime prefix + squashfs + embedded blockmap), `latest-linux*.yml`, `.AppImage.release.json(.sig)`.
- Existing readers: `verify-layout.mjs`, `validate_linux_updater_metadata.py`, `sign-release.mjs`/`verify-release.mjs` (digest/length of final bytes), electron-updater, the Go install client (digest/length).
- Evidence paths: see Source Log.

### Structural Surfaces

- Deployment configuration: `release-desktop.yml`; packaging configuration `build.ts`; dependency `electron-builder` (and its `app-builder-lib`, `dmg-builder`, `electron-builder-squirrel-windows` peers in the lockfile).
- Existing structural surfaces that can support the approved behavior: electron-builder `toolsets.appimage` (v26).

### Potential Structural Impacts To Investigate

- API or external-contract change: None.
- Persistence schema or invariant change: None.
- Security or privacy boundary change: None (sandbox, AppArmor and signing untouched; runtime is checksum-pinned by electron-builder).
- Concurrency or lifecycle change: runtime mount lifecycle (fork + keepalive) equivalent between legacy and type2 runtimes.
- Deployment change: packaging toolchain major upgrade (all targets).
- Confirmed absent, present, or unknown: present — toolchain upgrade; absent — data, API.

## Runtime, Probe, Or Reproduction Findings

| ID / Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| OBS-001: `readelf -d ~/.cache/electron-builder/appimage/appimage-12.0.1/runtime-{arm64,x64,armv7l,ia32}`; `runtime-arm64 --appimage-version` on this host (Ubuntu 24.04 arm64, `zlib1g` only) | SCN-001 | arm64/armv7l: `NEEDED libz.so`; x64/ia32: `libz.so.1`. Running arm64 runtime: `error while loading shared libraries: libz.so`, exit 127. All four legacy runtimes contain `libfuse.so.2` / "AppImages require FUSE to run" | Reproduced | REQ-001 | this file |
| OBS-002: `probes/probe-runtime-needed.sh evidence/published-linux-appimage-assets.tsv <dir>` (first 256 KiB of each published asset) | REQ-006 | 297 arm64 assets: all `libz.so`, BuildID `4b12022a0a60af0d4b7920deac219fcbd1d92080` (= cached legacy `runtime-arm64`); 152 stable + 145 beta; first `v1.3.61` (arm64 job added in `0c40c56b47`, 2026-06-19), last `v1.5.14-beta.6`. 297 x64 assets: all `libz.so.1` | Measured | REQ-006 | `evidence/published-appimage-runtime-needed.tsv` |
| OBS-003: download `appimage@1.0.3/appimage-tools-runtime-20251108.tar.gz` (sha256 `84021a78ee214ae6fd33a2d62a92ba25542dd10bc86bf117a9b2d0bba44e7665` = app-builder-lib 26.18.0 pin); `file`/`readelf -d runtimes/runtime-*` | REQ-001 | All four static runtimes `static-pie linked`, no dynamic `NEEDED`. `runtime-arm64 --appimage-version`: `type2-runtime/commit/dd6cebe`. Mount uses host `fusermount` (v3); no `libfuse` needed | Measured | DEC-001 | this file |
| OBS-004: `probes/clean-root-runtime-probe.sh <ubuntu-base-24.04.5-arm64> <static runtime-arm64>` | REQ-001 | exit 0, prints runtime version | Measured | REQ-001 | `evidence/clean-root-static-runtime-arm64.log` |
| OBS-005: same probe with the legacy `runtime-arm64`, and with the first 256 KiB of the published `AutoByteus_personal_linux-arm64-1.5.14-beta.6.AppImage` and `--appimage-extract AppRun` | REQ-003 | Both: `libz.so: cannot open shared object file`, exit 127. Precondition: `libz.so` absent in the base root (asserted by the probe) | Reproduced | REQ-003, AC-003 old-build failure | `evidence/clean-root-legacy-runtime-arm64.log`, `evidence/clean-root-published-1.5.14-beta.6-arm64-head.log` |
| OBS-006: published releases passed the arm64 verify step | REQ-003 | The `ubuntu-24.04-arm` runner provides `libz.so` (otherwise `--appimage-extract` in verify-layout would have exited 127); FU-004 evidence shows verify-layout failing on this host until `libz.so` was provided | Read (inference from releases + FU-004 evidence) | Gate must not use the runner's libraries | FU-004 row |
| OBS-007: electron-builder 26 AppImage code read | DEC-001 | `toolsets.appimage` read from `packager.config.toolsets` per build; legacy path identical runtime `appimage-12.0.1`; static path: `writeAppLauncherAndRelatedFiles` → copy `lib/<arch>` to `usr/lib` → `copyDir(appDir, stageDir)` (our `AppRun` overwrites the generated one) → mksquashfs `-comp zstd` → runtime written at offset 0 → `appendBlockmap`. Desktop `Exec` uses `executableArgs` (ours: `--autobyteus-appimage-desktop-entry`) | Read | REQ-005 | `/tmp/fu004-dl/abl/package/out/targets/appimage/*` (scratch) |

| OBS-008 (IR-001, implementation engineer; root cause confirmed by the Solution Designer): arm64 built twice from the same prepared inputs, electron-builder 25.1.8 vs 26.18.0 (default toolset) | REQ-005 | 26 ships no `resources/server/node_modules` (20,455 files in 25, 0 in 26) and the release job's packaged-server-startup check fails (`ERR_MODULE_NOT_FOUND: reflect-metadata`); `app.asar` differs by 193 removed / 399 added paths (collector re-hoisting, new `@types/*`). Cause: `app-builder-lib@26.x` `out/util/filter.js:42-45` drops every copy source's root `node_modules` (`relative === "node_modules"`), which hits `extraResources {from: "resources/server"}` on all targets; present in 26.0.0 through 26.18.1 | Measured (IR-001); filter line Read by SD | The electron-builder 26 upgrade is not a narrow change: rejected for this ticket (DEC-001 revised), FU-003 | `implementation-design-impact-ir001.md`, `evidence/eb25-vs-eb26-arm64/` |
| OBS-009: `probes/seeded-toolset-probe.sh` (fresh downloads: official `appimage-12.0.1.7z` sha256 `d12ff7eb…c4` = the pin in `app-builder-lib@26.18.0` `toolsets/linux.js`, extracted with `7zip-bin@5.2.0`, identical to app-builder's own cached toolset by `diff -r`; `runtime-arm64` replaced by `./runtimes/runtime-arm64` from `appimage@1.0.3` tarball, sha256 `00cbdfcf917cc6c0ff6d3347d59e0ca1f7f45a6df1a428a0d6d8a78664d87444`; `ELECTRON_BUILDER_CACHE=<prepared> app-builder appimage …` from `app-builder-bin@5.0.0-alpha.10`, the binary electron-builder 25.1.8 uses) | REQ-001, REQ-005 | app-builder reuses the existing toolset folder ("found existing"), prepends the static runtime unchanged (prefix byte-equal), computes size/sha512/blockMapSize as usual; the AppImage has 0 `NEEDED`; in the clean Ubuntu 24.04 root `--appimage-extract AppRun` and `--appimage-extract-and-run` (fake app) exit 0. app-builder needs at least one icon in its configuration (a probe detail, not a product concern) | Measured | Static runtime is reachable on electron-builder 25 with unmodified, pinned binaries; nothing else in the build changes | `evidence/seeded-toolset-probe.log` |

- Temporary diagnostics: None in the worktree. Scratch downloads in `/tmp/fu004-dl`, `/tmp/fu004-probe` (outside the repo).
- Reproduction for implementation to start from: `probes/clean-root-runtime-probe.sh` (as root on an arm64 Linux host): `probes/clean-root-runtime-probe.sh ubuntu-base-24.04.5-base-arm64.tar.gz <AppImage> --appimage-extract AppRun` fails (127) on the current build and must pass on the new one.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via Task comment | Fix immediately; new beta is his decision | Explicit | Urgent; no release in scope | None |
| Upstream reports (AppImageKit #1092, FreeShow #352) | arm64 electron-builder AppImages fail with `libz.so` | Public | Confirms defect class | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| electron-builder | 25.1.8 → 26.x | Toolsets only in 26 | OBS-007 | RSK-002 |
| AppImage type2-runtime | 20251108 (`dd6cebe`) via electron-builder toolset 1.0.3 | FUSE 3 `fusermount3`; `--appimage-extract`, `--appimage-extract-and-run`, env `APPIMAGE`, `APPDIR`, `ARGV0`, `OWD` | OBS-003; `--appimage-help` | RSK-001 |
| Ubuntu base 24.04 | `ubuntu-base-24.04.5-base-arm64` / `ubuntu:24.04` | Stock: `libz.so.1` only | OBS-005 | — |

## Persisted Data And State Facts

- Affected stored or external subject: None (no app data). Published release assets are not changed.
- Remaining evidence gap: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

- N/A.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/clean-root-runtime-probe.sh` | Solution Designer | Clean-image reproduction | arm64 | AC-001, AC-003 | Current | Evidence tool |
| `probes/probe-runtime-needed.sh` | Solution Designer | Published-asset zlib probe | arm64, x64 | REQ-006 | Current | Evidence tool |
| `evidence/published-linux-appimage-assets.tsv` | Solution Designer | Input list (tag, prerelease, name, URL) | — | REQ-006 | Current | Evidence |
| `evidence/published-appimage-runtime-needed.tsv` | Solution Designer | Probe result per asset (tag, prerelease, name, zlib NEEDED, runtime BuildID) | — | REQ-006, AC-006 | Current | Evidence |
| `evidence/clean-root-*.log` | Solution Designer | OBS-004/005 logs | arm64 | AC-001, AC-003 | Current | Evidence |
| `follow-ups.md` | Solution Designer | FU-001..FU-003 | — | — | Current | — |
| `probes/seeded-toolset-probe.sh` | Solution Designer | SR-002 premise: app-builder 25 + prepared toolset folder → static-runtime AppImage that runs in the clean root | arm64 | REQ-001, REQ-005 | Current | Evidence tool |
| `evidence/seeded-toolset-probe.log` | Solution Designer | OBS-009 log | arm64 | REQ-001 | Current | Evidence |
| `implementation-design-impact-ir001.md`, `evidence/eb25-vs-eb26-arm64/` | Implementation engineer | IR-001 evidence (OBS-008) | all targets | REQ-005 | Current | Evidence |
| `evidence/docker-chroot-shim/` | Implementation engineer | Test-owned `docker` stand-in (chroot of ubuntu-base) for local runs of the clean-image check | arm64 | AC-003 | Current | Evidence tool |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | The static runtime mounts only with FUSE 3 (`fusermount3`); an arm64 host with only FUSE 2 cannot mount (extract-and-run still works). | A few arm64 users who run today (with `zlib1g-dev` + `libfuse2`) might need `fuse3` after updating | ASM-001: the arm64 build already requires OpenSSL 3 hosts (Prisma `linux-arm64-openssl-3.0.x` only) — Ubuntu 22.04+, Debian 12+, which ship FUSE 3. Accepted | Accepted |
| RSK-002 | Risk | electron-builder 25 → 26 touches all targets (node_modules collection into `app.asar`, mac/win options, NSIS) | A regression in another target's package | Realized (OBS-008); SR-002 stays on electron-builder 25, so the risk no longer applies to this ticket; FU-003 | Closed (avoided) |
| RSK-003 | Risk | SR-002 relies on app-builder 25 reusing a prepared `appimage/appimage-12.0.1` folder under `ELECTRON_BUILDER_CACHE`, an internal of a pinned tool | An electron-builder change could silently ignore the folder and ship the legacy runtime again | The build asserts that every produced arm64 AppImage starts with the pinned static runtime (loud failure); the release clean-image check catches it too (design SR-002) | Mitigated |
| UNK-001 | Unknown | Whether GitHub `ubuntu-24.04-arm` provides `/dev/fuse` + `fusermount3` | Would allow a mount check in CI | Not needed for the gate (extract-based); DEC-005 | Closed (not needed) |

## Architecture Investigation Findings

- Build entry: `pnpm build:electron:linux:arm64` → `autobyteus-web/build/scripts/build.ts` → `electron-builder` `build({ config: sanitizeConfig(configWithLinuxArtifactName(arch)), targets })`. One arch per invocation; Linux build refuses cross-arch.
- afterPack (`build/scripts/afterPack.ts` → `packLinuxInstall`) writes native files into `appOutDir` before the AppImage target stages; electron-builder 26's static path copies `appOutDir` over its generated `AppRun` (OBS-007), the same precedence as 25.
- Verify step order per Linux job: build → (build-only) sign + `verify-release.mjs` → `verify-layout.mjs` → `file` → updater metadata → Prisma → packaged server startup → upload. Signing in production happens later in `sign-and-verify` (final bytes); the AppImage bytes do not change after the build job.
- GitHub-hosted Ubuntu runners include Docker; `ubuntu:24.04` image for the runner's architecture matches the `ubuntu-base` root (OBS-005).
- `scripts/desktop-package/release-pipeline.test.mjs` already tests the release pipeline scripts with `node --test`, run in the "Check native and signed-record units" step.

## Requirement Implications

- The fix must remove both `libz.so` and (to be a "stock desktop" start) `libfuse.so.2` from the arm64 runtime's requirements → DEC-001 (static runtime).
- x64 unaffected → REQ-004, FU-001.
- The gate must not use the runner's libraries → REQ-003, QR-001.

## Notes For Architecture Design

- Approved scenarios: SCN-001..SCN-004.
- Constraints: native `AppRun` precedence; signing over final bytes; per-arch build; x64 runtime identical; Fresh-start build and build-only release run required (TESTING.md, RELEASE.md).
