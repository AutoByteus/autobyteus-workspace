# Design Spec: Iframe Launch Id Contract Refactor

## Current-State Read

The current hosted-application path is already app-owned rather than session-owned, but the naming still says "launch instance". On the web side, `ApplicationShell.vue` requests a host launch, `applicationHostStore.ts` ensures the backend is ready and creates a per-route/reload `launchInstanceId`, `ApplicationSurface.vue` owns the host-side iframe bootstrap lifecycle, and `ApplicationIframeHost.vue` bridges raw iframe URL/postMessage traffic. In the child iframe, `startHostedApplication(...)` parses the launch hints, emits ready, validates the bootstrap payload, creates an app client, and hands off to app UI. Backend calls then flow through the app client, REST gateway, engine host, and worker into app handlers.

The id currently appears in too many places for its true meaning:

- URL query: `autobyteusLaunchInstanceId`
- ready payload: `{ applicationId, launchInstanceId }`
- bootstrap payload: `launch { launchInstanceId }`
- bootstrap request context: `requestContext { applicationId, launchInstanceId }`
- app client fallback request context
- route transport header: `x-autobyteus-launch-instance-id`
- REST header/query/body normalization
- server gateway/worker handler context
- host technical-detail UI and docs/samples/tests/generated vendors

This is a boundary problem: iframe bootstrap correlation belongs to the iframe bootstrap boundary, while durable backend business context belongs to the application backend boundary. The target design must preserve stale-iframe protection while removing the mixed-level dependency where backend business request context depends on iframe bootstrap internals.

## Intended Change

Replace the old `launchInstanceId` public contract with a single iframe-scoped field named `iframeLaunchId`, bump the iframe contract to v3, bump frontend SDK compatibility to `"3"`, and narrow `ApplicationRequestContext` to durable `{ applicationId }` only.

Target bootstrap payload shape:

```ts
export type ApplicationBootstrapPayloadV3 = {
  host: { origin: string }
  application: {
    applicationId: string
    localApplicationId: string
    packageId: string
    name: string
  }
  iframeLaunchId: string
  requestContext: { applicationId: string }
  transport: ApplicationHostTransport
}
```

Target ready/hints shape:

```ts
export type ApplicationIframeLaunchHints = {
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V3
  applicationId: string
  iframeLaunchId: string
  hostOrigin: string
}

export type ApplicationUiReadyPayloadV3 = {
  applicationId: string
  iframeLaunchId: string
}
```

## Terminology

- `iframeLaunchId`: ephemeral iframe-load/bootstrap correlation id owned by the host iframe bootstrap flow. It is not a session, app instance, run, backend worker id, or business id.
- `applicationId`: durable application identity and the only normal application backend request-context identity.
- `frontendSdkContractVersion`: package compatibility gate for hosted frontend startup/runtime SDK compatibility.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove public v2/`launchInstanceId` iframe contract shapes, old query/header names, duplicated bootstrap `launch` object, iframe id in `ApplicationRequestContext`, and host UI launch-instance detail exposure.
- Treat removal as first-class design work: the new v3 contract must reject old public shapes rather than accepting both.
- Decision rule: the design is invalid if it depends on compatibility aliases, dual validators, old query names, old request-context fields, or retained legacy fallback branches for in-scope behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User enters an application route | Hosted app UI receives validated bootstrap and app client | `ApplicationSurface.vue` host side; `startHostedApplication(...)` child side | Main iframe bootstrap path where `iframeLaunchId` must remain safe and unambiguous. |
| DS-002 | Primary End-to-End | Hosted app UI calls query/command/GraphQL/route | Application backend handler receives context | `ApplicationBackendGatewayService` and worker runtime | Ensures backend request context contains durable app identity, not iframe correlation. |
| DS-003 | Primary End-to-End | Application package manifest is parsed | Package accepted/rejected for hosted frontend compatibility | Application bundle manifest parsers | Prevents old v2 vendored frontends from entering an incompatible v3 host bootstrap path. |
| DS-004 | Return-Event | Child iframe posts ready | Host accepts or ignores/fails before bootstrap delivery | `ApplicationIframeHost.vue` + `ApplicationSurface.vue` | Stale iframe safety depends on matching source/origin/application/id. |
| DS-005 | Bounded Local | Sample package build scripts run | Runtime UI/vendor/dist package outputs refreshed | Sample build scripts | Generated committed artifacts must match hand-authored SDK/source changes. |

## Primary Execution Spine(s)

- DS-001: `ApplicationShell -> applicationHostStore -> ApplicationSurface -> ApplicationIframeHost -> startHostedApplication -> Application client handoff`
- DS-002: `Application client -> frontend mount transport -> REST application backend routes -> ApplicationBackendGatewayService -> ApplicationEngineHostService / worker runtime -> app handler`
- DS-003: `Package manifest file -> manifest parser -> compatibility gate -> application registry/provider`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A route visit/reload creates a fresh `iframeLaunchId`, appends it to the iframe URL, waits for a matching ready signal, then delivers one matching bootstrap payload. | Route shell, host launch state, host bootstrap owner, iframe bridge, hosted startup owner | `ApplicationSurface.vue` for host lifecycle; `startHostedApplication(...)` for child lifecycle | URL hint composition, origin normalization, transport URL construction, timeout/retry. |
| DS-002 | Once the app is bootstrapped, app API calls carry only `{ applicationId }` through the platform backend boundary into app handlers. | App client, REST gateway, gateway service, engine host/worker, app handler | `ApplicationBackendGatewayService` and worker runtime | Route/header/query normalization, route app-id authority, notification stream. |
| DS-003 | Package manifests declare frontend SDK compatibility `"3"`; parsers reject old `"2"` packages instead of trying to bridge old bootstrap code. | Manifest files, parser utilities, package provider/registry | Application bundle manifest parsers | Sample build script generation, docs/tests for unsupported versions. |
| DS-004 | The child iframe's ready event travels back to the host; host checks source window, expected origin, app id, and `iframeLaunchId` before creating/delivering bootstrap. | Child ready payload, iframe bridge, host bootstrap owner | `ApplicationIframeHost.vue` + `ApplicationSurface.vue` | Console diagnostics, unsupported version errors. |
| DS-005 | Sample build scripts copy newly built SDK dist into sample UI vendors and dist importable packages. | SDK dist, sample source, runtime UI, importable package | Sample build scripts | Build order and generated-file review. |

## Spine Actors / Main-Line Nodes

- `ApplicationShell.vue`: route phase owner that initiates a host launch after setup is ready.
- `applicationHostStore.ts`: host launch preparation and generation owner; creates the ephemeral iframe launch id after backend readiness.
- `ApplicationSurface.vue`: authoritative host-side iframe bootstrap lifecycle owner.
- `ApplicationIframeHost.vue`: internal raw iframe bridge for URL, load, ready-message validation, and postMessage.
- `startHostedApplication(...)`: authoritative child-iframe startup owner.
- `createApplicationClient(...)` / frontend mount transport: app UI backend invocation boundary.
- `registerApplicationBackendRoutes(...)`: REST transport entrypoint; route app id remains authoritative.
- `ApplicationBackendGatewayService`: backend gateway owner and app-id validation boundary.
- Worker runtime: creates app handler contexts.
- Manifest parsers: compatibility-gate owners.

## Ownership Map

- `@autobyteus/application-sdk-contracts` owns the canonical v3 iframe payload/query names, validators, creation helpers, `ApplicationRequestContext`, and frontend SDK compatibility constant.
- `autobyteus-application-frontend-sdk` owns child startup sequencing and public app client context behavior.
- `autobyteus-web` owns host route-visit/reload launch lifecycle and iframe bridge UI behavior.
- `autobyteus-server-ts` owns platform backend admission and app handler context construction.
- Sample build scripts own generated sample vendors and importable package outputs.

`ApplicationIframeHost.vue` is a thin internal bridge. It must not become the governing launch owner; lifecycle decisions stay in `ApplicationSurface.vue`.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pages/applications/[id].vue` | `ApplicationShell.vue` | Route entry wrapper. | Host launch or iframe bootstrap state. |
| `ApplicationIframeHost.vue` | `ApplicationSurface.vue` | Raw iframe/postMessage bridge. | Retry, timeout, reveal, or bootstrap lifecycle authority. |
| `createApplicationClient(...)` | Frontend SDK transport + backend gateway | Public app UI convenience wrapper. | Iframe launch identity or backend business identity beyond `applicationId`. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `APPLICATION_IFRAME_CONTRACT_VERSION_V2` public hosted iframe contract usage | Breaking payload/query rename. | `APPLICATION_IFRAME_CONTRACT_VERSION_V3` in `application-iframe-contract.ts`. | In This Change | Do not keep v2 validators/aliases for hosted iframe behavior. |
| `APPLICATION_IFRAME_QUERY_LAUNCH_INSTANCE_ID = "autobyteusLaunchInstanceId"` | Misleading public query name. | `APPLICATION_IFRAME_QUERY_IFRAME_LAUNCH_ID = "autobyteusIframeLaunchId"`. | In This Change | Old query should not parse as valid v3. |
| Bootstrap `launch { launchInstanceId }` | Duplicates the same id and keeps old wording. | Bootstrap top-level `iframeLaunchId`. | In This Change | Avoid nested `launch` object unless implementation proves a stronger codebase convention. |
| `requestContext.launchInstanceId` | Backend business context should not carry iframe bootstrap internals. | `ApplicationRequestContext { applicationId }`. | In This Change | Applies to SDK, frontend, REST, gateway, worker, tests, docs. |
| `x-autobyteus-launch-instance-id` special route header and `launchInstanceId` query fallback | No active backend business consumer; would keep iframe correlation in backend context. | No replacement. | In This Change | App-authored custom route query/header values remain possible as normal app data, not platform context. |
| Host technical-detail `Launch instance id` item/localization | Misleads users toward app-instance semantics. | No host UI detail; diagnostics may use iframe wording in logs. | In This Change | Remove EN/ZH localization keys if unused. |
| Sample committed vendors/dist built from v2 SDK | Generated outputs would remain incompatible/stale. | Refreshed v3 sample build outputs. | In This Change | Large generated diff expected. |

## Return Or Event Spine(s) (If Applicable)

DS-004 return/event flow:

`startHostedApplication -> post ready({ applicationId, iframeLaunchId }) -> ApplicationIframeHost source/origin/version validation -> ApplicationSurface descriptor match -> bootstrap envelope -> ApplicationIframeHost postMessage -> startHostedApplication bootstrap validation -> app UI handoff`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ApplicationSurface.vue`
  - `ready timeout starts -> matching ready accepted -> bootstrap envelope set -> bootstrap delivered -> canvas revealed`
  - Why it matters: keeps stale, failed, and retry states inside the host launch owner.
- Parent owner: `applicationHostStore.ts`
  - `startLaunch -> register request token -> ensure backend ready -> increment generation -> create iframeLaunchId -> ready state`
  - Why it matters: id freshness is route-visit/reload-scoped and must not become durable app identity.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Origin normalization/matching | DS-001, DS-004 | Contract + host/startup owners | Preserve file/null packaged-host equivalence and expected origin checks. | Trust boundary. | Security checks become fragmented or bypassed. |
| Transport URL construction | DS-001, DS-002 | `ApplicationSurface.vue`, frontend SDK transport | Build backend/notification endpoints and derive mounted route endpoints. | Keep app client independent from host internals. | Bootstrap payload becomes overloaded with per-route internals. |
| Manifest compatibility parsing | DS-003 | Package parsers | Reject incompatible frontend SDK contracts early. | Avoid silent runtime mismatch. | Old packages fail later inside iframe startup with unclear errors. |
| Generated sample refresh | DS-005 | Sample build scripts | Copy updated SDK dist/source into committed runtime/dist outputs. | Samples are shipped as importable packages. | Source and generated artifacts drift. |
| Console diagnostics | DS-001, DS-004 | Host/startup owners | Aid debugging with iframe-scoped terminology. | Useful for troubleshooting. | Logs keep misleading app-instance language. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Canonical iframe payload/query definitions | `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | Extend | Already owns the shared iframe contract. | N/A |
| Durable app request context type | `autobyteus-application-sdk-contracts/src/index.ts` | Extend | Existing public type exported to frontend/backend/server. | N/A |
| Bundle startup validation | `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | Extend | Existing child-side startup owner. | N/A |
| Host iframe lifecycle | `autobyteus-web/components/applications/ApplicationSurface.vue` | Extend | Existing host-side bootstrap owner. | N/A |
| Backend route context normalization | `autobyteus-server-ts/src/api/rest/application-backends.ts` and gateway service | Extend | Existing backend request boundary. | N/A |
| Compatibility gate | Manifest parsers in `autobyteus-server-ts/src/application-bundles/utils` | Extend | Existing package admission boundary. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Application SDK contracts | Iframe v3 contract, request-context type, frontend SDK compatibility constant, manifest types. | DS-001, DS-002, DS-003, DS-004 | Host, frontend SDK, backend gateway, package parsers. | Extend | Start here; all dependents should import canonical names. |
| Frontend SDK | Child startup, app client, backend mount transport. | DS-001, DS-002, DS-004 | Hosted app UIs. | Extend | Remove iframe id from app request context and route headers. |
| Web host applications UI | Host launch state, descriptor URL hints, iframe lifecycle, technical detail UI. | DS-001, DS-004 | AutoByteus host route. | Extend | Rename internals to `iframeLaunchId`; remove host UI exposure. |
| Server backend gateway/engine | REST request-context creation, gateway normalization, worker handler contexts. | DS-002 | Application backends. | Extend | Do not add new iframe correlation header/query. |
| Application package manifests | Frontend SDK compatibility v3. | DS-003 | Package admission. | Extend | Update tests and sample manifests. |
| Built-in samples | Source, generated UI/vendor/dist, package build scripts. | DS-001, DS-002, DS-003, DS-005 | Sample apps. | Extend | Generated refresh expected after SDK build. |
| Docs | Developer-facing terminology. | DS-001, DS-002, DS-003, DS-005 | Developers/reviewers. | Extend | Rename stale v1/v2 doc if implementation chooses. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | SDK contracts | Iframe contract | Define v3 constants/types/guards/helpers/parser. | One canonical iframe contract file already exists. | N/A |
| `autobyteus-application-sdk-contracts/src/index.ts` | SDK contracts | Public app SDK contract | Narrow request context; add/update frontend SDK v3 constant. | Existing top-level public contract aggregation. | N/A |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | SDK contracts | Manifest type contract | Require frontend SDK contract `"3"`. | Existing manifest type owner. | Uses v3 constant if practical. |
| `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | Frontend SDK | Child startup | Parse/validate v3 hints/bootstrap and emit v3 ready. | Existing startup owner. | Imports v3 contract. |
| `autobyteus-application-frontend-sdk/src/application-client.ts` | Frontend SDK | App client | Default app request context `{ applicationId }`. | Existing client owner. | Uses `ApplicationRequestContext`. |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | Frontend SDK | Backend mount transport | Stop emitting launch id route header. | Existing transport owner. | Uses `ApplicationRequestContext`. |
| `autobyteus-web/stores/applicationHostStore.ts` | Web host | Host launch state | Rename state field and generation function usage. | Existing store owner. | Uses descriptor util. |
| `autobyteus-web/utils/application/applicationLaunchDescriptor.ts` | Web host | Iframe launch descriptor | Rename descriptor, hints, factory to `iframeLaunchId`. | Existing descriptor utility owner. | Imports contract types/constants. |
| `autobyteus-web/utils/application/applicationAssetUrl.ts` | Web host | Iframe URL query helper | Append `autobyteusIframeLaunchId`. | Existing asset URL helper. | Imports query constant. |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | Web host | Host bootstrap owner | Build v3 bootstrap and accept `iframeLaunchId` ready. | Existing lifecycle owner. | Uses v3 bootstrap helper. |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | Web host | Internal iframe bridge | Validate v3 ready and emit `iframeLaunchId`. | Existing bridge owner. | Uses v3 guards. |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Web host | Route shell | Use `iframeLaunchId` state and remove detail item. | Existing route owner. | N/A |
| `autobyteus-server-ts/src/api/rest/application-backends.ts` | Server gateway | REST context entrypoint | Return request context `{ applicationId }`; remove launch header/query handling. | Existing REST route owner. | Uses `ApplicationRequestContext`. |
| `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | Server gateway | Gateway boundary | Normalize request context to `{ applicationId }`; keep mismatch rejection. | Existing service owner. | Uses `ApplicationRequestContext`. |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | Server engine | Worker handler context | Create handler contexts without launch id. | Existing worker owner. | Uses `ApplicationRequestContext`. |
| `applications/*` | Samples | Sample source/build outputs | Update source/manifests/scripts/vendor/dist. | Existing sample package files. | Uses built SDK dist. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Iframe launch id in hints/ready/bootstrap | `application-iframe-contract.ts` | SDK contracts | One public contract owner. | Yes: remove `launch.launchInstanceId` and `requestContext.launchInstanceId`. | Yes: one `iframeLaunchId` representation. | Generic app/session instance model. |
| Application backend request context | `index.ts` (`ApplicationRequestContext`) | SDK contracts | Shared by frontend/backend/server. | Yes: remove launch id. | Yes: one durable app identity. | A mixed iframe/backend context bag. |
| Sample vendored SDK contract output | Generated `applications/*/ui/vendor` | Sample build scripts | Built from canonical SDK dist. | Yes after rebuild. | Yes after rebuild. | Hand-maintained divergent vendor copy. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationBootstrapPayloadV3` | Yes | Yes | Low after removal | Keep only top-level `iframeLaunchId`; request context only app id. |
| `ApplicationRequestContext` | Yes | Yes | Low | Keep `{ applicationId }` only. |
| `ApplicationIframeLaunchHints` | Yes | Yes | Low | Use `iframeLaunchId` exactly; query param is `autobyteusIframeLaunchId`. |
| `ApplicationHostLaunchState` | Yes if renamed | Yes | Low | Rename state field to `iframeLaunchId`; do not call it an app launch instance. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | SDK contracts | Canonical iframe contract | v3 constants/types/guards/create helpers/parser; no v2 public path. | Existing contract file. | N/A |
| `autobyteus-application-sdk-contracts/src/index.ts` | SDK contracts | Public SDK contract | `ApplicationRequestContext { applicationId }`; frontend SDK v3 constant. | Existing public contract file. | N/A |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | SDK contracts | Manifest type contract | Frontend SDK compatibility `"3"`. | Existing manifest type file. | Frontend SDK constant if imported. |
| `autobyteus-application-sdk-contracts/tests/application-iframe-contract.test.mjs` | SDK contracts tests | Contract validation | Assert v3 names, v3 rejection, no request-context launch. | Existing test file. | Built dist. |
| `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | Frontend SDK | Child startup owner | v3 ready/bootstrap validation and error text. | Existing startup file. | SDK contract helpers. |
| `autobyteus-application-frontend-sdk/src/application-client.ts` | Frontend SDK | App client | request context default and info shape. | Existing client file. | `ApplicationRequestContext`. |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | Frontend SDK | Mount transport | Remove launch header emission; body request context remains app id. | Existing transport file. | `ApplicationRequestContext`. |
| `autobyteus-application-frontend-sdk/tests/hosted-application-startup.test.mjs` | Frontend SDK tests | Startup validation | Assert ready/bootstrap/appInfo shapes. | Existing test file. | Built dist. |
| `autobyteus-web/stores/applicationHostStore.ts` | Web host | Host launch state | `iframeLaunchId` state/generation. | Existing store file. | Descriptor factory. |
| `autobyteus-web/utils/application/applicationLaunchDescriptor.ts` | Web host | Descriptor utility | `createApplicationIframeLaunchId`, descriptor/hints. | Existing utility. | SDK contract type. |
| `autobyteus-web/utils/application/applicationAssetUrl.ts` | Web host | URL helper | Append v3 query param. | Existing URL utility. | SDK query constants. |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | Web host | Host bootstrap lifecycle | v3 bootstrap payload and matching checks. | Existing lifecycle owner. | SDK v3 helper/types. |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | Web host | Iframe bridge | v3 ready validation, emits, bootstrap delivery key. | Existing bridge. | SDK v3 guards. |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Web host | Route shell | Use renamed state; remove technical detail item. | Existing shell. | N/A |
| `autobyteus-web/localization/messages/*/applications.ts` | Web host localization | User-facing text | Remove obsolete launch-instance label or rename only if still used diagnostically. | Existing localization. | N/A |
| `autobyteus-server-ts/src/api/rest/application-backends.ts` | Server gateway | REST request context | Return `{ applicationId }`, remove launch header/query/body extraction. | Existing REST file. | `ApplicationRequestContext`. |
| `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | Server gateway | Gateway boundary | App-id-only context normalization. | Existing service. | `ApplicationRequestContext`. |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | Server engine | Worker runtime | Handler contexts with `{ applicationId }` only. | Existing worker. | `ApplicationRequestContext`. |
| `autobyteus-server-ts/src/application-engine/runtime/protocol.ts` | Server engine | Runtime protocol | Type follows narrowed request context. | Existing protocol. | `ApplicationRequestContext`. |
| `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts` and `application-backend-manifest.ts` | Server package parser | Compatibility gate | Require frontend SDK contract `"3"`. | Existing parser files. | SDK constant. |
| `applications/brief-studio/**`, `applications/socratic-math-teacher/**` | Samples | Sample apps/build outputs | Update manifests/scripts/source/ui/vendor/dist. | Existing sample layout. | Generated SDK dist. |
| Docs listed in Target Mapping | Docs | Developer docs | v3, iframe-specific terminology, no backend launch context. | Existing docs. | N/A |

## Ownership Boundaries

- The iframe bootstrap boundary owns `iframeLaunchId` and only uses it for host/child postMessage correlation.
- The application backend boundary owns `applicationId` as durable identity and must not reach back into iframe bootstrap internals.
- Manifest parsing owns compatibility admission; it should reject incompatible frontend SDK versions before runtime.
- Sample build scripts own generated sample artifacts; implementation should avoid manually editing generated vendor files except via build/regeneration when possible.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `application-iframe-contract.ts` | Query names, payload fields, validators, helper constructors. | Web host, frontend SDK, tests, samples. | Ad hoc string literals for `autobyteusIframeLaunchId` or duplicate local validators. | Add/adjust contract helper/type in shared contracts. |
| `ApplicationSurface.vue` | Retry, timeout, descriptor commit, bootstrap envelope creation. | `ApplicationShell.vue`. | Shell or iframe bridge constructing bootstrap payloads directly. | Add explicit props/events to Surface. |
| `ApplicationBackendGatewayService` | Context normalization, app existence/availability checks, engine handoff. | REST routes and tests. | Callers passing iframe launch id to worker or bypassing app-id validation. | Strengthen gateway API and tests. |
| Manifest parsers | Compatibility version checks. | Package providers/import flows. | Runtime iframe bridge accepting old v2 package shapes. | Bump parser constants/tests. |

## Dependency Rules

Allowed:

- Web host, frontend SDK, server, and samples import contract types/constants from `@autobyteus/application-sdk-contracts`.
- Frontend SDK transport and server gateway use `ApplicationRequestContext` but do not interpret iframe launch ids.
- Samples receive updated vendored SDK output through build scripts.

Forbidden:

- Any live public hosted-iframe code accepting `launchInstanceId` or `autobyteusLaunchInstanceId` as an alternate path.
- Any backend context type, route header, query parameter, or worker context carrying `iframeLaunchId` as platform request context.
- Any duplicate bootstrap representation such as both `iframeLaunchId` and `launch.launchInstanceId`.
- Any host UI label that describes the id as a launch instance, app instance, session, run, or business identity.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `readApplicationIframeLaunchHints(search)` | Iframe launch hints | Parse v3 URL hints. | `contractVersion=3`, `applicationId`, `iframeLaunchId`, `hostOrigin`. | Old v2 query name rejected. |
| `createApplicationUiReadyEnvelopeV3(payload)` | Child ready event | Build ready envelope. | `{ applicationId, iframeLaunchId }`. | Event name/channel stable. |
| `createApplicationHostBootstrapEnvelopeV3(payload)` | Host bootstrap event | Build bootstrap envelope. | Payload has top-level `iframeLaunchId`, requestContext app id only. | No `launch` object. |
| `ApplicationRequestContext` | Backend business request context | Carry durable app identity to handlers. | `{ applicationId }`. | No optional iframe field. |
| REST backend routes | Backend app invocation | Invoke app backend for route `:applicationId`. | Route param app id; body request context may be app id only. | Header/query iframe correlation removed. |
| Manifest parser checks | Package compatibility | Accept package SDK compatibility. | `frontendSdkContractVersion: "3"`. | Backend definition contract can remain `"2"`. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Iframe launch hints | Yes | Yes | Low | Use `iframeLaunchId`. |
| Bootstrap payload | Yes | Yes | Low | Remove old `launch` object and request-context launch. |
| Application request context | Yes | Yes | Low | Keep `{ applicationId }`. |
| REST route context | Yes | Yes | Low | Route param is authoritative; no iframe id. |
| Manifest compatibility | Yes | Yes | Low | Require `"3"`. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Iframe bootstrap correlation id | `launchInstanceId` -> `iframeLaunchId` | Yes after change | Low | Rename throughout. |
| Host launch state | `launchInstanceId` field -> `iframeLaunchId` field | Yes after change | Low | State can still be called host launch; id field must be iframe-specific. |
| App request context | `{ applicationId, launchInstanceId? }` -> `{ applicationId }` | Yes after change | Low | Remove optional field. |
| Frontend compatibility constant | `APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2` -> `..._V3` | Yes | Low | Update manifests/parsers/tests. |

## Applied Patterns (If Any)

- Adapter: `ApplicationIframeHost.vue` adapts raw browser `postMessage` events to typed host signals. It remains a bridge, not the lifecycle owner.
- Boundary validator: shared contract validators keep the public iframe payload shape tight.
- Compatibility gate: manifest parsers reject incompatible package SDK versions before runtime.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | File | Iframe contract | v3 iframe query/payload contract. | Existing shared contract owner. | v2 compatibility branches or duplicate launch shape. |
| `autobyteus-application-sdk-contracts/src/index.ts` | File | SDK public contracts | Request context and frontend SDK version constant. | Existing public export owner. | Iframe launch id in backend context. |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | File | Manifest types | Frontend SDK v3 requirement. | Existing manifest type owner. | Hardcoded stale `"2"`. |
| `autobyteus-application-frontend-sdk/src/` | Folder | Hosted frontend SDK | Startup/client/transport changes. | Existing frontend SDK. | Server-only compatibility policy. |
| `autobyteus-web/stores/applicationHostStore.ts` | File | Host launch state | Generate and expose `iframeLaunchId`. | Existing state owner. | Durable app instance semantics. |
| `autobyteus-web/utils/application/` | Folder | Host application utilities | Descriptor and URL hint helpers. | Existing host utility area. | Local copies of shared contract strings. |
| `autobyteus-web/components/applications/` | Folder | Host application UI | Surface/iframe bridge/shell updates. | Existing component area. | Backend request context policy. |
| `autobyteus-server-ts/src/api/rest/application-backends.ts` | File | REST gateway | App-id-only context creation. | Existing REST entrypoint. | Iframe launch headers/query special cases. |
| `autobyteus-server-ts/src/application-backend-gateway/` | Folder | Backend gateway | App-id validation and engine handoff. | Existing gateway subsystem. | Iframe bootstrap details. |
| `autobyteus-server-ts/src/application-engine/` | Folder | App engine/worker | App handler contexts. | Existing worker subsystem. | Iframe launch null placeholders. |
| `autobyteus-server-ts/src/application-bundles/utils/` | Folder | Manifest parsing | Frontend SDK v3 gate. | Existing package parser subsystem. | Runtime bootstrap compatibility hacks. |
| `applications/brief-studio/` | Folder | Sample app | Source/manifests/scripts/ui/vendor/dist update. | Existing sample. | Old vendored v2 SDK. |
| `applications/socratic-math-teacher/` | Folder | Sample app | Source/manifests/scripts/ui/vendor/dist update. | Existing sample. | Old launch-instance diagnostics. |
| Docs files | Files | Developer docs | v3 terminology and context. | Existing docs. | Misleading launch-instance/session wording. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src` | Mixed Justified | Yes | Low | Shared contract package intentionally co-locates contract types/helpers. |
| `autobyteus-application-frontend-sdk/src` | Transport/Main-Line Domain-Control | Yes | Low | Startup and client transport already separated by files. |
| `autobyteus-web/components/applications` | Main-Line Domain-Control | Yes | Medium | Keep lifecycle authority in Surface and raw bridge in IframeHost. |
| `autobyteus-server-ts/src/api/rest` | Transport | Yes | Low | REST should only adapt route/body to gateway calls. |
| `autobyteus-server-ts/src/application-backend-gateway` | Main-Line Domain-Control | Yes | Low | Gateway service owns backend admission and app-id validation. |
| `applications/*/ui/vendor` | Generated vendor | Yes | Medium | Generated output may be noisy; refresh from SDK build, do not hand-design. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Bootstrap payload | `{ iframeLaunchId, requestContext: { applicationId } }` | `{ launch: { launchInstanceId }, requestContext: { applicationId, launchInstanceId } }` | Removes duplicate and misleading identity. |
| Backend context | Handler sees `context.requestContext?.applicationId` | Handler sees `context.requestContext?.iframeLaunchId` | Backend business context must not depend on iframe bootstrap internals. |
| URL hints | `?autobyteusContractVersion=3&autobyteusApplicationId=...&autobyteusIframeLaunchId=...` | `?autobyteusContractVersion=2&autobyteusLaunchInstanceId=...` | Public query contract carries the new meaning and version. |
| Compatibility | Parser rejects `frontendSdkContractVersion: "2"` for current packages | Host accepts version 2 package then fails inside iframe startup | Fail early with clear package compatibility semantics. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Accept both `autobyteusLaunchInstanceId` and `autobyteusIframeLaunchId` in hint parser | Would reduce breakage for old bundles. | Rejected | v3 parser accepts only `autobyteusIframeLaunchId`; old packages rejected by frontend SDK version gate. |
| Keep `launchInstanceId` as deprecated alias in ready/bootstrap payload types | Would ease TypeScript migration. | Rejected | Replace public types/helpers/tests with v3 names. |
| Keep `requestContext.launchInstanceId` nullable | Would avoid server/test churn. | Rejected | Narrow `ApplicationRequestContext` to `{ applicationId }`. |
| Rename backend header to `x-autobyteus-iframe-launch-id` | Could preserve backend source correlation. | Rejected | No active backend business use found; iframe id stays out of platform request context. |
| Keep `APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2` as accepted package compatibility | Would allow old manifests. | Rejected | Bump accepted frontend SDK compatibility to `"3"`; update samples. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- Shared contract layer: SDK contracts define the v3 boundary and app request context.
- Host/bundle layer: web host and frontend SDK consume shared contract to coordinate iframe bootstrap.
- Backend layer: REST/gateway/engine consumes narrowed request context and remains unaware of iframe launch ids.
- Package/docs/sample layer: manifests, generated sample outputs, and docs stay synchronized with the shared contract.

## Migration / Refactor Sequence

1. Update `@autobyteus/application-sdk-contracts` first:
   - Add/replace v3 iframe constants/types/guards/helpers.
   - Rename query param to `autobyteusIframeLaunchId`.
   - Replace `ApplicationBootstrapPayloadV2` shape with v3 shape or v3-named exports.
   - Narrow `ApplicationRequestContext` to `{ applicationId }`.
   - Bump frontend SDK compatibility constant/type to `"3"`.
   - Update contract tests.
2. Update frontend SDK:
   - `hosted-application-startup.ts` uses v3 hints/envelopes and validates `iframeLaunchId` outside request context.
   - `application-client.ts` defaults request context to `{ applicationId }`.
   - `create-application-backend-mount-transport.ts` removes launch-id route header emission.
   - Update startup/type tests.
3. Update web host:
   - Rename store state, descriptor types/functions, component props/emits/logs/tests from launch instance to iframe launch id.
   - Build bootstrap payload with top-level `iframeLaunchId` and request context app id only.
   - Remove host technical-detail `Launch instance id` item and unused localization keys.
4. Update server/backend:
   - REST request-context reader returns `{ applicationId }` only.
   - Gateway normalization removes launch id and keeps app-id mismatch rejection for direct calls.
   - Worker event/artifact contexts use `{ applicationId }`.
   - Manifest parsers require frontend SDK `"3"`.
   - Update server tests/docs.
5. Update samples:
   - Update sample source references/logs/diagnostics.
   - Update `application.json`, `backend/bundle.json`, and build-script hardcoded compatibility to `"3"`.
   - Build SDK packages and sample packages to refresh `ui/vendor`, runtime `ui`, backend vendor if needed, and `dist/importable-package` committed outputs.
6. Update docs:
   - `autobyteus-web/docs/applications.md`
   - `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` (or rename to a v3 path and update links)
   - `autobyteus-server-ts/docs/modules/application_backend_gateway.md`
   - `autobyteus-server-ts/docs/modules/application_sessions.md`
   - SDK READMEs and backend/frontend SDK docs.
7. Run legacy scan and targeted tests; remove any remaining live old terminology.

## Key Tradeoffs

- **Version bump vs compatibility alias:** Bumping to v3 and rejecting v2 creates more updates now but prevents hidden runtime incompatibility and honors the clean-cut requirement.
- **Top-level `iframeLaunchId` vs nested `iframe: { launchId }`:** Top-level `iframeLaunchId` keeps one exact name across query, ready, bootstrap, descriptors, and tests. It avoids a new nested object whose only field would duplicate the concept.
- **Removing backend correlation header:** This eliminates a potentially useful debug correlation path, but no active source uses it and keeping it would preserve the mixed boundary the ticket is meant to remove.
- **Generated output updates:** Refreshing committed sample outputs increases diff size but keeps importable samples accurate.

## Risks

- Generated sample output may mask hand-authored changes during review; implementation handoff should separate source vs generated file groups.
- Dependency installation/build order may be needed before tests can run because this worktree currently lacks `node_modules`.
- Out-of-repo packages built against frontend SDK v2 will require rebuild and manifest updates.
- A residual `launchInstanceId` in generated dist/vendor/docs would undermine AC-008; implementation should include a final `rg` scan.

## Guidance For Implementation

Recommended validation after dependency setup and implementation:

```bash
pnpm -C autobyteus-application-sdk-contracts test
pnpm -C autobyteus-application-frontend-sdk test
pnpm -C autobyteus-web test:nuxt -- components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts components/applications/__tests__/ApplicationShell.spec.ts stores/__tests__/applicationHostStore.spec.ts utils/application/__tests__/applicationAssetUrl.spec.ts
pnpm -C autobyteus-server-ts test -- tests/unit/api/rest/application-backends-prefix.test.ts tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts tests/unit/application-engine/application-engine-host-service.test.ts tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts
pnpm -C applications/brief-studio build
pnpm -C applications/brief-studio typecheck:backend
pnpm -C applications/socratic-math-teacher build
pnpm -C applications/socratic-math-teacher typecheck:backend
rg -n "launchInstanceId|autobyteusLaunchInstanceId|x-autobyteus-launch-instance-id|Launch instance id" autobyteus-application-sdk-contracts autobyteus-application-frontend-sdk autobyteus-application-backend-sdk autobyteus-web autobyteus-server-ts applications/brief-studio applications/socratic-math-teacher --glob '!**/node_modules/**'
```

If the final `rg` scan finds historical mentions, each retained mention must be explicitly historical and not part of live public behavior.
