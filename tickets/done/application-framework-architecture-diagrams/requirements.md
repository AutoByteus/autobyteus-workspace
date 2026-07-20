# Requirements Doc — Application Backend API Gateway Naming And Architecture Guide

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — the user approved `Application Backend API Gateway Service` as the clearer target and explicitly requested the naming refactor in this already-bootstrapped architecture-documentation ticket.

## Goal / Problem Statement

Make the AutoByteus-server boundary to an application's backend API inferable from its name. The current `Application Backend Gateway` / `ApplicationBackendGatewayService` terminology is grammatically valid, but “backend gateway” can be read as a gateway located inside the application backend rather than the server-owned gateway **to** that backend.

Replace it cleanly with `Application Backend API Gateway` / `ApplicationBackendApiGatewayService`, and deliver the Mermaid architecture/data-flow guide that shows the actual browser, server, managed-worker, orchestration, runtime, storage, event, and artifact boundaries.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | Application frontend status/readiness, query, command, GraphQL, and arbitrary route calls cross the AutoByteus-server boundary named `ApplicationBackendGatewayService`. | The same server boundary is consistently named `ApplicationBackendApiGatewayService` and “Application Backend API Gateway” in active source, paths, tests, and docs. | Application lookup/availability checks, request-context scoping, engine invocation, handler results, errors, and every public URL remain unchanged. | `REQ-001`..`REQ-004`, `REQ-006`; `AC-001`..`AC-004`, `AC-006` |
| `BEH-002` | App-defined backend notifications return from the worker through the engine-host listener and current gateway-owned notification stream to the frontend WebSocket. | The notification bridge is described as owned by the Application Backend API Gateway; its precise `ApplicationBackendNotificationStreamService` name remains unchanged. | Notification payloads, WebSocket path, non-durable semantics, fan-out behavior, and stream service API remain unchanged. | `REQ-002`..`REQ-005`; `AC-002`..`AC-005` |
| `BEH-003` | Framework responsibility and data-flow boundaries are spread across source/module docs; the new Mermaid supplement consolidates them but initially used the ambiguous gateway label. | The supplement consistently labels the server boundary `Application Backend API Gateway` and remains aligned with finalized engine/orchestration/worker/event/artifact behavior. | No runtime behavior, API, schema, compatibility policy, or agent/team output streaming is added. | `REQ-005`; `AC-005` |

## Investigation Findings

- `origin/personal` and this ticket worktree resolve to `29912db3b40d0563150d22a4a17e20448e70c997`.
- The current gateway owner is cohesive: it validates active application scope and bundle existence, normalizes app request context, forwards status/readiness/query/command/GraphQL/route operations to `ApplicationEngineHostService`, and bridges engine notifications to `ApplicationBackendNotificationStreamService`.
- The exact old compound symbol/path/title family appears in 20 active tracked files outside ticket history: 18 server source/test/doc files, one SDK README, and one web applications doc.
- The owned source folder contains only the gateway service and its notification-stream concern. Renaming the folder to `application-backend-api-gateway` makes the module boundary inferable while keeping the stream class/file name unchanged.
- The focused unit-test folder/file mirrors the current module name and should move with it. Broader `tests/integration/application-backend/**` names describe application-backend behavior rather than the ambiguous gateway owner and should remain.
- No tracked generated output contains the service name; server `dist/` is ignored and rebuilt from source.
- `ApplicationGatewayService` remains rejected because the owner does not encompass application catalog, setup, iframe hosting, packages, configuration, or every application endpoint.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| [`architecture-data-flow-spines.md`](./architecture-data-flow-spines.md) | Mermaid architecture and data-flow visualization | `REQ-001`..`REQ-005` | `AC-001`..`AC-005` | In-progress approved-target visualization; approval `N/A` | Applies the user-approved owner name to the finalized preserved framework baseline without claiming the rename is already implemented. |

## Design Health Assessment (Mandatory)

- Change posture: `Refactor` plus documentation.
- Initial design issue signal: `Yes`, limited to terminology discoverability.
- Root cause classification: `Shared Structure Looseness` — one ambiguous compound owner name is repeated consistently across code, paths, tests, and docs. The authoritative boundary and responsibilities themselves are healthy.
- Refactor posture: `Likely Needed` and explicitly requested now.
- Evidence basis: service/folder/accessor ownership, REST/WS entrypoints, gateway unit/integration coverage, long-lived module docs, and the user's architecture-reading feedback.
- Requirement or scope impact: clean-cut internal/module naming change only; no behavior, protocol, contract-shape, route, or persisted-data change.

## Recommendations

1. Use `ApplicationBackendApiGatewayService` and `getApplicationBackendApiGatewayService` as the only active service/accessor names.
2. Rename the owned source folder/file and focused unit-test folder/file to `application-backend-api-gateway` / `application-backend-api-gateway-service`.
3. Keep `ApplicationBackendNotificationStreamService` unchanged, but move its file with the renamed owning folder and update imports.
4. Rename the module doc to `application_backend_api_gateway.md`, its title/owner terminology, and all active cross-links/natural-language references.
5. Rename locals/mocks that actually hold or represent the gateway service (`applicationBackendGatewayMock`, `gatewayService`) to API-gateway terminology. Rename the route-wide `sendGatewayError` helper to the neutral `sendApplicationBackendRouteError`, because the REST adapter also uses it for configuration, orchestration-resource, and reload/re-entry routes outside API-gateway ownership.
6. Preserve `application-backends.ts`, application-backend integration-test folder names, `APPLICATION_BACKEND_ROUTE_BASE`, REST/WS URLs, and all SDK contracts because those names describe the backend API subject rather than the ambiguous gateway owner.
7. Retain no alias, forwarding file, duplicate folder, or old/new terminology bridge.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` repository breadth, low behavioral complexity — one cohesive internal owner is renamed across 20 active files plus the new ticket artifacts, with focused unit/integration/API regression coverage already present.

## In-Scope Use Cases

1. A maintainer can identify from source names that the gateway is the AutoByteus-server API boundary to application backends.
2. Existing application frontend requests still reach worker-owned backend handlers and return unchanged results/errors.
3. Existing app-defined backend notifications still return through the gateway-owned WebSocket stream unchanged.
4. An architecture reader can follow module responsibilities and data-flow spines without mistaking the gateway for a worker-owned component.

## Out of Scope

- Changing REST or WebSocket URLs, including the `/backend` path segment.
- Changing request, response, GraphQL, route, readiness, availability, notification, engine, worker, orchestration, storage, lifecycle, or artifact behavior.
- Renaming `ApplicationBackendNotificationStreamService`, application-backend handler/route types, `application-backends.ts`, or broader application-backend integration-test folders.
- Expanding this owner into a generic `ApplicationGatewayService`.
- Adding application-scoped agent/team output streaming.
- Adding backward-compatible aliases or forwarding files.
- Modifying the previously finalized `tickets/done/understand-application-framework` package.

## Functional Requirements

- `REQ-001`: Rename the service class to `ApplicationBackendApiGatewayService` and its singleton accessor to `getApplicationBackendApiGatewayService`.
- `REQ-002`: Rename the owning source folder/file and focused unit-test folder/file to the `application-backend-api-gateway` form; update all active imports, mocks, types, variables, and descriptions that refer to this owner. Keep the route-wide error helper REST-adapter-owned under the neutral `sendApplicationBackendRouteError` name.
- `REQ-003`: Rename the long-lived module document/path/title and every active cross-link or owner reference to `Application Backend API Gateway` / `application_backend_api_gateway.md`.
- `REQ-004`: Preserve existing server gateway behavior and all public REST/WebSocket paths exactly.
- `REQ-005`: Keep the Mermaid architecture/data-flow supplement aligned with the target name and actual finalized framework ownership boundaries; all diagrams must remain valid.
- `REQ-006`: Remove the obsolete current gateway symbol/path/title family without aliases, forwarding files, duplicate folders, or dual terminology in active source/tests/docs.

## Acceptance Criteria

- `AC-001`: Active source exports only `ApplicationBackendApiGatewayService` and `getApplicationBackendApiGatewayService`; the old symbols are absent outside historical ticket evidence.
- `AC-002`: The owned source folder/file and focused unit-test folder/file use `application-backend-api-gateway` / `application-backend-api-gateway-service`; the old equivalents no longer exist.
- `AC-003`: Existing status, readiness, application-scope validation, query, command, GraphQL, route, and notification-bridge unit/integration coverage passes after import/mock renaming.
- `AC-004`: Existing `/applications/:applicationId/backend/**` REST routes, `/ws/applications/:applicationId/backend/notifications`, frontend SDK contracts, payloads, status codes, and errors remain unchanged.
- `AC-005`: Every Mermaid block parses and labels the server boundary `Application Backend API Gateway`; engine/orchestration/worker, lifecycle, artifact, storage, and explicit no-streaming boundaries remain unchanged.
- `AC-006`: A focused active-tree inventory finds no obsolete `ApplicationBackendGatewayService`, `getApplicationBackendGatewayService`, `application-backend-gateway`, `application_backend_gateway`, or owner phrase “Application Backend Gateway,” excluding historical ticket artifacts.

## Constraints / Dependencies

- Clean-cut internal naming refactor; no compatibility alias.
- Work only in `/Users/normy/autobyteus_org/autobyteus-worktrees/application-framework-architecture-diagrams` on `codex/application-framework-architecture-diagrams`.
- The server worktree currently has no installed dependencies; implementation/environment setup and executable test selection belong to downstream owners.
- Ignored `autobyteus-server-ts/dist/` must be rebuilt from source when executable validation requires it; no generated file is checked in for this rename.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: None.
- Required outcome: `Not Affected`.
- Existing data to preserve: all; no persistence code, schema, serialized shape, or stored value changes.
- Unacceptable data loss or corruption: any.
- Availability/rollout constraints: normal code integration only.
- Related IDs: `REQ-004`; `AC-003`, `AC-004`.

## Assumptions

- `Api` is the repository-appropriate TypeScript spelling inside compound identifiers; documentation uses uppercase `API`.
- The target name describes a gateway to the application backend API, not a gateway implemented by the application backend.

## Risks / Open Questions

- No requirement ambiguity remains.
- The main implementation risk is a missed import/mock/doc link after the folder/file move; exhaustive active-tree inventory and compilation/tests address it.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| `REQ-001`..`REQ-003`, `REQ-006` | 1, 4 |
| `REQ-004` | 2, 3 |
| `REQ-005` | 4 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001`, `AC-002`, `AC-006` | Static clean-cut symbol/path/title inventory |
| `AC-003` | Existing gateway unit and integration regression coverage |
| `AC-004` | REST/WS and frontend contract preservation |
| `AC-005` | Mermaid parse and responsibility-boundary validation |

## Approval Status

Approved by the user on 2026-07-20: use `Application Backend API Gateway Service` as the clearer name and implement the refactor in this documentation ticket. The Mermaid supplement is explanatory (`N/A` approval) and must not define new behavior.
