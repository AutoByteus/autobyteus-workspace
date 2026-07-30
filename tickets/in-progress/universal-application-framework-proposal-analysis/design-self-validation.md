# Design Self-Validation — Universal Application Dual-Host Foundation

## Status

- **Validation round:** `SV-014`, clarifying MCP ownership and removing Codex/Claude runtime-internal tooling from the application-framework acceptance scope after the user’s final discussion.
- **Conclusion:** **Pass — documentation/traceability clarification only.** `ARCH-REV-006` remains the design authority and CR-013 remains the same bounded Local Fix. Both hosts require the run-scoped Agent Tools route; standalone does not expose the general external-client MCP gateway or inherit Studio MCP configuration. No architecture review or source-scope expansion is required. This is not an implementation or API/E2E pass.
- **Current implementation evidence:** SR-006 passed as `ARCH-REV-006`; IR-008/IR-009 and `CRR-014` implement/pass selected-resource editing, recursive portable policy, complete Codex/Luna launch, and prompt semantics. `API-REV-005` proves standalone binding/team/session descriptor creation but reaches generic 404 at the unregistered existing route. `CRR-016` verifies the existing Agent Tools subsystem is coherent and classifies only the standalone route omission as `Local Fix`. Commit `e8e06afdd` now contains the bounded registrar change, but its owning implementation/source-review result is not presumed here. Runtime-internal tooling is outside this ticket.
- **Authoritative product decision:** a standalone-capable package is self-contained for runtime/model selection. Studio overrides are optional host-owned overlays. Credentials, provider endpoints, installed runtime/model availability, and comparable machine-local prerequisites remain host-owned.
- **Routing:** send the clarified cumulative package to `implementation_engineer` so the already-bounded CR-013 registrar commit can continue through its owning implementation handoff, full source review, and API/E2E without any runtime-internal scope.

## Inputs

1. Approved intent and acceptance basis in [requirements.md](requirements.md).
2. Current implementation, repository evidence, and decision log in [investigation-notes.md](investigation-notes.md).
3. Target architecture, exact ownership, flow, and implementation map in [design-spec.md](design-spec.md).
4. Proposal assessment in [proposal-critical-analysis.md](proposal-critical-analysis.md).
5. Architecture history in [design-review-report.md](design-review-report.md) and [architecture-review-revision-record.md](architecture-review-revision-record.md).
6. Implementation handoff/history in [implementation-handoff.md](implementation-handoff.md) and [implementation-revision-record.md](implementation-revision-record.md).
7. Current focused failure-origin authority `CRR-016` / CR-013 in [code-review-report.md](code-review-report.md) and [code-review-revision-record.md](code-review-revision-record.md). It supersedes `CRR-015`.
8. Executable evidence in [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md), [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md), and [api-e2e-revision-record.md](api-e2e-revision-record.md).
9. Canonical design principles in the `solution-designer` skill.

## Invariants Under Validation

1. **One package, two hosts:** Studio and standalone consume the same read-only manifest-v4 package bytes; no host-specific application build exists.
2. **Package-owned standalone baseline:** every required execution slot and effective leaf agent/member in a standalone-capable package resolves an application-owned `runtimeKind` and `llmModelIdentifier`.
3. **Four launch stages:** manifest package baseline, currently selected-resource pre-overlay baseline, sparse saved host override, and post-overlay effective configuration have distinct meanings. Selected baseline/preview is computed, never persisted, and the UI does not infer it.
4. **One launch/edit authority:** package and exact selected-resource traversal, no-write unsaved selection preview, sparse override overlay, provenance, host validation, readiness, and business-launch access are governed by `ApplicationLaunchConfigurationService` in both hosts.
5. **Truthful readiness:** platform/process health and selected-application run readiness are separate. Application readiness is exactly `RUNNABLE`, `INVALID_PACKAGE`, or `HOST_REQUIREMENT_MISSING`. Package issues alone produce `INVALID_PACKAGE`; host override/capability issues produce `HOST_REQUIREMENT_MISSING`; an LLM-backed required leaf or invalid-override slot with a null effective profile is never runnable.
6. **Fail before business action:** package incompleteness fails `build`/`validate`; missing host prerequisites fail startup/entry before business UI/action. No request-time rescue or silent model/provider/resource fallback exists.
7. **Shared runtime:** both thin hosts normalize their browser bootstrap into one SDK runtime and delegate to the same platform, engine, gateway, orchestration, runtime, storage, events, artifacts, communication, and internal Agent Tools session-transport authorities.
8. **Exact graph authority:** `MemberTeamContextBuilder` receives the graph-local `AgentTeamDefinitionService` and the same builder is propagated through root/subteam managers, registries, and new/recovered/task-agent member handles.
9. **No package mutation or data migration:** definitions remain current read-only baseline sources; only explicit sparse host overrides live in existing stores. Selected baseline/preview is not persisted. Valid rows overlay the exact selected definition; invalid rows remain diagnostic state and are not auto-deleted, rewritten, or bypassed.
10. **No user authentication scope:** there is no user/account/login subsystem. Default standalone access remains loopback; explicit non-loopback bind is trusted-network. The runtime callback's bearer capability authorizes one machine-to-process run session and is not user identity.
11. **Native project experience:** application folders retain `pnpm dev`, `pnpm dev:studio`, `pnpm build`, `pnpm validate`, and `pnpm start`, with standalone `dev`/`start` requiring a standalone-enabled, valid package.
12. **Clean cut:** no version suffix in code symbols, manifest-vNext, compatibility alias, package-builder alias, baseline fallback, broad-server fallback, custom builder, mock product mode, second standalone profile model, or second top-level server project is introduced.
13. **Portable package data only:** one recursive schema-aware policy accepts exact runtime-supported token-count/pricing fields and rejects credential/password/authorization/token-value/endpoint/workspace semantics at any depth without logging values.
14. **Existing Agent Tools boundary, route parity, and correct projection:** both hosts register the existing `/mcp/agent-tools/:sessionId` route before static fallback. The run descriptor projects eligible server-owned adapters such as `publish_artifacts` and `send_message_to` plus selected available `ToolOrigin.MCP` tools. Only Studio registers general `/mcp/gateway`, which exposes host-configured MCP-origin tools to external clients; standalone neither exposes it nor inherits Studio MCP state. Runtime-internal tools are outside validation scope.

## Scenario Validation Matrix

Every row has a supported action, system event, or governing package/host contract. Out-of-scope future deployment modes are not counted.

| Case | Product-Reachable Trigger | Spine(s) | Expected End-to-End Outcome | Design Result |
| --- | --- | --- | --- | --- |
| SV-C01 | Developer builds once and consumes the output in Studio and standalone | DS-006, DS-007 | One assembly/validation/digest; both hosts consume unchanged frontend/backend/package bytes; runtime writes stay outside the package | Pass |
| SV-C02 | Studio user imports a valid self-contained package and enters without saving an override | DS-001, DS-012 | Package defaults and provenance are visible; host requirements validate; iframe provider normalizes bootstrap; shared client mounts the business UI | Pass after SV-009 |
| SV-C03 | Operator runs standalone with a valid maintained package and fresh data root | DS-002, DS-011, DS-012, DS-014 | `codex_app_server` / `gpt-5.6-luna` defaults resolve without seeded rows/setup UI; readiness is `RUNNABLE`; `/` mounts; the existing internal Agent Tools route is registered before static fallback and any real tool-dependent run | Pass after bounded CR-013 Local Fix |
| SV-C04 | Operator binds loopback or an explicit trusted-network interface and uses the browser-visible origin | DS-002, DS-008 | Root-relative platform paths resolve from `window.location.origin`; no server bind address or reflected host becomes browser endpoint authority | Pass |
| SV-C05 | Operator supplies invalid package root, missing/ambiguous local ID, or non-standalone selection | DS-002, DS-011 | Current parser/selection authority fails before listen and before partial application initialization; no implicit first app | Pass |
| SV-C06 | Package contains multiple applications and operator selects one standalone-enabled local ID | DS-002, DS-005 | Static/bootstrap/ingress/recovery receive one immutable canonical selected descriptor and expose only that application | Pass |
| SV-C07 | Studio iframe origin/window/application/launch correlation is malformed or unsupported | DS-001 | Studio provider rejects; startup fails; it never falls through to standalone acquisition | Pass |
| SV-C08 | Standalone bootstrap is unavailable, malformed, or contradicts selected identity/readiness | DS-002, DS-012 | Standalone provider rejects; coordinator reaches startup failure; no Studio/mock fallback exists | Pass |
| SV-C09 | Named workspace, tool, definition, runtime, database, or vault platform prerequisite fails | DS-005 | Named lifecycle phase fails truthfully; platform does not become healthy; ingress does not claim application runnable | Pass |
| SV-C10 | Frontend invokes query, command, route, GraphQL, notification, custom WebSocket, or direct agent communication | DS-003, DS-004 | Shared client -> host mount -> exact shared gateway/communication owner -> result/event/socket; host imports no backend business modules | Pass |
| SV-C11 | Backend requests the required package resource and starts a real team run | DS-003, DS-004, DS-012, DS-014 | `requireRunnable` supplies a non-null effective configuration; the existing descriptor/route exposes eligible server tools and selected available MCP-origin tools; handoff/events/artifacts complete through existing authorities | Pass after bounded CR-013 Local Fix; executable rerun required |
| SV-C12 | Host restarts with the same selected application and data root | DS-004, DS-005 | Current schemas open directly; selected known-state intersection recovers bindings/availability/pending events; package remains immutable | Pass |
| SV-C13 | Standalone data root contains dormant state for a previously selected different local application | DS-005 | Recovery activates only `known IDs ∩ {selected canonical ID}`; other records remain dormant and unmodified | Pass |
| SV-C14 | Worker exits after readiness and frontend later invokes or reloads | DS-003, DS-005 | Existing engine/availability owners retain recovery and ensure-ready responsibility; hosts do not create a second restart policy | Pass structurally; executable verification retained |
| SV-C15 | Operator terminates while timers, workers, Agent Tools sessions, notifications, sockets, streams, events, vault, or Prisma are active | DS-005, DS-010, DS-014 | Existing run/member/session cleanup remains authoritative, followed by the established event/vault/Prisma shutdown sequence; route registration introduces no new lifecycle owner | Pass; affected regression retained |
| SV-C16 | Browser requests `/`, relative asset, valid SPA navigation, traversal input, or unknown reserved platform path | DS-008 | Real-path confinement under selected `ui/`; reserved prefix excluded first; only eligible document navigation receives SPA fallback | Pass |
| SV-C17 | Standalone starts with default networking and no account/authentication subsystem | DS-002, DS-008 | Loopback default, no broad Studio CORS, browser WebSocket origin authority equals request host authority; explicit non-loopback is trusted-network operation | Pass |
| SV-C18 | Developer runs `pnpm dev` or `pnpm dev:studio` in starter, Brief, or Socratic | DS-006, DS-011, DS-012 | Checked-in mapping feeds the real pack/validator; maintained leaves package `codex_app_server` / `gpt-5.6-luna`; `dev` runs standalone watch/restart; `dev:studio` uses real Studio reload; no mock/custom builder | Pass in implementation; broader executable rerun remains downstream |
| SV-C19 | Application/template imports Studio, Electron, standalone-host, or server internals | DS-001, DS-002, DS-007 | Static dependency checks reject host coupling; providers remain SDK-owned and the source contains one startup call | Pass |
| SV-C20 | Studio user reloads, exits, or leaves the application route | DS-009 | Reload creates fresh launch generation/document; exit/leave tears down browser resources and restores shell without inventing a runtime run | Pass |
| SV-C21 | Developer builds/validates a standalone-enabled package with an incomplete required leaf default | DS-011 | Pure package validation returns `INVALID_PACKAGE` with slot/member/source details; `build`/`validate` fail and no runnable package is emitted/accepted | Pass after SV-009; corrects the prior false Brief-default premise |
| SV-C22 | Studio user saves an alternate model/runtime override, runs, then resets | DS-009, DS-012 | Override wins and persists separately; package bytes remain unchanged; reset deletes the row and immediately reveals package defaults | Pass after SV-009 |
| SV-C23 | Developer/operator runs `pnpm build`, `pnpm validate`, then `pnpm start` | DS-007, DS-010, DS-011, DS-012 | Validate loads project config and standalone rule; start revalidates existing output, does not repack/watch/mock, and launches only if host-runnable | Pass after SV-009 refinement |
| SV-C24 | Either host prepares refreshed-base platform prerequisites | DS-005, DS-010 | AppConfig/database -> migration -> protected DB/root-key/sidecars -> Prisma -> vault -> app-data migration -> exactly seven tool groups including Search -> definitions/runtimes | Pass; run readiness remains a later DS-012 check |
| SV-C25 | Package default resolution traverses a nested team/member/leaf definition | DS-011, DS-012 | Deterministic package precedence is innermost team default -> outer teams nearest-first -> leaf agent default; all required leaves complete or validation fails | Pass after SV-009 |
| SV-C26 | Studio override exists for member, slot/team, or whole application | DS-012 | Host member override -> host slot/team override -> exact selected-resource definition baseline; effective values retain definition/host provenance and no process-global default participates | Pass after SV-011 refinement |
| SV-C27 | Valid package declares runtime/model unavailable on host or lacks required credential | DS-012 | If the host cannot resolve `codex_app_server`, `gpt-5.6-luna`, or required credentials, platform may remain healthy but application is `HOST_REQUIREMENT_MISSING` before Studio entry/standalone listen/business action; exact diagnostic names owner/input and no Sol/other-model substitution occurs | Pass after SV-009; exact Luna negative path confirmed before SR-005 handoff |
| SV-C28 | Brief backend or SDK attempts launch with missing profile or request-supplied rescue model | DS-003, DS-012 | Boundary rejects before launch; backend uses `requireRunnable(slot)` only; hard-coded resource/request-model/profile-null fallback is removed | Pass after SV-009 |
| SV-C29 | Real package-team member prompt is created in a graph with a distinct definition catalog | DS-013 | Graph-local builder resolves package `team.md`; final member system prompt contains the Team Instruction section; global catalog cannot satisfy it accidentally | Pass after SV-009 |
| SV-C30 | Override changes runtime/model while an inherited `llmConfig` targets another selection | DS-012 | Runtime/model/portable config are overlaid atomically by layer; incompatible inherited config is cleared or rejected and provenance remains truthful | Pass after SV-009 |
| SV-C31 | Studio user saves a shared team for Brief, deletes that shared team through the supported catalog action, then reopens the application | DS-012 | Package baseline remains valid; selected-resource baseline is null because the resource is deleted; saved row remains visible with `savedOverrideState: INVALID`; affected effective config is null; aggregate is `HOST_REQUIREMENT_MISSING` with `HOST_OVERRIDE/SAVED_RESOURCE_UNAVAILABLE`; entry and `requireRunnable` are blocked; explicit Reset deletes the row and reevaluates defaults | Pass after SV-010 |
| SV-C32 | Studio has a saved team-member override whose route or agent identity no longer matches the current selected team topology | DS-012 | Package baseline, current selected-resource baseline, and raw row remain visible for explicit replacement; stale members are diagnosed as `HOST_OVERRIDE/SAVED_MEMBER_TOPOLOGY_STALE`; no member is silently dropped and no baseline runs; replace/reset is required | Pass after SV-010 |
| SV-C33 | Studio user selects an allowed alternate agent/team before any save, then changes selection while a preview is in flight or the resource disappears before PUT | DS-012 | Identity-bound no-write preview returns the exact selected-resource definition baseline or structured invalid-selection issue; stale responses are discarded; Save is blocked pending/invalid; PUT re-resolves and rejects catalog/topology drift without writing/fallback | Pass after SV-011 |
| SV-C34 | Studio edits a saved alternate team, clears a model/runtime field, and encounters homogeneous then mixed inherited member runtimes | DS-012 | Editor inherits only from the selected pre-overlay baseline, omits cleared fields from persistence, reloads after change, preserves per-member values, disables bulk model for mixed runtime, and requires an explicit common runtime before bulk model override | Pass after SV-011 |
| SV-C35 | Developer validates package tuning containing approved token counts/pricing plus nested password, bearer authorization, access-token value, endpoint, or workspace fields | DS-011 | Recursive policy accepts exact typed token-count/pricing inputs; rejects each secret/host-local path as `PACKAGE_FORBIDDEN_HOST_FIELD` without exposing values; no app-specific/compatibility exception | Pass after SV-011 |
| SV-C36 | Fresh standalone Brief creates a real Codex/Luna team run and invokes its selected server-owned Agent Tools | DS-003, DS-004, DS-012, DS-014 | The actual descriptor/`tools/list` exposes eligible `publish_artifacts` and `send_message_to`; the registered route dispatches them under the issued session; writer handoff, lifecycle events, and projected artifacts complete | Pass after bounded CR-013 Local Fix; rerun APIE2E-BRIEF-003/APIE2E-F005 with corrected expectations |
| SV-C37 | Existing internal Agent Tools route receives no bearer, an unknown session, or a request for a tool outside the session projection | DS-014, DS-005 | No bearer reaches the established 401 authorization gate; unknown/unavailable session remains 404; the route cannot expose tools outside the issued descriptor; existing cleanup semantics remain unchanged | Pass after bounded CR-013 Local Fix; focused durable/API route proof required |
| SV-C38 | Studio and standalone compose existing Agent Tools transport while only Studio owns the general external MCP gateway and host MCP configuration | DS-005, DS-014 | Both compositions call the same existing internal route registrar before static fallback; standalone omits `/mcp/gateway` and does not inherit Studio MCP state; no new runtime/ports/path builder/configured-source resolver/publication bridge or application MCP provisioner is introduced | Pass after bounded CR-013 Local Fix; focused composition proof required |

## Reachable Product Use-Case Completeness Audit

| Use Case | Validation Cases | Primary Spine(s) | Result |
| --- | --- | --- | --- |
| UC-001 — Build once, consume in both hosts | SV-C01, SV-C18, SV-C19, SV-C23 | DS-006, DS-007 | Complete |
| UC-002 — Studio entry from package defaults | SV-C02, SV-C07, SV-C09, SV-C27 | DS-001, DS-012 | Complete after SV-009 |
| UC-003 — Studio presentation lifecycle | SV-C20, SV-C22 | DS-009, DS-012 | Complete |
| UC-004 — Standalone start and browser entry | SV-C03, SV-C04, SV-C08, SV-C27, SV-C36, SV-C38 | DS-002, DS-011, DS-012, DS-014 | Complete after bounded CR-013 Local Fix |
| UC-005 — Standalone selection rejection | SV-C05, SV-C06 | DS-002, DS-011 | Complete |
| UC-006 — Host-specific bootstrap normalization | SV-C07, SV-C08, SV-C19 | DS-001, DS-002 | Complete |
| UC-007 — Shared backend operation | SV-C10, SV-C28 | DS-003, DS-012 | Complete |
| UC-008 — Live application communication | SV-C10, SV-C11, SV-C15 | DS-003, DS-004, DS-005 | Complete |
| UC-009 — Real resource and agent/team execution | SV-C11, SV-C25, SV-C26, SV-C28, SV-C29, SV-C36–SV-C38 | DS-003, DS-004, DS-012–DS-014 | Complete after bounded CR-013 Local Fix |
| UC-010 — Storage preparation and migrations | SV-C02, SV-C03, SV-C12, SV-C24 | DS-003, DS-005 | Complete |
| UC-011 — Restart and recovery | SV-C12, SV-C13 | DS-004, DS-005 | Complete |
| UC-012 — Required readiness or worker failure | SV-C09, SV-C14, SV-C27 | DS-005, DS-012 | Complete after SV-009 |
| UC-013 — Standalone root/assets/navigation/boundary | SV-C04, SV-C16, SV-C17 | DS-002, DS-008 | Complete |
| UC-014 — Graceful process stop | SV-C15, SV-C37, SV-C38 | DS-005, DS-010, DS-014 | Complete; no new shutdown owner |
| UC-015 — Native application-folder development | SV-C18, SV-C21 | DS-006, DS-011 | Complete after SV-009 |
| UC-016 — Host-neutral application authoring | SV-C01, SV-C19 | DS-001, DS-002, DS-007 | Complete |
| UC-017 — Local/trusted-network standalone access | SV-C04, SV-C17, SV-C37, SV-C38 | DS-002, DS-008, DS-014 | Complete after bounded CR-013 Local Fix |
| UC-018 — Build, validate, start production | SV-C03, SV-C15, SV-C21, SV-C23, SV-C24, SV-C27, SV-C36, SV-C38 | DS-010–DS-012, DS-014 | Complete after bounded CR-013 Local Fix |
| UC-019 — Reject invalid standalone package | SV-C21, SV-C25, SV-C35 | DS-011 | Complete after SV-011 |
| UC-020 — Studio alternate-resource sparse override and reset | SV-C22, SV-C26, SV-C30, SV-C33, SV-C34 | DS-009, DS-012 | Complete after SV-011 |
| UC-021 — Missing host requirement | SV-C09, SV-C27 | DS-005, DS-012 | Complete after SV-009 |
| UC-022 — Package team prompt semantics | SV-C29 | DS-013 | Complete after SV-009 |
| UC-023 — Invalidated Studio override | SV-C31, SV-C32 | DS-012 | Complete after SV-010 |

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

### SV-009 — Make a standalone-capable package actually runnable and preserve graph-local prompt authority

**Problems found by executable/review evidence:**

1. The design treated a default resource as a runnable launch default. Brief researcher/writer defaults contain `runtimeKind` only, while clean standalone requires `llmModelIdentifier` and fails at the business action.
2. Current configuration/readiness can return `READY` with `launchProfile: null`; runtime validation accepts the null and the SDK/backend can defer failure or rescue it through request/hard-coded values.
3. Studio has persisted overrides but reset does not delete them, and the design did not make package values the explicit baseline/provenance source.
4. `MemberTeamContextBuilder` can escape the selected application graph through `AgentTeamDefinitionService.getInstance()`, so real package team instructions disappear from member prompts.

**Correction:**

- Add `standalone.enabled` to source-only devkit configuration; leave manifest v4 unchanged.
- Add pure `validateStandaloneApplicationPackage({ packageRoot, localApplicationId })` and invoke it from standalone-enabled `build`, project-root `validate`, `dev`, and `start` as appropriate.
- Reject a package unless every required slot has its package-owned resource default and every effective leaf resolves `runtimeKind` plus `llmModelIdentifier`. Update Brief researcher, Brief writer, and the Socratic tutor to the user-confirmed `codex_app_server` / `gpt-5.6-luna` package default.
- Replace the current ambiguous configuration/status boundary with one `ApplicationLaunchConfigurationService` and the tight aggregate states `RUNNABLE`, `INVALID_PACKAGE`, and `HOST_REQUIREMENT_MISSING`.
- Define deterministic package and host-overlay precedence, source provenance, atomic `llmConfig` handling, and host ports for runtime availability, exact model lookup, and credential readiness.
- Make standalone validate application run readiness before listen/static UI; make Studio use the same authority before entry while allowing its wider process to remain healthy.
- Treat current persisted configuration rows as optional overlays, add delete/reset behavior, and never seed/copy package defaults into the database.
- Make business backends consume only `requireRunnable(slot)` and remove Brief hard-coded resource, request-model rescue, and SDK null-profile construction.
- Construct `MemberTeamContextBuilder` from the exact graph-local `AgentTeamDefinitionService` and propagate it through every manager/registry/handle creation/restoration path; add final-prompt semantic coverage using distinct catalogs.

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
- Clean-cut rename the graph-local builder to `ApplicationLaunchResourceBaselineBuilder`; definition baselines use only package/selected-definition provenance, while host provenance appears only after overlay.
- Add `selectedResourceBaseline` to the stored slot view and a closed no-write `ApplicationLaunchSelectionPreview` for unsaved refs. Preview performs no persistence, overlay, host validation, readiness transition, or fallback.
- Bind preview to exact application/slot/ref, discard stale responses, disable save while pending/invalid, refresh after catalog/definition/save/reset changes, and let PUT re-resolve as final concurrency authority.
- Remove the Studio package/effective inheritance heuristic. Clearing a field persists absence and reveals the selected definition baseline.
- Represent mixed runtime explicitly; per-member inheritance remains authoritative until an explicit common runtime enables a bulk model override.
- Add one recursive `ApplicationPortableLaunchConfigPolicy` with closed runtime/root/pricing schemas. Preserve exact token-count/pricing fields and reject actual password/secret/authorization/token-value/endpoint/workspace paths without logging values or adding compatibility/app exceptions.
- Preserve current override rows/schema, three readiness statuses, invalid-row semantics, Codex/Luna defaults, and graph-local prompt authority.

### SV-012 — Withdrawn broad Agent Tools reinterpretation

SV-012 was drafted from `CRR-015`, which incorrectly assumed package `toolNames` should all be MCP gateway tools and pulled unrelated runtime-internal tooling into the application-framework acceptance boundary. That premise led to an unapproved proposal for a new aggregate runtime, port set, publication bridge, readiness phase, base-URL phase, and shutdown authority.

`CRR-016` supersedes that review result. Architecture review of SR-007 was stopped, the broad production drafts were removed, and SV-012 is retained only as chronological evidence. It is not part of the current design authority and must not be implemented.

### SV-013 — Restore the correct Agent Tools projection and narrow CR-013

**Corrected evidence from CRR-016 and reviewed source:**

1. Runtime-internal tools are outside this ticket. Their implementation cannot be used to infer the Agent Tools descriptor from package `toolNames`.
2. `buildDefaultAgentToolMcpAdapterProviders()` already projects eligible server-owned adapters, including `publish_artifacts` and `send_message_to`.
3. `ConfiguredMcpAgentToolSourceResolver` forwards only selected configured `ToolOrigin.MCP` tools that are available in the current registry.
4. Studio already calls `registerAgentToolsMcpRoutes(app)`. Standalone constructs the existing session/descriptor stack but omits only that same registrar, so the advertised path reaches generic 404 instead of the route's established authorization gate.
5. The external `/mcp/gateway` is a different Studio-only integration surface and remains absent in standalone.

**Bounded correction:**

- In `build-standalone-application-server-composition.ts`, import the existing `registerAgentToolsMcpRoutes` and `await registerAgentToolsMcpRoutes(app)` before registering static/SPA fallback.
- Reuse the existing route, session service, catalog, dispatcher, adapters, descriptor issuance, auth semantics, base-URL behavior, and cleanup unchanged.
- Do not infer Agent Tools exposure from package `toolNames`; runtime-internal source and tests remain outside the changed boundary.
- Keep eligible server-owned gateway tools and configured MCP-origin tools governed by the existing descriptor and `tools/list`.
- Do not add a second route, alias, compatibility fallback, external gateway, runtime aggregate, ports, path builder, configured-source resolver, publication bridge, readiness phase, or shutdown owner.
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

## Data-Flow Coverage Check

| In-Scope Concern | Primary / Return Spine | Authoritative Boundary | Result |
| --- | --- | --- | --- |
| Studio launch and presentation | DS-001, DS-009 | Studio host + shared startup coordinator | Complete |
| Standalone launch/root/navigation | DS-002, DS-008 | Selected standalone host + same-origin provider | Complete |
| Shared backend/live execution | DS-003, DS-004 | Gateway/engine/orchestration/runtime/events | Complete |
| Platform readiness/recovery/stop | DS-005 | `ApplicationPlatformLifecycle` and process composition | Complete |
| Native application development | DS-006 | Devkit config/commands and real hosts | Complete |
| One package/two hosts | DS-007 | Existing pack/parser/validator and read-only consumers | Complete |
| Built-package production start | DS-010 | Devkit `start` -> public standalone host API | Complete |
| Standalone package completeness/portability | DS-011 | Pure platform package validator + recursive portable policy reused by devkit | Complete after SV-011 |
| Selected-resource editing/effective launch/readiness | DS-012 | `ApplicationLaunchConfigurationService` view/preview/commands/guard | Complete after SV-011 |
| Package-team prompt semantics | DS-013 | Graph-local definition service and context builder | Complete after SV-009 |
| Internal Agent Tools configured-tool transport | DS-014 with DS-004/DS-005 return/stop | Existing session descriptor, route registrar, catalog, dispatcher, adapters, and cleanup; standalone adds only the missing registrar call | Complete after bounded CR-013 Local Fix |

## Canonical Design-Principles Audit

| Principle / Derived Check | Result | Validation |
| --- | --- | --- |
| Approved behavior and production reality | Pass after SV-014 | BEH-004–BEH-006 incorporate the exact standalone 404/stalled-run evidence while SR-009 clarifies the run-scoped Agent Tools/general-gateway/application-MCP boundary. All architecture-approved launch/edit/prompt behavior remains unchanged. |
| Spine span sufficiency | Pass after SV-013 | DS-014 covers existing authenticated server-tool dispatch, handoff, events, and artifacts. The only missing main-line node is standalone registration of the existing route. DS-011–DS-013 remain complete. |
| Ownership clarity and boundary encapsulation | Pass after SV-014 | Existing session, route, catalog, dispatcher, adapter, and cleanup owners remain authoritative. Standalone composition only exposes the already-owned run route; Studio MCP management/general gateway and deferred application-owned provisioning have distinct meanings. |
| Off-spine support remains subordinate | Pass | Existing bearer auth/redaction, origin gate, descriptors, diagnostics, and cleanup remain unchanged and do not become an alternate orchestrator, user-auth system, or external gateway. |
| Current-schema persisted-data transition | Pass after SV-011 | Valid rows are sparse overlays; invalid rows are preserved diagnostics; computed selected baselines/previews are not stored; reset deletes explicitly; no schema or migration is required. |
| Product-reachability gate | Pass | All 23 use cases and 38 scenarios are supported actions, current failures, or governing contracts. DS-014 is exercised by the maintained Brief real run; marketplace, multi-node, and public-internet modes remain excluded. |
| Clean-cut replacement | Pass after SV-013 | The unapproved runtime/ports/publication drafts were removed. The fix reuses one existing route with no alias, wrapper, compatibility branch, gateway fallback, or second tool system. |
| Interface and semantic tightness | Pass after SV-011 | Manifest baseline, selected baseline, sparse override, and effective configuration are separate; preview is a closed no-write union; definition and host provenance cannot overlap; readiness remains classification/issues only. |
| Existing capability reuse | Pass | Existing Agent Tools session/route/catalog/dispatcher/auth/adapters are composed under one owner; no second MCP/tool system is created. Existing launch/runtime/application owners remain authoritative. |
| Composition-critical dependency control | Pass after SV-013 | No new composition-critical dependency is introduced. The standalone root calls the same existing registrar already used by Studio, before the existing static wildcard. |
| File/folder placement and removal | Pass | One existing standalone composition file changes; the existing route and Agent Tools subsystem stay in place. No new project, runtime, ports, path owner, or cross-layer facade is added. |
| Failure semantics | Pass after SV-011 | `INVALID_PACKAGE` is package-only; `HOST_REQUIREMENT_MISSING` is valid package plus host-local override/capability blocker; `RUNNABLE` means every required slot/leaf can launch. Studio exposes explicit replacement/reset without fallback. |

## Residual Risks And Required Downstream Evidence

1. Implementation coverage must prove standalone calls the existing registrar before static fallback: no bearer reaches the route's 401 gate rather than generic 404, and an unknown/unavailable session retains established 404 behavior.
2. The same composition coverage must prove external `/mcp/gateway` remains absent in standalone.
3. API/E2E must rerun `APIE2E-STANDALONE-MCP-001`, `APIE2E-BRIEF-003`, and `APIE2E-F005` with corrected expectations derived from the actual descriptor and `tools/list`.
4. Fresh-root standalone Brief must prove gateway-owned `publish_artifacts` and `send_message_to`, followed by writer handoff, lifecycle events, projected artifacts, and cleanup. Route presence alone is insufficient.
5. API/E2E must not infer gateway tools from package `toolNames`; runtime-internal tools are not part of its ticket proof.
6. Existing selected-resource, portable policy, invalid override, package defaults, and prompt semantics passed focused coverage and must remain in the affected regression set.
7. `APIE2E-REPO-005` remains an `Unclear` unattributed broad server-suite diagnostic. API/E2E/code review must reconcile it separately; DS-014 does not claim to fix it.
8. Model/runtime credentials remain host requirements. A host without Codex/Luna must produce `HOST_REQUIREMENT_MISSING`, never substitute another runtime/model.
9. Application-owned MCP declaration/provisioning/scoping, optimized distribution, offline dependency packaging, mandatory standalone override UI/CLI, public-internet hosting, user authentication, marketplace isolation, and repository-wide singleton removal remain out of scope.

## Self-Validation Decision

The major architecture remains:

> One immutable application package supplies its complete standalone launch baseline; two thin hosts may overlay host-owned configuration and normalize their ingress, then use one authoritative application-platform runtime and business stack.

The corrected design keeps the established Agent Tools subsystem. The existing internal route carries eligible server-owned tools and selected available MCP-origin tools. Standalone only adds the missing call to the existing registrar, while the general external-client MCP gateway and Studio MCP state remain Studio-only. Application-owned MCP provisioning is deferred. Runtime-internal tooling remains outside the design and validation scope.

All 23 reachable use cases map to DS-001–DS-014 and at least one of 38 validation cases. The design does not require a new readiness status, project, mandatory standalone setup UI, persisted Agent Tools session/baseline/preview, migration, manifest change, user-authentication subsystem, host-specific build, compatibility route, fallback, external gateway expansion, runtime aggregate, port layer, publication bridge, or duplicated server/tool system. `ARCH-REV-006` remains authoritative; the bounded CR-013 fix is ready for `implementation_engineer`. No implementation or API/E2E pass is presumed.
