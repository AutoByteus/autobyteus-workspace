# Design Review Report — arm64-appimage-libz (autobyteus-28)

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/requirements-doc.md` (Approved at SR-001; SR-002 revised DEC-001/DEC-004/QR-002 text and External Contracts, intent unchanged)
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/investigation-notes.md` (OBS-008, OBS-009, RSK-003 added)
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/solution-revision-record.md` (SR-002)
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts Reviewed: `implementation-design-impact-ir001.md`, `probes/seeded-toolset-probe.sh`, `evidence/seeded-toolset-probe.log`, `evidence/eb25-vs-eb26-arm64/` (listing), `probes/clean-root-runtime-probe.sh`, `follow-ups.md` (FU-001..003), `handoff-sr002.md`, `docs/design-cases.md` Case 27
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: Architecture Design Complete SR-002 (Design Impact recovery of implementation IR-001), from `/solution_designer`, 2026-11-21
- Prior Review Round Reviewed: `1` (ARCH-REV-001, Pass on SR-001; superseded for the mechanism)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: branch `codex/arm64-appimage-libz` at `cf5e3f2b7f` plus the implementer's uncommitted IR-001 changes. Opened: base `build.ts` (`9f6add773b`) lines 470-532 (the `ALL` branch builds Linux → Windows → macOS with sequential `await`s; the `LINUX` branch one `await build`; the `else` branch never builds Linux), `autobyteus-web/package.json` (build scripts all route through `build/dist/build.js`; `tar ^7.5.22` present; `electron-builder ^25.1.8` at base), base `pnpm-lock.yaml` (`7zip-bin@5.2.0` present). electron-builder 25.1.8 source (`app-builder-lib@25.1.8` in a local pnpm store): `targets/AppImageTarget.js` (hands the AppImage to `app-builder appimage`, `--compression xz` only for `compression: maximum`, `updateInfo` taken from app-builder's JSON), `fileTransformer.js:59-71` (`devDependencies` removed from the packaged main `package.json`), `ELECTRON_BUILDER_CACHE` read in `binDownload.js:44` and `macCodeSign.js:103`. `7zip-bin@5.2.0` ships `linux/arm64`. Kept IR-001 code: `scripts/desktop-package/verify-clean-image-runtime.mjs`, workflow diff (step after "Verify Linux <ARCH> AppImage and updater metadata" in both jobs).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: two new packaging files, `build.ts` call-site consolidation, one devDependency, the kept verifier/test/workflow steps and docs → `Medium`. `High` stays justified on a different basis than SR-001: the shipped Linux arm64 artifact's runtime changes (FUSE 2 dynamic → static FUSE 3, mount unproven on a real desktop, DEC-005), two pinned network downloads enter the release build (supply-chain surface), and the build relies on an internal folder layout of a pinned tool (RSK-003).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. Design approval by the user `Not required`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: unchanged from SR-001 (REQ-001..006, AC-001..006). The SR-002 text changes keep intent: DEC-001 still picks option (c), the static runtime, now delivered on electron-builder 25; QR-002 keeps "official, unmodified, sha256-pinned, no hand-modified binary" and adds "a build that would not use the pinned runtime fails"; only the pin owner moves from electron-builder to our build. The Solution Designer approved within the direction (user informed); no new product behavior, so no `Requirement Gap`.
- Relevant existing behavior and evidence confirmed: IR-001 / OBS-008 shows the SR-001 route broke REQ-005 (server `node_modules` missing, packaged-server startup fails). OBS-009 (`seeded-toolset-probe.log`): `app-builder` 5.0.0-alpha.10 (the binary 25.1.8 uses) reuses a prepared `$ELECTRON_BUILDER_CACHE/appimage/appimage-12.0.1` folder, the output prefix is byte-equal to the pinned static runtime, 0 `NEEDED`, it emits `size`/`sha512`/`blockMapSize`, and `--appimage-extract AppRun` / `--appimage-extract-and-run` exit 0 in the clean root. That covers the gzip squashfs app-builder writes for our config (IR-001 table: gzip; `--compression xz` only for `maximum`).
- Scope guardrail confirmed: unchanged; electron-builder upgrade moved to FU-003.
- Approved change, preserved behavior, and outside scope understood: Yes. Every non-arm64 output keeps the same electron-builder, configuration and environment. The new devDependency `7zip-bin` does not reach `app.asar`, because electron-builder strips `devDependencies` from the packaged main `package.json` (`fileTransformer.js:59-71`).
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none blocking).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on, opened at their cited lines: `build.ts:478-485` and `:518-525` are the only two Linux `build()` calls ✔ (the `else` branch handles Windows/macOS only); sequential awaits ✔; `app-builder-lib@25.1.8` `AppImageTarget.js` → `app-builder appimage` with `--configuration`, no runtime/toolset option ✔; `7zip-bin@5.2.0` already in the lockfile ✔; `tar` already a dependency ✔.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (OBS-001/004/005/009) | Pass (DS-001 arm64: prepare → env → build → assert → restore; DS-002 unchanged) | Confirmed | — |
| BEH-002 | Operational | Pass | Pass | Pass (DS-003 kept; verifier matches the design: `ubuntu:24.04`, precondition, `--network none`, read-only bind, loud failure without Docker) | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass (x64 path receives no env or config change) | Confirmed | — |
| BEH-004 | Operational | Pass | Pass (OBS-008 explains why the upgrade is out) | Pass (same electron-builder; step 3 compares arm64 against the IR-001 v25 baseline) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/seeded-toolset-probe.sh` + `evidence/seeded-toolset-probe.log` | Pass | Pass (investigation OBS-009, design evidence table) | Pass (all three pins checked; prefix `cmp`; `NEEDED` count; clean-root runs) | Pass | Pass (evidence tool) | — |
| `implementation-design-impact-ir001.md` + `evidence/eb25-vs-eb26-arm64/` | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` FU-001..003 | Pass | Pass | Pass (FU-003 names the removal of `arm64AppImageRuntime.ts` after the upgrade) | Pass | Pass | — |
| `docs/design-cases.md` Case 27 | Pass | Pass | Pass | Pass | N/A (project document) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug Fix; small design issue found | — |
| Root-cause classification is explicit and evidence-backed | Pass | Local defect in the toolchain's arm64 runtime plus the duplicated Linux build call (`build.ts:478-485`, `518-525`) | — |
| Refactor decision is explicit | Pass | `Yes` (small): fold both Linux call sites into `buildLinuxAppImage` | — |
| Refactor decision is supported by concrete design sections | Pass | File mapping, removal plan, sequence step 2 | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 (arm64, x64) | Build | Pass | Pass | N/A | Pass | Pass (`buildLinuxAppImage` drives prepare → env → build → assert → restore itself) | Pass (provisioning/pins/assertion in `arm64AppImageRuntime.ts`) | Pass |
| DS-001 local: `prepareArm64AppImageToolset` | Folder preparation | Pass | Pass (temp folder → verify → rename; reuse only on pinned runtime + `mksquashfs` present) | N/A | Pass | Pass | Pass | Pass |
| DS-002 | User start | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Release gate | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `buildLinuxAppImage` | Pass | Pass (cache env, preparation, assertion) | Pass (`build.ts` may not call electron-builder for Linux or set the env itself) | Pass | — |
| `verify-clean-image-runtime.mjs` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `build.ts` → `linuxAppImageBuild.ts` → `arm64AppImageRuntime.ts` | Pass | Pass (neither new file imports `build.ts`, which runs `main()` on import) | Pass | Pass | — |
| `arm64AppImageRuntime.ts` → `7zip-bin`, `tar`, Node `fetch`/`crypto`/`fs` | Pass | Pass | Pass | Pass | N-3 |

Principle 16: `Pass — deviation recorded, reason holds` (design § Task Design Health Assessment, Dependency Rules). `ELECTRON_BUILDER_CACHE` is process-wide, but the conditions hold: `main` runs the builds one after another (the `ALL` branch awaits Linux → Windows → macOS), so the value is set only around the arm64 `build()` and restored in `finally`. A folder that is not used fails loudly through the runtime assertion (N-2 keeps that true), and it hides no cycle.

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `buildLinuxAppImage(targetArch, config): Promise<string[]>` | Pass | Pass | Pass | Low | Pass |
| `prepareArm64AppImageToolset(): Promise<string>` | Pass | Pass | Pass | Low | Pass |
| `assertArm64AppImageRuntime(imagePath): void` | Pass | Pass | Pass | Low | Pass (N-2) |
| CLI `verify-clean-image-runtime.mjs IMAGE` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`. `buildLinuxAppImage` owns a sequence and removes a duplicated call; `arm64AppImageRuntime.ts` owns the pins, provisioning and assertion.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Static runtime | Pass (electron-builder 26 `toolsets`) | Pass (not usable: IR-001) | Pass | Pass | FU-003 removes the new piece later |
| Download/verify/extract | Pass (app-builder's internal downloader has no public API in 25) | Pass | Pass (small, owned) | Pass | — |
| 7z extraction | Pass | Pass (`7zip-bin` already in the lockfile) | N/A | Pass | — |
| Clean-image check, unit tests | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Desktop packaging (`autobyteus-web/build/scripts`) | Pass | Pass | Pass | Pass | — |
| Release verification (`scripts/desktop-package`) | Pass | Pass | Pass | Pass | — |
| Release workflow | Pass | Pass | Pass | Pass | — |

Both kinds (x64, arm64) and both Linux entry branches (`ALL`, `LINUX`) are traced.

## Reusable Owned Structures Verdict

N/A — no repeated structures. The repeated Linux build call becomes one owner.

## Shared Structure / Data Model Tightness Verdict

N/A. Derived consumers: `N/A` (`latest-linux-arm64.yml` and the blockmap use the `size`/`sha512`/`blockMapSize` that app-builder computes after writing the file, as OBS-009 shows). Vocabulary (Principle 15): `Pass` ("toolset", "static runtime", "prepared toolset folder" and "clean image" are each defined once).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Intended Owner? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `build/scripts/linuxAppImageBuild.ts` (new) | Pass | Pass | N/A | Pass | — |
| `build/scripts/arm64AppImageRuntime.ts` (new) | Pass | Pass | N/A | Pass | — |
| `build/scripts/build.ts` (modify; net fewer lines) | Pass | Pass | N/A | Pass | — |
| `package.json` / `pnpm-lock.yaml` | Pass | Pass | N/A | Pass | Revert to the base, then add `7zip-bin` |
| Verifier + test, workflow (kept) | Pass | Pass | N/A | Pass | — |
| Docs (adjust to the SR-002 mechanism) | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/build/scripts/{linuxAppImageBuild,arm64AppImageRuntime}.ts` | Pass | Pass | Low | Pass | — |
| Cache root `autobyteus-web/node_modules/.cache/autobyteus-arm64-appimage-toolset` | Pass | Pass (build-owned, not the shared `~/.cache/electron-builder`) | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Duplicated Linux `build({...})` calls | Pass | Pass | Pass | Pass | — |
| SR-001 dependency change (electron-builder 26, lockfile) | Pass | Pass | Pass | Pass | — |
| SR-001 doc text about `toolsets`/`linuxAppImageToolset.ts` | Pass | Pass | Pass | Pass | — |
| Prepared toolset after the upgrade | Pass (FU-003) | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| arm64 legacy-runtime fallback on download/checksum failure | No (rejected) | Pass | Pass | — |
| Host check when Docker missing | No (rejected) | Pass | Pass | — |
| x64 on the legacy runtime | No (decision DEC-002) | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| App data, installs, update records | `Not Affected` | Pass | Pass | N/A | Pass | The build cache folder is disposable build state, not product data |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Revert dependency, add owners, compare with the v25 baseline, keep the gate, docs | Pass | Pass (none) | Pass | Pass |
| Fresh-start build + build-only release run (DESIGN.md rule 12) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Build sequence with env set/restore | Yes | Pass | Pass (shared `~/.cache`, env leaking to later builds, no assertion) | Pass | N-2 |
| Folder completeness (temp + rename) | Yes | Pass | Pass | Pass | — |
| Reuse check | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `P-001` — The toolset policy also changes local enterprise-flavor arm64 builds

Carried from ARCH-REV-001: `Not Reachable` as a released scenario (every Desktop Release job builds `personal`). Under SR-002 the consequence is smaller still: enterprise builds keep electron-builder 25's generated `AppRun` and desktop entry; only the runtime prefix changes. No finding.

### `P-002` — `ELECTRON_BUILDER_CACHE` set for the arm64 build leaks into a concurrent Windows/macOS build

- Related approved requirement: REQ-005
- Relevant behavior ID(s): BEH-004
- Initiating basis kind: `Operational`
- Trigger: `pnpm build:electron` (`ALL`) on an arm64 Linux host
- Forward path: base `build.ts:470-512` awaits Linux, then Windows, then each macOS arch, one after another; `buildLinuxAppImage` restores the env in `finally` before returning.
- Consequence: none; no concurrency exists.
- Reachability: `Not Reachable`
- Review consequence: none.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

None blocking. Implementation notes (no design revision required):

- **N-2**: `assertArm64AppImageRuntime` must fail when the arm64 build reports no `*.AppImage` artifact (require exactly one), not only check each one it finds. The design's loud-failure claim for RSK-003 and the Principle 16 condition rest on the assertion running. No supported path returns zero AppImages today, so this is cheap hardening of a stated invariant, not a new mechanism.
- **N-3**: pick one extraction mechanism for `./runtimes/runtime-arm64`: the `tar` package already in `autobyteus-web` dependencies, or the system `tar`. The design allows either; do not ship both.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (per handoff rules).

## Residual Risks

- **R-3 (carried)**: electron-builder labels toolset `1.0.3` (the static runtime's source) a beta. Mitigated by the sha256 pin, AC-001..003 and the build-only run. DEC-005 (FUSE-3 mount on a real arm64 desktop) remains accepted.
- **RSK-003**: coupling to app-builder 25's toolset folder layout. Guarded by the build assertion (with N-2) and the release clean-image gate; electron-builder is lockfile-pinned; FU-003 removes it.
- **R-5**: a local cache is reused when its `runtime-arm64` matches the pin and `linux-arm64/mksquashfs` exists. The rest of the legacy toolset is not re-verified on reuse. Runners start fresh, so only local builds are exposed, and the folder lives under `node_modules/.cache`, which our build owns.
- **R-6**: while the env is set, any other `app-builder` download during the arm64 Linux build lands under the prepared root instead of `~/.cache/electron-builder`. None is expected for an AppImage-only build; the effect would be a re-download, not a different output.
- The step 3 comparison should expect only the runtime prefix and the `size`/`sha512`/`blockMapSize` it causes to differ. `app.asar` stays identical because `devDependencies` are stripped from the packaged `package.json`.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: SR-002 replaces the SR-001 mechanism. ARCH-REV-001 notes: N-1, R-1, R-2 obsolete; R-3 still applies; R-4 resolved by DEC-004's wording. task_size `Medium`, architectural_risk `High` confirmed.
