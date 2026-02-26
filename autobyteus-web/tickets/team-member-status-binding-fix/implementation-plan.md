# Implementation Plan - team-member-status-binding-fix

## Small-Scope Solution Sketch
- In `TeamWorkspaceView.vue`, derive `focusedMemberContext` from `activeTeamContext` + `focusedMemberName`.
- Bind header status display to focused member status when available.
- Keep team status as explicit fallback when focused member context is unavailable.
- Keep existing header title computation unchanged.

## Tasks
1. Update component status source computation.
2. Replace status component binding to consume computed status source.
3. Update/extend unit tests for focused-member status and fallback status.
4. Run targeted tests.

## Cleanup (No Legacy Retention)
- Remove obsolete direct dependency on team-only status for header member view.
- No compatibility branch retained.
