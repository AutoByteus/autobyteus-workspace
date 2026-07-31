# Design Self-Validation — Universal Application Dual-Host Foundation

## Status

- **Validation round:** `SV-019`, evaluating eight possible behavior-neutral hardening ideas against current source, supported production reachability, ownership, and proportionality.
- **Conclusion:** **Pass — adopt only one bounded architecture test plus two existing-document updates.** The current production architecture remains sound and unchanged. Candidates 1 and 8 are adopted as DS-016; candidates 2, 3, and 7 are deferred behind named evidence gaps; candidates 4, 5, and 6 are rejected as unsupported churn.
- **Current implementation evidence:** The fixed functional baseline is `CRR-033` source Pass / 97, `API-REV-012` dual-host Pass / 96.6%, and `CRR-034` proportional durable-test Pass. It proves the SR-013 four projections, package owners, acyclic construction, worker-exit ensure/restart, exact run cleanup, real standalone and Studio Codex/Luna publication/handoff/projection, restart/recovery/remount, route separation, cleanup, and exact 73/73 package parity.
- **Authoritative product decision:** a standalone-capable package is self-contained for runtime/model selection. Studio overrides are optional host-owned overlays. Credentials, provider endpoints, installed runtime/model availability, and comparable machine-local prerequisites remain host-owned.
- **Routing:** return the complete SR-015 package through `architecture_reviewer`; implementation and delivery remain paused until the corrected bounded DS-016 design passes.

## Inputs

1. Approved intent and acceptance basis in [requirements.md](requirements.md).
2. Current implementation, repository evidence, and decision log in [investigation-notes.md](investigation-notes.md).
3. Target architecture, exact ownership, flow, and implementation map in [design-spec.md](design-spec.md).
4. Proposal assessment in [proposal-critical-analysis.md](proposal-critical-analysis.md).
5. Architecture history in [design-review-report.md](design-review-report.md) and [architecture-review-revision-record.md](architecture-review-revision-record.md).
6. Implementation handoff/history in [implementation-handoff.md](implementation-handoff.md) and [implementation-revision-record.md](implementation-revision-record.md).
7. Current review baseline `CRR-033`, `API-REV-012`, and `CRR-034` in [code-review-report.md](code-review-report.md), [code-review-revision-record.md](code-review-revision-record.md), and the API/E2E artifacts; architecture authority `ARCH-REV-011` in [design-review-report.md](design-review-report.md) and [architecture-review-revision-record.md](architecture-review-revision-record.md).
8. Fixed executable baseline in [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md), [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md), [api-e2e-revision-record.md](api-e2e-revision-record.md), and [api-e2e-test-review-report.md](api-e2e-test-review-report.md).
9. Intended architecture supplement [application-framework-architecture-simplification.md](application-framework-architecture-simplification.md).
10. Eight-candidate proof and exact dependency policy in [application-framework-hardening-evaluation.md](application-framework-hardening-evaluation.md).
11. Canonical design principles in the `solution-designer` skill.

## Invariants Under Validation

1. **One package, two hosts:** Studio and standalone consume the same read-only manifest-v4 package bytes; no host-specific application build exists.
2. **Package-owned standalone baseline:** every required execution slot and effective leaf agent/member in a standalone-capable package resolves an application-owned `runtimeKind` and `llmModelIdentifier`.
3. **Four launch stages:** manifest package baseline, currently selected-resource pre-overlay baseline, sparse saved host override, and post-overlay effective configuration have distinct meanings. Selected baseline/preview is computed, never persisted, and the UI does not infer it.
4. **One launch/edit service:** package and exact selected-resource traversal, no-write unsaved selection preview, sparse override overlay, provenance, host validation, readiness, and business-launch access are governed by `ApplicationLaunchConfigurationService` in both hosts.
5. **Truthful readiness:** platform/process health and selected-application run readiness are separate. Application readiness is exactly `RUNNABLE`, `INVALID_PACKAGE`, or `HOST_REQUIREMENT_MISSING`. Package issues alone produce `INVALID_PACKAGE`; host override/capability issues produce `HOST_REQUIREMENT_MISSING`; an LLM-backed required leaf or invalid-override slot with a null effective profile is never runnable.
6. **Fail before business action:** package incompleteness fails `build`/`validate`; missing host prerequisites fail startup/entry before business UI/action. No request-time rescue or silent model/provider/resource fallback exists.
7. **Shared runtime:** both thin hosts normalize their browser bootstrap into one SDK runtime and delegate to the same platform, engine, gateway, orchestration, runtime, storage, events, artifacts, communication, and internal Agent Tools session-transport services.
8. **Exact team-definition service:** `MemberTeamContextBuilder` receives the application-runtime-scoped `AgentTeamDefinitionService` and the same builder is propagated through root/subteam managers, registries, and new/recovered/task-agent member handles.
9. **No package mutation or data migration:** definitions remain current read-only baseline sources; only explicit sparse host overrides live in existing stores. Selected baseline/preview is not persisted. Valid rows overlay the exact selected definition; invalid rows remain diagnostic state and are not auto-deleted, rewritten, or bypassed.
10. **No user authentication scope:** there is no user/account/login subsystem. Default standalone access remains loopback; explicit non-loopback bind is trusted-network. The runtime callback's bearer capability authorizes one machine-to-process run session and is not user identity.
11. **Native project experience:** application folders retain `pnpm dev`, `pnpm dev:studio`, `pnpm build`, `pnpm validate`, and `pnpm start`, with standalone `dev`/`start` requiring a standalone-enabled, valid package.
12. **Clean cut:** no version suffix in code symbols, manifest-vNext, compatibility alias, package-builder alias, baseline fallback, broad-server fallback, custom builder, mock product mode, second standalone profile model, or second top-level server project is introduced.
13. **Portable package data only:** one recursive schema-aware policy accepts exact runtime-supported token-count/pricing fields and rejects credential/password/authorization/token-value/endpoint/workspace semantics at any depth without logging values.
14. **Agent Tools MCP runtime/session manager:** both hosts register `/mcp/agent-tools/:sessionId` through one process `AgentToolsMcpRuntime` registry/catalog/executor/dispatcher family. Application-created sessions use that same family and carry the exact application-runtime-scoped publisher; no adapter/global/request-time fallback selects another runtime.
15. **MCP surface boundaries remain:** the run descriptor projects eligible server-owned adapters such as `publish_artifacts` and `send_message_to` plus selected available `ToolOrigin.MCP` tools. Only Studio registers general `/mcp/gateway`; standalone neither exposes it nor inherits Studio MCP state. Runtime-internal tools remain outside validation scope.
16. **Familiar role vocabulary:** central code uses the reviewed role nouns and removes mapped old names/files cleanly. `Composition` remains assembly activity only; `dependency graph` remains architecture explanation only.
17. **Prepared runtime is not an execution:** building `ApplicationPlatformRuntime` creates the required managers/factories/services but no new agent/team run. Normal execution starts only through application business demand; established recovery may restore legitimate recorded runs.
18. **Narrow outward runtime boundary:** `ApplicationPlatformRuntime` exposes exactly `lifecycle`, `rest`, `realtime`, and `hostManagement`. Transport registrars and Studio assembly depend on the appropriate projection and cannot reach runtime stores, recovery, active runs, publication, engine internals, dispatch state, or shutdown internals.
19. **Late package refresh without temporal callbacks:** the package registry owns package state and roots; package commands own install/reload/remove/validation/rollback; one late `ApplicationCatalogRefreshCoordinator` owns the exact bundle -> availability/reconciliation -> agent -> team refresh order after every dependency exists.
20. **Acyclic run/publication construction:** an early application MCP session scope owns exact revocation, `AgentRunResourceManager` owns per-run session/file/artifact/memory resources, and `ActiveAgentRunRegistry` owns identity transitions before the concrete publisher, later scoped issuer, and run managers. `BindOncePublishedArtifactPublisher` is removed, and application paths have no reverse callback or process-global publication fallback.
21. **Acyclic engine/event construction:** an early `ApplicationEngineController` and closed event/artifact queues precede the later `ApplicationEngineLauncher`, journal dispatcher, and artifact delivery service. `BindOnceApplicationEngineEventHandler` and the broad engine host are removed without a generic container, deferred handler, or event bus.
22. **Preserved lifecycle edges:** every accepted artifact command calls launcher ensure/restart before controller artifact-handler invoke and is drainable before engine stop; inactive discovery/replacement, explicit terminate, stop-all, rollback, and stale duplicate removal identity-release exact resources once before reporting null/success.
23. **Executable bounded dependency policy:** AFB-001–AFB-005 reject only the approved transport/private-runtime, package/presentation, application/host-internal, and application-scope/process-global directions using parsed/resolved imports. The check runs only during development/testing, has synthetic positive/negative proof, and changes no production source or runtime behavior.

## Scenario Validation Matrix

Every row has a supported action, system event, or governing package/host contract. Out-of-scope future deployment modes are not counted.

| Case | Product-Reachable Trigger | Spine(s) | Expected End-to-End Outcome | Design Result |
| --- | --- | --- | --- | --- |
| SV-C01 | Developer builds once and consumes the output in Studio and standalone | DS-006, DS-007 | One assembly/validation/digest; both hosts consume unchanged frontend/backend/package bytes; runtime writes stay outside the package | Pass |
| SV-C02 | Studio user imports a valid self-contained package and enters without saving an override | DS-001, DS-012 | Package defaults and provenance are visible; host requirements validate; iframe provider normalizes bootstrap; shared client mounts the business UI | Pass after SV-009 |
| SV-C03 | Operator runs standalone with a valid maintained package and fresh data root | DS-002, DS-011, DS-012, DS-014 | `codex_app_server` / `gpt-5.6-luna` defaults resolve without seeded rows/setup UI; readiness is `RUNNABLE`; `/` mounts; the internal route and application-runtime publisher are ready before any real tool-dependent run | Pass in API-REV-012 |
| SV-C04 | Operator binds loopback or an explicit trusted-network interface and uses the browser-visible origin | DS-002, DS-008 | Root-relative platform paths resolve from `window.location.origin`; no server bind address or reflected host becomes the browser endpoint origin | Pass |
| SV-C05 | Operator supplies invalid package root, missing/ambiguous local ID, or non-standalone selection | DS-002, DS-011 | Current parser/selection service fails before listen and before partial application initialization; no implicit first app | Pass |
| SV-C06 | Package contains multiple applications and operator selects one standalone-enabled local ID | DS-002, DS-005 | Static/bootstrap/ingress/recovery receive one immutable canonical selected descriptor and expose only that application | Pass |
| SV-C07 | Studio iframe origin/window/application/launch correlation is malformed or unsupported | DS-001 | Studio provider rejects; startup fails; it never falls through to standalone acquisition | Pass |
| SV-C08 | Standalone bootstrap is unavailable, malformed, or contradicts selected identity/readiness | DS-002, DS-012 | Standalone provider rejects; coordinator reaches startup failure; no Studio/mock fallback exists | Pass |
| SV-C09 | Named workspace, tool, definition, runtime, database, or vault platform prerequisite fails | DS-005 | Named lifecycle phase fails truthfully; platform does not become healthy; ingress does not claim application runnable | Pass |
| SV-C10 | Frontend invokes query, command, route, GraphQL, notification, custom WebSocket, or direct agent communication | DS-003, DS-004 | Shared client -> host mount -> exact shared gateway/communication owner -> result/event/socket; host imports no backend business modules | Pass |
| SV-C11 | Backend requests the required package resource and starts a real team run | DS-003, DS-004, DS-012, DS-014 | `requireRunnable` supplies a non-null effective configuration; descriptor/route expose eligible tools; messaging uses member context and publication uses the authenticated session’s exact application-runtime publisher; handoff/events/journal/projection complete | Pass in API-REV-012 |
| SV-C12 | Host restarts with the same selected application and data root | DS-004, DS-005 | Current schemas open directly; selected known-state intersection recovers bindings/availability/pending events; package remains immutable | Pass |
| SV-C13 | Standalone data root contains dormant state for a previously selected different local application | DS-005 | Recovery activates only `known IDs ∩ {selected canonical ID}`; other records remain dormant and unmodified | Pass |
| SV-C14 | Worker exits after readiness and frontend later invokes or reloads | DS-003, DS-005 | Existing engine/availability owners retain recovery and ensure-ready responsibility; hosts do not create a second restart policy | Pass in API-REV-012 |
| SV-C15 | Operator terminates while timers, workers, Agent Tools sessions, notifications, sockets, streams, events, vault, or Prisma are active | DS-005, DS-010, DS-014, DS-015 | Block new issue/event intake -> close application communication/transports/observers -> stop workers -> stop team then agent runs -> revoke remaining scope sessions -> stop streaming -> close process MCP/general/channel/vault/Prisma; no descriptor or private publisher reference survives restart | Pass in CRR-033/API-REV-012 |
| SV-C16 | Browser requests `/`, relative asset, valid SPA navigation, traversal input, or unknown reserved platform path | DS-008 | Real-path confinement under selected `ui/`; reserved prefix excluded first; only eligible document navigation receives SPA fallback | Pass |
| SV-C17 | Standalone starts with default networking and no account/authentication subsystem | DS-002, DS-008 | Loopback default, no broad Studio CORS, browser WebSocket origin host/port equals request host/port; explicit non-loopback is trusted-network operation | Pass |
| SV-C18 | Developer runs `pnpm dev` or `pnpm dev:studio` in starter, Brief, or Socratic | DS-006, DS-011, DS-012 | Checked-in mapping feeds the real pack/validator; maintained leaves package `codex_app_server` / `gpt-5.6-luna`; `dev` runs standalone watch/restart; `dev:studio` uses real Studio reload; no mock/custom builder | Pass in CRR-033/API-REV-012 |
| SV-C19 | Application/template imports Studio, Electron, standalone-host, or server internals | DS-001, DS-002, DS-007, DS-016 | AFB-002/AFB-005 reject the parsed/resolved host dependency with exact correction; providers remain SDK-owned and the source contains one startup call | Pass after SV-019 design; executable architecture test required |
| SV-C20 | Studio user reloads, exits, or leaves the application route | DS-009 | Reload creates fresh launch generation/document; exit/leave tears down browser resources and restores shell without inventing a runtime run | Pass |
| SV-C21 | Developer builds/validates a standalone-enabled package with an incomplete required leaf default | DS-011 | Pure package validation returns `INVALID_PACKAGE` with slot/member/source details; `build`/`validate` fail and no runnable package is emitted/accepted | Pass after SV-009; corrects the prior false Brief-default premise |
| SV-C22 | Studio user saves an alternate model/runtime override, runs, then resets | DS-009, DS-012 | Override wins and persists separately; package bytes remain unchanged; reset deletes the row and immediately reveals package defaults | Pass after SV-009 |
| SV-C23 | Developer/operator runs `pnpm build`, `pnpm validate`, then `pnpm start` | DS-007, DS-010, DS-011, DS-012 | Validate loads project config and standalone rule; start revalidates existing output, does not repack/watch/mock, and launches only if host-runnable | Pass after SV-009 refinement |
| SV-C24 | Either host prepares refreshed-base platform prerequisites | DS-005, DS-010 | AppConfig/database -> migration -> protected DB/root-key/sidecars -> Prisma -> vault -> app-data migration -> exactly seven tool groups including Search -> definitions/runtimes | Pass; run readiness remains a later DS-012 check |
| SV-C25 | Package default resolution traverses a nested team/member/leaf definition | DS-011, DS-012 | Deterministic package precedence is innermost team default -> outer teams nearest-first -> leaf agent default; all required leaves complete or validation fails | Pass after SV-009 |
| SV-C26 | Studio override exists for member, slot/team, or whole application | DS-012 | Host member override -> host slot/team override -> exact selected-resource definition baseline; effective values retain definition/host provenance and no process-global default participates | Pass after SV-011 refinement |
| SV-C27 | Valid package declares runtime/model unavailable on host or lacks required credential | DS-012 | If the host cannot resolve `codex_app_server`, `gpt-5.6-luna`, or required credentials, platform may remain healthy but application is `HOST_REQUIREMENT_MISSING` before Studio entry/standalone listen/business action; exact diagnostic names owner/input and no Sol/other-model substitution occurs | Pass after SV-009; exact Luna negative path confirmed before SR-005 handoff |
| SV-C28 | Brief backend or SDK attempts launch with missing profile or request-supplied rescue model | DS-003, DS-012 | Boundary rejects before launch; backend uses `requireRunnable(slot)` only; hard-coded resource/request-model/profile-null fallback is removed | Pass after SV-009 |
| SV-C29 | Real package-team member prompt is created in an application runtime with a distinct definition catalog | DS-013 | Application-runtime-scoped builder resolves package `team.md`; final member system prompt contains the Team Instruction section; global catalog cannot satisfy it accidentally | Pass after SV-009 |
| SV-C30 | Override changes runtime/model while an inherited `llmConfig` targets another selection | DS-012 | Runtime/model/portable config are overlaid atomically by layer; incompatible inherited config is cleared or rejected and provenance remains truthful | Pass after SV-009 |
| SV-C31 | Studio user saves a shared team for Brief, deletes that shared team through the supported catalog action, then reopens the application | DS-012 | Package baseline remains valid; selected-resource baseline is null because the resource is deleted; saved row remains visible with `savedOverrideState: INVALID`; affected effective config is null; aggregate is `HOST_REQUIREMENT_MISSING` with `HOST_OVERRIDE/SAVED_RESOURCE_UNAVAILABLE`; entry and `requireRunnable` are blocked; explicit Reset deletes the row and reevaluates defaults | Pass after SV-010 |
| SV-C32 | Studio has a saved team-member override whose route or agent identity no longer matches the current selected team topology | DS-012 | Package baseline, current selected-resource baseline, and raw row remain visible for explicit replacement; stale members are diagnosed as `HOST_OVERRIDE/SAVED_MEMBER_TOPOLOGY_STALE`; no member is silently dropped and no baseline runs; replace/reset is required | Pass after SV-010 |
| SV-C33 | Studio user selects an allowed alternate agent/team before any save, then changes selection while a preview is in flight or the resource disappears before PUT | DS-012 | Identity-bound no-write preview returns the exact selected-resource definition baseline or structured invalid-selection issue; stale responses are discarded; Save is blocked pending/invalid; PUT re-resolves and rejects catalog/topology drift without writing/fallback | Pass after SV-011 |
| SV-C34 | Studio edits a saved alternate team, clears a model/runtime field, and encounters homogeneous then mixed inherited member runtimes | DS-012 | Editor inherits only from the selected pre-overlay baseline, omits cleared fields from persistence, reloads after change, preserves per-member values, disables bulk model for mixed runtime, and requires an explicit common runtime before bulk model override | Pass after SV-011 |
| SV-C35 | Developer validates package tuning containing approved token counts/pricing plus nested password, bearer authorization, access-token value, endpoint, or workspace fields | DS-011 | Recursive policy accepts exact typed token-count/pricing inputs; rejects each secret/host-local path as `PACKAGE_FORBIDDEN_HOST_FIELD` without exposing values; no app-specific/compatibility exception | Pass after SV-011 |
| SV-C36 | Fresh standalone Brief creates a real Codex/Luna team run and invokes its selected server-owned Agent Tools | DS-003, DS-004, DS-012, DS-014 | Actual descriptor/list exposes `publish_artifacts`/`send_message_to`; writer handoff succeeds; publication uses the application run manager and creates application-runtime event, journal, relay, and application projection | Pass in API-REV-012 |
| SV-C37 | Internal Agent Tools route receives no bearer, an unknown/revoked session, or a request outside projection | DS-014, DS-005 | Missing bearer remains 401; unknown/wrong/revoked remains 404; no out-of-projection tool; security semantics remain independent of application-runtime capability selection | Pass in CRR-033/API-REV-012 |
| SV-C38 | Studio and standalone compose Agent Tools transport while only Studio owns general external MCP gateway/MCP state | DS-005, DS-014 | Both use one explicit process MCP runtime for internal route/session family; standalone omits `/mcp/gateway` and Studio MCP inheritance; no provider-native/application-MCP expansion | Pass in API-REV-012 |
| SV-C39 | Default publish provider is exercised while process-global and application-runtime run managers are deliberately distinct | DS-014, DS-004 | Authenticated application session dispatches only through its application-runtime publisher; global service observes no run/event/journal/projection | Pass in CRR-033/API-REV-012 |
| SV-C40 | Either host constructs the application publication/session capability family | DS-014, DS-005, DS-015 | Early application session scope and resource/identity owners exist before publication; the concrete publisher exists before the later scoped issuer; stopped scopes retain no usable session reference and no bind/rebind or reverse callback exists | Pass in CRR-033/API-REV-012 |
| SV-C41 | One application Agent Tools scope closes while another process/general scope exists | DS-014, DS-005 | New issue is blocked; only scope-owned sessions revoke; process registry/catalog remain coherent; old descriptors fail; restart creates a new scope | Pass in CRR-033/API-REV-012 |
| SV-C42 | Maintained Brief/Socratic adapter inventory is reviewed | DS-014 | Only application-runtime-sensitive `publish_artifacts` uses the scoped publisher; proven recipient-name messaging remains session-context delivery; browser/media/task/configured-MCP/native tools gain no speculative machinery | Pass in CRR-033/API-REV-012 |
| SV-C43 | Contributor follows Studio or standalone construction into application services, Agent Tools sessions, run lifetime, publication, and stop | DS-003–DS-005, DS-014 | Each central type/factory/file states a familiar concrete role and scope; code, tests, diagrams, and module/developer docs use the same vocabulary; retired names have no source compatibility alias | Pass in CRR-033/API-REV-012 |
| SV-C44 | Either server builds `ApplicationPlatformRuntime` before any application business action | DS-003, DS-005, DS-014 | Required managers/factories/services are prepared and zero new agent/team runs exist; a later guarded business request starts a run and established recovery restores only recorded runs | Pass in CRR-033/API-REV-012 |
| SV-C45 | A Studio or standalone server registers application REST and realtime routes or Studio performs host-level package work | DS-003–DS-005, DS-015 | `ApplicationPlatformRuntime` exposes exactly four projections; each caller receives only its subject contract and cannot select private stores, recovery, runs, sessions, publication, engine, dispatch, or shutdown services | Pass in CRR-033/API-REV-012 |
| SV-C46 | Studio imports, reloads, or removes a package successfully | DS-015 | Package command commits package state, then one coordinator performs bundle refresh -> catalog snapshot -> runtime reconcile/availability -> agent definitions -> team definitions exactly once; subsequent query/launch observes the reconciled catalog | Pass in CRR-033/API-REV-012 |
| SV-C47 | Studio package import/reload/remove fails during validation, install, or refresh | DS-015 | The package command applies the documented rollback, invokes only the bounded best-effort post-rollback reconciliation, preserves the original failure, and exposes no half-refreshed authoritative package state | Pass in CRR-033/API-REV-012 |
| SV-C48 | Either host constructs application run/publication/session services before business demand | DS-004, DS-005, DS-014, DS-015 | Application session scope -> run resources -> identity registry -> concrete publisher -> scoped issuer -> run managers/services is acyclic; zero new runs exist; no bind-once publisher, reverse callback, or process-global fallback remains | Pass in CRR-033/API-REV-012 |
| SV-C49 | A worker starts, emits a journal-backed event, crashes/restarts, or an application remounts | DS-003–DS-005, DS-015 | Stable engine controller, late launcher, closed event wakeup queue, journal dispatcher, and reentry service preserve ensure/ack/fail/retry/backoff/recovery/remount semantics and do not create a generic event bus | Pass in CRR-033/API-REV-012 |
| SV-C50 | Contributor audits the target framework dependency graph and retired source | DS-015 | No runtime consumer bypasses a projection; no package callback closes over later variables; both bind-once proxies and broad engine host are absent; named general-process factories are explicit; no service locator/container/reverse callback/generic deferred handler/compatibility alias/dual path exists | Pass in CRR-033/API-REV-012 |
| SV-C51 | The complete refactor is exercised in both hosts with existing data and packages | DS-001–DS-015 | All API-REV-011 behavior remains unchanged, exact package parity remains 73/73, current stores open directly, and no package/database/wire migration occurs | Pass in CRR-033/API-REV-012 |
| SV-C52 | An application worker exits while a maintained provider run remains active, then that run calls `publish_artifacts` | DS-004, DS-014, DS-015 | Relay maps one complete command; artifact delivery calls launcher `ensureReady`, restarts/coalesces the worker, then controller invokes the application artifact handler; persisted projection remains and the UI receives the event | Pass in CRR-033/API-REV-012 |
| SV-C53 | Active-run event relay and no-active-run fallback publish concurrently across one or more runs, then shutdown begins | DS-004, DS-005, DS-015 | One run preserves FIFO; different run lanes progress independently; active listener remains fire-and-forget/logged, fallback awaits completion; intake stops and accepted commands drain before engine stop; delivery failure does not roll back persisted projection | Pass in CRR-033/API-REV-012 |
| SV-C54 | `getActiveRun` discovers an inactive exact run | DS-005, DS-014, DS-015 | Registry deletes that identity and resource ownership, revokes its application MCP sessions, detaches file/artifact/memory observers once, attempts all cleanup, then returns null or surfaces aggregate cleanup error; no later callback exists | Pass in CRR-033/API-REV-012 |
| SV-C55 | Registration finds an inactive run with the same ID, or attachment fails after only some observers attach | DS-005, DS-014, DS-015 | Old exact run fully releases before replacement attaches; partial resources release before error; a stale completion cannot delete the replacement | Pass in CRR-033/API-REV-012 |
| SV-C56 | Explicit terminate, stop-all, registration rollback, and duplicate/stale removal race with exact run identity | DS-005, DS-014, DS-015 | Accepted termination consumes `removed`; stop-all snapshots exact objects and aggregates; repeated removal is no-op; identity mismatch preserves the newer run; every resource revoker/disposer runs at most once | Pass in CRR-033/API-REV-012 |
| SV-C57 | Contributor constructs and stops the full target owner chain | DS-003–DS-005, DS-014, DS-015 | Four projections/package owners remain; session scope/resource/registry/publication/issuer and controller/queues/launcher/consumers are acyclic; runtime build creates no run; stop drains/revokes/releases in order; no proxy, broad host, reverse callback, generic event bus/container/deferred handler, or migration appears | Pass in CRR-033/API-REV-012 |
| SV-C58 | Contributor adds an allowed or forbidden dependency in governed server TS/JS or one of the eleven Studio application Vue SFCs | DS-015, DS-016 | Exact source-kind extraction and the server/Studio-web profile identify the edge; AFB-001/AFB-002 report profile, importer/location, dependency, policy, and correction; SFC parse errors fail; allowed projection/web-local/contract imports pass | Pass after corrected SV-019 design; TS/JS/Vue fixtures and current-tree enumeration required |
| SV-C59 | Package/bundle code imports presentation/assembly/runtime implementation, or Brief/Socratic/template source uses a host internal, cross-project/escaping path, unresolved local alias, or undeclared library | DS-007, DS-015, DS-016 | AFB-003/AFB-005 use the exact project/config/root/manifest profile; only the catalog reconciliation seam plus local/SDK/own-manifest library/Node built-in imports pass; unresolved governed imports fail rather than disappear | Pass after corrected SV-019 design; per-project/cross-project fixtures required |
| SV-C60 | Contributor calls a process-global/default owner directly or removes one required graph-local publication/resource, run, session/provider, or team/context constructor/factory input | DS-014–DS-016 | AFB-004 resolves exact bindings, rejects the seven direct callees and every table-driven omission/null/undefined/opaque-spread case, asserts the current construction sites, and permits only the two named server assembly call sites | Pass after corrected SV-019 design; complete and every-omission fixtures required |
| SV-C61 | Contributor reads architecture docs after an import, resolution, or injection-obligation failure | DS-016 | `docs/modules/applications.md`, `docs/ARCHITECTURE.md`, and the executable test use identical AFB IDs, obligation families, project/manifest rules, and contract/SDK/declared-library/injection remediation without duplicating runtime truth | Pass after corrected SV-019 design; link/ID/obligation agreement required |
| SV-C62 | Corrected DS-016 is implemented and the full platform baseline is rerun | DS-001–DS-016 | Install/focused test works without generated `.nuxt`; the governed current tree, eleven SFCs, and templates pass; direct parser is dev-only; CRR-033/API-REV-012 behavior and 73/73 parity remain unchanged; diff contains only the test, server dev manifest/lock entry, and two docs; no migration/generated package output/production source change exists | Pass after corrected SV-019 design; full source-review/API-E2E loop required |

## Reachable Product Use-Case Completeness Audit

| Use Case | Validation Cases | Primary Spine(s) | Result |
| --- | --- | --- | --- |
| UC-001 — Build once, consume in both hosts | SV-C01, SV-C18, SV-C19, SV-C23 | DS-006, DS-007 | Complete |
| UC-002 — Studio entry from package defaults | SV-C02, SV-C07, SV-C09, SV-C27 | DS-001, DS-012 | Complete after SV-009 |
| UC-003 — Studio presentation lifecycle | SV-C20, SV-C22 | DS-009, DS-012 | Complete |
| UC-004 — Standalone start and browser entry | SV-C03, SV-C04, SV-C08, SV-C27, SV-C36, SV-C38, SV-C44 | DS-002, DS-011, DS-012, DS-014 | Complete in API-REV-012 |
| UC-005 — Standalone selection rejection | SV-C05, SV-C06 | DS-002, DS-011 | Complete |
| UC-006 — Host-specific bootstrap normalization | SV-C07, SV-C08, SV-C19 | DS-001, DS-002 | Complete |
| UC-007 — Shared backend operation | SV-C10, SV-C28 | DS-003, DS-012 | Complete |
| UC-008 — Live application communication | SV-C10, SV-C11, SV-C15 | DS-003, DS-004, DS-005 | Complete |
| UC-009 — Real resource and agent/team execution | SV-C11, SV-C25, SV-C26, SV-C28, SV-C29, SV-C36–SV-C42, SV-C44 | DS-003, DS-004, DS-012–DS-014 | Complete in API-REV-012 |
| UC-010 — Storage preparation and migrations | SV-C02, SV-C03, SV-C12, SV-C24 | DS-003, DS-005 | Complete |
| UC-011 — Restart and recovery | SV-C12, SV-C13 | DS-004, DS-005 | Complete |
| UC-012 — Required readiness or worker failure | SV-C09, SV-C14, SV-C27 | DS-005, DS-012 | Complete after SV-009 |
| UC-013 — Standalone root/assets/navigation/boundary | SV-C04, SV-C16, SV-C17 | DS-002, DS-008 | Complete |
| UC-014 — Graceful process stop | SV-C15, SV-C37–SV-C41, SV-C43, SV-C49, SV-C51, SV-C53–SV-C57 | DS-005, DS-010, DS-014, DS-015 | Complete in CRR-033/API-REV-012 |
| UC-015 — Native application-folder development | SV-C18, SV-C21 | DS-006, DS-011 | Complete after SV-009 |
| UC-016 — Host-neutral application authoring | SV-C01, SV-C19 | DS-001, DS-002, DS-007 | Complete |
| UC-017 — Local/trusted-network standalone access | SV-C04, SV-C17, SV-C37, SV-C38 | DS-002, DS-008, DS-014 | Complete; naming correction preserves network boundary |
| UC-018 — Build, validate, start production | SV-C03, SV-C15, SV-C21, SV-C23, SV-C24, SV-C27, SV-C36, SV-C38–SV-C41, SV-C44, SV-C48–SV-C57 | DS-010–DS-012, DS-014, DS-015 | Complete in CRR-033/API-REV-012 |
| UC-019 — Reject invalid standalone package | SV-C21, SV-C25, SV-C35 | DS-011 | Complete after SV-011 |
| UC-020 — Studio alternate-resource sparse override and reset | SV-C22, SV-C26, SV-C30, SV-C33, SV-C34 | DS-009, DS-012 | Complete after SV-011 |
| UC-021 — Missing host requirement | SV-C09, SV-C27 | DS-005, DS-012 | Complete after SV-009 |
| UC-022 — Package team prompt semantics | SV-C29 | DS-013 | Complete after SV-009 |
| UC-023 — Invalidated Studio override | SV-C31, SV-C32 | DS-012 | Complete after SV-010 |
| UC-024 — Navigate the application framework by responsibility | SV-C43–SV-C45, SV-C48–SV-C50, SV-C57 | DS-003–DS-005, DS-014, DS-015 | Complete in CRR-033/API-REV-012 |
| UC-025 — Preserve behavior while simplifying framework ownership and construction | SV-C45–SV-C57 | DS-003–DS-005, DS-014, DS-015 | Complete in CRR-033/API-REV-012 |
| UC-026 — Publish after application-worker exit | SV-C52, SV-C53 | DS-004, DS-014, DS-015 | Complete in API-REV-012 |
| UC-027 — Remove an inactive or terminated agent run | SV-C54–SV-C57 | DS-005, DS-014, DS-015 | Complete in CRR-033/API-REV-012 |
| UC-028 — Contributor receives immediate feedback for a forbidden application-framework dependency | SV-C19, SV-C58–SV-C62 | DS-016 over DS-001–DS-015 boundaries | Complete at corrected design level; architecture-test/dev-dependency/docs implementation required |

## Corrections Produced By The Validation

### SV-001–SV-008 — Retained prior corrections

The prior rounds remain authoritative and are preserved in [solution-revision-record.md](solution-revision-record.md):

- `SV-001`: made build-once/consume-twice an immutable-package spine (`DS-007`).
- `SV-002`: separated standalone root-relative wire paths from normalized absolute runtime endpoints.
- `SV-003`: scoped standalone recovery to the selected canonical application.
- `SV-004`: defined the no-auth loopback/trusted-network and same-origin boundary.
- `SV-005`: added confined standalone static and SPA-navigation behavior (`DS-008`).
- `SV-006`: fixed native `dev`/`dev:studio`/`build`/`validate`/`start` contracts (`DS-010`).
- `SV-007`: reconciled lifecycle with protected paths, Prisma, vault, Search, event pipeline, and refreshed-base cleanup.
- `SV-008`: fixed readiness ordering/seven-tool consistency, exact Brief/Socratic devkit mappings, and rejection of the broad-server fallback.

Code symbols remain unversioned. Existing serialized manifest/iframe numeric version fields remain unchanged; no suffixed alias is added.

### SV-009 — Make a standalone-capable package actually runnable and preserve application-runtime-scoped prompt authority

**Problems found by executable/review evidence:**

1. The design treated a default resource as a runnable launch default. Brief researcher/writer defaults contain `runtimeKind` only, while clean standalone requires `llmModelIdentifier` and fails at the business action.
2. Current configuration/readiness can return `READY` with `launchProfile: null`; runtime validation accepts the null and the SDK/backend can defer failure or rescue it through request/hard-coded values.
3. Studio has persisted overrides but reset does not delete them, and the design did not make package values the explicit baseline/provenance source.
4. `MemberTeamContextBuilder` can escape the selected application runtime through `AgentTeamDefinitionService.getInstance()`, so real package team instructions disappear from member prompts.

**Correction:**

- Add `standalone.enabled` to source-only devkit configuration; leave manifest v4 unchanged.
- Add pure `validateStandaloneApplicationPackage({ packageRoot, localApplicationId })` and invoke it from standalone-enabled `build`, project-root `validate`, `dev`, and `start` as appropriate.
- Reject a package unless every required slot has its package-owned resource default and every effective leaf resolves `runtimeKind` plus `llmModelIdentifier`. Update Brief researcher, Brief writer, and the Socratic tutor to the user-confirmed `codex_app_server` / `gpt-5.6-luna` package default.
- Replace the current ambiguous configuration/status boundary with one `ApplicationLaunchConfigurationService` and the tight aggregate states `RUNNABLE`, `INVALID_PACKAGE`, and `HOST_REQUIREMENT_MISSING`.
- Define deterministic package and host-overlay precedence, source provenance, atomic `llmConfig` handling, and host ports for runtime availability, exact model lookup, and credential readiness.
- Make standalone validate application run readiness before listen/static UI; make Studio use the same authority before entry while allowing its wider process to remain healthy.
- Treat current persisted configuration rows as optional overlays, add delete/reset behavior, and never seed/copy package defaults into the database.
- Make business backends consume only `requireRunnable(slot)` and remove Brief hard-coded resource, request-model rescue, and SDK null-profile construction.
- Construct `MemberTeamContextBuilder` from the exact application-runtime-scoped `AgentTeamDefinitionService` and propagate it through every manager/registry/handle creation/restoration path; add final-prompt semantic coverage using distinct catalogs.

### SV-010 — Represent invalid saved host state without package blame or fallback

**Problem found by ARCH-REV-004 / AR-007:** Studio can save a shared team and later delete it, and saved member topology can become stale. The package baseline remains valid, but SV-009’s union put complete configurations inside every `HOST_REQUIREMENT_MISSING` result. The state therefore fit neither `INVALID_PACKAGE` nor the stated host variant, and falling back would violate the saved override’s precedence.

**Correction:**

- Keep the three aggregate statuses but remove duplicated configuration arrays from the readiness union; per-slot views are the single configuration projection.
- Evaluate in strict order: package baseline -> saved override validity -> effective overlay -> host capability. Package failure wins only for package defects.
- Define `HOST_REQUIREMENT_MISSING` as valid package plus host-local blocker. Closed issue scope distinguishes `HOST_OVERRIDE` from `HOST_CAPABILITY`.
- Preserve `packageBaseline`, raw `savedOverride`, update timestamp, and issue details. For invalid override, set `savedOverrideState: INVALID`, `effectiveConfiguration: null`, and `canResetToPackageDefaults: true`.
- Do not auto-delete/rewrite the row, drop stale members, or execute the package baseline. `requireRunnable` rejects until an explicit replacement PUT or Reset DELETE triggers reevaluation.
- Add separate durable cases for missing selected shared resource and stale member route/agent topology, including post-reset transition.

### SV-011 — Strengthen the server edit projection and portable-field policy

**Problems found by CRR-012:**

1. `ApplicationLaunchConfigurationService` computes the alternate resource’s pre-overlay `selectedBaseline`, but `ApplicationLaunchSlotView` drops it. The Studio editor consequently has no authoritative baseline before first save or can inherit from the old post-overlay value while clearing a saved field.
2. Available-resource summaries contain identity only. Repairing this in web code would require a second definition traversal/precedence owner.
3. The package validator accepts legitimate token-count fields, but its broad recursive heuristic still admits nested password, bearer authorization, and access-token-value keys.

**Correction:**

- Keep four non-overlapping stages: manifest package baseline, selected-resource definition baseline, sparse saved override, and post-overlay effective configuration.
- Clean-cut rename the application-runtime-scoped builder to `ApplicationLaunchResourceBaselineBuilder`; definition baselines use only package/selected-definition provenance, while host provenance appears only after overlay.
- Add `selectedResourceBaseline` to the stored slot view and a closed no-write `ApplicationLaunchSelectionPreview` for unsaved refs. Preview performs no persistence, overlay, host validation, readiness transition, or fallback.
- Bind preview to exact application/slot/ref, discard stale responses, disable save while pending/invalid, refresh after catalog/definition/save/reset changes, and let PUT re-resolve as final concurrency authority.
- Remove the Studio package/effective inheritance heuristic. Clearing a field persists absence and reveals the selected definition baseline.
- Represent mixed runtime explicitly; per-member inheritance remains authoritative until an explicit common runtime enables a bulk model override.
- Add one recursive `ApplicationPortableLaunchConfigPolicy` with closed runtime/root/pricing schemas. Preserve exact token-count/pricing fields and reject actual password/secret/authorization/token-value/endpoint/workspace paths without logging values or adding compatibility/app exceptions.
- Preserve current override rows/schema, three readiness statuses, invalid-row semantics, Codex/Luna defaults, and application-runtime-scoped prompt authority.

### SV-012 — Withdrawn broad Agent Tools reinterpretation

SV-012 was drafted from `CRR-015`, which incorrectly assumed package `toolNames` should all be MCP gateway tools and pulled unrelated runtime-internal tooling into the application-framework acceptance boundary. That premise led to an unapproved proposal for a new aggregate runtime, port set, publication bridge, readiness phase, base-URL phase, and shutdown authority.

`CRR-016` supersedes that review result. Architecture review of SR-007 was stopped, the broad production drafts were removed, and SV-012 is retained only as chronological evidence. It is not part of the current design authority and must not be implemented.

### SV-013 — Restore the correct Agent Tools projection and narrow CR-013

> Historical scope correction: the route/projection/native-tool conclusions remain valid. Its further premise that the default publication-provider authority could remain unchanged is superseded by API-REV-007/CRR-020 and SV-015.

**Corrected evidence from CRR-016 and reviewed source:**

1. Runtime-internal tools are outside this ticket. Their implementation cannot be used to infer the Agent Tools descriptor from package `toolNames`.
2. `buildDefaultAgentToolMcpAdapterProviders()` already projects eligible server-owned adapters, including `publish_artifacts` and `send_message_to`.
3. `ConfiguredMcpAgentToolSourceResolver` forwards only selected configured `ToolOrigin.MCP` tools that are available in the current registry.
4. Studio already calls `registerAgentToolsMcpRoutes(app)`. Standalone constructs the existing session/descriptor stack but omits only that same registrar, so the advertised path reaches generic 404 instead of the route's established authorization gate.
5. The external `/mcp/gateway` is a different Studio-only integration surface and remains absent in standalone.

**Bounded correction:**

- In `build-standalone-application-server-composition.ts`, import the existing `registerAgentToolsMcpRoutes` and `await registerAgentToolsMcpRoutes(app)` before registering static/SPA fallback.
- Reuse the existing route/protocol, descriptor issuance, auth semantics, base-URL behavior, and eligible-tool projection. SV-015 later refines session/catalog/dispatcher construction and publication execution capability only where API-REV-007 proved it necessary.
- Do not infer Agent Tools exposure from package `toolNames`; runtime-internal source and tests remain outside the changed boundary.
- Keep eligible server-owned gateway tools and configured MCP-origin tools governed by the existing descriptor and `tools/list`.
- Do not add a second route, alias, compatibility fallback, external gateway, broad runtime aggregate, path builder, or configured-source resolver. SV-015 adds only the evidence-backed narrow publication publisher/readiness/close semantics.
- Correct API/E2E expectations to inspect the actual issued descriptor and `tools/list`, then prove server-owned publication/message dispatch through the registered route without adding runtime-tool acceptance scope.

### SV-014 — Separate Studio MCP management, the general gateway, and application MCP ownership

**User-confirmed boundary and source validation:**

1. Studio MCP Server Management provisions/imports host-configured external MCP servers into the Studio process registry.
2. General `/mcp/gateway` exposes that process’s current `ToolOrigin.MCP` tools to external MCP clients. It does not provision MCP servers, expose AutoByteus run-dependent tools, or scope tools to an application.
3. `/mcp/agent-tools/:sessionId` is the per-run callback used in both Studio and standalone. It exposes only the session’s eligible server-owned adapters and selected available MCP-origin tools.
4. Standalone neither exposes `/mcp/gateway` nor inherits Studio MCP configuration. The current Brief/Socratic proof does not require custom MCP provisioning.
5. A future focused application may declare its own MCP resources for shared platform provisioning, but package schema, secret binding, lifecycle/readiness, and application-scoped registration require a separate design.
6. Codex/Claude runtime-internal tooling is not a requirement, implementation delta, or acceptance target in this ticket. No related source or test file belongs in the change.

This clarification changes no route, source file, readiness state, package schema, test ownership, or architecture decision.

### SV-015 — Bind application sessions to the application-runtime-scoped publication owner

> Historical functional correction: the session-bound application publisher and exact publication behavior remain authoritative. The SR-010 bind-once construction mechanism described below is superseded by SV-017, which constructs the concrete publisher before scoped sessions and removes bind/rebind state.

**Product-reachable evidence from API-REV-007 / CRR-020:**

1. Both real Brief members authenticate to the now-registered route, list actual Agent Tools, and expose `publish_artifacts` plus `send_message_to`.
2. Two recipient-name handoffs succeed and the writer consumes them, proving the route, registry, session member context, and messaging adapter are functional.
3. All five publication calls reach `PublishArtifactsMcpAdapterProvider` but report the exact application runtime member inactive. The provider captured the cached global publication service, while the application runtime owns a different manager/relay/service.
4. The correct application-runtime-scoped publication service already exists. The remaining cycle is real: application runtime factories issue Agent Tools sessions before `AgentRunManager` can be completed, but the publication service needs that manager.

**Correction and principle validation:**

- One server-owned `AgentToolsMcpRuntime` owns the exact registry/catalog/executor/dispatcher family. Route registration and application session creation receive narrow dependencies from the same runtime. Non-application runs receive a separately explicit general-process session manager over that family so removing provider capture does not make them depend on an application runtime.
- One `ScopedAgentToolMcpSessionManager` creates and tracks sessions for the application-runtime scope, attaches its execution capabilities, and provides the exact issue/revoke boundary to application Codex/Claude and run/member cleanup.
- `AgentToolMcpSession` carries one non-wire `PublishedArtifactPublisher`. The publish provider delegates only through that authenticated publisher; it captures no service and performs no request-time application-runtime/process-global lookup.
- One `BindOncePublishedArtifactPublisher` is created before runtime factories, bound exactly once to the application-runtime-scoped service after manager/relay construction, asserted at P6A readiness, and fail-closed before bind/rebind/after close.
- Stop blocks issue, stops runs/member handles, revokes remaining scope sessions, closes the bind-once publisher, then closes process/event/vault/database owners. Restart creates a new scope.
- The change is deliberately bounded to the maintained application-runtime-sensitive publication adapter. Recipient-name messaging remains on its proven session member context; unconfigured adapters, configured MCP provisioning, external gateway, and provider-native tools remain unchanged.

This satisfies spine span sufficiency from real Brief action through authenticated dispatch, application-runtime publication journal, and application projection. It satisfies the authoritative-boundary rule because the publish provider depends on the authenticated session boundary, not both a session and a process-global service. It avoids compatibility code, catalog duplication, mutable singleton replacement, and speculative adapter refactors.

### SV-016 — Make central framework roles understandable without changing behavior

> Historical naming correction: this vocabulary is implemented and passed in CRR-029/API-REV-011. Its `BindOnce*` names accurately described the then-current implementation; SV-017 removes those two implementations after eliminating their construction cycles.

**Trigger and evidence:**

1. `CRR-028` finds a naming/readability Design Impact after all functional gates pass.
2. The user could not infer that `ApplicationPlatformRuntimeGraph` meant prepared host-level application services and asked whether agent/team execution should begin only when application business code needs it.
3. Source inspection confirms the abstract suffixes overlap across materially different roles: returned server, live runtime service set, process MCP subsystem, scoped collection manager, run-manager lifetime owner, stop-only coordinator, concrete service groups, and bind-once proxies.
4. `autobyteus-server-ts` is private and repository scan finds no supported consumer outside the server project for the affected root export.

**Responsibility-to-role validation:**

- `StudioServer`, `buildStudioServer`, and `buildStandaloneApplicationServer` describe configured servers; “composition” remains only the assembly activity and folder.
- `ApplicationPlatformRuntime` describes the long-lived connected application services for one host process. It starts no new agent/team run.
- `AgentToolsMcpRuntime` describes the one process MCP registry/catalog/executor/dispatcher subsystem.
- `ScopedAgentToolMcpSessionManager` describes one session collection; `AgentToolMcpSessionManager` is its narrow consumer interface.
- `GeneralProcessRunSupervisor` constructs/owns general run managers; `ApplicationRunShutdownCoordinator` sequences application team/agent stopping through `*Stopper` inputs.
- `PublishedArtifactPublisher` and `ApplicationEngineEventHandler` name narrow callables; `BindOnce*` names the essential one-bind state machine.
- `createApplicationOrchestrationServices`, `createApplicationRunServices`, and `StudioApplicationApiServices` describe concrete results rather than opaque “authorities.”

**Principle checks:**

1. **Behavior/production reality:** the map preserves the already-passed object instances, construction order, run triggers, recovery, route/session identity, package bytes, data, and close order.
2. **Main-domain naming:** each target name states subject plus familiar role. `Authority`, `Graph`, and central `Port` add no unique meaning and are removed from this bounded spine.
3. **Boundary encapsulation:** target names do not widen APIs. Server builders still return server-facing handles, the application runtime remains a typed construction result, route registrars receive narrow dependencies, and authenticated sessions retain the exact publisher.
4. **Clean-cut replacement:** the private/internal symbols and filenames are renamed in dependency order; old files/exports/tests are removed, not wrapped or deprecated.
5. **Product reachability:** UC-024 is a contributor journey through the maintained Studio/standalone construction and runtime path, not a synthetic repository-wide style exercise.
6. **Scope proportionality:** unrelated abstract symbols outside the reviewed spines stay untouched. Any newly discovered supported external consumer returns as Design Impact rather than introducing an alias locally.
7. **Execution timing:** SV-C44 explicitly proves runtime construction prepares managers/services only; business demand starts a run, and recovery restores only recorded runs.
8. **Documentation consistency:** mapped server module docs, web application docs, devkit README, and custom application development guide explain the same runtime-versus-execution and process-versus-scope distinctions.

**Result:** Pass at design level. The rename is implementation-required but structurally bounded and behavior-neutral.


### SV-017 — Replace mixed outward access, temporal package coupling, and bind-once cycles

**Trigger and fixed baseline:**

1. `CRR-031` finds three behavior-neutral Design Impact issues after `CRR-029`, `API-REV-011`, and `CRR-030` passed.
2. `ApplicationPlatformRuntime` currently exposes 19 mixed-level services; route registrars and Studio assembly select internal stores and availability concerns.
3. Studio package assembly closes callbacks over dependencies assigned later, while `ApplicationPackageRegistryService` mixes package state/commands/rollback with ordered catalog refresh.
4. Run/publication/session and engine/event/orchestration construction use two bind-once proxies. Their necessity disappears when stable state/control owners are separated from later launch owners.

**Boundary and ownership validation:**

- The runtime has four exact outward projections: `lifecycle`, subject-specific `rest`, subject-specific `realtime`, and `hostManagement.catalogReconciliation`. Stores, run/session/publication, engine/event, recovery, and shutdown services remain private.
- `ApplicationPackageRegistryService` owns package records/roots/snapshots only. `ApplicationPackageCommandService` owns import/reload/remove/validation/installer/rollback. `ApplicationCatalogRefreshCoordinator`, constructed late, alone owns bundle -> runtime reconciliation/availability -> agent definitions -> team definitions.
- GraphQL and other existing wire contracts remain unchanged; their registration receives separate query and command contracts rather than the registry implementation.
- `ActiveAgentRunRegistry` owns only active-run identity/state. The concrete application publisher is built from it before scoped Agent Tools sessions; run managers retain launch/restore/terminate and register exact cleanup against the registry. No bind-once publisher or application-path global fallback remains.
- `ApplicationEngineController` is the early stable worker-handle/status/invocation boundary. `ApplicationEngineLauncher` is constructed after runtime dependencies and owns process start/ensure/stop. The closed `ApplicationExecutionEventDispatchQueue` carries application-ID wakeups only; the existing journal remains the durable event authority.
- The late dispatcher retains ensure, journal claim/ack/fail, retry/backoff, resume/suspend, and stop. `ApplicationReentryService` owns stop/reload/reconcile/recover/resume transitions.
- General-process behavior remains available only through named assembly factories. No application code discovers general defaults; no generic deferred object replaces either removed proxy.

**Construction and lifecycle validation:**

1. Base stores and availability state.
2. Engine controller and closed dispatch queue.
3. Run/binding/override/journal stores and readiness gate.
4. Active-run registry and artifact relay.
5. Concrete application publication.
6. Scoped Agent Tools sessions.
7. Agent/team run managers and services.
8. Ingress, recovery, orchestration, streaming, and communication.
9. Engine launcher.
10. Journal dispatcher and reentry service.
11. Gateway, WebSocket, and notifications.
12. Catalog reconciliation and lifecycle.
13. Freeze the four outward projections.

Shutdown first blocks session issuance and event intake/timers, then communication and transports, observers, launcher/controller workers, team then agent runs, remaining scoped sessions, and streaming before existing process MCP/general/channel/vault/Prisma shutdown. There is no bind-close step.

**Principle checks:**

1. **Authoritative boundary:** callers depend on one outward projection, never the runtime plus an internal.
2. **Separation of concerns:** package state, package commands, and catalog reconciliation have distinct owners.
3. **Acyclic dependency direction:** stable state/control objects precede publication/session/run and dispatch/launch owners.
4. **No empty indirection:** every new owner governs state, sequencing, lifecycle, or rollback; pass-through-only factories are rejected.
5. **No speculative generalization:** the wakeup queue is closed to application IDs, not a generic event bus; general-process support uses named factories only.
6. **Clean removal:** both bind-once proxies and the broad engine host are deleted with no alias, wrapper, fallback, or dual path.
7. **Product reachability:** package import/reload/remove, application run/publication, worker events/recovery, route registration, and shutdown are established product paths already exercised by API-REV-011.
8. **Persisted data:** source construction and internal interfaces change; package bytes, database schema, stored configuration, journals, projections, and worker/wire protocols remain directly usable without migration.

**Result:** Superseded as the complete target by SV-018. ARCH-REV-010 confirms the four-projection and package-owner portions, but rejects the initial controller-only artifact relay and later manager-callback cleanup mechanics.

### SV-018 — Preserve worker ensure/restart and exact run cleanup without restoring cycles

**Trigger and material premises:**

1. `ARCH-REV-010` confirms CR-019 and CR-020 resolved at design level and leaves only two bounded CR-021 edges.
2. `MP-ARCH-010-001` is product-reachable: an application worker may exit while a supported provider run remains active, then `publish_artifacts` reaches the current relay. Current source calls engine-host `ensureApplicationEngine` before handler invocation; an attached-handle-only controller would drop that behavior.
3. `MP-ARCH-010-002` is product-reachable: inactive discovery/replacement, accepted termination, and stop-all remove exact application runs. Current source synchronously revokes run MCP sessions and detaches file-change, artifact-relay, and memory observers before returning.
4. A registry callback into a later `AgentRunManager` recreates the dependency cycle; omitting it loses cleanup. A generic deferred handler or event bus would hide rather than solve ownership.

**Artifact-delivery correction:**

- `ApplicationPublishedArtifactRelayService` retains binding lookup/event mapping and submits one complete `{runId, applicationId, bindingId, revisionId, event}` command to `ApplicationPublishedArtifactDeliveryQueue`.
- The queue is closed to that command, owns per-run FIFO/independent lanes/completion/intake-stop/drain, and exposes no topic, subscriber, callback registration, or later handler bind.
- `ApplicationPublishedArtifactDeliveryService`, created after launcher/controller, consumes the queue and always calls `ApplicationEngineLauncher.ensureReady(applicationId)` before `ApplicationEngineController.invokeApplicationArtifactHandler`.
- The active-run event listener remains fire-and-forget with logged failure; the no-active-run fallback remains awaited. An artifact snapshot/projection already persisted is not rolled back by later delivery failure.
- Lifecycle stops new artifact intake and drains accepted commands while launcher/controller remain live, then stops engine startups/workers.

**Run-resource correction:**

- `ApplicationAgentToolMcpSessionScope` is created from the exact process MCP family before publication. It records/revokes application session identities only and has no publisher/catalog/run-manager dependency.
- `AgentRunResourceManager.attach/release` owns run-session revocation plus file-change, artifact-relay, and memory observer disposers. It removes ownership before cleanup, attempts every category, aggregates errors, releases partial attachment, and makes repeats `already_released` no-ops.
- `ActiveAgentRunRegistry.removeIfCurrent({runId, expectedRun, reason})` identity-deletes only the expected object and returns `removed`, `not_found`, or `identity_mismatch`. It synchronously delegates exact cleanup and never calls back into a later manager.
- Inactive discovery cleans before null; inactive replacement cleans before new attach; explicit terminate removes only after accepted termination; stop-all snapshots/removes exact objects and aggregates; stale/duplicate removal cannot affect a replacement.
- `AgentRunManager` retains create/restore/terminate/stop commands but loses active/disposer maps. No global/default cleanup path is introduced.

**Acyclic construction and principles:**

1. Early controller + event/artifact queues precede stores/gate.
2. Application session scope + exact observer capabilities + queue-backed relay precede run resource manager and active registry.
3. Registry precedes concrete publication; concrete publication and scope precede the later scoped issuer; issuer/registry precede run managers.
4. Orchestration/streaming precede launcher; launcher/controller precede artifact delivery service and event dispatcher.
5. Each new type owns real state, identity, sequencing, or lifecycle; none is a pass-through-only factory, service locator, generic container, event bus, or deferred handler.
6. The accepted four outward projections, package refresh owners, routes, wire/package/database schemas, Codex/Luna defaults, override semantics, session/auth behavior, provider execution, publication/handoff/projection, recovery/remount/restart, shutdown outcomes, and 73/73 package parity remain fixed.
7. Runtime construction still creates no new run, and no data migration is required.

**Result:** Pass at design level. SV-C52–SV-C57 cover the exact witnesses and full construction/stop path. SR-013 is ready for architecture re-review; implementation remains paused.

### SV-019 — Adopt only evidence-backed architecture hardening, with truthful checker coverage

**Trigger and fixed baseline:**

1. The code reviewer requested proof, narrowing, deferral, or rejection of eight possible improvements rather than presuming another defect or refactor.
2. SR-013 remains fully passed: CRR-033 / 97, API-REV-012 / 96.6%, and CRR-034. Every production behavior and owner identity remains fixed.
3. SR-014 selected only one architecture test plus two document updates. `ARCH-REV-012` accepted that proportional decision but found two reachable test-design gaps: AFB-004 direct-callee matching misses optional injection omission, and a single TypeScript source/resolver path does not cover eleven Vue SFCs or separate server/web/application/template project authorities.
4. Source inspection confirms four distinct graph-sensitive omission families—publication/resource, run, session/provider, and team/context—and current application construction explicitly supplies each required dependency. A direct SFC probe confirms `@vue/compiler-sfc` extracts all eleven current `<script setup lang="ts">` blocks with their imports and no SFC errors. Project inspection confirms separate server/web configs, two backend tsconfigs, app-config-owned frontend roots, and one manifest per application/template.

**Decision by candidate remains unchanged:**

| Candidate | Reachability / consequence | Decision |
| --- | --- | --- |
| Automated module-boundary enforcement | Reachable contributor import or injection omission can reintroduce a private/global dependency without compiler failure | `Adopt Now`, only as corrected AFB-001–AFB-005 test |
| Deliberate application-platform public API | No supported external consumer or current bypass; server package is private and internal roots are explicit | `Defer With Named Evidence Gap` |
| Shared Studio/standalone conformance suite | No measured duplicated same-layer requirement assertions; API/E2E already proves parity | `Defer With Named Evidence Gap` |
| Common lifecycle vocabulary/state contract | Different subjects have different valid states and no proven contradiction | `Reject` |
| Ownership-led directory moves | Current paths match SR-013 owners; no wrong-owner change/import evidence | `Reject` |
| Standardized role suffixes | Current reviewed nouns match concrete responsibilities | `Reject` |
| Cross-boundary correlation infrastructure | Existing identities span application/binding/team/agent/session/revision; no supported diagnosis dead end | `Defer With Named Evidence Gap` |
| Executable architecture documentation | Exact policy/obligation/project rules materially shorten correction without a new source of behavior truth | `Adopt Now`, two existing docs only |

**ARCH-REV-012 correction proof:**

- **AR-010:** DS-016 now resolves exact constructor/factory bindings and requires explicit non-null/non-undefined inline inputs for every current graph-sensitive target. The table covers `AgentRunResourceManager`, publication/projection services, run manager/allocator/service, scoped session factory, provider bootstrappers/managers, member context/mixed-team factories/managers, team manager/history/service. Synthetic tests remove every required property/position, so every distinct fallback family has a rejected omission. The seven direct global/default callees remain rejected. Only the two named server assembly call sites may select the general-process supervisor/publisher.
- **AR-011:** `.vue` uses a direct server test dev dependency on `@vue/compiler-sfc`; `<script>` and `<script setup>` are parsed by their actual language. The exact profiles are server, Studio web, Brief backend/frontend, Socratic backend/frontend, and each discovered devkit template. Each profile owns its config or explicit test-local profile, project root, aliases, and manifest. AFB-005 accepts only libraries declared in that manifest's four dependency fields plus Node built-ins; unresolved governed local/alias/manifest-import paths fail. Fixtures use the same current-tree path and include SFC/cross-project positives and negatives.

**Design-principles result:**

- Product Reachability Gate: MP-ARCH-012-001/002 are supported contributor-contract witnesses; no speculative runtime state is added.
- Spine span: contributor TS/JS/Vue or construction change -> source/profile selection -> extraction/resolution/binding/obligation check -> policy result -> exact remediation -> rerun.
- Ownership: one test owns execution; one direct test-only parser supports the real governed file type; the applications module doc owns explanation; production owners remain untouched.
- Authoritative boundary: project manifests cannot leak across applications/templates, generated `.nuxt` cannot become test authority, and optional general-process defaults cannot be selected from application construction by omission.
- Empty-indirection control: no facade, DI container, service locator, generic event bus, mode-switched server builder, compatibility wrapper, generic lifecycle, generated documentation, or production helper is added.
- Proportionality: Add one test; Modify the server dev manifest, workspace lockfile, and two docs; no production source Add/Modify/Rename/Move/Remove and no data migration.
- Preservation: every Studio/standalone route, wire/package/database contract, readiness/default/override rule, session/auth behavior, tool projection, publication/handoff/projection, recovery/remount/restart, shutdown outcome, and `73/73` package byte remains fixed.

**Result:** Pass at design level after the bounded ARCH-REV-012 correction. SV-C58–SV-C62 now cover SFC/project resolution, fallback-by-omission, documentation agreement, test-only dependency ownership, and the full no-behavior-change gate. SR-015 is ready for architecture re-review; implementation and delivery remain paused.
## Data-Flow Coverage Check

| In-Scope Concern | Primary / Return Spine | Authoritative Boundary | Result |
| --- | --- | --- | --- |
| Studio launch and presentation | DS-001, DS-009 | Studio host + shared startup coordinator | Complete and functionally passed |
| Standalone launch/root/navigation | DS-002, DS-008 | Selected standalone host + same-origin provider | Complete and functionally passed |
| Shared backend/live execution | DS-003, DS-004 | Gateway/engine/orchestration/run services/events | Complete and functionally passed |
| Platform readiness/recovery/stop | DS-005 | `ApplicationPlatformLifecycle` and server assembly | Complete and functionally passed |
| Native application development | DS-006 | Devkit config/commands and real hosts | Complete and functionally passed |
| One package/two hosts | DS-007 | Existing pack/parser/validator and read-only consumers | Complete and functionally passed |
| Built-package production start | DS-010 | Devkit `start` -> public standalone host API | Complete and functionally passed |
| Standalone package completeness/portability | DS-011 | Pure platform package validator + recursive portable policy | Complete and functionally passed |
| Selected-resource editing/effective launch/readiness | DS-012 | `ApplicationLaunchConfigurationService` | Complete and functionally passed |
| Package-team prompt semantics | DS-013 | Exact application team-definition service and context builder | Complete and functionally passed |
| Internal Agent Tools configured-tool transport | DS-014 with DS-004/DS-005 | `AgentToolsMcpRuntime` -> scoped session manager -> authenticated publisher/member context -> journal/projection/handoff | Complete and functionally passed |
| Framework navigation and runtime/execution distinction | DS-003–DS-005, DS-014 | Exact SR-011 role vocabulary and name/file map | Functionally passed in API-REV-011 |
| Narrow runtime outward boundary | DS-003–DS-005, DS-015 | Four exact runtime projections and subject-specific registrars | Complete and passed in CRR-033/API-REV-012 |
| Package command, rollback, and catalog refresh | DS-015 | Package registry + command service + late refresh coordinator | Complete and passed in CRR-033/API-REV-012 |
| Acyclic run/publication/session construction | DS-004, DS-005, DS-014, DS-015 | Application session scope -> run resources -> exact active registry -> concrete publisher -> scoped issuer -> run managers | Complete and passed in CRR-033/API-REV-012 |
| Acyclic engine/event/artifact construction and recovery | DS-003–DS-005, DS-015 | Controller + closed queues -> launcher -> artifact delivery/journal dispatcher/reentry, with ensure-before-invoke | Complete and passed in CRR-033/API-REV-012 |
| Executable application-framework dependency boundary | DS-016 over DS-001–DS-015 | AFB-001–AFB-005 TS/JS/Vue project resolver plus exact injection obligations and canonical module documentation | Complete after corrected SV-019 design; test/dev-dependency/docs and full API-REV-012 preservation proof required |

## Canonical Design-Principles Audit

| Principle / Derived Check | Result | Validation |
| --- | --- | --- |
| Approved behavior and production reality | Pass | CRR-033/API-REV-012/CRR-034 are the fixed passed baseline. SR-015 adds only development-time enforcement, one test-only parser declaration, and documentation. |
| Spine span sufficiency | Pass | Product spines remain complete; DS-016 separately spans contributor change -> resolved dependency -> diagnostic/correction -> passing rerun without entering production runtime. |
| Ownership clarity and boundary encapsulation | Pass after SV-019 | Implemented SR-013 owners remain unchanged; one architecture test makes their critical directions executable and existing application docs explain correction. |
| Main-domain naming health | Pass | SR-011 names remain implemented and passed; SR-013 adds only concrete role nouns consistent with that vocabulary. |
| Off-spine support remains subordinate | Pass | Auth, origin, descriptors, diagnostics, cleanup, registry lookup, and the closed wakeup queue remain subordinate to their owners; no generic event bus/container appears. |
| Current-schema persisted-data transition | Pass | Internal construction changes only; current package/database/configuration/journal/projection data remains directly usable with no migration. |
| Product-reachability gate | Pass | All 28 use cases and 62 scenarios are supported actions, observed behavior, or governing contracts. The candidate audit adopts only the contributor regression/documentation path with an independently proven enforcement gap. |
| Clean-cut replacement | Pass after SV-018 | Both bind-once proxies and the broad engine host are removed with no alias, wrapper, fallback, reverse callback, generic deferred replacement, or dual path. |
| Interface and semantic tightness | Pass after SV-018 | Outward projections are exact; event queue carries only IDs; artifact queue carries complete commands; session scope, resource manager, and registry own distinct revocation/resource/identity meanings. |
| Existing capability reuse | Pass | Existing package, availability, run, publication, Agent Tools, engine, journal, recovery, and transport capabilities are decomposed, not replaced by a new platform. |
| Server/runtime dependency control | Pass after SV-019 | Current acyclic structure is passed; AFB-001–AFB-005 prevent the exact material bypass families without a runtime container or generic layer model. |
| File/folder placement and removal | Pass | Existing production placement remains authoritative. The only new file is a development-time architecture test under `tests/architecture`; no source move/removal is justified. |
| Failure semantics | Pass | Package rollback/original-error preservation, journal retry/ack/fail, readiness, route auth, provider execution, and shutdown behavior remain fixed. |
| Compatibility rejection | Pass | No compatibility alias, old/new constructor path, application global fallback, or migration branch is permitted. |

## Residual Risks And Required Downstream Evidence

1. Architecture review must verify that AFB-001–AFB-005 encode only already-approved owner directions, that the catalog-reconciliation and named general-process exceptions are exact, and that no generic layer model or production facade is introduced.
2. The architecture test must parse and resolve imports against repository TypeScript configuration, cover static import/export and literal dynamic/require forms, ignore generated output, and prove synthetic allowed/rejected fixtures. A text-only grep is insufficient.
3. Current-tree enforcement must pass without production-source edits or broad allow-list suppression. Any independently discovered current violation must be classified and rerouted rather than silently exempted.
4. Documentation must use exactly the same policy IDs/meanings and link to the executable test while leaving source and the existing runtime docs authoritative for detailed behavior.
5. Source review must verify the exact change inventory: one architecture test added, two existing docs modified, zero production source/schema/package/generated artifacts changed.
6. API/E2E must preserve the complete API-REV-012 baseline, including real Studio/standalone Codex/Luna publication, handoff, projection, worker restart, recovery/remount, route separation, cleanup, and exact 73/73 package parity.
7. Deferred candidates may be reopened only by their named evidence: a supported external consumer/bypass for public API, measured duplicated same-layer assertions for shared conformance, or a supported diagnosis dead-end for new correlation.
8. `APIE2E-REPO-005` remains `Unclear` and separate. Application-owned MCP provisioning, optimized distribution, public-internet hosting, user authentication, marketplace isolation, and repository-wide cleanup remain out of scope.

## Self-Validation Decision

The major architecture remains:

> One immutable application package supplies its complete standalone launch baseline; two thin hosts normalize their ingress and build the same application platform runtime and business stack.

SR-015 preserves the fully implemented and passed SR-013 architecture. It adds no runtime node or product path. Corrected DS-016 makes five critical dependency directions, including omission-triggered fallback, executable across the actual TS/JS/Vue project inputs and gives contributors one canonical documentation table and correction path.

All 28 reachable use cases map to DS-001–DS-016 and at least one of 62 validation cases. The design adds no product status, route, project, UI, persistence, migration, manifest change, authentication system, host-specific build, compatibility alias, production runtime/tool behavior, external gateway, public facade, shared host harness, lifecycle abstraction, directory move, suffix rename, correlation infrastructure, generic container/event bus/deferred handler, or repository-wide refactor. SR-015 is ready for `architecture_reviewer`; no architecture approval or implementation completion is presumed.
