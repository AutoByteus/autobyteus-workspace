# Investigation Notes — Standard Application-Bound Agent Communication

## Investigation Status

`Current through 2026-07-21. Material requirements change, exact two-binding vocabulary, and desktop-only application scope are user-approved. The exact manifest/exposure correction remains; the unsupported paired-mobile credential premise has been removed. Implementation remains blocked pending fresh architecture review.`

## Request Evolution

The initial request asked how application frontends could receive live output from agents or agent teams while preserving the existing durable artifact path. Investigation and user discussion progressed through three models:

1. direct read-only frontend live-output subscription;
2. application-defined WebSocket route → application backend handler → backend event subscription/proxy; and
3. the current approved direction: a framework-standard frontend application-agent connection addressed by an application-bound target, with no mandatory application route/proxy/mapping.

The user explicitly rejected framework-level `assistant` naming. An assistant is only one possible application role. The target subject is application-bound agent communication for an individual bound agent, whole bound agent team, or selected bound team member.

The user approved continuing the standardization/refactor direction on 2026-07-21, confirmed that `ApplicationAgentExecutionBinding` is a misleading third concept that must not exist, and directed solution design to send the package for review after strict data-flow and design-principle validation.

After architecture round 6, the user clarified that application features exist only in the desktop product and have no paired-mobile/phone entry point. That evidence invalidated the temporary premise that application WebSockets should adopt the existing mobile remote-access token mechanism. Architecture review and implementation were stopped; the corrected target exposes no application-client authentication or credential contract.

## Environment / Bootstrap Context

| Item | Value |
| --- | --- |
| Repository mode | Git workspace/super-repository |
| Dedicated task worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming` |
| Ticket branch | `codex/application-agent-streaming` |
| Authoritative base/finalization branch | `origin/personal` |
| Recorded base/HEAD | `534210b9e1dffff6c22855ae89ddb3d2afef5a9b` |
| Ticket artifact folder | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming` |
| Persisted-data decision | `Directly Usable — No Migration` |

Bootstrap commands:

```text
git status --short --branch
git branch --show-current
git rev-parse HEAD
git merge-base HEAD origin/personal
git show HEAD:<path>
```

Because the worktree now contains stopped partial implementation, `git show HEAD:<path>` is the authority for current production source. Worktree files are used only to classify partial salvage/rewrite/discard.

## Requirement-Gap Preservation Handoff

The implementation engineer stopped immediately after the user changed the approved basis.

Preserved state:

- no implementation commit or implementation handoff exists;
- HEAD remains `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`;
- `git diff --stat` reported 146 tracked files changed, 1,224 insertions, and 1,405 deletions, plus extensive untracked source/generated/ticket files;
- partial work includes generic backend WebSockets, iframe/frontend/backend v4 changes, agent-stream contracts/services, terminal lifecycle coordination, engine/worker protocol/host changes, notification/worker renames, REST splits, built-ins, generated/vendor output, documentation, and tests;
- an earlier `pnpm -C autobyteus-server-ts build` passed, but later frontend WebSocket edits were not rebuilt; no focused suite, final generation, or API/E2E work completed;
- dependencies were installed with `pnpm install --frozen-lockfile`.

The partial tree must not be represented as current, reviewed, or fully checked. The replacement design requires file-by-file conformance reconciliation before implementation resumes.

Status evidence was retained in `/tmp/application-agent-streaming-status.txt` during solution redesign.

## Supplemental Task Artifact Inventory

| Artifact | Canonical Path | Purpose / Scope | Status | Approval Applicability | Related IDs |
| --- | --- | --- | --- | --- | --- |
| Application agent communication contract | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-agent-communication-contract.md` | bindings/address, standard desktop frontend connection/fixed URL/wire protocol, exact event projection, backend adapter, lifecycle/failures | design-ready | approved requirements basis | `REQ-001`–`REQ-009`, `REQ-013`–`REQ-017` |
| Application backend WebSocket contract | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-backend-websocket-contract.md` | optional custom desktop frontend connection, exact manifest/exposure authority, route/request/session/handler contract, readiness, frames, ordering, bounds, failures, cleanup | design-ready | approved requirements basis; technical promotion/correction for `DR-010` | `REQ-010`, `REQ-011`, `REQ-015`, `REQ-016`; `AC-010`, `AC-015`, `AC-016` |
| Application communication boundaries | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-communication-boundaries.md` | module boundaries and `DS-001` through `DS-016` | design-ready | approved requirements basis | all |

Superseded supplement:

- `application-agent-streaming-contract.md` was renamed/replaced by `application-agent-communication-contract.md`; the former backend-proxy-only authority must not remain in the package.

Reviewer-owned report:

- `design-review-report.md` records the obsoleted round-7 pass and the latest `Blocked — Requirement Gap` return. `DR-010`'s exact manifest/exposure correction remains; `MP-R6-001`/the mobile premise behind `DR-012` is `Not Reachable` and removed from the active design.

## Authoritative Current-State Source Log (`HEAD`)

### Application binding creation/control

- `autobyteus-application-sdk-contracts/src/index.ts`
- `autobyteus-server-ts/src/application-orchestration/domain/models.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-run-observer-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-recovery-service.ts`
- `autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts`
- `autobyteus-server-ts/src/application-orchestration/stores/application-run-lookup-store.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`

Observed production path:

```text
application handler
→ worker context capability
→ Application Engine Host trusted application scope
→ Application Orchestration
→ execution-resource resolver
→ AgentRun/TeamRun creation
→ ApplicationRunBinding persistence + lookup + lifecycle observation
→ optional initial input
→ ApplicationRunBindingSummary
```

Current `ApplicationAgentExecution` uses one `ApplicationRunBindingSummary` return for `startAgent` and `startAgentTeam`; `sendInput` repeats binding ID plus optional member route/path selectors. The revised contract tightens this into agent/team variants and one address.

### Frontend bootstrap/client/backend gateway

- `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts`
- `autobyteus-application-frontend-sdk/src/application-client.ts`
- `autobyteus-application-frontend-sdk/src/application-client-transport.ts`
- `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts`
- `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts`
- `autobyteus-web/utils/application/applicationHostTransport.ts`
- `autobyteus-web/components/applications/ApplicationIframeHost.vue`
- `autobyteus-server-ts/src/application-backend-api-gateway/services/application-backend-api-gateway-service.ts`
- `autobyteus-server-ts/src/api/rest/application-backends.ts`
- `autobyteus-server-ts/src/api/websocket/application-backend-notifications.ts`

At `HEAD`, iframe contract v3 bootstraps `backendBaseUrl` and `backendNotificationsUrl`. Frontend methods are flat. There is no backend custom WebSocket base or standard agent communication base.

`applicationHostTransport.ts` derives clean HTTP/WS URLs from trusted bound-node endpoints. `ApplicationSurface.vue` builds the bootstrap only after validating the iframe ready signal, so that trusted desktop host point is the correct existing owner for application-scoped direct WebSocket bases. No application authentication field is needed or approved.

`ApplicationBackendApiGatewayService` owns active application checks, application bundle existence, request/response invocation through Engine Host, and notification bridging. Its name is accurate only for managed application backend entry; the new direct agent communication path must not be placed inside it.

### Application manifest, backend bundle, and exposure authority

- `autobyteus-application-sdk-contracts/src/manifests.ts`
- `autobyteus-application-sdk-contracts/src/index.ts`
- `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts`
- `autobyteus-server-ts/src/application-bundles/utils/application-backend-manifest.ts`
- `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts`
- `autobyteus-application-devkit/src/config/application-devkit-config.ts`
- `autobyteus-application-devkit/src/package/backend-bundle-manifest-writer.ts`
- `autobyteus-application-devkit/src/validation/application-root-validator.ts`
- `autobyteus-application-devkit/src/validation/backend-manifest-validator.ts`
- `applications/brief-studio/{application.json,backend/bundle.json}` and Socratic equivalents

Exact `HEAD` findings:

- `ApplicationManifestV3.backend` contains only `bundleManifest`; its UI declares frontend SDK `"3"` and it has no exposure flags.
- `ApplicationBackendBundleManifestV1.supportedExposures` is the one declared backend capability record, currently six booleans: queries, commands, routes, GraphQL, notifications, and event handlers.
- Bundle `sdkCompatibility` independently requires backend definition `"3"` and frontend SDK `"3"`.
- `ApplicationBackendDefinition` uses definition contract `"3"` and carries actual handler declarations.
- `ApplicationBackendExposureSummary` copies the bundle allowlist and adds derived discovered handlers; the worker validates that a disabled bundle flag cannot have a corresponding definition handler.
- Devkit configuration/writer and built-ins write the bundle record; they do not write exposure flags into `application.json`.

Therefore the clean target must preserve the pointer/authority split: application manifest v4 points to the bundle; the current backend bundle v1 record gains the required `webSockets` flag; compatibility becomes v4/v4; definition v4 adds actual `webSocketRoutes`; the summary adds derived route paths. Adding `backend.supportedExposures` to the application manifest would create a second authority and contradict current ownership.

### Native agent/team WebSockets

- `autobyteus-server-ts/src/api/websocket/agent.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts`
- `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `autobyteus-web/services/agentStreaming/protocol/**`
- `autobyteus-web/utils/nodeEndpoints.ts`

Observed native endpoints:

```text
/ws/agent/:runId
/ws/agent-team/:teamRunId
```

They authorize remote WebSocket access, then connect raw runtime IDs to native session handlers. Native commands include send message, interrupt, tool approval/denial, and native UI event payloads. They are useful evidence for transport lifecycle and runtime event breadth but are invalid application boundaries because they lack application binding authorization and expose the native protocol.

### Rejected paired-mobile WebSocket premise

- `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts`
- `autobyteus-server-ts/src/remote-access/domain/models.ts`
- `autobyteus-server-ts/src/api/security/redact-sensitive-url.ts`
- `autobyteus-server-ts/src/remote-access/services/remote-access-auth-service.ts`
- `autobyteus-web/utils/remoteAccess/websocketAuth.ts`
- `autobyteus-web/utils/remoteAccess/authorizedTransport.ts`
- `autobyteus-web/utils/application/applicationHostTransport.ts`

`HEAD` contains a paired-mobile remote-access WebSocket credential mechanism for other product surfaces. The application menu and hosted application UI, however, are desktop-only and have no paired-mobile/phone route. The user's product-reachability clarification is authoritative: those mobile files are evidence of an unrelated capability, not a dependency of application communication.

Consequences:

- `ApplicationRequestContext` continues to contain trusted desktop application ID only;
- application WebSocket bootstrap/client/connection contracts expose no login, token, or credential field;
- standard and custom application adapters validate active application scope, and Orchestration additionally validates same-application binding/target membership;
- the existing mobile security mechanism, its query key, and its coverage are `Not Affected`; and
- address possession is never authorization, but no speculative end-user grant or credential subsystem is introduced.

### Runtime event evidence

- `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts`
- `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts`
- AutoByteus/Codex/Claude converter files recorded in the prior investigation
- task delegation and team communication publishers
- native message types/parsers/mappers

Current normalized runtime events remain broad and may carry provider-derived nested records. Generic JSON serialization cannot enforce provider neutrality. Exact field-by-field projection remains required. The prior architecture review resolved this point with closed 23-agent/4-team maps; the revised contract preserves the closed mapping but renames public completion to neutral `AGENT_RESPONSE_COMPLETED` and removes adapter-specific `subscriptionId` from `ApplicationAgentEvent`.

### Terminal binding writers

- explicit `ApplicationOrchestrationHostService.terminateRunBinding(...)`;
- `ApplicationRunObserverService` observed termination;
- `ApplicationOrchestrationRecoveryService` orphaning.

All are normal supported lifecycle paths. The prior reviewed keyed terminal-transition owner, one-shot lifecycle hub, and listener-before-final-read Orchestration lease remain valid and are reused. The communication/streaming services may not read binding store/hub directly.

### Published artifacts and notifications

- artifact relay/projection/revision services and application handler contract;
- `ApplicationBackendNotificationStreamService` and notification WebSocket adapter.

Artifacts are durable and backend-business-projected. Notifications are live one-way topics. Neither has the semantics needed for bidirectional ordered agent communication. The revised design preserves both and renames the notification fan-out owner to `ApplicationBackendNotificationHub`.

## Current And Target Spine Findings

| Evidence ID | Current Finding | Target Consequence |
| --- | --- | --- |
| `CS-001` | backend request/response spine is healthy | group under backend; preserve |
| `CS-002` | binding creation/control spine is healthy | preserve Orchestration; tighten public binding/address types |
| `CS-003` | notification spine is separate but owner name is unclear | preserve, rename Hub |
| `CS-004` | artifact spine is durable and separate | preserve; filter from live event |
| `CS-005` | native stream is direct/raw-ID/native-protocol | do not reuse |
| `CS-006` | generic app backend WebSocket is absent at HEAD | add optional custom capability |
| `CS-007` | backend live event observation is absent | add advanced adapter over shared Streaming |
| `CS-008` | standard frontend application-agent connection is absent | add direct Communication owner and fixed endpoint |
| `CS-009` | terminal writers do not fan out to proposed consumers | consolidate terminal owner + lifecycle lease/hub |
| `CS-010` | application manifest points to backend bundle; bundle is sole current exposure authority | preserve split; exact manifest-v4/bundle-v1/definition-v4/derived-summary target |
| `CS-011` | paired-mobile WebSocket credentials exist for other product surfaces, but application features have no mobile route | treat mobile credential machinery as `Not Affected`; keep application client desktop-only with no auth surface |

## Partial Implementation Reconciliation Inventory

### Likely retain after conformance review

- field-by-field public projector/event maps and provider fixtures;
- host-side streaming source/subscription/service structure;
- Orchestration authorization lease, lifecycle hub, terminal transition service;
- JSON-line frame writer and backend observer activation barrier;
- generic backend WebSocket transport/session/worker support as optional custom capability;
- `ApplicationBackendNotificationHub`, `ApplicationBackendHost`, route-adapter splits;
- strict v4 propagation scaffolding, built-in/generated update coverage.

### Must rewrite

- public event envelope to remove `subscriptionId` and use `ApplicationAgentEvent`;
- public binding types into individual/team discriminated variants;
- frontend grouping to sibling `backend`, `notifications`, and `agentCommunication`;
- bootstrap transport to include both custom backend and standard agent communication bases;
- manifest partials so the type is truly `ApplicationManifestV4` while bundle-v1 remains the sole seven-flag exposure authority; do not retain a V3 type with v4 nested fields;
- custom WebSocket request normalization so only normalized path, params, business query, sanitized headers, and trusted application scope cross Gateway-to-worker IPC;
- docs/tests that require app-defined WebSocket proxying for the standard agent use case;
- Streaming/Engine APIs so direct network and worker adapters share one exact event owner;
- generic event name `ASSISTANT_COMPLETE` in the application public projection to neutral `AGENT_RESPONSE_COMPLETED`.

### Must add

- standard target-path codec;
- `ApplicationAgentConnection` and browser transport;
- standard agent WebSocket adapter;
- `ApplicationAgentCommunicationService` and per-session state/protocol/input registry;
- strict desktop host bootstrap for fixed standard/custom WebSocket bases;
- direct standard integration/browser coverage.

### Must discard/remove

- any mandatory standard-agent dependency on application backend custom WebSocket route/handler;
- adapter-specific IDs in public event payloads;
- v3/flat API compatibility aliases and obsolete owner files;
- any generated output produced before final source contract stabilizes.

## Material Premise Classifications

| Premise ID | Premise | Classification | Witness / Consequence |
| --- | --- | --- | --- |
| `MP-001` | frontend socket closes while application/target attach is pending | Reachable | normal browser/network close after connect; requires pending cancellation |
| `MP-002` | binding terminates while standard connection is pending or active | Reachable | explicit terminate, observed terminate, recovery orphan; requires lifecycle lease outcome |
| `MP-003` | runtime listener can throw into source dispatch | Reachable | synchronous `subscribeToEvents` callback contract; requires no-throw guard |
| `MP-004` | consumer/network slower than whole-team event source | Reachable | asynchronous finite transport; requires bounds/isolation |
| `MP-005` | event is accepted before later network/IPC write fails | Reachable | synchronous acceptance plus async drain; may leave unseen terminal sequence only |
| `MP-006` | hosted application has a separate end-user identity requiring signed per-target grant | Not Reachable in current contract | request context contains application ID only; do not invent grant subsystem |
| `MP-007` | old released data requires transformation | Not Reachable / not required | feature pre-release and stored fields/semantics unchanged |
| `MP-008` | frontend needs native tool approval/interrupt through standard v1 | Unclear / not approved | exclude; custom/backend APIs remain available |
| `MP-009` | paired-mobile application WebSocket access | Not Reachable / out of scope | application menu/UI exists only in desktop; no mobile route can initiate either application WebSocket plane |
| `MP-010` | application-client access-token collision | Not Reachable | the desktop application client exposes no auth token or reserved credential query namespace |
| `MP-011` | application credential leaking into worker/app/logs | Not Reachable | this capability creates and forwards no application credential; normalized custom business query still crosses only its defined adapter boundary |
| `MP-012` | old six-flag/v3 packages need a compatibility reader | Not Reachable / not required | application feature pre-release, all built-ins/generated packages cut over together; reject rather than default |

## Existing Executable Coverage Inventory

Current relevant suites:

- application backend REST/GraphQL/route/notification integration;
- gateway, Engine Host, Orchestration host/binding launch/observer/recovery units;
- native agent/team stream units;
- SDK iframe/startup/transport units and types;
- web application iframe host/surface/transport tests;
- devkit/bundle/manifest/built-in package tests.

Partial implementation added/modified focused backend WebSocket, streaming, lifecycle, projector, worker, and generated tests, but no API/E2E execution occurred. The API/E2E engineer must independently investigate validity after an approved replacement implementation.

Target coverage must add:

- exact address URL encode/decode for all three targets;
- standard connect/READY/input ack/event/error/close integration;
- direct-session READY/terminal/cancel/transport commit interleavings with paused-event retain/drop and exact SDK callback outcomes;
- direct-path structural assertion excluding Engine Host/worker;
- pending application/attach/terminal races;
- exact neutral public projection and no adapter IDs;
- network/backpressure isolation;
- backend observer reuse;
- exact custom WebSocket path/query/route/readiness/text/binary/early-frame/bounds/worker-network/cleanup coverage plus notification/artifact/native regression;
- exact manifest-v4 → bundle-v1 authority, seven required exposure flags, v4/v4 compatibility, definition-v4 gating, derived-summary, built-in/devkit/generated rejection coverage;
- strict desktop bootstrap/client contracts with no application authentication surface, exact standard target URL derivation, and custom path/business-query normalization;
- realistic browser-equivalent SDK connection behavior.

## Persisted Data Evidence

Decision: `Directly Usable — No Migration`.

| Area | Evidence |
| --- | --- |
| binding data | same binding/application/runtime/member/status fields and meaning; only TypeScript/public naming tightens |
| binding store | current JSON hydration already uses runtime subject; no column/physical format change |
| artifacts | reader/writer/authorization unchanged |
| application DB | application business mapping unchanged |
| new state | connection/session/request/subscription/queue/sequence are memory-only |
| preservation | existing bindings/artifacts/projections remain readable exactly as stored |

Forbidden: DDL, schema migration, replay/checkpoint store, access-grant persistence, compatibility reader, binding rewrite, or data cleanup.

## Material Investigation Commands

```text
git status --short --untracked-files=all
git diff --stat
git show HEAD:<relevant source path>
rg -n "ApplicationRunBinding|startAgent|startAgentTeam|sendInput|agentExecution" ...
rg -n "ws/agent|ws/agent-team|WebSocket" ...
sed -n ... application-iframe-contract.ts
sed -n ... application-client.ts
sed -n ... application-backend-api-gateway-service.ts
sed -n ... api/websocket/agent.ts
sed -n ... agent-stream-handler.ts / agent-team-stream-handler.ts
sed -n ... remote-access-websocket-auth.ts
git show HEAD:autobyteus-application-sdk-contracts/src/manifests.ts
git show HEAD:autobyteus-application-sdk-contracts/src/index.ts
git show HEAD:autobyteus-server-ts/src/application-bundles/utils/application-backend-manifest.ts
git show HEAD:autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts
git show HEAD:autobyteus-web/utils/application/applicationHostTransport.ts
git show HEAD:autobyteus-web/utils/remoteAccess/{authorizedTransport,websocketAuth}.ts
git grep -n "ApplicationBackendBundleManifestV1\|supportedExposures\|access_token" HEAD -- ...
```

No internet research was required; the question is repository-specific and current source is authoritative.

## User-Approved Exact Direction

The approved clean-cut choices are:

1. frontend API: `applicationClient.agentCommunication.connect(address)`;
2. returned type: `ApplicationAgentConnection`;
3. exactly two binding types: `ApplicationAgentBinding` and `ApplicationAgentTeamBinding`; mixed-result APIs spell their explicit union and no `ApplicationAgentExecutionBinding` exists;
4. fixed target URL suffixes under `/ws/applications/:applicationId/agent-communication`;
5. sibling frontend groups `backend`, `notifications`, and `agentCommunication`;
6. standard v1 supports input + provider-neutral events, but not native approval/interrupt/binary commands;
7. generic backend WebSockets and backend event subscriptions remain optional advanced capabilities;
8. no signed/persisted frontend target grant in v1 because no current user identity contract exists.

No open user requirement question blocks fresh architecture review.

## Architecture Round-5 Design-Impact Investigation

The architecture reviewer recorded `DR-009`–`DR-011` in [`design-review-report.md`](./design-review-report.md). No user clarification was required.

### `DR-009` — reachable direct-session commit gap

The reviewed sequence returned a Streaming subscription as active before Communication wrote `READY`. Binding terminal is produced by the supported explicit-terminate, run-observer, and recovery paths, so a terminal callback can reach the paused interval through normal production execution. The corrected target uses:

- `ACTIVE_PAUSED` Streaming state with one accepted-event FIFO and disabled drain;
- one `ApplicationAgentCommunicationSession` synchronous transition serializer for READY, terminal, client/abort close, and transport failure;
- a no-`await` READY write/open/enable-drain commit;
- exact SDK `ready`/`onError`/`onClose`/close-reason mapping; and
- retain-on-READY versus drop-on-any-other-winner pre-ready event disposition.

No new service, persistence, or second event queue is introduced.

### `DR-010` — missing custom WebSocket authority

Authoritative `HEAD` confirms there is no generic custom application-backend WebSocket capability. The following stopped partial files were inspected only as candidate/evidence input, not behavior authority:

- `autobyteus-application-sdk-contracts/src/application-websockets.ts`;
- `autobyteus-application-frontend-sdk/src/application-backend-websocket-connection.ts`;
- `autobyteus-application-frontend-sdk/src/application-backend-websocket-transport.ts`;
- `autobyteus-server-ts/src/api/websocket/application-backends.ts`;
- `autobyteus-server-ts/src/application-backend-api-gateway/websockets/application-backend-websocket-session-service.ts`;
- `autobyteus-server-ts/src/application-engine/worker/application-websocket-session-registry.ts`;
- `autobyteus-server-ts/src/application-engine/worker/application-backend-host.ts`; and
- `autobyteus-server-ts/src/application-engine/worker/application-backend-definition-loader.ts`.

Material candidate findings retained in the normative supplement are the typed text/binary frame, fixed route mount, reserved readiness, Gateway/Engine/Backend Host ownership, backend `webSocketRoutes`, `open(request, session, context)`, process-boundary limits, and correlated cleanup. The target corrects or completes candidate gaps by defining deterministic non-ambiguous route validation, trusted request context, rejection of raw early inbound frames, bounded backend-early outbound ordering after READY, serialized handler delivery, exact frontend errors, and first-cause cleanup.

### `DR-011` — exact public binding surface

The common binding-field shape remains useful source composition but is now private/non-exported. Only `ApplicationAgentBinding` and `ApplicationAgentTeamBinding` are exported. Mixed return types spell their union. Type/export tests must fail if `ApplicationAgentBindingBase`, `ApplicationAgentExecutionBinding`, or `ApplicationRunBindingSummary` is publicly reachable.

## Architecture Round-6 And Post-Review Requirement Correction

The architecture reviewer resolved `DR-009` and `DR-011`, found `DR-010` substantially complete but internally inconsistent only at manifest authority, and opened `DR-012` from an assumed paired-mobile remote-access requirement. The user then supplied material product-reachability evidence: application features are desktop-only. That clarification made the `DR-012` premise `Not Reachable`, obsoleted the subsequent pass, and returned the package to solution design.

### `DR-010` remaining — manifest/exposure authority

The stopped partial source used an `ApplicationManifestV3` type with frontend SDK `"4"`, left the backend bundle at V1, and added `webSockets` to the bundle exposure record. The supplement incorrectly described a nonexistent nested `backend.supportedExposures` on “Manifest v4.” `HEAD` evidence proves the correct owner chain: application manifest pointer → backend bundle capability declaration → backend definition handlers → derived exposure summary.

The corrected target names `ApplicationManifestV4`, keeps its backend field as the bundle pointer only, keeps `ApplicationBackendBundleManifestV1.supportedExposures` as the single authority with seven required booleans, declares exact v4/v4 compatibility, uses backend definition v4 for actual routes, and derives `webSocketRoutes` into the summary. The pre-release cutover rejects missing/stale fields and adds no compatibility reader.

### `DR-012` / `MP-R6-001` — obsolete / not reachable

The repository does contain a complete paired-mobile WebSocket credential contract, but no supported application path can reach it. The earlier design mistakenly generalized that unrelated capability into this ticket. The corrected target removes application credential selection/injection, reserved query behavior, collision rules, mobile error cases, and mobile coverage from every active artifact.

The remaining boundary is simpler and product-aligned:

- trusted desktop web host: application ID and fixed standard/custom/notification bases;
- frontend SDK: standard target-path encoding or distinct custom path/business-query construction;
- standard adapter: active application scope plus delegation to Communication/Orchestration;
- custom adapter/Gateway/Engine/worker: active application/exposure validation and normalized custom request.

Existing platform/network security remains unchanged and outside the application contract.

## Documentation Validation Status

Completed for the revised solution-designer-owned package:

- reciprocal relative links resolve and the superseded `application-agent-streaming-contract.md` file is absent;
- `REQ-001`–`REQ-017`, `AC-001`–`AC-017`, `BEH-001`–`BEH-010`, `UC-001`–`UC-007`, and `DS-001`–`DS-016` are continuous/unique in their governing artifacts;
- Markdown backtick/tilde fences are balanced and artifact files have final newlines/no trailing whitespace;
- every use case is mapped to its applicable primary, return/event, and bounded-local spines; preserved notifications and durable artifacts retain independent complete spines;
- all 24 current Mermaid blocks parsed/rendered with `@mermaid-js/mermaid-cli` 11.9.0 after replacing the obsolete credential diagram with the desktop-only access-boundary view; evidence is under `/tmp/application-agent-communication-mermaid-desktop/out-v2`;
- focused searches confirmed the standard API/path/binding/event names are consistent, no exported `ApplicationAgentBindingBase`, `ApplicationAgentExecutionBinding` definition, or duplicate `ApplicationAgentConnectionInput` remains, and adapter IDs are absent from `ApplicationAgentEvent`;
- the round-5 correction audit confirms the Communication-owned READY commit, exact four-state SDK mapping, pre-ready event retain/drop, and every required custom-WebSocket frontend/backend/readiness/frame/route/bounds/failure/cleanup contract element are present;
- the round-6 audit confirms one exact `ApplicationManifestV4 → ApplicationBackendBundleManifestV1 → ApplicationBackendDefinition v4 → derived summary` authority chain, with no nested application-manifest exposure and no six-flag fallback;
- the post-review scope audit confirms desktop-only application reachability, no application-client authentication surface, no paired-mobile credential behavior, and unchanged external platform/network security;
- the design-principle audit passed approved-behavior, spine-span, ownership, authoritative-boundary, reuse, empty-indirection, shared-structure, clean-removal, persisted-data, and reachability checks;
- the redundancy audit assigns one owner to target authorization, public projection, event buffering, target-path coding, custom path/query normalization, exposure declaration, terminal coordination, and public contracts; it explicitly forbids an artificial authentication composer, exposure copies, adapter mapping, a second server event FIFO, parallel input DTOs, and superseded standard/custom proxy paths;
- migration assertions consistently state `Directly Usable — No Migration` and prohibit DDL/replay/checkpoints/grant persistence;
- no source/build/test command was run by solution design because the preserved dirty implementation is intentionally stopped and stale.

The dirty source status is preserved unchanged apart from solution-designer-owned ticket artifacts. Repository-wide `git diff --check` is not used as a claim about the stopped implementation; downstream reconciliation must validate source after the replacement design is approved.
