# IR-003 local correction checks — API-F001

Date 2026-09-22. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace`, branch `codex/offline-org-team-workspace`. Correction authorized by approved SR-002 / SR-005 / ARCH-REV-003. This is implementation-scoped evidence, not independent API/E2E or source-review acceptance. Copied logs retain diagnostics; trailing whitespace/empty lines normalized.

## Correction and scope
- Only changed production file: `autobyteus-web/components/fileExplorer/FileExplorer.vue`; 16 added / 2 removed lines, 331 effective nonempty lines (373 physical), below 500. No >220 delta trigger.
- Activation now watches separately compared primitives: effective ID, metadata presence, registration root, explicit registered ID and active state. Equivalent descriptor replacements no longer schedule another activation; metadata arriving at the same explicit ID still activates.
- Current attempt clears prior error/loading before registered/no-metadata fast paths. Inactive cleanup also clears obsolete error. Pending activation names its requested target instead of keeping a prior registered ID while waiting. Existing sequence guards continue to reject stale success/error/finally publication after target/inactive/unmount changes.
- Live session watcher compares registered ID/active state independently, so equivalent workspace object replacement does not release/reacquire a lease. Existing consumer ID, registry action/task deduplication, search/listener cleanup and null layout gate remain.
- `implementation-ir003-source-scope.json` fingerprints the seven protected production owners unchanged from IR-001, records no tracked server source/test change and the current allowed source/test delta. Metadata actions, global getters, composable, FileExplorerTabs, layout, RightSideTabs and Org facade unchanged.

## Regression changes
1. API-owned `components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts`: original C09-R1 delayed real reactive registration test retained, first run against corrected source **1/1 Pass** (`implementation-ir003-c09r1-initial.log`). Expanded locally to **14 tests**. Only external transport/file-stream I/O substituted; metadata/ensure/registration and Vue/Pinia remain real. Added same-ID metadata arrival, equivalent cache/workspace replacement with no activation/lease churn, registered/no-metadata fast paths, rejection + existing Retry, stale success/rejection across new registered or missing/pending targets, inactive/unmount completions, and lease handover during pending activation. Captured component errors must be empty; Vitest reports no unhandled rejection. Console interception is limited to expected transport failure logging in rejection tests, not recursion suppression.
2. `components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts`: both cases retain actual RightSideTabs/layout/tree/tabs, real workspace metadata resolver/cache/registration and draft/History/context owners. Removed `register('B')`; metadata failure is now injected at query transport. First canonical read resolves only metadata, then a deferred CreateWorkspace response registers B through the real action. Assertions require Loading while pending, one registration, no repeated config Save, first-pass usable B tree/file operation, no captured component errors, retained A/conversation/state/attachments/composer. Previously mounted C editor has a real unsaved content update before unmount; no stale write is emitted. Null gate, prior cleanup, tab switching/Cmd+Ctrl+S and omitted-A control preserved. External editor renderer/tree stream/file transport remain substituted; this is not a real filesystem/HTTP/browser E2E run.

## Commands and final results
All commands from worktree unless noted.

```sh
pnpm -C autobyteus-web test:nuxt \
  components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts \
  components/fileExplorer/__tests__/FileExplorer.spec.ts \
  components/fileExplorer/__tests__/FileExplorerLayout.spec.ts \
  components/fileExplorer/__tests__/FileExplorerTabs.spec.ts \
  components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts \
  components/layout/__tests__/RightSideTabs.spec.ts --run
```
**Exit 0, 6 files / 49 tests.** `implementation-ir003-focused.log`. No failed test/unhandled error.

```sh
pnpm -C autobyteus-web test:nuxt \
  components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts \
  components/layout/__tests__/RightSideTabs.spec.ts \
  components/fileExplorer/__tests__/FileExplorerLayout.spec.ts \
  components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts \
  components/fileExplorer/__tests__/FileExplorer.spec.ts \
  components/fileExplorer/__tests__/FileExplorerTabs.spec.ts \
  services/runConfigEditing/__tests__ \
  stores/__tests__/existingRunConfigStore.spec.ts \
  stores/__tests__/agentOrgRunConfigPublication.spec.ts \
  services/agentOrgExecution/__tests__/agentOrgRunConfigAdoption.spec.ts \
  components/workspace/config/__tests__ \
  components/workspace/org/__tests__/AgentOrgWorkspaceConfigBoundary.spec.ts \
  components/workspace/team/__tests__/TeamCanonicalPlus.spec.ts --run
```
**Exit 0, 28 files / 275 tests.** `implementation-ir003-web-tests.log`. This includes the focused 49 tests; counts are overlapping invocations, not additive. Existing harness warnings remain in logs.

```sh
pnpm -C autobyteus-application-sdk-contracts build
pnpm -C autobyteus-web build
```
**Both exit 0**, web 16 prerendered routes. `implementation-ir003-contracts-build.log`, `implementation-ir003-web-build.log`. Initial web build failed because the previously cleaned generated contracts `dist` was absent; building that existing package resolved it. No package/lockfile edit. Generated contracts output removed again after checks, not committed. Temporary browser preview page removed before final build.

```sh
cd autobyteus-web
pnpm --package typescript@5.9.3 --package vue-tsc@3.0.8 dlx vue-tsc --noEmit
```
**Exit 2 / Blocked**, `implementation-ir003-web-typecheck.log`: unchanged baseline parser diagnostics in `components/agentTeams/form/AgentTeamLibraryPanel.vue(2,304)` and `pages/agent-orgs.vue(2,103)`. These files have no source delta. No full frontend typecheck Pass claimed.

`git diff --check` / explicit staged correction check: Pass. No server/API/provider tests rerun in this local correction; their prior evidence stays attributed.

## Rendered self-inspection
- Normal project Nuxt dev renderer, own Chrome tab at `http://localhost:3117/implementation-preview`, temporary page copied from retained `implementation-ir003-preview.vue`.
- Actual FileExplorerLayout/FileExplorer/FileExplorerTabs/FileViewer/Monaco and reactive workspace ensure/registration used. Only external Apollo transport and live-tree I/O replaced in the disclosed synthetic fixture; no backend/provider/project I/O.
- Approx. 1512×828 desktop: started explicit null/unavailable, recovered metadata-only B, observed Loading with exactly one request/zero leases, completed pending registration without toggling/remount, observed B tree/one lease/no Loading, clicked B.txt and inspected actual editor rendering with synthetic text and one file read.
- Switched to metadata-only C: B lease released, Loading; rejected registration: Loading cleared and Retry appeared; clicked normal Retry: one new request, completed C → C tree/one lease/no error. Set unavailable: both consumers gone/zero leases. Recovered already-registered B: no new registration, retained B open file shown. Controls/spacing/focus and existing tree/editor visual hierarchy remained coherent; no new visual defect observed.
- Direct screenshot and AX states observed via browser tool; no saved screenshot file claimed. No mobile/responsive rerun or real Save/reopen backend journey in this round. Full C09 browser rerun still belongs to API/E2E.
- Own tab closed and own Nuxt process stopped; temporary product page removed. Preview artifact remains ticket evidence, not an application route. No user app/provider/session disturbed.

## Downstream
API-F001 is **corrected in implementation/local evidence, pending independent source review and API/E2E closure**. CRR-002 and API-REV-001 Fail remain the latest independent results until their owners update them. API C09/C09-R1 first recovery for both variants required after source re-review; no forced remount/tab toggle, Save replay, draft clearing or provider reset. API-REV-001 sampled positive real provider/core-browser/HTTP/task evidence remains attributed and carried. Base typecheck blocker and unexecuted actual native picker remain. No Delivery advancement.
