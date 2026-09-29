# Implementation Handoff — chat-interface-entry

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry`, branch `codex/chat-interface-entry`, base `origin/personal@fcd3e83a4`, finalization target `personal`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected. It passed ARCH-REV-003 (IR-001), ARCH-REV-005 (SR-009, IR-002), ARCH-REV-006 (SR-010, IR-003), ARCH-REV-008 (SR-012, IR-004) and ARCH-REV-010 (SR-014, IR-005). IR-005 completes the D-17 delta, so `get_handoff_rules` routes it to code review (Large/High).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/requirements-doc.md` (SR-003)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/solution-revision-record.md` (SR-003, SR-004, SR-007, SR-008, SR-009, SR-010)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-spec.md` (SR-010, D-01..D-15; D-14 revised in SR-010)
- Supplemental task artifacts (normative R2 UI): `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/ui-ux-spec.md`, `.../visual-references/` (VIS-001..025, `manifest.json`), `.../ui-behavior-test-matrix.md`. Product design handoffs: `product-design-request-handoff.md`, `product-design-revision-request-handoff.md` in the ticket folder.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-revision-record.md`; handoff: `.../architecture-review-handoff.md`
- Triggering rework reports (IR-002):
  - API/E2E: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-execution-coverage-report.md`, with the ledger `api-e2e-test-case-ledger.md`, the evidence folder `api-e2e-evidence/` and `api-e2e-revision-record.md` (API-REV-001).
  - Code review: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md` and `code-review-revision-record.md` (CRR-002).
- Implementation evidence (IR-002): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-evidence/README.md`, together with the probes and the result folders beside it.

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-revision-record.md`
- Current implementation revision ID: `IR-006` (IR-005: D-17; IR-004: D-16 labels; IR-003: D-14 marker; IR-002: CR-002 and D-15; IR-001: baseline)
- Related solution revision IDs: SR-003, SR-004, SR-007, SR-008, SR-009, SR-010
- Related architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004, ARCH-REV-005, ARCH-REV-006
- Related code-review revision IDs: CRR-001, CRR-002
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Triggering finding IDs: CR-002 (F-01), CR-003 (F-02), CR-004 (F-03), AR-008, IC-1, IC-2; for IR-003, the IR-002 D-14 Design Impact (AF-33) and R-2 / MP-013

Commits (in design change-sequence order):

| Commit | Step | Content |
| --- | --- | --- |
| `770b14651` | 1 | Server `skillScope`, `InstalledSkillRecord`, `SkillService.listInstalledSkillRecords()`, ALL_INSTALLED record bindings, `hasEffectiveSkills` |
| `b7336203a` | 2 | Built-in Daily Assistant, `BuiltInAgentSyncPolicy` (`overwrite` / `seedIfMissing`) |
| `3655bd20a` | 3 | Web `skillScope` contract and agent editor/card/detail |
| `49b0ef457` | 4 | Behavior-preserving refactor: `ComposerTarget`, voice request by target, extracted input pieces, scoped `useRightPanel`, `WorkspaceToolShell` |
| `360de94a9` | 5 | Skill-request instruction codec, `requestedSkillNames`, message chips |
| `797d49d6a` | 6–9 | Chat draft/launch/routing, Chat components and pages, removals, localization, docs |
| `717603e61` | — | Ticket package (IR-001) |
| `59a20f21b` | IR-006 | CRR-008 Local Fix: CR-005 run settings scoped to their run (pages/chat.vue; Team quick path); CR-006 neutral `useAnchoredPopover` and `utils/skills/skillTagMenu` |
| `1f5fd8004` | IR-005 | D-17 (R3): chat run view = product agent run view in the workspace frame; `AgentWorkspaceView` restored; `DraftRunConfigEditor`; `/` skill tagging in the product box; shared right-panel state; contextual default tab rule; removals of the Chat run view and persisted footer |
| `9d65adf6e` | IR-004 | D-16 Chat model labels (UVF-001): the shared label policy via `toChatModelOption`, Recommended-first order, one search predicate, label + badge + secondary rows; `existingRunChoiceLabelInput` and `compareRecommendedFirstBy` moved into the shared utils |
| `5f11d52f6` | IR-003 | D-14 activation-pending marker (SR-010): mark/clear in `agentRunStore`, `onSendMessageCommandAck`, reconcile skip + clear on active snapshot, SR-008 guard removed; R-2 workspace request generation; web execution doc |
| `da1033860` | IR-002 | CR-002 footer thinking source; D-14 `submissionPending` reconcile guard; D-15 request strength (Rule 1, Rule 2 A/B, IC-1, IC-2) across Codex/Claude/ACP-Grok/AGY; `workspace-skill-links.ts` split; server skills doc |

### IR-006 outcome (CRR-008 Local Fix)

- **CR-005.** Run settings (⚙) now belong to the run they were opened for.
  - Chat shows the conversation whenever it displays any other run: a new chat after ⚙, another chat, or a mount with settings open elsewhere.
  - A draft's settings survive its temp → permanent promotion.
  - The Team quick path opens on the team's conversation.
  - The fix is unit-tested, and verified live for both a first send and a failed first send.
- **CR-006.** The popover composable and the skill-tag helpers are now neutral (`composables/popover/useAnchoredPopover.ts`, `utils/skills/skillTagMenu.ts`). `agentInput` imports nothing from `composables/chat`.

### IR-005 outcome

- **D-17 (R3, SR-013/SR-014; UVF-002) is implemented.** After the first message a chat is the product agent run view in the workspace frame.
  - `/chat?id` renders `WorkspaceAdaptiveLayout` with `AgentWorkspaceView` restored, and its geometry equals the Team view.
  - The header shows the run-summary title, status, ⚙ and ＋; ＋ opens a preset New chat.
  - The product box offers `/` skill tags through an optional `skillTagging` capability (standalone only).
  - ⚙ uses `ExistingRunConfigEditor` for persisted runs, and the new local `DraftRunConfigEditor` for `temp-*` drafts (no server call).
- **Tabs and panel.** `useRightPanel` is one shared, default-open preference again. `useRightSideTabs` owns the contextual default tab rule (AR-010): a strip click opens exactly that tab, and reopening a run keeps its tab.
- **Removed:** the Chat run view and header, the persisted model footer, the persisted menu modes, and the chat panel scope. D-16 labels remain for the New chat menu; the run settings editor keeps `existingRunChoiceLabelInput`.
- **Local fix within D-17 (VIS-017):** `ExistingRunConfigEditor` shows the known workspace for a run reopened with a history-derived workspace id.
- **Evidence:** live checks A to K pass (`implementation-evidence/README.md` § D-17), covering VIS-015, 016, 017, 018, 019, 026 and 027, the frame geometry, the tab rules, the shared collapsed state, AC-009 Save → resume, both draft ⚙ paths, `/`, ＋ and narrow.
- **For API/E2E:** `tests/e2e/chat-entry-live-probe.mjs` (theirs) targets the removed `chat-run-view` / `chat-run-status` / `chat-runtime-fixed-note` selectors.

### IR-004 outcome

- **D-16 / UVF-001 (REQ-021, AC-018, DEC-015) is implemented.** Chat's model rows, search, footer trigger and persisted fixed list now name models exactly as the launch form does:
  - Claude Agent SDK: the canonical name, then "display name · description", with Recommended first.
  - Codex and the other non-AutoByteus runtimes: the display name.
  - AutoByteus: the identifier.
- The selection identity (`llmModelIdentifier`), D-08 and D-12 are unchanged.
- The gear editor now imports the moved `existingRunChoiceLabelInput`; its labels are unchanged (V-L5).
- V-L1 to V-L4 were verified live against the real catalog; V-L5 is covered by a regression test. See IR-004 in the revision record.
- Test note: under the session's current `LANG=de_DE`, the merged-in `TokenUsageMeterPanel.spec.ts` fails on locale number formatting. It passes under `en_US`, is unrelated to this change, and came in with `origin/personal`.

### IR-003 outcome

- **D-14 / CR-003 / F-02 / RSK-007 are resolved as revised in SR-010.**
  - `agentRunStore` owns the activation-pending marker.
  - A first send is marked with the permanent id right after promotion. A resume of an Offline/Error run is marked when the submission starts. Both happen before the stream connects.
  - Reconcile skips a marked run and clears the marker once a snapshot lists the run as `isActive || shouldConnectStream`.
  - The send owner clears it on a handled failure (including the connect timeout), on a rejected `SEND_MESSAGE` ack (the new `onSendMessageCommandAck`), and on terminate/close.
  - Live `AGENT_STATUS` never clears it. The SR-008 `submissionPending` guard is removed.
- **Evidence** (`implementation-evidence/README.md` § D-14 (SR-010)):
  - The deterministic stale reproductions fail without the marker and pass with it, for both a first send and an Offline resume.
  - The resend journey passed 14/14 with 0 losses.
  - No close of P was observed with the marker, so there was nothing to return as `Unclear`.
- **R-2 (optional) is included:** the workspace branch of `fetchRunHistoryTree` now carries a request generation.

### IR-002 outcome

- **CR-002 / F-01** (a `Local Fix`) is resolved.
  - `chatRunModelControls` now loads the persisted run's runtime catalog, which is the thinking-schema source.
  - Verified live: a live Codex chat opened fresh shows its thinking control locked at "Low", with the lock tooltip.
- **D-15 / CR-004 / F-03 / AR-008** are implemented, including IC-1 and IC-2.
  - The live probe passes V-A to V-E on Claude, Codex and Grok (ACP), and V-D on AGY.
- **D-14 / CR-003 / F-02: Design Impact.** This was superseded by IR-003 (SR-010). The guard is implemented exactly as designed, and the unit reproduction passes. The required live evidence, though, shows the guard cannot close the race:
  - The closer is `reconcileDiscoveredActiveRuns`, as the design expected.
  - But `submissionPending` is already `false` when it fires. The backend sends `AGENT_STATUS {status: offline}` as soon as the socket connects, and `applyLiveAgentStatusEvent` clears the flag before `SEND_MESSAGE`.
  - The deterministic reproduction fails both before and after the guard.
  - The 14× resend probe streamed 14/14, but it depends on natural timing and is not proof.
  - Per the package ("do not add other guards"), no further guard was added. Evidence: `implementation-evidence/README.md` § D-14.
  - Options for the designer (none implemented):
    - (a) Do not treat a connect-time `offline` status as the end of a pending submission. For example, clear the flag only on a non-offline status, a SEND_MESSAGE acknowledgement, or a handled failure.
    - (b) Give reconcile a dedicated "first send not yet acknowledged" marker.
    - (c) Have history snapshots report a prepared, not-yet-started run with a pending first send as not reconcilable.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md classification (carried from SR-010 / ARCH-REV-006).
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: unchanged by IR-002, which adds a shared registry change on four runtimes plus the reconcile invariant. The change spans a server contract (`skillScope` in GraphQL and persisted `agent-config.json`), runtime skill exposure on every runtime, a new built-in agent sync policy, shell routing (`/`, `/chat`, `/workspace` redirect), and a shared message-box ownership refactor used by team and org views. No scope was added beyond the design.
- Selected route: `Code Review` (Large/High; via `get_handoff_rules`).
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` after IR-003. The IR-002 D-14 Design Impact was resolved by SR-010. History: Its premise (AF-30: "`submissionPending` stays true through prepare → connect → send") is contradicted by the connect-time `AGENT_STATUS offline` frame; evidence is above. RSK-003 is resolved by D-15.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Chat first in nav; `/` → `/chat` | `composables/useShellPrimaryNavigation.ts` (`chat` key), `components/AppLeftPanel.vue` (Chat item + `app-left-panel-new-chat` pencil), `pages/index.vue` | Implemented |
| BEH-005 | Chat → type → send → Daily Assistant run in chat view | `stores/chatDraftStore.ts` → `composables/chat/chatDraftComposerTarget.ts` → `services/chat/chatLaunchService.ts#launchAgentChat` (D-04 order) → `agentContextsStore.registerDraftRun` → `agentRunStore.sendUserInputAndSubscribe` → `/chat?id=<selected id>`; `pages/chat.vue` + `useChatRouteRunSync` (D-13) | Implemented; a failed first send lands on `/chat?id=<temp>`. **IR-002 (D-14):** `reconcileDiscoveredActiveRuns` skips `submissionPending` contexts. This is insufficient; see the Design Impact. **IR-003 (D-14, SR-010):** an activation-pending marker in `agentRunStore` (first send and Offline/Error resume) replaces the IR-002 guard; `reconcileDiscoveredActiveRuns` skips marked runs and clears the marker on an active snapshot; R-2 adds a workspace request generation |
| BEH-003 | Compact model menu, schema thinking, last-used default | `components/chat/ChatModelMenu.vue`, `ChatModelList.vue`, `ChatThinkingControl.vue`, `composables/chat/useChatModelCatalog.ts` (catalogs load on the first search keystroke, "Searching all runtimes…", RSK-001), `utils/chat/chatLastModelPreference.ts` (D-12) | Implemented; last-used is written only after a successful promotion |
| BEH-004 | Temp workspace default; pick existing or open folder before send | `components/chat/ChatWorkspaceMenu.vue`, `chatLaunchService#resolveChatWorkspace` (`ensureRunHistoryWorkspaceByRootPath`) | Implemented; folder is resolved at send, before register |
| BEH-007 | `/` tags → instruction in content; chips on the message | `components/chat/ChatSkillMenu.vue`, `chatComposerMenus.ts`, `useChatComposerOptions.ts` (ALL_INSTALLED → enabled `skillStore` skills; else configured names), `utils/skills/skillRequestInstruction.ts`, `AgentContext.requestedSkillNames`, `agentRunStore` compose, `components/conversation/SkillRequestChips.vue`, `utils/runTreeSummary.ts` | Implemented |
| BEH-008 | `@` / tree `+` → New chat addressed to the agent with preset workspace | `ChatTargetMenu.vue`, `chatDraftStore.setTarget` (rebuilds both definition ids, AF-27), `WorkspaceAgentRunsTreePanel.vue#startPresetChat` → `startNewChat` + `/chat` | Implemented |
| BEH-009 | `@team` → uniform team launch, coordinator focus, Team view | `chatLaunchService#launchTeamChat`, `services/chat/chatTeamLaunchConfig.ts`, `agentTeamRunStore.sendMessageToFocusedMember(..., { attachmentDraftOwner })` | Implemented; team runtime catalog primed; orphan team draft removed on failure |
| BEH-010 | Offline run footer model: locked while live; saves through existing owner; runtime fixed | `components/chat/chatRunModelControls.ts` (mode by run id, never `isLocked`; `existingRunConfigStore` load/update/setSchemaState/save; `attemptedRunId` latch) | Implemented (D-08, AF-28). **IR-002 (CR-002):** persisted mode loads the run's runtime catalog (the thinking-schema source) when it is `idle`, so a live run opened fresh shows the locked thinking control. DEC-009 is kept |
| BEH-011 | Single-agent run opens in chat view with tools collapsed; team/org unchanged | `ChatRunView.vue` in `WorkspaceToolShell` scope `chat`; `composables/useRightPanel.ts` per-scope visibility; `workspaceNavigationService` (`buildAgentRunChatRoute`, `resolveSelectionRoute`, agent links → chat); `pages/workspace.vue` selection-change redirect (RSK-005) | Implemented |
| BEH-012 | Same box and Context Files area plus Chat features; team/org unchanged | `composables/agentInput/useComposerTarget.ts`, `AgentUserInputTextArea.vue` / `ContextFilePathInputArea.vue` `target` prop, `VoiceInputButton.vue`, `VoiceInputStatusRow.vue`, `MessagePrimaryActionButton.vue`, `useComposerFilePathDrop.ts`, `ChatComposer.vue` | Implemented; step 4 landed with team/org/agent tests passing before chat code (RSK-004) |
| BEH-013 | Default Auto-approve for new chats | `ChatApprovalToggle.vue`, `chatDraftStore.setAutoExecuteTools`; applied to agent config and team root config | Implemented |
| BEH-014 | Chats are normal tree rows; missing id state | `pages/chat.vue` (mounted / open via `openWorkspaceExecutionLink` / missing / unregistered temp → `/chat`); tree `selectedRunId` on `/chat` comes from the route id | Implemented |
| REQ-007 (system) | Built-in Daily Assistant; ALL_INSTALLED expansion | Server `built-in-agent-registry.ts` / `built-in-agent-bootstrapper.ts` (`seedIfMissing`), `templates/daily-assistant/`; `skill-service.ts` (`listInstalledSkillRecords`, record bindings, `hasEffectiveSkills`), `configured-agent-skill-resolver.ts#resolveInstalledRecordDetailed`; runtime factories (AutoByteus `hasEffectiveSkills`, AGY `resolveSkillAccessMode` via `hasEffectiveSkills`, Codex/Claude/ACP through SkillService) | Implemented (D-09, D-10, D-11). **IR-002 (D-15):** `SkillService.resolveSkillScope` → `skillRequestStrengthForScope` → a run-level `requestStrength` on Codex, Claude, ACP/Grok and AGY. Rule 1 (`skipped-workspace-owned`) and Rule 2 A/B (`skipped-held-by-other-run` / `yielded-to-configured`) live in `workspace-skill-materializer.ts`, with link operations in `workspace-skill-links.ts` and AGY Rule 1 in `agy-configured-skill-materializer.ts` |
| REQ-017 | Catalog launch forms unchanged; a standalone run started from `RunConfigPanel` opens in chat | `RunConfigPanel` unchanged; selection change on `/workspace` redirects to `/chat?id=<temp>`, then route sync follows promotion | Implemented. **IR-002:** a configured launch never fails because a live ALL_INSTALLED chat holds the same skill name (D-15 Direction B, V-B) |

## Key Files Or Areas

Server (`autobyteus-server-ts`):
- `src/agent-definition/domain/models.ts`, `providers/agent-definition-config.ts`, `providers/file-agent-definition-provider.ts`, `application-owned-agent-source.ts`, `services/agent-definition-service.ts`, GraphQL `types/agent-definition.ts`, `converters/agent-definition-converter.ts`, agent tools `get-agent-definition.ts` / `list-agent-definitions.ts`.
- `src/skills/domain/installed-skill-record.ts`, `src/skills/utils/skill-discovery.ts`, `src/skills/services/configured-agent-skill-resolver.ts`, `src/skills/services/skill-service.ts`.
- Runtime factories (AutoByteus, AGY), `src/built-in-agents/*` and `templates/daily-assistant/`, `scripts/smoke-built-in-agents-bootstrap.mjs`.
- Docs: `docs/modules/agent_definition.md` (Skill Scope; sync policies; Daily Assistant), `docs/modules/skills.md` (installed records / ALL_INSTALLED; IR-002 "Request strength").
- IR-002 (D-15):
  - new `src/agent-execution/backends/shared/skill-request-strength.ts` and `workspace-skill-links.ts`;
  - reworked `workspace-skill-materializer.ts`;
  - `antigravity/capsule/agy-configured-skill-materializer.ts`, `agy-run-capsule.ts`, `antigravity/backend/agy-agent-run-backend-factory.ts`;
  - `codex/backend/codex-thread-bootstrapper.ts`, `claude/backend/claude-session-bootstrapper.ts`, `acp/backend/acp-agent-run-backend-factory.ts`;
  - `skills/services/skill-service.ts` (`resolveSkillScope`).

Web (`autobyteus-web`):
- New: `components/chat/*`, `composables/chat/*`, `services/chat/*`, `stores/chatDraftStore.ts`, `utils/chat/*`, `pages/chat.vue`, `components/layout/WorkspaceToolShell.vue`, `composables/agentInput/useComposerTarget.ts`, `useComposerFilePathDrop.ts`, `components/agentInput/VoiceInputButton.vue`, `VoiceInputStatusRow.vue`, `MessagePrimaryActionButton.vue`, `components/conversation/SkillRequestChips.vue`, `utils/skills/skillRequestInstruction.ts`, `localization/messages/{en,zh-CN}/chat.ts`, `docs/chat.md`.
- Changed: `AppLeftPanel.vue`, `WorkspaceAdaptiveLayout.vue`, `WorkspaceAgentRunsTreePanel.vue`, `useWorkspaceHistorySelectionActions.ts`, `useShellPrimaryNavigation.ts`, `useRightPanel.ts`, `layouts/default.vue` (left-drawer backdrop leaves the right strip reachable on `/chat?id=` too), `pages/index.vue`, `pages/workspace.vue`, `stores/agentContextsStore.ts` (`registerDraftRun`), `stores/agentTeamRunStore.ts`, `stores/agentRunStore.ts`, `stores/voiceInputStore.ts`, `stores/activeContextStore.ts`, `services/workspace/workspaceNavigationService.ts`, `AgentDefinitionForm.vue` and agent card/detail, docs (`workspace_layout.md`, `agent_execution_architecture.md`, `agent_management.md`, `skills.md`).
- IR-002 web: `components/chat/chatRunModelControls.ts` (CR-002) and `stores/runHistoryLoadActions.ts` (D-14).
- Removed: `components/workspace/agent/AgentWorkspaceView.vue` (+ spec), `stores/runHistoryDraftActions.ts`, `runHistoryStore.createDraftRun`, the standalone branch in `WorkspaceAdaptiveLayout`, their i18n keys.

## Important Assumptions

- Local implementation decisions (within the design, not changing behavior contracts):
  - Attachments-only send is allowed only for standalone agents (`hasSendableDraft(draft, { attachmentsAreSendable })`, true only for `standalone_agent`), so the team/org box keeps its current send rule (REQ-013).
  - For the AGY detailed path, a non-global installed record whose folder name differs from its `SKILL.md` name is reported as `name_mismatch` and omitted, matching the existing configured-resolution rule that a folder must match its manifest name.
  - The model menu uses the model identifier as the label and the descriptive name as the title. Some runtimes (Codex) return long descriptive names that broke the compact layout.
  - `SkillImprovementComposerCta` is kept in `ChatRunView` so Skill Improvement stays reachable for chat runs.
  - `VoiceInputStatusRow` was extracted alongside `VoiceInputButton` so the Chat composer and the existing box show the same recording status.
  - The Daily Assistant template omits `download_audio` / `download_video` because those tools do not exist in the server tool registry.
  - The team quick path primes `teamRunConfigStore.setRuntimeModelCatalog` before launch. Without it, team readiness reported "Models for … are still loading" for runtimes not yet loaded by the team form.
  - A failed team launch removes the created Team launch draft and clears its selection, so no orphan draft row remains.
  - Workspace folder paths must be absolute; `~` paths are rejected in the menu, because the server does not expand `~`.
- IR-002 local decisions, within D-15:
  - Each acquisition gets its own descriptor (`holderId`, `requestStrength`). Callers only use descriptors for cleanup and counts. This replaces the shared descriptor object, as IC-1 requires.
  - Strength applies to `reconcile-discoverable` requests too. A configured request for a name Codex already discovers can still re-point a weak holder's link.
  - If a re-point finds the configured source unavailable (no `SKILL.md`), the weak holders keep the path and the configured run omits the skill (disposition `skipped`), rather than failing.
  - If a re-point fails, the previous source and holders are restored, and the error goes to the configured run.
  - The live Codex V cases use `resume-designer` rather than `software-tutorial-video-maker`. The latter is natively discoverable from the user's `~/.codex/skills`, so Codex creates no workspace link for it.
- `generated/graphql.ts` received only the `skillScope` delta by hand. A full codegen run against the current schema produced large unrelated drift.

## Known Risks

- RSK-007 / D-14 is resolved in IR-003; the stale reproductions pass for a first send and an Offline resume. Residual: the marker has no timeout. A send the server accepts but never activates stays out of reconcile teardown until terminate, close, a failure or a rejected ack.
- AGY ALL_INSTALLED collisions with workspace skills are resolved by D-15 Rule 1 (live V-D on AGY). Capsule size and time passed API/E2E on the real catalog (RSK-003).
- Voice dictation is still not exercised live, because the extension is absent. The IR-002 D-15 materialization was exercised live on Claude, Codex, Grok (ACP) and AGY.
- Advanced model parameters beyond the schema-driven thinking control are not exposed for single-agent runs in the chat footer. This is per the UI spec, but it narrows what the removed standalone gear editor offered (design Cost note, D-08).
- RSK-006 (accepted): on Codex, a reloaded user message may include the appended context-file reference section in the "Sent to the agent as" tooltip.
- `origin/personal` has advanced 6 commits past the base (AGY native image output, a release bump).
  - A trial `git merge-tree` against `origin/personal@e6c16d801` is clean, re-checked in IR-002.
  - After merging, the upstream `tests/e2e/runtime/agy-native-image-codex-skill.e2e.test.ts` calls `createAgyRunCapsule` without the new required `skillRequestStrength`. At runtime it behaves as `configured`, which was the old behavior, but it needs the field added to type-check.
- Tradeoff to tell the user: standalone agent runs no longer have the gear/run-config editor or the "new agent" header action. Model and thinking edits happen in the chat footer (locked while live), and new chats start from the pencil or the tree `+`.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement`
- Reviewed root-cause classification: `Boundary Or Ownership Issue`
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: `ComposerTarget`, `WorkspaceToolShell`, centralized run-route resolution in `workspaceNavigationService`, and SkillService-owned effective skill resolution were implemented as designed. Step 4 landed as its own commit (`49b0ef457`) with the team/org/agent suites passing before any chat code.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes`. `AgentWorkspaceView` and its spec, `runHistoryDraftActions`, `runHistoryStore.createDraftRun`, the standalone config mode in `WorkspaceAdaptiveLayout`, `emitRunCreated`/run-created wiring, the agent `/workspace` execution-link kind, `voiceInputStore`'s `activeContextStore` dependency, and the stale i18n keys are all gone.
- Shared structures remain tight: `Yes`. `VoiceInputRecordingRequest` is a discriminated union, and `ComposerTarget.access` is a closed union.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`.
  - IR-002: `workspace-skill-materializer.ts` went from 500 to 395 non-empty lines after its link operations moved into `workspace-skill-links.ts` (182). `skill-service.ts` is at 474, `agy-configured-skill-materializer.ts` at 169 and `chatRunModelControls.ts` at 175.
  - IR-001: The largest changed source files are `voiceInputStore.ts` at 500 (was 499), `skill-service.ts` at 463 (+33; 114-line delta) and `runHistoryStore.ts` at 487 (shrank). The only >220 changed-line deltas are `AgentUserInputTextArea.vue` (252, a split that moved logic out to the new pieces) and `WorkspaceAdaptiveLayout.vue` (271, the extraction to `WorkspaceToolShell`); both shrank.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration` for `agent-config.json`. The Daily Assistant folder and `autobyteus.chat.lastModel` are new data.
- Design-spec decision reference: "Persisted Data / State Transition Decision".
- Implementation follows the approved decision: `Yes`. A missing or unknown `skillScope` normalizes to `CONFIGURED` in `normalizeAgentSkillScope`, and the writer persists the normalized value. The Daily Assistant uses `seedIfMissing` and never overwrites user edits (bootstrapper tests plus the smoke script's reseed check).
- Deviation: `None`

## Environment Or Dependency Notes

- Server typecheck and tests need the dependency packages built first (`pnpm --filter "autobyteus-server-ts^..." build`) and `npx prisma generate`. Use `tsconfig.build.json`; the root `tsconfig.json` has pre-existing rootDir errors.
- Web tests need `npx nuxi prepare`. Run them with `pnpm test:nuxt run` (it sets `NUXT_TEST=true`) and `pnpm test:electron run`; a plain `npx vitest` wrongly runs an electron-only spec.
- The untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are local build outputs and are not committed.
- Dev env: `pnpm dev` from the worktree (backend :8000, web :3000, data root `.autobyteus/development`). It is stopped.

## Local Implementation Checks Run

IR-003:
- **Web**
  - `pnpm test:nuxt run`: 3337 passed. The only failing files are the 4 baseline ones.
  - `pnpm test:electron run`: 177 passed.
  - vue-tsc: no errors in the changed files. The web-boundary, localization-boundary and literal-audit guards pass.
  - `runHistoryReconcileActivationPending.spec.ts` (6 tests): five fail against the previous `runHistoryLoadActions.ts`; the sixth (no Offline cleanup) also passes there, because the old guard covered `submissionPending === true`.
  - `agentRunStore.spec.ts`: 8 marker tests. They cover marking a first send (after promotion, before connect) and an Offline or Error resume; not marking a live run; and clearing the marker on a handled failure, a connect timeout, a rejected but not an accepted ack, terminate and close.
  - `AgentStreamingService.spec.ts`: the ack callback, including that the ack is still projected.
- **Live** (`implementation-evidence/`): first-send and Offline-resume stale reproductions fail without the marker and pass with it. The resend journey passed 14/14 with 0 losses.

IR-002:
- **Server**
  - `tsc -p tsconfig.build.json`: clean.
  - `pnpm build:full` (build + built-in smoke): passed.
  - `vitest run tests/unit/agent-execution tests/unit/skills tests/unit/agent-definition tests/unit/built-in-agents`: 1038 passed. Failures are only the baseline `agent-run-provisioning-service` and `codex-tool-log-correlation`.
  - New or changed materializer tests: 35/35 pass. They cover Rule 1 weak/strong, joiner strengths, Direction A (after a strong and after a weak holder), Direction B (ready and acquiring), strong vs strong, an unavailable configured source, IC-1 release in both orders plus a repeated release, IC-2 with EPERM/EEXIST fallback, and an EIO restore.
  - Touched integration tests pass, except `brief-package-team-prompt`. That test needs a built `applications/brief-studio` package and fails identically without these changes.
- **Web**
  - `pnpm test:nuxt run`: 3324 passed. The only failing files are the 4 baseline ones.
  - `pnpm test:electron run`: 177 passed. One unrelated flake appeared in one of four runs.
  - vue-tsc: no errors in the changed files.
  - `runHistoryReconcilePendingSubmission.spec.ts` fails without the D-14 guard and passes with it.
  - `chatRunModelControls.spec.ts`: 6 pass, including 2 new CR-002 tests.
- **Live probes** (in `implementation-evidence/`)
  - D-15: V-A to V-E on Claude, Codex and Grok (ACP), and V-D on AGY. All pass.
  - D-14: the stale reproduction is LOST both before and after the guard (the Design Impact). The 14× resend probe had 0 losses.

IR-001:

- Server: `vitest run tests/unit/skills tests/unit/agent-definition tests/unit/built-in-agents tests/unit/agent-execution/backends`: 741 passed, 4 failed. All 4 failures are in the baseline `codex-tool-log-correlation.test.ts`.
- Server: `tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts` (includes the skillScope round-trip): 7/7 passed.
- Server: `pnpm build:full` (clean build + typecheck + built-in-agent bootstrap smoke): passed.
- Web: `pnpm test:nuxt run`: 3320 passed, 4 failed files. All 4 are baseline failures:
  - `WorkspaceAgentRunsTreePanel.regressions` (2 team tests);
  - `StartupDelayLifecycle`;
  - `org-definition-navigation`;
  - `app-font-size-fixed-px-audit` (only `token-usage` files are flagged; the `components/chat` and `pages/chat.vue` perimeter is clean).
  - `workspace-history-draft-send.integration` failed on the baseline and now passes after its rewrite.
- Web: `pnpm test:electron run`: 177 passed.
- Web: `vue-tsc --noEmit`, compared per file and message against the base commit type-checked in a temporary worktree. No new errors. The remaining errors in changed files exist on the base with different type text.
- Web: `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`: passed.
- Server baseline failures not rerun here (pre-existing, unrelated): skill-improvement graphql/notification, agent-run-provisioning, workspace-converter, studio-application-api-services, memory-view-member-resolver, e2e agent-packages-graphql / json-file-persistence-contract.

## Frontend Rendered-Result Check (When Applicable)

IR-002 (CR-002):
- Setup: the dev env (`pnpm dev`) with a Codex `gpt-5.6-sol` chat. Its New chat footer showed thinking at "Low" after the catalog loaded.
- Journey: send, wait for the reply (the run is live), then load the page fresh on `/chat?id=<run>`.
- Result: the footer shows the model (`aria-disabled`) and the thinking trigger both locked. The trigger has `data-locked=true`, the label "Low", and the tooltip "Locked while the run is live…". This matches UXJ-007/VIS-015. The screenshot tool failed, so this was verified by DOM inspection.
- DEC-009 (the control is hidden for a model without thinking parameters) is covered by the unit behavior: no schema means no control.

IR-001:

- Affected surfaces / journeys:
  - `/` redirect; New chat landing; model, thinking, workspace, approval, `/` skill and `@` target menus.
  - Agent launch and promotion; the chat run view (header, conversation, composer footer, tool strip).
  - The offline-run footer model edit; the team quick path; the tree `+`.
  - Catalog Run → chat; missing or temp ids; the `/workspace` redirect.
- Approved references: `ui-ux-spec.md` R2 and VIS-001/003/008/010/013/015/017/018/023/024 from `visual-references/`. The prototype `components/chat/*` was used as a markup and styling reference only; its state, fixtures and projection were not ported.
- Existing design system reviewed: the existing message box, Context Files area, `AgentEventMonitor`, right-tool shell, left panel, tree, and the Tailwind tokens and typography perimeter.
- Project development / preview used: `pnpm dev` in the worktree with the browser renderer (Nuxt dev at :3000). A temporary viewport harness page was used for fixed-size inspection and has been deleted.
- States, layouts, viewports and interactions inspected at 1440×900 and 390×844:
  - Landing, the model menu with search and drill-in, and the thinking control.
  - `/` chips and `@` agent/team selection.
  - Workspace folder validation, including the relative and `~` errors.
  - Launching a Codex chat with ALL_INSTALLED, and chips after reload.
  - Terminate → Offline → a fixed-runtime model save (verified server-side) → resume; reopening after reload (AF-28).
  - Tool strip open and collapse; tree `+`.
  - Catalog Run → redirect → `/chat?id=temp` → promotion route replace (D-13).
  - Missing and unregistered temp ids.
  - Team quick path to the Team view, and an upload attributed to `agent_draft`.
  - The narrow bottom-sheet menus.
- Issues found and corrected:
  - The model submenu was clipped by an overflow container.
  - Codex model labels were too long.
  - Team launch hit a "models still loading" block.
  - The header showed `temp_workspace` after reopen.
  - A route race on promotion.
  - A model-load retry loop on a failed canonical load.
  - Typed text was not reactive in the draft (shallow ref).
  - The left-drawer backdrop covered the chat right strip.
- Remaining unverified states or limitations:
  - Voice recording (extension absent).
  - AGY and Claude runtimes live.
  - Keyboard-only traversal of every menu was spot-checked, not exhaustively verified.

## Downstream Coverage Hints / Suggested Scenarios

- ALL_INSTALLED on each available runtime (AutoByteus, Codex, Claude, AGY), with a skill bundled inside another agent package folder. Confirm it binds from that folder, disabled skills are excluded, and AGY capsule size stays within limits (RSK-003).
- Daily Assistant seed: fresh data root → seeded; edit `agent.md` → restart → edit preserved; delete `agent-config.json` → restart → restored.
- D-13: send from the New chat and from a failed-then-resent temp chat; the URL must end on the permanent id each time.
- D-08: reopen an Offline run after reload (`isLocked === false`) → the footer saves through `existingRunConfigStore`, the runtime is fixed, and it is locked while Running/Idle.
- RSK-005: with an Agent Org route shown, selecting runs must not redirect; opening `/workspace` with a stale standalone selection must not redirect on mount.
- Team quick path with an attachment: it is finalized to the coordinator member and every member gets the chosen runtime and model.
- Skill tag message: the content carries the instruction prefix, and the reloaded message shows chips.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Live multi-runtime ALL_INSTALLED materialization and capsule-limit validation (Claude, AGY).
- Built-in Daily Assistant seeding across restart and upgrade in a packaged or Electron build.
- End-to-end browser coverage of the Chat journeys above, including narrow viewports and voice input with the extension installed.
