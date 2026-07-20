# Investigation Notes — Application Backend Context Capability Naming Refactor

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree reused and refreshed before investigation.
- Current Status: Requirements refined and approved; the forward-only/no-migration package has been corrected after architecture review round 3 found two stale migration assertions in active artifacts.
- Investigation Goal: Preserve the completed framework analysis while replacing the ambiguous app-backend `runtimeControl`/`bindingIntentId` API with inferable domain capability namespaces and launch-request terminology.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`.
- Scope Classification Rationale: No product capability change, but the public backend handler contract, worker bridge adapter, SDK contracts/exports, current schema definitions/baseline SQL, docs/tests/templates, two built-in apps, and checked-in generated backends must cut over together.
- Scope Summary: Clean backend-context API and launch-correlation naming refactor. The application feature is pre-release; source/schema definitions are updated directly and validated from isolated fresh test storage with no migration or compatibility behavior. Application-scoped runtime-output streaming is deferred.
- Primary Questions To Resolve:
  - Which responsibilities are currently aggregated under `runtimeControl`?
  - Does the context support standalone agents, agent teams, or both?
  - What public names make each capability inferable?
  - Which active source/generated consumers must be cut over?
  - Which compatibility/version boundary prevents old bundles from loading against an incompatible context?
  - Which schema/source definitions require direct launch-request renaming for the single forward schema?

## Request Context

The original request asked for an application-framework architecture analysis and an application-bound agent-output stream. Through the subsequent architecture discussion, the user identified the more immediate developer-experience problem: `runtimeControl` and `runs` do not explain their purpose. On 2026-07-20 the user selected the following direction and asked to keep this ticket small by doing the naming refactor first:

```text
context
├── agentExecution
├── agentResources
├── publishedArtifacts
├── storage
└── publishNotification
```

The user subsequently approved `launchRequestId` and `findByLaunchRequestId` as clearer names, confirmed the requirement was clear, and instructed the team to kick off the refactoring ticket. Streaming remains a documented follow-up, not an implementation requirement here.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git` superrepository.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework`.
- Current Branch: `codex/understand-application-framework`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch --prune origin` completed on 2026-07-20. The task branch was fast-forwarded twice as the shared ref advanced, ending at `8c7e2c2aa591b174a3d5c90eb0d05584538bbf12` before the current investigation artifacts were finalized.
- Task Branch: `codex/understand-application-framework`, tracking `origin/personal`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal`, subject to the team's delivery flow and explicit user verification.
- Bootstrap Blockers: None. Dependencies were initially absent, then `pnpm install --frozen-lockfile` succeeded during the halted partial implementation.
- Notes For Downstream Agents: Requirements are approved, but implementation must return through architecture review. Treat this as a clean backend contract and forward-only fresh-schema source cutover. Do not add database migration/version/checkpoint logic or any product compatibility/reset/rejection behavior for old storage. Tests use isolated fresh roots. Dependencies are now installed in the preserved partial worktree, but implementation remains non-authoritative until review passes.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/application-context-api-contract.md` | Intended public API contract | Exact target context/type shape, old-to-new mapping, launch-request definition, forward-only/no-migration clean-cut rules | `requirements.md`; `design-spec.md` | `REQ-001`..`REQ-007`, `REQ-010`; `AC-001`..`AC-007`, `AC-010` | Current; type-completeness and no-migration clarification added | Approved by the user's 2026-07-20 naming and unreleased/forward-only clarifications | Keep design/implementation exact. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/framework-understanding.md` | Durable current-state architecture synthesis | Frontend/server/worker/runtime boundaries, communication planes, current API families, and verified future streaming gap | `requirements.md`; `design-spec.md` | `REQ-001`..`REQ-010`; `AC-001`..`AC-011` | Current; naming scope note added | `N/A` — evidence/context | Preserve as context; do not treat its streaming proposal as current ticket intent. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-20 | Command | `git status --short --branch; git remote -v; git branch -vv; git worktree list --porcelain`; `git fetch --prune origin`; `git merge --ff-only origin/personal` | Verify task isolation and freshness | Dedicated task worktree is valid and refreshed to the recorded base | No |
| 2026-07-20 | Doc | `solution-designer/skills/solution-designer/design-principles.md` | Required shared design read | Clean-cut replacement, ownership, spine, and contract-version guidance apply | Apply after approval |
| 2026-07-20 | Code | `autobyteus-application-sdk-contracts/src/index.ts` lines containing `ApplicationAgentRunLaunch`, `ApplicationTeamRunLaunch`, `ApplicationRunBindingSummary`, `ApplicationRuntimeControl`, and `ApplicationHandlerContext` | Inspect the public API precisely | One ten-method `runtimeControl` object spans agent/team execution, resource discovery/configuration, binding queries, and artifact reads | Yes—split public types |
| 2026-07-20 | Code | `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | Locate handler-context construction | `createRuntimeControl` maps public calls to one worker/host invoker; both request and lifecycle contexts receive the same object | Yes—replace with three capability factories |
| 2026-07-20 | Code | `autobyteus-server-ts/src/application-engine/runtime/protocol.ts`; `services/application-engine-host-service.ts` | Trace process-boundary routing | `invokeRuntimeControl` carries a ten-action union and host switch delegates to orchestration | Preserve behavior; improve active context terminology |
| 2026-07-20 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` and launch/resource/artifact dependencies | Verify behavioral owner | Existing orchestration services already distinguish agent/team services, resources, bindings, and artifacts; public aggregation is the naming problem | No runtime rewrite |
| 2026-07-20 | Code | `autobyteus-application-backend-sdk/src/**`; `autobyteus-application-devkit/templates/basic/**` | Inspect author-facing exports/templates | Backend SDK re-exports the broad contract; template declares backend definition contract v2 | Yes—update exports/template/version |
| 2026-07-20 | Code | `applications/brief-studio/backend-src/**`; `applications/socratic-math-teacher/backend-src/**` | Inventory current application consumers | Both use resource/execution/binding/artifact portions of `runtimeControl`; Socratic Math Teacher also posts input and terminates | Yes—cut over and rebuild |
| 2026-07-20 | Code | `applications/{brief-studio,socratic-math-teacher}/backend/dist/**` | Check generated output impact | Checked-in bundles contain live `context.runtimeControl` accesses | Yes—regenerate, do not hand-edit only |
| 2026-07-20 | Doc | `docs/custom-application-development.md`; package READMEs; `autobyteus-server-ts/docs/modules/application_{communication_model,engine,orchestration,sessions}.md`; agent definition/team definition docs | Inventory public/current terminology | Documentation consistently teaches the old broad API | Yes—update current docs |
| 2026-07-20 | Command | `rg -n "runtimeControl" ...` across contracts, SDKs, devkit, server, web, applications, docs excluding dependency/build caches | Establish active blast radius | 90 active references found, concentrated in public docs, two apps, worker adapter/host switch, and focused tests | Yes—final source inventory gate |
| 2026-07-20 | Code/Doc | `application_orchestration.md`; built-in `run-binding-correlation-service.ts`; pending-intent repositories/migrations | Determine the real meaning of intent | It is a caller-generated durable correlation key for the cross-database launch handoff, not an AI/user intent; lookup repairs an ambiguous completed handoff | Rename to launch request without semantic change |
| 2026-07-20 | Code | `application-run-binding-store.ts`; `application-execution-event-journal-store.ts`; Brief Studio baseline migrations `004`/`005`; Socratic baseline migration `002`; application migration service | Determine persisted-data shape | Platform DDL/JSON and built-in baseline SQL contain old names. Static code established transformability but did not establish live data or a preservation obligation. | Superseded by the user's no-live-data clarification: update definitions directly and validate from fresh storage. |
| 2026-07-20 | Code | `autobyteus-server-ts/src/application-storage/services/application-migration-service.ts:71-120`; `application-storage-lifecycle-service.ts:126-159` | Validate the former app-migration proposal after architecture review `DR-001` | Current runner commits app SQL in `app.sqlite` before inserting the checksum row in `platform.sqlite`; the stores do not share a transaction. | Do not introduce a rename migration or redesign this generic mechanism in the naming ticket; record the observation as out-of-scope architecture debt. |
| 2026-07-20 | Code | `autobyteus-application-sdk-contracts/src/index.ts:251-261`; architecture review `DR-002` | Verify the exact artifact-list item contract | The current API returns an inline nine-field item shape and no `ApplicationPublishedArtifactSummary` declaration exists. | Extract/export that exact preserved shape and rebuild declarations. |
| 2026-07-20 | Review | `tickets/in-progress/understand-application-framework/design-review-report.md` | Process architecture review round 1 | All main boundaries passed except restart-safe built-in app migration completion and the undefined artifact summary type. | The type finding still requires correction. The migration premise was subsequently removed by authoritative user clarification. |
| 2026-07-20 | User clarification | Conversation: application feature “is not actually live yet”; “there's no data migration” | Establish product-supported persistence reality after round-1 migration review | There is no live/released application data to preserve. A database schema-version transition, transform service, appended rename migrations, and checkpoint redesign would solve a nonexistent rollout problem. The backend definition contract version remains a separate source/package compatibility concern. | Change persisted-data outcome to `Discard or Rebuild` and directly update canonical DDL/baseline SQL. |
| 2026-07-20 | User clarification | Conversation: feature is “still under development”; “code is always forward”; “no backward compatible thing” | Remove any residual stale-storage/reset/rejection product design | The target is one canonical future code/schema only. Old pre-release storage has no product behavior at all; tests start from fresh isolated state. | Remove migration, compatibility, rejection, and runtime reset concerns from the ticket. |
| 2026-07-20 | Team handoff | `implementation_engineer` Requirement Gap return | Preserve partial implementation evidence after approved basis changed | Useful v3 naming work is uncommitted; prohibited migration service/checkpoint/appended SQL work is also present. `pnpm install --frozen-lockfile`, contract/SDK builds, server build-source compile after Prisma generation, and both built-in backend typechecks had passed; root server typecheck hit existing TS6059 rootDir/tests configuration. | Re-review design, then implementation owner must selectively retain naming work and remove prohibited migration changes before source review. |
| 2026-07-20 | Review | Architecture review round 3 / `design-review-report.md` finding `DR-003` | Audit cumulative package consistency after the requirement reset | Design and framework supplements still contained one active migration-required sentence each, despite the corrected requirements/design elsewhere. All other reviewed boundaries passed. | Replace both sentences, run a focused intended-outcome assertion search, and resubmit while implementation stays halted. |
| 2026-07-20 | Command | Python intended-outcome classifier plus focused `rg` audit of migration/version language across the five active core/supplement artifacts | Verify `DR-003` was fully removed rather than patching only the reported lines | Zero conflicting positive assertions remain. The requirements template selects `Discard or Rebuild`; DS-005 is current-only serialization/hydration and the framework outcome matches. | No; resubmit architecture package. |
| 2026-07-20 | Test | `pnpm -C autobyteus-application-sdk-contracts test` | Attempt baseline execution | Failed before compile because this worktree has no `node_modules`; `tsc: command not found` | Install dependencies downstream |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | Contract | Any app query/command/GraphQL/route/event/artifact handler receives `ApplicationHandlerContext` | Worker constructs context with `runtimeControl` → handler accesses one broad object | App can use execution, resources, bindings, and artifacts, but capability ownership is not inferable from the property name | Contract and worker runtime |
| `BEH-002` | Contract/System | Handler calls `runtimeControl.startRun` with `launch.kind` | Worker bridge → engine host → orchestration launch service → `AgentRunService` or `TeamRunService` → binding summary | Both standalone agent and team launches are supported; binding runtime subject records `AGENT_RUN` or `TEAM_RUN` | Contract, launch service, Socratic/Brief apps |
| `BEH-003` | Contract | Handler lists or resolves configured execution resources | `runtimeControl` → bridge → orchestration resource resolver/configuration service | Existing resource filter/slot behavior and values | Contract/orchestration services |
| `BEH-004` | Contract | Handler performs artifact reconciliation | `runtimeControl` → bridge → published artifact projection/revision service | Durable artifact listing/text reads; current error/null semantics | Contract, reconciliation services/apps |
| `BEH-005` | Contract/Operational | App persists a pending intent and calls `startRun(bindingIntentId)` | App DB pending row → worker/host launch → platform binding column/summary → returned/lifecycle binding → app finalization or lookup by intent | Correlates one requested launch across app/platform databases and repairs an interrupted handoff; not an idempotent retry promise | Built-in correlation services, platform binding store, orchestration docs |
| `BEH-006` | Operational/Contract | Server loads contract v2 and initializes pre-release application storage | Worker validates v2; platform/app schema definitions and repositories use old property/column/table names | API/package compatibility and fresh-storage source shape are coupled, but there is no supported live data-upgrade path | Worker runtime, binding store DDL, built entries/baseline SQL; user product-state clarification |
| `BEH-007` | Contract | Application author wants incremental agent output in frontend | No supported application-scoped path | Verified gap remains, but no behavior is changed by this ticket | Framework supplement and communication model |

## Design Health Assessment Evidence

- Change posture: `Refactor`.
- Candidate root cause classification: `Boundary Or Ownership Issue` and `Shared Structure Looseness`.
- Refactor posture evidence summary: One public object combines three independently nameable capabilities. Existing implementation owners are already more focused than the public API, so the bounded fix is to split the contract/adapter and cut consumers over without rewriting orchestration.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `ApplicationRuntimeControl` | Ten methods span execution, resources, bindings, and artifacts | Name and shape conceal capability boundaries | Replace public aggregation |
| `ApplicationAgentRunLaunch | ApplicationTeamRunLaunch` | Launch subject is visible only inside a union | Separate start operations improve discovery and type errors | Design exact input types |
| `createRuntimeControl` | It is an adapter over one IPC invoker, not the behavioral owner | Split adapters can reuse the same process bridge without duplication | Design three factories |
| `ApplicationOrchestrationHostService` | Delegates to focused services | Existing runtime owner remains valid | Preserve implementation behavior |
| Backend definition v2 check | Contract version promises old context | Removal without version advance creates delayed runtime failure | Clean version cutover |
| Platform/app correlation schema sources | Old property/table/column names are created/read by normal repositories | Because no live data exists, update bootstrap DDL and baseline SQL directly and validate the single forward schema from fresh tests | Design explicit no-migration/no-compatibility boundary |
| Existing generic app migration split completion | App SQL commits before the platform checksum ledger row | This is a real generic framework observation, but the naming ticket no longer introduces a rename migration and must not broaden into redesigning that framework | Record as out-of-scope architecture debt; do not modify it in this ticket |
| Published artifact inline list item | Exact nine-field shape is repeated only inline in the broad current capability | The approved named return type must be declared rather than inferred | Export the preserved shape from contracts and backend SDK |
| Built-in source and generated backends | Both compile/property-bind to old name | Partial update would leave installed examples broken | Rebuild atomically |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/index.ts` | Public backend context/types | Broad `ApplicationRuntimeControl` declared inline | Introduce focused capability types and context properties; remove old type |
| `autobyteus-application-backend-sdk/src/index.ts` | Author-facing type exports/helpers | Re-exports current contract | Re-export new capability/input types only |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | Worker definition validation and context construction | Builds broad context twice | Centralize capability construction and supply identical context to request/lifecycle handlers |
| `autobyteus-server-ts/src/application-engine/runtime/protocol.ts` | Worker/host JSON-RPC method/action types | IPC group is named runtime control | Active app-facing terminology must disappear; internal mapping can remain focused behind context adapter |
| `application-engine-host-service.ts` | Worker lifecycle and reverse-call dispatch | Switch maps actions to orchestration host | Preserve application scoping/error behavior |
| `application-orchestration-host-service.ts` | Server-side application orchestration facade | Existing methods remain authoritative | No broad server rewrite |
| `application-run-binding-store.ts` | Platform binding model/store and fresh-table DDL | Defines `binding_intent_id` and a summary JSON containing `bindingIntentId` | Change current model/DDL directly to launch-request names; no old-row transform |
| `autobyteus-application-devkit/templates/basic/src/backend/index.ts` | New-app backend definition template | Declares contract v2 | Advance to new backend contract |
| `applications/brief-studio/backend-src/**` | Built-in app backend | Uses resources, launch/bindings, artifact reads | Rename source and rebuild output |
| `applications/socratic-math-teacher/backend-src/**` | Built-in app backend | Uses all three target namespaces | Primary end-to-end authoring example |
| Built-in app pending-intent baseline SQL/repositories | App-owned cross-database launch correlation | Defines old table/column/type names | Rename/edit pre-release baseline SQL and current repositories directly; append no transition SQL |
| `autobyteus-server-ts/tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts` | Broad app-owned orchestration regression tests | Builds/mocks old API and verifies interrupted handoff | Rename test subject/fixtures while retaining recovery scenario |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-20 | Trace | Static trace from handler context construction through worker-host bridge to orchestration services | Namespace split can be implemented at the worker adapter without changing runtime services or persistence | Behavior-preserving refactor is feasible |
| 2026-07-20 | Test | `pnpm -C autobyteus-application-sdk-contracts test` | `tsc: command not found` because dependencies are absent | No executable baseline claim; downstream environment setup required |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None; the contract and behavior are repository-owned.
- Version / tag / commit / freshness: Local refreshed `origin/personal` baseline at `8c7e2c2aa591b174a3d5c90eb0d05584538bbf12` on 2026-07-20.
- Relevant contract, behavior, or constraint learned: N/A beyond current repository evidence.
- Why it matters: No external source substitutes for the actual public SDK and worker implementation.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Remote fetch and fast-forward described above.
- Cleanup notes for temporary investigation-only setup: No temporary services or promoted scratch files.

## Findings From Code / Docs / Data / Logs

1. The context supports both standalone agents and agent teams through one `startRun` union.
2. `runtimeControl` is a weak public name because neither “runtime” nor “control” identifies the application-domain capabilities.
3. `runs` alone is also too generic; the user-selected `agentExecution` namespace supplies the missing domain noun.
4. Resource selection and published-artifact reads do not belong under execution control and should become sibling capabilities.
5. The existing orchestration implementation already owns behavior correctly, so this ticket does not require service-layer redesign; current persistence models and fresh-schema definitions only need direct terminology updates.
6. Separating `startAgent` and `startAgentTeam` improves discovery while shared binding/input/termination behavior remains unified.
7. A clean removal must advance the backend definition contract; otherwise v2 bundles load and fail only when they dereference `runtimeControl`.
8. `bindingIntentId` means a caller-created launch correlation record, not user/LLM intent; `launchRequestId` and `findByLaunchRequestId` state the purpose directly.
9. Repository schema definitions can materialize old-named platform/app rows, but the user confirmed there is no live/released application data. Direct baseline updates plus isolated fresh-schema tests are correct; migration or stale-storage product behavior would be over-design.
10. Streaming is a real verified framework gap, but deferring it keeps this ticket behaviorally small and gives the later stream API a clearer context vocabulary.
11. The current app-migration checksum row is not atomic with app-schema change because it is written to a separate database after the app transaction commits. That generic concern made the former migration design unsafe, but it is irrelevant once this ticket adds no rename migration; redesigning the framework is outside the approved naming scope.
12. The current artifact list result already has one stable nine-field item shape; extracting it as `ApplicationPublishedArtifactSummary` completes the approved signature without changing behavior.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Repository code can create per-application `platform.sqlite` binding/journal state and built-in `app.sqlite` pending/business correlation state under old names. The user confirmed the feature is not live and the supported production volume is zero.
- Relevant code-model, serialization, semantic, or physical-store change: Canonical source property becomes `launchRequestId`; fresh indexed columns/tables and baseline SQL become launch-request named.
- Normal readers and writers, including unknown/extra-field behavior: Current repositories and built-in app SQL use the old names. Under the target they will use only the new names against freshly initialized storage.
- Representative direct-read or compatibility evidence: An old pre-release database would not satisfy current-only renamed queries and is intentionally outside the product contract; no translation, rejection, or reset behavior is added.
- Required semantics and invariants preserved by direct use: `N/A` for old state; no live data is in the compatibility contract. Fresh storage must preserve launch/binding/business behavior.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Tests use isolated temporary roots. Product code must not delete old storage or unrelated server/user state as part of this refactor.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration has no product benefit because there is no supported data. It adds platform schema versioning, legacy decoders, failure modes, and test cost, so it is rejected in favor of `Discard or Rebuild`.
- Existing migration framework or lifecycle constraints, only if migration may be required: A generic ordered/checksummed app migration mechanism exists, but this ticket must not append rename migrations or modify its completion protocol. Existing baseline SQL remains the fresh-database construction mechanism and can be edited/renamed pre-release.

## Constraints / Dependencies / Compatibility Facts

- `ApplicationHandlerContext` is runtime JavaScript, not type-only; old bundles will fail if accepted unchanged.
- Backend definition contract v2 is the current load gate and must not silently describe the new context.
- Frontend SDK/iframe contract v3 is unrelated and remains unchanged.
- `bindingId`, `runId`, resource references, member selectors, and artifact revision IDs remain stable; `bindingIntentId` changes canonically to `launchRequestId` with value preservation.
- The clean-cut workflow forbids a public `runtimeControl` compatibility alias.
- Current runtime/business repositories must not dual-read `bindingIntentId`/`launchRequestId`; no historical-schema knowledge is needed in active product code.
- Checked-in generated application bundles must match their updated sources.
- Dependencies are absent in the task worktree and must be installed before build/test execution.

## Open Unknowns / Risks

- Requirements and target names are approved; no naming ambiguity remains.
- Implementation must not add the previously proposed platform schema version, migration service, app checkpoint, rename migrations, or any old-storage product behavior. Isolated fresh test storage is the only validation starting point.
- An implementation that only renames types but leaves current docs/generated bundles/worker/runtime/persisted summaries inconsistent would be incomplete.
- Streaming requirements should be retained for a follow-up ticket rather than lost after this scope reset.

## Notes For Architecture Reviewer

- Round 1 `DR-001` is superseded by the user's product-state clarification: no rename migration will exist, so the generic split-ledger protocol is not modified by this ticket. `DR-002` remains addressed by the exact exported artifact-summary type.
- Round-3 `DR-003` corrections now state current-only fresh event serialization/hydration in `DS-005` and `Discard or Rebuild` in the framework supplement. The focused package assertion audit must remain clean before implementation resumes.
