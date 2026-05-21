# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined. The user explicitly re-scoped the mobile Remote Access MVP on 2026-05-19: runtime/model selection and team-member focus are no longer acceptable as later polish; they must be fixed in the mobile shell now. After API/E2E validation, the core runtime/model and focused-member routing behavior passed; this refinement adds required mobile UX/copy/focus-scope/persistence/pairing polish before delivery.

## Goal / Problem Statement

Mobile users cannot complete the same practical launch and team-targeting decisions that desktop/web users can complete:

1. In mobile Runs -> Start new, a user cannot choose runtime and model before starting a single-agent or agent-team run. The current mobile card only summarizes `Runtime/model` as `Existing desktop defaults`, while the user needs an actual selectable runtime/model control.
2. In mobile agent-team chat, a user cannot choose the focused individual team member before sending a message. Desktop/web can focus an individual member, and the next composer message is routed to that member.

The fix must make the mobile shell capable of these decisions without replacing or regressing the desktop workspace/run-configuration flow.

## Investigation Findings

- `autobyteus-web/components/mobile/MobileRunSetup.vue` intentionally says “Advanced desktop panels stay hidden,” renders only target/workspace/prompt controls, hardcodes `selectedModelLabel` to `Existing desktop defaults`, and computes launch readiness only from target/workspace/prompt.
- `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts` resets the selected agent/team template at launch time and auto-resolves a model with `resolveRunnableModelIdentifier`; this prevents mobile from preserving an explicit launch-time runtime/model choice even if the UI adds one without changing the coordinator.
- Desktop/web already has reusable launch controls and state owners: `RuntimeModelConfigFields.vue`, `agentRunConfigStore`, `teamRunConfigStore`, `TeamRunConfigForm.vue`, and `RunConfigPanel.vue`.
- Team launch readiness is already owned by `teamRunConfigStore.launchReadiness`; desktop `RunConfigPanel.vue` disables Run Team from that readiness boundary. Mobile currently bypasses that user-visible readiness path.
- `TeamRunConfigForm.vue` currently has an inline watcher that syncs runtime-scoped model catalogs into `teamRunConfigStore` for global and member override runtimes. Mobile needs the same sync if it renders team runtime/model controls; duplicating that watcher would create repeated launch-readiness policy.
- Team-member focus already exists in the domain: `AgentTeamContext.focusedMemberRouteKey`, `agentTeamContextsStore.focusMemberAndEnsureHydrated(teamRunId, memberRouteKey)`, and `activeContextStore.send()` route team messages through `agentTeamRunStore.sendMessageToFocusedMember(...)` using the active focused member. Mobile has no user-facing control to change that focus.
- `MobileWorkContext` already carries `focusedMemberRouteKey` for team-run contexts and `MobileRemoteAccessShell.openRunContext(...)` uses it when opening a team run, but `mobileWorkStore` lacks an explicit focus-update action and no mobile component exposes a focus selector.
- API/E2E live validation later proved the runtime/model and focused-send implementation path can work with `codex_app_server` and `gpt-5.5`, but identified mobile UX design issues: the existing-run focus selector appears on the Runs tab and conflicts with Start new, copy is desktop/internal or mode-inaccurate, launch blocking text is duplicated, pairing can show `Unknown` until manual refresh, Start new is too noisy above run history, pickers need phone-friendly search, and Recent reopen must preserve the last selected focused member.
- A focused local test attempt could not run during initial design because this worktree had no installed frontend test binary: `pnpm -C autobyteus-web exec vitest ...` failed with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`. API/E2E later ran focused Vitest suites successfully in its validation environment.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Parity for the existing mobile Remote Access shell.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Missing Invariant; Duplicated Policy Or Coordination risk if mobile copies team catalog/readiness logic.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now, limited to frontend launch/focus ownership alignment.
- Evidence basis: Mobile launch surface bypasses existing launch-config owners and hardcodes the runtime/model summary; launch coordinator overwrites config at launch; mobile team context stores focus identity but no mobile focus UI exists.
- Requirement or scope impact: Mobile launch must use the same authoritative launch config stores and readiness policy as desktop. Mobile member focus must update both team-domain focus and mobile context identity before the next send.

## Recommendations

- Reuse existing frontend launch configuration owners instead of inventing mobile-only runtime/model state.
- Add mobile-specific presentation components around the existing `RuntimeModelConfigFields` and team member override/readiness infrastructure.
- Extract team runtime-catalog synchronization from `TeamRunConfigForm.vue` into a reusable composable before consuming it from mobile.
- Add a mobile team-member focus bar/picker that updates `agentTeamContextsStore` and `mobileWorkStore` together.
- Scope the existing-run focus selector only to surfaces where it governs the current team run, not to Runs/Start new where it competes with initial-launch target selection.
- Make mobile copy mode-aware, user-outcome oriented, and free of desktop/store/internal terminology.
- Make Start new a focused mobile setup surface instead of a long form inserted above the full run history list.
- Preserve the last explicitly selected focused member when the same team run is reopened from Recent work in the current mobile client.
- Remove the hardcoded `Existing desktop defaults` mobile copy and hidden auto-model fallback from the mobile launch path.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## In-Scope Use Cases

- UC-MOBILE-LAUNCH-001: On mobile, start a new single-agent run and explicitly choose/confirm runtime and model before launch.
- UC-MOBILE-LAUNCH-002: On mobile, start a new agent-team run and explicitly choose/confirm team default runtime and model before launch.
- UC-MOBILE-LAUNCH-003: On mobile, start a new agent-team run and choose the initial focused leaf member that receives the first prompt.
- UC-MOBILE-FOCUS-004: On mobile, open an existing agent-team run and change the focused leaf member before sending the next message.
- UC-DESKTOP-NOREG-005: Desktop/web launch configuration and team-member focus behavior remain unchanged.
- UC-MOBILE-UX-006: Mobile Start new and existing-run focus controls remain visually scoped, concise, searchable, and phone-friendly.
- UC-MOBILE-PAIRING-007: A newly paired mobile session refreshes status/catalog state automatically and does not require manual Refresh to leave an `Unknown` state.
- UC-MOBILE-FOCUS-PERSIST-008: Reopening a team run from Recent work preserves the last valid mobile-focused member for that team run in the current mobile client.

## Out of Scope

- Adding new runtimes, model providers, provider credentials, or API-key preflight behavior.
- Backend contract changes unless implementation discovers a missing frontend-facing API capability.
- Native Android/iOS wrapper work.
- Full mobile subteam composer parity. This change targets focusable leaf agent members for direct message routing because `activeContextStore.send()` requires a focused leaf member context.
- Replacing the desktop `RunConfigPanel`, `AgentRunConfigForm`, `TeamRunConfigForm`, or desktop team views.

## Functional Requirements

- REQ-MOBILE-LAUNCH-001: Mobile single-agent launch setup must render runtime and model selection controls using the existing runtime/model data source and config semantics.
- REQ-MOBILE-LAUNCH-002: Mobile team launch setup must render team default runtime and model selection controls using `teamRunConfigStore` as the authoritative team launch-config owner.
- REQ-MOBILE-LAUNCH-003: Mobile launch readiness must include runtime/model completeness. A launch must not proceed when runtime/model choices required by the existing config stores/readiness rules are missing or unresolved.
- REQ-MOBILE-LAUNCH-004: Mobile team launch setup must allow selecting the initial focused leaf team member before sending the first prompt.
- REQ-MOBILE-LAUNCH-005: Mobile launch submission must preserve the selected runtime/model/config and selected initial focused member; it must not reset templates or auto-select a model after the user has configured the draft.
- REQ-MOBILE-FOCUS-006: Mobile team-run surfaces must expose a focus selector for leaf team members and show the currently focused member.
- REQ-MOBILE-FOCUS-007: Changing mobile team focus must update the active team context via `focusMemberAndEnsureHydrated(...)` and update the current `MobileWorkContext.focusedMemberRouteKey` so chat, files, activity, and context attachment targeting stay aligned.
- REQ-MOBILE-FOCUS-008: Sending a mobile team message after focus changes must route through the existing focused-member send path and target the newly selected member.
- REQ-DESKTOP-NOREG-009: Desktop/web launch and team-member focus behavior must not regress.
- REQ-CLEANUP-010: Obsolete mobile hardcoded runtime/default copy and hidden mobile auto-model fallback must be removed from the steady-state path.
- REQ-MOBILE-UX-011: The existing-run team focus selector must appear only on mobile surfaces where it controls the currently opened team run. It must not appear on the Runs tab, and it must not appear concurrently with Start new's `First message target` selector.
- REQ-MOBILE-UX-012: Start new and summary copy must be mode-aware and user-facing: Agent mode must not mention focused members, runtime/model copy must describe the mobile launch outcome, and summary/helper text must not expose desktop panel, store-backed, or implementation terminology.
- REQ-MOBILE-UX-013: Mobile launch readiness must show each launch-blocking issue in one authoritative place on the Start new surface; the runtime/model card and launch summary must not duplicate the same model/prompt blocking text.
- REQ-MOBILE-PAIRING-014: After a successful mobile pairing exchange, the shell must automatically refresh authorized status and work catalogs before presenting a stable Home state; successful pairing must not leave the user at `Unknown` until manual refresh.
- REQ-MOBILE-UX-015: When Start new is open, the mobile Runs tab must prioritize the setup as a focused task surface and hide or clearly separate the full run history list to reduce small-screen noise.
- REQ-MOBILE-UX-016: Mobile target/focus pickers used for launch decisions must support phone-friendly search/filtering and readable grouped results instead of relying on large native selects for long agent/team/member lists.
- REQ-MOBILE-FOCUS-017: The mobile client must remember the last explicitly selected valid focused member per team run and prefer it when reopening that team run from Recent work in the same mobile client; fallback to coordinator/default focus is allowed only when no remembered valid focus exists or the member route is no longer valid.

## Acceptance Criteria

- AC-MOBILE-LAUNCH-001: In a mobile viewport, selecting an agent in Start new shows runtime and model controls before launch, and changing them updates the launch summary.
- AC-MOBILE-LAUNCH-002: In a mobile viewport, selecting a team in Start new shows team default runtime and model controls before launch, and changing them updates the launch summary.
- AC-MOBILE-LAUNCH-003: In mobile Start new, Launch run remains disabled with actionable copy until target, workspace, prompt, and required runtime/model readiness are satisfied.
- AC-MOBILE-LAUNCH-004: Launching a mobile single-agent run uses the runtime/model/config values selected in the mobile setup draft.
- AC-MOBILE-LAUNCH-005: Launching a mobile team run uses the team default runtime/model/config values selected in the mobile setup draft and preserves valid member override state if exposed by the setup.
- AC-MOBILE-LAUNCH-006: Launching a mobile team run sends the first prompt to the selected initial focused leaf member.
- AC-MOBILE-FOCUS-007: In an existing mobile team run, the user can open a member focus picker, choose another leaf member, and see the focused-member label update.
- AC-MOBILE-FOCUS-008: After changing mobile team focus, the next mobile composer send targets the newly focused member through the existing focused-member team send path.
- AC-MOBILE-FOCUS-009: Mobile Files/Activity context attachment and team-message views continue to reflect the same focused member as Chat after focus changes.
- AC-DESKTOP-NOREG-010: Existing desktop `RunConfigPanel`, `AgentRunConfigForm`, `TeamRunConfigForm`, and team focus tests/manual checks still pass.
- AC-CLEANUP-011: Mobile launch code no longer hardcodes `Existing desktop defaults` as the runtime/model value and no longer silently chooses a first available model during launch submission.
- AC-MOBILE-UX-012: On a team-run context, the existing-run `Message target` selector is hidden on the Runs tab and while Start new setup is open; only Start new's `First message target` selector is visible during team launch setup.
- AC-MOBILE-UX-013: Agent-mode Start new copy does not mention focused members, team-mode copy names the first-message target, runtime/model helper copy does not mention the desktop launch panel, and launch summary copy does not mention store-backed/internal implementation details.
- AC-MOBILE-UX-014: Missing-model or missing-prompt launch blockers appear once on the Start new surface, not duplicated in both the runtime/model card and launch summary.
- AC-MOBILE-PAIRING-015: Immediately after successful pairing, Home transitions through a checking/loading state and then shows `Connected` or an actionable reachable/mixed status without requiring the user to tap Refresh.
- AC-MOBILE-UX-016: Opening Start new hides or separates the recent-runs list so the setup can be completed without scrolling past unrelated run history.
- AC-MOBILE-UX-017: Launch target/focus pickers expose a search input and filter long lists by label/detail/group on mobile.
- AC-MOBILE-FOCUS-018: After launching or selecting focus on a team run, returning Home and reopening that team run from Recent work restores the last valid focused member instead of resetting to the coordinator/default member.

### Desktop/Web Isolation Contract

- The normal desktop Electron application and normal desktop/web workspace routes must keep their current layout, run-configuration flow, team-member focus surfaces, and launch behavior.
- Mobile-specific UI changes must stay under the mobile shell (`components/mobile/*`) or mobile composables/stores.
- Any shared-code change is allowed only when it preserves desktop semantics exactly, such as extracting existing `TeamRunConfigForm` catalog-sync logic into a shared composable consumed by both desktop and mobile.
- Implementation must include desktop/web no-regression checks for the affected shared owners before delivery.

## Constraints / Dependencies

- Must preserve the phone-first mobile shell and bottom-tab navigation; do not reintroduce the desktop left tree or right panels as the mobile solution.
- Must use existing runtime/model provider stores and `RuntimeModelConfigFields` semantics where possible.
- Must keep team launch readiness authoritative in `teamRunConfigStore`.
- Must keep direct team-message routing through existing `activeContextStore` / `agentTeamRunStore.sendMessageToFocusedMember` boundaries.
- Must not add mobile-only runtime/provider preflight behavior that desktop does not have.

## Assumptions

- The screenshots are from the Nuxt mobile web shell served under `/mobile` or equivalent mobile route, not a separate native app.
- The current task should supersede the earlier Round 10/Round 11 triage that classified full mobile runtime/model editing as polish unless explicitly re-scoped; the user has now explicitly re-scoped it.
- Leaf member focus is sufficient for the reported “send to individual team member” need.

## Risks / Open Questions

- Existing mobile tests intentionally assert `Existing desktop defaults`; those tests must be updated to the new product decision.
- `SearchableGroupedSelect` touch ergonomics may need small mobile CSS adjustments after implementation.
- If selected teams have nested subteams whose coordinator is not a leaf member, mobile must choose the first direct leaf/member route for send safety or clearly require selecting a leaf.
- Current-client focus persistence is required for Recent reopen; durable cross-device/backend focus persistence remains out of scope unless already available through existing stores/history.
- Local initial validation was blocked until frontend dependencies/test binaries were available; API/E2E later used a prepared environment and recorded focused Vitest success.

## Requirement-To-Use-Case Coverage

- UC-MOBILE-LAUNCH-001: REQ-MOBILE-LAUNCH-001, REQ-MOBILE-LAUNCH-003, REQ-MOBILE-LAUNCH-005, REQ-CLEANUP-010
- UC-MOBILE-LAUNCH-002: REQ-MOBILE-LAUNCH-002, REQ-MOBILE-LAUNCH-003, REQ-MOBILE-LAUNCH-005, REQ-CLEANUP-010
- UC-MOBILE-LAUNCH-003: REQ-MOBILE-LAUNCH-004, REQ-MOBILE-LAUNCH-005, REQ-MOBILE-FOCUS-008
- UC-MOBILE-FOCUS-004: REQ-MOBILE-FOCUS-006, REQ-MOBILE-FOCUS-007, REQ-MOBILE-FOCUS-008
- UC-DESKTOP-NOREG-005: REQ-DESKTOP-NOREG-009
- UC-MOBILE-UX-006: REQ-MOBILE-UX-011, REQ-MOBILE-UX-012, REQ-MOBILE-UX-013, REQ-MOBILE-UX-015, REQ-MOBILE-UX-016
- UC-MOBILE-PAIRING-007: REQ-MOBILE-PAIRING-014
- UC-MOBILE-FOCUS-PERSIST-008: REQ-MOBILE-FOCUS-017

## Acceptance-Criteria-To-Scenario Intent

- AC-MOBILE-LAUNCH-001 validates mobile single-agent runtime/model configurability.
- AC-MOBILE-LAUNCH-002 validates mobile team runtime/model configurability.
- AC-MOBILE-LAUNCH-003 validates mobile launch readiness and actionable blocked state.
- AC-MOBILE-LAUNCH-004 validates single-agent runtime/model preservation.
- AC-MOBILE-LAUNCH-005 validates team runtime/model preservation.
- AC-MOBILE-LAUNCH-006 validates initial team member focus and first prompt routing.
- AC-MOBILE-FOCUS-007 validates discoverable existing-run focus selection.
- AC-MOBILE-FOCUS-008 validates focused-member send routing.
- AC-MOBILE-FOCUS-009 validates cross-tab focused-context alignment.
- AC-DESKTOP-NOREG-010 validates desktop no-regression.
- AC-CLEANUP-011 validates removal of obsolete mobile fallback behavior.
- AC-MOBILE-UX-012 validates focus-control scope and no duplicate selectors.
- AC-MOBILE-UX-013 validates mode-aware/user-facing copy.
- AC-MOBILE-UX-014 validates single-source blocking issue display.
- AC-MOBILE-PAIRING-015 validates automatic post-pair status/catalog refresh.
- AC-MOBILE-UX-016 validates focused Start new surface behavior.
- AC-MOBILE-UX-017 validates searchable phone-friendly pickers.
- AC-MOBILE-FOCUS-018 validates current-client focus persistence across Recent reopen.

## Approval Status

Refined after API/E2E Design Impact on 2026-05-19. Product clarification made in this document: the last explicit mobile focused member should persist for the same team run in the current mobile client, while cross-device/backend persistence is not required for this ticket. The refined requirements are ready for architecture review.
