# Integration Strategy Analysis — Universal Application Framework on Latest Personal

> Current status: the v1.4.58 merge is complete. ARCH-REV-012 accepted SR-012's member/session-bound task authority and narrowed AR-007 to exact general/default/fixture propagation. The SR-013 addendum governs that construction-completeness correction while this file remains historical authority for the one-merge strategy and established platform boundaries.

## Status And Authority

- Status: Historical merge strategy implemented through v1.4.58; SR-011 definition boundary and SR-012 task-ownership direction accepted; current SR-013 design-ready propagation-completeness correction.
- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/integration-strategy-analysis.md`
- Purpose: Preserve the measured merge evidence, option decision, semantic authority rules, integration seam, and verification delta.
- Scope: REQ-001–REQ-012 and AC-001–AC-036.
- Approval: The user explicitly authorized an isolated trial merge and delegated the technical approach subject to the required latest-Personal outcome.
- Normative seam detail: [integration-runtime-contracts.md](integration-runtime-contracts.md) preserves the exact passed lifecycle/run/persistence/Team contracts; section 9 defines the accepted SR-011 host definition boundary and section 10 defines the SR-012 member/session task scope plus SR-013 exact constructor/default/occurrence closure; the round-3/4/5 supplements remain implemented historical authorities.

## Executive Decision

Use a **single semantic merge on a new branch created from latest `origin/personal`**.

This is not a blind merge. Resolve it in four classes:

1. **Generated/derived paths:** remove from the conflict/index decision and regenerate later from canonical source.
2. **Obsolete mirrored/custom-builder paths:** accept clean removal; do not resurrect them.
3. **Canonical textual conflicts:** resolve according to the authority matrix below.
4. **Canonical marker-free overlaps:** inspect all 77 because Git's auto-merge proves only textual compatibility, not semantic compatibility.

This keeps both histories, creates one reviewable integration point, and avoids replaying the same conflicts across 115 commits.

## What The Trial Merge Proved

| Measurement | Result | Interpretation |
| --- | ---: | --- |
| Personal-only commits | 238 | Personal changed substantially after the feature's base. |
| Feature-only commits | 115 | The feature is too distributed for safe manual cherry-pick selection. |
| Conflict paths | 177 | Large headline number, but not 177 design choices. |
| Generated/derived conflicts | 137 | Mechanical remove/regenerate class. |
| Obsolete custom-builder conflicts | 2 | Clean removal class. |
| Canonical source/test conflicts | about 38 | Direct semantic resolution class. |
| Changed-both paths | 227 | Auto-merge does not eliminate audit work. |
| Canonical non-generated changed-both paths | 77 | Mandatory semantic audit set. |
| Feature-only canonical additions | 110 | Reimplementation would discard a large, already-reviewed capability set. |
| Derived paths to remove/regenerate | 656 | Do not hand-merge these outputs. |

The initial merge staged 1,223 paths with approximately 187k insertions and 23k deletions before abort. That number reflects package outputs and the long-lived feature history; it is not a useful proxy for conceptual refactoring effort.

## Option Analysis

| Option | Benefit | Cost / Risk | Decision |
| --- | --- | --- | --- |
| One semantic merge into latest-Personal branch | Preserves both histories; one conflict surface; Git retains unchanged work | Requires disciplined source authority and overlap review | **Selected** |
| Rebase finalized feature onto Personal | Linear history | Replays conflicts across 115 commits, rewrites finalized branch, obscures already-reviewed corrections | Rejected |
| Cherry-pick selected feature commits | Appears incremental | Feature behavior spans many corrections; high omission and ordering risk | Rejected |
| Reimplement feature from scratch on Personal | Maximum freedom | Discards 110 feature-only canonical additions and proven integration behavior; duplicates prior work | Rejected |
| Copy feature tree over Personal | Fast mechanically | Regresses 238 Personal commits and newer lifecycle/provider behavior | Rejected |
| Merge Personal into the finalized feature branch | Preserves feature worktree | User requires the result to be based on latest Personal; retained feature branch should remain a known checkpoint | Rejected |

## Semantic Authority Matrix

| Concern | Authoritative Input | Combined Rule |
| --- | --- | --- |
| Git base and current repository shape | Latest Personal | New ticket branch starts at Personal and keeps it as first parent. |
| Studio/standalone process startup and migration gates | Latest Personal | Both host starters run the exact logging/core migration/protected paths/Prisma/token schema/vault/app-data/token readiness/TeamRun catalog/readable-provider sequence. Shared application readiness/recovery/stop runs once in `ApplicationPlatformLifecycle`; Studio-only transports/background remain outside it. |
| Agent run preparation, activation, event publication, teardown | Latest Personal | Preserve current prepare/publish/abort/quarantine and exact cleanup semantics. |
| Team lifecycle and identity | Latest Personal | Preserve RootTeamRun, execution-tree, rooted `memberAddress`, and current member handles/registries. |
| Provider/session evolution and native provider behavior | Latest Personal | Preserve current Codex/Claude behavior and current model/provider availability. |
| Serialized contract numbers | Latest Personal | Manifest 4, backend bundle 1, current SDK/backend definition contract 6. |
| Same package in Studio and standalone | Finalized feature | Retain separate explicit host builders over one shared application-services boundary. |
| Standalone host and application dev workflow | Finalized feature | Retain devkit commands, standalone bootstrap/static/REST/WebSocket ingress, and canonical source ownership. |
| Application-platform outward boundary | Finalized feature | Retain exactly lifecycle, REST, realtime, and host-management projections; internals stay private. |
| Package defaults and host override semantics | Finalized feature + Personal rooted row/availability rules | One launch service/store reads valid current `memberAddress` rows directly as sparse overrides; package/selected baselines and current availability block honestly; no mutation, read-time rewrite, second store, or silent fallback. |
| Application Agent Tools scope/publication | Finalized feature adapted to Personal run identity | Same session/route/provider family must use exact application active-run/publication owner. |
| Studio external MCP gateway | Latest Personal / finalized feature preserved distinction | Remains Studio-only; it is not exposed by standalone. |
| Generated and mirrored application output | Devkit/canonical source design | Delete, then deterministically rebuild after canonical source resolves. |

## Combined Target Boundary

```text
                         shared application package
                                  |
                  +---------------+---------------+
                  |                               |
          Studio host builder              Standalone host builder
       (registry/import/iframe)          (selected app/static/CLI)
                  |                               |
                  +---------------+---------------+
                                  |
                    ApplicationPlatformRuntime
                       outward projections only
                  lifecycle | REST | realtime | host-management
                                  |
          +-----------------------+------------------------+
          |                       |                        |
 launch configuration     current run/team lifecycle    app engine/backend
 package + sparse host     preparation/activation        worker + app routes
 override + readiness      rooted member identity        projections/events
          |                       |
          +-----------------------+------------------------+
                                  |
                  scoped Agent Tools session runtime
                 /mcp/agent-tools/:sessionId in both hosts
                                  |
              messaging + artifact publication/projection

Studio-only external MCP configuration route: /mcp/gateway
Standalone: does not register /mcp/gateway
```

The application business code begins after host selection/bootstrap. Both hosts then invoke the same application-platform boundaries and the same package backend/frontend behavior.

## Critical Construction Adaptation

### The problem

The finalized feature created application-scoped publication/session services against an older run-manager shape. Latest Personal now owns activation candidates and active-run state inside its current `AgentRunManager`, but provider factories that create Codex/Claude sessions must receive the application-scoped MCP session manager before the full run manager can be constructed. Reusing global defaults would violate the application boundary; a bind-later proxy would restore temporal coupling.

### Target structure

Introduce one concrete **`AgentRunActivationRegistry`** under current agent execution. It is not a second run manager and not a generic container. It owns:

- tokenized `constructing`, `prepared`, and `quarantined` claims;
- active run registration/lookup and stop admission;
- identity-checked removal/replacement result shapes.

An adapted `AgentRunResourceManager` owns the exact file/artifact/memory attachment and early application-session-scope revocation records. Current `AgentRunManager` continues to own backend/run construction, candidate callbacks, private termination, in-flight preparation tracking, and consumption of cleanup results. Current `AgentRunActivationCandidate`, `AgentRunProvisioningService`, and `StandaloneAgentRunActivationService` retain private-candidate, durable PREPARED, metadata-before-publication, provider identity, retry, and quarantine responsibilities.

Construction order:

```text
application session ownership scope + file/artifact/memory observers
  -> AgentRunResourceManager
  -> AgentRunActivationRegistry
  -> application PublishedArtifactPublicationService(registry, awaited event pipeline)
  -> application ScopedAgentToolMcpSessionManager(exact publisher)
  -> current Codex/Claude bootstrap/factory instances(explicit scoped sessions)
  -> current AgentRunManager(registry, resources, factories, event pipeline)
  -> current provisioning + activation + run service
  -> current team manager/factory/member graph(explicit AgentRunManager + rooted identities)
  -> orchestration, launch configuration, application engine, projections
  -> lifecycle READY
```

The registry exposes the exact claim/prepare/publish/abort/remove/stop operations and result unions in the runtime-contract supplement. It never invokes a later-registered manager callback. `AgentRunResourceManager` deletes ownership before exact session revocation/observer detach; `AgentRunManager` consumes those results and terminates the run/backend. General-process assembly may retain only the explicitly enumerated defaults; application construction supplies every nested provider/team dependency and is guarded by occurrence plus omission/null/undefined architecture fixtures.

### Why this is proportionate

- It adapts one construction cycle at the exact boundary where the branches differ.
- It preserves Personal's current state machine instead of resurrecting the feature-era active-only registry or old team registries; only the proven exact resource attachment/release discipline is adapted behind the current claim/candidate lifecycle.
- It preserves the feature's application-scoped publication identity without global fallback.
- It does not redesign the provider or team execution domains.

## Identity And Contract Adaptation

- Use current rooted **`memberAddress`** for team member topology and override selection.
- Use current explicit **`agentRunId`** and **`teamRunId`** for run bindings; never overload one ID field.
- Use the current MCP session's run owner plus optional team identity.
- Do not restore `memberRouteKey`, flattened team-run identities, or feature-era persistent/task registry implementations when Personal has replaced them.
- Persisted team launch overrides also use `memberAddress`/`displayName`; valid current Personal rows are consumed unchanged by the single target launch override store/service. Obsolete route-key rows are invalid saved state, not a compatibility input.
- Keep code symbols unversioned for the in-scope application contracts, while serialized values remain Personal's current 4/1/6 values. No aliases for old code names.

## Conflict Resolution Plan

### Phase A — Recreate the merge

1. Confirm the ticket branch is clean and still starts at the recorded Personal ref.
2. Re-fetch both refs; if either moved, stop for an evidence refresh.
3. Merge the exact finalized feature ref once using `--no-ff`.
4. Save parent refs and conflict inventory in the merge evidence.

### Phase B — Mechanical conflict classes

1. Delete generated `dist`, compiled `backend`, vendor copies, generated GraphQL clients, and importable-package outputs that the target devkit owns.
2. Delete the two custom `scripts/build-package.mjs` paths and mirrored `ui`/`backend` source trees included in the feature cleanup.
3. Do not resolve derived contents line-by-line.

### Phase C — Canonical semantic classes

1. Resolve application canonical source using Personal's current app logic plus the feature's host-neutral contracts and Codex/Luna defaults.
2. Resolve SDK/devkit schemas using Personal serialized values and the feature's developer workflow/unversioned naming.
3. Bring forward explicit host builders, four runtime projections, standalone host, launch configuration, and scoped MCP behavior; allocate every process/application lifecycle phase by the normative lifecycle table. Phase 16 uses one memoized `AgentToolRegistryReadiness`: Core first, five server-owned non-Search units, and provisioned Search last. Remove the direct Search call, background/wrapper entrypoint, Search-to-Core call, and AgentFactory registration side effect.
4. Adapt those additions to current Personal candidate/provisioning/activation/team identity through the exact construction DAG and constructor obligation table; retain current configured/task registries and reject the feature-era ones.
5. Select one launch store, remove the Personal configuration store/service, use current rooted persisted identity, and resolve web launch editors as sparse baseline/override UI plus Personal unavailable-model retention/warnings without read-time rewrite/fallback.
6. Port durable assertions from deleted seams to current production owners; never restore removed source to make a test compile.

### Phase D — Marker-free overlap audit

For every path in `[MODIFY_BOTH_CANONICAL]`:

- identify the behavior owner from the authority matrix;
- inspect the three-way diff, not just the merge result;
- record `Personal`, `Feature`, or `Combined` resolution plus protected BEH/REQ/AC IDs;
- verify imports use current owners and identities;
- check no optional constructor argument activates a process/global fallback.

### Phase E — Regenerate and verify

1. Run format/typecheck/build before regeneration.
2. Regenerate application bundles/importable packages from canonical source.
3. Confirm regenerated output is reproducible and package parity is exact.
4. Run focused, broad, real-host, and Electron verification.

## File Inventory Interpretation

`integration-path-inventory.txt` is the exact target inventory derived from the raw Git evidence:

- `ADD_OR_ADAPT_CANONICAL` — 109 paths to introduce/adapt, including the dedicated required-tool readiness unit test; the rejected active-only and feature member-registry paths are not target additions.
- `MODIFY_BOTH_CANONICAL` — 75 paths requiring three-way semantic audit after removing those two rejected member registries.
- `TARGET_PERSONAL_ONLY_MODIFY` — 12 current Personal owners that the semantic integration must modify even though they are not a changed-both Git class.
- `TARGET_INTEGRATION_ONLY_MODIFY` — 9 shared/feature-changed source and test paths whose target change is required only by the combined readiness boundary: loader/background/index, Search, AgentFactory, and their direct tests.
- `TARGET_EXPLICIT_RETAIN_DEPENDENCY` — the unchanged Core `register-tools.ts` registrar plus the AutoByteus backend factory edge to the now registry-pure `defaultAgentFactory`.
- `REMOVE_LEGACY_CANONICAL` — 17 obsolete paths, now including the Personal configuration store. Two custom builders appear in both raw modify/remove evidence because both branches changed them before deletion; **removal is authoritative**.
- `TARGET_EXPLICIT_DO_NOT_ADD` — the feature active-only registry and two old member registries.
- `REGENERATE_OR_REMOVE_DERIVED` — 656 paths that must not become manually maintained merge resolutions.

The implementation engineer may refine the exact list when current source ownership requires a file rename or split, but must record the reason and may not change the behavior boundary.

## Preserved Host Behavior Matrix

| Capability | Studio | Standalone | Combined Invariant |
| --- | --- | --- | --- |
| Application selection | Registry/import and iframe launch | One selected local package | Same package identity/contents |
| Frontend bootstrap | Studio iframe provider | Same-origin provider | Same normalized bootstrap contract |
| Business backend | Mounted selected application backend | Mounted selected application backend | Same app-owned routes/services |
| Launch configuration | Package baseline + optional persisted sparse override/reset | Package baseline + optional host override | One effective resolver; no package mutation |
| Internal Agent Tools | `/mcp/agent-tools/:sessionId` | `/mcp/agent-tools/:sessionId` | Exact scoped session/publication owner |
| External MCP gateway | `/mcp/gateway` where Studio configures tools | Not registered | Host boundary stays explicit |
| Native provider tools | Provider-owned | Provider-owned | Not modified by this ticket |
| Artifact projection | Application worker and stores | Same | Same event/publication contract |
| Stop/recovery | Multi-application lifecycle | Selected-application lifecycle | Same exact cleanup semantics |

## Verification Delta

### Git and source integrity

- ancestry/merge-parent assertions;
- clean index and conflict-marker scan;
- `git diff --check`;
- deleted/generated/mirrored path audit;
- all 77 overlap decisions accounted for.
- production call-site proof that only `AgentToolRegistryReadiness` invokes Core registration, Search owns only its provisioned replacement, AgentFactory construction is registry-pure, and no background/wrapper path remains.

### Architecture and construction

- existing application-framework boundary suite updated for current Personal sources;
- synthetic omission/null/undefined cases for every application-scoped constructor/factory obligation, including nested Codex/Claude bootstrap/session inputs;
- general-process exemption remains exact and named;
- no application path process/global fallback.
- exact required-tool unit keys and Core-first/Search-last order; concurrent/repeated once semantics; sticky failure; missing-export and registrar-failure omission cases.

### Package/developer workflow

- Brief and Socratic `dev`, `dev:studio`, `build`, `validate`, `start`;
- clean-root build and deterministic package contents;
- exact package parity/importability;
- Codex/Luna portable-default validation and recursive secret rejection.

### Runtime/API/E2E

- fresh-root standalone real run;
- Studio imported-package real run;
- sparse alternate resource/model override, invalid/unavailable retention, reset to defaults;
- team instruction and rooted-member prompt composition;
- scoped Agent Tools descriptor/auth/list/dispatch;
- recipient-name handoff;
- artifact publication/projection;
- worker exit/restart before publication;
- remount/recovery and exact cleanup/session revocation;
- Studio external gateway present and standalone external gateway absent.

### Personal regression

- readable-provider migration startup gate/unwind;
- current provider preparation/publication and awaited event semantics;
- current agent/team lifecycle suites affected by the 77-path overlap;
- current model-availability warnings/blocking;
- current contract/version parsing and package validation.

### Product packaging

- affected workspace typechecks/builds/tests;
- repository suites appropriate to the changed paths;
- Electron build and smoke test on the integrated candidate.

## Explicitly Rejected Shortcuts

- No `git checkout --ours` or `--theirs` across production directories.
- No 115-commit rebase.
- No selective cherry-pick as the main integration mechanism.
- No feature-tree overwrite or greenfield rewrite.
- No hand-edited generated output.
- No resurrection of removed Personal or feature intermediate seams.
- No compatibility aliases, generic DI/service locator, generic event bus, mode-switched server builder, later-bound generic proxy, singleton fallback, or package-specific branch.
- No claim that pre-integration test results validate the integrated tree.

## SR-004 Newest-Personal Refresh Addendum

The original one-merge decision is complete and verified. The mandatory refresh now merges current `origin/personal@7edfb1625...` into protected checkpoint `663f44d...`; it does not replay the original feature merge. Delivery measured the same semantic conflict surface at parent `1629441a3...`; solution-design revalidation proves the current child commit changes only two unrelated delivery documents and does not alter that surface.

| Refresh decision | Result |
| --- | --- |
| Method | One additional history-preserving merge of the newly fetched Personal ref into the ticket branch after re-confirming the ref has not moved. |
| Measured surface | 32 commits, unchanged 11 conflicts, 13 production changed-both paths, plus two unrelated delivery-document modifications in the newest commit. |
| Latest Personal authority | provider catalog/pricing/current AutoByteus membership, missing-key/provider error extraction/redaction, canonical native error metadata, and native clients. |
| Verified ticket authority | explicit hosts, application-platform boundary, one launch owner/store, v6 exact identity/URL, message-only application stream, generated/legacy removal. |
| Required adaptation | one explicit `ApplicationCurrentModelSelectionPolicy` shared by readiness, Save, and direct run validation; original safe message in the strict application ERROR projection. |
| Required deletions | keep the retired configuration helper/service/test and application SDK generated declarations absent. |
| Persisted outcome | Directly Usable — No Migration; stale model strings remain visible and blocked, never remapped or rewritten. |
| Full design | `latest-base-refresh-design-analysis.md`. |

The refresh does not change the selected integration strategy, introduce a new host, or authorize a greenfield refactor. A whole-file `ours`/`theirs` choice is specifically forbidden for the 11 conflicts and the marker-free run-binding overlap.

## SR-005 Nested Physical-Scope Refresh Addendum

The SR-004 merge is complete and verified. The current refresh merges `origin/personal@a00f0d07d...` once into protected checkpoint `a23849f...`; it does not replay the original integration or reopen the current-model/error design.

| Refresh decision | Result |
| --- | --- |
| Method | One additional history-preserving semantic merge after exact-ref confirmation. |
| Surface | Five commits, three content conflicts, six changed-both paths. |
| Personal authority | `TeamRunPhysicalScope`, root/child propagation, nested configured/task memory placement, history restart, memory sync, settled-task navigation, and registered memory migration. |
| Verified ticket authority | application graph-local run/session/memory/context construction, prepared activation/platform binding, exact scoped cleanup, dual hosts, package behavior. |
| Required adaptation | Existing leaf handle uses `{...teamContext.physicalScope, agentRunId}` through the injected memory service and retains injected session cleanup. |
| Persisted outcome | Launch rows remain direct; affected old flat nested Team Agent memory is `Migration Required` through the existing runner. |
| Runtime compatibility | None: one current physical layout, no dual read/write or directory alias. |
| Full design | `latest-base-refresh-round-2-design-analysis.md`. |

The three conflict resolutions and three marker-free overlap decisions are exact. Whole-file side selection, a second migration owner, a new scope service, global application fallbacks, and a test-only maintained application package are rejected.

## SR-006/SR-007 Personal v1.4.56 Provider/Catalog Refresh Addendum

Implementation correctly stopped because the mandatory re-fetch first found the production-semantic state `3ab4946c7...`, eleven commits beyond the reviewed SR-005 target. The final SR-007 refresh now targets `origin/personal@c5b87df4d...`, 22 commits beyond integrated base `7edfb1625...` and 17 beyond the reviewed target. The one-merge strategy remains optimal; the semantic map changes only for the previously identified production intersection.

The six commits after `3ab4946c7...` add an isolated, non-workspace UI prototype (1,934 files) plus eight prototype/API-key ticket and delivery-record paths. They do not change root workspace membership or shared production/runtime source and leave the five-conflict/ten-overlap map unchanged. Preserve the prototype subtree exactly; do not make it an application-framework dependency or verification owner.

| Refresh decision | Result |
| --- | --- |
| Method | One additional history-preserving semantic merge of exact `c5b87df4d...` after immediate ref confirmation. |
| Surface | 2,194 paths after the prior target; five conflicts and ten changed-both paths against protected checkpoint `a23849f...`. The final 1,942-path movement is isolated prototype/ticket content. |
| Personal authority | Network-free provider descriptors/static catalogs, split credential/model snapshots, provider/kind-keyed lifecycle, identifier-to-provider resolution, provider-granularity discovery, exact endpoint post-check, snapshot-settled GraphQL/Pinia contracts, media factory ownership, and deleted aggregate/cached owners. |
| Verified ticket authority | Explicit hosts, one application configuration/store/policy seam, sparse inherited overrides, graph-local execution/session/memory, internal Agent Tools, publication/projection, and package workflow. |
| Required application adaptation | Classify static/dynamic AutoByteus identifiers; delegate dynamic identifiers to the selected-provider Personal ensure; remove runtime-only model caching; perform a fresh exact `ModelInfo` lookup per leaf; distinguish removed-static/dynamic-unavailable; map/cache credentials only by adapter-resolved authority. |
| Required Studio adaptation | Preserve stored -> inherited -> optional-default runtime; publish current runtime snapshot immediately; await `Promise.allSettled` missing-provider attempts; re-read the same bucket and `ERROR`/`STALE_ERROR` source status; keep aggregate catch defensive. |
| Physical-scope treatment | Preserve every SR-005 decision and combine it with the larger current merge. |
| Isolated prototype treatment | Accept `ui-prototypes/autobyteus-web-prototype/**` byte-for-byte; root `pnpm-workspace.yaml` remains unchanged; no production import, semantic edit, or application-framework test obligation. |
| Persisted outcome | Provider/launch rows directly usable; dynamic source state in-memory; only SR-005 affected nested memory requires its already-approved migration. |
| Full design | `latest-base-refresh-round-3-design-analysis.md`. |

The new raw diff is large but the cross-boundary target is bounded. Do not replace it with a provider/application framework, endpoint-local discovery owner, compatibility facade for removed APIs, application-local catalog, eager all-provider startup discovery, generic resolver/coordinator, or a whole-file conflict choice.


## SR-009 Personal v1.4.58 Hierarchical Team/V2 Refresh Addendum

The strategy remains one history-preserving semantic merge on the dedicated ticket branch. The larger count does not justify rebase, selective replay, or reconstructing the completed feature on a fresh branch: protected checkpoint `c6d74710a...` already contains reviewed dual-host and v1.4.57 behavior, while Personal's 38-commit advance is independently coherent and should remain visible as the second merge parent.

The current resolution order is source-first:

1. require exact `origin/personal@fb1335867a4223b2499e4513f58c609b6ac33ab4` immediately before merge;
2. accept Personal's current Team topology planner, identity allocator, V2 package/catalog/history, and registered migration as the lower execution/data authority;
3. adapt the feature's application-owned launch resolver/SDK/run-binding seam to complete Team scopes plus Agent leaves without replacing Personal execution owners;
4. preserve explicit Studio/standalone construction, graph-local dependencies, package defaults/overrides/readiness, controlled workspace/provider behavior, and real return/cleanup paths;
5. keep the 30 generated SDK/vendor/importable package paths deleted, resolve the 13 content conflicts by current owner, and audit all 50 changed-both paths;
6. rebuild generated output only as disposable package-parity evidence after canonical source passes;
7. re-run the full architecture/source/API-E2E/durable-test/Electron gates on the integrated commit.

Semantic authority for the new junction is:

| Concern | Authority | Integration rule |
| --- | --- | --- |
| Application package/selected-definition/host precedence | current application launch configuration owner | extend the Team variant with complete rooted Team scopes; no launch-time inference |
| Generic Team topology, validation, allocation, V2 persistence and execution | Personal v1.4.58 Team owners | consume exact complete input; never port/recreate these owners |
| Historical V1 TeamRun conversion | Personal registered V2 migration | run after nested-memory migration; keep V1 out of current runtime |
| Studio hierarchical editable/stored Team UI | Personal v1.4.58 | retain ticket controlled-workspace/provider/null-runtime corrections at existing sibling seams |
| SDK/vendor/importable outputs | canonical source + build/devkit pack | remain deleted as tracked authority; regenerate for proof |

The exact file, data, conflict, overlap, sequence, and verification decisions are in `latest-base-refresh-round-5-design-analysis.md`. Earlier addenda remain historical authority for already-integrated behavior and are not separate merge plans.

## SR-011 Canonical Host Definition Boundary Addendum

The v1.4.58 merge is complete. SR-011 is not another integration strategy or broad platform refactor. It resolves one demonstrated supported-path split:

```text
current: public definition cache A -> public run service -> definition cache B -> not found
target:  one host definition pair -> {public definitions, general runs, application config/runs, refresh}
```

| Concern | Target owner | Rule |
| --- | --- | --- |
| Bundle-backed definition-pair construction | `createBundleBackedDefinitionServices` | concrete provider/service wiring with exactly two governed callers: host binding and transient standalone validation; no process binding or cache publication |
| Host Agent/Team definition catalog | existing definition services bound by `HostDefinitionServices` | one bundle-aware pair, Team constructed over exact Agent, fail-closed bind/release |
| Public Studio definition/run APIs | configured Studio service registration | exact definition and general run services from the same built server; no ambient resolver getter |
| General process runs | `GeneralProcessRunSupervisor` | explicitly construct/bind run services, backends, allocators, planner/context with host definitions |
| Application runs | existing application runtime/run-service factory | receive same definitions; keep non-identical managers/sessions/publication |
| Package refresh | existing refresh coordinator | refresh the same Agent then Team caches |
| Pre-host migration label lookup | migration-local persistence reader | non-caching optional lookup; never binds host catalog |
| Persistence | unchanged definition files/package roots | `Directly Usable — No Migration` |

The standalone package validator's pre-host pair is deliberately not the host catalog: it is method-local, read-only, unbound, and unreachable from routes, process getters, run construction, or refresh. Once executable-host assembly begins, exactly one bound runtime catalog exists. This distinction keeps package validation independent without weakening the canonical runtime boundary.

Rejected alternatives are resolver-only redirection, cache mirroring/synchronization, fallback reads, a generic catalog facade/container, and unifying general/application execution state. Exact contracts, lifecycle, inventory, and proof are normative in `integration-runtime-contracts.md` section 9 and `design-spec.md` DS-024.


## SR-012 Member/Session-Bound Task Delegation Addendum

SR-012 does not change the completed merge strategy or reopen the accepted one-catalog/two-execution-scope design. It corrects the one path where shared task infrastructure accidentally selected process-general execution state:

```text
current: application member session -> shared task service -> process-general TeamRunService
target:  issuing RootTeamRun -> immutable member resolver -> issuing session/native tool -> shared task service -> same RootTeamRun
```

| Concern | Target owner | Rule |
| --- | --- | --- |
| task lifecycle/state/persistence | existing `RootTeamRun` and its root `TaskDelegationService` | unchanged sole owner |
| exact root selection | root-specific `MemberTaskRootResolver` created by `AgentTeamRunManager.materializeRoot()` | no selector, lookup, restore, or process/application mode |
| member propagation | existing mixed callbacks, registries/handles, `MemberTeamContextBuilder`, immutable `MemberTeamContext` | required for configured/restored/nested/task members; no default |
| MCP execution scope | existing scoped session service/registry with specialized Team-member capability | authenticated adapter consumes capability only; general/application sessions retain separate roots/managers |
| task protocol | existing manifest, service, and router | one stateless shared implementation; remove `getTeamRunService()` |
| AutoByteus server task tools | existing registered definitions plus bound per-member ToolConfig | same member resolver; remove identity-only native parser |
| transport/public surface | existing `/mcp/agent-tools/:sessionId` and native in-process tool execution | unchanged; no duplicate route/catalog or external `/mcp/gateway` exposure |
| persistence | unchanged task records, Team V2, launch and application data | `Directly Usable — No Migration` |

This is proportionate because it strengthens the existing RootTeamRun boundary and reuses the existing task/session/tool capability areas. Rejected alternatives are a manager unification, process/application manager map, application-ID router, service locator, generic deferred container, global fallback, inactive-root restore, duplicate task service, nullable capability bag, compatibility parser, or modification of native Codex/Claude file tools. Exact types, lifecycle, inventory, and proof are normative in `integration-runtime-contracts.md` section 10 and `design-spec.md` DS-025/SR-012.

## SR-013 Exact General/Fixture Propagation Addendum

ARCH-REV-012 accepted the SR-012 architecture and found one bounded completeness problem rather than a new owner or behavior gap. The strategy is therefore not another refactor: close every reachable executable construction edge and prove the inventory.

| Junction | Exact decision |
| --- | --- |
| General custom Team manager | `GeneralProcessRunSupervisor` forwards `callbacks.taskRootResolver` beside its existing publish/message/platform callbacks and keeps its process manager/session dependencies. |
| Application custom Team manager | `createApplicationRunServices` forwards the same callback field beside its graph-local manager/session/memory dependencies. |
| Built-in mixed manager | `MixedTeamRunBackendFactory` forwards `input.callbacks.taskRootResolver`; the optional custom manager factory remains a legitimate strategy seam. |
| Executable factory methods | `createBackend` and `restoreBackend` require complete callbacks; remove `noopCallbacks`. `createBackendForNode` stays required. |
| Context-only use | `buildTeamRunContext` remains callback-free. The two named subteam-factory tests may construct a default factory only for this non-executable method. |
| Direct test/fixture construction | Update every current manager/factory/builder/context occurrence with an explicit resolver or exact context-only classification; one test-only fixture may own a clearly named explicit rejecting/root-returning resolver. |
| Architecture enforcement | Exact current-tree counts, forwarding shapes, `noopCallbacks` absence, omission/null/undefined cases, and the two context-only exceptions are executable contract evidence. |

This retains the one-catalog/two-execution-scope boundary and the one route/catalog/task implementation. It adds no `ApplicationExecutionScope`, manager router, container, event bus, compatibility wrapper, default resolver, or migration. Exact file and test paths are authoritative in the SR-013 `integration-path-inventory.txt` addendum; exact signatures and occurrence counts are normative in `integration-runtime-contracts.md` section 10.
