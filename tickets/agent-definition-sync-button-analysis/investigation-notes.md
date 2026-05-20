# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed; dedicated task worktree/branch created before deep investigation.
- Current Status: Investigation complete; user approved full synchronization decommission; design specification completed and ready for architecture review.
- Investigation Goal: Determine how Agent and Agent Team synchronization currently works, why the `Sync` button appears on list cards, whether the behavior is still needed after disk/Git package import, and what design/implementation change should follow.
- Scope Classification (`Small`/`Medium`/`Large`): Large.
- Scope Classification Rationale: Correct cleanup spans frontend components/stores/tests/docs, backend GraphQL/services/tests, generated artifacts/localization, documentation, and catalog reload semantics.
- Scope Summary: Analyze and decommission node synchronization as a product feature, including Agent/Team card sync, Settings node bootstrap/full sync, frontend sync wiring, and backend node-sync API/services.
- Primary Questions To Resolve:
  - What exact frontend components render the `Sync` buttons? Resolved.
  - What API endpoints/actions do those buttons invoke? Resolved.
  - What backend service logic runs for agent and team sync? Resolved.
  - Does sync remain necessary in a disk/Git package import architecture? Resolved: no. Full product synchronization is obsolete; use package/Git/folder update for definitions and explicit per-machine MCP config/import/discovery for MCP.
  - If necessary, where should the action live and how should the UI explain it? Resolved: no remaining sync action; Settings → Nodes remains node management only.
  - If obsolete, what frontend/backend/API removal is appropriate? Remove all sync UI, frontend node-sync store/types/components/mutations, backend node-sync GraphQL APIs/services, sync tests, generated artifacts, localization, and docs references.

## Request Context

The user reports confusion about per-card `Sync` buttons on Agent and Agent Team pages. The user believes the button came from an earlier database-defined agent/team architecture, where Docker deployments could not easily update database definitions. The current model imports definitions from disk/Git packages through Settings, so updating a package or repulling a repository should make definitions current without manual per-card sync. The user asks for analysis of whether synchronization from the Agent and Agent Team pages is still needed.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-definition-sync-button-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-definition-sync-button-analysis/tickets/agent-definition-sync-button-analysis`
- Current Branch: `codex/agent-definition-sync-button-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-definition-sync-button-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` completed successfully on 2026-05-20.
- Task Branch: `codex/agent-definition-sync-button-analysis`, created from `origin/personal`.
- Expected Base Branch (if known): `personal` / `origin/personal`.
- Expected Finalization Target (if known): `personal` unless user specifies otherwise.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative artifacts live in the task worktree, not the shared superrepo checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-20 | Command | `git status --short --branch && git remote -v && git branch --show-current && git rev-parse --show-toplevel && git worktree list --porcelain` | Discover repository state and worktrees before task isolation | Initial cwd was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on branch `personal` tracking `origin/personal`; many ticket worktrees existed; no matching sync-button worktree. | No |
| 2026-05-20 | Command | `git remote show origin | sed -n '/HEAD branch/s/.*: //p'` | Resolve default/base branch | Remote HEAD branch is `personal`. | No |
| 2026-05-20 | Command | `git fetch origin personal` | Refresh tracked remote refs before creating task worktree | Fetch completed from `origin` branch `personal`. | No |
| 2026-05-20 | Command | `git worktree add -b codex/agent-definition-sync-button-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/agent-definition-sync-button-analysis origin/personal` | Create dedicated task worktree/branch | Worktree created at requested path; branch tracks `origin/personal`; HEAD `96703369`. | No |
| 2026-05-20 | Command | `rg -n "\bSync\b|syncAgent|syncTeam|synchroni[sz]|reload" autobyteus-web autobyteus-server-ts autobyteus-ts applications docs` | Locate sync-related frontend/backend paths | Found Agent/Team card/list sync labels, `nodeSyncStore`, backend `src/sync`, and Settings NodeManager full sync. | No |
| 2026-05-20 | Code | `autobyteus-web/components/agents/AgentCard.vue` | Identify why Agent card shows Sync | `canSync` is computed solely from `ownershipScope === 'SHARED'`; emits `sync-agent`; no target-node availability check. | Implementation cleanup if approved |
| 2026-05-20 | Code | `autobyteus-web/components/agents/AgentList.vue` | Trace Agent selective sync UI flow | Imports node registry and node sync stores, renders `NodeSyncTargetPickerModal` and `NodeSyncReportPanel`, reports no-target error, and calls `runSelectiveAgentSync` with `includeDependencies: true`, `includeDeletes: false`. | Implementation cleanup if approved |
| 2026-05-20 | Code | `autobyteus-web/components/agentTeams/AgentTeamCard.vue` | Identify why Agent Team card shows Sync | `canSync` is computed solely from `ownershipScope === 'SHARED'`; emits `sync-team`; no target-node availability check. Nested team count is independent of sync visibility. | Implementation cleanup if approved |
| 2026-05-20 | Code | `autobyteus-web/components/agentTeams/AgentTeamList.vue` | Trace Team selective sync UI flow | Imports node registry and node sync stores, renders target picker/report, reports no-target error, calls `runSelectiveTeamSync` with agent+team scopes and dependency inclusion. | Implementation cleanup if approved |
| 2026-05-20 | Code | `autobyteus-web/stores/nodeSyncStore.ts` | Understand frontend sync abstraction | Generic `runNodeSync` maps node IDs to base URLs and runs GraphQL mutation. Selective agent/team helpers are UI-specific wrappers. Full/bootstrap helpers are used by Settings → Nodes. | Remove store/file after all UI callers are removed |
| 2026-05-20 | Code | `autobyteus-web/components/settings/NodeManager.vue` | Identify Settings node-sync surface | Settings → Nodes currently owns Add Remote Node bootstrap sync and Run Full Sync with selectable source, targets, and scope. After follow-up analysis, this is also obsolete because sync itself is no longer a valid product feature. | Remove sync UI; preserve node management |
| 2026-05-20 | Code | `autobyteus-server-ts/src/sync/services/node-sync-coordinator-service.ts` | Trace backend run orchestration | Preflights endpoints, exports source bundle, imports into each target, aggregates success/failure and report. | Remove with NodeManager sync UI |
| 2026-05-20 | Code | `autobyteus-server-ts/src/sync/services/node-sync-service.ts` | Trace sync payload export/import | Export reads agent/team payload files; import writes payload files and refreshes caches. Supports agent/team/MCP scopes. | Remove backend sync contract |
| 2026-05-20 | Code | `autobyteus-server-ts/src/sync/services/node-sync-selection-service.ts` | Understand selective dependency closure | Selected team sync can include member agent and nested team dependencies. Agent selection has no comparable dependency expansion. | Note in design |
| 2026-05-20 | Code | `autobyteus-server-ts/src/sync/services/node-sync-file-layout.ts` | Confirm where sync payloads read/write | Sync reads and writes only app-data `agents/<id>/agent.md`, `agent-config.json`, `agent-teams/<id>/team.md`, `team-config.json`, plus team-local agents. It does not resolve additional package roots. Missing files fall back to empty `agent.md`/`team.md` and `{}` config strings. | Cross-node materialization, not package import; risky for package-backed definitions |
| 2026-05-20 | Code | `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | Compare package import behavior | Agent package import/remove validates local/GitHub package roots, updates additional roots/registry, and refreshes agent/team caches. | Preserve package flow |
| 2026-05-20 | Code | `autobyteus-web/stores/agentPackagesStore.ts` | Trace frontend package refresh | After import/remove, store invalidates/reloads applications, agents, and teams. | Preserve package flow |
| 2026-05-20 | Code | `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | Understand disk/Git package discovery for agents | Reads built-in app-data agents plus additional package roots; visible list includes team-local/application-owned sources. | Supports package-based discovery |
| 2026-05-20 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | Understand disk/Git package discovery for teams | Reads built-in app-data teams plus additional package roots and application-owned team sources. | Supports package-based discovery |
| 2026-05-20 | Code | `autobyteus-server-ts/src/agent-definition/providers/cached-agent-definition-provider.ts` | Check backend cache behavior | `getAllVisible()` reads persistence provider directly; `getAll()`/`getById()` use cache. Agent list GraphQL uses visible definitions. | Reload semantics mostly okay for Agent list, but detail/cache paths may still need refresh |
| 2026-05-20 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/cached-agent-team-definition-provider.ts` | Check backend cache behavior | `getAll()` and `getById()` are cached until provider refresh. Agent Team list GraphQL uses `getAllDefinitions()`, so manual disk/Git changes may not show on mere frontend network reload. | Consider refresh-catalog on list Reload |
| 2026-05-20 | Code | `autobyteus-web/docs/agent_management.md`, `autobyteus-web/docs/agent_teams.md`, `autobyteus-web/docs/settings.md` | Check docs | Docs currently mention generic delete/duplicate/sync and featured cards exposing sync; Settings docs already own node sync. | Update if implemented |
| 2026-05-20 | Code | `autobyteus-web/components/agents/__tests__/AgentList.spec.ts`, `AgentCard.spec.ts`, `autobyteus-web/components/agentTeams/__tests__/AgentTeamList.spec.ts`, `AgentTeamCard.spec.ts` | Find tests encoding current behavior | Tests assert sync visibility/flows/no-target errors. These need updating if removed. | Update if implemented |
| 2026-05-20 | Code | `autobyteus-web/tickets/remove-prompt-synchronization-ui/*` | Check precedent for removing stale sync UI | Prior prompt-sync cleanup removed marketplace sync button/store/mutation wiring and kept normal reload/create/edit/delete flows. | Useful precedent |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Agent/Agent Team card `Sync` button in normal browse cards.
- Current execution flow:
  - Agent: `AgentCard.vue` button → `AgentList.vue.syncAgent(...)` → target picker → `confirmAgentSync(...)` → `nodeSyncStore.runSelectiveAgentSync(...)` → GraphQL `runNodeSync` → backend node sync coordinator → source export → target import.
  - Team: `AgentTeamCard.vue` button → `AgentTeamList.vue.syncTeam(...)` → target picker → `confirmTeamSync(...)` → `nodeSyncStore.runSelectiveTeamSync(...)` → GraphQL `runNodeSync` → backend node sync coordinator → source export with dependency closure → target import.
- Ownership or boundary observations:
  - Per-card sync is a cross-node operational action but is owned by normal catalog cards/lists.
  - Settings → Nodes already owns node registration and sync operations, making Agent/Team pages a boundary bypass for node operations.
  - Package import/remove has its own Settings-owned lifecycle and refresh behavior.
- Current behavior summary: The `Sync` button is visible for all shared Agent/Team cards regardless of target node availability. It copies selected definitions from the current source node to configured target nodes. It is not related to nested teams/member count and is not the same as refreshing imported package definitions from disk.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / behavior change.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Legacy Or Compatibility Pressure.
- Refactor posture evidence summary: Remove selective sync wiring from Agent/Team list surfaces. Keep generic backend/store sync for Settings → Nodes.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request and screenshot | `Sync` appears per team card even for `Nested Teams 0`; user is unsure what it does. | UI label and placement expose internal/operational cross-node sync in a normal catalog card. | Remove or relocate |
| `AgentCard.vue`, `AgentTeamCard.vue` | Sync visibility depends only on `SHARED` ownership. | Missing invariant: target-node availability and user intent are not part of button visibility. | Remove per-card action rather than patching visibility |
| `AgentList.vue`, `AgentTeamList.vue` | No-target handling is reactive error after click. | Confusing affordance is intentionally displayed before it can succeed. | Remove per-card action |
| `NodeManager.vue` | Settings has Add Node bootstrap sync and Run Full Sync. | Follow-up analysis concluded cross-node sync itself is obsolete; NodeManager should own node management only. | Remove bootstrap/full sync UI and logic; preserve node registration/open/remove. |
| `AgentPackageService`, `agentPackagesStore` | Package import/remove refreshes caches/catalogs. | Normal definition updates belong to package management/reload, not cross-node card sync. | Preserve; clarify Reload |
| Cached team provider | Team list uses cached backend service; frontend network reload alone may not refresh manual disk changes. | If disk/Git updates are expected, Reload semantics need catalog refresh; Sync button is not the right fix. | Consider in implementation design |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/agents/AgentCard.vue` | Agent card rendering/actions | Renders `Sync` for shared agents and emits `sync-agent`. | Remove sync action/emits from card. |
| `autobyteus-web/components/agents/AgentList.vue` | Agent catalog page | Owns selective sync state, target picker, reports, node-store initialization, and selective sync calls. | Remove selective sync concerns; list should own catalog browse/reload/run/detail only. |
| `autobyteus-web/components/agentTeams/AgentTeamCard.vue` | Team card rendering/actions | Renders `Sync` for shared teams and emits `sync-team`; independent of nested team count. | Remove sync action/emits from card. |
| `autobyteus-web/components/agentTeams/AgentTeamList.vue` | Team catalog page | Owns selective team sync state, target picker, reports, node-store initialization, and selective sync calls. | Remove selective sync concerns; list should own catalog browse/reload/run/detail only. |
| `autobyteus-web/stores/nodeSyncStore.ts` | Frontend node sync GraphQL abstraction | Contains generic, full/bootstrap, and selective helpers. Selective helpers are only used by Agent/Team lists. | Remove selective helpers if no callers remain; keep generic/full/bootstrap. |
| `autobyteus-web/components/settings/NodeManager.vue` | Node registration plus legacy sync operations | Currently owns bootstrap sync on add-node and full sync between nodes. | Keep node registration/open/remove responsibilities; remove bootstrap/full sync responsibilities. |
| `autobyteus-server-ts/src/sync/services/*` | Backend node sync export/import/control | Provides generic cross-node sync for definitions and MCP configs, but definition file payloads are app-data-path based rather than package-source aware. | Remove backend service/API; package-backed definitions and MCP machine-local config make this contract obsolete. |
| `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | Agent package import/remove | Refreshes agent/team caches after package mutation. | Normal package onboarding/update owner. |
| `autobyteus-web/stores/agentPackagesStore.ts` | Frontend package manager store | Invalidates/reloads dependent catalogs after package mutation. | Preserve. |
| `autobyteus-web/docs/agent_management.md` | Agent frontend docs | Mentions sync as generic/featured card action. | Update. |
| `autobyteus-web/docs/agent_teams.md` | Team frontend docs | Mentions sync as generic/featured card action. | Update. |
| `autobyteus-web/docs/settings.md` | Settings docs | Already says node sync lives under Nodes. | Possibly clarify that Agent/Team pages do not expose sync. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-20 | Static trace | Code-read trace from `AgentCard.vue` / `AgentList.vue` to `nodeSyncStore` and backend services | Sync is cross-node export/import, not local disk reload and not nested-team sync. | Product UI placement/label is misleading. |
| 2026-05-20 | Static trace | Code-read trace from `AgentPackagesManager.vue` / `agentPackagesStore.ts` to `AgentPackageService` | Package import/remove refreshes dependent catalogs; package updates are Settings-owned. | Per-card sync is not needed for normal imported package onboarding. |
| 2026-05-20 | Static trace | Code-read trace of cached providers and GraphQL resolvers | Agent visible list reads disk via `getAllVisible`; Team list reads cached `getAllDefinitions`. | Reload semantics may need backend cache refresh, especially for teams. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is an internal product/codebase analysis.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for this static analysis.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation commands recorded in Source Log.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. **What synchronization does now:** It synchronizes definitions between configured AutoByteus nodes. The source node exports selected definition files through GraphQL; the coordinator imports them into target nodes via each target's GraphQL API.
2. **Why the button appears with no target nodes:** Card visibility only checks shared ownership. Target availability is checked after click in the list handler.
3. **Why `Nested Teams 0` is irrelevant:** Nested teams are team member graph nodes; sync target nodes are AutoByteus server nodes. The UI uses the same word “node” in two different domains.
4. **Why package import changes the product answer:** Definition distribution/update is now mostly package-root based. Users should go to Settings → Agent Packages / Application Packages or use list Reload, not per-definition cross-node sync.
5. **Package-backed definition risk:** Node sync payload reads use app-data paths only. A package-backed definition visible on a card can still show `Sync`, but the export path does not locate its package source files. This can produce empty fallback payloads or app-data copies on targets that later shadow package roots because file providers read app-data roots before additional package roots.
6. **What replaces sync:** Multi-node operators still need node registration/opening and MCP per-machine setup, but not cross-node state copy. Settings → Nodes should remain node management only; Settings → MCP Servers should remain explicit per-machine MCP import/configuration/discovery.
7. **Cache nuance:** Removing Sync should not imply disk refresh is already perfect. Team list reload currently may not refresh backend team cache after manual disk/Git updates. That should be addressed through Reload/package refresh semantics, not by keeping the misleading Sync button.

## Constraints / Dependencies / Compatibility Facts

- `RunNodeSync` GraphQL mutation and backend sync services are currently used only by sync UI/tests and should be removed with those callers.
- Node sync definition payload handling is app-data-only today; it is not a safe package-distribution replacement for definitions sourced from additional package roots.
- `nodeSyncStore.runFullSync` and `runBootstrapSync` are currently tied to Settings → Nodes sync UI and should be removed with that UI.
- `nodeSyncStore.runSelectiveAgentSync` and `runSelectiveTeamSync` appear to be used only by Agent/Team list components.
- Existing tests encode selective sync behavior and must be changed if the UI is removed.
- Docs currently advertise sync in Agent/Team card behavior and must be updated.

## Open Unknowns / Risks

- Whether any power user relies on cross-node copy of UI-created app-data definitions. Approved answer is future explicit package export/import if needed, not keeping sync.
- Whether a future UI-created definition export flow is needed. This is explicitly out of scope for node-sync decommission.
- Whether list Reload should include a new backend catalog refresh mutation in the same change or be delivered as a follow-up. Recommendation: include it if implementation scope allows because it supports the package/disk update story.
- Managed GitHub agent package update/re-pull is not visible in `AgentPackagesManager.vue`; if users need “pull latest” for managed GitHub packages, that is a separate package-management feature.

## Notes For Architect Reviewer

If this moves to implementation design, the likely target architecture is:

- Agent/Team catalog pages own browse/search/reload/create/run/detail only.
- Settings → Nodes owns node registration/open/rename/remove/capability/remote-browser management only; no sync operations remain.
- Package managers own package-root import/remove/update refresh.
- Backend catalog-refresh mutations strengthen Reload semantics without keeping stale sync UI.

## Follow-Up Investigation: Whole Synchronization Feature Validity

User clarified that the concern is broader than the Agent/Agent Team card buttons: MCP synchronization is usually invalid because MCP STDIO configs depend on per-machine executable paths, working directories, env vars, and secrets; agent/team definitions are now text folders, so update/distribution should happen through package/Git/folder update rather than node state sync.

Additional findings:

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-20 | Code | `autobyteus-server-ts/src/mcp-server-management/services/mcp-config-service.ts` | Confirm MCP management behavior | MCP configs are explicitly configured/imported as JSON and can be discovered/registered per server. This flow remains valid without node sync. | Keep MCP management |
| 2026-05-20 | Code | `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts` via `rg` | Confirm MCP config fields | STDIO configs persist `command`, `args`, `env`, and `cwd`; HTTP configs persist `url`. | Supports machine-local concern |
| 2026-05-20 | Docs | `autobyteus-server-ts/docs/examples/alexa_mcp_import.json` | Check real MCP config shape | Example contains placeholders for local checkout paths, scripts, secret refresh-token files, and device names. | Do not cross-node sync blindly |
| 2026-05-20 | Docs | `autobyteus-server-ts/docs/examples/codex_mcp_import.json` | Check another MCP config shape | Example uses `npx` and `OPENAI_API_KEY`; still requires per-machine runtime/env assumptions. | Do not cross-node sync blindly |
| 2026-05-20 | Docs | `autobyteus-web/docs/tools_and_mcp.md` | Understand documented MCP UX | MCP management already supports visual config, raw JSON, preview, save, and tool discovery. | Keep explicit import/config |

Revised conclusion:

- Node synchronization was a database-era bridge for moving otherwise-hidden persistent state between nodes.
- Current agent/team definitions are file/package-backed, so the durable distribution primitive should be package roots/Git/folder copy, not source-node-to-target-node state copy.
- Current MCP config is not safely synchronizable because it is often an instruction for how one machine starts or reaches a server. Copying it to another machine does not make dependencies, paths, secrets, or network reachability true there.
- The only remaining plausible node-sync use case is a power-user convenience for identical machines or UI-created app-data definitions. That is too narrow and too unsafe to justify a product-level synchronization feature. It should be replaced by explicit package export/import/update if needed.
- Recommended final state is full decommission of node sync UI and backend APIs; this was approved by the user on 2026-05-20.


## User Approval Update

On 2026-05-20, after reviewing the recommendation, the user explicitly approved removing synchronization completely. The approved scope is full decommission, not relocation: Agent and Agent Team pages lose per-card sync, Settings → Nodes loses bootstrap/full sync, frontend node-sync wiring is removed, and backend node-sync APIs/services/tests are removed. Supported replacement paths are package/Git/folder updates plus catalog reload for agent/team definitions, and explicit per-machine MCP import/configuration/discovery for MCP servers.
