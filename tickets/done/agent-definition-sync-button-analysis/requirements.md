# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready. User approved full synchronization decommission on 2026-05-20; implementation design may treat the removal scope as locked unless downstream review finds a requirement gap.

## Goal / Problem Statement

Evaluate whether the node synchronization feature itself is still valid, not only whether Agent and Agent Team pages should show per-card `Sync` buttons. The user argues that the original reason for synchronization was database-backed definitions, while current agent/team definitions are text/folder-backed and imported from disk/Git packages. The user also notes that MCP configurations are usually machine-local because STDIO MCP servers depend on local executable paths, working directories, credentials, and environment variables.

## Investigation Findings

- The current product has three node-sync entrypoints:
  - per-card selective Agent sync on `AgentList.vue` / `AgentCard.vue`;
  - per-card selective Agent Team sync on `AgentTeamList.vue` / `AgentTeamCard.vue`;
  - Settings → Nodes bootstrap/full sync in `NodeManager.vue`.
- All three use the same `nodeSyncStore` → GraphQL `runNodeSync` → backend `NodeSyncCoordinatorService` path.
- Backend node sync is a cross-node export/import mechanism. It asks a source node to export a bundle, then imports that bundle into target nodes.
- Agent/team sync payloads are file payloads, not database rows, and are read/written under app-data paths:
  - `<app-data>/agents/<id>/agent.md`
  - `<app-data>/agents/<id>/agent-config.json`
  - `<app-data>/agent-teams/<id>/team.md`
  - `<app-data>/agent-teams/<id>/team-config.json`
- The sync file layout does **not** resolve additional package roots. Package-backed definitions may therefore export empty fallback payloads if no app-data copy exists, or create app-data copies on target nodes that shadow package definitions because app-data roots are read before additional package roots.
- MCP sync copies configuration fields such as `command`, `args`, `env`, `cwd`, and HTTP `url`. For STDIO MCP servers, these values are usually machine-specific. The repository's own MCP import examples use placeholders like `<PATH_TO_AUTOBYTEUS_MCPS>` and secret/token paths, confirming that MCP config often requires per-machine editing before use.
- Settings already has a separate MCP bulk import flow (`McpBulkImportView.vue` / `McpConfigService.importConfigsFromJson(...)`) that is more honest than cross-node sync because users can edit machine-local paths/secrets before import.
- Package import/remove is already the current definition distribution model:
  - `AgentPackageService` imports local path or GitHub package roots and refreshes backend definition caches.
  - `agentPackagesStore` invalidates/reloads applications, agents, and teams after package mutations.
- Important separate issue: list `Reload` should mean “refresh the catalog from the current configured sources.” Agent Teams currently use a backend cached provider, so frontend-only network reload may not pick up manual disk/Git changes unless the backend cache is refreshed.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / behavior change / legacy decommission.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure + Boundary Or Ownership Issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed.
- Evidence basis: Node sync was designed as a state-copy mechanism, but current definitions are file/package-backed. The sync implementation is not package-root-aware, and MCP sync copies machine-local configuration. Normal users should use package import/reload and MCP explicit import/configuration instead.
- Requirement or scope impact: Decommission node synchronization as a product feature, remove sync UI entrypoints, remove frontend sync store/GraphQL wiring, and remove backend node-sync APIs/services/tests once product callers are gone.

## Recommendations

1. **Decommission node synchronization as a product feature.** It no longer matches the current file/package-backed architecture and is actively misleading for MCP and package-backed definitions.
2. **Remove all visible sync UI entrypoints:**
   - Agent card/list selective sync;
   - Agent Team card/list selective sync;
   - Settings → Nodes bootstrap sync checkbox/status;
   - Settings → Nodes “Run Full Sync” section.
3. **Remove frontend node-sync wiring** once UI entrypoints are removed:
   - `nodeSyncStore.ts`;
   - `graphql/mutations/nodeSyncMutations.ts`;
   - `types/nodeSync.ts`;
   - `NodeSyncTargetPickerModal.vue` and `NodeSyncReportPanel.vue` if no remaining callers exist;
   - localization keys/tests/docs for node sync.
4. **Remove backend node-sync APIs/services.** Clean target is removal of `NodeSyncResolver`, `NodeSyncControlResolver`, and `src/sync/services/*`, because keeping a hidden legacy API invites future boundary confusion.
5. **Keep MCP management, but not MCP cross-node sync.** MCP should remain editable/importable through Settings → MCP Servers and JSON import, because users need to adjust local paths, commands, env, and secrets per machine.
6. **Keep package import as the definition distribution/update model.** Users should update/re-pull the package repository and reload/refresh the catalog. If managed GitHub packages need a one-click “Update/Pull latest” action, implement that under Agent Packages rather than node sync.
7. **Strengthen catalog Reload semantics.** Agent/Agent Team Reload should refresh backend definition caches from configured disk/package sources before refetching data, especially for Agent Teams.

## Scope Classification (`Small`/`Medium`/`Large`)

Large. Full decommission is in scope: remove product UI entrypoints, frontend sync store/types/components/GraphQL wiring, backend node-sync GraphQL APIs/services, sync-specific tests, localization, generated artifacts, and documentation references.

## In-Scope Use Cases

- UC-001: A user browsing Agents sees clear catalog actions only: Reload, Create Agent, Run, View Details. No per-card Sync button appears.
- UC-002: A user browsing Agent Teams sees clear catalog actions only: Reload, Create Team, Run, View Details. No per-card Sync button appears.
- UC-003: A user managing remote nodes can register/open/rename/remove nodes without any bootstrap/full synchronization options.
- UC-004: A user managing MCP config imports/edits MCP servers explicitly per machine through Settings → MCP Servers, with local path/secret review.
- UC-005: A user updates agent/team definitions through file/package sources and uses Reload/package refresh semantics to see current definitions.
- UC-006: Developers no longer have to explain two meanings of “sync” or support cross-node state copy for file/package-backed definitions.

## Out of Scope

- Removing remote node registration/open-window functionality.
- Removing MCP server management, MCP bulk import, MCP tool discovery, or tool registration.
- Redesigning the whole package import system.
- Adding automatic filesystem watchers for all package roots.
- Changing the agent/team definition file format.
- Changing run creation/execution behavior.

## Functional Requirements

- FR-001: Agent cards must not render a per-definition `Sync` action in normal browse/search/featured/application/shared sections.
- FR-002: Agent Team cards must not render a per-definition `Sync` action in normal browse/search/featured/regular sections.
- FR-003: Agent and Agent Team list pages must not initialize node sync state or node registry data solely for removed sync actions.
- FR-004: Agent and Agent Team list pages must not render selective sync errors, informational messages, target picker modals, or sync report panels.
- FR-005: Settings → Nodes must not present bootstrap sync or full sync actions. It should remain focused on node registration, connectivity/capability inspection, node window opening, remote browser sharing, and Docker guidance.
- FR-006: MCP server management must remain explicit per-machine configuration, including JSON import and tool discovery, without cross-node sync.
- FR-007: Package import/remove flows must continue to refresh dependent catalogs after successful package changes.
- FR-008: Agent/Agent Team Reload must be reviewed and, where necessary, must trigger backend catalog/cache refresh from configured sources before refetching frontend data.
- FR-009: Frontend node-sync store/types/components/GraphQL operations must be removed when they have no callers.
- FR-010: Backend node-sync GraphQL resolvers/services/tests must be removed in the same change; no hidden or deprecated product sync API should remain.
- FR-011: Docs/localization/tests must remove product-facing node-sync language and describe packages/MCP import as the supported update/configuration flows.

## Acceptance Criteria

- AC-001: On the Agents page, no `Sync` button appears on any Agent card, including shared and featured agents.
- AC-002: On the Agent Teams page, no `Sync` button appears on any Team card, including shared and featured teams.
- AC-003: Settings → Nodes no longer shows bootstrap sync controls or a Run Full Sync section.
- AC-004: Adding a remote node no longer runs or offers bootstrap synchronization.
- AC-005: MCP JSON import/configuration/tool discovery flows still work and are documented as per-machine setup.
- AC-006: Package import/remove tests continue to verify dependent catalog refresh.
- AC-007: Agent and Agent Team list Reload behavior is validated against backend cache refresh expectations, especially for teams.
- AC-008: No frontend source references remain to removed node-sync store/helpers/components/mutation files.
- AC-009: GraphQL schema generation/tests have no `runNodeSync`, `exportSyncBundle`, or `importSyncBundle` product API.
- AC-010: Documentation no longer tells users to sync agents/teams/MCP between nodes; it points to package import/update for definitions and MCP explicit import/configuration for MCP servers.

## Constraints / Dependencies

- Node registration itself remains useful and must not be removed.
- MCP config often embeds local machine assumptions (`command`, `cwd`, `env`, filesystem paths, secrets). Treating it as synchronizable state is unsafe.
- Agent/team definitions are now file/package-backed. Product behavior should prefer package source refresh over state copy.
- Avoid backward-compatibility wrappers or hidden sync UI. If backend APIs remain temporarily, they must not be product-facing.

## Assumptions

- The product no longer needs to support database-era cross-node definition copy as a primary workflow.
- Users who want shared definitions can use a local path package, a GitHub package, or direct folder copy/Git update rather than node sync.
- A future package “Update/Pull latest” action, if needed, belongs under Agent Packages / Application Packages.
- A future “Export as package” action, if needed for UI-created local definitions, is separate from node sync and should produce explicit files/packages rather than synchronizing hidden state.

## Risks / Open Questions

- There may be a small power-user workflow for copying UI-created local app-data definitions to another node. Approved answer is future explicit export/package support if needed, not keeping node sync.
- Full backend sync removal may require updating generated GraphQL artifacts and tests across both frontend and backend.
- Backend removal may expose generated GraphQL or test dependencies that need cleanup in the same implementation pass.
- Managed GitHub package “pull latest” is not currently visible in the agent package UI; if users expect that, it should be a package feature.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases Covered |
| --- | --- |
| FR-001 | UC-001 |
| FR-002 | UC-002 |
| FR-003 | UC-001, UC-002 |
| FR-004 | UC-001, UC-002 |
| FR-005 | UC-003 |
| FR-006 | UC-004 |
| FR-007 | UC-005 |
| FR-008 | UC-005 |
| FR-009 | UC-006 |
| FR-010 | UC-006 |
| FR-011 | UC-004, UC-005, UC-006 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Verifies Agent list simplification. |
| AC-002 | Verifies Agent Team list simplification. |
| AC-003 | Verifies Settings → Nodes simplification. |
| AC-004 | Verifies remote node registration no longer implies state copy. |
| AC-005 | Verifies MCP remains configured explicitly per machine. |
| AC-006 | Verifies package-based definition distribution remains intact. |
| AC-007 | Verifies Reload owns current-source refresh, not Sync. |
| AC-008 | Verifies frontend sync decommission is clean. |
| AC-009 | Verifies backend sync removal is explicit and complete. |
| AC-010 | Verifies user guidance matches current architecture. |

## Approval Status

Approved by user on 2026-05-20. Scope: decommission synchronization itself as a product feature, not merely hide the Agent/Agent Team card buttons. Keep package import/update/reload and explicit MCP configuration/import/discovery as the supported mechanisms.
