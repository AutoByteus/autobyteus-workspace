# Logical Application-Agent Addressing Transition Inventory

Status: Normative SR-003 implementation and proof supplement. The SR-002 address/role transition remains fixed; SR-003 adds the bounded CRR-003 application-worker completion correction against implemented HEAD `159dd376906374d2caa50251f98d4456f2584328`.

## Add

| Path | Responsibility |
| --- | --- |
| `autobyteus-application-sdk-contracts/src/application-agent-member-address.ts` | external canonical member-address type, parser, predicate |
| `autobyteus-server-ts/src/application-orchestration/domain/application-run-binding-record-codec.ts` | strict current-schema binding record decode/projection |
| `autobyteus-server-ts/src/application-orchestration/domain/application-execution-producer-projector.ts` | strict current-schema producer/context projection |
| `autobyteus-server-ts/tests/architecture/application-agent-addressing-boundaries.test.ts` | old-contract and boundary-bypass occurrence guards |
| `autobyteus-server-ts/src/application-engine/services/application-engine-control-request.ts` | exact definition-load/stop deadline owner; terminate and await worker before timeout failure |
| `autobyteus-server-ts/tests/unit/application-engine/application-engine-client.test.ts` | host correlation survives elapsed time; response/error/write/close settlement |
| `autobyteus-server-ts/tests/unit/application-engine/application-worker-host-bridge-client.test.ts` | nested correlation survives elapsed time; response/error/write/close/new-call settlement |
| `autobyteus-server-ts/tests/unit/application-engine/application-engine-control-request.test.ts` | response/error/deadline/terminate/cleanup state proof |
| `autobyteus-server-ts/tests/integration/application-backend/application-worker-completion-coupling.integration.test.ts` | real outer-worker/nested-host deferred completion and exact return proof |

## Modify — SDK Contracts And Packages

| Path | Exact Change |
| --- | --- |
| `autobyteus-application-sdk-contracts/src/application-agent-bindings.ts` | exact logical address; member/producer role contraction; member address alias |
| `autobyteus-application-sdk-contracts/src/application-agent-events.ts` | smaller producer/address and subject correlation |
| `autobyteus-application-sdk-contracts/src/application-agent-target-url.ts` | canonical root/member URL only |
| `autobyteus-application-sdk-contracts/src/application-agent-communication.ts` | new READY/input address type (wire behavior otherwise fixed) |
| `autobyteus-application-sdk-contracts/src/index.ts` | exports/current capability types; no old union exports |
| `autobyteus-application-sdk-contracts/README.md` | one public logical contract/examples |
| `autobyteus-application-sdk-contracts/tests/application-iframe-contract.test.mjs` | root/member URL/frame contract |
| `autobyteus-application-backend-sdk/src/application-agent-target-address.ts` | union root builder + memberAddress member builder; remove physical-ID selection |
| `autobyteus-application-backend-sdk/src/index.ts` | exact new exports; remove old Team-root helper if separately exported |
| `autobyteus-application-backend-sdk/README.md` | logical examples and authority explanation |
| `autobyteus-application-backend-sdk/tests/application-agent-target-address.test.ts` | canonical/nested/exact membership tests |
| `autobyteus-application-frontend-sdk/src/application-agent-event-validator.ts` | exact new address/producer/event correlation |
| `autobyteus-application-frontend-sdk/src/application-agent-server-frame-parser.ts` | equality by bindingId/memberAddress |
| `autobyteus-application-frontend-sdk/src/application-agent-connection.ts` | use new equality/URL without behavioral change |
| `autobyteus-application-frontend-sdk/src/application-client-transport.ts` | new contract type |
| `autobyteus-application-frontend-sdk/src/application-client.ts` | new contract type |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | new contract forwarding |
| `autobyteus-application-frontend-sdk/src/index.ts` | export only the new schema |
| `autobyteus-application-frontend-sdk/README.md` | document only the new schema and root/member examples |
| `autobyteus-application-frontend-sdk/tests/application-connections.test.mjs` | READY/event/root/member equality and rejection |
| `autobyteus-application-frontend-sdk/tests/application-startup.type-test.ts` | new public shape |

## Modify — Server Production

| Path | Exact Change |
| --- | --- |
| `autobyteus-server-ts/src/application-orchestration/services/application-agent-target-authorization-service.ts` | sole logical resolver; import scope-owned resolved target; own/freeze complete descriptor with address and binding evidence |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | consume descriptor for input and result; remove reload/public reinterpretation |
| `autobyteus-server-ts/src/application-agent-streaming/services/application-agent-stream-runtime-source.ts` | consume only scope-owned `ResolvedApplicationAgentExecutionTarget`; no complete descriptor/public address/binding; exact member filter |
| `autobyteus-server-ts/src/application-agent-streaming/services/application-agent-streaming-service.ts` | carry public address/descriptor without interpretation |
| `autobyteus-server-ts/src/application-agent-streaming/services/application-agent-stream-subscription.ts` | retain complete descriptor for authorization/event evidence, pass only `descriptor.runtime` to scope attach, emit new address/producer/event shape |
| `autobyteus-server-ts/src/application-agent-streaming/domain/application-agent-streaming-models.ts` and `autobyteus-server-ts/src/application-agent-streaming/services/application-agent-stream-event-mapper.ts` | smaller producer type |
| `autobyteus-server-ts/src/application-agent-communication/services/application-agent-communication-service.ts` | new address contract |
| `autobyteus-server-ts/src/application-agent-communication/services/application-agent-communication-session.ts` | READY/input exact address shape |
| `autobyteus-server-ts/src/api/websocket/application-agent-communication.ts` | new URL decoder contract |
| `autobyteus-server-ts/src/standalone-application-host/api/register-standalone-application-websockets.ts` | same address codec/route forwarding |
| `autobyteus-server-ts/src/application-engine/runtime/protocol.ts` | worker capability input/subscription schema |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | remove member role property; standalone application binding producer has no role |
| `autobyteus-server-ts/src/application-orchestration/domain/models.ts` | smaller internal binding/producer types; explicit public projection |
| `autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts` | current codec; current JSON writer; derived physical role constant |
| `autobyteus-server-ts/src/application-orchestration/stores/application-execution-event-journal-store.ts` | current binding/producer projectors for read/write result |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-ingress-service.ts` | smaller producer |
| `autobyteus-server-ts/src/application-orchestration/services/application-published-artifact-relay-service.ts` | smaller producer/context |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | application binding input removes role field |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | construct smaller producer/context |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts` and `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts` | exact current execution-context projection/type; ignore extras |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | construct smaller producer/context from exact Team member |
| `autobyteus-server-ts/src/agent-tools/published-artifacts/publish-artifacts-tool.ts` | exact smaller execution-context projection/use |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publisher.ts` and `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | aligned smaller execution-context type only; no addressing interpretation |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-contracts.ts` | define/export exact readonly `ResolvedApplicationAgentExecutionTarget`; streaming attach accepts it; remove authorization-service import; seven-capability count and all other capability/lifecycle contracts fixed |
| `autobyteus-server-ts/src/application-platform/runtime/create-application-orchestration-services.ts` | exact service type wiring only |
| `autobyteus-server-ts/src/application-engine/runtime/application-engine-client.ts` | remove timeout parameter/default/timer from application correlation; retain exact result/error/write/client/process-close settlement |
| `autobyteus-server-ts/src/application-engine/services/application-engine-controller.ts` | all application-work methods use completion-coupled client request; stop uses the exact control-request owner and retains detach/status/close idempotency |
| `autobyteus-server-ts/src/application-engine/services/application-engine-launcher.ts` | definition load uses the exact control-request owner; retain attach/status and reverse failed-start unwind |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-host-bridge-client.ts` | remove fixed timer; add write-failure cleanup, idempotent close/fail-all, and fail-closed post-close request |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-entry.ts` | on host-stdin close, close bridge before runtime cleanup, catch/settle expected closed-bridge cleanup failure, then exit; normal stop keeps bridge open through response |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | document logical/public vs exact/private boundary |

## Modify — Maintained Applications And Generated Outputs

| Path | Exact Change |
| --- | --- |
| `applications/socratic-math-teacher/backend-src/domain/lesson-model.ts` | build `/tutor` directly; no run-ID target projection |
| `applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts` | Team root `{bindingId,memberAddress:null}` or root helper |
| `applications/socratic-math-teacher/backend-src/services/lesson-artifact-reconciliation-service.ts` | smaller producer construction |
| `applications/brief-studio/backend-src/services/brief-artifact-reconciliation-service.ts` | smaller producer construction |
| `applications/brief-studio/ui/vendor/application-sdk-contracts/application-agent-target-url.d.ts` and corresponding `.d.ts.map` / `.js.map` | regenerate from authoritative contracts package |
| `applications/socratic-math-teacher/ui/vendor/application-sdk-contracts/application-agent-target-url.d.ts` and corresponding `.d.ts.map` / `.js.map` | regenerate from authoritative contracts package |

## Remove

| Symbol / Shape | Replacement |
| --- | --- |
| `ApplicationAgentTarget` union | exact `ApplicationAgentTargetAddress` fields |
| public `target.kind` and Team member target `agentRunId` | `memberAddress: null` or canonical member string |
| `ApplicationExecutionProducerRuntimeKind` | enclosing runtime subject |
| `ApplicationAgentTeamBindingMember.runtimeKind` | enclosing Team binding subject; physical DB constant only |
| `ApplicationExecutionProducer.runtimeKind` | event/binding runtime subject |
| separate `createApplicationAgentTeamTargetAddress` | root builder accepting Agent or Team binding |
| old URL segments `agent-run`, `agent-team-run`, `agent-team-member/<runId>` | `root` / `member/<memberAddress>` |
| raw JSON casts/spreads for affected binding/producer/context | current-schema codecs/projector |
| `ApplicationEngineClient.request(..., timeoutMs = 30_000)` and pending timeout handles | correlation-only `request(method, params)` plus lifecycle control owner |
| bridge-local 30-second `setTimeout`/pending timeout handles | response/error/write/close correlation |
| application-work deadline/timeout error while worker is live | completion-coupled result/error |

## Durable Tests / Fixtures To Update

Exact test families (all old literal occurrences are governed):

- server unit: target authorization, orchestration host, Team root/member input, stream runtime source/subscription, communication session, engine observer barrier/context factory, lifecycle/event journal/recovery, binding store/relay, Brief/Socratic domain/reconciliation/runtime tests;
- server integration: application context capabilities, communication websocket, standalone application server, Brief imported package;
- contracts/backend/frontend SDK tests listed above;
- maintained application unit/integration/browser-equivalent tests whose fixtures contain old address or role fields;
- package parity/integrity and generated-output audits.

Named existing paths include:

- `autobyteus-server-ts/tests/unit/application-orchestration/application-agent-target-authorization-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-orchestration-host-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-team-input-root-dispatch.test.ts`
- `autobyteus-server-ts/tests/unit/application-agent-streaming/application-agent-runtime-source.test.ts`
- `autobyteus-server-ts/tests/unit/application-agent-streaming/application-agent-stream-subscription.test.ts`
- `autobyteus-server-ts/tests/unit/application-agent-communication/application-agent-communication-session.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend/socratic-lesson-target-address.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend/socratic-lesson-target-projection.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend/socratic-runtime-lifecycle.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend/socratic-live-tutor-session.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend/app-owned-launch-request-correlation.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend/brief-artifact-startup-catchup.test.ts`
- `autobyteus-server-ts/tests/unit/application-engine/application-agent-stream-observer-activation-barrier.test.ts`
- `autobyteus-server-ts/tests/unit/application-engine/application-handler-context-factory.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-execution-event-dispatch-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-execution-event-journal-recovery.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-published-artifact-relay-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-run-binding-launch-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-platform/application-platform-runtime-isolation.test.ts`
- `autobyteus-server-ts/tests/unit/agent-tools/published-artifacts/publish-artifacts-tool.test.ts`
- `autobyteus-server-ts/tests/unit/run-history/store/agent-run-metadata-store.test.ts`
- `autobyteus-server-ts/tests/unit/services/published-artifacts/published-artifact-publication-service.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/application-agent-communication-ws.integration.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
- `autobyteus-server-ts/tests/integration/run-history/application-owned-studio-run-model-config.integration.test.ts` — update binding/context/address fixtures; preserve active Application ownership lock, recovery, terminal release, and no post-terminal dispatch.
- `autobyteus-server-ts/tests/unit/application-orchestration/application-run-ownership-service.test.ts` — remove only redundant Team-member role fixture; preserve startup gate, evidence agreement, nonterminal ownership, and terminal release.
- `autobyteus-server-ts/tests/unit/run-history/services/studio-run-model-config-service.test.ts` — remove only redundant Agent producer role fixture; preserve Application-owned active-run rejection and stopped-run edit behavior.

## SR-003 Completion Tests / Fixtures To Add Or Modify

| Path | Action | Exact Proof |
| --- | --- | --- |
| `autobyteus-server-ts/tests/unit/application-engine/application-engine-client.test.ts` | Add | with fake time beyond 30 seconds, a live request remains pending and the exact late response resolves; remote error, frame-write failure, explicit close, child error/close settle/remove exactly once |
| `autobyteus-server-ts/tests/unit/application-engine/application-worker-host-bridge-client.test.ts` | Add | nested capability/action remains pending beyond 30 seconds and exact response resolves; write failure and bridge close reject; close is idempotent; later request fails before write; host-stdin teardown does not hang or leave an unhandled cleanup rejection |
| `autobyteus-server-ts/tests/unit/application-engine/application-engine-control-request.test.ts` | Add | response/error clear deadline; deadline becomes authoritative, closes client, awaits supervisor stop, rejects only after stop; late result cannot win; primary plus cleanup failure preserved |
| `autobyteus-server-ts/tests/integration/application-backend/application-worker-completion-coupling.integration.test.ts` | Add | one real worker application request blocks on a deferred registered host capability, remains unresolved past a bounded test observation, then returns exact inner/outer result without duplicate dispatch |
| `autobyteus-server-ts/tests/unit/application-engine/application-engine-controller.test.ts` | Modify | application query/command/route/GraphQL/event/artifact/WebSocket call the correlation client without a deadline/control helper; stop alone uses control owner and remains idempotent |
| `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` | Modify | exact occurrence/omission rules below; control owner has exactly launcher and controller-stop production importers |
| existing API-REV-001 cold Studio/standalone probes | Rerun, not repository source | RequestHint, cold Brief launch, and standalone Socratic recovery return actual result rather than 30-second HTTP 500; one transcript/input/launch effect; logical address evidence unchanged |

Maintained Brief/Socratic backend/frontend production files are **not** SR-003 Modify paths. Their schemas, random/domain identities, repositories, and UI admission behavior remain as implemented by IR-002; no local timeout, retry, idempotency, or reconciliation patch is allowed.

## Current-Data Proof Fixtures

1. Old binding summary with Team member `runtimeKind` extra -> exact current binding; no write performed.
2. Old pending event with binding/producer `runtimeKind` extras -> exact current envelope; dispatch/ack succeeds.
3. Old Agent run metadata execution context with producer `runtimeKind` extra -> restore context has retained identity/display only.
4. Current write -> summary/producer/context JSON omit application-role fields; physical member role column contains constant.
5. Extra unknown JSON attributes -> ignored only at owned current-schema projection boundaries; missing/invalid retained fields fail closed.

## Architecture Occurrence Guards

Fail if supported source/package copies contain:

- `ApplicationAgentTarget` or `.target.kind` in the application Agent target spine;
- public address target `agentRunId`;
- `ApplicationExecutionProducerRuntimeKind`;
- application member/producer `runtimeKind` fields or values outside the one physical-store constant;
- input/stream consumers reading `descriptor.address.memberAddress` to decide runtime dispatch after authorization;
- host input reloading the binding after descriptor authorization;
- `application-execution-scope-contracts.ts` importing `application-agent-target-authorization-service.ts` or naming `AuthorizedApplicationAgentTargetDescriptor`;
- scope streaming source/attach receiving a complete authorization descriptor, public address, or binding snapshot instead of `ResolvedApplicationAgentExecutionTarget`;
- old URL literals/decoders, compatibility aliases, dual validators, version branches, or old/new address unions.
- `timeoutMs`, timeout handles, `setTimeout`, or a `30_000` request deadline in `application-engine-client.ts` or `application-worker-host-bridge-client.ts`;
- any gateway/REST/application-work controller method importing/calling `application-engine-control-request.ts`;
- any control-request production importer other than `application-engine-launcher.ts` and `application-engine-controller.ts`;
- any Brief/Socratic application-local retry, larger timeout, operation-status, or idempotency workaround added for CR-002.

Positive guards require the exact address, scope-owned resolved-target union, orchestration-owned descriptor containing that union, SDK helper signatures, current-schema projectors, and physical constant writer. SR-003 positive guards require one correlation-only host client request signature, one bridge `close`/fail-all path, one control-request owner, and exactly two governed control importers/calls (definition load and stop). Governed current production and durable-test constructor/literal occurrence sets must be enumerated from the current source tree; an old-symbol-only search is not sufficient.

## Verification Matrix

| Layer | Evidence |
| --- | --- |
| Contracts | typecheck/unit for exact schema, nested address parser, URL round-trip/rejection |
| Backend/frontend SDK | helper, READY/event equality, transport/reconnect tests |
| Server unit | authorization, runtime-only host input dispatch/scope stream attach, producer projection, current-data direct read |
| Server integration | worker capability and actual websocket root/member cases |
| Maintained apps | Socratic tutor logical selection/session; Brief/Socratic publication reconciliation |
| Recovery | binding/event/run metadata restart/reentry with representative old supersets |
| Package | build/devkit regeneration and exact package byte/schema parity |
| Realistic | Studio + standalone launch/input/stream/publication/cleanup |
| Completion unit | fake-time >30 seconds then exact outer/inner result; write/remote-error/close terminals; no pending leak |
| Lifecycle control | definition-load/stop deadline aborts and awaits worker before failure; late response loses |
| Completion integration | real worker plus deferred host capability resolves once through both correlations |
| Cold realistic | exact API-REV-001 Studio RequestHint, standalone Socratic restart, and cold Brief launch return actual result with one effect |

## No-Impact Inventory

- provider composition, scoped Agent Tools MCP authorities, execution-scope owner/lifecycle, seven-capability count, and general/application separation stay unchanged;
- `ApplicationRunOwnershipService`, `StudioRunModelConfigService`, stopped-run validator selection, and terminal ownership release stay unchanged apart from smaller fixtures/projections;
- provider launch/runtime kind, model selection, configuration, worker lifecycle stay unchanged;
- `applications/socratic-math-teacher/backend-src/services/lesson-read-service.ts`, `frontend-src/socratic-tutor-session.js`, and `frontend-src/socratic-runtime.js` already forward/key the target opaquely and require behavior/fixture proof but no production edit;
- maintained application manifests and GraphQL schema/client files retain JSON target fields and do not change;
- provider bootstrap context carriers pass `ApplicationExecutionContext` opaquely and require no source edit;
- binding IDs, Team/Agent run IDs, event ordering, artifact run IDs remain;
- SQLite schema and migration ledger unchanged;
- RootTeamRun-local delegation unchanged.
- public GraphQL/command/route request/response schemas, JSON-RPC frame fields/method names, and frontend transport APIs unchanged by SR-003;
- Brief/Socratic business services, GraphQL schemas, frontend runtime code, repositories, and persisted records unchanged by SR-003;
- application handler/provider/orchestration error semantics remain exact; elapsed-time failure only is removed;
- no operation journal, public idempotency key, cancellation frame, async status endpoint, automatic retry, or migration.
