# Code Review Report — arm64-appimage-libz (autobyteus-28)

All paths are relative to `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/` unless absolute.

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/arm64-appimage-libz/requirements-doc.md` (approved at SR-001; SR-002 changed technical decision text only)
- Investigation Notes Reviewed As Context: `tickets/in-progress/arm64-appimage-libz/investigation-notes.md` (OBS-008, OBS-009, which the design cites)
- Solution Revision Record Reviewed As Context: `tickets/in-progress/arm64-appimage-libz/solution-revision-record.md`
- Design Spec Reviewed As Context: `tickets/in-progress/arm64-appimage-libz/design-spec.md` (SR-002, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md`; `evidence/IMP-04-arm64-vs-eb25-baseline/IMP-04-comparison.md`; `evidence/IMP-07-runtime-assertion-and-toolset-cache.log`; `evidence/IMP-08-fresh-start-arm64-build.log`; `evidence/IMP-09-build-only-release-run.log` (summary lines)
- Relevant Solution Revision IDs: `SR-002`
- Design Review Report Reviewed As Context: `tickets/in-progress/arm64-appimage-libz/design-review-report.md` (ARCH-REV-002 Pass; notes N-2, N-3; risks R-3, R-5, R-6, RSK-003)
- Architecture Review Revision Record Reviewed As Context: `tickets/in-progress/arm64-appimage-libz/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`
- Implementation Handoff Reviewed As Context: `tickets/in-progress/arm64-appimage-libz/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `tickets/in-progress/arm64-appimage-libz/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-002` (IR-001 = earlier Design Impact, nothing merged)
- Code Review Revision Record: `tickets/in-progress/arm64-appimage-libz/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation complete IR-002 from `/implementation_engineer`, branch `codex/arm64-appimage-libz` at `91236ad1db` (source at `05996bd715`), base `origin/personal` `9f6add773b`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record / Delivery: N/A (implementation review)
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. The diff matches the design's planned surface: 2 new packaging files (32 + 101 lines), `build.ts` −10 lines, 1 devDependency (+3 lockfile lines), the verifier and its test, 2 workflow steps, 3 docs, 1 spec. `High` holds on the design's grounds: the shipped arm64 runtime changes, two pinned downloads enter the release build, and the build depends on app-builder's internal toolset folder layout (RSK-003). No escalation trigger fired (IMP-04, IMP-09).

## Review Scope

- Changed implementation and behavior reviewed: the Linux AppImage build sequence (`buildLinuxAppImage`), arm64 toolset preparation and runtime assertion, the `build.ts` call sites, the `7zip-bin` dependency, the clean-image verifier and its workflow steps, docs, and the new spec and verifier tests.
- Files / areas reviewed (diff `9f6add773b..05996bd715`, plus the files they call or that call them):
  - `autobyteus-web/build/scripts/linuxAppImageBuild.ts`, `arm64AppImageRuntime.ts`, `build.ts` (whole `main()`, `resolvePlatformTargets`, `linuxTargetArchToBuilderArch`)
  - `autobyteus-web/build/tsconfig.json` (CommonJS output to `build/dist`, which is where `__dirname` resolves the cache root from)
  - `autobyteus-web/package.json`, `pnpm-lock.yaml`, `autobyteus-web/vitest.config.mts` (default include picks up `scripts/__tests__/*.spec.ts`)
  - `node_modules/.pnpm/builder-util@25.1.7/.../out/7za.js` (electron-builder's own `chmod 0o755` of `path7za`)
  - `scripts/desktop-package/verify-clean-image-runtime.mjs` + `.test.mjs`, `.github/workflows/release-desktop.yml` (both Linux jobs)
  - `autobyteus-web/scripts/__tests__/linuxAppImageBuild.spec.ts`
  - `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/docs/github-actions-tag-build.md`, `RELEASE.md`, `docs/design-cases.md`
  - Root `DESIGN.md` rules 5, 8, 11, 12
- Explicit exclusions: ticket evidence/probe files (not product source); the untracked `autobyteus-web/build/dist/` and `*-sdk*/dist/` build outputs; I reran no recorded check, because no code changed after IMP-08/IMP-09 ran on `05996bd715` and their results are clear.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001..REQ-005 / AC-001..AC-005 (REQ-006/AC-006 belongs to the Solution Designer's result). Scope Guardrail: arm64 runtime only; x64 and every other output unchanged.
- Design-spec behavior map verified against the implementation: yes, DS-001 (arm64 and x64) and DS-003 traced in code; DS-002 is runtime behavior covered by evidence and API/E2E.
- Design review report and round confirmed: ARCH-REV-002, round 2, Pass. N-2 and N-3 were both applied (see C-04 and the `tar`-only extraction at `arm64AppImageRuntime.ts:68`).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: None

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `build.ts:477-480` (ALL) / `:512-514` (LINUX) → `buildLinuxAppImage('arm64', cfg)` (`linuxAppImageBuild.ts:12-31`) → `prepareArm64AppImageToolset()` (`arm64AppImageRuntime.ts:52-84`: reuse check, or download+sha256 → 7za extract into staging → tar member → sha256 → install 0755 → rm+rename → re-check) → `ELECTRON_BUILDER_CACHE=<root>` → `build()` → exactly one `*.AppImage` → `assertArm64AppImageRuntime` (sha256 of the first 936,456 bytes) → env restored in `finally`. Evidence: IMP-04 (contents identical, only runtime prefix/size/sha512/blockMapSize differ), IMP-05 (0 `NEEDED`, exit 0 in the clean root; v25 exit 127), IMP-08 fresh start. | — |
| BEH-002 | Confirmed | Both Linux jobs: the new step after "AppImage and updater metadata" → `verify-clean-image-runtime.mjs IMAGE` → `docker run --rm --network none --mount type=bind,…,readonly ubuntu:24.04 sh -ec CHECK`: `libz.so` absence asserted (exit 3) → `--appimage-extract AppRun` → `test -x`. A non-zero exit throws with the container's stderr. Evidence: IMP-01, IMP-05, IMP-09 (both CI steps pass). | — |
| BEH-003 | Confirmed | `linuxAppImageBuild.ts:19`: x64 returns `build({config, publish:'never', targets})` exactly as the removed inline calls did: no env, no preparation. IMP-09: x64 runtime sha256 = legacy `runtime-x64`. | — |
| BEH-004 | Confirmed | electron-builder stays `^25.1.8`; the lockfile only adds `7zip-bin`; Windows/macOS calls in `build.ts` untouched; the ALL branch awaits Linux before Windows/macOS, so the env is already restored when they build. IMP-09: all five targets pass their gates. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001 / REQ-001, REQ-002 | User | Linux arm64 desktop user | Start AutoByteus | Running the downloaded arm64 AppImage | Normal | static runtime → mount/extract → native `AppRun` | App starts; no `libz.so` needed | requirements SCN-001; published-asset TSV | Supported Normal Scenario | Use |
| SCN-002 | BEH-002 / REQ-003 | Operational | Desktop Release workflow | Ship only startable AppImages | Linux job verify step (tag push / `workflow_dispatch`) | Normal | build → verify (+ clean image) → upload | Job fails when the image cannot run in a stock image | `release-desktop.yml`; RELEASE.md | Supported Normal Scenario | Use |
| SCN-003 | BEH-003 / REQ-004 | User | Linux x64 desktop user | Start AutoByteus | x64 AppImage | Normal | unchanged | unchanged | requirements SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-004 / REQ-005 | Operational | Desktop Release workflow | Build all desktop targets | `pnpm build:electron*` via the release jobs (`ALL` / `LINUX` branches) | Normal | `build.ts main` → per-platform builds, sequential | every non-arm64 output unchanged | RELEASE.md § Desktop Release | Supported Normal Scenario | Use |
| SCN-005 | BEH-001 (local) | Operational | Developer | Rebuild the arm64 AppImage locally with an existing `node_modules/.cache` | `pnpm build:electron:linux:arm64` a second time | Normal | `prepareArm64AppImageToolset` reuse branch | the folder is reused only when it holds the pinned runtime and the arm64 tools | design § Reuse check; IMP-07 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `ELECTRON_BUILDER_CACHE` set/restore around the arm64 build (review focus) | SCN-004; design Principle 16 record | Release `ALL`/`LINUX` build | `previousCache` is read before `await prepare…()`, and the variable is assigned only after preparation resolves, so a preparation failure leaves the env untouched. `try/finally` restores the old value, or deletes the variable when it was unset, on success, on a zero/two-AppImage error and on an assertion error. `build.ts:480` is awaited before the Windows/macOS `build()` calls, so they see the original value. No other reader in our scripts (grep). | `linuxAppImageBuild.ts:18-31`; `build.ts:473-510`; spec tests 2–5 | Reject (no defect) | — | Correct as designed; matches ARCH-REV-002's Principle 16 ruling. |
| C-02 | Staging → rename leaves a window where `appimage-12.0.1` is absent, or leaves `.tmp-<pid>` folders after a killed build | SCN-005 | Developer rebuild; a concurrent or killed build | A concurrent second arm64 build in the same checkout, or a SIGKILL mid-preparation: interrupted execution and an unsupported concurrent workflow (Principle 6). Even then, a stray `.tmp-<pid>` folder is never read (app-builder reads only `appimage-12.0.1`), and the folder can't be half-installed, because it appears by rename only after the runtime is written and the post-rename `isPreparedToolset()` check runs. | `arm64AppImageRuntime.ts:54-83`; IMP-07 "no leftover staging folders" | Reject (contrived) | — | No mechanism needed. |
| C-03 | Reuse condition checks only `runtime-arm64` sha256 + `linux-arm64/mksquashfs` | SCN-005 | Developer rebuild | Matches the design's Reuse check row exactly; a stale or foreign folder (legacy runtime, missing tools) is rebuilt (IMP-07). Other toolset files are not re-verified, but those folders live under the build-owned `node_modules/.cache`, and runners start fresh. Corrupting them is manual tampering (Principle 6). | `arm64AppImageRuntime.ts:45-49`; design § Concrete Examples; ARCH-REV-002 R-5 | Reject (recorded risk R-5) | — | — |
| C-04 | Exactly-one-AppImage rule (N-2) | design RSK-003 contract | arm64 build | `artifacts.filter(endsWith('.AppImage'))` must have length 1, else throw listing the artifacts. Then the assertion runs on it, so a run where the assertion silently doesn't happen is impossible. Covered for `[]` and two images. | `linuxAppImageBuild.ts:26-30`; spec `it.each` | Reject (no defect) | — | N-2 applied correctly. |
| C-05 | `chmodSync(path7za, 0o755)` mutates a file inside `node_modules` (pnpm store hard link) | SCN-002 (fresh runner) | Fresh `pnpm install` → arm64 build | Without it, `7za` fails with EACCES on a fresh install (CI run 44952318117). electron-builder 25 does the identical chmod in `builder-util/out/7za.js` `getPath7za()` before every use, so this adds no new kind of mutation to the build. | `arm64AppImageRuntime.ts:64`; builder-util 25.1.7 `7za.js`; IMP-08, IMP-09 | Reject (no defect) | — | Proportionate and mirrors the tool's own behavior. |
| C-06 | `LinuxTargetArch → Arch` mapping exists twice: `linuxTargetArchToBuilderArch` (`build.ts:347`) and the inline ternary (`linuxAppImageBuild.ts:13`) | Principle 11 (one fact, one owner) | — | Two-value closed union; the copies can only drift when a new Linux arch is added, which no requirement plans. The design decided `linuxAppImageBuild.ts` "declares its own … mapping" (Dependency Rules), and ARCH-REV-002 accepted it. | design § Dependency Rules | Reject as finding (suggestion) | — | Optional: export the mapping from `linuxAppImageBuild.ts` next to `LinuxTargetArch` and have `build.ts` import it, as it already does the type. Not required. |
| C-07 | Clean image `ubuntu:24.04` is a moving tag | REQ-003 / QR-001 / DEC-004 | Release job | Approved decision (DEC-004, ARCH-REV-001 R-4): a drift that adds `libz.so` fails closed with exit 3 (IMP-05). | verifier `CHECK`; IMP-05 | Reject (approved) | — | — |
| C-08 | Other app-builder downloads land under the prepared root while the env is set (R-6) | SCN-004 | arm64 build | Effect would be a re-download into the build-owned cache, not a different output. None observed. | ARCH-REV-002 R-6; IMP-04 | Reject (recorded risk) | — | — |
| C-09 | New web spec enters the web typecheck gate (DESIGN.md rule 12) | DESIGN.md rule 12 | Release runner fresh install | The gate caught TS1484 in build-only run 44948221723; fixed in `e692d8cfc6`; fresh-start build (IMP-08) and build-only run (IMP-09) pass on `05996bd715`. | IMP-03, IMP-08, IMP-09 | Reject (resolved in-round) | — | Rule 12 proof present. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Design: Bug Fix, Local Implementation Defect + duplicated Linux call; refactor small. Implemented: both call sites now go through `buildLinuxAppImage` (`build.ts:480`, `:514`). | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None are behavior-defining; pins and the cache path match design § Final File Responsibility Mapping byte for byte (URLs, sha256 values, member, cache root). | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001 arm64 order in code = design: prepare → set env → build → exactly one → assert → restore (`linuxAppImageBuild.ts:18-31`). DS-003 = the verifier's single `docker run`. | — |
| Ownership boundary preservation and clarity | Pass | `build.ts` no longer calls electron-builder for Linux and never touches the env or the runtime (grep: no `ELECTRON_BUILDER_CACHE` in `build.ts`). Pins and folder layout are only in `arm64AppImageRuntime.ts`. | — |
| Off-spine concern clarity | Pass | Provisioning and assertion serve `buildLinuxAppImage` only; it calls them in its own sequence. | — |
| Existing capability/subsystem reuse check | Pass | Reuses `7zip-bin` (already in the lockfile through electron-builder), the `tar` dependency (N-3), Node `fetch`, and the `scripts/desktop-package` location and its `node --test` convention. | — |
| Reusable owned structures check | Pass | No repeated structures; the pins are three small consts in one file. | — |
| Shared-structure/data-model tightness check | Pass | N/A in substance: no shared types beyond `LinuxTargetArch`, moved to its owner and imported as a type. | — |
| Repeated coordination ownership check | Pass | The two Linux call sites are folded into one owner; the clean-image check has one owner used by both jobs. | — |
| Empty indirection check (Core Principle 13) | Pass | `buildLinuxAppImage` owns a sequence (env, assertion, exactly-one); its x64 path forwards, but it is the same owner serving both arches, not a wrapper. | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Build sequence vs provisioning/pins vs clean-image check are three files with one concern each. | — |
| Ownership-driven dependency check | Pass | `build.ts → linuxAppImageBuild.ts → arm64AppImageRuntime.ts`; neither new file imports `build.ts` (which runs `main()` on import). | — |
| Visible dependencies check (Core Principle 16) | Pass — deviation recorded, reason holds | Process-wide `ELECTRON_BUILDER_CACHE` (design § Task Design Health Assessment / Dependency Rules; ARCH-REV-002). It is set before `build()` starts, and the builds are sequential, so nothing reads it early. If app-builder ignores the folder, the build fails loudly (assertion + exactly-one). It hides no cycle. Verified in code (C-01). | — |
| Authoritative Boundary Rule check | Pass | `build.ts` depends only on `buildLinuxAppImage` (+ its type), not on `arm64AppImageRuntime.ts`. | — |
| File placement check | Pass | `autobyteus-web/build/scripts/` (packaging) and `scripts/desktop-package/` (release verification), as the existing layout does. | — |
| Flat-vs-over-split layout judgment | Pass | Two small files with distinct concerns; no artificial split. | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Signatures match design § Interface Boundary Mapping exactly. | — |
| Naming quality and naming-to-responsibility alignment check | Pass | Names match the design's Terminology ("toolset", "static runtime", "prepared"); no version numbers in our own identifiers (DESIGN.md rule 8). `appimage-12.0.1` appears only as the external folder/release name. | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | C-06 (two-value arch mapping) follows a recorded design decision; noted as an optional suggestion. | — |
| Patch-on-patch complexity control | Pass | Two in-round fixes (type-only import; one chmod line) are minimal and targeted. | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | Inline Linux `build({...})` blocks and the local `LinuxTargetArch` type removed; `linuxTargetArchToBuilderArch` still used at `build.ts:397`, `:406`; the `build`/`Platform`/`Arch` imports are still used for Windows/macOS. | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | The spec covers x64 untouched, arm64 env set/restore (set and unset cases), the exactly-one negatives, assertion-failure restore, and real negatives of the assertion. The verifier test covers the docker argv, precondition order, failure message, usage and missing docker. The positive assertion path is proven on real images (IMP-07/IMP-08). | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `vi.hoisted` mocks plus a `beforeEach` reset; `withFakeDocker` helper. | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | None. | — |
| API/E2E readiness for the next workflow stage | Pass | CI artifacts from run 44956618584 are available; the handoff names AC-002 (extract-and-run start), AC-003 with the published beta.6 asset, and AC-004 as remaining. | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines Before Change (base branch) | Effective Non-Empty Lines After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/build/scripts/build.ts` | 467 (raw 538) | 457 (raw 528) | Pass (effective under 500; shrinks; raw-line excess is FU-002) | Pass (−10) | Pass | Pass | — | — |
| `autobyteus-web/build/scripts/arm64AppImageRuntime.ts` | 0 (new) | 91 (raw 101) | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/build/scripts/linuxAppImageBuild.ts` | 0 (new) | 29 (raw 32) | Pass | Pass | Pass | Pass | — | — |
| `scripts/desktop-package/verify-clean-image-runtime.mjs` | 0 (new) | 29 (raw 31) | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No fallback to the legacy arm64 runtime; a failed download, checksum, extraction, exactly-one check or assertion throws. The verifier has no host fallback when Docker is missing. |
| No legacy old-behavior retention in changed scope | Pass | arm64 no longer uses the legacy runtime. |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | See the structural row. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected`; none added. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A (no migration). |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, already done in this change.
- Why: a new build mechanism and a new release gate.
- Files or areas affected: `autobyteus-web/docs/electron_packaging.md` § Linux AppImage Runtime (mechanism, FUSE requirements per arch, FU-003 note); `autobyteus-web/docs/github-actions-tag-build.md`; `RELEASE.md` Linux validation list; `docs/design-cases.md` Case 27. All match the code. One small imprecision: the docs say reuse happens "only when its `runtime-arm64` has the pinned digest", while the code also requires `linux-arm64/mksquashfs`. The statement is still true as written.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| Enterprise-flavor Linux build (ARCH-REV-001/002 `Not Reachable` as a released scenario) | Confirmed | — |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10`
- Score calculation note: simple average for trend visibility; the decision follows the findings and checks.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.6 | The arm64 sequence reads top to bottom in one 20-line function, in the design's order. | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.6 | `build.ts` → one Linux owner → provisioning owner; pins and folder layout live in one file. | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | Three narrow functions with explicit inputs, matching the design table. | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.5 | Three single-concern files in the existing folders; `build.ts` shrinks. | `build.ts` raw size is pre-existing (FU-002). | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.3 | `LinuxTargetArch` moved to its owner. | Two-value arch mapping exists twice (C-06, a recorded design choice). | Optional: one exported mapping. |
| `6` | `Naming Quality and Local Readability` | 9.5 | Clear names; comments explain the why (app-builder reuse, chmod, rename). | — | — |
| `7` | `API/E2E Readiness` | 9.4 | CI artifacts, fresh-start build and a clear list of remaining ACs. | AC-002 start and the FUSE 3 mount still unproven (by design, DEC-005). | API/E2E to run AC-002. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.5 | Env restore, exactly-one, staging and reuse verified in code and by IMP-04/07/08/09; x64 runtime byte-identical. | Coupling to app-builder internals (RSK-003), guarded by the assertion. | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | No fallbacks; fails closed everywhere. | — | — |
| `10` | `Cleanup Completeness` | 9.5 | Duplicated blocks removed; SR-001 dependency change reverted; lockfile +3 lines only. | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. The existing FU-001, FU-002 and FU-003 already cover the related out-of-scope items.

## Classification

N/A (Pass).

## Recommended Recipient

- `/api_e2e_engineer` (primary pass rule), then an informational note to `/implementation_engineer`.

## Residual Risks

- RSK-003: coupling to app-builder 25's toolset folder layout. A change surfaces as a build failure (assertion), not as a wrong release. FU-003 removes it.
- DEC-005 / RSK-001: FUSE 3 mount on a real arm64 desktop is untested; extract-and-run remains available.
- R-3: the static runtime comes from a toolset electron-builder labels beta; pinned by sha256.
- R-5 / R-6: local-cache reuse checks two files only; stray downloads under the prepared root would only re-download.
- AC-002 (app start through extract-and-run in a clean environment) is still to be proven by API/E2E.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer`
- Notes: the four review-focus items (env set/restore, staging → rename and reuse, exactly-one AppImage, `7za` chmod) were each traced in code and found correct (C-01, C-02/C-03, C-04, C-05). Optional suggestion C-06 does not affect the result.
