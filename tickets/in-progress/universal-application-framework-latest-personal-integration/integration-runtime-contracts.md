# Integration Runtime Contracts — Latest Personal + Universal Application Framework

## Status And Authority

- Status: Current design-ready runtime supplement at `SR-013`. Sections 1–8 are implemented historical/current behavior. Section 9 is the architecture-accepted SR-011 canonical host definition/run boundary. Section 10 is the normative SR-012 member/session-bound task-delegation contract plus SR-013 exact general/default/fixture propagation closure for ARCH-REV-012 / AR-007.
- Purpose: Preserve the resolved lifecycle/activation/persistence/tool/workspace/provider/Team V2 and canonical-definition contracts while defining the exact RootTeamRun-to-member-to-session/native-tool task execution scope.
- Related behavior and requirements: BEH-003–BEH-013; REQ-004–REQ-012; AC-005–AC-036.
- Scope: Internal preserved-behavior correction only. SR-012/SR-013 change task execution capability construction and consumption plus exact constructor/fixture obligations; they add no host, route, public API/SDK shape, data schema, package mutation, fallback, compatibility path, provider behavior, task system, manager, or migration.
- Governing rule: latest Personal owns evolved process/data/provider/run/team semantics; the finalized feature owns the dual-host boundary, shared application lifecycle, scoped publication/session behavior, and launch baseline/override/readiness model.

## 1. Exact Process And Application Lifecycle Allocation

### 1.1 Ownership rule

The two host starters remain explicit process coordinators:

- `server-runtime.ts` owns Studio process prerequisites, listener start, Studio-only process transports/background work, fatal-code translation, and signal-driven close.
- `start-standalone-application-host.ts` owns standalone configuration/package validation, its isolated data root, process prerequisites, listener start, returned close handle, and thrown startup errors.
- `ApplicationPlatformLifecycle` owns only the application-shared readiness, recovery, and ordered application shutdown phases listed below.
- `buildStudioServer.ts` and `build-standalone-application-server.ts` assemble Fastify/routes/hooks. They do not run database migrations, register required tool groups, bootstrap definitions, recover applications, or start business runs.

There is no `buildServer(mode)`, generic process lifecycle, or second copy of any readiness phase. Small existing low-level functions may remain shared, but the two host starters keep their different failure surfaces explicit.

### 1.2 Ordered phase allocation

`A` means awaited before advancing. `S` means synchronous. `BG` means scheduled without delaying readiness. A fatal Studio failure is translated through `exitWithEmbeddedServerPlatformFatal`; the same standalone failure closes every resource already opened and rejects `startStandaloneApplicationHost`.

| Order | Current Personal / feature phase | Target owner and file | Studio | Standalone | Await / background | Failure, unwind, and cleanup policy |
| ---: | --- | --- | --- | --- | --- | --- |
| 0 | Resolve host input | `server-runtime.ts` consumes configured host/port; `start-standalone-application-host.ts` resolves and materializes the selected package/data-root config | Yes | Yes | S/A | Invalid standalone package/config rejects before DB/runtime construction. Studio configuration errors use the existing embedded fatal surface. |
| 1 | Runtime logging bootstrap and application logger | Each host starter | Yes | Yes | S | Studio: `RUNTIME_LOGGING_INITIALIZATION_FAILED`. Standalone: reject. No later resource exists yet. |
| 2 | Core operational DB migrations | Each host starter via current `runMigrations` | Yes | Yes | S | Studio: `DATABASE_MIGRATION_FAILED`. Standalone: reject. |
| 3 | Protect DB, root key, WAL, SHM, and journal from file tools | Each host starter via current `configureFileToolDeniedPaths` | Yes | Yes | S, before Prisma | This ordering is mandatory. Failure uses the host startup failure surface. |
| 4 | Prisma initialize | Each host starter | Yes | Yes | A | Studio: `APPLICATION_DATABASE_INITIALIZATION_FAILED`. Standalone: close Prisma if initialization began, then reject. |
| 5 | Assert current token-usage schema; initialize readiness as current-schema/degraded-not-run | Each host starter via `assertTokenUsageCurrentSchema` and `configureTokenUsageMigrationReadiness` | Yes | Yes | A | Failure sets `CRITICAL_CURRENT_SCHEMA_FAILURE`; Studio emits `TOKEN_USAGE_CURRENT_SCHEMA_INVALID`; standalone unwinds and rejects. |
| 6 | Secret vault initialize | Each host starter | Yes | Yes | A | Studio: `SECRET_VAULT_INITIALIZATION_FAILED`. Standalone: close vault then Prisma. |
| 7 | Run current required app-data migrations once | Each host starter via current `AppDataMigrationRunner.runPending` | Yes | Yes | A | One status list feeds phases 8–10. Runner exceptions are fatal. No second standalone-only migration pass. |
| 8 | Set token-usage migration readiness | Each host starter from `TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID` result | Yes | Yes | S after 7 | Success/warnings -> `READY`; otherwise `CURRENT_SCHEMA_DEGRADED` with status/log. Degraded migration is nonfatal because phase 5 proved the usable current schema. |
| 9 | Rebuild TeamRun V1 package catalog and apply strict admission warning | Each host starter via current `TeamRunV1PackageCatalog` | Yes | Yes | A | Catalog rebuild exception is fatal. A migration result other than clean `SUCCEEDED` logs the current warning and continues under strict current-package admission. |
| 10 | Enforce readable-provider migration gate | Each host starter from `CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID` result | Yes | Yes | S after 7–9 | Only `SUCCEEDED`/`SUCCEEDED_WITH_WARNINGS` passes. Studio: `APP_DATA_STARTUP_GATE_FAILED`; standalone unwinds and rejects. Earlier required migration failures remain represented through the current runner/prerequisite chain; no new blanket policy is invented. |
| 11 | Reset default run-event pipeline | Standalone host starter only, before process/application run owners | No | Yes | A | Reject and unwind repository resources on failure. Studio retains its normal process pipeline lifecycle. |
| 12 | Construct package/bundle service and bind one `HostDefinitionServices` pair | `buildStudioServer.ts` for Studio; standalone starter from the validated selected bundle | Yes | Yes | S | Bind Agent then Team using bundle-aware providers. Any prior lazy process definition instance fails startup. Team failure releases Agent. Normal unwind releases Team then Agent after all run/session owners stop. Pre-host migration label lookup is non-caching and cannot claim this identity. |
| 13 | Construct process Agent Tools, explicit general-process run supervisor/services, application runtime, catalog/package commands, configured public APIs, and Fastify routes | Explicit host builder/starter | Yes | Yes | A | Studio supplies the same definitions to general runs, application runtime, catalog refresh, and configured public definition/run APIs; standalone supplies them to general/application owners but adds no GraphQL. General and application managers/sessions remain separate. Failure closes only constructed owners in reverse order, ending with `HostDefinitionServices`. |
| 14 | Prepare workspace runtime: load workspaces, then ensure temp workspace | `ApplicationPlatformLifecycle.prepareBeforeListen` | Yes | Yes | A, ordered | Fatal application readiness failure. This removes Personal's post-listen temp-workspace duplicate and the background workspace loader. |
| 15 | Load agent customizations | `ApplicationPlatformLifecycle.prepareBeforeListen` | Yes | Yes | A after 14 | Fatal. Removed from Studio background tasks. |
| 16 | Register exactly seven required tool units once: Core, Browser, Task Delegation, Agent Communication, Published Artifact, Media, Search | `AgentToolRegistryReadiness` called only by `ApplicationPlatformLifecycle.prepareBeforeListen` | Yes | Yes | A after vault and customization | Core registration is awaited first; the five server-owned non-Search groups register next; provisioned Search registers last, after the vault is ready and after Core has installed the base catalog. A missing module/export or registrar failure rejects readiness with the unit name. Remove the hidden `buildApp()` Search call, the background Agent Tools task, `loadAllAgentTools`, Search-to-Core chaining, and `AgentFactory` registration side effect. |
| 17 | Assert application-scoped Agent Tools session runtime ready | `ApplicationPlatformLifecycle.prepareBeforeListen` | Yes | Yes | S after 16 | Fatal. Does not expose Studio `/mcp/gateway` to standalone. |
| 18 | Materialize bundle catalog and validate selected application(s) | `ApplicationPlatformLifecycle.prepareBeforeListen` | Yes | Yes | A | Studio accepts catalog diagnostics per application; standalone selected-package absence/diagnostic is fatal. |
| 19 | Bootstrap built-in agents | `ApplicationPlatformLifecycle.prepareBeforeListen` | Yes | Yes | A after catalog | Fatal. Remove Personal's pre-builder duplicate. |
| 20 | Prepare current agent/team definition runtime and calculate ready/quarantined application set | `ApplicationPlatformLifecycle.prepareBeforeListen` | Yes | Yes | A | Fatal for lifecycle construction; per-application definition diagnostics quarantine the affected application as already designed. No business run is started. |
| 21 | Enter `waiting_for_listener` and call Fastify `listen` | Lifecycle then host starter | Yes | Yes | A | Listen failure closes Fastify, application lifecycle, process owners, vault, and Prisma. Studio reports `HTTP_SERVER_INITIALIZATION_FAILED`; standalone rejects. |
| 22 | Start process transports | Studio starter: channel output and gateway callback runtimes | Yes | No | S immediately after listen | A thrown start failure is a startup failure and runs full close. These transports are not application lifecycle concerns and are not started by standalone. |
| 23 | Derive internal base URL | Each host starter | Yes | Yes | S/A before application recovery | Studio retains Personal's best-effort log/delete-env behavior. Standalone treats failure as fatal because same-origin application Agent Tools descriptors require the selected listener address. |
| 24 | Restore managed messaging gateway if enabled | Studio starter | Yes | No | A, best effort | Error is logged and startup continues, matching Personal. This is separate from application team messaging and standalone MCP. |
| 25 | Startup gate, known-app lookup, binding recovery, availability reconciliation/quarantine, per-ready-app pending-event recovery | `ApplicationPlatformLifecycle.recoverAfterListen` | Yes | Yes | A, ordered | Fatal recovery failure closes the listening server and all application/process/repository resources. Standalone filters to its selected application; Studio covers its catalog. |
| 26 | Enter application lifecycle `ready` | `ApplicationPlatformLifecycle` | Yes | Yes | S | Only now may REST/realtime business launch boundaries report ready. Construction and readiness create no agent/team business run. |
| 27 | Schedule noncritical process background work | Studio `scheduleStudioBackgroundTasks`: MCP/model cache preload, external MCP registration, memory-sync worker | Yes | No | BG after ready | Module/load/run errors are logged and never change ready state. Agent/Team definition preload is removed because phase 20 already awaits the exact bound services; workspaces, customizations, required Agent Tools, and Search are absent because phases 14–16 own them. |

### 1.2.1 Required tool readiness contract

The truthful seven-unit set is:

| Order | Unit key / display name | Existing source registrar | Target meaning |
| ---: | --- | --- | --- |
| 1 | `core` / Core Tools | `autobyteus-ts/src/tools/register-tools.ts::registerTools` | Installs the AutoByteus core file, terminal, basic Search, media, and URL definitions into the process registry. This is the source-backed seventh unit; it is not called Skills. |
| 2 | `browser` / Browser Tools | `registerBrowserTools` | Installs server-owned browser tools. |
| 3 | `task_delegation` / Task Delegation Tools | `registerTaskDelegationTools` | Installs server-owned task-delegation tools. |
| 4 | `agent_communication` / Agent Communication Tools | `registerAgentCommunicationTools` | Installs server-owned agent/team communication tools. |
| 5 | `published_artifact` / Published Artifact Tools | `registerPublishedArtifactTools` | Installs the provider bound to the exact application publication service. |
| 6 | `media` / Media Tools | `registerMediaTools` | Installs server-owned media tools. |
| 7 | `search` / Search Tools | `registerProvisionedSearchTool` | Replaces the Core Search definition with the host-provisioned Search definition only after the secret vault is ready. |

The successful return shape is exact and ordered:

```ts
type RequiredAgentToolUnitKey =
  | "core"
  | "browser"
  | "task_delegation"
  | "agent_communication"
  | "published_artifact"
  | "media"
  | "search";

type AgentToolUnitReadinessResult = {
  key: RequiredAgentToolUnitKey;
  displayName: string;
  status: "registered";
};
```

The returned array contains exactly one result for each key in table order. Readiness has no `skipped` or best-effort success state.

Skills are not a tool-registration unit. Global customization processors are phase 15, while package/user skills are discovered by the existing skill owners and per-agent `SkillRegistry`; no independent Skills registrar exists.

`AgentToolRegistryReadiness` owns one memoized state transition:

```text
idle -> registering Core
     -> registering Browser/Task Delegation/Agent Communication/Published Artifact/Media
     -> registering provisioned Search
     -> ready

any failure -> failed (same rejection returned to all later/concurrent callers)
```

- `registerRequiredGroups()` creates its promise once. Concurrent or repeated calls await the same promise; no registrar runs twice and a failed partial registration is not retried in-process.
- Each explicit host composition constructs exactly one `ApplicationPlatformRuntime`, which owns exactly one readiness instance. Composition/lifecycle tests assert that supported Studio and standalone startup each reach that instance once; no process singleton or global readiness accessor is introduced.
- Core must succeed before any server-owned unit. The five independent server-owned non-Search units may register concurrently, but their results are returned in the table order and all failures are named. Search runs only after those units succeed.
- The Search registrar no longer calls `registerTools()`; it owns only the provisioned Search replacement. The vault is already initialized at phase 6, so the replacement's `SearchProvisioningService` can resolve host configuration/secrets when a Search tool is created.
- `AgentFactory` construction remains responsible for agent instances and logging only. It no longer mutates `defaultToolRegistry`. Its current agent-creation behavior is unchanged because callers supply resolved tool instances; server catalog/tool resolution occurs only after lifecycle readiness.
- `server-runtime.ts`, `background-runner.ts`, and `startup/index.ts` expose no second registration trigger. Tests use `AgentToolRegistryReadiness` directly rather than an empty `loadAllAgentTools` compatibility wrapper.
- A readiness failure prevents `waiting_for_listener`; the host uses the phase-16 fatal/reject and reverse-unwind policy. No partially registered process may listen or accept a business run.

This is a clean-cut ownership correction, not a new product feature. It preserves the same tool definitions and Search provisioning behavior while making their existing startup requirement explicit and deterministic.

### 1.3 Ordered host spines

Studio:

```text
logging -> core migration -> protected paths -> Prisma -> token schema -> vault
-> app-data statuses -> token readiness -> TeamRun catalog -> readable-provider gate
-> package/bundle -> bound host definitions -> process MCP/general-run owners
-> Studio/application assembly + configured public APIs -> application prepare
-> listen -> channel/gateway transports -> internal URL -> managed messaging
-> application recovery -> READY -> Studio-only background scheduling
```

Standalone:

```text
resolve/validate package with transient unbound definitions -> materialize isolated root -> logging -> core migration
-> protected paths -> Prisma -> token schema -> vault -> app-data statuses
-> token readiness -> TeamRun catalog -> readable-provider gate -> reset run pipeline
-> bound host definitions -> process MCP/general-run owners -> selected application assembly -> application prepare
-> listen -> internal URL -> selected application recovery -> READY
```

### 1.4 Stop and startup-unwind order

Fastify `onClose` first awaits the shared application lifecycle in both hosts:

```text
block new application MCP sessions
-> stop application event dispatch
-> close application agent communication
-> close backend gateway and backend WebSocket sessions
-> close notification clients
-> stop artifact intake and await delivery drain
-> detach run observers
-> stop application workers
-> stop team runs, then residual agent runs
-> close application-scoped MCP sessions
-> stop application streaming
```

After that, Studio closes process owners in this order:

```text
memory-sync worker -> general-process run supervisor -> process Agent Tools MCP runtime
-> configured Studio API registration -> channel output runtime -> gateway callback runtime
-> managed messaging -> default run-event pipeline -> HostDefinitionServices
-> secret vault -> Prisma
```

Standalone closes:

```text
general-process run supervisor -> process Agent Tools MCP runtime
-> default run-event pipeline -> HostDefinitionServices -> secret vault -> Prisma
```

Every close path is idempotent. Each stage runs in `finally`/aggregate-error style so a failure does not skip later cleanup. A startup failure uses the same reverse ownership order for only the resources whose construction began. Studio converts the final failure to its existing fatal code; standalone rejects its start call. Signal handling calls `app.close()` once and exits `0` only after a clean close, otherwise `1`.

### 1.5 Required-tool file disposition

| Path | Disposition | Exact target responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | Modify | Implement the memoized seven-unit readiness sequence and result/error contract; remove `loadAllAgentTools`. |
| `autobyteus-server-ts/src/startup/index.ts` | Modify | Stop exporting `loadAllAgentTools`; keep only real startup entrypoints. |
| `autobyteus-server-ts/src/startup/background-runner.ts` | Modify to the finalized Studio-only set | Schedule cache preload, external MCP registration, and memory sync only; no workspace/customization/Agent Tools task. |
| `autobyteus-server-ts/src/server-runtime.ts` | Modify (already changed-both) | Remove the direct `registerProvisionedSearchTool()` call; use the shared lifecycle readiness only. |
| `autobyteus-server-ts/src/agent-tools/search/register-search-tool.ts` | Modify | Register only the provisioned Search definition; do not call Core registration. |
| `autobyteus-ts/src/tools/register-tools.ts` | Retain and call explicitly | Remain the idempotent Core registrar; it has no host/lifecycle policy. |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | Modify | Remove import-time/construction-time Core registration; retain factory behavior and the existing `defaultAgentFactory` instance without registry mutation. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Retain | May continue resolving the same `defaultAgentFactory`; importing that instance is registry-pure after the factory-side correction. |
| `autobyteus-server-ts/src/application-platform/runtime/build-application-platform-runtime.ts` | Add/Adapt | Construct the exact `AgentToolRegistryReadiness` used by lifecycle phase 16 with the application publication dependency. |
| `autobyteus-server-ts/src/application-platform/runtime/application-platform-lifecycle.ts` | Add/Adapt | Await the readiness owner exactly once before session/catalog/definition readiness. |
| `autobyteus-server-ts/tests/unit/startup/agent-tool-loader.test.ts` | Add | Prove seven result keys/order, Core-before-server/Search-last ordering, memoized concurrency/repeat behavior, named failure, missing export, no Search after prerequisite failure, and no retry after failure. |
| `autobyteus-server-ts/tests/unit/application-platform/application-platform-lifecycle.test.ts` | Add/Adapt | Prove the lifecycle awaits phase 16 once, blocks listening state on failure, and preserves preparation order. |
| `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` | Add/Adapt | Enumerate production call sites: only the readiness owner may call `registerTools`; forbid `loadAllAgentTools`, direct host Search registration, Search-to-Core chaining, and AgentFactory Core registration. |
| `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts` | Modify | Prove constructing/importing `AgentFactory` does not register or mutate the tool catalog. |
| `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts`, `.../mixed-task-delegation.e2e.test.ts`, `tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts` | Modify | Replace direct Core plus `loadAllAgentTools` setup with the single readiness owner while retaining their behavior assertions. |
| `autobyteus-server-ts/tests/unit/server-runtime-app-data-migration-gate.test.ts` | Modify (already changed-both) | Remove the obsolete direct Search mock/assertion and retain host phase-order/failure proof. |

## 2. Current Activation, Provisioning, And Scoped-Resource Contract

### 2.1 Target construction DAG

```text
current application definition/workspace/history stores
  -> ApplicationAgentToolMcpSessionScope (early ownership/revocation index)
  -> application run-file, artifact-relay, and memory observers
  -> AgentRunResourceManager
  -> AgentRunActivationRegistry
  -> PublishedArtifactPublicationService(active lookup = exact registry, awaited pipeline)
  -> ScopedAgentToolMcpSessionManager(scope + exact publisher)
  -> current Codex/Claude/AutoByteus bootstrappers and backend factories
  -> current AgentRunManager(registry + resource manager + exact factories)
  -> AgentRunProvisioningService + StandaloneAgentRunActivationService
  -> AgentRunService
  -> current MixedTeamRunBackendFactory/current registries/current handles
  -> AgentTeamRunManager -> application launch/orchestration/engine/projections
```

`ApplicationAgentToolMcpSessionScope` is constructed early because it only records and revokes application-owned session identities. It does not dispatch tools or publish artifacts. This breaks the construction cycle without a late-binding proxy. Session creation and route dispatch still use the same process `AgentToolsMcpRuntime`; application sessions select the application publisher and record ownership in this scope.

### 2.2 Exact activation owner split

| Concern | Exact target owner | Contract |
| --- | --- | --- |
| Durable PREPARED row, TTL, identity allocation, stale-prepared cleanup | Current `AgentRunProvisioningService` | Validate input -> allocate `runId` -> build current `AgentRunConfig` including application context -> write prepared metadata before activation. Application construction supplies manager, metadata/history, workspace, allocator explicitly. |
| Deduplicated activation/restore attempts and durable metadata commit | Current `StandaloneAgentRunActivationService` | Preserve attempt map/quarantine map, token readiness, provider identity checks, metadata-before-publication, retryable unchanged-prepared outcome, indeterminate-commit quarantine, and publication-failure abort. Application construction supplies all dependencies explicitly. |
| Public private-candidate handle | Current `AgentRunActivationCandidate` | Remains the only pre-publication handle; exposes identity plus `commitPublication()`/idempotent `abort()`, never raw run/input/backend. States remain `PREPARED -> PUBLISHED` or `PREPARED -> ABORTING -> ABORTED\|QUARANTINED`. |
| Claim and active-map state | New `AgentRunActivationRegistry` adapted to Personal | Owns `constructing`, `prepared`, `quarantined` claims; active run lookup; claim-token and expected-run checks; stop admission. It does not construct/terminate backends. |
| File/artifact/memory attachments and application session revocation | Adapted `AgentRunResourceManager` | Attach file-change -> artifact-relay -> memory observers before the candidate is returned; rollback partial attachment in reverse. Release by `(runId, expectedRun)` once: delete ownership, revoke exact sessions, then detach memory -> artifact -> file observers. Return structured errors/counts. Uses exact application session scope, never `getAgentToolMcpSessionService()`. |
| Backend/run construction, candidate callbacks, termination, cleanup-result consumption | Current `AgentRunManager` | Claim before first backend await, construct privately, attach, return candidate, synchronously publish after metadata commit, terminate and identity-remove, quarantine uncertain private termination, await in-flight preparation during stop. |
| Root/subteam/task execution and current rooted identity | Current `AgentTeamRunManager`, `MixedTeamRunBackendFactory`, `MixedTeamManager`, current configured/task registries and handles | Preserve `RootTeamRun`, execution tree, `memberAddress`, `agentRunId`, `teamRunId`, current delivery and termination semantics; propagate the exact application manager/session/context dependencies through every root/subteam/task leaf. |

### 2.3 Activation registry interfaces and transition results

The target types are concrete and internal:

```ts
type AgentRunActivationClaim = Readonly<{ runId: string; token: symbol }>;
type AgentRunActivationClaimState = "constructing" | "prepared" | "quarantined";

type AgentRunRemovalReason =
  | "inactive_discovery"
  | "explicit_termination"
  | "inactive_replacement"
  | "stop_all"
  | "registration_rollback";

type AgentRunRemovalResult =
  | { kind: "removed"; run: AgentRun; reason: AgentRunRemovalReason;
      resources: AgentRunResourceReleaseResult }
  | { kind: "not_found"; runId: string; reason: AgentRunRemovalReason }
  | { kind: "identity_mismatch"; runId: string; expectedRun: AgentRun;
      currentRun: AgentRun; reason: AgentRunRemovalReason };
```

| Operation | Preconditions / state | Exact effect and result | Consuming caller |
| --- | --- | --- | --- |
| `claim(runId)` | Registry open; no active run; no pending claim | Prunes an inactive exact active run first; creates tokenized `constructing` claim. Existing active/preparing throws `AGENT_RUN_ACTIVATION_IN_PROGRESS_CONFLICT`; quarantined throws `AGENT_RUN_ACTIVATION_CLEANUP_FAILED`. | `AgentRunManager.prepare*` before awaiting backend creation |
| `markPrepared(claim, run)` | Exact token, `constructing`, run identity matches | Calls `resourceManager.attach(run)` then records exact run and state `prepared`. Attach rollback releases partial resources. | `AgentRunManager` after backend/run construction |
| `publish(claim, run)` | Exact token/run, `prepared`, run active, no active replacement | Synchronously inserts active run and removes pending claim; returns the run. Claim/identity invariant failure quarantines and throws. | Candidate `commitPublication`, only after activation service proves durable started metadata |
| `releaseClaim(claim)` | Exact `constructing` claim without run | Removes the claim; mismatch returns false and cannot affect another attempt. | Unsupported runtime or failure before a run exists |
| `releasePrepared(claim, run)` | Exact pending claim/run | Releases resources once and leaves claim available for manager's private termination result. Returns structured resource result. | Candidate abort or failed preparation |
| `completeAbort(claim, run, result)` | Exact pending claim | `aborted` removes claim; uncertain/active cleanup moves it to `quarantined` with error. | `AgentRunManager` after private run/backend termination |
| `getActiveRun(runId)` | Any | Returns active exact run. If inactive, identity-removes it with reason `inactive_discovery`, releases resources once, and returns null; cleanup errors are surfaced/logged through current manager policy. | Publication lookup, services, manager |
| `removeIfCurrent({runId, expectedRun, reason})` | Any | Never removes a replacement. Returns `removed`, `not_found`, or `identity_mismatch`; `removed` includes exact resource release result. | Explicit termination, inactive discovery/replacement, rollback, stop |
| `blockNewClaims()` | Open | Rejects later claims. Existing construction attempts remain owned until their tracked promise settles. | Manager `stopAll` |
| `snapshotForStop()` | Claims blocked | Returns exact active and prepared private run records without invoking manager callbacks. | Manager `stopAll` |

`AgentRunManager` tracks its in-flight `prepareCandidate` promises. `stopAll()` blocks new claims, awaits those promises to settle, obtains the final registry snapshot, terminates prepared private runs and active runs, and applies identity-checked removal/resource release exactly once. It aggregates termination/resource errors and completes registry stop. No registry-to-manager callback, generic event bus, or deferred container exists.

### 2.4 Supported transition traces

Fresh create:

```text
AgentRunProvisioningService validates + allocates -> records PREPARED metadata
-> StandaloneAgentRunActivationService asserts token schema -> manager claims before await
-> backend/run private construction -> resources attach -> candidate returned
-> provider identity validation -> durable recordRunStarted
-> candidate.commitPublication() -> exact active map -> command-ready run
```

Restore:

```text
read started metadata -> assert existing-run restore readiness
-> validate persisted external provider ID when applicable
-> claim -> restore backend -> attach -> private candidate
-> exact runtime/provider identity check -> confirm durable metadata
-> synchronous publication
```

Abort/quarantine:

```text
metadata failure or identity mismatch -> candidate.abort()
-> release exact resources -> terminate private run/backend
-> confirmed inactive => remove claim / aborted
-> indeterminate cleanup or durable commit => retain quarantined claim/error until restart
```

Explicit termination/inactive discovery:

```text
lookup exact active run -> terminate -> verify inactive
-> removeIfCurrent(expectedRun) -> revoke exact application sessions
-> detach memory/artifact/file observers once -> return result
```

### 2.5 Required application construction inputs and exact general-process exemptions

Every row marked **Required** is non-null in application assembly and receives omission/null/undefined architecture fixtures. Reusable constructors may retain defaults for ordinary Personal/general-process callers, but the governed application factory cannot omit them.

| Target / nested owner | Application input obligation | General-process exemption |
| --- | --- | --- |
| `AgentRunResourceManager` | **Required:** application session scope, run-file service, application artifact relay, memory recorder | Named `createGeneralProcessRunSupervisor` may use current process owners. |
| `AgentRunActivationRegistry` | **Required:** exact application resource manager | No application fallback. General process creates its own registry/manager family. |
| `PublishedArtifactPublicationService` | **Required:** exact activation-registry lookup, application relay/event pipeline | `getGeneralProcessPublishedArtifactPublisher` only inside named process assembly. |
| `ScopedAgentToolMcpSessionManager` | **Required:** exact application session scope and application publisher/provider family | Process session manager belongs to `AgentToolsMcpRuntime`. |
| `AutoByteusAgentRunBackendFactory` | **Required:** application agent-definition service and exact current dependencies | Current process factory defaults allowed only in general-process assembly. |
| `CodexThreadBootstrapper` | **Required:** application agent-definition service and scoped session manager at their current positional/options inputs | Current process thread manager/cleanup defaults remain allowed where explicitly documented; application session/definition inputs may not default. |
| `CodexAgentRunBackendFactory` | **Required:** the exact application `CodexThreadBootstrapper` at current constructor argument 1 | Arguments 0/2 remain the deliberately allowed process-scoped thread manager/cleanup defaults. |
| `ClaudeSessionManager` | **Required:** scoped application session manager at current session dependency | No application default getter. |
| `ClaudeSessionBootstrapper` | **Required:** application agent-definition service | No application default getter. |
| `ClaudeAgentRunBackendFactory` | **Required:** exact application Claude session manager and bootstrapper at arguments 0/1 | Defaults only in named general-process assembly. |
| `AgentRunManager` | **Required:** all three backend factories, activation registry, resource manager, memory recorder/current event collaborators | `AgentRunManager.getInstance()` remains a process-only/default API and is forbidden under application-platform construction. |
| `AgentRunProvisioningService` | **Required:** manager, metadata, history, workspace, identity allocator | Existing defaults allowed outside governed application construction. |
| `StandaloneAgentRunActivationService` | **Required:** manager, metadata, history, workspace, token-usage readiness | Existing defaults allowed outside governed application construction. |
| `AgentRunService` | **Required:** exact manager plus exact provisioning and activation services; it must not reconstruct defaulting children | Existing process getter remains outside application construction. |
| `MemberTeamContextBuilder` | **Required:** exact application `AgentTeamDefinitionService` | Default singleton remains only for named process/general use. |
| `MixedTeamRunBackendFactory.createTeamManager` | **Required:** supplied closure for every root and subteam | Default `new MixedTeamManager(...)` path remains process-only. |
| `MixedTeamManager` | **Required:** exact agent run manager, scoped session manager/revoker, member context builder, workspace manager, memory location service, subteam factory, and current callbacks | Optional/default inputs remain only for current general process construction. |
| `MixedConfiguredMemberRegistry` and `MixedTaskAgentExecutionRegistry` | **Required:** propagate the same leaf dependency set | No application fallback. |
| `MixedAgentMemberHandle` | **Required:** exact manager, scoped session manager, member context builder, workspace manager, memory location service | `AgentRunManager.getInstance()` and global MCP revocation are forbidden for application-created handles. |
| `AgentTeamRunManager` | **Required:** current mixed factory plus current execution-tree/task/communication stores and memory root | Process singleton/default factory remains outside application construction. |

The architecture boundary test resolves constructor/factory call sites and proves these exact application occurrences. Synthetic omission, explicit `null`, and explicit `undefined` variants must fail. The test also proves that the only exempt defaults are reached from the named general-process assembly, not from an application builder, lifecycle, package owner, route, or team handle.

### 2.6 Exact file disposition for activation/team adaptation

| Path | Disposition | Responsibility |
| --- | --- | --- |
| `agent-execution/services/agent-run-activation-candidate.ts` | Retain/Modify only if imports change | Current private candidate contract. |
| `agent-execution/services/standalone-agent-run-activation-service.ts` | Modify | Keep current durable activation contract; require application dependencies in governed assembly. |
| `agent-execution/services/agent-run-provisioning-service.ts` | Modify | Keep current prepared metadata/allocator contract; explicit application dependencies. |
| `agent-execution/services/agent-run-service.ts` | Modify | Consume explicitly constructed provisioning and activation services. |
| `agent-execution/services/agent-run-manager.ts` | Modify | Delegate state/resource mechanics to the target registry/manager while preserving current manager orchestration. |
| `agent-execution/runtime/agent-run-activation-registry.ts` | Add | Current claim + active state and identity-checked transition owner. |
| `agent-execution/runtime/active-agent-run-registry.ts` | Do not add | Obsolete feature-era active-only shape. |
| `agent-execution/services/agent-run-resource-manager.ts` | Add/Adapt | Exact application resource attachment/release. |
| Current `mixed-configured-member-registry.ts`, `mixed-task-agent-execution-registry.ts`, `mixed-task-team-execution-registry.ts` | Modify | Retain Personal owners and propagate exact graph-local dependencies. |
| Feature `mixed-persistent-member-registry.ts`, `mixed-task-agent-instance-registry.ts` | Do not add | Superseded by current Personal registries and rooted identities. |
| `mixed-agent-member-handle.ts`, `mixed-team-manager.ts`, `mixed-team-run-backend-factory.ts`, `member-team-context-builder.ts`, `agent-team-run-manager.ts` | Modify | Preserve current domain behavior; make application dependencies exact. |

## 3. Launch Override Store And Direct-Use Proof

### 3.1 Single target owner

The only target persisted override owner is:

`autobyteus-server-ts/src/application-orchestration/stores/application-launch-override-store.ts`

Remove:

- `application-execution-resource-configuration-store.ts`;
- `application-execution-resource-configuration-service.ts`;
- `application-execution-resource-configuration-launch-profile.ts`.

`ApplicationLaunchConfigurationService` remains the only semantic reader/writer above the store. REST and Studio depend on it, never the store. The physical table and columns remain unchanged, so there is no database migration:

```text
__autobyteus_resource_configurations(
  slot_key PRIMARY KEY,
  resource_ref_json,
  launch_profile_json,
  launch_defaults_json,
  updated_at
)
```

`launch_defaults_json` remains physically present because removing a column would require a database migration, but the target writer always stores `NULL` and the current runtime does not translate or fall back to it.

### 3.2 Exact current-rooted persisted contract

The supported value in `launch_profile_json` is a sparse host override, using current Personal rooted identity:

```ts
type ApplicationAgentLaunchOverride = {
  kind: "AGENT";
  llmModelIdentifier?: string | null;
  runtimeKind?: string | null;
  llmConfig?: Record<string, unknown> | null;
  workspaceRootPath?: string | null;
};

type ApplicationTeamLaunchOverride = {
  kind: "AGENT_TEAM";
  defaults: {
    llmModelIdentifier?: string | null;
    runtimeKind?: string | null;
    llmConfig?: Record<string, unknown> | null;
    workspaceRootPath?: string | null;
  } | null;
  memberProfiles: Array<{
    memberAddress: string;
    displayName: string;
    agentDefinitionId: string;
    llmModelIdentifier?: string | null;
    runtimeKind?: string | null;
    llmConfig?: Record<string, unknown> | null;
  }>;
};
```

`memberAddress` is the rooted current team address. `displayName` is presentation metadata, never identity. `agentDefinitionId` detects topology change. The obsolete `memberRouteKey`/`memberName` fields are not accepted or written.

The store returns each JSON cell as `absent`, `parsed(value: unknown)`, or `malformed(rawText)` rather than casting it to a valid domain type. `ApplicationLaunchConfigurationService` validates the parsed values. This keeps malformed/stale saved rows visible and resettable without teaching the normal overlay path an old schema.

### 3.3 Reader stages and write policy

For each declared slot the service evaluates, in order:

```text
immutable package default resource
-> package baseline from current agent/team definitions
-> optional saved selected resource
-> selected-resource baseline from current definitions
-> current-rooted sparse saved override
-> effective per-leaf configuration + provenance
-> current host runtime/model/credential availability
-> RUNNABLE | INVALID_PACKAGE | HOST_REQUIREMENT_MISSING
```

- A missing saved row means package defaults, not a copied DB default.
- `execution_resource_ref = null` on a present row means the package default resource remains selected while `launch_profile_json` overlays it.
- A saved alternate resource builds its own pre-overlay baseline; the Studio editor consumes that authoritative projection.
- Read/list/evaluate/preview never writes, deletes, normalizes, seeds, or repairs a row.
- Only an explicit save writes the normalized current-rooted sparse contract and sets `launch_defaults_json = NULL`.
- Only explicit Reset deletes the slot row.
- An invalid saved row never falls back silently to the package default. It yields `HOST_REQUIREMENT_MISSING`, retains the saved selection/diagnostic where parseable, and exposes Reset.
- Package bytes are never mutated.

### 3.4 Representative latest-Personal rows

Agent row — directly usable:

```json
{
  "resource_ref_json": null,
  "launch_profile_json": {
    "kind": "AGENT",
    "runtimeKind": "codex_app_server",
    "llmModelIdentifier": "gpt-5.6-luna",
    "workspaceRootPath": "/workspace"
  }
}
```

The target reads it as a sparse override of the package-selected agent. No write occurs. Missing fields inherit from the agent/package baseline.

Team row — directly usable:

```json
{
  "resource_ref_json": {
    "source": "shared",
    "kind": "AGENT_TEAM",
    "definitionId": "shared-writing-team"
  },
  "launch_profile_json": {
    "kind": "AGENT_TEAM",
    "defaults": {
      "runtimeKind": "codex_app_server",
      "llmModelIdentifier": "gpt-5.6-luna",
      "workspaceRootPath": "/workspace"
    },
    "memberProfiles": [
      {
        "memberAddress": "/shared-writing-team/researcher",
        "displayName": "Researcher",
        "agentDefinitionId": "shared-researcher"
      },
      {
        "memberAddress": "/shared-writing-team/writer",
        "displayName": "Writer",
        "agentDefinitionId": "shared-writer",
        "llmModelIdentifier": "gpt-5.6-luna"
      }
    ]
  }
}
```

The selected-resource baseline is built first; member entries are matched by rooted `memberAddress`; absent values inherit team/member/agent defaults. A current Personal row that lists every member is valid even when only some values are explicit, so it is directly usable as a sparse overlay without rewrite.

| Stored case | Target result | Automatic write/fallback? |
| --- | --- | --- |
| Valid current Personal agent row | Effective configuration with package/host provenance | No |
| Valid current Personal rooted team row | Effective per-leaf configuration | No |
| Valid row selects unavailable model/runtime | `HOST_REQUIREMENT_MISSING`; saved values visible | No |
| Valid row selects deleted shared resource | `HOST_REQUIREMENT_MISSING` with saved-resource issue and Reset | No |
| Team member missing/agent changed | `HOST_REQUIREMENT_MISSING` with stale `memberAddress` diagnostics and Reset | No |
| Syntactically malformed JSON | `HOST_REQUIREMENT_MISSING` / malformed saved override; Reset available | No |
| `launch_profile_json` absent but historical `launch_defaults_json` present | Invalid saved override; Reset available | No legacy conversion or fallback |
| Obsolete `memberRouteKey`/`memberName` profile | Invalid saved override | No compatibility branch |
| No row | Package baseline/effective defaults | No seed/copy |

This is `Directly Usable — No Migration` because current valid Personal rows already have the selected physical columns and the target rooted field meanings. The target changes the reader to a version-agnostic recognized-field validator, not to an old/new version switch. Invalid/obsolete data is preserved for diagnosis/reset rather than rewritten or deleted during read.

## 4. Exact Verification Delta

### Lifecycle

- Studio and standalone order assertions cover every row in section 1.2.
- Failure injection at each owned phase proves correct fatal/reject outcome and reverse unwind.
- Assert each shared readiness phase runs once, including the exact seven result keys `core`, `browser`, `task_delegation`, `agent_communication`, `published_artifact`, `media`, and `search`.
- Prove Core runs first, provisioned Search runs last after vault readiness, each successful registrar runs once under concurrent/repeated calls, the failure is sticky, and missing/rejected registrars prevent lifecycle readiness.
- Prove there is no production `registerTools()` caller outside `AgentToolRegistryReadiness`, no Search-to-Core call, no AgentFactory registry mutation, no direct Studio Search registration, and no background/compatibility registration entrypoint.
- Prove Studio process transports/background work are absent from standalone.
- Prove lifecycle stop precedes process owner/vault/Prisma close in both hosts.

### Activation and team construction

- Current create/restore tests preserve claim-before-await, private candidate, provider ID validation, metadata-before-publication, retry, quarantine, and candidate abort semantics.
- Registry tests cover claim conflict/quarantine, attach rollback, synchronous publish, inactive pruning, identity-mismatch replacement protection, explicit termination, stop admission/in-flight wait, and exact-once resource release.
- Application boundary tests cover every **Required** row in section 2.5 with real occurrence plus omission/null/undefined fixtures and prove the named general-process exemption.
- Current root/subteam/configured/task-agent paths prove rooted `memberAddress`, exact graph-local manager/session/context dependencies, final team instruction composition, and session revocation.

### Launch persistence

- Use an actual `ApplicationPlatformStateStore` DB containing the representative agent/team rows above; read/evaluate them and assert the DB bytes/`updated_at` remain unchanged.
- Cover null resource selection, alternate shared resource, stale topology, unavailable model/runtime, malformed JSON, legacy-default-only, obsolete member fields, explicit save, and explicit Reset.
- Assert there is one store/service writer and that the removed Personal service/store names have no production imports.
- Real Studio override/reset and fresh-root standalone package-default journeys remain required.

### Integrated proof

All earlier Git integrity, overlap ledger, build/typecheck, durable source review, real Studio/standalone Codex/Luna publication/handoff/projection/recovery/cleanup, package parity, Personal regression, and Electron build/smoke requirements remain unchanged.

## 5. SR-004 Current-Model And Error Contracts

### 5.1 Construction and dependency identity

`create-application-orchestration-services.ts` constructs exactly one `ApplicationCurrentModelSelectionPolicy` with a required callback to latest Personal's `LLMFactory.requireCurrentModelIdentifier`. That exact policy instance is required by:

- `ApplicationLaunchConfigurationService` for candidate Save validation;
- `ApplicationLaunchHostCapabilityValidator` for readiness issue classification;
- `ApplicationRunBindingLaunchService` for direct command defense.

No constructor field is optional. No caller imports the deleted application execution-resource launch-profile helper. The policy has no store, cache, lifecycle, model catalog, credential check, or external-runtime owner.

### 5.2 Runtime/model transitions

| Entry | Required transition | Outcome |
| --- | --- | --- |
| package/saved effective leaf | normalize runtime; after runtime availability, call policy | AutoByteus stale -> `HOST_REQUIREMENT_MISSING` / `CURRENT_MODEL_SELECTION_REQUIRED`; Codex/Claude -> existing catalog/factory checks |
| candidate Save | build selected baseline + sparse effective config, call policy for every leaf before upsert | stale AutoByteus -> `ApplicationLaunchConfigurationError` with exact issue; zero store writes |
| direct agent command | normalize pair and call policy before create | stale AutoByteus -> exact current-selection error; zero run creation |
| direct team command | fully expand/normalize every member, validate all, then allocate team ID | any stale AutoByteus leaf -> zero allocation/create |
| existing stale row | retain raw/saved/effective value and provenance | no rewrite, remap, fallback, or delete; explicit Save/Reset only |

The policy invokes the AutoByteus guard only when the normalized runtime is `RuntimeKind.AUTOBYTEUS`. Claude Agent SDK and Codex App Server identifiers never cross this guard.

### 5.3 Provider error transport split

Latest Personal owns the upstream/native branch: provider extraction and redaction, required native transport `code`, original safe `message`, optional safe metadata, team/native websocket projection, and native web rendering.

The application branch remains closed and message-only:

- `ApplicationAgentStreamEventProjector` filters diagnostic errors;
- a terminal error requires a nonblank already-safe event message;
- the output is exactly `{ type: "ERROR", message }`;
- the v6 envelope retains exact producer `agentRunId` and current address/sequence semantics;
- code, provider status/code/request ID, details, raw errors, stack/cause, headers, credentials, provider runtime IDs, and extra keys are excluded and rejected by the frontend SDK parser.

### 5.4 Exact refresh proof

In addition to section 4:

1. policy unit tests prove current/stale AutoByteus, default runtime normalization, and Claude/Codex bypass;
2. launch tests prove stale read retention, exact issue, no-write Save rejection, and Reset-only deletion;
3. direct launch tests prove no agent create or team allocation/create before all pairs pass;
4. native/application error tests prove original safe message, diagnostic filtering, required message, exact v6 identity, and metadata/secret exclusion;
5. source audits prove the retired helper/service/test and generated SDK declarations remain absent;
6. newest Personal provider/catalog/pricing/redaction suites, retained application architecture tests, both real hosts, package parity, recovery/cleanup, and a new Electron build/smoke all pass on the same refreshed commit.

## 6. SR-005 Nested Team Physical Scope And Migration Contract

### 6.1 Exact application construction and execution contract

The application `createTeamManager(context)` closure remains the only recursive mixed-team construction path. Every root, configured subteam, task team, configured Agent, and task Agent receives the same graph-local `AgentRunManager`, `AgentToolMcpSessionManager`, `AgentMemoryLocationService`, activity inspector, member-team context builder, and workspace manager selected by `createApplicationRunServices`.

`TeamRunPhysicalScope` is constructed only by current team factories:

- root: `createRootTeamRunPhysicalScope(rootTeamRunId)`;
- child configured/task team: `createChildTeamRunPhysicalScope(parentContext.physicalScope, childTeamRunId)`;
- leaf configured/task Agent: consumes its containing `teamContext.physicalScope` without adding the AgentRun ID to `ancestorTeamRunIds`.

`MixedAgentMemberHandle` derives memory only through the injected service:

```ts
memoryLocationService.getTeamAgentRunLocation({
  ...teamContext.physicalScope,
  agentRunId,
})
```

It retains current prepared activation, durable publication, platform binding, abort/quarantine, and exact cleanup through the injected session manager's `revokeAgentToolMcpSessionsForRun(agentRunId)`. Application paths may not use process-default getters for these collaborators.

### 6.2 Startup allocation

The new memory-layout transition is part of existing phase 7, `AppDataMigrationRunner.runPending()`, for both Studio and standalone. It does not add a new lifecycle phase or change phase 16 application tool readiness.

Within the migration registry the required order is:

1. `TeamRunExecutionTreeV1AppDataMigration`;
2. `TeamAgentMemoryLayoutAppDataMigration` (`20260823_repair_team_agent_memory_layout`);
3. `RemoveExternalRuntimeWorkingContextSnapshotsMigration` and later native snapshot migration dependencies;
4. remaining registered migrations;
5. later process and `ApplicationPlatformLifecycle` readiness phases.

A failed required migration follows the existing runner/startup status policy. `ANYTIME` owns supported retry. No application worker or business action retries or compensates.

### 6.3 Persisted-data transition contract

- Current launch override rows: `Directly Usable — No Migration`.
- Current TeamRun V1 packages: directly usable as the scope index.
- Affected old flat nested Team Agent memory: `Migration Required`.
- Current/fresh/direct-root/standalone Agent memory: not affected.

The migration uses one whole-directory rename only when the old flat source is a directory and the canonical target is missing, then validates source missing/target directory. It never merges, overwrites, deletes a conflicting target, copies files, rewrites TeamRun metadata, or teaches normal runtime to read both layouts. Missing/current/conflict/unsupported/operation cases produce the exact explicit skip, warning, or failure classifications in `latest-base-refresh-round-2-design-analysis.md`.

### 6.4 Exact proof delta

- root, one-level, and multi-level physical-scope normalization/containing-TeamRun tests;
- configured nested member and nested task Agent tests proving full ordered scope through the injected memory service;
- exact `prepareNewAgentRun`, seal/durable commit/release, platform binding, abort, termination, and scoped MCP revocation assertions remain;
- source occurrence assertions prove application construction passes all graph-local services recursively and conflict resolution adds no default getter;
- migration registry/prerequisite and all source/target decision cases;
- direct upgrade, skip-version, fresh/current no-op, nested restart, memory sync, and historical settled-task navigation proof;
- retained real Studio/standalone, package parity, cleanup/recovery, and Electron proof on the same integrated commit.

## 7. SR-006/SR-007 Provider, Model Availability, And Credential Contract

### 7.1 Process/application owner split

Process-owned Personal services remain singular:

- `ModelCatalogService`: static/runtime snapshots and provider/kind-keyed dynamic lifecycle/status;
- `ModelAvailabilityService`: canonical selected-identifier parsing, provider-ID resolution, provider-granularity ensure, and exact identifier/endpoint registration post-check;
- `LlmProviderService`: provider descriptors, network-free credential settings, and explicit provider configuration commands;
- LLM/media factories: registered model rows;
- provider GraphQL + Pinia store: Studio catalog/credential transport and state.

Application-owned services consume these capabilities:

- `ApplicationCurrentModelSelectionPolicy`: runtime normalization, static/dynamic classification, selected-provider availability invocation, and safe typed unavailability;
- `ApplicationLaunchHostCapabilityValidator`: maps policy/model/credential results to application readiness issues, reads a fresh exact `ModelInfo` after every leaf policy step, and reuses credentials only by resolved authority;
- `ApplicationProviderCredentialReadinessAdapter`: maps a resolved model serving runtime/workspace to an explicit credential authority/equivalence key and performs the exact credential/native-auth read;
- `ApplicationLaunchConfigurationService` and `ApplicationRunBindingLaunchService`: retain read/Save/direct-run orchestration and side-effect ordering;
- `useRuntimeScopedModelSelection`: preserves application stored/inherited/default runtime semantics over Personal's Pinia store.

No application owner may instantiate a model catalog, dynamic source lifecycle, provider store, credential vault, or broad discovery loop.

### 7.2 Exact application current-model policy contract

Required constructor dependencies:

```ts
type ApplicationCurrentModelSelectionDependencies = Readonly<{
  ensureAutoByteusModelAvailable: (identifier: string) => Promise<void>;
  requireCurrentAutoByteusModelIdentifier: (identifier: string) => Promise<void>;
}>;
```

Both are mandatory in application assembly. The first delegates to `getModelAvailabilityService().ensureModelAvailable(identifier, "LLM", "autobyteus")`; the second delegates to `LLMFactory.requireCurrentModelIdentifier(identifier)`. No default getter exists inside the policy.

Transition rules:

| Normalized runtime / identifier | Required action | Failure meaning |
| --- | --- | --- |
| Codex or Claude | return normalized external runtime; no AutoByteus discovery call | native runtime catalog/auth owners remain authoritative; host validator still performs its fresh exact runtime model lookup |
| AutoByteus + noncanonical static identifier | exact `LLMFactory` current membership | `CurrentModelSelectionRequiredError` for blank/removed static selection |
| AutoByteus + canonical custom/host-scoped dynamic identifier | delegate identifier to Personal availability; it resolves one provider, runs that provider's configured discovery breadth, then verifies exact registration/endpoint | safe `ApplicationModelAvailabilityError` if provider/model/endpoint is unavailable; application owns no endpoint lifecycle |
| unsupported runtime | reject unsupported runtime before provider work | existing runtime-unavailable behavior |

Dynamic classification uses only Personal `parseOpenAICompatibleEndpointModelIdentifier` and `parseHostScopedLlmModelIdentifier`; application code does not reproduce provider/host parsing.

`ApplicationModelAvailabilityError` is defined in the current policy module, carries the exact selected identifier and one stable safe message, and is not persisted or exported through the application SDK. The guard and host validator map it to blocking issue code `MODEL_UNAVAILABLE`. The existing static error maps to `CURRENT_MODEL_SELECTION_REQUIRED`.

Personal discovery breadth is authoritative and must not be narrowed by application code:

- a custom provider ID owns one configured endpoint record;
- Ollama and LM Studio provider ensures enumerate their configured hosts;
- AutoByteus provider ensure starts its LLM/audio/image source operations, whose discovery enumerates configured AutoByteus hosts;
- the availability service performs the exact selected identifier/endpoint registration check after that provider work.

The application never creates a parsed-endpoint lifecycle, never loops over every provider, and never makes dynamic providers process-start prerequisites.

#### 7.2.1 Fresh exact per-leaf model handoff

`ApplicationLaunchHostCapabilityValidator.validate` processes the effective leaves in their existing deterministic order. For every runtime-enabled leaf:

1. invoke `currentModelSelectionPolicy.requireCurrentSelection` for static guard or selected-provider ensure;
2. immediately call `modelCatalogService.listLlmModels(runtimeKind)` after that leaf's policy promise resolves;
3. exact-match `leaf.llmModelIdentifier` and retain that `ModelInfo` as the sole resolved model for this leaf;
4. map no match to `MODEL_UNAVAILABLE` (or preserve `CURRENT_MODEL_SELECTION_REQUIRED` when the static policy raised it);
5. pass that exact `ModelInfo` to credential-authority resolution/readiness before processing the next leaf.

The target removes `modelsByRuntime`. No runtime-only model list or `ModelInfo` is reused across leaves because a later provider ensure may mutate the runtime registry. A team with leaves A and B backed by distinct dynamic providers therefore observes: ensure A -> fresh read A -> credential A -> ensure B -> fresh read B -> credential B. This is the exact fresh handoff; no new catalog service or two-phase coordinator is introduced.

Read/evaluate preserves saved/package value and provenance. Save rejects either blocking selection outcome before `ApplicationLaunchOverrideStore.upsert`. Direct agent/team launch rejects before any run allocation or team creation.

### 7.3 Exact credential-readiness contract

The adapter depends on:

```ts
Pick<LlmProviderService, "getProviderCredentialSetting">
```

It never calls model catalog/availability methods. It exposes one explicit authority boundary:

```ts
type ApplicationCredentialAuthority =
  | Readonly<{ kind: "PROVIDER"; providerId: string; cacheKey: string }>
  | Readonly<{ kind: "CODEX_WORKSPACE"; workspaceRootPath: string; cacheKey: string }>
  | Readonly<{ kind: "CLAUDE_PROCESS"; cacheKey: string }>
  | Readonly<{ kind: "NO_CREDENTIAL"; servingRuntime: string; cacheKey: string }>
  | Readonly<{ kind: "UNSUPPORTED"; cacheKey: null; reason: string }>;

type ApplicationProviderCredentialReadinessPort = Readonly<{
  resolveAuthority(input: {
    runtimeKind: RuntimeKind;
    model: ModelInfo;
    workspaceRootPath: string;
  }): ApplicationCredentialAuthority;
  getReadiness(authority: ApplicationCredentialAuthority): Promise<ApplicationProviderCredentialReadiness>;
}>;
```

The validator caches `getReadiness` only when `cacheKey` is non-null and identical. Mapping is:

| `ModelInfo.runtime` | Credential owner / action |
| --- | --- |
| `LLMRuntime.API` | `PROVIDER(model.provider_id)`, key `JSON.stringify(["PROVIDER", providerId])`; `getProviderCredentialSetting(model.provider_id, autobyteus)` |
| `LLMRuntime.OPENAI_COMPATIBLE` | `PROVIDER(model.provider_id)`, same typed-tuple key; exact custom-provider credential read |
| `LLMRuntime.AUTOBYTEUS` | `PROVIDER(LLMProvider.AUTOBYTEUS)`, key `JSON.stringify(["PROVIDER", "AUTOBYTEUS"])` |
| `LLMRuntime.OLLAMA` | `NO_CREDENTIAL(OLLAMA)`, key `JSON.stringify(["NO_CREDENTIAL", "OLLAMA"])`; configured after exact host/model availability; no API-key read |
| `LLMRuntime.LMSTUDIO` | `NO_CREDENTIAL(LMSTUDIO)`, corresponding typed-tuple key; configured after exact host/model availability; no API-key read |
| unknown | `UNSUPPORTED`, null key; fail closed for every leaf with a safe reason |
| Codex app server | `CODEX_WORKSPACE(normalized workspaceRootPath)`, key `JSON.stringify(["CODEX_WORKSPACE", normalizedRoot])`; retain account/read acquisition/release check |
| Claude Agent SDK | `CLAUDE_PROCESS`, key `JSON.stringify(["CLAUDE_PROCESS"])`; retain executable auth status check |

The adapter owns both mapping and equivalence; the validator does not reconstruct keys from `runtimeKind`, `provider_id`, or workspace. Keys use typed JSON tuples so delimiter-bearing provider IDs/paths cannot collide. Provider credentials intentionally ignore workspace; Codex intentionally includes workspace; Claude is process-wide; local no-credential readiness is equivalent only within the same serving runtime; unsupported results are not cached.

### 7.4 Studio runtime-scoped selection contract

Effective runtime precedence is exact:

1. nonblank stored runtime;
2. nonblank inherited runtime;
3. default AutoByteus runtime only when `useDefaultRuntimeFallback !== false`;
4. otherwise `null` and no provider/catalog request.

For a non-null runtime:

1. await `llmStore.fetchProvidersWithModels(runtime)`;
2. immediately snapshot `llmStore.providersWithModelsForSelection(runtime)` into the composable runtime bucket;
3. start `llmStore.ensureMissingDynamicProviders(runtime)` without holding the initial loading state;
4. let the store invoke exact provider mutations; each failure records safe source `ERROR` or `STALE_ERROR`, and its `Promise.allSettled` aggregation normally fulfills;
5. after aggregate settlement, replace only that runtime bucket from `providersWithModelsForSelection(runtime)` and read `providerSnapshots(runtime).sources` as the normal success/partial/failure authority;
6. preserve stale rows for `STALE_ERROR`; an `ERROR` source with no rows remains unavailable without erasing unrelated providers;
7. retain a `.catch` only for an unexpected aggregate failure such as an initial whole-catalog transport/programming error; log safely and re-read/preserve current store state, but do not use that branch to prove normal provider failure;
8. never make an unrelated provider gate application selection.

### 7.5 Persistence and exact proof

- Provider credentials/custom records/host settings/saved identifiers: `Directly Usable — No Migration`.
- Dynamic catalog/source status: in-memory, reconstructed by Personal owners.
- Application launch rows: unchanged direct-use sparse rooted contract.
- Nested Team Agent memory: section 6 migration remains the only new persisted-data transition.

Required proof:

1. policy/Personal availability tests for current/removed static, each canonical dynamic class, identifier-to-provider invocation, provider-granularity discovery, exact endpoint post-check, dynamic unavailable, and Codex/Claude bypass;
2. host-validator durable proof with two AutoByteus leaves backed by distinct dynamic providers: ordered ensure/fresh-read for A then B, exact `ModelInfo` per leaf, no `modelsByRuntime`, and correct credential authorities; failure variants retain exact no-upsert/no-allocation ordering in configuration/direct-run tests;
3. credential adapter tests for provider, Codex-workspace, Claude-process, Ollama/LM Studio no-credential and unsupported/null-key authorities, cache equivalence, and no model-discovery call;
4. Pinia/composable tests for stored/inherited/default/null precedence, immediate rows, `ensureMissingDynamicProviders` fulfillment when one provider mutation rejects, `ERROR`/`STALE_ERROR` snapshot retention, post-settlement re-read, and defensive unexpected aggregate rejection;
5. Personal provider/catalog/availability/credential/GraphQL/Pinia/media suites;
6. five-conflict/ten-overlap ledger and deleted-owner source audit;
7. all section 6 physical-scope/migration proof plus existing architecture, real dual-host, package, cleanup/recovery, and Electron proof.


## 8. SR-009/SR-010 Hierarchical Application Team Launch And TeamRun V2 Contract

### 8.1 Owner split and exact baseline/effective shape

The application launch boundary remains the only owner of definition-derived package/selected baselines, sparse host overlays, field provenance, and application readiness. Personal's Team execution boundary is the only owner of exact Team/Agent topology validation, identity allocation, V2 package creation/persistence/history/location, and current Team execution.

The target uses the same exact names and fields as the normative SR-010 revision of the round-5 supplement:

```ts
type ApplicationResolvedTeamLaunchBaselineScope = Readonly<{
  teamAddress: string; // canonical rooted address; root is "/"
  displayName: string;
  teamDefinitionId: string;
  runtimeKind: string | null;
  llmModelIdentifier: string | null;
  llmConfig: Record<string, unknown> | null;
  provenance: Readonly<{
    runtimeKind: ApplicationLaunchDefinitionValueSource | null;
    llmModelIdentifier: ApplicationLaunchDefinitionValueSource | null;
    llmConfig: ApplicationLaunchDefinitionValueSource | null;
  }>;
}>;

type ApplicationEffectiveTeamLaunchProfile = Readonly<{
  teamAddress: string;
  displayName: string;
  teamDefinitionId: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string;
  provenance: Readonly<{
    runtimeKind: ApplicationLaunchValueSource;
    llmModelIdentifier: ApplicationLaunchValueSource;
    llmConfig: ApplicationLaunchValueSource | null;
    workspaceRootPath: "HOST_OVERRIDE" | "APPLICATION_RUNTIME";
  }>;
}>;

type ApplicationEffectiveTeamLaunchConfiguration = Readonly<{
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  resourceDefinitionId: string;
  resourceKind: "AGENT_TEAM";
  teamScopes: readonly ApplicationEffectiveTeamLaunchProfile[];
  leaves: readonly ApplicationEffectiveLeafLaunchProfile[];
}>;
```

`teamScopes` exists only on the `AGENT_TEAM` effective variant. It is rooted, deterministic, unique by `teamAddress`, and complete. The Agent variant remains Agent-only. A runnable Team scope or leaf always has nonblank runtime, model, and resolved workspace. `llmConfig` is one atomic value associated with its resolved runtime/model and is cloned rather than merged by key.

Precedence is exact:

1. A Team scope resolves from that Team definition's application-owned default, then outer Team definitions nearest-first.
2. A leaf Agent resolves from its containing/innermost Team, then outer Teams nearest-first, then its Agent definition.
3. A sparse host slot/team runtime/model/config/workspace overlay applies to every Team scope and leaf where the existing supported declaration permits the field.
4. An exact host member override applies only to that Agent leaf.
5. Package/selected/host provenance remains observable and no run-time owner mutates package bytes or stored rows.

Application package validation, readiness, current-model selection, credential readiness, Save, and direct launch evaluate every Team scope and leaf in deterministic order. Team scopes are mandatory readiness subjects because a dynamic task Agent inherits the containing TeamRun default. Brief and Socratic root Team definitions and every maintained leaf use `codex_app_server` plus `gpt-5.6-luna` as application-owned defaults.

### 8.2 Exact SDK wire types and mapping

The application SDK explicit Team wire branch uses concrete application-owned types:

```ts
type ApplicationTeamScopeLaunchConfig = Readonly<{
  teamAddress: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: ApplicationSkillAccessMode;
  workspaceRootPath: string;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind: string;
}>;

type ApplicationTeamMemberLaunchConfig = Readonly<{
  memberAddress: string;
  displayName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: ApplicationSkillAccessMode;
  workspaceRootPath: string;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind: string;
}>;

type ApplicationTeamRunLaunch =
  | Readonly<{
      kind: "AGENT_TEAM";
      mode: "preset";
      launchPreset: ApplicationTeamRunPreset;
    }>
  | Readonly<{
      kind: "AGENT_TEAM";
      mode: "memberConfigs";
      teamConfigs: readonly ApplicationTeamScopeLaunchConfig[];
      memberConfigs: readonly ApplicationTeamMemberLaunchConfig[];
    }>;
```

There is no undefined generic `TeamConfigInput`/`MemberConfigInput`, no `teamDefaultConfig` beside `teamConfigs`, and no `teamDefinitionId` or `applicationBinding` inside `ApplicationTeamRunLaunch`: the server resolves the selected Team definition from `executionResourceRef` and creates the binding from the application/launch request. The preset branch remains a separate compact/root-inherited generic path and cannot be combined with explicit topology.

The backend SDK mapping is lossless and explicit:

| Effective field / host policy | Application SDK wire | Personal `TeamRunService` input | Classification |
| --- | --- | --- | --- |
| Team `teamAddress` | `ApplicationTeamScopeLaunchConfig.teamAddress` | `TeamRunTeamConfigInput.teamAddress` | Rooted execution identity; carried end to end |
| Team `runtimeKind`, `llmModelIdentifier`, atomic `llmConfig`, resolved `workspaceRootPath` | Same fields on `ApplicationTeamScopeLaunchConfig`; null config may be omitted after clone | Same fields on `TeamRunTeamConfigInput`; absent config normalizes to null | Required launch semantics; carried without inference |
| Team `displayName`, `teamDefinitionId`, field `provenance` | Not emitted on Team wire config | Not emitted | Diagnostic/evaluation-only; retained in configuration/readiness views |
| Leaf `memberAddress`, `displayName`, `agentDefinitionId`, runtime/model, atomic config, resolved workspace | Same fields on `ApplicationTeamMemberLaunchConfig` | Run binding drops only `displayName`; all other listed fields map to `TeamRunMemberConfigInput` | Address/definition and launch semantics; display name is application-wire diagnostic |
| Leaf field `provenance` | Not emitted | Not emitted | Diagnostic/evaluation-only; retained in configuration/readiness views |
| Existing host launch policy `autoExecuteTools=true`, `skillAccessMode=PRELOADED_ONLY` | Added by `buildEffectiveTeamRunLaunch` to every Team/member config | Carried unchanged; planner enforces root-inherited skill mode | Explicit host policy enrichment at the mapping owner, not downstream inference |

`buildEffectiveTeamRunLaunch` requires and trims every scope/member workspace before emitting the wire request, structured-clones each non-null `llmConfig`, and never re-resolves definitions, precedence, runtime, model, workspace, or provenance. `ApplicationRunBindingLaunchService` maps the concrete SDK types to Personal inputs; it may normalize runtime and nullability but may not invent a missing field.

The call sequence is fixed:

```text
ApplicationLaunchConfigurationService.requireRunnableConfiguration
  -> buildEffectiveTeamRunLaunch maps complete scopes/leaves and host tool policy
  -> ApplicationRunBindingLaunchService revalidates current selections
  -> TeamRunService.createTeamRun({ teamConfigs, memberConfigs, applicationBinding })
  -> TeamDefinitionTopologyPlanner validates exact Team/Agent coverage and completeness
  -> TeamRunIdentityAllocator allocates all Team/Agent identities
  -> V2 package persist/admit
  -> current Team execution
```

`ApplicationRunBindingLaunchService` neither traverses definitions nor calls an ID allocator. No Team or Agent ID is allocated before all selections pass. `create-application-run-services.ts` supplies one graph-local `TeamRunIdentityAllocator` explicitly to the current Team service along with the existing graph-local run/session/memory/context family. The architecture omission test treats that nested allocator argument as mandatory; there is no application fallback to a process/global allocator.

### 8.3 V2 current schema and forward migration

Normal creation, persistence, catalog, history query, restore, execution-tree location, and application binding use TeamRun execution-tree V2 only. V1 types/parsers are migration inputs only.

Startup order in both hosts is exact:

```text
TeamRun V1 prerequisite
  -> 20260823_repair_team_agent_memory_layout
  -> 20260824_team_run_execution_tree_v2
  -> later working-context/history migrations
  -> application lifecycle readiness/recovery
```

`TeamRunExecutionTreeV2AppDataMigration`:

1. reads an admitted historical V1 package;
2. obtains the direct coordinator Agent launch snapshot for every configured Team node;
3. uses that snapshot as the Team's complete V2 default and retains every Agent's exact launch snapshot;
4. preserves rooted topology, `TeamRunPhysicalScope`, and `applicationBinding`;
5. writes through the current atomic package writer;
6. rereads and validates V2 before recording success;
7. records failure/warning/retry through the existing required `ANYTIME` migration runner.

A current V2 or fresh root requires no transformation. No read-time V1 conversion, V1/V2 runtime union, compatibility alias, silent fallback, or second migration runner is allowed.

`RuntimeMemoryLocationClassifier` consumes the current V2 runtime enum. `TeamRunExecutionTreeLocationService` consumes the V2 package catalog and retains a named stored-only construction path. These migration-time owners must not resolve a live or process-global `AgentTeamRunManager`/`TeamRunService` before application construction/recovery.

### 8.4 Generated-output and form junction contract

The 30 SDK/vendor/importable package modify/delete conflicts remain deleted in source control. SDK/devkit build and application pack regenerate them as disposable validation artifacts, after which cleanup proves the canonical source tree remains the only tracked authority.

Personal's current hierarchical editable Team controls and immutable stored V2 view are retained. They compose with, but do not absorb, the existing sibling concerns:

- `RunConfigPanel` owns complete controlled workspace state and register-before-launch;
- provider store/composable owns provider-granular rows, snapshots, `Promise.allSettled` convergence, and historical/unavailable warnings;
- `MemberOverrideItem` maps a nullable effective runtime to the explicit empty presentation value where its child contract requires a string;
- `RuntimeModelConfigFields` calls provider ensure only with the resolved effective runtime, never the nullable raw field.

### 8.5 Exact proof delta

1. exact 13 content, 30 modify/delete, and 50 changed-both disposition audit;
2. SDK shape tests for Agent versus Team, rooted `teamConfigs`, no duplicate `teamDefaultConfig`, exact v6 identity/event/URL behavior;
3. package baseline/overlay/provenance tests for nested Team scopes and leaves, complete maintained root/leaf Codex/Luna defaults, incomplete-package rejection, and host unavailability;
4. host validator with Team scopes and leaves, two dynamic sources, fresh per-subject model results, exact credential authorities, and pre-upsert/pre-allocation failure;
5. planner/service tests proving exact Team/Agent coverage, validation before any allocation, planner-owned root/nested identities, dynamic Agent inheritance, and binding persistence;
6. V1 -> memory -> V2 direct/skip/fresh migration, coordinator reconstruction, atomic reread, failure/retry, V2-only catalog/history/restore/location, and stored-only no-global proof;
7. hierarchical editable/stored Team UI combined with controlled workspace, provider settlement, nullable runtime, and historical/unavailable warnings;
8. SDK/server/web/devkit builds, both maintained package build/validate/start paths, exact package parity, no tracked generated resurrection;
9. complete source review, real Studio and standalone Brief/Socratic Codex/Luna Agent Tools/handoff/publication/projection/recovery, proportional durable-test review, cleanup, and Electron v1.4.58 build/smoke.

## 9. SR-011 Canonical Host Definition And Run-Service Contract

### 9.1 One host catalog, two execution scopes

After executable-host assembly begins, one Studio or standalone process owns exactly one bound bundle-aware Agent definition service and one bound bundle-aware Team definition service constructed over that exact Agent service. The exact objects are consumed by:

- Studio public Agent/Team definition resolvers;
- general-process Agent/Team run services, backends, identity allocator, topology planner, and member context;
- application launch configuration/readiness and graph-local run construction;
- package/catalog refresh and existing process definition consumers.

Definition services are shared because they represent the host's definition catalog. Execution state is not shared: general and application AgentRunManager, AgentTeamRunManager, Agent Tools session manager, publisher, activation registry, and stop lifecycle remain non-identical.

### 9.2 Host definition lifecycle

`application-platform/definitions/create-bundle-backed-definition-services.ts` owns the concrete file-provider -> persistence-provider -> Agent service -> Team service wiring. It has exactly two allowed production callers: `compositions/host-definition-services.ts` and standalone package validation. The validator's pair is transient, read-only, unbound, and unreachable from routes, process getters, run construction, and refresh. It is discarded before executable-host assembly and is not a runtime catalog.

`compositions/host-definition-services.ts` is the only composed-host binding path. The old `application-platform/runtime/create-application-definition-services.ts` path is removed without an alias.

```ts
type HostDefinitionServices = Readonly<{
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  close(): void;
}>;
```

Construction is bundle-backed pair -> Agent bind -> Team bind with exact Agent dependency. `bindProcessInstance` fails when any instance already exists. Partial Team failure releases Agent. Idempotent `close` releases Team then Agent and releases only matching identities. Existing lazy `getInstance` remains available outside composed hosts; in a composed host, the explicit binding occurs first and every getter returns the bound object. No replacement, cache sync, fallback, or dual read is permitted.

### 9.3 Explicit general process services

`GeneralProcessRunSupervisor` requires `appConfig`, exact Agent/Team definitions, and the general MCP session manager. It explicitly constructs:

- AutoByteus, Codex, and Claude definition-dependent bootstrappers/factories;
- AgentRunManager, exact AgentRunIdentityAllocator, AgentRunService and its metadata/history/provisioning/activation dependencies;
- MemberTeamContextBuilder, mixed Team manager/factory, AgentTeamRunManager, TeamRunService and its exact planner/allocator/history/workspace/memory/readiness dependencies.

It binds the constructed AgentRunService and TeamRunService to their process getters through named `bindProcessAgentRunService` / `bindProcessTeamRunService` and exact-identity release functions, and exposes them read-only for public API registration. No definition-sensitive constructor argument listed above is optional in this assembly. Existing Codex process-scoped thread-manager/cleanup defaults that do not select definition/run/session identity retain their already-approved exact exemptions.

Close order is: stop Team runs -> stop Agent runs -> release TeamRunService -> AgentRunService -> Team manager -> Agent manager. A failed construction unwinds only completed steps in reverse order.

### 9.4 Studio public registration

The configured Studio API service set contains exact Agent definition, Team definition, Agent run, and Team run services plus existing package/bundle/capability services. Configuration returns an identity-checked close handle. Public Agent/Team run resolvers use `getStudioAgentRunService` / `getStudioTeamRunService`; their direct ambient process-service imports are removed. Definition resolvers retain their configured subject getters. A resolver may not hold both configured and ambient access to the same subject.

### 9.5 Mutation, refresh, restart, and delete semantics

```text
create/update/delete -> canonical cached definition service -> unchanged provider/files
list/launch -> same service/cache
package install/remove -> bundle refresh -> same Agent cache -> same Team cache
restart -> rebuild one service pair from unchanged roots before listen
```

Updates affect later launches only. Active runs retain their materialized definition/configuration. Delete removes the catalog item; later launch fails through the same service without package/default/other-cache fallback.

### 9.6 Pre-host migrations

The Agent and Team run-history index V2 migrations retain optional label enrichment but replace dynamic `DefinitionService.getInstance()` calls with migration-local non-caching `AgentDefinitionPersistenceProvider` / `AgentTeamDefinitionPersistenceProvider` reads. Resolution remains stored name -> persistence name -> definition ID, with the existing Team warning behavior. These reads neither initialize nor refresh host caches and are not current runtime definition authorities.

Every remaining process definition getter is governed. Composition-critical definition inputs in Team context/service, Agent allocation, AutoByteus/Codex/Claude construction, and general/application history/run construction are explicit. Agent/Team management tools, skill-improvement/built-in/package callbacks, and history fallback resolve per invocation only after host binding. External-channel resolver/options captures are host-scoped and inaccessible before binding or after listener close. The memory-compaction resolver/run service remains the existing named general-process child-execution exception: the runner is task-local, created after binding, terminates its child, and never selects application manager/session state. Agent/Team branches are removed from the fire-and-forget cache preloader because phase 20 already refreshes the exact services.

### 9.7 Full lifecycle

Studio:

```text
required process migrations/gates
-> package registry + bundle
-> HostDefinitionServices
-> AgentToolsMcpRuntime
-> GeneralProcessRunSupervisor
-> ApplicationPlatformRuntime(same definitions, separate execution state)
-> catalog/package commands
-> configured Studio API registration
-> routes/listen/recovery
```

Standalone uses the validated selected bundle, the same definition/general/application ordering, and no Studio API registration or external MCP gateway.

Close/reject is exact:

```text
stop accepting requests
-> application lifecycle stop
-> general supervisor close
-> Agent Tools close
-> configured Studio API close (Studio only)
-> existing process event/external/managed-messaging close
-> HostDefinitionServices close
-> vault/Prisma close
```

Definitions remain bound while any manager, session, tool, external process consumer, or event pipeline that may read them is alive.

### 9.8 Proof obligations

1. exact object identity across Studio definition getters, general backend/allocator/planner/context, application launch/run construction, and package refresh;
2. non-identity of general versus application run managers and Agent Tools session managers;
3. real built Studio Agent and Team create/list -> launch, update -> next launch, delete -> list absent/later launch fail, and restart -> visible/launchable;
4. application-owned definitions remain available through application configuration/run paths and package refresh/removal using the same cache objects;
5. early lazy definition/run-service creation fails host binding; no cache replacement/sync occurs;
6. package validation resolves complete bundle defaults through its transient unbound pair and leaves process definition getters uninitialized;
7. every current definition getter occurrence is classified as explicitly injected, post-bind per-call, or host-scoped-and-closed; no pre-bind/current background omission remains;
8. exact omission/null/undefined fixtures for every general definition-sensitive constructor input;
9. migration label enrichment works without instantiating process definition services and retains ID fallback/warning;
10. partial construction unwind, close twice, and second host construction after full close;
11. retained standalone/Studio real application execution, Agent Tools, publication/handoff/projection, provider/workspace, Team V2/migration, package parity, cleanup, and Electron proof.

`APIE2E-F006` is not a section-9 runtime change: final API/E2E explicitly completes V2 retry or restart after the memory-layout retry before querying the V2-only projection.


## 10. SR-012/SR-013 Member/Session-Bound Task-Delegation Contract

### 10.1 One task domain, exact per-member root scope

`RootTeamRun` remains the sole task lifecycle owner. `TaskDelegationService` remains root-owned and continues to govern admission, authorization, placement, preparation/commit/abort, persistence, events, settlement, and fail-stop. The Agent Tools task manifest, adapter family, task service/router, MCP route/catalog/dispatcher, and AutoByteus definitions remain one shared implementation.

Execution scope is not shared. Each `AgentTeamRunManager.materializeRoot()` creates one root-local `MemberTaskRootResolver` over its later-assigned local `root`. The resolver has one method and no selector:

```ts
export type MemberTaskRootResolver = Readonly<{
  resolveActiveRoot(): Promise<RootTeamRun>;
}>;
```

It rejects before bind and after the captured root becomes inactive. It never accepts a TeamRun ID, performs manager/service/registry lookup, or restores a root. General-manager roots therefore create general resolvers; application-manager roots create application resolvers without a mode branch.

### 10.2 Construction and propagation contract

Exact propagation is:

```text
AgentTeamRunManager.materializeRoot
  -> MixedTeamRunCallbacks.taskRootResolver
  -> MixedTeamRunBackendFactory (required callbacks for executable create/restore)
  -> built-in manager OR GeneralProcessRunSupervisor custom manager OR createApplicationRunServices custom manager
  -> every recursive subteam manager
  -> MixedConfiguredMemberRegistry and MixedTaskAgentExecutionRegistry
  -> MixedAgentMemberHandle
  -> MemberTeamContextBuilder.build(required taskRootResolver)
  -> frozen MemberTeamContext
  -> AgentRunConfig
```

`MemberTeamContext` has exactly one authoritative identity plus collaboration, authored instruction, and the required resolver. It does not default or expose a nullable task resolver. Configured, restored, nested configured, task-Agent, and task-Team descendants of one root carry the same resolver identity. A child RootTeamRun created by a separately delegated Team owns its own root resolver only when it is itself a new root execution, consistent with the current RootTeamRun boundary.

The closure is the existing narrow root-binding construction pattern already used for `deliverInterAgentMessage` and `acceptPlatformBinding`. It is not a generic deferred port/container and does not introduce a reverse transport dependency.

Executable-factory contract:

```ts
createBackend(
  config: TeamRunConfig,
  teamRunId: string,
  callbacks: MixedTeamRunCallbacks,
): Promise<MixedTeamRunBackend>;

restoreBackend(
  config: TeamRunConfig,
  teamRunId: string,
  callbacks: MixedTeamRunCallbacks,
): Promise<MixedTeamRunBackend>;
```

`noopCallbacks()` is removed. `createBackendForNode` already requires callbacks and stays required. The factory constructor's optional `createTeamManager` remains valid because the built-in manager is a concrete implementation; it copies `input.callbacks.taskRootResolver`. `buildTeamRunContext()` remains callback-free because it creates only immutable context and cannot materialize an executable root.

Both composition-owned custom managers have the same explicit forwarding obligation:

```ts
new MixedTeamManager(context, {
  // existing exact general or application dependencies
  taskRootResolver: callbacks.taskRootResolver,
  publish: callbacks.publish,
  deliverInterAgentMessage: callbacks.deliverInterAgentMessage,
  acceptPlatformBinding: callbacks.acceptPlatformBinding,
});
```

The general supervisor uses its process manager/session family; application run services use their graph-local manager/session family. Only the resolver field shape is shared. Neither composition may omit it or obtain the other scope's owner.

### 10.3 Exact session capability variants

The composed general and application `AgentToolMcpSessionService` instances keep their exact scoped publisher and session registry. `AgentToolMcpSessionServiceDeps` takes a tight base capability containing that publisher rather than a prebuilt final session variant; each session issue derives a non-null discriminated union variant. The existing service constructed with `null` for `ApplicationAgentToolMcpSessionScope` remains revoke-only and cannot issue:

```ts
type AgentSessionExecutionCapabilities = Readonly<{
  kind: "agent";
  publishedArtifactPublisher: PublishedArtifactPublisher;
}>;

type TeamMemberSessionExecutionCapabilities = Readonly<{
  kind: "team_member";
  publishedArtifactPublisher: PublishedArtifactPublisher;
  taskDelegation: Readonly<{
    identity: TeamMemberExecutionIdentity;
    rootResolver: MemberTaskRootResolver;
  }>;
}>;

type AgentToolMcpSessionExecutionCapabilities =
  | AgentSessionExecutionCapabilities
  | TeamMemberSessionExecutionCapabilities;
```

Session issuance rules:

1. non-Team Agent sender -> `kind: "agent"`;
2. Team-member sender -> require `owner.runId === member.identity.agentRunId`, require exact `owner.teamIdentity` equality across root ID/member address/AgentRun ID, then issue `kind: "team_member"` using the member resolver;
3. missing/mismatched Team owner data -> reject issuance and return no descriptor/token;
4. registry clone/freeze keeps value identity defensive copies and the exact immutable resolver reference;
5. capability token authentication and revocation remain unchanged. A revoked session never reaches adapter execution.

The task adapter's catalog availability can continue to use the member sender for pre-session exposure, but execution requires the authenticated `team_member` capability. It may not rebuild task context from sender fields. Publication adapters continue to consume the publisher in either union variant.

### 10.4 Shared service/router contract

```ts
export type TaskDelegationToolContext = Readonly<{
  identity: TeamMemberExecutionIdentity;
  rootResolver: MemberTaskRootResolver;
}>;

export class TaskDelegationToolRunRouter {
  async resolveRoot(context: TaskDelegationToolContext): Promise<RootTeamRun> {
    return context.rootResolver.resolveActiveRoot();
  }
}
```

`TaskDelegationToolService` retains its three methods and one router. The router is stateless with respect to general/application execution scope. `task-delegation-tool-service.ts` removes the `getTeamRunService()` import and default root resolver; `task-delegation-tool-run-router.ts` removes inactive-root restore wording and any caller-selected TeamRun ID resolution.

The adapter builds no alternate context. It reads the frozen `taskDelegation` capability and passes it to the unchanged manifest method. Root methods then apply existing identity and task authorization.

### 10.5 AutoByteus bound tool contract

AutoByteus Team-member task tools are server-owned equivalents of the MCP task adapters, not native Codex/Claude file tools. Registration remains process readiness for the three definitions, but registration does not create an executable unbound instance.

`resolveAutoByteusAgentTools` recognizes all `TASK_DELEGATION_TOOL_NAME_LIST` members and calls `defaultToolRegistry.createTool(name, new ToolConfig({ taskDelegation: exactContext }))`. Each task tool class requires and freezes that context at construction and calls the same manifest/service. A missing/wrong config fails construction. The old `task-delegation-autobyteus-context.ts` identity-only custom-data parser and test are removed. No native execution-time custom data, process Team service, or compatibility fallback selects the root.

### 10.6 Runtime and lifecycle traces

Application Team member:

```text
application business action
-> application AgentTeamRunManager / RootTeamRun
-> application member context / application-scoped session
-> authenticated task adapter
-> shared stateless task service/router
-> application member resolver
-> same application RootTeamRun
-> existing task mutation/persistence/event/result
```

General Team member follows the identical spine from the general supervisor's manager and reaches only its general root. AutoByteus replaces session/adapter with its bound tool instance but uses the same resolver/service/router/root.

| Failure/lifecycle edge | Exact result |
| --- | --- |
| root not assigned during construction | `TEAM_ROOT_NOT_BOUND`; no member session/tool publication |
| session owner/member identity mismatch | session issuance rejects before token/descriptor |
| capability missing or not `team_member` | task adapter rejects before manifest/service |
| session revoked | route authentication rejects before adapter |
| root quiescing/fail-stopped/terminated | resolver/root admission rejects before task mutation |
| root terminated while session object remains observable | resolver does not restore or look up a replacement |
| manager/application/host close | existing run/resource cleanup revokes sessions and closes task admission; no new close owner |

### 10.7 Allowed and forbidden dependencies

Allowed:

```text
RootTeamRun owner -> root-specific resolver -> immutable member context
member context -> scoped session or bound AutoByteus tool
transport/native adapter -> shared task service/router -> supplied resolver -> same RootTeamRun
```

Forbidden:

- task tool/service/router -> `getTeamRunService()`, AgentTeamRunManager singleton, application runtime internals, or a process/application manager map;
- session/adapter -> application-ID mode switch or arbitrary root ID lookup;
- application session -> general manager/session/root;
- general session -> application manager/session/root;
- nullable optional task fields on one broad capability bag;
- root restore or cross-scope fallback;
- duplicate route, catalog, manifest, task service, persistence owner, or manager;
- service locator, generic DI container, generic event bus, mutable singleton replacement, late-bound generic port, compatibility wrapper, or dual execution path.

### 10.8 Exact source and proof delta

Add one file: `agent-team-execution/task-delegation/member-task-root-resolver.ts`. Modify the manager/mixed callbacks/member context, **both** supported custom manager assemblies (`general-process-run-supervisor.ts` and `create-application-run-services.ts`), MCP session types/service/registry/runtime/provider, task context/router/service, all three AutoByteus task tools plus registration/resolver, and the exhaustive construction/test set listed below and in `integration-path-inventory.txt` SR-013. Remove `task-delegation-autobyteus-context.ts`, `noopCallbacks`, and the parser test; do not add an alias or fallback.

Current-tree occurrence authority at reviewer HEAD `a5a613153...`:

| Family | Production | Tests / fixtures | Required proof |
| --- | ---: | ---: | --- |
| direct `new MixedTeamManager` | 3: built-in factory, general supervisor, application services | 3: manager unit, interrupt unit, configured-overlap unit | every occurrence passes a required resolver; default/general/application reference identity |
| direct `new MixedTeamRunBackendFactory` | 3: cached default, general supervisor, application services | 8: three integration factory, two unit factory, one configured-overlap, two context-only subteam-factory | all executable create/restore calls carry complete callbacks; the two context-only cases never call executable methods |
| `MixedTeamRunCallbacks` producer/capture | 1 real producer in `AgentTeamRunManager.materializeRoot` | one typed fake capture in manager integration plus explicit factory/configured-overlap callbacks | fresh/restore exact resolver; no no-op callback producer |
| `MemberTeamContextBuilder.build` | 1 in mixed Agent member handle | 5: four builder unit calls and one Brief prompt integration call | required resolver and exact frozen reference |
| direct `new MemberTeamContext` | 1 inside builder | 4: shared current-Team fixture, Codex thread manager, Codex thread, token-usage enrichment | explicit test resolver; no nullable/default field or `as never` bypass |

The architecture guard owns exact occurrence counts and categories. It must fail when a new governed occurrence appears, when general/application/built-in manager forwarding is absent, when `noopCallbacks` exists, or when an executable callback/member resolver can be omitted, set to `null`, or set to `undefined`. It deliberately permits the two named `mixed-sub-team-run-factory.test.ts` constructors only while their call graph is limited to `buildTeamRunContext()`.

Required durable proof:

1. exact propagation through configured, restored, nested, task-Agent, and task-Team paths;
2. ordinary versus Team-member session variants and exact owner/member validation;
3. real application task call mutates only the application root while a live general root remains unchanged;
4. distinct general task call mutates only the general root while an application root remains unchanged;
5. same proof for AutoByteus bound task tool resolution;
6. pre-bind, missing capability, owner mismatch, inactive/fail-stopped root, and revoked session fail before store/event change;
7. architecture guard finds no process Team service import on the task execution path, no `noopCallbacks`, no omitted resolver at any production/test construction site, exact default/general/application forwarding, and only the two named non-executable context-only factory cases;
8. one route/catalog/manifest/service/persistence owner, unchanged token/revocation, and unchanged native Codex/Claude tools;
9. retained complete dual-host, package parity, provider/workspace/Team V2/migration, publication/handoff/projection/recovery/cleanup, source review, API/E2E, durable-test review, and Electron proof.

Persisted state is `Directly Usable — No Migration`: no task record, Team execution tree, launch profile, package, SDK/GraphQL/MCP wire shape, or database schema changes.
