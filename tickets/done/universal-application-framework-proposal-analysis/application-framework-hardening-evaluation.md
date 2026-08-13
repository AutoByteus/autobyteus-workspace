# Application Framework Hardening Evaluation

## Status And Purpose

- **Evaluation status:** Architecture-approved and implemented through `ARCH-REV-014` / `CRR-037` / `API-REV-013` / `CRR-038`; SR-017 updates one base-evolved constructor-position fact.
- **Approval applicability:** Evidence and rejected/deferred classifications are `N/A`; the adopted hardening passed architecture review in ARCH-REV-014 and is implemented. SR-017 changes only its current Codex position fact and requires review through DS-017.
- **Baseline:** runtime architecture `SR-013` / `ARCH-REV-011`; executable hardening `SR-016` / `ARCH-REV-014`; cumulative passes `CRR-037`, `API-REV-013`, and `CRR-038` before the v1.4.50 integration.
- **Scope:** Prove, narrow, defer, or reject eight proposed architecture improvements without changing the already-passed Studio or standalone product behavior.
- **Governing principles:** production reality, Product-Reachability Gate, authoritative boundaries, spine-span sufficiency, ownership, proportionality, no empty indirection, and clean-cut change without compatibility machinery.

This supplement is linked from [requirements.md](requirements.md), [investigation-notes.md](investigation-notes.md), and [design-spec.md](design-spec.md). It complements rather than replaces those artifacts.

## v1.4.50 Position-Fact Update

The hardening decision and all AFB meanings remain unchanged. Required base v1.4.50 removes two `CodexThreadBootstrapper` strategy parameters, so Agent Tools session manager moves from obsolete argument 7 to current argument 5. AFB-004, current-tree occurrence checks, and omission/null/undefined fixtures must require application arguments 2 (`agentDefinitionService`) and 5 (`agentToolsSessionManager`). Both production callers move to current argument 5 with no compatibility overload. This is governed by DS-017 and [latest-base-integration-design-analysis.md](latest-base-integration-design-analysis.md).

## Decision Summary

| Candidate | Classification | Evidence-Based Decision |
| --- | --- | --- |
| 1. Automated module-boundary enforcement | **Adopt Now — bounded** | Current source is clean, but TypeScript resolves representative forbidden imports and optional reusable constructors allow a contributor to omit application-scoped dependencies without writing a forbidden callee. The standard suite has no durable import/call/constructor-obligation check. Add one repository-owned architecture test with exact TS/JS/Vue project resolution; change no runtime source. |
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
| H-013 | `ARCH-REV-012`; reusable publication/run/team constructors; `create-application-run-services.ts` | Removing `activeRunReader`/relay, `activeRunRegistry`, or team/context inputs compiles and activates imported default branches without placing a forbidden callee in the governed construction file. |
| H-014 | Eleven governed Vue SFCs; direct TypeScript/SFC probe; server/web/Brief/Socratic/template configs and manifests | Whole-SFC TypeScript parsing is not a valid import contract. Direct `@vue/compiler-sfc` parsing yields the eleven script-setup blocks and their imports with zero SFC errors. The projects have different configs/manifests, and the compiler is currently only transitive through Nuxt. |
| H-015 | `ARCH-REV-013`; `CodexAgentRunBackendFactory`; `ClaudeAgentRunBackendFactory`; required-parent inline-value audit | Parent `codexBackendFactory`/`claudeBackendFactory` properties can remain non-null while their nested constructors omit the graph-local bootstrap/session links. Codex argument 1 and Claude arguments 0/1 are the only missing graph-sensitive child obligations; Codex arguments 0/2 and the other audited defaults remain approved process resources. |

## Candidate Proof Matrix

### 1 — Automated Module-Boundary Enforcement

| Required Proof Dimension | Result |
| --- | --- |
| Current concrete source evidence | H-001–H-006 and H-013–H-015. Current imports and injections satisfy the intended boundaries, but no standard check owns the invariant. Forbidden imports compile-resolve; omitted optional or nested graph dependencies can activate imported defaults; direct TypeScript parsing does not truthfully cover governed Vue SFCs. |
| Independent supported trigger / governing contract | A contributor adds or changes an application route, Studio API, package command, application runtime service, Agent Tools publication adapter, or maintained application source. This is governed by AC-007, AC-019, AC-021, BEH-009/BEH-010, and the open-source contributor path. |
| Forward production/lifecycle trace | Contributor import, Vue script import, or application-construction omission -> project compiler accepts it -> ordinary build/test -> host assembly/runtime. Without the corrected check, a private owner or process-global fallback can become reachable through a supported route or run. |
| Reachability | **Reachable.** The initiating change is a supported repository-development path, and the imported targets are real production owners. The probe uses no source mutation and establishes compiler acceptance. |
| Material consequence / measurable benefit | Prevents recurrence of the exact boundary classes corrected by CR-019/CR-021, including fallback-by-omission. Measurable proof: standard tests fail with policy/profile/importer plus dependency/callee or missing injection path for TS, JS, and Vue current-tree/fixture inputs. |
| Current owner / absorption | The `autobyteus-server-ts` architecture test suite can absorb the check. One direct test-only `@vue/compiler-sfc` dev dependency is necessary; no runtime service, DI container, new production package, or lint framework is needed. |
| Before primary spine | Contributor change -> TypeScript resolves forbidden dependency -> ordinary compilation may pass -> human/source/API review must rediscover the violation. |
| After primary spine | Contributor change -> repository-owned AST/import check -> exact policy diagnostic -> standard test fails before handoff. Runtime production spine is unchanged. |
| Return/event spine | Diagnostic `{policyId, importer, dependency}` -> contributor replaces private/global dependency with runtime contract, SDK, explicit scoped dependency, or approved assembly root -> re-run passes. |
| Exact allowed directions | Assembly roots -> runtime builders/private construction; transports -> runtime contracts; runtime builder -> every required graph-scoped owner; package refresh coordinator -> reconciliation; application source -> local/SDK/own-manifest library/Node built-in; Vue presentation -> web-local/contracts; application publication/session/team paths -> complete scoped inputs. |
| Exact forbidden directions | Transport/GraphQL/Vue -> private runtime/server owners; application source -> host/runtime internals or undeclared/cross-project dependencies; package/bundle -> presentation/API/assembly/standalone host; application construction -> named direct globals or omission of required publication/run/session-provider/team-context inputs. |
| Add / Modify / Rename-Move / Remove | **Add:** architecture test. **Modify:** server `package.json`, root `pnpm-lock.yaml`, and two docs. **Rename-Move/Remove:** none. Production source: none. |
| Preserved behavior | Every Studio/standalone route, wire contract, package byte, database row/schema, provider/tool behavior, lifecycle, and executable result remains unchanged. |
| Tests / executable evidence | Full current-tree pass including eleven SFCs/templates; TS/JS/Vue and cross-project positives/negatives; every required omission negative; exact assembly positives; install/test without generated `.nuxt`; server no-emit; retained affected source/API-E2E gates. |
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

`ARCH-REV-013` does not change which candidates are adopted. It accepts the AR-011 correction and completes only AFB-004's nested provider-factory coverage.

### Source extraction and project resolution

The test owns one extraction path per real source kind:

- `.ts` / `.tsx` / `.js` / `.jsx` / `.mjs` / `.cjs`: TypeScript AST with static import/export, literal `require`, literal dynamic `import()`, and `ImportTypeNode` collection;
- `.vue`: direct test dev dependency `@vue/compiler-sfc` `^3.5.28` extracts `<script>` and `<script setup>`; TypeScript parses each block according to `lang`; SFC/compiler errors, unsupported script language, or unresolved script `src` fail closed;
- comments, arbitrary strings, templates/styles, non-literal runtime module names, `.build/**`, and `dist/**` are not dependency edges.

The test does not load generated `.nuxt`. Its importer profile table is:

| Profile | Governing inputs | Config/root/manifest authority |
| --- | --- | --- |
| `server` | AFB-001 plus server AFB-002/003/004 | server `tsconfig.json`; server root; server `package.json` |
| `studio-web` | closed AFB-002 web TS/JS/Vue paths | web `tsconfig.json` identifies the project; deterministic test-local Nuxt `~`/`@`/`~~`/`@@` source aliases; web root; web `package.json` |
| `brief-backend` / `brief-frontend` | Brief `backend-src` / `frontend-src` | Brief backend tsconfig or explicit JS profile from app config; Brief root; Brief manifest |
| `socratic-backend` / `socratic-frontend` | Socratic `backend-src` / `frontend-src` | Socratic backend tsconfig or explicit JS profile from app config; Socratic root; Socratic manifest |
| `devkit-template:<name>` | each valid template `src` independently | template app config plus explicit NodeNext/allowJs profile; template root; template manifest |

Relative, absolute, alias, and manifest-`imports` specifiers expected to name repository source must resolve or fail the enclosing AFB policy as `UNRESOLVED_GOVERNED_IMPORT`; they are never skipped. For AFB-005, a bare package is allowed only if its canonical package name is present in that importer's own `dependencies`, `devDependencies`, `peerDependencies`, or `optionalDependencies`. Another project/root manifest does not count. Node built-ins are allowed by `node:`/`builtinModules`. A forbidden host/runtime package is rejected even if declared. Checked-in application `frontend-src/generated/**` remains governed source; generated package/build directories do not.

### Closed AFB rules

| Policy ID | Importer Scope | Allowed | Rejected |
| --- | --- | --- | --- |
| `AFB-001` | `src/api/rest/**`, `src/api/websocket/**`, `src/standalone-application-host/api/**`, standalone bootstrap service | Application platform imports only from `application-platform-runtime-contracts.ts` or exact subject inputs | Direct runtime builder, lifecycle, stores, recovery, availability, run/session/publication, engine/queue, or shutdown imports |
| `AFB-002` | `src/api/graphql/**`; eleven current production Vue SFCs and other production files under the closed Studio application presentation paths | Existing GraphQL subject contracts and Studio application SDK/presentation-local dependencies | GraphQL import of application runtime internals or Studio presentation import of server package/bundle/runtime implementation |
| `AFB-003` | `src/application-packages/**`, `src/application-bundles/**` | Domain/store/installer/bundle dependencies and exact catalog-refresh coordinator -> reconciliation seam | API/presentation/server assembly/standalone-host imports or any other private runtime dependency |
| `AFB-004` | `src/application-platform/runtime/**`; application session scope; scoped session manager; publish adapter | Complete graph-sensitive application construction obligations plus injected scoped capabilities | Seven named direct global/default callees or omission/null/undefined/opaque spread of any required application construction dependency |
| `AFB-005` | Brief/Socratic frontend/backend source and each valid devkit template source | Project-local source, application frontend/backend SDKs, Node built-ins, and the importer's own manifest-declared library | Server/web/Electron/standalone/devkit host/runtime imports, undeclared libraries, unresolved or project-escaping local/alias imports |

The direct AFB-004 callee set remains `AgentRunManager.getInstance`, `AgentTeamRunManager.getInstance`, `AgentToolMcpSessionService.getInstance`, `getAgentToolMcpSessionService`, `getGeneralProcessPublishedArtifactPublisher`, `createGeneralProcessPublishedArtifactPublisher`, and `createGeneralProcessPublishedArtifactRelayService`. Named-import aliases and namespace members resolve to the exact export; similarly named declarations do not match.

### AFB-004 omission protection

AFB-004 additionally resolves the exact constructors/factory method used by `create-application-run-services.ts`. Required object arguments must be inline object literals with explicit, non-computed, non-null/non-undefined fields; spreads do not satisfy an obligation. Required positional arguments must be present and non-null/non-undefined. The current-tree check asserts every expected construction is still visible.

| Family | Exact targets and required input paths |
| --- | --- |
| Publication / resource | `AgentRunResourceManager[0]`: `sessionScope`, `runFileChangeService`, `publishedArtifactRelayService`, `memoryRecorder`; `PublishedArtifactPublicationService[0]`: `activeRunReader`, `publishedArtifactRelayService`, `projectionStore`, `snapshotStore`; `PublishedArtifactProjectionService[0]`: `activeRunReader`, `metadataService`, `projectionStore`, `snapshotStore` |
| Run | `AgentRunManager[0]`: all three backend factories, `activeRunRegistry`, `memoryRecorder`; `AgentRunIdentityAllocator[0]`: definitions, run manager, both metadata services, `memoryDir`; `AgentRunService[1]`: run manager, metadata service, identity allocator |
| Session / provider | `createApplicationSessionManager[0]`: `scope`, `executionCapabilities.publishedArtifactPublisher`, readiness assertion; AutoByteus factory definition service; Codex bootstrapper arguments 2/5; Claude session manager argument 2; Claude bootstrapper argument 2 |
| Session / provider — nested backend factories | `CodexAgentRunBackendFactory[1]`: graph-local Codex bootstrapper, with `[0]`/`[2]` deliberately process-scoped; `ClaudeAgentRunBackendFactory[0]`/`[1]`: graph-local session manager/bootstrapper |
| Team / context | Member context builder argument 0; mixed backend factory `memberTeamContextBuilder`/`createTeamManager`; mixed manager subteam/run/session/context inputs; team run manager factory/communication/file inputs; team history manager input; team run service manager/definition/metadata/identity/history/memory inputs |

The complete symbol/property table and required-parent inline-value audit are authoritative in DS-016. Synthetic tests exercise omission, `null`, and `undefined` for Codex argument 1 and both Claude arguments while proving Codex positions 0/2 may remain omitted/`undefined`. All other required fields/positions retain their every-omission coverage. This closes MP-ARCH-012-001 without changing reusable constructors or adding a recursive rule.

Only `build-studio-server.ts` and `start-standalone-application-host.ts` may select the named general-process supervisor/publisher for process work. The corresponding definitions remain in `general-process-run-supervisor.ts` and `published-artifact-publication-service.ts`. No application-construction file is exempt, and the policy does not expand into unrelated process-scoped workspace/runtime/model capability getters.

### Fixture and diagnostic proof

Disposable fixtures use exactly the same parser, project map, manifest logic, resolver, binding matcher, and obligation evaluator as the current tree. They cover TS/JS policy directions; allowed and forbidden `<script>`/`<script setup>` SFC imports; SFC parse failure; per-project declared/undeclared/builtin/escaping imports; every required AFB-004 omission; direct callee negatives; and exact assembly positives. The full scan must enumerate all eleven current Vue SFCs and every valid template.

Every failure includes AFB ID, profile, importer/location, original specifier or exact constructor/factory, resolved dependency when applicable, missing property path when applicable, and remediation. A fixture-only parser or resolver path is forbidden.
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
- production source changes merely to make a dependency checker easier to write; the only dependency change is the direct test-only SFC parser declaration and lock entry.

## Evaluation Conclusion

This audit finds **one missing invariant and one documentation companion**, not a new runtime architecture defect. Adopt candidates 1 and 8 as a small test/docs/dev-dependency-only hardening. Defer candidates 2, 3, and 7 until their named evidence gaps are satisfied. Reject candidates 4, 5, and 6 because current responsibilities are healthy and the proposed symmetry/churn has no owned production benefit.

The already-passed dual-host implementation remains the functional authority. No route, runtime, package, persistence, provider, MCP, worker, run, session, artifact, UI, or shutdown behavior is redesigned.
