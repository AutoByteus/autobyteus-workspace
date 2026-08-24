# Integration Runtime Contracts — Latest Personal + Universal Application Framework

## Status And Authority

- Status: Implemented and verified runtime supplement through `SR-007`/DR-007. Sections 1–7 remain the passed runtime contract. SR-008 adds no runtime change; its controlled Studio workspace/test delta is defined in `latest-base-refresh-round-4-design-analysis.md`.
- Purpose: Preserve the resolved lifecycle/activation/persistence/tool contracts and define the exact newest-Personal physical-scope plus provider-capability transitions without reopening those owners.
- Related behavior and requirements: BEH-003–BEH-010; REQ-004–REQ-011; AC-005–AC-029.
- Scope: Internal integration behavior only. SR-008 preserves these runtime contracts unchanged and adds no host, route, compatibility path, provider persistence, or migration.
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
| 12 | Construct process Agent Tools runtime and named general-process run supervisor | `buildStudioServer.ts` for Studio; standalone starter before application platform construction | Yes | Yes | S | Construction failure closes whichever process owner exists, then repository resources. General-process defaults are permitted only inside the named general-process assembly. |
| 13 | Construct package/catalog/definition/application services and Fastify routes | Explicit host builder | Yes | Yes | A | Studio constructs package registry/commands/catalog refresh/definitions/application platform, Fastify logging/access policy, internal Agent Tools, external Studio MCP gateway, CORS, multipart limits, WebSocket, remote-access policy, mobile static, REST, WebSocket, and GraphQL. Standalone constructs selected definitions/platform plus Fastify logging/access policy, WebSocket, selected-app REST/realtime, internal Agent Tools, and selected static routes; it has no CORS/multipart/mobile/GraphQL/external gateway unless already part of the approved standalone inventory (they are not). Failure closes Fastify if built, then application and process resources. |
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
| 27 | Schedule noncritical process background work | Studio `scheduleStudioBackgroundTasks`: cache preload, external MCP registration, memory-sync worker | Yes | No | BG after ready | Module/load/run errors are logged and never change ready state. Workspaces, customizations, required Agent Tools, and Search are absent from this background list because phases 14–16 own them. |

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
-> process MCP/general-run owners -> Studio/application assembly -> application prepare
-> listen -> channel/gateway transports -> internal URL -> managed messaging
-> application recovery -> READY -> Studio-only background scheduling
```

Standalone:

```text
resolve/validate package -> materialize isolated root -> logging -> core migration
-> protected paths -> Prisma -> token schema -> vault -> app-data statuses
-> token readiness -> TeamRun catalog -> readable-provider gate -> reset run pipeline
-> process MCP/general-run owners -> selected application assembly -> application prepare
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
-> channel output runtime -> gateway callback runtime -> managed messaging
-> default run-event pipeline -> secret vault -> Prisma
```

Standalone closes:

```text
general-process run supervisor -> process Agent Tools MCP runtime
-> default run-event pipeline -> secret vault -> Prisma
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
