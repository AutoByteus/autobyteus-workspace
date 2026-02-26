# Implementation Progress (Iteration v3)

## Legend
- File Status: `Pending`, `In Progress`, `Blocked`, `Completed`, `N/A`
- Unit/Integration Test Status: `Not Started`, `In Progress`, `Passed`, `Failed`, `Blocked`, `N/A`
- Design Follow-Up: `Not Needed`, `Needed`, `In Progress`, `Updated`

## Progress Log
- 2026-02-08: Created UI-first frontend design doc for multi-node entry and user journey (`MULTI_NODE_V4_UI_FIRST_DESIGN.md`) after inspecting current shell/navigation/workspace layouts.
- 2026-02-08: Created initial v1 artifacts.
- 2026-02-08: Iteration v2 completed after first runtime inspection.
- 2026-02-08: Iteration v3 completed after second runtime inspection (cache/path/lifecycle/order smells addressed in design).

## Scope Change Log

| Date | Previous Scope | New Scope | Trigger | Required Action |
| --- | --- | --- | --- | --- |
| 2026-02-08 | Large (v2 refined) | Large (v3 refined) | second call-stack inspection and boundary audit | Added cache hygiene, path guard, and plugin lifecycle-order work items. |

## File-Level Progress Table

| File | Depends On | File Status | Unit Test Status | Integration Test Status | Cross-Reference Smell | Design Follow-Up | Last Verified | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/types/node.ts` | N/A | Pending | Not Started | N/A | None | Not Needed | 2026-02-08 | Node contracts. |
| `/Users/normy/autobyteus_org/autobyteus-web/utils/nodeEndpoints.ts` | `types/node.ts` | Pending | Not Started | N/A | None | Not Needed | 2026-02-08 | Endpoint derivation. |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts` | node types/utils | Pending | Not Started | Not Started | switch hooks touch multiple stores | Updated | 2026-02-08 | Add `registerNodeSwitchHook` and two-phase switch. |
| `/Users/normy/autobyteus_org/autobyteus-web/plugins/10.embeddedServerBootstrap.client.ts` | serverStore | Pending | Not Started | Not Started | plugin rename/order | Updated | 2026-02-08 | Deterministic embedded bootstrap. |
| `/Users/normy/autobyteus_org/autobyteus-web/plugins/20.nodeBootstrap.client.ts` | nodeStore | Pending | Not Started | Not Started | plugin rename/order | Updated | 2026-02-08 | Deterministic node bootstrap. |
| `/Users/normy/autobyteus_org/autobyteus-web/plugins/30.apollo.client.ts` | nodeStore | Pending | Not Started | Not Started | lifecycle ownership centralization | Updated | 2026-02-08 | Own client rebuild + error link. |
| `/Users/normy/autobyteus_org/autobyteus-web/plugins/apolloErrorLink.client.ts` | apollo plugin | Pending | Not Started | N/A | split lifecycle ownership | Updated | 2026-02-08 | Decommission or fold into `30.apollo.client.ts`. |
| `/Users/normy/autobyteus_org/autobyteus-web/utils/apolloClient.ts` | Apollo plugin | Pending | Not Started | Not Started | still Nuxt Apollo-aware today | Updated | 2026-02-08 | Remove `$apollo`/`useApolloClient` dependency. |
| `/Users/normy/autobyteus_org/autobyteus-web/nuxt.config.ts` | Apollo architecture | Pending | Not Started | Not Started | None | Not Needed | 2026-02-08 | Remove `@nuxtjs/apollo` module/config. |
| `/Users/normy/autobyteus_org/autobyteus-web/codegen.ts` | Apollo architecture | Pending | Not Started | Not Started | None | Not Needed | 2026-02-08 | Remove vue-apollo composable generation. |
| `/Users/normy/autobyteus_org/autobyteus-web/app.vue` | nodeStore + serverStore | Pending | Not Started | Not Started | readiness coupling | Updated | 2026-02-08 | Readiness by active node runtime, not embedded status. |
| `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerLoading.vue` | nodeStore + serverStore | Pending | Not Started | Not Started | overlay scope mismatch | Updated | 2026-02-08 | Overlay only when active node is embedded. |
| `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerShutdown.vue` | nodeStore + serverStore | Pending | Not Started | Not Started | overlay scope mismatch | Updated | 2026-02-08 | Same as loading overlay. |
| `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerMonitor.vue` | nodeStore + serverStore | Pending | Not Started | Not Started | mixed status semantics | Updated | 2026-02-08 | Distinguish embedded process status and active node status. |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue` | node/server stores | Pending | Not Started | Not Started | server-status default leak | Updated | 2026-02-08 | Don’t force server status section on remote active node. |
| `/Users/normy/autobyteus_org/autobyteus-web/services/api.ts` | nodeStore | Pending | Not Started | Not Started | stale singleton base URL | Updated | 2026-02-08 | Resolve base URL per request from active node. |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/agentDefinitionStore.ts` | nodeStore + apollo | Pending | Not Started | Not Started | embedded readiness dependency | Updated | 2026-02-08 | Replace `waitForServerReady`. |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/agentTeamDefinitionStore.ts` | nodeStore + apollo | Pending | Not Started | Not Started | embedded readiness dependency | Updated | 2026-02-08 | Replace `waitForServerReady`. |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/workspace.ts` | nodeStore + apollo | Pending | Not Started | Not Started | embedded readiness + static ws endpoint | Updated | 2026-02-08 | Use active node readiness and ws endpoint. |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/agentRunStore.ts` | nodeStore + apollo | Pending | Not Started | Not Started | static ws endpoint + switch teardown | Updated | 2026-02-08 | Active endpoint + switch hook cleanup. |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/agentTeamRunStore.ts` | nodeStore + apollo | Pending | Not Started | Not Started | static ws endpoint + switch teardown | Updated | 2026-02-08 | Active endpoint + switch hook cleanup. |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/applicationRunStore.ts` | nodeStore + apollo | Pending | Not Started | Not Started | static ws endpoint + switch teardown | Updated | 2026-02-08 | Active endpoint + switch hook cleanup. |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/fileExplorer.ts` | nodeStore | Pending | Not Started | Not Started | absolute path local-file branch ignores nodeType | Updated | 2026-02-08 | Local absolute path branch must require embedded node type. |
| `/Users/normy/autobyteus_org/autobyteus-web/composables/useTerminalSession.ts` | nodeStore | Pending | Not Started | Not Started | static terminal ws endpoint | Updated | 2026-02-08 | Resolve terminal ws from active node endpoints. |
| `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | nodeStore | Pending | Not Started | Not Started | `getServerUrls()` usage | Updated | 2026-02-08 | Active REST endpoint usage. |
| `/Users/normy/autobyteus_org/autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue` | nodeStore | Pending | Not Started | Not Started | `getServerUrls()` usage | Updated | 2026-02-08 | Active REST endpoint usage. |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/NodeManager.vue` | nodeStore | Pending | Not Started | Not Started | None | Not Needed | 2026-02-08 | Node CRUD/select UI. |
| `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | nodeStore | Pending | Not Started | Not Started | None | Not Needed | 2026-02-08 | nodeType-specific path UX. |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/agentArtifactsStore.ts` | Apollo migration | Pending | Not Started | Not Started | generated lazy vue-apollo query dependency | Updated | 2026-02-08 | Replace `useGetAgentArtifactsLazyQuery` with explicit client query. |

## Blocked Items

| File/Area | Blocked By | Unblock Condition | Owner/Next Action |
| --- | --- | --- | --- |
| Stream-owning stores | Node switch lifecycle API | `nodeStore.registerNodeSwitchHook` available | implement nodeStore switch API first |
| Apollo-dependent stores | Apollo runtime migration | `30.apollo.client.ts` + accessor complete | migrate GraphQL callers after apollo runtime base |
| Plugin boot paths | plugin rename/order migration | plugin file rename committed and loaded in intended order | validate startup order integration test |

## Design Feedback Loop Log

| Date | Trigger File(s) | Smell Description | Design Section Updated | Update Status |
| --- | --- | --- | --- | --- |
| 2026-02-08 | `app.vue`, `ServerLoading.vue` | embedded status blocked remote-mode readiness | Architecture Overview | Updated |
| 2026-02-08 | `services/api.ts`, endpoint callers | stale/static endpoint routing | Dependency Rules | Updated |
| 2026-02-08 | `fileExplorer.ts` | local absolute path branch not nodeType-aware | Error Handling + Use Case 4 | Updated |
| 2026-02-08 | `apolloErrorLink.client.ts` + Apollo rebuild path | split lifecycle ownership | File Breakdown + Use Case 3/5 | Updated |
| 2026-02-08 | plugin set (`serverStore.ts` and planned node/apollo bootstraps) | startup order ambiguity | Migration / Rollout | Updated |
