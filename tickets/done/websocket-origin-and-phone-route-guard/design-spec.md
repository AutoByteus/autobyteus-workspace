# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (revises SR-002 for ARCH-REV-001: AR-001, AR-002, AR-003)
- Approved requirements baseline: SR-001 (requirements-doc.md `Approved`), DEC-001 = B (HTTP in scope), DEC-010 = keep; approved by the user in the Solution Designer conversation, 2026-11-06 ("thanks. i trust your professinoalism. because you understand my project", answering the recommendation "B and keep").
- Behavior-defining supplements: None.
- User approval of the design: `Not required` (the Task does not ask for it).
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/websocket-origin-and-phone-route-guard/investigation-notes.md`
- Authorities read (2026-11-06): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `GLOSSARY.md` (Nodes section), `TESTING.md`, `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-web/docs/remote_access.md`. `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

Every request to a node passes one root `onRequest` hook, `registerRemoteAccessPolicyPlugin` (`src/api/security/remote-access-policy-plugin.ts:9-28`). It calls `RemoteAccessRoutePolicy.authorizeHttpRequest` (`remote-access-route-policy.ts:147-187`), except for paths starting `/ws/`, which it leaves to each WebSocket handler (`policy-plugin.ts:4-7,13-15`). Those handlers call `authorizeRemoteAccessWebSocket` (`api/websocket/remote-access-websocket-auth.ts:57-81`) so that they can close with the 4401/4403/4404 codes clients read.

So the WebSocket credential rule exists twice:
- `route-policy.ts:175-181`, for `/graphql` upgrades in the hook;
- `websocket-auth.ts:57-81`, for `/ws/*` in the handlers.

Both copies carry their own `trustedNetworkContext` (`route-policy.ts:119-125`, `websocket-auth.ts:49-55`) and their own query-credential reader (`route-policy.ts:127-136`, `websocket-auth.ts:40-47`).

Neither copy reads `Origin`, and neither limits a mobile credential by route. One route family already has its own origin check: the MCP gateway (`/mcp/gateway`, for agent runtimes and MCP clients on the node's machine). `registerMcpGatewayRoutes` is registered first (`build-studio-server.ts:458`) and adds a root `onRequest` hook (`mcp-gateway-routes.ts:65-89`). For `/mcp/gateway` that hook admits only an absent or loopback Origin (`mcp-gateway-http-helpers.ts:51-59,70-73`), answers OPTIONS with its own CORS headers (`:61-68`), and replies 403 `{error:"forbidden"}` otherwise. `tests/integration/api/studio-server-http-contract.integration.test.ts:117-159` pins it. CORS is registered separately in `build-studio-server.ts:459-462` with `origin: true`, which reflects any origin (measured). The peer WebSocket `/rest/remote/run-observations` goes through the hook as `REMOTE_PEER` (`route-policy.ts:71-73,162-167`), which reads only the bearer header.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: one subsystem (`autobyteus-server-ts/src/api/security` + the WS auth adapter):
  - one new file;
  - four modified source files (`remote-access-policy-plugin.ts`, `remote-access-route-policy.ts`, `remote-access-websocket-auth.ts`, `remote-access/domain/models.ts`) plus removal of CORS from `build-studio-server.ts`;
  - tests;
  - two docs and the glossary.

  No client code changes.
- Architectural risk: `High`
- Risk rationale: it changes a security boundary that every request crosses. It adds new refusal contracts (HTTP 403 `REMOTE_ACCESS_ORIGIN_REFUSED`; close 4403 `PHONE_ACCESS_ROUTE_REFUSED`) and a new node setting (`AUTOBYTEUS_ALLOWED_ORIGINS`). A wrong rule would cut off the desktop app, phones or peers on every node.
- Escalation trigger: any legitimate client found sending an Origin outside REQ-002, or a phone flow needing a WebSocket route outside the phone list. Either is a Requirement Gap back to the Solution Designer, not a local widening of the rule.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Fastify gate probe (Fastify 5.12.7, @fastify/websocket 11.3.4, @fastify/cors 11.3.1, worktree deps) | `evidence/origin-probe/fastify-gate-probe.mjs` | A root `onRequest` reply on a WS upgrade returns HTTP 403 and the WS handler never runs, for `/ws/*` and for a WS route inside a `/rest`-prefixed plugin. A route registered before the hook is covered too. CORS `delegator` returning `origin: false` gives no `Access-Control-Allow-Origin`. An allowed origin gets its preflight 204 with ACAO | One gate in the existing plugin covers every request and upgrade (DS-001); CORS via delegator from the same rule | None |
| Route-pattern probe (same versions + mercurius 16.12.1) | `evidence/origin-probe/route-pattern-probe.mjs` | `request.routeOptions.url` is the route pattern in the root `onRequest` hook and in the WS handler (`/ws/terminal/:sessionId`, `/graphql`) | Phone route list keyed by route pattern | None |
| Origin probe (Electron 42.4.1, Chrome, Node 22) | `evidence/origin-probe/` | `file://` (Electron WS), none (Electron fetch, Node WS), `null` (Chrome file page, sandboxed iframe) | REQ-002 classes | Safari `file://` (UNK-001) |
| Code | `remote-access-route-policy.ts:119-136,175-181`; `remote-access-websocket-auth.ts:40-81` | Duplicated WS credential rule | One `authorizeWebSocket` owner (refactor now) | — |
| Code | `grep authorizeRemoteAccessWebSocket` (13 call sites, all `(req)`; corrected count, ARCH-REV-001) | The `routeClass` parameter (`websocket-auth.ts:59-63`) is never passed | Dead → removed | — |
| Code | `grep extractRemoteAccessWebSocketCredential` | Used only inside `websocket-auth.ts` | Removed with the duplicate | — |
| Code | `src/config/app-config.ts:480-485` (`get(key, default)`: env, then config data) | Settings convention: `AUTOBYTEUS_*` read through `appConfigProvider.config.get` | `AUTOBYTEUS_ALLOWED_ORIGINS` | — |
| Code | `build-studio-server.ts` (502 lines) | Already over 500 lines | This change only removes lines from it (CORS registration and import) | — |
| Code (ARCH-REV-001 AR-001) | `mcp-gateway-routes.ts:65-89`, `mcp-gateway-http-helpers.ts:51-73`, `studio-server-http-contract.integration.test.ts:117-159` | MCP gateway's own, narrower origin rule (absent or loopback only), run first; its preflight answered by the gateway; the contract test expects the studio CORS headers on loopback MCP POSTs and `vary: Origin` without Origin | Keep the gateway rule as a deliberate narrower route-family rule; plugin stays after it; contract test must stay green (the delegator keeps `Vary: Origin`, `@fastify/cors` `index.js:163-166`) | — |
| Code | `@fastify/cors` 11.3.1 `index.js:95-127` | A delegator must be `(req, cb)` or return a Promise; a synchronous one-argument delegator fails every request | Delegator in callback form | — |
| Code | `autobyteus-web/utils/remoteAccess/remoteAccessAuthFailure.ts` | The phone unpairs only on 401 / `REMOTE_ACCESS_AUTH_REQUIRED` / `_INVALID` | New 4403/403 codes do not unpair a phone | — |

## Intended Change

One Origin gate in the node's remote-access request plugin, for every HTTP request and WebSocket upgrade, backed by one allowed-origin rule; CORS derived from the same rule. One WebSocket authorization method in `RemoteAccessRoutePolicy`, used by both WebSocket paths, which refuses a mobile credential on WebSocket routes outside the phone list.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003. Areas:
  - `autobyteus-server-ts/src/api/security/` (origin rule, request gate, CORS, WS authorization);
  - `src/api/websocket/remote-access-websocket-auth.ts` (adapter only);
  - `src/remote-access/domain/models.ts` (two failure codes);
  - `src/compositions/build-studio-server.ts` (CORS registration removed);
  - tests under `autobyteus-server-ts/tests/`;
  - docs: `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-web/docs/remote_access.md`, `GLOSSARY.md`.
- Derived consumers: `RemoteAccessAuthFailureCode` gains two codes → `closeCodeByFailure` (`websocket-auth.ts:21-35`, a `Record`, must list them), and the HTTP reply body in the plugin. The web client's `remoteAccessAuthFailure.ts` is unchanged: the new codes are not session failures by design.
- Deliberately left alone:
  - every WebSocket handler file (they keep calling `authorizeRemoteAccessWebSocket(req)`);
  - the standalone application server (own Origin check);
  - the MCP gateway's own origin rule and preflight handling (`mcp-gateway-routes.ts:65-89`), kept as a deliberate narrower rule for `/mcp/gateway` (AR-001);
  - the existing bearer refusals on owner and peer HTTP routes (`REMOTE_ACCESS_AUTH_INVALID`, `route-policy.ts:162-172`);
  - the message gateway;
  - all clients;
  - the trusted-network model;
  - owner/peer/loopback classifications;
  - phone HTTP REST/GraphQL access.
- Follow-ups: FU-001 (DNS rebinding), FU-002 (HTML preview same origin), FU-003 (message gateway CORS).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, REQ-002, REQ-005; AC-001, AC-002, AC-006 | Browser opens a node WS | No Origin read | Refused 403 unless allowed | DS-001 |
| BEH-002 | Contract | REQ-002, REQ-003; AC-003 | Browser HTTP to a node | CORS reflects any origin | Refused 403 unless allowed; CORS only for allowed | DS-001, DS-003 |
| BEH-003 | Contract | REQ-004, REQ-005; AC-004, AC-005 | `access_token=mra_…` on a WS | Accepted on every route | Refused 4403 (WS) / 403 (`/graphql`) outside phone list | DS-002 |
| BEH-004…008 | User/System/Operational | REQ-006; AC-007…AC-009 | Desktop app, phone, peers, app iframes, development | Work | Preserved: their origins are allowed (absent, `file://`, same origin, loopback) | DS-001 (pass) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/origin-probe/` | Client origins; Fastify gate and route-pattern behavior | REQ-001…REQ-004 | Premises of DS-001…DS-003 | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (security hardening)
- Current design issue found: `Yes`
- Structural triggers that fire:
  - **Repeated coordination / Several kinds or forms (P1, P13).** Two WS entry forms (`/graphql` via the hook, `/ws/*` via handlers) each carry their own copy of the WS credential rule (`route-policy.ts:175-181`, `websocket-auth.ts:57-81`). Adding the phone-route rule to both would duplicate it again.
  - **Capability-area reuse (P4).** Origin and CORS belong to the existing remote-access request plugin rather than to the server composition.
  - **Not firing:**
    - Ambiguous boundary: route identity is the exact route pattern.
    - Persisted data: none.
    - Legacy: no old path kept.
- Root cause classification: `Duplicated Policy Or Coordination` (WS credential rule), plus `Missing Invariant` (no Origin rule; no phone route rule).
- Refactor needed now: `Yes`
- Evidence: the duplicated code above; the dead `routeClass` parameter; `extractRemoteAccessWebSocketCredential` used only internally.
- Design response: `RemoteAccessRoutePolicy.authorizeWebSocket(request)` becomes the only WS credential rule. `authorizeHttpRequest` delegates its `TRUSTED_NETWORK_WEBSOCKET` branch to it, and `authorizeRemoteAccessWebSocket` becomes a thin adapter from its result to close codes.
- Refactor rationale: the phone-route rule must hold on both WS forms. One owner makes that a single rule.
- Deferrals: none.

## Terminology

- **Origin:** the browser-set `Origin` request header.
- **Allowed origin:** an Origin the node accepts (REQ-002). Added to `GLOSSARY.md` under Nodes.
- **Phone WebSocket route:** a WebSocket route pattern a paired phone's credential may open. Added to `GLOSSARY.md`.

Existing words kept:
- mobile credential (`mra_…`, code: `isMobileRemoteAccessCredential`);
- trusted network;
- loopback;
- peer.

The new failure code uses the docs' "Phone Access" naming, like the existing `PHONE_ACCESS_DISABLED`.

## Legacy Removal Policy (Mandatory)

- Obsolete paths in scope:
  - the duplicate WS credential rule in `websocket-auth.ts`;
  - the dead `routeClass` parameter;
  - CORS `origin: true` in `build-studio-server.ts`.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. No stored data changes; one optional environment/config setting is read.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-004…008 | Browser/peer/app request (HTTP or WS upgrade) | Route handler runs, or 403 refusal | Remote-access request gate (`remote-access-policy-plugin.ts`) | The one door for origins |
| DS-002 | Primary End-to-End | BEH-003 | WS upgrade with `access_token` | Socket stream starts, or 4401/4403/4404 close (`/ws/*`) / 4xx reply (`/graphql`) | `RemoteAccessRoutePolicy.authorizeWebSocket` | The one WS credential rule incl. phone routes |
| DS-003 | Bounded Local | BEH-002 | CORS hook | ACAO header granted or not | `@fastify/cors` delegator using the origin rule | CORS must agree with the gate |

## Primary Execution Spine(s)

- DS-001: `Browser / peer / desktop app / local MCP client -> Fastify routing -> [/mcp/gateway only] MCP gateway origin hook (narrower rule; answers its own preflight) -> @fastify/cors onRequest (DS-003) -> remote-access request gate: origin rule -> (HTTP and /graphql upgrade) RemoteAccessRoutePolicy.authorizeHttpRequest | (/ws/* upgrade) route handler -> route work`. Root `onRequest` hooks run in registration order; the composition keeps it: `registerMcpGatewayRoutes` first, then `registerRemoteAccessPolicyPlugin` (which registers CORS, then its gate hook). Every refusal the gate replies with gets one log line (DS-001 and DS-002).
- DS-002: `WS client -> remote-access request gate (origin passed) -> /ws/* handler -> authorizeRemoteAccessWebSocket (adapter) -> RemoteAccessRoutePolicy.authorizeWebSocket -> [phone-route check -> RemoteAccessAuthService.authorizeMobileCredential] -> context set -> stream starts`. For `/graphql`: `gate -> authorizeHttpRequest -> authorizeWebSocket -> 403 reply or mercurius upgrade`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Every request, upgrades included, first meets the origin rule. A request whose Origin is not allowed gets 403 `REMOTE_ACCESS_ORIGIN_REFUSED`; nothing else runs. An allowed request continues exactly as today: route authorization for HTTP and `/graphql`, deferral for `/ws/*`. Whatever refusal the gate replies with (origin, or a result from `authorizeHttpRequest` such as a phone credential on a `/graphql` upgrade or on the peer WS), it logs one line: `Remote Access request refused <code> <redacted url>`, plus `origin <value>` for an origin refusal. For `/mcp/gateway`, the gateway's own hook runs first with its narrower rule | Request gate, origin rule | Request gate | Log redaction (`redactSensitiveUrl`), configured origins (app config) |
| DS-002 | A WS upgrade that passed the gate reads its query credential. Without a mobile credential: trusted network / loopback as today. With one: the route pattern must be a phone WebSocket route, else `PHONE_ACCESS_ROUTE_REFUSED` (403 in the result → 4403 close / HTTP 403). Then the credential is validated as today (disabled/revoked/invalid unchanged). Refusal reasons are logged once: by the request gate for `/graphql` and the peer WS (HTTP replies), by `closeSocketForRemoteAccessRejection` for `/ws/*` (close codes) | `authorizeWebSocket`, phone route list, auth service | `RemoteAccessRoutePolicy` | Close-code mapping (adapter) |
| DS-003 | The CORS plugin asks the same origin rule per request and grants ACAO only to an allowed Origin | Delegator, origin rule | Request gate plugin (registers CORS) | — |

## Spine Actors / Main-Line Nodes

- Remote-access request gate (`registerRemoteAccessPolicyPlugin`).
- Origin rule (`RequestOriginPolicy`).
- `RemoteAccessRoutePolicy` (`authorizeHttpRequest`, `authorizeWebSocket`).
- `RemoteAccessAuthService.authorizeMobileCredential` (unchanged).
- WS handlers (unchanged).

## Ownership Map

- **Request gate (plugin):** owns the order of checks on every request (origin, then route authorization or `/ws/*` deferral) and registers CORS with the origin rule. Owns every refusal reply it sends and its single log line.
- **Origin rule (`remote-access-request-origin.ts`):** owns the definition of an allowed origin (REQ-002) and parsing of `AUTOBYTEUS_ALLOWED_ORIGINS`. Pure; no I/O except its constructor input.
- **`RemoteAccessRoutePolicy`:** owns route classification, HTTP authorization and now the single WS authorization incl. the phone WebSocket route list.
- **`authorizeRemoteAccessWebSocket`:** thin adapter. Translates a policy result into a close-code rejection and sets the auth context; owns no rule.

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `authorizeRemoteAccessWebSocket(req)` | `RemoteAccessRoutePolicy.authorizeWebSocket` | WS handlers need a close-code rejection and the context set | Any credential, route or origin rule |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `trustedNetworkContext` and `extractRemoteAccessWebSocketCredential` in `remote-access-websocket-auth.ts` | Duplicate of `route-policy.ts:119-136` | `RemoteAccessRoutePolicy.authorizeWebSocket` | `extractRemoteAccessWebSocketCredential` export: Dead outside this file (grep) |
| `routeClass` parameter of `authorizeRemoteAccessWebSocket` and its 4404 branch | Dead: all 13 call sites pass `(req)` only | — | — |
| CORS registration in `build-studio-server.ts:459-462` and its `@fastify/cors` import | Origin policy moves to the request gate plugin | `registerRemoteAccessPolicyPlugin` | File gets shorter |
| `TRUSTED_NETWORK_WEBSOCKET` body in `authorizeHttpRequest` (`route-policy.ts:175-181`) | Duplicate | `return this.authorizeWebSocket(request)` | — |

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Configured origins | DS-001, DS-003 | Origin rule | Read `AUTOBYTEUS_ALLOWED_ORIGINS` once at plugin registration through `appConfigProvider.config.get`; parse comma-separated; normalize each with `new URL(v).origin`; ignore invalid entries with one warning | Safety valve (DEC-005) | — |
| Refusal log | DS-001, DS-002 | Gate (HTTP replies incl. `/graphql` and peer WS refusals), adapter (`/ws/*` closes) | One `warn` line per refusal: code and `redactSensitiveUrl(request.url)`; `origin <value>` only for `REMOTE_ACCESS_ORIGIN_REFUSED`; never other headers or credentials | REQ-005, AC-006 | Secret leak or missing reason |
| Close-code mapping | DS-002 | Adapter | `closeCodeByFailure` incl. the 2 new codes (4403 each) | Clients read close codes | — |

## Ownership Boundaries

Authority for "may this browser origin reach the node" is the request gate with its origin rule; CORS asks the same rule. A route family may apply a narrower origin rule of its own before the gate: today only the MCP gateway (`/mcp/gateway`: absent or loopback Origin), deliberately, because only local agent runtimes and MCP clients call it. No code may admit an origin the node rule refuses. Authority for "may this credential open this WS route" is `RemoteAccessRoutePolicy.authorizeWebSocket`; handlers and the hook only translate its result.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `RemoteAccessRoutePolicy.authorizeWebSocket` | Query credential reading, phone route list, mobile credential validation, trusted-network context | `authorizeHttpRequest` (`/graphql`), `authorizeRemoteAccessWebSocket` (`/ws/*`) | A handler or adapter reading `access_token` or calling `authorizeMobileCredential` itself | Extend the result, not the callers |
| Origin rule | Allowed-origin definition, configured origins | Request gate, CORS delegator | Any other code admitting an Origin the node rule refuses, or a second node-wide origin rule. A route family's narrower rule that runs before the gate (today `/mcp/gateway`) is allowed and must not be removed or widened by this change | — |

## Dependency Rules

- `api/websocket/*` handlers → `remote-access-websocket-auth.ts` only (unchanged).
- `remote-access-websocket-auth.ts` → `getRemoteAccessRoutePolicy()` and `setRemoteAccessAuthContext`; no import of `remote-access-auth-service`, `remote-access-local-trust` or `WEBSOCKET_ACCESS_TOKEN_QUERY_KEY`.
- `remote-access-policy-plugin.ts` → origin rule, route policy, `@fastify/cors`, app config, `redactSensitiveUrl`.
- `remote-access-request-origin.ts` → `remote-access-local-trust.ts` (loopback IP check) only; no Fastify import beyond types.
- `build-studio-server.ts` no longer imports `@fastify/cors`.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `createRequestOriginPolicy(configuredOrigins: readonly string[]): RequestOriginPolicy` | Origin rule | Build the rule | Normalized origins | — |
| `RequestOriginPolicy.isAllowed(headers: { origin?, host?, "x-forwarded-host"? }): boolean` | One request's headers | REQ-002 decision | Header values | `x-forwarded-host`: first comma-separated value, trimmed |
| `parseConfiguredOrigins(raw: string): string[]` (+ invalid entries reported to the caller for one warning) | Setting value | Parse | Raw string | — |
| `RemoteAccessRoutePolicy.authorizeWebSocket(request): Promise<RemoteAccessAuthorizationResult>` | One WS upgrade | Credential + phone route | `request.routeOptions.url` (route pattern), query `access_token`, client address | Route check before credential validation |
| `authorizeRemoteAccessWebSocket(request): Promise<RemoteAccessAuthContext>` | Adapter | Throw `{ code, reason }` on refusal | `request` | Signature loses `routeClass` |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Action |
| --- | --- | --- | --- | --- |
| `RequestOriginPolicy.isAllowed` | Yes | Yes | Low | — |
| `authorizeWebSocket` | Yes | Yes (route pattern, not path parsing) | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Origin rule | `RequestOriginPolicy` / `remote-access-request-origin.ts` | Yes | Yes | Low | Glossary "Allowed origin" |
| Phone WS route list | `PHONE_WEBSOCKET_ROUTES` | Yes | Yes (docs say phone) | Low | Glossary "Phone WebSocket route" |
| Setting | `AUTOBYTEUS_ALLOWED_ORIGINS` | Yes | Yes | Low | Documented in server remote_access.md |
| Codes | `REMOTE_ACCESS_ORIGIN_REFUSED`, `PHONE_ACCESS_ROUTE_REFUSED` | Yes | Yes (`REMOTE_ACCESS_*`, `PHONE_ACCESS_*` families) | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Request gate | `remote-access-policy-plugin.ts` | Extend | Already the root gate |
| WS credential rule | `RemoteAccessRoutePolicy` | Extend | Owns route classes and HTTP auth |
| Loopback test | `remote-access-local-trust.ts` (`isLoopbackClientAddress`) | Reuse | Same IP semantics |
| Redaction | `redact-sensitive-url.ts` | Reuse | — |
| Origin comparison | `standalone-browser-websocket-origin.ts` | Not reused | Different server and rule (requires Origin); sharing would couple two servers for a 3-line comparison |
| Origin comparison | `mcp-gateway-http-helpers.ts` `isOriginAllowed` | Kept, not reused | A narrower rule for one route family (local MCP clients); its set (absent, localhost/127.0.0.1/::1) is inside REQ-002's set, so no gateway client is refused by the node gate; replacing it with the wider node rule would widen the gateway |
| Allowed-origin rule | — | Create New (`remote-access-request-origin.ts`) | No owner exists; used by gate and CORS |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/security` | Request gate, origin rule, route policy, CORS | DS-001…003 | Extend |
| `autobyteus-server-ts/src/api/websocket` | Close-code adapter | DS-002 | Modify (shrinks) |
| `autobyteus-server-ts/src/remote-access/domain` | Failure codes | DS-001, DS-002 | Extend |

## Draft File Responsibility Mapping

As the final mapping below; no shared structure needed extracting beyond removing the duplicate.

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| WS credential rule (2 copies) | `remote-access-route-policy.ts` (`authorizeWebSocket`) | Route policy | One rule for both WS forms | Yes | Yes | A second rule in the adapter |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `RemoteAccessAuthFailureCode` (+2) | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Area | Owner | Concrete Concern |
| --- | --- | --- | --- |
| `src/api/security/remote-access-request-origin.ts` (new, ~80 lines) | security | Origin rule | REQ-002: absent → allowed; exactly `file://` → allowed; `http:`/`https:` Origin whose `URL.host` (lowercased) equals `Host` or the first `X-Forwarded-Host` value → allowed; `http:`/`https:` with hostname `localhost`, or an IP that `isLoopbackClientAddress` accepts (brackets stripped) → allowed; `new URL(origin).origin` in the configured set → allowed; else (incl. `null`, malformed, other schemes) refused. `parseConfiguredOrigins` |
| `src/api/security/remote-access-policy-plugin.ts` | security | Request gate | Read the setting and build the origin rule; register `@fastify/cors` with a `delegator` → `{ origin: rule.isAllowed(req.headers) && req.headers.origin ? req.headers.origin : false, methods: [GET, POST, PUT, PATCH, DELETE, OPTIONS] }`. The delegator uses the callback form `(req, cb)` (`@fastify/cors` rejects a one-argument synchronous delegator). In `onRequest`, first: if not allowed → refuse with 403 `REMOTE_ACCESS_ORIGIN_REFUSED`. Then the existing `/ws/*` deferral and `authorizeHttpRequest`; a refusal result is replied as today. Every refusal reply goes through one local `refuse(request, reply, rejection, origin?)` that logs `Remote Access request refused <code> <redacted url>` (plus `origin <value>` for the origin refusal) and sends `{ error, code, message }`. Registered after `registerMcpGatewayRoutes` |
| `src/api/security/remote-access-route-policy.ts` | security | Route policy | Add `PHONE_WEBSOCKET_ROUTES` (route patterns: `/ws/agent/:runId`, `/ws/agent-team/:teamRunId`, `/ws/agent-org/:orgRunId`, `/ws/agent-collaboration/:runId`, `/ws/projects`, `/ws/agent-package-definitions`, `/ws/file-explorer/:workspaceId`, `/ws/node-desktop`). Add `authorizeWebSocket(request)`: query credential; not mobile → trusted-network context; mobile and `request.routeOptions.url` not in the list → `reject(403, "PHONE_ACCESS_ROUTE_REFUSED", "Phone credentials do not open this route.")`; else `authService.authorizeMobileCredential`. `authorizeHttpRequest`'s WS branch returns `this.authorizeWebSocket(request)`. `REMOTE_PEER` branch also refuses a mobile `access_token` query credential with 403 `PHONE_ACCESS_ROUTE_REFUSED` (AR-003: the same refusal as on `/graphql`; not `REMOTE_ACCESS_AUTH_INVALID`, which the phone client treats as an invalid session). The existing bearer refusal on peer HTTP keeps `REMOTE_ACCESS_AUTH_INVALID` (preserved contract, not a WS route) |
| `src/api/websocket/remote-access-websocket-auth.ts` | websocket | Adapter | `authorizeRemoteAccessWebSocket(request)`: call `getRemoteAccessRoutePolicy().authorizeWebSocket`; on refusal throw `{ code: closeCodeByFailure[code], reason: code }`; else set context and return it. `closeSocketForRemoteAccessRejection` unchanged |
| `src/remote-access/domain/models.ts` | domain | Codes | `+ "REMOTE_ACCESS_ORIGIN_REFUSED" \| "PHONE_ACCESS_ROUTE_REFUSED"` |
| `src/compositions/build-studio-server.ts` | composition | — | Remove CORS registration and import |

## Applied Patterns

None beyond the existing plugin hook.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/security/remote-access-request-origin.ts` | File (new) | Origin rule | REQ-002 | Fastify hooks, logging, route rules |
| `autobyteus-server-ts/src/api/security/remote-access-policy-plugin.ts` | File | Request gate | Sequence + CORS + 403 | Origin comparison logic |
| `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | File | Route policy | Classification, HTTP + WS authorization, phone WS list | Origin logic |
| `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts` | File | Adapter | Result → close code | Credential/route rules |
| `autobyteus-server-ts/tests/unit/remote-access/request-origin.test.ts` | File (new) | Tests | REQ-002 table | — |
| `autobyteus-server-ts/tests/unit/remote-access/route-policy.test.ts` | File | Tests | `authorizeWebSocket` phone allow/refuse per pattern; `/graphql`; peer WS query credential → `PHONE_ACCESS_ROUTE_REFUSED` | — |
| `autobyteus-server-ts/tests/integration/api/studio-server-http-contract.integration.test.ts` | File (existing, unchanged) | Tests | MCP gateway preflight/foreign refusal and studio CORS headers on loopback MCP requests; must stay green | — |
| `autobyteus-server-ts/tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts` | File (new) | Tests | Real listening server with the plugin and the real `registerWebsocketRoutes` + mercurius `/graphql` + `/rest/remote` WS: AC-001…AC-006 over real upgrades (`ws` client with `origin`) and `inject` for HTTP, incl. the peer WS phone refusal; AC-006 captures the warn output and asserts one line with code and redacted URL for an origin refusal, a `/ws/terminal` phone refusal, a `/graphql` phone refusal and a peer WS phone refusal, and no `mra_` value or `access_token` value in any line | — |
| `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-web/docs/remote_access.md`, `GLOSSARY.md` | Docs | — | REQ-008; glossary words | — |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `src/api/security/` | Transport-edge policy | Yes | Low | All request-admission rules live here already |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Phone route identity | `PHONE_WEBSOCKET_ROUTES.has(request.routeOptions.url)` with `/ws/terminal/:sessionId` absent | `request.url.startsWith("/ws/agent")` (also matches `/ws/agent-team…`, query strings) | Exact pattern, deny by default |
| WS rule ownership | handler → adapter → `policy.authorizeWebSocket` | adapter reading `access_token` and calling the auth service itself | One rule for both WS forms |
| Same origin behind Tailscale Serve | Origin `https://desktop.tail.ts.net`, Host `desktop.tail.ts.net` → allowed | Comparing `https:` with the server's `http:` | TLS ends at the proxy |
| Near misses | `https://desktop.tail.ts.net.evil.example`, `http://127.0.0.1.evil.example`, `null`, `file:///x` → refused | Prefix/suffix string matching | Parse with `URL`, compare whole host |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean Cut |
| --- | --- | --- | --- |
| Keep `routeClass` parameter | Existing signature | Rejected | Removed (dead) |
| Keep CORS `origin: true` alongside the gate | "Gate refuses anyway" | Rejected | CORS from the same rule |
| Warn-only mode for refused origins | Softer rollout | Rejected | The user approved refusal; the setting covers unusual setups |

## Change / Refactor Sequence

1. Add failure codes; add `remote-access-request-origin.ts` with its unit test (start from the probe cases: `file://`, `null`, absent, Tailscale shape, near misses).
2. Refactor: add `authorizeWebSocket` to the route policy (behavior-identical first), point `authorizeHttpRequest` and the adapter at it, delete the duplicates and the dead parameter; existing tests stay green.
3. Add the phone WebSocket route list and the refusal; extend `route-policy.test.ts`; peer query credential refusal.
4. Move CORS into the plugin with the delegator (callback form); add the origin gate and the single refusal log; remove CORS from `build-studio-server.ts`, keeping `registerMcpGatewayRoutes` before the plugin; run `studio-server-http-contract.integration.test.ts` unchanged.
5. E2E test on a real listening server; then docs and glossary.
6. Executable validation (API/E2E): AC-007 desktop app (isolated instance, embedded + an isolated Docker/remote node, incl. terminal, file explorer, an application iframe); AC-008 phone shell served by an isolated node, paired, over LAN HTTP and through a Host-preserving HTTPS proxy, node log free of refusals; AC-009 two isolated peer nodes.

## Key Tradeoffs

- Host-only same-origin comparison accepts DNS rebinding (FU-001) in exchange for working through TLS-terminating proxies without configuration.
- Loopback origins always allowed (DEC-004): keeps development and e2e working; anyone able to serve a page from the browser machine's loopback already runs code there.
- Phone route list by exact pattern: a renamed route param drops phone access until the list follows. The e2e test registers the real WS routes and asserts every listed pattern is registered, so a rename fails the test instead of the phone.

## Risks

- An unknown legitimate client with a foreign Origin: mitigated by the investigation, executable validation and the setting; escalation trigger above.
- `request.routeOptions.url` semantics changing in a Fastify upgrade: covered by the e2e test.
- Interaction with S3 (autobyteus-407) and autobyteus-415: no conflict found; `/ws/node-desktop` stays on the phone list.

## Guidance For Implementation

- Reproduction to start from: `evidence/origin-probe/` (README commands); write the new unit/e2e cases first and watch them fail on the base (cross-origin upgrade opens, phone credential opens `/ws/terminal`).
- Refusal logs: one line per refusal; Origin value and redacted URL only; never `request.headers` wholesale.
- Do not change any WS handler file, any client, or the MCP gateway's origin rule.
