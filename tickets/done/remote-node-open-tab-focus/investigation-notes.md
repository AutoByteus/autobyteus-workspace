# Investigation Notes: Remote-node `open_tab` focus behavior

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements basis approved; initial solution package ready for architecture review (SR-001)
- Investigation Goal: Trace the `open_tab` execution-to-desktop-panel-selection path, identify why remote/Docker execution triggers local Browser focus, and determine the authoritative capability boundary for preserving embedded-node focus only.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: One browser-success presentation handler owns the automatic Browser selection, while an existing window-node store owns the authoritative embedded/remote classification and both standalone/team streams already share the handler.
- Scope Summary: Correct only the Electron right-panel selection caused by `open_tab`; preserve node-local URL opening and embedded Electron browser behavior.
- Primary Questions To Resolve:
  - Resolved: `TOOL_EXECUTION_SUCCEEDED` is projected by `agentStreamMessageProjector.ts`, which invokes `browserToolExecutionSucceededHandler.ts`; that handler calls `setActiveTab('browser')`.
  - Resolved: `windowNodeContextStore.isEmbeddedWindow` supplies authoritative current-window node identity, and the same store provides the endpoints used by both standalone and team streams.
  - Resolved: an automatically projectable result requires an embedded-node window and an available Electron Browser shell; a remote/Docker tab id belongs to a different browser runtime.
  - Resolved: individual and team run views converge through the same projector and browser-success handler.

## Request Context

The user reports that after opening a window connected to a Docker node, an agent's `open_tab` call opens a tab inside the Docker browser but also switches the desktop's right-side tabs to **Browser**. That local Browser surface cannot show the Docker tab because it is not bridged to Electron. The user expects the switch only for the Electron embedded node, whose browser tabs are displayed through the Electron browser integration.

Reference screenshots supplied by the user:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_c1620c73bb684a8784dc74141466966d/solution_designer_1b5e6ff7403d4a869f302baf62866c68/context_files/ctx_1e5339bef4fe__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_c1620c73bb684a8784dc74141466966d/solution_designer_1b5e6ff7403d4a869f302baf62866c68/context_files/ctx_24d67d07fdbd__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_c1620c73bb684a8784dc74141466966d/solution_designer_1b5e6ff7403d4a869f302baf62866c68/context_files/ctx_9fe9cbafb64a__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/remote-node-open-tab-focus`
- Current Branch: `codex/remote-node-open-tab-focus`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus`
- Bootstrap Base Branch: `origin/personal` at `e664db7cfd725bc6fa1633b71c53954a3fe66e44`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-08-30 before worktree creation.
- Task Branch: `codex/remote-node-open-tab-focus`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: This is a fresh dedicated worktree created from the refreshed tracked remote branch. A similarly named older worktree, `docker-browser-link-open-fix`, addresses Docker/VNC URL-opening shell behavior and is not authoritative for this client focus issue.

## Supplemental Task Artifact Inventory

None. A separate UI/UX supplement would duplicate the binary interaction already captured by BEH-001/BEH-002 and AC-001/AC-002.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-30 | Setup | `git fetch origin personal`; `git worktree add -b codex/remote-node-open-tab-focus ... origin/personal` | Establish isolated current task workspace from refreshed base | Dedicated task branch created at `e664db7cf` | No |
| 2026-08-30 | Other | User-provided request and three screenshots listed in Request Context | Establish supported observed behavior and UI/node context | A configured node is labeled `REMOTE`; its browser is seen through **VNC Viewer** while the Electron window also has a distinct **Browser** panel | Yes—trace source path |
| 2026-08-30 | Code | `autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts` and colocated test | Find the direct focus owner and current policy | Every successful `open_tab` with `tab_id` calls local `focusSession` and then selects `browser`; no node/browser integration check exists | No |
| 2026-08-30 | Code | `autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts` | Determine how standalone/team events reach the handler | All `TOOL_EXECUTION_SUCCEEDED` events use the browser handler; target/node context is not forwarded because the handler accepts only the payload | No |
| 2026-08-30 | Code | `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`, `TeamStreamingService.ts`, `teamStreamDtoAdapters.ts` | Check cross-surface reuse | Both standalone and team messages reach `dispatchAgentStreamMessage`; team events are adapted to the same canonical payload | No |
| 2026-08-30 | Code | `autobyteus-web/stores/agentRunStore.ts:260-281`, `autobyteus-web/stores/agentTeamRunStore.ts:83-104` | Verify which backend produces events in a node-bound window | Both stream services use WebSocket endpoints from `useWindowNodeContextStore().getBoundEndpoints()` | No |
| 2026-08-30 | Code | `autobyteus-web/stores/windowNodeContextStore.ts`, `types/node.ts`, `plugins/20.windowNodeBootstrap.client.ts` | Identify authoritative embedded/remote context | `isEmbeddedWindow` is derived from canonical `EMBEDDED_NODE_ID`; Electron window context is loaded before run stores connect | No |
| 2026-08-30 | Code | `autobyteus-web/electron/application/electronApplication.ts:117-176`, `electron/shell/workspace-shell-window-registry.ts` | Verify node-window binding lifecycle | Electron creates one `WorkspaceShellWindow` with a fixed `nodeId` and exposes that exact binding through window context | No |
| 2026-08-30 | Code | `autobyteus-web/stores/browserShellStore.ts:90-177`, `electron/browser/browser-shell-controller.ts`, `electron/browser/register-browser-shell-ipc-handlers.ts` | Trace local browser focus and failure semantics | Renderer focus IPC targets the calling Electron shell and local `BrowserTabManager`; an unknown remote tab id throws in Electron, but the store catches it and resolves after setting `lastError` | No |
| 2026-08-30 | Code | `autobyteus-web/electron/browser/browser-tab-manager.ts:1-58, 550-558` | Check tab-id ownership and whether the id alone can establish origin | Each browser runtime generates and resolves its own six-character session ids against its own in-memory session map; the id carries no node/runtime identity | No |
| 2026-08-30 | Code | `autobyteus-web/composables/useRightSideTabs.ts`, `components/layout/RightSideTabs.vue` | Verify observable selection effect | `setActiveTab` mutates renderer-global selection; `RightSideTabs` mounts `BrowserPanel` when `browser` is selected | No |
| 2026-08-30 | Command | `rg -n ... 'open_tab|setActiveTab("browser")' autobyteus-web` plus focused `git blame`/`git log` | Check duplication and origin | Only the browser-success handler automatically selects Browser for `open_tab`; the handler was introduced as one unit in commit `27f82baaf` | No |
| 2026-08-30 | Doc | `autobyteus-web/docs/browser_sessions.md:157-175` and prior `tickets/done/electron-browser-tool-refactor` design/history | Compare intended embedded path with current multi-node reality | Documentation describes the valid embedded spine but does not qualify it by node/window binding; the same handler now also receives remote-node results | Yes—design should call out docs impact |
| 2026-08-30 | Other | User clarification/approval in the active conversation | Confirm whether suppressing backend `TOOL_EXECUTION_SUCCEEDED` was acceptable and lock intended behavior | User agreed the backend lifecycle event must remain and approved the frontend eligibility-gate solution | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User opens/focuses a run in a configured remote/Docker node window; the agent calls `open_tab` | Node Manager open -> Electron creates/focuses node-bound window -> bootstrap binds `windowNodeContextStore` to remote endpoint -> standalone/team store connects to bound WebSocket -> remote runtime opens its own browser tab and emits `TOOL_EXECUTION_SUCCEEDED(tab_id)` -> shared projector -> browser-success handler -> local `BrowserShellStore.focusSession(remote tab_id)` -> Electron local shell lookup fails -> store absorbs failure -> handler selects `browser` -> `RightSideTabs` shows local Browser panel | The remote node owns the opened tab; its VNC browser can show it. The local Electron Browser panel cannot resolve that remote tab id, yet its selection is changed. | User screenshots; source files in Source Log; `rg` found one automatic selection path |
| BEH-002 | User | User opens/focuses a run in the Electron embedded-node window; the agent calls `open_tab` | Embedded-window bootstrap -> standalone/team stream on embedded endpoints -> embedded server browser bridge opens a session in Electron `BrowserTabManager` -> success event -> shared projector -> browser-success handler -> `BrowserShellStore.focusSession(local tab_id)` -> Electron `BrowserShellController` attaches/activates the session -> handler selects `browser` | The local Electron browser result is both resolvable and visible through the Browser panel; automatic selection is meaningful and must remain. | `docs/browser_sessions.md`; Electron browser runtime/controller, store, handler, and tests listed in Source Log; user statement |

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture evidence summary: No refactor is needed. The browser-success handler is the correct owner, the current window-node store already exposes the exact invariant, standalone/team routing is already shared, and no data/interface change is required.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Remote browser is a VNC surface separate from Electron Browser | Browser auto-focus needs integration-awareness | Yes |
| `browserToolExecutionSucceededHandler.ts` | Selects Browser after any valid `open_tab` result without consulting node binding | Missing embedded/browser-shell eligibility invariant at the existing presentation owner | No |
| `windowNodeContextStore.ts` and run stores | Window binding is authoritative and drives both standalone/team endpoints | Existing boundary can be reused; do not widen tool payload or duplicate branches | No |
| `browserShellStore.focusSession` | Catches Electron focus errors internally and resolves | Focus failure is not a safe eligibility test; gate before local focus | No |
| `useRightSideTabs.ts` and handler search | Only one automatic Browser selection path exists | Local fix and focused tests are proportionate; no coordinator refactor | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts` | Shared projection of canonical standalone/team agent stream events | Invokes browser success handler without target context | Keep shared convergence; presentation handler may read current window binding directly |
| `autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts` | Browser-specific post-success parsing, local session focus, and right-tab selection | Missing node/integration eligibility guard; unconditionally selects Browser after `focusSession` resolves | Correct file and owner for the policy fix |
| `autobyteus-web/services/agentStreaming/browser/__tests__/browserToolExecutionSucceededHandler.spec.ts` | Focused browser-success presentation contract | Covers positive embedded-like behavior and invalid/unrelated events only | Add explicit remote suppression and embedded preservation cases with node/shell availability context |
| `autobyteus-web/stores/windowNodeContextStore.ts` | Authoritative per-renderer node binding and derived endpoints | Exposes `isEmbeddedWindow` used by other embedded-only features | Reuse; do not add another node heuristic |
| `autobyteus-web/stores/browserShellStore.ts` | Renderer boundary for Electron Browser availability, snapshots, and commands | `browserAvailable` identifies local shell API availability; `focusSession` absorbs IPC errors | Reuse availability; do not rely on error rejection to classify remote tabs |
| `autobyteus-web/stores/agentRunStore.ts` / `agentTeamRunStore.ts` | Create streaming services for current window's node | Both source endpoints from window node context | Confirms handler may use window binding for standalone and team events |
| `autobyteus-web/electron/browser/browser-shell-controller.ts` | Electron-owned shell/session lease and native view projection | Can focus only ids from Electron's local `BrowserTabManager` | No Electron-main change required |
| `autobyteus-web/composables/useRightSideTabs.ts` | Owns selected right-side workspace tool | Global setter is correctly consumed by presentation handler, but not node-aware itself | Do not move browser-specific policy into generic tab owner |
| `autobyteus-web/docs/browser_sessions.md` | Documents Browser tool/runtime/shell flow | Describes embedded flow as universal | Delivery docs sync should qualify auto-focus by embedded Electron window |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-30 | Repro | User-provided Docker/VNC screenshots and described action | Remote `open_tab` succeeds in Docker browser while desktop tab selection is redirected to local Browser | Confirms product-reachable BEH-001 |
| 2026-08-30 | Trace | Static source trace from node-window creation through WebSocket projection, Browser focus IPC, and right-tab state | Remote/embedded identity exists before the stream is created, but is omitted from the browser presentation decision | Fix can be deterministic at the existing handler boundary |

No local Electron/Docker runtime was started during solution investigation. The current code and user runtime evidence establish the cause; downstream API/E2E owns executable coverage investigation and execution.

## External / Public Source Findings

N/A. This behavior is repository-specific and no external research is currently required.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Likely Electron desktop plus one configured remote/Docker node for full reproduction; focused frontend tests may cover the decision without starting Docker.
- Required config, feature flags, env vars, or accounts: For a full live reproduction, an Electron desktop with its embedded server plus one configured Docker/remote node exposing `open_tab` and VNC. Focused renderer tests need mocked window-node and Browser-shell stores only.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation recorded above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The actual panel switch is not caused by Docker or `open_tab` server execution. It is a renderer-side success reaction in `browserToolExecutionSucceededHandler.ts`.
2. `open_tab` result `tab_id` is only unique within the browser runtime that created it. A Docker/VNC browser id is not a valid Electron-local Browser session identity.
3. The handler has no node gate and calls the Electron-local shell for all successful results.
4. Electron main rejects an unknown remote id, but `browserShellStore.focusSession` catches the error and resolves, so the handler's `try` continues to `setActiveTab('browser')`. This explains why the right-side tab changes even though no browser view appears.
5. Treating focus failure as the remote detector would be incorrect: it is an after-the-fact error heuristic and could misclassify unrelated local failures or an id collision. The current window binding is the governing context.
6. The minimal healthy fix is to require both `windowNodeContextStore.isEmbeddedWindow` and local Browser-shell availability before calling local focus or selecting Browser.
7. Because both standalone and team streams connect through the window-bound endpoint and converge on the same handler, the policy belongs once in the handler; no protocol or duplicate service changes are warranted.

## Persisted Data Transition Evidence (When Applicable)

Not affected based on current scope; no node or run configuration mutation is requested.

## Constraints / Dependencies / Compatibility Facts

- The remote/Docker node browser is not bridged to Electron's local Browser panel.
- The Electron embedded-node browser is bridged and should retain existing focus behavior.
- The URL-opening operation itself must remain owned by the executing node.
- Browser is intentionally a generally available manual Electron surface in node-bound desktop windows; this ticket changes only automatic projection after agent `open_tab`.
- Persisted data is not affected.

## Open Unknowns / Risks

- `browserShellStore.focusSession`'s swallowed-error contract leaves its caller unable to log via `catch`; broader command-result/error propagation cleanup is outside this ticket and not needed for the authoritative pre-focus gate.
- Full live validation requires both an embedded-node `open_tab` and a remote/Docker-node `open_tab`; downstream coverage investigation must decide whether existing Electron/Docker fixtures can exercise both or whether focused policy tests plus one realistic probe are proportionate.

## Notes For Architecture Reviewer

Requirements were approved on 2026-08-30. `design-spec.md` implements the approved direction: retain backend `TOOL_EXECUTION_SUCCEEDED`, preserve generic tool lifecycle/activity projection, and make only the browser-specific Electron focus/selection side effect conditional on `windowNodeContextStore.isEmbeddedWindow` plus Browser-shell availability. No refactor or server protocol change is indicated. Review baseline: SR-001.
