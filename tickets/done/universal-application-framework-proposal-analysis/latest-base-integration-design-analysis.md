# Latest-Base v1.4.50 Integration Design Analysis

## Status And Decision

- **Analysis date:** 2026-08-13
- **Ticket checkpoint:** `42d43674d8215c3987d8a6e265a2648c754bf6de`
- **Prior integrated base:** `8b8ae4c304928b391bdd5466b2262f87d43cf272` (`v1.4.35`)
- **Required tracked base:** `origin/personal@54890a07f74e941a7a12b6daaa26364f4c927b72` (`v1.4.50`)
- **Merge base:** `8b8ae4c304928b391bdd5466b2262f87d43cf272`
- **Classification:** `Design Impact — Base Evolution`
- **Decision:** preserve the passed Universal Application architecture, but revise its integration contract before resolving the paused merge. Three conflict paths combine separately approved behaviors, one auto-merged constructor call now passes a required application-scoped dependency to a removed positional parameter, and two checkpoint-owned durable tests must move cleanly from v1.4.35 seams deleted by v1.4.50 to their current production owners.
- **Routing:** architecture review is required before implementation resolves or commits the merge. Delivery remains paused.

This is not a request for a new platform subsystem or a broad refactor. It is a bounded semantic reconciliation of the passed ticket architecture with mandatory upstream behavior introduced across 231 base commits. Selecting all of either conflict side would lose approved behavior.

## Evidence And Reachability

| Evidence | Concrete Observation | Supported Trigger / Contract | Reachability | Material Consequence |
| --- | --- | --- | --- | --- |
| `server-runtime.ts` stage 2 versus stage 3 | The ticket owns `buildStudioServer` plus application lifecycle; v1.4.50 requires `20260803_custom_provider_readable_identity` to finish as `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS` before server startup | Operator starts Studio with legacy custom-provider selectors or a migration failure | Reachable | Taking the ticket side can listen with unreadable provider identities; taking base side deletes the reviewed server/runtime structure |
| `published-artifact-publication-service.ts` stage 2 versus stage 3 | The ticket owns application-scoped run/relay/stores and snapshot/projection consistency; v1.4.50 moves run event emission to awaited `run.publishEvent()` after durable projection | Active application agent publishes an artifact | Reachable | Taking the ticket side bypasses the current run-event lifecycle pipeline; taking base side reintroduces process-global publication dependencies and older contracts |
| `ApplicationAgentLaunchProfileEditor.vue` stage 2 versus stage 3 | The ticket owns sparse package/selected-resource inheritance and LLM-config portability; v1.4.50 preserves unavailable model selectors and blocks entry | Studio opens a saved or inherited model that the refreshed host catalog cannot resolve | Reachable | Taking the ticket side silently clears an explicit saved choice; taking base side loses authoritative inherited-baseline editing |
| `CodexThreadBootstrapper` constructor and callers | v1.4.50 removes the old strategy parameters; the application and general-process callers still pass their session manager at former argument 7 although the constructor now accepts arguments 0–5 | Business code starts a Codex-backed application agent or general-process agent | Reachable | The intended session manager is ignored at runtime and the bootstrapper selects its default MCP session service; AFB-004 also checks the obsolete position |
| 23 auto-merged common paths | Agent/team lifecycle, prompt construction, Agent Tools sessions, tool loading, GraphQL definition access, tests, and localization changed on both sides | Existing Studio/standalone run, handoff, MCP, prompt, and cleanup journeys | Reachable | A textual auto-merge is not behavioral proof; exact application-scoped identity and new upstream lifecycle behavior both require focused regression |
| Checkpoint-owned tests versus removed v1.4.50 seams | `brief-package-team-prompt.integration.test.ts` directly imports removed `TeamMemberCodexThreadBootstrapStrategy`; `agent-tools-mcp-runtime.test.ts` imports removed `configured-agent-tool-exposure.ts` | The mandatory tracked-base merge resolves ordinary test imports before the latest-base suite can prove AC-017/AC-025 | Reachable | The integrated suite cannot resolve, so the final-prompt and scoped Agent Tools lifecycle proofs are absent unless both tests follow the current production path cleanly |

## Fixed Architecture Baseline

The following passed behavior remains non-negotiable:

1. `buildStudioServer` and `buildStandaloneApplicationServer` remain the two explicit assembly roots. There is no `buildServer(mode)` and no return to the monolithic full server.
2. `ApplicationPlatformRuntime` still exposes only lifecycle, REST, realtime, and host-management projections; private stores, run/session owners, engine state, queues, recovery, and shutdown remain internal.
3. The same immutable package bytes run in Studio and standalone. Brief and Socratic retain complete application-owned Codex / GPT-5.6 Luna launch defaults and Studio sparse overrides.
4. Application runs, Agent Tools sessions, publication, team context, cleanup, and artifact delivery continue to use the exact application-scoped owners. No process-global application fallback is permitted.
5. Standalone retains its internal `/mcp/agent-tools/:sessionId` route and does not expose Studio's external `/mcp/gateway` or inherit Studio MCP configuration.
6. Package, database, route, wire, worker, capability-token, provider, artifact, and shutdown contracts remain unchanged except for adopting the already-mandatory v1.4.50 run-event and provider-migration behavior.
7. The ticket still introduces no database-schema or ticket-owned data migration. Both hosts nevertheless execute and enforce migrations owned by the tracked base.
8. AFB-001–AFB-005 remain authoritative; their source-position facts must track the current constructor signature rather than preserve an obsolete argument number.

## Intended Combined Behavior

### 1. Studio Startup And Required Readable-Provider Migration

**Owner:** `initializeStudioProcessResources()` followed by `buildStudioServer()` and `ApplicationPlatformLifecycle`.

```text
startConfiguredServer
  -> initialize logging and schema migration
  -> configure protected database paths
  -> initialize Prisma
  -> initialize secret vault
  -> run pending base-owned app-data migrations
  -> inspect CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID
       SUCCEEDED / SUCCEEDED_WITH_WARNINGS -> continue
       missing / RUNNING / FAILED / runner exception -> throw before runtime construction/listen
  -> buildStudioServer
  -> applicationRuntime.lifecycle.prepareBeforeListen
  -> listen
  -> recoverAfterListen and background work
```

Rules:

- Import and use the base-owned `CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID`; do not duplicate its literal in the server entry.
- The readable-provider migration is a mandatory startup gate. Its missing result is `NOT_RUN`; its diagnostic continues to include status and log path.
- An ordinary non-required migration failure may retain the existing Studio warning policy. Do not generalize this one base contract into a new all-migration policy.
- A gate failure throws through the existing startup error path. Vault and Prisma are closed; `buildStudioServer`, `prepareBeforeListen`, and `listen` are not called.
- Standalone needs no parallel special case. Its existing `requiredOnStartup` gate already includes this migration and remains the generalized standalone owner.

### 2. Artifact Durability And Awaited Run-Event Publication

**Owner:** the exact `PublishedArtifactPublicationService` instance constructed for the application runtime.

```text
publishForRun
  -> resolve exact application active run or permitted fallback context
  -> snapshot source file
  -> write projection containing the snapshot revision
       failure -> delete the new snapshot and fail
  -> clone committed summary
  -> active run: await run.publishEvent(ARTIFACT_PERSISTED)
     fallback context: await emitArtifactPersisted
  -> fallback application context only: await exact application relay
  -> return summary
```

Rules:

- Retain the ticket's injected `activeRunReader`, application relay, projection store, snapshot store, publisher interfaces, and fallback context. Do not restore `AgentRunManager.getInstance()` or a default application relay in application construction.
- Adopt `await run.publishEvent(...)`; `emitLocalEvent()` is no longer the authoritative active-run publication path.
- Snapshot deletion is limited to failure before the projection commit completes. Once projection refers to the snapshot, an awaited run-pipeline rejection or fallback relay rejection may surface; active listener/delivery failure retains its existing logged/contained policy. None may delete the committed snapshot or projection.
- Existing queue-backed application delivery, worker `ensureReady`, projection, UI reconciliation, and best-effort relay policy remain unchanged downstream of the run event.

### 3. Sparse Inheritance Plus Unavailable-Model Retention

**Owner:** server `ApplicationLaunchConfigurationService` for baseline/effective configuration; Studio editor only renders and edits the supplied projection.

```text
manifest/selected-resource baseline
  + sparse Studio draft override
  -> effective runtime = explicit draft runtime else inherited runtime
  -> effective model = explicit draft model else inherited model
  -> host catalog lookup for that effective pair
       available -> ready when all other required fields pass
       unavailable -> retain identifiers, show warning, block entry
       missing -> show required-model diagnostic, block entry
```

Rules:

- Keep required `inheritedProfile`, `allowBlankRuntime: true`, `useDefaultRuntimeFallback: false`, `effectiveRuntimeKind`, and supported-`llmConfig` sanitization.
- Compute availability from the effective model, not only the sparse draft field.
- Never auto-clear an unavailable explicit selector and never replace an unavailable inherited selector. The warning names the unresolved effective identifier.
- Blank draft fields continue to mean inheritance; they are not invalid merely because the override is sparse.
- Explicit runtime/model changes may clear incompatible explicit `llmConfig` as today. Reset remains the explicit server-owned deletion of the saved override and never mutates the package.

### 4. Codex Session-Manager Signature Reconciliation

The v1.4.50 `CodexThreadBootstrapper` arguments are now:

| Position | Meaning | Application construction |
| --- | --- | --- |
| 0 | workspace skill materializer | approved process default |
| 1 | workspace resolver | approved process default |
| 2 | agent definition service | exact application service required |
| 3 | skill service | approved process default |
| 4 | client manager | approved process default |
| 5 | Agent Tools session manager | exact application manager required |

Required changes:

- `create-application-run-services.ts` constructs `CodexThreadBootstrapper(undefined, undefined, input.agentDefinitionService, undefined, undefined, agentToolsSessionManager)`.
- `general-process-run-supervisor.ts` constructs it with the named process session manager at argument 5.
- AFB-004 changes only its `CodexThreadBootstrapper` session-manager obligation from argument 7 to argument 5. Argument 2 remains required in application construction.
- Omission/null/undefined fixtures and current-tree occurrence checks follow argument 5. No compatibility overload or old eight-argument call remains.

## Auto-Merged Overlap Disposition

| Overlap Group | Paths / Concern | Intended Disposition |
| --- | --- | --- |
| Definition and prompt | file definition provider, GraphQL agent definition, member context builder, mixed member/manager/registries | Retain explicit application definition/team service injection and package defaults. Adopt upstream prompt/lifecycle changes only where those injected services remain the source. No global definition fallback. |
| Run and team lifecycle | default event pipeline, agent/team run managers, mixed handles/registries | Retain exact active-run registry/resource cleanup, team-context/session identity, and application relay. Adopt upstream centralized run/team status and event-publication behavior. |
| Agent Tools MCP | session state/registry/service/session and route tests | Retain one process runtime family, exact scoped application manager/publisher, capability auth, revocation, and route split. Adopt upstream runtime-exposure/session lifecycle changes without creating a second catalog or default application session service. |
| Tool loading | `startup/agent-tool-loader.ts` | Retain the ticket's fail-closed required platform groups and current Search/Published Artifact readiness while accepting removal of upstream-obsolete skill registration. No count or fallback inferred from old source. |
| Provider identity and launch UI | editor plus English/Chinese localization | Use canonical provider identifiers after the required migration and preserve unavailable-selection messaging for the effective inherited-or-explicit model. No label-derived identity or silent alternative. |
| Durable tests and docs | publication, run-manager, MCP cleanup/route tests and architecture docs | Reconcile expectations to the combined contracts. Auto-merged tests are not evidence until focused and full suites pass. |

The exact twenty-three auto-merged common paths, excluding the three marked conflicts, are:

```text
autobyteus-server-ts/docs/ARCHITECTURE.md
autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts
autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts
autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts
autobyteus-server-ts/src/agent-execution/events/default-agent-run-event-pipeline.ts
autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts
autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts
autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-persistent-member-registry.ts
autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-agent-instance-registry.ts
autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts
autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts
autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts
autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts
autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts
autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts
autobyteus-server-ts/src/api/graphql/types/agent-definition.ts
autobyteus-server-ts/src/startup/agent-tool-loader.ts
autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts
autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts
autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts
autobyteus-server-ts/tests/unit/services/published-artifacts/published-artifact-publication-service.test.ts
autobyteus-web/localization/messages/en/applications.ts
autobyteus-web/localization/messages/zh-CN/applications.ts
```

No maintained Brief or Socratic package source changed between v1.4.35 and v1.4.50, so the exact application package baseline and parity contract remain in force.

## Checkpoint Durable-Test Transition Audit

The bounded audit covered every checkpoint-added or checkpoint-modified non-deleted durable test target relative to v1.4.35: **44 test targets and 254 relative source imports**. A quoted-relative-source scan also covered `require`, literal dynamic import, and test-mock module specifiers. Exactly five checkpoint imports referenced source deleted by v1.4.50:

| Checkpoint test | Removed seam | Current disposition |
| --- | --- | --- |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | `configured-agent-tool-exposure.ts` | Already one of the 23 common-changed paths; the current auto-merge uses `buildRuntimeAgentToolExposure(...)` and `runtimeExposure`. Inspect and execute; no additional manual edit is planned unless the focused owner test identifies a semantic mismatch. |
| `tests/unit/agent-execution/agent-run-manager.test.ts` | `configured-agent-tool-exposure.ts` | Same auto-merged current-owner conversion; retain as focused overlap proof. |
| `tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts` | `configured-agent-tool-exposure.ts` | Same auto-merged current-owner conversion; retain as focused overlap proof. |
| `tests/integration/application-backend/brief-package-team-prompt.integration.test.ts` | `TeamMemberCodexThreadBootstrapStrategy` | Explicit Modify. Exercise the current `CodexThreadBootstrapper.bootstrapForCreate(...) -> composeCarpenterPrompt(...)` production path. |
| `tests/unit/agent-tools/mcp/agent-tools-mcp-runtime.test.ts` | `configured-agent-tool-exposure.ts` | Explicit Modify. Build `RuntimeAgentToolExposure` and issue sessions through the current `runtimeExposure` input. |

No other checkpoint-added/modified durable test import or literal module reference targets v1.4.50-removed source. This is a closed file-level transition audit, not permission to skip compile or runtime verification of retained source whose API changed in place.

### Brief package prompt proof

The existing test continues to validate the actual Brief package and resolve its package-local team and researcher through the exact application definition services. It builds `MemberTeamContext` with the injected application `AgentTeamDefinitionService`, then supplies that context and researcher ID to a current `AgentRunContext`. A `CodexThreadBootstrapper` receives explicit test collaborators, including the exact application `AgentDefinitionService` at constructor argument 2 and the exact Agent Tools session manager at argument 5, and `bootstrapForCreate(...)` produces the real `codexThreadConfig.baseInstructions` through `composeCarpenterPrompt(...)`.

Assertions remain semantic and package-owned: the final base instructions contain the exact imported `team.md` instruction, the exact researcher instruction, the Team Instruction and Team Runtime/member sections, and no application team/agent definition lookup reaches a process-global `getInstance()`. The test must not import the removed strategy, call `composeCarpenterPrompt` directly as a substitute for the bootstrapper path, restore an alias, or copy prompt-composition logic into the test.

### Agent Tools runtime lifecycle proof

The runtime test imports `buildRuntimeAgentToolExposure` from `runtime-agent-tool-exposure.ts`; session input uses `runtimeExposure`, not the removed `configuredExposure`. Its behavior contract remains unchanged: general and application sessions resolve their distinct injected publishers; closing the application manager blocks new sessions and revokes only its scope; the general session remains valid; repeated application/process close is idempotent; process close clears remaining sessions; and a closed process runtime refuses a new application manager. The test uses the current runtime/session shape and must not restore the deleted exposure module or a compatibility adapter.

## Exact Change Inventory

### Modify

- `autobyteus-server-ts/src/server-runtime.ts`
- `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts`
- `autobyteus-web/components/applications/setup/ApplicationAgentLaunchProfileEditor.vue`
- `autobyteus-server-ts/src/application-platform/runtime/create-application-run-services.ts`
- `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts`
- `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts`
- `autobyteus-server-ts/tests/unit/server-runtime-app-data-migration-gate.test.ts`
- `autobyteus-server-ts/tests/unit/services/published-artifacts/published-artifact-publication-service.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/brief-package-team-prompt.integration.test.ts`
- `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tools-mcp-runtime.test.ts`
- `autobyteus-web/components/applications/setup/__tests__/ApplicationAgentLaunchProfileEditor.spec.ts`
- only those auto-merged overlap tests whose assertions do not match the combined behavior after focused execution
- current ticket solution/review/implementation/delivery artifacts as owned by their roles

### Add

- No production module.
- Durable test cases may be added inside existing owners; a new integration test file is allowed only if the current owner file cannot express the supported path without mixing concerns.

### Remove / Rename / Move

- None beyond the upstream changes already present in v1.4.50.
- Do not add compatibility overloads, aliases, duplicate startup gates, old/new event paths, or legacy argument support.

## Verification Delta

The integrated candidate is not proven by conflict resolution alone. Required evidence is:

1. `git diff --check` and no unresolved merge entries.
2. Dependency installation/generation required by the current repository, then server TypeScript/build.
3. AFB-001–AFB-005 architecture test: current tree and all fixtures pass; the Codex obligation is argument 2 plus argument 5 and no source mentions the obsolete argument 7.
4. Studio migration-gate tests:
   - `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` permit `buildStudioServer` and later listen;
   - missing, `RUNNING`, `FAILED`, or runner exception prevents builder/listen and closes initialized vault/Prisma;
   - an unrelated ordinary migration failure retains the documented warning policy;
   - standalone `requiredOnStartup` validation continues to cover the readable-provider migration.
5. Publication tests:
   - projection failure deletes the unreferenced snapshot;
   - active run awaits `run.publishEvent` exactly once with the committed summary;
   - event-pipeline rejection does not delete the committed snapshot/projection;
   - fallback emitter/relay uses the exact injected application relay and preserves its prior policy.
6. Editor tests:
   - unavailable explicit model is retained, warned, and blocking;
   - blank draft plus unavailable inherited model is warned and blocking;
   - blank draft plus available inherited model is ready;
   - available explicit override is ready;
   - unsupported/incompatible `llmConfig` is still sanitized only by its existing field/runtime rules.
7. Checkpoint transition tests:
   - Brief package prompt proof uses `CodexThreadBootstrapper.bootstrapForCreate(...) -> composeCarpenterPrompt(...)`, includes the exact package team/agent instructions and current member context, and proves no global definition lookup;
   - Agent Tools runtime proof uses `buildRuntimeAgentToolExposure` / `runtimeExposure` while preserving publisher identity, application-scope-only revocation, idempotent close, general-session survival, and process-close rejection;
   - a current-tree scan finds no checkpoint durable test importing or directly referencing the two deleted seams.
8. Focused merged-overlap suites for agent/team lifecycle, prompt/team instruction, Agent Tools descriptor/auth/revocation/tool dispatch, run cleanup, tool readiness, GraphQL definition access, and localization. The three audit hits already corrected by auto-merge are explicitly included.
9. Full implementation source review and the current repository suite required by the implementation handoff.
10. API/E2E rerun of both real Brief hosts on v1.4.50: package-owned Codex/Luna readiness, authenticated tools, recipient-name handoff, awaited publication, projection/UI update, worker-exit restart, recovery/remount, route separation, cleanup, and exact `73/73` package parity.
11. Latest-base Electron build/package verification and final integration audit. DR-008 evidence is historical and cannot stand in for this candidate.

An isolated, disposable merge probe confirmed that the architecture boundary suite (`14/14`), publication unit suite (`15/15`), and the existing editor test after signature/prop fixture alignment can execute with the combined direction. The probe also demonstrated that the current startup-gate test reaches `buildStudioServer` instead of mocking the new assembly boundary and therefore needs the test-owner update listed above. Probe evidence is diagnostic only; it is not implementation or delivery proof.

## Design-Principles Validation

- **Approved production reality:** every change combines existing ticket behavior with a v1.4.50 behavior already present on the required base; no speculative host or provider is introduced.
- **Product Reachability Gate:** Studio startup, application artifact publication, Studio editing, and Codex application execution are all maintained product paths.
- **Spine span sufficiency:** each decision covers initiating trigger, authoritative owner, forward effect, return/failure semantics, cleanup, and required evidence.
- **Ownership:** startup gate stays in process-resource initialization; event publication stays in the application-scoped publisher/run pipeline; configuration authority stays server-side while the editor renders it; session-manager wiring stays at explicit construction roots.
- **Authoritative boundaries:** no package mutation, process-global application fallback, UI-side precedence reconstruction, duplicate MCP runtime, or whole-side merge selection is permitted.
- **Clean-cut integration:** obsolete eight-argument calls and AFB position 7 are removed rather than supported in parallel.
- **Proportionality:** five production files require bounded reconciliation because the base changed their real contracts; two checkpoint-only durable tests require clean current-owner transitions; the remaining work is focused tests and existing documentation. No new framework, facade, event bus, lifecycle abstraction, compatibility seam, or directory reorganization is justified.
- **Persisted-data truth:** the ticket adds no migration, while the host must honor the tracked base's required readable-provider app-data migration before serving application behavior.

## Decision Summary

The correct integration is **not** ours or theirs. It is:

> keep the ticket's explicit dual-host assembly and application-scoped authorities; adopt v1.4.50's mandatory readable-provider startup gate, awaited run-event publication, unavailable-model retention, and current Codex constructor contract; then prove all auto-merged shared spines on the latest base.

This bounded SR-018 correction is ready for architecture re-review. Production and durable-test merge resolution remains implementation-owned after approval.
