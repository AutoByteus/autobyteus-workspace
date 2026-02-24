# Proposed Design

## Design Version
- Current Version: `v15`

## Revision History
| Version | Summary |
| --- | --- |
| v1 | Initial target-state proposal for team-scoped member memory. |
| v2 | Added full use-case coverage matrix, closed blocking design decisions, and aligned runtime call stack contracts with requirements. |
| v3 | Deep-review update: added missing use cases (append writes, distributed nested 3-node path, workspace-binding persistence), and corrected separation-of-concerns by removing team-member layout ownership from manifest store. |
| v4 | Deep-review update: added explicit mixed-placement distributed case (local + remote members in one team), and added core-stack feasibility constraints for `hostNodeId` persistence, nested remote resolution, and canonical `memoryDir` wiring. |
| v5 | Deep-review update: added host-manifest-only distributed case (all members remote) and explicit route-key-level placement requirements so nested distributed ownership is resolved from flattened leaf bindings rather than shallow definition scans. |
| v6 | Deep-review update: expanded delete/remove architecture with distributed cleanup matrix coverage (mixed placement, host-manifest-only, nested multi-node), retry/idempotency lifecycle rules, and explicit remote cleanup command path design. |
| v7 | Deep-review update: corrected delete transport architecture to `teamId`-scoped cleanup RPC (decoupled from runtime team envelopes), added distributed inactive-precondition guard, and closed missing use-case traceability gaps. |
| v8 | Deep-review update: added explicit host `teamId` propagation and worker run-binding identity requirements so distributed inactive-preflight/cleanup guards remain precise across reruns and shared-definition lineages. |
| v9 | Re-investigation update: added distributed member-definition identity resolution policy for cross-node local-ID mismatch (`referenceId` present on worker but missing on host), with remote-proxy-safe host hydration requirements and test coverage mapping. |
| v10 | Workspace portability update: enforce remote-member `workspaceRootPath` requirement and home-node fallback from stale `workspaceId` to `workspaceRootPath` for distributed reliability. |
| v11 | Naming clarity update: switch generated team-member IDs from opaque `member_<hash>` to readable deterministic `<route_slug>_<hash16>` and validate with unit + E2E coverage. |
| v12 | Team-folder readability update: generate `teamId` as `<team_name_slug>_<id8>` (immutable after creation), aligned with operator-visible memory layout and distributed identity safety. |
| v13 | Added explicit role semantics (`registry` vs `host` vs `member home node`) and runtime data-flow diagrams for mixed distributed create, workspace binding, continuation/restore, and nested route flattening. |
| v14 | Core-memory contract cleanup: explicit `memoryDir` is authoritative leaf memory path; removed team-identity-driven layout branching from runtime factory design. |
| v15 | Worker bootstrap correctness update: skip non-local coordinator initialization to prevent foreign-member materialization on worker nodes; add per-member `run_manifest.json` persistence for node-local bindings on host and worker paths. |

## Summary
Align runtime persistence with canonical team-scoped memory layout:
1. Team manifest remains at `memory/agent_teams/<teamId>/team_run_manifest.json`.
2. Team-member durable artifacts live at `memory/agent_teams/<teamId>/<memberAgentId>/...`.
3. `memory/agents/<agentId>/...` remains single-agent-only.

Identity contract remains unchanged:
- `agentId` for single-agent runs,
- `teamId` for team runs,
- `memberAgentId` for team members,
- `memberRouteKey` for nested routing.

## Role Semantics
1. `registry node`: discovery-directory role only; not automatically runtime host.
2. `host node`: node that owns active team runtime orchestration for a given `teamId`.
3. `member home node`: owner/executor node for one member route; persisted as `memberBindings[].hostNodeId`.
4. `local node`: current backend process (`AUTOBYTEUS_NODE_ID`) evaluating runtime decisions.

## Runtime Data-Flow Diagrams

### Team create (mixed local + remote members)

```mermaid
flowchart LR
  UI["UI create/send request"] --> RES["Resolver builds member configs"]
  RES --> PLACE["Resolve hostNodeId by flattened memberRouteKey"]
  PLACE --> CFG["Set memberAgentId + memoryDir + workspaceRootPath"]
  CFG --> HOST["Host createTeamInstanceWithId(teamId, defId, configs)"]
  HOST --> MANI["Write manifest bindings under agent_teams/teamId"]
  HOST --> BOOT["Bootstrap worker-owned members"]
  BOOT --> WORK["Worker createTeamInstanceWithId(teamId, defId, bindings)"]
```

### Workspace binding behavior

```mermaid
flowchart TD
  IN["member config"] --> Q{"member home node is local?"}
  Q -->|Yes| L["Resolve workspaceId or fallback ensureWorkspaceByRootPath(workspaceRootPath)"]
  Q -->|No| R["Do not bind local Workspace object on this node"]
  L --> B["Bind Workspace object for local runtime member"]
  R --> P["Pass workspaceRootPath for member home-node hydration"]
```

### Continuation/restore behavior

```mermaid
flowchart LR
  H["Load resume manifest"] --> MB["Iterate memberBindings"]
  MB --> LOC{"hostNodeId local?"}
  LOC -->|Yes| E["Ensure workspace by workspaceRootPath; set workspaceId"]
  LOC -->|No| N["workspaceId stays null on this node; keep workspaceRootPath"]
  E --> C["createTeamInstanceWithId(...)"]
  N --> C
  C --> D["Dispatch via local route or distributed envelope by binding owner"]
```

### Nested distributed ownership

```mermaid
flowchart LR
  TREE["Nested team definition"] --> LEAF["Flatten leaf memberRouteKey map"]
  LEAF --> OWN["Resolve hostNodeId per leaf route"]
  OWN --> M["Persist route-level manifest bindings"]
  M --> USE["Create/restore/projection/delete all read same binding map"]
```

### Delete/cleanup across nodes

```mermaid
flowchart LR
  DEL["Delete request: teamId"] --> PRE["Distributed inactive preflight by teamId"]
  PRE --> ACTIVE{"Any node reports team active?"}
  ACTIVE -->|Yes| BLOCK["Block delete; return active-runtime conflict"]
  ACTIVE -->|No| PLAN["Build cleanup plan grouped by hostNodeId from manifest bindings"]
  PLAN --> HOSTLOCAL["Host deletes host-owned member subtrees"]
  PLAN --> REMOTE["Host dispatches teamId-scoped cleanup RPCs to worker groups"]
  REMOTE --> WORKDEL["Worker deletes only local-owned member subtrees (idempotent)"]
  HOSTLOCAL --> MERGE["Merge node cleanup outcomes"]
  WORKDEL --> MERGE
  MERGE --> COMPLETE{"All ownership groups complete?"}
  COMPLETE -->|Yes| FINAL["Finalize: remove manifest/index and prune team directory"]
  COMPLETE -->|No| PEND["Persist CLEANUP_PENDING; retry pending node groups"]
```

## Current State (As-Is)
1. `TeamRunManifestStore` persists only `team_run_manifest.json` under team folder in base implementation.
2. Current workspace WIP introduces symlink layout logic inside `TeamRunManifestStore`; this mixes concerns and is not canonical target architecture.
3. Team member projection resolves `memberAgentId` then reads via `RunProjectionService` rooted at `memory/agents/<memberAgentId>`.
4. Team restore reconstructs member runtime configs from manifest but does not enforce canonical team-member subtree reads.
5. Existing tests include assumptions about team-member traces under global `memory/agents`.
6. Team manifest creation currently writes `hostNodeId: null` for all members, which is insufficient for distributed member routing guarantees.
7. Nested distributed remote-resolution path currently relies on non-recursive team-definition lookup fallback and can miss nested leaf ownership.
8. Create/restore paths do not yet consistently pass canonical per-member `memoryDir`, so append writes can drift to global `memory/agents`.
9. Current placement resolution is built from top-level definition nodes; nested leaf ownership for distributed routing requires explicit flattened leaf-route binding metadata.
10. `deleteTeamRunHistory` currently performs host-local `fs.rm(teamDir)` and index removal without distributed remote cleanup orchestration.
11. Distributed remote command gateway supports only runtime control/message kinds and has no explicit history-delete command.
12. `deleteLifecycle` is persisted in index schema but current flow does not transition through durable `CLEANUP_PENDING` retry semantics.
13. Existing distributed command transport schema is run-envelope based (`teamRunId`, `runVersion`), while history deletion API is keyed by `teamId`; coupling these paths creates identifier/ownership ambiguity for inactive runs.
14. Worker run-scoped bindings currently do not carry explicit host `teamId`; inactive-preflight keyed by `teamId` cannot be robustly implemented from existing worker binding identity set alone.
15. Distributed team definition rows can contain remote node-local `referenceId` values (for example worker `24`) that do not exist in host-local `agent_definitions`, but host create path still requires local lookup for every member.

## Target State (To-Be)
1. Team member durable artifacts are physically stored under `memory/agent_teams/<teamId>/<memberAgentId>`.
2. Team projection resolves by (`teamId`, `memberRouteKey`) and reads team-member subtree for local bindings, then remote fallback by `hostNodeId`.
3. Team continuation restore reads canonical team-member subtree for local bindings.
4. Distributed persistence is node-partitioned with shared `teamId` for 2-node and 3-node nested topologies.
5. Workspace binding metadata from manifest remains part of restore/projection integrity checks.
6. Documentation and tests explicitly validate local, distributed, and nested layouts.

## Design Principles
1. Keep identity stable and explicit.
2. Enforce strict storage boundary: team-member memory is team-scoped.
3. Preserve distributed ownership: each node writes only local bindings (`hostNodeId` partition).
4. Keep store/service responsibilities clean:
- manifest store handles manifest only,
- member-memory layout/reads live in dedicated team-member memory components.
5. No long-lived compatibility branch.

## Decisions Finalized
1. Legacy history policy: explicit cutoff for pre-canonical team-member data under `memory/agents/<memberAgentId>`.
2. Worker diagnostics policy: no worker-side manifest shard. Worker stores only node-local member subtrees under shared `teamId`.
3. Projection reader placement: dedicated run-history team-member projection reader adapter.
4. Store boundary policy: `TeamRunManifestStore` will not materialize/link member folders.
5. Distributed ownership policy: manifest `memberBindings[].hostNodeId` must be populated at create time from resolved placement, not defaulted to `null`.
6. Canonical write-path policy: create and restore must pass canonical per-member `memoryDir` so runtime writes land in `memory/agent_teams/<teamId>/<memberAgentId>`.
7. Nested routing policy: remote-node resolution must use manifest binding map first and must not depend on shallow team-definition node scans.
8. Host-manifest-only policy: host may own zero local member subtrees; this is valid when all manifest bindings target remote nodes.
9. Placement flattening policy: distributed ownership map must be resolved at leaf route-key level (`memberRouteKey`) for nested teams.
10. Delete coordination policy: host orchestrates distributed delete by manifest ownership groups and finalizes only after all node groups complete.
11. Delete lifecycle policy: `READY -> CLEANUP_PENDING -> terminal removed` is durable and retry-driven for partial failures.
12. Delete idempotency policy: per-node subtree deletion is idempotent; already-missing subtrees are treated as completion, not failure.
13. Delete transport policy: distributed history cleanup must use dedicated `teamId`-scoped cleanup RPC, not runtime team envelope dispatch.
14. Inactive precondition policy: delete requires distributed-authoritative inactive verification before cleanup execution.
15. Runtime-binding identity policy: distributed bootstrap/run-scoped binding contracts must persist host `teamId` as first-class identity on worker nodes.
16. Distributed definition identity policy: host create/hydration must treat remote-member definition lookup as node-aware and must not hard-fail on host-local absence of remote node-local `referenceId`.
17. Distributed workspace portability policy: remote members require explicit `workspaceRootPath`; `workspaceId` is node-local hint and may fall back to `workspaceRootPath` on home-node resolution miss.
18. Member-folder readability policy: generated `memberAgentId` must be deterministic and human-readable (`<route_slug>_<hash16>`), not opaque hash-only.
19. Team-folder readability policy: generated `teamId` must be human-readable (`<team_name_slug>_<id8>`) and immutable once created.
20. Runtime memory contract policy: when explicit `memoryDir` is supplied to runtime agent creation/restore, it is treated as final leaf directory; no additional `agents/<agentId>` suffixing is permitted.
21. Worker bootstrap locality policy: worker runtime must not initialize coordinator/member agents that are non-local to that worker node.
22. Member run-manifest policy: each node persists `run_manifest.json` only for member bindings local to that node.

## Use Case Set (Design Scope)

| use_case_id | Use Case |
| --- | --- |
| UC-001 | Single-agent persistence remains at `memory/agents/<agentId>`. |
| UC-002 | Local team create persists manifest plus local member subtrees under team folder. |
| UC-003 | Local nested-team create persists flat member folders keyed by `memberAgentId` and route mapping in manifest. |
| UC-004 | Distributed team create partitions member persistence across host and worker nodes under shared `teamId`. |
| UC-005 | Local team-member projection reads canonical team-member subtree by (`teamId`, `memberRouteKey`). |
| UC-006 | Distributed team-member projection uses local read then remote fallback by `hostNodeId`. |
| UC-007 | Team continuation restore restores local bindings from team-member subtree and coordinates remote restore for remote bindings. |
| UC-008 | Team delete removes node-local member subtrees and finalizes distributed cleanup. |
| UC-009 | Legacy non-canonical team-member data is explicitly unsupported after cutover. |
| UC-010 | Docs and tests reflect canonical layout for single/local/distributed/nested cases. |
| UC-011 | Runtime append/write path stores ongoing member traces in canonical team-member subtrees (not global `memory/agents`). |
| UC-012 | Distributed nested 3-node topology (A/B/C) preserves shared `teamId` with node-local member subtree partitioning. |
| UC-013 | Workspace binding metadata remains consistent across manifest, restore resolution, and projection targeting. |
| UC-014 | Distributed mixed placement (for example local `professor`, remote `scribe`) is supported and validated with explicit host/worker memory trees. |
| UC-015 | Distributed host-manifest-only case is supported where host has no local member subtree and all members are remote. |
| UC-016 | Nested distributed leaf ownership is resolved from flattened route-key placement map, avoiding shallow top-level member-name ambiguity. |
| UC-017 | Distributed mixed/split delete removes only node-local bindings per node and finalizes host state after remote acknowledgements. |
| UC-018 | Host-manifest-only delete succeeds when host has no local member directories and all cleanup is remote. |
| UC-019 | Distributed nested delete across three nodes resolves cleanup ownership by route-key-level bindings without leaf-name ambiguity. |
| UC-020 | Partial-failure delete enters durable retryable lifecycle and supports idempotent replay until completion. |
| UC-021 | Delete preflight enforces distributed-authoritative inactive verification and blocks cleanup on runtime-state drift. |
| UC-022 | Distributed runtime bindings preserve host `teamId` identity so preflight and cleanup guards do not cross-match unrelated runs/definitions. |
| UC-023 | Distributed mixed-node create succeeds when remote member `referenceId` is absent in host-local `agent_definitions` but present on remote node; host uses remote-proxy-safe hydration for remote members while keeping local-member strictness. |
| UC-024 | Distributed workspace binding is path-authoritative: remote members must provide `workspaceRootPath`, and home-node execution falls back to `workspaceRootPath` when `workspaceId` is stale. |
| UC-025 | Generated team-member IDs keep deterministic uniqueness while improving operator readability (`<route_slug>_<hash16>`). |
| UC-026 | Generated team IDs keep operator readability (`<team_name_slug>_<id8>`) while preserving immutable distributed/run-history identity. |
| UC-027 | Runtime explicit-memory contract is uniform: explicit `memoryDir` always maps to leaf memory files without team-identity-specific branching in core factory logic. |
| UC-028 | Worker bootstrap must skip non-local coordinator initialization so worker nodes never materialize host-owned members. |
| UC-029 | Team-member `run_manifest.json` is persisted per local member binding (host and worker) and never for foreign-node members. |

## Use-Case Coverage Matrix

| use_case_id | Primary | Fallback | Error | Notes |
| --- | --- | --- | --- | --- |
| UC-001 | Yes | N/A | Yes | Prevent regression for single-agent reads/writes. |
| UC-002 | Yes | N/A | Yes | Local create must fail clearly on invalid member bindings. |
| UC-003 | Yes | N/A | Yes | Nested route collisions must fail validation. |
| UC-004 | Yes | Yes | Yes | Remote-node unavailability returns explicit distributed create failure. |
| UC-005 | Yes | N/A | Yes | Missing binding or missing subtree yields explicit projection error. |
| UC-006 | Yes | Yes | Yes | Remote unavailable returns local result path with warning logging. |
| UC-007 | Yes | Yes | Yes | Partial restore failure triggers rollback. |
| UC-008 | Yes | Yes | Yes | Worker unreachable yields retryable cleanup state. |
| UC-009 | Yes | N/A | Yes | Explicit legacy cutoff error on non-canonical history path. |
| UC-010 | Yes | N/A | Yes | Test/docs mismatch is release blocker. |
| UC-011 | Yes | N/A | Yes | Stream/activity sinks must write to canonical subtree only. |
| UC-012 | Yes | Yes | Yes | 3-node nested partitioning validated in integration coverage. |
| UC-013 | Yes | N/A | Yes | Workspace-binding mismatch fails restore/projection consistency checks. |
| UC-014 | Yes | Yes | Yes | Mixed placement with one local member and one or more remote members must preserve manifest `hostNodeId` routing and canonical storage. |
| UC-015 | Yes | Yes | Yes | Host can keep manifest-only team directory; all member reads/restores/deletes route remote by manifest ownership. |
| UC-016 | Yes | Yes | Yes | Nested distributed ownership uses route-key leaf map; duplicate leaf names across subteams do not break routing. |
| UC-017 | Yes | Yes | Yes | Host groups cleanup by `hostNodeId`; remote failures keep lifecycle pending. |
| UC-018 | Yes | Yes | Yes | Host with zero local subtrees still coordinates remote cleanup and finalizes correctly. |
| UC-019 | Yes | Yes | Yes | Nested distributed cleanup uses `memberRouteKey` bindings, not shallow member-name lookups. |
| UC-020 | Yes | Yes | Yes | Repeated delete retries are idempotent and converge to final cleanup completion. |
| UC-021 | Yes | Yes | Yes | Any active-runtime signal on any node blocks delete until stop/reconciliation completes. |
| UC-022 | Yes | Yes | Yes | Worker runtime-state probe and cleanup guards resolve by explicit host `teamId` identity. |
| UC-023 | Yes | Yes | Yes | Host does not require local definition row parity for remote members; local members still fail if host-local definition is missing. |
| UC-024 | Yes | Yes | Yes | Remote member missing `workspaceRootPath` fails fast; stale `workspaceId` on home node falls back to `workspaceRootPath`. |
| UC-025 | Yes | N/A | Yes | Route slug normalization keeps IDs path-safe/readable; hash suffix preserves uniqueness and determinism. |
| UC-026 | Yes | N/A | Yes | Team-name slug normalization keeps IDs path-safe/readable; random suffix provides collision resistance while teamId stays immutable after creation. |
| UC-027 | Yes | N/A | Yes | Explicit `memoryDir` path contract is enforced for create/restore and validated by runtime/store tests. |
| UC-028 | Yes | N/A | Yes | Worker coordinator bootstrap is locality-aware and skips non-local coordinator members to prevent foreign-member memory writes. |
| UC-029 | Yes | N/A | Yes | Member `run_manifest.json` is persisted only for local bindings and excluded for remote bindings on each node. |

## Change Inventory

| Change ID | Type | File(s) | Description |
| --- | --- | --- | --- |
| D-001 | Modify | `src/run-history/store/team-run-manifest-store.ts` | Keep manifest-only responsibility; remove layout materialization/link behavior from target design. |
| D-002 | Add | `src/run-history/store/team-member-memory-layout-store.ts` | Own team-member subtree path helpers and local subtree existence/materialization checks. |
| D-003 | Add | `src/run-history/services/team-member-memory-projection-reader.ts` | Read member memory from team subtree by (`teamId`, `memberAgentId`). |
| D-004 | Modify | `src/run-history/services/team-member-run-projection-service.ts` | Replace direct global `RunProjectionService` reads with team-member reader + remote fallback logic. |
| D-005 | Modify | `src/run-history/services/team-run-continuation-service.ts` | Ensure restore path uses team-member subtree contract for local bindings and workspace-binding consistency checks. |
| D-006 | Modify | `src/run-history/services/team-run-history-service.ts` | Enforce canonical path policy and explicit legacy cutoff handling points. |
| D-007 | Modify | `src/run-history/services/team-run-activity-sink-service.ts` (if needed) | Ensure runtime activity/memory append path aligns with canonical team-member subtree. |
| D-008 | Modify | `src/api/graphql/types/team-run-history.ts` | Preserve API surface; route projection errors through canonical-path semantics. |
| D-009 | Modify | `tests/e2e/run-history/team-member-projection-contract.e2e.test.ts` | Validate canonical subtree persistence/projection and append-write behavior. |
| D-010 | Modify | `tests/e2e/run-history/team-run-history-graphql.e2e.test.ts` | Add canonical layout fixtures and legacy cutoff assertions. |
| D-011 | Modify | distributed integration tests | Validate host/worker partitioning and 3-node nested topology behavior under shared `teamId`. |
| D-012 | Modify | docs memory-layout pages | Publish finalized directory trees, node partitioning, and operation rules. |
| D-013 | Modify | `src/api/graphql/types/agent-team-instance.ts` | Persist resolved `hostNodeId` per member in manifest during create/lazy-create (including nested members). |
| D-014 | Modify | `src/run-history/services/team-run-continuation-service.ts` and create paths | Pass canonical per-member `memoryDir` into runtime member configs for both create and restore. |
| D-015 | Modify | `src/run-history/services/team-member-run-projection-service.ts` | Prefer manifest `hostNodeId` and remove dependence on shallow team-definition lookup for nested remote members. |
| D-016 | Add/Modify | route-key placement resolver helper + create path integration | Build flattened leaf placement map (`memberRouteKey -> hostNodeId`) for nested distributed teams and use it in manifest/build/runtime bindings. |
| D-017 | Modify | distributed integration tests | Add host-manifest-only scenario and nested duplicate-leaf-name routing assertions. |
| D-018 | Add | `src/run-history/services/team-run-history-delete-coordinator-service.ts` | Coordinate distributed team-history delete by grouping bindings per `hostNodeId`, dispatching remote cleanup, and reporting completion/pending outcomes. |
| D-019 | Modify | `src/run-history/services/team-run-history-service.ts` | Replace host-local-only delete with lifecycle-driven coordinator flow (`READY`/`CLEANUP_PENDING`) and finalization gate for manifest/index removal. |
| D-020 | Add | `src/run-history/distributed/team-history-cleanup-dispatcher.ts` | Host-side `teamId`-scoped cleanup client that dispatches worker cleanup requests by node ownership groups. |
| D-021 | Add | `src/distributed/transport/internal-http/register-worker-team-history-cleanup-routes.ts` | Worker-side authenticated cleanup route for history-delete requests keyed by `teamId` + binding subset. |
| D-022 | Add | `src/run-history/services/team-history-worker-cleanup-handler.ts` | Worker-local cleanup handler that removes only node-owned member subtrees idempotently. |
| D-023 | Modify | `tests/e2e/run-history/team-run-history-graphql.e2e.test.ts` + distributed integration tests | Add delete matrix coverage: local, mixed distributed, host-manifest-only, nested multi-node, and retry/idempotent replay behavior. |
| D-024 | Add | `src/run-history/services/team-history-runtime-state-probe-service.ts` | Distributed-authoritative inactive preflight for delete to detect runtime-state drift before cleanup execution. |
| D-025 | Modify | distributed bootstrap + runtime binding contracts (`bootstrap-payload-normalization.ts`, `remote-envelope-bootstrap-handler.ts`, `run-scoped-team-binding-registry.ts`) | Propagate and persist host `teamId` in worker run bindings for `teamId`-authoritative preflight/cleanup guards. |
| D-026 | Modify | distributed runtime wiring (`src/app.ts`, distributed runtime composition, node directory URL helpers as needed) | Register/wire dedicated cleanup + runtime-probe routes and host dispatcher endpoints under transport/auth policy. |
| D-027 | Modify | `src/agent-team-execution/services/agent-team-instance-manager.ts` | Make agent-config hydration node-aware: keep local-member strict definition lookup; allow remote-member proxy-safe hydration when host-local definition row is absent for remote `referenceId`. |
| D-028 | Modify | `tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts` and distributed integration tests | Add explicit regression coverage for mixed-node create with host-missing/worker-present remote definition IDs. |
| D-029 | Modify | `src/agent-team-execution/services/agent-team-instance-manager.ts` | Enforce remote-member `workspaceRootPath` requirement during distributed create and add home-node fallback from stale `workspaceId` to `workspaceRootPath`. |
| D-030 | Modify | `tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts` | Add regression coverage for remote `workspaceRootPath` required validation and stale `workspaceId` fallback behavior. |
| D-031 | Modify | `src/run-history/utils/team-member-agent-id.ts`, `tests/unit/run-history/team-member-agent-id.test.ts` | Generate readable deterministic team-member IDs (`<route_slug>_<hash16>`) and lock normalization/format behavior in unit tests. |
| D-032 | Modify | `src/api/graphql/types/agent-team-instance.ts`, `autobyteus-ts/src/agent-team/factory/agent-team-factory.ts`, `tests/unit/api/graphql/types/agent-team-instance-resolver.test.ts` | Generate readable team IDs as `<team_name_slug>_<id8>` and keep teamId immutable across create/restore/distributed paths. |
| D-033 | Modify | `autobyteus-ts/src/agent/factory/agent-factory.ts`, `autobyteus-server-ts/src/agent-execution/services/agent-instance-manager.ts`, `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts`, `autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts` | Enforce explicit-`memoryDir`-is-leaf contract and remove team-identity-based layout switching from core runtime factory. |
| D-034 | Modify | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`, `autobyteus-ts/src/agent-team/bootstrap-steps/coordinator-initialization-step.ts`, `autobyteus-ts/tests/unit/agent-team/bootstrap-steps/coordinator-initialization-step.test.ts` | Add member placement metadata and make coordinator bootstrap locality-aware so non-local coordinators are skipped on worker nodes. |
| D-035 | Add/Modify | `autobyteus-server-ts/src/run-history/store/team-member-run-manifest-store.ts`, `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`, `autobyteus-server-ts/src/distributed/bootstrap/remote-envelope-bootstrap-handler.ts`, run-history/distributed tests | Persist per-member `run_manifest.json` for local bindings on host and worker, and enforce no foreign-node member manifest materialization. |

## File/Module Responsibilities (Target)

### `src/run-history/store/team-run-manifest-store.ts`
1. Own team-root path derivation and manifest I/O only.
2. No team-member directory creation/linking logic.

### `src/run-history/store/team-member-memory-layout-store.ts` (new)
1. Own canonical member path derivation: `memory/agent_teams/<teamId>/<memberAgentId>`.
2. Provide safe path checks and local subtree lifecycle helpers.
3. Keep directory-layout concerns out of manifest store.

### `src/run-history/services/team-member-memory-projection-reader.ts` (new)
1. Input: `teamId`, `memberAgentId`.
2. Read canonical team-member subtree projection payload.
3. Throw explicit canonical-path errors for missing subtree when required.

### `src/run-history/services/team-member-run-projection-service.ts`
1. Resolve binding by (`teamId`, `memberRouteKey`).
2. Read local projection via team-member reader.
3. If local empty and member host is remote, query remote fallback.

### `src/run-history/services/team-run-continuation-service.ts`
1. Load manifest and resolve member bindings.
2. Restore local members from canonical team-member subtrees.
3. Validate workspace binding consistency from manifest during restore setup.
4. Coordinate remote restore and rollback partial runtime on failure.
5. Set per-member canonical `memoryDir` for runtime restore configs.

### `src/api/graphql/types/agent-team-instance.ts`
1. Resolve effective per-member placement (`hostNodeId`) for local and nested members.
2. Persist `hostNodeId` into team manifest member bindings.
3. Set canonical per-member `memoryDir` at create/lazy-create time.
4. Use flattened leaf placement map keyed by canonical `memberRouteKey`.

### `src/agent-team-execution/services/agent-team-instance-manager.ts`
1. Hydrate local members with strict host-local definition lookup.
2. For remote members, permit proxy-safe hydration when host-local definition row for remote node-local `referenceId` is missing.
3. Preserve runtime identity metadata (`memberRouteKey`, `memberAgentId`, `memoryDir`) across strict and proxy hydration paths.
4. Enforce distributed workspace portability (`workspaceRootPath` required for remote members).
5. On home-node workspace resolution miss by `workspaceId`, fall back to `workspaceRootPath` when provided.

### `autobyteus-ts/src/agent/factory/agent-factory.ts`
1. Resolve memory layout purely from explicit runtime memory path contract:
   - explicit `memoryDir` (config or restore override) => leaf directory mode,
   - no explicit `memoryDir` => default single-agent `memory/agents/<agentId>` mode.
2. Must not inspect team-specific custom-data fields to decide storage shape.

### `src/run-history/services/team-run-history-service.ts`
1. Keep index and manifest lifecycle responsibilities.
2. Enforce canonical path policy for team-member history flows.
3. Surface explicit errors for legacy non-canonical team-member data.
4. Delegate distributed delete execution to delete coordinator and persist lifecycle transitions.
5. Block delete when distributed inactive-precondition probe reports active runtime drift.

### `src/run-history/services/team-run-history-delete-coordinator-service.ts` (new)
1. Input: team manifest + local node identity + delete request context.
2. Build delete plan grouped by `hostNodeId` from manifest bindings.
3. Execute local delete via `team-member-memory-layout-store` helper.
4. Dispatch remote cleanup RPC requests for non-local node groups via dedicated dispatcher.
5. Return deterministic result (`COMPLETE` or `PENDING_RETRY`) with pending node details.

### `src/run-history/services/team-run-activity-sink-service.ts`
1. Ensure ongoing team-member trace append path targets canonical team-member subtrees.
2. Preserve index/activity updates independent of websocket subscriptions.

### `src/run-history/distributed/team-history-cleanup-dispatcher.ts` (new)
1. Resolve worker targets by `hostNodeId` groups from manifest bindings.
2. Send authenticated cleanup request payloads (`teamId`, member subset) to worker cleanup route.
3. Normalize remote outcomes for coordinator (`complete` vs `pending_retry`).

### `src/distributed/transport/internal-http/register-worker-team-history-cleanup-routes.ts` (new)
1. Register dedicated worker cleanup endpoint for team-history deletion.
2. Verify transport auth signature and payload schema.
3. Delegate cleanup execution to worker cleanup handler.

### `src/run-history/services/team-history-worker-cleanup-handler.ts` (new)
1. Validate ownership-scoped member subset for local worker.
2. Delete only local `agent_teams/<teamId>/<memberAgentId>` subtrees.
3. Return idempotent success for already-absent subtrees.

### `src/run-history/services/team-history-runtime-state-probe-service.ts` (new)
1. Provide distributed-authoritative inactive preflight for `teamId`.
2. Query host/worker runtime registries and return active drift signals.
3. Gate delete coordinator execution when active runtime remains.

### Distributed bootstrap + run-binding contracts (modified)
1. `bootstrap-payload-normalization.ts`: normalize/validate host `teamId` in bootstrap payload contract.
2. `remote-envelope-bootstrap-handler.ts`: persist host `teamId` into worker run-scoped binding record.
3. `run-scoped-team-binding-registry.ts`: store and expose `teamId` in bound runtime records for probe/cleanup guard targeting.

### Runtime wiring (`src/app.ts` + distributed runtime composition) (modified)
1. Register worker cleanup and runtime-probe routes during app bootstrap.
2. Wire host-side dispatcher/probe clients through shared auth + node directory policy.
3. Keep history cleanup transport separate from runtime command envelope route.

## Distributed Design Rules
1. Shared `teamId` across participating nodes.
2. Host node stores manifest and host-local member subtrees.
3. Worker nodes store only worker-local member subtrees under same `teamId`.
4. Manifest is source of truth for `memberRouteKey -> memberAgentId -> hostNodeId` and workspace binding metadata.
5. Delete/cleanup is node-partitioned and coordinated at team level.
6. Host persists delete lifecycle as durable state and does not finalize manifest/index deletion until all node groups complete.
7. Remote cleanup transport is `teamId`-scoped and decoupled from runtime `teamRunId`/`runVersion` envelopes.
8. Remote cleanup request is binding-scoped; worker must never delete bindings owned by another node.
9. Distributed inactive-precondition probe must pass before cleanup starts.
10. Distributed delete retries are idempotent and may re-run safely against already-removed subtrees.
11. Worker run-scoped binding records must retain host `teamId` identity for preflight and cleanup guard disambiguation.
12. For distributed members, workspace binding is path-authoritative and must not depend on cross-node `workspaceId` parity.

## Migration / Cutover Policy
1. New runs: canonical team-member subtree only.
2. Pre-canonical team-member histories under global `memory/agents/<memberAgentId>`: unsupported after cutover.
3. No long-lived dual-read compatibility path.
4. Any one-time migration utility is out-of-band and explicitly temporary.

## Verification Plan
1. Unit: team-member layout store path and safety checks.
2. Unit: projection reader local subtree behavior.
3. Unit: projection service local read plus remote fallback branches.
4. Unit: continuation restore rollback plus workspace-binding consistency checks.
5. E2E local: manifest + member subtrees + append writes under canonical path.
6. Integration distributed: host/worker partitioning and 3-node nested topology coverage.
7. E2E legacy cutoff: explicit non-canonical path failure assertions.
8. Docs check: published trees match requirements and observed test behavior.
9. Integration distributed mixed placement: one local member and one or more remote members (for example remote `scribe`) with manifest `hostNodeId` assertions.
10. Integration host-manifest-only: host has manifest without local member dirs; projection/restore/delete still pass.
11. Integration nested duplicate leaf names: route-key placement map disambiguates ownership and routing.
12. E2E/local delete: local team delete removes member subtrees + manifest + index row idempotently.
13. Integration distributed delete mixed placement: host/worker cleanup split follows binding ownership.
14. Integration distributed delete host-manifest-only: host finalizes only after remote worker acknowledgements.
15. Integration distributed delete partial failure: lifecycle enters `CLEANUP_PENDING`, retries converge, finalization gate holds.
16. Integration distributed inactive-precondition drift: delete blocked when any node reports active runtime for same `teamId`.
17. Integration transport contract check: history cleanup RPC works without requiring `teamRunId`/`runVersion`.
18. Integration identity disambiguation: worker preflight/cleanup guard uses explicit host `teamId` and does not cross-match unrelated team history under same definition lineage.
19. Integration distributed workspace portability: remote member with missing `workspaceRootPath` fails fast.
20. Integration workspace fallback: home-node member with stale `workspaceId` and valid `workspaceRootPath` resolves workspace via path.

## Requirement Traceability

| Requirement Area | Covered In Design |
| --- | --- |
| Single-agent layout remains `memory/agents` | UC-001, D-003 boundary contract |
| Local team layout under `agent_teams/<teamId>/<memberId>` | UC-002, D-002, D-003, D-004 |
| Distributed host/worker layout with same `teamId` | UC-004, UC-012, D-005, D-011 |
| Distributed mixed local+remote member split in one team | UC-014, D-013, D-015 |
| Distributed host manifest-only (all members remote) | UC-015, D-013, D-017 |
| Nested route identity via manifest | UC-003, D-001, D-004 |
| Nested distributed leaf placement disambiguation | UC-016, D-016, D-017 |
| Delete matrix (local/mixed/manifest-only/nested) | UC-008, UC-017, UC-018, UC-019, D-018..D-023 |
| Delete retry/idempotent lifecycle semantics | UC-020, D-019, D-023 |
| Distributed inactive delete precondition | UC-021, D-024 |
| Delete transport decoupling from runtime envelopes | UC-017..UC-021, D-020..D-022 |
| Distributed teamId identity propagation in runtime bindings | UC-022, D-025 |
| Distributed workspace portability and fallback reliability | UC-024, D-029, D-030 |
| Readable deterministic member-folder naming | UC-025, D-031 |
| Readable immutable team-folder naming | UC-026, D-032 |
| Worker bootstrap locality safety for distributed members | UC-028, D-034 |
| Per-member run manifest persistence by node ownership | UC-029, D-035 |
| Restore/read/write/delete operation rules | UC-005..UC-008, UC-011, UC-017..UC-022, D-004..D-007, D-018..D-026 |
| Workspace-binding metadata integrity | UC-013, D-005 |
| Docs-quality detail for promotion | UC-010, D-012 |

## Remaining Non-Blocking Notes
1. Legacy migration tooling remains out of scope for this ticket.
