# Design Spec — chat-interface-entry

## Solution And Approval Basis

- Current solution revision ID: `SR-010`. D-14 was revised after the IR-002 implementation evidence; D-15 and CR-002 are implemented and unchanged. Earlier: `SR-009` (ARCH-REV-005 Pass) and `SR-008`. This revision addresses the API/E2E failure-origin review CRR-002 (CR-004 Design Impact, CR-003 Unclear, and the sequencing of the CR-002 local fix). SR-007 addressed ARCH-REV-002 and passed ARCH-REV-003.
- Approved requirements baseline and user-approval reference:
  - Baseline: `requirements-doc.md` `SR-003`.
  - User approval: 2026-09-28 in the Solution Designer conversation.
  - `SR-004` integrated the R2 supplement without changing intended behavior.
- Behavior-defining supplements and their approval references:
  - Product `ui-ux-spec.md` revision R2 plus VIS-001–VIS-025. VIS-020 is superseded.
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
  - `AgentWorkspaceView` is removed.
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
  - **Unchanged:**
    - Same-source sharing.
    - `reconcile-discoverable` / `reconcile-unresolved` handling.
    - Repair of materializer-owned symlinks (`repaired`, `removed-and-skipped`).
    - AGY per-run capsule copies, which are not shared between runs, so Rule 2 does not arise for AGY.
  - **Presentation note (accepted):** when a workspace or held copy is used, `/` still shows the installed skill's description.
- - **D-12 — Last-used model.** One device-local value records the runtime and model. It is used as the New chat default, then the Daily Assistant default launch config, then the runtime default.

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
| `components/workspace/agent/AgentWorkspaceView.vue` and its branch in `WorkspaceAdaptiveLayout` | Standalone runs open in the chat view (D-05) | `ChatRunView` via `/chat?id` + redirect | In This Change | `AgentWorkspaceSurface` stays (org). Remove its i18n keys and tests |
| `runHistoryStore.createDraftRun` + `createDraftRunForHistoryStore` + `onCreateRun` draft path in `useWorkspaceHistorySelectionActions` | Tree `+` now starts a preset New chat (REQ-009) | `chatDraftStore.startNewChat({ agentDefinitionId, workspaceRootPath })` + route `/chat` | In This Change | Update `workspace-history-draft-send.integration.test.ts` |
| Direct `activeContextStore` reads inside `ContextFilePathInputArea.vue` / `AgentUserInputTextArea.vue` | Explicit `ComposerTarget` | `useComposerTarget` | In This Change | Behavior unchanged for team/org |
| Absolutely positioned mic/send markup inlined in `AgentUserInputTextArea.vue` | Extracted reusable buttons | `VoiceInputButton.vue`, `MessagePrimaryActionButton.vue` | In This Change | Same positions in the run-view box |
| Right-panel dock/strip/drawer code inside `WorkspaceAdaptiveLayout.vue` | Extracted shell | `WorkspaceToolShell.vue` | In This Change | — |
| `/workspace` agent execution-link handling (`workspaceExecutionKind=agent` built by `buildWorkspaceExecutionRoute`) | Agent links go to chat | `buildAgentRunChatRoute` | In This Change | Links are ephemeral route queries, not persisted |
| `voiceInputStore` capture of the composer target from `useActiveContextStore().activeAgentContext`, and the bare `VoiceInputRecordingSource` string parameter | Explicit target (AR-004) | Discriminated recording request | In This Change | Settings test recording behavior unchanged |
| Standalone-agent `showSelectedRunConfig` config mode in `WorkspaceAdaptiveLayout` (RunConfigPanel for a selected standalone run) and the `AgentWorkspaceView` header actions (`new-agent`, `edit-config`) | The chat view has no standalone gear or new-agent action | Chat footer (D-08); pencil / tree `+` for new chats | In This Change | Team/org config modes unchanged |
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
| `components/workspace/agent/AgentWorkspaceView.vue` | Remove | — | Replaced |
| `composables/useShellPrimaryNavigation.ts`, `components/AppLeftPanel.vue` | Modify | Nav | `chat` item first; pencil → `chatDraftStore.startNewChat()` + `/chat`; collapse on the first item; run-selected → `resolveSelectionRoute` |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, `composables/useWorkspaceHistorySelectionActions.ts` | Modify | Tree | `onCreateRun` → preset New chat; `/chat?id` selected-row sync and expansion |
| `stores/runHistoryStore.ts`, `stores/runHistoryDraftActions.ts` | Modify | History | Remove `createDraftRun` path |
| `services/workspace/workspaceNavigationService.ts` | Modify | Route authority | `buildAgentRunChatRoute`, `resolveSelectionRoute`; agent links → chat |
| `stores/agentContextsStore.ts` | Modify | Registration | `registerDraftRun` |
| `stores/agentRunStore.ts`, `types/agent/AgentContext.ts`, `services/runSubmission/localUserSubmission.ts`, `stores/activeContextStore.ts` | Modify | Send | Compose instruction; `initialSummary` = user text (tags-only fallback: the instruction); `requestedSkillNames`; clear on submission; `hasDraft` counts tags |
| `stores/agentTeamRunStore.ts` | Modify | Team send | `attachmentDraftOwner` option |
| `stores/runHistoryLoadActions.ts` | Modify | Reconcile (D-14, SR-010) | Skip contexts where `agentRunStore.isActivationPending(runId)`; clear the marker for runs in the active set. Remove the SR-008 `submissionPending` guard |
| `stores/agentRunStore.ts` (D-14) | Modify | Activation marker | `activationPendingRunIds` + mark/clear/is; set before connecting for first sends (after promotion) and Offline/Error resumes; clear on failure/cancel, a rejected ack, or terminate/close |
| `services/agentStreaming/AgentStreamingService.ts` | Modify | Send ack callback | `onSendMessageCommandAck(ack)` option, mirroring `onInterruptCommandResult` |
| `components/chat/chatRunModelControls.ts` (CR-002 local fix) | Modify | Footer thinking schema | Persisted mode ensures the run's runtime catalog/schema source is loaded (`useChatModelCatalog` / `llmProviderConfig` ensure for that runtime) whether live or Offline. Models with no thinking parameters still hide the control |
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
| Keep `AgentWorkspaceView` on `/workspace` alongside the chat view | Catalog-launched runs | Rejected | All standalone runs → chat view (D-05) |
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
- **Header status** uses the existing run-status mapping.
- **Title** is the run summary, truncated to 42 characters with an ellipsis.
- **Tree:** `/chat?id` sets the selected row, expands its workspace and agent, and is selected with `bg-indigo-50 text-indigo-900`.
- **Keep `resolveAgentPrimaryAction` semantics.** Only `hasDraft` changes: text OR tags OR attachments, per the spec's "Send disabled until there is text, a tag or an attachment". Check the current attachment rule in `resolveAgentPrimaryAction` and extend it minimally.
- **Docs:** update `autobyteus-web/docs` (navigation, chat, agent execution) and the server agent-definition docs for `skillScope` and the built-in Daily Assistant.
