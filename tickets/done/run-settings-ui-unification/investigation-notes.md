# Investigation Notes — run-settings-ui-unification

## Investigation Meta

- Package identifier: `run-settings-ui-unification`
- Owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-04
- Task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification`
- Branch: `codex/run-settings-ui-unification`
- Base: `origin/personal` @ `26b555126ebcda7d9fa80d728e24475baba7acb8` (fetched 2026-10-04)
- Finalization target: `personal` (repository integration branch)
- Phase: requirements investigation (pre-approval); Product Design requested by user.

## Initial Request And Clarifications

User (2026-10-04, paraphrased with original intent preserved):

> The chat page shows the same four pieces of information (workspace, auto-approve,
> model + runtime, thinking) and looks clean and simple. The agent run config form
> (Agents → Run) shows exactly the same four pieces but feels "not clean, not
> user-friendly". The Agent Team and Agent Org run config forms are worse — "a super
> long list of configuration". We should work on the UI first. Analyze and propose ideas.

Follow-up (2026-10-04):

> Send a message to the product team to work on the UI. I will discuss the UI with
> them; once I'm satisfied with the final UI, we continue.

Interpretation: user requests Product Team UI/UX design for the run configuration
surfaces; requirements approval and architecture are deferred until the user accepts
the Product UI result.

## Product And Domain Understanding

- A run launch needs four user decisions: **workspace**, **tool auto-approval**,
  **model (with its runtime)**, **thinking/reasoning level**.
- Agent Teams add per-member overrides; Agent Orgs add direct agents plus mounted
  teams, each with members, each overridable.
- Existing (saved) runs can be reopened; runtime and workspace are fixed, model and
  model config may be editable only when the run is stopped.

## Source Log

| Source | Kind | Notes |
| --- | --- | --- |
| `evidence/user-screenshots/01..04-*.png` | User screenshots | Team existing-run config, chat composer, org run form, agent run form |
| `autobyteus-web/components/chat/ChatComposer.vue`, `ChatNewSurface.vue` | Code | Chat composer layout, footer slots |
| `autobyteus-web/components/chat/ChatModelMenu.vue`, `ChatThinkingControl.vue`, `ChatWorkspaceMenu.vue`, `ChatApprovalToggle.vue` | Code | Chip + popover controls |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Code | Agent run form |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`, `TeamScopeConfigEditor.vue`, `TeamMemberConfigTree.vue`, `MemberOverrideItem.vue`, `MemberOverridesDisclosure.vue` | Code | Team run form and overrides |
| `autobyteus-web/components/workspace/config/AgentOrgRunConfigPanel.vue`, `AgentOrgRunConfigForm.vue`, `AgentOrgDirectAgentOverrideRow.vue` | Code | Org run form |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Code | Shared runtime + model + model-config field stack used by forms |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue`, `ModelConfigBasic.vue`, `ModelConfigAdvanced.vue` | Code | Thinking toggle + Advanced disclosure |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | Code | Existing/New workspace selector |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Code | Panel host + Run button |
| `autobyteus-web/localization/messages/en/workspace.ts:10` | Code | `workspace.agentOrg.runConfig.modelRequired` = "Select a model for {address} before launch." |

Base refresh check: between the initially read checkout (`63aac5939`) and the task base
(`26b555126`), relevant changes are limited to Org runtime-readiness/performance
(`RuntimeModelConfigFields.vue` +6/-?, `MemberOverrideItem.vue` 27 lines,
`AgentOrgRunConfigPanel.vue` 2 lines, plus tests). Layout/structure findings below are unaffected.

## Relevant Existing Behavior And Supported Product Paths

| Obs ID | Surface | Observation | Evidence |
| --- | --- | --- | --- |
| OBS-001 | Chat (new) | Four settings appear as one compact footer row of chips; detail only in popovers. Workspace chip + one faint footnote with path. | `ChatNewSurface.vue` footer slots; screenshot 02 |
| OBS-002 | Chat | Model and runtime are **one** control: model name primary, runtime secondary grey text; runtime chosen via drill-in submenu. | `ChatModelMenu.vue` |
| OBS-003 | Chat | Thinking is **one** control with a merged menu (e.g. Off / low / medium / high) and summary label. | `ChatThinkingControl.vue` (`menu.mode === 'merged'`) |
| OBS-004 | Agent run form | Each setting rendered as label + control + help text. Runtime is a separate native `<select>` placed first; model is a searchable custom select (different visual style). | `AgentRunConfigForm.vue`, `RuntimeModelConfigFields.vue` |
| OBS-005 | All forms | Thinking is split into a Thinking switch + description ("Use the model settings below…") + "Advanced" disclosure (Reasoning Effort, Fast mode). Advanced auto-opens when thinking is enabled, and always for existing runs. | `ModelConfigSection.vue` (`shouldDefaultAdvancedOpen`, `advancedInitiallyExpanded`); screenshot 01 |
| OBS-006 | All forms | Workspace = Existing/New segmented control + large card dropdown (emoji + "Default temporary workspace") + green confirmation line "Workspace: Temp Workspace" — four visual elements for one value. | `WorkspaceSelector.vue`; screenshots 03, 04 |
| OBS-007 | All forms | Read-only definition name (Agent/Team/Org) rendered as a disabled grey input row. | `AgentRunConfigForm.vue:3-8`, `TeamRunConfigForm.vue:3-6`, `AgentOrgRunConfigPanel.vue:5-8` |
| OBS-008 | All forms | Help text largely restates labels ("Selects the runtime backend used for this run", "Select a model…", "Runtime is fixed for this saved run"). Lock/status states use coloured banners (amber/emerald). | Same files |
| OBS-009 | All forms | Auto-approve implemented five ways: inline switch (agent form), `AutoApproveSwitch` (team root), inline switch (org panel), tri-state checkbox (member override), `ChatApprovalToggle` (chat). Inconsistent vertical spacing (`mt-8`, `mt-4`, `pt-4`). | Listed files |
| OBS-010 | Team / Org | Each member override (`MemberOverrideItem`) repeats nearly the full form: runtime select, model select, workspace, auto-approve checkbox, model config section. Count label "Member overrides (11)". | `MemberOverrideItem.vue`; screenshot 03 |
| OBS-011 | Org | Rows expose internals: `TEAM` badge, monospace raw addresses (`/product_team`), "Inherited" pill on every row. | `AgentOrgRunConfigForm.vue`, screenshot 03 |
| OBS-012 | Org | Root validation message renders the root address literally: "Select a model for / before launch." | `workspace.ts:10`; screenshot 03 |
| OBS-013 | Existing team run | Saved-run view shows fixed runtime/workspace as full disabled fields with explanation lines, plus full-width Save always visible. | screenshot 01; `ExistingRunConfigEditor.vue` |
| OBS-014 | Chat with team target | Chat composer already supports a team target (team chip) using only root-level settings; member customisation is referred to the Agent Teams page. | `ChatNewSurface.vue` team chip / `chat.new.teamNote` |

## Relevant Codebase And Technical Facts

- Two parallel component families for the same four concepts:
  - Chat family (`components/chat/*`): chip trigger + popover menu, compact.
  - Form family (`launch-config/RuntimeModelConfigFields.vue`, `workspace/config/ModelConfigSection.vue`,
    `WorkspaceSelector.vue`, per-surface auto-approve rows).
- Chat controls are largely presentational (`ChatModelMenu`: runtimeKind, llmModelIdentifier,
  modelLabel → `select`; `ChatThinkingControl`: schema, llmConfig → `update`), but
  `ChatWorkspaceMenu` takes a chat-draft workspace shape. Reuse in forms would need input adaptation (architecture-phase question).

## Product Design Request Context

- Requested by user: Yes (2026-10-04, "send a message to the product team to work on the UI").
- Purpose: `New Request`.
- Surfaces: Agent run config (new launch), Agent Team run config (new + existing run),
  Agent Org run config (new + existing run), incl. member/direct-agent overrides.
  Reference pattern: Chat composer footer controls.
- Solution Designer non-binding idea set shared with user (for Product context only, not approved):
  - A. Shared control vocabulary: same chip+popover controls as chat in all run panels; panel = title + four-row settings card + Run.
  - B. Existing-run view: fixed values collapse into one locked summary line; editable rows only; Save appears when dirty.
  - C. Team/Org overrides as "defaults + exceptions": compact member table (member | model | thinking | approve), inherited values muted, grouped by team, addresses only in tooltip, "N customized" count, per-row reset.
  - D. (Bigger product change) Run opens the chat composer targeted at the agent/team; member customisation behind "Customize members".
- Open user questions passed to Product: direction (A+B+C vs D); whether member overrides need workspace/runtime at all; final visual reference.

## Product Design Findings

Returned 2026-10-05 by `/product_team/product_ui_ux_designer`. Outcome: `Design Completed`,
user-approved.

- Artifacts: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/`
  - `ui-ux-spec.md`
  - `visual-references/VIS-001..011`
  - `product-ticket.md`
  - `review-round-1..30.md`
- Design repo: `personal` = `origin/personal` = `b8ce240`. Accepted base `b4f3ed1`. Source pin
  `10fb695`, re-checked against `02d6ddf`.
- User approval (2026-10-05): "Okay, I like this UI. It's now much cleaner right now. I'm satisfied
  now." The self-validation is in round 30, which added one behavior change: Agent "+" copies
  model, thinking and approval.
- Decisions:
  - DEC-001 = D: Run opens New chat.
  - DEC-002: overrides cover model+runtime, thinking and approval; a placed team adds workspace.
- Requirement impacts 1–8 are integrated into `requirements-doc.md` SR-002 (REQ-001..018).
- Open: "Stop run" vs "Terminate run" wording (DEC-003).
- Mocked boundaries in the reference:
  - launch, stop and save are scripted;
  - runtime catalogs and the AutoByteus Org structure are hand-written fixtures;
  - pre-existing fixture gaps F-001, F-003 and F-004.

## Source Facts Verified Against `origin/personal@02d6ddf` (2026-10-05)

The task worktree was fast-forwarded from `26b555126` to `02d6ddf05`.

| Fact ID | Fact | Evidence |
| --- | --- | --- |
| SF-001 | `ChatTarget` supports only `agent` and `team`; an Org target is new | `stores/chatDraftStore.ts:18-20` |
| SF-002 | Team New chat launches root-only, with `teamOverrides: {}` and `agentOverrides: {}` | `services/chat/chatTeamLaunchConfig.ts`, `chatLaunchService.ts:launchTeamChat` |
| SF-003 | Run buttons use `useRunActions.prepareAgentRun` / `prepareTeamRun` (`AgentList`, `AgentTeamList`, `AgentTeamDetail`) | `composables/useRunActions.ts` |
| SF-004 | Org Run navigates to `/workspace?rootSubjectKind=agent_org&definitionId=…&mode=configuration`; Org "+" adds `sourceOrgRunId` | `AgentOrgExperience.vue:457`, `AgentOrgWorkspaceView.vue:131`, `WorkspaceAdaptiveLayout.vue:86` |
| SF-005 | In New chat, the `@` menu is in target mode ("Chat with", switches target); in running chats it is in mentions mode | `ChatTargetMenu.vue:11,56`; `ChatNewSurface.vue:31` |
| SF-006 | Tree "+" (agent under workspace) opens a preset chat with workspace + agent | `useWorkspaceHistorySelectionActions.ts:122` |
| SF-007 | `RuntimeModelConfigFields` is also used by `MobileLaunchRuntimeModelCard` and `DefinitionLaunchPreferencesSection`, both out of scope, so it must be kept | grep of component imports |

## Supplemental Artifact Inventory

| Artifact | Purpose | Owner | Related IDs | Status | Approval applicability |
| --- | --- | --- | --- | --- | --- |
| `evidence/user-screenshots/*.png` | Current-state evidence from user | Solution Designer (copied from user) | OBS-001..013 | Final | Evidence only |
| `product-design-request.md` | Product handoff context | Solution Designer | SCN-001..005 | Sent | Not behavior-defining |
| Product UI/UX package `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/` (`ui-ux-spec.md`, VIS-001..042) | Target UI | Product UI/UX Designer (external) | REQ-001..022 | Final (design `origin/personal@6718986`) | User-confirmed: SR-001, SR-003 and SR-005 rounds (2026-10-05) |
| `product-design-request-r2.md`, `product-design-request-r3.md` | Product revision requests | Solution Designer | DEC-004, REQ-022 | Sent / returned | History |
| `design-review-report.md`, `architecture-review-revision-record.md` | ARCH-REV-001 | Architecture Reviewer (external to SD) | AR-001..004 | Fail (Design Impact) → addressed in SR-008 | — |

## Assumptions, Unknowns, And Risks

- UNK-001: Does any supported workflow need per-member **workspace** or **runtime** overrides? (Affects how much of the override UI survives.)
- UNK-002: Can chat target Agent Orgs today? (Only relevant if direction D is chosen.)
- UNK-003: Is launching without a first message a supported need? (Only relevant for D.)
- RISK-001: Existing-run editability rules (stopped vs active, REFRESH_REQUIRED, historical model config, AGY locked auto-approve) must be preserved in any redesign.

## Architecture Investigation Findings

- N/A — architecture phase not started (awaiting Product result and requirements approval).

## Requirement Implications

- Requirements remain Draft until the user accepts the Product UI result.

## Notes For Architecture Design

- Consider consolidating the two control families into one shared run-settings control set.
- Preserve existing-run lock semantics and validation (model required, schema invalid states).

## Product Design Findings — SR-003 Revision (returned 2026-10-05)

- Outcome: `Design Completed`, user-confirmed ("I'm currently satisfied with the UI now … Let's
  finalize now … the ticket is done.").
- Design `origin/personal` = `a5b0eec`.
- Spec: UXJ-001..009, UIS-001..005, TR-001..016, VIS-001..019.
- Delivered:
  - the Org launch page (UIS-004), at the existing `mode=configuration` route;
  - Orgs are never chat targets and never appear in `@`;
  - the DEC-003 stop wording;
  - Org-in-chat parts withdrawn.
- New user-driven impacts:
  - heading switcher (rounds 32/34);
  - the Org page outside the tool shell (round 33);
  - start-surface tools (round 35);
  - "Run" play-icon button (rounds 36–38).
- Open (no user answer): the route under Chat vs the existing one; a typed message on switch; the
  Org "entry point" idea (out of scope).
- UI reference behavior is now end to end: Org Run lands in the launched run; Team first and
  follow-up messages show. F-004 is resolved; F-001 and F-003 remain.

## Source Facts — 2026-10-05 (`origin/personal@fc79fad14`)

| Fact ID | Fact | Evidence |
| --- | --- | --- |
| SF-008 | New chat default model order: last chat model (`autobyteus.chat.lastModel`) → Daily Assistant `defaultLaunchConfig` → `DEFAULT_AGENT_RUNTIME_KIND` first model. The default workspace is temp; approval defaults to true. | `stores/chatDraftStore.ts:124-190` |
| SF-009 | A definition `defaultLaunchConfig` holds only runtime, model and model config; no workspace or approval | `types/launch/defaultLaunchConfig.ts` |
| SF-010 | The default agent's display name is now "Daily Assistant" (server data); there is no UI code change since pin `10fb695` | Product re-check; `git diff 02d6ddf05..fc79fad14 -- autobyteus-web` (13 files, comments/tests/docs/version) |

## Architecture Investigation — 2026-10-05 (post-approval, base `fc79fad14`)

Project design guideline applied: `DESIGN.md` (repo root) and `TESTING.md`. There is no closer guideline under `autobyteus-web/`.

| Fact ID | Fact | Evidence |
| --- | --- | --- |
| AF-001 | Run entry points today: `AgentList.runAgent` and `AgentTeamList`/`AgentTeamDetail` call `useRunActions.prepare*Run` → `/workspace` → `RunConfigPanel` pending branch. `AgentDetail.selectAgentToRun` calls `agentRunConfigStore.setTemplate` directly. Org: `AgentOrgExperience.openLaunch` → `/workspace?…mode=configuration` → `WorkspaceAdaptiveLayout` → `AgentOrgRunConfigPanel`. | listed files |
| AF-002 | "+" today: Agent `AgentWorkspaceView.startNewChatForRun` → `chatDraftStore.startNewChat({agentDefinitionId, workspaceRootPath})` (workspace only). Team `TeamWorkspaceView.createNewTeamRun` → `loadTeamRunLaunchSeed` → `teamRunConfigStore.setConfig(seed)` (old form). Org `AgentOrgWorkspaceView.openNewOrgRun` → configuration route + `sourceOrgRunId`. Tree "+" → `onCreateRun` → `startPresetChat`. | `components/workspace/{agent,team,org}/*WorkspaceView.vue`, `useWorkspaceHistorySelectionActions.ts:122` |
| AF-003 | `RunningAgentsPanel.vue` and `AgentLibraryPanel.vue` are not mounted by any product component (only specs and the e2e fixture `tests/e2e/fixtures/fresh-run-auto-approval.page.vue`). They are dead launch entry points. | grep for component names / Nuxt names |
| AF-004 | The Org launch orchestration lives inside the component `AgentOrgRunConfigPanel.vue` (~360 script lines): reference loading, `sourceOrgRunId` seed, projection, readiness (`canRun`), workspace creation, override serialization, `agentOrgRunStore.launch`, navigation. Draft state is in `stores/agentOrgRunConfigStore.ts` (`begin`, `beginFromSeed`, root fields, team/agent overrides, team workspace selections/operations, schema states, projection/launch errors). | files |
| AF-005 | Team New chat launch is root-only (`buildChatTeamLaunchConfig`: `teamOverrides: {}`, `agentOverrides: {}`) through `teamRunConfigStore.createDraft` + `agentTeamRunStore.sendMessageToFocusedMember` (`launchDraft`). `teamRunConfigStore.applyConfigEdit({kind:'set_agent_override'})` exists. | `services/chat/chatTeamLaunchConfig.ts`, `chatLaunchService.ts:149`, `stores/teamRunConfigStore.ts:187` |
| AF-006 | The member inheritance model is form-agnostic and reusable: `buildTeamMemberTreeFromDefinition`, `resolveTeamRunConfiguration(config, memberTree)` (effective config per address), `hasMeaningfulMemberOverride`, `projectEditableAgentOrgRunFormModel` (direct agents, mounted teams, children), and the override types `AgentConfigOverride` / `TeamScopeConfigOverride`. | `utils/editableTeamRunFormModel.ts`, `utils/teamRunLaunchHierarchy`, `utils/editableAgentOrgRunFormModel.ts`, `types/agent/TeamRunConfig.ts` |
| AF-007 | Saved-run editing state and policy are owned by `stores/existingRunConfigStore.ts`: canonical load per kind, `dirty`, `canSave`, `save`, `retryCanonicalRefresh`, `update*ModelConfig` (hierarchical cascade), `updateAgentOrgWorkspaceSelection` (placed-team workspace editable today). There is no discard action. Projections: `services/runConfigEditing/existing{Team,AgentOrg}RunFormModel.ts`. | file |
| AF-008 | Stop actions: Agent `agentRunStore.terminateRun(runId)`; Team `agentTeamRunStore.terminateTeamRun(teamRunId)`; Org `useWorkspaceHistorySubjectActions().execute({rootSubjectKind:'agent_org', rootRunId, action:'stop'})` → `agentOrgContextsStore.stopAndInspect`. | `WorkspaceAgentRunsTreePanel.vue:258-259,452`, `useWorkspaceHistorySubjectActions.ts:38` |
| AF-009 | First-message mentions: the Agent first send prepares the run (`PrepareAgentRun`), then posts through the standalone command coordinator, which admits mentions for eligible standalone runs. The frontend currently drops them (`agentRunStore.ts:171`). The Team first send launches, then sends over the team stream with `mentions`; the frontend currently drops them for drafts (`agentTeamRunStore.ts:283`). The server has team-root mention admission. No server contract change is expected; this needs API/E2E proof. | `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts:113-135`, `root-team-run.ts:255` |
| AF-010 | `@` today: New chat uses `ChatMessageInput` in target mode (`select-target`); running chats use `AgentUserInputTextArea` + `useRunMentionMenu` (server candidates per run root via `collaboratorCandidatesService`) + `ChatTargetMenu` `variant="run"` + the mention mirror. New chat candidates come from `useChatComposerOptions.targetOptions` (shared agents except Daily Assistant, plus shared teams). | files |
| AF-011 | Shared pieces with out-of-scope consumers are kept: `RuntimeModelConfigFields` (mobile, definition launch preferences), `ModelConfigSection/Basic/Advanced` and `HistoricalModelConfigFallback` (via `RuntimeModelConfigFields`, plus `CompactionModelSettings`). Applications have their own components. Used only by the removed forms: `WorkspaceSelector`, `FixedWorkspacePath`, `AutoApproveSwitch`, `MemberOverrideItem`, `MemberOverridesDisclosure`, `TeamMemberConfigTree`, `TeamScopeConfigEditor`, `AgentOrgDirectAgentOverrideRow`, `types/workspace/WorkspaceSelectorModel.ts`. | grep |
| AF-012 | **Capability gap.** The chat thinking control exposes only thinking keys (`getThinkingParamKeys`). The old forms (`ModelConfigAdvanced`) also expose non-thinking model parameters, e.g. Codex **Fast mode** (`service_tier`, `codex-app-server-model-normalizer.ts:55-66`); screenshot 01 shows it. After the forms are removed, no in-scope surface can set them at launch or on a saved run. | `components/chat/chatThinkingMenu.ts`, `utils/llmThinkingConfigAdapter.ts:295` |

## Architecture Review Follow-up Evidence (ARCH-REV-001, 2026-10-05)

| Fact ID | Fact | Evidence |
| --- | --- | --- |
| AF-013 | Server `@` eligibility:
- **Eligible agents:** `ownershipScope === 'shared'` and not built-in (`BUILT_IN_AGENT_DEFINITIONS`).
- **Eligible teams:** `ownershipScope === 'shared'`.
- **Excluded:** the root's own definition and every in-run placement (`inRunDefinitionIds`). `requireAdmissible` rejects with `alreadyInRun`/`invalid`. | `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-candidate-policy.ts:64,83-95,133-178` |
| AF-014 | Built-in agent ids: `autobyteus-daily-assistant`, `autobyteus-project-task-manager`, `autobyteus-retrospective-skill-improver`. They are bootstrapped as normal shared definitions with no frontend marker. The frontend knows only `DEFAULT_CHAT_AGENT_DEFINITION_ID`, so today's New chat target list already diverges for two built-ins. | `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts:5-7,25-35`; `autobyteus-web/utils/chat/chatDefaults.ts:4`; `useChatComposerOptions.ts:48-50` |
| AF-015 | Workspace tree "+" path: `useWorkspaceHistorySelectionActions.onCreateRun` → `WorkspaceAgentRunsTreePanel.startPresetChat` → `chatDraftStore.startNewChat(preset)` + `router.push('/chat')` | `WorkspaceAgentRunsTreePanel.vue:313-316` |
| AF-016 | Edit Config (⚙) for an agent run is emitted by the run header to `AgentWorkspaceView.openSelectedRunConfig` → `center.showConfig()`. Nothing gates it for `temp-*` contexts. | `AgentWorkspaceView.vue:9,79` |

## Code Review Follow-up Evidence (CRR-002, 2026-10-05)

| Fact ID | Fact | Evidence |
| --- | --- | --- |
| AF-017 | At base, the Agent run header "+" in `AgentWorkspaceView.startNewChatForRun` used `target.context.config`, the agent on screen. For an `@` collaborator child (`agent_run_task_agent` / `agent_run_task_team_member`) it opened New chat preset to the child's agent and workspace. Child contexts live in `agentRunCollaborationStore` (`childTargetFor`), not `agentContextsStore`. The implemented `copyAgentRun(runId)` looks up `agentContextsStore`, so it is a no-op for children. | `git show origin/personal:autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` (lines 69-77); `stores/agentRunCollaborationStore.ts:257-283`; `composables/runSettings/useRunStart.ts:47-58` (IR-001 `d45fe62bc`) |

## CRR-004 Follow-up Evidence (2026-10-05, head `c37b81de5`)

| Fact ID | Fact | Evidence |
| --- | --- | --- |
| AF-018 | Rendered-surface audit of Run/"+"/⚙: see design-spec SR-010 DI-001 table. New gap: `AppLeftPanel.startNewChat` and the Chat nav click call `chatDraftStore.startNewChat()` + router directly. `RemoteAgentCard.vue` has no importer. The Team header "+" copies the Team run for every member/collaborator view, as at base. | `AppLeftPanel.vue:61,169-177`; grep for `RemoteAgentCard`; `git show origin/personal:…/TeamWorkspaceView.vue` |
| AF-019 | Server mention admission unit tests pass at `c37b81de5`: `standalone-agent-run-root.test.ts`, `team-root-collaborators.test.ts`, `standalone-agent-run-lifecycle-service.test.ts` (43/43). Run with `npx vitest run … --no-watch` in `autobyteus-server-ts`. | local run 2026-10-05 |
| AF-020 | API/E2E live proof: N01–N03, 3/3 pass on a real server and the Claude Agent SDK runtime. N02 (Agent) and N03 (Team) admit first-message mentions. The N03 New chat `@` list matches the server policy (excludes the team, its members, the Org and the three built-ins). The web suite at `c37b81de5` has no new failures (11 baseline failing files). | `evidence/api-e2e/cross-scope-mentions-N/cross-scope-agent-mentions-evidence.json`; `evidence/api-e2e/web-suite.log`; `api-e2e-test-case-ledger.md` |
