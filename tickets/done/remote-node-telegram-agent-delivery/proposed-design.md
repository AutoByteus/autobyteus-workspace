# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Separated public server URL semantics from colocated managed-gateway internal server URL semantics. | 1 |

## Artifact Basis

- Investigation Notes: `tickets/done/remote-node-telegram-agent-delivery/investigation-notes.md`
- Requirements: `tickets/done/remote-node-telegram-agent-delivery/requirements.md`
- Requirements Status: `Design-ready`

## Summary

Introduce an explicit runtime-only internal server base URL concept for colocated managed child processes. Keep `AUTOBYTEUS_SERVER_HOST` as the public server URL for clients, while the managed messaging gateway receives a separate internal base URL derived from the actual listen host and port of the owning server process.

## Goals

- Fix Docker remote-node managed messaging forwarding without relying on host-mapped public ports.
- Preserve existing public URL semantics for Electron, remote nodes, and absolute URL generation.
- Avoid hardcoding port `8000` so embedded Electron deployments keep working.
- Fail explicitly if the internal server URL cannot be resolved.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the old managed-messaging dependency on `AUTOBYTEUS_SERVER_HOST` for gateway-to-server ingress callbacks.
- Gate rule: design is invalid if it preserves silent fallback from internal URL resolution to the public URL.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Managed messaging uses a colocated internal server base URL for gateway-to-server forwarding. | AC-001 | Remote Docker forwarding no longer fails because of host-mapped public URL usage. | UC-001, UC-003 |
| R-002 | Internal server base URL resolution honors the actual runtime listen port. | AC-002 | Embedded Electron dynamic port works without assuming `8000`. | UC-002, UC-003 |
| R-003 | Public server URL semantics stay unchanged for external clients. | AC-003 | `AUTOBYTEUS_SERVER_HOST` remains public-only. | UC-001, UC-002 |
| R-004 | Internal URL resolution failures block managed messaging startup explicitly. | AC-004 | No silent fallback to a broken public URL. | UC-004 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Server startup parses runtime listen host/port; managed messaging later writes `gateway.env` and starts the colocated gateway process. | `src/app.ts:startServer`, `src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:startInstalledRuntime` | None blocking design. |
| Current Naming Conventions | Public URL config lives in `AppConfig`; managed messaging env generation uses dedicated helper module. | `src/config/app-config.ts`, `src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts` | Need a natural name for the new internal URL resolver/helper. |
| Impacted Modules / Responsibilities | `app.ts` owns startup/runtime bootstrapping; config modules own env resolution; managed messaging env builder owns gateway runtime env materialization. | `src/app.ts`, `src/config/*`, `src/managed-capabilities/messaging-gateway/*` | Whether the internal URL helper should live under `config/` or `managed-capabilities/`. |
| Data / Persistence / External IO | `gateway.env` is persisted for the managed gateway process; the runtime issue comes from a bad URL being written there. | `src/managed-capabilities/messaging-gateway/managed-messaging-gateway-storage.ts:writeRuntimeEnv` | None. |

## Current State (As-Is)

- `AUTOBYTEUS_SERVER_HOST` is the single public URL source of truth for client-facing absolute URLs.
- Managed messaging reuses that same public URL when writing `GATEWAY_SERVER_BASE_URL`.
- In Docker remote-node deployments the public URL can be a host-published port such as `http://localhost:60634`.
- The managed gateway runs inside the same container as the server, so that host-published URL is not reachable from inside the container.
- Result: inbound Telegram reaches the gateway, then dies in the gateway inbox with `fetch failed`.

## Target State (To-Be)

- Server startup resolves a runtime-only internal server base URL from the actual listen host and port.
- The internal base URL is not persisted as a user-facing server setting and does not replace `AUTOBYTEUS_SERVER_HOST`.
- Managed messaging writes `GATEWAY_SERVER_BASE_URL` from the internal runtime base URL only.
- If the internal base URL cannot be resolved, managed messaging start or restore fails explicitly.
- Public client behavior continues to use `AUTOBYTEUS_SERVER_HOST`.

## Shared Architecture Principles (Design + Review, Mandatory)

- Principle alignment statement: design and review both treat public URL generation and colocated runtime reachability as separate concerns.
- SoC cause statement: startup owns runtime listen-address resolution; public config owns client-facing URL semantics; managed messaging env generation owns gateway-specific env materialization.
- Layering result statement: startup provides runtime endpoint facts, config utilities normalize them, and managed messaging consumes them without re-deriving deployment policy.
- Decoupling rule statement: managed messaging must not infer server reachability from client-facing URL configuration.
- Module/file placement rule statement: endpoint-resolution logic belongs in a shared server config/runtime bootstrap module, not inside the managed messaging package.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Add` one shared runtime endpoint helper and `Modify` startup plus managed messaging env generation to use it.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): this is the smallest design that introduces an explicit internal/public URL split in one place and keeps deployment policy testable.
- Layering fitness assessment (are current layering and interactions still coherent under emergent-layering rules?): `Yes`
- Decoupling assessment (are boundaries low-coupled with clear one-way dependency directions?): `Yes`
- Module/file placement assessment (do file paths/folders match owning concerns for this scope?): `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`
- Note: `Keep` is not valid because the current env builder hides a deployment policy bug behind the public config surface.

## Layering Emergence And Extraction Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers (provider selection/fallback/retry/aggregation/routing/fan-out) exists | No | Scope is one runtime-address resolution policy, not repeated provider orchestration. | Keep flat; do not add an orchestrator layer. |
| Responsibility overload exists in one file/module (multiple concerns mixed) | Yes | `managed-messaging-gateway-runtime-env.ts` currently mixes gateway env materialization with public-vs-internal server reachability policy. | Split policy into a shared runtime-endpoint helper. |
| Proposed new layer owns concrete coordination policy (not pass-through only) | Yes | The helper owns normalization of wildcard bind hosts, loopback coercion, and runtime-only env seeding. | Keep the helper. |
| Current layering can remain unchanged without SoC/decoupling degradation | Yes | Only a small helper plus targeted modifications are needed. | Keep current layering, change only the policy location. |

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Repoint `AUTOBYTEUS_SERVER_HOST` itself to loopback for Docker. | Small patch in one deployment path. | Breaks public client URL semantics and does not cover Electron or other launchers consistently. | Rejected | Public URL and colocated runtime URL are different concerns. |
| B | Add a runtime-only internal server base URL resolver and feed managed messaging from it. | Fixes Docker and Electron consistently while preserving public URL semantics. | Slightly more code and one new helper module. | Chosen | This is the clean architectural split. |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `autobyteus-server-ts/src/config/server-runtime-endpoints.ts` | Centralize runtime-only internal server base URL resolution and normalization. | startup, managed messaging env builder, tests | New helper owns policy. |
| C-002 | Modify | `autobyteus-server-ts/src/app.ts` | `autobyteus-server-ts/src/app.ts` | Seed the internal runtime base URL from parsed startup host/port before managed messaging restore. | startup bootstrap | Runtime-only; no `.env` mutation. |
| C-003 | Modify | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts` | same | Write `GATEWAY_SERVER_BASE_URL` from internal runtime URL, not `AUTOBYTEUS_SERVER_HOST`. | managed messaging runtime env | Fail closed if unavailable. |
| C-004 | Modify | `autobyteus-server-ts/tests/unit/managed-capabilities/messaging-gateway/provider-config-normalization.test.ts` | same or split with new resolver test file | Cover internal-base-URL env generation and explicit failure semantics. | unit tests | May add a dedicated new test file if clearer. |
| C-005 | Modify | `autobyteus-server-ts/docs/URL_GENERATION_AND_ENV_STRATEGY.md` | same | Document public URL vs internal colocated runtime URL semantics. | docs | Clarifies future maintenance. |

## Module/File Placement And Ownership Check (Mandatory)

| File/Module | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Server startup bootstrap | `autobyteus-server-ts/src/app.ts` | same | server startup/runtime bootstrap | Yes | Keep | Startup should continue owning parsed runtime listen facts. |
| Managed gateway runtime env builder | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts` | same | managed gateway env assembly | Yes | Keep | Still owns env assembly after policy extraction. |
| Internal runtime URL policy | N/A | `autobyteus-server-ts/src/config/server-runtime-endpoints.ts` | shared server runtime config policy | Yes | Keep | Shared concern across startup and managed capabilities. |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Startup bootstrap | Parse effective host/port and seed runtime-only endpoint facts. | Process runtime facts | Public URL persistence policy | Lives in `app.ts`. |
| Runtime endpoint helper | Normalize and expose internal server base URL. | Wildcard-to-loopback policy, runtime-only env key access | Managed messaging-specific env writing | Shared helper under `config/`. |
| Managed messaging env builder | Materialize gateway runtime env values. | `gateway.env` key assembly | Deployment reachability inference from public URL | Consumes resolved internal URL. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Fallback from internal URL failure to `AUTOBYTEUS_SERVER_HOST` | Looks convenient for older tests and current env builder call sites. | Rejected | Fail managed messaging start explicitly if internal URL is missing. |
| Docker-only env override patch | Small deployment-only workaround. | Rejected | Fix the server-owned runtime policy once in code. |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `src/config/server-runtime-endpoints.ts` | Add | config/runtime bootstrap | Resolve, seed, and read internal server base URL | `seedInternalServerBaseUrl`, `getInternalServerBaseUrlOrThrow`, `resolveInternalServerBaseUrl` | startup args/env -> normalized internal URL | Node `process.env` only |
| `src/app.ts` | Modify | startup bootstrap | Seed runtime-only internal URL from parsed host/port | `startServer()` integration only | parsed options -> runtime env seed | helper module |
| `src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts` | Modify | managed capability config | Assemble managed gateway env with internal server URL | `buildManagedMessagingGatewayRuntimeEnv` | provider config + runtime facts -> gateway env object | helper module, `AppConfig` public URL remains separate |
| tests/docs | Modify | verification/docs | Protect semantics and explain public/internal split | test suites, docs prose | runtime scenarios -> assertions | helper + managed messaging env builder |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: not in scope.
- Non-UI scope: responsibility stays clear across startup bootstrap, runtime config policy, and managed messaging env assembly.
- Integration/infrastructure scope: managed gateway remains a colocated integration concern; only the server callback base URL selection changes.
- Layering note: no new tier is introduced; one helper owns one policy.
- Decoupling check: managed messaging stops depending on client-facing public URL semantics.
- Module/file placement check: the new helper belongs under `config/` because the policy is server-runtime-wide, not messaging-specific.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | N/A | `server-runtime-endpoints.ts` | Describes runtime endpoint facts without overfitting to messaging. | Shared config/runtime helper. |
| API | N/A | `seedInternalServerBaseUrl` | Makes startup ownership explicit. | Runtime-only side effect. |
| API | N/A | `getInternalServerBaseUrlOrThrow` | Makes fail-closed behavior explicit. | Used by managed messaging env builder. |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `managed-messaging-gateway-runtime-env.ts` | Gateway env assembly plus misplaced runtime reachability policy | No | Split | C-001, C-003 |
| `AUTOBYTEUS_SERVER_HOST` | Public URL for external clients | Yes | N/A | N/A |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Keep all URL resolution inside managed messaging env builder | High | Extract shared runtime endpoint helper under `config/` | Change | The policy is server-runtime-wide, not messaging-specific. |

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Change Docker Compose default only | High | Server-owned internal URL resolution in code | Reject shortcut | Would leave Electron and future launchers inconsistent. |
| Hardcode `127.0.0.1:8000` in env builder | High | Resolve from actual runtime host/port | Reject shortcut | Breaks embedded Electron dynamic ports. |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `src/config/server-runtime-endpoints.ts` | process env and startup args only | `app.ts`, managed messaging env builder, tests | Low | Keep it stateless except runtime-only env seeding. |
| `managed-messaging-gateway-runtime-env.ts` | `AppConfig`, runtime endpoint helper | managed messaging service | Low | No reverse dependency back into messaging from helper. |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `startup bootstrap -> config helper -> managed capability config assembly`.
- Temporary boundary violations and cleanup deadline: none.

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Implicit public-URL reuse for managed gateway ingress | Remove `appConfigProvider.config.getBaseUrl()` as the source of `GATEWAY_SERVER_BASE_URL`. | This is the legacy broken behavior in scope. | Unit tests plus Stage 7 scenarios S-001 through S-004. |

## Data Models (If Needed)

- No database schema change.
- One runtime-only env key is added or derived in-process for internal server base URL resolution.

## Error Handling And Edge Cases

- If startup host is wildcard (`0.0.0.0` or `::`), normalize internal base URL host to loopback (`127.0.0.1`).
- If startup host is loopback-like (`localhost`, `127.0.0.1`, `::1`), normalize to `127.0.0.1`.
- If startup host is an explicit concrete host, preserve it.
- If no runtime listen host/port can be resolved, managed messaging start throws an explicit error and does not write a broken gateway env.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001, R-003 | Docker remote inbound delivery | Yes | N/A | Yes | UC-001 |
| UC-002 | R-002, R-003 | Electron embedded dynamic port | Yes | N/A | Yes | UC-002 |
| UC-003 | R-001, R-002 | Managed runtime restore / restart | Yes | N/A | Yes | UC-003 |
| UC-004 | R-004 | Internal URL resolution failure | Yes | N/A | Yes | UC-004 |

## Performance / Security Considerations

- No meaningful performance impact; the resolver runs during startup and managed gateway bootstrap only.
- Keeping the internal URL runtime-only avoids exposing loopback-only addresses as public config.
- Preserving `AUTOBYTEUS_SERVER_HOST` avoids breaking existing absolute URL generation and remote client flows.

## Migration / Rollout (If Needed)

- No data migration.
- Existing managed gateway state is reused.
- On next enable/restart/restore, the server rewrites `gateway.env` with the corrected internal base URL.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | unit | Planned |
| C-002 | T-002 | unit/integration | Planned |
| C-003 | T-003 | unit/integration | Planned |
| C-004 | T-004 | unit | Planned |
| C-005 | T-005 | docs | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-10 | Initial design draft | N/A | Public URL reused for colocated runtime callbacks | Yes | v1 created | Open for review |

## Open Questions

- Whether provider session disconnect state should be surfaced in the same ticket remains intentionally out of scope for the forwarding fix.
