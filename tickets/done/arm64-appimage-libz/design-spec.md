# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (revises SR-001 after implementation Design Impact IR-001; SR-001's ARCH-REV-001 Pass covered the electron-builder 26 design and does not apply to this revision)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` approved at SR-001 by the Solution Designer within the Task's direction (user informed 2026-11-21). SR-002 changed only technical decision text (DEC-001 mechanism, QR-002 pin owner, DEC-004 wording, one External Contracts row); intended behavior, REQ/AC and scope are unchanged, so that approval applies.
- Behavior-defining supplements and their approval references: None.
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/investigation-notes.md`
- Authorities read (design reading gate; 2026-11-21, re-entered for SR-002 in the same conversation): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, `DESIGN.md` (repository root; rules 1, 5, 6, 11, 12), `docs/design-cases.md` (Case 21; Case 27 added by this revision). `references/design-examples.md`: not used.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

- `pnpm build:electron:linux:arm64` runs `autobyteus-web/build/scripts/build.ts`; Linux AppImages are built in two places with the same call: the `ALL` branch (`build.ts:478-485`) and the `LINUX` branch (`build.ts:518-525`), each `build({ config: sanitizeConfig(configWithLinuxArtifactName(arch)), publish: 'never', targets: <Linux AppImage> })`. electron-builder is `25.1.8` (`autobyteus-web/package.json:204`, lockfile).
- electron-builder 25 hands the AppImage to the Go `app-builder` (`app-builder-lib@25.1.8` `out/targets/AppImageTarget.js:58-92`: `app-builder appimage --stage --arch --output --app --configuration`). `app-builder` takes its toolset from `$ELECTRON_BUILDER_CACHE/appimage/appimage-12.0.1`, reuses that folder when it exists, and prepends `runtime-<arch>` from it unchanged (OBS-009).
- The arm64 runtime in that toolset needs `libz.so` (OBS-001/002). x64's needs `libz.so.1`.
- afterPack (`linuxInstallPack.ts:7-29`) puts the native `AppRun` etc. into `appOutDir`; published arm64 builds pass `verify-layout.mjs`'s native-`AppRun` check, so that precedence already holds with electron-builder 25.
- The Linux jobs of `.github/workflows/release-desktop.yml` (job `build-linux-x64` on `ubuntu-22.04`, lines 375-487; job `build-linux-arm64` on `ubuntu-24.04-arm`, lines 488-597) run `verify-layout.mjs`, which executes the AppImage on the runner (`verify-layout.mjs:12-13`); the runner has `libz.so` (OBS-006).
- IR-001 (OBS-008): electron-builder 26 drops the server's `node_modules` from every target (`app-builder-lib@26.x` `out/util/filter.js:42-45`) and re-hoists `app.asar`; the upgrade route of SR-001 is not viable for this ticket.
- The launcher/restart/install code does not depend on runtime internals (reads `APPIMAGE`, clears `APPDIR`/`APPIMAGE`/`ARGV0`/`OWD`; investigation Source Log).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: two new packaging files (`linuxAppImageBuild.ts`, `arm64AppImageRuntime.ts`), `build.ts` wiring (two duplicated Linux call sites replaced by one call each), one devDependency (`7zip-bin`, already in the lockfile), the clean-image verifier with its unit test, two workflow steps, three docs. Existing owners; no new subsystem.
- Architectural risk: `High`
- Risk rationale and supporting evidence: it changes what the release ships for Linux arm64 (runtime FUSE 2 dynamic → static FUSE 3; DEC-005 mount path not runnable here), adds two network downloads with pinned checksums to the release build (supply-chain surface), and relies on an internal of a pinned tool (`app-builder`'s toolset folder, RSK-003) guarded by a build-time assertion. All other targets' outputs stay byte-identical, which keeps the blast radius to the arm64 AppImage.
- Escalation trigger if implementation or validation discovers new impact: the arm64 build's output differs from the electron-builder 25 baseline in anything other than the runtime prefix (and the sizes/digests that follow from it); `app-builder` does not use the prepared folder (assertion fires); any x64, macOS or Windows output changes; Docker unavailable on a runner → `Design Impact` to the Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| OBS-001..002 | investigation notes; `evidence/published-appimage-runtime-needed.tsv` | arm64 legacy runtime needs `libz.so`; all 297 arm64 releases affected; x64 not | Change only the arm64 runtime | None |
| OBS-003..004 | static `runtime-arm64` from `appimage@1.0.3` (`appimage-tools-runtime-20251108.tar.gz`, sha256 `84021a78…7665`), file sha256 `00cbdfcf…7444` | Static, no `NEEDED`; runs in the clean root | Runtime choice | FUSE-3 mount on a real desktop (DEC-005) |
| OBS-008 (IR-001) | `implementation-design-impact-ir001.md`; `app-builder-lib@26.18.0` `out/util/filter.js:42-45` | electron-builder 26 drops `resources/server/node_modules`, re-hoists `app.asar` | Stay on electron-builder 25 (FU-003 for the upgrade) | None |
| OBS-009 | `probes/seeded-toolset-probe.sh`, `evidence/seeded-toolset-probe.log` | Official `appimage-12.0.1.7z` (sha256 `d12ff7eb…c4`) extracted with `7zip-bin` equals app-builder's own toolset; with its `runtime-arm64` replaced by the static one and `ELECTRON_BUILDER_CACHE` pointing at it, `app-builder` 5.0.0-alpha.10 produces an AppImage whose prefix is byte-equal to the static runtime, with size/sha512/blockMapSize computed as usual; it extracts and runs in the clean root | Prepared toolset folder + `ELECTRON_BUILDER_CACHE` for arm64 | Full app build: proven by implementation (AC-001..003, AC-005) |
| OBS-005 | `probes/clean-root-runtime-probe.sh` | Clean Ubuntu 24.04 base reproduces failure (127) and fix (0) | Gate image and precondition | None |

## Intended Change

Keep electron-builder 25. For the Linux arm64 AppImage only, the build prepares a toolset folder (the official `appimage-12.0.1` toolset with its `runtime-arm64` replaced by the official static runtime, all sha256-verified), points electron-builder's cache at it, and fails unless the produced AppImage starts with the pinned static runtime. Add a release verify step to both Linux jobs that runs the AppImage in a clean `ubuntu:24.04` container after asserting that `libz.so` is absent there.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. Areas: `autobyteus-web/build/scripts` (Linux AppImage build sequence, arm64 static runtime provisioning, `build.ts` call sites); `autobyteus-web/package.json` devDependency `7zip-bin`; `scripts/desktop-package` (clean-image verifier + unit test); `.github/workflows/release-desktop.yml` Linux jobs; docs.
- Derived consumers: `N/A` (no stored or shared structure changes). Signing, `latest-linux-arm64.yml`, the embedded blockmap and the install client read the final file; `app-builder` computes size/sha512/blockMapSize after writing it (OBS-009).
- Deliberately left alone: electron-builder version (FU-003); x64 runtime and every x64/macOS/Windows output (byte-identical by construction: no config or env change for them); `verify-layout.mjs`; native launcher, install, AppArmor, restart and update code; the rest of `build.ts` (FU-002).
- Follow-ups: FU-001 (x64 needs `libfuse2`), FU-002 (`build.ts` size), FU-003 (electron-builder 26+ upgrade, then replace the prepared toolset with `toolsets.appimage`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002 / AC-001, AC-002 | User runs the arm64 AppImage | Loader fails on `libz.so` (OBS-001) | Static runtime loads, mounts (FUSE 3) or extract-and-runs, runs native `AppRun` | DS-001, DS-002 |
| BEH-002 | Operational | REQ-003, REQ-005 / AC-003, AC-005 | Desktop Release Linux job | Host-only extract check (OBS-006) | + clean-image runtime check, both arches | DS-003 |
| BEH-003 | User | REQ-004 / AC-004 | User runs the x64 AppImage | Legacy runtime, `libz.so.1` | Unchanged: x64 build untouched | DS-001 |
| BEH-004 | Operational | REQ-005 / AC-005 | Desktop Release, all targets | electron-builder 25.1.8 | Unchanged: same electron-builder, no config change | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `probes/seeded-toolset-probe.sh` | SR-002 premise | REQ-001, REQ-005 | Same preparation the new owner performs, in shell | Evidence tool |
| `probes/clean-root-runtime-probe.sh` | Clean-root reproduction | AC-001, AC-003 | Same check the verifier performs, in a chroot | Evidence tool |
| `implementation-design-impact-ir001.md` | IR-001 | REQ-005 | Why the upgrade route was dropped | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes` (small): the two Linux build call sites in `build.ts` repeat the same build call; the arm64 runtime sequence (prepare → build → assert) would have to repeat in both.
- Structural triggers that fire, each with evidence and the response:
  - *Repeated coordination* (Principle 13): `build.ts:478-485` and `518-525` both build the Linux AppImage; the new sequence must apply to both. Response: one owner, `buildLinuxAppImage(targetArch, config)` in `linuxAppImageBuild.ts`, called from both branches.
  - *Repeated coordination* (Principle 13): the clean-image check runs in two jobs. Response: one owner, `verify-clean-image-runtime.mjs`.
  - *Hidden dependency* (Principle 16): `app-builder` reads `ELECTRON_BUILDER_CACHE` from its environment, a process-wide value. Response: set only inside `buildLinuxAppImage` for arm64, immediately around its `build()` call, and restored in `finally`; a missing or unused folder fails loudly through the runtime assertion, never silently. Nothing reads it before it is set; it hides no cycle.
  - *Responsibility overload* (Principle 12): `build.ts` is 538 lines. Response: the new code lives in two new files; `build.ts` loses the duplicated Linux `build({...})` blocks (net fewer lines). No deviation needed.
  - Ruled out: *Empty indirection* (`buildLinuxAppImage` owns a sequence and removes duplication; `arm64AppImageRuntime.ts` owns provisioning and pins); *Several kinds* (x64 and arm64 each traced: x64 takes the unchanged path, arm64 the prepared toolset); persisted data, vocabulary, dependency direction.
- Deliberate deviations: None.
- Root cause classification: `Local Implementation Defect` (the packaging toolchain's arm64 runtime choice), plus the small duplicated Linux build call.
- Refactor needed now: `Yes` (small): fold the two Linux build call sites into `buildLinuxAppImage`.
- Evidence: `build.ts:478-485`, `518-525`.
- Design response: see Final File Responsibility Mapping.
- Refactor rationale: the new arm64 sequence would otherwise be duplicated.
- Intentional deferrals and residual risk: FU-001, FU-002, FU-003; RSK-001; RSK-003; DEC-005.

## Terminology

- **AppImage runtime**: the ELF prefix of the AppImage that mounts or extracts the embedded image and runs `AppRun`.
- **Legacy toolset** (`appimage-12.0.1`): electron-builder 25's AppImage tools folder (host `mksquashfs`, runtimes, libraries). **Static runtime**: AppImage type2 runtime (static-pie, FUSE 3 built in), here the `runtime-arm64` file of electron-builder's `appimage@1.0.3` release.
- **Prepared toolset folder**: the legacy toolset with its `runtime-arm64` replaced by the static runtime, under a build-owned cache root that `ELECTRON_BUILDER_CACHE` points to for the arm64 build.
- **Clean image**: stock `ubuntu:24.04` container of the runner's architecture, `libz.so` absent (asserted).
- No new domain words for `GLOSSARY.md`.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths in this scope: the arm64 use of the legacy runtime; the duplicated Linux `build({...})` calls in `build.ts`.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`. No fallback to the legacy arm64 runtime: a failed download, checksum or assertion fails the build.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003, BEH-004 | `pnpm build:electron:linux:<arch>` | AppImage + `latest-linux*.yml` | `buildLinuxAppImage` | Where the arm64 runtime is chosen and checked |
| DS-002 | Primary End-to-End | BEH-001 | User runs the AppImage | AutoByteus window | Runtime → native `AppRun` | The user's start path |
| DS-003 | Primary End-to-End | BEH-002 | Linux release job after build | Job passes/fails | `verify-clean-image-runtime.mjs` | The new gate |

## Primary Execution Spine(s)

- DS-001 (arm64): `build.ts main (LINUX or ALL branch) -> buildLinuxAppImage('arm64', config) -> prepareArm64AppImageToolset() [download + verify + extract legacy toolset; download + verify static runtime; place runtime-arm64; verify] -> ELECTRON_BUILDER_CACHE=<cache root> -> electron-builder build() -> afterPack (native AppRun) -> app-builder appimage (prepared toolset: runtime prefix + squashfs + blockmap) -> latest-linux-arm64.yml -> assertArm64AppImageRuntime(each produced AppImage) -> restore ELECTRON_BUILDER_CACHE`
- DS-001 (x64): `build.ts main -> buildLinuxAppImage('x64', config) -> electron-builder build()` (unchanged behavior).
- DS-002: `User runs AppImage -> static runtime -> fusermount3 mount (or --appimage-extract-and-run) -> native AppRun -> Electron -> AutoByteus window`
- DS-003: `Linux job step -> verify-clean-image-runtime.mjs IMAGE -> docker run ubuntu:24.04 (image bound read-only) -> assert no libz.so -> IMAGE --appimage-extract AppRun -> exit 0 / job fails with the loader's message`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The Linux build owner prepares a verified toolset folder for arm64, has electron-builder 25 use it, and refuses an image that does not start with the pinned static runtime | Linux build, toolset folder, AppImage | `buildLinuxAppImage` | `arm64AppImageRuntime.ts` (provisioning, pins, assertion) |
| DS-002 | The static runtime needs no host library and hands over to the unchanged native `AppRun` | runtime, `AppRun` | runtime / launcher | — |
| DS-003 | The release job runs the image in a stock container | verifier, clean image | `verify-clean-image-runtime.mjs` | — |

## Spine Actors / Main-Line Nodes

`build.ts` main, `buildLinuxAppImage`, electron-builder/`app-builder`, AppImage runtime, native `AppRun`, `verify-clean-image-runtime.mjs`, the release job step.

## Ownership Map

- `build.ts` main: chooses platforms and configurations (unchanged role); for Linux it calls `buildLinuxAppImage`.
- `linuxAppImageBuild.ts` `buildLinuxAppImage(targetArch, config)`: owns the Linux AppImage build sequence: for arm64, prepare → set cache env → build → assert → restore; for x64, build. Returns the artifact paths electron-builder reports.
- `arm64AppImageRuntime.ts`: owns the arm64 static runtime: the pinned URLs and sha256 values (legacy toolset archive, static toolset archive, static `runtime-arm64` file), preparing and reusing the cache root, and `assertArm64AppImageRuntime(imagePath)`.
- `verify-clean-image-runtime.mjs`: owns the clean-image check (image tag, precondition, in-container command, failure message).
- Workflow Linux jobs: when the check runs.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| The two inline Linux `build({...})` calls in `build.ts` (`478-485`, `518-525`) | Duplicated; the arm64 sequence must not be duplicated | `buildLinuxAppImage` | The `LINUX` branch keeps logging the result |
| SR-001 work in the worktree: `electron-builder ^26.18.0` in `autobyteus-web/package.json` and the regenerated `pnpm-lock.yaml` | SR-001 route dropped (IR-001) | electron-builder stays `^25.1.8`; lockfile changes only by adding `7zip-bin` as a direct devDependency | Revert to the base lockfile, then add `7zip-bin` |

No dead code found in the touched code.

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner `prepareArm64AppImageToolset()`: `cache root has runtime-arm64 with the pinned sha256 and the legacy toolset marker? -> reuse | else: download legacy .7z -> verify sha256 -> extract (7zip-bin) into a temp folder -> download static .tar.gz -> verify sha256 -> extract ./runtimes/runtime-arm64 -> verify file sha256 -> install as runtime-arm64 (0755) -> rename temp folder to <root>/appimage/appimage-12.0.1`. Why it matters: a partial folder must never be reused (app-builder reuses any existing folder), so the folder appears only complete, by rename.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| arm64 static runtime provisioning and assertion | DS-001 | `buildLinuxAppImage` | Pins, download/verify/extract, cache reuse, runtime assertion | Keeps supply-chain pins and the tool-internal folder layout in one owned file | Spread into `build.ts`, the pins and the layout coupling get lost |

## Ownership Boundaries

`build.ts` calls only `buildLinuxAppImage` for Linux; it does not touch `ELECTRON_BUILDER_CACHE` or the runtime file. `buildLinuxAppImage` calls `prepareArm64AppImageToolset` and `assertArm64AppImageRuntime`. The workflow calls only the verifier script.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `buildLinuxAppImage` | cache env, toolset preparation, runtime assertion | `build.ts` `ALL` and `LINUX` branches | `build.ts` calling electron-builder directly for a Linux AppImage, or setting `ELECTRON_BUILDER_CACHE` itself | Extend `buildLinuxAppImage` |
| `verify-clean-image-runtime.mjs IMAGE` | image tag, precondition, in-container command | Both Linux verify steps | A workflow step with its own `docker run … --appimage-extract` | Extend the script |

## Dependency Rules

- `build.ts` → `linuxAppImageBuild.ts` → `arm64AppImageRuntime.ts`; `linuxAppImageBuild.ts` → `electron-builder` (`build`, `Platform`, `Arch`, `Configuration`). Neither new file imports `build.ts` (it runs `main()` on import); `linuxAppImageBuild.ts` declares its own `'x64' | 'arm64'` → `Arch` mapping.
- `arm64AppImageRuntime.ts` → `7zip-bin` (`path7za`), `tar` (already a dependency of `autobyteus-web`) or the system `tar`, Node `fetch`/`crypto`/`fs`.
- Process-wide value: `ELECTRON_BUILDER_CACHE` is set by `buildLinuxAppImage` for the arm64 build only and restored in `finally` (Principle 16 conditions: set before `build()` starts and nothing else reads it; a folder that `app-builder` does not use fails the build through `assertArm64AppImageRuntime`; no cycle). No other bindings.

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildLinuxAppImage(targetArch: 'x64' \| 'arm64', config: Configuration): Promise<string[]>` | One Linux AppImage build | Run the Linux build sequence; return artifact paths | Linux target arch + the per-arch config `build.ts` already composes | Owns a sequence |
| `prepareArm64AppImageToolset(): Promise<string>` | The prepared toolset folder | Return the cache root (value for `ELECTRON_BUILDER_CACHE`) after ensuring a complete, verified folder | — | — |
| `assertArm64AppImageRuntime(imagePath: string): void` | One produced arm64 AppImage | Throw unless the file starts with the pinned static runtime bytes (compare sha256 of the first `runtimeLength` bytes) | Path | — |
| CLI `verify-clean-image-runtime.mjs IMAGE` | One AppImage file | Run it in the clean image; exit 0 or fail with the cause | Path | Implemented in the worktree (IR-001), kept |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `buildLinuxAppImage` | Yes | Yes | Low | — |
| `prepareArm64AppImageToolset` | Yes | Yes | Low | — |
| `assertArm64AppImageRuntime` | Yes | Yes | Low | — |
| `verify-clean-image-runtime.mjs` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Linux build sequence | `buildLinuxAppImage` / `linuxAppImageBuild.ts` | Yes | Yes | Low | — |
| arm64 runtime provisioning | `arm64AppImageRuntime.ts`, `prepareArm64AppImageToolset`, `assertArm64AppImageRuntime` | Yes | Yes ("toolset" = electron-builder's word for the tools folder; "runtime" = the AppImage runtime) | Low | — |
| Clean-image check | `verify-clean-image-runtime.mjs` | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Static runtime in the build | electron-builder `toolsets` (v26) | Not usable now | IR-001 | FU-003 |
| Download + checksum + extract | electron-builder's own downloader (internal to `app-builder`) | Not reachable | No public API in 25 | Own small provisioning in `build/scripts` |
| 7z extraction | `7zip-bin@5.2.0` (in the lockfile via electron-builder) | Reuse as a direct devDependency | pnpm does not expose transitive packages | — |
| Clean-image check, unit tests | `scripts/desktop-package/`, `node --test …/*.test.mjs` | Reuse | Existing | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Owner Served | Decision |
| --- | --- | --- | --- | --- |
| Desktop packaging (`autobyteus-web/build/scripts`) | Linux build sequence, arm64 runtime provisioning | DS-001 | `build.ts` | Extend |
| Release verification (`scripts/desktop-package`) | Clean-image check | DS-003 | Linux jobs | Extend |
| Release workflow | Step order | DS-003 | — | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping.

## Reusable Owned Structures Check

None.

## Shared Structure / Data Model Tightness Check

N/A.

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Concern |
| --- | --- | --- |
| `autobyteus-web/build/scripts/linuxAppImageBuild.ts` (new) | `buildLinuxAppImage` | Linux AppImage build sequence (above); maps `'x64' \| 'arm64'` to `Arch`; builds with `targets: Linux → arch → ['AppImage']`, `publish: 'never'`; for arm64 prepares, sets and restores `ELECTRON_BUILDER_CACHE`, and asserts every returned `*.AppImage` |
| `autobyteus-web/build/scripts/arm64AppImageRuntime.ts` (new) | provisioning + assertion | Pins: legacy toolset `https://github.com/electron-userland/electron-builder-binaries/releases/download/appimage-12.0.1/appimage-12.0.1.7z` sha256 `d12ff7eb8f1d1ec4652ca5237a7fbdca33acc0c758045636feca62dc6ecb8ec4`; static toolset `https://github.com/electron-userland/electron-builder-binaries/releases/download/appimage%401.0.3/appimage-tools-runtime-20251108.tar.gz` sha256 `84021a78ee214ae6fd33a2d62a92ba25542dd10bc86bf117a9b2d0bba44e7665`, member `./runtimes/runtime-arm64` sha256 `00cbdfcf917cc6c0ff6d3347d59e0ca1f7f45a6df1a428a0d6d8a78664d87444`. Cache root `autobyteus-web/node_modules/.cache/autobyteus-arm64-appimage-toolset` (reused across local builds; fresh on a runner); folder layout `appimage/appimage-12.0.1/` (app-builder 25's, comment citing OBS-009 and FU-003). A comment states why (autobyteus-28: legacy arm64 runtime needs `libz.so`/`libfuse.so.2`) |
| `autobyteus-web/build/scripts/build.ts` (modify) | main | Both Linux branches call `buildLinuxAppImage(linuxTargetArch, sanitizeConfig(configWithLinuxArtifactName(linuxTargetArch)))`; the inline Linux `build({...})` calls are removed |
| `autobyteus-web/package.json`, `pnpm-lock.yaml` (modify) | dependencies | `electron-builder` stays `^25.1.8` (revert the SR-001 change); add devDependency `"7zip-bin": "5.2.0"` |
| `scripts/desktop-package/verify-clean-image-runtime.mjs` + `.test.mjs` | clean-image check | As implemented in IR-001 (kept) |
| `.github/workflows/release-desktop.yml` | Linux jobs | As implemented in IR-001 (kept). The arm64 job needs network access to github.com during the build, as `app-builder` already does |
| `autobyteus-web/docs/electron_packaging.md` | docs | Linux AppImage runtime section: describe the arm64 prepared toolset (static runtime, pins live in `arm64AppImageRuntime.ts`, build fails unless used), x64 legacy runtime (needs `libfuse2`), the clean-image release check, and that an electron-builder upgrade must replace the prepared toolset with `toolsets.appimage` (FU-003). Remove any SR-001 text about `toolsets`/`linuxAppImageToolset.ts` |
| `autobyteus-web/docs/github-actions-tag-build.md`, `RELEASE.md` | docs | As implemented in IR-001; adjust any SR-001 mechanism wording |
| `docs/design-cases.md` | design cases | Case 27 added by the Solution Designer (this revision) |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As the Final File Responsibility Mapping; no new folders.

## Folder Boundary Check

| Path / Folder | Structural Depth | Ownership Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `autobyteus-web/build/scripts/` | Off-Spine Concern (packaging) | Yes | Low | Existing layout |
| `scripts/desktop-package/` | Off-Spine Concern (release verification) | Yes | Low | Existing layout |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Build sequence | `export async function buildLinuxAppImage(arch, config) { if (arch !== 'arm64') return build({ config, publish: 'never', targets }); const previous = process.env.ELECTRON_BUILDER_CACHE; process.env.ELECTRON_BUILDER_CACHE = await prepareArm64AppImageToolset(); try { const artifacts = await build({ … }); for (const file of artifacts.filter(f => f.endsWith('.AppImage'))) assertArm64AppImageRuntime(file); return artifacts } finally { restore previous (delete when it was unset) } }` | Seeding `~/.cache/electron-builder` (mutates a shared cache, also used by x64 builds); leaving the env set for the following Windows/macOS builds of the `ALL` branch; no assertion | Keeps the coupling local and loud |
| Folder completeness | Extract into `<root>/appimage/.appimage-12.0.1.tmp-<pid>`, install the runtime, verify, then `rename` to `appimage-12.0.1` | Extracting directly into `appimage-12.0.1` | `app-builder` reuses any existing folder, so a half-written one would be used |
| Reuse check | Reuse when `appimage-12.0.1/runtime-arm64` has the pinned sha256 and `appimage-12.0.1/linux-arm64/mksquashfs` exists | Reuse when the folder exists | A stale or foreign folder is rebuilt, not trusted |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Fall back to the legacy arm64 runtime when a download or checksum fails | Build robustness | Rejected | Fail the build |
| Fall back to the host check when Docker is missing | Robustness | Rejected | Fail loudly |
| Upgrade to electron-builder 26 and re-shape `extraResources` | SR-001 route | Rejected for this ticket (IR-001; all-target blast radius, unexplained `app.asar` changes) | FU-003 |
| Rewrite the runtime prefix of the finished AppImage after electron-builder | Avoid the tool-internal folder | Rejected | Would re-implement the blockmap and `latest-linux-arm64.yml` computation that `app-builder` already does |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Revert the SR-001 dependency change: `autobyteus-web/package.json` `electron-builder` back to `^25.1.8`; restore `pnpm-lock.yaml` from the base; add `"7zip-bin": "5.2.0"` to devDependencies and `pnpm install`. Confirm the lockfile diff is only that.
2. Add `arm64AppImageRuntime.ts` and `linuxAppImageBuild.ts`; switch both Linux branches of `build.ts` to `buildLinuxAppImage`.
3. Build arm64 and compare with the electron-builder 25 baseline from IR-001 (`evidence/eb25-vs-eb26-arm64/v25`): identical `app.asar`, `resources/` (including `resources/server/node_modules`), native `AppRun`, desktop `Exec`, artifact names and `latest-linux-arm64.yml` keys; only the runtime prefix and the resulting size/sha512/blockMapSize differ. Packaged server startup passes.
4. Keep the IR-001 verifier, test, workflow steps; update the docs to this mechanism.

## Key Tradeoffs

- Prepared toolset on electron-builder 25 (arm64 only; every other output unchanged; couples to a pinned tool's folder layout, guarded by an assertion) vs electron-builder 26 `toolsets` (supported option, but breaks the server package and re-hoists `app.asar` on all targets): the former for this urgent ticket; the upgrade is FU-003.
- arm64-only switch keeps x64 identical (DEC-002, FU-001).
- `--appimage-extract` in a container checks the runtime's host requirements without a display or FUSE; the app start is proven in validation (AC-002).

## Risks

- RSK-001: arm64 hosts with only FUSE 2 cannot mount; extract-and-run works (ASM-001).
- RSK-003: `app-builder` internal folder layout; mitigated by the assertion and the clean-image gate; electron-builder is lockfile-pinned.
- ARCH-REV-001 R-3 still applies: electron-builder labels toolset `1.0.3` beta; the runtime file is pinned by sha256 and proven by AC-001..003 and the build-only run. ARCH-REV-001 N-1, R-1 and R-2 no longer apply (no `toolsets` config; no `lib/arm64` copy, since the arm64 build still uses app-builder 25's legacy path, which copies libraries only for x64/ia32; x64 assembly unchanged).
- DEC-005: FUSE-3 mount on a real arm64 desktop not runnable here (Case 21); the design holds either way.
- The arm64 release build downloads two pinned archives from github.com (the same host `app-builder` already downloads from); a network failure fails the build.

## Guidance For Implementation

- Reproduction to start from: `probes/clean-root-runtime-probe.sh <ubuntu-base-24.04.5-base-arm64.tar.gz> <AppImage> --appimage-extract AppRun` fails (127) on the current arm64 build and must pass on the new one. `probes/seeded-toolset-probe.sh` shows the preparation end to end with `app-builder` directly (`evidence/seeded-toolset-probe.log`).
- `app-builder` needs at least one icon in its configuration (probe detail); the real build passes electron-builder's icons as today.
- The test-owned docker shim from IR-001 (`evidence/docker-chroot-shim/`) runs the verifier locally.
- Fresh-start build (TESTING.md) and the build-only release run (`pnpm release:test --ref codex/arm64-appimage-libz`) before merge (DESIGN.md rule 12, RELEASE.md).
