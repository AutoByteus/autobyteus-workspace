# Design Spec — Org/Team run-configuration performance

## Solution And Approval Basis
- Package `org-run-config-performance`; current solution revision **SR-010**; design **Ready for independent review**, 2026-10-03.
- Approved intended basis **SR-006, REQ-001–007 / AC-001–007 / SCN-001–005**. Exact approval: `evidence/user-application-scope-approval.json`; frozen presented text/hash: `evidence/approved-requirements-sr006.md`. No behavior-defining supplements.
- Authority: [requirements](requirements-doc.md) governs intent; [investigation](investigation-notes.md) governs evidence; this file governs technical decisions. New intent needs renewed user approval.
- Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance`, branch `codex/org-run-config-performance`, refreshed `origin/personal` base `1b976216da0cbd0cc84fef3fe22a2739325b8ad3`; eventual target `origin/personal`. Shared dirty checkout untouched. No release/deployment authorized.
- Read root `AGENTS.md`, `SOLUTION_DESIGN_BEST_PRACTICES.md`, `TESTING.md`, package instructions and bundled architecture standards. Independent review/implementation/changed-build validation/delivery artifacts: **N/A — not applicable yet**.

## Current-State Read
Three unnecessary dependencies are established, not an allegation about the entire application:
1. A fresh UUID member allocator consults unrelated active/history/path/collaboration locations. The measured 10-member/500-stored-Org fixture did **5000 historical collision tree reads** (not collisions).
2. Org create returns an ID; launch requests full history; context publication starts more full Org history reads. Around 500 roots responses are roughly 10 MB. Navigation equality serializes entire old/new workspace nodes, including Org trees.
3. The availability API aggregates all providers. Codex's own verification is fast in the sampled environment, but the aggregate response waits for unrelated Antigravity discovery.
Normal definition/configuration validation, durable creation and structural package admission are different operations. They remain. Initial/full history resynchronization remains necessary for mixed navigation; it is not the operation for publishing one changed Org.

## Task Size And Architectural Risk (Mandatory)
- **task_size: Medium** — three bounded slices across several server/renderer components, using existing runtime, identity and history owners. No new subsystem, persistence format, lifecycle manager or deployment mechanism. Constructor/test cleanup is broader than one local fix, but not a major subsystem replacement.
- **architectural_risk: High** — shared Agent allocator affects standalone, Team, Org, delegated/collaborator and application-scoped fresh identities; availability GraphQL contract changes; single-root history updates change request/publication ordering. These are material contract/blast-radius/async freshness surfaces.
- Evidence: F-007–013; exact caller/source pins `evidence/architecture-source-context-sr010.json`. Documentation/fixture volume and the 500-root payload are not sizing/risk reasons.
- Escalate a Design Impact if implementation needs a new owner, persistent index, global admission change, stream protocol change or broader client contract; a Requirement Gap if it would change defaults, supplied/resumed identity policy, supported outcomes or scope. Do not silently widen or downgrade.

## Architecture Investigation Evidence
See canonical investigation **SR-010 / F-009–013** and its source pins.
| Evidence | Observation | Decision | Limit |
| --- | --- | --- | --- |
| Allocator/identity/caller source, F-009 | UUID default; only allocator consumes production `containsRunId`; singleton factory only used by tests | Stateless fresh allocation; remove now-dead membership APIs/wiring | Probabilistic UUID uniqueness, not mathematical zero collision |
| Availability service/resolver/store/composable, F-010 | Selected-provider method exists; only aggregate transport exposes it; UI observes one array | Independent per-kind reads/publication through existing owners | CLI/provider latency and synchronous probe scheduling remain |
| History facade/catalog/core and Org service, F-011 | `getCatalogRow(id)` exists; active snapshot or one stored tree supplies row; create awaits durable history | Add bounded single-Org history read, leave create contract unchanged | Cold catalog admission may still initialize globally |
| History loads/context/stream/navigation, F-012/013 | Launch/activity/full-fetch wrappers amplify work; generation guards and stable projection references are meaningful | Scoped refreshes; remove duplicate publication and whole-workspace JSON equality | Genuine full refresh still reads full collection |
| Packaged baseline, F-005/006 | 500-root row medians 1766 ms warm / 1735 ms cold-renderer, multiple heavy snapshots | Comparative changed-build verification, not an absolute budget | Exact user's history/transcripts/active workload unknown |

## Intended Change
**Remove work before adding machinery.** No new cache, persistent identity index, worker/concurrency framework, pagination system or event bus.

### A. Fresh member identity: definition → UUID → ID
`AgentRunIdentityAllocator.allocateForAgentDefinition` retains required definition-ID normalization, definition loading/missing-definition error and existing name/token/ID-format functions. Generate once with `createUuidIdentityToken` (`node:crypto.randomUUID`), normalize and return. Keep the token injection only as a test seam supplying fresh valid tokens.
Remove reservations, 64-attempt retry, active/metadata/filesystem/history collision checks, memory layout and collision-only dependencies. Constructor accepts only definition service and token generator. Delete unused static singleton factory; tests instantiate explicitly. Remove production `containsRunId` methods and compound interface member now solely serving the removed check; retain real `findAgent`, `findAgentSync`, `listAgents`, root discovery and ambiguity checks used by execution/history.
Shared callers consume the same ID format and allocator method; only constructor wiring changes. Do not remove manager/planner/tree integrity checks or any imported/resumed/external-identity validation. Tests forcing identical token reuse are obsolete mechanism tests; they do not define fresh UUID behavior.

### B. Runtime readiness: publish independently verified rows
Replace aggregate GraphQL `runtimeAvailabilities` with:
- `runtimeAvailabilityKinds: [String!]!`: registered provider kinds only, no CLI/model probes; `RuntimeAvailabilityService.listRuntimeKinds()` returns existing registry keys.
- `runtimeAvailability(runtimeKind: String!): RuntimeAvailabilityObject!`: normalize required kind and call existing `getRuntimeAvailability`; unconfigured kind remains disabled with the service's reason. No probe for another kind.
Remove unused aggregate resolver/service method and old client query/generated operation; no legacy wrapper. Preserve all registered providers and their verification semantics.
Existing `runtimeAvailabilityStore` remains the sole UI capability owner. Add a per-kind fetch action and per-kind pending/error/current-request state. Collection initialization reads the cheap kind inventory, starts independent queries, and merges each validated matching row **as it resolves**, not after all settle. Collection completion flags may still serve collection callers, but never gate a verified selected row. Repeated form consumers share current per-kind work; force retry starts a new request for that kind and late superseded results are ignored. Reset transient requests/status with the owning store/backend lifecycle; no disk or new capability cache.
`useRuntimeScopedModelSelection` requests its effective/seeded kind directly, independent of inventory completion, and observes partial capability publication. Unknown/pending kinds must not be declared verified available. Native readiness uses its existing always-enabled server provider rather than optimistic frontend absence fallback. Other kinds enter choices after their own verified response; unavailable selected choices retain their identity/reason. A failed unrelated probe must not erase a successful Codex row.
Keep catalog/model/schema owners and exact choices unchanged. Catalog work may run in parallel with selected capability verification. Shared config fields treat **selected** verification pending as loading; selected failure/unavailability prevents launch with useful feedback. Existing retry reloads the selected capability and its catalog, not every runtime. Member override consumers must use the same scoped readiness, including inheritance/locked/blank cases. No auto-substitution of model/runtime/config.

### C. Org new-row/update publication: read one authoritative subject
Extend `CollaborationRootHistoryService` with `getAgentOrg(orgRunId)` and its injected Org catalog contract to include existing `getCatalogRow` (process supervisor already supplies the full catalog service):
1. Read that admitted catalog row through `AgentOrgRunHistoryCatalogService.getCatalogRow`.
2. For it only, use the active manager snapshot or its stored execution tree.
3. Apply the same root identity, archived/inactive visibility and field projection as `list()`; unknown/unadmitted/not-visible returns null, malformed/read failure throws. No enumeration of other Org/Team trees after readiness initialization.
Extract the existing one-row projection into one internal function shared by list/get, not a new owner/index. `list()` remains the mixed collection read, serving initial/periodic/explicit resync. Export existing GraphQL `AgentOrgRootHistoryObject` and add nullable `getAgentOrgRootHistory(orgRunId: String!)` in its resolver; the query transports exactly one Org history object, not an inspection/conversation envelope.
Keep `createAgentOrgRun` and `agentOrgRunStore.launch` ID-return contracts unchanged. After confirmed creation, `AgentOrgRunConfigPanel` starts `runHistoryStore.refreshAgentOrgHistoryItem(id)` instead of full refresh and navigates to that created Org as now. Row read is independent of workspace inspection/enrichment. Never infer a row from the definition or recreate a run if post-create history observation fails; retain the created ID/workspace and report history failure for retry/resync.
Share strict single-row decoding in `runHistoryStoreSupport.ts` with collection parsing. Verify returned root matches requested ID and tree. Store action upserts/removes only that root, sorts using existing order, retains other row references, and publishes navigation once per accepted result. Null removes only the requested row; it does not clear the family.
Replace context/checkpoint/termination/continuation and accepted-message full refresh triggers with scoped root reads. `applyAgentOrgActivity` becomes only a confirmed local active-bit patch, no network side effect, and no-ops for an equal existing bit or absent row. Context snapshot publication starts one scoped observation independently of that bit, so unchanged active state cannot conceal changed task topology. For an in-place accepted `collaborator_added` event, add a narrow optional `onExecutionTreeChanged` callback to the existing streaming service after successful current-generation application; the context store requests the same scoped history read. Task activation already checkpoint-hydrates and uses that publication. Notifications start nonblocking history observation; read failure is history feedback, not failure/rollback of an already accepted context/event. Do not refresh history on every presentation/token frame. Accepted SEND acknowledgement continues to refresh the **server-owned summary**, now only that Org.

**Preserve actual asynchronous freshness; do not add a coordinator framework.** Keep existing family-generation guards and independent family publication. Add only per-root request sequence and full-Org-snapshot commit revision to the existing history store/load actions:
- A scoped read starts a new sequence for that root and advances `agentOrgRequestGeneration`, invalidating older full snapshots. Capture current full-snapshot commit revision. Another root's scoped read does not invalidate this root's request.
- Confirmed changed local activity invalidates older reads for its own root and older collection snapshots. The subsequent scoped observation starts after this patch.
- Accept a scoped response only if its root sequence and captured full-snapshot revision remain current. A successfully committed newer full snapshot advances the snapshot revision, invalidating earlier scoped responses. Errors/superseded full responses do not count as commits.
- A successful scoped publication also advances the family generation so a collection begun while it was pending cannot later erase it. Scope updates do not advance the full-snapshot revision or invalidate other roots' updates.
- Validate before mutation. Preserve previous authoritative data on read/parse failure; record usable history error without clearing an unrelated collection error. Clear errors only on the matching successful retry/resync. Reset transient sequences on store/backend reset. Existing context/stream/selection generation and submission guards remain untouched.
This covers already-supported overlapping polling, creation, termination and context recovery, not invented duplicate-UUID or generic distributed-consistency cases. No server history version/schema is introduced. Existing polling is the cross-window/resync path.

**Reduce publication/comparison amplification:**
- Remove the unconditional final `fetchTree` wrapper topology rebuild; accepted workspace/Org branches already publish independently. Publish again only for a real later avatar/enrichment change that needs it, not merely because `Promise.all` finished. Keep recovery/reconnection and partial-family error behavior.
- Replace generic JSON serialization equality in `runHistoryNavigationProjection.ts` with typed presentation comparisons. Workspace scalar fields, Agent groups/runs and Org group headers are compared at presentation granularity; Org run entries are compared by their retained row references, **never by serializing/comparing their execution trees**. A replaced Org row correctly changes that branch.
- For Team projection reference reuse, compare all fields of `TeamTreeNode`, its finite display/member/execution-row structures and delete-lifecycle values explicitly; preserve unchanged Team/workspace buckets and exact focus/indexes. Do not compare raw runtime/configuration/conversation trees. Keep existing bucket reference reconciliation. Local comparators live in the projection file; no generic deep-equality/caching subsystem.
- Stable keys and existing selection/expansion ownership remain unchanged. Rebuild navigation indexes from the accepted projection as now; do not introduce a second index authority. O(history presentation rows) projection remains; the removed cost is full serialized subtree work and repeated heavy transfers/publications.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Kind | Approved REQ / AC | Trigger / current evidence | Change or preserved outcome | Target lifecycle / spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | 001–003 / 001–003 | Org Library config; F-001/010 | Selected Codex independently verified, exact owned references/options retained | Config → scoped capability/catalog → config ready; DS-001 |
| BEH-002 | User | 001–003 / 001–003 | Team config; F-002/010 | Same readiness, preserve coordinator/inheritance | Team/shared config → DS-001 |
| BEH-003 | User/System | 003–007 / 003–007 | Ready Org Run; F-005–009/011–013 | Fresh UUID, validation/admission, new row, hierarchy, no inference/implicit recipient | Create/commit → one-root history → workspace; DS-002/003 |
| BEH-004 | User/System | 002–004 / 002–004 | Discovery/config/read errors; source-supported | Useful loading/reasons/retry, no false launch readiness; last valid history retained | DS-001/003 recovery |
| BEH-005 | Operational | 005–007 / 005–007 | Explicit timing request, TESTING.md | Honest isolated comparable timings/work counts/cleanup | DS-004 |

## Relevant Supplemental Task Artifacts
Canonical inventory in investigation notes includes all raw evidence and historical user inputs.
| Artifact | Purpose / IDs | Relationship / status |
| --- | --- | --- |
| `performance-findings.md` | Runtime timing F-001–004; AC-001/005 | Factual pre-change discovery evidence, not design/approval |
| `launch-row-findings.md` and `evidence/launch-row-timing-summary.json` | Packaged creation/new-row traces; AC-005–007 | Primary comparative baseline plus explicit caveats; historical approval wording superseded by SR-010 |
| `evidence/launch-row-backend-trace.json`, CPU profile/summary/hotspot and source/fixture pins | Separate causal/work attribution; AC-006/007 | Instrumented evidence, not UI timing promise |
| Approval JSON/frozen requirements, resume and architecture source pins | Approved baseline/source reproducibility | Evidence owned here; approval applies only to SR-006 intended scope |
| Root guide + `design-guideline-result.md` | User-requested governance and anti-pattern learning | Root docs authored, unmerged; include in eventual ticket delivery, not a runtime framework |
| Product UI/UX, prior independent reviews | N/A — no Product request or prior review | No invented supplements |

## Task Design Health Assessment (Mandatory)
- Posture: **Performance / Refactor / Cleanup**; design issue **Yes**; root cause **Boundary Or Ownership Issue / Duplicated Policy Or Coordination**.
- Refactor now **Yes**: fresh allocation owns UUID generation, not historical proof; one-root observation must not use all-history publication; selected capability does not depend on unrelated discovery. Removals and interface decisions above implement this, not accelerate the wrong operation.
- Existing locations, catalog, manager, model selection and admission remain their real owners. No file/subsystem migration is needed.
- Deferral: `RootRunPackageReadinessIndex.admitCurrent` still rebuilds global structural admission (observed 501-root scan), and full resync still transfers full trees. This task leaves their invariants unchanged; residual history-sized cost must be measured/reported. Eliminating required admission without mapping cross-root invariants is not this approved fix. Follow-up requires evidence/design rather than an unreviewed cache/index.

## Terminology
**Fresh**: internally generated new UUID, not restore/import/supplied ID. **Scoped history observation**: one server-authored Org row/tree. **Cold** here: cold renderer/store via reload, not OS/server cold start. **Row-ready**: exact new root's DOM row exists; not first paint/token.

## Design Reading Order
Current facts → A/B/C decisions → behavior/spines → ownership/interfaces → removal/files → validation. Tables below project those decisions; they do not introduce additional services.

## Legacy Removal Policy (Mandatory)
No backward compatibility; remove in-scope obsolete flows. Delete collision scans/retries/reservations/unused factory and interfaces, old aggregate availability operation and blind refresh/JSON-equality paths. Do not retain feature flags, fallback to all-history-on-scoped-error or collision mode switches. Legitimate collection resync and existing identity integrity/admission are distinct paths, not legacy fallbacks.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
**Not Affected**. Existing Agent name+32-hex UUID IDs, Org/Team/Agent execution trees, launch snapshots, history index rows, messages, configurations and credentials remain unchanged. Current normal readers/writers continue using them. Evidence: UUID helper, Org create/manager/history catalog/core/store and representative copied stored fixtures/source hashes. Volume ~500 test-owned Org roots is evidence, not a disposal entitlement. No rewrite, backfill, schema-version change, dual read/write or new durable index. Per-kind/per-root request state is renderer transient state only. AC-003/006/007 continuity applies. Migration plan/conventions investigation **N/A**: no persisted transformation is designed; if that changes, return Design Impact and investigate canonical migration conventions before designing it.

## Data-Flow Spine Inventory
| ID | Scope | Behavior | Start → end | Governing owner / why |
| --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | 001/002/004 | Library config → exact selected launch-ready fields | Runtime selection/config owners; independent verified choices |
| DS-002 | Primary End-to-End | 003 | Run click → durable created Org ID | Org run service/manager; validation and fresh identities |
| DS-003 | Return-Event | 003/004 | Created ID or confirmed Org change → authoritative navigation row | History read/store; bounded transfer and fresh publication |
| DS-004 | Primary End-to-End, Operational | 005 | Test-owned setup → measured UI/assertions → cleanup receipt | API/E2E owner later; honest comparison |
| DS-005 | Bounded Local | 001/002/004 | Per-kind request → validated row or reason → selected readiness | Availability store; independent publication |
| DS-006 | Bounded Local | 003/004 | Full/scoped history response → freshness guard → state/index publication | History store/load actions; overlapping supported reads |

## Primary Execution Spine(s)
- DS-001: Library Run → Org/Team config + shared selection → capability store/GraphQL selected provider + existing model catalog → verified exact runtime/model/schema → launch-ready fields.
- DS-002: Run click → config validation/workspace resolution → Org mutation/service → fresh definitions + planner/UUID allocator/model validation → manager persistence/structural admission + durable history commit → created ID.
- DS-004: disposable fixture/setup → normal UI exact choices → phase clocks + HTTP/DOM/work assertions → comparative report/errors → exact owned cleanup.

## Spine Narratives (Mandatory)
DS-001 makes independent capability responses observable before collection completion; the selected schema cannot report ready while its runtime check is pending/failed. DS-002 changes only the allocator dependency; current validation and durable creation still precede success. DS-003 observes that successful identity or a real root change through the history authority, updates only its row, and makes navigation visible independently of workspace hydration. DS-004 proves the current changed build, not the installed baseline. DS-005/006 implement only the request guards needed by these existing async callers; no new domain control node.

## Spine Actors / Main-Line Nodes
Operator/config panel; runtime selection/store and provider; Org service/planner/manager; history facade/store and navigation; operational test harness. GraphQL is transport, stores own publication, not server business invariants.

## Ownership Map
| Owner | Concrete responsibility |
| --- | --- |
| Config/shared selection | Draft choice/inheritance/schema readiness; no capability assumptions |
| RuntimeAvailabilityService / store | Provider verification/registry; renderer per-kind results and request lifecycle |
| AgentRunIdentityAllocator | Definition-derived fresh UUID formatting only |
| Org run service / manager | Fresh configuration, create/restore/termination, persistence/admission and run lifecycle |
| CollaborationRootHistoryService / Org catalog | Mixed/single-root read projection / durable summary/admitted row authority |
| History store/load actions / navigation projection | Accepted response freshness, history rows / typed presentation and derived indexes |
| Org contexts/stream | Current-generation context/event validity; request history observation at meaningful changes |

## Thin Entry Facades / Public Wrappers (If Applicable)
GraphQL resolvers translate explicit runtime kind or Org root ID to the owning service; they must not probe other providers, enumerate history themselves or implement durable creation. The mixed history service governs only read composition; family catalogs/managers retain subject authority.

## Removal / Decommission Plan (Mandatory)
| Remove | Replacement / scope |
| --- | --- |
| Allocator `hasCollision`, path/metadata/team checks, reservations, retry loop, collision-only imports/options/wiring, unused singleton | Definition + UUID generation; in this change |
| `containsRunId` in compound and three family location services; related mocks/mechanism tests | No replacement for removed fresh-history proof; keep actual location APIs; in this change |
| Aggregate runtime resolver/query/service method and generated operation | Cheap kind inventory + selected query; in this change |
| Launch/activity/ack/checkpoint full refresh amplification | Single-root observation; initial/timer/explicit collection resync retained |
| Blind final topology publication and generic JSON equality | Accepted branch/real enrichment publication; typed display comparisons |
| Global admission or full-history schema | **Not removed**; distinct preserved function and residual cost |

## Return Or Event Spine(s) (If Applicable)
DS-003: confirmed create ID / context checkpoint / accepted summary acknowledgement / terminal state / applied collaborator tree change → scoped store read → GraphQL history facade → admitted catalog + active snapshot or one stored tree → strict root decoding/request guard → one-row upsert/remove → navigation row/index → existing workspace selection/expansion. No inference on launch.

## Bounded Local / Internal Spines (If Applicable)
DS-005: existing availability store, request(kind) → mark that kind pending → own provider result → current-request/matching-kind guard → merge row or error. DS-006: existing history owner, start full/scoped read → capture family/root/snapshot state → parse response → guard → atomic accepted publication. See C for exact ordering. Background timer cadence remains 5000 ms.

## Off-Spine Concerns Around The Spine
| Concern | Spines / serves | Responsibility / misplaced risk |
| --- | --- | --- |
| Definition/workspace/model/schema/admission validation | 001/002; run service | Required launch integrity; must not become removed collision proof |
| UUID/token helper | 002; allocator | Existing ID format/randomness; must not own historical location |
| Catalog/tree readers, row decoder | 003; history owners | Durable meaning/root validation; transport/UI must not read files or invent row summaries |
| Typed comparators/stable keys | 003; projection | Display reference reuse/selection; no general serialized-tree equality |
| Measurements/cleanup | 004; validation | Evidence/isolation; no production timing cache/hooks left installed |

## Ownership Boundaries
Runtime probes stay behind runtime service; IDs behind allocator; creation/admission behind Org service/manager; history meaning behind catalog/facade; renderer freshness/publication behind history store. Contexts notify history, never assemble durable summaries or rewrite its collection.

## Boundary Encapsulation Map
| Boundary | Encapsulates | Caller / forbidden bypass / remedy |
| --- | --- | --- |
| Runtime service | Registry/provider probes | Resolver; no resolver CLI calls; expose inventory/selected methods |
| Org run service | Planner, validation, manager/history lifecycle | Mutation; no resolver allocator/store create shortcuts |
| History facade | Family catalog + active/stored one-row read | Resolver; no frontend inspection-as-history or resolver disk access; add scoped method |
| History store | Decode/order/request guards/projection | Config/contexts; no direct array/navigation writes; expose scoped action |

## Dependency Rules
Maintain existing web boundary: no core/server imports in web or web test scaffolding. Reuse published DTOs and existing client schemas. No allocator → memory/history/location dependency. GraphQL → public services, not public boundary plus its internals. No view → tree store or definition-derived history row. Context/stream → history public action only. Runtime availability never waits for model discovery of another runtime as a dependency. No new persistent/cache state, retry queue, compatibility branch or mutation-to-inference shortcut.

## Interface Boundary Mapping
| Interface | Subject / identity / responsibility |
| --- | --- |
| `allocateForAgentDefinition(agentDefinitionId)` | Agent definition → fresh ID; does not accept existing run ID |
| `listRuntimeKinds()` / `runtimeAvailabilityKinds` | Registered runtime-kind inventory without verification |
| `getRuntimeAvailability(kind)` / `runtimeAvailability(kind)` | Exactly one runtime's verified capability/reason |
| `getAgentOrg(id)` / `getAgentOrgRootHistory(orgRunId)` | Exactly one admitted/visible Org root row or null; no ambiguous Agent/Team ID selector |
| `refreshAgentOrgHistoryItem(id)` / `applyAgentOrgActivity(id,active)` | Authoritative scoped read / confirmed active-bit patch with no I/O |
| `onExecutionTreeChanged` | Applied current Org tree change notification, not a new stream message/schema |

## Interface Boundary Check
All interfaces have one explicit subject/identity; ambiguity Low. Inventory is not enabled-kind output; null history is not an empty collection; request error is not null. Keep those meanings separate in types/decoders/tests.

## Main Domain Subject Naming Check
Retain natural existing runtime/Agent/Org/history names. New names specify kind inventory versus verification and Org root row versus full inspection. No generic resolver/cache/registry/coordinator service is added.

## Existing Capability / Subsystem Reuse Check
Reuse identity formatter, runtime provider registry/selected check, Org create/admission, admitted history catalog/get row, strict DTO/schema, history store and navigation projection. Extend only transport/scoped read/request state. **Create New subsystem: None**.

## Subsystem / Capability-Area Allocation
Execution owns fresh IDs/configuration/lifecycle; runtime-management owns capability checks; run-history owns collection/single-root composition; GraphQL owns transport; renderer stores/composable own readiness/publication; existing projection owns navigation. No ownership moves; source locations already express these boundaries.

## Draft File Responsibility Mapping
Initial mapping considered returning a history payload from create and reusing full inspection. Reject both: create already returns a valid ID; inspection carries unrelated conversation/context work. Tighten to one existing history-facade method, existing store action and strict shared row decoder. No new owner/file needed just to forward it.

## Reusable Owned Structures Check
Reuse `RuntimeAvailabilityObject`, `AgentOrgRootHistoryObject`, `AgentOrgRunHistoryItem`, published Org tree DTO and existing stable navigation keys. Factor one internal row projection and one strict row decoder for single/list reuse. Do not create overlapping launch-history or inspection-history DTOs.

## Shared Structure / Data Model Tightness Check
Inventory kind identifies a provider; capability row distinguishes verified enabled/reason from pending/error UI state. Root history row retains one catalog summary plus one authoritative tree; no duplicate tree/identity fields added. Per-root sequences and snapshot revision are transient request metadata, not server history versions. Typed comparators compare presentation fields only; never a second domain schema.

## Final File Responsibility Mapping
Paths below are relative to the task worktree (server `src/...` rows are under `autobyteus-server-ts`). Change inventory: **Modify** listed existing files; **Add** scoped methods/query/callback and focused tests inside their owners; **Remove** obsolete methods/queries/branches listed above; **Rename/Move: None**. All changes land within existing files/owners unless focused tests require a new colocated test file.
| Files | Concrete change / owner |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts` | Stateless fresh definition→UUID ID; remove collision dependencies/factory |
| `src/agent-execution/runtime/general-process-run-supervisor.ts`, `src/application-platform/execution/application-execution-scope-kernel-builder.ts`, `src/agent-execution/services/agent-run-provisioning-service.ts`, `src/agent-team-execution/services/team-run-service.ts` (server) | Remove allocator-only injected options; retain locations/metadata used elsewhere |
| `src/agent-collaboration/execution/services/collaboration-execution-location-service.ts`, `src/agent-org-execution/services/agent-org-execution-tree-location-service.ts`, `src/run-history/services/team-run-execution-tree-location-service.ts`, `src/agent-run-collaboration/services/agent-run-collaboration-location-service.ts` (server) | Delete dead membership API/type/mocks, preserve real lookup/discovery |
| `src/runtime-management/runtime-availability-service.ts`, `src/api/graphql/types/runtime-availability.ts` (server) | Cheap registry inventory / singular verified transport; remove aggregate path |
| `src/run-history/services/collaboration-root-history-service.ts`, `src/api/graphql/types/collaboration-root-history.ts` (server) | One internal shared projection, public admitted single-Org read/query |
| `autobyteus-web/graphql/queries/runtime_availability_queries.ts`, `graphql/queries/collaborationRootHistoryQueries.ts`, `generated/graphql.ts` | New query documents/schema-generated types; remove obsolete aggregate operation |
| `autobyteus-web/stores/runtimeAvailabilityStore.ts`, `composables/useRuntimeScopedModelSelection.ts`, `components/launch-config/RuntimeModelConfigFields.vue`, relevant `components/workspace/config/MemberOverrideItem.vue` consumers | Per-kind state/publication, selected readiness/loading/retry; retain exact models/schema |
| `autobyteus-web/components/workspace/config/AgentOrgRunConfigPanel.vue` | Confirmed ID → scoped history observation + current navigation; no second create on read failure |
| `autobyteus-web/stores/runHistoryStore.ts`, `runHistoryLoadActions.ts`, `runHistoryStoreSupport.ts` (+ `runHistoryTypes.ts` if needed for transient state signatures) | Single-row decode/upsert/error/request guard; remove redundant global publication/refresh side effects |
| `autobyteus-web/stores/agentOrgContextsStore.ts`, `services/agentOrgExecution/agentOrgStreamingService.ts` | Meaningful root-change scoped notifications; no protocol or token-frame refresh |
| `autobyteus-web/stores/runHistoryNavigationProjection.ts` | Typed display/reference comparisons, keep indexes/bucket identity |
| Existing focused server/web tests and E2E probe request mocks | Required outcomes/new contracts; remove assertions of obsolete machinery |
| Root `AGENTS.md`, `SOLUTION_DESIGN_BEST_PRACTICES.md`; ticket docs | Already authored governance included in eventual delivery; factual examples remain labeled baseline |

## Applied Patterns (If Any)
Existing subject facade plus bounded query; existing per-owner latest-request guards; immutable accepted row replacement and stable keys. These are local implementation shapes, not new abstractions/services.

## Target Subsystem / Folder / File Mapping
Change the files in the preceding table in place. No new folders/modules, production file moves or shell changes. Focused tests belong in existing `tests/unit`, `tests/integration`, `tests/e2e` (server) and colocated `__tests__`/`tests/e2e` (web). Server transport remains `api/graphql`, domain/control `agent-*/runtime-management`, history providers `run-history`; renderer transport `graphql`, state `stores`, shared field logic `composables/components`.

## Folder Boundary Check
Existing transport/control/provider/presentation separation remains clear; mixed store action files are justified by existing request/publication responsibility. Adding a wrapper folder/helper subsystem would over-split this delta. Web cannot depend on server/core, including tests.

## Concrete Examples / Shape Guidance (Mandatory When Needed)
- Good: new member `definition → randomUUID → formatted ID`; avoid `member → 500 historical trees` or a faster cache around that scan.
- Good: confirmed `org-123 → getAgentOrgRootHistory(org-123) → one row`; avoid `org-123 → ~10 MB mixed history → whole-workspace JSON equality`.
- Good: Codex capability merges when verified while AGY query is pending; avoid optimistic enabled flags or a single aliased multi-provider GraphQL response (it still waits for all fields).
- Freshness: full request F starts; scoped S commits; F must not remove S's new row. Conversely a later full snapshot commits before old S returns; S is rejected. Different roots' scoped responses may both publish. No simulated server version is needed.

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision / replacement |
| --- | --- |
| Optional collision mode / old allocator options or singleton only for tests | Rejected; remove; tests use fresh unique tokens/current constructor |
| Old aggregate availability query alongside new UI flow | Rejected; update all repository query/generated/probe consumers together |
| Scoped-read failure automatically fetches all history | Rejected; retain last valid row/error, explicit retry and existing periodic resync |
| Dual persisted history/ID shape or migration | N/A — no persisted shape change |
| List history retained | Not compatibility; genuine current initial/resync collection operation, not launch/activity implementation |

## Derived Layering (If Useful)
UI/config → renderer owner → GraphQL public boundary → existing server subject owner → provider/store. Events return through context owner → history store. No new layer is needed.

## Change / Refactor Sequence
1. Implement allocator deletion and constructor/dead-interface cleanup together; update shared caller mechanism tests without weakening current manager/tree/config integrity.
2. Replace availability API/query/generated contracts and store/shared fields together; prove partial readiness and selected error/retry before timing.
3. Add single-Org history service/query/shared strict decoder; prove list/get row agreement, admission/visibility, active/stored behavior and bounded tree reads.
4. Wire confirmed launch/context/tree/ack changes to scoped action; preserve full resync and request guards; remove blind publications/side effects. Replace JSON comparisons while retaining meaningful projection references.
5. Regenerate GraphQL against a **test-owned current server** via the existing `autobyteus-web/codegen.ts` endpoint environment; never user's backend. Update existing probe operation mocks. No compatibility seam left at completion.
6. Run implementation-scoped checks, then independently owned executable validation through TESTING.md. Include requested root docs in eventual documentation sync/finalization. Do not release/merge here.

## Key Tradeoffs
One small post-create history request is preferred to coupling create to a new payload or transferring inspection conversations. Some same-root scoped reads may overlap; latest-result guards preserve correctness without a general coalescing queue. Periodic collection scans remain a resync cost; the targeted launch path no longer depends on them. Typed presentation equality requires maintained field coverage but avoids serializing execution trees and preserves Team identity. Inventory+per-kind HTTP calls replace one aggregate response: more small requests, independently publishable verified results, no unrelated completion gate.

## Risks
Shared fresh-ID blast radius and changed GraphQL contracts warrant independent review. Review request ordering and collection/scoped error semantics, Team projection equality coverage, actual in-place collaborator freshness and test reset lifecycle. Synchronous provider probes may occupy the server event loop; no worker/probe rewrite is justified by the current evidence. Remaining structural-admission/full-resync work may dominate after deletion; measure honestly, return findings rather than silently expanding. Exact live-user dataset/concurrent inference remains unmeasured. No current-source performance gain or application pass is claimed before implementation/changed-build tests.

## Guidance For Implementation
Acceptance/verification belongs to implementation and API/E2E owners; the following is required coverage, not an executed pass:
- AC-001/002: controlled pending unrelated discovery with Codex selectable; unavailable/missing CLI, matching-kind validation, retry, late same-kind force result, inventory error with independently selected check, other providers and inherited/blank/locked configs.
- AC-003/004/006: real fresh Org/Team/standalone/task/application-scoped allocator usage, valid unique UUID/name format, missing definitions/invalid configuration still blocked, no collision-location/metadata/path dependency. ~500 saved Org fixture / same 10 members asserts **zero collision-purpose tree reads**, separating admission/history reads. Do not claim total tree I/O zero. Preserve old package bytes/IDs, exact Codex/GPT-6.1 Sol/config and unselected recipient; launch submits no inference.
- AC-007: list/get authority parity, admitted/archived/active/stored/null/error behavior and no unrelated tree reads after initialization; exact new row despite pending full history/workspace hydration; partial-family failure and retry; older full versus scoped, older scoped versus newer full, same-root overlaps and independent different roots; termination/summary/task/checkpoint/collaborator changes; stable hierarchy/focus/expansion and unrelated Team buckets. Equal activity must not fetch or rebuild; accepted branch publishes once; no navigation whole-tree serialization.
- Focus current server tests `tests/unit/agent-execution/agent-run-identity-allocator.test.ts`, Org service/model/config/history-order and mixed-history readiness tests, and shared Team lifecycle integration suites. Remove test-only singleton setup and constant duplicate-token assumptions; instantiate/inject current capabilities with fresh tokens. Add focused resolver/service cases as needed.
- Focus web availability/shared selection/config/override tests, `agentOrgHistoryApollo.spec.ts`, `runHistoryStore.spec.ts`, `runHistoryNavigationProjection.spec.ts`, Org context/stream/config panel/history regressions. Retain meaningful equality/voice-lifetime/selection tests; do not simply delete assertions that reflect user-visible continuity. Run commands once (`--run`/`--no-watch`) per TESTING.md.
- AC-005–007: independent API/E2E runs current-worktree isolated **packaged build**, normal imported AutoByteus Org and Team journeys, test-owned copied fixture, no model send. At least 5 cold-renderer/5 warm small and comparable ~500-root samples; measure config/capability/catalog, actual Run click→create response, workspace and **exact new row** separately; report medians/ranges/counts/errors/build/hash/node/host/observer effects. Separate instrumentation work counts from low-overhead primary UI timings. Recreate an equivalent baseline if packaging/base conditions changed; installed pre-change binary cannot validate changed source.
- Preserve original baseline/raw evidence and cleanup every owned instance/client/hook/fixture using exact ownership receipts. Never touch user app/data/credentials. Missing prerequisites or unavailable exact model are reported, not substituted/passed. No release/deployment/finalization authorization inferred. Material discoveries return to Solution Designer.
