# Handoff: Architecture Design Complete (autobyteus-427)

- Package: `phone-message-file-reference-open`, Project Task `autobyteus-427` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Result: `Architecture Design Complete`, `task_size=Small`, `architectural_risk=Low` → direct implementation route (handoff rule: Small/Medium and Low → implementation engineer)
- Current SR: `SR-001`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-message-file-reference-open`, branch `codex/phone-message-file-reference-open`
- Base: `origin/personal` @ `6225a734a3a7e76e7d75f8d937fec78295b681f8`; finalization target `origin/personal` (RELEASE.md). Release only on the user's word.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-message-file-reference-open/tickets/in-progress/phone-message-file-reference-open/`

## Original request

The user (2026-11-07): "on the desktop when I click the draft v3, I could open the file, but on the phone, when I click it, it does not open on the phone, weird … I don't know whether it's on purpose or it's a bug." Task: find out; if it is a bug, fix it so the file opens on the phone in the phone's own viewer, with a test. Constraints: no widening of what the phone may read (autobyteus-403); tests on isolated nodes; no private data; follow DESIGN.md and TESTING.md.

## Answer and cause (told to the user)

A bug. The phone design (autobyteus-277 DS-008) opens a conversation's file on the phone's Files screen. `AgentEventMonitor.handleFilePathAction` creates the opener after `await import(...)`. On the phone the opener then calls `useMobileNavigation()` (vue-router `useRoute`/`useRouter`, i.e. `inject`) outside any setup context, gets `undefined`, and `openFile` throws `Cannot read properties of undefined (reading 'query')`. Every tap ends `failed`. Reproduced with real Vue and vue-router (investigation R-01); the control with the injection context opens (R-02).

## Approval basis

Requirements approved by the Solution Designer within the Task's direction; user informed 2026-11-07. After hearing the cause, the user said: "please continue since you found the reason." Design approval by the user is not required by the direction.

## What to build (design spec)

1. Export `type MobileFileNavigation = Pick<ReturnType<typeof useMobileNavigation>, 'openFile'>` from `composables/mobile/useMobileNavigation.ts`.
2. `useEventMonitorFilePreview` takes a required `mobileNavigation: MobileFileNavigation | null` option; remove its own `useMobileNavigation()` call (l.28) and import (l.12).
3. `AgentEventMonitor.vue` setup: `const mobileNavigation = isMobileRemoteAccessRuntime() ? useMobileNavigation() : null;` next to `revealTool` (l.81); pass it at l.101.
4. Update specs (option instead of module mock; `null` in the layout specs; `AgentEventMonitor.spec.ts` asserts it is passed).
5. New regression `components/workspace/agent/__tests__/AgentEventMonitor.mobileFileOpen.spec.ts` (AC-002): real router, real `useMobileNavigation`, real opener; fails on the base, passes after.

Start from the reproduction: `probes/probe427.mobileFileOpen.spec.ts`. Command: copy it into `autobyteus-web/composables/__tests__/`, then `pnpm -C autobyteus-web exec vitest run composables/__tests__/probe427.mobileFileOpen.spec.ts --no-watch`. Do not commit the probe in the source tree.

## Validation intent (for API/E2E later)

- AC-001: `mobile-shell-probe` case: tap a workspace file path in a Team member's conversation on the phone bundle → file viewer with its text, `screen=files`, Back to the conversation.
- AC-003: path outside the workspace → no navigation, status line. AC-004: desktop file-preview specs and `event-monitor-file-preview-probe` stay green.
- TESTING.md rule for the stage that let it through (owner API/E2E; see design spec, Guidance).

## Open items

- ASM-001: the exact path in the user's message is unknown (the run is on a node); not needed for the fix.
- Follow-up FU-001 (not in scope): the status line is hidden on read-only conversations.
- Also in this ticket: `docs/design-cases.md` Case 2 "Again in autobyteus-427" (Solution Designer, done).

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, `probes/probe427.mobileFileOpen.spec.ts`, `user-desktop-screenshot.png`

## Route

Applied handoff rule: Small/Low → `/software_engineering_team/implementation_engineer` (2026-11-07).
