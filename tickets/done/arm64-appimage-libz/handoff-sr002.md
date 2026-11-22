# Handoff — arm64-appimage-libz, SR-002: Architecture Design Complete (revision after IR-001)

- Package: `arm64-appimage-libz`; Project Task `autobyteus-28` (Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`), requested by `/project_task_manager`. URGENT.
- Result: `Architecture Design Complete`, SR-002 (`Design Impact` recovery of IR-001). `task_size=Medium`, `architectural_risk=High`.
- Route: `architectural_risk=High` → architecture re-review (`/architecture_reviewer`). ARCH-REV-001 covered SR-001's electron-builder 26 design and does not cover SR-002.
- Workspace: worktree `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz`, branch `codex/arm64-appimage-libz`, base `origin/personal` at `9f6add773b`; finalization target `origin/personal`. The worktree holds the implementation engineer's uncommitted IR-001 changes (verifier, test, workflow steps, docs: kept; electron-builder 26 in `package.json`/lockfile: to be reverted per the design).
- Ticket folder: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/`
- Original request, direction and done-when: unchanged; see `handoff-sr001.md` and `requirements-doc.md`.

## Approval basis

`requirements-doc.md` approved at SR-001 by the Solution Designer within the Task's direction, user informed. SR-002 changes only technical decision text (DEC-001 mechanism, DEC-004 wording, QR-002 pin owner, External Contracts); intended behavior, REQ/AC and scope are unchanged, so that approval applies. The Task has no new comments (read 2026-11-21).

## What changed and why

- IR-001 (`implementation-design-impact-ir001.md`): electron-builder 26 drops `resources/server/node_modules` on every desktop target (`app-builder-lib@26.x` `out/util/filter.js:42-45`, confirmed) and re-hoists `app.asar`; packaged server startup fails. The upgrade route is dropped for this ticket (FU-003).
- Measured alternative (OBS-009, `probes/seeded-toolset-probe.sh`, `evidence/seeded-toolset-probe.log`): electron-builder 25's `app-builder` builds from a prepared `appimage-12.0.1` toolset folder whose `runtime-arm64` is the official static runtime (all three files sha256-pinned); the image's prefix is byte-equal to the static runtime, it has no `NEEDED`, and it extracts and runs in the clean Ubuntu 24.04 root.
- New design: `linuxAppImageBuild.ts` (`buildLinuxAppImage`: for arm64 prepare → set `ELECTRON_BUILDER_CACHE` → build → assert the runtime → restore; both `build.ts` Linux branches call it), `arm64AppImageRuntime.ts` (pins, provisioning, assertion), devDependency `7zip-bin@5.2.0`. electron-builder stays `^25.1.8`. Every non-arm64 output is unchanged by construction.
- ARCH-REV-001 notes: N-1, R-1, R-2 no longer apply; R-3 still applies; R-4 addressed in DEC-004's wording.
- Design case 27 added to `docs/design-cases.md` (a dependency's major upgrade as the vehicle for a narrow fix).

## Open risks

RSK-001 (FUSE 3 only), RSK-003 (pinned tool's folder layout; build assertion + clean-image gate), DEC-005 (real-desktop FUSE mount not runnable here), R-3 (toolset `1.0.3` labelled beta; runtime pinned and proven by AC-001..003). Follow-ups FU-001..FU-003 (not sent yet).

## Expected output

Architecture re-review of SR-002, then implementation per the design's Change / Refactor Sequence.

## Routing record

- 2026-11-21: `get_handoff_rules` → rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/architecture_reviewer`.
- 2026-11-21: architecture re-review Pass, ARCH-REV-002 on SR-002 (`design-review-report.md`, `architecture-review-revision-record.md`); the reviewer routed to `/implementation_engineer` with non-blocking notes N-2 (assertion fails when no AppImage is produced) and N-3 (one tar mechanism); ARCH-REV-001 N-1/R-1/R-2 no longer apply, R-3 carried, R-4 resolved. Informational; no Solution Designer action.
