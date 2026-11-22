# Solution Revision Record — arm64-appimage-libz (autobyteus-28)

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | Initial coherent baseline from Task autobyteus-28 (FU-004 of autobyteus-22) | N/A | N/A | Requirements Approved; Design Ready | BEH-001..004, REQ-001..006, AC-001..006, DEC-001..005 | Architecture Design Complete; Medium / High |
| SR-002 | Design (+ decision-text clarification) | Implementation Design Impact IR-001 on SR-001 / ARCH-REV-001 | IR-001 | Design Ready (SR-001, ARCH-REV-001 Pass) | Requirements Approved (SR-001 approval applies); Design Ready (SR-002) | DEC-001, DEC-004, QR-002 (text); BEH-001..004 paths | Architecture Design Complete; Medium / High; re-review |
| SR-003 | Evidence | API/E2E round 1 finding AE-11 (Design Impact) | AE-11 | Requirements Approved; Design Ready (SR-002, ARCH-REV-002 Pass) | Requirements Approved; Design Ready (SR-002 unchanged) | DEC-006 (new), Non-Goals note; RSK-004 | Evidence Decision: accept, document, FU-004 |

## Revision Entries

### SR-001 — Static AppImage runtime for arm64 and a clean-image release check

- Phase and classification: `Initial Baseline`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Task autobyteus-28 from `/project_task_manager`; the user, 2026-11-21: "work on the follow-up immediately".
- Triggering finding IDs: FU-004 of autobyteus-22.
- Prior authoritative requirements/design status: N/A.
- Current authoritative requirements/design status: `requirements-doc.md` Approved; `design-spec.md` Ready.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001..004, REQ-001..006, AC-001..006, SCN-001..004, DEC-001..005, QR-001..002.
- Scenario-basis or scenario-validity changes: N/A (baseline).
- Why this baseline or revision was recorded: first coherent package.
- Canonical requirements, investigation and design sections changed: all (created).
- Supplemental artifacts added, changed or removed: added `probes/clean-root-runtime-probe.sh`, `probes/probe-runtime-needed.sh`, `evidence/*` (inventory in investigation notes).
- Product design evidence or product decisions incorporated: N/A.
- Intended behavior changed: `Yes` (new baseline).
- Approval impact, exact approved requirements baseline, who approved, and approval reference: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction (no `Needs user` decision); the user was informed in the Solution Designer's conversation on 2026-11-21 (message stating the decisions: static runtime for arm64 instead of patching or bundling, x64 unchanged with FU-001, clean-image check on both Linux jobs).
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: N/A.
- Post-design task-size/risk classification and rationale changes: `Medium` / `High` (electron-builder major upgrade affects all five desktop targets; arm64 runtime FUSE 2 → static FUSE 3).
- Applied handoff-rule outcome / result-file reference: see `handoff-sr001.md`.
- Downstream and architecture-review impact: first review basis.
- Remaining gaps, assumptions or blocked decisions: ASM-001, RSK-001, RSK-002, DEC-005 (FUSE-3 mount on a real arm64 desktop not runnable here); FU-001, FU-002.
- Next action: route per handoff rules.

### SR-002 — Static arm64 runtime on electron-builder 25 through a prepared toolset folder

- Phase and classification: `Design Impact`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: implementation engineer, `implementation-design-impact-ir001.md` (IR-001), 2026-11-21: the design's escalation trigger fired at step 1.
- Triggering finding IDs: IR-001.
- Prior authoritative requirements/design status: requirements Approved (SR-001); design Ready (SR-001), ARCH-REV-001 Pass.
- Current authoritative requirements/design status: requirements Approved (unchanged intent); design Ready (SR-002); ARCH-REV-001 does not cover SR-002.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: DEC-001 (mechanism), DEC-004 (wording: tag, not digest, per ARCH-REV-001 R-4), QR-002 (pins held by our build), External Contracts (electron-builder rows). No REQ/AC/BEH/SCN change.
- Scenario-basis or scenario-validity changes: None.
- Why this revision was recorded: electron-builder 26 drops `resources/server/node_modules` on all targets (`app-builder-lib@26.x` `out/util/filter.js:42-45`, confirmed by the Solution Designer) and re-hoists `app.asar` (OBS-008), so the SR-001 upgrade route breaks REQ-005. Measured an alternative (OBS-009, `probes/seeded-toolset-probe.sh`): electron-builder 25's `app-builder` builds from a prepared toolset folder (official `appimage-12.0.1`, its `runtime-arm64` replaced by the official static runtime; all sha256-pinned), and the result runs in the clean root.
- Canonical requirements, investigation and design sections changed: requirements DEC-001, DEC-004, QR-002, External Contracts, Architecture Phase Input, status line; investigation OBS-008, OBS-009, RSK-002 (closed), RSK-003 (new), supplement inventory; design spec rewritten for SR-002.
- Supplemental artifacts added, changed or removed: added `probes/seeded-toolset-probe.sh`, `evidence/seeded-toolset-probe.log`; inventoried IR-001's `implementation-design-impact-ir001.md`, `evidence/eb25-vs-eb26-arm64/`, `evidence/docker-chroot-shim/`.
- Product design evidence or product decisions incorporated: N/A.
- Intended behavior changed: `No`.
- Approval impact: none; the SR-001 approval (Solution Designer within the direction, user informed) applies. The user is informed of the revised mechanism in the Solution Designer's conversation.
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: SR-001 design and ARCH-REV-001 superseded for the mechanism; re-review required. IR-001's verifier, unit test, workflow steps and docs are kept (docs to be adjusted).
- Post-design task-size/risk classification and rationale changes: `Medium` / `High` (unchanged values; the risk is now the arm64 release artifact, two pinned downloads in the release build and a pinned tool's folder layout, instead of an all-target toolchain upgrade).
- Applied handoff-rule outcome / result-file reference: `handoff-sr002.md`.
- Downstream and architecture-review impact: architecture re-review of SR-002, then implementation from the IR-001 worktree state (revert the electron-builder 26 change).
- Remaining gaps, assumptions or blocked decisions: ASM-001, RSK-001, RSK-003, DEC-005; FU-001, FU-002, FU-003. Design case 27 added to `docs/design-cases.md`.
- Next action: route per handoff rules.

### SR-003 — Evidence decision DEC-006: extract-and-run leaves its extraction (AE-11)

- Phase and classification: `Evidence` (evidence decision on an API/E2E `Design Impact` finding)
- Triggering user feedback, Product package, investigation evidence, or role/report/round: API/E2E round 1 (`api-e2e-execution-coverage-report.md`), finding AE-11, 2026-11-22.
- Triggering finding IDs: AE-11.
- Prior authoritative requirements/design status: requirements Approved; design Ready (SR-002), ARCH-REV-002 Pass.
- Current authoritative requirements/design status: unchanged; DEC-006 added; Non-Goals line annotated.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: DEC-006; no REQ/AC/BEH change (AC-002 passed).
- Scenario-basis or scenario-validity changes: None.
- Why this revision was recorded: the static runtime's opt-in extract-and-run does not clean up; reproduced by the Solution Designer with the pinned and the newest upstream runtime (OBS-010), so no runtime choice avoids it.
- Canonical requirements, investigation and design sections changed: requirements Decisions (DEC-006), Non-Goals note; investigation OBS-010, RSK-004; design unchanged.
- Supplemental artifacts added, changed or removed: `evidence/sd-extract-and-run-cleanup-upstream.log`.
- Product design evidence or product decisions incorporated: N/A.
- Intended behavior changed: `No` (the fallback stays; its known side effect is documented).
- Approval impact: none; decided by the Solution Designer as an evidence decision (low, bounded risk), user informed in the Solution Designer's conversation on 2026-11-22.
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: None. The docs note in `autobyteus-web/docs/electron_packaging.md` is a documentation sync item.
- Post-design task-size/risk classification and rationale changes: none (Medium / High).
- Applied handoff-rule outcome / result-file reference: `handoff-sr003-evidence-decision.md`.
- Downstream and architecture-review impact: none; API/E2E finalizes round 1.
- Remaining gaps, assumptions or blocked decisions: DEC-005, RSK-001, RSK-003, RSK-004; FU-001..FU-004.
- Next action: Evidence Decision to API/E2E.
