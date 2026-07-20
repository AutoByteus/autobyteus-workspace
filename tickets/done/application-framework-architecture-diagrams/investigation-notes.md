# Investigation Notes — Application Backend API Gateway Naming And Architecture Guide

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Complete; requirements and design ready for architecture review.
- Investigation Goal: Determine the exact clean-cut rename surface from Application Backend Gateway to Application Backend API Gateway while preserving every production behavior and route.
- Scope Classification: `Medium` repository breadth, low behavioral complexity.
- Scope Classification Rationale: one cohesive owner name spans a two-file source module, route imports, seven focused/broader test files, nine server/SDK/web documentation files, and the new Mermaid guide.
- Scope Summary: architecture supplement plus internal/module naming refactor; no behavioral or persisted-data change.
- Primary Questions Resolved: exact active references; folder/file/test/doc rename breadth; generated-output treatment; preserved API routes and runtime behavior.

## Request Context

The user found `Application Backend Gateway` ambiguous in the architecture diagram. Repository inspection confirmed that it is the exact current source name and means “the AutoByteus-server gateway to an application's backend,” not a worker-owned gateway. The user selected `Application Backend API Gateway Service` as clearer and requested the refactor in the existing documentation worktree.

The prior `understand-application-framework` ticket was already finalized. Its archived package was restored untouched; this task now has its own in-progress artifact folder.

## Environment Discovery / Bootstrap Context

- Project Type: `Git` super-repository.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-framework-architecture-diagrams`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-framework-architecture-diagrams/tickets/done/application-framework-architecture-diagrams`.
- Current Branch: `codex/application-framework-architecture-diagrams`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-framework-architecture-diagrams`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin personal` succeeded; worktree `HEAD` and `origin/personal` both resolve to `29912db3b40d0563150d22a4a17e20448e70c997`.
- Task Branch: `codex/application-framework-architecture-diagrams`, tracking `origin/personal`.
- Expected Base Branch: `origin/personal`.
- Expected Finalization Target: `personal` / `origin/personal`, subject to team delivery and explicit user verification.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The earlier finalized ticket is not part of the change. Work only in the new in-progress folder and active source/tests/docs. Root and server `node_modules` are absent; downstream environment setup must account for that.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/application-framework-architecture-diagrams/tickets/done/application-framework-architecture-diagrams/architecture-data-flow-spines.md` | Mermaid architecture/data-flow guide | Browser/server/worker/orchestration/storage boundaries, request/return/event/artifact flows, and the approved target API-gateway label | `requirements.md`; `design-spec.md` | `REQ-001`..`REQ-005`; `AC-001`..`AC-005` | In-progress approved-target visualization; ten diagrams retained | `N/A` — explanatory visualization, no new intended behavior | Keep synchronized with the pending target source paths/names and validate every Mermaid block. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-20 | Command | `git fetch origin personal`; `git rev-parse origin/personal HEAD` | Verify branch freshness | Both resolve to `29912db3b40d0563150d22a4a17e20448e70c997` | No |
| 2026-07-20 | User clarification | Conversation selecting `Application Backend API Gateway Service` and requesting implementation in this ticket | Establish target terminology and scope authority | Target name approved; naming refactor joins the architecture guide | Design and review |
| 2026-07-20 | Code | `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | Verify current owner and whether “gateway” is structurally valid | Service owns app/bundle/availability admission, request-context scope, engine calls, and engine-notification bridge; boundary is healthy, name is ambiguous | Rename, preserve implementation |
| 2026-07-20 | Code | `src/api/rest/application-backends.ts`; `src/api/websocket/application-backend-notifications.ts` | Trace public entrypoints and boundary dependencies | REST calls gateway for status/readiness/query/command/GraphQL/routes; setup/reload have separate owners; WebSocket uses notification stream directly; public paths contain `/backend` and remain semantically correct | Update imports only; preserve URLs and broader route names |
| 2026-07-20 | Code/Test | `tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts`; three `tests/integration/application-backend/**` gateway consumers; REST prefix/setup tests; package service test | Verify durable coverage and test placement | Unit folder/file mirrors module owner; integration folders describe broader application-backend flows and should not move; existing coverage exercises scope, mismatch rejection, availability, REST/WS, mounted routes, package behavior, and imported app | Rename imports/mocks/local owner variables; move only focused unit folder/file |
| 2026-07-20 | Doc | `application_backend_gateway.md`, module README, communication/engine/orchestration/session/storage/application docs, SDK README, web applications doc | Inventory long-lived terminology and links | Module doc/title/path and nine related docs/cross-links teach current name; all should use API-gateway wording/path | Rename/update docs |
| 2026-07-20 | Command | `git grep -n -I -E 'ApplicationBackendGateway|application-backend-gateway|application_backend_gateway|Application Backend Gateway|getApplicationBackendGateway' -- ':!tickets/**' ':!**/tickets/**'` | Establish exact active blast radius | 20 active tracked files: 18 server, one SDK README, one web doc | Use as removal gate |
| 2026-07-20 | Command | broader search for `backend gateway`, `backendGateway`, `gatewayService`, `sendGatewayError`; `git ls-files` folder/test inventory | Find local/natural-language variants and distinguish unrelated gateways | Relevant service locals/descriptions exist in REST/tests/docs; `sendGatewayError` is instead route-adapter-owned and serves gateway plus configuration/orchestration/reload routes; messaging/MCP/Discord gateways are unrelated | Use API-gateway names only for service representations; use neutral `sendApplicationBackendRouteError` for the shared route helper |
| 2026-07-20 | Command | `git ls-files autobyteus-server-ts/dist/**`; `git check-ignore autobyteus-server-ts/dist/index.js`; dependency-directory checks | Decide generated output/environment treatment | No tracked server dist; dist is ignored; root/server dependencies absent | Build from source downstream after setup; do not add dist |
| 2026-07-20 | Doc | `autobyteus-server-ts/AGENTS.md`; `autobyteus-web/AGENTS.md`; solution-designer `design-principles.md` | Apply repository/test and design rules | Use non-watch Vitest commands; do not stage broadly; keep one authoritative boundary and clean removal | Downstream compliance |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | Contract/System | Application frontend calls status/readiness/query/command/GraphQL/custom route through the platform transport | Frontend SDK/HTTP -> Fastify application-backend route -> `ApplicationBackendGatewayService` -> `ApplicationEngineHostService` -> managed worker handler -> result/error returns through the same boundary | Route `applicationId` is authoritative; active application/bundle required; request context cannot choose another app; public response/error semantics preserved | Gateway service; REST routes; gateway unit/integration tests; module docs |
| `BEH-002` | Contract/System | App backend handler calls `context.publishNotification(...)` while a frontend WebSocket may be subscribed | Worker notification -> engine host listener -> gateway service bridge -> `ApplicationBackendNotificationStreamService` -> application WebSocket -> frontend SDK/UI | App-defined payload; application-scoped fan-out; live/non-durable; absent listeners cause drop; WebSocket path unchanged | Gateway service; notification stream; WS route; REST/WS integration test; communication model |
| `BEH-003` | Documentation | Maintainer reads framework/module architecture | Module docs/source names plus ticket Mermaid guide explain browser -> server API gateway -> engine -> worker and reverse/event paths | Documentation must match real owners, keep the worker behind the server boundary, and preserve explicit streaming exclusion | Current long-lived docs; finalized source; Mermaid supplement |

## Design Health Assessment Evidence

- Change posture: `Refactor` plus documentation.
- Candidate root cause classification: `Shared Structure Looseness` limited to cross-file naming.
- Refactor posture evidence summary: The current API/engine/worker boundary, dependency direction, and responsibilities are coherent. The user cannot infer that from `Backend Gateway`; adding `API` and propagating it cleanly solves the actual clarity problem without architectural expansion.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Gateway service | One cohesive server boundary owns admission/context normalization/engine dispatch/notification bridge | Keep owner and behavior; rename only | None |
| REST route module | Gateway-backed backend API routes coexist with setup/reload routes owned elsewhere | Reject generic `ApplicationGatewayService`; preserve direct specialized owners | Make scope explicit |
| Source folder | Two files: gateway service and gateway-owned notification stream | Rename folder as module boundary; keep stream class precise | Move both files atomically |
| User feedback | Current compound phrase is not inferable | Target name must be visible in code and diagrams | Clean-cut rename |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | Server application-backend API boundary | Class/accessor/file/folder carry ambiguous name | Rename all four; preserve code |
| `autobyteus-server-ts/src/application-backend-gateway/streaming/application-backend-notification-stream-service.ts` | Per-application WebSocket fan-out registry | Class/file already precise; folder conveys owner | Move with folder, do not rename class/file |
| `autobyteus-server-ts/src/api/rest/application-backends.ts` | HTTP route adapter and shared error mapping for gateway-backed plus configuration/orchestration/reload surfaces | Service import/accessor/local names carry gateway terminology, but `sendGatewayError` serves the whole route adapter rather than the gateway owner | Update service representations to API-gateway terms; rename helper neutrally to `sendApplicationBackendRouteError`; preserve paths/mapping |
| `autobyteus-server-ts/src/api/websocket/application-backend-notifications.ts` | Notification WebSocket adapter | Imports stream from owning folder | Update path only |
| `autobyteus-server-ts/tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts` | Focused boundary unit tests | Folder/file/symbol/describe mirror owner | Rename/move atomically |
| `autobyteus-server-ts/tests/integration/application-backend/**` and two REST unit tests | Broader REST/WS/mount/imported-app behavior | Imports/mocks/state locals use old owner; test paths describe application-backend use cases | Update content, keep paths |
| `autobyteus-server-ts/tests/unit/application-packages/application-package-service.test.ts` | Package/reload behavior | Instantiates gateway service locally | Rename import/local variable only |
| `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | Long-lived module authority | Filename/title/paths are old name | Rename to `application_backend_api_gateway.md` and update content |
| Related server/SDK/web docs | Cross-links and architecture prose | Nine active docs reference old name/path/phrase | Update links/prose |
| Ticket Mermaid supplement | Visual architecture authority for this task | Target API-gateway label already applied; links now point to this ticket's core docs | Validate and retain |

## Runtime / Probe Findings

No runtime behavior probe was needed to establish requirements because this is a naming-only refactor and current unit/integration paths are explicit. The worktree has no installed dependencies. Implementation-owner local checks and API/E2E execution must run after environment setup and must not infer behavior change from the rename.

## External / Public Source Findings

None. Repository source and user-approved terminology are authoritative.

## Reproduction / Environment Setup

- Required services for investigation: None.
- Dependencies: absent in this fresh worktree.
- External repositories/artifacts: None.
- Setup commands that affected investigation: `git fetch origin personal` only.
- Cleanup: no temporary runtime state created.

## Findings From Code / Docs / Data / Logs

1. `ApplicationBackendGatewayService` is not a generic platform gateway; it is specifically the server API boundary to application backend handlers.
2. `ApplicationBackendApiGatewayService` is the most precise target among considered alternatives:
   - better than the current ambiguous name;
   - narrower and more truthful than `ApplicationGatewayService`;
   - preserves the established `Gateway` owner concept;
   - clearer than substituting only `TransportService`, because it remains the controlled facade between route adapters and engine host.
3. The source folder and focused unit-test folder should match the target owner so file placement teaches the same architecture as the class name.
4. Public `/backend` paths and general “application backend” subject names remain correct; only gateway-owner terminology changes.
5. No persisted or generated tracked artifact requires transition handling.
6. The route-wide error mapper is owned by `application-backends.ts`, not `ApplicationBackendApiGatewayService`; its target name must remain neutral even though gateway service locals use the approved owner term.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject: None.
- Relevant model/schema change: None.
- Readers/writers: unaffected.
- Required semantics/invariants preserved by direct use: `Yes` — no stored representation changes.
- Decision: `Not Affected`.

## Constraints / Dependencies / Compatibility Facts

- Internal clean-cut rename; no exported SDK contract changes.
- No old-name alias, forwarding file, or duplicate folder.
- REST/WS route paths and notification stream class/API remain unchanged.
- Server dist is ignored and should be regenerated, not committed.
- Historical ticket artifacts are excluded from removal inventories and remain untouched.

## Open Unknowns / Risks

None blocking. Residual implementation risk is mechanical missed-reference drift after moves; compilation, focused tests, docs link checks, and exhaustive inventory are proportionate controls.

## Notes For Architecture Reviewer

- Confirm folder/file/test/doc moves match the one owner rather than over-broadly renaming all application-backend concepts.
- Confirm `ApplicationGatewayService` remains rejected and route/notification contracts remain unchanged.
- Confirm the diagram is explanatory and that no prior finalized ticket package is modified.
