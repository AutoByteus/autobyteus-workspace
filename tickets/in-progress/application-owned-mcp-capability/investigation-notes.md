# Application-Owned MCP Capability — Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Source investigation complete enough for requirements approval; technical design remains blocked pending approval
- Investigation Goal: Establish the current production spines and exact ownership boundaries needed to add application-owned MCP tools without global registry mutation or cross-application leakage.
- Scope Classification: `Large`
- Scope Classification Rationale: The feature crosses package contracts, application worker protocol, ApplicationPlatformRuntime/ApplicationExecutionScope boundaries, Agent Tools MCP session composition/dispatch, reload/shutdown lifecycle, and durable coverage.
- Scope Summary: Application-owned business tools exposed to same-application Agent/Team executions through the existing shared authenticated Agent Tools MCP host. External SDK distribution and arbitrary package-provided MCP server processes are excluded.
- Primary Questions To Resolve:
  - Where should the application-local tool catalog live relative to package and worker lifecycle?
  - How should an MCP session compose selected platform, configured-global, and application-local routes?
  - How should application tool calls cross into the correct worker with exact ownership and lifecycle guarantees?
  - What static package metadata is required for import-time validation without executing application code?
  - What reload, close, collision, error, and persisted-data behavior is required?

## Request Context

The user explicitly deferred the external developer-facing SDK journey and requested a new Application MCP ticket first. The intended capability is that applications own business-specific tools while global/platform MCP continues to supply common tools.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-mcp-capability`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability`
- Current Branch: `codex/application-owned-mcp-capability`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-mcp-capability`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: fetched successfully on 2026-08-27; `origin/personal=fd9b33e20ace3e7c221f931dbbcd5f4acf1df65f`
- Task Branch: `codex/application-owned-mcp-capability`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`, subject to explicit user delivery instruction
- Bootstrap Blockers: None
- Notes For Downstream Agents: This is a new design-first ticket. Do not reopen the finalized logical-addressing/operation-completion work. Do not fold SDK publishing/externalization into this feature.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/application-owned-mcp-intended-behavior.md` | Intended-behavior contract for the exact meaning of application MCP | Shared-host decision, owner allocation, visibility/collision rules, invocation identity, reload/stale-route behavior, and clean package transition | `requirements.md`; later `design-spec.md` | REQ-001–REQ-017; AC-001–AC-031 | Draft | User approval required with requirements | Present to user; keep aligned after approval |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-27 | Command | `git fetch origin personal` and `git rev-parse origin/personal` | Establish fresh bootstrap authority | Base is `fd9b33e20...`; dedicated worktree created from it | No |
| 2026-08-27 | Code | `autobyteus-server-ts/src/agent-tools/mcp/**` | Identify current MCP host/catalog/session/dispatch owners | One shared host and scoped session authorities exist; configured MCP resolves through the process-global tool registry | Yes |
| 2026-08-27 | Code | `autobyteus-server-ts/src/application-platform/runtime/application-runtime-definition-validator.ts` | Identify current application tool validation | Application-owned agent definitions validate `toolNames` only against the global registry | Yes |
| 2026-08-27 | Code | `autobyteus-application-sdk-contracts/src/index.ts`, `manifests.ts` | Check current application contracts | No application-owned tool declaration or handler exposure exists | Yes |
| 2026-08-27 | Code | `autobyteus-server-ts/src/application-engine/runtime/protocol.ts`, `worker/application-backend-host.ts` | Trace worker boundary | Existing bidirectional protocol can be extended, but has no application tool invocation operation | Yes |
| 2026-08-27 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts`; `agent-run-provisioning-service.ts`; Codex/Claude MCP issuance paths | Trace authoritative application identity into a real session | Application launch creates `ApplicationExecutionContext`; Codex and Claude pass it unchanged into session issuance | No |
| 2026-08-27 | Code | `agent-tool-mcp-session.ts`; `agent-tool-mcp-session-service.ts`; `scoped-agent-tool-mcp-session-authority.ts` | Verify session identity, capability, and lifecycle boundaries | Sessions are immutable route snapshots with scoped issuance/revocation; application context is already carried but unused by the catalog | No |
| 2026-08-27 | Code | `agent-tool-mcp-catalog.ts`; `agent-tool-mcp-tool-route.ts`; `agent-tool-mcp-tool-executor.ts`; `agent-tools-mcp-method-dispatcher.ts` | Identify route composition and execution seam | Only static and configured-global route kinds exist; application route can be added without changing the public MCP endpoint/provider descriptor | No |
| 2026-08-27 | Code | `application-platform/runtime/build-application-platform-runtime.ts`; `application-platform/execution/**`; `create-application-orchestration-services.ts` | Establish platform/scope multiplicity and construction direction | One application execution scope serves the platform lifetime; Studio may host many apps; bundle/controller/store owners exist before scope construction | No |
| 2026-08-27 | Code | `application-platform/runtime/application-platform-lifecycle.ts`; `application-reentry-service.ts`; `application-engine-launcher.ts`; `application-engine-controller.ts` | Trace startup/reload/shutdown and worker ownership | Package scan/readiness precede lazy worker load; reentry stops worker then reloads bundle; tool admission/drain must be inserted explicitly | No |
| 2026-08-27 | Code | `application-bundles/utils/application-manifest.ts`; bundle domain/provider/service; SDK `manifests.ts` | Find import-safe declaration owner and current strict schema behavior | `application.json` is strict, static, copied into generated packages, and read without executing backend code; no tool declaration exists | No |
| 2026-08-27 | Code | `application-engine/worker/application-backend-definition-loader.ts`; `application-backend-host.ts`; SDK `ApplicationBackendDefinition` | Find handler owner and worker validation seam | Backend definition is strict and worker-owned; it can own an exact tool-handler map validated against static package declarations | No |
| 2026-08-27 | Code | `autobyteus-application-devkit/src/package/**`; `validation/**`; maintained `applications/*` manifests/config/backend definitions | Trace source-to-generated contract and maintained proof surface | Devkit copies `application.json`, generates backend bundle metadata, validates strict current contracts, and can regenerate maintained packages | No |
| 2026-08-27 | Code | `application-engine/runtime/application-engine-client.ts`; `json-line-frame-writer.ts`; `application-communication-limits.ts` | Verify completion and transport constraints | Current engine requests await completion without a fixed 30-second deadline; JSON-line transport already has a 4 MiB aggregate writer bound | No |
| 2026-08-27 | Data | `applications/brief-studio/application.json`; `applications/socratic-math-teacher/application.json`; package configs and Agent definitions | Inspect representative current package data | Both maintained apps use manifest v4/backend-definition v6 and select platform tools only; neither declares an application tool | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Agent definition selects `toolNames` | Agent definition -> runtime exposure -> scoped Agent Tools MCP session -> platform/configured-global route | Only registered platform/global tools are available; application packages own none | `application-runtime-definition-validator.ts`; `agent-tool-mcp-catalog.ts` |
| BEH-002 | System | Application-owned Agent/Team launch | application worker capability -> orchestration -> ApplicationExecutionScope -> run/session issuance | Run carries application execution context, but session catalog is still process catalog | `application-engine/runtime/protocol.ts`; `agent-tool-mcp-session.ts` |
| BEH-003 | System | Provider calls a tool over its issued MCP descriptor | provider -> shared MCP endpoint -> authenticated session -> catalog route -> adapter/tool registry -> result | Session authentication, explicit route selection, and revocation already exist | `agent-tools-mcp-host.ts`; `agent-tool-mcp-session-service.ts`; `agent-tool-mcp-tool-executor.ts` |
| BEH-004 | Operational | Application package reload, worker stop, run termination, host shutdown | package/runtime lifecycle and execution-scope lifecycle close their current owners | No application-tool catalog/handler lifecycle currently exists | application platform/engine lifecycle sources, pending full trace |
| BEH-005 | Contract/Operational | Strict package/backend contract plus reentry | static package scan -> readiness -> lazy worker load; reentry stops worker then reloads bundle | Import does not execute app code; no tool-call admission/drain or stale route contract exists | application manifest parser; backend definition loader; lifecycle/reentry sources |
| BEH-006 | Data/Contract | Maintained/imported package plus durable runtime data | generated package schemas are strict; durable app/platform data is stored separately in app/platform SQLite and definition files | Package artifacts are rebuildable; no tool-related database field exists | devkit packer/validators; application storage/binding stores; representative manifests |

## Design Health Assessment Evidence

- Change posture: `Feature` / `Larger Requirement`
- Candidate root cause classification: `Boundary Or Ownership Issue`
- Refactor posture evidence summary: The shared transport/session infrastructure is reusable, but the current process-global catalog cannot become the owner of application-local business tools. A new application-owned catalog/dispatch boundary and session composition extension are likely required.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `agent-tool-mcp-catalog.ts` | Static adapters and configured MCP tools resolve through process catalog/global registry | Direct application registration would create mixed ownership and collision/leakage risk | Define scoped composition contract |
| `agent-tool-mcp-session.ts` | Session already carries `applicationExecutionContext` | Exact application identity can govern route inclusion and dispatch without a run-id locator | Trace all issuance paths |
| `application-backend-host.ts` | Worker owns application business handlers | Application tool handlers should remain worker/application-owned | Define invocation protocol and readiness |
| `application-runtime-definition-validator.ts` | Tool validation is global-registry-only | Application package validation needs a separate application catalog view | Trace package validation lifecycle |

## Relevant Files / Components

Initial inventory; investigation is not closed.

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-host.ts` | Shared MCP transport host | Appropriate shared physical transport | Preserve; do not create unmanaged per-app transport by default |
| `.../agent-tool-mcp-catalog.ts` | Platform/configured-global session tool resolution | Process-owned/global | Must consume an application-scoped resolver rather than own application tools |
| `.../agent-tool-mcp-session-service.ts` | Issues authenticated MCP sessions | Already receives execution context | Candidate composition point for immutable application routes |
| `.../agent-tool-mcp-tool-executor.ts` | Executes a resolved session route | Current availability re-enters shared catalog | Needs exact application route dispatch without global lookup |
| `.../application-runtime-definition-validator.ts` | Validates application-owned Agent/Team definitions | Global tool lookup only and currently lacks application catalog context | Resolve selected names against process tools plus exact application catalog |
| `.../application-engine/worker/application-backend-host.ts` | Loads/executes application business definition | Natural application handler owner | Add one narrow tool handler entrypoint using existing handler context plus caller identity |
| `.../application-engine/runtime/protocol.ts` | Host/worker JSON-RPC contract | No tool operation | Add one host-to-worker tool invocation request/result contract |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | Static package manifest contract | Strict v4 and no tool catalog | Recommended static application-tool declaration owner; current contract must change cleanly |
| `autobyteus-application-sdk-contracts/src/index.ts` | Backend definition/handler contracts | Strict v6 and no application tool type | Add exact handler/result/caller shapes; external publication journey remains out of scope |
| `.../application-engine/services/application-engine-controller.ts` | Exact applicationId-to-attached-worker operations | Created before execution scope and already owns worker request dispatch | Appropriate narrow call dependency for an application-tool gateway; do not expose controller to MCP layers |
| `.../application-orchestration/stores/application-run-binding-store.ts` | Authoritative durable binding read/write | Binding contains application and exact runtime members | Invocation gateway can validate application/binding/producer without global manager lookup |
| `.../application-orchestration/services/application-reentry-service.ts` | Per-application bundle/worker reentry sequence | No tool admission or drain step | Must coordinate application-tool quiesce/drain/reopen around existing stop/reload |

## Runtime / Probe Findings

No runtime probe was required before requirements approval. The current absence and target seams are established from supported production construction and maintained package sources. Real Studio/standalone execution is required downstream after implementation.

## External / Public Source Findings

None required yet. The feature can be designed from current internal MCP and application platform contracts; MCP protocol conformance will be checked against the repository's pinned MCP SDK/spec if needed.

## Reproduction / Environment Setup

- Dedicated task worktree created from fresh `origin/personal`.
- No production source changes or runtime setup performed.

## Findings From Code / Docs / Data / Logs

- Platform/common tools and user-configured MCP tools currently share a process-wide lookup/collision domain.
- Application execution sessions already carry authoritative application execution context.
- Application worker is the existing owner of application business code and lifecycle.
- Application package import remains prebuilt-only and must not execute arbitrary app code merely to discover tools.
- Application definitions currently refer to plain tool names. Requirements choose exact-application routing, reject platform/static collisions, allow cross-application reuse, and give the owning application precedence over configured-global MCP inside its session.
- Application session route tables are already immutable snapshots. A declaration fingerprint can preserve that invariant while failing closed after removal/schema change.
- `ApplicationEngineClient.request()` currently has no local fixed completion timeout. Application tools should reuse completion-coupled semantics and never auto-retry a possibly mutating handler.
- The current platform shutdown stops workers before closing the execution scope. The target must block application-tool admission and drain admitted calls before worker stop while retaining the larger owner order.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: maintained/generated `application.json` and backend definition/bundle artifacts; per-application `app.sqlite`; platform `platform.sqlite`; file-owned Agent/Team definitions; global MCP configuration. Two maintained application sources were inspected.
- Relevant code-model, serialization, semantic, or physical-store change: add package tool declarations and backend handler contract only; no binding, journal, override, application database, Agent/Team definition, or global MCP store field changes.
- Normal readers and writers, including unknown/extra-field behavior: application manifest/backend definition readers are strict and reject unknown fields/versions; devkit regenerates package output from source; database readers do not read package tool fields.
- Representative direct-read or compatibility evidence: both maintained apps are on manifest v4/backend definition v6 and contain no tool declarations. They can be rebuilt from source. Their durable databases and platform binding/journal data are separate from package schema.
- Required semantics and invariants preserved by direct use: `Yes` for durable application/platform/global MCP data; `No` for generated package artifacts once the current package/definition contract changes, so those artifacts are rebuilt rather than migrated.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: global MCP credentials/configuration must remain process-owned; application package must not contain host secrets.
- Concrete benefit, cost, and risk of migration if it remains a candidate: no migration should be introduced without evidence.
- Existing migration framework or lifecycle constraints: application package contract versioning and app.sqlite migrations exist; relevance pending.

## Constraints / Dependencies / Compatibility Facts

- Preserve one shared Agent Tools MCP endpoint and provider-neutral descriptor.
- Preserve current global MCP server configuration and common platform tools.
- Preserve ApplicationExecutionScope and GeneralProcessRunSupervisor separation.
- Avoid a global application-tool registry, applicationId/runId execution-manager router, service locator, or compatibility dual path.
- Do not package secrets or execute application install/build scripts at import.

## Open Unknowns / Risks

- Exact current contract version numbers and file-level transition inventory (design phase).
- Exact JSON-schema subset, MCP result union, and the one application-tool frame-size value (design phase).
- Exact maintained read-only sample tool/name (design phase).
- Complete production/test occurrence inventory and construction/unwind proof (design phase).

## Notes For Architecture Reviewer

No review request yet. The source-grounded requirements basis and intended-behavior supplement are ready for explicit user approval. Architecture design and review remain blocked until approval.
