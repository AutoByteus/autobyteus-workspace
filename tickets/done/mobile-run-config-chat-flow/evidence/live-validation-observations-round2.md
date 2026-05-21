# Live Mobile Configure-Then-Chat Validation Observations — Round 2

- Trigger: Code review Round 3 pass for the implementation-owned Local Fix for `MOB-TEMP-PROMOTE-001`.
- Browser target: `http://127.0.0.1:3000/mobile`, served by local Nuxt dev server against Electron-started backend `http://127.0.0.1:29695`.
- Backend status before validation: `/rest/remote-access/status` returned `phoneAccessEnabled: true`, `pairingAvailable: true`, `serverName: AutoByteus Desktop`.
- Fresh validation pairing:
  - Cleared browser local/session storage.
  - Created a pairing session with `POST /rest/remote-access/pairing-sessions` for `http://127.0.0.1:29695`.
  - Paired browser session through the mobile pairing link and reached Mobile Home as `AutoByteus Desktop / Connected`.
  - Temporary paired device: `device_8a520406dfb037d5ad4a5e07c7938fc1`.
- Screenshot artifacts captured during the run:
  - Fresh paired Home: `/Users/normy/.autobyteus/browser-artifacts/64c3fd-1779363606089.png`
  - Agent setup ready with `Codex App Server` / `GPT-5.5`: `/Users/normy/.autobyteus/browser-artifacts/64c3fd-1779363819160.png`
  - Team setup ready with `Codex App Server` / `GPT-5.5`: `/Users/normy/.autobyteus/browser-artifacts/64c3fd-1779364044417.png`
  - Team Chat after successful promoted first send: `/Users/normy/.autobyteus/browser-artifacts/64c3fd-1779364169288.png`

## Agent rerun for `MOB-TEMP-PROMOTE-001`

- Selected agent: `Codex`.
- Selected workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.
- Selected runtime/model: `Codex App Server` (`codex_app_server`) / `gpt-5.5`.
- Injected mobile draft attachment: `README.md` (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md`).
- Setup UI remained configure/create-only:
  - Copy: `Ready to create the run. Chat opens next.`
  - No setup prompt was present.
  - No backend run creation or WebSocket send was observed during `Create run`.
- After `Create run`, Chat opened for temporary agent run `temp-1779363831448-1` and displayed `README.md` in the Chat composer context tray.
- First Chat prompt:
  - `Round 2 mobile configure-then-chat agent promotion validation with README.md attachment. Reply exactly: config chat agent promotion OK.`
- Backend promotion/send evidence:
  - WebSocket URL: `ws://127.0.0.1:29695/ws/agent/20414c86-0120-47e5-adf0-c70ba2d886a4?...`
  - Payload content matched the first Chat prompt.
  - Payload `context_file_paths` included `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md`.
- Post-promotion mobile state:
  - `agentSelection.selectedRunId`: `20414c86-0120-47e5-adf0-c70ba2d886a4`.
  - `mobileWorkStore.currentContext.runId`: `20414c86-0120-47e5-adf0-c70ba2d886a4`.
  - `mobileWorkStore.activeTab`: `chat`.
  - Chat stayed visible; textarea/composer remained mounted.
  - The previous failure state (`Opening conversation` placeholder and missing composer) did not recur.
- Backend GraphQL evidence:
  - `getRunProjection(20414c86-0120-47e5-adf0-c70ba2d886a4)` returned the user prompt and assistant reply `config chat agent promotion OK`.
  - `getAgentRunResumeConfig(20414c86-0120-47e5-adf0-c70ba2d886a4)` returned `agentDefinitionId: codex`, `workspaceRootPath: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, `runtimeKind: codex_app_server`, `llmModelIdentifier: gpt-5.5`.

## Team rerun for `MOB-TEMP-PROMOTE-001`

- Selected team: `Software Engineering Team`.
- Selected workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.
- Selected runtime/model: `Codex App Server` (`codex_app_server`) / `gpt-5.5`.
- Injected mobile draft attachment: `AGENTS.md` (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/AGENTS.md`).
- Setup UI remained configure/create-only:
  - Copy: `Ready to create the run. Chat opens next.`
  - No setup first-message prompt or setup first-message target was present.
  - No backend team run creation or WebSocket send was observed during `Create run`.
- After `Create run`, Chat opened for temporary team run `temp-team-1779364047937-666` with initial focus `solution_designer`.
- Pending attachment state after creation:
  - `mobileWorkStore.pendingTeamRunAttachmentsByTeamRunId.temp-team-1779364047937-666` contained `AGENTS.md`.
  - `mobileWorkStore.draftContextAttachments` was empty.
- Changed Chat message target from `solution_designer` to `api_e2e_engineer`.
- Pending attachment state after focus change:
  - `mobileWorkStore.currentContext.focusedMemberRouteKey`: `api_e2e_engineer`.
  - `mobileWorkStore.pendingTeamRunAttachmentsByTeamRunId.temp-team-1779364047937-666` still contained `AGENTS.md`.
- First Chat prompt:
  - `Round 2 mobile configure-then-chat team promotion validation with pending AGENTS.md attachment to api_e2e_engineer. Reply exactly: config chat team promotion OK.`
- Backend promotion/send evidence:
  - WebSocket URL: `ws://127.0.0.1:29695/ws/agent-team/team_software-engineering-team_d1e5d5be?...`
  - Payload content matched the first Chat prompt.
  - Payload `target_member_route_key`: `api_e2e_engineer`.
  - Payload `context_file_paths` included `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/AGENTS.md`.
- Post-promotion mobile state:
  - `agentSelection.selectedRunId`: `team_software-engineering-team_d1e5d5be`.
  - `mobileWorkStore.currentContext.teamRunId`: `team_software-engineering-team_d1e5d5be`.
  - `mobileWorkStore.currentContext.focusedMemberRouteKey`: `api_e2e_engineer`.
  - `mobileWorkStore.activeTab`: `chat`.
  - Chat stayed visible; textarea/composer remained mounted.
  - `mobileWorkStore.pendingTeamRunAttachmentsByTeamRunId` was `{}` after successful pending flush.
  - Focus memory contained entries for both the temp and permanent ids with `api_e2e_engineer`; this did not affect Chat stability.
  - The previous failure state (`Opening conversation` placeholder and missing composer) did not recur.
- Backend GraphQL evidence:
  - `getTeamRunResumeConfig(team_software-engineering-team_d1e5d5be)` returned member metadata with `runtimeKind: codex_app_server`, `llmModelIdentifier: gpt-5.5`, and workspace root `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` for members.
  - `getTeamMemberRunProjection(teamRunId: team_software-engineering-team_d1e5d5be, memberRouteKey: api_e2e_engineer)` returned the user prompt and assistant reply `config chat team promotion OK`.

## Pending bucket migration note

- In the normal live first-send flow, pending team attachments are intentionally flushed to the focused member before the backend send and were therefore cleared by the time the temp id was promoted.
- The durable focused regression suite covers the residual bucket-migration edge case where pending attachments still exist under the temporary team id during promotion. The specific regression is `reconciles mobile current team-run context and pending state when a temporary team is promoted after first send` in `MobileContextSelectionRegression.spec.ts`.

## Shared composer seam / regression checks

- Focused suite: `pnpm -C autobyteus-web exec vitest run components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts` passed: 4 files / 45 tests.
- Broader focused suite: `pnpm -C autobyteus-web exec vitest run components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts stores/__tests__/activeContextStore.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts` passed: 9 files / 90 tests.
- `git diff --check` passed.
- Shared seam dependency scan found only generic `beforeSend` prop threading in `AgentUserInputForm.vue`, `AgentUserInputTextArea.vue`, `AgentEventMonitor.vue`, and `AgentTeamEventMonitor.vue`; no mobile imports or mobile store references were present.
- `pnpm -C autobyteus-web exec nuxi typecheck` remains repository-wide red from known unrelated existing diagnostics. Filtering `/tmp/mobile-run-config-chat-flow-typecheck-round2.log` for exact changed source paths, including `useMobilePromotedRunContextSync.ts` and `MobileRemoteAccessShell.vue`, emitted no diagnostics.

## Cleanup

- Terminated validation agent run `20414c86-0120-47e5-adf0-c70ba2d886a4`.
- Terminated validation team run `team_software-engineering-team_d1e5d5be`.
- Revoked paired device `device_8a520406dfb037d5ad4a5e07c7938fc1`.
- Closed the validation browser tab.
- Stopped the local Nuxt dev server and verified no listener remained on port `3000`.
