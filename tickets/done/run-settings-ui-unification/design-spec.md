# Design Spec — run-settings-ui-unification

## Solution And Approval Basis

- Current solution revision ID: `SR-010` (design revision after CRR-004 DI-001..DI-006; earlier SR-009 after CRR-002, SR-008 after ARCH-REV-001; requirements basis unchanged at SR-006)
- Approved requirements baseline: `requirements-doc.md` SR-006.
  - User approval on 2026-10-05: "I think it's like now the requirement is clear, right? You can go ahead now."
  - Plus the user-directed REQ-022 (Fast mode) and the delegated defaults (REQ-021, DEC-005, DEC-006).
- Behavior-defining supplement: Product `ui-ux-spec.md` (UXJ-001..010, UIS-001..005, TR-001..017),
  `VIS-001..042`, design repo `/Users/normy/autobyteus_org/autobyteus-web-design` `origin/personal@6718986`.
  The user confirmed it on 2026-10-05 in three rounds (SR-001, SR-003, SR-005).
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md`. Architecture facts are AF-001..AF-012;
  source facts are SF-001..SF-010.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification`, branch
  `codex/run-settings-ui-unification`, base `origin/personal@19dee40b3`, finalization target `personal`.

## Current-State Read

Today three launch forms and one panel own "how a run starts":

- **Agent/Team Run:** `useRunActions.prepare*Run` (or `agentRunConfigStore.setTemplate` in `AgentDetail`)
  seeds `agentRunConfigStore`/`teamRunConfigStore`. The route goes to `/workspace`, where the pending
  branch of `RunConfigPanel` shows `AgentRunConfigForm`/`TeamRunConfigForm` and its own Run button
  (AF-001).
- **Org Run:** the route goes to `/workspace?…mode=configuration`. `WorkspaceAdaptiveLayout` shows
  `AgentOrgRunConfigPanel`, a component holding the whole Org launch orchestration: references, seed,
  projection, readiness, workspace creation, serialization, launch and navigation. Its draft state is
  in `agentOrgRunConfigStore` (AF-004).
- **New chat:** `ChatNewSurface` with `chatDraftStore` and `chatLaunchService`.
  - It starts Agents (`launchAgentChat`).
  - It starts Teams root-only, without member overrides (`launchTeamChat`; AF-005).
  - `@` switches the target (AF-010).
- **"+":** this varies by kind. The Agent copy has only the workspace; the Team copy goes through
  `teamRunConfigStore.setConfig(seed)` into the old form; the Org copy goes to the configuration
  route with `sourceOrgRunId` (AF-002).
- **Saved runs (Edit Config):** `RunConfigPanel` selection mode → `ExistingRunConfigEditor`, which
  wraps the same three forms in existing mode. The state and policy are owned by
  `existingRunConfigStore` (AF-007).
- **Two control families exist for the same four settings:** the chat chips (`components/chat/*`) and
  the form fields (`launch-config/RuntimeModelConfigFields`, `ModelConfigSection`, `WorkspaceSelector`,
  five auto-approve variants).
- **Healthy owners to keep:**
  - `existingRunConfigStore` (saved-run editing);
  - `chatDraftStore` + `chatLaunchService` (chat launch);
  - `teamRunConfigStore` (Team launch drafts; also mobile);
  - `agentOrgRunStore` (Org launch mutation);
  - the inheritance model (`buildTeamMemberTreeFromDefinition`, `resolveTeamRunConfiguration`,
    `hasMeaningfulMemberOverride`, Org placement helpers) (AF-006);
  - the server contracts. No server change is planned (AF-009).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence:
  - About 30 production files are added or changed and about 20 production files are removed (plus
    their specs) in `autobyteus-web` (see Target Folder/File Mapping and the Removal Plan).
  - New surfaces: the Org launch page, the member drawer, the heading switcher, start-surface tools,
    the saved-run settings view, and other-model-setting controls.
  - Launch paths change for Agent, Team and Org.
  - Every Run/"+" entry point is rewired, including the routes they navigate to.
- Architectural risk: `High`
- Risk rationale and supporting evidence:
  - **Route and ownership-boundary changes:** Run moves from `/workspace` forms to `/chat`. The Org
    `mode=configuration` route renders a new page outside `WorkspaceAdaptiveLayout`.
  - **Org launch orchestration moves out of a component** into a store and a service (AF-004).
  - **The chat draft gains Team member overrides** that must reach `TeamRunConfig` (AF-005).
  - **First-message mentions** depend on server admission semantics, verified only by code reading
    so far (AF-009).
  - **Large blast radius:** many specs and the localization audit change.
  - There is no persistence or server contract change.
- Escalation trigger: return a `Design Impact` before continuing if implementation finds any of
  these:
  - a server API/GraphQL change is needed (Org launch inputs, first-message mentions, Team overrides);
  - mobile or Applications behavior must change;
  - a removed component has a product consumer not listed here.

## Architecture Investigation Evidence

- Project design guideline applied: `DESIGN.md` (repo root) and `TESTING.md`. There is no closer
  guideline. No conflicts were found. The design follows "remove unnecessary work / delete before
  adding" and "no speculative machinery".
- Guideline conflicts or discrepancies: none.

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Entry-point read | AF-001, AF-002 | Run/"+" are spread over stores, routes and forms | One start API `useRunStart` owns all Run/"+"/switch intents | — |
| Org panel read | AF-004 | Orchestration lives in a view component | Move draft lifecycle into `agentOrgLaunchDraftStore` and side effects into `agentOrgLaunchService` | — |
| Team chat launch | AF-005 | Root-only config; `set_agent_override` edit exists | `buildChatTeamLaunchConfig` takes `agentOverrides` from the chat draft | — |
| Inheritance helpers | AF-006 | Form-agnostic resolution exists | Member tree projection reuses it; the form-model projections are removed | — |
| Saved-run store | AF-007 | Owns dirty/canSave/save/refresh/cascade; no discard | Extend with `discardChanges`, `reloadCanonical`; replace the view only | — |
| Stop actions | AF-008 | Per-kind store actions exist | `useRunStopAction` calls the same actions | — |
| Mentions | AF-009, AF-010 | Server admits mentions for standalone and team roots; the frontend drops them on first send | Pass mentions on the first send; shared mention menu | Needs API/E2E proof |
| Dead panels | AF-003 | `RunningAgentsPanel`/`AgentLibraryPanel` are unmounted | Remove | — |
| Shared consumers | AF-011 | `RuntimeModelConfigFields`/`ModelConfigSection*` are used by mobile, definition prefs and compaction | Keep them; remove form-only pieces | — |
| Fast mode gap | AF-012 | The Thinking menu shows thinking keys only | New `chatModelOptions` + `ChatModelOptionControl` (REQ-022) | Numeric non-thinking params are not presented (none today) |
| Product UI reference | design repo `6718986` diff vs `b4f3ed1` | A runnable prototype exists; it is explicitly non-prescriptive (stubs, fixtures, an Org store bypassing production readiness) | Reuse presentation ideas; production owners are defined here | — |

## Intended Change

- Make New chat the only Agent/Team start surface and the Org launch page the only Org start
  surface.
- Both start surfaces use the chat controls, the heading switcher, the members line + drawer, and the
  start-surface tools icon.
- Redraw saved-run settings in the same vocabulary.
- Make `@` a collaborator-only mention everywhere.
- Add other-model-setting controls (Fast mode).
- Delete the old launch forms and every path that existed only for them.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / ACs | Approved Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 005, 006, 008, 021; AC-001, 002, 018 | Agents list/detail → Run | AF-001 | New chat for the agent with definition defaults; the first message starts the run | DS-001 |
| BEH-002 | User | REQ-002, 005, 006, 009, 010, 021; AC-001, 002, 004, 005, 006 | Agent Teams list/detail → Run | AF-001, AF-005 | New chat for the team + members line/drawer; the launch applies agent overrides | DS-001, DS-008 |
| BEH-003 | User | REQ-002, 003, 005, 006, 007, 009, 010, 021; AC-001, 002, 003, 013 | Agent Orgs → Run; Org "+"; switcher | AF-004 | Org launch page; Run (no message, no recipient) → launched Org view | DS-002, DS-008 |
| BEH-004 | User | REQ-004, 014–017; AC-009, 010, 011 | Workspace run → Edit Config | AF-007, AF-008 | Saved-run settings view; stop; discard; save | DS-004 |
| BEH-005 | User | REQ-001, 017; AC-014 | All controls | chat family | Chat controls reused everywhere; the model menu gains `runtimeLocked` | DS-001..004 |
| BEH-006 | User | REQ-011, 012; AC-007 | `@` in any composer | AF-009, AF-010 | Mention-only, Agents/Teams only, current target excluded; first message keeps mentions | DS-006 |
| BEH-007 | User | REQ-013; AC-008 | "+" on a run | AF-002 | Agent/Team → New chat prefilled; Org → Org page prefilled | DS-003 |
| BEH-008 | User | REQ-018; AC-012 | — | — | Removed lines and forms | Removal Plan |
| BEH-009 | User | REQ-022; AC-019 | Model with other settings | AF-012 | Chip/row per other setting | DS-001..004 (model-options concern) |
| (REQ-019) | User | AC-016 | Heading click | — | Switch Agent/Team/Org carrying settings | DS-005 |
| (REQ-020) | User | AC-017 | "Show tools" | — | Start-surface tools | DS-007 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/ui-ux-spec.md` | Normative UI/UX | REQ-001..022 | Visual and interaction authority; this design defines production owners | User-approved |
| `…/visual-references/VIS-001..042` | Visual baseline | AC-014, AC-019 | Implementation must match within the Fidelity Boundary | User-approved |
| Design repo `6718986` source (`components/run-settings/*`, `stores/orgLaunchDraftStore.ts`, `composables/runSettings/*`, `components/chat/chatModelOptions.ts`) | Runnable reference | — | Presentation reference only. It is not an owner blueprint: it bypasses production Org readiness and stubs launches. | Reference |
| `evidence/user-screenshots/*` | Pre-change state | BEH-* | Current-state evidence | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (a behavior change plus a UI replacement).
- Current design issue found: `Yes`.
- Root cause classification:
  - `Duplicated Policy Or Coordination`: two control families, five approval variants, and three
    launch forms repeating member override UIs.
  - `Boundary Or Ownership Issue`: Org launch orchestration lives inside a view component (AF-004).
  - Start intent is scattered across `useRunActions`, `AgentDetail`, two dead panels and per-view
    "+" handlers.
- Refactor needed now: `Yes`.
- Evidence: AF-001..AF-008, AF-011.
- Design response:
  1. One start API (`useRunStart`) for every Run, "+" and switch intent.
  2. Two draft owners only: `chatDraftStore` (Agent/Team) and `agentOrgLaunchDraftStore` (Org). They
     share `RunWorkspaceChoice` and the override types.
  3. Org launch side effects are moved into `agentOrgLaunchService`.
  4. One run-settings component vocabulary (`components/run-settings/*`) built on the chat controls,
     used by New chat, the Org page and saved runs.
  5. The saved-run view is replaced while `existingRunConfigStore` stays the owner.
  6. All form-only components, types and projections are deleted.
- Refactor rationale: adding the new surfaces beside the old forms would leave two
  configuration surfaces and two control families authoritative. Removal is part of the requirement
  (REQ-018).
- Intentional deferrals and residual risk:
  - Numeric non-thinking model params are not presented. None exist today; a stored value is kept.
  - The tree's "Terminate run"/"Stop Agent Org" wording mismatch is untouched (out of scope by DEC-003).

## Terminology

- **Start surface:** New chat (`/chat` without a run id) or the Org launch page (`/workspace?…mode=configuration`).
- **Run settings:** workspace, tool approval, model + runtime, thinking, and other model settings.
- **Other model setting:** a config-schema parameter of the selected model that is not a thinking key
  (`getThinkingParamKeys`) and is an enum or boolean, for example `service_tier`.
- **Member override:** `AgentConfigOverride` (Team member, Org direct agent, Org placed-team member) or
  `TeamScopeConfigOverride` (Org placed team; it adds a workspace).
- **RunWorkspaceChoice:** `{ kind: 'existing'; workspaceId } | { kind: 'folder'; rootPath }`. This is
  today's `ChatDraftWorkspace`, renamed and moved.

## Design Reading Order

Spines (DS-001..008) → ownership → removal → files. The tables below follow the template order.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Every form, route branch, composable and type that exists only for the old launch forms is deleted
  in this change (Removal Plan).
- Nothing keeps the old forms reachable: there is no flag and no dual path.
- `agentRunConfigStore`/`teamRunConfigStore` remain because mobile and the Team chat launch use them.
  Their desktop form-only callers are removed.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject:
  - two new browser `localStorage` keys: `autobyteus.chat.memberPanelWidth` (number) and
    `autobyteus.chat.startToolsOpen` (`'1'`/`'0'`);
  - the existing `autobyteus.chat.lastModel` is read by the Org page fallback.
- Server-side run configs: shapes unchanged. `service_tier` is already a valid `llmConfig` key.
- Decision: `Not Affected` for server data. For the new local keys, a missing or invalid value falls
  back to the default (width 400 px clamped; tools closed).
- Rationale: no stored shape changes; reads are tolerant and the values are disposable preferences.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002, 005, 009 | Agent/Team Run button | Run view with first message | `chatDraftStore` (draft) → `chatLaunchService` (launch) | The only Agent/Team start path |
| DS-002 | Primary End-to-End | BEH-003 | Org Run / Org "+" / switcher | Launched Org run view | `agentOrgLaunchDraftStore` (draft) → `agentOrgLaunchService` (launch) | The only Org start path; moves orchestration out of the view |
| DS-003 | Primary End-to-End | BEH-007 | "+" in a run view header | Prefilled start surface | `useRunStart` | Copy semantics per kind |
| DS-004 | Primary End-to-End | BEH-004 | Edit Config | Saved / stopped run | `existingRunConfigStore` | Saved-run edit + stop + discard |
| DS-005 | Bounded Local | REQ-019 | Heading switcher choice | Retargeted draft / Org page | `useRunStart.switchTarget` | Carry rules between the two draft owners |
| DS-006 | Primary End-to-End | BEH-006 | `@` in a composer | Mention admitted by the server | `useComposerMentionMenu` → run stores | Mention-only `@`; first-message mentions |
| DS-007 | Bounded Local | REQ-020 | "Show tools" | Docked or drawer tools on the chosen workspace | `useStartSurfaceTools` + `WorkspaceToolShell` | Tools on start surfaces |
| DS-008 | Bounded Local | BEH-002, 003 | Members line | Override stored in the draft | Draft owner (chat or Org) + `runMemberTree` projection | Member customization |

## Primary Execution Spine(s)

- DS-001: `Run button → useRunStart.runAgent|runTeam → chatDraftStore.startForDefinition → /chat (ChatNewSurface) → Send → chatLaunchService.launchAgentChat|launchTeamChat → agentRunStore | teamRunConfigStore.createDraft + agentTeamRunStore.sendMessageToFocusedMember → server → run view`
- DS-002: `Org Run/"+"/switch → useRunStart.runOrg|copyOrgRun|switchTarget → agentOrgLaunchDraftStore.start → /workspace?…mode=configuration (pages/workspace.vue → OrgLaunchPage) → Run → agentOrgLaunchDraftStore.launch → agentOrgLaunchService.launch → agentOrgRunStore.launch → server → /workspace?…mode=active`
- DS-003: `Run header "+" → useRunStart.copyAgentFromConfig(displayed config)|copyTeamRun|copyOrgRun → (displayed AgentRunConfig | loadTeamRunLaunchSeed | Org seed via store) → draft owner start(copied) → start surface`
- DS-004: `Edit Config → RunConfigPanel → ExistingRunConfigEditor (container) → ExistingRunSettings (view) → existingRunConfigStore.update*/save/discardChanges | useRunStopAction → run stores → existingRunConfigStore.reloadCanonical`
- DS-006: `Composer textarea @ → useComposerMentionMenu(candidates) → context.requestedMentions → first send: agentRunStore.sendUserInputAndSubscribe | agentTeamRunStore.sendMessageToFocusedMember({mentions}) → server mention admission`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Run asks `useRunStart` for a fresh chat draft addressed to the definition, preselected per REQ-021. The user edits the four settings, other settings and member overrides in New chat. Send hands the draft to `chatLaunchService`. For a Team it builds a `TeamRunConfig` with the draft's `agentOverrides`, creates the Team launch draft and sends the first message with its mentions. | ChatDraft, TeamRunConfig | `chatDraftStore`, `chatLaunchService` | default-model resolution, workspace resolution, catalogs, mention list |
| DS-002 | The Org page shows the Org launch draft. Start loads Org references (and the source run seed for "+"), then fills defaults or the seed. The member tree projection gives effective settings and readiness. Run asks `agentOrgLaunchService` to resolve workspaces, serialize overrides and launch, then navigates to the active run. | OrgLaunchDraft, member tree | `agentOrgLaunchDraftStore` | reference loading, seed building, workspace creation, placement serialization |
| DS-003 | "+" copies a run's settings into the right draft owner. Agent: the config of the agent on screen, passed by the view (host run or `@` collaborator child; CR-001). Team: `loadTeamRunLaunchSeed` → root + `agentOverrides`. Org: the store's seed path. If the copy fails, the definition defaults are used. | Copied settings | `useRunStart` | seed loaders |
| DS-004 | The saved-run view renders `existingRunConfigStore` state. Edits go through existing update actions (cascade included). Cancel calls `discardChanges`. Stop calls the kind's terminate action, then `reloadCanonical` to refresh editability. | ExistingRunConfigDraft | `existingRunConfigStore` | stop action, model options, copy |
| DS-006 | One mention menu composable serves both textareas. It takes candidates from the run's server candidates (live run) or the catalog (New chat), minus the current target. The chosen mention is recorded on the composer context. First sends forward the mentions present in the text. | requestedMentions | `useComposerMentionMenu`, run stores | candidate sources |

## Spine Actors / Main-Line Nodes

Run/"+"/switch triggers → `useRunStart` → `chatDraftStore` | `agentOrgLaunchDraftStore` → start
surface views → `chatLaunchService` | `agentOrgLaunchService` → `agentRunStore` /
`teamRunConfigStore` + `agentTeamRunStore` / `agentOrgRunStore` → server. Saved runs:
`ExistingRunConfigEditor` → `existingRunConfigStore`.

## Ownership Map

- `useRunStart` (new composable) owns start intent and navigation for every Run, "+" and heading
  switch: which draft owner, which initial settings, which route. It does not own draft state or
  launch.
- `chatDraftStore` (extended) owns the New chat draft:
  - target (agent | team);
  - context (text, files, mentions, skills, model config);
  - `RunWorkspaceChoice`;
  - approval;
  - Team `agentOverrides`;
  - starting state.
  Rules it owns:
  - preselection per REQ-021;
  - carry rules on retarget (keep workspace/approval/model config/text; reset overrides);
  - sanitizing the model config on model change (keeps thinking/other independent, resets both on
    model change).
- `chatLaunchService` (extended) owns the Agent/Team launch from a draft: readiness, workspace
  resolution, Team config with overrides, catalogs for every effective runtime, and first-message
  mentions.
- `agentOrgLaunchDraftStore` (renamed + reshaped from `agentOrgRunConfigStore`) owns the Org launch
  draft lifecycle:
  - definition, source run, phase (`preparing | ready | launching`), error;
  - root settings (`RunWorkspaceChoice`, model config, approval);
  - `teamOverrides` (model/thinking/approval), `teamWorkspaceChoices`, `agentOverrides`;
  - reference/seed loading with staleness guards;
  - readiness.
- `agentOrgLaunchService` (new) owns the Org launch side effects:
  - resolving/creating root and team workspaces (each path created once);
  - serializing placements (`toAgentOrgPlacementLaunchConfiguration`);
  - `agentOrgRunStore.launch`;
  - refreshing the history item;
  - writing the last model.
  It returns `orgRunId`. It holds no state.
- `runMemberTree` (new projection in `utils/runSettings/`) builds an immutable member tree with
  effective settings, `isCustomized` per field group (model/thinking, each other setting, approval,
  workspace), coordinator flags and model-required flags. It uses the existing inheritance helpers.
  It is used by the drawer and the saved-run Members list.
- `existingRunConfigStore` (extended) owns saved-run editing as today, plus `discardChanges()` and
  `reloadCanonical()`.
- `useRunStopAction` (new composable) owns stop pending/failure presentation and calls the existing
  per-kind stop actions.
- `useComposerMentionMenu` (renamed from `useRunMentionMenu`) owns `@` detection, filtering,
  insertion and `requestedMentions` recording. The caller provides the candidates.
- `useStartSurfaceTools` (new) owns the remembered open/closed state of start-surface tools.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pages/workspace.vue` Org branch | `agentOrgLaunchDraftStore` | Route → page mapping | Draft initialization beyond calling `ensureForRoute` |
| `ExistingRunConfigEditor.vue` | `existingRunConfigStore` | Maps store state to `ExistingRunSettings` props | Save/stop policy |
| `RunConfigPanel.vue` | `ExistingRunConfigEditor` | Panel chrome (title, back) for selected saved runs | Any launch branch |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `components/workspace/config/AgentRunConfigForm.vue` | Launch/saved forms replaced | New chat; `ExistingRunSettings` | In This Change | + spec |
| `components/workspace/config/TeamRunConfigForm.vue`, `TeamScopeConfigEditor.vue`, `TeamMemberConfigTree.vue`, `MemberOverrideItem.vue`, `MemberOverridesDisclosure.vue` | Long member forms | `run-settings/*` drawer + card | In This Change | + specs |
| `components/workspace/config/AgentOrgRunConfigForm.vue`, `AgentOrgRunConfigPanel.vue`, `AgentOrgDirectAgentOverrideRow.vue` | Old Org form + in-view orchestration | `OrgLaunchPage` + `agentOrgLaunchDraftStore` + `agentOrgLaunchService` | In This Change | + specs (`AgentOrgRunConfigPanel`, `AgentOrgOwnedLaunch`, `AgentOrgSeededLaunch`, `AgentOrgCatalogRecovery`, `AgentOrgRunConfigForm`) rewritten against the new owners |
| `components/workspace/config/DraftRunConfigEditor.vue` + `RunConfigPanel` draft and pending branches | No catalog `temp-*` drafts remain | New chat; ⚙ hidden for `temp-*` (AR-003) | In This Change | A failed-promotion temp context keeps its error notice and composer retry |
| `components/workspace/config/WorkspaceSelector.vue`, `FixedWorkspacePath.vue`, `AutoApproveSwitch.vue`, `types/workspace/WorkspaceSelectorModel.ts` | Form-only | `ChatWorkspaceMenu`, `ChatApprovalToggle`, locked-row display | In This Change | + specs |
| `utils/editableTeamRunFormModel.ts`, `types/agent/EditableTeamRunFormModel.ts`, `types/agent/TeamRunFormModel.ts`, `utils/editableAgentOrgRunFormModel.ts` | Form-model projections | `utils/runSettings/runMemberTree.ts` (keeps the Org diagnostics logic) | In This Change | Move the Org topology diagnostics into `runMemberTree` |
| `services/runConfigEditing/existingTeamRunFormModel.ts`, `existingAgentOrgRunFormModel.ts`, `types/agent/ExistingTeamRunFormModel.ts` | Form-shaped existing projections | `runMemberTree` saved-run variant (effective + locked/editable per scope) | In This Change | Keep their semantic rules (editability, original model, options) |
| `composables/useRunActions.ts` | Scattered start intent | `useRunStart` | In This Change | + call sites |
| `components/workspace/running/RunningAgentsPanel.vue`, `AgentLibraryPanel.vue` + specs + `tests/e2e/fixtures/fresh-run-auto-approval.page.vue` usage | Dead (AF-003) | — | In This Change | Update `tests/e2e/fresh-run-auto-approval-probe.mjs` to go through New chat |
| `WorkspaceAdaptiveLayout` `showAgentOrgRunConfig` and `hasPendingRunConfig` branches | Org page and New chat own starts | `pages/workspace.vue` Org branch | In This Change | |
| `ChatMessageInput` target mode (`select-target`), `ChatTargetMenu` `variant`, `chat.targets.*` launch copy, `toChatTarget` | `@` is mention-only | `useComposerMentionMenu` | In This Change | |
| New chat "Files are saved in …" hint; "Kept from the saved run"; standing notes; banners | Removed copy (spec) | — | In This Change | |
| Localization keys of all removed components (en + zh-CN `workspace.ts`, `workspace.generated.ts`, `chat.ts`) and `localization/audit/migrationScopes.ts` entries | Dead copy | `runSettings.ts` (new) | In This Change | Keep en/zh-CN parity |
| `agentRunConfigStore`/`teamRunConfigStore` desktop form callers (`AgentDetail.setTemplate`, `RunConfigPanel.handleRun`) | Form-only | `useRunStart` | In This Change | The stores stay (mobile, Team launch draft) |

## Return Or Event Spine(s) (If Applicable)

- Lifecycle after stop: `run store terminate → (server lifecycle) → existingRunConfigStore.reloadCanonical → editability true → view editable`.
  The view must not mutate the draft directly, as the reference does.
- History publication after launch: existing `runHistoryStore.refreshTreeQuietly`/`refreshAgentOrgHistoryItem`, unchanged.

## Bounded Local / Internal Spines (If Applicable)

- **DS-005, inside `useRunStart`.** `heading choice → if agent|team: chatDraftStore.retarget(target, carry) → (on /chat) | if org: agentOrgLaunchDraftStore.start({definitionId, carried}) → router.push(org route)`.
  From the Org page to an agent/team: `chatDraftStore.startForDefinition(target, {carried})` → `/chat`.
  Carry = workspace, approval, model + llmConfig (thinking and other settings). Overrides are reset.
  Typed text is kept only within `/chat` (DEC-006).
- **DS-007, inside `WorkspaceToolShell`.** `icon → useStartSurfaceTools.open → right panel visible (docked if room, else drawer) → close → remembered closed`.
  The start surface provides the chosen workspace via an injection key to `RightSideTabs`.
- **DS-008, inside the drawer.**
  `open → runMemberTree(definition tree, draft root, overrides) → row edit → draft owner setMemberOverride(address, field patch) → projection recomputes`.
  A field equal to the parent is removed from the override. The thinking and other-setting
  comparisons are separate (REQ-022).
- **Org launch draft phases, inside `agentOrgLaunchDraftStore`.**
  `start → preparing (references [+ seed]) → ready ⇄ edits → launching → (success: cleared after navigation | failure: ready + error)`.
  A stale intent (new `start` key) drops late results.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `resolveRunWorkspaceChoice` (`services/workspace/runWorkspaceChoice.ts`) | DS-001, 002, 007 | `chatLaunchService`, `agentOrgLaunchService`, start-surface tools | Choice → `{workspaceId, workspaceMetadata}`; creates folder workspaces | Shared by both launch services | An Org depending on a chat service; duplicated creation logic |
| Definition default preselection (`resolveStartModel` in `utils/runSettings/startModelDefaults.ts`) | DS-001, 002 | both draft owners | REQ-021 order (definition default → last chat model → default runtime's first model) with availability/catalog checks | One rule for Agent/Team/Org | Diverging defaults |
| `chatModelOptions.ts` | DS-001..004 | controls | Other-setting options from the schema; apply/unset; summary labels; `withoutModelOptions` for thinking comparison | REQ-022 | Fast mode logic inside the thinking menu |
| `runMemberTree.ts` | DS-002, 004, 008 | drafts, saved-run view | Effective/customized projection + Org diagnostics + model-required flags | Shared by the launch drawer and saved-run members | Per-view inheritance logic |
| Catalog for member runtimes | DS-001, 002 | launch services | `llmProviderConfigStore.fetchProvidersWithModels` for each distinct effective runtime | Team/Org readiness checks | — |
| Mention candidates (`useMentionCandidates` + pure rule `utils/collaborators/draftMentionEligibility.ts`) | DS-006 | `useComposerMentionMenu` callers | Live run: `collaboratorCandidatesService` (server-owned eligibility). New chat: `draftMentionCandidates(target, catalogs)` mirrors the server's `CollaboratorCandidatePolicy` (AR-001; rule below) | Two sources, one menu; the server is the eligibility authority | A New-chat candidate the server rejects at first send would leave an orphaned Team run (ARCH-REV-001 P-001) |
| `useRunStopAction` | DS-004 | saved-run view | Per-kind stop; pending/failure state | Same action as the tree | Duplicated stop logic in the view |
| `useStartSurfaceTools` | DS-007 | `WorkspaceToolShell` | Persisted open state | REQ-020 | — |

## Ownership Boundaries

- Views (`components/run-settings/*`, `ChatNewSurface`, `OrgLaunchPage`, `ExistingRunSettings`) render
  state and emit intents. They never call `agentOrgRunStore.launch`, terminate actions, or GraphQL
  directly.
- Draft mutations go through the draft owner's actions only (`chatDraftStore.*`,
  `agentOrgLaunchDraftStore.*`, `existingRunConfigStore.*`).
- Launch side effects go through `chatLaunchService` / `agentOrgLaunchService` only.
- Start intents (Run, "+", switch) go through `useRunStart` only.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useRunStart` | draft `start*` actions, seed loaders, router | Agent/Team/Org list/detail, run view headers, heading switcher, workspace tree "+" (`WorkspaceAgentRunsTreePanel.startPresetChat` → `newChatInWorkspace`) | Entry views calling `chatDraftStore.startNewChat` + `router.push` themselves | Add a named intent to `useRunStart` |
| `agentOrgLaunchDraftStore.launch` | `agentOrgLaunchService`, readiness | `OrgLaunchPage` | The page calling `agentOrgLaunchService` or `agentOrgRunStore` | Extend the store API |
| `chatLaunchService.launch*Chat` | Team config build, catalogs, team stores | `chatDraftComposerTarget.send` | The view creating Team drafts | — |
| `existingRunConfigStore` | patch planners, mutation clients | `ExistingRunConfigEditor` | The view mutating `draftStore.draft` | Add a store action (`discardChanges`, `reloadCanonical`) |

## Dependency Rules

- Allowed:
  - `components/run-settings/*` → `components/chat/*` controls, `utils/runSettings/*`, `chatModelOptions`;
  - start-surface views → their draft store + `useRunStart`;
  - draft stores → `utils/runSettings/*`, `services/workspace/runWorkspaceChoice`, definition stores,
    catalog stores;
  - launch services → run stores.
- Forbidden:
  - `components/run-settings/*` → `agentOrgRunStore`, `agentRunStore`, `agentTeamRunStore`, GraphQL;
  - `agentOrgLaunchDraftStore` → `chatLaunchService` (use `runWorkspaceChoice` instead);
  - any new code → removed form components or types;
  - `chatDraftStore` ↔ `agentOrgLaunchDraftStore` directly (only `useRunStart` coordinates them).
- Mobile (`composables/mobile/*`, `MobileLaunchRuntimeModelCard`) and Applications keep their current
  dependencies (`RuntimeModelConfigFields`, `ModelConfigSection*`, `agentRunConfigStore`,
  `teamRunConfigStore`, `useTeamRunRuntimeCatalogSync`).

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `useRunStart().runAgent(agentDefinitionId)` / `runTeam(teamDefinitionId)` / `runOrg(orgDefinitionId)` | start intent | Fresh draft + route | definition id per kind | Split by kind (no generic id) |
| `useRunStart().copyAgentFromConfig(config: AgentRunConfig)` | Agent copy intent (CR-001) | New chat for **the agent on screen** (`config.agentDefinitionId`), prefilled with its workspace (`runWorkspaceChoiceFromRootPath`), runtime/model/`llmConfig` (thinking + other settings) and approval | The displayed `AgentRunConfig` snapshot. This works for a top-level Agent run and for an `@` collaborator child (`agent_run_task_agent` / `agent_run_task_team_member`), whose contexts live in `agentRunCollaborationStore`, not `agentContextsStore` | Synchronous, with no lookup by run id. A missing workspace path → temp workspace. The caller passes `AgentWorkspaceView.target.context.config` |
| `useRunStart().copyTeamRun(teamRunId)` / `copyOrgRun(orgRunId, orgDefinitionId)` | copy intent | Prefill from a run | run id per kind | A failure falls back to defaults |
| `useRunStart().switchTarget(choice: {kind:'agent'|'team'|'org', definitionId})` | switch intent | Carry rules | explicit kind + id | |
| `useRunStart().newChatInWorkspace({agentDefinitionId, workspaceRootPath})` | tree "+" intent (AR-002) | New chat for that agent in that workspace; keeps today's settings rule (`startNewChat(preset)`: last chat model → Daily Assistant default → runtime default; approval on) | agent definition id + root path | Called by `WorkspaceAgentRunsTreePanel.startPresetChat`, which must not call `chatDraftStore`/router itself |
| `chatDraftStore.startForDefinition(target, {carried?, copied?})` | ChatDraft | REQ-021/carry/copy | `ChatTarget` (agent \| team) | Replaces the ad hoc `startNewChat` + setters at call sites; `startNewChat()` stays for the Chat nav |
| `chatDraftStore.setTeamMemberOverride(address, override \| null)` / `resetTeamMemberOverrides()` | Team agent overrides | Store canonical overrides | `AgentTeamAddress` | Team target only |
| `agentOrgLaunchDraftStore.start({orgDefinitionId, sourceOrgRunId?, carried?})` | Org draft | Phases, references, seed | Org definition id (+ org run id) | Idempotent per route intent (`ensureForRoute`) |
| `agentOrgLaunchDraftStore.setTeamOverride / setTeamWorkspace / setAgentOverride / resetMember / resetAll / update(root patch)` | Org overrides | | `AgentTeamAddress` | Team workspace is `RunWorkspaceChoice` |
| `agentOrgLaunchDraftStore.readiness` (getter) / `launch(navigate)` | Org launch | Blocking reason; launch | — | |
| `agentOrgLaunchService.launch(draft snapshot) → orgRunId` | Org launch side effects | | Snapshot | No state |
| `existingRunConfigStore.discardChanges()` / `reloadCanonical()` | Saved-run draft | Cancel; refresh after lifecycle | current `loadTarget` | |
| `useRunStopAction(kind, id)` | Stop | Pending/failure | Agent runId \| Team teamRunId \| Org orgRunId | |
| `buildRunMemberTree.forTeam(definition, root, agentOverrides)` / `.forOrg(org, references, root, overrides, teamWorkspaces)` / `.forSavedRun(draft)` | Member tree | Projection + diagnostics | per subject | Split by subject |
| `buildModelOptions(schema, config)` / `applyModelOption(config, key, value)` / `withoutModelOptions(schema, config)` | Other model settings | REQ-022 | schema key | |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `useRunStart.*` | Yes | Yes | Low | — |
| `switchTarget` | Yes | Yes (kind + id) | Low | — |
| `agentOrgLaunchDraftStore` setters | Yes | Yes (address) | Medium (team vs agent address) | Separate `setTeamOverride` / `setAgentOverride`; the tree node kind decides |
| `buildRunMemberTree.*` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Org launch draft store | `agentOrgRunConfigStore` → `agentOrgLaunchDraftStore` | Yes | Low | Rename in this change |
| Workspace choice | `ChatDraftWorkspace` → `RunWorkspaceChoice` | Yes | Low | Move to `types/runSettings/RunWorkspaceChoice.ts` |
| Mention menu | `useRunMentionMenu` → `useComposerMentionMenu` | Yes | Low | Rename |
| Start intents | `useRunActions` → `useRunStart` | Yes | Low | Replace |
| Heading switcher | `RunTargetSwitcher.vue` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Agent/Team draft + launch | `chatDraftStore`, `chatLaunchService` | Extend | Already the New chat owners | — |
| Org draft | `agentOrgRunConfigStore` | Extend + rename | It holds the overrides and seed intent | — |
| Org launch side effects | inside `AgentOrgRunConfigPanel` | Create New (`agentOrgLaunchService`) | A view cannot own launch | Moved, not new behavior |
| Saved-run editing | `existingRunConfigStore` | Extend | Owns state and policy | — |
| Inheritance | `teamRunLaunchHierarchy`, `teamRunConfigUtils`, Org placement helpers | Reuse | Form-agnostic | — |
| Member tree projection | `editable*/existing*FormModel` projections | Replace with `runMemberTree` | Form-shaped fields go away; rules are kept | The old shapes carry selector/operation fields for removed components |
| Controls | `ChatModelMenu`, `ChatThinkingControl`, `ChatWorkspaceMenu`, `ChatApprovalToggle` | Extend (placement/align/drillIn/runtimeLocked) | Spec mandates reuse | — |
| Other model settings | thinking adapter | Create New `chatModelOptions` | Thinking adapter semantics must not absorb non-thinking keys | — |
| Mentions | `useRunMentionMenu` + mirror in `AgentUserInputTextArea` | Extend (rename, candidate input, shared mirror component) | One `@` behavior | — |
| Tools | `WorkspaceToolShell`, `RightSideTabs`, `useRightPanel` | Extend (`startSurface`) | Same panel | — |
| Stop | run stores + subject actions | Reuse via `useRunStopAction` | Same action as the tree | — |
| Seeds for "+" | `loadTeamRunLaunchSeed`, `buildEditableAgentOrgRunSeed`, `readAgentOrgRunInspection` | Reuse | Existing copy semantics | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Owners Served | Decision |
| --- | --- | --- | --- | --- |
| `components/chat/` | Composer, chips, menus, heading switcher host, other-setting control | DS-001, 005, 006 | `chatDraftStore` | Extend |
| `components/run-settings/` (new folder) | Settings card, member drawer/rows/line, saved-run view, subject header, Org page, target switcher | DS-002, 004, 005, 008 | draft owners, `existingRunConfigStore` | Create New |
| `composables/runSettings/` | `useRunStart`, `useRunStopAction`, `useMentionCandidates` | DS-001..006 | — | Create New |
| `utils/runSettings/` | `runMemberTree`, `startModelDefaults` | DS-001, 002, 004, 008 | stores | Create New |
| `stores/` | `chatDraftStore`, `agentOrgLaunchDraftStore`, `existingRunConfigStore` | all | — | Extend |
| `services/chat/`, `services/agentOrgExecution/`, `services/workspace/` | launch services, workspace choice | DS-001, 002 | stores | Extend / Create |
| `components/layout/`, `composables/layout/`, `pages/` | start-surface shell and routes | DS-002, 007 | — | Extend |

## Draft File Responsibility Mapping

See the Final File Responsibility Mapping (drafted and tightened in one pass; no extraction changed
it materially).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Workspace choice (chat, Org root, placed team, tools) | `types/runSettings/RunWorkspaceChoice.ts` + `services/workspace/runWorkspaceChoice.ts` | runSettings / workspace | 4 consumers | Yes (replaces `WorkspaceSelectionState` in the Org draft) | Yes | A UI selection-state bag |
| Member override shape | existing `AgentConfigOverride`, `TeamScopeConfigOverride` | `types/agent/TeamRunConfig.ts` | Team + Org + launch | Yes (no `ChatMemberSettings` duplicate as in the reference) | Yes | — |
| Effective member projection | `utils/runSettings/runMemberTree.ts` | runSettings | drawer + saved-run members | Yes (drops selector/operation/seed fields) | Yes (replaces 4 projections) | A form model |
| Start-model defaults | `utils/runSettings/startModelDefaults.ts` | runSettings | chat + Org | — | — | A store |
| Other-setting options | `components/chat/chatModelOptions.ts` | chat | all surfaces | — | — | Part of the thinking adapter |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `RunWorkspaceChoice` | Yes | Yes | Low | — |
| `ChatDraft.teamAgentOverrides: Record<AgentTeamAddress, AgentConfigOverride>` | Yes | Yes | Low | Only meaningful fields stored (`hasMeaningfulMemberOverride`) |
| `OrgLaunchDraft` | Yes | Yes | Medium (team override vs team workspace) | Keep `teamWorkspaceChoices` separate from `teamOverrides`; serialization merges them |
| `RunMemberNode` | Yes (`effective`, `customized` flags per field group) | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern |
| --- | --- | --- | --- |
| `composables/runSettings/useRunStart.ts` (new) | runSettings | start intent | Run/"+"/switch → draft owner + route |
| `composables/runSettings/useRunStopAction.ts` (new) | runSettings | stop | Per-kind terminate; pending/failure |
| `composables/runSettings/useMentionCandidates.ts` (new) | runSettings | mention source | Draft vs live-run candidates |
| `utils/runSettings/runMemberTree.ts` (new) | runSettings | projection | Team/Org/saved-run member tree, customized flags, diagnostics |
| `utils/runSettings/startModelDefaults.ts` (new) | runSettings | defaults | REQ-021 order |
| `types/runSettings/RunWorkspaceChoice.ts` (new) | runSettings | type | Workspace choice |
| `services/workspace/runWorkspaceChoice.ts` (new; from `chatLaunchService.resolveChatWorkspace`) | workspace | resolution | Choice → id + metadata; create folder workspace |
| `services/agentOrgExecution/agentOrgLaunchService.ts` (new) | Org execution | launch side effects | Workspaces, serialization, launch, history refresh, last model |
| `stores/agentOrgLaunchDraftStore.ts` (renamed from `agentOrgRunConfigStore.ts`) | stores | Org draft | Phases, references/seed, overrides, readiness, `launch` |
| `stores/chatDraftStore.ts` | stores | chat draft | `startForDefinition`, Team overrides, retarget carry, model-config sanitize |
| `stores/existingRunConfigStore.ts` | stores | saved runs | `discardChanges`, `reloadCanonical` |
| `stores/agentRunStore.ts` | stores | agent send | First message keeps mentions |
| `stores/agentTeamRunStore.ts` | stores | team send | `mentions` option for draft launch sends |
| `services/chat/chatLaunchService.ts`, `chatTeamLaunchConfig.ts` | chat | launch | Team overrides + catalogs per runtime + mentions |
| `components/chat/chatModelOptions.ts`, `ChatModelOptionControl.vue` (new) | chat | REQ-022 | Other settings logic + chip |
| `components/chat/ChatModelMenu.vue`, `ChatThinkingControl.vue`, `ChatWorkspaceMenu.vue`, `ChatApprovalToggle.vue` | chat | controls | Placement/align/drillIn/runtimeLocked; label never wraps |
| `components/chat/ChatMessageInput.vue`, `ChatTargetMenu.vue`, `ChatComposer.vue` | chat | composer | Mention-only `@`; shared mirror |
| `components/agentInput/ComposerMentionMirror.vue` (new) + `composables/agentInput/useComposerMentionMenu.ts` (renamed) | agentInput | mentions | Shared by both textareas |
| `components/chat/ChatNewSurface.vue` | chat | New chat view | Heading switcher, other chips, members line, mention mode, no workspace line |
| `components/run-settings/RunTargetSwitcher.vue` | run-settings | view | Heading switcher (Agents, Agent teams, Agent orgs) |
| `components/run-settings/RunSettingsCard.vue` | run-settings | view | Labelled rows (editable/locked/member variants, per-field Reset) |
| `components/run-settings/RunMembersLine.vue`, `RunMemberSettingsDrawer.vue`, `RunMemberRow.vue`, `RunMembersSection.vue` | run-settings | view | Line, drawer (resize, dialog), rows, saved-run list |
| `components/run-settings/OrgLaunchPage.vue` | run-settings | view | UIS-004 |
| `components/run-settings/ExistingRunSettings.vue`, `RunSubjectHeader.vue` | run-settings | view | UIS-003 |
| `components/workspace/config/ExistingRunConfigEditor.vue`, `RunConfigPanel.vue` | workspace/config | container | Map store → view; panel chrome |
| `components/layout/WorkspaceToolShell.vue`, `RightSideTabs.vue`, `StartSurfaceToolsToggle.vue` (new), `composables/layout/useStartSurfaceTools.ts` (new), `WorkspaceAdaptiveLayout.vue` | layout | shell | Start-surface tools; remove the old branches |
| `pages/chat.vue`, `pages/workspace.vue` | pages | routes | Start-surface frames; Org page branch |
| Entry points: `AgentList.vue`, `AgentDetail.vue`, `AgentTeamList.vue`, `AgentTeamDetail.vue`, `AgentOrgExperience.vue`, `AgentWorkspaceView.vue`, `TeamWorkspaceView.vue`, `AgentOrgWorkspaceView.vue`, `WorkspaceAgentRunsTreePanel.vue` (`startPresetChat`) | various | callers | Call `useRunStart` |
| `localization/messages/{en,zh-CN}/runSettings.ts` (new), `chat.ts`, `workspace.ts`, `workspace.generated.ts`, `index.ts`, `localization/audit/migrationScopes.ts` | localization | copy | Add/remove keys with parity |

## Applied Patterns (If Any)

- A **state machine** in `agentOrgLaunchDraftStore` (`preparing → ready → launching`) with an intent
  key for stale results.
- **Container/view** split for the saved-run settings (`ExistingRunConfigEditor` → `ExistingRunSettings`).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/run-settings/` | Folder | views | Run-settings vocabulary shared by start surfaces and saved runs | Store/GraphQL calls other than intents |
| `autobyteus-web/composables/runSettings/` | Folder | intents | Start, stop, mention candidates | Draft state |
| `autobyteus-web/utils/runSettings/` | Folder | pure logic | Member tree, start defaults | Vue/Pinia state |
| `autobyteus-web/types/runSettings/` | Folder | types | `RunWorkspaceChoice` | Logic |
| `autobyteus-web/services/agentOrgExecution/agentOrgLaunchService.ts` | File | Org launch | Side effects | State |
| `autobyteus-web/services/workspace/runWorkspaceChoice.ts` | File | workspace | Resolution/creation | UI |

## Folder Boundary Check

| Path | Depth | Ownership Clear? | Mixed/Over-Split Risk | Justification |
| --- | --- | --- | --- | --- |
| `components/run-settings/` | Off-Spine (views) | Yes | Low | Matches the Product vocabulary; replaces `workspace/config` forms |
| `composables/runSettings/` | Main-line (intent) | Yes | Low | Small, three files |
| `utils/runSettings/` | Off-Spine | Yes | Low | Pure functions |

## Workspace Representation Conversion Boundaries (AR-004)

`RunWorkspaceChoice` is the only workspace shape in drafts, views and `runMemberTree`. Two older
shapes survive in owners that are not replaced: `WorkspaceSelectionState` and `TeamWorkspaceSelection`.
All conversions live in `services/workspace/runWorkspaceChoice.ts` as named pure functions, and are
called only at these boundaries:

| Source Shape | Where It Survives | Converter | Called By (only) |
| --- | --- | --- | --- |
| `WorkspaceSelectionState` (root and `teamWorkspaceSelections`) | `AgentOrgRunLaunchSeed` from `buildEditableAgentOrgRunSeed` (Org "+") | `runWorkspaceChoiceFromSelection(selection)` | `agentOrgLaunchDraftStore.start` (seed path). The team workspace is kept only when it differs from the root (`sameRunWorkspaceChoice`) |
| `TeamWorkspaceSelection` (`TeamRunConfig.rootConfig.workspace` from `loadTeamRunLaunchSeed`) | Team "+" copy | `runWorkspaceChoiceFromTeamWorkspace(workspace)` | `useRunStart.copyTeamRun` |
| `AgentRunConfig.workspaceId` / `workspaceMetadata.workspaceRootPath` | Agent "+" copy (host or collaborator) | `runWorkspaceChoiceFromRootPath(rootPath)` | `useRunStart.copyAgentFromConfig` |
| `RunWorkspaceChoice` → `WorkspaceSelectionState` | `existingRunConfigStore.updateAgentOrgWorkspaceSelection(address, selection)` (saved placed-team workspace) | `toWorkspaceSelection(choice)`; display uses `runWorkspaceChoiceFromSelection` | `ExistingRunConfigEditor` container (both directions) |
| `RunWorkspaceChoice` → `{workspaceId, workspaceMetadata}` / root path | Launch | `resolveRunWorkspaceChoice(choice)` (creates folder workspaces) | `chatLaunchService`, `agentOrgLaunchService`; `startSurfaceWorkspaceOf` for tools (read-only, no creation) |

Views, `runMemberTree` and `components/run-settings/*` never import `WorkspaceSelectionState` or
`TeamWorkspaceSelection`.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Start intent | `AgentTeamList: runTeam(team.id)` → `useRunStart().runTeam(id)` | `chatDraftStore.startNewChat(); chatDraftStore.setTarget(...); router.push('/chat')` in each view | One rule for defaults/carry/navigation |
| Org launch | `OrgLaunchPage @run → orgDraft.launch(navigate)` → store → `agentOrgLaunchService.launch(snapshot)` | `OrgLaunchPage` calls `agentOrgRunStore.launch` (as in the reference) | The view must not own launch |
| Team overrides in chat | `draft.teamAgentOverrides['/writer'] = { runtimeKind: 'codex', llmModelIdentifier: 'gpt-5.6-sol', llmConfig: { reasoning_effort: 'medium', service_tier: 'fast' } }` → `buildChatTeamLaunchConfig(def, settings, draft.teamAgentOverrides)` | A new `ChatMemberSettings` type duplicating `AgentConfigOverride` + workspace | Tight shared types |
| Stop refresh | `await stop(); await existingRunConfigStore.reloadCanonical()` | `draftStore.draft = { ...current, isActive: false, editability: {editable:true} }` | Server-authoritative editability |
| Fast mode | `applyModelOption(config, 'service_tier', 'fast')` keeps `reasoning_effort` | Adding `service_tier` to `getThinkingParamKeys` | Thinking semantics stay pure |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Rejection Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep the old forms behind a flag/"Advanced" link | Safety net | Rejected | New surfaces; forms deleted |
| Keep `useRunActions` as a wrapper over `useRunStart` | Fewer call-site edits | Rejected | Call sites move to `useRunStart` |
| Keep `WorkspaceSelectionState` in the Org draft beside `RunWorkspaceChoice` | Smaller store diff | Rejected | `RunWorkspaceChoice` only |
| Keep `RunningAgentsPanel`/`AgentLibraryPanel` | Possible future use | Rejected | Removed (unmounted) |
| Keep the `@` target mode for New chat | Habit | Rejected (REQ-011) | Heading switcher |

## Derived Layering (If Useful)

Views → intents (`useRunStart`, `useRunStopAction`) / draft stores → services → run stores → server.

## Change / Refactor Sequence

1. **Shared foundations.**
   - `RunWorkspaceChoice` + `runWorkspaceChoice` service, moved out of `chatLaunchService`; callers
     updated.
   - `startModelDefaults`, `chatModelOptions` + `ChatModelOptionControl`.
   - The chat control props (placement/align/drillIn/runtimeLocked).
2. **Mentions.**
   - `useComposerMentionMenu` + `ComposerMentionMirror` + `useMentionCandidates`.
   - New chat switches to mention mode.
   - First-send mentions in `agentRunStore`/`agentTeamRunStore`; `chatLaunchService` passes them.
3. **Chat draft and launch.**
   - `chatDraftStore.startForDefinition`, Team overrides, retarget carry, model-config sanitize.
   - `buildChatTeamLaunchConfig(overrides)`.
   - Catalogs per runtime.
4. **Run-settings views.** `RunSettingsCard`, members line/drawer/rows, `RunTargetSwitcher`. Then
   `ChatNewSurface` adopts them.
5. **Org launch.**
   - Rename/reshape the store into `agentOrgLaunchDraftStore` and add `agentOrgLaunchService`.
   - `OrgLaunchPage`.
   - The `pages/workspace.vue` Org branch.
   - Remove `AgentOrgRunConfigPanel` and the layout branch.
6. **Start-surface tools.** `useStartSurfaceTools`, the shell prop, the `RightSideTabs` injection, and
   the `pages/chat.vue`/`pages/workspace.vue` frames.
7. **Entry points.** `useRunStart`; rewire Run/"+"/switcher; delete `useRunActions` and the dead panels.
8. **Saved runs.**
   - `runMemberTree` saved-run variant.
   - `ExistingRunSettings` + `RunSubjectHeader`.
   - `existingRunConfigStore.discardChanges`/`reloadCanonical`, `useRunStopAction`.
   - Reduce `RunConfigPanel`; delete `DraftRunConfigEditor` and the old forms/projections/types.
9. **Copy.** Localization add/remove (en + zh-CN), audit scopes; delete dead keys.
10. **Tests.**
    - Delete specs of removed components.
    - Add specs for the new owners (see Guidance).
    - Update e2e probes that drive the old forms
      (`tests/e2e/fresh-run-auto-approval-probe.mjs`, `chat-composer-polish-probe.mjs`).

There are no temporary seams to leave behind. Each step compiles. Old components are deleted in the
step that replaces their last caller.

## Key Tradeoffs

- **Reuse production owners over the reference's new stores.** This is more adaptation work but keeps
  production readiness (references, topology diagnostics, workspace creation) and avoids parallel
  owners.
- **Replace the four form-model projections with one `runMemberTree`.** This means migration effort
  inside the change, but it gives one inheritance projection.
- **Server-authoritative editability after stop (reload)** over optimistic local mutation. It costs
  one extra request, but the result is correct.
- **Non-thinking numeric params are not presented** (none exist). This avoids speculative controls.

## Risks

- **First-message mentions:** AF-009 is only proven by reading code. API/E2E must show an Agent and a
  Team first send with `@` admitting the collaborator. If the server rejects it, return a
  `Design Impact`.
- **Org launch readiness:** removing per-scope schema-state gating relies on these instead:
  - model-config sanitize on model change;
  - model-required per effective scope;
  - runtime enabled;
  - Org topology diagnostics.
  Server launch validation stays authoritative. Errors must surface as "Couldn't start this Agent
  Org. Try again." (keep the server message in the console/log).
- **`launchAgentChat` failure path (decided, AR-003):** a failed promotion lands on the registered
  `temp-*` context.
  - The run header's Edit Config (⚙) is **hidden** for `temp-*` contexts:
    `AgentWorkspaceView`/its header checks `isTemporaryRunId(runId)`.
  - `RunConfigPanel` has no draft branch.
  - The existing send-error notice and the retry by sending again from the composer stay unchanged.
  - Test: a temp context renders no ⚙ and its composer can resend.
- **Blast radius in tests and localization:** many specs reference the removed components. The
  localization audit must stay green.
- **Mobile regression:** mobile shares `agentRunConfigStore`/`teamRunConfigStore`/
  `RuntimeModelConfigFields`. Run the mobile specs (AC-015).

## Guidance For Implementation

- Follow the Product spec for every visual/copy detail. Use the design repo `6718986` components as a
  presentation reference only. Do not copy its prototype stubs, fixtures or `orgLaunchDraftStore`
  ownership.
- REQ-021:
  - `startForDefinition` uses the definition `defaultLaunchConfig`, falling back to the last chat
    model and then the default runtime's first model, each with availability/catalog checks (as in
    `chatDraftStore.resolveDefaultModel`).
  - Approval defaults to `true` for every kind (the Org default changes from `false`).
  - Plain `startNewChat()` keeps its existing order.
- REQ-022:
  - Thinking and other settings live in the same `llmConfig`.
  - Changing the model sanitizes the config against the new schema; other settings reset.
  - Member "Customized" for Thinking compares `withoutModelOptions(parent)` vs
    `withoutModelOptions(member)`.
  - A member override equal to its parent is dropped.
- Org page:
  - `ensureForRoute` reads `definitionId`/`sourceOrgRunId` from the route. Run/"+" always start a
    fresh draft (via `useRunStart`); a page reload re-initializes from the route.
  - The route stays `/workspace?rootSubjectKind=agent_org&definitionId=…&mode=configuration[&sourceOrgRunId=…]`
    (DEC-005).
- Placed-team workspace: keep "only where it differs from the Org's" on copy (`sourceOrgRunId`), and
  drop the team workspace override when it equals the root.
- Saved runs:
  - `reloadCanonical()` re-runs the existing canonical loader for the current `loadTarget`
    (`loadAgentCanonical` / `loadTeamCanonical` / `loadAgentOrgCanonical`, i.e. the
    `retryCanonicalRefresh` path). There is no new fetch path (R-1).
  - The Cancel → `discardChanges` restores `draftSelection`/planner/workspace draft from the
    canonical originals already held in the draft (no request).
  - Stop → `useRunStopAction` → `reloadCanonical`.
  - Stop labels reuse the tree keys (`…terminate_run`, `…terminate_team`, `agentOrg.history.stopLabel`).
- `@` candidates in New chat (AR-001) are computed in one place, `utils/collaborators/draftMentionEligibility.ts`.
  It mirrors `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-candidate-policy.ts`
  (`listCandidates`, `requireAdmissible`, `inRunDefinitionIds`):
  - **Eligible:** agent definitions with `ownershipScope === 'shared'` that are not built-in, and team
    definitions with `ownershipScope === 'shared'`.
    - Built-in ids mirror the server registry `built-in-agent-registry.ts`: `autobyteus-daily-assistant`,
      `autobyteus-project-task-manager`, `autobyteus-retrospective-skill-improver`.
    - They live in one frontend constant `utils/agents/builtInAgentDefinitionIds.ts`, whose comment
      points to the server registry.
    - `useChatComposerOptions` and the heading switcher's Daily-Assistant-first rule read the same
      constant where relevant.
  - **In run** (the would-be run's placements; excluded):
    - Agent target: `{agent: targetId}`.
    - Team target: `{team: targetId}`, plus every node of the target team definition, recursively
      through nested `AGENT_TEAM` refs via `agentTeamDefinitionStore`. Each `AGENT` ref adds its
      agent definition id; each `AGENT_TEAM` ref adds its team id. Any scope counts; only shared ones
      can be candidates anyway.
  - **Candidates** = eligible − in run. Orgs are never included.
  - **Example.** Target "Software Engineering Team" has shared members solution_designer,
    architecture_reviewer, … and no nested teams. The `@` list excludes Software Engineering Team,
    all six member agents, and the three built-ins. It lists every other shared agent and shared
    team. If the team had a nested shared "Review Team", Review Team and its members would be
    excluded too.
  - **Tests:** a unit test of the rule (agent target, flat team, nested team, built-ins, team-local
    refs). An API/E2E case: a Team New chat whose `@` list omits members, and a first send with an
    eligible mention admits the collaborator.
  - With eligibility aligned, a first-send `alreadyInRun`/`invalid` rejection is **not a normal-flow
    state**. ARCH-REV-001 P-002 is Not Reachable; it needs a concurrent definition change. No new
    recovery machinery is added. The existing `launchTeamChat` failure branch and
    `failLocalSubmission` behavior stay as they are.
- Agent "+" on an `@` collaborator view (CR-001):
  - The run header "+" in `AgentWorkspaceView` copies **the agent on screen**. That is the
    collaborator child when one is selected, as at base, where it opened New chat preset to the
    child's agent and workspace. REQ-013 extends it to model, thinking, other settings and approval.
  - For a team-member collaborator (`agent_run_task_team_member`), the agent on screen is that member
    agent, not its team. Base behavior is preserved.
- Dependency cleanup (CR-002): the "a chosen model starts with its defaults" rule
  (`explicitChatModelConfig`) lives in `utils/runSettings/explicitModelConfig.ts`. The carry/copy
  type is `RunStartSettings` in `types/runSettings/RunSettings.ts`, built on `RunSettingsValues`.
  `agentOrgLaunchDraftStore` imports neither from `stores/chatDraftStore`.
- Org topology diagnostics (CR-003) are logged once where readiness detects `tree.status ===
  'blocked'`. `launch` has no unreachable blocked branch.
- Tests (colocated, per `TESTING.md`):
  - `useRunStart` (each intent → draft + route; `copyAgentFromConfig` with a collaborator-child config);
  - `chatDraftStore` (REQ-021 order, retarget carry/reset, overrides);
  - `chatLaunchService.launchTeamChat` (overrides reach `TeamRunConfig`; catalogs per runtime;
    mentions passed);
  - `agentOrgLaunchDraftStore` (phases, seed, stale intent, readiness);
  - `agentOrgLaunchService` (workspace creation dedupe, serialization incl. `service_tier`);
  - `runMemberTree` (inheritance, customized flags incl. thinking-vs-other independence, Org
    diagnostics);
  - `chatModelOptions`;
  - `existingRunConfigStore.discardChanges`/`reloadCanonical`;
  - `useRunStopAction`;
  - drawer a11y (dialog, focus return, separator keys);
  - removed-copy absence.
- API/E2E (validation stage): Agent/Team/Org launch against a real server, covering:
  - overrides incl. Fast mode;
  - first-message mentions;
  - "+" copies;
  - saved-run stop/save;
  - visual comparison to VIS-001..042 at 804/880/390 px.


## SR-010 Addendum — Decisions On CRR-004 (DI-001..DI-006)

This section is authoritative where it refines earlier sections. The implemented head reviewed was
`c37b81de5`.

### DI-001 — Rendered-surface audit of Run / "+" / ⚙ (Adopt)

The audit started from the rendered controls, not from known callers (`grep` of `new-agent`,
`new-team`, `edit-config`, `@click … run`, `startNewChat`, `/chat` pushes at `c37b81de5`; evidence
AF-018).

| Rendered Surface | Control | Target Kinds Shown | Intent (`useRunStart`) / Owner | Copy Subject / Behavior | Status |
| --- | --- | --- | --- | --- | --- |
| Agents list card (`AgentList` → `AgentCard`) | Run | — | `runAgent(id)` | Definition defaults (REQ-021) | Covered |
| Agent detail (`AgentDetail`) | Run | — | `runAgent(id)` | Same | Covered |
| Agent Teams list / detail | Run | — | `runTeam(id)` | Same | Covered |
| Agent Orgs list / detail (`AgentOrgExperience.openLaunch`) | Run | — | `runOrg(id)` | Same | Covered |
| Agent run header (`AgentWorkspaceView` via `AgentWorkspaceSurface`/`WorkspaceHeaderActions`) | "+" | `standalone_agent` (live / stored history), `agent_run_task_agent`, `agent_run_task_team_member` | `copyAgentFromConfig(target.context.config)` | **The agent on screen** (SR-009) | Covered |
| Same | ⚙ | Same; hidden for `temp-*` (AR-003) | `center.showConfig()` → `ExistingRunConfigEditor` | The selected saved run (`selection.subject`). For a collaborator view this is the host run's settings, unchanged from base. Collaborator settings are not independently editable (out of scope). | Covered (preserved) |
| Team run header (`TeamWorkspaceView` via `TeamWorkspaceSurface`) | "+" | `standalone_team_member` and Team-hosted collaborator views | `copyTeamRun(...)` | **The Team run**, as at base (`createNewTeamRun` copies `activeTeamContext` for every member/collaborator view) | Covered (preserved) |
| Same | ⚙ | Same | `center.showConfig()` | The Team run's saved settings | Covered |
| Org run header (`AgentOrgWorkspaceView`, Agent and Team surfaces) | "+" | `agent_org_direct_agent`, `agent_org_team_member` (shown when live or member) | `copyOrgRun(orgRunId, orgDefinitionId)` | **The Org run** | Covered |
| Same | ⚙ | Same | `openMemberConfiguration` → saved Org settings | The Org run | Covered |
| Workspace tree agent "+" (`WorkspaceHistoryWorkspaceSection` → `onCreateRun` → `startPresetChat`) | "+" | — | `newChatInWorkspace({agentDefinitionId, workspaceRootPath})` | That agent in that workspace; today's settings rule (AR-002) | Covered |
| Workspace tree rows (Team, Org, run rows) | (no "+"/⚙; select/terminate/archive/delete only) | — | — | — | Intentionally absent |
| Left panel Chat nav + "new chat" pencil (`AppLeftPanel.startNewChat`, nav click) | New chat | — | **New intent `newChat()`** (gap found here: it still calls `chatDraftStore.startNewChat()` + router directly, the forbidden bypass) | Plain New chat order (Chat-nav rule) | **Change: route through `useRunStart.newChat()`** |
| Heading switcher (New chat, Org page) | choose target | — | `switchTarget(choice, from)` | Carry rules (DS-005) | Covered |
| `RemoteAgentCard.vue` "Run agent" | Run | — | — | Not rendered by any product component (no importer) | Intentionally absent (pre-existing; FU-004) |
| Mobile run setup, Applications | Run/launch | — | — | Out of scope | Intentionally absent |

Required change: add `useRunStart.newChat()` (calls `chatDraftStore.startNewChat()` and navigates to
`/chat`). `AppLeftPanel` uses it for both the nav click and the pencil. Test: `useRunStart.newChat`
→ a fresh draft + `/chat`.

### DI-002 — Client mirror of server `@` eligibility (Defer the server query; Adopt contract checks)

- **Server-owned candidate query for a not-yet-created run:** deferred as named follow-up **FU-001**.
  It is a server API change (an escalation trigger) and needs user approval. The drift risk is
  accepted for this ticket and mitigated by the two checks below.
- **Contract checks (adopt):**
  1. A live contract regression: the API/E2E probe `tests/e2e/cross-scope-agent-mentions-live-probe.mjs`
     case N03 already compares the New chat `@` list with the server rule against a real server.
     It stays a required case in the mentions slice (S4).
  2. A unit contract pin: `utils/agents/__tests__/builtInAgentDefinitionIds.contract.spec.ts` reads
     `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` from the repository and
     asserts that its `*_AGENT_DEFINITION_ID` values equal the web mirror. It fails on drift.

### DI-003 — First-message mention admission (Resolved; fallback recorded)

- **Proven:**
  - Server unit tests `standalone-agent-run-root.test.ts` (including "a host command readies the
    host, binds it, admits mentions, then posts"), `team-root-collaborators.test.ts` and
    `standalone-agent-run-lifecycle-service.test.ts`: 43/43 pass at `c37b81de5` (AF-019).
  - Live API/E2E N02 (Agent) and N03 (Team): 3/3 pass on a real server and runtime. Evidence:
    `evidence/api-e2e/cross-scope-mentions-N/`.
- **Fallback if a future regression breaks it.** This is a **Requirement Gap** to the user, because
  REQ-012 changes. The recommended answer: send the first message without structured mentions, keep
  the `@Name` text, and show the existing "couldn't bring in {name}" notice, so the user can mention
  again in the live run. No fallback code is built now (not reachable today).

### DI-004 — One readiness rule for both start surfaces (Adopt)

- A single pure rule `utils/runSettings/launchReadiness.ts` → `resolveScopesReadiness(tree)`, over the
  `runMemberTree` effective scopes (root + every member).
  - Blocking reasons in order: target unavailable → a scope's runtime disabled ("{Runtime} is
    unavailable. Choose another runtime.") → a scope without a model ("Choose a model to start.").
  - Org-only: topology `blocked` → "This Agent Org isn't available. Choose another Agent Org."
- `resolveChatLaunchReadiness` (Team target) builds `runMemberTree.forTeam(definition, root,
  draft.teamAgentOverrides)` and uses the rule. Agent targets use the same rule with one scope.
- `agentOrgLaunchDraftStore.readiness` uses the same rule.
- Copy and AC-002 are unchanged. A Team "+" copy with a member on a now-disabled runtime is now
  blocked before launch.

### DI-005 — Validation and rework slices (Adopt)

Remaining validation and any rework are organized in slices. Each failure is attributed to one slice.

| Slice | Scope | ACs | Required Evidence |
| --- | --- | --- | --- |
| S1 Agent/Team start | Run → New chat, REQ-021 defaults, members line/drawer, Team overrides at launch, tree "+", Chat nav | AC-001, 002, 004, 005, 006, 018 | Component specs + live Team launch with a member override |
| S2 Org launch | Org page, readiness, seed "+", launch success/failure/unavailable, switcher to/from Org | AC-001, 002, 003, 013, 016 | Component specs + live Org launch (success and failure) |
| S3 Saved runs | Running/stop, stopped edit/save/cancel, read-only, refresh, model unavailable, Org placed-team workspace | AC-009, 010, 011 | Component specs + live stop → edit → save → resume |
| S4 Mentions | `@` menu (eligibility), first-message mentions, running chats | AC-007 | N01–N03 live (done) + the unit contract pin |
| S5 Fast mode | Chip/row/member/saved-run, `service_tier` in launched/saved config | AC-019 | Component specs + live launched config shows `service_tier` |
| S6 Tools + visuals | Start-surface tools; VIS comparison at 804/880/390 | AC-014, 017 | Screenshots vs VIS-001..042 |

Removal/copy checks (AC-012, AC-015) run with every slice.

### DI-006 — Structural pressure

| Item | Decision | Reason |
| --- | --- | --- |
| (a) `ChatModelMenu` has two modes (396 lines) | **Accept** | One menu with a `runtimeLocked` mode that shares search, list and keyboard handling. Splitting would duplicate those or need a new shared base for one variant. It is under 500. Revisit if a third mode appears. |
| (b) Two default-model resolvers in `chatDraftStore` | **Adopt** | The design gave the REQ-021 order to `utils/runSettings/startModelDefaults`. Move both orderings (`definitionStartOrder`, `chatNavStartOrder`) there as candidate lists. `chatDraftStore` keeps only staleness/generation and applies the result. |
| (c) `AgentOrgExperience.vue` at 500 lines | **Defer (FU-002)** | Pre-existing size (base 497); this change adds a 1-line call. Split before the next feature touches it. |
| (d) A Team draft uses Daily Assistant's `AgentContext` as its message carrier | **Accept (FU-003, low)** | Pre-existing from the earlier New chat ticket. It works and is covered by tests. Replacing it with a target-neutral carrier touches composer/upload ownership beyond this scope. |
| (e) `utils/runSettings/*` imports `components/chat/chatModelOptions` | **Adopt** | Move the pure logic to `utils/runSettings/modelOptions.ts`. Components import from utils; nothing in utils imports components. |

### Follow-ups (named, not in this ticket)

- **FU-001:** a server-owned `@` candidate query for a not-yet-created run (needs user approval;
  server API).
- **FU-002:** split `AgentOrgExperience.vue`.
- **FU-003:** a target-neutral New chat message carrier.
- **FU-004:** remove the unrendered `RemoteAgentCard.vue`, or wire it intentionally.
