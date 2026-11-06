# Handoff — Architecture Design Complete: autobyteus-415

- Package: `android-keep-page-on-rotation`, SR-001; Task autobyteus-415 (prerequisite PRE-001 of autobyteus-407, the phone desktop view); requested by `/project_task_manager` for the user
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-keep-page-on-rotation`, branch `codex/android-keep-page-on-rotation`, base `origin/personal` @ `3bf9240d4229dc01012aa3bfd0819a971ab3b32a`; finalization target `origin/personal`. Ticket documents uncommitted; commit them with the implementation.
- Approval: requirements approved by the Solution Designer within the Task's direction (user informed)
- Classification: `task_size = Small`, `architectural_risk = Low` → direct implementation

## What to do

1. Reproduce the reload on the emulator `autobyteus277_api35` before changing anything (investigation-notes.md, Reproduction To Hand Over). If it does not reproduce, stop and return `Unclear`.
2. Add `android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize|keyboard|keyboardHidden|navigation"` to `.MainActivity`; a unit test on the manifest; one line in the Android docs.
3. Show AC-001 … AC-005 (before/after, connection input, insets in both orientations, manifest test, build without new permissions).

## Must not

New Android permissions; the user's phone or nodes; screenshots of anything but test data. Release only on the user's word.

## Documents

requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md, follow-ups.md (this folder).

## Route

Architecture Design Complete, Small + Low → `/software_engineering_team/implementation_engineer`.
