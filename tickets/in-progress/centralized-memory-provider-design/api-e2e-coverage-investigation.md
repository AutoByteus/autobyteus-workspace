# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/centralized-memory-provider-design/tickets/in-progress/centralized-memory-provider-design/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/centralized-memory-provider-design/tickets/in-progress/centralized-memory-provider-design/investigation.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/centralized-memory-provider-design/tickets/in-progress/centralized-memory-provider-design/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/centralized-memory-provider-design/tickets/in-progress/centralized-memory-provider-design/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/centralized-memory-provider-design/tickets/in-progress/centralized-memory-provider-design/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/centralized-memory-provider-design/tickets/in-progress/centralized-memory-provider-design/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review round 2 passed and requested API/E2E coverage investigation and execution for the Memory Sync / embedded Memory Hub implementation.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The reviewed scope adds Memory Sync and embedded Memory Hub behavior to `autobyteus-server-ts` while preserving existing local runtime memory paths. The API/E2E validation basis is:

- Local runtime memory remains under `memory/agents` and `memory/agent_teams`; no runtime writer/provider rewrite and no `memory/local` migration.
- Memory Hub stores imports under `memory/imports/<sourceNodeId>/` with `source-node.json`, `sync-manifest.json`, `agents/`, and `agent_teams/`.
- Stable filesystem-safe `sourceNodeId` is the import identity; endpoint/base URL is metadata only.
- Source sync scans local `agents` and `agent_teams`, excludes unsafe/temp/sync/import content, plans full-file `replace` operations, and advances source state only after hub acceptance.
- Hub REST ingestion under `/rest/memory-sync/v1/health` and `/rest/memory-sync/v1/batches` authenticates with backend-generated source tokens, binds/validates token against `sourceNodeId`, rejects unsafe paths/kinds, atomically writes replacements, updates manifest after writes, and treats true duplicate batch retries as success/no-op.
- GraphQL owns UI-facing hub/source config, URL candidates, credential creation/regeneration/revocation, connection test, manual sync, status, and import listing. Public config/status must not echo plaintext source hub tokens.
- Memory Explorer/View GraphQL accepts explicit `LOCAL` or `IMPORTED/sourceNodeId` scope. Omitted scope defaults to Local Memory. Imported memory is read-only corpus data and must not be mixed into local runnable history.
- Frontend Nodes page uses one `Memory Sync` tab in the node-bound context; frontend `NodeProfile` id/name remain navigation/display metadata and are not durable import identity.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Memory Hub REST health and batch ingestion | Added | FR-002, FR-007, FR-016, FR-045, FR-050, FR-051; AC-002, AC-025, AC-030, AC-032, AC-035 | Add durable API/E2E coverage for authenticated health, token/source binding, batch commit, duplicate retry, path rejection, and filesystem import evidence. |
| GraphQL Memory Sync config/status/credentials/manual sync | Added | FR-012, FR-018, FR-032 through FR-048; AC-011, AC-016 through AC-027 | Add durable GraphQL/API coverage for hub enablement, one-time token creation, source config redaction, connection test, and `startMemorySync`. |
| Source-to-hub manual sync scan/plan/push | Added | DS-001, FR-010 through FR-016, FR-059; AC-003, AC-005, AC-006, AC-007 | Add durable end-to-end executable coverage using a real Fastify hub route and GraphQL trigger; assert `agents` and `agent_teams` imported files and source state. |
| Source state, secret redaction, hub idempotency locking, run gate fixes | Changed | Implementation handoff local fixes CR-001 through CR-004; code review report round 2 | Existing local-fix regression test remains valid and must run as part of final execution. |
| Memory Explorer source selector/default/imported scope | Changed | FR-022 through FR-031; AC-010, AC-013 through AC-015, AC-028, AC-029 | Existing local Memory Explorer/View E2E tests remain valid for default local behavior; add durable imported-source GraphQL coverage and frontend store variable/selection coverage. |
| Nodes page Memory Sync setup tab | Added | FR-038, FR-041; AC-020, AC-022 | Add/update frontend component coverage for the primary `Memory Sync` tab and avoid a separate row-level setup action. |
| Existing local memory behavior with Memory Sync disabled/omitted source | Preserved | FR-001, AC-001, AC-028; design legacy rejection log | Keep existing memory explorer/view tests and run focused regression commands; no stale removal. |
| Imported memory as read-only/non-runnable corpus | Added/Preserved constraint | FR-019, FR-020, FR-026; AC-010, AC-012, AC-015 | Cover source-scoped imported reads and UI/store read-only source metadata; no restore/continue/delete/archive coverage should be added for imports. |
| Runtime memory-provider refactor, `memory/local`, compatibility wrappers | Removed/rejected | Out-of-scope list; design spec Legacy Removal Policy; implementation handoff Legacy / Compatibility Removal Check | Do not add compatibility coverage. Any compatibility wrapper discovered would reroute; none found in static investigation. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/memory/memory-explorer-graphql.e2e.test.ts` | Existing GraphQL BFF lists local agents and selected-agent runs from local memory. | FR-001, FR-020, FR-022/FR-023 default local behavior; AC-001, AC-028 | Still Valid | Query source is optional and resolver resolves omitted source to `LOCAL`; test continues to prove local default. | Retain and run focused e2e. Add separate imported-source coverage rather than rewriting this test. |
| `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` | Existing GraphQL BFF returns local memory view with working context and raw traces. | FR-001, FR-031 local detail default; AC-001, AC-028 | Still Valid | `getAgentRunMemoryView` accepts optional source and defaults to local; local memory view behavior is intentionally preserved. | Retain and run focused e2e. Add imported detail coverage. |
| `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-explorer-service.test.ts` | Local agent memory explorer service behavior. | FR-001, AC-001 | Still Valid | Source-aware GraphQL wraps this service; service remains the local listing owner. | Retain; not required as final API/E2E command unless time permits. |
| `autobyteus-server-ts/tests/unit/agent-memory/team-memory-explorer-service.test.ts` | Local team memory explorer behavior. | FR-001, FR-010 team memory shape; AC-001, AC-005 | Still Valid | Agent-team mirror keeps existing relative layout; service remains local/imported reader implementation when rooted at selected source. | Retain; covered indirectly by new imported file assertions and existing service tests. |
| `autobyteus-server-ts/tests/unit/api/graphql/types/memory-explorer-types.test.ts` | GraphQL memory explorer type behavior. | FR-022/FR-023 | Still Valid | Existing type coverage is not obsolete; source input additions need API/E2E proof. | Retain. |
| `autobyteus-server-ts/tests/unit/api/graphql/types/memory-view-types.test.ts` | GraphQL memory view type behavior. | FR-031 | Still Valid | Existing view type coverage remains valid with optional source additions. | Retain. |
| `autobyteus-server-ts/tests/unit/api/graphql/converters/memory-view-converter.test.ts` | Memory view converter data shape. | FR-031 | Still Valid | Converter not made source-specific; source selection happens before converter. | Retain. |
| `autobyteus-server-ts/tests/unit/memory-sync/memory-sync-local-fixes.test.ts` | Regression coverage for CR-001 source state identity, CR-002 source token redaction, CR-003 commit/idempotency locking, CR-004 source run gate. | FR-005, FR-014/FR-016, FR-045/FR-047, FR-053/FR-059; AC-007, AC-025, AC-030, AC-037 | Still Valid | Code review round 2 passed these tests and found them directly tied to current behavior. | Retain and run in final execution. |
| `autobyteus-web/tests/stores/memoryExplorerStore.test.ts` | Existing Pinia store fetches local memory explorer data and handles errors. | FR-022/FR-030, AC-028/AC-029 | Needs Update | Store now owns `selectedSource`, `listMemoryExplorerSources`, and sends source variables. Existing tests do not assert source propagation or invalid fallback. | Update durable frontend store test with imported source loading/selection/source variable coverage. |
| `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` | Existing Nodes page tab/navigation behaviors and no obsolete pairing/full-sync surfaces. | FR-038, FR-041; AC-020, AC-022 | Needs Update | Node Manager now has a Memory Sync tab. Existing tests cover manage/phone/docker tabs but not the new setup entry. | Update durable component test to assert Memory Sync tab/panel entry and mock `MemorySyncCard`. |
| `autobyteus-web/components/settings/MemorySyncCard.vue` | New UI for hub/source config, credentials, connection test, sync now, imported summaries. | FR-032 through FR-048; AC-016 through AC-027 | Replace / Add Coverage Needed | No repository-resident test exists for the new card/store behavior. Full component coverage is larger than necessary for this stage; GraphQL/store tests cover the important boundaries. | Do not add broad component internals now; cover entry via NodeManager and API/store boundaries. |
| `autobyteus-server-ts/src/api/rest/memory-sync.ts` | New REST route for health/batches. | FR-045/FR-050/FR-051; AC-025, AC-030, AC-032, AC-035 | Add Durable Coverage | No existing REST API test exercises the new public endpoints. | Add backend API/E2E test. |
| `autobyteus-server-ts/src/api/graphql/types/memory-sync.ts` | New GraphQL resolver for Memory Sync status/config/credentials/test/manual sync. | FR-012, FR-018, FR-032 through FR-048 | Add Durable Coverage | No existing GraphQL API test exercises the new resolver. | Add backend API/E2E test. |
| `autobyteus-server-ts/src/agent-memory/services/memory-explorer-source-service.ts` plus modified memory explorer/view resolvers | Local/imported source option listing and source-scoped read root. | FR-022 through FR-031; AC-013 through AC-015, AC-028, AC-029 | Add Durable Coverage | Existing local e2e tests do not prove imported source selection. | Add backend API/E2E imported-source list/detail coverage. |
| `autobyteus-server-ts/src/server-addressing/` and `remote-access/services/address-candidate-service.ts` | Generic URL candidate owner while preserving remote-access candidate facade. | FR-042/FR-043/FR-048/FR-049; AC-023/AC-027 | Add Durable Coverage (focused) | Existing remote-access tests cover running routes, not Memory Hub URL candidate GraphQL. | Include GraphQL URL candidate assertion in backend API/E2E. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | N/A | No relevant durable test currently asserts removed runtime-provider, `memory/local`, raw-trace-only sync, imported-local-history mixing, or row-level Memory Sync setup behavior. | Requirements Out of Scope and design Backward-Compatibility Rejection Log. | N/A | No removals required. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| MS-API-001 | Enable hub through GraphQL, receive one-time backend-generated token, save source config without public token echo, test connection through real REST health. | FR-032 through FR-048; AC-023 through AC-027; DS-009/DS-012/DS-013 | `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | This is the user-facing setup path and secret boundary; existing unit tests do not exercise GraphQL + real REST health together. |
| MS-API-002 | GraphQL `startMemorySync` scans local `agents` and `agent_teams`, pushes to a running hub REST route, and writes files/manifests under `memory/imports/<sourceNodeId>/`. | FR-007 through FR-016, FR-050/FR-051/FR-059; AC-002 through AC-007, AC-030/AC-035 | `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | This proves the primary source-to-hub spine through public GraphQL/REST surfaces and real filesystem evidence. |
| MS-API-003 | REST retry of the same batch id/content is duplicate success; same source token cannot impersonate another source; unsafe relative path is rejected. | FR-016, FR-045, FR-051; AC-025, AC-030, AC-032, AC-035 | `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | Public endpoint idempotency, credential binding, and path safety need API-level coverage beyond store/unit tests. |
| MS-API-004 | Memory Explorer GraphQL lists Local plus imported source, default local does not show imported-only run, imported source lists and reads imported-only run detail. | FR-020, FR-022 through FR-031; AC-010, AC-013 through AC-015, AC-028/AC-029 | `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | Source-aware imported browsing is a new API boundary and must not depend on UI-only assumptions. |
| MS-FE-001 | Frontend memory explorer store loads imported source options, selects imported source, resets source-bound pages, and sends the selected source variable in BFF calls. | FR-022/FR-030; AC-028/AC-029 | `autobyteus-web/tests/stores/memoryExplorerStore.test.ts` | Store source propagation is the durable frontend behavior behind route/detail/back flows. |
| MS-FE-002 | Node Manager exposes the Memory Sync tab as the setup entry for the current bound node. | FR-038/FR-041; AC-020/AC-022 | `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` | Ensures the approved setup surface exists without adding a broad new UI test harness. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| MS-FE-001 | `autobyteus-web/tests/stores/memoryExplorerStore.test.ts` | Assert source variables and imported source selection/fallback. | FR-022/FR-030; AC-028/AC-029 | Narrow update to existing store test. |
| MS-FE-002 | `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` | Mock `MemorySyncCard` and assert Memory Sync tab/panel entry. | FR-038/FR-041; AC-020/AC-022 | Narrow update to existing NodeManager tab test. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | No stale durable coverage found. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| MS-TEMP-001 | Focused build/typecheck command: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`. | Backend source compiles with new API/E2E coverage and implementation state. | Build command is execution evidence, not a repository test artifact. |
| MS-TEMP-002 | Focused frontend test commands for updated store and NodeManager specs. | Frontend source propagation and tab entry coverage passes. | Commands are evidence; tests themselves remain durable. |
| MS-TEMP-003 | Optional filtered web `nuxi typecheck` only if practical; implementation handoff records baseline unrelated failures. | Changed frontend files do not introduce changed-file type failures if command can be interpreted. | Existing baseline type errors make this a non-authoritative project-wide gate. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full browser/Electron click-through of Memory Sync tab and Memory page route/back/inspector transitions | Existing task setup does not have a running Nuxt/Electron app and browser fixture; store/component/API coverage exercises the durable boundaries. | Visual regressions could remain despite API/store correctness. | Delivery/docs can note no full browser E2E was run; add future UI E2E harness if the project establishes one. |
| Background worker repeated interval while runtime actively appends traces | Existing local-fix test covers run gate; API/E2E will cover manual scan/push and REST import. A deterministic long-running append/worker timing test would be brittle here. | Interval/live-file race behavior may need future stress coverage. | No reroute; accepted V1 residual risk. Unit/service coverage can be expanded later if failures appear. |
| Kubernetes/Docker real network topology (`host.docker.internal`, Service/Ingress) | Not reproducible in this local API/E2E stage. URL candidate and source-side connection test are covered with loopback. | Deployment-specific reachability still depends on user configuration. | Delivery documentation should record advertised URL/test connection guidance. |
| Native Codex/Claude restore absence | Upstream investigation and design make imported memory non-runnable; implementation exposes imported source through Memory Explorer only. No restore action was found in changed API/UI path. | A future UI could accidentally add runtime actions. | No current test beyond read-only/source scope; delivery docs should retain imported-not-runnable semantics. |
| Delete propagation | Explicitly out of scope/deferred. | Hub corpus may retain source-deleted files. | No validation required now; future requirement needed. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time | N/A | Upstream artifacts and code review are aligned; implementation handoff Legacy / Compatibility Removal Check is clean and no compatibility wrapper/dual path was found in static inspection. | N/A |

## Execution Plan

1. Add backend durable API/E2E test `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` for scenarios MS-API-001 through MS-API-004 using a temp app-data directory, initialized public URL config, in-process GraphQL schema, and a real Fastify REST hub route listening on loopback.
2. Update `autobyteus-web/tests/stores/memoryExplorerStore.test.ts` for selected source loading/propagation.
3. Update `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` for Memory Sync tab entry, mocking `MemorySyncCard` to keep the test focused.
4. Run focused backend coverage: new memory-sync API/E2E test, existing memory explorer/view e2e tests, and existing memory-sync local-fix regression test.
5. Run backend source build check `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.
6. Run focused frontend durable coverage tests for memory explorer store and NodeManager.
7. If any new evidence changes validity decisions, update this investigation before changing/removing coverage or rerouting.
8. Because repository-resident durable coverage will be added/updated after code review, write the execution coverage report and route the cumulative package back to `code_reviewer` for narrow coverage-code review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing local coverage remains valid but is insufficient for the new public Memory Sync GraphQL/REST and imported-source browsing boundaries. Durable coverage additions/updates are required, so successful execution will return through `code_reviewer` rather than going directly to delivery.
