# Handoff — Architecture Design Complete: autobyteus-432

- Package: `phone-viewer-landscape-fullscreen`, SR-003 (SR-002 for ARCH-REV-001; SR-003 for implementation finding IMP-DI-001: Control full-screen strip, off = phone's setting, dark cutout padding); Task autobyteus-432; requested by `/project_task_manager` for the user (dispatched by him 2026-11-08)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen`, branch `codex/phone-viewer-landscape-fullscreen`, base `origin/personal` @ `eebbc2b8eed0e83cd3627298d8a7abec19c7d02f`; finalization target `origin/personal`. Ticket documents uncommitted.
- Approval: within the direction, user informed
- Classification: `task_size = Medium`, `architectural_risk = High`

## Summary

Entering the phone viewer's full screen (route `full=1`) asks the Android app, through a new message `desktopFullScreen` on the existing shell bridge (`window.AutoByteusShell`, main frame and node origin only), for sensor landscape (overriding the rotation lock, like games) and hidden system bars; leaving restores the previous orientation and bars; the app resets it on every main-frame page start, every non-page screen and every web-host destroy. Without the app: browser full screen + orientation lock where allowed. View only: double tap toggles Fit ↔ Fill (cover, no distortion). Exit handle in both modes. No new permission.

## Points for the reviewer

1. The new bridge message under the existing main-frame/origin rule, and the reset rule D-2.
2. One web owner following the route state, with explicit app/browser/in-page branches.
3. Rotation-lock override and restore (DEC-002); immersive mode and the back gesture.

## Documents

requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md (this folder).

## Route

Architecture Design Complete, High risk → `/software_engineering_team/architecture_reviewer`.
