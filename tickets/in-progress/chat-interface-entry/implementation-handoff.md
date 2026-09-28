# Implementation Handoff — chat-interface-entry

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry`, branch `codex/chat-interface-entry`, base `origin/personal@fcd3e83a4`, finalization target `personal`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected and passed (ARCH-REV-003). Routing is decided by `get_handoff_rules` at handoff time; for Large/High, code review is expected.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/requirements-doc.md` (SR-003)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/solution-revision-record.md` (SR-003, SR-004, SR-007)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-spec.md` (SR-007, D-01..D-13)
- Supplemental task artifacts (normative R2 UI): `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/ui-ux-spec.md`, `.../visual-references/` (VIS-001..025, `manifest.json`), `.../ui-behavior-test-matrix.md`. Product design handoffs: `product-design-request-handoff.md`, `product-design-revision-request-handoff.md` in the ticket folder.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-revision-record.md`; handoff: `.../architecture-review-handoff.md`
- Triggering rework report: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-003, SR-004, SR-007
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

Commits (in design change-sequence order):

| Commit | Step | Content |
| --- | --- | --- |
| `770b14651` | 1 | Server `skillScope`, `InstalledSkillRecord`, `SkillService.listInstalledSkillRecords()`, ALL_INSTALLED record bindings, `hasEffectiveSkills` |
| `b7336203a` | 2 | Built-in Daily Assistant, `BuiltInAgentSyncPolicy` (`overwrite` / `seedIfMissing`) |
| `3655bd20a` | 3 | Web `skillScope` contract and agent editor/card/detail |
| `49b0ef457` | 4 | Behavior-preserving refactor: `ComposerTarget`, voice request by target, extracted input pieces, scoped `useRightPanel`, `WorkspaceToolShell` |
| `360de94a9` | 5 | Skill-request instruction codec, `requestedSkillNames`, message chips |
| `797d49d6a` | 6–9 | Chat draft/launch/routing, Chat components and pages, removals, localization, docs |

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md classification (carried from SR-007 / ARCH-REV-003).
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the change spans a server contract (`skillScope` in GraphQL and persisted `agent-config.json`), runtime skill exposure on every runtime, a new built-in agent sync policy, shell routing (`/`, `/chat`, `/workspace` redirect), and a shared message-box ownership refactor used by team and org views. No scope was added beyond the design.
- Selected route: `Code Review` (subject to `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. RSK-003 was not triggered: a Codex chat with ALL_INSTALLED materialized ~90 installed skills without error. The AGY capsule path is covered by a unit test only (see Known Risks).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Chat first in nav; `/` → `/chat` | `composables/useShellPrimaryNavigation.ts` (`chat` key), `components/AppLeftPanel.vue` (Chat item + `app-left-panel-new-chat` pencil), `pages/index.vue` | Implemented |
| BEH-005 | Chat → type → send → Daily Assistant run in chat view | `stores/chatDraftStore.ts` → `composables/chat/chatDraftComposerTarget.ts` → `services/chat/chatLaunchService.ts#launchAgentChat` (D-04 order) → `agentContextsStore.registerDraftRun` → `agentRunStore.sendUserInputAndSubscribe` → `/chat?id=<selected id>`; `pages/chat.vue` + `useChatRouteRunSync` (D-13) | Implemented; a failed first send lands on `/chat?id=<temp>` |
| BEH-003 | Compact model menu, schema thinking, last-used default | `components/chat/ChatModelMenu.vue`, `ChatModelList.vue`, `ChatThinkingControl.vue`, `composables/chat/useChatModelCatalog.ts` (catalogs load on the first search keystroke, "Searching all runtimes…", RSK-001), `utils/chat/chatLastModelPreference.ts` (D-12) | Implemented; last-used is written only after a successful promotion |
| BEH-004 | Temp workspace default; pick existing or open folder before send | `components/chat/ChatWorkspaceMenu.vue`, `chatLaunchService#resolveChatWorkspace` (`ensureRunHistoryWorkspaceByRootPath`) | Implemented; folder is resolved at send, before register |
| BEH-007 | `/` tags → instruction in content; chips on the message | `components/chat/ChatSkillMenu.vue`, `chatComposerMenus.ts`, `useChatComposerOptions.ts` (ALL_INSTALLED → enabled `skillStore` skills; else configured names), `utils/skills/skillRequestInstruction.ts`, `AgentContext.requestedSkillNames`, `agentRunStore` compose, `components/conversation/SkillRequestChips.vue`, `utils/runTreeSummary.ts` | Implemented |
| BEH-008 | `@` / tree `+` → New chat addressed to the agent with preset workspace | `ChatTargetMenu.vue`, `chatDraftStore.setTarget` (rebuilds both definition ids, AF-27), `WorkspaceAgentRunsTreePanel.vue#startPresetChat` → `startNewChat` + `/chat` | Implemented |
| BEH-009 | `@team` → uniform team launch, coordinator focus, Team view | `chatLaunchService#launchTeamChat`, `services/chat/chatTeamLaunchConfig.ts`, `agentTeamRunStore.sendMessageToFocusedMember(..., { attachmentDraftOwner })` | Implemented; team runtime catalog primed; orphan team draft removed on failure |
| BEH-010 | Offline run footer model: locked while live; saves through existing owner; runtime fixed | `components/chat/chatRunModelControls.ts` (mode by run id, never `isLocked`; `existingRunConfigStore` load/update/setSchemaState/save; `attemptedRunId` latch) | Implemented (D-08, AF-28) |
| BEH-011 | Single-agent run opens in chat view with tools collapsed; team/org unchanged | `ChatRunView.vue` in `WorkspaceToolShell` scope `chat`; `composables/useRightPanel.ts` per-scope visibility; `workspaceNavigationService` (`buildAgentRunChatRoute`, `resolveSelectionRoute`, agent links → chat); `pages/workspace.vue` selection-change redirect (RSK-005) | Implemented |
| BEH-012 | Same box and Context Files area plus Chat features; team/org unchanged | `composables/agentInput/useComposerTarget.ts`, `AgentUserInputTextArea.vue` / `ContextFilePathInputArea.vue` `target` prop, `VoiceInputButton.vue`, `VoiceInputStatusRow.vue`, `MessagePrimaryActionButton.vue`, `useComposerFilePathDrop.ts`, `ChatComposer.vue` | Implemented; step 4 landed with team/org/agent tests passing before chat code (RSK-004) |
| BEH-013 | Default Auto-approve for new chats | `ChatApprovalToggle.vue`, `chatDraftStore.setAutoExecuteTools`; applied to agent config and team root config | Implemented |
| BEH-014 | Chats are normal tree rows; missing id state | `pages/chat.vue` (mounted / open via `openWorkspaceExecutionLink` / missing / unregistered temp → `/chat`); tree `selectedRunId` on `/chat` comes from the route id | Implemented |
| REQ-007 (system) | Built-in Daily Assistant; ALL_INSTALLED expansion | Server `built-in-agent-registry.ts` / `built-in-agent-bootstrapper.ts` (`seedIfMissing`), `templates/daily-assistant/`; `skill-service.ts` (`listInstalledSkillRecords`, record bindings, `hasEffectiveSkills`), `configured-agent-skill-resolver.ts#resolveInstalledRecordDetailed`; runtime factories (AutoByteus `hasEffectiveSkills`, AGY `resolveSkillAccessMode` via `hasEffectiveSkills`, Codex/Claude/ACP through SkillService) | Implemented (D-09, D-10, D-11) |
| REQ-017 | Catalog launch forms unchanged; a standalone run started from `RunConfigPanel` opens in chat | `RunConfigPanel` unchanged; selection change on `/workspace` redirects to `/chat?id=<temp>`, then route sync follows promotion | Implemented |

## Key Files Or Areas

Server (`autobyteus-server-ts`):
- `src/agent-definition/domain/models.ts`, `providers/agent-definition-config.ts`, `providers/file-agent-definition-provider.ts`, `application-owned-agent-source.ts`, `services/agent-definition-service.ts`, GraphQL `types/agent-definition.ts`, `converters/agent-definition-converter.ts`, agent tools `get-agent-definition.ts` / `list-agent-definitions.ts`.
- `src/skills/domain/installed-skill-record.ts`, `src/skills/utils/skill-discovery.ts`, `src/skills/services/configured-agent-skill-resolver.ts`, `src/skills/services/skill-service.ts`.
- Runtime factories (AutoByteus, AGY), `src/built-in-agents/*` and `templates/daily-assistant/`, `scripts/smoke-built-in-agents-bootstrap.mjs`.
- Docs: `docs/modules/agent_definition.md` (Skill Scope; sync policies; Daily Assistant), `docs/modules/skills.md` (installed records / ALL_INSTALLED).

Web (`autobyteus-web`):
- New: `components/chat/*`, `composables/chat/*`, `services/chat/*`, `stores/chatDraftStore.ts`, `utils/chat/*`, `pages/chat.vue`, `components/layout/WorkspaceToolShell.vue`, `composables/agentInput/useComposerTarget.ts`, `useComposerFilePathDrop.ts`, `components/agentInput/VoiceInputButton.vue`, `VoiceInputStatusRow.vue`, `MessagePrimaryActionButton.vue`, `components/conversation/SkillRequestChips.vue`, `utils/skills/skillRequestInstruction.ts`, `localization/messages/{en,zh-CN}/chat.ts`, `docs/chat.md`.
- Changed: `AppLeftPanel.vue`, `WorkspaceAdaptiveLayout.vue`, `WorkspaceAgentRunsTreePanel.vue`, `useWorkspaceHistorySelectionActions.ts`, `useShellPrimaryNavigation.ts`, `useRightPanel.ts`, `layouts/default.vue` (left-drawer backdrop leaves the right strip reachable on `/chat?id=` too), `pages/index.vue`, `pages/workspace.vue`, `stores/agentContextsStore.ts` (`registerDraftRun`), `stores/agentTeamRunStore.ts`, `stores/agentRunStore.ts`, `stores/voiceInputStore.ts`, `stores/activeContextStore.ts`, `services/workspace/workspaceNavigationService.ts`, `AgentDefinitionForm.vue` and agent card/detail, docs (`workspace_layout.md`, `agent_execution_architecture.md`, `agent_management.md`, `skills.md`).
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
- `generated/graphql.ts` received only the `skillScope` delta by hand. A full codegen run against the current schema produced large unrelated drift.

## Known Risks

- AGY with ALL_INSTALLED: installed-skill names can collide with workspace-local skills in the AGY capsule. The existing AGY collision handling applies, but it was not exercised live with a large catalog. `AGY_SKILL_SOURCE_TOO_LARGE` was not observed. The AGY path is covered by a unit test (`skill-service-all-installed-scope.test.ts`), not a live run (RSK-003).
- Claude and AGY runtimes and the voice extension were not exercised live (the voice extension was absent from the dev data root). Codex and AutoByteus were exercised.
- Advanced model parameters beyond the schema-driven thinking control are not exposed for single-agent runs in the chat footer. This is per the UI spec, but it narrows what the removed standalone gear editor offered (design Cost note, D-08).
- RSK-006 (accepted): on Codex, a reloaded user message may include the appended context-file reference section in the "Sent to the agent as" tooltip.
- `origin/personal` advanced 6 commits after the base (AGY native image output, release bump). A trial `git merge-tree` against `origin/personal@e6c16d801` is clean and the changed files do not overlap.
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
- Changed source files within size guardrails: `Yes`. The largest changed source files are `voiceInputStore.ts` at 500 (was 499), `skill-service.ts` at 463 (+33; 114-line delta) and `runHistoryStore.ts` at 487 (shrank). The only >220 changed-line deltas are `AgentUserInputTextArea.vue` (252, a split that moved logic out to the new pieces) and `WorkspaceAdaptiveLayout.vue` (271, the extraction to `WorkspaceToolShell`); both shrank.
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
