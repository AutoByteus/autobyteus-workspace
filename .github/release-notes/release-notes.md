# Release Notes — Focused Team Member First Message Routing

## What Changed

- Fixed first-message routing for new agent team runs: when you focus a valid non-coordinator team member before the team starts, the first chat message now goes to that focused member instead of falling back to the coordinator.
- Kept coordinator sends unchanged when the coordinator is explicitly focused.
- Kept attachment ownership aligned with the selected recipient, so draft files, finalized context files, optimistic local messages, and the WebSocket target all use the same focused member.
- Preserved safety handling for stale or task-agent-only targets so invalid focus does not silently retarget ordinary user chat.
- Updated project documentation to distinguish user-message targeting from active-execution interrupt/runtime-control targeting.

## Validation

- Latest `origin/personal` was merged into the ticket branch before delivery docs/release work.
- Frontend targeted Nuxt/Vitest suite passed: 8 files / 78 tests.
- Backend focused route/target suite passed: 3 files / 34 tests.
- Backend focused leaf lazy-start/status subset passed: 5 tests passed / 1 skipped by pattern.
- Local macOS ARM64 Electron build passed and produced local DMG/ZIP artifacts.

## Notes

- No migration or configuration change is required.
- A broader pre-existing backend subteam lazy-start unit-test failure remains outside this release's focused leaf-member routing scope.
