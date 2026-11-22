# Implementation Revision Record — arm64-appimage-libz (autobyteus-28)

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md` ARCH-REV-001 (Pass), round 1 | N/A | `Design Impact` | SR-001, ARCH-REV-001 | Stopped at design step 1: electron-builder 26 drops `resources/server/node_modules` and re-hoists `app.asar`; routed to the Solution Designer (`implementation-design-impact-ir001.md`) |
| IR-002 | Architecture reviewer, `design-review-report.md` ARCH-REV-002 (Pass), round 2 | N-2, N-3 (implementation notes) | `Initial Baseline` (first complete implementation; SR-002) | SR-002, ARCH-REV-002 | Implemented; ready for code review |

## Revision Entries

### IR-001 — SR-001 step 1 comparison: electron-builder 26 breaks the server package (Design Impact)

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md` (ARCH-REV-001 Pass on SR-001), round 1.
- Triggering finding IDs: N/A.
- Classification: `Design Impact` (the design's own escalation trigger).
- Prior authoritative result: N/A.
- Current authoritative result: superseded by IR-002 (SR-002).
- Related solution revision IDs: SR-001.
- Related architecture-review revision IDs: ARCH-REV-001.
- Related code-review revision IDs: N/A. API/E2E: N/A. Delivery: N/A.
- Why recorded: the design's step 1 (compare the 25 and 26 arm64 output) found that `app-builder-lib@26.x` `util/filter.js` drops a copy source's root `node_modules`, so `extraResources` lost `resources/server/node_modules` (the packaged server failed with `ERR_MODULE_NOT_FOUND: reflect-metadata`), and that `app.asar` differed (193 paths removed, 399 added).
- Approved behavior or requirement IDs affected: REQ-005 / AC-005, BEH-004, BEH-001 (preserved column).
- Implementation delta: none merged; the electron-builder 26 change was later reverted (IR-002). The clean-image verifier, its test, the workflow steps and the docs written in this round were kept.
- Changed files or areas: `implementation-design-impact-ir001.md`, `evidence/eb25-vs-eb26-arm64/`, `evidence/docker-chroot-shim/`.
- Local validation and result: v25 and v26 arm64 builds compared (`evidence/eb25-vs-eb26-arm64/`).
- Next recipient or routing: Solution Designer (Design Impact) → SR-002.
- Remaining limitations or risks: FU-003 (electron-builder upgrade) inherits the finding.

### IR-002 — SR-002: static arm64 runtime through a prepared toolset on electron-builder 25

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md` (ARCH-REV-002 Pass on SR-002), round 2.
- Triggering finding IDs: N-2 (assert exactly one arm64 AppImage), N-3 (one tar mechanism): both applied.
- Classification: `Initial Baseline` (first complete implementation of the current design).
- Prior authoritative result: IR-001 (Design Impact; no implementation merged).
- Current authoritative result: implemented at `7ad305aeb0`, then fixed in the same round at `e692d8cfc6` and `05996bd715`, plus the evidence/document commit that contains the handoff. Fixes in the round:
  - `e692d8cfc6`: type-only imports. The web typecheck gate failed build-only run 44948221723 with TS1484.
  - `05996bd715`: `chmod 0755` on `7za`. The fresh-start build and build-only run 44952318117 failed with EACCES.
  Fresh-start build (IMP-08) and build-only release run 44956618584 (IMP-09) pass on `05996bd715`.
- Related solution revision IDs: SR-002.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A. API/E2E: N/A. Delivery: N/A.
- Why recorded: initial implementation handoff baseline for SR-002.
- Approved behavior or requirement IDs affected: REQ-001..REQ-005 (BEH-001..BEH-004).
- Implementation delta: `buildLinuxAppImage` (new `linuxAppImageBuild.ts`) owns both Linux build call sites; `arm64AppImageRuntime.ts` (new) prepares the pinned toolset folder and asserts the runtime; `build.ts` calls `buildLinuxAppImage` (−10 lines); `7zip-bin` 5.2.0 devDependency; SR-001 dependency change reverted; clean-image verifier + test + workflow steps kept from IR-001; docs moved to the SR-002 mechanism; new spec `scripts/__tests__/linuxAppImageBuild.spec.ts`.
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: IMP-01..IMP-10 in the handoff (all pass; IMP-10 lists one environment-only failure in an untouched test file).
- Next recipient or routing: Code Reviewer (task_size Medium, architectural_risk High).
- Remaining limitations or risks: see the handoff's Known Risks.
