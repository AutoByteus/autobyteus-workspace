# Remote-Node New-Workspace Team-Run Visibility Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree created from refreshed `origin/personal` and fast-forwarded to refreshed commit `52b4be02ea793f2071fe5a63a94664ab25196433` immediately before approved-basis design work.
- Current Status: Initial solution package complete for architecture review; the user-correlated backend behavior and exact frontend ordering defect are reproduced, and requirements plus the UI/UX supplement were approved by the user on 2026-08-24.
- Investigation Goal: Determine why a form that visibly shows `New` and a remote path launches elsewhere, prove the actual backend destination, identify the split state owners, and produce a design-ready correction boundary.
- Scope Classification (`Small`/`Medium`/`Large`): `Small`.
- Scope Classification Rationale: Root cause is localized to duplicate pending-workspace state and an overly broad config-change watcher in the frontend run form. Backend and tree behavior are healthy once given the intended workspace identity.
- Scope Summary: Keep visible workspace mode/path and launch workspace state authoritative and synchronized across within-draft Team configuration edits.
- Primary Questions Resolved:
  - Did the user's newest operation reach port `8006`? **Yes; it created a TeamRun under Temp Workspace and sent no workspace-create request for the visibly entered path.**
  - Is the Docker-local path valid and accepted in `New` mode? **Yes.**
  - Is the defect reproducible? **Yes: enter `New` path, then change a Team setting such as global auto-approve, then launch.**
  - Why is it order-dependent? **Any Team config edit replaces the immutable config object; a parent watcher resets only its pending workspace state to Existing while the child still renders New/path.**
  - Is automatic workspace rollback the cause of the later removal mutation? **No automatic caller exists; removal is an explicit workspace-tree action.**
  - What must the correction own? **One authoritative pending workspace selection shared by rendering and launch, reset only on real draft/selection transitions or explicit user choice.**

## Request Context

The user opened a separate desktop application window connected to Docker-hosted AutoByteus server `http://localhost:8006`. In the Software Engineering Team run form they chose Codex App Server, selected a model, chose `New`, entered `/home/autobyteus/workspace/autobyteus-workspace`, and clicked `Run Team`. They expected the workspace to appear in the left navigation with the new team run beneath it. Instead the expected run did not remain/appear, while the same team launch flow against Temp Workspace was observed to work later.

User-provided screenshots:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_b33721d23d6d4ab2af678f3db3d55ef7/solution_designer_948f0fdfe2cc46eb9b6294523204d017/context_files/ctx_80e26d97cdc8__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_b33721d23d6d4ab2af678f3db3d55ef7/solution_designer_948f0fdfe2cc46eb9b6294523204d017/context_files/ctx_fc4f0b73393b__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_b33721d23d6d4ab2af678f3db3d55ef7/solution_designer_948f0fdfe2cc46eb9b6294523204d017/context_files/ctx_97b562b8be71__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git` monorepo/workspace repository.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility`
- Current Branch: `codex/remote-node-new-workspace-team-run-visibility`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: Initial `git fetch origin personal` succeeded. The investigation baseline was `c5b87df4d6db15969ba70adee9dfd8394b1e7385`. Immediately before design, `origin/personal` was refreshed again and the task branch was fast-forwarded to `52b4be02ea793f2071fe5a63a94664ab25196433`; the affected production files were rechecked and the defect remained unchanged.
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Shared-checkout condition: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` is the shared `personal` checkout and contained an unrelated untracked `.article-work/`; no task artifact or source edit was made authoritative there.
- Notes For Downstream Agents: Keep authoritative artifacts and later source changes in the dedicated worktree above. The source frontend used for the runtime probe was started from the shared checkout only because its installed dependencies were already present; source commit/version matched the task baseline for the affected files.

## Supplemental Task Artifact Inventory

| Canonical Path | Purpose | Scope | Status | Relationship To Core Artifacts | Related IDs | Approval Applicability |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/ui-ux-spec.md` | Defines authoritative visible/launch workspace state, preserved edits, intentional reset transitions, and preserved interaction/accessibility semantics. | Team run form and resulting tree placement. | `Approved` | Refines UI-verifiable requirements and constrains design. | FR-001–FR-007; AC-001–AC-009 | Approved with requirements on 2026-08-24. |

Disposable screenshots and `/tmp` log captures from investigation are not supplemental artifacts; their material findings are retained below.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-24 | Other | Three user screenshots under Request Context | Establish the reported journey and visible state | Remote endpoint shown ready; Software Engineering Team, Codex model, `New`, Docker-local path; expected row absent | No |
| 2026-08-24 | Setup | `git fetch origin personal`; dedicated `git worktree add`; later refresh/rebase | Isolate work on latest tracked integration state | Dedicated branch/worktree at `c5b87df4d...` | No |
| 2026-08-24 | Command | `curl http://localhost:8006/rest/health`; `docker ps`; `docker inspect autobyteus-server-5`; `docker exec ... test -d /home/autobyteus/workspace/autobyteus-workspace` | Verify remote node and filesystem authority | Health OK; container/ports/mount verified; exact directory exists inside node | No |
| 2026-08-24 | Log | `docker logs --since 2h --timestamps autobyteus-server-5` retained temporarily at `/tmp/autobyteus-server-5-last2h.log` | Correlate the reported action to backend lifecycle | Exact workspace registered at `06:48:17Z`; no team create followed; explicit removal at `06:48:31Z`; Temp Workspace team created at `06:48:47Z` | Preserve findings, not scratch file |
| 2026-08-24 | Data | Direct GraphQL queries to `http://localhost:8006/graphql` for workspaces, run history, and team definitions | Determine durable server state | Only Temp Workspace remained after removal; five temp-root Software Engineering Team runs; no requested-root run; team definition available | No |
| 2026-08-24 | Code | `autobyteus-web/components/workspace/config/RunConfigPanel.vue`, `TeamRunConfigForm.vue`, `WorkspaceSelector.vue` | Trace click/form/workspace preparation | Component creates workspace, updates active draft, then delegates launch; only workspace-create exceptions are rendered; post-create non-workspace readiness returns silently | Design input |
| 2026-08-24 | Code | `autobyteus-web/stores/workspace.ts`, workspace metadata/removal actions, `autobyteus-server-ts/src/api/graphql/types/workspace.ts`, `src/workspaces/*` | Establish `New` semantics and removal ownership | Metadata-only registration, canonical server path, deterministic ID; remove mutation unregisters and is explicit, not launch rollback | No |
| 2026-08-24 | Code | `autobyteus-web/stores/teamRunConfigStore.ts`, `utils/teamRunLaunchReadiness.ts`, `composables/useTeamRunRuntimeCatalogSync.ts` | Trace immutable draft/readiness lifecycle | Draft is replaced when workspace is applied; readiness can be reevaluated after async preparation; launch admission requires exact snapshot | Design input |
| 2026-08-24 | Code | `autobyteus-web/stores/agentTeamRunStore.ts`, `services/runHydration/teamRunContextHydrationService.ts`, `stores/agentTeamContextsStore.ts`, `stores/agentSelectionStore.ts` | Trace create → hydrate → context → selection | Team store owns create/hydrate/focus/context/selection, but rejects with no typed phase result; post-create hydration failure retains no launch-side confirmed-ID recovery state | Design input |
| 2026-08-24 | Code | `autobyteus-web/stores/runHistoryStore.ts`, `runHistoryNavigationProjection.ts`, `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, tree-state composables | Determine whether left tree is primary root cause | Unified projection already combines server history and live contexts and reveals selected team ancestry; a genuinely completed launch renders correctly | Preserve/reuse |
| 2026-08-24 | Code | `autobyteus-web/plugins/20.windowNodeBootstrap.client.ts`, `30.apollo.client.ts`, `stores/windowNodeContextStore.ts` | Inspect node binding and Apollo routing | Window context initializes before bound Apollo client; operations resolve current node endpoint; no routing mismatch observed in reproduction | Preserve/verify |
| 2026-08-24 | Code/Doc | `autobyteus-web/tickets/done/team-run-left-tree-visibility-personal/*` | Avoid re-solving prior tree persistence defect | Prior fix already established unified live/history projection; current report stops before team creation and is a distinct orchestration/error issue | No |
| 2026-08-24 | Trace | Nuxt dev server with `BACKEND_NODE_BASE_URL=http://localhost:8006`, port `3107`; headless Chromium via `playwright-core` | Reproduce actual frontend journey and capture requests/errors | Exact journey succeeded; both mutations targeted port `8006`; team row appeared and was selected | Controlled failure coverage still needed downstream |
| 2026-08-24 | Trace | AutoByteus browser `open_tab` tab `5e0127` against the restarted source frontend on port `3107` | Repeat the experiment visibly at the user's request | Exact path/runtime/model with global auto-approve enabled succeeded again; workspace/team remained visible; no page error was observed | Leave tab and run open for user inspection |
| 2026-08-24 | Log/Data | New `8006` Docker logs plus direct workspace/history GraphQL query after the user's Electron retry | Identify the actual destination of the newest launch | No workspace-create request; TeamRun `software_engineering_team_f7589167f330406383ba79a7a2404d58` was created under `/home/autobyteus/workspace` (Temp Workspace) | Reproduce the visible/hidden mismatch |
| 2026-08-24 | Trace | AutoByteus browser `open_tab` tab `862c0b`: enter New path, wait, then toggle global auto-approve and launch | Test config-edit ordering against split workspace state | UI continued showing New/path; backend emitted `Resolved configured temp workspace root to TempWorkspace`, created TeamRun `software_engineering_team_3727756fc425443e8c3922038c64b0d6`, and emitted no workspace-create mutation | Root cause reproduced |
| 2026-08-24 | Code | `RunConfigPanel.vue:404-413`; `WorkspaceSelector.vue:211-215, 363`; `teamRunConfigStore.ts` immutable `applyConfigEdit` path | Explain the reproduced mismatch | Parent resets pending workspace on every config object replacement; child retains/render its independent mode/path | Design single ownership/reset boundary |
| 2026-08-24 | Command | GraphQL `terminateAgentTeamRun`, `deleteStoredTeamRun`, and `removeWorkspace` for investigation-created IDs; preserved-run history query | Clean runtime probe state after user approval | Investigation runs `c4b...`, `55738...`, and `372775...`, their stored histories, and the investigation-created nested-workspace registration were removed successfully; underlying directory/files were untouched; the user's Electron run `f758...` remains active under Temp Workspace | No |
| 2026-08-24 | Data | `/Applications/AutoByteus.app/Contents/Info.plist`; `app.asar` file list/extracted workspace chunk | Check packaged version parity | Installed app and local web package both `1.4.56`; packaged chunk contains the current new-workspace launch flow/error strings | No |
| 2026-08-24 | Setup/Repo | `git fetch origin personal`; `git merge --ff-only origin/personal`; re-read affected files at `52b4be02e...` | Verify dedicated task context again after user approval | Task branch/worktree remain dedicated; base advanced by two prototype-placement commits; production `autobyteus-web` defect code is unchanged | No |
| 2026-08-24 | Code/Doc | `autobyteus-web-prototype/README.md`, root `pnpm-workspace.yaml`, production/prototype package manifests and file comparison | Resolve newly added root prototype versus production ownership | `autobyteus-web` is the production package and root-workspace member; `autobyteus-web-prototype` is an independently runnable accepted current-experience reference and is not the implementation target | Preserve prototype unchanged |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | User selects `New`, enters a path, then edits a Team setting | `WorkspaceSelector` emits local mode/path → `RunConfigPanel.pendingWorkspaceInput`; config edit replaces `effectiveTeamConfig`; broad watcher resets only parent pending state | Child still renders New/path while launch state is Existing/empty. | Controlled `open_tab` trace and source |
| BEH-002 | System | User launches after the hidden reset | `handleRun` sees `isNewWorkspaceInputMode=false` → skips `createWorkspace` → `agentTeamRunStore.launchDraft` uses prior Temp workspace | Backend creates a real Team under Temp; requested workspace never registers/appears. | User Electron logs at `07:36:50Z`; controlled trace at `07:39:39Z` |
| BEH-003 | User/System | User edits Team settings first, then enters New path last | Parent pending state remains New/path through launch → workspace create → apply canonical workspace → Team create/hydrate/select | Requested workspace and Team render correctly. | Successful Playwright and `open_tab` control runs |
| BEH-004 | Contract | User explicitly changes workspace or switches draft/selection context | Explicit selector event or stable context identity should govern workspace transition | Only intentional transitions may change pending workspace state; immutable within-draft edits must not. | Existing store draft identity and component contracts |

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Candidate root cause classification: `Duplicated Policy Or Coordination` (primary), `Local Implementation Defect` (secondary broad watcher).
- Refactor posture evidence summary: A small bounded ownership correction is needed because parent and child independently hold the same pending workspace choice. Backend launch/history/tree boundaries are healthy and should not be changed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User's newest Electron server trace | Team created under Temp with no workspace-create call | Launch consumed hidden prior workspace, not the visible New path | Trace visible/launch state ownership |
| Controlled ordering trace | Enter path, then toggle auto-approve; UI remains New but backend uses Temp | Deterministic split-brain state is reproduced outside Electron | Lock regression sequence |
| `RunConfigPanel.vue:404-413` | Watches whole config objects and resets `pendingWorkspaceInput` | Immutable within-draft edits are mistaken for context changes | Replace with stable identity transition or remove duplicate state |
| `WorkspaceSelector.vue:363` | Local mode/path keep emitting/rendering independently | Parent-only reset is invisible | Establish controlled/single ownership |
| Successful control plus tree projection | Correct workspace identity produces correct registry/history/tree | Backend and tree are not root cause | Preserve healthy owners |

## Relevant Files / Components

### Frontend entry and configuration

- `autobyteus-web/pages/agent-teams.vue` — loads team definitions and workspaces before team selection.
- `autobyteus-web/components/agentTeams/AgentTeamList.vue` — creates Team launch draft and routes to workspace.
- `autobyteus-web/components/workspace/config/RunConfigPanel.vue` — current user-operation coordinator and primary defect boundary.
- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` — form/readiness/model/workspace surface.
- `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` — `Existing`/`New` input and workspace error display.
- `autobyteus-web/composables/useTeamRunRuntimeCatalogSync.ts` — readiness catalog synchronization.
- `autobyteus-web/stores/teamRunConfigStore.ts` — immutable drafts, workspace application, launch admission/completion.
- `autobyteus-web/utils/teamRunLaunchReadiness.ts` — authoritative readiness evaluation.

### Frontend launch, hydration, and navigation

- `autobyteus-web/stores/workspace.ts` — workspace registration/cache and bound-revision-aware list loading.
- `autobyteus-web/stores/agentTeamRunStore.ts` — team create/hydrate/focus/context/select lifecycle.
- `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` — live/historical topology hydration.
- `autobyteus-web/stores/agentTeamContextsStore.ts` — live Team context registration.
- `autobyteus-web/stores/agentSelectionStore.ts` — draft-to-real-run promotion.
- `autobyteus-web/stores/runHistoryStore.ts` and action modules — persisted workspace/team history.
- `autobyteus-web/stores/runHistoryNavigationProjection.ts` — unified live/history tree projection.
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` and `useWorkspaceHistoryTreeState.ts` — rendering and selected ancestry reveal.

### Bound node and backend

- `autobyteus-web/plugins/20.windowNodeBootstrap.client.ts`, `30.apollo.client.ts`, `stores/windowNodeContextStore.ts` — per-window node binding and endpoint resolution.
- `autobyteus-server-ts/src/api/graphql/types/workspace.ts`, `src/workspaces/workspace-manager.ts`, `filesystem-workspace.ts`, `workspace-registry-store.ts` — canonical workspace registration.
- `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` and agent-team execution services — team creation and termination.
- `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts` and run-history services — durable history discovery/deletion.

### Existing coverage consulted

- `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` — happy-path New workspace test enters/emits the path and launches without a later config edit; it does not cover config replacement after path entry or visible/launch divergence.
- `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` and `WorkspaceSelector` coverage — cover individual edit/input emissions but not their integration through the parent reset watcher.
- `autobyteus-web/stores/__tests__/teamRunConfigStore.spec.ts` — confirms within-draft edits replace immutable config while stable draft identity remains available.
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel*.spec.ts` — existing tree projection/removal behavior.

## Runtime / Probe Findings

### Remote node

- Health response: `{"status":"ok","message":"Server is running"}`.
- Docker container: `autobyteus-server-5`, published server port `8006 -> 8000` (plus desktop/VNC-related ports).
- Workspace mount: host `/Users/normy/.autobyteus/docker-server/shared-workspace/nodes/autobyteus-server-5` → container `/home/autobyteus/workspace`.
- Exact requested directory exists inside the container.

### Report-correlated server lifecycle

- `2026-08-24T06:48:17.762Z`: GraphQL workspace-create mutation for `/home/autobyteus/workspace/autobyteus-workspace`.
- Returned/registered deterministic workspace ID: `agent_ws_becd3ecaff89706972c1fac769b98f892c38aa730b96071a1f2da926f996d3a2`.
- No agent-team creation log occurs for that workspace after the registration.
- `2026-08-24T06:48:31.796Z`: GraphQL remove-registered-workspace mutation closes that workspace. Source search shows only the explicit workspace history/tree removal path calls `workspaceStore.removeWorkspace`; launch failure has no rollback call.
- `2026-08-24T06:48:47.310Z`: a Software Engineering Team launch against Temp Workspace starts successfully, corroborating that team definition/runtime creation was generally available immediately afterward.

### Fresh source-frontend reproduction

- Server command: `BACKEND_NODE_BASE_URL=http://localhost:8006 pnpm -C autobyteus-web dev --port 3107`.
- Browser automation: local `playwright-core` Chromium, actual `/agent-teams` → Software Engineering Team → `/workspace` journey.
- Configuration: `codex_app_server`, `gpt-5.6-sol`, `New`, exact reported path.
- Observed requests:
  - `CreateWorkspace` to `http://localhost:8006/graphql` succeeded with the deterministic ID/root above.
  - `CreateAgentTeamRun` to `http://localhost:8006/graphql` succeeded with investigation team ID `software_engineering_team_c4b44900e65e4371a0b340d125451ebc`.
- Observed UI: left tree showed `autobyteus-workspace` → `Software Engineering Team (1)` → all six members; the new `solution_designer` was selected.
- Cleanup: terminated the investigation team, permanently deleted only its stored history, and removed only its workspace registration. The server explicitly reported that files, memories, and other run history were not deleted.
- Conclusion: the supported happy path works against port `8006`; the later controlled sequence proves the reported failure is ordering-dependent rather than a backend, Docker-path, or tree defect.

### User-requested visible repeat with `open_tab`

- Restarted the same source frontend on port `3107` bound to `http://localhost:8006`.
- Opened AutoByteus browser tab `5e0127` at `/agent-teams`, selected Software Engineering Team, Codex App Server, GPT-5.6-Sol, `New`, the exact reported path, and enabled global `Auto approve tools` to match the screenshot more closely.
- Activated `Run Team` at `2026-08-24T07:34:50.243Z`.
- Remote logs show workspace registration at `07:34:50.269Z` and TeamRun creation for `software_engineering_team_55738d16ba3b40c1877e230df167b592` immediately afterward.
- The open tab showed `autobyteus-workspace` → `Software Engineering Team (1)` with all six members and `solution_designer` selected. No page error/unhandled rejection was observed.
- This second visible attempt did **not** reproduce the failure. Path entry and the auto-approve toggle were dispatched in the same browser-script turn rather than as separate settled user interactions, so it remains the successful control rather than a contradiction of the later ordering reproduction. It was left open during user inspection and cleaned after the user approved continued work.

### User's newest Electron attempt

- At `2026-08-24T07:36:50.645Z`, the backend logged `Resolved configured temp workspace root to TempWorkspace` and created TeamRun `software_engineering_team_f7589167f330406383ba79a7a2404d58`.
- There was no `GraphQL mutation to create workspace metadata` near this launch.
- Direct GraphQL history shows that TeamRun under `/home/autobyteus/workspace`, while the requested nested root contains only the successful source-browser control TeamRun.
- This proves the Electron UI submitted the prior Temp workspace despite visibly showing `New` and the nested path.

### Deterministic ordering reproduction with `open_tab`

- Opened tab `862c0b` on the same source frontend/server.
- Selected Codex App Server and GPT-5.6-Sol, then selected `New`, entered the exact path, and waited until the UI showed `aria-selected=true` for New and the full path value.
- Changed global `Auto approve tools` **after** the path entry, then waited. The UI still visibly showed New/path and `Run Team` remained enabled.
- Activated `Run Team` at `2026-08-24T07:39:39.340Z`.
- Backend emitted no workspace-create mutation, logged `Resolved configured temp workspace root to TempWorkspace` at `07:39:39.347Z`, and created TeamRun `software_engineering_team_3727756fc425443e8c3922038c64b0d6` under Temp Workspace.
- Result: the reported defect is reproduced. The sequence isolates the trigger to an unrelated immutable Team config edit after pending New input.

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: All material contracts are repository- and live-environment-specific; local source, server state, and captured operations are authoritative.

## Reproduction / Environment Setup

- Required services: existing Docker node `autobyteus-server-5` at `http://localhost:8006`; source Nuxt frontend.
- Required config: `BACKEND_NODE_BASE_URL=http://localhost:8006` for browser-mode reproduction.
- Required path: `/home/autobyteus/workspace/autobyteus-workspace` already present inside the Docker node.
- External repos/samples downloaded: None.
- Investigation-only setup: a temporary dependency symlink in the task worktree was removed. After user inspection/approval, the dev server and both controlled tabs were closed; all investigation-created runs/histories and the nested workspace registration were cleaned. The user's Electron-created `f758...` run was intentionally preserved.
- Packaged-app check: installed `/Applications/AutoByteus.app` version `1.4.56`; local `autobyteus-web` version `1.4.56`. No separate packaged-app automation was retained.

## Findings From Code / Docs / Data / Logs

1. `New` means “register this server-local root,” not “create a new directory.” The user's existing directory is valid input.
2. Node routing is correct. Both successful and failing controlled requests reached port `8006`.
3. `WorkspaceSelector` locally owns the visible `mode` and `tempPath` and emits them through `workspace-input-change`.
4. `RunConfigPanel` separately stores `pendingWorkspaceInput`; launch decisions use this parent state, not the child's rendered state.
5. The bottom watcher in `RunConfigPanel` observes complete effective config objects and resets parent pending workspace state to Existing on every object replacement.
6. `teamRunConfigStore.applyConfigEdit` intentionally replaces immutable config objects for runtime, model, LLM config, auto-approve, and member edits while preserving the same draft identity.
7. Therefore a within-draft edit after New/path triggers the reset even though no workspace intent changed.
8. The parent does not control the child's mode/path, so the child continues to show New/path. This creates a deterministic visible/launch split.
9. `handleRun` sees hidden `mode=existing`, skips `createWorkspace`, and launches the Team using the prior draft workspace—normally Temp Workspace.
10. The backend and left tree behave correctly for the identity they receive. They must be preserved.
11. Existing happy-path tests do not insert a settled config edit after New/path and therefore miss the ordering bug.
12. Unhandled broader launch errors remain a secondary non-blocking observation and are no longer the root-cause design basis for this ticket.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject/location: remote node workspace registry metadata plus team-run history/memory under that node's configured data directory.
- Representative shape: deterministic `agent_ws_<hash>` workspace ID keyed by canonical root; `software_engineering_team_<id>` root TeamRun with member runs and workspace root in history/configuration.
- Relevant code-model/serialization/physical-store change: None required by the behavior correction.
- Normal readers/writers: workspace GraphQL resolver/manager/registry; TeamRun manager/history service; frontend workspace/history stores and hydration services.
- Representative direct-read evidence: direct `workspaces` and run-history GraphQL queries correctly described current server state; clean launch history/tree used existing records with no transformation.
- Required semantics and invariants preserved by direct use: `Directly Usable — No Migration`.
- Physical/privacy/disposal constraints: do not delete workspace files, memories, or unrelated history; do not copy state across nodes.
- Concrete migration benefit/cost/risk: no benefit; rewriting current records would add needless operational and corruption risk.
- Existing migration framework/lifecycle constraints: not applicable.

## Constraints / Dependencies / Compatibility Facts

- Remote server paths need not exist on the desktop host.
- Each desktop window is intended to stay bound to one node; Apollo endpoints resolve from that window context.
- Workspace ID/root and TeamRun ID are authoritative server identities.
- Team config objects are immutable value snapshots; stable `draftId`/`selectedDraftId` identifies the context across within-draft edits.
- The selector's visible tab/path and the launch's pending workspace state must be one authoritative value or an explicitly controlled contract.
- No backend, persistence, or tree-only workaround should compensate for incorrect frontend workspace intent.
- `autobyteus-web` is the production implementation target. The root `autobyteus-web-prototype` is an accepted, fixture-driven current-experience reference and must not be updated as a substitute for production source.

## Open Unknowns / Risks

- Design must choose the narrowest single owner/controlled-component shape and avoid replacing the broad watcher with another heuristic deep watch.
- Regression coverage must include every within-draft config editor that replaces the Team config after path entry.
- The same outer watcher includes agent config; implementation must preserve agent launch behavior and determine whether the shared correction safely covers it.
- Broader launch-error handling is a separate non-blocking follow-up unless implementation uncovers a direct dependency.

## Notes For Architecture Reviewer

Initial package is ready for architecture review. Requirements and the UI/UX supplement were approved by the user on 2026-08-24. Review the controlled workspace-state owner, stable context-identity reset, clean-cut event removal, production-only file scope, and focused regression plan while preserving the healthy backend/team/history/tree boundaries.
