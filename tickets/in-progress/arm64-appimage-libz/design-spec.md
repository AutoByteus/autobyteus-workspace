# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction (user informed in the Solution Designer's conversation, 2026-11-21).
- Behavior-defining supplements and their approval references: None.
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/investigation-notes.md`
- Authorities read (design reading gate; 2026-11-21): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, `DESIGN.md` (repository root; rules 1, 5, 6, 11, 12 apply), `docs/design-cases.md` Case 21 (premise checked on a stand-in). `references/design-examples.md`: not used.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

- `pnpm build:electron:linux:arm64` runs `autobyteus-web/build/scripts/build.ts`, which builds one Linux arch per invocation with `configWithLinuxArtifactName(arch)` (`build.ts:355-363`) through `electron-builder@25.1.8` (`autobyteus-web/package.json:204`, lockfile). The AppImage target is the Go `app-builder` with the hard-coded `appimage-12.0.1` toolset; there is no runtime override (investigation Source Log, `app-builder` strings).
- `afterPack` (`build/scripts/afterPack.ts` → `linuxInstallPack.ts:7-29`) puts the native `AppRun`, provisioner, install client, `managed-restart.node` and the identity into `appOutDir` before the AppImage is staged.
- The arm64 runtime prefix of every published AppImage is the legacy `runtime-arm64` (`NEEDED libz.so`, `dlopen libfuse.so.2`): OBS-001, OBS-002. x64's legacy runtime needs `libz.so.1`.
- The Linux jobs of `.github/workflows/release-desktop.yml` (job `build-linux-x64` on `ubuntu-22.04`, lines 375-487; job `build-linux-arm64` on `ubuntu-24.04-arm`, lines 488-597) run `verify-layout.mjs`, which executes the AppImage's `--appimage-extract` on the runner (`scripts/desktop-package/verify-layout.mjs:12-13`). The runner provides `libz.so`, so the defect passes (OBS-006).
- Nothing in the launcher, restart or install code depends on the runtime's internals: it reads `APPIMAGE` (`linux-install/cmd/launcher/main.go:63`) and clears `APPDIR`, `APPIMAGE`, `ARGV0`, `OWD` (`internal/launch/restart_linux.go:83`); both runtimes set these. No code reads squashfs offsets or `/tmp/.mount_*` paths (repo search, investigation).
- Constraints: native `AppRun` must remain the image's `AppRun`; release records sign the final bytes after the build; `latest*.yml` with embedded blockmap; x64 unchanged (REQ-004); all other targets unchanged (REQ-005); DESIGN.md rule 12 (fresh start + build-only run for a build step/gate change).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: one dependency upgrade (`electron-builder` 25 → 26, lockfile), one new policy file plus a two-line wiring change in `build.ts`, one new verify script with its unit test, two new workflow steps, three docs. All within the existing desktop-packaging and release-workflow owners.
- Architectural risk: `High`
- Risk rationale and supporting evidence: deployment/packaging blast radius. The electron-builder major upgrade changes the toolchain that packages all five desktop targets (macOS arm64/x64, Windows, Linux x64/arm64), including its rewritten node_modules collector that decides what goes into `app.asar` (electron-builder 26.0.0 release notes, #8562); the arm64 runtime changes from FUSE 2 to static FUSE 3, whose mount path cannot be run on this host (DEC-005).
- Escalation trigger if implementation or validation discovers new impact: any difference in `app.asar` contents, artifact names or `latest*.yml` shape between 25 and 26 builds beyond the arm64 runtime/compression; any config option electron-builder 26 rejects or changes for macOS/Windows; the native `AppRun` not being the image's `AppRun`; Docker unavailable on a runner → `Design Impact` back to the Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| OBS-001..002 | investigation notes; `evidence/published-appimage-runtime-needed.tsv` | arm64 legacy runtime needs `libz.so`; all 297 arm64 releases affected; x64 not | Change only the arm64 runtime | None |
| OBS-003..004 | toolset `appimage@1.0.3`, sha256 pinned by `app-builder-lib@26.18.0` `out/toolsets/linux.js:19-28` | Static runtime, no `NEEDED`; runs in the clean root | arm64 → toolset `1.0.3` | FUSE-3 mount on a real arm64 desktop (DEC-005) |
| OBS-005 | `probes/clean-root-runtime-probe.sh`, `evidence/clean-root-*.log` | Clean Ubuntu 24.04 base reproduces the failure (127) and the fix (0) | Gate image = Ubuntu 24.04 base, `libz.so` absence asserted | None |
| OBS-007 | `app-builder-lib@26.18.0` `out/targets/appimage/AppImageTarget.js:66-130`, `appImageUtil.js:15-40` | `toolsets.appimage` read per build config; `0.0.0` → same legacy runtime; static path: generated launcher first, then `copyDir(appDir, stageDir)` (our `AppRun` wins), zstd, blockmap appended | Per-arch toolset in the per-arch config; x64 explicitly `0.0.0` | Confirm by build (AC-001 checks `AppRun` is native via `verify-layout.mjs`) |
| v26 config type | `app-builder-lib@26.18.0` `out/configuration.d.ts:47,342` | `toolsets?: ToolsetConfig` top-level; afterPack runs before targets (`platformPackager.js:249-250`) | Config shape | None |
| electron-builder 26.0.0 notes | GitHub release v26.0.0 | Removed deprecated `win`/`mac` fields, `linux.desktop` must be an object, HFS+ DMG removal, node_modules collector | Our config uses none of the removed fields (`build.ts:222-316`: no `desktop`, no win signing fields; `mac.notarize` boolean, `mac.sign` path) | Collector output → AC-005 asar comparison |

## Intended Change

Build the Linux arm64 AppImage with electron-builder's static AppImage runtime (toolset `1.0.3`) and keep x64 on the legacy toolset, which needs upgrading `electron-builder` to 26.x; add a release verify step to both Linux jobs that runs the built AppImage inside a clean `ubuntu:24.04` container after asserting that `libz.so` is absent there.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. Areas: `autobyteus-web` packaging dependency and Linux build configuration; `scripts/desktop-package` (new clean-image runtime check + unit test); `.github/workflows/release-desktop.yml` Linux jobs; docs describing Linux packaging and release verification.
- Derived consumers: `N/A` (no stored or shared structure changes). The AppImage bytes' consumers (signing, `latest-linux-arm64.yml`, blockmap, install client) read the final file as before.
- Deliberately left alone: the x64 runtime (DEC-002); `verify-layout.mjs` (host layout checks keep their concern); native launcher, install, AppArmor, restart and update code; macOS/Windows configuration (unchanged unless electron-builder 26 rejects an option: escalation trigger); `build.ts` structure beyond the two-line wiring (FU-002).
- Follow-ups: FU-001 (x64 needs `libfuse2` on stock Ubuntu 22.04+), FU-002 (`build.ts` over 500 lines).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002 / AC-001, AC-002 | User runs the arm64 AppImage | Loader fails on `libz.so` (OBS-001) | Static runtime loads, mounts (FUSE 3) or extract-and-runs, runs native `AppRun` | DS-001, DS-002 |
| BEH-002 | Operational | REQ-003, REQ-005 / AC-003, AC-005 | Desktop Release Linux job | Host-only extract check (OBS-006) | + clean-image runtime check, both arches | DS-003 |
| BEH-003 | User | REQ-004 / AC-004 | User runs the x64 AppImage | Legacy runtime, `libz.so.1` | Unchanged (explicit `0.0.0`) | DS-001 |
| BEH-004 | Operational | REQ-005 / AC-005 | Desktop Release, all targets | electron-builder 25.1.8 | electron-builder 26.x, outputs unchanged | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/clean-root-runtime-probe.sh` | Clean-root reproduction | AC-001, AC-003 | Same check the new script performs, in a chroot instead of Docker | Evidence tool |
| `evidence/published-appimage-runtime-needed.tsv` | Affected releases | REQ-006 | — | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `No`
- Structural triggers that fire, each with evidence and the response:
  - *Repeated coordination* (Principle 13): the clean-image check is needed in two jobs (x64, arm64). Response: one owner, `verify-clean-image-runtime.mjs`, called by both steps; no inline duplicated `docker run` in the workflow.
  - *Responsibility overload* (Principle 12): `build.ts` is 538 lines, over the 500-line limit before this change. Response: the runtime-per-arch policy goes into its own file; `build.ts` gains only an import and one config line (deviation below; FU-002).
  - Ruled out: *Empty indirection* — the new policy file owns a decision with its reason (which runtime per arch), not a forwarder; the new script owns a check. *Capability-area reuse* — release verification already lives in `scripts/desktop-package/`; the new script joins it. *Several kinds or forms* (Principle 1) — two kinds of image (x64, arm64) and two runtimes: each traced (OBS-001/002 x64 read-only, no x64 host; AC-004 covers x64 on the runner). No persisted data, vocabulary or dependency-direction triggers.
- Deliberate deviations: Principle 12 / ticket-scope "file already over the limit, change adds to it": `build.ts` (538 lines) gets +2 lines (an import and `toolsets: { appimage: … }` in `configWithLinuxArtifactName`). Splitting the packaging script would put an unrelated refactor of every platform's build configuration into an urgent runtime fix; the new policy lands in its own owned file, so the old file grows only by wiring. Recorded as FU-002.
- Root cause classification: `Local Implementation Defect` — in the packaging configuration's dependency choice: electron-builder 25's arm64 AppImage runtime (an upstream binary) links the development name; our verification ran only on a prepared runner. The owners (packaging config, release verify scripts) are right.
- Refactor needed now: `No`
- Evidence: the change attaches to existing owners (`build.ts` per-arch config, `scripts/desktop-package/` verifiers, Linux jobs).
- Design response: per-arch toolset policy file; one clean-image verifier; workflow steps.
- Refactor rationale: none needed.
- Intentional deferrals and residual risk: FU-001, FU-002; RSK-001 (FUSE 3 only), DEC-005 (mount unproven locally).

## Terminology

- **AppImage runtime**: the ELF prefix of the AppImage that mounts or extracts the embedded image and runs `AppRun`.
- **Legacy toolset `0.0.0`** / **static toolset `1.0.3`**: electron-builder's names for the `appimage-12.0.1` runtime (FUSE 2, dynamic) and the type2 static runtime (FUSE 3 built in).
- **Clean image**: a stock `ubuntu:24.04` container of the runner's architecture, `zlib1g` only, `libz.so` absent (asserted).
- No new domain words for `GLOSSARY.md` (packaging terms only).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the arm64 use of the legacy runtime (replaced by configuration, nothing to delete in the repo); the `electron-builder@25.1.8` lockfile entries (replaced).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`. x64 staying on `0.0.0` is not a compatibility path: it is the current x64 runtime, kept by decision DEC-002.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. The runtime only starts the image; app data, profile, installation paths and update records are untouched.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003, BEH-004 | `pnpm build:electron:linux:<arch>` | AppImage + `latest-linux*.yml` in `electron-dist` | `build.ts` (packaging configuration) | Where the runtime is chosen |
| DS-002 | Primary End-to-End | BEH-001 | User runs the AppImage | AutoByteus window | AppImage runtime → native `AppRun` | The user's start path |
| DS-003 | Primary End-to-End | BEH-002 | Linux release job after build | Job passes/fails | `verify-clean-image-runtime.mjs` | The new gate |

## Primary Execution Spine(s)

- DS-001: `build.ts (configWithLinuxArtifactName(arch) + appImageToolset(arch)) -> electron-builder 26 pack -> afterPack (native AppRun etc.) -> AppImageTarget (toolset 1.0.3 arm64 / 0.0.0 x64: stage, copy appOutDir, mksquashfs, prepend runtime, append blockmap) -> electron-dist AppImage + latest-linux*.yml`
- DS-002: `User runs AppImage -> static runtime (no shared libs) -> fusermount3 mount (or --appimage-extract-and-run) -> native AppRun launcher -> Electron -> AutoByteus window`
- DS-003: `Linux job step -> verify-clean-image-runtime.mjs IMAGE -> docker run ubuntu:24.04 (image mounted read-only) -> assert no libz.so -> IMAGE --appimage-extract AppRun -> exit 0 / job fails with the loader's message`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The per-arch build config now names the AppImage toolset; electron-builder stages our afterPack output over its own launcher and writes the chosen runtime in front of the squashfs | build config, AppImage target | `build.ts` | `linuxAppImageToolset.ts` (policy) |
| DS-002 | The static runtime needs no host library; it mounts with the host's FUSE 3 helper or extracts, then hands over to the unchanged native `AppRun` | runtime, `AppRun` | runtime / launcher | — |
| DS-003 | The release job runs the image in a stock container, so a runtime that needs a library a stock system lacks fails the release | verifier, clean image | `verify-clean-image-runtime.mjs` | — |

## Spine Actors / Main-Line Nodes

`build.ts`, electron-builder AppImage target, AppImage runtime, native `AppRun`, `verify-clean-image-runtime.mjs`, the release job step.

## Ownership Map

- `build.ts`: composes the per-arch electron-builder configuration (owns sequencing of the build); takes the toolset from the policy file.
- `linuxAppImageToolset.ts`: owns the decision which AppImage toolset each Linux arch uses, with its reason (DEC-001/DEC-002).
- `verify-clean-image-runtime.mjs`: owns the clean-image runtime check: the image used, the precondition, the command run inside, and the failure message.
- Workflow Linux jobs: own when the check runs (after build, before upload).

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `electron-builder@25.1.8` and its `app-builder-lib`/`dmg-builder`/`electron-builder-squirrel-windows`/`app-builder-bin` 25-line lockfile entries | Upgraded | `electron-builder@^26.18.0` | pnpm updates the lockfile |

No dead code found in the touched files (`build.ts` wiring site, `release-desktop.yml` Linux jobs, `scripts/desktop-package/`).

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| AppImage toolset policy | DS-001 | `build.ts` | Map `x64 → '0.0.0'`, `arm64 → '1.0.3'` with the reason | Keeps the decision and its reason in one owned place; keeps `build.ts` from growing | Inline in a 538-line file, the reason gets lost |

## Ownership Boundaries

The packaging configuration (`build.ts`) is the only caller of the toolset policy. The workflow calls only the verifier script; it does not compose `docker run` itself.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `verify-clean-image-runtime.mjs IMAGE` | container image tag, precondition, in-container command | Both Linux verify steps | A workflow step running its own `docker run … --appimage-extract` | Extend the script |

## Dependency Rules

- `build.ts` → `linuxAppImageToolset.ts` (import). The policy file imports nothing from `build.ts` (it declares its own `'x64' | 'arm64'` parameter type, so no cycle).
- Workflow → `node scripts/desktop-package/verify-clean-image-runtime.mjs`. The script depends on `docker` on `PATH` (present on GitHub-hosted Ubuntu runners); missing Docker or a failing check is a loud failure (non-zero exit with the message), never a skip.
- No process-wide bindings or after-construction collaborators: `None` (Principle 16).

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `linuxAppImageToolset(arch: 'x64' \| 'arm64'): string` (exported from `linuxAppImageToolset.ts`) | AppImage toolset per Linux arch | Return electron-builder's toolset version | Linux target arch | Owns a decision; not a forwarder |
| CLI `verify-clean-image-runtime.mjs IMAGE` | One AppImage file | Run it in the clean image; exit 0 or throw with the cause | Path to an AppImage | Same CLI style as `verify-layout.mjs` |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `linuxAppImageToolset` | Yes | Yes | Low | — |
| `verify-clean-image-runtime.mjs` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Toolset policy | `linuxAppImageToolset` | Yes (electron-builder's own word "toolset") | Yes | Low | — |
| Clean-image check | `verify-clean-image-runtime.mjs` | Yes (verifies the runtime in a clean image; joins `verify-layout`, `verify-release`) | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Clean-image runtime check | `scripts/desktop-package/` verifiers | Extend (new file there) | Release verification lives there | `verify-layout.mjs` checks the image's layout on the host; running in a container is a different concern with its own environment |
| Per-arch packaging policy | `autobyteus-web/build/scripts/` | Extend (new file there) | Packaging policies live there (`linuxInstallPack.ts`, `macSigningPolicy.ts`) | — |
| Unit tests | `node --test scripts/desktop-package/*.test.mjs` (step "Check native and signed-record units") | Reuse | Picks up a new `*.test.mjs` automatically | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Owner Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Desktop packaging (`autobyteus-web/build/scripts`) | Toolset policy, per-arch config | DS-001 | `build.ts` | Extend | |
| Release verification (`scripts/desktop-package`) | Clean-image check | DS-003 | Linux jobs | Extend | |
| Release workflow | Step order | DS-003 | — | Extend | |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction needed).

## Reusable Owned Structures Check

None: no repeated structures.

## Shared Structure / Data Model Tightness Check

N/A.

## Final File Responsibility Mapping

| File | Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/build/scripts/linuxAppImageToolset.ts` (new) | Desktop packaging | Toolset policy | `x64 → '0.0.0'` (legacy, unchanged: DEC-002), `arm64 → '1.0.3'` (static: DEC-001); comment with the reasons and the ticket | One decision | No |
| `autobyteus-web/build/scripts/build.ts` (modify) | Desktop packaging | Per-arch config | `configWithLinuxArtifactName(arch)` adds `toolsets: { appimage: linuxAppImageToolset(arch) }` | Existing owner | — |
| `autobyteus-web/package.json`, `pnpm-lock.yaml` (modify) | Dependencies | — | `"electron-builder": "^26.18.0"` | — | — |
| `scripts/desktop-package/verify-clean-image-runtime.mjs` (new) | Release verification | Clean-image check | See Concrete Examples | One check | No |
| `scripts/desktop-package/verify-clean-image-runtime.test.mjs` (new) | Release verification | Unit test | With a fake `docker` on `PATH`: the image is passed read-only to `docker run --rm --network none … ubuntu:24.04`; a non-zero container exit fails the CLI with the container's stderr in the message; a missing IMAGE argument fails | Tests one CLI | No |
| `.github/workflows/release-desktop.yml` (modify) | Release workflow | Linux jobs | New step in each Linux job after "Verify Linux <ARCH> AppImage and updater metadata": "Verify Linux <ARCH> AppImage runs in a clean Ubuntu image" → `node scripts/desktop-package/verify-clean-image-runtime.mjs "$APPIMAGE"` (same `find` as the step above) | — | — |
| `autobyteus-web/docs/electron_packaging.md` (modify) | Docs | — | Linux AppImage runtime per arch (arm64 static: no `libz`/`libfuse2`, mounts with FUSE 3, `--appimage-extract-and-run` without FUSE; x64 legacy: needs `libfuse2`), and that release verification runs each image in a clean `ubuntu:24.04` | — | — |
| `autobyteus-web/docs/github-actions-tag-build.md` (modify) | Docs | — | "CI build behavior": Linux jobs run the clean-image runtime check | — | — |
| `RELEASE.md` (modify, description line ~570) | Docs | — | The Linux validation list adds "each AppImage runs in a clean `ubuntu:24.04` image without `libz.so`" | — | — |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As the Final File Responsibility Mapping; no new folders.

## Folder Boundary Check

| Path / Folder | Structural Depth | Ownership Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `autobyteus-web/build/scripts/` | Off-Spine Concern (packaging policies) | Yes | Low | Existing layout |
| `scripts/desktop-package/` | Off-Spine Concern (release verification) | Yes | Low | Existing layout |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Toolset policy | `export function linuxAppImageToolset(arch: 'x64' \| 'arm64'): string { return arch === 'arm64' ? '1.0.3' : '0.0.0' }` with a comment: arm64 uses the static runtime because the legacy one needs `libz.so` and `libfuse.so.2` (autobyteus-28); x64 stays on the legacy runtime, pinned explicitly because electron-builder 27 changes the default | Omitting x64 and relying on electron-builder's default | Explicit so a later upgrade cannot change x64 silently (REQ-004) |
| Clean-image check (inside the container, `sh -ec`) | `for f in /lib/libz.so /usr/lib/libz.so /lib/*-linux-gnu/libz.so /usr/lib/*-linux-gnu/libz.so; do [ ! -e "$f" ] \|\| { echo "clean image has $f" >&2; exit 3; }; done; cd "$(mktemp -d)"; /autobyteus.AppImage --appimage-extract AppRun >/dev/null; test -x squashfs-root/AppRun` run as `docker run --rm --network none -v <abs IMAGE>:/autobyteus.AppImage:ro ubuntu:24.04 sh -ec '<script>'` | A check on the runner host (has `libz.so`); `readelf` only (would not catch other missing host libraries); a skipped check when Docker is missing | `--appimage-extract` proves the runtime loads and reads the image in a stock system without starting the desktop; the precondition keeps the check honest if the image ever changes (QR-001) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep electron-builder 25 and seed its download cache with a hand-patched legacy runtime | Avoid a major upgrade | Rejected | Static toolset via supported config (DEC-001) |
| Fall back to the host check when Docker is missing | Robustness | Rejected | Fail loudly; GitHub-hosted runners have Docker |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Upgrade `electron-builder` to `^26.18.0` in `autobyteus-web/package.json`; `pnpm install` updates `pnpm-lock.yaml`. Build arm64 once with no other change and compare against the 25 build: `app.asar` file list (`pnpm dlx @electron/asar list` or the `asar` module from the lockfile), `resources/` tree, artifact names, `latest-linux-arm64.yml` keys. Any difference other than the runtime is the escalation trigger.
2. Add `linuxAppImageToolset.ts` and wire it in `configWithLinuxArtifactName`.
3. Add `verify-clean-image-runtime.mjs` and its unit test.
4. Add the workflow steps to both Linux jobs.
5. Update the three docs.

## Key Tradeoffs

- Static runtime (removes `libz` and `libfuse2`, needs FUSE 3) vs patched legacy runtime (keeps `libfuse2`, hand-modified binary): static chosen (DEC-001).
- arm64-only switch keeps x64 users' behavior identical at the cost of two runtimes in one pipeline (DEC-002, FU-001).
- `--appimage-extract` in a container checks the runtime's host requirements without a display or FUSE; it does not start Electron (the app start is proven by AC-002 in validation, not by every release).

## Risks

- RSK-001: arm64 hosts with only FUSE 2 cannot mount; `--appimage-extract-and-run` works. Mitigated by ASM-001.
- RSK-002: electron-builder 26 changes packaging for other targets → AC-005 (asar/artifact comparison + build-only run on all five targets).
- DEC-005: FUSE-3 mount and managed restart on a real arm64 desktop are not runnable here (Case 21: premise on a stand-in); the design holds either way: if the mount failed, arm64 would be no worse than today and extract-and-run remains.
- Docker on `ubuntu-24.04-arm`: the Server Docker Release already builds natively with Docker on that runner (RELEASE.md), so it is present.

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/arm64-appimage-libz/probes/clean-root-runtime-probe.sh <ubuntu-base-24.04.5-base-arm64.tar.gz> <AppImage> --appimage-extract AppRun` (as root on an arm64 Linux host such as this one). It fails with exit 127 (`libz.so`) on the current build; it must pass on the new arm64 build. The ubuntu-base tarball URL and sha256 are in the probe's header.
- This host has no Docker. To run `verify-clean-image-runtime.mjs` itself against the old and new images locally, use a test-owned `docker` shim on `PATH` that runs the given `sh -ec` script in a chroot of the ubuntu-base tarball with the image copied to `/autobyteus.AppImage` (the same content as `ubuntu:24.04`); keep the shim in the ticket's evidence, not in the repository.
- Verify the native `AppRun` is the image's `AppRun` in the new arm64 build (`verify-layout.mjs` already checks it is an ELF and the provisioner digest).
- Fresh-start build (TESTING.md) is required (`package.json`, lockfile, `build/**`, `scripts/**`, workflow changed), and the build-only release run (`pnpm release:test --ref codex/arm64-appimage-libz`) before merge (DESIGN.md rule 12, RELEASE.md).
