# Design Impact Rework: Mobile UX, Focus Scope, Pairing Refresh, And Focus Persistence

## Status

Refined for architecture review on 2026-05-19 after API/E2E validation returned `Fail / Design Impact`.

## Trigger

API/E2E validated the core implementation for the user's original mobile requirements but found product/design issues that should be corrected before delivery.

Passed functional evidence:

- Mobile team launch used `codex_app_server` and `gpt-5.5`, selected `api_e2e_engineer` as the initial focus, and sent the first prompt to that member in backend run `team_software-engineering-team_39133827`.
- Mobile single-agent launch used `codex_app_server` and `gpt-5.5`; backend run `7a8037c6-b055-401c-8128-db8c5d798e42` recorded the selected runtime/model.
- Existing team-run focus changed to `delivery_engineer`; the next mobile send routed to member run `delivery_engineer_6463b48638a7e05e`.
- Focused Vitest suites passed: 8 files / 66 tests. Nuxt typecheck remains repository-wide red from pre-existing broad issues, with no changed implementation source-file hits reported.

## Refined Product Decisions

1. **Focus bar scope:** The existing-run `Message target` selector is not a global mobile control. It governs the currently opened team run on Chat/Files/Activity-equivalent work surfaces and must be hidden on Runs and while Start new is open.
2. **Start new scope:** Start new is a focused mobile task surface. While it is open, the recent-runs list must be hidden or clearly separated so the setup is not mixed with run history on a phone.
3. **Mode-aware copy:** Agent-mode Start new copy must not mention focused members. Team-mode copy may mention the first-message target. Runtime/model and summary copy must describe the mobile launch outcome and must not mention desktop panels, stores, or internal implementation details.
4. **Single blocking issue owner:** Missing model/prompt/readiness text must appear once on the setup surface. The runtime/model card should keep field-level helper text, while launch-blocking issue display should be owned by the summary/action area or another single explicit owner.
5. **Phone-friendly pickers:** Long launch/focus option lists must use a searchable grouped mobile picker. Native large selects are not acceptable for team member focus.
6. **Post-pair refresh:** Successful pairing must transition through an explicit checking/loading state and refresh authorized status plus work catalogs before stable Home. It must not require manual Refresh to leave an `Unknown` state after successful pairing.
7. **Recent focus persistence:** The current mobile client must remember the last explicitly selected valid focused member per team run and prefer it when reopening that run from Recent work. If the remembered route is absent or invalid for the current run members, fallback to coordinator/default is allowed.
8. **Desktop/web isolation:** These refinements remain mobile-scoped. Desktop Electron and normal desktop/web workspace routes must not adopt mobile layout, focus bars, or setup behavior.

## Required Design Updates Made

- `requirements.md` status changed to `Refined` and new requirements/acceptance criteria were added:
  - `REQ-MOBILE-UX-011` / `AC-MOBILE-UX-012` for focus-bar scope.
  - `REQ-MOBILE-UX-012` / `AC-MOBILE-UX-013` for mode-aware user-facing copy.
  - `REQ-MOBILE-UX-013` / `AC-MOBILE-UX-014` for single-source blocker display.
  - `REQ-MOBILE-PAIRING-014` / `AC-MOBILE-PAIRING-015` for automatic post-pair refresh.
  - `REQ-MOBILE-UX-015` / `AC-MOBILE-UX-016` for focused Start new surface.
  - `REQ-MOBILE-UX-016` / `AC-MOBILE-UX-017` for searchable mobile pickers.
  - `REQ-MOBILE-FOCUS-017` / `AC-MOBILE-FOCUS-018` for current-client focus persistence.
- `investigation-notes.md` now records the API/E2E design-impact evidence, current post-implementation code findings, and the focus-persistence product decision.
- `design-spec.md` now includes API/E2E design-impact addendum, additional data-flow spines `DS-006` through `DS-009`, updated ownership/file responsibility mapping, interface guidance for current-client focus memory, and a rework migration sequence.

## Implementation Guidance Delta

Implementers should keep the already-passing runtime/model and focused-send behavior, then apply the following deltas:

- Gate `MobileTeamMemberFocusBar` by active surface so Runs has no existing-run focus selector.
- Make `MobileRuns.vue` treat `showRunSetup` as a focused setup state that hides or separates run history.
- Replace copy in `MobileRunSetup.vue`, `MobileLaunchRuntimeModelCard.vue`, and `MobileLaunchSummary.vue` with mobile user-facing text.
- Remove duplicated launch-blocker rendering.
- Reuse/generalize the searchable picker shape for team launch focus choices.
- Extend `mobileWorkStore` with current-client focus memory keyed by `teamRunId`; update `useMobileWorkCatalog` to validate and prefer remembered focus for Recent team-run contexts.
- Add an explicit post-pair checking state in `MobileRemoteAccessShell` before stable Home.

## Non-Goals

- No backend schema or API change is required for current-client focus memory.
- No cross-device/backend durable focus persistence is required in this ticket.
- No desktop/web UX change is required beyond the already-designed behavior-preserving `useTeamRunRuntimeCatalogSync` extraction.
- No native Android/iOS wrapper work.

## Expected Validation

- Repeat focused mobile component tests covering runtime/model setup, focus bar scope, Start new surface, mode-aware copy, single blocker display, focus-memory Recent reopen, and post-pair refresh.
- Repeat focused desktop/web checks for `RunConfigPanel`, `TeamRunConfigForm`, and team focus surfaces to prove the mobile refinements do not affect desktop/web behavior.
- Repeat browser/API validation for the user-requested runtime/model (`codex_app_server`, `gpt-5.5`) and team focus behavior, including Recent reopen preserving `api_e2e_engineer` or the latest selected member.
