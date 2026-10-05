# Implementation Handoff — run-settings-ui-unification

Package folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/`
(the paths below are relative to it unless absolute).
Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification`. Branch `codex/run-settings-ui-unification`, base `origin/personal@19dee40b3`, finalization target `personal`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result:
  - Architecture review was selected and passed (ARCH-REV-002; ARCH-REV-003 for SR-009; ARCH-REV-004
    for SR-010) on the `Large`/`High` route.
  - The handoff rules route the result to the Code Reviewer (targeted delta review of IR-003); API/E2E
    then resumes on the new head.
- Requirements doc: `requirements-doc.md` (SR-006, Approved).
- Investigation notes: `investigation-notes.md`.
- Solution revision record: `solution-revision-record.md`.
- Design spec: `design-spec.md` (SR-010; §"SR-010 Addendum" is authoritative where it refines earlier sections).
- Supplemental task artifacts:
  - `architecture-handoff.md`; `product-design-request*.md`.
  - The normative Product spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/ui-ux-spec.md` and its `visual-references/VIS-001..042`.
- Design review report: `design-review-report.md`.
- Architecture review revision record: `architecture-review-revision-record.md`.
- Triggering rework report: `code-review-report.md` and `code-review-revision-record.md`:
  - CRR-001 → CRR-002: CR-001 (Design Impact, resolved by SR-009 / ARCH-REV-003), CR-002 and CR-003 (Local Fix) → IR-002.
  - CRR-004: DI-001..DI-006, decided by SR-010 / ARCH-REV-004 → IR-003.
- API/E2E coverage investigation: `api-e2e-coverage-investigation.md`.

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-003` (baseline `IR-001`; `IR-002` before it)
- Related solution revision IDs: `SR-006`, `SR-008`, `SR-009`, `SR-010`
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`, `ARCH-REV-004`
- Related code-review revision IDs: `CRR-001`..`CRR-004`. API/E2E: in progress (resumes on the IR-003 head). Delivery: `N/A`
- Triggering finding IDs: `DI-001`, `DI-002`, `DI-004`, `DI-006(b)`, `DI-006(e)` (see `IR-003`); earlier `CR-001`..`CR-003` (`IR-002`)

Agent and Team runs start only from New chat. The heading switcher picks the target, and settings
sit in the composer chips. A Team also gets a members line that opens the Member settings drawer.

Agent Orgs start from a new Org launch page: one settings card, a Run button and the same drawer.

Every Run, "+", switch and tree-"+" intent goes through `useRunStart`. There are two draft owners:
- `chatDraftStore` for Agents and Teams; it now holds Team member overrides;
- `agentOrgLaunchDraftStore` for Orgs, which launches through `agentOrgLaunchService`.

Saved runs (Edit Config) use the same card and member rows. The fields are fixed, and the runtime
is locked in the model menu. Save appears only after a change; Cancel discards. A small stop icon
calls `useRunStopAction`.

`@` is mention-only everywhere. In drafts, the candidates mirror the server's
CollaboratorCandidatePolicy, and the first send carries the mentions for both Agents and Teams.

Other model settings (Codex Fast mode `service_tier`) get their own chip or row, separate from
Thinking.

The old launch forms, panels, form-model projections, their types, the dead copy and the specs are
deleted.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section: `design-spec.md` → "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - Launch paths changed for Agent, Team and Org.
  - The Org `mode=configuration` route renders a new page.
  - Org orchestration moved into a store and a service.
  - About 30 new or changed production files and about 48 deleted files.
  - No server, API or persistence change was needed.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`.
  - No server/GraphQL change was required.
  - Mobile behavior is unchanged.
  - No removed component had an unlisted product consumer. The e2e probes that used them were migrated.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Agents list/detail → Run opens New chat with definition defaults; the first message starts the run | `composables/runSettings/useRunStart.ts` (`runAgent`; Chat nav and pencil via `newChat()` from `AppLeftPanel.vue`, DI-001) → `stores/chatDraftStore.ts` (`startForDefinition`/`startNewChat`; start orders `definitionStartOrder`/`chatNavStartOrder` + `resolveStartModel` in `utils/runSettings/startModelDefaults.ts`, DI-006b; `services/runSettings/startModelCatalog.ts`) → `components/chat/ChatNewSurface.vue` → `services/chat/chatLaunchService.ts` (readiness by `utils/runSettings/launchReadiness.ts`, DI-004); `AgentList.vue`, `AgentDetail.vue` | Done. Visual 24-run-agent; probe B01/B06 |
| BEH-002 | Agent Teams → Run opens New chat for the team plus the members line and drawer; the launch applies agent overrides | `useRunStart.runTeam` → `chatDraftStore` (`teamAgentOverrides`, `changeTeamMember`/`resetTeamMember(s)`) → `components/run-settings/RunMembersLine.vue` / `RunMemberSettingsDrawer.vue` / `RunMembersSection.vue` / `RunMemberRow.vue` (projection `utils/runSettings/runMemberTree.ts` `buildTeamMemberTree`, `utils/runSettings/memberOverrides.ts`) → `services/chat/chatTeamLaunchConfig.ts` (overrides) → `chatLaunchService` (readiness over every member's effective scope via `buildTeamMemberTree` + `resolveScopesReadiness`, DI-004) | Done. Visual 03–08, 21; probe B03/B04 (member Ask first reaches `memberConfigs`) |
| BEH-003 | Org Run, Org "+" and switcher open the Org launch page; Run (no message, no recipient) opens the launched Org view | `useRunStart.runOrg/copyOrgRun/switchTarget` → `stores/agentOrgLaunchDraftStore.ts` (prepare, readiness via `resolveScopesReadiness` (DI-004), stale-intent key, overrides, `copyFromRun`) → `components/run-settings/OrgLaunchPage.vue` (rendered by `pages/workspace.vue`) → `services/agentOrgExecution/agentOrgLaunchService.ts` → `buildAgentOrgActiveRoute` | Done. A real Org launched to `mode=active`, and the server config shows the member override (visual 09–13, 22) |
| BEH-004 | Edit Config is the saved-run settings view: stop, discard, save | `components/workspace/config/ExistingRunConfigEditor.vue` (container) → `components/run-settings/ExistingRunSettings.vue`; owner `stores/existingRunConfigStore.ts` + `stores/existingRunConfigEditActions.ts` (readiness derived from model options, `discardChanges`, `reloadCanonical`); `composables/runSettings/useRunStopAction.ts`; `RunConfigPanel.vue` reduced to chrome | Done. Visual 14–17; probe `existing-run-model-config` A–F (save, RUN_ACTIVE relock, replacement, indeterminate → Refresh) |
| BEH-005 | Chat controls are reused everywhere; the model menu gains `runtimeLocked` | `ChatModelMenu.vue` (placement/align/`runtimeLocked`/`lockedModels`/drill-in), `ChatThinkingControl.vue`, `ChatWorkspaceMenu.vue` (`RunWorkspaceChoice`), `ChatApprovalToggle.vue`, `composables/popover/useMenuInBoundary.ts`; all used by `RunSettingsCard.vue` | Done |
| BEH-006 | `@` is mention-only (Agents/Teams; current target and its tree excluded); the first message keeps mentions | `utils/collaborators/draftMentionEligibility.ts`, `composables/runSettings/useMentionCandidates.ts`, `composables/agentInput/useComposerMentionMenu.ts` (replaces `useRunMentionMenu`), `components/agentInput/ComposerMentionMirror.vue`, `ChatMessageInput.vue`, `ChatTargetMenu.vue` (mention list), `AgentUserInputTextArea.vue`; first send: `stores/agentRunStore.ts` (keeps `requestedMentions`), `stores/agentTeamRunStore.ts` (`sendMessageToFocusedMember` `mentions`), `chatLaunchService` (`mentionsPresentInText`) | Implemented and unit-tested. **Server admission of first-send mentions is not yet shown for an Agent and a Team (API/E2E).** |
| BEH-007 | "+" on a run: Agent/Team → New chat prefilled; Org → Org page prefilled | `useRunStart.copyAgentFromConfig(displayed AgentRunConfig)/copyTeamRun({isCurrent})/copyOrgRun`; `AgentWorkspaceView.vue` (passes `target.context.config`: the host agent, an `@` task child or a task team's member; CR-001), `TeamWorkspaceView.vue` (late-copy guard), `AgentOrgWorkspaceView.vue`; tree "+" → `WorkspaceAgentRunsTreePanel.vue` → `useRunStart.newChatInWorkspace` | Done. Unit-tested; the Org "+" was checked in the browser. The Agent/Team "+" from live runs is left to E2E |
| BEH-008 | Removed lines and forms | Removal Plan executed (see Legacy check) | Done. `runSettingsCatalog.spec.ts` asserts the files and keys are gone |
| BEH-009 | A chip or row per other model setting | `utils/runSettings/modelOptions.ts` (moved from `components/chat/chatModelOptions.ts`, DI-006e), `components/chat/ChatModelOptionControl.vue`; rows in `RunSettingsCard.vue`; member customization by option key | Done. Visual 18–23 (Fast on/off independent of Thinking; member Fast customized; carried to Org) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

All paths are under `autobyteus-web/`.

- **New foundations**
  - `types/runSettings/{RunWorkspaceChoice,RunSettings}.ts`
  - `services/workspace/runWorkspaceChoice.ts`: the only workspace-shape conversions (AR-004).
  - `utils/runSettings/{startModelDefaults,memberOverrides,runMemberTree,launchReadiness,modelOptions,explicitModelConfig}.ts`.
    Nothing in `utils/` imports `components/` (DI-006e); `humanizeThinkingValue` moved to `utils/llmThinkingConfigAdapter.ts`.
  - `services/runSettings/startModelCatalog.ts`
  - `utils/agents/builtInAgentDefinitionIds.ts`: mirrors the server registry, pinned by `utils/agents/__tests__/builtInAgentDefinitionIds.contract.spec.ts` (DI-002).
- **Start and launch**
  - `composables/runSettings/useRunStart.ts`, `stores/chatDraftStore.ts`
  - `services/chat/{chatLaunchService,chatTeamLaunchConfig}.ts`
  - `stores/agentOrgLaunchDraftStore.ts` (replaces `agentOrgRunConfigStore`)
  - `services/agentOrgExecution/agentOrgLaunchService.ts`
  - `services/workspace/workspaceNavigationService.ts` (Org launch/active routes)
- **Views:** `components/run-settings/*` (13 files)
  - `ChatNewSurface.vue`
  - `pages/chat.vue`, `pages/workspace.vue`; `WorkspaceAdaptiveLayout.vue` (Org config branch removed)
- **Mentions**
  - `utils/collaborators/draftMentionEligibility.ts`
  - `composables/runSettings/useMentionCandidates.ts`
  - `composables/agentInput/useComposerMentionMenu.ts`
- **Saved runs**
  - `ExistingRunConfigEditor.vue`, `RunConfigPanel.vue`
  - `stores/existingRunConfigStore.ts`, `stores/existingRunConfigEditActions.ts`
  - `composables/runSettings/useRunStopAction.ts`
- **Start-surface tools**
  - `composables/layout/useStartSurfaceTools.ts`, `components/layout/StartSurfaceToolsToggle.vue`
  - `WorkspaceToolShell.vue`, `RightSideTabs.vue`
- **Localization**
  - `localization/messages/{en,zh-CN}/runSettings.ts`
  - `chat.ts`/`shell.ts`/`workspace*.ts` key changes
  - `localization/audit/migrationScopes.ts` (scope `M-017`)
- **E2E probes migrated**
  - `tests/e2e/fresh-run-auto-approval-probe.mjs` + fixture: New chat / switcher / members drawer.
  - `existing-run-model-config-probe.mjs`: saved-run card/member rows.
  - `chat-composer-polish-probe.mjs` (T03 via the card Thinking control; the removed hint line).
  - `chat-composer-menus-open-upward-probe.mjs`, `chat-entry-live-probe.mjs`, `cross-scope-agent-mentions-live-probe.mjs`: `@` → `run-mention-*`, target via `run-target-switcher-*`.
  - `agy-large-org-launch-health-probe.mjs`: Org launch page; the server diagnostic is in the console and the page shows the spec copy.

## Important Assumptions

- **Draft mention eligibility** mirrors the server's CollaboratorCandidatePolicy: shared non-built-in
  agents and shared teams, excluding the target and its tree. Team definitions are flat today, so the
  "tree" is the team plus its members (TEAM_LOCAL members map to `buildTeamLocalAgentDefinitionId`).
- **Shared start vocabulary (CR-002):** the carry type is `RunStartSettings` in `types/runSettings/RunSettings.ts`, and `explicitChatModelConfig` lives in `utils/runSettings/explicitModelConfig.ts`. `agentOrgLaunchDraftStore` has no chat-store imports.
- **Org topology (CR-003):** a blocked topology disables Run with the "unavailable" reason, and its diagnostic is logged once when detected (a watch in the store). `launch` has no dead branch.
- **Built-in agent ids** come from a client constant that points to the server registry. There is
  no API for them.
- **`runMemberTree`** exposes three named functions (`buildTeamMemberTree`, `buildOrgMemberTree`,
  `buildSavedRunMemberTree`) instead of `buildRunMemberTree.forX`. They are equivalent and easier
  to import.
- **Saved-run model replacement** commits the target model with `llmConfig: null` (its defaults),
  the existing contract. New chat keeps its explicit chat config.
- **Saved-run readiness:** the current model is ready unless its runtime says it is no longer
  offered. Other models need ready options and `selectionAllowed`. Thinking edits on the current
  model stay saveable while options load or are unavailable.
- **Org launch failures** show the spec copy "Couldn't start this Agent Org. Try again." The server
  message goes to the console, as the design says (lines 633–634).
- **Member drawer width:** default 480 px, range 400–960, clamped so the page stays at least 360 px.
  Per the Product spec; the design's "400 px" fallback is read as the clamp minimum.

## Known Risks

- **First-message mention admission** was shown by server unit tests (43/43) and live N02/N03
  (DI-003, resolved). If a future regression breaks it, the recorded fallback is a Requirement Gap
  (no code now).
- **Readiness change (DI-004):** a Team draft or a "+" copy with a member on a now-disabled runtime is
  now blocked before launch (previously only the root scope was checked). The copy and AC-002 order
  are unchanged.
- **Deferred follow-ups (not in this ticket):** FU-001 server `@` query, FU-002 split
  `AgentOrgExperience.vue` (500 lines), FU-003 target-neutral New chat carrier, FU-004
  `RemoteAgentCard.vue`.
- **The built-in agent id constant mirrors the server registry by hand.** Drift now fails the unit
  contract pin (DI-002); live probe N03 stays a required S4 regression. A server-owned `@` query is
  follow-up FU-001.
- **Numeric non-thinking model params are not presented.** None exist today; a stored value is kept
  (design deferral).
- **The saved-run "model unavailable" note** appears on the root card only. A member whose own
  model is no longer offered does not show the note in its row.
- **After RUN_ACTIVE**, the saved-run Save bar stays visible but disabled, with Cancel available,
  until the user cancels or the run stops. This is acceptable, but a reviewer may prefer it hidden.
- **`RunningTeamGroup`/`TeamMemberRow` stay in place** because an e2e fixture still uses them. They
  are not part of the removed launch UI.
- **Pre-existing failures:**
  - The web suite has 11 failing test files, all on the baseline list (17 failed at baseline); there
    are no new ones.
  - `MobileUxRefinement.spec.ts` (2 tests) fails on baseline. `components/mobile` is unchanged.
- **Live probes** that need real runtimes or LLM credentials were migrated and syntax-checked but
  not executed: `chat-entry-live`, `cross-scope-agent-mentions-live`, `chat-composer-polish`,
  `chat-composer-menus-open-upward` and `agy-large-org-launch-health`.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement`
- Reviewed root-cause classification: `Duplicated Policy Or Coordination` + `Boundary Or Ownership Issue`
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - One start API (`useRunStart`) and two draft owners.
  - Org side effects live in `agentOrgLaunchService`; the view only renders and calls the store.
  - One `components/run-settings` vocabulary is used by New chat, the Org page and saved runs.
  - `existingRunConfigStore` stays the saved-run owner.
  - Views never call launch, terminate or GraphQL directly.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, files, helpers, tests and replaced paths removed in scope: `Yes`.
  - Forms and editors: `AgentRunConfigForm`, `TeamRunConfigForm`, `TeamScopeConfigEditor`, `TeamMemberConfigTree`, `MemberOverrideItem`, `MemberOverridesDisclosure`, `AgentOrgRunConfigForm`/`Panel`, `AgentOrgDirectAgentOverrideRow`, `DraftRunConfigEditor`, `WorkspaceSelector`, `FixedWorkspacePath`, `AutoApproveSwitch`.
  - Panels and rows: `RunningAgentsPanel`, `AgentLibraryPanel`, `RunningAgentGroup`, `RunningRunRow`.
  - Models, stores and composables: `WorkspaceSelectorModel`, the editable/existing form-model projections and types, `TeamRunFormDisplay`, `useRunActions`, `useRunMentionMenu`, `agentOrgRunConfigStore`.
  - Their specs, 115 dead `workspace.*` copy keys, and the dead `chat.*` keys.
- Shared structures remain tight: `Yes`.
  - `RunSettingsValues`/`RunMemberSettingChange`/`RunMemberSettingReset` are shared by both draft owners and the saved-run container.
  - There are no parallel per-surface shapes.
- Canonical shared design guidance reapplied: `Yes`.
- Changed source files within size guardrails: `Yes`.
  - No file is over 500 non-empty lines. `AgentOrgExperience.vue` is at exactly 500 (497 at base).
  - Changed files over 220 non-empty lines (base → now):
    - small deltas: `agentTeamRunStore.ts` 482→489, `existingRunConfigStore.ts` 458→460 (edit actions split into `existingRunConfigEditActions.ts`), `ChatWorkspaceMenu.vue` 233→241, `ExistingRunConfigEditor.vue` 228→232; `AgentUserInputTextArea.vue` shrank 415→386;
    - real growth (corrected per CRR-001): `ChatModelMenu.vue` 292→396 (placement, locked runtime, drill-in), `chatDraftStore.ts` 257→340 (Team overrides, start rules; the model-config helper moved out in IR-002), `ChatMessageInput.vue` 222→270 (separate `/` and `@` popovers). Each still owns one concern.
  - New files stay under 400 (`agentOrgLaunchDraftStore.ts` 384).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (server data); tolerant local preference keys.
- Design-spec decision reference: `design-spec.md` → "Persisted Data / State Transition Decision".
- Implementation follows the approved decision: `Yes`.
  - New keys: `autobyteus.chat.memberPanelWidth` and `autobyteus.chat.startToolsOpen`. A missing or invalid value falls back to the default.
  - `autobyteus.chat.lastModel` is read by the Org fallback and written after an Org launch.
- Direct-use evidence: N/A. Deviation: `None`.

## Environment Or Dependency Notes

- No new dependencies.
- `pnpm dev` from the worktree writes data only under the worktree's
  `.autobyteus/development/server-data`. The dev stack I started has been stopped.
- The untracked `autobyteus-application-*/dist/` folders are build output and are not committed.

## Local Implementation Checks Run

- **Full web suite** (`pnpm test:nuxt --run`):
  - IR-003: 11 failing files (36 tests), all on the recorded baseline list (17 files at baseline,
    AF-020); no new failures to attribute to any slice. 547 files pass, 3,619 tests pass. The
    OrgLaunchPage spec (3 tests) was added after that run and passes.
  - Logs: `/tmp/rsui-tests-5.log`; baseline `/tmp/rsui-baseline-failing-files.txt`.
- **IR-003 checks by slice (SR-010 DI-005):**
  - S1 Agent/Team start: `useRunStart` (`newChat`), `AppLeftPanel_v2` (nav and pencil go through
    `newChat`, `beginSelectionIntent` kept), `chatLaunchService` (Team readiness over members, AC-002
    order), `startModelDefaults` (both start orders), `chatDraftStore`; probe `fresh-run-auto-approval` 8/8.
  - S2 Org launch: `launchReadiness` (order; blocked topology → unavailable), `OrgLaunchPage` (ready;
    blocked topology shows the unavailable copy with Run disabled; a member's disabled runtime is
    named before a missing model), `agentOrgLaunchDraftStore`.
  - S3 Saved runs: probe `existing-run-model-config` 6/6 (no saved-run code changed in IR-003).
  - S4 Mentions: unit contract pin `builtInAgentDefinitionIds.contract` passes. Live N01–N03 are
    owned by API/E2E.
  - S5 Fast mode: `modelOptions` (moved), `RunSettingsCard`/`ChatNewSurface` specs pass.
  - S6 Tools + visuals: no view changes in IR-003.
  - AC-012/AC-015 with every slice: localization audit and both guards exit 0; mobile specs as below.
- **Targeted specs pass**, new and updated:
  - New: `draftMentionEligibility`, `modelOptions` (was `chatModelOptions`), `startModelDefaults`, `launchReadiness`, `builtInAgentDefinitionIds.contract`, `OrgLaunchPage`, `runMemberTree`, `agentOrgLaunchService`, `agentOrgLaunchDraftStore`, `useRunStart`, `useRunStopAction`, `RunMembersLine`, `runSettingsCatalog`, `RunConfigPanel`.
  - Updated: `chatDraftStore`, `chatLaunchService`, `ChatMessageInput`, `pages/chat`, `AgentWorkspaceView`, `TeamWorkspaceView`, `TeamCanonicalPlus`, `AgentTeamDetail`, `WorkspaceAdaptiveLayout`, `existingRunConfigStore`, `ExistingRunConfigEditor.workspace`, `AgentOrgWorkspaceConfigBoundary`, `agentTeamRunStore`, `agentOrgRunLaunchSeed`, `existingAgentOrgWorkspaceDraft`, the localization catalog specs.
- **vue-tsc:** no errors in touched production files. The repo has pre-existing spec typing errors.
- **Localization and guards:** `audit-localization-literals`, `guard-localization-boundary` and `guard-web-boundary` all exit 0. The new strict scope `M-017` covers `components/run-settings`.
- **Mobile specs (AC-015):** 22/23 files pass. `MobileUxRefinement.spec.ts` fails on baseline.
- **Implementation-scoped browser probes** (mocked GraphQL, owned Nuxt and Chrome, no user data):
  - `fresh-run-auto-approval` 8/8; evidence in `evidence/implementation/fresh-run-auto-approval/`.
  - `existing-run-model-config` 6/6; evidence in `evidence/implementation/existing-run-model-config/`.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces and journeys:**
  - New chat (Agent/Team), the heading switcher, the members line and drawer, `@` mentions.
  - The Org launch page, start-surface tools, saved-run settings (Agent/Team/Org).
  - The Fast mode chip and row.
- **References:** `ui-ux-spec.md` UXJ-001..010, UIS-001..005, VIS-001..042.
- **Reused:**
  - The existing chat control family and design-repo components (`useMenuInBoundary` copied).
  - Adjacent surfaces checked: the tree, run headers, the workspace tool shell.
- **Rendered surface:**
  - The worktree `pnpm dev` stack (backend 127.0.0.1:8000, frontend 127.0.0.1:3000, isolated data).
  - Playwright-core Chrome screenshots, plus the two mocked-boundary probes.
- **States, layouts and viewports inspected:**
  - Widths 1512 / 1280 / 880 / 804 / 390.
  - New chat for the default agent; the switcher open; Team members line idle and customized.
  - The drawer at desktop and at 390 full-width; Escape returns focus to the line.
  - The `@` menu excludes the target.
  - Org launch page: idle, drawer, tools open, 390, Run → active.
  - Saved Org run: running → Stop → stopped/editable → unsaved → saved.
  - Locked-runtime model menu; Fast on/off; member Fast customized; Fast row on the Org card.
  - Run from the Agents and Agent Teams pages.
  - Saved run after RUN_ACTIVE (locked, server message shown).
- **Issues found and corrected:**
  - The footer overflowed with a long model name plus Thinking plus Fast, cutting off Send at 390.
    Fixed with `min-w-0`/`max-w-full` and no-shrink Send/voice.
  - The empty `alt` attribute was flagged by the audit.
  - The New chat warm-up reload in the probe harness.
  - The saved-run model replacement sent explicit defaults; it now sends `null`.
- **Evidence:** `evidence/implementation/01..24-*.png` plus the two probe folders.
- **Remaining unverified:**
  - Real Agent and Team first sends with mentions (they need LLM credentials).
  - Agent and Team "+" from live runs in the browser.

## Downstream Coverage Hints / Suggested Scenarios

1. **Agent first send with `@Team` mention** (New chat, real runtime). The server admits the mention
   and the collaborator appears; repeat for a Team first send with `@Agent`. On rejection or drop →
   `Design Impact`.
2. **Team launch with one member customized** (approval Ask first, Fast on). The created team run's
   member config has those values; uncustomized members inherit.
3. **Org launch page:**
   - Run with a member override and a placed-team workspace; the active Org config matches.
   - A server validation failure shows the spec copy and the page keeps its values.
4. **"+" from live Agent, Team and Org runs.** New chat or the Org page opens prefilled with the
   source settings. A late Team copy after navigating away opens nothing.
5. **Saved Team/Org run:**
   - stop, edit a member's thinking, Cancel, edit again, Save;
   - resume uses the saved config;
   - the locked-runtime menu lists only allowed replacements.
6. **Live probes to run with credentials:** `pnpm test:e2e:chat-entry-live`,
   `cross-scope-agent-mentions-live-probe.mjs` (A01/N01), `chat-composer-polish`,
   `chat-composer-menus-open-upward` (U02 `@` geometry now on `run-mention-menu`),
   `agy-large-org-launch-health-probe.mjs`.
7. **Temp contexts:** ⚙ is hidden for a `temp-*` run, and the start-surface tools open the temp
   workspace.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- First-message mention admission (Agent and Team), server-side, with real runtimes. This is required
  by the review guardrail.
- Team member overrides and Org launch inputs reaching the server-created runs.
- "+" copy flows from live runs and the resume behavior of saved-run edits.
- Execute the migrated live probes listed above.
