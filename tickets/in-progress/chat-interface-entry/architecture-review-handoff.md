# Architecture Review Handoff — chat-interface-entry

- Result classification: `Architecture Design Complete`
- Package identifier: `chat-interface-entry`
- Current solution revision: `SR-007`. This is a re-review for ARCH-REV-002. Earlier bases: SR-005 (round 1) and SR-006 (round 2).
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-09-28
- Classification:
  - `task_size`: `Large`
  - `architectural_risk`: `High`
  - Evidence: design-spec "Task Size And Architectural Risk".

## Original Request And Goal

The user wants a first-class Chat entry above Agents, with a New chat button, that talks to one agent in a chat interface. By default the chat:
- goes to the built-in Daily Assistant, which has all installed skills
- uses the temp workspace, which the user can change
- auto-approves tools

The chat needs:
- an easy runtime + model menu (no Recent list) with a schema-driven thinking control
- `/` skill tags
- `@` to address an agent or a team, with a uniform team quick path

Other approved behavior:
- The Chat box is the existing message box plus Context Files area, with Chat-only additions.
- Every standalone agent run opens in the chat view, with the tool strip collapsed by default.
- Team and org views stay unchanged.
- The app lands on Chat at startup.
- Chats are normal runs in the Workspaces tree.

## Approval Basis

- Requirements:
  - `SR-003`, approved by the user on 2026-09-28.
  - `SR-004` integrated the user-confirmed R2 UI supplement with no change to intended behavior.
- UI/UX supplement (normative):
  - `ui-ux-spec.md` R2 and VIS-001–VIS-025. VIS-020 is superseded.
  - Location: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/`, prototype `origin/personal@8ac6cad`.
  - The user confirmed R1 (PC-035) and R2 ("I think now the chat box looks good").
  - All 24 visual-reference SHA-256 hashes were verified.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/requirements-doc.md`
- Investigation notes (AF-01–AF-22): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-spec.md`
- Solution revision record (SR-001–SR-005): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/solution-revision-record.md`
- Product requests (history):
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/product-design-request-handoff.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/product-design-revision-request-handoff.md`
- UI/UX spec R2: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/ui-ux-spec.md`
- Visual references: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/visual-references/` (+ `manifest.json`)
- Behavior test matrix: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/ui-behavior-test-matrix.md`
- Prior review artifacts (reviewer-owned; basis SR-005):
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md` (ARCH-REV-001, Fail, Design Impact)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-revision-record.md`

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry`
- Branch: `codex/chat-interface-entry`
- Base: `origin/personal@fcd3e83a4ca931ba52ed19bd37b8df3050ee529e`
- Finalization target: `personal`
- Source changes: none yet. Only ticket artifacts exist, and they are uncommitted.

## Design Highlights For Review

1. D-02: an explicit `ComposerTarget` replaces the direct `activeContextStore` reads in the message-box pieces. Team and org boxes must behave exactly as before.
2. D-03/D-04: the New chat draft is an unregistered `temp-*` AgentContext, so no tree row appears before send. Launch registers it and reuses `agentRunStore` first send.
3. D-05: all standalone agent runs route to `/chat?id=` through one resolver in `workspaceNavigationService`. `AgentWorkspaceView` and the tree `createDraftRun` path are removed.
4. D-06: the team quick path creates a root-only team launch draft focused on the coordinator. `sendMessageToFocusedMember` gets an explicit attachment source owner, and the server already permits `agent_draft` → `team_member_final`.
5. D-07: the `WorkspaceToolShell` extraction adds a scoped right-panel visibility preference (chat is collapsed by default).
6. D-09: skill tags are carried as a canonical content prefix by one web codec (compose on send, parse in `UserMessage`). There is no protocol change. This was a deliberate choice over a server WS field; see the rejection log.
7. D-10: the built-in Daily Assistant uses a `seedIfMissing` sync policy, so user edits persist. The existing built-ins keep `overwrite`.
8. D-11: a definition-level `skillScope` (`CONFIGURED` | `ALL_INSTALLED`) is added to GraphQL and agent-config.json.
   - SkillService owns effective resolution, and runtime factories stop reading `skillNames.length`.
   - The agent editor gets a "Use all installed skills" option. This is a design-derived realization of REQ-007 "configurable".
   - Persisted-data decision: Directly Usable — No Migration.

## Open Risks

- RSK-001: cross-runtime catalog loading.
- RSK-003: `ALL_INSTALLED` materialization size and time (Codex, Claude, AGY).
- RSK-004: regressions from the composer-target extraction.
- RSK-005: the `/workspace` → `/chat` redirect racing the selection-intent machinery.

## Expected Output

An independent architecture review of `design-spec.md` against the approved requirements and the R2 supplement. On Pass, it hands off to implementation per the reviewer's rules. Requirement or design findings return to Solution Designer.

## Applied Handoff Route

- Matching rule: "Architecture Design Complete with task_size=Large or architectural_risk=High, and the aligned cumulative solution package is ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`.
- Not matched:
  - The implementation-direct rule requires Small/Medium and Low.
  - The Product rule does not apply, because no Product request is pending.
  - The marketing and delivery rules are not applicable.


## SR-006 Revision For ARCH-REV-001 (re-review request)

| Finding | Resolution in `design-spec.md` |
| --- | --- |
| AR-001 | **D-13:** `pages/chat.vue` + `useChatRouteRunSync` replace `/chat?id=R` with `P` on `promoteTemporaryId`, for every send path. **D-08:** footer modes. An unlocked draft (unregistered or registered `temp-*`) edits `context.config`. A persisted run uses `existingRunConfigStore`, never with a `temp-*` id. Workspace/approval controls appear only on New chat. **D-04:** `launchAgentChat` awaits the send, then routes to `/chat?id=<selected id>`: the permanent id, or the failed `temp-*` id, where the existing error shows and a resend works |
| AR-003 | **D-11:** `SkillService.listInstalledSkillRecords()` returns `{ skill, origin, trustedRoot, configuredRoot }` in `listSkills` precedence. ALL_INSTALLED regular and detailed bindings are built from enabled records, with no name re-resolution. The AGY roots per bundled layout are specified. Web `/` uses the same `skillStore` catalog. The example is updated |
| AR-004 | **D-02:** `voiceInputStore.toggleRecording/startRecording({ source: 'composer', targetContext } \| { source: 'settings-test' })`. The active-context read is removed. `voiceInputStore.ts` and `VoiceInputExtensionCard.vue` are added to the mapping and the removal plan |
| AR-002 | `createChatDraftComposerTarget` moved to `composables/chat/chatDraftComposerTarget.ts`. A dependency rule forbids agentInput → chat |
| AR-005 | **D-09:** `initialSummary` = the user's text; a tags-only message falls back to the instruction |
| Non-blocking | `setTarget` rebuilds the draft context (both definition ids). The `/workspace` redirect is change-driven only and never on an org route. The standalone `showSelectedRunConfig` mode and the `AgentWorkspaceView` header actions are added to the removal plan. Requirements editorial cleanup (Recent wording, traceability). Investigation inventory and header refreshed (AF-23–AF-27). RSK-006 added |

Intended behavior is unchanged. The requirements edits are editorial only, with no approval impact.


## SR-007 Revision For ARCH-REV-002 (re-review request)

| Finding | Resolution in `design-spec.md` |
| --- | --- |
| AR-001 remainder (MP-006) | **D-08:** the footer mode is keyed on run identity, never on `config.isLocked`. A `temp-*` id edits `context.config`, with the runtime selectable. Any permanent id goes through `existingRunConfigStore`: locked while live, runtime fixed when Offline, and the saved config is applied by the resume path. Ownership Boundaries, the Boundary Map, the `chatRunModelControls` row and the Guidance are aligned. The new example "Footer mode for a reopened Offline run" is added. Evidence is AF-28 |
| AR-007 | **D-04 order:** mark the draft `starting` → register → select → await send → route to `/chat?id=<selected id>` → then `chatDraftStore.startNewChat()`. New chat shows the UXJ-001 starting state throughout |

Intended behavior is unchanged, and there is no approval impact.
