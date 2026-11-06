# Remote Access / Phone Access Backend

Remote Access is the backend boundary for phone/PWA pairing and mobile sessions on an AutoByteus node reached through a private network path the user or organization already trusts. The full backend is intended for trusted LAN, company VPN, tailnet, or other private-network exposure; it is **not** designed for direct public internet exposure. Future strict owner pairing/admin authorization would be a separate opt-in design, not part of the default Phase One flow.

Phone Access is additive: paired phones receive explicit `mra_...` mobile credentials, while normal desktop/Electron access to a remote node continues to use the trusted private-network model without an extra setup secret in the default flow.

## Runtime Ownership

| Concern | Owner |
| --- | --- |
| HTTP route classification and authorization; the WebSocket credential rule and phone WebSocket routes (`authorizeWebSocket`, `PHONE_WEBSOCKET_ROUTES`) | `src/api/security/remote-access-route-policy.ts` |
| Fastify request gate (Origin check, CORS, route authorization, refusal log) | `src/api/security/remote-access-policy-plugin.ts` |
| Allowed-origin rule and `AUTOBYTEUS_ALLOWED_ORIGINS` parsing | `src/api/security/remote-access-request-origin.ts` |
| WebSocket close codes for `/ws/*` handlers (adapter over `authorizeWebSocket`) | `src/api/websocket/remote-access-websocket-auth.ts` |
| Phone Access settings | `src/remote-access/services/remote-access-settings-service.ts` and `stores/remote-access-settings-store.ts` |
| Pairing session creation/exchange | `src/remote-access/services/remote-access-pairing-service.ts` |
| Paired device credentials and revocation | `src/remote-access/services/paired-device-service.ts` and `stores/paired-device-store.ts` |
| Stable node identity (the node ID) | `src/remote-access/services/node-identity-service.ts` |
| Client-facing absolute/relative resource URLs | `src/remote-access/services/client-facing-url-resolver.ts` |
| Mobile static asset serving | `src/api/static/mobile-web.ts` |
| Sensitive URL redaction | `src/api/security/redact-sensitive-url.ts` |

## Allowed Origins

Every HTTP request and every WebSocket upgrade, on any path (`/ws/*`, `/graphql`, `/rest/remote/run-observations` and routes added later), first meets the node's allowed-origin rule in the request gate, before route authorization and before any route handler. A request is allowed when its browser `Origin` header is:

- absent (the desktop app's HTTP requests, peer nodes, native and command-line clients);
- the same origin: the Origin's host[:port] equals the request's `Host`, or the first `X-Forwarded-Host` value, case-insensitive. The scheme is not compared, so a phone shell reached through Tailscale Serve (`https://<name>.ts.net`, plain HTTP to the node) is the same origin;
- exactly `file://` (the packaged desktop app's renderer);
- an `http`/`https` loopback origin on any port: `localhost`, `127.0.0.0/8`, `[::1]` (development, Electron dev, e2e);
- listed in the optional node setting `AUTOBYTEUS_ALLOWED_ORIGINS` (environment or the node's `.env`): comma-separated exact origins such as `https://gateway.example.com`, default empty, read at server start. Use it only for a gateway that rewrites `Host` and sends no `X-Forwarded-Host`. Entries that are not `http(s)` origins are ignored with one warning at start.

Everything else is refused, including `Origin: null`, other schemes and malformed values: the request gets HTTP 403 `{ code: "REMOTE_ACCESS_ORIGIN_REFUSED" }` (for a WebSocket, the handshake fails; no socket opens and nothing route-specific starts). CORS headers are granted from the same rule: an allowed Origin is reflected in `Access-Control-Allow-Origin`, a refused one gets none, and a request without Origin is answered as before.

The MCP gateway (`/mcp/gateway`) keeps its own narrower rule, which runs first: only an absent or loopback Origin, with its own preflight answer.

## Route Policy

The route policy classifies every HTTP request before normal route handling:

- Public bootstrap/status routes:
  - `OPTIONS` preflight
  - `/mobile` and `/mobile/*`
  - `/rest/health`
  - `GET /rest/remote-access/status`
  - `POST /rest/remote-access/pairing-exchanges`
- Trusted-network owner routes:
  - `GET /rest/remote-access/settings`
  - `PUT /rest/remote-access/settings`
  - `GET /rest/remote-access/address-candidates`
  - `POST /rest/remote-access/pairing-sessions`
  - `GET /rest/remote-access/devices`
  - `GET /rest/remote-access/devices/revoked`
  - `DELETE /rest/remote-access/devices/:deviceId`
  - `DELETE /rest/remote-access/devices`
  - `GET /rest/node-update` (a Docker node's server package version and in-place update state, relayed from its starter; `inPlaceUpdate: "unavailable"` on servers no starter runs; see `autobyteus-server-ts/docker/README.md` and the DESIGN.md rule 9 exception)
  - `POST /rest/node-update` (`{ version }`: asks the node's starter to update its server package in place; the starter logs the request with the client address)
- Trusted-network protected routes:
  - `POST /graphql`
  - protected REST families such as media, files, uploads, workspaces, context files, drafts, runs, team runs, run file changes, team communication, application backend routes, and application bundle assets
- Trusted-network WebSocket routes:
  - `/ws/*`
  - GraphQL WebSocket upgrades
- Local-dev-only routes:
  - GraphQL GET/development UI surfaces remain loopback-only.

Trusted-network owner/protected/WebSocket routes are reachable without an additional credential under the product model above. When a request presents an `mra_...` mobile credential on protected REST/GraphQL routes or on a phone WebSocket route, the backend validates it and records a mobile auth context. Mobile credentials are rejected on owner-management routes such as settings changes, pairing-session creation, device listing, and revocation.

Phone WebSocket routes are the WebSocket route patterns a paired phone's credential may open (`PHONE_WEBSOCKET_ROUTES`): `/ws/agent/:runId`, `/ws/agent-team/:teamRunId`, `/ws/agent-org/:orgRunId`, `/ws/agent-collaboration/:runId`, `/ws/projects`, `/ws/agent-package-definitions`, `/ws/file-explorer/:workspaceId` and `/ws/node-desktop`. A mobile credential (`access_token=mra_...`) on any other WebSocket route is refused before it is validated, with `PHONE_ACCESS_ROUTE_REFUSED`: close code 4403 on `/ws/*` (today `/ws/terminal/...`, `/ws/update-notifications`, `/ws/applications/...`), HTTP 403 on a `/graphql` upgrade and on the peer WebSocket `/rest/remote/run-observations`. A WebSocket route added later stays closed to phones until it is added to the list. The list is keyed by Fastify route pattern (`request.routeOptions.url`), so renaming a route parameter must update it; the e2e test `tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts` fails when a listed pattern is not registered. The refusal is not a session failure: the phone does not unpair on it.

## Pairing Model

1. The owner enables Phone Access with `PUT /rest/remote-access/settings` from the current desktop/Electron node window.
2. The owner creates a pairing session with `POST /rest/remote-access/pairing-sessions` and a selected client-facing `serverBaseUrl`. Remote-node windows require a manually entered phone-facing private-network URL (HTTPS or acknowledged trusted private HTTP) whose status identity matches the management target.
3. The service normalizes the selected URL to the canonical server base. Reserved AutoByteus surfaces such as `/mobile`, `/rest`, `/graphql`, and `/ws` are stripped while deployment base paths are preserved.
4. New desktop-created pairing sessions accept `https://` URLs and acknowledged trusted private `http://` URLs after normalization. Public HTTP and phone-unreachable local-only hosts are rejected by the pairing service.
5. The service creates a five-minute, single-use pairing code and returns a `/mobile?pairing=<payload>` URL suitable for a QR code or copy/paste. The pairing payload stores the canonical server base, while the returned mobile URL appends `/mobile` for the user-facing shell.
6. The phone calls `POST /rest/remote-access/pairing-exchanges` with the pairing code and server base URL.
7. The backend creates a paired device record and returns the only copy of the raw mobile credential to the phone.

Pairing sessions are in-memory, short-lived, and consumed during exchange. Paired devices persist under the app data directory in `remote-access/paired-devices.json`; only a SHA-256 credential hash is stored.

## Mobile Credential Enforcement

Remote Access mobile credentials use the `mra_...` prefix. HTTP REST and GraphQL use `Authorization: Bearer <mra_...>`. Browser WebSocket clients pass the same credential as `access_token=<mra_...>` because browser WebSocket constructors cannot send arbitrary authorization headers.

A valid mobile credential is accepted only when:

- the credential has the `mra_` prefix;
- the credential hash matches a paired device record;
- the device is not revoked;
- Phone Access is currently enabled;
- the current route class accepts mobile credentials.

Accepted mobile requests get an auth context with `mode: "mobile"`, the paired `deviceId`, and the stored `clientFacingBaseUrl`. Last-seen timestamps are updated best-effort and must not reject otherwise valid requests.

Mobile credentials do not authorize owner-management routes. This prevents paired phones from creating pairing sessions, changing Phone Access settings, listing all devices, or revoking devices.

Credential-bearing URLs, pairing payloads, mobile credentials, and authorization headers must be redacted before logging or diagnostic output.

Every refusal is logged once at warn level, with its code and the redacted URL: `Remote Access request refused <code> <url>` from the request gate (HTTP replies, including `/graphql` upgrades and the peer WebSocket), followed by `origin <value>` for `REMOTE_ACCESS_ORIGIN_REFUSED`; `Remote Access WebSocket rejected <url>: <code>` for a `/ws/*` close. No other header and no credential is logged.

## Server Instance Identity

`GET /rest/remote-access/status` returns the stable node ID (`nodeId`) in addition to Phone Access availability metadata. The identity is persisted under the app data directory and is used by the desktop Phone Access UI to prove that a manually entered phone-facing private-network URL reaches the same node as the desktop management URL before a QR is created.

Display names, hostnames, and user-entered URLs are not node identity. Remote-node QR creation should fail when the management URL and advertised phone-facing URL cannot both return matching `nodeId` values.

## Client-facing URL Resolution

Absolute URLs returned to clients should go through `DefaultClientFacingUrlResolver` when they may be consumed from a phone.

Resolution preference is:

1. active mobile auth context `clientFacingBaseUrl`;
2. explicitly supplied paired-device client base URL;
3. configured external/public base URL;
4. local fallback base URL only for loopback peers or when it is not loopback.

If the request is remote and the only fallback is loopback, the resolver returns a relative REST path instead of leaking an unusable `127.0.0.1` URL.

This is not host-header discovery. The remote client-facing base URL is selected during pairing or by explicit configuration, then reused from the paired device/auth context.

## Static Mobile Web Hosting

The server registers `/mobile` and `/mobile/*` as public static routes. It searches for mobile assets in these locations relative to the server app root:

1. `mobile-web/` in the packaged server bundle;
2. `public/mobile/`;
3. the sibling development output `../autobyteus-web/dist/public`.

The route safely resolves files under the selected root and falls back to `index.html` for mobile SPA deep links such as `/mobile/workspace`.

Server Docker image builds are expected to run the mobile web build and copy `autobyteus-web/dist-mobile/public` into `autobyteus-server-ts/mobile-web` in the runtime image. Fresh public launcher, remote-server, and all-in-one images should therefore serve `/mobile` without manual asset copies.

## Desktop Route Boundary

Remote Access static serving is limited to `/mobile` and `/mobile/*`. Normal desktop web routes such as `/workspace` remain owned by the desktop/web shell and must not render the mobile shell. A stale phone deep link such as `/mobile/workspace` is handled by the mobile SPA as an unsupported desktop-workspace notice, preserving the desktop route behavior for regular browser and Electron users.

## Persistence and Disable Behavior

Remote Access data lives under the app data directory:

- `remote-access/settings.json` stores `phoneAccessEnabled` and update metadata.
- `remote-access/paired-devices.json` stores device id, display name, credential hash, client-facing base URL, created/last-seen/revoked timestamps.
- `remote-access/node-identity.json` stores the stable node ID (`nodeId`) used for same-node advertised URL verification. A node released before autobyteus-290 had it as `server-instance.json` `{serverInstanceId}`; the sealed app-data migration `node-identity-file-name` renames it once. Until that migration has succeeded (capability `node_identity`), `NodeIdentityService.getNodeId()` throws `NodeIdentityNotMigratedError` and creates nothing, and the status route answers HTTP 503 `{code: "NODE_IDENTITY_NOT_MIGRATED", message: "This node's identity is waiting for its data migration."}`.

Disabling Phone Access does not delete paired-device records. Revoking a device marks its `revokedAt` timestamp and retains the record for history and revoked-credential diagnostics. `GET /rest/remote-access/devices` returns active devices only; trusted-network desktop management can read retained revoked rows through `GET /rest/remote-access/devices/revoked`. While disabled, new pairing sessions are rejected and existing mobile credentials fail with `PHONE_ACCESS_DISABLED`.

## Validation Coverage

Validation for this feature should cover:

- mobile static build and backend serving under `/mobile`;
- backend-generated `/mobile?pairing=...` bootstrapping into the phone shell;
- pairing exchange, persisted mobile session reload, and mobile deep links;
- trusted-network REST, GraphQL, and WebSocket reachability without additional credentials;
- refusal of non-allowed Origins on every WebSocket route family and on HTTP, and acceptance of each allowed-origin class;
- mobile `mra_...` authorization for protected REST/GraphQL routes and phone WebSocket routes, and its refusal on the other WebSocket routes;
- rejection of mobile credentials on owner-management routes;
- paired-device revoke and revoke-all invalidation, including active-list vs revoked-history separation;
- Phone Access enabled state and credential usability after backend restart against the same app data;
- seeded agent/team visibility through paired mobile GraphQL/routes;
- Docker image packaging of the `/mobile` web shell for public launcher, remote-server, and all-in-one image paths;
- status `nodeId` use for phone-facing advertised URL verification.

## Phase Two Boundary

Phase One establishes Phone Access pairing over trusted private-network URLs and preserves trusted private-network desktop access to the backend. For WebSockets, Phase Two's route limit is done: a phone credential opens only the phone WebSocket routes (see Route Policy). It does not complete least-privilege mobile backend authorization, mobile token rotation, native secure credential storage, strict owner pairing/admin authorization, or backend hard denial of every high-risk mobile operation. Those items are tracked in `../../../docs/future-tickets/mobile-backend-authorization-hardening.md` from this feature doc.
