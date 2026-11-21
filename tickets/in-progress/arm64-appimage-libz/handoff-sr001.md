# Handoff — arm64-appimage-libz, SR-001: Architecture Design Complete

- Package: `arm64-appimage-libz`; Project Task `autobyteus-28` (Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`), requested by `/project_task_manager` (run `project_task_manager_2f41a1df4e464bf2aa8970327d9d7ad0`). URGENT. Origin: FU-004 of autobyteus-22.
- Result: `Architecture Design Complete`, SR-001. `task_size=Medium`, `architectural_risk=High`.
- Route: `architectural_risk=High` → independent architecture review (`/architecture_reviewer`), per the handoff rules.
- Workspace: worktree `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz`, branch `codex/arm64-appimage-libz`, base `origin/personal` at `9f6add773b6bd1c299548d103cc85d8fc7fe1731`; finalization target `origin/personal`.
- Ticket folder: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/`

## Original request (Task autobyteus-28)

Why: the Linux arm64 AppImage's runtime needs `libz.so` (development name); on a machine with only `zlib1g` it cannot start ("error while loading shared libraries: libz.so"); the release verify step doesn't catch it because the runner has the development package.
Direction: make the arm64 AppImage start without zlib's development package (depend on `libz.so.1` or bundle it, whichever is right); make the release verify step run the AppImage on an image without `libz.so`; check which released versions are affected and whether x64 has the same issue.
Done when: merged on `personal`; verified by starting the arm64 AppImage on a clean image with only `zlib1g`; the verify step fails on the old build and passes on the new one; the user is told which releases are affected (a new beta is his decision). Comment: the user, 2026-11-21: "work on the follow-up immediately".

## Approval basis

- `requirements-doc.md` at SR-001: Approved by the Solution Designer within the Task's direction (no `Needs user` decision); user informed in the Solution Designer's conversation, 2026-11-21. Design approval by the user: not required.

## What was found (evidence: `investigation-notes.md`)

- Reproduced: the legacy arm64 runtime (`appimage-12.0.1`, electron-builder 25.1.8) fails with exit 127 on `libz.so` on this host and inside a clean Ubuntu 24.04 arm64 base root; so does a published 1.5.14-beta.6 arm64 AppImage (`evidence/clean-root-*.log`).
- Measured: all 297 published arm64 AppImages (152 stable, 145 beta; v1.3.61 → v1.5.14-beta.6) carry that runtime; all 297 x64 AppImages need `libz.so.1` (x64 not affected) (`evidence/published-appimage-runtime-needed.tsv`).
- Measured: electron-builder 26's static runtime (toolset `1.0.3`, sha256-pinned) has no shared-library dependencies and runs in the clean root. electron-builder 25 offers no runtime override, so the fix needs electron-builder 26.
- The legacy runtimes also need `libfuse.so.2`, absent on stock Ubuntu 22.04+; the static runtime needs FUSE 3 instead (RSK-001).

## Design (`design-spec.md`)

- `electron-builder` `^25.1.8` → `^26.18.0`; new `autobyteus-web/build/scripts/linuxAppImageToolset.ts` (`arm64 → '1.0.3'`, `x64 → '0.0.0'` explicitly); `build.ts` wires it into `configWithLinuxArtifactName`.
- New `scripts/desktop-package/verify-clean-image-runtime.mjs IMAGE` (+ unit test): `docker run --rm --network none -v IMAGE:/autobyteus.AppImage:ro ubuntu:24.04`, asserts no `libz.so`, runs `--appimage-extract AppRun`; called by a new step in both Linux jobs of `release-desktop.yml`.
- Docs: `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/docs/github-actions-tag-build.md`, `RELEASE.md` (validation list).

## Open risks and decisions for review

- RSK-002: electron-builder 26 changes packaging for all targets (node_modules collector → `app.asar`). Guarded by AC-005 (asar/artifact comparison, fresh-start build, build-only release run).
- DEC-005: the FUSE-3 mount on a real arm64 desktop cannot run on this host (no `/dev/fuse`, no KVM); accepted as low risk with other evidence (clean-root runtime run, extract-and-run app start, build-only run).
- Deviation: `build.ts` (538 lines, over the limit) gains two wiring lines; policy in its own file; FU-002.
- Follow-ups (not sent yet; sent when the ticket leaves the team): FU-001 (x64 needs `libfuse2` on stock Ubuntu 22.04+), FU-002.

## Expected output

Architecture review of SR-001 (`design-review-report.md`), then the configured route.

## Routing record

- 2026-11-21: `get_handoff_rules` → rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/architecture_reviewer`.
- 2026-11-21: architecture review Pass, ARCH-REV-001 on SR-001 (`design-review-report.md`, `architecture-review-revision-record.md`); the reviewer routed to `/implementation_engineer` with non-blocking notes N-1, R-1..R-4. Informational; no Solution Designer action.
