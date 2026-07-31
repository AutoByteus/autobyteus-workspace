# Application Framework Hardening Evaluation

## Status And Purpose

- **Evaluation status:** Complete for `SR-014`.
- **Approval applicability:** The evidence and rejected/deferred classifications are `N/A`; the two adopted, behavior-neutral hardening items require architecture approval as part of the revised solution package.
- **Baseline:** `SR-013` / `ARCH-REV-011`, `IR-017` / `IR-018`, `CRR-033` Pass / 97, `API-REV-012` Pass / 96.6%, and `CRR-034` Pass.
- **Scope:** Prove, narrow, defer, or reject eight proposed architecture improvements without changing the already-passed Studio or standalone product behavior.
- **Governing principles:** production reality, Product-Reachability Gate, authoritative boundaries, spine-span sufficiency, ownership, proportionality, no empty indirection, and clean-cut change without compatibility machinery.

This supplement is linked from [requirements.md](requirements.md), [investigation-notes.md](investigation-notes.md), and [design-spec.md](design-spec.md). It complements rather than replaces those artifacts.

## Decision Summary

| Candidate | Classification | Evidence-Based Decision |
| --- | --- | --- |
| 1. Automated module-boundary enforcement | **Adopt Now — bounded** | Current source is clean, but TypeScript resolves representative forbidden transport-to-runtime, GraphQL-to-runtime-state, and application-to-server-internal imports. The standard suite has no durable import/call-boundary check, despite AC-007/AC-019/AC-021 depending on those directions. Add one repository-owned architecture test; change no runtime source. |
| 2. Deliberate application-platform public API | **Defer With Named Evidence Gap** | `autobyteus-server-ts` is private. Its root exports are already explicit; the only package-root consumers outside the server are four devkit source files using the standalone start/handle/validator surface. No supported external publisher/host consumer or current deep package-name import exists. Revisit when the server package is published or a supported repository-external host consumer is introduced. |
| 3. Shared Studio/standalone conformance suite | **Defer With Named Evidence Gap** | The current durable host-builder layer contains one standalone server integration with two cases and no equivalent Studio builder contract suite; therefore there are zero duplicated same-layer host assertions to extract. Real parity is already proven by API-REV-012. Revisit when at least two same-semantic assertions are duplicated across durable host harnesses or a parity regression escapes the focused route/runtime tests. |
| 4. Consistent lifecycle vocabulary and transition contracts | **Reject** | Platform, worker, run, session, queue, and server lifecycles have different real subjects and transition needs. No contradictory reachable state or unsupported transition was found. One generic state machine would erase semantics and add empty indirection. |
| 5. Ownership-led directory mapping | **Reject** | Current central files match the SR-013 owners. The one availability-state registry dependency is explicit injected runtime state, not presentation leakage or a demonstrated wrong-owner change. No move has a measurable owned benefit; cosmetic path churn is rejected. |
| 6. Standardized role suffixes | **Reject** | The recently approved vocabulary matches current responsibilities: builders assemble, managers own scoped collections, registries own identity/state, coordinators sequence peer work, controllers operate attached workers, launchers ensure/start/stop, adapters translate, gateways cross transports, and services own domain capabilities. No concrete mismatch was found. |
| 7. Cross-boundary observability correlation | **Defer With Named Evidence Gap** | Supported commands already carry `applicationId`, `bindingId`, `runId`, `teamRunId`/`memberRunId`, MCP `sessionId`, and artifact `revisionId` at their applicable boundaries. No supported incident was found that cannot be correlated from the canonical run/binding/session records. Revisit on a real concurrent-run diagnosis where the current identifiers are insufficient. |
| 8. Executable architecture documentation | **Adopt Now — bounded companion to candidate 1** | Existing module docs correctly explain the runtime and lifecycles, but they do not give one exact allowed/forbidden dependency table or point to a durable check. Add that table to the existing applications module doc and link it from the main architecture doc. Add no generator, duplicate diagram set, or documentation subsystem. |

## Source And Probe Evidence

| Evidence ID | Source / Probe | Material Result |
| --- | --- | --- |
| H-001 | `autobyteus-server-ts/package.json`, `vitest.config.ts`, repository searches for ESLint/dependency-cruiser/Madge/boundary rules | The standard server suite runs `tests/**/*.test.ts`; there is no application-framework import-boundary tool or test and no package export map. |
| H-002 | TypeScript `resolveModuleName` probe using the checked-in `tsconfig.json` | All three forbidden examples resolve successfully: REST -> private runtime builder, GraphQL -> private availability-state registry, and maintained application backend -> server runtime builder. TypeScript alone does not enforce the reviewed ownership rules. |
| H-003 | `src/api/rest/**`, `src/api/websocket/**`, standalone REST/WebSocket/bootstrap sources | Current transport code imports application runtime only through `application-platform-runtime-contracts.ts`. This is the clean baseline the new check must preserve. |
| H-004 | `src/application-packages/**`, `src/application-bundles/**` import scan | No package module imports presentation, server assembly, or standalone host code. `ApplicationCatalogRefreshCoordinator` has the one reviewed exception to the catalog reconciliation contract. |
| H-005 | `applications/brief-studio/**`, `applications/socratic-math-teacher/**`, devkit basic template | Maintained authoring source imports SDKs, local modules, and Node built-ins only; it has no server, web, Electron, or devkit-runtime import. |
| H-006 | `src/application-platform/runtime/**`, scoped Agent Tools session files, publish adapter | Current application runtime construction has no process-global run/session/publication lookup. Named general-process factories remain in explicit assembly/general-process paths and must not be globally banned. |
| H-007 | `src/index.ts` plus repository-wide root-consumer scan | Root exports are explicit. Outside the server, devkit uses `startStandaloneApplicationHost`, its handle type, and `validateStandaloneApplicationPackage`; no supported deep `autobyteus-server-ts/src|dist` import exists. |
| H-008 | Host-test inventory | `standalone-application-server.integration.test.ts` has two cases. No durable test builds `buildStudioServer`; `app.test.ts` only verifies bootstrap ordering. Shared same-layer assertion duplication is zero. |
| H-009 | Lifecycle source inventory | Platform has nine preparation/recovery/stop states; worker status has six serialized states; runs use provider-backed active state; MCP scopes own issue-blocked/closed; queues own accepting/drained; Fastify owns server listen/close. The vocabularies describe distinct subjects. |
| H-010 | Current central file/role inventory and docs | Central files are placed under application platform, packages, engine, orchestration, Agent Tools, and run execution according to the owner they implement. The approved role nouns match the code. |
| H-011 | Session, binding, delivery-command, artifact, and log trace | Session owner identity carries run/team/member; application execution context carries application/binding; delivery commands carry run/application/binding/revision. Current live relay logs the canonical run ID, from which the stored binding maps to the application. No demonstrated diagnosis dead end exists. |
| H-012 | `docs/ARCHITECTURE.md`, `docs/modules/applications.md`, orchestration/engine/Agent Tools docs, `docs/custom-application-development.md` | Current documentation explains the two servers, four runtime projections, on-demand execution, Agent Tools scope, artifact delivery, and lifecycles. The missing durable element is an exact dependency-direction table linked to enforcement. |

## Candidate Proof Matrix

### 1 — Automated Module-Boundary Enforcement

| Required Proof Dimension | Result |
| --- | --- |
| Current concrete source evidence | H-001–H-006. Current imports/calls satisfy the intended boundaries, but no standard check owns the invariant. The TypeScript probe proves forbidden imports compile-resolve. |
| Independent supported trigger / governing contract | A contributor adds or changes an application route, Studio API, package command, application runtime service, Agent Tools publication adapter, or maintained application source. This is governed by AC-007, AC-019, AC-021, BEH-009/BEH-010, and the open-source contributor path. |
| Forward production/lifecycle trace | Contributor import/call -> TypeScript resolution -> build/test -> host assembly/runtime. Without a check, a private owner or process-global fallback can become reachable through a supported route or run. |
| Reachability | **Reachable.** The initiating change is a supported repository-development path, and the imported targets are real production owners. The probe uses no source mutation and establishes compiler acceptance. |
| Material consequence / measurable benefit | Prevents recurrence of the exact boundary classes already corrected by CR-019/CR-021 and the application/server coupling prohibited by AC-007. Measurable proof: standard tests fail with policy ID, importer, and imported target/callee when a synthetic or real violation is present. |
| Current owner / absorption | The `autobyteus-server-ts` architecture test suite can absorb the check. No runtime service, DI container, new package, or lint framework is needed. |
| Before primary spine | Contributor change -> TypeScript resolves forbidden dependency -> ordinary compilation may pass -> human/source/API review must rediscover the violation. |
| After primary spine | Contributor change -> repository-owned AST/import check -> exact policy diagnostic -> standard test fails before handoff. Runtime production spine is unchanged. |
| Return/event spine | Diagnostic `{policyId, importer, dependency}` -> contributor replaces private/global dependency with runtime contract, SDK, explicit scoped dependency, or approved assembly root -> re-run passes. |
| Exact allowed directions | Assembly roots -> runtime builders/private construction; transports -> `application-platform-runtime-contracts`; runtime builder -> injected domain owners; package refresh coordinator -> catalog reconciliation; application source -> SDK/local/declared library or Node built-in; application scoped publication/session code -> injected scoped capabilities. |
| Exact forbidden directions | Transport/GraphQL -> runtime private builder/store/run/session/engine owners; application source -> server/web/Electron/devkit host internals; package/bundle -> presentation/API/composition/standalone host; application runtime/scoped publish path -> named process-global/default run/session/publication lookups. |
| Add / Modify / Rename-Move / Remove | **Add:** `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts`. **Modify:** two docs under candidate 8. **Rename-Move:** none. **Remove:** none. |
| Preserved behavior | Every Studio/standalone route, wire contract, package byte, database row/schema, provider/tool behavior, lifecycle, and executable result remains unchanged. |
| Tests / executable evidence | Current-tree pass; synthetic rejected examples for each rule family; synthetic allowed examples; server TypeScript no-emit; focused architecture test; retained affected source/API-E2E gates proportionate to a test/docs-only change. |
| Empty-indirection rejection | One test owns policy; no facade, runtime wrapper, service locator, generic DI, event bus, mode-switched builder, singleton fallback, compatibility alias, or production source churn. |

### 2 — Deliberate Application-Platform Public API

| Required Proof Dimension | Result |
| --- | --- |
| Current evidence and consumer trace | H-007. `autobyteus-server-ts` is private; its root is a short explicit export list. Devkit is the only package-root production consumer outside the server. |
| Trigger / reachability | A future published server package or repository-external host consumer is plausible but not currently supported. **Unclear for a current product path.** |
| Reachability classification | **Unclear.** No current supported consumer exercises the proposed public boundary. |
| Consequence / benefit | An `exports` map or new facade would not stop relative monorepo imports and would add an API commitment without a real external consumer. Current measurable benefit is zero. |
| Owner | Server root `src/index.ts` already owns the explicit workspace API. |
| Before/after primary and return spines | Before = after: devkit -> private server root -> standalone host/validator -> handle/result; validation/start errors return through the same exported boundary. No new facade enters either direction. |
| Exact allowed / forbidden dependencies | Allowed: devkit's four source consumers -> current explicit server root exports; assembly roots -> private runtime construction. Forbidden by this decision: a pass-through application-platform facade, speculative export map, or deep import advertised as supported API. |
| Inventory / tests / preservation | **Add/Modify/Rename/Remove:** none. Preserve root consumer compile/build and every Studio/standalone path. Named evidence gap: first supported external consumer or decision to publish/extract the server package. |
| Empty-indirection rejection | A facade with no independent policy/lifecycle would only rename current root exports and is rejected. |
| Decision | **Defer With Named Evidence Gap.** Do not add a pass-through application-platform facade or speculative export map. |

### 3 — Shared Studio/Standalone Conformance Suite

| Required Proof Dimension | Result |
| --- | --- |
| Current evidence and trigger | H-008 and API-REV-012. Dual-host parity is a governing contract, but there are zero duplicated same-layer host-builder assertions to extract today. |
| Forward trace / reachability | Real Studio and standalone routes/runs are reachable and already covered by host-specific focused tests plus API/E2E. A reusable test abstraction itself has no independent product trigger. |
| Reachability classification | **Not Reachable as a current need.** Host behavior is reachable; duplicated same-layer assertions that would justify extraction are absent. |
| Consequence / measurable benefit | Extracting now would create a harness abstraction rather than remove duplication. It could also hide different route namespaces and host-only behavior. |
| Owner | Existing registrar/unit tests, standalone host integration, Studio/package integrations, and API/E2E already own their proper layers. |
| Before/after primary and return spines | Before = after: shared service -> owner unit/integration result; Studio-only route/package/iframe -> Studio suite; standalone CLI/static/watch -> standalone suite; both real hosts -> API/E2E parity result. Failures return to the owning suite rather than a generic harness. |
| Exact allowed / forbidden dependencies | Allowed: shared contracts tested at their service/registrar owner and host-specific assertions at each host owner. Forbidden by this decision: a `HostHarness` or mode-conditional assertion base without duplicated same-semantic cases. |
| Inventory / tests / preservation | **Add/Modify/Rename/Remove:** none. Existing suites and API-REV-012 remain unchanged. Revisit after at least two identical semantic assertions exist in both durable host harnesses or a shared behavior escapes owner tests and causes a new parity regression. |
| Empty-indirection rejection | No reusable fixture is created merely to make unlike host surfaces look symmetrical. |
| Decision | **Defer With Named Evidence Gap.** No generic `HostHarness` now. |

### 4 — Consistent Lifecycle Vocabulary And Transition Contracts

| Required Proof Dimension | Result |
| --- | --- |
| Current evidence | H-009 and existing lifecycle tests. Each lifecycle uses terms appropriate to its subject and exposes only supported transitions. |
| Trigger / reachability | Platform prepare/recover/stop, worker ensure/start/stop, run active/terminate, session issue/revoke/close, queue accept/drain, and server listen/close are all reachable; no contradictory cross-owner state was found. |
| Reachability classification | **Reachable subjects, Not Reachable contradiction.** The proposed shared mechanism has no witnessed state mismatch to solve. |
| Consequence / benefit | A common state machine would force unrelated transitions into one abstraction and provide no measurable correctness gain. |
| Owner / spines | Existing lifecycle, launcher/controller, run manager/registry, session scope, queues, and Fastify retain their own primary/return paths. |
| Before/after primary and return spines | Before = after: each subject accepts only its own commands and returns its own state/result/error. Platform prepare/recover/stop, worker ensure/invoke, run remove, session revoke, queue drain, and server close do not translate through a common state owner. |
| Exact allowed / forbidden dependencies | Allowed: explicit lifecycle owner -> its subject collaborators. Forbidden by this decision: one generic lifecycle interface/state enum/coordinator that owns unrelated transitions. |
| Inventory / tests / preservation | **Add/Modify/Rename/Remove:** none. Existing unit/integration/API-E2E lifecycle evidence and all behavior remain valid. |
| Empty-indirection rejection | A symmetry-only state machine would obscure rather than own transitions and is rejected. |
| Decision | **Reject.** Consistency means precise domain terms, not identical state machinery. |

### 5 — Ownership-Led Directory Mapping

| Required Proof Dimension | Result |
| --- | --- |
| Current evidence | H-003–H-006 and H-010. Files are already grouped by their governing capability. Cross-module dependencies are explicit and injected. |
| Trigger / reachability | Developers navigate and change these files, but no supported change was shown to land in the wrong owner or import presentation because of a path. |
| Reachability classification | **Not Reachable as a current defect.** Navigation is real; path-caused ownership error is not evidenced. |
| Consequence / benefit | Moving files would change imports and test paths without changing an owner or closing a boundary. Benefit is unmeasured; churn is certain. |
| Owner / spines | Current package, runtime, engine, orchestration, session, and run owners remain authoritative. |
| Before/after primary and return spines | Before = after: calls and events follow the SR-013 owners at their current paths; returned results/errors remain with those owners. Candidate 1 protects directions without changing navigation paths. |
| Exact allowed / forbidden dependencies | Allowed: current explicit injected cross-owner contracts. Forbidden by this decision: moving a file solely to match a preferred folder taxonomy, or adding forwarding modules after a move. |
| Inventory / tests / preservation | **Add/Modify/Rename/Remove:** none. Candidate 1 protects material directions; all source imports/tests/docs and dual-host behavior remain unchanged. |
| Empty-indirection rejection | No compatibility re-export, forwarding file, or pass-through directory layer is introduced. |
| Decision | **Reject.** Revisit only with a concrete wrong-owner change or a file whose responsibility actually changes. |

### 6 — Standardized Role Suffixes

| Required Proof Dimension | Result |
| --- | --- |
| Current evidence | H-010 plus the passed SR-011 naming map. Current types implement the responsibility implied by their suffix. |
| Trigger / reachability | New-developer comprehension is reachable, but no concrete name now contradicts the implementation. |
| Reachability classification | **Not Reachable as a current mismatch.** The comprehension path exists, while the hypothesized suffix defect does not. |
| Consequence / benefit | Another rename would churn passed names/docs/tests and risk reviving the same vocabulary problem without a responsibility mismatch. |
| Owner / spines | Existing owners and all primary/return spines remain unchanged. |
| Before/after primary and return spines | Before = after: each builder/manager/registry/coordinator/controller/launcher/adapter/service/gateway receives and returns the same subject data. No code symbol changes. |
| Exact allowed / forbidden dependencies | Allowed: current role names where responsibility matches. Forbidden by this decision: a mechanical suffix conversion or alias retaining old/new names. |
| Inventory / tests / preservation | **Add/Modify/Rename/Remove:** none. Retain retired-name scans and existing docs; preserve all runtime and API/E2E evidence. |
| Empty-indirection rejection | No wrapper/type alias exists solely to normalize terminology. |
| Decision | **Reject.** No aesthetic standardization pass. |

### 7 — Cross-Boundary Observability Correlation

| Required Proof Dimension | Result |
| --- | --- |
| Current evidence | H-011. Canonical runtime records already relate application/binding/run/member/session/revision identities; current logs include the run or binding at failure origins. |
| Trigger / reachability | Provider failure, worker exit, session rejection, artifact-delivery failure, and restart are reachable and were exercised in API-REV-012. |
| Reachability classification | **Unclear for a new mechanism.** Operational failures are reachable; insufficiency of current canonical identifiers is not demonstrated. |
| Consequence / benefit | No material incident requires a new correlation ID or context carrier. Adding one would touch wire/log/event boundaries without demonstrated diagnostic benefit. |
| Owner / spines | Existing binding store, session owner identity, delivery command, journal, and artifact record remain the correlation authorities. |
| Before/after primary and return spines | Before = after: application/binding -> team/agent run -> MCP session -> artifact revision; failure/event returns with the applicable canonical identity and stored mappings relate adjacent boundaries. |
| Exact allowed / forbidden dependencies | Allowed: subject-owned IDs already carried by commands, sessions, journals, and artifacts. Forbidden by this decision: ambient context, generic event bus, new universal correlation field, or wire/schema propagation without a diagnosis gap. |
| Inventory / tests / preservation | **Add/Modify/Rename/Remove:** none. Preserve current logs/wires/stores and API-REV-012. Revisit with a real concurrent application/run incident where canonical identities cannot locate the failure. |
| Empty-indirection rejection | No cross-cutting logging context or correlation service is added on possibility alone. |
| Decision | **Defer With Named Evidence Gap.** No generic event bus, ambient logging context, or cross-cutting correlation framework. |

### 8 — Executable Architecture Documentation

| Required Proof Dimension | Result |
| --- | --- |
| Current evidence | H-012. Documentation is behaviorally current but uses narrative for the critical dependency directions and does not identify an enforcing test. |
| Trigger / reachability | An open-source contributor adding a route/runtime/package/application dependency is a supported development path. |
| Reachability classification | **Reachable.** The missing table directly affects the same contributor path as candidate 1. |
| Consequence / measurable benefit | One table makes the allowed path and corrective action discoverable; the linked test prevents drift. Measurable result: every enforced rule has the same ID in docs and diagnostics. |
| Owner | Existing `docs/modules/applications.md`, with one pointer from `docs/ARCHITECTURE.md`; no new documentation subsystem. |
| Before/after primary and return spines | Before: contributor reads narrative and infers direction. After: contributor reads exact table -> changes code -> test resolves direction. Return: matching AFB diagnostic -> documented correction -> passing rerun. Runtime/event spines are unchanged. |
| Exact allowed / forbidden dependencies | Allowed: docs point to existing runtime contracts/SDKs/injected owners and the one test. Forbidden: copied behavior truth, a second rule owner, generated-doc system, or runtime dependency on documentation/policy. |
| Inventory / tests / preservation | **Modify:** `autobyteus-server-ts/docs/modules/applications.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md`. **Add/Rename/Remove:** none beyond candidate 1's test. Verify rule IDs/paths agree and all product behavior remains unchanged. |
| Empty-indirection rejection | Existing docs absorb the table; no generator, documentation service, or duplicate diagram set is introduced. |
| Decision | **Adopt Now — bounded.** No generated diagrams, copied architecture spec, or executable-doc framework. |

## Adopted Boundary Policy

The test implementation may use the TypeScript parser/resolver already present as a dev dependency, or an equivalently exact parser. It derives repository root from the test module, not process CWD; parses/resolves imports; and, for AFB-004, resolves imported bindings/static member calls to the exact closed callee set. Synthetic fixtures live only in a disposable temp directory. It must not use a broad substring scan that confuses comments, type names, declarations, or similarly named functions with dependencies or write generated fixtures into the repository.

| Policy ID | Importer Scope | Allowed | Rejected |
| --- | --- | --- | --- |
| `AFB-001` | `src/api/rest/**`, `src/api/websocket/**`, `src/standalone-application-host/api/**`, standalone bootstrap service | Application platform imports only from `application-platform-runtime-contracts.ts` | Direct runtime builder, lifecycle implementation, stores, recovery, run/session/publication, engine, or shutdown imports |
| `AFB-002` | `src/api/graphql/**`; production files under `autobyteus-web/components/applications/**` and `autobyteus-web/utils/application/**`; `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` (exclude tests/specs) | Existing GraphQL subject services/contracts and application SDK contracts/client plus presentation-local helpers | GraphQL import of application runtime internals or Studio application presentation import of server package/bundle/runtime implementation |
| `AFB-003` | `src/application-packages/**`, `src/application-bundles/**` | Domain/store/installer/bundle dependencies; the reviewed catalog-refresh coordinator -> catalog reconciliation exception | API/presentation/composition/standalone-host imports; any other runtime-private import |
| `AFB-004` | `src/application-platform/runtime/**`; application session scope; scoped session manager; publish adapter | Constructor-injected application run/session/publication dependencies | `AgentRunManager.getInstance`, `AgentTeamRunManager.getInstance`, `AgentToolMcpSessionService.getInstance`, `getAgentToolMcpSessionService`, `getGeneralProcessPublishedArtifactPublisher`, `createGeneralProcessPublishedArtifactPublisher`, or `createGeneralProcessPublishedArtifactRelayService` calls from a governed application path |
| `AFB-005` | Brief/Socratic `frontend-src`/`backend-src` and devkit template `src` trees | Local source, application frontend/backend SDKs, Node built-ins, and otherwise valid declared libraries | Bare or resolved-relative imports into `autobyteus-server-ts`, `autobyteus-web`, Electron host code, or devkit host/runtime internals; generated output is excluded |

Assembly roots are deliberately exempt from `AFB-004` when constructing the named general-process supervisor/publisher. The rule protects application-scoped construction; it does not outlaw established general-process behavior elsewhere in the server or unrelated process-scoped workspace/runtime/model capability getters used by the current runtime.

## Preserved Dual-Host Behavior Matrix

| Behavior | Studio | Standalone | Hardening Effect |
| --- | --- | --- | --- |
| Server assembly | `buildStudioServer` | `buildStandaloneApplicationServer` / standalone host | No source or call change |
| Runtime outward shape | lifecycle, REST, realtime, host management | Same four projections | Test protects consumers; shape unchanged |
| Package/defaults | Immutable Codex/Luna baseline plus optional override | Immutable Codex/Luna baseline | No package/configuration change |
| Business execution | App demand -> agent/team run | Same | No launch change |
| Agent Tools | Internal scoped route plus Studio external gateway | Internal scoped route only | No route/tool change |
| Publication/handoff/projection | Exact application scope | Exact application scope | No session/publisher change |
| Persistence/recovery/shutdown | Current stores and order | Current stores and order | No schema/data/lifecycle change |
| Developer commands | Existing Studio/import flow | `dev`, `build`, `validate`, `start` | A forbidden dependency fails a standard test earlier; command behavior unchanged |

## Explicitly Rejected Machinery

The adopted hardening must not introduce:

- a service locator, generic DI container, or generic event bus;
- a shared `buildServer(mode)` or optional-field server base;
- a runtime facade that merely re-exposes existing contracts;
- a new public application-platform package or speculative export map;
- a generic host conformance harness without duplicated assertions;
- a generic lifecycle state machine;
- a repository-wide directory move or suffix rename;
- an ambient correlation context or new wire correlation field;
- compatibility aliases, wrappers, dual paths, singleton fallback, or old/new enforcement modes;
- production source changes merely to make a dependency checker easier to write.

## Evaluation Conclusion

This audit finds **one missing invariant and one documentation companion**, not a new runtime architecture defect. Adopt candidates 1 and 8 as a small test/docs-only hardening. Defer candidates 2, 3, and 7 until their named evidence gaps are satisfied. Reject candidates 4, 5, and 6 because current responsibilities are healthy and the proposed symmetry/churn has no owned production benefit.

The already-passed dual-host implementation remains the functional authority. No route, runtime, package, persistence, provider, MCP, worker, run, session, artifact, UI, or shutdown behavior is redesigned.
