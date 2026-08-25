# Latest-Personal Refresh Round 2 Design Analysis — SR-005

## Status And Decision

- Status: Architecture-approved SR-005 design basis but not merged; its target ref was superseded before implementation. Physical-scope/migration decisions remain normative and are incorporated into current SR-006; current merge authority is `latest-base-refresh-round-3-design-analysis.md`.
- Trigger: delivery `DR-006` / `latest-base-refresh-round-2-conflict-report.md`.
- Protected checkpoint: `a23849f165879050e2c9b676a2e9652d8a593c93`.
- Integrated Personal base: `7edfb162559ec5a6eb4c00c23a929920eabe3dc1`.
- Target Personal ref: `a00f0d07d00450785c424b6ab79d2ca8fe828869`.
- Measured advance: five commits; divergence 145 ahead / 5 behind; three content conflicts; six changed-both paths.
- Decision: perform one history-preserving semantic merge after architecture approval. Adopt newest Personal nested physical-scope/history/migration behavior through its current owners while retaining the verified application's graph-local dependency family, prepared activation/platform binding, and exact scoped cleanup.
- Production source status: no merge or production edit has started; the Git index has no unmerged paths.

This supplement is normative for `REQ-009`, `AC-016`–`AC-020`, `DS-013`, and `DS-014`. Earlier provider/model/error authority remains in `latest-base-refresh-design-analysis.md` and is not reopened.

## Evidence Summary

| Evidence | Result | Design consequence |
| --- | --- | --- |
| DR-006 fetch/path/migration/merge-tree log | Exact target `a00f0d07d...`; three conflicts; clean index | Do not treat delivery as an implementation candidate |
| Five-commit source diff | Physical scope, nested memory/history, migration, frontend navigation, docs/tests | Newest Personal owns the new behavior |
| Current application construction | Recursive `createTeamManager` supplies one graph-local run/session/memory/context/workspace family | Preserve dependency identity at all nesting depths |
| Production conflict | Ticket has correct injection/cleanup but root-only nested memory; Personal has correct scope but default/global service lookup | Combine inside existing leaf owner; no new service |
| Migration source/registry | Required `ANYTIME` migration depends on TeamRun V1 and precedes dependent snapshot migrations | Use existing startup migration authority in both hosts |
| Personal completed-ticket evidence | Unit/E2E/real restart/memory/frontend proof exists for nested behavior | Retain and rerun it as current-baseline evidence |
| DR-005 ticket evidence | Real Studio/standalone, package, provider, Agent Tools, recovery, Electron proof passed at protected checkpoint | Preserve and rerun affected/full proof on integrated commit |

## Product-Reachability And Material-Premise Matrix

| Premise | Independent supported trigger / contract | Forward production path | Classification | Material consequence |
| --- | --- | --- | --- | --- |
| Application nested configured member uses memory | Maintained application/team definition contains a nested team; business action starts/restores it | application command -> team manager -> child factory -> member handle -> AgentRun memory | Reachable | Root-only location hides current nested memory after restart |
| Application task agent/task team uses memory | Supported delegation creates task execution | delegation -> task registry/factory -> containing TeamRun context -> leaf AgentRun | Reachable | Wrong physical path breaks task history/memory continuity |
| Application member terminates | Supported terminate/stop/inactive cleanup | member handle -> exact run/session cleanup | Reachable | Selecting Personal conflict side can revoke through wrong process family or leak application sessions |
| User upgrades Electron/Studio/standalone data root | User installs/runs newer tracked build with existing data | host start -> app-data migration runner -> application readiness | Reachable | Runtime current path cannot directly find old flat nested memory |
| Fresh/current/direct-root data | Normal first run or current layout | same migration phase -> explicit no-op/current classification | Reachable | Must not create unnecessary writes or fallback machinery |
| Both old and new directories exist | Existing migration's operational conflict classification; can arise from prior interrupted/manual recovery tracked by product migration contract | migration scan -> source+target classification | Reachable under migration contract | Must preserve both and warn, not overwrite or merge |
| A new application package solely to test nesting | No user/product requirement; test-only mechanism | synthetic package addition | Not Reachable as product need | Reject source/package scope expansion |

## Semantic Authority Matrix

| Subject | Authority | Retained behavior |
| --- | --- | --- |
| Dual-host assembly/application boundary | verified ticket checkpoint | distinct Studio/standalone builders, four projections, same business behavior |
| Application run/session/memory dependency identity | verified ticket checkpoint | exact injected graph-local `AgentRunManager`, `AgentToolMcpSessionManager`, `AgentMemoryLocationService`, context/workspace services |
| Prepared activation/platform binding | verified ticket + current Personal activation owners | `prepareNewAgentRun`, private candidate, durable publication, platform binding, abort/quarantine, release-after-commit |
| TeamRun physical persistence identity | newest Personal | normalized immutable root plus ordered ancestor TeamRun IDs |
| Root/child propagation and restore lookup | newest Personal | root empty ancestry, child append exactly once, index reconstruction from containing TeamRun |
| Nested configured/task/team memory placement | newest Personal | leaf memory path includes complete containing-TeamRun ancestry |
| Exact application Agent Tools cleanup | verified ticket | injected session manager and `revokeAgentToolMcpSessionsForRun(agentRunId)` |
| Old flat nested memory transition | newest Personal app-data migration | isolated whole-directory move after TeamRun V1, explicit outcomes, no runtime compatibility |
| Nested history/memory sync/settled task navigation | newest Personal | current restart hydration and historical UI semantics |
| Launch config/provider/error behavior | implemented SR-004/DR-005 state | unchanged |

## Target Runtime Boundary

### Physical Scope Contract

`TeamRunPhysicalScope` is exactly:

```ts
type TeamRunPhysicalScope = Readonly<{
  rootTeamRunId: string;
  ancestorTeamRunIds: readonly string[];
}>;
```

Invariants:

1. all IDs are nonblank and normalized;
2. ancestor IDs are distinct;
3. the root ID is excluded from ancestors;
4. a root TeamRun uses `[]`;
5. a child TeamRun receives `parent.ancestorTeamRunIds + childTeamRunId`;
6. the context's containing TeamRun is `ancestors.at(-1) ?? rootTeamRunId` and must equal `teamRunId`;
7. scope is persistence identity only; it is not member address, application identity, or a host-mode selector.

### Primary Spine — Nested Application Execution

`application business demand -> ApplicationRunBindingLaunchService/current team launch -> root MixedTeamRunBackendFactory creates root scope -> configured/task MixedSubTeamRunFactory appends child TeamRun ID -> recursively constructed MixedTeamManager with exact graph-local dependencies -> MixedAgentMemberHandle -> injected AgentMemoryLocationService.getTeamAgentRunLocation({...teamContext.physicalScope, agentRunId}) -> prepareNewAgentRun -> durable activation/platform binding -> provider run -> exact injected MCP session cleanup`

Construction creates services and factories only; it does not create Agent or Team business runs. The application remains the demand source.

### Return/Cleanup Spine

`terminate | stop | inactive removal | abort -> member/run cleanup -> injected AgentToolMcpSessionManager.revokeAgentToolMcpSessionsForRun(agentRunId) -> detach current application resources -> exact cleanup result`

Physical scope changes memory identity only. It does not weaken claim identity, publication, resource ownership, or session revocation.

### Allowed Dependencies

- root factory -> `createRootTeamRunPhysicalScope`;
- child configured/task factory -> `createChildTeamRunPhysicalScope(parentContext.physicalScope, childTeamRunId)`;
- `TeamRunContext` -> immutable physical scope validation;
- application root construction -> recursive `createTeamManager` closure with exact graph-local collaborators;
- leaf handle/task registry -> supplied team context plus injected memory/session/run services;
- memory service -> physical scope plus AgentRun ID.

### Forbidden Dependencies

- leaf handle reconstructing scope from `memberAddress`, definition tree, or process-global execution index;
- application nested manager calling default/global run/session/memory/context services;
- root-only `ancestorTeamRunIds: []` for a nested containing TeamRun;
- scope used as application routing or collaboration identity;
- construction-time business run creation;
- compatibility alias/dual physical scope shape.

## Migration Design

### Persisted-Data Decisions

| Subject | Decision | Basis |
| --- | --- | --- |
| Current launch override rows | Directly Usable — No Migration | Already verified current sparse rooted contract; unrelated to physical memory change |
| Current TeamRun V1 metadata/index | Directly Usable — No Migration | Contains enough current `containingTeamRunId` information to derive scope |
| Old flat nested Team Agent memory directory | Migration Required | Current runtime path differs; data is user memory and not safely rebuildable/discardable |
| Current nested layout | Not Affected | Canonical target already exists |
| Direct-root team Agent memory | Not Affected | Root scope remains empty ancestors |
| Standalone non-team Agent memory | Not Affected | Uses standalone Agent layout, not Team Agent layout |

### Startup Spine

`Studio server-runtime or standalone starter -> existing AppDataMigrationRunner.runPending -> TeamRunExecutionTreeV1 migration prerequisite -> TeamAgentMemoryLayoutAppDataMigration -> dependent RemoveExternalRuntimeWorkingContextSnapshots / MigrateNativeWorkingContextSnapshotsV5 -> remaining process prerequisites -> ApplicationPlatformLifecycle.prepareBeforeListen -> listen/readiness`

There is one runner and one ledger. The migration does not belong to `ApplicationPlatformLifecycle`, an application package, a worker, or a business command.

### Item Decision Table

| Old flat source | Current target | Result | Data policy |
| --- | --- | --- | --- |
| Missing | Missing | `SKIPPED_UNMATERIALIZED` | no write |
| Missing | Directory | `SKIPPED_ALREADY_CURRENT` | no write |
| Directory | Missing | create parent, `rename`, verify | `MIGRATED` only after postcondition |
| Directory | Directory | preserve both | warning; no merge/overwrite/delete |
| Unsupported | Directory | preserve residue | warning |
| Unsupported | Missing | preserve | explicit failure |
| Any | Unsupported target | preserve | explicit failure |
| Operation/postcondition failure | any | preserve/report | explicit failure |

The migration records deterministic counts and bounded sorted examples. `FAILED` and `SUCCEEDED_WITH_WARNINGS` remain visible through the existing migration result/ledger policy. Host startup retains the current behavior of logging failed/running app-data statuses and continuing unless an existing separately named startup gate blocks; SR-005 does not invent a new fatal gate. Its `ANYTIME` policy owns supported retry; runtime code never compensates.

### Direct And Skip-Version Upgrade

- Direct `7edfb... -> a00f0d...`: prior TeamRun V1 is already current; memory migration derives scopes and moves affected old flat directories.
- Skip from before TeamRun V1: registry prerequisite runs TeamRun V1 first; memory migration consumes the resulting current packages.
- Fresh root: no current roots/affected directories; migration completes as a no-op.
- Previously completed/current layout: target exists and flat source is absent; no rewrite.

No Prisma migration, DB schema change, package schema change, backup copy, read-time conversion, or dual-write is added.

## Exact Conflict Resolution Map

| Path | Ticket-side authority | Personal-side authority | Target decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | injected graph-local session/memory services; prepared activation/platform binding; exact run-session revoke | complete `teamContext.physicalScope` for memory | retain ticket structure/dependencies and replace root-only coordinate with `{...physicalScope, agentRunId}` |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts` | `prepareNewAgentRun`, explicit injection, platform binding/activation semantics | root/child scope fixtures and nested expected path | combine; assert exact ordered ancestry and no global fallback |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts` | prepare/seal/durable commit/release work, application dependency semantics | nested task-agent fixture/path | combine; assert containing nested TeamRun scope plus atomic lifecycle |

Whole-file `ours` or `theirs` is forbidden for these paths.

## Marker-Free Changed-Both Audit

| Path | Auto-merged result | Decision |
| --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services/team-run-execution-tree-location-service.ts` | physical scope lookup through current execution index plus ticket stored-only manager construction | Retain after compile/focused proof |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts` | physical-scope fixture plus exact `revokeAgentToolMcpSessionsForRun` assertions | Retain |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-termination.test.ts` | physical-scope fixture plus exact ticket termination behavior | Retain |

## Exact Change Inventory

### Add / Accept From Newest Personal

- `autobyteus-server-ts/src/agent-team-execution/domain/team-run-physical-scope.ts`
- `autobyteus-server-ts/src/app-data-migrations/migrations/team-agent-memory-layout-app-data-migration.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/team-run-physical-scope.test.ts`
- `autobyteus-server-ts/tests/unit/app-data-migrations/team-agent-memory-layout-app-data-migration.test.ts`
- `autobyteus-server-ts/tests/e2e/run-history/nested-team-history-restart.e2e.test.ts`
- newest Personal completed-ticket artifacts under `tickets/done/nested-team-history-restart-hydration/` as historical evidence, not runtime dependencies.

### Modify / Semantically Resolve

The three conflict paths in the exact map above.

### Retain Audited Auto-Merges

The three marker-free paths in the audit above.

### Accept Clean Newest-Personal Production Changes

- Agent memory location domain/service current physical-scope input;
- root TeamRun/context/root and child mixed factories, subteam handles, task-team registry, execution index;
- migration registry and dependent snapshot prerequisite changes;
- nested history restart/hydration and settled-task frontend selectors/state;
- current server/web documentation for team execution, memory, migration, and history.

### Modify/Audit Tests And Docs

Retain all newest Personal affected unit/integration/E2E/frontend tests, including mixed manager/member/subteam/task-team paths, migration/TeamRun V1, memory sync, nested restart, historical lazy hydration, run-open/navigation/view-state/store projections. Reconcile only the two conflicted tests rather than duplicating their assertions in new files.

### Remove / Do Not Add

None for this five-commit source delta. Do not restore any path removed by earlier integration, and do not add:

- a second migration runner/coordinator;
- old/new memory-path adapter or alias;
- global fallback in an application path;
- a maintained test-only application package;
- package/host-specific nested-scope branches.

## Implementation Sequence

1. Re-fetch `origin/personal` and require exact `a00f0d07d...`; if moved, stop and reclassify.
2. Protect/confirm `a23849f...`; perform one merge; preserve delivery-owned dirty artifacts.
3. Accept non-overlapping newest Personal source/tests/docs/ticket evidence.
4. Resolve the three conflicts by the exact map; retain the three audited auto-merges.
5. Run TypeScript/build and focused unit tests for physical scope, both conflict paths, session cleanup, termination, migration, TeamRun V1, nested history, memory sync, and frontend history state.
6. Run architecture/source review before API/E2E.
7. API/E2E investigates current coverage and executes newest Personal nested restart/migration plus retained real Studio/standalone journeys on one integrated commit.
8. If durable coverage changes, return through code review; then delivery re-fetches Personal, rebuilds Electron, smoke-tests, and records integrated state.

## Verification Matrix

| Proof | Required evidence |
| --- | --- |
| Git | target ancestry, merge parents, clean index, no conflict markers, six-path decision ledger |
| Physical scope | root empty, multiple nested ordered/distinct, containing-TeamRun invariant, restore/index lookup |
| Application dependency identity | exact injected run/session/memory/context/workspace services at root and nested depth; no default getters |
| Activation | prepared candidate, durable commit/publication, platform binding, abort/quarantine, task release-after-commit |
| Cleanup | exact application MCP session revocation and termination/inactive/stop behavior |
| Migration unit | all decision-table cases, deterministic detail bounds, prerequisite/registry order, retry/status behavior, no merge/overwrite |
| Migration E2E | direct and skip-version upgrade, fresh/current no-op, subsequent snapshot migration order |
| Nested production | configured team, task agent/team, arbitrary nesting, memory sync, cold restart/history hydration |
| Frontend | active view hides settled tasks; historical view preserves/navigates settled nested task rows |
| Existing application | architecture boundaries, real Brief/Socratic Studio and standalone Codex/Luna, Agent Tools, handoff/publication/projection, recovery/cleanup |
| Package/Electron | package parity/builds and a newly rebuilt Electron artifact/smoke on current integrated ref |

A new maintained nested application package is not proportionate: newest Personal already supplies real nested restart evidence, while application-specific correctness is proven by focused exact-dependency construction/activation/cleanup tests and the retained dual-host real packages. Coverage investigation may reuse an existing maintained nested package if one exists, but may not invent product scope solely to satisfy a test shape.

## Preserved Behavior Matrix

| Behavior | Preserved target |
| --- | --- |
| Studio vs standalone | Host start/ingress differs; application business execution remains shared |
| Provider defaults | Brief/Socratic Codex + GPT-5.6 Luna unchanged |
| Application Agent Tools | internal scoped route/session/publication unchanged; Studio external gateway remains Studio-only |
| Native Codex/Claude tools | provider-owned and untouched |
| Launch overrides/current models/errors | implemented SR-004 behavior unchanged |
| Team communication | rooted member identity and recipient-name handoff unchanged |
| Agent/team activation | current candidate/durable publication/platform binding unchanged |
| Cleanup | exact graph-local run/session/resource cleanup unchanged |
| Direct-root/standalone Agent memory | unchanged physical layout |
| Nested history/memory | newest Personal current scope/restart behavior adopted |

## Design-Principles Self-Validation

| Check | Result |
| --- | --- |
| Approved behavior and production reality | Pass — both sides are already-approved behavior; no new product policy invented |
| Spine span sufficiency | Pass — DS-013 starts at business demand and ends at provider/cleanup; DS-014 starts at host start and ends before readiness |
| Ownership clarity | Pass — team context/factories own scope, leaf handle owns leaf activation, memory service owns path mapping, migration runner owns historical transformation |
| Authoritative boundary | Pass — application assembly still injects one exact family; leaf code neither bypasses it nor queries a parallel owner |
| Empty indirection | Pass — no new service/facade/coordinator; existing owners absorb the change |
| Persisted-data proportionality | Pass — only irreplaceable incorrectly located nested memory migrates; direct/current data is untouched |
| Current-schema runtime | Pass — runtime sees one canonical physical layout; no version branch or dual read |
| Product reachability | Pass — nested app/task execution and normal upgrade/restart are supported paths |
| Clean-cut modernization | Pass — no compatibility alias, directory shim, fallback, or package branch |
| Host parity | Pass — both hosts use the existing shared migration phase and same application execution owners |
| Verification proportionality | Pass — current Personal nested proof plus exact application-boundary proof; no new product package just for tests |

## Rejected Alternatives

1. **Ticket file wholesale:** rejects newest Personal physical correctness and restart behavior.
2. **Personal file wholesale:** rejects application graph-local dependency identity and exact scoped cleanup.
3. **Runtime old/new memory fallback:** embeds historical layout into current business execution and can make two directories authoritative.
4. **Directory merge/copy:** risks overwriting/diverging memory, raw traces, or snapshots; whole-directory rename is the current owned transition.
5. **Application-specific migration:** duplicates the process migration authority and can run after application readiness.
6. **Second scope resolver/service:** empty indirection around `TeamRunContext`/factories and risks divergent ancestry rules.
7. **New maintained nested application fixture:** source/product churn without an independent user requirement or coverage gap.
8. **Broad agent/team refactor:** unsupported by the three-conflict current evidence and would reopen passed architecture.
