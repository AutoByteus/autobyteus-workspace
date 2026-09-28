# Investigation Notes

## Investigation Meta

- Package identifier: `chat-interface-entry`
- Request / ticket: User request 2026-09-28 — add a Chat entry (New Chat) above Agents; chat is a wrapped single agent; default temp workspace, changeable; make runtime/model selection easy; Product Prototyper consultation requested before requirements are finalized.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry` / `codex/chat-interface-entry`
- Resolved base remote / branch / revision: `origin/personal` @ `fcd3e83a4ca931ba52ed19bd37b8df3050ee529e` (fetched 2026-09-28)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree and branch created from refreshed `origin/personal`; ticket folder `tickets/in-progress/chat-interface-entry/`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-007`
- Investigation status: Requirements approved (SR-003/SR-004); architecture investigation complete (AF-01–AF-22)

## Initial Request And Clarifications

- Original request (paraphrased, user's own terms preserved): When a user launches AutoByteus they see Agents, Agent Teams, Agent Orgs, Skills. The user's own workflow starts in a general chat: they use a wrapper agent (Daily Assistant or Codex from the imported agent package) to discuss, discover or update skills; after configuring and proving the skills, they convert that setup into a persistent Agent, Agent Team or even Agent Org. There is currently no chat interface. Proposal: on top of Agents, add another menu, e.g. "Chat", where the user can click "New chat". It is still one agent, but wrapped in a chat interface — as other products look. By default it uses the temp workspace and the user can change the workspace. The important question is how to make selecting runtime and model easier, because AutoByteus supports different runtimes and models. The user does not know what the UI should look like and wants to talk to Product Prototyper first to design the UI before the requirements become clear.
- Clarifications received: None yet.
- User-supplied facts and constraints:
  - Chat = one agent wrapped in a chat interface (not a new non-agent runtime).
  - Entry: a menu above Agents, with a "New chat" action.
  - Default workspace: temp workspace; user can change it.
  - Key design problem: easy runtime + model selection across multiple runtimes.
  - Product Prototyper consultation must precede requirement finalization.
- Initial ambiguity: which agent backs a chat; whether "convert chat into agent/team/org" is in scope; chat history placement; how chat relates to the existing workspace/run view.

## Product And Domain Understanding

- Product area: `autobyteus-web` shell navigation, run launch, run configuration (runtime/model/workspace), run conversation view.
- Affected actors: desktop/web AutoByteus user (primary: the product owner as a power user; secondary: new users expecting a chat-first product).
- Existing purpose: The product is definition-first — users pick an Agent/Team/Org definition, configure a run (runtime, model, workspace), then converse in the workspace view.
- Terminology: Agent definition; run; runtime kind (`autobyteus`, `codex_app_server`, `claude_agent_sdk`, `antigravity_cli`, `grok_build`); model identifier (runtime-scoped catalog grouped by provider); model config (e.g. thinking level); temp workspace (`temp_ws_default`).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-28 | User | Request + screenshot of current desktop app | Current UX | Left panel: Agents, Agent Teams, Agent Orgs, Applications; Workspaces tree with runs (e.g. Software Engineering Team members); center conversation; right tabs Files/Team/Terminal/Activity | None |
| 2026-09-28 | Code | `autobyteus-web/pages/index.vue` | Landing behavior | `/` redirects to `/agents` on desktop | Product decides whether landing changes |
| 2026-09-28 | Code | `autobyteus-web/composables/useShellPrimaryNavigation.ts` | Primary nav | Keys: agents, agentTeams, agentOrgs, applications, skills, memory, nodes, projects. No chat entry | Chat entry is new |
| 2026-09-28 | Code | `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Current runtime/model UX | Two-step: native `<select>` for runtime, then `SearchableGroupedSelect` for runtime-scoped models grouped by provider, then `ModelConfigSection` (thinking/advanced). Loading/error/unavailable states exist | Evidence of current selection friction |
| 2026-09-28 | Code | `autobyteus-web/composables/useRuntimeScopedModelSelection.ts`, `stores/runtimeAvailabilityStore.ts` | Runtime/model data | Runtime list comes from `runtimeAvailabilities` (enabled + reason); model catalog loaded per runtime; disabled runtimes hidden unless selected | Product must handle unavailable runtimes, per-runtime catalogs, load latency |
| 2026-09-28 | Code | `autobyteus-web/types/agent/AgentRunConfig.ts` | Run config fields | Run config: agentDefinitionId, runtimeKind (default `autobyteus`), llmModelIdentifier, llmConfig, workspaceId, autoExecuteTools, skillAccessMode, isLocked after first send | Runtime/model become locked after first message |
| 2026-09-28 | Code | `autobyteus-web/stores/agentDefinitionStore.ts`, `components/launch-config/DefinitionLaunchPreferencesSection.vue` | Existing defaults | Definitions carry optional `defaultLaunchConfig` (runtime/model/config). No global "last used" or default chat runtime/model setting found | Possible basis for remembered defaults |
| 2026-09-28 | Code | `autobyteus-web/components/workspace/config/WorkspaceSelector.vue`, `stores/workspace.ts` | Temp workspace | Temp workspace `temp_ws_default` exists; selector proposes it as default | Supports "temp workspace by default" |
| 2026-09-28 | Data | `/Users/normy/autobyteus_org/autobyteus-agents/agents/codex`, `.../daily-assistant` | Wrapper agents | `Codex`: minimal prompt "You are Codex", browser/media tools, skill `software-engineering-workflow-skill`, `defaultLaunchConfig: null`. `Daily Assistant`: general agent, bash/web/browser/media tools, skill `shell-first-operating-practice`, `defaultLaunchConfig: null` | These are user-package agents, not platform-owned |
| 2026-09-28 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/general-chat-entry/tickets/general-chat-entry/*` (branch `codex/general-chat-entry`) | Prior related work | A May 2026 "general-chat-entry" package implemented `/` → `/chat` launch composer, seeded `autobyteus-super-assistant`, `AUTOBYTEUS_DEFAULT_CHAT_AGENT_DEFINITION_ID` setting, first send navigates to `/workspace`. Delivery stayed on user-verification hold; never merged into `personal` (no `components/chat` on `origin/personal`); base has since moved from 1.2.96 to 1.4.91-beta.3 | Historical evidence only; not an approved basis for this request |
| 2026-09-28 | Code | `git worktree list`, `git branch -a` | Existing work | Only `codex/general-chat-entry` relates to chat entry | Recorded above |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Supported Product Behavior Path | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | App launch | `/` → `/agents` catalog | Definition-first landing; no chat entry | `pages/index.vue` | High |
| BEH-002 | User | Run an agent from catalog | Select definition → workspace with run config (runtime select, model select, model config, workspace selector) → first message creates backend run and locks config | Normal agent run with history, streaming, files/terminal/activity | `RuntimeModelConfigFields.vue`, `AgentRunConfig.ts` | High |
| BEH-003 | User | Choose runtime/model | Runtime dropdown (enabled runtimes) then model search grouped by provider for that runtime; advanced config section | Two-step, form-like; model list depends on runtime | `RuntimeModelConfigFields.vue`, `useRuntimeScopedModelSelection.ts` | High |
| BEH-004 | User | Workspace default | Workspace selector proposes temp workspace | Temp workspace usable without choosing a folder | `WorkspaceSelector.vue` | Medium |
| BEH-005 | User | Chat entry | No current supported behavior | — | Nav composable | High |
| BEH-006 | User | Convert chat setup into persistent Agent/Team/Org | No current supported behavior (user does this manually today) | — | grep for save/convert-as-agent: none | Medium |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `useShellPrimaryNavigation.ts` | Primary nav item list, routes, active state | Chat entry must be added above Agents | Route shape (`/chat`?) deferred |
| `RuntimeModelConfigFields.vue` | Shared runtime/model/model-config fields | Chat needs a lighter selection experience | Reuse data composables vs new UI |
| `useRuntimeScopedModelSelection.ts` | Runtime options, per-runtime model catalog loading | Any unified picker must respect per-runtime catalogs and availability | Cross-runtime aggregated catalog cost |
| `AgentRunConfig.isLocked` | Config locked after first send | Runtime/model switching mid-chat is not currently supported | Product must decide whether mid-chat change is expected |
| `temp_ws_default` | Temp workspace | Supports default workspace | — |
| Agent `defaultLaunchConfig` | Per-definition defaults | Could seed chat defaults | Global chat defaults / last-used memory TBD |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces
- Agent definitions (`agent.md`, `agent-config.json`) in imported packages; server settings.
- Evidence paths: `/Users/normy/autobyteus_org/autobyteus-agents/agents/*`.

### Structural Surfaces
- Web shell navigation, pages/routes, run launch stores (`agentRunStore`, `agentContextsStore`, `agentRunConfigStore`), runtime availability/model catalog GraphQL.
- Existing surfaces can likely support chat as a normal agent run.

### Potential Structural Impacts To Investigate
- API change: Unknown (possibly none if chat is a normal agent run).
- Persistence: Unknown (possibly a setting for default chat agent / last-used runtime+model).
- Security/privacy: None identified.
- Concurrency/lifecycle: Config lock after first send.
- Deployment/migration: None identified.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Implication | Evidence |
| --- | --- | --- | --- | --- |
| User screenshot | Current desktop app | No Chat entry; conversation view has heavy right panel (Files/Team/Terminal/Activity) | Chat surface simplification is a Product decision | User message 2026-09-28 |

## Stakeholder And User Evidence

| Source / Actor | Need | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Product owner (user) | Start work from a chat, experiment with skills, then promote stable setup to Agent/Team/Org | Strong (own workflow) | Chat is the primary entry; Agents/Teams/Orgs are the "graduation" targets | Is promote/convert in scope now? |
| Product owner (user) | Easy runtime+model selection | Strong | Core UX requirement | UI unknown — Product Design requested |
| Market convention (user statement) | Other products are chat-first | Medium | Chat should feel familiar | — |

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Runtime availability + per-runtime model catalogs | Server GraphQL | Runtimes can be disabled with a reason; catalogs load per runtime | `runtimeAvailabilityStore.ts` | Latency/unavailable states in a quick picker |

## Persisted Data And State Facts

- Affected subject: Possibly a new setting (default chat agent, remembered runtime/model). Existing run history unaffected.
- Remaining evidence gap: Depends on Product/user decisions.

## Product Design Request Context

- Product Design request in the current input: `Present`
- User's requested outcome, in the user's own terms: "I need to talk to product prototype, ask a product prototype to just... design some user interface, then I'm able to get it clear." Focus: a Chat menu above Agents with "New chat"; one agent wrapped in a chat interface; temp workspace by default and changeable; "how can we make selecting of the runtime and model easier".
- Requirement / behavior IDs involved: BEH-003, BEH-004, BEH-005, BEH-006; REQ-001..REQ-007 (Draft); DEC-001..DEC-007.
- Product decision / experience to understand: the Chat entry and New Chat experience, and above all an easy runtime + model selection experience across multiple runtimes; how chat relates to the existing agent run view and to the skills→agent graduation journey.
- Critical journey and states: SCN-001..SCN-004 in requirements doc.
- Known constraints and non-goals: Chat is still one normal agent run; Agents/Teams/Orgs flows preserved; no non-agent chat runtime.
- Relevant existing-product context: current runtime/model fields and runtime list above; wrapper agents Codex and Daily Assistant; user screenshot; prior unfinished `general-chat-entry` package and its `chat-start-ui-design.md` as historical reference.
- Product Design request artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/product-design-request-handoff.md`
- Established separate prototype repository/root and ticket: Not yet known.

## Product Design Findings

- Product Design package path: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/`
- Prototype source: `/Users/normy/autobyteus_org/autobyteus-web-prototype` branch `personal` @ `1579886` (ticket result `27f9b74`, base `5ae0fe1`, source pin `origin/personal@fcd3e83a4`); verified `origin/personal` = `1579886e126f` on 2026-09-28.
- Approved UI/UX spec: `…/ui-ux-spec.md` (Status Approved)
- Review URL: run canonical repo, open `/chat` (runbook)
- User-confirmation reference: user message 2026-09-28, final consistency pass PC-035
- Journeys validated: UXJ-001–UXJ-011; validation script 30/30, 0 browser errors (1 pre-existing baseline upload error)
- Final visual references: VIS-001–VIS-025; Solution Designer verified SHA-256 of all 25 files against `manifest.json` (25/25 match), and viewed VIS-001/VIS-002.
- Product decisions: DEC-001, 002, 003, 004, 006, 007 resolved; new: skill tagging, `@` addressing, team quick path, auto-approve default, unified message box, New chat pencil, status vocabulary.
- Open: OPEN-001 (thinking schema), OPEN-002 (landing), OPEN-003 (Daily Assistant provisioning), OPEN-004 (Recent persistence), OPEN-005 (instruction wording), DEC-008.
- Mocked boundaries: chat state/streaming, Recent pairs local, team stand-in run, run-view model changes local, chat attachments object URLs, voice simulated.
- Requirements sections affected: all (SR-002).

### Follow-up technical evidence (2026-09-28)

| Source | Finding | Implication |
| --- | --- | --- |
| `autobyteus-ts/src/agent/context/skill-access-mode.ts` | `SkillAccessMode` = `PRELOADED_ONLY` / `NONE` only | "All installed skills" for Daily Assistant is new behavior (DEC-010) |
| `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts` | Skills resolved per agent from `skillNames` (global/team_shared/agent-local origins, provenance checks) | Needs an all-installed resolution path or seeded list maintenance |
| `autobyteus-server-ts/src/run-history/domain/run-model-config.ts` (+ team/org run managers) | `runModelConfigEditability` exists server-side | REQ-011 reuses an existing contract |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Thinking config adapter exists | Schema-driven thinking control (DEC-009) is feasible |
| Main checkout hygiene (user question 2026-09-28) | Stray tickets/done edits in shared checkout came from a reopened ticket written in place | Separate workflow-rule candidate; not in this scope |

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/ui-ux-spec.md` (R2) | Product Prototyper | Normative UI/UX spec | Chat entry, Chat box, menus, chat view | REQ-001–REQ-020 | Approved R2 | User-confirmed R1 (PC-035) + R2 2026-09-28 |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/visual-references/` + `manifest.json` | Product Prototyper | Normative visuals VIS-001–025 (VIS-020 superseded) | Same | REQ-018 | Approved R2 | Same; 24/24 SHA-256 verified |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/ui-behavior-test-matrix.md` | Product Prototyper | Behavior checks | Validation input | ACs | Supporting | Same package |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/product-design-request-handoff.md` | Solution Designer | SR-001 Product request | History | — | Historical | Not behavior-defining |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/product-design-revision-request-handoff.md` | Solution Designer | SR-003 Chat-box correction request | History | — | Historical | Not behavior-defining |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md` | Architecture Reviewer | ARCH-REV-001 (Fail, Design Impact) | Design SR-005 | — | Addressed by SR-006 | Review artifact |
| Removed: `general-chat-entry` worktree/branch | — | Prior unfinished attempt | — | — | Deleted 2026-09-28 (DEC-008) | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Which agent backs a new chat (user-chosen, configurable default, platform-seeded) | Wrapper agents live in user packages, not the platform | User + Product | Open |
| UNK-002 | Unknown | Whether runtime/model may change mid-chat (config currently locks after first send) | Affects picker placement and feasibility | User + Product; architecture to verify | Open |
| UNK-003 | Unknown | Whether "convert chat into Agent/Team/Org" is part of this ticket | Scope size | User | Open |
| RSK-001 | Risk | Cross-runtime unified model picker requires loading multiple catalogs | Latency/UX | Architecture | Open |
| RSK-002 | Risk | Overlap with unfinished `codex/general-chat-entry` branch | Duplicate/conflicting direction | User: remove; worktree + local branch deleted 2026-09-28 (was `11865cf85`, local-only) | Closed |

## Architecture Investigation Findings

Investigated 2026-09-28 on `origin/personal@fcd3e83a4` (worktree `codex/chat-interface-entry`) plus the approved prototype diff `autobyteus-web-prototype` `5ae0fe1..8ac6cad`.

| ID | Source | Observation | Design implication |
| --- | --- | --- | --- |
| AF-01 | `autobyteus-web/pages/index.vue` | Desktop `/` → `/agents`; mobile runtime renders `MobileRemoteAccessShell` | Desktop landing → `/chat`; mobile branch unchanged |
| AF-02 | `composables/useShellPrimaryNavigation.ts`, `components/AppLeftPanel.vue` | Nav item list + route/active resolvers; Agents item hosts the collapse button (`item.key === 'agents'`); tree `run-selected`/`run-created` → `pushRoute('/workspace')` | Add `chat` key first; collapse button moves to first item; single-agent selection routes to `/chat?id=` |
| AF-03 | `components/layout/WorkspaceAdaptiveLayout.vue` | Center pane switches by selection (`AgentOrgRunConfigPanel`/`AgentOrgWorkspaceView`/`RunConfigPanel`/`AgentWorkspaceView`/`TeamWorkspaceView`); owns right panel dock/strip/drawer | Chat view needs the same right-side shell; standalone agent branch replaced |
| AF-04 | `components/workspace/agent/AgentWorkspaceView.vue` (only used by WorkspaceAdaptiveLayout) and `AgentWorkspaceSurface.vue` (also used by `AgentOrgWorkspaceView.vue`) | Standalone-agent view = surface + header actions (new agent, gear) | `AgentWorkspaceView.vue` becomes obsolete (Option B); `AgentWorkspaceSurface` stays for org |
| AF-05 | `components/workspace/agent/AgentEventMonitor.vue` | Conversation feed + `AgentUserInputForm` (hard-wired) + `composerContext` slot | Add composer slot so chat supplies its composer; team/org keep default |
| AF-06 | `components/agentInput/AgentUserInputForm.vue`, `AgentUserInputTextArea.vue`, `ContextFilePathInputArea.vue` | Box = rounded card + ContextFilePathInputArea + textarea with mic/send absolutely positioned; both components read `activeContextStore.activeAgentContext` directly; attachments via generic `useContextAttachmentComposer` target {key, subject, attachments, draftOwner} | Chat box must reuse these with an explicit composer target (New chat has no active context); send button moves into chat footer (R2) |
| AF-07 | `stores/agentContextsStore.ts` `createRunFromTemplate`; `stores/runHistoryReadModel.ts` | `temp-*` contexts in `agentContextsStore.runs` project as `draft` rows in the Workspaces tree | New chat draft must not be registered until send (TR-001/TR-002) |
| AF-08 | `stores/agentRunStore.ts` `sendUserInputAndSubscribe` | First send: temp context → `PrepareAgentRun` (definition, workspace, model, autoExecuteTools, llmConfig, skillAccessMode, runtimeKind, initialSummary) → `promoteTemporaryId` → finalize draft attachments `agent_draft(tempId)` → WS `SEND_MESSAGE` | Chat launch reuses it unchanged by registering a prepared temp context |
| AF-09 | `autobyteus-server-ts/src/context-files/*`, `api/rest/context-files.ts` | Draft uploads keyed only by `draftRunId` (no run required); finalize allows `agent_draft` → any non-org final owner | New chat can upload under `agent_draft(<chat temp id>)` before a run exists; team quick path can finalize `agent_draft` → `team_member_final` |
| AF-10 | `stores/agentTeamRunStore.ts` `sendMessageToFocusedMember`, `stores/teamRunConfigStore.ts` `createDraft`, `types/agent/TeamRunConfig.ts` | Team draft launch + first message to focused member; `rootConfig` (runtime, workspace, model, llmConfig, autoExecuteTools, skillAccessMode) with empty overrides = uniform config; draft owner derived internally as `team_member_draft(draftId, member)` | Team quick path = draft with root config only, focused coordinator; needs explicit attachment source owner |
| AF-11 | `stores/existingRunConfigStore.ts`, `ExistingRunConfigEditor.vue`; server `run-history/domain/run-model-config.ts` | Existing-run model edit: `loadAgentCanonical` → `updateAgentModelConfig` → `save()`; editable only when not active (`runModelConfigEditability`) | Chat footer model/thinking for existing runs reuses this owner |
| AF-12 | `composables/useRuntimeScopedModelSelection.ts`, `stores/llmProviderConfig.ts`, `stores/runtimeAvailabilityStore.ts`, `utils/llmThinkingConfigAdapter.ts` | Per-runtime catalogs cached in `llmProviderConfig`; availability with reasons; thinking adapter derives toggle/params from model schema | Model menu + thinking control reuse these; cross-runtime search loads enabled catalogs (RSK-001) |
| AF-13 | `AgentStreamingService.sendMessage`, server `agent-stream-handler.ts handleSendMessage` | WS payload {content, context_file_paths, image_urls, message_id, dedupe_key}; content passed through to runtime | Skill instruction can be carried in content with no protocol change |
| AF-14 | server `run-history/projection/providers/{local-memory,codex,claude}-run-view-projection-provider.ts` | History user-message text comes from runtime-native histories | Chips on reload must be recovered from content text by a parser |
| AF-15 | `components/conversation/UserMessage.vue` | Renders `message.text` + attachments; used by `AgentConversationFeed` | Single place to render skill chips from parsed content |
| AF-16 | `autobyteus-server-ts/src/built-in-agents/*` | Registry (memory-compactor, retrospective-skill-improver) + bootstrapper that **overwrites** `agent.md`/`agent-config.json` and mirrors `skills/` from templates on every startup into the default agents dir (`getAgentsDir()`, shown as package "Built-in Storage") | Daily Assistant fits the registry but needs a seed-if-missing policy so user edits persist (DEC-010 "configurable") |
| AF-17 | `autobyteus-ts/src/agent/system-prompt/append-configured-skills-catalog.ts`; Codex/Claude/AGY bootstrappers; `skills/services/skill-service.ts`, `configured-agent-skill-resolver.ts` | Skills are per-definition `skillNames`; AutoByteus runtime injects a name+description+path catalog (lazy read of SKILL.md); Codex/Claude materialize configured skills into the workspace; AGY uses detailed resolution; `listSkills()` returns installed skills with `isDisabled` | "All installed skills" = definition-level scope expanded by SkillService; consumers of `skillNames.length` must use the effective list |
| AF-18 | web `components/agents/AgentDefinitionForm.vue`, `AgentCard.vue`, `AgentDefinitionDetailSections.vue`, `AgentDetail.vue`; GraphQL `api/graphql/types/agent-definition.ts` | Skills shown/edited as `skillNames` list | Scope must be visible/editable for Daily Assistant to be "configurable" |
| AF-19 | `services/workspace/workspaceNavigationService.ts` | `buildWorkspaceExecutionRoute` builds `/workspace?workspaceExecutionKind=agent…`; `openAgentRun({runId})` opens an agent run by id | Agent execution links move to `/chat?id=`; chat page opens unknown ids via `openAgentRun` |
| AF-20 | `composables/useRightPanel.ts` | Single global right-panel visibility preference (default visible) | Chat needs its own default-collapsed visibility scope |
| AF-21 | Prototype diff `5ae0fe1..8ac6cad` | Prototype-only chat store/fixtures; real product edits limited to AppLeftPanel, tree panel, nav, index, i18n | Production must replace prototype-native state with real run/team/skill/catalog owners |
| AF-22 | `stores/workspace.ts` | `createWorkspace({root_path})`, temp workspace `temp_ws_default` | Folder picker reuses workspace creation |
| AF-23 | `components/workspace/config/RunConfigPanel.vue` L379; `stores/agentContextsStore.ts` `promoteTemporaryId` L150–163 | Catalog "Run agent" registers + selects a `temp-*` context; promotion re-keys the context and moves the selection (`selectRunWithoutShellNavigation`) with no route change | Route sync across promotion needs an owner (ARCH-REV-001 AR-001) |
| AF-24 | `stores/agentRunStore.ts` catch path; `services/runSubmission/localUserSubmission.ts` `failLocalSubmission` | A failed first send cancels the prepared run, marks Error and appends an error message to the conversation. The draft text is not restored (existing behavior) | A failed chat launch should land on the chat view of that context, where the existing error is visible and the user can resend |
| AF-25 | `stores/voiceInputStore.ts` L233–244, `toggleRecording` L511 | Composer recordings capture `useActiveContextStore().activeAgentContext` as the transcript target | Voice must take an explicit target context (AR-004) |
| AF-26 | server `skills/services/skill-discovery.ts` `getBundledSkillDirectoriesFromDefinitionRoot`; `configured-agent-skill-resolver.ts` `assertDetailedCandidateProvenance`; `SkillService.listSkills` / `getGlobalSkill` | `listSkills()` = global skill dirs, then bundled skills under each definition root (`agents/<a>/skills/<n>`, `agent-teams/<t>/agents/<a>/skills/<n>`, `agent-teams/<t>/skills/<n>`), de-duplicated by name (first wins). `getGlobalSkill` searches global dirs only. AGY provenance accepts `agent_private` (trusted root = agent dir, or team dir for team-nested agents) and `team_shared` (trusted root = team dir) layouts | ALL_INSTALLED bindings must be built from catalog records with real roots/origins, not re-resolved by name (AR-003) |
| AF-27 | `stores/agentRunStore.ts` L148/L166/L174 | `initialSummary` = the sent requirement; `PrepareAgentRun.agentDefinitionId` = `state.conversation.agentDefinitionId` | Summary must use the user's text (AR-005); target switch must update both definition ids |
| AF-28 | `services/runOpen/agentRunOpenCoordinator.ts` L63; `services/runHydration/runContextHydrationService.ts` L165 | A reopened persisted run gets `config.isLocked = resumeConfig.isActive`, so Offline reopened runs have `isLocked === false`. A run terminated in-session keeps `true` | The footer mode must be keyed on run identity (`temp-*` vs permanent), not on `isLocked` (ARCH-REV-002) |

Migration convention check: persisted changes are limited to an additive optional agent-config field (`skillScope`), a new built-in agent folder, and a browser-local preference. No stored data requires transformation; `autobyteus-server-ts/docs/design/data_migration_guideline.md` is not triggered (no migration designed).

## Requirement Implications

- Chat is new behavior (BEH-005). The runtime/model selection UX is the central open product decision and is explicitly delegated to Product Design consultation.

## Notes For Architecture Design

- Reuse `useRuntimeScopedModelSelection` data semantics; respect `isLocked`; temp workspace default exists.
