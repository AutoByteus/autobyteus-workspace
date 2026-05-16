# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/tickets/in-progress/agent-status-event-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/tickets/in-progress/agent-status-event-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/tickets/in-progress/agent-status-event-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/tickets/in-progress/agent-status-event-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/tickets/in-progress/agent-status-event-analysis/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/tickets/in-progress/agent-status-event-analysis/review-report.md`
- Current Validation Round: `4` for the fresh four-state implementation package
- Trigger: code review round 9 pass for CR-003, requesting API/E2E resume for `VAL-FS-008`, `AC-013`, and `AC-014`.
- Latest Authoritative Round: `4`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Fresh four-state implementation review pass | N/A | `VAL-FS-008` | Fail | No | Browser-backed local-stack validation proved normal live status events for AutoByteus/Codex/Claude, but successful single-agent termination did not publish live `offline/can_interrupt=false` before WebSocket close. |
| 2 | Implementation Local Fix `VAL-FS-008` code-review pass | `VAL-FS-008` | None | Pass | No | Rebuilt/restarted local stack and verified already-connected browser WebSockets receive terminal offline `AGENT_STATUS` for AutoByteus, Codex, and Claude. |
| 3 | AR-004 code-review pass | `VAL-FS-008` | None | Pass | No | Re-read README startup guidance, rebuilt/restarted backend/frontend, re-ran `VAL-FS-008` across all 3 runtimes, and added browser/Electron-like `AC-013` startup/reconcile evidence proving mixed active-team member statuses do not fan out to all running. |
| 4 | CR-003 code-review pass | `VAL-FS-008`, `AC-013`, `AC-014` | None | Pass | Yes | Re-ran browser/local-stack `VAL-FS-008`, re-ran browser/Electron-like `AC-013`, and added browser/Electron-like `AC-014` evidence proving selected single-agent and focused-member `canInterrupt` is preserved through refresh/reconcile and revoked by later live status. |

## Validation Basis

Validation was derived from the reviewed requirements/design/handoff package and code-review round 9 focus:

- Canonical public status contract is `offline | idle | running | error`.
- Single/member `AGENT_STATUS` shape is `{ status, can_interrupt, agent_id?, agent_name? }`.
- Aggregate `TEAM_STATUS` shape is `{ status }`, without `can_interrupt`.
- Runtime status projection and terminal behavior must work for `autobyteus`, `codex_app_server`, and `claude_agent_sdk`.
- `VAL-FS-008`: active single-agent termination across AutoByteus, Codex, and Claude with an already-connected browser WebSocket receives terminal `AGENT_STATUS { status: "offline", can_interrupt: false }` before close.
- `AC-013`: browser/Electron-like startup and refresh with active team aggregate `running`, one member `running`, remaining members `offline`; no reconcile/recovery cycle fans aggregate status out to all members.
- `AC-014`: after live/snapshot `AGENT_STATUS { status: "running", can_interrupt: true }`, run-history refresh/reconcile and active recovery preserve selected single-agent/focused-member interrupt affordance until a later live status or explicit cleanup revokes it.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

Legacy-field evidence:

- Browser WebSocket assertions rejected `new_status` and `old_status` on all captured target `AGENT_STATUS` messages.
- `AC-013` and `AC-014` team `TEAM_STATUS` snapshots were aggregate-only `{ status: "running" }`; no team `can_interrupt` was present.
- Code-review round 9 already audited target AGENT_STATUS/TEAM_STATUS compatibility paths as clean.

## Validation Surfaces / Modes

- README-driven backend build/start and frontend dev start for local-stack validation.
- Real Nuxt frontend dev server on `http://127.0.0.1:3002/`.
- Real local Google Chrome browser driven by Playwright-core. The Browser plugin's Node REPL control surface was unavailable in this session, so host Chrome was used; GraphQL and WebSocket traffic still originated from the browser context loaded at the frontend URL.
- Browser-context GraphQL calls and already-connected WebSocket connections to the running backend for `VAL-FS-008`.
- Browser/Electron-like startup harnesses for `AC-013` and `AC-014`: the real Nuxt app booted in Chrome with preload-style `window.electronAPI` window/node binding and a temporary mock node backend serving exact active history + WebSocket startup shapes.
- Focused server and frontend guardrail suites from the review package.

## Platform / Runtime Targets

- Platform: macOS local worktree at `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis`.
- Backend for `VAL-FS-008`: rebuilt `autobyteus-server-ts/dist/app.js`, listening on `127.0.0.1:8000` from validation data at `.local/browser-e2e-four-state-rerun-server-data`.
- Frontend: Nuxt dev server reachable on `http://127.0.0.1:3002/` during browser validation.
- Browser: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, headless via Playwright-core.
- Runtime availability reported by backend for `VAL-FS-008`: `autobyteus`, `codex_app_server`, and `claude_agent_sdk` all `enabled=true`.
- Models selected by backend catalog for the latest browser run creation:
  - AutoByteus: `gpt-5.4-mini`
  - Codex: `gpt-5.2`
  - Claude Agent SDK: `haiku`

## Lifecycle / Upgrade / Restart / Migration Checks

- Native installer/updater/migration checks are not in scope.
- Runtime lifecycle checks performed:
  - normal browser-sent message lifecycle for all three runtimes was validated in round 1 and retained as context;
  - latest `VAL-FS-008` verified successful single-agent termination for all three runtimes with already-connected browser WebSockets;
  - latest first-load history after termination reported `offline`, inactive rows for all three runs;
  - latest `AC-013` browser/Electron-like startup and refresh/reconcile cycle preserved mixed active-team member statuses;
  - latest `AC-014` browser/Electron-like startup and refresh/reconcile cycle preserved selected single-agent and focused-member stop affordances after live `can_interrupt=true`, then revoked them after later live `idle/can_interrupt=false`.

## Coverage Matrix

| Scenario ID | Requirement / AC Focus | Surface | Evidence | Result |
| --- | --- | --- | --- | --- |
| `VAL-FS-001` | README stack + seeded/available fixtures | Built backend, started backend/frontend, loaded frontend in Chrome | Latest commands and screenshots | Pass |
| `VAL-FS-002` | Runtime availability and real run creation for all 3 runtimes | Browser-context GraphQL | `browser-termination-rerun-evidence.json` | Pass |
| `VAL-FS-003` | Single-agent WebSocket connect/reconnect snapshots for all 3 runtimes | Browser-context WebSocket `/ws/agent/:runId` | Round 1 `browser-status-evidence.json` plus latest termination WebSocket snapshots | Pass |
| `VAL-FS-004` | Live normal status events for all 3 runtimes | Browser-context WebSocket plus browser-sent `SEND_MESSAGE` | Round 1 `browser-status-evidence.json` | Pass |
| `VAL-FS-005` | Team connect/reconnect member snapshots before aggregate status | Browser-context WebSocket `/ws/agent-team/:teamRunId` | Round 1 `browser-status-evidence.json`; latest `AC-013`/`AC-014` browser/Electron-like team snapshots | Pass |
| `VAL-FS-006` | First-load history canonical status projection | Browser-context GraphQL `listWorkspaceRunHistory` | Round 1/Round 2/Round 3/Round 4 evidence | Pass |
| `VAL-FS-007` | Termination history projection | Browser-context GraphQL `terminateAgentRun`, then `listWorkspaceRunHistory` | `browser-termination-rerun-evidence.json` | Pass |
| `VAL-FS-008` | Live termination publishes terminal `offline/can_interrupt=false` | Browser-context already-connected WebSocket kept open while browser called `terminateAgentRun` | `browser-termination-rerun-evidence.json` | Pass |
| `AC-013` | Active team aggregate with one running member and other members offline after app restart/refresh | Real Nuxt app in Chrome with Electron-like node binding; temporary mock node backend for exact `ListWorkspaceRunHistory` + team WebSocket startup state | `ac013-browser-electron-startup-rerun-evidence.json` and screenshots | Pass |
| `AC-014` | Preserve selected single-agent/focused-member interrupt affordance through refresh/reconcile after live `can_interrupt=true`, then revoke on later live non-interruptible status | Real Nuxt app in Chrome with Electron-like node binding; temporary mock node backend for active single-agent + focused team member state and WebSocket status updates | `ac014-browser-electron-caninterrupt-rerun-evidence.json` and screenshots | Pass |

## Test Scope

In scope:

- Real backend/frontend startup and browser load of the Nuxt app.
- Browser-originated GraphQL and WebSocket traffic against the local backend for all three runtime termination paths.
- Runtime availability, run creation, already-connected WebSocket termination, and history projection after termination for AutoByteus, Codex, and Claude.
- Browser/Electron-like startup/recovery/reconcile of active team history with mixed member statuses for `AC-013`.
- Browser/Electron-like selected single-agent and focused-member stop affordance preservation/revocation for `AC-014`.
- Focused source/test guardrails identified by implementation review.

Out of scope:

- Full `nuxi typecheck`, already documented by code review as blocked by unrelated broad typings.
- Native installer/updater/deployment validation.

## Validation Setup / Environment

Latest setup used:

1. Read repository/server/web README startup guidance.
2. Build backend:
   - `pnpm -C autobyteus-server-ts build`
3. Start backend in foreground PTY so reviewed code remained loaded during browser validation:
   - `node autobyteus-server-ts/dist/app.js --data-dir /Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/browser-e2e-four-state-rerun-server-data --host 127.0.0.1 --port 8000`
   - Environment included `APP_ENV=production`, `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000`, `CODEX_APP_SERVER_SANDBOX=danger-full-access`, `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions`, and local Prisma engine paths.
4. Start frontend:
   - `BACKEND_NODE_BASE_URL=http://127.0.0.1:8000 pnpm -C autobyteus-web dev --host 127.0.0.1 --port 3002`
5. Verify backend/frontend reachability:
   - `curl` to `http://127.0.0.1:3002/workspace` returned `200`.
   - `curl` to `http://127.0.0.1:8000/graphql` returned `200` for `query { __typename }`.
6. Browser re-validation:
   - `node .local/browser-four-state-termination-rerun-e2e.mjs`
   - `node .local/ac013-browser-electron-startup-rerun-e2e.mjs`
   - `node .local/ac014-browser-electron-caninterrupt-rerun-e2e.mjs`

## Tests Implemented Or Updated

- No repository-resident durable validation code was added or updated by API/E2E in this re-validation round.
- Temporary browser validation scripts were written under `.local/` only and are not intended as durable repository test code.
- Implementation-owned durable regressions were reviewed before this re-validation in source tests including:
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-handler.test.ts`
  - `autobyteus-web/services/runOpen/__tests__/agentRunOpenCoordinator.integration.spec.ts`
  - `autobyteus-web/stores/__tests__/agentContextsStore.spec.ts`
  - `autobyteus-web/services/runRecovery/__tests__/activeRunRecoveryCoordinator.spec.ts`
  - `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round by API/E2E: `No`
- Paths added or updated by API/E2E: `N/A`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `N/A`

## Other Validation Artifacts

- Validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/tickets/in-progress/agent-status-event-analysis/api-e2e-validation-report.md`
- Latest browser termination evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/four-state-browser-evidence-rerun/browser-termination-rerun-evidence.json`
- Latest browser loaded screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/four-state-browser-evidence-rerun/frontend-loaded-rerun.png`
- Latest `AC-013` evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac013-browser-evidence-rerun/ac013-browser-electron-startup-rerun-evidence.json`
- Latest `AC-013` screenshots:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac013-browser-evidence-rerun/ac013-loaded-before-expand.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac013-browser-evidence-rerun/ac013-members-initial.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac013-browser-evidence-rerun/ac013-members-after-refresh.png`
- Latest `AC-014` evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac014-browser-evidence-rerun/ac014-browser-electron-caninterrupt-rerun-evidence.json`
- Latest `AC-014` screenshots:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac014-browser-evidence-rerun/ac014-loaded.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac014-browser-evidence-rerun/ac014-single-stop-initial.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac014-browser-evidence-rerun/ac014-single-stop-after-refresh.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac014-browser-evidence-rerun/ac014-single-after-live-revoke.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac014-browser-evidence-rerun/ac014-team-focused-stop-initial.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac014-browser-evidence-rerun/ac014-team-focused-stop-after-refresh.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac014-browser-evidence-rerun/ac014-team-after-live-revoke.png`
- Round 1 normal-run evidence retained for context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/four-state-browser-evidence/browser-status-evidence.json`
- Round 1 termination failure evidence retained for comparison: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/four-state-browser-evidence/browser-termination-evidence.json`

## Temporary Validation Methods / Scaffolding

Temporary scripts under `.local/`:

- `.local/browser-four-state-termination-rerun-e2e.mjs`
- `.local/ac013-browser-electron-startup-rerun-e2e.mjs`
- `.local/ac014-browser-electron-caninterrupt-rerun-e2e.mjs`
- Earlier Round 1 scripts retained under `.local/` for comparison.

They are retained with local evidence for diagnosis, not committed durable validation.

## Dependencies Mocked Or Emulated

- `VAL-FS-008`: no status/runtime behavior was mocked. The real backend runtime managers created AutoByteus, Codex, and Claude Agent SDK runs; the browser called real GraphQL mutations and observed real server WebSocket messages.
- `AC-013`: the node backend boundary was temporarily mocked to force the exact active-team startup state required by the acceptance criterion. The validated frontend path was real Nuxt code in Chrome, with Electron-like `window.electronAPI` node binding, real GraphQL HTTP requests from the app, real WebSocket connections from the app, and a real refresh/reconcile interval.
- `AC-014`: the node backend boundary was temporarily mocked to force the exact active single-agent plus focused-member live interrupt state required by the acceptance criterion. The validated frontend path was real Nuxt code in Chrome, with real app GraphQL and WebSocket clients, real sidebar selection, real composer stop/send button rendering, and a real refresh/reconcile interval.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `VAL-FS-008`: successful termination did not emit live `AGENT_STATUS { status: "offline", can_interrupt: false }` before WebSocket close | Local Fix to implementation_engineer | Resolved | Latest browser evidence shows all three runtimes emitted offline status to already-connected WebSockets after successful `terminateAgentRun`; history rows are offline/inactive | No repository-resident API/E2E validation changes were added in this recheck. |
| AR-004 | Active team aggregate previously could fan out running state to all member rows during startup/refresh | Local Fix to implementation_engineer | Resolved | Latest `AC-013` browser/Electron-like evidence shows one running member and five offline members before and after refresh | No repository-resident API/E2E validation changes were added in this recheck. |
| CR-003 | Existing subscribed single-agent context with `running/canInterrupt=true` reopened/hydrated as inactive/offline could retain `canInterrupt=true` | Local Fix to implementation_engineer | Resolved for API/E2E scope | Latest `AC-014` browser/Electron-like evidence shows live `running/can_interrupt=true` is preserved through active refresh/reconcile and later live `idle/can_interrupt=false` revokes stop affordance for selected single-agent and focused member | No repository-resident API/E2E validation changes were added in this recheck. |

## Scenarios Checked

### VAL-FS-008 — Live termination `offline` status publication

- Method: Browser loaded the frontend, then browser-context GraphQL created one run for each runtime. For each run, browser opened `/ws/agent/:runId`, waited for the initial status snapshot, called `terminateAgentRun` while the WebSocket stayed connected, and waited for `AGENT_STATUS { status: "offline", can_interrupt: false, agent_id: runId }`.
- Expected: successful termination publishes terminal offline status over the already-connected browser WebSocket before stream teardown; payload has canonical fields only.
- Result: Pass.

Latest evidence from `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/four-state-browser-evidence-rerun/browser-termination-rerun-evidence.json`:

- `result.ok=true`
- Runtime configs:
  - `autobyteus` / `gpt-5.4-mini`
  - `codex_app_server` / `gpt-5.2`
  - `claude_agent_sdk` / `haiku`
- All three scenarios observed terminal `AGENT_STATUS { status: "offline", can_interrupt: false, agent_id: runId }` after successful `terminateAgentRun`.
- All history rows became `offline`, `isActive=false`.
- `result.errors=[]`.

### AC-013 — Active team startup keeps member-scoped statuses

- Method: Browser loaded the real Nuxt app with an Electron-like preload binding to a temporary validation node. The temporary node returned `ListWorkspaceRunHistory` for an active team aggregate `status: "running"` where only `solution_designer` was `running` and `architecture_reviewer`, `implementation_engineer`, `code_reviewer`, `api_e2e_engineer`, and `delivery_engineer` were `offline`. The app connected to `/ws/agent-team/ac013-team-run`; the temporary node sent aggregate-only `TEAM_STATUS { status: "running" }` and member-scoped `AGENT_STATUS` snapshots. The script expanded the team in the real sidebar, captured member row status-dot classes, waited through a refresh/reconcile cycle, and captured them again.
- Expected: backend history, team WebSocket snapshots, initial browser rows, and post-refresh browser rows all preserve exactly one running member and all other members offline; no aggregate team running status is fanned out to all members.
- Result: Pass.

Latest evidence from `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac013-browser-evidence-rerun/ac013-browser-electron-startup-rerun-evidence.json`:

- `ok=true`
- `backendHistoryValid=true`
- `teamStatusAggregateOnly=true`
- `liveAgentSnapshotsValid=true`
- `initialBrowserRowsMatchExpected=true`
- `afterRefreshBrowserRowsMatchExpected=true`
- `refreshObserved=true`
- `noOfflineMembersFannedOutToRunningAfterRefresh=true`
- GraphQL operation counts included `ListWorkspaceRunHistory: 3`, `GetTeamRunResumeConfig: 1`, `GetTeamMemberRunProjection: 6`.
- WebSocket paths included `/ws/file-explorer/ws-ac013` and `/ws/agent-team/ac013-team-run`.
- `errors=[]`, `pageErrors=[]`.

### AC-014 — Interrupt affordance preservation and live revocation

- Method: Browser loaded the real Nuxt app with an Electron-like preload binding to a temporary validation node. The temporary node returned active history for one single-agent run and one active team whose focused member was `solution_designer`. The app connected to `/ws/agent/ac014-single-agent-run` and `/ws/agent-team/ac014-team-run`; the temporary node sent live `AGENT_STATUS { status: "running", can_interrupt: true }` for the selected single-agent and focused member. The script selected the real sidebar rows, captured the composer primary button as `Stop generation`, waited through refresh/reconcile cycles, verified the stop affordance persisted, then sent later live `AGENT_STATUS { status: "idle", can_interrupt: false }` and verified the stop affordance reverted to `Send message`.
- Expected: selected single-agent and focused-member `canInterrupt` remains true through history refresh/reconcile after live/snapshot grant; later live non-interruptible status revokes the stop affordance.
- Result: Pass.

Latest evidence from `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-status-event-analysis/.local/ac014-browser-evidence-rerun/ac014-browser-electron-caninterrupt-rerun-evidence.json`:

- `ok=true`
- `singleLiveRunningCanInterruptSeen=true`
- `singleStopVisibleInitially=true`
- `singleRefreshObserved=true`
- `singleStopPreservedAfterRefresh=true`
- `singleLiveIdleRevokedStop=true`
- `teamFocusedLiveRunningCanInterruptSeen=true`
- `teamInitialRowsMatchBackendMemberStatus=true`
- `teamStopVisibleInitially=true`
- `teamRefreshObserved=true`
- `teamRowsMatchBackendMemberStatusAfterRefresh=true`
- `teamStopPreservedAfterRefresh=true`
- `teamFocusedLiveIdleRevokedStop=true`
- `noLegacyAgentStatusShape=true`
- `teamStatusAggregateOnly=true`
- `noConsolePageErrors=true`
- GraphQL operation counts included `ListWorkspaceRunHistory: 4`, `GetRunProjection: 2`, `GetAgentRunResumeConfig: 2`, `GetRunFileChanges: 2`, `GetTeamRunResumeConfig: 1`, `GetTeamMemberRunProjection: 6`.
- WebSocket paths included `/ws/file-explorer/ws-ac014`, `/ws/agent/ac014-single-agent-run`, and `/ws/agent-team/ac014-team-run`.
- `errors=[]`, `pageErrors=[]`.

## Passed

Commands run and passing in latest authoritative round:

1. Browser `VAL-FS-008` re-validation:
   - `node .local/browser-four-state-termination-rerun-e2e.mjs`
   - Result: Pass (`ok: true`, no errors).
2. Browser/Electron-like `AC-013` validation:
   - `node .local/ac013-browser-electron-startup-rerun-e2e.mjs`
   - Result: Pass (`ok: true`, no errors, no page errors).
3. Browser/Electron-like `AC-014` validation:
   - `node .local/ac014-browser-electron-caninterrupt-rerun-e2e.mjs`
   - Result: Pass (`ok: true`, no errors, no page errors).
4. `git diff --check`
   - Result: Pass.
5. Server focused terminal-offline guardrail:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-stream-handler.test.ts`
   - Result: 1 file / 15 tests passed.
6. Frontend CR-003/AC-013/AC-014 focused suite:
   - Command: `pnpm -C autobyteus-web exec vitest run services/runOpen/__tests__/agentRunOpenCoordinator.integration.spec.ts stores/__tests__/agentContextsStore.spec.ts services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts utils/__tests__/runTreeLiveStatusMerge.spec.ts stores/__tests__/runHistoryStore.spec.ts services/runRecovery/__tests__/activeRunRecoveryCoordinator.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
   - Result: 11 files / 124 tests passed.

Previously passing and still used as basis from the latest stack restart:

- `pnpm -C autobyteus-server-ts build` — Pass.
- `curl` probes for `http://127.0.0.1:3002/workspace` and `http://127.0.0.1:8000/graphql` — Pass.

## Failed

- None in latest authoritative round.

## Not Tested / Out Of Scope

- Full `nuxi typecheck` because code review documented unrelated broad typings as a residual risk.
- Native deployment/release workflows; delivery engineer owns final branch refresh/docs/finalization.

## Blocked

- None.

## Cleanup Performed

- Browser sessions were closed by the validation scripts.
- Temporary mock `AC-013` and `AC-014` backends were closed by the validation scripts.
- README-started backend and frontend PTY sessions were stopped after validation.
- Port checks after cleanup showed no listener on `127.0.0.1:3002` or `127.0.0.1:8000`.

## Classification

- Latest classification: `N/A` — no unresolved validation failure remains.

## Recommended Recipient

- `delivery_engineer`

## Evidence / Notes

Latest API/E2E directly rechecked `VAL-FS-008` with real browser-originated WebSockets across AutoByteus, Codex, and Claude Agent SDK. It also rechecked `AC-013` browser/Electron-like startup/reconcile and added `AC-014` browser/Electron-like evidence for interrupt affordance preservation and later live revocation. No repository-resident durable validation was added or updated by API/E2E during this re-validation, so the package does not need another validation-code review pass before delivery.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: `VAL-FS-008`, `AC-013`, and `AC-014` all pass. Focused server and frontend guardrails pass. No durable validation code was changed by API/E2E.
