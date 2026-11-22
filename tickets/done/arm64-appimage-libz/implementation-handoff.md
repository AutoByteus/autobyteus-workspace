# Implementation Handoff — arm64-appimage-libz (autobyteus-28)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (task_size `Medium`, architectural_risk `High`); ARCH-REV-002 `Pass` on SR-002. Handoff rule: implementation complete with `architectural_risk=High` → `/code_reviewer`.
- Requirements doc: `tickets/in-progress/arm64-appimage-libz/requirements-doc.md` (approved at SR-001; SR-002 changed technical decision text only)
- Investigation notes: `tickets/in-progress/arm64-appimage-libz/investigation-notes.md`
- Solution revision record: `tickets/in-progress/arm64-appimage-libz/solution-revision-record.md`
- Design spec: `tickets/in-progress/arm64-appimage-libz/design-spec.md` (SR-002, `Ready`)
- Supplemental task artifacts: `probes/seeded-toolset-probe.sh`, `probes/clean-root-runtime-probe.sh`, `evidence/seeded-toolset-probe.log`, `follow-ups.md`
- Design review report: `tickets/in-progress/arm64-appimage-libz/design-review-report.md` (ARCH-REV-002)
- Architecture review revision record: `tickets/in-progress/arm64-appimage-libz/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (first complete implementation). IR-001 (`implementation-design-impact-ir001.md`) is the Design Impact that led to SR-002.

All paths are under `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/`.

## Current Implementation Summary

The Linux arm64 AppImage now starts with electron-builder's static AppImage runtime (type2, static-pie, no `NEEDED`), on electron-builder 25.1.8. `buildLinuxAppImage` owns the Linux AppImage build for both `build.ts` branches. For arm64 it does four things:
1. It prepares a toolset folder: the official `appimage-12.0.1` toolset, with its `runtime-arm64` replaced by the pinned static runtime. The downloads and the runtime member are checked against pinned sha256 values, and the folder only ever exists complete.
2. It points `ELECTRON_BUILDER_CACHE` at that folder for that one build only.
3. It requires exactly one produced `*.AppImage` and asserts that the image starts with the pinned runtime bytes.
4. It restores the variable afterwards.

x64 is built exactly as before. Both Linux release jobs gained a clean-image step (`verify-clean-image-runtime.mjs`). It runs the AppImage in a stock `ubuntu:24.04` container, after asserting that the container has no `libz.so`.

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/arm64-appimage-libz/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-002` (SR-001 superseded via IR-001)
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: ARCH-REV-002 notes N-2, N-3 (both applied)
- Commits (branch `codex/arm64-appimage-libz`, pushed): `7ad305aeb0` implementation; `e692d8cfc6` type-only imports for the web typecheck gate; `05996bd715` `7za` executable bit. The handoff/evidence commit is the one that contains this file.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change matches the planned files: 2 new packaging files, `build.ts` −10 lines, 1 devDependency, the verifier and its test, 2 workflow steps, 3 docs, and 1 spec. The risk surface is unchanged: what the arm64 release ships, two pinned downloads at build time, and the coupling to app-builder's toolset folder, guarded by the assertion. No escalation trigger fired: arm64 output differs from the v25 baseline only in the runtime and the size/sha512/blockMapSize that follow from it (IMP-04); the assertion passed; the x64 runtime is byte-identical and all five targets build and verify (IMP-09); Docker is present on both Linux runners (IMP-09).
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | arm64 runtime has no shared-library dependency; loads in a stock root; runs native `AppRun` | `build.ts` LINUX/ALL → `buildLinuxAppImage('arm64')` (`linuxAppImageBuild.ts`) → `prepareArm64AppImageToolset()` (`arm64AppImageRuntime.ts`) → `ELECTRON_BUILDER_CACHE` → electron-builder 25 / app-builder → `assertArm64AppImageRuntime` | Runtime sha256 `00cbdfcf…7444`, `NEEDED` count 0; `--appimage-version` and `--appimage-extract AppRun` exit 0 in the clean ubuntu-base 24.04 root, v25 build exit 127 `libz.so` (IMP-05); native ELF `AppRun` and desktop `Exec` unchanged (IMP-04 contents identical, IMP-06 verify-layout) |
| BEH-002 | Each Linux AppImage runs in a clean image without `libz.so`; precondition asserted; job fails otherwise | `scripts/desktop-package/verify-clean-image-runtime.mjs`; `.github/workflows/release-desktop.yml` steps "Verify Linux x64/ARM64 AppImage runs in a clean Ubuntu image" | CI: both steps pass (IMP-09). Local through the docker stand-in: new image passes; v25 build fails exit 127 naming `libz.so`; a root with `libz.so` fails closed with exit 3 (IMP-05) |
| BEH-003 | x64 runtime and behavior unchanged | `buildLinuxAppImage('x64')` = the previous `build({...})` call; no env, no config change | CI x64 runtime sha256 `24da8e0e…` = legacy `appimage-12.0.1/runtime-x64`, `NEEDED` libdl, libpthread, libz.so.1, libc (IMP-09); unit test: no preparation, normal cache (IMP-02) |
| BEH-004 | All other outputs and gates unchanged | electron-builder stays 25.1.8; lockfile only adds `7zip-bin` | All five targets build and pass their gates in the build-only run; artifact names unchanged (IMP-09); arm64 `app.asar`, unpacked tree and image contents identical to the v25 baseline (IMP-04) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-web/build/scripts/linuxAppImageBuild.ts` (new, 32 lines): `buildLinuxAppImage(targetArch, config)`. For arm64: prepare, set the env, build, require exactly one AppImage (N-2), assert, restore the env. Owns `LinuxTargetArch`, which `build.ts` now imports as a type.
- `autobyteus-web/build/scripts/arm64AppImageRuntime.ts` (new, 101 lines): the pins (two URLs + sha256 values, the static `runtimes/runtime-arm64` member size + sha256), cache root `autobyteus-web/node_modules/.cache/autobyteus-arm64-appimage-toolset`, `prepareArm64AppImageToolset()` and `assertArm64AppImageRuntime(imagePath)`. `prepareArm64AppImageToolset()` checks for reuse (runtime digest + `linux-arm64/mksquashfs`), then stages into `.appimage-12.0.1.tmp-<pid>`, extracts with `7zip-bin`, extracts the member with the `tar` package only (N-3), and installs with a rename.
- `autobyteus-web/build/scripts/build.ts`: both Linux branches call `buildLinuxAppImage(...)`; the two inline `build({...})` blocks and the local `LinuxTargetArch` type are removed (538 → 528 lines).
- `autobyteus-web/package.json` / `pnpm-lock.yaml`: devDependency `"7zip-bin": "5.2.0"`. The lockfile diff against the base is exactly that importer entry (3 lines). The SR-001 electron-builder 26 change is reverted.
- `autobyteus-web/scripts/__tests__/linuxAppImageBuild.spec.ts` (new): sequence and assertion unit tests.
- `scripts/desktop-package/verify-clean-image-runtime.mjs` and `.test.mjs` (new; from IR-001, kept).
- `.github/workflows/release-desktop.yml`: one step in each Linux job, after the layout/metadata step.
- Docs: `autobyteus-web/docs/electron_packaging.md` § Linux AppImage Runtime (SR-002 mechanism, FU-003 note), `autobyteus-web/docs/github-actions-tag-build.md` (CI build behavior), `RELEASE.md` (Linux validation list).

## Important Assumptions

- Release runners start with an empty `node_modules/.cache`, so the toolset is downloaded and verified on every release build. The pinned GitHub release assets stay available, and a missing asset fails the build loudly.
- `app-builder` 5.0.0-alpha.10 (lockfile-pinned through electron-builder 25.1.8) keeps reading `$ELECTRON_BUILDER_CACHE/appimage/appimage-12.0.1` (RSK-003). The assertion catches any change.

## Known Risks

- RSK-003 (design): coupling to app-builder's toolset folder layout. It's guarded by the assertion (which runs on every arm64 build and requires exactly one AppImage) and by the CI clean-image step.
- R-5: local reuse re-checks only `runtime-arm64` and `mksquashfs`. Runners always start fresh.
- R-6: while the env is set, other app-builder downloads would land under the prepared root. None happened in the arm64 builds here.
- R-3: electron-builder labels toolset `1.0.3` beta. The runtime file is pinned by sha256.
- DEC-005 / RSK-001: the FUSE 3 mount on a real arm64 desktop is not runnable here; hosts with only FUSE 2 must use `--appimage-extract-and-run`.
- `chmodSync(path7za, 0o755)` changes a file inside `node_modules`, as electron-builder's own `builder-util/out/7za.js` does before every use. Without it a fresh install fails with `EACCES` (seen in CI run 44952318117).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Local Implementation Defect, plus the duplicated Linux build call
- Reviewed refactor decision: `Refactor Needed Now` (small): both Linux call sites folded into `buildLinuxAppImage`. Done.
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A` (IR-001 was the earlier Design Impact, on SR-001)
- Evidence / notes: `build.ts` no longer calls electron-builder for Linux and does not touch `ELECTRON_BUILDER_CACHE`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. No fallback to the legacy arm64 runtime: download, checksum, extraction and assertion failures all fail the build.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. The duplicated Linux `build({...})` blocks and the local `LinuxTargetArch` type are gone. `linuxTargetArchToBuilderArch` stays, because `resolvePlatformTargets` still uses it. Observation, not changed: for `ALL`/`LINUX`, `resolvePlatformTargets`' target map is computed but only the `WINDOWS`/`MAC` branch reads `buildConfig`. The call still validates the Linux host early (before icon generation), so it is not dead. This predates the ticket and is left as is.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: None. Choices made during implementation:
  - `verify-clean-image-runtime.mjs` uses `--mount type=bind,…,readonly` instead of the example's `-v …:ro`, so a wrong path fails in Docker instead of Docker creating a directory there.
  - The runtime assertion compares the sha256 of the first `size` bytes against a pinned `size` + sha256, so it does not depend on the prepared folder.
  - `7za` gets `chmod 0755` (see Known Risks).
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. `build.ts` was already over 500 lines (538) and shrank to 528 (FU-002). New files are 32 and 101 lines.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (design-spec § Persisted Data). No app data, profile or install records are touched.

## Environment Or Dependency Notes

- A local arm64 build here needs Go 1.27.4 (`build-native.mjs` pins it; the host has 1.22) and a build-only trust key (`prepare-build-trust.mjs build-only <dir>` → `AUTOBYTEUS_DESKTOP_PUBLIC_KEY_FILE`). Both are in `/tmp/ab28` (outside the repo).
- The host has no Docker and no `libz.so`. The clean-image check runs locally through `evidence/docker-chroot-shim/docker`: a chroot of `ubuntu-base-24.04.5-base-arm64` with the same content as `ubuntu:24.04`. Differences from Docker: host network, and the image is copied in rather than bind-mounted.
- Run pnpm from the repository root. `autobyteus-web` declares pnpm 10.28.1, which rewrote the lockfile's `libc` fields and installed musl packages. Those ended up in a local `app.asar` until `node_modules` was reinstalled from the frozen lockfile. The committed lockfile is clean (+3 lines).
- Untracked files that are not part of this change: `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` (build outputs), plus the reviewer's and designer's own ticket files (`design-review-report.md`, `architecture-review-revision-record.md`, the edit to `handoff-sr002.md`).

## Checks Run

The evidence is in `tickets/in-progress/arm64-appimage-libz/evidence/`. Rows IMP-04..06 ran on the worktree content that was committed unchanged as `7ad305aeb0`. The later commits only changed type-only import syntax, which is erased in emit (`e692d8cfc6`), and added `chmodSync` before the 7z extraction (`05996bd715`); IMP-08 and IMP-09 rebuilt from `05996bd715`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `node --test scripts/desktop-package/verify-clean-image-runtime.test.mjs` | 7ad305aeb0 | aarch64 container, Node 22.23.3 | `verify-clean-image-runtime.mjs` | BEH-002, QR-001 | Pass | `IMP-01-clean-image-verifier-unit.log` | `# pass 3` |
| IMP-02 | `NUXT_TEST=true pnpm exec vitest run scripts/__tests__/linuxAppImageBuild.spec.ts` (autobyteus-web) | 7ad305aeb0; rerun on 05996bd715 | same | `linuxAppImageBuild.ts`, assertion negatives | BEH-001, BEH-003, N-2 | Pass | `IMP-02-linux-appimage-build-spec.log` | `Tests  7 passed (7)` |
| IMP-03 | `pnpm exec tsc -p build/tsconfig.json`; `pnpm typecheck`; guards | 05996bd715 | same | build scripts, web typecheck gate | REQ-005 | Pass | `IMP-03-build-scripts-tsc.log`; gate in `IMP-08-fresh-start-arm64-build.log` | `[typecheck] production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)` |
| IMP-04 | arm64 package vs IR-001 v25 baseline: same prepared inputs, `collect-facts.sh`, full extraction + `diff -r` | 7ad305aeb0 content | aarch64 container, electron-builder 25.1.8, Go 1.27.4 | the whole arm64 build path | BEH-001, BEH-004, REQ-005 | Pass | `IMP-04-arm64-vs-eb25-baseline/IMP-04-comparison.md` (+ facts files) | `app.asar` sha256 same (`7a2a1c07…`); `Image contents and modes … identical`; size +739,142 = runtime +738,648, blockmap +494 |
| IMP-05 | `readelf -d`; `clean-root-runtime-probe.sh` (`--appimage-version`, `--appimage-extract AppRun`); verifier via docker stand-in, new vs v25; `libz.so`-present root | 7ad305aeb0 content | aarch64 container, ubuntu-base 24.04.5 | static runtime, verifier | AC-001, AC-003 (local form), QR-001 | Pass | `IMP-04-arm64-vs-eb25-baseline/IMP-05-runtime-and-clean-image-checks.log` | new: `NEEDED` count `0`, `exit=0`; v25: `libz.so: cannot open shared object file`, `exit=127`; precondition: `(exit 3): clean image has /lib/aarch64-linux-gnu/libz.so` |
| IMP-06 | arm64 job verify steps locally: sign/verify-release, verify-layout, `file`, updater metadata, packaged server startup | 7ad305aeb0 content | aarch64 container | the packaged arm64 output | BEH-001, BEH-004 | Pass | `IMP-04-arm64-vs-eb25-baseline/IMP-06-arm64-job-verify-steps.log` | `Verified native AppRun, …`; `Packaged server startup validation passed` |
| IMP-07 | compiled `arm64AppImageRuntime.js`: assertion on v25 and new images; reuse, stale `runtime-arm64`, missing `mksquashfs` | 7ad305aeb0 | aarch64 container, network | `prepareArm64AppImageToolset`, `assertArm64AppImageRuntime` | RSK-003, R-5 | Pass | `IMP-07-runtime-assertion-and-toolset-cache.log` | v25: `throws: … does not start with the pinned static AppImage runtime`; reuse `ms 4`; stale → rebuilt `00cbdfcf…`; no leftover staging folder |
| IMP-08 | Fresh-start build (TESTING.md): clean clone, `pnpm install --frozen-lockfile`, units, `pnpm build:electron:linux:arm64`, arm64 verify steps + clean image | 05996bd715 | aarch64 container, Go 1.27.4 on PATH | the whole arm64 release path from a fresh install | DESIGN.md rule 12, AC-001, AC-005 | Pass | `IMP-08-fresh-start-arm64-build.log` | `build-exit=0`; `Verified the AppImage runtime loads and extracts AppRun in a clean ubuntu:24.04 image without libz.so`; runtime `00cbdfcf…` |
| IMP-09 | Build-only release run `pnpm release:test --ref codex/arm64-appimage-libz` (run 44956618584) + Linux artifact inspection | 05996bd715 | GitHub runners | all five desktop targets, both clean-image steps | AC-003 (CI form), AC-004, AC-005, REQ-005 | Pass | `IMP-09-build-only-release-run.log` | `conclusion: success`; both clean-image steps `Verified …`; x64 runtime `24da8e0e…` = legacy `runtime-x64`; arm64 `NEEDED count: 0` |
| IMP-10 | `node --test` on each `scripts/desktop-package/*.test.mjs`; `python3 -m unittest` on the workflow tests | 7ad305aeb0 | aarch64 container, root | release scripts, workflow structure | REQ-005 | Pass (one environment-only failure) | `IMP-10-release-script-units.log` | verifier `# pass 3`; workflow tests `OK`; `desktop-trust-provision.test.mjs # fail 27`: unchanged file that refuses root (`uid!==0`), and it passes in CI's "Check native and signed-record units" step (IMP-09) |

- Earlier failed attempts, both fixed in this round:
  - Build-only run 44948221723 on `7ad305aeb0`: the web typecheck gate rejected a value import of a type (TS1484), because the spec makes `linuxAppImageBuild.ts` a production file of that gate.
  - Run 44952318117 on `e692d8cfc6`: Linux ARM64 failed with `7za EACCES`; the other four targets passed.
- Not run, and why:
  - AC-002 (the app starts and its server reaches ready, through extract-and-run in a clean environment with a display): API/E2E.
  - The FUSE 3 mount on a real arm64 desktop: DEC-005, no `/dev/fuse` here.
  - Byte-level comparison of the macOS/Windows/x64 packages against a 25 baseline built from the same commit. Only artifact names, successful gates and the x64 runtime bytes were checked. Their config and env are unchanged by construction.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: packaging and release workflow only. No rendered UI changes.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002: in the clean ubuntu-base 24.04 root, with the desktop libraries Electron needs and a display, as a non-root user: `--appimage-extract-and-run` on the new arm64 image starts AutoByteus and its server; the v25 image fails at the loader. CI-built image: run 44956618584, artifact `linux-arm64`.
- AC-003 with the published `v1.5.14-beta.6` arm64 asset. I used the published `1.4.69` asset and the local v25 build; both fail with exit 127.
- AC-004: compare the x64 image tree (`unsquashfs -lls`) from run 44956618584 with an x64 25 build of the same commit, if an x64 host is available.
- Review focus: `ELECTRON_BUILDER_CACHE` set/restore around the arm64 build in the `ALL` branch, the staging → rename, the reuse condition, and the exactly-one-AppImage rule.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-002 app start (extract-and-run) and AC-006 (Solution Designer's result to the user).
- Independent confirmation of AC-001/AC-003/AC-004/AC-005 against the CI artifacts (evidence above).
