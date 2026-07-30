# Requirements Doc — Universal Application Dual-Host Architecture

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Define and complete the architecture that lets one AutoByteus application package run through both:

1. the existing AutoByteus Studio iframe host; and
2. a standalone application host that presents the same application UI at `/`.

The same package must carry a runnable application-owned baseline for every required agent/team execution path. Studio may persist optional experiments and overrides without mutating the package. Standalone must normally run from the package baseline without a separate setup UI, copied Studio state, or preseeded configuration rows.

The design reuses the current application engine, backend API gateway, storage/migration lifecycle, agent/team orchestration, resources, events, and artifacts. It must not copy the server, create host-specific application business code, silently choose models/providers, or redesign the package/marketplace before dual-host execution is proven.

Identity/account features are outside the current platform and this architecture scope.

Source proposal snapshot: [sources/autobyteus-vertical-application-developer-experience-proposal.md](sources/autobyteus-vertical-application-developer-experience-proposal.md).

Repository-backed assessment: [proposal-critical-analysis.md](proposal-critical-analysis.md).

Reachable-use-case and design-principles validation: [design-self-validation.md](design-self-validation.md).

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Studio supports a setup-first, iframe-hosted lifecycle backed by a real application worker. The implemented standalone host now serves one selected package at `/`. | The same validated package remains consumable by Studio and standalone, with standalone mounting only after the selected application is runnable. | Studio enter/reload/exit, iframe correlation, and app-owned run creation remain authoritative. | REQ-001, REQ-004 / AC-001, AC-003, AC-006 |
| BEH-002 | The implementation now exposes `startApplication`, provider-local iframe/same-origin bootstrap, and one shared application client. | Preserve one host-neutral application startup API and keep provider wire data outside business callbacks. | HTTP/WebSocket business communication and backend context capabilities remain shared. | REQ-002 / AC-002, AC-003, AC-007 |
| BEH-003 | Package roots contain `applications/`; manifest v4 and local IDs are strict. Both hosts now consume this current package shape. | Keep one read-only manifest-v4 package and select standalone deployment by package root/local application ID. | No `.abapp`, manifest-vNext, compatibility wrapper, or dual parser enters this slice. | REQ-003 / AC-001, AC-004, AC-008 |
| BEH-004 | IR-010/IR-011 now let clean standalone Brief resolve Codex/Luna defaults, create graph-local researcher/writer runs, authenticate to the registered Agent Tools route, expose `publish_artifacts`/`send_message_to`, and complete real roster handoff. All five real publication calls nevertheless fail because the default publication adapter uses the process-global run manager rather than the application graph’s active-run/publication authority. | Every application-created Agent Tools session must carry the exact application publication port that owns its run and relay. The shared route resolves that port from the authenticated session; it must not consult a provider-captured global publication service or silently fall back. | Launch/readiness, capability tokens, tool projection, successful team-context messaging, binding/events/artifact owners, selected-resource editing, and the external-gateway boundary remain unchanged. Runtime-internal tooling remains outside this ticket. | REQ-004, REQ-005, REQ-007 / AC-005, AC-006, AC-010, AC-014–AC-016 |
| BEH-005 | Both compositions now register `/mcp/agent-tools/:sessionId` before standalone static fallback, and real sessions authenticate successfully. The route’s default registry/catalog/dispatcher family can resolve the session, but `publish_artifacts` reaches a separately captured process-global publication owner. | Each composition must pass one coherent Agent Tools process authority to the application graph and route. The graph creates a scoped application session authority from that same registry/catalog and an exact graph-local publication port; route dispatch executes the port stored on the authenticated session. | One internal route, existing bearer/401/404 semantics, Studio-only `/mcp/gateway`, selected-app browser surface, and no user-auth/server fork remain unchanged. | REQ-005, REQ-007 / AC-003, AC-009, AC-010, AC-016 |
| BEH-006 | Maintained folders expose the intended commands, package complete Codex/Luna defaults, and enforce portable configuration. `pnpm dev` reaches real researcher/writer sessions, lists eligible tools, and delivers messages, but publication produces no journal or application projection because the wrong run authority is consulted. | Keep the application-folder/package path and require default-provider-to-application-graph publication proof: actual session -> authenticated route -> session-bound publication port -> exact graph run event/relay -> journal/application projection. | Package validation, supported token/pricing tuning, mocks-as-tests-only, custom-builder removal, and provider-owned runtime internals remain outside this correction. | REQ-004–REQ-007 / AC-005, AC-006, AC-010, AC-011, AC-013–AC-016 |
| BEH-007 | Application data uses per-app `app.sqlite`; platform orchestration/configuration uses per-app `platform.sqlite` and a global lookup store. Current readers preserve and report invalid saved configurations rather than silently applying the manifest default. | Both hosts continue to use the same storage lifecycle. Valid and invalid Studio overrides remain separate host data; an invalid row is preserved for diagnosis until Reset deletes it and explicitly reveals package defaults. No package defaults are copied into SQLite. | App/platform database ownership, migration ordering/checksums, binding recovery, and event semantics remain unchanged. | REQ-004, REQ-005, REQ-007 / AC-006, AC-012, AC-015, AC-016 |
| BEH-008 | The graph-local `MemberTeamContextBuilder` correction is implemented through mixed root/subteam, persistent, task, and restored paths. | Preserve the exact graph-local authority and prove package team instructions in the final prompt during API/E2E. | Mixed-team execution behavior and prompt section ownership otherwise remain unchanged; no catalog merge or repository-wide DI rewrite is introduced. | REQ-008 / AC-017 |

## Investigation Findings

- The dual-host, package-default, truthful-readiness, selected-resource edit, portable-policy, invalid-override, and graph-local prompt corrections are architecture-approved through `ARCH-REV-006`; route parity and graph-local Codex definition construction are implemented/source-reviewed through IR-011/CRR-019.
- API/E2E round `API-REV-007` proves clean standalone validates Codex/Luna defaults, creates graph-local researcher/writer runs, authenticates both to the internal route, lists actual tools, and completes two recipient-name handoffs.
- The same live run proves five publication calls reach the eligible adapter but select the process-global publication service; each reports the graph-local member inactive and creates no journal/application projection.
- Studio already registers two distinct MCP surfaces: the session-scoped internal Agent Tools transport and the optional external `/mcp/gateway`. The design named the external gateway Studio-only but did not classify or compose the internal callback for standalone.
- Studio MCP Server Management imports host-configured external MCP servers into the shared registry. The general `/mcp/gateway` is a process-level endpoint for external clients such as Cursor or Claude Code and exposes only registered `ToolOrigin.MCP` tools; it explicitly excludes `publish_artifacts`, `send_message_to`, and other AutoByteus run-dependent tools.
- `/mcp/agent-tools/:sessionId` is the run-scoped surface used by Codex/Claude. It can combine agent-selected server-owned adapters with agent-selected MCP-origin tools already available in that host process. This route capability does not mean standalone inherits Studio’s configured MCP servers.
- Application-owned MCP server declaration, package validation, provisioning, secret binding, lifecycle, and application-scoped tool registration are a separate follow-up capability. The current maintained standalone proof requires only platform-owned Agent Tools and does not copy Studio MCP configuration or expose `/mcp/gateway`.
- `CRR-016` supersedes `CRR-015`: the earlier review incorrectly inferred Agent Tools exposure from every package `toolNames` value. `publish_artifacts` and `send_message_to` have Agent Tools MCP adapters, while `ConfiguredMcpAgentToolSourceResolver` forwards only `ToolOrigin.MCP`.
- CRR-016 correctly identified the initial missing-route defect, but its broader premise that the unchanged default provider family was sufficient for application publication is superseded by API-REV-007/CRR-020. Runtime-internal tools remain unrelated and outside this application-framework scope.
- IR-010 resolves the missing standalone route and IR-011 resolves graph-local Codex definition injection. API-REV-007 proves both real members authenticate, list 86 combined tools, expose `publish_artifacts`/`send_message_to`, and complete two roster handoffs.
- API-REV-007 also proves a new reachable authority failure: three researcher and two writer publication calls reach `PublishArtifactsMcpAdapterProvider`, but its captured default `PublishedArtifactPublicationService` uses process-global `AgentRunManager.getInstance()`. The exact graph-local members are active only in the application graph, so every call returns “run is not active,” the publication journal remains empty, and the application projects zero artifacts.
- `createApplicationRunAuthorities()` already constructs the correct publication service from the graph-local `AgentRunManager` and `ApplicationPublishedArtifactRelayService`. The missing design is an explicit session/route execution-authority connection plus a cycle break: the manager requires runtime factories that create Agent Tools sessions, while the exact publication service requires that manager.
- The secondary broad server-suite diagnostic `APIE2E-REPO-005` remains `Unclear`/unattributed and does not determine this design correction.

Full evidence is retained in [investigation-notes.md](investigation-notes.md).

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| [sources/autobyteus-vertical-application-developer-experience-proposal.md](sources/autobyteus-vertical-application-developer-experience-proposal.md) | User-supplied proposal snapshot | REQ-001–REQ-008 | AC-001–AC-017 | Input source; not accepted wholesale | Original vision and claims evaluated by the task. |
| [proposal-critical-analysis.md](proposal-critical-analysis.md) | Claim/evidence/readiness assessment and revised roadmap | REQ-001–REQ-008 | AC-001–AC-017 | Approved/refined through 2026-07-30; corrected through SR-010 | Supplies the bounded dual-host recommendation and graph-local Agent Tools publication authority correction. |
| [design-self-validation.md](design-self-validation.md) | Reachable scenario, spine, and canonical-principles validation | REQ-001–REQ-008 | AC-001–AC-017 | Complete through SV-015; approval `N/A` | Records use-case/principles validation and the exact session-bound publication/cycle-breaking correction without replacing requirements/design authority. |

## Design Health Assessment (Mandatory)

- Change posture: `Larger approved requirement plus downstream authority correction`
- Design issue signal: `Yes`
- Root cause classification: `Authoritative Boundary / Construction-Cycle Gap`
- Refactor posture: `Required for CR-015`
- Evidence basis: route/auth/tool exposure and roster messaging pass, while the default publication provider captures a process-global publication service that cannot see the graph-local application runs. The correct graph-local publication owner already exists but is disconnected from the session/route execution path.
- Required response: add one explicit composition Agent Tools process authority plus a session-bound publication port. Break the run-manager/session-publication construction cycle with a narrow graph-owned deferred port that is bound exactly once before readiness and fails closed before bind/after close. Application session creation and route dispatch must use the same registry/catalog/dispatcher family and the authenticated session’s exact port; no mutable singleton replacement, package branch, catalog merge, or request-time global fallback is allowed.
- Residual risk intentionally deferred: package release vNext, packaged/versioned tools/skills, mandatory standalone override UI/CLI, optimized host distribution, and third-party marketplace isolation remain later programs.

## Recommendations

1. Preserve the passed dual-host macro architecture: one package, provider-local bootstrap, two explicit compositions, one application-platform runtime graph.
2. Add `standalone.enabled: true` to the source-only `autobyteus-app.config.mjs` contract for projects that promise standalone execution; keep manifest v4 unchanged.
3. Require every required standalone slot to have a bundled default resource and every effective leaf to resolve application-owned `runtimeKind` and `llmModelIdentifier` at pack/validate time.
4. Make the package baseline resolution order explicit: nearest enclosing application-owned team default overlays the leaf application-owned agent default; for host execution, an optional saved host/Studio override overlays that package result. No value may come from a silent platform/global default.
5. Refactor `ApplicationExecutionResourceConfigurationService` into the one authoritative effective launch-configuration boundary rather than creating a standalone-only configuration system.
6. Replace overloaded `READY` with an application-run readiness result: `RUNNABLE`, `INVALID_PACKAGE`, or `HOST_REQUIREMENT_MISSING`. `HOST_REQUIREMENT_MISSING` means the package baseline is valid but either host capability state or an invalid/stale host override prevents a runnable effective configuration; issue scope and per-slot projections distinguish those causes.
7. Keep process/platform health separate. Standalone fails before listen/mount with a nonzero result when the selected application is not runnable; Studio remains available, shows the package baseline and the saved override separately, never silently falls back from an invalid override, and can explicitly reset by deleting the saved row.
8. Set all maintained standalone-capable leaf defaults to `runtimeKind: "codex_app_server"`, `llmModelIdentifier: "gpt-5.6-luna"`: Brief researcher, Brief writer, and the Socratic tutor. Studio remains free to override them for LM Studio or another available runtime/model.
9. Remove Brief’s hard-coded resource/model rescue path. Its backend consumes only the authoritative effective configured resource/profile; the SDK builder must require a complete profile.
10. Construct `MemberTeamContextBuilder` with the graph-local team-definition service and pass it through root/subteam manager construction, persistent members, task-agent instances, restored handles, and prompt composition.
11. Expose the currently selected resource’s definition-derived, pre-host-overlay baseline separately from both the manifest package baseline and the post-overlay effective configuration. Resolve unsaved selections through a no-write launch-service preview; Studio must never traverse definitions or substitute an old effective result.
12. Preserve the implemented recursive runtime/schema-aware portable policy and selected-resource preview/edit authority from SR-006.
13. Preserve the now-registered internal route, but construct one explicit process Agent Tools authority whose registry, catalog, executor, dispatcher, and route dependencies are passed by the composition rather than independently defaulted. Non-application runs receive an explicit general-process session authority over the same family; application graphs cannot reuse it.
14. Give each application graph a scoped Agent Tools session authority over that same process registry/catalog. Store a narrow `PublishedArtifactPublicationPort` on each created session; `PublishArtifactsMcpAdapterProvider` must execute only that authenticated session port and never capture or discover a global publication service.
15. Break the graph cycle with one `DeferredPublishedArtifactPublicationPort`: create it before runtime factories/session issuance, construct the graph-local run manager and publication service, bind exactly once before lifecycle readiness, reject before bind/after close, revoke the scope’s sessions during stop, then close the port.
16. Inventory only maintained reachable server adapters for this correction. Brief researcher/writer and Socratic tutor configure `publish_artifacts`; Brief also configures `send_message_to`. Publication is graph-sensitive and must use the exact port. Recipient-name messaging already carries graph-local delivery in the session’s member context and remains unchanged. Browser/media/task-delegation/configured-MCP/native-provider internals are not expanded without a separate reachable finding.
17. Keep the MCP surfaces explicit: the session-scoped Agent Tools route is shared by both hosts; general `/mcp/gateway` remains Studio-only; Studio MCP state is not copied to standalone; future application-owned MCP provisioning remains separate.
18. Add durable wrong-global/default-provider coverage plus real standalone and Studio publication/projection reruns. Require actual descriptor/`tools/list`, successful `publish_artifacts` and `send_message_to`, exact graph event/journal/application projection, scope revocation, and unchanged external-gateway/runtime-internal boundaries.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

Only product-reachable user, developer, system, operational, and governing-contract paths are use cases.

| Use Case ID | Reachable Independent Trigger / Governing Contract | Meaningful Product Outcome | Related Behavior / Requirement / Acceptance Criteria |
| --- | --- | --- | --- |
| UC-001 — Build once, consume in both hosts | Developer builds once and chooses Studio import or standalone run | One validated read-only package and identical frontend/backend bytes run through both hosts | BEH-001, BEH-003, BEH-006 / REQ-001, REQ-003, REQ-006 / AC-001, AC-008, AC-011 |
| UC-002 — Studio entry from package defaults | Studio user imports/selects a valid package and enters the application without saving an override | Package defaults are visible, host-validated, and used through the existing iframe/shared-client path | BEH-001, BEH-002, BEH-004 / REQ-001, REQ-002, REQ-004, REQ-007 / AC-002, AC-003, AC-005, AC-015, AC-016 |
| UC-003 — Studio presentation lifecycle | Studio user saves setup, reloads, exits, or leaves the route | Save does not silently relaunch; reload remounts; exit restores Studio shell | BEH-001, BEH-002 / REQ-001, REQ-002 / AC-003, AC-006 |
| UC-004 — Standalone start and browser entry | Operator starts standalone with a valid self-contained package and fresh data root | Package defaults validate before listen; application mounts at `/`; its first real configured-tool team run can call the session transport and complete without setup UI or seeded rows | BEH-001, BEH-003–BEH-007 / REQ-001–REQ-007 / AC-001, AC-003–AC-006, AC-009, AC-010, AC-012–AC-016 |
| UC-005 — Standalone selection rejection | Operator supplies invalid/missing/ambiguous package selection | Startup fails before listen with a specific diagnostic | BEH-003, BEH-005 / REQ-003, REQ-005 / AC-004 |
| UC-006 — Host-specific bootstrap normalization | A valid Studio iframe or standalone top-level document calls `startApplication` | Exactly one provider validates and normalizes its wire; malformed iframe input never falls through | BEH-002 / REQ-002 / AC-002, AC-003, AC-007, AC-008 |
| UC-007 — Shared backend operation | Application frontend invokes an application backend API | Both hosts delegate to the same gateway/engine/worker and return the same result | BEH-002, BEH-004 / REQ-002, REQ-004, REQ-005 / AC-003, AC-006, AC-010 |
| UC-008 — Live application communication | Frontend subscribes to notification/custom WS/direct agent communication | Both hosts use the same communication owners through host-specific mounts | BEH-002, BEH-004, BEH-005 / REQ-002, REQ-004, REQ-005 / AC-003, AC-006, AC-010 |
| UC-009 — Real resource and agent/team execution | Backend requests its required configured resource and starts a run | Effective profile reaches binding/runtime; the issued session capability reaches authenticated configured-tool dispatch, team handoff, events, and projected artifacts in both hosts | BEH-004, BEH-005, BEH-008 / REQ-004, REQ-005, REQ-007, REQ-008 / AC-005, AC-006, AC-010, AC-014–AC-017 |
| UC-010 — Storage preparation and migrations | Host ensures selected application backend is ready | Existing databases/migrations prepare under host data root; package remains immutable | BEH-003, BEH-007 / REQ-003–REQ-005 / AC-006, AC-012 |
| UC-011 — Restart and recovery | Operator restarts Studio or standalone with existing data root | Current bindings/events recover; standalone activates only selected application | BEH-007 / REQ-004, REQ-005 / AC-006, AC-012 |
| UC-012 — Required readiness or worker failure | Named prerequisite/host requirement fails, or active worker exits | Process health and application-run readiness are truthful; existing engine owns worker recovery | BEH-001, BEH-004, BEH-005 / REQ-004–REQ-007 / AC-003, AC-005, AC-006, AC-016 |
| UC-013 — Standalone root/assets/navigation/boundary | Browser requests root/assets/navigation/selected routes/invalid path | Valid UI works; reserved paths and confined static fallback remain enforced | BEH-001, BEH-003, BEH-005 / REQ-001, REQ-003, REQ-005 / AC-009, AC-010 |
| UC-014 — Graceful process stop | Operator terminates/closes host | Existing session cleanup, sockets, observers, workers, streams, vault, and Prisma retain their current ordered close behavior | BEH-005, BEH-007 / REQ-004, REQ-005 / AC-006, AC-010 |
| UC-015 — Native application-folder development | Developer runs `pnpm dev` or `pnpm dev:studio` in starter/Brief/Socratic | Real host session uses the project mapping and package validation; no mock/custom builder appears | BEH-006 / REQ-006, REQ-007 / AC-001, AC-005, AC-006, AC-011, AC-014 |
| UC-016 — Host-neutral application authoring | Developer writes/generated app imports only SDK/contracts | Source has one startup call and one package for both hosts | BEH-002, BEH-003, BEH-006 / REQ-001–REQ-003, REQ-006 / AC-001, AC-002, AC-007, AC-008, AC-011 |
| UC-017 — Local/trusted-network standalone access | Operator uses loopback or explicit non-loopback bind | Same-origin HTTP/WS works without identity/account features; broad Studio CORS is absent | BEH-001, BEH-002, BEH-005 / REQ-001, REQ-002, REQ-005 / AC-003, AC-009, AC-010 |
| UC-018 — Build, validate, start production | Developer/operator runs `build`, `validate`, then `start` | Existing output launches without rebuilding/watching/mocking and includes the same configured-tool runtime callback used by development | BEH-001, BEH-003–BEH-007 / REQ-001, REQ-003–REQ-007 / AC-001, AC-004–AC-006, AC-009, AC-010, AC-012–AC-016 |
| UC-019 — Reject invalid standalone package | Developer builds/validates a standalone-enabled project whose required leaf is incomplete or whose portable launch tuning contains a host credential/secret field | Pack/validate fails with exact slot/member/config-path diagnostic while supported token-count/pricing tuning remains valid; no invalid or secret-bearing package is emitted | BEH-004, BEH-006 / REQ-006, REQ-007 / AC-014 |
| UC-020 — Studio alternate-resource sparse override and reset | Studio user selects an allowed alternate resource/runtime/model, leaves fields inherited or later clears saved fields, saves/runs, then selects Reset to package defaults | Studio receives the selected resource’s authoritative pre-overlay baseline before editing, persists only the sparse override, and Reset deletes it and restores package baseline evaluation without package mutation | BEH-004, BEH-007 / REQ-007 / AC-015 |
| UC-021 — Missing host requirement | Valid package declares a runtime/model unavailable or unauthenticated on the current host | Application becomes `HOST_REQUIREMENT_MISSING` before business mount/action; no silent alternative is selected | BEH-004, BEH-005 / REQ-007 / AC-016 |
| UC-022 — Package team prompt semantics | Real Brief package-team run creates a member prompt | Non-empty package `team.md` instruction appears in member prompt through graph-local authority | BEH-008 / REQ-008 / AC-017 |
| UC-023 — Invalidated Studio override | Studio user saves a shared team/member override, then the selected resource is deleted or its member topology changes | Package remains valid; application becomes `HOST_REQUIREMENT_MISSING` with a `HOST_OVERRIDE` issue, launch is blocked without fallback, and explicit Reset deletes the row and restores package-default evaluation | BEH-004, BEH-007 / REQ-007 / AC-015, AC-016 |

## Out of Scope

- Identity/account features.
- `.abapp`, signing, publisher identity, marketplace installation, or arbitrary third-party execution.
- Manifest vNext, package dependency resolution, or packaged/versioned skills and tools.
- A mandatory standalone setup UI or copying/seeding package defaults into standalone persistence.
- A standalone override CLI/config-file adapter in this initial correction; any later adapter must call the same authority and remain optional.
- Multi-node/horizontal scaling or optimized per-application server binaries.
- Changing application business database schemas, migration files, runtime implementations, or orchestration semantics.
- Implementing the design under this solution-design stage.

## Functional Requirements

- **REQ-001 — Same package, two hosts:** Studio and standalone must execute the same package contents without a host-specific application build.
- **REQ-002 — Host-neutral application startup:** Application source calls one startup API; provider-specific bootstrap remains SDK-owned; both use the same client.
- **REQ-003 — Current package contract:** This slice keeps manifest v4 and `applications/<local-id>/`; standalone selection is deployment configuration.
- **REQ-004 — Shared application runtime path:** Both hosts use the current engine, gateway, storage, migrations, resource resolver, orchestration, events, artifacts, and session-scoped Agent Tools MCP callback. Application-created sessions dispatch graph-sensitive publication through the exact graph owner that created their run.
- **REQ-005 — Explicit composition roots:** Studio and standalone compose shared application-platform lifecycle/services explicitly. Each composition owns one exact Agent Tools registry/catalog/executor/dispatcher family shared by its internal route and application session issuance. Standalone exposes no unrelated Studio/admin registry or external `/mcp/gateway`.
- **REQ-006 — Native command path:** Maintained folders expose `dev`, `dev:studio`, `build`, `validate`, and `start`; all use the shared pack/validation owner and real hosts, never a mock/custom-builder product path.
- **REQ-007 — Portable launch defaults and truthful run readiness:** A standalone-enabled application packages complete application-owned runtime/model defaults for every required effective leaf and no host credential/secret/endpoint/path fields. One authority resolves the fixed manifest package baseline, the currently selected resource’s pre-host-overlay baseline, an optional sparse host override, the post-overlay effective profile, host capability, and `RUNNABLE`. It provides a no-write preview for an unsaved selection so Studio never reconstructs definition precedence. Invalid/stale saved state remains preserved and blocking until explicit Reset; it neither invalidates the package nor silently falls back. Standalone normally needs no configuration UI.
- **REQ-008 — Graph-local team prompt authority:** Package-team execution must use the exact composition graph’s team-definition service throughout member construction and prompt context; package instructions may not be resolved through a process-global fallback.

## Acceptance Criteria

- **AC-001:** One Brief package validates; identical read-only package and frontend/backend entry digests are used by both hosts and remain unchanged.
- **AC-002:** Brief, Socratic, and starter call `startApplication`; hosted-only public startup exports are absent.
- **AC-003:** Studio iframe and standalone same-origin bootstrap normalize to one runtime bootstrap/client path.
- **AC-004:** Standalone selects `{packageRoot, localApplicationId}` and rejects invalid/missing/ambiguous selection before listen.
- **AC-005:** A real Brief bundled team starts through `context.agentExecution` in both hosts with the same package baseline unless Studio explicitly overrides it, receives a scoped Agent Tools descriptor containing eligible `publish_artifacts` and `send_message_to`, executes publication through the exact application graph authority that owns its member run, hands work from researcher to writer, and completes.
- **AC-006:** Both hosts complete real backend state, migration, lifecycle event, notification, provider/team, authenticated eligible server-tool dispatch, team handoff, graph-local publication journal, and application artifact projection journeys without mocks or process-global publication fallback.
- **AC-007:** Application business source has no Studio/standalone branch or host/server internal import.
- **AC-008:** Current serialized contract values remain the only accepted values; in-scope code identifiers remain unversioned with no suffixed aliases.
- **AC-009:** Standalone serves `/`, relative assets, and safe SPA fallback while reserving `/_autobyteus/*`; the established `/mcp/agent-tools/:sessionId` registrar is installed before the static wildcard.
- **AC-010:** Standalone exposes only (a) readiness/bootstrap and selected-app backend/notification/custom-WS/direct-agent browser ingress under the selected application surface and (b) the existing `/mcp/agent-tools/:sessionId` callback. The callback retains its established bearer/session context and 401/404 gates and exposes only its session-enabled server-owned/configured-MCP routes. It is not the general external-client `/mcp/gateway`, which remains Studio-only. No unrelated Studio/admin routes are exposed.
- **AC-011:** Starter, Brief, and Socratic `dev`/`dev:studio` use checked-in devkit mappings, watch shared pack inputs, and run real hosts with no mock/custom-builder fallback.
- **AC-012:** Existing `app.sqlite`, `platform.sqlite`, global lookup, migration ledger/checksums, bindings, resource-configuration rows, and event semantics require no transformation.
- **AC-013:** `build` outputs `dist/importable-package`; `validate` checks it; `start` consumes it with separate durable data, graceful signals, no rebuild/watch/mock/package mutation/credential persistence.
- **AC-014:** Each maintained config explicitly declares `standalone.enabled: true`. `pack` and project-root `validate` use one pure package-default validator and reject any required standalone slot without a bundled default resource or any effective leaf missing `runtimeKind` or `llmModelIdentifier`. The validator recursively rejects actual credential, secret, password, authorization, bearer/access/refresh/token-value, endpoint/base-URL, workspace, and machine-path fields with the exact config path, while exact runtime-supported token-count fields (`max_tokens`, `token_limit`, `safety_margin_tokens`) and the typed pricing schema remain accepted. Brief researcher, Brief writer, and the Socratic tutor target `codex_app_server` plus `gpt-5.6-luna`; this changes Brief from incomplete `autobyteus` defaults and Socratic from its current `gpt-5.6-sol` model.
- **AC-015:** Each effective field resolves by exact host member override > host slot/team override > the selected resource’s definition-derived baseline (innermost team default > outer teams nearest-first > leaf agent default). The view keeps the manifest `packageBaseline`, `selectedResourceBaseline`, saved override, and post-overlay `effectiveConfiguration` as distinct meanings. A no-write preview returns the same selected-baseline projection for an unsaved allowed resource. Studio invalidates prior preview data on selection/catalog change, binds each result to the exact app/slot/ref, blocks Save while preview is pending/invalid, and lets PUT re-resolve identity/topology as the final concurrency check. It persists only sparse host fields and never traverses definitions or uses `effectiveConfiguration` as inheritance. For a mixed-runtime team with no team-wide runtime override, inheritance remains per member and the team-wide model control is unavailable until one runtime is explicitly selected; member overrides use each member’s resolved runtime. Missing resources and stale topology remain visible/blocking until explicit replace/reset. Package files/digests do not change and fresh standalone needs no saved row.
- **AC-016:** One readiness authority returns `RUNNABLE` only when every required slot has a non-null complete effective configuration. Incomplete package yields `INVALID_PACKAGE`. A valid package with unavailable runtime/model/credentials or an invalid/stale host override yields `HOST_REQUIREMENT_MISSING`; issue scope distinguishes `HOST_CAPABILITY` from `HOST_OVERRIDE`. The per-slot view retains the valid package baseline and saved override. A stale-topology row may also expose the current selected-resource baseline for explicit replacement, while a deleted/unavailable selection exposes no selected baseline; either way `effectiveConfiguration` is null for an invalid override and remains present for a host-capability failure. Standalone fails before listen/mount and exits nonzero; Studio remains healthy but blocks entry/run, shows structured diagnostics, and offers Reset when an override is at fault. No success result may contain a null required launch profile, no invalid override may silently fall back, and no business request/model input may rescue a non-runnable result.
- **AC-017:** `MemberTeamContextBuilder` is created from the graph-local `AgentTeamDefinitionService` and reaches root/subteam managers, persistent members, task-agent instances, and recovered handles. A durable assertion proves Brief’s `team.md` instruction appears in the final member system prompt; no catalog merge, package-ID branch, or global fallback supplies it.

## Constraints / Dependencies

- Reviewed implementation base: original architecture baseline `origin/personal` at `6caf809303294252c109420b238588f0c68aca6a`; current focused reviewer baseline is task commit `7dfc050f4` (`CRR-020`). Delivery owns final refresh/integration against the latest tracked base.
- Manifest v4 remains unchanged. `standalone.enabled` is source/devkit project metadata, not serialized application manifest data.
- Contract versions remain serialized data fields, not code-symbol suffixes.
- Package defaults may include portable runtime/model identifiers and runtime-schema-approved tuning/pricing. One recursive policy must reject credentials, secrets, authorization/token values, host-local endpoints, workspaces, and machine paths at every nesting depth; exact approved token-count/pricing names are not rejected merely because they contain “token”.
- Provider credentials, secret-vault state, host endpoints, executable/runtime installation, and installed-model availability remain host-managed.
- The package-default validator reuses current application-owned definition parsing and graph-local traversal through a pure exported server boundary; devkit must not duplicate a second parser.
- Process/runtime/tool readiness still completes before application-run readiness. `ApplicationPlatformLifecycle` and application launch readiness remain separate projections.
- Existing operational DB initialization, protected DB/key paths, Prisma, secret vault, app-data migrations, seven tool groups including Search, definition caches, and recovery remain required process/platform prerequisites.
- Both hosts treat generated package root as immutable. Mutable state stays under host data root.
- Existing Agent Tools capability tokens, redaction, route authorization, descriptor base URL, and 401/404 semantics remain unchanged. Session cleanup is extended only with explicit application-scope revocation/close ownership.
- Studio MCP Server Management and `/mcp/gateway` remain Studio/process integration concerns. Standalone neither reads Studio MCP configuration nor promises configured MCP-origin tools in this first proof. Agent Tools may project an MCP-origin tool only when it has been explicitly selected and is already available in the current host registry.
- Application-owned MCP resources/provisioning are deferred. When designed, package declarations must not contain credential values, and tools must be application-scoped rather than imported as ambient Studio dependencies.
- Standalone binds `127.0.0.1` by default; explicit non-loopback is trusted-network only and creates no authentication claim.
- The application package is not itself executable. Devkit delegates to the existing server project; optimized independent runtime distribution remains later work.
- `pnpm dev` uses disposable package/data roots; `pnpm start` uses built output and durable data outside the package.
- A missing standalone data-root `.env` may be created only as an empty/non-secret host file required by current `AppConfig`; existing files are never overwritten.

## Persisted Data Outcome (When Applicable)

- Stored subjects / locations: per-app `db/app.sqlite`, `db/platform.sqlite`, logs/runtime status, resource-configuration rows, and global orchestration lookup under the host data root.
- Required outcome: `Directly Usable — No Migration`
- Existing data to preserve: business data, migration ledger, bindings, event journal/cursors, run lookup state, and valid or currently invalid/stale Studio launch override rows.
- Unacceptable loss: destructive reset or change of an existing Studio canonical storage identity/override.
- Rationale: manifest and selected-resource baselines are computed from current immutable/shared definitions and are never stored; current saved profiles remain sparse higher-precedence host selection/field overrides. Valid rows apply directly over the exact selected definition baseline. Invalid/stale rows remain readable diagnostic state and block launch until the user explicitly replaces or deletes them; they are not auto-deleted or bypassed. Reset deletes a row through the existing store. Agent Tools sessions/capabilities remain in-memory process state and are revoked/cleared rather than persisted. No database schema or stored JSON rewrite is required, and defaults are never copied/seeded.
- Related IDs: REQ-004, REQ-005, REQ-007 / AC-006, AC-012, AC-015

## Assumptions

- The open-source deployment is locally downloaded/self-hosted and intentionally has no user/account feature. The internal runtime callback still uses a run-scoped bearer capability; this is machine-to-process session authorization, not user authentication.
- Brief remains the representative proof because it exercises the broadest application-platform and real team path.
- “Same application” means identical package files/code, not shared live data between host installations.
- A standalone host selects one application even if a package root contains several.
- The user-confirmed maintained-package target is `codex_app_server` / `gpt-5.6-luna` for Brief researcher, Brief writer, and the Socratic tutor; a host without that exact runtime/model truthfully reports `HOST_REQUIREMENT_MISSING` rather than selecting another model.
- Approval authorizes the architecture/design package, not production implementation.

## Risks / Open Questions

- Exact provider credential preflight varies by runtime/provider; the host-capability validator must expose structured diagnostics through a narrow port rather than inventing generic secret heuristics.
- Package defaults cannot guarantee every machine has the declared runtime/model/credentials. “Self-contained” means selection is package-owned; host availability remains validated.
- `llmConfig` is optional package tuning. If a host override changes runtime/model, runtime-specific package tuning must not be silently applied to an incompatible target; the resolver must preserve provenance and clear or revalidate it. Portable validation must use typed runtime/root and pricing schemas plus recursive sensitive-field classification, not broad substrings or a growing caller-local exception list.
- Current saved team profiles contain full topology identity plus optional values. They are directly usable as overrides, but normalization must validate their merged effective result rather than requiring the override alone to restate every package default.
- A valid saved override can later become invalid when a shared definition is deleted or team member routes/agent identities change. The aggregate must classify this as host-local `HOST_REQUIREMENT_MISSING`, retain the row and package baseline for Studio diagnosis, leave the affected `effectiveConfiguration` null, and reject `requireRunnable` until replacement or explicit reset.
- A shared resource selected by Studio can remain a Studio experiment. Its own definition-derived baseline must be resolved by the server before sparse editing; the UI may not infer it from available-resource summaries, the manifest baseline, or the old effective result. Standalone’s required baseline remains application-owned/bundled.
- Do not infer Agent Tools MCP exposure by copying package `toolNames`. Eligible static server adapters, selected configured MCP-origin tools, and the external gateway are separate projections/surfaces. Runtime-internal tools are outside the application-framework acceptance scope.
- Do not infer that a configured MCP-origin projection in Agent Tools makes Studio-configured MCP servers portable. `/mcp/gateway` re-exports host-configured MCP-origin tools to external clients; it is not application provisioning. Application-owned MCP resources require a separate package/provisioning/scoping contract.
- The bounded route registration must preserve the existing 401/404 capability gates and must not expose `/mcp/gateway` or unrelated Studio routes in standalone.
- The authenticated Agent Tools session is the authority-selection boundary for server-owned tool execution. Application publication may not resolve `getPublishedArtifactPublicationService()` or `AgentRunManager.getInstance()` during adapter construction/request execution. A missing, unbound, closed, or wrong-scope publication port fails explicitly before snapshot/journal mutation.
- Process route registration and application session creation must share the exact registry/catalog/dispatcher family supplied by the composition. Tests must use a deliberately distinct process-global manager/publication service to prove the application session cannot cross that boundary.
- Lifecycle stop revokes application-scoped Agent Tools sessions before closing their publication port and before graph publication/event owners are disposed. Restart creates a new scope; no session or port survives process restart.
- Optimized binary/container distribution, full offline dependency closure, and marketplace security remain deferred.

## Requirement-To-Use-Case Coverage

- REQ-001: UC-001–UC-004, UC-013, UC-016–UC-018
- REQ-002: UC-002, UC-003, UC-006–UC-008, UC-016, UC-017
- REQ-003: UC-001, UC-004, UC-005, UC-010, UC-013, UC-016, UC-018
- REQ-004: UC-002, UC-004, UC-007–UC-012, UC-014, UC-018, UC-022
- REQ-005: UC-002, UC-004, UC-005, UC-007–UC-014, UC-017, UC-018, UC-021
- REQ-006: UC-001, UC-015, UC-016, UC-018, UC-019
- REQ-007: UC-002, UC-004, UC-009, UC-012, UC-015, UC-018–UC-021, UC-023
- REQ-008: UC-009, UC-022

## Acceptance-Criteria-To-Scenario Intent

- AC-001: UC-001, UC-004, UC-015, UC-016
- AC-002: UC-002, UC-006, UC-016
- AC-003: UC-002–UC-004, UC-006–UC-008, UC-012, UC-017
- AC-004: UC-004, UC-005, UC-018
- AC-005: UC-002, UC-004, UC-009, UC-015, UC-018
- AC-006: UC-002–UC-004, UC-007–UC-012, UC-014, UC-015, UC-018
- AC-007: UC-006, UC-016
- AC-008: UC-001, UC-006, UC-016
- AC-009: UC-004, UC-013, UC-017, UC-018
- AC-010: UC-004, UC-007, UC-008, UC-013, UC-014, UC-017, UC-018
- AC-011: UC-001, UC-015, UC-016
- AC-012: UC-004, UC-010, UC-011
- AC-013: UC-001, UC-004, UC-014, UC-018
- AC-014: UC-004, UC-015, UC-018, UC-019
- AC-015: UC-002, UC-004, UC-020, UC-023
- AC-016: UC-002, UC-004, UC-009, UC-012, UC-018, UC-019, UC-021, UC-023
- AC-017: UC-009, UC-022

## Approval Status

Approved and refined by the user through 2026-07-30. The user explicitly confirmed complete application-owned Codex/Luna defaults, optional Studio overrides, no normal standalone setup UI, host-managed credentials/availability, and explicit failure without fallback/compatibility code. The user also confirmed that `/mcp/agent-tools/:sessionId` belongs in both hosts, while Studio MCP configuration and the general external-client `/mcp/gateway` do not become standalone application dependencies; focused application-owned MCP resources are separate future package/provisioning work. Codex/Claude runtime-internal tools remain outside this application-framework ticket. `CRR-020` does not change that product basis: it exposes a design gap in how the approved AutoByteus `publish_artifacts` path selects its graph-local publication authority. SR-010 revises that internal authority/lifecycle design and requires architecture review before implementation resumes.
