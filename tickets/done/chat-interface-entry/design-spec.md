# Design Spec — chat-interface-entry

## Solution And Approval Basis

- Current solution revision ID: `SR-019`. The D-19 Agent Org enumeration is made actionable with a synchronous correlation core (ARCH-REV-014 AR-014). Earlier: `SR-018` (Agent Org layouts).
- Approved requirements baseline and user-approval reference:
  - Baseline: `requirements-doc.md` `SR-003`.
  - User approval: 2026-09-28 in the Solution Designer conversation.
  - `SR-004` integrated the R2 supplement without changing intended behavior.
- Behavior-defining supplements and their approval references:
  - Product `ui-ux-spec.md` revision **R3** plus VIS-001–VIS-027 (VIS-020 superseded), `origin/personal@ef5f909`, 26/26 SHA-256 verified; user-confirmed R3 2026-09-29.
  - Location: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/`.
  - Revision: `origin/personal@8ac6cad`. All 24 SHA-256 hashes were verified.
  - User confirmations: R1 (PC-035) and R2 ("I think now the chat box looks good").
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/investigation-notes.md`. See AF-01–AF-27.
- Architecture review addressed: `design-review-report.md` ARCH-REV-001 (Fail, Design Impact). See "ARCH-REV-001 Resolution" below.
- Workspace:
  - Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry`
  - Branch: `codex/chat-interface-entry`
  - Base: `origin/personal@fcd3e83a4`
  - Finalization target: `personal`

## Current-State Read

AutoByteus Web is definition-first, and its message box and run views are bound to the global selection.

- **Landing and navigation.**
  - `/` routes to `/agents` (AF-01).
  - The primary navigation has no Chat item (AF-02).
- **Standalone agent runs.**
  - They render on `/workspace` through `WorkspaceAdaptiveLayout` → `AgentWorkspaceView` → `AgentWorkspaceSurface` → `AgentEventMonitor` → `AgentUserInputForm` (AF-03 to AF-05).
  - The right tool panel is owned by `WorkspaceAdaptiveLayout`. It is docked by default through one global preference (AF-20).
- **Message box.**
  - It consists of `ContextFilePathInputArea` and `AgentUserInputTextArea`.
  - Both components read `activeContextStore.activeAgentContext` directly, so the box cannot serve a draft that has no selected context (AF-06).
- **Draft contexts appear in the tree.**
  - A `temp-*` agent context becomes a draft row in the Workspaces tree as soon as it is registered in `agentContextsStore` (AF-07).
  - The tree's `+` creates such a draft directly (`runHistoryStore.createDraftRun`).
- **First send is already a clean path.**
  - `agentRunStore.sendUserInputAndSubscribe`: `PrepareAgentRun` → promote temp id → finalize `agent_draft` attachments → WS `SEND_MESSAGE` (AF-08).
  - Draft uploads need no run (AF-09).
  - Team launch drafts can send a first message to the focused member (AF-10).
- **Existing-run model edits.** They go through `existingRunConfigStore` and are guarded server-side by `runModelConfigEditability` (AF-11).
- **Runtime and model data.** Runtime availability, per-runtime catalogs and the thinking-schema adapter already exist (AF-12).
- **Skills.**
  - Skills are a per-definition name list.
  - The AutoByteus runtime injects a lazy catalog (name, description, `SKILL.md` path). Codex and Claude materialize configured skills. AGY uses detailed resolution (AF-17).
  - There is no "all installed skills" concept.
- **Built-in agents.** They are seeded by a registry plus a bootstrapper that overwrites files on every startup (AF-16).
- **User message content.** It is passed through to runtimes unchanged, and history text comes from runtime-native histories (AF-13, AF-14).

Constraints to respect:
- A chat is a normal run.
- Team and org views and their message box stay unchanged.
- The Agents, Agent Teams and Agent Orgs launch forms stay unchanged.
- The server `runModelConfigEditability` rule stays unchanged.
- The mobile runtime shell is unaffected.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence:
  - The change spans web and server.
  - Web: a new `/chat` route and surfaces, routing of all standalone agent runs, extraction of the message-box target, extraction of the right tool shell, removal of `AgentWorkspaceView` and the tree draft-create path, the team quick path, the model/thinking/workspace/skill/target menus, and skill-scope editing in the agent editor.
  - Server: a built-in Daily Assistant with a seed policy, and a definition-level `skillScope` across the domain, config, GraphQL, SkillService and runtime factories.
  - Roughly 35 web files and 12 server files, plus tests (see the File Mapping below).
- Architectural risk: `High`
- Risk rationale and supporting evidence:
  - Shared contract change: GraphQL `AgentDefinition.skillScope` and the agent-config.json field.
  - Ownership-boundary changes:
    - message-box target extraction
    - the right-panel shell extraction
    - the standalone-agent routing move from `/workspace` to `/chat`
  - Built-in bootstrap policy change.
  - Skill resolution changes for all four skill-capable runtimes.
  - Blast radius: every standalone agent run view.
- Escalation trigger if implementation or validation discovers new impact: return `Design Impact` in any of these cases:
  - A runtime cannot consume the expanded skill set within existing materializer limits, for example AGY source-size limits or Codex/Claude materialization time.
  - The composer-target extraction changes observable team/org message-box behavior.
  - Standalone routing breaks a supported entry point not listed in DS-003.

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | AF-06 `components/agentInput/*` | Box bound to the active context | D-02 explicit composer target | None |
| Code | AF-07 `stores/runHistoryReadModel.ts` | Temp contexts render as draft rows | D-03 New chat holds an unregistered context until send | None |
| Code | AF-08 `stores/agentRunStore.ts` | First-send path is complete | D-04 reuse for chat launch | None |
| Code | AF-09 server context-files | Draft uploads need no run; cross-kind finalize is allowed except org | D-03, D-06 | None |
| Code | AF-10 team stores | Root-only team config = uniform | D-06 team quick path | None |
| Code | AF-11 `existingRunConfigStore` | Existing-run edit owner | D-08 | None |
| Code | AF-13/14 WS send, history providers | Content passes through; history is runtime-native | D-09 content-carried skill instruction with a parser | None |
| Code | AF-16 built-in bootstrapper | Overwrites on every startup | D-10 seed-if-missing policy | None |
| Code | AF-17 SkillService and runtimes | Per-definition names; lazy catalog or materialization | D-11 `skillScope` expanded in SkillService | Materialization time for many skills (RSK-003) |
| Code | AF-19 navigation service | Agent links go to `/workspace` | D-05 agent links → `/chat?id=` | None |
| Code | AF-20 `useRightPanel` | One global visibility preference | D-07 scoped visibility | None |
| Prototype | AF-21 diff `5ae0fe1..8ac6cad` | Prototype-native state only | Production owners replace fixtures | None |
| Code | AF-23 catalog draft + `promoteTemporaryId` | Promotion moves the selection without navigating | D-13 route sync owner; D-08 registered-draft footer | None |
| Code | AF-24 failed first send | The error is shown in that context's conversation | D-04 launch destination = that context's chat view | None |
| Code | AF-25 `voiceInputStore` | Transcript target = active context | D-02 explicit voice target | None |
| Code | AF-26 bundled skills + AGY provenance | Name lookup misses definition-root bundles | D-11 catalog-record bindings | None |
| Code | AF-27 `initialSummary`, `conversation.agentDefinitionId` | Summary = sent text; prepare reads the conversation's definition id | D-09 summary rule; D-03 target-switch rebuild | None |

## Intended Change

- **D-01 — Chat navigation and landing.**
  - `Chat` becomes the first primary-navigation item, with a New chat pencil.
  - The collapse control moves to the first item.
  - Desktop `/` lands on `/chat`.
- **D-02 — One message box, explicit target.**
  - `ContextFilePathInputArea`, the input controls **and voice input** take an explicit `ComposerTarget` instead of reading `activeContextStore`.
  - Voice (AR-004): `VoiceInputButton` calls `voiceInputStore.toggleRecording({ source: 'composer', targetContext: target.context })`. The store no longer reads the active context.
  - `AgentUserInputForm` (team/org and any remaining users) passes the active-context target from `composables/agentInput/useComposerTarget.ts`, so its look and behavior are unchanged.
  - Placement (AR-002): the chat-draft target factory lives in the chat subsystem (`composables/chat/chatDraftComposerTarget.ts`). `agentInput` never imports from `chat`.
  - `ChatComposer` assembles the same card and Context Files area, plus the Chat-only chip row, footer, `/` and `@`.
- **D-03 — New chat draft is an unregistered agent context.**
  - `chatDraftStore` owns one `AgentContext` built from the draft config, with id `temp-*`. It is not registered in `agentContextsStore`, so no tree row exists before send (TR-001/TR-002).
  - Uploads use `agent_draft(<temp id>)`.
  - Target switch (`@`, `×`, tree `+` preset): rebuild the draft context for the new agent definition. Both `config.agentDefinitionId` and `state.conversation.agentDefinitionId` change, because `PrepareAgentRun` reads the latter (AF-27).
  - The rebuild keeps the typed text, the attachments (same draft id, so the upload owner is unchanged), the workspace, the approval setting and the model. Requested skill names are cleared.
- **D-04 — Agent chat launch reuses first send.**
  - `chatLaunchService.launchAgentChat` registers the prepared context (`agentContextsStore.registerDraftRun`), selects it, and awaits the existing `agentRunStore.sendUserInputAndSubscribe`. That call handles and presents its own failures (AF-24).
  - It then routes to `/chat?id=<currently selected run id>`:
    - on success, the promoted permanent id;
    - when the first send failed before promotion, the still-registered `temp-*` id (AR-001).
  - Either way the user lands on that context's chat view. The existing error message, if any, is visible there, and a resend uses the same first-send path.
  - **Order (AR-007).** New chat stays on `/chat` in the UXJ-001 starting state for the whole launch: send spinner plus "Starting <agent> on <Runtime>…".
    - `chatLaunchService` marks the draft `starting` before registration.
    - It then registers, selects and awaits the send.
    - Then it routes to `/chat?id=<selected id>`.
    - Only after the route is pushed does it call `chatDraftStore.startNewChat()` to reset the draft. The context now belongs to `agentContextsStore`.
    - Until the route is pushed, the New chat page renders from the draft's retained `starting` state, never from an empty draft.
- **D-05 — All standalone agent runs open in the chat view.**
  - One routing resolver maps a standalone-agent selection to `/chat?id=<runId>`. It is used by the left panel, execution links and the `/workspace` redirect.
  - Team and org runs stay on `/workspace`.
  - ~~`AgentWorkspaceView` is removed.~~ Superseded by D-17: `AgentWorkspaceView` is restored as the chat run view's center pane.
- **D-13 — Route sync across promotion (AR-001).**
  - `pages/chat.vue` owns keeping `/chat?id=` equal to the displayed run, through `composables/chat/useChatRouteRunSync.ts`.
  - Rule: while route id `R` is displayed, if the standalone selection changes from `R` to `P` because `agentContextsStore.promoteTemporaryId(R, P)` re-keyed that same context, call `router.replace('/chat?id=P')`.
  - This covers every send path: catalog-launched drafts, chat launches, and resends after a failure.
  - Rules for other ids:
    - An id that is neither registered nor openable through `openAgentRun` shows "This chat no longer exists" + New chat (REQ-015).
    - A `temp-*` id with no registered context redirects to `/chat`. This happens, for example, after an app reload, because temp contexts do not survive a reload.
- **D-06 — Team quick path.**
  - `chatLaunchService.launchTeamChat` creates a team launch draft whose root config is the chat's runtime/model/llmConfig/workspace/autoExecute, with no overrides.
  - It focuses the coordinator, selects the team draft and calls `agentTeamRunStore.sendMessageToFocusedMember` with an explicit attachment source owner (`agent_draft(<chat draft id>)`).
  - It then routes to `/workspace` (the existing Team view).
- **D-07 — Tool shell reuse.**
  - The right panel/strip/drawer machinery is extracted from `WorkspaceAdaptiveLayout` into `WorkspaceToolShell`, which has a center slot.
  - The chat run view uses it with the `chat` visibility scope (collapsed by default). The workspace keeps the `workspace` scope (docked by default).
- **D-08 — Footer model and thinking, by run identity (AR-001, ARCH-REV-002).**
  - The mode is chosen by the context's run id, **not** by `config.isLocked`. Offline runs reopened from the tree or history have `isLocked === false` (`agentRunOpenCoordinator.ts` L63, `runContextHydrationService.ts` L165, AF-28), so `isLocked` cannot tell drafts from persisted runs.
  - **Draft context** (run id starts with `temp-`). This covers both the unregistered New chat draft and a registered pre-first-send `temp-*` draft (for example, one launched from the catalog).
    - The footer edits `context.config` directly: runtime, model and thinking.
    - The runtime can be chosen, because no run exists yet.
    - Nothing reaches the server until the first send.
  - **Persisted run** (any permanent id, whatever `isLocked` says).
    - The footer goes through `existingRunConfigStore`: load canonical, update, save.
    - It is locked while the run is live (Running/Idle), and restricted to the run's runtime when Offline. The server enforces `runModelConfigEditability`.
    - The next send uses the existing resume path, which applies the saved config. A run terminated in this session and the same run reopened from history behave identically.
  - The footer's left group (workspace menu + approval toggle) appears **only on the New chat page**.
    - In the chat view (registered drafts and persisted runs), workspace and approval are header facts, matching VIS-015/VIS-017.
    - A catalog draft keeps what was chosen in `RunConfigPanel`.
- **D-09 — Skill tags.**
  - `AgentContext.requestedSkillNames` holds the tags.
  - `agentRunStore` composes the content with `skillRequestInstruction.compose` on send.
  - `UserMessage` renders chips and a "sent as" tooltip using `skillRequestInstruction.parse`, so live and reloaded messages look identical.
  - There is no protocol change. The wording has one owner: the web codec file.
  - Summary rule (AR-005): `PrepareAgentRun.initialSummary` is the user's text, meaning the `requirement` before composition.
    - Only a tags-only message falls back to the composed instruction.
    - The WS content remains the composed text, so tree and header titles read from the user's own words.
- **D-10 — Daily Assistant.**
  - A built-in agent `autobyteus-daily-assistant` ("Daily Assistant") is added with sync policy `seedIfMissing`.
  - It is visible and editable like any agent. Missing files are re-seeded at startup, and user edits persist.
- **D-11 — `skillScope`.** Agent definitions gain `skillScope: CONFIGURED | ALL_INSTALLED`, with a default of `CONFIGURED`.
  - SkillService owns effective skill resolution. Runtime factories use SkillService instead of `definition.skillNames.length`.
  - The agent editor shows a "Use all installed skills" option.
  - **Installed skill catalog (AR-003):**
    - SkillService has one enumeration, `listInstalledSkillRecords()`. It uses the same precedence and name de-duplication as `listSkills()`.
    - Each record is `{ skill, origin, trustedRoot, configuredRoot }`, set by layout:
      - Global skill dirs: `origin: global`. Trusted root = the skill dir. Configured root = its skills root.
      - `<root>/agents/<a>/skills/<n>`: `agent_private`. Trusted and configured root = `<root>/agents/<a>`.
      - `<root>/agent-teams/<t>/agents/<a>/skills/<n>`: `agent_private`. Trusted and configured root = `<root>/agent-teams/<t>`.
      - `<root>/agent-teams/<t>/skills/<n>`: `team_shared`. Trusted and configured root = `<root>/agent-teams/<t>`.
    - `listSkills()` maps these records to `Skill`. The GraphQL output is unchanged.
  - **ALL_INSTALLED bindings** are built directly from the enabled records (`!isDisabled`). They are never produced by re-resolving names through the per-agent resolver.
    - Regular path: `{ kind: 'resolved', skill, source: sourceFor(origin, skill, trustedRoot) }`.
    - Detailed (AGY) path: the existing candidate checks run on a candidate built from the record's real path, origin, trusted root and configured root: provenance, source safety, manifest/name checks and fingerprint.
    - `CONFIGURED` resolution is unchanged.
  - **Web `/` source:** Daily Assistant's `/` list = `skillStore` skills (the same `listSkills()` catalog) with `isDisabled === false`. The offered tags therefore equal the set the runtime receives.
- **D-14 — A send awaiting server activation survives history reconcile (CRR-002 CR-003; revised in SR-010 after IR-002 evidence).**
  - **Evidence (AF-33).** The closer is confirmed as `reconcileDiscoveredActiveRuns` ← `fetchRunHistoryTree` (stale snapshot, P inactive).
    - `submissionPending` cannot mark the window: the server sends `AGENT_STATUS offline` on connect (+6 ms), and `applyLiveAgentStatusEvent` clears the flag before `SEND_MESSAGE`.
    - The SR-008 `submissionPending` guard is therefore **replaced** (clean cut), not kept.
  - **Marker owner: `agentRunStore`, the single standalone send owner.** It keeps module-level `activationPendingRunIds: Set<string>` with methods `markActivationPending(runId)`, `clearActivationPending(runId)` and `isActivationPending(runId)`.
    - **Set:** in `sendUserInputAndSubscribe`, before the stream connects, for any send to a run the client does not currently consider live. That means a first send, marked with the permanent id right after `promoteTemporaryId`, and a resume of an Offline/Error run, which has the same window.
    - **Cleared by `reconcileDiscoveredActiveRuns`:** when a snapshot lists the run in its active set (`isActive || shouldConnectStream`). That is server-confirmed activation: once `SEND_MESSAGE` is received, the server projects `COMMAND_OVERLAY initializing` or `ACTIVE_RUNTIME`.
    - **Cleared by the send owner:**
      - on a handled failure or cancel (the `catch` path, including the stream-connect timeout);
      - on a rejected `SEND_MESSAGE` ack, surfaced through a new `AgentStreamingService` `onSendMessageCommandAck` callback that mirrors the existing interrupt-ack callback;
      - on terminate or close of the run.
    - **Not** cleared on live `AGENT_STATUS` events. The connect-time `offline` status is exactly what broke SR-008.
  - **Reconcile rule.** `reconcileDiscoveredActiveRuns` skips a context whose `agentRunStore.isActivationPending(runId)` is true: no disconnect and no Offline cleanup. `submissionPending` semantics (UI primary action, team/org) are unchanged.
  - **Why not the other options:**
    - (a) Changing `submissionPending` clearing would alter the send/stop/read-only UI for agent, team and org views.
    - (c) Having server snapshots mark prepared runs `shouldConnectStream` would make other windows and clients hydrate and connect to prepared, possibly abandoned runs.
  - **Validation:**
    - `implementation-evidence/d14-reconcile-probe.mjs --scenario stale` fails without the marker and passes with it, for both a first send and an Offline resume.
    - Unit tests cover each clear path (active snapshot, failure, rejected ack, terminate).
    - The resend probe must pass 14×.
  - If the probe still shows a close, return `Unclear` with the stack.
- **Note (SR-016):** D-15 **Rules 2 and 3 are removed** by D-19. With one skill per name, two runs never request different sources for the same name, so the weak/strong holder machinery is unnecessary.
  - Kept: D-15's scope, Rule 1 (user-owned workspace entries, keyed on scope via a simple `workspaceCollisionPolicy: 'fail' | 'prefer_workspace'`), and the "Unchanged" list.
  - The text below is kept for history.
- **D-15 — Skill-path collisions under ALL_INSTALLED: `ALL_INSTALLED` requests are weak; configured requests are strong (CRR-002 CR-004, ARCH-REV-004 AR-008).**
  - **Scope.** Every runtime that exposes skills through a workspace skill path:
    - AGY `.agents/skills` (a per-run capsule plus a workspace check);
    - the shared `WorkspaceSkillMaterializer` profiles: Codex `.codex/skills`, Claude `.claude/skills` and ACP/Grok `.grok/skills` (`acp-agent-run-backend-factory.ts` L116).
  - **Request strength.** Each run's skill requests carry `requestStrength`:
    - `all_installed` (weak) when the definition's `skillScope` is `ALL_INSTALLED`;
    - `configured` (strong) otherwise.
    - The bootstrappers/factories (Codex, Claude, ACP/Grok, AGY) derive it from `SkillService.resolveSkillScope(definition)`. Materializers never inspect `skillScope`.
  - **Rule 1 — a user-owned workspace entry.** This means a non-symlink or foreign path the materializer does not own; for AGY, any existing `<workspace>/.agents/skills/<name>`.
    - Weak: skip the installed copy, log `skipped-workspace-owned`, and start the run. The runtime discovers the workspace's own skill natively.
    - Strong: today's fail-fast `pathStateCollisionError` / `AGY_SKILL_NAME_COLLISION`, unchanged.
  - **Rule 2 — a path held by another live run with a different source** (shared materializer registry, `acquireResolved` L145–L150). In both directions below, the process-wide registry stays authoritative, and all transitions go through its phases (`acquiring` / `ready` / `releasing`).
    - **Direction A — a weak request meets any existing holder with a different source.**
      - The weak request skips that skill. It logs `skipped-held-by-other-run` (run, skill, holder source) and never throws.
      - The weak run starts without its copy. The name stays discoverable through the holder's link, so the agent still has a skill by that name.
    - **Direction B — a strong request meets an entry with a different source.**
      - If the entry has **any strong holder**, today's fail-fast `sourceCollisionError` applies. This is the pre-existing conflict between two configured runs, and it is unchanged.
      - If the entry has **only weak holders**, the strong request never fails:
        - If the entry is `acquiring`, wait for readiness and re-evaluate.
        - If it is `ready`, re-point the materializer-owned symlink to the strong source atomically (create a temporary link, then rename it over the old one). The entry's source becomes the strong source, and its holders are merged into it.
        - Log `yielded-to-configured` (weak run ids, old source → new source). The weak runs keep a skill of that name, now served from the configured copy.
      - Configured launches therefore never regress because an ALL_INSTALLED chat is live (REQ-017/AC-014).
    - The registry entry tracks `strongHolderCount` and `weakHolderCount`. Release decrements the matching count, and the link is removed when both reach zero. The link source stays whatever it last pointed to; the remaining holders accept that because the name is the same.
  - **Rule 3 — an unresolved strong request meets a link held only by weak holders (CRR-010 CR-007 / UF-04, SR-015).**
    - Case: `reconcileUnresolved` (`workspace-skill-materializer.ts` L349–L391) finds a `ready` entry whose holders are all `all_installed` (weak).
    - The strong run could not resolve that name. Its established behavior when alone is "Recording an unresolved binding for workspace reconciliation" → skipped, and the run starts.
    - **Rule:** skip without throwing. Log `skipped-unresolved-held-by-weak` (run, skill, the holder's current source). Do not join as a holder, and do not re-point.
      - The configured run still discovers the same-named skill through the existing link while the weak holders live.
      - When the last weak holder releases, the link is removed normally. That equals the configured run's baseline (unresolved = not provided).
    - Why not join (option 2): the strong run would adopt a source it never resolved, and the link would outlive the weak holders on the strong run's behalf.
    - Why not fail-fast (option 3): it breaks the D-15 invariant "configured launches never regress because an ALL_INSTALLED chat is live" (REQ-017/AC-014).
    - **Unchanged:**
      - Unresolved vs an entry with any strong holder, or vs a user-owned or foreign path: today's `reconcileUnavailable` classification and fail-fast.
      - Unresolved vs `missing` / `same-source` / `broken`: today's skip and repair.
    - Owner: `WorkspaceSkillMaterializer.reconcileUnresolved` consults the registry entry's holder strengths before calling `reconcileUnavailable`. The rule lives in the materializer, which already owns the registry.
  - **Unchanged:**
    - Same-source sharing.
    - `reconcile-discoverable` handling, and `reconcile-unresolved` handling except Rule 3.
    - Repair of materializer-owned symlinks (`repaired`, `removed-and-skipped`).
    - AGY per-run capsule copies, which are not shared between runs, so Rule 2 does not arise for AGY.
  - **Presentation note (accepted):** when a workspace or held copy is used, `/` still shows the installed skill's description.
- - **D-16 — Chat model labels reuse the shared model-selection label policy (REQ-021 / AC-018 / DEC-015, SR-011).**
  - **Owner:** `composables/chat/useChatModelCatalog.ts` builds its rows from the shared `utils/modelSelectionLabel.ts` functions and the same recommended-first rule as `utils/modelSelectionOptions.ts` `buildModelSelectionGroups`. There is no Chat-specific label logic.
    - `label` = `getModelSelectionOptionLabel(model, runtimeKind)`: the canonical name for Claude Agent SDK, the display name for Codex and other non-AutoByteus runtimes, the identifier for AutoByteus.
    - `secondary` = `getModelSelectionOptionDescription(model, runtimeKind)`.
    - `recommended` = `model.selectionPresentation?.recommended === true`.
    - Rows are ordered recommended-first for Claude Agent SDK only, via a shared comparator exported from `modelSelectionOptions.ts` (the existing `compareRecommendedFirst`, exported, not duplicated).
  - **Consumers:**
    - `ChatModelMenu` rows, search results and the runtime-fixed list for persisted runs render `label` plus the Recommended badge on one line, and `secondary` as a gray second line.
    - The footer trigger `modelLabel` uses `label` and keeps the runtime badge beside it.
    - Rows and the trigger stay single-line: truncate with an ellipsis and expose the full `label` (and `secondary` for rows) as `title` / aria-label. This keeps the R2 "model names never wrap" rule.
  - **Search:** the haystack = identifier + label + `model.name` + `canonicalName` + description + provider + runtime label, and every term must match.
  - **One option builder for both paths (AR-009).** `useChatModelCatalog` owns `toChatModelOption({ runtimeKind, llmModelIdentifier, providerName, catalogModel, runChoice })`. It is the only place Chat builds `{ label, secondary, recommended }`.
    - **Label input**, in precedence order:
      1. The runtime catalog record for `(runtimeKind, llmModelIdentifier)` when present. It carries every field the shared policy reads, including `providerType`. For persisted runs this catalog is loaded by the CR-002 ensure.
      2. Otherwise, `existingRunChoiceLabelInput(choice)` — the existing gear-editor mapping `{ modelIdentifier, name: displayName, canonicalName, description }`, which has no `providerType`. This is for historical or current-only models absent from the catalog.
      - Both paths produce exactly what the launch form (catalog rows) or the gear editor (existing-run rows) shows for the same model.
    - **Recommended:** `catalogModel.selectionPresentation.recommended` when a catalog record exists, else `runChoice.recommended`.
    - **Where it is used:**
      - Catalog rows: `modelGroups`, search, and the New chat / draft footer.
      - The persisted-run fixed list and persisted `modelLabel` in `components/chat/chatRunModelControls.ts` (previously built with `name: choice.llmModelIdentifier`, L92–L125).
    - **Shared mapping:** `existingRunChoiceLabelInput` moves from the local `choiceLabel` in `components/launch-config/RuntimeModelConfigFields.vue` (L218–L219) into `utils/modelSelectionLabel.ts`. The gear editor imports it; the local copy is removed.
  - **Order:** `utils/modelSelectionOptions.ts` exports `compareRecommendedFirst` in a generic form, `compareRecommendedFirstBy<T>(labelOf: (item: T) => string)`, for items with `recommended?: boolean`. `buildModelSelectionGroups` and both Chat paths use it (Claude Agent SDK only), so there is no duplicate comparator.
  - **Search — one predicate owned by `useChatModelCatalog`:**
    - `matchesModelQuery(option, terms)` checks the identifier, label, display name, canonical name, secondary/description, provider and runtime label.
    - `search(query, runtimeKinds)` uses it for cross-runtime search, and `filterOptions(query, options)` for the persisted fixed list.
    - The inline predicate in `ChatModelMenu.vue` (L289–L294) is removed.
  - **Removals:**
    - The identifier-only `name` / `title` fields in `ChatModelOption` become `label` / `secondary` / `recommended`, in both the catalog and fixed-list paths.
    - The inline fixed-list search predicate is removed.
    - The local `choiceLabel` in `RuntimeModelConfigFields.vue` is removed.
    - Nothing keeps the old identifier-as-label shape.
  - **Unchanged:**
    - Menu structure, states and the lock behavior (D-08).
    - Selection identity: the stored value is still `llmModelIdentifier`.
    - The last-used preference (D-12).
    - Launch-form and gear-editor output (same functions).
  - **Recommended badge style:** reuse the launch form's `SearchableGroupedSelect` badge styling (same classes and copy), adapted to the menu row.
  - **Validation (AC-018):**
    - **V-L1:** New chat on Claude Agent SDK → rows show `claude-opus-5-5` + "Opus 5.5 · …" + Recommended, listed first, and the trigger shows the same.
    - **V-L2:** persisted Claude SDK chat (Offline, reopened) → the fixed list and trigger show the same, Recommended first, and searching `Opus 5.5` finds it.
    - **V-L3:** Codex rows show display names.
    - **V-L4:** AutoByteus rows show identifiers.
    - **V-L5:** the gear editor's labels are unchanged (regression).
- - **D-17 — The chat run view is the product agent run view in the workspace frame (R3, SR-013; supersedes the conflicting parts of D-05, D-07, D-08, D-16 and CR-002).**
  - **Frame.** `pages/chat.vue` with an `id` renders the product workspace frame `WorkspaceAdaptiveLayout` (with its extracted `WorkspaceToolShell`, scope `workspace`) for the selected standalone run. The center pane is the standalone-agent branch, `AgentWorkspaceView`.
    - This keeps the full-height `RightSideTabs` column, resize handle, docked width, strip, drawer and the 57 px header line identical to the Team/Org views.
    - `/chat` without an `id` still renders the New chat page (`ChatNewSurface`), unchanged.
    - The `/chat?id` URL, the D-13 route sync, the D-05 routing resolver and the `/workspace` → `/chat` redirect are unchanged, so the Chat nav stays active.
  - **Restored (reverses a D-05 removal):**
    - `components/workspace/agent/AgentWorkspaceView.vue` and its standalone branch in `WorkspaceAdaptiveLayout`.
    - The standalone `showSelectedRunConfig` mode: ⚙ → `RunConfigPanel`.
      - **Persisted runs** (permanent id): `ExistingRunConfigEditor` → `AgentRunConfigForm` in existing-run mode (`existingRunConfigStore`, `runModelConfigEditability`, runtime and workspace fixed).
      - **`temp-*` drafts (AR-011, new; this is not existing behavior).** Today `RunConfigPanel`'s `isSelectionMode = !!selectedRunId` (L115) routes drafts into `ExistingRunConfigEditor`, which calls `loadAgentCanonical('temp-…')` against a server that does not know the id.
        - `RunConfigPanel` gains a draft branch: selected standalone run id `temp-*` → new `components/workspace/config/DraftRunConfigEditor.vue`.
        - It renders the editable `AgentRunConfigForm` (non-existing-run mode) bound directly to the draft `context.config`: runtime selectable, model + schema thinking, Auto approve tools. The workspace is shown and locked (the chat was already created for it).
        - There are no `existingRunConfigStore` calls. Changes apply immediately to `context.config`, and the header back arrow returns to the run view. The first send (or resend after a failed launch, D-04) uses them.
        - It reaches: a catalog "Run agent" draft, and a failed New chat first send on `/chat?id=<temp>`.
    - `WorkspaceHeaderActions` ⚙ ＋. ＋ now calls `chatDraftStore.startNewChat({ agentDefinitionId, workspaceRootPath })` + `/chat` (UIS-013 R3) instead of the old RunConfigPanel draft.
  - **Header.** For standalone targets, `AgentWorkspaceSurface` titles the run with its run summary (the first-message title, ≤42 chars, via the existing run summary) and keeps `AgentStatusDisplay` and the header actions. Org direct-agent targets keep their current title. There is no agent · workspace · approval line.
  - **Box after the first message.** The standalone `AgentEventMonitor` keeps the product `AgentUserInputForm` (same geometry as the Team view: mic and send/stop inside the textarea, no footer) with **standalone skill tagging** enabled:
    - `AgentUserInputForm` / `AgentUserInputTextArea` accept an optional `skillTagging` capability `{ skills }`, supplied only by `AgentWorkspaceView` for standalone targets.
    - With it, the textarea offers the `/` menu (`ChatSkillMenu`, reused) and a skill-chip row that writes `AgentContext.requestedSkillNames` (D-09 unchanged).
    - Team/org callers pass nothing, so their behavior is unchanged.
  - **Model/thinking after the first message:** only in ⚙ (product existing-run editor, `runModelConfigEditability`), per REQ-011 R3.
  - **Right panel state.** `useRightPanel` returns to one shared visibility preference (default open). The `chat` scope and `setActiveRightPanelScope` are removed.
  - **Strip → exact tab (shared owner, pre-existing defect).**
    - Cause: `components/layout/RightSideTabs.vue` runs its contextual watcher (`activeMessagesScopeKey`, `{ immediate: true }`) on mount, forcing `teamMembers` (team) or `progress` (standalone) and overriding the tab the strip click just set.
    - Constraints: `activeTab` is module-global, `teamMembers` is invisible without a collaboration scope, and `/workspace` and `/chat` remount `RightSideTabs` (ARCH-REV-009 MP-016).
    - Rule (AR-010):
      - `useRightSideTabs` owns `contextualScopeKey`: the collaboration scope key when present, else `standalone:<runId>` for a standalone target, else `null`. It also owns `lastAppliedScopeKey`.
      - Whenever `RightSideTabs` mounts **or** `contextualScopeKey` changes, and `contextualScopeKey !== lastAppliedScopeKey`, it applies the contextual default (`teamMembers` for a collaboration scope, `progress` for standalone) and records `lastAppliedScopeKey`.
      - **Exception:** an explicit selection made through `selectTabExplicitly(tab)` (strip or tab-bar click) in the same open action wins. The pending explicit tab is consumed at mount, `lastAppliedScopeKey` is set to the current key, and no default overrides it.
      - The `visibleTabs` validity watcher becomes `immediate`, so on mount an invisible active tab is always replaced (explicit tab → contextual default → first visible).
    - This applies to Chat, Team and Org alike.
    - Validation:
      - Team (Team members) → a chat opens on a visible tab (Activity), never blank.
      - A chat (Files) → Team opens on Team members.
      - Strip Files and Terminal clicks open exactly those tabs in Chat and Team.
      - Reopening the same run keeps its current tab.
  - **Removals (clean cut):**
    - `components/chat/ChatRunView.vue` and `ChatRunHeader.vue`.
    - The run-view mode of `ChatComposer` and its footer; `ChatComposer` is now New-chat-only.
    - `components/chat/chatRunModelControls.ts` persisted mode, the fixed model list and the footer lock, including the CR-002 run-footer thinking-schema load, which is now moot. Its draft mode moves into the New chat surface if it is still needed.
    - The `useChatModelCatalog.toChatModelOption` `runChoice` branch and `filterOptions` for fixed lists, since there is no persisted Chat menu. The gear editor keeps the shared `existingRunChoiceLabelInput`.
    - The `useRightPanel` chat scope.
    - The Removal Plan rows for `AgentWorkspaceView`, the standalone `showSelectedRunConfig` and the header actions are **withdrawn** (restored by D-17).
  - **Unchanged:**
    - The New chat page, footer, menus, `@` and `/`; D-03, D-04, D-06, D-09 to D-16 for the New chat and server paths.
    - D-13, D-14, D-15; REQ-021 labels in the New chat menu.
    - The Team/Org views apart from the strip-tab fix.
  - **Validation:**
    - Visual fidelity with VIS-015, VIS-016, VIS-017, VIS-018, VIS-019, VIS-026 and VIS-027.
    - The frame geometry equals the Team view (header right edge = tabs column left edge; column top = 0; shared 57 px line).
    - The strip Files/Terminal clicks open those tabs in Chat and Team (CHK-015).
    - ⚙ is locked while live and editable after Offline, with Save → resume on the new model (AC-009).
    - ⚙ on a `temp-*` draft (catalog "Run agent", and a failed New chat first send) → `DraftRunConfigEditor` → change runtime/model → back → send uses the new config, with no server call before the send.
    - `/` in the run view box.
    - ＋ opens a preset New chat.
    - The collapsed state is shared across Team and Chat.
- **D-18 — A New chat records explicit model-config defaults (CRR-010 CR-008 / UF-03, SR-015).**
  - Today a New chat with default thinking launches with `llmConfig: null`. The live, read-only ⚙ then shows "Not recorded for this historical run" (`ModelConfigSection.showMissingHistoricalConfig`), not VIS-026's disabled values.
  - **Rule:** the chat draft's `config.llmConfig` always holds the same non-thinking schema defaults the launch form records for that model, **plus** the model's default thinking parameters recorded explicitly. The launch form skips thinking keys; see ARCH-REV-011 IC-3. Whenever the draft model is set (the initial default, a menu pick, or a preset), `chatDraftStore` sets it to the schema defaults plus the model's default thinking parameters. The thinking control then edits those explicit values.
    - A model without a config schema keeps `null`.
    - The team quick path's root `llmConfig` uses the same value.
  - **Shared owner:** the non-thinking default computation in `ModelConfigSection.applyDefaultsIfNeeded` (L255–L282) moves into `utils/llmConfigSchema.ts` as `applyModelConfigSchemaDefaults(schema, config)`, a pure function. `ModelConfigSection` and `chatDraftStore` both call it. The default thinking parameters come from the existing `llmThinkingConfigAdapter` default state, with no duplicate logic.
  - **Unchanged:** the editor's historical rule for genuinely unrecorded historical runs.
  - **Validation:** after a New chat with default thinking, live ⚙ shows the disabled current values (VIS-026) and never "Not recorded"; the recorded `llmConfig` has the launch form's non-thinking defaults for the same model, plus explicit default thinking parameters (IC-3).
- **D-19 — One skill per name, decided at load; duplicates blocked at import (REQ-022–024, DEC-017, SR-016).**
  - **Single catalog owner:** `SkillService`.
    - `listInstalledSkillRecords()` becomes **the** installed-skill catalog: exactly one record per name, with `{ skill, origin, trustedRoot, configuredRoot, tier, sourcePath }`.
    - A companion `listSkillNameIssues()` returns the ignored copies: `{ name, usedPath, ignoredPaths, kind: 'conflict' | 'shadowed_runtime_default' }`.
  - **Precedence (tier, then order within the tier):**
    1. `config.getSkillsDir()`, AutoByteus's own skills.
    2. Definition-root bundles: the app data dir (built-in + user agents/teams/orgs), then `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` in order. Within a root, in this order:
       - `agents/*` by name;
       - `agent-teams/*` by name (each team's shared `skills/`, then its local agents' `skills/`);
       - **`agent-orgs/*` by name (SR-018, CR-009):** each org's org-owned agents `agent-orgs/<o>/agents/<a>/skills/*` by name, then its org-owned teams `agent-orgs/<o>/agent-teams/<t>/` (the team's shared `skills/`, then its local agents' `agents/<a>/skills/`) by name.
         - Org-owned agent and team directories are enumerated with the exact owned-source correlation, synchronously (AR-014, option a).
           - The correlation logic currently inside the async `listAgentOrgOwnedDefinitionSources` moves into one pure core, `correlateAgentOrgOwnedMembers({ subject, orgRoot, orgDirName, config, orgDefinitionName, localDirNames })`, in `agent-org-definition/providers/agent-org-owned-definition-correlation.ts`. It covers the `org_local` + `refType` member filter, the `candidateIds` match, exactly-one-match handling (a malformed correlation skips only that member), the per-subject `seen` set and the path construction. It does no I/O.
           - Two thin I/O readers in `agent-org-owned-definition-source-index.ts` call that core: they read `org-config.json` / `org.md`, list `agents|agent-teams`, and skip unreadable orgs, as today.
             - The existing **async** `listAgentOrgOwnedDefinitionSources` (`fs/promises`) keeps serving the definition providers and admission, so their request paths stay non-blocking. Its signature is unchanged.
             - A new **sync** `listAgentOrgOwnedDefinitionSourcesSync` (`fs` sync) serves the skill catalog, which is already synchronous: `readSortedDirectoryEntries` and `loadCatalog`.
             - There is one correlation owner and no duplicated member matching. The catalog stays synchronous, so no `SkillService` method or caller changes signature. That keeps unchanged GraphQL `skills.ts` L154, `skill-workspace.ts` L24, the Claude/Codex/ACP/AGY bootstrappers and factories, `validateIncomingSkillNames` and `resolveCatalogRecord`.
           - Org roots come from config: `config.getAgentOrgsDir()` + `<packageRoot>/agent-orgs`, the same rule as the definition providers' `getReadOrgRoots`.
         - **Team-local agents inside an org-owned team** are enumerated exactly like an ordinary team's: the team directory's `agents/*` subdirectories, via the existing `getAgentSkillDirectories(path.join(teamDir, 'agents'))`. This is directory-based, not read from the team config. Org-owned agents' skills come from each correlated agent `definitionDir`, and org-owned teams' shared skills from `<definitionDir>/skills/*`.
         - The Org format defines no org-level `skills/` folder, so none is scanned. Adding one would be a separate format change.
    3. `AUTOBYTEUS_SKILLS_PATHS` entries that are not runtime-default folders, in Settings order.
    4. Runtime-default folders, only if added:
       - `$CODEX_HOME/skills` (default `~/.codex/skills`), `~/.claude/skills`, `~/.agents/skills`, `~/.grok/skills`.
       - These are identified by realpath equality through a new `skills/services/runtime-default-skill-folders.ts`.
       - They always come after tiers 1–3, whatever the Settings order.
    - The first record per name wins. A later same-name copy is recorded as an issue: `conflict` if both copies are in tiers 1–3, `shadowed_runtime_default` if the ignored copy is in tier 4.
    - `listSkills()`, the Skills page, `skillStore`, the `/` menu and ALL_INSTALLED all read this catalog.
  - **One resolution for every scope (removes the second rule).**
    - `CONFIGURED` skill names resolve **by name against the catalog**: `SkillService.resolveCatalogRecord(name)` → record or unresolved.
    - `ConfiguredAgentSkillResolver`'s per-agent contextual resolution (agent-private → team → `getGlobalSkill`) is removed for installed agents.
    - Both the regular and detailed (AGY) bindings are built from catalog records, the same as ALL_INSTALLED, reusing the existing provenance checks. For AGY, a record's trusted/configured roots follow the D-11 layout table.
    - Consequence (accepted by DEC-017): an agent that ships its own copy of a name uses it only if that copy is the catalog's. REQ-023 prevents such duplicates among custom sources.
    - **Boundary:** application-owned agents (`ownershipScope: 'application_owned'`) keep resolving their app-bundled skills from their application bundle first, then the catalog. Applications are sandboxed bundles, not installed skills.
  - **Agent Org layouts, AGY provenance (SR-018).** These have the same semantics as the D-11 table, and each passes the existing `assertDetailedCandidateProvenance` layout checks unchanged:
    - `<root>/agent-orgs/<o>/agents/<a>/skills/<n>` → `agent_private`; trusted/configured root = `<root>/agent-orgs/<o>/agents/<a>` (layout `skills/<n>`).
    - `<root>/agent-orgs/<o>/agent-teams/<t>/skills/<n>` → `team_shared`; trusted/configured root = `<root>/agent-orgs/<o>/agent-teams/<t>` (layout `skills/<n>`).
    - `<root>/agent-orgs/<o>/agent-teams/<t>/agents/<a>/skills/<n>` → `agent_private`; trusted/configured root = `<root>/agent-orgs/<o>/agent-teams/<t>` (layout `agents/<a>/skills/<n>`).
    - So agents, teams and orgs behave the same:
      - an org agent's own skill is in the one catalog;
      - it resolves by name for that agent (and for everyone else, as with teams);
      - it is listed on the Skills page, which was never the case before, even on `personal`;
      - it is covered by import validation.
  - **Every name-based skill operation uses the catalog (AR-013).**
    - `SkillService.getSkill(name)` returns `resolveCatalogRecord(name)?.skill`, the used copy. That covers the GraphQL `skill(name)` query, the file tree, `updateSkill`, `deleteSkill`, enable/disable, `uploadFile` / `readFile` / `deleteFile`, `getSkills` (L208) and `workspaces/skill-workspace.ts`.
      - Opening, editing, deleting, enabling/disabling and file operations therefore **always act on the used copy**, never on an ignored duplicate.
    - Removed (clean cut): `findCatalogSkillLocation` (L95), `findGlobalSkillLocation` (L85), `getGlobalSkill` (L122), and the resolver's `resolveGlobalSkill` / `globalCandidatePaths` name searches.
      - Any remaining lookup of a directory by name (`searchConfiguredSkillCandidate`, `searchBundledSkillDirectory`) is used only inside the catalog build or the application-owned boundary, never for installed-skill operations.
    - Ignored copies are **not** addressable by name. They appear read-only, with their paths, in the Skills page banner details (REQ-024). To change or remove one, the user edits the files at that path or resolves the duplicate.
    - Enable/disable stays keyed by name, so it applies to the used copy. Ignored copies are never loaded.
  - **Import validation (REQ-023).** `SkillService.validateIncomingSkillNames(incoming: { sourcePath, tier })` computes the prospective catalog and returns conflicts among tiers 1–3 as `{ name, existingPath, incomingPath }`, plus shadow notices for tier 4.
    - **Callers**, each validating **before** committing, so a rejected operation changes nothing:
      - `SkillService.addSkillSource` (reject before persisting `AUTOBYTEUS_SKILLS_PATHS`). Adding a runtime-default folder never conflicts; it returns shadow notices.
      - `AgentPackageService.importAgentPackage`:
        - local path: validate before registering;
        - GitHub: validate the downloaded tree before recording the package, and delete the download on rejection.
      - `AgentPackageService.updateAgentPackage` (validate the new revision before switching) and `reloadAgentPackage`.
        - Reload semantics (R-3): a reload cannot undo files already on disk (e.g. after an out-of-band `git pull`). A rejected reload therefore shows the pop-up and keeps the package's previous registration record. The catalog and the Skills banner still reflect the on-disk state per REQ-024: one used copy per name, the conflict listed.
      - `SkillService.createSkill`: its existing own-folder check is extended to the whole tiers 1–3 catalog.
      - The prospective catalog used for validation includes Agent Org layouts. An agent package import/update/reload whose `agent-orgs/**/skills/*` names duplicate existing tier 1–3 names is rejected the same way (SR-018).
    - **Error contract:** a GraphQL error with message `Duplicate skill names: <names>` and `extensions: { code: 'SKILL_NAME_CONFLICT', conflicts: [{ name, existingPath, incomingPath }] }`. Successful mutations may return `skillNameNotices` for tier-4 shadows.
  - **Safety net (REQ-024).** Out-of-band changes (git pull, Finder copy, Codex installing into its folder) are not imports.
    - Loading still yields one record per name.
    - `listSkillNameIssues()` is logged at catalog load, and a new GraphQL query `skillNameIssues` feeds a Skills page banner.
  - **Codex native discovery (AF-36).** Codex also reads its own default folder, and it does not de-duplicate same-named skills (openai/codex#25324).
    - `codex-thread-bootstrapper.planWorkspaceSkillRequests` treats a name as `reconcile-discoverable` only when Codex's `skills/list` entry path (realpath of its `SKILL.md` directory) equals the catalog record's root.
    - Otherwise it uses `expose-resolved`, so the chosen copy is linked into the workspace, and it logs `codex-runtime-duplicate` (name, Codex path, chosen path).
    - The Skills page shadow notice recommends removing stale runtime-default copies, because Codex may still show both copies inside Codex runs. This is a residual risk outside AutoByteus.
  - **Materializer simplification.** From D-15 only Rule 1 remains (`workspaceCollisionPolicy`).
    - Removed: `requestStrength`, strong/weak holder counts, re-pointing, `yielded-to-configured`, `skipped-held-by-other-run`, and Rule 3 `skipped-unresolved-held-by-weak`.
    - Also removed: `workspace-skill-links.ts` re-point helpers not needed by Rule 1 and the unchanged base behavior, plus the IC-2 Windows re-point fallback.
    - The registry's pre-existing `sourceCollisionError` remains only for a mid-run out-of-band catalog change (residual: fail-fast with a clear message).
  - **Web — the error pop-up** (designed here; the user waived Product design).
    - `components/skills/SkillNameConflictDialog.vue` is built on the existing `components/common/Modal.vue` overlay.
    - Title: "Duplicate skill names".
    - Body: "These skills already exist in another location. Each skill name must be unique. Rename or remove one copy, then try again."
    - One row per conflict: the **name** in bold, then "Already installed: `<existingPath>`" and "New: `<incomingPath>`" in monospace, truncated with the full path in a tooltip.
    - A single primary "OK" button. Esc and a backdrop click close it.
    - It opens from `SkillSourcesModal` (add folder), `AgentPackagesManager` (import/update/reload) and skill creation whenever the mutation error has `code === 'SKILL_NAME_CONFLICT'`. The stores parse `extensions.conflicts` instead of flattening the message.
    - Tier-4 notices use the existing toast: "Ignored N skills from the Codex default folder because your own copies take precedence."
  - **Web — Skills page banner** (`SkillsList.vue`): when `skillNameIssues` is non-empty, an amber banner reads "Some skills share a name. AutoByteus uses one copy per name." with "Show details" listing name → used path / ignored paths. `conflict` rows ask the user to fix them; `shadowed_runtime_default` rows are informational.
  - **Validation:**
    - The catalog precedence covers all four tiers, including the real layout: `~/.codex/skills` vs `autobyteus-skills` duplicates → `autobyteus-skills` wins.
    - A CONFIGURED agent and Daily Assistant resolve the same path for the same name.
    - V-F rerun: the desk-package team next to a live Daily Assistant resolves `desk-alpha` from the catalog and starts, with no special rule.
    - Each import path is rejected with nothing changed and the pop-up shown; a runtime-default duplicate is accepted with a notice.
    - The out-of-band duplicate banner.
    - Codex: a stale `~/.codex/skills` duplicate → the chosen copy is exposed and `codex-runtime-duplicate` is logged.
    - Regression: application-owned agents still resolve their app-bundled skills.
    - AR-013, with a tier-4 vs tier-3 duplicate (a `~/.codex/skills` copy vs `autobyteus-skills`, different contents) and a tier-2 vs tier-3 duplicate: GraphQL `skill(name)`, the file tree, `readFile`, `updateSkill` and `deleteSkill` all act on the used copy (the catalog winner); the ignored copy's files stay untouched; the banner lists the ignored path.
    - A rejected reload keeps the previous registration, and the banner shows the on-disk conflict.
    - **Agent Org (SR-018)**, with a test package containing an org-owned agent and an org-owned team (with a team-local agent), each with its own `skills/<unique-name>`:
      - each org agent runs with its own skill resolved (AutoByteus catalog / Codex / Claude materialization / AGY capsule);
      - the Skills page lists these skills with their org paths;
      - importing a second package with a same-named skill is rejected with the pop-up;
      - regression: this restores the `personal` behavior where an org agent's `<agentDir>/skills/<name>` was used.
- **D-12 — Last-used model.** One device-local value records the runtime and model. It is used as the New chat default, then the Daily Assistant default launch config, then the runtime default.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Approved Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-020; AC-001, AC-017 | App start; nav click | AF-01, AF-02 | Chat first in nav; `/` → `/chat` | DS-001 |
| BEH-005 | User | REQ-002, 003, 007, 016; AC-002 | Chat → type → send | AF-07, AF-08 | Normal Daily Assistant run in the chat view | DS-001, DS-003 |
| BEH-003 | User | REQ-005, 006, 019; AC-004, 005, 016 | Model button / thinking button | AF-12 | Compact menu, schema thinking, last-used default | DS-006 |
| BEH-004 | User | REQ-004; AC-003 | Workspace button | AF-22 | Temp default; pick or open folder before send | DS-001 |
| BEH-007 | User | REQ-008; AC-006 | `/` in the Chat box | AF-13–15 | Tags → instruction in content; chips on the message | DS-009 |
| BEH-008 | User | REQ-009; AC-007 | `@` / tree `+` | Tree `+` → draft (AF-07) | New chat addressed to the agent, preset workspace | DS-001 |
| BEH-009 | User | REQ-010; AC-008 | `@team` → send | AF-10 | Uniform team launch, coordinator, Team view | DS-002 |
| BEH-010 | User | REQ-011; AC-009 | Offline run → footer model | AF-11 | Locked while live; saves through the existing owner; runtime fixed | DS-005 |
| BEH-011 | User | REQ-012; AC-010 | Open a single-agent run | AF-03–05 | Chat view with the tool strip collapsed; team/org unchanged | DS-003 |
| BEH-012 | User | REQ-013; AC-011 | Attach / dictate | AF-06 | Same box and Context Files area plus Chat features; team/org unchanged | DS-004 |
| BEH-013 | User | REQ-014; AC-012 | Shield toggle | `autoExecuteTools` | Default Auto-approve for new chats | DS-001, DS-002 |
| BEH-014 | User | REQ-015; AC-013 | Tree actions | Existing | Chats are normal rows; missing id state | DS-003 |
| REQ-007 (system) | System | REQ-007 | Server startup; run start | AF-16, AF-17 | Built-in Daily Assistant; `ALL_INSTALLED` expansion | DS-007, DS-008 |
| REQ-017 | User | AC-014 | Catalog launch forms | Existing | Unchanged forms. A standalone run started from `RunConfigPanel` opens in the chat view (D-05) | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/ui-ux-spec.md` (R2) | Normative UI/UX | REQ-001–020 | Visual, copy and state authority; this design maps it onto production owners | Approved R2 |
| `…/visual-references/` VIS-001–025 (no VIS-020) + `manifest.json` | Normative visuals | REQ-018 | Implementation fidelity target | Approved R2 |
| `…/ui-behavior-test-matrix.md` | Behavior checks | ACs | Validation input | Supporting |
| Prototype source `autobyteus-web-prototype@8ac6cad` `components/chat/*`, `pages/chat.vue` | Visual reference implementation | REQ-018 | May be consulted for markup and styling. Prototype state (`usePrototypeChat`, fixtures, `chatTreeProjection`) must not be ported | Supporting |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
  - Message-box components own their target selection implicitly.
  - `WorkspaceAdaptiveLayout` mixes center-view selection with the right-panel shell.
  - Standalone-run routing is hard-coded to `/workspace` in several callers.
- Refactor needed now: `Yes`
- Evidence: AF-06, AF-03, AF-19, AF-02.
- Design response:
  - Introduce an explicit `ComposerTarget` boundary.
  - Extract `WorkspaceToolShell`.
  - Centralize run-route resolution in `workspaceNavigationService`.
  - Move skill effective-resolution ownership fully into SkillService.
- Refactor rationale: without these, Chat would either duplicate the box (violating DEC-014) or register visible draft rows (violating TR-001). It would also duplicate the right-panel machinery, or add route special cases in the left panel, the tree and the links.
- Intentional deferrals and residual risk:
  - Mobile runtime (`MobileRemoteAccessShell`, `useMobileRunLaunchCoordinator`) is out of scope and unchanged.
  - Application-owned agents keep `CONFIGURED` validation.

## Terminology

- **Chat draft:** the unregistered `AgentContext` plus target, workspace and approval state behind the New chat page.
- **Composer target:** `{ key, context, draftOwner, access, send, interrupt }`. This is the single input the message-box pieces bind to.
- **Skill scope:** a definition-level choice between configured skill names and all installed, enabled skills.
- **Effective skills:** the skills SkillService resolves for a definition after applying its skill scope.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: the in-scope obsolete paths are listed under Removal / Decommission Plan. Nothing is kept as a fallback.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- **Stored subjects:**
  1. `agents/<id>/agent-config.json` (per agent, JSON).
  2. The new `agents/autobyteus-daily-assistant/` folder.
  3. A browser-local chat last-model preference.
- **Code-model change:**
  - An optional `skillScope` field (`"CONFIGURED"` | `"ALL_INSTALLED"`).
  - A new built-in agent folder.
  - A new localStorage key `autobyteus.chat.lastModel`.
- **Normal reader and writer behavior:** `agent-definition-config.ts` normalizes known fields from JSON and ignores unknown ones. A missing `skillScope` normalizes to `CONFIGURED`. The writer persists the normalized value.
- **Required semantics under direct use:** existing agents keep exactly their configured skills.
- **Constraints:** the built-in seed must never overwrite a user-edited Daily Assistant.
- **Decision:** `Directly Usable — No Migration` for agent-config.json. The built-in folder and the preference are new data.
- **Rationale:** absent means `CONFIGURED`, which is the current behavior. There is nothing to transform. `data_migration_guideline.md` is not triggered.
- **Supported ACs and constraints:** AC-014 (catalog agents unchanged), REQ-007.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, 004, 005, 008, 013 | Chat nav / pencil / `/` / tree `+` | Live run streaming in the chat view, with a selected tree row | `chatLaunchService` (launch); `agentRunStore` (first send) | Core Chat journey |
| DS-002 | Primary | BEH-009 | New chat with a team target → send | Team run in the Team view, coordinator focused | `chatLaunchService` → `agentTeamRunStore` | Team quick path |
| DS-003 | Primary | BEH-011, 014, REQ-017 | Tree row / execution link / `RunConfigPanel` launch / reload of `/chat?id=` | Chat view for that run | `workspaceNavigationService` (route); `pages/chat.vue` (open) | Option B routing |
| DS-004 | Primary | BEH-007, 012 | Reply in the chat view | Message sent and streamed | `activeContextStore` → `agentRunStore` | Existing send reused |
| DS-005 | Primary | BEH-010 | Footer model/thinking on an Offline run | Saved run model config; applied at resume | `existingRunConfigStore` | Existing owner reused |
| DS-006 | Bounded local | BEH-003 | Model button | Selected runtime + model (+ default thinking) | `useChatModelCatalog` | Menu data and search |
| DS-007 | Primary (system) | REQ-007 | Server startup | Daily Assistant definition resolvable | `BuiltInAgentBootstrapper` | Built-in provisioning |
| DS-008 | Primary (system) | REQ-007 | Run backend creation | Runtime receives effective skills | `SkillService` | All-installed skills |
| DS-009 | Return/Event | BEH-007 | Send with tags / history reload | Chips + "sent as" tooltip on the user message | `skillRequestInstruction` codec | Symmetric compose and parse |

## Primary Execution Spine(s)

- DS-001: `AppLeftPanel Chat / pencil / index redirect / tree + → pages/chat.vue (New) → chatDraftStore (draft context + target + workspace + approval) → ChatComposer send → chatLaunchService.launchAgentChat → agentContextsStore.registerDraftRun + selection → agentRunStore.sendUserInputAndSubscribe → PrepareAgentRun (server) → WS SEND_MESSAGE → runtime → router /chat?id=<runId> → ChatRunView`
- DS-002: `ChatComposer send (team target) → chatLaunchService.launchTeamChat → teamRunConfigStore.createDraft(uniform root config, coordinator) + selection team_draft → agentTeamRunStore.sendMessageToFocusedMember(text, attachments, { attachmentDraftOwner }) → launchDraft (server) → WS → router /workspace → TeamWorkspaceView`
- DS-003: `Tree row / execution link / selection change → workspaceNavigationService.resolveSelectionRoute → /chat?id=<runId> → pages/chat.vue ensureRunOpen (mounted → select; else openAgentRun) → ChatRunView (ChatRunHeader + WorkspaceToolShell[chat] + AgentEventMonitor #composer=ChatComposer)`
- DS-004: `ChatComposer (active composer target) → activeContextStore.send → agentRunStore.sendUserInputAndSubscribe (compose skill instruction) → WS SEND_MESSAGE`
- DS-005: `ChatModelMenu / ChatThinkingControl (existing run) → chatRunModelControls → existingRunConfigStore.loadAgentCanonical / updateAgentModelConfig / save → server run model config mutation (runModelConfigEditability) → next send resumes`
- DS-007: `Server startup → bootstrapBuiltInAgents → BUILT_IN_AGENT_DEFINITIONS (daily-assistant, seedIfMissing) → agents dir → AgentDefinitionService cache`
- DS-008: `Run backend factory (autobyteus / codex / claude / agy) → SkillService.resolveConfiguredSkillBindingsForAgent(Detailed) → effective skill names (skillScope) → resolver → catalog / materializer`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Opening Chat creates a fresh chat draft: an unregistered `temp-*` context configured for Daily Assistant (or the preset agent), with the temp workspace, Auto-approve and the last-used model. The composer edits it, and uploads go under the draft id. Send registers and selects the context and runs the existing first-send path. After promotion the route becomes `/chat?id=`, and the tree shows the row. | Chat draft, AgentContext, AgentRun | `chatLaunchService`, `agentRunStore` | Last-model preference; workspace creation; skill codec |
| DS-002 | For a team target, the chat draft's shared settings become a root-only team launch draft focused on the coordinator. The existing team send launches it and moves attachments from the chat draft owner. The user lands in the Team view. | Team launch draft, TeamRun | `chatLaunchService`, `agentTeamRunStore` | Attachment source owner |
| DS-003 | Any standalone-agent selection resolves to `/chat?id=`. The chat page ensures that the run is open and renders the chat run view with the shared tool shell. Team and org selections still resolve to `/workspace`. | Selection, run route | `workspaceNavigationService`, `pages/chat.vue` | Missing-run state; right-panel scope |
| DS-004 | Replies use the same active-context send. The agent run store composes the skill instruction and clears the tags. | AgentContext, message | `agentRunStore` | Skill codec |
| DS-005 | For an Offline run the footer loads the canonical run config and saves the chosen model and thinking through the existing store. While the run is live the controls are inert. | Run model config | `existingRunConfigStore` | Lock presentation |
| DS-007 | Startup seeds Daily Assistant only when its files are missing, so user edits persist. The other built-ins keep overwrite. | Built-in definition | `BuiltInAgentBootstrapper` | Template files |
| DS-008 | Every runtime asks SkillService for effective skills. `ALL_INSTALLED` expands to the installed, enabled skills at run start. | Agent definition, Skill | `SkillService` | Resolver provenance (AGY) |
| DS-009 | Tags are carried as a canonical sentence prefix. One codec composes it on send and parses it wherever a user message renders. | Message content | `skillRequestInstruction` | — |

## Spine Actors / Main-Line Nodes

`AppLeftPanel`, `pages/chat.vue`, `chatDraftStore`, `ChatComposer`, `chatLaunchService`, `agentContextsStore`, `agentRunStore`, `agentTeamRunStore`, `teamRunConfigStore`, `workspaceNavigationService`, `ChatRunView`, `existingRunConfigStore`, `BuiltInAgentBootstrapper`, `SkillService`.

## Ownership Map

- **`chatDraftStore`** (new; thin state owner): owns the New chat draft lifecycle.
  - It creates and resets the draft context (`temp-*` id, config), target (default / agent / team), workspace selection, approval flag and requested skill names.
  - It does not send or route.
- **`chatLaunchService`** (new; governing owner for launch): validates readiness (target, runtime availability, model, workspace) and resolves the workspace (existing, or creates one from a folder path).
  - It performs the agent or team launch through existing owners and reports the destination route.
  - It records the last-used model on success.
- **`agentContextsStore`** (extended): adds `registerDraftRun(context)`, which registers a prepared temp context and selects it. This replaces `createDraftRun` for the tree.
- **`agentRunStore`** (extended): remains the only standalone send owner. It composes the skill instruction and clears tags.
- **`agentTeamRunStore`** (extended): `sendMessageToFocusedMember` accepts an optional explicit `attachmentDraftOwner`, which is used for finalization.
- **`workspaceNavigationService`** (extended): the single authority for run routes.
  - `resolveSelectionRoute`: agent → `/chat?id`, team/org → `/workspace`.
  - `buildWorkspaceExecutionRoute` for agent links returns the chat route.
- **`pages/chat.vue`** (new): a route owner. It shows the New chat surface, the run view or the missing state, and makes sure a run id is opened and selected. Through `useChatRouteRunSync` it also keeps the route id in sync across temp → permanent promotion (D-13).
- **`ChatComposer`** (new): presentation and assembly over a `ComposerTarget`. It owns no send policy.
- **`ComposerTarget`** (new type + active resolver in `composables/agentInput/useComposerTarget.ts`): the active-context target from `activeContextStore.activeWorkspaceTarget`.
  - The chat-draft factory is chat-owned: `composables/chat/chatDraftComposerTarget.ts`, whose send calls `chatLaunchService`.
- **`voiceInputStore`** (modified): the caller supplies the transcript target for `composer` recordings. There is no active-context read.
- **`WorkspaceToolShell`** (extracted): owns the right dock, strip, drawer and resize for a center slot, with a visibility scope.
- **`existingRunConfigStore`** (reused as is): model edits for persisted runs only.
- **`BuiltInAgentBootstrapper`** (extended): applies a per-definition sync policy.
- **`SkillService`** (extended): the single owner of the installed skill catalog (`listInstalledSkillRecords`) and of effective skill resolution, including skill scope.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentUserInputForm.vue` | Active `ComposerTarget` + extracted input pieces | Keeps team/org call sites unchanged | Target selection policy beyond calling the active resolver |
| `pages/chat.vue` | `chatDraftStore`, `chatLaunchService`, navigation service | Route entry | Launch or send logic |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `components/workspace/agent/AgentWorkspaceView.vue` and its branch in `WorkspaceAdaptiveLayout` | Standalone runs open in the chat view (D-05) | `ChatRunView` via `/chat?id` + redirect | In This Change | `AgentWorkspaceSurface` stays (org). Remove its i18n keys and tests — **Withdrawn by D-17 (restored)** |
| `runHistoryStore.createDraftRun` + `createDraftRunForHistoryStore` + `onCreateRun` draft path in `useWorkspaceHistorySelectionActions` | Tree `+` now starts a preset New chat (REQ-009) | `chatDraftStore.startNewChat({ agentDefinitionId, workspaceRootPath })` + route `/chat` | In This Change | Update `workspace-history-draft-send.integration.test.ts` |
| Direct `activeContextStore` reads inside `ContextFilePathInputArea.vue` / `AgentUserInputTextArea.vue` | Explicit `ComposerTarget` | `useComposerTarget` | In This Change | Behavior unchanged for team/org |
| Absolutely positioned mic/send markup inlined in `AgentUserInputTextArea.vue` | Extracted reusable buttons | `VoiceInputButton.vue`, `MessagePrimaryActionButton.vue` | In This Change | Same positions in the run-view box |
| Right-panel dock/strip/drawer code inside `WorkspaceAdaptiveLayout.vue` | Extracted shell | `WorkspaceToolShell.vue` | In This Change | — |
| `/workspace` agent execution-link handling (`workspaceExecutionKind=agent` built by `buildWorkspaceExecutionRoute`) | Agent links go to chat | `buildAgentRunChatRoute` | In This Change | Links are ephemeral route queries, not persisted |
| `voiceInputStore` capture of the composer target from `useActiveContextStore().activeAgentContext`, and the bare `VoiceInputRecordingSource` string parameter | Explicit target (AR-004) | Discriminated recording request | In This Change | Settings test recording behavior unchanged |
| Standalone-agent `showSelectedRunConfig` config mode in `WorkspaceAdaptiveLayout` (RunConfigPanel for a selected standalone run) and the `AgentWorkspaceView` header actions (`new-agent`, `edit-config`) | The chat view has no standalone gear or new-agent action | Chat footer (D-08); pencil / tree `+` for new chats | In This Change | Team/org config modes unchanged — **Withdrawn by D-17 (restored)** |
| Consumers using `definition.skillNames.length` to decide skill use (`autobyteus-agent-run-backend-factory.ts`, `agy-agent-run-backend-factory.ts`) | Effective skills owned by SkillService | `SkillService.hasEffectiveSkills` / resolution | In This Change | — |
| `index.redirecting_to_agent_management` copy | Landing changes | "Opening Chat..." key (en, zh-CN) | In This Change | — |

## Return Or Event Spine(s) (If Applicable)

- DS-009:
  - Send path: `requestedSkillNames + requirement → skillRequestInstruction.compose → WS content → runtime`.
  - Render path: `(live local submission | history projection) → UserMessage → skillRequestInstruction.parse → SkillRequestChips + text + "SENT TO THE AGENT AS" tooltip (full content)`.
- Run status events → `AgentContext.state.currentStatus` → `ChatRunHeader` status (Running / Idle / Offline) and footer lock. This is the existing stream.

## Bounded Local / Internal Spines (If Applicable)

- **`ChatMessageInput`** (parent `ChatComposer`): `keystroke → trigger detection (/ or @ at word start) → menu open (ChatSkillMenu | ChatTargetMenu) → ↑↓ / Enter / Tab / Esc → apply (add tag | set target) → remove the typed token`.
- **`useChatModelCatalog`** (parent `ChatModelMenu`): `open → runtime availability (cached) → hover/open runtime → ensure that runtime's catalog (cached per runtime) → list`. Search: `ensure all enabled catalogs → filter → label by runtime`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spines | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `chatLastModelPreference` (utils) | DS-001, DS-006 | `chatLaunchService`, `chatDraftStore` | Read/write `{ runtimeKind, llmModelIdentifier }` in localStorage | REQ-019 | Mixing storage into UI menus |
| `skillRequestInstruction` codec | DS-004, DS-009 | `agentRunStore`, `UserMessage` | `compose(names, text)`, `parse(content)` | One wording owner | Wording drift between send and render |
| `useChatModelCatalog` | DS-006 | `ChatModelMenu` | Availability, per-runtime catalogs, cross-runtime search | RSK-001 containment | Catalog fan-out inside components |
| `useComposerTarget` (agentInput) / `chatDraftComposerTarget` (chat) | DS-001, DS-004 | Box pieces, voice | Target resolution | D-02 | Hidden global reads; agentInput → chat dependency |
| `useChatRouteRunSync` | DS-001, DS-003 | `pages/chat.vue` | Route id replace on promotion | D-13 | Launch-only routing that misses other send paths |
| Workspace resolution (`workspaceStore.createWorkspace`) | DS-001, DS-002 | `chatLaunchService` | Folder → workspace id | REQ-004 | — |
| Right-panel visibility scope (`useRightPanel`) | DS-003 | `WorkspaceToolShell` | Per-scope visibility | Chat default collapsed | Global preference flipping team view |
| Daily Assistant template | DS-007 | Bootstrapper | agent.md / agent-config.json | REQ-007 | — |

## Ownership Boundaries

- Launch authority: `chatLaunchService` is the only Chat entry into run creation. It calls:
  - `agentContextsStore.registerDraftRun`
  - `agentRunStore.sendUserInputAndSubscribe`
  - `teamRunConfigStore.createDraft`
  - `agentTeamRunStore.sendMessageToFocusedMember`
  - Chat components never call these directly.
- Send authority: standalone sends stay in `agentRunStore`; team sends stay in `agentTeamRunStore`.
- Route authority: `workspaceNavigationService.resolveSelectionRoute` / `buildAgentRunChatRoute`. The left panel, the tree and the `/workspace` redirect must not hard-code paths for standalone runs.
- Existing-run model authority: `existingRunConfigStore`, for **every permanent run id**.
  - Only `temp-*` draft contexts (the unregistered New chat draft and a registered pre-first-send draft) are edited directly on `context.config`.
  - Chat never mutates the model config of a permanent-id run directly, whether it is live, Offline, or reopened with `isLocked === false`.
- Skill authority (server): `SkillService`. Runtime factories never read `skillNames` to decide effective skills.
- Built-in authority: `BUILT_IN_AGENT_DEFINITIONS` + `BuiltInAgentBootstrapper`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Upstream Callers | Forbidden Bypass | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `chatLaunchService` | contexts/run/team stores, workspace creation, last-model preference | `ChatComposer` / `pages/chat.vue` | Chat components calling `agentRunStore` / `teamRunConfigStore` directly | Add a launch method |
| `SkillService` | `ConfiguredAgentSkillResolver`, `listInstalledSkillRecords` / `listSkills`, disabled store | Runtime factories/bootstrappers | Reading `definition.skillNames` / `skillScope` for execution | Add an effective-skills API |
| `workspaceNavigationService` | Route shapes | AppLeftPanel, tree, collaboration links, `/workspace` page | Literal `'/workspace'` pushes for standalone runs | Add resolver |
| `existingRunConfigStore` | Mutation client, canonical load | Chat footer (permanent ids), gear editor (team/org) | Editing `context.config` of a permanent-id run; calling it for a `temp-*` id | — |

## Dependency Rules

- `components/chat/*` → `chatDraftStore`, `chatLaunchService`, `useChatModelCatalog`, `useComposerTarget`, `existingRunConfigStore` (footer on existing runs), agent-input pieces. Forbidden: `agentRunStore`, `agentTeamRunStore`, `teamRunConfigStore`, direct GraphQL.
- `chatLaunchService` → contexts/run/team/config/workspace stores, preference util. Forbidden: components.
- `components/agentInput/*`, `composables/agentInput/*` and `stores/voiceInputStore.ts` → `ComposerTarget` only. Forbidden:
  - direct reads of `activeContextStore` inside the pieces or for voice targets;
  - any import from `chat` (`composables/chat`, `services/chat`, `stores/chatDraftStore`).
- Server runtime factories → `SkillService`. Forbidden: `definition.skillNames` for effective skills.
- `UserMessage` → `skillRequestInstruction.parse` only. Forbidden: ad-hoc regexes elsewhere.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `chatDraftStore.startNewChat(preset?: { agentDefinitionId?: string; workspaceRootPath?: string })` | Chat draft | Reset the draft with defaults or a preset | Agent definition id; workspace root path | The pencil passes no preset; the tree `+` passes both |
| `chatDraftStore.setTarget(target: { kind: 'agent'; agentDefinitionId } \| { kind: 'team'; teamDefinitionId })` | Draft target | `@` / `×` | Explicit discriminated union | Agent targets rebuild the draft context (both definition ids). Keeps the text, attachments and draft id; clears requested skills |
| `chatLaunchService.launchAgentChat(draft)` → `{ runId }` | Agent chat launch | Validate, register, send, record preference | Chat draft | Route to `/chat?id=<selected id>` after the send returns (permanent id, or the failed `temp-*` id) |
| `chatLaunchService.launchTeamChat(draft)` → `{ teamRunId }` | Team chat launch | Uniform draft, coordinator send | Chat draft with a team target | Route `/workspace` |
| `agentContextsStore.registerDraftRun(context: AgentContext)` | Temp run registration | Register + select | `temp-*` context | Throws if the id is not `temp-*` or is already registered |
| `agentTeamRunStore.sendMessageToFocusedMember(text, attachments, options?: { attachmentDraftOwner?: DraftContextFileOwnerDescriptor })` | Team send | Existing + explicit source owner | Owner descriptor | Default behavior unchanged |
| `workspaceNavigationService.resolveSelectionRoute(selection)` / `buildAgentRunChatRoute(runId)` | Run route | Route authority | Selection type + id | — |
| `useComposerTarget()` (agentInput) → `ComposerTarget` | Composer binding | Active-context target for the box pieces | `{ key, context, draftOwner, access: 'live'\|'draft'\|'read_only', send(), interrupt()? }` | Run views |
| `createChatDraftComposerTarget(draft)` (chat) → `ComposerTarget` | New chat binding | Draft target | Same shape; `access: 'draft'` | `send` → `chatLaunchService` |
| `voiceInputStore.toggleRecording(request)` / `startRecording(request)` | Voice capture | Record, then write the transcript into the requested context | `{ source: 'composer'; targetContext: AgentContext } \| { source: 'settings-test' }` | Replaces the `source` string and the active-context read |
| `useChatRouteRunSync()` (chat) | Route id | Replace `/chat?id=R` with `P` when the displayed context is promoted | Route id + selection | D-13 |
| `skillRequestInstruction.compose(names: string[], text: string): string`; `parse(content: string): { skillNames: string[]; text: string } \| null` | Instruction wording | Canonical format | — | See the example below |
| `SkillService.listInstalledSkillRecords()` (internal), `listSkills()`, `resolveConfiguredSkillBindingsForAgent(def)`, `resolveConfiguredSkillBindingsForAgentDetailed(def)`, `hasEffectiveSkills(def)` | Installed catalog; effective skills | Enumeration with real roots; scope expansion | `AgentDefinition` | `ALL_INSTALLED` bindings are built from enabled records, with no name re-resolution |
| GraphQL `AgentDefinition.skillScope: AgentSkillScope!`; create/update inputs `skillScope` | Definition contract | Read/write | enum `CONFIGURED \| ALL_INSTALLED` | Default `CONFIGURED` |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `setTarget` | Yes | Yes (union) | Low | — |
| `launchAgentChat` / `launchTeamChat` | Yes | Yes | Low | Split by subject rather than one `launch(targetId)` |
| `registerDraftRun` | Yes | Yes | Low | — |
| `resolveSelectionRoute` | Yes | Yes | Low | — |
| `sendMessageToFocusedMember` option | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| New chat state | `chatDraftStore` | Yes | Low | — |
| Launch owner | `chatLaunchService` | Yes | Low | — |
| Box binding | `ComposerTarget` | Yes | Low | — |
| Scope field | `skillScope` | Yes | Low | — |
| Instruction codec | `skillRequestInstruction` | Yes | Low | — |
| Built-in id | `autobyteus-daily-assistant` | Yes | Low (the user's package `daily-assistant` id differs) | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| First send | `agentRunStore` | Reuse | Complete path |
| Team first send | `agentTeamRunStore`, `teamRunConfigStore` | Extend (owner option) | Uniform config already expressible |
| Existing-run model edit | `existingRunConfigStore` | Reuse | Enforces the server rule |
| Attachments | `ContextFilePathInputArea`, `useContextAttachmentComposer`, upload store | Extend (explicit target) | DEC-014 |
| Right tools | `RightSideTabs`, `RightSidebarStrip`, drawer | Extend (extract shell) | UIS-009 |
| Runtime/model data | `runtimeAvailabilityStore`, `llmProviderConfig`, `useRuntimeScopedModelSelection` helpers | Reuse | — |
| Thinking | `llmThinkingConfigAdapter`, schema utils | Reuse | DEC-009 |
| Built-in agents | `built-in-agents` | Extend (policy) | REQ-007 |
| Skills | `SkillService` | Extend | REQ-007 |
| Workspace | `workspaceStore.createWorkspace`, temp workspace | Reuse | REQ-004 |
| Voice | `voiceInputStore` | Reuse | UXJ-008 |
| Status vocabulary | Existing status mapping (`AgentStatusDisplay` / run status utils) | Reuse | REQ-016 |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision |
| --- | --- | --- | --- |
| Web `chat` (pages/chat, components/chat, stores/chatDraftStore, services/chat, composables/chat, utils/chat) | New chat, chat run view, menus, launch | DS-001–006 | Create New |
| Web `agentInput` | Box pieces + composer target | DS-001, DS-004 | Extend |
| Web `layout` | Tool shell | DS-003 | Extend (extract) |
| Web navigation/history | Nav item, routing, tree actions | DS-001, DS-003 | Extend |
| Web agent/team/run stores | Registration, send, team send | DS-001, DS-002, DS-004 | Extend |
| Web conversation | Skill chips in `UserMessage` | DS-009 | Extend |
| Web agents editor | `skillScope` editing and display | DS-008 | Extend |
| Server `built-in-agents` | Daily Assistant seeding | DS-007 | Extend |
| Server `agent-definition` + GraphQL | `skillScope` contract | DS-008 | Extend |
| Server `skills` + runtime factories | Effective skills | DS-008 | Extend |

## Draft File Responsibility Mapping

Final mapping below (the draft was tightened by extracting `ComposerTarget`, `VoiceInputButton`, `MessagePrimaryActionButton`, `WorkspaceToolShell` and `skillRequestInstruction`).

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owning Subsystem | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Composer target | `composables/agentInput/useComposerTarget.ts` | agentInput | Run-view box + chat box | Yes | Yes | A second send owner |
| Mic/send buttons | `components/agentInput/VoiceInputButton.vue`, `MessagePrimaryActionButton.vue` | agentInput | Positioned in the run-view box; in the footer in chat | Yes | Yes | Layout-aware components |
| Skill instruction | `utils/skills/skillRequestInstruction.ts` | skills (web) | Send + render | Yes | Yes | A general message parser |
| Right shell | `components/layout/WorkspaceToolShell.vue` | layout | Workspace + chat | Yes | Yes | A center-view selector |
| Uniform team config builder | `services/chat/chatTeamLaunchConfig.ts` | chat | Team quick path | Yes | Yes | A second team-template builder (reuse `buildTeamRunTemplate` for definition structure) |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `ComposerTarget` `{ key, context, draftOwner, access, send, interrupt? }` | Yes | Yes | Low | `access` replaces separate `readOnly`/`isDraft` flags |
| `ChatDraft` `{ context, target, workspace: { kind: 'existing'; workspaceId } \| { kind: 'folder'; rootPath }, autoExecuteTools }` | Yes | Yes | Low | Runtime/model/llmConfig live only in `context.config` (no duplicate) |
| `AgentContext.requestedSkillNames: string[]` | Yes | Yes | Low | Cleared with the requirement on submission |
| `skillScope` | Yes | Yes | Low | Enum, not a boolean plus a magic name |

## Final File Responsibility Mapping

Web (`autobyteus-web/`):

| File | Change | Owner / Boundary | Concrete Concern |
| --- | --- | --- | --- |
| `pages/chat.vue` | Add | Route owner | `/chat`: New chat (no `id`) → `ChatNewSurface`. `id` → `ensureRunOpen` (mounted context → `selectRunWithoutShellNavigation`; else `openWorkspaceExecutionLink({ kind: 'agent', runId })`) → `ChatRunView`. Unknown id → missing state (REQ-015). A `temp-*` id that is not registered → redirect to `/chat`. `useChatRouteRunSync` replaces the id on promotion (D-13) |
| `pages/index.vue` | Modify | Landing | Desktop → `/chat`; copy "Opening Chat..." |
| `pages/workspace.vue` | Modify | Redirect | Selection-change-driven watcher only: standalone agent → `router.replace(buildAgentRunChatRoute(id))` after a committed selection. It never fires on mount for a stale selection, and never while the route has `rootSubjectKind=agent_org` |
| `components/chat/ChatNewSurface.vue` | Add | UIS-001 | Heading, subtitle variants, `ChatComposer` (large), hint and starting line |
| `components/chat/ChatRunView.vue` | Add | UIS-008 | `ChatRunHeader` + `WorkspaceToolShell scope="chat"` wrapping `AgentEventMonitor` (conversation column `max-w-3xl`) with the `#composer` slot = `ChatComposer` |
| `components/chat/ChatRunHeader.vue` | Add | UIS-008 header | Avatar, title (run summary ≤42), status Running/Idle/Offline, agent · workspace · approval |
| `components/chat/ChatComposer.vue` | Add | UIS-002 (R2) | Card = `ContextFilePathInputArea(target)` + skill-chip row + `ChatMessageInput` + footer. Left: workspace menu + approval (New chat only). Right: model, thinking, `VoiceInputButton`, `MessagePrimaryActionButton` |
| `components/chat/ChatMessageInput.vue` | Add | Textarea + `/` `@` | Local trigger spine; `@` only for the New chat draft; `/` lists the target agent's effective skills |
| `components/chat/ChatSkillMenu.vue`, `ChatTargetMenu.vue` | Add | UIS-006/007 | Ranked lists, empty states, keyboard |
| `components/chat/ChatModelMenu.vue`, `ChatThinkingControl.vue` | Add | UIS-003/004 | No Recent; runtime submenus/drill-in; states; schema-driven thinking (hidden when none); locked presentation |
| `components/chat/ChatWorkspaceMenu.vue`, `ChatApprovalToggle.vue` | Add | UIS-005, approval | Temp default, workspaces, folder form with absolute-path validation; shield toggle |
| `components/chat/chatRunModelControls.ts` | Add | Footer modes | Mode by run id (D-08). `temp-*` → edits `context.config` (runtime selectable). Permanent id → `existingRunConfigStore` (load on Offline, update, save), locked while live, runtime fixed |
| `components/conversation/SkillRequestChips.vue` | Add | DS-009 | Chips + "SENT TO THE AGENT AS" tooltip |
| `components/conversation/UserMessage.vue` | Modify | DS-009 | Parse content; render chips + remaining text |
| `stores/chatDraftStore.ts` | Add | Chat draft | See Ownership Map |
| `services/chat/chatLaunchService.ts` | Add | Launch owner | `launchAgentChat`, `launchTeamChat`, readiness |
| `services/chat/chatTeamLaunchConfig.ts` | Add | Team quick path | Root-only `TeamRunConfig` from the team definition + chat settings |
| `composables/chat/useChatModelCatalog.ts` | Add | DS-006 | Availability, per-runtime catalogs, cross-runtime search |
| `utils/chat/chatLastModelPreference.ts` | Add | REQ-019 | localStorage `autobyteus.chat.lastModel` |
| `utils/chat/chatDefaults.ts` | Add | Constants | `DEFAULT_CHAT_AGENT_DEFINITION_ID = 'autobyteus-daily-assistant'`, title length |
| `utils/skills/skillRequestInstruction.ts` | Add | Codec | compose/parse |
| `composables/agentInput/useComposerTarget.ts` | Add | Target | `ComposerTarget` type + active-context resolver only |
| `composables/chat/chatDraftComposerTarget.ts` | Add | Chat target | Draft `ComposerTarget` (send → `chatLaunchService`) |
| `composables/chat/useChatRouteRunSync.ts` | Add | Route sync | D-13 replace on promotion |
| `stores/voiceInputStore.ts` | Modify | Voice | Discriminated recording request; transcript goes into `targetContext`; no active-context read |
| `components/settings/VoiceInputExtensionCard.vue` | Modify | Voice settings | Calls with `{ source: 'settings-test' }` |
| `components/agentInput/VoiceInputButton.vue`, `MessagePrimaryActionButton.vue` | Add (extract) | Box pieces | Voice and primary action over a target |
| `components/agentInput/AgentUserInputForm.vue`, `AgentUserInputTextArea.vue`, `ContextFilePathInputArea.vue` | Modify | Box pieces | Explicit `target` prop; same run-view layout |
| `components/workspace/agent/AgentEventMonitor.vue` | Modify | Monitor | `#composer` slot (default `AgentUserInputForm`) |
| `components/layout/WorkspaceToolShell.vue` | Add (extract) | Tool shell | Dock/strip/drawer/resize around a slot; `scope` prop |
| `components/layout/WorkspaceAdaptiveLayout.vue` | Modify | Center switch | Uses the shell; standalone-agent branch removed |
| `composables/useRightPanel.ts` | Modify | Preference | Scoped visibility: `workspace` (default visible), `chat` (default collapsed) |
| `components/workspace/agent/AgentWorkspaceView.vue` | ~~Remove~~ → **Restored (D-17)** | Standalone run view | Superseded row (SR-015 cleanup): restored with ＋ → preset New chat; see the D-17 rows |
| `composables/useShellPrimaryNavigation.ts`, `components/AppLeftPanel.vue` | Modify | Nav | `chat` item first; pencil → `chatDraftStore.startNewChat()` + `/chat`; collapse on the first item; run-selected → `resolveSelectionRoute` |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, `composables/useWorkspaceHistorySelectionActions.ts` | Modify | Tree | `onCreateRun` → preset New chat; `/chat?id` selected-row sync and expansion |
| `stores/runHistoryStore.ts`, `stores/runHistoryDraftActions.ts` | Modify | History | Remove `createDraftRun` path |
| `services/workspace/workspaceNavigationService.ts` | Modify | Route authority | `buildAgentRunChatRoute`, `resolveSelectionRoute`; agent links → chat |
| `stores/agentContextsStore.ts` | Modify | Registration | `registerDraftRun` |
| `stores/agentRunStore.ts`, `types/agent/AgentContext.ts`, `services/runSubmission/localUserSubmission.ts`, `stores/activeContextStore.ts` | Modify | Send | Compose instruction; `initialSummary` = user text (tags-only fallback: the instruction); `requestedSkillNames`; clear on submission; `hasDraft` counts tags |
| `stores/agentTeamRunStore.ts` | Modify | Team send | `attachmentDraftOwner` option |
| `composables/chat/useChatModelCatalog.ts` (`toChatModelOption`, `matchesModelQuery`, `filterOptions`), `components/chat/chatRunModelControls.ts` (fixed list + persisted `modelLabel` via `toChatModelOption`), `components/chat/ChatModelMenu.vue` (+ footer trigger; inline predicate removed), `utils/modelSelectionOptions.ts` (export `compareRecommendedFirstBy`), `utils/modelSelectionLabel.ts` (+ `existingRunChoiceLabelInput`), `components/launch-config/RuntimeModelConfigFields.vue` (uses the shared mapping; local `choiceLabel` removed) | Modify | D-16 labels (SR-012) | One option builder and one search predicate for the catalog and persisted paths; shared order; truncation + tooltip; tests V-L1 to V-L5 |
| `pages/chat.vue`, `components/layout/WorkspaceAdaptiveLayout.vue` (standalone branch + standalone config mode restored), `components/workspace/agent/AgentWorkspaceView.vue` (restored; ＋ → preset New chat), `components/workspace/agent/AgentWorkspaceSurface.vue` (standalone run-summary title), `components/workspace/common/WorkspaceHeaderActions.vue` (if needed) | Modify/Restore | D-17 frame and header | Chat run view = product agent run view in the workspace frame |
| `components/agentInput/AgentUserInputForm.vue`, `AgentUserInputTextArea.vue` | Modify | D-17 box | Optional standalone `skillTagging` capability (`/` menu + chip row); team/org unchanged |
| `composables/useRightPanel.ts`, `composables/useRightSideTabs.ts`, `components/layout/RightSideTabs.vue`, `RightSidebarStrip.vue` | Modify | D-17 panel | Shared visibility (chat scope removed). `contextualScopeKey` / `lastAppliedScopeKey`; default applied on mount or on scope change when the key differs; `selectTabExplicitly` wins in the same open action; immediate validity watcher |
| `components/workspace/config/RunConfigPanel.vue`, `components/workspace/config/DraftRunConfigEditor.vue` (new) | Modify / Add | D-17 ⚙ on drafts (AR-011) | Draft branch for a selected `temp-*` standalone run: an editable `AgentRunConfigForm` bound to `context.config`; no `existingRunConfigStore` |
| `components/chat/ChatRunView.vue`, `ChatRunHeader.vue`, `chatRunModelControls.ts` (persisted mode), the `ChatComposer` run mode, the `useChatModelCatalog` `runChoice`/`filterOptions` | Remove | D-17 removals | Superseded by the product run view and ⚙ |
| `autobyteus-server-ts/src/agent-execution/backends/shared/workspace-skill-materializer.ts` (`reconcileUnresolved`) | ~~Modify (D-15 Rule 3)~~ **Superseded by D-19** | — | Rule 3 is not implemented; strength/holder/re-point code is removed (see the D-19 rows) |
| `autobyteus-server-ts/src/skills/services/skill-service.ts`, `skill-discovery.ts`, new `runtime-default-skill-folders.ts`, `configured-agent-skill-resolver.ts`, `domain/installed-skill-record.ts` | Modify / Add | D-19 catalog (SR-016) | One record per name with tiers; `listSkillNameIssues`; `resolveCatalogRecord`; `validateIncomingSkillNames`; the per-agent contextual resolution removed except for application-owned agents |
| `autobyteus-server-ts/src/skills/services/skill-catalog.ts`, `skill-discovery.ts` (`getBundledSkillDirectoriesFromDefinitionRoot` / its record builder), `config` org roots | Modify | D-19 Agent Org layouts (SR-018/SR-019) | Tier-2 enumeration adds org-owned agents and org-owned teams (+ team-local agents via the team dir's `agents/*`) in the stated order, using `listAgentOrgOwnedDefinitionSourcesSync`; AGY roots per the SR-018 table; tests + the org validation case |
| `autobyteus-server-ts/src/agent-org-definition/providers/agent-org-owned-definition-correlation.ts` (new), `agent-org-owned-definition-source-index.ts` | Add / Modify | AR-014 (SR-019) | Pure `correlateAgentOrgOwnedMembers` core, moved from the async index; the async `listAgentOrgOwnedDefinitionSources` / `findAgentOrgOwnedDefinitionSource` delegate to it with unchanged signatures; new sync `listAgentOrgOwnedDefinitionSourcesSync`; unit tests for the core, plus parity tests showing both readers produce identical results |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` (`getSkill` and every caller: detail, file tree, update, delete, enable/disable, upload/read/delete file, `getSkills`), `src/api/graphql/types/skills.ts` (L136), `src/workspaces/skill-workspace.ts` (L24) | Modify / Remove | D-19 AR-013 (SR-017) | Every name-based lookup → `resolveCatalogRecord`; remove `findCatalogSkillLocation`, `findGlobalSkillLocation`, `getGlobalSkill` and the resolver's global-name search |
| `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts`, `skill-service.ts` (`addSkillSource`, `createSkill`), `api/graphql/types/skills.ts` (+ `skillNameIssues` query; `SKILL_NAME_CONFLICT` error), agent-package GraphQL types | Modify | D-19 import validation | Validate before commit on add/import/update/reload/create; structured conflict error; notices |
| `autobyteus-server-ts/src/agent-execution/backends/shared/workspace-skill-materializer.ts`, `workspace-skill-links.ts`, the Codex/Claude/ACP/AGY bootstrappers and factories | Modify (removal) | D-19 simplification | Remove `requestStrength`, holder strengths, re-point/yield, the Rule 3 skip and the IC-2 re-point fallback; keep Rule 1 (`workspaceCollisionPolicy`) |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Modify | D-19 Codex | `reconcile-discoverable` only when the discovered path equals the catalog root; else expose + log `codex-runtime-duplicate` |
| `autobyteus-web/components/skills/SkillNameConflictDialog.vue` (new), `components/skills/SkillSourcesModal.vue`, `components/skills/SkillsList.vue` (banner), `components/settings/AgentPackagesManager.vue`, `stores/skillSourcesStore.ts`, `stores/agentPackagesStore.ts`, `stores/skillStore.ts`, `graphql/skills*.ts`, localization | Add / Modify | D-19 web | Conflict pop-up, notices toast, Skills page banner, structured error parsing |
| `autobyteus-web/utils/llmConfigSchema.ts` (`applyModelConfigSchemaDefaults`), `components/workspace/config/ModelConfigSection.vue`, `stores/chatDraftStore.ts`, `services/chat/chatTeamLaunchConfig.ts` | Modify | D-18 (SR-015) | Shared defaults helper; the chat draft records an explicit `llmConfig` (schema defaults + default thinking) on every model set; team root the same |
| `stores/runHistoryLoadActions.ts` | Modify | Reconcile (D-14, SR-010) | Skip contexts where `agentRunStore.isActivationPending(runId)`; clear the marker for runs in the active set. Remove the SR-008 `submissionPending` guard |
| `stores/agentRunStore.ts` (D-14) | Modify | Activation marker | `activationPendingRunIds` + mark/clear/is; set before connecting for first sends (after promotion) and Offline/Error resumes; clear on failure/cancel, a rejected ack, or terminate/close |
| `services/agentStreaming/AgentStreamingService.ts` | Modify | Send ack callback | `onSendMessageCommandAck(ack)` option, mirroring `onInterruptCommandResult` |
| `components/chat/chatRunModelControls.ts` (CR-002 local fix) | **Superseded (D-17)** | — | The run footer is removed by R3/D-17; the CR-002 fix is moot. Kept only as history (SR-015 cleanup) |
| `stores/agentDefinitionStore.ts`, `graphql/queries/agentDefinitionQueries.ts`, agent-definition mutations | Modify | Contract | `skillScope` |
| `components/agents/AgentDefinitionForm.vue`, `AgentCard.vue`, `AgentDefinitionDetailSections.vue`, `AgentDetail.vue` | Modify | Editor | "Use all installed skills" option (picker disabled when on); cards/detail show "All installed skills" |
| `localization/messages/{en,zh-CN}/*` | Modify | Copy | Spec copy (normative English; zh-CN translations) |

Server (`autobyteus-server-ts/`):

| File | Change | Concern |
| --- | --- | --- |
| `src/built-in-agents/built-in-agent-registry.ts` | Modify | Add `{ id: 'autobyteus-daily-assistant', templateDirName: 'daily-assistant', displayName: 'Daily Assistant', syncPolicy: 'seedIfMissing' }`; existing entries `syncPolicy: 'overwrite'` |
| `src/built-in-agents/built-in-agent-bootstrapper.ts` | Modify | Policy: `seedIfMissing` copies `agent.md` / `agent-config.json` / `skills/` only when the agent dir lacks them |
| `src/built-in-agents/templates/daily-assistant/agent.md`, `agent-config.json` | Add | From the user's package agent: name "Daily Assistant", general prompt, the same general tools; `skillScope: "ALL_INSTALLED"`, `skillNames: []`, `defaultLaunchConfig: null` |
| `src/agent-definition/domain/models.ts`, `providers/agent-definition-config.ts`, `providers/file-agent-definition-provider.ts`, `providers/application-owned-agent-source.ts`, `services/agent-definition-service.ts` | Modify | `skillScope` field, normalize (default `CONFIGURED`), persist |
| `src/api/graphql/types/agent-definition.ts`, `converters/agent-definition-converter.ts` | Modify | Enum `AgentSkillScope`; field + inputs |
| `src/agent-tools/agent-management/get-agent-definition.ts`, `list-agent-definitions.ts` | Modify | Expose `skill_scope` |
| `src/skills/services/skill-service.ts`, `skill-discovery.ts`, `configured-agent-skill-resolver.ts` | Modify | `listInstalledSkillRecords` (records with origin, trusted root and configured root; same precedence as `listSkills`); `hasEffectiveSkills`. ALL_INSTALLED regular and detailed bindings are built from enabled records; the resolver exposes candidate validation for a given record. CONFIGURED is unchanged |
| `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`, `antigravity/backend/agy-agent-run-backend-factory.ts` (+ any Codex/Claude `skillNames` reads found during implementation) | Modify | Use SkillService effective skills |
| `src/agent-execution/backends/antigravity/capsule/agy-configured-skill-materializer.ts`, `backends/shared/workspace-skill-materializer.ts`, and their callers: `codex/backend/codex-thread-bootstrapper.ts`, `claude/backend/claude-session-bootstrapper.ts`, `acp/backend/acp-agent-run-backend-factory.ts` (Grok `.grok/skills`), and the AGY factory/capsule | Modify | D-15 `requestStrength` (weak/strong). Rule 1: `skipped-workspace-owned`. Rule 2: registry strong/weak holder counts; `skipped-held-by-other-run` (A); atomic re-point + `yielded-to-configured` when only weak holders exist (B). Strength comes from `SkillService.resolveSkillScope` |
| `src/skills/services/skill-service.ts` | Modify | Add `resolveSkillScope(definition)` (the normalized scope), used for the collision policy |

Tests: update or add unit tests beside each changed owner. Add e2e for Daily Assistant bootstrap (seed + preserve edits), `skillScope` GraphQL round trip, and effective skills per runtime factory. Add web integration for chat launch (agent and team), `/chat?id` routing, the composer target (team/org box unchanged), footer lock/save, and the skill codec round trip.

## Applied Patterns (If Any)

- Registry + policy (built-in agents).
- Strategy by discriminated union (chat target agent | team).
- Slot-based shell (`WorkspaceToolShell`).
- Codec (skill instruction).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/chat/` | Folder | Chat UI | Chat surfaces, composer, menus | Store mutations of run/team stores |
| `autobyteus-web/stores/chatDraftStore.ts` | File | Chat draft | Draft state | Send/route |
| `autobyteus-web/services/chat/` | Folder | Chat launch | Launch + team config | UI |
| `autobyteus-web/composables/chat/` | Folder | Chat data and bindings | Model catalog, draft composer target, route sync | Persistence |
| `autobyteus-web/utils/chat/`, `utils/skills/` | Folder | Pure helpers | Preference, defaults, codec | Store access (codec) |
| `autobyteus-web/composables/agentInput/` | Folder | Box binding | Composer target | Layout |
| `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/` | Folder | Built-in | Template | Runtime code |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `components/chat/` | Mixed Justified (presentation) | Yes | Low | Mirrors the existing `components/workspace/*` feature folders |
| `services/chat/` | Main-Line Domain-Control | Yes | Low | Launch owner separate from UI |
| `composables/agentInput/` | Off-Spine | Yes | Low | Shared by run-view and chat boxes |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Skill instruction | `compose(['skill-optimizer'], 'Help me…')` → `"Use the skill-optimizer skill for this request.\n\nHelp me…"`; `compose(['a','b'], 'x')` → `"Use these skills for this request: a, b.\n\nx"`; tags only → the instruction without a blank line; `parse` returns `null` unless the content starts with exactly one of these sentence forms | Regex matching scattered in components; server and client wording copies | One wording owner; reload fidelity |
| New chat draft | `const ctx = new AgentContext(config, new AgentRunState('temp-…', conv)); chatDraft.context = ctx /* not registered */` → on send `agentContextsStore.registerDraftRun(ctx)` | `createRunFromTemplate()` on opening `/chat` (visible draft row) | TR-001/TR-002 |
| Box binding | `<ContextFilePathInputArea :target="target" />`, where the run views use `useComposerTarget()` and New chat uses `createChatDraftComposerTarget(draft)` | `ContextFilePathInputArea` reading `activeContextStore` plus a chat-specific copy | DEC-014, one component |
| Routing | `resolveSelectionRoute({ type: 'agent', runId })` → `/chat?id=…` | `if (isChat) router.push('/chat') else '/workspace'` inside the tree and the left panel | Single route authority |
| Effective skills | `ALL_INSTALLED`: `listInstalledSkillRecords().filter(r => !r.skill.isDisabled).map(r => ({ kind: 'resolved', skill: r.skill, source: sourceFor(r.origin, r.skill, r.trustedRoot) }))`. Example: `/…/autobyteus-agents/agents/research-engineer/skills/<n>` → `agent_private`, trusted root `/…/autobyteus-agents/agents/research-engineer` | `if (def.skillNames.length)` in factories; `ALL_INSTALLED` implemented as `resolve({ skillNames: listSkills().map(s => s.name) })`, which misses definition-root bundles through `getGlobalSkill` | Offered `/` tags = the runtime's set |
| Footer mode for a reopened Offline run | Tree → `run-7` (Offline, reopened; `isLocked === false`) → the id is permanent → footer uses `existingRunConfigStore.loadAgentCanonical('run-7')`. The model menu lists only its runtime with "Runtime fixed · Codex". A pick calls `updateAgentModelConfig` + `save()`. The next send resumes with the saved model | Choosing the mode by `config.isLocked`, which treats `run-7` as a draft, edits `context.config` locally, and never saves (the model is silently not applied) | Identity-keyed mode: same behavior after a terminate or a reopen |
| Skill-path collision between live runs (D-15) | Temp workspace on Codex. (A) The configured agent `software-tutorial-video-maker` is live and holds `.codex/skills/software-tutorial-video-maker` → its private source. A Daily Assistant New chat requests the global copy (weak): it logs `skipped-held-by-other-run`, the chat starts, and the name resolves via the existing link. (B) A Daily Assistant chat is live and holds that path → the global source (weak only). Launching the configured agent (strong) re-points the link to the private source, logs `yielded-to-configured`, and the launch succeeds; the Daily Assistant keeps a same-named skill. (C) Two configured agents with different sources on the same name → fail-fast, as today | The weak request throws `sourceCollisionError` (a New chat fails), or the strong request throws because a chat is live (a catalog launch regresses) | Neither side's failure is caused by an ALL_INSTALLED run |
| Registered-draft route transition | Catalog "Run agent" → `/chat?id=temp-1` → send → `promoteTemporaryId(temp-1, run-9)` → `useChatRouteRunSync` → `router.replace('/chat?id=run-9')`. A failed first send stays on `/chat?id=temp-1`, shows the error, and allows a resend | A launch-only "route after promotion"; treating `temp-1` as unknown after promotion and bouncing to New chat | Every send path keeps the view |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep a separate `AgentWorkspaceView` on `/workspace` alongside a different chat view | Catalog-launched runs | Rejected | One standalone run view: after D-17 it is `AgentWorkspaceView` inside the workspace frame at `/chat?id` (D-05 routing + D-17) |
| Keep the tree `+` creating draft runs | Existing behavior | Rejected | Preset New chat |
| Keep `/workspace` agent execution links working in parallel | Old in-app links | Rejected | Agent links build chat routes; `/workspace` redirects standalone selection |
| A magic `"*"` entry in `skillNames` | Avoid a schema field | Rejected | `skillScope` enum |
| Server-side instruction synthesis via a new WS field | The user's intuition | Rejected (for this scope) | Content-carried instruction with a single web codec: no protocol change and fewer changes (user preference); runtime histories already store content |
| Overwrite policy for Daily Assistant | Consistency with other built-ins | Rejected | `seedIfMissing` so user configuration persists |

## Derived Layering (If Useful)

Presentation (`components/chat`) → chat domain (`chatDraftStore`, `chatLaunchService`) → existing run/team/config stores → GraphQL/WS → server run managers → SkillService/runtimes.

## Change / Refactor Sequence

1. **Server `skillScope`:** domain, config normalize/persist, GraphQL enum and field, agent-management tools, SkillService installed-record enumeration + effective resolution (regular and detailed paths), and factory call-site changes. Tests must cover a bundled definition-root skill under `ALL_INSTALLED` on every runtime path.
2. **Server built-ins:** sync policy, Daily Assistant template, and bootstrap e2e.
3. **Web contract:** `skillScope` in the definition store/queries/mutations, plus the agent editor/card/detail.
4. **Web refactors with no behavior change:**
   - `useComposerTarget` (active target), the explicit `voiceInputStore` recording request, and the extracted voice/primary buttons.
   - `ContextFilePathInputArea` / `AgentUserInputTextArea` / `AgentUserInputForm` take a target.
   - `AgentEventMonitor` gets the `#composer` slot.
   - `WorkspaceToolShell` extraction plus the scoped right-panel preference.
   - Verify that the existing team/org/agent tests still pass.
5. **Web send:** `requestedSkillNames`, the `skillRequestInstruction` codec, `agentRunStore` composition, `UserMessage` chips, and `hasDraft` counting tags.
6. **Web chat core:** `chatDraftStore` (+ target rebuild), `chatDraftComposerTarget`, `chatLaunchService` (agent + destination rule), `registerDraftRun`, `pages/chat.vue` (New, run, missing) + `useChatRouteRunSync`, `ChatNewSurface`, `ChatComposer` and menus, the footer modes (D-08), `useChatModelCatalog`, last-model preference, and `ChatRunView`/header.
7. **Web routing:** navigation-service resolvers, the nav item, the pencil, the collapse move, the left-panel run-selected route, the tree `+` preset, the `/workspace` redirect, `/` → `/chat`. Then remove `AgentWorkspaceView` and the `createDraftRun` path.
8. **Web team quick path:** `chatTeamLaunchConfig`, `launchTeamChat`, and the `agentTeamRunStore` owner option.
9. **Copy and i18n, visual verification against VIS-001–025, then docs.**

## Key Tradeoffs

- **Content-carried skill instruction vs a server protocol field.**
  - Chosen: no WS/GraphQL change, identical rendering for live and reload across all runtimes, and one codec.
  - Cost: non-web clients see raw text. This is acceptable because only the web Chat offers tags.
- **All standalone runs in the chat view vs chat-originated runs only.**
  - Chosen per the approved DEC-007 wording and for one view per run kind.
  - Cost: the catalog-launched runs' gear editor is replaced by the footer for single agents. `RunConfigPanel` for pre-launch is unchanged.
- **`seedIfMissing` for Daily Assistant.**
  - Chosen: user edits persist.
  - Cost: template improvements do not reach users who already have the files. A user can delete the agent folder to re-seed it.

## Risks

- **RSK-001:** cross-runtime search loads all enabled catalogs. Mitigations: load on the first search keystroke only, keep the per-runtime cache, and show "Searching all runtimes…".
- **RSK-003:** `ALL_INSTALLED` with many skills, now including definition-root bundled skills (AR-003), increases Codex/Claude workspace materialization and the AGY capsule size (AGY has size limits: `AGY_SKILL_SOURCE_TOO_LARGE`). Validation must cover the installed skill set on each available runtime. If a limit is hit, return `Design Impact`.
- **RSK-004:** regressions in the composer-target extraction for team/org views. Mitigation: step 4 lands as a behavior-preserving refactor with existing tests before any chat code.
- **RSK-005 / MP-005:** the `/workspace` → `/chat` redirect interacting with the selection-intent machinery (`useWorkspaceRouteSelection`). Rules for the redirect:
  - It is selection-change-driven only: a watcher on the selected standalone run id, not an on-mount check of a stale selection.
  - It fires only after a committed selection.
  - It never fires while the route has `rootSubjectKind=agent_org`.
- **RSK-003 status:** the collision limit is resolved by D-15. Materialization size and time with the real 78-skill catalog passed API/E2E on all four runtimes.
- **RSK-007:** the closer is confirmed (AF-33). The SR-010 marker covers the full window from connect until server-confirmed activation. The residual risk is a run the server accepts but never reports active; the existing failure and timeout paths clear the marker.
- **RSK-006:** for Codex, reloaded user content may include the appended context-file reference section. The prefix parser is unaffected, but the reloaded "sent as" tooltip may show more text than the live one. This is accepted.

## ARCH-REV-001 Resolution

| Finding | Resolution | Sections |
| --- | --- | --- |
| AR-001 (High) | D-13 route sync owner in `pages/chat.vue` (`useChatRouteRunSync`), for all send paths. D-08 footer modes: unlocked draft → `context.config`; persisted → `existingRunConfigStore`; workspace/approval controls only on New chat. D-04 launch destination = `/chat?id=<selected id>` (permanent id, or the failed `temp-*` id), using the existing error presentation, with resend through the same path | Intended Change, Ownership, Interfaces, File Mapping, Examples |
| AR-003 (High) | `listInstalledSkillRecords` with real roots and origins. ALL_INSTALLED regular and detailed bindings are built from enabled records. AGY provenance roots are defined per layout. Web `/` uses the same catalog | D-11, File Mapping, Examples, sequence step 1 |
| AR-004 (Medium) | Discriminated voice recording request with an explicit `targetContext`; the active-context read is removed | D-02, Removal Plan, Interfaces, File Mapping |
| AR-002 (Low) | Draft target factory moved to `composables/chat/chatDraftComposerTarget.ts`; agentInput has no chat imports | D-02, Dependency Rules, File Mapping |
| AR-005 (Low) | `initialSummary` = the user's text; a tags-only message falls back to the instruction | D-09, File Mapping |
| Non-blocking | `setTarget` rebuild (both definition ids); redirect change-driven, never on an org route (RSK-005); removal of the standalone config mode and header actions; requirements editorial cleanup; inventory refresh; RSK-006 Codex tooltip note | D-03, Risks, Removal Plan, requirements-doc, investigation-notes |

## ARCH-REV-002 Resolution

| Finding | Resolution | Sections |
| --- | --- | --- |
| AR-001 remaining (MP-006, High) | The footer mode is keyed on run identity. `temp-*` → `context.config`, runtime selectable. Permanent id → `existingRunConfigStore`: locked while live, runtime fixed when Offline, saved config applied on resume. It is never keyed on `isLocked` | D-08, Ownership Boundaries, Boundary Map, `chatRunModelControls` row, Examples, Guidance |
| AR-007 (Low) | Launch order: `starting` state, then register → select → await send → route to `/chat?id=<selected id>`, then reset the draft. New chat shows the UXJ-001 starting state throughout | D-04 |

## CRR-002 Resolution (API/E2E failure origin, SR-008)

| Finding | Classification | Resolution | Sections |
| --- | --- | --- | --- |
| CR-004 / F-03 | Design Impact (High), RSK-003 trigger | D-15 Rule 1: under ALL_INSTALLED, a user-owned workspace entry wins (skip + `skipped-workspace-owned`); CONFIGURED stays fail-fast | D-15, File Mapping, Risks |
| ARCH-REV-004 AR-008 (High) | Design Impact | D-15 Rule 2: weak/strong request strength in the shared registry. (A) A weak request skips a skill held by another run with a different source. (B) A strong request re-points a link held only by weak holders (atomic) and never fails because of an ALL_INSTALLED run; strong vs strong stays fail-fast. ACP/Grok `.grok/skills` added. Example and validation cases V-A to V-E added | D-15, File Mapping, Examples, Guidance |
| CR-003 / F-02 | Missing Invariant (pre-existing; closer confirmed by the IR-002 stack) | SR-010 D-14: an `agentRunStore` activation-pending marker, set before connecting for first sends and Offline resumes, and cleared by an active snapshot, a failure, a rejected ack or terminate. Reconcile skips marked runs. The SR-008 `submissionPending` guard is replaced | D-14, File Mapping |
| CR-002 / F-01 | Local Fix (implementation), sequenced in this package | Persisted-mode footer loads the run's runtime schema source | File Mapping |

## SR-011 Resolution (user verification UVF-001)

| Finding | Classification | Resolution |
| --- | --- | --- |
| UVF-001 (DR-002): the Chat model menu labels are less intuitive than the launch form's (bare `opus`) | Requirement Gap. Approved as REQ-021/AC-018/DEC-015 | D-16: reuse the shared label policy, single-line truncation with a tooltip, extended search |
| ARCH-REV-007 AR-009 (MP-015): the persisted-run fixed list and label bypass `useChatModelCatalog` | Design Impact | SR-012: `toChatModelOption` with catalog-record-first label input and the shared `existingRunChoiceLabelInput` otherwise; one search predicate; generic comparator; `chatRunModelControls.ts` and `RuntimeModelConfigFields.vue` added to the mapping; V-L2 added |

Delta classification: `Small` / `Low`. The change is web-only, inside the existing chat catalog owner, and reuses existing utilities, with no contract or persistence change. The cumulative package stays Large / High.

## SR-013 Resolution (Product R3, user-confirmed)

| Item | Resolution |
| --- | --- |
| The user asked for the Chat run view's top area and right tabs to match the workspace Team/Org views; R3 decisions (DEC-016) | D-17: the product agent run view inside the workspace frame; the ⚙ existing-run settings; the product box + `/`; the shared right-panel state; strip → exact tab fixed in the shared owner |
| Classification | Package Large / High. The delta is a Medium web-only refactor inside existing owners: the chat run surfaces are removed and product owners reused, with no server or contract change |
| ARCH-REV-009 AR-010 | The tab context rule is revised: a last-applied scope key, applied on mount or on change, explicit selection wins, immediate validity |
| ARCH-REV-009 AR-011 | ⚙ on `temp-*` drafts → the new `DraftRunConfigEditor` (editable form on `context.config`); the "existing behavior" claim is corrected |
| CRR-010 CR-007 / UF-04 (Design Impact) | ~~D-15 Rule 3~~ superseded by D-19 (SR-016): the bundled `desk-alpha` resolves from the single catalog, so there is no weak/strong conflict. V-F is rerun under D-19 |
| ARCH-REV-014 AR-014 (SR-019) | Option (a): the synchronous correlation core in `agent-org-definition`, shared by the async index (providers, unchanged signature) and a new sync reader (catalog); no catalog or `SkillService` API changes; team-local agents in org-owned teams are enumerated via the team dir's `agents/*` |
| CRR-012 CR-009 (SR-018, user direction) | D-19 tier 2 includes Agent Org layouts (org-owned agents; org-owned teams' shared and local-agent skills) via the owned-source index, with an order, AGY roots, import validation and a validation case; this fixes the D-19 regression vs `personal` and adds org skills to the Skills page |
| ARCH-REV-012 AR-013 / R-3 (SR-017) | Every name-based skill operation goes through the catalog (edits and deletes hit the used copy only; ignored copies are read-only in the banner); the second-precedence lookups are removed; a rejected reload keeps the previous registration while the banner reflects the disk |
| User decision DEC-017 (SR-016) | D-19: one skill per name with precedence tiers (runtime default folders never win); import validation with a conflict pop-up; out-of-band banner; Codex discovery match; D-15 Rules 2–3 removed |
| CRR-010 CR-008 / UF-03 (Local Fix, sequenced) | D-18: the New chat records an explicit `llmConfig` via the shared `applyModelConfigSchemaDefaults` + default thinking |
| CRR-008 note | Stale mapping rows (`AgentWorkspaceView` "Remove", the CR-002 run-footer row) are marked superseded by D-17 |
| ARCH-REV-009 AR-012 | Editorial: REQ-021/AC-018 scope (New chat menu + ⚙ gear-editor labels); AC-015 → VIS-001–027 |

## Guidance For Implementation

- **Fidelity.** Treat R2 `ui-ux-spec.md` and VIS-001–025 as normative. The prototype `components/chat/*` markup may guide styling, but no prototype state files may be ported (`usePrototypeChat`, `chat-fixtures`, `chatTreeProjection`).
- **New chat defaults, in order:**
  1. Target: Daily Assistant (`autobyteus-daily-assistant`).
  2. Workspace: temp workspace.
  3. `autoExecuteTools: true`.
  4. `skillAccessMode: 'PRELOADED_ONLY'`.
  5. Model: last-used value if its runtime is enabled and the model exists; else the Daily Assistant `defaultLaunchConfig`; else the runtime default through `resolveRunnableModelIdentifier`.
- **Daily Assistant missing.** If the definition does not resolve, send is disabled with the reason as its label (spec "Send disabled").
- **The pencil and the Chat item** always call `chatDraftStore.startNewChat()` before routing. Discarding a draft deletes nothing server-side; uploaded drafts expire through existing cleanup.
- **The `@` menu** lists agent definitions except Daily Assistant, plus team definitions. It excludes Agent Orgs and is available only in a New chat.
- **The `/` menu:**
  - Source: the target agent's effective skills. `ALL_INSTALLED` means the enabled skills from `skillStore`; otherwise its `skillNames` joined with descriptions.
  - Ranking: name prefix, then name contains, then description.
  - For a team target, `/` is not offered.
- **The footer on a permanent-id run** (live, terminated in this session, or reopened from history):
  - Choose this mode from the run id, never from `config.isLocked`.
  - Lock when status is Running or Idle (the run is live). Unlock when Offline.
  - The model menu lists only the run's runtime and shows "Runtime fixed · <Runtime>".
  - Selecting a model or thinking level saves through `existingRunConfigStore`.
  - Show save errors with the store's feedback.
- **Footer on a registered pre-first-send draft** (catalog launch): the same controls as the right group of the New chat footer (runtime selectable, model, thinking), editing `context.config`. It has no workspace or approval controls; those are header facts.
- **Tradeoff to tell the user at hand-off:** single-agent Offline runs change model and thinking in the chat footer. Advanced non-thinking model parameters, which the standalone gear editor used to reach, are not exposed for single-agent runs. This follows from DEC-007/REQ-012.
- **Naming note:** the built-in "Daily Assistant" and the user's package agent `daily-assistant` share a display name, and `@` excludes only the built-in. The user may remove the package copy, which lives outside this repo.
- **D-15 validation cases** (API/E2E, temp workspace, on Codex and Claude plus ACP/Grok where available; AGY Rule 1 only):
  - **V-A:** configured agent live → a New chat with Daily Assistant starts, logging `skipped-held-by-other-run`.
  - **V-B:** Daily Assistant live → the configured agent launches from the catalog and via `@`, logging `yielded-to-configured`; Daily Assistant stays usable.
  - **V-C:** two configured agents with a same-name, different-source skill → fail-fast, unchanged.
  - **V-D:** a user-owned folder at the workspace skill path → Daily Assistant starts (`skipped-workspace-owned`), and a configured agent fails fast, unchanged.
  - **V-E:** both runs terminate → the link is removed and the registry is empty.
  - Use a same-name, different-source skill pair from the real catalog (seven exist, e.g. `software-tutorial-video-maker`).
  - **V-F (Rule 3, regression C20):** a Daily Assistant chat is live in the temp workspace. Start the test package team (`api-e2e-evidence/test-data/chat-entry-desk-package`), whose coordinator `desk-lead` configures `desk-alpha`, bundled in sibling `desk-helper` (unresolved for CONFIGURED). The team starts, logs `skipped-unresolved-held-by-weak`, and can discover `desk-alpha`. After the chat terminates, the link is removed. Cover Codex and Claude (ACP/Grok where available).
- **Header status** uses the existing run-status mapping.
- **Title** is the run summary, truncated to 42 characters with an ellipsis.
- **Tree:** `/chat?id` sets the selected row, expands its workspace and agent, and is selected with `bg-indigo-50 text-indigo-900`.
- **Keep `resolveAgentPrimaryAction` semantics.** Only `hasDraft` changes: text OR tags OR attachments, per the spec's "Send disabled until there is text, a tag or an attachment". Check the current attachment rule in `resolveAgentPrimaryAction` and extend it minimally.
- **Docs:** update `autobyteus-web/docs` (navigation, chat, agent execution) and the server agent-definition docs for `skillScope` and the built-in Daily Assistant.
