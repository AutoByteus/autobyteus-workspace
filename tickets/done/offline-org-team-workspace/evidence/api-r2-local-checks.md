# API/E2E Round 2 Local Checks

Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace`  
HEAD: `66213bd539ed422d39d101bdd218d73760a4100f`  
Correction: `cb139904c68b65e3af9f6b07de0e8e5275ed8169`  
Prior API baseline source: `3a52e67ba72ee53497f5d9492f406289f23f28f3`

## Repository checks

All commands ran from the worktree root. Counts overlap and are not additive.

1. C09-R1 first, as required:
   ```sh
   pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts --run
   ```
   Result: exit 0; 1 file / 14 tests Pass; no reported unhandled error. Evidence: `api-r2-c09r1.log`.

2. Corrected Files/layout focus:
   ```sh
   pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts components/fileExplorer/__tests__/FileExplorer.spec.ts components/fileExplorer/__tests__/FileExplorerLayout.spec.ts components/fileExplorer/__tests__/FileExplorerTabs.spec.ts components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts components/layout/__tests__/RightSideTabs.spec.ts --run
   ```
   Result: exit 0; 6 files / 49 tests Pass; no reported unhandled error. Evidence: `api-r2-focused.log`.

3. Broader affected frontend set:
   ```sh
   pnpm -C autobyteus-web test:nuxt components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts components/layout/__tests__/RightSideTabs.spec.ts components/fileExplorer/__tests__/FileExplorerLayout.spec.ts components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts components/fileExplorer/__tests__/FileExplorer.spec.ts components/fileExplorer/__tests__/FileExplorerTabs.spec.ts services/runConfigEditing/__tests__ stores/__tests__/existingRunConfigStore.spec.ts stores/__tests__/agentOrgRunConfigPublication.spec.ts services/agentOrgExecution/__tests__/agentOrgRunConfigAdoption.spec.ts components/workspace/config/__tests__ components/workspace/org/__tests__/AgentOrgWorkspaceConfigBoundary.spec.ts components/workspace/team/__tests__/TeamCanonicalPlus.spec.ts --run
   ```
   Result: exit 0; 28 files / 275 tests Pass. Evidence: `api-r2-web.log`.

4. Shared declarations, server build and unchanged real-process HTTP/restart test:
   ```sh
   pnpm prepare:shared
   pnpm -C autobyteus-server-ts build
   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts --no-watch
   ```
   Result: every command exit 0; HTTP suite 1 file / 1 test Pass. Evidence: `api-r2-prepare.log`, `api-r2-build.log`, `api-r2-http.log`.

Full web `vue-tsc` was not rerun as a success claim. The unchanged baseline parser diagnostics in `AgentTeamLibraryPanel.vue:2` and `pages/agent-orgs.vue:2` remain the documented blocker.

## Real browser/API recovery

- Isolated backend/runtime/DB, public synthetic schema-v1 Org fixture and transparent HTTP/WebSocket proxy.
- Browser: Chrome `153.0.8010.53`; Nuxt `3.21.1`; Vue `3.5.28`; Node `v22.23.1`; pnpm `10.28.2`; macOS Darwin arm64.
- Proxy injected exactly one `workspaceMetadata` failure for unopened B and one for prior-mounted dirty B→D. It did not mutate client/store state.
- Both first recoveries passed after clearing only the fault and performing one canonical Edit Config read. No Activity/Files tab workaround, reload, pre-registration, Save replay, provider reset or draft clearing.
- Browser console errors: none in either recovered branch; no `Maximum recursive updates` in round-2 evidence.
- Final transport/disk audit: exactly 2 configuration saves, 2 controlled faults, 2 workspace creates and 2 deliberate writes. B and D received only their explicit writes; A and C remained unchanged.
- Evidence: `api-r2-browser-result.json`, `api-r2-unopened-unavailable.json`, `api-r2-unopened-recovered.json`, `api-r2-dirty-unavailable.json`, `api-r2-dirty-recovered.json`, `api-r2-requests.jsonl`, `api-r2-backend-resumed.log`.

An execution interruption killed the first owned services/tab. The same isolated database/runtime and fixture identity were resumed; no configuration Save or provider/session reset was replayed. This is disclosed, not presented as a fresh provider-continuity run.

## Cleanup

Owned Nuxt/proxy/backend processes stopped. Owned runtime, database, key and generated SDK `dist` directories are absent; owned ports are closed. User production AutoByteus PID 19026 / port 29695 remains running untouched. Active validation tab closed. One pre-interruption local tab was debugger-unattached; it was left unmarked and inert with all backing services stopped for browser-session automatic cleanup. No user tab was touched. Evidence: `api-r2-cleanup.json`.

No API-owned production or durable-test edit, commit, push, merge, release or deployment was performed in round 2.
