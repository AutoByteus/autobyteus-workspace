# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: API/E2E Design Impact received; investigation/design refined for mobile UX/copy/focus-scope/persistence issues
- Investigation Goal: Identify why mobile cannot select runtime/model before launch and cannot focus/select an agent-team member, then define/refine a design that restores desktop-equivalent behavior on mobile without desktop regressions and resolves API/E2E design-impact UX findings.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Frontend mobile launch and focus behavior must be reconnected to existing shared launch/focus owners, with a small refactor to avoid duplicated team runtime-catalog policy.
- Scope Summary: Mobile launch runtime/model configurability and mobile agent-team focused member selection.
- Primary Questions To Resolve:
  - Which current mobile components hide or bypass runtime/model configuration?
  - Which existing desktop/shared owners should mobile reuse?
  - How is team member focus represented and routed today?
  - What refactor is required to avoid duplicating team readiness/catalog policy?
  - Which API/E2E-observed mobile UX issues are requirement/design gaps rather than implementation-only defects?
  - What focus persistence behavior should Recent reopen use without changing desktop/web semantics?

## Request Context

User reports two mobile-view defects:

1. Starting a new agent or agent-team run on mobile does not allow selecting runtime and model. Screenshot shows `Runtime/model Existing desktop defaults`, `Needs choices`, and disabled `Launch run`.
2. For agent teams, mobile cannot select/focus an individual team member. Desktop/web can focus an individual member and then send messages to that member.

Screenshots were supplied in the task prompt. The first screenshot is Android Chrome at `192.168.2.158:29695`, Software Engineering Team page, mobile Runs tab. The second screenshot is mobile Files tab and confirms the same mobile shell/bottom-tab layout.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-launch-config-member-focus`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-launch-config-member-focus/tickets/done/mobile-launch-config-member-focus`
- Current Branch: `codex/mobile-launch-config-member-focus`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-launch-config-member-focus`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-05-19.
- Task Branch: `codex/mobile-launch-config-member-focus`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative artifacts are in the task worktree, not the original `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-19 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v` | Bootstrap repository context | Original checkout was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on branch `personal` tracking `origin/personal`; remote is `git@github.com-ryan:AutoByteus/autobyteus-workspace.git`. | No |
| 2026-05-19 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating task branch/worktree | Fetch succeeded. | No |
| 2026-05-19 | Command | `git worktree add -b codex/mobile-launch-config-member-focus /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-launch-config-member-focus origin/personal` | Create mandatory dedicated task worktree/branch | Worktree created at commit `4aae26b4`, branch tracks `origin/personal`. | No |
| 2026-05-19 | Other | User screenshots in prompt | Understand reported mobile behavior | Mobile Runs launch card is visible but runtime/model row is read-only summary; launch blocked by `Needs choices`; no obvious member focus control shown. | No |
| 2026-05-19 | Command | `rg -n "Existing desktop defaults|Needs choices|Launch summary|Launch run|Start new|runtime/model|Runtime/model" -S .` | Locate current mobile launch implementation | Found `MobileRunSetup.vue`, `MobileLaunchSummary.vue`, and `MobileUxRefinement.spec.ts` intentionally asserting current hardcoded default copy. | Update implementation/tests |
| 2026-05-19 | Code | `autobyteus-web/components/mobile/MobileRunSetup.vue` | Inspect mobile launch UI owner | Text says advanced desktop panels stay hidden; component renders target/workspace/prompt only; `selectedModelLabel` is hardcoded to `Existing desktop defaults`; `canLaunch` ignores runtime/model readiness. | Fix needed |
| 2026-05-19 | Code | `autobyteus-web/components/mobile/MobileLaunchSummary.vue` | Inspect summary rendering | Runtime/model is a passive label row controlled by parent `modelLabel`; no control or error detail exists here. | Update summary inputs |
| 2026-05-19 | Code | `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts` | Inspect mobile launch submission owner | `launchAgent`/`launchTeam` call `setTemplate(...)` at launch, resolve a model automatically, then create/send. This would overwrite any UI-selected runtime/model unless changed. | Fix needed |
| 2026-05-19 | Code | `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Find reusable runtime/model control | Existing shared runtime and model controls render a runtime `<select>`, model `SearchableGroupedSelect`, and model config section from runtime-scoped provider data. | Reuse |
| 2026-05-19 | Code | `autobyteus-web/stores/agentRunConfigStore.ts` | Inspect single-agent launch config owner | `isConfigured` requires model and workspace; `setTemplate` builds defaults from agent definition. | Reuse |
| 2026-05-19 | Code | `autobyteus-web/stores/teamRunConfigStore.ts` | Inspect team launch config/readiness owner | `launchReadiness` delegates to `evaluateTeamRunLaunchReadiness` and is the authoritative readiness boundary for team runs. | Reuse |
| 2026-05-19 | Code | `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Compare desktop launch gating | Desktop disables Run Agent from `agentRunConfigStore.isConfigured` and Run Team from `teamRunConfigStore.launchReadiness.canLaunch`. | Mobile should align |
| 2026-05-19 | Code | `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Inspect team runtime/model and member override behavior | Desktop team config uses `RuntimeModelConfigFields`, `MemberOverrideTree`, and an inline watcher to populate team runtime model catalogs for readiness. | Extract shared catalog sync before mobile reuse |
| 2026-05-19 | Code | `autobyteus-web/components/workspace/config/MemberOverrideTree.vue`, `MemberOverrideItem.vue` | Inspect per-member runtime/model override capability | Existing member override UI already supports runtime override, model override, unresolved inherited-model warning, and model config. | Optional mobile advanced reuse |
| 2026-05-19 | Code | `autobyteus-web/components/mobile/MobileChat.vue` | Inspect mobile team chat surface | Uses `AgentTeamEventMonitor` when a team run is selected, but provides no mobile focus control. | Add focus bar/picker |
| 2026-05-19 | Code | `autobyteus-web/types/mobileWork.ts` | Inspect mobile context identity | `team-run` contexts already include `focusedMemberRouteKey`, and the context key includes it. | Add mobile context focus update action |
| 2026-05-19 | Code | `autobyteus-web/stores/agentTeamContextsStore.ts` | Inspect team focus owner | `focusedMemberContext`/`focusedMemberNode` derive from `focusedMemberRouteKey`; `focusMemberAndEnsureHydrated(teamRunId, memberRouteKey)` updates focus and hydrates historical leaf members. | Reuse |
| 2026-05-19 | Code | `autobyteus-web/stores/activeContextStore.ts`, `autobyteus-web/stores/agentTeamRunStore.ts` | Inspect focused send routing | `activeContextStore.send()` routes team sends through `sendMessageToFocusedMember(...)`, which targets `activeTeam.focusedMemberRouteKey`. | Reuse; focus must be set before send |
| 2026-05-19 | Doc | `tickets/done/mobile-remote-access-requirements/mobile-ux-redesign-addendum.md` | Check prior product decision | Round 10/11 triage said full mobile runtime/model editing was later polish unless explicitly re-scoped. Current user request explicitly re-scopes it. | Record in requirements |
| 2026-05-19 | Doc | `tickets/done/agent-team-member-runtime-selection/requirements.md`, `design-spec.md` | Check existing team runtime/model invariants | Existing product supports team default runtime/model and per-member runtime/model overrides with `teamRunConfigStore.launchReadiness` as the readiness owner. | Preserve invariants |
| 2026-05-19 | Command | `pnpm -C autobyteus-web exec vitest run components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts --runInBand` | Attempt focused baseline tests | Failed: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`. No frontend dependencies/test binary available in this worktree. | Implementation/validation must install deps or use existing environment |
| 2026-05-19 | Doc | `tickets/done/mobile-launch-config-member-focus/api-e2e-validation-report.md` | Consume API/E2E routed Design Impact | Core mobile runtime/model and focused-send flows passed live with `codex_app_server` / `gpt-5.5`; remaining failure is whole-mobile UX/copy/surface/focus persistence. | Yes: refine requirements/design |
| 2026-05-19 | Doc | `tickets/done/mobile-launch-config-member-focus/evidence/live-validation-observations.md` | Review live evidence details | Team launch `team_software-engineering-team_39133827` targeted `api_e2e_engineer`; single-agent launch `7a8037c6-b055-401c-8128-db8c5d798e42` stored selected runtime/model; focused-send to `delivery_engineer` succeeded; pairing initially showed `Unknown` until refresh. | Yes: design pairing refresh and focus persistence |
| 2026-05-19 | Code | `autobyteus-web/components/mobile/MobileWorkShell.vue`, `MobileTeamMemberFocusBar.vue`, `MobileRuns.vue`, `MobileRunSetup.vue`, `MobileLaunchRuntimeModelCard.vue`, `MobileLaunchSummary.vue`, `MobileTeamLaunchFocusPicker.vue`, `MobileLaunchTargetPicker.vue` | Inspect current post-implementation mobile surfaces after API/E2E findings | Focus bar is rendered globally from `MobileWorkShell` for team runs, including Runs; helper copy is generic; Start new copy says `focused member`; runtime/summary copy uses desktop/store terminology; blocking issue can be shown in card and summary; Start new renders above recent list; target picker is searchable but launch focus picker still uses native select. | Yes: refine file responsibilities and migration sequence |
| 2026-05-19 | Code | `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts`, `autobyteus-web/stores/mobileWorkStore.ts`, `autobyteus-web/composables/mobile/useMobileTeamMemberFocusCoordinator.ts`, `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue`, `autobyteus-web/stores/mobileNodeSessionStore.ts` | Inspect focus persistence and pairing refresh owners | Recent team-run contexts derive focus from coordinator/first member each catalog build; `mobileWorkStore.updateFocusedTeamMember` updates only current context; no per-team-run remembered focus map exists; pairing calls `checkStatus()` but stable Home can still render `Unknown` if status/catalog refresh is not represented as a blocking post-pair check state. | Yes: add per-run focus memory and stronger post-pair refresh contract |


## API/E2E Design Impact Findings (2026-05-19)

API/E2E classified validation as `Fail / Design Impact` after the core implementation behavior passed. This is not a regression in the selected runtime/model or focused-send data path; it is a requirement/design refinement for mobile UX and focus-scope behavior.

Functional behavior that passed live:

- Team launch selected `Software Engineering Team`, workspace `autobyteus-workspace-superrepo`, `codex_app_server`, `gpt-5.5`, and initial focus `api_e2e_engineer`; backend run `team_software-engineering-team_39133827` stored the selected runtime/model and first prompt landed only on `api_e2e_engineer`.
- Single-agent launch selected `Codex`, `codex_app_server`, and `gpt-5.5`; backend run `7a8037c6-b055-401c-8128-db8c5d798e42` recorded the selected runtime/model.
- Existing team-run focus changed to `delivery_engineer`; the next mobile send routed to backend member run `delivery_engineer_6463b48638a7e05e`.
- Focused Vitest suites passed in the API/E2E environment; Nuxt typecheck remained repository-wide red with no changed implementation source-file hits.

Design-impact issues requiring refined design:

1. The existing-run `Message target` focus bar is visible on Runs and while Start new setup is open, creating two selectors with different scopes.
2. Focus helper copy mentions Chat/Files/Activity while displayed on Runs, where it does not apply cleanly.
3. Agent-mode Start new copy mentions a focused member even though agent launches have no member focus choice.
4. Runtime/model helper copy references the desktop launch panel rather than the mobile launch outcome.
5. Launch summary copy exposes store/internal implementation language.
6. Blocking issue text is duplicated in both the runtime/model card and launch summary.
7. Successful pairing can initially show `Unknown` until manual refresh.
8. Start new is noisy because it is inserted above full run history.
9. Long launch/focus option lists require phone-friendly search/filtering; native large selects are not acceptable for team member focus.
10. Reopening a newly launched team run from Recent work reset focus to the coordinator/default instead of preserving the initial/last mobile focus.

Product/design decision made for issue 10: in this ticket, mobile must remember the last explicitly selected valid focused member per team run in the current mobile client and prefer it when reopening from Recent. Cross-device or durable backend focus persistence is outside scope unless it already exists through current stores/history.

## Initial Baseline Behavior / Current Flow Before Implementation

- Initial entrypoint or first observable boundary: Mobile web Runs tab -> `MobileRuns.vue` -> `MobileRunSetup.vue`.
- Current execution flow:
  1. User taps Start new in `MobileRuns.vue`.
  2. `MobileRunSetup.vue` shows Agent/Team mode, target picker, workspace picker, prompt, and `MobileLaunchSummary`.
  3. Runtime/model is not editable; parent passes `selectedModelLabel = 'Existing desktop defaults'`.
  4. `canLaunch` only checks workspace, prompt, and selected target.
  5. On submit, `MobileRunSetup` calls `useMobileRunLaunchCoordinator().launchMobileRun(...)` with target/workspace/prompt only.
  6. Coordinator resets agent/team config template and resolves a model automatically, then creates a temporary run/team and sends the prompt.
- Ownership or boundary observations:
  - Desktop launch state is correctly owned by `agentRunConfigStore` and `teamRunConfigStore`.
  - Mobile launch duplicates only a subset of setup state and bypasses visible runtime/model ownership.
  - Team focus is correctly owned by `agentTeamContextsStore`, but mobile context identity lacks an update action and no mobile focus selector exists.
- Current behavior summary: Mobile can know a launch needs choices but does not show the runtime/model controls needed to satisfy them; mobile can carry a focused member route key but cannot let users change it.


## Current Post-Implementation Behavior Relevant To Rework

- `MobileWorkShell.vue` currently renders `MobileTeamMemberFocusBar` whenever `context.kind === 'team-run'`, independent of active tab. This is why the existing-run `Message target` selector remains visible on Runs and during Start new setup.
- `MobileRuns.vue` currently renders `MobileRunSetup` inline above the recent-runs list when `showRunSetup` is true. This creates a long mixed task/history surface on small screens.
- `MobileRunSetup.vue` now renders runtime/model controls and a team first-message target picker, but its header copy is not mode-specific and its launch blocking issue can be repeated through the runtime card and summary.
- `MobileLaunchRuntimeModelCard.vue` currently references the desktop launch panel in helper copy. `MobileLaunchSummary.vue` currently says store-backed choices are preserved. Both should be replaced with user-facing mobile outcome copy.
- `MobileTeamLaunchFocusPicker.vue` currently uses a native `<select>` for member focus choices; long teams need the same searchable grouped picker behavior as other launch targets.
- `useMobileWorkCatalog.ts` computes team-run focus from `coordinatorMemberRouteKey` or first member every time run history is mapped. `mobileWorkStore` updates only the active current context, so Recent reopen can lose the last explicit mobile focus.
- `MobileRemoteAccessShell.onPaired()` calls `checkStatus()`, but the UI can still expose a stable-looking Home state with `Unknown`; the pairing transition needs an explicit post-pair checking/refreshing state and should treat status/catalog success as the source for the first stable Home render.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Parity.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Missing Invariant; Duplicated Policy Or Coordination risk.
- Refactor posture evidence summary: Refactor needed now. Mobile must depend on existing launch-config/readiness owners; the team runtime catalog sync must be extracted so mobile and desktop do not duplicate readiness support policy.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `MobileRunSetup.vue` | Hardcoded model label and readiness ignoring model. | Missing invariant: mobile launch cannot be ready until runtime/model config is ready. | Replace with store-backed runtime/model controls. |
| `useMobileRunLaunchCoordinator.ts` | Launch path resets template and auto-resolves model. | Boundary issue: launch submission owns hidden defaults instead of preserving user configuration from launch-config owner. | Make coordinator consume validated store state. |
| `TeamRunConfigForm.vue` | Inline runtime-catalog sync controls `teamRunConfigStore.launchReadiness`. | Duplicated policy risk if copied to mobile. | Extract reusable sync composable. |
| `agentTeamContextsStore.ts` | Existing `focusMemberAndEnsureHydrated` correctly owns focus/hydration. | Mobile should call this owner; no new team focus store should be created. | Add mobile focus picker/coordinator. |
| `mobileWorkStore.ts` | No action to update focused member within current context. | Mobile context key/attachments/activity can drift after domain focus changes. | Add focused context update action. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | Mobile start-new form | Owns local mode/target/workspace/prompt; hides desktop config; hardcodes model label. | Must become mobile presentation over existing launch stores. |
| `autobyteus-web/components/mobile/MobileLaunchSummary.vue` | Passive mobile launch summary | Displays runtime/model label but no state detail. | Can remain passive but must receive real runtime/model/focus/blocking issue labels. |
| `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts` | Mobile launch submission | Resets templates and hidden auto-model fallback at launch time. | Must preserve already configured store state and selected focus. |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Shared runtime/model/config UI | Existing reusable control for runtime, model, and model config. | Reuse in mobile runtime/model card. |
| `autobyteus-web/stores/agentRunConfigStore.ts` | Agent launch-config state/readiness | `isConfigured` requires workspace and model. | Use as mobile agent readiness boundary. |
| `autobyteus-web/stores/teamRunConfigStore.ts` | Team launch-config state/readiness | `launchReadiness` is the team launch authority. | Use as mobile team readiness boundary. |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Desktop team config form | Has inline catalog sync needed by readiness. | Extract catalog sync for mobile reuse. |
| `autobyteus-web/components/workspace/config/MemberOverrideTree.vue` | Team member override tree | Existing UI for per-member runtime/model overrides. | Reuse under mobile advanced/accordion if included. |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Mobile work frame/header/tabs | No team focus selector. | Best place for a persistent team focus bar visible across Chat/Files/Activity. |
| `autobyteus-web/stores/mobileWorkStore.ts` | Mobile current context and tab state | No focused-member update API. | Add a focused-team-member context update action. |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | Team contexts and focused member | Already owns focus and hydration. | Mobile focus UI should call this boundary. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-19 | Test | `pnpm -C autobyteus-web exec vitest run components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts --runInBand` | Failed with missing `vitest` command. | Validation needs dependencies/test binary installed or another prepared frontend environment. |

## External / Public Source Findings

No external/public sources consulted; issue is local to this repository.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For browser validation, run the Nuxt/mobile server with seeded agents, teams, workspaces, and provider models.
- Required config, feature flags, env vars, or accounts: Need an available runtime/model provider catalog for the runtime/model selector.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation from `origin/personal`; focused test attempt failed due missing dependencies.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The mobile launch UI was intentionally simplified in the previous Remote Access MVP, but the current user request explicitly reclassifies runtime/model selection as required mobile functionality.
2. Adding UI alone is insufficient because the launch coordinator would currently reset selected config at submit time.
3. Mobile should not own a parallel runtime/model state shape; the existing stores already encode desktop launch behavior and team readiness.
4. Team focus already has a clean domain owner. The missing pieces are mobile presentation and mobile-context synchronization.

## Constraints / Dependencies / Compatibility Facts

- User clarified after initial design handoff that the fix must not influence or regress the desktop Electron application or normal desktop/web application. This is already consistent with the design direction and is now recorded as a hard isolation contract.
- Mobile UI changes should stay in the mobile shell. Shared extraction is permitted only when behavior-preserving for desktop.
- Base branch is `origin/personal` as of 2026-05-19 fetch.
- Must preserve desktop behavior while restoring mobile parity.
- No backend change is expected for runtime/model selection or focused-member routing.
- Mobile focus should target leaf agent members for direct composer send safety.

## Open Unknowns / Risks

- Whether `SearchableGroupedSelect` or the custom launch target picker needs additional mobile-specific touch styling after visual/browser validation.
- Whether dependency installation in this worktree is acceptable for implementation validation or whether downstream should use an already prepared frontend worktree.
- Edge case: nested teams with a non-leaf coordinator require choosing a focusable leaf for direct mobile send.
- Current-client focus persistence is required for Recent reopen; backend/cross-device persistence remains an explicit non-goal for this refinement unless existing APIs already provide it.

## Notes For Architect Reviewer

Design should check that mobile uses existing authoritative launch/focus owners and does not create a second runtime/model readiness policy. The design-impact refinement adds mobile-only UX/copy/focus-scope changes, post-pair refresh behavior, current-client focus memory, and searchable launch/focus pickers. The desktop/web isolation contract remains unchanged; shared-code changes must be behavior-preserving extractions or owner-aligned state APIs.
